# Algo de comer

Plataforma gastronómica hiperlocal. La fase 1 cubre la oferta: cuenta, teléfono, zonas de cobertura, negocios, catálogo manual y revisión administrativa. Todavía no hay búsqueda, mapa, menú del día, pedidos ni cobros.

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
pnpm admin:create -- admin@ejemplo.test 'una-contraseña-larga' "Nombre"
pnpm dev
```

La web queda en http://localhost:5173 y la API en http://localhost:3000. `GET /api/v1/health` comprueba PostgreSQL, PostGIS y la zona horaria `America/Mexico_City`.

`pnpm db:seed` deja los planes Básico ($29 MXN) y PRO ($129 MXN), con sus cupos de fotos y menús, y una zona piloto de demostración sobre el Centro de la Ciudad de México. El punto 19.4326, -99.1332 cae dentro. El cobro de la suscripción no forma parte de esta fase: aprobar una sucursal solo la publica. Las fotos y los menús visuales se guardan en `data/uploads`.

Con Docker, en lugar de `pnpm db:ensure`:

```bash
pnpm db:up
```

Y en `.env` apunta `DATABASE_URL` a `localhost:5433`. El almacenamiento local se levanta aparte:

```bash
docker compose --profile storage up -d
```

## Qué deja listo esta fase

- Cuenta con correo y contraseña, sesión en cookie y verificación de teléfono. En local el código aparece en pantalla; Google queda apagado hasta definir sus credenciales.
- Zonas rectangulares. Fuera de una zona piloto o activa no se crea la sucursal; con consentimiento queda en lista de espera.
- Ficha del negocio, horario, servicios, fotos, menú visual y catálogo manual.
- Revisión: un administrador aprueba y publica, o rechaza con motivo. Una cocina en casa no muestra el domicilio salvo que el negocio lo autorice.
- Copia de seguridad con `pnpm db:backup` y restauración con `pnpm db:restore -- <dump> <base>`.

Las credenciales de `.env.example` son solo de desarrollo. El rol local es superusuario para instalar PostGIS; en producción la API no debe conectarse con un superusuario.

## Qué sigue

La fase 2 cubre descubrimiento: búsqueda, mapa y menú del día. Los ciclos de suscripción quedan para la fase 3.
