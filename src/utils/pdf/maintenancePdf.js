/**
 * PTI TeleInspect - Preventive Maintenance PDF Report
 * Replicates the Excel layout exactly:
 *   Sheet 1: Información General
 *   Sheet 2: Inf. Estructura Principal
 *   Sheet 3: Inspección Del Sitio (sections 1-5 + Vandalismo)
 *   Sheet 4: Inspección de la Torre (sections 6-11)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

// ── Colors matching the Excel ────────────────────────────────────
const C = {
  black: rgb(0.1, 0.1, 0.1),
  red: rgb(0.9, 0, 0),       // #E60000
  white: rgb(1, 1, 1),
  dark: rgb(0.18, 0.18, 0.18),
  gray: rgb(0.95, 0.95, 0.95),
  border: rgb(0.8, 0.8, 0.8),
  text: rgb(0.15, 0.15, 0.15),
  textLight: rgb(0.4, 0.4, 0.4),
  good: rgb(0.15, 0.68, 0.38),
  goodBg: rgb(0.91, 0.96, 0.91),
  regular: rgb(0.95, 0.61, 0.07),
  regularBg: rgb(1, 0.97, 0.88),
  bad: rgb(0.91, 0.3, 0.24),
  badBg: rgb(0.99, 0.89, 0.93),
  naBg: rgb(0.96, 0.96, 0.96),
  naText: rgb(0.6, 0.6, 0.6),
}

const PW = 612    // letter width
const PH = 792    // letter height
const ML = 36     // margin left
const MR = 36
const MT = 36
const MB = 36
const CW = PW - ML - MR  // content width

class MaintenancePDF {
  constructor() {
    this.doc = null
    this.page = null
    this.font = null
    this.fontBold = null
    this.y = 0
    this.pageNum = 0
  }

  async init() {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold)
    // Embed PTI logo
    try {
      const logoBytes = Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))
      this.logo = await this.doc.embedPng(logoBytes)
    } catch (e) {
      console.warn('Could not embed logo:', e)
      this.logo = null
    }
  }

  newPage() {
    if (this.page) this._drawFooter()
    this.page = this.doc.addPage([PW, PH])
    this.pageNum++
    this.y = PH - MT
  }

  checkSpace(needed) {
    if (this.y - needed < MB) {
      this._drawFooter()
      this.page = this.doc.addPage([PW, PH])
      this.pageNum++
      this.y = PH - MT
      this._miniHeader()
    }
  }

  _drawFooter() {
    this.page.drawText(`Phoenix Tower International — Reporte de Mantenimiento Preventivo`, {
      x: ML, y: 16, size: 5.5, font: this.font, color: C.textLight
    })
    this.page.drawText(`Página ${this.pageNum}`, {
      x: PW - MR - this.font.widthOfTextAtSize(`Página ${this.pageNum}`, 5.5),
      y: 16, size: 5.5, font: this.font, color: C.textLight
    })
  }

  // ── Header (top of each logical section) ──────────────────────
  drawHeader(data) {
    const x = ML
    // Black bar
    this.page.drawRectangle({ x, y: this.y - 18, width: CW, height: 18, color: C.black })
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + 6, y: this.y - 13, size: 9, font: this.fontBold, color: C.white
    })
    this.y -= 20

    // Red bar
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.red })
    this.page.drawText('REPORTE DE INSPECCIÓN DE MANTENIMIENTO PREVENTIVO', {
      x: x + 6, y: this.y - 11, size: 7, font: this.fontBold, color: C.white
    })
    this.y -= 16

    // Logo + Provider/ID row (matching Excel: logo left, fields center, "Logo Proveedor" right)
    const logoRowH = 42
    this.page.drawRectangle({ x, y: this.y - logoRowH, width: CW, height: logoRowH, borderColor: C.border, borderWidth: 0.5 })

    // Draw PTI logo on the left
    if (this.logo) {
      const logoDims = this.logo.scale(0.18)
      const logoW = Math.min(logoDims.width, 110)
      const logoH = Math.min(logoDims.height, 36)
      this.page.drawImage(this.logo, {
        x: x + 6,
        y: this.y - logoRowH + (logoRowH - logoH) / 2,
        width: logoW,
        height: logoH,
      })
    }

    // Provider and Visit Type fields (centered area)
    const fieldX = x + 130
    this.page.drawText('Proveedor:', { x: fieldX, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.proveedor || '', { x: fieldX + 55, y: this.y - 14, size: 7, font: this.font, color: C.text })
    
    // Dotted line after proveedor
    const dotY = this.y - 16
    for (let dx = fieldX + 55; dx < x + CW * 0.65; dx += 3) {
      this.page.drawText('.', { x: dx, y: dotY, size: 5, font: this.font, color: C.border })
    }

    this.page.drawText('Tipo de Visita:', { x: fieldX, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.tipoVisita || '', { x: fieldX + 65, y: this.y - 30, size: 7, font: this.font, color: C.text })

    // Dotted line after tipo visita
    const dotY2 = this.y - 32
    for (let dx = fieldX + 65; dx < x + CW * 0.65; dx += 3) {
      this.page.drawText('.', { x: dx, y: dotY2, size: 5, font: this.font, color: C.border })
    }

    // ID Sitio and Nombre on the right side
    const rightX = x + CW * 0.65
    this.page.drawText('ID Sitio:', { x: rightX, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.idSitio || '', { x: rightX + 40, y: this.y - 14, size: 7, font: this.font, color: C.text })
    this.page.drawText('Nombre Sitio:', { x: rightX, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.nombreSitio || '', { x: rightX + 60, y: this.y - 30, size: 7, font: this.font, color: C.text })

    // "Logo Proveedor" text on far right
    this.page.drawText('Logo Proveedor', { x: x + CW - 60, y: this.y - 14, size: 6, font: this.font, color: C.textLight })

    // Red line under the row
    this.page.drawRectangle({ x, y: this.y - logoRowH - 1.5, width: CW, height: 1.5, color: C.red })

    this.y -= logoRowH + 4
  }

  _miniHeader() {
    const x = ML
    // Black bar with logo
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.black })
    if (this.logo) {
      const ld = this.logo.scale(0.06)
      this.page.drawImage(this.logo, { x: x + 4, y: this.y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) })
    }
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + (this.logo ? 44 : 6), y: this.y - 10, size: 6.5, font: this.fontBold, color: C.white
    })
    this.y -= 16
    this.page.drawRectangle({ x, y: this.y - 9, width: CW, height: 9, color: C.red })
    this.page.drawText('REPORTE DE INSPECCIÓN DE MANTENIMIENTO PREVENTIVO', {
      x: x + 6, y: this.y - 7, size: 5.5, font: this.fontBold, color: C.white
    })
    this.y -= 12
  }

  // ── Drawing helpers ───────────────────────────────────────────
  _labelValueRow(label1, val1, label2, val2) {
    const x = ML
    const h = 13
    const half = CW / 2

    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, color: C.gray })
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })

    this.page.drawText(label1, { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    const lw1 = this.fontBold.widthOfTextAtSize(label1, 6.5)
    this.page.drawText(val1, { x: x + 4 + lw1 + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    if (label2) {
      this.page.drawLine({ start: { x: x + half, y: this.y }, end: { x: x + half, y: this.y - h }, thickness: 0.5, color: C.border })
      this.page.drawText(label2, { x: x + half + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
      const lw2 = this.fontBold.widthOfTextAtSize(label2, 6.5)
      this.page.drawText(val2 || '', { x: x + half + 4 + lw2 + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    }
    this.y -= h
  }

  sectionTitle(title) {
    this.checkSpace(18)
    this.page.drawRectangle({ x: ML, y: this.y - 15, width: CW, height: 15, color: C.black })
    this.page.drawText(title.toUpperCase(), { x: ML + 6, y: this.y - 11, size: 7.5, font: this.fontBold, color: C.white })
    this.y -= 17
  }

  subsectionHeader(number, title) {
    this.checkSpace(15)
    const x = ML, h = 13
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, color: C.dark })
    this.page.drawText(`${number}.- ${title}`, { x: x + 4, y: this.y - h + 4, size: 7, font: this.fontBold, color: C.white })

    const colE = x + CW * 0.58
    const colO = x + CW * 0.72
    this.page.drawText('Estado', { x: colE, y: this.y - h + 4, size: 6, font: this.fontBold, color: C.white })
    this.page.drawText('Observaciones', { x: colO, y: this.y - h + 4, size: 6, font: this.fontBold, color: C.white })
    this.y -= h
  }

  checklistRow(num, text, status, observation, valueText) {
    this.checkSpace(14)
    const x = ML, h = 14
    const colN = x + 26
    const colE = x + CW * 0.58
    const colO = x + CW * 0.72

    // Background
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })

    // Vertical lines
    this.page.drawLine({ start: { x: colN, y: this.y }, end: { x: colN, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawLine({ start: { x: colE, y: this.y }, end: { x: colE, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawLine({ start: { x: colO, y: this.y }, end: { x: colO, y: this.y - h }, thickness: 0.5, color: C.border })

    // Number
    this.page.drawText(String(num), { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    // Text (truncate if needed)
    let display = text
    if (valueText) display += ` (${valueText})`
    const maxTextW = colE - colN - 8
    let truncated = display
    while (this.font.widthOfTextAtSize(truncated, 6.5) > maxTextW && truncated.length > 3) {
      truncated = truncated.slice(0, -1)
    }
    if (truncated !== display) truncated += '...'
    this.page.drawText(truncated, { x: colN + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    // Status with background color
    const st = (status || '').toLowerCase()
    if (st) {
      let bgColor = null, textColor = C.text
      if (st === 'bueno' || st === 'good') { bgColor = C.goodBg; textColor = C.good }
      else if (st === 'regular') { bgColor = C.regularBg; textColor = C.regular }
      else if (st === 'malo' || st === 'bad') { bgColor = C.badBg; textColor = C.bad }
      else if (st === 'n/a' || st === 'na') { bgColor = C.naBg; textColor = C.naText }

      if (bgColor) {
        this.page.drawRectangle({ x: colE + 0.5, y: this.y - h + 0.5, width: colO - colE - 1, height: h - 1, color: bgColor })
      }
      const label = st === 'bueno' || st === 'good' ? 'Bueno' : st === 'regular' ? 'Regular' : st === 'malo' || st === 'bad' ? 'Malo' : st === 'n/a' || st === 'na' ? 'N/A' : status
      this.page.drawText(label, { x: colE + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: textColor })
    }

    // Observation
    if (observation) {
      const maxObsW = x + CW - colO - 8
      let obs = String(observation)
      while (this.font.widthOfTextAtSize(obs, 6) > maxObsW && obs.length > 3) obs = obs.slice(0, -1)
      if (obs !== String(observation)) obs += '...'
      this.page.drawText(obs, { x: colO + 4, y: this.y - h + 4, size: 6, font: this.font, color: C.textLight })
    }

    this.y -= h
  }

  fieldRow(label, value) {
    this.checkSpace(13)
    const x = ML, h = 13, labelW = CW * 0.4
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawLine({ start: { x: x + labelW, y: this.y }, end: { x: x + labelW, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawText(String(label), { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(String(value || ''), { x: x + labelW + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    this.y -= h
  }

  textBlock(label, value) {
    this.checkSpace(32)
    const x = ML
    // Label bar
    this.page.drawRectangle({ x, y: this.y - 12, width: CW, height: 12, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(label, { x: x + 4, y: this.y - 9, size: 6.5, font: this.fontBold, color: C.text })
    this.y -= 12
    // Value box
    const val = value || '—'
    const boxH = 22
    this.page.drawRectangle({ x, y: this.y - boxH, width: CW, height: boxH, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(String(val).slice(0, 200), { x: x + 6, y: this.y - 10, size: 6.5, font: this.font, color: C.text })
    this.y -= boxH
  }

  darkSubheader(title) {
    this.checkSpace(15)
    this.page.drawRectangle({ x: ML, y: this.y - 13, width: CW, height: 13, color: C.dark })
    this.page.drawText(title, { x: ML + 4, y: this.y - 10, size: 7, font: this.fontBold, color: C.white })
    this.y -= 15
  }
}


// ══════════════════════════════════════════════════════════════════
// ALL CHECKLIST ITEMS (matching Excel exactly)
// ══════════════════════════════════════════════════════════════════
const SITE_SECTIONS = [
  { num: '1', title: 'Acceso', items: [
    ['1.1','Camino de Acceso'],['1.2','Limpieza Exterior'],['1.3','Candado y Acceso Principal'],
    ['1.4','Escaleras de Acceso (Inmueble y Azotea)'],['1.5','Limpieza General Interior'],
  ]},
  { num: '2', title: 'Seguridad', items: [
    ['2.1','Condición de la Malla Ciclónica'],['2.2','Cimentación de Malla Ciclónica'],
    ['2.3','Condición de Muros'],['2.4','Alambre de Púas y Concertina'],
    ['2.5','Puerta se puede cerrar con candado'],['2.6','Condición de puerta principal'],
    ['2.7','Cámaras o sistema de monitoreo'],
  ]},
  { num: '3', title: 'Sistema de Tierras', items: [
    ['3.1','Condición del Cable'],['3.2','Condición de las Soldaduras'],
    ['3.3','Prueba de Resistividad'],['3.4','Registros / Cámaras de Inspección'],
    ['3.5','Conexiones para aterrizar la torre'],['3.6','Conexiones para aterrizar Malla/Muros'],
  ]},
  { num: '4', title: 'Sistema Eléctrico', items: [
    ['4.1','Estado del Nicho Eléctrico'],['4.2','Candado de Seguridad y Protección'],
    ['4.3','Registros eléctricos'],['4.4','Postes'],['4.5','Transformador o Subestación'],
    ['4.6','Tipo (Pedestal o Poste)'],['4.7','Marca del Transformador'],
    ['4.8','Capacidad del Transformador'],['4.9','Número de Serie del Transformador'],
    ['4.10','Poste del Transformador'],['4.11','Número de Medidor de cada Cliente'],
    ['4.12','Tierras del Sistema Eléctrico'],
  ]},
  { num: '5', title: 'Sitio en General', items: [
    ['5.1','Condición y Nivel de Grava'],['5.2','Malla Antivegetal'],['5.3','Protección de nicho'],
    ['5.4','Drenaje del sitio'],['5.5','Pintura Exterior e Interior'],
    ['5.6','Grietas en base de torre'],['5.7','Grietas en dados de torre'],
    ['5.8','Grietas en base de equipos'],['5.9','Grietas/Encharcamientos azotea'],
    ['5.10','Impermeabilizado área rentada'],['5.11','Condición general azotea'],
  ]},
]

const TOWER_SECTIONS = [
  { num: '6', title: 'Miembros', items: [
    ['6.1','Miembros Dañados'],['6.2','Miembros Flojos'],['6.3','Miembros Faltantes'],
    ['6.4','Escalera de Ascenso'],['6.5','Tornillos en Bridas Completos'],
    ['6.6','Tornillos en Bridas de Abajo hacia Arriba'],['6.7','Tornillos en Celosías Completos'],
    ['6.8','Tornillos en Celosías de Adentro hacia Afuera'],['6.9','Soldadura entre Pierna y Brida'],
    ['6.10','Cable de Vida'],['6.11','Step Bolt y Equipo de Seguridad'],
    ['6.12','Dren de Piernas de la Torre'],['6.13','Grout'],
    ['6.14','Estado del Camuflaje'],['6.15','Verticalidad'],
  ]},
  { num: '7', title: 'Acabado', items: [
    ['7.1','Condición de la Pintura'],['7.2','Condición del Galvanizado'],['7.3','Oxidación'],
  ]},
  { num: '8', title: 'Luces de la Torre', items: [
    ['8.1','Sistema de Balizamiento Instalado'],['8.2','Sistema de Luz Funcionando'],
    ['8.3','Tubería, Cajas y Sujetadores'],['8.4','Condición del Cable'],
    ['8.5','Condición de la Fotocelda'],['8.6','Condición del Controlador'],
    ['8.7','Condición de las luces'],['8.8','Número de Medidor para Luces'],
    ['8.9','Medidor Conectado al QO2'],['8.10','Voltaje en Interruptor QO2'],
  ]},
  { num: '9', title: 'Sistema de Tierras en la Torre', items: [
    ['9.1','Tapas y Registros'],['9.2','Conexiones Exotérmicas'],['9.3','Condición de Cables'],
    ['9.4','Sujeción, Condición y Tipo'],['9.5','Aterrizaje Piernas de Torre'],
    ['9.6','Aterrizaje de Retenidas'],['9.7','Aterrizaje de Malla Ciclónica'],
    ['9.8','Aterrizaje de Mástil-Monopolo'],['9.9','Aterrizaje de Portacablera'],
    ['9.10','Oxidación'],['9.11','Pararrayo y Cable'],['9.12','Sistema de Tierra en General'],
  ]},
  { num: '10', title: 'Retenidas', items: [
    ['10.1','Dados de Concreto'],['10.2','Condición de las Anclas'],
    ['10.3','Uniones entre Retenidas y Anclas'],['10.4','Retenidas Libres de Oxidación'],
    ['10.5','Tensión de las Retenidas'],['10.6','Tornillos y Sujetadores'],
  ]},
  { num: '11', title: 'Cimentación de Torre', items: [
    ['11.1','Erosión'],['11.2','Acabado en Dados'],['11.3','Condición de Anclas'],
    ['11.4','Fisuras o Grietas'],['11.5','Estructuras Metálicas y Vigas'],
  ]},
]


// ══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export async function generateMaintenancePdf(submission) {
  const p = new MaintenancePDF()
  await p.init()

  // Extract data from payload
  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const formData = data?.formData || {}
  const checklist = data?.checklistData || {}
  const meta = inner?.meta || {}

  const v = (key) => formData[key] || data[key] || ''

  // Helper to get checklist status
  const getStatus = (id) => {
    const item = checklist[id]
    if (!item) return { status: '', observation: '', value: '' }
    if (typeof item === 'string') return { status: item, observation: '', value: '' }
    return { status: item.status || '', observation: item.observation || '', value: item.value || '' }
  }

  // ── PAGE 1: Información General ─────────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Información General del Sitio')

  p.darkSubheader('Información del Sitio')
  p.fieldRow('Nombre del Sitio:', v('nombreSitio'))
  p.fieldRow('Número del Sitio:', v('idSitio'))
  const lat = meta.lat || v('lat') || ''
  const lng = meta.lng || v('lng') || ''
  p.fieldRow('Coordenadas:', lat && lng ? `${lat}, ${lng}` : '')
  p.fieldRow('Tipo de Sitio:', v('tipoSitio'))
  p.fieldRow('Fecha de Inicio:', meta.startedAt || v('startedAt') || '')
  p.fieldRow('Fecha de Término:', meta.endedAt || v('endedAt') || '')
  p.fieldRow('Hora de Entrada:', meta.startTime || v('horaEntrada') || '')
  p.fieldRow('Hora de Salida:', meta.endTime || v('horaSalida') || '')

  p.y -= 4
  p.fieldRow('Tipo de Torre:', v('tipoTorre'))
  p.fieldRow('Altura de la Torre:', v('alturaTorre') ? `${v('alturaTorre')} m` : '')
  p.fieldRow('Altura del Edificio:', v('alturaEdificio') ? `${v('alturaEdificio')} m` : '')
  let altTotal = ''
  try { const at = (parseFloat(v('alturaTorre')||0)) + (parseFloat(v('alturaEdificio')||0)); if (at > 0) altTotal = `${at} m` } catch(_){}
  p.fieldRow('Altura Total:', altTotal)
  p.fieldRow('Condición de la Torre:', v('condicionTorre'))
  p.fieldRow('Número de Secciones:', v('numSecciones'))
  p.fieldRow('Tipo de Sección:', v('tipoSeccion'))
  p.fieldRow('Tipo de Pierna:', v('tipoPierna'))
  p.fieldRow('¿Tiene Camuflaje?:', v('tieneCamuflaje'))
  p.fieldRow('Tipo de Camuflaje:', v('tipoCamuflaje'))

  p.y -= 4
  p.darkSubheader('Dirección del Sitio')
  p.fieldRow('Calle:', v('calle'))
  p.fieldRow('Número:', v('numero'))
  p.fieldRow('Colonia:', v('colonia'))
  p.fieldRow('Ciudad:', v('ciudad'))
  p.fieldRow('Estado:', v('estado'))
  p.fieldRow('Código Postal:', v('codigoPostal'))
  p.fieldRow('País:', v('pais'))

  p.y -= 4
  p.darkSubheader('Acceso al Sitio')
  p.fieldRow('Descripción del Sitio:', v('descripcionSitio'))
  p.fieldRow('Restricción de Horario:', v('restriccionHorario'))
  p.fieldRow('Descripción de Acceso:', v('descripcionAcceso'))
  p.fieldRow('Propietario localizable:', v('propietarioLocalizable'))
  p.fieldRow('Clave:', v('clave'))
  p.fieldRow('Llave:', v('llave'))
  p.fieldRow('Memorándum:', v('memorandum'))
  p.textBlock('Problemas de Acceso:', v('problemasAcceso'))

  p.y -= 4
  p.darkSubheader('Servicios en Sitio')
  p.fieldRow('Ubicación de Medidores:', v('ubicacionMedidores'))
  p.fieldRow('Tipo de Conexión Eléctrica:', v('tipoConexion'))
  p.fieldRow('Capacidad del Transformador:', v('capacidadTransformador'))
  p.fieldRow('Número de Medidores:', v('numMedidores'))
  p.fieldRow('Medidor separado luces:', v('medidorSeparadoLuces'))
  p.fieldRow('Fibra Óptica en Sitio:', v('fibraOptica'))
  p._drawFooter()

  // ── PAGE 2: Inspección Del Sitio ────────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Inspección del Sitio')

  for (const sec of SITE_SECTIONS) {
    p.subsectionHeader(sec.num, sec.title)
    for (const [id, text] of sec.items) {
      const { status, observation, value } = getStatus(id)
      p.checklistRow(id, text, status, observation, value)
    }
  }

  // Vandalismo
  p.y -= 6
  p.sectionTitle('Vandalismo y Observaciones')
  const vand = v('vandalismo')
  const vandDesc = v('descripcionVandalismo')
  p.textBlock('Observación de vandalismo:', vand ? `${vand}${vandDesc ? ' — ' + vandDesc : ''}` : '')
  p.textBlock('Equipos de sistema faltantes:', v('equiposFaltantes'))
  p.textBlock('Defectos que puedan detener la operación:', v('defectosOperacion'))
  p.textBlock('Observaciones generales:', v('observacionesGenerales'))
  p._drawFooter()

  // ── PAGE 3: Inspección de la Torre ──────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Inspección de Torre')

  for (const sec of TOWER_SECTIONS) {
    p.subsectionHeader(sec.num, sec.title)
    for (const [id, text] of sec.items) {
      const { status, observation, value } = getStatus(id)
      p.checklistRow(id, text, status, observation, value)
    }
  }
  p._drawFooter()

  return await p.doc.save()
}

export async function downloadMaintenancePdf(submission) {
  const bytes = await generateMaintenancePdf(submission)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const fd = submission?.payload?.payload?.data?.formData || submission?.payload?.data?.formData || {}
  const filename = `mantenimiento_preventivo_${fd.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
