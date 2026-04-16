// Fast greedy bond allocator
// Extracted from tests/test_lexicographic.html lines 7294-7866
// Exported as greedyOptimize (source name: optimize)

import {
  filterEligible,
  baseScoreFn,
  parsePfFlags,
  checkDurationConflict,
  resolveCatLimitsMinMax,
  getMatBucket,
} from './solverHelpers.js';

export function greedyOptimize(pool, cfg) {
  const { obj, budget, minGreen, maxBondNom, minBondNom: cfgMinBond, maxIssNominal, minIssNom: cfgMinIss, minLot: cfgMinLot, maxCo, ratingLimits, rankLimits, strukturLimits, kuponLimits, pfMaxDur = "", pfMaxMat = "", lockedBonds = [] } = cfg;
  if (budget <= 0 || maxBondNom <= 0) return [];
  const minBondAmt = parseFloat(cfgMinBond) || 0;
  const minIssAmt = parseFloat(cfgMinIss) || 0;
  const lotSize = parseFloat(cfgMinLot) || 0;
  if (checkDurationConflict(cfg, "Greedy")) return [];
  const pf0 = parsePfFlags(cfg);
  const { hasPfMinK, hasPfMaxK, hasPfMinPx, hasPfMaxPx, hasPfMinDur, hasPfMaxDur: hasPfMaxDurG, hasPfMinMat, hasPfMaxMat: hasPfMaxMatG, hasPfMinY, hasPfMaxY, pfMinKVal, pfMaxKVal, pfMinPxVal, pfMaxPxVal, pfMinDurVal, pfMaxDurVal, pfMinMatVal, pfMaxMatVal, pfMinYVal, pfMaxYVal, hasAny: hasPfConstraints } = pf0;
  const el = filterEligible(pool, cfg);
  const baseScore = baseScoreFn(obj);
  let pf = [], totalAllocated = 0, issTotals = {}, coTotals = {}, rtgTotals = {}, greenTotal = 0, bondTotals = {}, runningKupSum = 0, runningPxSum = 0, runningYieldSum = 0;
  let rankTotals = {}, strukturTotals = {}, kuponTotals = {}, sektorTotals = {}, mbTotals = {};
  const lockedISINs = new Set();
  if (lockedBonds.length > 0) {
    lockedBonds.forEach(lb => {
      const nom = lb.nom || 0;
      if (nom <= 0) return;
      lockedISINs.add(lb.isin);
      const poolBond = pool.find(b => b.isin === lb.isin) || lb;
      pf.push({ ...poolBond, nom, locked: true, inUniverse: pool.some(u => u.isin === lb.isin) });
      totalAllocated += nom;
      issTotals[poolBond.t] = (issTotals[poolBond.t] || 0) + nom;
      coTotals[poolBond.co] = (coTotals[poolBond.co] || 0) + nom;
      bondTotals[poolBond.id] = (bondTotals[poolBond.id] || 0) + nom;
      if (poolBond.lo && ratingLimits) rtgTotals[poolBond.lo] = (rtgTotals[poolBond.lo] || 0) + nom;
      if (poolBond.g === 1) greenTotal += nom;
      const lbRk = poolBond.rank || "SP"; rankTotals[lbRk] = (rankTotals[lbRk] || 0) + nom;
      const lbMt = poolBond.matTyp || "BULLET"; strukturTotals[lbMt] = (strukturTotals[lbMt] || 0) + nom;
      const lbKp = poolBond.kpnTyp || "FIXED"; kuponTotals[lbKp] = (kuponTotals[lbKp] || 0) + nom;
      const lbSk = poolBond.sektor || "OTHER"; sektorTotals[lbSk] = (sektorTotals[lbSk] || 0) + nom;
      const lbMb = getMatBucket(poolBond.mty || 0); mbTotals[lbMb] = (mbTotals[lbMb] || 0) + nom;
      runningKupSum += poolBond.k * nom; runningYieldSum += (poolBond.y || 0) * nom;
      runningPxSum += (poolBond.px || 100) * nom;
    });
  }
  if (totalAllocated > budget) console.warn("[Greedy] Gesperrte Anleihen (" + totalAllocated.toFixed(1) + " Mio.) überschreiten Budget (" + budget + " Mio.). Budget wird auf " + totalAllocated.toFixed(1) + " Mio. erweitert.");
  const effectiveBudget = Math.max(budget, totalAllocated);
  const coLimitUnit = cfg.countryLimitUnit || "pct";
  const coLimit = coLimitUnit === "mio" ? Math.max(0, maxCo) : Math.max(0, effectiveBudget * (Math.max(0, maxCo) / 100));
  const greenTarget = Math.max(0, effectiveBudget * (minGreen / 100));
  const { maxL: rtgMaxL, minL: rtgMinL } = resolveCatLimitsMinMax(ratingLimits, cfg.ratingLimitUnit || "pct", effectiveBudget);
  const { maxL: rkMaxL, minL: rkMinL } = resolveCatLimitsMinMax(rankLimits, cfg.rankLimitUnit || "pct", effectiveBudget);
  const { maxL: stMaxL, minL: stMinL } = resolveCatLimitsMinMax(strukturLimits, cfg.strukturLimitUnit || "pct", effectiveBudget);
  const { maxL: kpMaxL, minL: kpMinL } = resolveCatLimitsMinMax(kuponLimits, cfg.kuponLimitUnit || "pct", effectiveBudget);
  const { maxL: skMaxL, minL: skMinL } = resolveCatLimitsMinMax(cfg.sektorLimits, cfg.sektorLimitUnit || "pct", effectiveBudget);
  const mbMaxL = {}, mbMinL = {}; let matBucketTotals = {};
  const mbLimits = cfg.matBucketLimits || {};
  const mbUnit = cfg.matBucketUnit || "pct";
  const mbDisabledBkts = new Set();
  Object.keys(mbLimits).forEach(bkt => {
    const lim = mbLimits[bkt]; if (!lim) return;
    if (lim.enabled === false) { mbDisabledBkts.add(bkt); mbMaxL[bkt] = 0; return; }
    const mn = lim.min !== "" && lim.min != null ? parseFloat(lim.min) : null;
    const mx = lim.max !== "" && lim.max != null ? parseFloat(lim.max) : null;
    if (mbUnit === "pct") {
      if (mx != null && mx < 100) mbMaxL[bkt] = Math.max(0, effectiveBudget * (mx / 100));
      if (mn != null && mn > 0) mbMinL[bkt] = Math.max(0, effectiveBudget * (mn / 100));
    } else {
      if (mx != null) mbMaxL[bkt] = mx;
      if (mn != null && mn > 0) mbMinL[bkt] = mn;
    }
  });
  const checkPfConstraints = (b, amount) => {
    if (!hasPfConstraints || amount <= 0) return amount;
    const newTotal = totalAllocated + amount;
    if (newTotal <= 0) return amount;
    if (hasPfMaxK && b.k > pfMaxKVal) { const denom = b.k - pfMaxKVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMaxKVal * totalAllocated - runningKupSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); }
    if (hasPfMinK && b.k < pfMinKVal) { const denom = b.k - pfMinKVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMinKVal * totalAllocated - runningKupSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); }
    if (hasPfMaxPx) { const bPx = b.px || 100; if (bPx > pfMaxPxVal) { const denom = bPx - pfMaxPxVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMaxPxVal * totalAllocated - runningPxSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMinPx) { const bPx = b.px || 100; if (bPx < pfMinPxVal) { const denom = bPx - pfMinPxVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMinPxVal * totalAllocated - runningPxSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMaxDurG) { if (b.md > pfMaxDurVal) { const denom = b.md - pfMaxDurVal; if (Math.abs(denom) < 1e-9) return 0; const rSum = pf.reduce((a, x) => a + x.md * x.nom, 0); const maxX = (pfMaxDurVal * totalAllocated - rSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMinDur) { if (b.md < pfMinDurVal) { const denom = b.md - pfMinDurVal; if (Math.abs(denom) < 1e-9) return 0; const rSum = pf.reduce((a, x) => a + x.md * x.nom, 0); const maxX = (pfMinDurVal * totalAllocated - rSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMaxMatG) { if (b.mty > pfMaxMatVal) { const denom = b.mty - pfMaxMatVal; if (Math.abs(denom) < 1e-9) return 0; const rSum = pf.reduce((a, x) => a + x.mty * x.nom, 0); const maxX = (pfMaxMatVal * totalAllocated - rSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMinMat) { if (b.mty < pfMinMatVal) { const denom = b.mty - pfMinMatVal; if (Math.abs(denom) < 1e-9) return 0; const rSum = pf.reduce((a, x) => a + x.mty * x.nom, 0); const maxX = (pfMinMatVal * totalAllocated - rSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); } }
    if (hasPfMaxY && (b.y || 0) > pfMaxYVal) { const denom = (b.y || 0) - pfMaxYVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMaxYVal * totalAllocated - runningYieldSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); }
    if (hasPfMinY && (b.y || 0) < pfMinYVal) { const denom = (b.y || 0) - pfMinYVal; if (Math.abs(denom) < 1e-9) return 0; const maxX = (pfMinYVal * totalAllocated - runningYieldSum) / denom; if (maxX <= 0) return 0; amount = Math.min(amount, maxX); }
    return Math.max(0, amount);
  };
  // ── ISIN-Exception maxNom lookup ──
  const isinMaxNomMap = new Map();
  if (cfg.isinExceptions && cfg.isinExceptions.length) {
    cfg.isinExceptions.filter(x => x.maxNom > 0).forEach(x => isinMaxNomMap.set(x.isin, x.maxNom));
  }
  const addAllocation = (b, amount) => {
    if (amount <= 0) return;
    const existingNom = bondTotals[b.id] || 0;
    const bondMax = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
    const cappedAmount = Math.min(amount, bondMax - existingNom);
    if (cappedAmount <= 0) return;
    const existing = pf.find(x => x.id === b.id);
    if (existing) { existing.nom += cappedAmount; } else { pf.push({ ...b, nom: cappedAmount, locked: false, inUniverse: true }); }
    totalAllocated += cappedAmount; issTotals[b.t] = (issTotals[b.t] || 0) + cappedAmount;
    coTotals[b.co] = (coTotals[b.co] || 0) + cappedAmount; bondTotals[b.id] = (bondTotals[b.id] || 0) + cappedAmount;
    if (b.lo && ratingLimits) rtgTotals[b.lo] = (rtgTotals[b.lo] || 0) + cappedAmount; if (b.g === 1) greenTotal += cappedAmount;
    const aRk = b.rank || "SP"; rankTotals[aRk] = (rankTotals[aRk] || 0) + cappedAmount;
    const aMt = b.matTyp || "BULLET"; strukturTotals[aMt] = (strukturTotals[aMt] || 0) + cappedAmount;
    const aKp = b.kpnTyp || "FIXED"; kuponTotals[aKp] = (kuponTotals[aKp] || 0) + cappedAmount;
    const aSk = b.sektor || "OTHER"; sektorTotals[aSk] = (sektorTotals[aSk] || 0) + cappedAmount;
    const aMb = getMatBucket(b.mty || 0); mbTotals[aMb] = (mbTotals[aMb] || 0) + cappedAmount;
    runningKupSum += b.k * cappedAmount; runningPxSum += (b.px || 100) * cappedAmount; runningYieldSum += (b.y || 0) * cappedAmount;
  };
  const scores = el.map(b => baseScore(b));
  const maxScore = scores.length > 0 ? Math.max(...scores) : 1;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const scoreRange = maxScore - minScore || 1;
  const esgBoostMagnitude = scoreRange * 2;
  const dynamicScore = (b) => { const base = baseScore(b); if (greenTarget > 0 && greenTotal < greenTarget && b.g === 1) return base + esgBoostMagnitude; return base; };
  const sortedEligible = [...el].sort((a, b) => baseScore(b) - baseScore(a));
  const rankTargets = {};
  if (obj === "_maxEsg") {
    // Bei ESG-Maximierung: alle Bonds bekommen maxBondNom, keine Rang-Differenzierung
    sortedEligible.forEach(b => { rankTargets[b.id] = maxBondNom; });
  } else {
    sortedEligible.forEach((b, idx) => {
      const rankNorm = sortedEligible.length > 1 ? 1 - (idx / (sortedEligible.length - 1)) : 1;
      rankTargets[b.id] = minBondAmt + rankNorm * (maxBondNom - minBondAmt);
    });
  }
  const maxIterations = el.length * 2;
  let iterations = 0;
  while (totalAllocated < effectiveBudget - 0.001 && iterations < maxIterations) {
    iterations++;
    const candidates = el.filter(b => {
      if (lockedISINs.has(b.isin)) return false;
      const existingNom = bondTotals[b.id] || 0;
      const bMax = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
      if (existingNom >= bMax) return false; if ((issTotals[b.t] || 0) >= maxIssNominal) return false;
      if ((coTotals[b.co] || 0) >= coLimit) return false; if (b.lo && rtgMaxL[b.lo] != null && (rtgTotals[b.lo] || 0) >= rtgMaxL[b.lo]) return false;
      const cRk = b.rank || "SP"; if (rkMaxL[cRk] != null && (rankTotals[cRk] || 0) >= rkMaxL[cRk]) return false;
      const cMt = b.matTyp || "BULLET"; if (stMaxL[cMt] != null && (strukturTotals[cMt] || 0) >= stMaxL[cMt]) return false;
      const cKp = b.kpnTyp || "FIXED"; if (kpMaxL[cKp] != null && (kuponTotals[cKp] || 0) >= kpMaxL[cKp]) return false;
      const cSk = b.sektor || "OTHER"; if (skMaxL[cSk] != null && (sektorTotals[cSk] || 0) >= skMaxL[cSk]) return false;
      const cMb = getMatBucket(b.mty || 0); if (mbMaxL[cMb] != null && (mbTotals[cMb] || 0) >= mbMaxL[cMb]) return false;
      return true;
    }).map(b => ({ bond: b, score: dynamicScore(b) })).sort((a, b) => b.score - a.score);
    if (candidates.length === 0) break;
    let allocatedThisRound = false;
    for (const { bond: b } of candidates) {
      if (totalAllocated >= effectiveBudget - 0.001) break;
      const existingNom = bondTotals[b.id] || 0;
      let maxAlloc = effectiveBudget - totalAllocated;
      const targetNom = rankTargets[b.id] || maxBondNom;
      maxAlloc = Math.min(maxAlloc, targetNom - existingNom);
      const bMaxA = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
      maxAlloc = Math.min(maxAlloc, bMaxA - existingNom);
      maxAlloc = Math.min(maxAlloc, maxIssNominal - (issTotals[b.t] || 0));
      maxAlloc = Math.min(maxAlloc, coLimit - (coTotals[b.co] || 0));
      if (b.lo && rtgMaxL[b.lo] != null) maxAlloc = Math.min(maxAlloc, rtgMaxL[b.lo] - (rtgTotals[b.lo] || 0));
      const mRk = b.rank || "SP"; if (rkMaxL[mRk] != null) maxAlloc = Math.min(maxAlloc, rkMaxL[mRk] - (rankTotals[mRk] || 0));
      const mMt = b.matTyp || "BULLET"; if (stMaxL[mMt] != null) maxAlloc = Math.min(maxAlloc, stMaxL[mMt] - (strukturTotals[mMt] || 0));
      const mKp = b.kpnTyp || "FIXED"; if (kpMaxL[mKp] != null) maxAlloc = Math.min(maxAlloc, kpMaxL[mKp] - (kuponTotals[mKp] || 0));
      const mSk = b.sektor || "OTHER"; if (skMaxL[mSk] != null) maxAlloc = Math.min(maxAlloc, skMaxL[mSk] - (sektorTotals[mSk] || 0));
      const mMb = getMatBucket(b.mty || 0); if (mbMaxL[mMb] != null) maxAlloc = Math.min(maxAlloc, mbMaxL[mMb] - (mbTotals[mMb] || 0));
      let toAdd = Math.floor(maxAlloc * 10) / 10;
      toAdd = checkPfConstraints(b, toAdd); toAdd = Math.floor(toAdd * 10) / 10;
      if (lotSize > 0) { toAdd = Math.floor(toAdd / lotSize) * lotSize; }
      if (toAdd < minBondAmt && (bondTotals[b.id] || 0) === 0) { continue; }
      if (toAdd > 0) { addAllocation(b, toAdd); allocatedThisRound = true; break; }
    }
    if (!allocatedThisRound) break;
  }

  // --- Phase 2: If main loop stopped (likely due to rankTargets cap), re-run without rankTargets ---
  if (totalAllocated < effectiveBudget - 1) {
    console.log("[Greedy] Phase 2 (ohne Rang-Cap): " + totalAllocated.toFixed(1) + " / " + effectiveBudget.toFixed(1));
    let p2Added = true;
    let p2Iter = 0;
    while (p2Added && totalAllocated < effectiveBudget - 0.5 && p2Iter < el.length * 2) {
      p2Added = false;
      p2Iter++;
      const p2Cands = el.filter(b => {
        if (lockedISINs.has(b.isin)) return false;
        const p2bMax = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
        if ((bondTotals[b.id] || 0) >= p2bMax) return false;
        if ((issTotals[b.t] || 0) >= maxIssNominal) return false;
        if ((coTotals[b.co] || 0) >= coLimit) return false;
        if (b.lo && rtgMaxL[b.lo] != null && (rtgTotals[b.lo] || 0) >= rtgMaxL[b.lo]) return false;
        const cRk = b.rank || "SP"; if (rkMaxL[cRk] != null && (rankTotals[cRk] || 0) >= rkMaxL[cRk]) return false;
        const cMt = b.matTyp || "BULLET"; if (stMaxL[cMt] != null && (strukturTotals[cMt] || 0) >= stMaxL[cMt]) return false;
        const cKp = b.kpnTyp || "FIXED"; if (kpMaxL[cKp] != null && (kuponTotals[cKp] || 0) >= kpMaxL[cKp]) return false;
        const cSk = b.sektor || "OTHER"; if (skMaxL[cSk] != null && (sektorTotals[cSk] || 0) >= skMaxL[cSk]) return false;
        const cMb2 = getMatBucket(b.mty || 0); if (mbMaxL[cMb2] != null && (mbTotals[cMb2] || 0) >= mbMaxL[cMb2]) return false;
        return true;
      }).sort((a, b) => baseScore(b) - baseScore(a));
      if (p2Cands.length === 0) break;
      for (const b of p2Cands) {
        if (totalAllocated >= effectiveBudget - 0.5) break;
        const p2bMaxA = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
        let maxAlloc = Math.min(
          effectiveBudget - totalAllocated,
          p2bMaxA - (bondTotals[b.id] || 0),
          maxIssNominal - (issTotals[b.t] || 0),
          coLimit - (coTotals[b.co] || 0)
        );
        if (b.lo && rtgMaxL[b.lo] != null) maxAlloc = Math.min(maxAlloc, rtgMaxL[b.lo] - (rtgTotals[b.lo] || 0));
        const mRk = b.rank || "SP"; if (rkMaxL[mRk] != null) maxAlloc = Math.min(maxAlloc, rkMaxL[mRk] - (rankTotals[mRk] || 0));
        const mMt = b.matTyp || "BULLET"; if (stMaxL[mMt] != null) maxAlloc = Math.min(maxAlloc, stMaxL[mMt] - (strukturTotals[mMt] || 0));
        const mKp = b.kpnTyp || "FIXED"; if (kpMaxL[mKp] != null) maxAlloc = Math.min(maxAlloc, kpMaxL[mKp] - (kuponTotals[mKp] || 0));
        const mSk = b.sektor || "OTHER"; if (skMaxL[mSk] != null) maxAlloc = Math.min(maxAlloc, skMaxL[mSk] - (sektorTotals[mSk] || 0));
        const mMb2 = getMatBucket(b.mty || 0); if (mbMaxL[mMb2] != null) maxAlloc = Math.min(maxAlloc, mbMaxL[mMb2] - (mbTotals[mMb2] || 0));
        let toAdd = Math.floor(maxAlloc * 10) / 10;
        toAdd = checkPfConstraints(b, toAdd); toAdd = Math.floor(toAdd * 10) / 10;
        if (lotSize > 0) toAdd = Math.floor(toAdd / lotSize) * lotSize;
        if (toAdd < minBondAmt && (bondTotals[b.id] || 0) === 0) continue;
        if (toAdd > 0) { addAllocation(b, toAdd); p2Added = true; break; }
      }
    }
    console.log("[Greedy] Phase 2 abgeschlossen: " + totalAllocated.toFixed(1) + " / " + effectiveBudget.toFixed(1) + " (" + p2Iter + " Iter.)");
  }

  // --- Budget-Fill Phase ---
  if (totalAllocated < effectiveBudget - 1) {
    console.log("[Greedy] Budget-Fill Phase: " + totalAllocated.toFixed(1) + " / " + effectiveBudget.toFixed(1));
    const maxFillIter = el.length * 3;
    let fillIter = 0;
    let fillAdded = true;
    while (fillAdded && totalAllocated < effectiveBudget - 0.5 && fillIter < maxFillIter) {
      fillAdded = false;
      fillIter++;
      const gap = effectiveBudget - totalAllocated;
      if (gap < minBondAmt * 0.5) break;

      const fillCands = el.filter(b => {
        if (lockedISINs.has(b.isin)) return false;
        const fbMax = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
        if ((bondTotals[b.id] || 0) >= fbMax) return false;
        if ((issTotals[b.t] || 0) >= maxIssNominal) return false;
        if ((coTotals[b.co] || 0) >= coLimit) return false;
        if (b.lo && rtgMaxL[b.lo] != null && (rtgTotals[b.lo] || 0) >= rtgMaxL[b.lo]) return false;
        const bRk = b.rank || "SP"; if (rkMaxL[bRk] != null && (rankTotals[bRk] || 0) >= rkMaxL[bRk]) return false;
        const bMt = b.matTyp || "BULLET"; if (stMaxL[bMt] != null && (strukturTotals[bMt] || 0) >= stMaxL[bMt]) return false;
        const bKp = b.kpnTyp || "FIXED"; if (kpMaxL[bKp] != null && (kuponTotals[bKp] || 0) >= kpMaxL[bKp]) return false;
        const bSk = b.sektor || "OTHER"; if (skMaxL[bSk] != null && (sektorTotals[bSk] || 0) >= skMaxL[bSk]) return false;
        return true;
      }).sort((a, b) => baseScore(b) - baseScore(a));

      for (const b of fillCands) {
        const fbMaxA = isinMaxNomMap.has(b.isin) ? Math.min(maxBondNom, isinMaxNomMap.get(b.isin)) : maxBondNom;
        let maxAlloc = Math.min(
          gap,
          fbMaxA - (bondTotals[b.id] || 0),
          maxIssNominal - (issTotals[b.t] || 0),
          coLimit - (coTotals[b.co] || 0)
        );
        if (b.lo && rtgMaxL[b.lo] != null) maxAlloc = Math.min(maxAlloc, rtgMaxL[b.lo] - (rtgTotals[b.lo] || 0));
        const bRk = b.rank || "SP"; if (rkMaxL[bRk] != null) maxAlloc = Math.min(maxAlloc, rkMaxL[bRk] - (rankTotals[bRk] || 0));
        const bMt = b.matTyp || "BULLET"; if (stMaxL[bMt] != null) maxAlloc = Math.min(maxAlloc, stMaxL[bMt] - (strukturTotals[bMt] || 0));
        const bKp = b.kpnTyp || "FIXED"; if (kpMaxL[bKp] != null) maxAlloc = Math.min(maxAlloc, kpMaxL[bKp] - (kuponTotals[bKp] || 0));
        const bSk = b.sektor || "OTHER"; if (skMaxL[bSk] != null) maxAlloc = Math.min(maxAlloc, skMaxL[bSk] - (sektorTotals[bSk] || 0));
        let toAdd = Math.floor(maxAlloc * 10) / 10;
        toAdd = checkPfConstraints(b, toAdd); toAdd = Math.floor(toAdd * 10) / 10;
        if (lotSize > 0) toAdd = Math.floor(toAdd / lotSize) * lotSize;
        if (toAdd < minBondAmt && (bondTotals[b.id] || 0) === 0) continue;
        if (toAdd > 0) { addAllocation(b, toAdd); fillAdded = true; break; }
      }
    }
    console.log("[Greedy] Budget-Fill abgeschlossen: " + totalAllocated.toFixed(1) + " / " + effectiveBudget.toFixed(1) + " (+" + fillIter + " Iterationen)");
  }

  // --- ESG enforcement: swap non-ESG bonds for ESG bonds if greenTarget not met ---
  if (greenTarget > 0 && greenTotal < greenTarget - 0.01) {
    console.log("[Greedy] ESG-Enforcement: greenTotal=" + greenTotal.toFixed(1) + " < greenTarget=" + greenTarget.toFixed(1) + ". Swapping non-ESG → ESG...");
    const esgPool = el.filter(b => b.g === 1 && !lockedISINs.has(b.isin) && !pf.some(p => p.isin === b.isin))
      .sort((a, b) => baseScore(b) - baseScore(a));
    const nonEsgPf = pf.filter(b => b.g !== 1 && !b.locked).sort((a, b) => baseScore(a) - baseScore(b)); // worst non-ESG first
    for (const esgBond of esgPool) {
      if (greenTotal >= greenTarget - 0.01) break;
      for (let ni = 0; ni < nonEsgPf.length; ni++) {
        if (greenTotal >= greenTarget - 0.01) break;
        const victim = nonEsgPf[ni];
        if (victim.nom <= 0) continue;
        if ((coTotals[esgBond.co] || 0) + victim.nom > coLimit + 0.01) continue;
        if ((issTotals[esgBond.t] || 0) + victim.nom > maxIssNominal + 0.01) continue;
        const esgRk = esgBond.rank || "SP"; if (rkMaxL[esgRk] != null && (rankTotals[esgRk] || 0) - (victim.rank === esgRk ? victim.nom : 0) + victim.nom > rkMaxL[esgRk] + 0.01) continue;
        const esgMt = esgBond.matTyp || "BULLET"; if (stMaxL[esgMt] != null && (strukturTotals[esgMt] || 0) - (victim.matTyp === esgMt ? victim.nom : 0) + victim.nom > stMaxL[esgMt] + 0.01) continue;
        const esgKp = esgBond.kpnTyp || "FIXED"; if (kpMaxL[esgKp] != null && (kuponTotals[esgKp] || 0) - (victim.kpnTyp === esgKp ? victim.nom : 0) + victim.nom > kpMaxL[esgKp] + 0.01) continue;
        if (esgBond.lo && rtgMaxL[esgBond.lo] != null && (rtgTotals[esgBond.lo] || 0) - (victim.lo === esgBond.lo ? victim.nom : 0) + victim.nom > rtgMaxL[esgBond.lo] + 0.01) continue;
        const esgSk = esgBond.sektor || "OTHER"; const vicSk = victim.sektor || "OTHER"; if (skMaxL[esgSk] != null && (sektorTotals[esgSk] || 0) - (vicSk === esgSk ? victim.nom : 0) + victim.nom > skMaxL[esgSk] + 0.01) continue;
        const swapNom = Math.min(victim.nom, maxBondNom);
        const pfIdx = pf.findIndex(p => p.id === victim.id);
        if (pfIdx < 0) continue;
        coTotals[victim.co] = (coTotals[victim.co] || 0) - swapNom;
        issTotals[victim.t] = (issTotals[victim.t] || 0) - swapNom;
        if (victim.lo) rtgTotals[victim.lo] = (rtgTotals[victim.lo] || 0) - swapNom;
        const vRk = victim.rank || "SP"; rankTotals[vRk] = (rankTotals[vRk] || 0) - swapNom;
        const vMt = victim.matTyp || "BULLET"; strukturTotals[vMt] = (strukturTotals[vMt] || 0) - swapNom;
        const vKp = victim.kpnTyp || "FIXED"; kuponTotals[vKp] = (kuponTotals[vKp] || 0) - swapNom;
        const vSk = victim.sektor || "OTHER"; sektorTotals[vSk] = (sektorTotals[vSk] || 0) - swapNom;
        runningKupSum -= victim.k * swapNom; runningPxSum -= (victim.px || 100) * swapNom;
        victim.nom -= swapNom;
        if (victim.nom <= 0) { pf.splice(pfIdx, 1); nonEsgPf[ni] = { ...victim, nom: 0 }; }
        pf.push({ ...esgBond, nom: swapNom, locked: false, inUniverse: true });
        coTotals[esgBond.co] = (coTotals[esgBond.co] || 0) + swapNom;
        issTotals[esgBond.t] = (issTotals[esgBond.t] || 0) + swapNom;
        if (esgBond.lo) rtgTotals[esgBond.lo] = (rtgTotals[esgBond.lo] || 0) + swapNom;
        const eRk = esgBond.rank || "SP"; rankTotals[eRk] = (rankTotals[eRk] || 0) + swapNom;
        const eMt = esgBond.matTyp || "BULLET"; strukturTotals[eMt] = (strukturTotals[eMt] || 0) + swapNom;
        const eKp = esgBond.kpnTyp || "FIXED"; kuponTotals[eKp] = (kuponTotals[eKp] || 0) + swapNom;
        const eSk = esgBond.sektor || "OTHER"; sektorTotals[eSk] = (sektorTotals[eSk] || 0) + swapNom;
        runningKupSum += esgBond.k * swapNom; runningPxSum += (esgBond.px || 100) * swapNom;
        greenTotal += swapNom;
        bondTotals[esgBond.id] = (bondTotals[esgBond.id] || 0) + swapNom;
        break;
      }
    }
    if (greenTotal < greenTarget - 0.01) console.warn("[Greedy] ESG-Minimum nicht erreichbar: " + greenTotal.toFixed(1) + " / " + greenTarget.toFixed(1));
    else console.log("[Greedy] ESG-Enforcement erfolgreich: " + greenTotal.toFixed(1) + " / " + greenTarget.toFixed(1));
  }
  // Warn if any category minimum is violated
  [["Rank", rankTotals, rkMinL], ["Struktur", strukturTotals, stMinL], ["Kupon", kuponTotals, kpMinL], ["Sektor", sektorTotals, skMinL], ["Rating", rtgTotals, rtgMinL]].forEach(([label, tots, mins]) => {
    Object.keys(mins).forEach(cat => { if ((tots[cat] || 0) < mins[cat] - 0.01) console.warn("[Greedy] " + label + "-Minimum für '" + cat + "' nicht erreicht: " + (tots[cat] || 0).toFixed(2) + " < " + mins[cat].toFixed(2)); });
  });
  if (totalAllocated < effectiveBudget - 0.5 && pf.filter(b => !b.locked).length > 0) {
    const unlocked = pf.filter(b => !b.locked);
    const lockedNomTotal = pf.filter(b => b.locked).reduce((a, b2) => a + b2.nom, 0);
    const targetUnlocked = effectiveBudget - lockedNomTotal;
    const unlockedScored = unlocked.map(b => ({ bond: b, score: baseScore(b) })).sort((a, b) => b.score - a.score);
    const rescaleCaps = {};
    const nu = unlockedScored.length;
    unlockedScored.forEach(({ bond }, idx) => {
      const rankNorm = nu > 1 ? 1 - (idx / (nu - 1)) : 1;
      rescaleCaps[bond.id] = minBondAmt + rankNorm * (maxBondNom - minBondAmt);
    });
    let remaining = targetUnlocked;
    let activeIds = unlocked.map(b => b.id);
    const finalNom = {};
    unlocked.forEach(b => { finalNom[b.id] = b.nom; });
    const cappedIds = new Set();
    const removedIds = new Set();
    for (let iter = 0; iter < 20; iter++) {
      const activeNom = activeIds.reduce((a, id) => a + finalNom[id], 0);
      if (activeNom <= 0 || Math.abs(remaining - activeNom) < 0.01) break;
      const scaleFactor = remaining / activeNom;
      let newCapped = false;
      for (const id of activeIds) {
        if (cappedIds.has(id)) continue;
        const cap = rescaleCaps[id];
        const scaled = finalNom[id] * scaleFactor;
        if (scaled >= cap) { finalNom[id] = cap; cappedIds.add(id); newCapped = true; }
        else { finalNom[id] = scaled; }
      }
      if (!newCapped) break;
      const cappedTotal = [...cappedIds].reduce((a, id) => a + finalNom[id], 0);
      remaining = targetUnlocked - cappedTotal;
      activeIds = activeIds.filter(id => !cappedIds.has(id));
      if (activeIds.length === 0) break;
    }
    if (minBondAmt > 0) {
      for (let floorPass = 0; floorPass < 10; floorPass++) {
        let anyRemoved = false;
        Object.keys(finalNom).forEach(id => {
          if (!removedIds.has(id) && finalNom[id] > 0 && finalNom[id] < minBondAmt) {
            removedIds.add(id); finalNom[id] = 0; anyRemoved = true;
          }
        });
        if (!anyRemoved) break;
        const liveIds = Object.keys(finalNom).filter(id => !removedIds.has(id) && finalNom[id] > 0);
        if (liveIds.length === 0) break;
        const liveCapped = new Set();
        for (let iter = 0; iter < 20; iter++) {
          const freeIds = liveIds.filter(id => !liveCapped.has(id));
          if (freeIds.length === 0) break;
          const lockedNom = [...liveCapped].reduce((a, id) => a + finalNom[id], 0);
          const freeNom = freeIds.reduce((a, id) => a + finalNom[id], 0);
          const target = targetUnlocked - lockedNom;
          if (freeNom <= 0 || Math.abs(target - freeNom) < 0.01) break;
          const sf = target / freeNom;
          let newCap = false;
          for (const id of freeIds) {
            const scaled = finalNom[id] * sf;
            if (scaled >= rescaleCaps[id]) { finalNom[id] = rescaleCaps[id]; liveCapped.add(id); newCap = true; }
            else { finalNom[id] = scaled; }
          }
          if (!newCap) break;
        }
      }
    }
    if (lotSize > 0) {
      for (const id of Object.keys(finalNom)) { finalNom[id] = Math.floor(finalNom[id] / lotSize) * lotSize; }
    }
    const newIssTotals = {}, newCoTotals = {}, newRtgTotals = {};
    let newRankTotals = {}, newStrukturTotals = {}, newKuponTotals = {};
    pf.filter(b => b.locked).forEach(b => {
      newIssTotals[b.t] = (newIssTotals[b.t] || 0) + b.nom;
      newCoTotals[b.co] = (newCoTotals[b.co] || 0) + b.nom;
      if (b.lo && ratingLimits) newRtgTotals[b.lo] = (newRtgTotals[b.lo] || 0) + b.nom;
      const nRk = b.rank || "SP"; newRankTotals[nRk] = (newRankTotals[nRk] || 0) + b.nom;
      const nMt = b.matTyp || "BULLET"; newStrukturTotals[nMt] = (newStrukturTotals[nMt] || 0) + b.nom;
      const nKp = b.kpnTyp || "FIXED"; newKuponTotals[nKp] = (newKuponTotals[nKp] || 0) + b.nom;
    });
    unlockedScored.forEach(({ bond }) => {
      let nom = finalNom[bond.id] || 0;
      nom = Math.min(nom, maxIssNominal - (newIssTotals[bond.t] || 0));
      nom = Math.min(nom, coLimit - (newCoTotals[bond.co] || 0));
      if (bond.lo && rtgMaxL[bond.lo] != null) nom = Math.min(nom, rtgMaxL[bond.lo] - (newRtgTotals[bond.lo] || 0));
      const rRk = bond.rank || "SP"; if (rkMaxL[rRk] != null) nom = Math.min(nom, rkMaxL[rRk] - (newRankTotals[rRk] || 0));
      const rMt = bond.matTyp || "BULLET"; if (stMaxL[rMt] != null) nom = Math.min(nom, stMaxL[rMt] - (newStrukturTotals[rMt] || 0));
      const rKp = bond.kpnTyp || "FIXED"; if (kpMaxL[rKp] != null) nom = Math.min(nom, kpMaxL[rKp] - (newKuponTotals[rKp] || 0));
      nom = Math.max(0, nom);
      nom = checkPfConstraints(bond, nom);
      if (lotSize > 0) nom = Math.floor(nom / lotSize) * lotSize;
      finalNom[bond.id] = nom;
      newIssTotals[bond.t] = (newIssTotals[bond.t] || 0) + nom;
      newCoTotals[bond.co] = (newCoTotals[bond.co] || 0) + nom;
      if (bond.lo && ratingLimits) newRtgTotals[bond.lo] = (newRtgTotals[bond.lo] || 0) + nom;
      newRankTotals[rRk] = (newRankTotals[rRk] || 0) + nom;
      newStrukturTotals[rMt] = (newStrukturTotals[rMt] || 0) + nom;
      newKuponTotals[rKp] = (newKuponTotals[rKp] || 0) + nom;
    });
    if (minBondAmt > 0) {
      var underMin = unlockedScored.filter(function(item) { var n = finalNom[item.bond.id] || 0; return n > 0 && n < minBondAmt; });
      for (let floorIter = 0; floorIter < 10; floorIter++) {
        let freed = 0, removedCount = 0;
        var floorIssTotals = {}, floorCoTotals = {};
        pf.filter(function(b) { return b.locked; }).forEach(function(b) {
          floorIssTotals[b.t] = (floorIssTotals[b.t] || 0) + b.nom;
          floorCoTotals[b.co] = (floorCoTotals[b.co] || 0) + b.nom;
        });
        unlockedScored.forEach(function(item) {
          var n = finalNom[item.bond.id] || 0;
          if (n > 0) { floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) + n; floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) + n; }
        });
        unlockedScored.forEach(function(item) {
          var nom = finalNom[item.bond.id] || 0;
          if (nom > 0 && nom < minBondAmt) {
            freed += nom; finalNom[item.bond.id] = 0;
            floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) - nom;
            floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) - nom;
            removedCount++;
          }
        });
        if (removedCount === 0 || freed < 0.01) break;
        var survivors = unlockedScored.filter(function(item) { return (finalNom[item.bond.id] || 0) >= minBondAmt; });
        if (survivors.length === 0) break;
        var totalHeadroom = 0;
        survivors.forEach(function(item) {
          var nom = finalNom[item.bond.id] || 0;
          var hardCap = maxBondNom;
          var issRoom = maxIssNominal - (floorIssTotals[item.bond.t] || 0);
          var coRoom = coLimit - (floorCoTotals[item.bond.co] || 0);
          var room = Math.max(0, Math.min(hardCap - nom, issRoom, coRoom));
          item._headroom = room; totalHeadroom += room;
        });
        if (totalHeadroom <= 0) break;
        var toDistribute = Math.min(freed, totalHeadroom);
        survivors.forEach(function(item) {
          if (item._headroom <= 0) return;
          var share = item._headroom / totalHeadroom * toDistribute;
          var added = Math.min(share, item._headroom);
          finalNom[item.bond.id] = (finalNom[item.bond.id] || 0) + added;
          floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) + added;
          floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) + added;
        });
      }
    }
    unlocked.forEach(b => { b.nom = Math.round((finalNom[b.id] || 0) * 10) / 10; });
    totalAllocated = pf.reduce((a, b2) => a + b2.nom, 0);
    Object.keys(issTotals).forEach(k => { issTotals[k] = 0; });
    Object.keys(coTotals).forEach(k => { coTotals[k] = 0; });
    Object.keys(bondTotals).forEach(k => { bondTotals[k] = 0; });
    Object.keys(rtgTotals).forEach(k => { rtgTotals[k] = 0; }); greenTotal = 0;
    rankTotals = {}; strukturTotals = {}; kuponTotals = {}; sektorTotals = {};
    runningKupSum = 0; runningPxSum = 0;
    pf.forEach(b => {
      issTotals[b.t] = (issTotals[b.t] || 0) + b.nom;
      coTotals[b.co] = (coTotals[b.co] || 0) + b.nom;
      bondTotals[b.id] = (bondTotals[b.id] || 0) + b.nom;
      if (b.lo && ratingLimits) rtgTotals[b.lo] = (rtgTotals[b.lo] || 0) + b.nom;
      if (b.g === 1) greenTotal += b.nom;
      const tRk = b.rank || "SP"; rankTotals[tRk] = (rankTotals[tRk] || 0) + b.nom;
      const tMt = b.matTyp || "BULLET"; strukturTotals[tMt] = (strukturTotals[tMt] || 0) + b.nom;
      const tKp = b.kpnTyp || "FIXED"; kuponTotals[tKp] = (kuponTotals[tKp] || 0) + b.nom;
      const tSk = b.sektor || "OTHER"; sektorTotals[tSk] = (sektorTotals[tSk] || 0) + b.nom;
      runningKupSum += b.k * b.nom;
      runningPxSum += (b.px || 100) * b.nom;
    });
    if (totalAllocated < effectiveBudget - 0.5) {
      const topBond = unlockedScored.find(({ bond }) => bond.nom < rescaleCaps[bond.id]);
      if (topBond) {
        let gap = effectiveBudget - totalAllocated;
        gap = Math.min(gap, rescaleCaps[topBond.bond.id] - topBond.bond.nom);
        gap = Math.min(gap, maxIssNominal - (issTotals[topBond.bond.t] || 0));
        gap = Math.min(gap, coLimit - (coTotals[topBond.bond.co] || 0));
        gap = checkPfConstraints(topBond.bond, gap);
        if (lotSize > 0) gap = Math.floor(gap / lotSize) * lotSize;
        gap = Math.floor(gap * 10) / 10;
        if (gap > 0) addAllocation(topBond.bond, gap);
      }
    }
  }

  // === FINAL floor enforcement ===
  if (minBondAmt > 0) {
    for (let ffi = 0; ffi < 10; ffi++) {
      const underBonds = pf.filter(b => !b.locked && b.nom > 0 && b.nom < minBondAmt);
      if (underBonds.length === 0) break;
      let freed = 0;
      underBonds.forEach(b => { freed += b.nom; b.nom = 0; });
      const fIssTot = {}, fCoTot = {};
      pf.forEach(b => { if (b.nom > 0) { fIssTot[b.t] = (fIssTot[b.t] || 0) + b.nom; fCoTot[b.co] = (fCoTot[b.co] || 0) + b.nom; } });
      const surv = pf.filter(b => !b.locked && b.nom >= minBondAmt);
      if (surv.length === 0) break;
      const survTotalNom = surv.reduce((a, b) => a + b.nom, 0);
      if (survTotalNom <= 0) break;
      let distributed = 0;
      surv.forEach(b => {
        const issR = maxIssNominal - (fIssTot[b.t] || 0);
        const coR = maxCo > 0 ? Math.max(0, coLimit - (fCoTot[b.co] || 0)) : Infinity;
        const headroom = Math.max(0, Math.min(maxBondNom - b.nom, issR, coR));
        const proportionalShare = (b.nom / survTotalNom) * freed;
        const add = Math.min(proportionalShare, headroom);
        if (add > 0) {
          b.nom = Math.round((b.nom + add) * 10) / 10;
          fIssTot[b.t] = (fIssTot[b.t] || 0) + add;
          fCoTot[b.co] = (fCoTot[b.co] || 0) + add;
          distributed += add;
        }
      });
    }
  }

  if (minIssAmt > 0) { pf = pf.filter(b => b.locked || (issTotals[b.t] || 0) >= minIssAmt); }
  return pf.map(b => ({ ...b, nom: Math.round(b.nom * 10) / 10 })).filter(b => b.nom > 0);
}
