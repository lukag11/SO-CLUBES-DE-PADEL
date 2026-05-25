import { useState, useEffect, useMemo, useCallback } from 'react'
import { GraduationCap, ChevronLeft, ChevronRight, Users, Clock, CalendarDays, BarChart2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useProfesoresStore from '../store/profesoresStore'
import { api } from '../lib/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const toISO = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}

const getMondayISO = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  const dow = d.getDay() // 0=dom
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return toISO(d)
}

const todayISO = () => toISO(new Date())

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const duracionHs = (inicio, fin) => {
  const diff = toMin(fin === '00:00' ? '24:00' : fin) - toMin(inicio)
  return diff > 0 ? diff / 60 : 0
}

const fmtHs = (hs) => {
  if (hs === 0) return '0 h'
  if (hs % 1 === 0) return `${hs} h`
  return `${hs.toFixed(1)} h`
}

const initials = (p) =>
  `${p.nombre?.[0] || ''}${p.apellido?.[0] || ''}`.toUpperCase() || '?'

// ─── Componente tarjeta profesor ─────────────────────────────────────────────

const TarjetaProfesor = ({ profesor, clasesPorDia, semana }) => {
  const totalClases = semana.reduce((acc, dia) => acc + (clasesPorDia[dia] ?? []).length, 0)
  const totalHs = semana.reduce((acc, dia) => {
    return acc + (clasesPorDia[dia] ?? []).reduce((s, c) => s + duracionHs(c.horaInicio, c.horaFin), 0)
  }, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-sm font-black text-orange-500">{initials(profesor)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-slate-800 font-bold text-sm truncate">{profesor.nombre} {profesor.apellido}</p>
          <p className="text-slate-400 text-xs truncate">{profesor.especialidad || 'Profesor'}</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-slate-800 font-black text-lg leading-none">{totalClases}</p>
          <p className="text-slate-400 text-[10px] leading-none mt-0.5">{totalClases === 1 ? 'clase' : 'clases'}</p>
        </div>
      </div>

      {/* Chips días */}
      <div className="grid grid-cols-7 gap-1">
        {semana.map((dia, i) => {
          const cnt = (clasesPorDia[dia] ?? []).length
          const activo = cnt > 0
          const dispDia = DIAS[i]
          const disponible = profesor.disponibilidad?.[dispDia]?.activo
          return (
            <div
              key={dia}
              className={[
                'flex flex-col items-center py-2 rounded-xl border text-center transition-all',
                activo
                  ? 'bg-orange-50 border-orange-200'
                  : disponible
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-50 border-slate-100 opacity-40',
              ].join(' ')}
            >
              <span className={['text-[9px] font-bold uppercase', activo ? 'text-orange-500' : 'text-slate-400'].join(' ')}>
                {DIAS_CORTO[i]}
              </span>
              <span className={['text-sm font-black leading-none mt-0.5', activo ? 'text-orange-600' : 'text-slate-300'].join(' ')}>
                {activo ? cnt : disponible ? '·' : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Horas totales */}
      {totalHs > 0 && (
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Clock size={11} />
          <span>{fmtHs(totalHs)} dictadas esta semana</span>
        </div>
      )}
    </div>
  )
}

// ─── Grilla combinada ─────────────────────────────────────────────────────────

const GrillaCombinada = ({ profesores, clasesSemana, semana }) => {
  if (profesores.length === 0) return null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <BarChart2 size={15} className="text-slate-400" />
        <p className="text-slate-700 font-bold text-sm">Vista combinada — semana completa</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase tracking-widest text-[10px] w-24 shrink-0">
                Día
              </th>
              {profesores.map((p) => (
                <th key={p.id} className="px-3 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-black text-orange-500">{initials(p)}</span>
                    </div>
                    <span className="text-slate-600 font-semibold leading-tight text-[10px]">
                      {p.nombre}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semana.map((dia, i) => {
              const diaNombre = DIAS[i]
              const fecha = new Date(dia + 'T12:00:00')
              const numDia = fecha.getDate()
              return (
                <tr key={dia} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5 shrink-0">
                    <div>
                      <p className="text-slate-700 font-bold">{DIAS_CORTO[i]}</p>
                      <p className="text-slate-400 font-medium">{numDia}</p>
                    </div>
                  </td>
                  {profesores.map((p) => {
                    const clases = (clasesSemana[dia] ?? []).filter(
                      (c) => String(c.profesorId) === String(p.id)
                    )
                    const disponible = p.disponibilidad?.[diaNombre]?.activo
                    if (clases.length === 0) {
                      return (
                        <td key={p.id} className="px-3 py-2.5 text-center">
                          {disponible
                            ? <span className="text-[10px] text-slate-300 font-medium">disponible</span>
                            : <span className="text-[10px] text-slate-200">—</span>
                          }
                        </td>
                      )
                    }
                    return (
                      <td key={p.id} className="px-2 py-1.5">
                        <div className="flex flex-col gap-1">
                          {clases.map((c) => (
                            <div
                              key={c.id}
                              className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 text-center"
                            >
                              <p className="text-orange-600 font-bold text-[10px]">
                                {c.horaInicio}–{c.horaFin}
                              </p>
                              {c.canchaNombre && (
                                <p className="text-orange-400 text-[9px] truncate">{c.canchaNombre}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ClasesProfesorAdminPage = () => {
  const token = useAuthStore((s) => s.token)
  const profesores = useProfesoresStore((s) => s.profesores)
  const setProfesores = useProfesoresStore((s) => s.setProfesores)

  const [mondayISO, setMondayISO] = useState(() => getMondayISO(todayISO()))
  const [clasesSemana, setClasesSemana] = useState({}) // { 'YYYY-MM-DD': reserva[] }
  const [loadingClases, setLoadingClases] = useState(false)

  const semana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i)),
    [mondayISO]
  )

  const hoy = todayISO()
  const fmtRangoSemana = () => {
    const ini = new Date(semana[0] + 'T12:00:00')
    const fin = new Date(semana[6] + 'T12:00:00')
    const opts = { day: 'numeric', month: 'short' }
    return `${ini.toLocaleDateString('es-AR', opts)} — ${fin.toLocaleDateString('es-AR', { ...opts, year: 'numeric' })}`
  }

  // Cargar profesores si no están en el store
  useEffect(() => {
    if (profesores.length > 0 || !token) return
    api.get('/profesores', { Authorization: `Bearer ${token}` })
      .then((data) => { if (Array.isArray(data)) setProfesores(data) })
      .catch(() => {})
  }, [token, profesores.length, setProfesores])

  // Cargar clases de la semana
  const fetchSemana = useCallback(async () => {
    if (!token) return
    setLoadingClases(true)
    try {
      const results = await Promise.allSettled(
        semana.map((d) => api.get(`/reservas?fecha=${d}`, { Authorization: `Bearer ${token}` }))
      )
      const mapa = {}
      semana.forEach((d, i) => {
        const r = results[i]
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          mapa[d] = r.value.filter((res) => res.tipo === 'clase' && res.profesorId)
        } else {
          mapa[d] = []
        }
      })
      setClasesSemana(mapa)
    } finally {
      setLoadingClases(false)
    }
  }, [token, semana])

  useEffect(() => { fetchSemana() }, [mondayISO]) // eslint-disable-line react-hooks/exhaustive-deps

  const activos = profesores.filter((p) => p.activo !== false)

  // Métricas
  const totalClasesSemana = useMemo(
    () => Object.values(clasesSemana).reduce((acc, arr) => acc + arr.length, 0),
    [clasesSemana]
  )
  const profesoresConClases = useMemo(
    () => new Set(Object.values(clasesSemana).flat().map((c) => c.profesorId)).size,
    [clasesSemana]
  )
  const totalHsSemana = useMemo(
    () => Object.values(clasesSemana).flat().reduce((acc, c) => acc + duracionHs(c.horaInicio, c.horaFin), 0),
    [clasesSemana]
  )

  // Índice de clases por día para cada profesor
  const clasesPorProfesorYDia = useMemo(() => {
    const idx = {}
    activos.forEach((p) => {
      idx[p.id] = {}
      semana.forEach((dia) => {
        idx[p.id][dia] = (clasesSemana[dia] ?? []).filter(
          (c) => String(c.profesorId) === String(p.id)
        )
      })
    })
    return idx
  }, [activos, clasesSemana, semana])

  return (
    <div className="flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
            <GraduationCap size={16} className="text-orange-500" />
          </div>
          <h1 className="text-slate-800 font-black text-xl">Clases profesores</h1>
        </div>
        <p className="text-slate-400 text-sm">Disponibilidad y clases programadas por semana</p>
      </div>

      {/* Navegación semanal */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMondayISO((m) => addDays(m, -7))}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-slate-700 font-bold text-sm">{fmtRangoSemana()}</p>
          {semana.includes(hoy) && (
            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wide mt-0.5">Semana actual</p>
          )}
        </div>
        <button
          onClick={() => setMondayISO((m) => addDays(m, 7))}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
        >
          <ChevronRight size={16} />
        </button>
        {!semana.includes(hoy) && (
          <button
            onClick={() => setMondayISO(getMondayISO(hoy))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:border-slate-300 hover:text-slate-700 transition-all"
          >
            Hoy
          </button>
        )}
      </div>

      {/* Métricas resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clases esta semana', value: totalClasesSemana, icon: CalendarDays, color: 'orange' },
          { label: 'Profesores activos', value: `${profesoresConClases} / ${activos.length}`, icon: Users, color: 'brand' },
          { label: 'Horas totales', value: fmtHs(totalHsSemana), icon: Clock, color: 'emerald' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
              color === 'orange' ? 'bg-orange-100' : color === 'emerald' ? 'bg-emerald-100' : 'bg-blue-100'
            }`}>
              <Icon size={15} className={
                color === 'orange' ? 'text-orange-500' : color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'
              } />
            </div>
            <p className="text-slate-800 font-black text-xl leading-none">
              {loadingClases ? <span className="inline-block w-10 h-5 bg-slate-100 rounded animate-pulse" /> : value}
            </p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tarjetas de profesores */}
      {activos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-10 text-center">
          <GraduationCap size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">No hay profesores activos en el club</p>
          <p className="text-slate-400 text-xs mt-1">Creá profesores desde la sección de Jugadores → Profesores</p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Por profesor</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activos.map((p) => (
                <TarjetaProfesor
                  key={p.id}
                  profesor={p}
                  clasesPorDia={clasesPorProfesorYDia[p.id] ?? {}}
                  semana={semana}
                />
              ))}
            </div>
          </div>

          {/* Grilla combinada */}
          <GrillaCombinada
            profesores={activos}
            clasesSemana={clasesSemana}
            semana={semana}
          />
        </>
      )}
    </div>
  )
}

export default ClasesProfesorAdminPage
