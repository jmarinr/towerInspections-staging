import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'
import { getFormMeta, normalizeFormCode } from '../data/formTypes'
import { isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useOrdersStore((s) => s.loadDetail)
  const clearDetail = useOrdersStore((s) => s.clearDetail)
  const order = useOrdersStore((s) => s.activeOrder)
  const submissions = useOrdersStore((s) => s.activeOrderSubmissions)
  const isLoading = useOrdersStore((s) => s.isLoadingDetail)

  useEffect(() => { if (orderId) loadDetail(orderId); return () => clearDetail() }, [orderId])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>
  if (!order) return <div className="text-center py-20 text-sm text-gray-400">Visita no encontrada. <button onClick={() => navigate('/orders')} className="text-accent hover:underline">Volver</button></div>

  const open = order.status === 'open'
  const finalized = submissions.filter(s => s.finalized || isFinalized(s)).length
  const totalPhotos = submissions.reduce((n, s) => n + (s.assets || []).filter(a => a.public_url).length, 0)
  const gps = order.start_lat && order.start_lng ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : null

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"><ArrowLeft size={15} /> Volver</button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-semibold text-gray-900">{order.order_number}</h1>
          <span className={`inline-flex items-center gap-1.5 text-2xs font-medium ${open ? 'text-success' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-success' : 'bg-gray-300'}`} />
            {open ? 'Abierta' : 'Cerrada'}
          </span>
        </div>
        <div className="text-sm text-gray-500">{order.site_name}</div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div><span className="text-gray-400">ID Sitio</span> <span className="text-gray-700 ml-1">{order.site_id}</span></div>
        <div><span className="text-gray-400">Inspector</span> <span className="text-gray-700 ml-1">{order.inspector_name || order.inspector_username || '—'}</span></div>
        <div><span className="text-gray-400">Inicio</span> <span className="text-gray-700 ml-1">{order.started_at ? new Date(order.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
        {gps && <div><span className="text-gray-400">GPS</span> <span className="text-gray-700 ml-1">{gps}</span></div>}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-600"><b className="text-gray-900">{submissions.length}</b> formularios</span>
        <span className="text-gray-600"><b className="text-success">{finalized}</b> completados</span>
        <span className="text-gray-600"><b className="text-gray-900">{totalPhotos}</b> fotos</span>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Form list */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Formularios</h2>
        {submissions.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {submissions.map((sub, i) => {
              const fc = normalizeFormCode(sub.form_code) || sub.form_code
              const m = getFormMeta(fc); const fin = sub.finalized || isFinalized(sub)
              const who = extractSubmittedBy(sub); const photos = (sub.assets || []).filter(a => a.public_url)
              const d = sub.updated_at ? new Date(sub.updated_at) : null
              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{m.label}</div>
                    <div className="text-2xs text-gray-400 mt-0.5">
                      {who?.name || '—'}
                      {d && <> · {d.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</>}
                      {photos.length > 0 && <> · {photos.length} foto{photos.length !== 1 ? 's' : ''}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fin ? <span className="text-2xs font-medium text-success">Completado</span>
                         : <span className="text-2xs font-medium text-warning">Borrador</span>}
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  {/* Inline photo thumbnails */}
                  {photos.length > 0 && (
                    <div className="hidden sm:flex gap-1 flex-shrink-0">
                      {photos.slice(0, 4).map(p => (
                        <div key={p.id} className="w-8 h-8 rounded overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={p.public_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {photos.length > 4 && <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-2xs text-gray-500">+{photos.length - 4}</div>}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-400">Sin formularios aún</div>
        )}
      </div>
    </div>
  )
}
