import { ClipboardCheck, Wrench, Camera, Package, Shield, Zap } from 'lucide-react'

export const FORM_TYPES = {
  'inspection-general': {
    label: 'Inspección General',
    shortLabel: 'Inspección',
    icon: ClipboardCheck,
    color: 'bg-blue-500',
    colorLight: 'bg-blue-50 text-blue-700',
  },
  'preventive-maintenance': {
    label: 'Mantenimiento Preventivo',
    shortLabel: 'Mant. Preventivo',
    icon: Wrench,
    color: 'bg-orange-500',
    colorLight: 'bg-orange-50 text-orange-700',
  },
  'executed-maintenance': {
    label: 'Mantenimiento Ejecutado',
    shortLabel: 'Mant. Ejecutado',
    icon: Camera,
    color: 'bg-teal-500',
    colorLight: 'bg-teal-50 text-teal-700',
  },
  'equipment': {
    label: 'Inventario de Equipos',
    shortLabel: 'Inventario',
    icon: Package,
    color: 'bg-emerald-500',
    colorLight: 'bg-emerald-50 text-emerald-700',
  },
  'safety-system': {
    label: 'Sistema de Ascenso',
    shortLabel: 'Ascenso',
    icon: Shield,
    color: 'bg-indigo-500',
    colorLight: 'bg-indigo-50 text-indigo-700',
  },
  'grounding-system-test': {
    label: 'Prueba de Puesta a Tierra',
    shortLabel: 'Puesta a Tierra',
    icon: Zap,
    color: 'bg-purple-500',
    colorLight: 'bg-purple-50 text-purple-700',
  },
}

/**
 * Map between Spanish DB form codes and English FORM_TYPES keys.
 * The inspector app writes Spanish codes (toFormCode in getSupabasePayloadForForm)
 * but asset uploads use English codes (autosave bucket key).
 */
const CODE_ALIASES = {
  // Spanish → English
  'inspeccion': 'inspection-general',
  'mantenimiento': 'preventive-maintenance',
  'mantenimiento-ejecutado': 'executed-maintenance',
  'inventario': 'equipment',
  'puesta-tierra': 'grounding-system-test',
  'sistema-ascenso': 'safety-system',
  // English → English (identity)
  'inspection-general': 'inspection-general',
  'preventive-maintenance': 'preventive-maintenance',
  'executed-maintenance': 'executed-maintenance',
  'equipment': 'equipment',
  'safety-system': 'safety-system',
  'grounding-system-test': 'grounding-system-test',
}

/** Normalize any form code (Spanish or English) to the canonical English key. */
export function normalizeFormCode(code) {
  if (!code) return code
  return CODE_ALIASES[code] || code
}

/** Get the sibling form code (the other language variant). */
export function getFormCodeSiblings(code) {
  if (!code) return []
  const canonical = normalizeFormCode(code)
  // Find all codes that map to the same canonical
  return Object.entries(CODE_ALIASES)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k)
    .filter(k => k !== code)
}

export const FORM_CODES = Object.keys(FORM_TYPES)

export function getFormMeta(formCode) {
  // Try direct lookup first, then normalized
  const direct = FORM_TYPES[formCode]
  if (direct) return direct
  const normalized = normalizeFormCode(formCode)
  return FORM_TYPES[normalized] || {
    label: formCode || 'Desconocido',
    shortLabel: formCode || '?',
    icon: ClipboardCheck,
    color: 'bg-gray-500',
    colorLight: 'bg-gray-50 text-gray-700',
  }
}
