# 02 · Arquitectura

## Vista de sistema

```
                            ┌─────────────────────────────────────────┐
                            │            VPS (nginx host)              │
   Navegador PWA            │   TLS *.simarp.net  ·  80/443            │
   (pasajero / conductor    │                                          │
    / admin)      ──HTTPS──▶│  flota.simarp.net ─▶ 127.0.0.1:8095      │
        │                   │                          │               │
        │  WebSocket        │                          ▼               │
        └───────────────────┼────────────▶  ┌──────────────────┐      │
                            │                │  web (nginx+SPA) │      │
                            │                └────────┬─────────┘      │
                            │        /api, /socket.io │  (proxy)       │
                            │                         ▼                │
                            │                ┌──────────────────┐      │
                            │                │  api (Fastify +  │      │
                            │                │   Socket.IO)     │      │
                            │                └───┬────┬────┬────┘      │
                            │           ┌────────┘    │    └───────┐   │
                            │           ▼             ▼            ▼   │
                            │   ┌────────────┐ ┌──────────┐ ┌────────┐ │
                            │   │ PostgreSQL │ │  Redis   │ │  OSRM  │ │
                            │   │ + PostGIS  │ │ (adapter │ │ (self- │ │
                            │   │            │ │  + GEO)  │ │ hosted)│ │
                            │   └────────────┘ └──────────┘ └────────┘ │
                            └───────────────────────────────────────────┘
                                       │
                                       └─ Google Directions API (ruteo en prod)
                                          Photon / Komoot (geocoding)
```

Solo el servicio **web** publica un puerto al host (`127.0.0.1:8095`); `db`, `redis`, `api` y `osrm` quedan en la red interna de Docker. El **nginx del host** (compartido con otras apps `*.simarp.net`) hace de proxy TLS. Por eso **no** se usa Caddy. Ver [ADR-0001](../adr/0001-deploy-detras-de-nginx-host.md).

## Componentes

| Componente | Tecnología | Rol |
|------------|-----------|-----|
| **web** | React 18 + Vite 5 + TS, PWA (vite-plugin-pwa), Leaflet | SPA + service worker; sirve estáticos con nginx y hace proxy de `/api` y `/socket.io` a `api` |
| **api** | Node 20 + Fastify 4 + Socket.IO 4 (ESM/TS) | REST + tiempo real; migraciones y seed al arrancar |
| **db** | PostgreSQL 16 + PostGIS 3.4 | Datos + geografía (`geography(Point,4326)`), índices GIST |
| **redis** | Redis 7 | Adapter de Socket.IO (escala horizontal) + índice `GEO` de conductores en vivo |
| **osrm** | OSRM (MLD) con extracto de Valparaíso | Motor de ruteo self-hosted (respaldo/alternativa a Google) |

Versiones exactas: `apps/api/package.json`, `apps/web/package.json`, `docker-compose.prod.yml`.

## Flujo de datos en vivo (ubicación del conductor)

```
Conductor (watchPosition)
   │  socket 'driver:location' {lat,lng,heading}   cada ~3 s
   ▼
api / sockets.ts
   ├─▶ UPDATE drivers.location (PostGIS)     ── persistencia
   ├─▶ redis.geoadd DRIVERS_GEO             ── índice en vivo para "conductores cerca"
   ├─▶ to(trip:{id}) 'driver:location'      ── el pasajero ve el auto moverse
   └─▶ to(admins) 'admin:driver_location'   ── el mapa del admin se actualiza
```

Además hay un **fallback por polling**: el pasajero y el conductor consultan la API cada pocos segundos por si el socket se cae (redes móviles).

## Módulos del backend (`apps/api/src`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `index.ts` | Arranque: espera DB → migra → seed → carga settings → registra rutas y sockets |
| `env.ts` | Configuración por variables de entorno |
| `db.ts` | Pool de `pg`, helpers `query` / `one` |
| `redis.ts` | Conexión ioredis, clave `DRIVERS_GEO` |
| `auth.ts` | Hash bcrypt, `authGuard(role)`, tipo `AuthUser` |
| `sockets.ts` | Contrato de eventos en vivo |
| `events.ts` | Salas estándar (`room.*`) y `emitTo` |
| `routing.ts` | Motor de ruteo intercambiable OSRM/Google + caché ([09](../09-integrations/README.md)) |
| `fare.ts` / `tariffs.ts` | Cálculo de tarifa y resolución global/por empresa |
| `routes/*.routes.ts` | Endpoints REST por dominio |

## Decisiones clave

- **PostGIS como fuente de verdad** de posiciones; **Redis GEO** como índice efímero para consultas "cerca de".
- **Ruteo intercambiable** por variable de entorno (`ROUTING_PROVIDER`), con respaldo automático.
- **Migraciones idempotentes** que corren al iniciar la API (sin paso manual).

Registradas en [ADR](../adr/README.md).
