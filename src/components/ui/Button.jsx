const base = 'inline-flex items-center justify-center gap-2 font-bold text-sm rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-light shadow-soft px-4 py-2.5',
  accent: 'bg-accent text-white hover:bg-accent/90 shadow-soft px-4 py-2.5',
  outline: 'border border-primary/15 text-primary bg-white hover:bg-primary/5 px-4 py-2.5',
  ghost: 'text-primary/70 hover:bg-primary/5 px-3 py-2',
  danger: 'bg-danger text-white hover:bg-danger/90 px-4 py-2.5',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}
