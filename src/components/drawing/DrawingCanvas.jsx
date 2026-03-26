import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * DrawingCanvas
 * - 1 dedo: dibujar (lápiz / borrador)
 * - 2 dedos: pan + zoom (pinch)
 *
 * Props:
 * - backgroundImage?: string (dataUrl o path)
 * - initialDataUrl?: string (PNG existente, se usa como "raster base" si no hay strokes)
 * - onChange?: (drawingObject, pngDataUrl) => void
 * - tool?: 'pencil' | 'eraser'
 * - strokeColor?: string
 * - strokeWidth?: number (en pixeles de pantalla aprox, se ajusta por escala)
 */
export default function DrawingCanvas({
  backgroundImage,
  initialDataUrl,
  onChange,
  tool = 'pencil',
  strokeColor = '#111827',
  strokeWidth = 4,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  // "World" size: si hay imagen, usamos su tamaño natural; si no, un tamaño por defecto.
  const [world, setWorld] = useState({ w: 1200, h: 900 })

  // View transform: screen = world * scale + offset
  const [view, setView] = useState({ scale: 1, ox: 0, oy: 0 })

  // Guardamos strokes en coordenadas world
  const [strokes, setStrokes] = useState([]) // { tool, color, width, points:[{x,y}] }

  const bgImgRef = useRef(null)
  const rasterBaseRef = useRef(null) // initialDataUrl como raster

  const pointersRef = useRef(new Map()) // pointerId -> {x,y}
  const gestureRef = useRef(null) // {startDist, startScale, startCenter, startView}

  const drawingRef = useRef({
    isDrawing: false,
    stroke: null,
  })

  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1

  // Load background image
  useEffect(() => {
    if (!backgroundImage) {
      bgImgRef.current = null
      // Mantener world actual
      requestRender()
      return
    }

    const img = new Image()
    img.onload = () => {
      bgImgRef.current = img
      setWorld({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
    }
    img.onerror = () => {
      bgImgRef.current = null
    }
    img.src = backgroundImage
  }, [backgroundImage])

  // Load initial raster
  useEffect(() => {
    if (!initialDataUrl) {
      rasterBaseRef.current = null
      requestRender()
      return
    }
    const img = new Image()
    img.onload = () => {
      rasterBaseRef.current = img
      requestRender()
    }
    img.onerror = () => {
      rasterBaseRef.current = null
    }
    img.src = initialDataUrl
  }, [initialDataUrl])

  // Fit world to available space whenever world changes or container resizes
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const fit = () => {
      const w = wrap.clientWidth || 1
      const h = wrap.clientHeight || 1
      const scale = Math.min(w / world.w, h / world.h) * 0.98
      const ox = (w - world.w * scale) / 2
      const oy = (h - world.h * scale) / 2
      setView({ scale, ox, oy })
    }

    fit()

    const ro = new ResizeObserver(() => fit())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [world.w, world.h])

  const toWorld = (sx, sy) => {
    const { scale, ox, oy } = view
    return { x: (sx - ox) / scale, y: (sy - oy) / scale }
  }

  const clampView = (next) => {
    const wrap = wrapRef.current
    if (!wrap) return next
    const w = wrap.clientWidth || 1
    const h = wrap.clientHeight || 1

    const minScale = Math.min(w / world.w, h / world.h) * 0.5
    const maxScale = Math.min(w / world.w, h / world.h) * 6

    let scale = Math.max(minScale, Math.min(maxScale, next.scale))

    // Mantener el mundo más o menos dentro de la vista
    const worldW = world.w * scale
    const worldH = world.h * scale

    const minOx = Math.min(0, w - worldW)
    const maxOx = Math.max(0, w - worldW)
    const minOy = Math.min(0, h - worldH)
    const maxOy = Math.max(0, h - worldH)

    const ox = Math.max(minOx, Math.min(maxOx, next.ox))
    const oy = Math.max(minOy, Math.min(maxOy, next.oy))

    return { scale, ox, oy }
  }

  // Rendering
  const rafRef = useRef(null)
  const requestRender = () => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      render()
    })
  }

  const render = () => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const w = wrap.clientWidth || 1
    const h = wrap.clientHeight || 1

    // Resize canvas with DPR
    const cw = Math.floor(w * dpr)
    const ch = Math.floor(h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Background
    if (bgImgRef.current) {
      ctx.save()
      ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy)
      ctx.drawImage(bgImgRef.current, 0, 0, world.w, world.h)
      ctx.restore()
    } else {
      // subtle background
      ctx.fillStyle = '#F3F4F6'
      ctx.fillRect(0, 0, w, h)
    }

    // Raster base (si existe) en coordenadas world
    if (rasterBaseRef.current && !strokes.length) {
      ctx.save()
      ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy)
      ctx.drawImage(rasterBaseRef.current, 0, 0, world.w, world.h)
      ctx.restore()
    }

    // Strokes
    ctx.save()
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const s of strokes) {
      if (!s.points || s.points.length < 2) continue
      ctx.beginPath()
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = s.tool === 'eraser' ? 'rgba(0,0,0,1)' : s.color
      // width en world: queremos que "strokeWidth" sea similar en pantalla
      const widthWorld = Math.max(0.5, (s.width || 4) / view.scale)
      ctx.lineWidth = widthWorld

      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
      ctx.stroke()
    }

    // current stroke (si aplica)
    const cur = drawingRef.current.stroke
    if (cur && cur.points && cur.points.length >= 2) {
      ctx.beginPath()
      ctx.globalCompositeOperation = cur.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = cur.tool === 'eraser' ? 'rgba(0,0,0,1)' : cur.color
      ctx.lineWidth = Math.max(0.5, (cur.width || 4) / view.scale)
      ctx.moveTo(cur.points[0].x, cur.points[0].y)
      for (let i = 1; i < cur.points.length; i++) ctx.lineTo(cur.points[i].x, cur.points[i].y)
      ctx.stroke()
    }

    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'
  }

  useEffect(() => {
    requestRender()
  }, [view, strokes, world.w, world.h])

  // Export function: render to offscreen world-sized PNG
  const exportToPng = () => {
    const off = document.createElement('canvas')
    off.width = world.w
    off.height = world.h
    const ctx = off.getContext('2d')
    ctx.clearRect(0, 0, world.w, world.h)

    if (bgImgRef.current) {
      ctx.drawImage(bgImgRef.current, 0, 0, world.w, world.h)
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, world.w, world.h)
    }

    if (rasterBaseRef.current && !strokes.length) {
      ctx.drawImage(rasterBaseRef.current, 0, 0, world.w, world.h)
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of strokes) {
      if (!s.points || s.points.length < 2) continue
      ctx.beginPath()
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = s.tool === 'eraser' ? 'rgba(0,0,0,1)' : s.color
      ctx.lineWidth = Math.max(0.5, s.width || 4)
      ctx.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    return off.toDataURL('image/png')
  }

  const commitChange = (nextStrokes) => {
    if (!onChange) return
    const drawingObject = {
      world,
      strokes: nextStrokes,
      backgroundImage: backgroundImage || null,
    }
    onChange(drawingObject, exportToPng())
  }

  // Pointer / gesture handling
  const getLocalPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startStroke = (p) => {
    const wpt = toWorld(p.x, p.y)
    drawingRef.current.isDrawing = true
    drawingRef.current.stroke = {
      tool,
      color: strokeColor,
      width: strokeWidth,
      points: [wpt],
    }
  }

  const extendStroke = (p) => {
    const cur = drawingRef.current.stroke
    if (!cur) return
    const wpt = toWorld(p.x, p.y)
    cur.points.push(wpt)
    requestRender()
  }

  const endStroke = () => {
    const cur = drawingRef.current.stroke
    if (!cur) return
    drawingRef.current.isDrawing = false
    drawingRef.current.stroke = null
    setStrokes(prev => {
      const next = [...prev, cur]
      // commit once at end to reduce work
      setTimeout(() => commitChange(next), 0)
      return next
    })
  }

  const onPointerDown = (e) => {
    if (!canvasRef.current) return
    canvasRef.current.setPointerCapture?.(e.pointerId)
    const p = getLocalPoint(e)
    pointersRef.current.set(e.pointerId, p)

    // If two pointers => gesture mode
    if (pointersRef.current.size === 2) {
      // stop current stroke if any
      if (drawingRef.current.isDrawing) endStroke()

      const pts = Array.from(pointersRef.current.values())
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy) || 1
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      gestureRef.current = {
        startDist: dist,
        startScale: view.scale,
        startCenter: center,
        startView: { ...view },
      }
      return
    }

    // One pointer => draw
    if (pointersRef.current.size === 1) {
      startStroke(p)
      requestRender()
    }
  }

  const onPointerMove = (e) => {
    const p = getLocalPoint(e)
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, p)
    }

    // Gesture
    if (pointersRef.current.size === 2 && gestureRef.current) {
      const pts = Array.from(pointersRef.current.values())
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy) || 1
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }

      const g = gestureRef.current
      const ratio = dist / (g.startDist || 1)

      // new scale
      let nextScale = g.startScale * ratio

      // keep center stable: compute world center at start and map to new scale
      const startWorldCenter = {
        x: (g.startCenter.x - g.startView.ox) / g.startView.scale,
        y: (g.startCenter.y - g.startView.oy) / g.startView.scale,
      }

      let nextOx = center.x - startWorldCenter.x * nextScale
      let nextOy = center.y - startWorldCenter.y * nextScale

      const clamped = clampView({ scale: nextScale, ox: nextOx, oy: nextOy })
      setView(clamped)
      requestRender()
      return
    }

    // Draw
    if (drawingRef.current.isDrawing && pointersRef.current.size === 1) {
      extendStroke(p)
    }
  }

  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size < 2) {
      gestureRef.current = null
    }

    if (drawingRef.current.isDrawing && pointersRef.current.size === 0) {
      endStroke()
    }
  }

  const onPointerCancel = (e) => {
    pointersRef.current.delete(e.pointerId)
    gestureRef.current = null
    if (drawingRef.current.isDrawing) endStroke()
  }

  return (
    <div ref={wrapRef} className="w-full h-full min-h-[320px] relative bg-white rounded-xl border border-gray-200 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      {/* Hint overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="px-2 py-1 rounded-lg bg-black/50 text-white text-[11px]">
          1 dedo: dibujar · 2 dedos: mover/zoom
        </div>
      </div>
    </div>
  )
}
