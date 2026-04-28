export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-white rounded-3xl border border-primary/8 shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
