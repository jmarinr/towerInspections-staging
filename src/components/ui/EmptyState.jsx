import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Sin datos', description = '', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
        <Icon size={24} className="text-primary/40" />
      </div>
      <div className="font-extrabold text-primary/70 text-sm">{title}</div>
      {description && <div className="text-xs text-primary/50 mt-1 max-w-xs">{description}</div>}
    </div>
  )
}
