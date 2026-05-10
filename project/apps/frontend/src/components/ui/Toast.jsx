import { X } from 'lucide-react'

const Toast = ({ icon: Icon, iconBg, iconColor, barColor = 'bg-white/25', label, message, duration = 3500, onClose }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+2rem)] z-50 animate-toast-enter">
    <div className="relative flex items-center gap-3.5 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/30 border border-white/8 min-w-[280px] max-w-sm overflow-hidden">

      {/* Ícono */}
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={iconColor} />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-white">{message}</p>
      </div>

      {/* Cerrar */}
      <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0 ml-1">
        <X size={14} />
      </button>

      {/* Barra de progreso */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${barColor} rounded-full`}
        style={{ animation: `toast-shrink ${duration}ms linear forwards` }}
      />
    </div>
  </div>
)

export default Toast
