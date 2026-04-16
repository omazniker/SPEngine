# Excel Export-Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Neuer Tab "Export-Center" mit allen Excel-Exporten, KI-Prompts und konsolidierter Gesamt-Excel.

**Architecture:** Neuer Tab (ID 8) in bestehende Navigation einfuegen. Bestehende Export-Handler wiederverwenden, nicht duplizieren. `createInfoSheet` erweitern mit zusaetzlichen Spalten und Abschnitten. Neue `handleExportGesamtExcel`-Funktion sammelt Sheets aus allen Quellen mit Deduplizierung.

**Tech Stack:** React (inline), SheetJS XLSX, JSZip, navigator.clipboard API

---

### Task 1: createInfoSheet erweitern

**Files:**
- Modify: `portfolio_engine_standalone.html:3967-3989` (createInfoSheet)

**Step 1: Erweitere createInfoSheet um Spalten "Zeilen" und "Verwendung" + Struktur/Datenquellen-Abschnitte**

Die Funktion erhaelt neue Parameter und erzeugt ein umfangreicheres Info-Sheet.

```javascript
const createInfoSheet = (title, desc, sections, opts = {}) => {
  const d = [
    [title],
    ["Erstellt am: " + new Date().toLocaleString("de-DE")],
    [],
    ["INHALTSVERZEICHNIS"],
    ["Nr.", "→ Reiter (klickbar)", "Inhalt", "Zeilen", "Verwendung"],
  ];
  sections.forEach((s, i) => d.push([i+1, "→ " + s.name, s.content, s.rows || "", s.usage || ""]));
  d.push([]);
  d.push(["STRUKTUR"]);
  d.push(["Farbcodierung der Reiter:"]);
  d.push(["", "Gruen", "Bond-Daten (Rohdaten, Listen)"]);
  d.push(["", "Blau", "Kennzahlen & Vergleiche"]);
  d.push(["", "Orange", "Chart-Daten (fuer Visualisierungen)"]);
  d.push(["", "Lila", "Abweichungsanalysen (Delta, Vergleich)"]);
  d.push(["", "Grau", "Konfiguration & Regelwerk"]);
  d.push([]);
  d.push(["DATENQUELLEN"]);
  if (opts.dataSource) d.push([opts.dataSource]);
  d.push(["Export-Zeitpunkt: " + new Date().toLocaleString("de-DE")]);
  d.push([]);
  d.push(["BESCHREIBUNG"]);
  d.push([desc]);

  const ws = xlsxSheet(d, { freezeRow: 5, maxW: 60 });
  setTabColor(ws, TAB_COLORS.INFO);

  // Native SheetJS-Hyperlinks
  sections.forEach((s, i) => {
    const ref = XLSX.utils.encode_cell({ r: 5 + i, c: 1 });
    if (ws[ref]) ws[ref].l = { Target: "#'" + s.name.replace(/'/g, "''") + "'!A1" };
  });
  return ws;
};
```

**Step 2: Aktualisiere alle 5 createInfoSheet-Aufrufe mit neuen Feldern**

Jeder Aufruf muss `rows` und `usage` pro Section und `opts.dataSource` erhalten.

Betroffene Stellen:
- Zeile ~11284 (Profile)
- Zeile ~11920 (Zielportfolio)
- Zeile ~12334 (Szenarien)
- Zeile ~14395 (Deep-Dive)
- Zeile ~14693 (Universum)

Beispiel fuer Universum (Zeile ~14693):
```javascript
const wsInfoUni = createInfoSheet(
  "UNIVERSUM — Excel-Export",
  "Analyse des Bond-Universums mit " + marketPortfolio.length + " Anleihen.",
  [
    { name: "Universum", content: "Gesamtes Anleihe-Universum mit allen Detailfeldern", rows: marketPortfolio.length, usage: "Vollstaendige Referenzdaten" },
    { name: "Gefiltert ("+_fp.length+")", content: "Aktuell im Explorer gefilterte Bonds", rows: _fp.length, usage: "Aktuelle Selektion" },
    // ... alle weiteren sections mit rows und usage ...
  ],
  { dataSource: "Universum: " + (datasetName || "Unbenannt") + " | Bonds: " + marketPortfolio.length }
);
```

