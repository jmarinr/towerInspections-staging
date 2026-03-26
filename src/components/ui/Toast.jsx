export default function Toast({ message, type = 'info', show, onClose }) {
  const bg = { info: 'bg-gray-900', success: 'bg-green-600', error: 'bg-red-500', warning: 'bg-yellow-500' }[type]
  return (
    <div className={`fixed bottom-24 left-4 right-4 ${bg} text-white px-5 py-4 rounded-xl font-semibold text-sm z-[300] transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}`}>
      {message}
    </div>
  )
}
