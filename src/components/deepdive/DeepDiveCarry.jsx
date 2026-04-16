import React from 'react';
import { fxV } from '../../utils/format.js';
import { DD_BUCKET_LABELS } from './deepdiveUtils.js';

export default function DeepDiveCarry({ bonds: bds }) {
  const [fundingRate, setFundingRate] = React.useState(3.5);

  const carryData = React.useMemo(() => {
    if (!bds || !bds.length) return null;

    // Build spread curve by rating class
    const spreadCurve = {};
    for (const b of bds) {
      const r = b.lo; const bk = b.bkt;
      if (!r || !bk) continue;
      if (!spreadCurve[r]) spreadCurve[r] = {};
      if (!spreadCurve[r][bk]) spreadCurve[r][bk] = { sum: 0, w: 0 };
      const w = b.nom || b.vol || 1;
      spreadCurve[r][bk].sum += (b.s || 0) * w;
      spreadCurve[r][bk].w  += w;
    }
    for (const r of Object.keys(spreadCurve)) {
      for (const bk of Object.keys(spreadCurve[r])) {
        const c = spreadCurve[r][bk];
        spreadCurve[r][bk] = c.w > 0 ? c.sum / c.w : 0;
      }
    }

    const enriched = bds.filter(b => b.k != null && b.s != null).map(b => {
      const carry      = ((b.k || 0) - fundingRate) * 100; // bp
      const curSpread  = spreadCurve[b.lo]?.[b.bkt] || b.s || 0;
      const bkIdx      = DD_BUCKET_LABELS.indexOf(b.bkt);
      const shorterBk  = bkIdx > 0 ? DD_BUCKET_LABELS[bkIdx - 1] : b.bkt;
      const shorterSpread = spreadCurve[b.lo]?.[shorterBk] || curSpread;
      const rolldown   = curSpread - shorterSpread;
      const totalReturn = carry + rolldown;
      return { ...b, carry, rolldown, totalReturn };
    });

    const avgCarry = enriched.length ? enriched.reduce((s, b) => s + b.carry, 0)    / enriched.length : 0;
    const avgRoll  = enriched.length ? enriched.reduce((s, b) => s + b.rolldown, 0) / enriched.length : 0;
    const top20    = [...enriched].sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 20);
    return { avgCarry, avgRoll, avgTotal: avgCarry + avgRoll, top20 };
  }, [bds, fundingRate]);

  if (!carryData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  const valCol = (v) => v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-500' : 'text-slate-600';

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-xs font-bold text-slate-600">Funding Rate:</label>
        <input
          type="range" min="0" max="5" step="0.25"
          value={fundingRate}
          onChange={e => setFundingRate(+e.target.value)}
          className="w-32 accent-spark-500"
        />
        <span className="text-xs font-mono font-bold text-slate-800">{fxV(fundingRate, 2)}%</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Ø Carry',        carryData.avgCarry,  '💰'],
          ['Ø Rolldown',     carryData.avgRoll,   '📉'],
          ['Ø Total Return', carryData.avgTotal,  '🎯'],
        ].map(([l, v, ic]) => (
          <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg">{ic}</span>
            <div className={`text-lg font-black mt-1 ${valCol(v)}`}>
              {v >= 0 ? '+' : ''}{fxV(v, 0)} bp
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">{l}</div>
          </div>
        ))}
      </div>
      <div className="text-xs font-bold text-slate-600 mb-2">Top-20 nach Total Return</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {['Emittent', 'Rating', 'Laufzeit', 'Spread', 'Carry', 'Rolldown', 'Total'].map(h => (
                <th key={h} className="p-1.5 text-left font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carryData.top20.map((b, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-1.5 font-medium truncate max-w-[150px]" title={b.e}>{b.e}</td>
                <td className="p-1.5">{b.lo}</td>
                <td className="p-1.5 tabular-nums">{b.bkt}</td>
                <td className="p-1.5 tabular-nums">{fxV(b.s, 0)}</td>
                <td className={`p-1.5 tabular-nums font-bold ${valCol(b.carry)}`}>
                  {b.carry >= 0 ? '+' : ''}{fxV(b.carry, 0)}
                </td>
                <td className={`p-1.5 tabular-nums font-bold ${valCol(b.rolldown)}`}>
                  {b.rolldown >= 0 ? '+' : ''}{fxV(b.rolldown, 0)}
                </td>
                <td className={`p-1.5 tabular-nums font-black ${valCol(b.totalReturn)}`}>
                  {b.totalReturn >= 0 ? '+' : ''}{fxV(b.totalReturn, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
