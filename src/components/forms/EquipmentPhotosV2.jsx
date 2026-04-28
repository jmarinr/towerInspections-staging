import PhotoUpload from '../ui/PhotoUpload'
import { useAppStore } from '../../hooks/useAppStore'

export default function EquipmentPhotosV2() {
  const { equipmentInventoryV2Data, updateEquipmentV2Field } = useAppStore()
  const photos = equipmentInventoryV2Data?.fotos || {}

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="font-extrabold text-gray-900 mb-1">Evidencia fotográfica</div>
        <div className="text-xs text-gray-500 mb-4">Tome o suba las siguientes fotos del sitio.</div>

        <div className="space-y-5">
          {/* Foto 1: Distribución de equipos en torre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              a. Imagen distribución de equipos en torre
            </label>
            <PhotoUpload
              type="after"
              photo={photos.fotoDistribucionTorre || null}
              onCapture={(data) => updateEquipmentV2Field('fotos', 'fotoDistribucionTorre', data)}
              onRemove={() => updateEquipmentV2Field('fotos', 'fotoDistribucionTorre', null)}
              formCode="equipment-v2"
              assetType="equipmentV2:fotoDistribucionTorre"
            />
          </div>

          {/* Foto 2: Torre completa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              b. Foto de torre completa
            </label>
            <PhotoUpload
              type="after"
              photo={photos.fotoTorreCompleta || null}
              onCapture={(data) => updateEquipmentV2Field('fotos', 'fotoTorreCompleta', data)}
              onRemove={() => updateEquipmentV2Field('fotos', 'fotoTorreCompleta', null)}
              formCode="equipment-v2"
              assetType="equipmentV2:fotoTorreCompleta"
            />
          </div>

          {/* Foto 3: Croquis esquemático */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              c. Imagen croquis esquemático del edificio en corte
            </label>
            <PhotoUpload
              type="after"
              photo={photos.fotoCroquisEdificio || null}
              onCapture={(data) => updateEquipmentV2Field('fotos', 'fotoCroquisEdificio', data)}
              onRemove={() => updateEquipmentV2Field('fotos', 'fotoCroquisEdificio', null)}
              formCode="equipment-v2"
              assetType="equipmentV2:fotoCroquisEdificio"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
