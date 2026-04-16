import React, { useState } from 'react';

export default function ComparisonPanels({ mkt, pf }) {
  if (!mkt || !pf) return null;
  const allRatings = Array.from(new Set([...Object.keys(mkt.rc || {}), ...Object.keys(pf.rc || {})])).sort((a, b) => { const valA = RS[a] || 99; const valB = RS[b] || 99; return valA === valB ? a.localeCompare(b) : valA - valB; });
  const allCountries = Array.from(new Set([...Object.keys(mkt.cc || {}), ...Object.keys(pf.cc || {})])).sort((a, b) => { const aW = (mkt.cc[a] || 0) + (pf.cc[a] || 0); const bW = (mkt.cc[b] || 0) + (pf.cc[b] || 0); return bW - aW; });
  const CompareBar = ({ label, icon, mPct, pPct, color = "bg-spark-500", textCol = "text-spark-600" }) => (
    <div className="py-2 border-b border-slate-50 last:border-0 group">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">{icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}{label}</span>
        <div className="flex gap-3 tabular-nums text-[10px]"><span className="text-slate-400">M: {fx(mPct * 100, 1)}%</span><span className={`font-black ${textCol}`}>P: {fx(pPct * 100, 1)}%</span></div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-300 rounded-full transition-all duration-700" style={{ width: `${Math.min(mPct * 100, 100)}%` }} /></div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all duration-700 shadow-sm`} style={{ width: `${Math.min(pPct * 100, 100)}%` }} /></div>
      </div>
    </div>
  );
  const [openSections, setOpenSections] = useState({ rat: true, mat: false, co: true, str: false, sek: false });
  const toggleSection = (k) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));
  const Section = ({ id, title, borderColor, children }) => (
    <div className="flex flex-col h-[850px]">
      <h4 onClick={() => toggleSection(id)} className={`dist-header uppercase font-black text-slate-400 tracking-wider mb-4 border-l-2 ${borderColor} pl-2 shrink-0 cursor-pointer md:cursor-default flex items-center justify-between`}>
        {title}<span className="md:hidden text-[10px] text-slate-300">{openSections[id] ? "▾" : "▸"}</span>
      </h4>
      <div className={(openSections[id] ? "" : "hidden md:block ") + "space-y-1 flex-1 min-h-0 overflow-y-auto pr-2"}>{children}</div>
    </div>
  );
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm mt-4 sm:mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 min-w-0"><span className="text-xl shrink-0">⚖️</span><div className="min-w-0"><h3 className="constraint-title font-black text-slate-800 uppercase tracking-widest">Allokationsvergleich</h3><p className="constraint-desc text-slate-500 font-medium mt-0.5">Aktive Über- und Untergewichtung gegenüber dem Anlageuniversum</p></div></div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0"><div className="flex items-center gap-1.5"><div className={"w-3 h-1.5 rounded-full " + (mkt._custom ? "bg-slate-500" : "bg-slate-300")}></div> {mkt._custom ? "Benchmark" : "Markt Ø"}</div><div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-slate-800"></div> Portfolio</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Section id="rat" title="Ratingverteilung" borderColor="border-spark-400">{allRatings.map(r => (<CompareBar key={r} label={r} mPct={(mkt.rc[r]||0)/mkt.tN} pPct={(pf.rc[r]||0)/pf.tN} color="bg-spark-500" textCol="text-spark-700" />))}</Section>
        <Section id="mat" title="Laufzeitenverteilung" borderColor="border-spark-400">{getActiveBuckets(mkt, pf).map(bk => (<CompareBar key={bk} label={bk} mPct={(mkt.bc[bk]||0)/mkt.tN} pPct={(pf.bc[bk]||0)/pf.tN} color="bg-spark-400" textCol="text-spark-600" />))}</Section>
        <Section id="co" title="Länderverteilung" borderColor="border-spark-400">{allCountries.map(c => (<CompareBar key={c} icon={<Flag c={c} />} label={CN[c] || c} mPct={(mkt.cc[c]||0)/mkt.tN} pPct={(pf.cc[c]||0)/pf.tN} color="bg-spark-500" textCol="text-spark-600" />))}</Section>
        <Section id="sek" title="Sektorverteilung" borderColor="border-violet-400"><CompareBar label="Banken" mPct={mkt.banksP || 0} pPct={pf.banksP || 0} color="bg-blue-500" textCol="text-blue-700" /><CompareBar label="Versicherungen" mPct={mkt.insP || 0} pPct={pf.insP || 0} color="bg-teal-500" textCol="text-teal-600" /><CompareBar label="Finanzdienstl." mPct={mkt.finP || 0} pPct={pf.finP || 0} color="bg-violet-500" textCol="text-violet-600" />{((mkt.reitsP||0) > 0 || (pf.reitsP||0) > 0) && <CompareBar label="REITs" mPct={mkt.reitsP || 0} pPct={pf.reitsP || 0} color="bg-amber-500" textCol="text-amber-600" />}{((mkt.otherP||0) > 0 || (pf.otherP||0) > 0) && <CompareBar label="Sonstige" mPct={mkt.otherP || 0} pPct={pf.otherP || 0} color="bg-slate-400" textCol="text-slate-600" />}</Section>
        <Section id="str" title="Struktur (ESG & Rang)" borderColor="border-emerald-400"><CompareBar label="Green / ESG" mPct={mkt.gP} pPct={pf.gP} color="bg-emerald-500" textCol="text-emerald-600" /><CompareBar label="Conventional" mPct={1 - mkt.gP} pPct={1 - pf.gP} color="bg-slate-700" textCol="text-slate-800" /><div className="my-2 border-t border-slate-100"></div><CompareBar label="Senior Preferred" mPct={mkt.spP || 0} pPct={pf.spP || 0} color="bg-spark-500" textCol="text-spark-600" /><CompareBar label="Sr Unsecured" mPct={mkt.suP || 0} pPct={pf.suP || 0} color="bg-blue-500" textCol="text-blue-600" /><CompareBar label="Senior Non-Pref." mPct={mkt.snpP || 0} pPct={pf.snpP || 0} color="bg-slate-500" textCol="text-slate-600" /><CompareBar label="Secured" mPct={mkt.secP || 0} pPct={pf.secP || 0} color="bg-amber-500" textCol="text-amber-600" />{((mkt.t2P||0) > 0 || (pf.t2P||0) > 0) && <CompareBar label="Tier 2" mPct={mkt.t2P || 0} pPct={pf.t2P || 0} color="bg-orange-500" textCol="text-orange-600" />}{((mkt.at1P||0) > 0 || (pf.at1P||0) > 0) && <CompareBar label="AT1" mPct={mkt.at1P || 0} pPct={pf.at1P || 0} color="bg-rose-500" textCol="text-rose-600" />}<div className="my-2 border-t border-slate-100"></div><CompareBar label="Bullet" mPct={mkt.bullP || 1} pPct={pf.bullP || 1} color="bg-slate-400" textCol="text-slate-600" /><CompareBar label="Callable" mPct={mkt.callP || 0} pPct={pf.callP || 0} color="bg-amber-400" textCol="text-amber-600" />{((mkt.perpP||0) > 0 || (pf.perpP||0) > 0) && <CompareBar label="Perpetual" mPct={mkt.perpP || 0} pPct={pf.perpP || 0} color="bg-rose-400" textCol="text-rose-600" />}<div className="my-2 border-t border-slate-100"></div><CompareBar label="Fixed Rate" mPct={mkt.fixP || 1} pPct={pf.fixP || 1} color="bg-slate-500" textCol="text-slate-700" />{((mkt.varP||0) > 0 || (pf.varP||0) > 0) && <CompareBar label="Variable Rate" mPct={mkt.varP || 0} pPct={pf.varP || 0} color="bg-blue-400" textCol="text-blue-600" />}{((mkt.zeroP||0) > 0 || (pf.zeroP||0) > 0) && <CompareBar label="Zero Coupon" mPct={mkt.zeroP || 0} pPct={pf.zeroP || 0} color="bg-slate-300" textCol="text-slate-500" />}</Section>
      </div>
    </div>
  );
}
