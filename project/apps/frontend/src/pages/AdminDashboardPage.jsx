import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Users, Trophy, TrendingUp, TrendingDown, DollarSign, Activity,
  Wallet, Clock, ArrowRight, CheckCircle2, AlertCircle, UserPlus, Receipt, Sparkles, RefreshCw,
  MessageCircle, Copy, Check, Zap, Users2, Megaphone, Bell,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const REFRESH_MS = 45000

const hace = (fecha) => {
  if (!fecha) return ''
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} día${d > 1 ? 's' : ''}`
}

const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }

// Convención de colores de la grilla de reservas (tipo de reserva)
const TIPO_BAR = { fijo: 'bg-violet-500', online: 'bg-emerald-500', eventual: 'bg-blue-500', manual: 'bg-blue-500', bloqueado: 'bg-red-400', clase: 'bg-orange-400' }
const TIPO_LABEL = { fijo: 'Turno fijo', online: 'Online', eventual: 'Eventual', manual: 'Eventual', bloqueado: 'Bloqueo', clase: 'Clase' }

// Badge de tendencia (+X% / -X% vs ayer)
const Delta = ({ pct }) => {
  if (pct === undefined || pct === null) return null
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      <Icon size={12} /> {up ? '+' : ''}{pct}%
    </span>
  )
}

// Tarjeta de stat secundaria
const StatCard = ({ label, value, sub, icon: Icon, color, bg, delta }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow duration-200">
    <div className={`${bg} rounded-xl p-2.5 shrink-0`}>
      <Icon size={18} className={color} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5 leading-tight truncate flex items-center gap-2">
        {value} {delta !== undefined && <Delta pct={delta} />}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  </div>
)

const DashboardPage = () => {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  // Insight del día con IA (solo dueño; si el backend devuelve 403/error, no se muestra la tarjeta)
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(true)
  const [insightRegen, setInsightRegen] = useState(false)

  const regenerarInsight = () => {
    if (insightRegen) return
    setInsightRegen(true)
    api.get('/clubs/me/insight?force=1', { Authorization: `Bearer ${token}` })
      .then((r) => setInsight(r?.texto || null))
      .catch(() => {})
      .finally(() => setInsightRegen(false))
  }

  // Convocatoria por WhatsApp: la IA redacta un mensaje para pegar al grupo del club.
  const [convoOpen, setConvoOpen] = useState(false)
  const [convoForm, setConvoForm] = useState({ modalidad: 'americano', dia: '', horario: '', categoria: '', cupos: '' })
  const [convoMsg, setConvoMsg] = useState('')
  const [convoLoading, setConvoLoading] = useState(false)
  const [convoCopied, setConvoCopied] = useState(false)

  const generarConvocatoria = () => {
    if (convoLoading) return
    setConvoLoading(true)
    setConvoMsg('')
    setConvoCopied(false)
    api.post('/clubs/me/insight/convocatoria-mensaje', convoForm, { Authorization: `Bearer ${token}` })
      .then((r) => setConvoMsg(r?.mensaje || ''))
      .catch(() => setConvoMsg('No se pudo generar el mensaje. Probá de nuevo.'))
      .finally(() => setConvoLoading(false))
  }

  const copiarConvocatoria = () => {
    if (!convoMsg) return
    navigator.clipboard?.writeText(convoMsg).then(() => {
      setConvoCopied(true)
      setTimeout(() => setConvoCopied(false), 2000)
    }).catch(() => {})
  }

  // Post de turnos disponibles: la IA arma el posteo con los turnos libres reales del día.
  const [dispOpen, setDispOpen] = useState(false)
  const [dispMsg, setDispMsg] = useState('')
  const [dispLoading, setDispLoading] = useState(false)
  const [dispCopied, setDispCopied] = useState(false)
  const [dispTotal, setDispTotal] = useState(null)
  const [dispFecha, setDispFecha] = useState('hoy')

  const fechaOffset = (off) => {
    const d = new Date()
    d.setDate(d.getDate() + off)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const generarPostDisp = (cual) => {
    if (dispLoading) return
    setDispFecha(cual)
    setDispLoading(true)
    setDispMsg('')
    setDispCopied(false)
    setDispTotal(null)
    api.post('/clubs/me/insight/post-disponibilidad', { fecha: fechaOffset(cual === 'manana' ? 1 : 0) }, { Authorization: `Bearer ${token}` })
      .then((r) => { setDispMsg(r?.mensaje || ''); setDispTotal(typeof r?.total === 'number' ? r.total : null) })
      .catch(() => setDispMsg('No se pudo generar el posteo. Probá de nuevo.'))
      .finally(() => setDispLoading(false))
  }

  const copiarDisp = () => {
    if (!dispMsg) return
    navigator.clipboard?.writeText(dispMsg).then(() => {
      setDispCopied(true)
      setTimeout(() => setDispCopied(false), 2000)
    }).catch(() => {})
  }

  // Aviso de turno liberado: lista los turnos que se liberaron (y siguen libres) para re-publicarlos.
  const [libOpen, setLibOpen] = useState(false)
  const [libList, setLibList] = useState([])
  const [libListLoading, setLibListLoading] = useState(false)
  const [libMsg, setLibMsg] = useState('')
  const [libLoading, setLibLoading] = useState(false)
  const [libCopied, setLibCopied] = useState(false)
  const [libSel, setLibSel] = useState(null)

  const abrirLiberados = () => {
    setLibOpen(true)
    setLibMsg('')
    setLibSel(null)
    setLibListLoading(true)
    api.get('/clubs/me/insight/liberados', { Authorization: `Bearer ${token}` })
      .then((r) => setLibList(Array.isArray(r) ? r : []))
      .catch(() => setLibList([]))
      .finally(() => setLibListLoading(false))
  }

  const generarAvisoLiberado = (slot, idx) => {
    if (libLoading) return
    setLibSel(idx)
    setLibLoading(true)
    setLibMsg('')
    setLibCopied(false)
    api.post('/clubs/me/insight/post-liberado', { canchaNombre: slot.canchaNombre, dia: slot.dia, horario: slot.horaInicio }, { Authorization: `Bearer ${token}` })
      .then((r) => setLibMsg(r?.mensaje || ''))
      .catch(() => setLibMsg('No se pudo generar el aviso. Probá de nuevo.'))
      .finally(() => setLibLoading(false))
  }

  const copiarLib = () => {
    if (!libMsg) return
    navigator.clipboard?.writeText(libMsg).then(() => {
      setLibCopied(true)
      setTimeout(() => setLibCopied(false), 2000)
    }).catch(() => {})
  }

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    if (!token) return
    let activo = true
    const fetchData = () => api.get('/clubs/me/dashboard', { Authorization: `Bearer ${token}` })
      .then((d) => { if (activo) setData(d) })
      .catch(() => {})
      .finally(() => { if (activo) setLoading(false) })
    fetchData()
    const id = setInterval(fetchData, REFRESH_MS)
    return () => { activo = false; clearInterval(id) }
  }, [token])

  // El insight es una llamada a la IA (más lenta): se carga aparte, una vez, sin bloquear el dashboard.
  useEffect(() => {
    if (!token) return
    let activo = true
    api.get('/clubs/me/insight', { Authorization: `Bearer ${token}` })
      .then((r) => { if (activo) setInsight(r?.texto || null) })
      .catch(() => { if (activo) setInsight(null) })
      .finally(() => { if (activo) setInsightLoading(false) })
    return () => { activo = false }
  }, [token])

  // Permisos: 'caja' = ingresos/totales (SENSIBLE) · 'ventas o caja' = estado de cobro/deuda
  const verCaja = !!data?.verCaja
  const verCobros = !!data?.verCobros

  // ── Ocupación: color según rentabilidad (benchmark de industria ~50%) ──
  const ocu = data?.ocupacionPct ?? 0
  const ocuColor = ocu >= 60 ? 'bg-emerald-500' : ocu >= 35 ? 'bg-amber-500' : 'bg-rose-500'
  const ocuText = ocu >= 60 ? 'text-emerald-600' : ocu >= 35 ? 'text-amber-600' : 'text-rose-500'
  // Cuántas tarjetas de plata se muestran (Ingresos=caja, Por cobrar=cobros) → la ocupación rellena el resto
  const moneyCount = (verCaja ? 1 : 0) + (verCobros ? 1 : 0)
  const ocuSpan = moneyCount === 0 ? 'lg:col-span-3' : moneyCount === 1 ? 'lg:col-span-2' : ''

  // ── Necesita tu atención: foco en lo que falta cobrar (deuda + impagos) ──
  const at = data?.atencion ?? {}
  const atencion = [
    verCobros && at.porCobrarCount > 0 && {
      texto: `${at.porCobrarCount} ${at.porCobrarCount > 1 ? 'cobros pendientes' : 'cobro pendiente'}`,
      monto: data?.deudaPendiente,
      to: '/dashboardAdmin/pagos',
      color: 'text-amber-700', bg: 'bg-amber-50', Icon: Receipt,
    },
  ].filter(Boolean)

  // ── Agenda: marcar en curso / próximo ──
  const ahoraMin = toMin(data?.ahora)
  const agenda = (data?.agenda ?? []).map((a) => {
    const ini = toMin(a.horaInicio)
    const fin = a.horaFin === '00:00' ? 1440 : toMin(a.horaFin)
    return { ...a, enCurso: ini <= ahoraMin && ahoraMin < fin, futuro: ini > ahoraMin }
  })
  const idxProximo = agenda.findIndex((a) => a.futuro)

  // ── Tendencia 7 días: normalizar barras ──
  const serie = data?.serie7d ?? []
  const maxIng = Math.max(1, ...serie.map((s) => s.ingresos || 0))

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Resumen del club</h2>
          <p className="text-sm text-slate-400 mt-1 capitalize">{today}</p>
        </div>
        {data?.ahora && (
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-600">En vivo · {data.ahora}</span>
          </div>
        )}
      </div>

      {/* ── Insight del día con IA (Court Noir: oscuro + neón lima, marca PadelwIArk) ── */}
      {(insightLoading || insight) && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-5 shadow-sm">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-2 mb-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-brand-400" />
            </span>
            <span className="text-sm font-semibold text-white">Insight del día</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/15 px-2 py-0.5 rounded-full">IA · PadelwIArk</span>
            {!insightLoading && (
              <button
                onClick={regenerarInsight}
                disabled={insightRegen}
                title="Regenerar insight"
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-brand-400 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={insightRegen ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
          {insightLoading ? (
            <div className="relative flex flex-col gap-2 mt-1">
              <div className="h-3.5 bg-white/10 rounded animate-pulse w-3/4" />
              <div className="h-3.5 bg-white/10 rounded animate-pulse w-1/2" />
              <span className="text-[11px] text-white/30 mt-1">Analizando los números del club…</span>
            </div>
          ) : (
            <p className="relative text-white/90 text-sm md:text-[15px] leading-relaxed">{insight}</p>
          )}

          {/* Acciones IA — convocatoria + post de disponibilidad */}
          {!insightLoading && (
            <div className="relative mt-4 pt-4 border-t border-white/10 flex flex-col gap-4">
              {!convoOpen ? (
                <button
                  onClick={() => setConvoOpen(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <MessageCircle size={15} /> Armar convocatoria para WhatsApp
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} className="text-brand-400" />
                    <span className="text-sm font-semibold text-white">Convocatoria para WhatsApp</span>
                    <button onClick={() => { setConvoOpen(false); setConvoMsg('') }} className="ml-auto text-[11px] text-white/40 hover:text-white/70">Cerrar</button>
                  </div>

                  {/* Modalidad */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'americano', label: 'Americano', icon: Zap },
                      { id: 'super8', label: 'Super 8', icon: Users2 },
                    ].map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setConvoForm((f) => ({ ...f, modalidad: id }))}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          convoForm.modalidad === id
                            ? 'border-brand-400 bg-brand-500/15 text-brand-300'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                        }`}>
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>

                  {/* Datos */}
                  <div className="grid grid-cols-2 gap-2">
                    <input value={convoForm.dia} onChange={(e) => setConvoForm((f) => ({ ...f, dia: e.target.value }))}
                      placeholder="Día (ej: el martes)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-brand-400 focus:outline-none" />
                    <input value={convoForm.horario} onChange={(e) => setConvoForm((f) => ({ ...f, horario: e.target.value }))}
                      placeholder="Horario (ej: 20:00)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-brand-400 focus:outline-none" />
                    <input value={convoForm.categoria} onChange={(e) => setConvoForm((f) => ({ ...f, categoria: e.target.value }))}
                      placeholder="Categorías (ej: 6ta y 7ma)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-brand-400 focus:outline-none" />
                    <input value={convoForm.cupos} onChange={(e) => setConvoForm((f) => ({ ...f, cupos: e.target.value }))}
                      placeholder="Cupos (ej: 8)" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-brand-400 focus:outline-none" />
                  </div>

                  <button onClick={generarConvocatoria} disabled={convoLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-all disabled:opacity-50">
                    <Sparkles size={15} className={convoLoading ? 'animate-pulse' : ''} />
                    {convoLoading ? 'Redactando…' : 'Generar mensaje'}
                  </button>

                  {/* Mensaje generado — editable: la IA da el borrador, el admin lo ajusta */}
                  {convoMsg && (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <textarea
                        value={convoMsg}
                        onChange={(e) => { setConvoMsg(e.target.value); setConvoCopied(false) }}
                        rows={8}
                        className="w-full resize-y bg-transparent text-sm text-white/90 leading-relaxed focus:outline-none placeholder:text-white/30"
                      />
                      <div className="flex items-center gap-4 mt-2 pt-2.5 border-t border-white/10">
                        <button onClick={copiarConvocatoria}
                          className="flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors">
                          {convoCopied ? <><Check size={13} /> ¡Copiado!</> : <><Copy size={13} /> Copiar</>}
                        </button>
                        <button onClick={generarConvocatoria} disabled={convoLoading}
                          className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                          <RefreshCw size={13} className={convoLoading ? 'animate-spin' : ''} /> Regenerar
                        </button>
                        <span className="ml-auto text-[10px] text-white/30">Editable · revisalo antes de enviar</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Post de turnos disponibles — la IA arma el posteo con los libres reales */}
              {!dispOpen ? (
                <button
                  onClick={() => setDispOpen(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <Megaphone size={15} /> Publicar turnos disponibles
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Megaphone size={15} className="text-brand-400" />
                    <span className="text-sm font-semibold text-white">Turnos disponibles</span>
                    <button onClick={() => { setDispOpen(false); setDispMsg('') }} className="ml-auto text-[11px] text-white/40 hover:text-white/70">Cerrar</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: 'hoy', label: 'Hoy' }, { id: 'manana', label: 'Mañana' }].map(({ id, label }) => (
                      <button key={id} onClick={() => generarPostDisp(id)} disabled={dispLoading}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50 ${
                          dispFecha === id
                            ? 'border-brand-400 bg-brand-500/15 text-brand-300'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                        }`}>
                        <CalendarDays size={14} /> {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/30 -mt-1">Tomamos los turnos libres reales del día y la IA arma el posteo.</p>

                  {dispLoading && (
                    <div className="flex items-center gap-2 text-xs text-white/40 py-1">
                      <Sparkles size={14} className="animate-pulse text-brand-400" /> Armando el posteo…
                    </div>
                  )}

                  {dispMsg && !dispLoading && (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      {typeof dispTotal === 'number' && (
                        <p className="text-[11px] font-semibold text-brand-300 mb-2">{dispTotal === 0 ? 'No hay turnos libres' : `${dispTotal} turnos libres`}</p>
                      )}
                      <textarea
                        value={dispMsg}
                        onChange={(e) => { setDispMsg(e.target.value); setDispCopied(false) }}
                        rows={9}
                        className="w-full resize-y bg-transparent text-sm text-white/90 leading-relaxed focus:outline-none placeholder:text-white/30"
                      />
                      <div className="flex items-center gap-4 mt-2 pt-2.5 border-t border-white/10">
                        <button onClick={copiarDisp}
                          className="flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors">
                          {dispCopied ? <><Check size={13} /> ¡Copiado!</> : <><Copy size={13} /> Copiar</>}
                        </button>
                        <button onClick={() => generarPostDisp(dispFecha)} disabled={dispLoading}
                          className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                          <RefreshCw size={13} className={dispLoading ? 'animate-spin' : ''} /> Regenerar
                        </button>
                        <span className="ml-auto text-[10px] text-white/30">Editable · WhatsApp / IG / FB</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aviso de turno liberado — re-publicar un slot que se canceló */}
              {!libOpen ? (
                <button
                  onClick={abrirLiberados}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200 transition-colors"
                >
                  <Bell size={15} /> Avisar turno liberado
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-brand-400" />
                    <span className="text-sm font-semibold text-white">Turnos liberados</span>
                    <button onClick={() => { setLibOpen(false); setLibMsg('') }} className="ml-auto text-[11px] text-white/40 hover:text-white/70">Cerrar</button>
                  </div>

                  {libListLoading ? (
                    <div className="flex items-center gap-2 text-xs text-white/40 py-1">
                      <RefreshCw size={14} className="animate-spin" /> Buscando turnos liberados…
                    </div>
                  ) : libList.length === 0 ? (
                    <p className="text-xs text-white/40">No hay turnos liberados para re-publicar por ahora. Cuando alguien cancele, aparecen acá.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] text-white/30">Elegí el turno que se liberó:</p>
                      {libList.map((s, i) => (
                        <button key={i} onClick={() => generarAvisoLiberado(s, i)} disabled={libLoading}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border text-left transition-all disabled:opacity-50 ${
                            libSel === i ? 'border-brand-400 bg-brand-500/15 text-brand-300' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                          }`}>
                          <Clock size={13} className="shrink-0" /> {s.canchaNombre} · {s.dia ? `${s.dia} ` : ''}{s.horaInicio}
                        </button>
                      ))}
                    </div>
                  )}

                  {libLoading && (
                    <div className="flex items-center gap-2 text-xs text-white/40 py-1">
                      <Sparkles size={14} className="animate-pulse text-brand-400" /> Armando el aviso…
                    </div>
                  )}

                  {libMsg && !libLoading && (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <textarea value={libMsg} onChange={(e) => { setLibMsg(e.target.value); setLibCopied(false) }} rows={5}
                        className="w-full resize-y bg-transparent text-sm text-white/90 leading-relaxed focus:outline-none placeholder:text-white/30" />
                      <div className="flex items-center gap-4 mt-2 pt-2.5 border-t border-white/10">
                        <button onClick={copiarLib} className="flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors">
                          {libCopied ? <><Check size={13} /> ¡Copiado!</> : <><Copy size={13} /> Copiar</>}
                        </button>
                        <span className="ml-auto text-[10px] text-white/30">Editable · WhatsApp / IG / FB</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-36 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* ── HERO: Ocupación (+ Ingresos si caja, + Por cobrar si cobros) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ocupación del día — rellena el ancho según cuántas tarjetas de plata haya */}
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col ${ocuSpan}`}>
              <div className="flex items-center gap-2 text-slate-500">
                <Activity size={16} className="text-brand-500" />
                <span className="text-sm font-medium">Ocupación de hoy</span>
              </div>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-4xl font-bold ${ocuText}`}>{ocu}%</span>
                <span className="text-sm text-slate-400 mb-1.5">{data?.slotsOcupados ?? 0}/{data?.slotsTotales ?? 0} turnos</span>
              </div>
              <div className="mt-3 relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${ocuColor}`} style={{ width: `${Math.min(ocu, 100)}%` }} />
                {/* marca del 50% (benchmark de rentabilidad) */}
                <div className="absolute top-0 h-full w-px bg-slate-300" style={{ left: '50%' }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">{ocu >= 50 ? '✓ por encima del 50% (rentable)' : 'meta: 50% para rentabilidad'}</p>
            </div>

            {/* Ingresos hoy — solo permiso de caja */}
            {verCaja && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium">Ingresos de hoy</span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-bold text-slate-800">{money(data?.ingresosDia)}</span>
                  <span className="mb-1.5"><Delta pct={data?.ingresosDiaPct} /></span>
                </div>
                <p className="text-xs text-slate-400 mt-auto pt-3">Mes: <span className="font-semibold text-slate-600">{money(data?.ingresosMes)}</span> · ayer {money(data?.ingresosAyer)}</p>
              </div>
            )}

            {/* Por cobrar — permiso de cobros (ventas o caja) */}
            {verCobros && (
              <Link to="/dashboardAdmin/pagos" className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet size={16} className="text-amber-500" />
                  <span className="text-sm font-medium">Por cobrar</span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-bold text-slate-800">{money(data?.deudaPendiente)}</span>
                </div>
                <p className="text-xs text-amber-600 mt-auto pt-3 flex items-center gap-1 font-medium">
                  Ir a Cobranzas <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            )}
          </div>

          {/* ── Stats secundarias ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Reservas de hoy" value={data?.reservasHoy ?? '—'} sub="confirmadas" icon={CalendarDays} color="text-blue-500" bg="bg-blue-500/10" delta={data?.reservasHoyPct} />
            <StatCard label="Canchas en uso" value={data ? `${data.ocupadasAhora}/${data.canchasActivas}` : '—'} sub="ahora mismo" icon={Activity} color="text-brand-500" bg="bg-brand-500/10" />
            <StatCard label="Jugadores activos" value={data?.jugadoresActivos ?? '—'} sub="en el club" icon={Users} color="text-violet-500" bg="bg-violet-500/10" />
            <StatCard label="Torneos activos" value={data?.torneosActivos ?? '—'} sub="en curso o abiertos" icon={Trophy} color="text-amber-500" bg="bg-amber-500/10" />
          </div>

          {/* ── Atención + Tendencia ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Necesita tu atención */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" /> Necesita tu atención
              </h3>
              {atencion.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Todo al día. Nada pendiente.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {atencion.map((a, i) => (
                    <Link key={i} to={a.to} className={`group flex items-center gap-3 px-3 py-3 rounded-xl ${a.bg} hover:brightness-95 transition-all`}>
                      <a.Icon size={18} className={a.color} />
                      <span className={`text-sm font-medium ${a.color}`}>{a.texto}</span>
                      {a.monto > 0 && <span className={`text-base font-bold ${a.color}`}>{money(a.monto)}</span>}
                      <ArrowRight size={14} className={`${a.color} opacity-50 group-hover:translate-x-0.5 transition-transform ml-auto`} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tendencia 7 días */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-500" /> Últimos 7 días
              </h3>
              <div className="flex items-end justify-between gap-2 h-28">
                {serie.map((s, i) => {
                  const esHoy = i === serie.length - 1
                  const h = verCaja ? Math.round((s.ingresos / maxIng) * 100) : Math.round((s.reservas / Math.max(1, ...serie.map((x) => x.reservas))) * 100)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group relative">
                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all ${esHoy ? 'bg-brand-500' : 'bg-brand-500/30 group-hover:bg-brand-500/50'}`}
                          style={{ height: `${Math.max(h, 3)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${esHoy ? 'text-brand-600 font-semibold' : 'text-slate-400'}`}>{s.dia}</span>
                      {/* tooltip */}
                      <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {verCaja ? money(s.ingresos) : `${s.reservas} reservas`}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">{verCaja ? 'Ingresos cobrados por día' : 'Reservas por día'}</p>
            </div>
          </div>

          {/* ── Agenda de hoy + Actividad ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Agenda de hoy */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Agenda de hoy
                </h3>
                <Link to="/dashboardAdmin/reservas" className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
                  Ver grilla <ArrowRight size={12} />
                </Link>
              </div>
              {agenda.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No hay turnos agendados para hoy.</p>
              ) : (
                <div className="flex flex-col">
                  {agenda.map((a, i) => (
                    <div key={i} className={`flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 ${a.enCurso ? 'bg-emerald-50/40 -mx-2 px-2 rounded-lg' : ''}`}>
                      <div className="text-center shrink-0 w-12">
                        <p className={`text-sm font-bold ${a.enCurso ? 'text-emerald-600' : 'text-slate-700'}`}>{a.horaInicio}</p>
                        <p className="text-[10px] text-slate-400">{a.horaFin}</p>
                      </div>
                      <div className={`w-1 h-8 rounded-full shrink-0 ${TIPO_BAR[a.tipo] || 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{a.jugador || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400">{a.cancha} · {TIPO_LABEL[a.tipo] || 'Reserva'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Estado de pago (solo reservas; los turnos fijos no tienen pago por día) */}
                        {a.pagado === true && <span className="text-[10px] font-medium text-emerald-600">Pagado</span>}
                        {a.pagado === false && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Impago</span>}
                        {/* Estado de tiempo */}
                        {a.enCurso ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">EN JUEGO</span>
                        ) : i === idxProximo ? (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">PRÓXIMO</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actividad reciente */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
              <h3 className="text-base font-semibold text-slate-800 mb-3">Actividad reciente</h3>
              {!data?.actividad?.length ? (
                <p className="text-sm text-slate-400 py-4">Sin actividad reciente todavía.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {data.actividad.map((item, i) => {
                    const meta = item.tipo === 'pago' ? { Icon: DollarSign, c: 'text-emerald-500', bg: 'bg-emerald-50' }
                      : item.tipo === 'jugador' ? { Icon: UserPlus, c: 'text-violet-500', bg: 'bg-violet-50' }
                      : { Icon: CalendarDays, c: 'text-blue-500', bg: 'bg-blue-50' }
                    return (
                      <div key={i} className="flex items-start gap-3 py-1">
                        <div className={`${meta.bg} rounded-lg p-1.5 shrink-0 mt-0.5`}><meta.Icon size={13} className={meta.c} /></div>
                        <p className="text-sm text-slate-600 min-w-0 break-words flex-1">{item.text}</p>
                        <span className="text-xs text-slate-400 shrink-0 mt-0.5">{hace(item.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardPage
