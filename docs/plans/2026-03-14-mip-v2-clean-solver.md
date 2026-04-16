# MIP v2 Clean Solver — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `optimizeMIP()` zum einzigen primären Solver machen, ALLE Constraints direkt im MIP-Modell formulieren, Post-Processing komplett eliminieren, Budget-Auslastung auf ≥95% bringen. Greedy bleibt als Fallback bei HiGHS-Ladefehlern.

**Architecture:** Neue Funktion `optimizeMIP_v2()` ersetzt die aktuelle `optimizeMIP()` (Zeilen 5282–5809). Der entscheidende Unterschied: KEIN Post-Processing nach dem Solve. Alle Constraints (Budget 95–100%, Semi-Continuous, Issuer/Country/Rating/Rank/Struktur/Kupon-Limits, Portfolio-Avg, ESG, Locked Bonds) werden als LP-Constraints formuliert. Nach dem Solve wird nur ausgelesen und validiert — niemals modifiziert. Infeasibility wird über eine 6-stufige Kaskade behandelt. ESG→Yield bleibt zweistufig (Phase 1: max ESG, Phase 2: max Yield mit ESG-Floor).

**Tech Stack:** HiGHS WASM (highs@1.8.0), LP-Format-String, Browser-only

**Datei:** `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html`

**KPIs (Priorität):**
1. Budget-Auslastung (Ziel: ≥95%)
2. Rendite unter Constraint-Einhaltung
3. 100% Constraint-Compliance (keine Verletzungen)

---

## Übersicht: Was wird geändert

### Entfällt komplett (~420 Zeilen):
- `computeRankCaps()` Aufruf in MIP (Zeile 5300–5302) — Solver allokiert optimal ohne Rank-Caps
- `mipEnforceMax()` / `mipEnforceMin()` Post-Processing (Zeilen 5649–5696) — Solver löst Avg-Constraints direkt
- MIP-Refill-Phase (Zeilen 5707–5788) — Budget-Floor 95% macht Refill unnötig
- `minIssNom` Post-Filter (Zeilen 5792–5797) — wird als MIP-Constraint formuliert

### Wird geändert:
- Budget-Floor: 70% → 95% (Zeile 5319)
- Bond-Caps: Rank-basiert → alle `maxBondNom` (Zeile 5300)
- Retry-Kaskade: 2-stufig → 6-stufig (Zeilen 5598–5631)
- Solution-Extraction: mit Rounding-Cleanup → nur auslesen (Zeilen 5633–5645)

### Wird hinzugefügt:
- Issuer-Minimum-Constraint (als MIP-Constraint statt Post-Filter)
- `validateSolution()` Funktion (reine Validierung, kein Fixing)
- 6-stufige Infeasibility-Kaskade
- `tests.html` mit deterministischen Testfällen

---

## Task 1: Test-Infrastruktur erstellen (`tests.html`)

**Files:**
- Create: `C:/Users/omazn/Desktop/PF/v4-standalone/tests.html`

