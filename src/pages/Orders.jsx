import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'

export default function Orders() {
  const load = useOrdersStore((s) => s.load)
  const isLoading = useOrdersStore((s) => s.isLoading)
  const orders = useOrdersStore((s) => s.orders)
  const filterStatus = useOrdersStore((s) => s.filterStatus)
  const search = useOrdersStore((s) => s.search)
  const setFilter = useOrdersStore((s) => s.setFilter)
  const getFiltered = useOrdersStore((s) => s.getFiltered)
  const navigate = useNavigate()
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered(), [orders, filterStatus, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })} placeholder="Buscar orden, sitio…"
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilter({ filterStatus: e.target.value })}
          className="h-8 px-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
          <option value="all">Todas</option><option value="open">Abiertas</option><option value="closed">Cerradas</option>
        </select>
        <span className="text-2xs text-gray-400 hidden sm:block tabular-nums whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={16} /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Orden</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Sitio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Inspector</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden lg:table-cell">Fecha</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Estado</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const d = o.started_at ? new Date(o.started_at) : null; const open = o.status === 'open'
                return (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors group" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="px-3 py-2.5 text-sm font-medium text-accent">{o.order_number}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-gray-700">{o.site_name}</div>
                      {o.site_id && <div className="text-2xs text-gray-400">ID: {o.site_id}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{o.inspector_name || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden lg:table-cell">{d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-2xs font-medium ${open ? 'text-success' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-success' : 'bg-gray-300'}`} />
                        {open ? 'Abierta' : 'Cerrada'}
                      </span>
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
        <div className="text-center py-16 text-sm text-gray-400">{search || filterStatus !== 'all' ? 'Sin resultados.' : 'Sin visitas aún.'}</div>
      )}
    </div>
  )
}
