import React from 'react';

/**
 * FrontierDetailModal
 *
 * Refactored from inline JSX at lines 18728–18774 of test_lexicographic.html.
 * In the original source this was rendered inline as:
 *   {frontierDetailModal && (() => { ... })()}
 *
 * Props:
 *   modal       — the frontierDetailModal state object ({ stats, icon, name, isP0, result, id })
 *   onClose     — callback to clear the modal (sets frontierDetailModal to null)
 *   setResult   — callback to apply the selected frontier result
 *   setAutoOptSelected — callback to set the selected auto-opt ID
 */
export default function FrontierDetailModal({ modal, onClose, setResult, setAutoOptSelected }) {
  if (!modal) return null;
  const m = modal;
  const s = m.stats;
  if (!s) return null;

  const KR = ({ l, v, u, c }) => (
    <div className="flex justify-between items-baseline py-1 border-b border-slate-50">
      <span className="text-[11px] text-slate-500">{l}</span>
      <span className={"text-[12px] font-bold tabular-nums " + (c || "text-slate-800")}>{v}{u || ""}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-spark-500 to-spark-700 px-5 py-3 text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">{m.icon} {m.name}</h3>
            <p className="text-[10px] text-white/70 mt-0.5">{m.isP0 ? "Hauptergebnis (P₀)" : "Frontier-Variante"}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-1">
          <KR l="Ø Rendite (YTM)" v={fx(s.wY, 3)} u="%" c="text-spark-600" />
          <KR l="Ø I-Spread" v={fx(s.wS, 1)} u=" bp" c="text-spark-600" />
          <KR l="Ø Duration" v={fx(s.wD, 2)} u=" Y" />
          <KR l="Ø Restlaufzeit" v={fx(s.wM, 1)} u=" Y" />
          <KR l="Ø Kupon" v={fx(s.wK, 2)} u="%" />
          <KR l="Ø Preis" v={fx(s.wPx, 2)} />
          <KR l="Ø Rating" v={LBL[Math.round(s.wLn)] || fx(s.wLn, 1)} />
          <KR l="ESG-Quote" v={fx(s.gP * 100, 1)} u="%" c="text-emerald-600" />
          <KR l="Anleihen" v={s.nb} />
          <KR l="Emittenten" v={s.ni} />
          <KR l="Volumen" v={fmtVol(s.tN)} />
          <KR l="Rendite / RW" v={fx(s.yRw || 0, 2)} />
          <KR l="RWA (EK 8%)" v={fmtVol(s.tRWA)} />
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button onClick={() => {
            setResult(m.result);
            setAutoOptSelected(m.id);
            onClose();
          }} className="flex-1 bg-gradient-to-r from-spark-500 to-spark-700 text-white font-bold text-sm py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md">
            ✓ Portfolio übernehmen
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