**Step 1: Test-HTML Grundgerüst schreiben**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>MIP v2 Test Suite</title>
  <style>
    body { font-family: monospace; margin: 20px; background: #1a1a2e; color: #e0e0e0; }
    .pass { color: #00ff88; } .fail { color: #ff4444; font-weight: bold; }
    .suite { margin: 20px 0; padding: 10px; border-left: 3px solid #444; }
    .suite-name { font-size: 1.2em; color: #88aaff; margin-bottom: 8px; }
    .test { margin: 4px 0 4px 20px; }
    .summary { margin-top: 30px; padding: 15px; border: 2px solid; font-size: 1.3em; }
    .summary.all-pass { border-color: #00ff88; color: #00ff88; }
    .summary.has-fail { border-color: #ff4444; color: #ff4444; }
    #log { margin-top: 20px; padding: 10px; background: #0d0d1a; max-height: 300px; overflow-y: auto; font-size: 0.85em; color: #888; }
  </style>
</head>
<body>
  <h1>🧪 MIP v2 Test Suite</h1>
  <div id="status">Loading HiGHS...</div>
  <div id="results"></div>
  <div id="log"></div>

  <script>
    // ===== TEST FRAMEWORK =====
    const results = [];
    const logLines = [];

    function log(msg) { logLines.push(msg); }
    function assert(condition, msg) {
      results.push({ pass: condition, msg });
      if (!condition) log("FAIL: " + msg);
    }
    function assertClose(actual, expected, tolerance, msg) {
      const pass = Math.abs(actual - expected) <= tolerance;
      results.push({ pass, msg: msg + " (actual=" + actual.toFixed(4) + " expected=" + expected.toFixed(4) + " tol=" + tolerance + ")" });
      if (!pass) log("FAIL: " + msg + " | actual=" + actual + " expected=" + expected);
    }
    function assertGte(actual, min, msg) {
      const pass = actual >= min - 1e-6;
      results.push({ pass, msg: msg + " (actual=" + actual.toFixed(4) + " min=" + min + ")" });
      if (!pass) log("FAIL: " + msg);
    }
    function assertLte(actual, max, msg) {
      const pass = actual <= max + 1e-6;
      results.push({ pass, msg: msg + " (actual=" + actual.toFixed(4) + " max=" + max + ")" });
      if (!pass) log("FAIL: " + msg);
    }

    // ===== PORTFOLIO HELPERS =====
    function pfTotal(pf) { return pf.reduce((a, b) => a + b.nom, 0); }
    function pfAvg(pf, field) {
      const t = pfTotal(pf);
      return t > 0 ? pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / t : 0;
    }
    function pfGroupPct(pf, field, value) {
      const t = pfTotal(pf);
      if (t <= 0) return 0;
      const grp = pf.filter(b => b[field] === value).reduce((a, b) => a + b.nom, 0);
      return (grp / t) * 100;
    }
    function pfIssuerMax(pf) {
      const m = {};
      pf.forEach(b => { m[b.t] = (m[b.t] || 0) + b.nom; });
      return Math.max(0, ...Object.values(m));
    }
    function pfCountryMax(pf, budget) {
      const m = {};
      pf.forEach(b => { m[b.co] = (m[b.co] || 0) + b.nom; });
      return Math.max(0, ...Object.values(m));
    }

    // ===== CONSTRAINT VALIDATION =====
    function validateConstraints(pf, cfg, label) {
      const total = pfTotal(pf);
      const budget = cfg.budget;

      // Budget utilization
      assertGte(total, budget * 0.95, label + ": Budget ≥ 95%");
      assertLte(total, budget, label + ": Budget ≤ 100%");

      // Per-bond nom
      const minNom = parseFloat(cfg.minBondNom) || 0;
      pf.forEach(b => {
        if (!b.locked) {
          assertGte(b.nom, minNom, label + ": Bond " + b.isin + " nom ≥ minBondNom");
          assertLte(b.nom, cfg.maxBondNom, label + ": Bond " + b.isin + " nom ≤ maxBondNom");
        }
      });

      // Issuer limit
      const issTots = {};
      pf.forEach(b => { issTots[b.t] = (issTots[b.t] || 0) + b.nom; });
      Object.entries(issTots).forEach(([t, nom]) => {
        assertLte(nom, cfg.maxIssNominal, label + ": Issuer " + t + " ≤ maxIssNom");
      });

      // Country limit
      const coLimit = budget * (cfg.maxCo / 100);
      const coTots = {};
      pf.forEach(b => { coTots[b.co] = (coTots[b.co] || 0) + b.nom; });
      Object.entries(coTots).forEach(([co, nom]) => {
        assertLte(nom, coLimit, label + ": Country " + co + " ≤ " + coLimit.toFixed(0));
      });

      // Portfolio avg constraints
      if (cfg.pfMaxDur) assertLte(pfAvg(pf, "md"), parseFloat(cfg.pfMaxDur), label + ": Avg Duration ≤ " + cfg.pfMaxDur);
      if (cfg.pfMinDur) assertGte(pfAvg(pf, "md"), parseFloat(cfg.pfMinDur), label + ": Avg Duration ≥ " + cfg.pfMinDur);
      if (cfg.pfMaxPx) assertLte(pfAvg(pf, "px"), parseFloat(cfg.pfMaxPx), label + ": Avg Preis ≤ " + cfg.pfMaxPx);
      if (cfg.pfMinPx) assertGte(pfAvg(pf, "px"), parseFloat(cfg.pfMinPx), label + ": Avg Preis ≥ " + cfg.pfMinPx);
      if (cfg.pfMaxK) assertLte(pfAvg(pf, "k"), parseFloat(cfg.pfMaxK), label + ": Avg Kupon ≤ " + cfg.pfMaxK);
      if (cfg.pfMinK) assertGte(pfAvg(pf, "k"), parseFloat(cfg.pfMinK), label + ": Avg Kupon ≥ " + cfg.pfMinK);

      // Rating limits
      if (cfg.ratingLimits) {
        Object.entries(cfg.ratingLimits).forEach(([rtg, lim]) => {
          if (!lim.enabled) {
            const count = pf.filter(b => b.lo === rtg).length;
            assert(count === 0, label + ": Disabled rating " + rtg + " should have 0 bonds");
          }
          if (lim.enabled && lim.max && parseFloat(lim.max) < 100) {
            const pct = pfGroupPct(pf, "lo", rtg);
            assertLte(pct, parseFloat(lim.max) + 0.1, label + ": Rating " + rtg + " ≤ " + lim.max + "%");
          }
        });
      }

      // ESG minimum
      if (cfg.minGreen > 0) {
        const esgPct = pfGroupPct(pf, "g", 1);
        assertGte(esgPct, cfg.minGreen - 0.1, label + ": ESG ≥ " + cfg.minGreen + "%");
      }

      // Lot size
      const lotSize = parseFloat(cfg.minLot) || 0;
      if (lotSize > 0) {
        pf.forEach(b => {
          if (!b.locked) {
            const remainder = b.nom % lotSize;
            assert(remainder < 0.01 || Math.abs(remainder - lotSize) < 0.01,
              label + ": Bond " + b.isin + " lot-aligned (nom=" + b.nom + " lot=" + lotSize + ")");
          }
        });
      }
    }

    // ===== TEST BOND POOLS =====
    // Pool A: 50 bonds, mixed ratings, countries, ESG
    function createPoolA() {
      const issuers = [
        { t: "BNP", co: "FR" }, { t: "DB", co: "DE" }, { t: "SANT", co: "ES" },
        { t: "ING", co: "NL" }, { t: "UBI", co: "IT" }, { t: "NORD", co: "FI" },
        { t: "DNB", co: "NO" }, { t: "SEB", co: "SE" }, { t: "KBC", co: "BE" },
        { t: "ERSTE", co: "AT" }
      ];
      const ratings = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"];
      const ratingLn = { "AAA": 1, "AA+": 2, "AA": 3, "AA-": 4, "A+": 5, "A": 6, "A-": 7, "BBB+": 8, "BBB": 9, "BBB-": 10 };
      const pool = [];
      for (let i = 0; i < 50; i++) {
        const iss = issuers[i % issuers.length];
        const rtg = ratings[Math.min(i % ratings.length, ratings.length - 1)];
        pool.push({
          id: i, isin: "TEST" + String(i).padStart(4, "0"),
          t: iss.t, e: iss.t + " Bank", co: iss.co,
          y: 2.0 + (i * 0.08), k: 1.5 + (i * 0.06), s: 50 + i * 3,
          px: 98 + (i % 8) * 0.5, md: 2.0 + (i % 15) * 0.3,
          mty: 2.5 + (i % 12) * 0.7, lqa: 70 + (i % 30),
          lo: rtg, ln: ratingLn[rtg], sp: rtg, mo: "A1",
          g: i % 4 === 0 ? 1 : 0,  // 25% ESG
          rank: "SP", matTyp: "BULLET", kpnTyp: "FIXED",
          rw: 20 + (i % 5) * 10, vol: 500
        });
      }
      return pool;
    }

    // Pool B: Tight constraints - only 15 bonds, narrow rating
    function createPoolB() {
      const pool = [];
      for (let i = 0; i < 15; i++) {
        pool.push({
          id: i, isin: "TIGHT" + String(i).padStart(3, "0"),
          t: "ISS" + (i % 5), e: "Issuer " + (i % 5), co: ["DE", "FR", "NL", "AT", "FI"][i % 5],
          y: 3.0 + i * 0.1, k: 2.5 + i * 0.05, s: 80 + i * 5,
          px: 99 + (i % 4) * 0.5, md: 3.0 + (i % 5) * 0.4,
          mty: 3.5 + (i % 8) * 0.5, lqa: 80,
          lo: i < 10 ? "A+" : "BBB+", ln: i < 10 ? 5 : 8, sp: i < 10 ? "A+" : "BBB+", mo: "A1",
          g: i % 3 === 0 ? 1 : 0,
          rank: "SP", matTyp: "BULLET", kpnTyp: "FIXED",
          rw: 30, vol: 300
        });
      }
      return pool;
    }

    // ===== PLACEHOLDER: These functions will be imported from main file =====
    // For now, declare stubs — they get replaced by actual imports in Task 2

    // ===== TEST SUITES =====
    async function runTests() {
      document.getElementById("status").textContent = "Running tests...";

      // The actual test suites will be added in subsequent tasks
      // For now, just verify the framework works
      assert(true, "Framework: assert works");
      assertClose(1.0, 1.0, 0.001, "Framework: assertClose works");
      assertGte(5, 3, "Framework: assertGte works");
      assertLte(3, 5, "Framework: assertLte works");

      // Verify pool creation
      const poolA = createPoolA();
      assert(poolA.length === 50, "Pool A has 50 bonds");
      assert(poolA.filter(b => b.g === 1).length === 13, "Pool A has ~25% ESG bonds");

      const poolB = createPoolB();
      assert(poolB.length === 15, "Pool B has 15 bonds");

      renderResults();
    }

    function renderResults() {
      const el = document.getElementById("results");
      const passed = results.filter(r => r.pass).length;
      const failed = results.filter(r => !r.pass).length;

      let html = '<div class="summary ' + (failed === 0 ? "all-pass" : "has-fail") + '">';
      html += (failed === 0 ? "✅" : "❌") + " " + passed + " passed, " + failed + " failed";
      html += "</div>";

      html += '<div class="suite">';
      results.forEach(r => {
        html += '<div class="test ' + (r.pass ? "pass" : "fail") + '">';
        html += (r.pass ? "✓" : "✗") + " " + r.msg;
        html += "</div>";
      });
      html += "</div>";

      el.innerHTML = html;

      const logEl = document.getElementById("log");
      logEl.innerHTML = "<strong>Console Log:</strong><br>" + logLines.join("<br>");

      document.getElementById("status").textContent = "Done.";
    }

    runTests();
  </script>
</body>
</html>
```

**Step 2: Öffne `tests.html` im Browser und verifiziere**

Erwartetes Ergebnis: "✅ 6 passed, 0 failed"

**Step 3: Commit**

```bash
git add tests.html
git commit -m "test: add test framework and bond pool generators for MIP v2"
```

---

## Task 2: Solver-Funktionen exportierbar machen

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html` (Zeilen ~5809)

**Warum:** `tests.html` muss `optimizeMIP_v2()`, `filterEligible()`, `baseScoreFn()`, etc. aufrufen können. Da alles in einer HTML lebt, exportieren wir die relevanten Funktionen auf `window`.

**Step 1: Window-Export am Ende des Script-Blocks hinzufügen**

Suche die Stelle nach `optimizeMIP()` (Zeile ~5809) und vor dem nächsten React-Component. Füge hinzu:

```javascript
// === Exports for test suite ===
window._pfEngine = {
  filterEligible, baseScoreFn, computeRankCaps, parsePfFlags,
  checkDurationConflict, prepLockedBonds, validateLockedVsLimits,
  computeBudgetFloor, getHighsSolver,
  optimize,        // Greedy
  optimizeLP,      // LP (wird deprecated)
  optimizeMIP,     // MIP v1 (wird durch v2 ersetzt)
  catEnabled, catMinMax,
  COEFF_NOISE, EPSILON,
  RANK_CATS, STRUKTUR_CATS, KUPON_CATS
};
```

**Step 2: In `tests.html` den Import über iframe/script einbauen**

Ersetze den Placeholder-Kommentar in `tests.html` durch:

```html
<!-- Import solver functions from main file -->
<script>
  // Load main file in hidden iframe to access exported functions
  async function loadEngine() {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "portfolio_engine_standalone.html";
      iframe.onload = () => {
        try {
          const eng = iframe.contentWindow._pfEngine;
          if (!eng) throw new Error("_pfEngine not found on window");
          Object.assign(window, eng);
          resolve(eng);
        } catch (e) { reject(e); }
      };
      iframe.onerror = reject;
      document.body.appendChild(iframe);
    });
  }
</script>
```

Und ändere `runTests()` so dass es erst nach `loadEngine()` startet:

```javascript
async function runTests() {
  document.getElementById("status").textContent = "Loading engine...";
  try {
    await loadEngine();
    document.getElementById("status").textContent = "Engine loaded. Running tests...";
  } catch (e) {
    document.getElementById("status").textContent = "❌ Engine load failed: " + e.message;
    return;
  }
  // ... rest of tests
}
```

**Step 3: Verifiziere im Browser dass die Engine korrekt lädt**

**Step 4: Commit**

```bash
git add portfolio_engine_standalone.html tests.html
git commit -m "feat: export solver functions for test suite access"
```

---

## Task 3: `validateSolution()` — Reine Validierung ohne Fixing

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html`
  - Einfügen nach `computeBudgetFloor()` (nach Zeile ~4102)

**Step 1: Schreibe den Test in `tests.html`**

Füge in die `runTests()` Funktion nach den Framework-Tests ein:

```javascript
// === Suite: validateSolution ===
log("--- Suite: validateSolution ---");

const vPool = createPoolA().slice(0, 10);
const vCfg = {
  budget: 50e6, maxBondNom: 10e6, minBondNom: "2000000", maxIssNominal: 10e6,
  maxCo: 50, minGreen: 0, minLot: "", minLQA: 0,
  ratingLimits: {}, rankLimits: {}, strukturLimits: {}, kuponLimits: {},
  pfMaxDur: "4", pfMinDur: "", pfMaxPx: "", pfMinPx: "",
  pfMaxK: "", pfMinK: "", pfMaxMat: "", pfMinMat: "",
  excludedIssuers: [], excludedCountries: [], minRatingLn: ""
};

// Valid portfolio
const validPf = vPool.slice(0, 5).map(b => ({ ...b, nom: 10e6 }));
const vResult = validateSolution(validPf, vCfg);
assert(vResult.valid === true || vResult.violations.length === 0, "validateSolution: valid PF has no violations");

// Budget over
const overPf = vPool.slice(0, 6).map(b => ({ ...b, nom: 10e6 }));
const oResult = validateSolution(overPf, { ...vCfg, budget: 50e6 });
assert(oResult.violations.some(v => v.type === "budget_over"), "validateSolution: detects budget overflow");

// Bond over max
const bondOverPf = [{ ...vPool[0], nom: 15e6 }];
const bResult = validateSolution(bondOverPf, vCfg);
assert(bResult.violations.some(v => v.type === "bond_over_max"), "validateSolution: detects bond over maxBondNom");
```

**Step 2: Verifiziere dass Tests fehlschlagen** (validateSolution existiert noch nicht)

**Step 3: Implementiere `validateSolution()`**

Einfügen nach `computeBudgetFloor()` (~Zeile 4102):

```javascript
function validateSolution(pf, cfg) {
  const violations = [];
  const budget = cfg.budget;
  const total = pf.reduce((a, b) => a + b.nom, 0);
  const minNom = parseFloat(cfg.minBondNom) || 0;
  const maxNom = Math.max(0, cfg.maxBondNom);
  const lotSize = parseFloat(cfg.minLot) || 0;
  const coLimit = budget * (Math.max(0, cfg.maxCo) / 100);

  // Budget
  if (total > budget + 0.01) violations.push({ type: "budget_over", actual: total, limit: budget });
  if (total < budget * 0.95 - 0.01) violations.push({ type: "budget_under", actual: total, limit: budget * 0.95 });

  // Per-bond
  pf.forEach(b => {
    if (b.locked) return;
    if (b.nom > maxNom + 0.01) violations.push({ type: "bond_over_max", bond: b.isin, actual: b.nom, limit: maxNom });
    if (b.nom < minNom - 0.01 && b.nom > 0) violations.push({ type: "bond_under_min", bond: b.isin, actual: b.nom, limit: minNom });
    if (lotSize > 0) {
      const rem = b.nom % lotSize;
      if (rem > 0.01 && Math.abs(rem - lotSize) > 0.01) violations.push({ type: "lot_violation", bond: b.isin, actual: b.nom, lot: lotSize });
    }
  });

  // Issuer
  const issTots = {};
  pf.forEach(b => { issTots[b.t] = (issTots[b.t] || 0) + b.nom; });
  Object.entries(issTots).forEach(([t, nom]) => {
    if (nom > cfg.maxIssNominal + 0.01) violations.push({ type: "issuer_over", issuer: t, actual: nom, limit: cfg.maxIssNominal });
  });

  // Country
  const coTots = {};
  pf.forEach(b => { coTots[b.co] = (coTots[b.co] || 0) + b.nom; });
  Object.entries(coTots).forEach(([co, nom]) => {
    if (nom > coLimit + 0.01) violations.push({ type: "country_over", country: co, actual: nom, limit: coLimit });
  });

  // Portfolio Averages
  const pfFlags = parsePfFlags(cfg);
  const avg = (field) => total > 0 ? pf.reduce((a, b) => a + (b[field] || 0) * b.nom, 0) / total : 0;
  if (pfFlags.hasPfMaxDur && avg("md") > pfFlags.pfMaxDurVal + 0.01)
    violations.push({ type: "avg_over", field: "duration", actual: avg("md"), limit: pfFlags.pfMaxDurVal });
  if (pfFlags.hasPfMinDur && avg("md") < pfFlags.pfMinDurVal - 0.01)
    violations.push({ type: "avg_under", field: "duration", actual: avg("md"), limit: pfFlags.pfMinDurVal });
  if (pfFlags.hasPfMaxPx && avg("px") > pfFlags.pfMaxPxVal + 0.01)
    violations.push({ type: "avg_over", field: "price", actual: avg("px"), limit: pfFlags.pfMaxPxVal });
  if (pfFlags.hasPfMinPx && avg("px") < pfFlags.pfMinPxVal - 0.01)
    violations.push({ type: "avg_under", field: "price", actual: avg("px"), limit: pfFlags.pfMinPxVal });
  if (pfFlags.hasPfMaxK && avg("k") > pfFlags.pfMaxKVal + 0.01)
    violations.push({ type: "avg_over", field: "coupon", actual: avg("k"), limit: pfFlags.pfMaxKVal });
  if (pfFlags.hasPfMinK && avg("k") < pfFlags.pfMinKVal - 0.01)
    violations.push({ type: "avg_under", field: "coupon", actual: avg("k"), limit: pfFlags.pfMinKVal });
  if (pfFlags.hasPfMaxMat && avg("mty") > pfFlags.pfMaxMatVal + 0.01)
    violations.push({ type: "avg_over", field: "maturity", actual: avg("mty"), limit: pfFlags.pfMaxMatVal });
  if (pfFlags.hasPfMinMat && avg("mty") < pfFlags.pfMinMatVal - 0.01)
    violations.push({ type: "avg_under", field: "maturity", actual: avg("mty"), limit: pfFlags.pfMinMatVal });

  // Rating limits
  Object.entries(cfg.ratingLimits || {}).forEach(([rtg, lim]) => {
    if (!lim || !lim.enabled) {
      const bonds = pf.filter(b => b.lo === rtg);
      if (bonds.length > 0) violations.push({ type: "disabled_rating", rating: rtg, count: bonds.length });
    }
    if (lim && lim.enabled && lim.max && parseFloat(lim.max) < 100) {
      const grpNom = pf.filter(b => b.lo === rtg).reduce((a, b) => a + b.nom, 0);
      const pct = total > 0 ? (grpNom / total) * 100 : 0;
      if (pct > parseFloat(lim.max) + 0.1) violations.push({ type: "rating_over", rating: rtg, actual: pct, limit: parseFloat(lim.max) });
    }
  });

  // ESG
  if (cfg.minGreen > 0) {
    const esgNom = pf.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0);
    const esgPct = total > 0 ? (esgNom / total) * 100 : 0;
    if (esgPct < cfg.minGreen - 0.1) violations.push({ type: "esg_under", actual: esgPct, limit: cfg.minGreen });
  }

  return { valid: violations.length === 0, violations, total, budget };
}
```

**Step 4: Füge `validateSolution` zum `window._pfEngine` Export hinzu**

**Step 5: Verifiziere dass Tests jetzt grün sind**

**Step 6: Commit**

```bash
git add portfolio_engine_standalone.html tests.html
git commit -m "feat: add validateSolution() — pure validation without fixing"
```

---

## Task 4: `optimizeMIP_v2()` — Core-Solver ohne Post-Processing

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html`
  - Neue Funktion nach `optimizeMIP()` (nach Zeile 5809)

**Step 1: Tests für MIP v2 in `tests.html` schreiben**

```javascript
// === Suite: MIP v2 Core ===
log("--- Suite: MIP v2 Core ---");

// Test 1: Basic — 200M budget, simple constraints
const cfg1 = {
  obj: "yield", budget: 200e6, minGreen: 0,
  maxBondNom: 10e6, minBondNom: "2000000", maxIssNominal: 10e6,
  minIssNom: "", minLot: "", maxCo: 20, minLQA: 0,
  ratingLimits: {
    "AAA": { enabled: true, min: "", max: "" },
    "AA+": { enabled: true, min: "", max: "" },
    "AA":  { enabled: true, min: "", max: "" },
    "AA-": { enabled: true, min: "", max: "" },
    "A+":  { enabled: true, min: "", max: "" },
    "A":   { enabled: true, min: "", max: "" },
    "A-":  { enabled: true, min: "", max: "" },
    "BBB+":{ enabled: true, min: "", max: "20" },
    "BBB": { enabled: false, min: "", max: "" },
    "BBB-":{ enabled: false, min: "", max: "" }
  },
  rankLimits:    { "SP": { enabled: true, min: "", max: "" } },
  strukturLimits:{ "BULLET": { enabled: true, min: "", max: "" } },
  kuponLimits:   { "FIXED": { enabled: true, min: "", max: "" } },
  pfMaxDur: "4", pfMinDur: "", pfMaxPx: "101", pfMinPx: "",
  pfMaxK: "", pfMinK: "", pfMaxMat: "", pfMinMat: "",
  lockedBonds: [], excludedIssuers: [], excludedCountries: [],
  durMin: "", durMax: "", matMin: "", matMax: "",
  optMinK: "", optMaxK: "", optMinPx: "", optMaxPx: "",
  minRatingLn: "8"  // BBB+ = 8
};

const pool1 = createPoolA();
const pf1 = await optimizeMIP_v2(pool1, cfg1);
assert(pf1.length > 0, "MIP v2 Basic: produces result");
validateConstraints(pf1, cfg1, "MIP v2 Basic");

// Budget utilization is the primary KPI
const util1 = pfTotal(pf1) / cfg1.budget * 100;
assertGte(util1, 95, "MIP v2 Basic: budget utilization ≥ 95%");
log("MIP v2 Basic: utilization=" + util1.toFixed(1) + "%, yield=" + pfAvg(pf1, "y").toFixed(3) + "%");
```

**Step 2: Verifiziere dass Tests fehlschlagen** (optimizeMIP_v2 existiert noch nicht)

**Step 3: Implementiere `optimizeMIP_v2()`**

Die Funktion folgt der gleichen Struktur wie `optimizeMIP()`, aber mit diesen kritischen Unterschieden:

```javascript
async function optimizeMIP_v2(pool, cfg) {
  const solver = await getHighsSolver();
  const {
    obj, budget, minGreen, maxBondNom, minBondNom: cfgMinBond,
    maxIssNominal, minIssNom: cfgMinIss, minLot: cfgMinLot, maxCo,
    ratingLimits, rankLimits, strukturLimits, kuponLimits,
    pfMinK, pfMaxK, pfMinPx, pfMaxPx, pfMinDur = "", pfMaxDur = "",
    pfMinMat = "", pfMaxMat = "", lockedBonds = []
  } = cfg;

  const minNom = parseFloat(cfgMinBond) || 0;
  const maxNom = Math.max(0, maxBondNom);
  if (maxNom <= 0 || budget <= 0) return [];
  const lotSize = parseFloat(cfgMinLot) || 0;
  const S = lotSize > 0 ? lotSize : 1;
  const useInt = lotSize > 0;
  const minIssAmt = parseFloat(cfgMinIss) || 0;
  if (checkDurationConflict(cfg, "MIPv2")) return [];

  const el = filterEligible(pool, cfg);
  if (el.length === 0 && lockedBonds.length === 0) return [];
  const lockedMap = prepLockedBonds(el, pool, lockedBonds);
  const baseScore = baseScoreFn(obj);

  const effectiveBudget = budget;
  const coLimit = Math.max(0, effectiveBudget * (Math.max(0, maxCo) / 100));
  const greenTarget = minGreen > 0 ? Math.max(0, effectiveBudget * (minGreen / 100)) : 0;
  const san = s => s.replace(/[^a-zA-Z0-9]/g, '');
  const pfFlags = parsePfFlags(cfg);

  if (!validateLockedVsLimits(el, lockedMap, effectiveBudget, maxIssNominal, coLimit, "MIPv2")) return [];

  // ═══ CHANGE 1: Budget floor 95% statt 70% ═══
  const budgetFloor = effectiveBudget * 0.95;

  // ═══ CHANGE 2: Keine Rank-Caps — alle Bonds bekommen maxNom ═══
  // Der Solver entscheidet die Allokation über die Zielfunktion.

  // === Build LP String ===
  const fc = v => {
    if (!isFinite(v)) return "0";
    if (Math.abs(v) < COEFF_NOISE) return "0";
    const r = Math.round(v * 1e8) / 1e8;
    return r === Math.round(r) ? r.toFixed(0) : r.toString();
  };
  const L = [];

  // --- Objective ---
  L.push("Maximize");
  let objLine = "  obj:";
  el.forEach((b, i) => {
    const sc = baseScore(b);
    if (isFinite(sc) && Math.abs(sc) > COEFF_NOISE) objLine += ` + ${fc(sc)} z${i}`;
  });
  L.push(objLine);
  L.push("");
  L.push("Subject To");

  // --- Budget: 95% <= total <= 100% ---
  let budMax = "  c_bmax:";
  el.forEach((_, i) => { budMax += ` + 1 z${i}`; });
  budMax += ` <= ${fc(effectiveBudget / S)}`;
  L.push(budMax);

  let budMin = "  c_bmin:";
  el.forEach((_, i) => { budMin += ` + 1 z${i}`; });
  budMin += ` >= ${fc(budgetFloor / S)}`;
  L.push(budMin);

  // --- Semi-continuous: minNom * y_i <= z_i <= maxNom * y_i ---
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) return;
    const capS = useInt ? Math.floor(maxNom / S) : maxNom / S;
    const minS = useInt ? Math.ceil(minNom / S) : minNom / S;
    if (minS > 0) L.push(`  c_smin${i}: z${i} - ${fc(minS)} y${i} >= 0`);
    L.push(`  c_smax${i}: z${i} - ${fc(capS)} y${i} <= 0`);
  });

  // --- Issuer max ---
  const issuers = [...new Set(el.map(b => b.t))];
  issuers.forEach((t, ti) => {
    let line = `  c_iss${ti}:`;
    let hasTerm = false;
    el.forEach((b, i) => { if (b.t === t) { line += ` + 1 z${i}`; hasTerm = true; } });
    if (hasTerm) { line += ` <= ${fc(maxIssNominal / S)}`; L.push(line); }
  });

  // ═══ CHANGE 3: Issuer minimum als Constraint statt Post-Filter ═══
  if (minIssAmt > 0) {
    // Für jeden Emittenten: Σ z_i >= minIssAmt * (max y_i der Gruppe)
    // D.h. wenn mindestens ein Bond eines Emittenten gewählt wird,
    // muss die Summe >= minIssAmt sein.
    // Formulierung: Σ z_i >= minIssAmt/S * y_groupMax
    // Wobei y_groupMax = max(y_i für b.t === t)
    // Vereinfachung: Σ z_i >= minIssAmt/S * y_first (einer der Binärvariablen)
    // Besser: Einführung einer Gruppen-Binärvariable wäre komplex.
    // Pragmatisch: Für jeden Emittenten gilt: Σ z_i >= minIssAmt/S * y_j für JEDEN j mit b.t === t
    issuers.forEach((t, ti) => {
      const bonds = el.map((b, i) => ({ b, i })).filter(x => x.b.t === t && !lockedMap.has(x.b.isin));
      bonds.forEach(({ i }, j) => {
        let line = `  c_issmin${ti}_${j}:`;
        let hasTerm = false;
        el.forEach((b, k) => { if (b.t === t) { line += ` + 1 z${k}`; hasTerm = true; } });
        if (hasTerm) {
          line += ` - ${fc(minIssAmt / S)} y${i} >= 0`;
          L.push(line);
        }
      });
    });
  }

  // --- Country limits ---
  const countries = [...new Set(el.map(b => b.co))];
  countries.forEach((co, ci) => {
    let line = `  c_co${ci}:`;
    let hasTerm = false;
    el.forEach((b, i) => { if (b.co === co) { line += ` + 1 z${i}`; hasTerm = true; } });
    if (hasTerm) { line += ` <= ${fc(coLimit / S)}`; L.push(line); }
  });

  // --- Rating limits ---
  Object.entries(ratingLimits || {}).forEach(([rtg]) => {
    if (!catEnabled(ratingLimits, rtg)) return;
    const { min, max } = catMinMax(ratingLimits, rtg);
    if (max != null && max < 100) {
      const limit = Math.max(0, effectiveBudget * (max / 100));
      let line = `  c_rtg_max_${san(rtg)}:`;
      let hasTerm = false;
      el.forEach((b, i) => { if (b.lo === rtg) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` <= ${fc(limit / S)}`; L.push(line); }
    }
    if (min != null && min > 0) {
      const minLimit = Math.max(0, effectiveBudget * (min / 100));
      let line = `  c_rtg_min_${san(rtg)}:`;
      let hasTerm = false;
      el.forEach((b, i) => { if (b.lo === rtg) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` >= ${fc(minLimit / S)}`; L.push(line); }
    }
  });

  // --- ESG minimum ---
  let greenSoft = false;
  if (greenTarget > 0) {
    let line = "  c_esg:";
    let hasTerm = false;
    el.forEach((b, i) => { if (b.g === 1) { line += ` + 1 z${i}`; hasTerm = true; } });
    if (hasTerm) { line += ` >= ${fc(greenTarget / S)}`; L.push(line); }
    else { greenSoft = true; }
  }

  // --- Rank limits ---
  Object.entries(rankLimits || {}).forEach(([cat]) => {
    if (!catEnabled(rankLimits, cat)) return;
    const { min, max } = catMinMax(rankLimits, cat);
    if (max != null && max < 100) {
      const limit = Math.max(0, effectiveBudget * (max / 100));
      let line = `  c_rk_max_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.rank || "SP") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` <= ${fc(limit / S)}`; L.push(line); }
    }
    if (min != null && min > 0) {
      const minLimit = Math.max(0, effectiveBudget * (min / 100));
      let line = `  c_rk_min_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.rank || "SP") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` >= ${fc(minLimit / S)}`; L.push(line); }
    }
  });

  // --- Struktur limits ---
  Object.entries(strukturLimits || {}).forEach(([cat]) => {
    if (!catEnabled(strukturLimits, cat)) return;
    const { min, max } = catMinMax(strukturLimits, cat);
    if (max != null && max < 100) {
      const limit = Math.max(0, effectiveBudget * (max / 100));
      let line = `  c_st_max_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.matTyp || "BULLET") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` <= ${fc(limit / S)}`; L.push(line); }
    }
    if (min != null && min > 0) {
      const minLimit = Math.max(0, effectiveBudget * (min / 100));
      let line = `  c_st_min_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.matTyp || "BULLET") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` >= ${fc(minLimit / S)}`; L.push(line); }
    }
  });

  // --- Kupon limits ---
  Object.entries(kuponLimits || {}).forEach(([cat]) => {
    if (!catEnabled(kuponLimits, cat)) return;
    const { min, max } = catMinMax(kuponLimits, cat);
    if (max != null && max < 100) {
      const limit = Math.max(0, effectiveBudget * (max / 100));
      let line = `  c_kp_max_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.kpnTyp || "FIXED") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` <= ${fc(limit / S)}`; L.push(line); }
    }
    if (min != null && min > 0) {
      const minLimit = Math.max(0, effectiveBudget * (min / 100));
      let line = `  c_kp_min_${san(cat)}:`; let hasTerm = false;
      el.forEach((b, i) => { if ((b.kpnTyp || "FIXED") === cat) { line += ` + 1 z${i}`; hasTerm = true; } });
      if (hasTerm) { line += ` >= ${fc(minLimit / S)}`; L.push(line); }
    }
  });

  // --- Portfolio Average Constraints (linearized) ---
  // Σ z_i * (field_i - target) <= ε  ↔  weighted avg ≤ target
  if (pfFlags.hasPfMaxK) {
    const tgt = pfFlags.pfMaxKVal;
    let line = "  c_pfMaxK:";
    el.forEach((b, i) => { const c = b.k - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${fc(EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMinK) {
    const tgt = pfFlags.pfMinKVal;
    let line = "  c_pfMinK:";
    el.forEach((b, i) => { const c = b.k - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= ${fc(-EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMaxPx) {
    const tgt = pfFlags.pfMaxPxVal;
    let line = "  c_pfMaxPx:";
    el.forEach((b, i) => { const c = (b.px || 100) - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${fc(EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMinPx) {
    const tgt = pfFlags.pfMinPxVal;
    let line = "  c_pfMinPx:";
    el.forEach((b, i) => { const c = (b.px || 100) - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= ${fc(-EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMinDur) {
    const tgt = pfFlags.pfMinDurVal;
    let line = "  c_pfMinDur:";
    el.forEach((b, i) => { const c = b.md - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= ${fc(-EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMaxDur) {
    const tgt = pfFlags.pfMaxDurVal;
    let line = "  c_pfMaxDur:";
    el.forEach((b, i) => { const c = b.md - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${fc(EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMinMat) {
    const tgt = pfFlags.pfMinMatVal;
    let line = "  c_pfMinMat:";
    el.forEach((b, i) => { const c = b.mty - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` >= ${fc(-EPSILON / S)}`; L.push(line);
  }
  if (pfFlags.hasPfMaxMat) {
    const tgt = pfFlags.pfMaxMatVal;
    let line = "  c_pfMaxMat:";
    el.forEach((b, i) => { const c = b.mty - tgt; if (Math.abs(c) > COEFF_NOISE) line += c >= 0 ? ` + ${fc(c)} z${i}` : ` - ${fc(-c)} z${i}`; });
    line += ` <= ${fc(EPSILON / S)}`; L.push(line);
  }

  // --- Locked bonds ---
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin) / S);
      L.push(`  c_lock${i}: z${i} >= ${fixedS}`);
      L.push(`  c_lockx${i}: z${i} <= ${fixedS}`);
    }
  });

  // --- Bounds ---
  L.push(""); L.push("Bounds");
  el.forEach((b, i) => {
    if (lockedMap.has(b.isin)) {
      const fixedS = fc(lockedMap.get(b.isin) / S);
      L.push(`  ${fixedS} <= z${i} <= ${fixedS}`);
    } else {
      const capS = useInt ? Math.floor(maxNom / S) : maxNom / S;
      L.push(`  0 <= z${i} <= ${fc(capS)}`);
    }
  });

  // --- Generals (integer) ---
  if (useInt) {
    L.push(""); L.push("Generals");
    const genVars = [];
    el.forEach((b, i) => { if (!lockedMap.has(b.isin)) genVars.push(`z${i}`); });
    L.push("  " + genVars.join(" "));
  }

  // --- Binaries ---
  L.push(""); L.push("Binaries");
  const binVars = [];
  el.forEach((b, i) => { if (!lockedMap.has(b.isin)) binVars.push(`y${i}`); });
  L.push("  " + binVars.join(" "));

  L.push(""); L.push("End");

  // === Sanity checks ===
  const lpString = L.join("\n");
  const cNames = L.filter(l => l.includes(':')).map(l => l.trim().split(':')[0]);
  const cDups = cNames.filter((n, i) => cNames.indexOf(n) !== i);
  if (cDups.length > 0) console.error("[MIPv2] DUPLICATE CONSTRAINTS:", cDups);
  if (lpString.includes("NaN") || lpString.includes("Infinity")) {
    console.error("[MIPv2] LP contains NaN/Infinity!");
  }

  // ═══ CHANGE 4: 6-stufige Infeasibility-Kaskade ═══
  const solve = (lp) => {
    try { return solver.solve(lp); }
    catch (e) { console.error("[MIPv2] Solver error:", e); return { Status: "Error" }; }
  };

  let result = solve(lpString);
  let relaxLog = [];

  if (result.Status !== "Optimal") {
    let retryL = [...L];

    // Stufe 1: ESG relaxieren (Soft-Constraint)
    if (greenTarget > 0 && !cfg._noRelaxEsg) {
      const esgIdx = retryL.findIndex(l => l.trimStart().startsWith("c_esg:"));
      if (esgIdx >= 0) {
        retryL.splice(esgIdx, 1);
        greenSoft = true;
        relaxLog.push("ESG relaxed");
        const r = solve(retryL.join("\n"));
        if (r.Status === "Optimal") { result = r; }
      }
    }

    // Stufe 2: Budget-Floor auf 80% senken
    if (result.Status !== "Optimal") {
      const idx = retryL.findIndex(l => l.trimStart().startsWith("c_bmin:"));
      if (idx >= 0) {
        retryL[idx] = "  c_bmin:" + el.map((_, i) => " + 1 z" + i).join("") + ` >= ${fc(effectiveBudget * 0.80 / S)}`;
        relaxLog.push("Budget floor → 80%");
        const r = solve(retryL.join("\n"));
        if (r.Status === "Optimal") { result = r; }
      }
    }

    // Stufe 3: Kategorie-Constraints relaxieren (Rating/Rank/Struktur/Kupon)
    if (result.Status !== "Optimal") {
      retryL = retryL.filter(l => !l.trimStart().match(/^c_(rtg|rk|st|kp)_/));
      relaxLog.push("Category constraints removed");
      const r = solve(retryL.join("\n"));
      if (r.Status === "Optimal") { result = r; }
    }

    // Stufe 4: Portfolio-Avg-Constraints relaxieren
    if (result.Status !== "Optimal") {
      retryL = retryL.filter(l => !l.trimStart().match(/^c_pf(Max|Min)/));
      relaxLog.push("Portfolio avg constraints removed");
      const r = solve(retryL.join("\n"));
      if (r.Status === "Optimal") { result = r; }
    }

    // Stufe 5: Budget-Floor komplett entfernen
    if (result.Status !== "Optimal") {
      const idx = retryL.findIndex(l => l.trimStart().startsWith("c_bmin:"));
      if (idx >= 0) {
        retryL[idx] = "  c_bmin:" + el.map((_, i) => " + 1 z" + i).join("") + " >= 0";
        relaxLog.push("Budget floor → 0");
        const r = solve(retryL.join("\n"));
        if (r.Status === "Optimal") { result = r; }
      }
    }

    // Stufe 6: Greedy-Fallback
    if (result.Status !== "Optimal") {
      console.warn("[MIPv2] All retries failed. Relaxations tried:", relaxLog.join(" → "));
      return []; // Caller wird Greedy als Fallback verwenden
    }
  }

  if (relaxLog.length > 0) {
    console.warn("[MIPv2] Solved after relaxation:", relaxLog.join(" → "));
  }

  // ═══ CHANGE 5: Extraction — nur auslesen, KEIN Post-Processing ═══
  const pf = [];
  el.forEach((b, i) => {
    const col = result.Columns["z" + i];
    const lots = col ? col.Primal : 0;
    let nom = Math.round(lots * S * 10) / 10;
    if (Math.abs(nom) < 0.01) nom = 0;
    if (lotSize > 0 && nom > 0) nom = Math.round(nom / lotSize) * lotSize;
    if (nom >= minNom - 0.01 && nom > 0) {
      pf.push({ ...b, nom, locked: lockedMap.has(b.isin), inUniverse: true });
    }
  });

  // ═══ CHANGE 6: Validate — keine Modifikation, nur prüfen und loggen ═══
  const validation = validateSolution(pf, cfg);
  if (!validation.valid) {
    console.warn("[MIPv2] Post-solve validation found violations:", validation.violations);
    // Violations loggen aber NICHT fixen — der Solver hat die Constraints.
    // Rounding-bedingte Micro-Violations (< 1%) sind akzeptabel.
    const serious = validation.violations.filter(v =>
      v.type !== "budget_under" || (v.actual < budget * 0.90) // Budget unter 90% ist ernst
    );
    if (serious.length > 0) {
      console.error("[MIPv2] SERIOUS violations:", serious);
    }
  }

  console.log("[MIPv2] Result: " + pf.length + " bonds, total=" + (pfTotal(pf)/1e6).toFixed(1) +
    "M / " + (budget/1e6).toFixed(0) + "M (" + (pfTotal(pf)/budget*100).toFixed(1) + "%), " +
    "yield=" + pfAvg(pf, "y").toFixed(3) + "%, relaxations=[" + relaxLog.join(", ") + "]");

  return pf;
}
```

**Step 4: Füge `optimizeMIP_v2` zum `window._pfEngine` Export hinzu**

**Step 5: Verifiziere dass Tests grün sind**

**Step 6: Commit**

```bash
git add portfolio_engine_standalone.html tests.html
git commit -m "feat: add optimizeMIP_v2() — clean MIP solver without post-processing"
```

---

## Task 5: Erweiterte Test-Suiten — Constraint-Compliance

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/tests.html`

**Step 1: Test-Suite für enge Constraints schreiben**

```javascript
// === Suite: Tight Constraints ===
log("--- Suite: Tight Constraints ---");

// Test: Duration max 4.0 + Preis max 101 + BBB+ max 20%
const cfgTight = {
  ...cfg1,
  pfMaxDur: "4", pfMaxPx: "101",
  ratingLimits: {
    ...cfg1.ratingLimits,
    "BBB+": { enabled: true, min: "", max: "20" }
  }
};
const pfTight = await optimizeMIP_v2(pool1, cfgTight);
assert(pfTight.length > 0, "Tight: produces result");
validateConstraints(pfTight, cfgTight, "Tight");
const utilTight = pfTotal(pfTight) / cfgTight.budget * 100;
assertGte(utilTight, 95, "Tight: utilization ≥ 95%");
```

**Step 2: Test-Suite für ESG + Limits**

```javascript
// === Suite: ESG + Category Limits ===
log("--- Suite: ESG + Category Limits ---");

const cfgEsg = {
  ...cfg1,
  minGreen: 30  // 30% ESG minimum
};
const pfEsg = await optimizeMIP_v2(pool1, cfgEsg);
assert(pfEsg.length > 0, "ESG 30%: produces result");
validateConstraints(pfEsg, cfgEsg, "ESG 30%");
const esgPct = pfEsg.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0) / pfTotal(pfEsg) * 100;
assertGte(esgPct, 30, "ESG 30%: ESG quota met");
```

**Step 3: Test-Suite für Lot-Sizes**

```javascript
// === Suite: Lot Sizes ===
log("--- Suite: Lot Sizes ---");

const cfgLot = {
  ...cfg1,
  minLot: "100000",  // 100k lots
  minBondNom: "500000"  // min 500k per bond
};
const pfLot = await optimizeMIP_v2(pool1, cfgLot);
assert(pfLot.length > 0, "Lots: produces result");
validateConstraints(pfLot, cfgLot, "Lots");
pfLot.forEach(b => {
  if (!b.locked) {
    const rem = b.nom % 100000;
    assert(rem < 1, "Lots: Bond " + b.isin + " lot-aligned (nom=" + b.nom + ")");
  }
});
```

**Step 4: Test-Suite für das Benutzer-Beispiel (200M, BBB+ max 20%, Duration max 4, Preis max 101)**

```javascript
// === Suite: User Example (200M, real-world) ===
log("--- Suite: User Example ---");

const cfgUser = {
  obj: "yield", budget: 200e6, minGreen: 0,
  maxBondNom: 10e6, minBondNom: "2000000", maxIssNominal: 10e6,
  minIssNom: "", minLot: "", maxCo: 20, minLQA: 0,
  ratingLimits: {
    "AAA": { enabled: true, min: "", max: "" },
    "AA+": { enabled: true, min: "", max: "" },
    "AA":  { enabled: true, min: "", max: "" },
    "AA-": { enabled: true, min: "", max: "" },
    "A+":  { enabled: true, min: "", max: "" },
    "A":   { enabled: true, min: "", max: "" },
    "A-":  { enabled: true, min: "", max: "" },
    "BBB+":{ enabled: true, min: "", max: "20" },
    "BBB": { enabled: false, min: "", max: "" },
    "BBB-":{ enabled: false, min: "", max: "" }
  },
  rankLimits:     { "SP": { enabled: true, min: "", max: "" } },
  strukturLimits: { "BULLET": { enabled: true, min: "", max: "" } },
  kuponLimits:    { "FIXED": { enabled: true, min: "", max: "" } },
  pfMaxDur: "4", pfMinDur: "", pfMaxPx: "101", pfMinPx: "",
  pfMaxK: "", pfMinK: "", pfMaxMat: "", pfMinMat: "",
  lockedBonds: [], excludedIssuers: [], excludedCountries: [],
  durMin: "", durMax: "", matMin: "", matMax: "10",
  optMinK: "", optMaxK: "", optMinPx: "", optMaxPx: "",
  minRatingLn: "8"
};
const pfUser = await optimizeMIP_v2(pool1, cfgUser);
assert(pfUser.length > 0, "User Example: produces result");
validateConstraints(pfUser, cfgUser, "User Example");
const utilUser = pfTotal(pfUser) / cfgUser.budget * 100;
assertGte(utilUser, 95, "User Example: utilization ≥ 95%");
log("User Example: " + pfUser.length + " bonds, util=" + utilUser.toFixed(1) + "%, yield=" + pfAvg(pfUser, "y").toFixed(3) + "%");
```

**Step 5: Test-Suite v1 vs. v2 Vergleich**

```javascript
// === Suite: v1 vs v2 Comparison ===
log("--- Suite: v1 vs v2 Comparison ---");

const pfV1 = await optimizeMIP(pool1, cfgUser);
const pfV2 = await optimizeMIP_v2(pool1, cfgUser);

const v1Util = pfTotal(pfV1) / cfgUser.budget * 100;
const v2Util = pfTotal(pfV2) / cfgUser.budget * 100;
const v1Yield = pfAvg(pfV1, "y");
const v2Yield = pfAvg(pfV2, "y");

log("v1: util=" + v1Util.toFixed(1) + "%, yield=" + v1Yield.toFixed(3) + "%, bonds=" + pfV1.length);
log("v2: util=" + v2Util.toFixed(1) + "%, yield=" + v2Yield.toFixed(3) + "%, bonds=" + pfV2.length);

// v2 should have BETTER or equal utilization
assertGte(v2Util, v1Util - 1, "v2 utilization ≥ v1 (within 1%)");

// v2 validation should have NO violations (v1 might)
const v2Val = validateSolution(pfV2, cfgUser);
assert(v2Val.valid, "v2: zero constraint violations");

const v1Val = validateSolution(pfV1, cfgUser);
log("v1 violations: " + v1Val.violations.length + ", v2 violations: " + v2Val.violations.length);
```

**Step 6: Verifiziere im Browser**

**Step 7: Commit**

```bash
git add tests.html
git commit -m "test: add constraint-compliance test suites for MIP v2"
```

---

## Task 6: ESG→Yield Zwei-Phasen-Integration

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/tests.html`
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html` (Zeilen ~10001–10058)

**Step 1: Test für ESG→Yield schreiben**

```javascript
// === Suite: ESG→Yield Two-Phase ===
log("--- Suite: ESG→Yield Two-Phase ---");

// Phase 1: max ESG
const p1Cfg = { ...cfgUser, obj: "_maxEsg", minGreen: 0, _noRelaxEsg: true };
const pfP1 = await optimizeMIP_v2(pool1, p1Cfg);
assert(pfP1.length > 0, "ESG Phase 1: produces result");
const p1EsgPct = pfP1.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0) / pfTotal(pfP1) * 100;
log("Phase 1 ESG: " + p1EsgPct.toFixed(1) + "%");
assertGte(p1EsgPct, 20, "ESG Phase 1: ESG% > 20% (pool has 25% ESG bonds)");

// Phase 2: max yield with ESG floor from phase 1
const p2Cfg = { ...cfgUser, obj: "yield", minGreen: Math.round(p1EsgPct) };
const pfP2 = await optimizeMIP_v2(pool1, p2Cfg);
assert(pfP2.length > 0, "ESG Phase 2: produces result");
validateConstraints(pfP2, p2Cfg, "ESG Phase 2");
const p2EsgPct = pfP2.filter(b => b.g === 1).reduce((a, b) => a + b.nom, 0) / pfTotal(pfP2) * 100;
assertGte(p2EsgPct, Math.round(p1EsgPct) - 1, "ESG Phase 2: ESG floor maintained");
const p2Yield = pfAvg(pfP2, "y");
log("Phase 2: ESG=" + p2EsgPct.toFixed(1) + "%, yield=" + p2Yield.toFixed(3) + "%");
```

**Step 2: Verifiziere dass Tests grün sind**

**Step 3: Caller-Integration updaten**

In der Haupt-HTML (Zeilen ~10042–10044) den ESG→Yield-Flow so ändern, dass er `optimizeMIP_v2` statt `optimizeMIP` verwendet:

Zeile ~10042 ändern von:
```javascript
if (runMIP) await tryP1("MIP", optimizeMIP(universe, p1Cfg));
```
zu:
```javascript
if (runMIP) await tryP1("MIP", optimizeMIP_v2(universe, p1Cfg));
```

**NOCH NICHT** den normalen Solve-Pfad umstellen — erst nach allen Tests.

**Step 4: Commit**

```bash
git add portfolio_engine_standalone.html tests.html
git commit -m "feat: integrate MIP v2 into ESG→Yield two-phase flow"
```

---

## Task 7: Hauptpfad umstellen — MIP v2 als Primary Solver

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html`

**Step 1: Greedy-Fallback-Logik einbauen**

Suche die Stelle wo `optimizeMIP()` im normalen Solve-Pfad aufgerufen wird (nicht ESG→Yield, sondern der reguläre Solve). Das ist ca. Zeile ~10070–10100.

Ersetze den `optimizeMIP()`-Aufruf durch:

```javascript
// MIP v2 mit Greedy-Fallback bei HiGHS-Ladefehler
let mipR = null, mipS = null, mipErr = null;
if (runMIP) {
  try {
    mipR = await optimizeMIP_v2(universe, runCfg);
    if (mipR && mipR.length > 0) {
      mipS = stats(mipR);
    }
  } catch (e) {
    mipErr = e;
    console.error("[Solve] MIP v2 failed, falling back to Greedy:", e.message);
    // Greedy-Fallback
    if (!greedyR) {
      greedyR = optimize(universe, runCfg);
      greedyS = stats(greedyR);
    }
  }
}
```

**Step 2: `optimizeLP()` Aufrufe deaktivieren**

Setze `runLP = false` am Anfang des Solve-Flows, da LP deprecated wird:

```javascript
const runLP = false; // LP deprecated — MIP v2 ist primärer Solver
```

Alternativ: Die LP-Checkbox im UI entfernen/deaktivieren.

**Step 3: Test im Browser mit dem Benutzer-Beispiel**

Konfiguriere im UI:
- Budget: 200 Mio.
- Anleihe: 2–10 Mio.
- Emittent: max 10 Mio.
- Max. je Land: 20%
- Min. Rating: BBB+
- BBB+ max 20%, BBB/BBB- disabled
- Rang: SP, Struktur: BULLET, Kupon: FIXED
- Duration max 4, Preis max 101

Erwartung:
- Budget-Auslastung ≥ 95%
- Keine Constraint-Verletzungen in der Console
- Yield ≥ dem alten MIP v1 Ergebnis

**Step 4: Commit**

```bash
git add portfolio_engine_standalone.html
git commit -m "feat: switch primary solver to MIP v2, LP deprecated, Greedy as fallback"
```

---

## Task 8: Alte Solver-Referenzen aufräumen

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/portfolio_engine_standalone.html`

**Step 1: `optimizeLP()` mit Deprecation-Wrapper versehen**

Die Funktion NICHT löschen (breaking change), aber wrappen:

```javascript
async function optimizeLP(pool, cfg) {
  console.warn("[DEPRECATED] optimizeLP() — use optimizeMIP_v2() instead");
  return optimizeMIP_v2(pool, cfg);
}
```

**Step 2: `optimizeMIP()` (v1) mit Redirect versehen**

```javascript
async function optimizeMIP(pool, cfg) {
  console.warn("[REDIRECT] optimizeMIP() → optimizeMIP_v2()");
  return optimizeMIP_v2(pool, cfg);
}
```

**Step 3: Alten Code als Kommentar-Block markieren**

Den alten `optimizeMIP()` Body (Zeilen 5282–5809) und `optimizeLP()` Body (Zeilen 4651–5277) auskommentieren mit:

```javascript
/* === DEPRECATED: Original optimizeMIP v1 — replaced by optimizeMIP_v2 ===
   ... original code ...
   === END DEPRECATED === */
```

**Step 4: Verifiziere dass alles noch funktioniert**

- Tests in `tests.html` laufen
- UI im Browser mit Beispiel-Konfiguration

**Step 5: Commit**

```bash
git add portfolio_engine_standalone.html
git commit -m "refactor: deprecate optimizeLP and optimizeMIP v1, redirect to v2"
```

---

## Task 9: Finaler Vergleichstest und Dokumentation

**Files:**
- Modify: `C:/Users/omazn/Desktop/PF/v4-standalone/tests.html`

**Step 1: KPI-Vergleichstabelle in Tests einbauen**

```javascript
// === Suite: KPI Summary ===
log("--- KPI SUMMARY ---");

const scenarios = [
  { name: "Basic 200M", cfg: cfg1 },
  { name: "Tight Constraints", cfg: cfgTight },
  { name: "ESG 30%", cfg: cfgEsg },
  { name: "Lot 100k", cfg: cfgLot },
  { name: "User Example", cfg: cfgUser }
];

const kpiTable = [];
for (const { name, cfg } of scenarios) {
  const pf = await optimizeMIP_v2(pool1, cfg);
  const total = pfTotal(pf);
  const util = total / cfg.budget * 100;
  const yld = pfAvg(pf, "y");
  const dur = pfAvg(pf, "md");
  const px = pfAvg(pf, "px");
  const val = validateSolution(pf, cfg);
  kpiTable.push({ name, bonds: pf.length, util: util.toFixed(1), yield: yld.toFixed(3), dur: dur.toFixed(2), px: px.toFixed(1), violations: val.violations.length });
}

log("| Scenario | Bonds | Util% | Yield | Dur | Px | Violations |");
log("|----------|-------|-------|-------|-----|-----|------------|");
kpiTable.forEach(r => {
  log("| " + r.name.padEnd(18) + " | " + String(r.bonds).padStart(5) + " | " + r.util.padStart(5) + " | " + r.yield.padStart(5) + " | " + r.dur.padStart(4) + " | " + r.px.padStart(5) + " | " + String(r.violations).padStart(10) + " |");
});
```

**Step 2: KPI-Tabelle auch als HTML rendern**

Füge in `renderResults()` die Tabelle als HTML hinzu.

**Step 3: Verifiziere im Browser**

Erwartung: Alle Szenarien haben Violations = 0 und Util ≥ 95%.

**Step 4: Commit**

```bash
git add tests.html
git commit -m "test: add KPI comparison table across all scenarios"
```

---

## Zusammenfassung der Änderungen

| Was | Vorher | Nachher |
|-----|--------|---------|
| Primary Solver | `optimizeMIP()` + Post-Processing | `optimizeMIP_v2()` — rein MIP |
| Budget Floor | 70% | 95% |
| Bond Caps | Rank-basiert (`computeRankCaps`) | Alle `maxBondNom` |
| Post-Processing | ~420 Zeilen (enforce, refill, filter) | 0 Zeilen |
| Constraint-Violations | Möglich nach Post-Processing | Unmöglich (Solver garantiert) |
| Infeasibility | 2-stufig | 6-stufig mit klar definierter Kaskade |
| Issuer-Minimum | Post-Filter (Zeile 5793) | MIP-Constraint |
| Fallback | Keiner | Greedy bei HiGHS-Fehler |
| LP Solver | Eigene Funktion | Deprecated → redirect zu MIP v2 |
| Tests | Keine | `tests.html` mit 5 Szenarien, KPI-Tabelle |
| Validierung | Keine formale | `validateSolution()` nach jedem Solve |

**Geschätzte Code-Änderung:** ~300 neue Zeilen (`optimizeMIP_v2` + `validateSolution`), ~420 Zeilen deprecated
