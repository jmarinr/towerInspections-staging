import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ImageIcon, ChevronRight, ClipboardCheck, Wrench, Shield,
  Package, LayoutList, Zap, Camera, LogOut, User, Check, Lock, Users, Eye,
} from 'lucide-react'
import { useAppStore } from '../hooks/useAppStore'
import { filterFormsByRole } from '../lib/auth'
import {
  closeSiteVisit, fetchVisitSubmissions, fetchSubmissionAssets,
  fetchVisitAssignments, fetchSubmissionForForm,
} from '../lib/siteVisitService'
import { flushSupabaseQueues } from '../lib/supabaseSync'
import ClaimFormModal from '../components/ui/ClaimFormModal'

// ─── Form definitions (unchanged from v2.5.85) ───────────────────────────────
const ALL_FORMS = [
  { id: 'inspeccion',             title: 'Inspección General',                    description: 'Lista de verificación para inspección general de equipos y sitio',        icon: ClipboardCheck, iconBg: 'bg-blue-500',    route: '/intro/inspeccion' },
  { id: 'mantenimiento',          title: '1 Preventive Maintenance Inspection',     description: 'Registro de actividades para mantenimiento preventivo de torres',         icon: Wrench,         iconBg: 'bg-orange-500',  route: '/intro/mantenimiento' },
  { id: 'mantenimiento-ejecutado',title: '2 Preventive Maintenance Executed',        description: 'Trabajos ejecutados (Rawland/Rooftop) con fotos Antes/Después',          icon: Camera,         iconBg: 'bg-emerald-500', route: '/intro/mantenimiento-ejecutado' },
  { id: 'equipment',              title: 'Inventario de Equipos',                 description: 'Inventario de equipos (Torre + Piso) con croquis y plano',               icon: LayoutList,     iconBg: 'bg-rose-500',    route: '/intro/equipment' },
  { id: 'equipment-v2',           title: '8 Equipment Inventory',                   description: 'Inventario con dimensiones desglosadas y fotos de evidencia',             icon: Package,        iconBg: 'bg-cyan-400',    route: '/intro/equipment-v2' },
  { id: 'sistema-ascenso',        title: '10 Safety Climbing Device',                description: 'Revisión de dispositivo de ascenso y componentes asociados',              icon: Shield,         iconBg: 'bg-yellow-400',  route: '/intro/sistema-ascenso' },
  { id: 'additional-photo-report',title: '9 Additional Photo Report',      description: 'Captura y organiza las 16 categorías fotográficas requeridas',           icon: ImageIcon,      iconBg: 'bg-teal-500',    route: '/intro/additional-photo-report' },
  { id: 'grounding-system-test',  title: '4 Grounding System Test',                 description: 'Medición de resistencia del sistema de puesta a tierra y evidencia',     icon: Zap,            iconBg: 'bg-purple-500',  route: '/intro/grounding-system-test' },
]

// Supabase form_code → store formId
const CODE_TO_FORM_ID = {
  'inspeccion': 'inspeccion', 'mantenimiento': 'mantenimiento',
  'mantenimiento-ejecutado': 'mantenimiento-ejecutado', 'inventario': 'equipment',
  'inventario-v2': 'equipment-v2', 'puesta-tierra': 'grounding-system-test',
  'sistema-ascenso': 'sistema-ascenso', 'additional-photo-report': 'additional-photo-report',
}

// store formId → Supabase form_code
const FORM_ID_TO_CODE = {
  'inspeccion': 'inspeccion', 'mantenimiento': 'mantenimiento',
  'mantenimiento-ejecutado': 'mantenimiento-ejecutado', 'equipment': 'inventario',
  'equipment-v2': 'inventario-v2', 'grounding-system-test': 'puesta-tierra',
  'sistema-ascenso': 'sistema-ascenso', 'additional-photo-report': 'additional-photo-report',
}

