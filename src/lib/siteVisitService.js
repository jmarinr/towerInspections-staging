/**
 * Site Visit Service
 * Handles Supabase CRUD for the site_visits table.
 * Keeps all DB logic isolated from UI components.
 */
import { supabase } from './supabaseClient'
import { getDeviceId } from './deviceId'

/**
 * Create a new site visit (order)
 */
export async function createSiteVisit({ orderNumber, siteId, siteName, siteRef, regionId, session, lat, lng }) {
  const deviceId = getDeviceId()
  const orgCode = session?.orgCode || 'PTI'

  const row = {
    org_code: orgCode,
    order_number: orderNumber,
    site_id: siteId,
    site_name: siteName,
    device_id: deviceId,
    inspector_username: session.username,
    inspector_name: session.name || null,
    inspector_role: session.role || null,
    start_lat: lat || null,
    start_lng: lng || null,
    status: 'open',
    started_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('site_visits')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch open visits for the current inspector
 */
export async function fetchOpenVisits(inspectorUsername) {
  const { data, error } = await supabase
    .from('site_visits')
    .select('*')
    .eq('inspector_username', inspectorUsername)
    .eq('status', 'open')
    .order('started_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Search open visits by order number for a specific inspector
 */
export async function searchVisitByOrder(orderNumber, inspectorUsername) {
  const { data, error } = await supabase
    .from('site_visits')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('inspector_username', inspectorUsername)
    .eq('status', 'open')
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || null
}

/**
 * Close a site visit
 */
export async function closeSiteVisit(visitId, { lat, lng } = {}) {
  const { data, error } = await supabase
    .from('site_visits')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      end_lat: lat || null,
      end_lng: lng || null,
    })
    .eq('id', visitId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get submission counts for a visit (to show which forms are done)
 */
export async function fetchVisitSubmissions(visitId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, form_code, finalized, payload, updated_at')
    .eq('site_visit_id', visitId)

  if (error) throw error
  return data || []
}

/**
 * Fetch all submission_assets for a list of submission IDs.
 * Returns a map: { submissionId: [ { asset_type, public_url, ... } ] }
 */
export async function fetchSubmissionAssets(submissionIds) {
  if (!submissionIds || !submissionIds.length) return {}

  const { data, error } = await supabase
    .from('submission_assets')
    .select('submission_id, asset_type, public_url')
    .in('submission_id', submissionIds)

  if (error) {
    console.warn('[siteVisitService] fetchSubmissionAssets failed', error?.message)
    return {}
  }

  // Group by submission_id
  const map = {}
  for (const row of (data || [])) {
    if (!map[row.submission_id]) map[row.submission_id] = []
    map[row.submission_id].push(row)
  }
  return map
}

/**
 * Fetch a specific form submission for a visit.
 * Returns the payload data or null if not found.
 */
export async function fetchSubmissionForForm(visitId, formCode) {
  const { data, error } = await supabase
    .from('submissions')
    .select('form_code, finalized, payload, updated_at')
    .eq('site_visit_id', visitId)
    .eq('form_code', formCode)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}
