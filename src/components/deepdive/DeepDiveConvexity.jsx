import React from 'react';
import { fxV } from '../../utils/format.js';
import {
  RATING_COLORS,
  chartDefaults,
  useChart,
  approxConvexity,
} from './deepdiveUtils.js';

export default function DeepDiveConvexity({ bonds: bds }) {
  const convData = React.useMemo(() => {
    if (!bds || !bds.length) return null;
    const enriched = bds.filter(b => b.md && b.y).map(b => ({
      ...b, convexity: approxConvexity(b.md, b.y),
    }));
    if (!enriched.length) return null;
    const top20 = [...enriched].sort((a, b) => b.convexity - a.convexity).slice(0, 20);
    return { enriched, top20 };
  }, [bds]);

  const { canvasRef: scatterRef } = useChart(() => {
    if (!convData) return null;
    const ratingGroups = {};
    for (const b of convData.enriched) {
      const r = b.lo || '?';
      if (!ratingGroups[r]) ratingGroups[r] = [];
      ratingGroups[r].push({ x: b.md, y: b.convexity });
    }
    const datasets = Object.entries(ratingGroups).map(([r, pts]) => ({
      label: r,
      data: pts,
      backgroundColor: (RATING_COLORS[r] || '#64748B') + '80',
      borderColor:     RATING_COLORS[r] || '#64748B',
      pointRadius: 3, pointHoverRadius: 5,
    }));
    return {
      type: 'scatter',
      data: { datasets },
      options: chartDefaults({
        scales: {
          x: { title: { display: true, text: 'Mod. Duration' }, ticks: { font: { size: 10 } } },
          y: { title: { display: true, text: 'Konvexität' },    ticks: { font: { size: 10 } } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: MD ${fxV(c.raw.x, 1)}, Conv ${fxV(c.raw.y, 1)}`,
            },
          },
        },
      }),
    };
  }, [convData]);

  if (!convData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Duration vs. Konvexität</div>
        <div style={{ height: 280 }}><canvas ref={scatterRef}></canvas></div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Top-20 nach Konvexität</div>
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200 text-slate-500">
                {['Emittent', 'Rating', 'Duration', 'Konvexität', 'Spread', 'Callable'].map(h => (
                  <th key={h} className="p-1.5 text-left font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {convData.top20.map((b, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-1.5 font-medium truncate max-w-[120px]" title={b.e}>{b.e}</td>
                  <td className="p-1.5">{b.lo}</td>
                  <td className="p-1.5 tabular-nums">{fxV(b.md, 2)}</td>
                  <td className="p-1.5 tabular-nums font-bold">{fxV(b.convexity, 1)}</td>
                  <td className="p-1.5 tabular-nums">{fxV(b.s, 0)}</td>
                  <td className="p-1.5">{b.callable ? '✅' : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
