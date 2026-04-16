import React from 'react';
import { fxV } from '../../utils/format.js';
import {
  chartDefaults,
  useChart,
  DD_RATING_ORDER,
  linearRegression,
} from './deepdiveUtils.js';

export default function DeepDivePeers({ bonds: bds }) {
  const activeRatings = React.useMemo(
    () => DD_RATING_ORDER.filter(r => bds.some(b => b.lo === r)),
    [bds],
  );
  const [selectedRating, setSelectedRating] = React.useState(
    activeRatings.includes('A') ? 'A' : activeRatings[0] || 'A',
  );

  const peerData = React.useMemo(() => {
    if (!bds || !bds.length) return null;
    const peers = bds.filter(b => b.lo === selectedRating && b.md != null && b.s != null);
    if (peers.length < 5) {
      return {
        peers,
        regression: null,
        message: `Zu wenige Bonds (${peers.length}) für Rating ${selectedRating}`,
      };
    }

    const xs  = peers.map(b => b.md);
    const ys  = peers.map(b => b.s);
    const reg = linearRegression(xs, ys);

    const enriched = peers.map(b => {
      const predicted = reg.slope * b.md + reg.intercept;
      const residual  = b.s - predicted;
      return { ...b, predicted, residual };
    });

    const stdDev = Math.sqrt(enriched.reduce((s, b) => s + b.residual ** 2, 0) / enriched.length);
    const withZ  = enriched.map(b => {
      const z      = stdDev > 0 ? b.residual / stdDev : 0;
      const signal = z > 1 ? 'Cheap' : z < -1 ? 'Rich' : 'Fair';
      return { ...b, z, signal };
    });

    return { peers: withZ, regression: reg, stdDev };
  }, [bds, selectedRating]);

  const { canvasRef: scatterRef } = useChart(() => {
    if (!peerData || !peerData.regression) return null;
    const { peers, regression: reg } = peerData;
    const minX = Math.min(...peers.map(b => b.md));
    const maxX = Math.max(...peers.map(b => b.md));
    const colorByZ = (z) => z > 1 ? '#10B981' : z < -1 ? '#EF4444' : '#94A3B8';
    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Bonds',
            data: peers.map(b => ({ x: b.md, y: b.s })),
            backgroundColor: peers.map(b => colorByZ(b.z) + '80'),
            borderColor:     peers.map(b => colorByZ(b.z)),
            pointRadius: 4,
          },
          {
            label: 'Regression',
            data: [
              { x: minX, y: reg.slope * minX + reg.intercept },
              { x: maxX, y: reg.slope * maxX + reg.intercept },
            ],
            type: 'line',
            borderColor: '#1E293B', borderWidth: 2, borderDash: [6, 3], pointRadius: 0,
          },
        ],
      },
      options: chartDefaults({
        scales: {
          x: { title: { display: true, text: 'Mod. Duration' }, ticks: { font: { size: 10 } } },
          y: { title: { display: true, text: 'Spread (bp)' },   ticks: { font: { size: 10 } } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (c) => c.dataset.label === 'Regression'
                ? ''
                : `MD ${fxV(c.raw.x, 1)}, Spread ${fxV(c.raw.y, 0)} bp`,
            },
          },
        },
      }),
    };
  }, [peerData]);

  if (!peerData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs font-bold text-slate-600">Rating-Klasse:</label>
        <select
          value={selectedRating}
          onChange={e => setSelectedRating(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1"
        >
          {activeRatings.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {peerData.regression && (
          <span className="text-[10px] text-slate-400 ml-auto">
            R² = {fxV(peerData.regression.r2, 3)} | {peerData.peers.length} Bonds
          </span>
        )}
      </div>

      {peerData.message ? (
        <div className="text-slate-400 text-center py-8 text-sm">{peerData.message}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Rich/Cheap Scatter</div>
            <div style={{ height: 280 }}><canvas ref={scatterRef}></canvas></div>
            <div className="flex justify-center gap-3 mt-2 text-[10px]">
              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>Cheap (Z&gt;1)</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1"></span>Fair</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1"></span>Rich (Z&lt;-1)</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Peer-Group Analyse</div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-slate-500">
                    {['Emittent', 'MD', 'Spread', 'Pred.', 'Resid.', 'Z', 'Signal'].map(h => (
                      <th key={h} className="p-1 text-left font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...peerData.peers].sort((a, b) => b.z - a.z).map((b, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-1 font-medium truncate max-w-[100px]" title={b.e}>{b.e}</td>
                      <td className="p-1 tabular-nums">{fxV(b.md, 1)}</td>
                      <td className="p-1 tabular-nums">{fxV(b.s, 0)}</td>
                      <td className="p-1 tabular-nums">{fxV(b.predicted, 0)}</td>
                      <td className="p-1 tabular-nums">{fxV(b.residual, 0)}</td>
                      <td className={`p-1 tabular-nums font-bold ${b.z > 1 ? 'text-emerald-600' : b.z < -1 ? 'text-rose-500' : 'text-slate-500'}`}>
                        {fxV(b.z, 2)}
                      </td>
                      <td className="p-1">
                        {b.signal === 'Cheap' ? '🟢' : b.signal === 'Rich' ? '🔴' : '⚪'} {b.signal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
