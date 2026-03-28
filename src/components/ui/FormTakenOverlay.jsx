import { useNavigate } from 'react-router-dom'

/**
 * FormTakenOverlay — shown when another inspector took this form while editing.
 * Full-screen fixed overlay with two options: read-only or go back to order.
 */
export default function FormTakenOverlay({ takenBy, formRoute }) {
  const navigate = useNavigate()

  if (!takenBy) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-amber-500 px-5 pt-5 pb-6 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
            ⚡
          </div>
          <h3 className="text-base font-extrabold text-white">
            Formulario reasignado
          </h3>
          <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
            <span className="font-bold">{takenBy}</span> tomó este formulario mientras lo editabas.
            Tus cambios sin guardar se perdieron.
          </p>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-2">
          <button
            onClick={() => navigate(formRoute)}
            className="w-full py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-bold active:scale-[0.98] transition-all"
          >
            👁 Ver en solo lectura
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl bg-gray-900 text-white text-sm font-bold active:scale-[0.98] transition-all"
          >
            Volver a la orden
          </button>
        </div>

      </div>
    </div>
  )
}
