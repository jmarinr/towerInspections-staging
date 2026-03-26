import { useState, useEffect, useRef } from 'react'
import PhotoButtons from '../ui/PhotoButtons'
import { Camera, ChevronDown, ChevronUp, X, Loader2, Check, UploadCloud, RefreshCw } from 'lucide-react'
import { useAppStore, isDisplayablePhoto, recoverPhotoFromQueue } from '../../hooks/useAppStore'
import { processImageFile } from '../../lib/photoUtils'
import { onPhotoStatus, PhotoUploadStatus } from '../../lib/photoEvents'
import { flushSupabaseQueues } from '../../lib/supabaseSync'

export default function MaintenanceActivity({ activity, index }) {
  const { maintenanceData, updateActivityStatus, updateActivityPhoto } = useAppStore()
  const [showPhotos, setShowPhotos] = useState(false)
  const [loadingBefore, setLoadingBefore] = useState(false)
  const [loadingAfter, setLoadingAfter] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState({})
  const statusTimersRef = useRef({})

  // Subscribe to upload events
  useEffect(() => {
    const beforeKey = `maintenance:${activity.id}:before`
    const afterKey = `maintenance:${activity.id}:after`
    const unsub = onPhotoStatus((evt) => {
      if (evt.formCode !== 'preventive-maintenance') return
      if (evt.assetType !== beforeKey && evt.assetType !== afterKey) return
      const which = evt.assetType === beforeKey ? 'before' : 'after'
      setUploadStatuses(prev => ({ ...prev, [which]: evt.status }))
      if (evt.status === PhotoUploadStatus.DONE || evt.status === PhotoUploadStatus.ERROR) {
        clearTimeout(statusTimersRef.current[which])
        const delay = evt.status === PhotoUploadStatus.DONE ? 3000 : 5000
        statusTimersRef.current[which] = setTimeout(() => {
          setUploadStatuses(prev => ({ ...prev, [which]: null }))
        }, delay)
      }
    })
    return () => {
      unsub()
      Object.values(statusTimersRef.current).forEach(clearTimeout)
    }
  }, [activity.id])
  
  const state = maintenanceData.activities[activity.id] || {}
  const isComplete = state.status === 'complete'

  const beforeRaw = maintenanceData.photos?.[`${activity.id}-before`]
  const afterRaw = maintenanceData.photos?.[`${activity.id}-after`]
  const beforeRecovered = (!isDisplayablePhoto(beforeRaw) && beforeRaw)
    ? recoverPhotoFromQueue('preventive-maintenance', `maintenance:${activity.id}:before`) : null
  const afterRecovered = (!isDisplayablePhoto(afterRaw) && afterRaw)
    ? recoverPhotoFromQueue('preventive-maintenance', `maintenance:${activity.id}:after`) : null
  const beforePhoto = isDisplayablePhoto(beforeRaw) ? beforeRaw : beforeRecovered
  const afterPhoto = isDisplayablePhoto(afterRaw) ? afterRaw : afterRecovered
  // Has a photo been uploaded but we can't display it (placeholder)?
  const beforeHasPlaceholder = !!beforeRaw && !beforePhoto
  const afterHasPlaceholder = !!afterRaw && !afterPhoto
  const hasPhotos = beforePhoto || afterPhoto || beforeHasPlaceholder || afterHasPlaceholder
  const hasBothPhotos = (beforePhoto || beforeHasPlaceholder) && (afterPhoto || afterHasPlaceholder)
  const isNA = state.status === 'na'
  const hasStatus = isComplete || isNA
  
  // Determinar si está completo (estado + fotos si es completado)
  const isFullyComplete = isComplete && hasBothPhotos
  const needsPhotos = isComplete && !hasBothPhotos

  const handlePhotoCapture = (type) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const setLoading = type === 'before' ? setLoadingBefore : setLoadingAfter
    setLoading(true)
    const result = await processImageFile(file)
    if (result.error) {
      alert(result.error)
      setLoading(false)
      return
    }
    updateActivityPhoto(activity.id, type, result.dataUrl)
    setLoading(false)
    e.target.value = ''
  }

  const handleRemovePhoto = (type) => () => {
    updateActivityPhoto(activity.id, type, null)
  }

  const handleRetry = (type) => {
    setUploadStatuses(prev => ({ ...prev, [type]: null }))
    try { flushSupabaseQueues({ formCode: 'preventive-maintenance' }) } catch (_) {}
  }

  const renderUploadBadge = (type) => {
    const status = uploadStatuses[type]
    const isLoading = type === 'before' ? loadingBefore : loadingAfter
    if (!status || isLoading) return null
    if (status === PhotoUploadStatus.UPLOADING) {
      return (
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-blue-600/90 backdrop-blur-sm">
          <Loader2 size={10} className="animate-spin text-white" />
          <span className="text-[9px] font-bold text-white">Subiendo...</span>
        </div>
      )
    }
    if (status === PhotoUploadStatus.DONE) {
      return (
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-green-600/90 backdrop-blur-sm">
          <Check size={10} className="text-white" />
          <span className="text-[9px] font-bold text-white">¡Guardada!</span>
        </div>
      )
    }
    if (status === PhotoUploadStatus.ERROR) {
      return (
        <button
          type="button"
          onClick={() => handleRetry(type)}
          className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-red-600/90 backdrop-blur-sm active:scale-95"
        >
          <RefreshCw size={10} className="text-white" />
          <span className="text-[9px] font-bold text-white">Reintentar</span>
        </button>
      )
    }
    return null
  }

  // Determinar color del borde
  const getBorderColor = () => {
    if (isFullyComplete) return 'border-green-500'
    if (isNA) return 'border-gray-300'
    if (needsPhotos) return 'border-amber-400' // Indica que falta algo
    return 'border-gray-200'
  }

  // Determinar color del badge numérico
  const getBadgeStyle = () => {
    if (isFullyComplete) return 'bg-green-500 text-white'
    if (isNA) return 'bg-gray-300 text-white'
    if (needsPhotos) return 'bg-amber-400 text-white'
    return 'bg-gray-100 text-gray-500'
  }

  const getBadgeContent = () => {
    if (isFullyComplete) return '✓'
    if (isNA) return '—'
    return index + 1
  }

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${getBorderColor()}`}>
      {/* Header de la actividad */}
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${getBadgeStyle()}`}>
            {getBadgeContent()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm leading-tight ${isNA ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {activity.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{activity.location}</p>
          </div>
          {/* Indicador de fotos faltantes */}
          {needsPhotos && (
            <div className="flex items-center">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                📷 Falta evidencia
              </span>
            </div>
          )}
        </div>

        {/* Botones de estado */}
        <div className="flex gap-2">
          <button 
            onClick={() => updateActivityStatus(activity.id, 'complete')} 
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              isComplete 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ✓ Completado
          </button>
          <button 
            onClick={() => updateActivityStatus(activity.id, 'na')} 
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              isNA 
                ? 'bg-gray-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            — N/A
          </button>
        </div>
      </div>

      {/* Sección de fotos - Solo visible si NO es N/A */}
      {!isNA && (
        <div className="border-t border-gray-100">
          {/* Botón para expandir/colapsar fotos */}
          <button
            onClick={() => setShowPhotos(!showPhotos)}
            className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
              showPhotos ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Camera size={16} className={hasPhotos ? 'text-green-500' : 'text-gray-400'} />
              <span className={`text-sm font-medium ${hasPhotos ? 'text-gray-700' : 'text-gray-500'}`}>
                {hasPhotos 
                  ? `Evidencia (${[beforePhoto, afterPhoto].filter(Boolean).length}/2)` 
                  : 'Agregar evidencia fotográfica'
                }
              </span>
              {/* Indicadores de fotos existentes */}
              {hasPhotos && (
                <div className="flex gap-1 ml-2">
                  {beforePhoto && (
                    <span className="w-5 h-5 rounded bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">A</span>
                  )}
                  {afterPhoto && (
                    <span className="w-5 h-5 rounded bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">D</span>
                  )}
                </div>
              )}
            </div>
            {showPhotos ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {/* Panel expandible de fotos */}
          {showPhotos && (
            <div className="px-4 pb-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                {/* Foto ANTES */}
                <div>
                  {/* Inputs via PhotoButtons */}
                  {loadingBefore ? (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-600">Procesando...</span>
                    </div>
                  ) : beforePhoto ? (
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-blue-500">
                      <img src={beforePhoto} alt="Antes" className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-blue-500">
                        Antes
                      </span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto('before')}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                      >
                        <X size={12} />
                      </button>
                      {renderUploadBadge('before')}
                    </div>
                  ) : beforeHasPlaceholder ? (
                    <label
                      htmlFor={`photo-before-${activity.id}`}
                      className="aspect-[4/3] rounded-xl border-2 border-blue-500 bg-blue-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-blue-500">
                        Antes
                      </span>
                      <UploadCloud size={16} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-gray-600">Guardada en nube</span>
                      <span className="text-[9px] text-gray-400">Toque para reemplazar</span>
                    </label>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-blue-500">Antes</span>
                      <PhotoButtons inputId={`photo-before-${activity.id}`} onChange={handlePhotoCapture('before')} color="blue" />
                    </div>
                  )}
                </div>

                {/* Foto DESPUÉS */}
                <div>
                  {/* Inputs via PhotoButtons */}
                  {loadingAfter ? (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-green-300 bg-green-50 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-green-500" />
                      <span className="text-[10px] font-semibold text-green-600">Procesando...</span>
                    </div>
                  ) : afterPhoto ? (
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-green-500">
                      <img src={afterPhoto} alt="Después" className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-green-500">
                        Después
                      </span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto('after')}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                      >
                        <X size={12} />
                      </button>
                      {renderUploadBadge('after')}
                    </div>
                  ) : afterHasPlaceholder ? (
                    <label
                      htmlFor={`photo-after-${activity.id}`}
                      className="aspect-[4/3] rounded-xl border-2 border-green-500 bg-green-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-green-500">
                        Después
                      </span>
                      <UploadCloud size={16} className="text-green-400" />
                      <span className="text-[10px] font-semibold text-gray-600">Guardada en nube</span>
                      <span className="text-[9px] text-gray-400">Toque para reemplazar</span>
                    </label>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-green-200 bg-green-50 flex flex-col items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white bg-green-500">Después</span>
                      <PhotoButtons inputId={`photo-after-${activity.id}`} onChange={handlePhotoCapture('after')} color="green" />
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje de ayuda */}
              {!hasBothPhotos && (
                <p className="text-[11px] text-gray-500 mt-3 text-center">
                  📸 Capture fotos antes y después de realizar la actividad
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
