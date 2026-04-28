import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowUpRight, TrendingUp, ClipboardList, FolderOpen, Camera } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function Stat({ icon: Icon, label, value, sub, color = 'bg-slate-100 text-slate-600' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">{label}</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
          {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={14}/></div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const load = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)
  useEffect(() => { load(); loadStats() }, [])

  if (isLoading || !stats) return <div className="flex items-center justify-center py-20"><Spinner size={16}/></div>
  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={ClipboardList} label="Formularios" value={total} color="bg-accent/10 text-accent" />
        <Stat icon={TrendingUp} label="Última semana" value={recentCount} sub="enviados" />
        <Stat icon={FolderOpen} label="Visitas activas" value={openVisits || 0} sub={`de ${totalVisits || 0}`} color="bg-good/10 text-good" />
        <Stat icon={Camera} label="Último envío" value={recent?.[0] ? new Date(recent[0].updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* By type */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-[13px] font-semibold text-slate-800">Por tipo</h2></div>
          <div className="p-2">
            {Object.entries(byFormCode).sort((a,b)=>b[1]-a[1]).map(([code, count]) => {
              const m = getFormMeta(code); const I = m.icon
              return (
                <Link key={code} to={`/submissions?filter=${code}`} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md ${m.color} text-white flex items-center justify-center`}><I size={11}/></div>
                    <span className="text-[12px] text-slate-700">{m.shortLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-slate-900 tabular-nums">{count}</span>
                    <ChevronRight size={11} className="text-slate-300 group-hover:text-accent transition-colors"/>
                  </div>
                </Link>
              )
            })}
            {!Object.keys(byFormCode).length && <div className="py-6 text-center text-[12px] text-slate-400">Sin datos</div>}
          </div>
        </div>

        {/* Recent */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-slate-800">Actividad reciente</h2>
            <Link to="/submissions" className="text-[10px] text-accent font-medium hover:underline flex items-center gap-0.5">Todo<ArrowUpRight size={9}/></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(recent || []).slice(0, 8).map(sub => {
              const m = getFormMeta(sub.form_code); const I = m.icon; const site = extractSiteInfo(sub); const who = extractSubmittedBy(sub); const fin = sub.finalized || isFinalized(sub)
              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors group">
                  <div className={`w-7 h-7 rounded-md ${m.color} text-white flex items-center justify-center flex-shrink-0`}><I size={11}/></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-slate-800 truncate">{site.nombreSitio} <span className="text-slate-400 font-normal">· {m.shortLabel}</span></div>
                    <div className="text-[10px] text-slate-400">{who?.name || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fin ? <span className="text-[9px] font-semibold text-good bg-good/10 px-1.5 py-0.5 rounded-full">Completado</span>
                         : <span className="text-[9px] font-semibold text-warn bg-warn/10 px-1.5 py-0.5 rounded-full">Borrador</span>}
                    <ChevronRight size={12} className="text-slate-300 group-hover:text-accent transition-colors"/>
                  </div>
                </Link>
              )
            })}
            {(!recent || !recent.length) && <div className="py-10 text-center text-[12px] text-slate-400">Sin actividad</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
