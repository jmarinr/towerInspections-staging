import { supabase } from './supabaseClient'
import { normalizeFormCode, getFormCodeSiblings } from '../data/formTypes'

/**
 * The submissions table has columns:
 *   id, org_code, device_id, form_code, form_version, app_version,
 *   payload (jsonb), created_at, updated_at, last_saved_at
 *
 * The `payload` column contains:
 *   {
 *     org_code, device_id, form_code, app_version, form_version,
 *     _meta: { last_saved_at },
 *     payload: {                   ← inner payload
 *       meta: { lat, lng, date, time, startedAt },
 *       data: { formData, checklistData, photos, ... },
 *       submitted_by: { name, role, username },
 *       submitted_at,
 *       autosave_bucket
 *     }
 *   }
 *
 * Some fields exist BOTH as DB columns AND inside `payload` (org_code, form_code, etc).
 * We use SELECT * and normalize in the store/UI.
 */

/**
 * Fetch all submissions.
 */
export async function fetchSubmissions({ formCode, limit = 200 } = {}) {
  let query = supabase
    .from('submissions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (formCode && formCode !== 'all') {
    query = query.eq('form_code', formCode)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || [])
    .map(normalizeSubmission)
    // Filter out ghost rows created by ensureSubmissionId (empty payload, no real data)
    .filter(s => {
      const p = s.payload || {}
      const inner = p.payload || p
      // Keep if has actual form data or has been saved with real payload
      return inner.data || inner.meta || p._meta || p.form_code
    })
}

/**
 * Fetch a single submission by ID.
 */
export async function fetchSubmissionById(id) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return normalizeSubmission(data)
}

/**
 * Fetch all assets (photos) for a given submission.
 */
export async function fetchSubmissionAssets(submissionId) {
  const { data, error } = await supabase
    .from('submission_assets')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch submission + its assets.
 *
 * IMPORTANT: Due to a code mismatch in the inspector app, assets may be linked
 * to a "sibling" submission row. The inspector writes form data with Spanish
 * form codes (e.g. 'mantenimiento') but uploads assets under English codes
 * (e.g. 'preventive-maintenance'). These are different rows in the DB.
 * We search across BOTH code variants and all sibling submissions.
 */
export async function fetchSubmissionWithAssets(id) {
  const submission = await fetchSubmissionById(id)

  // 1) Direct assets
  let assets = await fetchSubmissionAssets(id)

  // 2) If none found, search sibling submissions (same device, any form code variant)
  if (assets.length === 0 && submission) {
    try {
      const { org_code, device_id, form_code } = submission
      if (org_code && device_id && form_code) {
        // Get all form code variants (Spanish + English)
        // using static import
        const siblingCodes = getFormCodeSiblings(form_code)
        const allCodes = [form_code, ...siblingCodes]

        // Find all submissions with same device and any code variant
        const { data: siblings } = await supabase
          .from('submissions')
          .select('id')
          .eq('org_code', org_code)
          .eq('device_id', device_id)
          .in('form_code', allCodes)
          .neq('id', id)

        if (siblings?.length) {
          const { data: siblingAssets } = await supabase
            .from('submission_assets')
            .select('*')
            .in('submission_id', siblings.map(s => s.id))
            .order('created_at', { ascending: true })

          if (siblingAssets?.length) assets = siblingAssets
        }
      }
    } catch (e) {
      console.warn('[Admin] Sibling asset lookup failed:', e?.message)
    }
  }

  return { submission, assets }
}

// ═══════════════════════════════════════════
// SITE VISITS (Orders)
// ═══════════════════════════════════════════

/**
 * Fetch all site visits (orders).
 */
export async function fetchSiteVisits({ status, limit = 200 } = {}) {
  let query = supabase
    .from('site_visits')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Fetch a single site visit by ID.
 */
export async function fetchSiteVisitById(id) {
  const { data, error } = await supabase
    .from('site_visits')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch submissions linked to a specific site visit.
 * Filters out NIL UUID submissions (those without a real order).
 */
export async function fetchSubmissionsForVisit(visitId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('site_visit_id', visitId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeSubmission)
}

/**
 * Fetch all submissions for an order detail, including their assets.
 * Searches sibling form code variants (Spanish/English) to find assets.
 */
export async function fetchSubmissionsWithAssetsForVisit(visitId) {
  const submissions = await fetchSubmissionsForVisit(visitId)

  const withAssets = await Promise.all(
    submissions.map(async (sub) => {
      try {
        let assets = await fetchSubmissionAssets(sub.id)

        if (assets.length === 0 && sub.org_code && sub.device_id && sub.form_code) {
          const siblingCodes = getFormCodeSiblings(sub.form_code)
          const allCodes = [sub.form_code, ...siblingCodes]

          const { data: siblings } = await supabase
            .from('submissions')
            .select('id')
            .eq('org_code', sub.org_code)
            .eq('device_id', sub.device_id)
            .in('form_code', allCodes)
            .neq('id', sub.id)

          if (siblings?.length) {
            const { data: siblingAssets } = await supabase
              .from('submission_assets')
              .select('*')
              .in('submission_id', siblings.map(s => s.id))
              .order('created_at', { ascending: true })

            if (siblingAssets?.length) assets = siblingAssets
          }
        }

        return { ...sub, assets }
      } catch {
        return { ...sub, assets: [] }
      }
    })
  )
  return withAssets
}

/**
 * Dashboard stats.
 */
export async function fetchDashboardStats() {
  // Fetch both tables in parallel
  const [subRes, visitRes] = await Promise.all([
    supabase.from('submissions').select('*').order('updated_at', { ascending: false }),
    supabase.from('site_visits').select('*').order('started_at', { ascending: false }).then(r => r).catch(() => ({ data: [], error: null })),
  ])

  if (subRes.error) throw subRes.error
  const rows = (subRes.data || []).map(normalizeSubmission)
    // Filter out ghost rows (empty payload from ensureSubmissionId)
    .filter(s => {
      const p = s.payload || {}
      const inner = p.payload || p
      return inner.data || inner.meta || p._meta || p.form_code
    })
  const visits = visitRes.data || []

  // Normalize form codes for grouping
  // using static import

  const total = rows.length
  const byFormCode = {}
  for (const r of rows) {
    const fc = normalizeFormCode(r.form_code || 'unknown')
    byFormCode[fc] = (byFormCode[fc] || 0) + 1
  }

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentCount = rows.filter(r => new Date(r.updated_at).getTime() > weekAgo).length
  const recent = rows.slice(0, 5)

  // Visit stats
  const totalVisits = visits.length
  const openVisits = visits.filter(v => v.status === 'open').length
  const closedVisits = visits.filter(v => v.status === 'closed').length
  const recentVisits = visits.slice(0, 5)

  return { total, byFormCode, recentCount, recent, totalVisits, openVisits, closedVisits, recentVisits }
}

/**
 * Normalize a raw submission row:
 *  - Ensures top-level form_code, device_id, app_version even if DB columns are missing
 *  - Pulls from payload.form_code etc. as fallback
 */
function normalizeSubmission(raw) {
  if (!raw) return raw
  const p = raw.payload || raw.data || {}
  const inner = p.payload || {}

  return {
    ...raw,
    form_code: raw.form_code || p.form_code || '',
    device_id: raw.device_id || p.device_id || '',
    org_code: raw.org_code || p.org_code || '',
    app_version: raw.app_version || p.app_version || '',
    form_version: raw.form_version || p.form_version || '',
    site_visit_id: raw.site_visit_id || p.site_visit_id || null,
    finalized: inner.finalized === true,
    payload: p,
  }
}
