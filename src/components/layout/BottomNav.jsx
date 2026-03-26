import { ChevronLeft, ChevronRight, Home, FileText, Clock, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BottomNav({
  onPrev,
  onNext,
  onBack, // compat
  prevLabel = 'Anterior',
  nextLabel = 'Siguiente',
  showPrev = true,
  showNext = true,
  prevDisabled = false,
  nextDisabled = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const handlePrev = onPrev ?? onBack

  const tabs = [
    { id: 'home', icon: Home, label: 'Inicio', path: '/' },
    { id: 'forms', icon: FileText, label: 'Formularios', path: '/' },
    { id: 'history', icon: Clock, label: 'Historial', path: null },
    { id: 'profile', icon: User, label: 'Perfil', path: null },
  ]

  const activeTab = (() => {
    const p = location.pathname
    if (p === '/' || p.startsWith('/intro')) return 'forms'
    if (p.startsWith('/inspeccion') || p.startsWith('/mantenimiento') || p.startsWith('/inventario') || p.startsWith('/sistema-ascenso') || p.startsWith('/grounding')) return 'forms'
    return 'home'
  })()

  const buttonBase = 'flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-[15px] transition-all'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex gap-2 sm:gap-3 p-3 sm:p-4">
        {showPrev && (
          <button
            onClick={handlePrev}
            disabled={!handlePrev || prevDisabled}
            className={`${buttonBase} bg-gray-100 text-gray-700 active:scale-95 ${(!handlePrev || prevDisabled) ? 'opacity-50 active:scale-100' : ''}`}
          >
            <ChevronLeft size={18} />
            <span className="truncate">{prevLabel}</span>
          </button>
        )}
        {showNext && (
          <button
            onClick={onNext}
            disabled={!onNext || nextDisabled}
            className={`${buttonBase} bg-primary text-white active:scale-95 ${(!onNext || nextDisabled) ? 'opacity-50 active:scale-100' : ''}`}
          >
            <span className="truncate">{nextLabel}</span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="flex border-t border-gray-100 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.path) navigate(tab.path)
                else alert('Próximamente')
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-all min-w-0 ${isActive ? 'text-primary' : 'text-gray-400'}`}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${isActive ? 'bg-primary/10 text-primary' : ''}`}>
                <Icon size={20} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold truncate max-w-full px-1">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
