import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { queueSubmissionSync, queueAssetUpload, flushSupabaseQueues, clearSupabaseLocalForForm } from '../lib/supabaseSync'
import { getDeviceId } from '../lib/deviceId'
import { closeSiteVisit, fetchVisitSubmissions } from '../lib/siteVisitService'

const getDefaultDate = () => new Date().toISOString().split('T')[0]
const getDefaultTime = () => new Date().toTimeString().slice(0, 5)

// Versión mostrada en UI y enviada como metadata a Supabase
const APP_VERSION_DISPLAY = '2.7.15'
const FORM_CODE_ADDITIONAL = 'additional-photo-report'

// ── Auto-cierre de orden ──────────────────────────────────────────────────────
// Los 6 formularios que deben estar finalizados para cerrar la orden automáticamente.
// 'equipment' (legacy) excluido — solo aplica equipment-v2.
const REQUIRED_CANONICAL = [
  'mantenimiento',
  'mantenimiento-ejecutado',
  'equipment-v2',
  'sistema-ascenso',
  'additional-photo-report',
  'grounding-system-test',
]

// Mapa de aliases → código canónico (para normalizar lo que viene de Supabase)
const FORM_CODE_ALIAS = {
  'preventive-maintenance': 'mantenimiento',
  'executed-maintenance':   'mantenimiento-ejecutado',
  'inventario-v2':          'equipment-v2',
  'safety-system':          'sistema-ascenso',
  'additional-photo':       'additional-photo-report',
  'puesta-tierra':          'grounding-system-test',
}
const normalizeCode = c => FORM_CODE_ALIAS[c] || c

const isDataUrlString = (value) =>
  typeof value === 'string' && value.startsWith('data:')

// ---- Helpers to strip large data URLs before persisting to localStorage ----
// Photos are already synced to Supabase Storage, so we only keep a small marker
// in localStorage to remember that a photo exists (without the heavy base64 payload).
const PHOTO_PLACEHOLDER = '__photo__'

function stripSingle(val) {
  if (typeof val === 'string' && val.startsWith('data:')) return PHOTO_PLACEHOLDER
  return val
}

function stripDataUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = stripSingle(v)
  }
  return out
}

function stripDataUrlFields(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = (typeof v === 'string' && v.startsWith('data:')) ? PHOTO_PLACEHOLDER : v
  }
  return out
}

/** Returns true if the value is a renderable image source (data URL, blob URL, or http URL) */
export function isDisplayablePhoto(val) {
  if (!val || typeof val !== 'string') return false
  if (val === PHOTO_PLACEHOLDER || val === '__photo_uploaded__') return false
  return val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('http')
}

/**
 * Recover a photo data URL from the pending assets queue in localStorage.
 * Used after reload when the store only has '__photo__' placeholder.
 * Falls back to checking uploaded asset URLs (saved after successful Supabase upload).
 * @param {string} formCode - e.g. 'inspection-general'
 * @param {string} assetType - e.g. 'inspection:item1:before'
 * @returns {string|null} data URL, public URL, or null
 */
export function recoverPhotoFromQueue(formCode, assetType) {
  try {
    // First check pending queue (has full data URL)
    const raw = localStorage.getItem('pti_pending_assets_v1')
    if (raw) {
      const map = JSON.parse(raw)
      const list = Array.isArray(map?.[formCode]) ? map[formCode] : []
      const asset = list.find(a => a.assetType === assetType && a.action === 'upload' && a.dataUrl)
      if (asset?.dataUrl) return asset.dataUrl
    }
  } catch (_) {}

  try {
    // Fallback: check uploaded URLs map (has public URL from Supabase Storage)
    const urlsRaw = localStorage.getItem('pti_uploaded_urls_v1')
    if (urlsRaw) {
      const urlsMap = JSON.parse(urlsRaw)
      const key = `${formCode}::${assetType}`
      if (urlsMap[key]) return urlsMap[key]
    }
  } catch (_) {}

  return null
}

/**
 * Deep-strip data URLs from any object/nested structure before sending to Supabase.
 * Replaces data:image/... strings with '__photo_uploaded__' marker.
 * This prevents Supabase JSONB column overflow (data URLs can be 1-3MB each).
 */
function stripPayloadPhotos(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    if (obj.startsWith('data:')) return '__photo_uploaded__'
    if (obj.startsWith('blob:')) return '__photo_uploaded__'
    return obj
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj
  if (Array.isArray(obj)) return obj.map(stripPayloadPhotos)
  if (typeof obj === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = stripPayloadPhotos(v)
    }
    return out
  }
  return obj
}

// Datos por defecto para mantenimiento v1.1.4
const getDefaultMaintenanceData = () => ({
  currentStep: 1,
  completedSteps: [],
  formData: {
    proveedor: 'OFG PANAMA, S.A.',
    tipoVisita: 'mantenimiento',
    nombreSitio: '',
    idSitio: '',
    coordenadas: '',
    tipoSitio: '',
    fechaInicio: '',
    horaEntrada: '',
    horaSalida: '',
    tipoTorre: '',
    alturaTorre: '',
    alturaEdificio: '',
    condicionTorre: '',
    numSecciones: '',
    tipoSeccion: '',
    tipoPierna: '',
    tieneCamuflaje: '',
    tipoCamuflaje: '',
    fotoTorre: '',
    calle: '',
    numero: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    pais: 'Panamá',
    descripcionSitio: '',
    restriccionHorario: '',
    descripcionAcceso: '',
    propietarioLocalizable: '',
    tipoLlave: '',
    claveCombinacion: '',
    memorandumRequerido: '',
    problemasAcceso: '',
    fotoCandado: '',
    ubicacionMedidores: '',
    tipoConexion: '',
    capacidadTransformador: '',
    numMedidores: '',
    medidorSeparadoLuces: '',
    fibraOptica: '',
    vandalismo: '',
    descripcionVandalismo: '',
    equiposFaltantes: '',
    defectosOperacion: '',
    observacionesGenerales: '',
  },
  checklistData: {},
  photos: {},
})

