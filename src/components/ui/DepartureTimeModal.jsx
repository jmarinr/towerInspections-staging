import { useState, useEffect } from 'react'
import { Clock, X } from 'lucide-react'

/**
 * Modal that captures departure time when finalizing a form.
 * Auto-fills with current time, allows editing.
 */
export default function DepartureTimeModal({ open, onConfirm, onCancel }) {
  const [time, setTime] = useState('')

  // Auto-fill with current time when modal opens
  useEffect(() => {
    if (open) {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setTime(`${hh}:${mm}`)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Hora de Salida</h3>
                <p className="text-sm text-white/70">Registro de fin de visita</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-500 mb-4">
            Se registró automáticamente la hora actual. Puede ajustarla si es necesario.
          </p>

          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Hora de salida del sitio
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-4 text-2xl font-bold text-center border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (time) onConfirm(time)
            }}
            disabled={!time}
            className="flex-1 py-3.5 rounded-xl bg-green-500 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            Confirmar y enviar
          </button>
        </div>
      </div>
    </div>
  )
}
