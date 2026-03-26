import { X, Smartphone } from 'lucide-react'
import DrawingCanvas from './DrawingCanvas'

export default function FullscreenDrawingModal({
  open,
  title,
  backgroundImage = null,
  initialDrawing = null,
  onChange,
  onClose,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />

      <div className="absolute inset-0 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="text-sm font-extrabold text-gray-900">{title}</div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Smartphone size={14} /> Tip: si necesitas más espacio, gira el teléfono a horizontal.
          </div>
        </div>

        <div className="flex-1">
          <DrawingCanvas
            variant="fullscreen"
            maxWidth={2000}
            hideFooter
            backgroundImage={backgroundImage}
            initialDrawing={initialDrawing}
            onChange={onChange}
            compactControls
            rightControls={null}
          />
        </div>
      </div>
    </div>
  )
}
