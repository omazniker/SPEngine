import React from 'react';
import { fx } from '../../utils/format.js';

export default function BarCard({ label, segments, bmSegments, bmLabel }) {
  const colors = ["text-spark-500","text-blue-500","text-slate-500","text-amber-500","text-rose-500","text-emerald-500"];
  const bgColors = ["bg-spark-500","bg-blue-400","bg-slate-400","bg-amber-400","bg-rose-400","bg-emerald-400"];
  const allSegs = segments.map((s, i) => {
    const bm = bmSegments ? (bmSegments[i]?.val || 0) : 0;
    return { ...s, bm, idx: i };
  });
  const hasBm = bmSegments && bmSegments.length > 0;
  const sorted = [...allSegs].sort((a, b) => (b.val || 0) - (a.val || 0));
  const top = sorted[0];
  const rest = sorted.filter(s => s !== top && ((s.val || 0) > 0 || (s.bm || 0) > 0));
  const topPf = (top.val || 0) * 100;
  const topBm = (top.bm || 0) * 100;
  const topDelta = topPf - topBm;
  return (
    <div className="kpi-card bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full min-h-[120px]">
      <div className="kpi-label text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className={"kpi-value text-lg sm:text-xl font-black tabular-nums tracking-tight mt-1 " + (colors[top.idx % colors.length] || "text-slate-800")}>{top.lbl} {fx(topPf,0)}%</div>
      <div className="mt-auto w-full">
        <div className="text-[11px] text-slate-500 mt-2.5 font-medium w-full">
          {hasBm && Math.abs(topDelta) >= 0.5 && (
            <div className={"text-[10px] font-bold mb-1 " + (topDelta > 0 ? "text-spark-600" : "text-rose-500")}>
              {topDelta > 0 ? "+" : ""}{fx(topDelta,0)}pp vs {bmLabel || "BM"}
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {rest.map(s => {
                const pf = (s.val || 0) * 100;
                const bm = (s.bm || 0) * 100;
                const delta = pf - bm;
                return (
                  <div key={s.idx} className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">{s.lbl}</span>
                    <span className="text-[10px] font-bold tabular-nums text-slate-700">{fx(pf,0)}%</span>
                    {hasBm && Math.abs(delta) >= 0.5 && (
                      <span className={"text-[9px] font-bold tabular-nums " + (delta > 0 ? "text-spark-600" : "text-rose-500")}>
                        {delta > 0 ? "+" : ""}{fx(delta,0)}pp
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
