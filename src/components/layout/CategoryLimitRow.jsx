import React from 'react';

const INPUT_CLS = "cfg-input w-[72px] h-[30px] text-right text-[11px] tabular-nums border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-spark-500/20 focus:border-spark-400 shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const INPUT_ROW_RIGHT = "flex items-center gap-1.5 shrink-0 justify-end";
const UNIT_CLS = "text-[10px] text-slate-400 font-medium shrink-0 w-[28px] text-left";

export default function CategoryLimitRow({ cat, label, value, onChange, unit = "pct" }) {
  const v = value || { enabled: true, min: "", max: "" };
  const isPct = unit === "pct";
  const ecls = v.enabled ? " bg-white text-slate-800" : " bg-slate-50 border-slate-100 text-slate-300";
  const handleNum = (field, raw) => { if (raw === "") { onChange({ ...v, [field]: "" }); return; } const n = parseFloat(raw); if (!isNaN(n)) onChange({ ...v, [field]: isPct ? Math.max(0, Math.min(100, n)) : Math.max(0, n) }); };
  return (
    <div className="flex items-center gap-1.5 py-1">
      <input type="checkbox" checked={v.enabled} onChange={e => onChange({ ...v, enabled: e.target.checked })} className="w-3.5 h-3.5 accent-spark-500 cursor-pointer shrink-0" />
      <span className={"text-[11px] font-medium flex-1 min-w-0 truncate " + (v.enabled ? "text-slate-700" : "text-slate-300 line-through")}>{label}</span>
      <div className={INPUT_ROW_RIGHT}>
        <input type="number" min={0} max={isPct ? 100 : undefined} step={isPct ? 5 : 1} value={v.enabled ? (v.min === "" || v.min == null ? "" : v.min) : ""} disabled={!v.enabled} placeholder="Min" onChange={e => handleNum("min", e.target.value)} className={INPUT_CLS + ecls} />
        <span className="text-slate-300 text-[10px] font-bold shrink-0">–</span>
        <input type="number" min={0} max={isPct ? 100 : undefined} step={isPct ? 5 : 1} value={v.enabled ? (v.max === "" || v.max == null ? "" : v.max) : ""} disabled={!v.enabled} placeholder="Max" onChange={e => handleNum("max", e.target.value)} className={INPUT_CLS + ecls} />
        <span className={UNIT_CLS}>{isPct ? "%" : "Mio."}</span>
      </div>
    </div>
  );
}
