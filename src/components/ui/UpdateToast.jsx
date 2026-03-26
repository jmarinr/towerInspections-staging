/**
 * UpdateToast — floating non-blocking notification shown inside forms.
 * Inspector can dismiss, tap "Update now", or it auto-triggers on form finish.
 */
import { RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

export default function UpdateToast({ onUpdate, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="fixed top-[60px] left-3 right-3 z-[500] bg-primary rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl">
      <div className="w-7 h-7 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <RefreshCw size={14} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white">Nueva versión disponible</p>
        <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
          Se actualizará al finalizar este formulario.
        </p>
        <button
          onClick={onUpdate}
          className="mt-2 text-[11px] font-bold text-accent active:opacity-70"
        >
          Actualizar ahora →
        </button>
      </div>
      <button
        onClick={() => { setDismissed(true); onDismiss?.() }}
        className="w-6 h-6 flex items-center justify-center text-white/50 active:text-white flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
