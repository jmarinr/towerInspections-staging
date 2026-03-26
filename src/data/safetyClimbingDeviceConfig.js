export const safetyClimbingSections = [
  {
    id: 'datos',
    title: 'Datos del sitio',
    description: 'Identificación del sitio y datos de la visita.',
    items: 8,
  },
  {
    id: 'herrajes',
    title: 'Herrajes y cable',
    description: 'Estado de herrajes y condiciones del cable.',
    items: 10,
  },
  {
    id: 'prensacables',
    title: 'Prensacables y carro',
    description: 'Verificación de prensacables, mordaza y carro.',
    items: 13,
  },
  {
    id: 'tramos',
    title: 'Tramos (escaleras)',
    description: 'Estado de tramos, uniones y tornillería.',
    items: 9,
  },
  {
    id: 'platinas',
    title: 'Platinas guardacables',
    description: 'Cantidad y observaciones.',
    items: 2,
  },
  {
    id: 'certificacion',
    title: 'Certificación',
    description: 'Evidencia fotográfica y notas.',
    items: 4,
  },
]

export const safetySectionFields = {
  datos: [
    { id: 'proveedor', label: 'Proveedor', type: 'text', required: true, placeholder: 'Ej: Servicios de Torres CR' },
    { id: 'tipoVisita', label: 'Tipo de visita', type: 'select', required: true, defaultValue: 'mantenimiento', options: [
      { value: '', label: 'Seleccione...' },
      { value: 'mantenimiento', label: 'Mantenimiento' },
      { value: 'inspeccion', label: 'Inspección' },
      { value: 'emergencia', label: 'Emergencia' },
    ]},
    { id: 'idSitio', label: 'ID sitio', type: 'text', placeholder: 'Ej: PTI-CR-001' },
    { id: 'nombreSitio', label: 'Nombre sitio', type: 'text', placeholder: 'Ej: San José Centro' },
    { id: 'tipoSitio', label: 'Tipo sitio', type: 'select', options: [
      { value: '', label: 'Seleccione...' },
      { value: 'rawland', label: 'Rawland' },
      { value: 'rooftop', label: 'Rooftop' },
    ]},
    { id: 'tipoEstructura', label: 'Tipo estructura', type: 'select', options: [
      { value: '', label: 'Seleccione...' },
      { value: 'autosoportada', label: 'Autosoportada' },
      { value: 'monopolo', label: 'Monopolo' },
      { value: 'arriostrada', label: 'Arriostrada' },
      { value: 'mastil', label: 'Mástil' },
    ]},
    { id: 'altura', label: 'Altura (m)', type: 'number', placeholder: 'Ej: 45' },
    { id: 'direccion', label: 'Dirección', type: 'textarea', placeholder: 'Dirección del sitio' },
  ],
  herrajes: [
    { id: 'herrajeInferior', label: 'Herraje inferior', type: 'status' },
    { id: 'fotoHerrajeInferior', label: 'Foto - Herraje inferior', type: 'photo' },
    { id: 'diametroCable', label: 'Diámetro del cable', type: 'text', placeholder: 'Ej: 3/8"' },
    { id: 'comentarioHerrajeInferior', label: 'Observación herraje inferior', type: 'textarea', placeholder: 'Observaciones...' },
    { id: 'herrajeSuperior', label: 'Herraje superior', type: 'status' },
    { id: 'fotoHerrajeSuperior', label: 'Foto - Herraje superior', type: 'photo' },
    { id: 'estadoCable', label: 'Estado del cable', type: 'status' },
    { id: 'comentarioCable', label: 'Observación cable', type: 'textarea', placeholder: 'Observaciones...' },
    { id: 'oxidacion', label: '¿Hay oxidación?', type: 'toggle', options: [
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
    ]},
    { id: 'comentarioOxidacion', label: 'Observación oxidación', type: 'textarea', placeholder: 'Observaciones...', showIf: { field: 'oxidacion', value: 'si' } },
  ],
  prensacables: [
    { id: 'prensacableInferior', label: 'Prensacable inferior', type: 'toggle', options: [
      { value: 'actual', label: 'Actual' },
      { value: 'na', label: 'No aplica' },
    ]},
    { id: 'fotoPrensacableInferior', label: 'Foto - Prensacable inferior', type: 'photo' },
    { id: 'cantidadPrensacables', label: 'Cantidad de prensacables', type: 'number', placeholder: 'Ej: 3' },
    { id: 'distanciamiento', label: 'Distanciamiento', type: 'text', placeholder: 'Ej: 15 cm' },
    { id: 'estadoPrensacables', label: 'Estado prensacables', type: 'status' },
    { id: 'comentarioPrensacables', label: 'Observación prensacables', type: 'textarea', placeholder: 'Observaciones...' },
    { id: 'prensacableSuperior', label: 'Prensacable superior', type: 'toggle', options: [
      { value: 'actual', label: 'Actual' },
      { value: 'na', label: 'No aplica' },
    ]},
    { id: 'fotoPrensacableSuperior', label: 'Foto - Prensacable superior', type: 'photo' },
    { id: 'tipoCarro', label: 'Tipo de carro', type: 'text', placeholder: 'Ej: Tipo A' },
    { id: 'fotoTipoCarro', label: 'Foto - Tipo de carro', type: 'photo' },
    { id: 'observacionMordaza', label: 'Observación mordaza', type: 'textarea', placeholder: 'Observaciones...' },
    { id: 'malaSujecion', label: '¿Mala sujeción?', type: 'toggle', options: [
      { value: 'no', label: 'No' },
      { value: 'si', label: 'Sí' },
      { value: 'na', label: 'N/A' },
    ]},
    { id: 'comentarioMalaSujecion', label: 'Observación mala sujeción', type: 'textarea', placeholder: 'Observaciones...', showIf: { field: 'malaSujecion', value: 'si' } },
  ],
  tramos: [
    { id: 'fotoEscalera', label: 'Foto escalera', type: 'photo' },
    { id: 'cantidadTramos', label: 'Cantidad de tramos', type: 'number', placeholder: 'Ej: 5' },
    { id: 'estadoEscalera', label: 'Estado escalera', type: 'status' },
    { id: 'comentarioEscalera', label: 'Observación escalera', type: 'textarea', placeholder: 'Observaciones...' },
    { id: 'cantidadUniones', label: 'Cantidad de uniones', type: 'number', placeholder: 'Ej: 4' },
    { id: 'fotoUnionTramos', label: 'Foto - Observación unión (tramos)', type: 'photo' },
    { id: 'tramosDañados', label: 'Tramos dañados', type: 'text', placeholder: 'Ej: Tramos 2 y 4' },
    { id: 'diametroTornillo', label: 'Diámetro tornillo', type: 'text', placeholder: 'Ej: 1/2"' },
    { id: 'comentarioTornillos', label: 'Observación tornillería', type: 'textarea', placeholder: 'Observaciones...' },
  ],
  platinas: [
    { id: 'cantidadPlatinas', label: 'Cantidad de platinas', type: 'number', placeholder: 'Ej: 8' },
    { id: 'observacionPlatinas', label: 'Observación', type: 'textarea', placeholder: 'Observaciones...' },
  ],
  certificacion: [
    { id: 'fotoCertificacion', label: 'Foto certificación', type: 'photo' },
    { id: 'observacionCertificacion', label: 'Observaciones finales', type: 'textarea', placeholder: 'Observaciones de cierre...' },
    { id: 'fotoOtras1', label: 'Otras fotos 1', type: 'photo' },
    { id: 'fotoOtras2', label: 'Otras fotos 2', type: 'photo' },
  ],
}

export const defaultSafetyClimbingData = {
  datos: {},
  herrajes: {},
  prensacables: {},
  tramos: {},
  platinas: {},
  certificacion: {},
}
