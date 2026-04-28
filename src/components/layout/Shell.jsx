import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FolderOpen, LogOut, RefreshCw, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/orders', icon: FolderOpen, label: 'Visitas' },
  { to: '/submissions', icon: ClipboardList, label: 'Formularios' },
]

export default function Shell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const load = useSubmissionsStore((s) => s.load)
  const [mob, setMob] = useState(false)
  const refresh = () => load(true)
  const title = location.pathname.startsWith('/dashboard') ? 'Inicio' : location.pathname.startsWith('/orders') ? 'Visitas' : location.pathname.startsWith('/submissions') ? 'Formularios' : ''
  const lnk = (a) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${a ? 'bg-accent/10 text-accent font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`

  return (
    <div className="min-h-[100dvh] bg-surface">
      {/* DESKTOP */}
      <div className="hidden lg:flex min-h-[100dvh]">
        <aside className="w-[200px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center"><span className="text-white font-bold text-[9px]">PTI</span></div>
            <div><div className="text-[13px] font-semibold text-slate-900">TeleInspect</div><div className="text-[10px] text-slate-400">Auditoría</div></div>
          </div>
          <nav className="px-2 flex-1 space-y-0.5 mt-1">
            {NAV.map(n => <NavLink key={n.to} to={n.to} className={({isActive}) => lnk(isActive)}><n.icon size={16} strokeWidth={1.8}/>{n.label}</NavLink>)}
          </nav>
          <div className="px-2 pb-3 border-t border-slate-100 pt-2 mt-1 mx-2 space-y-0.5">
            <div className="px-3 py-1 text-[11px] text-slate-400 truncate">{user?.name || 'Usuario'}</div>
            <button onClick={refresh} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"><RefreshCw size={13}/>Actualizar</button>
            <button onClick={() => { logout(); navigate('/login') }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><LogOut size={13}/>Salir</button>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 border-b border-slate-200 px-6 flex items-center justify-between bg-white flex-shrink-0">
            <span className="text-[13px] font-medium text-slate-800">{title}</span>
            <button onClick={refresh} className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-50"><RefreshCw size={13}/></button>
          </header>
          <main className="flex-1 overflow-y-auto"><div className="max-w-[1100px] mx-auto px-6 py-5 animate-fade-in">{children}</div></main>
        </div>
      </div>
      {/* MOBILE */}
      <div className="lg:hidden flex flex-col min-h-[100dvh]">
        <header className="h-11 border-b border-slate-200 px-4 flex items-center justify-between bg-white sticky top-0 z-50">
          <div className="flex items-center gap-2"><button onClick={() => setMob(true)} className="p-1 text-slate-500"><Menu size={18}/></button><span className="text-[13px] font-medium text-slate-800">{title}</span></div>
          <button onClick={refresh} className="p-1.5 text-slate-400"><RefreshCw size={13}/></button>
        </header>
        <main className="flex-1 px-4 py-4 pb-16 animate-fade-in">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 grid grid-cols-3 z-50">
          {NAV.map(n => <NavLink key={n.to} to={n.to} className={({isActive}) => `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive ? 'text-accent' : 'text-slate-400'}`}><n.icon size={17} strokeWidth={1.8}/>{n.label}</NavLink>)}
        </nav>
        {mob && <div className="fixed inset-0 z-[60]"><div className="absolute inset-0 bg-black/30" onClick={() => setMob(false)}/><aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col animate-slide-in shadow-lg">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center"><span className="text-white font-bold text-[8px]">PTI</span></div><span className="text-[13px] font-semibold">TeleInspect</span></div><button onClick={() => setMob(false)} className="text-slate-400"><X size={18}/></button></div>
          <nav className="px-2 pt-2 flex-1 space-y-0.5">{NAV.map(n => <NavLink key={n.to} to={n.to} onClick={() => setMob(false)} className={({isActive}) => lnk(isActive)}><n.icon size={16}/>{n.label}</NavLink>)}</nav>
          <div className="px-3 pb-4 border-t border-slate-100 pt-2 mx-2"><button onClick={() => { logout(); navigate('/login'); setMob(false) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-400 hover:text-red-600"><LogOut size={15}/>Salir</button></div>
        </aside></div>}
      </div>
    </div>
  )
}
