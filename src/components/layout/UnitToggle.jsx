import React from 'react';

export default function UnitToggle({ value, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
      <button onClick={() => onChange("pct")} className={"px-2 py-0.5 rounded-md text-[10px] font-bold transition-all " + (value === "pct" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}>%</button>
      <button onClick={() => onChange("mio")} className={"px-2 py-0.5 rounded-md text-[10px] font-bold transition-all " + (value === "mio" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Mio. €</button>
    </div>
  );
}
