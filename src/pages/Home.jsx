import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ImageIcon, ChevronRight, ClipboardCheck, Wrench, Shield,
  Package, LayoutList, Zap, Camera, LogOut, User, Check, Lock,
  Users, Eye, RefreshCw,
} from 'lucide-react'
import { useAppStore } from '../hooks/useAppStore'
import { filterFormsByRole } from '../lib/auth'
import { closeSiteVisit, fetchVisitSubmissions, fetchSubmissionAssets, fetchVisitAssignments } from '../lib/siteVisitService'
import ClaimFormModal from '../components/ui/ClaimFormModal'

const ALL_FORMS = [
  { id: 'inspeccion', title: 'Inspección General', description: 'Lista de verificación para inspección general de equipos y sitio', icon: ClipboardCheck, iconBg: 'bg-blue-500', stats: '38 ítems / 6 secciones', route: '/intro/inspeccion' },
  { id: 'mantenimiento', title: 'Mantenimiento Preventivo (Checklist)', description: 'Registro de actividades para mantenimiento preventivo de torres', icon: Wrench, iconBg: 'bg-orange-500', stats: '92 ítems / 17 pasos', route: '/intro/mantenimiento' },
  { id: 'mantenimiento-ejecutado', title: 'Mantenimiento Ejecutado', description: 'Trabajos ejecutados (Rawland/Rooftop) con fotos Antes/Después por actividad', icon: Camera, iconBg: 'bg-emerald-500', stats: '32 actividades / 64 fotos', route: '/intro/mantenimiento-ejecutado' },
  { id: 'equipment', title: 'Inventario de Equipos', description: 'Inventario de equipos (Torre + Piso) con croquis y plano', icon: LayoutList, iconBg: 'bg-rose-500', stats: '28 ítems / 6 pasos', route: '/intro/equipment' },
  { id: 'equipment-v2', title: 'Inventario de Equipos v2', description: 'Inventario con dimensiones desglosadas (Alto/Ancho/Profundidad) y fotos de evidencia', icon: Package, iconBg: 'bg-cyan-400', stats: '4 pasos / 3 fotos', route: '/intro/equipment-v2' },
  { id: 'sistema-ascenso', title: 'Sistema de ascenso', description: 'Revisión de dispositivo de ascenso y componentes asociados', icon: Shield, iconBg: 'bg-yellow-400', stats: '34 ítems / 6 secciones', route: '/intro/sistema-ascenso' },
  { id: 'additional-photo-report', title: 'Reporte Adicional de Fotografías', description: 'Captura y organiza las 16 categorías fotográficas requeridas', icon: ImageIcon, iconBg: 'bg-teal-500', stats: '16 categorías', route: '/intro/additional-photo-report' },
  { id: 'grounding-system-test', title: 'Prueba de puesta a tierra', description: 'Medición de resistencia del sistema de puesta a tierra y evidencia', icon: Zap, iconBg: 'bg-purple-500', stats: '29 ítems / 5 secciones', route: '/intro/grounding-system-test' },
]

// Maps canonical form_code (Supabase) → formId used in store/permissions
const CODE_TO_FORM_ID = {
  'inspeccion': 'inspeccion',
  'mantenimiento': 'mantenimiento',
  'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
  'inventario': 'equipment',
  'inventario-v2': 'equipment-v2',
  'puesta-tierra': 'grounding-system-test',
  'sistema-ascenso': 'sistema-ascenso',
  'additional-photo-report': 'additional-photo-report',
}

// Maps formId → canonical form_code (reverse)
const FORM_ID_TO_CODE = {
  'inspeccion': 'inspeccion',
  'mantenimiento': 'mantenimiento',
  'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
  'equipment': 'inventario',
  'equipment-v2': 'inventario-v2',
  'grounding-system-test': 'puesta-tierra',
  'sistema-ascenso': 'sistema-ascenso',
  'additional-photo-report': 'additional-photo-report',
}

