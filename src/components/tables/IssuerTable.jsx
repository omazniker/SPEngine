import React, { useState, useMemo, useCallback } from 'react';

const ICOLS = [
  { key: "ie", label: "Emittent", align: "left", sk: "e", required: true },
  { key: "it", label: "Ticker", align: "center", sk: "t" },
  { key: "ico", label: "Land", align: "center", sk: "co" },
  { key: "icnt", label: "# Bonds", align: "center", sk: "count" },
  { key: "inom", label: "Volumen", align: "right", sk: "nom" },
  { key: "iwt", label: "Gewicht", align: "right", sk: "weight" },
  { key: "ilo", label: "Rating Ø", align: "center", sk: "wLn" },
  { key: "iwY", label: "Rendite Ø", align: "right", sk: "wY" },
  { key: "iwS", label: "Spread Ø", align: "right", sk: "wS" },
  { key: "iwD", label: "Dur Ø", align: "right", sk: "wD" },
  { key: "igP", label: "ESG %", align: "right", sk: "gP" },
  { key: "ityp", label: "Typ", align: "center" },
  { key: "isrc", label: "Quelle", align: "center" }
];

function renderIssuerCell(key, i) {
  const hasLocked = i.lockedNom > 0; const hasNeu = i.neuNom > 0; const mixed = hasLocked && hasNeu; const lockedOnly = hasLocked && !hasNeu;
  switch (key) {
    case "ie": return <td key="ie" className={"px-3 py-2 text-slate-800 font-medium whitespace-nowrap group-hover:text-spark-600" + (lockedOnly ? " border-l-[3px] border-amber-400" : mixed ? " border-l-[3px] border-emerald-400" : "")}><div className="flex items-center gap-1.5"><Flag c={i.co} /><span className="truncate">{i.e}</span></div></td>;
    case "it": return <td key="it" className="px-3 py-2 text-center text-slate-500 text-[11px]"><span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{i.t}</span></td>;
    case "ico": return <td key="ico" className="px-3 py-2 text-center text-[10px] font-bold text-slate-600"><div className="flex items-center justify-center gap-1"><Flag c={i.co} />{i.co}</div></td>;
    case "icnt": return <td key="icnt" className="px-3 py-2 text-center text-slate-600 tabular-nums">{i.count}</td>;
    case "inom": return <td key="inom" className="px-3 py-2 text-right tabular-nums">{mixed ? (<div className="flex flex-col items-end gap-0.5"><span className="text-slate-800 font-bold">{fmtVol(i.nom)}</span><div className="flex items-center gap-1 text-[9px]"><span className="text-amber-600">{fmtVol(i.lockedNom)} B</span><span className="text-slate-300">+</span><span className="text-emerald-600">{fmtVol(i.neuNom)} N</span></div></div>) : <span className="text-slate-800 font-bold">{fmtVol(i.nom)}</span>}</td>;
    case "iwt": return <td key="iwt" className="px-3 py-2 text-right text-slate-500 tabular-nums">{fx(i.weight * 100, 1)}%</td>;
    case "ilo": return <td key="ilo" className="px-3 py-2 text-center"><Tag c={i.wLn >= 8 && i.wLn < 99 ? "gray" : "blue"}>{i.lo}</Tag></td>;
    case "iwY": return <td key="iwY" className="px-3 py-2 text-right text-slate-800 tabular-nums font-semibold">{fx(i.wY, 2)}%</td>;
    case "iwS": return <td key="iwS" className="px-3 py-2 text-right text-spark-600 tabular-nums font-semibold">{fx(i.wS, 1)} bp</td>;
    case "iwD": return <td key="iwD" className="px-3 py-2 text-right text-slate-600 tabular-nums">{fx(i.wD, 2)}</td>;
    case "igP": return <td key="igP" className="px-3 py-2 text-right text-emerald-500 tabular-nums">{fx(i.gP * 100, 0)}%</td>;
    case "ityp": return <td key="ityp" className="px-3 py-2 text-center">{i.hasCallable ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{fx((i.callP||0)*100, 0)}% Call</span> : <span className="text-[10px] text-slate-400">Bullet</span>}</td>;
    case "isrc": return <td key="isrc" className="px-3 py-2 text-center">{mixed ? <div className="flex gap-0.5 justify-center"><span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">B</span><span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">N</span></div> : lockedOnly ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Bestand</span> : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Neu</span>}</td>;
    default: return null;
  }
}