Muster fuer alle 5 Aufrufe: Bestehende sections behalten ihre `content`/`usage`-Werte, `rows` wird dynamisch berechnet (z.B. `pf.length`, `marketPortfolio.length`, `savedScenarios.length`). `opts.dataSource` beschreibt die Herkunft.

**Step 3: Commit**

---

### Task 2: Navigation erweitern (Tab 8)

**Files:**
- Modify: `portfolio_engine_standalone.html:12771` (Desktop-Nav)
- Modify: `portfolio_engine_standalone.html:12794` (Mobile-Nav)

**Step 1: Desktop-Navigation um Tab 8 erweitern**

Zeile 12771 — Fuege `{ id: 8, label: "Export-Center" }` zwischen Reporting und Anleitung ein:

```javascript
{[{ id: 3, label: "Daten-Import" }, { id: 1, label: "Markt-Analyse" }, { id: 7, label: "Deep-Dive" }, { id: 0, label: "Optimierer" }, { id: 4, label: "Szenarien-Vergleich" }, { id: 2, label: "Portfolio-Review" }, { id: 6, label: "Reporting" }, { id: 8, label: "Export-Center" }, { id: 5, label: "Anleitung" }].map((t) => (
```

**Step 2: Mobile-Navigation um Tab 8 erweitern**

Zeile 12794 — Fuege `{ id: 8, label: "Export", icon: "📦" }` ein:

```javascript
{[{ id: 3, label: "Import", icon: "📥" }, { id: 1, label: "Markt", icon: "🌍" }, { id: 7, label: "Deep-Dive", icon: "🔬" }, { id: 0, label: "Optimierer", icon: "⚙️" }, { id: 4, label: "Szenarien", icon: "📊" }, { id: 2, label: "Analyse", icon: "📋" }, { id: 6, label: "Report", icon: "📈" }, { id: 8, label: "Export", icon: "📦" }, { id: 5, label: "Hilfe", icon: "📖" }].map((t) => (
```

**Step 3: Commit**

---

### Task 3: KI-Prompt-Clipboard-Funktion

**Files:**
- Modify: `portfolio_engine_standalone.html` — nach `xlsxDownload` (ca. Zeile 4068)

**Step 1: Clipboard-Helper und Prompt-Definitionen hinzufuegen**

```javascript
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Fallback fuer aeltere Browser
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
};

const KI_PROMPTS = {
  pruefen: (filename, sheetInfo) => `Ich habe dir eine Excel-Datei gegeben: ${filename}

Die Datei enthaelt folgende Reiter:
${sheetInfo}

Analysiere die Datei auf Plausibilitaet und Konsistenz:
- Pruefe KPIs auf realistische Werte (Renditen 0-15%, Spreads 0-500bp, Duration 0-15)
- Identifiziere Ausreisser und Inkonsistenzen zwischen Sheets
- Pruefe ob Summen/Gewichtungen 100% ergeben
- Vergleiche Portfolio- vs. Markt-Kennzahlen auf Plausibilitaet
- Pruefe Rating-Verteilungen auf Investment-Grade-Konformitaet
- Melde auffaellige Werte mit konkreten Zell-Referenzen
- Gib eine Gesamtbewertung: Plausibel / Auffaelligkeiten / Kritisch`,

  reporting: (filename, sheetInfo) => `Ich habe dir eine Excel-Datei gegeben: ${filename}

Die Datei enthaelt folgende Reiter:
${sheetInfo}

Erstelle ein praesentationsfertiges Reporting:
- Erstelle professionelle Charts und Grafiken aus den Daten
- Rating-Verteilung als Balkendiagramm (Portfolio vs. Benchmark)
- Sektor-Allokation als Pie-Chart
- Laufzeitprofil als gestapeltes Balkendiagramm
- Spread/Rendite Scatter-Plot
- Portfolio vs. Benchmark Vergleich visuell aufbereiten
- Executive Summary mit den wichtigsten KPIs (Rendite, Spread, Duration, Rating)
- Alles in Praesentationsqualitaet formatiert (Sparkassen-Farbschema)`
};
```

