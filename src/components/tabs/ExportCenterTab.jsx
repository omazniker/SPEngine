import React from 'react';
import { lsLoad, lsSave } from '../../utils/storage.js';
// ExportCenterTab.jsx — Tab 8: Export-Center
// Corresponds to {tab === 8 && (() => { ... })()} in the monolithic file (lines 21284–21542).

export default function ExportCenterTab(props) {
  const {
    // Data availability
    marketPortfolio, universeProfiles, pf, savedScenarios,
    // Export handlers
    handleExportUniversum, exportAllProfiles, handleExportExcel,
    handleExportScenariosExcel, handleExportDeepDive, handleExportGesamtExcel,
    // Session
    sessionName, sessionSetName, setSessionName,
    sessionDownload, sessionLoadFile, sessionImport, sessionNew,
    // KI prompts
    KI_PROMPTS, copyToClipboard,
    // State
    copiedId, setCopiedId,
    // Helpers
    setTab,
    // Note: lsLoad and lsSave are imported directly above — not taken from props
  } = props;

  const hasMarket = (marketPortfolio || []).length > 0;
  const hasProfiles = (universeProfiles || []).length > 0;
  const hasPf = (pf || []).length > 0;
  const hasScenarios = (savedScenarios || []).length >= 2;
  const showCopied = (id) => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const exports = [
    {
      id: "universum", icon: "🌍", title: "Universum",
      desc: "Gesamtes Anleihe-Universum mit Filtern, Profilen, Vergleichen und Verteilungen",
      available: hasMarket, reason: "Bitte zuerst Daten importieren", targetTab: 3, targetLabel: "Daten-Import",
      sheets: ["Info","Universum","Gefiltert","Richtlinien","Vergleich","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Histogramme","Fälligkeitsprofil"],
      onDownload: handleExportUniversum,
      filename: "Universum_Export"
    },
    {
      id: "profile", icon: "👤", title: "Universum-Profile",
      desc: "Vergleich des Gesamt-Universums mit gespeicherten Filterprofilen",
      available: hasProfiles, reason: "Bitte zuerst Profile anlegen", targetTab: 1, targetLabel: "Markt-Analyse",
      sheets: ["Info","Gesamt","Vergleich","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Profil-Delta","Fälligkeitsprofil"],
      onDownload: exportAllProfiles,
      filename: "Profile_Export"
    },
    {
      id: "portfolio", icon: "💼", title: "Zielportfolio",
      desc: "Optimiertes Portfolio mit Kennzahlen, Verteilungen, Benchmark-Vergleich und Regelwerk",
      available: hasPf, reason: "Bitte zuerst eine Optimierung durchführen", targetTab: 0, targetLabel: "Optimierer",
      sheets: ["Info","Portfolio","Kennzahlen","Emittenten","Verteilungen","Universum","Zul. Universum","Universum-Statistik","Regelwerk","Scatter-Daten","Spread-Kurve","Emittenten-Top50","PF vs Benchmark","Bestand vs Neu","PF-Konzentration"],
      onDownload: handleExportExcel,
      filename: "Zielportfolio"
    },
    {
      id: "szenarien", icon: "📊", title: "Szenarien-Vergleich",
      desc: "Vergleich gespeicherter Szenarien mit KPIs, Verteilungen und Bond-Listen",
      available: hasScenarios, reason: "Mindestens 2 Szenarien speichern", targetTab: 4, targetLabel: "Szenarien-Vergleich",
      sheets: ["Info","Übersicht","Einstellungen","Universum","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Szenario-Delta","Szenario-Scatter"],
      onDownload: handleExportScenariosExcel,
      filename: "Szenarien_Vergleich"
    },
    {
      id: "deepdive", icon: "🔬", title: "Markt-Deep-Dive",
      desc: "Erweiterte Marktanalyse: Konzentration, Spread-Kurven, Carry, ESG, Regulatorik",
      available: hasMarket, reason: "Bitte zuerst Daten importieren", targetTab: 3, targetLabel: "Daten-Import",
      sheets: ["Info","Barometer","Konzentration","Spread-Kurve","Liquidität","Carry","Sektor","RWA","ESG","Regionen","Konvexität","Peer-Group","Verteilungen","Scatter-Daten","Emittenten-Top50","Spread-Rating-Matrix","Duration-Bänder","Sektor-Rating"],
      onDownload: handleExportDeepDive,
      filename: "Deep_Dive"
    }
  ];

  const getSheetInfo = (ex) => ex.sheets.map((s,i) => `${i+1}. ${s}`).join("\n");
  const fn = (ex) => `${ex.filename}_${new Date().toISOString().slice(0,10)}.xlsx`;

  const ExportCard = ({ ex }) => (
    <div className={"rounded-2xl border-2 p-5 transition-all " + (ex.available ? "bg-white border-slate-200 shadow-sm hover:shadow-md" : "bg-slate-50 border-slate-100 opacity-60")}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{ex.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-slate-800 text-sm">{ex.title}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ex.desc}</div>
        </div>
        <span className={"shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 " + (ex.available ? "bg-emerald-400" : "bg-slate-300")}></span>
      </div>
      {ex.available && <div className="text-[10px] text-slate-400 mb-3">{ex.sheets.length} Reiter</div>}
      {!ex.available ? (
        <div className="mt-3">
          <div className="text-[10px] text-rose-400 font-bold mb-1.5">{ex.reason}</div>
          <button onClick={() => setTab(ex.targetTab)} className="text-[10px] font-bold text-spark-600 hover:text-spark-700 transition-colors">→ Zum {ex.targetLabel}</button>
        </div>
      ) : (
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={ex.onDownload} className="flex-1 min-w-[100px] px-3 py-2 bg-slate-700 text-white text-[11px] font-bold rounded-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <span>📥</span> Download
          </button>
          <button onClick={async () => { await copyToClipboard(KI_PROMPTS.pruefen(fn(ex), getSheetInfo(ex))); showCopied(ex.id+"-p"); }}
            className="px-3 py-2 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-xl hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1 relative">
            <span>🔍</span> Prüfen
            {copiedId === ex.id+"-p" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-lg z-10">✓ Kopiert!</span>}
          </button>
          <button onClick={async () => { await copyToClipboard(KI_PROMPTS.reporting(fn(ex), getSheetInfo(ex))); showCopied(ex.id+"-r"); }}
            className="px-3 py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1 relative">
            <span>📊</span> Reporting
            {copiedId === ex.id+"-r" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-lg z-10">✓ Kopiert!</span>}
          </button>
        </div>
      )}
    </div>
  );

  const availCount = exports.filter(e => e.available).length;
  const totalSheets = exports.filter(e => e.available).reduce((n, e) => n + e.sheets.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-3">
      {/* Header */}
      <div className="text-center">
        <div className="text-3xl mb-2">📦</div>
        <h2 className="text-xl font-black text-slate-800">Export-Center</h2>
        <p className="text-sm text-slate-500 mt-1">Alle Excel-Exporte an einem Ort — mit KI-Analyse-Prompts</p>
        <div className="flex justify-center gap-4 mt-3">
          <span className="text-[11px] text-slate-400"><span className="font-bold text-slate-600">{availCount}</span> von {exports.length} verfügbar</span>
          <span className="text-[11px] text-slate-400"><span className="font-bold text-slate-600">{totalSheets}</span> Reiter gesamt</span>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-slate-200"></span> Sessions <span className="flex-1 h-px bg-slate-200"></span>
        </h3>
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Aktuelle Session</div>
              <div className="text-base font-black text-slate-800 mt-0.5">{sessionName}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex gap-3 flex-wrap">
                <span>{(marketPortfolio || []).length} Bonds</span>
                <span>{(savedScenarios || []).length} Szenarien</span>
                <span>{(pf || []).length ? "✓ Portfolio" : "— Kein Portfolio"}</span>
                <span>{(universeProfiles || []).length} Profile</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => {
                const name = prompt("Session-Name:", sessionName);
                if (name?.trim()) { sessionSetName(name.trim()); setSessionName(name.trim()); }
              }} className="px-3 py-2 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5">
                <span>✏️</span> Umbenennen
              </button>
              <button onClick={() => sessionDownload(sessionName)} className="px-3 py-2 bg-slate-700 text-white text-[11px] font-bold rounded-xl hover:bg-slate-600 transition-all flex items-center gap-1.5 shadow-sm">
                <span>💾</span> Speichern
              </button>
              <button onClick={() => sessionDownload(sessionName)} className="px-3 py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5">
                <span>📥</span> Exportieren
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100"></div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={async () => {
              try {
                const data = await sessionLoadFile();
                if (confirm("Aktuelle Daten werden überschrieben durch:\n\"" + (data.name||"Session") + "\"\n(" + (data.meta?.bonds||"?") + " Bonds, " + (data.meta?.scenarios||"?") + " Szenarien)\n\nFortfahren?")) {
                  sessionImport(data);
                  window.location.reload();
                }
              } catch(e) { if (e.message !== "Abgebrochen") alert("Import fehlgeschlagen: " + e.message); }
            }} className="px-4 py-2.5 bg-spark-50 text-spark-700 text-[11px] font-bold rounded-xl hover:bg-spark-100 border border-spark-200 transition-all flex items-center gap-1.5">
              <span>📤</span> Session aus Datei laden
            </button>
            <button onClick={() => {
              if (confirm("Neue leere Session starten?\n\nAktuelle Daten vorher mit 'Speichern' sichern!")) {
                sessionNew();
                window.location.reload();
              }
            }} className="px-4 py-2.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-xl hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5">
              <span>✚</span> Neue leere Session
            </button>
          </div>
          {(() => {
            const sessList = lsLoad("sessionList", []);
            if (!(sessList || []).length) return null;
            return (
              <>
                <div className="border-t border-slate-100"></div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Zuletzt gespeicherte Sessions</div>
                  <div className="space-y-1.5">
                    {sessList.slice().reverse().map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span>📂</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-400">{s.bonds} Bonds · {s.scenarios} Szenarien · {new Date(s.date).toLocaleDateString("de-DE")}</div>
                        </div>
                        <button onClick={() => {
                          const list = lsLoad("sessionList", []);
                          lsSave("sessionList", (list || []).filter(x => x.name !== s.name));
                          window.location.reload();
                        }} className="text-slate-400 hover:text-rose-500 text-xs transition-colors" title="Aus Liste entfernen">🗑</button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Einzel-Exporte Grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-slate-200"></span> Einzel-Exporte <span className="flex-1 h-px bg-slate-200"></span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map(ex => <ExportCard key={ex.id} ex={ex} />)}
        </div>
      </div>

      {/* Gesamt-Excel */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-8 h-px bg-slate-200"></span> Gesamt-Export <span className="flex-1 h-px bg-slate-200"></span>
        </h3>
        <div className={"rounded-2xl border-2 p-6 transition-all " + (hasMarket ? "bg-gradient-to-br from-white to-spark-50/30 border-spark-200 shadow-lg" : "bg-slate-50 border-slate-100 opacity-60")}>
          <div className="flex items-start gap-4 mb-4">
            <span className="text-4xl">📦</span>
            <div className="flex-1">
              <div className="font-black text-slate-800 text-lg">Gesamt-Export — Alle Daten in einer Datei</div>
              <div className="text-xs text-slate-500 mt-1">Konsolidierte Excel mit allen verfügbaren Daten. Duplikate werden automatisch entfernt.</div>
              {hasMarket && <div className="text-[11px] text-spark-600 font-bold mt-2">~{totalSheets} Reiter aus {availCount} Quellen (konsolidiert, ohne Duplikate)</div>}
            </div>
          </div>
          {hasMarket ? (
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleExportGesamtExcel} className="flex-1 min-w-[160px] px-5 py-3 bg-spark-600 text-white text-sm font-black rounded-xl hover:bg-spark-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-spark-500/20">
                <span className="text-lg">📥</span> Gesamt-Excel herunterladen
              </button>
              <button onClick={async () => {
                const si = exports.filter(e=>e.available).flatMap(e=>e.sheets).map((s,i)=>`${i+1}. ${s}`).join("\n");
                await copyToClipboard(KI_PROMPTS.pruefen("Gesamt_Export_"+new Date().toISOString().slice(0,10)+".xlsx", si));
                showCopied("gesamt-p");
              }} className="px-4 py-3 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 relative">
                <span>🔍</span> Prüfen
                {copiedId === "gesamt-p" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-lg z-10">✓ Kopiert!</span>}
              </button>
              <button onClick={async () => {
                const si = exports.filter(e=>e.available).flatMap(e=>e.sheets).map((s,i)=>`${i+1}. ${s}`).join("\n");
                await copyToClipboard(KI_PROMPTS.reporting("Gesamt_Export_"+new Date().toISOString().slice(0,10)+".xlsx", si));
                showCopied("gesamt-r");
              }} className="px-4 py-3 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 relative">
                <span>📊</span> Reporting
                {copiedId === "gesamt-r" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap shadow-lg z-10">✓ Kopiert!</span>}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-rose-400 font-bold mb-1.5">Bitte zuerst Daten importieren</div>
              <button onClick={() => setTab(3)} className="text-[11px] font-bold text-spark-600 hover:text-spark-700 transition-colors">→ Zum Daten-Import</button>
            </div>
          )}
        </div>
      </div>

      {/* KI-Buttons Hinweis */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-[11px] text-slate-500"><span className="font-bold">💡 KI-Buttons:</span> Klicke <span className="text-amber-600 font-bold">🔍 Prüfen</span> oder <span className="text-blue-600 font-bold">📊 Reporting</span> um einen Analyse-Prompt in die Zwischenablage zu kopieren. Dann lade die Excel-Datei in ChatGPT / Claude hoch und füge den Prompt ein.</p>
      </div>
    </div>
  );
}
