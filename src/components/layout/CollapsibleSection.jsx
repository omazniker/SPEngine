import React from 'react';

// Component: Collapsible wrapper with chevron, drag handle (▲▼), and pin
export default function CollapsibleSection({ id, title, icon, collapsed, pinned, onToggle, onPin, onMoveUp, onMoveDown, children }) {
  return (
    <div className={"transition-all duration-200 " + (pinned ? "ring-2 ring-amber-300 ring-offset-1 rounded-2xl" : "")}>
      <div
        className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-100 transition-colors group"
        onClick={() => onToggle(id)}
      >
        {/* Chevron */}
        <span className={"text-slate-400 text-xs transition-transform duration-200 " + (collapsed ? "" : "rotate-90")} style={{fontFamily:'monospace'}}>▶</span>
        {/* Icon + Title */}
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex-1">{title}</span>
        {/* Drag buttons */}
        <span className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={() => onMoveUp(id)} className="w-5 h-5 rounded text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors touch-target-44" title="Nach oben" aria-label="Abschnitt nach oben verschieben">▲</button>
          <button onClick={() => onMoveDown(id)} className="w-5 h-5 rounded text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors touch-target-44" title="Nach unten" aria-label="Abschnitt nach unten verschieben">▼</button>
        </span>
        {/* Pin button */}
        <button
          className={"w-6 h-6 rounded-lg text-xs flex items-center justify-center transition-all touch-target-44 " + (pinned ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "text-slate-300 hover:text-slate-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100")}
          onClick={e => { e.stopPropagation(); onPin(id); }}
          title={pinned ? "Lösen" : "Fixieren"}
          aria-label={pinned ? "Abschnitt lösen" : "Abschnitt fixieren"}
        >📌</button>
      </div>
      {/* Content */}
      {!collapsed && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