// ─── Build assignment map from submissions rows ───────────────────────────────
// Rules:
//   assigned_to set    → use it
//   assigned_to null + submission has data + not finalized → infer owner = order creator
//   assigned_to null + no data (or finalized)             → truly free / completed
function buildAssignmentMap(submissions, orderOwnerUsername) {
  const map = {}
  for (const s of submissions) {
    const inner = s.payload?.payload || s.payload
    const hasData = !!inner?.data || s._hasData === true
    const effectiveOwner =
      s.assigned_to ||
      (hasData && !s.finalized ? orderOwnerUsername : null)

    map[s.form_code] = {
      assignedTo: effectiveOwner,
      assignmentVersion: s.assignment_version ?? 0,
      assignedAt: s.assigned_at || null,
      submissionId: s.id,
    }
  }
  return map
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate   = useNavigate()
  const session    = useAppStore((s) => s.session)
  const logout     = useAppStore((s) => s.logout)
  const activeVisit = useAppStore((s) => s.activeVisit)
  const clearActiveVisit    = useAppStore((s) => s.clearActiveVisit)
  const navigateToOrderScreen = useAppStore((s) => s.navigateToOrderScreen)
  const showToast  = useAppStore((s) => s.showToast)
  const completedForms   = useAppStore((s) => s.completedForms)
  const markFormCompleted = useAppStore((s) => s.markFormCompleted)
  const formMeta   = useAppStore((s) => s.formMeta)
  const hydrateFormFromSupabase = useAppStore((s) => s.hydrateFormFromSupabase)
  const resetAllForms    = useAppStore((s) => s.resetAllForms)
  const formDataOwnerId  = useAppStore((s) => s.formDataOwnerId)
  const formAssignments  = useAppStore((s) => s.formAssignments)
  const setFormAssignments   = useAppStore((s) => s.setFormAssignments)
  const isFormWritable   = useAppStore((s) => s.isFormWritable)

  const [hydrating, setHydrating] = useState(false)
  const pollingRef = useRef(null)

  // Is this inspector a collaborator (joined someone else's order)?
  const isCollaborator = useMemo(
    () => !!(activeVisit && session && activeVisit.inspector_username !== session.username),
    [activeVisit, session]
  )

  // ── Claim modal ──────────────────────────────────────────────────────────
  const [claimModal, setClaimModal] = useState({
    open: false, mode: 'take', formCode: '',
    formTitle: '', currentOwner: null, submissionId: null, currentVersion: 0,
  })

  const openClaimModal = useCallback((form, mode) => {
    const formCode   = FORM_ID_TO_CODE[form.id] || form.id
    const assignment = formAssignments?.[formCode]
    setClaimModal({
      open: true, mode, formCode, formTitle: form.title,
      currentOwner:   assignment?.assignedTo    || null,
      submissionId:   assignment?.submissionId  || null,
      currentVersion: assignment?.assignmentVersion ?? 0,
    })
  }, [formAssignments])

  // Reset map: supabase form_code → store reset action (verified against store)
  const RESET_MAP = {
    'inspeccion': 'resetInspectionData',
    'mantenimiento': 'resetMaintenanceData',
    'mantenimiento-ejecutado': 'resetPMExecutedData',
    'inventario': 'resetEquipmentInventoryData',
    'inventario-v2': 'resetEquipmentInventoryV2Data',
    'puesta-tierra': 'resetGroundingSystemData',
    'sistema-ascenso': 'resetSafetyClimbingData',
    'additional-photo-report': 'resetAdditionalPhotoData',
  }

  // ── Re-hydrate a single form — always resets store first to avoid contamination
  const rehydrateForm = useCallback(async (formCode, visitId) => {
    if (!visitId || String(visitId).startsWith('local-')) return
    try {
      const submission = await fetchSubmissionForForm(visitId, formCode)
      if (!submission) return
      let assets = []
      if (submission.id) {
        try {
          const map = await fetchSubmissionAssets([submission.id])
          assets = map[submission.id] || []
        } catch (_) {}
      }
      const inner = submission.payload?.payload || submission.payload
      if (inner?.data) {
        // Reset store for this form before hydrating — prevents own data contamination
        const resetAction = RESET_MAP[formCode]
        if (resetAction) {
          const fn = useAppStore.getState()[resetAction]
          if (fn) {
            console.log('[rehydrateForm] resetting', formCode, 'via', resetAction)
            fn()
          } else {
            console.warn('[rehydrateForm] reset action not found:', resetAction)
          }
        }
        hydrateFormFromSupabase(formCode, submission.payload, assets)
        console.log('[rehydrateForm] hydrated', formCode, 'assets count:', assets.length)
      }
    } catch (e) {
      console.warn('[Home] rehydrateForm failed', e?.message)
    }
  }, [hydrateFormFromSupabase])

  // ── Redirect if no active visit ──────────────────────────────────────────
  useEffect(() => {
    if (!activeVisit) navigate('/order', { replace: true })
  }, [activeVisit, navigate])

  // ── Initial hydration on mount / order change ────────────────────────────
  useEffect(() => {
    if (!activeVisit?.id) return
    if (String(activeVisit.id).startsWith('local-')) return

    const isOwnOrder = formDataOwnerId === activeVisit.id
    const orderOwner = activeVisit.inspector_username

    if (!navigator.onLine) {
      if (!isOwnOrder) {
        resetAllForms()
        useAppStore.setState({ formDataOwnerId: activeVisit.id })
      }
      return
    }

    // Use async inner function so we can await flush before reading Supabase
    const runHydration = async () => {
      setHydrating(true)
      if (!isOwnOrder) resetAllForms()

      // Flush any pending autosaves FIRST — prevents reading stale data
      try { await flushSupabaseQueues() } catch (_) {}

      return fetchVisitSubmissions(activeVisit.id)
      .then(async (submissions) => {
        // Fetch all assets in parallel
        const submissionIds = submissions.map((s) => s.id).filter(Boolean)
        let assetsMap = {}
        if (submissionIds.length > 0) {
          try { assetsMap = await fetchSubmissionAssets(submissionIds) } catch (_) {}
        }

        // Hydrate each form and mark completed ones
        submissions.forEach((s) => {
          const formId = CODE_TO_FORM_ID[s.form_code] || s.form_code
          const inner  = s.payload?.payload || s.payload
          const assets = assetsMap[s.id] || []

          if (s.finalized === true || inner?.finalized === true) {
            markFormCompleted(formId)
          }
          if (inner?.data) {
            hydrateFormFromSupabase(s.form_code, s.payload, assets)
          }
        })

        // Build and store assignment map
        setFormAssignments(buildAssignmentMap(submissions, orderOwner))
        useAppStore.setState({ formDataOwnerId: activeVisit.id })
      })
      .catch((err) => console.warn('[Home] fetchVisitSubmissions failed', err?.message))
      .finally(() => setHydrating(false))
    }
    runHydration()
  }, [activeVisit?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 30-second polling: refresh assignments ───────────────────────────────
  const refreshAssignments = useCallback(async () => {
    const visit = useAppStore.getState().activeVisit
    const me    = useAppStore.getState().session?.username
    if (!visit?.id || String(visit.id).startsWith('local-') || !navigator.onLine) return

    try {
      const submissions = await fetchVisitAssignments(visit.id)
      const newMap = buildAssignmentMap(submissions, visit.inspector_username)
      const currentMap = useAppStore.getState().formAssignments || {}

      // Notify if a form was taken away while we were editing
      for (const [code, oldA] of Object.entries(currentMap)) {
        const newA = newMap[code]
        if (
          oldA?.assignedTo === me &&
          newA?.assignedTo && newA.assignedTo !== me
        ) {
          useAppStore.getState().showToast(
            `"${code}" fue tomado por ${newA.assignedTo}. Ahora estás en modo lectura.`,
            'warning'
          )
        }
      }

      // Merge: preserve local claims that DB doesn't know about yet
      // (happens when user took a free form but first autosave hasn't completed)
      const mergedMap = { ...newMap }
      for (const [code, oldA] of Object.entries(currentMap)) {
        const newA = newMap[code]
        // If I locally claimed a form but DB still shows null, keep my local claim
        if (oldA?.assignedTo === me && (!newA?.assignedTo || newA.assignedTo === null)) {
          mergedMap[code] = { ...newA, assignedTo: me }
        }
      }

      // Re-hydrate forms whose assignment changed (new data from another inspector)
      for (const [code, newA] of Object.entries(mergedMap)) {
        const oldA = currentMap[code]
        const assignmentChanged = newA?.assignmentVersion !== oldA?.assignmentVersion
        const submissionChanged = newA?.submissionId !== oldA?.submissionId
        if ((assignmentChanged || submissionChanged) && newA?.assignedTo && newA.assignedTo !== me) {
          rehydrateForm(code, visit.id).catch(() => {})
        }
      }

      setFormAssignments(mergedMap)
    } catch (_) {}
  }, [setFormAssignments])

  useEffect(() => {
    if (!activeVisit?.id) return
    pollingRef.current = setInterval(refreshAssignments, 30000)
    return () => clearInterval(pollingRef.current)
  }, [activeVisit?.id, refreshAssignments])

  // ── Visible forms filtered by role ───────────────────────────────────────
  const visibleForms = useMemo(() => {
    if (!session) return []
    return filterFormsByRole(ALL_FORMS, session.role)
  }, [session])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const handleCloseOrder = async () => {
    if (!activeVisit) return
    if (!window.confirm(`¿Cerrar la orden ${activeVisit.order_number}?`)) return
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── Header (identical to v2.5.85) ── */}
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
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">PTI Inspect</h1>
            {import.meta.env.VITE_APP_ENV === 'sandbox' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                style={{ background: 'rgba(0,200,160,0.15)', color: '#00C8A0', border: '1px solid rgba(0,200,160,0.3)' }}>
                Sandbox
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm mt-0.5">Sistema de Inspección v2.7.8</p>
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

      {/* ── Collaboration banner ── */}
      {isCollaborator && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Users size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">Modo colaboración.</span> Los formularios libres los puedes tomar.
            Los ocupados los puedes ver o reasignarte.
          </p>
        </div>
      )}

      {/* ── Form list ── */}
      <main className="flex-1 px-4 mt-3">
        <section>
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Formularios</h2>
            <span className="text-xs text-gray-400">
              {(completedForms || []).length}/{visibleForms.length} completados
            </span>
          </div>

          {visibleForms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <ClipboardCheck size={24} className="text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Sin formularios asignados</p>
              <p className="text-xs text-gray-500 mt-1">Su rol no tiene formularios habilitados.</p>
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
                const formCode = FORM_ID_TO_CODE[form.id] || form.id
                const isCompleted   = (completedForms || []).includes(form.id)
                const assignment    = formAssignments?.[formCode]
                const writable      = isFormWritable(formCode)
                const assignedToOther = assignment?.assignedTo && assignment.assignedTo !== session?.username
                // "Free" for a collaborator = no submission row at all OR submission with no data
                const isFreeForCollab = !assignment?.assignedTo
                // Original progress check (for order owner's own view)
                const hasProgress   = !!formMeta?.[form.id]?.startedAt && !isCompleted && !hydrating

                // ── Status badge ── keeps original labels + adds Ocupado/Libre
                const getStatus = () => {
                  if (isCompleted) return { label: 'Completado', badge: 'bg-green-50 text-green-600 border-green-200' }

                  if (isCollaborator) {
                    // Collaborator's view
                    if (assignedToOther) return { label: 'Ocupado',    badge: 'bg-amber-50 text-amber-600 border-amber-200' }
                    if (!isFreeForCollab && !assignedToOther) return { label: 'En progreso', badge: 'bg-amber-50 text-amber-600 border-amber-200' } // I took it, has data
                    if (isFreeForCollab) return { label: 'Libre',      badge: 'bg-green-50 text-green-600 border-green-200' }
                    return { label: 'Pendiente', badge: 'bg-gray-50 text-gray-500 border-gray-200' }
                  }

                  // Order owner's view — same as v2.5.85 + show "Ocupado" if collaborator took it
                  if (assignedToOther) return { label: 'Ocupado',     badge: 'bg-amber-50 text-amber-600 border-amber-200' }
                  if (hasProgress)     return { label: 'En progreso', badge: 'bg-amber-50 text-amber-600 border-amber-200' }
                  return { label: 'Pendiente', badge: 'bg-gray-50 text-gray-500 border-gray-200' }
                }
                const status = getStatus()

                // Visual accent for collaboration
                const leftBorder = !isCompleted && isCollaborator
                  ? assignedToOther ? 'border-l-4 border-l-amber-400'
                  : isFreeForCollab  ? 'border-l-4 border-l-green-500'
                  : ''
                  : ''

                const handleCardClick = async () => {
                  if (isCompleted || hydrating) return
                  if (!writable && !assignedToOther) return
                  // Always re-fetch latest data when viewing an occupied form
                  if (assignedToOther) {
                    await rehydrateForm(formCode, activeVisit?.id)
                  }
                  navigate(form.route)
                }

                return (
                  <div key={form.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${leftBorder} ${
                    isCompleted        ? 'border-gray-100 opacity-70'
                    : assignedToOther  ? 'border-gray-200'
                    : isCollaborator && isFreeForCollab ? 'border-gray-200'
                    : 'border-gray-100'
                  }`}>
                    {/* ── Card body ── */}
                    <button
                      onClick={handleCardClick}
                      disabled={isCompleted}
                      className={`w-full flex items-center gap-4 text-left transition-all ${
                        (isCollaborator && isFreeForCollab) || assignedToOther ? 'px-4 pt-4 pb-3' : 'p-4'
                      } ${
                        isCompleted ? 'bg-gray-50 cursor-not-allowed' : 'bg-white active:bg-gray-50'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        isCompleted ? 'bg-green-500' : form.iconBg
                      }`}>
                        {isCompleted
                          ? <Check size={28} className="text-white" strokeWidth={3} />
                          : <IconComponent size={28} className="text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-base ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                          {form.title}
                        </h3>
                        {assignedToOther && (
                          <p className="text-xs text-amber-700 mt-0.5 font-medium">
                            {assignment.assignedTo} está editando
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.badge}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {isCompleted        ? <Lock      size={18} className="text-gray-300 flex-shrink-0" />
                       : assignedToOther  ? <Eye       size={18} className="text-amber-400 flex-shrink-0" />
                       : <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />}
                    </button>

                    {/* ── Card footer: action buttons ── */}
                    {!isCompleted && !hydrating && (
                      <>
                        {/* Free form → Tomar e iniciar */}
                        {isCollaborator && isFreeForCollab && (
                          <div className="border-t border-gray-100 px-4 py-3">
                            <button
                              onClick={() => openClaimModal(form, 'take')}
                              className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold active:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                              <Users size={14} className="text-gray-400" /> Tomar e iniciar
                            </button>
                          </div>
                        )}

                        {/* Occupied form → Ver + Reasignarme */}
                        {assignedToOther && (
                          <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
                            <button
                              onClick={() => navigate(form.route)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold active:bg-gray-50 transition-all"
                            >
                              <Eye size={11} /> Ver
                            </button>
                            <button
                              onClick={() => openClaimModal(form, 'reassign')}
                              className="flex-1 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold active:opacity-80 transition-all"
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

      {/* ── Bottom actions ── */}
      {activeVisit && (
        <div className="px-4 pb-2 pt-3 space-y-2">
          <button
            onClick={handleChangeOrder}
            className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-bold active:scale-[0.98] transition-all"
          >
            {isCollaborator ? 'Salir de esta orden' : 'Cambiar Orden'}
          </button>
          {!isCollaborator && (
            <button
              onClick={handleCloseOrder}
              className="w-full py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-600 text-sm font-bold active:scale-[0.98] transition-all"
            >
              Cerrar Orden
            </button>
          )}
        </div>
      )}

      <footer className="px-6 py-3 text-center">
        <p className="text-xs text-gray-400">© 2026</p>
      </footer>

      {/* ── Claim modal ── */}
      <ClaimFormModal
        isOpen={claimModal.open}
        onClose={() => setClaimModal((p) => ({ ...p, open: false }))}
        mode={claimModal.mode}
        formCode={claimModal.formCode}
        formTitle={claimModal.formTitle}
        currentOwner={claimModal.currentOwner}
        submissionId={claimModal.submissionId}
        currentVersion={claimModal.currentVersion}
        onSuccess={async (assignment) => {
          // Hydrate previous owner's data before navigating (reassign path)
          if (assignment?.needsHydration && activeVisit?.id) {
            await rehydrateForm(claimModal.formCode, activeVisit.id)
          }
          const form = visibleForms.find(
            (f) => (FORM_ID_TO_CODE[f.id] || f.id) === claimModal.formCode
          )
          if (form) navigate(form.route)
        }}
      />
    </div>
  )
}
