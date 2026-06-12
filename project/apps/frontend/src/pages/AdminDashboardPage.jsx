import { useState, useEffect } from 'react'
import {
  CalendarDays, Users, Trophy, TrendingUp, DollarSign, Activity, Wallet,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

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

const StatCard = ({ label, value, sub, icon: Icon, color, bg }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex items-start gap-3 md:gap-4 hover:shadow-md transition-shadow duration-200">
    <div className={`${bg} rounded-xl p-2.5 md:p-3 shrink-0`}>
      <Icon size={20} className={color} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5 leading-tight truncate">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  </div>
)

const DashboardPage = () => {
  const token = useAuthStore((s) => s.token)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    if (!token) return
    api.get('/clubs/me/dashboard', { Authorization: `Bearer ${token}` })
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const stats = [
    { label: 'Canchas en uso', value: data ? `${data.ocupadasAhora}/${data.canchasActivas}` : '—', sub: 'ocupadas ahora', icon: Activity, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'Reservas de hoy', value: data?.reservasHoy ?? '—', sub: 'confirmadas', icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Jugadores activos', value: data?.jugadoresActivos ?? '—', sub: 'en el club', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Torneos activos', value: data?.torneosActivos ?? '—', sub: 'en curso o abiertos', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Ingresos del día', value: money(data?.ingresosDia), sub: 'cobrado hoy', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Ingresos del mes', value: money(data?.ingresosMes), sub: 'cobrado este mes', icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Resumen del club</h2>
          <p className="text-sm text-slate-400 mt-1 capitalize">{today}</p>
        </div>
        {data?.deudaPendiente > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2">
            <Wallet size={15} className="text-amber-500" />
            <span className="text-sm text-amber-700 font-medium">{money(data.deudaPendiente)} por cobrar</span>
          </div>
        )}
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 h-24 animate-pulse" />)
          : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Actividad reciente</h3>
        {loading ? (
          <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-5 bg-slate-50 rounded animate-pulse" />)}</div>
        ) : !data?.actividad?.length ? (
          <p className="text-sm text-slate-400">Sin actividad reciente todavía.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.actividad.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                <p className="text-sm text-slate-600 min-w-0 break-words">{item.text}</p>
                <span className="text-xs text-slate-400 shrink-0 mt-0.5">{hace(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
