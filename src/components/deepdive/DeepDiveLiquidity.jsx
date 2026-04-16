import React from 'react';
import { fxV } from '../../utils/format.js';
import {
  chartDefaults,
  useChart,
  DD_LQA_BINS,
  DD_LQA_COLORS,
  DD_RATING_ORDER,
  DD_BUCKET_LABELS,
} from './deepdiveUtils.js';

export default function DeepDiveLiquidity({ bonds: bds }) {
  const liqData = React.useMemo(() => {
    if (!bds || !bds.length) return null;
    const withLqa = bds.filter(b => b.lqa != null);
    if (!withLqa.length) return null;

    const avgLqa   = withLqa.reduce((s, b) => s + (b.lqa || 0), 0) / withLqa.length;
    const illiquid = withLqa.filter(b => b.lqa < 40).length / withLqa.length * 100;
    const highLiq  = withLqa.filter(b => b.lqa > 80).length / withLqa.length * 100;

    // Histogram bins
    const bins = DD_LQA_BINS.map(([lo, hi]) => withLqa.filter(b => b.lqa >= lo && b.lqa < hi).length);

    // Heatmap: rating × bucket → avg LQA
    const activeRatings = DD_RATING_ORDER.filter(r => withLqa.some(b => b.lo === r));
    const activeBkts    = DD_BUCKET_LABELS.filter(bk => withLqa.some(b => b.bkt === bk));
    const heatmap = {};
    for (const r of activeRatings) {
      heatmap[r] = {};
      for (const bk of activeBkts) {
        const cell = withLqa.filter(b => b.lo === r && b.bkt === bk);
        heatmap[r][bk] = cell.length
          ? cell.reduce((s, b) => s + (b.lqa || 0), 0) / cell.length
          : null;
      }
    }
    return { avgLqa, illiquid, highLiq, bins, heatmap, activeRatings, activeBkts };
  }, [bds]);

  const { canvasRef: histRef } = useChart(() => {
    if (!liqData) return null;
    return {
      type: 'bar',
      data: {
        labels: DD_LQA_BINS.map(([lo, hi]) => `${lo}-${hi}`),
        datasets: [{ label: 'Anzahl', data: liqData.bins, backgroundColor: DD_LQA_COLORS, borderRadius: 4 }],
      },
      options: chartDefaults({
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Anzahl' }, ticks: { font: { size: 10 } } },
          x: { title: { display: true, text: 'LQA Score' }, ticks: { font: { size: 10 } } },
        },
      }),
    };
  }, [liqData]);

  if (!liqData) return <div className="text-slate-400 text-center py-8">Keine LQA-Daten verfügbar</div>;

  const lqaColor = (v) => {
    if (v == null) return '#F1F5F9';
    if (v >= 80) return '#D1FAE5';
    if (v >= 60) return '#FEF9C3';
    if (v >= 40) return '#FFEDD5';
    return '#FEE2E2';
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['Ø LQA',       fxV(liqData.avgLqa, 0),                   '💧'],
          ['% Illiquide', fxV(liqData.illiquid, 1) + '%',            '🔴'],
          ['% Hochliquide', fxV(liqData.highLiq, 1) + '%',           '🟢'],
        ].map(([l, v, ic]) => (
          <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-lg">{ic}</span>
            <div className="text-lg font-black text-slate-800 mt-1">{v}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold text-slate-600 mb-2">LQA-Verteilung</div>
          <div style={{ height: 200 }}><canvas ref={histRef}></canvas></div>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600 mb-2">Liquiditäts-Heatmap (Ø LQA)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="p-1 text-left text-slate-500">Rating</th>
                  {liqData.activeBkts.map(bk => (
                    <th key={bk} className="p-1 text-center text-slate-500">{bk}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liqData.activeRatings.map(r => (
                  <tr key={r}>
                    <td className="p-1 font-bold text-slate-700">{r}</td>
                    {liqData.activeBkts.map(bk => {
                      const v = liqData.heatmap[r]?.[bk];
                      return (
                        <td
                          key={bk}
                          className="p-1 text-center font-mono"
                          style={{ backgroundColor: lqaColor(v) }}
                        >
                          {v != null ? fxV(v, 0) : '–'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
