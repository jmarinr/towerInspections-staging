import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function Select({
  label,
  description,
  required,
  options = [],
  successText = '✓ Opción válida',
  errorText = '⚠ Campo requerido',
  ...props
}) {
  const [touched, setTouched] = useState(false)
  const value = props.value ?? ''

  const isEmpty = useMemo(() => String(value).trim().length === 0, [value])
  const isValid = useMemo(() => {
    if (!required && isEmpty) return null
    if (required && isEmpty) return false
    return true
  }, [required, isEmpty])

  const showError = touched && isValid === false
  const showSuccess = touched && isValid === true

  const borderClass = showError
    ? 'border-red-500'
    : showSuccess
      ? 'border-emerald-500'
      : 'border-gray-200'

  return (
    <div className="mb-4">
      {label && (
        <label className="block mb-2">
          <span className="text-sm font-semibold text-gray-700 flex flex-wrap items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
          {description && <span className="text-xs text-gray-500 block mt-1">{description}</span>}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full px-4 py-3 pr-10 text-[15px] border-2 rounded-xl bg-white appearance-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 ${borderClass}`}
          onChange={(e) => {
            if (!touched) setTouched(true)
            props.onChange?.(e)
          }}
          onBlur={(e) => {
            setTouched(true)
            props.onBlur?.(e)
          }}
        >
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {showError && <p className="mt-2 text-xs text-red-500 font-medium">{errorText}</p>}
      {showSuccess && <p className="mt-2 text-xs text-emerald-600 font-semibold">{successText}</p>}
    </div>
  )
}
