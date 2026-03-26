import { useMemo, useState } from 'react'

// Input con validación visual: rojo/verde + asterisco requerido.
// Verde se muestra cuando el usuario interactúa y el valor cumple el tipo.
export default function Input({
  label,
  description,
  required,
  className = '',
  validate, // (value) => boolean
  successText = '✓ Dato registrado correctamente',
  errorText = '⚠ Campo requerido',
  ...props
}) {
  const [touched, setTouched] = useState(false)
  const value = props.value ?? ''
  const type = props.type ?? 'text'

  const isEmpty = useMemo(() => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    return String(value).trim().length === 0
  }, [value])

  const isTypeValid = useMemo(() => {
    // Si es vacío y no es requerido, no forzamos validación (estado neutral)
    if (!required && isEmpty) return null

    // Requerido y vacío => inválido
    if (required && isEmpty) return false

    // Validación custom si existe
    if (typeof validate === 'function') {
      try {
        return !!validate(value)
      } catch {
        return false
      }
    }

    // Validación por tipo
    if (type === 'number') {
      const n = Number(value)
      return Number.isFinite(n)
    }
    if (type === 'date') {
      // value: YYYY-MM-DD
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    }
    if (type === 'time') {
      // value: HH:MM
      return /^\d{2}:\d{2}$/.test(String(value))
    }
    if (type === 'gps') {
      // "lat, lng" - ambos números
      const parts = String(value).split(',').map(s => s.trim())
      if (parts.length !== 2) return false
      const lat = Number(parts[0])
      const lng = Number(parts[1])
      return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    }

    // text/otros: no vacío ya es válido
    return true
  }, [required, isEmpty, validate, value, type])

  const effectiveTouched = touched || (props.readOnly && String(value).trim().length > 0)
  const showError = effectiveTouched && isTypeValid === false
  const showSuccess = effectiveTouched && isTypeValid === true

  const borderClass = showError
    ? 'border-red-500'
    : showSuccess
      ? 'border-emerald-500'
      : 'border-gray-200'

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block mb-2">
          <span className="text-sm font-semibold text-gray-700 flex flex-wrap items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
          {description && <span className="text-xs text-gray-500 block mt-1">{description}</span>}
        </label>
      )}

      <input
        {...props}
        className={`w-full px-4 py-3 text-[15px] border-2 rounded-xl bg-white transition-all placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 ${borderClass}`}
        onChange={(e) => {
          if (!touched) setTouched(true)
          props.onChange?.(e)
        }}
        onBlur={(e) => {
          setTouched(true)
          props.onBlur?.(e)
        }}
      />

      {showError && <p className="mt-2 text-xs text-red-500 font-medium">{errorText}</p>}
      {showSuccess && <p className="mt-2 text-xs text-emerald-600 font-semibold">{successText}</p>}
    </div>
  )
}
