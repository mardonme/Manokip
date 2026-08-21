#!/usr/bin/env bash
# Row-count guard: proves a deploy did not lose data.
#
#   bash deploy/data-guard.sh snapshot before.txt
#   ...deploy...
#   bash deploy/data-guard.sh snapshot after.txt
#   bash deploy/data-guard.sh verify before.txt after.txt   # non-zero if rows vanished
#
# Growth is fine, shrinkage is not. Carts are excluded from the strict check:
# a checkout empties one, so they legitimately move while a deploy runs.
set -euo pipefail

ROOT="${MANOKIP_ROOT:-/opt/manokip}"
DB_CONTAINER="${DB_CONTAINER:-manokip-db}"
DB_USER="${DB_USER:-manokip}"
DB_NAME="${DB_NAME:-manokip}"

# Tables whose rows are real, irreplaceable business data.
CRITICAL=(User Category SpecLabel ProductSpec Product SavedItem Review Order OrderItem QuoteRequest)
# Ephemeral by design — reported, never enforced.
VOLATILE=(Cart CartItem)

psql_q() {
  local pass="${PGPASSWORD:-}"
  if [ -z "$pass" ] && [ -r "$ROOT/.env" ]; then
    pass=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ROOT/.env" | head -1 | tr -d '"'"'")
  fi
  docker exec -e PGPASSWORD="$pass" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -tAF$'\t' -c "$1"
}

snapshot() {
  local out="${1:?usage: data-guard.sh snapshot <file>}"
  local sql=""
  for t in "${CRITICAL[@]}" "${VOLATILE[@]}"; do
    [ -n "$sql" ] && sql+=" UNION ALL "
    sql+="SELECT '$t' AS t, count(*) AS n FROM \"$t\""
  done
  psql_q "$sql ORDER BY t" | sed '/^$/d' > "$out"
  printf '[data-guard] snapshot written to %s\n' "$out"
  cat "$out"
}

verify() {
  local before="${1:?usage: data-guard.sh verify <before> <after>}"
  local after="${2:?usage: data-guard.sh verify <before> <after>}"
  local failed=0

  while IFS=$'\t' read -r table before_n; do
    [ -n "$table" ] || continue
    local after_n
    after_n=$(awk -F'\t' -v t="$table" '$1==t {print $2}' "$after")
    if [ -z "$after_n" ]; then
      printf '[data-guard] FAIL %-14s table missing after deploy\n' "$table"
      failed=1
      continue
    fi
    local strict=0
    for c in "${CRITICAL[@]}"; do [ "$c" = "$table" ] && strict=1; done
    if [ "$after_n" -lt "$before_n" ]; then
      if [ "$strict" = 1 ]; then
        printf '[data-guard] FAIL %-14s %s → %s (rows lost)\n' "$table" "$before_n" "$after_n"
        failed=1
      else
        printf '[data-guard] info %-14s %s → %s (volatile, ok)\n' "$table" "$before_n" "$after_n"
      fi
    else
      printf '[data-guard] ok   %-14s %s → %s\n' "$table" "$before_n" "$after_n"
    fi
  done < "$before"

  if [ "$failed" = 1 ]; then
    cat >&2 <<'MSG'

[data-guard] DATA LOSS DETECTED. The pre-deploy backup in /opt/manokip/backups
             is intact — restore it with:
               bash /opt/manokip/bin/restore.sh <backup-file>
MSG
    exit 1
  fi
  printf '[data-guard] no data lost ✅\n'
}

case "${1:-}" in
  snapshot) shift; snapshot "$@" ;;
  verify)   shift; verify "$@" ;;
  *) echo "usage: data-guard.sh {snapshot <file>|verify <before> <after>}" >&2; exit 2 ;;
esac
