import React from 'react';

export default function BestandBreakdown({ bonds }) {
  if (!bonds || bonds.length === 0) return null;
  const bestand = bonds.filter(b => b.locked);
  const neu = bonds.filter(b => !b.locked);
  if (bestand.length === 0) return null;
  const calcStats = (arr) => {
    if (arr.length === 0) return { vol: 0, n: 0, iss: 0, wY: 0, wS: 0, wMd: 0, wK: 0, gQ: 0 };
    const tN = arr.reduce((a, b) => a + (b.nom || 0), 0);
    const w = f => tN > 0 ? arr.reduce((a, b) => a + b[f] * ((b.nom || 0) / tN), 0) : 0;
    const gN = arr.filter(b => b.g === 1).reduce((a, b) => a + (b.nom || 0), 0);
    return { vol: tN, n: arr.length, iss: new Set(arr.map(b => b.e)).size, wY: w("y"), wS: w("s"), wMd: w("md"), wK: w("k"), gQ: tN > 0 ? gN / tN * 100 : 0 };
  };
  const sB = calcStats(bestand), sN = calcStats(neu), sG = calcStats(bonds);
  const rows = [
    { l: "Volumen (Mio. €)", b: fmtVol(sB.vol), n: fmtVol(sN.vol), g: fmtVol(sG.vol) },
    { l: "Positionen", b: sB.n, n: sN.n, g: sG.n },
    { l: "Emittenten", b: sB.iss, n: sN.iss, g: sG.iss },
    { l: "Rendite Ø", b: fx(sB.wY, 3) + "%", n: sN.n > 0 ? fx(sN.wY, 3) + "%" : "—", g: fx(sG.wY, 3) + "%" },
    { l: "I-Spread Ø", b: fx(sB.wS, 1) + " bp", n: sN.n > 0 ? fx(sN.wS, 1) + " bp" : "—", g: fx(sG.wS, 1) + " bp" },
    { l: "Mod. Duration", b: fx(sB.wMd, 2), n: sN.n > 0 ? fx(sN.wMd, 2) : "—", g: fx(sG.wMd, 2) },
    { l: "Kupon Ø", b: fx(sB.wK, 3) + "%", n: sN.n > 0 ? fx(sN.wK, 3) + "%" : "—", g: fx(sG.wK, 3) + "%" },
    { l: "ESG-Quote", b: fx(sB.gQ, 1) + "%", n: sN.n > 0 ? fx(sN.gQ, 1) + "%" : "—", g: fx(sG.gQ, 1) + "%" },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider w-[30%]">Kennzahl</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider w-[23%]">
              <span className="inline-flex items-center gap-1 text-slate-500">🔒 Bestand</span>
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider w-[23%]">
              <span className="inline-flex items-center gap-1 text-emerald-600">✚ Neuanlage</span>
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider w-[24%]">
              <span className="inline-flex items-center gap-1 text-spark-600">Σ Gesamt</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r.l} className={i === 0 ? "bg-slate-50/50" : ""}>
              <td className="px-4 py-1.5 font-bold text-slate-600">{r.l}</td>
              <td className={"px-4 py-1.5 text-right tabular-nums text-slate-500" + (i === 0 ? " font-bold" : "")}>{r.b}</td>
              <td className={"px-4 py-1.5 text-right tabular-nums text-emerald-600" + (i === 0 ? " font-bold" : "")}>{r.n}</td>
              <td className={"px-4 py-1.5 text-right tabular-nums text-spark-700 font-bold"}>{r.g}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
