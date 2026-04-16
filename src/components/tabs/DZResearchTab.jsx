// DZResearchTab.jsx — Tab 9: DZ Bank Research (Spread-Report)
import React from 'react';
import { BondTable } from '../tables/index.js';
import { Flag, MultiSelect } from '../layout/index.js';
import { DZ_EMITTENTEN_DATA } from '../../data/dzEmittenten.js';
import { DZ_SPREAD_BONDS } from '../../data/dzSpreadBonds.js';
import { MASTERLISTE_TICKERS } from '../../data/masterliste.js';
import { CN } from '../../data/countries.js';

// Constants — fallbacks for data that may not be extracted yet
const DZ_RATING_COLORS_DEFAULT = { LR: '#22c55e', MR: '#f59e0b', ER: '#ef4444', NR: '#94a3b8' };
const CT_COLORS_DEFAULT = { positiv: '#16a34a', stabil: '#64748b', negativ: '#dc2626', 'n.a.': '#94a3b8' };
const CT_ICONS_DEFAULT = { positiv: '\u2197', stabil: '\u2192', negativ: '\u2198', 'n.a.': '\u2013' };

export default function DZResearchTab(props) {
  const {
    dzIdxSort, setDzIdxSort,
    dzResTab, setDzResTab,
    dzEmRatingFilter, setDzEmRatingFilter,
    dzEmFUni, setDzEmFUni,
    dzEmFCo, setDzEmFCo,
    dzEmFCt, setDzEmFCt,
    dzEmFEsg, setDzEmFEsg,
    dzEmFilter, setDzEmFilter,
    dzEmSortKey, setDzEmSortKey,
    dzEmSortDir, setDzEmSortDir,
    dzBondsMemo,
  } = props;

  // Use props if provided, otherwise use imports/defaults
  const DZ_IBOXX_DATA = props.DZ_IBOXX_DATA || [];
  const dzSpreadBonds = DZ_SPREAD_BONDS || [];
  const dzEmitData = props.DZ_EMITTENTEN_DATA || DZ_EMITTENTEN_DATA || [];
  const DZ_RATING_COLORS = props.DZ_RATING_COLORS || DZ_RATING_COLORS_DEFAULT;
  const CT_COLORS = props.CT_COLORS || CT_COLORS_DEFAULT;
  const CT_ICONS = props.CT_ICONS || CT_ICONS_DEFAULT;
  const tickers = props.MASTERLISTE_TICKERS || MASTERLISTE_TICKERS || [];

  const fmtN = (v) => v == null ? "\u2013" : typeof v === "number" ? v.toLocaleString("de-DE") : v;
  const fmtD = (v) => v == null ? "\u2013" : (v > 0 ? "+" : "") + v.toFixed(1);
  const deltaColor = (v) => v == null ? "text-slate-400" : v > 0 ? "text-emerald-600" : v < 0 ? "text-rose-600" : "text-slate-400";

  const idxSort = dzIdxSort || { k: 0, d: -1 };
  const sortedIboxx = [...DZ_IBOXX_DATA].sort((a,b) => {
    const va = a[idxSort.k], vb = b[idxSort.k];
    if (typeof va === "string") return idxSort.d * va.localeCompare(vb);
    return idxSort.d * ((va||0) - (vb||0));
  });
  const doIdxSort = (k) => setDzIdxSort && setDzIdxSort(prev => prev.k === k ? {k, d: prev.d * -1} : {k, d: -1});

  const subTabs = [
    {id:"indizes", label:"Indizes", icon:"📊"},
    {id:"anleihen", label:"Anleihen", icon:"📋"},
    {id:"emittenten", label:"Emittenten", icon:"📑"}
  ];

  const currentSubTab = dzResTab || "indizes";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
          <span className="text-xl">🏦</span>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">DZ BANK Research</h2>
            <p className="text-xs text-slate-500 font-medium">Spread-Report Financials -- Stand: 18.03.2026</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
            <span>{DZ_IBOXX_DATA.length} Indizes</span>
            <span className="text-slate-300">|</span>
            <span>{dzSpreadBonds.length} Anleihen</span>
            <span className="text-slate-300">|</span>
            <span>{dzEmitData.length} Emittenten</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {subTabs.map(t => (
            <button key={t.id} onClick={() => setDzResTab && setDzResTab(t.id)}
              className={"px-4 py-2 text-xs font-bold rounded-xl border transition-all " +
                (currentSubTab === t.id
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700")}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab: Indizes */}
      {currentSubTab === "indizes" && (
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
                    <th key={c.k} onClick={() => doIdxSort(c.k)}
                      className={"px-3 py-2 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap text-" + c.al}
                      style={c.k===0?{minWidth:"260px"}:{minWidth:"80px"}}>
                      {c.l} {idxSort.k===c.k?(idxSort.d===1?"▲":"▼"):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedIboxx.map((row, i) => (
                  <tr key={i} className={"border-b border-slate-100 hover:bg-blue-50/50 transition-colors " + (i%2===0?"bg-white":"bg-slate-50/30")}>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{row[0]}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-700">{fmtN(row[1])}</td>
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

      {/* Sub-tab: Anleihen */}
      {currentSubTab === "anleihen" && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
          <BondTable bonds={dzBondsMemo || []} s={null} showN={false} onBondClick={() => {}}
            excludeCols={["md","lo","sp","mo","rw","yRw","msciEsg","lqa","call","branche","spEff","moEff","gldPrs","brfPrs","src","nom","wt","ln","waeh","sRw"]}
            excludeStats={["duration","ksarw","rating","renditerw"]}
            presets={[]} />
        </div>
      )}

      {/* Sub-tab: Emittenten */}
      {currentSubTab === "emittenten" && (() => {
        const emRatingFilter = dzEmRatingFilter || [];
        const emFUni = dzEmFUni || [];
        const emFCo = dzEmFCo || [];
        const emFCt = dzEmFCt || [];
        const emFEsg = dzEmFEsg || [];
        const doEmSort = (k) => { if (dzEmSortKey === k) setDzEmSortDir(d => d * -1); else { setDzEmSortKey(k); setDzEmSortDir(1); } };
        const emFiltered = dzEmitData.filter(e => {
          if (emRatingFilter.length && !emRatingFilter.includes(e.dz)) return false;
          const inUni = e.t && tickers.includes(e.t);
          if (emFUni.length) {
            if (emFUni.includes("IN") && !emFUni.includes("OUT") && !inUni) return false;
            if (emFUni.includes("OUT") && !emFUni.includes("IN") && inUni) return false;
          }
          if (emFCo.length && !emFCo.includes(e.co)) return false;
          if (emFCt.length && !emFCt.includes(e.ct)) return false;
          if (emFEsg.length && !emFEsg.includes(e.esg)) return false;
          if (!dzEmFilter) return true;
          const q = dzEmFilter.toLowerCase();
          return e.n.toLowerCase().includes(q) || e.co.toLowerCase().includes(q) || (CN[e.co]||"").toLowerCase().includes(q) || (e.t||"").toLowerCase().includes(q);
        }).sort((a,b) => {
          const va = a[dzEmSortKey] || "", vb = b[dzEmSortKey] || "";
          return (dzEmSortDir || 1) * va.localeCompare(vb);
        });
        const emInUniCount = dzEmitData.filter(e => e.t && tickers.includes(e.t)).length;
        return (
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">DZ BANK Emittenten-Kurzuebersicht</h3>
              <span className="text-xs text-slate-400">Stand: Spread-Report 18.03.2026</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <MultiSelect label="DZ-Rating" options={[{val:"LR",lbl:"LR - Low Risk"},{val:"MR",lbl:"MR - Moderate Risk"},{val:"ER",lbl:"ER - Elevated Risk"},{val:"NR",lbl:"NR - Not Rated"}]} selected={emRatingFilter} onChange={setDzEmRatingFilter} align="left" />
              <MultiSelect label="Universum" options={[{val:"IN",lbl:"Im Universum"},{val:"OUT",lbl:"Nicht im Universum"}]} selected={emFUni} onChange={setDzEmFUni} align="left" />
              <MultiSelect label="Land" options={[...new Set(dzEmitData.map(e=>e.co))].sort().map(c=>({val:c,lbl:CN[c]||c,co:c}))} selected={emFCo} onChange={setDzEmFCo} align="left" />
              <MultiSelect label="Trend" options={[{val:"positiv",lbl:"Positiv"},{val:"stabil",lbl:"Stabil"},{val:"negativ",lbl:"Negativ"},{val:"n.a.",lbl:"n.a."}]} selected={emFCt} onChange={setDzEmFCt} align="left" />
              <MultiSelect label="ESG" options={[{val:"Ja",lbl:"Ja"},{val:"Nein",lbl:"Nein"},{val:"-",lbl:"Nicht bewertet"}]} selected={emFEsg} onChange={setDzEmFEsg} align="left" />
              {(emRatingFilter.length||emFUni.length||emFCo.length||emFCt.length||emFEsg.length||dzEmFilter) && (
                <button onClick={()=>{setDzEmRatingFilter([]);setDzEmFUni([]);setDzEmFCo([]);setDzEmFCt([]);setDzEmFEsg([]);setDzEmFilter("");}}
                  className="px-2.5 py-1.5 text-xs text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 font-medium">x Zuruecksetzen</button>
              )}
              <input value={dzEmFilter || ""} onChange={e=>setDzEmFilter(e.target.value)} placeholder="Suche..." className="ml-auto px-3 py-1.5 text-xs border border-slate-200 rounded-lg w-48 focus:ring-1 focus:ring-blue-400 outline-none" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-1 py-1 text-[9px] text-slate-400 font-normal" colSpan="6"></th>
                    <th className="px-1 py-1 text-[9px] text-slate-400 font-normal text-center border-l border-slate-200" colSpan="3">Emittenten-Rating</th>
                    <th className="px-1 py-1 text-[9px] text-slate-400 font-normal text-center border-l border-slate-200" colSpan="3">SP Rating</th>
                    <th className="px-1 py-1 text-[9px] text-slate-400 font-normal text-center border-l border-slate-200" colSpan="3">SNP Rating</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[{k:"_uni",l:"V",w:"25px"},{k:"n",l:"Emittent",w:"170px"},{k:"co",l:"Land",w:"40px"},{k:"dz",l:"DZ",w:"30px"},{k:"ct",l:"Trend",w:"45px"},{k:"esg",l:"ESG",w:"30px"},
                      {k:"lr_mo",l:"Mo",w:"45px",bl:true},{k:"lr_sp",l:"S&P",w:"45px"},{k:"lr_fi",l:"Fi",w:"45px"},
                      {k:"sp_mo",l:"Mo",w:"45px",bl:true},{k:"sp_sp",l:"S&P",w:"45px"},{k:"sp_fi",l:"Fi",w:"45px"},
                      {k:"snp_mo",l:"Mo",w:"45px",bl:true},{k:"snp_sp",l:"S&P",w:"45px"},{k:"snp_fi",l:"Fi",w:"45px"}
                    ].map(c => (
                      <th key={c.k} onClick={()=>doEmSort(c.k)}
                        className={"px-1.5 py-1.5 text-center font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap text-[11px]" + (c.bl?" border-l border-slate-200":"")}
                        style={{minWidth:c.w}}>
                        {c.l} {dzEmSortKey===c.k?((dzEmSortDir||1)===1?"▲":"▼"):""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emFiltered.map((e,i) => {
                    const inUni = e.t && tickers.includes(e.t);
                    const splitR = (s) => { if (!s) return ["\u2013","\u2013","\u2013"]; const p = s.split("/"); return [p[0]||"\u2013",p[1]||"\u2013",p[2]||"\u2013"]; };
                    const [lrMo,lrSp,lrFi] = splitR(e.lr);
                    const [spMo,spSp,spFi] = splitR(e.sp);
                    const [snpMo,snpSp,snpFi] = splitR(e.snp);
                    const rc = "px-1.5 py-1 font-mono text-[10px] text-center ";
                    return (
                      <tr key={i} className={"border-b border-slate-100 hover:bg-blue-50/50 transition-colors " + (i%2===0?"bg-white":"bg-slate-50/30")}>
                        <td className="px-1 py-1 text-center">{inUni?<span className="text-emerald-500 font-bold">V</span>:<span className="text-amber-400">\u2013</span>}</td>
                        <td className="px-1.5 py-1 font-medium text-slate-800 truncate" style={{maxWidth:"180px"}}>{e.n}</td>
                        <td className="px-1.5 py-1 text-slate-500" title={CN[e.co]||e.co}><span className="flex items-center gap-1"><Flag c={e.co} />{e.co}</span></td>
                        <td className="px-1.5 py-1 text-center"><span className="px-1 py-0.5 rounded text-[9px] font-bold text-white" style={{backgroundColor:DZ_RATING_COLORS[e.dz]}}>{e.dz}</span></td>
                        <td className="px-1.5 py-1 text-center"><span style={{color:CT_COLORS[e.ct]}} className="font-bold">{CT_ICONS[e.ct]||"\u2013"}</span></td>
                        <td className="px-1.5 py-1 text-center text-[11px]">{e.esg==="Ja"?"Yes":e.esg==="Nein"?"No":"\u2013"}</td>
                        <td className={rc+"text-slate-700 border-l border-slate-100"}>{lrMo}</td>
                        <td className={rc+"text-slate-600"}>{lrSp}</td>
                        <td className={rc+"text-slate-600"}>{lrFi}</td>
                        <td className={rc+"text-slate-700 border-l border-slate-100"}>{spMo}</td>
                        <td className={rc+"text-slate-600"}>{spSp}</td>
                        <td className={rc+"text-slate-600"}>{spFi}</td>
                        <td className={rc+"text-slate-700 border-l border-slate-100"}>{snpMo}</td>
                        <td className={rc+"text-slate-600"}>{snpSp}</td>
                        <td className={rc+"text-slate-600"}>{snpFi}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
              <span>{emFiltered.length} von {dzEmitData.length} Emittenten</span>
              <span className="text-emerald-600 font-medium">V {emInUniCount} im Universum</span>
              <span className="text-amber-500 font-medium">! {dzEmitData.length - emInUniCount} nicht im Universum</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.LR}}></span> LR</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.MR}}></span> MR</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.ER}}></span> ER</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{backgroundColor:DZ_RATING_COLORS.NR}}></span> NR</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
