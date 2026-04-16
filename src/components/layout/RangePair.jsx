import React, { useState, useEffect } from 'react';

const INPUT_CLS = "cfg-input w-[72px] h-[30px] text-right text-[11px] tabular-nums border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-spark-500/20 focus:border-spark-400 shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const INPUT_ROW_RIGHT = "flex items-center gap-1.5 shrink-0 justify-end";
const UNIT_CLS = "text-[10px] text-slate-400 font-medium shrink-0 w-[28px] text-left";

export default function RangePair({ label, min, max, onMinChange, onMaxChange, unit = "", step = "any", accent = "" }) {
  const [dA, sDA] = useState(min == null || min === "" ? "" : String(min));
  const [dB, sDB] = useState(max == null || max === "" ? "" : String(max));
  const [fA, sFA] = useState(false); const [fB, sFB] = useState(false);
  useEffect(() => { if (!fA) sDA(min == null || min === "" ? "" : String(min)); }, [min, fA]);
  useEffect(() => { if (!fB) sDB(max == null || max === "" ? "" : String(max)); }, [max, fB]);
  const bl = (d, set, sf) => { sf(false); if (d === "") { set(""); return; } const p = parseFloat(d); if (isNaN(p)) set(""); else set(p); };
  return (<div className="flex items-center gap-1.5 py-1"><span className={"text-[11px] font-medium flex-1 min-w-0 truncate " + (accent || "text-slate-600")}>{label}</span><div className={INPUT_ROW_RIGHT}><input type="number" step={step} value={dA} onFocus={() => sFA(true)} onChange={e => sDA(e.target.value)} onBlur={() => bl(dA, onMinChange, sFA)} className={INPUT_CLS + " bg-white text-slate-800"} placeholder="Min" /><span className="text-slate-300 text-[10px] font-bold shrink-0">–</span><input type="number" step={step} value={dB} onFocus={() => sFB(true)} onChange={e => sDB(e.target.value)} onBlur={() => bl(dB, onMaxChange, sFB)} className={INPUT_CLS + " bg-white text-slate-800"} placeholder="Max" /><span className={UNIT_CLS}>{unit || ""}</span></div></div>);
}
