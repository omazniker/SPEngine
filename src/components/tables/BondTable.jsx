import React, { useState, useMemo, useCallback, useEffect } from 'react';

const BCOLS = [
  { key: "e", label: "Emittent", align: "left", sk: "e", w: "max-w-[150px]", required: true },
  { key: "desc", label: "Beschreibung", align: "left", sk: "desc", w: "max-w-[180px]" },
  { key: "isin", label: "ISIN", align: "center", sk: "isin" },
  { key: "vol", label: "Emission", align: "center", sk: "vol" },
  { key: "co", label: "Land", align: "center", sk: "co" },
  { key: "nom", label: "Volumen", align: "center", sk: "nom", onlyN: true },
  { key: "wt", label: "Gewicht", align: "center", sk: "weight", onlyN: true },
  { key: "k", label: "Kupon", align: "center", sk: "k" },
  { key: "px", label: "Preis", align: "center", sk: "px" },
  { key: "s", label: "Spread", align: "center", sk: "s" },
  { key: "y", label: "Rendite", align: "center", sk: "y" },
  { key: "md", label: "Duration", align: "center", sk: "md" },
  { key: "mty", label: "Rlz. (Y)", align: "center", sk: "mty" },
  { key: "fall", label: "Fälligk.", align: "center", sk: "mty" },
  { key: "lo", label: "Rating", align: "center", sk: "ln" },
  { key: "sp", label: "S&P", align: "center", sk: "sp" },
  { key: "mo", label: "Moody's", align: "center", sk: "mo" },
  { key: "rw", label: "RW", align: "center", sk: "rw" },
  { key: "yRw", label: "R/RW", align: "center", sk: "yRw" },
  { key: "g", label: "ESG", align: "center", sk: "g" },
  { key: "msciEsg", label: "MSCI", align: "center", sk: "msciEsg" },
  { key: "kpnTyp", label: "KpnTyp", align: "center", sk: "kpnTyp" },
  { key: "rank", label: "Rang", align: "center", sk: "rank" },
  { key: "call", label: "Typ", align: "center", sk: "callable" },
  { key: "lqa", label: "LQA", align: "center", sk: "lqa" },
  { key: "sektor", label: "Sektor", align: "center", sk: "sektor" },
  { key: "branche", label: "Branche", align: "center", sk: "branche" },
  { key: "spEff", label: "S&P Em.", align: "center", sk: "spEff" },
  { key: "moEff", label: "Moody's Em.", align: "center", sk: "moEff" },
  { key: "gldPrs", label: "Geld", align: "center", sk: "gldPrs" },
  { key: "brfPrs", label: "Brief", align: "center", sk: "brfPrs" },
  { key: "src", label: "Quelle", align: "center", sk: "locked", onlyN: true }
];

