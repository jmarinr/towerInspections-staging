import { useState, useEffect, useRef } from 'react'
import { Camera, ChevronDown, ChevronUp, X, Loader2, Check, UploadCloud, RefreshCw } from 'lucide-react'
import PhotoButtons from '../ui/PhotoButtons'
import { isDisplayablePhoto, recoverPhotoFromQueue } from '../../hooks/useAppStore'
import { processImageFile } from '../../lib/photoUtils'
import { onPhotoStatus, PhotoUploadStatus } from '../../lib/photoEvents'
import { flushSupabaseQueues } from '../../lib/supabaseSync'

export default function InspectionChecklist({ step, checklistData = {}, photos = {}, onItemChange, onPhotoChange, formData = {}, hideEvidence = false }) {
  const [expandedItems, setExpandedItems] = useState({})
  const [loadingPhotos, setLoadingPhotos] = useState({})
  // Upload status per photo: { 'itemId-before': 'uploading' | 'done' | 'error' }
  const [uploadStatuses, setUploadStatuses] = useState({})
  const statusTimersRef = useRef({})

  // The correct formCode for photos in MantenimientoPreventivo checklist
  const FORM_CODE = 'preventive-maintenance'

  // Subscribe to upload events for this form
  useEffect(() => {
    const unsub = onPhotoStatus((evt) => {
      if (evt.formCode !== FORM_CODE) return
      // assetType is 'maintenance:itemId:before|after'
      const parts = evt.assetType.split(':')
      if (parts.length === 3 && parts[0] === 'maintenance') {
        const key = `${parts[1]}-${parts[2]}` // e.g. '1.1-before'
        setUploadStatuses(prev => ({ ...prev, [key]: evt.status }))
        if (evt.status === PhotoUploadStatus.DONE || evt.status === PhotoUploadStatus.ERROR) {
          clearTimeout(statusTimersRef.current[key])
          const delay = evt.status === PhotoUploadStatus.DONE ? 3000 : 5000
          statusTimersRef.current[key] = setTimeout(() => {
            setUploadStatuses(prev => ({ ...prev, [key]: null }))
          }, delay)
        }
      }
    })
    return () => {
      unsub()
      Object.values(statusTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  if (!step || !step.items) {
    return <div className="text-gray-500 text-center py-4">No hay ítems para mostrar</div>
  }

  const shouldShowItem = (item) => {
    if (!item.showIf) return true
    const { field, value, values } = item.showIf
    const currentValue = formData[field]
    if (values) return values.includes(currentValue)
    return currentValue === value
  }

  const visibleItems = step.items.filter(shouldShowItem)

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handlePhotoCapture = (itemId, type) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = `${itemId}-${type}`
    setLoadingPhotos(prev => ({ ...prev, [key]: true }))
    const result = await processImageFile(file)
    if (result.error) {
      alert(result.error)
      setLoadingPhotos(prev => ({ ...prev, [key]: false }))
      return
    }
    onPhotoChange(itemId, type, result.dataUrl)
    setLoadingPhotos(prev => ({ ...prev, [key]: false }))
    e.target.value = ''
  }

  const handleRetry = () => {
    try { flushSupabaseQueues({ formCode: FORM_CODE }) } catch (_) {}
  }

  const getItemStatus = (itemId) => {
    const data = checklistData[itemId] || {}
    const beforeRaw = photos[`${itemId}-before`]
    const afterRaw = photos[`${itemId}-after`]
    const hasBeforeValue = !!beforeRaw
    const hasAfterValue = !!afterRaw
    // Use correct formCode and assetType pattern for recovery
    const beforePhoto = isDisplayablePhoto(beforeRaw) ? beforeRaw
      : (beforeRaw ? recoverPhotoFromQueue(FORM_CODE, `maintenance:${itemId}:before`) : null)
    const afterPhoto = isDisplayablePhoto(afterRaw) ? afterRaw
      : (afterRaw ? recoverPhotoFromQueue(FORM_CODE, `maintenance:${itemId}:after`) : null)
    
    const hasStatus = !!data.status
    const isNA = data.status === 'na'
    const hasBothPhotos = hasBeforeValue && hasAfterValue
    const isComplete = hasStatus && (isNA || hasBothPhotos)
    const needsPhotos = hasStatus && !isNA && !hasBothPhotos

    return { hasStatus, isNA, hasBothPhotos, isComplete, needsPhotos, beforePhoto, afterPhoto, hasBeforeValue, hasAfterValue }
  }

  const completedCount = visibleItems.filter(item => getItemStatus(item.id).isComplete).length

  const renderUploadBadge = (itemId, type) => {
    const key = `${itemId}-${type}`
    const status = uploadStatuses[key]
    if (!status || loadingPhotos[key]) return null
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
          onClick={handleRetry}
          className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-red-600/90 backdrop-blur-sm active:scale-95"
        >
          <RefreshCw size={10} className="text-white" />
          <span className="text-[9px] font-bold text-white">Reintentar</span>
        </button>
      )
    }
    return null
  }

  return (
    <div className="space-y-3">
      {/* Header con contador */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{visibleItems.length} ítems</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${completedCount === visibleItems.length ? 'text-green-600' : 'text-primary'}`}>
            {completedCount}/{visibleItems.length}
          </span>
          {completedCount === visibleItems.length && visibleItems.length > 0 && (
            <span className="text-green-500">✓</span>
          )}
        </div>
      </div>

      {/* Lista de items */}
      {visibleItems.map((item, idx) => {
        const status = getItemStatus(item.id)
        const data = checklistData[item.id] || {}
        const isExpanded = expandedItems[item.id]

        const borderColor = status.isComplete 
          ? 'border-green-500' 
          : status.needsPhotos 
            ? 'border-amber-400' 
            : status.isNA 
              ? 'border-gray-300' 
              : 'border-gray-200'

        const badgeStyle = status.isComplete
          ? 'bg-green-500 text-white'
          : status.needsPhotos
            ? 'bg-amber-400 text-white'
            : status.isNA
              ? 'bg-gray-300 text-white'
              : 'bg-gray-100 text-gray-500'

        return (
          <div 
            key={item.id} 
            className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${borderColor}`}
          >
            <div className="p-4">
              <div className="flex gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${badgeStyle}`}>
                  {status.isComplete ? '✓' : status.isNA ? '—' : item.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-tight ${status.isNA ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
                {status.needsPhotos && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg h-fit">
                    📷 Falta
                  </span>
                )}
              </div>

              <div className="flex gap-1.5 mb-3">
                {['bueno', 'regular', 'malo', 'na'].map((st) => {
                  const isSelected = data.status === st
                  const labels = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo', na: 'N/A' }
                  const colors = {
                    bueno: isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600',
                    regular: isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600',
                    malo: isSelected ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600',
                    na: isSelected ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600',
                  }
                  return (
                    <button
                      key={st}
                      onClick={() => onItemChange(item.id, 'status', st)}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all active:scale-95 ${colors[st]}`}
                    >
                      {labels[st]}
                    </button>
                  )
                })}
              </div>

              {item.hasValueInput && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={data.value || ''}
                    onChange={(e) => onItemChange(item.id, 'value', e.target.value)}
                    placeholder={item.valueLabel || 'Valor'}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-primary outline-none"
                  />
                </div>
              )}

              <input
                type="text"
                value={data.observation || ''}
                onChange={(e) => onItemChange(item.id, 'observation', e.target.value)}
                placeholder="💬 Observación..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-primary outline-none bg-gray-50"
              />
            </div>

            {!status.isNA && !hideEvidence && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full px-4 py-2.5 flex items-center justify-between transition-all ${
                    isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Camera size={14} className={status.hasBothPhotos ? 'text-green-500' : 'text-gray-400'} />
                    <span className={`text-xs font-medium ${status.hasBothPhotos ? 'text-gray-700' : 'text-gray-500'}`}>
                      {status.hasBothPhotos 
                        ? 'Evidencia completa' 
                        : (status.beforePhoto || status.hasBeforeValue || status.afterPhoto || status.hasAfterValue)
                          ? `Evidencia (${[status.hasBeforeValue, status.hasAfterValue].filter(Boolean).length}/2)`
                          : 'Agregar evidencia'
                      }
                    </span>
                    {(status.beforePhoto || status.hasBeforeValue) && (
                      <span className="w-4 h-4 rounded bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center">A</span>
                    )}
                    {(status.afterPhoto || status.hasAfterValue) && (
                      <span className="w-4 h-4 rounded bg-green-500 text-white text-[8px] font-bold flex items-center justify-center">D</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Foto ANTES */}
                      <div>
                        {/* Inputs via PhotoButtons */}
                        {loadingPhotos[`${item.id}-before`] ? (
                          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1">
                            <Loader2 size={18} className="animate-spin text-blue-500" />
                            <span className="text-[9px] font-semibold text-blue-600">Procesando...</span>
                          </div>
                        ) : status.beforePhoto ? (
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-blue-500">
                            <img src={status.beforePhoto} alt="Antes" className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-blue-500">
                              Antes
                            </span>
                            <button
                              type="button"
                              onClick={() => onPhotoChange(item.id, 'before', null)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                            >
                              <X size={10} />
                            </button>
                            {renderUploadBadge(item.id, 'before')}
                          </div>
                        ) : status.hasBeforeValue ? (
                          <label
                            htmlFor={`photo-before-${item.id}`}
                            className="aspect-[4/3] rounded-xl border-2 border-blue-500 bg-blue-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-blue-500">Antes</span>
                            <UploadCloud size={16} className="text-blue-400" />
                            <span className="text-[9px] text-blue-600 font-semibold">En la nube</span>
                            <span className="text-[8px] text-blue-400">Toque para reemplazar</span>
                          </label>
                        ) : (
                          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-blue-500">Antes</span>
                            <PhotoButtons inputId={`photo-before-${item.id}`} onChange={handlePhotoCapture(item.id, 'before')} color="blue" />
                          </div>
                        )}
                      </div>

                      {/* Foto DESPUÉS */}
                      <div>
                        {/* Inputs via PhotoButtons */}
                        {loadingPhotos[`${item.id}-after`] ? (
                          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-green-300 bg-green-50 flex flex-col items-center justify-center gap-1">
                            <Loader2 size={18} className="animate-spin text-green-500" />
                            <span className="text-[9px] font-semibold text-green-600">Procesando...</span>
                          </div>
                        ) : status.afterPhoto ? (
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-green-500">
                            <img src={status.afterPhoto} alt="Después" className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-green-500">
                              Después
                            </span>
                            <button
                              type="button"
                              onClick={() => onPhotoChange(item.id, 'after', null)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                            >
                              <X size={10} />
                            </button>
                            {renderUploadBadge(item.id, 'after')}
                          </div>
                        ) : status.hasAfterValue ? (
                          <label
                            htmlFor={`photo-after-${item.id}`}
                            className="aspect-[4/3] rounded-xl border-2 border-green-500 bg-green-50 flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-green-500">Después</span>
                            <UploadCloud size={16} className="text-green-400" />
                            <span className="text-[9px] text-green-600 font-semibold">En la nube</span>
                            <span className="text-[8px] text-green-400">Toque para reemplazar</span>
                          </label>
                        ) : (
                          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-green-200 bg-green-50 flex flex-col items-center justify-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase text-white bg-green-500">Después</span>
                            <PhotoButtons inputId={`photo-after-${item.id}`} onChange={handlePhotoCapture(item.id, 'after')} color="green" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
