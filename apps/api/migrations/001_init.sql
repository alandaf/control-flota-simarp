-- =====================================================================
-- Control Flota — esquema inicial (PostgreSQL + PostGIS)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---- Usuarios --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    phone         VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(12) NOT NULL DEFAULT 'passenger'
                  CHECK (role IN ('passenger','driver','admin')),
    status        VARCHAR(12) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Vehículos -------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id         SERIAL PRIMARY KEY,
    plate      VARCHAR(15) NOT NULL UNIQUE,
    brand      VARCHAR(60) NOT NULL,
    model      VARCHAR(60) NOT NULL,
    color      VARCHAR(40),
    year       SMALLINT,
    capacity   SMALLINT NOT NULL DEFAULT 4,
    status     VARCHAR(14) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available','in_use','maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Conductores (1:1 con users role=driver) -------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license      VARCHAR(40),
    vehicle_id   INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    status       VARCHAR(10) NOT NULL DEFAULT 'offline'
                 CHECK (status IN ('offline','available','busy')),
    location     GEOGRAPHY(Point, 4326),         -- última posición conocida
    heading      REAL,                            -- rumbo en grados (opcional)
    rating_avg   NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    trips_count  INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers (status);

-- ---- Viajes ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id             SERIAL PRIMARY KEY,
    passenger_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    origin         GEOGRAPHY(Point, 4326) NOT NULL,
    destination    GEOGRAPHY(Point, 4326) NOT NULL,
    origin_address VARCHAR(255),
    dest_address   VARCHAR(255),
    status         VARCHAR(12) NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested','accepted','arrived','in_progress','completed','cancelled')),
    distance_km    NUMERIC(6,2),
    fare           INTEGER,
    notes          VARCHAR(255),
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at    TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_passenger ON trips (passenger_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips (driver_id);

-- ---- Calificaciones --------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id           SERIAL PRIMARY KEY,
    trip_id      INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score        SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment      VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
