import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getFormMeta } from '../../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload } from '../../lib/payloadUtils'

const C = {
  primary: rgb(15/255, 42/255, 74/255),
  accent: rgb(255/255, 147/255, 79/255),
  text: rgb(11/255, 18/255, 32/255),
  textLight: rgb(100/255, 110/255, 130/255),
  border: rgb(220/255, 225/255, 235/255),
  white: rgb(1, 1, 1),
}

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = 44
const CONTENT_W = PAGE.width - MARGIN * 2
const LINE_GAP = 4

const isImageString = (v) => {
  if (typeof v !== 'string') return false
  const s = v.toLowerCase()
  return s.startsWith('data:image/') || (s.startsWith('http') && /\.(jpg|jpeg|png|webp)/.test(s))
}

const safeLabel = (key) => {
  if (!key) return ''
  return String(key).replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().replace(/^\w/, c => c.toUpperCase())
}

const asText = (v) => {
  if (v == null) return '—'
  if (v === '__photo__') return '(foto subida)'
  if (typeof v === 'string') return v || '—'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

const fetchBytes = async (url) => {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch { return null }
}

const guessExt = (url) => {
  const s = String(url).toLowerCase()
  if (s.includes('png')) return 'png'
  return 'jpg'
}

export async function generateSubmissionPdf(submission, assets = []) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - MARGIN
  let pageNum = 1

  const drawFooter = () => {
    page.drawText(`PTI Inspect · Informe de Inspección · Pág. ${pageNum}`, {
      x: MARGIN, y: 18, size: 7, font, color: C.textLight,
    })
    const dateStr = new Date().toLocaleString()
    page.drawText(dateStr, {
      x: PAGE.width - MARGIN - font.widthOfTextAtSize(dateStr, 7), y: 18, size: 7, font, color: C.textLight,
    })
  }

  drawFooter()

  const newPage = () => {
    page = pdfDoc.addPage([PAGE.width, PAGE.height])
    y = PAGE.height - MARGIN
    pageNum++
    drawFooter()
  }

  const ensureSpace = (needed) => {
    if (y - needed < MARGIN + 25) newPage()
  }

  const wrapLines = (text, size, maxWidth, f = font) => {
    const words = String(text).split(/\s+/).filter(Boolean)
    const lines = []
    let cur = ''
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(cand, size) <= maxWidth) { cur = cand }
      else {
        if (cur) lines.push(cur)
        if (f.widthOfTextAtSize(w, size) > maxWidth) {
          let ch = ''
          for (const c of w) { if (f.widthOfTextAtSize(ch + c, size) <= maxWidth) ch += c; else { lines.push(ch); ch = c } }
          cur = ch
        } else { cur = w }
      }
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ['']
  }

  const drawText = (text, { size = 10, bold = false, indent = 0, color = C.text } = {}) => {
    const x = MARGIN + indent
    const mw = CONTENT_W - indent
    const f = bold ? fontBold : font
    const lines = wrapLines(text, size, mw, f)
    for (const line of lines) {
      ensureSpace(size + LINE_GAP)
      page.drawText(line, { x, y: y - size, size, font: f, color })
      y -= size + LINE_GAP
    }
  }

  const drawLine = (thickness = 0.5, color = C.border) => {
    ensureSpace(10)
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.width - MARGIN, y }, thickness, color })
    y -= 10
  }

  // ===== HEADER =====
  const headerH = 78
  page.drawRectangle({ x: 0, y: PAGE.height - headerH, width: PAGE.width, height: headerH, color: C.primary })
  page.drawRectangle({ x: 0, y: PAGE.height - headerH, width: PAGE.width, height: 3, color: C.accent })

  const meta = getFormMeta(submission?.form_code)
  page.drawText('PTI Inspect', { x: MARGIN, y: PAGE.height - 32, size: 20, font: fontBold, color: C.white })
  page.drawText('Informe de Inspección', { x: MARGIN, y: PAGE.height - 48, size: 10, font, color: rgb(1, 1, 1) })
  page.drawText(meta.label, { x: MARGIN, y: PAGE.height - 63, size: 9, font: fontBold, color: C.accent })

  y = PAGE.height - headerH - 18

  // ===== SITE INFO =====
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)

  drawText(site.nombreSitio, { size: 15, bold: true })
  drawText(`Sitio: ${site.idSitio}  ·  Formulario: ${submission?.form_code || '—'}`, { size: 9, color: C.textLight })
  if (site.proveedor !== '—') drawText(`Proveedor: ${site.proveedor}`, { size: 9, color: C.textLight })
  drawText(`Device: ${submission?.device_id || '—'}  ·  App v${submission?.app_version || '?'}`, { size: 8, color: C.textLight })
  if (inspMeta.date) drawText(`Fecha: ${inspMeta.date}  ·  Hora: ${inspMeta.time || '—'}`, { size: 8, color: C.textLight })
  drawText(`Creado: ${submission?.created_at ? new Date(submission.created_at).toLocaleString() : '—'}  ·  Actualizado: ${submission?.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'}`, { size: 8, color: C.textLight })
  y -= 4
  drawLine(1, C.accent)

  // ===== STRUCTURED DATA (Clean) =====
  drawText('Datos de la inspección', { size: 13, bold: true })
  y -= 4

  for (const [sectionTitle, sectionData] of Object.entries(cleanPayload)) {
    drawText(sectionTitle.toUpperCase(), { size: 9, bold: true, color: C.accent })
    y -= 2
    if (sectionData && typeof sectionData === 'object') {
      renderObject(sectionData, 0)
    }
    y -= 4
  }

  const renderValue = (key, value, indent = 0) => {
    const label = safeLabel(key)
    if (isImageString(value)) { drawText(`${label}: (ver fotos)`, { size: 9, indent, color: C.textLight }); return }
    if (value === '__photo__') { drawText(`${label}: (foto subida)`, { size: 9, indent, color: C.textLight }); return }

    if (Array.isArray(value)) {
      drawText(`${label}:`, { size: 9, bold: true, indent })
      if (!value.length) { drawText('(vacío)', { size: 9, indent: indent + 12, color: C.textLight }); return }
      value.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          drawText(`▸ Item ${idx + 1}`, { size: 9, bold: true, indent: indent + 12 })
          renderObject(item, indent + 24)
        } else if (!isImageString(item)) {
          drawText(`▸ ${asText(item)}`, { size: 9, indent: indent + 12 })
        }
      })
      return
    }

    if (value && typeof value === 'object') {
      drawText(`${label}:`, { size: 9, bold: true, indent })
      renderObject(value, indent + 12)
      return
    }

    drawText(`${label}: ${asText(value)}`, { size: 9, indent })
  }

  const renderObject = (obj, indent = 0) => {
    const keys = Object.keys(obj || {})
    if (!keys.length) { drawText('—', { size: 9, indent, color: C.textLight }); return }
    for (const k of keys) renderValue(k, obj[k], indent)
  }

  // ===== PHOTOS =====
  const photoUrls = assets.filter(a => a.public_url).map(a => ({ url: a.public_url, label: a.asset_type || 'foto' }))
  if (photoUrls.length) {
    drawLine(1, C.accent)
    drawText('Evidencia fotográfica', { size: 13, bold: true })
    drawText(`Total: ${photoUrls.length} fotos`, { size: 9, color: C.textLight })
    y -= 4

    for (let i = 0; i < photoUrls.length; i++) {
      const { url, label } = photoUrls[i]
      const bytes = await fetchBytes(url)
      if (!bytes) {
        drawText(`Foto ${i + 1} (${label}): No se pudo cargar`, { size: 8, color: C.textLight })
        continue
      }

      let img
      try {
        const ext = guessExt(url)
        img = ext === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
      } catch {
        drawText(`Foto ${i + 1} (${label}): Formato no soportado`, { size: 8, color: C.textLight })
        continue
      }

      const maxW = CONTENT_W
      const maxH = 240
      const { width, height } = img.scale(1)
      const scale = Math.min(maxW / width, maxH / height)
      const w = width * scale
      const h = height * scale

      ensureSpace(h + 30)
      drawText(`Foto ${i + 1}: ${label}`, { size: 9, bold: true })
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h })
      y -= h + 8
    }
  }

  return await pdfDoc.save()
}

export async function downloadSubmissionPdf(submission, assets = []) {
  const bytes = await generateSubmissionPdf(submission, assets)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const siteInfo = (submission?.payload?.data?.siteInfo || submission?.payload?.data?.formData || {})
  const filename = `${submission?.form_code || 'informe'}_${siteInfo.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
