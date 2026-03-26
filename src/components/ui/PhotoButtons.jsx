/**
 * PhotoButtons — two compact icon-only buttons for camera and gallery.
 * Renders two hidden file inputs (one with capture="environment" for camera,
 * one without for gallery) and two square icon buttons.
 *
 * Props:
 *   inputId   — base id; camera input = inputId + "-cam", gallery = inputId + "-gal"
 *   onChange  — called with the selected File event
 *   color     — tailwind color token: 'gray' | 'blue' | 'green' (default: 'gray')
 */
import { Camera, Image } from 'lucide-react'

const COLORS = {
  gray:  { border: 'border-gray-300',  bg: 'bg-gray-50',   icon: 'text-gray-500',  hover: 'hover:bg-gray-100 hover:border-gray-400' },
  blue:  { border: 'border-blue-300',  bg: 'bg-blue-50',   icon: 'text-blue-400',  hover: 'hover:bg-blue-100 hover:border-blue-400' },
  green: { border: 'border-green-300', bg: 'bg-green-50',  icon: 'text-green-500', hover: 'hover:bg-green-100 hover:border-green-400' },
}

export default function PhotoButtons({ inputId, onChange, color = 'gray' }) {
  const c = COLORS[color] || COLORS.gray
  const btn = `w-11 h-11 rounded-xl border-2 border-dashed ${c.border} ${c.bg} ${c.hover} flex items-center justify-center cursor-pointer active:scale-95 transition-all`

  return (
    <div className="flex gap-2">
      {/* Camera input */}
      <input
        id={`${inputId}-cam`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      {/* Gallery input */}
      <input
        id={`${inputId}-gal`}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />

      <label htmlFor={`${inputId}-cam`} className={btn} aria-label="Tomar foto con cámara">
        <Camera size={20} className={c.icon} />
      </label>

      <label htmlFor={`${inputId}-gal`} className={btn} aria-label="Seleccionar de galería">
        <Image size={20} className={c.icon} />
      </label>
    </div>
  )
}
