-- =====================================================================
-- Control Flota — módulo de facturación B2B: folio y estado de pago
-- Idempotente (se puede correr varias veces).
-- =====================================================================

-- Correlativo de folio (N° de servicio) para viajes facturables
CREATE SEQUENCE IF NOT EXISTS trip_folio_seq;

-- Folio único por servicio (se asigna al completar el viaje)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS folio INTEGER UNIQUE;

-- Estado de facturación del servicio
ALTER TABLE trips ADD COLUMN IF NOT EXISTS billing_status VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (billing_status IN ('pending', 'paid', 'void'));

-- Momento en que se marcó pagado
ALTER TABLE trips ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trips_billing ON trips (billing_status);

-- Backfill: asigna folio a los viajes ya completados sin folio, en orden cronológico
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM trips
    WHERE status = 'completed' AND folio IS NULL
    ORDER BY COALESCE(completed_at, requested_at), id
  LOOP
    UPDATE trips SET folio = nextval('trip_folio_seq') WHERE id = r.id;
  END LOOP;
END $$;
