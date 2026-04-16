import React, { useState } from 'react';

export default function PresetEditModal({ preset, onSave, onClose, getCfg, OBJ }) {
  const isNew = !preset;
  const [name, setName] = useState(preset?.n || "");
  const [icon, setIcon] = useState(preset?.i || "📈");
  const [obj, setObj] = useState(preset?.o || "yield");
  const [esg, setEsg] = useState(preset?.g || 0);
  const [saveCfg, setSaveCfg] = useState(!!preset?.cfg || isNew);
  const [showEmojis, setShowEmojis] = useState(false);
  const handleSave = () => {
    if (!name.trim()) return;
    const p = { id: preset?.id || Date.now(), n: name.trim(), i: icon, o: obj, g: esg };
    if (saveCfg) p.cfg = getCfg();
    onSave(p);
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="preset-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-spark-500 to-spark-700 px-6 py-4 text-white">
          <h3 id="preset-modal-title" className="text-base font-black uppercase tracking-wider">{isNew ? "Neue Strategie" : "Strategie bearbeiten"}</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Konservativ 5Y" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-spark-500" autoFocus />
          </div>
          {/* Icon */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Symbol</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setShowEmojis(!showEmojis)} className="text-2xl w-12 h-12 border-2 border-slate-200 rounded-xl flex items-center justify-center hover:border-spark-400 transition-colors">{icon}</button>
              {showEmojis && (
                <div className="grid grid-cols-10 gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  {EMOJI_PICKER.map(e => (
                    <button key={e} onClick={() => { setIcon(e); setShowEmojis(false); }} className={"text-lg w-8 h-8 rounded-lg hover:bg-spark-100 transition-colors flex items-center justify-center " + (icon === e ? "bg-spark-200 ring-1 ring-spark-400" : "")}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Objective */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Optimierungsziel</label>
            <select value={obj} onChange={e => setObj(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-spark-500">
              {Object.entries(OBJ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {/* ESG */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ESG-Mindestquote: {esg}%</label>
            <input type="range" min="0" max="100" step="5" value={esg} onChange={e => setEsg(parseInt(e.target.value))} className="w-full mt-1 accent-emerald-500" />
          </div>
          {/* Save full cfg */}
          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
            <input type="checkbox" checked={saveCfg} onChange={e => setSaveCfg(e.target.checked)} className="w-4 h-4 accent-spark-500 rounded" />
            <div>
              <div className="text-xs font-bold text-slate-700">Alle Solver-Einstellungen mitspeichern</div>
              <div className="text-[10px] text-slate-500">Budget, Limits, Duration, Ausschlüsse, etc.</div>
            </div>
          </label>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Abbrechen</button>
          <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-2.5 rounded-xl bg-spark-600 text-white text-sm font-black hover:bg-spark-500 disabled:opacity-40 transition-colors">Speichern</button>
        </div>
      </div>
    </div>
  );
}
