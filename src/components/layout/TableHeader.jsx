import React from 'react';

export default function TableHeader({ k, children, sK, sD, doSort, align = "left" }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`px-3 py-2.5 text-[11px] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-spark-600 hover:bg-slate-50 transition-colors ${alignClass} ${sK === k ? "text-spark-600 font-bold" : "text-slate-500 font-semibold"}`} onClick={() => doSort(k)} title={`Nach ${children} sortieren`}>
      <div className={`flex items-center gap-1 ${flexClass}`}>{children}<span className="text-[9px] opacity-60">{sK === k ? (sD > 0 ? "▲" : "▼") : "↕"}</span></div>
    </th>
  );
}
