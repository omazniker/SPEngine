// 7-phase Auto-Optimizer: LHS scan → Pareto → MIP re-solve
// Extracted from tests/test_lexicographic.html lines 6154-6921

import { getHighsSolver } from './highs.js';
import {
  stats,
  filterEligible,
  baseScoreFn,
  parsePfFlags,
  prepLockedBonds,
  nsgaIIParetoFilter,
  latinHypercubeSampling,
  getMatBucket,
  catEnabled,
  catMinMax,
  COEFF_NOISE,
} from './solverHelpers.js';

/**
 * Auto-Optimize: 1000-Szenario-Scan → Pareto-Filter → Diversity-Selektion → MIP-Verfeinerung.
 *
 * Phase 1: P₀ (Yield-Max) via MIP
 * Phase 2: Rang-Komposition erkennen (SP/SU/SNP/T2)
 * Phase 3: 1000 zufällige Konfigurationen (ESG, Obj, DurMax, RatingFloor, Rang-Disables)
 * Phase 4: Greedy-Scan aller 1000 (~1-2s)
 * Phase 5: Pareto-Filter (max Yield, max Spread, max ESG, min Rating, min Duration, min SU%, min SNP%)
 * Phase 6: Diversity-Selektion → Top 12-15
 * Phase 7: MIP-Re-Solve der Finalisten
 *
 * @returns {Object} { p0, alternatives, elapsed, scanInfo }
 */
