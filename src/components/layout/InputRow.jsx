import React, { useState, useEffect } from 'react';

const INPUT_CLS = "cfg-input w-[72px] h-[30px] text-right text-[11px] tabular-nums border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-spark-500/20 focus:border-spark-400 shadow-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const INPUT_ROW_RIGHT = "flex items-center gap-1.5 shrink-0 justify-end";

export default function InputRow({ label, value, onChange, accent, step = "any", placeholder = "" }) {
  const [draft, setDraft] = useState(value === null || value === "" ? "" : String(value));
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => { if (!isFocused) setDraft(value === null || value === "" ? "" : String(value)); }, [value, isFocused]);
  const handleBlur = () => { setIsFocused(false); if (draft === "") { onChange(""); return; } const parsed = parseFloat(draft); if (isNaN(parsed)) { onChange(""); setDraft(""); } else { onChange(parsed); setDraft(String(parsed)); } };
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className={"text-[11px] font-medium leading-tight flex-1 min-w-0 " + (accent || "text-slate-600")}>{label}</span>
      <div className={INPUT_ROW_RIGHT}>
        <input type="number" step={step} value={draft} onFocus={() => setIsFocused(true)} onChange={e => setDraft(e.target.value)} onBlur={handleBlur}
          className={INPUT_CLS + " bg-white text-slate-800"} placeholder={placeholder} />
      </div>
    </div>
  );
}
