/**
 * PTI TeleInspect - Preventive Maintenance Executed PDF Report
 * Layout: Header + SITIO type + 4 activities per page (before/after photos)
 * Each activity: 2 boxes side by side with title bar, photo, and Antes/Despues footer
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

const C = {
  black: rgb(0.1, 0.1, 0.1), red: rgb(0.9, 0, 0), white: rgb(1, 1, 1),
  gray: rgb(0.85, 0.85, 0.85), grayLight: rgb(0.94, 0.94, 0.94),
  border: rgb(0.75, 0.75, 0.75), text: rgb(0.12, 0.12, 0.12),
  textLight: rgb(0.5, 0.5, 0.5), yellow: rgb(1, 1, 0),
  antesGray: rgb(0.7, 0.7, 0.7), despuesGray: rgb(0.5, 0.5, 0.5),
}
const PW = 612, PH = 792, ML = 30, MR = 30, MT = 30, MB = 30, CW = PW - ML - MR

async function fetchImg(doc, url) {
  try {
    const r = await fetch(url); if (!r.ok) return null
    const b = new Uint8Array(await r.arrayBuffer())
    if (b[0]===0xFF && b[1]===0xD8) return await doc.embedJpg(b)
    if (b[0]===0x89 && b[1]===0x50) return await doc.embedPng(b)
    try { return await doc.embedJpg(b) } catch { try { return await doc.embedPng(b) } catch { return null } }
  } catch { return null }
}

export async function generatePMExecutedPdf(submission, assets = []) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  let logo = null
  try { logo = await doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))) } catch {}

  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const meta = inner?.meta || {}
  const fd = data.formData || data.datos || data

  const v = (k) => { for (const s of [fd, data]) { if (s?.[k] && !String(s[k]).startsWith('data:') && s[k] !== '__photo__') return String(s[k]) } return '' }

  // Build photo URL map
  const photoMap = {}
  for (const a of (assets || [])) { if (a.public_url && a.asset_type) photoMap[a.asset_type] = a.public_url }

  // Get activities from the submission data
  const activities = data.activities || data.pmActivities || []
  
  // If no structured activities, build from PM_EXECUTED config + photo assets
  let activityList = []
  if (activities.length > 0) {
    activityList = activities
  } else {
    // Build from assets - extract activity IDs from asset_types like "executed:pmx-1:before"
    const actIds = new Set()
    for (const key of Object.keys(photoMap)) {
      const m = key.match(/^executed:(pmx-\d+):(before|after)$/)
      if (m) actIds.add(m[1])
    }
    // Also check data for activity status
    const actData = data.activityStatus || data.pmExecutedActivities || {}
    for (const id of Object.keys(actData)) actIds.add(id)
    
    // Import activity config
    const { PM_EXECUTED_ACTIVITIES } = await import('../../data/preventiveMaintenanceExecutedConfig')
    
    for (const act of PM_EXECUTED_ACTIVITIES) {
      const beforeUrl = photoMap[`executed:${act.id}:before`]
      const afterUrl = photoMap[`executed:${act.id}:after`]
      const status = actData[act.id]
      // Include if has photo or status
      activityList.push({
        id: act.id,
        group: act.group,
        name: act.name || act.group,
        photoLabel: act.photoLabel,
        beforeUrl,
        afterUrl,
        status: status?.status || status || '',
      })
    }
  }

  // Filter to applicable activities (those with data or photos)
  const siteType = (v('tipoSitio') || 'rawland').toLowerCase()

  let pageNum = 0
  const ITEMS_PER_PAGE = 4
  const activityH = 165 // height per activity pair

  function newPage() {
    const page = doc.addPage([PW, PH])
    pageNum++
    let y = PH - MT

    // Header
    page.drawRectangle({ x: ML, y: y - 16, width: CW, height: 16, color: C.black })
    y -= 18
    page.drawRectangle({ x: ML, y: y - 13, width: CW, height: 13, color: C.red })
    page.drawText('REPORTE DE TRABAJOS EJECUTADOS DE MANTTO PREVENTIVO', { x: ML + 6, y: y - 10, size: 6.5, font: fontB, color: C.white })
    y -= 15

    // Logo row
    const lrH = 36
    page.drawRectangle({ x: ML, y: y - lrH, width: CW, height: lrH, borderColor: C.border, borderWidth: 0.5 })
    if (logo) { const ld = logo.scale(0.15); page.drawImage(logo, { x: ML + 4, y: y - lrH + 6, width: Math.min(ld.width, 90), height: Math.min(ld.height, 28) }) }
    const fx = ML + 100
    page.drawText('Proveedor:', { x: fx, y: y - 12, size: 6.5, font: fontB, color: C.text })
    page.drawText(v('proveedor'), { x: fx + 50, y: y - 12, size: 6.5, font, color: C.text })
    page.drawText('Tipo de Visita', { x: fx, y: y - 26, size: 6.5, font: fontB, color: C.text })
    page.drawText(v('tipoVisita') || 'MTTO PREVENTIVO', { x: fx + 60, y: y - 26, size: 6.5, font, color: C.text })
    const rx = ML + CW * 0.6
    page.drawText('ID Sitio', { x: rx, y: y - 12, size: 6.5, font: fontB, color: C.text })
    page.drawText(v('idSitio'), { x: rx + 40, y: y - 12, size: 7, font: fontB, color: C.text })
    page.drawText('Nombre Sitio', { x: rx, y: y - 26, size: 6.5, font: fontB, color: C.text })
    page.drawText(v('nombreSitio'), { x: rx + 60, y: y - 26, size: 7, font, color: C.text })
    page.drawText('Logo Proveedor', { x: ML + CW - 55, y: y - 12, size: 5.5, font, color: C.textLight })
    y -= lrH

    // Site type bar
    page.drawRectangle({ x: ML, y: y - 13, width: CW, height: 13, color: C.grayLight, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(`SITIO ${(v('tipoSitio') || 'RAWLAND').toUpperCase()}`, { x: ML + CW / 2 - 25, y: y - 10, size: 6.5, font: fontB, color: C.text })
    y -= 15

    // Page number (yellow box)
    page.drawRectangle({ x: ML + CW - 20, y: y - 14, width: 20, height: 14, color: C.yellow })
    page.drawText(String(pageNum), { x: ML + CW - 14, y: y - 11, size: 8, font: fontB, color: C.black })
    y -= 18

    // Footer
    page.drawText(`${pageNum}/`, { x: PW - MR - 15, y: 16, size: 6, font, color: C.textLight })

    return { page, y }
  }

  // Draw activities 
  let currentPage = null, y = 0, itemsOnPage = 0

  for (const act of activityList) {
    if (!currentPage || itemsOnPage >= ITEMS_PER_PAGE) {
      const np = newPage()
      currentPage = np.page
      y = np.y
      itemsOnPage = 0
    }

    // Check space
    if (y - activityH < MB) {
      const np = newPage()
      currentPage = np.page
      y = np.y
      itemsOnPage = 0
    }

    const halfW = (CW - 8) / 2
    const hdrH = 16
    const photoH = 120
    const footH = 14
    const totalH = hdrH + photoH + footH

    // BEFORE box (left)
    // Header
    currentPage.drawRectangle({ x: ML, y: y - hdrH, width: halfW, height: hdrH, borderColor: C.border, borderWidth: 0.5 })
    currentPage.drawText(act.group || act.name, { x: ML + 4, y: y - hdrH + 4, size: 6.5, font, color: C.text })
    const labelW = fontB.widthOfTextAtSize(act.photoLabel || '', 7)
    currentPage.drawText(act.photoLabel || '', { x: ML + halfW - labelW - 4, y: y - hdrH + 4, size: 7, font: fontB, color: C.text })
    // Photo area
    currentPage.drawRectangle({ x: ML, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })
    
    // Fetch and draw before photo
    if (act.beforeUrl) {
      const img = await fetchImg(doc, act.beforeUrl)
      if (img) {
        const d = img.scale(1)
        const sc = Math.min((halfW - 10) / d.width, (photoH - 10) / d.height)
        currentPage.drawImage(img, { x: ML + (halfW - d.width * sc) / 2, y: y - hdrH - photoH + (photoH - d.height * sc) / 2, width: d.width * sc, height: d.height * sc })
      }
    } else {
      currentPage.drawText('N/A', { x: ML + halfW / 2 - 8, y: y - hdrH - photoH / 2, size: 9, font, color: C.textLight })
    }
    // Footer "Antes"
    currentPage.drawRectangle({ x: ML, y: y - hdrH - photoH - footH, width: halfW, height: footH, color: C.antesGray })
    currentPage.drawText('Antes', { x: ML + halfW / 2 - 10, y: y - hdrH - photoH - footH + 3, size: 7, font: fontB, color: C.white })

    // AFTER box (right)
    const rx = ML + halfW + 8
    currentPage.drawRectangle({ x: rx, y: y - hdrH, width: halfW, height: hdrH, borderColor: C.border, borderWidth: 0.5 })
    currentPage.drawText(act.group || act.name, { x: rx + 4, y: y - hdrH + 4, size: 6.5, font, color: C.text })
    const labelW2 = fontB.widthOfTextAtSize(act.photoLabel || '', 7)
    currentPage.drawText(act.photoLabel || '', { x: rx + halfW - labelW2 - 4, y: y - hdrH + 4, size: 7, font: fontB, color: C.text })
    currentPage.drawRectangle({ x: rx, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })

    if (act.afterUrl) {
      const img = await fetchImg(doc, act.afterUrl)
      if (img) {
        const d = img.scale(1)
        const sc = Math.min((halfW - 10) / d.width, (photoH - 10) / d.height)
        currentPage.drawImage(img, { x: rx + (halfW - d.width * sc) / 2, y: y - hdrH - photoH + (photoH - d.height * sc) / 2, width: d.width * sc, height: d.height * sc })
      }
    } else {
      currentPage.drawText('N/A', { x: rx + halfW / 2 - 8, y: y - hdrH - photoH / 2, size: 9, font, color: C.textLight })
    }
    currentPage.drawRectangle({ x: rx, y: y - hdrH - photoH - footH, width: halfW, height: footH, color: C.despuesGray })
    currentPage.drawText('Despues', { x: rx + halfW / 2 - 14, y: y - hdrH - photoH - footH + 3, size: 7, font: fontB, color: C.white })

    y -= totalH + 12
    itemsOnPage++
  }

  return await doc.save()
}

export async function downloadPMExecutedPdf(submission, assets = []) {
  const bytes = await generatePMExecutedPdf(submission, assets)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const fd = submission?.payload?.payload?.data?.formData || submission?.payload?.data?.formData || {}
  a.download = `mtto_ejecutado_${fd.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}
