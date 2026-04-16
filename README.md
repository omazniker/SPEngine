# SPEngine — Portfolio Engine v5

Bond-Portfolio-Optimierer mit Single-File React-Frontend, Node/Express-API und
SQLite-Persistenz. Deployt via Docker hinter Caddy (HTTPS) und nginx-brotli
(Static-Serving mit `.br`/`.gz`).

## Architektur

```
 Browser
    │  HTTPS
    ▼
 caddy (:443 / :80)         <-- docker-caddy-1
    │
    ├──► /api/*  ──► api    <-- docker-api-1 (Express, :3001)
    │                   │
    │                   └──► SQLite volume (db_data)
    │                   └──► /opt/spengine/data  (read-only)
    │
    └──► /*      ──► app    <-- docker-app-1 (nginx-brotli)
                        │
                        ├──► index.html (+ .br/.gz)
                        ├──► /assets   (React, HiGHS-wasm, xlsx, chart.js ...)
                        ├──► /data/universum_neu.xlsx
                        └──► /test
```

Alle Services in `docker/docker-compose.yml`.

## Repository-Layout

```
/
├── index.html                  # Single-File React-App (~2.6 MB, deployed)
├── assets/                     # Vendor-Libs (React, HiGHS-wasm, xlsx, chart.js, pptxgen, tailwind)
├── data/
│   ├── universum_neu.xlsx             # Bond-Universum (Stand des Deploys)
│   ├── masterliste_universum_mapping.py
│   └── positivliste_dz_bank_financials.txt
├── server/                     # Express-API
│   ├── index.js
│   ├── db/{database.js,schema.sql}
│   ├── middleware/{errorHandler.js,requestLogger.js}
│   └── routes/{files,presets,scenarios,sessions,settings,universe}.js
├── docker/
│   ├── docker-compose.yml
│   ├── Caddyfile               # HTTPS + reverse proxy
│   ├── nginx.conf              # brotli_static + gzip_static
│   ├── deploy.sh               # rebuild + .br/.gz Kompression
│   └── backup.sh               # SQLite snapshot
├── Dockerfile                  # app-image (nicht mehr genutzt — ersetzt durch fholzer/nginx-brotli)
├── Dockerfile.api              # api-image
├── src/                        # (v5 Vite-Modularisierung, WIP)
├── tests/                      # Vitest-Setup
├── test/                       # gebündelte Test-App (an nginx gemountet)
├── tools/
├── docs/
├── CLAUDE.md                   # Projektregeln
└── README.md
```

## Voraussetzungen

- Docker & Docker Compose
- Caddy erreichbar auf :80/:443 (für ACME)
- Domain konfiguriert in `docker/Caddyfile`
- Node 20+ (nur für lokale Entwicklung des Frontends/der API außerhalb von Docker)

## Deployment

### Initialer Deploy

```bash
cd docker
docker compose build
docker compose up -d
```

### Frontend-Update (häufiger Fall)

Die App ist `index.html`. Nach Änderungen:

```bash
# Quelle liegt auf Entwicklungsmaschine; ins Repo-Root kopieren:
cp /pfad/zur/portfolio_engine.html ./index.html

# Prekomprimierte Varianten regenerieren (nginx liefert sie automatisch):
gzip -c index.html > index.html.gz
brotli -f index.html -o index.html.br
```

Der App-Container mountet die drei Dateien read-only — kein Rebuild nötig.
`.br`/`.gz`/`logs/` sind in `.gitignore` (werden beim Deploy erzeugt).

### API-Update

```bash
cd docker
docker compose build api
docker compose up -d api
```

### Backup

```bash
bash docker/backup.sh     # SQLite-Snapshot aus db_data-Volume
```

## Lokale Entwicklung

### Frontend (Single-File)

`index.html` im Browser öffnen — die Datei ist self-contained (alle Libs in
`/assets`, per relativem Pfad geladen).

### API

```bash
cd server
npm install
npm start                 # Port 3001, erwartet DB_PATH env
```

### v5 (Vite-Modularisierung)

`src/` enthält die laufende Migration auf Vite + modulare React-Komponenten.
Noch nicht deployt — das Produktionsfrontend bleibt bis auf Weiteres `index.html`.

```bash
npm install
npm run dev
npm run test
npm run build
```

## Datenquellen

- `data/universum_neu.xlsx` — Bond-Universum (1.643 Bonds), read-only ins api
  gemountet. Wöchentliches Update geplant.
- `data/positivliste_dz_bank_financials.txt` — DZ-Bank-Financials-Whitelist.
- `data/masterliste_universum_mapping.py` — Mapping-Script (Offline).

## Features der App

- Portfolio-Optimierung: Greedy-Solver (JS) + MIP (HiGHS-wasm)
- 12 Deep-Dive-Panels (Laufzeit, Rating, Sektor, Land, ESG, …)
- 9 Szenario-Vergleichspanels
- Report-Export (PPTX via pptxgen, XLSX via SheetJS)
- Deutsches Zahlenformat (Dezimalkomma)
- Session-Persistenz via API (`/api/sessions`, `/api/scenarios`, `/api/presets`)

## Lizenz / Daten

Interne Nutzung. Bloomberg-basierte Rohdaten werden **nicht** eingecheckt —
nur das abgeleitete `universum_neu.xlsx`.
