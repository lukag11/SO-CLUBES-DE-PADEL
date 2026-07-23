import { useState, useEffect } from 'react'
import { getClubSlug } from '../lib/clubContext'
import { Megaphone, Repeat, Users, CalendarDays, Clock, Check, Loader2, ChevronDown, Plus, X, Copy, Trophy } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'
import CargarResultados from '../components/eventos/CargarResultados'
import InfoBlock from '../components/InfoBlock'
import { useToast } from '../components/ui/ToastProvider'
import { rankingAmericano, rankingSuper8 } from '../lib/eventos'

const normNom = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
// Posición del jugador en un evento jugado (calculada del fixture con el motor).
function posicionEnEvento(ev, miNombre) {
  const f = ev.fixture
  if (!f?.rondas?.length) return null
  if (ev.modalidad === 'super8') {
    if (!f.parejas) return null
    const rk = rankingSuper8(f)
    const i = rk.findIndex((r) => r.nombre.split('/').map(normNom).includes(normNom(miNombre)))
    return i >= 0 ? { pos: i + 1, total: rk.length } : null
  }
  if (!f.jugadores) return null
  const rk = rankingAmericano(f)
  const i = rk.findIndex((r) => normNom(r.nombre) === normNom(miNombre))
  return i >= 0 ? { pos: i + 1, total: rk.length } : null
}

