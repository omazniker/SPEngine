import React from 'react';

export default function ScenarioDistPanel({ scenarios, bm }) {
  if (!scenarios.length || !bm) return null;
  // Top emittents across all scenarios
  const allEmittents = {};
  [bm, ...scenarios.map(s => s.stats)].forEach(s => {
    Object.entries(s.ic || {}).forEach(([e, v]) => { allEmittents[e] = (allEmittents[e] || 0) + v; });
  });
  const topEmittents = Object.entries(allEmittents).sort((a,b) => b[1]-a[1]).slice(0, 12).map(([e]) => e);
  // Top countries
  const allCo = {};
  [bm, ...scenarios.map(s => s.stats)].forEach(s => {
    Object.entries(s.cc || {}).forEach(([c, v]) => { allCo[c] = (allCo[c] || 0) + v; });
  });
  const topCo = Object.entries(allCo).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([c]) => c);
  const fmtPct = (v, total) => total > 0 ? fx(v / total * 100, 1) : "-";
  return (
    <div className="space-y-4">
      {/* Emittenten Heatmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">Top-Emittenten (Gewicht %)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-slate-200">
              <th className="px-2 py-2 text-left font-bold text-slate-500 sticky left-0 bg-white z-10">Emittent</th>
              <th className="px-2 py-2 text-center font-bold text-slate-400">BM</th>
              {scenarios.map(sc => <th key={sc.id} className="px-2 py-2 text-center font-bold" style={{color: sc._color}}>{sc.name}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {topEmittents.map(e => (
                <tr key={e} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700 truncate max-w-[180px] sticky left-0 bg-white z-10" title={e}>{e}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-400">{fmtPct(bm.ic[e]||0, bm.tN)}%</td>
                  {scenarios.map(sc => {
                    const pct = sc.stats.tN > 0 ? (sc.stats.ic[e]||0) / sc.stats.tN * 100 : 0;
                    const bmPct = bm.tN > 0 ? (bm.ic[e]||0) / bm.tN * 100 : 0;
                    const diff = pct - bmPct;
                    return <td key={sc.id} className={"px-2 py-1.5 text-center tabular-nums " + (diff > 1 ? "text-spark-600 font-bold" : diff < -1 ? "text-blue-600" : "text-slate-600")}>{fx(pct, 1)}%</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Länder Heatmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">Top-Länder (Gewicht %)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-slate-200">
              <th className="px-2 py-2 text-left font-bold text-slate-500 sticky left-0 bg-white z-10">Land</th>
              <th className="px-2 py-2 text-center font-bold text-slate-400">BM</th>
              {scenarios.map(sc => <th key={sc.id} className="px-2 py-2 text-center font-bold" style={{color: sc._color}}>{sc.name}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {topCo.map(c => (
                <tr key={c} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700 sticky left-0 bg-white z-10"><Flag c={c} /> {CN[c]||c}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-400">{fmtPct(bm.cc[c]||0, bm.tN)}%</td>
                  {scenarios.map(sc => {
                    const pct = sc.stats.tN > 0 ? (sc.stats.cc[c]||0) / sc.stats.tN * 100 : 0;
                    const bmPct = bm.tN > 0 ? (bm.cc[c]||0) / bm.tN * 100 : 0;
                    const diff = pct - bmPct;
                    return <td key={sc.id} className={"px-2 py-1.5 text-center tabular-nums " + (diff > 2 ? "text-spark-600 font-bold" : diff < -2 ? "text-blue-600" : "text-slate-600")}>{fx(pct, 1)}%</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
