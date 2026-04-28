import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-soft max-w-lg w-full max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-primary/8 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="font-extrabold text-primary text-sm truncate">{title}</div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center hover:bg-primary/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
