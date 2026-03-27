import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MapPin, ChevronRight, Loader2, FileText, Clock, LogOut, Users } from 'lucide-react'
import SiteSelector from '../components/ui/SiteSelector'
import { useAppStore } from '../hooks/useAppStore'
import { createSiteVisit, fetchOpenVisits, searchVisitByOrder, fetchCompanyOpenVisits } from '../lib/siteVisitService'

function buildOrderNumber(site) {
  if (!site) return ''
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const region = (site.region_name || 'REGION')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/^REGI[OÓ]N[\s-]*/i, '').trim()
    .replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '') || 'REGION'
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

  const [tab, setTab] = useState('new') // 'new' | 'continue' | 'team'
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  // Continue tab
  const [searchQuery, setSearchQuery] = useState('')
  const [openVisits, setOpenVisits] = useState([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [searchedOnce, setSearchedOnce] = useState(false)

  // Team tab
  const [teamVisits, setTeamVisits] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [teamLoaded, setTeamLoaded] = useState(false)

  useEffect(() => { selectSite(null) }, [])

  useEffect(() => {
    if (activeVisit) navigate('/', { replace: true })
  }, [activeVisit, navigate])

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

  const loadTeamVisits = useCallback(async () => {
    if (!session?.orgCode || !session?.username) return
    setLoadingTeam(true)
    try {
      const visits = await fetchCompanyOpenVisits(session.orgCode, session.username)
      setTeamVisits(visits)
    } catch (e) {
      console.warn('Error loading team visits:', e)
      showToast('No se pudieron cargar las órdenes del equipo', 'error')
    } finally {
      setLoadingTeam(false)
      setTeamLoaded(true)
    }
  }, [session?.orgCode, session?.username])

  useEffect(() => {
    if (tab === 'continue') loadOpenVisits()
    if (tab === 'team') loadTeamVisits()
  }, [tab])

  const handleCreateOrder = async () => {
    if (!orderNumber.trim()) { showToast('Ingrese el número de orden', 'error'); return }
    if (!selectedSite) { showToast('Seleccione un sitio del catálogo', 'error'); return }
    setLoading(true)
    let geo = { lat: null, lng: null }
    try { geo = await getGeo() } catch (_) {}
    try {
      const visit = await createSiteVisit({
        orderNumber: orderNumber.trim(), siteId: selectedSite.site_id,
        siteName: selectedSite.name, siteRef: selectedSite.id,
        regionId: selectedSite.region_id, session, lat: geo.lat, lng: geo.lng,
      })
      setNewActiveVisit(visit)
      showToast('Orden creada exitosamente', 'success')
      navigate('/', { replace: true })
    } catch (e) {
      if (e?.code === '23505') {
        showToast('Ya existe una orden con ese número', 'error')
      } else {
        showToast('Error al crear orden. Verifique su conexión.', 'error')
      }
    } finally { setLoading(false) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadOpenVisits(); return }
    setLoadingVisits(true)
    try {
      const visit = await searchVisitByOrder(searchQuery.trim(), session.username)
      setOpenVisits(visit ? [visit] : [])
    } catch (e) {
      showToast('Error al buscar', 'error')
    } finally { setLoadingVisits(false); setSearchedOnce(true) }
  }

  const handleContinueVisit = (visit) => {
    setActiveVisit(visit)
    showToast(`Orden ${visit.order_number} cargada`, 'success')
    navigate('/', { replace: true })
  }

  // Join a team member's visit as collaborator
  const handleJoinVisit = (visit) => {
    setActiveVisit(visit)
    showToast(`Unido a orden ${visit.order_number}`, 'success')
    navigate('/', { replace: true })
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const tabClass = (t) => `flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
    tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
  }`

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gradient-to-b from-primary to-primary/90 text-white px-6 pt-4 pb-5 relative">
        <button type="button" onClick={handleLogout} aria-label="Cerrar sesión"
          className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all">
          <LogOut size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"><span className="text-xl">🗼</span></div>
          <div>
            <h1 className="text-lg font-extrabold">Orden de Trabajo</h1>
            {session && <p className="text-white/60 text-xs">{session.name} · {session.roleLabel}</p>}
          </div>
        </div>
      </header>

      {/* Tabs — 3 options now */}
      <div className="px-4 mt-4">
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1">
          <button onClick={() => setTab('new')} className={tabClass('new')}>
            <Plus size={14} /> Nueva
          </button>
          <button onClick={() => setTab('continue')} className={tabClass('continue')}>
            <Search size={14} /> Continuar
          </button>
          <button onClick={() => setTab('team')} className={tabClass('team')}>
            <Users size={14} /> Mi Equipo
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 pb-6">

        {/* ═══ NEW ORDER ═══ */}
        {tab === 'new' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-extrabold text-gray-900">Datos de la orden</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">Estos datos se compartirán entre todos los formularios</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Sitio <span className="text-red-500">*</span></label>
              <SiteSelector selectedSite={selectedSite} onSelect={(site) => { selectSite(site); setOrderNumber(buildOrderNumber(site)) }} />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Número de Orden <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FileText size={16} /></div>
                <input type="text" value={orderNumber} readOnly placeholder="Selecciona un sitio para generar"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm font-mono font-semibold text-gray-700 cursor-default select-all" />
              </div>
            </div>
            <div className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 mb-5">
              <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary/80 leading-relaxed">
                <span className="font-bold text-primary">Auto-captura:</span> Fecha, hora de inicio y coordenadas GPS se registrarán automáticamente al iniciar.
              </p>
            </div>
            <button onClick={handleCreateOrder} disabled={loading || !selectedSite}
              className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] ${loading || !selectedSite ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary shadow-sm'}`}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Creando...</span> : 'Iniciar Inspecciones →'}
            </button>
          </div>
        )}

        {/* ═══ CONTINUE ORDER ═══ */}
        {tab === 'continue' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
              <h2 className="text-base font-extrabold text-gray-900">Buscar orden abierta</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">Solo se muestran órdenes abiertas creadas por usted</p>
              <div className="flex gap-2">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por # de orden..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <button onClick={handleSearch} disabled={loadingVisits}
                  className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition-all flex-shrink-0">
                  {loadingVisits ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>
            </div>
            {loadingVisits && !openVisits.length ? (
              <div className="text-center py-10"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto" /><p className="text-xs text-gray-400 mt-2">Buscando...</p></div>
            ) : openVisits.length > 0 ? (
              <div className="space-y-2.5">
                {openVisits.map((v) => (
                  <button key={v.id} onClick={() => handleContinueVisit(v)}
                    className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{v.order_number}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{v.site_name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">Abierta</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {new Date(v.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">Continuar <ChevronRight size={14} /></span>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchedOnce ? (
              <div className="text-center py-10">
                <Search size={24} className="text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Sin órdenes abiertas</p>
              </div>
            ) : null}
          </>
        )}

        {/* ═══ MI EQUIPO (NEW) ═══ */}
        {tab === 'team' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <Users size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Órdenes abiertas de tu empresa. Únete a una para colaborar en formularios disponibles.
              </p>
            </div>

            {loadingTeam ? (
              <div className="text-center py-10"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto" /><p className="text-xs text-gray-400 mt-2">Cargando equipo...</p></div>
            ) : teamVisits.length > 0 ? (
              <div className="space-y-2.5">
                {teamVisits.map((v) => (
                  <div key={v.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-extrabold text-gray-900">{v.order_number}</p>
                          <p className="text-sm text-gray-600 mt-0.5">{v.site_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Inspector: {v.inspector_name || v.inspector_username}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">Abierta</span>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                          <Clock size={12} />
                          {new Date(v.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => handleJoinVisit(v)}
                          className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold active:bg-gray-50 transition-all flex items-center justify-center gap-2">
                          <Users size={14} className="text-gray-400" /> Unirse y colaborar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : teamLoaded ? (
              <div className="text-center py-10">
                <Users size={24} className="text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Sin órdenes activas del equipo</p>
                <p className="text-xs text-gray-400 mt-1">No hay otras órdenes abiertas en tu empresa ahora</p>
              </div>
            ) : null}
          </>
        )}

      </main>
    </div>
  )
}
