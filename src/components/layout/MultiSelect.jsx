import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import Flag from './Flag.jsx';

export default function MultiSelect({ label, options, selected, onChange, align = "right", wFull = false, emptyLabel = "Alle", stacked = false, btnClass = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const [search, setSearch] = useState("");
  const btnRef = useRef(null);
  const searchRef = useRef(null);
  const toggle = (val) => { if (selected.includes(val)) onChange(selected.filter(x => x !== val)); else onChange([...selected, val]); };
  const selOpt = selected.length === 1 ? options.find(o => o.val === selected[0]) : null;
  const display = selected.length === 0 ? emptyLabel : selected.length === 1 ? (selOpt ? selOpt.lbl : selected[0]) : `${selected.length} gewählt`;
  const displayCo = selected.length === 1 && selOpt && selOpt.co ? selOpt.co : null;
  const buttonWidthClass = btnClass ? btnClass : (wFull ? 'w-full' : 'min-w-[110px]');
  const filtered = search.trim() ? options.filter(o => o.lbl.toLowerCase().includes(search.toLowerCase()) || o.val.toLowerCase().includes(search.toLowerCase())) : options;
  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropH = Math.min(options.length * 40 + 100, 400);
      const isMobile = window.innerWidth < 640;
      const openUp = !isMobile && spaceBelow < dropH && rect.top > spaceBelow;
      if (isMobile) {
        setPos({
          top: Math.min(rect.bottom + 4, window.innerHeight - dropH - 8),
          left: 8,
          width: window.innerWidth - 16,
          openUp: false
        });
      } else {
        setPos({
          top: openUp ? rect.top - Math.min(dropH, rect.top - 8) : rect.bottom + 4,
          left: align === "right" ? Math.max(8, rect.right - 300) : rect.left,
          width: Math.max(300, rect.width),
          openUp
        });
      }
      setSearch("");
      setTimeout(() => searchRef.current && searchRef.current.focus(), 50);
    }
    setOpen(!open);
  };
  return (
    <div className={`relative ${wFull ? "block w-full" : "inline-block"} text-left`}>
      <div className={`flex ${stacked ? "flex-col items-start gap-1" : `items-center ${wFull ? "justify-between" : "gap-1"}`}`}>
        <span className={"text-[10px] font-bold text-slate-500 uppercase tracking-wider" + (stacked ? "" : " shrink-0")}>{label}{!stacked && ":"}</span>
        <button ref={btnRef} type="button" onClick={handleOpen} className={`bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2.5 py-1.5 focus:outline-none shadow-sm hover:border-spark-300 text-left flex justify-between items-center gap-2 ${buttonWidthClass}`}>
          <span className="truncate flex-1 flex items-center gap-1.5">{displayCo && <Flag c={displayCo} />}{display}</span><span className="text-[8px] opacity-50 shrink-0">▼</span>
        </button>
      </div>
      {open && ReactDOM.createPortal(
        <><div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)}></div>
          <div
            className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ top: pos.top + 'px', left: pos.left + 'px', width: pos.width + 'px', maxHeight: '400px' }}
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0 space-y-1.5">
              <div className="relative">
                <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="w-full text-xs border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-spark-400 bg-white" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs leading-none">✕</button>}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <button className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 hover:bg-emerald-50 rounded transition-colors" onClick={() => { const vals = filtered.map(o => o.val); onChange(Array.from(new Set([...selected, ...vals]))); }}>Alle</button>
                  <button className="text-[10px] text-spark-600 font-bold px-2 py-0.5 hover:bg-spark-50 rounded transition-colors" onClick={() => { if (search.trim()) { const fVals = new Set(filtered.map(o => o.val)); onChange(selected.filter(v => !fVals.has(v))); } else { onChange([]); } }}>Zurücksetzen</button>
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums">{selected.length}/{options.length}</span>
                <button className="text-[10px] text-slate-500 font-bold px-2 py-0.5 hover:bg-slate-200 rounded transition-colors" onClick={() => setOpen(false)}>Schließen</button>
              </div>
            </div>
            <div className="overflow-y-auto p-1.5 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              {filtered.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Keine Treffer</div>}
              {filtered.map(o => {
                const isChecked = selected.includes(o.val);
                return (
                <label key={o.val} className="flex items-center px-3 py-2.5 sm:py-2 hover:bg-spark-50 cursor-pointer rounded-lg transition-colors gap-2.5" onClick={(e) => { e.preventDefault(); toggle(o.val); }}>
                  <span className={"flex items-center justify-center w-4 h-4 sm:w-3.5 sm:h-3.5 rounded border-2 shrink-0 transition-colors " + (isChecked ? "bg-spark-500 border-spark-500" : "bg-white border-slate-300")}>
                    {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  {o.co && <span className="shrink-0"><Flag c={o.co} /></span>}
                  <span className="truncate text-sm sm:text-xs text-slate-700 font-medium">{o.lbl}</span>
                </label>);
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
