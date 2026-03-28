/**
 * useFormOwnershipWatch — v2.5.97
 * Polls Supabase every 15s while inside a form to detect if another inspector
 * took ownership of this form. Returns { takenBy } when ownership changed.
 *
 * Also acts as guard: triggerAutosave blocks if takenBy is set.
 */
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from './useAppStore'
import { fetchVisitAssignments } from '../lib/siteVisitService'

export function useFormOwnershipWatch(formCode) {
  const session     = useAppStore((s) => s.session)
  const activeVisit = useAppStore((s) => s.activeVisit)
  const formAssignments = useAppStore((s) => s.formAssignments)
  const setFormAssignments = useAppStore((s) => s.setFormAssignments)

  const [takenBy, setTakenBy] = useState(null)
  const intervalRef = useRef(null)
  const lastVersionRef = useRef(null)

  useEffect(() => {
    if (!formCode || !activeVisit?.id || !session?.username) return
    if (String(activeVisit.id).startsWith('local-')) return

    // Initialize from current assignments
    const current = formAssignments?.[formCode]
    lastVersionRef.current = current?.assignmentVersion ?? 0

    const poll = async () => {
      if (!navigator.onLine) return
      try {
        const submissions = await fetchVisitAssignments(activeVisit.id)
        const submission = submissions.find((s) => s.form_code === formCode)
        if (!submission) return

        const newVersion = submission.assignment_version ?? 0
        const newOwner   = submission.assigned_to

        // Check if assignment changed since we started editing
        if (newVersion > lastVersionRef.current) {
          lastVersionRef.current = newVersion
          if (newOwner && newOwner !== session.username) {
            // Someone else took this form while we were editing
            setTakenBy(newOwner)
            // Update global assignments map
            setFormAssignments({
              ...(useAppStore.getState().formAssignments || {}),
              [formCode]: {
                ...(useAppStore.getState().formAssignments?.[formCode] || {}),
                assignedTo: newOwner,
                assignmentVersion: newVersion,
              }
            })
          }
        }
      } catch (_) {}
    }

    // Poll every 15 seconds
    intervalRef.current = setInterval(poll, 15000)
    return () => clearInterval(intervalRef.current)
  }, [formCode, activeVisit?.id, session?.username])

  return { takenBy }
}
