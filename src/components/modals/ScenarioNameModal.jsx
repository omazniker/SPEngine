import React from 'react';

export default function ScenarioNameModal({ defaultName, defaultIcon, onSave, onClose }) {
  const [nm, setNm] = React.useState(defaultName);
  const [ic, setIc] = React.useState(defaultIcon);
  const ICONS = ["🎯","🧮","⚡","📈","📊","💰","🛡️","🌱","⚖️","🔥","🚀","💎"];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="scenario-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-spark-500 to-spark-700 px-5 py-3 text-white">
          <h3 id="scenario-modal-title" className="text-sm font-black uppercase tracking-wider">Szenario speichern</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Name</label>
            <input value={nm} onChange={e => setNm(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === "Enter" && nm.trim()) onSave(nm, ic); }}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-spark-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ICONS.map(e => (
              <button key={e} onClick={() => setIc(e)} className={"w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all " + (ic === e ? "border-spark-400 bg-spark-50 shadow-sm" : "border-slate-200 hover:border-slate-300")}>{e}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Abbrechen</button>
          <button onClick={() => { if (nm.trim()) onSave(nm, ic); }} disabled={!nm.trim()} className="px-4 py-1.5 text-xs font-bold bg-spark-600 text-white rounded-lg hover:bg-spark-700 disabled:opacity-50 transition-all shadow-sm">Speichern</button>
        </div>
      </div>
    </div>
  );
}
