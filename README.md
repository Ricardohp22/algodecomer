# Algo de comer

Plataforma gastronómica hiperlocal. Este repositorio está en la fase 0: monorepo, API, web, PostgreSQL con PostGIS, identidad, roles y un entorno que se puede volver a crear.

## Requisitos

- Node.js 22
- pnpm 10
- PostgreSQL con PostGIS y `pg_trgm`

En este equipo se usa Postgres.app, que ya incluye PostGIS. Docker Compose queda preparado para el mismo servicio en el puerto **5433**, de modo que no choque con Postgres.app en el 5432. MinIO solo arranca con el perfil `storage`.

## Puesta en marcha local

```bash
corepack enable
corepack prepare pnpm@10.18.1 --activate
pnpm install
cp .env.example .env
pnpm db:ensure
pnpm db:setup
pnpm test
pnpm db:verify-restore
pnpm dev
```

La web queda en http://localhost:5173 y la API en http://localhost:3000. `GET /api/v1/health` comprueba PostgreSQL, PostGIS y la zona horaria `America/Mexico_City`.

Con Docker, en lugar de `pnpm db:ensure`:

```bash
pnpm db:up
```

Y en `.env` apunta `DATABASE_URL` a `localhost:5433`. El almacenamiento local se levanta aparte:

```bash
docker compose --profile storage up -d
```

## Qué deja listo esta fase

- Monolito modular en `apps/api` (Fastify, TypeScript, Drizzle) y web en `apps/web` (Vue 3, Vite).
- Tablas de identidad: usuarios, identidades de acceso, roles, asignaciones, sesiones y verificaciones de teléfono.
- Roles sembrados: `customer`, `owner`, `operator`, `admin`, `superadmin`.
- Extensiones `postgis` y `pg_trgm`.
- Copia de seguridad con `pnpm db:backup` y restauración con `pnpm db:restore -- <dump> <base>`.
- `pnpm db:verify-restore` restaura en una base temporal y comprueba que los cinco roles sobrevivan.

Las credenciales de `.env.example` son solo de desarrollo. El rol local es superusuario para instalar PostGIS; en producción la API no debe conectarse con un superusuario.

## Qué sigue

La fase 1 cubre registro de vendedores, cobertura, revisión administrativa, negocios y catálogo manual. Aún no hay autenticación, pedidos ni cobros.
