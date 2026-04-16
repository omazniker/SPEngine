import React from 'react';

export default function Bar({ label, value, max, pct, warn, icon }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-[11px] mb-1">
        <span className="text-slate-600 font-medium truncate flex items-center gap-1.5" title={typeof label === 'string' ? label : ''}>
          {icon && <span className="flex-shrink-0">{icon}</span>}<span className="truncate">{label}</span>
        </span>
        <span className="text-slate-500 tabular-nums ml-2 flex-shrink-0 font-bold">{pct}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
        <div className={"h-full rounded-full transition-all " + (warn ? "bg-rose-400" : "bg-spark-500")} style={{ width: w + "%" }} />
      </div>
    </div>
  );
}