const IssuerTable = React.memo(function IssuerTable({ pf, onIssuerClick, hideFilters = false, filter, allBonds }) {
  const [sK, setSK] = useState("nom"); const [sD, setSD] = useState(-1);
  const [showFilters, setShowFilters] = useState(true);
  const [iColOrder, setIColOrder] = useState(ICOLS.map(c => c.key));
  const [iHiddenCols, setIHiddenCols] = useState([]);
  const iVisibleCols = useMemo(() => iColOrder.filter(k => !iHiddenCols.includes(k)), [iColOrder, iHiddenCols]);
  const [iDragCol, setIDragCol] = useState(null);
  const [iDragOverCol, setIDragOverCol] = useState(null);
  const handleIDragStart = (k) => setIDragCol(k);
  const handleIDragOver = (e, k) => { e.preventDefault(); if (k !== iDragCol) setIDragOverCol(k); };
  const handleIDrop = (k) => { if (!iDragCol || iDragCol === k) { setIDragCol(null); setIDragOverCol(null); return; } setIColOrder(prev => { const arr = [...prev]; const from = arr.indexOf(iDragCol); const to = arr.indexOf(k); arr.splice(from, 1); arr.splice(to, 0, iDragCol); return arr; }); setIDragCol(null); setIDragOverCol(null); };
  const handleIDragEnd = () => { setIDragCol(null); setIDragOverCol(null); };
  const [_fQ, _setFQ] = useState("");
  const [_fCountries, _setFCountries] = useState([]); const [_fRatings, _setFRatings] = useState([]);
  const [_minY, _setMinY] = useState(""); const [_maxY, _setMaxY] = useState("");
  const [_minS, _setMinS] = useState(""); const [_maxS, _setMaxS] = useState("");
  const [_minD, _setMinD] = useState(""); const [_maxD, _setMaxD] = useState("");
  const [_minESG, _setMinESG] = useState(""); const [_maxESG, _setMaxESG] = useState("");
  const [_fSource, _setFSource] = useState("all");
  const [_fSektor, _setFSektor] = useState([]);
  const fQ = filter ? filter.fQ : _fQ; const setFQ = filter ? filter.setFQ : _setFQ;
  const fCountries = filter ? filter.fCountries : _fCountries; const setFCountries = filter ? filter.setFCountries : _setFCountries;
  const fRatings = filter ? filter.fRatings : _fRatings; const setFRatings = filter ? filter.setFRatings : _setFRatings;
  const fSektor = filter ? (filter.fSektor ?? _fSektor) : _fSektor; const setFSektor = filter ? (filter.setFSektor ?? _setFSektor) : _setFSektor;
  const minY = filter ? filter.minY : _minY; const setMinY = filter ? filter.setMinY : _setMinY;
  const maxY = filter ? filter.maxY : _maxY; const setMaxY = filter ? filter.setMaxY : _setMaxY;
  const minS = filter ? filter.minS : _minS; const setMinS = filter ? filter.setMinS : _setMinS;
  const maxS = filter ? filter.maxS : _maxS; const setMaxS = filter ? filter.setMaxS : _setMaxS;
  const minD = filter ? filter.minD : _minD; const setMinD = filter ? filter.setMinD : _setMinD;
  const maxD = filter ? filter.maxD : _maxD; const setMaxD = filter ? filter.setMaxD : _setMaxD;
  const minESG = filter ? filter.minESG : _minESG; const setMinESG = filter ? filter.setMinESG : _setMinESG;
  const maxESG = filter ? filter.maxESG : _maxESG; const setMaxESG = filter ? filter.setMaxESG : _setMaxESG;
  const resetFilters = filter ? () => { filter.reset(); } : () => { _setFCountries([]); _setFRatings([]); _setFSektor([]); _setMinY(""); _setMaxY(""); _setMinS(""); _setMaxS(""); _setMinD(""); _setMaxD(""); _setMinESG(""); _setMaxESG(""); _setFQ(""); _setFSource("all"); };
  const iStats = useMemo(() => getIssuerStats(pf), [pf]);
  const allIStats = useMemo(() => allBonds ? getIssuerStats(allBonds) : iStats, [allBonds, iStats]);
  const doSort = useCallback(k => { if (sK === k) setSD(d => d * -1); else { setSK(k); setSD(-1); } }, [sK]);
  const filterOpts = useMemo(() => {
    const laender = Array.from(new Set(allIStats.map(i => i.co))).map(c => ({ val: c, lbl: CN[c] || c, co: c })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const ratings = Array.from(new Set(allIStats.map(i => i.lo))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const sektorOpts = Array.from(new Set(allIStats.map(i => i.sektor).filter(Boolean))).map(s => ({ val: s, lbl: SEKTOR_LABELS[s] || s })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    return { laender, ratings, sektorOpts };
  }, [allIStats]);
  const filteredAndSorted = useMemo(() => {
    let res = [...iStats];
    if (fQ) { const q = fQ.toLowerCase(); res = res.filter(i => i.e.toLowerCase().includes(q) || i.t.toLowerCase().includes(q)); }
    if (fCountries.length > 0) res = res.filter(i => fCountries.includes(i.co));
    if (fRatings.length > 0) res = res.filter(i => fRatings.includes(i.lo));
    if (fSektor.length > 0) res = res.filter(i => fSektor.includes(i.sektor));
    const py = parseFloat(minY); if (!isNaN(py)) res = res.filter(i => i.wY >= py);
    const pmaxY = parseFloat(maxY); if (!isNaN(pmaxY)) res = res.filter(i => i.wY <= pmaxY);
    const ps = parseFloat(minS); if (!isNaN(ps)) res = res.filter(i => i.wS >= ps);
    const pmaxS = parseFloat(maxS); if (!isNaN(pmaxS)) res = res.filter(i => i.wS <= pmaxS);
    const pd = parseFloat(minD); if (!isNaN(pd)) res = res.filter(i => i.wD >= pd);
    const pmaxD = parseFloat(maxD); if (!isNaN(pmaxD)) res = res.filter(i => i.wD <= pmaxD);
    const pesg = parseFloat(minESG); if (!isNaN(pesg)) res = res.filter(i => (i.gP * 100) >= pesg);
    const pmaxEsg = parseFloat(maxESG); if (!isNaN(pmaxEsg)) res = res.filter(i => (i.gP * 100) <= pmaxEsg);
    if (_fSource !== "all") { if (_fSource === "BESTAND") res = res.filter(i => i.lockedNom > 0); else res = res.filter(i => i.neuNom > 0); }
    res.sort((a, b) => { let vA = a[sK], vB = b[sK]; if (vA == null) vA = ""; if (vB == null) vB = ""; if (typeof vA === 'string') return vA.localeCompare(vB) * sD; return (vA > vB ? 1 : vA < vB ? -1 : 0) * sD; });
    return res;
  }, [iStats, sK, sD, fQ, fCountries, fRatings, fSektor, minY, maxY, minS, maxS, minD, maxD, minESG, maxESG, _fSource]);
  const handleExport = () => {
    const headers = ["Emittent", "Ticker", "Land", "# Anleihen", "Volumen (Mio. €)", "Gewicht (%)", "Rating Ø", "Rendite Ø (%)", "Spread Ø (bp)", "Duration Ø", "ESG (%)", "Typ", "Sektor", "Branche"];
    const dataRows = filteredAndSorted.map(i => {
      const firstBond = pf.find(b => b.t === i.t) || {};
      return [
        i.e, i.t, CN[i.co] || i.co, i.count, Math.round(i.nom * 100) / 100, Math.round(i.weight * 10000) / 100,
        i.lo, Math.round(i.wY * 1000) / 1000, Math.round(i.wS * 10) / 10, Math.round(i.wD * 100) / 100,
        Math.round(i.gP * 10000) / 100, i.hasCallable ? `${(i.callP * 100).toFixed(0).replace('.', ',')}% Call` : "Bullet",
        SEKTOR_LABELS[firstBond.sektor] || firstBond.sektor || "-", firstBond.branche || "-"
      ];
    });
    exportTableXLSX(`Emittenten_Tabelle_${new Date().toISOString().slice(0,10)}.xlsx`, headers, dataRows, "Emittenten");
  };
  if (!iStats.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible mt-3 sm:mt-4 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-800">Emittentenstruktur</div>
          <div className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredAndSorted.length} Emittenten</div>
          <div className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredAndSorted.reduce((s, i) => s + (i.count || 0), 0)} Anleihen</div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!hideFilters && (
            <>
              <input type="text" placeholder="Emittent, Ticker..." value={fQ} onChange={e => setFQ(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 w-full sm:w-48 focus:outline-none focus:border-spark-500 shadow-sm transition-all" />
              <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${showFilters ? 'bg-spark-50 border-spark-300 text-spark-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Erweiterte Filter">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
            </>
          )}
          <button onClick={handleExport} className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center" title="Gefilterte Tabelle als XLSX exportieren">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <ColumnSelector columns={ICOLS} hiddenCols={iHiddenCols} setHiddenCols={setIHiddenCols} label="Spalten" />
        </div>
      </div>
      {showFilters && !hideFilters && (
        <div className="bg-white border-t border-slate-200 px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div className="flex flex-col gap-1"><MultiSelect label="Land" options={filterOpts.laender} selected={fCountries} onChange={setFCountries} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Rating Ø" options={filterOpts.ratings} selected={fRatings} onChange={setFRatings} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Sektor" options={filterOpts.sektorOpts || []} selected={fSektor} onChange={setFSektor} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rendite Ø (%)</span><div className="flex items-center gap-1"><input type="number" step="0.1" placeholder="Min" value={minY} onChange={e => setMinY(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.1" placeholder="Max" value={maxY} onChange={e => setMaxY(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spread Ø (bp)</span><div className="flex items-center gap-1"><input type="number" step="5" placeholder="Min" value={minS} onChange={e => setMinS(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="5" placeholder="Max" value={maxS} onChange={e => setMaxS(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration Ø (Y)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minD} onChange={e => setMinD(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxD} onChange={e => setMaxD(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Quelle" options={[{val:"BESTAND",lbl:"🔒 Bestand"},{val:"NEU",lbl:"✚ Neuanlage"}]} selected={_fSource !== "all" ? [_fSource] : []} onChange={v => _setFSource(v.length ? v[v.length-1] : "all")} wFull stacked align="left" emptyLabel="Alle" /></div>
          <div className="flex flex-col gap-1 justify-end h-full"><button onClick={resetFilters} className="bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-2 py-1.5 hover:bg-slate-300 transition-colors w-full h-[28px]">Filter zurücksetzen</button></div>
        </div>
      )}
      {/* MOBILE: Card View */}
      <div className="block md:hidden divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
        {filteredAndSorted.map((i) => (
          <div key={i.t + "-m"} onClick={() => onIssuerClick && onIssuerClick(i)}
            className="px-3 py-3 active:bg-spark-50 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Flag c={i.co} />
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[13px] truncate">{i.e}</div>
                  <div className="text-[10px] text-slate-400">{i.t} · {i.count} Anleihen · {fmtVol(i.nom)}</div>
                </div>
              </div>
              <Tag c={i.wLn >= 8 && i.wLn < 99 ? "gray" : "blue"}>{i.lo}</Tag>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[12px]">
              <div><span className="text-slate-400 text-[10px]">Rendite Ø</span><div className="font-bold text-slate-800 tabular-nums">{fx(i.wY, 2)}%</div></div>
              <div><span className="text-slate-400 text-[10px]">Spread Ø</span><div className="font-bold text-spark-600 tabular-nums">{fx(i.wS, 1)} bp</div></div>
              <div><span className="text-slate-400 text-[10px]">Gewicht</span><div className="font-bold text-slate-700 tabular-nums">{fx(i.weight * 100, 1)}%</div></div>
              <div><span className="text-slate-400 text-[10px]">Duration Ø</span><div className="tabular-nums text-slate-600">{fx(i.wD, 2)}</div></div>
              <div><span className="text-slate-400 text-[10px]">ESG</span><div className="tabular-nums text-emerald-500">{fx(i.gP * 100, 0)}%</div></div>
              {i.hasCallable && <div><span className="text-slate-400 text-[10px]">Callable</span><div className="text-slate-600 font-bold">{fx((i.callP||0)*100, 0)}%</div></div>}
            </div>
          </div>
        ))}
      </div>
      {/* DESKTOP: Table View */}
      <div className="overflow-x-auto overflow-y-auto max-h-[40vh] md:max-h-[60vh] hidden md:block">
        <table className="w-full text-xs mobile-sticky-col">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200">
              {iVisibleCols.map(k => { const c = ICOLS.find(x => x.key === k); if (!c) return null;
                return <th key={k} draggable className={"px-2 py-1.5 text-[10px] uppercase text-slate-500 font-bold tracking-wider select-none whitespace-nowrap " + (c.align === "left" ? "text-left" : c.align === "right" ? "text-right" : "text-center") + (iDragOverCol === k ? " bg-spark-100 border-x-2 border-spark-400" : "") + (iDragCol === k ? " opacity-40" : "")}
                  onDragStart={() => handleIDragStart(k)} onDragOver={(e) => handleIDragOver(e, k)} onDrop={() => handleIDrop(k)} onDragEnd={handleIDragEnd}
                  style={{ cursor: "grab" }}>
                  <div className={"flex items-center gap-0.5 cursor-pointer" + (c.align === "right" ? " justify-end" : c.align === "center" ? " justify-center" : "")} onClick={() => c.sk && doSort(c.sk)}>
                    <span className="text-[8px] text-slate-300 cursor-grab mr-0.5">⠿</span>
                    {c.label}
                    {c.sk && sK === c.sk && <span className="text-spark-500 text-[9px] ml-0.5">{sD === 1 ? "▲" : "▼"}</span>}
                  </div>
                </th>;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.map((i) => (
              <tr key={i.t} onClick={() => onIssuerClick && onIssuerClick(i)} className={"transition-colors cursor-pointer group " + (i.lockedNom > 0 && i.neuNom === 0 ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-spark-50")}>
                {iVisibleCols.map(k => renderIssuerCell(k, i))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default IssuerTable;
