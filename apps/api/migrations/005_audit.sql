-- =====================================================================
-- Control Flota — bitácora de auditoría de acciones de administración
-- Registra quién hizo qué y cuándo (usuarios, tarifas, empresas, vehículos,
-- facturación). Idempotente.
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id         SERIAL PRIMARY KEY,
    actor_id   INTEGER,                 -- usuario que ejecutó la acción (puede quedar huérfano)
    actor_name VARCHAR(120),            -- nombre al momento de la acción (histórico estable)
    action     VARCHAR(40) NOT NULL,    -- p.ej. user_create, user_delete, settings_save
    entity     VARCHAR(40),             -- user | company | vehicle | settings | trip
    entity_id  INTEGER,
    detail     TEXT,                    -- descripción legible
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);
