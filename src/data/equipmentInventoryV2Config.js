// Configuración Formulario: Inventario de Equipos v2
// Basado en documento Inventario_de_equipos_APP.docx
// Cambios vs v1: Torre con dimensiones desglosadas + comentario, fórmula área,
// 3 fotos torre, foto plano en piso, sin Distribución ni Croquis/Plano,
// nueva sección Carriers repetible con tabla + 3 fotos cada uno.

export const equipmentInventoryV2Steps = [
  {
    id: 'datos-generales',
    title: 'Datos',
    description: 'Información general del sitio y visita (según formato PTI).',
    icon: '🧾',
    type: 'form',
  },
  {
    id: 'inventario-torre',
    title: 'Torre',
    description: 'Inventario de equipos en torre con dimensiones desglosadas.',
    icon: '🗼',
    type: 'table-torre-v2',
  },
  {
    id: 'equipos-en-piso',
    title: 'Piso',
    description: 'Clientes y gabinetes en piso (tabla por cliente).',
    icon: '🏢',
    type: 'piso',
  },
  {
    id: 'carriers',
    title: 'Carriers',
    description: 'Datos y fotos por cada carrier del sitio.',
    icon: '📡',
    type: 'carriers',
  },
]

export const getEquipmentV2StepIndex = (id) => equipmentInventoryV2Steps.findIndex(s => s.id === id)
