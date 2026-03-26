const config = {
  bueno: { icon: '✓', label: 'Bueno', sel: 'border-green-500 bg-green-50', iconSel: 'bg-green-500 text-white', lblSel: 'text-green-600' },
  regular: { icon: '!', label: 'Regular', sel: 'border-yellow-500 bg-yellow-50', iconSel: 'bg-yellow-500 text-white', lblSel: 'text-yellow-700' },
  malo: { icon: '✕', label: 'Malo', sel: 'border-red-500 bg-red-50', iconSel: 'bg-red-500 text-white', lblSel: 'text-red-600' },
  na: { icon: '—', label: 'N/A', sel: 'border-gray-400 bg-gray-100', iconSel: 'bg-gray-400 text-white', lblSel: 'text-gray-600' },
}

export default function StatusButton({ status, selected, onClick }) {
  const c = config[status]
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 bg-white transition-all active:scale-95 min-h-[72px] ${selected ? c.sel : 'border-gray-200'}`}>
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${selected ? c.iconSel : 'border-gray-300 text-gray-400'}`}>{c.icon}</div>
      <div className={`text-[11px] font-semibold ${selected ? c.lblSel : 'text-gray-600'}`}>{c.label}</div>
    </button>
  )
}
