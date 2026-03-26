import React from 'react'
import { X, RotateCw } from 'lucide-react'
import DistributionBuilder from './DistributionBuilder'

export default function FullscreenDistributionModal({
  open,
  onClose,
  scene,
  pngDataUrl,
  fotoTorreDataUrl,
  onSaveScene,
  onSaveFoto,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl border-2 border-gray-200 text-gray-700 bg-white active:scale-95"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <div className="font-extrabold text-gray-900">Croquis: distribución de equipos</div>
        <div className="flex-1" />
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <RotateCw size={14} />
          Gira el teléfono a horizontal para tener más espacio.
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DistributionBuilder
          variant="fullscreen"
          scene={scene}
          pngDataUrl={pngDataUrl}
          fotoTorreDataUrl={fotoTorreDataUrl}
          onSaveScene={onSaveScene}
          onSaveFoto={onSaveFoto}
        />
      </div>
    </div>
  )
}
