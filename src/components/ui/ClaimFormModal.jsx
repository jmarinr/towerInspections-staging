import { useState } from 'react'
import { useAppStore } from '../../hooks/useAppStore'
import { claimFormRPC } from '../../lib/siteVisitService'

/**
 * ClaimFormModal — Bottom sheet for taking a free form or reassigning an occupied one.
 * Props:
 *   isOpen       {boolean}
 *   onClose      {function}
 *   mode         {'take'|'reassign'}
 *   formCode     {string}  canonical form_code e.g. 'mantenimiento'
 *   formTitle    {string}
 *   currentOwner {string|null}  username of current assignee (for reassign mode)
 *   submissionId {string}  UUID of the submission row
 *   currentVersion {number} assignment_version client currently has
 *   onSuccess    {function} called after successful claim with updated assignment
 */
export default function ClaimFormModal({
  isOpen, onClose, mode = 'take',
  formCode, formTitle, currentOwner, submissionId, currentVersion = 0,
  onSuccess,
}) {
  const session = useAppStore((s) => s.session)
  const showToast = useAppStore((s) => s.showToast)
  const updateFormAssignment = useAppStore((s) => s.updateFormAssignment)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const isReassign = mode === 'reassign'

  const handleConfirm = async () => {
    if (loading) return
    setLoading(true)

    // Free form: no submission row exists yet in DB.
    // Just proceed — triggerAutosave will create it with assigned_to on first save.
    if (!submissionId) {
      const newAssignment = {
        assignedTo: session.username,
        assignmentVersion: 1,
        assignedAt: new Date().toISOString(),
        submissionId: null,
      }
      updateFormAssignment(formCode, newAssignment)
      showToast('Formulario tomado. Puedes empezar a documentar.', 'success')
      setLoading(false)
      onSuccess?.(newAssignment)
      onClose()
      return
    }

    // Occupied form: use atomic RPC to claim/reassign
    try {
      const claimed = await claimFormRPC(submissionId, session.username, currentVersion)
      if (claimed) {
        const newAssignment = {
          assignedTo: session.username,
          assignmentVersion: (currentVersion ?? 0) + 1,
          assignedAt: new Date().toISOString(),
          submissionId,
        }
        updateFormAssignment(formCode, newAssignment)
        showToast(
          isReassign ? 'Formulario reasignado. Ahora puedes editarlo.' : 'Formulario tomado. Puedes empezar a documentar.',
          'success'
        )
        onSuccess?.(newAssignment)
        onClose()
      } else {
        showToast('Otro inspector tomó este formulario al mismo tiempo. Recarga la lista.', 'warning')
        onClose()
      }
    } catch (e) {
      console.error('[ClaimFormModal] claimFormRPC failed', e)
      showToast('Error al tomar el formulario. Verifica tu conexión.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative bg-white w-full rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header row */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
            isReassign ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            {isReassign ? '⚡' : '📋'}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              {isReassign ? 'Reasignarme formulario' : 'Tomar formulario'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{formTitle}</p>
          </div>
        </div>

        {/* Warning for reassign */}
        {isReassign && currentOwner && (
          <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">{currentOwner}</span> pasará a modo solo lectura.
            Los datos que guardó <span className="font-bold">se conservan</span> — continuarás desde donde los dejó.
          </div>
        )}

        {/* Info rows */}
        <div className="mx-5 mb-5 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
            <span className="text-xs text-gray-500">Estado actual</span>
            {currentOwner
              ? <span className="text-xs font-bold text-amber-600">{currentOwner} editando</span>
              : <span className="text-xs font-bold text-green-600">✅ Libre</span>
            }
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
            <span className="text-xs text-gray-500">Se asignará a</span>
            <span className="text-xs font-bold text-gray-900">{session?.name || session?.username} · tú</span>
          </div>
          {!isReassign && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-gray-500">Datos previos</span>
              <span className="text-xs font-bold text-gray-500">
                {currentOwner ? 'Hereda datos del anterior' : 'Formulario vacío'}
              </span>
            </div>
          )}
          {isReassign && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-gray-500">Progreso heredado</span>
              <span className="text-xs font-bold text-gray-900">Sí — continuarás desde donde quedó</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-8 space-y-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
              isReassign ? 'bg-amber-600' : 'bg-green-600'
            }`}
          >
            {loading
              ? 'Procesando...'
              : isReassign
              ? 'Confirmar — reasignarme'
              : 'Confirmar — tomar formulario'
            }
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
