import { useState, useEffect } from 'react'
import { Megaphone, Repeat, Users, CalendarDays, Clock, ChevronDown, X, Check, Crown, Loader2, Plus, Trash2, Copy } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'
import BuscadorJugador from '../components/jugadores/BuscadorJugador'

const CATEGORIAS = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va']
const GENEROS = [{ k: 'masculino', l: '♂ Masculino' }, { k: 'femenino', l: '♀ Femenino' }, { k: 'mixto', l: '⚥ Mixto' }]

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const ESTADO_CHIP = {
  abierta:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmada: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelada:  'bg-red-50 text-red-600 border-red-100',
  jugada:     'bg-slate-100 text-slate-500 border-slate-200',
}

export default function ConvocatoriasAdminPage() {
  const token = useAuthStore((s) => s.token)
  const [lista, setLista] = useState(null)
  const [abierta, setAbierta] = useState(null) // id expandido
  const [detalle, setDetalle] = useState(null)
  const [cargandoDet, setCargandoDet] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [crearOpen, setCrearOpen] = useState(false)
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [motivoModal, setMotivoModal] = useState(null) // { id, accion: 'cancelar'|'eliminar', anotados }

  const cargar = () => {
    api.get('/convocatorias', { Authorization: `Bearer ${token}` })
      .then((r) => setLista(Array.isArray(r) ? r : []))
      .catch(() => setLista([]))
  }
  useEffect(() => { if (token) cargar() }, [token])

  const toggle = (id) => {
    if (abierta === id) { setAbierta(null); setDetalle(null); return }
    setAbierta(id); setDetalle(null); setCargandoDet(true)
    api.get(`/convocatorias/${id}`, { Authorization: `Bearer ${token}` })
      .then((r) => setDetalle(r))
      .catch(() => setDetalle(null))
      .finally(() => setCargandoDet(false))
  }

  // Cancelar/eliminar abren el modal de motivo (que después llama a estas con el motivo).
  const cancelar = (id, motivo) => {
    if (accionando) return
    setAccionando(true)
    api.patch(`/convocatorias/${id}/estado`, { estado: 'cancelada', motivo: motivo || null }, { Authorization: `Bearer ${token}` })
      .then(() => { cargar(); setAbierta(null); setDetalle(null) })
      .catch(() => alert('No se pudo cancelar'))
      .finally(() => { setAccionando(false); setMotivoModal(null) })
  }

  const eliminar = (id, motivo) => {
    if (accionando) return
    setAccionando(true)
    const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''
    api.delete(`/convocatorias/${id}${qs}`, { Authorization: `Bearer ${token}` })
      .then(() => { cargar(); if (abierta === id) { setAbierta(null); setDetalle(null) } })
      .catch(() => alert('No se pudo eliminar'))
      .finally(() => { setAccionando(false); setMotivoModal(null) })
  }

  const armarFixture = (id, modalidad) => {
    if (accionando) return
    const esSuper8 = modalidad === 'super8'
    const msg = esSuper8
      ? '¿Cerrar la inscripción y generar las parejas sugeridas (drive/revés)? El fixture se arma en la cancha.'
      : '¿Armar el fixture con los anotados? La convocatoria queda confirmada (se cierra la inscripción).'
    if (!confirm(msg)) return
    setAccionando(true)
    api.post(`/convocatorias/${id}/armar-fixture`, {}, { Authorization: `Bearer ${token}` })
      .then(() => {
        cargar()
        return api.get(`/convocatorias/${id}`, { Authorization: `Bearer ${token}` }).then((r) => setDetalle(r))
      })
      .catch((e) => alert(e?.message || 'No se pudo (¿hay al menos 4 anotados?)'))
      .finally(() => setAccionando(false))
  }

  const visibles = Array.isArray(lista) ? lista.filter((c) => verCanceladas || c.estado !== 'cancelada') : []

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Megaphone size={22} className="text-brand-600" /> Americano y Super 8</h1>
          <p className="text-slate-400 text-sm mt-1">Eventos organizados en el club. Las canchas quedan reservadas a nombre del organizador.</p>
        </div>
        <button onClick={() => setCrearOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-all shrink-0">
          <Plus size={16} /> Crear convocatoria
        </button>
      </div>

      <div className="rounded-xl bg-brand-50/60 border border-brand-200 px-4 py-3 text-sm text-slate-600">
        💡 También podés pedírsela a <span className="font-semibold text-brand-700">WIarky</span> en una frase: <span className="italic">"Convocá un Super 8 a nombre de Juan Pérez el martes a las 21, 8 cupos, 2 canchas, 6ta"</span>.
      </div>

      {crearOpen && <CrearConvocatoriaModal token={token} onClose={() => setCrearOpen(false)} onCreada={() => { setCrearOpen(false); cargar() }} />}

      {motivoModal && (
        <MotivoModal
          info={motivoModal}
          accionando={accionando}
          onClose={() => setMotivoModal(null)}
          onConfirmar={(motivo) => (motivoModal.accion === 'cancelar' ? cancelar(motivoModal.id, motivo) : eliminar(motivoModal.id, motivo))}
        />
      )}

      {Array.isArray(lista) && lista.some((c) => c.estado === 'cancelada') && (
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none -mt-1">
          <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} className="accent-brand-500" />
          Ver canceladas
        </label>
      )}

      {lista === null ? (
        <p className="text-slate-400 text-sm">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Megaphone size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500 text-sm">{lista.length === 0 ? 'Todavía no hay convocatorias. Creá una con el botón de arriba o con WIarky.' : 'No hay convocatorias activas. (Tenés canceladas ocultas.)'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visibles.map((c) => {
            const esAme = c.modalidad !== 'super8'
            const exp = abierta === c.id
            return (
              <div key={c.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <button onClick={() => toggle(c.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/60 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                    {esAme ? <Repeat size={18} className="text-brand-600" /> : <Users size={18} className="text-brand-600" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{esAme ? 'Americano' : 'Super 8'}{c.categorias?.length ? ` · ${c.categorias.join('/')}` : ''}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 capitalize">
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmtFecha(c.fecha)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {c.horaInicio}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-700 tabular-nums">{c.voy}/{c.cupoMax}</p>
                    {c.espera > 0 && <p className="text-[10px] text-amber-500">+{c.espera} espera</p>}
                  </div>
                  {c.visibilidad === 'privada' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-500 shrink-0">🔒 Privada</span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 capitalize ${ESTADO_CHIP[c.estado] || ESTADO_CHIP.jugada}`}>{c.estado}</span>
                  <ChevronDown size={16} className={`text-slate-300 shrink-0 transition-transform ${exp ? 'rotate-180' : ''}`} />
                </button>

                {exp && (
                  <div className="px-4 pb-4 border-t border-slate-50">
                    {cargandoDet ? (
                      <p className="text-xs text-slate-400 py-3 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Cargando anotados…</p>
                    ) : detalle ? (
                      <>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Anotados ({detalle.voy}{detalle.espera ? ` · ${detalle.espera} en espera` : ''})</p>
                        {detalle.cupos?.filter((x) => x.estado !== 'baja').length ? (
                          <div className="flex flex-col divide-y divide-slate-50">
                            {detalle.cupos.filter((x) => x.estado !== 'baja').map((cu, i) => (
                              <div key={cu.id} className="flex items-center gap-2 py-1.5">
                                <span className="w-5 text-center text-xs font-bold text-slate-300 tabular-nums">{i + 1}</span>
                                <span className="flex-1 text-sm text-slate-700 truncate">
                                  {cu.jugador ? `${cu.jugador.nombre} ${cu.jugador.apellido}` : (cu.nombre || 'Jugador')}
                                  {cu.posicion && <span className="text-[11px] text-slate-400 ml-1.5">· {cu.posicion}</span>}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cu.estado === 'voy' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-600'}`}>
                                  {cu.estado === 'voy' ? 'Anotado' : 'Espera'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-1">Nadie se anotó todavía.</p>
                        )}

                        {/* Fixture (si ya está armado) */}
                        {detalle.fixture && <FixtureView fixture={detalle.fixture} />}

                        {/* Acciones */}
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {c.estado === 'abierta' && (
                            <button onClick={() => armarFixture(c.id, c.modalidad)} disabled={accionando}
                              className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50">
                              <Check size={14} /> {c.modalidad === 'super8' ? 'Cerrar inscripción + parejas sugeridas' : 'Armar fixture ahora (cierra la inscripción)'}
                            </button>
                          )}
                          {c.estado === 'abierta' && (
                            <button onClick={() => setMotivoModal({ id: c.id, accion: 'cancelar', anotados: c.voy || 0 })} disabled={accionando}
                              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
                              <X size={14} /> Cancelar (libera las canchas)
                            </button>
                          )}
                          <button onClick={(e) => { e?.stopPropagation(); setMotivoModal({ id: c.id, accion: 'eliminar', anotados: c.voy || 0 }) }} disabled={accionando}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50">
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">No se pudo cargar el detalle.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Modal para crear una convocatoria desde la UI (sin depender de WIarky). Reusa el motor del backend.
// Modal de motivo al cancelar/eliminar: presets + texto libre. Avisa a los anotados.
const MOTIVOS_PRESET = ['Falta de jugadores', 'Lluvia / clima', 'Cambio de horario', 'Otro']
function MotivoModal({ info, onClose, onConfirmar, accionando }) {
  const [sel, setSel] = useState(null)
  const [otro, setOtro] = useState('')
  const esEliminar = info.accion === 'eliminar'
  const motivoFinal = sel === 'Otro' ? otro.trim() : (sel || '')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">{esEliminar ? 'Eliminar evento' : 'Cancelar evento'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 -mt-1">
          Se liberan las canchas reservadas.
          {info.anotados > 0
            ? <> Le avisaremos a <span className="font-semibold text-slate-700">{info.anotados} jugador{info.anotados !== 1 ? 'es' : ''}</span> anotado{info.anotados !== 1 ? 's' : ''}.</>
            : ' No hay nadie anotado.'}
        </p>

        {info.anotados > 0 && (
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Motivo {sel ? '' : '(opcional)'}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MOTIVOS_PRESET.map((m) => (
                <button key={m} onClick={() => setSel(m)} className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${sel === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  {m}
                </button>
              ))}
            </div>
            {sel === 'Otro' && (
              <input autoFocus value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Escribí el motivo…" maxLength={120}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-400 focus:outline-none" />
            )}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">No, volver</button>
          <button
            onClick={() => onConfirmar(motivoFinal || null)}
            disabled={accionando || (sel === 'Otro' && !otro.trim())}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {accionando ? <Loader2 size={15} className="animate-spin" /> : (esEliminar ? <Trash2 size={15} /> : <X size={15} />)}
            {esEliminar ? 'Eliminar' : 'Cancelar evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CrearConvocatoriaModal({ token, onClose, onCreada }) {
  const [form, setForm] = useState({ modalidad: 'super8', fecha: '', horaInicio: '', cupoMax: 8, canchas: 2, categorias: [], genero: '', visibilidad: 'publica' })
  const [org, setOrg] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [slots, setSlots] = useState(null) // null = sin fecha; [] = sin franjas; [...] = horarios libres
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [maxCanchas, setMaxCanchas] = useState(null) // canchas activas del club (tope)

  // Tope de canchas = canchas activas del club. Clampeamos el valor si quedó por encima.
  useEffect(() => {
    api.get('/convocatorias/canchas-activas', { Authorization: `Bearer ${token}` })
      .then((r) => {
        const t = Number(r?.total) || 0
        setMaxCanchas(t)
        if (t >= 2) setForm((f) => (Number(f.canchas) > t ? { ...f, canchas: t } : f))
      })
      .catch(() => {})
  }, [token])

  // Franjas con ≥ N canchas libres para la fecha elegida (dinámico)
  useEffect(() => {
    if (!form.fecha) { setSlots(null); return }
    const n = Math.max(1, Number(form.canchas) || 2)
    setSlotsLoading(true)
    api.get(`/convocatorias/slots-libres?fecha=${form.fecha}&canchas=${n}`, { Authorization: `Bearer ${token}` })
      .then((r) => {
        const s = Array.isArray(r?.slots) ? r.slots : []
        setSlots(s)
        setForm((f) => (f.horaInicio && !s.includes(f.horaInicio) ? { ...f, horaInicio: '' } : f))
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [form.fecha, form.canchas, token])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCategoria = (c) => setForm((f) => ({ ...f, categorias: f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c] }))

  const crear = () => {
    setError('')
    if (!org) return setError('Elegí el jugador organizador.')
    if (!form.fecha) return setError('Elegí una fecha.')
    if (!form.horaInicio) return setError('Elegí un horario de los disponibles.')
    if (Number(form.canchas) < 2) return setError('Una convocatoria usa mínimo 2 canchas.')
    if (Number(form.cupoMax) < 2) return setError('Mínimo 2 cupos.')
    setCreando(true)
    api.post('/convocatorias', {
      modalidad: form.modalidad, organizadorJugadorId: org.id, fecha: form.fecha, horaInicio: form.horaInicio,
      cupoMax: Number(form.cupoMax), canchas: Number(form.canchas),
      categorias: form.categorias, genero: form.genero || null, visibilidad: form.visibilidad,
    }, { Authorization: `Bearer ${token}` })
      .then((r) => setResultado(r))
      .catch((e) => setError(e?.message || 'No se pudo crear (¿hay canchas libres a esa hora?)'))
      .finally(() => setCreando(false))
  }

  const copiar = () => navigator.clipboard?.writeText(resultado?.mensajeWhatsapp || '').then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {})

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Crear convocatoria</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X size={20} /></button>
        </div>

        {resultado ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> ¡Creada! Canchas: {(resultado.canchasReservadas || []).join(', ')}</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mensaje para WhatsApp</p>
              <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{resultado.mensajeWhatsapp}</p>
              <button onClick={copiar} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700">
                {copiado ? <><Check size={13} /> ¡Copiado!</> : <><Copy size={13} /> Copiar</>}
              </button>
            </div>
            <button onClick={onCreada} className="py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold">Listo</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-2">
              {[{ k: 'americano', l: 'Americano' }, { k: 'super8', l: 'Super 8' }].map(({ k, l }) => (
                <button key={k} onClick={() => set('modalidad', k)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.modalidad === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>{l}</button>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Organizador (a su nombre quedan las canchas) <span className="text-red-400">*</span></label>
              <BuscadorJugador value={org} onChange={setOrg} adminToken={token} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Fecha</label>
                <input type="date" min={new Date().toLocaleDateString('en-CA')} value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Canchas a usar</label>
                <input
                  type="number"
                  min={2}
                  max={maxCanchas || undefined}
                  value={form.canchas}
                  onChange={(e) => {
                    let v = Math.max(2, Number(e.target.value) || 2)
                    if (maxCanchas) v = Math.min(v, maxCanchas)
                    set('canchas', v)
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-400 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">{maxCanchas ? `Entre 2 y ${maxCanchas} (canchas del club)` : 'Mínimo 2 (1 sola sería un turno común)'}</p>
              </div>
            </div>

            {/* Picker dinámico: solo franjas con ≥ canchas libres ese día */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Horario {form.fecha && <span className="font-normal text-slate-400">— franjas con {Math.max(2, Number(form.canchas) || 2)} canchas libres</span>}
              </label>
              {!form.fecha ? (
                <p className="text-sm text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-3 text-center">Elegí una fecha para ver los horarios disponibles</p>
              ) : slotsLoading ? (
                <p className="text-sm text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-3 text-center flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando disponibilidad…</p>
              ) : !slots || slots.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-3 text-center">No hay ninguna franja con {Math.max(2, Number(form.canchas) || 2)} canchas libres ese día. Probá otra fecha o menos canchas.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((h) => (
                    <button
                      key={h}
                      onClick={() => set('horaInicio', h)}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.horaInicio === h ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Cupos (jugadores)</label>
              <input type="number" min={2} value={form.cupoMax} onChange={(e) => set('cupoMax', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-400 focus:outline-none" />
            </div>

            {/* Categorías — checkboxes 1ra a 8va */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Categorías <span className="font-normal text-slate-400">(opcional, podés elegir varias)</span></label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIAS.map((c) => (
                  <button key={c} onClick={() => toggleCategoria(c)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.categorias.includes(c) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Género del evento */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Género <span className="font-normal text-slate-400">(opcional)</span></label>
              <div className="grid grid-cols-3 gap-1.5">
                {GENEROS.map(({ k, l }) => (
                  <button key={k} onClick={() => set('genero', form.genero === k ? '' : k)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.genero === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-brand-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Visibilidad</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ k: 'publica', l: '🌐 Pública', d: 'Se lista + notifica' }, { k: 'privada', l: '🔒 Privada', d: 'Solo por link' }].map(({ k, l, d }) => (
                  <button key={k} onClick={() => set('visibilidad', k)} className={`py-2 px-2 rounded-lg text-left border transition-all ${form.visibilidad === k ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                    <p className="text-sm font-semibold text-slate-700">{l}</p>
                    <p className="text-[10px] text-slate-400">{d}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={crear} disabled={creando} className="py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {creando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {creando ? 'Creando…' : 'Crear y reservar canchas'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Muestra el resultado del armado: Super 8 = parejas sugeridas (drive/revés), el fixture se
// arma en la cancha. Americano = fixture rotativo completo (rondas).
function FixtureView({ fixture }) {
  if (!fixture) return null

  // Super 8 → parejas sugeridas (sin rondas)
  if (fixture.modalidad === 'super8') {
    const parejas = fixture.parejas || []
    if (!parejas.length) return null
    const lado = (p) => (p === 'Drive' ? 'D' : p === 'Revés' || p === 'Reves' ? 'R' : '·')
    return (
      <div className="mt-4 rounded-xl bg-brand-50/50 border border-brand-100 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 mb-1 flex items-center gap-1.5">
          <Crown size={13} /> Parejas sugeridas
        </p>
        <p className="text-[11px] text-slate-400 mb-2">Equilibradas por lado (Drive/Revés). El fixture se arma en la cancha.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {parejas.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">{i + 1}</span>
              <span className="flex-1 text-slate-700 truncate">{p.j1} <span className="text-[10px] text-slate-400">({lado(p.p1)})</span> / {p.j2} <span className="text-[10px] text-slate-400">({lado(p.p2)})</span></span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Americano → fixture rotativo (rondas)
  if (!fixture?.rondas) return null
  const nombreEquipo = (idxs) => idxs.map((i) => fixture.jugadores?.[i]).join(' / ')

  return (
    <div className="mt-4 rounded-xl bg-brand-50/50 border border-brand-100 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 mb-2 flex items-center gap-1.5">
        <Crown size={13} /> Fixture armado
      </p>
      <div className="flex flex-col gap-3">
        {fixture.rondas.map((ronda, ri) => (
          <div key={ri}>
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
              Ronda {ronda.numero}
              {ronda.descansan?.length > 0 && <span className="text-slate-400 font-normal"> · descansa: {ronda.descansan.map((i) => fixture.jugadores?.[i]).join(', ')}</span>}
            </p>
            <div className="flex flex-col gap-1.5">
              {ronda.partidos.map((p, pi) => (
                <div key={pi} className="flex items-center gap-2 text-[13px] bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">C{p.cancha}</span>
                  <span className="flex-1 text-right text-slate-700 truncate">{nombreEquipo(p.equipoA)}</span>
                  <span className="text-slate-300 text-[10px] shrink-0">vs</span>
                  <span className="flex-1 text-slate-700 truncate">{nombreEquipo(p.equipoB)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
