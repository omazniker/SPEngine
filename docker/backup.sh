#!/bin/bash
# SPEngine — Taegliches SQLite Backup
# Einrichten via crontab: 0 3 * * * /opt/spengine/docker/backup.sh

BACKUP_DIR="/opt/spengine/backups"
DB_VOLUME="docker_db_data"
DATE=$(date +%Y-%m-%d_%H%M)
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# SQLite aus Docker Volume kopieren
CONTAINER=$(docker compose -f /opt/spengine/docker/docker-compose.yml ps -q api 2>/dev/null)
if [ -n "$CONTAINER" ]; then
  docker cp "$CONTAINER:/app/db/spengine.sqlite" "$BACKUP_DIR/spengine_${DATE}.sqlite"
  echo "[Backup] $(date): spengine_${DATE}.sqlite erstellt"
else
  echo "[Backup] $(date): API-Container nicht gefunden"
  exit 1
fi

# Alte Backups loeschen
find "$BACKUP_DIR" -name "spengine_*.sqlite" -mtime +$KEEP_DAYS -delete
echo "[Backup] Backups aelter als $KEEP_DAYS Tage geloescht"

# Optional: Auf Hetzner Storage Box kopieren
# scp "$BACKUP_DIR/spengine_${DATE}.sqlite" u123456@u123456.your-storagebox.de:backups/
