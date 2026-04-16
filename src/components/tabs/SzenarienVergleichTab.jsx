// SzenarienVergleichTab.jsx — Tab 4: Szenarien-Vergleich
import React from 'react';
import {
  ScenarioKpiGrid, ScenarioCompareTable, ScenarioProfileSection,
  ScenarioOverlapPanel, ScenarioRiskPanel, ScenarioRVHeatmap,
  ScenarioConstraintPanel, ScenarioCharts,
} from '../scenario/index.js';
import { ScatterMatrix } from '../tables/index.js';
import { CollapsibleSection } from '../layout/index.js';
import { REPORT_COLORS } from '../deepdive/deepdiveUtils.js';

// ScenarioDistPanel — try importing from scenario barrel
let ScenarioDistPanel;
try {
  ScenarioDistPanel = require('../scenario/index.js').ScenarioDistPanel;
} catch (_) {}
if (!ScenarioDistPanel) {
  ScenarioDistPanel = ({ scenarios, bm }) => <div className="text-slate-400 text-xs">Distribution panel loading...</div>;
}

export default function SzenarienVergleichTab(props) {
  const {
    savedScenarios, selectedScenarioIds, setSelectedScenarioIds,
    benchmarkRef, globalMkt, benchmarkBonds,
    SC_SECTIONS, isSectionHidden,
    universeProfiles, universe,
    scLayout,
  } = props;

  const COLORS = REPORT_COLORS || ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'];

  const bRef = benchmarkRef || globalMkt;
  const bmLabel = bRef && bRef._custom ? "Benchmark" : "Markt O";

  // Guard: savedScenarios may be undefined
  const safeScenarios = savedScenarios || [];

  const enrichedScenarios = safeScenarios.map((s, i) => ({ ...s, _color: COLORS[i % COLORS.length] }));
  const selScenarios = enrichedScenarios.filter(s => selectedScenarioIds && selectedScenarioIds.has(s.id));

  const toggleScId = (id) => setSelectedScenarioIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); }
    else next.add(id);
    return next;
  });
  // Guard: use safeScenarios instead of savedScenarios directly
  const selectAll = () => setSelectedScenarioIds(new Set(safeScenarios.map(s => s.id)));

  const allScBonds = selScenarios.flatMap((sc, idx) => (sc.bonds || []).map(b => ({ ...b, _scName: sc.name, _scColor: sc._color, _scIdx: idx })));

  const scRender = {
    sc_kpi: () => <ScenarioKpiGrid scenarios={selScenarios} bm={bRef} />,
    sc_table: () => <ScenarioCompareTable scenarios={selScenarios} bm={bRef} />,
    sc_profile: () => <ScenarioProfileSection scenarios={selScenarios} bm={bRef} bmBonds={benchmarkBonds} />,
    sc_overlap: () => <ScenarioOverlapPanel scenarios={selScenarios} />,
    sc_risk: () => <ScenarioRiskPanel scenarios={selScenarios} bm={bRef} bmBonds={benchmarkBonds} />,
    sc_rv: () => <ScenarioRVHeatmap scenarios={selScenarios} bm={bRef} bmBonds={benchmarkBonds} />,
    sc_constraints: () => <ScenarioConstraintPanel scenarios={selScenarios} bm={bRef} />,
    sc_charts: () => <ScenarioCharts scenarios={selScenarios} bm={bRef} />,
    sc_scatter: () => <ScatterMatrix activeBonds={allScBonds} backgroundBonds={[]} universeProfiles={universeProfiles} universe={universe} />,
    sc_dist: () => <ScenarioDistPanel scenarios={selScenarios} bm={bRef} />,
  };

  const scDefs = SC_SECTIONS ? Object.fromEntries(SC_SECTIONS.map(d => [d.id, d])) : {};

  if (safeScenarios.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-slate-500">
        <div className="text-5xl mb-4">📊</div>
        <div className="text-lg font-black text-slate-700">Keine Szenarien gespeichert</div>
        <div className="text-sm mt-2 text-slate-500">Speichern Sie Optimierungsergebnisse als Szenarien ueber den Optimierer-Tab.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Scenario selector */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">📊</span>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Szenarien-Vergleich</h2>
          <button onClick={selectAll} className="ml-auto text-xs font-bold text-spark-600 hover:text-spark-700 transition-colors">Alle auswaehlen</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {enrichedScenarios.map(sc => (
            <button
              key={sc.id}
              onClick={() => toggleScId(sc.id)}
              className={"px-3 py-1.5 rounded-xl text-xs font-bold border transition-all " +
                (selectedScenarioIds && selectedScenarioIds.has(sc.id)
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
              style={selectedScenarioIds && selectedScenarioIds.has(sc.id) ? { backgroundColor: sc._color } : {}}
            >
              {sc.icon || "📊"} {sc.name}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-slate-400">{selScenarios.length} von {safeScenarios.length} Szenarien ausgewaehlt -- {bmLabel}</div>
      </div>

      {scLayout && scLayout.sections ? scLayout.sections.map(sec => {
        const def = scDefs[sec.id];
        if (!def || !scRender[sec.id] || (isSectionHidden && isSectionHidden(sec.id))) return null;
        return (
          <CollapsibleSection
            key={sec.id} id={sec.id} title={def.title} icon={def.icon}
            collapsed={sec.collapsed} pinned={sec.pinned}
            onToggle={scLayout.toggle} onPin={scLayout.pin}
            onMoveUp={(id) => scLayout.move(id, -1)}
            onMoveDown={(id) => scLayout.move(id, 1)}
          >
            {!sec.collapsed && <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">{scRender[sec.id]()}</div>}
          </CollapsibleSection>
        );
      }) : SC_SECTIONS && SC_SECTIONS.map(def => {
        if (!scRender[def.id] || (isSectionHidden && isSectionHidden(def.id))) return null;
        return (
          <div key={def.id} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-4">{def.icon} {def.title}</h3>
            {scRender[def.id]()}
          </div>
        );
      })}
    </div>
  );
}
