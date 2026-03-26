import { useNavigate } from 'react-router-dom'
import { CheckCircle, Lock } from 'lucide-react'

export default function FormLockedScreen({ title = 'Formulario' }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-1">Este formulario ha sido</p>
        <p className="text-base font-bold text-green-600 mb-6">Completado y finalizado</p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-6">
          <Lock size={13} />
          <span>No puede ser editado</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-all"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
