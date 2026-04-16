import React from 'react';

export default function ScenarioKpiGrid({ scenarios, bm }) {
  if (!scenarios.length || !bm) return null;
  const KPI_DEFS = [
    { key: "wY", label: "Rendite Ø", unit: "%", fmt: 2, up: true, isBp: false },
    { key: "wK", label: "Kupon Ø", unit: "%", fmt: 2, up: true, isBp: false },
    { key: "wS", label: "I-Spread Ø", unit: " bp", fmt: 1, up: true, isBp: false },
    { key: "wD", label: "Mod. Duration", unit: "", fmt: 2, up: false, isBp: false },
    { key: "wR", label: "Risikogewicht", unit: "%", fmt: 0, up: false, isBp: false },
    { key: "gP", label: "ESG-Quote", unit: "%", fmt: 0, up: true, isBp: false, mult: 100 },
    { key: "yRw", label: "Rendite / RW", unit: "", fmt: 2, up: true, isBp: false },
    { key: "wM", label: "Laufzeit Ø", unit: " Y", fmt: 1, up: false, isBp: false },
    { key: "wPx", label: "Preis Ø", unit: "", fmt: 2, up: false, isBp: false, neutral: true },
    { key: "nb", label: "Positionen", unit: "", fmt: 0, up: true, isBp: false, neutral: true },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {KPI_DEFS.map(kpi => {
        const bmVal = kpi.mult ? (bm[kpi.key] || 0) * kpi.mult : (bm[kpi.key] || 0);
        const rows = scenarios.map(sc => {
          const raw = sc.stats[kpi.key] || 0;
          const val = kpi.mult ? raw * kpi.mult : raw;
          const delta = val - bmVal;
          return { ...sc, val, delta };
        });
        // Sort: best value first
        rows.sort((a, b) => kpi.up ? b.val - a.val : a.val - b.val);
        const best = rows.length > 0 ? rows[0].val : null;
        return (
          <div key={kpi.key} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">{kpi.label}</div>
            <div className="space-y-1.5">
              {rows.map(r => {
                const isBest = best !== null && Math.abs(r.val - best) < 0.001;
                const good = !kpi.neutral && (kpi.up ? r.delta > 0.001 : r.delta < -0.001);
                const bad = !kpi.neutral && (kpi.up ? r.delta < -0.001 : r.delta > 0.001);
                return (
                  <div key={r.id} className="flex items-center gap-1.5 text-[11px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r._color }} />
                    <span className="truncate flex-1 text-slate-600 font-medium" title={r.name}>{r.name}</span>
                    <span className={"tabular-nums font-bold whitespace-nowrap " + (isBest ? "text-slate-900" : "text-slate-600")}>{fx(r.val, kpi.fmt)}{kpi.unit}</span>
                    {!kpi.neutral && <span className={"tabular-nums text-[10px] w-14 text-right whitespace-nowrap " + (good ? "text-emerald-600" : bad ? "text-rose-500" : "text-slate-400")}>{r.delta > 0 ? "+" : ""}{fx(r.delta, kpi.fmt > 0 ? kpi.fmt : 1)}</span>}
                  </div>
                );
              })}
              {/* BM row */}
              <div className="flex items-center gap-1.5 text-[11px] border-t border-slate-100 pt-1.5 mt-1">
                <div className="w-2 h-2 rounded-full shrink-0 bg-slate-400" />
                <span className="truncate flex-1 text-slate-400 font-medium">BM</span>
                <span className="tabular-nums font-bold text-slate-400 whitespace-nowrap">{fx(bmVal, kpi.fmt)}{kpi.unit}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
