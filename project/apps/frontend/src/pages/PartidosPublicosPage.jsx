import { useState, useEffect } from 'react'
import { getClubSlug } from '../lib/clubContext'
import { Link } from 'react-router-dom'
import { Swords, Users, UserPlus, CalendarDays, Clock, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'

// Página PÚBLICA (sin login): el "lobby" de partidos abiertos del club. Un visitante ve los partidos
// que otros jugadores armaron y buscan gente; toca uno → /partido/:id (lobby individual) → se suma
// registrándose (login-con-retorno). Es la cara de CAPTACIÓN del matching.
const C = { bg: '#0a0f0d', surface: '#141c18', line: 'rgba(244,245,239,0.08)', lima: '#afca0b', neon: '#d4ff3f', cream: '#f4f5ef', muted: '#9ba89f' }
const FONT_DISPLAY = "'Space Grotesk', sans-serif"
const FONT_MONO = "'JetBrains Mono', monospace"
const surface = { backgroundColor: C.surface, border: `1px solid ${C.line}` }

const fmt = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PartidosPublicosPage() {
  const slug = getClubSlug()
  const [lista, setLista] = useState(null)

  useEffect(() => {
    if (!slug) { setLista([]); return }
    const cargar = () => api.get(`/solicitudes/publica/club/${slug}`).then((r) => setLista(Array.isArray(r) ? r : [])).catch(() => setLista([]))
    cargar()
    const t = setInterval(() => { if (!document.hidden) cargar() }, 15000) // ver el lobby llenarse en vivo
    return () => clearInterval(t)
  }, [slug])

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.cream }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64" style={{ background: `radial-gradient(60% 100% at 50% 0%, rgba(175,202,11,0.10), transparent 70%)` }} />
      <div className="relative max-w-2xl mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-6">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(140deg, ${C.lima}, ${C.neon})`, boxShadow: `0 8px 24px -6px rgba(175,202,11,0.5)` }}>
            <Swords size={20} style={{ color: C.bg }} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em', color: C.cream }}>Partidos abiertos</h1>
            <span className="text-xs leading-none" style={{ color: C.muted }}>Sumate y jugá · sin armar grupo</span>
          </div>
          <Link to="/" className="ml-auto text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95" style={{ color: C.muted, ...surface }}>
            <ArrowLeft size={14} /> Inicio
          </Link>
        </header>

        <p className="text-sm leading-relaxed mb-5" style={{ color: C.muted }}>
          Partidos que jugadores del club armaron y a los que les falta gente. Tocá uno para ver el lobby y pedir tu lugar — el organizador confirma.
        </p>

        {lista === null ? (
          <p className="text-sm" style={{ color: C.muted }}>Cargando partidos…</p>
        ) : !lista.length ? (
          <div className="rounded-2xl p-7 text-center flex flex-col items-center gap-3" style={surface}>
            <Swords size={28} style={{ color: C.muted }} />
            <p className="text-sm" style={{ color: C.muted }}>No hay partidos abiertos por ahora.</p>
            <p className="text-[13px]" style={{ color: 'rgba(155,168,159,0.7)' }}>¿Te juntás a jugar pero te falta gente? Registrate y armá el tuyo — avisamos a tu categoría.</p>
            <Link to="/jugadores/registro" className="mt-1 font-bold py-3 px-5 rounded-2xl transition-all active:scale-[0.98] flex items-center gap-2 text-sm"
              style={{ background: `linear-gradient(135deg, ${C.lima}, ${C.neon})`, color: C.bg, fontFamily: FONT_DISPLAY }}>
              <UserPlus size={16} /> Sumarme al club
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {lista.map((s) => {
              const esPareja = s.busco === 'pareja'
              return (
                <Link key={s.id} to={`/partido/${s.id}`} className="rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.99]" style={surface}>
                  <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(175,202,11,0.15)' }}>
                    {esPareja ? <Users size={18} style={{ color: C.lima }} /> : <UserPlus size={18} style={{ color: C.lima }} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: C.cream, fontFamily: FONT_DISPLAY }}>
                      {esPareja ? 'Buscan una pareja rival' : `Faltan ${s.faltan} jugador${s.faltan !== 1 ? 'es' : ''}`}{s.categoria ? ` · ${s.categoria}` : ''}
                    </p>
                    <p className="text-[12px] mt-0.5 flex items-center gap-2 capitalize" style={{ color: C.muted }}>
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmt(s.fecha)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {s.horaInicio}</span>
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(155,168,159,0.65)' }}>Organiza {s.solicitante}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums" style={{ fontFamily: FONT_MONO, color: s.faltan > 0 ? C.lima : C.muted }}>{s.yaVan}/{s.cupos}</p>
                    <p className="text-[10px]" style={{ color: C.muted }}>{s.faltan > 0 ? `faltan ${s.faltan}` : 'completo'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <p className="text-center text-[11px] mt-10" style={{ color: 'rgba(155,168,159,0.55)' }}>
          Hecho con <span style={{ color: C.lima, fontWeight: 600 }}>PadelwIArk</span>
        </p>
      </div>
    </div>
  )
}
