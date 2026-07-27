-- =====================================================================
-- Control Flota — módulo de negocio: tarifas, empresas cliente
-- Idempotente (se puede correr varias veces).
-- =====================================================================

-- ---- Configuración global (tarifas, etc.) ----
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES
    ('fare_base', '800'), ('fare_per_km', '550'),
    ('fare_per_min', '90'), ('fare_minimum', '1500')
ON CONFLICT (key) DO NOTHING;

-- ---- Empresas cliente (a quién se le factura el servicio) ----
CREATE TABLE IF NOT EXISTS companies (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(160) NOT NULL,
    rut           VARCHAR(20),
    contact_name  VARCHAR(120),
    contact_email VARCHAR(160),
    contact_phone VARCHAR(30),
    address       VARCHAR(255),
    -- Tarifas negociadas por contrato (NULL = usa las globales)
    fare_base     INTEGER,
    fare_per_km   INTEGER,
    fare_per_min  INTEGER,
    fare_minimum  INTEGER,
    active        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un pasajero puede pertenecer a una empresa cliente
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
-- El servicio guarda a qué empresa se factura (denormalizado para historial estable)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_company ON trips (company_id);
