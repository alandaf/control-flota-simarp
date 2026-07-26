# 🚕 Control Flota

Aplicación web **PWA** de gestión de flota y viajes en tiempo real (estilo Uber/Cabify),
con tres roles: **pasajero**, **conductor** y **administrador**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + TypeScript + **Fastify** |
| Tiempo real | **Socket.IO** + adaptador Redis (escalable a N instancias) |
| Base de datos | **PostgreSQL 16 + PostGIS** (consultas geoespaciales reales) |
| Cache / GEO | **Redis 7** (índice geoespacial en vivo + pub/sub) |
| Frontend | **React 18 + Vite + TypeScript**, PWA instalable |
| Mapas | **Leaflet + OpenStreetMap** (sin API keys) |
| Ruteo | **OSRM** — ruta más corta sobre el grafo vial real |
| Infra | **Docker Compose** (4 servicios + OSRM opcional) |

---

## Puesta en marcha

Requisitos: Docker Desktop (local) o Docker Engine + Compose (VPS).

```bash
cp .env.example .env
```

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (descarga de imágenes y `npm install`).
Al arrancar, la API aplica las migraciones y carga datos de ejemplo automáticamente.

| Servicio | URL |
|----------|-----|
| Aplicación web | http://localhost:8080 |
| API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

### Cuentas de prueba (contraseña `123456`)

| Rol | Email |
|-----|-------|
| Administrador | `admin@flota.cl` |
| Pasajero | `pasajero@flota.cl` |
| Conductor | `conductor@flota.cl` |
| Conductora | `marta@flota.cl` |

---

## Cómo probarlo

Abre **dos ventanas** (una normal y otra en incógnito, para tener dos sesiones):

1. **Pasajero** → entra con `pasajero@flota.cl`, toca el mapa para fijar **origen** y **destino**,
   revisa la tarifa estimada y pulsa *Solicitar viaje*.
2. **Conductor** → entra con `conductor@flota.cl`, pulsa **🟢 Conectarme**.
   La solicitud aparece al instante (WebSocket) con la distancia hasta el pasajero.
3. Acepta el viaje y avanza por los estados: *Llegué* → *Iniciar* → *Finalizar*.
   El pasajero ve cada cambio y la posición del conductor **en vivo**.
4. **Admin** → entra con `admin@flota.cl` para ver el dashboard, el mapa de la flota en
   tiempo real, y gestionar vehículos, conductores y usuarios.

> El navegador pedirá permiso de **ubicación**. En el conductor es lo que alimenta el
> seguimiento en vivo. Sin permiso, el mapa igual funciona (se centra en Santiago).

---

## Arquitectura

```
control_flota/
├─ docker-compose.yml        # db (PostGIS) · redis · api · web
├─ .env.example              # configuración (copiar a .env)
└─ apps/
   ├─ api/                   # Fastify + Socket.IO + PostGIS
   │  ├─ migrations/         # SQL idempotente, se aplica al arrancar
   │  └─ src/
   │     ├─ index.ts         # bootstrap: HTTP + WebSocket
   │     ├─ sockets.ts       # eventos en tiempo real
   │     ├─ routes/          # auth · trips · admin
   │     ├─ db.ts fare.ts    # PostgreSQL · cálculo de tarifas
   │     └─ seed.ts          # datos de ejemplo
   └─ web/                   # React + Vite (PWA)
      └─ src/pages/          # Login · Passenger · Driver · Admin · History
```

### Decisiones clave

- **PostGIS** en vez de cálculos en aplicación: la búsqueda de viajes cercanos
  (`ST_DWithin` + índice GIST) se resuelve en la base de datos, en metros reales.
- **Socket.IO con adaptador Redis**: permite escalar la API a varias réplicas
  sin perder eventos entre clientes conectados a instancias distintas.
- **JWT** (sin sesiones en servidor): la API es stateless y horizontalmente escalable.
- **Aceptación atómica de viajes**: el `UPDATE ... WHERE status='requested'` evita
  que dos conductores tomen el mismo viaje.

---

## Ruteo: la ruta más corta

La app **no** dibuja una línea recta: calcula y muestra la **ruta más corta por
calle**, y la tarifa se cobra según la **distancia real de esa ruta**.

Para eso usa **OSRM (Open Source Routing Machine)**, que resuelve el camino mínimo
sobre el grafo vial real de OpenStreetMap con *Multi-Level Dijkstra* / *contraction
hierarchies* — la versión de nivel de producción del algoritmo de Dijkstra. La API
expone `POST /api/trips/route` y `/estimate`, que devuelven la geometría de la ruta,
la distancia y la duración. Si OSRM no responde, degrada con elegancia a una línea
recta punteada (Haversine).

