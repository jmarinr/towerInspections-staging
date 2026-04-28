import { create } from 'zustand'
import { fetchSiteVisits, fetchSiteVisitById, fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'

export const useOrdersStore = create((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,
  filterStatus: 'all',
  search: '',
  lastFetch: null,

  load: async (force = false) => {
    const state = get()
    if (!force && state.lastFetch && Date.now() - state.lastFetch < 10000) return
    set({ isLoading: true, error: null })
    try {
      const data = await fetchSiteVisits()
      set({ orders: data, isLoading: false, lastFetch: Date.now() })
    } catch (err) {
      set({ error: err?.message || 'Error al cargar órdenes', isLoading: false })
    }
  },

  setFilter: (patch) => set(patch),

  getFiltered: () => {
    const { orders, filterStatus, search } = get()
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      const statusOk = filterStatus === 'all' || o.status === filterStatus
      if (!statusOk) return false
      if (!q) return true
      return [
        o.order_number, o.site_id, o.site_name,
        o.inspector_name, o.inspector_username,
      ].join(' ').toLowerCase().includes(q)
    })
  },

  // Detail
  activeOrder: null,
  activeOrderSubmissions: [],
  isLoadingDetail: false,

  loadDetail: async (id) => {
    set({ isLoadingDetail: true, activeOrder: null, activeOrderSubmissions: [] })
    try {
      const [order, submissions] = await Promise.all([
        fetchSiteVisitById(id),
        fetchSubmissionsWithAssetsForVisit(id).catch(() => []),
      ])
      set({ activeOrder: order, activeOrderSubmissions: submissions, isLoadingDetail: false })
    } catch (err) {
      set({ isLoadingDetail: false, error: err?.message || 'Error al cargar orden' })
    }
  },

  clearDetail: () => set({ activeOrder: null, activeOrderSubmissions: [] }),
}))
