import React from 'react';

export default function ScenarioRVHeatmap({ scenarios, bm, bmBonds }) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const FULL_RATINGS = ['AAA','AA+','AA','AA-','A+','A','A-','BBB+','BBB','BBB-'];
  const FULL_BKTS = ["0-1Y","1-2Y","2-3Y","3-4Y","4-5Y","5-6Y","6-7Y","7-8Y","8-9Y","9-10Y","10-15Y","15Y+"];

  const bmGrid = React.useMemo(() => {
    const grid = {};
    FULL_RATINGS.forEach(r => { grid[r] = {}; FULL_BKTS.forEach(b => { grid[r][b] = { sum: 0, wt: 0 }; }); });
    (bmBonds || []).forEach(b => {
      if (!b.lo || !b.bkt || b.s == null) return;
      if (grid[b.lo] && grid[b.lo][b.bkt]) { const w = b.nom || b.vol || 1; grid[b.lo][b.bkt].sum += b.s * w; grid[b.lo][b.bkt].wt += w; }
    });
    FULL_RATINGS.forEach(r => FULL_BKTS.forEach(bk => { const c = grid[r][bk]; c.avg = c.wt > 0 ? c.sum / c.wt : null; }));
    return grid;
  }, [bmBonds]);

  const scGrids = React.useMemo(() => scenarios.map(sc => {
    const grid = {};
    FULL_RATINGS.forEach(r => { grid[r] = {}; FULL_BKTS.forEach(b => { grid[r][b] = { sum: 0, wt: 0 }; }); });
    (sc.bonds || []).forEach(b => {
      if (!b.lo || !b.bkt || b.s == null) return;
      if (grid[b.lo] && grid[b.lo][b.bkt]) { const w = b.nom || 1; grid[b.lo][b.bkt].sum += b.s * w; grid[b.lo][b.bkt].wt += w; }
    });
    FULL_RATINGS.forEach(r => FULL_BKTS.forEach(bk => { const c = grid[r][bk]; c.avg = c.wt > 0 ? c.sum / c.wt : null; }));
    return grid;
  }), [scenarios]);

  const diffGrid = React.useMemo(() => {
    if (!scGrids[activeIdx]) return null;
    const scGrid = scGrids[activeIdx]; const diffs = {}; let allDiffs = [];
    FULL_RATINGS.forEach(r => { diffs[r] = {};
      FULL_BKTS.forEach(bk => {
        const scAvg = scGrid[r][bk].avg, bmAvg = bmGrid[r][bk].avg;
        if (scAvg != null && bmAvg != null) { const d = scAvg - bmAvg; diffs[r][bk] = d; allDiffs.push(d); }
        else if (scAvg != null) { diffs[r][bk] = scAvg; allDiffs.push(scAvg); }
        else { diffs[r][bk] = null; }
      });
    });
    return { diffs, maxAbs: Math.max(1, ...allDiffs.map(Math.abs)) };
  }, [scGrids, activeIdx, bmGrid]);

  // Dynamic filtering: only show ratings/buckets with at least one value in any scenario or BM
  const activeRatings = React.useMemo(() => FULL_RATINGS.filter(r =>
    FULL_BKTS.some(bk => bmGrid[r]?.[bk]?.avg != null || scGrids.some(sg => sg[r]?.[bk]?.avg != null))
  ), [bmGrid, scGrids]);
  const activeBkts = React.useMemo(() => FULL_BKTS.filter(bk =>
    FULL_RATINGS.some(r => bmGrid[r]?.[bk]?.avg != null || scGrids.some(sg => sg[r]?.[bk]?.avg != null))
  ), [bmGrid, scGrids]);

  const aggRow = React.useMemo(() => {
    if (!diffGrid) return {};
    const agg = {};
    activeBkts.forEach(bk => { let s = 0, n = 0; activeRatings.forEach(r => { if (diffGrid.diffs[r]?.[bk] != null) { s += diffGrid.diffs[r][bk]; n++; } }); agg[bk] = n > 0 ? s / n : null; });
    return agg;
  }, [diffGrid, activeRatings, activeBkts]);
  const aggCol = React.useMemo(() => {
    if (!diffGrid) return {};
    const agg = {};
    activeRatings.forEach(r => { let s = 0, n = 0; activeBkts.forEach(bk => { if (diffGrid.diffs[r]?.[bk] != null) { s += diffGrid.diffs[r][bk]; n++; } }); agg[r] = n > 0 ? s / n : null; });
    return agg;
  }, [diffGrid, activeRatings, activeBkts]);

  const cellColor = (val, maxAbs) => {
    if (val == null) return '#f8fafc';
    const ratio = Math.min(Math.abs(val) / maxAbs, 1), alpha = 0.15 + ratio * 0.65;
    return val > 0 ? `rgba(16,185,129,${alpha})` : `rgba(239,68,68,${alpha})`;
  };
  if (!scenarios.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {scenarios.map((sc, i) => (
          <button key={sc.id} onClick={() => setActiveIdx(i)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeIdx === i ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={activeIdx === i ? { backgroundColor: sc._color } : {}}>
            {sc.icon} {sc.name}
          </button>
        ))}
      </div>
      {diffGrid && (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <div className="p-3 text-xs text-slate-500">
            <span className="font-bold">{scenarios[activeIdx]?.name}</span> vs. BM — Spread-Differenz (bp).
            <span className="text-emerald-600 font-bold ml-2">Gruen = mehr Spread</span>,
            <span className="text-red-600 font-bold ml-1">Rot = weniger Spread</span>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead><tr>
              <th className="p-1.5 text-left font-bold text-slate-500 bg-slate-50 sticky left-0 z-10">Rating</th>
              {activeBkts.map(bk => <th key={bk} className="p-1.5 text-center font-semibold text-slate-500 bg-slate-50 min-w-[52px]">{bk}</th>)}
              <th className="p-1.5 text-center font-bold text-slate-600 bg-slate-100 min-w-[50px]">Avg</th>
            </tr></thead>
            <tbody>
              {activeRatings.map(r => (
                <tr key={r}>
                  <td className="p-1.5 font-bold text-slate-600 bg-slate-50 sticky left-0 z-10">{r}</td>
                  {activeBkts.map(bk => {
                    const val = diffGrid.diffs[r]?.[bk];
                    return <td key={bk} className="p-1.5 text-center font-mono font-bold border border-white"
                      style={{ backgroundColor: cellColor(val, diffGrid.maxAbs), color: val == null ? '#cbd5e1' : val > 0 ? '#065f46' : '#991b1b' }}>
                      {val == null ? '—' : (val > 0 ? '+' : '') + val.toFixed(0)}
                    </td>;
                  })}
                  <td className="p-1.5 text-center font-mono font-bold bg-slate-100 border border-white"
                    style={{ color: aggCol[r] == null ? '#cbd5e1' : aggCol[r] > 0 ? '#065f46' : '#991b1b' }}>
                    {aggCol[r] == null ? '—' : (aggCol[r] > 0 ? '+' : '') + aggCol[r].toFixed(0)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100">
                <td className="p-1.5 font-bold text-slate-600 sticky left-0 z-10 bg-slate-100">Avg</td>
                {activeBkts.map(bk => (
                  <td key={bk} className="p-1.5 text-center font-mono font-bold border border-white"
                    style={{ color: aggRow[bk] == null ? '#cbd5e1' : aggRow[bk] > 0 ? '#065f46' : '#991b1b' }}>
                    {aggRow[bk] == null ? '—' : (aggRow[bk] > 0 ? '+' : '') + aggRow[bk].toFixed(0)}
                  </td>
                ))}
                <td className="p-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 px-1">
        <span>Farbskala:</span>
        <div className="flex items-center gap-1"><div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }}></div><span>Teuer</span></div>
        <div className="flex items-center gap-1"><div className="w-4 h-3 rounded bg-slate-100"></div><span>Neutral / kein Bond</span></div>
        <div className="flex items-center gap-1"><div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.7)' }}></div><span>Attraktiv</span></div>
      </div>
    </div>
  );
}
