export const inspectionSections = [
  { id: 'info', title: 'Info General', icon: '📋', description: 'Datos básicos del sitio', type: 'form' },
  { id: 'acceso', title: 'Acceso', icon: '🚪', description: 'Condiciones de acceso y limpieza', items: [
    { id: 'acc-1', text: '¿Cuál es la condición del camino de acceso al sitio?' },
    { id: 'acc-2', text: '¿Cómo está la limpieza exterior del sitio?' },
    { id: 'acc-3', text: '¿El candado y acceso principal funcionan?', hasPhoto: true },
    { id: 'acc-4', text: '¿Las escaleras de acceso están en buen estado?' },
    { id: 'acc-5', text: '¿Cómo califica la limpieza interior del sitio?' },
  ]},
  { id: 'seguridad', title: 'Seguridad', icon: '🔒', description: 'Seguridad perimetral', items: [
    { id: 'seg-1', text: '¿Condición de la malla ciclónica perimetral?', hasPhoto: true },
    { id: 'seg-2', text: '¿Cómo está la cimentación de la malla?' },
    { id: 'seg-3', text: '¿Condición de los muros perimetrales?' },
    { id: 'seg-4', text: '¿El alambre de púas está en buen estado?' },
    { id: 'seg-5', text: '¿La puerta tiene candado funcional?' },
    { id: 'seg-6', text: '¿Condición de la puerta principal?' },
    { id: 'seg-7', text: '¿Las cámaras funcionan correctamente?' },
  ]},
  { id: 'tierras', title: 'Tierras', icon: '⚡', description: 'Sistema de puesta a tierra', items: [
    { id: 'tie-1', text: '¿Condición del cable de tierra?' },
    { id: 'tie-2', text: '¿Cómo están las soldaduras?' },
    { id: 'tie-3', text: '¿Se realizó prueba de resistividad?' },
    { id: 'tie-4', text: '¿Condición de registros de inspección?' },
    { id: 'tie-5', text: '¿Conexiones para aterrizar la torre?' },
    { id: 'tie-6', text: '¿Conexiones para aterrizar malla?' },
  ]},
  { id: 'electrico', title: 'Eléctrico', icon: '🔌', description: 'Sistema eléctrico', items: [
    { id: 'ele-1', text: '¿Estado del nicho eléctrico?' },
    { id: 'ele-2', text: '¿El candado de seguridad funciona?' },
    { id: 'ele-3', text: '¿Condición de registros eléctricos?' },
    { id: 'ele-4', text: '¿Condición de postes eléctricos?' },
    { id: 'ele-5', text: '¿Estado del transformador?' },
    { id: 'ele-6', text: '¿Tierras del sistema eléctrico?' },
  ]},
  { id: 'torre', title: 'Torre', icon: '📡', description: 'Estructura de la torre', items: [
    { id: 'tor-1', text: '¿Hay miembros dañados?' },
    { id: 'tor-2', text: '¿Hay miembros flojos?' },
    { id: 'tor-3', text: '¿Hay miembros faltantes?' },
    { id: 'tor-4', text: '¿Condición de la escalera?' },
    { id: 'tor-5', text: '¿Tornillos en bridas completos?' },
    { id: 'tor-6', text: '¿Condición del cable de vida?' },
    { id: 'tor-7', text: '¿Estado del grout?' },
    { id: 'tor-8', text: '¿La torre está vertical?' },
  ]},
]

export const getTotalInspectionItems = () => inspectionSections.filter(s => s.items).reduce((acc, s) => acc + s.items.length, 0)
