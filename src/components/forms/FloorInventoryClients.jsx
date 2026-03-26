
import { Plus, Trash2 } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { useAppStore } from '../../hooks/useAppStore'

const cellClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"

const labelByTipo = (t) => (t === 'ancla' ? 'Cliente Ancla' : 'Cliente Colo')

export default function FloorInventoryClients() {
  const {
    equipmentInventoryData,
    addFloorClient,
    removeFloorClient,
    updateFloorClientField,
    addCabinet,
    removeCabinet,
    updateCabinetField,
  } = useAppStore()

  const clientes = equipmentInventoryData?.piso?.clientes || []

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-2">
        <div>
          <div className="font-extrabold text-gray-900">Inventario de equipos en piso</div>
          <div className="text-xs text-gray-500 mt-1">Secciones por cliente (Ancla / Colo) y gabinetes con dimensiones + foto #.</div>
        </div>
        <div className="flex-1" />
        <button type="button" onClick={() => addFloorClient('ancla')} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center gap-2">
          <Plus size={18} /> Agregar Ancla
        </button>
        <button type="button" onClick={() => addFloorClient('colo')} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center gap-2">
          <Plus size={18} /> Agregar Colo
        </button>
      </div>

      {clientes.map((c, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <div>
              <div className="font-extrabold text-gray-900">{labelByTipo(c.tipoCliente)}</div>
              <div className="text-xs text-gray-500">Cliente #{idx + 1}</div>
            </div>
            <div className="flex-1" />
            <button type="button" onClick={() => removeFloorClient(idx)} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white hover:border-red-300 hover:text-red-600 active:scale-95 flex items-center gap-2">
              <Trash2 size={18} /> Quitar
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                label="Tipo"
                value={c.tipoCliente || 'colo'}
                onChange={(e) => updateFloorClientField(idx, 'tipoCliente', e.target.value)}
                options={[
                  { value: 'ancla', label: 'Ancla' },
                  { value: 'colo', label: 'Colo' },
                ]}
              />
              <Input label="Nombre cliente" placeholder="Ej: Operador X" value={c.nombreCliente || ''} onChange={(e) => updateFloorClientField(idx, 'nombreCliente', e.target.value)} />
              <Input label="Área arrendada" placeholder="m²" value={c.areaArrendada || ''} onChange={(e) => updateFloorClientField(idx, 'areaArrendada', e.target.value)} />
              <Input label="Área en uso" placeholder="m²" value={c.areaEnUso || ''} onChange={(e) => updateFloorClientField(idx, 'areaEnUso', e.target.value)} />
            </div>

            <Input label="Placa de equipos" description="Texto libre." placeholder="Ej: placa/identificadores" value={c.placaEquipos || ''} onChange={(e) => updateFloorClientField(idx, 'placaEquipos', e.target.value)} />

            <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                <div className="font-extrabold text-gray-900 text-sm">Gabinetes</div>
                <div className="flex-1" />
                <button type="button" onClick={() => addCabinet(idx)} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-white active:scale-95 flex items-center gap-2">
                  <Plus size={18} /> Agregar gabinete
                </button>
              </div>

              {/* Móvil: tarjetas verticales (mejor legibilidad) */}
              <div className="block md:hidden p-3 space-y-3">
                {(c.gabinetes || []).length === 0 && (
                  <div className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-4">
                    Aún no hay gabinetes. Usa “Agregar gabinete”.
                  </div>
                )}
                {(c.gabinetes || []).map((g, j) => (
                  <div key={j} className="bg-white rounded-2xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs font-extrabold text-gray-900">Gabinete #{j + 1}</div>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => removeCabinet(idx, j)}
                        className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center justify-center"
                        aria-label="Quitar gabinete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <div className="text-[11px] font-bold text-gray-600 mb-1">Nombre / ID</div>
                        <input className={cellClass} value={g.gabinete || ''} onChange={(e) => updateCabinetField(idx, j, 'gabinete', e.target.value)} placeholder="Ej: Gab-01" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-600 mb-1">Largo</div>
                        <input className={cellClass} value={g.largo || ''} onChange={(e) => updateCabinetField(idx, j, 'largo', e.target.value)} placeholder="m" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-600 mb-1">Ancho</div>
                        <input className={cellClass} value={g.ancho || ''} onChange={(e) => updateCabinetField(idx, j, 'ancho', e.target.value)} placeholder="m" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-600 mb-1">Alto</div>
                        <input className={cellClass} value={g.alto || ''} onChange={(e) => updateCabinetField(idx, j, 'alto', e.target.value)} placeholder="m" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-600 mb-1">Foto #</div>
                        <input className={cellClass} value={g.fotoRef || ''} onChange={(e) => updateCabinetField(idx, j, 'fotoRef', e.target.value)} placeholder="Ej: 3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet: tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[860px] w-full">
                  <thead className="bg-white">
                    <tr className="text-left text-xs font-extrabold text-gray-700">
                      <th className="p-3">Gabinete</th>
                      <th className="p-3">Largo</th>
                      <th className="p-3">Ancho</th>
                      <th className="p-3">Alto</th>
                      <th className="p-3">Foto #</th>
                      <th className="p-3 w-[70px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(c.gabinetes || []).map((g, j) => (
                      <tr key={j} className="border-t border-gray-200">
                        <td className="p-3"><input className={cellClass} value={g.gabinete || ''} onChange={(e) => updateCabinetField(idx, j, 'gabinete', e.target.value)} placeholder="Ej: Gab-01" /></td>
                        <td className="p-3"><input className={cellClass} value={g.largo || ''} onChange={(e) => updateCabinetField(idx, j, 'largo', e.target.value)} placeholder="m" /></td>
                        <td className="p-3"><input className={cellClass} value={g.ancho || ''} onChange={(e) => updateCabinetField(idx, j, 'ancho', e.target.value)} placeholder="m" /></td>
                        <td className="p-3"><input className={cellClass} value={g.alto || ''} onChange={(e) => updateCabinetField(idx, j, 'alto', e.target.value)} placeholder="m" /></td>
                        <td className="p-3"><input className={cellClass} value={g.fotoRef || ''} onChange={(e) => updateCabinetField(idx, j, 'fotoRef', e.target.value)} placeholder="Ej: 3" /></td>
                        <td className="p-3">
                          <button type="button" onClick={() => removeCabinet(idx, j)} className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 bg-white hover:border-red-300 hover:text-red-600 active:scale-95 flex items-center justify-center">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 text-xs text-gray-500">
                Tip: si el cliente tiene varios racks, agrega múltiples filas.
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
