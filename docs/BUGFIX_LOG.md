# MIP Solver Bugfix Log — 2026-03-16

## Zusammenfassung
**Round 1:** 19 potenzielle Bugs analysiert, 15 gefixt, 4 als "kein Bug" verifiziert.
**Round 2:** 9 weitere Bugs analysiert, 5 gefixt, 2 als "kein Bug" verifiziert, 2 als irrelevant übersprungen.

---

## CRITICAL FIXES

### BUG-1: PF-Average-Constraints mathematisch falsch ✅
**Problem:** RHS war `EPSILON / S` (~1e-6), erzwang exakten Durchschnitt.
**Fix:** Neue Konstante `PF_AVG_SLACK = 0.01` (1% Toleranz). RHS ist jetzt `PF_AVG_SLACK * effectiveBudget / S` — proportional zum Budget.
**Dateien:** Lines ~4567, ~6901-6949

### BUG-2: Issuer-Minimum Constraints — Code-Cleanup ✅
**Problem:** Redundante Iterationslogik, O(N*M*K) statt O(N*M+N*K).
**Fix:** Pre-computed Arrays für Issuer-Bond-Indices.
**Dateien:** Lines ~6771-6785

### BUG-3: ISIN-Exception umgeht Sektor-Filter nicht ✅
**Problem:** `!isException` fehlte bei Sektor-Filter (Line 4605).
**Fix:** `if (!isException && sektorLimits && ...)` hinzugefügt.
**Dateien:** Line 4605

---

## HIGH-SEVERITY FIXES

### BUG-4: Locked Bonds verschwinden aus Solution ✅
**Problem:** Locked Bonds konnten `undefined` in solver output haben → nom=0 → vom minNom-Filter entfernt.
**Fix:** Locked Bonds lesen direkt aus `lockedMap`, nicht aus Solver-Output.
**Dateien:** Lines ~7077-7086

### BUG-5: Locked Bonds nicht gegen alle Constraints validiert ✅
**Problem:** `validateLockedVsLimits` prüfte nur Budget/Country/Issuer.
**Fix:** Erweitert um Rating-Max und Rank-Max Validierung. Neuer `cfg`-Parameter.
**Dateien:** Lines ~4738-4754, alle Aufrufstellen

### BUG-9: Bond-Extraktion nach Lot-Rounding unter minNom ✅
**Problem:** `Math.round(nom/lotSize)*lotSize` konnte nom unter minNom drücken.
**Fix:** Wenn Abrundung unter minNom → versuche Aufrundung (wenn <= Cap).
**Dateien:** Lines ~7080-7086 (in BUG-4 Fix integriert)

### BUG-7 + BUG-15: Lot-Size-Scaling + EPSILON ✅
**Problem:** `EPSILON / S` war doppelt falsch — zu klein und inkonsistent skaliert.
**Fix:** Ersetzt durch `PF_AVG_SLACK * effectiveBudget / S` (in BUG-1 integriert).

### BUG-16: COEFF_NOISE zu klein ✅
**Problem:** `1e-12` filterte Bonds mit extrem kleinen Scores aus der Zielfunktion.
**Fix:** Auf `1e-9` erhöht.
**Dateien:** Line ~4567

---

## MEDIUM-SEVERITY FIXES

### BUG-10: Semi-Continuous Warnung für Locked Bonds ✅
**Problem:** Locked Bonds mit nom < minBondNom oder nicht-lotSize-aligned wurden still akzeptiert.
**Fix:** `prepLockedBonds` loggt jetzt Warnungen für solche Fälle.
**Dateien:** Lines ~4725-4735

### BUG-11: Duration-Conflict-Check unvollständig ✅
**Problem:** Fehlte: `durMax < pfMinDur`, `matMax < pfMinMat`, `pfMinK > pfMaxK`, `pfMinPx > pfMaxPx`.
**Fix:** 8 zusätzliche Widerspruchs-Checks, detaillierte Conflict-Liste.
**Dateien:** Lines ~4705-4722

### BUG-12: Budget-Floor ignoriert Bond-Minimums ✅
**Problem:** computeBudgetFloor berücksichtigte nicht die Anzahl eligible Bonds × maxNom.
**Fix:** `maxFillByMinNom`-Korrektur und neuer `cfg`-Parameter.
**Dateien:** Lines ~4757-4779, alle Aufrufstellen

### BUG-13: Infeasibility-Cascade verliert Constraint-Intention ✅
**Problem:** Step 3 entfernte sofort ALLE Kategorie-Constraints.
**Fix:** Neuer 7-Step-Cascade: ESG → Budget 80% → PF-Avg → Category min/max → All categories → Budget 0 → Empty.
**Dateien:** Lines ~7010-7068

### BUG-14: ESG-Soft-Flag wird nie genutzt ✅
**Problem:** `greenSoft = true` wurde gesetzt aber nirgends gelesen.
**Fix:** ESG-Soft-Warnung mit Soll/Ist-Vergleich im Result-Log.
**Dateien:** Lines ~7088-7092

### BUG-17: Überlappende Kategorie-Constraints ungeprüft ✅
**Problem:** Keine Pre-Solve-Warnung wenn Sum(category mins) > 100% oder Country-Limit × Länder < 95%.
**Fix:** Pre-Solve Feasibility Check vor LP-Build mit console.warn.
**Dateien:** Vor "Build LP String" Abschnitt

