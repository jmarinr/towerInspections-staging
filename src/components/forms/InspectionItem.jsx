import { Camera } from 'lucide-react'
import StatusButton from '../ui/StatusButton'
import PhotoUpload from '../ui/PhotoUpload'
import { useAppStore } from '../../hooks/useAppStore'

export default function InspectionItem({ item, index }) {
  const { inspectionData, updateItemStatus, updateItemObservation, updateItemPhoto } = useAppStore()
  const itemState = inspectionData.items[item.id] || {}
  const isAnswered = !!itemState.status
  const beforePhoto = inspectionData.photos[`${item.id}-before`]
  const afterPhoto = inspectionData.photos[`${item.id}-after`]

  return (
    <div className={`bg-white rounded-2xl mb-3 overflow-hidden border-2 transition-all ${isAnswered ? 'border-green-500' : 'border-gray-200'}`}>
      <div className="p-4 flex gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isAnswered ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{isAnswered ? '✓' : index + 1}</div>
        <p className="text-[15px] font-semibold text-gray-800 leading-snug">{item.text}</p>
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {['bueno', 'regular', 'malo', 'na'].map((status) => (
          <StatusButton key={status} status={status} selected={itemState.status === status} onClick={() => updateItemStatus(item.id, status)} />
        ))}
      </div>
      <div className="px-4 pb-4">
        <input type="text" placeholder="💬 Agregar observación..." value={itemState.observation || ''} onChange={(e) => updateItemObservation(item.id, e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white" />
      </div>
      {item.hasPhoto && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2"><Camera size={14} />Evidencia fotográfica</div>
          <div className="grid grid-cols-2 gap-3">
            <PhotoUpload type="before" photo={beforePhoto} onCapture={(data) => updateItemPhoto(item.id, 'before', data)} onRemove={() => updateItemPhoto(item.id, 'before', null)} formCode="inspection-general" assetType={`inspection:${item.id}:before`} />
            <PhotoUpload type="after" photo={afterPhoto} onCapture={(data) => updateItemPhoto(item.id, 'after', data)} onRemove={() => updateItemPhoto(item.id, 'after', null)} formCode="inspection-general" assetType={`inspection:${item.id}:after`} />
          </div>
        </div>
      )}
    </div>
  )
}
