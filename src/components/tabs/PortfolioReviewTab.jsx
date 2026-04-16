// PortfolioReviewTab.jsx — Tab 2: Portfolio-Review
import React from 'react';
import { StatsGrid, ComparisonPanels, ScatterMatrix, DistributionPanels, IssuerTable, BondTable } from '../tables/index.js';
import { CollapsibleSection } from '../layout/index.js';
import { LBL } from '../../data/ratings.js';
import { fx, fmtVol } from '../../utils/format.js';

// Simple Tag component for rating display
const Tag = ({ c, children }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-slate-100 text-slate-500',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[c] || colors.blue}`}>{children}</span>;
};

export default function PortfolioReviewTab(props) {
  const {
    pS, pf, result,
    benchmarkRef, globalMkt,
    setTab, openDetails, openIssuerDetails,
    handleExportExcel,
    pfLayout, PF_SECTIONS, isSectionHidden,
    universeProfiles, universe,
  } = props;

  if (!pS) {
    return (
      <div className="space-y-3">
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-slate-500">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-lg font-black text-slate-700">Kein Portfolio vorhanden</div>
          <div className="text-sm mt-2 text-slate-500">Bitte erstellen Sie zunaechst ein Portfolio ueber den Optimierer.</div>
          <button onClick={() => setTab(0)} className="mt-6 px-6 py-3 bg-spark-50 text-spark-600 text-sm font-bold rounded-xl hover:bg-spark-100 transition-colors">Zum Optimierer wechseln</button>
        </div>
      </div>
    );
  }

  const bRef = benchmarkRef || globalMkt;
  const bmLabel = bRef._custom ? "Benchmark" : "Markt O";
  const hasLocked = pf.some(b => b.locked);
  const bestandBonds = hasLocked ? pf.filter(b => b.locked) : [];
  const neuBonds = hasLocked ? pf.filter(b => !b.locked) : [];

  const rows = [
    { label: "Portfoliovolumen", unit: "", m: bRef.tN, p: pS.tN, d: 0, fmt: 0, neutral: true, isVol: true },
    { label: "Anzahl Positionen", unit: "", m: bRef.nb, p: pS.nb, d: 0, fmt: 0, neutral: true },
    { label: "Anzahl Emittenten", unit: "", m: bRef.ni, p: pS.ni, d: 0, fmt: 0, neutral: true },
    { label: "Preis O", unit: "", m: bRef.wPx, p: pS.wPx, d: 2, fmt: 2, up: false, neutral: true },
    { label: "Laufzeit", unit: " Y", m: bRef.wM, p: pS.wM, d: 2, fmt: 2, up: false },
    { label: "Macaulay Duration", unit: " Y", m: bRef.wMacD, p: pS.wMacD, d: 2, fmt: 2, up: false },
    { label: "Modified Duration", unit: "", m: bRef.wD, p: pS.wD, d: 2, fmt: 2, up: false },
    { label: "Kupon O", unit: "%", m: bRef.wK, p: pS.wK, d: 2, fmt: 2, up: true },
    { label: "Rendite O (YTM)", unit: "%", m: bRef.wY, p: pS.wY, d: 2, fmt: 2, up: true },
    { label: "I-Spread O", unit: " bp", m: bRef.wS, p: pS.wS, d: 1, fmt: 1, up: true },
    { label: "Rating O", unit: "", m: bRef.wLn, p: pS.wLn, d: 1, fmt: 1, up: false, isRating: true },
    { label: "ESG-Quote", unit: "%", m: bRef.gP * 100, p: pS.gP * 100, d: 0, fmt: 0, up: true },
    { label: "Risikogewicht O", unit: "%", m: bRef.wR, p: pS.wR, d: 0, fmt: 1, up: false },
    { label: "Rendite / RW", unit: "", m: bRef.yRw, p: pS.yRw, d: 2, fmt: 2, up: true },
    { label: "Rendite je Duration", unit: "", m: bRef.yDur, p: pS.yDur, d: 2, fmt: 2, up: true },
  ];

  const pfRender = {
    pf_compare: () => (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-spark-50 rounded-full blur-3xl -mr-20 -mt-20 z-0 opacity-50"></div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center min-w-0">
              <div className="bg-gradient-to-br from-spark-500 to-spark-700 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg text-white shrink-0">🏆</div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <div className="text-sm sm:text-base uppercase tracking-widest text-slate-800 font-black truncate">Portfoliovergleich</div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {bRef._custom
                    ? <span>Portfolio vs. <span className="text-spark-600 font-bold">Benchmark ({bRef._count} Anleihen)</span></span>
                    : <span>Portfolio vs. {globalMkt.nb} Anleihen im Universum</span>}
                </div>
              </div>
            </div>
            <button onClick={handleExportExcel} className="px-3 sm:px-4 py-2 bg-slate-700 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-sm hover:bg-slate-600 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="text-sm sm:text-base">📥</span> Excel Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[11px] uppercase text-slate-500 font-bold tracking-wider" style={{width: hasLocked ? "22%" : "40%"}}>Metrik</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase font-bold tracking-wider text-slate-500" style={{width: hasLocked ? "13%" : "20%"}}>{bmLabel}</th>
                  {hasLocked && <th className="px-3 py-2 text-center text-[11px] uppercase font-bold tracking-wider text-amber-600" style={{width: "13%"}}>🔒 Bestand</th>}
                  {hasLocked && <th className="px-3 py-2 text-center text-[11px] uppercase font-bold tracking-wider text-emerald-600" style={{width: "13%"}}>+ Neuanlage</th>}
                  <th className="px-3 py-2 text-center text-[11px] uppercase text-spark-600 font-black tracking-wider" style={{width: hasLocked ? "13%" : "20%"}}>S Gesamt</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase text-slate-500 font-bold tracking-wider" style={{width: hasLocked ? "13%" : "20%"}}>Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, ri) => {
                  const delta = r.p - r.m;
                  const good = !r.neutral && (r.up ? (delta > 0.001) : (delta < -0.001));
                  const bad = !r.neutral && (r.up ? (delta < -0.001) : (delta > 0.001));
                  const dCol = good ? "text-spark-600" : bad ? "text-rose-600" : "text-slate-500";
                  const val = (v) => v == null ? <span className="text-slate-300">&mdash;</span> : r.isRating ? <Tag c={v >= 8 && v < 99 ? "gray" : "blue"}>{LBL[Math.round(v)] || "NR"}</Tag> : r.isVol ? fmtVol(v) : `${fx(v, r.fmt)}${r.unit}`;
                  const diff = () => {
                    if (Math.abs(delta) < 0.001) return "-";
                    if (r.isVol) { const sign = delta > 0 ? "+" : "-"; const absD = Math.abs(delta); return `${sign}${absD >= 1000 ? fx(absD / 1000, 1) + " Mrd. EUR" : fx(absD, 0) + " Mio. EUR"}`; }
                    if (r.isRating) return `${delta > 0 ? "+" : ""}${fx(delta, r.d)}`;
                    return `${delta > 0 ? "+" : ""}${fx(delta, r.d)}${r.unit}`;
                  };
                  return (
                    <tr key={r.label} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-slate-800 font-bold">{r.label}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-slate-500 bg-slate-50/50">{val(r.m)}</td>
                      {hasLocked && <td className="px-3 py-3 text-center tabular-nums text-amber-700 bg-amber-50/30">{val(bestandBonds.length ? pS.tN : null)}</td>}
                      {hasLocked && <td className="px-3 py-3 text-center tabular-nums text-emerald-700 bg-emerald-50/30">{val(neuBonds.length ? pS.tN : null)}</td>}
                      <td className="px-3 py-3 text-center tabular-nums text-slate-900 font-black text-sm">{val(r.p)}</td>
                      <td className={"px-3 py-3 text-center tabular-nums font-bold " + dCol}>{diff()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
    pf_stats: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <StatsGrid s={pS} mkt={benchmarkRef || globalMkt} />
      </div>
    ),
    pf_panels: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <ComparisonPanels mkt={benchmarkRef || globalMkt} pf={pS} />
      </div>
    ),
    pf_scatter: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <ScatterMatrix activeBonds={pf} backgroundBonds={[]} universeProfiles={universeProfiles} universe={universe} />
      </div>
    ),
    pf_dist: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <DistributionPanels s={pS} bonds={pf} />
      </div>
    ),
    pf_issuer: () => (
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <IssuerTable pf={pf} onIssuerClick={(i) => openIssuerDetails(i, pf)} />
      </div>
    ),
    pf_bonds: () => (
      <BondTable bonds={pf} s={pS} showN={true} onBondClick={openDetails} />
    ),
  };

  const pfDefs = PF_SECTIONS ? Object.fromEntries(PF_SECTIONS.map(d => [d.id, d])) : {};

  return (
    <div className="space-y-3">
      {pfLayout && pfLayout.sections ? pfLayout.sections.map(sec => {
        const def = pfDefs[sec.id];
        if (!def || !pfRender[sec.id] || (isSectionHidden && isSectionHidden(sec.id))) return null;
        return (
          <CollapsibleSection
            key={sec.id} id={sec.id} title={def.title} icon={def.icon}
            collapsed={sec.collapsed} pinned={sec.pinned}
            onToggle={pfLayout.toggle} onPin={pfLayout.pin}
            onMoveUp={(id) => pfLayout.move(id, -1)}
            onMoveDown={(id) => pfLayout.move(id, 1)}
          >
            {!sec.collapsed && pfRender[sec.id]()}
          </CollapsibleSection>
        );
      }) : (
        <div className="text-slate-400 text-center py-8">Portfolio-Review wird geladen...</div>
      )}
    </div>
  );
}
