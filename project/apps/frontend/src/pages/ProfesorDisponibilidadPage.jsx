import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, CheckCircle, AlertCircle, HelpCircle, X, Zap } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const ALL_TIMES = (() => {
  const opts = []
  for (let m = 6 * 60; m <= 24 * 60; m += 30) {
    const h = Math.floor(m / 60)
    const min = m % 60
    opts.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return opts
})()

// El club está cerrado ese día → profesor tampoco puede trabajarlo
const clubDiaCerrado = (dia, horarios) => {
  const h = horarios?.[dia]
  return h?.activo === false
}

// Opciones fijas iguales para todos los días — la intersección con el club se aplica en la agenda
const OPTS_APERTURA = ALL_TIMES.filter((t) => t !== '24:00')
// Cierre solo muestra horarios con el mismo minuto (:00 con :00, :30 con :30)
const opcionesCierre = (apertura) => {
  const apMin = toMin(apertura)
  const minMark = apMin % 60
  return ALL_TIMES.filter((t) => toMin(t) > apMin && toMin(t) % 60 === minMark)
}


const buildInitialState = (disponibilidad, horarios) => {
  const state = {}
  DIAS.forEach((dia) => {
    const saved = disponibilidad?.[dia]
    // Si el club tiene el día cerrado, el profesor tampoco puede tenerlo activo
    const activo = !clubDiaCerrado(dia, horarios) && (saved ? (saved.activo ?? false) : false)
    state[dia] = {
      activo,
      apertura: saved?.apertura ?? '09:00',
      cierre: saved?.cierre ?? '18:00',
    }
  })
  return state
}

const toMin = (t) => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ─── Timeline visual ──────────────────────────────────────────────────────────

const TimelineBar = ({ apertura, cierre }) => {
  const DAY_MINS = 24 * 60
  const ap = toMin(apertura)
  const ci = toMin(cierre)
  const left = (ap / DAY_MINS) * 100
  const width = ((ci - ap) / DAY_MINS) * 100
  const markers = [6, 9, 12, 15, 18, 21]

  return (
    <div className="relative mt-2 mb-7">
      <div className="relative h-2.5 bg-white/5 rounded-full">
        {markers.map((h) => (
          <div
            key={h}
            className="absolute top-0 w-px h-2.5 bg-white/10"
            style={{ left: `${(h * 60 / DAY_MINS) * 100}%` }}
          />
        ))}
        <div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-lg shadow-orange-500/40"
          style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
        />
        {/* Dot inicio */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-orange-400 border-2 border-[#0d1117] shadow shadow-orange-400/50 -translate-x-1/2"
          style={{ left: `${left}%` }}
        />
        {/* Dot fin */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#0d1117] shadow shadow-amber-400/50 -translate-x-1/2"
          style={{ left: `${left + width}%` }}
        />
      </div>
      {/* Labels bajo la barra */}
      <div className="relative mt-2.5">
        <span
          className="absolute text-[10px] text-orange-400 font-bold -translate-x-1/2"
          style={{ left: `${left}%` }}
        >
          {apertura}
        </span>
        <span
          className="absolute text-[10px] text-amber-400 font-bold -translate-x-1/2"
          style={{ left: `${left + width}%` }}
        >
          {cierre}
        </span>
        {/* Marcadores de hora */}
        {markers.map((h) => (
          <span
            key={h}
            className="absolute text-[8px] text-white/15 -translate-x-1/2 mt-3"
            style={{ left: `${(h * 60 / DAY_MINS) * 100}%` }}
          >
            {h}h
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Toggle component ─────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={[
      'relative shrink-0 transition-all duration-200 rounded-full border',
      checked
        ? 'bg-orange-400 border-orange-400'
        : 'bg-white/8 border-white/15',
    ].join(' ')}
    style={{ width: 40, height: 22 }}
  >
    <span
      className={[
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
        checked ? 'left-5' : 'left-0.5',
      ].join(' ')}
    />
  </button>
)

// ─── Select estilizado ────────────────────────────────────────────────────────

const TimeSelect = ({ label, value, options, onChange }) => (
  <div className="flex-1">
    <label className="text-white/30 text-[9px] font-bold uppercase tracking-widest block mb-1.5">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 hover:border-orange-400/40 focus:border-orange-400/60 rounded-xl px-3 py-2.5 text-white text-sm font-medium focus:outline-none transition-all appearance-none cursor-pointer"
      >
        {options.map((t) => (
          <option key={t} value={t} className="bg-[#0d1117]">{t}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfesorDisponibilidadPage = () => {
  const { profesor, token, setDisponibilidad } = useAuthProfesorStore()
  const horarios = useClubStore((s) => s.club.horarios)

  const [disp, setDisp] = useState(() => buildInitialState(profesor?.disponibilidad, horarios))
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [ayudaAbierta, setAyudaAbierta] = useState(false)
  const toastTimer = useRef(null)

  // Re-inicializa solo la primera vez que llegan los datos reales del backend.
  // Sin este guard, el useEffect pisaría los cambios del usuario si el fetch termina
  // mientras ya editó algo (race condition).
  const initializedRef = useRef(false)
  useEffect(() => {
    if (!profesor?.id || initializedRef.current) return
    initializedRef.current = true
    setDisp(buildInitialState(profesor?.disponibilidad, horarios))
  }, [profesor?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Todos los hooks deben estar antes del early return para no violar las reglas de hooks
  const errores = useMemo(() => {
    const errs = {}
    DIAS.forEach((dia) => {
      if (!disp[dia].activo) return
      if (toMin(disp[dia].apertura) >= toMin(disp[dia].cierre))
        errs[dia] = 'El cierre debe ser posterior a la apertura'
    })
    return errs
  }, [disp])

  const diasActivos = useMemo(() => DIAS.filter((d) => disp[d].activo), [disp])

  const horasSemanales = useMemo(
    () => diasActivos.reduce((acc, d) => acc + (toMin(disp[d].cierre) - toMin(disp[d].apertura)) / 60, 0),
    [diasActivos, disp]
  )

  // Mientras los datos del profesor no cargaron, no mostramos el form.
  // Así la inicialización del useState siempre usa datos reales.
  if (!profesor) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-400/40 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Cargando disponibilidad…</p>
        </div>
      </div>
    )
  }

  const showToast = (msg, type = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const toggleDia = (dia) => {
    if (clubDiaCerrado(dia, horarios)) return // día cerrado en el club — no se puede activar
    setDisp((prev) => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }))
  }

  const setHora = (dia, campo, valor) =>
    setDisp((prev) => {
      const next = { ...prev[dia], [campo]: valor }
      if (campo === 'apertura') {
        const newMark = toMin(valor) % 60
        if (toMin(next.cierre) <= toMin(valor) || toMin(next.cierre) % 60 !== newMark) {
          next.cierre = ALL_TIMES.find((t) => toMin(t) > toMin(valor) && toMin(t) % 60 === newMark) ?? next.cierre
        }
      }
      return { ...prev, [dia]: next }
    })

  const hayErrores = Object.keys(errores).length > 0

  const handleGuardar = async () => {
    if (submitting || hayErrores) return
    setSubmitting(true)
    try {
      const payload = {}
      DIAS.forEach((dia) => { payload[dia] = { ...disp[dia] } })
      await api.patch('/auth/profesor/disponibilidad', { disponibilidad: payload }, {
        Authorization: `Bearer ${token}`,
      })
      setDisponibilidad(payload)
      showToast('Disponibilidad guardada correctamente', 'ok')
    } catch {
      showToast('Error al guardar. Intentá de nuevo.', 'err')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-7">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mi disponibilidad</h1>
          <p className="text-white/40 text-sm mt-1">Configurá tus días y horarios de trabajo</p>
        </div>
        <button
          onClick={() => setAyudaAbierta(true)}
          className="flex items-center gap-1.5 text-white/25 hover:text-white/60 text-xs transition-colors mt-1 shrink-0"
        >
          <HelpCircle size={14} />
          Ayuda
        </button>
      </div>

      {/* Chips de días — selector semanal */}
      <div>
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-3">Días de trabajo</p>
        <div className="grid grid-cols-7 gap-2">
          {DIAS.map((dia, i) => {
            const activo = disp[dia].activo
            const cerrado = clubDiaCerrado(dia, horarios)
            return (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                disabled={cerrado}
                title={cerrado ? 'El club está cerrado este día' : undefined}
                className={[
                  'flex flex-col items-center py-3 rounded-2xl border transition-all duration-200 relative',
                  cerrado
                    ? 'bg-white/1 border-white/4 opacity-30 cursor-not-allowed'
                    : activo
                      ? 'bg-orange-400/12 border-orange-400/40 shadow-lg shadow-orange-400/10'
                      : 'bg-white/3 border-white/8 hover:border-white/20 hover:bg-white/6',
                ].join(' ')}
              >
                <span className={['text-[10px] font-bold uppercase tracking-wide', activo ? 'text-orange-400' : 'text-white/30'].join(' ')}>
                  {DIAS_CORTO[i]}
                </span>
                <div className={[
                  'w-1.5 h-1.5 rounded-full mt-1.5 transition-all',
                  activo ? 'bg-orange-400' : 'bg-white/10',
                ].join(' ')} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats rápidas */}
      {diasActivos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-400/15 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wide">Días activos</p>
              <p className="text-white font-black text-xl leading-tight">{diasActivos.length}</p>
            </div>
          </div>
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-400/15 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wide">Hrs / semana</p>
              <p className="text-white font-black text-xl leading-tight">{horasSemanales % 1 === 0 ? horasSemanales : horasSemanales.toFixed(1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cards por día activo */}
      {diasActivos.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Configurar horarios</p>
          {DIAS.filter((d) => disp[d].activo).map((dia) => {
            const d = disp[dia]
            const err = errores[dia]
            return (
              <div
                key={dia}
                className="bg-gradient-to-br from-white/5 to-white/2 border border-orange-400/20 rounded-2xl overflow-hidden"
              >
                {/* Header card */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400 shadow shadow-orange-400/50" />
                    <span className="text-white font-bold text-sm">{dia}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className="text-white/20 hover:text-red-400 text-[10px] font-medium transition-colors flex items-center gap-1"
                  >
                    <X size={12} />
                    Quitar
                  </button>
                </div>

                <div className="px-5 py-5 flex flex-col gap-4">
                  {/* Timeline */}
                  <TimelineBar apertura={d.apertura} cierre={d.cierre} />

                  {/* Selectores */}
                  <div className="flex gap-3">
                    <TimeSelect
                      label="Desde"
                      value={d.apertura}
                      options={OPTS_APERTURA}
                      onChange={(v) => setHora(dia, 'apertura', v)}
                    />
                    <TimeSelect
                      label="Hasta"
                      value={d.cierre}
                      options={opcionesCierre(d.apertura)}
                      onChange={(v) => setHora(dia, 'cierre', v)}
                    />
                  </div>

                  {/* Duración */}
                  {!err && (
                    <div className="flex items-center gap-2 text-white/30 text-xs">
                      <Clock size={11} />
                      <span>{((toMin(d.cierre) - toMin(d.apertura)) / 60).toFixed(1).replace('.0', '')} horas disponibles</span>
                    </div>
                  )}

                  {/* Error */}
                  {err && (
                    <p className="text-red-400 text-xs flex items-center gap-1.5">
                      <AlertCircle size={12} /> {err}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sin días activos */}
      {diasActivos.length === 0 && (
        <div className="bg-amber-400/5 border border-amber-400/15 rounded-2xl px-6 py-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-amber-400/10 rounded-2xl flex items-center justify-center">
            <Clock size={22} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Sin días configurados</p>
            <p className="text-white/40 text-xs mt-1">
              Activá los días tocando los chips de arriba para definir tus horarios de clase.
            </p>
          </div>
        </div>
      )}

      {/* Botón guardar */}
      <button
        onClick={handleGuardar}
        disabled={submitting || hayErrores}
        className="w-full relative overflow-hidden bg-orange-400 hover:bg-orange-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-400/20"
      >
        <CheckCircle size={16} />
        {submitting ? 'Guardando...' : `Guardar${diasActivos.length > 0 ? ` (${diasActivos.length} día${diasActivos.length !== 1 ? 's' : ''})` : ''}`}
      </button>

      {/* Panel de ayuda */}
      {ayudaAbierta && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-orange-400" />
                <span className="text-white font-bold text-sm">¿Cómo funciona?</span>
              </div>
              <button onClick={() => setAyudaAbierta(false)} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4 text-sm text-white/60 leading-relaxed">
              <p><span className="text-white font-semibold">Chips de días</span> → tocá para activar o desactivar cada día de la semana.</p>
              <p><span className="text-white font-semibold">Desde / Hasta</span> → el rango en el que estás disponible para dar clases ese día.</p>
              <p><span className="text-white font-semibold">Barra visual</span> → muestra tu ventana horaria dentro del día. Los puntos marcan inicio y fin.</p>
              <p><span className="text-white font-semibold">Intersección con el club</span> → si el club cierra a las 20:00 y vos configuraste hasta las 22:00, la agenda solo mostrará hasta las 20:00.</p>
              <p className="text-white/25 text-xs">Sin configurar: verás todos los slots del horario del club.</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toast && createPortal(
        <div className={[
          'fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border backdrop-blur-sm',
          toast.type === 'ok'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/90 border-red-500/30 text-red-300',
        ].join(' ')}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>,
        document.body
      )}
    </div>
  )
}

export default ProfesorDisponibilidadPage
