#!/usr/bin/env bash
# Builds deploy/nginx-api.snippet.conf from the template, using PORT from backend/.env.
#   bash deploy/render-nginx-snippet.sh            (the deploy and setup-nginx.sh run it for you)
set -euo pipefail
APP="${APP:-/var/www/propertyinncr.com}"
PORT=$(grep -E '^[[:space:]]*PORT=' "$APP/backend/.env" 2>/dev/null | head -1 | sed -E 's/^[^=]*=[[:space:]]*([0-9]+).*/\1/' || true)
PORT="${PORT:-5120}"
sed "s/__PORT__/$PORT/g" "$APP/deploy/nginx-api.snippet.conf.template" > "$APP/deploy/nginx-api.snippet.conf"
echo "nginx-api.snippet.conf generated (proxy → 127.0.0.1:$PORT)"
