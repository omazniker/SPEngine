import React from 'react';
// OptimiererTab.jsx — Tab 0: Preset-Karussell, Dual-Solver-Bar, Settings, Ergebnisse
// Receives state and callbacks as props from App/MainApp.
// Constants and utils are imported directly — not expected as props.

import { OBJ } from '../../data/objectives.js';
import { DEFAULT_PRESETS } from '../../data/presets.js';
import { fx, fmtVol } from '../../utils/format.js';
import { stats } from '../../utils/stats.js';

export default function OptimiererTab(props) {
  const {
    // Preset-related
    visiblePresets, obj, green, applyPreset, setPresetEdit, deletePreset,
    userPresets, resetPresets, hiddenPresets,
    // Solver state
    solverRunning, solverPhase, multiStrategy, selectedStrategies,
    runMIP, runLP, runGreedy, solverAvail, toggleSolver,
    // Solve action
    doRun,
    // Bestand
    useBestand, setUseBestand, pf, budget,
    // Log / result
    log, result, resultsRef,
    // Settings panel
    showSettings, setShowSettings, cfg,
    clearRestrictions, getCurrentCfg, saveAsScenario, savedFeedback,
    // Settings panel inner content (passed as render props or children if needed)
    settingsContent,
    // Results area
    resultsArea,
    // Multi-strategy
    solverResults, setSolverResults, setPrimarySolver, primarySolverRef,
    // Lexicographic
    lexChain,
    // Run functions
    optimizeMIP_v2, optimizeLP, optimize, solveLexicographic,
    solverAvailRef, sanitizeCfg, setResult, setAltResult,
    setObj, setSolverRunning, setSolverPhase,
    universe,
    // Callbacks
    setLog,
  } = props;

  // Use safe defaults for arrays that may be undefined
  const safeVisiblePresets = visiblePresets || [];
  const safeUserPresets = userPresets || [];
  const safeSelectedStrategies = selectedStrategies || [];
  const safePf = pf || [];

  return (
    <div className="space-y-6">
      {/* ═══ PRESET CAROUSEL ═══ */}
      <div className="preset-carousel grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {safeVisiblePresets.map((p) => (
          <div key={p.id} className={"preset-tile relative bg-white border rounded-xl text-center hover:shadow-md transition-all group cursor-pointer " + (obj === p.o && green === p.g ? "border-spark-300 ring-1 ring-spark-500/20 shadow-sm bg-spark-50/40" : "border-slate-200 hover:border-slate-300")}
            onClick={() => applyPreset(p)}>
            <div className="preset-icon text-lg mb-0.5 group-hover:scale-110 transition-transform">{p.i}</div>
            <div className="preset-label font-bold text-slate-700 leading-tight">{p.n}</div>
            {p.cfg && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-spark-400" title="Inkl. Solver-Einstellungen"></div>}
            <div className="absolute top-0.5 left-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); setPresetEdit({ mode: "edit", preset: p }); }} className="w-5 h-5 rounded bg-white/90 border border-slate-200 text-[9px] hover:bg-spark-50 hover:border-spark-300 flex items-center justify-center shadow-sm touch-target-44" aria-label="Strategie bearbeiten">✏️</button>
              <button onClick={(e) => { e.stopPropagation(); deletePreset(p.id); }} className="w-5 h-5 rounded bg-white/90 border border-slate-200 text-[9px] hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center shadow-sm touch-target-44" aria-label="Strategie löschen">🗑</button>
            </div>
          </div>
        ))}
        <button onClick={() => setPresetEdit({ mode: "new" })} className="preset-tile bg-white border-2 border-dashed border-slate-200 rounded-xl text-center hover:border-spark-400 hover:bg-spark-50/30 transition-all group">
          <div className="preset-icon text-lg mb-0.5 text-slate-300 group-hover:text-spark-500 transition-colors">+</div>
          <div className="preset-label font-bold text-slate-400 group-hover:text-spark-600">Neue Strategie</div>
        </button>
        {JSON.stringify(safeUserPresets.map(p=>p.id).sort()) !== JSON.stringify(DEFAULT_PRESETS.map(p=>p.id).sort()) && (
          <button onClick={resetPresets} className="preset-tile bg-white border border-slate-200 rounded-xl text-center hover:bg-slate-50 transition-all group" title="Standard-Strategien wiederherstellen">
            <div className="preset-icon text-lg mb-0.5 text-slate-300 group-hover:text-slate-500">↺</div>
            <div className="preset-label font-bold text-slate-400 group-hover:text-slate-600">Standard</div>
          </button>
        )}
      </div>

      {/* ═══ STICKY DUAL-SOLVER BAR ═══ */}
      <div className="sticky top-[52px] z-40 glass-strong border border-slate-200/60 rounded-2xl p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <button
            onClick={multiStrategy && safeSelectedStrategies.length > 1 ? async () => {
              setSolverRunning(true); setSolverPhase("Multi-Strategie: 0/" + safeSelectedStrategies.length);
              const allResults = [];
              const solveFn = async (p, c) => {
                if (runMIP && solverAvailRef.current.mip === "ready") return await optimizeMIP_v2(p, c);
                if (runLP && solverAvailRef.current.lp === "ready") return await optimizeLP(p, c);
                return optimize(p, c);
              };
              try {
                for (let si = 0; si < safeSelectedStrategies.length; si++) {
                  const sKey = safeSelectedStrategies[si];
                  const preset = safeUserPresets.find(p => p.o === sKey);
                  const presetGreen = preset ? preset.g : 0;
                  setSolverPhase((si+1) + "/" + safeSelectedStrategies.length + ": " + (OBJ[sKey] || sKey) + "...");
                  const cleanCfg = sanitizeCfg({ ...cfg, obj: sKey, minGreen: presetGreen });
                  const runCfg = useBestand && safePf.length > 0 ? { ...cleanCfg, lockedBonds: safePf } : cleanCfg;
                  let bestR = null, bestS = null, bestLabel = "";
                  try {
                    if (sKey === "esgYield") {
                      const p1Cfg = { ...runCfg, obj: "_maxEsg", minGreen: 0, _noRelaxEsg: true };
                      let p1R = await solveFn(universe, p1Cfg);
                      let maxEsgPct = p1R && p1R.length ? Math.round(stats(p1R).gP * 100) : 0;
                      if (maxEsgPct > 0) {
                        for (let tryEsg = maxEsgPct; tryEsg >= 0; tryEsg -= 5) {
                          const p2Cfg = { ...runCfg, obj: "yield", minGreen: tryEsg, _noRelaxEsg: true };
                          const p2R = await solveFn(universe, p2Cfg);
                          if (p2R && p2R.length > 0) { bestR = p2R; bestS = stats(bestR); bestLabel = "ESG " + tryEsg + "%→Yield"; break; }
                        }
                      }
                      if (!bestR) { bestR = await solveFn(universe, { ...runCfg, obj: "yield", minGreen: 0 }); bestS = bestR && bestR.length ? stats(bestR) : null; bestLabel = "Yield (ESG Fallback)"; }
                    } else if (sKey === "lexicographic") {
                      const { result: lexR } = await solveLexicographic(universe, runCfg, lexChain, solveFn);
                      if (lexR && lexR.length > 0) { bestR = lexR; bestS = stats(bestR); bestLabel = "Lex"; }
                    } else if (sKey === "autoOptimize") {
                      bestLabel = "Skip (Auto-Optimize nur einzeln)";
                    } else {
                      bestR = await solveFn(universe, runCfg);
                      bestS = bestR && bestR.length ? stats(bestR) : null;
                      bestLabel = runMIP && solverAvailRef.current.mip === "ready" ? "MIP" : runLP && solverAvailRef.current.lp === "ready" ? "LP" : "Greedy";
                    }
                  } catch(e) { console.warn("[Multi] " + sKey + " failed:", e.message); bestR = optimize(universe, runCfg); bestS = bestR.length ? stats(bestR) : null; bestLabel = "Greedy (Fallback)"; }
                  if (bestR && bestR.length > 0 && bestS) {
                    allResults.push({ r: bestR, s: bestS, label: (preset?.n || OBJ[sKey] || sKey) + " [" + bestLabel + "]", icon: preset?.i || "📊", key: "multi_" + sKey });
                  }
                }
                if (allResults.length > 0) {
                  setResult(allResults[0].r); setAltResult(allResults.length > 1 ? allResults[1].r : null);
                  setSolverResults(allResults);
                  setPrimarySolver(allResults[0].key); primarySolverRef.current = allResults[0].key;
                  setLog("🔀 Multi-Strategie: " + allResults.length + " Strategien berechnet — " + allResults.map(r => r.label + " (" + fx(r.s.wY, 2) + "%)").join(" | "));
                }
              } finally { setSolverRunning(false); setSolverPhase(""); setObj(safeSelectedStrategies[0]); setTimeout(() => { if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120); }
            } : doRun}
            disabled={solverRunning || (multiStrategy && safeSelectedStrategies.length === 0)}
            className={
              "solver-btn flex-1 text-white font-black transition-all shadow-md active:scale-[0.97] " +
              (solverRunning
                ? "bg-slate-400 cursor-wait shadow-none"
                : "bg-gradient-to-r from-spark-500 via-spark-600 to-spark-700 hover:opacity-90 shadow-spark-500/20")
            }
          >
            {solverRunning
              ? <><svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Berechnung läuft...</>
              : multiStrategy && safeSelectedStrategies.length > 1
                ? "🔀 " + safeSelectedStrategies.length + " Strategien berechnen"
                : "🔀 Solver starten"}
          </button>
          {solverRunning && solverPhase && (
            <div className="text-[11px] text-slate-500 font-medium text-center animate-pulse whitespace-nowrap">{solverPhase}</div>
          )}
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <button
              onClick={() => toggleSolver("mip")}
              className={"solver-toggle font-bold border transition-all " +
                (solverAvail.mip === "error"
                  ? "bg-amber-50 border-amber-300 text-amber-600 opacity-70"
                  : runMIP ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm ring-1 ring-emerald-300" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600")}
              title={solverAvail.mip === "error" ? "MIP-Solver nicht verfügbar" : solverAvail.mip === "ready" ? "HiGHS MIP-Solver — empfohlen (mathematisch optimal)" : "HiGHS MIP-Solver (wird geladen...)"}
            >{solverAvail.mip === "error" ? "⚠" : "🎯"} MIP{solverAvail.mip === "pending" ? "…" : ""}{runMIP && solverAvail.mip === "ready" ? " ✓" : ""}</button>
            <button
              onClick={() => toggleSolver("lp")}
              className={"solver-toggle font-bold border transition-all " +
                (solverAvail.lp === "error"
                  ? "bg-amber-50 border-amber-300 text-amber-600 opacity-70"
                  : runLP ? "bg-spark-50 border-spark-400 text-spark-700 shadow-sm" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600")}
              title={solverAvail.lp === "error" ? "LP-Solver nicht verfügbar" : solverAvail.lp === "ready" ? "Linearer LP-Solver (schnelle Näherung)" : "Linearer LP-Solver (wird geladen...)"}
            >{solverAvail.lp === "error" ? "⚠" : "🧮"} Linear{solverAvail.lp === "pending" ? "…" : ""}</button>
            <button
              onClick={() => toggleSolver("greedy")}
              className={"solver-toggle font-bold border transition-all " +
                (runGreedy ? "bg-slate-100 border-slate-300 text-slate-600 shadow-sm" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600")}
              title="Heuristischer Greedy-Solver (Fallback, lokal)"
            >⚡ Heuristik</button>
          </div>
          {(solverAvail.lp === "error" || solverAvail.mip === "error") && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[10px] font-bold text-amber-700">
                Eingeschränkter Modus: {[solverAvail.lp === "error" && "LP", solverAvail.mip === "error" && "MIP"].filter(Boolean).join(" + ")}-Solver nicht verfügbar. {solverAvail.mipErr && <span style={{fontSize:"9px",opacity:0.7}}>({solverAvail.mipErr})</span>} Greedy-Heuristik verfügbar.
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-2 sm:ml-0">
            <button
              onClick={() => setUseBestand(!useBestand)}
              className={"px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all whitespace-nowrap " +
                (useBestand
                ? "bg-spark-50 border-spark-400 text-spark-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600")}
            >📂 Bestand{useBestand && safePf.length > 0 ? ` (${safePf.length})` : ""}</button>
            {useBestand && safePf.length > 0 && (() => {
              const lockedVol = safePf.reduce((a,b) => a + (b.nom||0), 0);
              const frei = Math.max(0, budget - lockedVol);
              return <span className="text-[9px] font-bold whitespace-nowrap">
                <span className="text-spark-600">{fx(lockedVol, 1)} Mio. € fix</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className={frei > 0 ? "text-emerald-600" : "text-rose-500"}>{fx(frei, 1)} Mio. € frei</span>
                {lockedVol > budget && <span className="text-rose-500 ml-1">⚠ Budget zu niedrig</span>}
              </span>;
            })()}
            {useBestand && safePf.length === 0 && <span className="text-[9px] text-rose-500 font-bold">Kein Bestand geladen</span>}
          </div>
        </div>
        {log && (
          <div className={"mt-2 text-[11px] font-medium px-1 " + (log.includes("⚠️ Nebenbedingung") ? "text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 whitespace-normal" : "text-slate-500 truncate")}>{log}</div>
        )}
      </div>

      {/* ═══ SETTINGS + RESULTS (rendered by parent via settingsContent / resultsArea) ═══ */}
      <div className="space-y-4">
        {settingsContent}
      </div>

      {/* Results area passed from parent */}
      {resultsArea}
    </div>
  );
}
