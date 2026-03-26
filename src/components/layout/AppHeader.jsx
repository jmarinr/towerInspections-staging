import { useEffect, useRef, useState } from 'react'

const IS_SANDBOX = import.meta.env.VITE_SANDBOX === 'true'
import { ChevronLeft, Info, LogOut, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../hooks/useAppStore'

export default function AppHeader({ title, subtitle, badge, progress, onMenuClick }) {
  const navigate = useNavigate()
  const storeLogout = useAppStore((s) => s.logout)
  const activeVisit = useAppStore((s) => s.activeVisit)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (ev) => {
      if (!open) return
      if (menuRef.current && !menuRef.current.contains(ev.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const logout = () => {
    storeLogout()
    setOpen(false)
    navigate('/login', { replace: true })
  }

  const runExtra = () => {
    setOpen(false)
    if (typeof onMenuClick === 'function') onMenuClick()
  }

  return (
    <header className="bg-primary sticky top-0 z-50">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        <button onClick={() => navigate('/')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all flex-shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-[17px] font-bold text-white truncate">{title}</h1>
            {IS_SANDBOX && (
              <span className="bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0">
                sandbox
              </span>
            )}
          </div>
          <div className="text-[11px] sm:text-xs text-white/70 flex items-center gap-2 flex-wrap">
            <span className="truncate">{subtitle}</span>
            {badge && <span className="bg-accent px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0">{badge}</span>}
            {activeVisit?.order_number && (
              <span className="bg-white/15 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-white/90 flex-shrink-0">
                {activeVisit.order_number}
              </span>
            )}
          </div>
        </div>
        <div className="relative flex-shrink-0 z-[200]" ref={menuRef}>
          <button onClick={() => setOpen((v) => !v)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all">
            <MoreVertical size={20} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[300]">
              <button
                type="button"
                onClick={logout}
                className="w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100"
              >
                <LogOut size={18} className="text-gray-500" />
                Cerrar sesión
              </button>

              {typeof onMenuClick === 'function' && (
                <button
                  type="button"
                  onClick={runExtra}
                  className="w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100"
                >
                  <Info size={18} className="text-gray-500" />
                  Información
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {progress !== undefined && (
        <div className="px-3 sm:px-4 py-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-white text-sm font-bold min-w-[40px] text-right">{progress}%</span>
          </div>
        </div>
      )}
    </header>
  )
}
