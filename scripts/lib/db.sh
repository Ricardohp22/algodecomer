#!/usr/bin/env bash
# Helpers de conexión. Los scripts llaman a este archivo con `source`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-algodecomer}"
PGPASSWORD="${PGPASSWORD:-algodecomer}"
PGDATABASE="${PGDATABASE:-algodecomer}"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

USE_DOCKER=0
if command -v docker >/dev/null 2>&1; then
  if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
    USE_DOCKER=1
  fi
fi

psql_maintenance() {
  if [[ "$USE_DOCKER" -eq 1 ]]; then
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d postgres "$@"
  else
    psql -v ON_ERROR_STOP=1 -d postgres "$@"
  fi
}

psql_db() {
  local database="$1"
  shift
  if [[ "$USE_DOCKER" -eq 1 ]]; then
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$database" "$@"
  else
    psql -v ON_ERROR_STOP=1 -d "$database" "$@"
  fi
}

dump_database() {
  local destination="$1"
  if [[ "$USE_DOCKER" -eq 1 ]]; then
    docker compose exec -T postgres \
      pg_dump -U "$PGUSER" -d "$PGDATABASE" \
      --schema=public \
      --schema=drizzle \
      --exclude-table=public.spatial_ref_sys \
      --format=custom \
      --no-owner \
      --no-acl >"$destination"
  else
    pg_dump \
      --schema=public \
      --schema=drizzle \
      --exclude-table=public.spatial_ref_sys \
      --format=custom \
      --no-owner \
      --no-acl \
      --file="$destination" \
      "$PGDATABASE"
  fi
}

restore_dump() {
  local dump="$1"
  local database="$2"
  local list
  list="$(mktemp)"

  if [[ "$USE_DOCKER" -eq 1 ]]; then
    docker compose exec -T postgres pg_restore -l <"$dump" | grep -v 'SCHEMA - public' >"$list"
    docker compose cp "$list" "postgres:/tmp/algodecomer-restore.list" >/dev/null
    docker compose cp "$dump" "postgres:/tmp/algodecomer-restore.dump" >/dev/null
    docker compose exec -T postgres \
      pg_restore -U "$PGUSER" -d "$database" \
      --no-owner \
      --no-acl \
      --exit-on-error \
      -L /tmp/algodecomer-restore.list \
      /tmp/algodecomer-restore.dump
    docker compose exec -T postgres rm -f /tmp/algodecomer-restore.list /tmp/algodecomer-restore.dump
  else
    pg_restore -l "$dump" | grep -v 'SCHEMA - public' >"$list"
    pg_restore \
      --no-owner \
      --no-acl \
      --exit-on-error \
      -L "$list" \
      --dbname="$database" \
      "$dump"
  fi

  rm -f "$list"
}
