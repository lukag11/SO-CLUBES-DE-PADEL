import { useState } from 'react'
import { Info } from 'lucide-react'

/**
 * InfoBlock — ayuda contextual colapsable.
 * variant="light"  → admin / fondos blancos
 * variant="dark"   → dashboard jugador / fondos oscuros
 */
const InfoBlock = ({ label = '¿Cómo funciona?', children, variant = 'light' }) => {
  const [open, setOpen] = useState(false)

  const isDark = variant === 'dark'

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 text-xs transition-colors select-none ${
          isDark
            ? 'text-white/30 hover:text-white/60'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Info size={11} />
        {label}
      </button>

      {open && (
        <div className={`mt-2 text-xs rounded-xl px-3 py-2.5 flex flex-col gap-1.5 leading-relaxed ${
          isDark
            ? 'bg-white/5 border border-white/10 text-white/60'
            : 'bg-sky-50/70 border border-sky-100 text-slate-600'
        }`}>
          {children}
        </div>
      )}
    </div>
  )
}

export default InfoBlock
