import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft, ChevronRight, Plus, X, GraduationCap,
  CalendarDays, Trash2, Save, AlertCircle, Clock, MapPin, Zap, HelpCircle, CheckCircle, Pencil,
} from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'
import { useToast } from '../components/ui/ToastProvider'

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
  const toStr = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  let cur = toMin(apertura)
  let end = toMin(cierre)
  // Cierre después de medianoche: 00:00→1440, 00:30→1470, etc.
  if (end <= cur) end += 1440
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

// ─── Auto-fill: cálculo de bloques libres secuenciales ───────────────────────

const toMinFill = (t) => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  const mins = h * 60 + m
  if (h < 6) return mins === 0 ? 1440 : mins + 1440
  return mins
}
const toStrFill = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const calcularBloquesFaltantes = (canchas, franjasDelDia, todasReservasDia, turnosFijosDia, misClasesDia, rangosPorCancha) => {
  if (!franjasDelDia.length || !canchas.length) return []
  const apMin = toMinFill(franjasDelDia[0].inicio)
  const ciMin = toMinFill(franjasDelDia[franjasDelDia.length - 1].fin)
  const profOcupado = misClasesDia.map((c) => [toMinFill(c.inicio), toMinFill(c.fin)])
  let libres = [[apMin, ciMin]]
  for (const [bFrom, bTo] of profOcupado) {
    libres = libres.flatMap(([from, to]) => {
      if (bFrom >= to || bTo <= from) return [[from, to]]
      const segs = []
      if (bFrom > from) segs.push([from, bFrom])
      if (bTo < to) segs.push([bTo, to])
      return segs
    })
  }
  if (!libres.length) return []
  const allEvents = [...todasReservasDia, ...turnosFijosDia]
  const resultado = []
  for (const [segFrom, segTo] of libres) {
    let cur = segFrom
    while (cur + 60 <= segTo) {
      const slotEnd = cur + 60
      const candidatos = canchas.filter((c) => {
        const rango = rangosPorCancha?.[c.id]
        if (rango) {
          const apC = toMinFill(rango.apertura)
          const ciC = toMinFill(rango.cierre) || 1440
          if (cur < apC || slotEnd > ciC) return false
        }
        return !allEvents.some(
          (r) => String(r.canchaId) === String(c.id) && toMinFill(r.inicio) < slotEnd && toMinFill(r.fin) > cur
        )
      })
      if (!candidatos.length) {
        const siguienteFin = allEvents.map((r) => toMinFill(r.fin)).filter((t) => t > cur && t <= segTo)
        cur = siguienteFin.length ? Math.min(...siguienteFin) : segTo
        continue
      }
      resultado.push({ canchaId: candidatos[0].id, canchaNombre: candidatos[0].nombre, inicio: toStrFill(cur), fin: toStrFill(slotEnd) })
      cur = slotEnd
    }
  }
  return resultado
}

// ─── Modal auto-fill ──────────────────────────────────────────────────────────

