# SPEngine v5 - Server-Migration & Modernisierung

**Erstellt:** 2026-04-11
**Ziel:** Monolithische Single-File-App in eine deploybare, modulare Webanwendung auf Hetzner transformieren.

---

## Uebersicht

| Phase | Titel | Abhaengigkeit | Aufwand |
|-------|-------|---------------|---------|
| 1 | Build-System & Modularisierung | - | Gross |
| 2 | Server-Setup & Deployment | Phase 1 | Mittel |
| 3 | Datenbank & Persistenz | Phase 2 | Mittel |
| 4 | Code-Qualitaet & Testing | Phase 1 | Mittel |
| 5 | CI/CD Pipeline | Phase 2 + 4 | Klein |
| 6 | Monitoring & Observability | Phase 2 | Klein |

---

## Phase 1: Build-System & Modularisierung

**Ziel:** Die 24.000-Zeilen HTML-Datei in eine modulare Vite-App aufteilen.

### 1.1 Vite-Projekt initialisieren
- `npm create vite@latest` mit React-Template
- Tailwind CSS als PostCSS-Plugin (statt Play CDN)
- Alle CDN-Abhaengigkeiten als npm-Packages installieren:
  - `react`, `react-dom` (weg von UMD)
  - `xlsx`, `jszip`, `chart.js`, `pptxgenjs`
  - `highs-js` (WASM Solver)
  - `javascript-lp-solver`
- Babel Standalone entfernen (Vite uebernimmt JSX-Transpilation)

### 1.2 Modul-Struktur erstellen
```
src/
├── main.jsx                    # Entry point (ersetzt ReactDOM.render)
├── App.jsx                     # Root component (aus Zeile 14062-23812)
├── components/
│   ├── layout/
│   │   ├── BottomNav.jsx       # Tab-Navigation
│   │   ├── Card.jsx            # Shared Card component
│   │   └── InputRow.jsx        # Form primitives
│   ├── tabs/
│   │   ├── DatenImport.jsx     # Tab 1: XLSX Upload
│   │   ├── MarktAnalyse.jsx    # Tab 2: Markt-Analyse
│   │   ├── DeepDive.jsx        # Tab 3: 12 Deep-Dive Panels
│   │   ├── Optimierer.jsx      # Tab 4: Solver UI + Frontier
│   │   ├── SzenarienVergleich.jsx
│   │   ├── PortfolioReview.jsx
│   │   ├── Reporting.jsx
│   │   ├── ExportCenter.jsx
│   │   ├── DZResearch.jsx
│   │   ├── Daten.jsx
│   │   └── Anleitung.jsx
│   ├── deepdive/
│   │   ├── DeepDiveBarometer.jsx
│   │   ├── DeepDiveConcentration.jsx
│   │   ├── DeepDiveCurve.jsx
│   │   └── ... (12 Panels)
│   ├── scenario/
│   │   ├── ScenarioKpiGrid.jsx
│   │   ├── ScenarioCompareTable.jsx
│   │   └── ... (9 Komponenten)
│   ├── tables/
│   │   ├── BondTable.jsx
│   │   ├── IssuerTable.jsx
│   │   └── RVHeatmap.jsx
│   └── modals/
│       ├── BondDetailModal.jsx
│       ├── IssuerDetailModal.jsx
│       └── PresetEditModal.jsx
├── solver/
│   ├── highs.js                # HiGHS WASM Loader + Solve
│   ├── lpSolver.js             # javascript-lp-solver Wrapper
│   ├── mipV2.js                # optimizeMIP_v2
│   ├── greedy.js               # greedyOptimize
│   ├── lexicographic.js        # solveLexicographic
│   ├── autoOptimize.js         # runAutoOptimize (7 Phasen)
│   ├── frontier.js             # computeQuickFrontier
│   └── filterPool.js           # Investment-Policy-Filter
├── data/
│   ├── dzIssuers.js            # DZ_ISSUERS Array (183 Eintraege)
│   ├── dzSpreadBonds.js        # DZ_SPREAD_BONDS Array (912 Bonds)
│   ├── ratings.js              # RM, RS, LBL Maps
│   ├── countries.js            # CO, CN Maps
│   ├── objectives.js           # OBJ Labels
│   └── presets.js              # DEFAULT_PRESETS
├── utils/
│   ├── format.js               # fx(), deutsche Zahlenformatierung
│   ├── stats.js                # stats(pf), getIssuerStats(pf)
│   ├── storage.js              # lsSave, lsLoad, lsRemove (localStorage)
│   ├── excel.js                # xlsxSheet, xlsxDownload Helpers
│   └── session.js              # Session Import/Export
├── hooks/
│   ├── useSolver.js            # Solver State + Solve-Trigger
│   ├── useLocalStorage.js      # Persistenz-Hook
│   └── useUniverse.js          # Bond-Universe State
└── styles/
    ├── index.css               # CSS Custom Properties (--spark-*, --fs-*)
    └── tailwind.css            # Tailwind Directives
```

