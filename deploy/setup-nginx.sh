#!/usr/bin/env bash
# One-time (safe to repeat): sets nginx up for the site — /api and /uploads to the backend, www → non-www redirect,
# and gzip for JavaScript / CSS (see deploy/nginx-*.snippet.conf).
#   bash /var/www/propertyinncr.com/deploy/setup-nginx.sh
#
# It finds the nginx config of propertyinncr.com, backs it up, adds
#     include /var/www/propertyinncr.com/deploy/nginx-api.snippet.conf;
# inside the HTTPS server block (before `location / {`), runs `nginx -t`, and reloads. If `nginx -t` fails the
# backup is put back, so the site is never left broken. Safe to run again: it only adds the lines that are missing.
set -euo pipefail

APP="${APP:-/var/www/propertyinncr.com}"
SNIPPET="$APP/deploy/nginx-api.snippet.conf"
SITE_SNIPPET="$APP/deploy/nginx-site.snippet.conf"
SUDO=""
[ "$(id -u)" != "0" ] && SUDO="sudo"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$APP/deploy/nginx-api.snippet.conf.template" ] || die "$APP/deploy/nginx-api.snippet.conf.template not found. Deploy first (git pull) so the files exist on the server."
command -v python3 >/dev/null 2>&1 || die "python3 is needed for this script (apt install python3), or add the include line by hand."

PORT=$(grep -E '^[[:space:]]*PORT=' "$APP/backend/.env" 2>/dev/null | head -1 | sed -E 's/^[^=]*=[[:space:]]*([0-9]+).*/\1/' || true)
PORT="${PORT:-5120}"
say "Backend port from backend/.env: $PORT"

