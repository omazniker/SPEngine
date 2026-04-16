import React from 'react';

export default function ScenarioConstraintPanel({ scenarios, bm }) {
  const constraintDefs = React.useMemo(() => [
    { key: 'budget', label: 'Budget', icon: '💼', unit: '',
      getLimit: cfg => cfg.budget || 200, getActual: st => st.tN || 0, fmt: v => fmtNum(v) },
    { key: 'maxIss', label: 'Max. / Emittent', icon: '🏢', unit: '',
      getLimit: cfg => cfg.maxIssNominal || cfg.maxBondNom || Infinity,
      getActual: st => { const v = Object.values(st.ic || {}); return v.length ? Math.max(...v) : 0; }, fmt: v => fmtNum(v) },
    { key: 'maxCo', label: 'Max. / Land', icon: '🌍', unit: '%',
      getLimit: cfg => cfg.maxCo || 100,
      getActual: st => { const v = Object.values(st.cc || {}); const t = st.tN || 1; return v.length ? Math.max(...v) / t * 100 : 0; }, fmt: v => v.toFixed(1) },
    { key: 'minESG', label: 'Min. ESG-Quote', icon: '🌱', unit: '%', invert: true,
      getLimit: cfg => cfg.minGreen || 0, getActual: st => (st.gP || 0) * 100, fmt: v => v.toFixed(1) },
    ...RATING_LABELS.filter(rtg => rtg.startsWith("BBB")).map(rtg => ({
      key: `rtg_${rtg}`, label: `Max. ${rtg}`, icon: '⚖️', unit: '%',
      getLimit: cfg => { const rl = cfg.ratingLimits || {}; if (!catEnabled(rl, rtg)) return 0; const mm = catMinMax(rl, rtg); return mm.max != null ? mm.max : 100; },
      getActual: st => { const rc = st.rc || {}; return (rc[rtg]||0) / (st.tN||1) * 100; }, fmt: v => v.toFixed(1) })),
    ...RANK_CATS.map(cat => ({
      key: `rk_${cat}`, label: `Max. ${cat}`, icon: '📊', unit: '%',
      getLimit: cfg => { const rl = cfg.rankLimits || {}; if (!catEnabled(rl, cat)) return 0; const mm = catMinMax(rl, cat); return mm.max != null ? mm.max : 100; },
      getActual: st => (st[RANK_STAT_KEY[cat]] || 0) * 100, fmt: v => v.toFixed(1) })),
    ...STRUKTUR_CATS.map(cat => ({
      key: `st_${cat}`, label: `Max. ${STRUKTUR_SHORT[cat]}`, icon: '📞', unit: '%',
      getLimit: cfg => { const sl = cfg.strukturLimits || {}; if (!catEnabled(sl, cat)) return 0; const mm = catMinMax(sl, cat); return mm.max != null ? mm.max : 100; },
      getActual: st => (st[STRUKTUR_STAT_KEY[cat]] || 0) * 100, fmt: v => v.toFixed(1) })),
    ...KUPON_CATS.map(cat => ({
      key: `kp_${cat}`, label: `Max. ${KUPON_SHORT[cat]}`, icon: '🎵', unit: '%',
      getLimit: cfg => { const kl = cfg.kuponLimits || {}; if (!catEnabled(kl, cat)) return 0; const mm = catMinMax(kl, cat); return mm.max != null ? mm.max : 100; },
      getActual: st => (st[KUPON_STAT_KEY[cat]] || 0) * 100, fmt: v => v.toFixed(1) })),
    ...SEKTOR_CATS.map(cat => ({
      key: `sk_${cat}`, label: `${SEKTOR_SHORT[cat]}`, icon: '🏢', unit: '%',
      getLimit: cfg => { const sl = cfg.sektorLimits || {}; if (!catEnabled(sl, cat)) return 0; const mm = catMinMax(sl, cat); return mm.max != null ? mm.max : 100; },
      getActual: st => (st[SEKTOR_STAT_KEY[cat]] || 0) * 100, fmt: v => v.toFixed(1) })),
  ], []);

  const analysis = React.useMemo(() => scenarios.map(sc => {
    const cfg = sc.cfg || {}, st = sc.stats || {};
    const results = constraintDefs.map(c => {
      const limit = c.getLimit(cfg), actual = c.getActual(st);
      let util = c.invert ? (limit > 0 ? (limit / Math.max(actual, 0.01)) * 100 : 0) : (limit > 0 && limit < Infinity ? (actual / limit) * 100 : 0);
      util = Math.min(util, 120);
      const status = util >= 95 ? 'binding' : util >= 80 ? 'near' : 'loose';
      return { ...c, limit, actual, util, status };
    }).filter(c => c.limit > 0 && c.limit < Infinity);
    return { name: sc.name, color: sc._color, icon: sc.icon, results,
      binding: results.filter(r => r.status === 'binding').length,
      near: results.filter(r => r.status === 'near').length,
      loose: results.filter(r => r.status === 'loose').length };
  }), [scenarios, constraintDefs]);

  if (!scenarios.length) return null;

  return (
    <div className="space-y-5">
      <div className={`grid gap-3 ${scenarios.length >= 3 ? 'grid-cols-3' : scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {analysis.map(sc => (
          <div key={sc.name} className="bg-white border rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }}></span>
              <span className="text-xs font-bold text-slate-700">{sc.icon} {sc.name}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {sc.binding > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">🔴 {sc.binding} bindend</span>}
              {sc.near > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">🟡 {sc.near} nahe</span>}
              {sc.loose > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">🟢 {sc.loose} locker</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Restriktions-Auslastung</div>
        {constraintDefs.filter(c => analysis.some(sc => sc.results.find(r => r.key === c.key))).map(c => (
          <div key={c.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">{c.icon}</span>
              <span className="text-xs font-semibold text-slate-700">{c.label}</span>
            </div>
            {analysis.map(sc => {
              const r = sc.results.find(r => r.key === c.key);
              if (!r) return null;
              const bw = Math.min(r.util, 100);
              return (
                <div key={sc.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sc.color }}></span>
                  <span className="text-[10px] text-slate-500 w-28 truncate">{sc.name}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${r.status === 'binding' ? 'bg-red-400' : r.status === 'near' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: bw + '%' }}></div>
                    <div className="absolute top-0 h-full w-px bg-red-300" style={{ left: '95%' }}></div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold w-24 text-right ${r.status === 'binding' ? 'text-red-600' : r.status === 'near' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {r.fmt(r.actual)} / {r.limit === Infinity ? '∞' : r.fmt(r.limit)}{r.unit === '%' ? '%' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
