// DeepDiveTab.jsx — Tab 7: Markt-Deep-Dive (12 Analyse-Panels)
import React from 'react';
import {
  DeepDiveBarometer, DeepDiveConcentration, DeepDiveCurve, DeepDiveLiquidity,
  DeepDiveStructure, DeepDiveCarry, DeepDiveESG, DeepDiveRanges,
  DeepDiveSector, DeepDiveRWA, DeepDiveConvexity, DeepDivePeers,
} from '../deepdive/index.js';
import { CollapsibleSection } from '../layout/index.js';

// UniverseProfileBar — try to import, fallback to no-op
let UniverseProfileBar;
try {
  UniverseProfileBar = require('../tables/index.js').UniverseProfileBar;
} catch (_) {}
if (!UniverseProfileBar) {
  UniverseProfileBar = (props) => null;
}

export default function DeepDiveTab(props) {
  const {
    displayMktStats, globalMkt, displayMarketPortfolio,
    universeProfiles, saveUniverseProfile, loadUniverseProfile, deleteUniverseProfile,
    updateUniverseProfile, resetAndDeselectProfile, exportAllProfiles, activeProfileId,
    handleExportDeepDive,
    ddLayout, DD_SECTIONS, isSectionHidden,
  } = props;

  const mkt = displayMktStats || globalMkt || {};
  const bonds = displayMarketPortfolio || [];

  const ddRender = {
    dd_barometer: () => <DeepDiveBarometer stats={mkt} bonds={bonds} />,
    dd_concentration: () => <DeepDiveConcentration stats={mkt} />,
    dd_curve: () => <DeepDiveCurve bonds={bonds} />,
    dd_liquidity: () => <DeepDiveLiquidity bonds={bonds} />,
    dd_structure: () => <DeepDiveStructure stats={mkt} globalStats={globalMkt} />,
    dd_carry: () => <DeepDiveCarry bonds={bonds} />,
    dd_esg: () => <DeepDiveESG bonds={bonds} />,
    dd_ranges: () => <DeepDiveRanges stats={mkt} />,
    dd_sector: () => <DeepDiveSector bonds={bonds} />,
    dd_rwa: () => <DeepDiveRWA bonds={bonds} stats={mkt} />,
    dd_convexity: () => <DeepDiveConvexity bonds={bonds} />,
    dd_peers: () => <DeepDivePeers bonds={bonds} />,
  };

  const ddDefs = DD_SECTIONS ? Object.fromEntries(DD_SECTIONS.map(d => [d.id, d])) : {};

  return (
    <div className="space-y-3">
      <div className="bg-white border border-spark-200 rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔬</span>
          <div>
            <h2 className="text-lg font-black text-slate-800">Markt-Deep-Dive</h2>
            <p className="text-xs text-slate-400">Erweiterte Marktanalyse: Konzentration, Kurven, Carry, ESG, Regulatorik</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">{bonds.length} Anleihen</span>
            <button onClick={handleExportDeepDive} className="px-2.5 py-1.5 bg-slate-700 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-slate-600 transition-all flex items-center gap-1" title="Deep-Dive Daten als XLSX exportieren">
              <span>📥</span> Deep-Dive XLSX
            </button>
          </div>
        </div>
        <UniverseProfileBar profiles={universeProfiles} onSave={saveUniverseProfile} onLoad={loadUniverseProfile} onDelete={deleteUniverseProfile} onUpdate={updateUniverseProfile} onReset={resetAndDeselectProfile} onExport={exportAllProfiles} activeProfileId={activeProfileId} />
      </div>
      {ddLayout && ddLayout.sections ? ddLayout.sections.map(sec => {
        const def = ddDefs[sec.id];
        if (!def || !ddRender[sec.id] || (isSectionHidden && isSectionHidden(sec.id))) return null;
        return (
          <CollapsibleSection
            key={sec.id} id={sec.id} title={def.title} icon={def.icon}
            collapsed={sec.collapsed} pinned={sec.pinned}
            onToggle={ddLayout.toggle} onPin={ddLayout.pin}
            onMoveUp={(id) => ddLayout.move(id, -1)}
            onMoveDown={(id) => ddLayout.move(id, 1)}
          >
            {!sec.collapsed && <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">{ddRender[sec.id]()}</div>}
          </CollapsibleSection>
        );
      }) : (
        <div className="text-slate-400 text-center py-8">Deep-Dive wird geladen...</div>
      )}
    </div>
  );
}