// Datos por defecto para Inventario de Equipos (Formulario 3)
const getDefaultEquipmentInventoryData = () => ({
  siteInfo: {
    proveedor: 'OFG PANAMA, S.A.',
    tipoVisita: 'mantenimiento', // RoofTop | RawLand
    idSitio: '',
    nombreSitio: '',
    fechaInicio: '',
    direccion: '',
    alturaMts: '',
    tipoSitio: '',
    tipoEstructura: '',
    latitud: '',
    longitud: '',
  },
  torre: {
    items: [
      { alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', dimensionesMts: '', areaM2: '', carrier: '' },
    ],
  },
  piso: {
    clientes: [
      {
        tipoCliente: 'ancla', // ancla | colo
        nombreCliente: '',
        areaArrendada: '',
        areaEnUso: '',
        placaEquipos: '',
        gabinetes: [
          { gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' },
        ],
      },
    ],
  },
  distribucionTorre: {
    // JSON editable + evidencia PNG
    scene: { objects: [] },
    pngDataUrl: '',
    fotoTorreDataUrl: '',
  },
  croquisEsquematico: {
    drawing: null,
    pngDataUrl: '',
    niveles: { nivel1: '', nivel2: '', nivel3: '', banqueta: '' },
  },
  planoPlanta: {
    drawing: null,
    pngDataUrl: '',
  },
})

// Datos por defecto para Formulario 6: Reporte de Trabajos Ejecutados (Mantenimiento Preventivo)
const getDefaultPMExecutedData = () => ({
  siteInfo: {
    proveedor: 'OFG PANAMA, S.A.',
    idSitio: '',
    tipoVisita: 'mantenimiento',
    nombreSitio: '',
    tipoSitio: '', // rooftop | rawland
    fecha: '',
    hora: '',
    coordenadas: '',
    direccion: '',
  },
  photos: {}, // `${activityId}-before` / `${activityId}-after`
})

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ============ SESSION / AUTH ============
      session: null, // { username, name, role, roleLabel }
      forceUpdate: false,
      displacedByDevice: false,
      setSession: (user) => set({ session: user }),
      logout: ({ clearDevice = true } = {}) => {
        // clearDevice=true  → voluntary logout — wipe active_device_id + signOut Supabase
        // clearDevice=false → watchdog displaced logout — only clear local state
        //   DO NOT call supabase.auth.signOut() here — it would invalidate ALL sessions
        //   for this user globally (including the new device that took over)
        const userId = get().session?.userId
        if (clearDevice && userId) {
          import('../lib/supabaseClient').then(({ supabase }) => {
            supabase.from('app_users')
              .update({ active_device_id: null, active_device_at: null })
              .eq('id', userId)
              .then(() => supabase.auth.signOut())
              .catch(() => supabase.auth.signOut().catch(() => {}))
          }).catch(() => {})
        } else if (clearDevice) {
          // No userId but voluntary logout
          import('../lib/supabaseClient').then(({ supabase }) => supabase.auth.signOut()).catch(() => {})
        }
        // clearDevice=false: just clear local state, do NOT touch Supabase Auth
        set({ session: null, activeVisit: null, completedForms: [], formDataOwnerId: null, selectedSite: null })
      },

      // ============ ACTIVE VISIT (ORDER) ============
      appVersion: APP_VERSION_DISPLAY,
      activeVisit: null,
      selectedSite: null,  // { id, site_id, name, province, height_m, region_id }
      // v2.5.86 — collaborative inspection: tracks who has each form assigned
      // keyed by canonical form_code e.g. 'mantenimiento', 'inventario-v2'
      // { assignedTo, assignmentVersion, assignedAt, submissionId }
      formAssignments: {}, // keyed by canonical form_code: { assignedTo, assignmentVersion, assignedAt, submissionId }
      completedForms: [], // form IDs completed in current visit (e.g. ['inspeccion', 'mantenimiento'])
      formDataOwnerId: null, // ID of the order that owns the current form data in localStorage

      // Inject order/site data into ALL forms' siteInfo at once
      injectVisitSiteData: (visit) => {
        if (!visit) return
        const sId = visit.site_id || ''
        const sName = visit.site_name || ''
        const sOrder = visit.order_number || ''
        set((state) => ({
          inspectionData: {
            ...state.inspectionData,
            siteInfo: { ...(state.inspectionData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          maintenanceData: {
            ...state.maintenanceData,
            formData: { ...(state.maintenanceData?.formData || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          pmExecutedData: {
            ...state.pmExecutedData,
            siteInfo: { ...(state.pmExecutedData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          equipmentInventoryV2Data: {
            ...state.equipmentInventoryV2Data,
            siteInfo: { ...(state.equipmentInventoryV2Data?.siteInfo || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          equipmentInventoryData: {
            ...state.equipmentInventoryData,
            siteInfo: { ...(state.equipmentInventoryData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          safetyClimbingData: {
            ...state.safetyClimbingData,
            datos: { ...(state.safetyClimbingData?.datos || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
          groundingSystemData: {
            ...state.groundingSystemData,
            datos: { ...(state.groundingSystemData?.datos || {}), idSitio: sId, nombreSitio: sName, numeroOrden: sOrder },
          },
        }))
      },

      // Continue existing order - never reset completedForms here,
      // hydration from Supabase will restore them via markFormCompleted
      selectSite: (site) => {
        // Store selected site and inject into all form siteInfo fields
        set({ selectedSite: site })
        if (!site) return
        const sId = site.site_id || ''
        const sName = site.name || ''
        const sRef = site.id || null
        const sRegion = site.region_id || null
        set((state) => ({
          inspectionData: { ...state.inspectionData,
            siteInfo: { ...(state.inspectionData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          maintenanceData: { ...state.maintenanceData,
            formData: { ...(state.maintenanceData?.formData || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          pmExecutedData: { ...state.pmExecutedData,
            siteInfo: { ...(state.pmExecutedData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          equipmentInventoryV2Data: { ...state.equipmentInventoryV2Data,
            siteInfo: { ...(state.equipmentInventoryV2Data?.siteInfo || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          equipmentInventoryData: { ...state.equipmentInventoryData,
            siteInfo: { ...(state.equipmentInventoryData?.siteInfo || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          safetyClimbingData: { ...state.safetyClimbingData,
            datos: { ...(state.safetyClimbingData?.datos || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
          groundingSystemData: { ...state.groundingSystemData,
            datos: { ...(state.groundingSystemData?.datos || {}), idSitio: sId, nombreSitio: sName, siteRef: sRef, region_id: sRegion } },
        }))
      },

      // Continue existing order — always reset to avoid cross-order data bleed
      setActiveVisit: (visit) => {
        get().resetAllForms()
        set({ activeVisit: visit, completedForms: [], formDataOwnerId: visit?.id || null })
        get().injectVisitSiteData(visit)
      },
      // Create new order — same reset behavior, semantically distinct for clarity
      setNewActiveVisit: (visit) => {
        get().resetAllForms()
        set({ activeVisit: visit, completedForms: [], formDataOwnerId: visit?.id || null })
        get().injectVisitSiteData(visit)
      },
      clearActiveVisit: () => {
        get().resetAllForms()
        set({ activeVisit: null, completedForms: [], formDataOwnerId: null })
      },

      // ── Auto-cierre de orden ──────────────────────────────────────────────
      // Verifica desde Supabase si los 6 forms requeridos están finalizados.
      // Si sí → cierra la visita automáticamente con GPS y muestra toast.
      checkAndAutoCloseVisit: async () => {
        const visit = get().activeVisit
        if (!visit || visit.status !== 'open' || String(visit.id).startsWith('local-')) return

        try {
          const submissions = await fetchVisitSubmissions(visit.id)

          const finalizedCodes = new Set(
            submissions
              .filter(s => s.finalized)
              .map(s => normalizeCode(s.form_code))
          )

          const allDone = REQUIRED_CANONICAL.every(code => finalizedCodes.has(code))
          if (!allDone) return

          // Todos los 6 forms finalizados → capturar GPS y cerrar
          let lat = null, lng = null
          try {
            const pos = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej,
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
            )
            lat = pos.coords.latitude
            lng = pos.coords.longitude
          } catch (_) {}

          await closeSiteVisit(visit.id, { lat, lng })
          get().clearActiveVisit()
          get().showToast('✓ Orden cerrada automáticamente — todos los formularios completados', 'success')
        } catch (e) {
          console.warn('[AutoClose] check failed:', e?.message || e)
        }
      },
      // Navigate to order screen without resetting form data
      navigateToOrderScreen: () => {
        // Keep formDataOwnerId and completedForms so we know who owns the cached data
        set({ activeVisit: null })
      },
      resetAllForms: () => {
        // Reset all form data stores
        const allFormKeys = [
          'inspeccion',
          'mantenimiento',
          'inventario',
          'inventario-v2',
          'mantenimiento-ejecutado',
          'puesta-tierra',
          'safety-system',
          'additional-photo',
        ]
        for (const key of allFormKeys) {
          try { get().resetFormDraft(key) } catch (_) {}
        }
        // Also clear formMeta (start timestamps) and owner tracking
        set({ formMeta: {}, formDataOwnerId: null, formAssignments: {} })
      },
      markFormCompleted: (formId) => set((state) => {
        const list = state.completedForms || []
        if (list.includes(formId)) return state
        return { completedForms: [...list, formId] }
      }),
      isFormCompleted: (formId) => (get().completedForms || []).includes(formId),

      // ============ CONNECTIVITY ============
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncStatus: 'idle', // 'idle' | 'syncing' | 'error' | 'offline'
      pendingSyncCount: 0,
      setOnline: (online) => set({ isOnline: online, syncStatus: online ? 'idle' : 'offline' }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      // ============ TOAST ============
      toast: { show: false, message: '', type: 'info' },
      _toastTimer: null,
      showToast: (message, type = 'info') => {
        // Clear any existing timer to prevent race conditions
        const prev = get()._toastTimer
        if (prev) clearTimeout(prev)

        set({ toast: { show: true, message, type } })
        const timer = setTimeout(() => {
          try {
            set({ toast: { show: false, message: '', type: 'info' }, _toastTimer: null })
          } catch (_) {
            // If set() fails (e.g. persist/localStorage error), force-hide via DOM
          }
        }, 5000)
        // Store timer id (best effort, don't let this fail)
        try { set({ _toastTimer: timer }) } catch (_) {}
      },
      hideToast: () => set({ toast: { show: false, message: '', type: 'info' } }),

      // v2.5.86 — form assignment actions
      /** Replace the entire assignments map (called after hydration/polling) */
      setFormAssignments: (assignments) => set({ formAssignments: assignments }),

      /** Update a single form's assignment (called after claim_form RPC succeeds) */
      updateFormAssignment: (formCode, assignment) => set((state) => ({
        formAssignments: { ...(state.formAssignments || {}), [formCode]: assignment }
      })),

      /**
       * Returns true if the current user can write this form.
       *
       * Rules:
       * - If explicitly assigned to me → writable
       * - If explicitly assigned to someone else → read-only
       * - If no explicit assignment (null):
       *     - Order owner → writable (their own forms)
       *     - Collaborator → NOT writable (must claim first)
       */
      isFormWritable: (formCode) => {
        const state = get()
        const a = state.formAssignments?.[formCode]
        const myUsername = state.session?.username
        const orderOwner = state.activeVisit?.inspector_username
        const isOwner = !!myUsername && myUsername === orderOwner

        if (a?.assignedTo) {
          // Explicit assignment — only writable if it's mine
          return a.assignedTo === myUsername
        }
        // No explicit assignment — owner can write, collaborator must claim
        return isOwner
      },

      // ============ AUTOSAVE ============
      showAutosave: false,
      triggerAutosave: (formCode) => {
        set({ showAutosave: true })
        setTimeout(() => set({ showAutosave: false }), 1500)

        // Do NOT autosave if this form is already finalized/completed
        // This prevents overwriting finalized=true with finalized=false
        const formIdMap = {
          'preventive-maintenance': 'mantenimiento',
          'inspection-general': 'inspeccion',
          'executed-maintenance': 'mantenimiento-ejecutado',
          'equipment-v2': 'equipment-v2',
          'equipment': 'equipment',
          'grounding-system-test': 'grounding-system-test',
          'safety-system': 'sistema-ascenso',
          [FORM_CODE_ADDITIONAL]: FORM_CODE_ADDITIONAL,  // triggers guard check
        }
        const formId = formIdMap[formCode]
        if (formId && (get().completedForms || []).includes(formId)) return

        // v2.5.86 — block autosave if form is assigned to someone else
        try {
          const canonCheck = get().getSupabasePayloadForForm(formCode)
          const formCodeCanon = canonCheck?.form_code
          if (formCodeCanon) {
            const a = get().formAssignments?.[formCodeCanon]
            if (a?.assignedTo && a.assignedTo !== get().session?.username) {
              console.warn('[Autosave] blocked — form assigned to', a.assignedTo)
              set({ showAutosave: false })
              return
            }
          }
        } catch (_) {}

        try {
          if (formCode) {
            const payload = get().getSupabasePayloadForForm(formCode)
            if (payload) {
              // Pass assigned_to and submissionId for cross-device collaboration
              const canonCode = payload.form_code || formCode
              const assignment = get().formAssignments?.[canonCode]
              const myUsername = get().session?.username
              // Only write assigned_to if explicitly claimed (has assignedAt timestamp)
              // Not for inferred ownership of own forms (assignedAt would be null)
              const assignedTo = (assignment?.assignedTo === myUsername && assignment?.assignedAt)
                ? myUsername : null
              // submissionId: use known DB row id to UPDATE directly (avoids duplicate rows)
              const submissionId = assignment?.submissionId || null
              queueSubmissionSync(formCode, payload, APP_VERSION_DISPLAY, assignedTo, submissionId)
              flushSupabaseQueues({ formCode })

              // Si el form se guardó como finalizado → verificar auto-cierre
              // El timeout de 3s da margen para que el sync llegue a Supabase
              if (payload.finalized) {
                setTimeout(() => get().checkAndAutoCloseVisit(), 3000)
              }
            }
          }
        } catch (e) {
          console.warn('[Supabase] autosave queue failed', e?.message || e)
        }
      },

            // ============ FORM META (Inicio automático) ============
      formMeta: {},
      setFormMeta: (formId, meta) => set((state) => ({ formMeta: { ...(state.formMeta || {}), [formId]: meta } })),
      clearFormMeta: (formId) => set((state) => {
        const fm = { ...(state.formMeta || {}) }
        delete fm[formId]
        return { formMeta: fm }
      }),


      // ============ RESET / FINALIZE ============

      /**
       * Hydrate a form's local data from a Supabase submission payload.
       * Called when continuing an existing order to load saved data.
       * @param {string} formCode - canonical form code (e.g. 'inspeccion')
       * @param {object} payload - the payload column from submissions table
       */
      hydrateFormFromSupabase: (formCode, payload, assets) => {
        // The submissions table payload column has structure:
        // { payload: { data: {...}, meta: {...} }, _meta: {...} }
        // OR directly: { data: {...}, meta: {...} }
        const inner = payload?.payload || payload
        if (!inner?.data) return
        let data = JSON.parse(JSON.stringify(inner.data)) // deep clone
        const meta = inner.meta || {}

        // Replace __photo_uploaded__ placeholders with public URLs from submission_assets
        if (assets && assets.length > 0) {
          // Build URL map: asset_type → public_url
          const urlMap = {}
          for (const a of assets) {
            if (a.asset_type && a.public_url) {
              urlMap[a.asset_type] = a.public_url
            }
          }

          // Build reverse lookups for different naming patterns:
          // inspection:itemId:photoType → itemId-photoType
          // executed:activityId:photoType → activityId-photoType
          // maintenance:itemId:photoType → itemId-photoType
          // equipment:fotoTorre → fotoTorreDataUrl, equipment:croquisEsquematico → pngDataUrl (nested)
          const keyToUrl = {}
          for (const [assetType, url] of Object.entries(urlMap)) {
            // Direct match (DynamicForm fields like fotoEscalera, fotoPataTorre)
            keyToUrl[assetType] = url

            const parts = assetType.split(':')
            if (parts.length === 3) {
              // inspection:itemId:before → itemId-before
              keyToUrl[`${parts[1]}-${parts[2]}`] = url
            }
            if (parts.length === 2 && parts[0] === 'equipment') {
              // equipment:fotoTorre → fotoTorreDataUrl
              keyToUrl[`${parts[1]}DataUrl`] = url
              keyToUrl[`${parts[1]}`] = url
              keyToUrl[`${parts[1]}:pngDataUrl`] = url
              keyToUrl[`${parts[1]}-pngDataUrl`] = url
            }
            if (parts.length === 2 && parts[0] === 'equipmentV2') {
              // equipmentV2:fotoGPS → fotoGPS (direct field name in torre/piso sections)
              keyToUrl[parts[1]] = url
              keyToUrl[`${parts[1]}DataUrl`] = url
            }
            if (parts.length === 3 && parts[0] === 'carrier') {
              // carrier:0:fotoAntena → used in equipment-v2 carrier sections
              // Store as "carrierIdx-field" for context-aware lookup
              keyToUrl[`${parts[0]}-${parts[1]}-${parts[2]}`] = url
              keyToUrl[`${parts[1]}-${parts[2]}`] = url
              keyToUrl[parts[2]] = url  // direct field fallback
            }
          }

          // Recursively walk data and replace placeholders
          const injectUrls = (obj, parentKey = null) => {
            if (!obj || typeof obj !== 'object') return obj
            if (Array.isArray(obj)) return obj.map(item => injectUrls(item, parentKey))
            const out = {}
            for (const [k, v] of Object.entries(obj)) {
              // Resolve URL: direct key first, then parent-child composite (both : and -)
              const directUrl = keyToUrl[k]
              const contextUrl = parentKey
                ? (keyToUrl[`${parentKey}:${k}`] || keyToUrl[`${parentKey}-${k}`])
                : null
              const resolvedUrl = directUrl || contextUrl
              if ((v === '__photo_uploaded__' || v === '__photo__') && resolvedUrl) {
                out[k] = resolvedUrl
              } else if (typeof v === 'string' && (v === '__photo_uploaded__' || v === '__photo__')) {
                out[k] = resolvedUrl || v
              } else if (typeof v === 'object') {
                out[k] = injectUrls(v, k)
              } else {
                out[k] = v
              }
            }
            return out
          }
          data = injectUrls(data)

          // Special restoration for additional-photo-report
          // Photos stored as arrays; meta keyed by "${acronym}:${index}" (e.g. "ACC:0")
          if (formCode === 'additional-photo-report' && data.photos && data.photoMeta) {
            for (const [catId, photoArray] of Object.entries(data.photos)) {
              if (!Array.isArray(photoArray)) continue
              data.photos[catId] = photoArray.map((photoVal, idx) => {
                if (photoVal !== '__photo_uploaded__' && photoVal !== '__photo__') return photoVal
                // photoMeta key is "ACRONYM:INDEX" e.g. "ACC:0"
                const metaKey = `${catId}:${idx}`
                const meta = data.photoMeta[metaKey]
                if (meta?.filename && keyToUrl[meta.filename]) {
                  return keyToUrl[meta.filename]
                }
                return photoVal
              })
            }
          }
        }

        const stateMap = {
          'inspeccion': 'inspectionData',
          'mantenimiento': 'maintenanceData',
          'mantenimiento-ejecutado': 'pmExecutedData',
          'inventario': 'equipmentInventoryData',
          'inventario-v2': 'equipmentInventoryV2Data',
          'puesta-tierra': 'groundingSystemData',
          'sistema-ascenso': 'safetyClimbingData',
          'additional-photo-report': 'additionalPhotoData',
        }

        const metaKeyMap = {
          'inspeccion': 'inspeccion',
          'mantenimiento': 'mantenimiento',
          'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
          'inventario': 'equipment',
          'inventario-v2': 'equipment-v2',
          'puesta-tierra': 'grounding-system-test',
          'sistema-ascenso': 'sistema-ascenso',
          'additional-photo-report': 'additional-photo-report',
        }

        const stateKey = stateMap[formCode]
        const metaKey = metaKeyMap[formCode]
        if (!stateKey) return

        // Write form data into the store
        set({ [stateKey]: data })

        // Write formMeta if available
        if (meta.startedAt && metaKey) {
          set((state) => ({
            formMeta: { ...(state.formMeta || {}), [metaKey]: meta }
          }))
        }
      },

      resetFormDraft: (formKey) => {
        const map = {
          'inspeccion': { code: 'inspection-general', reset: 'resetInspectionData', metaKey: 'inspeccion' },
          'mantenimiento': { code: 'preventive-maintenance', reset: 'resetMaintenanceData', metaKey: 'mantenimiento' },
          'inventario': { code: 'equipment', reset: 'resetEquipmentInventoryData', metaKey: 'equipment' },
          'inventario-v2': { code: 'equipment-v2', reset: 'resetEquipmentInventoryV2Data', metaKey: 'equipment-v2' },
          'mantenimiento-ejecutado': { code: 'executed-maintenance', reset: 'resetPMExecutedData', metaKey: 'mantenimiento-ejecutado' },
          'puesta-tierra': { code: 'grounding-system-test', reset: 'resetGroundingSystemData', metaKey: 'grounding-system-test' },
          'safety-system': { code: 'safety-system', reset: 'resetSafetyClimbingData', metaKey: 'sistema-ascenso' },
          'additional-photo': { code: FORM_CODE_ADDITIONAL, reset: 'resetAdditionalPhotoData', metaKey: FORM_CODE_ADDITIONAL },
        }
        const cfg = map[formKey]
        if (!cfg) return
        try { clearSupabaseLocalForForm(cfg.code) } catch (e) {}
        get().clearFormMeta(cfg.metaKey)
        const fn = get()[cfg.reset]
        if (typeof fn === 'function') fn()

        set((state) => {
          const aq = Array.isArray(state.assetUploadQueue) ? state.assetUploadQueue : []
          return { assetUploadQueue: aq.filter(a => a.formCode !== cfg.code) }
        })
      },

      finalizeForm: async (formKey) => {
        const map = {
          'inspeccion': { code: 'inspection-general', formId: 'inspeccion' },
          'mantenimiento': { code: 'preventive-maintenance', formId: 'mantenimiento' },
          'inventario': { code: 'equipment', formId: 'equipment' },
          'inventario-v2': { code: 'equipment-v2', formId: 'equipment-v2' },
          'mantenimiento-ejecutado': { code: 'executed-maintenance', formId: 'mantenimiento-ejecutado' },
          'additional-photo': { code: FORM_CODE_ADDITIONAL, formId: FORM_CODE_ADDITIONAL },
          'puesta-tierra': { code: 'grounding-system-test', formId: 'grounding-system-test' },
          'safety-system': { code: 'safety-system', formId: 'sistema-ascenso' },
        }
        const cfg = map[formKey]
        if (!cfg) throw new Error('unknown form: ' + formKey)

        console.log(`[finalizeForm] START formKey=${formKey} code=${cfg.code}`)

        // 1. Mark completed in store FIRST — blocks further triggerAutosave calls
        get().markFormCompleted(cfg.formId)
        console.log(`[finalizeForm] marked completed`)

        // 2. Build payload with finalized=true and finishedAt timestamp
        const finishedAt = new Date().toISOString()
        const payload = get().getSupabasePayloadForForm(cfg.code)
        if (payload) {
          payload.payload.finalized = true
          payload.payload.meta = { ...(payload.payload.meta || {}), finishedAt }
          console.log(`[finalizeForm] payload built, finalized=true, finishedAt=${finishedAt}`)
          // Queue the finalized payload — this MUST happen before clearSupabaseLocalForForm
          queueSubmissionSync(cfg.code, payload, APP_VERSION_DISPLAY)
          console.log(`[finalizeForm] queued submission sync`)
        } else {
          console.warn(`[finalizeForm] no payload built — form data may be empty`)
        }

        // 3. Flush to Supabase BEFORE clearing local state
        // Critical: flush FIRST, clear AFTER — previous bug had these reversed
        let flushSuccess = false
        try {
          console.log(`[finalizeForm] flushing queues...`)
          await flushSupabaseQueues({ formCode: cfg.code })
          flushSuccess = true
          console.log(`[finalizeForm] flush SUCCESS`)
        } catch (e) {
          console.warn('[finalizeForm] flush failed:', e?.message || e)
        }

        // 4. Safety net: direct UPDATE by submission ID (most reliable)
        try {
          const { supabase } = await import('../lib/supabaseClient')
          const state = get()
          const orgCode = state.session?.orgCode || 'PTI'
          const visitId = state.activeVisit?.id

          // Build the full updated payload for the direct UPDATE
          const directPayload = get().getSupabasePayloadForForm(cfg.code)
          let payloadForUpdate = null
          if (directPayload) {
            directPayload.payload.finalized = true
            directPayload.payload.meta = { ...(directPayload.payload.meta || {}), finishedAt }
            payloadForUpdate = directPayload.payload
          }

          // Find the submission by site_visit_id + form_code
          let query = supabase
            .from('submissions')
            .select('id')
            .eq('form_code', cfg.code)
            .eq('org_code', orgCode)

          if (visitId && !String(visitId).startsWith('local-')) {
            query = query.eq('site_visit_id', visitId)
          }

          const { data: rows, error: selErr } = await query
            .order('updated_at', { ascending: false })
            .limit(1)

          if (selErr) {
            console.warn('[finalizeForm] submission lookup failed:', selErr.message)
          } else if (rows && rows.length > 0) {
            const submissionId = rows[0].id
            console.log(`[finalizeForm] found submission ${submissionId}, updating finalized=true`)

            const updateObj = { finalized: true }
            if (payloadForUpdate) {
              updateObj.payload = {
                ...payloadForUpdate,
                _meta: { ...(payloadForUpdate._meta || {}), last_saved_at: finishedAt }
              }
            }

            const { error: updErr } = await supabase
              .from('submissions')
              .update(updateObj)
              .eq('id', submissionId)

            if (updErr) {
              console.warn('[finalizeForm] direct update failed:', updErr.message)
            } else {
              console.log(`[finalizeForm] direct update SUCCESS — finalized=true confirmed in DB`)
              flushSuccess = true
            }
          } else {
            console.warn('[finalizeForm] no submission row found for direct update')
          }
        } catch (e) {
          console.warn('[finalizeForm] safety net failed:', e?.message || e)
        }

        // 5. Clear local state AFTER flush (previous bug had this before flush)
        try { clearSupabaseLocalForForm(cfg.code) } catch (e) {}
        get().resetFormDraft(formKey)
        console.log(`[finalizeForm] DONE synced=${flushSuccess}`)

        return { synced: flushSuccess }
      },

  // Build the full Supabase payload for a given autosave bucket (one submission per form)
  // Note: we intentionally send **all** captured data for the form (not a minimal subset).
  getSupabasePayloadForForm: (formCode) => {
    const state = get()

    const toFormCode = (code) => {
      if (!code) return 'unknown'
      if (code.startsWith('inspection')) return 'inspeccion'
      if (code === 'preventive-maintenance') return 'mantenimiento'
      if (code === 'executed-maintenance' || code === 'pm-executed') return 'mantenimiento-ejecutado'
      if (code === 'equipment-inventory' || code === 'equipment') return 'inventario'
      if (code === 'equipment-v2') return 'inventario-v2'
      if (code === 'grounding-system-test') return 'puesta-tierra'
      if (code === 'safety-system') return 'sistema-ascenso'
      if (code === FORM_CODE_ADDITIONAL || code === 'additional-photo') return FORM_CODE_ADDITIONAL
      return code
    }

    const canonicalFormCode = toFormCode(formCode)

    // FormMeta keys match the formId from FormIntro
    const metaKeyMap = {
      'inspeccion': 'inspeccion',
      'mantenimiento': 'mantenimiento',
      'mantenimiento-ejecutado': 'mantenimiento-ejecutado',
      'inventario': 'equipment',
      'inventario-v2': 'equipment-v2',
      'puesta-tierra': 'grounding-system-test',
      'sistema-ascenso': 'sistema-ascenso',
      [FORM_CODE_ADDITIONAL]: FORM_CODE_ADDITIONAL,
    }
    const metaKey = metaKeyMap[canonicalFormCode] || canonicalFormCode
    const meta = (state.formMeta && state.formMeta[metaKey]) ? state.formMeta[metaKey] : null

    // Pick the full form snapshot from the store
    const rawSnapshot =
      canonicalFormCode === 'inspeccion' ? state.inspectionData
      : canonicalFormCode === 'mantenimiento' ? state.maintenanceData
      : canonicalFormCode === 'mantenimiento-ejecutado' ? state.pmExecutedData
      : canonicalFormCode === 'inventario' ? state.equipmentInventoryData
      : canonicalFormCode === 'inventario-v2' ? state.equipmentInventoryV2Data
      : canonicalFormCode === 'puesta-tierra' ? state.groundingSystemData
      : canonicalFormCode === 'sistema-ascenso' ? state.safetyClimbingData
      : canonicalFormCode === FORM_CODE_ADDITIONAL ? state.additionalPhotoData
      : null

    // CRITICAL: Strip all data URLs from payload to avoid Supabase JSONB overflow
    // Photos are already uploaded separately via queueAssetUpload → submission_assets
    const snapshot = stripPayloadPhotos(rawSnapshot)

    // Collect any queued assets that belong to this form
    const queuedAssets = Array.isArray(state.assetUploadQueue)
      ? state.assetUploadQueue.filter(a => a && a.formCode === formCode)
      : []

    return {
      org_code: state.session?.orgCode || 'PTI',
      device_id: getDeviceId(),
      form_code: canonicalFormCode,
      app_version: APP_VERSION_DISPLAY,
      form_version: '1',
      site_visit_id: (state.activeVisit?.id && !String(state.activeVisit.id).startsWith('local-'))
        ? state.activeVisit.id
        : null,
      submitted_by_user_id: state.session?.userId || null,
      payload: {
        meta: meta ? {
          ...meta,
        } : {
          startedAt: null,
        },
        autosave_bucket: formCode,
        finalized: false,
        data: snapshot,
        submitted_by: state.session ? {
          userId: state.session.userId,
          username: state.session.username,
          name: state.session.name,
          role: state.session.role,
          orgCode: state.session.orgCode,
        } : null,
        submitted_at: new Date().toISOString(),
      },
      assets: queuedAssets.map(a => ({
        key: a.storageKey,
        type: a.assetType || 'photo',
        bucket: a.bucket || 'pti-inspect',
        meta: {
          field: a.field || null,
          capturedAt: a.capturedAt || null
        }
      }))
    }
  },


// ============ INSPECTION DATA (Original) ============
      inspectionData: {
        siteInfo: { proveedor: 'OFG PANAMA, S.A.', idSitio: '', nombreSitio: '', tipoSitio: '', coordenadas: '', direccion: '', fecha: '', hora: '', tipoTorre: '', alturaTorre: '' },
        items: {},
        photos: {},
      },
      
      updateSiteInfo: (field, value) => set((state) => ({
        inspectionData: { ...state.inspectionData, siteInfo: { ...state.inspectionData.siteInfo, [field]: value } }
      })),

      updateItemStatus: (itemId, status) => {
        set((state) => ({
          inspectionData: { ...state.inspectionData, items: { ...state.inspectionData.items, [itemId]: { ...state.inspectionData.items[itemId], status } } }
        }))
        get().triggerAutosave('inspection-general')
      },

      updateItemObservation: (itemId, observation) => set((state) => ({
        inspectionData: { ...state.inspectionData, items: { ...state.inspectionData.items, [itemId]: { ...state.inspectionData.items[itemId], observation } } }
      })),

      updateItemPhoto: (itemId, photoType, photoData) => {
        // Evita encolar uploads con datos inválidos (algunos navegadores pueden entregar null/ArrayBuffer)
        if (photoData != null && !isDataUrlString(photoData)) {
          console.warn('[Photo] Captura inválida (no es Data URL).', {
            itemId,
            photoType,
            receivedType: typeof photoData,
          })
          return
        }

        set((state) => ({
          inspectionData: {
            ...state.inspectionData,
            photos: {
              ...state.inspectionData.photos,
              [`${itemId}-${photoType}`]: photoData,
            },
          },
        }))

        // Upload photo in background (best effort)
        if (photoData) {
          try {
            queueAssetUpload('inspection-general', `inspection:${itemId}:${photoType}`, photoData)
            flushSupabaseQueues({ formCode: 'inspection-general' })
          } catch (e) {
            // best-effort
          }
        }

        get().triggerAutosave('inspection-general')
      },

      

      resetInspectionData: () => set({
        inspectionData: {
          siteInfo: { proveedor: 'OFG PANAMA, S.A.', idSitio: '', nombreSitio: '', tipoSitio: '', coordenadas: '', direccion: '', fecha: '', hora: '', tipoTorre: '', alturaTorre: '' },
          items: {},
          photos: {},
        }
      }),

// ============ MAINTENANCE DATA v1.1.4 ============
      maintenanceData: getDefaultMaintenanceData(),

            // ============ EQUIPMENT INVENTORY (Formulario 3) ============
      equipmentInventoryData: getDefaultEquipmentInventoryData(),

      // ============ PM EXECUTED (Formulario 6) ============
      pmExecutedData: getDefaultPMExecutedData(),

      resetPMExecutedData: () => set({ pmExecutedData: getDefaultPMExecutedData() }),

      updatePMExecutedField: (field, value) => {
        set((state) => ({
          pmExecutedData: {
            ...(state.pmExecutedData || getDefaultPMExecutedData()),
            siteInfo: {
              ...((state.pmExecutedData || getDefaultPMExecutedData()).siteInfo || {}),
              [field]: value,
            },
          },
        }))
        get().triggerAutosave('executed-maintenance')
      },

      updatePMExecutedPhoto: (activityId, photoType, photoData) => {
        // Normalize empty string to null (some callers use '' to delete)
        const normalizedData = (photoData === '' || photoData == null) ? null : photoData

        // Guard against invalid photo data
        if (normalizedData != null && !isDataUrlString(normalizedData)) {
          console.warn('[Photo] Captura inválida en PM ejecutado (no es Data URL).', {
            activityId,
            photoType,
            receivedType: typeof normalizedData,
          })
          return
        }

        set((state) => {
          const currentData = state.pmExecutedData || getDefaultPMExecutedData()
          return {
            pmExecutedData: {
              ...currentData,
              photos: {
                ...(currentData.photos || {}),
                [`${activityId}-${photoType}`]: normalizedData
              }
            }
          }
        })

        // Upload photo in background (best effort)
        if (normalizedData) {
          try {
            queueAssetUpload('executed-maintenance', `executed:${activityId}:${photoType}`, normalizedData)
            flushSupabaseQueues({ formCode: 'executed-maintenance' })
          } catch (e) {}
        }

        get().triggerAutosave('executed-maintenance')
      },

      // ============ GROUNDING SYSTEM TEST (Nuevo formulario) ============
      groundingSystemData: {},



      // ============ SAFETY CLIMBING DEVICE (Nuevo formulario) ============
      safetyClimbingData: {},

      // ============ ADDITIONAL PHOTO REPORT ============
      additionalPhotoData: { photos: {}, photoMeta: {}, notes: '' },
      additionalPhotoStep: 1,

      // ============ EQUIPMENT INVENTORY V2 ============
      equipmentInventoryV2Data: {
        siteInfo: { proveedor: 'OFG PANAMA, S.A.' },
        torre: { items: [{ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', areaM2: '', carrier: '' }] },
        piso: { clientes: [{ tipoCliente: 'ancla', nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }] },
        fotos: {},
      },

      updateEquipmentV2SiteField: (field, value) => {
        set((state) => ({
          equipmentInventoryV2Data: {
            ...(state.equipmentInventoryV2Data || {}),
            siteInfo: { ...((state.equipmentInventoryV2Data || {}).siteInfo || {}), [field]: value },
          },
        }))
        get().triggerAutosave('equipment-v2')
      },

      updateEquipmentV2Field: (section, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          return {
            equipmentInventoryV2Data: {
              ...current,
              [section]: { ...(current[section] || {}), [field]: value },
            },
          }
        })
        if (value && typeof value === 'string' && value.startsWith('data:image')) {
          try {
            queueAssetUpload('equipment-v2', `equipmentV2:${field}`, value)
            flushSupabaseQueues({ formCode: 'equipment-v2' })
          } catch (_) {}
        }
        get().triggerAutosave('equipment-v2')
      },

      addTowerItemV2: () => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const items = current.torre?.items || []
          return {
            equipmentInventoryV2Data: {
              ...current,
              torre: { ...(current.torre || {}), items: [...items, { alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', areaM2: '', carrier: '' }] },
            },
          }
        })
        get().triggerAutosave('equipment-v2')
      },

      removeTowerItemV2: (index) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const items = (current.torre?.items || []).slice()
          items.splice(index, 1)
          const fallback = [{ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', areaM2: '', carrier: '' }]
          return { equipmentInventoryV2Data: { ...current, torre: { ...(current.torre || {}), items: items.length ? items : fallback } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      updateTowerItemFieldV2: (index, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const items = (current.torre?.items || []).map((it, i) => (i === index ? { ...it, [field]: value } : it))
          return { equipmentInventoryV2Data: { ...current, torre: { ...(current.torre || {}), items } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      // V2 Piso reuses same structure — actions reference V2 data
      addFloorClientV2: (tipoCliente = 'colo') => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = current.piso?.clientes || []
          return {
            equipmentInventoryV2Data: {
              ...current,
              piso: { ...(current.piso || {}), clientes: [...clientes, { tipoCliente, nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }] },
            },
          }
        })
        get().triggerAutosave('equipment-v2')
      },

      removeFloorClientV2: (index) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = (current.piso?.clientes || []).slice()
          clientes.splice(index, 1)
          const fallback = [{ tipoCliente: 'ancla', nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }]
          return { equipmentInventoryV2Data: { ...current, piso: { ...(current.piso || {}), clientes: clientes.length ? clientes : fallback } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      updateFloorClientFieldV2: (index, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = (current.piso?.clientes || []).map((c, i) => (i === index ? { ...c, [field]: value } : c))
          return { equipmentInventoryV2Data: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      addCabinetV2: (clientIndex) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            return { ...c, gabinetes: [...(c.gabinetes || []), { gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }
          })
          return { equipmentInventoryV2Data: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      removeCabinetV2: (clientIndex, cabIndex) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            const gabs = (c.gabinetes || []).filter((_, gi) => gi !== cabIndex)
            return { ...c, gabinetes: gabs.length ? gabs : [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }
          })
          return { equipmentInventoryV2Data: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      updateCabinetFieldV2: (clientIndex, cabIndex, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            const gabinetes = (c.gabinetes || []).map((g, gi) => (gi === cabIndex ? { ...g, [field]: value } : g))
            return { ...c, gabinetes }
          })
          return { equipmentInventoryV2Data: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment-v2')
      },

      updateEquipmentV2Carriers: (carriers) => {
        set((state) => {
          const current = state.equipmentInventoryV2Data || {}

          // ── Sync Carriers → Torre (all fields except orientacion) ──
          // Flatten all carrier items into torre.items, preserving each row's
          // existing orientacion so Torre can keep its independent values.
          const existingTorreItems = current.torre?.items || []
          const syncedTorreItems = carriers.flatMap((carrier, cIdx) =>
            (carrier.items || []).map((item, rIdx) => {
              // Find the matching existing torre row by flat index to preserve orientacion
              const flatIdx = carriers.slice(0, cIdx).reduce((acc, c) => acc + (c.items?.length || 0), 0) + rIdx
              const existingOrientacion = existingTorreItems[flatIdx]?.orientacion || ''
              return {
                alturaMts:    item.alturaMts    || '',
                orientacion:  existingOrientacion,           // preserved independently
                tipoEquipo:   item.tipoEquipo   || '',
                cantidad:     item.cantidad     || '',
                alto:         item.alto         || '',
                ancho:        item.ancho        || '',
                profundidad:  item.profundidad  || '',
                areaM2:       item.areaM2       || '',
                carrier:      carrier.nombre    || '',       // auto-populated from carrier name
                comentario:   item.comentario   || '',
              }
            })
          )

          // If no items at all, keep a blank row so Torre is never empty
          const torreItems = syncedTorreItems.length > 0
            ? syncedTorreItems
            : [{ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', areaM2: '', carrier: '' }]

          return {
            equipmentInventoryV2Data: {
              ...current,
              carriers,
              torre: { ...(current.torre || {}), items: torreItems },
            },
          }
        })
        // Photo uploads are handled directly by CarrierSection via queueCarrierPhoto
        // NOT here — scanning all carriers on every field change caused duplicate uploads
        get().triggerAutosave('equipment-v2')
      },

      // Called by CarrierSection ONLY when a new photo is captured (once per capture)
      queueCarrierPhoto: (carrierIdx, fotoKey, dataUrl) => {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return
        try {
          queueAssetUpload('equipment-v2', `carrier:${carrierIdx}:${fotoKey}`, dataUrl)
          flushSupabaseQueues({ formCode: 'equipment-v2' })
        } catch (_) {}
      },

      updateEquipmentSiteField: (field, value) => {
        set((state) => ({
          equipmentInventoryData: {
            ...(state.equipmentInventoryData || getDefaultEquipmentInventoryData()),
            siteInfo: {
              ...((state.equipmentInventoryData || getDefaultEquipmentInventoryData()).siteInfo || {}),
              [field]: value,
            },
          },
        }))
        get().triggerAutosave('executed-maintenance')
      },

      // --- TORRE: tabla repetible ---
      addTowerItem: () => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const items = current.torre?.items || []
          return {
            equipmentInventoryData: {
              ...current,
              torre: {
                ...(current.torre || {}),
                items: [...items, { alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', dimensionesMts: '', areaM2: '', carrier: '' }],
              },
            },
          }
        })
        get().triggerAutosave('executed-maintenance')
      },

      removeTowerItem: (index) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const items = (current.torre?.items || []).slice()
          items.splice(index, 1)
          return { equipmentInventoryData: { ...current, torre: { ...(current.torre || {}), items: items.length ? items : [{ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', dimensionesMts: '', areaM2: '', carrier: '' }] } } }
        })
        get().triggerAutosave('equipment')
      },

      updateTowerItemField: (index, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const items = (current.torre?.items || []).map((it, i) => (i === index ? { ...it, [field]: value } : it))
          return { equipmentInventoryData: { ...current, torre: { ...(current.torre || {}), items } } }
        })
        get().triggerAutosave('equipment')
      },

      // --- PISO: clientes + gabinetes ---
      addFloorClient: (tipoCliente = 'colo') => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = current.piso?.clientes || []
          return {
            equipmentInventoryData: {
              ...current,
              piso: {
                ...(current.piso || {}),
                clientes: [
                  ...clientes,
                  { tipoCliente, nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] },
                ],
              },
            },
          }
        })
        get().triggerAutosave('equipment')
      },

      removeFloorClient: (index) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = (current.piso?.clientes || []).slice()
          clientes.splice(index, 1)
          return { equipmentInventoryData: { ...current, piso: { ...(current.piso || {}), clientes: clientes.length ? clientes : [{ tipoCliente: 'ancla', nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }] } } }
        })
        get().triggerAutosave('equipment')
      },

      updateFloorClientField: (index, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = (current.piso?.clientes || []).map((c, i) => (i === index ? { ...c, [field]: value } : c))
          return { equipmentInventoryData: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment')
      },

      addCabinet: (clientIndex) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            const gabinetes = c.gabinetes || []
            return { ...c, gabinetes: [...gabinetes, { gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }
          })
          return { equipmentInventoryData: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment')
      },

      removeCabinet: (clientIndex, cabinetIndex) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            const gabinetes = (c.gabinetes || []).slice()
            gabinetes.splice(cabinetIndex, 1)
            return { ...c, gabinetes: gabinetes.length ? gabinetes : [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }
          })
          return { equipmentInventoryData: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment')
      },

      updateCabinetField: (clientIndex, cabinetIndex, field, value) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const clientes = (current.piso?.clientes || []).map((c, i) => {
            if (i !== clientIndex) return c
            const gabinetes = (c.gabinetes || []).map((g, j) => (j === cabinetIndex ? { ...g, [field]: value } : g))
            return { ...c, gabinetes }
          })
          return { equipmentInventoryData: { ...current, piso: { ...(current.piso || {}), clientes } } }
        })
        get().triggerAutosave('equipment')
      },

      // --- DISTRIBUCIÓN / CROQUIS / PLANO ---
      setDistribucionTorre: (scene, pngDataUrl) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          return { equipmentInventoryData: { ...current, distribucionTorre: { ...(current.distribucionTorre || {}), scene, pngDataUrl } } }
        })
        get().triggerAutosave('equipment')
      },

      setDistribucionFotoTorre: (fotoTorreDataUrl) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          return { equipmentInventoryData: { ...current, distribucionTorre: { ...(current.distribucionTorre || {}), fotoTorreDataUrl } } }
        })

        // Upload photo in background (best effort)
        try {
          queueAssetUpload('equipment', 'equipment:fotoTorre', fotoTorreDataUrl)
          flushSupabaseQueues({ formCode: 'equipment' })
        } catch (e) {}

        get().triggerAutosave('equipment')
      },

      setCroquisEsquematico: (pngDataUrl) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          return {
            equipmentInventoryData: { ...current, croquisEsquematico: { ...(current.croquisEsquematico || {}), pngDataUrl } }
          }
        })

        // Upload photo in background (best effort)
        try {
          queueAssetUpload('equipment', 'equipment:croquisEsquematico', pngDataUrl)
          flushSupabaseQueues({ formCode: 'equipment' })
        } catch (e) {}

        get().triggerAutosave('equipment')
      },

      setCroquisNiveles: (field, value) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          const niveles = current.croquisEsquematico?.niveles || { nivel1: '', nivel2: '', nivel3: '', banqueta: '' }
          return { equipmentInventoryData: { ...current, croquisEsquematico: { ...(current.croquisEsquematico || {}), niveles: { ...niveles, [field]: value } } } }
        })
        get().triggerAutosave('equipment')
      },

      setPlanoPlanta: (pngDataUrl) => {
        set((state) => {
          const current = state.equipmentInventoryData || getDefaultEquipmentInventoryData()
          return {
            equipmentInventoryData: { ...current, planoPlanta: { ...(current.planoPlanta || {}), pngDataUrl } }
          }
        })

        // Upload photo in background (best effort)
        try {
          queueAssetUpload('equipment', 'equipment:planoPlanta', pngDataUrl)
          flushSupabaseQueues({ formCode: 'equipment' })
        } catch (e) {}

        get().triggerAutosave('equipment')
      },

      resetEquipmentInventoryData: () => set({ equipmentInventoryData: getDefaultEquipmentInventoryData() }),

      resetEquipmentInventoryV2Data: () => set({
        equipmentInventoryV2Data: {
          siteInfo: { proveedor: 'OFG PANAMA, S.A.' },
          torre: { items: [{ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', areaM2: '', carrier: '' }] },
          piso: { clientes: [{ tipoCliente: 'ancla', nombreCliente: '', areaArrendada: '', areaEnUso: '', placaEquipos: '', gabinetes: [{ gabinete: '', largo: '', ancho: '', alto: '', fotoRef: '' }] }] },
          fotos: {},
        },
      }),

      // Prueba de puesta a tierra
      setGroundingField: (sectionId, fieldId, value) => {
        set((state) => ({
          groundingSystemData: {
            ...(state.groundingSystemData || {}),
            [sectionId]: {
              ...((state.groundingSystemData && state.groundingSystemData[sectionId]) || {}),
              [fieldId]: value,
            },
          },
        }))
        get().triggerAutosave('grounding-system-test')
      },
      resetGroundingSystemData: () => {
        set({ groundingSystemData: {}, groundingStep: 1 })
      },


      // Sistema de ascenso
setSafetyField: (sectionId, fieldId, value) => {
  set(state => ({
    safetyClimbingData: {
      ...state.safetyClimbingData,
      [sectionId]: {
        ...(state.safetyClimbingData?.[sectionId] || {}),
        [fieldId]: value,
      },
    },
  }))
  get().triggerAutosave('safety-system')
},
resetSafetyClimbingData: () => set({ safetyClimbingData: {}, safetyClimbingStep: 1 }),

      // ============ ADDITIONAL PHOTO REPORT — actions ============

      setAdditionalPhotoField: (field, value) => {
        set((state) => ({
          additionalPhotoData: { ...(state.additionalPhotoData || {}), [field]: value },
        }))
        get().triggerAutosave(FORM_CODE_ADDITIONAL)
      },

      setAdditionalPhoto: (acronym, index, dataUrl, meta) => {
        set((state) => {
          const prev = state.additionalPhotoData || {}
          const prevPhotos = prev.photos || {}
          const prevMeta = prev.photoMeta || {}
          const arr = [...(prevPhotos[acronym] || [])]
          arr[index] = dataUrl
          const metaKey = `${acronym}:${index}`
          return {
            additionalPhotoData: {
              ...prev,
              photos: { ...prevPhotos, [acronym]: arr },
              photoMeta: meta ? { ...prevMeta, [metaKey]: meta } : prevMeta,
            }
          }
        })
        get().triggerAutosave(FORM_CODE_ADDITIONAL)
      },

      addAdditionalPhotoSlot: (acronym) => {
        set((state) => {
          const prev = state.additionalPhotoData || {}
          const prevPhotos = prev.photos || {}
          const arr = [...(prevPhotos[acronym] || []), null]
          return { additionalPhotoData: { ...prev, photos: { ...prevPhotos, [acronym]: arr } } }
        })
      },

      removeAdditionalPhotoSlot: (acronym, index) => {
        set((state) => {
          const prev = state.additionalPhotoData || {}
          const prevPhotos = prev.photos || {}
          const arr = [...(prevPhotos[acronym] || [])]
          arr.splice(index, 1)
          return { additionalPhotoData: { ...prev, photos: { ...prevPhotos, [acronym]: arr } } }
        })
        get().triggerAutosave(FORM_CODE_ADDITIONAL)
      },

      resetAdditionalPhotoData: () => set({ additionalPhotoData: { photos: {}, photoMeta: {}, notes: '' }, additionalPhotoStep: 1 }),



      // Actualizar campo de formulario
      updateMaintenanceField: (field, value) => {
        set((state) => {
          const currentData = state.maintenanceData || getDefaultMaintenanceData()
          return {
            maintenanceData: {
              ...currentData,
              formData: { ...(currentData.formData || {}), [field]: value }
            }
          }
        })
        get().triggerAutosave('preventive-maintenance')
      },

      // Actualizar item de checklist
      updateChecklistItem: (itemId, field, value) => {
        set((state) => {
          const currentData = state.maintenanceData || getDefaultMaintenanceData()
          const currentChecklist = currentData.checklistData || {}
          return {
            maintenanceData: {
              ...currentData,
              checklistData: {
                ...currentChecklist,
                [itemId]: { ...(currentChecklist[itemId] || {}), [field]: value }
              }
            }
          }
        })
        get().triggerAutosave('preventive-maintenance')
      },

      // Actualizar foto de checklist
      updateChecklistPhoto: (itemId, photoType, photoData) => {
        // Normalize empty string to null (some callers use '' to delete)
        const normalizedData = (photoData === '' || photoData == null) ? null : photoData

        // Guard against invalid photo data
        if (normalizedData != null && !isDataUrlString(normalizedData)) {
          console.warn('[Photo] Captura inválida en checklist (no es Data URL).', {
            itemId,
            photoType,
            receivedType: typeof normalizedData,
          })
          return
        }

        set((state) => {
          const currentData = state.maintenanceData || getDefaultMaintenanceData()
          return {
            maintenanceData: {
              ...currentData,
              photos: {
                ...(currentData.photos || {}),
                [`${itemId}-${photoType}`]: normalizedData
              }
            }
          }
        })

        // Upload photo in background (best effort)
        if (normalizedData) {
          try {
            queueAssetUpload('preventive-maintenance', `maintenance:${itemId}:${photoType}`, normalizedData)
            flushSupabaseQueues({ formCode: 'preventive-maintenance' })
          } catch (e) {}
        }

        get().triggerAutosave('preventive-maintenance')
      },

      // Navegar a step
      setMaintenanceStep: (step) => {
        set((state) => {
          const currentData = state.maintenanceData || getDefaultMaintenanceData()
          return {
            // Guard: asegurar número para evitar concatenación ("1" + 1 => "11")
            maintenanceData: { ...currentData, currentStep: Number(step) || 1 }
          }
        })
      },

      // Marcar step como completado
      completeMaintenanceStep: (stepId) => {
        set((state) => {
          const currentData = state.maintenanceData || getDefaultMaintenanceData()
          const completed = currentData.completedSteps || []
          if (completed.includes(stepId)) {
            // Already completed – no-op
            return {}
          }
          return {
            maintenanceData: {
              ...currentData,
              completedSteps: [...completed, stepId]
            }
          }
        })
      },

      // Reset maintenance data
      resetMaintenanceData: () => {
        set({ maintenanceData: getDefaultMaintenanceData() })
      },

      // ============ LEGACY: Para compatibilidad ============
      updateMaintenanceSiteInfo: (field, value) => {
        get().updateMaintenanceField(field, value)
      },

      updateActivityStatus: (actId, status) => {
        get().updateChecklistItem(actId, 'status', status)
      },

      updateActivityPhoto: (actId, photoType, photoData) => {
        get().updateChecklistPhoto(actId, photoType, photoData)
      },
    }),
    { 
      name: 'pti-inspect-storage',
      version: 7, // v2.1: add formDataOwnerId, Supabase as source of truth
      // Safe localStorage wrapper: silently ignores QuotaExceededError so set() never throws
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try { return localStorage.getItem(name) } catch (_) { return null }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value)
          } catch (e) {
            console.warn('[Persist] localStorage.setItem failed (quota?)', e?.name)
          }
        },
        removeItem: (name) => {
          try { localStorage.removeItem(name) } catch (_) {}
        },
      })),
      // Exclude large binary data (photos as data URLs) from localStorage.
      // Photos are uploaded to Supabase Storage via queueAssetUpload and don't
      // need to survive a page reload from localStorage.
      partialize: (state) => {
        // forceUpdate must never persist — always re-evaluated from Supabase on mount
        // Strip data URL photos from inspectionData
        const inspectionData = state.inspectionData ? {
          ...state.inspectionData,
          photos: stripDataUrls(state.inspectionData.photos),
        } : state.inspectionData

        // Strip data URL photos from maintenanceData
        const maintenanceData = state.maintenanceData ? {
          ...state.maintenanceData,
          photos: stripDataUrls(state.maintenanceData.photos),
          formData: state.maintenanceData.formData ? stripDataUrlFields(state.maintenanceData.formData) : state.maintenanceData.formData,
        } : state.maintenanceData

        // Strip data URL photos from pmExecutedData
        const pmExecutedData = state.pmExecutedData ? {
          ...state.pmExecutedData,
          photos: stripDataUrls(state.pmExecutedData.photos),
        } : state.pmExecutedData

        // Strip large binary data from equipmentInventoryData
        const equipmentInventoryData = state.equipmentInventoryData ? {
          ...state.equipmentInventoryData,
          distribucionTorre: state.equipmentInventoryData.distribucionTorre ? {
            ...state.equipmentInventoryData.distribucionTorre,
            pngDataUrl: stripSingle(state.equipmentInventoryData.distribucionTorre.pngDataUrl),
            fotoTorreDataUrl: stripSingle(state.equipmentInventoryData.distribucionTorre.fotoTorreDataUrl),
          } : state.equipmentInventoryData.distribucionTorre,
          croquisEsquematico: state.equipmentInventoryData.croquisEsquematico ? {
            ...state.equipmentInventoryData.croquisEsquematico,
            pngDataUrl: stripSingle(state.equipmentInventoryData.croquisEsquematico.pngDataUrl),
          } : state.equipmentInventoryData.croquisEsquematico,
          planoPlanta: state.equipmentInventoryData.planoPlanta ? {
            ...state.equipmentInventoryData.planoPlanta,
            pngDataUrl: stripSingle(state.equipmentInventoryData.planoPlanta.pngDataUrl),
          } : state.equipmentInventoryData.planoPlanta,
        } : state.equipmentInventoryData

        // Strip data URL photos from equipmentInventoryV2Data
        const equipmentInventoryV2Data = state.equipmentInventoryV2Data ? {
          ...state.equipmentInventoryV2Data,
          torre: state.equipmentInventoryV2Data.torre ? {
            ...state.equipmentInventoryV2Data.torre,
            items: (state.equipmentInventoryV2Data.torre.items || []).map(item => ({
              ...item,
              foto1: stripSingle(item.foto1),
              foto2: stripSingle(item.foto2),
              foto3: stripSingle(item.foto3),
            })),
            fotos: stripDataUrls(state.equipmentInventoryV2Data.torre.fotos || {}),
          } : state.equipmentInventoryV2Data.torre,
          piso: state.equipmentInventoryV2Data.piso ? {
            ...state.equipmentInventoryV2Data.piso,
            fotos: stripDataUrls(state.equipmentInventoryV2Data.piso.fotos || {}),
          } : state.equipmentInventoryV2Data.piso,
          carriers: (state.equipmentInventoryV2Data.carriers || []).map(carrier => ({
            ...carrier,
            items: (carrier.items || []).map(item => ({
              ...item,
              foto1: stripSingle(item.foto1),
              foto2: stripSingle(item.foto2),
              foto3: stripSingle(item.foto3),
            })),
          })),
        } : state.equipmentInventoryV2Data

        // Strip data URL photos from safetyClimbingData (nested sections)
        const safetyClimbingData = state.safetyClimbingData
          ? Object.fromEntries(
              Object.entries(state.safetyClimbingData).map(([section, fields]) => [
                section,
                fields && typeof fields === 'object'
                  ? Object.fromEntries(
                      Object.entries(fields).map(([k, v]) => [k, stripSingle(v)])
                    )
                  : fields,
              ])
            )
          : state.safetyClimbingData

        // Strip data URL photos from groundingSystemData (nested sections)
        const groundingSystemData = state.groundingSystemData
          ? Object.fromEntries(
              Object.entries(state.groundingSystemData).map(([section, fields]) => [
                section,
                fields && typeof fields === 'object'
                  ? Object.fromEntries(
                      Object.entries(fields).map(([k, v]) => [k, stripSingle(v)])
                    )
                  : fields,
              ])
            )
          : state.groundingSystemData

        return {
          ...state,
          forceUpdate: false,
      displacedByDevice: false, // never persist — always reset on load
          inspectionData,
          maintenanceData,
          pmExecutedData,
          equipmentInventoryData,
          equipmentInventoryV2Data,
          safetyClimbingData,
          groundingSystemData,
          // Never persist transient UI state
          toast: undefined,
          _toastTimer: undefined,
          showAutosave: undefined,
          // Never persist appVersion — always comes from APP_VERSION_DISPLAY constant
          appVersion: undefined,
          // Never persist formAssignments — always comes from server on mount
          formAssignments: undefined,
          // Never persist transient connectivity state
          isOnline: undefined,
          syncStatus: undefined,
          pendingSyncCount: undefined,
        }
      },
      migrate: (persistedState, version) => {
        // Migraciones simples para mantener compatibilidad
        let state = { ...persistedState }
        if (version < 2) {
          state = { ...state, maintenanceData: getDefaultMaintenanceData() }
        }
        if (version < 3) {
          state = { ...state, equipmentInventoryData: getDefaultEquipmentInventoryData() }
        } else {
          // Asegurar que exista aunque venga de localStorage incompleto
          state = { ...state, equipmentInventoryData: state.equipmentInventoryData || getDefaultEquipmentInventoryData() }
        }

        // v4: asegurar nuevos estados
        state = { ...state, formMeta: state.formMeta || {} }
        state = { ...state, pmExecutedData: state.pmExecutedData || getDefaultPMExecutedData() }
        state = { ...state, groundingSystemData: state.groundingSystemData || {} }
        state = { ...state, groundingStep: state.groundingStep || 1 }
        state = { ...state, safetyClimbingData: state.safetyClimbingData || {} }
        state = { ...state, safetyClimbingStep: state.safetyClimbingStep || 1 }

        // Normalizar maintenanceData.currentStep a número (algunas versiones antiguas lo guardaban como string)
        const md = state.maintenanceData || getDefaultMaintenanceData()
        const stepNum = Number(md.currentStep)
        state = { ...state, maintenanceData: { ...md, currentStep: Number.isFinite(stepNum) && stepNum > 0 ? stepNum : 1 } }

        // v6: add activeVisit and completedForms
        state = { ...state, activeVisit: state.activeVisit || null }
        state = { ...state, completedForms: state.completedForms || [] }

        // v7: add formDataOwnerId — set from activeVisit if available
        state = { ...state, formDataOwnerId: state.formDataOwnerId || state.activeVisit?.id || null }

        return state
      }
    }
  )
)