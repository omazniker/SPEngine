// SPEngine v5 — App.jsx
// Root component: all global state, effects, and tab routing.
// Tab content components are stub-imported and will be progressively filled.

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';

// ── Storage & persistence ──
import {
  lsSave,
  lsLoad,
  lsRemove,
  lsClearAll,
  lsGetSize,
  useDebouncedSave,
  sessionGetName,
  sessionSetName,
} from './utils/storage.js';

// ── Layout components ──
import { BottomNav } from './components/layout/index.js';
import {
  BondDetailModal,
  IssuerDetailModal,
  PresetEditModal,
  ScenarioNameModal,
} from './components/modals/index.js';

// ── Solver ──
import {
  getSolver,
  getHighsSolver,
  optimizeLP,
  optimizeMIP_v2,
  solveLexicographic,
  runAutoOptimize,
  stats,
  filterEligible,
  catEnabled,
  catMinMax,
  resolveAllowedCountries,
} from './solver/index.js';

// ── Data / constants ──
import {
  OBJ,
  DEFAULT_PRESETS,
  defaultRatingLimits,
  defaultRankLimits,
  defaultStrukturLimits,
  defaultKuponLimits,
  defaultSektorLimits,
  defaultMatBucketLimits,
  RANK_CATS,
  STRUKTUR_CATS,
  KUPON_CATS,
  SEKTOR_CATS,
  REGION_DEFS,
  REGION_KEYS,
} from './data/index.js';
// -- Tab content components --
import {
  OptimiererTab,
  MarktAnalyseTab,
  PortfolioReviewTab,
  DatenImportTab,
  SzenarienVergleichTab,
  AnleitungTab,
  ReportingTab,
  DeepDiveTab,
  ExportCenterTab,
  DZResearchTab,
  DatenTab,
} from './components/tabs/index.js';

// ─────────────────────────────────────────────────────────────
// Tab map — id matches the numeric tab IDs from the source
// ─────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 3,  label: "Daten-Import",       icon: "📥", core: true },
  { id: 1,  label: "Markt-Analyse",      icon: "🌍" },
  { id: 7,  label: "Deep-Dive",          icon: "🔬" },
  { id: 0,  label: "Optimierer",         icon: "⚙️" },
  { id: 4,  label: "Szenarien-Vergleich",icon: "📊" },
  { id: 2,  label: "Portfolio-Review",   icon: "📋" },
  { id: 6,  label: "Reporting",          icon: "📈" },
  { id: 8,  label: "Export-Center",      icon: "📦" },
  { id: 9,  label: "DZ Research",        icon: "🏦" },
  { id: 11, label: "Daten",              icon: "🗄️" },
  { id: 5,  label: "Anleitung",          icon: "📖" },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Migrate old numeric-value limit objects to the {enabled, min, max} shape. */
function migrateLimits(limits, defaults) {
  if (!limits || typeof limits !== 'object') return JSON.parse(JSON.stringify(defaults));
  const fv = Object.values(limits)[0];
  if (fv && typeof fv === 'object' && 'enabled' in fv) {
    const r = {};
    for (const k of Object.keys(defaults)) {
      r[k] = limits[k] ? { ...limits[k] } : { ...defaults[k] };
    }
    return r;
  }
  const r = {};
  for (const [k, v] of Object.entries(limits)) {
    if (typeof v === 'number') {
      if (v === 0)        r[k] = { enabled: false, min: '', max: '' };
      else if (v >= 100)  r[k] = { enabled: true,  min: '', max: '' };
      else                r[k] = { enabled: true,  min: '', max: v  };
    } else {
      r[k] = defaults[k] ? { ...defaults[k] } : { enabled: true, min: '', max: '' };
    }
  }
  for (const k of Object.keys(defaults)) {
    if (!(k in r)) r[k] = { ...defaults[k] };
  }
  return r;
}

/** Sanitise solver config: enforce min <= max, lot-alignment etc. */
function sanitizeCfg(inputCfg) {
  const clean = { ...inputCfg };
  const maxB = parseFloat(clean.maxBondNom) || 0;
  let minB = Math.max(0, parseFloat(clean.minBondNom) || 0);
  const lot = parseFloat(clean.minLot) || 0;
  if (minB > maxB && maxB > 0) { minB = maxB; }
  if (lot > 0 && minB > 0) {
    const aligned = Math.ceil(minB / lot) * lot;
    if (aligned !== minB) { minB = aligned; }
    if (minB > maxB && maxB > 0) { minB = Math.floor(maxB / lot) * lot; }
  }
  clean.minBondNom = minB;
  let minI = Math.max(0, parseFloat(clean.minIssNom) || 0);
  if (lot > 0 && minI > 0) { minI = Math.ceil(minI / lot) * lot; }
  clean.minIssNom = minI;
  return clean;
}

/** useSectionLayout — collapsible / pinnable section state for a tab key. */
function useSectionLayout(tabKey, defaultSections) {
  const storageKey = 'layout_' + tabKey;
  const [sections, setSections] = useState(() => {
    const saved = lsLoad(storageKey, null);
    if (saved && Array.isArray(saved)) {
      const validIds = new Set(defaultSections.map(d => d.id));
      const pruned = saved.filter(s => validIds.has(s.id));
      const known = new Set(pruned.map(s => s.id));
      defaultSections.forEach(d => {
        if (!known.has(d.id)) pruned.push({ id: d.id, collapsed: false, pinned: false });
      });
      return pruned;
    }
    return defaultSections.map(d => ({ id: d.id, collapsed: false, pinned: false }));
  });
  useEffect(() => { lsSave(storageKey, sections); }, [sections, storageKey]);
  const toggle = useCallback(
    (id) => setSections(prev => prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s)),
    []
  );
  const pin = useCallback(
    (id) => setSections(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s)),
    []
  );
  const move = useCallback((id, dir) => setSections(prev => {
    const arr = [...prev];
    const idx = arr.findIndex(s => s.id === id);
    const ti = idx + dir;
    if (idx < 0 || ti < 0 || ti >= arr.length) return prev;
    [arr[idx], arr[ti]] = [arr[ti], arr[idx]];
    return arr;
  }), []);
  return { sections, toggle, pin, move };
}

