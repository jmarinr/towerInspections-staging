import Input from '../ui/Input'
import Select from '../ui/Select'
import { useAppStore } from '../../hooks/useAppStore'

export default function EquipmentInventorySiteInfoForm({ siteInfo: siteInfoProp, onChange: onChangeProp } = {}) {
  const { equipmentInventoryData, updateEquipmentSiteField, selectedSite } = useAppStore()

  const data = siteInfoProp ?? (equipmentInventoryData?.siteInfo || {})
  const update = onChangeProp
    ? (field, value) => onChangeProp(field, value)
    : (field, value) => updateEquipmentSiteField(field, value)

  return (
    <div className="space-y-4">

      {/* Bloque: Orden y sitio (auto-poblados) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Orden de trabajo</div>
        <div className="grid grid-cols-1 gap-3">
          <Input
            label="Número de Orden"
            placeholder="Ej: OT-2026-0451"
            value={data.numeroOrden || ''}
            onChange={(e) => update('numeroOrden', e.target.value)}
            readOnly={!!data.numeroOrden}
            description={data.numeroOrden ? '✓ Auto-completado desde la orden' : undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ID Sitio"
              required
              placeholder="Ej: PTI-XXX"
              value={data.idSitio || ''}
              onChange={(e) => update('idSitio', e.target.value)}
              readOnly={!!selectedSite || !!data.idSitio}
            />
            <Input
              label="Nombre Sitio"
              required
              placeholder="Ej: Torre San José"
              value={data.nombreSitio || ''}
              onChange={(e) => update('nombreSitio', e.target.value)}
              readOnly={!!selectedSite || !!data.nombreSitio}
            />
          </div>
        </div>
      </div>

      {/* Bloque: Visita */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos de la visita</div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Proveedor"
            required
            placeholder="Ej: Contratista"
            value={data.proveedor || ''}
            onChange={(e) => update('proveedor', e.target.value)}
          />
          <Select
            label="Tipo de Visita"
            required
            value={data.tipoVisita || 'mantenimiento'}
            onChange={(e) => update('tipoVisita', e.target.value)}
            options={[
              { value: 'mantenimiento', label: 'Mantenimiento' },
            ]}
          />
        </div>
        <Input
          label="Dirección"
          required
          placeholder="Dirección completa del sitio"
          value={data.direccion || ''}
          onChange={(e) => update('direccion', e.target.value)}
        />
      </div>

      {/* Bloque: Estructura */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estructura</div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo Sitio"
            value={data.tipoSitio || ''}
            onChange={(e) => update('tipoSitio', e.target.value)}
            options={[
              { value: '', label: 'Seleccione...' },
              { value: 'Rooftop', label: 'Rooftop' },
              { value: 'Rawland', label: 'Rawland' },
            ]}
          />
          <Select
            label="Tipo Estructura"
            value={data.tipoEstructura || ''}
            onChange={(e) => update('tipoEstructura', e.target.value)}
            options={[
              { value: '', label: 'Seleccione...' },
              { value: 'Autosoportada', label: 'Autosoportada' },
              { value: 'Arriostrada', label: 'Arriostrada' },
              { value: 'Monopolo', label: 'Monopolo' },
              { value: 'Otro', label: 'Otro' },
            ]}
          />
        </div>
        <Input
          label="Altura (Mts)"
          type="number"
          placeholder="Ej: 42.3"
          value={data.alturaMts || ''}
          onChange={(e) => update('alturaMts', e.target.value)}
        />
      </div>

    </div>
  )
}
