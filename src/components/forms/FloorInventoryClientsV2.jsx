import { Plus, Trash2 } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import PhotoUpload from '../ui/PhotoUpload'
import { useAppStore } from '../../hooks/useAppStore'

const cellClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"

const labelByTipo = (t) => (t === 'ancla' ? 'Cliente Ancla' : 'Cliente Colo')

export default function FloorInventoryClientsV2() {
  const {
    equipmentInventoryV2Data,
    addFloorClientV2,
    removeFloorClientV2,
    updateFloorClientFieldV2,
    addCabinetV2,
    removeCabinetV2,
    updateCabinetFieldV2,
    updateEquipmentV2Field,
  } = useAppStore()

  const clientes = equipmentInventoryV2Data?.piso?.clientes || []
  const fotos = equipmentInventoryV2Data?.fotos || {}

  return (
    <div className="space-y-4">

      {/* Header + add buttons */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="mb-3">
          <div className="font-extrabold text-gray-900">Inventario de equipos en piso</div>
          <div className="text-xs text-gray-500 mt-1">Secciones por cliente (Ancla / Colo) y gabinetes.</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addFloorClientV2('ancla')}
            className="py-2.5 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Ancla
          </button>
          <button
            type="button"
            onClick={() => addFloorClientV2('colo')}
            className="py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Colo
          </button>
        </div>
      </div>

      {clientes.map((c, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Client header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div>
              <div className="font-extrabold text-gray-900 text-sm">{labelByTipo(c.tipoCliente)}</div>
              <div className="text-xs text-gray-500">Cliente #{idx + 1}</div>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => removeFloorClientV2(idx)}
              className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-500 bg-white hover:border-red-300 hover:text-red-500 active:scale-95 flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Client fields */}
          <div className="p-4 space-y-0">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipo"
                value={c.tipoCliente || 'colo'}
                onChange={(e) => updateFloorClientFieldV2(idx, 'tipoCliente', e.target.value)}
                options={[
                  { value: 'ancla', label: 'Ancla' },
                  { value: 'colo', label: 'Colo' },
                ]}
              />
              <Input
                label="Nombre cliente"
                placeholder="Ej: Operador X"
                value={c.nombreCliente || ''}
                onChange={(e) => updateFloorClientFieldV2(idx, 'nombreCliente', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Área arrendada"
                placeholder="m²"
                value={c.areaArrendada || ''}
                onChange={(e) => updateFloorClientFieldV2(idx, 'areaArrendada', e.target.value)}
              />
              <Input
                label="Área en uso"
                placeholder="m²"
                value={c.areaEnUso || ''}
                onChange={(e) => updateFloorClientFieldV2(idx, 'areaEnUso', e.target.value)}
              />
            </div>
            <Input
              label="Placa de equipos"
              placeholder="Ej: placa / identificadores"
              value={c.placaEquipos || ''}
              onChange={(e) => updateFloorClientFieldV2(idx, 'placaEquipos', e.target.value)}
            />

            {/* Gabinetes */}
            <div className="mt-2 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
                <div className="font-extrabold text-gray-900 text-sm">Gabinetes</div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => addCabinetV2(idx)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-primary text-primary bg-white active:scale-95 flex items-center gap-1"
                >
                  <Plus size={13} /> Agregar
                </button>
              </div>

              {/* Mobile: cards */}
              <div className="block md:hidden p-3 space-y-3">
                {(c.gabinetes || []).length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-3">
                    Sin gabinetes. Toca "Agregar".
                  </div>
                )}
                {(c.gabinetes || []).map((g, j) => (
                  <div key={j} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs font-extrabold text-gray-700">Gabinete #{j + 1}</div>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => removeCabinetV2(idx, j)}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 active:scale-95 flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mb-2">
                      <div className="text-[11px] font-bold text-gray-500 mb-1">Nombre / ID</div>
                      <input className={cellClass} value={g.gabinete || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'gabinete', e.target.value)} placeholder="Ej: Gab-01" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[['Largo', 'largo'], ['Ancho', 'ancho'], ['Alto', 'alto'], ['Foto #', 'fotoRef']].map(([lbl, field]) => (
                        <div key={field}>
                          <div className="text-[11px] font-bold text-gray-500 mb-1">{lbl}</div>
                          <input className={cellClass} value={g[field] || ''} onChange={(e) => updateCabinetFieldV2(idx, j, field, e.target.value)} placeholder={field === 'fotoRef' ? '#' : 'm'} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[700px] w-full">
                  <thead className="bg-white">
                    <tr className="text-left text-xs font-extrabold text-gray-700">
                      <th className="p-3">Gabinete</th>
                      <th className="p-3">Largo</th>
                      <th className="p-3">Ancho</th>
                      <th className="p-3">Alto</th>
                      <th className="p-3">Foto #</th>
                      <th className="p-3 w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(c.gabinetes || []).map((g, j) => (
                      <tr key={j} className="border-t border-gray-200">
                        <td className="p-2"><input className={cellClass} value={g.gabinete || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'gabinete', e.target.value)} placeholder="Ej: Gab-01" /></td>
                        <td className="p-2"><input className={cellClass} value={g.largo || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'largo', e.target.value)} placeholder="m" /></td>
                        <td className="p-2"><input className={cellClass} value={g.ancho || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'ancho', e.target.value)} placeholder="m" /></td>
                        <td className="p-2"><input className={cellClass} value={g.alto || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'alto', e.target.value)} placeholder="m" /></td>
                        <td className="p-2"><input className={cellClass} value={g.fotoRef || ''} onChange={(e) => updateCabinetFieldV2(idx, j, 'fotoRef', e.target.value)} placeholder="Ej: 3" /></td>
                        <td className="p-2">
                          <button type="button" onClick={() => removeCabinetV2(idx, j)} className="w-8 h-8 rounded-xl border border-gray-200 text-gray-500 hover:text-red-500 active:scale-95 flex items-center justify-center">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-2 text-[11px] text-gray-400">
                Tip: agrega múltiples filas si el cliente tiene varios racks.
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Plano de planta */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="font-extrabold text-gray-900 mb-1">Plano de planta y equipos</div>
        <div className="text-xs text-gray-500 mb-4">Fotografía o imagen del plano de planta y distribución de equipos del sitio.</div>
        <PhotoUpload
          type="after"
          photo={fotos.fotoPlanoPlanta || null}
          onCapture={(data) => updateEquipmentV2Field('fotos', 'fotoPlanoPlanta', data)}
          onRemove={() => updateEquipmentV2Field('fotos', 'fotoPlanoPlanta', null)}
          formCode="equipment-v2"
          assetType="equipmentV2:fotoPlanoPlanta"
        />
      </div>
    </div>
  )
}
