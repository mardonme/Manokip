#!/usr/bin/env bash
# Stop browsers from caching the SPA shell.
#
# Vite asset filenames carry a content hash, so /assets/* can be cached forever.
# index.html cannot: it is the file that names those assets. Served without a
# Cache-Control header (as the vhost did until now), browsers apply heuristic
# caching and a returning visitor can keep running the PREVIOUS build for hours
# after a deploy — old order form, old strings, calls to endpoints that changed.
#
#   bash deploy/fix-nginx-cache.sh [/etc/nginx/sites-available/<vhost>]
#
# Idempotent: does nothing when the rule is already there. Backs the vhost up,
# validates with `nginx -t`, and restores the backup if validation fails.
set -euo pipefail

log() { printf '[nginx] %s\n' "$*"; }

VHOST="${1:-}"
if [ -z "$VHOST" ]; then
  for candidate in /etc/nginx/sites-available/manokip.com.uz \
                   /etc/nginx/sites-available/luva.uz \
                   /etc/nginx/conf.d/manokip.com.uz.conf; do
    if [ -f "$candidate" ]; then VHOST="$candidate"; break; fi
  done
fi

if [ -z "$VHOST" ] || [ ! -f "$VHOST" ]; then
  log "vhost file not found — add this inside the server block by hand:"
  log "    location = /index.html { expires -1; }"
  exit 0
fi

if grep -qE 'location[[:space:]]*=[[:space:]]*/index\.html' "$VHOST"; then
  log "$VHOST already handles index.html caching — nothing to do"
  exit 0
fi

ANCHOR='root /opt/manokip/site/dist;'
if ! grep -qF "$ANCHOR" "$VHOST"; then
  log "could not find '$ANCHOR' in $VHOST — add this by hand inside the server block:"
  log "    location = /index.html { expires -1; }"
  exit 0
fi

BACKUP="$VHOST.bak-$(date +%Y%m%d-%H%M%S)"
cp -a "$VHOST" "$BACKUP"
log "backup: $BACKUP"

# `expires -1` emits `Cache-Control: no-cache`. Deliberately NOT `add_header`:
# an add_header at this level would drop the HSTS header inherited from the
# server block, since nginx only inherits add_header when the child has none.
BLOCK_FILE=$(mktemp)
cat > "$BLOCK_FILE" <<'EOF'

    # The SPA shell must always be revalidated: it names the hashed assets.
    location = /index.html {
        expires -1;
    }
EOF

# `sed \%…%r file` appends the block after the anchor line. The \% delimiter
# keeps the path's slashes literal, and `r` is portable across BSD and GNU sed
# (a multi-line awk -v value is not).
TMP=$(mktemp)
sed "\%$ANCHOR%r $BLOCK_FILE" "$VHOST" > "$TMP"
cat "$TMP" > "$VHOST"
rm -f "$TMP" "$BLOCK_FILE"

if nginx -t; then
  systemctl reload nginx
  log "index.html is now served with Cache-Control: no-cache ✅"
else
  cp -a "$BACKUP" "$VHOST"
  log "ERROR: nginx -t failed — the original config was restored, nothing changed"
  exit 1
fi
