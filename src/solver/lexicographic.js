// Multi-objective lexicographic solver
// Extracted from tests/test_lexicographic.html lines 5949-6059

import { stats } from './solverHelpers.js';

// Metadata for available objectives (used internally and by callers)
export const LEX_OBJECTIVES = {
  yield:       { label: "Max Rendite",       icon: "📈", extract: s => s.wY,  dir: "max", unit: "%" },
  coupon:      { label: "Max Kupon",         icon: "💰", extract: s => s.wK,  dir: "max", unit: "%" },
  spread:      { label: "Max Spread",        icon: "📊", extract: s => s.wS,  dir: "max", unit: "bp" },
  minDuration: { label: "Min Duration",      icon: "⏱️", extract: s => s.wD,  dir: "min", unit: "J" },
  minRating:   { label: "Bestes Rating",     icon: "🛡️", extract: s => s.wLn, dir: "min", unit: "" },
  maxEsg:      { label: "Max ESG",           icon: "🌍", extract: s => s.gP,  dir: "max", unit: "%" },
  retRW:       { label: "Rendite/RW",        icon: "⚡", extract: s => s.wY,  dir: "max", unit: "%" },
  sprRW:       { label: "Spread/RW",         icon: "🎯", extract: s => s.wS,  dir: "max", unit: "%" },
  retPVBP:     { label: "Rendite/Duration",  icon: "🔑", extract: s => s.yDur,dir: "max", unit: "" },
};

/**
 * Lexikographische Multi-Objective-Optimierung
 * Löst nacheinander N Ziele, wobei jede Phase das Ergebnis der vorherigen als Constraint fixiert.
 *
 * @param {Array} pool - Bond-Universe
 * @param {Object} baseCfg - Basis-Konfiguration (Budget, Constraints, etc.)
 * @param {Array} objectives - [{obj: "yield", slack: 0.05}, {obj: "minDuration", slack: 0.10}, ...]
 * @param {Function} solveFn - async (pool, cfg) => result[] (z.B. optimizeMIP_v2)
 * @returns {Object} { result, phases: [{obj, value, constraint}] }
 */
