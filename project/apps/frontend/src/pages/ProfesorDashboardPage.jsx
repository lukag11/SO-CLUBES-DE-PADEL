import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useReservasAdminStore from '../store/reservasAdminStore'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const ProfesorDashboardPage = () => {
  const navigate = useNavigate()
  const { profesor } = useAuthProfesorStore()
  const reservas = useReservasAdminStore((s) => s.reservas)

  const hoy = todayISO()

  // Clases del profesor para hoy y los próximos 7 días
  const misClases = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() + 7)
    const limiteISO = limite.toISOString().slice(0, 10)

    return reservas
      .filter(
        (r) =>
          r.tipo === 'clase' &&
          r.profesorId === profesor?.id &&
          r.fecha >= hoy &&
          r.fecha <= limiteISO
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio))
  }, [reservas, profesor, hoy])

  const clasesHoy = misClases.filter((c) => c.fecha === hoy)
  const clasesFuturas = misClases.filter((c) => c.fecha > hoy)

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-black text-white">
          Hola, {profesor?.nombre} 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">{fmtFecha(hoy)}</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={16} className="text-orange-400" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Clases hoy</span>
          </div>
          <p className="text-3xl font-black text-white">{clasesHoy.length}</p>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={16} className="text-orange-400" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Próximos 7 días</span>
          </div>
          <p className="text-3xl font-black text-white">{misClases.length}</p>
        </div>
      </div>

      {/* Clases de hoy */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-orange-400" />
            <span className="text-white font-bold text-sm">Clases de hoy</span>
          </div>
          <button
            onClick={() => navigate('/dashboardProfesor/agenda')}
            className="text-white/30 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            Ver agenda <ChevronRight size={13} />
          </button>
        </div>

        {clasesHoy.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-white/30 text-sm">No tenés clases programadas para hoy</p>
            <button
              onClick={() => navigate('/dashboardProfesor/agenda')}
              className="mt-3 text-orange-400 text-xs hover:underline"
            >
              Crear una clase
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {clasesHoy.map((clase) => (
              <div key={clase.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="text-center shrink-0 w-16">
                  <p className="text-orange-400 font-bold text-sm">{clase.inicio}</p>
                  <p className="text-white/30 text-xs">{clase.fin}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{clase.nota || 'Clase'}</p>
                  <p className="text-white/40 text-xs">{clase.canchaNombre || `Cancha ${clase.canchaId}`}</p>
                </div>
                <span className="bg-orange-400/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/25">
                  Clase
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas clases */}
      {clasesFuturas.length > 0 && (
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <span className="text-white font-bold text-sm">Próximas clases</span>
          </div>
          <div className="divide-y divide-white/5">
            {clasesFuturas.slice(0, 5).map((clase) => (
              <div key={clase.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="shrink-0 w-24">
                  <p className="text-white/60 text-xs font-medium capitalize">
                    {fmtFecha(clase.fecha).split(',')[0]}
                  </p>
                  <p className="text-white/30 text-xs">{clase.inicio} – {clase.fin}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{clase.nota || 'Clase'}</p>
                  <p className="text-white/40 text-xs">{clase.canchaNombre || `Cancha ${clase.canchaId}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/dashboardProfesor/agenda')}
          className="bg-orange-400/10 border border-orange-400/20 rounded-2xl p-5 text-left hover:bg-orange-400/15 transition-all group"
        >
          <CalendarDays size={20} className="text-orange-400 mb-3" />
          <p className="text-white font-bold text-sm">Mi agenda</p>
          <p className="text-white/40 text-xs mt-0.5">Crear y gestionar clases</p>
        </button>
        <button
          onClick={() => navigate('/dashboardProfesor/disponibilidad')}
          className="bg-white/4 border border-white/8 rounded-2xl p-5 text-left hover:bg-white/6 transition-all group"
        >
          <Clock size={20} className="text-white/40 mb-3 group-hover:text-white/60 transition-colors" />
          <p className="text-white font-bold text-sm">Mi disponibilidad</p>
          <p className="text-white/40 text-xs mt-0.5">Marcar días u horarios libres</p>
        </button>
      </div>
    </div>
  )
}

export default ProfesorDashboardPage
