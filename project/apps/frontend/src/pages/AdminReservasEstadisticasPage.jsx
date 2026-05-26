import { useState, useEffect, useMemo } from 'react'
import {
  BarChart2, CalendarDays, TrendingUp, Users, GraduationCap,
  Repeat, XCircle, DollarSign, Loader2,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

// 0=Dom, 1=Lun … 6=Sáb  →  mostrar Lun primero
const DIAS_JS   = [0, 1, 2, 3, 4, 5, 6]
const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0]
const DIAS_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// ─── Barra horizontal reutilizable ───────────────────────────────────────────

const Barra = ({ pct, color = 'bg-brand-400' }) => (
  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReservasEstadisticasPage() {
  const token = useAuthStore((s) => s.token)
  const [periodo, setPeriodo] = useState('semana')
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(false)
    api.get(`/reservas/admin/stats?periodo=${periodo}`, { Authorization: `Bearer ${token}` })
      .then((d) => { setDatos(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [token, periodo])

  // Heatmap: mapa {dia → {hora → count}}
  const heatmapGrid = useMemo(() => {
    const grid = {}
    DIAS_JS.forEach((d) => { grid[d] = {} })
    datos?.heatmap?.forEach(({ dia, hora, count }) => { grid[dia][hora] = count })
    return grid
  }, [datos?.heatmap])

  const horasHeatmap = useMemo(() => {
    if (!datos?.heatmap?.length) return []
    return [...new Set(datos.heatmap.map((h) => h.hora))].sort()
  }, [datos?.heatmap])

  const maxHeatmap = useMemo(
    () => Math.max(1, ...(datos?.heatmap?.map((h) => h.count) ?? [1])),
    [datos?.heatmap]
  )

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={24} className="animate-spin text-slate-300" />
    </div>
  )

  if (error) return (
    <div className="text-slate-400 text-sm py-16 text-center">
      No se pudo cargar las estadísticas. Verificá la conexión.
    </div>
  )

  const { totales, porCancha, cancelacionesPorFranja } = datos
  const maxCancha = Math.max(1, ...(porCancha?.map((c) => c.count) ?? [1]))
  const maxCancel = Math.max(1, ...(cancelacionesPorFranja?.map((c) => c.count) ?? [1]))

  const metricCards = [
    { label: 'Total reservas',  value: totales.total,          Icon: CalendarDays,  color: 'text-brand-600',  bg: 'bg-brand-50   border-brand-100'  },
    { label: 'Eventuales',      value: totales.eventuales,     Icon: Users,         color: 'text-sky-600',    bg: 'bg-sky-50     border-sky-100'    },
    { label: 'Turnos fijos',    value: totales.turnosFijos,    Icon: Repeat,        color: 'text-violet-600', bg: 'bg-violet-50  border-violet-100' },
    { label: 'Clases profesor', value: totales.clases,         Icon: GraduationCap, color: 'text-orange-500', bg: 'bg-orange-50  border-orange-100' },
    { label: 'Canceladas',      value: totales.canceladas,     Icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50     border-red-100'    },
    { label: 'Ingresos est.',   value: `$${totales.ingresos.toLocaleString('es-AR')}`, Icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  ]

  const distBarras = [
    { label: 'Eventuales',      count: totales.eventuales,  color: 'bg-sky-400'    },
    { label: 'Turnos fijos',    count: totales.turnosFijos, color: 'bg-violet-400' },
    { label: 'Clases profesor', count: totales.clases,      color: 'bg-orange-400' },
  ]

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Selector de período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Estadísticas de reservas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {periodo === 'semana' ? 'Últimos 7 días' : 'Últimos 30 días'} · desde {datos.desde}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[{ key: 'semana', label: '7 días' }, { key: 'mes', label: '30 días' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                periodo === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bloque 1: Métricas clave ─────────────────────────────────────── */}
      {/* 6 tarjetas: total, eventuales, turnos fijos, clases, canceladas, ingresos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metricCards.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 flex items-start gap-3 ${bg}`}>
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-slate-400 text-[11px] font-medium leading-none mb-1">{label}</p>
              <p className={`text-2xl font-black leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bloque 2: Distribución por tipo ─────────────────────────────── */}
      {/* Muestra qué proporción de las reservas corresponde a cada tipo */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          Distribución por tipo
        </h2>
        {totales.total === 0 ? (
          <p className="text-slate-300 text-sm text-center py-4">Sin reservas en el período</p>
        ) : (
          <div className="flex flex-col gap-3">
            {distBarras.map(({ label, count, color }) => {
              const pct = totales.total ? Math.round((count / totales.total) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-600 text-xs font-semibold">{label}</span>
                    <span className="text-slate-400 text-xs">{count} · {pct}%</span>
                  </div>
                  <Barra pct={pct} color={color} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bloque 3: Heatmap días × horas ───────────────────────────────── */}
      {/*
        Cada celda representa cuántas reservas hubo en ese día/horario durante el período.
        Verde oscuro = slot muy demandado. Gris = libre.
        Permite identificar franjas recurrentemente vacías para armar promociones.
      */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
          <CalendarDays size={14} className="text-slate-400" />
          Ocupación por día y horario
        </h2>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          Verde oscuro = más demanda. Celdas grises = franjas siempre libres — oportunidad para promociones.
        </p>
        {horasHeatmap.length === 0 ? (
          <p className="text-slate-300 text-sm text-center py-4">Sin datos para el período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[11px] border-separate border-spacing-1 min-w-[420px]">
              <thead>
                <tr>
                  <th className="w-12" />
                  {DIAS_ORDEN.map((d) => (
                    <th key={d} className="text-slate-400 font-bold pb-1">{DIAS_LABEL[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horasHeatmap.map((hora) => (
                  <tr key={hora}>
                    <td className="text-slate-300 font-mono text-[10px] text-right pr-2">{hora}</td>
                    {DIAS_ORDEN.map((d) => {
                      const count = heatmapGrid[d]?.[hora] ?? 0
                      const intensity = count / maxHeatmap
                      const bg =
                        count === 0     ? 'bg-slate-50'
                        : intensity < 0.25 ? 'bg-emerald-100'
                        : intensity < 0.5  ? 'bg-emerald-300'
                        : intensity < 0.75 ? 'bg-emerald-500'
                        :                   'bg-emerald-700'
                      const textCls = intensity >= 0.5 ? 'text-white' : count > 0 ? 'text-emerald-800' : 'text-slate-200'
                      return (
                        <td key={d} title={`${DIAS_LABEL[d]} ${hora}: ${count} reserva${count !== 1 ? 's' : ''}`}>
                          <div className={`rounded-lg h-7 flex items-center justify-center font-bold text-[10px] ${bg} ${textCls}`}>
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bloque 4: Rendimiento por cancha ─────────────────────────────── */}
      {/* Qué cancha concentra más reservas. La barra más larga = más demandada. */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart2 size={14} className="text-slate-400" />
          Rendimiento por cancha
        </h2>
        {porCancha.length === 0 ? (
          <p className="text-slate-300 text-sm text-center py-4">Sin datos</p>
        ) : (
          <div className="flex flex-col gap-3">
            {porCancha.map(({ nombre, count }) => {
              const pct = Math.round((count / maxCancha) * 100)
              return (
                <div key={nombre}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-700 text-sm font-semibold">{nombre}</span>
                    <span className="text-slate-400 text-xs">{count} reserva{count !== 1 ? 's' : ''}</span>
                  </div>
                  <Barra pct={pct} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bloque 5: Cancelaciones por franja ───────────────────────────── */}
      {/*
        Muestra en qué horarios se cancelan más reservas.
        Útil para ajustar la política de cancelación o activar depósitos en horas problemáticas.
      */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
          <XCircle size={14} className="text-red-400" />
          Cancelaciones por franja horaria
        </h2>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          Las franjas con más cancelaciones son candidatas para exigir depósito o acortar el plazo gratuito.
        </p>
        {cancelacionesPorFranja.length === 0 ? (
          <p className="text-slate-300 text-sm text-center py-4">Sin cancelaciones en el período</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cancelacionesPorFranja.map(({ hora, count }) => (
              <div key={hora} className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-xs w-12 shrink-0">{hora}</span>
                <Barra pct={Math.round((count / maxCancel) * 100)} color="bg-red-400" />
                <span className="text-slate-400 text-xs w-5 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
