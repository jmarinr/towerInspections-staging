/**
 * PTI TeleInspect - Grounding System Test PDF Report
 * Replicates the real PDF layout exactly:
 *   Page 1: Header, site info, conditions, warning, equipment, measurement table with photo, bar chart, summation
 *   Pages 2-3: Photo evidence (2 per row, black header bars, real photos from Supabase)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'
import { DIAGRAM_MAIN_B64, DIAGRAM_ALT_B64 } from './groundingDiagrams'

const C = {
  black: rgb(0.1, 0.1, 0.1),
  red: rgb(0.9, 0, 0),
  white: rgb(1, 1, 1),
  dark: rgb(0.18, 0.18, 0.18),
  gray: rgb(0.94, 0.94, 0.94),
  border: rgb(0.75, 0.75, 0.75),
  text: rgb(0.12, 0.12, 0.12),
  textLight: rgb(0.45, 0.45, 0.45),
  blue: rgb(0.2, 0.4, 0.7),
  goodBar: rgb(0.2, 0.65, 0.35),
}

const PW = 612, PH = 792, ML = 36, MR = 36, MT = 36, MB = 36
const CW = PW - ML - MR

const POINTS = [
  { id: 'rPataTorre', label: 'Pata de la torre', photoId: 'fotoPataTorre', photoLabel: 'MEDICION 1 CONEXION ELECTRODO POTENCIAL  (Pata de la torre)' },
  { id: 'rCerramiento', label: 'Cerramiento', photoId: 'fotoCerramiento', photoLabel: 'MEDICION 2 CONEXION ELECTRODO POTENCIAL  (Cerramiento)' },
  { id: 'rPorton', label: 'Porton', photoId: 'fotoPorton', photoLabel: 'MEDICION 3 CONEXION ELECTRODO POTENCIAL  (Porton)' },
  { id: 'rPararrayos', label: 'Pararrayos', photoId: 'fotoPararrayos', photoLabel: 'MEDICION 4 CONEXION ELECTRODO POTENCIAL  (Pararrayos)' },
  { id: 'rBarraSPT', label: 'Barra SPT', photoId: 'fotoBarraSPT', photoLabel: 'MEDICION 5 CONEXION ELECTRODO POTENCIAL  (Barra de SPT)' },
  { id: 'rEscalerilla1', label: 'Escalerilla', photoId: 'fotoEscalerilla1', photoLabel: 'MEDICION 6 CONEXION ELECTRODO POTENCIAL  (Escalerilla)' },
  { id: 'rEscalerilla2', label: 'Escalerilla', photoId: 'fotoEscalerilla2', photoLabel: 'MEDICION 7 CONEXION ELECTRODO POTENCIAL  (Escalerilla)' },
]

// ── Fetch image from URL and embed in PDF ──────────────────────
async function fetchAndEmbed(doc, url) {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const buf = await resp.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // Detect format
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) return await doc.embedJpg(bytes)
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes)
    // Try jpg first, then png
    try { return await doc.embedJpg(bytes) } catch { try { return await doc.embedPng(bytes) } catch { return null } }
  } catch { return null }
}

class GroundingPDF {
  constructor() { this.doc = null; this.page = null; this.font = null; this.fontBold = null; this.logo = null; this.y = 0; this.pageNum = 0 }

  async init() {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold)
    try { this.logo = await this.doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))) } catch { this.logo = null }
    try { this.diagramMain = await this.doc.embedPng(Uint8Array.from(atob(DIAGRAM_MAIN_B64), c => c.charCodeAt(0))) } catch { this.diagramMain = null }
    try { this.diagramAlt = await this.doc.embedPng(Uint8Array.from(atob(DIAGRAM_ALT_B64), c => c.charCodeAt(0))) } catch { this.diagramAlt = null }
  }

  newPage() { if (this.page) this._footer(); this.page = this.doc.addPage([PW, PH]); this.pageNum++; this.y = PH - MT }

  checkSpace(n) {
    if (this.y - n < MB) { this._footer(); this.page = this.doc.addPage([PW, PH]); this.pageNum++; this.y = PH - MT; this._miniHdr() }
  }

  _footer() {
    this.page.drawText('Phoenix Tower International -- Reporte de Sistema de Tierras', { x: ML, y: 16, size: 5.5, font: this.font, color: C.textLight })
    this.page.drawText(`Pagina ${this.pageNum}`, { x: PW - MR - this.font.widthOfTextAtSize(`Pagina ${this.pageNum}`, 5.5), y: 16, size: 5.5, font: this.font, color: C.textLight })
  }

  // ── HEADER ───────────────────────────────────────────────────
  drawHeader(d) {
    const x = ML
    this.page.drawRectangle({ x, y: this.y - 18, width: CW, height: 18, color: C.black })
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', { x: x + 6, y: this.y - 13, size: 9, font: this.fontBold, color: C.white })
    this.y -= 20
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.red })
    this.page.drawText('REPORTE DE SISTEMA DE TIERRAS', { x: x + 6, y: this.y - 11, size: 7, font: this.fontBold, color: C.white })
    this.y -= 16
    // Logo row
    const lrH = 42
    this.page.drawRectangle({ x, y: this.y - lrH, width: CW, height: lrH, borderColor: C.border, borderWidth: 0.5 })
    if (this.logo) { const ld = this.logo.scale(0.18); this.page.drawImage(this.logo, { x: x + 6, y: this.y - lrH + (lrH - Math.min(ld.height, 36)) / 2, width: Math.min(ld.width, 110), height: Math.min(ld.height, 36) }) }
    const fx = x + 130
    this.page.drawText('Proveedor:', { x: fx, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(d.proveedor || '', { x: fx + 55, y: this.y - 14, size: 7, font: this.font, color: C.text })
    this.page.drawText('Tipo de Visita:', { x: fx, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(d.tipoVisita || '', { x: fx + 65, y: this.y - 30, size: 7, font: this.font, color: C.text })
    this.page.drawText('Logo Proveedor', { x: x + CW - 60, y: this.y - 14, size: 6, font: this.font, color: C.textLight })
    this.page.drawRectangle({ x, y: this.y - lrH - 1.5, width: CW, height: 1.5, color: C.red })
    this.y -= lrH + 4
  }

  _miniHdr() {
    const x = ML
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.black })
    if (this.logo) { const ld = this.logo.scale(0.06); this.page.drawImage(this.logo, { x: x + 4, y: this.y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) }) }
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', { x: x + (this.logo ? 44 : 6), y: this.y - 10, size: 6.5, font: this.fontBold, color: C.white })
    this.y -= 16
    this.page.drawRectangle({ x, y: this.y - 9, width: CW, height: 9, color: C.red })
    this.page.drawText('REPORTE DE SISTEMA DE TIERRAS', { x: x + 6, y: this.y - 7, size: 5.5, font: this.fontBold, color: C.white })
    this.y -= 12
  }

  // ── Drawing helpers ───────────────────────────────────────────
  sectionTitle(t) {
    this.checkSpace(17)
    this.page.drawRectangle({ x: ML, y: this.y - 15, width: CW, height: 15, color: C.black })
    this.page.drawText(t.toUpperCase(), { x: ML + 6, y: this.y - 11, size: 7.5, font: this.fontBold, color: C.white })
    this.y -= 17
  }

  fieldRow2(l1, v1, l2, v2) {
    this.checkSpace(14)
    const x = ML, h = 13, half = CW / 2
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawLine({ start: { x: x + half, y: this.y }, end: { x: x + half, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawText(l1, { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(String(v1 || ''), { x: x + 4 + this.fontBold.widthOfTextAtSize(l1, 6.5) + 3, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    this.page.drawText(l2, { x: x + half + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(String(v2 || ''), { x: x + half + 4 + this.fontBold.widthOfTextAtSize(l2, 6.5) + 3, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    this.y -= h
  }

  // ── Photo pair (2 per row with black title bars) ──────────────
  async drawPhotoPair(leftTitle, leftImg, rightTitle, rightImg) {
    const photoH = 190
    this.checkSpace(photoH + 20)
    const x = ML, w = (CW - 8) / 2, hdrH = 16

    // Left box
    this.page.drawRectangle({ x, y: this.y - hdrH, width: w, height: hdrH, color: C.black })
    this.page.drawText(leftTitle, { x: x + 6, y: this.y - hdrH + 4, size: 6, font: this.fontBold, color: C.white })
    this.page.drawRectangle({ x, y: this.y - hdrH - photoH, width: w, height: photoH, borderColor: C.border, borderWidth: 0.5 })
    if (leftImg) {
      const dims = leftImg.scale(1)
      const scale = Math.min((w - 10) / dims.width, (photoH - 10) / dims.height)
      const iw = dims.width * scale, ih = dims.height * scale
      this.page.drawImage(leftImg, { x: x + (w - iw) / 2, y: this.y - hdrH - photoH + (photoH - ih) / 2, width: iw, height: ih })
    }

    // Right box
    const rx = x + w + 8
    if (rightTitle) {
      this.page.drawRectangle({ x: rx, y: this.y - hdrH, width: w, height: hdrH, color: C.black })
      this.page.drawText(rightTitle, { x: rx + 6, y: this.y - hdrH + 4, size: 6, font: this.fontBold, color: C.white })
      this.page.drawRectangle({ x: rx, y: this.y - hdrH - photoH, width: w, height: photoH, borderColor: C.border, borderWidth: 0.5 })
      if (rightImg) {
        const dims = rightImg.scale(1)
        const scale = Math.min((w - 10) / dims.width, (photoH - 10) / dims.height)
        const iw = dims.width * scale, ih = dims.height * scale
        this.page.drawImage(rightImg, { x: rx + (w - iw) / 2, y: this.y - hdrH - photoH + (photoH - ih) / 2, width: iw, height: ih })
      }
    }

    this.y -= hdrH + photoH + 8
  }

  // ── Measurement table ─────────────────────────────────────────
  drawMeasurementTable(data, obsPhoto) {
    this.checkSpace(18)
    const x = ML
    // Equipment header
    this.page.drawRectangle({ x, y: this.y - 12, width: CW, height: 12, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText('Los valores obtenidos en terreno se relacionan en la tabla siguiente:', { x: x + 4, y: this.y - 9, size: 6, font: this.font, color: C.text })
    this.y -= 14

    // Equipment row
    const eqH = 13
    this.page.drawRectangle({ x, y: this.y - eqH, width: CW, height: eqH, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText('Equipo de Medida:', { x: x + CW / 2 - 25, y: this.y - eqH + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.y -= eqH

    const eqH2 = 13, third = CW / 3
    this.page.drawRectangle({ x, y: this.y - eqH2, width: CW, height: eqH2, borderColor: C.border, borderWidth: 0.5 })
    ;[0, 1, 2].forEach(i => { if (i > 0) this.page.drawLine({ start: { x: x + third * i, y: this.y }, end: { x: x + third * i, y: this.y - eqH2 }, thickness: 0.5, color: C.border }) })
    this.page.drawText('Marca', { x: x + 4, y: this.y - eqH2 + 4, size: 6, font: this.fontBold, color: C.text })
    this.page.drawText(data.equipoMarca || '', { x: x + 30, y: this.y - eqH2 + 4, size: 6, font: this.font, color: C.text })
    this.page.drawText('Serial', { x: x + third + 4, y: this.y - eqH2 + 4, size: 6, font: this.fontBold, color: C.text })
    this.page.drawText(data.equipoSerial || '', { x: x + third + 30, y: this.y - eqH2 + 4, size: 6, font: this.font, color: C.text })
    this.page.drawText('Fecha de Calibracion', { x: x + third * 2 + 4, y: this.y - eqH2 + 4, size: 6, font: this.fontBold, color: C.text })
    this.page.drawText(data.equipoCalibracion || '', { x: x + third * 2 + 80, y: this.y - eqH2 + 4, size: 6, font: this.font, color: C.text })
    this.y -= eqH2 + 4

    // Main measurement table
    const colDist = 60, colElec = 130, colRes = 90
    const colObs = CW - colDist - colElec - colRes
    const cx = [x, x + colDist, x + colDist + colElec, x + colDist + colElec + colRes]

    // Table header
    const thH = 24
    this.page.drawRectangle({ x, y: this.y - thH, width: CW, height: thH, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    ;[1, 2, 3].forEach(i => this.page.drawLine({ start: { x: cx[i], y: this.y }, end: { x: cx[i], y: this.y - thH }, thickness: 0.5, color: C.border }))
    this.page.drawText('Distancia de', { x: x + 4, y: this.y - 9, size: 5.5, font: this.fontBold, color: C.text })
    this.page.drawText('Electrodo de', { x: x + 4, y: this.y - 16, size: 5.5, font: this.fontBold, color: C.text })
    this.page.drawText('Corriente [m]', { x: x + 4, y: this.y - 23, size: 5.5, font: this.fontBold, color: C.text })
    this.page.drawText('Electrodo de Potencial', { x: cx[1] + 15, y: this.y - 14, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText('Resistencia Medida', { x: cx[2] + 8, y: this.y - 9, size: 6, font: this.fontBold, color: C.text })
    this.page.drawText('Rg [ Ohm ]', { x: cx[2] + 20, y: this.y - 18, size: 6, font: this.fontBold, color: C.text })
    this.page.drawText('Observaciones y Fotos', { x: cx[3] + 10, y: this.y - 14, size: 6, font: this.fontBold, color: C.text })
    this.y -= thH

    // Rows with merged distance column
    const totalRowsH = POINTS.length * 15
    const rowH = 15

    // Distance value (merged vertically for all rows)  
    const dist = data.distanciaElectrodoCorriente || '50.0'

    // Calculate observation column height to fit photo
    const obsColH = totalRowsH
    
    POINTS.forEach((pt, i) => {
      const ry = this.y - (i * rowH)
      this.page.drawRectangle({ x, y: ry - rowH, width: CW, height: rowH, borderColor: C.border, borderWidth: 0.5 })
      ;[1, 2, 3].forEach(ci => this.page.drawLine({ start: { x: cx[ci], y: ry }, end: { x: cx[ci], y: ry - rowH }, thickness: 0.5, color: C.border }))

      // Distance (only first row text)
      if (i === 0) this.page.drawText(String(dist), { x: x + 15, y: ry - rowH + 4, size: 7, font: this.font, color: C.text })
      // Electrode
      this.page.drawText(pt.label, { x: cx[1] + 20, y: ry - rowH + 4, size: 7, font: this.font, color: C.text })
      // Resistance
      const val = data[pt.id] || '0'
      this.page.drawText(val + ' Ohm', { x: cx[2] + 20, y: ry - rowH + 4, size: 7, font: this.fontBold, color: C.text })
    })

    // Photo in observations column
    if (obsPhoto) {
      const dims = obsPhoto.scale(1)
      const maxW = colObs - 16, maxH = obsColH - 20
      const scale = Math.min(maxW / dims.width, maxH / dims.height, 1)
      const iw = dims.width * scale, ih = dims.height * scale
      const px = cx[3] + (colObs - iw) / 2, py = this.y - obsColH + (obsColH - ih) / 2
      this.page.drawImage(obsPhoto, { x: px, y: py, width: iw, height: ih })
    }

    // Observation text below photo
    if (data.observaciones) {
      const textY = this.y - obsColH + 4
      this.page.drawText(String(data.observaciones).slice(0, 80), { x: cx[3] + 6, y: textY, size: 5.5, font: this.font, color: C.text })
    }

    this.y -= totalRowsH

    // Summation row
    const sumH = 15
    const values = POINTS.map(pt => parseFloat(data[pt.id]) || 0)
    const sum = values.reduce((a, b) => a + b, 0)
    const rg = values.filter(v => v > 0).length > 0 ? sum / values.filter(v => v > 0).length : sum / 7

    this.page.drawRectangle({ x, y: this.y - sumH, width: CW, height: sumH, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText('SUMATORIA DE RESISTENCIA OBTENIDA', { x: x + 6, y: this.y - sumH + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(`Rg =     ${rg.toFixed(4)}`, { x: cx[2] + 10, y: this.y - sumH + 4, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText('[Ohm]', { x: cx[3] - 10, y: this.y - sumH + 4, size: 6, font: this.font, color: C.text })
    this.y -= sumH + 4
  }

  // ── Vertical Bar Chart ─────────────────────────────────────────
  drawBarChart(data) {
    this.checkSpace(165)
    const x = ML

    // Title
    this.page.drawText('Resistencias medidas por electrodo de potencial', { x: x + CW / 2 - 100, y: this.y - 10, size: 7, font: this.fontBold, color: C.text })
    this.y -= 18

    // Chart dimensions
    const chartLeftMargin = 45
    const chartX = x + chartLeftMargin
    const chartH = 110
    const chartW = CW - chartLeftMargin - 10
    const chartY = this.y - chartH

    // Values per electrode
    const values = POINTS.map(pt => parseFloat(data[pt.id]) || 0)
    const maxVal = Math.max(...values, 0.5)
    const yMax = Math.ceil(maxVal * 10) / 10  // round up to 1 decimal

    // Chart background
    this.page.drawRectangle({ x: chartX, y: chartY, width: chartW, height: chartH, color: C.gray, borderColor: C.border, borderWidth: 0.5 })

    // Y axis grid lines and labels
    const numGridLines = 5
    for (let i = 0; i <= numGridLines; i++) {
      const yVal = (yMax / numGridLines) * i
      const yPos = chartY + (i / numGridLines) * chartH
      this.page.drawLine({ start: { x: chartX, y: yPos }, end: { x: chartX + chartW, y: yPos }, thickness: 0.3, color: C.border })
      this.page.drawText(String(Math.round(yVal * 100) / 100), { x: chartX - 22, y: yPos - 3, size: 5.5, font: this.font, color: C.text })
    }

    // Y axis title
    this.page.drawText('Resistencia', { x: x, y: chartY + chartH / 2 + 12, size: 5.5, font: this.font, color: C.text })
    this.page.drawText('[Ohm]', { x: x + 4, y: chartY + chartH / 2 + 2, size: 5.5, font: this.font, color: C.text })

    // Bars - one per electrode
    const barGap = chartW / POINTS.length
    const barW = barGap * 0.55

    POINTS.forEach((pt, i) => {
      const val = values[i]
      const barH = yMax > 0 ? (val / yMax) * chartH : 0
      const bx = chartX + i * barGap + (barGap - barW) / 2

      // Draw bar
      if (barH > 0.5) {
        this.page.drawRectangle({ x: bx, y: chartY, width: barW, height: barH, color: C.blue })
      }

      // X axis label - electrode name (truncate if needed)
      let label = pt.label
      while (this.font.widthOfTextAtSize(label, 5) > barGap - 4 && label.length > 5) label = label.slice(0, -1)
      if (label !== pt.label) label += '.'
      const labelW = this.font.widthOfTextAtSize(label, 5)
      this.page.drawText(label, { x: bx + (barW - labelW) / 2, y: chartY - 10, size: 5, font: this.font, color: C.text })

      // Value on top of bar
      if (val > 0) {
        const valStr = val + ' Ohm'
        this.page.drawText(valStr, { x: bx + barW / 2 - 8, y: chartY + barH + 3, size: 5, font: this.font, color: C.text })
      }
    })

    this.y = chartY - 18

    // Caption
    this.page.drawText('En el grafico No 1 se observa la zona plana de potencial, equivalente a un valor constante de resistencia.', { x: x + 4, y: this.y, size: 5.5, font: this.font, color: C.textLight })
    this.y -= 12
  }
}


// ══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export async function generateGroundingPdf(submission, assets = []) {
  const p = new GroundingPDF()
  await p.init()

  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const meta = inner?.meta || {}
  const sections = data || {}
  const datos = sections.datos || sections.formData || data
  const condiciones = sections.condiciones || {}
  const equipo = sections.equipo || {}
  const medicion = sections.medicion || {}
  const evidencia = sections.evidencia || {}

  const v = (key) => {
    for (const src of [datos, condiciones, equipo, medicion, evidencia, data]) {
      if (src && typeof src === 'object' && src[key] && !String(src[key]).startsWith('data:') && src[key] !== '__photo__' && src[key] !== '__photo_uploaded__') return String(src[key])
    }
    return ''
  }

  // Build photo URL map from assets
  const photoMap = {}
  if (assets?.length) {
    for (const a of assets) {
      if (a.public_url && a.asset_type) photoMap[a.asset_type] = a.public_url
    }
  }

  // Pre-fetch all photos for embedding
  const embeddedPhotos = {}
  const photoIds = ['fotoPataTorre', 'fotoCerramiento', 'fotoPorton', 'fotoPararrayos', 'fotoBarraSPT', 'fotoEscalerilla1', 'fotoEscalerilla2']
  for (const pid of photoIds) {
    const url = photoMap[pid]
    if (url) {
      const img = await fetchAndEmbed(p.doc, url)
      if (img) embeddedPhotos[pid] = img
    }
  }

  // ── PAGE 1 ──────────────────────────────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita') })

  // Site info (matching Excel title)
  p.sectionTitle('Inventario de Equipos en Piso')
  p.fieldRow2('ID Sitio:', v('idSitio'), 'Altura (Mts):', v('alturaMts'))
  p.fieldRow2('Nombre Sitio:', v('nombreSitio'), 'Tipo Sitio:', v('tipoSitio'))
  p.fieldRow2('Fecha Inicio:', meta.startedAt || v('startedAt') || '', 'Tipo Estructura:', v('tipoEstructura'))
  p.fieldRow2('Fecha Termino:', meta.endedAt || v('endedAt') || '', 'Latitud:', meta.lat || v('lat') || '')
  p.fieldRow2('Direccion:', v('direccion'), 'Longitud:', meta.lng || v('lng') || '')

  p.y -= 4

  // Conditions
  p.sectionTitle('Consideraciones para las Pruebas y Medicion del Sistema de Puesta a Tierra')
  p.fieldRow2('ESTADO DEL TERRENO:', v('estadoTerreno'), 'TIPO DE TERRENO:', v('tipoTerreno'))
  p.fieldRow2('ULTIMO DIA DE LLUVIA:', v('ultimoDiaLluvia'), 'HORA:', v('hora'))

  p.y -= 4

  // Measurement method diagrams (2 side by side like the Excel)
  const diagH = 140
  p.checkSpace(diagH + 10)
  const halfW = (CW - 8) / 2
  if (p.diagramMain) {
    const dims = p.diagramMain.scale(1)
    const scale = Math.min(halfW / dims.width, diagH / dims.height)
    const iw = dims.width * scale, ih = dims.height * scale
    p.page.drawRectangle({ x: ML, y: p.y - diagH, width: halfW, height: diagH, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawImage(p.diagramMain, { x: ML + (halfW - iw) / 2, y: p.y - diagH + (diagH - ih) / 2, width: iw, height: ih })
  }
  if (p.diagramAlt) {
    const rx = ML + halfW + 8
    const dims = p.diagramAlt.scale(1)
    const scale = Math.min(halfW / dims.width, diagH / dims.height)
    const iw = dims.width * scale, ih = dims.height * scale
    p.page.drawRectangle({ x: rx, y: p.y - diagH, width: halfW, height: diagH, borderColor: C.border, borderWidth: 0.5 })
    // Title for alt diagram
    p.page.drawText('Sistema para sitios con piso que impida clavar picas', { x: rx + 10, y: p.y - 12, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawImage(p.diagramAlt, { x: rx + (halfW - iw) / 2, y: p.y - diagH + (diagH - ih) / 2, width: iw, height: ih })
  }
  p.y -= diagH + 4

  // Warning text
  p.checkSpace(20)
  p.page.drawRectangle({ x: ML, y: p.y - 16, width: CW, height: 16, borderColor: C.border, borderWidth: 0.5 })
  p.page.drawText('SI EL VALOR DE LA RESISTENCIA A TIERRA ES MAYOR A 10 OHMIOS, SE DEBE TOMAR MEDIDA DE LA RESISTIVIDAD', { x: ML + 4, y: p.y - 8, size: 5.5, font: p.fontBold, color: C.text })
  p.page.drawText('DEL TERRENO MEDIANTE METODO WENNER PARA REALIZAR DISENO DE MEJORA DEL SPT', { x: ML + 4 + CW / 2 - 140, y: p.y - 15, size: 5.5, font: p.fontBold, color: C.text })
  p.y -= 20

  // Measurement table with observation photo
  const firstPhotoUrl = photoMap['fotoPataTorre'] || Object.values(photoMap)[0]
  let obsPhoto = null
  if (firstPhotoUrl) obsPhoto = await fetchAndEmbed(p.doc, firstPhotoUrl)

  p.drawMeasurementTable({
    distanciaElectrodoCorriente: v('distanciaElectrodoCorriente'),
    rPataTorre: v('rPataTorre'), rCerramiento: v('rCerramiento'),
    rPorton: v('rPorton'), rPararrayos: v('rPararrayos'),
    rBarraSPT: v('rBarraSPT'), rEscalerilla1: v('rEscalerilla1'), rEscalerilla2: v('rEscalerilla2'),
    equipoMarca: v('equipoMarca'), equipoSerial: v('equipoSerial'), equipoCalibracion: v('equipoCalibracion'),
    observaciones: v('observaciones'),
  }, obsPhoto)

  // Bar chart
  p.drawBarChart({
    rPataTorre: v('rPataTorre'), rCerramiento: v('rCerramiento'),
    rPorton: v('rPorton'), rPararrayos: v('rPararrayos'),
    rBarraSPT: v('rBarraSPT'), rEscalerilla1: v('rEscalerilla1'), rEscalerilla2: v('rEscalerilla2'),
  })

  p._footer()

  // ── PAGES 2-3: Photo Evidence ──────────────────────────────
  p.newPage()
  p._miniHdr()

  // Photo pairs: 2 per row, black header bar, matching the real PDF
  const photoPairs = [
    { left: { title: 'FOTO CONEXION TELUROMETRO AL SISTEMA DE TIERRA EXISTENTE', id: 'fotoPataTorre' },
      right: { title: 'FOTO CONEXION DEL ELECTRODO DE CORRIENTE', id: null } },
    ...POINTS.filter((_, i) => i % 2 === 0).map((pt, idx) => ({
      left: { title: pt.photoLabel, id: pt.photoId },
      right: POINTS[idx * 2 + 1] ? { title: POINTS[idx * 2 + 1].photoLabel, id: POINTS[idx * 2 + 1].photoId } : null,
    })),
  ]

  for (const pair of photoPairs) {
    const leftImg = pair.left.id ? embeddedPhotos[pair.left.id] || null : null
    const rightImg = pair.right?.id ? embeddedPhotos[pair.right.id] || null : null
    await p.drawPhotoPair(pair.left.title, leftImg, pair.right?.title || '', rightImg)
  }

  p._footer()
  return await p.doc.save()
}

export async function downloadGroundingPdf(submission, assets = []) {
  const bytes = await generateGroundingPdf(submission, assets)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const datos = d.datos || d.formData || d
  const filename = `puesta_tierra_${datos.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