export default function Home() {
  const navigate = useNavigate()
  const session = useAppStore((s) => s.session)
  const logout = useAppStore((s) => s.logout)
  const activeVisit = useAppStore((s) => s.activeVisit)
  const clearActiveVisit = useAppStore((s) => s.clearActiveVisit)
  const navigateToOrderScreen = useAppStore((s) => s.navigateToOrderScreen)
  const showToast = useAppStore((s) => s.showToast)
  const completedForms = useAppStore((s) => s.completedForms)
  const markFormCompleted = useAppStore((s) => s.markFormCompleted)
  const formMeta = useAppStore((s) => s.formMeta)
  const hydrateFormFromSupabase = useAppStore((s) => s.hydrateFormFromSupabase)
  const resetAllForms = useAppStore((s) => s.resetAllForms)
  const formDataOwnerId = useAppStore((s) => s.formDataOwnerId)
  const formAssignments = useAppStore((s) => s.formAssignments)
  const setFormAssignments = useAppStore((s) => s.setFormAssignments)
  const isFormWritable = useAppStore((s) => s.isFormWritable)

  const [hydrating, setHydrating] = useState(false)
  const pollingRef = useRef(null)

  // Is this inspector collaborating on someone else's order?
  const isCollaborator = useMemo(
    () => activeVisit && session && activeVisit.inspector_username !== session.username,
    [activeVisit, session]
  )

  // Claim modal state
  const [claimModal, setClaimModal] = useState({
    open: false, mode: 'take', formCode: '', formTitle: '',
    currentOwner: null, submissionId: null, currentVersion: 0,
  })

  const openClaimModal = (form, mode) => {
    const formCode = FORM_ID_TO_CODE[form.id] || form.id
    const assignment = formAssignments?.[formCode]
    setClaimModal({
      open: true,
      mode,
      formCode,
      formTitle: form.title,
      currentOwner: assignment?.assignedTo || null,
      submissionId: assignment?.submissionId || null,
      currentVersion: assignment?.assignmentVersion ?? 0,
    })
  }

  // Redirect to order screen if no active visit
  useEffect(() => {
    if (!activeVisit) navigate('/order', { replace: true })
  }, [activeVisit, navigate])

  // Build assignment map from submissions array
  const buildAssignmentMap = (submissions) => {
    const map = {}
    for (const s of submissions) {
      map[s.form_code] = {
        assignedTo: s.assigned_to || null,
        assignmentVersion: s.assignment_version ?? 0,
        assignedAt: s.assigned_at || null,
        submissionId: s.id,
      }
    }
    return map
  }

  // Hydrate from Supabase on mount / order change
  useEffect(() => {
    if (!activeVisit?.id) return
    if (String(activeVisit.id).startsWith('local-')) return

    const isOwnOrder = formDataOwnerId === activeVisit.id
    if (!navigator.onLine) {
      if (!isOwnOrder) { resetAllForms(); useAppStore.setState({ formDataOwnerId: activeVisit.id }) }
      return
    }

    setHydrating(true)
    if (!isOwnOrder) resetAllForms()

    fetchVisitSubmissions(activeVisit.id)
      .then(async (submissions) => {
        const submissionIds = submissions.map((s) => s.id).filter(Boolean)
        let assetsMap = {}
        if (submissionIds.length > 0) {
          try { assetsMap = await fetchSubmissionAssets(submissionIds) } catch (_) {}
        }

        submissions.forEach((s) => {
          const formId = CODE_TO_FORM_ID[s.form_code] || s.form_code
          const inner = s.payload?.payload || s.payload
          const assets = assetsMap[s.id] || []
          if (s.finalized === true || inner?.finalized === true) markFormCompleted(formId)
          if (inner?.data) hydrateFormFromSupabase(s.form_code, s.payload, assets)
        })

        // Store assignment info
        setFormAssignments(buildAssignmentMap(submissions))
        useAppStore.setState({ formDataOwnerId: activeVisit.id })
      })
      .catch((err) => console.warn('[Home] fetchVisitSubmissions failed', err?.message))
      .finally(() => setHydrating(false))
  }, [activeVisit?.id])

  // Polling: refresh assignments every 30s to detect reassignments
  const refreshAssignments = useCallback(async () => {
    if (!activeVisit?.id || String(activeVisit.id).startsWith('local-') || !navigator.onLine) return
    try {
      const submissions = await fetchVisitAssignments(activeVisit.id)
      const newMap = buildAssignmentMap(submissions)

      // Detect if any form we currently own was taken away
      const currentMap = useAppStore.getState().formAssignments || {}
      for (const [code, oldA] of Object.entries(currentMap)) {
        const newA = newMap[code]
        if (oldA?.assignedTo === session?.username && newA?.assignedTo && newA.assignedTo !== session?.username) {
          showToast(
            `El formulario fue tomado por ${newA.assignedTo} mientras estabas sin conexión. Ahora estás en modo lectura.`,
            'warning'
          )
        }
      }
      setFormAssignments(newMap)
    } catch (_) {}
  }, [activeVisit?.id, session?.username])

  useEffect(() => {
    if (!activeVisit?.id) return
    pollingRef.current = setInterval(refreshAssignments, 30000)
    return () => clearInterval(pollingRef.current)
  }, [activeVisit?.id, refreshAssignments])

  const visibleForms = useMemo(() => {
    if (!session) return []
    return filterFormsByRole(ALL_FORMS, session.role)
  }, [session])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const handleCloseOrder = async () => {
    if (!activeVisit) return
    if (!window.confirm(`¿Cerrar la orden ${activeVisit.order_number}? Podrá crear o continuar otra orden.`)) return
    try {
      let geo = { lat: null, lng: null }
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
        )
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      } catch (_) {}
      await closeSiteVisit(activeVisit.id, geo)
      clearActiveVisit()
      showToast('Orden cerrada exitosamente', 'success')
      navigate('/order', { replace: true })
    } catch (e) {
      showToast('Error al cerrar la orden', 'error')
    }
  }

  const handleChangeOrder = () => {
    navigateToOrderScreen()
    navigate('/order', { replace: true })
  }

  if (!activeVisit) return null

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary to-primary/90 text-white px-6 pt-4 pb-3 relative">
        <button
          type="button" onClick={handleLogout} aria-label="Cerrar sesión"
          className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <LogOut size={18} />
        </button>
        <div className="flex flex-col items-center">
          <div className="mb-2">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-primary">PTI</span>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">PTI Inspect</h1>
          <p className="text-white/70 text-sm mt-0.5">Sistema de Inspección v2.5.86</p>
          {session && (
            <div className="mt-2 flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
              <User size={12} />
              <span className="text-xs font-semibold">{session.name}</span>
              <span className="text-[10px] text-white/60">·</span>
              <span className="text-[10px] text-white/70">{session.roleLabel}</span>
            </div>
          )}
          {activeVisit && (
            <div className="mt-3 w-full bg-white/10 rounded-xl p-3 border border-white/15">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
                    {isCollaborator ? 'Colaborando en orden' : 'Orden activa'}
                  </p>
                  <p className="text-sm font-extrabold text-white mt-0.5">{activeVisit.order_number}</p>
                </div>
                {activeVisit._isLocal || activeVisit.status === 'local' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/20">Local</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400/15 text-green-300 border border-green-400/20">Sincronizada</span>
                )}
              </div>
              <div className="flex gap-4 mt-2 pt-2 border-t border-white/10">
                <div><p className="text-[10px] text-white/40">Sitio</p><p className="text-xs font-bold text-white/90">{activeVisit.site_name}</p></div>
                <div><p className="text-[10px] text-white/40">ID</p><p className="text-xs font-bold text-white/90">{activeVisit.site_id}</p></div>
                {isCollaborator && (
                  <div><p className="text-[10px] text-white/40">Inspector</p><p className="text-xs font-bold text-white/90">{activeVisit.inspector_name || activeVisit.inspector_username}</p></div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Collaboration banner */}
      {isCollaborator && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Users size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">Modo colaboración.</span> Los formularios verdes están libres para tomar.
            Los amarillos tienen dueño — puedes verlos o reasignarte.
          </p>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 mt-3">
        <section>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Formularios</h2>
            <span className="text-xs text-gray-400">{(completedForms || []).length}/{visibleForms.length} completados</span>
          </div>

          {visibleForms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <ClipboardCheck size={24} className="text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Sin formularios asignados</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {hydrating && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="text-sm font-medium text-blue-700">Cargando datos de la orden...</span>
                </div>
              )}

              {visibleForms.map((form) => {
                const IconComponent = form.icon
                const isCompleted = (completedForms || []).includes(form.id)
                const formCode = FORM_ID_TO_CODE[form.id] || form.id
                const assignment = formAssignments?.[formCode]
                const writable = isFormWritable(formCode)
                const assignedToMe = assignment?.assignedTo === session?.username
                const assignedToOther = assignment?.assignedTo && !assignedToMe
                const isFree = !assignment?.assignedTo
                const hasProgress = !!formMeta?.[form.id]?.startedAt && !isCompleted && !hydrating

                // Status badge
                const getStatus = () => {
                  if (isCompleted) return { label: 'Completado', badge: 'bg-green-50 text-green-600 border-green-200' }
                  if (assignedToMe) return { label: '✏️ Editando', badge: 'bg-teal-50 text-teal-700 border-teal-200' }
                  if (assignedToOther) return { label: '🔒 Ocupado', badge: 'bg-amber-50 text-amber-600 border-amber-200' }
                  if (isFree && isCollaborator) return { label: 'Libre', badge: 'bg-green-50 text-green-600 border-green-200' }
                  if (hasProgress) return { label: 'En progreso', badge: 'bg-amber-50 text-amber-600 border-amber-200' }
                  return { label: 'Pendiente', badge: 'bg-gray-50 text-gray-500 border-gray-200' }
                }
                const status = getStatus()

                // Border accent for collaboration mode
                const borderAccent = !isCompleted && isCollaborator
                  ? assignedToOther ? 'border-l-4 border-l-amber-400' : isFree ? 'border-l-4 border-l-green-500' : ''
                  : ''

                const canNavigate = !isCompleted && !hydrating && writable
                const handleCardClick = () => {
                  if (isCompleted || hydrating) return
                  if (!writable) return // read-only: use the buttons below
                  navigate(form.route)
                }

                return (
                  <div key={form.id}>
                    <button
                      onClick={handleCardClick}
                      disabled={isCompleted}
                      className={`w-full rounded-2xl p-4 flex items-center gap-4 shadow-sm border text-left transition-all ${borderAccent} ${
                        isCompleted ? 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed'
                        : !writable ? 'bg-amber-50/40 border-amber-200 cursor-default'
                        : 'bg-white border-gray-100 active:scale-[0.98]'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        isCompleted ? 'bg-green-500' : form.iconBg
                      }`}>
                        {isCompleted ? <Check size={28} className="text-white" strokeWidth={3} /> : <IconComponent size={28} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-base ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{form.title}</h3>
                        {assignedToOther && (
                          <p className="text-xs text-amber-700 mt-0.5 font-medium">{assignment.assignedTo} está editando</p>
                        )}
                        {assignedToMe && (
                          <p className="text-xs text-teal-700 mt-0.5 font-medium">Asignado a ti</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.badge}`}>{status.label}</span>
                        </div>
                      </div>
                      {isCompleted ? <Lock size={18} className="text-gray-300 flex-shrink-0" />
                        : writable ? <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
                        : <Eye size={18} className="text-amber-400 flex-shrink-0" />}
                    </button>

                    {/* Collaboration action buttons — shown for non-completed forms when not writable or it's free for a collaborator */}
                    {!isCompleted && !hydrating && (
                      <>
                        {/* Collaborator: free form — show Take button */}
                        {isCollaborator && isFree && (
                          <div className="flex gap-2 px-1 -mt-1 mb-1">
                            <button
                              onClick={() => openClaimModal(form, 'take')}
                              className="flex-1 py-2.5 rounded-b-xl bg-green-600 text-white text-xs font-bold active:scale-[0.99] transition-all"
                            >
                              + Tomar e iniciar
                            </button>
                          </div>
                        )}
                        {/* Collaborator or owner: occupied form — show View + Reassign */}
                        {assignedToOther && (
                          <div className="flex gap-2 px-1 -mt-1 mb-1">
                            <button
                              onClick={() => navigate(form.route)}
                              className="w-24 py-2.5 rounded-bl-xl bg-gray-100 text-gray-700 text-xs font-bold active:scale-[0.99] transition-all border-t-0 flex items-center justify-center gap-1"
                            >
                              <Eye size={12} /> Ver
                            </button>
                            <button
                              onClick={() => openClaimModal(form, 'reassign')}
                              className="flex-1 py-2.5 rounded-br-xl bg-amber-500 text-white text-xs font-bold active:scale-[0.99] transition-all"
                            >
                              Reasignarme
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Order actions */}
      {activeVisit && (
        <div className="px-4 pb-2 pt-3 space-y-2">
          <button onClick={handleChangeOrder} className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-bold active:scale-[0.98] transition-all">
            {isCollaborator ? 'Salir de esta orden' : 'Cambiar Orden'}
          </button>
          {!isCollaborator && (
            <button onClick={handleCloseOrder} className="w-full py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-600 text-sm font-bold active:scale-[0.98] transition-all">
              Cerrar Orden
            </button>
          )}
        </div>
      )}

      <footer className="px-6 py-3 text-center">
        <p className="text-xs text-gray-400">© 2026</p>
      </footer>

      {/* Claim Modal */}
      <ClaimFormModal
        isOpen={claimModal.open}
        onClose={() => setClaimModal((p) => ({ ...p, open: false }))}
        mode={claimModal.mode}
        formCode={claimModal.formCode}
        formTitle={claimModal.formTitle}
        currentOwner={claimModal.currentOwner}
        submissionId={claimModal.submissionId}
        currentVersion={claimModal.currentVersion}
        onSuccess={() => {
          // After successful claim, navigate to the form
          const form = visibleForms.find((f) => FORM_ID_TO_CODE[f.id] === claimModal.formCode || f.id === claimModal.formCode)
          if (form) navigate(form.route)
        }}
      />
    </div>
  )
}
