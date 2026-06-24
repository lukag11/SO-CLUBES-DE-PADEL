import { useState, useEffect } from 'react'
import { Megaphone, Repeat, Users, CalendarDays, Clock, Check, Loader2, ChevronDown, Plus, X, Copy } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'

const CATEGORIAS = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va']
const GENEROS = [{ k: 'masculino', l: '♂ Masculino' }, { k: 'femenino', l: '♀ Femenino' }, { k: 'mixto', l: '⚥ Mixto' }]

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
  const [organizarOpen, setOrganizarOpen] = useState(false)
  const [confirmAccion, setConfirmAccion] = useState(null) // { tipo: 'bajar'|'cancelar', id }

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
    setAccion(id)
    api.post(`/convocatorias/${id}/baja`, {}, { Authorization: `Bearer ${token}` })
      .then(() => cargar()).catch(() => alert('No se pudo')).finally(() => { setAccion(null); setConfirmAccion(null) })
  }
  const cancelarMio = (id) => {
    setAccion(id)
    api.post(`/convocatorias/mias/${id}/cancelar`, {}, { Authorization: `Bearer ${token}` })
      .then(() => cargar()).catch((e) => alert(e?.message || 'No se pudo cancelar')).finally(() => { setAccion(null); setConfirmAccion(null) })
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
        </div>
        <button onClick={() => setOrganizarOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all shrink-0">
          <Plus size={16} /> Organizar
        </button>
      </div>

      {organizarOpen && (
        <OrganizarModal token={token} onClose={() => setOrganizarOpen(false)} onCreado={() => { setOrganizarOpen(false); cargar() }} />
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
            {mias.map((c) => <EventoRow key={c.id} c={c} mio token={token} onBaja={() => setConfirmAccion({ tipo: 'bajar', id: c.id })} onCancelarMio={() => setConfirmAccion({ tipo: 'cancelar', id: c.id })} loading={accion === c.id} />)}
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

function EventoRow({ c, mio, onVoy, onBaja, onCancelarMio, loading, token }) {
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
