import { AlertTriangle } from 'lucide-react'

// Modal de confirmación genérico (Court Noir). danger=true → acción destructiva (rose).
const PwConfirm = ({ title, msg, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="pw-root w-full max-w-sm rounded-3xl border border-white/10 bg-[#141c18] p-7 text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 ${danger ? 'bg-rose-500/15 border border-rose-500/30' : 'bg-[#afca0b]/15 border border-[#afca0b]/30'}`}>
        <AlertTriangle size={22} className={danger ? 'text-rose-400' : 'text-[#d4ff3f]'} />
      </div>
      <h3 className="pw-display text-lg font-semibold text-[#f4f5ef] mb-2">{title}</h3>
      <p className="text-sm text-[#9ba89f] mb-6 leading-relaxed">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 rounded-full border border-white/12 text-[#f4f5ef] hover:bg-white/[0.03] px-4 py-2.5 text-sm font-medium transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${danger ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'pw-btn-lime'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
)

export default PwConfirm
