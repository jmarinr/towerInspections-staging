import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import { useAppStore } from '../hooks/useAppStore'
import { fetchSubmissionForForm } from '../lib/siteVisitService'
import FormLockedScreen from '../components/ui/FormLockedScreen'
import { Wrench, ClipboardList, Camera as CameraIcon, Package, Shield, Activity, CheckCircle2 } from 'lucide-react'

// Maps normalizedId → form_code stored in submissions table
const FORM_CODE_MAP = {
  'inspeccion': 'inspeccion',
  'mantenimiento': 'mantenimiento',
  'equipment': 'inventario',
  'equipment-v2': 'inventario-v2',
  'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
  'sistema-ascenso': 'sistema-ascenso',
  'grounding-system-test': 'puesta-tierra',
  'additional-photo-report': 'additional-photo-report',
}

const FORM_MAP = {
  inspeccion: {
    title: 'Inspección del sitio',
    description: 'Registre el checklist de inspección del sitio.',
    summary: ['Datos del sitio', 'Checklist por secciones', 'Evidencia fotográfica'],
    route: '/inspeccion',
    icon: ClipboardList,
  },
  mantenimiento: {
    title: 'Mantenimiento preventivo',
    description: 'Registre actividades de mantenimiento preventivo con fotos antes/después.',
    summary: ['Datos del sitio', 'Checklist de actividades', 'Fotos antes / después'],
    // Ruta canónica (App.jsx mantiene también alias /mantenimiento)
    route: '/mantenimiento-preventivo',
    icon: Wrench,
  },
  equipment: {
    title: 'Inventario de equipos',
    description: 'Documente inventario y evidencia fotográfica del sitio.',
    summary: ['Datos generales', 'Inventario / detalles', 'Fotos y observaciones'],
    route: '/inventario-equipos',
    icon: Package,
  },
  'equipment-v2': {
    title: 'Inventario de Equipos v2',
    description: 'Inventario con dimensiones desglosadas y evidencia fotográfica.',
    summary: ['Datos generales', 'Torre (dimensiones)', 'Piso (clientes)', 'Fotos de evidencia'],
    route: '/inventario-equipos-v2',
    icon: Package,
  },
  'sistema-ascenso': {
    title: 'Sistema de ascenso',
    description: 'Inspección de dispositivos y condiciones de seguridad.',
    summary: ['Secciones por componente', 'Campos técnicos', 'Fotos de evidencia'],
    route: '/sistema-ascenso',
    icon: Shield,
  },
  'grounding-system-test': {
    title: 'Grounding System Test',
    description: 'Registro de prueba de sistema de puesta a tierra.',
    summary: ['Datos generales', 'Mediciones', 'Cálculos automáticos'],
    route: '/grounding-system-test',
    icon: Activity,
  },
  'mantenimiento-ejecutado': {
    title: 'Mantenimiento ejecutado',
    description: 'Registro del mantenimiento preventivo ejecutado (según checklist).',
    summary: ['Datos de ejecución', 'Actividades', 'Fotos antes / después'],
    route: '/mantenimiento-ejecutado',
    icon: CheckCircle2,
  },
  'additional-photo-report': {
    title: 'Reporte Adicional de Fotografías',
    description: 'Capture las 16 categorías fotográficas requeridas para el expediente del sitio.',
    summary: ['16 categorías (ACC, CAM, EQTT…)', 'Acrónimos para nomenclatura de archivos', 'Fotos variables por categoría'],
    route: '/reporte-fotos',
    icon: CameraIcon,
  },
  // compatibilidad
  'pm-executed': {
    title: 'Mantenimiento ejecutado',
    description: 'Registro del mantenimiento preventivo ejecutado (según checklist).',
    summary: ['Datos de ejecución', 'Actividades', 'Fotos antes / después'],
    route: '/mantenimiento-ejecutado',
    icon: CheckCircle2,
  },
}

const pad2 = (n) => String(n).padStart(2, '0')
const getDateTime = () => {
  const d = new Date()
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  return { date, time, startedAt: d.toISOString() }
}

const getGeo = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalización no soportada'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })

