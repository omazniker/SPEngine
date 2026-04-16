import React from 'react';

export default function ScenarioRiskPanel({ scenarios, bm, bmBonds }) {
  const [dyBp, setDyBp] = React.useState(0);
  const [dsBp, setDsBp] = React.useState(0);
  const [dnRating, setDnRating] = React.useState(0);

  const ratingSpreadMap = React.useMemo(() => {
    const map = {}, counts = {};
    (bmBonds || []).forEach(b => {
      if (!b.lo || !b.s) return;
      if (!map[b.lo]) { map[b.lo] = 0; counts[b.lo] = 0; }
      map[b.lo] += b.s; counts[b.lo]++;
    });
    Object.keys(map).forEach(k => { map[k] = counts[k] ? map[k] / counts[k] : 0; });
    return map;
  }, [bmBonds]);

  const RS_MAP = { AAA:1,"AA+":2,AA:3,"AA-":4,"A+":5,A:6,"A-":7,"BBB+":8,BBB:9,"BBB-":10 };
  const LBL_MAP = { 1:"AAA",2:"AA+",3:"AA",4:"AA-",5:"A+",6:"A",7:"A-",8:"BBB+",9:"BBB",10:"BBB-" };

  const calcImpact = React.useCallback((bonds, nom) => {
    let pnlYield = 0, pnlSpread = 0, pnlRating = 0;
    (bonds || []).forEach(b => {
      const md = b.md || 0, n = b.nom || 0;
      pnlYield += -md * (dyBp / 10000) * n;
      pnlSpread += -md * (dsBp / 10000) * n;
      if (dnRating > 0 && b.lo && RS_MAP[b.lo]) {
        const curNum = RS_MAP[b.lo], newNum = Math.min(curNum + dnRating, 10);
        const curSpread = ratingSpreadMap[b.lo] || b.s || 0;
        const newSpread = ratingSpreadMap[LBL_MAP[newNum]] || curSpread;
        pnlRating += -md * ((newSpread - curSpread) / 10000) * n;
      }
    });
    const total = pnlYield + pnlSpread + pnlRating;
    const d = nom > 0 ? nom : 1;
    return { pctYield: pnlYield / d * 100, pctSpread: pnlSpread / d * 100, pctRating: pnlRating / d * 100, pctTotal: total / d * 100 };
  }, [dyBp, dsBp, dnRating, ratingSpreadMap]);

  const impacts = React.useMemo(() => {
    const results = scenarios.map(sc => ({ name: sc.name, color: sc._color, ...calcImpact(sc.bonds, sc.stats?.tN || 0) }));
    return { scenarios: results, bm: { name: 'BM', color: '#94a3b8', ...calcImpact(bmBonds, bm?.tN || 0) } };
  }, [scenarios, bm, bmBonds, calcImpact]);

  const { canvasRef: barRef } = useChart(() => {
    if (!impacts.scenarios.length) return null;
    const all = impacts.scenarios;
    return { type: 'bar', data: {
      labels: all.map(i => i.name),
      datasets: [
        { label: 'Zins-Impact', data: all.map(i => i.pctYield), backgroundColor: all.map(i => '#3B82F6') },
        { label: 'Spread-Impact', data: all.map(i => i.pctSpread), backgroundColor: all.map(i => '#F59E0B') },
        { label: 'Rating-Impact', data: all.map(i => i.pctRating), backgroundColor: all.map(i => '#EF4444') },
      ]
    }, options: chartDefaults({ scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
      y: { stacked: true, ticks: { callback: v => v.toFixed(2) + ' %', font: { family: 'Inter', size: 11 } }, grid: { color: '#f1f5f9' } }
    }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw.toFixed(3) + ' %' } } } }) };
  }, [impacts]);

  const fx = (v, d = 2) => v.toFixed(d);
  const clr = v => v > 0.01 ? 'text-emerald-600' : v < -0.01 ? 'text-red-600' : 'text-slate-500';
  const noShift = dyBp === 0 && dsBp === 0 && dnRating === 0;

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Stress-Parameter</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">Zinsänderung</span>
              <span className={`font-bold ${dyBp > 0 ? 'text-red-600' : dyBp < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{dyBp > 0 ? '+' : ''}{dyBp} bp</span>
            </div>
            <input type="range" min="-100" max="100" step="5" value={dyBp} onChange={e => setDyBp(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <div className="flex justify-between text-[10px] text-slate-400"><span>-100 bp</span><span>0</span><span>+100 bp</span></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">Spread-Shift</span>
              <span className={`font-bold ${dsBp > 0 ? 'text-red-600' : dsBp < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{dsBp > 0 ? '+' : ''}{dsBp} bp</span>
            </div>
            <input type="range" min="-100" max="100" step="5" value={dsBp} onChange={e => setDsBp(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            <div className="flex justify-between text-[10px] text-slate-400"><span>-100 bp</span><span>0</span><span>+100 bp</span></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">Rating-Downgrade</span>
              <span className={`font-bold ${dnRating > 0 ? 'text-red-600' : 'text-slate-500'}`}>{dnRating === 0 ? 'Kein' : dnRating + ' Notch' + (dnRating > 1 ? 'es' : '')}</span>
            </div>
            <input type="range" min="0" max="3" step="1" value={dnRating} onChange={e => setDnRating(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
            <div className="flex justify-between text-[10px] text-slate-400"><span>0</span><span>1</span><span>2</span><span>3</span></div>
          </div>
        </div>
      </div>
      {noShift ? <div className="text-center text-slate-400 text-sm py-4">Bewege die Slider um Stress-Szenarien zu simulieren</div> : (
        <>
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left p-3 font-semibold text-slate-500">Szenario</th>
                <th className="text-right p-3 font-semibold text-blue-600">Δ Zins</th>
                <th className="text-right p-3 font-semibold text-amber-600">Δ Spread</th>
                <th className="text-right p-3 font-semibold text-red-600">Δ Rating</th>
                <th className="text-right p-3 font-semibold text-slate-700">Gesamt</th>
              </tr></thead>
              <tbody>
                {[impacts.bm, ...impacts.scenarios].map(imp => (
                  <tr key={imp.name} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-semibold" style={{ color: imp.color }}>{imp.name}</td>
                    <td className={`p-3 text-right font-mono ${clr(imp.pctYield)}`}>{fx(imp.pctYield, 3)}%</td>
                    <td className={`p-3 text-right font-mono ${clr(imp.pctSpread)}`}>{fx(imp.pctSpread, 3)}%</td>
                    <td className={`p-3 text-right font-mono ${clr(imp.pctRating)}`}>{fx(imp.pctRating, 3)}%</td>
                    <td className={`p-3 text-right font-mono font-bold ${clr(imp.pctTotal)}`}>{fx(imp.pctTotal, 3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">P&L Impact (%)</div>
            <div style={{ height: 260 }}><canvas ref={barRef}></canvas></div>
          </div>
        </>
      )}
    </div>
  );
}
