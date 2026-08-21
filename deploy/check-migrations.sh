#!/usr/bin/env bash
# Refuse to deploy a migration that would destroy production data.
#
#   bash deploy/check-migrations.sh [migrations-dir]
#
# Compares the repo's migrations against the ones Postgres has already applied,
# then scans only the PENDING ones. Anything that drops or truncates data stops
# the deploy; set ALLOW_DESTRUCTIVE_MIGRATION=yes to override deliberately
# (after taking a backup and knowing exactly what is being dropped).
set -euo pipefail

DIR="${1:-server/prisma/migrations}"
ROOT="${MANOKIP_ROOT:-/opt/manokip}"
DB_CONTAINER="${DB_CONTAINER:-manokip-db}"
DB_USER="${DB_USER:-manokip}"
DB_NAME="${DB_NAME:-manokip}"

log() { printf '[migrations] %s\n' "$*"; }

pass="${PGPASSWORD:-}"
if [ -z "$pass" ] && [ -r "$ROOT/.env" ]; then
  pass=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ROOT/.env" | head -1 | tr -d '"'"'")
fi
psql_q() {
  docker exec -e PGPASSWORD="$pass" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1"
}

has_table=$(psql_q "SELECT to_regclass('public._prisma_migrations') IS NOT NULL" 2>/dev/null || echo f)
if [ "$has_table" != "t" ]; then
  log "no migration history in the database (fresh install) — nothing to compare, skipping check"
  exit 0
fi

applied=$(psql_q "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")

pending=()
for path in "$DIR"/*/; do
  name=$(basename "$path")
  [ "$name" = "*" ] && continue
  if ! grep -qxF "$name" <<<"$applied"; then pending+=("$name"); fi
done

if [ "${#pending[@]}" -eq 0 ]; then
  log "no pending migrations — database schema is already up to date"
  exit 0
fi

log "pending migration(s): ${pending[*]}"

# Statements that delete data outright. ALTER COLUMN … TYPE can also lose
# precision, but it never empties a table, so it is a warning below instead.
DESTRUCTIVE='DROP[[:space:]]+TABLE|DROP[[:space:]]+COLUMN|DROP[[:space:]]+SCHEMA|DROP[[:space:]]+DATABASE|TRUNCATE|DELETE[[:space:]]+FROM'
RISKY='ADD[[:space:]]+COLUMN[^;]*NOT[[:space:]]+NULL|ALTER[[:space:]]+COLUMN[^;]*(SET[[:space:]]+NOT[[:space:]]+NULL|TYPE)|CREATE[[:space:]]+UNIQUE[[:space:]]+INDEX'

found=0
for name in "${pending[@]}"; do
  sql="$DIR/$name/migration.sql"
  [ -f "$sql" ] || continue
  # Strip comments so a note about a dropped column is not mistaken for one.
  body=$(sed 's/--.*$//' "$sql")

  if hits=$(grep -inE "$DESTRUCTIVE" <<<"$body"); then
    found=1
    log "DESTRUCTIVE statements in $name:"
    sed 's/^/    /' <<<"$hits"
  fi
  if hits=$(grep -inE "$RISKY" <<<"$body"); then
    log "note — $name contains statements that can fail on a table with rows:"
    sed 's/^/    /' <<<"$hits"
  fi
done

if [ "$found" = 1 ]; then
  if [ "${ALLOW_DESTRUCTIVE_MIGRATION:-}" = "yes" ]; then
    log "ALLOW_DESTRUCTIVE_MIGRATION=yes — proceeding on purpose"
    exit 0
  fi
  cat >&2 <<'MSG'

[migrations] DEPLOY STOPPED: a pending migration would delete production data.

  Nothing has been changed on the server. Either rewrite the migration so it
  keeps the data (add a column instead of dropping one, backfill, then drop in
  a later release), or re-run the deploy with ALLOW_DESTRUCTIVE_MIGRATION=yes
  if the loss is intended.
MSG
  exit 1
fi

log "pending migrations are additive — safe to apply ✅"
