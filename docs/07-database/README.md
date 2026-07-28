# 07 · Base de datos

**PostgreSQL 16 + PostGIS 3.4.** Esquema en `apps/api/migrations`, aplicado automáticamente al arrancar la API (idempotente).

## Migraciones

| Archivo | Contenido |
|---------|-----------|
| `001_init.sql` | Extensión PostGIS, tablas base: `users`, `vehicles`, `drivers`, `trips`, `ratings` |
| `002_business.sql` | `settings`, `companies`, y columnas `company_id` en `users` y `trips` |

Para agregar cambios: crear `003_*.sql` idempotente (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). No se editan migraciones ya aplicadas.

## Modelo

```
companies ──1:N──▶ users ──1:1──▶ drivers ──N:1──▶ vehicles
                     │                 │
                     │ passenger_id    │ driver_id
                     ▼                 ▼
                          trips ──1:N──▶ ratings
                            │
                            └── company_id ──▶ companies (denormalizado)
```

## Tablas

### `users`
`id`, `name`, `email` (único), `phone`, `password_hash`, `role` (`passenger|driver|admin`), `status` (`active|inactive`), `company_id?`, `created_at`.

### `vehicles`
`id`, `plate` (único), `brand`, `model`, `color`, `year`, `capacity` (def. 4), `status` (`available|in_use|maintenance`), `created_at`.

### `drivers` (1:1 con `users` de rol `driver`)
`id`, `user_id` (único, FK), `license`, `vehicle_id?` (FK), `status` (`offline|available|busy`), `location GEOGRAPHY(Point,4326)`, `heading`, `rating_avg` (def. 5.00), `trips_count`, `updated_at`.
Índices: **GIST** sobre `location`, y sobre `status`.

### `trips`
`id`, `passenger_id` (FK), `driver_id?` (FK), `origin`/`destination GEOGRAPHY(Point,4326)`, `origin_address`, `dest_address`, `status` (`requested|accepted|arrived|in_progress|completed|cancelled`), `distance_km`, `fare` (entero, CLP), `notes`, `company_id?`, y marcas de tiempo `requested_at` / `accepted_at` / `started_at` / `completed_at`.
Índices: `status`, `passenger_id`, `driver_id`, `company_id`.

### `ratings`
`id`, `trip_id` (FK), `from_user_id`, `to_user_id`, `score` (1–5), `comment`, `created_at`.

### `settings` (clave-valor)
Tarifas globales sembradas: `fare_base=800`, `fare_per_km=550`, `fare_per_min=90`, `fare_minimum=1500` (CLP).

### `companies` (empresas cliente)
Datos de contrato + tarifas negociadas `fare_base` / `fare_per_km` / `fare_per_min` / `fare_minimum` (NULL = usa las globales), `active`.

## Geografía (PostGIS)

- Posiciones como `geography(Point, 4326)`.
- **Escritura:** `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` (ojo: **lng primero**).
- **Lectura:** `ST_Y(col::geometry) AS lat`, `ST_X(col::geometry) AS lng`.
- **Cercanía:** índice GIST sobre `drivers.location`; en vivo se complementa con Redis GEO (ver [09](../09-integrations/README.md)).

## Zona horaria

Los reportes agregan en `America/Santiago` (los `TIMESTAMPTZ` se almacenan en UTC y se convierten al consultar).

## Respaldo / restauración

```bash
# Backup (dentro del VPS)
docker exec flota_db pg_dump -U $POSTGRES_USER $POSTGRES_DB > flota_$(date +%F).sql
# Restore
cat flota_YYYY-MM-DD.sql | docker exec -i flota_db psql -U $POSTGRES_USER $POSTGRES_DB
```

> Los datos persisten en un volumen de Docker. **No** borrar el volumen al recrear el stack o se pierde la base (ya ocurrió una vez con un nombre de DB equivocado).
