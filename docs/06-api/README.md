# 06 · API

Referencia de la API HTTP y del contrato de tiempo real. Base en producción: `https://flota.simarp.net`.

## Convenciones

- **Autenticación:** header `Authorization: Bearer <jwt>`. El token se obtiene en `/api/auth/login`.
- **Cuerpo:** JSON (`Content-Type: application/json`).
- **Respuesta:** `{ ok: true, ... }` en éxito; `{ ok: false, error }` con código HTTP adecuado en error.
- **Validación:** con zod; entrada inválida → `400`.
- **Coordenadas:** `lat` / `lng` en grados decimales (WGS84).

## `/api/auth`

| Método | Ruta | Auth | Cuerpo | Devuelve |
|--------|------|------|--------|----------|
| POST | `/register` | — | `{ name, email, phone?, password, role? }` (`role`: `passenger`\|`driver`) | `{ ok, token, user }` |
| POST | `/login` | — | `{ email, password }` | `{ ok, token, user }` |

`user = { id, name, email, role }`. Token válido 30 días.

## `/api/trips`

| Método | Ruta | Auth | Cuerpo / Query | Descripción |
|--------|------|------|----------------|-------------|
| POST | `/estimate` | sesión | `{ origin_lat, origin_lng, dest_lat, dest_lng }` | Ruta real → `{ distance_km, minutes, fare, geometry, routed }` |
| POST | `/route` | sesión | `{ origin_lat, origin_lng, dest_lat, dest_lng, steps? }` | `{ geometry, distance_km, minutes, routed, steps }`. Con `steps:true` incluye maniobras giro a giro |
| POST | `/request` | passenger | `{ origin_lat, origin_lng, dest_lat, dest_lng, origin_address?, dest_address?, notes? }` | Crea el viaje, calcula tarifa, avisa a conductores |
| GET | `/active` | passenger | — | Viaje activo del pasajero (o `null`) |
| POST | `/cancel` | passenger | `{ trip_id }` | Cancela y libera al conductor |
| GET | `/history` | passenger | — | Historial de viajes del pasajero |
| POST | `/rate` | sesión | `{ trip_id, score, comment? }` | Calificación 1–5 |
| GET | `/pending` | driver | — | Solicitudes disponibles cerca |
| POST | `/accept` | driver | `{ trip_id }` | Toma el viaje (`accepted`) |
| POST | `/status` | driver | `{ trip_id, status }` | Avanza estado: `arrived` → `in_progress` → `completed` |
| GET | `/current` | driver | — | Viaje en curso del conductor (o `null`) |

`routed` es `true` cuando la ruta viene de un motor real (OSRM/Google) y `false` si es la línea recta de respaldo. Cada `step` de `/route`: `{ lat, lng, instruction, type, modifier, distance, name }`.

## `/api/geo`

| Método | Ruta | Auth | Query | Descripción |
|--------|------|------|-------|-------------|
| GET | `/search` | sesión | `q`, `viewbox?` | Autocompletado de direcciones (Photon). `viewbox` sesga a la zona del mapa |
| GET | `/reverse` | sesión | `lat`, `lng` | Coordenada → dirección legible |

## `/api/company` (portal de empresa cliente, rol `company`)

| Método | Ruta | Auth | Query | Descripción |
|--------|------|------|-------|-------------|
| GET | `/summary` | company | `from?`, `to?` | Totales de facturación de SU empresa (servicios, total, pagado, pendiente) |
| GET | `/trips` | company | `from?`, `to?` | Lista de servicios facturados a SU empresa (solo lectura) |

> El `company_id` se resuelve desde el usuario en el servidor; un usuario `company` nunca ve datos de otra empresa.

## `/api/admin`

> Todas devuelven `{ ok: true, ... }`. Ver nota de autorización en [08 · Security](../08-security/README.md).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/stats` | Totales rápidos (usuarios, conductores, viajes, etc.) |
| GET | `/analytics` | KPIs + series: diaria, por estado, por hora, por día de semana, top conductores, por empresa |
| GET | `/drivers_map` | Posición actual de conductores para el mapa en vivo |
| GET | `/users` | Lista de usuarios (con empresa) |
| POST | `/toggle_user` | Activa/inactiva un usuario |
| POST | `/user_save` | Crea/edita usuario (incluye `company_id`, upsert de `drivers`) |
| POST | `/user_delete` | Elimina usuario (bloquea auto-eliminación) |
| GET | `/settings` | Tarifas globales |
| POST | `/settings_save` | Guarda tarifas globales (recarga caché) |
| GET | `/companies` | Empresas cliente |
| POST | `/company_save` | Crea/edita empresa (con tarifas por contrato) |
| POST | `/company_delete` | Elimina empresa |
| GET | `/vehicles` | Vehículos |
| POST | `/vehicle_save` | Crea/edita vehículo |
| POST | `/vehicle_delete` | Elimina vehículo |
| POST | `/assign_vehicle` | Asigna vehículo a conductor |
| GET | `/trips` | Reporte de viajes con filtros: `from`, `to`, `status`, `driver_id`, `company_id` |

## Eventos Socket.IO

Conexión autenticada: el cliente pasa el JWT en el handshake → `io({ auth: { token } })`. Salas: `user:{id}`, `trip:{id}`, `drivers:online`, `admins` (`apps/api/src/events.ts`).

### Cliente → Servidor

| Evento | Payload | Emisor | Efecto |
|--------|---------|--------|--------|
| `driver:online` | `{ online }` | driver | Cambia disponibilidad; no baja a offline si está en viaje |
| `driver:location` | `{ lat, lng, heading? }` | driver | Persiste en PostGIS + Redis GEO; reenvía a la sala del viaje y a admins |
| `trip:join` | `{ trip_id }` | driver/passenger | Entra a la sala del viaje |
| `trip:leave` | `{ trip_id }` | driver/passenger | Sale de la sala |

### Servidor → Cliente

| Evento | Payload | Destino | Significado |
|--------|---------|---------|-------------|
| `trip:new` | viaje | `drivers:online` | Hay una nueva solicitud |
| `trip:update` | `{ trip_id, status }` | `user:{id}` | Cambió el estado del viaje (aceptado, en curso, cancelado…) |
| `driver:location` | `{ lat, lng, heading }` | `trip:{id}` | El pasajero ve moverse al conductor |
| `driver:status` | `{ status }` | socket del conductor | Confirma disponibilidad |
| `admin:driver_location` | `{ user_id, lat, lng, status }` | `admins` | Actualiza el mapa en vivo |
| `admin:refresh` | `{ reason }` | `admins` | Señal para refrescar el panel (nuevo/cancel/accept/status) |

## Ejemplo rápido

```bash
# 1) Login
curl -s https://flota.simarp.net/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pasajero@demo.cl","password":"secreta"}'

# 2) Estimar un viaje (usar el token del paso 1)
curl -s https://flota.simarp.net/api/trips/estimate \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"origin_lat":-33.045,"origin_lng":-71.62,"dest_lat":-33.025,"dest_lng":-71.64}'
```
