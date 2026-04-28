import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats } from '../lib/supabaseQueries'

export const useSubmissionsStore = create((set, get) => ({
  // --- List ---
  submissions: [],
  isLoading: false,
  error: null,
  filterFormCode: 'all',
  search: '',
  lastFetch: null,

  load: async (force = false) => {
    const state = get()
    // Avoid re-fetching within 10 seconds unless forced
    if (!force && state.lastFetch && Date.now() - state.lastFetch < 10000) return
    set({ isLoading: true, error: null })
    try {
      const data = await fetchSubmissions()
      set({ submissions: data, isLoading: false, lastFetch: Date.now() })
    } catch (err) {
      set({ error: err?.message || 'Error al cargar datos', isLoading: false })
    }
  },

  setFilter: (patch) => set(patch),

  getFiltered: () => {
    const { submissions, filterFormCode, search } = get()
    const q = search.trim().toLowerCase()
    return submissions.filter((s) => {
      const codeOk = filterFormCode === 'all' || s.form_code === filterFormCode
      if (!codeOk) return false
      if (!q) return true

      // Search through normalized fields and nested payload data
      const payload = s.payload || {}
      const inner = payload.payload || payload
      const data = inner.data || {}
      const meta = inner.meta || {}
      const siteInfo = data.siteInfo || {}
      const formData = data.formData || {}
      const datosSection = data.datos || {}
      const submitter = inner.submitted_by || {}
      const searchableText = [
        s.id,
        s.form_code,
        s.device_id,
        meta.inspector || '',
        siteInfo.nombreSitio || '',
        siteInfo.idSitio || '',
        siteInfo.proveedor || '',
        formData.nombreSitio || '',
        formData.idSitio || '',
        formData.proveedor || '',
        datosSection.nombreSitio || '',
        datosSection.idSitio || '',
        submitter.name || '',
        submitter.username || '',
      ].join(' ').toLowerCase()

      return searchableText.includes(q)
    })
  },

  // --- Detail ---
  activeSubmission: null,
  activeAssets: [],
  isLoadingDetail: false,

  loadDetail: async (id) => {
    set({ isLoadingDetail: true, activeSubmission: null, activeAssets: [] })
    try {
      const { submission, assets } = await fetchSubmissionWithAssets(id)
      set({ activeSubmission: submission, activeAssets: assets, isLoadingDetail: false })
    } catch (err) {
      set({ isLoadingDetail: false, error: err?.message || 'Error al cargar detalle' })
    }
  },

  clearDetail: () => set({ activeSubmission: null, activeAssets: [] }),

  // --- Dashboard stats ---
  stats: null,
  isLoadingStats: false,

  loadStats: async () => {
    set({ isLoadingStats: true })
    try {
      const stats = await fetchDashboardStats()
      set({ stats, isLoadingStats: false })
    } catch (err) {
      set({ isLoadingStats: false })
    }
  },
}))
