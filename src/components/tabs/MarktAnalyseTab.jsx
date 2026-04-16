// MarktAnalyseTab.jsx — Tab 1: Markt-Analyse (Universum-Uebersicht, Filter, Stats, Scatter, Verteilungen, RV, Emittenten, DZ, Anleihen)
import React from 'react';
import { StatsGrid, DistributionPanels, RVHeatmap, IssuerTable, BondTable, ScatterMatrix, UniverseFilter } from '../tables/index.js';
import { CollapsibleSection, Flag } from '../layout/index.js';
import { DZ_EMITTENTEN_DATA } from '../../data/dzEmittenten.js';
import { MASTERLISTE_TICKERS } from '../../data/masterliste.js';
import { CN } from '../../data/countries.js';

// Constants that may not have dedicated data modules yet — define inline as fallbacks
const DZ_RATING_COLORS_DEFAULT = { LR: '#22c55e', MR: '#f59e0b', ER: '#ef4444', NR: '#94a3b8' };
const CT_COLORS_DEFAULT = { positiv: '#16a34a', stabil: '#64748b', negativ: '#dc2626', 'n.a.': '#94a3b8' };
const CT_ICONS_DEFAULT = { positiv: '\u2197', stabil: '\u2192', negativ: '\u2198', 'n.a.': '\u2013' };

// UniverseProfileBar is a layout-level component — try import, fallback to stub
let UniverseProfileBar;
try {
  // This may be defined in the tables barrel or as a standalone component
  UniverseProfileBar = require('../tables/index.js').UniverseProfileBar;
} catch (_) {}
if (!UniverseProfileBar) {
  UniverseProfileBar = ({ profiles, onSave, onLoad, onDelete, onUpdate, onReset, onExport, activeProfileId }) => null;
}