say "Is it OUR backend that answers on 127.0.0.1:$PORT ?"
HEALTH=$(curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"service":"ncr-api"'; then
  echo "Yes: $HEALTH"
else
  echo "NO. Answer on that port: ${HEALTH:-(nothing)}"
  echo "Who listens on port $PORT:"; $SUDO ss -ltnp 2>/dev/null | grep ":$PORT " || echo "  (nobody)"
  echo
  echo "Either another program uses port $PORT (pick a free port: set PORT=… in backend/.env, then  pm2 restart ncr-api --update-env),"
  echo "or ncr-api is not running (pm2 status;  pm2 logs ncr-api --lines 40).  Fix that first, then run this script again."
  exit 1
fi

say "Generating the nginx snippet for port $PORT"
APP="$APP" bash "$APP/deploy/render-nginx-snippet.sh"

say "Looking for the nginx config of propertyinncr.com"
FILES=$(grep -RlE "server_name[^;]*propertyinncr\.com" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | sort -u || true)
[ -n "$FILES" ] || FILES=$(grep -lE "server_name[^;]*propertyinncr\.com" /etc/nginx/nginx.conf 2>/dev/null || true)
[ -n "$FILES" ] || die "No nginx config mentions propertyinncr.com. Find it with:  grep -rn propertyinncr /etc/nginx"

# Which include lines are still missing?  api = /api + /uploads · site = www→apex redirect + charset · speed = gzip for JS/CSS.
# Each one is added on its own, tested with `nginx -t` and rolled back alone if nginx refuses it (for example because the
# server block already has that setting) — so one problem never blocks the others.
MISSING=""
for NAME in api site speed; do
  [ -f "$APP/deploy/nginx-$NAME.snippet.conf" ] && ! grep -Rq "nginx-$NAME.snippet.conf" /etc/nginx 2>/dev/null && MISSING="$MISSING $APP/deploy/nginx-$NAME.snippet.conf"
done

FAILED=""
if [ -z "$MISSING" ]; then
  say "The include lines are already there ($(grep -Rl 'nginx-.*snippet.conf' /etc/nginx | tr '\n' ' '))"
else
  for SN in $MISSING; do
    for F in $FILES; do
      REAL=$(readlink -f "$F")
      BACKUP="$REAL.bak-$(date +%Y%m%d%H%M%S)"
      say "Adding $(basename "$SN") to $REAL (backup: $BACKUP)"
      $SUDO cp "$REAL" "$BACKUP"
      TMP=$(mktemp)
      python3 - "$REAL" "$TMP" "$SN" <<'PY'
import os, re, sys
src, out, *snippets = sys.argv[1:]
lines = open(src, encoding='utf8').read().split('\n')
strip = lambda l: re.sub(r'#.*$', '', l)

# find top-level `server { ... }` blocks (start line, end line)
blocks, depth, start = [], 0, None
for i, l in enumerate(lines):
    code = strip(l)
    if start is None and re.match(r'^\s*server\s*\{', code):
        start, base = i, depth
    depth += code.count('{') - code.count('}')
    if start is not None and depth <= base:
        blocks.append((start, i)); start = None

def info(b):
    text = '\n'.join(strip(x) for x in lines[b[0]:b[1] + 1])
    return {
        'name': re.search(r'server_name[^;]*propertyinncr\.com', text) is not None,
        'ssl': re.search(r'listen\s+[^;]*(443|ssl)', text) is not None,
        'redirect_only': re.search(r'location\s+/\s*\{', text) is None and re.search(r'return\s+30[12]', text) is not None,
    }

mine = [(b, info(b)) for b in blocks if info(b)['name']]
targets = [b for b, i in mine if i['ssl']] or [b for b, i in mine if not i['redirect_only']]
if not targets:
    sys.exit('no suitable server block found (only a redirect block?)')

includes = [f'include {sn};' for sn in snippets]
inserts = []
for s, e in targets:
    loc = next((j for j in range(s, e + 1) if re.match(r'^\s*location\s+/\s*\{', strip(lines[j]))), None)
    at = loc if loc is not None else e
    indent = re.match(r'^(\s*)', lines[at]).group(1) if loc is not None else '    '
    inserts.append((at, [f'{indent}# {os.path.basename(snippets[0])} (added by deploy/setup-nginx.sh)'] + [f'{indent}{inc}' for inc in includes] + ['']))
for at, new in sorted(inserts, reverse=True):
    lines[at:at] = new
open(out, 'w', encoding='utf8').write('\n'.join(lines))
print(f'inserted into {len(targets)} server block(s)')
PY
      $SUDO cp "$TMP" "$REAL"
      rm -f "$TMP"
      if $SUDO nginx -t 2>&1; then
        echo "nginx config is valid."
      else
        echo "nginx -t FAILED for $(basename "$SN") — restoring the backup (nothing changed by this step)." >&2
        $SUDO cp "$BACKUP" "$REAL"
        FAILED="$FAILED $(basename "$SN")"
      fi
    done
  done
fi

say "Reloading nginx"
$SUDO nginx -t
$SUDO systemctl reload nginx 2>/dev/null || $SUDO nginx -s reload

say "Testing through nginx"
sleep 1
BODY=$(curl -sk --max-time 15 -H 'Host: propertyinncr.com' https://127.0.0.1/api/health || true)
if echo "$BODY" | grep -q '"status":"ok"'; then
  echo "OK — /api reaches the backend: $BODY"
else
  echo "Not working yet. nginx answered: $(echo "$BODY" | head -c 150)"
  echo "Check: pm2 status; pm2 logs ncr-api --lines 40; and that the include line is inside the HTTPS server block."
  exit 1
fi

say "www → apex redirect"
WWW=$(curl -sk --max-time 15 -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Host: www.propertyinncr.com' https://127.0.0.1/ || true)
case "$WWW" in
  "301 https://propertyinncr.com/"*) echo "OK — www.propertyinncr.com redirects to https://propertyinncr.com/ ($WWW)" ;;
  *) echo "Note: www did not redirect (got: $WWW). Check that nginx-site.snippet.conf is included in the HTTPS server block." ;;
esac

say "Compression of JavaScript / CSS"
ASSET=$(ls "$APP"/dist/assets/*.js 2>/dev/null | head -1 || true)
if [ -n "$ASSET" ]; then
  ENC=$(curl -sk --max-time 15 -o /dev/null -D - -H 'Host: propertyinncr.com' -H 'Accept-Encoding: gzip' "https://127.0.0.1/assets/$(basename "$ASSET")" | grep -i '^content-encoding' || true)
  case "$ENC" in
    *gzip*) echo "OK — JavaScript is sent compressed ($ENC)" ;;
    *) echo "Note: JavaScript is still sent uncompressed. Check that nginx-speed.snippet.conf is included in the HTTPS server block." ;;
  esac
fi

if [ -n "$FAILED" ]; then
  echo
  echo "Some steps were refused by nginx and rolled back:$FAILED"
  echo "Send me the 'nginx -t FAILED' message above (usually the server block already has the same setting)."
  exit 1
fi
echo
echo "Done. Try the admin login again: https://propertyinncr.com"
