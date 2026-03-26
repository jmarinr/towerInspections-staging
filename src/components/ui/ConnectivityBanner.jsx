import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useAppStore } from '../../hooks/useAppStore'

export default function ConnectivityBanner() {
  const isOnline = useAppStore((s) => s.isOnline)
  const setOnline = useAppStore((s) => s.setOnline)
  const [showReconnected, setShowReconnected] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
      }
    }
    const goOffline = () => {
      setOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [setOnline, wasOffline])

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold z-[200]">
        <WifiOff size={14} strokeWidth={2.5} />
        <span>Sin conexión — los datos se guardan localmente</span>
      </div>
    )
  }

  if (showReconnected) {
    return (
      <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold z-[200]">
        <Wifi size={14} strokeWidth={2.5} />
        <span>Conexión recuperada — sincronizando datos</span>
      </div>
    )
  }

  return null
}
