#!/bin/bash
# SPEngine v5 — Deploy auf Hetzner
# Verwendung: ./deploy.sh <server-ip> [domain]

set -e

SERVER=${1:?"Fehler: Server-IP angeben, z.B. ./deploy.sh 123.45.67.89 spengine.example.de"}
DOMAIN=${2:-""}
REMOTE_DIR="/opt/spengine"

echo "=== SPEngine v5 Deploy auf $SERVER ==="

# 1. Docker auf Server installieren (falls noetig)
echo "[1/5] Pruefe Docker Installation..."
ssh root@$SERVER "command -v docker >/dev/null 2>&1 || {
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo 'Docker installiert!'
}"

# 2. Projekt-Repo auf Server synchronisieren
echo "[2/5] Synchronisiere Projekt..."
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.planning' \
    --exclude='.claude' \
    --exclude='output' \
    --exclude='tools/node_modules' \
    --exclude='data/__pycache__' \
    . root@$SERVER:$REMOTE_DIR/

# 3. Domain konfigurieren (falls angegeben)
if [ -n "$DOMAIN" ]; then
    echo "[3/5] Konfiguriere Domain: $DOMAIN"
    ssh root@$SERVER "cat > $REMOTE_DIR/docker/Caddyfile << CADDYEOF
$DOMAIN {
    handle /api/* {
        reverse_proxy api:3001
    }
    handle {
        reverse_proxy app:80
    }
}
CADDYEOF"
else
    echo "[3/5] Keine Domain angegeben, nutze HTTP..."
fi

# 4. Container bauen und starten
echo "[4/5] Baue und starte Container..."
ssh root@$SERVER "cd $REMOTE_DIR/docker && docker compose up -d --build"

# 5. Health Check
echo "[5/5] Health Check..."
sleep 3
if [ -n "$DOMAIN" ]; then
    URL="https://$DOMAIN"
else
    URL="http://$SERVER"
fi
STATUS=$(ssh root@$SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:80" 2>/dev/null || echo "000")

echo ""
echo "=== Deploy abgeschlossen ==="
echo "Status: HTTP $STATUS"
if [ -n "$DOMAIN" ]; then
    echo "App:    https://$DOMAIN"
    echo "API:    https://$DOMAIN/api/health"
    echo "(DNS A-Record muss auf $SERVER zeigen)"
else
    echo "App:    http://$SERVER"
    echo "API:    http://$SERVER/api/health"
    echo "HTTPS:  ./deploy.sh $SERVER deine-domain.de"
fi
