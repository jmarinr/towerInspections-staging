import { CheckCircle, X } from 'lucide-react'

/**
 * ConfirmFinalizeModal — reusable confirmation dialog before finalizing any form.
 * Props:
 *   show        — boolean
 *   formName    — string e.g. "Mantenimiento Preventivo"
 *   onConfirm   — called when user confirms
 *   onCancel    — called when user cancels
 *   loading     — boolean, disables buttons while saving
 */
export default function ConfirmFinalizeModal({ show, formName, onConfirm, onCancel, loading = false }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-accent" />
            <span className="text-white font-bold text-sm">Finalizar formulario</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            ¿Confirmas que deseas finalizar <span className="text-primary">{formName}</span>?
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Una vez finalizado, el formulario quedará marcado como completado y no podrá editarse.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Confirmar y finalizar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