**Step 2: Commit**

---

### Task 4: Export-Center Tab UI (tab === 8)

**Files:**
- Modify: `portfolio_engine_standalone.html` — vor `{tab === 5 && ...}` (Zeile ~15389)

**Step 1: Export-Center UI-Block einfuegen**

Finde die Stelle direkt vor `{tab === 5 && (() => {` und fuege den neuen Tab-Block ein.

Die 5 Einzel-Export-Karten + Gesamt-Excel-Karte:

```jsx
{tab === 8 && (() => {
  const hasMarket = marketPortfolio?.length > 0;
  const hasProfiles = universeProfiles?.length > 0;
  const hasPf = pf?.length > 0;
  const hasScenarios = savedScenarios?.length >= 2;
  const [copiedId, setCopiedId] = React.useState(null);

  const showCopied = (id) => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const exports = [
    {
      id: "universum", icon: "🌍", title: "Universum",
      desc: "Gesamtes Anleihe-Universum mit Filtern, Profilen, Vergleichen und Verteilungen",
      available: hasMarket, reason: "Bitte zuerst Daten importieren", targetTab: 3, targetLabel: "Daten-Import",
      sheets: hasMarket ? ["Info","Universum","Gefiltert","Richtlinien","Vergleich","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Histogramme","Faelligkeitsprofil"] : [],
      onDownload: () => { /* wird in Step 2 verdrahtet */ },
      filename: "Universum_Export"
    },
    {
      id: "profile", icon: "👤", title: "Universum-Profile",
      desc: "Vergleich des Gesamt-Universums mit gespeicherten Filterprofilen",
      available: hasProfiles, reason: "Bitte zuerst Profile anlegen", targetTab: 1, targetLabel: "Markt-Analyse",
      sheets: hasProfiles ? ["Info","Gesamt",...universeProfiles.map(p=>p.n||"Profil"),"Vergleich","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Profil-Delta","Faelligkeitsprofil"] : [],
      onDownload: exportAllProfiles,
      filename: "Profile_Export"
    },
    {
      id: "portfolio", icon: "💼", title: "Zielportfolio",
      desc: "Optimiertes Portfolio mit Kennzahlen, Verteilungen, Benchmark-Vergleich und Regelwerk",
      available: hasPf, reason: "Bitte zuerst eine Optimierung durchfuehren", targetTab: 0, targetLabel: "Optimierer",
      sheets: hasPf ? ["Info","Portfolio","Kennzahlen","Emittenten","Verteilungen","Universum","Zul. Universum","Universum-Statistik","Regelwerk","Scatter-Daten","Spread-Kurve","Emittenten-Top50","PF vs Benchmark","Bestand vs Neu","PF-Konzentration"] : [],
      onDownload: handleExportExcel,
      filename: "Zielportfolio"
    },
    {
      id: "szenarien", icon: "📊", title: "Szenarien-Vergleich",
      desc: "Vergleich gespeicherter Szenarien mit KPIs, Verteilungen und Bond-Listen",
      available: hasScenarios, reason: "Mindestens 2 Szenarien speichern", targetTab: 4, targetLabel: "Szenarien",
      sheets: hasScenarios ? ["Info","Uebersicht","Einstellungen",...savedScenarios.map(s=>s.name),"Universum","Verteilungen","Scatter-Daten","Spread-Kurve","Emittenten-Top50","Szenario-Delta","Szenario-Scatter"] : [],
      onDownload: handleExportScenariosExcel,
      filename: "Szenarien_Vergleich"
    },
    {
      id: "deepdive", icon: "🔬", title: "Markt-Deep-Dive",
      desc: "Erweiterte Marktanalyse: Konzentration, Spread-Kurven, Carry, ESG, Regulatorik",
      available: hasMarket, reason: "Bitte zuerst Daten importieren", targetTab: 3, targetLabel: "Daten-Import",
      sheets: hasMarket ? ["Info","Barometer","Konzentration","Spread-Kurve","Liquiditaet","Carry","Sektor","RWA","ESG","Regionen","Konvexitaet","Peer-Group","Verteilungen","Scatter-Daten","Emittenten-Top50"] : [],
      onDownload: null, // Deep-Dive ist inline onClick — wird extra behandelt
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
        {ex.available && <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1.5"></span>}
        {!ex.available && <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-slate-300 mt-1.5"></span>}
      </div>
      {ex.available && <div className="text-[10px] text-slate-400 mb-3">{ex.sheets.length} Reiter</div>}
      {!ex.available ? (
        <div className="mt-3">
          <div className="text-[10px] text-rose-400 font-bold mb-1.5">{ex.reason}</div>
          <button onClick={() => setTab(ex.targetTab)} className="text-[10px] font-bold text-spark-600 hover:text-spark-700 transition-colors">→ Zum {ex.targetLabel}</button>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button onClick={ex.onDownload} className="flex-1 px-3 py-2 bg-slate-700 text-white text-[11px] font-bold rounded-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <span>📥</span> Download
          </button>
          <button onClick={async () => { await copyToClipboard(KI_PROMPTS.pruefen(fn(ex), getSheetInfo(ex))); showCopied(ex.id+"-p"); }}
            className="px-3 py-2 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-xl hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1 relative">
            <span>🔍</span> Pruefen
            {copiedId === ex.id+"-p" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap">Kopiert!</span>}
          </button>
          <button onClick={async () => { await copyToClipboard(KI_PROMPTS.reporting(fn(ex), getSheetInfo(ex))); showCopied(ex.id+"-r"); }}
            className="px-3 py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1 relative">
            <span>📊</span> Reporting
            {copiedId === ex.id+"-r" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap">Kopiert!</span>}
          </button>
        </div>
      )}
    </div>
  );

  // Gesamt-Export Verfuegbarkeit
  const gesamtAvailable = hasMarket;
  const gesamtSheetCount = exports.filter(e => e.available).reduce((n, e) => n + e.sheets.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-3xl mb-2">📦</div>
        <h2 className="text-xl font-black text-slate-800">Export-Center</h2>
        <p className="text-sm text-slate-500 mt-1">Alle Excel-Exporte an einem Ort — mit KI-Analyse-Prompts</p>
      </div>

      {/* Einzel-Exporte Grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Einzel-Exporte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map(ex => <ExportCard key={ex.id} ex={ex} />)}
        </div>
      </div>

      {/* Gesamt-Excel */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Gesamt-Export</h3>
        <div className={"rounded-2xl border-2 p-6 transition-all " + (gesamtAvailable ? "bg-gradient-to-br from-white to-spark-50/30 border-spark-200 shadow-lg" : "bg-slate-50 border-slate-100 opacity-60")}>
          <div className="flex items-start gap-4 mb-4">
            <span className="text-4xl">📦</span>
            <div className="flex-1">
              <div className="font-black text-slate-800 text-lg">Gesamt-Export — Alle Daten in einer Datei</div>
              <div className="text-xs text-slate-500 mt-1">Konsolidierte Excel mit allen verfuegbaren Daten. Duplikate werden automatisch entfernt.</div>
              {gesamtAvailable && <div className="text-[11px] text-spark-600 font-bold mt-2">~{gesamtSheetCount} Reiter aus {exports.filter(e=>e.available).length} Quellen</div>}
            </div>
          </div>
          {gesamtAvailable ? (
            <div className="flex gap-3">
              <button onClick={handleExportGesamtExcel} className="flex-1 px-5 py-3 bg-spark-600 text-white text-sm font-black rounded-xl hover:bg-spark-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-spark-500/20">
                <span className="text-lg">📥</span> Gesamt-Excel herunterladen
              </button>
              <button onClick={async () => { const si = exports.filter(e=>e.available).flatMap(e=>e.sheets).map((s,i)=>`${i+1}. ${s}`).join("\n"); await copyToClipboard(KI_PROMPTS.pruefen("Gesamt_Export_"+new Date().toISOString().slice(0,10)+".xlsx", si)); showCopied("gesamt-p"); }}
                className="px-4 py-3 bg-amber-50 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 relative">
                <span>🔍</span> Pruefen
                {copiedId === "gesamt-p" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap">Kopiert!</span>}
              </button>
              <button onClick={async () => { const si = exports.filter(e=>e.available).flatMap(e=>e.sheets).map((s,i)=>`${i+1}. ${s}`).join("\n"); await copyToClipboard(KI_PROMPTS.reporting("Gesamt_Export_"+new Date().toISOString().slice(0,10)+".xlsx", si)); showCopied("gesamt-r"); }}
                className="px-4 py-3 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 relative">
                <span>📊</span> Reporting
                {copiedId === "gesamt-r" && <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg whitespace-nowrap">Kopiert!</span>}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-rose-400 font-bold mb-1.5">Bitte zuerst Daten importieren</div>
              <button onClick={() => setTab(3)} className="text-[11px] font-bold text-spark-600">→ Zum Daten-Import</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}
```

