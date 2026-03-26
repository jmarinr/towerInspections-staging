// Configuración Formulario 3: Inventario de Equipos
// Mantener coherencia con el estilo del proyecto (Steps + secciones)

export const equipmentInventorySteps = [
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
    description: 'Inventario de equipos en torre (tabla).',
    icon: '🗼',
    type: 'table-torre',
  },
  {
    id: 'equipos-en-piso',
    title: 'Piso',
    description: 'Clientes y gabinetes en piso (tabla por cliente).',
    icon: '🏢',
    type: 'piso',
  },
  {
    id: 'distribucion-torre',
    title: 'Distribución',
    description: 'Arma el croquis de distribución de equipos en torre con piezas arrastrables.',
    icon: '🧩',
    type: 'builder',
  },
  {
    id: 'croquis-esquematico',
    title: 'Croquis',
    description: 'Dibuja sobre la plantilla (croquis esquemático del edificio en corte).',
    icon: '✍️',
    type: 'drawing-template',
  },
  {
    id: 'plano-planta',
    title: 'Plano',
    description: 'Pantalla en blanco para hacer el plano de planta y equipos.',
    icon: '📐',
    type: 'drawing-blank',
  },
]

export const getEquipmentStepIndex = (id) => equipmentInventorySteps.findIndex(s => s.id === id)
