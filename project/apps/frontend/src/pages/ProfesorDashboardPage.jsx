import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, GraduationCap, ChevronRight, Zap } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import { api } from '../lib/api'

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_CORTO = { Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue', Viernes: 'Vie', Sábado: 'Sáb', Domingo: 'Dom' }

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

const ProfesorDashboardPage = () => {
  const navigate = useNavigate()
  const { profesor, token } = useAuthProfesorStore()
  const [clases, setClases] = useState([])

  const hoy = todayISO()
  const limiteISO = addDays(hoy, 7)

  useEffect(() => {
    if (!token) return
    api.get('/reservas/profesor/mis-clases', { Authorization: `Bearer ${token}` })
      .then((data) => { if (Array.isArray(data)) setClases(data) })
      .catch(() => {})
  }, [token])

  const clasesProximas = useMemo(
    () => clases
      .filter((r) => r.fecha >= hoy && r.fecha <= limiteISO)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio)),
    [clases, hoy, limiteISO]
  )

  const clasesHoy = clasesProximas.filter((c) => c.fecha === hoy)
  const clasesFuturas = clasesProximas.filter((c) => c.fecha > hoy)

  // Resumen de disponibilidad configurada
  const diasDisponibles = useMemo(() => {
    const disp = profesor?.disponibilidad
    if (!disp) return []
    return DIAS_ORDEN.filter((d) => disp[d]?.activo).map((d) => ({
      dia: d,
      corto: DIAS_CORTO[d],
      apertura: disp[d].apertura,
      cierre: disp[d].cierre,
    }))
  }, [profesor?.disponibilidad])

  const horasSemanales = useMemo(() => {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    return diasDisponibles.reduce((acc, d) => acc + (toMin(d.cierre) - toMin(d.apertura)) / 60, 0)
  }, [diasDisponibles])

  const dispConfigurada = diasDisponibles.length > 0

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-black text-white">
          Hola, {profesor?.nombre}
        </h1>
        <p className="text-white/40 text-sm mt-1 capitalize">{fmtFecha(hoy)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-orange-400/12 rounded-lg flex items-center justify-center">
              <GraduationCap size={14} className="text-orange-400" />
            </div>
            <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Clases hoy</span>
          </div>
          <p className="text-3xl font-black text-white">{clasesHoy.length}</p>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-orange-400/12 rounded-lg flex items-center justify-center">
              <CalendarDays size={14} className="text-orange-400" />
            </div>
            <span className="text-white/40 text-xs font-medium uppercase tracking-wide">Próximos 7 días</span>
          </div>
          <p className="text-3xl font-black text-white">{clasesProximas.length}</p>
        </div>
      </div>

      {/* Clases de hoy */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-orange-400" />
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
              <div key={clase.id} className="flex items-stretch">
                <div className="w-1 shrink-0 bg-gradient-to-b from-orange-400 to-amber-400" />
                <div className="px-5 py-3.5 flex items-center gap-4 flex-1">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-orange-400 font-bold text-sm">{clase.horaInicio}</p>
                    <p className="text-white/30 text-xs">{clase.horaFin}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{clase.notas || 'Clase'}</p>
                    <p className="text-white/40 text-xs">{clase.cancha?.nombre ?? clase.canchaId}</p>
                  </div>
                  <span className="bg-orange-400/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/25 shrink-0">
                    Clase
                  </span>
                </div>
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
                  <p className="text-white/50 text-xs font-medium capitalize">
                    {fmtFecha(clase.fecha).split(',')[0]}
                  </p>
                  <p className="text-white/25 text-xs">{clase.horaInicio} – {clase.horaFin}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{clase.notas || 'Clase'}</p>
                  <p className="text-white/35 text-xs">{clase.cancha?.nombre ?? clase.canchaId}</p>
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
          className="bg-orange-400/10 border border-orange-400/20 rounded-2xl p-5 text-left hover:bg-orange-400/15 transition-all"
        >
          <CalendarDays size={20} className="text-orange-400 mb-3" />
          <p className="text-white font-bold text-sm">Mi agenda</p>
          <p className="text-white/40 text-xs mt-0.5">Crear y gestionar clases</p>
        </button>
        <button
          onClick={() => navigate('/dashboardProfesor/disponibilidad')}
          className={[
            'border rounded-2xl p-5 text-left transition-all',
            dispConfigurada
              ? 'bg-white/4 border-white/8 hover:bg-white/6'
              : 'bg-amber-400/6 border-amber-400/20 hover:bg-amber-400/10',
          ].join(' ')}
        >
          <Clock size={20} className={dispConfigurada ? 'text-white/40 mb-3' : 'text-amber-400 mb-3'} />
          <p className="text-white font-bold text-sm">Mi disponibilidad</p>
          {dispConfigurada ? (
            <p className="text-white/35 text-xs mt-0.5">
              {diasDisponibles.length} día{diasDisponibles.length !== 1 ? 's' : ''} · {horasSemanales % 1 === 0 ? horasSemanales : horasSemanales.toFixed(1)}h/sem
            </p>
          ) : (
            <p className="text-amber-400/70 text-xs mt-0.5">Sin configurar</p>
          )}
        </button>
      </div>

      {/* Resumen de disponibilidad (solo si está configurada) */}
      {dispConfigurada && (
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-400" />
              <span className="text-white font-bold text-sm">Mi horario semanal</span>
            </div>
            <button
              onClick={() => navigate('/dashboardProfesor/disponibilidad')}
              className="text-white/30 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              Editar <ChevronRight size={13} />
            </button>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-2.5">
            {diasDisponibles.map((d) => (
              <div key={d.dia} className="flex items-center justify-between gap-3">
                <span className="text-white/40 text-xs font-medium w-8">{d.corto}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  {(() => {
                    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
                    const left = (toMin(d.apertura) / (24 * 60)) * 100
                    const width = ((toMin(d.cierre) - toMin(d.apertura)) / (24 * 60)) * 100
                    return (
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                        style={{ marginLeft: `${left}%`, width: `${width}%` }}
                      />
                    )
                  })()}
                </div>
                <span className="text-orange-400 text-[10px] font-bold shrink-0">
                  {d.apertura}–{d.cierre}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso si no hay disponibilidad configurada */}
      {!dispConfigurada && (
        <div className="bg-amber-400/5 border border-amber-400/15 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white/70 text-sm font-medium">Configurá tu disponibilidad</p>
            <p className="text-white/35 text-xs mt-0.5 leading-relaxed">
              Todavía no definiste tus días y horarios de trabajo. Sin disponibilidad configurada, tu agenda mostrará todos los slots del horario del club.
            </p>
            <button
              onClick={() => navigate('/dashboardProfesor/disponibilidad')}
              className="mt-2.5 text-amber-400 text-xs hover:underline"
            >
              Configurar ahora →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfesorDashboardPage
