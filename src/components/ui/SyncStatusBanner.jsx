/**
 * SyncStatusBanner.jsx
 * Muestra un banner SOLO cuando hay fotos pendientes de sincronizar.
 * Cuando no hay pendientes → no renderiza nada (invisible, sin impacto en UI).
 *
 * Reglas:
 * - Se monta en Home.jsx después del collaboration banner
 * - Usa getPendingAssetsDetail() de supabaseSync — solo lectura de localStorage
 * - Botón "Reintentar" llama a flushSupabaseQueues()
 * - Refresca el conteo cada 5s mientras está montado
 * - No modifica ningún store ni estado global existente
 */
import { useState, useEffect, useCallback } from 'react'
import { CloudOff, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { getPendingAssetsDetail, flushSupabaseQueues } from '../../lib/supabaseSync'

// Etiquetas legibles por formCode
const FORM_LABELS = {
  'additional-photo-report':   'Additional Photo Report',
  'mantenimiento':             'Preventive Maintenance',
  'mantenimiento-ejecutado':   'Maintenance Executed',
  'equipment-v2':              'Equipment Inventory',
  'sistema-ascenso':           'Safety Climbing Device',
  'grounding-system-test':     'Grounding System Test',
  'puesta-tierra':             'Grounding System Test',
  'inspeccion':                'Inspección General',
}

function formLabel(code) {
  return FORM_LABELS[code] || code
}

function timeAgo(ts) {
  if (!ts || !isFinite(ts)) return null
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function SyncStatusBanner() {
  const [detail,    setDetail]    = useState([])
  const [expanded,  setExpanded]  = useState(false)
  const [retrying,  setRetrying]  = useState(false)

  // Leer la cola — se refresca cada 5s
  const refresh = useCallback(() => {
    setDetail(getPendingAssetsDetail())
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  // Si no hay pendientes → no mostrar nada
  const totalPending = detail.reduce((s, d) => s + d.count, 0)
  if (totalPending === 0) return null

  const oldestTs  = detail.reduce((min, d) => d.oldest < min ? d.oldest : min, Infinity)
  const agoLabel  = timeAgo(oldestTs)

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      await flushSupabaseQueues()
    } catch (_) {}
    // Esperar 1s para que el flush tenga tiempo de actualizar el localStorage
    setTimeout(() => {
      refresh()
      setRetrying(false)
    }, 1200)
  }

  return (
    <div className="mx-4 mt-3 rounded-xl overflow-hidden"
      style={{ border: '1px solid #fbbf24', background: '#fffbeb' }}>

      {/* ── Cabecera del banner ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <CloudOff size={16} className="flex-shrink-0" style={{ color: '#d97706' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: '#92400e' }}>
            {totalPending} foto{totalPending !== 1 ? 's' : ''} pendiente{totalPending !== 1 ? 's' : ''} de sincronizar
          </p>
          {agoLabel && (
            <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#a16207' }}>
              <Clock size={10} />
              Último intento: {agoLabel}
            </p>
          )}
        </div>

        {/* Botón reintentar */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying || !navigator.onLine}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition-opacity disabled:opacity-50"
          style={{ background: '#d97706', color: '#fff' }}>
          <RefreshCw size={11} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Subiendo…' : 'Reintentar'}
        </button>

        {/* Toggle detalle */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="p-1 flex-shrink-0"
          style={{ color: '#a16207' }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* ── Detalle expandible ── */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 space-y-2"
          style={{ borderTop: '1px solid #fde68a' }}>
          {!navigator.onLine && (
            <p className="text-[11px] font-semibold mt-2" style={{ color: '#dc2626' }}>
              ⚠️ Sin conexión a internet — conecta y pulsa Reintentar
            </p>
          )}
          {detail.map(d => (
            <div key={d.formCode}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg"
              style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
              <span className="text-[12px] font-semibold" style={{ color: '#92400e' }}>
                {formLabel(d.formCode)}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#d97706', color: '#fff' }}>
                {d.count} foto{d.count !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
          <p className="text-[11px] mt-1" style={{ color: '#a16207' }}>
            Asegúrate de tener conexión y permanece en la app mientras se sincronizan.
          </p>
        </div>
      )}
    </div>
  )
}
