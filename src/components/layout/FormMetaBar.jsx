import { MapPin, Calendar, Eye } from 'lucide-react'
import { useEffect } from 'react'
import { useAppStore } from '../../hooks/useAppStore'
import { useFormOwnershipWatch } from '../../hooks/useFormOwnershipWatch'
import FormTakenOverlay from '../ui/FormTakenOverlay'

/**
 * FormMetaBar — v2.6.3
 * Shared meta bar for all forms. Shows start datetime + GPS.
 *
 * When formCode is provided:
 * - Activates ownership watch (detects if another inspector takes the form)
 * - Shows read-only banner when form is not writable
 * - Blocks all field interactions via pointer-events on parent <main>
 */
export default function FormMetaBar({ meta, formCode, formRoute }) {
  const { takenBy } = useFormOwnershipWatch(formCode)
  const isFormWritable = useAppStore((s) => s.isFormWritable)
  const formAssignments = useAppStore((s) => s.formAssignments)

  const writable = formCode ? isFormWritable(formCode) : true
  const assignment = formCode ? formAssignments?.[formCode] : null
  const assignedTo = assignment?.assignedTo

  // Block or unblock the parent <main> container via data attribute + CSS
  useEffect(() => {
    if (!formCode) return
    const main = document.querySelector('main')
    if (!main) return
    if (!writable) {
      main.setAttribute('data-readonly', 'true')
    } else {
      main.removeAttribute('data-readonly')
    }
    return () => main?.removeAttribute('data-readonly')
  }, [writable, formCode])

  const hasDt  = !!meta?.date && !!meta?.time
  const hasGps = typeof meta?.lat === 'number' && typeof meta?.lng === 'number'
  const gpsText = hasGps
    ? `${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`
    : 'pendiente'

  return (
    <>
      {/* Ownership-lost overlay */}
      <FormTakenOverlay takenBy={takenBy} formRoute={formRoute || '/'} />

      {/* Read-only mode banner */}
      {!writable && assignedTo && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Eye size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Modo solo lectura</p>
            <p className="text-xs text-amber-700 truncate">
              {assignedTo} está editando este formulario
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-200 text-amber-700 flex-shrink-0">
            LECTURA
          </span>
        </div>
      )}

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
