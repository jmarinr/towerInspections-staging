import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, X, ChevronDown, ChevronRight, Camera, MapPin, Calendar, User2, CheckCircle2, AlertTriangle, XCircle, Minus, Clock, Eye } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta, normalizeFormCode } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload, groupAssetsBySection, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'
import { downloadMaintenancePdf } from '../utils/pdf/maintenancePdf'
import { downloadGroundingPdf } from '../utils/pdf/groundingPdf'
import { downloadPMExecutedPdf } from '../utils/pdf/pmExecutedPdf'
import { downloadSafetyPdf } from '../utils/pdf/safetyPdf'

// ── Score Ring SVG ─────────────────────────────────────────────
function ScoreRing({ good, regular, bad, total, size = 56 }) {
  if (!total) return null
  const r = (size - 6) / 2, c = 2 * Math.PI * r
  const pGood = good / total, pReg = regular / total, pBad = bad / total
  const score = Math.round((good / total) * 100)
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative animate-score-pop" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22C55E" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pGood)} strokeLinecap="round" className="score-ring" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F59E0B" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pReg)} strokeLinecap="round" className="score-ring"
          style={{ transform: `rotate(${pGood * 360}deg)`, transformOrigin: '50% 50%' }} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EF4444" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pBad)} strokeLinecap="round" className="score-ring"
          style={{ transform: `rotate(${(pGood + pReg) * 360}deg)`, transformOrigin: '50% 50%' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  )
}

// ── Mini status dot ────────────────────────────────────────────
function StatusDot({ value }) {
  const v = String(value || '').toLowerCase()
  if (v.includes('bueno') || v.includes('ejecutada')) return <span className="w-2.5 h-2.5 rounded-full bg-good shadow-ring-good" title="Bueno" />
  if (v.includes('regular')) return <span className="w-2.5 h-2.5 rounded-full bg-warn shadow-ring-warn" title="Regular" />
  if (v.includes('malo')) return <span className="w-2.5 h-2.5 rounded-full bg-bad shadow-ring-bad" title="Malo" />
  if (v.includes('n/a')) return <span className="w-2.5 h-2.5 rounded-full bg-na" title="N/A" />
  if (v.includes('pendiente')) return <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse" title="Pendiente" />
  return <span className="w-2 h-2 rounded-full bg-slate-200" />
}

