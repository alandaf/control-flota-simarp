# 09 · Integraciones

## Motor de ruteo (`apps/api/src/routing.ts`)

Intercambiable por la variable `ROUTING_PROVIDER` (`osrm` | `google`), con **caché** y **cadena de respaldo**.

```
getRoute(o,d,withSteps)
   ├─ caché (TTL 10 min, clave por coords redondeadas + provider)
   ├─ provider = google → tryGoogle() → si falla → tryOsrm()
   ├─ provider = osrm   → tryOsrm()
   └─ si todo falla     → línea recta (source:'straight')
```

Resultado normalizado `RouteResult`:
```ts
{ distanceKm, durationMin, geometry:[lat,lng][], source:'osrm'|'google'|'straight', steps? }
```

### OSRM (self-hosted)
- Contenedor `flota_osrm` en el VPS con extracto de **Valparaíso** (perfil MLD).
- `OSRM_URL=http://flota_osrm:5000`. Reintentos (2), `radiuses` para el *snap* a la red y control de rutas degeneradas.
- Gratis y sin límite, pero la **calidad depende de OpenStreetMap**: en zonas con datos pobres (ej. Playa Ancha) puede dar rutas subóptimas.
- Preparación de datos: `scripts/osrm-prepare.sh` (incluye workaround de conversión de rutas MSYS en Git Bash/Windows).

### Google Directions (producción)
- Adaptador `tryGoogle()`: decodifica *polyline*, mapea maniobras a `{type,modifier}` y limpia el HTML de las instrucciones.
- Requiere `GOOGLE_MAPS_API_KEY` (Directions API habilitada, key restringida por IP del VPS).
- **En producción** `ROUTING_PROVIDER=google` porque da rutas más precisas en Valparaíso; si Google falla, cae automáticamente a OSRM.

Por qué es intercambiable: [ADR-0002](../adr/0002-motor-de-ruteo-intercambiable.md).

> **Gotcha de geocoding, no de ruteo:** algunos POI de OSM (ej. "Escuela Naval Arturo Prat") caen en su cara costera sin acceso vehicular, forzando rodeos. Se resuelve buscando la dirección de la entrada o arrastrando el pin de destino.

## Geocodificación (`apps/api/src/geo.routes.ts`)

- **Photon (Komoot)** para autocompletar (`/search`) y geocodificación inversa (`/reverse`).
- Elegido sobre Nominatim porque **tolera más carga** en un servidor compartido (Nominatim limitaba por rate).
- Parámetro `lang=default` (¡no `lang=es`, que devuelve 400!).
- Caché en memoria (TTL 30 min) y sesgo a la vista del mapa (`viewbox` → `lat/lon`).

## Redis

- **Adapter de Socket.IO** (`@socket.io/redis-adapter`): permite escalar la API a varias instancias manteniendo las salas.
- **Índice GEO en vivo** (`DRIVERS_GEO`): `geoadd` en cada `driver:location`, `zrem` al desconectar/pasar a offline. Sirve para consultas rápidas de "conductores cerca" sin golpear PostGIS.

## Mapas y front

- **Leaflet + OpenStreetMap/CARTO** para el lienzo del mapa (gratis).
- **No** se usan tiles de Google dentro de Leaflet (lo prohíbe su licencia). Para incorporar el mapa de Google haría falta su SDK oficial — evaluado, no implementado.

## Resumen de variables de entorno de integración

| Variable | Ejemplo | Para qué |
|----------|---------|----------|
| `ROUTING_PROVIDER` | `google` | Motor de ruteo activo |
| `GOOGLE_MAPS_API_KEY` | `AIza…` | Directions API (si `google`) |
| `OSRM_URL` | `http://flota_osrm:5000` | Endpoint OSRM |
| `OSRM_TIMEOUT_MS` | `6000` | Timeout de ruteo |
| `OSRM_SNAP_RADIUS_M` | `3000` | Radio de *snap* a la red vial |
| `REDIS_URL` | `redis://redis:6379` | Redis (adapter + GEO) |

Lista completa en `apps/api/src/env.ts` y `.env.prod.example`.