**Step 2: Deep-Dive Download-Button verdrahten**

Der Deep-Dive Export ist ein Inline-onClick (nicht als useCallback). Im Export-Center muss er als Funktion aufgerufen werden. Loesung: Den bestehenden Deep-Dive Export-Code in einen `useCallback` extrahieren (aehnlich wie `handleExportExcel`), z.B. `handleExportDeepDive`. Dann im `exports`-Array referenzieren: `onDownload: handleExportDeepDive`.

Gleiches gilt fuer den Universum-Export (ebenfalls inline onClick). Extrahiere zu `handleExportUniversum`.

**Step 3: Commit**

---

### Task 5: handleExportGesamtExcel erstellen

**Files:**
- Modify: `portfolio_engine_standalone.html` — nach `handleExportScenariosExcel` (ca. Zeile 12582)

**Step 1: Gesamt-Export-Funktion implementieren**

Diese Funktion sammelt Sheets aus allen verfuegbaren Exporten in ein Workbook, eliminiert Duplikate:

```javascript
const handleExportGesamtExcel = useCallback(() => { try {
  if (!marketPortfolio?.length) return;
  const wb = XLSX.utils.book_new();
  const r2 = n => n!=null&&!isNaN(n)?Math.round(n*100)/100:"";
  const r1 = n => n!=null&&!isNaN(n)?Math.round(n*10)/10:"";
  const r0 = n => n!=null&&!isNaN(n)?Math.round(n):"";
  const addedSheets = new Set(); // Deduplizierung

  const _addOnce = (ws, name) => {
    if (addedSheets.has(name)) return;
    addedSheets.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel 31-Zeichen-Limit
  };

  // Sammle Sheet-Definitionen aus jedem Export (Reihenfolge bestimmt Prioritaet)
  // 1. Universum-Sheets
  // 2. Portfolio-Sheets (wenn vorhanden)
  // 3. Szenarien-Sheets (wenn vorhanden)
  // 4. Deep-Dive-Sheets
  // 5. Profil-Sheets (wenn vorhanden)
  // Duplikate: Universum, Scatter-Daten, Spread-Kurve, Emittenten-Top50

  // --- Universum-Daten (immer verfuegbar) ---
  // [Code aus handleExportUniversum adaptiert, nutzt _addOnce statt book_append_sheet]

  // --- Portfolio (wenn pf vorhanden) ---
  // [Code aus handleExportExcel adaptiert]

  // --- Szenarien (wenn savedScenarios >= 2) ---
  // [Code aus handleExportScenariosExcel adaptiert]

  // --- Deep-Dive (immer verfuegbar) ---
  // [Code aus Deep-Dive inline Export adaptiert]

  // --- Profile (wenn vorhanden) ---
  // [Code aus exportAllProfiles adaptiert]

  // --- Info-Sheet ganz vorne ---
  const allSections = wb.SheetNames.map(name => ({
    name, content: "...", rows: "", usage: ""
  }));
  // Info wird PREPENDED (SheetNames[0])
  const wsInfoGesamt = createInfoSheet("GESAMT-EXPORT — Alle Daten", "...", allSections, {
    dataSource: "Konsolidiert aus " + wb.SheetNames.length + " Reitern"
  });
  // Prepend: wb.SheetNames.unshift("Info"), wb.Sheets["Info"] = wsInfoGesamt
  wb.SheetNames.unshift("Info");
  wb.Sheets["Info"] = wsInfoGesamt;

  xlsxDownload(wb, `Gesamt_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
} catch(e) { console.error('Gesamt Excel-Export Fehler:', e); alert('Excel-Export Fehler: ' + e.message); }
}, [marketPortfolio, pf, savedScenarios, universeProfiles, globalMkt, cfg, filteredPortfolio, eligibleUniverse]);
```

**WICHTIG:** Die eigentliche Implementierung muss die Sheet-Erstellungslogik aus den 5 bestehenden Handlern extrahieren und wiederverwenden. Nicht den Code duplizieren — stattdessen Helper-Funktionen extrahieren, die Sheets erzeugen und zurueckgeben. Alternativ: Jede Export-Funktion so refactorn, dass sie ein `wb` entgegennimmt statt selbst eins zu erstellen.

**Empfohlener Ansatz:** Refactoring der Export-Handler:

```javascript
// Bestehend:
const handleExportExcel = useCallback(() => { try {
  const wb = XLSX.utils.book_new();
  // ... viele Sheets ...
  xlsxDownload(wb, filename);
} ... });

