/**
 * UpdateBanner — shown in Home when there's an active order but not in a form.
 * Non-intrusive footer banner with "Update now" button.
 */
import { RefreshCw } from 'lucide-react'

export default function UpdateBanner({ onUpdate }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] bg-primary px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw size={14} className="text-accent flex-shrink-0" />
        <p className="text-xs text-white/90 leading-tight">
          Nueva versión disponible
        </p>
      </div>
      <button
        onClick={onUpdate}
        className="flex-shrink-0 bg-accent text-primary text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
      >
        Actualizar ahora
      </button>
    </div>
  )
}