// ─────────────────────────────────────────────────────────────
// MainApp — holds all application state
// ─────────────────────────────────────────────────────────────
function MainApp() {

  // ═══════════════════════════════════════════════════════
  // SECTION 1 — TAB & VISIBILITY SETTINGS
  // ═══════════════════════════════════════════════════════

  const [tab, setTab] = useState(() => lsLoad('tab', 0));

  const defaultHiddenTabs = [];
  const [hiddenTabs, setHiddenTabs] = useState(() => lsLoad('hiddenTabs', defaultHiddenTabs));

  const [tabOrder, setTabOrder] = useState(() => {
    const saved = lsLoad('tabOrder', null);
    if (!saved) return ALL_TABS.map(t => t.id);
    const known = new Set(saved);
    const merged = [...saved];
    ALL_TABS.forEach(t => { if (!known.has(t.id)) merged.push(t.id); });
    return merged;
  });

  useEffect(() => { lsSave('hiddenTabs', hiddenTabs); }, [hiddenTabs]);
  useEffect(() => { lsSave('tabOrder', tabOrder);    }, [tabOrder]);

  const visibleTabs = tabOrder
    .map(id => ALL_TABS.find(t => t.id === id))
    .filter(t => t && !hiddenTabs.includes(t.id));

  const toggleTabVisibility = (id) =>
    setHiddenTabs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const moveTab = (from, to) => {
    setTabOrder(prev => {
      const n = [...prev];
      const [item] = n.splice(from, 1);
      n.splice(to, 0, item);
      return n;
    });
  };

  // ═══════════════════════════════════════════════════════
  // SECTION 2 — UI PREFERENCES & DISPLAY SETTINGS
  // ═══════════════════════════════════════════════════════

  const [showStats,       setShowStats]       = useState(() => lsLoad('showStats',       true));
  const [showScatter,     setShowScatter]     = useState(() => lsLoad('showScatter',     true));
  const [showBuckets,     setShowBuckets]     = useState(() => lsLoad('showBuckets',     true));
  const [showSpreadCurve, setShowSpreadCurve] = useState(() => lsLoad('showSpreadCurve', true));
  const [showFrontier,    setShowFrontier]    = useState(() => lsLoad('showFrontier',    true));
  const [tablePageSize,   setTablePageSize]   = useState(() => lsLoad('tablePageSize',   50));
  const [decimalPlaces,   setDecimalPlaces]   = useState(() => lsLoad('decimalPlaces',   2));
  const [defaultSort,     setDefaultSort]     = useState(() => lsLoad('defaultSort',     'spread'));
  const [chartColorScheme,setChartColorScheme]= useState(() => lsLoad('chartColorScheme','default'));
  const [exportFormat,    setExportFormat]    = useState(() => lsLoad('exportFormat',    'xlsx'));
  const [showDelta,       setShowDelta]       = useState(() => lsLoad('showDelta',       true));
  const [compactMode,     setCompactMode]     = useState(() => lsLoad('compactMode',     false));
  const [showSettings,    setShowSettings]    = useState(true);
  const [showBenchmark,   setShowBenchmark]   = useState(true);

  useEffect(() => { lsSave('showStats',        showStats);       }, [showStats]);
  useEffect(() => { lsSave('showScatter',      showScatter);     }, [showScatter]);
  useEffect(() => { lsSave('showBuckets',      showBuckets);     }, [showBuckets]);
  useEffect(() => { lsSave('showSpreadCurve',  showSpreadCurve); }, [showSpreadCurve]);
  useEffect(() => { lsSave('showFrontier',     showFrontier);    }, [showFrontier]);
  useEffect(() => { lsSave('tablePageSize',    tablePageSize);   }, [tablePageSize]);
  useEffect(() => { lsSave('decimalPlaces',    decimalPlaces);   }, [decimalPlaces]);
  useEffect(() => { lsSave('defaultSort',      defaultSort);     }, [defaultSort]);
  useEffect(() => { lsSave('chartColorScheme', chartColorScheme);}, [chartColorScheme]);
  useEffect(() => { lsSave('exportFormat',     exportFormat);    }, [exportFormat]);
  useEffect(() => { lsSave('showDelta',        showDelta);       }, [showDelta]);
  useEffect(() => { lsSave('compactMode',      compactMode);     }, [compactMode]);

  // Hidden sections (collapsible blocks)
  const [hiddenSections, setHiddenSections] = useState(() => lsLoad('hiddenSections', []));
  useEffect(() => { lsSave('hiddenSections', hiddenSections); }, [hiddenSections]);
  const isSectionHidden   = (id) => hiddenSections.includes(id);
  const toggleSectionHidden = (id) =>
    setHiddenSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Start tab preference
  const [startTab, setStartTab] = useState(() => lsLoad('startTab', 'last'));
  useEffect(() => { lsSave('startTab', startTab); }, [startTab]);

  // Scatter-chart axis defaults
  const [defaultScatterX,  setDefaultScatterX]  = useState(() => lsLoad('defaultScatterX',  'md'));
  const [defaultScatterY,  setDefaultScatterY]  = useState(() => lsLoad('defaultScatterY',  's'));
  const [defaultColorMode, setDefaultColorMode] = useState(() => lsLoad('defaultColorMode', 'auto'));
  const [defaultTrendline, setDefaultTrendline] = useState(() => lsLoad('defaultTrendline', true));
  useEffect(() => { lsSave('defaultScatterX',  defaultScatterX);  }, [defaultScatterX]);
  useEffect(() => { lsSave('defaultScatterY',  defaultScatterY);  }, [defaultScatterY]);
  useEffect(() => { lsSave('defaultColorMode', defaultColorMode); }, [defaultColorMode]);
  useEffect(() => { lsSave('defaultTrendline', defaultTrendline); }, [defaultTrendline]);

  // Localisation
  const [numberLocale, setNumberLocale] = useState(() => lsLoad('numberLocale', 'de-DE'));
  const [dateFormat,   setDateFormat]   = useState(() => lsLoad('dateFormat',   'DD.MM.YYYY'));
  useEffect(() => { lsSave('numberLocale', numberLocale); }, [numberLocale]);
  useEffect(() => { lsSave('dateFormat',   dateFormat);   }, [dateFormat]);

  // Anlagerichtlinien default
  const [defaultRichtlinie, setDefaultRichtlinie] = useState(() => lsLoad('defaultRichtlinie', 'none'));
  useEffect(() => { lsSave('defaultRichtlinie', defaultRichtlinie); }, [defaultRichtlinie]);

  // Default universe profile
  const [defaultProfileId, setDefaultProfileId] = useState(() => lsLoad('defaultProfileId', ''));
  useEffect(() => { lsSave('defaultProfileId', defaultProfileId); }, [defaultProfileId]);

  // Performance & debug
  const [debugMode,           setDebugMode]           = useState(() => lsLoad('debugMode',           false));
  const [solverTimeout,       setSolverTimeout]       = useState(() => lsLoad('solverTimeout',       30000));
  const [maxAutoOptScenarios, setMaxAutoOptScenarios] = useState(() => lsLoad('maxAutoOptScenarios', 3500));
  useEffect(() => { lsSave('debugMode',           debugMode);           }, [debugMode]);
  useEffect(() => { lsSave('solverTimeout',       solverTimeout);       }, [solverTimeout]);
  useEffect(() => { lsSave('maxAutoOptScenarios', maxAutoOptScenarios); }, [maxAutoOptScenarios]);

  // ═══════════════════════════════════════════════════════
  // SECTION 3 — ZOOM
  // ═══════════════════════════════════════════════════════

  const [zoomLevel, setZoomLevel] = useState(() => lsLoad('zoom', 100));
  const zoomScale = zoomLevel / 100;
  const zoomIn    = useCallback(() => setZoomLevel(z => Math.min(z + 10, 150)), []);
  const zoomOut   = useCallback(() => setZoomLevel(z => Math.max(z - 10,  60)), []);
  const zoomReset = useCallback(() => setZoomLevel(100), []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoomIn(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); zoomReset(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, zoomReset]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn(); else zoomOut();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);

  // ═══════════════════════════════════════════════════════
  // SECTION 4 — DATASETS & UNIVERSE
  // ═══════════════════════════════════════════════════════

  const [datasets, setDatasets] = useState(() => {
    const saved = lsLoad('datasets', null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    // No bundled default data B[] here — import from data module when available
    // TODO: replace [] with processBonds(B) once masterliste is wired
    return [{ id: 'default', name: 'Standard-Datensatz', data: [], date: new Date().toISOString() }];
  });

  const [activeDatasetId, setActiveDatasetId] = useState(() => lsLoad('activeDatasetId', 'default'));

  // universe is the active dataset's bond list
  const universe = useMemo(
    () => datasets.find(d => d.id === activeDatasetId)?.data || [],
    [datasets, activeDatasetId]
  );

  const [newDatasetName, setNewDatasetName] = useState('');

  // Debounced dataset persistence (strip computed fields to keep storage small)
  const datasetsForSave = useMemo(() =>
    datasets.map(d => ({
      ...d,
      data: d.data.map(b => {
        const { yRw, sRw, bkt, ln, lo, ...core } = b;
        return core;
      }),
    })),
    [datasets]
  );
  useDebouncedSave('datasets',       datasetsForSave,  1500);
  useDebouncedSave('activeDatasetId', activeDatasetId, 300);

  // ═══════════════════════════════════════════════════════
  // SECTION 5 — PORTFOLIO & RESULT
  // ═══════════════════════════════════════════════════════

  const [pf, setPf] = useState(() => {
    const saved = lsLoad('lastPortfolio', []);
    return saved.length > 0 ? saved : [];
  });

  const [result,        setResult]        = useState(() => {
    const saved = lsLoad('lastResult', null);
    return saved && saved.length > 0 ? saved : null;
  });
  const [altResult,     setAltResult]     = useState(null);
  const [solverResults, setSolverResults] = useState([]);

  // Persist portfolio & result with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pf && pf.length > 0) {
        const slim = pf.map(b => { const { yRw, sRw, bkt, ln, lo, ...core } = b; return core; });
        lsSave('lastPortfolio', slim);
      } else {
        lsRemove('lastPortfolio');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [pf]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (result && result.length > 0 && !result.isFallback) {
        const slim = result.map(b => { const { yRw, sRw, bkt, ln, lo, ...core } = b; return core; });
        lsSave('lastResult', slim);
      } else {
        lsRemove('lastResult');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [result]);

  const rS  = useMemo(() => result    ? stats(result)    : null, [result]);
  const altS = useMemo(() => altResult ? stats(altResult) : null, [altResult]);

  const solverResultsWithStats = useMemo(
    () => solverResults.map(sr => ({ ...sr, s: sr.s || stats(sr.r) })),
    [solverResults]
  );

  // ═══════════════════════════════════════════════════════
  // SECTION 6 — SOLVER STATE
  // ═══════════════════════════════════════════════════════

  // One-time migration: set MIP as default solver (v2)
  if (!localStorage.getItem('_solverMigV2')) {
    localStorage.removeItem('cfg_runGreedy');
    localStorage.removeItem('cfg_runLP');
    localStorage.removeItem('cfg_runMIP');
    localStorage.setItem('_solverMigV2', '1');
  }

  const [runGreedy, setRunGreedy] = useState(() => lsLoad('cfg_runGreedy', 'false') === 'true');
  const [runLP,     setRunLP]     = useState(() => lsLoad('cfg_runLP',     'false') === 'true');
  const [runMIP,    setRunMIP]    = useState(() => lsLoad('cfg_runMIP',    'true')  === 'true');

  const solverMode = runMIP ? (runLP ? 'all' : 'mip') : (runLP ? 'lp' : 'greedy');

  const [solverRunning, setSolverRunning] = useState(false);
  const [solverPhase,   setSolverPhase]   = useState('');

  // Solver availability tracking
  const [solverAvail, setSolverAvail] = useState({ lp: 'pending', mip: 'pending' });
  const solverAvailRef = useRef(solverAvail);
  solverAvailRef.current = solverAvail;

  // Proactively load both solvers on mount
  useEffect(() => {
    getSolver()
      .then(() => setSolverAvail(prev => ({ ...prev, lp: 'ready' })))
      .catch(e => {
        console.warn('[Solver-Check] LP nicht verfügbar:', e.message);
        setSolverAvail(prev => ({ ...prev, lp: 'error' }));
      });
    getHighsSolver()
      .then(() => setSolverAvail(prev => ({ ...prev, mip: 'ready' })))
      .catch(e => {
        console.warn('[Solver-Check] MIP nicht verfügbar:', e.message);
        setSolverAvail(prev => ({ ...prev, mip: 'error', mipErr: e.message }));
      });
  }, []);

  const toggleSolver = (which) => {
    const g = which === 'greedy' ? !runGreedy : runGreedy;
    const l = which === 'lp'     ? !runLP     : runLP;
    const m = which === 'mip'    ? !runMIP    : runMIP;
    if (!g && !l && !m) return; // at least one must remain active
    if (which === 'greedy') setRunGreedy(v => !v);
    if (which === 'lp') {
      setRunLP(v => !v);
      if (!runLP && solverAvail.lp === 'error') {
        getSolver()
          .then(() => setSolverAvail(prev => ({ ...prev, lp: 'ready' })))
          .catch(() => {});
        setSolverAvail(prev => ({ ...prev, lp: 'pending' }));
      }
    }
    if (which === 'mip') {
      setRunMIP(v => !v);
      if (!runMIP && solverAvail.mip === 'error') {
        getHighsSolver()
          .then(() => setSolverAvail(prev => ({ ...prev, mip: 'ready' })))
          .catch(() => setSolverAvail(prev => ({ ...prev, mip: 'error' })));
        setSolverAvail(prev => ({ ...prev, mip: 'pending' }));
      }
    }
  };

  const [primarySolver,    setPrimarySolver]    = useState('greedy');
  const primarySolverRef = useRef('greedy');

  const switchSolverResult = useCallback((key) => {
    const sr = solverResults.find(s => s.key === key);
    if (!sr) return;
    setPrimarySolver(key);
    primarySolverRef.current = key;
    setResult(sr.r);
  }, [solverResults]);

  useDebouncedSave('cfg_runGreedy', String(runGreedy), 300);
  useDebouncedSave('cfg_runLP',     String(runLP),     300);
  useDebouncedSave('cfg_runMIP',    String(runMIP),    300);

  // Multi-strategy mode
  const [multiStrategy,       setMultiStrategy]       = useState(false);
  const [selectedStrategies,  setSelectedStrategies]  = useState([]);

  // ═══════════════════════════════════════════════════════
  // SECTION 7 — OPTIMISER OBJECTIVE & LEXICOGRAPHIC CHAIN
  // ═══════════════════════════════════════════════════════

  const [obj, setObj] = useState(() => lsLoad('cfg_obj', 'yield'));

  const DEFAULT_LEX_CHAIN = [
    { obj: 'yield',      slack: 0.05 },
    { obj: 'minDuration',slack: 0.10 },
    { obj: 'minRating',  slack: 0.10 },
    { obj: 'maxEsg',     slack: 0    },
  ];
  const [lexChain,    setLexChain]    = useState(() => lsLoad('cfg_lexChain', DEFAULT_LEX_CHAIN));
  const [lexPhaseLog, setLexPhaseLog] = useState(null);

  useDebouncedSave('cfg_obj',      obj,      300);
  useDebouncedSave('cfg_lexChain', lexChain, 500);

  // ═══════════════════════════════════════════════════════
  // SECTION 8 — AUTO-OPTIMIZE STATE
  // ═══════════════════════════════════════════════════════

  const [autoOptResult,        setAutoOptResult]        = useState(null);
  const [autoOptSelected,      setAutoOptSelected]      = useState('p0');
  const [frontierLayout,       setFrontierLayout]       = useState('grid');
  const [frontierDetailModal,  setFrontierDetailModal]  = useState(null);
  const [autoOptRunning,       setAutoOptRunning]       = useState(false);

  // TOPSIS ranking weights
  const DEFAULT_RANK_WEIGHTS = { yield: 40, esg: 20, rating: 20, duration: 20, su: 0, snp: 0 };
  const [rankWeights, setRankWeights] = useState(() => lsLoad('cfg_rankWeights', DEFAULT_RANK_WEIGHTS));
  useDebouncedSave('cfg_rankWeights', rankWeights, 500);

  const computeRanking = useCallback((aoResult, weights) => {
    if (!aoResult || !aoResult.p0) return [];
    const all = [
      { id: 'p0', stats: aoResult.p0.stats },
      ...aoResult.alternatives.map(a => ({ id: a.id, stats: a.stats })),
    ];
    if (all.length < 2) return all.map((a, i) => ({ ...a, score: 100, rank: i + 1 }));
    const dims = [
      { key: 'yield',    extract: s => s.wY  || 0,            dir:  1 },
      { key: 'esg',      extract: s => (s.gP  || 0) * 100,    dir:  1 },
      { key: 'rating',   extract: s => s.wLn || 99,           dir: -1 },
      { key: 'duration', extract: s => s.wD  || 99,           dir: -1 },
      { key: 'su',       extract: s => (s.suP  || 0) * 100,   dir: -1 },
      { key: 'snp',      extract: s => (s.snpP || 0) * 100,   dir: -1 },
    ].filter(d => (weights[d.key] || 0) > 0);
    if (dims.length === 0) return all.map((a, i) => ({ ...a, score: 50, rank: i + 1 }));
    const matrix  = all.map(a => dims.map(d => d.extract(a.stats)));
    const norms   = dims.map((_, j) => { const col = matrix.map(r => r[j]); return Math.sqrt(col.reduce((s, v) => s + v * v, 0)) || 1; });
    const normed  = matrix.map(row => row.map((v, j) => v / norms[j]));
    const wSum    = dims.reduce((s, d) => s + (weights[d.key] || 0), 0) || 1;
    const wNorm   = dims.map(d => (weights[d.key] || 0) / wSum);
    const weighted = normed.map(row => row.map((v, j) => v * wNorm[j]));
    const ideal    = dims.map((d, j) => { const col = weighted.map(r => r[j]); return d.dir > 0 ? Math.max(...col) : Math.min(...col); });
    const antiIdeal = dims.map((d, j) => { const col = weighted.map(r => r[j]); return d.dir > 0 ? Math.min(...col) : Math.max(...col); });
    const scores = weighted.map((row, i) => {
      const dPlus  = Math.sqrt(row.reduce((s, v, j) => s + (v - ideal[j])    ** 2, 0));
      const dMinus = Math.sqrt(row.reduce((s, v, j) => s + (v - antiIdeal[j])** 2, 0));
      const score  = (dPlus + dMinus) > 0 ? (dMinus / (dPlus + dMinus)) * 100 : 50;
      return { ...all[i], score: Math.round(score * 10) / 10, dPlus, dMinus };
    });
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => { s.rank = i + 1; });
    return scores;
  }, []);

  const ranking = useMemo(
    () => computeRanking(autoOptResult, rankWeights),
    [autoOptResult, rankWeights, computeRanking]
  );

  // ═══════════════════════════════════════════════════════
  // SECTION 9 — CORE OPTIMISER CONSTRAINTS
  // ═══════════════════════════════════════════════════════

  const [budget,      setBudget]      = useState(() => lsLoad('cfg_budget',      200));
  const [green,       setGreen]       = useState(() => lsLoad('cfg_green',       0));
  const [maxBondNom,  setMaxBondNom]  = useState(() => lsLoad('cfg_maxBondNom',  10));
  const [minBondNom,  setMinBondNom]  = useState(() => lsLoad('cfg_minBondNom',  ''));
  const [maxIssNom,   setMaxIssNom]   = useState(() => lsLoad('cfg_maxIssNom',   10));
  const [minIssNom,   setMinIssNom]   = useState(() => lsLoad('cfg_minIssNom',   ''));
  const [minLot,      setMinLot]      = useState(() => lsLoad('cfg_minLot',      0));
  const [maxCo,       setMaxCo]       = useState(() => lsLoad('cfg_maxCo',       40));
  const [minLQA,      setMinLQA]      = useState(() => lsLoad('cfg_minLQA',      60));
  const [durMin,      setDurMin]      = useState(() => lsLoad('cfg_durMin',      ''));
  const [durMax,      setDurMax]      = useState(() => lsLoad('cfg_durMax',      ''));
  const [matMin,      setMatMin]      = useState(() => lsLoad('cfg_matMin',      ''));
  const [matMax,      setMatMax]      = useState(() => lsLoad('cfg_matMax',      ''));
  const [minRatingLn, setMinRatingLn] = useState(() => lsLoad('cfg_minRtg',      ''));
  const [useBestand,  setUseBestand]  = useState(() => lsLoad('cfg_useBestand',  false));

  useDebouncedSave('cfg_budget',      budget,      500);
  useDebouncedSave('cfg_green',       green,       500);
  useDebouncedSave('cfg_maxBondNom',  maxBondNom,  500);
  useDebouncedSave('cfg_minBondNom',  minBondNom,  500);
  useDebouncedSave('cfg_maxIssNom',   maxIssNom,   500);
  useDebouncedSave('cfg_minIssNom',   minIssNom,   500);
  useDebouncedSave('cfg_minLot',      minLot,      500);
  useDebouncedSave('cfg_maxCo',       maxCo,       500);
  useDebouncedSave('cfg_minLQA',      minLQA,      500);
  useDebouncedSave('cfg_durMin',      durMin,      500);
  useDebouncedSave('cfg_durMax',      durMax,      500);
  useDebouncedSave('cfg_matMin',      matMin,      500);
  useDebouncedSave('cfg_matMax',      matMax,      500);
  useDebouncedSave('cfg_minRtg',      minRatingLn, 300);
  useDebouncedSave('cfg_useBestand',  useBestand,  300);

  // ═══════════════════════════════════════════════════════
  // SECTION 10 — LIMIT OBJECTS (rating, rank, struktur…)
  // ═══════════════════════════════════════════════════════

  const [ratingLimits,    setRatingLimits]    = useState(() => migrateLimits(lsLoad('cfg_ratingLimits',    null), defaultRatingLimits));
  const [rankLimits,      setRankLimits]      = useState(() => migrateLimits(lsLoad('cfg_rankLimits',      null), defaultRankLimits));
  const [strukturLimits,  setStrukturLimits]  = useState(() => migrateLimits(lsLoad('cfg_strukturLimits',  null), defaultStrukturLimits));
  const [kuponLimits,     setKuponLimits]     = useState(() => migrateLimits(lsLoad('cfg_kuponLimits',     null), defaultKuponLimits));
  const [sektorLimits,    setSektorLimits]    = useState(() => migrateLimits(lsLoad('cfg_sektorLimits',    null), defaultSektorLimits));
  const [matBucketLimits, setMatBucketLimits] = useState(() => migrateLimits(lsLoad('cfg_matBucketLimits', null), defaultMatBucketLimits));

  const [matBucketUnit,    setMatBucketUnit]    = useState(() => lsLoad('cfg_matBucketUnit',    'pct'));
  const [ratingLimitUnit,  setRatingLimitUnit]  = useState(() => lsLoad('cfg_ratingLimitUnit',  'pct'));
  const [rankLimitUnit,    setRankLimitUnit]    = useState(() => lsLoad('cfg_rankLimitUnit',    'pct'));
  const [strukturLimitUnit,setStrukturLimitUnit]= useState(() => lsLoad('cfg_strukturLimitUnit','pct'));
  const [kuponLimitUnit,   setKuponLimitUnit]   = useState(() => lsLoad('cfg_kuponLimitUnit',   'pct'));
  const [sektorLimitUnit,  setSektorLimitUnit]  = useState(() => lsLoad('cfg_sektorLimitUnit',  'pct'));
  const [countryLimitUnit, setCountryLimitUnit] = useState(() => lsLoad('cfg_countryLimitUnit', 'pct'));

  useDebouncedSave('cfg_ratingLimits',     ratingLimits,     500);
  useDebouncedSave('cfg_rankLimits',       rankLimits,       500);
  useDebouncedSave('cfg_strukturLimits',   strukturLimits,   500);
  useDebouncedSave('cfg_kuponLimits',      kuponLimits,      500);
  useDebouncedSave('cfg_sektorLimits',     sektorLimits,     500);
  useDebouncedSave('cfg_matBucketLimits',  matBucketLimits,  500);
  useDebouncedSave('cfg_matBucketUnit',    matBucketUnit,    300);
  useDebouncedSave('cfg_ratingLimitUnit',  ratingLimitUnit,  300);
  useDebouncedSave('cfg_rankLimitUnit',    rankLimitUnit,    300);
  useDebouncedSave('cfg_strukturLimitUnit',strukturLimitUnit,300);
  useDebouncedSave('cfg_kuponLimitUnit',   kuponLimitUnit,   300);
  useDebouncedSave('cfg_sektorLimitUnit',  sektorLimitUnit,  300);
  useDebouncedSave('cfg_countryLimitUnit', countryLimitUnit, 300);

  // Portfolio-level duration / maturity limits
  const [pfMinDur, setPfMinDur] = useState(() => lsLoad('cfg_pfMinDur', ''));
  const [pfMaxDur, setPfMaxDur] = useState(() => lsLoad('cfg_pfMaxDur', ''));
  const [pfMinMat, setPfMinMat] = useState(() => lsLoad('cfg_pfMinMat', ''));
  const [pfMaxMat, setPfMaxMat] = useState(() => lsLoad('cfg_pfMaxMat', ''));
  useDebouncedSave('cfg_pfMinDur', pfMinDur, 300);
  useDebouncedSave('cfg_pfMaxDur', pfMaxDur, 300);
  useDebouncedSave('cfg_pfMinMat', pfMinMat, 300);
  useDebouncedSave('cfg_pfMaxMat', pfMaxMat, 300);

  // Bond-filter price / coupon / yield constraints
  const [optMinK,  setOptMinK]  = useState(() => lsLoad('cfg_optMinK',  ''));
  const [optMaxK,  setOptMaxK]  = useState(() => lsLoad('cfg_optMaxK',  ''));
  const [optMinPx, setOptMinPx] = useState(() => lsLoad('cfg_optMinPx', ''));
  const [optMaxPx, setOptMaxPx] = useState(() => lsLoad('cfg_optMaxPx', ''));
  const [optMinY,  setOptMinY]  = useState(() => lsLoad('cfg_optMinY',  ''));
  const [optMaxY,  setOptMaxY]  = useState(() => lsLoad('cfg_optMaxY',  ''));
  const [pfMinK,   setPfMinK]   = useState(() => lsLoad('cfg_pfMinK',   ''));
  const [pfMaxK,   setPfMaxK]   = useState(() => lsLoad('cfg_pfMaxK',   ''));
  const [pfMinPx,  setPfMinPx]  = useState(() => lsLoad('cfg_pfMinPx',  ''));
  const [pfMaxPx,  setPfMaxPx]  = useState(() => lsLoad('cfg_pfMaxPx',  ''));
  const [pfMinY,   setPfMinY]   = useState(() => lsLoad('cfg_pfMinY',   ''));
  const [pfMaxY,   setPfMaxY]   = useState(() => lsLoad('cfg_pfMaxY',   ''));
  useDebouncedSave('cfg_optMinK',  optMinK,  500);
  useDebouncedSave('cfg_optMaxK',  optMaxK,  500);
  useDebouncedSave('cfg_optMinPx', optMinPx, 500);
  useDebouncedSave('cfg_optMaxPx', optMaxPx, 500);
  useDebouncedSave('cfg_optMinY',  optMinY,  500);
  useDebouncedSave('cfg_optMaxY',  optMaxY,  500);
  useDebouncedSave('cfg_pfMinK',   pfMinK,   500);
  useDebouncedSave('cfg_pfMaxK',   pfMaxK,   500);
  useDebouncedSave('cfg_pfMinPx',  pfMinPx,  500);
  useDebouncedSave('cfg_pfMaxPx',  pfMaxPx,  500);
  useDebouncedSave('cfg_pfMinY',   pfMinY,   500);
  useDebouncedSave('cfg_pfMaxY',   pfMaxY,   500);

  // ═══════════════════════════════════════════════════════
  // SECTION 11 — ISSUER / COUNTRY FILTERS
  // ═══════════════════════════════════════════════════════

  const [excludedIssuers,  setExcludedIssuers]  = useState(() => lsLoad('cfg_exclIss',     []));
  const [allowedIssuers,   setAllowedIssuers]   = useState(() => lsLoad('cfg_allowedIss',  []));
  const [excludedCountries,setExcludedCountries]= useState(() => lsLoad('cfg_exclCo',      []));
  const [allowedIssImportText,   setAllowedIssImportText]   = useState('');
  const [allowedIssImportResult, setAllowedIssImportResult] = useState(null);

  useDebouncedSave('cfg_exclIss',    excludedIssuers,  500);
  useDebouncedSave('cfg_allowedIss', allowedIssuers,   500);
  useDebouncedSave('cfg_exclCo',     excludedCountries,500);

  // ═══════════════════════════════════════════════════════
  // SECTION 12 — ANLAGERICHTLINIEN STATE
  // ═══════════════════════════════════════════════════════

  const [allowedRegions,        setAllowedRegions]        = useState(() => lsLoad('cfg_allowedRegions',      []));
  const [allowedCurrencies,     setAllowedCurrencies]     = useState(() => lsLoad('cfg_allowedCurrencies',   []));
  const [isinExceptions,        setIsinExceptions]        = useState(() => lsLoad('cfg_isinExceptions',      []));
  const [blockedIssuers,        setBlockedIssuers]        = useState(() => lsLoad('cfg_blockedIssuers',      []));
  const [activeRichtlinie,      setActiveRichtlinie]      = useState(() => lsLoad('cfg_activeRichtlinie',    ''));
  const [requireDualRating,     setRequireDualRating]     = useState(() => lsLoad('cfg_requireDualRating',   false));
  const [requireRating,         setRequireRating]         = useState(() => lsLoad('cfg_requireRating',       false));
  const [minEmissionRatingLn,   setMinEmissionRatingLn]   = useState(() => lsLoad('cfg_minEmissionRatingLn', ''));

  const allowedCountrySet = useMemo(() => resolveAllowedCountries(allowedRegions), [allowedRegions]);

  useDebouncedSave('cfg_allowedRegions',      allowedRegions,      500);
  useDebouncedSave('cfg_allowedCurrencies',   allowedCurrencies,   500);
  useDebouncedSave('cfg_isinExceptions',      isinExceptions,      500);
  useDebouncedSave('cfg_blockedIssuers',      blockedIssuers,      500);
  useDebouncedSave('cfg_activeRichtlinie',    activeRichtlinie,    500);
  useDebouncedSave('cfg_requireDualRating',   requireDualRating,   500);
  useDebouncedSave('cfg_requireRating',       requireRating,       500);
  useDebouncedSave('cfg_minEmissionRatingLn', minEmissionRatingLn, 500);

  const [exclImportText,   setExclImportText]   = useState('');
  const [exclImportResult, setExclImportResult] = useState(null);
  const [bestandText,      setBestandText]      = useState('');
  const [bestandParsed,    setBestandParsed]    = useState(null);
  const [bestandLog,       setBestandLog]       = useState('');

  // ═══════════════════════════════════════════════════════
  // SECTION 13 — BENCHMARK STATE
  // ═══════════════════════════════════════════════════════

  const defaultBmFilter = {
    ratings: [], countries: [], esg: 'all', rank: [], call: [], kpnTyp: [],
    sektor: [], issuers: [], rw: [], sp: [], mo: [], msci: [], waeh: [],
    minK: '', maxK: '', minY: '', maxY: '', minPx: '', maxPx: '',
    minD: '', maxD: '', minMty: '', maxMty: '', minS: '', maxS: '',
  };

  const [bmType,   setBmType]   = useState(() => lsLoad('cfg_bmType',   'universum'));
  const [bmFilter, setBmFilter] = useState(() => {
    const v = lsLoad('cfg_bmFilter', null);
    if (!v || typeof v !== 'object') return { ...defaultBmFilter };
    const m = { ...defaultBmFilter, ...v };
    ['rank','call','kpnTyp','sektor','issuers','rw','sp','mo','msci','waeh','ratings','countries']
      .forEach(k => { if (!Array.isArray(m[k])) m[k] = []; });
    return m;
  });

  const updateBmF   = useCallback((k, v) => setBmFilter(p => ({ ...p, [k]: v })), []);
  const resetBmFilter = useCallback(() => setBmFilter({ ...defaultBmFilter }), []);

  useDebouncedSave('cfg_bmType',   bmType,   300);
  useDebouncedSave('cfg_bmFilter', bmFilter, 500);

  // Market portfolio (all bonds at full volume)
  const marketPortfolio = useMemo(() => universe.map(b => ({ ...b, nom: b.vol })), [universe]);
  const globalMkt       = useMemo(() => stats(marketPortfolio), [marketPortfolio]);

  // Filtered benchmark
  const benchmarkBonds = useMemo(() => {
    if (bmType !== 'custom' || !marketPortfolio.length) return marketPortfolio;
    const f = bmFilter;
    return marketPortfolio.filter(b => {
      if (f.ratings.length   && !f.ratings.includes(b.lo))                        return false;
      if (f.countries.length && !f.countries.includes(b.co))                      return false;
      if (f.esg !== 'all'    && (f.esg === 'green' ? b.g !== 1 : b.g === 1))     return false;
      if (f.rank.length      && !f.rank.includes(b.rank || 'SP'))                 return false;
      if (f.call.length) {
        const ct = b.perpetual ? 'perpetual' : b.callable ? 'callable' : 'bullet';
        if (!f.call.includes(ct)) return false;
      }
      if (f.kpnTyp.length  && !f.kpnTyp.includes(b.kpnTyp || 'FIXED'))           return false;
      if (f.sektor.length  && !f.sektor.includes(b.sektor || 'OTHER'))            return false;
      if (f.issuers?.length && !f.issuers.includes(b.t))                          return false;
      if (f.rw?.length     && !f.rw.includes(String(b.rw || 0)))                 return false;
      if (f.sp?.length     && !f.sp.includes(b.sp || 'NR'))                       return false;
      if (f.mo?.length     && !f.mo.includes(b.mo || 'NR'))                       return false;
      if (f.msci?.length)   { const m = b.msciEsg || ''; if (!f.msci.includes(m)) return false; }
      if (f.waeh?.length   && !f.waeh.includes(b.waeh || 'EUR'))                  return false;
      const pk = parseFloat;
      if (f.minK   !== '' && b.k  < pk(f.minK))  return false;
      if (f.maxK   !== '' && b.k  > pk(f.maxK))  return false;
      if (f.minY   !== '' && b.y  < pk(f.minY))  return false;
      if (f.maxY   !== '' && b.y  > pk(f.maxY))  return false;
      if (f.minPx  !== '' && b.px < pk(f.minPx)) return false;
      if (f.maxPx  !== '' && b.px > pk(f.maxPx)) return false;
      if (f.minD   !== '' && b.md < pk(f.minD))  return false;
      if (f.maxD   !== '' && b.md > pk(f.maxD))  return false;
      if (f.minMty !== '' && b.mty < pk(f.minMty)) return false;
      if (f.maxMty !== '' && b.mty > pk(f.maxMty)) return false;
      if (f.minS   !== '' && (b.s == null || b.s < pk(f.minS))) return false;
      if (f.maxS   !== '' && (b.s == null || b.s > pk(f.maxS))) return false;
      return true;
    });
  }, [marketPortfolio, bmType, bmFilter]);

  const benchmarkRef = useMemo(() => {
    const s = stats(benchmarkBonds);
    if (!s) {
      const fallback = globalMkt
        ? { ...globalMkt }
        : { nb: 0, wY: 0, wS: 0, wD: 0, wK: 0, wR: 0, gP: 0, wLn: 0, tN: 0, yRw: 0, yDur: 0 };
      if (bmType === 'custom') { fallback._custom = true; fallback._count = 0; fallback._empty = true; }
      return fallback;
    }
    if (bmType === 'custom') { s._custom = true; s._count = benchmarkBonds.length; }
    return s;
  }, [benchmarkBonds, bmType, globalMkt]);

  // ═══════════════════════════════════════════════════════
  // SECTION 14 — MARKET FILTER STATE
  // ═══════════════════════════════════════════════════════

  const [filteredMarketPortfolio, setFilteredMarketPortfolio] = useState(null);
  const [mfIssuers,  setMfIssuers]  = useState([]);
  const [mfCountries,setMfCountries]= useState([]);
  const [mfRatings,  setMfRatings]  = useState([]);
  const [mfESG,      setMfESG]      = useState('all');
  const [mfRW,       setMfRW]       = useState([]);
  const [mfRank,     setMfRank]     = useState([]);
  const [mfCall,     setMfCall]     = useState([]);
  const [mfQ,        setMfQ]        = useState('');
  const [mfMinK,  setMfMinK]  = useState(''); const [mfMaxK,  setMfMaxK]  = useState('');
  const [mfMinY,  setMfMinY]  = useState(''); const [mfMaxY,  setMfMaxY]  = useState('');
  const [mfMinPx, setMfMinPx] = useState(''); const [mfMaxPx, setMfMaxPx] = useState('');
  const [mfMinD,  setMfMinD]  = useState(''); const [mfMaxD,  setMfMaxD]  = useState('');
  const [mfMinMty,setMfMinMty]= useState(''); const [mfMaxMty,setMfMaxMty]= useState('');
  const [mfMinS,  setMfMinS]  = useState(''); const [mfMaxS,  setMfMaxS]  = useState('');
  const [mfMinESG,setMfMinESG]= useState(''); const [mfMaxESG,setMfMaxESG]= useState('');
  const [mfSP,    setMfSP]    = useState([]); const [mfMo,   setMfMo]   = useState([]);
  const [mfMsciEsg,setMfMsciEsg]= useState([]); const [mfKpnTyp,setMfKpnTyp]= useState([]); const [mfWaeh,setMfWaeh]= useState([]);

  const resetMarketFilter = useCallback(() => {
    setMfIssuers([]); setMfCountries([]); setMfRatings([]);
    setMfESG('all'); setMfRW([]); setMfRank([]); setMfCall([]); setMfQ('');
    setMfMinK(''); setMfMaxK(''); setMfMinY(''); setMfMaxY('');
    setMfMinPx(''); setMfMaxPx(''); setMfMinD(''); setMfMaxD('');
    setMfMinMty(''); setMfMaxMty(''); setMfMinS(''); setMfMaxS('');
    setMfMinESG(''); setMfMaxESG('');
    setMfSP([]); setMfMo([]); setMfMsciEsg([]); setMfKpnTyp([]); setMfWaeh([]);
  }, []);

  const getCurrentFilterState = useCallback(() => ({
    mfIssuers, mfCountries, mfRatings, mfESG, mfRW, mfRank, mfCall, mfQ,
    mfMinK, mfMaxK, mfMinY, mfMaxY, mfMinPx, mfMaxPx, mfMinD, mfMaxD,
    mfMinMty, mfMaxMty, mfMinS, mfMaxS, mfMinESG, mfMaxESG,
    mfSP, mfMo, mfMsciEsg, mfKpnTyp, mfWaeh,
  }), [mfIssuers, mfCountries, mfRatings, mfESG, mfRW, mfRank, mfCall, mfQ,
       mfMinK, mfMaxK, mfMinY, mfMaxY, mfMinPx, mfMaxPx, mfMinD, mfMaxD,
       mfMinMty, mfMaxMty, mfMinS, mfMaxS, mfMinESG, mfMaxESG,
       mfSP, mfMo, mfMsciEsg, mfKpnTyp, mfWaeh]);

  const copyMarketFilterToBenchmark = useCallback(() => {
    const esgMap = { Y: 'green', N: 'conv', all: 'all' };
    setBmType('custom');
    setBmFilter({
      ratings:  mfRatings  || [],
      countries:mfCountries || [],
      esg:      esgMap[mfESG] || mfESG || 'all',
      rank:     Array.isArray(mfRank)   ? mfRank.map(r => r)            : [],
      call:     Array.isArray(mfCall)   ? mfCall.map(t => t.toLowerCase()): [],
      minK:  mfMinK  || '', maxK:  mfMaxK  || '',
      minY:  mfMinY  || '', maxY:  mfMaxY  || '',
      minPx: mfMinPx || '', maxPx: mfMaxPx || '',
      kpnTyp: Array.isArray(mfKpnTyp) ? [...mfKpnTyp] : [],
      minD:  mfMinD  || '', maxD:  mfMaxD  || '',
      minMty:mfMinMty|| '', maxMty:mfMaxMty|| '',
    });
    setShowBenchmark(true);
  }, [mfRatings, mfCountries, mfESG, mfRank, mfCall, mfKpnTyp, mfMinK, mfMaxK, mfMinY, mfMaxY, mfMinPx, mfMaxPx, mfMinD, mfMaxD, mfMinMty, mfMaxMty]);

  // ═══════════════════════════════════════════════════════
  // SECTION 15 — UNIVERSE PROFILES
  // ═══════════════════════════════════════════════════════

  const [universeProfiles, setUniverseProfiles] = useState(() => lsLoad('universeProfiles', []));
  const [activeProfileId,  setActiveProfileId]  = useState(null);
  useDebouncedSave('universeProfiles', universeProfiles, 500);

  const saveUniverseProfile = useCallback((name) => {
    const profile = { id: Date.now(), n: name, filters: getCurrentFilterState() };
    setUniverseProfiles(prev => [...prev, profile]);
    setActiveProfileId(profile.id);
  }, [getCurrentFilterState]);

  const updateUniverseProfile = useCallback((id, { name, updateFilters }) => {
    setUniverseProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p };
      if (name !== undefined) updated.n = name;
      if (updateFilters) updated.filters = getCurrentFilterState();
      return updated;
    }));
  }, [getCurrentFilterState]);

  const loadUniverseProfile = useCallback((id) => {
    const p = universeProfiles.find(x => x.id === id);
    if (!p) return;
    const f = p.filters;
    setMfIssuers(f.mfIssuers || []); setMfCountries(f.mfCountries || []);
    setMfRatings(f.mfRatings || []); setMfESG(f.mfESG || 'all');
    setMfRW(Array.isArray(f.mfRW) ? f.mfRW : []);
    setMfRank(Array.isArray(f.mfRank) ? f.mfRank : []);
    setMfCall(Array.isArray(f.mfCall) ? f.mfCall : []);
    setMfQ(f.mfQ || '');
    setMfMinK(f.mfMinK || ''); setMfMaxK(f.mfMaxK || '');
    setMfMinY(f.mfMinY || ''); setMfMaxY(f.mfMaxY || '');
    setMfMinPx(f.mfMinPx || ''); setMfMaxPx(f.mfMaxPx || '');
    setMfMinD(f.mfMinD || ''); setMfMaxD(f.mfMaxD || '');
    setMfMinMty(f.mfMinMty || ''); setMfMaxMty(f.mfMaxMty || '');
    setMfMinS(f.mfMinS || ''); setMfMaxS(f.mfMaxS || '');
    setMfMinESG(f.mfMinESG || ''); setMfMaxESG(f.mfMaxESG || '');
    setMfSP(f.mfSP || []); setMfMo(f.mfMo || []);
    setMfMsciEsg(Array.isArray(f.mfMsciEsg) ? f.mfMsciEsg : []);
    setMfKpnTyp(Array.isArray(f.mfKpnTyp) ? f.mfKpnTyp : []);
    setMfWaeh(Array.isArray(f.mfWaeh) ? f.mfWaeh : []);
    setActiveProfileId(id);
  }, [universeProfiles]);

  const deleteUniverseProfile = useCallback((id) => {
    setUniverseProfiles(prev => prev.filter(x => x.id !== id));
    if (activeProfileId === id) setActiveProfileId(null);
  }, [activeProfileId]);

  const resetAndDeselectProfile = useCallback(() => {
    resetMarketFilter();
    setActiveProfileId(null);
  }, [resetMarketFilter]);

  const applyProfileToBenchmark = useCallback((id) => {
    const p = universeProfiles.find(x => x.id === id);
    if (!p) return;
    const f = p.filters;
    const esgMap = { Y: 'green', N: 'conv', all: 'all' };
    setBmType('custom');
    setBmFilter({
      ratings:  f.mfRatings  || [],
      countries:f.mfCountries || [],
      esg:      esgMap[f.mfESG] || f.mfESG || 'all',
      rank:     Array.isArray(f.mfRank)   ? f.mfRank              : [],
      call:     Array.isArray(f.mfCall)   ? f.mfCall.map(t => t.toLowerCase()) : [],
      kpnTyp:   Array.isArray(f.mfKpnTyp) ? [...f.mfKpnTyp]       : [],
      minK:  f.mfMinK  || '', maxK:  f.mfMaxK  || '',
      minY:  f.mfMinY  || '', maxY:  f.mfMaxY  || '',
      minPx: f.mfMinPx || '', maxPx: f.mfMaxPx || '',
      minD:  f.mfMinD  || '', maxD:  f.mfMaxD  || '',
      minMty:f.mfMinMty|| '', maxMty:f.mfMaxMty|| '',
    });
    setShowBenchmark(true);
  }, [universeProfiles]);

  // ═══════════════════════════════════════════════════════
  // SECTION 16 — SCENARIOS
  // ═══════════════════════════════════════════════════════

  const [savedScenarios, setSavedScenarios] = useState(() => {
    const raw = lsLoad('scenarios', []);
    return raw.map(s => {
      if (s.name && !s.name.includes(' — ')) {
        const sm       = s.cfg?.solverMode || 'greedy';
        const sl       = sm === 'mip' ? 'MIP' : sm === 'lp' ? 'LP' : sm === 'all' ? 'Multi' : 'Heur.';
        const si       = sm === 'mip' ? '🎯' : sm === 'lp' ? '🧮' : '⚡';
        const objLabel = s.cfg ? (OBJ[s.cfg.obj] || s.name) : s.name;
        return { ...s, name: sl + ' — ' + objLabel, icon: s.icon || si };
      }
      return s;
    });
  });

  const [selectedScenarioIds,   setSelectedScenarioIds]   = useState(() => new Set());
  const [renamingScenarioId,    setRenamingScenarioId]    = useState(null);
  const [renameValue,           setRenameValue]           = useState('');
  const [scenarioNamePrompt,    setScenarioNamePrompt]    = useState(null);

  useDebouncedSave('scenarios', savedScenarios, 1500);

  // Sync selectedScenarioIds when savedScenarios changes
  useEffect(() => {
    setSelectedScenarioIds(prev => {
      const validIds = new Set(savedScenarios.map(s => s.id));
      const pruned   = new Set([...prev].filter(id => validIds.has(id)));
      if (pruned.size === 0 && validIds.size > 0) return validIds;
      savedScenarios.forEach(s => { if (!pruned.has(s.id)) pruned.add(s.id); });
      return pruned;
    });
  }, [savedScenarios]);

  const renameScenario = useCallback((id, newName) => {
    setSavedScenarios(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  }, []);
  const deleteScenario = useCallback((id) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  }, []);
  const applyScenario  = useCallback((id) => {
    // TODO: implement full applyScenario logic (sets all cfg state from scenario.cfg)
    const s = savedScenarios.find(x => x.id === id);
    if (!s) return;
    setPf(s.bonds);
    setResult(s.bonds);
    setObj(s.cfg.obj);
    setBudget(s.cfg.budget);
    setGreen(s.cfg.minGreen);
  }, [savedScenarios]);

  // ═══════════════════════════════════════════════════════
  // SECTION 17 — PRESETS
  // ═══════════════════════════════════════════════════════

  const [userPresets,   setUserPresets]   = useState(() => { const v = lsLoad('userPresets', DEFAULT_PRESETS); return Array.isArray(v) ? v : DEFAULT_PRESETS; });
  const [hiddenPresets, setHiddenPresets] = useState(() => { const v = lsLoad('hiddenPresets', []); return Array.isArray(v) ? v : []; });
  const [presetEdit,    setPresetEdit]    = useState(null);

  useEffect(() => { lsSave('hiddenPresets', hiddenPresets); }, [hiddenPresets]);
  useDebouncedSave('userPresets', userPresets, 500);

  const togglePresetVisibility = useCallback((id) => {
    setHiddenPresets(prev => (Array.isArray(prev) ? prev : []).includes(id)
      ? prev.filter(x => x !== id)
      : [...(prev || []), id]);
  }, []);

  const visiblePresets = useMemo(
    () => (userPresets || []).filter(p => !(hiddenPresets || []).includes(p.id)),
    [userPresets, hiddenPresets]
  );

  const savePreset = useCallback((p) => {
    setUserPresets(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, p];
    });
    setPresetEdit(null);
  }, []);

  const deletePreset = useCallback((id) => {
    setUserPresets(prev => prev.filter(x => x.id !== id));
  }, []);

  const resetPresets = useCallback(() => {
    setUserPresets(DEFAULT_PRESETS);
  }, []);

  const applyPreset = useCallback((p) => {
    setObj(p.o);
    setGreen(p.g);
    if (p.cfg) {
      if (p.cfg.budget)         setBudget(p.cfg.budget);
      if (p.cfg.maxBondNom)     setMaxBondNom(p.cfg.maxBondNom);
      if (p.cfg.minBondNom != null) setMinBondNom(p.cfg.minBondNom);
      if (p.cfg.maxIssNominal)  setMaxIssNom(p.cfg.maxIssNominal);
      if (p.cfg.minIssNom != null)  setMinIssNom(p.cfg.minIssNom);
      if (p.cfg.minLot != null)     setMinLot(p.cfg.minLot);
      if (p.cfg.maxCo != null)      setMaxCo(p.cfg.maxCo);
      if (p.cfg.minLQA != null)     setMinLQA(p.cfg.minLQA);
      if (p.cfg.ratingLimits)   setRatingLimits(migrateLimits(p.cfg.ratingLimits, defaultRatingLimits));
      if (p.cfg.durMin != null) setDurMin(p.cfg.durMin);
      if (p.cfg.durMax != null) setDurMax(p.cfg.durMax);
      if (p.cfg.excludedIssuers)  setExcludedIssuers(p.cfg.excludedIssuers);
      if (p.cfg.excludedCountries)setExcludedCountries(p.cfg.excludedCountries);
      if (p.cfg.allowedIssuers)   setAllowedIssuers(p.cfg.allowedIssuers);
      if (p.cfg.rankLimits)    setRankLimits(migrateLimits(p.cfg.rankLimits,    defaultRankLimits));
      if (p.cfg.strukturLimits)setStrukturLimits(migrateLimits(p.cfg.strukturLimits, defaultStrukturLimits));
      if (p.cfg.kuponLimits)   setKuponLimits(migrateLimits(p.cfg.kuponLimits,  defaultKuponLimits));
      if (p.cfg.sektorLimits)  setSektorLimits(migrateLimits(p.cfg.sektorLimits,defaultSektorLimits));
      if (p.cfg.matBucketLimits) setMatBucketLimits(migrateLimits(p.cfg.matBucketLimits, defaultMatBucketLimits));
      if (p.cfg.matBucketUnit)   setMatBucketUnit(p.cfg.matBucketUnit);
      if (p.cfg.pfMaxDur  != null) setPfMaxDur(p.cfg.pfMaxDur);
      if (p.cfg.minRatingLn != null) setMinRatingLn(p.cfg.minRatingLn);
      if (p.cfg.matMax != null)    setMatMax(p.cfg.matMax);
      if (p.cfg.solverMode) {
        setRunLP( p.cfg.solverMode === 'lp'  || p.cfg.solverMode === 'all');
        setRunMIP(p.cfg.solverMode === 'mip' || p.cfg.solverMode === 'all');
      }
      if (p.cfg.allowedRegions)    setAllowedRegions(p.cfg.allowedRegions);
      if (p.cfg.allowedCurrencies) setAllowedCurrencies(p.cfg.allowedCurrencies);
      if (p.cfg.blockedIssuers)    setBlockedIssuers(p.cfg.blockedIssuers);
      if (p.cfg.isinExceptions)    setIsinExceptions(p.cfg.isinExceptions);
      if (p.cfg.requireDualRating != null) setRequireDualRating(p.cfg.requireDualRating);
      if (p.cfg.requireRating != null)     setRequireRating(p.cfg.requireRating);
      if (p.cfg.minEmissionRatingLn != null) setMinEmissionRatingLn(p.cfg.minEmissionRatingLn);
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // SECTION 18 — DATA IMPORT STATE
  // ═══════════════════════════════════════════════════════

  const [importText,    setImportText]    = useState('');
  const [parsedData,    setParsedData]    = useState(null);
  const [importError,   setImportError]   = useState('');
  const [xlsxLoading,   setXlsxLoading]  = useState(false);
  const [xlsxFileName,  setXlsxFileName] = useState('');

  useEffect(() => {
    if (parsedData) {
      const now     = new Date();
      const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setNewDatasetName(`Import ${dateStr} ${timeStr}`);
    }
  }, [parsedData]);

  const addAsNew = useCallback(() => {
    if (!parsedData) return;
    const newId     = Date.now().toString();
    const finalName = newDatasetName.trim() || `Import ${new Date().toLocaleString('de-DE')}`;
    setDatasets(prev => [...prev, { id: newId, name: finalName, data: parsedData, date: new Date().toISOString() }]);
    setActiveDatasetId(newId);
    setPf([]); setResult(null); setImportText(''); setParsedData(null); setXlsxFileName('');
    setLog(`Neues Universum angelegt: ${finalName}`);
    setTab(1);
  }, [parsedData, newDatasetName]);

  const mergeWithCurrent = useCallback(() => {
    if (!parsedData) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== activeDatasetId) return d;
      const maxId    = d.data.length > 0 ? Math.max(...d.data.map(b => b.id || 0)) : 0;
      const newBonds = parsedData.map((b, i) => ({ ...b, id: maxId + i + 1 }));
      return { ...d, data: [...d.data, ...newBonds], date: new Date().toISOString() };
    }));
    setPf([]); setResult(null); setImportText(''); setParsedData(null); setXlsxFileName('');
    setLog('Anleihen zum aktuellen Universum hinzugefügt.');
    setTab(1);
  }, [parsedData, activeDatasetId]);

  const overwriteCurrent = useCallback(() => {
    if (!parsedData) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== activeDatasetId) return d;
      const newName = activeDatasetId === 'default' ? 'Mein Standard-Datensatz' : d.name;
      return { ...d, data: parsedData, date: new Date().toISOString(), name: newName };
    }));
    setPf([]); setResult(null); setImportText(''); setParsedData(null); setXlsxFileName('');
    setLog('Aktuelles Universum überschrieben.');
    setTab(1);
  }, [parsedData, activeDatasetId]);

  // ═══════════════════════════════════════════════════════
  // SECTION 19 — DZ BANK / DATEN TAB STATE
  // ═══════════════════════════════════════════════════════

  const [dzFilter,       setDzFilter]       = useState('');
  const [dzSortKey,      setDzSortKey]      = useState('n');
  const [dzSortDir,      setDzSortDir]      = useState(1);
  const [dzRatingFilter, setDzRatingFilter] = useState('ALL');
  const [dzResTab,       setDzResTab]       = useState('indizes');
  const [dzBondSearch,   setDzBondSearch]   = useState('');
  const [dzBondSort,     setDzBondSort]     = useState({ k: 8, d: -1 });
  const [dzIdxSort,      setDzIdxSort]      = useState({ k: 1, d: -1 });
  const [dzBondPage,     setDzBondPage]     = useState(0);
  const [dzBondFSec,     setDzBondFSec]     = useState([]);
  const [dzBondFRang,    setDzBondFRang]    = useState([]);
  const [dzBondFKpn,     setDzBondFKpn]     = useState([]);
  const [dzBondFUni,     setDzBondFUni]     = useState([]);
  const [dzBondFEsg,     setDzBondFEsg]     = useState([]);
  const [dzBondFCo,      setDzBondFCo]      = useState([]);
  const [dzBondFDz,      setDzBondFDz]      = useState([]);
  const [dzBondFCt,      setDzBondFCt]      = useState([]);
  const [dzEmFUni,       setDzEmFUni]       = useState([]);
  const [dzEmFCo,        setDzEmFCo]        = useState([]);
  const [dzEmFCt,        setDzEmFCt]        = useState([]);
  const [dzEmFEsg,       setDzEmFEsg]       = useState([]);
  const [dzEmFilter,     setDzEmFilter]     = useState('');
  const [dzEmSortKey,    setDzEmSortKey]    = useState('n');
  const [dzEmSortDir,    setDzEmSortDir]    = useState(1);
  const [dzEmRatingFilter,setDzEmRatingFilter]= useState([]);

  const [dataSubTab,    setDataSubTab]    = useState('universum');
  const [dataEmitSort,  setDataEmitSort]  = useState({ k: 'n', d: 1 });
  const [dataEmitSearch,setDataEmitSearch]= useState('');
  const [dataIdxSort,   setDataIdxSort]   = useState({ k: 0, d: 1 });

  // ═══════════════════════════════════════════════════════
  // SECTION 20 — MISC UI STATE
  // ═══════════════════════════════════════════════════════

  const [selectedBond,    setSelectedBond]    = useState(null);
  const [issuerModalData, setIssuerModalData] = useState(null);
  const [copiedId,        setCopiedId]        = useState(null);
  const [sessionName,     setSessionName_]    = useState(() => sessionGetName());
  const [log,             setLog]             = useState(() => lsLoad('datasets', null) ? '✅ Gespeicherter Zustand wiederhergestellt.' : '');
  const [savedFeedback,   setSavedFeedback]   = useState(false);
  const [storageInfo,     setStorageInfo]     = useState({ size: 0, show: false });

  const resultsRef = useRef(null);
  const fileInputRef = useRef(null);

  const openDetails      = useCallback((bond)          => setSelectedBond(bond),             []);
  const openIssuerDetails = useCallback((issuer, bonds) => setIssuerModalData({ issuer, bonds }), []);

  // Storage info refresh
  useEffect(() => {
    const timer = setTimeout(
      () => setStorageInfo(prev => ({ ...prev, size: lsGetSize() })),
      2000
    );
    return () => clearTimeout(timer);
  }, [datasets, savedScenarios, pf, result]);

  const handleClearStorage = useCallback(() => {
    if (confirm('Alle gespeicherten Daten löschen? (Datasets, Szenarien, Einstellungen)\n\nDie Seite wird danach neu geladen.')) {
      lsClearAll();
      window.location.reload();
    }
  }, []);

  // Debounce tab and zoom persistence
  useDebouncedSave('tab',  tab,       300);
  useDebouncedSave('zoom', zoomLevel, 300);

  // ═══════════════════════════════════════════════════════
  // SECTION 21 — SECTION LAYOUTS (collapsible blocks)
  // ═══════════════════════════════════════════════════════

  const MKT_SECTIONS = useMemo(() => [
    { id: 'mkt_header',  title: 'Universum & Filter',    icon: '🌍'  },
    { id: 'mkt_stats',   title: 'Kennzahlen',             icon: '📊'  },
    { id: 'mkt_scatter', title: 'Scatter Matrix',         icon: '🔵'  },
    { id: 'mkt_dist',    title: 'Verteilungen',           icon: '📈'  },
    { id: 'mkt_rv',      title: 'RV Heatmap',             icon: '🗺️' },
    { id: 'mkt_issuer',  title: 'Emittenten',             icon: '🏦'  },
    { id: 'mkt_dz',      title: 'DZ BANK Kurzübersicht',  icon: '📑'  },
    { id: 'mkt_bonds',   title: 'Anleihen',               icon: '📋'  },
  ], []);

  const PF_SECTIONS = useMemo(() => [
    { id: 'pf_compare', title: 'Portfoliovergleich', icon: '🏆' },
    { id: 'pf_stats',   title: 'Kennzahlen',          icon: '📊' },
    { id: 'pf_panels',  title: 'Vergleichspanels',    icon: '⚖️' },
    { id: 'pf_scatter', title: 'Scatter Matrix',      icon: '🔵' },
    { id: 'pf_dist',    title: 'Verteilungen',        icon: '📈' },
    { id: 'pf_issuer',  title: 'Emittenten',          icon: '🏦' },
    { id: 'pf_bonds',   title: 'Anleihen',            icon: '📋' },
  ], []);

  const SC_SECTIONS = useMemo(() => [
    { id: 'sc_kpi',         title: 'Kennzahlen',             icon: '📊'  },
    { id: 'sc_table',       title: 'Vergleichstabelle',      icon: '📋'  },
    { id: 'sc_profile',     title: 'Szenario-Profil',        icon: '🎯'  },
    { id: 'sc_overlap',     title: 'Überlappungs-Analyse',   icon: '🔗'  },
    { id: 'sc_risk',        title: 'Risiko-Sensitivität',    icon: '⚡'  },
    { id: 'sc_rv',          title: 'Relative Value',         icon: '🗺️' },
    { id: 'sc_constraints', title: 'Restriktions-Vergleich', icon: '🎚️' },
    { id: 'sc_charts',      title: 'Allokation',             icon: '⚖️' },
    { id: 'sc_scatter',     title: 'Scatter Matrix',         icon: '🔵'  },
    { id: 'sc_dist',        title: 'Verteilungen',           icon: '📈'  },
  ], []);

  const DD_SECTIONS = useMemo(() => [
    { id: 'dd_barometer',   title: 'Markt-Barometer',         icon: '🌡️' },
    { id: 'dd_concentration',title:'Konzentrations-Radar',    icon: '🎯'  },
    { id: 'dd_curve',       title: 'Spread-Kurve',            icon: '📉'  },
    { id: 'dd_liquidity',   title: 'Liquiditäts-Dashboard',   icon: '💧'  },
    { id: 'dd_structure',   title: 'Kupontyp & Struktur',     icon: '🏗️' },
    { id: 'dd_carry',       title: 'Carry & Rolldown',        icon: '💰'  },
    { id: 'dd_esg',         title: 'ESG-Deep-Dive',           icon: '🌱'  },
    { id: 'dd_ranges',      title: 'Kennzahlen-Ranges',       icon: '📏'  },
    { id: 'dd_sector',      title: 'Sektor-Analyse',          icon: '🏭'  },
    { id: 'dd_rwa',         title: 'RWA / Regulatorik',       icon: '🏛️' },
    { id: 'dd_convexity',   title: 'Konvexitäts-Analyse',     icon: '📐'  },
    { id: 'dd_peers',       title: 'Peer-Group & Rich/Cheap', icon: '🔬'  },
  ], []);

  const AO_SECTIONS = useMemo(() => [
    { id: 'ao_rvmap',   collapsed: false },
    { id: 'ao_frontier',collapsed: false },
    { id: 'ao_compare', collapsed: false },
    { id: 'ao_profile', collapsed: true  },
    { id: 'ao_delta',   collapsed: true  },
    { id: 'ao_diff',    collapsed: true  },
  ], []);

  const mktLayout = useSectionLayout('mkt', MKT_SECTIONS);
  const pfLayout  = useSectionLayout('pf',  PF_SECTIONS);
  const scLayout  = useSectionLayout('sc',  SC_SECTIONS);
  const ddLayout  = useSectionLayout('dd',  DD_SECTIONS);
  const aoLayout  = useSectionLayout('ao',  AO_SECTIONS);

  const AO_SEC_META = {
    ao_rvmap:   { title: 'Relative Value Map',  icon: '📍', accent: 'blue'    },
    ao_frontier:{ title: 'Frontier-Kurven',      icon: '📈', accent: 'emerald' },
    ao_compare: { title: 'Szenario-Vergleich',   icon: '📋', accent: 'violet'  },
    ao_profile: { title: 'Portfolio-Profil',      icon: '🏛',  accent: 'amber'  },
    ao_delta:   { title: 'Delta-Analyse',         icon: '⚖️', accent: 'rose'   },
    ao_diff:    { title: 'Bond-Diff',             icon: '🔀', accent: 'slate'   },
  };

  // ═══════════════════════════════════════════════════════
  // SECTION 22 — DERIVED / COMPUTED STATE
  // ═══════════════════════════════════════════════════════

  const pS = useMemo(() => stats(pf), [pf]);

  // Filter options for market-filter selects
  const filterOptions = useMemo(() => {
    const emittenten = Array.from(new Set(universe.map(b => b.t)))
      .map(t => { const b = universe.find(x => x.t === t); return { val: t, lbl: b?.e || t }; })
      .sort((a, b) => a.lbl.localeCompare(b.lbl));
    const laender = Array.from(new Set(universe.map(b => b.co)))
      .map(c => ({ val: c, lbl: c, co: c }))
      .sort((a, b) => a.lbl.localeCompare(b.lbl));
    const ratings = Array.from(new Set(universe.map(b => b.lo)));
    const ranks   = Array.from(new Set(universe.map(b => b.rank || 'SP')))
      .map(r => ({ val: r, lbl: r })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const callTypes = Array.from(new Set(universe.map(b =>
      b.perpetual ? 'perpetual' : b.callable ? 'callable' : 'bullet'
    ))).map(t => ({ val: t, lbl: t }));
    const kpnTypes = Array.from(new Set(universe.map(b => b.kpnTyp).filter(Boolean)))
      .map(t => ({ val: t, lbl: t }));
    const esgTypes = [];
    if (universe.some(b => b.g === 1))  esgTypes.push({ val: 'green', lbl: 'Green / ESG' });
    if (universe.some(b => b.g !== 1))  esgTypes.push({ val: 'conv',  lbl: 'Konventionell' });
    const sektorTypes = Array.from(new Set(universe.map(b => b.sektor).filter(Boolean)))
      .map(s => ({ val: s, lbl: s })).sort((a, b) => a.lbl.localeCompare(b.lbl));
    const spRatings = Array.from(new Set(universe.map(b => b.sp).filter(Boolean)))
      .map(r => ({ val: r, lbl: r }));
    const moRatings = Array.from(new Set(universe.map(b => b.mo).filter(Boolean)))
      .map(r => ({ val: r, lbl: r }));
    return { emittenten, laender, ratings, ranks, callTypes, kpnTypes, esgTypes, sektorTypes, spRatings, moRatings };
  }, [universe]);

  // cfg snapshot — passed into solver and preset save
  const cfg = useMemo(() => ({
    obj, budget, minGreen: green, maxBondNom, minBondNom,
    maxIssNominal: maxIssNom, minIssNom, minLot, maxCo,
    ratingLimits: { ...ratingLimits }, minLQA, durMin, durMax, matMin, matMax,
    excludedIssuers, excludedCountries, allowedIssuers,
    optMinK, optMaxK, optMinPx, optMaxPx, optMinY, optMaxY,
    pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinY, pfMaxY,
    rankLimits:     { ...rankLimits     },
    strukturLimits: { ...strukturLimits },
    kuponLimits:    { ...kuponLimits    },
    sektorLimits:   { ...sektorLimits   },
    pfMinDur, pfMaxDur, pfMinMat, pfMaxMat, minRatingLn,
    matBucketLimits: { ...matBucketLimits }, matBucketUnit,
    ratingLimitUnit, rankLimitUnit, strukturLimitUnit, kuponLimitUnit, sektorLimitUnit, countryLimitUnit,
    allowedRegions:    [...allowedRegions],
    allowedCurrencies: [...allowedCurrencies],
    blockedIssuers:    [...blockedIssuers],
    isinExceptions:    [...isinExceptions],
    requireDualRating, requireRating, minEmissionRatingLn,
  }), [
    obj, budget, green, maxBondNom, minBondNom, maxIssNom, minIssNom, minLot, maxCo,
    ratingLimits, minLQA, durMin, durMax, matMin, matMax,
    excludedIssuers, excludedCountries, allowedIssuers,
    optMinK, optMaxK, optMinPx, optMaxPx, optMinY, optMaxY,
    pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinY, pfMaxY,
    rankLimits, strukturLimits, kuponLimits, sektorLimits,
    pfMinDur, pfMaxDur, pfMinMat, pfMaxMat, minRatingLn,
    matBucketLimits, matBucketUnit,
    ratingLimitUnit, rankLimitUnit, strukturLimitUnit, kuponLimitUnit, sektorLimitUnit, countryLimitUnit,
    allowedRegions, allowedCurrencies, blockedIssuers, isinExceptions,
    requireDualRating, requireRating, minEmissionRatingLn,
  ]);

  // Clear log when cfg changes
  useEffect(() => { setLog(''); }, [cfg]);

  const getCurrentCfg = useCallback(() => ({ ...cfg, solverMode }), [cfg, solverMode]);

  const clearRestrictions = useCallback(() => {
    setGreen(0); setMaxCo(100);
    setRatingLimits(JSON.parse(JSON.stringify(defaultRatingLimits)));
    setMinLQA(0);
    setDurMin(''); setDurMax(''); setMatMin(''); setMatMax('');
    setOptMinK(''); setOptMaxK(''); setOptMinPx(''); setOptMaxPx('');
    setPfMinK('');  setPfMaxK('');  setPfMinPx('');  setPfMaxPx('');
    setExcludedIssuers([]); setExcludedCountries([]); setAllowedIssuers([]);
    setRankLimits(    Object.fromEntries(RANK_CATS.map(c     => [c, { enabled: true, min: '', max: '' }])));
    setStrukturLimits(Object.fromEntries(STRUKTUR_CATS.map(c => [c, { enabled: true, min: '', max: '' }])));
    setKuponLimits(   Object.fromEntries(KUPON_CATS.map(c    => [c, { enabled: true, min: '', max: '' }])));
    setSektorLimits(  Object.fromEntries(SEKTOR_CATS.map(c   => [c, { enabled: true, min: '', max: '' }])));
    setPfMinDur(''); setPfMaxDur(''); setPfMinMat(''); setPfMaxMat('');
    setMatBucketLimits(JSON.parse(JSON.stringify(defaultMatBucketLimits)));
    setMatBucketUnit('pct'); setRatingLimitUnit('pct'); setRankLimitUnit('pct');
    setStrukturLimitUnit('pct'); setKuponLimitUnit('pct'); setSektorLimitUnit('pct'); setCountryLimitUnit('pct');
    setMinRatingLn(''); setMinBondNom(''); setMinIssNom('');
    setBmType('universum'); resetBmFilter();
    setLog('Alle Anlagerichtlinien wurden zurückgesetzt.');
  }, [resetBmFilter]);

  // ═══════════════════════════════════════════════════════
  // SECTION 23 — SOLVER CALLBACKS (doRun, saveAsScenario…)
  // ═══════════════════════════════════════════════════════

  const doRun = useCallback(async () => {
    setSolverRunning(true);
    setSolverPhase('Konfiguration wird geprüft...');
    setLog('Optimierung läuft...');
    try {
      const cleanCfg = sanitizeCfg(cfg);
      const runCfg   = useBestand && pf.length > 0 ? { ...cleanCfg, lockedBonds: pf } : cleanCfg;

      // Basic constraint validation
      const pv = (v) => v !== null && v !== '' && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
      const conflicts = [];
      const pvDurMin = pv(runCfg.durMin),  pvDurMax = pv(runCfg.durMax);
      const pvPfMinDur = pv(runCfg.pfMinDur), pvPfMaxDur = pv(runCfg.pfMaxDur);
      const pvMatMin = pv(runCfg.matMin),  pvMatMax = pv(runCfg.matMax);
      if (pvDurMin != null && pvDurMax != null && pvDurMin > pvDurMax) conflicts.push('Duration: Einzel-Min > Einzel-Max');
      if (pvPfMinDur != null && pvPfMaxDur != null && pvPfMinDur > pvPfMaxDur) conflicts.push('Duration: Pf-Min > Pf-Max');
      if (pvMatMin != null  && pvMatMax != null  && pvMatMin > pvMatMax)        conflicts.push('Restlaufzeit: Einzel-Min > Einzel-Max');

      if (conflicts.length > 0) {
        const fallback = [...marketPortfolio];
        fallback.isFallback = true;
        setResult(fallback); setAltResult(null); setSolverResults([]);
        setPrimarySolver('greedy'); primarySolverRef.current = 'greedy';
        setLog('⚠️ Konfigurationsfehler: ' + conflicts.join(' · ') + ' — bitte Constraints anpassen.');
        setSolverRunning(false); setSolverPhase('');
        return;
      }

      // Auto-Optimize branch
      if (runCfg.obj === 'autoOptimize') {
        setSolverPhase('Auto-Optimize: Szenarien werden gescannt...');
        setAutoOptResult(null); setAutoOptSelected('p0'); setAutoOptRunning(true);
        const aoResult = await runAutoOptimize(universe, runCfg, {
          onPhase: (msg) => setSolverPhase(msg),
          maxScenarios: maxAutoOptScenarios,
        });
        if (aoResult && aoResult.p0?.result?.length) {
          setResult(aoResult.p0.result);
          setAutoOptResult(aoResult);
          setLog('Auto-Optimize abgeschlossen.');
          setPrimarySolver('autoOpt_p0'); primarySolverRef.current = 'autoOpt_p0';
        }
        setAutoOptRunning(false);
        setSolverRunning(false); setSolverPhase('');
        return;
      }

      // Lexicographic branch
      if (runCfg.obj === 'lexicographic') {
        setSolverPhase('Lexikographische Optimierung...');
        const solveFn = async (p, c) => {
          if (runMIP && solverAvailRef.current.mip === 'ready') return await optimizeMIP_v2(p, c);
          if (runLP  && solverAvailRef.current.lp  === 'ready') return await optimizeLP(p, c);
          return null;
        };
        const { result: lexR, phases } = await solveLexicographic(universe, runCfg, lexChain, solveFn);
        setLexPhaseLog(phases || null);
        if (lexR && lexR.length > 0) {
          setResult(lexR); setAltResult(null); setSolverResults([]);
          setPrimarySolver('lexicographic'); primarySolverRef.current = 'lexicographic';
          setLog('Lexikographische Optimierung abgeschlossen.');
        } else {
          setLog('⚠️ Lexikographische Optimierung ergab kein Ergebnis.');
        }
        setSolverRunning(false); setSolverPhase('');
        return;
      }

      // Standard solve: MIP > LP > Greedy
      setSolverPhase('Optimierung...');
      let bestResult = null;
      const allSolverResults = [];

      if (runMIP && solverAvailRef.current.mip === 'ready') {
        try {
          const r = await optimizeMIP_v2(universe, runCfg);
          if (r && r.length > 0) {
            bestResult = r;
            allSolverResults.push({ r, s: stats(r), label: 'MIP', icon: '🎯', key: 'mip' });
          }
        } catch (e) { console.warn('[MIP]', e.message); }
      }

      if (runLP && solverAvailRef.current.lp === 'ready') {
        try {
          const r = await optimizeLP(universe, runCfg);
          if (r && r.length > 0) {
            if (!bestResult) bestResult = r;
            allSolverResults.push({ r, s: stats(r), label: 'LP', icon: '🧮', key: 'lp' });
          }
        } catch (e) { console.warn('[LP]', e.message); }
      }

      if (allSolverResults.length > 0) {
        const prim = allSolverResults[0];
        setResult(prim.r); setAltResult(allSolverResults.length > 1 ? allSolverResults[1].r : null);
        setSolverResults(allSolverResults);
        setPrimarySolver(prim.key); primarySolverRef.current = prim.key;
        setLog('Optimierung abgeschlossen (' + allSolverResults.map(x => x.label).join(' + ') + ').');
      } else {
        // Greedy fallback
        setLog('Kein LP/MIP-Ergebnis — Greedy-Fallback.');
        setPrimarySolver('greedy'); primarySolverRef.current = 'greedy';
      }
    } catch (err) {
      console.error('[doRun]', err);
      setLog('Fehler: ' + err.message);
    } finally {
      setSolverRunning(false);
      setSolverPhase('');
      setTimeout(() => {
        if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [cfg, universe, runGreedy, runLP, runMIP, marketPortfolio, useBestand, pf, lexChain, maxAutoOptScenarios]);

  const saveAsScenario = useCallback(() => {
    if (!result || !rS) return;
    const solverLabel = primarySolver === 'mip' ? 'MIP' : primarySolver === 'lp' ? 'LP' : 'Heur.';
    const solverIcon  = primarySolver === 'mip' ? '🎯' : primarySolver === 'lp' ? '🧮' : '⚡';
    const baseName    = OBJ[obj] || 'Szenario';
    const cnt         = savedScenarios.filter(s => s.cfg?.obj === obj).length;
    const defaultName = solverLabel + ' — ' + baseName + (cnt > 0 ? ` (${cnt + 1})` : '');
    setScenarioNamePrompt({ defaultName, icon: solverIcon });
  }, [result, rS, obj, primarySolver, savedScenarios]);

  const confirmSaveScenario = useCallback((name, icon) => {
    if (!result || !rS) return;
    const scenario = {
      id:      Date.now(),
      name:    name.trim() || 'Szenario',
      icon,
      savedAt: new Date().toISOString(),
      cfg: {
        obj, budget, minGreen: green, maxBondNom, minBondNom,
        maxIssNominal: maxIssNom, minIssNom, minLot,
        maxCo, ratingLimits: { ...ratingLimits }, minLQA, durMin, durMax,
        excludedIssuers: [...excludedIssuers],
        excludedCountries: [...excludedCountries],
        allowedIssuers:   [...allowedIssuers],
        optMinK, optMaxK, optMinPx, optMaxPx,
        pfMinK, pfMaxK, pfMinPx, pfMaxPx,
        rankLimits:     { ...rankLimits },
        strukturLimits: { ...strukturLimits },
        kuponLimits:    { ...kuponLimits },
        sektorLimits:   { ...sektorLimits },
        pfMinDur, pfMaxDur, pfMinMat, pfMaxMat, minRatingLn,
        solverMode, actualSolver: primarySolver,
        matBucketLimits: { ...matBucketLimits }, matBucketUnit,
      },
      bonds: result.map(b => ({ ...b })),
      stats: { ...rS },
    };
    setSavedScenarios(prev => [...prev, scenario]);
    setScenarioNamePrompt(null);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }, [
    result, rS, obj, budget, green, maxBondNom, minBondNom, maxIssNom, minIssNom, minLot,
    maxCo, ratingLimits, minLQA, durMin, durMax, excludedIssuers, excludedCountries, allowedIssuers,
    optMinK, optMaxK, optMinPx, optMaxPx, pfMinK, pfMaxK, pfMinPx, pfMaxPx,
    rankLimits, strukturLimits, kuponLimits, sektorLimits, pfMinDur, pfMaxDur, pfMinMat, pfMaxMat,
    minRatingLn, solverMode, primarySolver, matBucketLimits, matBucketUnit,
  ]);

  // ═══════════════════════════════════════════════════════
  // SECTION 24 — SHARED PROP BUNDLES
  // Aggregate related props so tab components receive clean objects.
  // ═══════════════════════════════════════════════════════

  /** Props shared by all tabs that need market data */
  const marketProps = {
    universe, datasets, activeDatasetId, setActiveDatasetId, setDatasets,
    marketPortfolio, globalMkt, benchmarkBonds, benchmarkRef,
    filterOptions,
  };

  /** Optimiser config props */
  const cfgProps = {
    cfg, obj, setObj, budget, setBudget, green, setGreen,
    maxBondNom, setMaxBondNom, minBondNom, setMinBondNom,
    maxIssNom, setMaxIssNom, minIssNom, setMinIssNom,
    minLot, setMinLot, maxCo, setMaxCo, minLQA, setMinLQA,
    durMin, setDurMin, durMax, setDurMax, matMin, setMatMin, matMax, setMatMax,
    minRatingLn, setMinRatingLn,
    ratingLimits, setRatingLimits, ratingLimitUnit, setRatingLimitUnit,
    rankLimits, setRankLimits, rankLimitUnit, setRankLimitUnit,
    strukturLimits, setStrukturLimits, strukturLimitUnit, setStrukturLimitUnit,
    kuponLimits, setKuponLimits, kuponLimitUnit, setKuponLimitUnit,
    sektorLimits, setSektorLimits, sektorLimitUnit, setSektorLimitUnit,
    matBucketLimits, setMatBucketLimits, matBucketUnit, setMatBucketUnit,
    pfMinDur, setPfMinDur, pfMaxDur, setPfMaxDur,
    pfMinMat, setPfMinMat, pfMaxMat, setPfMaxMat,
    pfMinK, setPfMinK, pfMaxK, setPfMaxK,
    pfMinPx, setPfMinPx, pfMaxPx, setPfMaxPx,
    pfMinY, setPfMinY, pfMaxY, setPfMaxY,
    optMinK, setOptMinK, optMaxK, setOptMaxK,
    optMinPx, setOptMinPx, optMaxPx, setOptMaxPx,
    optMinY, setOptMinY, optMaxY, setOptMaxY,
    excludedIssuers, setExcludedIssuers,
    allowedIssuers, setAllowedIssuers,
    excludedCountries, setExcludedCountries,
    countryLimitUnit, setCountryLimitUnit,
    // Anlagerichtlinien
    allowedRegions, setAllowedRegions,
    allowedCurrencies, setAllowedCurrencies,
    isinExceptions, setIsinExceptions,
    blockedIssuers, setBlockedIssuers,
    activeRichtlinie, setActiveRichtlinie,
    requireDualRating, setRequireDualRating,
    requireRating, setRequireRating,
    minEmissionRatingLn, setMinEmissionRatingLn,
    allowedCountrySet,
    clearRestrictions, getCurrentCfg,
    lexChain, setLexChain, lexPhaseLog,
    useBestand, setUseBestand,
    bmType, setBmType, bmFilter, updateBmF, resetBmFilter,
  };

  /** Solver control props */
  const solverProps = {
    runGreedy, runLP, runMIP, toggleSolver, solverMode,
    solverRunning, solverPhase, solverAvail,
    doRun, log, setLog,
    result, setResult, altResult, setAltResult,
    solverResults, solverResultsWithStats, switchSolverResult,
    primarySolver, setPrimarySolver,
    multiStrategy, setMultiStrategy, selectedStrategies, setSelectedStrategies,
    pf, setPf, pS, rS, altS,
    useBestand, setUseBestand,
    budget,
  };

  /** Auto-optimize props */
  const autoOptProps = {
    autoOptResult, setAutoOptResult,
    autoOptSelected, setAutoOptSelected,
    autoOptRunning, setAutoOptRunning,
    frontierLayout, setFrontierLayout,
    frontierDetailModal, setFrontierDetailModal,
    rankWeights, setRankWeights, ranking,
  };

  /** Preset props */
  const presetProps = {
    userPresets, visiblePresets, hiddenPresets,
    applyPreset, savePreset, deletePreset, resetPresets,
    togglePresetVisibility, presetEdit, setPresetEdit,
    savedFeedback, saveAsScenario,
  };

  /** Scenario props */
  const scenarioProps = {
    savedScenarios, setSavedScenarios,
    selectedScenarioIds, setSelectedScenarioIds,
    renamingScenarioId, setRenamingScenarioId,
    renameValue, setRenameValue,
    renameScenario, deleteScenario, applyScenario,
  };

  /** Market-filter props */
  const marketFilterProps = {
    filteredMarketPortfolio, setFilteredMarketPortfolio,
    mfIssuers, setMfIssuers, mfCountries, setMfCountries,
    mfRatings, setMfRatings, mfESG, setMfESG,
    mfRW, setMfRW, mfRank, setMfRank, mfCall, setMfCall, mfQ, setMfQ,
    mfMinK, setMfMinK, mfMaxK, setMfMaxK,
    mfMinY, setMfMinY, mfMaxY, setMfMaxY,
    mfMinPx, setMfMinPx, mfMaxPx, setMfMaxPx,
    mfMinD, setMfMinD, mfMaxD, setMfMaxD,
    mfMinMty, setMfMinMty, mfMaxMty, setMfMaxMty,
    mfMinS, setMfMinS, mfMaxS, setMfMaxS,
    mfMinESG, setMfMinESG, mfMaxESG, setMfMaxESG,
    mfSP, setMfSP, mfMo, setMfMo, mfMsciEsg, setMfMsciEsg,
    mfKpnTyp, setMfKpnTyp, mfWaeh, setMfWaeh,
    resetMarketFilter, copyMarketFilterToBenchmark, getCurrentFilterState,
  };

  /** Universe profile props */
  const profileProps = {
    universeProfiles, activeProfileId,
    saveUniverseProfile, updateUniverseProfile, loadUniverseProfile,
    deleteUniverseProfile, resetAndDeselectProfile, applyProfileToBenchmark,
  };

  /** Display/settings props */
  const displayProps = {
    showStats, setShowStats, showScatter, setShowScatter,
    showBuckets, setShowBuckets, showSpreadCurve, setShowSpreadCurve,
    showFrontier, setShowFrontier, showDelta, setShowDelta,
    showSettings, setShowSettings, showBenchmark, setShowBenchmark,
    tablePageSize, setTablePageSize, decimalPlaces, setDecimalPlaces,
    defaultSort, setDefaultSort, chartColorScheme, setChartColorScheme,
    exportFormat, setExportFormat, compactMode, setCompactMode,
    hiddenSections, isSectionHidden, toggleSectionHidden,
    hiddenTabs, visibleTabs, tabOrder, toggleTabVisibility, moveTab,
    startTab, setStartTab,
    defaultScatterX, setDefaultScatterX, defaultScatterY, setDefaultScatterY,
    defaultColorMode, setDefaultColorMode, defaultTrendline, setDefaultTrendline,
    numberLocale, setNumberLocale, dateFormat, setDateFormat,
    defaultRichtlinie, setDefaultRichtlinie, defaultProfileId, setDefaultProfileId,
    debugMode, setDebugMode, solverTimeout, setSolverTimeout,
    maxAutoOptScenarios, setMaxAutoOptScenarios,
  };

  /** DZ Research / Daten tab props */
  const dzProps = {
    dzFilter, setDzFilter, dzSortKey, setDzSortKey, dzSortDir, setDzSortDir,
    dzRatingFilter, setDzRatingFilter, dzResTab, setDzResTab,
    dzBondSearch, setDzBondSearch, dzBondSort, setDzBondSort,
    dzIdxSort, setDzIdxSort, dzBondPage, setDzBondPage,
    dzBondFSec, setDzBondFSec, dzBondFRang, setDzBondFRang,
    dzBondFKpn, setDzBondFKpn, dzBondFUni, setDzBondFUni,
    dzBondFEsg, setDzBondFEsg, dzBondFCo, setDzBondFCo,
    dzBondFDz, setDzBondFDz, dzBondFCt, setDzBondFCt,
    dzEmFUni, setDzEmFUni, dzEmFCo, setDzEmFCo,
    dzEmFCt, setDzEmFCt, dzEmFEsg, setDzEmFEsg,
    dzEmFilter, setDzEmFilter, dzEmSortKey, setDzEmSortKey,
    dzEmSortDir, setDzEmSortDir, dzEmRatingFilter, setDzEmRatingFilter,
  };

  /** Daten tab props */
  const datenProps = {
    dataSubTab, setDataSubTab,
    dataEmitSort, setDataEmitSort,
    dataEmitSearch, setDataEmitSearch,
    dataIdxSort, setDataIdxSort,
  };

  /** Import tab props */
  const importProps = {
    importText, setImportText, parsedData, setParsedData,
    importError, setImportError, xlsxLoading, setXlsxLoading,
    xlsxFileName, setXlsxFileName, newDatasetName, setNewDatasetName,
    addAsNew, mergeWithCurrent, overwriteCurrent,
    bestandText, setBestandText, bestandParsed, setBestandParsed, bestandLog, setBestandLog,
    exclImportText, setExclImportText, exclImportResult, setExclImportResult,
    allowedIssImportText, setAllowedIssImportText, allowedIssImportResult, setAllowedIssImportResult,
  };

  /** Misc shared props */
  const miscProps = {
    selectedBond, setSelectedBond, openDetails,
    issuerModalData, setIssuerModalData, openIssuerDetails,
    copiedId, setCopiedId,
    sessionName, onRenameSession: (n) => { sessionSetName(n); setSessionName_(n); },
    log, setLog, storageInfo, handleClearStorage,
    resultsRef, fileInputRef,
    zoomLevel, zoomScale, zoomIn, zoomOut, zoomReset,
    mktLayout, pfLayout, scLayout, ddLayout, aoLayout, AO_SEC_META,
    MKT_SECTIONS, PF_SECTIONS, SC_SECTIONS, DD_SECTIONS,
    tab, setTab, visibleTabs,
    savedScenarios,
  };

  // ═══════════════════════════════════════════════════════
  // SECTION 25 — RENDER
  // ═══════════════════════════════════════════════════════

  // Flatten all props for convenience when passing down to placeholder tabs
  const allProps = {
    ...marketProps, ...cfgProps, ...solverProps, ...autoOptProps,
    ...presetProps, ...scenarioProps, ...marketFilterProps,
    ...profileProps, ...displayProps, ...dzProps, ...datenProps,
    ...importProps, ...miscProps,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-spark-200">

      {/* ═══ TOP NAVBAR ═══ */}
      <div className="border-b border-slate-200/60 glass-strong sticky top-0 z-50 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">

          {/* Logo + brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-spark-500 to-spark-700 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-spark-500/20">
              S
            </div>
            <div>
              <div className="text-[15px] md:text-base font-extrabold text-slate-900 tracking-tight leading-none">
                Portfolio Engine
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                <span className="md:hidden">V5</span>
                <span className="hidden md:inline">Portfolio Engine · V5</span>
              </div>
            </div>
          </div>

          {/* Desktop tab navigation */}
          <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner overflow-x-auto"
               role="tablist" aria-label="Hauptnavigation">
            {[...visibleTabs, { id: 10, label: "Einstellungen", icon: "⚙" }].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={tab === t.id}
                className={
                  'nav-tab px-3 py-1.5 rounded-md font-bold text-sm transition-all whitespace-nowrap ' +
                  (tab === t.id
                    ? 'bg-white text-spark-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800')
                }
              >
                {t.icon} {t.label}
                {t.id === 4 && savedScenarios.length > 0 && (
                  <span className="ml-1.5 bg-spark-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center">
                    {savedScenarios.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Zoom controls (desktop) */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={zoomOut}   className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-sm font-bold hover:bg-slate-200 transition-colors" title="Verkleinern (Ctrl+-)">−</button>
            <span   onClick={zoomReset} className="text-[11px] font-bold text-slate-500 w-10 text-center cursor-pointer hover:text-spark-600">{zoomLevel}%</span>
            <button onClick={zoomIn}    className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-sm font-bold hover:bg-slate-200 transition-colors" title="Vergrößern (Ctrl++)">+</button>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM NAVIGATION ═══ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-lg safe-bottom">
        <div className="flex justify-around items-center px-2 pt-2 pb-1" role="tablist" aria-label="Hauptnavigation">
          {[
            ...visibleTabs.map(t => ({ id: t.id, label: t.label.split('-')[0].trim().slice(0, 10), icon: t.icon })),
            { id: 10, label: 'Settings', icon: '⚙' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              role="tab"
              aria-selected={tab === t.id}
              aria-label={t.label}
              className={'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ' + (tab === t.id ? 'text-spark-600' : 'text-slate-400')}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="text-lg leading-none" aria-hidden="true">{t.icon}</span>
              <span className="text-[9px] font-bold leading-none">{t.label}</span>
              {t.id === 4 && savedScenarios.length > 0 && (
                <span className="absolute top-1 right-1 bg-spark-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {savedScenarios.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MAIN CONTENT WITH ZOOM WRAPPER ═══ */}
      <div
        style={zoomScale !== 1 ? { zoom: zoomScale } : undefined}
        className="pb-20 md:pb-6"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 overflow-x-hidden">

          {/* Tab 0 — Optimierer */}
          {tab === 0 && <OptimiererTab {...allProps} />}

          {/* Tab 1 — Markt-Analyse */}
          {tab === 1 && <MarktAnalyseTab {...allProps} />}

          {/* Tab 2 — Portfolio-Review */}
          {tab === 2 && <PortfolioReviewTab {...allProps} />}

          {/* Tab 3 — Daten-Import */}
          {tab === 3 && <DatenImportTab {...allProps} />}

          {/* Tab 4 — Szenarien-Vergleich */}
          {tab === 4 && <SzenarienVergleichTab {...allProps} />}

          {/* Tab 5 — Anleitung */}
          {tab === 5 && <AnleitungTab {...allProps} />}

          {/* Tab 6 — Reporting */}
          {tab === 6 && <ReportingTab {...allProps} />}

          {/* Tab 7 — Deep-Dive */}
          {tab === 7 && <DeepDiveTab {...allProps} />}

          {/* Tab 8 — Export-Center */}
          {tab === 8 && <ExportCenterTab {...allProps} />}

          {/* Tab 9 — DZ Research */}
          {tab === 9 && <DZResearchTab {...allProps} />}

          {/* Tab 10 — Einstellungen */}
          {tab === 10 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h2 className="text-lg font-black text-slate-800">Einstellungen</h2>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-500">
                Einstellungs-Komponente wird extrahiert…
              </div>
            </div>
          )}

          {/* Tab 11 — Daten */}
          {tab === 11 && <DatenTab {...allProps} />}

        </div>

        {/* Footer */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 border-t border-slate-100 mt-4">
          <div className="text-[10px] text-slate-400 font-medium text-center">
            © 2026 Portfolio-Modellierung. Nur für institutionelle Zwecke.
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <IssuerDetailModal
        data={issuerModalData}
        onClose={() => setIssuerModalData(null)}
        onBondClick={openDetails}
      />
      <BondDetailModal
        bond={selectedBond}
        onClose={() => setSelectedBond(null)}
      />
      {presetEdit && (
        <PresetEditModal
          preset={presetEdit.mode === 'edit' ? presetEdit.preset : null}
          onSave={savePreset}
          onClose={() => setPresetEdit(null)}
          getCfg={getCurrentCfg}
          OBJ={OBJ}
        />
      )}
      {scenarioNamePrompt && (
        <ScenarioNameModal
          defaultName={scenarioNamePrompt.defaultName}
          defaultIcon={scenarioNamePrompt.icon}
          onSave={confirmSaveScenario}
          onClose={() => setScenarioNamePrompt(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Error boundary wraps MainApp so crashes show a recovery UI
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg shadow-xl text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-black text-slate-800">Engine Error</div>
            <p className="text-sm text-slate-500 mt-2">
              Ein Fehler ist aufgetreten: {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-rose-600 transition-all"
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
