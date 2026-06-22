import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Repeat, Plus, Trash2, ArrowLeft, Crown, Zap, Minus, ChevronDown, HelpCircle, CheckCircle2, AlertCircle, CalendarDays, Clock, ArrowRight, Megaphone } from 'lucide-react'
import {
  generarFixtureAmericano, rankingAmericano, validarPartidoAmericano,
  generarFixtureSuper8, rankingSuper8, validarSetPadel,
} from '../lib/eventos'
import { api } from '../lib/api'

// Herramienta pública self-service: un grupo arma su Americano o Super 8 desde el celu.
// Estado client-side, persistido en localStorage (dato transitorio de un evento social, no
// data de negocio del club). Sin login, sin backend. El "link compartido" queda para el futuro.
const LS_KEY = 'padelwiark_evento'

// ── Court Noir — sistema de diseño ──
const C = {
  bg: '#0a0f0d',
  surface: '#141c18',
  line: 'rgba(244,245,239,0.08)',
  lima: '#afca0b',
  neon: '#d4ff3f',
  teal: '#14b8a6',
  cream: '#f4f5ef',
  muted: '#9ba89f',
}
const FONT_DISPLAY = "'Space Grotesk', sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"

const surface = {
  backgroundColor: C.surface,
  border: `1px solid ${C.line}`,
}

