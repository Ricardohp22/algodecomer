#!/usr/bin/env bash
# Restaura un dump en una base vacía. No sustituye la base de trabajo salvo CONFIRM_RESTORE=yes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db.sh
source "$ROOT/scripts/lib/db.sh"

DUMP="${1:-}"
TARGET="${2:-}"

if [[ -z "$DUMP" || -z "$TARGET" ]]; then
  echo "Uso: scripts/restore-db.sh <archivo.dump> <base_destino>" >&2
  exit 1
fi

if [[ ! -f "$DUMP" ]]; then
  echo "No existe el archivo: $DUMP" >&2
  exit 1
fi

if [[ "$TARGET" == "$PGDATABASE" && "${CONFIRM_RESTORE:-}" != "yes" ]]; then
  echo "Para restaurar sobre ${PGDATABASE} exporta CONFIRM_RESTORE=yes" >&2
  exit 1
fi

if [[ ! "$TARGET" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Nombre de base inválido: $TARGET" >&2
  exit 1
fi

EXISTS="$(psql_maintenance -tAc "SELECT 1 FROM pg_database WHERE datname = '${TARGET}'" | tr -d '[:space:]')"
if [[ "$EXISTS" == "1" ]]; then
  echo "La base ${TARGET} ya existe. Elige otro nombre o elimínala antes de restaurar." >&2
  exit 1
fi

psql_maintenance -c "CREATE DATABASE ${TARGET};"
psql_db "$TARGET" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql_db "$TARGET" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

restore_dump "$DUMP" "$TARGET"

echo "Restauración completa en ${TARGET}"
