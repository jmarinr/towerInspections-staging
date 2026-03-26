import { Check } from 'lucide-react'
import { useAppStore } from '../../hooks/useAppStore'

export default function AutosaveIndicator() {
  const { showAutosave } = useAppStore()
  return (
    <div className={`fixed top-20 right-4 z-[150] bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-300 ${showAutosave ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <Check size={14} strokeWidth={3} /> Guardado
    </div>
  )
}