const ModalAutoFill = ({ fecha, bloques, onClose, onConfirm, submitting }) => createPortal(
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center">
            <Zap size={17} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Completar disponibilidad</h3>
            <p className="text-white/30 text-xs capitalize">{fmtFecha(fecha)}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
        <p className="text-white/40 text-xs leading-relaxed">
          Se crearán {bloques.length} clase{bloques.length !== 1 ? 's' : ''} cubriendo los slots libres de tu disponibilidad en orden de canchas:
        </p>
        <div className="flex flex-col gap-2">
          {bloques.map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-orange-400/8 border border-orange-400/15 rounded-xl px-4 py-3">
              <div className="w-7 h-7 bg-orange-400/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-orange-400 font-black text-xs">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{b.canchaNombre}</p>
                <p className="text-orange-300/70 text-xs">{b.inicio} → {b.fin} · {duracionStr(b.inicio, b.fin)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 rounded-xl py-3 text-sm font-medium transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={submitting}
            className="flex-1 bg-orange-400 hover:bg-orange-300 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-400/20">
            <Zap size={14} />
            {submitting ? 'Creando...' : `Crear ${bloques.length} clase${bloques.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body
)

// ─── Modal para crear una clase ───────────────────────────────────────────────

const ModalClase = ({ fecha, onClose, onSave, reservasDelDia, misClasesProfesor, canchasDisponibles, franjasDelDia, rangosPorCancha, submitting }) => {
  const [canchaId, setCanchaId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  const franjasCancha = useMemo(() => {
    if (!canchaId) return []
    const rango = rangosPorCancha?.[canchaId]
    if (!rango) return franjasDelDia
    const apMin = toMinFill(rango.apertura)
    const ciMin = toMinFill(rango.cierre)
    return franjasDelDia.filter((f) => toMinFill(f.inicio) >= apMin && toMinFill(f.fin) <= ciMin)
  }, [canchaId, franjasDelDia, rangosPorCancha])

  const handleCanchaChange = (id) => {
    setCanchaId(id)
    setInicio('')
    setFin('')
    setError('')
  }

  const opcionesFin = useMemo(() => {
    if (!inicio) return []
    const minMark = toMinFill(inicio) % 60
    const seen = new Set()
    const result = []
    franjasCancha.forEach((f) => {
      if (toMinFill(f.fin) > toMinFill(inicio) && toMinFill(f.fin) % 60 === minMark && !seen.has(f.fin)) {
        seen.add(f.fin)
        result.push({ fin: f.fin })
      }
    })
    return result
  }, [inicio, franjasCancha])

  const franjasEnRango = useMemo(() => {
    if (!inicio || !fin) return []
    const slots = []
    let cur = toMinFill(inicio)
    const end = toMinFill(fin)
    while (cur + 60 <= end) {
      const s = toStrFill(cur)
      const e = toStrFill(cur + 60)
      if (franjasCancha.some((f) => f.inicio === s)) slots.push({ inicio: s, fin: e })
      cur += 60
    }
    return slots
  }, [inicio, fin, franjasCancha])

  const estadoFranjas = useMemo(
    () => franjasEnRango.map((f) => {
      const ocupadoCancha = reservasDelDia.some(
        (r) => String(r.canchaId) === String(canchaId) && r.inicio < f.fin && r.fin > f.inicio
      )
      const ocupadoProfesor = !ocupadoCancha && (misClasesProfesor ?? []).some(
        (r) => String(r.canchaId) !== String(canchaId) && r.inicio < f.fin && r.fin > f.inicio
      )
      return { ...f, ocupado: ocupadoCancha, ocupadoProfesor }
    }),
    [franjasEnRango, canchaId, reservasDelDia, misClasesProfesor]
  )

  const hayConflicto = estadoFranjas.some((f) => f.ocupado || f.ocupadoProfesor)

  const handleSetInicio = (val) => {
    setInicio(val)
    const newMark = toMinFill(val) % 60
    if (fin && (toMinFill(fin) <= toMinFill(val) || toMinFill(fin) % 60 !== newMark)) setFin('')
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
    if (estadoFranjas.some((f) => f.ocupado)) { setError('El rango tiene franjas ocupadas en esta cancha.'); return }
    if (estadoFranjas.some((f) => f.ocupadoProfesor)) { setError('Ya tenés una clase en ese horario en otra cancha.'); return }
    onSave({ canchaId, horaInicio: inicio, horaFin: fin, notas: nota.trim() })
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
              <select value={canchaId} onChange={(e) => handleCanchaChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all appearance-none">
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
                  <select value={inicio} onChange={(e) => handleSetInicio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none">
                    <option value="" className="bg-[#0d1117]">— Inicio —</option>
                    {franjasCancha.map((f) => (
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
                  <select value={fin} onChange={(e) => setFin(e.target.value)} disabled={!inicio}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none disabled:opacity-30">
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
                    f.ocupado ? 'bg-red-500/12 border border-red-500/20 text-red-400'
                      : f.ocupadoProfesor ? 'bg-amber-400/12 border border-amber-400/20 text-amber-400'
                      : 'bg-orange-400/8 border border-orange-400/12 text-orange-300',
                  ].join(' ')}>
                    <span>{f.inicio} → {f.fin}</span>
                    <span className="text-[10px] opacity-70">
                      {f.ocupado ? 'Ocupado' : f.ocupadoProfesor ? 'Clase en otra cancha' : 'Libre'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-2">
              Descripción <span className="text-white/20 normal-case font-normal">(opcional)</span>
            </label>
            <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Clase nivel principiante" maxLength={80}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-orange-400/50 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all" />
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

// ─── Modal editar clase ───────────────────────────────────────────────────────
// Flujo: primero elegís el nuevo horario → el modal muestra qué canchas están libres.

const ModalEditarClase = ({ clase, fecha, onClose, onSave, reservasDelDia, misClasesProfesor, canchasDisponibles, franjasDelDia, rangosPorCancha, submitting }) => {
  const [inicio, setInicio] = useState(clase.horaInicio ?? '')
  const [fin, setFin] = useState(clase.horaFin ?? '')
  // Pre-seleccionar la cancha actual
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(
    () => canchasDisponibles.find((c) => String(c.id) === String(clase.canchaId)) ?? null
  )
  const [nota, setNota] = useState(clase.notas ?? '')
  const [error, setError] = useState('')

  const reservasSinSelf = useMemo(() => reservasDelDia.filter((r) => r.id !== clase.id), [reservasDelDia, clase.id])
  const clasesSinSelf = useMemo(() => (misClasesProfesor ?? []).filter((r) => r.id !== clase.id), [misClasesProfesor, clase.id])

  // Opciones de fin: mismo mark de minutos que inicio, sobre franjasDelDia (sin filtrar por cancha)
  const opcionesFin = useMemo(() => {
    if (!inicio) return []
    const minMark = toMinFill(inicio) % 60
    const seen = new Set()
    const result = []
    franjasDelDia.forEach((f) => {
      if (toMinFill(f.fin) > toMinFill(inicio) && toMinFill(f.fin) % 60 === minMark && !seen.has(f.fin)) {
        seen.add(f.fin)
        result.push({ fin: f.fin })
      }
    })
    return result
  }, [inicio, franjasDelDia])

  const handleSetInicio = (val) => {
    setInicio(val)
    const newMark = toMinFill(val) % 60
    if (fin && (toMinFill(fin) <= toMinFill(val) || toMinFill(fin) % 60 !== newMark)) setFin('')
    setCanchaSeleccionada(null)
  }

  const handleSetFin = (val) => {
    setFin(val)
    setCanchaSeleccionada(null)
  }

  const duracionTotal = useMemo(() => {
    if (!inicio || !fin) return null
    const mins = toMinFill(fin) - toMinFill(inicio)
    if (mins <= 0) return null
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}min` : `${h}h`
  }, [inicio, fin])

  // Conflicto de profesor: independiente de la cancha
  const conflictoProfesor = useMemo(() => {
    if (!inicio || !fin) return false
    return clasesSinSelf.some((r) => r.inicio < fin && r.fin > inicio)
  }, [inicio, fin, clasesSinSelf])

  // Para cada cancha: estado libre/ocupada/fuera-de-horario
  const disponibilidadPorCancha = useMemo(() => {
    if (!inicio || !fin) return []
    return canchasDisponibles.map((c) => {
      const rango = rangosPorCancha?.[c.id]
      const fuera = rango && (toMinFill(inicio) < toMinFill(rango.apertura) || toMinFill(fin) > (toMinFill(rango.cierre) || 1440))
      const ocupada = !fuera && reservasSinSelf.some(
        (r) => String(r.canchaId) === String(c.id) && r.inicio < fin && r.fin > inicio
      )
      const estado = fuera ? 'fuera' : ocupada ? 'ocupada' : 'libre'
      const motivo = fuera ? 'Fuera de horario' : ocupada ? 'Ocupada' : ''
      return { ...c, estado, motivo }
    })
  }, [inicio, fin, canchasDisponibles, reservasSinSelf, rangosPorCancha])

  const hayAlgunaLibre = !conflictoProfesor && disponibilidadPorCancha.some((c) => c.estado === 'libre')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!inicio || !fin) { setError('Seleccioná el nuevo horario.'); return }
    if (conflictoProfesor) { setError('Ya tenés otra clase en ese horario.'); return }
    if (!canchaSeleccionada) { setError('Seleccioná una cancha disponible.'); return }
    onSave({ canchaId: canchaSeleccionada.id, horaInicio: inicio, horaFin: fin, notas: nota.trim() })
  }

  const svgArrow = <svg width="9" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center">
              <Pencil size={17} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Mover clase</h3>
              <p className="text-white/30 text-xs">{clase.horaInicio} – {clase.horaFin} · {clase.cancha?.nombre ?? `Cancha ${clase.canchaId}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Paso 1: Nuevo horario */}
          <div className="flex flex-col gap-3">
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
              1 · Nuevo horario
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/25 text-[9px] block mb-1.5 uppercase tracking-wide">Desde</label>
                <div className="relative">
                  <select value={inicio} onChange={(e) => handleSetInicio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none">
                    <option value="" className="bg-[#0d1117]">— Inicio —</option>
                    {franjasDelDia.map((f) => (
                      <option key={f.inicio} value={f.inicio} className="bg-[#0d1117]">{f.inicio}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25">{svgArrow}</div>
                </div>
              </div>
              <div>
                <label className="text-white/25 text-[9px] block mb-1.5 uppercase tracking-wide">Hasta</label>
                <div className="relative">
                  <select value={fin} onChange={(e) => handleSetFin(e.target.value)} disabled={!inicio}
                    className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-all appearance-none disabled:opacity-30">
                    <option value="" className="bg-[#0d1117]">— Fin —</option>
                    {opcionesFin.map((f) => (
                      <option key={f.fin} value={f.fin} className="bg-[#0d1117]">{f.fin}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25">{svgArrow}</div>
                </div>
              </div>
            </div>
            {duracionTotal && (
              <p className="text-white/25 text-xs pl-1">{inicio} → {fin} · {duracionTotal}</p>
            )}
          </div>

          {/* Paso 2: Canchas disponibles (aparece al elegir horario) */}
          {inicio && fin && (
            <div className="flex flex-col gap-3">
              <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                2 · {conflictoProfesor ? 'Sin disponibilidad' : hayAlgunaLibre ? 'Elegí una cancha' : 'Sin canchas disponibles'}
              </label>

              {conflictoProfesor ? (
                <div className="flex items-center gap-2 bg-amber-400/8 border border-amber-400/20 rounded-xl px-4 py-3">
                  <AlertCircle size={13} className="text-amber-400 shrink-0" />
                  <p className="text-amber-400 text-xs">Ya tenés otra clase en ese horario — no podés mover aquí.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {disponibilidadPorCancha.map((c) => {
                    const libre = c.estado === 'libre'
                    const sel = canchaSeleccionada?.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!libre}
                        onClick={() => setCanchaSeleccionada(sel ? null : c)}
                        className={[
                          'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                          sel
                            ? 'bg-orange-400/15 border-orange-400/40 shadow-lg shadow-orange-400/10'
                            : libre
                              ? 'bg-white/3 border-white/10 hover:border-orange-400/30 hover:bg-white/5 cursor-pointer'
                              : 'bg-white/2 border-white/5 opacity-35 cursor-not-allowed',
                        ].join(' ')}
                      >
                        {/* Radio visual */}
                        <div className={[
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          sel ? 'border-orange-400 bg-orange-400' : libre ? 'border-white/25' : 'border-white/10',
                        ].join(' ')}>
                          {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        {/* Nombre */}
                        <p className={['flex-1 text-sm font-semibold', sel ? 'text-white' : libre ? 'text-white/75' : 'text-white/25'].join(' ')}>
                          {c.nombre}
                        </p>
                        {/* Badge */}
                        {libre && !sel && <span className="text-emerald-400 text-[10px] font-bold shrink-0">Libre</span>}
                        {sel && <span className="text-orange-400 text-[10px] font-bold shrink-0">Seleccionada</span>}
                        {!libre && c.motivo && <span className="text-white/20 text-[10px] shrink-0">{c.motivo}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-2">
              Descripción <span className="text-white/20 normal-case font-normal">(opcional)</span>
            </label>
            <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Clase nivel principiante" maxLength={80}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-orange-400/50 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all" />
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
            <button type="submit" disabled={submitting || !canchaSeleccionada}
              className="flex-1 bg-orange-400 hover:bg-orange-300 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-400/20">
              <Save size={14} />
              {submitting ? 'Guardando...' : 'Guardar cambios'}
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
  const canchas   = useClubStore((s) => s.club.canchas ?? [])
  const horarios  = useClubStore((s) => s.club.horarios)

  const [fecha, setFecha] = useState(todayISO())
  const [windowStart, setWindowStart] = useState(todayISO())
  const [misClases, setMisClases] = useState([])
  const [todasReservasDia, setTodasReservasDia] = useState([])
  const [turnosFijosDia, setTurnosFijosDia] = useState([])
  const [modalNueva, setModalNueva] = useState(false)
  const [modalAutoFill, setModalAutoFill] = useState(false)
  const [bloquesAutoFill, setBloquesAutoFill] = useState([])
  const [claseEliminar, setClaseEliminar] = useState(null)
  const [claseEditar, setClaseEditar] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showHelper, setShowHelper] = useState(false)
  const [clasesSemana, setClasesSemana] = useState({})
  const toast = useToast()
  const showToast = toast.success // alias: mantiene los call-sites existentes

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

  const fetchTurnosFijosDia = useCallback(async (f) => {
    if (!token) return
    try {
      const data = await api.get(`/turnos-fijos/slots-dia?fecha=${f}`, headers)
      if (Array.isArray(data)) setTurnosFijosDia(data)
    } catch {}
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setMisClases([])
    setTurnosFijosDia([])
    fetchMisClases(fecha)
    fetchTodasDia(fecha)
    fetchTurnosFijosDia(fecha)
  }, [fecha, fetchTodasDia]) // eslint-disable-line react-hooks/exhaustive-deps

  const franjasDelDia = useMemo(() => {
    const diaNombre = getDiaNombre(fecha)
    const horario = horarios?.[diaNombre]
    if (!horarios) return generarFranjas('08:00', '23:00')
    if (!horario?.activo) return []

    const toMin = (t) => {
      if (!t) return 0
      const [h, m] = t.split(':').map(Number)
      const mins = h * 60 + m
      // 00:xx–05:xx representan madrugada del día siguiente (ej: 00:30 → 1470)
      if (h < 6) return mins === 0 ? 1440 : mins + 1440
      return mins
    }
    const toStr = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

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

  const diaNombreActual = useMemo(() => getDiaNombre(fecha), [fecha])

  // Para una cancha, devuelve {apertura, cierre} efectivos para este día (custom > general)
  // Devuelve null solo si el horario general del club está cerrado este día.
  // Un día desactivado en el custom de la cancha NO cierra la cancha: hereda el general.
  const getRangoCancha = useCallback((cancha) => {
    const custom = cancha.horarios?.[diaNombreActual]
    if (custom?.activo) {
      return { apertura: custom.apertura || '08:00', cierre: custom.cierre || '23:00' }
    }
    // Sin custom activo para este día: usa el horario general del club
    const general = horarios?.[diaNombreActual]
    if (!general?.activo) return null
    return { apertura: general.apertura || '08:00', cierre: general.cierre || '23:00' }
  }, [diaNombreActual, horarios])

  const canchasHabilitadas = useMemo(() => {
    const activas = canchas.filter((c) => c.activa !== false)
    const conPermiso = profesor?.canchasIds?.length
      ? activas.filter((c) => profesor.canchasIds.includes(c.id))
      : activas
    // Excluir canchas cerradas este día (por su horario custom o el general)
    return conPermiso.filter((c) => getRangoCancha(c) !== null)
  }, [canchas, profesor?.canchasIds, getRangoCancha])

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
      showToast('Clase creada exitosamente')
    } catch (err) {
      toast.error(err?.message || 'Error al crear la clase')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAbrirAutoFill = () => {
    const rangosPorCancha = Object.fromEntries(canchasHabilitadas.map((c) => [c.id, getRangoCancha(c)]))
    const bloques = calcularBloquesFaltantes(canchasHabilitadas, franjasDelDia, todasReservasDia, turnosFijosDia, misClasesDia, rangosPorCancha)
    if (!bloques.length) { toast.error('No hay slots libres. Todos los horarios de tu disponibilidad ya están cubiertos.'); return }
    setBloquesAutoFill(bloques)
    setModalAutoFill(true)
  }

  const handleConfirmarAutoFill = async () => {
    if (submitting) return
    setSubmitting(true)
    const nuevas = []
    const errores = []
    for (const b of bloquesAutoFill) {
      try {
        const nueva = await api.post('/reservas/profesor', { canchaId: b.canchaId, fecha, horaInicio: b.inicio, horaFin: b.fin, notas: '' }, headers)
        nuevas.push(normalizar(nueva))
      } catch (err) {
        errores.push(`${b.inicio}-${b.fin} en ${b.canchaNombre}: ${err?.message || 'Error'}`)
      }
    }
    if (nuevas.length) {
      setMisClases((prev) => [...prev, ...nuevas])
      setClasesSemana((prev) => ({ ...prev, [fecha]: [...(prev[fecha] ?? []), ...nuevas] }))
    }
    setModalAutoFill(false)
    setBloquesAutoFill([])
    setSubmitting(false)
    if (errores.length) {
      toast.error(`Algunas clases no pudieron crearse: ${errores.join(' · ')}`)
    } else if (nuevas.length) {
      showToast(`${nuevas.length} clase${nuevas.length !== 1 ? 's' : ''} creada${nuevas.length !== 1 ? 's' : ''} exitosamente`)
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
      toast.error(err?.message || 'Error al cancelar la clase')
    } finally {
      setSubmitting(false)
    }
  }


  const handleEditarClase = async ({ canchaId, horaInicio, horaFin, notas }) => {
    if (submitting || !claseEditar) return
    setSubmitting(true)
    try {
      const updated = await api.patch(`/reservas/profesor/${claseEditar.id}`, { canchaId, horaInicio, horaFin, notas }, headers)
      const norm = normalizar(updated)
      setMisClases((prev) => prev.map((r) => r.id === claseEditar.id ? norm : r))
      setClasesSemana((prev) => ({
        ...prev,
        [fecha]: (prev[fecha] ?? []).map((r) => r.id === claseEditar.id ? norm : r),
      }))
      setClaseEditar(null)
      showToast('Clase actualizada exitosamente')
      fetchTodasDia(fecha)
    } catch (err) {
      toast.error(err?.message || 'Error al editar la clase')
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

  // Por qué no hay franjas en un día futuro (null = hay franjas o es pasado)
  const motivoSinFranjas = useMemo(() => {
    if (esDiaPasado || franjasDelDia.length > 0) return null
    const diaNombre = getDiaNombre(fecha)
    const horario = horarios?.[diaNombre]
    if (!horarios || !horario?.activo) return 'club'
    const dispDia = profesor?.disponibilidad?.[diaNombre]
    if (dispDia && !dispDia.activo) return 'profesor'
    return 'rango'
  }, [franjasDelDia, fecha, horarios, profesor?.disponibilidad, esDiaPasado])

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mi agenda</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize">{fmtFecha(fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelper((v) => !v)}
            title="Cómo funciona esta sección"
            className={['p-2 rounded-xl border transition-all', showHelper ? 'bg-white/10 border-white/20 text-white/70' : 'border-white/10 text-white/25 hover:text-white/50 hover:border-white/20'].join(' ')}
          >
            <HelpCircle size={15} />
          </button>
          {!esDiaPasado && franjasDelDia.length > 0 && (
            <button
              onClick={handleAbrirAutoFill}
              title="Completar disponibilidad automáticamente"
              className="flex items-center gap-1.5 border border-orange-400/30 text-orange-400 hover:bg-orange-400/10 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <Zap size={14} />
              Autocompletar
            </button>
          )}
          <button
            onClick={() => setModalNueva(true)}
            disabled={esDiaPasado || motivoSinFranjas !== null}
            className="flex items-center gap-2 bg-orange-400 hover:bg-orange-300 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-400/20"
          >
            <Plus size={16} />
            Nueva clase
          </button>
        </div>
      </div>

      {/* Panel helper */}
      {showHelper && (
        <div className="bg-white/4 border border-white/10 rounded-2xl px-5 py-4 flex flex-col gap-3">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wide">Cómo funciona Mi agenda</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-orange-400/15 border border-orange-400/25 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={11} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">Autocompletar</p>
                <p className="text-white/30 text-xs leading-relaxed mt-0.5">Llena automáticamente todos los slots libres del día con clases de 1h, respetando tu disponibilidad configurada y las reservas existentes de los jugadores. Solo aparece si tenés franjas disponibles en el día seleccionado.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-orange-400/15 border border-orange-400/25 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Plus size={11} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">Nueva clase</p>
                <p className="text-white/30 text-xs leading-relaxed mt-0.5">Crea una clase puntual eligiendo cancha, horario y una nota opcional. Se confirma al instante sin aprobación del admin. Solo disponible en días futuros dentro de tu horario.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-orange-400/10 border border-orange-400/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Pencil size={11} className="text-orange-400/60" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">Editar una clase</p>
                <p className="text-white/30 text-xs leading-relaxed mt-0.5">Hacé clic en el ícono de lápiz para cambiar la cancha, el horario o la descripción. Útil si acordaste un nuevo horario con los alumnos. Solo disponible en clases que aún no comenzaron.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={11} className="text-white/30" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">Cancelar una clase</p>
                <p className="text-white/30 text-xs leading-relaxed mt-0.5">Hacé clic en el ícono de tacho en una clase del listado. Solo podés cancelar tus propias clases y solo si aún no comenzaron.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <CalendarDays size={11} className="text-white/30" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">Esta semana</p>
                <p className="text-white/30 text-xs leading-relaxed mt-0.5">Resumen de tus clases agrupadas por día y cancha. Hacé clic en cualquier día para ir directo a esa fecha. Las flechas ‹ › cambian de día; el calendario navega por semanas.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de días */}
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          disabled={fecha <= hoy}
          className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 transition-all shrink-0"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex gap-2 flex-1">
          {diasSemana.map((d) => {
            const sel = d === fecha
            const cnt = (clasesSemana[d] ?? []).length
            const esHoy = d === hoy
            return (
              <button
                key={d}
                onClick={() => setFecha(d)}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all',
                  sel
                    ? 'bg-orange-400/15 border-orange-400/40 shadow-lg shadow-orange-400/10'
                    : 'border-white/8 hover:border-white/20 hover:bg-white/4',
                ].join(' ')}
              >
                <span className={['text-[10px] font-bold uppercase tracking-wide', sel ? 'text-orange-400' : esHoy ? 'text-orange-400/60' : 'text-white/30'].join(' ')}>
                  {esHoy ? 'Hoy' : fmtDiaCorto(d)}
                </span>
                <span className={['text-lg font-black leading-none', sel ? 'text-white' : 'text-white/50'].join(' ')}>
                  {new Date(d + 'T12:00:00').getDate()}
                </span>
                {cnt > 0 ? (
                  <span className={['text-xs font-black leading-none', sel ? 'text-orange-400' : 'text-orange-400/50'].join(' ')}>
                    {cnt} {cnt === 1 ? 'clase' : 'clases'}
                  </span>
                ) : (
                  <span className="text-xs text-white/10 leading-none">—</span>
                )}
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
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            {motivoSinFranjas !== null ? (
              <>
                <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-400/60" />
                </div>
                <div>
                  <p className="text-white/50 text-sm font-semibold">
                    {motivoSinFranjas === 'club'
                      ? 'Club cerrado este día'
                      : motivoSinFranjas === 'profesor'
                        ? 'Día no disponible'
                        : 'Sin franjas válidas'}
                  </p>
                  <p className="text-white/25 text-xs mt-1 max-w-[220px] leading-relaxed">
                    {motivoSinFranjas === 'club'
                      ? 'El club no tiene horarios habilitados para este día.'
                      : motivoSinFranjas === 'profesor'
                        ? 'Marcaste este día como no disponible. Modificalo en "Mi disponibilidad".'
                        : 'Tu horario configurado no se intersecta con el del club. Revisá "Mi disponibilidad".'}
                  </p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setClaseEditar(clase)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-orange-400 hover:bg-orange-400/8 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setClaseEliminar(clase)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/8 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            {(() => {
              const todas = Object.values(clasesSemana).flat()
              const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
              const totalMins = todas.reduce((acc, c) => acc + (toMin(c.horaFin) - toMin(c.horaInicio)), 0)
              const h = Math.floor(totalMins / 60)
              const m = totalMins % 60
              return `${todas.length} clases · ${m ? `${h}h ${m}m` : `${h}h`}`
            })()}
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {diasSemana.map((d) => {
            const clasesDia = [...(clasesSemana[d] ?? [])].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
            const sel = d === fecha
            const esHoy = d === hoy

            // Agrupar por cancha
            const porCancha = clasesDia.reduce((acc, c) => {
              const key = c.cancha?.nombre || c.canchaId || 'Sin cancha'
              if (!acc[key]) acc[key] = []
              acc[key].push(c)
              return acc
            }, {})
            const canchas = Object.keys(porCancha)

            return (
              <button
                key={d}
                onClick={() => setFecha(d)}
                className={[
                  'w-full px-5 py-3.5 flex items-start gap-4 text-left transition-all hover:bg-white/4',
                  sel ? 'bg-white/4' : '',
                ].join(' ')}
              >
                {/* Día */}
                <div className="shrink-0 w-16 pt-0.5">
                  <p className={[
                    'text-xs font-bold capitalize',
                    sel ? 'text-orange-400' : esHoy ? 'text-orange-400/50' : 'text-white/35',
                  ].join(' ')}>
                    {esHoy ? 'Hoy' : fmtDiaCorto(d)} {new Date(d + 'T12:00:00').getDate()}
                  </p>
                  {clasesDia.length > 0 && (
                    <p className={['text-[10px] mt-0.5', sel ? 'text-orange-400/50' : 'text-white/15'].join(' ')}>
                      {clasesDia.length}h · {clasesDia.length} clase{clasesDia.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Clases agrupadas por cancha */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {clasesDia.length === 0 ? (
                    <span className="text-white/15 text-xs pt-0.5">Sin clases</span>
                  ) : (
                    canchas.map((nombreCancha) => (
                      <div key={nombreCancha} className="flex items-center gap-2 flex-wrap">
                        <span className={['text-[10px] font-semibold shrink-0', sel ? 'text-white/50' : 'text-white/20'].join(' ')}>
                          {nombreCancha}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {porCancha[nombreCancha].map((c) => (
                            <span key={c.id} className={[
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                              sel
                                ? 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                                : 'bg-white/5 text-white/40 border-white/10',
                            ].join(' ')}>
                              {c.horaInicio}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Modales */}
      {modalAutoFill && (
        <ModalAutoFill
          fecha={fecha}
          bloques={bloquesAutoFill}
          onClose={() => { setModalAutoFill(false); setBloquesAutoFill([]) }}
          onConfirm={handleConfirmarAutoFill}
          submitting={submitting}
        />
      )}
      {modalNueva && (
        <ModalClase
          fecha={fecha}
          onClose={() => setModalNueva(false)}
          onSave={handleCrearClase}
          reservasDelDia={[...todasReservasDia, ...turnosFijosDia]}
          misClasesProfesor={misClases}
          canchasDisponibles={canchasHabilitadas}
          franjasDelDia={franjasDelDia}
          rangosPorCancha={Object.fromEntries(canchasHabilitadas.map((c) => [c.id, getRangoCancha(c)]))}
          submitting={submitting}
        />
      )}
      {claseEditar && (
        <ModalEditarClase
          clase={claseEditar}
          fecha={claseEditar.fecha}
          onClose={() => setClaseEditar(null)}
          onSave={handleEditarClase}
          reservasDelDia={[...todasReservasDia, ...turnosFijosDia]}
          misClasesProfesor={misClases}
          canchasDisponibles={canchasHabilitadas}
          franjasDelDia={franjasDelDia}
          rangosPorCancha={Object.fromEntries(canchasHabilitadas.map((c) => [c.id, getRangoCancha(c)]))}
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
