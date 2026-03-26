import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../hooks/useAppStore'
import PhotoUpload from '../ui/PhotoUpload'
import Input from '../ui/Input'
import AutoTextarea from '../ui/AutoTextarea'

const cellClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
const selectClass = cellClass

const ORIENTACION_OPTS = ['', '0°', '15°', '30°', '45°', '60°', '75°', '90°', '105°', '120°', '135°', '150°', '165°', '180°', '195°', '210°', '225°', '240°', '255°', '270°', '285°', '300°', '315°', '330°', '345°']
const TIPO_EQUIPO_OPTS = ['', 'RF', 'RRU', 'MW', 'Omni', 'Herraje Vacío', 'Soporte Vacío', 'Otro']

function calcArea(alto, ancho, tipoEquipo) {
  if (tipoEquipo === 'MW') {
    // Circular: area = π × (diámetro/2)²
    const d = parseFloat(alto) // alto field used as diameter for MW
    if (Number.isFinite(d) && d > 0) return (Math.PI * Math.pow(d / 2, 2)).toFixed(4)
    return '0'
  }
  const a = parseFloat(alto)
  const b = parseFloat(ancho)
  if (Number.isFinite(a) && Number.isFinite(b)) return (a * b).toFixed(4)
  return '0'
}

export default function CarrierSection() {
  const { equipmentInventoryV2Data, updateEquipmentV2Carriers, queueCarrierPhoto } = useAppStore()
  const carriers = equipmentInventoryV2Data?.carriers || []

  const emptyItem = () => ({ alturaMts: '', orientacion: '', tipoEquipo: '', cantidad: '', alto: '', ancho: '', profundidad: '', carrier: '', comentario: '' })

  const addCarrier = () => {
    updateEquipmentV2Carriers([...carriers, { nombre: '', items: [emptyItem()], foto1: null, foto2: null, foto3: null }])
  }

  const removeCarrier = (idx) => updateEquipmentV2Carriers(carriers.filter((_, i) => i !== idx))

  const updateCarrierField = (cIdx, field, value) =>
    updateEquipmentV2Carriers(carriers.map((c, i) => i === cIdx ? { ...c, [field]: value } : c))

  const addItem = (cIdx) =>
    updateEquipmentV2Carriers(carriers.map((c, i) =>
      i !== cIdx ? c : { ...c, items: [...(c.items || []), emptyItem()] }
    ))

  const removeItem = (cIdx, rIdx) =>
    updateEquipmentV2Carriers(carriers.map((c, i) => {
      if (i !== cIdx) return c
      const items = (c.items || []).filter((_, ri) => ri !== rIdx)
      return { ...c, items: items.length ? items : [emptyItem()] }
    }))

  const updateItemField = (cIdx, rIdx, field, value) =>
    updateEquipmentV2Carriers(carriers.map((c, i) => {
      if (i !== cIdx) return c
      return { ...c, items: (c.items || []).map((it, ri) => ri === rIdx ? { ...it, [field]: value } : it) }
    }))

  return (
    <div className="space-y-4">

      {/* Add carrier button */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="mb-3">
          <div className="font-extrabold text-gray-900">Carriers</div>
          <div className="text-xs text-gray-500 mt-1">Un bloque por cada carrier del sitio.</div>
        </div>
        <button
          type="button"
          onClick={addCarrier}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Agregar Carrier
        </button>
      </div>

      {carriers.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
          Sin carriers. Toca "Agregar Carrier".
        </div>
      )}

      {carriers.map((carrier, cIdx) => (
        <div key={cIdx} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">

          {/* Carrier header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center flex-shrink-0">
              {cIdx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="w-full text-sm font-semibold text-gray-900 bg-transparent border-0 outline-none placeholder-gray-400 truncate"
                value={carrier.nombre || ''}
                onChange={(e) => updateCarrierField(cIdx, 'nombre', e.target.value)}
                placeholder="Nombre del carrier (ej: TIGO, Claro)"
              />
            </div>
            <button
              type="button"
              onClick={() => addItem(cIdx)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-primary text-primary active:scale-95 flex items-center gap-1 flex-shrink-0"
            >
              <Plus size={12} /> Fila
            </button>
            <button
              type="button"
              onClick={() => { if (window.confirm('¿Eliminar este carrier?')) removeCarrier(cIdx) }}
              className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 active:scale-95 flex items-center justify-center flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Mobile: item cards */}
          <div className="block md:hidden p-3 space-y-3">
            {(carrier.items || []).map((row, rIdx) => (
              <div key={rIdx} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-extrabold text-gray-700">Equipo #{rIdx + 1}</div>
                  <div className="flex-1" />
                  <button type="button" onClick={() => removeItem(cIdx, rIdx)} className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 flex items-center justify-center bg-white">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Altura (m)</div>
                    <input className={cellClass} value={row.alturaMts || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alturaMts', e.target.value)} placeholder="m" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Orientación</div>
                    <select className={selectClass} value={row.orientacion || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'orientacion', e.target.value)}>
                      {ORIENTACION_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Tipo Antena/Equipo</div>
                    <select className={selectClass} value={row.tipoEquipo || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'tipoEquipo', e.target.value)}>
                      {TIPO_EQUIPO_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Número</div>
                    <input className={cellClass} value={row.cantidad || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'cantidad', e.target.value)} placeholder="1" />
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase mb-1">Dimensiones (m)</div>
                  <div className="grid grid-cols-3 gap-2">
                    {row.tipoEquipo === 'MW' ? (
                      <div>
                        <div className="text-[11px] font-bold text-gray-500 mb-1">Diámetro</div>
                        <input className={cellClass} value={row.alto || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alto', e.target.value)} placeholder="m" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">Alto</div>
                          <input className={cellClass} value={row.alto || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alto', e.target.value)} placeholder="m" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">Ancho</div>
                          <input className={cellClass} value={row.ancho || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'ancho', e.target.value)} placeholder="m" />
                        </div>
                      </>
                    )}
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1">Área M2</div>
                      <div className="px-2 py-2 text-xs bg-gray-100 rounded-xl font-mono text-gray-700">{calcArea(row.alto, row.ancho, row.tipoEquipo)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Carrier</div>
                    <input className={cellClass} value={row.carrier || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'carrier', e.target.value)} placeholder="TIGO" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Comentario</div>
                    <AutoTextarea className={cellClass} value={row.comentario || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'comentario', e.target.value)} placeholder="..." />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-[11px] font-extrabold text-gray-600">
                  <th className="p-2">Altura</th><th className="p-2">Orient.</th><th className="p-2">Tipo</th><th className="p-2">Núm.</th>
                  <th className="p-2">Alto</th><th className="p-2">Diám.</th><th className="p-2">Ancho</th><th className="p-2">Área M2</th>
                  <th className="p-2">Carrier</th><th className="p-2">Comentario</th><th className="p-2 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {(carrier.items || []).map((row, rIdx) => (
                  <tr key={rIdx} className="border-t border-gray-100">
                    <td className="p-1"><input className={cellClass} value={row.alturaMts || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alturaMts', e.target.value)} placeholder="m" /></td>
                    <td className="p-1">
                      <select className={selectClass} value={row.orientacion || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'orientacion', e.target.value)}>
                        {ORIENTACION_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                      </select>
                    </td>
                    <td className="p-1">
                      <select className={selectClass} value={row.tipoEquipo || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'tipoEquipo', e.target.value)}>
                        {TIPO_EQUIPO_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                      </select>
                    </td>
                    <td className="p-1"><input className={cellClass} value={row.cantidad || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'cantidad', e.target.value)} placeholder="1" /></td>
                    <td className="p-1">
                      {row.tipoEquipo !== 'MW'
                        ? <input className={cellClass} value={row.alto || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alto', e.target.value)} placeholder="m" />
                        : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                    </td>
                    <td className="p-1">
                      {row.tipoEquipo === 'MW'
                        ? <input className={cellClass} value={row.alto || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'alto', e.target.value)} placeholder="m" />
                        : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                    </td>
                    <td className="p-1">
                      {row.tipoEquipo !== 'MW'
                        ? <input className={cellClass} value={row.ancho || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'ancho', e.target.value)} placeholder="m" />
                        : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                    </td>
                    <td className="p-1"><div className="px-2 py-2 text-xs bg-gray-100 rounded-xl font-mono text-center text-gray-700">{calcArea(row.alto, row.ancho, row.tipoEquipo)}</div></td>
                    <td className="p-1"><input className={cellClass} value={row.carrier || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'carrier', e.target.value)} placeholder="TIGO" /></td>
                    <td className="p-1"><AutoTextarea className={cellClass} value={row.comentario || ''} onChange={(e) => updateItemField(cIdx, rIdx, 'comentario', e.target.value)} placeholder="..." /></td>
                    <td className="p-1">
                      <button type="button" onClick={() => removeItem(cIdx, rIdx)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 active:scale-95 flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Photos */}
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-600 mb-3">
              Fotos — {carrier.nombre || `Carrier #${cIdx + 1}`}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(n => (
                <div key={n}>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">Foto {n}</label>
                  <PhotoUpload
                    type="after"
                    photo={carrier[`foto${n}`] || null}
                    onCapture={(data) => {
                      updateCarrierField(cIdx, `foto${n}`, data)
                      queueCarrierPhoto(cIdx, `foto${n}`, data)
                    }}
                    onRemove={() => updateCarrierField(cIdx, `foto${n}`, null)}
                    formCode="equipment-v2"
                    assetType={`carrier:${cIdx}:foto${n}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
