#!/usr/bin/env bash
# Crea el rol y la base locales sobre Postgres.app (u otro Postgres del PATH).
# El rol de desarrollo es superusuario para poder instalar PostGIS. En producción
# la migración debe correr con un usuario privilegiado distinto del usuario de la API.
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql no está en PATH. Usa Postgres.app o levanta Docker con: pnpm db:up" >&2
  exit 1
fi

if ! psql -d postgres -tAc "SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'" | grep -q 1; then
  echo "PostGIS no está disponible en este servidor PostgreSQL." >&2
  exit 1
fi

if ! psql -d postgres -tAc "SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm'" | grep -q 1; then
  echo "pg_trgm no está disponible en este servidor PostgreSQL." >&2
  exit 1
fi

psql -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'algodecomer') THEN
    CREATE ROLE algodecomer LOGIN PASSWORD 'algodecomer' SUPERUSER;
  ELSE
    ALTER ROLE algodecomer WITH LOGIN PASSWORD 'algodecomer' SUPERUSER;
  END IF;
END
$$;
SQL

if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'algodecomer'" | grep -q 1; then
  psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE algodecomer OWNER algodecomer;"
fi

echo "Base local lista: algodecomer en localhost:5432"