export default function EventosPage() {
  const [fixture, setFixture] = useState(() => {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
  })
  // Vista: 'hub' (elegir) | 'jugar' (la herramienta instantánea) | 'eventos' (convocatorias del club)
  const [modo, setModo] = useState(fixture ? 'jugar' : 'hub')

  useEffect(() => {
    if (fixture) localStorage.setItem(LS_KEY, JSON.stringify(fixture))
    else localStorage.removeItem(LS_KEY)
  }, [fixture])

  const reset = () => { if (confirm('¿Empezar un evento nuevo? Se borra el actual.')) setFixture(null) }

  const titulo = modo === 'jugar' ? 'Jugá ahora' : modo === 'eventos' ? 'Eventos del club' : 'Americano y Super 8'

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.cream }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64" style={{ background: `radial-gradient(60% 100% at 50% 0%, rgba(175,202,11,0.10), transparent 70%)` }} />

      <div className="relative max-w-2xl mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-7">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(140deg, ${C.lima}, ${C.neon})`, boxShadow: `0 8px 24px -6px rgba(175,202,11,0.5)` }}>
            <Trophy size={20} style={{ color: C.bg }} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em', color: C.cream }}>{titulo}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: C.lima, backgroundColor: 'rgba(175,202,11,0.12)', border: `1px solid ${C.line}` }}>PadelwIArk</span>
              <span className="text-xs leading-none" style={{ color: C.muted }}>Americano · Super 8</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {modo === 'jugar' && fixture && (
              <button onClick={reset} className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95" style={{ color: C.muted, ...surface }}>
                <ArrowLeft size={14} /> Nuevo
              </button>
            )}
            {modo !== 'hub' && (
              <button onClick={() => setModo('hub')} className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95" style={{ color: C.muted, ...surface }}>
                Inicio
              </button>
            )}
          </div>
        </header>

        {modo === 'hub' && <Hub onJugar={() => setModo('jugar')} onEventos={() => setModo('eventos')} />}
        {modo === 'jugar' && (fixture ? <Jugar fixture={fixture} setFixture={setFixture} /> : <Setup onGenerar={setFixture} />)}
        {modo === 'eventos' && <EventosClub />}

        <p className="text-center text-[11px] mt-10" style={{ color: 'rgba(155,168,159,0.55)' }}>
          Hecho con <span style={{ color: C.lima, fontWeight: 600 }}>PadelwIArk</span>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────── HUB: elegir camino ───────────────────────
function Hub({ onJugar, onEventos }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed mb-1" style={{ color: C.muted }}>
        ¿Ya están en el club listos para jugar, o querés sumarte a un evento que organizó el club?
      </p>
      <button onClick={onJugar} className="text-left rounded-2xl p-5 transition-all active:scale-[0.99] flex items-center gap-4" style={{ ...surface }}>
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{ background: `linear-gradient(140deg, ${C.lima}, ${C.neon})` }}>
          <Zap size={22} style={{ color: C.bg }} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Jugá ahora</p>
          <p className="text-[13px] leading-snug mt-0.5" style={{ color: C.muted }}>Armá el fixture y llevá el ranking en el momento. Sin cuenta, al toque.</p>
        </div>
        <ArrowRight size={18} style={{ color: C.lima }} className="shrink-0" />
      </button>
      <button onClick={onEventos} className="text-left rounded-2xl p-5 transition-all active:scale-[0.99] flex items-center gap-4" style={{ ...surface }}>
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(20,184,166,0.18)' }}>
          <Megaphone size={22} style={{ color: C.teal }} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Sumate a un evento del club</p>
          <p className="text-[13px] leading-snug mt-0.5" style={{ color: C.muted }}>Mirá los Americano y Super 8 que organizó el club y anotate.</p>
        </div>
        <ArrowRight size={18} style={{ color: C.teal }} className="shrink-0" />
      </button>
    </div>
  )
}

// ─────────────────────── EVENTOS DEL CLUB (convocatorias abiertas) ───────────────────────
function EventosClub() {
  const slug = import.meta.env.VITE_CLUB_SLUG
  const [lista, setLista] = useState(null)

  useEffect(() => {
    if (!slug) { setLista([]); return }
    api.get(`/convocatorias/publica/club/${slug}`)
      .then((r) => setLista(Array.isArray(r) ? r : []))
      .catch(() => setLista([]))
  }, [slug])

  const fmt = (f) => { if (!f) return ''; const [y, m, d] = f.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) }

  if (lista === null) return <p className="text-sm" style={{ color: C.muted }}>Cargando eventos…</p>
  if (!lista.length) return (
    <div className="rounded-2xl p-6 text-center" style={surface}>
      <Megaphone size={26} className="mx-auto mb-2" style={{ color: C.muted }} />
      <p className="text-sm" style={{ color: C.muted }}>No hay eventos abiertos por ahora. Cuando el club organice un Americano o Super 8, va a aparecer acá.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {lista.map((c) => {
        const esAme = c.modalidad !== 'super8'
        return (
          <Link key={c.id} to={`/convocatoria/${c.id}`} className="rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.99]" style={surface}>
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(175,202,11,0.15)' }}>
              {esAme ? <Repeat size={18} style={{ color: C.lima }} /> : <Users size={18} style={{ color: C.lima }} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>
                {esAme ? 'Americano' : 'Super 8'}{c.categorias?.length ? ` · ${c.categorias.join('/')}` : ''}
              </p>
              <p className="text-[12px] mt-0.5 flex items-center gap-2" style={{ color: C.muted }}>
                <span className="flex items-center gap-1 capitalize"><CalendarDays size={12} /> {fmt(c.fecha)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {c.horaInicio}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: c.lugares > 0 ? C.lima : C.muted }}>{c.voy}/{c.cupoMax}</p>
              <p className="text-[10px]" style={{ color: C.muted }}>{c.lugares > 0 ? `${c.lugares} lib.` : 'lleno'}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─────────────────────── SETUP ───────────────────────
function Setup({ onGenerar }) {
  const [modalidad, setModalidad] = useState('americano')
  const [jugadores, setJugadores] = useState(['', '', '', '', '', '', '', ''])
  const [parejas, setParejas] = useState([{ j1: '', j2: '' }, { j1: '', j2: '' }, { j1: '', j2: '' }, { j1: '', j2: '' }])
  const [canchas, setCanchas] = useState(2)
  const [puntos, setPuntos] = useState(21)
  const [error, setError] = useState('')

  const generar = () => {
    setError('')
    if (modalidad === 'americano') {
      const nombres = jugadores.map((j) => j.trim()).filter(Boolean)
      if (nombres.length < 4) return setError('Cargá al menos 4 jugadores.')
      if (nombres.length % 4 !== 0) return setError('El Americano necesita un número de jugadores múltiplo de 4 (4, 8, 12, 16…).')
      const lim = Math.max(2, parseInt(puntos, 10) || 21)
      onGenerar(generarFixtureAmericano(nombres, Math.max(1, canchas), lim))
    } else {
      const ps = parejas.map((p) => ({ j1: p.j1.trim(), j2: p.j2.trim() })).filter((p) => p.j1 && p.j2)
      if (ps.length < 3) return setError('Cargá al menos 3 parejas para que haya un torneo.')
      onGenerar(generarFixtureSuper8(ps, Math.max(1, canchas)))
    }
  }

  const cargados = modalidad === 'americano'
    ? jugadores.filter((j) => j.trim()).length
    : parejas.filter((p) => p.j1.trim() && p.j2.trim()).length

  return (
    <div className="flex flex-col gap-4">
      {/* Modalidad */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: C.muted }}>
          Elegí la modalidad
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ModCard activo={modalidad === 'americano'} onClick={() => setModalidad('americano')}
            icon={Repeat} titulo="Americano" desc="Jugás con TODOS, las parejas rotan. Ranking individual." />
          <ModCard activo={modalidad === 'super8'} onClick={() => setModalidad('super8')}
            icon={Users} titulo="Super 8" desc="Parejas FIJAS, todos contra todos. Ranking por pareja." />
        </div>
      </div>

      {/* Explicativo de la modalidad elegida */}
      <ComoFunciona modalidad={modalidad} />

      {/* Jugadores o parejas */}
      <div className="rounded-2xl p-4" style={surface}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>
            {modalidad === 'americano' ? 'Jugadores' : 'Parejas'}
          </p>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: C.lima, backgroundColor: 'rgba(175,202,11,0.10)', fontFamily: FONT_MONO }}
          >
            {cargados} {modalidad === 'americano' ? 'jug.' : 'par.'}
          </span>
        </div>

        {modalidad === 'americano' ? (
          <div className="flex flex-col gap-2">
            {jugadores.map((j, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 shrink-0 grid place-items-center rounded-lg text-xs font-bold"
                  style={{ color: C.muted, backgroundColor: 'rgba(244,245,239,0.04)', fontFamily: FONT_MONO }}
                >
                  {i + 1}
                </span>
                <input
                  value={j}
                  onChange={(e) => setJugadores(jugadores.map((x, k) => k === i ? e.target.value : x))}
                  placeholder={`Jugador ${i + 1}`}
                  className="flex-1 min-w-0 px-3.5 rounded-xl text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
                {jugadores.length > 4 && (
                  <button
                    onClick={() => setJugadores(jugadores.filter((_, k) => k !== i))}
                    aria-label={`Eliminar jugador ${i + 1}`}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-xl transition-all active:scale-90"
                    style={{ color: C.muted }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <AddButton onClick={() => setJugadores([...jugadores, ''])} label="Agregar jugador" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {parejas.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 shrink-0 grid place-items-center rounded-lg text-xs font-bold"
                  style={{ color: C.muted, backgroundColor: 'rgba(244,245,239,0.04)', fontFamily: FONT_MONO }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <input
                    value={p.j1}
                    onChange={(e) => setParejas(parejas.map((x, k) => k === i ? { ...x, j1: e.target.value } : x))}
                    placeholder="Jugador 1"
                    className="flex-1 min-w-0 px-3 rounded-xl text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <span className="text-xs font-bold" style={{ color: 'rgba(244,245,239,0.25)' }}>+</span>
                  <input
                    value={p.j2}
                    onChange={(e) => setParejas(parejas.map((x, k) => k === i ? { ...x, j2: e.target.value } : x))}
                    placeholder="Jugador 2"
                    className="flex-1 min-w-0 px-3 rounded-xl text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </div>
                {parejas.length > 3 && (
                  <button
                    onClick={() => setParejas(parejas.filter((_, k) => k !== i))}
                    aria-label={`Eliminar pareja ${i + 1}`}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-xl transition-all active:scale-90"
                    style={{ color: C.muted }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <AddButton onClick={() => setParejas([...parejas, { j1: '', j2: '' }])} label="Agregar pareja" />
          </div>
        )}
      </div>

      {/* Canchas */}
      <div className="rounded-2xl p-4 flex items-center justify-between" style={surface}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Canchas</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>cuántas se juegan en simultáneo</p>
        </div>
        <div className="flex items-center gap-2">
          <StepBtn onClick={() => setCanchas(Math.max(1, canchas - 1))} aria="Quitar cancha"><Minus size={18} /></StepBtn>
          <span
            className="w-10 text-center text-2xl font-bold tabular-nums"
            style={{ color: C.cream, fontFamily: FONT_MONO }}
          >
            {canchas}
          </span>
          <StepBtn onClick={() => setCanchas(canchas + 1)} aria="Agregar cancha"><Plus size={18} /></StepBtn>
        </div>
      </div>

      {/* Puntos por partido — solo Americano */}
      {modalidad === 'americano' && (
        <div className="rounded-2xl p-4" style={surface}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Puntos por partido</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>se gana por diferencia de 2</p>
            </div>
            <div className="flex items-center gap-2">
              <StepBtn onClick={() => setPuntos(Math.max(2, (parseInt(puntos, 10) || 21) - 1))} aria="Restar punto"><Minus size={18} /></StepBtn>
              <input
                inputMode="numeric"
                value={puntos}
                onChange={(e) => setPuntos(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                onBlur={() => setPuntos(Math.max(2, parseInt(puntos, 10) || 21))}
                aria-label="Puntos por partido"
                className="w-14 h-11 text-center text-xl font-bold tabular-nums rounded-xl outline-none"
                style={{ ...inputStyle, fontFamily: FONT_MONO }}
                onFocus={onInputFocus}
              />
              <StepBtn onClick={() => setPuntos(Math.min(99, (parseInt(puntos, 10) || 21) + 1))} aria="Sumar punto"><Plus size={18} /></StepBtn>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {[16, 21, 24, 32].map((n) => (
              <button key={n} onClick={() => setPuntos(n)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-all active:scale-95"
                style={parseInt(puntos, 10) === n
                  ? { backgroundColor: 'rgba(175,202,11,0.16)', color: C.lima, border: `1px solid ${C.lima}`, fontFamily: FONT_MONO }
                  : { backgroundColor: 'rgba(244,245,239,0.04)', color: C.muted, border: `1px solid ${C.line}`, fontFamily: FONT_MONO }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p
          className="text-sm rounded-xl px-4 py-3"
          style={{ color: '#ffb4ab', backgroundColor: 'rgba(255,99,80,0.10)', border: '1px solid rgba(255,99,80,0.25)' }}
        >
          {error}
        </p>
      )}

      <button
        onClick={generar}
        className="font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`,
          color: C.bg,
          fontFamily: FONT_DISPLAY,
          letterSpacing: '-0.01em',
          boxShadow: `0 10px 30px -8px rgba(175,202,11,0.55)`,
        }}
      >
        <Zap size={19} strokeWidth={2.5} /> Generar fixture
      </button>
    </div>
  )
}

