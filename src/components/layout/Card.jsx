import React from 'react';

export default function Card({ label, value, sub, accent }) {
  return (
    <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full min-h-[120px]">
      <div className="kpi-label text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className={"kpi-value text-lg sm:text-xl font-black tabular-nums tracking-tight mt-1 " + (accent || "text-slate-800")}>{value}</div>
      <div className="mt-auto w-full">{sub && <div className="text-[11px] text-slate-500 mt-2.5 font-medium w-full">{sub}</div>}</div>
    </div>
  );
}
