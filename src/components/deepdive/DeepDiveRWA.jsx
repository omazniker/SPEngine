import React from 'react';
import { fxV, fmtNum } from '../../utils/format.js';
import { chartDefaults, useChart, DD_RATING_ORDER } from './deepdiveUtils.js';

export default function DeepDiveRWA({ bonds: bds, stats: s }) {
  const [cet1Ratio, setCet1Ratio] = React.useState(15);

  const rwaData = React.useMemo(() => {
    if (!bds || !bds.length) return null;
    const withRw = bds.filter(b => b.rw != null && b.nom);
    if (!withRw.length) return null;

    let totalRWA = 0;
    const ratingBuckets = {};

    for (const b of withRw) {
      const rwa = (b.nom || 0) * (b.rw || 0) / 100;
      totalRWA += rwa;
      const r = b.lo || '?';
      if (!ratingBuckets[r]) ratingBuckets[r] = { rw20: 0, rw50: 0, rw100: 0 };
      if      (b.rw <= 20) ratingBuckets[r].rw20  += rwa;
      else if (b.rw <= 50) ratingBuckets[r].rw50  += rwa;
      else                 ratingBuckets[r].rw100 += rwa;
    }

    const totalNom    = withRw.reduce((s, b) => s + (b.nom || 0), 0);
    const avgRW       = totalNom > 0 ? totalRWA / totalNom * 100 : 0;
    const totalYield  = withRw.reduce((s, b) => s + (b.y || 0) * (b.nom || 0), 0);
    const rwaEfficiency = totalRWA > 0 ? totalYield / totalNom / (totalRWA / totalNom) : 0;
    const cet1Impact  = totalRWA * cet1Ratio / 100;
    const activeRatings = DD_RATING_ORDER.filter(r => ratingBuckets[r]);

    return { totalRWA, avgRW, rwaEfficiency, cet1Impact, ratingBuckets, activeRatings };
  }, [bds, cet1Ratio]);

  const { canvasRef: barRef } = useChart(() => {
    if (!rwaData) return null;
    return {
      type: 'bar',
      data: {
        labels: rwaData.activeRatings,
        datasets: [
          { label: 'RW 20%',  data: rwaData.activeRatings.map(r => rwaData.ratingBuckets[r]?.rw20  || 0), backgroundColor: '#10B981', borderRadius: 2 },
          { label: 'RW 50%',  data: rwaData.activeRatings.map(r => rwaData.ratingBuckets[r]?.rw50  || 0), backgroundColor: '#F59E0B', borderRadius: 2 },
          { label: 'RW 100%', data: rwaData.activeRatings.map(r => rwaData.ratingBuckets[r]?.rw100 || 0), backgroundColor: '#EF4444', borderRadius: 2 },
        ],
      },
      options: chartDefaults({
        scales: {
          x: { stacked: true, ticks: { font: { size: 10 } } },
          y: { stacked: true, title: { display: true, text: 'RWA (Mio. €)' }, ticks: { font: { size: 10 } } },
        },
      }),
    };
  }, [rwaData]);

  if (!rwaData) return <div className="text-slate-400 text-center py-8">Keine RWA-Daten verfügbar</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-xs font-bold text-slate-600">CET1-Quote:</label>
        <input
          type="range" min="8" max="20" step="0.5"
          value={cet1Ratio}
          onChange={e => setCet1Ratio(+e.target.value)}
          className="w-32 accent-spark-500"
        />
        <span className="text-xs font-mono font-bold text-slate-800">{fxV(cet1Ratio, 1)}%</span>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          ['Total RWA',     fmtNum(rwaData.totalRWA),              '🏛️'],
          ['RWA-Effizienz', fxV(rwaData.rwaEfficiency, 2),         '⚡'],
          ['Ø Risk Weight', fxV(rwaData.avgRW, 0) + '%',           '📊'],
          ['CET1-Impact',   fmtNum(rwaData.cet1Impact),            '🔒'],
        ].map(([l, v, ic]) => (
          <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg">{ic}</span>
            <div className="text-base font-black text-slate-800 mt-1">{v}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">{l}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 240 }}><canvas ref={barRef}></canvas></div>
    </div>
  );
}
