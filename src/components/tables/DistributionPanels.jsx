import React, { useState } from 'react';

export default function DistributionPanels({ s, isMarket = false, bonds = [] }) {
  if (!s) return null;
  const hasLocked = bonds.some(b => b.locked);
  const StackedBar = ({ label, icon, value, max, lockedV, neuV }) => {
    const lPct = max > 0 && lockedV > 0 ? (lockedV / max) * 100 : 0;
    const nPct = max > 0 && neuV > 0 ? (neuV / max) * 100 : 0;
    return (
      <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate pr-2 w-2/5" title={label}>{icon}{label}</div>
        {hasLocked ? (
          <div className="flex items-center gap-2 w-3/5">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
              {lPct > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: lPct + "%" }} />}
              {nPct > 0 && <div className="h-full bg-emerald-400 transition-all" style={{ width: nPct + "%" }} />}
            </div>
            <div className="text-right whitespace-nowrap min-w-[60px]">
              <span className="tabular-nums font-bold text-slate-800">{fmtVol(value)}</span>
            </div>
          </div>
        ) : (
          <div className={`tabular-nums font-bold text-right whitespace-nowrap ${value > max * 0.15 ? "text-rose-500" : "text-slate-800"}`}>{fmtVol(value)}</div>
        )}
      </div>
    );
  };
  const lockedIC = {}, neuIC = {}, lockedCC = {}, neuCC = {}, lockedBC = {}, neuBC = {};
  if (hasLocked) {
    bonds.forEach(b => {
      const nom = b.nom || 0;
      if (b.locked) {
        lockedIC[b.e] = (lockedIC[b.e] || 0) + nom;
        lockedCC[b.co] = (lockedCC[b.co] || 0) + nom;
        lockedBC[b.bkt] = (lockedBC[b.bkt] || 0) + nom;
      } else {
        neuIC[b.e] = (neuIC[b.e] || 0) + nom;
        neuCC[b.co] = (neuCC[b.co] || 0) + nom;
        neuBC[b.bkt] = (neuBC[b.bkt] || 0) + nom;
      }
    });
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {hasLocked && (
        <div className="lg:col-span-4 flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
          <span>Legende:</span>
          <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-amber-400"></div> Bestand</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-emerald-400"></div> Neuanlage</div>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
        <div className="dist-header uppercase font-black text-slate-500 tracking-wider mb-3 pb-2 border-b border-slate-100 shrink-0">Emittentenkonzentration</div>
        <div className="space-y-2 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          {Object.entries(s.ic).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([e, v]) => (
            <div key={e} className="flex items-center text-xs py-1.5 border-b border-slate-50 last:border-0 gap-2">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate min-w-0 flex-1" title={e}><Flag c={s.icMap[e]} /><span className="truncate">{e}</span></div>
              <span className="tabular-nums font-bold text-slate-800 whitespace-nowrap">{fmtVol(v)}</span>
              <span className="tabular-nums text-slate-400 text-[10px] w-[28px] text-right shrink-0">{fx(v / s.tN * 100, 0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
        <div className="dist-header uppercase font-black text-slate-500 tracking-wider mb-3 pb-2 border-b border-slate-100 shrink-0">Länderverteilung</div>
        <div className="space-y-3 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          {hasLocked ? Object.entries(s.cc).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
            <StackedBar key={c} label={CN[c] || c} icon={<Flag c={c} />} value={v} max={s.tN} lockedV={lockedCC[c] || 0} neuV={neuCC[c] || 0} />
          )) : Object.entries(s.cc).sort((a, b) => b[1] - a[1]).map(([c, v]) => (<Bar key={c} icon={<Flag c={c} />} label={CN[c] || c} value={v} max={s.tN} pct={fx(v / s.tN * 100, 0) + "%"} />))}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
        <div className="dist-header uppercase font-black text-slate-500 tracking-wider mb-3 pb-2 border-b border-slate-100 shrink-0">Laufzeitenverteilung</div>
        <div className="space-y-3 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          {hasLocked ? ALL_BUCKETS.filter(bk => (s.bc[bk] || 0) > 0 || (lockedBC[bk] || 0) > 0 || (neuBC[bk] || 0) > 0).map(bk => (
            <StackedBar key={bk} label={bk} value={s.bc[bk] || 0} max={s.tN} lockedV={lockedBC[bk] || 0} neuV={neuBC[bk] || 0} />
          )) : ALL_BUCKETS.filter(bk => (s.bc[bk] || 0) > 0).map(bk => <Bar key={bk} label={bk} value={s.bc[bk] || 0} max={s.tN} pct={(s.bc[bk] || 0) > 0 ? fx((s.bc[bk] || 0) / s.tN * 100, 0) + "%" : "-"} />)}
        </div>
      </div>
      {isMarket ? (<React.Fragment>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
          <div className="dist-header uppercase font-black text-slate-500 tracking-wider mb-3 pb-2 border-b border-slate-100 shrink-0">Ratingverteilung</div>
          <div className="space-y-3 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
            {Object.entries(s.rc).sort((a, b) => (RS[a[0]] || 99) - (RS[b[0]] || 99)).map(([r, v]) => (<Bar key={r} label={r} value={v} max={s.tN} pct={fx(v / s.tN * 100, 0) + "%"} />))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
          <div className="dist-header uppercase font-black text-slate-500 tracking-wider mb-3 pb-2 border-b border-slate-100 shrink-0">Sektorverteilung</div>
          <div className="space-y-3 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
            {Object.entries(s.sc || {}).sort((a, b) => b[1] - a[1]).map(([sk, v]) => (<Bar key={sk} label={SEKTOR_LABELS[sk] || sk} value={v} max={s.tN} pct={fx(v / s.tN * 100, 0) + "%"} />))}
          </div>
        </div>
      </React.Fragment>) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px] justify-between">
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-3">Struktur / Risiko</div>
            <div className="space-y-3 text-xs font-medium text-slate-600">
              <div className="flex justify-between items-center"><span>Ø Risikogewicht</span><span className="tabular-nums bg-slate-100 px-2 py-0.5 rounded text-slate-800">{fx(s.wR, 1)}%</span></div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2"><span>RWA Gesamt</span><span className="tabular-nums">{fmtVol(s.tN * (s.wR / 100))}</span></div>
              <div className="flex justify-between items-center pt-1"><span className="text-slate-800 font-bold">EK-Unterlegung (8%)</span><span className="tabular-nums font-bold text-spark-600 text-sm">{fmtVol(s.tRWA)}</span></div>
              <div className="flex justify-between items-center mt-2"><span className="text-slate-600">20% RW Anteil (KSA)</span><span className="tabular-nums">{fx(s.r20P * 100, 0)}%</span></div>
              <div className="flex justify-between items-center"><span className="text-emerald-600">Green/ESG Anteil</span><span className="tabular-nums">{fx(s.gP * 100, 0)}%</span></div>
              {[["Senior Preferred","text-spark-600",s.spP],["Sr Unsecured","text-blue-600",s.suP],["Senior Non-Preferred","text-slate-600",s.snpP],["Secured","text-amber-600",s.secP],["Tier 2","text-orange-600",s.t2P],["AT1","text-rose-600",s.at1P]].filter(([,,v]) => (v||0) > 0).map(([l,c,v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className={"text-[11px] font-medium " + c}>{l}</span>
                  <span className="text-[11px] tabular-nums font-bold">{fx((v||0) * 100, 0)}%</span>
                </div>
              ))}
              <div className="my-1.5 border-t border-slate-100"></div>
              {[["Bullet","text-slate-600",s.bullP||1],["Callable","text-amber-600",s.callP],["Perpetual","text-rose-600",s.perpP]].filter(([,,v]) => (v||0) > 0).map(([l,c,v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className={"text-[11px] font-medium " + c}>{l}</span>
                  <span className="text-[11px] tabular-nums font-bold">{fx((v||0) * 100, 0)}%</span>
                </div>
              ))}
              <div className="my-1.5 border-t border-slate-100"></div>
              {[["Fixed","text-slate-700",s.fixP],["Variable","text-blue-600",s.varP],["Zero Coupon","text-slate-500",s.zeroP]].filter(([,,v]) => (v||0) > 0).map(([l,c,v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className={"text-[11px] font-medium " + c}>{l}</span>
                  <span className="text-[11px] tabular-nums font-bold">{fx((v||0) * 100, 0)}%</span>
                </div>
              ))}
              <div className="my-1.5 border-t border-slate-100"></div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Sektor</div>
              {[["Banken","text-blue-700",s.banksP],["Versicherungen","text-teal-600",s.insP],["Finanzdienstl.","text-violet-600",s.finP],["REITs","text-amber-600",s.reitsP],["Sonstige","text-slate-500",s.otherP]].filter(([,,v]) => (v||0) > 0).map(([l,c,v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className={"text-[11px] font-medium " + c}>{l}</span>
                  <span className="text-[11px] tabular-nums font-bold">{fx((v||0) * 100, 0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Rating-Verteilung</div>
            <div className="space-y-2">
              {Object.entries(s.rc).sort((a, b) => (RS[a[0]] || 99) - (RS[b[0]] || 99)).map(([r, v]) => {
                const w = s.tN > 0 ? Math.min((v / s.tN) * 100, 100) : 0;
                return (<div key={r} className="flex items-center gap-2"><span className="w-8 text-slate-600 tabular-nums text-[10px] font-bold">{r}</span><div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-spark-500 rounded-full" style={{ width: w + "%" }} /></div><span className="w-8 text-right text-slate-500 tabular-nums text-[10px]">{fx(w, 0)}%</span></div>);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
