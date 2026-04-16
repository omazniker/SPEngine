import React, { useState, useMemo, useRef, useCallback } from 'react';

const calcLinearRegression = (data, xKey, yKey) => {
  const validData = data.filter(d => d[xKey] != null && d[yKey] != null && !isNaN(d[xKey]) && !isNaN(d[yKey]));
  const n = validData.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  validData.forEach(d => {
    const x = d[xKey], y = d[yKey];
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  });
  const denominator = (n * sumXX - sumX * sumX);
  if (Math.abs(denominator) < 1e-10) return null;
  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  return { m, b };
};

function ScatterMatrix({ activeBonds, backgroundBonds = [], hideFilters = false, filter, allBonds, universeProfiles = [], universe = [] }) {
  const [scatterX, setScatterX] = useState("md"); const [scatterY, setScatterY] = useState("y");
  const [colorMode, setColorMode] = useState("auto");
  // Zoom state: rubber-band selection
  const [zoomRange, setZoomRange] = useState(null); // { xMin, xMax, yMin, yMax } or null=auto
  const [selBox, setSelBox] = useState(null); // { x1%, y1%, x2%, y2% } during drag
  const selStartRef = useRef(null);
  const chartContainerRef = useRef(null);
  const resetZoom = () => setZoomRange(null);
  const [hiddenLegend, setHiddenLegend] = useState(new Set());
  const COLOR_MODES = {
    auto: { label: "Automatisch" },
    none: { label: "Keine" },
    scenario: { label: "Szenario" },
    esg: { label: "ESG / Konventionell" },
    quelle: { label: "Bestand / Neuanlage" },
    land: { label: "Land" },
    rating: { label: "Rating" },
    rang: { label: "Rang" },
    sektor: { label: "Sektor" },
    rw: { label: "Risikogewicht" }
  };
  const hasScenarioBonds = activeBonds.some(x => x._scColor);
  const LAND_PAL = { DE: ["rgba(226,0,26,0.3)","rgb(226,0,26)"], FR: ["rgba(0,85,164,0.3)","rgb(0,85,164)"], IT: ["rgba(0,140,69,0.3)","rgb(0,140,69)"], NL: ["rgba(255,102,0,0.3)","rgb(255,102,0)"], ES: ["rgba(198,11,30,0.3)","rgb(198,11,30)"], AT: ["rgba(237,41,57,0.3)","rgb(237,41,57)"], BE: ["rgba(255,215,0,0.35)","rgb(180,150,0)"], US: ["rgba(60,59,110,0.3)","rgb(60,59,110)"], FI: ["rgba(0,47,108,0.3)","rgb(0,47,108)"], IE: ["rgba(22,155,98,0.3)","rgb(22,155,98)"], NO: ["rgba(186,12,47,0.3)","rgb(186,12,47)"], DK: ["rgba(200,16,46,0.3)","rgb(200,16,46)"], SE: ["rgba(0,106,167,0.3)","rgb(0,106,167)"], GB: ["rgba(0,36,125,0.3)","rgb(0,36,125)"], CH: ["rgba(255,0,0,0.3)","rgb(210,0,0)"], PT: ["rgba(0,102,0,0.3)","rgb(0,102,0)"] };
  const LAND_DEFAULT = ["rgba(148,163,184,0.3)","rgb(100,116,139)"];
  const toFlag = (co) => co ? co.replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)) : "";
  const RAT_PAL = { AA: ["rgba(16,185,129,0.3)","rgb(5,150,105)"], A: ["rgba(59,130,246,0.3)","rgb(37,99,235)"], BBB: ["rgba(245,158,11,0.3)","rgb(217,119,6)"], BB: ["rgba(239,68,68,0.3)","rgb(220,38,38)"] };
  const getColor = (b, mode) => {
    const m = mode === "auto" ? (hasScenarioBonds ? "scenario" : activeBonds.some(x => x.locked === true) ? "quelle" : "esg") : mode;
    switch (m) {
      case "none": return { fill: "rgba(100,116,139,0.35)", bdr: "rgb(71,85,105)" };
      case "scenario": { const c = b._scColor || "#94a3b8"; return { fill: c + "40", bdr: c }; }
      case "esg": return b.g === 1 ? { fill: "rgba(52,211,153,0.3)", bdr: "rgb(16,185,129)" } : { fill: "rgba(226,0,26,0.3)", bdr: "rgb(226,0,26)" };
      case "quelle":
      if (b.locked === true && b.inUniverse) return { fill: "linear-gradient(135deg, rgba(245,158,11,0.45) 50%, rgba(52,211,153,0.45) 50%)", bdr: "rgb(120,113,108)" };
      return b.locked === true ? { fill: "rgba(245,158,11,0.3)", bdr: "rgb(217,119,6)" } : { fill: "rgba(52,211,153,0.3)", bdr: "rgb(16,185,129)" };
      case "land": return { fill: "rgba(241,245,249,0.6)", bdr: "rgb(203,213,225)", flag: toFlag(b.co) };
      case "rating": { const r = b.lo || ""; const k = r.startsWith("AA") ? "AA" : r.startsWith("A") ? "A" : r.startsWith("BBB") ? "BBB" : "BB"; const c = RAT_PAL[k] || RAT_PAL.BB; return { fill: c[0], bdr: c[1] }; }
      case "rang": return RANK_SCATTER[b.rank || "SP"] || RANK_SCATTER.SP;
      case "sektor": { const SK_PAL = { BANKS: ["rgba(37,99,235,0.3)","rgb(37,99,235)"], INSURANCE: ["rgba(13,148,136,0.3)","rgb(13,148,136)"], FINANCIALS: ["rgba(139,92,246,0.3)","rgb(139,92,246)"], REITS: ["rgba(217,119,6,0.3)","rgb(217,119,6)"], OTHER: ["rgba(148,163,184,0.3)","rgb(100,116,139)"] }; const sk = b.sektor || "OTHER"; const c = SK_PAL[sk] || SK_PAL.OTHER; return { fill: c[0], bdr: c[1] }; }
      case "rw": return b.rw === 20 ? { fill: "rgba(16,185,129,0.3)", bdr: "rgb(5,150,105)" } : b.rw === 50 ? { fill: "rgba(245,158,11,0.3)", bdr: "rgb(217,119,6)" } : { fill: "rgba(239,68,68,0.3)", bdr: "rgb(220,38,38)" };
      default: return { fill: "rgba(226,0,26,0.3)", bdr: "rgb(226,0,26)" };
    }
  };
  const getLegend = (mode) => {
    const m = mode === "auto" ? (hasScenarioBonds ? "scenario" : activeBonds.some(x => x.locked === true) ? "quelle" : "esg") : mode;
    switch (m) {
      case "none": return [];
      case "scenario": { const seen = new Map(); activeBonds.forEach(b => { if (b._scName && !seen.has(b._scName)) seen.set(b._scName, { color: b._scColor, idx: b._scIdx }); }); return [...seen.entries()].map(([name, { color, idx }]) => ({ label: name, customColor: color, scShape: idx != null ? idx % 4 : 0 })); }
      case "esg": return [{ label: "ESG / Green", fill: "bg-emerald-400", bdr: "border-emerald-500" }, { label: "Konventionell", fill: "bg-spark-400", bdr: "border-spark-500" }];
      case "quelle": {
      const _hasBoth = activeBonds.some(x => x.locked === true && x.inUniverse);
      const _items = [{ label: "Bestand", fill: "bg-amber-400", bdr: "border-amber-600" }];
      if (_hasBoth) _items.push({ label: "Bestand + Neu", fill: "", bdr: "", split: true });
      _items.push({ label: "Neuanlage", fill: "bg-emerald-400", bdr: "border-emerald-500" });
      return _items;
    }
      case "land": { const coCount = {}; activeBonds.forEach(b => { coCount[b.co] = (coCount[b.co] || 0) + 1; }); const cos = Object.keys(coCount).sort((a, b) => coCount[b] - coCount[a]); const top = cos.slice(0, 8).map(c => ({ label: CN[c] || c, fill: "", bdr: "", flag: toFlag(c) })); if (cos.length > 8) top.push({ label: `+${cos.length - 8}`, fill: "bg-slate-200", bdr: "border-slate-300" }); return top; }
      case "rating": return [{ label: "AA", fill: "bg-emerald-400", bdr: "border-emerald-500" }, { label: "A", fill: "bg-blue-400", bdr: "border-blue-500" }, { label: "BBB", fill: "bg-amber-400", bdr: "border-amber-500" }, { label: "< BBB", fill: "bg-red-400", bdr: "border-red-500" }];
      case "rang": return [{ label: "Senior Preferred", fill: "bg-spark-400", bdr: "border-spark-500" }, { label: "Sr Unsecured", fill: "bg-blue-400", bdr: "border-blue-500" }, { label: "Senior Non-Pref.", fill: "bg-slate-400", bdr: "border-slate-500" }, { label: "Secured", fill: "bg-amber-400", bdr: "border-amber-500" }, { label: "Tier 2", fill: "bg-orange-400", bdr: "border-orange-500" }, { label: "AT1", fill: "bg-rose-400", bdr: "border-rose-500" }];
      case "sektor": return [{ label: "Banken", fill: "bg-blue-500", bdr: "border-blue-600" }, { label: "Versicherungen", fill: "bg-teal-500", bdr: "border-teal-600" }, { label: "Finanzdienstl.", fill: "bg-violet-500", bdr: "border-violet-600" }, { label: "REITs", fill: "bg-amber-500", bdr: "border-amber-600" }, { label: "Sonstige", fill: "bg-slate-400", bdr: "border-slate-500" }];
      case "rw": return [{ label: "RW 20%", fill: "bg-emerald-400", bdr: "border-emerald-500" }, { label: "RW 50%", fill: "bg-amber-400", bdr: "border-amber-500" }, { label: "RW 100%", fill: "bg-red-400", bdr: "border-red-500" }];
      default: return [];
    }
  };
  const resolveColorMode = (mode) => mode === "auto" ? (hasScenarioBonds ? "scenario" : activeBonds.some(x => x.locked === true) ? "quelle" : "esg") : mode;
  const getLegendKey = (b, mode) => {
    const m = resolveColorMode(mode);
    switch (m) {
      case "scenario": return b._scName || "";
      case "esg": return b.g === 1 ? "ESG / Green" : "Konventionell";
      case "quelle": return b.locked === true ? (b.inUniverse ? "Bestand + Neu" : "Bestand") : "Neuanlage";
      case "land": return CN[b.co] || b.co || "";
      case "rating": { const r = b.lo || ""; return r.startsWith("AA") ? "AA" : r.startsWith("A") ? "A" : r.startsWith("BBB") ? "BBB" : "< BBB"; }
      case "rang": { const R = { SP: "Senior Preferred", SU: "Sr Unsecured", SNP: "Senior Non-Pref.", SEC: "Secured", T2: "Tier 2", AT1: "AT1" }; return R[b.rank] || R.SP; }
      case "sektor": { const S = { BANKS: "Banken", INSURANCE: "Versicherungen", FINANCIALS: "Finanzdienstl.", REITS: "REITs", OTHER: "Sonstige" }; return S[b.sektor] || S.OTHER; }
      case "rw": return b.rw === 20 ? "RW 20%" : b.rw === 50 ? "RW 50%" : "RW 100%";
      default: return "";
    }
  };
  const [_fIssuers, _setFIssuers] = useState([]); const [_fCountries, _setFCountries] = useState([]); const [_fRatings, _setFRatings] = useState([]);
  const [_fRank, _setFRank] = useState([]); const [_fCall, _setFCall] = useState([]);
  const [_fESG, _setFESG] = useState("all"); const [_fRW, _setFRW] = useState([]);
  const [_fSource, _setFSource] = useState("all");
  const [_fSP, _setFSP] = useState([]); const [_fMo, _setFMo] = useState([]); const [_fMsciEsg, _setFMsciEsg] = useState([]); const [_fKpnTyp, _setFKpnTyp] = useState([]); const [_fWaeh, _setFWaeh] = useState([]); const [_fSektor, _setFSektor] = useState([]);
  const [_minK, _setMinK] = useState(""); const [_maxK, _setMaxK] = useState("");
  const [_minY, _setMinY] = useState(""); const [_maxY, _setMaxY] = useState("");
  const [_minPx, _setMinPx] = useState(""); const [_maxPx, _setMaxPx] = useState("");
  const [_minD, _setMinD] = useState(""); const [_maxD, _setMaxD] = useState("");
  const [_minMty, _setMinMty] = useState(""); const [_maxMty, _setMaxMty] = useState(""); const [_fMtyBkt, _setFMtyBkt] = useState([]);
  const [_fExclIssuers, _setFExclIssuers] = useState([]);
  const [_activeExplorerPreset, _setActiveExplorerPreset] = useState("");
  const fIssuers = filter ? filter.fIssuers : _fIssuers; const setFIssuers = filter ? filter.setFIssuers : _setFIssuers;
  const fCountries = filter ? filter.fCountries : _fCountries; const setFCountries = filter ? filter.setFCountries : _setFCountries;
  const fRatings = filter ? filter.fRatings : _fRatings; const setFRatings = filter ? filter.setFRatings : _setFRatings;
  const fRank = filter ? filter.fRank : _fRank; const setFRank = filter ? filter.setFRank : _setFRank;
  const fCall = filter ? filter.fCall : _fCall; const setFCall = filter ? filter.setFCall : _setFCall;
  const fESG = filter ? filter.fESG : _fESG; const setFESG = filter ? filter.setFESG : _setFESG;
  const fRW = filter ? filter.fRW : _fRW; const setFRW = filter ? filter.setFRW : _setFRW;
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
  const [showTrendline, setShowTrendline] = useState(true);
  const [showChartSettings, setShowChartSettings] = useState(false);
  const [chartPointSize, setChartPointSize] = useState(() => lsLoad("chartPointSize", 8));
  const [chartGridlines, setChartGridlines] = useState(() => lsLoad("chartGridlines", true));
  const [chartBgColor, setChartBgColor] = useState(() => lsLoad("chartBgColor", "#f8fafc"));
  const [chartAxisMin, setChartAxisMin] = useState({x:"", y:""});
  const [chartAxisMax, setChartAxisMax] = useState({x:"", y:""});
  const [chartShowAxisTitle, setChartShowAxisTitle] = useState(() => lsLoad("chartShowAxisTitle", true));
  const [chartAxisTitleSize, setChartAxisTitleSize] = useState(() => lsLoad("chartAxisTitleSize", 10));
  const [chartAxisTitleColor, setChartAxisTitleColor] = useState(() => lsLoad("chartAxisTitleColor", "#1e293b"));
  const [chartTickSize, setChartTickSize] = useState(() => lsLoad("chartTickSize", 9));
  const [chartTickColor, setChartTickColor] = useState(() => lsLoad("chartTickColor", "#94a3b8"));
  const [chartShowTicks, setChartShowTicks] = useState(() => lsLoad("chartShowTicks", true));
  const [chartTickDecimals, setChartTickDecimals] = useState(() => lsLoad("chartTickDecimals", -1));
  const [chartPointOpacity, setChartPointOpacity] = useState(() => lsLoad("chartPointOpacity", 100));
  const [chartPointBorder, setChartPointBorder] = useState(() => lsLoad("chartPointBorder", true));
  const [chartGridColor, setChartGridColor] = useState(() => lsLoad("chartGridColor", "#e2e8f0"));
  const [chartGridStyle, setChartGridStyle] = useState(() => lsLoad("chartGridStyle", "solid"));
  const [chartXStep, setChartXStep] = useState(() => lsLoad("chartXStep", ""));
  const [chartYStep, setChartYStep] = useState(() => lsLoad("chartYStep", ""));
  const [chartXReverse, setChartXReverse] = useState(() => lsLoad("chartXReverse", false));
  const [chartYReverse, setChartYReverse] = useState(() => lsLoad("chartYReverse", false));
  const [chartTickAngle, setChartTickAngle] = useState(() => lsLoad("chartTickAngle", 0));
  const [chartTickSuffix, setChartTickSuffix] = useState(() => lsLoad("chartTickSuffix", "auto"));
  const [chartShowMinorGrid, setChartShowMinorGrid] = useState(() => lsLoad("chartShowMinorGrid", false));
  const [chartTickMainType, setChartTickMainType] = useState(() => lsLoad("chartTickMainType", "outside"));
  const [chartTickMinorType, setChartTickMinorType] = useState(() => lsLoad("chartTickMinorType", "none"));
  const [chartLabelPos, setChartLabelPos] = useState(() => lsLoad("chartLabelPos", "low"));
  const [chartLabelDistance, setChartLabelDistance] = useState(() => lsLoad("chartLabelDistance", 100));
  const [chartNumberFormat, setChartNumberFormat] = useState(() => lsLoad("chartNumberFormat", "standard"));
  const [chartAxisPosition, setChartAxisPosition] = useState(() => lsLoad("chartAxisPosition", "between"));
  const [chartTickInterval, setChartTickInterval] = useState(() => lsLoad("chartTickInterval", 1));
  const [chartLabelInterval, setChartLabelInterval] = useState(() => lsLoad("chartLabelInterval", "auto"));
  const [trendSegments, setTrendSegments] = useState(["gesamt"]);
  const trendSegment = trendSegments[0] || "gesamt";
  const setTrendSegment = (v) => setTrendSegments([v]);
  const toggleTrendSeg = (k) => setTrendSegments(prev => {
    if (prev.includes(k)) { const r = prev.filter(s => s !== k); return r.length ? r : ["gesamt"]; }
    return [...prev, k];
  });
  const [hiddenTrends, setHiddenTrends] = useState(new Set());
  const TREND_SEGMENTS = useMemo(() => {
    const profileColors = ["#E2001A", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#0d9488", "#ef4444", "#dc2626"];
    const base = {
      gesamt: { label: "Gesamt", group: () => "Gesamt" },
      rating: { label: "Rating", group: (b) => { const r = b.lo || ""; return r.startsWith("AA") ? "AA" : r.startsWith("A") ? "A" : r.startsWith("BBB") ? "BBB" : "BB/HY"; },
        colors: { "AA": "#10b981", "A": "#3b82f6", "BBB": "#f59e0b", "BB/HY": "#ef4444" } },
      sektor: { label: "Sektor", group: (b) => SEKTOR_LABELS[b.sektor] || b.sektor || "Sonstige",
        colors: { "Banken": "#2563eb", "Versicherungen": "#0d9488", "Finanzdienstleister": "#8b5cf6", "Immobilien/REITs": "#d97706", "Sonstige": "#64748b" } },
      rang: { label: "Rang", group: (b) => b.rank || "SP",
        colors: { "SP": "#10b981", "SU": "#3b82f6", "SNP": "#f59e0b", "SEC": "#8b5cf6", "T2": "#ef4444", "AT1": "#dc2626" } },
      faellTyp: { label: "Fälligkeitstyp", group: (b) => b.perpetual ? "Perpetual" : b.callable ? "Callable" : "Bullet",
        colors: { "Bullet": "#10b981", "Callable": "#f59e0b", "Perpetual": "#ef4444" } },
      rw: { label: "RW", group: (b) => b.rw + "% RW",
        colors: { "20% RW": "#10b981", "50% RW": "#f59e0b", "100% RW": "#ef4444" } },
      esg: { label: "ESG", group: (b) => b.g ? "Green/ESG" : "Konventionell",
        colors: { "Green/ESG": "#10b981", "Konventionell": "#E2001A" } },
      land: { label: "Land", group: (b) => CN[b.co] || b.co || "–",
        colors: { "Deutschland": "#E2001A", "Frankreich": "#3b82f6", "USA": "#1e40af", "UK": "#dc2626", "Niederlande": "#f97316", "Spanien": "#eab308", "Italien": "#10b981", "Australien": "#0d9488" } },
      kpnTyp: { label: "Kupontyp", group: (b) => (b.kpnTyp || "FIXED") === "FIXED" ? "Festzins" : "Variabel",
        colors: { "Festzins": "#3b82f6", "Variabel": "#f59e0b" } },
      masterliste: { label: "DZ Masterliste", group: (b) => {
          if (b.t && MASTERLISTE_TICKERS.includes(b.t)) return "DZ Masterliste";
          return "Andere";
        },
        colors: { "Gesamt-Universum": "#64748b", "DZ Masterliste": "#E2001A", "Andere": "#94a3b8" },
        includeAll: true },
    };
    // Dynamische Universum-Profile als eigene Trendlinien-Segmente
    if (universeProfiles && universeProfiles.length > 0) {
      const profIsinSets = {};
      universeProfiles.forEach((p, idx) => {
        const f = p.filters || {};
        const pIsins = new Set();
        universe.forEach(b => {
          let pass = true;
          if (f.mfRatings?.length && !f.mfRatings.includes(b.lo)) pass = false;
          if (f.mfCountries?.length && !f.mfCountries.includes(b.co)) pass = false;
          if (f.mfRank?.length && !f.mfRank.includes(b.rank || "SP")) pass = false;
          if (f.mfESG === "Y" && !b.g) pass = false;
          if (f.mfESG === "N" && b.g) pass = false;
          if (f.mfKpnTyp?.length && !f.mfKpnTyp.includes(b.kpnTyp || "FIXED")) pass = false;
          if (f.mfCall?.length) { const ct = b.perpetual ? "PERPETUAL" : b.callable ? "CALLABLE" : "BULLET"; if (!f.mfCall.includes(ct)) pass = false; }
          if (f.mfMinK && b.k < parseFloat(f.mfMinK)) pass = false;
          if (f.mfMaxK && b.k > parseFloat(f.mfMaxK)) pass = false;
          if (f.mfMinMty && b.mty < parseFloat(f.mfMinMty)) pass = false;
          if (f.mfMaxMty && b.mty > parseFloat(f.mfMaxMty)) pass = false;
          if (pass) pIsins.add(b.isin);
        });
        profIsinSets[p.id] = pIsins;
        const col = profileColors[idx % profileColors.length];
        const profName = p.n || ("Profil " + (idx + 1));
        base["prof_" + p.id] = {
          label: profName,
          group: (b) => profIsinSets[p.id]?.has(b.isin) ? profName : "Andere",
          colors: { "Gesamt-Universum": "#64748b", [profName]: col, "Andere": "#94a3b8" },
          includeAll: true,
        };
      });
    }
    return base;
  }, [universeProfiles, universe]);
  const [activeTipId, setActiveTipId] = useState(null);
  const isMarketMode = backgroundBonds.length === 0;
  const allCombined = useMemo(() => [...backgroundBonds, ...activeBonds], [backgroundBonds, activeBonds]);
  const optSource = allBonds || allCombined;
  const filterOpts = useMemo(() => {
    const emittenten = Array.from(new Set(optSource.map(b => b.t))).map(t => { const b = optSource.find(x => x.t === t); return { val: t, lbl: b.e }; }).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const laender = Array.from(new Set(optSource.map(b => b.co))).map(c => ({ val: c, lbl: CN[c] || c, co: c })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const ratings = Array.from(new Set(optSource.map(b => b.lo))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const spRatings = Array.from(new Set(optSource.map(b => b.sp).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const moRatings = Array.from(new Set(optSource.map(b => b.mo).filter(r => r && r !== 'NR'))).map(r => ({ val: r, lbl: r })).sort((a, b) => (RS[a.val] || 99) - (RS[b.val] || 99));
    const msciOpts = Array.from(new Set(optSource.map(b => b.msciEsg).filter(Boolean))).sort();
    const sektorOpts = Array.from(new Set(optSource.map(b => b.sektor).filter(Boolean))).map(s => ({ val: s, lbl: SEKTOR_LABELS[s] || s })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    return { emittenten, laender, ratings, spRatings, moRatings, msciOpts, sektorOpts };
  }, [optSource]);
  const resetScatterFilters = () => { setFIssuers([]); setFCountries([]); setFRatings([]); setFRank([]); setFCall([]); setFESG("all"); setFRW([]); _setFSource("all"); setFSP([]); setFMo([]); setFMsciEsg([]); setFKpnTyp([]); setFWaeh([]); setFSektor([]); setMinK(""); setMaxK(""); setMinY(""); setMaxY(""); setMinPx(""); setMaxPx(""); setMinD(""); setMaxD(""); setMinMty(""); setMaxMty(""); _setFExclIssuers([]); _setActiveExplorerPreset(""); };
  const toggleExplorerPreset = (preset) => {
    const active = typeof _activeExplorerPreset === "string" ? (_activeExplorerPreset ? _activeExplorerPreset.split(",") : []) : Array.isArray(_activeExplorerPreset) ? _activeExplorerPreset : [];
    const isActive = active.includes(preset.id);
    if (isActive) {
      const remaining = active.filter(id => id !== preset.id);
      setFIssuers([]); setFCountries([]); setFRatings([]); setFRank([]); setFCall([]); setFKpnTyp([]); setFSektor([]); setMaxMty(""); _setFExclIssuers([]);
      if (remaining.length > 0) {
        setTimeout(() => {
          const setters = { fCountries: setFCountries, fRank: setFRank, fCall: setFCall, fKpnTyp: setFKpnTyp, fRatings: setFRatings, fSektor: setFSektor, maxMty: setMaxMty, fExclIssuers: _setFExclIssuers, fIssuers: setFIssuers };
          remaining.forEach(id => { const p = EXPLORER_PRESETS.find(x => x.id === id); if (p) p.apply(setters); });
        }, 0);
      }
      _setActiveExplorerPreset(remaining.join(","));
    } else {
      const setters = { fCountries: setFCountries, fRank: setFRank, fCall: setFCall, fKpnTyp: setFKpnTyp, fRatings: setFRatings, fSektor: setFSektor, maxMty: setMaxMty, fExclIssuers: _setFExclIssuers, fIssuers: setFIssuers };
      preset.apply(setters);
      _setActiveExplorerPreset([...active, preset.id].join(","));
    }
  };
  const applyFilters = useCallback((bonds) => {
    return bonds.filter(b => {
    if (fIssuers.length > 0 && !fIssuers.includes(b.t)) return false;
    if (fCountries.length > 0 && !fCountries.includes(b.co)) return false;
    if (fRatings.length > 0 && !fRatings.includes(b.lo)) return false;
    if (fRank.length && !fRank.includes(b.rank || "SP")) return false;
    if (fCall.length) { const ct = b.perpetual ? "PERPETUAL" : b.callable ? "CALLABLE" : "BULLET"; if (!fCall.includes(ct)) return false; }
    if (fESG !== "all") { if (fESG === "Y" && !b.g) return false; if (fESG === "N" && b.g) return false; }
    if (fRW.length && !fRW.includes(String(b.rw))) return false;
    if (fSP.length > 0 && !fSP.includes(b.sp)) return false;
    if (fMo.length > 0 && !fMo.includes(b.mo)) return false;
    if (fMsciEsg.length) { const cat = (!b.msciEsg || b.msciEsg === 'N.S.') ? "NS" : b.msciEsg; if (!fMsciEsg.includes(cat)) return false; }
    if (fKpnTyp.length && !fKpnTyp.includes(b.kpnTyp || 'FIXED')) return false;
    if (fWaeh.length && !fWaeh.includes(b.waeh || 'EUR')) return false;
    if (fSektor.length && !fSektor.includes(b.sektor || 'OTHER')) return false;
    const pk1 = parseFloat(minK); if (!isNaN(pk1) && b.k < pk1) return false;
    const pk2 = parseFloat(maxK); if (!isNaN(pk2) && b.k > pk2) return false;
    const py1 = parseFloat(minY); if (!isNaN(py1) && b.y < py1) return false;
    const py2 = parseFloat(maxY); if (!isNaN(py2) && b.y > py2) return false;
    const pp1 = parseFloat(minPx); if (!isNaN(pp1) && b.px < pp1) return false;
    const pp2 = parseFloat(maxPx); if (!isNaN(pp2) && b.px > pp2) return false;
    const pd1 = parseFloat(minD); if (!isNaN(pd1) && b.md < pd1) return false;
    const pd2 = parseFloat(maxD); if (!isNaN(pd2) && b.md > pd2) return false;
    const pm1 = parseFloat(minMty); if (!isNaN(pm1) && b.mty < pm1) return false;
    const pm2 = parseFloat(maxMty); if (!isNaN(pm2) && b.mty > pm2) return false;
    if (_fSource !== "all") { if (_fSource === "BESTAND" && b.locked !== true) return false; if (_fSource === "NEU" && b.locked === true) return false; }
    if (fExclIssuers.length && fExclIssuers.includes(b.t)) return false;
    return true;
  }); }, [fIssuers, fCountries, fRatings, fRank, fCall, fESG, fRW, _fSource, fSP, fMo, fMsciEsg, fKpnTyp, fWaeh, fSektor, minK, maxK, minY, maxY, minPx, maxPx, minD, maxD, minMty, maxMty, fExclIssuers]);
  const filteredActive = useMemo(() => applyFilters(activeBonds), [applyFilters, activeBonds]);
  const filteredBackground = useMemo(() => applyFilters(backgroundBonds), [applyFilters, backgroundBonds]);
  const presentLegendKeys = useMemo(() => { const keys = new Set(); [...filteredActive, ...filteredBackground].forEach(b => keys.add(getLegendKey(b, colorMode))); return keys; }, [filteredActive, filteredBackground, colorMode]);
  const displayActive = useMemo(() => hiddenLegend.size ? filteredActive.filter(b => !hiddenLegend.has(getLegendKey(b, colorMode))) : filteredActive, [filteredActive, hiddenLegend, colorMode]);
  const displayBackground = useMemo(() => hiddenLegend.size ? filteredBackground.filter(b => !hiddenLegend.has(getLegendKey(b, colorMode))) : filteredBackground, [filteredBackground, hiddenLegend, colorMode]);
  const displayCombined = useMemo(() => [...displayBackground, ...displayActive], [displayActive, displayBackground]);
  const scatterAxes = useMemo(() => {
    if (!displayCombined.length) return { xMin: 0, xMax: 10, yMin: 0, yMax: 4, xRange: 10, yRange: 4, mX: SCATTER_METRICS[scatterX], mY: SCATTER_METRICS[scatterY], zoomed: false };
    const mX = SCATTER_METRICS[scatterX] || SCATTER_METRICS.md; const mY = SCATTER_METRICS[scatterY] || SCATTER_METRICS.y;
    const xVals = displayCombined.map(b => b[mX.key]); const yVals = displayCombined.map(b => b[mY.key]);
    let xMin = mX.domain ? mX.domain[0] : Math.min(...xVals) - mX.pad[0]; let xMax = mX.domain ? mX.domain[1] : Math.max(...xVals) + mX.pad[1];
    let yMin = mY.domain ? mY.domain[0] : Math.min(...yVals) - mY.pad[0]; let yMax = mY.domain ? mY.domain[1] : Math.max(...yVals) + mY.pad[1];
    let zoomed = false;
    if (zoomRange) { xMin = zoomRange.xMin; xMax = zoomRange.xMax; yMin = zoomRange.yMin; yMax = zoomRange.yMax; zoomed = true; }
    // Manual axis overrides from chart settings
    if (chartAxisMin.x !== "" && !isNaN(parseFloat(chartAxisMin.x))) xMin = parseFloat(chartAxisMin.x);
    if (chartAxisMax.x !== "" && !isNaN(parseFloat(chartAxisMax.x))) xMax = parseFloat(chartAxisMax.x);
    if (chartAxisMin.y !== "" && !isNaN(parseFloat(chartAxisMin.y))) yMin = parseFloat(chartAxisMin.y);
    if (chartAxisMax.y !== "" && !isNaN(parseFloat(chartAxisMax.y))) yMax = parseFloat(chartAxisMax.y);
    if (chartAxisMin.x !== "" || chartAxisMax.x !== "" || chartAxisMin.y !== "" || chartAxisMax.y !== "") zoomed = true;
    return { xMin, xMax, yMin, yMax, xRange: xMax - xMin, yRange: yMax - yMin, mX, mY, zoomed };
  }, [displayCombined, scatterX, scatterY, zoomRange, chartAxisMin, chartAxisMax]);
  const scatterAxesRef = useRef(scatterAxes);
  scatterAxesRef.current = scatterAxes;
  // Convert pixel position to data coordinates
  const pxToData = (clientX, clientY) => {
    const el = chartContainerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const ax = scatterAxes;
    const pxFrac = (clientX - rect.left) / rect.width;
    const pyFrac = 1 - (clientY - rect.top) / rect.height;
    const dataX = ax.xMin + ((pxFrac - 0.05) / 0.9) * ax.xRange;
    const dataY = ax.yMin + ((pyFrac - 0.08) / 0.8) * ax.yRange;
    return { dataX, dataY, pxFrac, pyFrac };
  };
  const pseudoRand = (id, seed = 0) => { let h = ((id * 2654435761) + (seed * 40503)) >>> 0; return (h & 0xFFFF) / 0xFFFF; };
  const calcPos = (b) => {
    const { xMin: xN, yMin: yN, xRange: xR, yRange: yR, mX, mY } = scatterAxes;
    const xSd = scatterX.charCodeAt(0), ySd = scatterY.charCodeAt(0) + 50;
    let xP, yP;
    if (mX.cat) { const rng = mX.domain ? mX.domain[1] - mX.domain[0] : (xR || 1); const mn = mX.domain ? mX.domain[0] : xN; xP = ((b[mX.key] + (pseudoRand(b.id, xSd) - 0.5) * (mX.key === "rw" ? 4 : 0.3)) - mn) / rng * 90 + 5; }
    else { xP = xR > 0 ? ((b[mX.key] - xN) / xR) * 90 + 5 : 50; }
    if (mY.cat) { const rng = mY.domain ? mY.domain[1] - mY.domain[0] : (yR || 1); const mn = mY.domain ? mY.domain[0] : yN; yP = ((b[mY.key] + (pseudoRand(b.id, ySd) - 0.5) * (mY.key === "rw" ? 4 : 0.3)) - mn) / rng * 80 + 8; }
    else { yP = yR > 0 ? ((b[mY.key] - yN) / yR) * 80 + 8 : 50; }
    if (scatterAxes.zoomed) return { x: xP, y: yP };
    return { x: Math.max(2, Math.min(98, xP)), y: Math.max(2, Math.min(95, yP)) };
  };
  const nTk = (min, range) => { let step = range > 100 ? 20 : range > 40 ? 10 : range > 15 ? 5 : range > 5 ? 2 : range > 2 ? 1 : range > 0.5 ? 0.25 : 0.1; const st = Math.ceil(min / step) * step, t = []; for (let v = st; v <= min + range && t.length < 30; v += step) t.push(v); return t; };
  const fmtT = (v, key) => v.toFixed(key === 'y' || key === 'k' ? 2 : key === 's' || key === 'rw' ? 0 : 1).replace('.', ',');
  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <span className="text-[11px] uppercase font-black text-slate-800 tracking-widest shrink-0">Risiko-Rendite-Matrix</span>
      </div>
      {!hideFilters && (<>
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
          {EXPLORER_PRESETS.map(p => (
            <button key={p.id} onClick={() => toggleExplorerPreset(p)}
              className={"px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 " + (_activeExplorerPreset === p.id ? "bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300")}
              title={p.desc}>
              <span>{p.icon}</span> {p.name}
            </button>
          ))}
          {_activeExplorerPreset && (
            <button onClick={resetScatterFilters} className="px-2 py-1 rounded-lg text-[9px] font-bold border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-all">
              Preset entfernen
            </button>
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
          <div className="flex flex-col gap-1"><MultiSelect label="Quelle" options={[{val:"BESTAND",lbl:"🔒 Bestand"},{val:"NEU",lbl:"✚ Neuanlage"}]} selected={_fSource !== "all" ? [_fSource] : []} onChange={v => _setFSource(v.length ? v[v.length-1] : "all")} wFull stacked align="left" emptyLabel="Alle" /></div>
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
          <div className="flex flex-col gap-1 justify-end h-full"><button onClick={resetScatterFilters} className="bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg px-2 py-1.5 hover:bg-slate-300 transition-colors w-full h-[28px]">Filter zurücksetzen</button></div>
        </div>
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
          if (_fSource !== "all") chips.push({ label: _fSource === "BESTAND" ? "🔒 Bestand" : "✚ Neuanlage", clear: () => _setFSource("all") });
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
              <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{displayActive.length} von {(allBonds || activeBonds).length}</span>
            </div>
          );
        })()}
        {(() => {
          const n = displayActive.length;
          const ab = (allBonds || activeBonds).map(b => ({ ...b, nom: b.nom || b.vol || 1000 }));
          const bm = stats(ab);
          const bmTotal = bm ? bm.nb : activeBonds.length;
          const pct = bmTotal > 0 ? Math.round(n / bmTotal * 100) : 0;
          const bd = displayActive.map(b => ({ ...b, nom: b.nom || b.vol || 1000 }));
          const es = stats(bd);
          if (!es) return null;
          const d = (v, r, fmt, unit) => { if (!bm) return ""; const diff = v - r; const s = diff > 0 ? "+" : ""; const cls = Math.abs(diff) < 0.005 ? "text-slate-400" : diff > 0 ? "text-emerald-600" : "text-rose-500"; return <span className={"text-[8px] font-bold tabular-nums " + cls}>{s}{fx(diff, fmt)}{unit || ""}</span>; };
          const K = ({label, value, delta, accent}) => (
            <div className="flex flex-col items-center min-w-[65px]">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
              <span className={"text-[13px] font-black tabular-nums leading-tight " + (accent || "text-slate-800")}>{value}</span>
              {delta}
            </div>
          );
          return (
            <div className="border-t px-4 py-2.5 border-slate-100 bg-slate-50/30">
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                {K({label: "Anleihen", value: n + " / " + bmTotal, delta: <span className="text-[8px] text-slate-400 tabular-nums">{pct}% · {es.ni} Em. · {Object.keys(es.cc).length} Länder</span>})}
                {K({label: "Volumen", value: fmtVol(es.tN), delta: bm ? <span className="text-[8px] text-slate-400 tabular-nums">BM {fmtVol(bm.tN)}</span> : null})}
                {K({label: "Rendite Ø", value: fx(es.wY, 2) + "%", delta: d(es.wY, bm?.wY || 0, 2, "%"), accent: "text-emerald-700"})}
                {K({label: "I-Spread Ø", value: fx(es.wS, 0) + " bp", delta: d(es.wS, bm?.wS || 0, 0, " bp"), accent: "text-emerald-700"})}
                {K({label: "Duration Ø", value: fx(es.wD, 2), delta: d(es.wD, bm?.wD || 0, 2, "")})}
                {K({label: "Laufzeit Ø", value: fx(es.wM, 1) + " Y", delta: d(es.wM, bm?.wM || 0, 1, "")})}
                {K({label: "Kupon Ø", value: fx(es.wK, 2) + "%", delta: d(es.wK, bm?.wK || 0, 2, "%")})}
                {K({label: "Preis Ø", value: fx(bd.length ? bd.reduce((a,b) => a + (b.px||0) * (b.nom/es.tN), 0) : 0, 2), delta: bm ? d(bd.length ? bd.reduce((a,b) => a + (b.px||0) * (b.nom/es.tN), 0) : 0, ab.length ? ab.reduce((a,b) => a + (b.px||0) * (b.nom/bm.tN), 0) : 0, 2, "") : null})}
                {K({label: "KSA-RW Ø", value: fx(es.wR, 0) + "%", delta: d(es.wR, bm?.wR || 0, 0, "%")})}
                {K({label: "Rating Ø", value: LBL[Math.round(es.wLn)] || "—", delta: bm ? <span className="text-[8px] text-slate-400 tabular-nums">BM {LBL[Math.round(bm.wLn)] || "—"}</span> : null})}
                {K({label: "ESG", value: Math.round(es.gP * 100) + "%", delta: d(es.gP * 100, (bm?.gP || 0) * 100, 0, "pp"), accent: es.gP > 0 ? "text-emerald-600" : "text-slate-400"})}
                {K({label: "Rendite/RW", value: fx(es.yRw, 2), delta: d(es.yRw, bm?.yRw || 0, 2, "")})}
              </div>
            </div>
          );
        })()}
      <div className="relative ml-14 mb-7 h-80 sm:h-[420px] lg:h-[500px]">
      <div className="absolute inset-0 bg-slate-50 rounded-xl border border-slate-200 shadow-inner overflow-hidden select-none"
        ref={chartContainerRef}
        onMouseDown={e => {
          if (e.button !== 0) return;
          const d = pxToData(e.clientX, e.clientY);
          if (!d) return;
          selStartRef.current = d;
          setSelBox(null);
        }}
        onMouseMove={e => {
          if (!selStartRef.current) return;
          const d = pxToData(e.clientX, e.clientY);
          if (!d) return;
          const s = selStartRef.current;
          const rect = chartContainerRef.current.getBoundingClientRect();
          const sx = (e.clientX - rect.left); const sy = (e.clientY - rect.top);
          const ox = (s.pxFrac * rect.width); const oy = ((1 - s.pyFrac) * rect.height);
          if (Math.abs(sx - ox) < 5 && Math.abs(sy - oy) < 5) return;
          setSelBox({
            left: Math.min(s.pxFrac, d.pxFrac) * 100,
            top: Math.min(1 - s.pyFrac, 1 - d.pyFrac) * 100,
            width: Math.abs(d.pxFrac - s.pxFrac) * 100,
            height: Math.abs(d.pyFrac - s.pyFrac) * 100,
            dxMin: Math.min(s.dataX, d.dataX), dxMax: Math.max(s.dataX, d.dataX),
            dyMin: Math.min(s.dataY, d.dataY), dyMax: Math.max(s.dataY, d.dataY)
          });
        }}
        onMouseUp={() => {
          if (selBox && selBox.width > 1 && selBox.height > 1) {
            setZoomRange({ xMin: selBox.dxMin, xMax: selBox.dxMax, yMin: selBox.dyMin, yMax: selBox.dyMax });
          }
          selStartRef.current = null;
          setSelBox(null);
        }}
        onMouseLeave={() => { selStartRef.current = null; setSelBox(null); }}
        style={{ cursor: 'crosshair' }}>
        {[1,2,3,4,5].map(i => <React.Fragment key={i}><div className="absolute left-0 right-0 border-t border-slate-200/50" style={{ bottom: (i * 16.6) + '%' }} /><div className="absolute top-0 bottom-0 border-l border-slate-200/50" style={{ left: (i * 16.6) + '%' }} /></React.Fragment>)}
        {(() => { const { yMin: yMn, yRange: yR, mY } = scatterAxes; if (mY.cat && mY.ticks) { const rng = mY.domain ? mY.domain[1] - mY.domain[0] : (yR || 1), mn = mY.domain ? mY.domain[0] : yMn; return mY.ticks.map(t => { const pct = ((t.v - mn) / rng) * 80 + 8; return <div key={t.l} className="absolute left-2 text-[9px] font-bold text-slate-400 pointer-events-none" style={{ bottom: pct + '%', transform: 'translateY(50%)' }}>{t.l}</div>; }); } return nTk(yMn, yR).map(v => { const pct = yR > 0 ? ((v - yMn) / yR) * 80 + 8 : 50; return <div key={v} className="absolute left-2 text-[9px] font-bold text-slate-400 pointer-events-none" style={{ bottom: pct + '%', transform: 'translateY(50%)' }}>{fmtT(v, mY.key)}</div>; }); })()}
        {(() => { const { xMin: xMn, xRange: xR, mX } = scatterAxes; if (mX.cat && mX.ticks) { const rng = mX.domain ? mX.domain[1] - mX.domain[0] : (xR || 1), mn = mX.domain ? mX.domain[0] : xMn; return mX.ticks.map(t => { const pct = ((t.v - mn) / rng) * 90 + 5; return <div key={t.l} className="absolute bottom-1 text-[9px] font-bold text-slate-400 pointer-events-none" style={{ left: pct + '%', transform: 'translateX(-50%)' }}>{t.l}</div>; }); } return nTk(xMn, xR).map(v => { const pct = xR > 0 ? ((v - xMn) / xR) * 90 + 5 : 50; return <div key={v} className="absolute bottom-1 text-[9px] font-bold text-slate-400 pointer-events-none" style={{ left: pct + '%', transform: 'translateX(-50%)' }}>{fmtT(v, mX.key)}</div>; }); })()}
        {showTrendline && !scatterAxes.mX.cat && !scatterAxes.mY.cat && (() => { const { xMin: xMn, yMin: yMn, xRange: xR, yRange: yR, mX, mY } = scatterAxes; const drawLine = (bonds, col, dash, sw) => { const reg = calcLinearRegression(bonds, mX.key, mY.key); if (!reg || bonds.length < 2) return null; const y1 = yR > 0 ? ((reg.m * xMn + reg.b - yMn) / yR) * 80 + 8 : 50; const y2 = yR > 0 ? ((reg.m * (xMn + xR) + reg.b - yMn) / yR) * 80 + 8 : 50; return <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none"><line x1="5%" y1={(100 - y1) + '%'} x2="95%" y2={(100 - y2) + '%'} stroke={col} strokeWidth={sw || 2} strokeDasharray={dash} /></svg>; }; const allSrc = allBonds || activeBonds; const srcBonds = isMarketMode ? filteredActive : [...filteredBackground, ...filteredActive]; const hasScGroups = filteredActive.some(b => b._scName); if (hasScGroups) { const groups = new Map(); filteredActive.forEach(b => { const k = b._scName || "Portfolio"; if (!groups.has(k)) groups.set(k, { bonds: [], color: b._scColor || '#E2001A' }); groups.get(k).bonds.push(b); }); const bgSrc = isMarketMode ? allSrc : filteredBackground; return <>{!hiddenTrends.has('Universum') && bgSrc.length > 1 && drawLine(bgSrc, '#94a3b8', '6 4', 1.5)}{[...groups.entries()].map(([name, { bonds, color }]) => <React.Fragment key={name}>{!hiddenTrends.has(name) && drawLine(bonds, color, '', 2)}</React.Fragment>)}</>; } const activeSegs = trendSegments.filter(s => s !== "gesamt" && TREND_SEGMENTS[s]); if (activeSegs.length > 0) { const allLines = []; const defaultColors = ["#E2001A", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#0d9488", "#ef4444", "#64748b"]; activeSegs.forEach(segKey => { const seg = TREND_SEGMENTS[segKey]; const groups = new Map(); srcBonds.forEach(b => { const k = typeof seg.group === 'function' ? seg.group(b) : "Gesamt"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }); if (seg.includeAll && !hiddenTrends.has("Gesamt-Universum") && srcBonds.length > 1) allLines.push(drawLine(srcBonds, seg.colors?.["Gesamt-Universum"] || "#64748b", "6 4", 1.5)); [...groups.keys()].forEach((name, i) => { const col = seg.colors?.[name] || defaultColors[i % defaultColors.length]; if (!hiddenTrends.has(name)) allLines.push(<React.Fragment key={segKey+"_"+name}>{drawLine(groups.get(name), col, '', 2)}</React.Fragment>); }); }); return <>{allLines}</>; } if (isMarketMode) { const isFiltered = filteredActive.length !== allSrc.length; return <>{allSrc.length > 1 && drawLine(allSrc, '#94a3b8', '4 4')}{isFiltered && filteredActive.length > 1 && drawLine(filteredActive, '#E2001A', '')}</>; } return <>{filteredBackground.length > 1 && drawLine(filteredBackground, '#94a3b8', '4 4')}{filteredActive.length > 1 && drawLine(filteredActive, '#E2001A', '')}</>; })()}
        {displayBackground.map(b => { const p = calcPos(b); return <div key={'bg-'+b.id} className="absolute w-1.5 h-1.5 rounded-full bg-slate-300/40 pointer-events-none" style={{ left: p.x + '%', bottom: p.y + '%', transform: 'translate(-50%, 50%)' }} />; })}
        {displayActive.map(b => { const p = calcPos(b); const sz = isMarketMode ? Math.max(10, Math.min(28, 10 + Math.log2((b.nom || 1000) / 100 + 1) * 3)) : Math.max(14, Math.min(32, 14 + Math.log2((b.nom || 0.5) + 1) * 4)); const { fill, bdr, flag } = getColor(b, colorMode); const isSplit = fill && typeof fill === 'string' && fill.includes('gradient'); const scShape = b._scIdx != null ? b._scIdx % 4 : -1; const shapeClass = scShape === 1 ? "rounded-sm" : scShape === 2 ? "" : scShape === 3 ? "" : "rounded-full"; const shapeTransform = scShape === 2 ? 'translate(-50%, 50%) rotate(45deg)' : 'translate(-50%, 50%)'; const shapeBorder = scShape === 3 ? 'none' : undefined; return (
          scShape === 3 ? (
            <svg key={b.id} className={"absolute cursor-pointer transition-all duration-150 hover:scale-125 hover:z-20 " + (activeTipId === b.id ? "z-30 scale-110" : "")} style={{ left: p.x + '%', bottom: p.y + '%', width: sz + 'px', height: sz + 'px', transform: 'translate(-50%, 50%)', overflow: 'visible' }} onClick={() => setActiveTipId(prev => prev === b.id ? null : b.id)} onMouseEnter={() => setActiveTipId(b.id)} onMouseLeave={() => setActiveTipId(prev => prev === b.id ? null : prev)}>
              <polygon points={sz/2+",0 "+sz+","+sz+" 0,"+sz} fill={isSplit ? '#78716c40' : (fill || 'rgba(226,0,26,0.3)')} stroke={isSplit ? '#78716c' : (bdr || '#E2001A')} strokeWidth="2" />
            </svg>
          ) : (
            <div key={b.id} className={"absolute border-2 cursor-pointer transition-all duration-150 hover:scale-125 hover:z-20 " + shapeClass + " " + (activeTipId === b.id ? "z-30 ring-2 ring-spark-400 ring-offset-1 scale-110" : "")} style={{ left: p.x + '%', bottom: p.y + '%', width: sz + 'px', height: sz + 'px', transform: shapeTransform, ...(isSplit ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.45) 50%, rgba(52,211,153,0.45) 50%)', borderColor: '#78716c' } : { backgroundColor: fill || 'rgba(226,0,26,0.3)', borderColor: bdr || '#E2001A' }) }} onClick={() => setActiveTipId(prev => prev === b.id ? null : b.id)} onMouseEnter={() => setActiveTipId(b.id)} onMouseLeave={() => setActiveTipId(prev => prev === b.id ? null : prev)}>{flag && <span className="absolute inset-0 flex items-center justify-center text-[10px] leading-none opacity-80">{flag}</span>}</div>
          )); })}
        {selBox && <div className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-40 rounded" style={{ left: selBox.left + '%', top: selBox.top + '%', width: selBox.width + '%', height: selBox.height + '%' }} />}
        {scatterAxes.zoomed && (
          <div className="absolute top-3 left-3 z-50">
            <button onClick={() => setZoomRange(null)} className="bg-white/90 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg px-2 py-1 hover:bg-slate-100 shadow-sm transition-all flex items-center gap-1">
              ↩ Zoom Reset
            </button>
          </div>
        )}
        {!scatterAxes.zoomed && !SCATTER_METRICS[scatterX]?.cat && !SCATTER_METRICS[scatterY]?.cat && (
          <div className="absolute top-3 right-3 z-50 pointer-events-none">
            <span className="bg-white/70 text-slate-400 text-[9px] font-bold rounded px-1.5 py-0.5">Bereich ziehen zum Zoomen</span>
          </div>
        )}
      </div>
      <div className="absolute pointer-events-none z-10" style={{left:"-52px",top:"50%",transform:"rotate(-90deg)",whiteSpace:"nowrap",transformOrigin:"center center"}}><span className="text-[10px] text-slate-800 font-bold">{SCATTER_METRICS[scatterY]?.label}</span></div>
      <div className="absolute pointer-events-none z-10" style={{bottom:"-20px",left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap"}}><span className="text-[10px] text-slate-800 font-bold">{SCATTER_METRICS[scatterX]?.label}</span></div>
      {activeTipId && (() => { const b = displayActive.find(b => b.id === activeTipId) || displayBackground.find(b => b.id === activeTipId); if (!b) return null; const p = calcPos(b); return (
          <div className="absolute p-3 rounded-xl z-50 whitespace-nowrap shadow-xl bg-white border border-slate-200 pointer-events-none" style={{ left: p.x + '%', ...(p.y > 40 ? { bottom: (p.y + 4) + '%' } : { top: (100 - p.y + 4) + '%' }), transform: 'translateX(-50%)' }}>
            <div className="font-black text-slate-800 text-xs border-b border-slate-100 pb-1 mb-1">{b.e}</div>
            <div className="text-slate-500 text-[10px] tabular-nums">{b.isin} | {fmtVol(b.nom)}</div>
            <div className="flex gap-2 mt-2 flex-wrap"><div className="bg-slate-50 px-2 py-0.5 rounded text-slate-700 tabular-nums text-[10px] font-bold">{fx(b.y, 2)}% YTM</div><div className="bg-spark-50 px-2 py-0.5 rounded text-spark-700 tabular-nums text-[10px] font-bold">{fx(b.s, 1)} bp</div><div className="bg-slate-50 px-2 py-0.5 rounded text-slate-600 tabular-nums text-[10px] font-bold">Duration {fx(b.md, 2)}</div><div className={"px-2 py-0.5 rounded tabular-nums text-[10px] font-bold " + rankBadgeCls(b.rank || "SP")}>{b.rank || "SP"}</div>{b.locked !== undefined && (b.locked === true && b.inUniverse ? <div className="inline-flex items-center gap-0"><span className="px-1.5 py-0.5 rounded-l text-[9px] font-black bg-amber-100 text-amber-700">Bestand</span><span className="px-1.5 py-0.5 rounded-r text-[9px] font-black bg-emerald-100 text-emerald-700">+Neu</span></div> : <div className={"px-2 py-0.5 rounded text-[10px] font-bold " + (b.locked === true ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{b.locked === true ? "Bestand" : "Neu"}</div>)}</div>
          </div>); })()}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Y:</span><select value={scatterY} onChange={e => { setScatterY(e.target.value); resetZoom(); }} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-spark-500 shadow-sm cursor-pointer hover:border-spark-300">{Object.entries(SCATTER_METRICS).map(([k, v]) => <option key={"y-"+k} value={k}>{v.label}</option>)}</select></div>
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">X:</span><select value={scatterX} onChange={e => { setScatterX(e.target.value); resetZoom(); }} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-spark-500 shadow-sm cursor-pointer hover:border-spark-300">{Object.entries(SCATTER_METRICS).map(([k, v]) => <option key={"x-"+k} value={k}>{v.label}</option>)}</select></div>
        <select value={colorMode} onChange={e => { setColorMode(e.target.value); setHiddenLegend(new Set()); }} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none shadow-sm cursor-pointer">
          {Object.entries(COLOR_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {getLegend(colorMode).filter(l => presentLegendKeys.has(l.label)).map((l, i) => { const isHidden = hiddenLegend.has(l.label); return (
          <div key={i} className={"flex items-center gap-1.5 cursor-pointer select-none transition-opacity " + (isHidden ? "opacity-25" : "opacity-100")} onClick={() => setHiddenLegend(prev => { const next = new Set(prev); if (next.has(l.label)) next.delete(l.label); else next.add(l.label); return next; })} title={isHidden ? l.label + " einblenden" : l.label + " ausblenden"}>
            {l.split ? <span className="w-2.5 h-2.5 rounded-full border border-stone-400" style={{ background: "linear-gradient(135deg, rgb(245,158,11) 50%, rgb(52,211,153) 50%)" }}></span>
            : l.flag ? <span className="text-sm leading-none">{l.flag}</span>
            : l.customColor ? (l.scShape === 3 ? <svg width="11" height="11" viewBox="0 0 11 11"><polygon points="5.5,0 11,11 0,11" fill={l.customColor + "60"} stroke={l.customColor} strokeWidth="1.5" /></svg> : <span className={"w-2.5 h-2.5 border-2 " + (l.scShape === 1 ? "rounded-sm" : l.scShape === 2 ? "rotate-45" : "rounded-full")} style={{ backgroundColor: l.customColor + "60", borderColor: l.customColor }}></span>)
            : l.custom ? <span className="w-2.5 h-2.5 rounded-full border-2" style={{ backgroundColor: l.custom[0], borderColor: l.custom[1] }}></span>
            : <span className={"w-2.5 h-2.5 rounded-full border " + l.fill + " " + l.bdr}></span>}
            <span className="text-[10px] font-bold text-slate-500">{l.label}</span>
          </div>
        ); })}
        {!SCATTER_METRICS[scatterX]?.cat && !SCATTER_METRICS[scatterY]?.cat && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showTrendline} onChange={e => setShowTrendline(e.target.checked)} className="rounded text-spark-500 focus:ring-spark-500 w-3.5 h-3.5 border-slate-300" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Trendlinie</span>
            </label>
            {showTrendline && (
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                {(() => {
                  const hasScGroups = filteredActive.some(b => b._scName);
                  if (hasScGroups) {
                    const groups = new Map();
                    filteredActive.forEach(b => { const k = b._scName || "Portfolio"; if (!groups.has(k)) groups.set(k, b._scColor || '#E2001A'); });
                    return <>
                      <div className="flex items-center gap-1.5 text-slate-500" title="Universum"><span className="w-4 border-t border-slate-400" style={{borderStyle:'dashed'}}></span> Universum</div>
                      {[...groups.entries()].map(([name, color]) => (
                        <div key={name} className={"flex items-center gap-1.5 cursor-pointer select-none " + (hiddenTrends.has(name) ? "opacity-30" : "")} style={{color}} title={name + " (klicken zum ein-/ausblenden)"} onClick={() => setHiddenTrends(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; })}><span className="w-4 border-t-2" style={{borderColor: color}}></span> {name.length > 12 ? name.slice(0,12) + "…" : name}</div>
                      ))}
                    </>;
                  }
                  return <>
                    {Object.entries(TREND_SEGMENTS).map(([k, v]) => (
                      <button key={k} onClick={() => { toggleTrendSeg(k); setHiddenTrends(new Set()); }}
                        className={"px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer " +
                          (trendSegments.includes(k) ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600")}>
                        {v.label}
                      </button>
                    ))}
                    {trendSegments.includes("gesamt") && (
                      isMarketMode ? <>
                        <div className="flex items-center gap-1.5 text-slate-500" title="Gesamtes Universum"><span className="w-4 border-t-2 border-slate-400 border-dashed"></span> Gesamt</div>
                        {(allBonds || activeBonds).length !== filteredActive.length && (
                          <div className="flex items-center gap-1.5 text-spark-600" title="Gefiltertes Universum"><span className="w-4 border-t-2 border-spark-500"></span> Gefiltert</div>
                        )}
                      </> : <>
                        <div className="flex items-center gap-1.5 text-slate-500" title="Markt Ø"><span className="w-4 border-t-2 border-slate-400 border-dashed"></span> Markt</div>
                        <div className="flex items-center gap-1.5 text-spark-600" title="Portfolio"><span className="w-4 border-t-2 border-spark-500"></span> PF</div>
                      </>
                    )}
                    {(() => {
                      const srcBonds = isMarketMode ? filteredActive : [...filteredBackground, ...filteredActive];
                      const defaultColors = ["#E2001A", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#0d9488", "#ef4444", "#64748b"];
                      const items = [];
                      trendSegments.filter(s => s !== "gesamt" && TREND_SEGMENTS[s]).forEach(segKey => {
                        const seg = TREND_SEGMENTS[segKey];
                        const groups = new Map();
                        srcBonds.forEach(b => { const k = typeof seg.group === 'function' ? seg.group(b) : "Gesamt"; if (!groups.has(k)) groups.set(k, 0); groups.set(k, groups.get(k) + 1); });
                        if (seg.includeAll) {
                          const allCol = seg.colors?.["Gesamt-Universum"] || "#64748b";
                          items.push(<div key={segKey+"__all__"} className={"flex items-center gap-1.5 cursor-pointer select-none " + (hiddenTrends.has("Gesamt-Universum") ? "opacity-30" : "")} style={{color: allCol}} title={"Gesamt-Universum (" + srcBonds.length + ")"} onClick={() => setHiddenTrends(prev => { const n = new Set(prev); n.has("Gesamt-Universum") ? n.delete("Gesamt-Universum") : n.add("Gesamt-Universum"); return n; })}><span className="w-4 border-t-2" style={{borderColor: allCol, borderStyle: "dashed"}}></span> Gesamt</div>);
                        }
                        [...groups.keys()].forEach((name, i) => {
                          const col = seg.colors?.[name] || defaultColors[i % defaultColors.length];
                          const cnt = groups.get(name);
                          items.push(<div key={segKey+"_"+name} className={"flex items-center gap-1.5 cursor-pointer select-none " + (hiddenTrends.has(name) ? "opacity-30" : "")} style={{color: col}} title={name + " (" + cnt + ")"} onClick={() => setHiddenTrends(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; })}><span className="w-4 border-t-2" style={{borderColor: col}}></span> {name}</div>);
                        });
                      });
                      return items;
                    })()}
                  </>;
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScatterMatrix;
