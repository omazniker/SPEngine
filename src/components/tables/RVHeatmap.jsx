import React, { useState, useMemo } from 'react';

export default function RVHeatmap({ bonds, onBondClick }) {
  const [colorMetric, setColorMetric] = useState("s");
  const [hoveredCell, setHoveredCell] = useState(null);
  const [sortBy, setSortBy] = useState("spread");
  const METRICS = { s: { label: "I-Spread (bp)", fmt: (v) => fx(v, 1), unit: " bp" }, y: { label: "Rendite (%)", fmt: (v) => fx(v, 2), unit: "%" }, yRw: { label: "Rendite / RW", fmt: (v) => fx(v, 2), unit: "" } };
  const BUCKETS = ["0-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "8-10Y", "10Y+"];
  const toBucket = (mty) => { if (mty < 2) return "0-2Y"; if (mty < 3) return "2-3Y"; if (mty < 4) return "3-4Y"; if (mty < 5) return "4-5Y"; if (mty < 6) return "5-6Y"; if (mty < 7) return "6-7Y"; if (mty < 8) return "7-8Y"; if (mty < 10) return "8-10Y"; return "10Y+"; };
  const { grid, issuers, activeBuckets, globalMin, globalMax, ratingPeers } = useMemo(() => {
    if (!bonds || bonds.length === 0) return { grid: {}, issuers: [], activeBuckets: [], globalMin: 0, globalMax: 0, ratingPeers: {} };
    const g = {}; const rp = {};
    bonds.forEach(b => {
      const bkt = toBucket(b.mty);
      if (!g[b.t]) g[b.t] = { ticker: b.t, emittent: b.e, co: b.co, lo: b.lo, ln: b.ln, rank: b.rank, cells: {}, avgSpread: 0, count: 0 };
      if (!g[b.t].cells[bkt]) g[b.t].cells[bkt] = [];
      g[b.t].cells[bkt].push(b);
      g[b.t].count++;
      const rKey = b.lo + "_" + bkt;
      if (!rp[rKey]) rp[rKey] = [];
      rp[rKey].push(b[colorMetric]);
    });
    Object.values(g).forEach(iss => {
      let sum = 0, n = 0;
      Object.values(iss.cells).forEach(arr => arr.forEach(b => { sum += b[colorMetric]; n++; }));
      iss.avgSpread = n > 0 ? sum / n : 0;
    });
    const ab = BUCKETS.filter(bkt => Object.values(g).some(iss => iss.cells[bkt]));
    let min = Infinity, max = -Infinity;
    bonds.forEach(b => { const v = b[colorMetric]; if (v < min) min = v; if (v > max) max = v; });
    let sorted = Object.values(g);
    if (sortBy === "spread") sorted.sort((a, b) => b.avgSpread - a.avgSpread);
    else if (sortBy === "name") sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
    else if (sortBy === "rating") sorted.sort((a, b) => a.ln - b.ln || b.avgSpread - a.avgSpread);
    else if (sortBy === "count") sorted.sort((a, b) => b.count - a.count);
    return { grid: g, issuers: sorted, activeBuckets: ab, globalMin: min, globalMax: max, ratingPeers: rp };
  }, [bonds, colorMetric, sortBy]);
  const getColor = (val) => {
    if (val == null || isNaN(val)) return "bg-slate-50";
    const range = globalMax - globalMin || 1;
    const pct = (val - globalMin) / range;
    const r = Math.round(pct < 0.5 ? pct * 2 * 220 : 220);
    const g = Math.round(pct < 0.5 ? 180 + (1 - pct * 2) * 40 : 220 * (1 - (pct - 0.5) * 2));
    const b = Math.round(pct < 0.5 ? 80 : 60);
    return `rgb(${r},${g},${b})`;
  };
  const getRVSignal = (bond, bkt) => {
    const rKey = bond.lo + "_" + bkt;
    const peers = ratingPeers[rKey];
    if (!peers || peers.length < 2) return null;
    const avg = peers.reduce((a, b) => a + b, 0) / peers.length;
    const diff = bond[colorMetric] - avg;
    const threshold = colorMetric === "s" ? 8 : 0.05;
    if (diff > threshold) return "cheap";
    if (diff < -threshold) return "rich";
    return "fair";
  };
  if (!bonds || bonds.length === 0 || issuers.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Relative Value Heatmap</h3>
            <p className="text-[10px] text-slate-500">{issuers.length} Emittenten × {activeBuckets.length} Laufzeitbuckets · Farbe = {METRICS[colorMetric].label}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(METRICS).map(([k, m]) => (
            <button key={k} onClick={() => setColorMetric(k)} className={"px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all " + (colorMetric === k ? "bg-spark-500 text-white border-spark-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-spark-300")}>{m.label}</button>
          ))}
          <span className="w-px bg-slate-200 mx-0.5"></span>
          {[["spread","Spread ↓"],["rating","Rating"],["name","A-Z"],["count","Anzahl"]].map(([k,l]) => (
            <button key={k} onClick={() => setSortBy(k)} className={"px-2 py-1 text-[10px] font-bold rounded-md border transition-all " + (sortBy === k ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>{l}</button>
          ))}
        </div>
      </div>
      {/* Color Legend */}
      <div className="flex items-center gap-2 mb-3 text-[10px] text-slate-500">
        <span className="font-bold">Skala:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: getColor(globalMin) }}></div>
          <span>{METRICS[colorMetric].fmt(globalMin)} {METRICS[colorMetric].unit}</span>
        </div>
        <div className="w-16 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${getColor(globalMin)}, ${getColor((globalMin + globalMax) / 2)}, ${getColor(globalMax)})` }}></div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: getColor(globalMax) }}></div>
          <span>{METRICS[colorMetric].fmt(globalMax)} {METRICS[colorMetric].unit}</span>
        </div>
        <span className="ml-2">|</span>
        <span className="ml-1">RV-Signal:</span>
        <span className="text-slate-500 font-bold">▲ Rich</span>
        <span className="text-slate-400">● Fair</span>
        <span className="text-rose-600 font-bold">▼ Cheap</span>
      </div>
      {/* Heatmap Grid */}
      <div className="overflow-x-auto overflow-y-auto max-h-[35vh] md:max-h-[50vh] scrollbar-thin">
        <table className="w-full text-[10px] border-collapse">
          <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-50 text-left px-2 py-1.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 min-w-[140px]">Emittent</th>
              <th className="bg-slate-50 text-center px-1 py-1.5 font-bold text-slate-400 border-b border-slate-200 w-8">Rating</th>
              {activeBuckets.map(bkt => (
                <th key={bkt} className="bg-slate-50 text-center px-1 py-1.5 font-bold text-slate-500 border-b border-slate-200 min-w-[52px]">{bkt}</th>
              ))}
              <th className="bg-slate-50 text-center px-2 py-1.5 font-bold text-slate-500 border-b border-slate-200 min-w-[52px]">Ø</th>
            </tr>
          </thead>
          <tbody>
            {issuers.map((iss, idx) => (
              <tr key={iss.t} className={"transition-colors " + (idx % 2 === 0 ? "" : "bg-slate-50/30")}>
                <td className="sticky left-0 z-10 bg-white px-2 py-1 font-bold text-slate-700 border-b border-slate-100 truncate max-w-[160px]" title={iss.emittent}>
                  <div className="flex items-center gap-1.5">
                    <Flag c={iss.co} />
                    <span className="truncate">{iss.ticker}</span>
                    {iss.ranks && iss.ranks !== "SP" && <span className={"text-[8px] px-1 rounded font-bold " + (iss.ranks.includes("SNP") ? "bg-slate-200 text-slate-700" : iss.ranks.includes("SU") ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>{iss.ranks}</span>}
                  </div>
                </td>
                <td className="text-center py-1 border-b border-slate-100">
                  <span className={"font-bold px-1 rounded text-[9px] " + (iss.ln <= 4 ? "text-slate-700" : iss.ln <= 7 ? "text-spark-600" : "text-slate-600")}>{iss.lo}</span>
                </td>
                {activeBuckets.map(bkt => {
                  const cellBonds = iss.cells[bkt];
                  if (!cellBonds || cellBonds.length === 0) {
                    return <td key={bkt} className="text-center py-1 border-b border-slate-100 text-slate-200">—</td>;
                  }
                  const avgVal = cellBonds.reduce((a, b) => a + b[colorMetric], 0) / cellBonds.length;
                  const bestBond = [...cellBonds].sort((a, b) => b[colorMetric] - a[colorMetric])[0];
                  const rv = getRVSignal(bestBond, bkt);
                  const isHovered = hoveredCell === iss.ticker + "_" + bkt;
                  return (
                    <td key={bkt} className="text-center py-0.5 border-b border-slate-100 relative cursor-pointer"
                      onMouseEnter={() => setHoveredCell(iss.ticker + "_" + bkt)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => { if (onBondClick) { if (cellBonds.length === 1) onBondClick(cellBonds[0]); else onBondClick(bestBond); } }}>
                      <div className={"rounded px-0.5 py-1 mx-0.5 font-bold tabular-nums transition-all " + (isHovered ? "ring-2 ring-spark-500 scale-105" : "")}
                        style={{ background: getColor(avgVal), color: avgVal > (globalMin + globalMax) * 0.65 ? "#fff" : "#1e293b" }}>
                        {METRICS[colorMetric].fmt(avgVal)}
                        {rv && rv !== "fair" && <span className={"block text-[8px] font-black " + (rv === "cheap" ? "text-rose-100" : "text-slate-200")}>{rv === "cheap" ? "▼ Cheap" : "▲ Rich"}</span>}
                        {cellBonds.length > 1 && <span className="block text-[7px] opacity-60">{cellBonds.length} Bonds</span>}
                      </div>
                      {/* Tooltip */}
                      {isHovered && (
                        <div className={"absolute z-40 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg p-2.5 text-left shadow-xl whitespace-nowrap " + (idx < 3 ? "top-full mt-1" : "bottom-full mb-1")} style={{ minWidth: 200 }}>
                        {cellBonds.map(b => (
                        <div key={b.id} onClick={(e) => { e.stopPropagation(); if (onBondClick) onBondClick(b); }} className="flex items-center justify-between gap-3 py-0.5 border-b border-slate-700 last:border-0 hover:bg-slate-700 rounded px-1 -mx-1 cursor-pointer transition-colors">
                        <span className="text-[9px] font-medium text-slate-300 truncate max-w-[100px]">{b.isin}</span>
                        <span className="text-[9px] font-bold tabular-nums">{fx(b.k, 3)}% / {fx(b.mty, 1)} Y</span>
                        <span className="text-[9px] font-black text-slate-300 tabular-nums">{fx(b.s, 1)} bp</span>
                        <span className="text-[9px] font-bold text-slate-300 tabular-nums">{fx(b.y, 2)}%</span>
                        </div>
                        ))}
                        <div className="text-[8px] text-slate-400 mt-1 text-center">Klick für Details</div>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="text-center py-1 border-b border-slate-100">
                  <span className="font-black text-slate-700 tabular-nums">{METRICS[colorMetric].fmt(iss.avgSpread)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[9px] text-slate-400 mt-2 text-right">RV-Signal: Abweichung vom Rating-Peer-Durchschnitt pro Bucket ({colorMetric === "s" ? ">" : ">"}8 Basispunkte = Cheap/Rich)</div>
    </div>
  );
}
