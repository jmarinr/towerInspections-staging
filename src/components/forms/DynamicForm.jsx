import { MapPin, Camera, X, Loader2, Check, UploadCloud, RefreshCw } from 'lucide-react'
import AutoTextarea from '../ui/AutoTextarea'
import { useState, useEffect, useRef } from 'react'
import { queueAssetUpload, flushSupabaseQueues } from '../../lib/supabaseSync'
import { isDisplayablePhoto, recoverPhotoFromQueue } from '../../hooks/useAppStore'
import { processImageFile } from '../../lib/photoUtils'
import { onPhotoStatus, PhotoUploadStatus } from '../../lib/photoEvents'
import PhotoButtons from '../ui/PhotoButtons'

/**
 * DynamicForm supports two calling conventions used across the app:
 *  1) <DynamicForm step={{ title, description, fields }} formData={...} onFieldChange={...} />
 *  2) <DynamicForm fields={[...]} data={...} onChange={...} title="..." description="..." />
 *
 * This keeps forms backward/forward compatible and prevents pages from
 * rendering "No hay campos para mostrar" due to a prop-shape mismatch.
 */
export default function DynamicForm(props) {
  const step = props.step ?? (props.fields ? { title: props.title, description: props.description, fields: props.fields } : null)
  const formData = props.formData ?? props.data ?? props.sectionData ?? {}
  const onFieldChange = props.onFieldChange ?? props.onChange ?? (() => {})
  const formCode = props.formCode ?? props.form_code ?? props.formId ?? step?.formCode ?? null

  // Guard against undefined step or fields
  if (!step || !Array.isArray(step.fields) || step.fields.length === 0) {
    return <div className="text-gray-500 text-center py-4">No hay campos para mostrar</div>
  }

  const { fields } = step

  const [touched, setTouched] = useState({})
  const [loadingPhotos, setLoadingPhotos] = useState({})
  // Track upload status per field: { fieldId: 'uploading' | 'done' | 'error' }
  const [uploadStatuses, setUploadStatuses] = useState({})
  const statusTimersRef = useRef({})

  // Subscribe to photo upload events
  useEffect(() => {
    if (!formCode) return
    const unsub = onPhotoStatus((evt) => {
      if (evt.formCode !== formCode) return
      // evt.assetType is the field.id for DynamicForm photos
      const fieldId = evt.assetType
      setUploadStatuses(prev => ({ ...prev, [fieldId]: evt.status }))
      // On DONE: update field value to public URL so photo shows immediately
      // without needing localStorage recovery or re-hydration
      if (evt.status === PhotoUploadStatus.DONE && evt.publicUrl) {
        onFieldChange(fieldId, evt.publicUrl)
      }
      // Auto-clear done/error status badge
      if (evt.status === PhotoUploadStatus.DONE || evt.status === PhotoUploadStatus.ERROR) {
        clearTimeout(statusTimersRef.current[fieldId])
        const delay = evt.status === PhotoUploadStatus.DONE ? 3000 : 5000
        statusTimersRef.current[fieldId] = setTimeout(() => {
          setUploadStatuses(prev => ({ ...prev, [fieldId]: null }))
        }, delay)
      }
    })
    return () => {
      unsub()
      Object.values(statusTimersRef.current).forEach(clearTimeout)
    }
  }, [formCode])

  // Apply defaultValues from field config for empty fields
  useEffect(() => {
    if (!fields) return
    fields.forEach(field => {
      if (field.defaultValue && (formData[field.id] == null || formData[field.id] === '')) {
        onFieldChange(field.id, field.defaultValue)
      }
    })
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markTouched = (id) => setTouched((prev) => (prev[id] ? prev : { ...prev, [id]: true }))

  const validateByType = (field, value) => {
    const v = value ?? ''
    const isEmpty = String(v).trim().length === 0
    if (!field.required && isEmpty) return null
    if (field.required && isEmpty) return false

    switch (field.type) {
      case 'number':
        return Number.isFinite(Number(v))
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(String(v))
      case 'time':
        return /^\d{2}:\d{2}$/.test(String(v))
      case 'gps': {
        const parts = String(v).split(',').map(s => s.trim())
        if (parts.length !== 2) return false
        const lat = Number(parts[0])
        const lng = Number(parts[1])
        return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      }
      case 'photo':
        // We accept local DataURLs, blob URLs, remote URLs/keys, or the __photo__ placeholder
        return String(v).startsWith('data:image') || String(v).startsWith('blob:') || String(v).startsWith('http') || String(v).startsWith('/') || v === '__photo__'
      case 'select':
        return String(v).trim().length > 0
      default:
        return true
    }
  }

  const shouldShowField = (field) => {
    if (!field.showIf) return true
    const { field: condField, value, values } = field.showIf
    const currentValue = formData[condField]
    if (values) return values.includes(currentValue)
    return currentValue === value
  }

  const handleGPSCapture = (fieldId) => {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
        onFieldChange(fieldId, coords)
      },
      (err) => alert('Error GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const handlePhotoCapture = (fieldId) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingPhotos(prev => ({ ...prev, [fieldId]: true }))
    const result = await processImageFile(file)
    if (result.error) {
      alert(result.error)
      setLoadingPhotos(prev => ({ ...prev, [fieldId]: false }))
      return
    }
    const dataUrl = result.dataUrl
    onFieldChange(fieldId, dataUrl)
    // Background upload to Supabase Storage (if configured). This should NOT
    // block navigation or local autosave.
    if (formCode) {
      try {
        queueAssetUpload(formCode, fieldId, dataUrl)
        flushSupabaseQueues({ formCode })
      } catch (err) {
        // Silent: offline / storage not configured yet.
        console.warn('[Supabase] queueAssetUpload failed', err)
      }
    }
    setLoadingPhotos(prev => ({ ...prev, [fieldId]: false }))
    e.target.value = ''
  }

  const renderField = (field) => {
    if (!shouldShowField(field)) return null

    const rawValue = formData[field.id]
    const value = (rawValue != null && rawValue !== '') ? rawValue : (field.defaultValue || '')
    const validity = validateByType(field, value)
    const isTouched = !!touched[field.id] || (field.type === 'gps' && String(value).trim().length > 0)
    const showError = isTouched && validity === false
    const showSuccess = isTouched && validity === true

    const borderClass = showError ? 'border-red-500' : showSuccess ? 'border-emerald-500' : 'border-gray-200'
    const baseInputClass = `w-full px-4 py-3 text-[15px] border-2 ${borderClass} rounded-xl bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all`

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => {
              markTouched(field.id)
              onFieldChange(field.id, e.target.value)
            }}
            onBlur={() => markTouched(field.id)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => {
              markTouched(field.id)
              onFieldChange(field.id, e.target.value)
            }}
            onBlur={() => markTouched(field.id)}
            className={baseInputClass}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value}
            readOnly={!!field.readOnly}
            onChange={(e) => {
              if (field.readOnly) return
              markTouched(field.id)
              onFieldChange(field.id, e.target.value)
            }}
            onBlur={() => markTouched(field.id)}
            className={`${baseInputClass} ${field.readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
          />
        )

      case 'select':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => {
                markTouched(field.id)
                onFieldChange(field.id, e.target.value)
              }}
              onBlur={() => markTouched(field.id)}
              className={`${baseInputClass} appearance-none pr-10`}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              ▼
            </div>
          </div>
        )

      case 'toggle':
        return (
          <div className="flex flex-wrap gap-2">
            {field.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  markTouched(field.id)
                  onFieldChange(field.id, opt.value)
                }}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  value === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )

      case 'status': {
        // Botones estilo inspección: Bueno/Regular/Malo/N/A
        const statusOptions = [
          { value: 'bueno', label: 'Bueno', color: 'bg-green-500' },
          { value: 'regular', label: 'Regular', color: 'bg-amber-500' },
          { value: 'malo', label: 'Malo', color: 'bg-red-500' },
          { value: 'na', label: 'N/A', color: 'bg-gray-500' },
        ]
        return (
          <div className="flex gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  markTouched(field.id)
                  onFieldChange(field.id, opt.value)
                }}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  value === opt.value
                    ? `${opt.color} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )
      }

      case 'textarea':
        return (
          <AutoTextarea
            value={value}
            onChange={(e) => {
              markTouched(field.id)
              onFieldChange(field.id, e.target.value)
            }}
            onBlur={() => markTouched(field.id)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        )

      case 'gps':
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={value}
              readOnly
              placeholder="Latitud, Longitud"
              className={`${baseInputClass} flex-1 bg-gray-50`}
            />
            <button
              type="button"
              onClick={() => handleGPSCapture(field.id)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 hover:bg-gray-50 transition-all"
            >
              <MapPin size={18} />
              <span>Capturar</span>
            </button>
          </div>
        )

      case 'photo': {
        const recoveredDynPhoto = !isDisplayablePhoto(value) && value && formCode
          ? recoverPhotoFromQueue(formCode, field.id)
          : null
        const photoSrc = recoveredDynPhoto || value
        const photoDisplayable = isDisplayablePhoto(photoSrc)
        const photoPlaceholder = !!value && !photoDisplayable
        const photoLoading = !!loadingPhotos[field.id]
        const photoUpStatus = uploadStatuses[field.id] || null

        const renderDynUploadBadge = () => {
          if (!photoUpStatus || photoLoading) return null
          if (photoUpStatus === PhotoUploadStatus.UPLOADING) {
            return (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-blue-600/90 backdrop-blur-sm">
                <Loader2 size={12} className="animate-spin text-white" />
                <span className="text-[10px] font-bold text-white">Subiendo a la nube...</span>
              </div>
            )
          }
          if (photoUpStatus === PhotoUploadStatus.DONE) {
            return (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-green-600/90 backdrop-blur-sm">
                <Check size={12} className="text-white" />
                <span className="text-[10px] font-bold text-white">¡Foto guardada!</span>
              </div>
            )
          }
          if (photoUpStatus === PhotoUploadStatus.ERROR) {
            return (
              <button
                type="button"
                onClick={() => {
                  setUploadStatuses(prev => ({ ...prev, [field.id]: null }))
                  try { flushSupabaseQueues({ formCode }) } catch (_) {}
                }}
                className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-red-600/90 backdrop-blur-sm active:scale-95"
              >
                <RefreshCw size={12} className="text-white" />
                <span className="text-[10px] font-bold text-white">Error al subir · Reintentar</span>
              </button>
            )
          }
          return null
        }

        return (
          <div>
            {/* Camera and gallery inputs rendered by PhotoButtons */}
            {photoLoading ? (
              <div className="w-36 aspect-[4/3] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-semibold text-blue-600">Procesando...</span>
              </div>
            ) : photoDisplayable ? (
              <div className="relative w-36 aspect-[4/3] rounded-xl overflow-hidden border-2 border-green-500">
                <img src={photoSrc} alt="Captura" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onFieldChange(field.id, '')}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                >
                  <X size={12} />
                </button>
                {renderDynUploadBadge()}
              </div>
            ) : photoPlaceholder ? (
              <label
                htmlFor={`photo-${field.id}`}
                className="w-36 aspect-[4/3] rounded-xl border-2 border-green-500 bg-green-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <UploadCloud size={18} className="text-green-500" />
                <span className="text-[10px] font-semibold text-green-700">En la nube</span>
                <span className="text-[9px] text-green-500">Toque para reemplazar</span>
              </label>
            ) : (
              <div className="w-36 aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                <PhotoButtons inputId={`photo-${field.id}`} onChange={handlePhotoCapture(field.id)} color="gray" />
              </div>
            )}
          </div>
        )
      }

      case 'calculated':
        // Campo calculado - solo lectura
        return (
          <input
            type="text"
            value={value || 'Auto-calculado'}
            readOnly
            className={`${baseInputClass} bg-gray-100 text-gray-500`}
          />
        )

      case 'signature':
        return (
          <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <span className="text-sm text-gray-400">Firma digital (próximamente)</span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (!shouldShowField(field)) return null

        const value = formData[field.id] || ''
        const validity = validateByType(field, value)
        const isTouched = !!touched[field.id] || (field.type === 'gps' && String(value).trim().length > 0)
        const showError = isTouched && validity === false
        const showSuccess = isTouched && validity === true
        
        return (
          <div key={field.id} className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            {renderField(field)}
            {showError && <p className="text-xs font-medium text-red-500">⚠ {field.errorText || 'Dato requerido o inválido'}</p>}
            {showSuccess && <p className="text-xs font-semibold text-emerald-600">✓ {field.successText || 'Dato registrado correctamente'}</p>}
          </div>
        )
      })}
    </div>
  )
}
