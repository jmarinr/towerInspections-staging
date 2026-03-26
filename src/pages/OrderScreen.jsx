import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MapPin, ChevronRight, Loader2, FileText, Clock, LogOut } from 'lucide-react'
import SiteSelector from '../components/ui/SiteSelector'
import { useAppStore } from '../hooks/useAppStore'
import { createSiteVisit, fetchOpenVisits, searchVisitByOrder } from '../lib/siteVisitService'

// ── Build order number from site ──────────────────────────────────────────
function buildOrderNumber(site) {
  if (!site) return ''
  const now  = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')

  // Region: remove accents, uppercase, strip leading "REGION " or "REGIÓN " prefix,
  // replace spaces with hyphen, keep only alphanum + hyphen
  const region = (site.region_name || 'REGION')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^REGI[OÓ]N[\s-]*/i, '')   // strip "REGION " or "REGIÓN " prefix
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    || 'REGION'

  // Site ID: extract only the trailing numeric part  e.g. PA-CH-1036 → 1036
  const numericPart = (site.site_id || '').match(/(\d+)$/)?.[1] || site.site_id || ''

  return `OT-${region}-${yyyy}-${mm}-${numericPart}`
}


const getGeo = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('No soportado'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })

export default function OrderScreen() {
  const navigate = useNavigate()
  const session = useAppStore((s) => s.session)
  const setActiveVisit = useAppStore((s) => s.setActiveVisit)
  const setNewActiveVisit = useAppStore((s) => s.setNewActiveVisit)
  const activeVisit = useAppStore((s) => s.activeVisit)
  const showToast = useAppStore((s) => s.showToast)
  const logout = useAppStore((s) => s.logout)
  const selectSite = useAppStore((s) => s.selectSite)
  const selectedSite = useAppStore((s) => s.selectedSite)

  const [tab, setTab] = useState('new') // 'new' | 'continue'

  // Always clear selected site on mount — new order must always pick fresh
  useEffect(() => {
    selectSite(null)
  }, [])
  const [loading, setLoading] = useState(false)

  // New order fields
  const [orderNumber, setOrderNumber] = useState('')

  // Continue order
  const [searchQuery, setSearchQuery] = useState('')
  const [openVisits, setOpenVisits] = useState([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [searchedOnce, setSearchedOnce] = useState(false)

  // If there's already an active visit, go to home
  useEffect(() => {
    if (activeVisit) {
      navigate('/', { replace: true })
    }
  }, [activeVisit, navigate])

  // Load open visits when switching to continue tab
  const loadOpenVisits = useCallback(async () => {
    if (!session?.username) return
    setLoadingVisits(true)
    try {
      const visits = await fetchOpenVisits(session.username)
      setOpenVisits(visits)
    } catch (e) {
      console.warn('Error loading visits:', e)
    } finally {
      setLoadingVisits(false)
      setSearchedOnce(true)
    }
  }, [session?.username])

  useEffect(() => {
    if (tab === 'continue') {
      loadOpenVisits()
    }
  }, [tab, loadOpenVisits])

  // ─── New Order ───
  const handleCreateOrder = async () => {
    if (!orderNumber.trim()) {
      showToast('Ingrese el número de orden', 'error')
      return
    }
    if (!selectedSite) {
      showToast('Seleccione un sitio del catálogo', 'error')
      return
    }

    setLoading(true)
    let geo = { lat: null, lng: null }
    try {
      geo = await getGeo()
    } catch (_) {
      // GPS optional
    }

    try {
      const visit = await createSiteVisit({
        orderNumber: orderNumber.trim(),
        siteId: selectedSite.site_id,
        siteName: selectedSite.name,
        siteRef: selectedSite.id,
        regionId: selectedSite.region_id,
        session,
        lat: geo.lat,
        lng: geo.lng,
      })

      setNewActiveVisit(visit)
      showToast('Orden creada exitosamente', 'success')
      navigate('/', { replace: true })
    } catch (e) {
      if (e?.code === '23505') {
        showToast('Ya existe una orden con ese número', 'error')
      } else if (!navigator.onLine) {
        // Offline fallback — create local visit object
        const localVisit = {
          id: `local-${Date.now()}`,
          org_code: 'PTI',
          order_number: orderNumber.trim(),
          site_id: siteId.trim(),
          site_name: siteName.trim(),
          inspector_username: session.username,
          inspector_name: session.name,
          inspector_role: session.role,
          start_lat: geo.lat,
          start_lng: geo.lng,
          started_at: new Date().toISOString(),
          status: 'local',
          _isLocal: true,
        }
        setNewActiveVisit(localVisit)
        showToast('Orden creada localmente (sin conexión)', 'warning')
        navigate('/', { replace: true })
      } else {
        console.error('Error creating visit:', e)
        showToast('Error al crear orden. Verifique su conexión.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Search ───
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadOpenVisits()
      return
    }
    setLoadingVisits(true)
    try {
      const visit = await searchVisitByOrder(searchQuery.trim(), session.username)
      setOpenVisits(visit ? [visit] : [])
    } catch (e) {
      console.warn('Search error:', e)
      showToast('Error al buscar', 'error')
    } finally {
      setLoadingVisits(false)
      setSearchedOnce(true)
    }
  }

  // ─── Continue Visit ───
  const handleContinueVisit = (visit) => {
    setActiveVisit(visit)
    showToast(`Orden ${visit.order_number} cargada`, 'success')
    navigate('/', { replace: true })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary to-primary/90 text-white px-6 pt-4 pb-5 relative">
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <LogOut size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <span className="text-xl">🗼</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold">Orden de Trabajo</h1>
            {session && (
              <p className="text-white/60 text-xs">{session.name} · {session.roleLabel}</p>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1">
          <button
            onClick={() => setTab('new')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'new'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Plus size={14} />
            Nueva Orden
          </button>
          <button
            onClick={() => setTab('continue')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'continue'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Search size={14} />
            Continuar Orden
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-6">
        {tab === 'new' ? (
          /* ═══ NEW ORDER ═══ */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-extrabold text-gray-900">Datos de la orden</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Estos datos se compartirán entre todos los formularios
            </p>

            {/* Site Selector — first so order number auto-generates */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Sitio <span className="text-red-500">*</span>
              </label>
              <SiteSelector
                selectedSite={selectedSite}
                onSelect={(site) => {
                  selectSite(site)
                  setOrderNumber(buildOrderNumber(site))
                }}
              />
            </div>

            {/* Order Number — auto-generated, read-only */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Número de Orden <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FileText size={16} />
                </div>
                <input
                  type="text"
                  value={orderNumber}
                  readOnly
                  placeholder="Selecciona un sitio para generar"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm font-mono font-semibold text-gray-700 cursor-default select-all"
                />
              </div>
            </div>

            {/* GPS note */}
            <div className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 mb-5">
              <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary/80 leading-relaxed">
                <span className="font-bold text-primary">Auto-captura:</span> Fecha, hora de inicio y
                coordenadas GPS se registrarán automáticamente al iniciar.
              </p>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={loading || !selectedSite}
              className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] ${
                loading || !selectedSite ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary shadow-sm'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Creando...
                </span>
              ) : (
                'Iniciar Inspecciones →'
              )}
            </button>
          </div>
        ) : (
          /* ═══ CONTINUE ORDER ═══ */
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
              <h2 className="text-base font-extrabold text-gray-900">Buscar orden abierta</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Solo se muestran órdenes abiertas creadas por usted
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por # de orden..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={loadingVisits}
                  className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition-all flex-shrink-0"
                >
                  {loadingVisits ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Results */}
            {loadingVisits && !openVisits.length ? (
              <div className="text-center py-10">
                <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
                <p className="text-xs text-gray-400 mt-2">Buscando órdenes...</p>
              </div>
            ) : openVisits.length > 0 ? (
              <>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Órdenes abiertas ({openVisits.length})
                </p>
                <div className="space-y-2.5">
                  {openVisits.map((v) => {
                    const isLocal = v._isLocal || v.status === 'local'
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleContinueVisit(v)}
                        className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left active:scale-[0.98] transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-extrabold text-gray-900">{v.order_number}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{v.site_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">ID: {v.site_id}</p>
                          </div>
                          {isLocal ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              Local
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">
                              Sincronizada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex gap-3">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              {new Date(v.started_at).toLocaleDateString('es', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold text-primary">
                            Continuar <ChevronRight size={14} />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : searchedOnce ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Sin órdenes abiertas</p>
                <p className="text-xs text-gray-400 mt-1">
                  No se encontraron órdenes abiertas para su usuario
                </p>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