// Refactored zu:
const _buildPortfolioSheets = (wb) => {
  // ... alle Sheets hinzufuegen, return Sections-Array fuer Info ...
};
const handleExportExcel = useCallback(() => { try {
  const wb = XLSX.utils.book_new();
  const sections = _buildPortfolioSheets(wb);
  const wsInfo = createInfoSheet("ZIELPORTFOLIO — ...", "...", sections, { ... });
  wb.SheetNames.unshift("Info"); wb.Sheets["Info"] = wsInfo;
  xlsxDownload(wb, filename);
} ... });

// Dann in handleExportGesamtExcel:
const handleExportGesamtExcel = useCallback(() => { try {
  const wb = XLSX.utils.book_new();
  const allSections = [];
  allSections.push(..._buildUniversumSheets(wb));
  if (hasPf) allSections.push(..._buildPortfolioSheets(wb));
  if (hasScenarios) allSections.push(..._buildSzenarienSheets(wb));
  allSections.push(..._buildDeepDiveSheets(wb));
  if (hasProfiles) allSections.push(..._buildProfileSheets(wb));
  // Info-Sheet
  const wsInfo = createInfoSheet("GESAMT-EXPORT", "...", allSections, { ... });
  wb.SheetNames.unshift("Info"); wb.Sheets["Info"] = wsInfo;
  xlsxDownload(wb, filename);
} ... });
```

**Step 2: Commit**

---

### Task 6: Export-Handler refactoring (Sheet-Builder extrahieren)

**Files:**
- Modify: `portfolio_engine_standalone.html:11248-11379` (exportAllProfiles → _buildProfileSheets)
- Modify: `portfolio_engine_standalone.html:11909-12230` (handleExportExcel → _buildPortfolioSheets)
- Modify: `portfolio_engine_standalone.html:12323-12581` (handleExportScenariosExcel → _buildSzenarienSheets)
- Modify: `portfolio_engine_standalone.html:14354-14606` (Deep-Dive → _buildDeepDiveSheets / handleExportDeepDive)
- Modify: `portfolio_engine_standalone.html:14632-14856` (Universum → _buildUniversumSheets / handleExportUniversum)

**Step 1: Extrahiere Sheet-Builder-Funktionen**

Jeder bestehende Export-Handler wird in 2 Teile zerlegt:
1. `_buildXxxSheets(wb)` — fuegt Sheets hinzu, gibt sections-Array zurueck
2. `handleExportXxx()` — erstellt wb, ruft Builder auf, fuegt Info hinzu, downloadt

Beispiel-Muster:

```javascript
// VOR Refactoring:
const handleExportExcel = useCallback(() => { try {
  const wb = XLSX.utils.book_new();
  // ... 300 Zeilen Sheet-Erstellung ...
  const wsInfo = createInfoSheet(...);
  XLSX.utils.book_append_sheet(wb, wsInfo, "Info");
  xlsxDownload(wb, filename);
} catch(e) { ... } }, [...]);

