import React from 'react';
import { fxV } from '../../utils/format.js';
import {
  chartDefaults,
  useChart,
  DD_BUCKET_LABELS,
  DD_RATING_CLASSES,
  DD_RATING_CLASS_COLORS,
  SEKTOR_LABELS,
} from './deepdiveUtils.js';

const DD_SEKTOR_COLORS = {
  BANKS: '#2563eb', INSURANCE: '#0d9488', FINANCIALS: '#8b5cf6',
  REITS: '#d97706', OTHER: '#64748b',
};
const DD_RANG_COLORS = {
  SP: '#2563eb', SNP: '#f59e0b', T2: '#8b5cf6', AT1: '#ef4444', SU: '#64748b',
};

export default function DeepDiveCurve({ bonds: bds }) {
  const [mode,    setMode]    = React.useState('spread');
  const [groupBy, setGroupBy] = React.useState('rating'); // 'rating' | 'sektor' | 'rang' | 'kpnTyp'

  const curveData = React.useMemo(() => {
    if (!bds || !bds.length) return null;
    const result = {};

    if (groupBy === 'rating') {
      for (const cls of Object.keys(DD_RATING_CLASSES)) {
        const ratings  = DD_RATING_CLASSES[cls];
        const clsBonds = bds.filter(b => ratings.includes(b.lo));
        if (!clsBonds.length) continue;
        const buckets = {};
        for (const b of clsBonds) {
          const bk = b.bkt || '?';
          if (!buckets[bk]) buckets[bk] = { sumS: 0, sumY: 0, sumW: 0 };
          const w = b.nom || b.vol || 1;
          buckets[bk].sumS += (b.s || 0) * w;
          buckets[bk].sumY += (b.y || 0) * w;
          buckets[bk].sumW += w;
        }
        const points = {};
        for (const bk of DD_BUCKET_LABELS) {
          if (buckets[bk] && buckets[bk].sumW > 0) {
            points[bk] = {
              spread: buckets[bk].sumS / buckets[bk].sumW,
              yield:  buckets[bk].sumY / buckets[bk].sumW,
            };
          }
        }
        if (Object.keys(points).length > 0) result[cls] = points;
      }
    } else {
      // Generic groupBy for sektor, rang, kpnTyp
      const groupFn = groupBy === 'rang'
        ? b => b.rank || 'SU'
        : groupBy === 'kpnTyp'
          ? b => b.kpnTyp === 'VARIABLE' ? 'FRN' : 'Fix'
          : b => (b.sektor || 'OTHER');

      const labelFn = groupBy === 'rang'
        ? v => ({ SP: 'Senior Preferred', SNP: 'Senior Non-Preferred', T2: 'Tier 2', AT1: 'AT1', SU: 'Senior Unsecured' }[v] || v)
        : groupBy === 'kpnTyp'
          ? v => v
          : v => SEKTOR_LABELS[v] || v;

      const groups = {};
      for (const b of bds) {
        const g = groupFn(b);
        if (!groups[g]) groups[g] = [];
        groups[g].push(b);
      }
      for (const [g, gBonds] of Object.entries(groups)) {
        const buckets = {};
        for (const b of gBonds) {
          const bk = b.bkt || '?';
          if (!buckets[bk]) buckets[bk] = { sumS: 0, sumY: 0, sumW: 0 };
          const w = b.nom || b.vol || 1;
          buckets[bk].sumS += (b.s || 0) * w;
          buckets[bk].sumY += (b.y || 0) * w;
          buckets[bk].sumW += w;
        }
        const points = {};
        for (const bk of DD_BUCKET_LABELS) {
          if (buckets[bk] && buckets[bk].sumW > 0) {
            points[bk] = {
              spread: buckets[bk].sumS / buckets[bk].sumW,
              yield:  buckets[bk].sumY / buckets[bk].sumW,
            };
          }
        }
        if (Object.keys(points).length > 0) result[labelFn(g)] = points;
      }
    }

    // Steepness
    const steepness = {};
    for (const [cls, pts] of Object.entries(result)) {
      const bks = DD_BUCKET_LABELS.filter(bk => pts[bk]);
      if (bks.length >= 2) {
        const short = pts[bks[0]]?.spread || 0;
        const long  = pts[bks[bks.length - 1]]?.spread || 0;
        steepness[cls] = long - short;
      }
    }
    return { curves: result, steepness };
  }, [bds, groupBy]);

  const colorMap = groupBy === 'rating'
    ? DD_RATING_CLASS_COLORS
    : groupBy === 'rang'
      ? { 'Senior Preferred': '#2563eb', 'Senior Non-Preferred': '#f59e0b', 'Tier 2': '#8b5cf6', AT1: '#ef4444', 'Senior Unsecured': '#64748b' }
      : groupBy === 'kpnTyp'
        ? { Fix: '#2563eb', FRN: '#f59e0b' }
        : Object.fromEntries(Object.entries(DD_SEKTOR_COLORS).map(([k, v]) => [SEKTOR_LABELS[k] || k, v]));

  const { canvasRef: chartRef } = useChart(() => {
    if (!curveData) return null;
    const activeBuckets = DD_BUCKET_LABELS.filter(
      bk => Object.values(curveData.curves).some(pts => pts[bk]),
    );
    const datasets = Object.entries(curveData.curves).map(([cls, pts]) => ({
      label: cls,
      data: activeBuckets.map(bk => pts[bk] ? (mode === 'spread' ? pts[bk].spread : pts[bk].yield) : null),
      borderColor:     colorMap[cls] || '#64748b',
      backgroundColor: (colorMap[cls] || '#64748b') + '20',
      tension: 0.3, pointRadius: 3, borderWidth: 2, spanGaps: true,
    }));
    return {
      type: 'line',
      data: { labels: activeBuckets, datasets },
      options: chartDefaults({
        scales: {
          y: { title: { display: true, text: mode === 'spread' ? 'Spread (bp)' : 'Rendite (%)' }, ticks: { font: { size: 10 } } },
          x: { title: { display: true, text: 'Laufzeit' },                                       ticks: { font: { size: 10 } } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${fxV(c.raw, mode === 'spread' ? 0 : 2)}${mode === 'spread' ? ' bp' : '%'}`,
            },
          },
        },
      }),
    };
  }, [curveData, mode, colorMap]);

  if (!curveData) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setMode('spread')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mode === 'spread' ? 'bg-spark-500 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Spread (bp)
        </button>
        <button
          onClick={() => setMode('yield')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mode === 'yield' ? 'bg-spark-500 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Rendite (%)
        </button>
        <div className="mx-2 h-4 border-l border-slate-200"></div>
        {['rating', 'sektor', 'rang', 'kpnTyp'].map(g => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${groupBy === g ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {{ rating: 'Rating', sektor: 'Sektor', rang: 'Rang', kpnTyp: 'KpnTyp' }[g]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {Object.entries(curveData.steepness).map(([cls, v]) => (
            <span key={cls} className="text-[10px] font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              <span style={{ color: colorMap[cls] || '#64748b' }}>●</span>{' '}
              {cls}: {v >= 0 ? '+' : ''}{fxV(v, 0)} bp
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: 280 }}><canvas ref={chartRef}></canvas></div>
    </div>
  );
}
