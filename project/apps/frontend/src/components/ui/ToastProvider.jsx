import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

// Sistema de toasts unificado. Un solo Provider en la raíz + hook useToast()
// disponible en cualquier componente. Reemplaza las ~6 implementaciones sueltas.
//   const toast = useToast()
//   toast.success('Clase creada')
//   toast.error('No se pudo guardar')
//   toast.info('Turno liberado')

const ToastContext = createContext(null)

const VARIANTS = {
  success: { label: 'Éxito', Icon: CheckCircle2, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400', bar: 'bg-emerald-500' },
  error:   { label: 'Error', Icon: XCircle,      iconBg: 'bg-rose-500/15',    iconColor: 'text-rose-400',    bar: 'bg-rose-500' },
  info:    { label: 'Aviso', Icon: Info,         iconBg: 'bg-brand-500/15',   iconColor: 'text-brand-400',   bar: 'bg-brand-500' },
}

const ToastItem = ({ t, onClose }) => {
  const v = VARIANTS[t.type] || VARIANTS.info
  const Icon = t.icon || v.Icon // ícono custom opcional (mantiene el color del tipo)
  return (
    <div className="animate-toast-enter pointer-events-auto relative flex items-center gap-3.5 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/30 border border-white/8 min-w-[280px] max-w-sm overflow-hidden">
      <div className={`w-9 h-9 rounded-xl ${v.iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={v.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest leading-none mb-0.5">{t.label}</p>
        <p className="text-sm font-semibold text-white">{t.message}</p>
      </div>
      <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0 ml-1">
        <X size={14} />
      </button>
      <div className={`absolute bottom-0 left-0 h-[3px] ${v.bar} rounded-full`} style={{ animation: `toast-shrink ${t.duration}ms linear forwards` }} />
    </div>
  )
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((x) => x.id !== id))
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id] }
  }, [])

  const push = useCallback((type, message, { label, duration = 3500, icon } = {}) => {
    if (!message) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((list) => [...list, { id, type, message, label: label ?? VARIANTS[type]?.label, duration, icon }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const api = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error', m, o),
    info:    (m, o) => push('info', m, o),
    dismiss,
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Stack flotante, centrado abajo. Coexisten varios. */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

export default ToastProvider
