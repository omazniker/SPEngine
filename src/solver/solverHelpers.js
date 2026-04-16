// Shared solver helper functions and constants
// Extracted from tests/test_lexicographic.html (various lines)
// Used by: greedy.js, lpSolver.js, mipV2.js, lexicographic.js, frontier.js, autoOptimize.js

// ── Numerische Toleranz für LP/MIP-Solver ──
export const EPSILON = 1e-6;
export const PF_AVG_SLACK = 0.01; // 1% Toleranz für Portfolio-Durchschnitts-Constraints
export const COEFF_NOISE = 1e-9; // Koeffizienten unterhalb → 0 (Matrix-Stabilität)

// ── Maturity Bucket Helper ──
export const getMatBucket = (mty) => {
  if (mty < 1) return "0-1Y"; if (mty < 2) return "1-2Y"; if (mty < 3) return "2-3Y";
  if (mty < 4) return "3-4Y"; if (mty < 5) return "4-5Y"; if (mty < 6) return "5-6Y";
  if (mty < 7) return "6-7Y"; if (mty < 8) return "7-8Y"; if (mty < 9) return "8-9Y";
  if (mty < 10) return "9-10Y"; return "10Y+";
};

// ── Region Data ──
const EWR_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE"];
const OECD_EUR_COUNTRIES = ["AT","BE","CH","CZ","DK","EE","FI","FR","DE","GR","HR","HU","IS","IE","IT","LV","LT","LU","NL","NO","PL","PT","SK","SI","ES","SE","TR","GB"];
const OECD_OTHER_COUNTRIES = ["AU","CA","CL","CO","CR","IL","JP","KR","MX","NZ"];
const CHANNEL_ISLANDS = ["GG","JE"];

export const REGION_DEFS = {
  EWR:        { label: "EWR (EU + IS/LI/NO)", countries: EWR_COUNTRIES },
  OECD_EUR:   { label: "OECD Europa (CH/GB/TR)", countries: OECD_EUR_COUNTRIES },
  USA:        { label: "USA", countries: ["US"] },
  OECD_OTHER: { label: "OECD Sonstige (JP/CA/AU/...)", countries: OECD_OTHER_COUNTRIES },
  CH_ISLANDS: { label: "Kanalinseln (GG/JE)", countries: CHANNEL_ISLANDS },
};

export function resolveAllowedCountries(regions) {
  if (!regions || regions.length === 0) return null; // null = kein Regionenfilter aktiv
  const s = new Set();
  regions.forEach(r => { const d = REGION_DEFS[r]; if (d) d.countries.forEach(c => s.add(c)); });
  return s;
}

// ── Category Helpers ──
export function catEnabled(limits, cat) {
  const v = limits?.[cat];
  if (!v) return true;
  if (typeof v === 'object') return v.enabled !== false;
  return v !== 0;
}

export function catMinMax(limits, cat) {
  const v = limits?.[cat];
  if (!v || typeof v !== 'object') return { min: null, max: (typeof v === 'number' && v < 100) ? v : null };
  const mn = v.min !== "" && v.min != null ? parseFloat(v.min) : null;
  const mx = v.max !== "" && v.max != null ? parseFloat(v.max) : null;
  return { min: isNaN(mn) ? null : mn, max: isNaN(mx) ? null : mx };
}