### 1.3 Migration durchfuehren
1. Vite-Projekt aufsetzen, Dependencies installieren
2. CSS extrahieren (Zeilen 24-436) → `styles/index.css`
3. Daten-Konstanten extrahieren → `data/*.js`
4. Utility-Funktionen extrahieren → `utils/*.js`, `solver/*.js`
5. React-Komponenten einzeln auslagern (Bottom-up: Primitives → Tabs → App)
6. `ReactDOM.render()` → `createRoot()` (React 18 API)
7. Verifizieren: `npm run dev` startet und alle Features funktionieren

### 1.4 Risiken
- **WASM-Loading**: HiGHS WASM muss mit Vite korrekt gebundelt werden (ggf. `vite-plugin-wasm`)
- **Globale Variablen**: Alle impliziten Globals muessen als explizite Imports umgeschrieben werden
- **Inline-Daten**: 912 Bonds als JS-Modul koennen den Build verlangsamen

---

## Phase 2: Server-Setup & Deployment (Hetzner)

**Ziel:** App auf dem Hetzner-Server deployen, ueber HTTPS erreichbar.

### 2.1 Hetzner-Server vorbereiten
- Docker + Docker Compose installieren
- Firewall: nur 80/443/22 offen
- Domain/Subdomain auf Server-IP zeigen (DNS A-Record)

### 2.2 Docker-Setup
```
docker/
├── docker-compose.yml
├── Dockerfile              # Multi-stage: Node Build → Nginx Serve
├── nginx.conf              # Reverse Proxy + SPA Routing + Gzip
└── .env.example
```

**Dockerfile (Multi-Stage):**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 2.3 HTTPS mit Let's Encrypt
- Traefik oder Caddy als Reverse Proxy (automatische TLS-Zertifikate)
- Alternativ: nginx-proxy + acme-companion Container

### 2.4 docker-compose.yml
```yaml
services:
  app:
    build: .
    restart: unless-stopped
  
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

volumes:
  caddy_data:
```

### 2.5 Deployment-Workflow
1. `git push` auf Hetzner (bare repo mit post-receive hook)
2. Hook: `docker compose build && docker compose up -d`
3. Zero-Downtime durch Rolling Update

---

## Phase 3: Datenbank & Persistenz

**Ziel:** Szenarien, Portfolios und Einstellungen serverseitig speichern statt in localStorage.

### 3.1 Technologie-Entscheidung
- **SQLite** (via `better-sqlite3`) fuer Einzelserver-Setup
- Alternative: **PostgreSQL** Container falls Multi-User spaeter kommt
- **Empfehlung: SQLite** — einfach, kein Extra-Container, ausreichend fuer Sparkassen-Einzelinstanz

### 3.2 API-Layer (Express/Fastify)
```
server/
├── index.js                # Express Server
├── routes/
│   ├── scenarios.js        # CRUD: /api/scenarios
│   ├── portfolios.js       # CRUD: /api/portfolios
│   ├── presets.js           # CRUD: /api/presets
│   └── universe.js         # POST /api/universe/upload (XLSX)
├── db/
│   ├── schema.sql
│   └── database.js         # SQLite Connection
└── middleware/
    └── errorHandler.js
```

