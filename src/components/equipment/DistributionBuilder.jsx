
import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, RotateCw, Trash2, Image as ImageIcon, Download, X, HelpCircle, Hand } from 'lucide-react'
import PhotoUpload from '../ui/PhotoUpload'

import templateDistribucion from '../../assets/equipment/template_distribucion_torre.png'

import tri from '../../assets/equipment/triangulo_estabilizador.png'
import herraje from '../../assets/equipment/herraje_vacio.png'
import soporte from '../../assets/equipment/soporte_vacio.png'
import pararrayo from '../../assets/equipment/pararrayo.png'
import microonda from '../../assets/equipment/microonda.png'
import antena1 from '../../assets/equipment/antena_rf.png'
import antena2 from '../../assets/equipment/antena_rf_2.png'
import rru from '../../assets/equipment/rru.png'
import luz from '../../assets/equipment/luz_obstruccion.png'

const PALETTE = [
  { type: 'triangulo', label: 'Triángulo Estabilizador', src: tri, w: 130, h: 70 },
  { type: 'herraje', label: 'Herraje Vacío', src: herraje, w: 90, h: 90 },
  { type: 'soporte', label: 'Soporte Vacío', src: soporte, w: 55, h: 120 },
  { type: 'pararrayo', label: 'Pararrayo', src: pararrayo, w: 45, h: 140 },
  { type: 'microonda', label: 'Microonda', src: microonda, w: 80, h: 80 },
  { type: 'antena_rf', label: 'Antena RF', src: antena1, w: 38, h: 130 },
  { type: 'antena_rf_2', label: 'Antena RF (2)', src: antena2, w: 38, h: 90 },
  { type: 'rru', label: 'RRU', src: rru, w: 60, h: 85 },
  { type: 'luz', label: 'Luz Obstrucción', src: luz, w: 80, h: 70 },
]

const getPaletteByType = (t) => PALETTE.find(p => p.type === t)

const loadImage = (src) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.src = src
})

