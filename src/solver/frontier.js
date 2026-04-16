// Efficient frontier computation (quick variant)
// Extracted from tests/test_lexicographic.html lines 6078-6152

import { highsLib, highsPromise, getHighsSolver } from './highs.js';
import { stats } from './solverHelpers.js';

// Reset WASM every N solves to prevent memory corruption
export const RESET_INTERVAL = 5;

/**
 * Berechnet ~24 Portfolio-Varianten entlang ESG/Duration/Rating
 * nach jedem Standard-Solve, um die Effizienz-Frontier anzuzeigen.
 *
 * @param {Array} pool - Bond-Universe
 * @param {Object} baseCfg - Basis-Konfiguration
 * @param {Array} mainResult - Hauptergebnis (wird als Punkt hinzugefügt)
 * @param {Object} mainStats - Stats des Hauptergebnisses
 * @param {Function} solveFn - async (pool, cfg) => result[]
 * @param {Function} [onProgress] - Callback (totalSolves) für Fortschrittsanzeige
 * @returns {Object} { esg, rating, duration, _totalSolves, _feasible, _alternatives }
 */
export async function computeQuickFrontier(pool, baseCfg, mainResult, mainStats, solveFn, onProgress) {
  const feasibleAll = [];
  let totalSolves = 0, feasibleCount = 0, solvesSinceReset = 0;

  const trySolve = async (label, cfgOverride) => {
    if (solvesSinceReset >= RESET_INTERVAL) {
      try {
        // Reset the module-level HiGHS state via the exported mutable references
        // (frontier directly manipulates highsLib/highsPromise for memory management)
        const highs = await import('./highs.js');
        highs.highsLib = null;
        highs.highsPromise = null;
        await new Promise(r => setTimeout(r, 50)); // Let GC run
        await getHighsSolver();
      } catch(e) { console.warn("[Frontier] HiGHS reset failed, retrying...", e); try { await getHighsSolver(); } catch(e2) {} }
      solvesSinceReset = 0;
    }
    totalSolves++;
    solvesSinceReset++;
    try {
      const cfg = { ...baseCfg, ...cfgOverride };
      const r = await solveFn(pool, cfg);
      if (r && r.length > 0) {
        const s = stats(r);
        if (s) { feasibleAll.push({ result: r, stats: s, label }); feasibleCount++; }
      }
    } catch(e) {
      // WASM crash → reset solver and continue with next scenario
      if (e && e.message && (e.message.includes("memory") || e.message.includes("Aborted") || e.message.includes("RuntimeError"))) {
        console.warn("[Frontier] WASM crash at " + label + ", resetting solver...");
        try {
          const highs = await import('./highs.js');
          highs.highsLib = null;
          highs.highsPromise = null;
          await new Promise(r => setTimeout(r, 100));
          await getHighsSolver();
          solvesSinceReset = 0;
        } catch(e2) {}
      }
    }
    if (onProgress) onProgress(totalSolves);
  };

  // ESG-Achse: 0% bis 80% in 5%-Schritten (17 Punkte)
  for (let esg = 0; esg <= 80; esg += 5) {
    await trySolve("ESG " + esg + "%", { minGreen: esg });
  }
  // Duration-Achse: 2.0 bis 6.0 in 0.1er-Schritten (41 Punkte)
  for (let dur = 2.0; dur <= 6.05; dur += 0.1) {
    const d = Math.round(dur * 10) / 10; // Float-Drift vermeiden
    await trySolve("Dur " + d.toFixed(1), { pfMinDur: (d - 0.05).toFixed(2), pfMaxDur: (d + 0.05).toFixed(2) });
  }
  // Rating-Achse: BBB+ bis AA in 0.1-Notch-Schritten (ln = 8.0 bis 3.0, 51 Punkte)
  for (let ln = 80; ln >= 30; ln--) {
    const lnVal = ln / 10;
    await trySolve("Rating ≥ " + lnVal.toFixed(1), { minRatingLn: String(lnVal) });
  }

  // Hauptergebnis als Punkt hinzufügen
  feasibleAll.push({ result: mainResult, stats: mainStats, label: "Hauptergebnis" });

  // buildFrontier analog zu runAutoOptimize
  const buildFrontier = (xExtract, xLabel, xUnit, binSize, inverted) => {
    const points = feasibleAll.map(f => ({ x: xExtract(f.stats), y: f.stats.wY }));
    if (points.length === 0) return { line: [], cloud: [], xLabel, xUnit };
    const cloud = points;
    const bins = {};
    points.forEach(p => { const bk = Math.round(p.x / binSize) * binSize; if (!bins[bk] || p.y > bins[bk]) bins[bk] = p.y; });
    const line = Object.entries(bins).map(([x, y]) => ({ x: parseFloat(x), y })).sort((a, b) => inverted ? b.x - a.x : a.x - b.x);
    const envelope = [];
    let maxY = -Infinity;
    for (const p of (inverted ? [...line].reverse() : line)) { if (p.y > maxY) { maxY = p.y; envelope.push(p); } }
    if (inverted) envelope.reverse();
    return { line: envelope, cloud, xLabel, xUnit, p0x: xExtract(mainStats), p0y: mainStats.wY };
  };

  const frontiers = {
    esg: buildFrontier(s => s.gP * 100, "ESG-Quote", "%", 1, false),
    rating: buildFrontier(s => s.wLn, "Ø Rating", "", 0.1, true),
    duration: buildFrontier(s => s.wD, "Ø Duration", "J", 0.05, true),
  };
  frontiers._totalSolves = totalSolves;
  frontiers._feasible = feasibleCount;
  frontiers._alternatives = feasibleAll.filter(f => f.label !== "Hauptergebnis");
  return frontiers;
}
