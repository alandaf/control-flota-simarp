# 01 · Producto

## Roles

El rol vive en `users.role` y se refuerza en el backend con `authGuard(role)` (`apps/api/src/auth.ts`).

| Rol | Puede | Pantalla |
|-----|-------|----------|
| `passenger` | Pedir viaje, ver conductor en vivo, cancelar, calificar, ver historial | `apps/web/src/pages/Passenger.tsx` |
| `driver` | Ver solicitudes, aceptar, navegar, cambiar estado, calificar | `apps/web/src/pages/Driver.tsx` |
| `admin` | CRUD de usuarios/vehículos/empresas, tarifas, mapa en vivo, dashboard y reportes | `apps/web/src/pages/Admin.tsx` |

## Ciclo de vida de un viaje

Estados en `trips.status` (constraint en `apps/api/migrations/001_init.sql`):

```
requested ──accept──▶ accepted ──"llegué"──▶ arrived ──"iniciar"──▶ in_progress ──"finalizar"──▶ completed
    │
    └── cancel ──▶ cancelled
```

| Estado | Quién lo dispara | Qué pasa |
|--------|------------------|----------|
| `requested` | Pasajero (`POST /api/trips/request`) | Se calcula tarifa y se avisa a conductores en línea (`trip:new`) |
| `accepted` | Conductor (`POST /api/trips/accept`) | Se asigna conductor; el pasajero recibe `trip:update` |
| `arrived` | Conductor (`POST /api/trips/status`) | El conductor llegó al punto de recogida |
| `in_progress` | Conductor | Viaje en curso; la ruta cambia a origen→destino |
| `completed` | Conductor | Se cierra el servicio; queda para reportes/facturación |
| `cancelled` | Pasajero (`POST /api/trips/cancel`) | Libera al conductor |

Detalle de endpoints y payloads: [06 · API](../06-api/README.md).

## Flujos principales

### Pasajero pide un viaje
1. Fija **origen** y **destino** (buscador, tocar el mapa o arrastrar el pin).
2. La app estima **distancia, tiempo y tarifa** (`POST /api/trips/estimate`).
3. Confirma → `POST /api/trips/request`.
4. Ve al conductor acercarse en el mapa con **ETA** en vivo.

### Conductor atiende
1. Se pone **en línea** (`driver:online`).
2. Recibe la solicitud (`trip:new`) y **acepta**.
3. Navega hacia el pasajero (tramo de **recogida**, ruta verde) con guía giro a giro y voz (`apps/web/src/components/NavGuide.tsx`).
4. Marca **"Llegué"** → **"Iniciar"** → navega al destino (ruta azul) → **"Finalizar"**.

### Administrador
- **Dashboard:** 10 KPIs, tendencia diaria, viajes por estado/hora/día, ranking de conductores, ingresos por empresa.
- **Mapa en vivo:** posición de todos los conductores.
- **Reportes:** filtros por fecha/estado/conductor/empresa, export CSV e impresión.
- **Administración:** usuarios, vehículos, empresas y tarifas (global y por empresa).

## Tarifas y facturación

La tarifa se calcula en `apps/api/src/fare.ts`:

```
tarifa = max(minimum, redondeo50(base + km·per_km + min·per_min))
```

- Valores **globales** en la tabla `settings` (semilla: base 800, per_km 550, per_min 90, mínimo 1500 CLP).
- Una **empresa cliente** puede tener tarifas negociadas que sobrescriben las globales (`companies.fare_*`).
- Al crear el viaje se resuelve la tarifa del pasajero con `tariffForUser()` (`apps/api/src/tariffs.ts`) y se guarda `trips.company_id` para un historial estable.

## Requisitos no funcionales

- **Tiempo real:** actualización de ubicación cada ~3 s; propagación por Socket.IO.
- **Precisión de ruta:** ruta por calle real; degrada a línea recta solo si no hay motor disponible.
- **Móvil:** funciona con pantalla encendida durante el viaje (Wake Lock) y con voz opcional.
- **Zona horaria:** reportes en `America/Santiago`.
