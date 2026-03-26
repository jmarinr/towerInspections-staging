
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../hooks/useAppStore'
import Input from '../ui/Input'

const cellClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"

export default function TowerInventoryTable() {
  const { equipmentInventoryData, addTowerItem, removeTowerItem, updateTowerItemField } = useAppStore()
  const items = equipmentInventoryData?.torre?.items || []

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <div>
          <div className="font-extrabold text-gray-900">Inventario de equipos en torre</div>
          <div className="text-xs text-gray-500 mt-1">Campos: Altura, Orientación, Tipo de equipo, Cantidad, Dimensiones, Área m², Carrier.</div>
        </div>
        <div className="flex-1" />
        <button type="button" onClick={addTowerItem} className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-primary text-primary bg-primary/5 active:scale-95 flex items-center gap-2">
          <Plus size={18} /> Agregar fila
        </button>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden p-4 space-y-4">
        {items.length === 0 && (
          <div className="text-sm text-gray-500">Aún no hay filas. Toca “Agregar fila”.</div>
        )}

        {items.map((row, idx) => (
          <div key={idx} className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-extrabold text-gray-900">Fila {idx + 1}</div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeTowerItem(idx)}
                className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 bg-white active:scale-95 flex items-center justify-center"
                aria-label={`Eliminar fila ${idx + 1}`}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Altura (Mts)" value={row.alturaMts || ''} onChange={(e) => updateTowerItemField(idx, 'alturaMts', e.target.value)} placeholder="Ej: 32.0" className="mb-0" />
                <Input label="Orientación" value={row.orientacion || ''} onChange={(e) => updateTowerItemField(idx, 'orientacion', e.target.value)} placeholder="Ej: N" className="mb-0" />
              </div>
              <Input label="Tipo de equipo" value={row.tipoEquipo || ''} onChange={(e) => updateTowerItemField(idx, 'tipoEquipo', e.target.value)} placeholder="Ej: Antena RF" className="mb-0" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Cantidad" value={row.cantidad || ''} onChange={(e) => updateTowerItemField(idx, 'cantidad', e.target.value)} placeholder="Ej: 2" className="mb-0" />
                <Input label="Área (m²)" value={row.areaM2 || ''} onChange={(e) => updateTowerItemField(idx, 'areaM2', e.target.value)} placeholder="Ej: 0.50" className="mb-0" />
              </div>
              <Input label="Dimensiones (mts)" value={row.dimensionesMts || ''} onChange={(e) => updateTowerItemField(idx, 'dimensionesMts', e.target.value)} placeholder="L x A x H" className="mb-0" />
              <Input label="Carrier" value={row.carrier || ''} onChange={(e) => updateTowerItemField(idx, 'carrier', e.target.value)} placeholder="Ej: Claro" className="mb-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[980px] w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-extrabold text-gray-700">
              <th className="p-3">Altura (Mts)</th>
              <th className="p-3">Orientación</th>
              <th className="p-3">Tipo de equipo</th>
              <th className="p-3">Cantidad</th>
              <th className="p-3">Dimensiones (mts)</th>
              <th className="p-3">Área (m²)</th>
              <th className="p-3">Carrier</th>
              <th className="p-3 w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr key={idx} className="border-t border-gray-100">
                <td className="p-3"><input className={cellClass} value={row.alturaMts || ''} onChange={(e) => updateTowerItemField(idx, 'alturaMts', e.target.value)} placeholder="Ej: 32.0" /></td>
                <td className="p-3"><input className={cellClass} value={row.orientacion || ''} onChange={(e) => updateTowerItemField(idx, 'orientacion', e.target.value)} placeholder="Ej: N" /></td>
                <td className="p-3"><input className={cellClass} value={row.tipoEquipo || ''} onChange={(e) => updateTowerItemField(idx, 'tipoEquipo', e.target.value)} placeholder="Ej: Antena RF" /></td>
                <td className="p-3"><input className={cellClass} value={row.cantidad || ''} onChange={(e) => updateTowerItemField(idx, 'cantidad', e.target.value)} placeholder="Ej: 2" /></td>
                <td className="p-3"><input className={cellClass} value={row.dimensionesMts || ''} onChange={(e) => updateTowerItemField(idx, 'dimensionesMts', e.target.value)} placeholder="L x A x H" /></td>
                <td className="p-3"><input className={cellClass} value={row.areaM2 || ''} onChange={(e) => updateTowerItemField(idx, 'areaM2', e.target.value)} placeholder="Ej: 0.50" /></td>
                <td className="p-3"><input className={cellClass} value={row.carrier || ''} onChange={(e) => updateTowerItemField(idx, 'carrier', e.target.value)} placeholder="Ej: Claro" /></td>
                <td className="p-3">
                  <button type="button" onClick={() => removeTowerItem(idx)} className="w-9 h-9 rounded-xl border-2 border-gray-200 text-gray-600 bg-white hover:border-red-300 hover:text-red-600 active:scale-95 flex items-center justify-center">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
