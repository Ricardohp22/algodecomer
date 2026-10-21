#!/usr/bin/env bash
# Copia de seguridad, restauración en una base temporal y comprobación de los roles.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db.sh
source "$ROOT/scripts/lib/db.sh"

mkdir -p "$ROOT/.backups"
STAMP="$(date +%Y%m%d%H%M%S)"
DUMP="$ROOT/.backups/verify-$STAMP.dump"
RESTORE_DB="algodecomer_restore_${STAMP}"

cleanup() {
  if [[ "$USE_DOCKER" -eq 1 ]]; then
    docker compose exec -T postgres psql -U "$PGUSER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${RESTORE_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    docker compose exec -T postgres psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DB};" >/dev/null 2>&1 || true
  else
    psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${RESTORE_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
    psql -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DB};" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

dump_database "$DUMP"

psql_maintenance -c "CREATE DATABASE ${RESTORE_DB};"
psql_db "$RESTORE_DB" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql_db "$RESTORE_DB" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
restore_dump "$DUMP" "$RESTORE_DB"

COUNT="$(psql_db "$RESTORE_DB" -tAc "SELECT count(*) FROM roles;" | tr -d '[:space:]')"
if [[ "$COUNT" != "5" ]]; then
  echo "La restauración no conservó los 5 roles (obtuvo: ${COUNT:-vacío})." >&2
  exit 1
fi

CODES="$(psql_db "$RESTORE_DB" -tAc "SELECT string_agg(code, ',' ORDER BY code) FROM roles;" | tr -d '[:space:]')"
if [[ "$CODES" != "admin,customer,operator,owner,superadmin" ]]; then
  echo "Los roles restaurados no coinciden: ${CODES}" >&2
  exit 1
fi

FUNCTION_COUNT="$(psql_db "$RESTORE_DB" -tAc "SELECT count(*) FROM pg_proc WHERE proname = 'set_updated_at';" | tr -d '[:space:]')"
if [[ "$FUNCTION_COUNT" != "1" ]]; then
  echo "La restauración no conservó set_updated_at." >&2
  exit 1
fi

MIGRATIONS="$(psql_db "$RESTORE_DB" -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;" | tr -d '[:space:]')"
if [[ "$MIGRATIONS" != "1" ]]; then
  echo "La restauración no conservó el historial de migraciones (obtuvo: ${MIGRATIONS:-vacío})." >&2
  exit 1
fi

echo "Restauración verificada: ${DUMP}"
