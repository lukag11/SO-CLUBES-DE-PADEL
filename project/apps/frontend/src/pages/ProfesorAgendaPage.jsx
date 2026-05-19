import { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft, ChevronRight, Plus, X, GraduationCap,
  CalendarDays, Trash2, Save, AlertCircle, Clock, MapPin,
} from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const fmtFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const fmtDiaCorto = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]
}

const DIAS_CLUB = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const getDiaNombre = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_CLUB[new Date(y, m - 1, d).getDay()]
}

const generarFranjas = (apertura, cierre) => {
  const franjas = []
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const toStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  let cur = toMin(apertura)
  let end = toMin(cierre)
  if (end === 0) end = 1440
  while (cur + 60 <= end) {
    franjas.push({ inicio: toStr(cur), fin: toStr(cur + 60) })
    cur += 30
  }
  return franjas
}

const normalizar = (r) => ({ ...r, inicio: r.horaInicio, fin: r.horaFin })

const duracionStr = (inicio, fin) => {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const mins = toMin(fin) - toMin(inicio)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ─── Modal para crear una clase ───────────────────────────────────────────────

const ModalClase = ({ fecha, onClose, onSave, reservasDelDia, canchasDisponibles, franjasDelDia, submitting }) => {
  const [canchaId, setCanchaId] = useState(canchasDisponibles[0]?.id ?? '')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  const opcionesFin = useMemo(
    () => inicio ? franjasDelDia.filter((f) => f.fin > inicio) : [],
    [inicio, franjasDelDia]
  )

  const franjasEnRango = useMemo(
    () => (inicio && fin) ? franjasDelDia.filter((f) => f.inicio >= inicio && f.fin <= fin) : [],
    [inicio, fin, franjasDelDia]
  )

  const estadoFranjas = useMemo(
    () => franjasEnRango.map((f) => ({
      ...f,
      ocupado: reservasDelDia.some(
        (r) => r.canchaId === canchaId && r.inicio < f.fin && r.fin > f.inicio
      ),
    })),
    [franjasEnRango, canchaId, reservasDelDia]
  )

  const hayConflicto = estadoFranjas.some((f) => f.ocupado)

  const handleSetInicio = (val) => {
    setInicio(val)
    if (fin && fin <= val) setFin('')
  }

  const duracionTotal = useMemo(() => {
    const mins = franjasEnRango.length * 60
    if (!mins) return null
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}min` : `${h}h`
  }, [franjasEnRango])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!canchaId) { setError('Seleccioná una cancha.'); return }
    if (!inicio || !fin) { setError('Seleccioná el horario de inicio y fin.'); return }
    if (franjasEnRango.length === 0) { setError('El rango no contiene franjas válidas.'); return }
    if (hayConflicto) { setError('El rango tiene franjas ocupadas. Revisá el detalle.'); return }
    const horaFin = fin === '24:00' ? '00:00' : fin
    onSave({ canchaId, horaInicio: inicio, horaFin, notas: nota.trim() })
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center">
              <GraduationCap size={17} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Nueva clase</h3>
              <p className="text-white/30 text-xs capitalize">{fmtFecha(fecha)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-2">Cancha</label>
            <div className="relative">
              <select
                value={canchaId}
                onChange={(e) => setCanchaId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all appearance-none"
              >
                <option value="" className="bg-[#0d1117]">— Seleccioná una cancha —</option>
                {canchasDisponibles.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0d1117]">{c.nombre}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Rango horario</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/25 text-[9px] block mb-1.5 uppercase tracking-wide">Desde</label>
                <div className="relative">
                  <select
                    value={inicio}
                    onChange={(e) => handleSetInicio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none"
                  >
                    <option value="" className="bg-[#0d1117]">— Inicio —</option>
                    {franjasDelDia.map((f) => (
                      <option key={f.inicio} value={f.inicio} className="bg-[#0d1117]">{f.inicio}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25">
                    <svg width="9" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-white/25 text-[9px] block mb-1.5 uppercase tracking-wide">Hasta</label>
                <div className="relative">
                  <select
                    value={fin}
                    onChange={(e) => setFin(e.target.value)}
                    disabled={!inicio}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none disabled:opacity-30"
                  >
                    <option value="" className="bg-[#0d1117]">— Fin —</option>
                    {opcionesFin.map((f) => (
                      <option key={f.fin} value={f.fin} className="bg-[#0d1117]">{f.fin}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25">
                    <svg width="9" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {franjasEnRango.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white/30 text-[10px] font-medium uppercase tracking-wide">
                    {franjasEnRango.length} franja{franjasEnRango.length > 1 ? 's' : ''} · {duracionTotal}
                  </span>
                  {hayConflicto && (
                    <span className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Conflictos
                    </span>
                  )}
                </div>
                {estadoFranjas.map((f) => (
                  <div key={f.inicio} className={[
                    'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium',
                    f.ocupado
                      ? 'bg-red-500/12 border border-red-500/20 text-red-400'
                      : 'bg-orange-400/8 border border-orange-400/12 text-orange-300',
                  ].join(' ')}>
                    <span>{f.inicio} → {f.fin}</span>
                    <span className="text-[10px] opacity-70">{f.ocupado ? 'Ocupado' : 'Libre'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-2">
              Descripción <span className="text-white/20 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Clase nivel principiante"
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-orange-400/50 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-400/8 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 rounded-xl py-3 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-orange-400 hover:bg-orange-300 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-400/20">
              <Save size={14} />
              {submitting ? 'Guardando...' : 'Crear clase'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── Modal confirmar eliminar ─────────────────────────────────────────────────

const ModalConfirmarEliminar = ({ clase, onConfirm, onClose, submitting }) => createPortal(
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
      <div className="w-10 h-10 bg-red-500/12 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
        <Trash2 size={17} className="text-red-400" />
      </div>
      <h3 className="text-white font-bold mb-1">¿Cancelar esta clase?</h3>
      <p className="text-white/40 text-sm mb-1">
        {clase.cancha?.nombre ?? clase.canchaId} · {clase.horaInicio} – {clase.horaFin}
      </p>
      {clase.notas && <p className="text-white/25 text-xs mb-4">{clase.notas}</p>}
      <p className="text-white/40 text-sm mb-6 mt-3">
        El slot quedará libre en la grilla del club. Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 rounded-xl py-3 text-sm font-medium transition-all">
          Volver
        </button>
        <button onClick={onConfirm} disabled={submitting}
          className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all">
          {submitting ? 'Cancelando...' : 'Sí, cancelar'}
        </button>
      </div>
    </div>
  </div>,
  document.body
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfesorAgendaPage = () => {
  const { profesor, token } = useAuthProfesorStore()
  const canchas        = useClubStore((s) => s.club.canchas ?? [])
  const horarios       = useClubStore((s) => s.club.horarios)
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)

  const [fecha, setFecha] = useState(todayISO())
  const [windowStart, setWindowStart] = useState(todayISO())
  const [misClases, setMisClases] = useState([])
  const [todasReservasDia, setTodasReservasDia] = useState([])
  const [modalNueva, setModalNueva] = useState(false)
  const [claseEliminar, setClaseEliminar] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [clasesSemana, setClasesSemana] = useState({})

  const hoy = todayISO()
  const headers = { Authorization: `Bearer ${token}` }

  const fetchMisClases = useCallback(async (f) => {
    if (!token) return
    try {
      const data = await api.get(`/reservas/profesor/mis-clases?fecha=${f}`, headers)
      if (Array.isArray(data)) setMisClases(data.map(normalizar))
    } catch {}
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTodasDia = useCallback(async (f) => {
    if (!token || !profesor?.clubId) return
    try {
      const data = await api.get(`/reservas?fecha=${f}&clubId=${profesor.clubId}`, headers)
      if (Array.isArray(data)) setTodasReservasDia(data.map(normalizar))
    } catch {}
  }, [token, profesor?.clubId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSemana = useCallback(async (diasArr) => {
    if (!token) return
    const results = await Promise.allSettled(
      diasArr.map((d) => api.get(`/reservas/profesor/mis-clases?fecha=${d}`, headers))
    )
    const mapa = {}
    diasArr.forEach((d, i) => {
      const r = results[i]
      mapa[d] = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value.map(normalizar) : []
    })
    setClasesSemana(mapa)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(windowStart, i)), [windowStart])

  const goForward = () => {
    const next = addDays(fecha, 1)
    setFecha(next)
    if (next > addDays(windowStart, 6)) setWindowStart((ws) => addDays(ws, 7))
  }

  const goBack = () => {
    if (fecha <= hoy) return
    const prev = addDays(fecha, -1)
    setFecha(prev)
    if (prev < windowStart) setWindowStart((ws) => addDays(ws, -7))
  }

  useEffect(() => { fetchSemana(diasSemana) }, [windowStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profesor?.club?.slug) return
    api.get(`/clubs/${profesor.club.slug}`, {})
      .then((club) => { if (club?.id) loadFromBackend(club) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMisClases([])
    fetchMisClases(fecha)
    fetchTodasDia(fecha)
  }, [fecha]) // eslint-disable-line react-hooks/exhaustive-deps

  const franjasDelDia = useMemo(() => {
    const diaNombre = getDiaNombre(fecha)
    const horario = horarios?.[diaNombre]
    if (!horarios) return generarFranjas('08:00', '23:00')
    if (!horario?.activo) return []

    const toMin = (t) => {
      if (!t) return 0
      const [h, m] = t.split(':').map(Number)
      const mins = h * 60 + m
      return mins === 0 ? 1440 : mins
    }
    const toStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

    let ap = toMin(horario.apertura || '08:00')
    let ci = toMin(horario.cierre   || '23:00')

    const dispDia = profesor?.disponibilidad?.[diaNombre]
    if (dispDia) {
      if (!dispDia.activo) return []
      if (dispDia.apertura) ap = Math.max(ap, toMin(dispDia.apertura))
      if (dispDia.cierre)   ci = Math.min(ci, toMin(dispDia.cierre))
    }

    if (ap >= ci) return []
    return generarFranjas(toStr(ap), toStr(ci))
  }, [fecha, horarios, profesor?.disponibilidad])

  const canchasHabilitadas = useMemo(() => {
    const activas = canchas.filter((c) => c.activa !== false)
    if (!profesor?.canchasIds?.length) return activas
    return activas.filter((c) => profesor.canchasIds.includes(c.id))
  }, [canchas, profesor?.canchasIds])

  const misClasesDia = useMemo(
    () => [...misClases.filter((r) => r.fecha === fecha)].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [misClases, fecha]
  )

  const esPasada = (f, horaFin) => {
    if (f < hoy) return true
    if (f > hoy) return false
    const ahora = new Date()
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
    return horaFin <= horaActual
  }

  const handleCrearClase = async ({ canchaId, horaInicio, horaFin, notas }) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const nueva = await api.post('/reservas/profesor', { canchaId, fecha, horaInicio, horaFin, notas }, headers)
      setMisClases((prev) => [...prev, normalizar(nueva)])
      setClasesSemana((prev) => ({ ...prev, [fecha]: [...(prev[fecha] ?? []), normalizar(nueva)] }))
      setModalNueva(false)
    } catch (err) {
      alert(err?.message || 'Error al crear la clase')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarClase = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await api.delete(`/reservas/${claseEliminar.id}`, headers)
      setMisClases((prev) => prev.filter((r) => r.id !== claseEliminar.id))
      setClasesSemana((prev) => ({
        ...prev,
        [fecha]: (prev[fecha] ?? []).filter((r) => r.id !== claseEliminar.id),
      }))
      setClaseEliminar(null)
    } catch (err) {
      alert(err?.message || 'Error al cancelar la clase')
    } finally {
      setSubmitting(false)
    }
  }

  // Horas de clase del día
  const horasDia = useMemo(() => {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    return misClasesDia.reduce((acc, c) => acc + (toMin(c.horaFin) - toMin(c.horaInicio)) / 60, 0)
  }, [misClasesDia])

  const esDiaPasado = fecha < hoy

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mi agenda</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize">{fmtFecha(fecha)}</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          disabled={esDiaPasado}
          className="flex items-center gap-2 bg-orange-400 hover:bg-orange-300 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-400/20"
        >
          <Plus size={16} />
          Nueva clase
        </button>
      </div>

      {/* Selector de días */}
      <div>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={goBack}
            disabled={fecha <= hoy}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 transition-all shrink-0"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex gap-1.5 flex-1 overflow-x-auto pb-0.5">
            {diasSemana.map((d) => {
              const sel = d === fecha
              const cnt = (clasesSemana[d] ?? []).length
              const esHoy = d === hoy
              return (
                <button
                  key={d}
                  onClick={() => setFecha(d)}
                  className={[
                    'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all min-w-[52px] shrink-0 relative',
                    sel
                      ? 'bg-orange-400/15 border-orange-400/40 shadow-lg shadow-orange-400/10'
                      : 'border-white/8 hover:border-white/20 hover:bg-white/4',
                  ].join(' ')}
                >
                  <span className={['text-[9px] font-bold uppercase tracking-wide', sel ? 'text-orange-400' : esHoy ? 'text-orange-400/60' : 'text-white/30'].join(' ')}>
                    {esHoy ? 'Hoy' : fmtDiaCorto(d)}
                  </span>
                  <span className={['text-base font-black leading-none', sel ? 'text-white' : 'text-white/50'].join(' ')}>
                    {new Date(d + 'T12:00:00').getDate()}
                  </span>
                  <span className={[
                    'text-[8px] font-bold px-1.5 py-0.5 rounded-full min-h-[14px]',
                    cnt > 0
                      ? sel ? 'bg-orange-400 text-white' : 'bg-orange-400/20 text-orange-400'
                      : 'text-transparent',
                  ].join(' ')}>
                    {cnt > 0 ? cnt : '·'}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={goForward}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all shrink-0"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Stats del día */}
      {misClasesDia.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-400/12 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wide">Clases</p>
              <p className="text-white font-black text-xl leading-tight">{misClasesDia.length}</p>
            </div>
          </div>
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-400/12 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wide">Horas</p>
              <p className="text-white font-black text-xl leading-tight">{horasDia % 1 === 0 ? horasDia : horasDia.toFixed(1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clases del día */}
      <div className="bg-gradient-to-br from-white/5 to-white/2 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
          <GraduationCap size={15} className="text-orange-400" />
          <span className="text-white font-bold text-sm">
            {esDiaPasado ? 'Clases realizadas' : 'Clases del día'}
          </span>
          {misClasesDia.length > 0 && (
            <span className="ml-auto bg-orange-400/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/20">
              {misClasesDia.length} clase{misClasesDia.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {misClasesDia.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-white/4 border border-white/8 rounded-2xl flex items-center justify-center">
              <CalendarDays size={20} className="text-white/20" />
            </div>
            <div>
              <p className="text-white/30 text-sm font-medium">
                {esDiaPasado ? 'No hubo clases este día' : 'Sin clases programadas'}
              </p>
              {!esDiaPasado && (
                <button onClick={() => setModalNueva(true)} className="mt-2 text-orange-400 text-xs hover:underline">
                  Crear primera clase
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {misClasesDia.map((clase) => {
              const pasada = esPasada(clase.fecha, clase.horaFin)
              const dur = duracionStr(clase.horaInicio, clase.horaFin === '00:00' ? '24:00' : clase.horaFin)
              return (
                <div key={clase.id} className={['flex items-stretch gap-0 transition-opacity', pasada ? 'opacity-45' : ''].join(' ')}>
                  {/* Acento lateral */}
                  <div className={['w-1 shrink-0', pasada ? 'bg-white/15' : 'bg-gradient-to-b from-orange-400 to-amber-400'].join(' ')} />
                  <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
                    {/* Tiempo */}
                    <div className="shrink-0 text-center">
                      <p className={['font-bold text-sm', pasada ? 'text-white/40' : 'text-orange-400'].join(' ')}>{clase.horaInicio}</p>
                      <p className="text-white/25 text-xs">{clase.horaFin}</p>
                      {dur && <p className="text-white/20 text-[9px] mt-0.5">{dur}</p>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{clase.notas || 'Clase'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-white/25 shrink-0" />
                        <p className="text-white/35 text-xs truncate">{clase.cancha?.nombre ?? clase.canchaId}</p>
                      </div>
                    </div>
                    {/* Badge estado */}
                    {pasada ? (
                      <span className="text-white/20 text-[10px] font-medium shrink-0">Realizada</span>
                    ) : (
                      <button
                        onClick={() => setClaseEliminar(clase)}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/8 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumen semanal */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <CalendarDays size={14} className="text-white/30" />
          <span className="text-white font-bold text-sm">Esta semana</span>
          <span className="ml-auto text-white/25 text-xs">
            {Object.values(clasesSemana).flat().length} clases totales
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {diasSemana.map((d) => {
            const clasesDia = [...(clasesSemana[d] ?? [])].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
            const sel = d === fecha
            const esHoy = d === hoy
            return (
              <button
                key={d}
                onClick={() => setFecha(d)}
                className={[
                  'w-full px-5 py-3.5 flex items-center gap-4 text-left transition-all hover:bg-white/4',
                  sel ? 'bg-white/4' : '',
                ].join(' ')}
              >
                <div className="shrink-0 w-20">
                  <p className={[
                    'text-xs font-bold capitalize',
                    sel ? 'text-orange-400' : esHoy ? 'text-orange-400/50' : 'text-white/35',
                  ].join(' ')}>
                    {esHoy ? 'Hoy' : fmtDiaCorto(d)} {new Date(d + 'T12:00:00').getDate()}
                  </p>
                </div>
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {clasesDia.length === 0 ? (
                    <span className="text-white/15 text-xs">Sin clases</span>
                  ) : (
                    clasesDia.map((c) => (
                      <span key={c.id} className={[
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        sel
                          ? 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                          : 'bg-white/5 text-white/40 border-white/10',
                      ].join(' ')}>
                        {c.horaInicio}
                      </span>
                    ))
                  )}
                </div>
                {clasesDia.length > 0 && (
                  <span className={['text-[10px] font-bold shrink-0', sel ? 'text-orange-400' : 'text-white/20'].join(' ')}>
                    {clasesDia.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Modales */}
      {modalNueva && (
        <ModalClase
          fecha={fecha}
          onClose={() => setModalNueva(false)}
          onSave={handleCrearClase}
          reservasDelDia={todasReservasDia}
          canchasDisponibles={canchasHabilitadas}
          franjasDelDia={franjasDelDia}
          submitting={submitting}
        />
      )}
      {claseEliminar && (
        <ModalConfirmarEliminar
          clase={claseEliminar}
          onConfirm={handleEliminarClase}
          onClose={() => setClaseEliminar(null)}
          submitting={submitting}
        />
      )}
    </div>
  )
}

export default ProfesorAgendaPage
