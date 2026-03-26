/**
 * AdditionalPhotoReport.jsx  v2.5.88
 * Reporte Adicional de Fotografías
 * Nomenclatura: {SITE_ID}_{ACRONIMO}_{DDMMAA}_(N)
 * Ejemplo: MJA0007_ACC_100817_(1)
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Image, Check, Plus, X, Loader2, AlertCircle,
  UploadCloud, Info, RefreshCw, Clock,
} from 'lucide-react'
import AppHeader from '../components/layout/AppHeader'
import FormMetaBar from '../components/layout/FormMetaBar'
import BottomNav from '../components/layout/BottomNav'
import AutosaveIndicator from '../components/ui/AutosaveIndicator'
import FormLockedScreen from '../components/ui/FormLockedScreen'
import StepPills from '../components/layout/StepPills'
import { useAppStore, isDisplayablePhoto, recoverPhotoFromQueue } from '../hooks/useAppStore'
import { processImageFile } from '../lib/photoUtils'
import { PHOTO_CATEGORIES } from '../data/additionalPhotoConfig'
import { queueAssetUpload, flushSupabaseQueues } from '../lib/supabaseSync'
import ConfirmFinalizeModal from '../components/ui/ConfirmFinalizeModal'

const FORM_CODE = 'additional-photo-report'
const FORM_ID   = 'additional-photo-report'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build PTI-standard filename: SITEID_ACRONYM_DDMMYY_(N) */
/** Build PTI-standard filename using visit startedAt for the date component.
 *  Format: {SITEID}_{ACRONIMO}_{DDMMAA}_(N)
 *  Example: MJA0007_ACC_100817_(1)
 */
function buildFilename(siteId, acronym, index, startedAt) {
  const safe = (siteId || 'SITE').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const d    = startedAt ? new Date(startedAt) : new Date()
  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yy   = String(d.getFullYear()).slice(-2)
  return `${safe}_${acronym}_${dd}${mm}${yy}_(${index + 1})`
}

