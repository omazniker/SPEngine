// LP solver via javascript-lp-solver (deprecated but still used as fallback)
// Extracted from tests/test_lexicographic.html lines 7867-8526

import { getSolver } from './highs.js';
import {
  filterEligible,
  baseScoreFn,
  computeRankCaps,
  parsePfFlags,
  checkDurationConflict,
  prepLockedBonds,
  validateLockedVsLimits,
  computeBudgetFloor,
  resolveCatLimit,
  resolveCatLimitsMinMax,
  getMatBucket,
  catEnabled,
  catMinMax,
  COEFF_NOISE,
  EPSILON,
} from './solverHelpers.js';

export async function optimizeLP(pool, cfg) {
  console.log("[DEPRECATED] optimizeLP called — consider using optimizeMIP_v2()");
  const solver = await getSolver();
  const { obj, budget, minGreen, maxBondNom, minBondNom: cfgMinBondLP, maxIssNominal, minIssNom: cfgMinIssLP, minLot: cfgMinLot, maxCo, ratingLimits, rankLimits, strukturLimits, kuponLimits, sektorLimits, pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinY, pfMaxY, pfMinDur = "", pfMaxDur = "", pfMinMat = "", pfMaxMat = "", lockedBonds = [] } = cfg;
  if (budget <= 0 || maxBondNom <= 0) return [];
  const minBondAmtLP = parseFloat(cfgMinBondLP) || 0;
  const minIssAmtLP = parseFloat(cfgMinIssLP) || 0;
  const lotSize = parseFloat(cfgMinLot) || 0;
  if (checkDurationConflict(cfg, "LP")) return [];
  const el = filterEligible(pool, cfg);
  if (el.length === 0 && lockedBonds.length === 0) return [];
  const lockedMap = prepLockedBonds(el, pool, lockedBonds, cfg);
  const baseScore = baseScoreFn(obj);
  const { caps: rankCapsMap } = obj === "_maxEsg"
    ? { caps: new Map(el.map(b => [b.id, maxBondNom])) }
    : computeRankCaps(el, baseScore, minBondAmtLP, maxBondNom);
  const rankCaps = {}; el.forEach(b => { rankCaps[b.id] = rankCapsMap.get(b.id) || maxBondNom; });
  if (cfg.isinExceptions && cfg.isinExceptions.length) {
    const exMap = new Map(cfg.isinExceptions.filter(x => x.maxNom > 0).map(x => [x.isin, x.maxNom]));
    el.forEach(b => { const cap = exMap.get(b.isin); if (cap != null) { rankCaps[b.id] = Math.min(rankCaps[b.id], cap); rankCapsMap.set(b.id, Math.min(rankCapsMap.get(b.id) || maxBondNom, cap)); } });
  }

  const effectiveBudget = budget;
  const coLimitUnitLP = cfg.countryLimitUnit || "pct";
  const coLimit = coLimitUnitLP === "mio" ? Math.max(0, maxCo) : Math.max(0, effectiveBudget * (Math.max(0, maxCo) / 100));
  if (!validateLockedVsLimits(el, lockedMap, effectiveBudget, maxIssNominal, coLimit, "LP", cfg)) return [];
  const { floor: budgetFloor } = computeBudgetFloor(el, lockedMap, rankCapsMap, effectiveBudget, maxIssNominal, coLimit, maxBondNom, "LP", cfg);

  const constraints = {};
  const variables = {};
  const issuers = [...new Set(el.map(b => b.t))];
  const countries = [...new Set(el.map(b => b.co))];
  constraints["budget"] = { min: Math.max(0, budgetFloor), max: effectiveBudget };
  issuers.forEach(t => { constraints[`iss_${t}`] = { max: maxIssNominal }; });
  countries.forEach(co => { constraints[`co_${co}`] = { max: coLimit }; });

  const addLPCatConstraints = (limits, unit, prefix) => {
    const san2 = s => s.replace(/\+/g, 'p').replace(/-/g, 'm').replace(/[^a-zA-Z0-9]/g, '');
    Object.entries(limits || {}).forEach(([cat]) => {
      if (!catEnabled(limits, cat)) return;
      const { min, max } = catMinMax(limits, cat);
      const cName = `${prefix}_${san2(cat)}`;
      const maxV = resolveCatLimit(max, unit, effectiveBudget);
      const minV = resolveCatLimit(min, unit, effectiveBudget);
      if (unit === "pct") {
        if (maxV != null && max < 100) constraints[cName] = { ...(constraints[cName]||{}), max: maxV };
        if (minV != null && min > 0) constraints[cName] = { ...(constraints[cName]||{}), min: minV };
      } else {
        if (maxV != null) constraints[cName] = { ...(constraints[cName]||{}), max: maxV };
        if (minV != null && minV > 0) constraints[cName] = { ...(constraints[cName]||{}), min: minV };
      }
    });
  };
  addLPCatConstraints(ratingLimits, cfg.ratingLimitUnit || "pct", "rtg");
  addLPCatConstraints(rankLimits, cfg.rankLimitUnit || "pct", "rk");
  addLPCatConstraints(strukturLimits, cfg.strukturLimitUnit || "pct", "st");
  addLPCatConstraints(kuponLimits, cfg.kuponLimitUnit || "pct", "kp");
  addLPCatConstraints(sektorLimits, cfg.sektorLimitUnit || "pct", "sk");

  let lpGreenSoft = false;
  if (minGreen > 0) {
    const greenTarget = Math.max(0, effectiveBudget * (minGreen / 100));
    if (el.filter(b => b.g === 1).length > 0) {
      constraints["green"] = { min: greenTarget };
    } else {
      console.warn("[LP] Keine Green Bonds im Pool — ESG-Constraint wird als Soft-Constraint behandelt");
      lpGreenSoft = true;
    }
  }

  const san = s => s.replace(/\+/g, 'p').replace(/-/g, 'm').replace(/[^a-zA-Z0-9]/g, '');
  const mbLimitsLP = cfg.matBucketLimits || {};
  const mbUnitLP = cfg.matBucketUnit || "pct";
  Object.keys(mbLimitsLP).forEach(bkt => {
    const lim = mbLimitsLP[bkt]; if (!lim) return;
    const cName = `mb_${san(bkt)}`;
    if (lim.enabled === false) { constraints[cName] = { max: 0 }; el.forEach((b, i) => { if (getMatBucket(b.mty || 0) === bkt) { const vn = `z${i}`; constraints[cName][vn] = (constraints[cName][vn] || 0) + 1; } }); return; }
    const mn = lim.min !== "" && lim.min != null ? parseFloat(lim.min) : null;
    const mx = lim.max !== "" && lim.max != null ? parseFloat(lim.max) : null;
    if (mbUnitLP === "pct") {
      if (mx != null && mx < 100) constraints[cName] = { ...(constraints[cName]||{}), max: effectiveBudget * (mx / 100) };
      if (mn != null && mn > 0) constraints[cName] = { ...(constraints[cName]||{}), min: effectiveBudget * (mn / 100) };
    } else {
      if (mx != null) constraints[cName] = { ...(constraints[cName]||{}), max: mx };
      if (mn != null && mn > 0) constraints[cName] = { ...(constraints[cName]||{}), min: mn };
    }
  });

  const { hasPfMinK, hasPfMaxK, hasPfMinPx, hasPfMaxPx, hasPfMinDur, hasPfMaxDur, hasPfMinMat, hasPfMaxMat, hasPfMinY, hasPfMaxY } = parsePfFlags(cfg);

  if (hasPfMinK) constraints["pfMinK"] = { min: -EPSILON };
  if (hasPfMaxK) constraints["pfMaxK"] = { max: EPSILON };
  if (hasPfMinPx) constraints["pfMinPx"] = { min: -EPSILON };
  if (hasPfMaxPx) constraints["pfMaxPx"] = { max: EPSILON };
  if (hasPfMinDur) constraints["pfMinDur"] = { min: -EPSILON };
  if (hasPfMaxDur) constraints["pfMaxDur"] = { max: EPSILON };
  if (hasPfMinMat) constraints["pfMinMat"] = { min: -EPSILON };
  if (hasPfMaxMat) constraints["pfMaxMat"] = { max: EPSILON };
  if (hasPfMinY) constraints["pfMinY"] = { min: -EPSILON };
  if (hasPfMaxY) constraints["pfMaxY"] = { max: EPSILON };

  el.forEach((b, i) => {
    const isLocked = lockedMap.has(b.isin);
    const v = { score: baseScore(b), budget: 1, [`iss_${b.t}`]: 1, [`co_${b.co}`]: 1 };
    if (b.lo && ratingLimits && catEnabled(ratingLimits, b.lo)) { const rtgMM = catMinMax(ratingLimits, b.lo); if ((rtgMM.max != null && rtgMM.max < 100) || (rtgMM.min != null && rtgMM.min > 0)) v[`rtg_${b.lo}`] = 1; }
    if (b.g === 1) v["green"] = 1;
    const bRkLP = b.rank || "SP"; if (rankLimits && catEnabled(rankLimits, bRkLP)) { const rkMM = catMinMax(rankLimits, bRkLP); if ((rkMM.max != null && rkMM.max < 100) || (rkMM.min != null && rkMM.min > 0)) v[`rk_${bRkLP}`] = 1; }
    const bMtLP = b.matTyp || "BULLET"; if (strukturLimits && catEnabled(strukturLimits, bMtLP)) { const stMM = catMinMax(strukturLimits, bMtLP); if ((stMM.max != null && stMM.max < 100) || (stMM.min != null && stMM.min > 0)) v[`st_${san(bMtLP)}`] = 1; }
    const bKpLP = b.kpnTyp || "FIXED"; if (kuponLimits && catEnabled(kuponLimits, bKpLP)) { const kpMM = catMinMax(kuponLimits, bKpLP); if ((kpMM.max != null && kpMM.max < 100) || (kpMM.min != null && kpMM.min > 0)) v[`kp_${san(bKpLP)}`] = 1; }
    const bSkLP = b.sektor || "OTHER"; if (sektorLimits && catEnabled(sektorLimits, bSkLP)) { const skMM = catMinMax(sektorLimits, bSkLP); if ((skMM.max != null && skMM.max < 100) || (skMM.min != null && skMM.min > 0)) v[`sk_${san(bSkLP)}`] = 1; }
    const bMbLP = getMatBucket(b.mty || 0); if (constraints[`mb_${san(bMbLP)}`]) v[`mb_${san(bMbLP)}`] = 1;
    if (hasPfMinK) { const c = b.k - parseFloat(pfMinK); if (Math.abs(c) > COEFF_NOISE) v["pfMinK"] = c; }
    if (hasPfMaxK) { const c = b.k - parseFloat(pfMaxK); if (Math.abs(c) > COEFF_NOISE) v["pfMaxK"] = c; }
    if (hasPfMinPx) { const c = (b.px || 100) - parseFloat(pfMinPx); if (Math.abs(c) > COEFF_NOISE) v["pfMinPx"] = c; }
    if (hasPfMaxPx) { const c = (b.px || 100) - parseFloat(pfMaxPx); if (Math.abs(c) > COEFF_NOISE) v["pfMaxPx"] = c; }
    if (hasPfMinDur) { const c = b.md - parseFloat(pfMinDur); if (Math.abs(c) > COEFF_NOISE) v["pfMinDur"] = c; }
    if (hasPfMaxDur) { const c = b.md - parseFloat(pfMaxDur); if (Math.abs(c) > COEFF_NOISE) v["pfMaxDur"] = c; }
    if (hasPfMinMat) { const c = b.mty - parseFloat(pfMinMat); if (Math.abs(c) > COEFF_NOISE) v["pfMinMat"] = c; }
    if (hasPfMaxMat) { const c = b.mty - parseFloat(pfMaxMat); if (Math.abs(c) > COEFF_NOISE) v["pfMaxMat"] = c; }
    if (hasPfMinY) { const c = (b.y || 0) - parseFloat(pfMinY); if (Math.abs(c) > COEFF_NOISE) v["pfMinY"] = c; }
    if (hasPfMaxY) { const c = (b.y || 0) - parseFloat(pfMaxY); if (Math.abs(c) > COEFF_NOISE) v["pfMaxY"] = c; }
    variables[`x${i}`] = v;
  });

  el.forEach((b, i) => {
    const isLocked = lockedMap.has(b.isin);
    const cap = isLocked ? lockedMap.get(b.isin) : rankCaps[b.id];
    constraints[`cap_${i}`] = { max: cap };
    if (isLocked) constraints[`lock_${i}`] = { min: lockedMap.get(b.isin) };
    variables[`x${i}`][`cap_${i}`] = 1;
    if (isLocked) variables[`x${i}`][`lock_${i}`] = 1;
  });

  // --- Solve ---
  const model = { optimize: "score", opType: "max", constraints, variables };
  try {
  let result = solver.Solve(model);
  if (!result.feasible && constraints["green"] && !cfg._noRelaxEsg) {
    console.warn("[LP] Infeasible mit ESG-Constraint — Retry ohne ESG (Soft-Constraint)");
    delete constraints["green"];
    lpGreenSoft = true;
    result = solver.Solve(model);
  }
  if (!result.feasible) {
    console.warn("[LP] Infeasible — Retry mit reduziertem Budget-Floor");
    constraints["budget"] = { min: 0, max: effectiveBudget };
    result = solver.Solve(model);
  }
  if (!result.feasible) {
    console.warn("[LP] Infeasible — Retry ohne Kategorie-Constraints (Rank/Struktur/Kupon)");
    Object.keys(constraints).forEach(k => { if (k.startsWith("rk_") || k.startsWith("st_") || k.startsWith("kp_") || k.startsWith("rtg_") || k.startsWith("sk_") || k.startsWith("mb_")) delete constraints[k]; });
    el.forEach((b, i) => { const vn = `x${i}`; Object.keys(variables[vn] || {}).forEach(k => { if (k.startsWith("rk_") || k.startsWith("st_") || k.startsWith("kp_") || k.startsWith("rtg_") || k.startsWith("sk_") || k.startsWith("mb_")) delete variables[vn][k]; }); });
    result = solver.Solve(model);
  }
  if (!result.feasible) {
    console.warn("[LP] Infeasible — Retry ohne Pf-Avg-Constraints");
    ["pfMinK","pfMaxK","pfMinPx","pfMaxPx","pfMinDur","pfMaxDur","pfMinMat","pfMaxMat","pfMinY","pfMaxY"].forEach(k => delete constraints[k]);
    el.forEach((b, i) => { const vn = `x${i}`; ["pfMinK","pfMaxK","pfMinPx","pfMaxPx","pfMinDur","pfMaxDur","pfMinMat","pfMaxMat"].forEach(k => delete variables[vn][k]); });
    result = solver.Solve(model);
  }
  if (!result.feasible) {
    console.error("[LP] Infeasible trotz vollständiger Relaxierung");
    return [];
  }

  // --- Extract LP solution ---
  let pf = [];
  let totalAllocated = 0;
  el.forEach((b, i) => {
    let nom = result[`x${i}`] || 0;
    if (Math.abs(nom) < 0.01) nom = 0;
    if (nom > 0) {
      nom = Math.round(nom * 10) / 10;
      if (lotSize > 0) nom = Math.round(nom / lotSize) * lotSize;
      if (nom > 0) {
        const isLocked = lockedMap.has(b.isin);
        pf.push({ ...b, nom, locked: isLocked, inUniverse: true });
        totalAllocated += nom;
      }
    }
  });

  // --- Category limit maps ---
  const lpRkL = {}, lpRkMin = {}; Object.keys(rankLimits || {}).forEach(c => { if (!catEnabled(rankLimits, c)) return; const mm = catMinMax(rankLimits, c); if (mm.max != null && mm.max < 100) lpRkL[c] = effectiveBudget * (mm.max / 100); if (mm.min != null && mm.min > 0) lpRkMin[c] = effectiveBudget * (mm.min / 100); });
  const lpStL = {}, lpStMin = {}; Object.keys(strukturLimits || {}).forEach(c => { if (!catEnabled(strukturLimits, c)) return; const mm = catMinMax(strukturLimits, c); if (mm.max != null && mm.max < 100) lpStL[c] = effectiveBudget * (mm.max / 100); if (mm.min != null && mm.min > 0) lpStMin[c] = effectiveBudget * (mm.min / 100); });
  const lpKpL = {}, lpKpMin = {}; Object.keys(kuponLimits || {}).forEach(c => { if (!catEnabled(kuponLimits, c)) return; const mm = catMinMax(kuponLimits, c); if (mm.max != null && mm.max < 100) lpKpL[c] = effectiveBudget * (mm.max / 100); if (mm.min != null && mm.min > 0) lpKpMin[c] = effectiveBudget * (mm.min / 100); });
  const lpRtgL = {}, lpRtgMin = {}; Object.keys(ratingLimits || {}).forEach(r => { if (!catEnabled(ratingLimits, r)) return; const mm = catMinMax(ratingLimits, r); if (mm.max != null && mm.max < 100) lpRtgL[r] = effectiveBudget * (mm.max / 100); if (mm.min != null && mm.min > 0) lpRtgMin[r] = effectiveBudget * (mm.min / 100); });
  const lpSkL = {}, lpSkMin = {}; Object.keys(sektorLimits || {}).forEach(c => { if (!catEnabled(sektorLimits, c)) return; const mm = catMinMax(sektorLimits, c); if (mm.max != null && mm.max < 100) lpSkL[c] = effectiveBudget * (mm.max / 100); if (mm.min != null && mm.min > 0) lpSkMin[c] = effectiveBudget * (mm.min / 100); });

  // --- Rank-proportional rescaling ---
  if (totalAllocated < effectiveBudget - 0.5 && pf.filter(b => !b.locked).length > 0) {
    const unlocked = pf.filter(b => !b.locked);
    const lockedNomTotal = pf.filter(b => b.locked).reduce((a, b2) => a + b2.nom, 0);
    const targetUnlocked = effectiveBudget - lockedNomTotal;

    const unlockedScored = unlocked.map(b => ({ bond: b, score: baseScore(b) })).sort((a, b) => b.score - a.score);
    const nu = unlockedScored.length;
    const rescaleCaps = new Map();
    unlockedScored.forEach(({ bond }, idx) => {
      const rankNorm = nu > 1 ? 1 - (idx / (nu - 1)) : 1;
      const cap = minBondAmtLP + rankNorm * (maxBondNom - minBondAmtLP);
      rescaleCaps.set(bond.id, cap);
    });

    let remaining = targetUnlocked;
    let activeIds = unlocked.map(b => b.id);
    const finalNom = new Map(unlocked.map(b => [b.id, b.nom]));
    const cappedIds = new Set();

    for (let iter = 0; iter < 20; iter++) {
      const activeNom = activeIds.reduce((a, id) => a + finalNom.get(id), 0);
      if (activeNom <= 0 || Math.abs(remaining - activeNom) < 0.01) break;

      const scaleFactor = remaining / activeNom;
      let newCapped = false;

      for (const id of activeIds) {
        if (cappedIds.has(id)) continue;
        const cap = rescaleCaps.get(id);
        const scaled = finalNom.get(id) * scaleFactor;
        if (scaled >= cap) {
          finalNom.set(id, cap);
          cappedIds.add(id);
          newCapped = true;
        } else {
          finalNom.set(id, scaled);
        }
      }

      if (!newCapped) break;

      const cappedTotal = [...cappedIds].reduce((a, id) => a + finalNom.get(id), 0);
      remaining = targetUnlocked - cappedTotal;
      activeIds = activeIds.filter(id => !cappedIds.has(id));
      if (activeIds.length === 0) break;
    }

    // Floor enforcement within LP rescaling
    if (minBondAmtLP > 0) {
      const removedIds = new Set();
      for (let fp = 0; fp < 10; fp++) {
        let anyRemoved = false;
        for (const [id, nom] of finalNom) {
          if (!removedIds.has(id) && nom > 0 && nom < minBondAmtLP) {
            removedIds.add(id); finalNom.set(id, 0); anyRemoved = true;
          }
        }
        if (!anyRemoved) break;
        const liveIds = [...finalNom.keys()].filter(id => !removedIds.has(id) && finalNom.get(id) > 0);
        if (liveIds.length === 0) break;
        const liveCapped = new Set();
        for (let iter = 0; iter < 20; iter++) {
          const freeIds = liveIds.filter(id => !liveCapped.has(id));
          if (freeIds.length === 0) break;
          const lockedNom = [...liveCapped].reduce((a, id) => a + finalNom.get(id), 0);
          const freeNom = freeIds.reduce((a, id) => a + finalNom.get(id), 0);
          const target = targetUnlocked - lockedNom;
          if (freeNom <= 0 || Math.abs(target - freeNom) < 0.01) break;
          const sf = target / freeNom;
          let newCap = false;
          for (const id of freeIds) {
            const scaled = finalNom.get(id) * sf;
            if (scaled >= rescaleCaps.get(id)) {
              finalNom.set(id, rescaleCaps.get(id)); liveCapped.add(id); newCap = true;
            } else {
              finalNom.set(id, scaled);
            }
          }
          if (!newCap) break;
        }
      }
    }

    // Enforce lot sizes
    if (lotSize > 0) {
      finalNom.forEach((nom, id) => {
        finalNom.set(id, Math.floor(nom / lotSize) * lotSize);
      });
    }

    // Enforce issuer and country constraints on scaled amounts
    const newIssTotals = {};
    const newCoTotals = {};
    const newRtgTotals2 = {};
    let newRankTotals2 = {}, newStrukturTotals2 = {}, newKuponTotals2 = {}, newSektorTotals2 = {};
    pf.filter(b => b.locked).forEach(b => {
      newIssTotals[b.t] = (newIssTotals[b.t] || 0) + b.nom;
      newCoTotals[b.co] = (newCoTotals[b.co] || 0) + b.nom;
      if (b.lo && ratingLimits) newRtgTotals2[b.lo] = (newRtgTotals2[b.lo] || 0) + b.nom;
      const nRk = b.rank || "SP"; newRankTotals2[nRk] = (newRankTotals2[nRk] || 0) + b.nom;
      const nMt = b.matTyp || "BULLET"; newStrukturTotals2[nMt] = (newStrukturTotals2[nMt] || 0) + b.nom;
      const nKp = b.kpnTyp || "FIXED"; newKuponTotals2[nKp] = (newKuponTotals2[nKp] || 0) + b.nom;
      const nSk = b.sektor || "OTHER"; newSektorTotals2[nSk] = (newSektorTotals2[nSk] || 0) + b.nom;
    });

    unlockedScored.forEach(({ bond }) => {
      let nom = finalNom.get(bond.id) || 0;
      const issUsed = newIssTotals[bond.t] || 0;
      nom = Math.min(nom, maxIssNominal - issUsed);
      const coUsed = newCoTotals[bond.co] || 0;
      nom = Math.min(nom, coLimit - coUsed);
      if (bond.lo && lpRtgL[bond.lo] != null) nom = Math.min(nom, lpRtgL[bond.lo] - (newRtgTotals2[bond.lo] || 0));
      const rRk2 = bond.rank || "SP"; if (lpRkL[rRk2] != null) nom = Math.min(nom, lpRkL[rRk2] - (newRankTotals2[rRk2] || 0));
      const rMt2 = bond.matTyp || "BULLET"; if (lpStL[rMt2] != null) nom = Math.min(nom, lpStL[rMt2] - (newStrukturTotals2[rMt2] || 0));
      const rKp2 = bond.kpnTyp || "FIXED"; if (lpKpL[rKp2] != null) nom = Math.min(nom, lpKpL[rKp2] - (newKuponTotals2[rKp2] || 0));
      const rSk2 = bond.sektor || "OTHER"; if (lpSkL[rSk2] != null) nom = Math.min(nom, lpSkL[rSk2] - (newSektorTotals2[rSk2] || 0));
      nom = Math.max(0, nom);
      if (lotSize > 0) nom = Math.floor(nom / lotSize) * lotSize;
      finalNom.set(bond.id, nom);
      newIssTotals[bond.t] = (newIssTotals[bond.t] || 0) + nom;
      newCoTotals[bond.co] = (newCoTotals[bond.co] || 0) + nom;
      if (bond.lo && ratingLimits) newRtgTotals2[bond.lo] = (newRtgTotals2[bond.lo] || 0) + nom;
      newRankTotals2[rRk2] = (newRankTotals2[rRk2] || 0) + nom;
      newStrukturTotals2[rMt2] = (newStrukturTotals2[rMt2] || 0) + nom;
      newKuponTotals2[rKp2] = (newKuponTotals2[rKp2] || 0) + nom;
      newSektorTotals2[rSk2] = (newSektorTotals2[rSk2] || 0) + nom;
    });

    [["Rank", newRankTotals2, lpRkMin], ["Struktur", newStrukturTotals2, lpStMin], ["Kupon", newKuponTotals2, lpKpMin], ["Rating", newRtgTotals2, lpRtgMin], ["Sektor", newSektorTotals2, lpSkMin]].forEach(([label, tots, mins]) => {
      Object.keys(mins).forEach(cat => { if ((tots[cat] || 0) < mins[cat] - 0.01) console.warn("[LP] " + label + "-Minimum für '" + cat + "' nach Rescaling nicht erreicht: " + (tots[cat] || 0).toFixed(2) + " < " + mins[cat].toFixed(2)); });
    });

    // Minimum floor enforcement
    if (minBondAmtLP > 0) {
      for (let floorIter = 0; floorIter < 10; floorIter++) {
        let freed = 0, removedCount = 0;
        var floorIssTotals = {}, floorCoTotals = {};
        pf.filter(function(b) { return b.locked; }).forEach(function(b) {
          floorIssTotals[b.t] = (floorIssTotals[b.t] || 0) + b.nom;
          floorCoTotals[b.co] = (floorCoTotals[b.co] || 0) + b.nom;
        });
        unlockedScored.forEach(function(item) {
          var n = finalNom.get(item.bond.id) || 0;
          if (n > 0) {
            floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) + n;
            floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) + n;
          }
        });
        unlockedScored.forEach(function(item) {
          var nom = finalNom.get(item.bond.id) || 0;
          if (nom > 0 && nom < minBondAmtLP) {
            freed += nom; finalNom.set(item.bond.id, 0);
            floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) - nom;
            floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) - nom;
            removedCount++;
          }
        });
        if (removedCount === 0 || freed < 0.01) break;
        var survivors = unlockedScored.filter(function(item) { return (finalNom.get(item.bond.id) || 0) >= minBondAmtLP; });
        if (survivors.length === 0) break;
        var lpCoLimit = coLimit;
        var totalHeadroom = 0;
        survivors.forEach(function(item) {
          var nom = finalNom.get(item.bond.id) || 0;
          var hardCap = maxBondNom;
          var issRoom = maxIssNominal - (floorIssTotals[item.bond.t] || 0);
          var coRoom = lpCoLimit - (floorCoTotals[item.bond.co] || 0);
          var room = Math.max(0, Math.min(hardCap - nom, issRoom, coRoom));
          item._headroom = room;
          totalHeadroom += room;
        });
        if (totalHeadroom <= 0) break;
        var toDistribute = Math.min(freed, totalHeadroom);
        survivors.forEach(function(item) {
          if (item._headroom <= 0) return;
          var share = item._headroom / totalHeadroom * toDistribute;
          var added = Math.min(share, item._headroom);
          finalNom.set(item.bond.id, (finalNom.get(item.bond.id) || 0) + added);
          floorIssTotals[item.bond.t] = (floorIssTotals[item.bond.t] || 0) + added;
          floorCoTotals[item.bond.co] = (floorCoTotals[item.bond.co] || 0) + added;
        });
      }
    }

    // Apply final nominals
    unlocked.forEach(b => {
      b.nom = Math.round((finalNom.get(b.id) || 0) * 10) / 10;
    });

    totalAllocated = pf.reduce((a, b2) => a + b2.nom, 0);

    // Final micro-fill
    if (totalAllocated < effectiveBudget - 0.5) {
      const topBond = unlockedScored.find(({ bond }) => {
        const cap = rescaleCaps.get(bond.id);
        return bond.nom < cap;
      });
      if (topBond) {
        const gap = effectiveBudget - totalAllocated;
        const cap = rescaleCaps.get(topBond.bond.id);
        let topUp = Math.min(gap, cap - topBond.bond.nom);
        if (lotSize > 0) topUp = Math.floor(topUp / lotSize) * lotSize;
        if (topUp > 0) {
          topBond.bond.nom = Math.round((topBond.bond.nom + topUp) * 10) / 10;
          totalAllocated += topUp;
        }
      }
    }
  }

  // === FINAL floor enforcement ===
  if (minBondAmtLP > 0) {
    for (let ffi = 0; ffi < 10; ffi++) {
      const underBonds = pf.filter(b => !b.locked && b.nom > 0 && b.nom < minBondAmtLP);
      if (underBonds.length === 0) break;
      let freed = 0;
      underBonds.forEach(b => { freed += b.nom; b.nom = 0; });
      const fIssTot = {}, fCoTot = {};
      pf.forEach(b => { if (b.nom > 0) { fIssTot[b.t] = (fIssTot[b.t] || 0) + b.nom; fCoTot[b.co] = (fCoTot[b.co] || 0) + b.nom; } });
      const surv = pf.filter(b => !b.locked && b.nom >= minBondAmtLP);
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

  // === Backfill + Top-Up ===
  {
    const pfIds = new Set(pf.filter(b => b.nom > 0).map(b => b.id));
    const gap = () => effectiveBudget - pf.reduce((a, b) => a + b.nom, 0);
    const bfIssTot = {}, bfCoTot = {};
    const bfRtgTot = {};
    let bfRkTot = {}, bfStTot = {}, bfKpTot = {}, bfSkTot = {}, bfGreenTot = 0;
    pf.forEach(b => {
      if (b.nom <= 0) return;
      bfIssTot[b.t] = (bfIssTot[b.t] || 0) + b.nom;
      bfCoTot[b.co] = (bfCoTot[b.co] || 0) + b.nom;
      if (b.lo && ratingLimits) bfRtgTot[b.lo] = (bfRtgTot[b.lo] || 0) + b.nom;
      const brk = b.rank || "SP"; bfRkTot[brk] = (bfRkTot[brk] || 0) + b.nom;
      const bmt = b.matTyp || "BULLET"; bfStTot[bmt] = (bfStTot[bmt] || 0) + b.nom;
      const bkp = b.kpnTyp || "FIXED"; bfKpTot[bkp] = (bfKpTot[bkp] || 0) + b.nom;
      const bsk = b.sektor || "OTHER"; bfSkTot[bsk] = (bfSkTot[bsk] || 0) + b.nom;
      if (b.g === 1) bfGreenTot += b.nom;
    });
    const rkL = {}; Object.keys(rankLimits || {}).forEach(c => { if (!catEnabled(rankLimits, c)) return; const mm = catMinMax(rankLimits, c); if (mm.max != null && mm.max < 100) rkL[c] = effectiveBudget * (mm.max / 100); });
    const stL = {}; Object.keys(strukturLimits || {}).forEach(c => { if (!catEnabled(strukturLimits, c)) return; const mm = catMinMax(strukturLimits, c); if (mm.max != null && mm.max < 100) stL[c] = effectiveBudget * (mm.max / 100); });
    const kpL = {}; Object.keys(kuponLimits || {}).forEach(c => { if (!catEnabled(kuponLimits, c)) return; const mm = catMinMax(kuponLimits, c); if (mm.max != null && mm.max < 100) kpL[c] = effectiveBudget * (mm.max / 100); });
    const skL = {}; Object.keys(sektorLimits || {}).forEach(c => { if (!catEnabled(sektorLimits, c)) return; const mm = catMinMax(sektorLimits, c); if (mm.max != null && mm.max < 100) skL[c] = effectiveBudget * (mm.max / 100); });
    // Phase 1: Backfill
    if (gap() >= minBondAmtLP && minBondAmtLP > 0) {
      const candidates = el.filter(b => !pfIds.has(b.id) && !lockedMap.has(b.isin))
        .map(b => ({ b, sc: baseScore(b) }))
        .sort((a, b) => b.sc - a.sc);
      let added = 0;
      for (const { b } of candidates) {
        if (gap() < minBondAmtLP) break;
        let nom = minBondAmtLP;
        if ((bfIssTot[b.t] || 0) + nom > maxIssNominal) continue;
        if (coLimit > 0 && (bfCoTot[b.co] || 0) + nom > coLimit) continue;
        if (b.lo && ratingLimits && catEnabled(ratingLimits, b.lo)) { const rtgMM = catMinMax(ratingLimits, b.lo); if (rtgMM.max != null && rtgMM.max < 100) { const rtgLim = effectiveBudget * (rtgMM.max / 100); if ((bfRtgTot[b.lo] || 0) + nom > rtgLim) continue; } }
        { const cr = b.rank || "SP"; if (rkL[cr] != null && (bfRkTot[cr] || 0) + nom > rkL[cr]) continue; }
        { const cm = b.matTyp || "BULLET"; if (stL[cm] != null && (bfStTot[cm] || 0) + nom > stL[cm]) continue; }
        { const ck = b.kpnTyp || "FIXED"; if (kpL[ck] != null && (bfKpTot[ck] || 0) + nom > kpL[ck]) continue; }
        { const cs = b.sektor || "OTHER"; if (skL[cs] != null && (bfSkTot[cs] || 0) + nom > skL[cs]) continue; }
        if (lotSize > 0) nom = Math.floor(nom / lotSize) * lotSize;
        if (nom < minBondAmtLP) continue;
        pf.push({ ...b, nom, locked: false, inUniverse: true });
        pfIds.add(b.id);
        bfIssTot[b.t] = (bfIssTot[b.t] || 0) + nom;
        bfCoTot[b.co] = (bfCoTot[b.co] || 0) + nom;
        if (b.lo && ratingLimits) bfRtgTot[b.lo] = (bfRtgTot[b.lo] || 0) + nom;
        { const cr = b.rank || "SP"; bfRkTot[cr] = (bfRkTot[cr] || 0) + nom; }
        { const cm = b.matTyp || "BULLET"; bfStTot[cm] = (bfStTot[cm] || 0) + nom; }
        { const ck = b.kpnTyp || "FIXED"; bfKpTot[ck] = (bfKpTot[ck] || 0) + nom; }
        { const cs = b.sektor || "OTHER"; bfSkTot[cs] = (bfSkTot[cs] || 0) + nom; }
        if (b.g === 1) bfGreenTot += nom;
        added++;
      }
    }
    // Phase 2: Top-Up
    const minStep = lotSize || 0.1;
    if (gap() >= minStep) {
      const topUpCands = pf.filter(b => !b.locked && b.nom > 0)
        .map(b => ({ b, sc: baseScore(b) }))
        .sort((a, b) => b.sc - a.sc);
      let topUpTotal = 0;
      for (const { b } of topUpCands) {
        if (gap() < minStep) break;
        let room = maxBondNom - b.nom;
        room = Math.min(room, maxIssNominal - (bfIssTot[b.t] || 0));
        if (coLimit > 0) room = Math.min(room, coLimit - (bfCoTot[b.co] || 0));
        if (b.lo && ratingLimits && catEnabled(ratingLimits, b.lo)) { const rtgMM = catMinMax(ratingLimits, b.lo); if (rtgMM.max != null && rtgMM.max < 100) room = Math.min(room, effectiveBudget * (rtgMM.max / 100) - (bfRtgTot[b.lo] || 0)); }
        { const cr = b.rank || "SP"; if (rkL[cr] != null) room = Math.min(room, rkL[cr] - (bfRkTot[cr] || 0)); }
        { const cm = b.matTyp || "BULLET"; if (stL[cm] != null) room = Math.min(room, stL[cm] - (bfStTot[cm] || 0)); }
        { const ck = b.kpnTyp || "FIXED"; if (kpL[ck] != null) room = Math.min(room, kpL[ck] - (bfKpTot[ck] || 0)); }
        { const cs = b.sektor || "OTHER"; if (skL[cs] != null) room = Math.min(room, skL[cs] - (bfSkTot[cs] || 0)); }
        room = Math.min(room, gap());
        if (lotSize > 0) room = Math.floor(room / lotSize) * lotSize;
        if (room < minStep) continue;
        b.nom = Math.round((b.nom + room) * 10) / 10;
        bfIssTot[b.t] = (bfIssTot[b.t] || 0) + room;
        bfCoTot[b.co] = (bfCoTot[b.co] || 0) + room;
        if (b.lo && ratingLimits) bfRtgTot[b.lo] = (bfRtgTot[b.lo] || 0) + room;
        { const cr = b.rank || "SP"; bfRkTot[cr] = (bfRkTot[cr] || 0) + room; }
        { const cm = b.matTyp || "BULLET"; bfStTot[cm] = (bfStTot[cm] || 0) + room; }
        { const ck = b.kpnTyp || "FIXED"; bfKpTot[ck] = (bfKpTot[ck] || 0) + room; }
        { const cs = b.sektor || "OTHER"; bfSkTot[cs] = (bfSkTot[cs] || 0) + room; }
        topUpTotal += room;
      }
    }
  }

  // Filter by min issuer nominal
  if (minIssAmtLP > 0) {
    const issTots = {};
    pf.forEach(b => { issTots[b.t] = (issTots[b.t] || 0) + b.nom; });
    pf = pf.filter(b => b.locked || (issTots[b.t] || 0) >= minIssAmtLP);
  }

  // === Enforce portfolio-average constraints ===
  const pfFlags = parsePfFlags(cfg);
  const enforceAvgMax = (field, targetVal, label) => {
    for (let iter = 0; iter < 30; iter++) {
      const tNom = pf.reduce((a, b) => a + b.nom, 0);
      if (tNom <= 0) break;
      const avg = pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / tNom;
      if (avg <= targetVal + 1e-6) break;
      const above = pf.filter(b => !b.locked && b.nom > 0 && (b[field] || 0) > targetVal)
        .sort((a, b) => (b[field] || 0) - (a[field] || 0));
      if (above.length === 0) break;
      const worst = above[0];
      const sumFN = pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0);
      const excess = sumFN - targetVal * tNom;
      const delta = Math.min(worst.nom, Math.ceil(excess / ((worst[field] || 0) - targetVal) * 10) / 10);
      if (delta < 0.1) break;
      worst.nom = Math.round((worst.nom - delta) * 10) / 10;
      if (worst.nom < (minBondAmtLP || 0) && !worst.locked) worst.nom = 0;
      if (lotSize > 0 && worst.nom > 0) worst.nom = Math.floor(worst.nom / lotSize) * lotSize;
    }
    pf = pf.filter(b => b.nom > 0);
  };
  const enforceAvgMin = (field, targetVal, label) => {
    for (let iter = 0; iter < 30; iter++) {
      const tNom = pf.reduce((a, b) => a + b.nom, 0);
      if (tNom <= 0) break;
      const avg = pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / tNom;
      if (avg >= targetVal - 1e-6) break;
      const below = pf.filter(b => !b.locked && b.nom > 0 && (b[field] || 0) < targetVal)
        .sort((a, b) => (a[field] || 0) - (b[field] || 0));
      if (below.length === 0) break;
      const worst = below[0];
      const sumFN = pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0);
      const deficit = targetVal * tNom - sumFN;
      const delta = Math.min(worst.nom, Math.ceil(deficit / (targetVal - (worst[field] || 0)) * 10) / 10);
      if (delta < 0.1) break;
      worst.nom = Math.round((worst.nom - delta) * 10) / 10;
      if (worst.nom < (minBondAmtLP || 0) && !worst.locked) worst.nom = 0;
      if (lotSize > 0 && worst.nom > 0) worst.nom = Math.floor(worst.nom / lotSize) * lotSize;
    }
    pf = pf.filter(b => b.nom > 0);
  };
  if (pfFlags.hasPfMinDur) enforceAvgMin("md", pfFlags.pfMinDurVal, "pfMinDur");
  if (pfFlags.hasPfMaxDur) enforceAvgMax("md", pfFlags.pfMaxDurVal, "pfMaxDur");
  if (pfFlags.hasPfMinMat) enforceAvgMin("mty", pfFlags.pfMinMatVal, "pfMinMat");
  if (pfFlags.hasPfMaxMat) enforceAvgMax("mty", pfFlags.pfMaxMatVal, "pfMaxMat");
  if (pfFlags.hasPfMaxPx) enforceAvgMax("px", pfFlags.pfMaxPxVal, "pfMaxPx");
  if (pfFlags.hasPfMinPx) enforceAvgMin("px", pfFlags.pfMinPxVal, "pfMinPx");
  if (pfFlags.hasPfMaxK) enforceAvgMax("k", pfFlags.pfMaxKVal, "pfMaxK");
  if (pfFlags.hasPfMinK) enforceAvgMin("k", pfFlags.pfMinKVal, "pfMinK");

  // === Refill after enforceAvg trimming ===
  const postTotalNom = () => pf.reduce((a, b) => a + b.nom, 0);
  const postGap = () => effectiveBudget - postTotalNom();
  if (postGap() > (lotSize > 0 ? lotSize : minBondAmtLP || 1) + 0.01) {
    const postIssTot = {}, postCoTot = {}, postRtgTot = {}, postRkTot = {}, postStTot = {}, postKpTot = {};
    pf.forEach(b => {
      postIssTot[b.t] = (postIssTot[b.t] || 0) + b.nom;
      postCoTot[b.co] = (postCoTot[b.co] || 0) + b.nom;
      if (b.lo) postRtgTot[b.lo] = (postRtgTot[b.lo] || 0) + b.nom;
      postRkTot[b.rank || "SP"] = (postRkTot[b.rank || "SP"] || 0) + b.nom;
      postStTot[b.matTyp || "BULLET"] = (postStTot[b.matTyp || "BULLET"] || 0) + b.nom;
      postKpTot[b.kpnTyp || "FIXED"] = (postKpTot[b.kpnTyp || "FIXED"] || 0) + b.nom;
    });
    const pfIds = new Set(pf.map(b => b.id));
    const candidates = [...pf.filter(b => !b.locked), ...el.filter(b => !pfIds.has(b.id) && !lockedMap.has(b.isin))]
      .sort((a, b) => baseScore(b) - baseScore(a));
    for (const b of candidates) {
      if (postGap() < (lotSize > 0 ? lotSize : 0.1)) break;
      const inPf = pf.find(x => x.id === b.id);
      const curNom = inPf ? inPf.nom : 0;
      let room = maxBondNom - curNom;
      room = Math.min(room, maxIssNominal - (postIssTot[b.t] || 0));
      room = Math.min(room, coLimit - (postCoTot[b.co] || 0));
      if (b.lo && lpRtgL[b.lo] != null) room = Math.min(room, lpRtgL[b.lo] - (postRtgTot[b.lo] || 0));
      const bRk = b.rank || "SP"; if (lpRkL[bRk] != null) room = Math.min(room, lpRkL[bRk] - (postRkTot[bRk] || 0));
      const bMt = b.matTyp || "BULLET"; if (lpStL[bMt] != null) room = Math.min(room, lpStL[bMt] - (postStTot[bMt] || 0));
      const bKp = b.kpnTyp || "FIXED"; if (lpKpL[bKp] != null) room = Math.min(room, lpKpL[bKp] - (postKpTot[bKp] || 0));
      room = Math.min(room, postGap());
      if (lotSize > 0) room = Math.floor(room / lotSize) * lotSize;
      if (room < (minBondAmtLP > curNom ? minBondAmtLP - curNom : (lotSize || 0.1))) continue;
      const tN = postTotalNom(); const newTN = tN + room;
      if (pfFlags.hasPfMaxPx) { const curSum = pf.reduce((a, x) => a + (x.px || 100) * x.nom, 0); if ((curSum + (b.px || 100) * room) / newTN > pfFlags.pfMaxPxVal + 0.01) continue; }
      if (pfFlags.hasPfMinPx) { const curSum = pf.reduce((a, x) => a + (x.px || 100) * x.nom, 0); if ((curSum + (b.px || 100) * room) / newTN < pfFlags.pfMinPxVal - 0.01) continue; }
      if (pfFlags.hasPfMaxDur) { const curSum = pf.reduce((a, x) => a + x.md * x.nom, 0); if ((curSum + b.md * room) / newTN > pfFlags.pfMaxDurVal + 0.01) continue; }
      if (pfFlags.hasPfMinDur) { const curSum = pf.reduce((a, x) => a + x.md * x.nom, 0); if ((curSum + b.md * room) / newTN < pfFlags.pfMinDurVal - 0.01) continue; }
      if (pfFlags.hasPfMaxK) { const curSum = pf.reduce((a, x) => a + x.k * x.nom, 0); if ((curSum + b.k * room) / newTN > pfFlags.pfMaxKVal + 0.01) continue; }
      if (pfFlags.hasPfMinK) { const curSum = pf.reduce((a, x) => a + x.k * x.nom, 0); if ((curSum + b.k * room) / newTN < pfFlags.pfMinKVal - 0.01) continue; }
      if (pfFlags.hasPfMaxMat) { const curSum = pf.reduce((a, x) => a + (x.mty || 0) * x.nom, 0); if ((curSum + (b.mty || 0) * room) / newTN > pfFlags.pfMaxMatVal + 0.01) continue; }
      if (pfFlags.hasPfMinMat) { const curSum = pf.reduce((a, x) => a + (x.mty || 0) * x.nom, 0); if ((curSum + (b.mty || 0) * room) / newTN < pfFlags.pfMinMatVal - 0.01) continue; }
      if (inPf) { inPf.nom = Math.round((inPf.nom + room) * 10) / 10; }
      else { pf.push({ ...b, nom: Math.round(room * 10) / 10, locked: false, inUniverse: true }); }
      postIssTot[b.t] = (postIssTot[b.t] || 0) + room;
      postCoTot[b.co] = (postCoTot[b.co] || 0) + room;
      if (b.lo) postRtgTot[b.lo] = (postRtgTot[b.lo] || 0) + room;
      postRkTot[bRk] = (postRkTot[bRk] || 0) + room;
      postStTot[bMt] = (postStTot[bMt] || 0) + room;
      postKpTot[bKp] = (postKpTot[bKp] || 0) + room;
    }
  }

  return pf.map(b => ({ ...b, nom: Math.round(b.nom * 10) / 10 })).filter(b => b.nom > 0);

  } catch (err) {
    console.error("LP Solver Fehler:", err);
    return [];
  }
}
