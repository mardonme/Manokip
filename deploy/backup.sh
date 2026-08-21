#!/usr/bin/env bash
# Full backup of everything production holds that cannot be rebuilt from git:
# the Postgres database and the uploaded images. Runs on the VPS itself (the
# GitHub self-hosted runner calls it before every deploy, and nightly).
#
#   bash deploy/backup.sh [label]
#
# Writes /opt/manokip/backups/<timestamp>-<label>-db.sql.gz (+ -uploads.tar.gz),
# verifies the dump is readable, and prunes to the newest KEEP backups.
set -euo pipefail

LABEL="${1:-manual}"
ROOT="${MANOKIP_ROOT:-/opt/manokip}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
DB_CONTAINER="${DB_CONTAINER:-manokip-db}"
API_CONTAINER="${API_CONTAINER:-manokip-api}"
DB_USER="${DB_USER:-manokip}"
DB_NAME="${DB_NAME:-manokip}"
KEEP="${KEEP:-30}"
MIN_FREE_MB="${MIN_FREE_MB:-500}"

log() { printf '[backup] %s\n' "$*"; }
die() { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }

docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "database container '$DB_CONTAINER' not found"

mkdir -p "$BACKUP_DIR"

free_mb=$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')
[ "$free_mb" -ge "$MIN_FREE_MB" ] || die "only ${free_mb}MB free on $BACKUP_DIR (need ${MIN_FREE_MB}MB) — prune backups first"

# The password lives only in the production .env (chmod 600); fall back to the
# container's local trust auth when the file is not readable (e.g. dev boxes).
PGPASSWORD="${PGPASSWORD:-}"
if [ -z "$PGPASSWORD" ] && [ -r "$ROOT/.env" ]; then
  PGPASSWORD=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ROOT/.env" | head -1 | tr -d '"'"'")
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
DB_FILE="$BACKUP_DIR/$STAMP-$LABEL-db.sql.gz"
UP_FILE="$BACKUP_DIR/$STAMP-$LABEL-uploads.tar.gz"

# How many tables the database has, so an empty dump can be told apart from a
# broken one. A fresh/disaster-recovery database legitimately has none.
table_count=$(docker exec -e PGPASSWORD="$PGPASSWORD" "$DB_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" \
  2>/dev/null | tr -d '[:space:]') || table_count=0

log "dumping database '$DB_NAME' ($table_count table(s)) → $(basename "$DB_FILE")"
# --clean --if-exists makes the dump self-contained: restoring it drops and
# recreates every object, so a restore never half-merges into a live schema.
# Written to .tmp and renamed only once verified, so a crashed dump can never
# be left behind looking like a usable backup.
docker exec -e PGPASSWORD="$PGPASSWORD" "$DB_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$DB_FILE.tmp" || { rm -f "$DB_FILE.tmp"; die "pg_dump failed — nothing was written"; }

# A dump that cannot be read back is not a backup — verify before publishing it.
gzip -t "$DB_FILE.tmp" || { rm -f "$DB_FILE.tmp"; die "dump is not a valid gzip file"; }
# grep -c (not -q) so it consumes the whole stream: an early exit would kill
# gzip with SIGPIPE and pipefail would read that as a broken dump.
if [ "${table_count:-0}" -gt 0 ]; then
  if [ "$(gzip -dc "$DB_FILE.tmp" | grep -c 'CREATE TABLE')" -eq 0 ]; then
    rm -f "$DB_FILE.tmp"
    die "database has $table_count table(s) but the dump has no CREATE TABLE — refusing to trust it"
  fi
else
  log "database is empty — dump kept as an empty snapshot"
fi
mv "$DB_FILE.tmp" "$DB_FILE"
log "database backup ok ($(du -h "$DB_FILE" | cut -f1))"

api_running=$(docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null || echo false)
if [ "$api_running" = "true" ]; then
  log "archiving uploaded images → $(basename "$UP_FILE")"
  docker exec "$API_CONTAINER" tar -cf - -C /app/server/uploads . | gzip -9 > "$UP_FILE.tmp" \
    || { rm -f "$UP_FILE.tmp"; die "could not archive uploads"; }
  gzip -t "$UP_FILE.tmp" || { rm -f "$UP_FILE.tmp"; die "uploads archive is not a valid gzip file"; }
  mv "$UP_FILE.tmp" "$UP_FILE"
  log "uploads backup ok ($(du -h "$UP_FILE" | cut -f1))"
else
  log "api container not running — skipping uploads archive (database is backed up)"
fi

# Prune by pair (db + uploads share a timestamp prefix), newest KEEP kept.
# Names start with the UTC timestamp, so a reverse sort is newest-first.
kept=0
for old in $(ls -1 "$BACKUP_DIR" 2>/dev/null | sed -n 's/-db\.sql\.gz$//p' | sort -r); do
  kept=$((kept + 1))
  if [ "$kept" -gt "$KEEP" ]; then
    log "pruning old backup $old"
    rm -f "$BACKUP_DIR/$old-db.sql.gz" "$BACKUP_DIR/$old-uploads.tar.gz"
  fi
done

total=$(ls -1 "$BACKUP_DIR"/*-db.sql.gz 2>/dev/null | wc -l | tr -d ' ')
log "done — $total backup(s) in $BACKUP_DIR"
echo "$DB_FILE"
