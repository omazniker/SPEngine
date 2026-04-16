// DatenImportTab.jsx — Tab 3: Universum-Manager, Bloomberg/Excel Import, Ausschlussliste, Positivliste, Bestandsliste
import React from 'react';
import { BondTable } from '../tables/index.js';

export default function DatenImportTab(props) {
  const {
    // Dataset management
    activeDatasetId, setActiveDatasetId, datasets, setDatasets,
    // Import
    fileInputRef, handleFileUpload, xlsxLoading, xlsxFileName,
    importText, setImportText, handleParse, importError, parsedData,
    newDatasetName, setNewDatasetName,
    addAsNew, mergeWithCurrent, overwriteCurrent,
    // Exclusion list
    exclImportText, setExclImportText, excludedIssuers, setExcludedIssuers,
    exclImportResult, setExclImportResult, filterOptions,
    // Allowed issuers (Positivliste)
    allowedIssImportText, setAllowedIssImportText, allowedIssuers, setAllowedIssuers,
    allowedIssImportResult, setAllowedIssImportResult,
    // Bestandsliste
    bestandText, setBestandText, bestandParsed, bestandError,
    handleParseBestand, loadBestandAsPortfolio,
    // Misc
    setPf, setResult, setLog, openDetails, setParsedData,
  } = props;

  const safeFilterOpts = filterOptions || { emittenten: [] };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* UNIVERSUM MANAGER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-2xl">🗃️</span> Universum-Manager
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <select
            value={activeDatasetId}
            onChange={(e) => {
              setActiveDatasetId(e.target.value);
              if (setPf) setPf([]); if (setResult) setResult(null);
              if (setLog) setLog(`Universum gewechselt: ${e.target.options[e.target.selectedIndex].text}`);
            }}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-spark-500 w-full sm:flex-1 cursor-pointer"
          >
            {(datasets || []).map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.data.length} Anleihen)</option>
            ))}
          </select>
          <button
            onClick={() => {
              const activeData = (datasets || []).find(d => d.id === activeDatasetId)?.data || [];
              const codeStr = `const B = [\n  ${activeData.map(b => JSON.stringify(b)).join(",\n  ")}\n];`;
              navigator.clipboard.writeText(codeStr).catch(() => {
                const el = document.createElement('textarea');
                el.value = codeStr;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
              });
              if (setLog) setLog("Code kopiert!");
            }}
            className="px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-slate-700 transition-colors shrink-0 flex items-center gap-2"
            title="Kopiert dieses Universum als Quellcode"
          >
            <span className="text-base">📄</span> Als Code kopieren
          </button>
          {activeDatasetId !== 'default' && (
            <button
              onClick={() => {
                if (setDatasets) setDatasets(ds => ds.filter(d => d.id !== activeDatasetId));
                setActiveDatasetId('default');
                if (setPf) setPf([]); if (setResult) setResult(null);
                if (setLog) setLog("Universum geloescht. Standard-Datensatz wieder aktiv.");
              }}
              className="px-4 py-2.5 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 transition-colors shrink-0"
            >
              Loeschen
            </button>
          )}
        </div>
      </div>

      {/* BLOOMBERG / EXCEL IMPORT */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="text-2xl">📋</span> Bloomberg / Excel Import</h2>
        <p className="text-sm text-slate-500 mb-6">Importieren Sie Anleihen-Daten per XLSX-Datei-Upload oder Copy-Paste (Tab-getrennt). Unterstuetzt alle BBG-Felder inkl. KpnTyp, MSCI ESG Rating, Brief/Brf-Rdte. Alle Anleihen werden importiert -- filtern Sie anschliessend nach Waehrung, KpnTyp, Zahlungsrang, Faelligkeitstyp etc.</p>
        {/* XLSX File Upload Zone */}
        <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv,.tsv" className="hidden" onChange={e => { if (e.target.files && e.target.files[0] && handleFileUpload) handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
        <div
          className={"mb-4 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all " + (xlsxLoading ? "border-amber-300 bg-amber-50" : "border-slate-300 bg-slate-50 hover:border-spark-400 hover:bg-spark-50")}
          onClick={() => !xlsxLoading && fileInputRef && fileInputRef.current && fileInputRef.current.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-spark-500','bg-spark-50'); }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-spark-500','bg-spark-50'); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-spark-500','bg-spark-50'); if (e.dataTransfer.files && e.dataTransfer.files[0] && handleFileUpload) handleFileUpload(e.dataTransfer.files[0]); }}
        >
          {xlsxLoading ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              <span className="text-sm font-bold text-amber-700">Verarbeite {xlsxFileName}...</span>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📁</div>
              <div className="text-sm font-bold text-slate-700">XLSX / XLS / CSV hier ablegen oder klicken</div>
              <div className="text-xs text-slate-400 mt-1">Erste Sheet-Seite wird automatisch geparst{xlsxFileName ? ` -- Zuletzt: ${xlsxFileName}` : ''}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">oder Copy-Paste</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>
        <textarea className="w-full h-48 bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs whitespace-pre overflow-auto focus:outline-none focus:ring-2 focus:ring-spark-500 focus:border-spark-500 transition-all shadow-inner" placeholder={"BBG Index Format (Tab-getrennt):\nLQA Liq Sc\tFaell.-Typ\tWaehrung\tAusst. Betr.\tKpnTyp\t..."} value={importText} onChange={e => setImportText(e.target.value)} />
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          <button onClick={handleParse} disabled={!importText} className={"px-6 py-3 font-bold rounded-xl text-sm transition-all " + (importText ? "bg-slate-800 text-white hover:bg-slate-700 shadow-md" : "bg-slate-200 text-slate-400 cursor-not-allowed")}>Import validieren</button>
          {importText && <button onClick={() => { setImportText(""); if (setParsedData) setParsedData(null); if (setExclImportResult) setExclImportResult(null); }} className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">Textarea leeren</button>}
        </div>
        {importError && (<div className="mt-4 text-sm text-rose-700 font-bold bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-2"><span className="text-lg leading-none">⚠️</span><div>{importError}</div></div>)}
        {parsedData && (
          <div className="mt-6 p-5 bg-spark-50 border border-spark-200 rounded-xl space-y-4">
            <div className="font-bold text-spark-800 flex items-center gap-2">
              <span className="text-xl">✓</span> {parsedData.length} Anleihen erfolgreich geparst! Wie moechten Sie fortfahren?
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={newDatasetName}
                  onChange={e => setNewDatasetName(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-spark-200 text-sm w-full sm:flex-1 focus:outline-none focus:ring-2 focus:ring-spark-500 font-medium text-slate-700 bg-white"
                  placeholder="Name des neuen Universums..."
                />
                <button onClick={addAsNew} className="px-5 py-2.5 bg-spark-600 text-white font-bold rounded-lg hover:bg-spark-800 shadow-sm transition-all w-full sm:w-auto whitespace-nowrap">
                  Als neues Universum speichern
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-spark-200/50">
                <button onClick={mergeWithCurrent} className="px-4 py-2 bg-white text-spark-700 border border-spark-300 font-bold rounded-lg hover:bg-spark-100 shadow-sm transition-all w-full sm:flex-1">
                  Zum aktuellen hinzufuegen (Merge)
                </button>
                <button onClick={overwriteCurrent} className="px-4 py-2 bg-white text-rose-600 border border-rose-300 font-bold rounded-lg hover:bg-rose-50 shadow-sm transition-all w-full sm:flex-1" title="Ersetzt das aktuell ausgewaehlte Universum komplett">
                  Aktuelles ueberschreiben
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {parsedData && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="constraint-title font-black text-slate-800 uppercase tracking-widest mb-4">Vorschau (Erste 5 Eintraege nach Parsing)</h3>
          <BondTable bonds={parsedData.slice(0, 5)} s={null} showN={false} onBondClick={openDetails} />
        </div>
      )}

      {/* EXCLUSION LIST IMPORT */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="text-2xl">🚫</span> Emittenten-Ausschlussliste</h2>
        <p className="text-xs text-slate-500 mb-4">Importieren Sie eine Liste mit Emittenten-Namen (ein Name pro Zeile). Die Engine matcht automatisch gegen das geladene Universum (Ticker und Emittent).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <textarea
              value={exclImportText}
              onChange={e => setExclImportText(e.target.value)}
              placeholder={"UCGIM\nDBAN\nCOMBK\noder vollstaendige Namen:\nUniCredit S.p.A.\nDeutsche Bank AG"}
              className="w-full h-40 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-spark-400 resize-none bg-slate-50"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const lines = (exclImportText || "").split(/\n/).map(l => l.trim()).filter(Boolean);
                  if (!lines.length) return;
                  const emitOpts = safeFilterOpts.emittenten || [];
                  const matched = [];
                  const unmatched = [];
                  lines.forEach(line => {
                    const lower = line.toLowerCase();
                    const hit = emitOpts.find(o => {
                      const v = o.val.toLowerCase(), l = o.lbl.toLowerCase();
                      if (v === lower || l === lower) return true;
                      if (lower.length >= 3 && (v.includes(lower) || l.includes(lower))) return true;
                      if (v.length >= 3 && lower.includes(v)) return true;
                      if (l.length >= 3 && lower.includes(l)) return true;
                      return false;
                    });
                    if (hit) { if (!matched.includes(hit.val)) matched.push(hit.val); }
                    else unmatched.push(line);
                  });
                  const merged = Array.from(new Set([...(excludedIssuers || []), ...matched]));
                  setExcludedIssuers(merged);
                  setExclImportResult({ matched, unmatched, ts: Date.now() });
                }}
                className="flex-1 px-4 py-2 bg-spark-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-spark-700 transition-all"
              >
                + Zur Ausschlussliste hinzufuegen
              </button>
              <button
                onClick={() => { setExclImportText(""); if (setExclImportResult) setExclImportResult(null); }}
                className="px-4 py-2 bg-white text-slate-500 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Leeren
              </button>
            </div>
            {exclImportResult && (
              <div className="mt-3 text-[11px] space-y-1">
                <div className="text-emerald-600 font-bold">{exclImportResult.matched.length} Emittent{exclImportResult.matched.length !== 1 ? "en" : ""} erkannt und hinzugefuegt</div>
                {exclImportResult.unmatched.length > 0 && (
                  <div className="text-rose-500 font-bold">{exclImportResult.unmatched.length} nicht im Universum gefunden: {exclImportResult.unmatched.join(", ")}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Aktive Ausschluesse ({(excludedIssuers || []).length})</div>
              {(excludedIssuers || []).length > 0 && (
                <button onClick={() => { setExcludedIssuers([]); if (setExclImportResult) setExclImportResult(null); }} className="text-[10px] text-rose-500 font-bold hover:underline">Alle entfernen</button>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 h-40 overflow-y-auto">
              {(excludedIssuers || []).length === 0 ? (
                <div className="text-xs text-slate-400 text-center mt-12">Keine Ausschluesse aktiv</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(excludedIssuers || []).map(t => {
                    const em = (safeFilterOpts.emittenten || []).find(e => e.val === t);
                    return (
                      <div key={t} className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        <span>{em ? em.lbl : t}</span>
                        <button onClick={() => setExcludedIssuers(prev => prev.filter(x => x !== t))} className="text-rose-400 hover:text-rose-600 text-xs ml-0.5">x</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-[9px] text-slate-400 mt-2">Diese Ausschluesse gelten global fuer alle Optimierungen im Optimierer-Tab.</div>
          </div>
        </div>
      </div>

      {/* POSITIVLISTE IMPORT */}
      <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="text-2xl">✅</span> Emittenten-Positivliste</h2>
        <p className="text-xs text-slate-500 mb-4">Nur Emittenten auf dieser Liste werden bei der Optimierung beruecksichtigt -- alle anderen sind automatisch ausgeschlossen. Leer = keine Einschraenkung (alle Emittenten erlaubt).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <textarea
              value={allowedIssImportText}
              onChange={e => setAllowedIssImportText(e.target.value)}
              placeholder={"BNP\nDB\nCMZB\noder vollstaendige Namen:\nBNP Paribas\nDeutsche Bank AG\nCommerzbank AG"}
              className="w-full h-40 border border-emerald-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-emerald-50/30"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  const lines = (allowedIssImportText || "").split(/\n/).map(l => l.trim()).filter(Boolean);
                  if (!lines.length) return;
                  const emitOpts = safeFilterOpts.emittenten || [];
                  const matched = [];
                  const unmatched = [];
                  lines.forEach(line => {
                    const lower = line.toLowerCase();
                    const hit = emitOpts.find(o => {
                      const v = o.val.toLowerCase(), l = o.lbl.toLowerCase();
                      if (v === lower || l === lower) return true;
                      if (lower.length >= 3 && (v.includes(lower) || l.includes(lower))) return true;
                      if (v.length >= 3 && lower.includes(v)) return true;
                      if (l.length >= 3 && lower.includes(l)) return true;
                      return false;
                    });
                    if (hit) { if (!matched.includes(hit.val)) matched.push(hit.val); }
                    else unmatched.push(line);
                  });
                  const merged = Array.from(new Set([...(allowedIssuers || []), ...matched]));
                  setAllowedIssuers(merged);
                  setAllowedIssImportResult({ matched, unmatched, ts: Date.now() });
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-all"
              >
                + Zur Positivliste hinzufuegen
              </button>
              <button
                onClick={() => { setAllowedIssImportText(""); if (setAllowedIssImportResult) setAllowedIssImportResult(null); }}
                className="px-4 py-2 bg-white text-slate-500 border border-emerald-200 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-all"
              >
                Leeren
              </button>
            </div>
            {allowedIssImportResult && (
              <div className="mt-3 text-[11px] space-y-1">
                <div className="text-emerald-600 font-bold">{allowedIssImportResult.matched.length} Emittent{allowedIssImportResult.matched.length !== 1 ? "en" : ""} zur Positivliste hinzugefuegt</div>
                {allowedIssImportResult.unmatched.length > 0 && (
                  <div className="text-rose-500 font-bold">{allowedIssImportResult.unmatched.length} nicht im Universum gefunden: {allowedIssImportResult.unmatched.join(", ")}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Positivliste ({(allowedIssuers || []).length})</div>
              {(allowedIssuers || []).length > 0 && (
                <button onClick={() => setAllowedIssuers([])} className="text-[10px] text-rose-500 font-bold hover:underline">Alle entfernen</button>
              )}
            </div>
            <div className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-3 h-40 overflow-y-auto">
              {(allowedIssuers || []).length === 0 ? (
                <div className="text-xs text-slate-400 text-center mt-12">Keine Einschraenkung (alle Emittenten erlaubt)</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(allowedIssuers || []).map(t => {
                    const em = (safeFilterOpts.emittenten || []).find(e => e.val === t);
                    return (
                      <div key={t} className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        <span>{em ? em.lbl : t}</span>
                        <button onClick={() => setAllowedIssuers(prev => prev.filter(x => x !== t))} className="text-emerald-400 hover:text-emerald-600 text-xs ml-0.5">x</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-[9px] text-slate-400 mt-2">Nur diese Emittenten werden im Optimierer beruecksichtigt. Leer = alle erlaubt.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
