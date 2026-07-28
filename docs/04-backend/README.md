# 04 · Backend

API en **Node 20 + Fastify 4 + Socket.IO 4**, escrita en TypeScript (ESM, imports con extensión `.js`). Código en `apps/api/src`.

## Arranque (`index.ts`)

Secuencia al iniciar el contenedor:

1. `waitForDb()` — espera a que PostgreSQL acepte conexiones.
2. `migrate()` — corre los `.sql` de `apps/api/migrations` en orden (idempotentes).
3. `seed()` — crea datos base si faltan (admin, etc.).
4. `loadSettings()` — cachea tarifas globales desde la tabla `settings`.
5. Registra plugins (`@fastify/cors`, `@fastify/jwt`), rutas y Socket.IO con adapter de Redis.

No hay paso de migración manual: desplegar = migrar.

## Rutas REST

Registradas con prefijos en `index.ts`. Cada grupo vive en `apps/api/src/routes/`:

| Prefijo | Archivo | Dominio |
|---------|---------|---------|
| `/api/auth` | `auth.routes.ts` | Registro / login |
| `/api/trips` | `trips.routes.ts` | Estimación, ruta, ciclo de vida del viaje, historial, rating |
| `/api/admin` | `admin.routes.ts` | KPIs, analítica, CRUD, tarifas, empresas, reportes |
| `/api/geo` | `geo.routes.ts` | Búsqueda y geocodificación inversa (Photon) |

Referencia completa de endpoints en [06 · API](../06-api/README.md).

## Autenticación y autorización (`auth.ts`)

- **Contraseñas:** `bcryptjs` (`hashPassword` / `verifyPassword`).
- **Token:** JWT firmado con `@fastify/jwt`, expiración 30 días, payload `AuthUser { id, name, email, role }`.
- **Guarda:** `authGuard(role?)` como `preHandler`. Sin rol exige sesión válida; con rol exige además que coincida. Ejemplos reales:
  - `authGuard('passenger')` en `POST /api/trips/request`
  - `authGuard('driver')` en `POST /api/trips/accept`

> Las rutas de `/api/admin` no llevan `authGuard` por handler porque el grupo se protege con un hook de plugin (`admin.routes.ts:9`: `app.addHook('preHandler', authGuard('admin'))`), que cubre todas las rutas del prefijo. Ver [08 · Security](../08-security/README.md).

## Tiempo real (`sockets.ts`)

- Autenticación por **JWT en el handshake** (`socket.handshake.auth.token`).
- Al conectar: el socket entra a `user:{id}` y, si es admin, a `admins`.
- Adapter de **Redis** (`@socket.io/redis-adapter`) para que los eventos funcionen aunque haya varias instancias de la API.

Contrato de eventos: [06 · API — Socket.IO](../06-api/README.md#eventos-socketio).

## Dominio: tarifas (`fare.ts`, `tariffs.ts`)

- `estimateFare(distanceKm, minutes, tariff)` = `max(minimum, redondeo50(base + km·per_km + min·per_min))`.
- `tariffForUser(userId)` devuelve `{ tariff, companyId }`: usa la tarifa de la **empresa** del pasajero si existe; si no, la global.
- `loadSettings()` / `allSettings()` mantienen las tarifas globales en memoria; se recargan al guardar en el admin.

## Ruteo (`routing.ts`)

Motor intercambiable con caché en memoria (TTL 10 min) y cadena de respaldo. Detalle en [09 · Integrations](../09-integrations/README.md).

## Acceso a datos (`db.ts`)

- Pool de `pg`.
- `query<T>(sql, params)` → filas; `one<T>(sql, params)` → primera fila o `null`.
- Las columnas de geografía se exponen con `ST_X` / `ST_Y` y se escriben con `ST_MakePoint` / `ST_SetSRID`.

## Estilo y convenciones

- TypeScript estricto, ESM (recordar la extensión `.js` en los imports internos).
- Validación de entrada con **zod** (`safeParse`) en cada endpoint.
- Errores con códigos HTTP explícitos (`reply.code(...).send({ ok:false, error })`).
- Respuestas con forma `{ ok: true, ... }`.
