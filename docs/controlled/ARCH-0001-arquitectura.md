# ARCH-0001 · Arquitectura del sistema

| Campo | Valor |
|-------|-------|
| **Código** | ARCH-0001 |
| **Versión** | 1.0 |
| **Estado** | Aprobado |
| **Dueño** | Ingeniería |
| **Fecha** | 2026-07-27 |
| **Relacionados** | [ADR-0001](ADR-0001-decisiones-arquitectura.md), [DB-0001](DB-0001-modelo-datos.md), [API-0001](API-0001-README.md), [OPS-0001](OPS-0001-operacion-despliegue.md) |

---

## 1. Objetivo

Describir la arquitectura de FLOTA en vistas C4 (contexto, contenedores, componentes), los flujos críticos, y las propiedades de escalabilidad, disponibilidad y evolución. Amplía el [handbook 02](../02-architecture/README.md).

## 2. C1 · Contexto

```
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Pasajero │     │ Conductor│     │  Admin   │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        └───────────┬────┴────────────────┘
                    ▼  HTTPS + WebSocket
            ┌───────────────┐   Directions API
            │     FLOTA     │──────────────▶ Google
            │  (plataforma) │──────────────▶ Photon (geocoding)
            └───────────────┘──────────────▶ OSM/CARTO (tiles)
```

Actores: pasajero, conductor, administrador. Sistemas externos: Google Directions, Photon, tiles OSM/CARTO. Todos los servicios de datos son propios (autohospedados).

## 3. C2 · Contenedores

| Contenedor | Tecnología | Responsabilidad | Puerto |
|------------|-----------|-----------------|--------|
| **web** | nginx + SPA React/Vite (PWA) | Sirve estáticos; proxy de `/api` y `/socket.io` | `127.0.0.1:8095` (host) |
| **api** | Node 20 + Fastify 4 + Socket.IO 4 | REST + tiempo real; migraciones/seed | interno |
| **db** | PostgreSQL 16 + PostGIS 3.4 | Persistencia + geografía | interno |
| **redis** | Redis 7 | Adapter Socket.IO + índice GEO | interno |
| **osrm** | OSRM (MLD) Valparaíso | Ruteo por calle self-hosted | interno |

Solo **web** expone puerto (a loopback); el resto vive en la red interna de Docker. TLS lo termina el **nginx del host**. Ver [ADR-0001](../adr/0001-deploy-detras-de-nginx-host.md).

## 4. C3 · Componentes del backend (`apps/api/src`)

```
index.ts ── arranque: waitForDb → migrate → seed → loadSettings → rutas + sockets
  ├─ routes/auth.routes.ts     (/api/auth)
  ├─ routes/trips.routes.ts    (/api/trips)   ── usa routing.ts, fare.ts, tariffs.ts
  ├─ routes/admin.routes.ts    (/api/admin)   ── analítica, CRUD, reportes
  ├─ routes/geo.routes.ts      (/api/geo)     ── Photon
  ├─ sockets.ts                (Socket.IO)    ── driver:online/location, trip:join
  ├─ routing.ts                (OSRM/Google + caché + fallback)
  ├─ fare.ts / tariffs.ts      (tarifa; global/empresa)
  ├─ auth.ts                   (bcrypt, JWT, authGuard)
  ├─ db.ts / redis.ts / events.ts / env.ts
```

Componentes del frontend (`apps/web/src`): `pages/{Login,Passenger,Driver,Admin,History}.tsx`, `components/{NavGuide,SearchBox,Charts,Icons}.tsx`, `lib/{api,auth,socket,wakeLock,mapkit}.ts`.

## 5. Flujos críticos

### 5.1 Solicitud y asignación
```
Pasajero ─POST /trips/request──▶ api
   api: calcula tarifa (tariffForUser + fare) ; INSERT trip(requested)
   api ─emit 'trip:new'──▶ drivers:online
Conductor ─POST /trips/accept──▶ api  (UPDATE trip=accepted, driver_id)
   api ─emit 'trip:update{accepted}'──▶ user:{passenger}
```

### 5.2 Seguimiento en vivo
```
Conductor ─socket 'driver:location'──▶ api
   api: UPDATE drivers.location (PostGIS) ; redis.geoadd(DRIVERS_GEO)
   api ─'driver:location'──▶ trip:{id}   (pasajero ve el auto)
   api ─'admin:driver_location'──▶ admins (mapa en vivo)
```

### 5.3 Navegación
```
NavGuide ─POST /trips/route {steps:true}──▶ api (getRoute con maniobras+geometría)
   loop: proyecta posición sobre la geometría → próxima maniobra + desvío
   si desvío > 45 m sostenido → recalcula (anti-rebote 6 s)
```
Ver [ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md).

## 6. Datos en reposo y en vivo
- **En reposo:** PostgreSQL/PostGIS (fuente de verdad). Ver [DB-0001](DB-0001-modelo-datos.md).
- **En vivo/efímero:** Redis (salas Socket.IO vía adapter + `DRIVERS_GEO` para "cerca de").
- **Caché de ruteo:** en memoria del proceso api (TTL 10 min).

## 7. Escalabilidad

- **API sin estado** (la sesión es JWT). Se puede correr **N instancias**; Socket.IO usa **adapter Redis** para propagar eventos entre ellas.
- **Ruteo:** OSRM escala por réplicas del contenedor; Google es servicio externo elástico (con caché y control de costo).
- **DB:** vertical primero; a futuro read-replicas para analítica.
- **Cuello de botella esperado a escala:** escrituras de `driver:location` (frecuentes). Mitigable con batching/consolidación y TTL en Redis.

## 8. Disponibilidad y resiliencia
- **Respaldo de ruteo:** Google→OSRM→línea recta; ningún fallo de ruteo tumba la app.
- **Respaldo de tiempo real:** polling por API si el socket cae.
- **Healthchecks** de db/redis en compose; la API espera a la DB.
- **Riesgo actual:** VPS compartido → plan de aislamiento en [OPS-0001](OPS-0001-operacion-despliegue.md)/roadmap.

## 9. Seguridad (resumen)
JWT en REST y en el handshake de socket; autorización por rol; superficie mínima (solo web a loopback); secretos fuera del repo. Detalle y pendientes en [SEC-0001](SEC-0001-seguridad.md).

## 10. Decisiones y evolución
Registradas en [ADR-0001](ADR-0001-decisiones-arquitectura.md). Próximos temas arquitectónicos: multi-tenant (multi-operadora), separación de analítica, y aislamiento de infraestructura.

## 11. Vista de despliegue
Ver diagrama y detalle operativo en [OPS-0001](OPS-0001-operacion-despliegue.md) y `docker-compose.prod.yml`.
