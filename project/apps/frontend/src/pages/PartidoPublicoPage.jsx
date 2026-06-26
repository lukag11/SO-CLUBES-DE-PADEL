import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Users, UserPlus, CalendarDays, Clock, Check, Zap, LogIn } from 'lucide-react'
import { api } from '../lib/api'
import usePlayerStore from '../store/playerStore'

// Página PÚBLICA del lobby de un partido abierto (lo que se abre desde el link de WhatsApp).
// Ver = cualquiera. Sumarse ("¡Voy!") = requiere login de jugador del club.
const C = { bg: '#0a0f0d', surface: '#141c18', line: 'rgba(244,245,239,0.08)', lima: '#afca0b', neon: '#d4ff3f', cream: '#f4f5ef', muted: '#9ba89f' }
const FONT_DISPLAY = "'Space Grotesk', sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function PartidoPublicoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAuth = usePlayerStore((s) => s.isAuthenticated)
  const token = usePlayerStore((s) => s.token)

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anotando, setAnotando] = useState(false)
  const [dentro, setDentro] = useState(false) // tras sumarme con éxito

  const cargar = () => {
    api.get(`/solicitudes/publica/${id}`)
      .then((d) => setP(d))
      .catch(() => setError('No encontramos este partido (o es privado).'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [id])
  // Auto-refresh suave: ver el lobby llenarse en vivo.
  useEffect(() => { const t = setInterval(cargar, 15000); return () => clearInterval(t) }, [id])

  const anotarme = () => {
    if (anotando) return
    setAnotando(true)
    setError('')
    api.post(`/solicitudes/${id}/voy`, {}, { Authorization: `Bearer ${token}` })
      .then((r) => { setDentro(true); if (r?.completo) setError(''); cargar() })
      .catch((e) => setError(e?.message || 'No se pudo sumar.'))
      .finally(() => setAnotando(false))
  }

  if (loading) return <Centro><p style={{ color: C.muted }}>Cargando…</p></Centro>
  if (error && !p) return <Centro><p style={{ color: C.muted }}>{error}</p></Centro>

  const esPareja = p.busco === 'pareja'
  const completo = p.estado === 'completa' || p.faltan <= 0
  const pct = p.cupos > 0 ? Math.min(100, (p.yaVan / p.cupos) * 100) : 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.cream }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64" style={{ background: `radial-gradient(60% 100% at 50% 0%, rgba(175,202,11,0.10), transparent 70%)` }} />
      <div className="relative max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(140deg, ${C.lima}, ${C.neon})`, boxShadow: `0 8px 24px -6px rgba(175,202,11,0.5)` }}>
            <Users size={19} style={{ color: C.bg }} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>{p.club}</p>
            <p className="text-[11px] leading-tight" style={{ color: C.muted }}>se arma un partido</p>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="rounded-3xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl grid place-items-center" style={{ backgroundColor: 'rgba(175,202,11,0.15)' }}>
              {esPareja ? <Users size={18} style={{ color: C.lima }} /> : <UserPlus size={18} style={{ color: C.lima }} />}
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>
                {esPareja ? 'Buscan una pareja rival' : `Faltan ${p.faltan} jugador${p.faltan !== 1 ? 'es' : ''}`}
              </h1>
              {p.categoria && <p className="text-xs" style={{ color: C.lima }}>{p.categoria}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <Dato icon={CalendarDays} texto={fmtFecha(p.fecha)} />
            <Dato icon={Clock} texto={`${p.horaInicio} hs`} />
            {p.nota && <Dato icon={UserPlus} texto={p.nota} />}
          </div>

          {/* Progreso del lobby */}
          <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: 'rgba(244,245,239,0.04)', border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: C.muted }}>Se sumaron</span>
              <span className="text-sm font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: C.cream }}>{p.yaVan} / {p.cupos}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,245,239,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.lima}, ${C.neon})` }} />
            </div>
            <p className="text-[11px] mt-2" style={{ color: C.muted }}>
              Organiza {p.solicitante}{completo ? ' · ¡Partido completo!' : ` · faltan ${p.faltan}`}
            </p>
          </div>

          {/* Quiénes se sumaron */}
          {p.roster?.length > 0 && (
            <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: 'rgba(244,245,239,0.04)', border: `1px solid ${C.line}` }}>
              <p className="text-xs font-semibold mb-2.5" style={{ color: C.muted }}>Ya están dentro</p>
              <div className="flex flex-col gap-1.5">
                {p.roster.map((nombre, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px]" style={{ color: 'rgba(244,245,239,0.9)' }}>
                    <span className="w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold tabular-nums shrink-0" style={{ backgroundColor: 'rgba(175,202,11,0.15)', color: C.lima }}>{i + 1}</span>
                    <span className="truncate">{nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {dentro ? (
            <div className="rounded-2xl py-3.5 px-4 text-center" style={{ backgroundColor: 'rgba(175,202,11,0.12)', border: `1px solid ${C.lima}` }}>
              <p className="text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: C.lima }}><Check size={16} /> ¡Estás dentro! Te esperamos en la cancha.</p>
            </div>
          ) : completo ? (
            <div className="rounded-2xl py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(244,245,239,0.04)', color: C.muted }}>
              El partido ya está completo.
            </div>
          ) : isAuth ? (
            <button onClick={anotarme} disabled={anotando}
              className="w-full font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY, boxShadow: `0 10px 30px -8px rgba(175,202,11,0.55)` }}>
              <Zap size={18} strokeWidth={2.5} /> {anotando ? 'Sumándote…' : '¡Voy!'}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => { try { localStorage.setItem('pending_partido', id) } catch {} ; navigate('/dashboardJugadores') }}
                className="w-full font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY }}>
                <LogIn size={17} /> Iniciá sesión para sumarte
              </button>
              <p className="text-[11px] text-center" style={{ color: C.muted }}>Necesitás tu cuenta del club para sumarte. Al iniciar sesión te sumamos solo.</p>
            </div>
          )}

          {error && <p className="text-[12px] text-center mt-2" style={{ color: '#ffb4ab' }}>{error}</p>}
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(155,168,159,0.55)' }}>
          Organizado con <Link to="/" style={{ color: C.lima, fontWeight: 600 }}>PadelwIArk</Link>
        </p>
      </div>
    </div>
  )
}

function Dato({ icon: Icon, texto }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={15} style={{ color: C.muted }} className="shrink-0" />
      <span className="text-sm capitalize" style={{ color: 'rgba(244,245,239,0.9)' }}>{texto}</span>
    </div>
  )
}

function Centro({ children }) {
  return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f0d' }}>{children}</div>
}
