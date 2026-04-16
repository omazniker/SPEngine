import React from 'react';

export default function ScenarioOverlapPanel({ scenarios }) {
  const [filter, setFilter] = React.useState('all');
  const analysis = React.useMemo(() => {
    if (!scenarios.length) return null;
    const n = scenarios.length;
    const isinMap = {};
    scenarios.forEach(sc => {
      (sc.bonds || []).forEach(b => {
        if (!isinMap[b.isin]) isinMap[b.isin] = { scenarios: new Set(), bonds: {}, emittent: b.e, land: b.co };
        isinMap[b.isin].scenarios.add(sc.name);
        isinMap[b.isin].bonds[sc.name] = b;
      });
    });
    const bonds = Object.entries(isinMap).map(([isin, info]) => {
      const count = info.scenarios.size;
      const category = count === n ? 'core' : count === 1 ? 'exclusive' : 'partial';
      return { isin, emittent: info.emittent, land: info.land, scenarios: info.scenarios, bonds: info.bonds, category, count };
    });
    const allIsins = new Set(bonds.map(b => b.isin));
    const coreIsins = bonds.filter(b => b.category === 'core').map(b => b.isin);
    const jaccard = allIsins.size > 0 ? coreIsins.length / allIsins.size : 0;
    const volumeBreakdown = scenarios.map(sc => {
      const scBonds = bonds.filter(b => b.scenarios.has(sc.name));
      const coreVol = scBonds.filter(b => b.category === 'core').reduce((s, b) => s + (b.bonds[sc.name]?.nom || 0), 0);
      const partialVol = scBonds.filter(b => b.category === 'partial').reduce((s, b) => s + (b.bonds[sc.name]?.nom || 0), 0);
      const exclVol = scBonds.filter(b => b.category === 'exclusive').reduce((s, b) => s + (b.bonds[sc.name]?.nom || 0), 0);
      const total = coreVol + partialVol + exclVol;
      return { name: sc.name, color: sc._color, coreVol, partialVol, exclVol, total,
        corePct: total ? coreVol / total * 100 : 0, partialPct: total ? partialVol / total * 100 : 0, exclPct: total ? exclVol / total * 100 : 0 };
    });
    const issuerMap = {};
    bonds.forEach(b => {
      if (!issuerMap[b.emittent]) issuerMap[b.emittent] = { scenarios: new Set(), land: b.land };
      b.scenarios.forEach(s => issuerMap[b.emittent].scenarios.add(s));
    });
    const issuers = Object.entries(issuerMap).map(([name, info]) => {
      const count = info.scenarios.size;
      return { name, land: info.land, scenarios: info.scenarios, count, category: count === n ? 'core' : count === 1 ? 'exclusive' : 'partial' };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { bonds, jaccard, volumeBreakdown, issuers, totalBonds: allIsins.size, coreBonds: coreIsins.length };
  }, [scenarios]);

  if (!analysis || scenarios.length < 2) return <div className="text-center text-slate-400 py-8">Mindestens 2 Szenarien fuer Overlap-Analyse noetig</div>;
  const fx = (v, d = 1) => v.toFixed(d);
  const filtered = filter === 'all' ? analysis.bonds : analysis.bonds.filter(b => b.category === filter);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5 text-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Overlap-Score</div>
          <div className={`text-4xl font-black ${analysis.jaccard > 0.5 ? 'text-emerald-600' : analysis.jaccard > 0.2 ? 'text-amber-500' : 'text-red-500'}`}>{fx(analysis.jaccard * 100, 0)}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Jaccard-Index (Kern / Gesamt)</div>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Kern-Positionen</div>
          <div className="text-4xl font-black text-emerald-600">{analysis.coreBonds}</div>
          <div className="text-[11px] text-slate-400 mt-1">von {analysis.totalBonds} Anleihen in allen Szenarien</div>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Emittenten</div>
          <div className="text-4xl font-black text-blue-600">{analysis.issuers.filter(i => i.category === 'core').length}</div>
          <div className="text-[11px] text-slate-400 mt-1">von {analysis.issuers.length} gemeinsame Emittenten</div>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Volumen-Zusammensetzung</div>
        {analysis.volumeBreakdown.map(vb => (
          <div key={vb.name} className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: vb.color }}></span>
              <span className="text-xs font-semibold text-slate-700">{vb.name}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{fmtNum(vb.total)} EUR</span>
            </div>
            <div className="h-5 rounded-full bg-slate-100 flex overflow-hidden">
              {vb.corePct > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: vb.corePct + '%' }} title={'Kern: ' + fx(vb.corePct) + '%'}></div>}
              {vb.partialPct > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: vb.partialPct + '%' }} title={'Teilweise: ' + fx(vb.partialPct) + '%'}></div>}
              {vb.exclPct > 0 && <div className="h-full bg-red-400 transition-all" style={{ width: vb.exclPct + '%' }} title={'Exklusiv: ' + fx(vb.exclPct) + '%'}></div>}
            </div>
          </div>
        ))}
        <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1"></span>Kern (in allen)</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1"></span>Teilweise</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 mr-1"></span>Exklusiv</span>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[['all','Alle'],['core','Kern'],['partial','Teilweise'],['exclusive','Exklusiv']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label} ({k === 'all' ? analysis.bonds.length : analysis.bonds.filter(b => b.category === k).length})
          </button>
        ))}
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-500">Emittent</th>
              {scenarios.map(sc => <th key={sc.id} className="text-center p-2 font-semibold" style={{ color: sc._color }}>{sc.name}</th>)}
              <th className="text-center p-2 font-semibold text-slate-500">Kategorie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(b => (
              <tr key={b.isin} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2 text-slate-700 font-medium truncate max-w-[200px]" title={b.isin}>{b.emittent}</td>
                {scenarios.map(sc => (
                  <td key={sc.id} className="p-2 text-center">
                    {b.scenarios.has(sc.name) ? <span className="text-emerald-600 font-bold">{fx(b.bonds[sc.name]?.nom || 0, 1)}M</span> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
                <td className="p-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.category === 'core' ? 'bg-emerald-100 text-emerald-700' : b.category === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {b.category === 'core' ? 'Kern' : b.category === 'partial' ? 'Teilw.' : 'Exkl.'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && <div className="text-center text-xs text-slate-400 py-2">Zeige 100 von {filtered.length}</div>}
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 pb-1">Emittenten-Ueberlappung</div>
        <table className="w-full text-xs">
          <thead className="bg-slate-50"><tr>
            <th className="text-left p-2 font-semibold text-slate-500">Emittent</th>
            {scenarios.map(sc => <th key={sc.id} className="text-center p-2 font-semibold" style={{ color: sc._color }}>{sc.name}</th>)}
            <th className="text-center p-2 font-semibold text-slate-500">Kat.</th>
          </tr></thead>
          <tbody>
            {analysis.issuers.slice(0, 30).map(iss => (
              <tr key={iss.name} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2 text-slate-700 font-medium">{iss.name}</td>
                {scenarios.map(sc => (
                  <td key={sc.id} className="p-2 text-center">
                    {iss.scenarios.has(sc.name) ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
                <td className="p-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${iss.category === 'core' ? 'bg-emerald-100 text-emerald-700' : iss.category === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {iss.category === 'core' ? 'Kern' : iss.category === 'partial' ? 'Teilw.' : 'Exkl.'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