const CATEGORIAS = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va']
const GENEROS = [{ k: 'masculino', l: '♂ Masculino' }, { k: 'femenino', l: '♀ Femenino' }, { k: 'mixto', l: '⚥ Mixto' }]

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function PlayerEventosPage() {
  const token = usePlayerStore((s) => s.token)
  const toast = useToast()
  const slug = getClubSlug()
  const [mias, setMias] = useState(null)
  const [abiertos, setAbiertos] = useState(null)
  const [jugados, setJugados] = useState(null) // { miNombre, eventos } — historial social
  const [accion, setAccion] = useState(null) // id en proceso
  const [organizarOpen, setOrganizarOpen] = useState(false)
  const [confirmAccion, setConfirmAccion] = useState(null) // { tipo: 'bajar'|'cancelar', id }
  const [cargarId, setCargarId] = useState(null) // evento abierto en modo en vivo

  const cargar = () => {
    api.get('/convocatorias/mias', { Authorization: `Bearer ${token}` })
      .then((r) => setMias(Array.isArray(r) ? r : [])).catch(() => setMias([]))
    if (slug) api.get(`/convocatorias/publica/club/${slug}`).then((r) => setAbiertos(Array.isArray(r) ? r : [])).catch(() => setAbiertos([]))
    else setAbiertos([])
    api.get('/convocatorias/mis-jugados', { Authorization: `Bearer ${token}` })
      .then((r) => setJugados(r && Array.isArray(r.eventos) ? r : { miNombre: '', eventos: [] }))
      .catch(() => setJugados({ miNombre: '', eventos: [] }))
  }
  useEffect(() => { if (token) cargar() }, [token])

  const anotarme = (id) => {
    if (accion) return
    setAccion(id)
    api.post(`/convocatorias/${id}/voy`, {}, { Authorization: `Bearer ${token}` })
      .then(() => { toast.success('¡Anotado al evento! 🎾'); cargar() }).catch((e) => toast.error(e?.message || 'No se pudo anotar')).finally(() => setAccion(null))
  }
  const bajarme = (id) => {
    setAccion(id)
    api.post(`/convocatorias/${id}/baja`, {}, { Authorization: `Bearer ${token}` })
      .then(() => { toast.success('Te bajaste del evento'); cargar() }).catch(() => toast.error('No se pudo')).finally(() => { setAccion(null); setConfirmAccion(null) })
  }
  const cancelarMio = (id) => {
    setAccion(id)
    api.post(`/convocatorias/mias/${id}/cancelar`, {}, { Authorization: `Bearer ${token}` })
      .then(() => { toast.success('Evento cancelado'); cargar() }).catch((e) => toast.error(e?.message || 'No se pudo cancelar')).finally(() => { setAccion(null); setConfirmAccion(null) })
  }
  // Ejecuta la acción confirmada en el modal.
  const ejecutarConfirm = () => {
    if (!confirmAccion || accion) return
    if (confirmAccion.tipo === 'cancelar') cancelarMio(confirmAccion.id)
    else bajarme(confirmAccion.id)
  }

  const míasIds = new Set((mias || []).map((m) => m.id))
  const abiertosNoMios = (abiertos || []).filter((c) => !míasIds.has(c.id))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Megaphone size={22} className="text-club" /> Americano y Super 8</h1>
          <p className="text-white/40 text-sm mt-1">Sumate a los eventos del club o organizá el tuyo.</p>
          <InfoBlock label="¿Cómo funciona?" variant="dark">
            <p><strong className="text-white/80">Qué es:</strong> un Americano o Super 8 es un evento social de 8 jugadores. Se juega por puntos y al final hay un ranking en vivo.</p>
            <p><strong className="text-white/80">Para sumarte:</strong> en "Eventos abiertos del club" elegí uno de tu categoría y tocá <strong className="text-club">¡Voy!</strong>. Cuando se completa el cupo, el fixture se arma solo.</p>
            <p><strong className="text-white/80">Para organizar el tuyo:</strong> tocá <strong className="text-club">Organizar</strong>, elegí día y horario (reservás 2 canchas a tu nombre) y compartí el link. Quedás anotado automáticamente.</p>
            <p className="text-white/40">Todos los avisos llegan dentro de la app (en la 🔔 campana).</p>
          </InfoBlock>
        </div>
        <button onClick={() => setOrganizarOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all shrink-0">
          <Plus size={16} /> Organizar
        </button>
      </div>

      {organizarOpen && (
        <OrganizarModal token={token} onClose={() => setOrganizarOpen(false)} onCreado={() => { setOrganizarOpen(false); cargar() }} />
      )}

      {cargarId && (
        <CargarResultados convId={cargarId} token={token} onClose={() => { setCargarId(null); cargar() }} />
      )}

      {confirmAccion && (
        <ConfirmModal
          loading={!!accion}
          danger
          titulo={confirmAccion.tipo === 'cancelar' ? 'Cancelar evento' : 'Bajarte del evento'}
          mensaje={confirmAccion.tipo === 'cancelar'
            ? 'Se liberan las canchas reservadas y se les avisa a los anotados. Esta acción no se puede deshacer.'
            : '¿Seguro que te querés bajar de este evento?'}
          confirmText={confirmAccion.tipo === 'cancelar' ? 'Sí, cancelar evento' : 'Sí, bajarme'}
          onConfirmar={ejecutarConfirm}
          onClose={() => setConfirmAccion(null)}
        />
      )}

      {/* Mis eventos */}
      <section>
        <h2 className="text-sm font-semibold text-white/70 mb-2.5">Mis eventos</h2>
        {mias === null ? (
          <p className="text-white/30 text-sm">Cargando…</p>
        ) : mias.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#0d1117] p-6 text-center text-white/40 text-sm">No estás anotado en ningún evento todavía.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {mias.map((c) => <EventoRow key={c.id} c={c} mio token={token} onBaja={() => setConfirmAccion({ tipo: 'bajar', id: c.id })} onCancelarMio={() => setConfirmAccion({ tipo: 'cancelar', id: c.id })} onCargar={() => setCargarId(c.id)} loading={accion === c.id} />)}
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

      {/* Jugados — historial social (separado, NO cuenta para stats/ascensos) */}
      <JugadosSection jugados={jugados} />
    </div>
  )
}

function JugadosSection({ jugados }) {
  if (!jugados || !jugados.eventos.length) return null
  const conPos = jugados.eventos.map((ev) => ({ ev, p: posicionEnEvento(ev, jugados.miNombre) }))
  const posiciones = conPos.map((x) => x.p?.pos).filter((n) => n != null)
  const promedio = posiciones.length ? (posiciones.reduce((a, b) => a + b, 0) / posiciones.length) : null
  const mejor = posiciones.length ? Math.min(...posiciones) : null

  return (
    <section>
      <h2 className="text-sm font-semibold text-white/70 mb-1">Jugados</h2>
      <p className="text-white/30 text-[11px] mb-2.5">Tu historial de eventos sociales. Es recreativo: no cuenta para tus estadísticas ni para ascensos.</p>

      {/* Números blandos */}
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        <MiniStat label="Jugados" valor={jugados.eventos.length} />
        <MiniStat label="Posición prom." valor={promedio ? `${promedio.toFixed(1)}°` : '—'} />
        <MiniStat label="Mejor" valor={mejor ? `${mejor}°` : '—'} />
      </div>

      <div className="flex flex-col gap-2">
        {conPos.map(({ ev, p }) => <JugadoRow key={ev.id} ev={ev} p={p} miNombre={jugados.miNombre} />)}
      </div>
    </section>
  )
}

function JugadoRow({ ev, p, miNombre }) {
  const [abierto, setAbierto] = useState(false)
  const esAme = ev.modalidad !== 'super8'
  const podio = p?.pos === 1
  // Tabla final completa (read-only) desde el fixture guardado.
  const tabla = !ev.fixture?.rondas?.length ? [] : (esAme ? rankingAmericano(ev.fixture) : rankingSuper8(ev.fixture))
  const esMio = (nombre) => esAme ? normNom(nombre) === normNom(miNombre) : nombre.split('/').map(normNom).includes(normNom(miNombre))

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1117] overflow-hidden">
      <button onClick={() => setAbierto((v) => !v)} className="w-full p-3.5 flex items-center gap-3 text-left">
        <span className="w-9 h-9 rounded-xl bg-club/15 grid place-items-center shrink-0">
          {esAme ? <Repeat size={16} className="text-club" /> : <Users size={16} className="text-club" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{esAme ? 'Americano' : 'Super 8'}{ev.categorias?.length ? ` · ${ev.categorias.join('/')}` : ''}</p>
          <p className="text-white/40 text-xs flex items-center gap-2 mt-0.5 capitalize"><CalendarDays size={11} /> {fmtFecha(ev.fecha)}</p>
        </div>
        {p ? (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums leading-none" style={{ color: podio ? '#d4ff3f' : '#afca0b' }}>{p.pos}°</p>
            <p className="text-white/30 text-[10px]">de {p.total}{podio ? ' 🏆' : ''}</p>
          </div>
        ) : (
          <span className="text-white/25 text-xs shrink-0">sin datos</span>
        )}
        {tabla.length > 0 && <ChevronDown size={16} className={`text-white/25 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />}
      </button>

      {abierto && tabla.length > 0 && (
        <div className="px-4 pb-4 border-t border-white/8 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-white/40">Tabla final</p>
          <div className="flex flex-col gap-0.5">
            {tabla.map((r, i) => {
              const mio = esMio(r.nombre)
              return (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ backgroundColor: mio ? 'rgba(175,202,11,0.1)' : 'transparent' }}>
                  <span className="w-5 text-center font-bold tabular-nums text-sm" style={{ color: i === 0 ? '#d4ff3f' : 'rgba(255,255,255,0.4)' }}>{i + 1}</span>
                  <span className="flex-1 truncate text-[13px]" style={{ color: mio ? '#f4f5ef' : 'rgba(255,255,255,0.8)', fontWeight: mio ? 700 : 400 }}>{r.nombre}{mio ? ' · vos' : ''}</span>
                  <span className="font-bold tabular-nums text-[13px] text-club">
                    {esAme ? r.puntos : `${r.pg}`}
                    {!esAme && <span className="text-[10px] ml-1 text-white/30">{r.dif >= 0 ? `+${r.dif}` : r.dif}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, valor }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0d1117] p-2.5 text-center">
      <p className="text-club text-lg font-bold tabular-nums leading-tight">{valor}</p>
      <p className="text-white/40 text-[10px] mt-0.5">{label}</p>
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

function EventoRow({ c, mio, onVoy, onBaja, onCancelarMio, onCargar, loading, token }) {
  const esAme = c.modalidad !== 'super8'
  const lleno = (c.lugares ?? (c.cupoMax - c.voy)) <= 0
  const [abierto, setAbierto] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const compartir = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/convocatoria/${c.id}`)
      .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {})
  }

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
            <button onClick={compartir} className="flex items-center gap-1 text-[11px] font-semibold text-club/70 hover:text-club transition-colors">
              <Copy size={12} /> {copiado ? '¡Copiado!' : 'Compartir'}
            </button>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.soyOrganizador ? 'bg-club/15 text-club' : c.miEstado === 'voy' ? 'bg-club/15 text-club' : 'bg-amber-500/15 text-amber-400'}`}>
              {c.soyOrganizador ? 'Organizás' : c.miEstado === 'voy' ? 'Anotado' : 'En espera'}
            </span>
            {c.soyOrganizador ? (
              <button onClick={onCancelarMio} disabled={loading} className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50">
                {loading ? '…' : 'Cancelar evento'}
              </button>
            ) : (
              <button onClick={onBaja} disabled={loading} className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50">
                {loading ? '…' : 'Bajarme'}
              </button>
            )}
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
          {mio && c.soyOrganizador && (
            <button onClick={onCargar} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-club/15 text-club text-sm font-bold hover:bg-club/25 transition-all">
              <Trophy size={15} /> Modo en vivo · cargar resultados
            </button>
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

// Modal de confirmación propio (reemplaza el confirm() nativo del navegador). Tema oscuro.
function ConfirmModal({ titulo, mensaje, confirmText, onConfirmar, onClose, loading, danger }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
        <h3 className="text-white font-bold text-base">{titulo}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{mensaje}</p>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/5 transition-all disabled:opacity-50">
            No, volver
          </button>
          <button onClick={onConfirmar} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-club text-dark-900 hover:opacity-90'}`}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null} {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal para que el JUGADOR organice su propio evento (Fase B). Reusa la verificación de
// disponibilidad (slots con 2+ canchas). El organizador es él mismo (queda auto-anotado).
function OrganizarModal({ token, onClose, onCreado }) {
  const [form, setForm] = useState({ modalidad: 'super8', fecha: '', horaInicio: '', categorias: [], genero: '', visibilidad: '' })
  const [slots, setSlots] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCat = (c) => setForm((f) => ({ ...f, categorias: f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c] }))

  useEffect(() => {
    if (!form.fecha) { setSlots(null); return }
    setSlotsLoading(true)
    api.get(`/convocatorias/slots-libres?fecha=${form.fecha}&canchas=2`, { Authorization: `Bearer ${token}` })
      .then((r) => {
        const s = Array.isArray(r?.slots) ? r.slots : []
        setSlots(s)
        setForm((f) => (f.horaInicio && !s.includes(f.horaInicio) ? { ...f, horaInicio: '' } : f))
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [form.fecha, token])

  const crear = () => {
    setError('')
    if (!form.fecha) return setError('Elegí una fecha.')
    if (!form.horaInicio) return setError('Elegí un horario de los disponibles.')
    if (!form.genero) return setError('Elegí el género del evento.')
    if (!form.visibilidad) return setError('Elegí si es público o privado.')
    setCreando(true)
    api.post('/convocatorias/mias', {
      modalidad: form.modalidad, fecha: form.fecha, horaInicio: form.horaInicio,
      categorias: form.categorias, genero: form.genero, visibilidad: form.visibilidad,
    }, { Authorization: `Bearer ${token}` })
      .then((r) => setRes(r))
      .catch((e) => setError(e?.message || 'No se pudo crear (¿hay 2 canchas libres a esa hora?)'))
      .finally(() => setCreando(false))
  }

  const copiar = () => navigator.clipboard?.writeText(res?.mensajeWhatsapp || '').then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {})

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
          <h3 className="text-white font-bold flex items-center gap-2"><Megaphone size={18} className="text-club" /> Organizar evento</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {res ? (
          <div className="p-5 flex flex-col gap-3 overflow-y-auto">
            <p className="text-sm font-semibold text-club flex items-center gap-1.5"><Check size={16} /> ¡Evento creado! Canchas: {(res.canchasReservadas || []).join(', ')}</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-club mb-1.5">Mensaje para compartir</p>
              <p className="text-[13px] text-white/85 whitespace-pre-wrap leading-relaxed">{res.mensajeWhatsapp}</p>
              <button onClick={copiar} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-club hover:opacity-80">
                {copiado ? <><Check size={12} /> ¡Copiado!</> : <><Copy size={12} /> Copiar</>}
              </button>
            </div>
            <button onClick={onCreado} className="py-3 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all">Listo</button>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-3.5 overflow-y-auto">
            {/* Modalidad */}
            <div className="grid grid-cols-2 gap-2">
              {[{ k: 'super8', l: 'Super 8' }, { k: 'americano', l: 'Americano' }].map(({ k, l }) => (
                <button key={k} onClick={() => set('modalidad', k)} className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${form.modalidad === k ? 'border-club bg-club/10 text-club' : 'border-white/10 text-white/50'}`}>{l}</button>
              ))}
            </div>
            <p className="text-[11px] text-white/35 -mt-1.5">Reservás 2 canchas a tu nombre, para 8 jugadores. Quedás anotado vos.</p>

            {/* Fecha */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Fecha</label>
              <input type="date" min={new Date().toLocaleDateString('en-CA')} value={form.fecha} onChange={(e) => set('fecha', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-club focus:outline-none [color-scheme:dark]" />
            </div>

            {/* Horario dinámico */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Horario {form.fecha && <span className="font-normal text-white/30">— con 2 canchas libres</span>}</label>
              {!form.fecha ? (
                <p className="text-sm text-white/30 bg-white/5 border border-white/8 rounded-lg px-3 py-3 text-center">Elegí una fecha para ver los horarios</p>
              ) : slotsLoading ? (
                <p className="text-sm text-white/30 bg-white/5 border border-white/8 rounded-lg px-3 py-3 text-center flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando…</p>
              ) : !slots || slots.length === 0 ? (
                <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-3 text-center">No hay ninguna franja con 2 canchas libres ese día. Probá otra fecha.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((h) => (
                    <button key={h} onClick={() => set('horaInicio', h)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.horaInicio === h ? 'border-club bg-club text-dark-900' : 'border-white/10 text-white/60 hover:border-club/50'}`}>{h}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Género */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Género</label>
              <div className="grid grid-cols-3 gap-1.5">
                {GENEROS.map(({ k, l }) => (
                  <button key={k} onClick={() => set('genero', form.genero === k ? '' : k)} className={`py-2 rounded-lg text-xs font-semibold border transition-all ${form.genero === k ? 'border-club bg-club/10 text-club' : 'border-white/10 text-white/50'}`}>{l}</button>
                ))}
              </div>
            </div>

            {/* Categorías */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Categorías <span className="font-normal text-white/30">(opcional)</span></label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIAS.map((c) => (
                  <button key={c} onClick={() => toggleCat(c)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.categorias.includes(c) ? 'border-club bg-club text-dark-900' : 'border-white/10 text-white/60 hover:border-club/50'}`}>{c}</button>
                ))}
              </div>
            </div>

            {/* Visibilidad */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">¿Quién lo ve?</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ k: 'publica', l: '🌐 Público', d: 'Se avisa a la categoría' }, { k: 'privada', l: '🔒 Privado', d: 'Solo por link' }].map(({ k, l, d }) => (
                  <button key={k} onClick={() => set('visibilidad', k)} className={`py-2 px-2 rounded-lg text-left border transition-all ${form.visibilidad === k ? 'border-club bg-club/10' : 'border-white/10'}`}>
                    <p className="text-sm font-semibold text-white/90">{l}</p>
                    <p className="text-[10px] text-white/35">{d}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={crear} disabled={creando} className="py-3 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {creando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {creando ? 'Creando…' : 'Crear y reservar canchas'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
