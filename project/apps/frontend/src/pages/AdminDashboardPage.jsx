import {
  CalendarDays,
  Users,
  Trophy,
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react'

const stats = [
  {
    label: 'Canchas disponibles',
    value: '4 / 6',
    sub: '2 ocupadas ahora',
    icon: Activity,
    color: 'text-brand-500',
    bg: 'bg-brand-500/10',
  },
  {
    label: 'Reservas del día',
    value: '18',
    sub: '+3 vs ayer',
    icon: CalendarDays,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Jugadores activos',
    value: '124',
    sub: '8 nuevos este mes',
    icon: Users,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    label: 'Organización de Torneo',
    value: '2 activos',
    sub: 'Próximo: 12 abr',
    icon: Trophy,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    label: 'Ingresos del día',
    value: '$48.000',
    sub: '+12% vs ayer',
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Ingresos del mes',
    value: '$1.240.000',
    sub: '+8% vs mes anterior',
    icon: TrendingUp,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

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
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">

      {/* Encabezado */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Resumen del club</h2>
        <p className="text-sm text-slate-400 mt-1 capitalize">{today}</p>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Actividad reciente</h3>
        <div className="flex flex-col gap-3">
          {[
            { text: 'Reserva #218 — Cancha 3 — 18:00 hs', time: 'hace 5 min' },
            { text: 'Nuevo jugador registrado: Lucas Romero', time: 'hace 12 min' },
            { text: 'Pago recibido: $12.000 — Turno tarde', time: 'hace 28 min' },
            { text: 'Torneo "Copa Verano" — inscripción abierta', time: 'hace 1 h' },
          ].map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
              <p className="text-sm text-slate-600 min-w-0 break-words">{item.text}</p>
              <span className="text-xs text-slate-400 shrink-0 mt-0.5">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
