import React from 'react';
import { fxV } from '../../utils/format.js';
import { DD_RATING_ORDER, SEKTOR_LABELS, classifySector } from './deepdiveUtils.js';

export default function DeepDiveSector({ bonds: bds }) {
  const sectorData = React.useMemo(() => {
    if (!bds || !bds.length) return null;

    const sectors = {};
    for (const b of bds) {
      const sec = SEKTOR_LABELS[b.sektor] || b.sektor || classifySector(b.e);
      if (!sectors[sec]) sectors[sec] = { vol: 0, sumS: 0, sumW: 0, count: 0, ratings: {} };
      const w = b.nom || b.vol || 1;
      sectors[sec].vol  += w;
      sectors[sec].sumS += (b.s || 0) * w;
      sectors[sec].sumW += w;
      sectors[sec].count++;
      const r = b.lo || '?';
      if (!sectors[sec].ratings[r]) sectors[sec].ratings[r] = { sumS: 0, w: 0 };
      sectors[sec].ratings[r].sumS += (b.s || 0) * w;
      sectors[sec].ratings[r].w   += w;
    }

    const totalVol = Object.values(sectors).reduce((s, d) => s + d.vol, 0);
    const sorted   = Object.entries(sectors).sort((a, b) => b[1].vol - a[1].vol);
    const activeRatings = DD_RATING_ORDER.filter(r => bds.some(b => b.lo === r));

    // Heatmap
    const heatmap = {};
    for (const [sec, d] of sorted) {
      heatmap[sec] = {};
      for (const r of activeRatings) {
        heatmap[sec][r] = d.ratings[r]?.w > 0 ? d.ratings[r].sumS / d.ratings[r].w : null;
      }
    }
    return { sorted, totalVol, activeRatings, heatmap };
  }, [bds]);

  if (!sectorData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  const spreadColor = (v) => {
    if (v == null) return '#F1F5F9';
    if (v < 60)   return '#D1FAE5';
    if (v < 120)  return '#FEF9C3';
    if (v < 200)  return '#FFEDD5';
    return '#FEE2E2';
  };

  const treemapColors = ['#E2001A', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#64748B'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Sektor-Treemap (nach Volumen)</div>
        <div className="grid grid-cols-3 gap-1" style={{ minHeight: 200 }}>
          {sectorData.sorted.map(([sec, d], i) => {
            const pct  = d.vol / sectorData.totalVol * 100;
            const avgS = d.sumW > 0 ? d.sumS / d.sumW : 0;
            if (pct < 1) return null;
            return (
              <div
                key={sec}
                className="rounded-lg flex flex-col items-center justify-center p-2 text-white text-center"
                style={{
                  backgroundColor: treemapColors[i % treemapColors.length],
                  flexGrow: Math.max(1, Math.round(pct / 10)),
                  minHeight: 60,
                }}
              >
                <div className="text-[10px] font-bold leading-tight">{sec}</div>
                <div className="text-xs font-black">{fxV(pct, 0)}%</div>
                <div className="text-[9px] opacity-80">{fxV(avgS, 0)} bp</div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Sektor-Spread-Heatmap</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="p-1 text-left text-slate-500">Sektor</th>
                {sectorData.activeRatings.map(r => (
                  <th key={r} className="p-1 text-center text-slate-500">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorData.sorted.map(([sec]) => (
                <tr key={sec}>
                  <td className="p-1 font-bold text-slate-700 truncate max-w-[80px]">{sec}</td>
                  {sectorData.activeRatings.map(r => {
                    const v = sectorData.heatmap[sec]?.[r];
                    return (
                      <td
                        key={r}
                        className="p-1 text-center font-mono"
                        style={{ backgroundColor: spreadColor(v) }}
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
  );
}
