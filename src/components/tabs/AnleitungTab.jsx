import React from 'react';
// AnleitungTab.jsx — Tab 5: Anleitung / Benutzerhandbuch
// Corresponds to {tab === 5 && (() => { ... })()} in the monolithic file (lines 22446–23691).
// This is the user guide / help tab with 11 sections (overview, import, markt, deepdive,
// optimizer, algorithmen, szenarien, review, reporting, export, glossar).
//
// The full JSX of this tab lives in the monolithic test_lexicographic.html.
// It is extracted here as a thin wrapper that receives all needed state as props
// and renders the complete guide content.

export default function AnleitungTab({
  // Section navigation
  guideSection, setGuideSection,
  // Cross-tab navigation
  setTab,
  // Any refs needed by guide sections (e.g., for scrolling demos)
}) {
  const sections = [
    { id: "overview", icon: "🚀", label: "Überblick" },
    { id: "import", icon: "📥", label: "1. Daten-Import" },
    { id: "markt", icon: "🌍", label: "2. Markt-Analyse" },
    { id: "deepdive", icon: "🔬", label: "3. Deep-Dive" },
    { id: "optimizer", icon: "⚙️", label: "4. Optimierer" },
    { id: "algorithmen", icon: "🧮", label: "Solver & Algorithmen" },
    { id: "szenarien", icon: "📊", label: "5. Szenarien" },
    { id: "review", icon: "📋", label: "6. Portfolio-Review" },
    { id: "reporting", icon: "📈", label: "7. Reporting" },
    { id: "export", icon: "📦", label: "8. Export-Center" },
    { id: "glossar", icon: "📚", label: "Glossar" },
  ];

  // ── Local helper components (defined inline as in the original) ──
  const Shot = ({ children, caption }) => (
    <div className="my-5 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50">
      <div className="bg-slate-700 px-3 py-1.5 flex items-center">
        <span className="text-[10px] text-slate-300 font-mono flex-1">{caption}</span>
        <div className="flex items-center">
          <div className="w-6 h-5 flex items-center justify-center text-slate-400 hover:bg-slate-600 text-[10px]">─</div>
          <div className="w-6 h-5 flex items-center justify-center text-slate-400 hover:bg-slate-600 text-[10px]">□</div>
          <div className="w-6 h-5 flex items-center justify-center text-slate-400 hover:bg-rose-500 text-[10px]">✕</div>
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );

  const Step = ({ n, title, children }) => (
    <div className="flex gap-3 sm:gap-4 mb-6">
      <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-spark-500 to-spark-700 flex items-center justify-center text-white text-xs sm:text-sm font-black shadow-md">{n}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm sm:text-base font-black text-slate-800 mb-1.5">{title}</div>
        <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );

  const Tip = ({ children }) => (
    <div className="bg-spark-50 border border-spark-200 rounded-xl px-4 py-3 my-4 flex gap-3 items-start">
      <span className="text-lg shrink-0">💡</span>
      <div className="text-xs sm:text-sm text-spark-800 font-medium leading-relaxed">{children}</div>
    </div>
  );

  const Warn = ({ children }) => (
    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 my-4 flex gap-3 items-start">
      <span className="text-lg shrink-0">⚠️</span>
      <div className="text-xs sm:text-sm text-rose-800 font-medium leading-relaxed">{children}</div>
    </div>
  );

  const KB = ({ children }) => (
    <code className="bg-slate-100 text-slate-700 text-[11px] px-1.5 py-0.5 rounded font-mono font-bold">{children}</code>
  );

  const GLOSSAR_TERMS = [
    { term: "YTM (Yield to Maturity)", def: "Rendite bei Halten bis Fälligkeit, unter Annahme der Wiederanlage aller Kupons zum gleichen Satz." },
    { term: "I-Spread", def: "Renditedifferenz einer Anleihe gegenüber der interpolierten Swap-Kurve gleicher Laufzeit (in Basispunkten)." },
    { term: "Modified Duration", def: "Maß für die Preissensitivität bei Zinsänderung. Gibt die approximative %-Preisänderung bei 1%-Punkt Zinsänderung an." },
    { term: "Macaulay Duration", def: "Gewichtete durchschnittliche Laufzeit der Cashflows. Berechnung: ModDur × (1 + YTM/100)." },
    { term: "Konvexität", def: "Zweite Ableitung des Preis-Rendite-Zusammenhangs. Misst die Krümmung: Hohe Konvexität = überproportionaler Preisanstieg bei Zinsfall." },
    { term: "Carry", def: "Renditeertrag einer Anleihe bei unveränderter Zinskurve. Carry = Kupon − Finanzierungskosten (vereinfacht: Kupon − Geldmarktsatz)." },
    { term: "Rolldown", def: "Kursgewinn durch Verkürzung der Restlaufzeit auf einer normalen Zinskurve. Rolldown-Rendite = (Preis in 1Y bei heutiger Kurve − heutiger Preis) / heutiger Preis." },
    { term: "Rich/Cheap", def: "Relative-Value-Analyse: \"Rich\" = teurer als Peers (niedriger Spread vs. Modell), \"Cheap\" = guenstiger als Peers (hoher Spread vs. Modell)." },
    { term: "Lower-of-Prinzip", def: "Für regulatorische Zwecke gilt immer das schlechtere der beiden Ratings (Moody's vs. S&P). Bsp.: Aa3/BBB+ → BBB+ (da 8 > 4)." },
    { term: "KSA-Risikogewicht", def: "Kreditrisiko-Standardansatz nach Basel III/CRR3. Typisch: 20% (AA- bis A-), 50% (BBB+ bis BBB-), 100% (BB+ und schlechter)." },
    { term: "RWA", def: "Risk-Weighted Assets = Nominal × RW/100 × 8%. Maß für die Eigenkapitalunterlegung." },
    { term: "CRR3", def: "Capital Requirements Regulation 3 — Überarbeitete EU-Eigenkapitalverordnung (ab 2025). Aktualisiert Risikogewichte und Fälligkeitsmethoden." },
    { term: "Senior Preferred (SP)", def: "Höchstrangige unbesicherte Bankanleihe im BRRD-Abwicklungsregime. Wird zuletzt für Bail-in herangezogen." },
    { term: "Senior Non-Preferred (SNP)", def: "Strukturell nachrangig zu SP, aber vorrangig zu Tier 2. Teil der MREL-Puffer." },
    { term: "MREL", def: "Minimum Requirement for own funds and Eligible Liabilities. Mindestanforderung an verlustabsorbierende Verbindlichkeiten." },
    { term: "ESG / Green Bond", def: "Anleihe, deren Erlös für ökologisch oder sozial nachhaltige Projekte verwendet wird (ICMA Green Bond Principles)." },
    { term: "Fixed Rate Bullet", def: "Anleihe mit festem Kupon und Rückzahlung zu 100% am Fälligkeitstag — keine vorzeitige Kündigung, kein variabler Zins." },
    { term: "Heuristischer Solver (Greedy)", def: "Heuristischer Optimierungsalgorithmus, der iterativ den besten verfügbaren Bond hinzufügt. Im UI als ⚡ Heuristisch. Schnell, deterministisch, gut diversifiziert." },
    { term: "Linearer Solver (LP)", def: "Linearer Programmierungs-Solver (javascript-lp-solver). Im UI als 🧮 Linear. Findet die mathematisch optimale Lösung unter allen Constraints via Simplex-Verfahren." },
    { term: "MIP (Mixed Integer Programming)", def: "Gemischt-ganzzahlige Programmierung. Erweitert LP um ganzzahlige Variablen (z.B. Losgrößen als Vielfache von 100.000 €). Lösung via Branch-and-Bound." },
    { term: "HiGHS", def: "Open-Source MIP/LP-Solver (University of Edinburgh). In der Engine als WebAssembly kompiliert — läuft vollständig im Browser." },
    { term: "Lexikographische Optimierung", def: "Sequenzielle Multi-Ziel-Optimierung: Ziel 1 wird zuerst optimiert, dann Ziel 2 unter Beibehaltung von Ziel 1 (mit Toleranz), usw. Ideal für hierarchische Zielsysteme." },
    { term: "Auto-Optimize", def: "Automatische Parameter-Suche: 1.000 zufällige Szenarien → Pareto-Filter → Diversitäts-Selektion → MIP-Refinement. Ergebnis: 5–10 Pareto-optimale Portfolios." },
    { term: "Pareto-Front", def: "Menge aller nicht-dominierten Lösungen in einem Mehrziel-Problem. Ein Portfolio ist pareto-optimal, wenn kein anderes in allen Zielen besser ist." },
    { term: "Kategorie-Limit", def: "Min-/Max-Beschränkung für eine Kategorie (z.B. Rating AA+: Max 30%). Kann in % des Budgets oder als absoluter Mio.-€-Betrag angegeben werden." },
    { term: "UnitToggle", def: "UI-Element zum Umschalten zwischen Prozent (% des Budgets) und absolutem Betrag (Mio. €) für Kategorie-Limits." },
    { term: "Laufzeit-Bucket", def: "Laufzeitband (z.B. 0-1Y, 1-2Y, 3-5Y, 7-10Y, 10Y+). Jeder Bucket kann eigene Min-/Max-Allokationslimits haben." },
    { term: "ISIN-Ausnahme", def: "Einzelne Anleihe (identifiziert per ISIN), die explizit von der Optimierung ausgeschlossen wird. Im Optimierer unter Anlageuniversum." },
    { term: "Explorer-Preset", def: "Vordefiniertes Filterprofil für die Markt-Analyse: Erwerb (enger Filter für Neuanlagen), Bestand (breit), Nur Länder (regionaler Fokus)." },
    { term: "Anlagerichtlinie", def: "Regelwerk für zulässige Investments: Rating-Mindestanforderungen, Länderlimits, Laufzeitbeschränkungen etc. Wird als Preset im Optimierer abgebildet." },
    { term: "Universum-Profil", def: "Gespeicherte Filterkonfiguration für die Markt-Analyse. Kann geladen, exportiert und importiert werden." },
    { term: "Constraint-Analyse", def: "Auswertung nach der Optimierung: Zeigt für jede Restriktion die Auslastung und ob sie bindend ist (die Lösung aktiv einschränkt)." },
    { term: "Overlap-Analyse", def: "Vergleich zweier Portfolios/Szenarien: ISIN-Überschneidung, gemeinsames Volumen, Jaccard-Index (0% = keine Gemeinsamkeit, 100% = identisch)." },
    { term: "Rendite / RW (yRw)", def: "Rendite geteilt durch Risikogewicht in %. Maß für risikoadjustierte Rendite: yRw = YTM / (RW/100)." },
    { term: "Rendite je BP Duration (retPVBP)", def: "Rendite geteilt durch Duration. Misst den Carry pro Einheit Zinsrisiko. Im UI als Zielfunktion Rendite je Basispunkt Duration." },
    { term: "LQA (Liquiditätsscore)", def: "Bloomberg-Liquiditätsbewertung (0–100). Höhere Werte = liquidere Anleihe." },
    { term: "CET1-Quote", def: "Common Equity Tier 1 Ratio. Kernkapitalquote einer Bank — Maß für Kapitalisierung und Bonität." },
    { term: "VAG/KAGB", def: "Versicherungsaufsichtsgesetz / Kapitalanlagegesetzbuch — regulatorischer Rahmen für institutionelle Kapitalanlagen in Deutschland." },
    { term: "ASW (Asset Swap Spread)", def: "Renditedifferenz einer Anleihe zum variablen Satz eines Asset Swaps. Vergleichbar mit I-Spread." },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-md">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-slate-100 pb-4 sm:pb-6">
          <div className="bg-gradient-to-br from-spark-500 to-spark-700 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-lg text-white shrink-0">📖</div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-slate-800 uppercase tracking-widest">Benutzerhandbuch</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Portfolio Engine V3.6 — Schritt-für-Schritt Anleitung</p>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-100">
          {sections.map(s => (
            <button key={s.id} onClick={() => setGuideSection(s.id)}
              className={"px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all " +
                (guideSection === s.id
                  ? "bg-spark-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              <span className="mr-1">{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {guideSection === "overview" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>🚀</span> Überblick & Workflow</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Die Portfolio Engine ist ein institutionelles Werkzeug zur Optimierung von EUR-denominierten Fixed-Income-Portfolios im Bankensektor.
              Sie unterstützt den gesamten Workflow von der Datenaufbereitung bis zum Export unter Einhaltung regulatorischer Vorgaben (VAG/KAGB, Basel III KSA, CRR3).
              Drei Solver (Greedy, LP, MIP) laufen parallel und werden automatisch verglichen.
            </p>
            <Shot caption="Workflow — 8 Schritte von Daten bis Export">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 items-stretch">
                {[
                  { n: "1", icon: "📥", title: "Import", desc: "Bloomberg-Daten laden", color: "from-slate-500 to-slate-700" },
                  { n: "2", icon: "🌍", title: "Markt", desc: "Universum analysieren", color: "from-slate-500 to-slate-700" },
                  { n: "3", icon: "🔬", title: "Deep-Dive", desc: "Detailanalysen", color: "from-slate-500 to-slate-700" },
                  { n: "4", icon: "⚙️", title: "Optimierer", desc: "Portfolio konstruieren", color: "from-spark-500 to-spark-700" },
                  { n: "5", icon: "📊", title: "Szenarien", desc: "Strategien vergleichen", color: "from-slate-500 to-slate-700" },
                  { n: "6", icon: "📋", title: "Review", desc: "Kennzahlen prüfen", color: "from-slate-500 to-slate-700" },
                  { n: "7", icon: "📈", title: "Reporting", desc: "Präsentationen", color: "from-slate-500 to-slate-700" },
                  { n: "8", icon: "📦", title: "Export", desc: "Excel-Dateien", color: "from-slate-500 to-slate-700" },
                ].map((s, i) => (
                  <React.Fragment key={s.n}>
                    <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2 text-center min-w-0">
                      <div className={"w-7 h-7 mx-auto rounded-lg bg-gradient-to-br " + s.color + " flex items-center justify-center text-white text-[10px] font-black mb-1.5 shadow-sm"}>{s.n}</div>
                      <div className="text-base mb-0.5">{s.icon}</div>
                      <div className="text-[10px] font-black text-slate-800 truncate">{s.title}</div>
                      <div className="text-[9px] text-slate-500 truncate">{s.desc}</div>
                    </div>
                    {i < 7 && <div className="hidden sm:flex items-center px-0.5 text-slate-300 text-sm">{"→"}</div>}
                  </React.Fragment>
                ))}
              </div>
            </Shot>
            <h4 className="text-sm font-black text-slate-700 mt-8 mb-3">Kernprinzipien</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: "⚖️", title: "Lower-of-Prinzip", desc: "Für Ratings gilt immer das schlechtere von Moody's und S&P" },
                { icon: "🧮", title: "Multi-Solver (Greedy+LP+MIP)", desc: "Drei Solver-Verfahren laufen parallel mit automatischem Vergleich" },
                { icon: "📏", title: "Kategorie-Limitsystem (% / Mio. €)", desc: "Rating-, Rang-, Struktur-, Sektor- und Länderlimits mit umschaltbarer Einheit" },
                { icon: "🌱", title: "ESG-Integration", desc: "MSCI ESG-Ratings, Green-Bond-Status und ESG-Quoten-Ziele im Optimierer" },
                { icon: "💾", title: "Lokale Speicherung", desc: "Alle Einstellungen, Presets, Universum-Profile und Szenarien im Browser gespeichert" },
                { icon: "🇪🇺", title: "EUR & EWR", desc: "Nur EUR-denominierte Anleihen aus dem EWR oder den USA" },
              ].map(p => (
                <div key={p.title} className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex gap-3 items-start">
                  <span className="text-xl shrink-0">{p.icon}</span>
                  <div><div className="text-xs font-bold text-slate-800">{p.title}</div><div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div></div>
                </div>
              ))}
            </div>
            <h4 className="text-sm font-black text-slate-700 mt-8 mb-3">Schnellzugriff auf Abschnitte</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "import", icon: "📥", label: "Daten-Import" },
                { id: "markt", icon: "🌍", label: "Markt-Analyse" },
                { id: "deepdive", icon: "🔬", label: "Deep-Dive" },
                { id: "optimizer", icon: "⚙️", label: "Optimierer" },
                { id: "algorithmen", icon: "🧮", label: "Solver & Algorithmen" },
                { id: "szenarien", icon: "📊", label: "Szenarien" },
                { id: "review", icon: "📋", label: "Portfolio-Review" },
                { id: "reporting", icon: "📈", label: "Reporting" },
                { id: "export", icon: "📦", label: "Export-Center" },
                { id: "glossar", icon: "📚", label: "Glossar" },
              ].map(s => (
                <button key={s.id} onClick={() => setGuideSection(s.id)} className="bg-slate-50 rounded-lg border border-slate-100 p-2 text-left hover:bg-spark-50 hover:border-spark-200 transition-all">
                  <div className="flex items-center gap-2"><span>{s.icon}</span><span className="text-[11px] font-bold text-spark-600 hover:underline">{s.label}</span></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ IMPORT ═══ */}
        {guideSection === "import" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📥</span> Schritt 1: Daten-Import</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Im Import-Tab laden Sie Ihr Anleihe-Universum. Die Engine arbeitet mit einem vordefinierten Demo-Datensatz,
              Sie können aber eigene Daten im CSV/TSV-Format aus Bloomberg importieren.
            </p>
            <Step n="1" title="Universum-Manager öffnen">
              Beim Start ist das Demo-Universum aktiv. Im Dropdown sehen Sie alle geladenen Datensätze. Sie können zwischen verschiedenen Universen wechseln.
            </Step>
            <Step n="2" title="CSV/TSV-Datei importieren">
              Klicken Sie auf <KB>Eigene Daten importieren</KB>. Die Datei muss folgende Spalten enthalten (Semikolon- oder Tab-getrennt): ISIN, Emittent, Ticker, Moody's, S&P, Kpn, Brf-Rdte / Mid-Rendite, YAS ISpd, YAS Mod Dur, Jahre ab heute bis Fäll., Fälligkeit, Fäll.-Typ, Rang, KpnTyp, Währung, GB/Ln Ind, MSCI ESG Rating, Brief, Ausst. Betr., LQA Liq Sc, Ob. Mutter Lnd..., KSA-RW (%).
            </Step>
            <Step n="3" title="Daten prüfen">
              Nach dem Import zeigt eine Vorschau-Tabelle die ersten 5 geparsten Anleihen. Prüfen Sie, ob Ratings, Renditen und Laufzeiten korrekt erkannt wurden.
            </Step>
            <Warn>Falsch formatierte Zeilen (fehlende Pflichtfelder, nicht-numerische Renditen) werden automatisch übersprungen. Achten Sie auf die Anzahl im Universum-Manager.</Warn>
            <Tip>Das Land wird automatisch aus dem ISIN-Prefix abgeleitet (FR → Frankreich), wenn keine Länderspalte vorhanden ist.</Tip>
          </div>
        )}

        {/* ═══ MARKT-ANALYSE ═══ */}
        {guideSection === "markt" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>🌍</span> Schritt 2: Markt-Analyse</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Der Markt-Tab bietet eine umfassende Übersicht über das geladene Anleihe-Universum. Alle Statistiken sind emissionsvolumengewichtet.
            </p>
            <Step n="1" title="Explorer-Presets & Universum-Profile">
              Am oberen Rand finden Sie zwei Werkzeuge zur schnellen Filterung: Explorer-Presets (Anlagerichtlinien) und Universum-Profile (Speichern/Laden/Export).
            </Step>
            <Step n="2" title="Universum-Filter setzen">
              Die Filterleiste bietet Felder für: Emittent, Land, Rating, Risikogewicht (KSA), ESG-Status, Zahlungsrang (SP/SNP), Fälligkeitstyp (Bullet/Call), Kupon (Min–Max), Rendite (Min–Max), Preis (Min–Max), Duration (Min–Max) und Laufzeit (Min–Max).
            </Step>
            <Tip>Gefilterte Bonds werden sofort in allen Ansichten (Stats, Scatter, Emittenten) aktualisiert — kein Button-Klick nötig.</Tip>
          </div>
        )}

        {/* ═══ DEEP-DIVE ═══ */}
        {guideSection === "deepdive" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>🔬</span> Schritt 3: Deep-Dive</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Der Deep-Dive-Tab enthält 12 spezialisierte Analyse-Module für eine eingehende Marktanalyse.
            </p>
            {[
              { icon: "🌡️", title: "Markt-Barometer", desc: "Kompakte KPI-Übersicht mit Vergleich zum historischen Durchschnitt" },
              { icon: "🎯", title: "Konzentrations-Radar", desc: "Herfindahl-Index für Emittenten, Länder, Rating und Sektor" },
              { icon: "📉", title: "Spread-Kurve", desc: "Spread vs. Laufzeit-Kurve mit Regressionsband" },
              { icon: "💧", title: "Liquiditäts-Dashboard", desc: "LQA-Score-Verteilung, Volumen-Quintile" },
              { icon: "🏗️", title: "Kupontyp & Struktur", desc: "Fixed/Variable/Zero/Callable-Aufschlüsselung" },
              { icon: "💰", title: "Carry & Rolldown", desc: "Carry-Analyse und geschätzter 1Y-Rolldown nach Laufzeit-Bucket" },
              { icon: "🌱", title: "ESG-Deep-Dive", desc: "Green Bond Anteil, MSCI ESG-Rating-Verteilung" },
              { icon: "📏", title: "Kennzahlen-Ranges", desc: "Box-Plots für Rendite, Spread, Duration, Preis und Kupon" },
              { icon: "🏭", title: "Sektor-Analyse", desc: "iBoxx L3-Sektoren: Volumen, Spread, Rendite, Duration" },
              { icon: "🏛️", title: "RWA / Regulatorik", desc: "KSA-Risikogewicht-Verteilung, RWA-Effizienz, CRR3-Analyse" },
              { icon: "📐", title: "Konvexitäts-Analyse", desc: "Convexity vs. Duration-Scatter, Konvexitäts-Prämie" },
              { icon: "🔬", title: "Peer-Group & Rich/Cheap", desc: "Residual-Analyse vs. Spread-Kurven-Modell" },
            ].map(m => (
              <div key={m.title} className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-2 flex gap-3 items-start">
                <span className="text-xl shrink-0">{m.icon}</span>
                <div><div className="text-xs font-bold text-slate-800">{m.title}</div><div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ OPTIMIERER ═══ */}
        {guideSection === "optimizer" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>⚙️</span> Schritt 4: Optimierer</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Der Optimierer-Tab ist das Herzstück der Portfolio Engine. Hier konfigurieren Sie Ihr Zielportfolio und starten die Optimierung.
            </p>
            <Step n="1" title="Strategie auswählen (Preset-Kacheln)">
              Wählen Sie eine der vordefinierten Strategien (z.B. Max. Rendite, Max. Spread, ESG First). Jede Strategie setzt sofort die passende Zielfunktion.
            </Step>
            <Step n="2" title="Solver auswählen">
              Wählen Sie einen oder mehrere Solver: <KB>🎯 MIP</KB> (mathematisch optimal, empfohlen), <KB>🧮 Linear</KB> (LP, schnell), <KB>⚡ Heuristik</KB> (Greedy, Fallback).
            </Step>
            <Step n="3" title="Parameter konfigurieren">
              Im aufklappbaren Parameter-Panel: Budget, Anleihe-Limits, Emittenten-Limits, Rating-Mindestanforderung, ESG-Quote, Länderlimits, Kategorie-Limits (Rating, Rang, Struktur, Sektor), Bandbreiten (Duration, Laufzeit, Kupon, Preis).
            </Step>
            <Step n="4" title="Solver starten">
              Klicken Sie auf <KB>🔀 Solver starten</KB>. Die Engine berechnet das optimale Portfolio und zeigt Kennzahlen, Anleihen-Tabelle und Frontier-Charts.
            </Step>
            <Tip>Speichern Sie häufig genutzte Parameterkonfigurationen als eigene Strategie mit <KB>💾 Speichern</KB>.</Tip>
          </div>
        )}

        {/* ═══ ALGORITHMEN ═══ */}
        {guideSection === "algorithmen" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>🧮</span> Solver & Algorithmen</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Die Portfolio Engine verwendet drei Solver-Verfahren, die parallel laufen und verglichen werden.
            </p>
            {[
              { icon: "⚡", title: "Greedy-Heuristik", desc: "Iterativer Algorithmus. Sortiert alle Bonds nach Ziel (z.B. Rendite), prüft Constraints und fügt den besten verfügbaren Bond hinzu. Sehr schnell (< 50ms), deterministisch, lokal optimal. Kein WASM-Download erforderlich." },
              { icon: "🧮", title: "LP (Linear Programming)", desc: "javascript-lp-solver via Simplex-Verfahren. Findet die global optimale Lösung für lineare Constraints und lineare Zielfunktion. Läuft im Browser (kein Server). Optimal für Standard-Objectives, ca. 0.5–2s." },
              { icon: "🎯", title: "MIP (Mixed Integer Programming)", desc: "HiGHS-Solver via WebAssembly. Erweitert LP um ganzzahlige Entscheidungsvariablen (Losgröße als Vielfache). Mathematisch optimal, auch für diskrete Constraints. Ca. 2–10s je nach Instanzgröße." },
            ].map(s => (
              <div key={s.title} className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-3">
                <div className="flex items-center gap-2 mb-2"><span className="text-xl">{s.icon}</span><span className="text-sm font-black text-slate-800">{s.title}</span></div>
                <div className="text-xs text-slate-600 leading-relaxed">{s.desc}</div>
              </div>
            ))}
            <h4 className="text-sm font-black text-slate-700 mt-6 mb-3">Spezielle Optimierungs-Modi</h4>
            {[
              { icon: "📊", title: "Multi-Strategie", desc: "Mehrere Preset-Strategien gleichzeitig auswählen und in einem Durchlauf berechnen. Ergebnis: Alle Portfolios im Szenarien-Vergleich." },
              { icon: "📐", title: "Lexikographische Optimierung", desc: "Hierarchische Ziel-Kette: Ziel 1 zuerst optimieren, dann Ziel 2 mit Toleranz auf Ziel 1, usw. Bis zu 4 Ziele konfigurierbar." },
              { icon: "🤖", title: "Auto-Optimize", desc: "Automatische Exploration von ~3.500 Parameterkombinationen. Pareto-Filter → Top-5 Portfolios. Ergebnis im Auto-Optimize-Panel." },
              { icon: "📈", title: "Effizienz-Frontier", desc: "Systematische Variation eines Parameters (z.B. ESG-Quote 0%–100%) und Berechnung des Portfolios für jeden Punkt. Visualisiert als Kurve." },
            ].map(s => (
              <div key={s.title} className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-2 flex gap-3 items-start">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div><div className="text-xs font-bold text-slate-800">{s.title}</div><div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SZENARIEN ═══ */}
        {guideSection === "szenarien" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📊</span> Schritt 5: Szenarien-Vergleich</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Im Szenarien-Tab vergleichen Sie mehrere gespeicherte Portfolios und Strategien.
            </p>
            <Step n="1" title="Szenario speichern">
              Nach jeder Optimierung: Klick auf <KB>📌 Szenario</KB> im Parameter-Panel. Geben Sie einen Namen und ein Emoji-Icon ein.
            </Step>
            <Step n="2" title="Szenarien auswählen">
              Im Szenarien-Tab wählen Sie 2–10 Szenarien per Klick auf die farbigen Kacheln.
            </Step>
            <Step n="3" title="Vergleich analysieren">
              10 Vergleichs-Panels: KPI-Grid, Tabelle, Profil, Overlap-Analyse, Risiko-Sensitivität, Relative Value, Restriktionen, Allokation, Scatter, Verteilungen.
            </Step>
            <Tip>Szenarien werden im localStorage gespeichert und bleiben beim nächsten Seitenaufruf erhalten. Exportieren Sie alle Szenarien als Excel über den Export-Center-Tab.</Tip>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {guideSection === "review" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📋</span> Schritt 6: Portfolio-Review</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Der Review-Tab zeigt eine detaillierte Analyse des aktuellen Portfolios im Vergleich zur Benchmark.
            </p>
            {[
              { icon: "🏆", title: "Portfoliovergleich", desc: "Side-by-side Tabelle: Portfolio vs. Benchmark. Alle KPIs mit Farb-Deltas (grün = besser, rot = schlechter). Optional: Bestand vs. Neuanlage aufgeteilt." },
              { icon: "📊", title: "Kennzahlen-Kacheln", desc: "Interaktive KPI-Kacheln mit Benchmark-Delta. Reihenfolge per Drag-and-Drop anpassbar. Ein-/Ausblenden über Einstellungen." },
              { icon: "⚖️", title: "Vergleichspanels", desc: "Rating-, Land-, Sektor-, Rang-, Struktur-Verteilung: Portfolio vs. Benchmark als gestapelte Balken." },
              { icon: "🔵", title: "Scatter Matrix", desc: "Risiko-Rendite-Scatter mit Portfolio-Bonds (farbig) und Benchmark-Bonds (grau). Konfigurierbare X/Y-Achsen und Farbgruppierung." },
              { icon: "📈", title: "Verteilungen", desc: "Histogramme für alle KPIs: Rendite, Spread, Duration, Preis, Kupon, Rating, ESG." },
              { icon: "🏦", title: "Emittenten-Analyse", desc: "Emittenten-Konzentrations-Tabelle mit Volumen, Anteil und ESG-Status." },
            ].map(p => (
              <div key={p.title} className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-2 flex gap-3 items-start">
                <span className="text-xl shrink-0">{p.icon}</span>
                <div><div className="text-xs font-bold text-slate-800">{p.title}</div><div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ REPORTING ═══ */}
        {guideSection === "reporting" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📈</span> Schritt 7: Reporting</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Der Reporting-Tab erzeugt druckfertige Report-Slides und ermöglicht den Export als PowerPoint.
            </p>
            {[
              { n: "1", title: "Executive Summary", desc: "Kompakte KPI-Übersicht: Budget, Anzahl, Rendite, Spread, Duration, ESG-Quote, Delta vs. Benchmark." },
              { n: "2", title: "Rating-Verteilung", desc: "Balkendiagramm Portfolio vs. Benchmark nach Rating-Klassen (AAA bis B und NR)." },
              { n: "3", title: "Laufzeit-Profil", desc: "Fälligkeits-Profil nach Jahresbändern (0-1Y, 1-3Y, 3-5Y, 5-7Y, 7-10Y, 10Y+)." },
              { n: "4", title: "Länder-Verteilung", desc: "Treemap der Länder-Allokation nach Nominalvolumen." },
              { n: "5", title: "Top-Emittenten", desc: "Emittenten-Konzentrations-Tabelle (Top 10) mit Volumen, Anteil und Rating." },
              { n: "6", title: "Struktur & Kupon-Typ", desc: "Aufschlüsselung nach Bullet/Callable und Fixed/Variable." },
              { n: "7", title: "Risiko-Rendite-Scatter", desc: "Alle Portfolio-Bonds im Duration/Spread-Raum." },
              { n: "8", title: "KPI-Tabelle", desc: "Vollständige Kennzahlen-Übersicht im Tabellenformat." },
            ].map(s => (
              <Step key={s.n} n={s.n} title={s.title}>{s.desc}</Step>
            ))}
            <Tip>Der PowerPoint-Export erzeugt eine .pptx-Datei mit allen 8 Slides. Klicken Sie auf <KB>📥 PowerPoint</KB> in der Toolbar.</Tip>
          </div>
        )}

        {/* ═══ EXPORT ═══ */}
        {guideSection === "export" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📦</span> Schritt 8: Export-Center</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Das Export-Center bündelt alle verfügbaren Excel-Exporte und bietet KI-Analyse-Prompts.
            </p>
            {[
              { icon: "🌍", title: "Universum-Export", desc: "11 Excel-Reiter: Gesamt, Gefiltert, Richtlinien, Vergleich, Verteilungen, Scatter, Spread-Kurve, Emittenten-Top50, Histogramme, Fälligkeitsprofil, Info." },
              { icon: "👤", title: "Universum-Profile", desc: "9 Reiter: Vergleich aller gespeicherten Profile mit dem Gesamt-Universum." },
              { icon: "💼", title: "Zielportfolio", desc: "15 Reiter: Portfolio, Kennzahlen, Emittenten, Verteilungen, Universum, Regelwerk, Scatter, Benchmark-Vergleich, Bestand vs. Neu." },
              { icon: "📊", title: "Szenarien-Vergleich", desc: "10 Reiter: Alle gespeicherten Szenarien im Vergleich mit KPIs, Verteilungen und Bond-Listen." },
              { icon: "🔬", title: "Markt-Deep-Dive", desc: "18 Reiter: Alle Deep-Dive-Analysen als strukturierte Excel-Tabellen." },
              { icon: "📦", title: "Gesamt-Export", desc: "Konsolidierte Excel mit allen verfügbaren Daten in einer Datei (Duplikate werden entfernt)." },
            ].map(p => (
              <div key={p.title} className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-2 flex gap-3 items-start">
                <span className="text-xl shrink-0">{p.icon}</span>
                <div><div className="text-xs font-bold text-slate-800">{p.title}</div><div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div></div>
              </div>
            ))}
            <h4 className="text-sm font-black text-slate-700 mt-6 mb-2">KI-Analyse-Prompts</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jeder Export-Button hat zwei KI-Buttons: <span className="font-bold text-amber-600">🔍 Prüfen</span> (Qualitätsprüfung) und <span className="font-bold text-blue-600">📊 Reporting</span> (Management-Bericht). Klick kopiert den Prompt in die Zwischenablage — dann Excel in ChatGPT / Claude hochladen und Prompt einfügen.
            </p>
          </div>
        )}

        {/* ═══ GLOSSAR ═══ */}
        {guideSection === "glossar" && (
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><span>📚</span> Glossar</h3>
            <div className="divide-y divide-slate-50">
              {GLOSSAR_TERMS.map(g => (
                <div key={g.term} className="flex gap-3 items-start py-2 border-b border-slate-50">
                  <div className="shrink-0 w-48 sm:w-56 text-xs font-black text-slate-800">{g.term}</div>
                  <div className="text-xs text-slate-600 leading-relaxed">{g.def}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