export default function FormIntro() {
  const navigate = useNavigate()
  const { formId } = useParams()
  const [loading, setLoading] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [serverFinalized, setServerFinalized] = useState(null) // null=loading, true=finalized, false=not

  const cfg = useMemo(() => FORM_MAP[formId], [formId])

  const isFormWritableStore = useAppStore((s) => s.isFormWritable)
  const formAssignments = useAppStore((s) => s.formAssignments)
  const session = useAppStore((s) => s.session)

  const {
    setFormMeta,
    showToast,
    updateSiteInfo,
    updateMaintenanceField,
    updateEquipmentSiteField,
    updateEquipmentV2SiteField,
    updatePMExecutedField,
    setSafetyField,
    setGroundingField,
    resetFormDraft,
    formMeta,
    activeVisit,
    isFormCompleted,
    markFormCompleted,
    selectedSite,
  } = useAppStore()

  // Canonical form_code map (normalizedId → supabase form_code)
  const normalizedToCode = {
    'inspeccion': 'inspeccion', 'mantenimiento': 'mantenimiento',
    'equipment': 'inventario', 'equipment-v2': 'inventario-v2',
    'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
    'sistema-ascenso': 'sistema-ascenso', 'grounding-system-test': 'puesta-tierra',
    'additional-photo-report': 'additional-photo-report',
  }

  // Check if this form has previous data
  const normalizedId = useMemo(() => {
    if (!formId) return ''
    return formId === 'pm-executed' ? 'mantenimiento-ejecutado' : formId
  }, [formId])

  // v2.5.86 — assignment / writable state
  const formCodeCanon = normalizedToCode[normalizedId] || normalizedId
  const assignment = formAssignments?.[formCodeCanon]
  const writable = isFormWritableStore(formCodeCanon)
  const assignedToOther = assignment?.assignedTo && assignment.assignedTo !== session?.username

  // Check Supabase directly for finalized status — source of truth
  useEffect(() => {
    if (!normalizedId || !activeVisit?.id) return
    setServerFinalized(null)
    const formCode = FORM_CODE_MAP[normalizedId]
    if (!formCode) return
    fetchSubmissionForForm(activeVisit.id, formCode)
      .then((submission) => {
        // Check column first (reliable), fallback to JSONB
        const colFinalized = submission?.finalized === true
        const inner = submission?.payload?.payload || submission?.payload
        const jsonbFinalized = inner?.finalized === true
        if (colFinalized || jsonbFinalized) {
          setServerFinalized(true)
          markFormCompleted(normalizedId)
        } else {
          setServerFinalized(false)
        }
      })
      .catch(() => setServerFinalized(false))
  }, [normalizedId, activeVisit?.id])

  const hasPreviousData = useMemo(() => {
    if (!normalizedId) return false
    return !!formMeta?.[normalizedId]?.startedAt
  }, [formMeta, normalizedId])

  // Map normalizedId → resetFormDraft key
  const resetKeyMap = {
    'inspeccion': 'inspeccion',
    'mantenimiento': 'mantenimiento',
    'equipment': 'inventario',
    'equipment-v2': 'inventario-v2',
    'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
    'sistema-ascenso': 'safety-system',
    'grounding-system-test': 'puesta-tierra',
  }

  if (!cfg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Formulario" showBack onBack={() => navigate('/')} />
        <div className="max-w-xl mx-auto px-4 py-10 text-center text-gray-700">
          <div className="text-lg font-bold">Formulario no encontrado</div>
          <button className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={() => navigate('/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Show loading while checking Supabase
  if (serverFinalized === null && activeVisit?.id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-400">Verificando estado...</div>
      </div>
    )
  }

  // Server says finalized OR local store says completed
  if (serverFinalized === true || isFormCompleted(normalizedId)) {
    return <FormLockedScreen title={cfg.title} />
  }

  // Called when user taps "Iniciar Formulario"
  const handleStart = () => {
    if (hasPreviousData) {
      setShowResumeDialog(true)
      return
    }
    start()
  }

  // Continue with existing data
  const handleResume = () => {
    setShowResumeDialog(false)
    navigate(cfg.route)
  }

  // Reset and start fresh
  const handleRestart = () => {
    if (!confirm('¿Seguro que deseas reiniciar? Se borrarán todos los datos ingresados en este formulario.')) return
    setShowResumeDialog(false)
    const resetKey = resetKeyMap[normalizedId]
    if (resetKey) resetFormDraft(resetKey)
    start()
  }

  const start = async () => {
    if (loading) return
    setLoading(true)

    const base = getDateTime()

    // 1) Guardar meta base (fecha/hora) inmediatamente
    setFormMeta(normalizedId, { ...base, lat: null, lng: null })

    // 2) Copiar fecha/hora a los "campos" existentes del formulario (sin mostrarlos)
    try {
      if (normalizedId === 'inspeccion') {
        updateSiteInfo('fecha', base.date)
        updateSiteInfo('hora', base.time)
      }
      if (normalizedId === 'mantenimiento') {
        updateMaintenanceField('fechaInicio', base.date)
        updateMaintenanceField('horaEntrada', base.time)
      }
      if (normalizedId === 'equipment') {
        updateEquipmentSiteField('fechaInicio', base.date)
      }
      if (normalizedId === 'equipment-v2') {
        updateEquipmentV2SiteField('fechaInicio', base.date)
      }
      if (normalizedId === 'mantenimiento-ejecutado') {
        updatePMExecutedField('fecha', base.date)
        updatePMExecutedField('hora', base.time)
      }
      if (normalizedId === 'sistema-ascenso') {
        setSafetyField('datos', 'fechaInicio', base.date)
      }
      if (normalizedId === 'grounding-system-test') {
        setGroundingField('datos', 'fechaInicio', base.date)
      }
      // additional-photo-report: meta only, no inner fields
    } catch (e) {
      // no bloquear
    }

    // 2b) Auto-fill site data from active order
    if (activeVisit) {
      const sId = activeVisit.site_id || ''
      const sName = activeVisit.site_name || ''
      const sOrder = activeVisit.order_number || ''
      try {
        if (normalizedId === 'inspeccion') {
          updateSiteInfo('idSitio', sId)
          updateSiteInfo('nombreSitio', sName)
          updateSiteInfo('numeroOrden', sOrder)
        }
        if (normalizedId === 'mantenimiento') {
          updateMaintenanceField('idSitio', sId)
          updateMaintenanceField('nombreSitio', sName)
          updateMaintenanceField('numeroOrden', sOrder)
        }
        if (normalizedId === 'equipment') {
          updateEquipmentSiteField('idSitio', sId)
          updateEquipmentSiteField('nombreSitio', sName)
          updateEquipmentSiteField('numeroOrden', sOrder)
        }
        if (normalizedId === 'equipment-v2') {
          updateEquipmentV2SiteField('idSitio', sId)
          updateEquipmentV2SiteField('nombreSitio', sName)
          updateEquipmentV2SiteField('numeroOrden', sOrder)
        }
        if (normalizedId === 'mantenimiento-ejecutado') {
          updatePMExecutedField('idSitio', sId)
          updatePMExecutedField('nombreSitio', sName)
          updatePMExecutedField('numeroOrden', sOrder)
        }
        if (normalizedId === 'sistema-ascenso') {
          setSafetyField('datos', 'idSitio', sId)
          setSafetyField('datos', 'nombreSitio', sName)
          setSafetyField('datos', 'numeroOrden', sOrder)
        }
        if (normalizedId === 'grounding-system-test') {
          setGroundingField('datos', 'idSitio', sId)
          setGroundingField('datos', 'nombreSitio', sName)
          setGroundingField('datos', 'numeroOrden', sOrder)
        }
      } catch (e) {
        // no bloquear
      }
    }

    // 3) Capturar GPS (si el usuario permite)
    getGeo()
      .then((pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setFormMeta(normalizedId, { ...base, lat, lng })

        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        try {
          if (normalizedId === 'inspeccion') updateSiteInfo('coordenadas', coordsStr)
          if (normalizedId === 'mantenimiento') updateMaintenanceField('coordenadas', coordsStr)
          if (normalizedId === 'mantenimiento-ejecutado') updatePMExecutedField('coordenadas', coordsStr)
          if (normalizedId === 'equipment') {
            updateEquipmentSiteField('latitud', String(lat))
            updateEquipmentSiteField('longitud', String(lng))
          }
          if (normalizedId === 'equipment-v2') {
            updateEquipmentV2SiteField('latitud', String(lat))
            updateEquipmentV2SiteField('longitud', String(lng))
          }
          if (normalizedId === 'sistema-ascenso') {
            setSafetyField('datos', 'latitud', String(lat))
            setSafetyField('datos', 'longitud', String(lng))
          }
          if (normalizedId === 'grounding-system-test') {
            setGroundingField('datos', 'latitud', String(lat))
            setGroundingField('datos', 'longitud', String(lng))
          }
          // additional-photo-report: GPS stored only in formMeta, no inner fields needed
        } catch (e) {
          // no bloquear
        }
      })
      .catch(() => {
        showToast('No se pudo capturar GPS automáticamente (permiso/ubicación). Puedes continuar.', 'warning')
      })
      .finally(() => setLoading(false))

    // 4) Navegar sin esperar al GPS
    navigate(cfg.route)
  }

  const Icon = cfg.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={cfg.title} showBack onBack={() => navigate('/')} />

      {/* v2.5.86 — Mode Banner */}
      {!writable && assignedToOther && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-800">Solo lectura</p>
            <p className="text-xs text-amber-700">{assignment.assignedTo} está editando este formulario</p>
          </div>
        </div>
      )}
      {writable && assignment?.assignedTo && (
        <div className="bg-teal-50 border-b border-teal-200 px-4 py-2.5 flex items-center gap-3">
          <p className="text-xs font-bold text-teal-800 flex-1">Modo escritura — asignado a ti</p>
          <span className="text-[10px] text-teal-600">● Guardando</span>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-6 pb-28">

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-extrabold text-gray-900">{cfg.title}</div>
              <div className="text-sm text-gray-600 mt-1">{cfg.description}</div>
            </div>
          </div>

          {selectedSite && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex-shrink-0">
                {selectedSite.site_id}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate">{selectedSite.name}</span>
              {selectedSite.province && (
                <span className="text-xs text-gray-400 flex-shrink-0">{selectedSite.province}</span>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="text-sm font-bold text-gray-900">Resumen</div>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {cfg.summary.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-[3px] h-4 w-4 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* v2.5.86 — show different button based on write access */}
          {assignedToOther ? (
            <div className="mt-6 space-y-2">
              <button
                type="button"
                className="w-full px-4 py-3 rounded-2xl bg-gray-100 border border-gray-200 text-gray-700 font-semibold active:scale-[0.99]"
                onClick={() => navigate(cfg.route)}
              >
                👁 Ver formulario (solo lectura)
              </button>
              <p className="text-xs text-center text-amber-700">
                Para editar, usa el botón "Reasignarme" en la lista de formularios.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="mt-6 w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 text-white font-semibold shadow-sm active:scale-[0.99] disabled:opacity-70"
              onClick={handleStart}
              disabled={loading || (!selectedSite && !activeVisit?.site_id)}
            >
              {loading ? 'Iniciando…'
                : (!selectedSite && !activeVisit?.site_id) ? 'Seleccione un sitio primero'
                : hasPreviousData ? 'Continuar →'
                : 'Iniciar Formulario →'}
            </button>
          )}
        </div>
      </div>

      {/* Resume Dialog */}
      {showResumeDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowResumeDialog(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header strip */}
            <div className="bg-primary px-5 pt-5 pb-6">
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-base font-extrabold text-white text-center">
                Datos previos encontrados
              </h3>
              <p className="text-xs text-white/70 text-center mt-1.5 leading-relaxed">
                Este formulario tiene datos guardados. ¿Continuar o iniciar desde cero?
              </p>
            </div>

            {/* Date badge */}
            {formMeta?.[normalizedId]?.startedAt && (
              <div className="mx-5 -mt-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center shadow-sm">
                <p className="text-[11px] text-gray-400 font-medium">Iniciado</p>
                <p className="text-sm font-extrabold text-gray-800 mt-0.5">
                  {new Date(formMeta[normalizedId].startedAt).toLocaleDateString('es', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="p-5 pt-4 space-y-2">
              <button
                onClick={handleResume}
                className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm"
              >
                Continuar con datos previos
              </button>
              <button
                onClick={() => setShowResumeDialog(false)}
                className="w-full py-2.5 text-sm font-semibold text-gray-400 active:scale-[0.98]"
              >
                Cancelar
              </button>
            </div>

            {/* Safe area spacer on mobile */}
            <div className="h-safe-bottom pb-2" />
          </div>
        </div>
      )}
    </div>
  )
}
