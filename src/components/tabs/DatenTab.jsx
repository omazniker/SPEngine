// DatenTab.jsx — Tab 11: Datenuebersicht (Bond-Universum, DZ-Emittenten, iBoxx-Indizes, DZ Spread-Bonds)
import React from 'react';
import { BondTable } from '../tables/index.js';
import { Flag } from '../layout/index.js';
import { DZ_EMITTENTEN_DATA } from '../../data/dzEmittenten.js';
import { DZ_SPREAD_BONDS } from '../../data/dzSpreadBonds.js';
import { CN } from '../../data/countries.js';

export default function DatenTab(props) {
  const {
    universe, globalMkt,
    activeDatasetId, datasets,
    dataSubTab, setDataSubTab,
    dataEmitSort, setDataEmitSort,
    dataEmitSearch, setDataEmitSearch,
    dataIdxSort, setDataIdxSort,
    dzBondsMemo,
    isSectionHidden,
    openDetails,
  } = props;

  // Use props if provided, otherwise use imports/defaults
  const dzEmitData = props.DZ_EMITTENTEN_DATA || DZ_EMITTENTEN_DATA || [];
  const DZ_IBOXX_DATA = props.DZ_IBOXX_DATA || [];
  const dzSpreadBonds = DZ_SPREAD_BONDS || [];
  const uni = universe || [];

  const currentSubTab = dataSubTab || "universum";
  const emitSort = dataEmitSort || { k: "n", d: 1 };
  const idxSort = dataIdxSort || { k: 0, d: -1 };

  const dataSubTabs = [
    { id: "universum", label: "Bond-Universum", icon: "📋", count: uni.length },
    { id: "emittenten", label: "Emittenten", icon: "🏦", count: dzEmitData.length },
    { id: "iboxx", label: "iBoxx-Indizes", icon: "📊", count: DZ_IBOXX_DATA.length },
    { id: "dz_bonds", label: "DZ Spread-Bonds", icon: "📑", count: dzSpreadBonds.length },
  ];

  const sortedEmit = [...dzEmitData].sort((a,b) => {
    const va = a[emitSort.k]||"", vb = b[emitSort.k]||"";
    return emitSort.d * String(va).localeCompare(String(vb));
  });
  const filteredEmit = dataEmitSearch
    ? sortedEmit.filter(e => (e.n||"").toLowerCase().includes(dataEmitSearch.toLowerCase()) || (e.t||"").toLowerCase().includes(dataEmitSearch.toLowerCase()))
    : sortedEmit;

  const sortedIdx = [...DZ_IBOXX_DATA].sort((a,b) => {
    const va = a[idxSort.k], vb = b[idxSort.k];
    if (typeof va === "string") return idxSort.d * va.localeCompare(vb);
    return idxSort.d * ((va||0) - (vb||0));
  });

  const doSort = (k) => setDataIdxSort && setDataIdxSort(p => p.k === k ? {k, d: p.d*-1} : {k, d: -1});
  const doEmitSort = (k) => setDataEmitSort && setDataEmitSort(p => p.k === k ? {k, d: p.d*-1} : {k, d: 1});

  const activeDs = (datasets || []).find(d => d.id === activeDatasetId);
  const dzColors = {
    LR: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MR: "bg-amber-50 text-amber-700 border-amber-200",
    ER: "bg-rose-50 text-rose-700 border-rose-200",
    NR: "bg-slate-50 text-slate-500 border-slate-200"
  };
  const trendColors = { positiv: "text-emerald-600", stabil: "text-slate-600", negativ: "text-rose-600" };
  const fmtD = (v) => v == null ? "\u2013" : (v > 0 ? "+" : "") + v.toFixed(1);
  const deltaColor = (v) => v == null ? "text-slate-400" : v > 0 ? "text-emerald-600" : v < 0 ? "text-rose-600" : "text-slate-400";

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
          <span className="text-xl">🗄️</span>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Datenuebersicht</h2>
            <p className="text-xs text-slate-500 font-medium">Alle Datentabellen der Portfolio Engine -- {activeDs ? activeDs.name : "Standard"}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-400">
            <span className="font-bold text-slate-600">{uni.length} Bonds</span>
            <span className="text-slate-300">|</span>
            <span>{new Set(uni.map(b => b.t)).size} Emittenten</span>
            <span className="text-slate-300">|</span>
            <span>{dzEmitData.length} DZ-Emittenten</span>
            <span className="text-slate-300">|</span>
            <span>{DZ_IBOXX_DATA.length} Indizes</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {dataSubTabs.map(t => (
            <button key={t.id} onClick={() => setDataSubTab && setDataSubTab(t.id)}
              className={"px-4 py-2 text-xs font-bold rounded-xl border transition-all " +
                (currentSubTab === t.id
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700")}>
              {t.icon} {t.label} <span className="ml-1 opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab: Bond-Universum */}
      {currentSubTab === "universum" && !(isSectionHidden && isSectionHidden("data_bonds")) && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-800">Bond-Universum</h3>
            <span className="text-xs text-slate-400">{uni.length} Anleihen -- {new Set(uni.map(b=>b.t)).size} Emittenten -- {new Set(uni.map(b=>b.co)).size} Laender</span>
          </div>
          <BondTable bonds={uni} s={globalMkt} showN={false} onBondClick={openDetails} />
        </div>
      )}

      {/* Sub-tab: DZ Emittenten */}
      {currentSubTab === "emittenten" && !(isSectionHidden && isSectionHidden("data_emittenten")) && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-800">DZ BANK Emittenten</h3>
              <span className="text-xs text-slate-400">{filteredEmit.length} von {dzEmitData.length} Emittenten</span>
            </div>
            <input type="text" value={dataEmitSearch || ""} onChange={e => setDataEmitSearch && setDataEmitSearch(e.target.value)} placeholder="Suche Emittent/Ticker..."
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-spark-500/20 focus:border-spark-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[{k:"t",l:"Ticker"},{k:"n",l:"Name"},{k:"co",l:"Land"},{k:"dz",l:"DZ-Rating"},{k:"ct",l:"Trend"},{k:"esg",l:"ESG"},{k:"lr",l:"Senior Ratings"},{k:"snp",l:"SNP Ratings"}].map(c => (
                    <th key={c.k} onClick={() => doEmitSort(c.k)}
                      className="px-3 py-2 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap text-left">
                      {c.l} {emitSort.k===c.k?(emitSort.d===1?"▲":"▼"):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmit.map((e, i) => (
                  <tr key={i} className={"border-b border-slate-100 hover:bg-blue-50/50 transition-colors " + (i%2===0?"bg-white":"bg-slate-50/30")}>
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-600">{e.t || "\u2013"}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{e.n}</td>
                    <td className="px-3 py-1.5"><div className="flex items-center gap-1"><Flag c={e.co} /><span className="text-slate-600">{CN[e.co]||e.co}</span></div></td>
                    <td className="px-3 py-1.5"><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold border " + (dzColors[e.dz]||dzColors.NR)}>{e.dz}</span></td>
                    <td className={"px-3 py-1.5 font-medium " + (trendColors[e.ct]||"text-slate-400")}>{e.ct||"\u2013"}</td>
                    <td className="px-3 py-1.5">{e.esg === "Ja" ? <span className="text-emerald-600 font-bold">V</span> : <span className="text-slate-300">\u2013</span>}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-500 font-mono">{e.lr||"\u2013"}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-500 font-mono">{e.snp||"\u2013"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab: iBoxx-Indizes */}
      {currentSubTab === "iboxx" && !(isSectionHidden && isSectionHidden("data_iboxx")) && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-800">iBoxx / iTraxx Spread-Indizes</h3>
            <span className="text-xs text-slate-400">{DZ_IBOXX_DATA.length} Indizes -- Spreads in Bp</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[{k:0,l:"Index",al:"left"},{k:1,l:"Aktuell",al:"right"},{k:2,l:"D1W",al:"right"},{k:3,l:"D1M",al:"right"},{k:4,l:"DYTD",al:"right"}].map(c => (
                    <th key={c.k} onClick={() => doSort(c.k)}
                      className={"px-3 py-2 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap text-" + c.al}
                      style={c.k===0?{minWidth:"260px"}:{minWidth:"80px"}}>
                      {c.l} {idxSort.k===c.k?(idxSort.d===1?"▲":"▼"):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedIdx.map((row, i) => (
                  <tr key={i} className={"border-b border-slate-100 hover:bg-blue-50/50 transition-colors " + (i%2===0?"bg-white":"bg-slate-50/30")}>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{row[0]}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-700">{row[1] != null ? row[1].toLocaleString("de-DE") : "\u2013"}</td>
                    <td className={"px-3 py-1.5 text-right font-mono font-semibold " + deltaColor(row[2])}>{fmtD(row[2])}</td>
                    <td className={"px-3 py-1.5 text-right font-mono font-semibold " + deltaColor(row[3])}>{fmtD(row[3])}</td>
                    <td className={"px-3 py-1.5 text-right font-mono font-semibold " + deltaColor(row[4])}>{fmtD(row[4])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab: DZ Spread-Bonds */}
      {currentSubTab === "dz_bonds" && !(isSectionHidden && isSectionHidden("data_dz_bonds")) && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-800">DZ Spread-Report Bonds</h3>
            <span className="text-xs text-slate-400">{(dzBondsMemo || []).length} Anleihen -- DZ BANK Spread-Report</span>
          </div>
          <BondTable bonds={dzBondsMemo || []} s={null} showN={false} onBondClick={openDetails}
            excludeCols={["nom"]} excludeStats={["volume"]} />
        </div>
      )}
    </div>
  );
}