/** Format timestamp for display: "15 ene 2024 · 10:32" */
function formatTs(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const date = d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

// ─── Single photo slot ───────────────────────────────────────────────────────

function PhotoSlot({ label, acronym, index, value, meta, siteId, startedAt, onChange, onRemove, required }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const inputId  = `photo-${acronym}-${index}`
  const filename = meta?.filename || buildFilename(siteId, acronym, index, startedAt)
  const assetKey = filename   // filename IS the asset key → Storage path matches nomenclatura

  const recovered   = useMemo(() => {
    if (isDisplayablePhoto(value)) return value
    if (value) return recoverPhotoFromQueue(FORM_CODE, assetKey)
    return null
  }, [value, assetKey])

  const displayable = recovered || (isDisplayablePhoto(value) ? value : null)
  const isUploaded  = !!value && !displayable

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    const result = await processImageFile(file)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      setTimeout(() => setError(null), 6000)
      return
    }
    const now = new Date().toISOString()
    const fname = buildFilename(siteId, acronym, index, startedAt)
    onChange(result.dataUrl, { filename: fname, timestamp: now })
    queueAssetUpload(FORM_CODE, fname, result.dataUrl)
    flushSupabaseQueues({ formCode: FORM_CODE })
    setLoading(false)
    e.target.value = ''
  }

  return (
    <div className="mb-1">
      {/* Label */}
      <label className="block mb-2">
        <span className="text-sm font-semibold text-gray-700 flex flex-wrap items-center gap-1.5">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>

      {/* Two inputs: one for camera, one for gallery */}
      <input id={`${inputId}-cam`} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input id={`${inputId}-gal`} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {error && (
        <div className="mb-2 flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-2 py-8">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p className="text-sm font-semibold text-blue-600">Procesando foto...</p>
          <p className="text-xs text-blue-400">Comprimiendo imagen</p>
        </div>
      ) : displayable ? (
        <div className="rounded-2xl overflow-hidden border-2 border-emerald-500 bg-white">
          <div className="relative">
            <img src={displayable} alt={label} className="w-full h-48 sm:h-44 object-cover" />
            {/* Replace */}
            <label htmlFor={`${inputId}-gal`}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center cursor-pointer active:scale-95">
              <RefreshCw size={14} className="text-white" />
            </label>
            {/* Remove (non-required) */}
            {onRemove && (
              <button type="button" onClick={onRemove}
                className="absolute bottom-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Filename + timestamp bar */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] font-mono font-bold text-primary truncate">{filename}.jpg</p>
            {meta?.timestamp && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={10} className="text-gray-400 flex-shrink-0" />
                <p className="text-[10px] text-gray-400">{formatTs(meta.timestamp)}</p>
              </div>
            )}
          </div>
        </div>
      ) : isUploaded ? (
        <div className="rounded-2xl overflow-hidden border-2 border-emerald-500 bg-white">
          <label htmlFor={`${inputId}-gal`}
            className="w-full bg-emerald-50 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <Camera size={22} className="text-emerald-500" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold text-emerald-700">📷 Foto subida</p>
              <p className="text-xs text-emerald-500 mt-1">Toque para reemplazar</p>
            </div>
          </label>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] font-mono font-bold text-primary truncate">{filename}.jpg</p>
            {meta?.timestamp && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={10} className="text-gray-400 flex-shrink-0" />
                <p className="text-[10px] text-gray-400">{formatTs(meta.timestamp)}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white overflow-hidden">
          {/* Two action buttons — camera and gallery */}
          <div className="flex gap-3 justify-center items-center py-5 bg-gray-50">
            <label htmlFor={`${inputId}-cam`}
              className="flex flex-col items-center gap-1.5 w-20 py-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">
              <Camera size={22} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500">Cámara</span>
            </label>
            <label htmlFor={`${inputId}-gal`}
              className="flex flex-col items-center gap-1.5 w-20 py-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">
              <Image size={22} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500">Galería</span>
            </label>
          </div>
          {/* Preview filename */}
          <div className="px-3 py-2 bg-white border-t border-gray-100">
            <p className="text-[11px] font-mono text-gray-400 truncate">{buildFilename(siteId, acronym, index, startedAt)}.jpg</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Category step ───────────────────────────────────────────────────────────

function CategoryStep({ category, photos, photoMeta, siteId, startedAt, onPhotoChange, onAddPhoto, onRemovePhoto }) {
  const { id: acronym, title, description, minPhotos, variable, subLabels, subGroups, hint, quality, emoji } = category

  const slotCount = Math.max(photos.length, minPhotos)
  const slots = Array.from({ length: slotCount }, (_, i) => ({
    index: i,
    label: subLabels?.[i] ?? `Foto ${i + 1}`,
    value: photos[i] ?? null,
    meta: photoMeta?.[`${acronym}:${i}`] ?? null,
  }))

  const captured = photos.filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
              <span className="text-[10px] font-mono font-bold bg-primary text-white px-2 py-0.5 rounded-lg flex-shrink-0">
                {acronym}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-4 md:line-clamp-none">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
            📷 Mín. {minPhotos} foto{minPhotos !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
            🔍 {quality}
          </span>
          {variable && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              ± Cantidad variable
            </span>
          )}
        </div>

        {/* Nomenclatura example */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Nomenclatura de archivo</p>
          <p className="text-[11px] font-mono text-gray-600 bg-gray-100 rounded-lg px-2 py-1.5 truncate">
            {buildFilename(siteId || 'SITEID', acronym, 0, startedAt)}.jpg
          </p>
        </div>

        {subGroups && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={12} className="text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Vistas sugeridas</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {subGroups.map((sg) => (
                <span key={sg.key} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                  {acronym}_{sg.key} · {sg.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {hint && (
          <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-gray-100">
            <Info size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-600 leading-relaxed">{hint}</p>
          </div>
        )}
      </div>

      {/* Photo slots — 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <PhotoSlot
            key={`${acronym}-${slot.index}`}
            label={slot.label}
            acronym={acronym}
            index={slot.index}
            value={slot.value}
            meta={slot.meta}
            siteId={siteId}
            startedAt={startedAt}
            onChange={(dataUrl, meta) => onPhotoChange(acronym, slot.index, dataUrl, meta)}
            onRemove={slot.index >= minPhotos ? () => onRemovePhoto(acronym, slot.index) : undefined}
            required={slot.index < minPhotos}
          />
        ))}
      </div>

      {variable && (
        <button type="button" onClick={() => onAddPhoto(acronym)}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all">
          <Plus size={16} />
          Agregar foto adicional
        </button>
      )}

      {captured >= minPhotos && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <Check size={14} className="text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold text-emerald-700">
            {captured} foto{captured !== 1 ? 's' : ''} capturada{captured !== 1 ? 's' : ''} · Mínimo cumplido
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdditionalPhotoReport() {
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const isFormCompleted          = useAppStore((s) => s.isFormCompleted)
  const additionalPhotoData      = useAppStore((s) => s.additionalPhotoData || {})
  const setAdditionalPhotoField  = useAppStore((s) => s.setAdditionalPhotoField)
  const setAdditionalPhoto       = useAppStore((s) => s.setAdditionalPhoto)
  const addAdditionalPhotoSlot   = useAppStore((s) => s.addAdditionalPhotoSlot)
  const removeAdditionalPhotoSlot = useAppStore((s) => s.removeAdditionalPhotoSlot)
  const resetFormDraft           = useAppStore((s) => s.resetFormDraft)
  const finalizeForm             = useAppStore((s) => s.finalizeForm)
  const showToast                = useAppStore((s) => s.showToast)
  const activeVisit              = useAppStore((s) => s.activeVisit)
  const siteId                   = activeVisit?.site_id || ''
  const formMeta               = useAppStore((s) => s.formMeta)
  const startedAt              = formMeta?.[FORM_ID]?.startedAt || null

  const locked = isFormCompleted(FORM_ID)

  const currentStepRaw = useAppStore((s) => s.additionalPhotoStep ?? 1)
  const setStep = (step) => useAppStore.setState({ additionalPhotoStep: step })

  const totalSteps      = PHOTO_CATEGORIES.length
  const currentStep     = Math.max(1, Math.min(Number(currentStepRaw) || 1, totalSteps))
  const currentCategory = PHOTO_CATEGORIES[currentStep - 1]

  const completedSteps = useMemo(() => {
    return PHOTO_CATEGORIES.map((cat) => {
      const photos = additionalPhotoData?.photos?.[cat.id] || []
      return photos.filter(Boolean).length >= cat.minPhotos
    })
  }, [additionalPhotoData])

  const overallProgress = useMemo(() => {
    const done = completedSteps.filter(Boolean).length
    return Math.round((done / totalSteps) * 100)
  }, [completedSteps, totalSteps])

  const notes = additionalPhotoData?.notes || ''

  const handlePhotoChange = useCallback((acronym, index, dataUrl, meta) => {
    setAdditionalPhoto(acronym, index, dataUrl, meta)
  }, [setAdditionalPhoto])

  const handleAddSlot    = useCallback((acronym) => addAdditionalPhotoSlot(acronym), [addAdditionalPhotoSlot])
  const handleRemoveSlot = useCallback((acronym, index) => removeAdditionalPhotoSlot(acronym, index), [removeAdditionalPhotoSlot])

  const handlePrev = () => {
    if (currentStep > 1) { setStep(currentStep - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  const handleNext = async () => {
    try {
      const photos   = additionalPhotoData?.photos?.[currentCategory.id] || []
      const captured = photos.filter(Boolean).length
      if (captured < currentCategory.minPhotos) {
        showToast(`Se requieren al menos ${currentCategory.minPhotos} foto(s) para "${currentCategory.title}"`, 'error')
        return
      }

      if (currentStep < totalSteps) {
        setStep(currentStep + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        // Last step — finalize
        const missing = PHOTO_CATEGORIES.filter((cat) => {
          const p = additionalPhotoData?.photos?.[cat.id] || []
          return p.filter(Boolean).length < cat.minPhotos
        })
        if (missing.length > 0) {
          showToast(`Faltan fotos en: ${missing.slice(0, 2).map((c) => c.title).join(', ')}${missing.length > 2 ? '...' : ''}`, 'error')
          return
        }
        try {
          setShowConfirm(true)
          return
          navigate('/')
        } catch (e) {
          console.error('[AdditionalPhoto] finalize error:', e)
          showToast('Error al enviar. Intente de nuevo.', 'error')
        }
      }
    } catch (e) {
      console.error('[AdditionalPhoto] handleNext error:', e)
      showToast('Error al avanzar. Intente de nuevo.', 'error')
    }
  }

  const handleReset = () => {
    if (window.confirm('¿Desea eliminar todas las fotos y empezar de nuevo?')) {
      resetFormDraft('additional-photo')
      setStep(1)
    }
  }

  if (locked) return <FormLockedScreen title="Reporte de Fotos" formId={FORM_ID} onReset={handleReset} />

  const categoryPhotos = additionalPhotoData?.photos?.[currentCategory.id] || []
  const categoryMeta   = additionalPhotoData?.photoMeta || {}

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-24">
      <AppHeader title="Reporte de Fotos" subtitle={`${currentCategory.emoji} ${currentCategory.title}`} />
      <FormMetaBar formId={FORM_ID} formCode={FORM_CODE} />
      <AutosaveIndicator />

      {/* Progress */}
      <div className="px-4 sm:px-6 lg:px-8 pt-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-gray-500">
            {completedSteps.filter(Boolean).length} / {totalSteps} categorías completadas
          </span>
          <span className="text-[11px] font-bold text-primary">{overallProgress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
        </div>
      </div>

      {/* Step pills — acrónimos */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-3">
        <StepPills
          steps={PHOTO_CATEGORIES.map((cat, i) => ({ id: i + 1, title: cat.id, emoji: cat.emoji }))}
          currentStep={currentStep}
          completedSteps={PHOTO_CATEGORIES.map((_, i) => i + 1).filter((i) => completedSteps[i - 1])}
          onStepClick={(i) => setStep(i)}
          showIndex={false}
        />
      </div>

      {/* Content */}
      <main className="flex-1 pt-4 pb-2">
        <div className="max-w-2xl mx-auto px-4">
          <CategoryStep
            category={currentCategory}
            photos={categoryPhotos}
            photoMeta={categoryMeta}
            siteId={siteId}
            onPhotoChange={handlePhotoChange}
            onAddPhoto={handleAddSlot}
            onRemovePhoto={handleRemoveSlot}
          />

          {currentStep === totalSteps && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <label className="block text-sm font-bold text-gray-700 mb-2">Observaciones adicionales</label>
              <textarea
                value={notes}
                onChange={(e) => setAdditionalPhotoField('notes', e.target.value)}
                placeholder="Notas, condiciones especiales, aclaraciones..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          )}
        </div>
      </main>

      <BottomNav
        onPrev={handlePrev}
        onNext={handleNext}
        showPrev={currentStep > 1}
        nextLabel={currentStep === totalSteps ? 'Finalizar' : `Siguiente: ${PHOTO_CATEGORIES[currentStep]?.id || ''}`}
      />

      <ConfirmFinalizeModal
        show={showConfirm}
        formName="Reporte Adicional de Fotografías"
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false)
          try {
            await finalizeForm('additional-photo')
            showToast('¡Reporte de fotos completado!', 'success')
          setTimeout(() => navigate('/'), 3000)
          } catch (e) {
            showToast('Error al finalizar', 'error')
          }
        }}
        loading={loading}
      />
    </div>
  )
}
