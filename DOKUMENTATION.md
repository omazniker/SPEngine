# Portfolio Engine V3.6 -- Vollstaendige technische Dokumentation

Single-File HTML-Anwendung (23.813 Zeilen, 2,4 MB) fuer Bond-Portfolio-Optimierung und -Analyse.

**Production-Datei:** `portfolio_engine.html` -- im Browser oeffnen, fertig.

---

## Inhaltsverzeichnis

1. [Technologie-Stack & CDN-URLs](#1-technologie-stack)
2. [CSS & Design-System](#2-css--design-system)
3. [Datenmodell](#3-datenmodell)
4. [Rating-System](#4-rating-system)
5. [Emittenten-Datenbank](#5-emittenten-datenbank)
6. [Laender & Regionen](#6-laender--regionen)
7. [LocalStorage & Session-Management](#7-localstorage--session-management)
8. [Solver-Architektur](#8-solver-architektur)
9. [LP-Solver (optimizeLP)](#9-lp-solver)
10. [MIP-Solver v1 (optimizeMIP)](#10-mip-solver-v1)
11. [MIP-Solver v2 (optimizeMIP_v2)](#11-mip-solver-v2)
12. [Lexicographic Optimization](#12-lexicographic-optimization)
13. [Auto-Optimize Engine](#13-auto-optimize-engine)
14. [Greedy Fallback](#14-greedy-fallback)
15. [Constraints & Restriktionen](#15-constraints--restriktionen)
16. [Portfolio-Statistiken (stats)](#16-portfolio-statistiken)
17. [React-Komponenten](#17-react-komponenten)
18. [Tabs & Module](#18-tabs--module)
19. [Deep-Dive Analyse](#19-deep-dive-analyse)
20. [Szenarien-Vergleich](#20-szenarien-vergleich)
21. [Tabellen & Filter](#21-tabellen--filter)
22. [Scatter-Matrix](#22-scatter-matrix)
23. [Export-Funktionen](#23-export-funktionen)
24. [Anlagerichtlinien-Engine](#24-anlagerichtlinien-engine)
25. [Benutzerhandbuch & Glossar](#25-benutzerhandbuch)
26. [App-Initialisierung](#26-app-initialisierung)
27. [Utility-Funktionen](#27-utility-funktionen)
28. [Datenfluss-Diagramm](#28-datenfluss)

---

## 1. Technologie-Stack

### CDN-Bibliotheken (Zeile 6-23)

| Bibliothek | Version | CDN-URL | Zweck |
|---|---|---|---|
| React | 18.x | `cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js` | UI-Rendering |
| React-DOM | 18.x | `cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js` | DOM-Binding |
| Babel Standalone | 7.x | `cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js` | JSX-Transpilation im Browser |
| Tailwind CSS | Latest | `cdn.tailwindcss.com` | CSS-Framework |
| SheetJS (XLSX) | 0.18.5 | `cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` | Excel-Import/Export |
| JSZip | 3.10.1 | `cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js` | ZIP fuer XLSX-Post-Processing |
| Chart.js | 4.x | `cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js` | Datenvisualisierung |
| PptxGenJs | 3.x | `cdn.jsdelivr.net/npm/pptxgenjs@3/dist/pptxgen.bundle.js` | PowerPoint-Export |
| Source Sans 3 | 400-900 | `fonts.googleapis.com/css2?family=Source+Sans+3` | Schriftart |

### Inline-gebundelte Bibliotheken

| Bibliothek | Version | Zeile | Zweck |
|---|---|---|---|
| javascript-lp-solver | 0.4.24 | ~437 | Lineares Programmieren (LP) |

### Dynamisch geladene Solver (CDN, Zeile 2306-2309)

| Solver | Version | URL |
|---|---|---|
| HiGHS WASM | 1.0.1 | `cdn.jsdelivr.net/npm/highs@1.0.1/build/` |
| HiGHS WASM | 1.8.0 | `cdn.jsdelivr.net/npm/highs@1.8.0/build/` (Fallback) |

### Babel-Konfiguration (Zeile 10-17)
```javascript
// Unterdrueckt >500KB compact-Warnung
Babel.transform = function(code, opts) {
  return _t.call(this, code, Object.assign({}, opts, { compact: false }));
};
```

---

## 2. CSS & Design-System

### 2.1 Farbsystem "Spark Red" (Zeile 28-31)

| Variable | Hex | Verwendung |
|---|---|---|
| `--spark-50` | `#fff5f5` | Hover-Hintergrund |
| `--spark-100` | `#ffe0e0` | Leichte Akzente |
| `--spark-200` | `#ffb3b3` | Badges, Tags |
| `--spark-300` | `#ff8080` | Sekundaere Akzente |
| `--spark-400` | `#ff4d4d` | Aktive Elemente |
| `--spark-500` | `#E2001A` | **PRIMARY RED** (Buttons, Headers, Charts) |
| `--spark-600` | `#C4001A` | Hover-States |
| `--spark-700` | `#A30016` | Pressed-States |
| `--spark-800` | `#7A0010` | Dunkle Akzente |
| `--spark-900` | `#52000B` | Dunkelster Ton |

Tailwind-Klassen generiert (Zeile 324-363): `bg-spark-*`, `text-spark-*`, `border-spark-*`, `hover:bg-spark-*`, `focus:ring-spark-*`, Gradients.

### 2.2 Fluid Scale System (Zeile 35-57)

Alle Groessen skalieren stufenlos via `clamp()` von 320px bis 1280px Viewport.

**Typografie:**

| Variable | Min | Preferred | Max | Einsatz |
|---|---|---|---|---|
| `--fs-2xs` | 8px | 1.8vw | 9px | Kleinste Labels |
| `--fs-xs` | 9px | 2vw | 10px | KPI-Labels, Tabellen-Header |
| `--fs-sm` | 10px | 2.2vw | 11px | Tabellen-Zellen, Tags |
| `--fs-md` | 11px | 2.5vw | 12px | Sekundaertext |
| `--fs-base` | 12px | 2.8vw | 14px | Koerpertext, Inputs |
| `--fs-lg` | 14px | 3.2vw | 16px | Section-Headers, Preset-Icons |
| `--fs-xl` | 16px | 3.8vw | 20px | KPI-Werte, Nav-Icons |
| `--fs-2xl` | 18px | 4.5vw | 24px | Grosse Ueberschriften |
| `--fs-3xl` | 22px | 5.5vw | 30px | Seitentitel |

**Spacing:**

| Variable | Min | Preferred | Max |
|---|---|---|---|
| `--sp-1` | 2px | 0.5vw | 4px |
| `--sp-2` | 4px | 0.8vw | 8px |
| `--sp-3` | 6px | 1.2vw | 12px |
| `--sp-4` | 8px | 1.6vw | 16px |
| `--sp-5` | 12px | 2vw | 20px |
| `--sp-6` | 16px | 2.5vw | 24px |

**Border Radius:**

| Variable | Min | Preferred | Max |
|---|---|---|---|
| `--r-sm` | 4px | 0.8vw | 6px |
| `--r-md` | 6px | 1vw | 8px |
| `--r-lg` | 8px | 1.2vw | 12px |
| `--r-xl` | 10px | 1.5vw | 16px |

### 2.3 CSS-Klassen-Uebersicht (Zeile 70-232)

| Klasse | Eigenschaft | Zeile |
|---|---|---|
| `.kpi-grid .kpi-label` | font-size: var(--fs-xs), letter-spacing: 0.06em | 70 |
| `.kpi-grid .kpi-value` | font-size: var(--fs-xl) | 71 |
| `.kpi-grid .kpi-card` | padding: var(--sp-3), border-radius: var(--r-lg) | 72 |
| `.preset-carousel > *` | padding: var(--sp-2) var(--sp-3), border-radius: var(--r-lg) | 76 |
| `th` | font-size: var(--fs-xs), padding: var(--sp-2) var(--sp-3) | 88 |
| `td` | font-size: var(--fs-sm), padding: var(--sp-1) var(--sp-2) | 89 |
| `.solver-btn` | font-size: var(--fs-base), padding: var(--sp-3) var(--sp-5) | 133 |
| `.brand-text` | font-size: var(--fs-lg) | 145 |
| `.nav-tab` | font-size: var(--fs-sm) | 146 |
| `.report-slide` | bg white, border 1px #e2e8f0, radius 1rem, shadow | 221 |
| `.report-slide-title` | font-weight 900, border-bottom 3px spark-500 | 222 |

### 2.4 Responsive Design (Zeile 244-290)

**Mobile (max-width: 640px):**
- Bottom-Navigation statt Header-Tabs
- Touch-Inputs: min-height 38px
- Sticky erste Tabellen-Spalte
- Full-width Modals
- Safe-area Insets fuer Notch-Geraete (Zeile 284-288)
- font-size: 16px auf Inputs (verhindert iOS-Zoom)

**Desktop:**
- Header-Tab-Navigation
- Multi-Column Layouts (Tailwind Grid)
- Custom Scrollbar (Zeile 302-306): 6px breit, spark-300 Thumb

**Print Media (Zeile 226-228):**
- Versteckt: Bottom-Nav, Report-Toolbar, Nav, Scroll-FAB

---

## 3. Datenmodell

### 3.1 Bond-Array (Zeile 450-2367)

**1.643 Anleihen** inline eingebettet als `const B = [...]`.

**Vollstaendige Feld-Tabelle:**

| Feld | Typ | Beschreibung | Beispiel | Quelle |
|------|-----|--------------|----------|--------|
| `id` | Number | Eindeutige ID | 1 | Auto |
| `e` | String | Emittent (vollstaendiger Name) | "IBERCAJA BANCO SA" | Bloomberg |
| `t` | String | Ticker-Symbol | "CAZAR" | Bloomberg |
| `co` | String | Land (ISO 2-Letter) | "ES" | Bloomberg |
| `isin` | String | ISIN-Code | "ES0244251056" | Bloomberg |
| `px` | Number | Kurs (Clean Price, %) | 99.797 | Bloomberg |
| `k` | Number | Kuponsatz (% p.a.) | 3.125 | Bloomberg |
| `y` | Number | Yield-to-Maturity (%) | 3.177 | Bloomberg |
| `s` | Number | I-Spread (Basispunkte) | 74.38 | Bloomberg |
| `lqa` | Number | Liquiditaetsquote (0-100) | 75 | Bloomberg |
| `mty` | Number | Restlaufzeit (Jahre) | 5.437 | Bloomberg |
| `md` | Number | Modified Duration (Jahre) | 4.066 | Bloomberg |
| `fall` | String | Faelligkeitsdatum | "8/10/2031" | Bloomberg |
| `mo` | String | Moody's Rating (Bond) | "A3" | Bloomberg |
| `sp` | String | S&P Rating (Bond) | "NR" | Bloomberg |
| `rank` | String | Zahlungsrang | "SP" | Bloomberg |
| `rankDetail` | String | Rang-Detailtext | "Sr Preferred" | Bloomberg |
| `callable` | Boolean | Call-Faehigkeit | true | Bloomberg |
| `perpetual` | Boolean | Perpetual Bond | false | Bloomberg |
| `matTyp` | String | Faelligkeitstyp | "CALLABLE" | Abgeleitet |
| `kpnTyp` | String | Kupontyp | "FIXED" | Bloomberg |
| `msciEsg` | String | MSCI ESG Rating | "AA" | Bloomberg |
| `rw` | Number | CRR Risikogewicht (%) | 50 | Bloomberg |
| `g` | Number | Green-Bond Indikator (1/0) | 0 | Abgeleitet |
| `vol` | Number | Emissionsvolumen (Mio. EUR) | 500 | Bloomberg |
| `desc` | String | Bond-Beschreibung | "CAZAR 3 1/8 08/10/31" | Bloomberg |
| `waeh` | String | Waehrung | "EUR" | Bloomberg |
| `ln` | Number | Worst-of Rating numerisch (1-10) | 7 | Berechnet |
| `lo` | String | Worst-of Rating Label | "A-" | Berechnet |
| `yRw` | Number | Rendite / Risikogewicht | 6.354 | Berechnet |
| `sRw` | Number | Spread / Risikogewicht | 148.76 | Berechnet |
| `bkt` | String | Laufzeit-Bucket | "5-6Y" | Berechnet |

**Optionale Felder (bei Bloomberg-Import):**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `moIssuer` | String | Emittenten-Rating Moody's |
| `spIssuer` | String | Emittenten-Rating S&P |
| `nom` | Number | Nominale Allokation (Mio. EUR) |
| `locked` | Boolean | Bestand (muss im Portfolio bleiben) |
| `inUniverse` | Boolean | Im aktuellen Universum enthalten |
| `_scName` | String | Szenario-Name (Runtime) |
| `_scColor` | String | Szenario-Farbe (Runtime) |
| `sektor` | String | iBoxx L3 Sektor |
| `branche` | String | Branche |
| `gldPrs` | Number | Geldkurs |
| `brfPrs` | Number | Briefkurs |

### 3.2 Laufzeit-Bucket-Zuordnung (Zeile 2397)

```
getMatBucket(mty):
  mty < 1  -> "0-1Y"
  mty < 2  -> "1-2Y"
  mty < 3  -> "2-3Y"
  mty < 4  -> "3-4Y"
  mty < 5  -> "4-5Y"
  mty < 6  -> "5-6Y"
  mty < 7  -> "6-7Y"
  mty < 8  -> "7-8Y"
  mty < 9  -> "8-9Y"
  mty < 10 -> "9-10Y"
  else     -> "10Y+"
```

---

## 4. Rating-System

### 4.1 Rating-Mappings (Zeile 2371-2377)

**Moody's -> Zahlenwert (RM):**

| Moody's | Wert | S&P-Aequivalent |
|---------|------|-----------------|
| Aaa | 1 | AAA |
| Aa1 | 2 | AA+ |
| Aa2 | 3 | AA |
| Aa3 | 4 | AA- |
| A1 | 5 | A+ |
| A2 | 6 | A |
| A3 | 7 | A- |
| Baa1 | 8 | BBB+ |
| Baa2 | 9 | BBB |
| Baa3 | 10 | BBB- |

**S&P -> Zahlenwert (RS):** AAA=1, AA+=2, ..., BBB-=10

**Zahlenwert -> Label (LBL):** 1="AAA", 2="AA+", ..., 10="BBB-"

### 4.2 Normalisierungsfunktionen (Zeile 2372-2373)

- `normMo(r)`: Bereinigt Moody's-Strings (Leerzeichen, Klammern, Case)
- `normSp(r)`: Bereinigt S&P-Strings

### 4.3 Worst-of-Berechnung (Zeile 2374-2375)

```
loN(mo, sp) = max(RM[normMo(mo)] || 99, RS[normSp(sp)] || 99)
loR(mo, sp) = LBL[loN(mo, sp)] || "NR"

Beispiel: loN("Baa1", "A-") = max(8, 7) = 8 -> "BBB+"
```

### 4.4 Kategorie-Konstanten (Zeile 2378-2388)

| Konstante | Werte |
|-----------|-------|
| `RANK_CATS` | SP, SU, SNP, SEC, T2, AT1 |
| `STRUKTUR_CATS` | BULLET, CALLABLE, PERPETUAL |
| `KUPON_CATS` | FIXED, VARIABLE, ZERO COUPON |
| `SEKTOR_CATS` | BANKS, INSURANCE, FINANCIALS, REITS, OTHER |
| `RATING_LABELS` | AAA, AA+, AA, AA-, A+, A, A-, BBB+, BBB, BBB- |

---

## 5. Emittenten-Datenbank

### 5.1 DZ BANK Emittenten (Zeile 2429-2515)

**~88 Emittenten** als `const DZ_EMITTENTEN_DATA = [...]`.

**Felder pro Emittent:**

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `t` | String | Ticker | "AARB" |
| `n` | String | Name | "Aareal Bank" |
| `co` | String | Heimatland | "DE" |
| `dz` | String | DZ-Risikoklasse | "MR" |
| `ct` | String | Credit-Trend | "stabil" |
| `esg` | String | ESG-Coverage | "Ja" |
| `lr` | String | Emittenten-Rating LR | "Baa1 STAB/--/BBB POS" |
| `sp` | String | Senior Preferred Rating | "(P)Baa1/--/BBB+" |
| `snp` | String | Senior Non-Preferred Rating | "(P)Baa3/NR/BBB" |

### 5.2 DZ Rating-Farben (Zeile 2516-2519)

| DZ-Klasse | Farbe | Hex | Bedeutung |
|-----------|-------|-----|-----------|
| LR | Gruen | #16a34a | Low Risk |
| MR | Orange | #d97706 | Moderate Risk |
| ER | Rot | #dc2626 | Elevated Risk |
| NR | Grau | #6b7280 | Not Rated |

### 5.3 Credit-Trend Icons (Zeile 2518)

| Trend | Icon | Farbe |
|-------|------|-------|
| positiv | ↗ | #16a34a |
| stabil | → | #6b7280 |
| negativ | ↘ | #dc2626 |
| n.a. | – | #94a3b8 |

### 5.4 DZ BANK Masterliste (Zeile 2417-2426)

**75+ Ticker** als Whitelist: AARB, ABNANV, ACAFP, ACHMEA, AIG, ALVGR, ... ZURNVX.

### 5.5 iBoxx Benchmark-Daten (Zeile 2529-2578)

**47 Indizes** als `const DZ_IBOXX_DATA = [...]` mit:
- Index-Name, Spread (bp), Yield (%), Duration (Y), Convexity (%)
- Laender-Indizes, Rating-Indizes, Maturity-Indizes, Subordination-Indizes

---

## 6. Laender & Regionen

### 6.1 Laenderlisten (Zeile 2400-2414)

| Konstante | Anzahl | Beispiele |
|-----------|--------|-----------|
| `EWR_COUNTRIES` | 28 | AT, BE, BG, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LI, LT, LU, LV, MT, NL, NO, PL, PT, RO, SE, SK |
| `OECD_EUR_COUNTRIES` | 25 | AT, BE, CH, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HU, IE, IT, LT, LU, LV, NL, NO, PL, PT, SE, SK, SI |
| `OECD_OTHER_COUNTRIES` | 10 | AU, CA, CL, CO, CR, IL, JP, KR, MX, NZ |
| `CHANNEL_ISLANDS` | 2 | GG, JE |

### 6.2 Region-Definitionen (Zeile 2407-2413)

```
REGION_DEFS = {
  EWR:         { label: "EWR", countries: EWR_COUNTRIES },
  OECD_EUR:    { label: "OECD Europa", countries: OECD_EUR_COUNTRIES },
  USA:         { label: "USA", countries: ["US"] },
  OECD_OTHER:  { label: "OECD Sonstige", countries: OECD_OTHER_COUNTRIES },
  CH_ISLANDS:  { label: "Kanalinseln", countries: CHANNEL_ISLANDS }
}
```

---

## 7. LocalStorage & Session-Management

### 7.1 Kernfunktionen (Zeile 2100-2257)

| Funktion | Zeile | Beschreibung |
|----------|-------|--------------|
| `lsSave(key, value)` | 2102 | Speichert JSON mit Praefix `SPEngine_` |
| `lsLoad(key, fallback)` | 2109 | Laedt aus LS mit Fallback |
| `lsRemove(key)` | 2119 | Entfernt Key |
| `lsClearAll()` | 2122 | Loescht alle SPEngine_-Eintraege |
| `lsGetSize()` | 2132 | Berechnet LS-Belegung in Bytes |
| `useDebouncedSave(key, val, 800)` | 2144 | React Hook: verzoegertes Speichern |

**Praefix:** `SPEngine_`, **Version:** `v3.6`

### 7.2 Session-Funktionen (Zeile 2151-2257)

| Funktion | Zeile | Beschreibung |
|----------|-------|--------------|
| `sessionGetName()` | 2155 | Liest Session-Name |
| `sessionSetName(name)` | 2156 | Schreibt Session-Name |
| `sessionGetMeta()` | 2158 | Sammelt Metadaten (Bonds, Szenarien, Portfolio, Profile) |
| `sessionExportJSON()` | 2174 | Exportiert kompletten State als JSON |
| `sessionDownload(name)` | 2194 | Download als .json-Datei |
| `sessionValidate(data)` | 2210 | Validiert importierte Session |
| `sessionImport(data)` | 2217 | Importiert Session in LS |
| `sessionNew()` | 2225 | Erstellt neue leere Session |
| `sessionLoadFile()` | 2230 | Promise-basierter File-Dialog |

### 7.3 Persistierte State-Keys

```
tab, sessionName, showSettings, zoomLevel
cfg_tileOrder, hiddenTabs, hiddenSections
portfolio, scenarios, universeProfiles
config (Budget, Constraints, Limits, Solver-Settings)
benchmark (bmType, bmFilter)
userPresets
layout_* (Collapse/Pin/Order pro Tab)
scatter_* (Chart-Einstellungen)
```

---

## 8. Solver-Architektur

### 8.1 Drei-Solver-Modell

| Solver | Typ | Komplexitaet | Quelle | Zeile | Einsatz |
|--------|-----|-------------|--------|-------|---------|
| javascript-lp-solver | LP | O(n²) | Inline | 437 | Batch-Optimierung (1000+ Szenarien) |
| HiGHS WASM | LP/MIP | O(n³-n⁴) | CDN | 2279 | Exakte Loesungen mit Lot-Sizes |
| Greedy | Heuristik | O(n log n) | Inline | ~7294 | Fallback bei Solver-Crash |

### 8.2 HiGHS-Laden (Zeile 2279-2349)

```
getHighsSolver():
  1. Pruefe Cache (highsLib)
  2. Lade Factory von CDN v1.0.1
  3. Bei Fehler: Lade von CDN v1.8.0 (Fallback)
  4. Rufe Factory() auf -> Solver-Instanz
  5. Pruefe inst.solve === 'function'
  6. Cache in highsLib
```

**WASM-Crash-Detection (Zeile 9558-9573):**
- RuntimeError, memory access, Aborted, table index -> `_wasmCrashed = true`
- Nach Crash: Kein weiterer Solver-Versuch in dieser Session

### 8.3 Solver-Auswahl-Logik

```
Benutzer waehlt: runMIP, runLP, runGreedy (Checkboxen)
Primary Solver: MIP (wenn verfuegbar) > LP > Greedy

Auto-Optimize: LP fuer Batch (1000x), MIP fuer Re-Solve (Top 14)
Lexicographic: MIP fuer jede Phase
Standard: MIP mit LP-Fallback bei Infeasibility
```

---

## 9. LP-Solver (optimizeLP)

### Funktion (Zeile 8002-8526)

**Signatur:** `optimizeLP(pool, cfg) -> Array<Bond>`

### 9.1 Ablauf

```
Phase 1: Eligibility-Filter & Setup
Phase 2: LP-Aufbau (javascript-lp-solver Format)
Phase 3: Infeasibility Cascade (5 Stufen)
Phase 4: Solution Extraction (Runden, Lot-Size)
Phase 5: Rank-Proportionale Rescaling (20 Iterationen)
Phase 6: Floor-Enforcement (10 Iterationen)
Phase 7: Backfill + Top-Up
Phase 8: Portfolio-Average-Enforcement (30 Iterationen pro Metrik)
Phase 9: Refill nach enforceAvg
```

### 9.2 LP-Formulierung

```
Maximize: sum(baseScore(b) * x_i)

Subject To:
  Budget:       sum(x_i) <= effectiveBudget
  Budget-Floor: sum(x_i) >= budgetFloor
  Issuer:       sum(x_i | b.t == t) <= maxIssNominal
  Country:      sum(x_i | b.co == co) <= coLimit
  Categories:   sum(x_i | in cat) in [min%, max%] * budget
  ESG:          sum(x_i | b.g == 1) >= minGreen% * budget
  Avg-Duration: sum((b.md - target) * x_i) <= epsilon
  Avg-Kupon:    sum((b.k - target) * x_i) <= epsilon
  Locked:       x_i = fixedNom

Bounds: 0 <= x_i <= maxBondNom
Variables: continuous
```

### 9.3 Infeasibility Cascade

| Stufe | Aktion |
|-------|--------|
| 1 | ESG-Constraint relaxen |
| 2 | Budget-Floor auf 80% reduzieren |
| 3 | Portfolio-Average-Constraints entfernen |
| 4 | Kategorie-Min/Max entfernen |
| 5 | Alle Kategorie-Constraints entfernen |

### 9.4 Post-Processing: enforceAvgMax/Min (Zeile 8407-8464)

```
fuer 30 Iterationen:
  avg = sum(b[field] * nom) / sum(nom)
  wenn avg > target:
    finde Bond mit hoechstem field-Wert
    reduziere dessen nom
    entferne wenn < minBondAmtLP
```

Angewendet auf: Duration, Laufzeit, Kupon, Preis (je Min und Max).

---

## 10. MIP-Solver v1 (optimizeMIP)

**Zeile 8531-9085** -- DEPRECATED, verwendet optimizeMIP_v2 stattdessen.

Unterschied zu LP: Integer-/Binaer-Variablen fuer Lot-Sizes und Semi-Continuous Constraints.

---

## 11. MIP-Solver v2 (optimizeMIP_v2)

### Funktion (Zeile 9087-9962)

**Signatur:** `async optimizeMIP_v2(pool, cfg) -> Array<Bond>`

**Hauptsolver der Anwendung.** Erzeugt CPLEX-Format LP-String und sendet an HiGHS WASM.

### 11.1 LP-String-Aufbau (Zeile 9202-9542)

```
Maximize
  obj: sum(baseScore(b) * z_i)

Subject To
  c_bmax: sum(z_i) <= effectiveBudget / S
  c_bmin: sum(z_i) >= 0.95 * effectiveBudget / S

  // Semi-Continuous (nur wenn !_fastScan)
  c_smin{i}: z_i - minS * y_i >= 0
  c_smax{i}: z_i - capS * y_i <= 0

  // Issuer Limits
  c_iss{ti}: sum(z_k | b.t == t) <= maxIssNominal / S

  // Country Limits (relativ zum Portfolio)
  c_co{ci}: sum((1-maxCo/100)*z_k | b.co==c) + sum((-maxCo/100)*z_k | b.co!=c) <= 0

  // Kategorie-Constraints (Rating, Rang, Struktur, Kupon, Sektor)
  addCatConstraintsMIP(limits, unit, prefix, catFn)
    unit="pct": relative %-Constraints
    unit="mio": absolute EUR-Constraints

  // ESG Minimum
  c_esg: sum((g_i - minGreen/100) * z_i) >= 0

  // Maturity Buckets
  c_mb_{bkt}_{min|max}: sum(z_i | bucket == bkt) in [min, max]

  // Portfolio-Average mit Slack
  c_pfMaxDur: sum((md_i - target) * z_i) <= pfSlack
  c_pfMinDur: sum((md_i - target) * z_i) >= -pfSlack
  pfSlack = 0.01 * effectiveBudget / S

  // Locked Bonds
  c_lock{i}: z_i >= fixedS
  c_lockx{i}: z_i <= fixedS

  // Lexicographic Constraints
  c_lexFloorYield: sum((y_i - floor) * z_i) >= 0
  c_lexCeilDuration: sum((md_i - ceil) * z_i) <= 0
  c_lexCeilRating: sum((ln_i - ceil) * z_i) <= 0

  // Duration-Matching (Alternative)
  target - tol <= avg_duration <= target + tol

Bounds
  0 <= z_i <= capS  (oder fixedS fuer locked)

Generals
  z_i  (wenn lotSize > 0, Integer-Variablen)

Binaries
  y_i  (Semi-Continuous Indikatoren)

End
```

### 11.2 Infeasibility Cascade (Zeile 9590-9662)

| Stufe | Aktion | Zeile |
|-------|--------|-------|
| 1 | ESG relaxen | 9593 |
| 2 | Budget-Floor 95% -> 80% | 9606 |
| 3 | Portfolio-Average-Constraints entfernen | 9618 |
| 4 | Kategorie Min/Max entfernen | 9627 |
| 5 | ALLE Kategorie-Constraints entfernen | 9636 |
| 6 | Budget-Floor 80% -> 0% | 9645 |

### 11.3 Post-Processing (Zeile 9700-9934)

```
1. postEnforce(field, target, mode):  Avg-Constraints erzwingen
2. postEnforceESG():                  ESG-Quote sicherstellen (mit Duration-Bewusstsein)
3. Post-Enforce Refill:               Budget-Luecke schliessen
4. Convergence-Loop:                  Re-Enforce + Mini-Refill (10x)
5. Final Validation:                  validateSolution() mit Violation-Logging
```

### 11.4 _fastScan-Modus

Wenn `cfg._fastScan = true`:
- Keine Semi-Continuous Constraints (y_i entfaellt)
- Keine Integer-Variablen (rein LP)
- Kein Cascade bei Infeasibility -> direkt return []
- ~1-5ms statt 100ms+ pro Solve

---

## 12. Lexicographic Optimization

### Funktion (Zeile 5949-6059)

**Signatur:** `async solveLexicographic(pool, baseCfg, objectives, solveFn) -> {result, phases}`

### 12.1 Algorithmus

```
Fuer jede Prioritaets-Ebene i = 0, 1, 2, ...:
  1. Loese Objective[i] mit allen bisherigen Floor/Ceiling-Constraints
  2. Extrahiere optimalen Wert V_i
  3. Berechne Constraint:
     - dir="max": Floor = V_i * (1 - slack)  (z.B. 95% des Maximums)
     - dir="min": Ceiling = V_i * (1 + slack)
  4. Fuege Constraint zur naechsten Phase hinzu
  5. Bei Infeasibility: Verdopple Slack und retry

Rueckgabe: Letztes Portfolio + Array aller Phasen-Ergebnisse
```

### 12.2 Vordefinierte Ziel-Ketten

| Objective | Phase 0 | Phase 1 | Phase 2 |
|-----------|---------|---------|---------|
| esgYield | Max ESG-Quote | Max Rendite | - |
| lexicographic | Max Rendite | Max Spread | Min Duration-Volatilitaet |

---

## 13. Auto-Optimize Engine

### Funktion (Zeile 6154-6921)

**Signatur:** `async runAutoOptimize(pool, baseCfg, solveFn, setLog) -> {p0, alternatives, elapsed, scanInfo, frontiers}`

### 13.1 5-Phasen-Algorithmus

**Phase 1: P0 Yield-Max (~5 Sek.)**
- Reines MIP mit User-Constraints
- Basis-Portfolio fuer alle Deltas

**Phase 2: Raum-Analyse (~1 Sek.)**
- Rang-Komposition erkennen (SU/SNP/T2/AT1-Anteile)
- Universe-Grenzen bestimmen (Duration, Rating, ESG)
- Rang-Kombinationen erstellen ("keinSU", "keinSU+SNP", etc.)

**Phase 3: Szenario-Raum aufbauen (~2 Sek.)**
- **1D Frontier-Sweeps:**
  - ESG: 0% bis maxEsgPct in 1%-Schritten
  - Duration: durSweepHi bis durSweepLo in -0.05-Schritten
  - Rating: ratSweepHi bis 1.0 in -0.1-Schritten
- **Latin Hypercube Sampling:** 80-600 Samples pro Rang-Combo, 3D-Raum (ESG, Duration, Rating)
- **Gesamt:** ~500-1200 Configs

**Phase 4: Batch-LP-Solve (~10 Sek.)**
- 4 Turbo-Optimierungen:
  1. **Unconstrained-Cache:** Einmal pro RangCombo uneingeschraenkt loesen
  2. **Solved-Result-Cache:** Bis 150 Ergebnisse wiederverwenden
  3. **Infeasibility-Pruning:** Infeasible Boxen merken und dominierte entfernen
  4. **Sorting:** Weniger eingeschraenkt zuerst (Caching maximieren)

**Phase 5: Pareto-Filter & Re-Solve (~10 Sek.)**
- NSGA-II mit 5-7 Objectives (Yield, Spread, ESG, Rating, Duration, [SU%, SNP%])
- Frontier-Kurven extrahieren (ESG vs. Yield, Rating vs. Yield, Duration vs. Yield)
- Top-50 nach Crowding Distance selektieren
- Re-Solve mit vollem MIP (Lot-Sizes, exakte Constraints)
- WASM-Reset alle 2 Solves (Proactive Reset nach Batch-Korruption)
- Distinctness- und Duplikat-Check
- Name & Icon automatisch generieren (z.B. "ESG+15pp", "Rat+2 notch", "Dur-0.5")

### 13.2 NSGA-II Pareto-Filter (Zeile 5634-5661)

```
1. Berechne Dominations-Relationen (Pareto-Vergleich)
2. Sortiere Fronten nach Rank (Front 0 = beste)
3. Berechne Crowding Distance pro Front
4. Selektiere maxSelect beste Loesungen
```

### 13.3 Latin Hypercube Sampling (Zeile 5614-5631)

- PRNG: Mulberry32 (Seed 42, deterministisch)
- Shuffle: Fisher-Yates
- Stratifizierte Verteilung ueber alle Dimensionen

---

## 14. Greedy Fallback

**Zeile ~7294** -- `optimize(universe, cfg)`

Einfache Heuristik:
1. Bonds nach baseScore sortieren (absteigend)
2. Top-Bonds allokieren bis Budget erschoepft
3. Min-Constraints pruefen

---

## 15. Constraints & Restriktionen

### 15.1 Vollstaendige Constraint-Tabelle

| Constraint | Parameter | LP-Formulierung | Einheit |
|------------|-----------|-----------------|---------|
| Budget | budget | sum(z_i) <= budget/S | Mio. EUR |
| Budget-Floor | - | sum(z_i) >= 0.95*budget/S | Mio. EUR |
| Bond Nominal Max | maxBondNom | z_i <= capS | Mio. EUR |
| Bond Nominal Min | minBondNom | z_i >= minS * y_i (semi-cont.) | Mio. EUR |
| Issuer Nominal Max | maxIssNominal | sum(z_k\|t==t) <= maxIss/S | Mio. EUR |
| Country Limit | maxCo | relativ oder absolut | % oder Mio. |
| Rating Limits | ratingLimits[AAA..BBB-] | enabled, min%, max% | % oder Mio. |
| Rank Limits | rankLimits[SP..AT1] | enabled, min%, max% | % oder Mio. |
| Struktur Limits | strukturLimits[BULLET..PERP] | enabled, min%, max% | % oder Mio. |
| Kupon Limits | kuponLimits[FIXED..ZERO] | enabled, min%, max% | % oder Mio. |
| Sektor Limits | sektorLimits[BANKS..OTHER] | enabled, min%, max% | % oder Mio. |
| Maturity Buckets | matBucketLimits[0-1Y..10Y+] | enabled, min%, max% | % oder Mio. |
| ESG Minimum | minGreen | sum(g_i*z_i)/sum(z_i) >= min% | % |
| Duration Min/Max | pfMinDur, pfMaxDur | sum((md-target)*z_i) in [-slack, +slack] | Jahre |
| Laufzeit Min/Max | pfMinMat, pfMaxMat | analog Duration | Jahre |
| Kupon Min/Max | pfMinK, pfMaxK | analog Duration | % |
| Preis Min/Max | pfMinPx, pfMaxPx | analog Duration | % |
| Duration Matching | durationMatchTarget, Tolerance | target-tol <= avg <= target+tol | Jahre |
| Lot-Size | minLot | z_i ganzzahlig (Generals) | Mio. EUR |
| Locked Bonds | lockedBonds[] | z_i = fixedNom | Mio. EUR |
| Lex Floor Yield | _lexFloorYield | sum((y_i-floor)*z_i) >= 0 | % |
| Lex Floor Spread | _lexFloorSpread | sum((s_i-floor)*z_i) >= 0 | bp |
| Lex Ceil Duration | _lexCeilDuration | sum((md_i-ceil)*z_i) <= 0 | Jahre |
| Lex Ceil Rating | _lexCeilRating | sum((ln_i-ceil)*z_i) <= 0 | numerisch |

### 15.2 Numerische Konstanten (Zeile 5804-5807)

| Konstante | Wert | Zweck |
|-----------|------|-------|
| EPSILON | 1e-6 | Numerische Toleranz |
| PF_AVG_SLACK | 0.01 | 1% Toleranz fuer Portfolio-Durchschnitte |
| COEFF_NOISE | 1e-9 | Filter fuer kleine LP-Koeffizienten |

---

## 16. Portfolio-Statistiken

### stats()-Funktion (Zeile 5672-5768)

**Signatur:** `stats(pf) -> Object`

**~50 berechnete KPIs:**

| Feld | Beschreibung | Formel |
|------|--------------|--------|
| `tN` | Total Nominal (Mio.) | sum(nom) |
| `nb` | Anzahl Bonds | count(nom > 0) |
| `ni` | Anzahl Emittenten | count(unique(t)) |
| `wY` | Gew. Rendite (%) | sum(y*nom)/tN |
| `wS` | Gew. Spread (bp) | sum(s*nom)/tN |
| `wK` | Gew. Kupon (%) | sum(k*nom)/tN |
| `wD` | Gew. Mod. Duration | sum(md*nom)/tN |
| `wM` | Gew. Laufzeit (Y) | sum(mty*nom)/tN |
| `wL` | Gew. Liquiditaet | sum(lqa*nom)/tN |
| `wPx` | Gew. Kurs | sum(px*nom)/tN |
| `wR` | Gew. Risikogewicht (%) | sum(rw*nom)/tN |
| `wLn` | Gew. Rating (numerisch) | sum(ln*nom)/tN |
| `wMacD` | Macaulay Duration | wD * (1 + wY/100) |
| `yDur` | Rendite/Duration Ratio | wY / wD |
| `yRw` | Rendite/Risikogewicht | wY / (wR/100) |
| `gN` | ESG-Volumen (Mio.) | sum(nom \| g==1) |
| `gP` | ESG-Quote (dezimal) | gN / tN |
| `tRWA` | Total RWA (Mio.) | sum(nom * rw/100 * 0.08) |
| `spP..at1P` | Rang-Anteile (dezimal) | sum(nom \| rank) / tN |
| `callP, bullP, perpP` | Struktur-Anteile | sum(nom \| matTyp) / tN |
| `fixP, varP, zeroP` | Kupon-Anteile | sum(nom \| kpnTyp) / tN |
| `banksP..otherP` | Sektor-Anteile | sum(nom \| sektor) / tN |
| `ic` | Emittenten-Konzentration | Map(ticker -> nom) |
| `cc` | Laender-Konzentration | Map(co -> nom) |
| `bc` | Bucket-Konzentration | Map(bkt -> nom) |
| `rc` | Rating-Konzentration | Map(lo -> nom) |
| `rkc` | Rang-Konzentration | Map(rank -> nom) |
| `nomStats` | Nominal-Verteilung | {min, max, med, avg} |
| `minY..maxM` | Ranges | min/max aller Metriken |

---

## 17. React-Komponenten

### 17.1 Komponentenbaum

```
App (Zeile 23809)
  ErrorBoundary (Zeile 23799)
    MainApp (Zeile ~14057)
      Navbar (Desktop Header-Tabs + Mobile Bottom-Nav)
      Tab-Content (conditional rendering)
      Footer
      Modals:
        BondDetailModal
        IssuerDetailModal
        PresetEditModal
        ScenarioNameModal
```

### 17.2 Alle Komponenten mit Zeilen

| Komponente | Zeile | Props | Beschreibung |
|------------|-------|-------|--------------|
| `ScenarioNameModal` | 3667 | defaultName, defaultIcon, onSave, onClose | Szenario benennen/Icon waehlen |
| `PresetEditModal` | 3698 | preset, onSave, onClose, getCfg, OBJ | Preset erstellen/bearbeiten |
| `useSectionLayout` | 3769 | tabKey, defaultSections | Hook: Collapse/Pin/Order-State |
| `useChart` | 3817 | cfgFn, deps | Hook: Chart.js-Instanz verwalten |
| `ReportSlide` | 3832 | number, title, subtitle, children, id | Report-Folie mit Header |
| `ReportKpiCard` | 3847 | label, pf, bm, unit, d, up, neutral | KPI-Karte mit Delta |
| `Slide1-8_*` | 3870-4221 | pS, bm, pf | 8 Report-Slide-Komponenten |
| `DoughnutMini` | 4061 | dd (labels, data, cols, title) | Mini-Doughnut-Chart |
| `CollapsibleSection` | 4224 | id, title, icon, collapsed, pinned, onToggle, onPin, children | Auf-/zuklappbare Sektion |
| `UniverseProfileBar` | 4259 | profiles, onSave/Load/Delete/Update/Reset/Export, activeProfileId | Universum-Profil-Verwaltung |
| `DeepDiveBarometer` | 4457 | stats, bonds | 6-Score Barometer |
| `DeepDiveConcentration` | 4516 | stats | HHI, Top-5 Emittenten/Laender |
| `DeepDiveCurve` | 4583 | bonds | Spread-/Rendite-Kurve nach Laufzeit |
| `DeepDiveLiquidity` | 4700 | bonds | LQA-Verteilung, Rating x Bucket Heatmap |
| `DeepDiveStructure` | 4765 | stats, globalStats | Struktur-Vergleich (PF vs. Markt) |
| `DeepDiveCarry` | 4790 | bonds | 1Y-Carry mit Funding-Rate |
| `DeepDiveESG` | 4866 | bonds | MSCI ESG Verteilung, Green Premium |
| `DeepDiveRanges` | 4915 | stats | Min/Max Ranges |
| `DeepDiveSector` | 4951 | bonds | Sektor-Allokation, Sektor x Rating Heatmap |
| `DeepDiveRWA` | 5025 | bonds, stats | RWA-Analyse, CET1-Impact |
| `DeepDiveConvexity` | 5081 | bonds | Approximierte Konvexitaet |
| `DeepDivePeers` | 5133 | bonds | Peer-Group Rich/Cheap-Analyse |
| `ScenarioKpiGrid` | 9983 | scenarios, bm | KPI Side-by-Side Vergleich |
| `ScenarioCompareTable` | 10041 | scenarios, bm | Metriken-Tabelle |
| `ScenarioCharts` | 10121 | scenarios, bm | Rating/Bucket/Land/Rang/Sektor/ESG Charts |
| `ScenarioDistPanel` | 10203 | scenarios, bm | Emittenten/Laender-Heatmaps |
| `ScenarioOverlapPanel` | 10281 | scenarios | Bond-Ueberlappung (Core/Partial/Exclusive) |
| `ScenarioRiskPanel` | 10439 | scenarios, bm, bmBonds | Risk-Sensitivity (Yield/Spread/Rating-Shift) |
| `ScenarioRVHeatmap` | 10569 | scenarios, bm, bmBonds | Risk-Value Positionierung |
| `ScenarioConstraintPanel` | 10706 | scenarios, bm | Constraint-Einhaltung |
| `ScenarioProfileSection` | 10808 | scenarios, bm, bmBonds | Profil-Statistiken |
| `Tag` | 9978 | children, c (green/blue/gray) | Inline-Badge |
| `Card` | 10939 | label, value, sub, accent | KPI-Karte |
| `BarCard` | 10948 | label, segments, bmSegments | Stacked-Bar Karte |
| `Bar` | 11003 | label, value, max, pct, warn, icon | Fortschrittsleiste |
| `InputRow` | 11019 | label, value, onChange | Text/Number-Input |
| `PctSlider` | 11035 | label, value, onChange | Prozent-Schieberegler |
| `RangePair` | 11053 | label, min, max | Min/Max-Range |
| `CategoryLimitRow` | 11062 | cat, label, value | Kategorie-Limiter |
| `BucketLimitRow` | 11081 | label, value | Laufzeit-Bucket-Limiter |
| `BestandBreakdown` | 11109 | bonds | Bestand vs. Neuanlage Vergleich |
| `StatsGrid` | 11166 | s, mkt, isMarket | Konfigurierbares KPI-Grid |
| `DistributionPanels` | 11303 | s, isMarket | Verteilungs-Charts |
| `ComparisonPanels` | 11447 | mkt, pf | Portfolio vs. Benchmark Charts |
| `RVHeatmap` | 11489 | bonds, onBondClick | Rich/Cheap Heatmap |
| `IssuerTable` | 11704 | pf, onIssuerClick | Emittenten-Rangliste |
| `MultiSelect` | 11869 | label, options, selected | Multi-Select Dropdown |
| `UniverseFilter` | 11957 | bonds | Filter-Panel |
| `ColumnSelector` | 12162 | columns, hiddenCols, setHiddenCols | Spalten-Sichtbarkeit |
| `BondTable` | 12298 | bonds, s, showN, onBondClick, filter, presets, universeProfiles | Bond-Tabelle mit Filter/Sort/Export |
| `ScatterMatrix` | 12670 | activeBonds, backgroundBonds, filter, universeProfiles | Interaktive Scatter-Charts |
| `BondDetailModal` | 13279 | bond, onClose | Bond-Detailansicht |
| `IssuerDetailModal` | 13332 | data, onClose | Emittenten-Details |
| `ConstraintAnalysisPanel` | 13506 | ... | Constraint-Pruefung |
| `SolverComparisonPanel` | 13816 | solvers, onSave | Solver-Ergebnis-Vergleich |
| `ScrollToTopFAB` | 13367 | - | Scroll-to-Top Button |
| `SessionDropdown` | 13405 | sessionName | Session-Verwaltung |
| `ZoomControls` | 13483 | level, onIn, onOut | Zoom-Steuerung |

---

## 18. Tabs & Module

### 18.1 Tab-Uebersicht (Zeile 14062-14073)

| Tab-ID | Label | Icon | Hauptkomponenten |
|--------|-------|------|------------------|
| 3 | Daten-Import | Pfeil | Universum-Manager, Bloomberg-Import, Bestandsliste |
| 1 | Markt-Analyse | Globus | StatsGrid, ScatterMatrix, DistributionPanels, IssuerTable, BondTable |
| 7 | Deep-Dive | Mikroskop | 12 DeepDive-Panels (Barometer bis Peers) |
| 0 | Optimierer | Zahnrad | Constraint-Config, Solver-Auswahl, Ergebnis-Anzeige |
| 4 | Szenarien-Vergleich | Diagramm | 9 ScenarioCompare-Panels + KI-Pruefauftrag |
| 2 | Portfolio-Review | Liste | Bond-Tabelle, KPIs, Emittenten, Vergleich |
| 6 | Reporting | Trend | 8-Slide Report-Vorschau + PPTX-Export |
| 8 | Export-Center | Paket | XLSX/PPTX/CSV/JSON Downloads + Session-Management |
| 9 | DZ Research | Bank | iBoxx-Indizes, DZ-Emittenten, Spread-Bonds |
| 11 | Daten | Datenbank | Read-Only Browser (Universum, Emittenten, iBoxx) |
| 5 | Anleitung | Buch | 11-Kapitel Benutzerhandbuch + Glossar |
| 10 | Einstellungen | Zahnrad | Tabs, Presets, KPI-Kacheln, Charts, Speicher, Performance |

---

## 19. Deep-Dive Analyse

### 19.1 Die 12 Analyse-Panels

| # | Panel | Zeile | Kernlogik |
|---|-------|-------|-----------|
| 1 | **Barometer** | 4457 | 6 Scores: Spread (100-(wS-50)/3), Duration (100-\|wD-4\|*15), Liquiditaet (wL), Rating ((1-wLn/20)*100), Konzentration (100-HHI/30), Struktur (100-(callP+perpP)*100). Gesamtscore = Durchschnitt. |
| 2 | **Konzentration** | 4516 | HHI-Berechnung: sum((v/total*100)²). Top-5 Emittenten/Laender als Doughnut. Farb-Coding: <1000 gruen, 1000-1800 amber, >1800 rot. |
| 3 | **Spread-Kurve** | 4583 | Spread/Yield vs. Laufzeit (Line-Chart). Gruppierbar nach Rating/Sektor/Rang/KpnTyp. Steepness = longSpread - shortSpread. |
| 4 | **Liquiditaet** | 4700 | LQA-Bins [0-20, 20-40, 40-60, 60-80, 80-100]. Rating x Bucket Heatmap. Farbe: lqaColor(v) rot->gruen. |
| 5 | **Struktur** | 4765 | Callable/Perpetual/Bullet-Quote. PF vs. Markt Vergleich. |
| 6 | **Carry** | 4790 | 1Y-Carry = Kupon - Funding. Rolldown-Schaetzung. Total Return = Carry + Rolldown. Funding-Rate Slider (0-5%). Top-20 nach Total Return. |
| 7 | **ESG** | 4866 | MSCI ESG Verteilung (AAA-CCC + N.S.). Green Premium = Spread-Differenz (ESG vs. NonESG). Rating-basierte Aufschluesselung. |
| 8 | **Ranges** | 4915 | Min/Max Grid fuer alle Metriken (Rendite, Spread, Duration, Kurs, Kupon, Laufzeit). |
| 9 | **Sektor** | 4951 | Sektor x Rating Heatmap. Allokation nach iBoxx L3. Sortierbar nach Volumen. |
| 10 | **RWA** | 5025 | CRR Risikogewicht: EK = nom*rw*0.08. RWA-Effizienz = Yield/RWA. CET1-Impact Slider (8-20%). RW-Bucketing (20/50/100%). |
| 11 | **Konvexitaet** | 5081 | Approx: (md² + md) / (1+y)². Scatter: Duration vs. Konvexitaet. Top-20 Bonds. |
| 12 | **Peers** | 5133 | Rating-basierte Peer-Group. Lineare Regression MD->Spread. Z-Score = residual/stdDev. Signals: z>1 "Cheap", z<-1 "Rich", sonst "Fair". |

### 19.2 Mathematische Hilfsfunktionen

| Funktion | Zeile | Formel |
|----------|-------|--------|
| `calcHHI(countMap, total)` | 4404 | sum((v/total*100)²) |
| `linearRegression(xs, ys)` | 4408 | slope, intercept, r² via OLS |
| `approxConvexity(md, ytm)` | 4424 | (md² + md) / (1 + y/100)² |

---

## 20. Szenarien-Vergleich

### 20.1 Die 9 Vergleichs-Panels

| Panel | Zeile | Beschreibung |
|-------|-------|--------------|
| KPI-Grid | 9983 | Side-by-Side Kennzahlen mit Ranking (10 KPIs: Rendite, Kupon, Spread, Duration, RW, ESG, yRw, Laufzeit, Preis, Positionen) |
| Compare-Tabelle | 10041 | 35+ Metriken je Szenario mit Delta-Faerbung |
| Charts | 10121 | 6 Chart-Typen: Rating, Laufzeiten, Laender Top-8, Zahlungsrang, Sektor, ESG |
| Distribution | 10203 | Top-12 Emittenten + Top-10 Laender Heatmap mit Delta-Highlighting |
| Overlap | 10281 | Jaccard-Score. Kategorien: Core (alle), Partial (>1), Exclusive (1). Stacked-Bar Volumenanteile. |
| Risk | 10439 | Yield-Shift, Spread-Shift, Rating-Downgrade Sensitivitaet. P&L = -md * (shift/10000) * nom. |
| RV-Heatmap | 10569 | Risk (x) vs. Value (y) Positionierung |
| Constraints | 10706 | Pruefung aller Limits pro Szenario |
| Profil | 10808 | Detaillierte Profil-Statistiken |

### 20.2 Risk-Impact-Berechnung (Zeile 10444-10474)

```
pnlYield  = -md * (dyBp/10000) * nom
pnlSpread = -md * (dsBp/10000) * nom
pnlRating = -md * ((newSpread - curSpread) / 10000) * nom
  wobei newSpread = ratingSpreadMap[degradedRating]
```

---

## 21. Tabellen & Filter

### 21.1 BondTable (Zeile 12298-12654)

**31 Spalten** (BCOLS, Zeile 12226-12258):
e, desc, isin, vol, co, nom, wt, k, px, s, y, md, mty, fall, lo, sp, mo, rw, yRw, g, msciEsg, kpnTyp, rank, call, lqa, sektor, branche, spEff, moEff, gldPrs, brfPrs, src

**22+ Filter-Kriterien:**
- Text-Suche (Emittent, ISIN, Ticker, Land, Beschreibung)
- Multi-Select: Emittent, Land, Rating, RW, Rang, Struktur, S&P, Moody's, MSCI, KpnTyp, Waehrung, Sektor
- Toggle: ESG (Alle/Ja/Nein), Quelle (Alle/Bestand/Neu)
- Range: Kupon, Rendite, Preis, Duration, Laufzeit (je Min/Max)
- Laufzeit-Bucket Multi-Select
- Ausgeschlossene Emittenten

**Features:**
- Drag-&-Drop Spalten-Reordering
- Spalten ein-/ausblenden (ColumnSelector)
- Multi-Level Sorting (Key + Richtung)
- Mobile Card-View + Desktop Table-View
- Live-Statistik-Bar mit Delta zum Benchmark
- XLSX-Export der gefilterten Daten

### 21.2 Explorer-Presets (Zeile 3530-3640)

| ID | Name | Icon | Beschreibung |
|----|------|------|--------------|
| richtlinien_full | ALR Erwerb | Bank | Vollstaendige Anlagerichtlinien (min BBB+) |
| richtlinien_bestand | ALR Bestand | Liste | Bestandsregel (min BBB-) |
| regionen_only | Regionen | Globus | Nur Laenderfilter |
| masterliste_dz | DZ Masterliste | Dokument | 75 gecoverte Emittenten |

### 21.3 IssuerTable (Zeile 11704)

Spalten: Emittent, Ticker, Land, Anleihen-Count, Volumen, Gewicht%, Rendite, Spread, Duration, Rating.

---

## 22. Scatter-Matrix

### 22.1 ScatterMatrix (Zeile 12670+)

**10 Farb-Modi:**

| Modus | Logik |
|-------|-------|
| auto | Automatisch basierend auf Daten |
| none | Monochromatisch grau |
| scenario | Per Bond._scColor |
| esg | Gruen (ESG) / Rot (konventionell) |
| quelle | Gelb (Bestand) / Gruen (Neu) / Gradient (beides) |
| land | 16 Laender-Farben (DE=rot, FR=blau, IT=gruen, ...) |
| rating | AA=gruen, A=blau, BBB=gelb, <BBB=rot |
| rang | SP, SU, SNP, SEC, T2, AT1 je eigene Farbe |
| sektor | BANKS, INSURANCE, FINANCIALS, REITS, OTHER |
| rw | 20%=gruen, 50%=gelb, 100%=rot |

**Trendlinien-Segmente:**
gesamt, rating, sektor, rang, faellTyp, rw, esg, land, kpnTyp, masterliste, prof_{id}

**Features:**
- Zoom mit Rubber-Band-Selection (Mouse-Drag)
- Lineare Regression pro Segment (slope, intercept, r²)
- Kategorische + numerische Achsen mit Jitter
- Legend-basierte Punkt-Filterung (klick auf Legend-Item)
- 30+ Chart-Settings persistent in localStorage

---

## 23. Export-Funktionen

### 23.1 Excel-Exporte (XLSX)

| Export-Typ | Sheets | Zeile | Ausloeser |
|------------|--------|-------|-----------|
| **Universum** | 11 | ~5300 | Markt-Analyse Tab |
| **Profile** | 9 | ~5400 | Universum-Profile Export |
| **Zielportfolio** | 15 | 15999 | Portfolio-Review Tab |
| **Szenarien-Vergleich** | 14 | 16270 | Szenarien Tab |
| **Deep-Dive** | 16 | 16531 | Deep-Dive Tab |

**Zielportfolio-Sheets (15):**
1. Info (Metadaten)
2. Zielportfolio (31 Spalten, alle Bonds mit Nominale)
3. Universum (alle 1643 Bonds)
4. Zulaessiges Universum (nach ALR gefiltert)
5. Universum-Statistik (Gesamt vs. Zulaessig)
6. Regelwerk (40+ Parameter-Zeilen)
7. PF vs Benchmark (Rating/Rang/Sektor/Laufzeit/Land)
8. Bestand vs Neu (Kennzahlen Split)
9. PF-Konzentration (Top-Emittenten)
10-15. Chart-Daten Sheets

**XLSX Post-Processing mit JSZip (Zeile 5300-5370):**
- Tab-Farben via XML-Manipulation (`<tabColor rgb="FF{hex}">`)
- Freeze Panes (`<pane ySplit="{freezeY}">`)

### 23.2 PowerPoint-Export (PPTX, Zeile 16180-16268)

**8 Slides:**
1. Portfolio-Uebersicht (KPI-Tabelle: 15 Metriken, PF vs BM vs Delta)
2. Rating-Verteilung (Chart)
3. Laufzeitenverteilung (Chart)
4. Laender-Verteilung (Chart)
5. Emittenten-Konzentration (Chart + Top-10 Tabelle)
6. Struktur-Analyse (Doughnut-Charts)
7. Scatter Plot (Duration vs. Rendite)
8. Kennzahlen-Detail (erweiterte KPI-Tabelle)

**Slide-Format:**
- Layout: LAYOUT_WIDE
- Header: Rotes Band (#E2001A)
- Footer: "Portfolio Engine V3.6 | [Datum]"
- Charts: Canvas -> PNG via toDataURL()

### 23.3 CSV-Export

- Semikolon-getrennt (DE Locale)
- Dezimalkomma
- Funktion: `exportCSV()` (Zeile ~5226)

### 23.4 JSON Session-Export

- Vollstaendiger State-Dump
- Enthalt: Szenarien, Universum, Konfiguration, Profile

---

## 24. Anlagerichtlinien-Engine

### 24.1 Preset "alr_2026" (Zeile 3575-3640)

**Erwerbs-Modus:**

| Regel | Einstellung |
|-------|-------------|
| Regionen | EWR + OECD Europa + USA + Kanalinseln |
| Waehrung | Nur EUR |
| Zahlungsrang | Nur SP + SU |
| Struktur | Nur Bullet |
| Kupon | Nur Fixed |
| Sektor | Banks, Insurance, Financials |
| Rating Min | BBB+ / Baa1 |
| Laufzeit Max | 10 Jahre |
| Rating-Pflicht | Ja (mind. 1 Rating) |
| Sperrliste | ~6 Ticker (GLJGR, HDI, TALANX, ...) |
| ISIN-Ausnahmen | DEKA DE000DK010E5 (max 25,4 Mio.) |
| Max Emittent | 10 Mio. EUR |

**Bestands-Modus:**
- Wie Erwerb, aber Rating Min = **BBB- / Baa3** (gelockert)

### 24.2 DZ BANK Masterliste

- Whitelist: 75+ gecoverte Emittenten
- Keine zusaetzlichen Constraints

### 24.3 Einstellungen-Tab Constraint-Toggles (Zeile 17893-17974)

10 einzeln aktivierbare Regeln: Regionen, Waehrung, Rang, Struktur, Kupon, Sektor, Rating, Sperrliste, Max-Emittent, Max-Laufzeit.

---

## 25. Benutzerhandbuch

### 25.1 11 Kapitel (Zeile 22446-23691)

1. Ueberblick (8-Schritt-Workflow, 6 Kernprinzipien, Navigation)
2. Daten-Import (Bloomberg/CSV, Spalten-Mapping, Bestandsliste)
3. Markt-Analyse (Explorer-Presets, Profile, Filter, KPIs, Charts)
4. Deep-Dive (12 Panels, Panel-Management)
5. Optimierer (12 Strategie-Presets, Constraint-Config)
6. Solver-Algorithmen (LP, MIP, Greedy, Lexicographic, Auto-Optimize)
7. Szenarien-Vergleich (9 Panels, KI-Pruefauftrag)
8. Portfolio-Review (Bond-Tabelle, Vergleiche)
9. Reporting (8-Slide Report, PPTX-Export)
10. Export-Center (5 XLSX-Typen, Session-Management)
11. Glossar (35 Fachbegriffe)

### 25.2 Glossar-Auszug (Zeile 23635-23685)

YTM, I-Spread, Modified Duration, Macaulay Duration, Konvexitaet, Carry, Rolldown, KSA-RW, CRR3, VAG, KAGB, Senior Preferred, Senior Non-Preferred, MREL, Green Bond, HHI, Greedy, LP, MIP, HiGHS, Lexikographisch, NSGA-II, Pareto-Front, Rich/Cheap, UnitToggle, Explorer-Preset, etc.

---

## 26. App-Initialisierung

### 26.1 ErrorBoundary (Zeile 23799-23808)

```javascript
class ErrorBoundary extends React.Component {
  constructor(props) { this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <ErrorDialog mit Reload-Button>;
    return this.props.children;
  }
}
```

### 26.2 App-Wrapper (Zeile 23809-23810)

```javascript
function App() {
  return <ErrorBoundary><MainApp /></ErrorBoundary>;
}
```

### 26.3 React Rendering (Zeile 23812)

```javascript
ReactDOM.render(React.createElement(App), document.getElementById("root"));
```

Hinweis: Verwendet ReactDOM.render() (React 17 API), nicht React 18 createRoot().

---

## 27. Utility-Funktionen

| Funktion | Zweck |
|----------|-------|
| `fx(n, d)` | Formatiert Zahl mit d Dezimalstellen, Dezimalkomma |
| `fmtVol(n)` | Formatiert Volumen ("123,4 Mio. EUR") |
| `fmtFall(fall)` | Konvertiert Datum zu DD.MM.YYYY |
| `fmtPct(v)` | Formatiert als Prozent |
| `r0(n), r1(n), r2(n), r3(n)` | Rundet auf 0-3 Dezimalstellen |
| `pseudoRand(id, seed)` | Deterministischer PRNG (fuer Scatter-Jitter) |
| `getMatBucket(mty)` | Maturity -> Bucket-String |
| `loN(mo, sp)` | Worst-of Rating (numerisch) |
| `loR(mo, sp)` | Worst-of Rating (Label) |
| `calcHHI(map, total)` | Herfindahl-Hirschman-Index |
| `linearRegression(xs, ys)` | OLS Regression (slope, intercept, r²) |
| `approxConvexity(md, y)` | Geschaetzte Konvexitaet |
| `rankBadgeCls(rank)` | CSS-Klasse fuer Rang-Badge |
| `lqaColor(v)` | LQA -> Farbe (rot bis gruen) |
| `getCountryFallback(b)` | Land-Fallback via Emittenten-DB |

---

## 28. Datenfluss

```
                    XLSX/CSV/JSON Import
                           |
                           v
                   processBonds()
                   - Rating-Normalisierung (normMo, normSp)
                   - Worst-of-Rating (loN, loR)
                   - Land-Fallback (Emittenten-DB)
                   - Sektor-Ableitung (iBoxx L3)
                   - Abgeleitete Metriken (yRw, sRw, bkt)
                           |
                           v
                  Universe [1.643+ Bonds]
                     /        |         \
                    v         v          v
              Filter      stats()    Markt-Analyse
              (22+ Kriterien) |      (globalStats)
                    \         |         /
                     v        v        v
                  Eligible Pool
                        |
           +------------+------------+
           |            |            |
           v            v            v
      optimizeLP   optimizeMIP_v2  Greedy
      (LP-Solver)  (HiGHS WASM)   (Heuristik)
           |            |            |
           +------+-----+-----+-----+
                  |           |
                  v           v
          Standard-Solve  Auto-Optimize
          (1 Loesung)     (1000+ Szenarien)
                  |           |
                  |     +-----+-----+
                  |     |           |
                  |     v           v
                  |  NSGA-II    Frontier-
                  |  Pareto     Kurven
                  |     |
                  |     v
                  |  Re-Solve
                  |  Top 14
                  |     |
                  +--+--+
                     |
                     v
              Portfolio [nom-Allokation]
                /          |          \
               v           v           v
         Deep-Dive    Szenarien     Export
         (12 Panels)  (Vergleich)   (XLSX/PPTX/JSON)
               |           |
               v           v
          Reporting    KI-Pruefauftrag
          (8 Slides)   (Clipboard)
```
