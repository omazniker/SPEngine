# Projektregeln

## Arbeitsdatei
Die Arbeitsdatei der App ist `index.html` (im Repo-Root; Single-File React-App, ~2.6 MB).

Quelle auf Entwicklungsmaschine: `/root/PortfolioEngine/SPEngine/portfolio_engine.html`.
Deployment-Kopie: `/opt/spengine/index.html` (dieser Pfad im Repo).

## Deploy-Prozedur
Nach Änderungen an `index.html` auf dem Server alle drei Schritte:

```bash
cp /root/PortfolioEngine/SPEngine/portfolio_engine.html /opt/spengine/index.html
gzip -c /opt/spengine/index.html > /opt/spengine/index.html.gz
brotli -f /opt/spengine/index.html -o /opt/spengine/index.html.br
```

Nginx (Container `docker-app-1`) nutzt `brotli_static on` + `gzip_static on` und
liefert `.br`/`.gz` statt `index.html`. Ohne Neukomprimierung sehen Nutzer alte
Versionen.

## Was NICHT bearbeitet wird
- `tests/test_lexicographic.html` (Legacy-Testdatei, nicht deployt)
- `app/portfolio_engine_standalone.html` (historischer Snapshot)
- Kompilate `index.html.gz`, `index.html.br` — werden vom Deploy-Skript erzeugt

## API-Server
Express-Backend in `server/` (Container `docker-api-1`, Port 3001).
SQLite-DB in Docker-Volume `db_data`, Datei `/app/db/spengine.sqlite`.
Read-only Datenordner: `/opt/spengine/data/` → `/app/data`.