export async function solveLexicographic(pool, baseCfg, objectives, solveFn) {
  const phases = [];
  let accConstraints = {}; // gesammelte Constraints aus vorherigen Phasen

  for (let step = 0; step < objectives.length; step++) {
    const { obj, slack = 0.05 } = objectives[step];
    const meta = LEX_OBJECTIVES[obj];
    if (!meta) { console.warn("[Lex] Unbekanntes Ziel: " + obj); continue; }

    const phaseCfg = { ...baseCfg, obj, ...accConstraints };
    console.log("[Lex] Phase " + (step + 1) + "/" + objectives.length + ": " + meta.label +
      " (slack=" + (slack * 100).toFixed(0) + "%" + (Object.keys(accConstraints).length > 0 ? ", mit " + Object.keys(accConstraints).length + " Floor/Ceiling-Constraints" : "") + ")");

    let result;
    try {
      result = await solveFn(pool, phaseCfg);
    } catch (e) {
      console.warn("[Lex] Phase " + (step + 1) + " fehlgeschlagen:", e.message);
      // Versuche mit erhöhtem Slack
      if (step > 0 && slack < 0.5) {
        console.log("[Lex] Retry mit doppeltem Slack...");
        // Lockere die letzte Constraint
        const lastPhase = phases[phases.length - 1];
        if (lastPhase && lastPhase.constraintKey) {
          const looseVal = lastPhase.constraintLoose;
          accConstraints[lastPhase.constraintKey] = looseVal;
          try {
            const retryCfg = { ...baseCfg, obj, ...accConstraints };
            result = await solveFn(pool, retryCfg);
          } catch (e2) {
            console.warn("[Lex] Retry auch fehlgeschlagen:", e2.message);
          }
        }
      }
      if (!result || result.length === 0) {
        console.warn("[Lex] Phase " + (step + 1) + " übersprungen (infeasible)");
        phases.push({ obj, label: meta.label, value: null, skipped: true });
        continue;
      }
    }

    if (!result || result.length === 0) {
      console.warn("[Lex] Phase " + (step + 1) + " lieferte kein Ergebnis");
      phases.push({ obj, label: meta.label, value: null, skipped: true });
      continue;
    }

    // Wert der aktuellen Phase extrahieren
    const s = stats(result);
    const rawValue = meta.extract(s);
    console.log("[Lex] Phase " + (step + 1) + " Ergebnis: " + meta.label + " = " + (typeof rawValue === "number" ? rawValue.toFixed(4) : rawValue) + " " + meta.unit);

    // Constraint für nächste Phase berechnen
    let constraintKey = null;
    let constraintValue = null;
    let constraintLoose = null;

    if (step < objectives.length - 1 && rawValue != null && isFinite(rawValue)) {
      // Floor/Ceiling basierend auf Richtung
      if (meta.dir === "max") {
        // Nächste Phase: Wert >= rawValue * (1 - slack)
        const floor = rawValue * (1 - slack);
        const looseFloor = rawValue * (1 - slack * 2);
        if (obj === "yield") { constraintKey = "pfMinK_lex_yield"; accConstraints._lexFloorYield = floor; constraintKey = "_lexFloorYield"; constraintLoose = looseFloor; }
        else if (obj === "maxEsg" || obj === "_maxEsg") { constraintKey = "_lexFloorEsg"; accConstraints._lexFloorEsg = floor; constraintLoose = looseFloor; }
        else if (obj === "coupon") { constraintKey = "_lexFloorCoupon"; accConstraints._lexFloorCoupon = floor; constraintLoose = looseFloor; }
        else if (obj === "spread") { constraintKey = "_lexFloorSpread"; accConstraints._lexFloorSpread = floor; constraintLoose = looseFloor; }
        else { constraintKey = "_lexFloor_" + obj; accConstraints["_lexFloor_" + obj] = floor; constraintLoose = looseFloor; }
      } else {
        // min-Richtung: Wert <= rawValue * (1 + slack)
        const ceiling = rawValue * (1 + slack);
        const looseCeiling = rawValue * (1 + slack * 2);
        if (obj === "minDuration") { constraintKey = "_lexCeilDuration"; accConstraints._lexCeilDuration = ceiling; constraintLoose = looseCeiling; }
        else if (obj === "minRating") { constraintKey = "_lexCeilRating"; accConstraints._lexCeilRating = ceiling; constraintLoose = looseCeiling; }
        else { constraintKey = "_lexCeil_" + obj; accConstraints["_lexCeil_" + obj] = ceiling; constraintLoose = looseCeiling; }
      }
    }

    phases.push({
      obj, label: meta.label, value: rawValue, unit: meta.unit,
      dir: meta.dir, slack, constraintKey, constraintLoose,
      bonds: result.length, budget: s.tN
    });
  }

  // Letzte Phase ist das finale Ergebnis — nochmal lösen mit allen Constraints
  const lastObj = objectives[objectives.length - 1];
  const finalCfg = { ...baseCfg, obj: lastObj.obj, ...accConstraints };
  let finalResult;
  try {
    finalResult = await solveFn(pool, finalCfg);
  } catch (e) {
    console.warn("[Lex] Finaler Solve fehlgeschlagen, nutze Ergebnis der letzten Phase");
    // Fallback: Ergebnis der letzten erfolgreichen Phase
    const lastGood = phases.filter(p => !p.skipped).pop();
    if (lastGood) {
      const fallbackCfg = { ...baseCfg, obj: lastGood.obj, ...accConstraints };
      try { finalResult = await solveFn(pool, fallbackCfg); } catch (e2) { finalResult = []; }
    } else {
      finalResult = [];
    }
  }

  console.log("[Lex] === Zusammenfassung ===");
  phases.forEach((p, i) => {
    console.log("  Phase " + (i + 1) + ": " + p.label + " = " + (p.value != null ? (typeof p.value === "number" ? p.value.toFixed(4) : p.value) + " " + p.unit : "übersprungen") +
      (p.slack ? " (Slack " + (p.slack * 100).toFixed(0) + "%)" : ""));
  });

  return { result: finalResult, phases };
}
