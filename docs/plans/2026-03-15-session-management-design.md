# Session-Management — Design

## Überblick
Session-Snapshots: Gesamten Arbeitsstand speichern, wiederherstellen und als Datei ex-/importieren. Navbar zeigt aktive Session, Export-Center hat vollständige Verwaltung.

## Konzept
- **Aktive Session** = localStorage (wie bisher, keine Änderung am bestehenden Speicher-Modell)
- **Gespeicherte Sessions** = `.json`-Dateien (Download/Upload), nicht in localStorage
- **Session-Metadaten-Liste** = `SPEngine_sessions` in localStorage (Name, Datum, Bond-Anzahl — nur Metadaten, ~1 KB)
- **Session-Name** = `SPEngine_sessionName` in localStorage (Standard: "Aktuelle Sitzung")

## Was eine Session enthält
Vollständiger Snapshot aller `SPEngine_*` Keys:
- Datasets (Bond-Rohdaten, ~1-2 MB)
- Solver-Konfiguration (~30 cfg_* Keys)
- Portfolio-Ergebnis (lastPortfolio)
- Szenarien (scenarios)
- Universum-Profile (universeProfiles)
- User-Presets (userPresets)
- Benchmark-Filter (bmType, bmFilter)
- Bestandsdaten
- Anlagerichtlinien
- UI-State (Tab, Zoom, Tile-Order)

## Dateiformat
```json
{
  "type": "SPEngine_Session",
  "version": 1,
  "name": "Q1-Report",
  "created": "2026-03-15T14:32:00Z",
  "meta": { "bonds": 1643, "scenarios": 3, "hasPortfolio": true, "profiles": 2 },
  "state": { ... alle SPEngine_* Key-Value-Paare ... }
}
```
Dateiname: `SPEngine_[Name]_[YYYY-MM-DD].json`

## UI: Navbar Session-Indikator
- Position: Links neben Zoom-Controls in der Top-Navbar
- Zeigt: `📋 [Session-Name] ▾`
- Dropdown: Umbenennen, Speichern, gespeicherte Sessions (Quick-Load), Neue Session, → Export-Center
- Mobile: Kompakter, nur Icon + Name

## UI: Export-Center Session-Bereich
Neuer Abschnitt ÜBER den Einzel-Exporten:
- Aktuelle Session: Name, Änderungsdatum, Stats (Bonds, Szenarien, Portfolio)
- Buttons: Speichern, Als Datei exportieren, Umbenennen
- Tabelle gespeicherter Sessions (aus Metadaten-Liste)
- Buttons: Neue leere Session, Session aus Datei laden

## Workflows

### Session speichern (als Datei)
1. User klickt "Speichern" → Name bestätigen
2. Alle `SPEngine_*` Keys aus localStorage sammeln
3. JSON-Objekt mit type, version, meta, state erstellen
4. Download als `.json`-Datei
5. Metadaten zur Session-Liste hinzufügen

### Session laden (aus Datei)
1. User klickt "Session aus Datei laden" → File-Input (.json)
2. Validierung: type === "SPEngine_Session", version check
3. Warnung: "Aktuelle Daten werden überschrieben. Fortfahren?"
4. Alle SPEngine_* Keys löschen
5. State aus JSON in localStorage schreiben
6. Session-Name setzen
7. `window.location.reload()`

### Session laden (Quick-Load aus Metadaten)
- Zeigt Hinweis: "Bitte die Datei [Name].json importieren"
- Öffnet File-Input

### Session als Datei exportieren
1. Alle SPEngine_* Keys sammeln → JSON
2. Download

### Neue leere Session
1. Warnung: "Alle Daten löschen?"
2. Alle SPEngine_* Keys löschen
3. Session-Name auf "Neue Sitzung" setzen
4. Reload

### Umbenennen
1. Prompt/Inline-Input
2. SPEngine_sessionName aktualisieren

## Speicher-Budget
- Aktive Session: ~2-3 MB (wie bisher)
- Session-Metadaten: ~1 KB pro Eintrag × 5 = ~5 KB
- Gespeicherte Sessions: NUR als Dateien, NICHT in localStorage
- Kein localStorage-Limit-Problem