export default function MarktAnalyseTab(props) {
  const {
    // Market data
    displayMktStats, displayMarketPortfolio, marketPortfolio, filteredMarketPortfolio, setFilteredMarketPortfolio,
    globalMkt,
    // Dataset
    activeDatasetId, setActiveDatasetId, datasets,
    // Callbacks
    openDetails, openIssuerDetails,
    handleExportUniversum,
    // Universe profiles
    universeProfiles, saveUniverseProfile, loadUniverseProfile, deleteUniverseProfile,
    updateUniverseProfile, resetAndDeselectProfile, exportAllProfiles, activeProfileId,
    // Filter state
    marketFilter,
    // DZ research
    dzFilter, setDzFilter, dzRatingFilter, setDzRatingFilter,
    dzSortKey, setDzSortKey, dzSortDir, setDzSortDir,
    // Layout
    mktLayout, MKT_SECTIONS, isSectionHidden,
    // Universe prop
    universe,
  } = props;

  // Use props if provided, otherwise use defaults/imports
  const DZ_RATING_COLORS = props.DZ_RATING_COLORS || DZ_RATING_COLORS_DEFAULT;
  const CT_COLORS = props.CT_COLORS || CT_COLORS_DEFAULT;
  const CT_ICONS = props.CT_ICONS || CT_ICONS_DEFAULT;

  const mktRender = {
    mkt_header: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
          <span className="text-xl">🌍</span>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Universum-Uebersicht</h2>
            <p className="text-xs text-slate-500 font-medium">
              Analyse des {displayMktStats?.nb ?? 0}-Anleihen Universums (emissionsvolumengewichtet)
              {filteredMarketPortfolio && filteredMarketPortfolio.length !== marketPortfolio.length && (
                <span className="text-spark-600 font-bold ml-1">-- gefiltert</span>
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400">📂</span>
              <select value={activeDatasetId} onChange={e => setActiveDatasetId(e.target.value)} className="text-[10px] font-bold text-slate-600 bg-transparent border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer hover:border-spark-400 focus:outline-none focus:ring-1 focus:ring-spark-400 transition-all">
                {(datasets || []).map(d => <option key={d.id} value={d.id}>{d.name} ({d.data.length})</option>)}
              </select>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={handleExportUniversum} className="px-2.5 py-1.5 bg-slate-700 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-slate-600 transition-all flex items-center gap-1" title="Universum als XLSX exportieren (Gesamt + Gefiltert + Richtlinien-konform)">
              <span>📥</span> Universum XLSX
            </button>
          </div>
        </div>
        <UniverseProfileBar profiles={universeProfiles} onSave={saveUniverseProfile} onLoad={loadUniverseProfile} onDelete={deleteUniverseProfile} onUpdate={updateUniverseProfile} onReset={resetAndDeselectProfile} onExport={exportAllProfiles} activeProfileId={activeProfileId} />
        <UniverseFilter bonds={marketPortfolio} onFilteredBondsChange={setFilteredMarketPortfolio} filter={marketFilter} />
      </div>
    ),
    mkt_stats: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <StatsGrid s={displayMktStats} mkt={globalMkt} isMarket={true} />
      </div>
    ),
    mkt_scatter: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <ScatterMatrix activeBonds={displayMarketPortfolio} backgroundBonds={[]} filter={marketFilter} allBonds={marketPortfolio} universeProfiles={universeProfiles} universe={universe} />
      </div>
    ),
    mkt_dist: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <DistributionPanels s={displayMktStats} isMarket={true} />
      </div>
    ),
    mkt_rv: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <RVHeatmap bonds={displayMarketPortfolio} onBondClick={openDetails} />
      </div>
    ),
    mkt_issuer: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <IssuerTable pf={displayMarketPortfolio} onIssuerClick={(i) => openIssuerDetails(i, displayMarketPortfolio)} filter={marketFilter} allBonds={marketPortfolio} />
      </div>
    ),
    mkt_dz: () => {
      const dzData = DZ_EMITTENTEN_DATA || [];
      const doSort = (k) => { if (dzSortKey === k) setDzSortDir(d => d * -1); else { setDzSortKey(k); setDzSortDir(1); } };
      const filtered = dzData.filter(e => {
        if (dzRatingFilter !== "ALL" && e.dz !== dzRatingFilter) return false;
        if (!dzFilter) return true;
        const q = dzFilter.toLowerCase();
        return e.n.toLowerCase().includes(q) || e.co.toLowerCase().includes(q) || (CN[e.co]||"").toLowerCase().includes(q) || (e.t||"").toLowerCase().includes(q);
      }).sort((a,b) => {
        const va = a[dzSortKey] || "", vb = b[dzSortKey] || "";
        return dzSortDir * va.localeCompare(vb);
      });
      const counts = {ALL:dzData.length, LR:0, MR:0, ER:0, NR:0};
      dzData.forEach(e => counts[e.dz]++);
      return (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-800">📑 DZ BANK Kurzuebersicht Emittenten</h3>
            <span className="text-xs text-slate-400">Stand: Spread-Report 18.03.2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {["ALL","LR","MR","ER","NR"].map(r => (
              <button key={r} onClick={() => setDzRatingFilter(r)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${dzRatingFilter===r ? "text-white border-transparent shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                style={dzRatingFilter===r ? {backgroundColor: r==="ALL"?"#334155":DZ_RATING_COLORS[r]} : {}}>
                {r==="ALL"?"Alle":r} ({counts[r]})
              </button>
            ))}
            <input value={dzFilter} onChange={e=>setDzFilter(e.target.value)} placeholder="🔍 Suche..." className="ml-auto px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-48 focus:ring-1 focus:ring-blue-400 outline-none" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[{k:"n",l:"Emittent",w:"180px"},{k:"co",l:"Land",w:"50px"},{k:"dz",l:"DZ",w:"40px"},{k:"ct",l:"Trend",w:"50px"},{k:"esg",l:"ESG",w:"35px"},{k:"lr",l:"Langfristrating (Mo/S&P/Fi)",w:"220px"},{k:"sp",l:"SP Rating (Mo/S&P/Fi)",w:"160px"},{k:"snp",l:"SNP Rating (Mo/S&P/Fi)",w:"160px"}].map(c => (
                    <th key={c.k} onClick={()=>doSort(c.k)} className="px-2 py-2 text-left font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap" style={{minWidth:c.w}}>
                      {c.l} {dzSortKey===c.k?(dzSortDir===1?"▲":"▼"):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e,i) => {
                  const tickers = MASTERLISTE_TICKERS || [];
                  const inUni = e.t && tickers.includes(e.t);
                  return (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                      <td className="px-2 py-1.5 font-medium text-slate-800">
                        {e.n}
                        {!inUni && <span className="ml-1 text-[10px] text-amber-500" title="Nicht im Universum">⚠</span>}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500" title={CN[e.co]||e.co}><span className="flex items-center gap-1"><Flag c={e.co} />{e.co}</span></td>
                      <td className="px-2 py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{backgroundColor:DZ_RATING_COLORS[e.dz]}}>{e.dz}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span style={{color:CT_COLORS[e.ct]}} className="font-bold">{CT_ICONS[e.ct]||"\u2013"}</span>
                        <span className="ml-1 text-slate-400">{e.ct}</span>
                      </td>
                      <td className="px-2 py-1.5 text-center">{e.esg==="Ja"?"\u2705":e.esg==="Nein"?"\u274C":"\u2013"}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600">{e.lr}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">{e.sp}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">{e.snp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>{filtered.length} von {dzData.length} Emittenten</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.LR}}></span> LR = Low Risk</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.MR}}></span> MR = Moderate Risk</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.ER}}></span> ER = Elevated Risk</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.NR}}></span> NR = Not Rated</span>
            <span>⚠ = Nicht im Universum</span>
          </div>
        </div>
      );
    },
    mkt_bonds: () => (
      <BondTable bonds={displayMarketPortfolio} s={displayMktStats} showN={false} onBondClick={openDetails} filter={marketFilter} allBonds={marketPortfolio} universeProfiles={universeProfiles} universe={universe} />
    ),
  };

  const mktDefs = MKT_SECTIONS ? Object.fromEntries(MKT_SECTIONS.map(d => [d.id, d])) : {};

  return (
    <div className="space-y-3">
      {mktLayout && mktLayout.sections ? mktLayout.sections.map(sec => {
        const def = mktDefs[sec.id];
        if (!def || !mktRender[sec.id] || (isSectionHidden && isSectionHidden(sec.id))) return null;
        return (
          <CollapsibleSection
            key={sec.id} id={sec.id} title={def.title} icon={def.icon}
            collapsed={sec.collapsed} pinned={sec.pinned}
            onToggle={mktLayout.toggle} onPin={mktLayout.pin}
            onMoveUp={(id) => mktLayout.move(id, -1)}
            onMoveDown={(id) => mktLayout.move(id, 1)}
          >
            {!sec.collapsed && mktRender[sec.id]()}
          </CollapsibleSection>
        );
      }) : (
        <div className="text-slate-400 text-center py-8">Markt-Analyse wird geladen...</div>
      )}
    </div>
  );
}
