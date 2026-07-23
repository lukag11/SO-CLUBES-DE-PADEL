import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useClubStore from '../../store/clubStore'
import { api } from '../../lib/api'

// Tarjeta "Completá tu club": checklist de completitud del perfil (post-onboarding). Reglas
// deterministas del backend (GET /clubs/me/setup). Se muestra mientras falte algo y desaparece
// sola al llegar al 100%. Complementa el asistente de bienvenida: el wizard hace el mínimo, esto
// va guiando a completar el resto (logo, contacto, Mercado Pago, descripción).

const SetupChecklist = () => {
  const token = useAuthStore((s) => s.token)
  // Se recalcula cuando el club cambia (ej. tras guardar el logo/contacto) → refresca el checklist.
  const clubDirty = useClubStore((s) => s._dirty)
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [abierto, setAbierto] = useState(true)

  useEffect(() => {
    if (!token) return
    let activo = true
    api.get('/clubs/me/setup', { Authorization: `Bearer ${token}` })
      .then((r) => { if (activo) setData(r) })
      .catch(() => { if (activo) setData(null) })
    return () => { activo = false }
  }, [token, clubDirty])

  // Sin datos, o ya está todo completo → no molestamos.
  if (!data || data.porcentaje >= 100) return null

  const pendientes = data.items.filter((i) => !i.done)

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 to-white shadow-sm overflow-hidden">
      <button onClick={() => setAbierto((v) => !v)} className="w-full px-5 py-4 flex items-center gap-3 text-left">
        <span className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/30">
          <Sparkles size={17} className="text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">Completá tu club</p>
          <p className="text-xs text-slate-500">{data.hechos} de {data.total} listo · te falta poco 🎾</p>
        </div>
        {/* Barra de progreso */}
        <div className="hidden sm:flex items-center gap-2 w-40">
          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${data.porcentaje}%` }} />
          </div>
          <span className="text-xs font-bold text-brand-700 w-9 text-right">{data.porcentaje}%</span>
        </div>
        {abierto ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
      </button>

      {abierto && (
        <div className="px-5 pb-4 flex flex-col gap-1.5">
          {data.items.map((i) => (
            <div key={i.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${i.done ? '' : 'bg-white border border-slate-100'}`}>
              {i.done
                ? <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                : <Circle size={17} className="text-slate-300 shrink-0" />}
              <span className={`flex-1 text-sm ${i.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{i.label}</span>
              {!i.done && (
                <button
                  onClick={() => navigate(i.ruta)}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                >
                  {i.cta} <ArrowRight size={13} />
                </button>
              )}
            </div>
          ))}
          {pendientes.length === 0 && (
            <p className="text-xs text-emerald-600 font-medium px-1 py-1">¡Listo, tu club está completo! 🎉</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SetupChecklist
