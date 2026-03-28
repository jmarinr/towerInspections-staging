import { MapPin, Calendar } from 'lucide-react'
import { useFormOwnershipWatch } from '../../hooks/useFormOwnershipWatch'
import FormTakenOverlay from '../ui/FormTakenOverlay'

/**
 * Minimal read-only meta line for all forms.
 * Shows: Fecha/Hora de inicio + GPS.
 *
 * v2.5.97: accepts formCode to activate ownership watch.
 * When another inspector takes this form while editing, shows an overlay.
 *
 * Props:
 *   meta      — { date, time, lat, lng }
 *   formCode  — canonical Supabase form_code (e.g. 'mantenimiento')
 *   formRoute — route to view the form in read-only (e.g. '/intro/mantenimiento')
 */
export default function FormMetaBar({ meta, formCode, formRoute }) {
  const { takenBy } = useFormOwnershipWatch(formCode)

  const hasDt  = !!meta?.date && !!meta?.time
  const hasGps = typeof meta?.lat === 'number' && typeof meta?.lng === 'number'
  const gpsText = hasGps
    ? `${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`
    : 'pendiente'

  return (
    <>
      {/* Ownership-lost overlay */}
      <FormTakenOverlay takenBy={takenBy} formRoute={formRoute || '/'} />

      {meta && (
        <div className="mb-4">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={16} className="text-gray-500" />
              <span className="font-semibold">Inicio:</span>
              <span className="text-gray-600">{hasDt ? `${meta.date} ${meta.time}` : 'pendiente'}</span>
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
      )}
    </>
  )
}
