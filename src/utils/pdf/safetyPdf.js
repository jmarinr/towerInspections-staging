/**
 * PTI TeleInspect - Safety Climbing Device (Sistema de Ascenso) PDF Report
 * Page 1: Header, site info, Herrajes, Prensacables, Tramos, Certificacion data
 * Page 2: Photo evidence in pairs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

const C = {
  black: rgb(0.1, 0.1, 0.1), red: rgb(0.9, 0, 0), white: rgb(1, 1, 1),
  gray: rgb(0.94, 0.94, 0.94), border: rgb(0.75, 0.75, 0.75),
  text: rgb(0.12, 0.12, 0.12), textLight: rgb(0.45, 0.45, 0.45),
}
const PW = 612, PH = 792, ML = 36, MR = 36, MT = 36, MB = 36, CW = PW - ML - MR

async function fetchImg(doc, url) {
  try {
    const r = await fetch(url); if (!r.ok) return null
    const b = new Uint8Array(await r.arrayBuffer())
    if (b[0]===0xFF&&b[1]===0xD8) return await doc.embedJpg(b)
    if (b[0]===0x89&&b[1]===0x50) return await doc.embedPng(b)
    try { return await doc.embedJpg(b) } catch { try { return await doc.embedPng(b) } catch { return null } }
  } catch { return null }
}

export async function generateSafetyPdf(submission, assets = []) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  let logo = null
  try { logo = await doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))) } catch {}

  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const meta = inner?.meta || {}
  const sections = data
  const datos = sections.datos || sections.formData || data
  const herrajes = sections.herrajes || {}
  const prensacables = sections.prensacables || {}
  const tramos = sections.tramos || {}
  const platinas = sections.platinas || {}
  const certificacion = sections.certificacion || {}

  const v = (key) => {
    for (const s of [datos, herrajes, prensacables, tramos, platinas, certificacion, data]) {
      if (s?.[key] && !String(s[key]).startsWith('data:') && s[key] !== '__photo__' && s[key] !== '__photo_uploaded__') return String(s[key])
    }
    return ''
  }

  const statusLabel = (val) => {
    if (!val) return ''
    const s = String(val).toLowerCase()
    if (s === 'bueno' || s === 'good') return 'Bueno'
    if (s === 'regular') return 'Regular'
    if (s === 'malo' || s === 'bad') return 'Mal'
    return val
  }

  // Photo map
  const photoMap = {}
  for (const a of (assets || [])) { if (a.public_url && a.asset_type) photoMap[a.asset_type] = a.public_url }

  // ── PAGE 1 ────────────────────────────────────────────────────
  let page = doc.addPage([PW, PH])
  let y = PH - MT

  // Header
  page.drawRectangle({ x: ML, y: y - 18, width: CW, height: 18, color: C.black })
  page.drawText('PHOENIX TOWER INTERNATIONAL', { x: ML + 6, y: y - 13, size: 9, font: fontB, color: C.white })
  y -= 20
  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.red })
  page.drawText('REPORTE DE SISTEMA DE ASCENSO', { x: ML + 6, y: y - 11, size: 7, font: fontB, color: C.white })
  y -= 16

  // Logo row
  const lrH = 38
  page.drawRectangle({ x: ML, y: y - lrH, width: CW, height: lrH, borderColor: C.border, borderWidth: 0.5 })
  if (logo) { const ld = logo.scale(0.16); page.drawImage(logo, { x: ML + 6, y: y - lrH + 6, width: Math.min(ld.width, 100), height: Math.min(ld.height, 30) }) }
  page.drawText('Proveedor:', { x: ML + 115, y: y - 14, size: 7, font: fontB, color: C.text })
  page.drawText(v('proveedor'), { x: ML + 170, y: y - 14, size: 7, font, color: C.text })
  page.drawText('Tipo de Visita', { x: ML + 115, y: y - 30, size: 7, font: fontB, color: C.text })
  page.drawText(v('tipoVisita'), { x: ML + 180, y: y - 30, size: 7, font, color: C.text })
  page.drawRectangle({ x: ML, y: y - lrH - 1.5, width: CW, height: 1.5, color: C.red })
  y -= lrH + 4

  // ESTADO FISICO title
  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('ESTADO FISICO', { x: ML + CW / 2 - 30, y: y - 11, size: 7, font: fontB, color: C.text })
  y -= 16

  // Site info fields
  const fRow = (l1, v1, l2, v2) => {
    const h = 13, half = CW / 2
    page.drawRectangle({ x: ML, y: y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawLine({ start: { x: ML + half, y }, end: { x: ML + half, y: y - h }, thickness: 0.5, color: C.border })
    page.drawText(l1, { x: ML + 4, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    page.drawText(String(v1 || ''), { x: ML + 4 + fontB.widthOfTextAtSize(l1, 6.5) + 3, y: y - h + 4, size: 6.5, font, color: C.text })
    page.drawText(l2, { x: ML + half + 4, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    page.drawText(String(v2 || ''), { x: ML + half + 4 + fontB.widthOfTextAtSize(l2, 6.5) + 3, y: y - h + 4, size: 6.5, font, color: C.text })
    y -= h
  }

  fRow('ID Sitio:', v('idSitio'), 'Altura (Mts):', v('altura'))
  fRow('Nombre Sitio:', v('nombreSitio'), 'Tipo Sitio:', v('tipoSitio'))
  fRow('Fecha Inicio:', meta.startedAt || '', 'Tipo Estructura:', v('tipoEstructura'))
  fRow('Fecha Termino:', meta.endedAt || '', 'Latitud:', meta.lat || '')
  fRow('Direccion:', v('direccion'), 'Longitud:', meta.lng || '')

  y -= 8

  // SECTION 1: HERRAJES
  const secH = 14
  page.drawRectangle({ x: ML, y: y - secH, width: CW * 0.6, height: secH, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('1   HERRAJES', { x: ML + 4, y: y - secH + 4, size: 7, font: fontB, color: C.text })
  y -= secH + 2

  const fRow2 = (l1, v1, l2, v2) => {
    const h = 13, qw = CW * 0.6 / 2
    page.drawRectangle({ x: ML, y: y - h, width: CW * 0.6, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(l1, { x: ML + 4, y: y - h + 4, size: 6, font, color: C.text })
    page.drawText(statusLabel(v1), { x: ML + 85, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    if (l2) {
      page.drawText(l2, { x: ML + qw + 4, y: y - h + 4, size: 6, font, color: C.text })
      page.drawText(String(v2 || ''), { x: ML + qw + 100, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    }
    y -= h
  }

  fRow2('HERRAJE INFERIOR', herrajes.herrajeInferior, 'DIAMETRO DEL CABLE', herrajes.diametroCable)
  fRow2('HERRAJE SUPERIOR', herrajes.herrajeSuperior, 'ESTADO DEL CABLE', statusLabel(herrajes.estadoCable))

  // Comment box
  if (herrajes.comentarioHerrajeInferior || herrajes.comentarioCable) {
    const comment = herrajes.comentarioHerrajeInferior || herrajes.comentarioCable || ''
    page.drawRectangle({ x: ML, y: y - 24, width: CW * 0.6, height: 24, borderColor: C.border, borderWidth: 0.5 })
    page.drawText('Comentario', { x: ML + 4, y: y - 8, size: 5, font: fontB, color: C.textLight })
    page.drawText(String(comment).slice(0, 100), { x: ML + 10, y: y - 20, size: 6, font, color: C.text })
    y -= 26
  }

  y -= 6

  // SECTION 2: PRENSACABLES
  page.drawRectangle({ x: ML, y: y - secH, width: CW * 0.6, height: secH, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('2   PRENSACABLES', { x: ML + 4, y: y - secH + 4, size: 7, font: fontB, color: C.text })
  page.drawText(prensacables.prensacableInferior === 'actual' ? 'ACTUAL' : 'N/A', { x: ML + 130, y: y - secH + 4, size: 6.5, font, color: C.text })
  y -= secH + 2

  const fRowSingle = (l, val) => {
    const h = 13
    page.drawRectangle({ x: ML, y: y - h, width: CW * 0.35, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(l, { x: ML + 4, y: y - h + 4, size: 6, font, color: C.text })
    page.drawText(String(val || ''), { x: ML + 100, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    y -= h
  }

  fRowSingle('CANTIDAD', prensacables.cantidadPrensacables)
  fRowSingle('DISTANCIAMIENTO', prensacables.distanciamiento)
  fRowSingle('ESTADO', statusLabel(prensacables.estadoPrensacables))

  if (prensacables.comentarioPrensacables) {
    page.drawRectangle({ x: ML, y: y - 24, width: CW * 0.6, height: 24, borderColor: C.border, borderWidth: 0.5 })
    page.drawText('Comentario', { x: ML + 4, y: y - 8, size: 5, font: fontB, color: C.textLight })
    page.drawText(String(prensacables.comentarioPrensacables).slice(0, 100), { x: ML + 10, y: y - 20, size: 6, font, color: C.text })
    y -= 26
  }

  y -= 6

  // SECTION 3: TRAMOS
  page.drawRectangle({ x: ML, y: y - secH, width: CW * 0.6, height: secH, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('3   TRAMOS (escaleras)', { x: ML + 4, y: y - secH + 4, size: 7, font: fontB, color: C.text })
  page.drawText('ACTUAL', { x: ML + 150, y: y - secH + 4, size: 6.5, font, color: C.text })
  y -= secH + 2

  fRow2('CANTIDAD (tramos)', tramos.cantidadTramos, 'ESTADO ESCALERA', statusLabel(tramos.estadoEscalera))
  fRow2('CANTIDAD (uniones)', tramos.cantidadUniones, 'TRAMOS DANADOS', tramos.tramosDanados || 'No')
  fRowSingle('DIAMETRO TORNILLO', tramos.diametroTornillo)

  if (tramos.comentarioEscalera) {
    page.drawRectangle({ x: ML, y: y - 24, width: CW * 0.6, height: 24, borderColor: C.border, borderWidth: 0.5 })
    page.drawText('Comentario', { x: ML + 4, y: y - 8, size: 5, font: fontB, color: C.textLight })
    page.drawText(String(tramos.comentarioEscalera).slice(0, 100), { x: ML + 10, y: y - 20, size: 6, font, color: C.text })
    y -= 26
  }

  y -= 6

  // SECTION: CERTIFICACION
  page.drawRectangle({ x: ML, y: y - secH, width: CW * 0.6, height: secH, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('2   CERTIFICACION', { x: ML + 4, y: y - secH + 4, size: 7, font: fontB, color: C.text })
  page.drawText('ACTUAL', { x: ML + 130, y: y - secH + 4, size: 6.5, font, color: C.text })
  y -= secH + 2

  const certH = 13
  page.drawRectangle({ x: ML, y: y - certH, width: CW * 0.4, height: certH, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('SI', { x: ML + 20, y: y - certH + 4, size: 6.5, font, color: C.text })
  page.drawRectangle({ x: ML + 35, y: y - certH + 2, width: 12, height: 9, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('NO', { x: ML + 70, y: y - certH + 4, size: 6.5, font, color: C.text })
  page.drawRectangle({ x: ML + 85, y: y - certH + 2, width: 12, height: 9, borderColor: C.border, borderWidth: 0.5 })
  // Mark the appropriate box
  const certVal = certificacion.observacionCertificacion || ''
  if (certVal.toLowerCase().includes('si') || certVal.toLowerCase().includes('yes')) {
    page.drawText('X', { x: ML + 38, y: y - certH + 3, size: 7, font: fontB, color: C.text })
  } else {
    page.drawText('X', { x: ML + 88, y: y - certH + 3, size: 7, font: fontB, color: C.text })
  }
  y -= certH

  // Footer
  page.drawText('Phoenix Tower International -- Reporte de Sistema de Ascenso', { x: ML, y: 16, size: 5.5, font, color: C.textLight })

  // ── PAGE 2: PHOTOS ──────────────────────────────────────────
  page = doc.addPage([PW, PH])
  y = PH - MT

  // Mini header
  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.black })
  if (logo) { const ld = logo.scale(0.06); page.drawImage(logo, { x: ML + 4, y: y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) }) }
  page.drawText('PHOENIX TOWER INTERNATIONAL', { x: ML + 44, y: y - 10, size: 6.5, font: fontB, color: C.white })
  y -= 16
  page.drawRectangle({ x: ML, y: y - 9, width: CW, height: 9, color: C.red })
  page.drawText('REPORTE DE SISTEMA DE ASCENSO', { x: ML + 6, y: y - 7, size: 5.5, font: fontB, color: C.white })
  y -= 12

  // ESTADO FISICO
  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('ESTADO FISICO', { x: ML + CW / 2 - 30, y: y - 11, size: 7, font: fontB, color: C.text })
  y -= 18

  // Photo pairs
  const photoPairs = [
    ['HERRAJE INFERIOR', 'fotoHerrajeInferior', 'HERRAJE SUPERIOR', 'fotoHerrajeSuperior'],
    ['PRENSACABLE SUPERIOR', 'fotoPrensacableSuperior', 'PRENSACABLE INFERIOR', 'fotoPrensacableInferior'],
    ['TIPO DE CARRO', 'fotoCarro', 'OBSERVACION UNION (Tramos)', 'fotoUnionTramos'],
  ]

  // Safety photos use raw fieldId as asset_type
  const safetyPhotoIds = ['fotoEscalera', 'fotoCertificacion']
  // Build a combined map
  const allPhotos = { ...photoMap }

  for (const [lTitle, lId, rTitle, rId] of photoPairs) {
    const halfW = (CW - 8) / 2, hdrH = 16, photoH = 170

    // Left
    page.drawRectangle({ x: ML, y: y - hdrH, width: halfW, height: hdrH, color: C.black })
    page.drawText(lTitle, { x: ML + 6, y: y - hdrH + 4, size: 6.5, font: fontB, color: C.white })
    page.drawRectangle({ x: ML, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })
    
    const lUrl = allPhotos[lId]
    if (lUrl) {
      const img = await fetchImg(doc, lUrl)
      if (img) {
        const d = img.scale(1), sc = Math.min((halfW - 10) / d.width, (photoH - 10) / d.height)
        page.drawImage(img, { x: ML + (halfW - d.width * sc) / 2, y: y - hdrH - photoH + (photoH - d.height * sc) / 2, width: d.width * sc, height: d.height * sc })
      }
    }

    // Right
    const rx = ML + halfW + 8
    page.drawRectangle({ x: rx, y: y - hdrH, width: halfW, height: hdrH, color: C.black })
    page.drawText(rTitle, { x: rx + 6, y: y - hdrH + 4, size: 6.5, font: fontB, color: C.white })
    page.drawRectangle({ x: rx, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })

    const rUrl = allPhotos[rId]
    if (rUrl) {
      const img = await fetchImg(doc, rUrl)
      if (img) {
        const d = img.scale(1), sc = Math.min((halfW - 10) / d.width, (photoH - 10) / d.height)
        page.drawImage(img, { x: rx + (halfW - d.width * sc) / 2, y: y - hdrH - photoH + (photoH - d.height * sc) / 2, width: d.width * sc, height: d.height * sc })
      }
    }

    y -= hdrH + photoH + 10
  }

  // Observation text box at bottom
  if (certificacion.observacionCertificacion || herrajes.comentarioCable) {
    const obs = certificacion.observacionCertificacion || herrajes.comentarioCable || ''
    page.drawRectangle({ x: ML, y: y - 40, width: CW / 2 - 4, height: 40, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(String(obs).slice(0, 120), { x: ML + 6, y: y - 12, size: 6, font, color: C.text })
  }

  page.drawText('Phoenix Tower International -- Reporte de Sistema de Ascenso', { x: ML, y: 16, size: 5.5, font, color: C.textLight })

  return await doc.save()
}

export async function downloadSafetyPdf(submission, assets = []) {
  const bytes = await generateSafetyPdf(submission, assets)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const datos = d.datos || d.formData || d
  a.download = `ascenso_${datos.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
