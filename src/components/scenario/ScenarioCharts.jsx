import React from 'react';

export default function ScenarioCharts({ scenarios, bm }) {
  if (!scenarios.length || !bm) return null;
  const BM_COLOR = "#94a3b8";
  const allStats = [bm, ...scenarios.map(s => s.stats)];
  // Rating chart
  const allRatings = Array.from(new Set(allStats.flatMap(s => Object.keys(s.rc || {})))).sort((a, b) => (RS[a]||99) - (RS[b]||99));
  const ratingDs = [{ label: "BM", data: allRatings.map(r => +((bm.rc[r]||0)/bm.tN*100).toFixed(1)), backgroundColor: BM_COLOR, borderRadius: 3 },
    ...scenarios.map(sc => ({ label: sc.name, data: allRatings.map(r => +((sc.stats.rc[r]||0)/sc.stats.tN*100).toFixed(1)), backgroundColor: sc._color, borderRadius: 3 }))];
  const ratingRef = useChart(() => ({ type:'bar', data:{ labels: allRatings, datasets: ratingDs }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{beginAtZero:true,ticks:{callback:v=>v.toFixed(0).replace('.',',')+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{ticks:{font:{family:CHART_FONT,size:10,weight:'700'}},grid:{display:false}} } }) }), [scenarios, bm]);
  // Bucket chart
  const buckets = getActiveBuckets(bm, ...scenarios.map(s => s.stats));
  const bucketDs = [{ label: "BM", data: buckets.map(bk => +((bm.bc[bk]||0)/bm.tN*100).toFixed(1)), backgroundColor: BM_COLOR, borderRadius: 3 },
    ...scenarios.map(sc => ({ label: sc.name, data: buckets.map(bk => +((sc.stats.bc[bk]||0)/sc.stats.tN*100).toFixed(1)), backgroundColor: sc._color, borderRadius: 3 }))];
  const bucketRef = useChart(() => ({ type:'bar', data:{ labels: buckets, datasets: bucketDs }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{beginAtZero:true,ticks:{callback:v=>v.toFixed(0).replace('.',',')+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{ticks:{font:{family:CHART_FONT,size:10,weight:'600'}},grid:{display:false}} } }) }), [scenarios, bm]);
  // Country chart: Top 8
  const allCo = {};
  allStats.forEach(s => Object.entries(s.cc||{}).forEach(([c,v]) => { allCo[c] = (allCo[c]||0) + v; }));
  const topCo = Object.entries(allCo).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c])=>c);
  const coDs = [{ label: "BM", data: topCo.map(c => +((bm.cc[c]||0)/bm.tN*100).toFixed(1)), backgroundColor: BM_COLOR, borderRadius: 3 },
    ...scenarios.map(sc => ({ label: sc.name, data: topCo.map(c => +((sc.stats.cc[c]||0)/sc.stats.tN*100).toFixed(1)), backgroundColor: sc._color, borderRadius: 3 }))];
  const coRef = useChart(() => ({ type:'bar', data:{ labels: topCo.map(c => CN[c]||c), datasets: coDs }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{beginAtZero:true,ticks:{callback:v=>v.toFixed(0).replace('.',',')+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{ticks:{font:{family:CHART_FONT,size:10,weight:'600'}},grid:{display:false}} } }) }), [scenarios, bm]);
  // Seniority chart
  const RANKS = ["SP","SU","SNP","SEC","T2","AT1"];
  const RANK_KEYS = { SP:"spP", SU:"suP", SNP:"snpP", SEC:"secP", T2:"t2P", AT1:"at1P" };
  const activeRanks = RANKS.filter(r => allStats.some(s => (s[RANK_KEYS[r]]||0) > 0));
  const rankDs = [{ label: "BM", data: activeRanks.map(r => +((bm[RANK_KEYS[r]]||0)*100).toFixed(1)), backgroundColor: BM_COLOR, borderRadius: 3 },
    ...scenarios.map(sc => ({ label: sc.name, data: activeRanks.map(r => +((sc.stats[RANK_KEYS[r]]||0)*100).toFixed(1)), backgroundColor: sc._color, borderRadius: 3 }))];
  const rankRef = useChart(() => ({ type:'bar', data:{ labels: activeRanks, datasets: rankDs }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{beginAtZero:true,ticks:{callback:v=>v.toFixed(0).replace('.',',')+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{ticks:{font:{family:CHART_FONT,size:10,weight:'700'}},grid:{display:false}} } }) }), [scenarios, bm]);
  // Sektor chart
  const SEKTOR_LBL = { BANKS:"Banken", INSURANCE:"Versich.", FINANCIALS:"Finanz.", REITS:"REITs", OTHER:"Sonst." };
  const activeSektors = SEKTOR_CATS.filter(sk => allStats.some(st => (st[SEKTOR_STAT_KEY[sk]]||0) > 0));
  const sektorDs = [{ label: "BM", data: activeSektors.map(sk => +((bm[SEKTOR_STAT_KEY[sk]]||0)*100).toFixed(1)), backgroundColor: BM_COLOR, borderRadius: 3 },
    ...scenarios.map(sc => ({ label: sc.name, data: activeSektors.map(sk => +((sc.stats[SEKTOR_STAT_KEY[sk]]||0)*100).toFixed(1)), backgroundColor: sc._color, borderRadius: 3 }))];
  const sektorRef = useChart(() => ({ type:'bar', data:{ labels: activeSektors.map(sk => SEKTOR_LBL[sk]||sk), datasets: sektorDs }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{beginAtZero:true,ticks:{callback:v=>v.toFixed(0).replace('.',',')+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{ticks:{font:{family:CHART_FONT,size:10,weight:'700'}},grid:{display:false}} } }) }), [scenarios, bm]);
  // ESG chart: stacked bars Green vs Konventionell
  const esgLabels = ["BM", ...scenarios.map(sc => sc.name)];
  const esgGreen = [+(bm.gP*100).toFixed(1), ...scenarios.map(sc => +(sc.stats.gP*100).toFixed(1))];
  const esgConv = esgGreen.map(g => +(100-g).toFixed(1));
  const esgBgGreen = ["#94a3b8", ...scenarios.map(sc => sc._color)];
  const esgBgConv = esgBgGreen.map(c => c + "40");
  const esgRef = useChart(() => ({ type:'bar', data:{ labels: esgLabels, datasets: [
    { label: "ESG / Green", data: esgGreen, backgroundColor: esgBgGreen.map(c => c.length > 7 ? c : c + "CC"), borderRadius: { topLeft: 3, topRight: 3 } },
    { label: "Konventionell", data: esgConv, backgroundColor: esgBgConv, borderRadius: { bottomLeft: 3, bottomRight: 3 } }
  ] }, options: chartDefaults({ plugins:{ legend:{position:'bottom',labels:{font:{family:CHART_FONT,size:10,weight:'600'},usePointStyle:true,pointStyleWidth:8,padding:10}}, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(1).replace('.',',')+' %'}} }, scales:{ y:{stacked:true,beginAtZero:true,max:100,ticks:{callback:v=>v+' %',font:{family:CHART_FONT,size:10}},grid:{color:'#f1f5f9'}}, x:{stacked:true,ticks:{font:{family:CHART_FONT,size:10,weight:'700'}},grid:{display:false}} } }) }), [scenarios, bm]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Ratingverteilung (%)</div>
          <div style={{height:"280px"}}><canvas ref={ratingRef.canvasRef} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Laufzeitenverteilung (%)</div>
          <div style={{height:"280px"}}><canvas ref={bucketRef.canvasRef} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Länderverteilung (%, Top 8)</div>
          <div style={{height:"280px"}}><canvas ref={coRef.canvasRef} /></div>
        </div>
        {activeRanks.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Zahlungsrang (%)</div>
            <div style={{height:"280px"}}><canvas ref={rankRef.canvasRef} /></div>
          </div>
        )}
        {activeSektors.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Sektorverteilung (%)</div>
            <div style={{height:"280px"}}><canvas ref={sektorRef.canvasRef} /></div>
          </div>
        )}
      </div>
      {(bm.gP > 0 || scenarios.some(sc => (sc.stats?.gP || 0) > 0)) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">ESG-Anteil (%): Green vs Konventionell</div>
          <div style={{height:"260px"}}><canvas ref={esgRef.canvasRef} /></div>
        </div>
      )}
    </div>
  );
}
