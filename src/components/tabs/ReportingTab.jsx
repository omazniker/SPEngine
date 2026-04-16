// ReportingTab.jsx — Tab 6: Reporting / Auswertungen (Report Slides, PPTX Export)
import React from 'react';
import { fmtVol } from '../../utils/format.js';

// Slide components are expected as props (not yet extracted to separate modules).
// Create a fallback stub for missing slide components.
const SlideStub = ({ name }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="text-slate-400 text-sm text-center py-8">
      Slide-Komponente <span className="font-bold text-slate-600">{name}</span> wird geladen...
    </div>
  </div>
);

export default function ReportingTab(props) {
  const {
    pS, pf,
    benchmarkRef, globalMkt,
    setTab, handleExportPPTX,
  } = props;

  // Use slide components from props, or fallback to stubs
  const Slide1_Summary = props.Slide1_Summary || (() => <SlideStub name="Summary" />);
  const Slide2_Rating = props.Slide2_Rating || (() => <SlideStub name="Rating" />);
  const Slide3_Maturity = props.Slide3_Maturity || (() => <SlideStub name="Maturity" />);
  const Slide4_Country = props.Slide4_Country || (() => <SlideStub name="Country" />);
  const Slide5_Issuer = props.Slide5_Issuer || (() => <SlideStub name="Issuer" />);
  const Slide6_Structure = props.Slide6_Structure || (() => <SlideStub name="Structure" />);
  const Slide7_Scatter = props.Slide7_Scatter || (() => <SlideStub name="Scatter" />);
  const Slide8_KpiTable = props.Slide8_KpiTable || (() => <SlideStub name="KPI Table" />);

  const bm = benchmarkRef || globalMkt;

  if (!pS || !pf || pf.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 sm:p-20 flex flex-col items-center justify-center text-slate-500">
        <div className="text-5xl mb-4">📈</div>
        <div className="text-lg font-black text-slate-700">Kein Portfolio vorhanden</div>
        <div className="text-sm mt-2 text-slate-500 text-center">Bitte erstellen Sie zunaechst ein Portfolio ueber den Optimierer.</div>
        <button onClick={() => setTab(0)} className="mt-6 px-6 py-3 bg-spark-50 text-spark-600 text-sm font-bold rounded-xl hover:bg-spark-100 transition-colors">Zum Optimierer</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="report-toolbar-bar flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-spark-500 to-spark-700 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg text-white">📈</div>
          <div>
            <div className="text-sm uppercase tracking-widest text-slate-800 font-black">Reporting</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{pS.nb} Anleihen | {pS.ni} Emittenten | {fmtVol(pS.tN)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPPTX} className="px-4 py-2.5 bg-gradient-to-r from-spark-500 to-spark-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <span>📥</span> PowerPoint
          </button>
          <button onClick={() => window.print()} className="px-3 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2">
            <span>🖨</span> Drucken
          </button>
        </div>
      </div>
      <Slide1_Summary pS={pS} bm={bm} pf={pf} />
      <Slide2_Rating pS={pS} bm={bm} />
      <Slide3_Maturity pS={pS} bm={bm} />
      <Slide4_Country pS={pS} bm={bm} />
      <Slide5_Issuer pS={pS} bm={bm} pf={pf} />
      <Slide6_Structure pS={pS} bm={bm} />
      <Slide7_Scatter pS={pS} pf={pf} />
      <Slide8_KpiTable pS={pS} bm={bm} />
    </div>
  );
}
