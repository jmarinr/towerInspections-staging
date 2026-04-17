import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../hooks/useAppStore'
import PhotoUpload from '../ui/PhotoUpload'
import Input from '../ui/Input'
import AutoTextarea from '../ui/AutoTextarea'

const cellClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
const selectClass = cellClass

const ORIENTACION_OPTS = ['', 'Cara 1', 'Cara 2', 'Cara 3', 'Pierna A', 'Pierna B', 'Pierna C', 'Mástil']
const TIPO_EQUIPO_OPTS = ['', 'RF', 'RRU', 'MW', 'Omni', 'Herraje Vacío', 'Soporte Vacío', 'Otro']

function calcArea(alto, ancho, tipoEquipo) {
  if (tipoEquipo === 'MW') {
    const d = parseFloat(alto)
    if (Number.isFinite(d) && d > 0) return (Math.PI * Math.pow(d / 2, 2)).toFixed(4)
    return '0'
  }
  const a = parseFloat(alto)
  const b = parseFloat(ancho)
  if (Number.isFinite(a) && Number.isFinite(b)) return (a * b).toFixed(4)
  return '0'
}

export default function TowerInventoryTableV2() {
  const { equipmentInventoryV2Data, addTowerItemV2, removeTowerItemV2, updateTowerItemFieldV2, updateEquipmentV2Field } = useAppStore()
  const items = equipmentInventoryV2Data?.torre?.items || []
  const fotos = equipmentInventoryV2Data?.fotos || {}

  return (
    <div className="space-y-4">

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <div className="flex-1">
            <div className="font-extrabold text-gray-900">Inventario de equipos en torre</div>
            <div className="text-xs text-gray-500 mt-0.5">Área M2 = Alto × Ancho (auto-calculado).</div>
          </div>
          <button
            type="button"
            onClick={addTowerItemV2}
            className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center gap-1.5 flex-shrink-0"
          >
            <Plus size={16} /> Fila
          </button>
        </div>

        {/* Mobile cards */}
        <div className="block md:hidden p-3 space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">Sin filas. Toca "+ Fila".</div>
          )}
          {items.map((row, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-extrabold text-gray-700">Equipo #{idx + 1}</div>
                <div className="flex-1" />
                <button type="button" onClick={() => removeTowerItemV2(idx)} className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 active:scale-95 flex items-center justify-center bg-white">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Row 1: Altura + Orientacion */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Altura (m)</div>
                  <input className={cellClass} type="number" min="0" value={row.alturaMts || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'alturaMts', e.target.value)} placeholder="m" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Orientación <span className="text-red-500">*</span></div>
                  <select
                    className={`${selectClass} ${!row.orientacion ? 'border-red-300 bg-red-50' : ''}`}
                    value={row.orientacion || ''}
                    onChange={(e) => updateTowerItemFieldV2(idx, 'orientacion', e.target.value)}
                  >
                    {ORIENTACION_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Tipo + Número */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Tipo Antena/Equipo</div>
                  <select className={selectClass} value={row.tipoEquipo || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'tipoEquipo', e.target.value)}>
                    {TIPO_EQUIPO_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Número</div>
                  <input className={cellClass} type="number" min="1" step="1" value={row.cantidad || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'cantidad', e.target.value)} placeholder="1" />
                </div>
              </div>

              {/* Row 3: Dimensiones */}
              <div className="mb-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase mb-1">Dimensiones (m)</div>
                <div className="grid grid-cols-4 gap-2">
                  {row.tipoEquipo === 'MW' ? (
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1">Diámetro</div>
                      <input className={cellClass} type="number" min="0" step="any" value={row.alto || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'alto', e.target.value)} placeholder="m" />
                    </div>
                  ) : (
                    <>
                      {[['Alto', 'alto'], ['Ancho', 'ancho'], ['Prof.', 'profundidad']].map(([lbl, f]) => (
                        <div key={f}>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">{lbl}</div>
                          <input className={cellClass} type="number" min="0" step="any" value={row[f] || ''} onChange={(e) => updateTowerItemFieldV2(idx, f, e.target.value)} placeholder="m" />
                        </div>
                      ))}
                    </>
                  )}
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 mb-1">Área M2</div>
                    <div className="px-3 py-2 text-sm bg-gray-100 rounded-xl font-mono text-gray-700">{calcArea(row.alto, row.ancho, row.tipoEquipo)}</div>
                  </div>
                </div>
              </div>

              {/* Row 4: Carrier + Comentario */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Carrier</div>
                  <input className={cellClass} value={row.carrier || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'carrier', e.target.value)} placeholder="Claro" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 mb-1">Comentario</div>
                  <AutoTextarea className={cellClass} value={row.comentario || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'comentario', e.target.value)} placeholder="..." />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[1200px] w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-extrabold text-gray-700">
                <th className="p-3">Altura (m)</th>
                <th className="p-3">Orientación <span className="text-red-500">*</span></th>
                <th className="p-3">Tipo Antena/Equipo</th>
                <th className="p-3">Número</th>
                <th className="p-3">Alto</th>
                <th className="p-3">Diám.</th>
                <th className="p-3">Ancho</th>
                <th className="p-3">Prof.</th>
                <th className="p-3">Área M2</th>
                <th className="p-3">Carrier</th>
                <th className="p-3">Comentario</th>
                <th className="p-3 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="p-2"><input className={cellClass} type="number" min="0" value={row.alturaMts || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'alturaMts', e.target.value)} placeholder="m" /></td>
                  <td className="p-2">
                    <select
                      className={`${selectClass} ${!row.orientacion ? 'border-red-300 bg-red-50' : ''}`}
                      value={row.orientacion || ''}
                      onChange={(e) => updateTowerItemFieldV2(idx, 'orientacion', e.target.value)}
                    >
                      {ORIENTACION_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className={selectClass} value={row.tipoEquipo || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'tipoEquipo', e.target.value)}>
                      {TIPO_EQUIPO_OPTS.map(o => <option key={o} value={o}>{o || 'Seleccione...'}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input className={cellClass} type="number" min="1" step="1" value={row.cantidad || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'cantidad', e.target.value)} placeholder="1" /></td>
                  <td className="p-2">
                    {row.tipoEquipo !== 'MW'
                      ? <input className={cellClass} type="number" min="0" step="any" value={row.alto || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'alto', e.target.value)} placeholder="m" />
                      : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                  </td>
                  <td className="p-2">
                    {row.tipoEquipo === 'MW'
                      ? <input className={cellClass} type="number" min="0" step="any" value={row.alto || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'alto', e.target.value)} placeholder="m" />
                      : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                  </td>
                  <td className="p-2">
                    {row.tipoEquipo !== 'MW'
                      ? <input className={cellClass} value={row.ancho || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'ancho', e.target.value)} placeholder="m" />
                      : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                  </td>
                  <td className="p-2">
                    {row.tipoEquipo !== 'MW'
                      ? <input className={cellClass} value={row.profundidad || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'profundidad', e.target.value)} placeholder="m" />
                      : <div className="px-2 py-2 text-xs text-gray-300 text-center">—</div>}
                  </td>
                  <td className="p-2"><div className="px-3 py-2 text-sm bg-gray-100 rounded-xl text-gray-700 font-mono text-center">{calcArea(row.alto, row.ancho, row.tipoEquipo)}</div></td>
                  <td className="p-2"><input className={cellClass} value={row.carrier || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'carrier', e.target.value)} placeholder="Claro" /></td>
                  <td className="p-2"><AutoTextarea className={cellClass} value={row.comentario || ''} onChange={(e) => updateTowerItemFieldV2(idx, 'comentario', e.target.value)} placeholder="..." /></td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeTowerItemV2(idx)} className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 bg-white hover:border-red-300 hover:text-red-600 active:scale-95 flex items-center justify-center">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fotos de torre */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="font-extrabold text-gray-900 mb-1">Fotos de torre</div>
        <div className="text-xs text-gray-500 mb-4">Evidencia fotográfica de la torre.</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Distribución de equipos en torre', 'fotoDistribucionTorre'],
            ['Foto de torre completa', 'fotoTorreCompleta'],
            ['Croquis esquemático del edificio', 'fotoCroquisEdificio'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-2">{label}</label>
              <PhotoUpload
                type="after"
                photo={fotos[key] || null}
                onCapture={(data) => updateEquipmentV2Field('fotos', key, data)}
                onRemove={() => updateEquipmentV2Field('fotos', key, null)}
                formCode="equipment-v2"
                assetType={`equipmentV2:${key}`}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
