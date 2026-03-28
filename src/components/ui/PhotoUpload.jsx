import { useState, useEffect, useMemo, useRef } from 'react'
import { Camera, X, Loader2, AlertCircle, Check, UploadCloud, RefreshCw } from 'lucide-react'
import PhotoButtons from './PhotoButtons'
import { isDisplayablePhoto, recoverPhotoFromQueue } from '../../hooks/useAppStore'
import { processImageFile } from '../../lib/photoUtils'
import { onPhotoStatus, PhotoUploadStatus } from '../../lib/photoEvents'
import { flushSupabaseQueues } from '../../lib/supabaseSync'

export default function PhotoUpload({ type, photo, value, onCapture, onRemove, formCode, assetType }) {
  const isBefore = type === 'before'
  const rawPhoto = photo || value || null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Upload status: null | 'uploading' | 'done' | 'error'
  const [uploadStatus, setUploadStatus] = useState(null)
  const statusTimerRef = useRef(null)

  // Try to recover photo from pending queue or uploaded URLs
  // Re-evaluate when uploadStatus changes (e.g. after upload completes, URL becomes available)
  const recoveredPhoto = useMemo(() => {
    if (isDisplayablePhoto(rawPhoto)) return rawPhoto
    if (rawPhoto && formCode && assetType) {
      return recoverPhotoFromQueue(formCode, assetType)
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPhoto, formCode, assetType, uploadStatus])

  const displayablePhoto = recoveredPhoto || (isDisplayablePhoto(rawPhoto) ? rawPhoto : null)
  const hasUploadedPhoto = !!rawPhoto && !displayablePhoto

  // Subscribe to upload events for this specific photo
  useEffect(() => {
    if (!formCode || !assetType) return
    const unsub = onPhotoStatus((evt) => {
      if (evt.formCode === formCode && evt.assetType === assetType) {
        setUploadStatus(evt.status)
        // On DONE: update the store value to the public URL so photo shows immediately
        if (evt.status === PhotoUploadStatus.DONE && evt.publicUrl && onCapture) {
          onCapture(evt.publicUrl)
        }
        // Auto-clear 'done' after 3 seconds
        if (evt.status === PhotoUploadStatus.DONE) {
          clearTimeout(statusTimerRef.current)
          statusTimerRef.current = setTimeout(() => setUploadStatus(null), 3000)
        }
        // Auto-clear 'error' after 5 seconds
        if (evt.status === PhotoUploadStatus.ERROR) {
          clearTimeout(statusTimerRef.current)
          statusTimerRef.current = setTimeout(() => setUploadStatus(null), 5000)
        }
      }
    })
    return () => {
      unsub()
      clearTimeout(statusTimerRef.current)
    }
  }, [formCode, assetType])

  const handleChange = async (e) => {
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

    onCapture(result.dataUrl)
    setLoading(false)
    e.target.value = ''
  }

  const handleRetry = () => {
    setUploadStatus(null)
    if (formCode) {
      try { flushSupabaseQueues({ formCode }) } catch (_) {}
    }
  }

  const id = `photo-${type}-${Math.random().toString(36).substr(2, 9)}`

  // Upload status overlay badge
  const renderUploadBadge = () => {
    if (!uploadStatus || loading) return null
    if (uploadStatus === PhotoUploadStatus.UPLOADING) {
      return (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-blue-600/90 backdrop-blur-sm">
          <Loader2 size={12} className="animate-spin text-white" />
          <span className="text-[10px] font-bold text-white">Subiendo a la nube...</span>
        </div>
      )
    }
    if (uploadStatus === PhotoUploadStatus.DONE) {
      return (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-green-600/90 backdrop-blur-sm">
          <Check size={12} className="text-white" />
          <span className="text-[10px] font-bold text-white">¡Foto guardada!</span>
        </div>
      )
    }
    if (uploadStatus === PhotoUploadStatus.ERROR) {
      return (
        <button
          type="button"
          onClick={handleRetry}
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
    <div className="relative">
      {/* Camera and gallery inputs rendered by PhotoButtons */}

      {error && (
        <div className="mb-2 flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span className="text-xs font-semibold text-blue-600">Procesando foto...</span>
        </div>
      ) : displayablePhoto ? (
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-green-500">
          <img src={displayablePhoto} alt={type} className="w-full h-full object-cover" />
          <span className={`absolute top-2 left-2 px-2 py-1 rounded text-[9px] font-bold uppercase text-white ${isBefore ? 'bg-blue-500' : 'bg-green-500'}`}>
            {isBefore ? 'Antes' : 'Después'}
          </span>
          <button type="button" onClick={onRemove} className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white">
            <X size={14} />
          </button>
          {renderUploadBadge()}
        </div>
      ) : hasUploadedPhoto ? (
        <label htmlFor={id} className={`aspect-[4/3] rounded-xl border-2 flex flex-col items-center justify-center gap-1 cursor-pointer ${isBefore ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}`}>
          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase text-white ${isBefore ? 'bg-blue-500' : 'bg-green-500'}`}>
            {isBefore ? 'Antes' : 'Después'}
          </span>
          <UploadCloud size={20} className="text-green-500" />
          <span className="text-[10px] font-semibold text-gray-600">Foto guardada en nube</span>
          <span className="text-[9px] text-gray-400">Toque para reemplazar</span>
        </label>
      ) : (
        <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white ${isBefore ? 'bg-blue-500' : 'bg-green-500'}`}>
            {isBefore ? 'Antes' : 'Después'}
          </span>
          <PhotoButtons inputId={id} onChange={handleChange} color={isBefore ? 'blue' : 'green'} />
        </div>
      )}
    </div>
  )
}