export async function runAutoOptimize(pool, baseCfg, solveFn, setLog) {
  const t0 = performance.now();
  const effectiveBudget = parseFloat(baseCfg.budget) || 200;

  // ═══ Phase 1: P₀ = Yield-Max via MIP (mit User-Constraints) ═══
  setLog("🚀 Phase 1/5 — P₀ Yield-Max berechnen...");
  let p0Result;
  try {
    p0Result = await solveFn(pool, { ...baseCfg, obj: "yield" });
  } catch (e) {
    console.error("[AutoOpt] P0 fehlgeschlagen:", e.message);
    return { p0: null, alternatives: [], error: "P0 fehlgeschlagen: " + e.message };
  }
  if (!p0Result || p0Result.length === 0) {
    return { p0: null, alternatives: [], error: "P0 lieferte kein Ergebnis" };
  }
  const p0S = stats(p0Result);
  if (!p0S) return { p0: null, alternatives: [], error: "P0 Stats leer" };

  console.log("[AutoOpt] P0: Y=" + p0S.wY.toFixed(3) + "% ESG=" + (p0S.gP*100).toFixed(1) +
    "% Rat=" + p0S.wLn.toFixed(2) + " Dur=" + p0S.wD.toFixed(2) + "J  " + p0Result.length + " Bonds");

  // ═══ Phase 2: Rang-Komposition erkennen + Universe-Grenzen ═══
  setLog("🚀 Phase 2/5 — Rang-Analyse & Raum-Grenzen...");
  const rankNom = {};
  p0Result.forEach(b => { const r = b.rank || "SP"; rankNom[r] = (rankNom[r] || 0) + (b.nom || 0); });
  const rankPct = {};
  Object.entries(rankNom).forEach(([r, n]) => { rankPct[r] = p0S.tN > 0 ? n / p0S.tN : 0; });
  const hasSU = (rankPct.SU || 0) > 0.01;
  const hasSNP = (rankPct.SNP || 0) > 0.01;
  const hasT2 = (rankPct.T2 || 0) > 0.01;
  const hasAT1 = (rankPct.AT1 || 0) > 0.01;
  console.log("[AutoOpt] Rang-Komposition:", JSON.stringify(rankPct));

  // ── Universe-Grenzen (VOLL, OHNE User-Constraints!) ──
  const poolDurs = pool.map(b => b.dur || b.md || 0).filter(d => d > 0);
  const univMaxDur = poolDurs.length > 0 ? Math.max(...poolDurs) : 10;
  const univMinDur = poolDurs.length > 0 ? Math.min(...poolDurs) : 0.5;
  const poolRats = pool.map(b => b.ln || 0).filter(r => r > 0);
  const univMaxRat = poolRats.length > 0 ? Math.max(...poolRats) : 10;

  // ESG-Kapazität aus Universe
  const esgBonds = pool.filter(b => b.g === 1);
  const maxBN = parseFloat(baseCfg.maxBondNom) || 10;
  const maxEsgNom = esgBonds.reduce((s, b) => s + Math.min(maxBN, b.os || maxBN), 0);
  const maxEsgPct = Math.min(100, Math.round(maxEsgNom / effectiveBudget * 100));

  console.log("[AutoOpt] Universe: Dur=[" + univMinDur.toFixed(2) + "," + univMaxDur.toFixed(2) +
    "]J Rat=[1," + univMaxRat.toFixed(2) + "] ESG-Max=" + maxEsgPct + "%");

  // ── Rang-Kombinationen + Cache ──
  const rankCombos = [{ label: "alle", disables: {} }];
  if (hasSU) rankCombos.push({ label: "keinSU", disables: { SU: false } });
  if (hasSNP) rankCombos.push({ label: "keinSNP", disables: { SNP: false } });
  if (hasSU && hasSNP) rankCombos.push({ label: "keinSU+SNP", disables: { SU: false, SNP: false } });
  if (hasT2) rankCombos.push({ label: "keinT2", disables: { T2: false } });

  const rlCache = rankCombos.map(rc => {
    if (Object.keys(rc.disables).length === 0) return null;
    const rl = {};
    const base = baseCfg.rankLimits || {};
    Object.keys(base).forEach(r => { rl[r] = { ...(base[r] || { enabled: true, min: "", max: "" }) }; });
    Object.entries(rc.disables).forEach(([rank, en]) => {
      if (rl[rank]) rl[rank] = { ...rl[rank], enabled: en };
      else rl[rank] = { enabled: en, min: "", max: "" };
    });
    return rl;
  });

  // ═══ Phase 3: Szenario-Raum aufbauen ═══
  setLog("🚀 Phase 3/5 — Szenario-Raum aufbauen...");

  const freeCfg = { ...baseCfg };
  freeCfg.pfMinDur = ""; freeCfg.pfMaxDur = "";
  freeCfg.pfMinK = "";  freeCfg.pfMaxK = "";
  freeCfg.pfMinPx = ""; freeCfg.pfMaxPx = "";
  freeCfg.pfMinMat = ""; freeCfg.pfMaxMat = "";
  freeCfg._fastScan = true;
  delete freeCfg.minGreen;

  // ── Bereiche für Sweeps ──
  const durSweepHi = Math.ceil(univMaxDur * 10) / 10 + 0.5;
  const durSweepLo = Math.max(0.3, Math.floor(univMinDur * 10) / 10 - 0.1);
  const ratSweepHi = Math.ceil(univMaxRat * 10) / 10 + 0.3;

  const configs = [];
  const seen = new Set();
  const cfgKey = c => c.esg + "|" + c.dur + "|" + c.rat + "|" + c.rcIdx;
  const addCfg = c => { const k = cfgKey(c); if (!seen.has(k)) { seen.add(k); configs.push(c); } };

  // ── A) Frontier-Sweeps: 1D-dichte Linien für vollständige Frontier-Kurven ──
  for (let e = 0; e <= maxEsgPct; e += 1) addCfg({ esg: e, dur: null, rat: null, rcIdx: 0 });
  for (let d = durSweepHi; d >= durSweepLo; d -= 0.05) addCfg({ esg: 0, dur: parseFloat(d.toFixed(2)), rat: null, rcIdx: 0 });
  for (let r = ratSweepHi; r >= 1; r -= 0.1) addCfg({ esg: 0, dur: null, rat: parseFloat(r.toFixed(2)), rcIdx: 0 });
  for (let rcIdx = 0; rcIdx < rankCombos.length; rcIdx++) addCfg({ esg: 0, dur: null, rat: null, rcIdx });

  const nFrontierSweep = configs.length;

  // ── B) LHS-Sampling ──
  const nLhsPerCombo = Math.max(80, Math.floor(600 / Math.max(1, rankCombos.length)));
  const lhsDims = [
    { name: "esg", min: 0, max: maxEsgPct, step: 1, discrete: true },
    { name: "dur", min: durSweepLo, max: durSweepHi, step: 0.05 },
    { name: "rat", min: 1.0, max: ratSweepHi, step: 0.1 },
  ];
  for (let rcIdx = 0; rcIdx < rankCombos.length; rcIdx++) {
    const lhsSamples = latinHypercubeSampling(nLhsPerCombo, lhsDims, 42 + rcIdx);
    for (const s of lhsSamples) {
      addCfg({ esg: s.esg, dur: s.dur, rat: s.rat, rcIdx });
      addCfg({ esg: s.esg, dur: s.dur, rat: null, rcIdx });
      addCfg({ esg: s.esg, dur: null, rat: s.rat, rcIdx });
    }
    addCfg({ esg: 0, dur: null, rat: null, rcIdx });
  }

  const nLHS = configs.length - nFrontierSweep;
  const N_SCAN = configs.length;

  console.log("[AutoOpt] Szenario-Raum: " + nFrontierSweep + " Frontier + " +
    nLHS + " LHS = " + N_SCAN + " Total");
  console.log("[AutoOpt] Bereiche: ESG=[0," + maxEsgPct + "] Dur=[" + durSweepLo.toFixed(2) + "," +
    durSweepHi.toFixed(2) + "] Rat=[1," + ratSweepHi.toFixed(2) + "]");

  // ═══ Phase 4: BATCH-LP-Scan ═══
  setLog("🚀 Phase 4/5 — Batch-LP-Solver initialisieren...");

  const solver = await getHighsSolver();
  const el = filterEligible(pool, freeCfg);
  if (el.length === 0) {
    return { p0: { result: p0Result, stats: p0S, name: "P₀ Yield-Max", icon: "📈" },
      alternatives: [], elapsed: "0", error: "Keine eligible Bonds für Scan",
      scanInfo: { total: 0, feasible: 0, constrained: 0, pareto: 0, selected: 0, final: 0, sweeps: 0, cross: 0, grid: 0 } };
  }
  const lockedMap = prepLockedBonds(el, pool, freeCfg.lockedBonds || [], freeCfg);
  const baseScore = baseScoreFn("yield");
  const maxNom = Math.max(0, parseFloat(baseCfg.maxBondNom) || 10);
  const maxIssNominal = parseFloat(baseCfg.maxIssNominal) || effectiveBudget;
  const maxCo = parseFloat(baseCfg.maxCo) || 100;
  const budgetFloor = effectiveBudget * 0.95;
  const minBudgetFeasible = effectiveBudget * 0.50;

  // Bond-Caps (ISIN-Exceptions)
  const bondCapsV2 = new Map();
  if (baseCfg.isinExceptions && baseCfg.isinExceptions.length) {
    const exMap = new Map(baseCfg.isinExceptions.filter(x => x.maxNom > 0).map(x => [x.isin, x.maxNom]));
    el.forEach(b => { const cap = exMap.get(b.isin); if (cap != null) bondCapsV2.set(b.id, Math.min(maxNom, cap)); });
  }

  const fc = v => {
    if (!isFinite(v)) return "0";
    if (Math.abs(v) < COEFF_NOISE) return "0";
    const r = Math.round(v * 1e8) / 1e8;
    return r === Math.round(r) ? r.toFixed(0) : r.toString();
  };
  const san = s => s.replace(/\+/g, 'p').replace(/-/g, 'm').replace(/[^a-zA-Z0-9]/g, '');
  const addPctConstraint = (L2, name, matchFn, pct, isMax) => {
    const frac = pct / 100;
    let line = `  ${name}:`;
    let hasTerm = false;
    el.forEach((b, i) => {
      const inCat = matchFn(b);
      const coeff = inCat ? (1 - frac) : -frac;
      if (Math.abs(coeff) > COEFF_NOISE) {
        line += coeff >= 0 ? ` + ${fc(coeff)} z${i}` : ` - ${fc(-coeff)} z${i}`;
        hasTerm = true;
      }
    });
    if (hasTerm) { line += isMax ? ` <= 0` : ` >= 0`; L2.push(line); }
  };

  // ── STATISCHE LP-Zeilen ──
  const staticLines = [];

  staticLines.push("Maximize");
  let objLine = "  obj:";
  el.forEach((b, i) => {
    const sc = baseScore(b);
    if (isFinite(sc) && Math.abs(sc) > COEFF_NOISE) objLine += ` + ${fc(sc)} z${i}`;
  });
  staticLines.push(objLine);
  staticLines.push(""); staticLines.push("Subject To");

  let budMax = "  c_bmax:"; el.forEach((_, i) => { budMax += ` + 1 z${i}`; }); budMax += ` <= ${fc(effectiveBudget)}`; staticLines.push(budMax);
  let budMin = "  c_bmin:"; el.forEach((_, i) => { budMin += ` + 1 z${i}`; }); budMin += ` >= ${fc(budgetFloor)}`; staticLines.push(budMin);

  const issuers = [...new Set(el.map(b => b.t))];
  issuers.forEach((t, ti) => {
    let line = `  c_iss${ti}:`; let ht = false;
    el.forEach((b, i) => { if (b.t === t) { line += ` + 1 z${i}`; ht = true; } });
    if (ht) { line += ` <= ${fc(maxIssNominal)}`; staticLines.push(line); }
  });

  const coUnitS = baseCfg.countryLimitUnit || "pct";
  const countries = [...new Set(el.map(b => b.co))];
  if (coUnitS === "pct") {
    const pctFrac = maxCo / 100;
    countries.forEach((co, ci) => {
      let line = `  c_co${ci}:`; let ht = false;
      el.forEach((b, i) => {
        const coeff = (b.co === co) ? (1 - pctFrac) : -pctFrac;
        if (Math.abs(coeff) > COEFF_NOISE) { line += coeff >= 0 ? ` + ${fc(coeff)} z${i}` : ` - ${fc(-coeff)} z${i}`; ht = true; }
      });
      if (ht) { line += ` <= 0`; staticLines.push(line); }
    });
  } else {
    countries.forEach((co, ci) => {
      let line = `  c_co${ci}:`; let ht = false;
      el.forEach((b, i) => { if (b.co === co) { line += ` + ${fc(1)} z${i}`; ht = true; } });
      if (ht) { line += ` <= ${fc(Math.max(0, maxCo))}`; staticLines.push(line); }
    });
  }

  const addAbsConstraintStatic = (L2, name, matchFn, absVal, isMax) => {
    let line = `  ${name}:`; let ht = false;
    el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } });
    if (ht) { line += isMax ? ` <= ${fc(absVal)}` : ` >= ${fc(absVal)}`; L2.push(line); }
  };
  const addCatConstraintsStatic = (limits, unit, prefix, catFn) => {
    Object.entries(limits || {}).forEach(([cat]) => {
      if (!catEnabled(limits, cat)) return;
      const { min, max } = catMinMax(limits, cat);
      const matchFn = b => catFn(b) === cat;
      if (unit === "pct") {
        if (max != null && max < 100) addPctConstraint(staticLines, `c_${prefix}_max_${san(cat)}`, matchFn, max, true);
        if (min != null && min > 0) addPctConstraint(staticLines, `c_${prefix}_min_${san(cat)}`, matchFn, min, false);
      } else {
        if (max != null) addAbsConstraintStatic(staticLines, `c_${prefix}_max_${san(cat)}`, matchFn, parseFloat(max), true);
        if (min != null && parseFloat(min) > 0) addAbsConstraintStatic(staticLines, `c_${prefix}_min_${san(cat)}`, matchFn, parseFloat(min), false);
      }
    });
  };

  addCatConstraintsStatic(baseCfg.ratingLimits, baseCfg.ratingLimitUnit || "pct", "rtg", b => b.lo);
  addCatConstraintsStatic(baseCfg.strukturLimits, baseCfg.strukturLimitUnit || "pct", "st", b => b.matTyp || "BULLET");
  addCatConstraintsStatic(baseCfg.kuponLimits, baseCfg.kuponLimitUnit || "pct", "kp", b => b.kpnTyp || "FIXED");
  addCatConstraintsStatic(baseCfg.sektorLimits, baseCfg.sektorLimitUnit || "pct", "sk", b => b.sektor || "OTHER");
  const mbLimitsS = baseCfg.matBucketLimits || {};
  const mbUnitS = baseCfg.matBucketUnit || "pct";
  Object.keys(mbLimitsS).forEach(bkt => {
    const lim = mbLimitsS[bkt]; if (!lim) return;
    if (lim.enabled === false) { el.forEach((b, i) => { if (getMatBucket(b.mty || 0) === bkt) staticLines.push(`  c_mb_dis_${san(bkt)}_${i}: z${i} <= 0`); }); return; }
    const mn = lim.min !== "" && lim.min != null ? parseFloat(lim.min) : null;
    const mx = lim.max !== "" && lim.max != null ? parseFloat(lim.max) : null;
    const matchFn = b => getMatBucket(b.mty || 0) === bkt;
    if (mbUnitS === "pct") {
      if (mx != null && mx < 100) addPctConstraint(staticLines, `c_mb_max_${san(bkt)}`, matchFn, mx, true);
      if (mn != null && mn > 0) addPctConstraint(staticLines, `c_mb_min_${san(bkt)}`, matchFn, mn, false);
    } else {
      if (mx != null) { let line = `  c_mb_max_${san(bkt)}:`; let ht = false; el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } }); if (ht) { line += ` <= ${fc(mx)}`; staticLines.push(line); } }
      if (mn != null && mn > 0) { let line = `  c_mb_min_${san(bkt)}:`; let ht = false; el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } }); if (ht) { line += ` >= ${fc(mn)}`; staticLines.push(line); } }
    }
  });

  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin));
      staticLines.push(`  c_lock${i}: z${i} >= ${fixedS}`);
      staticLines.push(`  c_lockx${i}: z${i} <= ${fixedS}`);
    }
  });

  addCatConstraintsStatic(baseCfg.rankLimits, baseCfg.rankLimitUnit || "pct", "rk", b => b.rank || "SP");

  // ── Pre-computed Bounds ──
  const defaultBounds = [];
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin));
      defaultBounds.push(`  ${fixedS} <= z${i} <= ${fixedS}`);
    } else {
      const bCap = bondCapsV2.get(b.id) || maxNom;
      defaultBounds.push(`  0 <= z${i} <= ${fc(bCap)}`);
    }
  });

  // ── Pre-computed Bond-Attribute ──
  const nB = el.length;
  const bY = el.map(b => b.y || 0);
  const bD = el.map(b => b.md || 0);
  const bR = el.map(b => b.ln || 99);
  const bG = el.map(b => b.g === 1 ? 1 : 0);
  const bS = el.map(b => b.s || 0);
  const bK = el.map(b => b.k || 0);
  const bRank = el.map(b => b.rank || "SP");
  const bMat = el.map(b => b.mty || 0);
  const bPx = el.map(b => b.px || 100);

  const rankBondIdx = {};
  el.forEach((b, i) => { const r = b.rank || "SP"; if (!rankBondIdx[r]) rankBondIdx[r] = []; rankBondIdx[r].push(i); });

  const rankDisableSets = rankCombos.map(rc => {
    if (Object.keys(rc.disables).length === 0) return null;
    const disabled = new Set();
    Object.entries(rc.disables).forEach(([rank, en]) => {
      if (!en && rankBondIdx[rank]) rankBondIdx[rank].forEach(i => disabled.add(i));
    });
    return disabled;
  });

  const staticLP = staticLines.join("\n");

  const defaultBoundsStr = "\nBounds\n" + defaultBounds.join("\n");
  const rankBoundsStr = rankDisableSets.map(disabledSet => {
    if (!disabledSet) return defaultBoundsStr;
    const modBounds = [];
    for (let i = 0; i < nB; i++) {
      if (disabledSet.has(i) && !lockedMap.has(el[i].isin)) {
        modBounds.push(`  0 <= z${i} <= 0`);
      } else {
        modBounds.push(defaultBounds[i]);
      }
    }
    return "\nBounds\n" + modBounds.join("\n");
  });

  console.log("[AutoOpt] Batch-LP: " + nB + " Bonds, " + staticLines.length + " statische Zeilen, " +
    issuers.length + " Emittenten, " + countries.length + " Länder");

  // ── BATCH-SOLVE Funktion ──
  const batchSolve = (esg, durCeil, ratCeil, rcIdx) => {
    const dynLines = [];

    if (esg > 0) {
      const thresh = esg / 100;
      let line = "  c_esg:";
      for (let i = 0; i < nB; i++) {
        const c = bG[i] - thresh;
        if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`;
      }
      dynLines.push(line + " >= 0");
    }

    if (durCeil !== null) {
      let line = "  c_lexCeilDur:";
      for (let i = 0; i < nB; i++) {
        const c = bD[i] - durCeil;
        if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`;
      }
      dynLines.push(line + " <= 0");
    }

    if (ratCeil !== null) {
      let line = "  c_lexCeilRtg:";
      for (let i = 0; i < nB; i++) {
        const c = bR[i] - ratCeil;
        if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`;
      }
      dynLines.push(line + " <= 0");
    }

    const lpString = staticLP + "\n" + dynLines.join("\n") + rankBoundsStr[rcIdx] + "\n\nEnd";

    try {
      const result = solver.solve(lpString);
      if (result.Status !== "Optimal") return null;

      let totalNom = 0, sumYN = 0, sumDN = 0, sumRN = 0, sumGN = 0, sumSN = 0, sumKN = 0, sumMatN = 0;
      const rankNoms = {};
      for (let i = 0; i < nB; i++) {
        const zi = result.Columns["z" + i]?.Primal || 0;
        if (zi < 1e-6) continue;
        totalNom += zi;
        sumYN += zi * bY[i];
        sumDN += zi * bD[i];
        sumRN += zi * bR[i];
        sumGN += zi * bG[i];
        sumSN += zi * bS[i];
        sumKN += zi * bK[i];
        sumMatN += zi * bMat[i];
        const rk = bRank[i];
        rankNoms[rk] = (rankNoms[rk] || 0) + zi;
      }
      if (totalNom < minBudgetFeasible) return null;

      const tN = totalNom;
      return {
        wY: sumYN / tN, wD: sumDN / tN, wLn: sumRN / tN,
        gP: sumGN / tN, wS: sumSN / tN, wK: sumKN / tN, wMat: sumMatN / tN,
        tN, nB: nB,
        suP: (rankNoms.SU || 0) / tN,
        snpP: (rankNoms.SNP || 0) / tN,
        t2P: (rankNoms.T2 || 0) / tN,
        at1P: (rankNoms.AT1 || 0) / tN,
        spP: (rankNoms.SP || 0) / tN,
      };
    } catch (e) { return null; }
  };

  // ── TURBO SCAN LOOP ──
  setLog("🚀 Phase 4/5 — " + N_SCAN.toLocaleString() + " Scan (Batch + 4× Turbo)...");

  const unconstrained = [];
  for (let rcIdx = 0; rcIdx < rankCombos.length; rcIdx++) {
    unconstrained.push(batchSolve(0, null, null, rcIdx));
  }
  console.log("[AutoOpt] Unconstrained pro Rang:", unconstrained.map((u, i) =>
    rankCombos[i].label + ": " + (u ? "Y=" + u.wY.toFixed(3) + " ESG=" + (u.gP*100).toFixed(0) +
    "% Dur=" + u.wD.toFixed(2) + " Rat=" + u.wLn.toFixed(2) : "infeasible")).join(" | "));

  const solvedCache = rankCombos.map(() => []);
  const MAX_CACHE_PER_RC = 150;

  const checkSolvedCache = (c) => {
    const cache = solvedCache[c.rcIdx];
    for (let j = cache.length - 1; j >= 0; j--) {
      const s = cache[j];
      const esgOk = c.esg <= 0 || (s.gP * 100) >= c.esg - 0.5;
      const durOk = c.dur === null || s.wD <= c.dur + 0.01;
      const ratOk = c.rat === null || s.wLn <= c.rat + 0.01;
      if (esgOk && durOk && ratOk) return s;
    }
    return null;
  };

  const infeasBoxes = rankCombos.map(() => []);
  const compactBoxes = (boxes) => {
    const n = boxes.length;
    if (n < 30) return boxes;
    const keep = new Uint8Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      if (!keep[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!keep[j]) continue;
        const a = boxes[i], b = boxes[j];
        if (a.esg <= b.esg && a.dur >= b.dur && a.rat >= b.rat) { keep[j] = 0; }
        else if (b.esg <= a.esg && b.dur >= a.dur && b.rat >= a.rat) { keep[i] = 0; break; }
      }
    }
    return boxes.filter((_, i) => keep[i]);
  };

  configs.sort((a, b) => {
    if (a.rcIdx !== b.rcIdx) return a.rcIdx - b.rcIdx;
    if (a.esg !== b.esg) return a.esg - b.esg;
    const aDur = a.dur === null ? 1e9 : a.dur;
    const bDur = b.dur === null ? 1e9 : b.dur;
    if (aDur !== bDur) return bDur - aDur;
    const aRat = a.rat === null ? 1e9 : a.rat;
    const bRat = b.rat === null ? 1e9 : b.rat;
    return bRat - aRat;
  });

  const feasible = [];
  let nInfeasible = 0, nCached = 0, nPruned = 0, nSolved = 0;

  for (let i = 0; i < N_SCAN; i++) {
    if (i % 500 === 0) {
      const pct = (i / N_SCAN * 100).toFixed(0);
      const elapsed = (performance.now() - t0) / 1000;
      const eta = i > 0 ? (elapsed / i * (N_SCAN - i)).toFixed(0) : "?";
      const solveRate = nSolved > 0 ? ((elapsed * 1000) / nSolved).toFixed(1) : "?";
      setLog("🚀 " + i.toLocaleString() + "/" + N_SCAN.toLocaleString() +
        " (" + pct + "%, " + nSolved + " solved " + solveRate + "ms, " +
        nCached + " cached, " + nPruned + " pruned, ~" + eta + "s)...");
      await new Promise(r => setTimeout(r, 0));
    }

    const c = configs[i];
    const cEsg = c.esg;
    const cDur = c.dur === null ? 1e9 : c.dur;
    const cRat = c.rat === null ? 1e9 : c.rat;

    const boxes = infeasBoxes[c.rcIdx];
    let pruned = false;
    for (let j = 0; j < boxes.length; j++) {
      if (cEsg >= boxes[j].esg && cDur <= boxes[j].dur && cRat <= boxes[j].rat) {
        pruned = true; break;
      }
    }
    if (pruned) { nPruned++; continue; }

    const uc = unconstrained[c.rcIdx];
    if (uc) {
      const esgOk = cEsg <= 0 || (uc.gP * 100) >= cEsg - 0.5;
      const durOk = c.dur === null || uc.wD <= c.dur + 0.01;
      const ratOk = c.rat === null || uc.wLn <= c.rat + 0.01;
      if (esgOk && durOk && ratOk) {
        feasible.push({ cfg: c, stats: uc });
        nCached++;
        continue;
      }
    }

    const cached = checkSolvedCache(c);
    if (cached) {
      feasible.push({ cfg: c, stats: cached });
      nCached++;
      continue;
    }

    const s = batchSolve(c.esg, c.dur, c.rat, c.rcIdx);
    nSolved++;
    if (s) {
      feasible.push({ cfg: c, stats: s });
      const rc = solvedCache[c.rcIdx];
      if (rc.length < MAX_CACHE_PER_RC) rc.push(s);
      else rc[Math.floor(Math.random() * MAX_CACHE_PER_RC)] = s;
    } else {
      nInfeasible++;
      infeasBoxes[c.rcIdx].push({ esg: cEsg, dur: cDur, rat: cRat });
      if (infeasBoxes[c.rcIdx].length % 80 === 0) {
        infeasBoxes[c.rcIdx] = compactBoxes(infeasBoxes[c.rcIdx]);
      }
    }
  }

  const scanElapsed = ((performance.now() - t0) / 1000).toFixed(1);
  const avgMs = nSolved > 0 ? ((performance.now() - t0) / nSolved).toFixed(2) : "?";
  console.log("[AutoOpt] Turbo-Scan fertig: " + feasible.length + "/" + N_SCAN + " feasible | " +
    nSolved + " gelöst (" + avgMs + "ms/Solve) + " + nCached + " cached + " + nPruned + " pruned + " +
    nInfeasible + " infeasible in " + scanElapsed + "s");

  if (feasible.length === 0) {
    return { p0: { result: p0Result, stats: p0S, name: "P₀ Yield-Max", icon: "📈" },
      alternatives: [], elapsed: scanElapsed,
      scanInfo: { total: N_SCAN, feasible: 0, pareto: 0, selected: 0 } };
  }

  // ═══ Constraint-Filter + Pareto + Frontier-Kurven ═══
  setLog("🚀 Phase 5/5 — Constraint-Filter, Pareto & Frontier-Kurven...");
  const pf = parsePfFlags(baseCfg);
  const minGreenBase = parseFloat(baseCfg.minGreen) || 0;
  const meetsConstraints = (s) => {
    if (pf.hasPfMinDur && s.wD < pf.pfMinDurVal - 0.01) return false;
    if (pf.hasPfMaxDur && s.wD > pf.pfMaxDurVal + 0.01) return false;
    if (pf.hasPfMinK && s.wK < pf.pfMinKVal - 0.01) return false;
    if (pf.hasPfMaxK && s.wK > pf.pfMaxKVal + 0.01) return false;
    if (pf.hasPfMinMat && s.wMat < pf.pfMinMatVal - 0.01) return false;
    if (pf.hasPfMaxMat && s.wMat > pf.pfMaxMatVal + 0.01) return false;
    if (minGreenBase > 0 && (s.gP * 100) < minGreenBase - 0.5) return false;
    return true;
  };
  const feasibleAll = feasible;
  const feasibleConstrained = feasible.filter(f => meetsConstraints(f.stats));

  console.log("[AutoOpt] Constraint-Filter: " + feasibleConstrained.length + " / " + feasible.length +
    " erfüllen User-Constraints" + (pf.hasPfMinDur ? " (pfMinDur=" + pf.pfMinDurVal + ")" : "") +
    (pf.hasPfMaxDur ? " (pfMaxDur=" + pf.pfMaxDurVal + ")" : ""));

  // ═══ NSGA-II Pareto-Filter ═══
  const paretoObjs = [
    { name: "Yield",    extract: f => f.stats.wY,          maximize: true },
    { name: "Spread",   extract: f => f.stats.wS,          maximize: true },
    { name: "ESG",      extract: f => f.stats.gP,          maximize: true },
    { name: "Rating",   extract: f => f.stats.wLn,         maximize: false },
    { name: "Duration", extract: f => f.stats.wD,          maximize: false },
  ];
  if (hasSU)  paretoObjs.push({ name: "minSU",  extract: f => f.stats.suP || 0,  maximize: false });
  if (hasSNP) paretoObjs.push({ name: "minSNP", extract: f => f.stats.snpP || 0, maximize: false });

  const pareto = nsgaIIParetoFilter(feasibleConstrained, paretoObjs, feasibleConstrained.length);
  console.log("[AutoOpt] NSGA-II Pareto (constrained): " + pareto.length + " / " + feasibleConstrained.length);

  // ═══ Frontier-Kurven aus ALLEN feasible ═══
  const buildFrontier = (xExtract, xLabel, xUnit, binSize, inverted) => {
    const points = feasibleAll.map(f => ({ x: xExtract(f.stats), y: f.stats.wY }));
    if (points.length === 0) return { line: [], cloud: [], xLabel, xUnit };
    const cloud = points.length > 1200 ? points.filter((_, i) => i % Math.ceil(points.length / 1200) === 0) : points;
    const bins = {};
    points.forEach(p => { const bk = Math.round(p.x / binSize) * binSize; if (!bins[bk] || p.y > bins[bk]) bins[bk] = p.y; });
    const line = Object.entries(bins).map(([x, y]) => ({ x: parseFloat(x), y })).sort((a, b) => inverted ? b.x - a.x : a.x - b.x);
    const envelope = [];
    let maxY = -Infinity;
    for (const p of (inverted ? [...line].reverse() : line)) { if (p.y > maxY) { maxY = p.y; envelope.push(p); } }
    if (inverted) envelope.reverse();
    return { line: envelope, cloud, xLabel, xUnit, p0x: xExtract(p0S), p0y: p0S.wY };
  };

  const frontiers = {
    esg: buildFrontier(s => s.gP * 100, "ESG-Quote", "%", 1, false),
    rating: buildFrontier(s => s.wLn, "Ø Rating", "", 0.1, true),
    duration: buildFrontier(s => s.wD, "Ø Duration", "J", 0.05, true),
  };
  if (hasSU) frontiers.su = buildFrontier(s => (s.suP || 0) * 100, "SU-Quote", "%", 1, true);
  if (hasSNP) frontiers.snp = buildFrontier(s => (s.snpP || 0) * 100, "SNP-Quote", "%", 1, true);

  // ═══ NSGA-II Diversity-Selektion → Top 50 ═══
  const MAX_ALTS = 50;
  const selected = nsgaIIParetoFilter(pareto, paretoObjs, MAX_ALTS);

  // ═══ Re-Solve: Top 14 via VOLLEM MIP ═══
  const reSolveCfg = { ...baseCfg };

  setLog("🚀 Re-Solve: " + selected.length + " Portfolios final (MIP + Lot-Sizes)...");

  console.log("[AutoOpt] HiGHS WASM Reset vor Re-Solve...");
  {
    const highs = await import('./highs.js');
    highs.highsLib = null;
    highs.highsPromise = null;
  }
  try {
    await getHighsSolver();
    console.log("[AutoOpt] HiGHS WASM frisch geladen ✓");
  } catch (e) {
    console.error("[AutoOpt] HiGHS WASM Reset fehlgeschlagen:", e);
  }

  const alternatives = [];
  let _resolveWasmResets = 0;
  let _solvesSinceReset = 0;
  const PROACTIVE_RESET_INTERVAL = 2;

  const _resetWasm = async (reason) => {
    console.log("[AutoOpt] HiGHS WASM Reset (" + reason + ")...");
    const highs = await import('./highs.js');
    highs.highsLib = null;
    highs.highsPromise = null;
    await getHighsSolver();
    _solvesSinceReset = 0;
  };

  for (const sel of selected) {
    if (_solvesSinceReset >= PROACTIVE_RESET_INTERVAL) {
      await _resetWasm("proaktiv nach " + _solvesSinceReset + " Solves");
    }

    const c = sel.cfg;
    const cfg = { ...reSolveCfg, obj: "yield" };
    if (c.esg > 0) cfg.minGreen = c.esg;
    else delete cfg.minGreen;
    if (c.dur !== null) cfg._lexCeilDuration = c.dur;
    if (c.rat !== null) cfg._lexCeilRating = c.rat;
    if (c.rcIdx > 0) cfg.rankLimits = rlCache[c.rcIdx];

    let result;
    try {
      result = await solveFn(pool, cfg);
      _solvesSinceReset++;
      if (!result || result.length === 0) {
        await _resetWasm("leeres Ergebnis, Retry #" + (++_resolveWasmResets));
        result = await solveFn(pool, cfg);
        _solvesSinceReset++;
      }
      if (!result || result.length === 0) continue;
    } catch (e) {
      try {
        await _resetWasm("Exception Retry #" + (++_resolveWasmResets));
        result = await solveFn(pool, cfg);
        _solvesSinceReset++;
        if (!result || result.length === 0) continue;
      } catch (e2) {
        if (cfg._lexCeilDuration) {
          cfg._lexCeilDuration = Math.round((cfg._lexCeilDuration + 0.01) * 100) / 100;
          console.log("[AutoOpt] LP-Perturbation: Duration → " + cfg._lexCeilDuration);
          try {
            await _resetWasm("Perturbation Retry #" + (++_resolveWasmResets));
            result = await solveFn(pool, cfg);
            _solvesSinceReset++;
            if (!result || result.length === 0) continue;
          } catch (e3) { continue; }
        } else { continue; }
      }
    }

    const ms = stats(result);
    if (!ms) continue;

    const dY = ms.wY - p0S.wY;
    const dE = (ms.gP - p0S.gP) * 100;
    const dR = ms.wLn - p0S.wLn;
    const dD = ms.wD - p0S.wD;
    const dSU = ((ms.suP || 0) - (p0S.suP || 0)) * 100;
    const dSNP = ((ms.snpP || 0) - (p0S.snpP || 0)) * 100;

    const distinct = Math.abs(dY) > 0.002 || Math.abs(dE) > 0.3 || Math.abs(dR) > 0.1 ||
      Math.abs(dD) > 0.05 || Math.abs(dSU) > 0.5 || Math.abs(dSNP) > 0.5;
    if (!distinct) continue;

    const isDup = alternatives.some(a => {
      const as = a.stats;
      return Math.abs(ms.wY - as.wY) < 0.003 && Math.abs(ms.gP - as.gP) < 0.002 &&
        Math.abs(ms.wLn - as.wLn) < 0.05 && Math.abs(ms.wD - as.wD) < 0.03;
    });
    if (isDup) continue;

    const nameParts = [], icons = [];
    if (dE > 3)    { nameParts.push("ESG+" + dE.toFixed(0)); icons.push("🌱"); }
    if (dR < -0.3) { nameParts.push("Rat+" + (-dR).toFixed(1)); icons.push("🛡️"); }
    if (dD < -0.2) { nameParts.push("Dur" + dD.toFixed(1)); icons.push("⏱️"); }
    if (dSU < -2)  { nameParts.push("SU" + dSU.toFixed(0)); icons.push("🏦"); }
    if (dSNP < -2) { nameParts.push("SNP" + dSNP.toFixed(0)); icons.push("📉"); }
    if (dY > 0.01) { nameParts.push("Y+" + (dY * 100).toFixed(0) + "bp"); icons.push("📈"); }
    const name = nameParts.length > 0 ? nameParts.join(" ") : "Alt #" + (alternatives.length + 1);
    const icon = icons.length > 0 ? icons[0] : "📊";

    const deltas = {
      yield:    { value: dY, unit: "%",  better: dY > 0 },
      esg:      { value: dE, unit: "pp", better: dE > 0 },
      rating:   { value: dR, unit: "",   better: dR < 0 },
      duration: { value: dD, unit: "J",  better: dD < 0 },
    };
    if (hasSU)  deltas.su  = { value: dSU,  unit: "pp", better: dSU < 0 };
    if (hasSNP) deltas.snp = { value: dSNP, unit: "pp", better: dSNP < 0 };

    console.log("[AutoOpt] " + name + ": Y=" + ms.wY.toFixed(3) + "% ESG=" + (ms.gP*100).toFixed(1) +
      "% Rat=" + ms.wLn.toFixed(2) + " Dur=" + ms.wD.toFixed(2) + "J");

    alternatives.push({ id: "AO_" + alternatives.length, name, icon, desc: name,
      result, stats: ms, deltas, scanCfg: sel.cfg });
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  const scanInfo = { total: N_SCAN, feasible: feasibleAll.length, constrained: feasibleConstrained.length,
    pareto: pareto.length, selected: selected.length, final: alternatives.length,
    sweeps: nFrontierSweep, lhs: nLHS, total: N_SCAN,
    solved: nSolved, cached: nCached, pruned: nPruned };
  console.log("[AutoOpt] ✅ P₀ + " + alternatives.length + " Alternativen in " + elapsed + "s | " +
    N_SCAN + " Scan → " + feasibleAll.length + " feasible → " + feasibleConstrained.length +
    " in Constraints → " + pareto.length + " Pareto");

  return {
    p0: { result: p0Result, stats: p0S, name: "P₀ Yield-Max", icon: "📈" },
    alternatives, elapsed, scanInfo, frontiers
  };
}
