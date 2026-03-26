// Formulario 6: Reporte de trabajos ejecutados (Mantenimiento Preventivo)
// Basado en el Excel: "2 Preventive Maintenance Executed (2).xlsx"

export const PM_EXECUTED_SITE_TYPES = [
  { value: '', label: 'Seleccione...' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'rawland', label: 'Rawland' },
]

export const PM_EXECUTED_ACTIVITIES = [
  {
    "id": "pmx-1",
    "item": 1,
    "group": "Limpieza General del Sitio/Deshierbe",
    "name": "Limpieza General del Sitio/Deshierbe",
    "photoLabel": "Esquina 1",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-2",
    "item": 2,
    "group": "Limpieza General del Sitio/Deshierbe",
    "name": "Limpieza General del Sitio/Deshierbe",
    "photoLabel": "Esquina 2",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-3",
    "item": 3,
    "group": "Limpieza General del Sitio/Deshierbe",
    "name": "Limpieza General del Sitio/Deshierbe",
    "photoLabel": "Esquina 3",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-4",
    "item": 4,
    "group": "Limpieza General del Sitio/Deshierbe",
    "name": "Limpieza General del Sitio/Deshierbe",
    "photoLabel": "Esquina 4",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-5",
    "item": 5,
    "group": "Retiro de Maleza",
    "name": "Retiro de Maleza",
    "photoLabel": "Sitio General",
    "applies": {
      "rooftop": false,
      "rawland": true
    }
  },
  {
    "id": "pmx-6",
    "item": 6,
    "group": "Aplicación de Herbicida",
    "name": "Aplicación de Herbicida",
    "photoLabel": "Sitio General",
    "applies": {
      "rooftop": false,
      "rawland": true
    }
  },
  {
    "id": "pmx-7",
    "item": 7,
    "group": "Impermeabilizacion Dados",
    "name": "Impermeabilizacion Dados",
    "photoLabel": "Dado 1-2",
    "applies": {
      "rooftop": true,
      "rawland": false
    }
  },
  {
    "id": "pmx-8",
    "item": 8,
    "group": "Impermeabilizacion Dados",
    "name": "Impermeabilizacion Dados",
    "photoLabel": "Dado 3-4",
    "applies": {
      "rooftop": true,
      "rawland": false
    }
  },
  {
    "id": "pmx-9",
    "item": 9,
    "group": "Impermeabilizacion Base de Equipos",
    "name": "Impermeabilizacion Base de Equipos",
    "photoLabel": "Equipo 1-2-3",
    "applies": {
      "rooftop": true,
      "rawland": false
    }
  },
  {
    "id": "pmx-10",
    "item": 10,
    "group": "Impermeabilizacion Dado",
    "name": "Impermeabilizacion Dado",
    "photoLabel": "Dado Torre",
    "applies": {
      "rooftop": true,
      "rawland": false
    }
  },
  {
    "id": "pmx-11",
    "item": 11,
    "group": "Impermeabilizacion losa",
    "name": "Impermeabilizacion losa",
    "photoLabel": "Nicho Electrico",
    "applies": {
      "rooftop": false,
      "rawland": true
    }
  },
  {
    "id": "pmx-12",
    "item": 12,
    "group": "Engrasado y/o Lubricado de Candado/Chapa",
    "name": "Engrasado y/o Lubricado de Candado/Chapa",
    "photoLabel": "Acceso",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-13",
    "item": 13,
    "group": "Engrasado y/o Lubricado de Candado",
    "name": "Engrasado y/o Lubricado de Candado",
    "photoLabel": "Nicho Electrico",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-14",
    "item": 14,
    "group": "Limpieza General de Nicho",
    "name": "Limpieza General de Nicho",
    "photoLabel": "Nicho Electrico",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-15",
    "item": 15,
    "group": "Limpieza de Registros",
    "name": "Limpieza de Registros",
    "photoLabel": "Electrico",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-16",
    "item": 16,
    "group": "Aplicar Galvanox en Soldadura",
    "name": "Aplicar Galvanox en Soldadura",
    "photoLabel": "Pierna de Torre",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-17",
    "item": 17,
    "group": "Aplicar Galvanox en Soldadura",
    "name": "Aplicar Galvanox en Soldadura",
    "photoLabel": "Base de Equipos",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-18",
    "item": 18,
    "group": "Aplicar Galvanox en Soldadura",
    "name": "Aplicar Galvanox en Soldadura",
    "photoLabel": "Portacablera",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-19",
    "item": 19,
    "group": "Aplicación de Galvanox Esquineros y Porton",
    "name": "Aplicación de Galvanox Esquineros y Porton",
    "photoLabel": "Malla Ciclonica",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-20",
    "item": 20,
    "group": "Aplicar Grasa Penetrox",
    "name": "Aplicar Grasa Penetrox",
    "photoLabel": "Barra de Tierra",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-21",
    "item": 21,
    "group": "Limpieza de Registros",
    "name": "Limpieza de Registros",
    "photoLabel": "Sistema de Tierra",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-22",
    "item": 22,
    "group": "Aplicar Pintura en Registros",
    "name": "Aplicar Pintura en Registros",
    "photoLabel": "Sistema de Tierra",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-23",
    "item": 23,
    "group": "Engrasado y/o Lubricado de Bisagras del Registro",
    "name": "Engrasado y/o Lubricado de Bisagras del Registro",
    "photoLabel": "Sistema de Tierra",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-24",
    "item": 24,
    "group": "Revision de Controlador de Luces",
    "name": "Revision de Controlador de Luces",
    "photoLabel": "Balizamiento",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-25",
    "item": 25,
    "group": "Revisar y/o Cambio de Focos Luces",
    "name": "Revisar y/o Cambio de Focos Luces",
    "photoLabel": "Balizamiento",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-26",
    "item": 26,
    "group": "Revisra y/o Cambioe de Fotocelda",
    "name": "Revisra y/o Cambioe de Fotocelda",
    "photoLabel": "Balizamiento",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-27",
    "item": 27,
    "group": "Fijar, Ajustar y/o Cambio de Foco",
    "name": "Fijar, Ajustar y/o Cambio de Foco",
    "photoLabel": "Lampara SubUrbana",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-28",
    "item": 28,
    "group": "Fijar y/o Ajustar Incluye Bajante",
    "name": "Fijar y/o Ajustar Incluye Bajante",
    "photoLabel": "Pararrayo",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-29",
    "item": 29,
    "group": "Prueba Sistema de Tierra",
    "name": "Prueba Sistema de Tierra",
    "photoLabel": "Medicion",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-30",
    "item": 30,
    "group": "Ajuste, Apriete o Fijacion de Escalerilla Acenso",
    "name": "Ajuste, Apriete o Fijacion de Escalerilla Acenso",
    "photoLabel": "Escalerilla de Ascenso Step Bolts",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-31",
    "item": 31,
    "group": "Verificar y/o Ajuste",
    "name": "Verificar y/o Ajuste",
    "photoLabel": "Linea de Vida",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  },
  {
    "id": "pmx-32",
    "item": 32,
    "group": "Verificar Voltaje en QO2 Luces",
    "name": "Verificar Voltaje en QO2 Luces",
    "photoLabel": "Balizamiento",
    "applies": {
      "rooftop": true,
      "rawland": true
    }
  }
]

// Helpers
export const groupActivities = () => {
  const groups = new Map()
  PM_EXECUTED_ACTIVITIES.forEach((a) => {
    const key = a.group || 'Actividades'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(a)
  })
  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }))
}