### OSRM público (por defecto)

Funciona sin configuración usando el servidor de demostración de OSRM. Es solo para
desarrollo/demo (con límites de uso y latencia variable).

### OSRM propio (ya configurado con la Región de Valparaíso)

Este proyecto viene con OSRM auto-hospedado usando el extracto de **Valparaíso**
(cubre Valparaíso, Viña del Mar, Curauma, Placilla, Quilpué…). Se preparó una vez con:

```bash
./scripts/osrm-prepare.sh https://download.openstreetmap.fr/extracts/south-america/chile/valparaiso-latest.osm.pbf
```

En el `.env` ya queda apuntando a tu OSRM local:

```
OSRM_PBF=valparaiso-latest
OSRM_URL=http://osrm:5000
```

Y se levanta con el perfil `routing`:

```bash
docker compose --profile routing up -d osrm && docker compose up -d api
```

Resultado: rutas en **~20 ms** (vs varios segundos del servidor público), sin límites.

**Cobertura por zona.** Un extracto regional solo enruta dentro de su área; fuera de
ella la app degrada a línea recta (parámetro `OSRM_SNAP_RADIUS_M`, por defecto 3000 m).
Fuentes de extractos:

- **[openstreetmap.fr](https://download.openstreetmap.fr/extracts/south-america/chile/)**
  tiene subregiones de Chile (`valparaiso`, `santiago`, …) — livianas (30–50 MB), ideales
  con conexión lenta.
- **[Geofabrik](https://download.geofabrik.de/south-america/chile-latest.osm.pbf)** tiene
  el país completo (~330 MB).

Para **añadir Santiago** u otra zona, prepárala y cambia `OSRM_PBF`:

```bash
./scripts/osrm-prepare.sh https://download.openstreetmap.fr/extracts/south-america/chile/santiago-latest.osm.pbf
```

> Para cubrir **varias zonas a la vez** (p. ej. Santiago + Valparaíso), se fusionan los
> `.osm.pbf` con `osmium merge` en un solo archivo antes de preprocesar.

> **Windows (Git Bash):** el script ya desactiva la conversión de rutas de MSYS
> (`MSYS_NO_PATHCONV`), necesaria para que Docker reciba bien las rutas internas del contenedor.

---

## Eventos de tiempo real

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `driver:online` | cliente → servidor | El conductor entra/sale de disponibilidad |
| `driver:location` | cliente → servidor | Envía su posición (persiste en PostGIS + Redis GEO) |
| `driver:location` | servidor → cliente | El pasajero recibe la posición de su conductor |
| `trip:new` | servidor → conductores | Nueva solicitud disponible |
| `trip:update` | servidor → pasajero | Cambio de estado del viaje |
| `admin:driver_location` | servidor → admin | Movimiento de flota en el mapa |

---

## Desarrollo con hot-reload

```bash
BUILD_TARGET=development NODE_ENV=development docker compose up -d api
```

El frontend en modo dev (fuera de Docker, apuntando a la API del contenedor):

```bash
cd apps/web && npm install && npm run dev
```

---

## Despliegue en VPS

1. Clona el repositorio en el servidor y crea el `.env` **con valores propios**:
   - `JWT_SECRET`: cadena larga y aleatoria (`openssl rand -hex 32`)
   - `POSTGRES_PASSWORD`: contraseña fuerte
   - `CORS_ORIGIN` y `VITE_API_URL`: los dominios reales (ej. `https://flota.tudominio.com`)
2. Levanta el stack:

```bash
docker compose up -d --build
```

3. Pon un **reverse proxy con HTTPS** (Caddy, Traefik o Nginx) delante:
   - `/` → contenedor `web` (puerto 80)
   - `/api` y `/socket.io` → contenedor `api` (puerto 4000), con soporte de **WebSocket upgrade**

> ⚠️ **HTTPS es obligatorio en producción**: la geolocalización del navegador y la
> instalación de la PWA solo funcionan en contextos seguros (o en `localhost`).

### Comandos útiles

```bash
docker compose logs -f api
```

```bash
docker compose down
```

Para borrar también la base de datos (⚠️ destruye los datos):

```bash
docker compose down -v
```

---

## Pendientes / siguientes pasos

- Pagos (Stripe / Transbank / MercadoPago)
- Push notifications (Web Push + VAPID)
- Asignación automática al conductor más cercano
- Instrucciones de navegación giro a giro (OSRM ya entrega los `steps`)
- Tests (Vitest + Supertest) y CI
