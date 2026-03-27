-- ============================================================
-- ROLLBACK COMPLETO — PTI Inspect v2.5.86 → v2.5.85
-- Revierte TODOS los cambios de la versión colaborativa.
-- Correr en Supabase SQL Editor de PRODUCCIÓN si necesitas
-- volver al estado anterior.
-- ============================================================

-- ── 1. Revertir columnas colaborativas en submissions ────────
ALTER TABLE public.submissions
  DROP COLUMN IF EXISTS assigned_to,
  DROP COLUMN IF EXISTS assignment_version,
  DROP COLUMN IF EXISTS assigned_at;

-- ── 2. Eliminar función claim_form ───────────────────────────
DROP FUNCTION IF EXISTS public.claim_form(UUID, TEXT, INT);

-- ── 3. Revertir policy visits_select en site_visits ─────────
--    (se completa después de ver el USING actual con la query de verificación)
--    Plantilla — reemplaza <USING_ORIGINAL> con lo que devuelva la query:
--
-- La policy visits_select NO fue modificada en v2.5.86.
-- Ya permitía ver órdenes del mismo org_code. No requiere rollback.
-- Texto original (documentado aquí por referencia):
--
-- DROP POLICY IF EXISTS visits_select ON public.site_visits;
-- CREATE POLICY visits_select ON public.site_visits
--   FOR SELECT TO public
--   USING (
--     (get_my_role() = 'admin'::text)
--     OR (org_code IN (
--       SELECT companies.org_code FROM companies
--       WHERE companies.id = get_my_company_id()
--     ))
--   );

-- ── 4. Verificación post-rollback ────────────────────────────
-- Confirmar que las columnas ya no existen:
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'submissions'
  AND column_name IN ('assigned_to','assignment_version','assigned_at');
-- Debe devolver 0 filas.

-- Confirmar que la función ya no existe:
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'claim_form';
-- Debe devolver 0 filas.