function StatusBadge({ value }) {
  const v = String(value || '').toLowerCase()
  const label = String(value || '').replace(/^[^\s]+\s/, '')
  if (v.includes('bueno') || v.includes('ejecutada')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-good/10 text-good"><CheckCircle2 size={10}/>{label}</span>
  if (v.includes('regular')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warn/10 text-warn"><AlertTriangle size={10}/>{label}</span>
  if (v.includes('malo')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bad/10 text-bad"><XCircle size={10}/>{label}</span>
  if (v.includes('n/a')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400"><Minus size={10}/>N/A</span>
  if (v.includes('pendiente')) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400"><Clock size={10}/>Pendiente</span>
  return <span className="text-[11px] text-slate-500">{value || '—'}</span>
}

// ── Photo gallery ──────────────────────────────────────────────
function PhotoGallery({ photos }) {
  const [zoom, setZoom] = useState(null)
  if (!photos?.length) return null
  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {photos.map(p => (
          <button key={p.id} onClick={() => setZoom(p)} className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-card hover:shadow-elevated hover:scale-105 transition-all bg-slate-100">
            <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {zoom && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoom(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoom(null)} className="absolute -top-10 right-0 text-white/60 hover:text-white"><X size={22}/></button>
            <img src={zoom.public_url} alt={zoom.label} className="w-full rounded-xl shadow-elevated" />
            {zoom.label && <div className="text-center mt-2 text-white/80 text-[13px]">{zoom.label}</div>}
            <a href={zoom.public_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-center gap-1 text-white/40 hover:text-white text-xs"><ExternalLink size={11}/>Original</a>
          </div>
        </div>
      )}
    </>
  )
}

// ── Section Card (expandable) ─────────────────────────────────
function SectionCard({ title, data, photos, index }) {
  const [open, setOpen] = useState(true)
  const isCL = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isTbl = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !isCL
  const isFld = data && typeof data === 'object' && !Array.isArray(data)

  // Stats for this section
  let sGood = 0, sReg = 0, sBad = 0, sTotal = 0
  if (isCL) {
    data.forEach(it => {
      if (!it['Estado']) return; sTotal++
      const st = String(it['Estado']).toLowerCase()
      if (st.includes('bueno') || st.includes('ejecutada')) sGood++
      else if (st.includes('regular')) sReg++
      else if (st.includes('malo')) sBad++
    })
  }

  const hv = isCL && data.some(i => i['Valor'])
  const ho = isCL && data.some(i => i['Observación'])
  const photoCount = photos?.length || 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card animate-slide-up" style={{ animationDelay: `${index * 40}ms` }}>
      {/* Header — always visible */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-slate-800">{title}</div>
          {isCL && sTotal > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">{data.slice(0, 20).map((it, i) => <StatusDot key={i} value={it['Estado']} />)}{data.length > 20 && <span className="text-[9px] text-slate-400 ml-1">+{data.length-20}</span>}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCL && sTotal > 0 && <ScoreRing good={sGood} regular={sReg} bad={sBad} total={sTotal} size={40} />}
          {photoCount > 0 && <span className="flex items-center gap-1 text-[10px] text-accent font-medium"><Camera size={11}/>{photoCount}</span>}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Content — collapsible */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          {isCL && (
            <div className="space-y-1">
              {data.map((it, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                  <StatusDot value={it['Estado']} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-700">{it['Ítem'] || it['Pregunta'] || it['Actividad'] || '—'}</div>
                    {it['Observación'] && <div className="text-[10px] text-slate-400 mt-0.5 italic">{it['Observación']}</div>}
                    {it['Valor'] && <div className="text-[10px] text-accent font-mono mt-0.5">{it['Valor']}</div>}
                  </div>
                  <StatusBadge value={it['Estado']} />
                </div>
              ))}
            </div>
          )}

          {isTbl && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-[12px]">
                <thead><tr className="bg-slate-50 border-b border-slate-200">{Object.keys(data[0]).map(k => <th key={k} className="text-left px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase">{k}</th>)}</tr></thead>
                <tbody>{data.map((r, i) => <tr key={i} className="border-b border-slate-50 last:border-0">{Object.values(r).map((v, j) => <td key={j} className="px-3 py-1.5 text-slate-600">{v != null ? String(v) : '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}

          {isFld && (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data).filter(([,v]) => v != null && v !== '' && v !== '—').map(([l,v]) => (
                <div key={l} className="bg-slate-50 rounded-lg px-3 py-2">
                  <dt className="text-[10px] text-slate-400 font-medium">{l}</dt>
                  <dd className="text-[13px] text-slate-800 font-medium mt-0.5 break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          <PhotoGallery photos={photos} />
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function SubmissionDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useSubmissionsStore((s) => s.loadDetail)
  const clearDetail = useSubmissionsStore((s) => s.clearDetail)
  const submission = useSubmissionsStore((s) => s.activeSubmission)
  const assets = useSubmissionsStore((s) => s.activeAssets)
  const isLoading = useSubmissionsStore((s) => s.isLoadingDetail)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => { if (submissionId) loadDetail(submissionId); return () => clearDetail() }, [submissionId])

  const handlePdf = async () => {
    if (!submission) return; setPdfLoading(true)
    try {
      const fc = normalizeFormCode(submission.form_code)
      if (fc === 'preventive-maintenance') await downloadMaintenancePdf(submission)
      else if (fc === 'grounding-system-test') await downloadGroundingPdf(submission, assets)
      else if (fc === 'executed-maintenance') await downloadPMExecutedPdf(submission, assets)
      else if (fc === 'safety-system') await downloadSafetyPdf(submission, assets)
      else await downloadSubmissionPdf(submission, assets)
    } catch (e) { console.error('PDF error:', e) }
    setPdfLoading(false)
  }

  const photosBySection = useMemo(() => (!assets?.length || !submission) ? {} : groupAssetsBySection(assets, submission.form_code), [assets, submission])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>
  if (!submission) return <div className="text-center py-20 text-[13px] text-slate-400">No encontrado. <button onClick={() => navigate('/submissions')} className="text-accent hover:underline">Volver</button></div>

  const meta = getFormMeta(submission.form_code)
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)
  const totalPhotos = assets.filter(a => a.public_url).length
  const fin = submission.finalized || isFinalized(submission)
  const who = extractSubmittedBy(submission)
  const visitId = submission.site_visit_id
  const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

  // Global stats
  let totalItems = 0, bueno = 0, regular = 0, malo = 0, pendiente = 0
  for (const sec of Object.values(cleanPayload)) {
    if (!Array.isArray(sec)) continue
    for (const it of sec) { if (!it['Estado']) continue; totalItems++; const st = String(it['Estado']).toLowerCase(); if (st.includes('bueno') || st.includes('ejecutada')) bueno++; else if (st.includes('regular')) regular++; else if (st.includes('malo')) malo++; else if (st.includes('pendiente')) pendiente++ }
  }

  // Photo matching
  const findPhotos = (title) => {
    if (photosBySection[title]) return photosBySection[title]
    const c = title.replace(/^[^\w]*/, '').trim().toLowerCase()
    for (const [k, p] of Object.entries(photosBySection)) { const kc = k.replace(/^[^\w]*/, '').trim().toLowerCase(); if (kc.includes(c) || c.includes(kc)) return p }
    return null
  }
  const matched = new Set()
  const entries = Object.entries(cleanPayload)
  for (const [t] of entries) { const p = findPhotos(t); if (p) for (const [k, v] of Object.entries(photosBySection)) { if (v === p) matched.add(k) } }
  const unmatched = Object.entries(photosBySection).filter(([k]) => !matched.has(k)).flatMap(([, p]) => p)

  const globalScore = totalItems > 0 ? Math.round((bueno / totalItems) * 100) : null
  const Icon = meta.icon

  return (
    <div className="space-y-4">
      {/* Back + PDF */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-[13px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"><ArrowLeft size={15}/> Volver</button>
        <button onClick={handlePdf} disabled={pdfLoading} className="h-8 px-3.5 text-[12px] font-semibold bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-[0.97] shadow-card">
          <Download size={13}/>{pdfLoading ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>

      {/* ── HERO CARD ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4">
          {/* Score ring */}
          <div className="flex-shrink-0">
            {globalScore !== null ? (
              <ScoreRing good={bueno} regular={regular} bad={malo} total={totalItems} size={64} />
            ) : (
              <div className={`w-14 h-14 rounded-xl ${meta.color} text-white flex items-center justify-center`}><Icon size={22}/></div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">{site.nombreSitio || 'Sin nombre'}</h1>
              {fin ? <span className="text-[10px] font-semibold text-good bg-good/10 px-2 py-0.5 rounded-full">Completado</span>
                   : <span className="text-[10px] font-semibold text-warn bg-warn/10 px-2 py-0.5 rounded-full">Borrador</span>}
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5">{meta.label}</div>
            {/* Quick stats */}
            {totalItems > 0 && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-good"/> <b className="text-good">{bueno}</b> <span className="text-slate-400">bueno</span></span>
                <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-warn"/> <b className="text-warn">{regular}</b> <span className="text-slate-400">regular</span></span>
                <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-bad"/> <b className="text-bad">{malo}</b> <span className="text-slate-400">malo</span></span>
                {pendiente > 0 && <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-slate-300"/> <b>{pendiente}</b> <span className="text-slate-400">pendiente</span></span>}
                <span className="text-[10px] text-slate-300 ml-auto">{totalItems} ítems</span>
              </div>
            )}
            {/* Progress bar */}
            {totalItems > 0 && (
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2 flex">
                {bueno > 0 && <div className="h-full bg-good transition-all" style={{ width: `${(bueno/totalItems)*100}%` }} />}
                {regular > 0 && <div className="h-full bg-warn transition-all" style={{ width: `${(regular/totalItems)*100}%` }} />}
                {malo > 0 && <div className="h-full bg-bad transition-all" style={{ width: `${(malo/totalItems)*100}%` }} />}
              </div>
            )}
          </div>
        </div>

        {/* Meta chips */}
        <div className="px-5 pb-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-slate-500">
          <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400"/>{site.idSitio || '—'}</span>
          <span className="flex items-center gap-1"><User2 size={12} className="text-slate-400"/>{who?.name || '—'}</span>
          <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400"/>{inspMeta.date || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—')}</span>
          <span className="flex items-center gap-1"><Camera size={12} className="text-slate-400"/>{totalPhotos} foto{totalPhotos !== 1 ? 's' : ''}</span>
          {submission.app_version && <span className="text-slate-400">v{submission.app_version}</span>}
        </div>

        {hasOrder && (
          <div className="px-5 pb-3">
            <Link to={`/orders/${visitId}`} className="inline-flex items-center gap-1.5 text-[12px] text-accent font-medium hover:underline"><Eye size={12}/>Ver visita completa<ChevronRight size={10}/></Link>
          </div>
        )}
      </div>

      {/* ── SECTION CARDS ──────────────────────────────────────── */}
      {entries.map(([t, d], i) => <SectionCard key={t} title={t} data={d} photos={findPhotos(t)} index={i} />)}

      {entries.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-[13px] text-slate-400 shadow-card">Sin datos de formulario</div>
      )}

      {/* Unmatched photos */}
      {unmatched.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
          <div className="flex items-center gap-2 mb-2"><Camera size={14} className="text-accent"/><span className="text-[13px] font-semibold text-slate-800">Otras fotos</span><span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{unmatched.length}</span></div>
          <PhotoGallery photos={unmatched} />
        </div>
      )}
    </div>
  )
}
