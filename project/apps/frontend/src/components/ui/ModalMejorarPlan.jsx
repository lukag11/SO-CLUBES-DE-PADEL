import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { X, Check, Crown, ArrowUpRight } from 'lucide-react'
import { PLANES_INFO, ORDEN_PLAN, money } from '../../constants/planesInfo'
import { api } from '../../lib/api'

// Modal de upgrade IN-APP (mejor que redirigir al sitio de ventas). Muestra los 3 planes, marca el
// actual, y el CTA pide el upgrade por el canal de ventas de PadelwIArk. Ese canal (WhatsApp/email)
// se carga UNA vez en el panel /plataforma (GET /platform/contacto) → nada hardcodeado: cuando haya
// número real, se propaga solo. Si todavía no hay contacto, el botón degrada (no abre link roto).
const ModalMejorarPlan = ({ plan = 'basico', clubNombre = '', onClose }) => {
  const actual = ORDEN_PLAN[plan] ?? 0
  const [contacto, setContacto] = useState(null) // { whatsapp, email } · null = cargando

  useEffect(() => {
    api.get('/platform/contacto').then(setContacto).catch(() => setContacto({ whatsapp: '', email: '' }))
  }, [])

  const hayContacto = !!(contacto && (contacto.whatsapp || contacto.email))

  const pedir = (p) => {
    if (!hayContacto) return
    const msg = `¡Hola! Soy ${clubNombre || 'un club'} y quiero mejorar mi plan a ${p.nombre} (${money(p.precio)}/mes).`
    if (contacto.whatsapp) {
      window.open(`https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    } else {
      window.location.href = `mailto:${contacto.email}?subject=${encodeURIComponent('Quiero mejorar mi plan')}&body=${encodeURIComponent(msg)}`
    }
  }

  // Portal a document.body: el Sidebar usa transform (animación), que atraparía un position:fixed
  // adentro. Renderizando en el body, el modal cubre TODA la pantalla con el fondo difuminado.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-slate-800 font-bold text-lg">Mejorá tu plan</p>
            <p className="text-slate-400 text-xs mt-0.5">Desbloqueá más funciones para tu club</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANES_INFO.map((p) => {
            const orden = ORDEN_PLAN[p.id]
            const esActual = orden === actual
            const esMenor = orden < actual
            return (
              <div key={p.id} className={`rounded-2xl border p-5 flex flex-col ${p.destacado ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200'} ${esActual ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-slate-800">{p.nombre}</p>
                  {esActual && <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">Tu plan</span>}
                </div>
                <p className="text-xs text-slate-500 mb-3 min-h-[32px]">{p.tagline}</p>
                <p className="text-2xl font-bold text-slate-800">{money(p.precio)}<span className="text-sm font-normal text-slate-400">/mes</span></p>
                <ul className="flex flex-col gap-2 mt-4 mb-4 flex-1">
                  {p.incluye.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600"><Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />{f}</li>
                  ))}
                </ul>
                {esActual ? (
                  <div className="text-center text-xs text-slate-400 py-2 flex items-center justify-center gap-1"><Crown size={12} className="text-amber-400" /> Plan actual</div>
                ) : esMenor ? (
                  <div className="text-center text-xs text-slate-300 py-2">Incluido</div>
                ) : hayContacto ? (
                  <button onClick={() => pedir(p)} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors">
                    Mejorar a {p.nombre} <ArrowUpRight size={15} />
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold text-center">Disponible pronto</div>
                )}
              </div>
            )
          })}
        </div>
        <p className="px-6 pb-6 text-center text-[11px] text-slate-400">
          {hayContacto
            ? `Nos escribís${contacto.whatsapp ? ' por WhatsApp' : ''} y activamos tu plan al toque. 🎾`
            : 'Muy pronto vas a poder mejorar tu plan desde acá. 🎾'}
        </p>
      </div>
    </div>,
    document.body,
  )
}

export default ModalMejorarPlan