### 3.3 Datenmodell
```sql
CREATE TABLE scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    config JSON NOT NULL,          -- Optimizer-Config als JSON
    result JSON,                   -- Portfolio-Ergebnis
    stats JSON,                    -- KPI-Statistiken
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    config JSON NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE universe_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bonds JSON NOT NULL,           -- Bond-Array als JSON
    source_file TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 Migration localStorage → API
- `lsSave`/`lsLoad` durch API-Calls ersetzen (fetch wrapper)
- Fallback auf localStorage bei Netzwerk-Fehler (Offline-Modus)
- Einmalige Migration bestehender localStorage-Daten beim ersten Server-Login

### 3.5 Docker-Erweiterung
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    volumes:
      - db_data:/app/data          # SQLite-Datei persistent
    restart: unless-stopped

volumes:
  db_data:
```

---

## Phase 4: Code-Qualitaet & Testing

**Ziel:** TypeScript einfuehren, Tests schreiben, Fehler besser tracken.

### 4.1 TypeScript Migration
- `tsconfig.json` mit `strict: true`
- Schrittweise: `.jsx` → `.tsx` (erst Utils/Solver, dann Components)
- Typen definieren fuer:
  - `Bond` Interface (isin, emittent, y, s, d, k, p, rw, esg, ...)
  - `Config` Interface (budget, objective, constraints)
  - `Stats` Interface (wY, wS, wD, wLn, gP, ...)
  - `Scenario` Interface

### 4.2 Testing
- **Vitest** (nativ mit Vite)
- Unit-Tests fuer Solver-Funktionen:
  - `filterPool` mit verschiedenen Constraint-Kombinationen
  - `stats()` Berechnung
  - `greedyOptimize` Ergebnis-Validierung
  - Rating-Maps (`RM`, `RS`) Konsistenz
- Integration-Tests fuer XLSX Import/Export
- **Kein E2E-Framework** in Phase 1 (spaeter Playwright)

### 4.3 Linting & Formatting
- ESLint mit `@typescript-eslint`
- Prettier (konsistente Formatierung)
- Husky + lint-staged (Pre-Commit Hooks)

### 4.4 Error Tracking
- Sentry Free Tier (oder self-hosted auf Hetzner)
- React Error Boundary um `<App>`
- Solver-Fehler strukturiert loggen

---

## Phase 5: CI/CD Pipeline

**Ziel:** Automatisiertes Build, Test & Deploy bei jedem Push.

### 5.1 GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - SSH auf Hetzner
      - git pull && docker compose up -d --build
```

### 5.2 Staging-Umgebung
- Zweiter Docker-Stack auf Port 8080 (oder staging.domain.de)
- Automatisches Deploy von `develop`-Branch

---

## Phase 6: Monitoring & Observability

**Ziel:** Wissen was auf dem Server passiert.

### 6.1 Uptime Monitoring
- Uptime Kuma (self-hosted auf Hetzner) oder Betterstack Free
- Health-Check Endpoint: `GET /api/health`

### 6.2 Logging
- Structured JSON Logging (pino/winston)
- Docker Logs mit `docker compose logs -f`
- Optional: Loki + Grafana Stack

### 6.3 Backup
- SQLite: taegliches Backup via Cron → Hetzner Storage Box
- Docker Volumes: Snapshot-Backup

---

## Empfohlene Reihenfolge

```
Phase 1 (Build + Module)
    ├── Phase 2 (Hetzner Deploy)     ← App ist online
    │       └── Phase 3 (Datenbank)  ← Persistenz serverseitig
    └── Phase 4 (TypeScript/Tests)   ← parallel zu Phase 2
            └── Phase 5 (CI/CD)      ← automatisiertes Deploy
                    └── Phase 6 (Monitoring)
```

**Quick Win:** Falls die App sofort auf dem Server laufen soll, kann Phase 2 auch *vor* Phase 1 gemacht werden — die aktuelle HTML-Datei einfach per Nginx als Static File serven. Dann schrittweise modernisieren.

---

## Quick-Start Alternative (sofort deployen)

Falls du die App **jetzt** auf Hetzner haben willst, ohne Refactoring:

```bash
# Auf Hetzner:
mkdir -p /opt/spengine
scp tests/test_lexicographic.html server:/opt/spengine/index.html

# docker-compose.yml
services:
  web:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./:/usr/share/nginx/html:ro
    restart: unless-stopped
```

Das bringt die App in 5 Minuten online. Die Modernisierung (Phase 1-6) kann danach schrittweise erfolgen.
