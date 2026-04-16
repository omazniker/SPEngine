import React from 'react';
import { chartDefaults, useChart } from './deepdiveUtils.js';

export default function DeepDiveStructure({ stats: s, globalStats: gs }) {
  const { canvasRef: couponRef } = useChart(() => {
    if (!s) return null;
    return {
      type: 'bar',
      data: {
        labels: ['Fixed', 'Variable', 'Zero'],
        datasets: [
          { label: 'Auswahl',     data: [(s.fixP||0)*100, (s.varP||0)*100, (s.zeroP||0)*100],       backgroundColor: '#E2001A', borderRadius: 4 },
          { label: 'Gesamtmarkt', data: [(gs?.fixP||0)*100, (gs?.varP||0)*100, (gs?.zeroP||0)*100], backgroundColor: '#94A3B8', borderRadius: 4 },
        ],
      },
      options: chartDefaults({
        scales: {
          y: { title: { display: true, text: '%' }, max: 100, ticks: { font: { size: 10 } } },
          x: { ticks: { font: { size: 10 } } },
        },
      }),
    };
  }, [s, gs]);

  const { canvasRef: structRef } = useChart(() => {
    if (!s) return null;
    return {
      type: 'bar',
      data: {
        labels: ['Bullet', 'Callable', 'Perpetual'],
        datasets: [
          { label: 'Auswahl',     data: [(s.bullP||0)*100, (s.callP||0)*100, (s.perpP||0)*100],       backgroundColor: '#3B82F6', borderRadius: 4 },
          { label: 'Gesamtmarkt', data: [(gs?.bullP||0)*100, (gs?.callP||0)*100, (gs?.perpP||0)*100], backgroundColor: '#94A3B8', borderRadius: 4 },
        ],
      },
      options: chartDefaults({
        scales: {
          y: { title: { display: true, text: '%' }, max: 100, ticks: { font: { size: 10 } } },
          x: { ticks: { font: { size: 10 } } },
        },
      }),
    };
  }, [s, gs]);

  if (!s) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Kupontyp-Verteilung</div>
        <div style={{ height: 220 }}><canvas ref={couponRef}></canvas></div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2">Fälligkeitsstruktur</div>
        <div style={{ height: 220 }}><canvas ref={structRef}></canvas></div>
      </div>
    </div>
  );
}
