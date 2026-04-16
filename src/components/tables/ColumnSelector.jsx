import React, { useState, useRef, useEffect } from 'react';

export default function ColumnSelector({ columns, hiddenCols, setHiddenCols, label = "Spalten" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);
  const toggle = (key) => {
    setHiddenCols(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return Array.from(s);
    });
  };
  const visCount = columns.length - hiddenCols.length;
  const showAll = () => setHiddenCols([]);
  const hideAll = () => setHiddenCols(columns.filter(c => !c.required).map(c => c.key));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${hiddenCols.length > 0 ? 'bg-spark-50 border-spark-300 text-spark-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        title={`${label}: ${visCount}/${columns.length} sichtbar`}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[200px] max-h-[340px] overflow-y-auto scrollbar-thin animate-fade-up">
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex gap-1.5">
              <button onClick={showAll} className="text-[9px] font-bold text-spark-600 hover:underline">Alle</button>
              <span className="text-slate-300">|</span>
              <button onClick={hideAll} className="text-[9px] font-bold text-slate-500 hover:underline">Keine</button>
            </div>
          </div>
          {columns.map(c => {
            const isHidden = hiddenCols.includes(c.key);
            const isRequired = c.required;
            return (
              <label key={c.key} className={"flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-slate-50 transition-colors" + (isRequired ? " opacity-60" : "")}>
                <input
                  type="checkbox"
                  checked={!isHidden}
                  disabled={isRequired}
                  onChange={() => !isRequired && toggle(c.key)}
                  className="w-3.5 h-3.5 rounded accent-spark-500 cursor-pointer"
                />
                <span className={"text-[11px] font-medium " + (isHidden ? "text-slate-400 line-through" : "text-slate-700")}>{c.label}</span>
              </label>
            );
          })}
          {hiddenCols.length > 0 && (
            <div className="border-t border-slate-100 mt-1 pt-1 px-3">
              <span className="text-[9px] text-slate-400">{hiddenCols.length} Spalte{hiddenCols.length > 1 ? "n" : ""} ausgeblendet</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
