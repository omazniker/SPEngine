import React, { useState, useEffect } from 'react';

const INPUT_CLS = "cfg-input w-[72px] h-[30px] text-right text-[11px] tabular-nums border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-spark-500/20 focus:border-spark-400 shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const INPUT_ROW_RIGHT = "flex items-center gap-1.5 shrink-0 justify-end";
const UNIT_CLS = "text-[10px] text-slate-400 font-medium shrink-0 w-[28px] text-left";

export default function PctSlider({ label, value, onChange, max = 100, step = 1, accent, color = "bg-spark-500", icon }) {
  const nv = (value == null || value === "") ? 0 : Number(value);
  const [d, sD] = useState(String(nv)); const [f, sF] = useState(false);
  useEffect(() => { if (!f) sD(String((value == null || value === "") ? 0 : Number(value))); }, [value, f]);
  const cm = v => { const p = parseFloat(v); if (isNaN(p)) { onChange(0); sD("0"); } else { const c = Math.max(0, Math.min(p, max)); onChange(c); sD(String(c)); }};
  return (<div className="flex items-center gap-1.5 py-1"><span className={"text-[11px] font-medium leading-tight flex-1 min-w-0 " + (accent || "text-slate-600")}>{label}</span><div className={INPUT_ROW_RIGHT}><input type="number" min="0" max={max} step={step} value={d} onFocus={() => sF(true)} onChange={e => sD(e.target.value)} onBlur={() => { sF(false); cm(d); }} className={INPUT_CLS + " bg-white text-slate-800"} /><span className={UNIT_CLS}>%</span></div></div>);
}
