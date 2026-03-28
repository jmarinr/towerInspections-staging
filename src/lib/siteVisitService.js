/**
 * Site Visit Service — v2.5.86 (collaborative inspection)
 */
import { supabase } from './supabaseClient'
import { getDeviceId } from './deviceId'

export async function createSiteVisit({ orderNumber, siteId, siteName, siteRef, regionId, session, lat, lng }) {
  const deviceId = getDeviceId()
  const orgCode = session?.orgCode || 'PTI'
  const row = {
    org_code: orgCode, order_number: orderNumber, site_id: siteId,
    site_name: siteName, device_id: deviceId,
    inspector_username: session.username, inspector_name: session.name || null,
    inspector_role: session.role || null, start_lat: lat || null, start_lng: lng || null,
    status: 'open', started_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('site_visits').insert(row).select().single()
  if (error) throw error
  return data
}

export async function fetchOpenVisits(inspectorUsername) {
  const { data, error } = await supabase
    .from('site_visits').select('*')
    .eq('inspector_username', inspectorUsername).eq('status', 'open')
    .order('started_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Fetch open visits from same org, excluding own — for Mi Equipo tab */
export async function fetchCompanyOpenVisits(orgCode, excludeUsername) {
  const { data, error } = await supabase
    .from('site_visits')
    .select('id, order_number, site_id, site_name, inspector_username, inspector_name, started_at, status')
    .eq('org_code', orgCode).eq('status', 'open')
    .neq('inspector_username', excludeUsername)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function searchVisitByOrder(orderNumber, inspectorUsername) {
  const { data, error } = await supabase
    .from('site_visits').select('*')
    .eq('order_number', orderNumber).eq('inspector_username', inspectorUsername).eq('status', 'open')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function closeSiteVisit(visitId, { lat, lng } = {}) {
  const { data, error } = await supabase
    .from('site_visits')
    .update({ status: 'closed', closed_at: new Date().toISOString(), end_lat: lat || null, end_lng: lng || null })
    .eq('id', visitId).select().single()
  if (error) throw error
  return data
}

/** v2.5.86: includes assignment columns */
export async function fetchVisitSubmissions(visitId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, form_code, finalized, payload, updated_at, assigned_to, assignment_version, assigned_at')
    .eq('site_visit_id', visitId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) return []

  // Deduplicate: one row per form_code — prefer assigned row > most recently updated
  const seen = new Map()
  for (const row of data) {
    const existing = seen.get(row.form_code)
    if (!existing) {
      seen.set(row.form_code, row)
    } else if (row.assigned_to && !existing.assigned_to) {
      // Prefer the assigned row
      seen.set(row.form_code, row)
    }
  }
  return Array.from(seen.values())
}

/** Lightweight poll — assignment info + minimal data indicator */
export async function fetchVisitAssignments(visitId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, form_code, finalized, assigned_to, assignment_version, assigned_at, updated_at')
    .eq('site_visit_id', visitId)
  if (error) throw error
  // Mark each row with hasData=true if it was updated (has real content)
  // We infer this from updated_at > created_at-ish (any activity means data exists)
  return (data || []).map(s => ({
    ...s,
    // Treat any non-finalized submission as having data (it was saved at least once)
    _hasData: true,
  }))
}

export async function fetchSubmissionAssets(submissionIds) {
  if (!submissionIds || !submissionIds.length) return {}
  const { data, error } = await supabase
    .from('submission_assets').select('submission_id, asset_type, public_url')
    .in('submission_id', submissionIds)
  if (error) { console.warn('[siteVisitService] fetchSubmissionAssets failed', error?.message); return {} }
  const map = {}
  for (const row of (data || [])) {
    if (!map[row.submission_id]) map[row.submission_id] = []
    map[row.submission_id].push(row)
  }
  return map
}

export async function fetchSubmissionForForm(visitId, formCode) {
  // Fetch all rows — prefer assigned row > most recently updated
  const { data, error } = await supabase
    .from('submissions')
    .select('id, form_code, finalized, payload, updated_at, assigned_to, assignment_version, assigned_at')
    .eq('site_visit_id', visitId).eq('form_code', formCode)
    .order('updated_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) return null
  const assigned = data.find(r => r.assigned_to)
  return assigned || data[0]
}

/**
 * Atomically claim or reassign a form.
 * Returns true if claim succeeded, false if race condition (version mismatch).
 */
export async function claimFormRPC(submissionId, username, currentVersion) {
  const { data, error } = await supabase.rpc('claim_form', {
    p_submission_id: submissionId,
    p_username: username,
    p_current_version: currentVersion ?? 0,
  })
  if (error) throw error
  return data
}
