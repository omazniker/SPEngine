// Main MIP solver using HiGHS WASM
// Source: tests/test_lexicographic.html function optimizeMIP_v2 (~line 9087)

import { getHighsSolver } from './highs.js';
import {
  filterEligible,
  baseScoreFn,
  parsePfFlags,
  checkDurationConflict,
  prepLockedBonds,
  validateLockedVsLimits,
  validateSolution,
  buildDurationMatchingConstraints,
  getMatBucket,
  catEnabled,
  catMinMax,
  COEFF_NOISE,
  PF_AVG_SLACK,
} from './solverHelpers.js';

/**
 * MIP-Solver v2 — Hauptsolver für Bond-Portfolio-Optimierung via HiGHS WASM.
 * Unterstützt Lot-Sizes, Semi-Continuous-Variablen, Issuer/Country/Category-Limits,
 * lexikographische Floor/Ceiling-Constraints und einen 6-stufigen Infeasibility-Cascade.
 *
 * @param {Array} pool - Bond-Universe (gefiltert durch filterPool)
 * @param {Object} cfg - Konfiguration (Budget, Constraints, Objectives, etc.)
 * @returns {Array} Portfolio-Ergebnis [{...bond, nom, locked, inUniverse}, ...]
 */
export async function optimizeMIP_v2(pool, cfg) {
  const solver = await getHighsSolver();
  const {
    obj, budget, minGreen, maxBondNom, minBondNom: cfgMinBond,
    maxIssNominal, minIssNom: cfgMinIss, minLot: cfgMinLot, maxCo,
    ratingLimits, rankLimits, strukturLimits, kuponLimits, sektorLimits,
    pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinDur = "", pfMaxDur = "",
    pfMinMat = "", pfMaxMat = "", lockedBonds = []
  } = cfg;

  const minNom = parseFloat(cfgMinBond) || 0;
  const maxNom = Math.max(0, maxBondNom);
  if (maxNom <= 0 || budget <= 0) { console.warn("[MIPv2] EXIT: maxNom or budget <= 0"); return []; }
  const lotSize = parseFloat(cfgMinLot) || 0;
  const S = lotSize > 0 ? lotSize : 1;
  const useInt = lotSize > 0;
  const minIssAmt = parseFloat(cfgMinIss) || 0;
  if (checkDurationConflict(cfg, "MIPv2")) { console.warn("[MIPv2] EXIT: Duration conflict"); return []; }

  const el = filterEligible(pool, cfg);
  if (el.length === 0 && lockedBonds.length === 0) { console.warn("[MIPv2] EXIT: no eligible bonds"); return []; }
  const lockedMap = prepLockedBonds(el, pool, lockedBonds, cfg);
  const baseScore = baseScoreFn(obj);

  const effectiveBudget = budget;
  const coLmtUnit = cfg.countryLimitUnit || "pct";
  const coLimit = coLmtUnit === "mio" ? Math.max(0, maxCo) : Math.max(0, effectiveBudget * (Math.max(0, maxCo) / 100));
  const greenTarget = minGreen > 0 ? Math.max(0, effectiveBudget * (minGreen / 100)) : 0;
  const san = s => s.replace(/\+/g, 'p').replace(/-/g, 'm').replace(/[^a-zA-Z0-9]/g, '');
  const pfFlags = parsePfFlags(cfg);

  if (!validateLockedVsLimits(el, lockedMap, effectiveBudget, maxIssNominal, coLimit, "MIPv2", cfg)) {
    console.warn("[MIPv2] EXIT: locked bonds validation failed"); return [];
  }

  // Budget floor 95%
  const budgetFloor = effectiveBudget * 0.95;

  // No rank caps — all bonds get maxNom, but ISIN exceptions may have lower caps
  const bondCapsV2 = new Map();
  if (cfg.isinExceptions && cfg.isinExceptions.length) {
    const exMap = new Map(cfg.isinExceptions.filter(x => x.maxNom > 0).map(x => [x.isin, x.maxNom]));
    el.forEach(b => {
      const cap = exMap.get(b.isin);
      if (cap != null) bondCapsV2.set(b.id, Math.min(maxNom, cap));
    });
  }

  // === Pre-Solve Feasibility Check: Überlappende Kategorie-Constraints ===
  {
    const catChecks = [];
    const checkCatMinSum = (limits, unit, labelFn) => {
      if (!limits) return;
      let minSum = 0;
      Object.entries(limits).forEach(([cat, lim]) => {
        if (lim && lim.enabled && lim.min && lim.min !== "") {
          minSum += parseFloat(lim.min) || 0;
        }
      });
      if (unit === "pct") {
        if (minSum > 100) catChecks.push(labelFn + ": Sum(min)=" + minSum.toFixed(0) + "% > 100%");
      } else {
        if (minSum > effectiveBudget) catChecks.push(labelFn + ": Sum(min)=" + minSum.toFixed(1) + "M > Budget " + effectiveBudget + "M");
      }
    };
    checkCatMinSum(ratingLimits, cfg.ratingLimitUnit || "pct", "Rating-Min");
    checkCatMinSum(rankLimits, cfg.rankLimitUnit || "pct", "Rang-Min");
    checkCatMinSum(sektorLimits, cfg.sektorLimitUnit || "pct", "Sektor-Min");
    checkCatMinSum(strukturLimits, cfg.strukturLimitUnit || "pct", "Struktur-Min");
    checkCatMinSum(kuponLimits, cfg.kuponLimitUnit || "pct", "Kupon-Min");
    // Country-Limit vs Anzahl Länder
    const coUnitCheck = cfg.countryLimitUnit || "pct";
    const nCountries = new Set(el.map(b => b.co)).size;
    if (nCountries > 0 && coLimit > 0) {
      const maxCountryFill = nCountries * coLimit;
      if (maxCountryFill < effectiveBudget * 0.95) {
        if (coUnitCheck === "pct") {
          catChecks.push("Länderlimit: " + nCountries + " Länder × " + (maxCo) + "% = " +
            (nCountries * maxCo).toFixed(0) + "% < 95% Budget (evtl. infeasible)");
        } else {
          catChecks.push("Länderlimit: " + nCountries + " Länder × " + maxCo + "M = " +
            maxCountryFill.toFixed(1) + "M < 95% Budget (evtl. infeasible)");
        }
      }
    }
    if (catChecks.length > 0) {
      console.warn("[MIPv2] Pre-Solve Feasibility Warnungen: " + catChecks.join("; "));
    }
  }

  // === Locked Bonds: Kategorie-Kapazitäts-Diagnose ===
  if (lockedMap.size > 0) {
    const lockedTotal = [...lockedMap.values()].reduce((a, v) => a + v, 0);
    const diagCats = {};
    el.forEach(b => {
      if (!lockedMap.has(b.isin)) return;
      const nom = lockedMap.get(b.isin);
      const co = b.co || "??";
      const rtg = b.lo || "NR";
      const rank = b.rank || "SP";
      const sek = b.sektor || "OTHER";
      const struk = b.matTyp || "BULLET";
      diagCats["Country:" + co] = (diagCats["Country:" + co] || 0) + nom;
      diagCats["Rating:" + rtg] = (diagCats["Rating:" + rtg] || 0) + nom;
      diagCats["Rang:" + rank] = (diagCats["Rang:" + rank] || 0) + nom;
      diagCats["Sektor:" + sek] = (diagCats["Sektor:" + sek] || 0) + nom;
      diagCats["Struktur:" + struk] = (diagCats["Struktur:" + struk] || 0) + nom;
    });
    const lines = Object.entries(diagCats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, nom]) => cat + " " + nom.toFixed(1) + "M (" + (nom / effectiveBudget * 100).toFixed(1) + "%)");
    console.log("[MIPv2] Bestand-Kapazität (" + lockedTotal.toFixed(1) + "M / " + effectiveBudget + "M = " +
      (lockedTotal / effectiveBudget * 100).toFixed(1) + "%): " + lines.join(", "));
  }

  // === Build LP String ===
  const fc = v => {
    if (!isFinite(v)) return "0";
    if (Math.abs(v) < COEFF_NOISE) return "0";
    const r = Math.round(v * 1e8) / 1e8;
    return r === Math.round(r) ? r.toFixed(0) : r.toString();
  };
  const L = [];

  // --- Objective ---
  L.push("Maximize");
  let objLine = "  obj:";
  let objTermCount = 0;
  el.forEach((b, i) => {
    const sc = baseScore(b);
    if (isFinite(sc) && Math.abs(sc) > COEFF_NOISE) { objLine += ` + ${fc(sc)} z${i}`; objTermCount++; }
  });
  if (objTermCount === 0) {
    console.warn("[MIPv2] Leere Objective — alle Scores ≤ COEFF_NOISE. Fallback: gleichgewichtete Allokation.");
    el.forEach((_, i) => { objLine += ` + 1 z${i}`; });
  }
  L.push(objLine);
  L.push("");
  L.push("Subject To");

  // --- Budget: 95% <= total <= 100% ---
  let budMax = "  c_bmax:";
  el.forEach((_, i) => { budMax += ` + 1 z${i}`; });
  budMax += ` <= ${fc(effectiveBudget / S)}`;
  L.push(budMax);

  let budMin = "  c_bmin:";
  el.forEach((_, i) => { budMin += ` + 1 z${i}`; });
  budMin += ` >= ${fc(budgetFloor / S)}`;
  L.push(budMin);

  // --- Semi-continuous: minNom * y_i <= z_i <= cap_i * y_i ---
  // Im _fastScan-Modus: KEINE y-Variablen → Semi-Continuous überspringen
  if (!cfg._fastScan) {
    el.forEach((b, i) => {
      if (lockedMap.has(b.isin)) return;
      const bCap = bondCapsV2.get(b.id) || maxNom;
      const capS = useInt ? Math.floor(bCap / S) : bCap / S;
      const minS = useInt ? Math.ceil(minNom / S) : minNom / S;
      if (minS > 0) L.push(`  c_smin${i}: z${i} - ${fc(minS)} y${i} >= 0`);
      L.push(`  c_smax${i}: z${i} - ${fc(capS)} y${i} <= 0`);
    });
  }

  // --- Issuer max ---
  const issuers = [...new Set(el.map(b => b.t))];
  issuers.forEach((t, ti) => {
    let line = `  c_iss${ti}:`;
    let hasTerm = false;
    el.forEach((b, i) => { if (b.t === t) { line += ` + 1 z${i}`; hasTerm = true; } });
    if (hasTerm) { line += ` <= ${fc(maxIssNominal / S)}`; L.push(line); }
  });

  // Issuer minimum: eine Constraint pro Emittent (nicht pro Bond)
  // Semantik: Wenn mindestens ein Bond des Emittenten ausgewählt wird,
  // muss die Emittenten-Summe >= minIssAmt sein.
  // Formulierung: sum(z_k for k in issuer) >= minIssAmt * y_first
  // wobei y_first der Binary eines beliebigen Bonds des Emittenten ist.
  // Da c_smax bereits z_k <= cap * y_k erzwingt, impliziert z_k > 0 => y_k = 1.
  if (minIssAmt > 0 && !cfg._fastScan) {
    issuers.forEach((t, ti) => {
      const issuerBondIdxs = el.map((b, i) => ({ b, i })).filter(x => x.b.t === t);
      const unlockedIdxs = issuerBondIdxs.filter(x => !lockedMap.has(x.b.isin));
      if (unlockedIdxs.length === 0) return;
      unlockedIdxs.forEach(({ i }, j) => {
        let line = `  c_issmin${ti}_${j}:`;
        issuerBondIdxs.forEach(({ i: k }) => { line += ` + 1 z${k}`; });
        line += ` - ${fc(minIssAmt / S)} y${i} >= 0`;
        L.push(line);
      });
    });
  }

  // --- Country limits (relativ zum Portfolio-Total) ---
  // Korrekte Formulierung: Sum(z_i in Land) - (maxCo/100) × Sum(z_i alle) ≤ 0
  // So wird der %-Anteil relativ zum tatsächlich investierten Betrag erzwungen,
  // nicht relativ zum Budget (das evtl. nicht voll ausgeschöpft wird).
  const pctFrac = maxCo / 100;
  const countries = [...new Set(el.map(b => b.co))];
  countries.forEach((co, ci) => {
    let line = `  c_co${ci}:`;
    let hasTerm = false;
    el.forEach((b, i) => {
      const coeff = (b.co === co) ? (1 - pctFrac) : -pctFrac;
      if (Math.abs(coeff) > COEFF_NOISE) {
        line += coeff >= 0 ? ` + ${fc(coeff)} z${i}` : ` - ${fc(-coeff)} z${i}`;
        hasTerm = true;
      }
    });
    if (hasTerm) { line += ` <= 0`; L.push(line); }
  });

  // === Helper: Relative %-Constraint für Kategorien ===
  // Formulierung Max: Sum(z_i in cat) - (pct/100) × Sum(z_i alle) ≤ 0
  //              → Koeff = (1 - pct/100) für cat-Bonds, (-pct/100) für andere
  // Formulierung Min: Sum(z_i in cat) - (pct/100) × Sum(z_i alle) ≥ 0
  //              → Koeff = (1 - pct/100) für cat-Bonds, (-pct/100) für andere
  const addPctConstraint = (name, matchFn, pct, isMax) => {
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
    if (hasTerm) { line += isMax ? ` <= 0` : ` >= 0`; L.push(line); }
  };
  // Absolute Mio. € constraint: Sum(z_i in cat) / S <= absLimit  →  Sum(z_i) <= absLimit * S
  const addAbsConstraint = (name, matchFn, absVal, isMax) => {
    let line = `  ${name}:`; let ht = false;
    el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } });
    if (ht) { line += isMax ? ` <= ${fc(absVal * S)}` : ` >= ${fc(absVal * S)}`; L.push(line); }
  };
  const addCatConstraintsMIP = (limits, unit, prefix, catFn) => {
    Object.entries(limits || {}).forEach(([cat]) => {
      if (!catEnabled(limits, cat)) return;
      const { min, max } = catMinMax(limits, cat);
      const matchFn = b => catFn(b) === cat;
      if (unit === "pct") {
        if (max != null && max < 100) addPctConstraint(`c_${prefix}_max_${san(cat)}`, matchFn, max, true);
        if (min != null && min > 0) addPctConstraint(`c_${prefix}_min_${san(cat)}`, matchFn, min, false);
      } else {
        if (max != null) addAbsConstraint(`c_${prefix}_max_${san(cat)}`, matchFn, parseFloat(max), true);
        if (min != null && parseFloat(min) > 0) addAbsConstraint(`c_${prefix}_min_${san(cat)}`, matchFn, parseFloat(min), false);
      }
    });
  };

  // --- Rating limits ---
  addCatConstraintsMIP(ratingLimits, cfg.ratingLimitUnit || "pct", "rtg", b => b.lo);

  // --- ESG minimum (relativ) ---
  let greenSoft = false;
  if (minGreen > 0) {
    const esgMatchFn = b => b.g === 1;
    const hasEsgBonds = el.some(b => b.g === 1);
    if (hasEsgBonds) {
      addPctConstraint("c_esg", esgMatchFn, minGreen, false);
    } else {
      console.warn("[MIPv2] No green bonds in pool — ESG as soft constraint");
      greenSoft = true;
    }
  }

  // --- Rank limits ---
  addCatConstraintsMIP(rankLimits, cfg.rankLimitUnit || "pct", "rk", b => b.rank || "SP");
  // --- Struktur limits ---
  addCatConstraintsMIP(strukturLimits, cfg.strukturLimitUnit || "pct", "st", b => b.matTyp || "BULLET");
  // --- Kupon limits ---
  addCatConstraintsMIP(kuponLimits, cfg.kuponLimitUnit || "pct", "kp", b => b.kpnTyp || "FIXED");
  // --- Sektor limits ---
  addCatConstraintsMIP(sektorLimits, cfg.sektorLimitUnit || "pct", "sk", b => b.sektor || "OTHER");

  // --- Maturity Bucket limits ---
  const mbLimitsMIP = cfg.matBucketLimits || {};
  const mbUnitMIP = cfg.matBucketUnit || "pct";
  Object.keys(mbLimitsMIP).forEach(bkt => {
    const lim = mbLimitsMIP[bkt]; if (!lim) return;
    const mn = lim.min !== "" && lim.min != null ? parseFloat(lim.min) : null;
    const mx = lim.max !== "" && lim.max != null ? parseFloat(lim.max) : null;
    const matchFn = b => getMatBucket(b.mty || 0) === bkt;
    if (mbUnitMIP === "pct") {
      if (mx != null && mx < 100) addPctConstraint(`c_mb_max_${san(bkt)}`, matchFn, mx, true);
      if (mn != null && mn > 0) addPctConstraint(`c_mb_min_${san(bkt)}`, matchFn, mn, false);
    } else {
      // Absolute Mio. € constraints: Sum(z_i in bucket) / S <= max  →  Sum(z_i) <= max * S
      if (mx != null) {
        let line = `  c_mb_max_${san(bkt)}:`; let ht = false;
        el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } });
        if (ht) { line += ` <= ${fc(mx * S)}`; L.push(line); }
      }
      if (mn != null && mn > 0) {
        let line = `  c_mb_min_${san(bkt)}:`; let ht = false;
        el.forEach((b, i) => { if (matchFn(b)) { line += ` + ${fc(1)} z${i}`; ht = true; } });
        if (ht) { line += ` >= ${fc(mn * S)}`; L.push(line); }
      }
    }
  });

  // --- Portfolio Average Constraints (linearized) ---
  // Korrekte Formulierung: Sum((attr_i - target) * z_i) <= SLACK * budgetScaled
  // wobei SLACK = PF_AVG_SLACK (1% Toleranz), budgetScaled = effectiveBudget / S
  // Dies erzwingt: gewichteter Durchschnitt ≈ target (mit proportionaler Toleranz)
  const pfSlack = fc(PF_AVG_SLACK * effectiveBudget / S);
  if (pfFlags.hasPfMaxK) {
    const tgt = pfFlags.pfMaxKVal;
    let line = "  c_pfMaxK:";
    el.forEach((b, i) => { const c = b.k - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMinK) {
    const tgt = pfFlags.pfMinKVal;
    let line = "  c_pfMinK:";
    el.forEach((b, i) => { const c = b.k - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= -${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMaxPx) {
    const tgt = pfFlags.pfMaxPxVal;
    let line = "  c_pfMaxPx:";
    el.forEach((b, i) => { const c = (b.px || 100) - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMinPx) {
    const tgt = pfFlags.pfMinPxVal;
    let line = "  c_pfMinPx:";
    el.forEach((b, i) => { const c = (b.px || 100) - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= -${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMinDur) {
    const tgt = pfFlags.pfMinDurVal;
    let line = "  c_pfMinDur:";
    el.forEach((b, i) => { const c = b.md - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= -${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMaxDur) {
    const tgt = pfFlags.pfMaxDurVal;
    let line = "  c_pfMaxDur:";
    el.forEach((b, i) => { const c = b.md - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMinMat) {
    const tgt = pfFlags.pfMinMatVal;
    let line = "  c_pfMinMat:";
    el.forEach((b, i) => { const c = b.mty - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= -${pfSlack}`; L.push(line);
  }
  if (pfFlags.hasPfMaxMat) {
    const tgt = pfFlags.pfMaxMatVal;
    let line = "  c_pfMaxMat:";
    el.forEach((b, i) => { const c = b.mty - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${pfSlack}`; L.push(line);
  }

  // --- Locked bonds ---
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin) / S);
      L.push(`  c_lock${i}: z${i} >= ${fixedS}`);
      L.push(`  c_lockx${i}: z${i} <= ${fixedS}`);
    }
  });

  // --- Lexikographische Floor/Ceiling Constraints ---
  // Werden von solveLexicographic() über cfg._lexFloor* / cfg._lexCeil* gesetzt
  if (cfg._lexFloorYield) {
    // Sum(y_i * z_i) >= floor * Sum(z_i) → Sum((y_i - floor) * z_i) >= 0
    const floor = cfg._lexFloorYield;
    let line = "  c_lexFloorYield:";
    el.forEach((b, i) => { const c = (b.y || 0) - floor; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " >= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: Rendite >= " + floor.toFixed(4) + "%");
  }
  if (cfg._lexFloorCoupon) {
    const floor = cfg._lexFloorCoupon;
    let line = "  c_lexFloorCoupon:";
    el.forEach((b, i) => { const c = (b.k || 0) - floor; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " >= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: Kupon >= " + floor.toFixed(4) + "%");
  }
  if (cfg._lexFloorSpread) {
    const floor = cfg._lexFloorSpread;
    let line = "  c_lexFloorSpread:";
    el.forEach((b, i) => { const c = (b.s || 0) - floor; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " >= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: Spread >= " + floor.toFixed(4) + "bp");
  }
  if (cfg._lexFloorEsg) {
    // ESG-Quote >= floor: Sum(g_i * z_i) >= floor * Sum(z_i) → Sum((g_i - floor) * z_i) >= 0
    const floor = cfg._lexFloorEsg;
    let line = "  c_lexFloorEsg:";
    el.forEach((b, i) => { const c = (b.g === 1 ? 1 : 0) - floor; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " >= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: ESG >= " + (floor * 100).toFixed(1) + "%");
  }
  if (cfg._lexCeilDuration) {
    // Gewichtete Duration <= ceiling: Sum((md_i - ceiling) * z_i) <= 0
    const ceil = cfg._lexCeilDuration;
    let line = "  c_lexCeilDur:";
    el.forEach((b, i) => { const c = (b.md || 0) - ceil; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " <= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: Duration <= " + ceil.toFixed(4) + "J");
  }
  if (cfg._lexCeilRating) {
    // Gewichtetes Rating <= ceiling (niedrig = besser): Sum((ln_i - ceiling) * z_i) <= 0
    const ceil = cfg._lexCeilRating;
    let line = "  c_lexCeilRtg:";
    el.forEach((b, i) => { const c = (b.ln || 99) - ceil; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += " <= 0"; L.push(line);
    console.log("[MIPv2] Lex-Constraint: Rating <= " + ceil.toFixed(2));
  }

  // Duration-Matching Constraint (alternative zu min/max Duration)
  if (cfg.durationMatchTarget != null) {
    const dmTarget = parseFloat(cfg.durationMatchTarget);
    const dmTol = parseFloat(cfg.durationMatchTolerance || 0.5);
    if (!isNaN(dmTarget) && dmTarget > 0) {
      const dmConstraints = buildDurationMatchingConstraints(el, dmTarget, dmTol, effectiveBudget, S, COEFF_NOISE);
      L.push(...dmConstraints);
      console.log("[MIPv2] Duration-Matching: " + dmTarget.toFixed(2) + "J +/-" + dmTol.toFixed(2) + "J");
    }
  }

  // --- Bounds ---
  L.push(""); L.push("Bounds");
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin) / S);
      L.push(`  ${fixedS} <= z${i} <= ${fixedS}`);
    } else {
      const bCap = bondCapsV2.get(b.id) || maxNom;
      const capS = useInt ? Math.floor(bCap / S) : bCap / S;
      L.push(`  0 <= z${i} <= ${fc(capS)}`);
    }
  });

  // --- Generals (integer) + Binaries ---
  // Im _fastScan-Modus: KEINE Integer/Binary-Variablen → reines LP (~1-5ms statt 100ms-∞)
  // Die Frontier-Stats (Yield, Duration, Rating, ESG) sind bei LP-Relaxation nahezu identisch.
  // Nur die finalen Top-14 werden mit vollem MIP (Lot-Sizes, minBondNom) gerechnet.
  if (!cfg._fastScan) {
    if (useInt) {
      L.push(""); L.push("Generals");
      const genVars = [];
      el.forEach((b, i) => { if (!lockedMap.has(b.isin)) genVars.push(`z${i}`); });
      L.push("  " + genVars.join(" "));
    }

    L.push(""); L.push("Binaries");
    const binVars = [];
    el.forEach((b, i) => { if (!lockedMap.has(b.isin)) binVars.push(`y${i}`); });
    L.push("  " + binVars.join(" "));
  }

  L.push(""); L.push("End");

  // === Sanity checks ===
  const lpString = L.join("\n");
  const cNames = L.filter(l => l.includes(':')).map(l => l.trim().split(':')[0]);
  const cDups = cNames.filter((n, i) => cNames.indexOf(n) !== i);
  if (cDups.length > 0) console.error("[MIPv2] DUPLICATE CONSTRAINTS:", cDups);
  if (lpString.includes("NaN") || lpString.includes("Infinity")) {
    console.error("[MIPv2] LP contains NaN/Infinity!");
  }

  console.log("[MIPv2] LP built: " + L.length + " lines, " + el.length + " bonds, obj=" + obj);

  // 6-step infeasibility cascade
  let _wasmCrashed = false;
  const doSolve = (lp) => {
    if (_wasmCrashed) return { Status: "WasmCrash" };
    try { return solver.solve(lp); }
    catch (e) {
      console.error("[MIPv2] Solver error:", e);
      // RuntimeError = WASM-Crash (memory corruption) → keine weiteren Versuche sinnvoll
      if (e instanceof RuntimeError || (e.message && (e.message.includes("RuntimeError") ||
          e.message.includes("memory access") || e.message.includes("Aborted") ||
          e.message.includes("table index")))) {
        _wasmCrashed = true;
        return { Status: "WasmCrash" };
      }
      return { Status: "Error" };
    }
  };

  const t0 = performance.now();
  let result = doSolve(lpString);
  let relaxLog = [];

  // Fast-Scan-Modus: KEINE Kaskade (sofort return bei infeasible) → 1× Solve statt 7×
  if (cfg._fastScan && result.Status !== "Optimal") {
    return [];
  }

  // WASM-Crash: Sofort abbrechen, keine Cascade (alle weiteren Solves würden auch crashen)
  if (result.Status === "WasmCrash") {
    console.warn("[MIPv2] WASM crashed — Cascade übersprungen");
    return [];
  }

  if (result.Status !== "Optimal") {
    let retryL = [...L];

    // Step 1: Relax ESG
    if (greenTarget > 0 && !cfg._noRelaxEsg) {
      const esgIdx = retryL.findIndex(l => l.trimStart().startsWith("c_esg:"));
      if (esgIdx >= 0) {
        retryL.splice(esgIdx, 1);
        greenSoft = true;
        relaxLog.push("ESG relaxed");
        const r = doSolve(retryL.join("\n"));
        if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
        if (r.Status === "Optimal") result = r;
      }
    }

    // Step 2: Budget floor -> 80%
    if (result.Status !== "Optimal") {
      const idx = retryL.findIndex(l => l.trimStart().startsWith("c_bmin:"));
      if (idx >= 0) {
        retryL[idx] = "  c_bmin:" + el.map((_, i) => " + 1 z" + i).join("") + ` >= ${fc(effectiveBudget * 0.80 / S)}`;
        relaxLog.push("Budget floor 80%");
        const r = doSolve(retryL.join("\n"));
        if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
        if (r.Status === "Optimal") result = r;
      }
    }

    // Step 3: Remove portfolio avg constraints FIRST (often the binding cause)
    if (result.Status !== "Optimal") {
      retryL = retryL.filter(l => !l.trimStart().match(/^c_pf(Max|Min)/));
      relaxLog.push("PF-Avg constraints removed");
      const r = doSolve(retryL.join("\n"));
      if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
      if (r.Status === "Optimal") result = r;
    }

    // Step 4: Remove category min/max constraints (keep rating/rank enabled filters)
    if (result.Status !== "Optimal") {
      retryL = retryL.filter(l => !l.trimStart().match(/^c_(rtg|rk|st|kp|sk|mb)_(min|max)_/));
      relaxLog.push("Category min/max removed");
      const r = doSolve(retryL.join("\n"));
      if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
      if (r.Status === "Optimal") result = r;
    }

    // Step 5: Remove ALL category constraints (including enabled/disabled filters)
    if (result.Status !== "Optimal") {
      retryL = retryL.filter(l => !l.trimStart().match(/^c_(rtg|rk|st|kp|sk|mb)_/));
      relaxLog.push("All categories removed");
      const r = doSolve(retryL.join("\n"));
      if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
      if (r.Status === "Optimal") result = r;
    }

    // Step 6: Budget floor -> 0
    if (result.Status !== "Optimal") {
      const idx = retryL.findIndex(l => l.trimStart().startsWith("c_bmin:"));
      if (idx >= 0) {
        retryL[idx] = "  c_bmin:" + el.map((_, i) => " + 1 z" + i).join("") + " >= 0";
        relaxLog.push("Budget floor 0");
        const r = doSolve(retryL.join("\n"));
        if (r.Status === "WasmCrash") { console.warn("[MIPv2] WASM crashed in cascade"); return []; }
        if (r.Status === "Optimal") result = r;
      }
    }

    // Step 7: Return empty — caller uses Greedy
    if (result.Status !== "Optimal") {
      console.warn("[MIPv2] All retries failed:", relaxLog.join(" -> "));
      return [];
    }
  }

  const t1 = performance.now();
  if (relaxLog.length > 0) console.warn("[MIPv2] Solved after relaxation:", relaxLog.join(" -> "));
  console.log("[MIPv2] Solved in " + (t1 - t0).toFixed(0) + "ms, Status: " + result.Status +
    ", Obj: " + (result.ObjectiveValue || "n/a"));

  // Extract — read only, NO post-processing
  const pf = [];
  el.forEach((b, i) => {
    const isLocked = lockedMap.has(b.isin);
    let nom;
    if (isLocked) {
      // Locked Bonds: direkt aus lockedMap lesen (Solver-Output kann undefined sein)
      nom = lockedMap.get(b.isin);
    } else {
      const col = result.Columns["z" + i];
      const lots = col ? col.Primal : 0;
      nom = Math.round(lots * S * 10) / 10;
      if (Math.abs(nom) < 0.01) nom = 0;
      // Lot-Size-Rundung: erst runden, dann prüfen ob noch >= minNom
      if (lotSize > 0 && nom > 0) {
        const rounded = Math.round(nom / lotSize) * lotSize;
        // Nur abrunden wenn Ergebnis noch >= minNom, sonst aufrunden (BUG-9 Fix)
        if (rounded >= minNom - 0.01) {
          nom = rounded;
        } else {
          const up = Math.ceil(nom / lotSize) * lotSize;
          const bCap = bondCapsV2.get(b.id) || maxNom;
          nom = (up <= bCap) ? up : rounded; // aufrunden wenn innerhalb Cap
        }
      }
    }
    if (nom >= minNom - 0.01 && nom > 0) {
      pf.push({ ...b, nom, locked: isLocked, inUniverse: true });
    }
  });

  // === Post-rounding enforcement: fix PF-avg constraint violations from lot-size rounding ===
  const postEnforce = (arr, field, targetVal, mode) => {
    const isMax = mode === "max";
    for (let iter = 0; iter < 30; iter++) {
      const tNom = arr.reduce((a, b) => a + b.nom, 0);
      if (tNom <= 0) break;
      const avg = arr.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / tNom;
      if (isMax ? (avg <= targetVal + 1e-6) : (avg >= targetVal - 1e-6)) break;
      const cands = arr.filter(b => !b.locked && b.nom > 0 &&
        (isMax ? (b[field] || 0) > targetVal : (b[field] || 0) < targetVal))
        .sort((a, b) => isMax ? ((b[field] || 0) - (a[field] || 0)) : ((a[field] || 0) - (b[field] || 0)));
      if (cands.length === 0) break;
      const worst = cands[0];
      const sumFN = arr.reduce((a, b) => a + (b[field] || 0) * b.nom, 0);
      const gap = isMax ? (sumFN - targetVal * tNom) : (targetVal * tNom - sumFN);
      const delta = Math.min(worst.nom, lotSize > 0 ? lotSize : Math.ceil(gap / Math.abs((worst[field] || 0) - targetVal) * 10) / 10);
      if (delta < 0.01) break;
      worst.nom = Math.round((worst.nom - delta) * 10) / 10;
      if (worst.nom < minNom && !worst.locked) worst.nom = 0;
      if (lotSize > 0 && worst.nom > 0) worst.nom = Math.floor(worst.nom / lotSize) * lotSize;
    }
    for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].nom <= 0) arr.splice(i, 1); }
  };
  // --- ESG post-enforce: remove non-green bonds if ESG% below target ---
  // Duration-aware: prefer removing low-duration non-green bonds, stop if would break pfMinDur
  const postEnforceESG = (arr) => {
    if (minGreen <= 0 || greenSoft) return;
    const targetPct = minGreen / 100;
    const pfMinDurVal = pfFlags.hasPfMinDur ? pfFlags.pfMinDurVal : null;
    const startNom = arr.reduce((a, b) => a + b.nom, 0);
    for (let iter = 0; iter < 50; iter++) {
      const tNom = arr.reduce((a, b) => a + b.nom, 0);
      if (tNom <= 0) break;
      // Safety: don't let ESG enforcement remove more than 30% of initial portfolio
      if (tNom < startNom * 0.7) break;
      const greenNom = arr.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0);
      const esgPct = greenNom / tNom;
      if (esgPct >= targetPct - 0.001) break;
      // Check if removing any non-green bond would break pfMinDur
      const durSum = arr.reduce((a, b) => a + (b.md || 0) * b.nom, 0);
      const nonGreen = arr.filter(b => !b.locked && b.nom > 0 && b.g !== 1)
        .sort((a, b) => {
          // Prefer removing bonds with LOWER duration (helps keep avg duration up)
          // Secondary: worst baseScore
          const durDiff = (a.md || 0) - (b.md || 0);
          if (Math.abs(durDiff) > 0.3) return durDiff;
          return baseScore(a) - baseScore(b);
        });
      if (nonGreen.length === 0) break;
      // Try candidates in order; skip any whose removal would break pfMinDur
      let removed = false;
      for (let ci = 0; ci < nonGreen.length; ci++) {
        const worst = nonGreen[ci];
        const delta = lotSize > 0 ? lotSize : Math.min(worst.nom, Math.max(0.1, worst.nom));
        const newNom = Math.round((worst.nom - Math.min(delta, worst.nom)) * 10) / 10;
        // Check: would this removal cause pfMinDur violation?
        if (pfMinDurVal != null) {
          const remAmt = worst.nom - Math.max(0, newNom);
          const newTNom = tNom - remAmt;
          if (newTNom > 0) {
            const newDurSum = durSum - (worst.md || 0) * remAmt;
            const newDurAvg = newDurSum / newTNom;
            if (newDurAvg < pfMinDurVal - 0.05) continue; // Skip this bond, try next
          }
        }
        worst.nom = newNom;
        if (worst.nom < minNom && !worst.locked) worst.nom = 0;
        if (lotSize > 0 && worst.nom > 0) worst.nom = Math.floor(worst.nom / lotSize) * lotSize;
        removed = true;
        break;
      }
      if (!removed) break; // No candidate can be removed without breaking duration
    }
    for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].nom <= 0) arr.splice(i, 1); }
  };
  // Post-enforce: weighted-avg constraints + ESG
  if (pfFlags.hasPfMaxDur) postEnforce(pf, "md", pfFlags.pfMaxDurVal, "max");
  if (pfFlags.hasPfMinDur) postEnforce(pf, "md", pfFlags.pfMinDurVal, "min");
  if (pfFlags.hasPfMaxPx) postEnforce(pf, "px", pfFlags.pfMaxPxVal, "max");
  if (pfFlags.hasPfMinPx) postEnforce(pf, "px", pfFlags.pfMinPxVal, "min");
  if (pfFlags.hasPfMaxK) postEnforce(pf, "k", pfFlags.pfMaxKVal, "max");
  if (pfFlags.hasPfMinK) postEnforce(pf, "k", pfFlags.pfMinKVal, "min");
  if (pfFlags.hasPfMinMat) postEnforce(pf, "mty", pfFlags.pfMinMatVal, "min");
  if (pfFlags.hasPfMaxMat) postEnforce(pf, "mty", pfFlags.pfMaxMatVal, "max");
  if (cfg._lexCeilDuration) postEnforce(pf, "md", cfg._lexCeilDuration, "max");
  if (cfg._lexCeilRating) postEnforce(pf, "ln", cfg._lexCeilRating, "max");
  postEnforceESG(pf);

  // === Post-enforce Refill: fill budget gap with constraint-respecting bonds ===
  const pfTotalAfterEnforce = pf.reduce((a, b) => a + b.nom, 0);
  if (pfTotalAfterEnforce < effectiveBudget - 0.5) {
    const pfAvgField = (field) => { const t = pf.reduce((a, b) => a + b.nom, 0); return t > 0 ? pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / t : 0; };
    const computeRefillMax = (b, maxAmt) => {
      let amt = maxAmt;
      const curTotal = pf.reduce((a, x) => a + x.nom, 0);
      const check = (field, targetVal, isMax) => {
        const curSum = pf.reduce((a, x) => a + (x[field] || 0) * x.nom, 0);
        const bVal = b[field] || 0;
        if (isMax && bVal > targetVal) {
          const d = bVal - targetVal;
          if (d > 1e-9) amt = Math.min(amt, Math.max(0, (targetVal * curTotal - curSum) / d));
        }
        if (!isMax && bVal < targetVal) {
          const d = targetVal - bVal;
          if (d > 1e-9) amt = Math.min(amt, Math.max(0, (curSum - targetVal * curTotal) / d));
        }
      };
      if (pfFlags.hasPfMaxDur) check("md", pfFlags.pfMaxDurVal, true);
      if (pfFlags.hasPfMinDur) check("md", pfFlags.pfMinDurVal, false);
      if (pfFlags.hasPfMaxPx) check("px", pfFlags.pfMaxPxVal, true);
      if (pfFlags.hasPfMinPx) check("px", pfFlags.pfMinPxVal, false);
      if (pfFlags.hasPfMaxK) check("k", pfFlags.pfMaxKVal, true);
      if (pfFlags.hasPfMinK) check("k", pfFlags.pfMinKVal, false);
      if (pfFlags.hasPfMinMat) check("mty", pfFlags.pfMinMatVal, false);
      if (pfFlags.hasPfMaxMat) check("mty", pfFlags.pfMaxMatVal, true);
      // Lex-Ceiling Constraints (from Auto-Optimize / Lexicographic re-solve)
      if (cfg._lexCeilDuration) check("md", cfg._lexCeilDuration, true);
      if (cfg._lexCeilRating) check("ln", cfg._lexCeilRating, true);
      // ESG percentage constraint: adding non-green bonds dilutes ESG%
      if (minGreen > 0 && b.g !== 1) {
        const greenNom = pf.filter(x => x.g === 1).reduce((a, x) => a + x.nom, 0);
        const targetPct = minGreen / 100;
        // greenNom / (curTotal + amt) >= targetPct  →  amt <= greenNom/targetPct - curTotal
        if (targetPct > 0) {
          const maxNonGreen = greenNom / targetPct - curTotal;
          amt = Math.min(amt, Math.max(0, maxNonGreen));
        }
      }
      return lotSize > 0 ? Math.floor(amt / lotSize) * lotSize : Math.floor(amt * 10) / 10;
    };
    // Boost green bonds in refill when ESG% is near or below target
    // Also consider duration needs when both ESG and minDur are active
    const esgNeedBoost = minGreen > 0 && !greenSoft;
    const durNeedBoost = pfFlags.hasPfMinDur;
    const refillCands = el.filter(b => !lockedMap.has(b.isin)).sort((a, b) => {
      if (esgNeedBoost) {
        const gN = pf.filter(x => x.g === 1).reduce((s, x) => s + x.nom, 0);
        const tN = pf.reduce((s, x) => s + x.nom, 0);
        const esgShort = tN > 0 && (gN / tN * 100) < minGreen + 2;
        if (esgShort) {
          // Both green: prefer higher duration when duration is also tight
          if (a.g === 1 && b.g === 1 && durNeedBoost) return (b.md || 0) - (a.md || 0);
          if (b.g === 1 && a.g !== 1) return 1;
          if (a.g === 1 && b.g !== 1) return -1;
        }
      }
      return baseScore(b) - baseScore(a);
    });
    let refillDone = false;
    for (let rIter = 0; rIter < 200 && !refillDone; rIter++) {
      const curT = pf.reduce((a, b) => a + b.nom, 0);
      const gap = effectiveBudget - curT;
      if (gap < (lotSize > 0 ? lotSize : 0.1)) { refillDone = true; break; }
      let added = false;
      const rBondTots = {}; pf.forEach(b => { rBondTots[b.id] = (rBondTots[b.id] || 0) + b.nom; });
      const rIssTots = {}; pf.forEach(b => { rIssTots[b.t] = (rIssTots[b.t] || 0) + b.nom; });
      const rCoTots = {}; pf.forEach(b => { rCoTots[b.co] = (rCoTots[b.co] || 0) + b.nom; });
      // Strict country limit based on current portfolio total (not budget) to prevent % overshoot
      const strictCoLimitR = coLmtUnit === "mio" ? coLimit : Math.min(coLimit, curT * (Math.max(0, maxCo) / 100));
      for (const b of refillCands) {
        const existNom = rBondTots[b.id] || 0;
        if (existNom >= maxNom) continue;
        if ((rIssTots[b.t] || 0) >= maxIssNominal) continue;
        if ((rCoTots[b.co] || 0) >= strictCoLimitR) continue;
        let maxAlloc = Math.min(gap, maxNom - existNom, maxIssNominal - (rIssTots[b.t] || 0), strictCoLimitR - (rCoTots[b.co] || 0));
        if (lotSize > 0) maxAlloc = Math.floor(maxAlloc / lotSize) * lotSize;
        if (maxAlloc < (lotSize > 0 ? lotSize : 0.1)) continue;
        const toAdd = computeRefillMax(b, maxAlloc);
        if (toAdd < minNom && existNom === 0) continue;
        if (toAdd > 0) {
          const existing = pf.find(x => x.id === b.id);
          if (existing) existing.nom = Math.round((existing.nom + toAdd) * 10) / 10;
          else pf.push({ ...b, nom: toAdd, locked: false, inUniverse: true });
          added = true;
          break;
        }
      }
      if (!added) refillDone = true;
    }
    let pfTotalAfterRefill = pf.reduce((a, b) => a + b.nom, 0);
    if (pfTotalAfterRefill > pfTotalAfterEnforce + 0.1) {
      console.log("[MIPv2] Post-enforce Refill: " + pfTotalAfterEnforce.toFixed(1) + "M → " + pfTotalAfterRefill.toFixed(1) + "M");
      // Iterative Refill+Re-Enforce cycle until convergence
      const reEnforceAll = () => {
        if (pfFlags.hasPfMaxDur) postEnforce(pf, "md", pfFlags.pfMaxDurVal, "max");
        if (pfFlags.hasPfMinDur) postEnforce(pf, "md", pfFlags.pfMinDurVal, "min");
        if (pfFlags.hasPfMaxPx) postEnforce(pf, "px", pfFlags.pfMaxPxVal, "max");
        if (pfFlags.hasPfMinPx) postEnforce(pf, "px", pfFlags.pfMinPxVal, "min");
        if (pfFlags.hasPfMaxK) postEnforce(pf, "k", pfFlags.pfMaxKVal, "max");
        if (pfFlags.hasPfMinK) postEnforce(pf, "k", pfFlags.pfMinKVal, "min");
        if (pfFlags.hasPfMinMat) postEnforce(pf, "mty", pfFlags.pfMinMatVal, "min");
        if (pfFlags.hasPfMaxMat) postEnforce(pf, "mty", pfFlags.pfMaxMatVal, "max");
        if (cfg._lexCeilDuration) postEnforce(pf, "md", cfg._lexCeilDuration, "max");
        if (cfg._lexCeilRating) postEnforce(pf, "ln", cfg._lexCeilRating, "max");
        postEnforceESG(pf);
      };
      for (let convergenceIter = 0; convergenceIter < 10; convergenceIter++) {
        reEnforceAll();
        const afterEnf = pf.reduce((a, b) => a + b.nom, 0);
        const gap2 = effectiveBudget - afterEnf;
        if (gap2 < (lotSize > 0 ? lotSize : 0.1)) break;
        // Mini-refill to close the gap again
        const rBT2 = {}; pf.forEach(b => { rBT2[b.id] = (rBT2[b.id] || 0) + b.nom; });
        const rIT2 = {}; pf.forEach(b => { rIT2[b.t] = (rIT2[b.t] || 0) + b.nom; });
        const rCT2 = {}; pf.forEach(b => { rCT2[b.co] = (rCT2[b.co] || 0) + b.nom; });
        let addedAny = false;
        let remainGap = gap2;
        const curTR2 = pf.reduce((a, b) => a + b.nom, 0);
        const strictCoLimitR2 = coLmtUnit === "mio" ? coLimit : Math.min(coLimit, curTR2 * (Math.max(0, maxCo) / 100));
        for (const b of refillCands) {
          if (remainGap < (lotSize > 0 ? lotSize : 0.1)) break;
          const eN = rBT2[b.id] || 0;
          if (eN >= maxNom) continue;
          if ((rIT2[b.t] || 0) >= maxIssNominal) continue;
          if ((rCT2[b.co] || 0) >= strictCoLimitR2) continue;
          let mA = Math.min(remainGap, maxNom - eN, maxIssNominal - (rIT2[b.t] || 0), strictCoLimitR2 - (rCT2[b.co] || 0));
          if (lotSize > 0) mA = Math.floor(mA / lotSize) * lotSize;
          if (mA < (lotSize > 0 ? lotSize : 0.1)) continue;
          const toAdd = computeRefillMax(b, mA);
          if (toAdd < minNom && eN === 0) continue;
          if (toAdd > 0) {
            const existing = pf.find(x => x.id === b.id);
            if (existing) existing.nom = Math.round((existing.nom + toAdd) * 10) / 10;
            else pf.push({ ...b, nom: toAdd, locked: false, inUniverse: true });
            rBT2[b.id] = (rBT2[b.id] || 0) + toAdd;
            rIT2[b.t] = (rIT2[b.t] || 0) + toAdd;
            rCT2[b.co] = (rCT2[b.co] || 0) + toAdd;
            remainGap -= toAdd;
            addedAny = true;
          }
        }
        if (!addedAny) break;
      }
    }
  }

  // Validate — log only, never fix
  const validation = validateSolution(pf, cfg);
  if (!validation.valid) {
    console.warn("[MIPv2] Post-solve violations:", validation.violations.map(v => v.type + "(" + (v.field||v.bond||v.bucket||v.rating||v.rank||"") + " " + (v.actual!=null?Number(v.actual).toFixed(3):"") + " vs " + (v.limit!=null?Number(v.limit).toFixed(3):"") + ")").join(", "));
  }
  // ESG-Soft-Warnung: keine Green Bonds im Pool oder ESG wurde relaxed
  if (greenSoft && greenTarget > 0) {
    const pfGreen = pf.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0);
    const pfTotal = pf.reduce((a, b) => a + b.nom, 0);
    const greenPct = pfTotal > 0 ? (pfGreen / pfTotal * 100).toFixed(1) : "0";
    console.warn("[MIPv2] ESG-Constraint wurde relaxed: Ziel=" + (greenTarget / effectiveBudget * 100).toFixed(1) + "%, Ist=" + greenPct + "%");
  }

  // Safety: remove bonds with invalid nom values
  for (let i = pf.length - 1; i >= 0; i--) {
    if (!pf[i].nom || isNaN(pf[i].nom) || pf[i].nom <= 0) pf.splice(i, 1);
  }
  const pfTot = pf.reduce((a, b) => a + b.nom, 0);
  // Budget-Werte sind bereits in Mio (z.B. 200 = 200 Mio €), nicht in absoluten Zahlen
  console.log("[MIPv2] Result: " + pf.length + " bonds, " + pfTot.toFixed(1) + "M / " +
    budget.toFixed(0) + "M (" + (pfTot / budget * 100).toFixed(1) + "%), " +
    "violations=" + validation.violations.length +
    (relaxLog.length > 0 ? ", relaxed=[" + relaxLog.join(", ") + "]" : "") +
    (greenSoft ? ", ESG=SOFT" : ""));

  return pf;
}
