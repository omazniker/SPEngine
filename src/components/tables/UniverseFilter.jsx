import React, { useState, useMemo, useEffect } from 'react';

export default function UniverseFilter({ bonds, onFilteredBondsChange, filter }) {
  const [showFilters, setShowFilters] = useState(true);
  const [_fIssuers, _setFIssuers] = useState([]); const [_fCountries, _setFCountries] = useState([]);
  const [_fRatings, _setFRatings] = useState([]); const [_fESG, _setFESG] = useState("all"); const [_fRW, _setFRW] = useState([]);
  const [_fRank, _setFRank] = useState([]); const [_fCall, _setFCall] = useState([]);
  const [_fSP, _setFSP] = useState([]); const [_fMo, _setFMo] = useState([]); const [_fMsciEsg, _setFMsciEsg] = useState([]); const [_fKpnTyp, _setFKpnTyp] = useState([]); const [_fWaeh, _setFWaeh] = useState([]); const [_fSektor, _setFSektor] = useState([]);
  const [_minK, _setMinK] = useState(""); const [_maxK, _setMaxK] = useState(""); const [_minY, _setMinY] = useState(""); const [_maxY, _setMaxY] = useState("");
  const [_minPx, _setMinPx] = useState(""); const [_maxPx, _setMaxPx] = useState(""); const [_minD, _setMinD] = useState(""); const [_maxD, _setMaxD] = useState("");
  const [_minMty, _setMinMty] = useState(""); const [_maxMty, _setMaxMty] = useState(""); const [_fMtyBkt, _setFMtyBkt] = useState([]);
  const [_fExclIssuers, _setFExclIssuers] = useState([]);
  const [_activeExplorerPreset, _setActiveExplorerPreset] = useState("");
  const fIssuers = filter ? filter.fIssuers : _fIssuers; const setFIssuers = filter ? filter.setFIssuers : _setFIssuers;
  const fCountries = filter ? filter.fCountries : _fCountries; const setFCountries = filter ? filter.setFCountries : _setFCountries;
  const fRatings = filter ? filter.fRatings : _fRatings; const setFRatings = filter ? filter.setFRatings : _setFRatings;
  const fESG = filter ? filter.fESG : _fESG; const setFESG = filter ? filter.setFESG : _setFESG;
  const fRW = filter ? filter.fRW : _fRW; const setFRW = filter ? filter.setFRW : _setFRW;
  const fRank = filter ? filter.fRank : _fRank; const setFRank = filter ? filter.setFRank : _setFRank;
  const fCall = filter ? filter.fCall : _fCall; const setFCall = filter ? filter.setFCall : _setFCall;
  const fSP = filter ? (filter.fSP ?? _fSP) : _fSP; const setFSP = filter ? (filter.setFSP ?? _setFSP) : _setFSP;
  const fMo = filter ? (filter.fMo ?? _fMo) : _fMo; const setFMo = filter ? (filter.setFMo ?? _setFMo) : _setFMo;
  const fMsciEsg = filter ? (filter.fMsciEsg ?? _fMsciEsg) : _fMsciEsg; const setFMsciEsg = filter ? (filter.setFMsciEsg ?? _setFMsciEsg) : _setFMsciEsg;
  const fKpnTyp = filter ? (filter.fKpnTyp ?? _fKpnTyp) : _fKpnTyp; const setFKpnTyp = filter ? (filter.setFKpnTyp ?? _setFKpnTyp) : _setFKpnTyp;
  const fWaeh = filter ? (filter.fWaeh ?? _fWaeh) : _fWaeh; const setFWaeh = filter ? (filter.setFWaeh ?? _setFWaeh) : _setFWaeh;
  const fSektor = filter ? (filter.fSektor ?? _fSektor) : _fSektor; const setFSektor = filter ? (filter.setFSektor ?? _setFSektor) : _setFSektor;
  const minK = filter ? filter.minK : _minK; const setMinK = filter ? filter.setMinK : _setMinK;
  const maxK = filter ? filter.maxK : _maxK; const setMaxK = filter ? filter.setMaxK : _setMaxK;
  const minY = filter ? filter.minY : _minY; const setMinY = filter ? filter.setMinY : _setMinY;
  const maxY = filter ? filter.maxY : _maxY; const setMaxY = filter ? filter.setMaxY : _setMaxY;
  const minPx = filter ? filter.minPx : _minPx; const setMinPx = filter ? filter.setMinPx : _setMinPx;
  const maxPx = filter ? filter.maxPx : _maxPx; const setMaxPx = filter ? filter.setMaxPx : _setMaxPx;
  const minD = filter ? filter.minD : _minD; const setMinD = filter ? filter.setMinD : _setMinD;
  const maxD = filter ? filter.maxD : _maxD; const setMaxD = filter ? filter.setMaxD : _setMaxD;
  const minMty = filter ? filter.minMty : _minMty; const setMinMty = filter ? filter.setMinMty : _setMinMty;
  const maxMty = filter ? filter.maxMty : _maxMty; const setMaxMty = filter ? filter.setMaxMty : _setMaxMty;
  const fExclIssuers = filter ? (filter.fExclIssuers ?? _fExclIssuers) : _fExclIssuers;
  const setFExclIssuers = filter ? (filter.setFExclIssuers ?? _setFExclIssuers) : _setFExclIssuers;
  const resetFilters = filter ? filter.reset : () => { _setFIssuers([]); _setFCountries([]); _setFRatings([]); _setFESG("all"); _setFRW([]); _setFRank([]); _setFCall([]); _setFSP([]); _setFMo([]); _setFMsciEsg([]); _setFKpnTyp([]); _setFWaeh([]); _setFSektor([]); _setMinK(""); _setMaxK(""); _setMinY(""); _setMaxY(""); _setMinPx(""); _setMaxPx(""); _setMinD(""); _setMaxD(""); _setMinMty(""); _setMaxMty(""); _setFExclIssuers([]); _setActiveExplorerPreset(""); };
  const toggleExplorerPreset = (preset) => {
    const active = typeof _activeExplorerPreset === "string" ? (_activeExplorerPreset ? _activeExplorerPreset.split(",") : []) : Array.isArray(_activeExplorerPreset) ? _activeExplorerPreset : [];
    const isActive = active.includes(preset.id);
    if (isActive) {
      const remaining = active.filter(id => id !== preset.id);
      _setFIssuers([]); _setFCountries([]); _setFRatings([]); _setFRank([]); _setFCall([]); _setFKpnTyp([]); _setFSektor([]); _setMaxMty(""); _setFExclIssuers([]);
      if (remaining.length > 0) {
        setTimeout(() => {
          const setters = { fCountries: setFCountries, fRank: setFRank, fCall: setFCall, fKpnTyp: setFKpnTyp, fRatings: setFRatings, fSektor: setFSektor, maxMty: setMaxMty, fExclIssuers: setFExclIssuers, fIssuers: setFIssuers };
          remaining.forEach(id => { const p = EXPLORER_PRESETS.find(x => x.id === id); if (p) p.apply(setters); });
        }, 0);
      }
      _setActiveExplorerPreset(remaining.join(","));
    } else {
      const setters = { fCountries: setFCountries, fRank: setFRank, fCall: setFCall, fKpnTyp: setFKpnTyp, fRatings: setFRatings, fSektor: setFSektor, maxMty: setMaxMty, fExclIssuers: setFExclIssuers, fIssuers: setFIssuers };
      preset.apply(setters);
      _setActiveExplorerPreset([...active, preset.id].join(","));
    }
  };
  const filterOpts = useMemo(() => {
    const emittenten = Array.from(new Set(bonds.map(b => b.t))).map(t => { const b = bonds.find(x => x.t === t); return { val: t, lbl: b.e }; }).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const laender = Array.from(new Set(bonds.map(b => b.co))).map(c => ({ val: c, lbl: CN[c] || c, co: c })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const ratings = Array.from(new Set(bonds.map(b => b.lo))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const spRatings = Array.from(new Set(bonds.map(b => b.sp).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const moRatings = Array.from(new Set(bonds.map(b => b.mo).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const msciOpts = Array.from(new Set(bonds.map(b => b.msciEsg).filter(Boolean))).sort();
    const sektorOpts = Array.from(new Set(bonds.map(b => b.sektor).filter(Boolean))).map(s => ({ val: s, lbl: SEKTOR_LABELS[s] || s })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    return { emittenten, laender, ratings, spRatings, moRatings, msciOpts, sektorOpts };
  }, [bonds]);
  const filteredBonds = useMemo(() => {
    let res = [...bonds];
    if (fIssuers.length > 0) res = res.filter(b => fIssuers.includes(b.t));
    if (fCountries.length > 0) res = res.filter(b => fCountries.includes(b.co));
    if (fRatings.length > 0) res = res.filter(b => fRatings.includes(b.lo));
    if (fESG !== "all") res = res.filter(b => b.g === (fESG === "Y" ? 1 : 0));
    if (fRW.length) res = res.filter(b => fRW.includes(String(b.rw)));
    if (fRank.length) res = res.filter(b => fRank.includes(b.rank || "SP"));
    if (fCall.length) {
      const callT = b => b.perpetual ? "PERPETUAL" : b.callable ? "CALLABLE" : "BULLET";
      res = res.filter(b => fCall.includes(callT(b)));
    }
    if (fSP.length > 0) res = res.filter(b => fSP.includes(b.sp));
    if (fMo.length > 0) res = res.filter(b => fMo.includes(b.mo));
    if (fMsciEsg.length) res = res.filter(b => { const cat = (!b.msciEsg || b.msciEsg === 'N.S.') ? "NS" : b.msciEsg; return fMsciEsg.includes(cat); });
    if (fKpnTyp.length) res = res.filter(b => fKpnTyp.includes(b.kpnTyp || 'FIXED'));
    if (fWaeh.length) res = res.filter(b => fWaeh.includes(b.waeh || 'EUR'));
    if (fSektor.length) res = res.filter(b => fSektor.includes(b.sektor || 'OTHER'));
    const pk = parseFloat(minK); if (!isNaN(pk)) res = res.filter(b => b.k >= pk);
    const pmaxK = parseFloat(maxK); if (!isNaN(pmaxK)) res = res.filter(b => b.k <= pmaxK);
    const py = parseFloat(minY); if (!isNaN(py)) res = res.filter(b => b.y >= py);
    const pmaxY = parseFloat(maxY); if (!isNaN(pmaxY)) res = res.filter(b => b.y <= pmaxY);
    const pminPx = parseFloat(minPx); if (!isNaN(pminPx)) res = res.filter(b => b.px >= pminPx);
    const pmaxPx = parseFloat(maxPx); if (!isNaN(pmaxPx)) res = res.filter(b => b.px <= pmaxPx);
    const pminD = parseFloat(minD); if (!isNaN(pminD)) res = res.filter(b => b.md >= pminD);
    const pmaxD = parseFloat(maxD); if (!isNaN(pmaxD)) res = res.filter(b => b.md <= pmaxD);
    const pminMty = parseFloat(minMty); if (!isNaN(pminMty)) res = res.filter(b => b.mty >= pminMty);
    const pmaxMty = parseFloat(maxMty); if (!isNaN(pmaxMty)) res = res.filter(b => b.mty <= pmaxMty);
    if (_fMtyBkt.length > 0) res = res.filter(b => _fMtyBkt.includes(mtyBucket(b.mty)));
    if (fExclIssuers.length) { const exSet = new Set(fExclIssuers); res = res.filter(b => !exSet.has(b.t)); }
    return res;
  }, [bonds, fIssuers, fCountries, fRatings, fESG, fRW, fRank, fCall, fSP, fMo, fMsciEsg, fKpnTyp, fWaeh, fSektor, minK, maxK, minY, maxY, minPx, maxPx, minD, maxD, minMty, maxMty, _fMtyBkt, fExclIssuers]);
  useEffect(() => {
    if (onFilteredBondsChange) onFilteredBondsChange(filteredBonds);
  }, [filteredBonds, onFilteredBondsChange]);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-visible mb-4 sm:mb-6 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-800">Universum filtern</div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredBonds.length} Anleihen</span>
            <span className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{new Set(filteredBonds.map(b => b.e)).size} Emittenten</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${showFilters ? 'bg-spark-50 border-spark-300 text-spark-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Erweiterte Filter">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          </button>
        </div>
      </div>
      {showFilters && (<>
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
          {EXPLORER_PRESETS.map(p => {
            const activeIds = _activeExplorerPreset ? _activeExplorerPreset.split(",") : [];
            const isOn = activeIds.includes(p.id);
            return (
            <button key={p.id} onClick={() => toggleExplorerPreset(p)}
              className={"px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 " + (isOn ? "bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300")}
              title={p.desc}>
              <span>{p.icon}</span> {p.name}
            </button>
            );
          })}
          {_activeExplorerPreset && (
            <button onClick={resetFilters} className="px-2 py-1 rounded-lg text-[9px] font-bold border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-all">
              Alle Presets entfernen
            </button>
          )}
          {fExclIssuers.length > 0 && (
            <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {fExclIssuers.length} Emittenten ausgeschlossen
            </span>
          )}
        </div>
        <div className="bg-white border-t border-slate-200 px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div className="flex flex-col gap-1"><MultiSelect label="Emittent" options={filterOpts.emittenten} selected={fIssuers} onChange={setFIssuers} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Land" options={filterOpts.laender} selected={fCountries} onChange={setFCountries} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Rating" options={filterOpts.ratings} selected={fRatings} onChange={setFRatings} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="RW" options={RW_OPTS} selected={fRW} onChange={setFRW} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="ESG Status" options={[{val:"Y",lbl:"Nur ESG"},{val:"N",lbl:"Conv."}]} selected={fESG !== "all" ? [fESG] : []} onChange={v => setFESG(v.length ? v[v.length-1] : "all")} wFull stacked align="left" emptyLabel="Alle" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Rang" options={RANK_OPTS} selected={fRank} onChange={setFRank} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Fälligkeit" options={CALL_OPTS} selected={fCall} onChange={setFCall} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="S&P" options={filterOpts.spRatings} selected={fSP} onChange={setFSP} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Moody's" options={filterOpts.moRatings} selected={fMo} onChange={setFMo} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="MSCI" options={MSCI_OPTS} selected={fMsciEsg} onChange={setFMsciEsg} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="KpnTyp" options={KPNTYP_OPTS} selected={fKpnTyp} onChange={setFKpnTyp} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Währung" options={WAEH_OPTS} selected={fWaeh} onChange={setFWaeh} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Sektor" options={filterOpts.sektorOpts || []} selected={fSektor} onChange={setFSektor} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kupon (%)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minK} onChange={e => setMinK(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxK} onChange={e => setMaxK(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rendite (%)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minY} onChange={e => setMinY(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxY} onChange={e => setMaxY(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preis</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minPx} onChange={e => setMinPx(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxPx} onChange={e => setMaxPx(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration (Y)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minD} onChange={e => setMinD(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxD} onChange={e => setMaxD(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Laufzeit (Y)" options={MTY_BUCKET_OPTS} selected={_fMtyBkt} onChange={_setFMtyBkt} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laufzeit (Y)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minMty} onChange={e => setMinMty(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxMty} onChange={e => setMaxMty(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1 justify-end h-full"><button onClick={resetFilters} className="bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-2 py-1.5 hover:bg-slate-300 transition-colors w-full h-[28px]">Filter zurücksetzen</button></div>
        </div>
      </>)}
      {(() => {
        const chips = [];
        if (fCountries.length > 0) chips.push({ label: "Land: " + fCountries.map(c => CN[c] || c).join(", "), clear: () => setFCountries([]) });
        if (fIssuers.length > 0) chips.push({ label: fIssuers.length + " Emittent" + (fIssuers.length > 1 ? "en" : ""), clear: () => setFIssuers([]) });
        if (fRatings.length > 0) chips.push({ label: "Rating: " + fRatings.join(", "), clear: () => setFRatings([]) });
        if (fESG !== "all") chips.push({ label: fESG === "Y" ? "Nur ESG" : "Conv.", clear: () => setFESG("all") });
        if (fRW.length) chips.push({ label: "RW: " + fRW.join(", ") + "%", clear: () => setFRW([]) });
        if (fRank.length) chips.push({ label: fRank.map(r => RANK_LABELS[r] || r).join(", "), clear: () => setFRank([]) });
        if (fCall.length) chips.push({ label: fCall.map(t => t === "BULLET" ? "Bullet" : t === "PERPETUAL" ? "Perpetual" : "Callable").join(", "), clear: () => setFCall([]) });
        if (fSP.length > 0) chips.push({ label: "S&P: " + fSP.join(", "), clear: () => setFSP([]) });
        if (fMo.length > 0) chips.push({ label: "Moody's: " + fMo.join(", "), clear: () => setFMo([]) });
        if (fMsciEsg.length) chips.push({ label: "MSCI: " + fMsciEsg.join(", "), clear: () => setFMsciEsg([]) });
        if (fKpnTyp.length) chips.push({ label: "KpnTyp: " + fKpnTyp.join(", "), clear: () => setFKpnTyp([]) });
        if (fWaeh.length) chips.push({ label: "Währung: " + fWaeh.join(", "), clear: () => setFWaeh([]) });
        if (fSektor.length) chips.push({ label: "Sektor: " + fSektor.map(s => SEKTOR_SHORT[s] || s).join(", "), clear: () => setFSektor([]) });
        if (minK || maxK) chips.push({ label: "Kupon: " + (minK || "–") + " – " + (maxK || "–") + "%", clear: () => { setMinK(""); setMaxK(""); } });
        if (minY || maxY) chips.push({ label: "Rendite: " + (minY || "–") + " – " + (maxY || "–") + "%", clear: () => { setMinY(""); setMaxY(""); } });
        if (minPx || maxPx) chips.push({ label: "Preis: " + (minPx || "–") + " – " + (maxPx || "–"), clear: () => { setMinPx(""); setMaxPx(""); } });
        if (minD || maxD) chips.push({ label: "Duration: " + (minD || "–") + " – " + (maxD || "–") + " Y", clear: () => { setMinD(""); setMaxD(""); } });
        if (_fMtyBkt.length > 0) chips.push({ label: "Laufzeit: " + _fMtyBkt.join(", "), clear: () => _setFMtyBkt([]) });
        if (minMty || maxMty) chips.push({ label: "Laufzeit: " + (minMty || "–") + " – " + (maxMty || "–") + " Y", clear: () => { setMinMty(""); setMaxMty(""); } });
        if (fExclIssuers.length) chips.push({ label: fExclIssuers.length + " Emittenten gesperrt", clear: () => setFExclIssuers([]) });
        if (chips.length === 0) return null;
        return (
          <div className="px-3 py-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Aktiv:</span>
            {chips.map((c, i) => (
              <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1 bg-spark-50 text-spark-700 border border-spark-200 rounded-full px-2 py-0.5 text-[10px] font-bold hover:bg-spark-100 transition-colors group" title="Klicken zum Entfernen">
                {c.label}<span className="text-spark-400 group-hover:text-spark-600 text-[8px]">✕</span>
              </button>
            ))}
            <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{filteredBonds.length} von {bonds.length}</span>
          </div>
        );
      })()}
    </div>
  );
}
