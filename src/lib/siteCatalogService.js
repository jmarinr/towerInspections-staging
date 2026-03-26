/**
 * Site Catalog Service
 * Loads sites available to the authenticated inspector
 * based on company → regions → sites relationship.
 */
import { supabase } from './supabaseClient'

/**
 * Fetch all active sites available to the current inspector.
 * Uses company_regions join to scope sites to inspector's company.
 */
export async function fetchAvailableSites() {
  const { data, error } = await supabase
    .from('sites')
    .select(`
      id,
      site_id,
      name,
      province,
      height_m,
      lat,
      lng,
      region_id,
      regions!inner (
        id,
        name
      ),
      company_regions!inner (
        company_id,
        companies!inner (
          id,
          app_users!inner (
            id
          )
        )
      )
    `)
    .eq('active', true)
    .order('site_id')

  if (error) throw error
  return data || []
}

/**
 * Simpler query using RLS — Supabase will scope via auth.uid()
 * This is the preferred query when RLS policies are in place.
 */
export async function fetchSitesForInspector() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase.rpc('get_sites_for_user', { user_id: user.id })

  if (error) {
    // Fallback: direct query if RPC not available
    return fetchSitesDirect()
  }
  return data || []
}

/**
 * Fetch regions available to the current inspector's company.
 * Returns array of { id, name } sorted by name.
 */
export async function fetchRegionsForUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userData?.company_id) throw new Error('Could not load user company')

  const { data, error } = await supabase
    .from('company_regions')
    .select('regions(id, name)')
    .eq('company_id', userData.company_id)

  if (error) throw error
  return (data || [])
    .map(r => r.regions)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Direct query — relies on Supabase RLS to scope correctly,
 * or falls back to fetching all active sites.
 */
export async function fetchSitesDirect() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // Get user's company_id
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userData?.company_id) throw new Error('Could not load user company')

  // Get regions for this company
  const { data: crData, error: crError } = await supabase
    .from('company_regions')
    .select('region_id')
    .eq('company_id', userData.company_id)

  if (crError) throw crError
  if (!crData || crData.length === 0) return []

  const regionIds = crData.map(r => r.region_id)

  // Get active sites in those regions
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, site_id, name, province, height_m, lat, lng, region_id')
    .in('region_id', regionIds)
    .eq('active', true)
    .order('site_id')

  if (sitesError) throw sitesError
  return sites || []
}
