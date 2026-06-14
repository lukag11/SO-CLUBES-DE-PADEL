import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

// Panel de ayuda reutilizable: un botón ⓘ que abre un slide-over con una guía de la sección.
// Patrón pensado para replicar en todo el sistema y, a futuro, alojar el asistente IA (premium).
// Uso: <AyudaPanel titulo="Cómo funciona X"><AyudaSeccion .../>…</AyudaPanel>
const AyudaPanel = ({ titulo = 'Ayuda', children }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="¿Cómo funciona?"
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand-500 transition-colors"
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-brand-500" />
                <p className="text-slate-800 font-bold">{titulo}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-6 flex flex-col gap-5">{children}</div>
          </div>
        </div>
      )}
    </>
  )
}

// Sección de la guía: título + contenido.
export const AyudaSeccion = ({ icon: Icon, titulo, children }) => (
  <div>
    <p className="flex items-center gap-2 text-slate-800 font-semibold text-sm mb-1.5">
      {Icon && <Icon size={15} className="text-brand-500" />}{titulo}
    </p>
    <div className="text-sm text-slate-500 leading-relaxed flex flex-col gap-1.5">{children}</div>
  </div>
)

export default AyudaPanel
