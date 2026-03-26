import { useEffect, useRef } from 'react'

/**
 * Textarea that auto-expands vertically as the user types.
 * Accepts the same className and props as a regular <textarea>.
 */
export default function AutoTextarea({ value, onChange, className = '', placeholder = '', ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={className}
      style={{ resize: 'none', overflow: 'hidden', minHeight: '38px' }}
      {...props}
    />
  )
}
