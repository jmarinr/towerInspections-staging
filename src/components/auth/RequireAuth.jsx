import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../hooks/useAppStore'
import { supabase } from '../../lib/supabaseClient'
import { getDeviceId } from '../../lib/deviceId'

const POLL_INTERVAL    = 5 * 60 * 1000  // 5 min fallback poll
const POLL_INITIAL     = 30 * 1000      // 30s fallback first check

export default function RequireAuth() {
  const session  = useAppStore((s) => s.session)
  const logout   = useAppStore((s) => s.logout)
  const location = useLocation()
  const channelRef  = useRef(null)
  const timerRef    = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!session?.userId) return

    const deviceId = getDeviceId()

    const handleDisplaced = () => {
      console.warn('[SessionWatch] displaced — logging out immediately')
      useAppStore.setState({ displacedByDevice: true })
      setTimeout(() => {
        useAppStore.getState().logout({ clearDevice: false })
      }, 100)
    }

    // ── 1. Realtime subscription — instant detection ──────────────────────
    const channel = supabase
      .channel(`session-watch-${session.userId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'app_users',
          filter: `id=eq.${session.userId}`,
        },
        (payload) => {
          const newDevice = payload.new?.active_device_id
          console.log(`[SessionWatch] realtime update — active=${newDevice?.slice(0,8)} mine=${deviceId.slice(0,8)}`)
          if (newDevice && newDevice !== deviceId) {
            handleDisplaced()
          }
        }
      )
      .subscribe((status) => {
        console.log('[SessionWatch] realtime status:', status)
      })

    channelRef.current = channel

    // ── 2. Polling fallback — in case WebSocket drops ─────────────────────
    const pollCheck = async () => {
      if (!navigator.onLine) return
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('active_device_id')
          .eq('id', session.userId)
          .maybeSingle()

        if (error || !data) return
        const activeDevice = data.active_device_id
        console.log(`[SessionWatch] poll — mine=${deviceId.slice(0,8)} active=${activeDevice?.slice(0,8)}`)
        if (activeDevice && activeDevice !== deviceId) {
          handleDisplaced()
        }
      } catch (e) {
        console.warn('[SessionWatch] poll error:', e?.message)
      }
    }

    timerRef.current    = setTimeout(pollCheck, POLL_INITIAL)
    intervalRef.current = setInterval(pollCheck, POLL_INTERVAL)

    console.log('[SessionWatch] started — deviceId:', deviceId.slice(0,8))

    return () => {
      supabase.removeChannel(channelRef.current)
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [session?.userId])

  if (!session) {
    const displaced = useAppStore.getState().displacedByDevice
    return <Navigate to="/login" replace state={{ from: location.pathname, displaced }} />
  }

  return <Outlet />
}