// NACH Refactoring:
const _buildPortfolioSheets = (wb) => {
  // ... 300 Zeilen Sheet-Erstellung (exakt wie vorher, aber ohne wb-Erstellung und Download) ...
  return sections; // Array fuer createInfoSheet
};
const handleExportExcel = useCallback(() => { try {
  const wb = XLSX.utils.book_new();
  const sections = _buildPortfolioSheets(wb);
  const wsInfo = createInfoSheet("ZIELPORTFOLIO — Excel-Export", "...", sections, { dataSource: "..." });
  wb.SheetNames.unshift("Info"); wb.Sheets["Info"] = wsInfo;
  xlsxDownload(wb, `Zielportfolio_${new Date().toISOString().slice(0,10)}.xlsx`);
} catch(e) { ... } }, [...]);
```

Wiederhole fuer alle 5 Exporte:
- `_buildUniversumSheets(wb)` + `handleExportUniversum`
- `_buildProfileSheets(wb)` + `exportAllProfiles`
- `_buildPortfolioSheets(wb)` + `handleExportExcel`
- `_buildSzenarienSheets(wb)` + `handleExportScenariosExcel`
- `_buildDeepDiveSheets(wb)` + `handleExportDeepDive`

**Step 2: Deduplizierung in Gesamt-Export**

In `handleExportGesamtExcel` verwende einen `Set` um Sheet-Namen zu tracken. Jeder `_buildXxxSheets` bekommt einen optionalen `skipSheets`-Parameter:

```javascript
const _addOnce = (wb, ws, name, added) => {
  const sn = name.slice(0, 31);
  if (added.has(sn)) return false;
  added.add(sn);
  XLSX.utils.book_append_sheet(wb, ws, sn);
  return true;
};
```

Deduplizierte Sheets: Universum, Scatter-Daten, Spread-Kurve, Emittenten-Top50.

**Step 3: Commit**

---

### Task 7: Integration & Test

**Step 1: Alle Referenzen aktualisieren**

- Deep-Dive inline onClick (Zeile ~14478): durch `handleExportDeepDive()` ersetzen
- Universum inline onClick (Zeile ~14740): durch `handleExportUniversum()` ersetzen
- Export-Center ExportCard: `onDownload` fuer alle 5 korrekt verdrahten

**Step 2: Manuell testen**

1. Oeffne die App im Browser
2. Importiere Daten
3. Navigiere zum Export-Center Tab
4. Pruefe: Universum + Deep-Dive sind gruen, rest ausgegraut mit Quick-Links
5. Klicke Quick-Links → navigiert zum richtigen Tab
6. Klicke Download → Excel wird heruntergeladen
7. Klicke KI-Pruefen → Prompt im Clipboard → in ChatGPT einfuegen
8. Klicke KI-Reporting → Prompt im Clipboard
9. Fuehre Optimierung durch → Portfolio-Karte wird gruen
10. Speichere 2 Szenarien → Szenarien-Karte wird gruen
11. Lade Gesamt-Excel → pruefe dass alle Sheets vorhanden, keine Duplikate
12. Oeffne alle Excels in Excel → kein Reparatur-Dialog

**Step 3: Final Commit**

---

## Ausfuehrungsreihenfolge

| # | Task | Abhaengigkeit |
|---|------|---------------|
| 1 | createInfoSheet erweitern | - |
| 2 | Navigation (Tab 8) | - |
| 3 | KI-Prompts | - |
| 4 | Export-Center UI | Task 2, 3 |
| 5 | handleExportGesamtExcel | Task 6 |
| 6 | Export-Handler refactoring | Task 1 |
| 7 | Integration & Test | Task 4, 5 |

Tasks 1, 2, 3 sind unabhaengig und koennen parallel ausgefuehrt werden.
Tasks 4, 5, 6 bauen aufeinander auf.
Task 7 ist der finale Integrationstest.
