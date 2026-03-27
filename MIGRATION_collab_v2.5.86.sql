-- ============================================================
-- PTI Inspect v2.5.86 — Feature Colaborativo
-- Correr en Supabase SQL Editor de PRODUCCIÓN
-- ============================================================

-- 1. Columnas colaborativas en submissions (si no existen ya)
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS assigned_to        TEXT,
  ADD COLUMN IF NOT EXISTS assignment_version INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ;

-- 2. Función RPC claim_form (ya creada, este es el upsert por si acaso)
CREATE OR REPLACE FUNCTION public.claim_form(
  p_submission_id   UUID,
  p_username        TEXT,
  p_current_version INT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_updated INT;
BEGIN
  UPDATE public.submissions
  SET assigned_to        = p_username,
      assignment_version = assignment_version + 1,
      assigned_at        = now()
  WHERE id                 = p_submission_id
    AND assignment_version = p_current_version
    AND finalized          = false;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_form TO authenticated;

-- 3. Actualizar RLS de site_visits para permitir que inspectores
--    de la misma empresa vean órdenes de sus colegas (necesario para Mi Equipo)
--    NOTA: Ajusta el nombre de la policy según lo que tengas en producción.
--    Si ya tienes una policy de SELECT, modifícala en lugar de crear una nueva.

-- Opción A: Si ya existe una policy, dropearla y recrear:
-- DROP POLICY IF EXISTS "site_visits_select_own" ON public.site_visits;

-- Opción B: Crear nueva policy de SELECT para same-org (solo si no existe):
-- CREATE POLICY "site_visits_select_same_org"
--   ON public.site_visits FOR SELECT TO authenticated
--   USING (
--     inspector_username = (
--       SELECT username FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1
--     )
--     OR
--     org_code = (
--       SELECT c.org_code FROM public.companies c
--       JOIN public.app_users u ON u.company_id = c.id
--       WHERE u.auth_user_id = auth.uid() LIMIT 1
--     )
--   );

-- NOTA IMPORTANTE: Si las RLS de site_visits en producción solo permiten
-- ver las propias órdenes, la tab "Mi Equipo" devolverá 0 resultados.
-- Necesitas actualizar esa policy para que el feature funcione.
-- Ver Supabase Dashboard → Authentication → Policies → site_visits

-- 4. Rollback (por si necesitas deshacer)
-- ALTER TABLE public.submissions
--   DROP COLUMN IF EXISTS assigned_to,
--   DROP COLUMN IF EXISTS assignment_version,
--   DROP COLUMN IF EXISTS assigned_at;
-- DROP FUNCTION IF EXISTS public.claim_form(UUID, TEXT, INT);
