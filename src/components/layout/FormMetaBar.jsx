import { MapPin, Calendar, Clock } from 'lucide-react'

/**
 * Minimal, consistent read-only meta line for all forms.
 * Shows: Fecha/Hora de inicio + GPS (lat,long) if available.
 */
export default function FormMetaBar({ meta }) {
  if (!meta) return null

  const { date, time, lat, lng } = meta
  const hasDt = !!date && !!time
  const hasGps = typeof lat === 'number' && typeof lng === 'number'

  const gpsText = hasGps ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'pendiente'

  return (
    <div className="mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar size={16} className="text-gray-500" />
          <span className="font-semibold">Inicio:</span>
          <span className="text-gray-600">{hasDt ? `${date} ${time}` : 'pendiente'}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={16} className="text-gray-500" />
          <span className="font-semibold">GPS:</span>
          <span className="text-gray-600">{gpsText}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Esta información se captura automáticamente al iniciar el formulario.
      </p>
    </div>
  )
}