const inputStyle = {
  height: 44,
  backgroundColor: 'rgba(244,245,239,0.04)',
  border: `1px solid ${C.line}`,
  color: C.cream,
}
const onInputFocus = (e) => {
  e.currentTarget.style.borderColor = C.lima
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(175,202,11,0.15)'
}
const onInputBlur = (e) => {
  e.currentTarget.style.borderColor = C.line
  e.currentTarget.style.boxShadow = 'none'
}

function AddButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 self-start text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95"
      style={{ color: C.lima, backgroundColor: 'rgba(175,202,11,0.08)', border: `1px solid ${C.line}` }}
    >
      <Plus size={14} strokeWidth={2.5} /> {label}
    </button>
  )
}

function StepBtn({ onClick, children, aria }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="w-11 h-11 grid place-items-center rounded-xl transition-all active:scale-90"
      style={{ color: C.cream, backgroundColor: 'rgba(244,245,239,0.05)', border: `1px solid ${C.line}` }}
    >
      {children}
    </button>
  )
}

function ModCard({ activo, onClick, icon: Icon, titulo, desc }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{
        backgroundColor: activo ? 'rgba(175,202,11,0.10)' : C.surface,
        border: `1px solid ${activo ? C.lima : C.line}`,
        boxShadow: activo ? '0 8px 24px -10px rgba(175,202,11,0.45)' : 'none',
      }}
    >
      <span
        className="w-9 h-9 grid place-items-center rounded-xl mb-2.5"
        style={{
          backgroundColor: activo ? 'rgba(175,202,11,0.18)' : 'rgba(244,245,239,0.05)',
          color: activo ? C.lima : C.muted,
        }}
      >
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <p
        className="text-sm font-bold"
        style={{ color: activo ? C.cream : C.cream, fontFamily: FONT_DISPLAY }}
      >
        {titulo}
      </p>
      <p className="text-[11px] leading-snug mt-1" style={{ color: C.muted }}>{desc}</p>
    </button>
  )
}