export default function DistributionBuilder({
  scene,
  pngDataUrl,
  fotoTorreDataUrl,
  onSaveScene,
  onSaveFoto,
  variant = 'card', // 'card' | 'fullscreen'
  onRequestFullscreen = null,
}) {
  const stageRef = useRef(null)
  const rafRef = useRef(null)
  const pointersRef = useRef(new Map()) // pointerId -> {x,y}
  const gestureRef = useRef({
    mode: null, // 'drag' | 'pinch'
    id: null,
    start: null,
  })
  const [objects, setObjects] = useState(() => scene?.objects || [])
  const [selectedId, setSelectedId] = useState(null)
  const [placingType, setPlacingType] = useState(null)
  const [showHelp, setShowHelp] = useState(true)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)

  const isFullscreen = variant === 'fullscreen'

  useEffect(() => {
    if (isFullscreen) setShowHelp(false)
  }, [isFullscreen])

  useEffect(() => {
    setObjects(scene?.objects || [])
  }, [scene])

  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)')
    const set = () => setIsCoarsePointer(!!mq?.matches)
    set()
    if (!mq?.addEventListener) return
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  const selected = useMemo(() => objects.find(o => o.id === selectedId), [objects, selectedId])

  const addAt = (type, x, y) => {
    const p = getPaletteByType(type)
    if (!p) return
    const id = `${type}-${Math.random().toString(36).slice(2, 9)}`
    const obj = clampObjectToStage({ id, type, x, y, w: p.w, h: p.h, rot: 0 })
    setObjects(prev => [...prev, obj])
    setSelectedId(id)
  }

  const onDrop = (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-pti-piece')
    if (!type) return
    const rect = stageRef.current.getBoundingClientRect()
    addAt(type, e.clientX - rect.left - 30, e.clientY - rect.top - 30)
  }

  const onDragOver = (e) => e.preventDefault()

  const onStagePointerDown = (e) => {
    // En móvil (pointer coarse) usamos “tocar para colocar”, porque HTML5 drag&drop no es confiable.
    if (placingType) {
      const rect = stageRef.current.getBoundingClientRect()
      const p = getPaletteByType(placingType)
      if (!p) return
      const x = e.clientX - rect.left - p.w / 2
      const y = e.clientY - rect.top - p.h / 2
      addAt(placingType, x, y)
      setShowHelp(false)
      return
    }
    // Si no estamos colocando, un toque en el fondo deselecciona.
    if (e.target === stageRef.current) setSelectedId(null)
  }

  // --- Gestos (móvil) ---
  const scheduleUpdate = (updater) => {
    // Throttle a ~60fps para mejorar sensibilidad en teléfonos
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setObjects(prev => updater(prev))
    })
  }

  const setPointer = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  const getTwoPointers = () => {
    const arr = Array.from(pointersRef.current.entries())
    if (arr.length < 2) return null
    return { a: arr[0], b: arr[1] }
  }

  const onPiecePointerDown = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(id)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setPointer(e)

    const obj = objects.find(o => o.id === id)
    if (!obj) return

    const two = getTwoPointers()
    if (two) {
      // Pinch to zoom (dos dedos)
      const [p1, v1] = two.a
      const [p2, v2] = two.b
      const dx = v2.x - v1.x
      const dy = v2.y - v1.y
      const dist = Math.hypot(dx, dy)
      gestureRef.current = {
        mode: 'pinch',
        id,
        start: {
          dist,
          w: obj.w,
          h: obj.h,
          cx: obj.x + obj.w / 2,
          cy: obj.y + obj.h / 2,
        }
      }
      return
    }

    // Drag (un dedo)
    gestureRef.current = {
      mode: 'drag',
      id,
      start: {
        x: e.clientX,
        y: e.clientY,
        ox: obj.x,
        oy: obj.y,
      }
    }
  }

  const onPiecePointerMove = (e, id) => {
    const g = gestureRef.current
    if (!g?.mode || g.id !== id) return
    e.preventDefault()
    e.stopPropagation()
    setPointer(e)

    if (g.mode === 'drag') {
      const dx = e.clientX - g.start.x
      const dy = e.clientY - g.start.y
      scheduleUpdate(prev => prev.map(o => (o.id === id ? clampObjectToStage({ ...o, x: g.start.ox + dx, y: g.start.oy + dy }) : o)))
      return
    }

    if (g.mode === 'pinch') {
      const two = getTwoPointers()
      if (!two) return
      const v1 = two.a[1]
      const v2 = two.b[1]
      const dx = v2.x - v1.x
      const dy = v2.y - v1.y
      const dist = Math.hypot(dx, dy)
      const ratio = Math.max(0.35, Math.min(2.8, dist / (g.start.dist || 1)))
      scheduleUpdate(prev => prev.map(o => {
        if (o.id !== id) return o
        const w = Math.max(24, g.start.w * ratio)
        const h = Math.max(24, g.start.h * ratio)
        // mantenemos el centro para que “no se vaya” al escalar
        const x = g.start.cx - w / 2
        const y = g.start.cy - h / 2
        return clampObjectToStage({ ...o, w, h, x, y })
      }))
    }
  }

  const onPiecePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2 && gestureRef.current.mode === 'pinch') {
      // si se levantó un dedo, pasamos a drag con el dedo restante (si aplica)
      gestureRef.current.mode = null
      gestureRef.current.id = null
      gestureRef.current.start = null
    }
    if (pointersRef.current.size === 0) {
      gestureRef.current.mode = null
      gestureRef.current.id = null
      gestureRef.current.start = null
    }
  }

  // Nota: usamos Pointer Events para que el arrastre sea más sensible.

  const rotate = (dir) => {
    if (!selectedId) return
    setObjects(prev => prev.map(o => (o.id === selectedId ? { ...o, rot: (o.rot + (dir === 'cw' ? 15 : -15)) } : o)))
  }

  const removeSelected = () => {
    if (!selectedId) return
    setObjects(prev => prev.filter(o => o.id !== selectedId))
    setSelectedId(null)
  }

  const clearAll = () => {
    setObjects([])
    setSelectedId(null)
  }

  const exportPng = async () => {
    const stage = stageRef.current
    if (!stage) return ''
    const rect = stage.getBoundingClientRect()

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(rect.width)
    canvas.height = Math.floor(rect.height)
    const ctx = canvas.getContext('2d')

    // fondo
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // plantilla
    const tpl = await loadImage(templateDistribucion)
    ctx.drawImage(tpl, 0, 0, canvas.width, canvas.height)

    for (const o of objects) {
      const p = getPaletteByType(o.type)
      if (!p) continue
      const img = await loadImage(p.src)
      const cx = o.x + o.w / 2
      const cy = o.y + o.h / 2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((o.rot || 0) * Math.PI / 180)
      ctx.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h)
      ctx.restore()
    }

    return canvas.toDataURL('image/png')
  }

  const save = async () => {
    const png = await exportPng()
    onSaveScene?.({ objects }, png)
  }

  return (
    <div className={isFullscreen ? 'pti-landscape-flex h-full gap-3 p-3' : 'grid grid-cols-1 lg:grid-cols-12 gap-4'}>
      {/* Stage */}
      <div className={isFullscreen ? 'flex-1 min-h-0' : 'lg:col-span-8'}>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <div className="font-extrabold text-gray-900">Distribución de equipos en torre</div>
            <div className="flex-1" />
            {!isFullscreen && typeof onRequestFullscreen === 'function' && (
              <button
                type="button"
                onClick={onRequestFullscreen}
                className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center gap-2"
              >
                <ImageIcon size={18} /> Pantalla completa
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHelp(s => !s)}
              className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center gap-2"
              aria-label="Ayuda"
            >
              <HelpCircle size={18} /> Ayuda
            </button>
            <button type="button" onClick={save} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center gap-2">
              <Download size={18} /> Guardar croquis
            </button>
            <button type="button" onClick={clearAll} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center gap-2">
              <Trash2 size={18} /> Limpiar
            </button>
          </div>

          {showHelp && (
            <div className="p-3 bg-gray-50 border-b border-gray-100">
              <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Hand size={16} /> Cómo usarlo
              </div>
              {isCoarsePointer ? (
                <ul className="mt-2 text-xs text-gray-600 space-y-1">
                  <li>1) Toca una pieza abajo para activar <span className="font-bold">modo colocar</span>.</li>
                  <li>2) Toca el croquis para <span className="font-bold">colocar</span> la pieza.</li>
                  <li>3) Para <span className="font-bold">mover</span>: arrastra la pieza en el croquis.</li>
                  <li>4) Para <span className="font-bold">rotar / quitar</span>: selecciona la pieza y usa los botones.</li>
                </ul>
              ) : (
                <ul className="mt-2 text-xs text-gray-600 space-y-1">
                  <li>1) Arrastra una pieza desde el panel derecho hacia el croquis.</li>
                  <li>2) Para mover: arrastra la pieza. Para rotar / quitar: selecciónala y usa los botones.</li>
                </ul>
              )}
            </div>
          )}

          <div
            ref={stageRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPointerDown={onStagePointerDown}
            className={isFullscreen ? 'relative w-full h-full bg-white' : 'relative w-full aspect-[3/4] bg-white'}
            style={{
              touchAction: 'none',
              backgroundImage: `url(${templateDistribucion})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {objects.map((o) => {
              const p = getPaletteByType(o.type)
              if (!p) return null
              const isSel = o.id === selectedId
              return (
                <img
                  key={o.id}
                  src={p.src}
                  alt={p.label}
                  onPointerDown={(e) => onPiecePointerDown(e, o.id)}
                  onPointerMove={(e) => onPiecePointerMove(e, o.id)}
                  onPointerUp={onPiecePointerUp}
                  onPointerCancel={onPiecePointerUp}
                  className={`absolute select-none cursor-grab active:cursor-grabbing ${isSel ? 'ring-4 ring-primary/40 rounded-lg' : ''}`}
                  style={{
                    left: o.x,
                    top: o.y,
                    width: o.w,
                    height: o.h,
                    transform: `rotate(${o.rot || 0}deg)`,
                    touchAction: 'none',
                  }}
                  draggable={false}
                />
              )
            })}
          </div>

          {/* Selected controls */}
          <div className="p-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!selectedId} onClick={() => rotate('ccw')} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white disabled:opacity-40 active:scale-95 flex items-center gap-2">
              <RotateCcw size={18} /> Rotar
            </button>
            <button type="button" disabled={!selectedId} onClick={() => rotate('cw')} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white disabled:opacity-40 active:scale-95 flex items-center gap-2">
              <RotateCw size={18} /> Rotar
            </button>
            <button type="button" disabled={!selectedId} onClick={removeSelected} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white disabled:opacity-40 active:scale-95 flex items-center gap-2">
              <Trash2 size={18} /> Quitar pieza
            </button>

            <div className="flex-1" />
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <ImageIcon size={14} /> {isCoarsePointer ? 'Toca una pieza y luego toca el croquis.' : 'Arrastra piezas desde el panel derecho.'}
            </div>
          </div>
        </div>

        {pngDataUrl && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-3">
            <div className="text-sm font-extrabold text-gray-900 mb-2">Vista guardada</div>
            <img src={pngDataUrl} alt="Croquis guardado" className="w-full rounded-xl border border-gray-200" />
          </div>
        )}
      </div>

      {/* Palette + photo */}
      <div className={isFullscreen ? 'pti-landscape-side w-full space-y-3' : 'lg:col-span-4 space-y-4'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-extrabold text-gray-900">Piezas</div>
            <div className="flex-1" />
            {placingType && (
              <button
                type="button"
                onClick={() => setPlacingType(null)}
                className="px-3 py-2 rounded-xl text-xs font-extrabold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center gap-2"
              >
                <X size={14} /> Colocando: {getPaletteByType(placingType)?.label}
              </button>
            )}
          </div>

          {/* Mobile: tap-to-place (no HTML5 drag) */}
          <div className="block lg:hidden">
            <div className="text-xs text-gray-500 mb-2">Toca una pieza para seleccionarla. Luego toca el croquis para colocarla.</div>
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 ${isFullscreen ? 'max-h-[55svh]' : 'max-h-72'}`}
            >
              {PALETTE.map((p) => {
                const active = placingType === p.type
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setPlacingType(active ? null : p.type)}
                    className={`border-2 rounded-2xl p-2 bg-white transition-all active:scale-95 ${active ? 'border-primary ring-4 ring-primary/10' : 'border-gray-200'}`}
                  >
                    <img src={p.src} alt={p.label} className="w-full h-14 object-contain" />
                    <div className="text-[11px] font-bold text-gray-700 mt-2 leading-tight text-left">{p.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Desktop: drag-and-drop */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              {PALETTE.map((p) => (
                <div
                  key={p.type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('application/x-pti-piece', p.type)}
                  className="border-2 border-gray-200 rounded-2xl p-3 bg-white hover:border-primary transition-all cursor-grab active:scale-95"
                >
                  <img src={p.src} alt={p.label} className="w-full h-20 object-contain" />
                  <div className="text-[11px] font-bold text-gray-700 mt-2 leading-tight">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="font-extrabold text-gray-900 mb-3">Foto de Torre Completa</div>
          <PhotoUpload
            type="after"
            photo={fotoTorreDataUrl}
            onCapture={(data) => onSaveFoto?.(data)}
            onRemove={() => onSaveFoto?.('')}
            formCode="equipment"
            assetType="equipment:fotoTorre"
          />
          <p className="text-xs text-gray-500 mt-2">
            Esta foto se guarda como evidencia junto al croquis.
          </p>
        </div>

        {selected && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-sm font-extrabold text-gray-900 mb-1">Pieza seleccionada</div>
            <div className="text-xs text-gray-500">{getPaletteByType(selected.type)?.label}</div>
          </div>
        )}
      </div>
    </div>
  )
}
const clampObjectToStage = (obj) => {
  const stage = stageRef.current
  if (!stage) return obj
  const rect = stage.getBoundingClientRect()
  const maxX = Math.max(0, rect.width - (obj.w || 0))
  const maxY = Math.max(0, rect.height - (obj.h || 0))
  return {
    ...obj,
    x: Math.max(0, Math.min(maxX, obj.x || 0)),
    y: Math.max(0, Math.min(maxY, obj.y || 0)),
  }
}


