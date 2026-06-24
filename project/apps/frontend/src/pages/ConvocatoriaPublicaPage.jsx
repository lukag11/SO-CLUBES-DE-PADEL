import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trophy, Users, Repeat, Zap, CalendarDays, Clock, MapPin, Check, LogIn } from 'lucide-react'
import { api } from '../lib/api'
import usePlayerStore from '../store/playerStore'
import { rankingAmericano, rankingSuper8 } from '../lib/eventos'
import CargarResultados from '../components/eventos/CargarResultados'

// Página PÚBLICA de una convocatoria (lo que se abre desde el link de WhatsApp).
// Ver = cualquiera. Anotarse ("Voy") = requiere login de jugador (decisión de producto).
const C = { bg: '#0a0f0d', surface: '#141c18', line: 'rgba(244,245,239,0.08)', lima: '#afca0b', neon: '#d4ff3f', cream: '#f4f5ef', muted: '#9ba89f' }
const FONT_DISPLAY = "'Space Grotesk', sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ConvocatoriaPublicaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isAuth = usePlayerStore((s) => s.isAuthenticated)
  const token = usePlayerStore((s) => s.token)

  const [conv, setConv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anotando, setAnotando] = useState(false)
  const [miEstado, setMiEstado] = useState(null) // 'voy' | 'espera' tras anotarme
  const [anotados, setAnotados] = useState(null) // lista de nombres (solo logueados)
  const [soyOrganizador, setSoyOrganizador] = useState(false)
  const [cargarOpen, setCargarOpen] = useState(false)

  const cargar = () => {
    api.get(`/convocatorias/publica/${id}`)
      .then((c) => setConv(c))
      .catch(() => setError('No encontramos esta convocatoria.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { cargar() }, [id])

  // Auto-refresh suave (ranking en vivo para la TV/link): re-consulta cada 15s mientras la página
  // está abierta. Liviano: un solo endpoint público.
  useEffect(() => {
    const t = setInterval(() => { cargar() }, 15000)
    return () => clearInterval(t)
  }, [id])

  // Si estoy logueado: ver mi estado + traer la lista de anotados (con nombres). Anónimo no la ve.
  const cargarAnotados = () => {
    if (!isAuth || !token) return
    api.get(`/convocatorias/${id}`, { Authorization: `Bearer ${token}` })
      .then((r) => { setAnotados((r?.cupos || []).filter((c) => c.estado === 'voy')); setSoyOrganizador(!!r?.soyOrganizador) })
      .catch(() => setAnotados([]))
  }
  useEffect(() => {
    if (!isAuth || !token) { setAnotados(null); return }
    api.get(`/convocatorias/${id}/mi-estado`, { Authorization: `Bearer ${token}` })
      .then((r) => setMiEstado(r?.estado || null))
      .catch(() => {})
    cargarAnotados()
  }, [id, isAuth, token])

  const anotarme = () => {
    if (anotando) return
    setAnotando(true)
    setError('')
    api.post(`/convocatorias/${id}/voy`, {}, { Authorization: `Bearer ${token}` })
      .then((r) => { setMiEstado(r?.estado || 'voy'); cargar(); cargarAnotados() })
      .catch((e) => setError(e?.message || 'No se pudo anotar.'))
      .finally(() => setAnotando(false))
  }

  const bajarme = () => {
    if (anotando) return
    setAnotando(true)
    setError('')
    api.post(`/convocatorias/${id}/baja`, {}, { Authorization: `Bearer ${token}` })
      .then(() => { setMiEstado(null); cargar(); cargarAnotados() })
      .catch((e) => setError(e?.message || 'No se pudo dar de baja.'))
      .finally(() => setAnotando(false))
  }

  if (loading) return <Centro><p style={{ color: C.muted }}>Cargando…</p></Centro>
  if (error && !conv) return <Centro><p style={{ color: C.muted }}>{error}</p></Centro>

  const esAmericano = conv.modalidad !== 'super8'
  const Icon = esAmericano ? Repeat : Users
  const cerrada = conv.estado !== 'abierta'
  const lleno = conv.lugares <= 0
  // En juego = el fixture ya tiene rondas (el organizador arrancó a cargar). Mostramos ranking en vivo.
  const enJuego = conv.fixture?.rondas?.length > 0
  const ranking = enJuego ? (esAmericano ? rankingAmericano(conv.fixture) : rankingSuper8(conv.fixture)) : []
  const algunResultado = enJuego && conv.fixture.rondas.some((r) => r.partidos.some((p) => p.resultado))

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.cream }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64" style={{ background: `radial-gradient(60% 100% at 50% 0%, rgba(175,202,11,0.10), transparent 70%)` }} />
      <div className="relative max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(140deg, ${C.lima}, ${C.neon})`, boxShadow: `0 8px 24px -6px rgba(175,202,11,0.5)` }}>
            <Trophy size={19} style={{ color: C.bg }} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>{conv.club}</p>
            <p className="text-[11px] leading-tight" style={{ color: C.muted }}>te invita a jugar</p>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="rounded-3xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl grid place-items-center" style={{ backgroundColor: 'rgba(175,202,11,0.15)' }}>
              <Icon size={18} style={{ color: C.lima }} />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>
                {esAmericano ? 'Americano' : 'Super 8'}
              </h1>
              {conv.categorias?.length > 0 && (
                <p className="text-xs" style={{ color: C.lima }}>{conv.categorias.join(' · ')}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <Dato icon={CalendarDays} texto={fmtFecha(conv.fecha)} />
            <Dato icon={Clock} texto={`${conv.horaInicio} hs`} />
            <Dato icon={MapPin} texto={`${conv.canchas} ${conv.canchas === 1 ? 'cancha' : 'canchas'}`} />
          </div>

          {/* Cupos */}
          <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: 'rgba(244,245,239,0.04)', border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: C.muted }}>Anotados</span>
              <span className="text-sm font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: C.cream }}>{conv.voy} / {conv.cupoMax}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,245,239,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (conv.voy / conv.cupoMax) * 100)}%`, background: `linear-gradient(90deg, ${C.lima}, ${C.neon})` }} />
            </div>
            <p className="text-[11px] mt-2" style={{ color: C.muted }}>
              {lleno ? `Cupos llenos · ${conv.espera} en lista de espera` : `${conv.lugares} ${conv.lugares === 1 ? 'lugar' : 'lugares'} disponibles`}
            </p>
          </div>

          {/* Ranking EN VIVO — cuando el organizador arrancó a cargar (read-only, para la TV/link) */}
          {enJuego && (
            <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: 'rgba(175,202,11,0.06)', border: `1px solid rgba(175,202,11,0.3)` }}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: C.lima }}>
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.neon }} /><span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.neon }} /></span>
                  Ranking en vivo
                </p>
                <span className="text-[10px]" style={{ color: C.muted }}>{esAmericano ? 'puntos' : 'PG · dif'}</span>
              </div>
              {!algunResultado ? (
                <p className="text-[12px]" style={{ color: C.muted }}>El evento arrancó. Cuando se carguen los primeros resultados, la tabla se actualiza sola acá.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {ranking.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-1 rounded-lg" style={{ backgroundColor: i === 0 ? 'rgba(175,202,11,0.1)' : 'transparent' }}>
                      <span className="w-6 text-center font-bold tabular-nums text-sm" style={{ color: i === 0 ? C.neon : C.muted }}>{i + 1}</span>
                      <span className="flex-1 truncate text-sm" style={{ color: i === 0 ? C.cream : 'rgba(244,245,239,0.85)', fontWeight: i === 0 ? 700 : 400 }}>{r.nombre}</span>
                      <span className="font-bold tabular-nums text-sm" style={{ color: C.lima, fontFamily: FONT_MONO }}>
                        {esAmericano ? r.puntos : `${r.pg}`}
                        {!esAmericano && <span className="text-[10px] ml-1" style={{ color: C.muted }}>{r.dif >= 0 ? `+${r.dif}` : r.dif}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quiénes van — solo para jugadores logueados (privacidad) */}
          {isAuth && anotados !== null && (
            <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: 'rgba(244,245,239,0.04)', border: `1px solid ${C.line}` }}>
              <p className="text-xs font-semibold mb-2.5" style={{ color: C.muted }}>Quiénes van</p>
              {anotados.length === 0 ? (
                <p className="text-[12px]" style={{ color: C.muted }}>Todavía no se anotó nadie. ¡Estrenalo vos!</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {anotados.map((cu, i) => {
                    const nombre = cu.jugador ? `${cu.jugador.nombre} ${cu.jugador.apellido}` : (cu.nombre || 'Jugador')
                    const pos = cu.posicion || cu.jugador?.posicion
                    const lado = pos === 'Drive' ? 'D' : (pos === 'Revés' || pos === 'Reves') ? 'R' : null
                    return (
                      <div key={i} className="flex items-center gap-2 text-[13px]" style={{ color: 'rgba(244,245,239,0.9)' }}>
                        <span className="w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold tabular-nums shrink-0" style={{ backgroundColor: 'rgba(175,202,11,0.15)', color: C.lima }}>{i + 1}</span>
                        <span className="truncate">{nombre}</span>
                        {lado && <span className="text-[10px] shrink-0" style={{ color: C.muted }}>· {lado}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Organizador: arranca el Modo en vivo desde el mismo link (los demás solo miran) */}
          {soyOrganizador && !cerrada && (
            <button onClick={() => setCargarOpen(true)}
              className="w-full font-bold py-3.5 rounded-2xl mb-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY }}>
              <Trophy size={17} /> Modo en vivo · cargar resultados
            </button>
          )}

          {/* CTA */}
          {miEstado ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl py-3.5 px-4 text-center" style={{ backgroundColor: 'rgba(175,202,11,0.12)', border: `1px solid ${C.lima}` }}>
                <p className="text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: C.lima }}>
                  <Check size={16} /> {miEstado === 'voy' ? '¡Estás anotado!' : 'Estás en lista de espera'}
                </p>
              </div>
              <button onClick={bajarme} disabled={anotando}
                className="py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ color: C.muted, backgroundColor: 'rgba(244,245,239,0.04)', border: `1px solid ${C.line}` }}>
                {anotando ? 'Procesando…' : 'Ya no voy (bajarme)'}
              </button>
            </div>
          ) : cerrada ? (
            <div className="rounded-2xl py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(244,245,239,0.04)', color: C.muted }}>
              Esta convocatoria está cerrada.
            </div>
          ) : isAuth ? (
            <button onClick={anotarme} disabled={anotando}
              className="w-full font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY, boxShadow: `0 10px 30px -8px rgba(175,202,11,0.55)` }}>
              <Zap size={18} strokeWidth={2.5} /> {anotando ? 'Anotándote…' : (lleno ? 'Anotarme a la espera' : '¡Voy!')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => { try { localStorage.setItem('pending_convocatoria', id) } catch {} ; navigate('/dashboardJugadores') }}
                className="w-full font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY }}>
                <LogIn size={17} /> Iniciá sesión para anotarte
              </button>
              <p className="text-[11px] text-center" style={{ color: C.muted }}>Necesitás tu cuenta del club para sumarte. Al iniciar sesión te anotamos solo.</p>
            </div>
          )}

          {error && <p className="text-[12px] text-center mt-2" style={{ color: '#ffb4ab' }}>{error}</p>}
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(155,168,159,0.55)' }}>
          Organizado con <Link to="/" style={{ color: C.lima, fontWeight: 600 }}>PadelwIArk</Link>
        </p>
      </div>

      {cargarOpen && (
        <CargarResultados convId={id} token={token} onClose={() => { setCargarOpen(false); cargar(); cargarAnotados() }} />
      )}
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
