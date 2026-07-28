# DB-0001 · Modelo de datos

| Campo | Valor |
|-------|-------|
| **Código** | DB-0001 |
| **Versión** | 1.0 |
| **Estado** | Aprobado |
| **Dueño** | Ingeniería / Datos |
| **Fecha** | 2026-07-27 |
| **Fuente** | `apps/api/migrations/001_init.sql`, `002_business.sql`, `003_billing.sql` |

---

## 1. Motor y principios
- **PostgreSQL 16 + PostGIS 3.4.**
- Posiciones como `geography(Point, 4326)` (WGS84).
- Migraciones **idempotentes** aplicadas al arranque de la API.
- Integridad por claves foráneas y `CHECK` de enumeraciones.

## 2. Diagrama entidad-relación

```
companies (1) ───< (N) users (1) ───(1) drivers (N) >─── (1) vehicles
                      │                    │
       passenger_id   │                    │  driver_id
                      ▼                    ▼
                          trips (1) ───< (N) ratings
                            │
                    company_id (denormalizado) ──> companies
```

## 3. Entidades

### 3.1 `users`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | serial PK | |
| name | varchar(120) | |
| email | varchar(160) | **único** |
| phone | varchar(30) | |
| password_hash | varchar(255) | bcrypt |
| role | varchar(12) | `passenger\|driver\|admin` |
| status | varchar(12) | `active\|inactive` |
| company_id | int FK→companies | `ON DELETE SET NULL` |
| created_at | timestamptz | |

### 3.2 `vehicles`
`id`, `plate` (único), `brand`, `model`, `color`, `year`, `capacity` (def. 4), `status` (`available\|in_use\|maintenance`), `created_at`.

### 3.3 `drivers` (1:1 con `users` rol driver)
| Columna | Tipo | Notas |
|---------|------|-------|
| id | serial PK | |
| user_id | int FK→users | **único**, `ON DELETE CASCADE` |
| license | varchar(40) | |
| vehicle_id | int FK→vehicles | `ON DELETE SET NULL` |
| status | varchar(10) | `offline\|available\|busy` |
| location | geography(Point,4326) | última posición |
| heading | real | rumbo (grados) |
| rating_avg | numeric(3,2) | def. 5.00 |
| trips_count | int | |
| updated_at | timestamptz | |

Índices: `GIST(location)`, `(status)`.

### 3.4 `trips`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | serial PK | |
| passenger_id | int FK→users | `ON DELETE CASCADE` |
| driver_id | int FK→users | `ON DELETE SET NULL` |
| origin / destination | geography(Point,4326) | NOT NULL |
| origin_address / dest_address | varchar(255) | |
| status | varchar(12) | `requested\|accepted\|arrived\|in_progress\|completed\|cancelled` |
| distance_km | numeric(6,2) | |
| fare | int | CLP |
| notes | varchar(255) | |
| company_id | int FK→companies | denormalizado para facturación estable |
| folio | int UNIQUE | N° de servicio; asignado desde `trip_folio_seq` al completar |
| billing_status | varchar(10) | `pending\|paid\|void` (def. `pending`) |
| paid_at | timestamptz | cuándo se marcó pagado |
| requested_at / accepted_at / started_at / completed_at | timestamptz | marcas del ciclo |

Índices: `(status)`, `(passenger_id)`, `(driver_id)`, `(company_id)`.

### 3.5 `ratings`
`id`, `trip_id` FK, `from_user_id` FK, `to_user_id` FK, `score` (1–5), `comment`, `created_at`.

### 3.6 `settings` (clave-valor)
Tarifas globales sembradas: `fare_base=800`, `fare_per_km=550`, `fare_per_min=90`, `fare_minimum=1500` (CLP).

### 3.7 `companies`
Datos de contrato + overrides de tarifa (`fare_base/per_km/per_min/minimum`, NULL = usa global), `active`.

## 4. Reglas de integridad y negocio en datos
- `role` y `status` acotados por `CHECK`.
- `drivers.user_id` único → 1:1 con usuario.
- Borrado de usuario pasajero → cascade a sus trips; borrado de conductor → trips conservan histórico con `driver_id NULL`.
- `trips.company_id` se copia al crear el viaje (no se recalcula) para un historial de facturación estable aunque el usuario cambie de empresa.

## 5. Convenciones geoespaciales
- **Escritura:** `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` (¡lng primero!).
- **Lectura:** `ST_Y(col::geometry) AS lat`, `ST_X(col::geometry) AS lng`.
- **Índice** GIST para consultas de proximidad; en vivo se complementa con Redis GEO.

## 6. Evolución del esquema
- Nuevos cambios = migración `003_*.sql` idempotente. No se editan migraciones aplicadas.
- Facturación B2B implementada en `003_billing.sql` (folio + estado pagado/pendiente sobre `trips`).
- Cambios candidatos (roadmap): tabla `invoices` formal (documento por período/empresa), `trip_events` (auditoría de estados), retención de ubicaciones históricas.

## 7. Respaldo
Ver [OPS-0001 §Backups](OPS-0001-operacion-despliegue.md). Nunca borrar el volumen de datos al recrear el stack.

## 8. Diccionario de estados
| Entidad | Campo | Valores |
|---------|-------|---------|
| users | role | passenger, driver, admin |
| users | status | active, inactive |
| vehicles | status | available, in_use, maintenance |
| drivers | status | offline, available, busy |
| trips | status | requested, accepted, arrived, in_progress, completed, cancelled |
