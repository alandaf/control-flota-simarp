-- =====================================================================
-- Control Flota — suscripciones de notificaciones push (Web Push / VAPID)
-- Cada dispositivo/navegador registra su suscripción para recibir avisos
-- aunque la app esté cerrada. Idempotente.
-- =====================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,     -- URL única del push service del navegador
    p256dh     TEXT NOT NULL,            -- clave pública del cliente (cifrado)
    auth       TEXT NOT NULL,            -- secreto de autenticación del cliente
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);
