/**
 * additionalPhotoConfig.js
 * Reporte Adicional de Fotografías — categorías, acrónimos y reglas de captura
 */

export const PHOTO_CATEGORIES = [
  {
    id: 'ACC',
    title: 'Accesos',
    description:
      'Mostrar la forma en que se ingresa al sitio: tipo de puerta/portón, tipo de cerradura, estado general, y colindancias del predio donde se ubica la torre.',
    minPhotos: 3,
    variable: false,
    subLabels: ['Acceso 1', 'Acceso 2', 'Acceso 3'],
    hint: 'Vista de los accesos (portón, puerta, etc.)',
    quality: '1 Megapíxel mínimo',
    emoji: '🚪',
  },
  {
    id: 'CAM',
    title: 'Caminos',
    description:
      'Mostrar el estado físico del camino para llegar al sitio. Si es calle, tomar una foto a cada lado. En caminos largos, tomar una foto por km.',
    minPhotos: 3,
    variable: false,
    subLabels: ['Camino 1', 'Camino 2', 'Camino 3'],
    hint: 'Vista del estado físico de los caminos que llegan al sitio',
    quality: '1 Megapíxel mínimo',
    emoji: '🛣️',
  },
  {
    id: 'EDIF',
    title: 'Edificios',
    description:
      'Identificar el inmueble donde se encuentra el sitio, mostrar número de niveles, tipo y estado del edificio desde fachada.',
    minPhotos: 3,
    variable: false,
    subLabels: ['Fachada principal', 'Vista lateral', 'Vista general'],
    hint: 'Vista completa del edificio',
    quality: '1 Megapíxel mínimo',
    emoji: '🏢',
  },
  {
    id: 'EQTT',
    title: 'Equipo en Torre',
    description:
      'Identificar propietario, fabricante y modelo de cada equipo instalado en torre. RF: foto por sector mostrando tipos de antenas. MW: foto de antena con soporte y etiqueta de marca/modelo. Fotos deben tomarse desde la torre, no desde el suelo.',
    minPhotos: 1,
    variable: true,
    subLabels: null,
    subGroups: [
      { key: 'RF', label: 'Sector RF' },
      { key: 'MW', label: 'Antena MW + Soporte' },
      { key: 'ETQ', label: 'Etiqueta (marca/modelo)' },
      { key: 'CBL', label: 'Cables por antena' },
    ],
    hint: 'Vista por sector RF, antenas MW con soporte, etiquetas y cables',
    quality: '3.5 Megapíxeles mínimo',
    emoji: '📡',
  },
  {
    id: 'GENE',
    title: 'Generadores',
    description:
      'Obtener información de los generadores instalados en el sitio. Mostrar ángulos donde se aprecien posibles daños por vandalismo.',
    minPhotos: 2,
    variable: false,
    subLabels: ['Generador vista frontal', 'Generador vista lateral/daños'],
    hint: 'Vista de cada generador del sitio',
    quality: '1 Megapíxel mínimo',
    emoji: '⚡',
  },
  {
    id: 'NICH',
    title: 'Nichos',
    description:
      'Fotografiar cada aparato de medición mostrando el número de medidor de cada cliente. Incluir: nicho con puertas cerradas, con puertas abiertas, trasera del nicho, interior de registro, medidor de luces (cuando aplique).',
    minPhotos: 1,
    variable: true,
    subGroups: [
      { key: 'FRONT_C', label: 'Nicho frente (cerrado)' },
      { key: 'FRONT_A', label: 'Nicho frente (abierto)' },
      { key: 'TRAS', label: 'Nicho trasero' },
      { key: 'INT', label: 'Interior registro' },
      { key: 'MED', label: 'Medidor de luces' },
    ],
    hint: 'Vista frontal, trasera, interior y medidores',
    quality: '1 Megapíxel mínimo',
    emoji: '🔌',
  },
  {
    id: 'TRANS',
    title: 'Transformadores',
    description:
      'Obtener info de transformadores instalados: crucetas, tipo (poste o pedestal), fabricante y capacidad. Capturar aisladores, apartarrayos y cuchillas que permitan identificar el voltaje.',
    minPhotos: 4,
    variable: false,
    subLabels: [
      'Bordes del transformador',
      'Transformador (marca y capacidad)',
      'Poste con transformador',
      'Placa de datos',
    ],
    hint: 'Vista de bordes, marcas, poste y placa de datos',
    quality: '1 Megapíxel mínimo',
    emoji: '🔋',
  },
  {
    id: 'PORTC',
    title: 'Porta Cablera',
    description:
      'Cuantificar feeders / guías de onda por antena e identificar cliente. Fotografiar la porta cablera en la curva vertical→horizontal. Capturar tipo, tamaño, características y número de espacios.',
    minPhotos: 3,
    variable: true,
    subLabels: null,
    hint: '3 fotos mínimo por porta cablera (transición vertical-horizontal)',
    quality: '1 Megapíxel mínimo',
    emoji: '🪢',
  },
  {
    id: 'RETAB',
    title: 'Retenidas, Anclajes y Bases',
    description:
      'Obtener imágenes del estado de las bases de retenidas (concreto o acero), sus dimensiones, número de orificios disponibles y ubicación. Mínimo 2 fotos por equipo.',
    minPhotos: 2,
    variable: true,
    subGroups: [
      { key: 'DADO', label: 'Dado de torre' },
      { key: 'ANCL', label: 'Ancla de arriostre' },
      { key: 'CBL', label: 'Cable de arriostre' },
      { key: 'MASTIL', label: 'Dado de mástil' },
    ],
    hint: '2 fotos mínimo por elemento (dado, ancla, cable)',
    quality: '1 Megapíxel mínimo',
    emoji: '⚓',
  },
  {
    id: 'SHELT',
    title: 'Shelters y Equipos en Piso',
    description:
      'Identificar clientes instalados en el sitio, área ocupada y ubicación dentro del predio. Mínimo 2 fotos por equipo.',
    minPhotos: 2,
    variable: true,
    subGroups: [
      { key: 'SH', label: 'Shelter' },
      { key: 'EQP', label: 'Equipo en piso' },
    ],
    hint: '2 fotos mínimo por cada shelter / equipo en piso',
    quality: '1 Megapíxel mínimo',
    emoji: '🏠',
  },
  {
    id: 'SISTT',
    title: 'Sistema de Tierras',
    description:
      'Observar estado de registros de tierras y colas de electrodos. Incluir: antes y después del mantenimiento, aterrizajes de mallas, concertinas y portones.',
    minPhotos: 5,
    variable: true,
    subLabels: [
      'Registro (antes del mantenimiento)',
      'Registro (después del mantenimiento)',
      'Aterrizaje de mallas',
      'Aterrizaje de concertinas',
      'Aterrizaje de portones',
    ],
    hint: '2 fotos por registro + todas las soldaduras',
    quality: '1 Megapíxel mínimo',
    emoji: '🌐',
  },
  {
    id: 'SISILU',
    title: 'Sistema de Iluminación',
    description:
      'Identificar fabricante y modelo de luces de obstrucción instaladas. Identificar el controlador para facilitar reparación o sustitución.',
    minPhotos: 6,
    variable: false,
    subLabels: [
      'Controlador de luces',
      'Beacon / Dual / Strobo 1',
      'Beacon / Dual / Strobo 2',
      'Luces secundarias 1',
      'Luces secundarias 2',
      'Luces secundarias 3',
    ],
    hint: 'Controlador, beacons/strobes y luces secundarias',
    quality: '1 Megapíxel mínimo',
    emoji: '💡',
  },
  {
    id: 'VIPLATT',
    title: 'Vista en Planta Desde la Torre',
    description:
      'Ver distribución y área ocupada por los carriers dentro del predio, ubicación de transformadores y nichos para futuras colocaciones. Verificar colindancias.',
    minPhotos: 4,
    variable: false,
    subLabels: ['Vista Norte', 'Vista Sur', 'Vista Este', 'Vista Oeste'],
    hint: 'Una vista hacia cada punto cardinal desde la torre',
    quality: '1 Megapíxel mínimo',
    emoji: '🧭',
  },
  {
    id: 'VIPANTT',
    title: 'Vista Panorámica de Torre',
    description:
      'Una foto por cada cara de la torre completa. Tomadas a 25–35 m de distancia. La torre debe cubrir la superficie total en sentido vertical. Incluir panorámicas al horizonte hacia los cuatro puntos cardinales.',
    minPhotos: 7,
    variable: true,
    subLabels: [
      'Panorámica Norte (horizonte)',
      'Panorámica Sur (horizonte)',
      'Panorámica Este (horizonte)',
      'Panorámica Oeste (horizonte)',
      'Torre completa cara 1',
      'Torre completa cara 2',
      'Torre completa cara 3',
    ],
    hint: 'Distancia 25–35 m de la torre; torre debe llenar el encuadre vertical. Cara 4 si aplica.',
    quality: '3.5 Megapíxeles mínimo',
    emoji: '🗼',
  },
  {
    id: 'VIGRAL',
    title: 'Vista General de Sitio',
    description:
      'Imágenes generales donde se observe todo el sitio en conjunto: accesos, nichos, grava, transformadores, portones, mallas, colindancias. Tomar DESPUÉS del mantenimiento.',
    minPhotos: 2,
    variable: true,
    subLabels: ['Vista general (antes del mantenimiento)', 'Vista general (después del mantenimiento)'],
    hint: 'Fotos generales antes y después del mantenimiento',
    quality: '1 Megapíxel mínimo',
    emoji: '🌄',
  },
  {
    id: 'MANTPREV',
    title: 'Mantenimiento Preventivo Adicional',
    description:
      'Imágenes de cada concepto de los trabajos realizados durante el mantenimiento preventivo. Organizar en subcarpetas "Antes" y "Después", tomadas desde el mismo punto.',
    minPhotos: 1,
    variable: true,
    subGroups: [
      { key: 'ANT', label: 'Antes del mantenimiento' },
      { key: 'DES', label: 'Después del mantenimiento' },
    ],
    hint: 'Fotos generales en 2 grupos: Antes y Después, desde el mismo punto',
    quality: '1 Megapíxel mínimo',
    emoji: '🔧',
  },
]

// Flat acronym lookup: used for file naming and assetType
export const ACRONYM_MAP = Object.fromEntries(PHOTO_CATEGORIES.map((c) => [c.id, c]))