### BUG-19: clearRestrictions() inkonsistent ✅
**Problem:** Rank/Struktur/Kupon → alles enabled, aber Sektor → Defaults (REITS/OTHER disabled).
**Fix:** Alle Kategorien konsistent auf `{enabled:true, min:"", max:""}`.
**Dateien:** Lines ~11287-11290

---

## KEIN BUG (Verifiziert)

### BUG-6: Integer-Constraint fehlt bei Locked Bonds ❌
**Grund:** Locked Bonds haben fixierte Bounds (`fixedS <= z_i <= fixedS`). Integer-Flag ist redundant.

### BUG-8: Rating-Mapping Inkonsistenz ❌
**Grund:** `RS` (Line 2342) und `LBL` (Line 2343) sind konsistent 1-basiert (AAA=1, BBB+=8). `RATING_LABELS` Array wird nur für UI genutzt.

### BUG-18: sektorLimits fehlt in liveCfg ❌
**Grund:** `sektorLimits` war bereits in `liveCfg` enthalten (Line 11664). False Positive.

---

# Round 2 — LP-Modell-Audit (2026-03-16)

## CRITICAL FIXES

### NEW-1: Kategorie-Constraints nutzen absolute statt relative Prozent ✅
**Problem:** Alle %-basierten Kategorie-Constraints (Country, Rating, ESG, Rang, Struktur, Kupon, Sektor) nutzten `effectiveBudget` als Basis: `Sum(z_i in cat) <= pct/100 * effectiveBudget/S`. Bei <100% Budget-Auslastung waren die Limits zu locker (z.B. "max 30%" erlaubte real 37.5% bei 80% Auslastung).
**Fix:** Neue relative Formulierung: `Sum((inCat ? 1-frac : -frac) * z_i) <= 0` (max) bzw. `>= 0` (min). Helper-Funktion `addPctConstraint()` für alle Kategorien.
**Dateien:** Lines ~6903-7010 (komplett ersetzt)

---

## HIGH-SEVERITY FIXES

### NEW-4: Phase 2 ESG→Yield ignoriert Solver-Flags ✅
**Problem:** Phase 2 der ESG→Yield-Optimierung rief immer `optimizeMIP_v2()` auf, unabhängig von `runMIP`/`runLP`/`runGreedy`. Bei deaktiviertem MIP schlug Phase 2 fehl.
**Fix:** Neue `solvePhase2()`-Funktion die `runMIP` → `runLP` → `runGreedy` priorisiert (wie Phase 1).
**Dateien:** Lines ~11985-12005

### NEW-8: san() erzeugt identische Constraint-Namen ✅
**Problem:** `san()` entfernte alle Sonderzeichen: `AA+`, `AA`, `AA-` → alle `"AA"`. Constraint-Name-Kollision im LP-Format — spätere Constraint überschreibt frühere.
**Fix:** `+` → `p`, `-` → `m` vor dem Entfernen: `AA+` → `AAp`, `AA-` → `AAm`.
**Dateien:** Lines ~6801 (MIP) und ~6243 (LP)

---

## MEDIUM-SEVERITY FIXES

### NEW-3: Locked Bonds in deaktivierten Kategorien ungewarnt ✅
**Problem:** `filterEligible` entfernt Bonds in disabled Kategorien, aber `prepLockedBonds` injiziert Locked Bonds zurück. Kein Hinweis an User wenn Locked Bond in deaktivierter Kategorie liegt.
**Fix:** `validateLockedVsLimits()` prüft jetzt alle 5 Kategorie-Typen (Rang, Struktur, Kupon, Sektor, Rating) für Locked Bonds und loggt Warnungen.
**Dateien:** Lines ~4814-4828

### NEW-5: Leere Objective Function nicht erkannt ✅
**Problem:** Wenn alle Bond-Scores ≤ COEFF_NOISE, war die Objective-Zeile leer. HiGHS maximiert dann 0 — Ergebnis willkürlich.
**Fix:** Erkennung leerer Objective in MIP und LP, Fallback auf gleichgewichtete Allokation (alle Koeffizienten = 1) mit console.warn.
**Dateien:** Lines ~6869-6876 (MIP) und ~6269-6276 (LP)

### NEW-7: Locked Bonds Kategorie-Kapazitäts-Diagnose ✅
**Problem:** Locked Bonds verbrauchen Category-Limit-Kapazität, aber User sieht nicht wie viel. Z.B. DE-Bestand 25% bei DE-Max 30% → nur 5% Spielraum für neue Bonds, nicht erkennbar.
**Fix:** Diagnose-Log vor LP-Build: für jede Kategorie wird die durch Bestand belegte Kapazität in % ausgegeben.
**Dateien:** Vor "Build LP String" Abschnitt

---

## KEIN BUG / ÜBERSPRUNGEN (Round 2)

### NEW-2: esgYield Objective fehlt in baseScoreFn ❌
**Grund:** `"esgYield"` wird durch die Zwei-Phasen-Orchestrierung immer zu `"_maxEsg"` (Phase 1) oder `"yield"` (Phase 2) transformiert, bevor es `baseScoreFn` erreicht. False Positive.

### NEW-6: PF-Average-Constraints leere LHS ⏭️
**Grund:** Übersprungen — extrem unrealistisch dass alle 1.643 Bonds exakt denselben Attribut-Wert haben.

### NEW-9: balanced Objective nicht explizit in baseScoreFn ⏭️
**Grund:** Übersprungen — Objective-Werte kommen aus fester UI-Dropdown-Liste, Tippfehler im Produktivbetrieb nicht möglich.
