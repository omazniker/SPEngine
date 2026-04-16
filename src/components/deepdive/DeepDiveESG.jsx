import React from 'react';
import { fxV } from '../../utils/format.js';
import { chartDefaults, useChart, DD_ESG_COLORS } from './deepdiveUtils.js';

export default function DeepDiveESG({ bonds: bds }) {
  const esgData = React.useMemo(() => {
    if (!bds || !bds.length) return null;

    // MSCI ESG distribution
    const esgCats = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'N.S.'];
    const dist = {};
    for (const cat of esgCats) dist[cat] = 0;
    for (const b of bds) {
      const e = b.msciEsg || 'N.S.';
      dist[e] = (dist[e] || 0) + 1;
    }

    // ESG vs Non-ESG comparison
    const esgBonds    = bds.filter(b => b.g === 1);
    const nonEsgBonds = bds.filter(b => b.g !== 1);
    const avg = (arr, key) => arr.length ? arr.reduce((s, b) => s + (b[key] || 0), 0) / arr.length : null;
    const esgAvg = { spread: avg(esgBonds, 's'), yield: avg(esgBonds, 'y'), duration: avg(esgBonds, 'md') };
    const nonAvg = { spread: avg(nonEsgBonds, 's'), yield: avg(nonEsgBonds, 'y'), duration: avg(nonEsgBonds, 'md') };
    const greenPremium = (esgAvg.spread != null && nonAvg.spread != null)
      ? esgAvg.spread - nonAvg.spread
      : null;

    return {
      dist, esgCats, esgAvg, nonAvg, greenPremium,
      esgCount: esgBonds.length, nonCount: nonEsgBonds.length,
    };
  }, [bds]);

  const { canvasRef: barRef } = useChart(() => {
    if (!esgData) return null;
    return {
      type: 'bar',
      data: {
        labels: esgData.esgCats,
        datasets: [{
          label: 'Anzahl',
          data: esgData.esgCats.map(c => esgData.dist[c] || 0),
          backgroundColor: esgData.esgCats.map(c => DD_ESG_COLORS[c] || '#94A3B8'),
          borderRadius: 4,
        }],
      },
      options: chartDefaults({
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Anzahl' }, ticks: { font: { size: 10 } } },
          x: { ticks: { font: { size: 10 } } },
        },
      }),
    };
  }, [esgData]);

  if (!esgData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">MSCI ESG-Verteilung</div>
        <div style={{ height: 220 }}><canvas ref={barRef}></canvas></div>
      </div>
      <div className="space-y-3">
        {esgData.greenPremium != null && (
          <div className={`p-4 rounded-xl border text-center ${esgData.greenPremium <= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Green Premium</div>
            <div className={`text-3xl font-black ${esgData.greenPremium <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {fxV(esgData.greenPremium, 1)} bp
            </div>
            <div className="text-[10px] text-slate-400">
              {esgData.greenPremium <= 0 ? 'ESG-Bonds handeln enger' : 'ESG-Bonds handeln weiter'}
            </div>
          </div>
        )}
        <div className="text-xs font-bold text-slate-600 mb-1">ESG vs. Nicht-ESG</div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="p-1 text-left text-slate-500">Metrik</th>
              <th className="p-1 text-center text-emerald-600">🌱 ESG ({esgData.esgCount})</th>
              <th className="p-1 text-center text-slate-500">Ø Nicht-ESG ({esgData.nonCount})</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Spread (bp)', esgData.esgAvg.spread,   esgData.nonAvg.spread,   0],
              ['Rendite (%)', esgData.esgAvg.yield,    esgData.nonAvg.yield,    2],
              ['Duration',   esgData.esgAvg.duration,  esgData.nonAvg.duration, 1],
            ].map(([l, e, n, d]) => (
              <tr key={l} className="border-b border-slate-100">
                <td className="p-1.5 font-bold text-slate-700">{l}</td>
                <td className="p-1.5 text-center tabular-nums font-bold">{e != null ? fxV(e, d) : '–'}</td>
                <td className="p-1.5 text-center tabular-nums">{n != null ? fxV(n, d) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
