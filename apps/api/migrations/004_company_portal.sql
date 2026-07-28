-- =====================================================================
-- Control Flota — portal de empresa cliente: nuevo rol 'company'
-- Un usuario 'company' pertenece a una empresa (users.company_id) y solo
-- puede ver, en modo lectura, los servicios facturados a esa empresa.
-- Idempotente.
-- =====================================================================

-- Reemplaza el CHECK de rol para admitir 'company' (busca el nombre real del
-- constraint para no depender de la convención de nombres).
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('passenger', 'driver', 'admin', 'company'));
