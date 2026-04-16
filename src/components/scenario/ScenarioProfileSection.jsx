import React from 'react';

export default function ScenarioProfileSection({ scenarios, bm, bmBonds }) {
  if (!scenarios.length || !bm) return null;
  const BM_COLOR = "#94a3b8";

  // ── Radar Chart: normalize metrics to 0-100 scale ──
  const RADAR_AXES = [
    { key: "wY", label: "Rendite", up: true },
    { key: "wS", label: "Spread", up: true },
    { key: "wK", label: "Kupon", up: true },
    { key: "yRw", label: "R/RW", up: true },
    { key: "gP", label: "ESG", up: true, mult: 100 },
    { key: "wD", label: "Duration", up: false },
  ];
  const allVals = RADAR_AXES.map(ax => {
    const vals = [bm, ...scenarios.map(s => s.stats)].map(s => ax.mult ? (s[ax.key]||0)*ax.mult : (s[ax.key]||0));
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const range = mx - mn || 1;
    return { ...ax, min: mn, max: mx, range };
  });
  const normalize = (s, ax) => {
    const v = ax.mult ? (s[ax.key]||0)*ax.mult : (s[ax.key]||0);
    const pct = ((v - ax.min) / ax.range) * 100;
    return ax.up ? pct : (100 - pct);
  };
  const radarDs = [
    { label: "BM", data: allVals.map(ax => normalize(bm, ax)), borderColor: BM_COLOR, backgroundColor: BM_COLOR + "20", borderWidth: 2, pointRadius: 3, borderDash: [4,4] },
    ...scenarios.map(sc => ({
      label: sc.name, data: allVals.map(ax => normalize(sc.stats, ax)),
      borderColor: sc._color, backgroundColor: sc._color + "20", borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: sc._color
    }))
  ];
  const radarRef = useChart(() => ({ type: 'radar', data: { labels: allVals.map(a => a.label), datasets: radarDs },
    options: chartDefaults({
      plugins: { legend: { position: 'bottom', labels: { font: { family: CHART_FONT, size: 10, weight: '600' }, usePointStyle: true, pointStyleWidth: 8, padding: 10 } },
        tooltip: { callbacks: { label: ctx => { const ax = allVals[ctx.dataIndex]; const sc = ctx.datasetIndex === 0 ? bm : scenarios[ctx.datasetIndex-1].stats; const v = ax.mult ? (sc[ax.key]||0)*ax.mult : (sc[ax.key]||0); return ctx.dataset.label + ': ' + fx(v, 2) + (ax.key==='wS'?' bp':ax.key==='wD'?'':'%'); } } } },
      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false, stepSize: 25 }, grid: { color: '#e2e8f0' }, angleLines: { color: '#e2e8f0' }, pointLabels: { font: { family: CHART_FONT, size: 11, weight: '700' }, color: '#475569' } } }
    })
  }), [scenarios, bm]);

  // ── Risk-Return Scatter: each scenario as one point ──
  const rrDs = [
    { label: "BM", data: [{ x: bm.wD, y: bm.wY }], backgroundColor: BM_COLOR, borderColor: BM_COLOR, pointRadius: 10, pointStyle: 'rectRot', borderWidth: 2 },
    ...scenarios.map(sc => ({
      label: sc.name, data: [{ x: sc.stats.wD, y: sc.stats.wY }],
      backgroundColor: sc._color + "80", borderColor: sc._color, pointRadius: 12, pointStyle: 'circle', borderWidth: 2.5
    }))
  ];
  const rrRef = useChart(() => ({ type: 'scatter', data: { datasets: rrDs },
    options: chartDefaults({
      plugins: { legend: { position: 'bottom', labels: { font: { family: CHART_FONT, size: 10, weight: '600' }, usePointStyle: true, pointStyleWidth: 10, padding: 10 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': Duration ' + fx(ctx.parsed.x, 2) + ', Rendite ' + fx(ctx.parsed.y, 2).replace('.',',') + '%' } } },
      scales: {
        x: { title: { display: true, text: 'Mod. Duration (Risiko)', font: { family: CHART_FONT, size: 11, weight: '700' }, color: '#64748b' }, grid: { color: '#f1f5f9' }, ticks: { font: { family: CHART_FONT, size: 10 } } },
        y: { title: { display: true, text: 'Rendite % (Return)', font: { family: CHART_FONT, size: 11, weight: '700' }, color: '#64748b' }, grid: { color: '#f1f5f9' }, ticks: { callback: v => v.toFixed(1).replace('.',',') + ' %', font: { family: CHART_FONT, size: 10 } } }
      }
    })
  }), [scenarios, bm]);

  // ── Yield/Spread Curve per Bucket ──
  const buckets = getActiveBuckets(bm, ...scenarios.map(s => s.stats));
  // Build bucket-level spread data from bond-level data
  const buildBucketData = (scenariosArr) => {
    return scenariosArr.map(item => {
      const bonds = item.bonds || [];
      const bucketData = {};
      buckets.forEach(bkt => {
        const bktBonds = bonds.filter(b => {
          const m = b.mty;
          if (bkt === "0-1Y") return m < 1;
          if (bkt === "1-2Y") return m >= 1 && m < 2;
          if (bkt === "2-3Y") return m >= 2 && m < 3;
          if (bkt === "3-4Y") return m >= 3 && m < 4;
          if (bkt === "4-5Y") return m >= 4 && m < 5;
          if (bkt === "5-6Y") return m >= 5 && m < 6;
          if (bkt === "6-7Y") return m >= 6 && m < 7;
          if (bkt === "7-8Y") return m >= 7 && m < 8;
          if (bkt === "8-10Y") return m >= 8 && m < 10;
          if (bkt === "10Y+") return m >= 10;
          return false;
        });
        if (bktBonds.length > 0) {
          const totalNom = bktBonds.reduce((s, b) => s + (b.nom || 1), 0);
          bucketData[bkt] = bktBonds.reduce((s, b) => s + (b.s || 0) * (b.nom || 1), 0) / totalNom;
        } else {
          bucketData[bkt] = null;
        }
      });
      return { ...item, bucketData };
    });
  };
  const bmBucketInfo = buildBucketData([{ bonds: bmBonds || [], stats: bm, name: "BM" }])[0];
  const scBucketInfo = buildBucketData(scenarios);
  const curveDs = [
    { label: "BM", data: buckets.map(bkt => bmBucketInfo.bucketData[bkt]), borderColor: BM_COLOR, backgroundColor: BM_COLOR + "20", borderDash: [4,4], borderWidth: 2, pointRadius: 4, fill: false, tension: 0.3, spanGaps: true },
    ...scBucketInfo.map(sc => ({
      label: sc.name, data: buckets.map(bkt => sc.bucketData[bkt]),
      borderColor: sc._color, backgroundColor: sc._color + "20", borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: sc._color, fill: false, tension: 0.3, spanGaps: true
    }))
  ];
  const curveRef = useChart(() => ({ type: 'line', data: { labels: buckets, datasets: curveDs },
    options: chartDefaults({
      plugins: { legend: { position: 'bottom', labels: { font: { family: CHART_FONT, size: 10, weight: '600' }, usePointStyle: true, pointStyleWidth: 8, padding: 10 } },
        tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1).replace('.',',') + ' bp' : ctx.dataset.label + ': n/a' } } },
      scales: {
        x: { title: { display: true, text: 'Laufzeit-Bucket', font: { family: CHART_FONT, size: 11, weight: '700' }, color: '#64748b' }, grid: { display: false }, ticks: { font: { family: CHART_FONT, size: 10, weight: '600' } } },
        y: { title: { display: true, text: 'Ø Spread (bp)', font: { family: CHART_FONT, size: 11, weight: '700' }, color: '#64748b' }, grid: { color: '#f1f5f9' }, ticks: { callback: v => v.toFixed(0).replace('.',',') + ' bp', font: { family: CHART_FONT, size: 10 } } }
      }
    })
  }), [scenarios, bm]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Szenario-Profil (Radar)</div>
          <div style={{height:"340px"}}><canvas ref={radarRef.canvasRef} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Rendite vs. Duration (Risk-Return)</div>
          <div style={{height:"340px"}}><canvas ref={rrRef.canvasRef} /></div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Spread-Kurve je Laufzeit-Bucket</div>
        <div style={{height:"280px"}}><canvas ref={curveRef.canvasRef} /></div>
      </div>
    </div>
  );
}