// ── Latin Hypercube Sampling ──
export function latinHypercubeSampling(n, dimensions, seed = 42) {
  const D = dimensions.length;
  let _s = seed;
  function rand() { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const perms = Array.from({ length: D }, () => shuffle(Array.from({ length: n }, (_, i) => i)));
  return Array.from({ length: n }, (_, i) => {
    const s = {};
    for (let d = 0; d < D; d++) {
      const dim = dimensions[d];
      let v = dim.min + ((perms[d][i] + rand()) / n) * (dim.max - dim.min);
      if (dim.step) v = Math.max(dim.min, Math.min(dim.max, Math.round(v / dim.step) * dim.step));
      if (dim.discrete) v = Math.round(v);
      s[dim.name] = parseFloat(v.toFixed(6));
    }
    return s;
  });
}

// ── NSGA-II Non-Dominated Sorting + Crowding Distance ──
export function nsgaIIParetoFilter(population, objectives, maxSelect) {
  const n = population.length, m = objectives.length;
  if (n <= maxSelect) return [...population];
  const vals = population.map(p => objectives.map(obj => obj.maximize ? obj.extract(p) : -obj.extract(p)));
  const domCount = new Int32Array(n), domSet = Array.from({ length: n }, () => []), rank = new Int32Array(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let iDj = true, jDi = true, iB = false, jB = false;
    for (let k = 0; k < m; k++) { const d = vals[i][k] - vals[j][k]; if (d < -1e-9) { iDj = false; jB = true; } if (d > 1e-9) { jDi = false; iB = true; } }
    if (iDj && iB) { domSet[i].push(j); domCount[j]++; } else if (jDi && jB) { domSet[j].push(i); domCount[i]++; }
  }
  const fronts = []; let cur = [];
  for (let i = 0; i < n; i++) if (domCount[i] === 0) { rank[i] = 0; cur.push(i); }
  let fi = 0;
  while (cur.length) { fronts.push(cur); const nx = []; for (const i of cur) for (const j of domSet[i]) { domCount[j]--; if (domCount[j] === 0) { rank[j] = fi + 1; nx.push(j); } } cur = nx; fi++; }
  const cd = new Float64Array(n);
  for (const f of fronts) {
    if (f.length <= 2) { for (const i of f) cd[i] = Infinity; continue; }
    for (let k = 0; k < m; k++) {
      f.sort((a, b) => vals[a][k] - vals[b][k]);
      cd[f[0]] = Infinity; cd[f[f.length - 1]] = Infinity;
      const rng = vals[f[f.length - 1]][k] - vals[f[0]][k]; if (rng < 1e-12) continue;
      for (let p = 1; p < f.length - 1; p++) cd[f[p]] += (vals[f[p + 1]][k] - vals[f[p - 1]][k]) / rng;
    }
  }
  const sel = [];
  for (const f of fronts) { if (sel.length + f.length <= maxSelect) { for (const i of f) sel.push(population[i]); } else { const rem = maxSelect - sel.length; f.sort((a, b) => cd[b] - cd[a]); for (let p = 0; p < rem && p < f.length; p++) sel.push(population[f[p]]); break; } }
  return sel;
}

// ── Duration-Matching LP Constraints ──
export function buildDurationMatchingConstraints(el, target, tolerance, budget, S, coeffNoise = 1e-9) {
  const fc = v => v.toFixed(9), cs = [], rhs = fc(tolerance * budget / S);
  let lo = "  c_durMatch_lo:", hi = "  c_durMatch_hi:", has = false;
  for (let i = 0; i < el.length; i++) { const c = (el[i].md || 0) - target; if (Math.abs(c) > coeffNoise) { const t = c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; lo += t; hi += t; has = true; } }
  if (has) { cs.push(lo + ` >= -${rhs}`); cs.push(hi + ` <= ${rhs}`); }
  return cs;
}

// ── Portfolio Statistics ──
export function stats(pf) {
  if (!pf || !pf.length) return null;
  const tN = pf.reduce((a, b) => a + (b.nom || 0), 0);
  if (!tN) return null;
  const w = f => tN > 0 ? pf.reduce((a, b) => a + (b[f] || 0) * ((b.nom || 0) / tN), 0) : 0;
  const gN = pf.filter(b => b.g === 1).reduce((a, b) => a + (b.nom || 0), 0);
  const bN = pf.filter(b => b.ln >= 8 && b.ln < 99).reduce((a, b) => a + (b.nom || 0), 0);
  const tRWA = pf.reduce((a, b) => a + (b.nom || 0) * ((b.rw || 0) / 100) * 0.08, 0);
  const ic = {}; const icMap = {};
  pf.forEach(b => { ic[b.e] = (ic[b.e] || 0) + (b.nom || 0); if(!icMap[b.e]) icMap[b.e] = b.co; });
  const cc = {}; pf.forEach(b => { cc[b.co] = (cc[b.co] || 0) + (b.nom || 0); });
  const bc = {}; pf.forEach(b => { bc[b.bkt] = (bc[b.bkt] || 0) + (b.nom || 0); });
  const rc = {}; pf.forEach(b => { rc[b.lo] = (rc[b.lo] || 0) + (b.nom || 0); });
  const rkc = {};
  pf.forEach(b => { rkc[b.rank || "SP"] = (rkc[b.rank || "SP"] || 0) + (b.nom || 0); });
  const spN = pf.filter(b => (b.rank || "SP") === "SP").reduce((a, b2) => a + (b2.nom || 0), 0);
  const snpN = pf.filter(b => (b.rank || "SP") === "SNP").reduce((a, b2) => a + (b2.nom || 0), 0);
  const suN = pf.filter(b => b.rank === "SU").reduce((a, b2) => a + (b2.nom || 0), 0);
  const secN = pf.filter(b => b.rank === "SEC").reduce((a, b2) => a + (b2.nom || 0), 0);
  const t2N = pf.filter(b => b.rank === "T2").reduce((a, b2) => a + (b2.nom || 0), 0);
  const at1N = pf.filter(b => b.rank === "AT1").reduce((a, b2) => a + (b2.nom || 0), 0);
  const callN = pf.filter(b => b.callable && !b.perpetual).reduce((a, b) => a + (b.nom || 0), 0);
  const perpN = pf.filter(b => b.perpetual).reduce((a, b) => a + (b.nom || 0), 0);
  const bullN = tN - callN - perpN;
  const fixN = pf.filter(b => (b.kpnTyp || "FIXED") === "FIXED").reduce((a, b) => a + (b.nom || 0), 0);
  const varN = pf.filter(b => b.kpnTyp === "VARIABLE").reduce((a, b) => a + (b.nom || 0), 0);
  const zeroN = pf.filter(b => b.kpnTyp === "ZERO COUPON").reduce((a, b) => a + (b.nom || 0), 0);
  const banksN = pf.filter(b => b.sektor === "BANKS").reduce((a, b) => a + (b.nom || 0), 0);
  const insN = pf.filter(b => b.sektor === "INSURANCE").reduce((a, b) => a + (b.nom || 0), 0);
  const finN = pf.filter(b => b.sektor === "FINANCIALS").reduce((a, b) => a + (b.nom || 0), 0);
  const reitsN = pf.filter(b => b.sektor === "REITS").reduce((a, b) => a + (b.nom || 0), 0);
  const otherN = pf.filter(b => (b.sektor || "OTHER") === "OTHER").reduce((a, b) => a + (b.nom || 0), 0);
  const sc = {}; pf.forEach(b => { const sek = b.sektor || "OTHER"; sc[sek] = (sc[sek] || 0) + (b.nom || 0); });
  const wR = w("rw");
  const ratedPf = pf.filter(b => b.ln < 99);
  const ratedN = ratedPf.reduce((a, b) => a + (b.nom || 0), 0);
  const wLn = ratedN > 0 ? ratedPf.reduce((a, b) => a + b.ln * ((b.nom || 0) / ratedN), 0) : 0;
  const wY = w("y"), wD = w("md");
  const yDur = wD > 0.01 ? wY / wD : 0;
  const wMacD = tN > 0 ? pf.reduce((a, b) => a + ((b.md || 0) * (1 + (b.y || 0) / 100)) * ((b.nom || 0) / tN), 0) : 0;
  const numV = (arr, f) => arr.map(b => b[f]).filter(v => v != null && !isNaN(v));
  const minY = tN > 0 ? Math.min(...(numV(pf,'y').length ? numV(pf,'y') : [0])) : 0;
  const maxY = tN > 0 ? Math.max(...(numV(pf,'y').length ? numV(pf,'y') : [0])) : 0;
  const minK = tN > 0 ? Math.min(...(numV(pf,'k').length ? numV(pf,'k') : [0])) : 0;
  const maxK = tN > 0 ? Math.max(...(numV(pf,'k').length ? numV(pf,'k') : [0])) : 0;
  const minS = tN > 0 ? Math.min(...(numV(pf,'s').length ? numV(pf,'s') : [0])) : 0;
  const maxS = tN > 0 ? Math.max(...(numV(pf,'s').length ? numV(pf,'s') : [0])) : 0;
  const minD = tN > 0 ? Math.min(...(numV(pf,'md').length ? numV(pf,'md') : [0])) : 0;
  const maxD = tN > 0 ? Math.max(...(numV(pf,'md').length ? numV(pf,'md') : [0])) : 0;
  const minPx = tN > 0 ? Math.min(...(numV(pf,'px').length ? numV(pf,'px') : [0])) : 0;
  const maxPx = tN > 0 ? Math.max(...(numV(pf,'px').length ? numV(pf,'px') : [0])) : 0;
  const minM = tN > 0 ? Math.min(...(numV(pf,'mty').length ? numV(pf,'mty') : [0])) : 0;
  const maxM = tN > 0 ? Math.max(...(numV(pf,'mty').length ? numV(pf,'mty') : [0])) : 0;
  return {
    tN, tRWA, wS: w("s"), wY: w("y"), wK: w("k"), wM: w("mty"), wD: w("md"), wR, wL: w("lqa"), wPx: w("px"),
    wLn, yDur, wMacD, minY, maxY, minK, maxK, minS, maxS, minD, maxD, minPx, maxPx, minM, maxM,
    gN, gP: tN > 0 ? gN / tN : 0, bN, bP: tN > 0 ? bN / tN : 0, r20P: tN > 0 ? pf.filter(b => b.rw === 20).reduce((a, b) => a + (b.nom || 0), 0) / tN : 0,
    yRw: tN > 0 ? pf.reduce((a, b) => a + (b.yRw || 0) * ((b.nom || 0) / tN), 0) : 0,
    sRw: tN > 0 ? pf.reduce((a, b) => a + (b.sRw || 0) * ((b.nom || 0) / tN), 0) : 0,
    ic, icMap, cc, bc, rc, nb: pf.length, ni: Object.keys(ic).length,
    rkc,
    spN,
    snpN,
    suN,
    secN,
    spP: tN > 0 ? spN / tN : 0,
    snpP: tN > 0 ? snpN / tN : 0,
    suP: tN > 0 ? suN / tN : 0,
    secP: tN > 0 ? secN / tN : 0,
    callN,
    bullN,
    t2N, at1N,
    t2P: tN > 0 ? t2N / tN : 0,
    at1P: tN > 0 ? at1N / tN : 0,
    callP: tN > 0 ? callN / tN : 0,
    perpN,
    perpP: tN > 0 ? perpN / tN : 0,
    bullP: tN > 0 ? bullN / tN : 0,
    fixN, varN, zeroN,
    fixP: tN > 0 ? fixN / tN : 0,
    varP: tN > 0 ? varN / tN : 0,
    zeroP: tN > 0 ? zeroN / tN : 0,
    banksN, insN, finN, reitsN, otherN, sc,
    banksP: tN > 0 ? banksN / tN : 0,
    insP: tN > 0 ? insN / tN : 0,
    finP: tN > 0 ? finN / tN : 0,
    reitsP: tN > 0 ? reitsN / tN : 0,
    otherP: tN > 0 ? otherN / tN : 0,
    nomStats: (() => {
      const noms = pf.map(b => b.nom || 0).filter(v => v > 0).sort((a, b) => a - b);
      const n = noms.length;
      if (n === 0) return { min: 0, max: 0, med: 0, avg: 0 };
      const med = n % 2 === 1 ? noms[Math.floor(n / 2)] : (noms[n / 2 - 1] + noms[n / 2]) / 2;
      return { min: noms[0], max: noms[n - 1], med, avg: noms.reduce((a, b) => a + b, 0) / n };
    })()
  };
}

// ── Base Score Function ──
export function baseScoreFn(obj) {
  return b => {
    if (obj === "yield") return b.y; if (obj === "coupon") return b.k; if (obj === "spread") return b.s;
    if (obj === "retRW") return b.yRw; if (obj === "sprRW") return b.sRw;
    if (obj === "retPVBP") return b.md > 0 ? b.y / b.md : 0;
    if (obj === "_maxEsg") return b.g === 1 ? 1 : 0;
    // Min-Objectives: negiert → Maximize(-x) = Minimize(x)
    if (obj === "minDuration") return -(b.md || 0);
    if (obj === "minRating") return -(b.ln || 99); // niedrig = besser
    if (obj === "maxEsg") return b.g === 1 ? 1 : 0;
    return b.y * 0.35 + (b.s / 100) * 0.25 + b.yRw * 0.2 + (b.lqa / 100) * 0.2;
  };
}

// ── Filter Eligible Bonds from Pool ──
export function filterEligible(pool, cfg) {
  const { rankLimits, strukturLimits, kuponLimits, sektorLimits,
    minRatingLn = "", ratingLimits, minLQA = 0, excludedIssuers = [], excludedCountries = [],
    durMin, durMax, matMin, matMax, optMinK, optMaxK, optMinPx, optMaxPx, optMinY, optMaxY,
    allowedRegions = [], allowedCurrencies = [], blockedIssuers = [], isinExceptions = [],
    requireDualRating = false, requireRating = false, minEmissionRatingLn = "",
    allowedIssuers = [] } = cfg;

  const allowedCoSet = resolveAllowedCountries(allowedRegions);
  const exceptionIsins = new Set((isinExceptions || []).map(x => x.isin));
  const allBlocked = new Set([...excludedIssuers, ...blockedIssuers]);
  const blockedWithExceptions = new Map();
  (isinExceptions || []).forEach(ex => {
    if (!blockedWithExceptions.has(ex.ticker)) blockedWithExceptions.set(ex.ticker, new Set());
    blockedWithExceptions.get(ex.ticker).add(ex.isin);
  });

  return pool.filter(b => {
    const isin = b.isin || "";
    const isException = exceptionIsins.has(isin);

    if (!isException && rankLimits && !catEnabled(rankLimits, b.rank || "SP")) return false;
    if (!isException && strukturLimits && !catEnabled(strukturLimits, b.matTyp || "BULLET")) return false;
    if (!isException && kuponLimits && !catEnabled(kuponLimits, b.kpnTyp || "FIXED")) return false;
    if (!isException && sektorLimits && !catEnabled(sektorLimits, b.sektor || "OTHER")) return false;

    if (allBlocked.has(b.t)) {
      const allowedForTicker = blockedWithExceptions.get(b.t);
      if (!allowedForTicker || !allowedForTicker.has(isin)) return false;
    }

    const minRtgV = minRatingLn !== "" && !isNaN(parseInt(minRatingLn)) ? parseInt(minRatingLn) : null;
    if (minRtgV !== null && (b.ln || 99) > minRtgV) return false;
    if (ratingLimits && !catEnabled(ratingLimits, b.lo)) return false;

    if (requireRating) {
      const hasMo = b.mo && b.mo !== "NR";
      const hasSp = b.sp && b.sp !== "NR";
      if (!hasMo && !hasSp) return false;
    }

    if (allowedCoSet && !allowedCoSet.has(b.co)) return false;

    if (allowedCurrencies && allowedCurrencies.length > 0) {
      if (!allowedCurrencies.includes(b.waeh || "EUR")) return false;
    }

    if (minLQA > 0 && (b.lqa == null || b.lqa < minLQA)) return false;

    if (excludedIssuers.length > 0 && excludedIssuers.includes(b.t) && !exceptionIsins.has(isin)) return false;
    if (excludedCountries.length > 0 && excludedCountries.includes(b.co)) return false;

    if (allowedIssuers.length > 0 && !allowedIssuers.includes(b.t) && !exceptionIsins.has(isin)) return false;

    const durMinV = durMin !== null && durMin !== "" ? parseFloat(durMin) : NaN;
    const durMaxV = durMax !== null && durMax !== "" ? parseFloat(durMax) : NaN;
    if (!isNaN(durMinV) && b.md < durMinV) return false;
    if (!isNaN(durMaxV) && b.md > durMaxV) return false;
    const matMinV = matMin !== null && matMin !== "" ? parseFloat(matMin) : NaN;
    const matMaxV = matMax !== null && matMax !== "" ? parseFloat(matMax) : NaN;
    if (!isNaN(matMinV) && b.mty < matMinV) return false;
    if (!isNaN(matMaxV) && b.mty > matMaxV) return false;
    const minKV = optMinK !== null && optMinK !== "" ? parseFloat(optMinK) : NaN;
    const maxKV = optMaxK !== null && optMaxK !== "" ? parseFloat(optMaxK) : NaN;
    if (!isNaN(minKV) && b.k < minKV) return false;
    if (!isNaN(maxKV) && b.k > maxKV) return false;
    const minPxV = optMinPx !== null && optMinPx !== "" ? parseFloat(optMinPx) : NaN;
    const maxPxV = optMaxPx !== null && optMaxPx !== "" ? parseFloat(optMaxPx) : NaN;
    if (!isNaN(minPxV) && (b.px == null || b.px < minPxV)) return false;
    if (!isNaN(maxPxV) && (b.px == null || b.px > maxPxV)) return false;
    const minYV = optMinY !== null && optMinY !== "" && optMinY !== undefined ? parseFloat(optMinY) : NaN;
    const maxYV = optMaxY !== null && optMaxY !== "" && optMaxY !== undefined ? parseFloat(optMaxY) : NaN;
    if (!isNaN(minYV) && (b.y == null || b.y < minYV)) return false;
    if (!isNaN(maxYV) && (b.y == null || b.y > maxYV)) return false;
    return true;
  });
}

// ── Compute Rank-Proportional Bond Caps ──
export function computeRankCaps(el, scoreFn, minNom, maxNom) {
  const scored = [...el].map(b => ({ bond: b, score: scoreFn(b) })).sort((a, b) => b.score - a.score);
  const n = scored.length;
  const caps = new Map();
  scored.forEach(({ bond }, idx) => {
    const rankNorm = n > 1 ? 1 - (idx / (n - 1)) : 1;
    caps.set(bond.id, minNom + rankNorm * (maxNom - minNom));
  });
  return { scored, caps };
}

// ── Parse Portfolio-Level Average Constraint Flags ──
export function parsePfFlags(cfg) {
  const { pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinDur, pfMaxDur, pfMinMat, pfMaxMat, pfMinY, pfMaxY } = cfg;
  const pv = v => v !== null && v !== "" && v !== undefined && !isNaN(parseFloat(v));
  const hasPfMinK = pv(pfMinK), hasPfMaxK = pv(pfMaxK);
  const hasPfMinPx = pv(pfMinPx), hasPfMaxPx = pv(pfMaxPx);
  const hasPfMinDur = pv(pfMinDur), hasPfMaxDur = pv(pfMaxDur);
  const hasPfMinMat = pv(pfMinMat), hasPfMaxMat = pv(pfMaxMat);
  const hasPfMinY = pv(pfMinY), hasPfMaxY = pv(pfMaxY);
  return {
    hasPfMinK, hasPfMaxK, hasPfMinPx, hasPfMaxPx, hasPfMinDur, hasPfMaxDur, hasPfMinMat, hasPfMaxMat, hasPfMinY, hasPfMaxY,
    pfMinKVal: hasPfMinK ? parseFloat(pfMinK) : null,
    pfMaxKVal: hasPfMaxK ? parseFloat(pfMaxK) : null,
    pfMinPxVal: hasPfMinPx ? parseFloat(pfMinPx) : null,
    pfMaxPxVal: hasPfMaxPx ? parseFloat(pfMaxPx) : null,
    pfMinDurVal: hasPfMinDur ? parseFloat(pfMinDur) : null,
    pfMaxDurVal: hasPfMaxDur ? parseFloat(pfMaxDur) : null,
    pfMinMatVal: hasPfMinMat ? parseFloat(pfMinMat) : null,
    pfMaxMatVal: hasPfMaxMat ? parseFloat(pfMaxMat) : null,
    pfMinYVal: hasPfMinY ? parseFloat(pfMinY) : null,
    pfMaxYVal: hasPfMaxY ? parseFloat(pfMaxY) : null,
    hasAny: hasPfMinK || hasPfMaxK || hasPfMinPx || hasPfMaxPx || hasPfMinDur || hasPfMaxDur || hasPfMinMat || hasPfMaxMat || hasPfMinY || hasPfMaxY
  };
}

// ── Check Duration/Maturity/Kupon/Price Constraint Conflicts ──
export function checkDurationConflict(cfg, label) {
  const { durMin, durMax, pfMinDur, pfMaxDur, matMin, matMax, pfMinMat, pfMaxMat,
          pfMinK, pfMaxK, pfMinPx, pfMaxPx } = cfg;
  const pn = v => v !== null && v !== undefined && v !== "" ? parseFloat(v) : NaN;
  const durMinV = pn(durMin), durMaxV = pn(durMax), pfMinDurV = pn(pfMinDur), pfMaxDurV = pn(pfMaxDur);
  const matMinV = pn(matMin), matMaxV = pn(matMax), pfMinMatV = pn(pfMinMat), pfMaxMatV = pn(pfMaxMat);
  const pfMinKV = pn(pfMinK), pfMaxKV = pn(pfMaxK), pfMinPxV = pn(pfMinPx), pfMaxPxV = pn(pfMaxPx);
  const conflicts = [];
  if (!isNaN(durMinV) && !isNaN(pfMaxDurV) && durMinV > pfMaxDurV)
    conflicts.push("durMin(" + durMinV + ") > pfMaxDur(" + pfMaxDurV + ")");
  if (!isNaN(durMaxV) && !isNaN(pfMinDurV) && durMaxV < pfMinDurV)
    conflicts.push("durMax(" + durMaxV + ") < pfMinDur(" + pfMinDurV + ")");
  if (!isNaN(pfMinDurV) && !isNaN(pfMaxDurV) && pfMinDurV > pfMaxDurV)
    conflicts.push("pfMinDur(" + pfMinDurV + ") > pfMaxDur(" + pfMaxDurV + ")");
  if (!isNaN(matMinV) && !isNaN(pfMaxMatV) && matMinV > pfMaxMatV)
    conflicts.push("matMin(" + matMinV + ") > pfMaxMat(" + pfMaxMatV + ")");
  if (!isNaN(matMaxV) && !isNaN(pfMinMatV) && matMaxV < pfMinMatV)
    conflicts.push("matMax(" + matMaxV + ") < pfMinMat(" + pfMinMatV + ")");
  if (!isNaN(pfMinMatV) && !isNaN(pfMaxMatV) && pfMinMatV > pfMaxMatV)
    conflicts.push("pfMinMat(" + pfMinMatV + ") > pfMaxMat(" + pfMaxMatV + ")");
  if (!isNaN(pfMinKV) && !isNaN(pfMaxKV) && pfMinKV > pfMaxKV)
    conflicts.push("pfMinK(" + pfMinKV + ") > pfMaxK(" + pfMaxKV + ")");
  if (!isNaN(pfMinPxV) && !isNaN(pfMaxPxV) && pfMinPxV > pfMaxPxV)
    conflicts.push("pfMinPx(" + pfMinPxV + ") > pfMaxPx(" + pfMaxPxV + ")");
  if (conflicts.length > 0) {
    console.warn("[" + label + "] Constraint-Widersprüche: " + conflicts.join("; "));
    return true;
  }
  return false;
}

// ── Prepare Locked Bond Map ──
export function prepLockedBonds(el, pool, lockedBonds, cfg) {
  const lockedMap = new Map();
  const minNom = parseFloat(cfg && cfg.minBondNom) || 0;
  const lotSize = parseFloat(cfg && cfg.minLot) || 0;
  lockedBonds.forEach(lb => {
    if (lb.nom <= 0) return;
    if (minNom > 0 && lb.nom < minNom - 0.01) {
      console.warn("[prepLocked] Bestand " + (lb.isin || "?") + " nom=" + (lb.nom || 0).toFixed(2) + " < minBondNom=" + minNom + " — wird trotzdem übernommen");
    }
    if (lotSize > 0 && lb.nom && Math.abs(lb.nom - Math.round(lb.nom / lotSize) * lotSize) > 0.01) {
      console.warn("[prepLocked] Bestand " + (lb.isin || "?") + " nom=" + (lb.nom || 0).toFixed(2) + " ist kein Vielfaches von lotSize=" + lotSize);
    }
    lockedMap.set(lb.isin, lb.nom);
  });
  lockedBonds.forEach(lb => {
    if (lb.nom <= 0) return;
    if (!el.find(b => b.isin === lb.isin)) {
      const poolBond = pool.find(b => b.isin === lb.isin);
      if (poolBond) el.push(poolBond);
    }
  });
  return lockedMap;
}

// ── Validate Locked Bonds Against Issuer/Country/Category Limits ──
export function validateLockedVsLimits(el, lockedMap, effectiveBudget, maxIssNominal, coLimit, label, cfg) {
  const warnings = [];
  const lockedTotal = [...lockedMap.values()].reduce((a, v) => a + v, 0);
  if (lockedTotal > effectiveBudget) {
    console.warn("[" + label + "] Bestand (" + lockedTotal.toFixed(1) + " Mio. €) übersteigt Budget (" + effectiveBudget + " Mio. €) — infeasible");
    return false;
  }
  const lockedByCo = {};
  el.forEach(b => { if (lockedMap.has(b.isin)) lockedByCo[b.co] = (lockedByCo[b.co] || 0) + lockedMap.get(b.isin); });
  for (const [co, nom] of Object.entries(lockedByCo)) {
    if (nom > coLimit) { console.warn("[" + label + "] Bestand in " + co + " (" + nom.toFixed(1) + ") > Länderlimit (" + coLimit.toFixed(1) + ") — infeasible"); return false; }
  }
  const lockedByIss = {};
  el.forEach(b => { if (lockedMap.has(b.isin)) lockedByIss[b.t] = (lockedByIss[b.t] || 0) + lockedMap.get(b.isin); });
  for (const [t, nom] of Object.entries(lockedByIss)) {
    if (nom > maxIssNominal) { console.warn("[" + label + "] Bestand für " + t + " (" + nom.toFixed(1) + ") > Emittentenlimit (" + maxIssNominal + ") — infeasible"); return false; }
  }
  if (cfg && lockedTotal > 0) {
    const { ratingLimits, rankLimits, sektorLimits } = cfg;
    const lockedByRtg = {}, lockedByRank = {}, lockedBySek = {};
    el.forEach(b => {
      if (!lockedMap.has(b.isin)) return;
      const nom = lockedMap.get(b.isin);
      const rtg = b.lo || "NR"; lockedByRtg[rtg] = (lockedByRtg[rtg] || 0) + nom;
      const rank = b.rank || "SP"; lockedByRank[rank] = (lockedByRank[rank] || 0) + nom;
      const sek = b.sektor || "OTHER"; lockedBySek[sek] = (lockedBySek[sek] || 0) + nom;
    });
    if (ratingLimits) {
      const rtgUnit = cfg.ratingLimitUnit || "pct";
      for (const [rtg, nom] of Object.entries(lockedByRtg)) {
        const lim = ratingLimits[rtg];
        if (lim && lim.max && lim.max !== "") {
          const maxAmt = rtgUnit === "mio" ? parseFloat(lim.max) : effectiveBudget * (parseFloat(lim.max) / 100);
          if (nom > maxAmt + 0.01) warnings.push("Rating " + rtg + ": Bestand " + nom.toFixed(1) + "M > Max " + maxAmt.toFixed(1) + "M");
        }
      }
    }
    if (rankLimits) {
      const rkUnit = cfg.rankLimitUnit || "pct";
      for (const [rank, nom] of Object.entries(lockedByRank)) {
        const lim = rankLimits[rank];
        if (lim && lim.max && lim.max !== "") {
          const maxAmt = rkUnit === "mio" ? parseFloat(lim.max) : effectiveBudget * (parseFloat(lim.max) / 100);
          if (nom > maxAmt + 0.01) warnings.push("Rang " + rank + ": Bestand " + nom.toFixed(1) + "M > Max " + maxAmt.toFixed(1) + "M");
        }
      }
    }
    const { strukturLimits, kuponLimits } = cfg;
    el.forEach(b => {
      if (!lockedMap.has(b.isin)) return;
      const isin = b.isin;
      if (rankLimits && !catEnabled(rankLimits, b.rank || "SP"))
        warnings.push("Rang " + (b.rank || "SP") + " deaktiviert, aber Bestand " + isin + " ist darin");
      if (strukturLimits && !catEnabled(strukturLimits, b.matTyp || "BULLET"))
        warnings.push("Struktur " + (b.matTyp || "BULLET") + " deaktiviert, aber Bestand " + isin + " ist darin");
      if (kuponLimits && !catEnabled(kuponLimits, b.kpnTyp || "FIXED"))
        warnings.push("Kupontyp " + (b.kpnTyp || "FIXED") + " deaktiviert, aber Bestand " + isin + " ist darin");
      if (sektorLimits && !catEnabled(sektorLimits, b.sektor || "OTHER"))
        warnings.push("Sektor " + (b.sektor || "OTHER") + " deaktiviert, aber Bestand " + isin + " ist darin");
      if (ratingLimits && !catEnabled(ratingLimits, b.lo || "NR"))
        warnings.push("Rating " + (b.lo || "NR") + " deaktiviert, aber Bestand " + isin + " ist darin");
    });
    if (warnings.length > 0) {
      console.warn("[" + label + "] Bestand verletzt Kategorie-Limits: " + warnings.join("; "));
    }
  }
  return true;
}

// ── Compute Budget Floor Based on Pool Capacity ──
export function computeBudgetFloor(el, lockedMap, caps, effectiveBudget, maxIssNominal, coLimit, maxNom, label, cfg) {
  const lockedTotal = [...lockedMap.values()].reduce((a, v) => a + v, 0);
  const minNom = parseFloat(cfg && cfg.minBondNom) || 0;
  const issuers = [...new Set(el.map(b => b.t))];
  const countries = [...new Set(el.map(b => b.co))];
  let actualCapBonds = lockedTotal;
  let nUnlocked = 0;
  el.forEach(b => {
    if (!lockedMap.has(b.isin)) {
      actualCapBonds += (caps.get(b.id) || maxNom);
      nUnlocked++;
    }
  });
  let actualCapIss = 0;
  issuers.forEach(t => {
    const issuerCaps = el.filter(b => b.t === t && !lockedMap.has(b.isin)).reduce((s, b) => s + (caps.get(b.id) || maxNom), 0);
    const issuerLocked = el.filter(b => b.t === t && lockedMap.has(b.isin)).reduce((s, b) => s + lockedMap.get(b.isin), 0);
    actualCapIss += Math.min(maxIssNominal, issuerCaps + issuerLocked);
  });
  let actualCapCo = 0;
  countries.forEach(co => {
    const coCaps = el.filter(b => b.co === co && !lockedMap.has(b.isin)).reduce((s, b) => s + (caps.get(b.id) || maxNom), 0);
    const coLocked = el.filter(b => b.co === co && lockedMap.has(b.isin)).reduce((s, b) => s + lockedMap.get(b.isin), 0);
    actualCapCo += Math.min(coLimit, coCaps + coLocked);
  });
  const maxFillByMinNom = minNom > 0 ? lockedTotal + nUnlocked * maxNom : Infinity;
  const maxCap = Math.min(actualCapIss, actualCapCo, actualCapBonds, maxFillByMinNom, effectiveBudget);
  const floor = Math.min(effectiveBudget * 0.97, maxCap * 0.90);
  console.log("[" + label + "] Kapazität: Bonds=" + actualCapBonds.toFixed(0) + " Iss=" + actualCapIss.toFixed(0) +
    " Co=" + actualCapCo.toFixed(0) + " minNomCap=" + (maxFillByMinNom === Infinity ? "∞" : maxFillByMinNom.toFixed(0)) +
    " → maxCap=" + maxCap.toFixed(0) + " Floor=" + floor.toFixed(0));
  return { floor, maxCap };
}

// ── Validate Final Portfolio Solution ──
export function validateSolution(pf, cfg) {
  const violations = [];
  const budget = cfg.budget;
  const total = pf.reduce((a, b) => a + b.nom, 0);
  const minNom = parseFloat(cfg.minBondNom) || 0;
  const maxNom = Math.max(0, cfg.maxBondNom);
  const lotSize = parseFloat(cfg.minLot) || 0;
  const coLimitUnitV = cfg.countryLimitUnit || "pct";
  const coLimit = coLimitUnitV === "mio" ? Math.max(0, parseFloat(cfg.maxCo) || 0) : budget * (Math.max(0, cfg.maxCo) / 100);

  if (total > budget + 0.01) violations.push({ type: "budget_over", actual: total, limit: budget });
  if (total < budget * 0.95 - 0.01) violations.push({ type: "budget_under", actual: total, limit: budget * 0.95 });

  const exMaxNoms = new Map();
  if (cfg.isinExceptions && cfg.isinExceptions.length) {
    cfg.isinExceptions.filter(x => x.maxNom > 0).forEach(x => exMaxNoms.set(x.isin, x.maxNom));
  }
  pf.forEach(b => {
    if (b.locked) return;
    const effMax = exMaxNoms.has(b.isin) ? Math.min(maxNom, exMaxNoms.get(b.isin)) : maxNom;
    if (b.nom > effMax + 0.01) violations.push({ type: "bond_over_max", bond: b.isin, actual: b.nom, limit: effMax });
    if (b.nom < minNom - 0.01 && b.nom > 0) violations.push({ type: "bond_under_min", bond: b.isin, actual: b.nom, limit: minNom });
    if (lotSize > 0) {
      const rem = b.nom % lotSize;
      if (rem > 0.01 && Math.abs(rem - lotSize) > 0.01) violations.push({ type: "lot_violation", bond: b.isin, actual: b.nom, lot: lotSize });
    }
  });

  const issTots = {};
  pf.forEach(b => { issTots[b.t] = (issTots[b.t] || 0) + b.nom; });
  Object.entries(issTots).forEach(([t, nom]) => {
    if (nom > cfg.maxIssNominal + 0.01) violations.push({ type: "issuer_over", issuer: t, actual: nom, limit: cfg.maxIssNominal });
  });

  const coTots = {};
  pf.forEach(b => { coTots[b.co] = (coTots[b.co] || 0) + b.nom; });
  Object.entries(coTots).forEach(([co, nom]) => {
    if (nom > coLimit + 0.01) violations.push({ type: "country_over", country: co, actual: nom, limit: coLimit });
  });

  const pfFlags = parsePfFlags(cfg);
  const avg = (field) => total > 0 ? pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / total : 0;
  if (pfFlags.hasPfMaxDur && avg("md") > pfFlags.pfMaxDurVal + 0.01)
    violations.push({ type: "avg_over", field: "duration", actual: avg("md"), limit: pfFlags.pfMaxDurVal });
  if (pfFlags.hasPfMinDur && avg("md") < pfFlags.pfMinDurVal - 0.01)
    violations.push({ type: "avg_under", field: "duration", actual: avg("md"), limit: pfFlags.pfMinDurVal });
  if (pfFlags.hasPfMaxPx && avg("px") > pfFlags.pfMaxPxVal + 0.01)
    violations.push({ type: "avg_over", field: "price", actual: avg("px"), limit: pfFlags.pfMaxPxVal });
  if (pfFlags.hasPfMinPx && avg("px") < pfFlags.pfMinPxVal - 0.01)
    violations.push({ type: "avg_under", field: "price", actual: avg("px"), limit: pfFlags.pfMinPxVal });
  if (pfFlags.hasPfMaxK && avg("k") > pfFlags.pfMaxKVal + 0.01)
    violations.push({ type: "avg_over", field: "coupon", actual: avg("k"), limit: pfFlags.pfMaxKVal });
  if (pfFlags.hasPfMinK && avg("k") < pfFlags.pfMinKVal - 0.01)
    violations.push({ type: "avg_under", field: "coupon", actual: avg("k"), limit: pfFlags.pfMinKVal });
  if (pfFlags.hasPfMaxMat && avg("mty") > pfFlags.pfMaxMatVal + 0.01)
    violations.push({ type: "avg_over", field: "maturity", actual: avg("mty"), limit: pfFlags.pfMaxMatVal });
  if (pfFlags.hasPfMinMat && avg("mty") < pfFlags.pfMinMatVal - 0.01)
    violations.push({ type: "avg_under", field: "maturity", actual: avg("mty"), limit: pfFlags.pfMinMatVal });
  if (pfFlags.hasPfMaxY && avg("y") > pfFlags.pfMaxYVal + 0.01)
    violations.push({ type: "avg_over", field: "yield", actual: avg("y"), limit: pfFlags.pfMaxYVal });
  if (pfFlags.hasPfMinY && avg("y") < pfFlags.pfMinYVal - 0.01)
    violations.push({ type: "avg_under", field: "yield", actual: avg("y"), limit: pfFlags.pfMinYVal });

  Object.entries(cfg.ratingLimits || {}).forEach(([rtg, lim]) => {
    if (!lim || !lim.enabled) {
      const bonds = pf.filter(b => b.lo === rtg);
      if (bonds.length > 0) violations.push({ type: "disabled_rating", rating: rtg, count: bonds.length });
    }
    if (lim && lim.enabled && lim.max && parseFloat(lim.max) < 100) {
      const grpNom = pf.filter(b => b.lo === rtg).reduce((a, b) => a + b.nom, 0);
      const pct = total > 0 ? (grpNom / total) * 100 : 0;
      if (pct > parseFloat(lim.max) + 0.1) violations.push({ type: "rating_over", rating: rtg, actual: pct, limit: parseFloat(lim.max) });
    }
  });

  Object.entries(cfg.rankLimits || {}).forEach(([cat, lim]) => {
    if (!lim || !lim.enabled) {
      const bonds = pf.filter(b => (b.rank || "SP") === cat);
      if (bonds.length > 0) violations.push({ type: "disabled_rank", rank: cat, count: bonds.length });
    }
    if (lim && lim.enabled && lim.max && parseFloat(lim.max) < 100) {
      const grpNom = pf.filter(b => (b.rank || "SP") === cat).reduce((a, b) => a + b.nom, 0);
      const pct = total > 0 ? (grpNom / total) * 100 : 0;
      if (pct > parseFloat(lim.max) + 0.1) violations.push({ type: "rank_over", rank: cat, actual: pct, limit: parseFloat(lim.max) });
    }
  });

  if (cfg.minGreen > 0) {
    const esgNom = pf.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0);
    const esgPct = total > 0 ? (esgNom / total) * 100 : 0;
    if (esgPct < cfg.minGreen - 0.1) violations.push({ type: "esg_under", actual: esgPct, limit: cfg.minGreen });
  }

  const mbLV = cfg.matBucketLimits || {};
  const mbUV = cfg.matBucketUnit || "pct";
  Object.entries(mbLV).forEach(([bkt, lim]) => {
    if (!lim) return;
    if (lim.enabled === false) { const disNom = pf.filter(b => getMatBucket(b.mty || 0) === bkt).reduce((a, b) => a + b.nom, 0); if (disNom > 0) violations.push({ type: "matbucket_disabled", bucket: bkt, actual: disNom, limit: 0, unit: "Mio." }); return; }
    const grpNom = pf.filter(b => getMatBucket(b.mty || 0) === bkt).reduce((a, b) => a + b.nom, 0);
    const mn = lim.min !== "" && lim.min != null ? parseFloat(lim.min) : null;
    const mx = lim.max !== "" && lim.max != null ? parseFloat(lim.max) : null;
    if (mbUV === "pct") {
      const pct = total > 0 ? (grpNom / total) * 100 : 0;
      if (mx != null && mx < 100 && pct > mx + 0.1) violations.push({ type: "matbucket_over", bucket: bkt, actual: pct, limit: mx, unit: "%" });
      if (mn != null && mn > 0 && pct < mn - 0.1) violations.push({ type: "matbucket_under", bucket: bkt, actual: pct, limit: mn, unit: "%" });
    } else {
      if (mx != null && grpNom > mx + 0.1) violations.push({ type: "matbucket_over", bucket: bkt, actual: grpNom, limit: mx, unit: "Mio." });
      if (mn != null && mn > 0 && grpNom < mn - 0.1) violations.push({ type: "matbucket_under", bucket: bkt, actual: grpNom, limit: mn, unit: "Mio." });
    }
  });

  if (cfg._lexCeilDuration != null) {
    const durAvg = avg("md");
    if (durAvg > cfg._lexCeilDuration + 0.01)
      violations.push({ type: "lex_ceil_duration", actual: durAvg, limit: cfg._lexCeilDuration });
  }
  if (cfg._lexCeilRating != null) {
    const ratAvg = avg("ln");
    if (ratAvg > cfg._lexCeilRating + 0.01)
      violations.push({ type: "lex_ceil_rating", actual: ratAvg, limit: cfg._lexCeilRating });
  }

  return { valid: violations.length === 0, violations, total, budget };
}

// ── Resolve Category Limit Value to Absolute Mio. € ──
export function resolveCatLimit(val, unit, effectiveBudget) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return unit === "mio" ? n : Math.max(0, effectiveBudget * (n / 100));
}

export function resolveCatLimitsMinMax(limits, unit, effectiveBudget) {
  const maxL = {}, minL = {};
  Object.keys(limits || {}).forEach(cat => {
    if (!catEnabled(limits, cat)) return;
    const { min, max } = catMinMax(limits, cat);
    const maxV = resolveCatLimit(max, unit, effectiveBudget);
    const minV = resolveCatLimit(min, unit, effectiveBudget);
    if (unit === "pct") {
      if (maxV != null && max < 100) maxL[cat] = maxV;
      if (minV != null && min > 0) minL[cat] = minV;
    } else {
      if (maxV != null) maxL[cat] = maxV;
      if (minV != null && minV > 0) minL[cat] = minV;
    }
  });
  return { maxL, minL };
}
