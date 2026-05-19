import { useState, useEffect, useMemo, useRef } from 'react'
import {
  GraduationCap, Clock, CalendarDays, Save, Plus, AlertCircle,
  CheckCircle, User, ChevronDown, X,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useClubStore from '../../store/clubStore'
import useProfesoresStore from '../../store/profesoresStore'
import { api } from '../../lib/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const clubDiaCerrado = (dia, horarios) => horarios?.[dia]?.activo === false

const OPTS_APERTURA = ALL_TIMES.filter((t) => t !== '24:00')
const opcionesCierre = (apertura) => ALL_TIMES.filter((t) => t > apertura)

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const generarFranjas = (apertura, cierre) => {
  const franjas = []
  let cur = toMin(apertura)
  let end = toMin(cierre)
  if (end === 0) end = 1440
  while (cur + 60 <= end) {
    franjas.push({ inicio: toStr(cur), fin: toStr(cur + 60) })
    cur += 30
  }
  return franjas
}

const buildDisp = (disponibilidad) => {
  const state = {}
  DIAS.forEach((dia) => {
    state[dia] = disponibilidad?.[dia]
      ? { activo: disponibilidad[dia].activo ?? false, apertura: disponibilidad[dia].apertura ?? '09:00', cierre: disponibilidad[dia].cierre ?? '14:00' }
      : { activo: false, apertura: '09:00', cierre: '14:00' }
  })
  return state
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={['relative shrink-0 transition-all duration-200 rounded-full border', checked ? 'bg-brand-500 border-brand-500' : 'bg-slate-200 border-slate-300'].join(' ')}
    style={{ width: 36, height: 20 }}
  >
    <span className={['absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200', checked ? 'left-[18px]' : 'left-0.5'].join(' ')} />
  </button>
)

const SelectHora = ({ value, options, onChange, disabled }) => (
  <div className="relative flex-1">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition appearance-none disabled:opacity-40 bg-white"
    >
      {options.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
    <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
  </div>
)

// ─── Sección disponibilidad ───────────────────────────────────────────────────

const buildDispWithClub = (disponibilidad, horarios) => {
  const state = {}
  DIAS.forEach((dia) => {
    const saved = disponibilidad?.[dia]
    const activo = !clubDiaCerrado(dia, horarios) && (saved ? (saved.activo ?? false) : false)
    state[dia] = {
      activo,
      apertura: saved?.apertura ?? '09:00',
      cierre: saved?.cierre ?? '18:00',
    }
  })
  return state
}

const SeccionDisponibilidad = ({ profesor, onSaved }) => {
  const token = useAuthStore((s) => s.token)
  const horarios = useClubStore((s) => s.club.horarios)
  const [disp, setDisp] = useState(() => buildDispWithClub(profesor?.disponibilidad, horarios))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDisp(buildDispWithClub(profesor?.disponibilidad, horarios))
    setSaved(false)
  }, [profesor?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDia = (dia) => {
    if (clubDiaCerrado(dia, horarios)) return
    setDisp((prev) => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }))
  }
  const setHora = (dia, campo, val) => setDisp((prev) => ({ ...prev, [dia]: { ...prev[dia], [campo]: val } }))

  const diasActivos = DIAS.filter((d) => disp[d].activo)

  const errores = useMemo(() => {
    const errs = {}
    DIAS.forEach((dia) => {
      if (!disp[dia].activo) return
      if (toMin(disp[dia].apertura) >= toMin(disp[dia].cierre)) errs[dia] = true
    })
    return errs
  }, [disp])

  const hayErrores = Object.keys(errores).length > 0

  const handleGuardar = async () => {
    if (saving || hayErrores) return
    setSaving(true)
    try {
      const payload = {}
      DIAS.forEach((dia) => { payload[dia] = { ...disp[dia] } })
      const updated = await api.patch(`/profesores/${profesor.id}`, { disponibilidad: payload }, { Authorization: `Bearer ${token}` })
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silencioso — el toast global puede manejarlo
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chips de días */}
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Días de trabajo</p>
        <div className="grid grid-cols-7 gap-1.5">
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
                  'flex flex-col items-center py-2.5 rounded-xl border text-center transition-all text-xs font-bold',
                  cerrado
                    ? 'bg-slate-50 border-slate-200 text-slate-300 opacity-40 cursor-not-allowed'
                    : activo
                      ? 'bg-brand-50 border-brand-300 text-brand-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300',
                ].join(' ')}
              >
                {DIAS_CORTO[i]}
                <div className={['w-1.5 h-1.5 rounded-full mt-1 transition-all', activo ? 'bg-brand-500' : 'bg-slate-200'].join(' ')} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Horarios por día activo */}
      {diasActivos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DIAS.filter((d) => disp[d].activo).map((dia) => {
            const d = disp[dia]
            const err = errores[dia]
            return (
              <div key={dia} className={['flex items-center gap-3 bg-slate-50 border rounded-xl px-3 py-2.5', err ? 'border-red-300' : 'border-slate-200'].join(' ')}>
                <span className="text-slate-600 text-sm font-medium w-20 shrink-0">{dia}</span>
                <SelectHora value={d.apertura} options={OPTS_APERTURA} onChange={(v) => setHora(dia, 'apertura', v)} />
                <span className="text-slate-400 text-xs shrink-0">→</span>
                <SelectHora value={d.cierre} options={opcionesCierre(d.apertura)} onChange={(v) => setHora(dia, 'cierre', v)} />
                <button type="button" onClick={() => toggleDia(dia)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          Sin días activos. Activá al menos uno para que el profesor vea franjas en su agenda.
        </div>
      )}

      <button
        onClick={handleGuardar}
        disabled={saving || hayErrores}
        className="self-start flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
      >
        {saved ? <CheckCircle size={14} /> : <Save size={14} />}
        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar disponibilidad'}
      </button>
    </div>
  )
}

// ─── Sección crear clase manual ───────────────────────────────────────────────

const SeccionCrearClase = ({ profesor, onClaseCreada }) => {
  const token = useAuthStore((s) => s.token)
  const canchas = useClubStore((s) => s.club.canchas ?? [])
  const horarios = useClubStore((s) => s.club.horarios)

  const [fecha, setFecha] = useState(todayISO())
  const [canchaId, setCanchaId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const canchasActivas = useMemo(() => {
    const activas = canchas.filter((c) => c.activa !== false)
    if (!profesor?.canchasIds?.length) return activas
    return activas.filter((c) => profesor.canchasIds.includes(c.id))
  }, [canchas, profesor])

  const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const franjasDelDia = useMemo(() => {
    if (!fecha) return []
    const [y, m, d] = fecha.split('-').map(Number)
    const diaNombre = DIAS_NOMBRE[new Date(y, m - 1, d).getDay()]
    const horario = horarios?.[diaNombre]
    if (!horarios || !horario?.activo) return generarFranjas('08:00', '23:00')
    return generarFranjas(horario.apertura || '08:00', horario.cierre || '23:00')
  }, [fecha, horarios]) // eslint-disable-line react-hooks/exhaustive-deps

  const opcionesFin = useMemo(() => inicio ? franjasDelDia.filter((f) => f.fin > inicio) : [], [inicio, franjasDelDia])

  const handleCrear = async (e) => {
    e.preventDefault()
    setError('')
    if (!profesor) { setError('Seleccioná un profesor.'); return }
    if (!canchaId) { setError('Seleccioná una cancha.'); return }
    if (!inicio || !fin) { setError('Seleccioná el horario.'); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const horaFin = fin === '24:00' ? '00:00' : fin
      const reserva = await api.post(
        '/reservas/admin/clase-profesor',
        { profesorId: profesor.id, canchaId, fecha, horaInicio: inicio, horaFin, notas: notas.trim() },
        { Authorization: `Bearer ${token}` }
      )
      onClaseCreada(reserva)
      setInicio('')
      setFin('')
      setNotas('')
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (err) {
      setError(err?.message || 'Error al crear la clase')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleCrear} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Fecha */}
        <div>
          <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Fecha</label>
          <input
            type="date"
            value={fecha}
            min={todayISO()}
            onChange={(e) => { setFecha(e.target.value); setInicio(''); setFin('') }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition bg-white"
          />
        </div>
        {/* Cancha */}
        <div>
          <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Cancha</label>
          <div className="relative">
            <select
              value={canchaId}
              onChange={(e) => setCanchaId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition appearance-none bg-white"
            >
              <option value="">— Seleccioná una cancha —</option>
              {canchasActivas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        {/* Horario inicio */}
        <div>
          <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Inicio</label>
          <div className="relative">
            <select
              value={inicio}
              onChange={(e) => { setInicio(e.target.value); if (fin && fin <= e.target.value) setFin('') }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition appearance-none bg-white"
            >
              <option value="">— Inicio —</option>
              {franjasDelDia.map((f) => <option key={f.inicio} value={f.inicio}>{f.inicio}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        {/* Horario fin */}
        <div>
          <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Fin</label>
          <div className="relative">
            <select
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              disabled={!inicio}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition appearance-none disabled:opacity-40 bg-white"
            >
              <option value="">— Fin —</option>
              {opcionesFin.map((f) => <option key={f.fin} value={f.fin}>{f.fin}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>
      {/* Notas */}
      <div>
        <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">
          Descripción <span className="text-slate-300 normal-case font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: Clase nivel intermedio"
          maxLength={80}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-orange-400/25"
      >
        {ok ? <CheckCircle size={14} /> : <Plus size={14} />}
        {submitting ? 'Creando...' : ok ? 'Clase creada' : 'Crear clase'}
      </button>
    </form>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TabClasesProfesor = ({ onClaseCreada }) => {
  const token = useAuthStore((s) => s.token)
  const profesores = useProfesoresStore((s) => s.profesores)
  const updateProfesor = useProfesoresStore((s) => s.updateProfesor)
  const [loading, setLoading] = useState(false)
  const [profesorId, setProfesorId] = useState('')
  const [seccion, setSeccion] = useState('disponibilidad') // 'disponibilidad' | 'clase'

  useEffect(() => {
    if (profesores.length > 0 || !token) return
    setLoading(true)
    api.get('/profesores', { Authorization: `Bearer ${token}` })
      .then((data) => { if (Array.isArray(data)) useProfesoresStore.getState().setProfesores(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, profesores.length])

  const activos = profesores.filter((p) => p.activo)
  const profesorSel = activos.find((p) => p.id === profesorId) ?? null

  const handleDispGuardada = (updated) => {
    updateProfesor(updated.id, updated)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Selector de profesor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
            <User size={15} className="text-orange-500" />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-sm">Seleccioná un profesor</p>
            <p className="text-slate-400 text-xs">Para editar su disponibilidad o crear una clase manual</p>
          </div>
        </div>

        {loading ? (
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        ) : activos.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-sm">
            No hay profesores activos en el club.
          </div>
        ) : (
          <div className="relative">
            <select
              value={profesorId}
              onChange={(e) => setProfesorId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition appearance-none bg-white font-medium"
            >
              <option value="">— Seleccioná un profesor —</option>
              {activos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}{p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
      </div>

      {/* Panel principal — solo si hay profesor seleccionado */}
      {profesorSel && (
        <>
          {/* Tabs internos */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {[
              { key: 'disponibilidad', label: 'Disponibilidad semanal', icon: Clock },
              { key: 'clase',          label: 'Nueva clase manual',     icon: Plus },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSeccion(key)}
                className={['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  seccion === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                ].join(' ')}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Panel de disponibilidad */}
          <div className={seccion === 'disponibilidad' ? '' : 'hidden'}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-center shrink-0">
                  <GraduationCap size={16} className="text-brand-500" />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">
                    {profesorSel.nombre} {profesorSel.apellido}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {profesorSel.especialidad || 'Sin especialidad'} ·{' '}
                    {DIAS.filter((d) => profesorSel.disponibilidad?.[d]?.activo).length} día{DIAS.filter((d) => profesorSel.disponibilidad?.[d]?.activo).length !== 1 ? 's' : ''} configurado{DIAS.filter((d) => profesorSel.disponibilidad?.[d]?.activo).length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-xs leading-relaxed">
                Editá los días y horarios del profesor. Si el profesor ya configuró su propia disponibilidad, esta vista la sobreescribe.
              </div>
              <SeccionDisponibilidad
                key={profesorSel.id}
                profesor={profesorSel}
                onSaved={handleDispGuardada}
              />
            </div>
          </div>

          {/* Panel crear clase manual */}
          <div className={seccion === 'clase' ? '' : 'hidden'}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center shrink-0">
                  <CalendarDays size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">Clase para {profesorSel.nombre} {profesorSel.apellido}</p>
                  <p className="text-slate-400 text-xs">El slot quedará reservado en la grilla del club</p>
                </div>
              </div>
              <SeccionCrearClase
                key={profesorSel.id}
                profesor={profesorSel}
                onClaseCreada={onClaseCreada ?? (() => {})}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TabClasesProfesor
