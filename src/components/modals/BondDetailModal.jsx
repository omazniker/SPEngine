import React from 'react';

export default function BondDetailModal({ bond, onClose }) {
  if (!bond) return null;
  const maturityDate = bond.fall ? (() => { const d = new Date(bond.fall); return !isNaN(d) ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date(Date.now() + bond.mty * 365.25 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); })() : new Date(Date.now() + bond.mty * 365.25 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const msciColors = { 'AAA': 'bg-emerald-100 text-emerald-700 border-emerald-200', 'AA': 'bg-emerald-50 text-emerald-600 border-emerald-200', 'A': 'bg-teal-50 text-teal-600 border-teal-200', 'BBB': 'bg-amber-50 text-amber-600 border-amber-200', 'BB': 'bg-orange-50 text-orange-600 border-orange-200' };
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bond-modal-title">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border-0 sm:border border-slate-200 h-full sm:h-auto max-h-screen sm:max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><div><h3 id="bond-modal-title" className="text-lg font-black text-slate-800">{bond.e}</h3><p className="text-xs text-slate-500 font-mono tracking-widest">{bond.isin}</p>{bond.desc && <p className="text-[10px] text-slate-500 mt-0.5">{bond.desc}</p>}</div><button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500 text-xl" aria-label="Dialog schließen">✕</button></div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Ticker</p><p className="text-sm font-bold text-slate-700">{bond.t}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Land</p><div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Flag c={bond.co} /> {CN[bond.co] || bond.co}</div></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Rating Anleihe (M/S&P)</p><div className="flex gap-1"><Tag c="blue">{bond.mo}</Tag><Tag c="blue">{bond.sp}</Tag></div></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Rating Emittent (M/S&P)</p><div className="flex gap-1"><Tag c="green">{bond.moEff || 'NR'}</Tag><Tag c="green">{bond.spEff || 'NR'}</Tag></div></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Kupon</p><p className="text-sm font-bold text-slate-700">{fx(bond.k, 3)}%</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Rendite (YTM)</p><p className="text-sm font-bold text-slate-800">{fx(bond.y, 3)}%</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Brief-Kurs</p><p className="text-sm font-bold text-slate-700">{bond.px ? fx(bond.px, 2) : "-"}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">I-Spread</p><p className="text-sm font-bold text-spark-600">{fx(bond.s, 1)} bp</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Restlaufzeit</p><p className="text-sm font-bold text-slate-700">{fx(bond.mty, 2)} Jahre</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Fälligkeitsdatum</p><p className="text-sm font-bold text-slate-700">{maturityDate}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Mod. Duration</p><p className="text-sm font-bold text-slate-700">{fx(bond.md, 2)}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">KSA-Gewicht</p><Tag c={bond.rw === 20 ? "green" : "gray"}>{bond.rw}%</Tag></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">LQA Score</p><p className="text-sm font-bold text-slate-700">{bond.lqa || "-"}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">ESG Status</p>{bond.g ? <Tag c="green">ESG / Green</Tag> : <Tag c="gray">Conventional</Tag>}</div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">MSCI ESG Rating</p>{bond.msciEsg && bond.msciEsg !== 'N.S.' ? <span className={"px-2 py-0.5 rounded-full text-[11px] font-bold border inline-block " + (msciColors[bond.msciEsg] || "bg-slate-100 text-slate-500 border-slate-200")}>{bond.msciEsg}</span> : <span className="text-sm text-slate-400">N.S.</span>}</div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Kupon-Typ</p><p className="text-sm font-bold text-slate-700">{bond.kpnTyp || "FIXED"}</p></div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Zahlungsrang</p>
            <span className={"px-2.5 py-1 rounded-full text-[11px] font-bold inline-block " + rankBadgeCls(bond.rank || "SP")}>
              {bond.rankDetail || RANK_LABELS[bond.rank || "SP"] || bond.rank || "SP"}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Fälligkeitstyp</p>
            <span className={"px-2.5 py-1 rounded-full text-[11px] font-bold inline-block " +
              (bond.callable
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : "bg-slate-100 text-slate-600 border border-slate-200")}>
              {bond.callable ? "Callable" : "Bullet (Fixed Rate)"}
            </span>
          </div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Emissionsvolumen</p><p className="text-sm font-bold text-slate-700">{fmtVol(bond.vol)}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Sektor</p><p className="text-sm font-bold text-slate-700">{SEKTOR_LABELS[bond.sektor] || bond.sektor || "-"}</p></div>
          <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Branche</p><p className="text-sm font-bold text-slate-700">{bond.branche || "-"}</p></div>
          {bond.bicsL1 && <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">BICS L1</p><p className="text-sm font-bold text-slate-700">{bond.bicsL1}</p></div>}
          {bond.bicsL2 && <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">BICS L2</p><p className="text-sm font-bold text-slate-700">{bond.bicsL2}</p></div>}
          {bond.classL3 && <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Klassifikation L3</p><p className="text-sm font-bold text-slate-700">{bond.classL3}</p></div>}
          {(bond.gldPrs != null || bond.brfPrs != null) && <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-slate-400">Geld / Brief</p><p className="text-sm font-bold text-slate-700">{bond.gldPrs != null ? fx(bond.gldPrs, 2) : "-"} / {bond.brfPrs != null ? fx(bond.brfPrs, 2) : "-"}</p></div>}
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end"><button onClick={onClose} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all">Schließen</button></div>
      </div>
    </div>
  );
}
