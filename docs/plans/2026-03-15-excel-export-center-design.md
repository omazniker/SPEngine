# Excel Export-Center — Design

## Überblick
Neuer Tab "Export-Center" (ID 8) in der Hauptnavigation. Zentraler Ort für alle Excel-Exporte mit Download-Buttons, KI-Prompts und einer konsolidierten Gesamt-Excel.

## Navigation
- Tab ID 8, Position zwischen Reporting (6) und Anleitung (5)
- Desktop: `{ id: 8, label: "Export-Center" }`
- Mobile: `{ id: 8, label: "Export", icon: "📥" }`

## Layout — Zweigeteilt

### Obere Hälfte: 5 Einzel-Export-Karten (Grid)

Jede Karte:
- Icon + Titel + Kurzbeschreibung
- Dynamische Sheet-Anzahl
- Status: 🟢 Verfügbar / 🔴 Ausgegraut + Quick-Link "→ Zum [Tab]"
- 3 Buttons: 📥 Download | 🔍 KI: Prüfen | 📊 KI: Reporting

| # | Export | Verfügbar wenn |
|---|--------|----------------|
| 1 | Universum | `marketPortfolio.length > 0` |
| 2 | Profile | `universeProfiles.length > 0` |
| 3 | Zielportfolio | `pf` existiert (nach Optimierung) |
| 4 | Szenarien-Vergleich | `savedScenarios.length >= 2` |
| 5 | Deep-Dive | `marketPortfolio.length > 0` |

Nicht-verfügbar: ausgegraut, Quick-Link navigiert via `setTab()`.

### Untere Hälfte: Gesamt-Excel (hervorgehobene Karte)

- Größere Karte mit spark-Gradient-Rahmen
- Titel: "📦 Gesamt-Export — Alle Daten in einer Datei"
- Dynamische Sheet-Liste
- Verfügbar wenn mindestens Universum-Daten vorhanden
- Gleiche 3 Buttons: Download + 2× KI
- Enthält nur verfügbare Daten (keine leeren Sheets)

## Gesamt-Excel — Konsolidierung

Alle 5 Exporte zusammengeführt, Duplikate eliminiert:

**Deduplizierte Sheets:**
- Universum → einmal (existiert in Universum + Zielportfolio)
- Scatter-Daten → einmal (vollständigste Version)
- Spread-Kurve → einmal (vollständigste Version)
- Emittenten-Top50 → einmal

**Gruppierung im Info-Tab:**
- Universum & Filter (grün)
- Portfolio & Optimierung (grün/blau)
- Szenarien (blau)
- Deep-Dive Analysen (blau/orange)
- Chart-Daten (orange)
- Abweichungsanalysen (lila)
- Konfiguration (grau)

## Erweiterte Info-Sheets (alle 6 Excels)

### Spalten im Inhaltsverzeichnis
| Nr. | → Reiter (klickbar) | Inhalt | Zeilen | Verwendung |

### Zusätzliche Abschnitte

**STRUKTUR** — Farbcodierung der Tabs:
- 🟢 Grün = Bond-Daten (Rohdaten, Listen)
- 🔵 Blau = Kennzahlen & Vergleiche
- 🟠 Orange = Chart-Daten (Visualisierungen)
- 🟣 Lila = Abweichungsanalysen (Delta)
- ⚫ Grau = Konfiguration & Regelwerk

**DATENQUELLEN** — Herkunft und Kontext:
- Universum: Dateiname, Import-Datum
- Optimierung: Solver, Ziel, Budget
- Export-Zeitpunkt

## KI-Prompts (Clipboard)

### Prompt 1 — "Prüfen"
```
Ich habe dir eine Excel-Datei gegeben: [DATEINAME].
Analysiere die Datei auf Plausibilität und Konsistenz:
- Prüfe KPIs auf realistische Werte (Renditen, Spreads, Duration)
- Identifiziere Ausreißer und Inkonsistenzen zwischen Sheets
- Prüfe ob Summen/Gewichtungen 100% ergeben
- Vergleiche Portfolio- vs. Markt-Kennzahlen auf Plausibilität
- Melde auffällige Werte mit konkreten Zell-Referenzen
```

### Prompt 2 — "Reporting"
```
Ich habe dir eine Excel-Datei gegeben: [DATEINAME].
Erstelle ein präsentationsfertiges Reporting:
- Erstelle professionelle Charts und Grafiken aus den Daten
- Rating-Verteilung, Sektor-Allokation, Laufzeitprofil als Diagramme
- Portfolio vs. Benchmark Vergleich visuell aufbereiten
- Executive Summary mit den wichtigsten KPIs
- Formatierung für PowerPoint-/Präsentationsqualität
```

## Technische Umsetzung

- Kein neuer State nötig — nutzt bestehende `marketPortfolio`, `pf`, `savedScenarios`, `universeProfiles`
- Bestehende Export-Handler werden wiederverwendet (nicht dupliziert)
- Gesamt-Excel: neue Funktion `handleExportGesamtExcel` die Sheets aus allen Quellen sammelt
- `createInfoSheet` erweitern: +2 Spalten (Zeilen, Verwendung) + Struktur/Datenquellen-Abschnitte
- `navigator.clipboard.writeText()` für KI-Prompt-Buttons
