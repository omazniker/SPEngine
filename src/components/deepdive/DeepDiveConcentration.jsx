import React from 'react';
import { fxV } from '../../utils/format.js';
import {
  REPORT_COLORS,
  chartDefaults,
  useChart,
  calcHHI,
} from './deepdiveUtils.js';

export default function DeepDiveConcentration({ stats: s }) {
  const data = React.useMemo(() => {
    if (!s || !s.ic) return null;
    const tN = s.tN || 1;
    // Top-5 Emittenten
    const issuerEntries  = Object.entries(s.ic).sort((a, b) => b[1] - a[1]);
    const top5Issuers    = issuerEntries.slice(0, 5);
    const restIssuers    = issuerEntries.slice(5).reduce((sum, [, v]) => sum + v, 0);
    // Top-5 Länder
    const countryEntries = Object.entries(s.cc || {}).sort((a, b) => b[1] - a[1]);
    const top5Countries  = countryEntries.slice(0, 5);
    const restCountries  = countryEntries.slice(5).reduce((sum, [, v]) => sum + v, 0);
    const hhiIssuer  = calcHHI(s.ic, tN);
    const hhiCountry = calcHHI(s.cc || {}, tN);
    return { top5Issuers, restIssuers, top5Countries, restCountries, hhiIssuer, hhiCountry, tN };
  }, [s]);

  const { canvasRef: issuerRef } = useChart(() => {
    if (!data) return null;
    const labels = [
      ...data.top5Issuers.map(([n]) => n.length > 18 ? n.slice(0, 16) + '…' : n),
      ...(data.restIssuers > 0 ? ['Rest'] : []),
    ];
    const vals   = [...data.top5Issuers.map(([, v]) => v), ...(data.restIssuers > 0 ? [data.restIssuers] : [])];
    const colors = [...REPORT_COLORS.slice(0, data.top5Issuers.length), '#CBD5E1'];
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 1, borderColor: '#fff' }] },
      options: chartDefaults({
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${fxV(c.raw / data.tN * 100, 1)}%` } },
        },
      }),
    };
  }, [data]);

  const { canvasRef: countryRef } = useChart(() => {
    if (!data) return null;
    const labels = [
      ...data.top5Countries.map(([n]) => n),
      ...(data.restCountries > 0 ? ['Rest'] : []),
    ];
    const vals   = [...data.top5Countries.map(([, v]) => v), ...(data.restCountries > 0 ? [data.restCountries] : [])];
    const colors = [...REPORT_COLORS.slice(0, data.top5Countries.length), '#CBD5E1'];
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 1, borderColor: '#fff' }] },
      options: chartDefaults({
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 6 } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${fxV(c.raw / data.tN * 100, 1)}%` } },
        },
      }),
    };
  }, [data]);

  if (!data) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  const hhiColor = (v) => v < 1000 ? 'text-emerald-600' : v < 1800 ? 'text-amber-500' : 'text-rose-500';
  const hhiBg    = (v) => v < 1000 ? 'bg-emerald-50 border-emerald-200' : v < 1800 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
  const topIssuer  = data.top5Issuers[0]  || ['–', 0];
  const topCountry = data.top5Countries[0] || ['–', 0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2 text-center">Top-5 Emittenten</div>
        <div style={{ height: 220 }}><canvas ref={issuerRef}></canvas></div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 mb-2 text-center">Top-5 Länder</div>
        <div style={{ height: 220 }}><canvas ref={countryRef}></canvas></div>
      </div>
      <div className="space-y-3">
        <div className={`p-3 rounded-xl border ${hhiBg(data.hhiIssuer)}`}>
          <div className="text-[10px] text-slate-500 font-bold uppercase">HHI Emittenten</div>
          <div className={`text-2xl font-black ${hhiColor(data.hhiIssuer)}`}>{fxV(data.hhiIssuer, 0)}</div>
          <div className="text-[10px] text-slate-400">
            {data.hhiIssuer < 1000 ? '🟢 Diversifiziert' : data.hhiIssuer < 1800 ? '🟡 Moderat' : '🔴 Konzentriert'}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${hhiBg(data.hhiCountry)}`}>
          <div className="text-[10px] text-slate-500 font-bold uppercase">HHI Länder</div>
          <div className={`text-2xl font-black ${hhiColor(data.hhiCountry)}`}>{fxV(data.hhiCountry, 0)}</div>
        </div>
        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Max. Emittent</div>
          <div className="text-sm font-bold text-slate-800 truncate">{topIssuer[0]}</div>
          <div className="text-xs text-slate-500">{fxV(topIssuer[1] / data.tN * 100, 1)}%</div>
        </div>
        <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Max. Land</div>
          <div className="text-sm font-bold text-slate-800">{topCountry[0]}</div>
          <div className="text-xs text-slate-500">{fxV(topCountry[1] / data.tN * 100, 1)}%</div>
        </div>
      </div>
    </div>
  );
}
