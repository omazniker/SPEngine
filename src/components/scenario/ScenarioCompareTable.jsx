import React from 'react';

export default function ScenarioCompareTable({ scenarios, bm }) {
  if (!scenarios.length || !bm) return null;
  const n = scenarios.length;
  const short = n >= 3;
  const METRICS = [
    { label: short ? "Volumen" : "Portfoliovolumen", key: "tN", fmt: 0, unit: "", up: true, neutral: true, isVol: true },
    { label: "Positionen", key: "nb", fmt: 0, unit: "", up: true, neutral: true },
    { label: "Emittenten", key: "ni", fmt: 0, unit: "", up: true, neutral: true },
    { label: short ? "Rendite" : "Rendite Ø", key: "wY", fmt: 3, unit: "%", up: true },
    { label: short ? "Kupon" : "Kupon Ø", key: "wK", fmt: 2, unit: "%", up: true },
    { label: short ? "Spread" : "I-Spread Ø", key: "wS", fmt: 1, unit: " bp", up: true },
    { label: short ? "Duration" : "Mod. Duration", key: "wD", fmt: 2, unit: "", up: false },
    { label: short ? "Laufzeit" : "Laufzeit Ø", key: "wM", fmt: 1, unit: " Y", up: false },
    { label: short ? "Preis" : "Preis Ø", key: "wPx", fmt: 2, unit: "", up: false, neutral: true },
    { label: short ? "Rating" : "Rating Ø", key: "wLn", fmt: 1, unit: "", up: false, isRating: true },
    { label: short ? "ESG" : "ESG-Quote", key: "gP", fmt: 0, unit: "%", up: true, mult: 100 },
    { label: short ? "RW" : "Risikogewicht", key: "wR", fmt: 0, unit: "%", up: false },
    { label: "R/RW", key: "yRw", fmt: 2, unit: "", up: true },
    { label: "R/Dur", key: "yDur", fmt: 2, unit: "", up: true },
    { label: "SP/SU/SNP", key: "_rang", fmt: 0, unit: "%", custom: true, neutral: true },
    { label: short ? "Callable" : "Callable-Anteil", key: "callP", fmt: 0, unit: "%", up: false, mult: 100 },
  ];
  const fmtCell = (m, s) => {
    if (m.custom && m.key === "_rang") return `${fx((s.spP||0)*100,0)} / ${fx((s.suP||0)*100,0)} / ${fx((s.snpP||0)*100,0)}`;
    const v = m.mult ? (s[m.key]||0) * m.mult : (s[m.key]||0);
    if (m.isVol) return fmtVol(v);
    if (m.isRating) return LBL[Math.round(v)] || "NR";
    return fx(v, m.fmt) + m.unit;
  };
  const getVal = (m, s) => m.mult ? (s[m.key]||0) * m.mult : (s[m.key]||0);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-[11px] sm:text-xs">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200">
            <th className="px-3 py-3 text-left text-[10px] uppercase text-slate-500 font-bold tracking-wider sticky left-0 bg-slate-50 z-10" style={{minWidth: short ? "100px" : "140px"}}>Metrik</th>
            <th className="px-3 py-3 text-center text-[10px] uppercase font-bold tracking-wider text-slate-400" style={{minWidth: Math.max(70, 120 - n * 15) + "px"}}>
              <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400" /> BM</div>
            </th>
            {scenarios.map(sc => (
              <th key={sc.id} className="px-3 py-3 text-center text-[10px] uppercase font-bold tracking-wider" style={{minWidth: Math.max(70, 120 - n * 15) + "px", borderTop: `3px solid ${sc._color}`}}>
                <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: sc._color}} /><span style={{color: sc._color}}>{short ? sc.icon : sc.name}</span></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {METRICS.map(m => {
            const bmV = getVal(m, bm);
            const vals = scenarios.map(sc => getVal(m, sc.stats));
            const bestIdx = m.neutral || m.custom ? -1 : vals.reduce((bi, v, i) => {
              if (bi === -1) return i;
              return m.up ? (v > vals[bi] ? i : bi) : (v < vals[bi] ? i : bi);
            }, -1);
            return (
              <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-slate-800 font-bold sticky left-0 bg-white z-10">{m.label}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-400 bg-slate-50/50">{fmtCell(m, bm)}</td>
                {scenarios.map((sc, i) => {
                  const v = getVal(m, sc.stats);
                  const delta = v - bmV;
                  const good = !m.neutral && !m.custom && (m.up ? delta > 0.001 : delta < -0.001);
                  const bad = !m.neutral && !m.custom && (m.up ? delta < -0.001 : delta > 0.001);
                  const isBest = bestIdx === i;
                  return (
                    <td key={sc.id} className={"px-3 py-2.5 text-center tabular-nums " + (isBest ? "font-black text-slate-900" : "text-slate-700")}>
                      <div>{fmtCell(m, sc.stats)}</div>
                      {!m.neutral && !m.custom && <div className={"text-[10px] " + (good ? "text-emerald-600" : bad ? "text-rose-500" : "text-slate-300")}>{delta > 0 ? "+" : ""}{m.isVol ? fx(delta,0) : m.isRating ? fx(delta,1) : fx(delta, m.fmt)}{m.isVol ? "" : m.unit}</div>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
