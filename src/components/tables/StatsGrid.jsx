import React, { useState, useEffect, useMemo } from 'react';

export default function StatsGrid({ s, mkt, isMarket = false }) {
  if (!s || !mkt) return null;
  const [tileOrder, setTileOrder] = useState(() => {
    const saved = lsLoad("cfg_tileOrder", null);
    if (saved && Array.isArray(saved)) {
      const validIds = new Set(DEFAULT_TILE_ORDER);
      const pruned = saved.filter(t => validIds.has(t.id));
      const known = new Set(pruned.map(t => t.id));
      DEFAULT_TILE_ORDER.forEach(id => { if (!known.has(id)) pruned.push({ id, visible: true }); });
      return pruned;
    }
    return DEFAULT_TILE_ORDER.map(id => ({ id, visible: true }));
  });
  const [showCfg, setShowCfg] = useState(false);
  useEffect(() => { lsSave("cfg_tileOrder", tileOrder); }, [tileOrder]);
  useEffect(() => {
    const handler = () => { const saved = lsLoad("cfg_tileOrder", null); if (saved) setTileOrder(saved); };
    window.addEventListener("tileOrderChanged", handler);
    return () => window.removeEventListener("tileOrderChanged", handler);
  }, []);
  const moveTile = (idx, dir) => setTileOrder(prev => {
    const arr = [...prev]; const ti = idx + dir;
    if (ti < 0 || ti >= arr.length) return prev;
    [arr[idx], arr[ti]] = [arr[ti], arr[idx]]; return arr;
  });
  const toggleTile = (id) => setTileOrder(prev => prev.map(t => t.id === id ? { ...t, visible: !t.visible } : t));
  const resetTiles = () => setTileOrder(DEFAULT_TILE_ORDER.map(id => ({ id, visible: true })));
  const [dragIdx, setDragIdx] = useState(null);

  const bmLbl = mkt._custom ? "vs BM" : "vs Markt";
  const MinMaxRow = ({ label, val }) => (<div className="flex justify-between items-center text-[11px] leading-tight"><span className="text-slate-400">{label}</span><span className="tabular-nums text-slate-600 font-bold">{val}</span></div>);
  const StatSub = ({ delta, isBp, suffix, min, max, fmtFunc }) => (
    <div className="flex flex-col gap-1 w-full">
      {!isMarket && delta !== undefined && (
        <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
          <span className={delta > 0 ? "text-spark-600" : delta < 0 ? "text-rose-500" : ""}>{delta > 0 ? "+" : ""}{isBp ? fx(delta * 100, 1) : fx(delta, 2)}{isBp ? " bp" : suffix}</span> {bmLbl}
        </div>
      )}
      <div className={!isMarket && delta !== undefined ? "border-t border-slate-100 pt-1.5 mt-0.5 flex flex-col gap-1" : "pt-0.5 flex flex-col gap-1"}>
        <MinMaxRow label="Min" val={fmtFunc(min)} />
        <MinMaxRow label="Max" val={fmtFunc(max)} />
      </div>
    </div>
  );
  const ns = s.nomStats || { min: 0, max: 0, med: 0, avg: 0 };
  const mns = mkt.nomStats || { min: 0, max: 0, med: 0, avg: 0 };
  const fmtNom = v => v >= 1000 ? fxV(v / 1000, 1) + " Mrd. €" : v >= 1 ? fxV(v, 1) + " Mio. €" : v > 0 ? fxV(v, 2) + " Mio. €" : "-";
  const tileRender = {
    volume: () => <Card label="Portfoliovolumen" value={fmtVol(s.tN)} sub={<div className="flex flex-col gap-1 mt-1"><MinMaxRow label="Positionen" val={s.nb} /><MinMaxRow label="Emittenten" val={s.ni} /></div>} />,
    price: () => <Card label="Preis Ø" value={fx(s.wPx, 2)} accent="text-slate-800" sub={<StatSub delta={s.wPx - mkt.wPx} isBp={false} suffix="" min={s.minPx} max={s.maxPx} fmtFunc={v => fx(v, 2)} />} />,
    yield: () => <Card label="Rendite Ø" value={fx(s.wY, 2) + "%"} accent="text-spark-600" sub={<StatSub delta={s.wY - mkt.wY} isBp={true} min={s.minY} max={s.maxY} fmtFunc={v => fx(v, 2) + "%"} />} />,
    coupon: () => <Card label="Kupon Ø" value={fx(s.wK, 2) + "%"} accent="text-slate-800" sub={<StatSub delta={s.wK - mkt.wK} isBp={true} min={s.minK} max={s.maxK} fmtFunc={v => fx(v, 2) + "%"} />} />,
    spread: () => <Card label="I-Spread Ø" value={fx(s.wS, 1) + " bp"} accent="text-spark-600" sub={<StatSub delta={s.wS - mkt.wS} isBp={false} suffix=" bp" min={s.minS} max={s.maxS} fmtFunc={v => fx(v, 1) + " bp"} />} />,
    maturity: () => <Card label="Laufzeit Ø" value={fx(s.wM, 1) + " Y"} accent="text-slate-800" sub={<StatSub delta={s.wM - mkt.wM} isBp={false} suffix=" Y" min={s.minM} max={s.maxM} fmtFunc={v => fx(v, 1) + " Y"} />} />,
    duration: () => <Card label="Mod. Duration" value={fx(s.wD, 2)} accent="text-slate-800" sub={<StatSub delta={s.wD - mkt.wD} isBp={false} suffix="" min={s.minD} max={s.maxD} fmtFunc={v => fx(v, 2)} />} />,
    yieldRw: () => <Card label="Rendite / Risikogewicht" value={fx(s.yRw, 2)} accent="text-spark-600" sub={<div className="mt-1">{!isMarket ? <div className="text-[10px] text-slate-500 whitespace-nowrap">{(s.yRw > mkt.yRw ? "+" : "") + fx(s.yRw - mkt.yRw, 2)} {bmLbl}</div> : null}</div>} />,
    esg: () => <Card label="ESG-Quote" value={fx(s.gP * 100, 0) + "%"} accent="text-emerald-600" sub={<div className="mt-1">{!isMarket ? <div className="text-[10px] text-slate-500 whitespace-nowrap">{(s.gP > mkt.gP ? "+" : "") + fx((s.gP - mkt.gP) * 100, 0)}pp {bmLbl}</div> : null}</div>} />,
    bondSize: () => <Card label="Allokation" value={s.nb + " Anleihen"} accent="text-slate-800" sub={
      <div className="flex flex-col gap-1 w-full">
        <MinMaxRow label="Emittenten" val={s.ni} />
        <div className="border-t border-slate-100 pt-1.5 mt-1 flex flex-col gap-1">
          <MinMaxRow label="Min" val={fmtNom(ns.min)} />
          <MinMaxRow label="Max" val={fmtNom(ns.max)} />
          <MinMaxRow label="Ø" val={fmtNom(ns.avg)} />
        </div>
      </div>
    } />,
    seniority: () => <BarCard label="Zahlungsrang"
      segments={[{lbl:"SP",val:s.spP},{lbl:"SU",val:s.suP},{lbl:"SNP",val:s.snpP},{lbl:"SEC",val:s.secP},{lbl:"T2",val:s.t2P},{lbl:"AT1",val:s.at1P}]}
      bmSegments={!isMarket ? [{lbl:"SP",val:mkt.spP},{lbl:"SU",val:mkt.suP},{lbl:"SNP",val:mkt.snpP},{lbl:"SEC",val:mkt.secP},{lbl:"T2",val:mkt.t2P},{lbl:"AT1",val:mkt.at1P}] : null}
      bmLabel={bmLbl} />,
    maturityType: () => <BarCard label="Fälligkeitstyp"
      segments={[{lbl:"Bullet",val:s.bullP||1},{lbl:"Callable",val:s.callP},{lbl:"Perpetual",val:s.perpP}]}
      bmSegments={!isMarket ? [{lbl:"Bullet",val:mkt.bullP||1},{lbl:"Callable",val:mkt.callP},{lbl:"Perpetual",val:mkt.perpP}] : null}
      bmLabel={bmLbl} />,
    couponType: () => <BarCard label="Kupontyp"
      segments={[{lbl:"Fixed",val:s.fixP},{lbl:"Variable",val:s.varP},{lbl:"Zero",val:s.zeroP}]}
      bmSegments={!isMarket ? [{lbl:"Fixed",val:mkt.fixP},{lbl:"Variable",val:mkt.varP},{lbl:"Zero",val:mkt.zeroP}] : null}
      bmLabel={bmLbl} />,
    sector: () => <BarCard label="Sektor (iBoxx L3)"
      segments={[{lbl:"Banken",val:s.banksP},{lbl:"Versich.",val:s.insP},{lbl:"Finanz.",val:s.finP},{lbl:"REITs",val:s.reitsP},{lbl:"Sonst.",val:s.otherP}]}
      bmSegments={!isMarket ? [{lbl:"Banken",val:mkt.banksP},{lbl:"Versich.",val:mkt.insP},{lbl:"Finanz.",val:mkt.finP},{lbl:"REITs",val:mkt.reitsP},{lbl:"Sonst.",val:mkt.otherP}] : null}
      bmLabel={bmLbl} />,
    riskWeight: () => <Card label="Risikogewicht (KSA)" value={fx(s.wR, 0) + "%"} sub={<div className="flex flex-col gap-1 mt-1">{!isMarket && <div className="text-[10px] text-slate-500 whitespace-nowrap border-b border-slate-100 pb-1.5 mb-0.5">{(s.wR > mkt.wR ? "+" : "") + fx(s.wR - mkt.wR, 0)}pp {bmLbl}</div>}<MinMaxRow label="EK-Bedarf" val={fmtVol(s.tRWA)} /></div>} />
  };
  const visibleTiles = tileOrder.filter(t => t.visible && tileRender[t.id]);
  return (
    <div>
      <div className="flex justify-end mb-1.5 relative">
        <button onClick={() => setShowCfg(!showCfg)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-sm" title="Kacheln konfigurieren">⚙</button>
        {showCfg && (
          <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-72 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Kacheln konfigurieren</span>
              <button onClick={() => setShowCfg(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="flex flex-col gap-0.5">
              {tileOrder.map((t, idx) => (
                <div key={t.id} draggable onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIdx !== null && dragIdx !== idx) { setTileOrder(prev => { const arr = [...prev]; const item = arr.splice(dragIdx, 1)[0]; arr.splice(idx, 0, item); return arr; }); } setDragIdx(null); }} onDragEnd={() => setDragIdx(null)}
                  className={"flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors " + (dragIdx === idx ? "bg-spark-50 ring-1 ring-spark-300" : "hover:bg-slate-50") + " cursor-grab active:cursor-grabbing"}>
                  <span className="text-slate-300 text-[10px] select-none">⠿</span>
                  <label className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                    <input type="checkbox" checked={t.visible} onChange={() => toggleTile(t.id)} className="accent-spark-500 w-3.5 h-3.5" />
                    <span className={"font-medium " + (t.visible ? "text-slate-700" : "text-slate-400 line-through")}>{TILE_LABELS[t.id] || t.id}</span>
                  </label>
                  <div className="flex gap-0.5">
                    <button onClick={() => moveTile(idx, -1)} disabled={idx === 0} className="w-5 h-5 rounded text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed touch-target-44" aria-label="Kachel nach oben verschieben">▲</button>
                    <button onClick={() => moveTile(idx, 1)} disabled={idx === tileOrder.length - 1} className="w-5 h-5 rounded text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed touch-target-44" aria-label="Kachel nach unten verschieben">▼</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
              <button onClick={() => setTileOrder(prev => prev.map(t => ({ ...t, visible: true })))} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Alle</button>
              <button onClick={() => setTileOrder(prev => prev.map(t => ({ ...t, visible: false })))} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Keine</button>
              <button onClick={resetTiles} className="text-[10px] font-bold text-spark-600 hover:text-spark-700 px-2 py-1 rounded hover:bg-spark-50 transition-colors ml-auto">Zurücksetzen</button>
            </div>
          </div>
        )}
      </div>
      <div className="kpi-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 items-stretch">
        {visibleTiles.map((t, vi) => {
          const realIdx = tileOrder.findIndex(o => o.id === t.id);
          return (
            <div key={t.id} draggable onDragStart={e => { setDragIdx(realIdx); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={() => { if (dragIdx !== null && dragIdx !== realIdx) { setTileOrder(prev => { const arr = [...prev]; const item = arr.splice(dragIdx, 1)[0]; arr.splice(realIdx, 0, item); return arr; }); } setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
              className={"cursor-grab active:cursor-grabbing transition-all duration-150 " + (dragIdx === realIdx ? "opacity-40 scale-95" : "opacity-100")}>
              {tileRender[t.id]()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
