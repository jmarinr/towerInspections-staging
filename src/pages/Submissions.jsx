import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

export default function Submissions() {
  const load = useSubmissionsStore((s) => s.load)
  const isLoading = useSubmissionsStore((s) => s.isLoading)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search = useSubmissionsStore((s) => s.search)
  const setFilter = useSubmissionsStore((s) => s.setFilter)
  const getFiltered = useSubmissionsStore((s) => s.getFiltered)
  const navigate = useNavigate()
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered(), [submissions, filterFormCode, search])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })} placeholder="Buscar…"
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow bg-white" />
        </div>
        <select value={filterFormCode} onChange={e => setFilter({ filterFormCode: e.target.value })}
          className="h-8 px-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
          <option value="all">Todos los tipos</option>
          {Object.entries(FORM_TYPES).map(([c, m]) => <option key={c} value={c}>{m.label}</option>)}
        </select>
        <span className="text-2xs text-gray-400 hidden sm:block tabular-nums whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={16} /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Sitio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Inspector</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden lg:table-cell">Fecha</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Estado</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const m = getFormMeta(sub.form_code); const site = extractSiteInfo(sub); const who = extractSubmittedBy(sub)
                const fin = sub.finalized || isFinalized(sub); const d = sub.updated_at ? new Date(sub.updated_at) : null
                return (
                  <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors group" onClick={() => navigate(`/submissions/${sub.id}`)}>
                    <td className="px-3 py-2.5 text-sm text-gray-900 font-medium">{m.shortLabel}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-gray-700">{site.nombreSitio}</div>
                      {site.idSitio && <div className="text-2xs text-gray-400">ID: {site.idSitio}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{who?.name || '—'}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">{d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {fin ? <span className="text-2xs font-medium text-success">Completado</span>
                           : <span className="text-2xs font-medium text-warning">Borrador</span>}
                    </td>
                    <td className="pr-3"><ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">{search || filterFormCode !== 'all' ? 'Sin resultados. Ajusta los filtros.' : 'Sin formularios aún.'}</div>
      )}
    </div>
  )
}
