/**
 * Site Catalog Service
 * v2.8.0 — soporta restricción del inspector por `app_user_regions`.
 *
 * Lógica de scope para inspector:
 *   1) Carga company_id del usuario.
 *   2) Carga app_user_regions del usuario (sus regiones específicas asignadas).
 *   3) Calcula regiones efectivas:
 *        - Si hay filas en app_user_regions → solo esas (intersección con
 *          company_regions por seguridad).
 *        - Si no hay filas → todas las regiones de company_regions (heredado).
 *   4) Devuelve sitios activos en esas regiones efectivas.
 *
 * RLS de Supabase ya bloquea sitios de regiones/empresas internal, así que
 * el filtro aquí es funcional, no de seguridad.
 */
import { supabase } from './supabaseClient'

/**
 * Resuelve las regiones efectivas del usuario actual.
 * Retorna { regionIds: uuid[], scopeMode: 'assigned' | 'inherited' | 'none' }
 */
export async function resolveEffectiveRegions() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // 1) company_id
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (userError) throw userError
  if (!userData?.company_id) {
    return { regionIds: [], scopeMode: 'none' }
  }

  // 2) Regiones explícitamente asignadas al usuario
  const { data: userRegions, error: urErr } = await supabase
    .from('app_user_regions')
    .select('region_id')
    .eq('user_id', user.id)

  if (urErr) throw urErr

  // 3) Regiones de la empresa
  const { data: companyRegions, error: crErr } = await supabase
    .from('company_regions')
    .select('region_id')
    .eq('company_id', userData.company_id)

  if (crErr) throw crErr
  const companyRegionIds = (companyRegions || []).map(r => r.region_id)

  if (companyRegionIds.length === 0) {
    return { regionIds: [], scopeMode: 'none' }
  }

  if (!userRegions || userRegions.length === 0) {
    // Heredado: todas las regiones de la empresa
    return { regionIds: companyRegionIds, scopeMode: 'inherited' }
  }

  // Asignadas explícitas — pero intersectadas con company_regions
  // (defensa por si el modelo queda inconsistente en algún momento)
  const userRegionSet = new Set(userRegions.map(r => r.region_id))
  const effective = companyRegionIds.filter(id => userRegionSet.has(id))
  return { regionIds: effective, scopeMode: 'assigned' }
}

/**
 * Devuelve los sitios activos disponibles para el inspector actual.
 * Sin parámetros — consulta el usuario logueado vía supabase.auth.
 */
export async function fetchSitesDirect() {
  const { regionIds } = await resolveEffectiveRegions()
  if (regionIds.length === 0) return []

  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, site_id, name, province, height_m, lat, lng, region_id')
    .in('region_id', regionIds)
    .eq('active', true)
    .order('site_id')

  if (error) throw error
  return sites || []
}

/**
 * Devuelve las regiones disponibles al inspector actual, ordenadas por nombre.
 * Si tiene `app_user_regions`, son solo esas. Si no, son todas las de su empresa.
 */
export async function fetchRegionsForUser() {
  const { regionIds } = await resolveEffectiveRegions()
  if (regionIds.length === 0) return []

  const { data, error } = await supabase
    .from('regions')
    .select('id, name')
    .in('id', regionIds)
    .order('name')

  if (error) throw error
  return data || []
}

// ─── Funciones legacy mantenidas por compatibilidad ──────────────────────────
// Estas funciones se mantienen exportadas pero usan la nueva lógica internamente.
// No tocan el comportamiento de quien las llamaba.

export async function fetchSitesForInspector() {
  return fetchSitesDirect()
}

export async function fetchAvailableSites() {
  return fetchSitesDirect()
}
