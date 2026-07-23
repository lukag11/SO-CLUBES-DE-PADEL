import { useState } from 'react'
import { Zap, ArrowRight, ArrowLeft, Check, LayoutGrid, Clock, ImagePlus, PartyPopper, Loader2 } from 'lucide-react'
import useClubStore from '../../store/clubStore'
import useAuthStore from '../../store/authStore'
import { uploadImage } from '../../lib/api'

// Asistente de bienvenida (onboarding v1). Salta a pantalla completa la primera vez que el dueño
// entra a un club recién creado (0 canchas). Lo lleva de cero a club andando en pocos pasos con
// formularios simples. La magia de WIarky (pegar en lenguaje natural) llega en v2 encima de esto.
// El disparador y el descarte los maneja AdminDashboardLayout; acá solo se junta y se guarda.

const TIPOS = ['Cristal', 'Pared']
const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
const money = (n) => `$${(Number(n) || 0).toLocaleString('es-AR')}`

const AsistenteBienvenida = ({ onDone }) => {
  const clubNombre = useClubStore((s) => s.club.nombre)
  const aplicarOnboarding = useClubStore((s) => s.aplicarOnboarding)
  const saveClub = useClubStore((s) => s.saveClub)
  const token = useAuthStore((s) => s.token)

  const [step, setStep] = useState(0)
  const [cantidad, setCantidad] = useState(2)
  const [tipo, setTipo] = useState('Cristal')
  const [indoor, setIndoor] = useState(true)
  const [precio, setPrecio] = useState(12000)
  const [apertura, setApertura] = useState('08:00')
  const [cierre, setCierre] = useState('23:00')
  const [logo, setLogo] = useState(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const TOTAL = 5 // bienvenida, canchas, horario+tarifa, logo, listo
  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  const subirLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true); setError('')
    try {
      const url = await uploadImage(file, { profile: 'logo', folder: 'club', token })
      setLogo(url)
    } catch {
      setError('No se pudo subir el logo. Podés agregarlo después desde Club.')
    } finally { setSubiendoLogo(false) }
  }

  const finalizar = async () => {
    if (guardando) return
    setGuardando(true); setError('')
    aplicarOnboarding({ cantidad, tipo, indoor, precio, apertura, cierre, logo })
    const ok = await saveClub(token)
    if (ok) {
      onDone?.()
    } else {
      setError('No se pudo guardar. Revisá tu conexión y probá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-gradient-to-br from-dark-900 via-dark-900 to-[#141c18] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Header WIarky */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
            <Zap size={20} className="text-dark-900" />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold">WIarky</p>
            <p className="text-white/40 text-xs">Tu asistente de PadelwIArk</p>
          </div>
        </div>

        {/* Progreso */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="rounded-3xl bg-white shadow-2xl p-7 md:p-8">
          {/* Paso 0 — Bienvenida */}
          {step === 0 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 mb-5">
                <PartyPopper size={30} className="text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Bienvenido{clubNombre ? `, ${clubNombre}` : ''}! 🎾</h1>
              <p className="text-slate-500 text-sm mb-1">Te vamos a ayudar a dejar tu club andando, paso a paso.</p>
              <p className="text-slate-500 text-sm mb-7">Son 2 minutos. Después podés ajustar todo cuando quieras.</p>
              <button onClick={next} className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                Empezar <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Paso 1 — Canchas */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1"><LayoutGrid size={18} className="text-brand-600" /><h2 className="text-lg font-bold text-slate-800">Tus canchas</h2></div>
              <p className="text-slate-400 text-sm mb-6">¿Cuántas canchas tenés? Después las podés renombrar.</p>

              <label className="block text-xs font-medium text-slate-500 mb-1.5">Cantidad de canchas</label>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50">–</button>
                <span className="text-3xl font-bold text-slate-800 w-14 text-center">{cantidad}</span>
                <button onClick={() => setCantidad((c) => Math.min(20, c + 1))} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50">+</button>
              </div>

              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de pared</label>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {TIPOS.map((t) => (
                  <button key={t} onClick={() => setTipo(t)} className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${tipo === t ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{t}</button>
                ))}
              </div>

              <label className="block text-xs font-medium text-slate-500 mb-1.5">Techado</label>
              <div className="grid grid-cols-2 gap-2 mb-7">
                {[{ v: true, l: 'Techada', h: 'Indoor' }, { v: false, l: 'Descubierta', h: 'Outdoor' }].map((o) => (
                  <button key={o.l} onClick={() => setIndoor(o.v)} className={`py-2.5 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center leading-tight ${indoor === o.v ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {o.l}<span className="text-[10px] font-normal opacity-60">{o.h}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={back} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft size={15} /></button>
                <button onClick={next} className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">Seguir <ArrowRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Paso 2 — Horario + tarifa */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1"><Clock size={18} className="text-brand-600" /><h2 className="text-lg font-bold text-slate-800">Horario y precio</h2></div>
              <p className="text-slate-400 text-sm mb-6">El horario en que abrís y el precio del turno (1h30). Se aplica a todos los días; después lo afinás por día.</p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Abre</label>
                  <select value={apertura} onChange={(e) => setApertura(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400">
                    {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Cierra</label>
                  <select value={cierre} onChange={(e) => setCierre(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400">
                    {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <label className="block text-xs font-medium text-slate-500 mb-1.5">Precio del turno (1h30)</label>
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="500" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400" />
              </div>
              <p className="text-slate-400 text-xs mb-7">Se cobrará {money(precio)} por turno en todas las canchas.</p>

              <div className="flex gap-2">
                <button onClick={back} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft size={15} /></button>
                <button onClick={next} className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">Seguir <ArrowRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Paso 3 — Logo (opcional) */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-1"><ImagePlus size={18} className="text-brand-600" /><h2 className="text-lg font-bold text-slate-800">Tu logo <span className="text-slate-300 font-normal text-sm">(opcional)</span></h2></div>
              <p className="text-slate-400 text-sm mb-6">Para que tu club se vea profesional en la app y la web. Lo podés agregar después.</p>

              <div className="flex flex-col items-center gap-4 mb-7">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                  {logo ? <img src={logo} alt="logo" className="w-full h-full object-cover" /> : <ImagePlus size={28} className="text-slate-300" />}
                </div>
                <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                  {subiendoLogo ? <><Loader2 size={15} className="animate-spin" /> Subiendo…</> : <>{logo ? 'Cambiar logo' : 'Subir logo'}</>}
                  <input type="file" accept="image/*" onChange={subirLogo} disabled={subiendoLogo} className="hidden" />
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={back} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"><ArrowLeft size={15} /></button>
                <button onClick={next} className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">{logo ? 'Seguir' : 'Saltar por ahora'} <ArrowRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Paso 4 — Resumen + listo */}
          {step === 4 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 mb-5">
                <Check size={30} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo! 🎾</h1>
              <p className="text-slate-500 text-sm mb-5">Revisá que esté bien y arrancá:</p>

              <div className="text-left bg-slate-50 rounded-2xl p-4 mb-6 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Canchas</span><span className="text-slate-700 font-medium">{cantidad} · {tipo} · {indoor ? 'techadas' : 'descubiertas'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Horario</span><span className="text-slate-700 font-medium">{apertura} a {cierre}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Precio del turno</span><span className="text-slate-700 font-medium">{money(precio)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Logo</span><span className="text-slate-700 font-medium">{logo ? 'Cargado ✓' : 'Sin logo'}</span></div>
              </div>

              {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}

              <div className="flex gap-2">
                <button onClick={back} disabled={guardando} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"><ArrowLeft size={15} /></button>
                <button onClick={finalizar} disabled={guardando} className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Creando tu club…</> : <>Entrar a mi club <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AsistenteBienvenida