function renderBondCell(key, b, showN, s) {
  const msciColors = { 'AAA': 'bg-emerald-100 text-emerald-700 border-emerald-200', 'AA': 'bg-emerald-50 text-emerald-600 border-emerald-200', 'A': 'bg-teal-50 text-teal-600 border-teal-200', 'BBB': 'bg-amber-50 text-amber-600 border-amber-200', 'BB': 'bg-orange-50 text-orange-600 border-orange-200' };
  switch (key) {
    case "e": return <td key="e" className={"px-2 py-2 text-slate-800 whitespace-nowrap max-w-[150px] truncate font-medium group-hover:text-spark-600" + (b.locked ? " border-l-[3px] border-amber-400" : "")}><div className="flex items-center gap-1.5"><Flag c={b.co} /><span className="truncate">{b.e}</span></div></td>;
    case "desc": return <td key="desc" className="px-2 py-2 text-slate-500 text-[10px] whitespace-nowrap max-w-[180px] truncate" title={b.desc}>{b.desc || "-"}</td>;
    case "isin": return <td key="isin" className="px-2 py-2 text-center text-slate-500 text-[11px]">{b.isin}</td>;
    case "vol": return <td key="vol" className="px-2 py-2 text-center tabular-nums text-slate-400">{fmtVol(b.vol)}</td>;
    case "co": return <td key="co" className="px-2 py-2 text-center text-[10px] font-bold text-slate-600" title={CN[b.co] || b.co}><div className="flex items-center justify-center gap-1.5"><Flag c={b.co} /> <span>{b.co}</span></div></td>;
    case "nom": return showN ? <td key="nom" className="px-2 py-2 text-center tabular-nums text-slate-800 font-bold bg-slate-50/50">{fmtVol(b.nom)}</td> : null;
    case "wt": return showN && s ? <td key="wt" className="px-2 py-2 text-center tabular-nums text-slate-400 text-[11px]">{fx(b.weight * 100, 1)}%</td> : null;
    case "k": return <td key="k" className="px-2 py-2 text-center tabular-nums text-slate-600">{fx(b.k, 2)}</td>;
    case "px": return <td key="px" className="px-2 py-2 text-center tabular-nums text-slate-600">{b.px ? fx(b.px, 2) : "-"}</td>;
    case "s": return <td key="s" className={"px-2 py-2 text-center tabular-nums font-bold " + (b.s < 0 ? "text-rose-500" : "text-spark-600")}>{fx(b.s, 1)}</td>;
    case "y": return <td key="y" className="px-2 py-2 text-center tabular-nums text-slate-800 font-bold">{fx(b.y, 2)}</td>;
    case "md": return <td key="md" className="px-2 py-2 text-center tabular-nums text-slate-600">{fx(b.md, 2)}</td>;
    case "mty": return <td key="mty" className="px-2 py-2 text-center tabular-nums text-slate-600">{b.mty ? fx(b.mty, 1) : '-'}</td>;
    case "fall": { let fmt = '-'; if (b.fall) { const parts = b.fall.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (parts) { fmt = parts[1] + '.' + parts[2] + '.' + parts[3].slice(2); } else { const d = new Date(b.fall); if (!isNaN(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100) { fmt = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); } else if (b.mty) { fmt = fx(b.mty, 1) + ' Y'; } } } else if (b.mty) { fmt = fx(b.mty, 1) + ' Y'; } return <td key="fall" className="px-2 py-2 text-center tabular-nums text-slate-500 text-[11px]">{fmt}</td>; }
    case "lo": return <td key="lo" className="px-2 py-2 text-center"><Tag c={b.ln >= 8 ? "gray" : "blue"}>{b.lo}</Tag></td>;
    case "sp": return <td key="sp" className="px-2 py-2 text-center"><span className={"px-1.5 py-0.5 rounded text-[10px] font-bold " + (b.sp && b.sp !== 'NR' ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-300")}>{b.sp && b.sp !== 'NR' ? b.sp : '-'}</span></td>;
    case "mo": return <td key="mo" className="px-2 py-2 text-center"><span className={"px-1.5 py-0.5 rounded text-[10px] font-bold " + (b.mo && b.mo !== 'NR' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-300")}>{b.mo && b.mo !== 'NR' ? b.mo : '-'}</span></td>;
    case "rw": return <td key="rw" className="px-2 py-2 text-center"><Tag c={b.rw === 20 ? "green" : "gray"}>{b.rw}</Tag></td>;
    case "yRw": return <td key="yRw" className="px-2 py-2 text-center tabular-nums text-spark-600 font-medium">{fx(b.yRw, 2)}</td>;
    case "g": return <td key="g" className="px-2 py-2 text-center">{b.g ? <Tag c="green">ESG</Tag> : <span className="text-slate-300">-</span>}</td>;
    case "msciEsg": { const mc = b.msciEsg && b.msciEsg !== 'N.S.' ? b.msciEsg : ''; return <td key="msciEsg" className="px-2 py-2 text-center">{mc ? <span className={"px-1.5 py-0.5 rounded-full text-[9px] font-bold border " + (msciColors[mc] || "bg-slate-100 text-slate-500 border-slate-200")}>{mc}</span> : <span className="text-slate-300 text-[10px]">-</span>}</td>; }
    case "kpnTyp": return <td key="kpnTyp" className="px-2 py-2 text-center text-[10px] text-slate-500">{b.kpnTyp === 'FIXED' ? 'Fix' : b.kpnTyp || '-'}</td>;
    case "rank": return <td key="rank" className="px-2 py-2 text-center"><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + rankBadgeCls(b.rank || "SP")}>{b.rank || "SP"}</span></td>;
    case "call": return <td key="call" className="px-2 py-2 text-center"><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + (b.perpetual ? "bg-rose-100 text-rose-600 border border-rose-200" : b.callable ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200")}>{b.perpetual ? "Perp" : b.callable ? "Call" : "Bullet"}</span></td>;
    case "lqa": return <td key="lqa" className="px-2 py-2 text-center tabular-nums text-slate-500 text-[11px]">{b.lqa || "-"}</td>;
    case "sektor": { const skC = { BANKS: "bg-blue-50 text-blue-700", INSURANCE: "bg-violet-50 text-violet-700", FINANCIALS: "bg-teal-50 text-teal-700", REITS: "bg-amber-50 text-amber-700", OTHER: "bg-slate-100 text-slate-500" }; return <td key="sektor" className="px-2 py-2 text-center"><span className={"px-1.5 py-0.5 rounded text-[9px] font-bold " + (skC[b.sektor] || skC.OTHER)}>{SEKTOR_SHORT[b.sektor] || b.sektor || "-"}</span></td>; }
    case "branche": return <td key="branche" className="px-2 py-2 text-center text-[10px] text-slate-500 truncate max-w-[80px]" title={b.branche}>{b.branche || "-"}</td>;
    case "spEff": return <td key="spEff" className="px-2 py-2 text-center"><span className={"px-1.5 py-0.5 rounded text-[10px] font-bold " + (b.spEff && b.spEff !== 'NR' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-300")}>{b.spEff && b.spEff !== 'NR' ? b.spEff : '-'}</span></td>;
    case "moEff": return <td key="moEff" className="px-2 py-2 text-center"><span className={"px-1.5 py-0.5 rounded text-[10px] font-bold " + (b.moEff && b.moEff !== 'NR' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-300")}>{b.moEff && b.moEff !== 'NR' ? b.moEff : '-'}</span></td>;
    case "gldPrs": return <td key="gldPrs" className="px-2 py-2 text-center tabular-nums text-slate-500">{b.gldPrs != null ? fx(b.gldPrs, 2) : "-"}</td>;
    case "brfPrs": return <td key="brfPrs" className="px-2 py-2 text-center tabular-nums text-slate-500">{b.brfPrs != null ? fx(b.brfPrs, 2) : "-"}</td>;
    case "src": return showN ? <td key="src" className="px-2 py-2 text-center">{b.locked === true && b.inUniverse ? <span className="inline-flex items-center gap-0"><span className="px-1.5 py-0.5 rounded-l-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-300 border-r-0">Bestand</span><span className="px-1.5 py-0.5 rounded-r-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 border-l-0">+Neu</span></span> : <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + (b.locked === true ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-emerald-100 text-emerald-700 border border-emerald-200")}>{b.locked === true ? "Bestand" : "Neu"}</span>}</td> : null;
    default: return null;
  }
}

const BondTable = React.memo(function BondTable({ bonds, s, showN, onBondClick, onFilteredBondsChange, hideFilters = false, filter, allBonds, excludeCols = [], excludeStats = [], presets, universeProfiles = [], universe = [] }) {
  const [sK, setSK] = useState(showN ? 'nom' : 's'); const [sD, setSD] = useState(-1);
  const [showFilters, setShowFilters] = useState(true);
  const exclSet = useMemo(() => new Set(excludeCols), [excludeCols]);
  const defaultCols = useMemo(() => BCOLS.filter(c => !c.onlyN || showN).filter(c => !exclSet.has(c.key)).map(c => c.key), [showN, exclSet]);
  const [colOrder, setColOrder] = useState(defaultCols);
  const [hiddenCols, setHiddenCols] = useState([]);
  const [dragCol, setDragCol] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const visibleCols = useMemo(() => colOrder.filter(k => { const c = BCOLS.find(x => x.key === k); return c && (!c.onlyN || showN) && !hiddenCols.includes(k) && !exclSet.has(k); }), [colOrder, showN, hiddenCols, exclSet]);
  const colSelectorItems = useMemo(() => BCOLS.filter(c => !c.onlyN || showN).filter(c => !exclSet.has(c.key)), [showN, exclSet]);
  useEffect(() => { setColOrder(prev => { const missing = defaultCols.filter(k => !prev.includes(k)); return missing.length > 0 ? [...prev, ...missing] : prev; }); }, [defaultCols]);
  const handleDragStart = (k) => setDragCol(k);
  const handleDragOver = (e, k) => { e.preventDefault(); if (k !== dragCol) setDragOverCol(k); };
  const handleDrop = (k) => { if (!dragCol || dragCol === k) { setDragCol(null); setDragOverCol(null); return; } setColOrder(prev => { const arr = [...prev]; const from = arr.indexOf(dragCol); const to = arr.indexOf(k); arr.splice(from, 1); arr.splice(to, 0, dragCol); return arr; }); setDragCol(null); setDragOverCol(null); };
  const handleDragEnd = () => { setDragCol(null); setDragOverCol(null); };
  const [_fQ, _setFQ] = useState("");
  const [_fIssuers, _setFIssuers] = useState([]); const [_fCountries, _setFCountries] = useState([]);
  const [_fRatings, _setFRatings] = useState([]); const [_fESG, _setFESG] = useState("all"); const [_fRW, _setFRW] = useState([]);
  const [_fRank, _setFRank] = useState([]); const [_fCall, _setFCall] = useState([]); const [_fSource, _setFSource] = useState("all");
  const [_fSP, _setFSP] = useState([]); const [_fMo, _setFMo] = useState([]); const [_fMsciEsg, _setFMsciEsg] = useState([]); const [_fKpnTyp, _setFKpnTyp] = useState([]); const [_fWaeh, _setFWaeh] = useState([]); const [_fSektor, _setFSektor] = useState([]);
  const [_minK, _setMinK] = useState(""); const [_maxK, _setMaxK] = useState(""); const [_minY, _setMinY] = useState(""); const [_maxY, _setMaxY] = useState("");
  const [_minPx, _setMinPx] = useState(""); const [_maxPx, _setMaxPx] = useState(""); const [_minD, _setMinD] = useState(""); const [_maxD, _setMaxD] = useState("");
  const [_minMty, _setMinMty] = useState(""); const [_maxMty, _setMaxMty] = useState(""); const [_fMtyBkt, _setFMtyBkt] = useState([]);
  const [_fExclIssuers, _setFExclIssuers] = useState([]);
  const [_activeExplorerPreset, _setActiveExplorerPreset] = useState("");
  const fQ = filter ? filter.fQ : _fQ; const setFQ = filter ? filter.setFQ : _setFQ;
  const fIssuers = filter ? filter.fIssuers : _fIssuers; const setFIssuers = filter ? filter.setFIssuers : _setFIssuers;
  const fCountries = filter ? filter.fCountries : _fCountries; const setFCountries = filter ? filter.setFCountries : _setFCountries;
  const fRatings = filter ? filter.fRatings : _fRatings; const setFRatings = filter ? filter.setFRatings : _setFRatings;
  const fESG = filter ? filter.fESG : _fESG; const setFESG = filter ? filter.setFESG : _setFESG;
  const fRW = filter ? filter.fRW : _fRW; const setFRW = filter ? filter.setFRW : _setFRW;
  const fRank = filter ? filter.fRank : _fRank; const setFRank = filter ? filter.setFRank : _setFRank;
  const fCall = filter ? filter.fCall : _fCall; const setFCall = filter ? filter.setFCall : _setFCall;
  const fSource = _fSource; const setFSource = _setFSource;
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
  const resetFilters = filter ? () => { filter.reset(); _setFExclIssuers([]); _setActiveExplorerPreset(""); } : () => { _setFIssuers([]); _setFCountries([]); _setFRatings([]); _setFESG("all"); _setFRW([]); _setFRank([]); _setFCall([]); _setFSource("all"); _setFSP([]); _setFMo([]); _setFMsciEsg([]); _setFKpnTyp([]); _setFWaeh([]); _setFSektor([]); _setMinK(""); _setMaxK(""); _setMinY(""); _setMaxY(""); _setMinPx(""); _setMaxPx(""); _setMinD(""); _setMaxD(""); _setMinMty(""); _setMaxMty(""); _setFMtyBkt([]); _setFQ(""); _setFExclIssuers([]); _setActiveExplorerPreset(""); };
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
  const doSort = useCallback(k => { if (sK === k) setSD(d => d * -1); else { setSK(k); setSD(-1); } }, [sK]);
  const _optSrc = allBonds || bonds;
  const filterOpts = useMemo(() => {
    const emittenten = Array.from(new Set(_optSrc.map(b => b.t))).map(t => { const b = _optSrc.find(x => x.t === t); return { val: t, lbl: b.e }; }).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const laender = Array.from(new Set(_optSrc.map(b => b.co))).map(c => ({ val: c, lbl: CN[c] || c, co: c })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const ratings = Array.from(new Set(_optSrc.map(b => b.lo))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const spRatings = Array.from(new Set(_optSrc.map(b => b.sp).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const moRatings = Array.from(new Set(_optSrc.map(b => b.mo).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const msciOpts = Array.from(new Set(_optSrc.map(b => b.msciEsg).filter(Boolean))).sort();
    const sektorOpts = Array.from(new Set(_optSrc.map(b => b.sektor).filter(Boolean))).map(s => ({ val: s, lbl: SEKTOR_SHORT[s] || s }));
    return { emittenten, laender, ratings, spRatings, moRatings, msciOpts, sektorOpts };
  }, [_optSrc]);
  const filteredBonds = useMemo(() => {
    let res = [...bonds];
    if (fQ) { const q = fQ.toLowerCase(); res = res.filter(b => b.e.toLowerCase().includes(q) || b.isin.toLowerCase().includes(q) || b.t.toLowerCase().includes(q) || b.co.toLowerCase().includes(q) || (b.desc && b.desc.toLowerCase().includes(q))); }
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
    if (fSource !== "all") { if (fSource === "BESTAND") res = res.filter(b => b.locked === true); else res = res.filter(b => b.locked !== true); }
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
  }, [bonds, fQ, fIssuers, fCountries, fRatings, fESG, fRW, fRank, fCall, fSource, fSP, fMo, fMsciEsg, fKpnTyp, fWaeh, fSektor, minK, maxK, minY, maxY, minPx, maxPx, minD, maxD, minMty, maxMty, fExclIssuers]);
  useEffect(() => {
    if (onFilteredBondsChange && !hideFilters) {
      onFilteredBondsChange(filteredBonds);
    }
  }, [filteredBonds, onFilteredBondsChange, hideFilters]);
  const filteredAndSorted = useMemo(() => {
    let res = filteredBonds.map(b => ({ ...b, weight: s && s.tN > 0 ? ((b.nom || b.vol || 0) / s.tN) : 0 }));
    res.sort((a, b) => { let vA = a[sK], vB = b[sK]; if (vA == null) vA = ""; if (vB == null) vB = ""; if (typeof vA === 'string') return vA.localeCompare(vB) * sD; return (vA > vB ? 1 : vA < vB ? -1 : 0) * sD; });
    return res;
  }, [filteredBonds, s, sK, sD]);
  const handleExport = () => {
    const headers = ["Emittent", "Ticker", "Beschreibung", "ISIN", "Land", "Emission (Mio. €)"];
    if (showN) { headers.push("Volumen (Mio. €)", "Gewicht (%)"); }
    headers.push("Kupon (%)", "KpnTyp", "Preis", "Geld", "Brief", "Spread (bp)", "Rendite (%)", "Restlaufzeit (Y)", "Fälligkeit", "Modified Duration", "Moody's Anleihe", "S&P Anleihe", "Moody's Emittent", "S&P Emittent", "Rating (Lower-of)", "KSA-RW (%)", "Rendite / RW", "ESG", "MSCI ESG", "Zahlungsrang", "Rang (Detail)", "Fälligkeitstyp", "LQA Score", "Sektor", "Branche", "BICS L1", "BICS L2", "Class L3");
    const dataRows = filteredAndSorted.map(b => {
      const row = [b.e, b.t, b.desc || "", b.isin, CN[b.co] || b.co, b.vol != null ? Math.round(b.vol) : ""];
      if (showN) { row.push(Math.round((b.nom || 0) * 100) / 100, Math.round((b.weight || 0) * 10000) / 100); }
      const fallFmt = fmtFall(b.fall);
      row.push(
        Math.round((b.k || 0) * 1000) / 1000, b.kpnTyp || "FIXED", b.px != null ? Math.round(b.px * 100) / 100 : "",
        b.gldPrs != null ? Math.round(b.gldPrs * 100) / 100 : "", b.brfPrs != null ? Math.round(b.brfPrs * 100) / 100 : "",
        Math.round((b.s || 0) * 10) / 10, Math.round((b.y || 0) * 1000) / 1000,
        Math.round((b.mty || 0) * 100) / 100, fallFmt, Math.round((b.md || 0) * 100) / 100,
        b.mo || "NR", b.sp || "NR", b.moEff || "NR", b.spEff || "NR", b.lo, b.rw != null ? b.rw : "", Math.round((b.yRw || 0) * 100) / 100,
        b.g ? "Ja" : "Nein", b.msciEsg || "", b.rank || "SP", b.rankDetail || "", b.callable ? "Callable" : "Bullet", b.lqa || "",
        SEKTOR_SHORT[b.sektor] || b.sektor || "", b.branche || "", b.bicsL1 || "", b.bicsL2 || "", b.classL3 || ""
      );
      return row;
    });
    exportTableXLSX(`Instrumenten_Tabelle_${new Date().toISOString().slice(0,10)}.xlsx`, headers, dataRows, "Instrumente");
  };
  if (!bonds || !bonds.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible mt-3 sm:mt-4 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-800">Instrumentenebene</div>
          <div className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredAndSorted.length} Anleihen</div>
          <div className="text-xs tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{new Set(filteredAndSorted.map(b => b.e)).size} Emittenten</div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!hideFilters && (
            <>
              <input type="text" placeholder="Suche ISIN, Emittent, Land..." value={fQ} onChange={e => setFQ(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 w-full sm:w-64 focus:outline-none focus:border-spark-500 shadow-sm transition-all" />
              <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors shadow-sm ${showFilters ? 'bg-spark-50 border-spark-300 text-spark-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Erweiterte Filter">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
            </>
          )}
          <button onClick={handleExport} className="p-1.5 rounded-lg border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center" title="Gefilterte Tabelle als XLSX exportieren">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <ColumnSelector columns={colSelectorItems} hiddenCols={hiddenCols} setHiddenCols={setHiddenCols} label="Spalten" />
        </div>
      </div>
      {showFilters && !hideFilters && (<>
        {(!presets || presets.length > 0) && <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
          {(presets || EXPLORER_PRESETS).map(p => {
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
        </div>}
        <div className="bg-white border-t border-slate-200 px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          <div className="flex flex-col gap-1"><MultiSelect label="Emittent" options={filterOpts.emittenten} selected={fIssuers} onChange={setFIssuers} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Land" options={filterOpts.laender} selected={fCountries} onChange={setFCountries} wFull stacked align="left" /></div>
          {!exclSet.has("lo") && <div className="flex flex-col gap-1"><MultiSelect label="Rating" options={filterOpts.ratings} selected={fRatings} onChange={setFRatings} wFull stacked align="left" /></div>}
          {!exclSet.has("rw") && <div className="flex flex-col gap-1"><MultiSelect label="RW" options={RW_OPTS} selected={fRW} onChange={setFRW} wFull stacked align="left" /></div>}
          <div className="flex flex-col gap-1"><MultiSelect label="ESG Status" options={[{val:"Y",lbl:"Nur ESG"},{val:"N",lbl:"Conv."}]} selected={fESG !== "all" ? [fESG] : []} onChange={v => setFESG(v.length ? v[v.length-1] : "all")} wFull stacked align="left" emptyLabel="Alle" /></div>
          <div className="flex flex-col gap-1"><MultiSelect label="Rang" options={RANK_OPTS} selected={fRank} onChange={setFRank} wFull stacked align="left" /></div>
          {!exclSet.has("call") && <div className="flex flex-col gap-1"><MultiSelect label="Fälligkeit" options={CALL_OPTS} selected={fCall} onChange={setFCall} wFull stacked align="left" /></div>}
          {showN && <div className="flex flex-col gap-1"><MultiSelect label="Quelle" options={[{val:"BESTAND",lbl:"🔒 Bestand"},{val:"NEU",lbl:"✚ Neuanlage"}]} selected={fSource !== "all" ? [fSource] : []} onChange={v => setFSource(v.length ? v[v.length-1] : "all")} wFull stacked align="left" emptyLabel="Alle" /></div>}
          {!exclSet.has("sp") && <div className="flex flex-col gap-1"><MultiSelect label="S&P" options={filterOpts.spRatings} selected={fSP} onChange={setFSP} wFull stacked align="left" /></div>}
          {!exclSet.has("mo") && <div className="flex flex-col gap-1"><MultiSelect label="Moody's" options={filterOpts.moRatings} selected={fMo} onChange={setFMo} wFull stacked align="left" /></div>}
          {!exclSet.has("msciEsg") && <div className="flex flex-col gap-1"><MultiSelect label="MSCI" options={MSCI_OPTS} selected={fMsciEsg} onChange={setFMsciEsg} wFull stacked align="left" /></div>}
          <div className="flex flex-col gap-1"><MultiSelect label="KpnTyp" options={KPNTYP_OPTS} selected={fKpnTyp} onChange={setFKpnTyp} wFull stacked align="left" /></div>
          {!exclSet.has("waeh") && <div className="flex flex-col gap-1"><MultiSelect label="Währung" options={WAEH_OPTS} selected={fWaeh} onChange={setFWaeh} wFull stacked align="left" /></div>}
          <div className="flex flex-col gap-1"><MultiSelect label="Sektor" options={filterOpts.sektorOpts || []} selected={fSektor} onChange={setFSektor} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kupon (%)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minK} onChange={e => setMinK(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxK} onChange={e => setMaxK(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rendite (%)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minY} onChange={e => setMinY(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxY} onChange={e => setMaxY(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preis</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minPx} onChange={e => setMinPx(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxPx} onChange={e => setMaxPx(e.target.value)} className={CLS_INP} /></div></div>
          {!exclSet.has("md") && <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration (Y)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minD} onChange={e => setMinD(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxD} onChange={e => setMaxD(e.target.value)} className={CLS_INP} /></div></div>}
          <div className="flex flex-col gap-1"><MultiSelect label="Laufzeit (Y)" options={MTY_BUCKET_OPTS} selected={_fMtyBkt} onChange={_setFMtyBkt} wFull stacked align="left" /></div>
          <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laufzeit (Y)</span><div className="flex items-center gap-1"><input type="number" step="0.5" placeholder="Min" value={minMty} onChange={e => setMinMty(e.target.value)} className={CLS_INP} /><span className="text-slate-400">–</span><input type="number" step="0.5" placeholder="Max" value={maxMty} onChange={e => setMaxMty(e.target.value)} className={CLS_INP} /></div></div>
          <div className="flex flex-col gap-1 justify-end h-full"><button onClick={resetFilters} className="bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-2 py-1.5 hover:bg-slate-300 transition-colors w-full h-[28px]">Filter zurücksetzen</button></div>
        </div>
      </>)}
      {/* AKTIV FILTER BADGES */}
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
        if (fSource !== "all") chips.push({ label: fSource === "BESTAND" ? "🔒 Bestand" : "✚ Neuanlage", clear: () => setFSource("all") });
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
            <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{filteredAndSorted.length} von {(allBonds || bonds).length}</span>
          </div>
        );
      })()}
      {/* LIVE-BAR MIT BM-DELTA */}
      {(() => {
        const n = filteredAndSorted.length;
        const ab = (allBonds || bonds).filter(b => b.nom || b.vol).map(b => ({ ...b, nom: b.nom || b.vol }));
        const bm = stats(ab);
        const bmTotal = bm ? bm.nb : bonds.length;
        const pct = bmTotal > 0 ? Math.round(n / bmTotal * 100) : 0;
        const bd = filteredAndSorted.filter(b => b.nom || b.vol).map(b => ({ ...b, nom: b.nom || b.vol }));
        const es = stats(bd);
        if (!es) return null;
        const dl = (v, r, fmt, unit) => { if (!bm) return ""; const diff = v - r; const sg = diff > 0 ? "+" : ""; const cls = Math.abs(diff) < 0.005 ? "text-slate-400" : diff > 0 ? "text-emerald-600" : "text-rose-500"; return <span className={"text-[8px] font-bold tabular-nums " + cls}>{sg}{fx(diff, fmt)}{unit || ""}</span>; };
        const K = ({label, value, delta, accent}) => (
          <div className="flex flex-col items-center min-w-[65px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
            <span className={"text-[13px] font-black tabular-nums leading-tight " + (accent || "text-slate-800")}>{value}</span>
            {delta}
          </div>
        );
        return (
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/30">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
              {K({label: "Anleihen", value: n + " / " + bmTotal, delta: <span className="text-[8px] text-slate-400 tabular-nums">{pct}% · {es.ni} Em. · {Object.keys(es.cc).length} Länder</span>})}
              {K({label: "Volumen", value: fmtVol(es.tN), delta: bm ? <span className="text-[8px] text-slate-400 tabular-nums">BM {fmtVol(bm.tN)}</span> : null})}
              {K({label: "Rendite Ø", value: fx(es.wY, 2) + "%", delta: dl(es.wY, bm?.wY || 0, 2, "%"), accent: "text-emerald-700"})}
              {K({label: "I-Spread Ø", value: fx(es.wS, 0) + " bp", delta: dl(es.wS, bm?.wS || 0, 0, " bp"), accent: "text-emerald-700"})}
              {!excludeStats.includes("duration") && K({label: "Duration Ø", value: fx(es.wD, 2), delta: dl(es.wD, bm?.wD || 0, 2, "")})}
              {!excludeStats.includes("laufzeit") && K({label: "Laufzeit Ø", value: fx(es.wM, 1) + " Y", delta: dl(es.wM, bm?.wM || 0, 1, "")})}
              {K({label: "Kupon Ø", value: fx(es.wK, 2) + "%", delta: dl(es.wK, bm?.wK || 0, 2, "%")})}
              {K({label: "Preis Ø", value: fx(bd.length ? bd.reduce((a,b) => a + (b.px||0) * (b.nom/es.tN), 0) : 0, 2), delta: bm ? dl(bd.length ? bd.reduce((a,b) => a + (b.px||0) * (b.nom/es.tN), 0) : 0, ab.length ? ab.reduce((a,b) => a + (b.px||0) * (b.nom/bm.tN), 0) : 0, 2, "") : null})}
              {!excludeStats.includes("ksarw") && K({label: "KSA-RW Ø", value: fx(es.wR, 0) + "%", delta: dl(es.wR, bm?.wR || 0, 0, "%")})}
              {!excludeStats.includes("rating") && K({label: "Rating Ø", value: LBL[Math.round(es.wLn)] || "—", delta: bm ? <span className="text-[8px] text-slate-400 tabular-nums">BM {LBL[Math.round(bm.wLn)] || "—"}</span> : null})}
              {K({label: "ESG", value: Math.round(es.gP * 100) + "%", delta: dl(es.gP * 100, (bm?.gP || 0) * 100, 0, "pp"), accent: es.gP > 0 ? "text-emerald-600" : "text-slate-400"})}
              {!excludeStats.includes("renditerw") && K({label: "Rendite/RW", value: fx(es.yRw, 2), delta: dl(es.yRw, bm?.yRw || 0, 2, "")})}
            </div>
          </div>
        );
      })()}
      {/* MOBILE: Card View */}
      <div className="block md:hidden divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
        {filteredAndSorted.map((b, idx) => (
          <div key={b.id + "-m-" + idx} onClick={() => onBondClick && onBondClick(b)}
            className={"px-3 py-3 transition-colors cursor-pointer " + (b.locked ? "bg-amber-50/50 active:bg-amber-100 border-l-[3px] border-amber-400" : "active:bg-spark-50")}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Flag c={b.co} />
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[13px] truncate">{b.e}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{b.isin}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {showN && b.locked !== undefined && (b.locked === true && b.inUniverse ? <span className="inline-flex items-center gap-0"><span className="px-1.5 py-0.5 rounded-l-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 border-r-0">B</span><span className="px-1.5 py-0.5 rounded-r-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 border-l-0">+N</span></span> : <span className={"px-2 py-0.5 rounded-full text-[9px] font-bold " + (b.locked === true ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200")}>{b.locked === true ? "Bestand" : "Neu"}</span>)}
                <Tag c={b.ln >= 8 ? "gray" : "blue"}>{b.lo}</Tag>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[12px]">
              <div><span className="text-slate-400 text-[10px]">Rendite</span><div className="font-bold text-slate-800 tabular-nums">{fx(b.y, 2)}%</div></div>
              <div><span className="text-slate-400 text-[10px]">Spread</span><div className="font-bold text-spark-600 tabular-nums">{fx(b.s, 1)} bp</div></div>
              <div><span className="text-slate-400 text-[10px]">Kupon</span><div className="font-bold text-slate-700 tabular-nums">{fx(b.k, 2)}%</div></div>
              <div><span className="text-slate-400 text-[10px]">Duration</span><div className="tabular-nums text-slate-600">{fx(b.md, 2)}</div></div>
              <div><span className="text-slate-400 text-[10px]">Preis</span><div className="tabular-nums text-slate-600">{b.px ? fx(b.px, 2) : "-"}</div></div>
              {showN && <div><span className="text-slate-400 text-[10px]">Gewicht</span><div className="tabular-nums text-slate-600">{s && s.tN > 0 ? fx(b.weight * 100, 1) + "%" : "-"}</div></div>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {b.g ? <Tag c="green">ESG</Tag> : null}
              <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + rankBadgeCls(b.rank || "SP")}>{b.rank || "SP"}</span>
              <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + (b.callable ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500")}>{b.perpetual ? "Perp" : b.callable ? "Call" : "Bullet"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">RW {b.rw}%</span>
            </div>
          </div>
        ))}
      </div>
      {/* DESKTOP: Table View */}
      <div className="overflow-x-auto overflow-y-auto max-h-[40vh] md:max-h-[60vh] hidden md:block">
        <table className="w-full text-xs mobile-sticky-col">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200">
              {visibleCols.map(k => { const c = BCOLS.find(x => x.key === k); if (!c) return null;
                return <th key={k} draggable className={"px-2 py-1.5 text-[10px] uppercase text-slate-500 font-bold tracking-wider select-none whitespace-nowrap " + (c.align === "left" ? "text-left" : "text-center") + (dragOverCol === k ? " bg-spark-100 border-x-2 border-spark-400" : "") + (dragCol === k ? " opacity-40" : "")}
                  onDragStart={() => handleDragStart(k)} onDragOver={(e) => handleDragOver(e, k)} onDrop={() => handleDrop(k)} onDragEnd={handleDragEnd}
                  style={{ cursor: "grab" }}>
                  <div className="flex items-center gap-0.5 cursor-pointer" style={c.align === "center" ? {justifyContent: "center"} : {}} onClick={() => doSort(c.sk)}>
                    <span className="text-[8px] text-slate-300 cursor-grab mr-0.5">⠿</span>
                    {c.label}
                    {sK === c.sk && <span className="text-spark-500 text-[9px] ml-0.5">{sD === 1 ? "▲" : "▼"}</span>}
                  </div>
                </th>;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.map((b, idx) => (
              <tr key={b.id + "-" + idx} className={"transition-colors cursor-pointer group " + (b.locked ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-spark-50")} onClick={() => onBondClick && onBondClick(b)}>
                {visibleCols.map(k => renderBondCell(k, b, showN, s))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default BondTable;
