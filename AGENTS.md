# AGENTS.md — SPEngine

## Repo

- GitHub: `omazniker/SPEngine` — Remote ist bereits auf `git@github-spengine:omazniker/SPEngine.git` gesetzt.
- Push/Pull: normales `git push` / `git pull` reicht. Der SSH-Host-Alias `github-spengine` (konfiguriert in `~/.ssh/config`) leitet auf `github.com` und nutzt den Deploy-Key `~/.ssh/github_spengine` mit Write-Access.
- **Nicht** die Remote-URL auf `git@github.com:...` zurückändern — das würde den falschen Key (`github_openclaw`) ziehen.

## Arbeitsdatei / Deploy

- Arbeitsdatei: `/opt/spengine/index.html` (Single-File React-App, ~2.6 MB).
- Deploy: `spengine-deploy` (Script in `/usr/local/bin/`) erzeugt `.gz` + `.br` neben der HTML. Nginx liefert die komprimierten Varianten via `brotli_static` / `gzip_static`.
- `.gz`/`.br` sind per `.gitignore` vom Repo ausgeschlossen — NICHT commiten.

## API-Server

Express-Backend in `server/` (Container `docker-api-1`, Port 3001). SQLite-DB im Docker-Volume `db_data`. Read-only Daten-Mount: `/opt/spengine/data/` → `/app/data`.

## Historie

Am 2026-04-17 aufgeräumt: `app/portfolio_engine_standalone.html`, `test/`, `tests/test_lexicographic.html` nach `/root/archive/spengine-cleanup-20260417/` verschoben (siehe Commit `0b9b4fa`). Das alte Repo `omazniker/Portfolio` wurde gelöscht — nicht mehr referenzieren.
