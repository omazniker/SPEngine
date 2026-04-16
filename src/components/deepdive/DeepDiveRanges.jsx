import React from 'react';
import { fxV } from '../../utils/format.js';

export default function DeepDiveRanges({ stats: s }) {
  if (!s || !s.nb) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  const metrics = [
    { label: 'Rendite',   unit: '%', avg: s.wY,  min: s.minY,  max: s.maxY,  d: 2 },
    { label: 'Spread',    unit: 'bp', avg: s.wS,  min: s.minS,  max: s.maxS,  d: 0 },
    { label: 'Duration',  unit: 'J', avg: s.wD,  min: s.minD,  max: s.maxD,  d: 1 },
    { label: 'Kurs',      unit: '',  avg: s.wPx, min: s.minPx, max: s.maxPx, d: 1 },
    { label: 'Kupon',     unit: '%', avg: s.wK,  min: s.minK,  max: s.maxK,  d: 2 },
    { label: 'Laufzeit',  unit: 'J', avg: s.wM,  min: s.minM,  max: s.maxM,  d: 1 },
  ];

  return (
    <div className="space-y-3">
      {metrics.map(m => {
        if (m.min == null || m.max == null) return null;
        const range = m.max - m.min;
        const pct   = range > 0 ? ((m.avg - m.min) / range) * 100 : 50;
        return (
          <div key={m.label} className="flex items-center gap-3">
            <div className="w-16 text-right text-xs font-bold text-slate-600">{m.label}</div>
            <div className="text-[10px] text-slate-400 w-14 text-right tabular-nums">{fxV(m.min, m.d)}</div>
            <div className="flex-1 relative h-6 bg-gradient-to-r from-blue-100 via-slate-100 to-amber-100 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-200 to-amber-200 opacity-40 rounded-full"
                style={{ width: '100%' }}
              ></div>
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-800"
                style={{ left: `${Math.max(2, Math.min(98, pct))}%`, transform: 'translateX(-50%)' }}
              ></div>
              <div
                className="absolute top-0 h-6 flex items-center"
                style={{ left: `${Math.max(5, Math.min(90, pct))}%`, transform: 'translateX(-50%)' }}
              >
                <span className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {fxV(m.avg, m.d)}{m.unit ? ' ' + m.unit : ''}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 w-14 tabular-nums">{fxV(m.max, m.d)}</div>
          </div>
        );
      })}
    </div>
  );
}
