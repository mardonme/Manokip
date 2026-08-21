#!/usr/bin/env bash
# Restore production from a backup made by deploy/backup.sh.
#
#   bash deploy/restore.sh                       # list available backups
#   bash deploy/restore.sh <file-db.sql.gz>      # restore that one (asks to confirm)
#   bash deploy/restore.sh <file> --yes          # no prompt (for scripts)
#
# Order of operations is deliberate: take a fresh safety backup FIRST, stop the
# API so nothing writes mid-restore, load the dump, restore the matching
# uploads, start the API again and wait for it to answer /api/health.
set -euo pipefail

ROOT="${MANOKIP_ROOT:-/opt/manokip}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
DB_CONTAINER="${DB_CONTAINER:-manokip-db}"
API_CONTAINER="${API_CONTAINER:-manokip-api}"
DB_USER="${DB_USER:-manokip}"
DB_NAME="${DB_NAME:-manokip}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/health}"

log() { printf '[restore] %s\n' "$*"; }
die() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

FILE="${1:-}"
CONFIRM="${2:-}"

if [ -z "$FILE" ]; then
  log "available backups in $BACKUP_DIR:"
  ls -1sh "$BACKUP_DIR"/*-db.sql.gz 2>/dev/null || log "(none)"
  echo
  log "usage: bash restore.sh <backup-db.sql.gz>"
  exit 0
fi

[ -f "$FILE" ] || FILE="$BACKUP_DIR/$FILE"
[ -f "$FILE" ] || die "backup file not found: $1"
gzip -t "$FILE" || die "backup file is corrupt: $FILE"

if [ "$CONFIRM" != "--yes" ]; then
  cat <<MSG
About to REPLACE the live database '$DB_NAME' with:
  $FILE  ($(du -h "$FILE" | cut -f1), $(date -r "$FILE" '+%Y-%m-%d %H:%M'))

Everything written after that backup was taken will be gone.
A fresh safety backup is taken first, so this is reversible.
MSG
  read -r -p "Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || die "cancelled"
fi

log "step 1/5 — safety backup of the CURRENT database"
bash "$(dirname "$0")/backup.sh" pre-restore >/dev/null

api_exists() { docker inspect "$API_CONTAINER" >/dev/null 2>&1; }

log "step 2/5 — stopping the API so nothing writes during the restore"
if api_exists; then
  docker stop "$API_CONTAINER" >/dev/null
else
  log "api container not present — nothing to stop"
fi

pass="${PGPASSWORD:-}"
if [ -z "$pass" ] && [ -r "$ROOT/.env" ]; then
  pass=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ROOT/.env" | head -1 | tr -d '"'"'")
fi

# Guard against the classic accident: restoring a snapshot of an EMPTY database
# (e.g. a "pre-restore" safety dump taken from a blank target) over a live one
# would silently wipe everything. Refuse unless the target is empty too.
dump_tables=$( (gzip -dc "$FILE" | grep -c '^CREATE TABLE ') || true)
live_tables=$(docker exec -e PGPASSWORD="$pass" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" \
  2>/dev/null | tr -d '[:space:]')
log "backup holds ${dump_tables:-0} table(s); live database holds ${live_tables:-0}"
if [ "${dump_tables:-0}" -eq 0 ] && [ "${live_tables:-0}" -gt 0 ]; then
  die "this backup contains no tables — restoring it would empty a database that has ${live_tables}. Pick another file."
fi

log "step 3/5 — loading the dump"
gzip -dc "$FILE" | docker exec -i -e PGPASSWORD="$pass" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet >/dev/null \
  || die "restore failed — the database may be half-loaded; re-run with the same file"

UPLOADS="${FILE%-db.sql.gz}-uploads.tar.gz"
if api_exists; then
  docker start "$API_CONTAINER" >/dev/null
  if [ -f "$UPLOADS" ]; then
    log "step 4/5 — restoring uploaded images from $(basename "$UPLOADS")"
    # Files are added back over the live volume; nothing is deleted, so images
    # uploaded after the backup survive the restore.
    gzip -dc "$UPLOADS" | docker exec -i "$API_CONTAINER" tar -xf - -C /app/server/uploads
  else
    log "step 4/5 — no uploads archive next to this dump, skipping"
  fi
else
  log "step 4/5 — no api container here, database restored only"
  log "restore complete ✅"
  exit 0
fi

log "step 5/5 — waiting for the API to come back"
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    log "API healthy — restore complete ✅"
    exit 0
  fi
  sleep 2
done
die "API did not become healthy — check: docker logs $API_CONTAINER"
