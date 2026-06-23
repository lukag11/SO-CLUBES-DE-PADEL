import { useState, useEffect } from 'react'
import { Megaphone, Repeat, Users, CalendarDays, Clock, Check, Loader2, ChevronDown } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PlayerEventosPage() {
  const token = usePlayerStore((s) => s.token)
  const slug = import.meta.env.VITE_CLUB_SLUG
  const [mias, setMias] = useState(null)
  const [abiertos, setAbiertos] = useState(null)
  const [accion, setAccion] = useState(null) // id en proceso

  const cargar = () => {
    api.get('/convocatorias/mias', { Authorization: `Bearer ${token}` })
      .then((r) => setMias(Array.isArray(r) ? r : [])).catch(() => setMias([]))
    if (slug) api.get(`/convocatorias/publica/club/${slug}`).then((r) => setAbiertos(Array.isArray(r) ? r : [])).catch(() => setAbiertos([]))
    else setAbiertos([])
  }
  useEffect(() => { if (token) cargar() }, [token])

  const anotarme = (id) => {
    if (accion) return
    setAccion(id)
    api.post(`/convocatorias/${id}/voy`, {}, { Authorization: `Bearer ${token}` })
      .then(() => cargar()).catch((e) => alert(e?.message || 'No se pudo anotar')).finally(() => setAccion(null))
  }
  const bajarme = (id) => {
    if (accion) return
    if (!confirm('¿Te bajás del evento?')) return
    setAccion(id)
    api.post(`/convocatorias/${id}/baja`, {}, { Authorization: `Bearer ${token}` })
      .then(() => cargar()).catch(() => alert('No se pudo')).finally(() => setAccion(null))
  }

  const míasIds = new Set((mias || []).map((m) => m.id))
  const abiertosNoMios = (abiertos || []).filter((c) => !míasIds.has(c.id))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Megaphone size={22} className="text-club" /> Americano y Super 8</h1>
        <p className="text-white/40 text-sm mt-1">Sumate a los eventos del club o seguí los tuyos.</p>
      </div>

      {/* Mis eventos */}
      <section>
        <h2 className="text-sm font-semibold text-white/70 mb-2.5">Mis eventos</h2>
        {mias === null ? (
          <p className="text-white/30 text-sm">Cargando…</p>
        ) : mias.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#0d1117] p-6 text-center text-white/40 text-sm">No estás anotado en ningún evento todavía.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {mias.map((c) => <EventoRow key={c.id} c={c} mio token={token} onBaja={() => bajarme(c.id)} loading={accion === c.id} />)}
          </div>
        )}
      </section>

      {/* Abiertos */}
      <section>
        <h2 className="text-sm font-semibold text-white/70 mb-2.5">Eventos abiertos del club</h2>
        {abiertos === null ? (
          <p className="text-white/30 text-sm">Cargando…</p>
        ) : abiertosNoMios.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#0d1117] p-6 text-center text-white/40 text-sm">No hay eventos abiertos ahora. Cuando el club organice uno, va a aparecer acá.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {abiertosNoMios.map((c) => <EventoRow key={c.id} c={c} token={token} onVoy={() => anotarme(c.id)} loading={accion === c.id} />)}
          </div>
        )}
      </section>
    </div>
  )
}

const ladoDe = (cu) => {
  const p = cu.posicion || cu.jugador?.posicion
  if (p === 'Drive') return 'drive'
  if (p === 'Revés' || p === 'Reves') return 'reves'
  return 'otro'
}
const nombreCupo = (cu) => (cu.jugador ? `${cu.jugador.nombre} ${cu.jugador.apellido}` : (cu.nombre || 'Jugador'))

function EventoRow({ c, mio, onVoy, onBaja, loading, token }) {
  const esAme = c.modalidad !== 'super8'
  const lleno = (c.lugares ?? (c.cupoMax - c.voy)) <= 0
  const [abierto, setAbierto] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(false)

  const toggle = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    if (nuevo && !detalle) {
      setCargando(true)
      api.get(`/convocatorias/${c.id}`, { Authorization: `Bearer ${token}` })
        .then((r) => setDetalle(r)).catch(() => setDetalle({ cupos: [] })).finally(() => setCargando(false))
    }
  }

  const cupos = (detalle?.cupos || []).filter((x) => x.estado === 'voy')
  const drive = cupos.filter((x) => ladoDe(x) === 'drive')
  const reves = cupos.filter((x) => ladoDe(x) === 'reves')
  const otros = cupos.filter((x) => ladoDe(x) === 'otro')

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1117] overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button onClick={toggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className="w-10 h-10 rounded-xl bg-club/15 grid place-items-center shrink-0">
            {esAme ? <Repeat size={18} className="text-club" /> : <Users size={18} className="text-club" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{esAme ? 'Americano' : 'Super 8'}{c.categorias?.length ? ` · ${c.categorias.join('/')}` : ''}</p>
            <p className="text-white/40 text-xs flex items-center gap-2 mt-0.5 capitalize">
              <span className="flex items-center gap-1"><CalendarDays size={11} /> {fmtFecha(c.fecha)}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {c.horaInicio}</span>
              <span className="tabular-nums">{c.voy}/{c.cupoMax}</span>
            </p>
          </div>
          <ChevronDown size={16} className={`text-white/30 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
        {mio ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.miEstado === 'voy' ? 'bg-club/15 text-club' : 'bg-amber-500/15 text-amber-400'}`}>
              {c.miEstado === 'voy' ? 'Anotado' : 'En espera'}
            </span>
            <button onClick={onBaja} disabled={loading} className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50">
              {loading ? '…' : 'Bajarme'}
            </button>
          </div>
        ) : (
          <button onClick={onVoy} disabled={loading}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {lleno ? 'A la espera' : '¡Voy!'}
          </button>
        )}
      </div>

      {abierto && (
        <div className="px-4 pb-4 border-t border-white/8 pt-3">
          {cargando ? (
            <p className="text-white/30 text-xs">Cargando anotados…</p>
          ) : cupos.length === 0 ? (
            <p className="text-white/30 text-xs">Nadie se anotó todavía.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ListaLado titulo="Drive" jugadores={drive} />
              <ListaLado titulo="Revés" jugadores={reves} />
              {otros.length > 0 && (
                <div className="col-span-2">
                  <ListaLado titulo="Sin lado definido" jugadores={otros} tenue />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ListaLado({ titulo, jugadores, tenue }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${tenue ? 'text-white/30' : 'text-club'}`}>{titulo} · {jugadores.length}</p>
      {jugadores.length === 0 ? (
        <p className="text-white/20 text-xs">—</p>
      ) : (
        <div className="flex flex-col gap-1">
          {jugadores.map((cu, i) => (
            <span key={i} className="text-white/70 text-[13px] truncate">{nombreCupo(cu)}</span>
          ))}
        </div>
      )}
    </div>
  )
}
