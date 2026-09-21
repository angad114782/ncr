#!/usr/bin/env bash
# One-time: makes nginx send /api and /uploads to the backend.
#   bash /var/www/propertyinncr.com/deploy/setup-nginx.sh
#
# It finds the nginx config of propertyinncr.com, backs it up, adds
#     include /var/www/propertyinncr.com/deploy/nginx-api.snippet.conf;
# inside the HTTPS server block (before `location / {`), runs `nginx -t`, and reloads. If `nginx -t` fails the
# backup is put back, so the site is never left broken. Safe to run again: it does nothing if the line is there.
set -euo pipefail

APP="${APP:-/var/www/propertyinncr.com}"
SNIPPET="$APP/deploy/nginx-api.snippet.conf"
SUDO=""
[ "$(id -u)" != "0" ] && SUDO="sudo"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$SNIPPET" ] || die "$SNIPPET not found. Deploy first (git pull) so the file exists on the server."
command -v python3 >/dev/null 2>&1 || die "python3 is needed for this script (apt install python3), or add the include line by hand."

PORT=$(grep -E '^[[:space:]]*PORT=' "$APP/backend/.env" 2>/dev/null | head -1 | sed -E 's/^[^=]*=[[:space:]]*([0-9]+).*/\1/' || true)
PORT="${PORT:-5010}"
say "Backend port from backend/.env: $PORT"
if ! grep -q "127.0.0.1:$PORT" "$SNIPPET"; then
  echo "WARNING: $SNIPPET proxies to a different port than $PORT. Edit the two proxy_pass lines to http://127.0.0.1:$PORT and run this again."
fi

say "Is the backend answering on 127.0.0.1:$PORT ?"
if curl -fsS "http://127.0.0.1:$PORT/api/health"; then echo; else
  echo "The API is NOT answering. Check:  pm2 status   and   pm2 logs ncr-api --lines 40"
fi

say "Looking for the nginx config of propertyinncr.com"
FILES=$(grep -RlE "server_name[^;]*propertyinncr\.com" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | sort -u || true)
[ -n "$FILES" ] || FILES=$(grep -lE "server_name[^;]*propertyinncr\.com" /etc/nginx/nginx.conf 2>/dev/null || true)
[ -n "$FILES" ] || die "No nginx config mentions propertyinncr.com. Find it with:  grep -rn propertyinncr /etc/nginx"

if grep -Rq "nginx-api.snippet.conf" /etc/nginx 2>/dev/null; then
  say "The include line is already there ($(grep -Rl 'nginx-api.snippet.conf' /etc/nginx | tr '\n' ' '))"
else
  for F in $FILES; do
    REAL=$(readlink -f "$F")
    BACKUP="$REAL.bak-$(date +%Y%m%d%H%M%S)"
    say "Editing $REAL (backup: $BACKUP)"
    $SUDO cp "$REAL" "$BACKUP"
    TMP=$(mktemp)
    python3 - "$REAL" "$SNIPPET" "$TMP" <<'PY'
import re, sys
src, snippet, out = sys.argv[1:4]
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

include = f'include {snippet};'
inserts = []
for s, e in targets:
    loc = next((j for j in range(s, e + 1) if re.match(r'^\s*location\s+/\s*\{', strip(lines[j]))), None)
    at = loc if loc is not None else e
    indent = re.match(r'^(\s*)', lines[at]).group(1) if loc is not None else '    '
    inserts.append((at, [f'{indent}# backend API + uploads (added by deploy/setup-nginx.sh)', f'{indent}{include}', '']))
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
      echo "nginx -t FAILED — restoring the backup." >&2
      $SUDO cp "$BACKUP" "$REAL"
      die "Nothing was changed. Send me the nginx -t message above."
    fi
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
echo
echo "Done. Try the admin login again: https://propertyinncr.com"