// Explicativo desplegable de la modalidad elegida.
const REGLAS = {
  americano: {
    titulo: 'Cómo funciona el Americano',
    bullets: [
      'Te anotás de forma individual: no venís con pareja fija.',
      'Cada ronda las parejas ROTAN — vas a jugar con (y contra) la mayor cantidad de gente posible.',
      'Cada partido se juega a los puntos que elijas (ej. 21) y se gana por diferencia de 2.',
      'Sumás para tu ranking los puntos que hizo tu pareja en cada partido.',
      'Gana el torneo el jugador con más puntos al final. Ranking individual.',
    ],
  },
  super8: {
    titulo: 'Cómo funciona el Super 8',
    bullets: [
      'Te anotás con tu pareja fija: juegan juntos todo el torneo.',
      'Todos contra todos: cada pareja enfrenta una vez a cada otra.',
      'Cada partido es un set de pádel (6-0 a 6-4, 7-5 o 7-6).',
      'Gana la pareja que gana el set.',
      'Ranking por pareja: primero partidos ganados, después diferencia de games.',
    ],
  },
}

function ComoFunciona({ modalidad }) {
  const [open, setOpen] = useState(false)
  const r = REGLAS[modalidad]
  return (
    <div className="rounded-2xl overflow-hidden" style={surface}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left">
        <HelpCircle size={17} style={{ color: C.lima }} />
        <span className="text-sm font-bold flex-1" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>{r.titulo}</span>
        <ChevronDown size={18} style={{ color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <ul className="px-4 pb-4 pt-0.5 flex flex-col gap-2">
          {r.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: 'rgba(244,245,239,0.7)' }}>
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: C.lima }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────── JUGAR (fixture + ranking) ───────────────────────
function Jugar({ fixture, setFixture }) {
  const esAmericano = fixture.modalidad === 'americano'
  const limite = fixture.puntosLimite ?? 21
  const ranking = useMemo(() => esAmericano ? rankingAmericano(fixture) : rankingSuper8(fixture), [fixture, esAmericano])

  const setResultado = (ri, pi, lado, valor) => {
    const v = valor === '' ? null : Math.max(0, parseInt(valor, 10) || 0)
    setFixture((prev) => {
      const f = structuredClone(prev)
      const p = f.rondas[ri].partidos[pi]
      const res = p.resultado || { a: null, b: null }
      res[lado] = v
      p.resultado = (res.a == null && res.b == null) ? null : res
      return f
    })
  }

  const nombreJ = (i) => fixture.jugadores[i]
  const nombrePareja = (i) => `${fixture.parejas[i].j1} / ${fixture.parejas[i].j2}`

  return (
    <div className="flex flex-col gap-5">
      {/* Ranking en vivo — héroe */}
      <div className="rounded-2xl overflow-hidden" style={surface}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Crown size={16} style={{ color: C.lima }} />
          <h2 className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Ranking en vivo</h2>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ml-auto flex items-center gap-1.5"
            style={{ color: C.lima, backgroundColor: 'rgba(175,202,11,0.10)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.neon }} />
            {esAmericano ? 'Americano' : 'Super 8'}
          </span>
        </div>
        <div className="flex flex-col">
          {ranking.map((r, pos) => {
            const lider = pos === 0
            return (
              <div
                key={r.idx}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderTop: `1px solid ${C.line}`,
                  background: lider
                    ? `linear-gradient(90deg, rgba(175,202,11,0.14), rgba(175,202,11,0.02))`
                    : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 shrink-0 grid place-items-center rounded-lg text-sm font-bold"
                  style={{
                    fontFamily: FONT_MONO,
                    color: lider ? C.bg : C.muted,
                    backgroundColor: lider ? C.lima : 'rgba(244,245,239,0.05)',
                    boxShadow: lider ? '0 0 16px -2px rgba(175,202,11,0.6)' : 'none',
                  }}
                >
                  {pos + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  {lider && <Crown size={13} style={{ color: C.lima }} className="shrink-0" />}
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: lider ? C.cream : 'rgba(244,245,239,0.85)' }}
                  >
                    {r.nombre}
                  </span>
                </div>
                {esAmericano ? (
                  <span className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: lider ? C.neon : C.cream }}>
                      {r.puntos}
                    </span>
                    <span className="text-[10px] ml-1" style={{ color: C.muted, fontFamily: FONT_MONO }}>pts · {r.pj}pj</span>
                  </span>
                ) : (
                  <span className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: lider ? C.neon : C.cream }}>
                      {r.pg}
                    </span>
                    <span className="text-[10px] ml-1" style={{ color: C.muted, fontFamily: FONT_MONO }}>
                      PG · {r.dif > 0 ? '+' : ''}{r.dif}
                    </span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rondas */}
      {fixture.rondas.map((ronda, ri) => (
        <div key={ri} className="rounded-2xl p-4" style={surface}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 grid place-items-center rounded-xl text-sm font-bold"
                style={{ fontFamily: FONT_MONO, color: C.lima, backgroundColor: 'rgba(175,202,11,0.12)', border: `1px solid ${C.line}` }}
              >
                {ronda.numero}
              </span>
              <h3 className="text-sm font-bold" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>Ronda</h3>
            </div>
            {ronda.descansan?.length > 0 && (
              <span className="text-[11px] text-right" style={{ color: C.muted }}>
                Descansa: {ronda.descansan.map(nombreJ).join(', ')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {ronda.partidos.map((p, pi) => {
              const labelA = esAmericano ? p.equipoA.map(nombreJ).join(' / ') : nombrePareja(p.parejaA)
              const labelB = esAmericano ? p.equipoB.map(nombreJ).join(' / ') : nombrePareja(p.parejaB)
              const val = esAmericano
                ? validarPartidoAmericano(p.resultado?.a ?? null, p.resultado?.b ?? null, limite)
                : validarSetPadel(p.resultado?.a ?? null, p.resultado?.b ?? null)
              const winA = val.valido && val.ganador === 'a'
              const winB = val.valido && val.ganador === 'b'
              const malCargado = val.completo && !val.valido
              return (
                <div
                  key={pi}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(244,245,239,0.03)', border: `1px solid ${malCargado ? 'rgba(255,99,80,0.4)' : C.line}` }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: C.teal, backgroundColor: 'rgba(20,184,166,0.12)', fontFamily: FONT_MONO }}
                    >
                      Cancha {p.cancha}
                    </span>
                    <span className="text-[10px]" style={{ color: C.muted, fontFamily: FONT_MONO }}>
                      {esAmericano ? `a ${limite} · gana x2` : '1 set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-sm font-semibold text-right truncate flex items-center justify-end gap-1"
                      style={{ color: winA ? C.lima : 'rgba(244,245,239,0.9)' }}>
                      {winA && <Crown size={12} className="shrink-0" />}{labelA}
                    </span>
                    <ScoreInput value={p.resultado?.a ?? ''} onChange={(e) => setResultado(ri, pi, 'a', e.target.value)} aria={`Puntaje ${labelA}`} invalid={malCargado} win={winA} />
                    <span className="text-[10px] font-bold shrink-0" style={{ color: 'rgba(244,245,239,0.25)', fontFamily: FONT_MONO }}>VS</span>
                    <ScoreInput value={p.resultado?.b ?? ''} onChange={(e) => setResultado(ri, pi, 'b', e.target.value)} aria={`Puntaje ${labelB}`} invalid={malCargado} win={winB} />
                    <span className="flex-1 min-w-0 text-sm font-semibold truncate flex items-center gap-1"
                      style={{ color: winB ? C.lima : 'rgba(244,245,239,0.9)' }}>
                      {labelB}{winB && <Crown size={12} className="shrink-0" />}
                    </span>
                  </div>
                  {malCargado && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <AlertCircle size={12} style={{ color: '#ffb4ab' }} />
                      <span className="text-[11px]" style={{ color: '#ffb4ab' }}>{val.motivo}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreInput({ value, onChange, aria, invalid = false, win = false }) {
  const baseBorder = invalid ? 'rgba(255,99,80,0.6)' : win ? C.lima : C.line
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={onChange}
      aria-label={aria}
      placeholder="–"
      className="w-12 h-12 text-center rounded-xl text-xl font-bold outline-none transition-all shrink-0 tabular-nums"
      style={{
        fontFamily: FONT_MONO,
        backgroundColor: win ? 'rgba(175,202,11,0.10)' : 'rgba(244,245,239,0.05)',
        border: `1px solid ${baseBorder}`,
        color: win ? C.lima : C.cream,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = C.lima
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(175,202,11,0.18)'
        e.currentTarget.style.backgroundColor = 'rgba(175,202,11,0.06)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = baseBorder
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.backgroundColor = win ? 'rgba(175,202,11,0.10)' : 'rgba(244,245,239,0.05)'
      }}
    />
  )
}
