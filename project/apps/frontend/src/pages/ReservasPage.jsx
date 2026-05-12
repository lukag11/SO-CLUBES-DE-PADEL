import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Save, Check,
  CalendarDays, DollarSign, Lock, Repeat, Clock,
  Users, AlertCircle, CheckCircle, Ban, Pencil, Bell, GraduationCap, Trash2, XCircle, MapPin,
} from 'lucide-react'
import {
  FRANJAS,
  RAZONES_BLOQUEO, METODOS_PAGO, CLASES_PROFESOR, DIAS_SEMANA_OPCIONES,
} from '../features/admin/reservasMockData'
import useNotificacionesStore from '../store/notificacionesStore'
import useReservasStore from '../store/reservasStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import useProfesoresStore from '../store/profesoresStore'
import useAuthStore from '../store/authStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'
import { overlaps, toMin, toTime } from '../utils/timeUtils'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatPrice = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// Busca si hay reserva para cancha+franja usando overlap cross-midnight aware.
const getReserva = (reservas, canchaId, franja) =>
  reservas.find((r) =>
    r.canchaId === canchaId &&
    overlaps(r.inicio, r.fin, franja.inicio, franja.fin)
  ) || null

// Hora actual HH:MM para marcar franjas pasadas
const horaActual = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const esPasado = (fecha, fin) => {
  const hoy = todayISO()
  if (fecha < hoy) return true
  if (fecha > hoy) return false
  return toMin(fin) <= toMin(horaActual())
}

// Devuelve el día de semana de una fecha ISO en formato normalizado ('lunes', 'miercoles', etc.)
const getDiaSemana = (iso) => {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[new Date(iso + 'T12:00:00').getDay()]
}

const TIPO_CONFIG = {
  fijo:          { label: 'Fijo',           dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200'  },
  eventual:      { label: 'Eventual',       dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200'        },
  bloqueado:     { label: 'Bloqueado',      dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500 border-slate-200'    },
  clase:         { label: 'Clase',          dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200'  },
  online:        { label: 'Online',         dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  solicitud_fijo:{ label: 'Solicitud fijo', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200'     },
}

const PAGO_CONFIG = {
  pagado:   { label: 'Pagado',   cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  pendiente:{ label: 'Pendiente',cls: 'text-amber-600  bg-amber-50  border-amber-200'  },
  debe:     { label: 'Debe',     cls: 'text-red-600    bg-red-50    border-red-200'    },
}

const ESTADO_CONFIG = {
  confirmada: { label: 'Confirmada', cls: 'text-emerald-600' },
  pendiente:  { label: 'Pendiente',  cls: 'text-amber-600'  },
  cancelada:  { label: 'Cancelada',  cls: 'text-red-500'    },
}

const DIAS_SEMANA_GRILLA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Genera slots de 1.5h desde apertura hasta cierre. Cross-midnight aware.
const generateFranjas = (horarioDia) => {
  if (!horarioDia?.activo) return []
  const apMin = toMin(horarioDia.apertura || '08:00')
  const ciStr = horarioDia.cierre || '23:00'
  const ciMin = ciStr === '00:00' ? 1440 : toMin(ciStr)
  const ciAdj = ciMin <= apMin ? ciMin + 1440 : ciMin
  const franjas = []
  let cur = ciAdj - 90
  while (cur >= apMin) {
    franjas.unshift({ inicio: toTime(cur % 1440), fin: toTime((cur + 90) % 1440) })
    cur -= 90
  }
  return franjas
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────

const Badge = ({ label, cls }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
    {label}
  </span>
)

const FieldLabel = ({ children }) => (
  <label className="block text-slate-500 text-xs font-medium mb-1.5">{children}</label>
)

const Input = ({ label, ...props }) => (
  <div>
    {label && <FieldLabel>{label}</FieldLabel>}
    <input
      {...props}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300"
    />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <FieldLabel>{label}</FieldLabel>}
    <select
      {...props}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 appearance-none bg-white transition-all"
    >
      {children}
    </select>
  </div>
)

// ─── Stats bar ────────────────────────────────────────────────────────────────

const StatsBar = ({ reservasDia, clasesDia, totalTurnosFijos, canchasCount, franjasCount = FRANJAS.length }) => {
  const total = (canchasCount || 4) * franjasCount

  // Turnos ocupados: slots únicos de reservas + clases (bloqueados también ocupan)
  const ocupadosSet = new Set([
    ...reservasDia.map((r) => `${r.canchaId}-${r.inicio}`),
    ...(clasesDia || []).map((c) => `${c.canchaId}-${c.inicio}`),
  ])
  const ocupados = ocupadosSet.size

  // Solo tipos con valor económico para los cálculos de cobro
  const conPago = reservasDia.filter((r) => r.tipo !== 'bloqueado' && r.tipo !== 'clase')
  const ingresados = conPago.filter((r) => r.pago === 'pagado').reduce((s, r) => s + (r.monto || 0), 0)
  const pendientes = conPago.filter((r) => r.pago === 'pendiente').reduce((s, r) => s + (r.monto || 0), 0)

  // Turnos fijos: total de activos para el día de semana (sin descontar ausencias puntuales)
  const fijos = totalTurnosFijos + (clasesDia?.length || 0)

  const stats = [
    { label: 'Turnos ocupados', value: `${ocupados} / ${total}`, icon: CalendarDays, color: 'text-blue-500',    bg: 'bg-blue-50'    },
    { label: 'Cobrado',         value: formatPrice(ingresados),   icon: CheckCircle,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Por cobrar',      value: formatPrice(pendientes),   icon: DollarSign,   color: 'text-amber-500',   bg: 'bg-amber-50'   },
    { label: 'Turnos fijos',    value: fijos,                     icon: Repeat,       color: 'text-violet-500',  bg: 'bg-violet-50'  },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 md:gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm px-2 py-2 md:px-4 md:py-3.5 flex items-center gap-2 md:gap-2.5">
          <div className={`${bg} p-1.5 md:p-2.5 rounded-lg md:rounded-xl shrink-0`}>
            <Icon size={13} className={color} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-tight truncate">{label}</p>
            <p className="text-xs md:text-lg font-bold text-slate-800 leading-tight truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Celda de la grilla ───────────────────────────────────────────────────────

const Celda = ({ reserva, franja, cancha, fecha, onClick }) => {
  const pasado = esPasado(fecha, franja.fin)

  if (!reserva) {
    return (
      <td
        onClick={() => !pasado && onClick({ tipo: 'libre', franja, cancha })}
        className={[
          'border border-slate-100 transition-colors',
          pasado
            ? 'bg-slate-50/60 cursor-not-allowed'
            : 'hover:bg-emerald-50/60 cursor-pointer group',
        ].join(' ')}
      >
        <div className="h-14 flex items-center justify-center">
          {!pasado && (
            <Plus size={14} className="text-slate-200 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>
      </td>
    )
  }

  // Bloqueo, Clase, Online, Solicitud fijo — rowspan
  if (reserva.tipo === 'bloqueado' || reserva.tipo === 'clase' || reserva.tipo === 'online' || reserva.tipo === 'solicitud_fijo') {
    // Primera franja que overlappea con esta reserva (donde se renderiza)
    const primeraFranja = FRANJAS.find((f) => overlaps(reserva.inicio, reserva.fin, f.inicio, f.fin))
    if (!primeraFranja || primeraFranja.inicio !== franja.inicio) return null
    const franjasCubiertas = Math.max(1, FRANJAS.filter(
      (f) => overlaps(reserva.inicio, reserva.fin, f.inicio, f.fin)
    ).length)

    const esClase = reserva.tipo === 'clase'
    const esOnline = reserva.tipo === 'online'
    const esSolicitudFijo = reserva.tipo === 'solicitud_fijo'
    const esClaseProfesor = esClase && reserva.creadoPor === 'profesor'
    const esNoDisponibilidadProfesor = reserva.tipo === 'bloqueado' && reserva.creadoPor === 'profesor'

    return (
      <td
        rowSpan={franjasCubiertas}
        onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
        className={[
          'border border-slate-100 align-top transition-colors cursor-pointer',
          esClase ? 'bg-orange-50/70 hover:bg-orange-100/60'
          : esNoDisponibilidadProfesor ? 'bg-red-50/60 hover:bg-red-100/50'
          : esOnline ? 'bg-emerald-50/60 hover:bg-emerald-100/50'
          : esSolicitudFijo ? 'bg-amber-50/60 hover:bg-amber-100/50'
          : 'bg-slate-100 hover:bg-slate-200/60',
        ].join(' ')}
      >
        <div className="h-full min-h-14 p-2 flex flex-col gap-1">
          {esClase ? (
            <>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={11} className="text-orange-400 shrink-0" />
                <span className="text-orange-600 text-xs font-semibold truncate">Clase</span>
                {esClaseProfesor && (
                  <span className="text-[9px] bg-orange-100 text-orange-500 font-bold px-1 py-0.5 rounded leading-none shrink-0">Prof</span>
                )}
              </div>
              <p className="text-orange-500 text-xs leading-snug truncate">
                {esClaseProfesor ? reserva.profesorNombre : (reserva.profesor || reserva.nota || '')}
              </p>
            </>
          ) : esNoDisponibilidadProfesor ? (
            <>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={11} className="text-red-400 shrink-0" />
                <span className="text-red-600 text-xs font-semibold truncate">No disponible</span>
              </div>
              <p className="text-red-400 text-[10px] leading-snug truncate">{reserva.profesorNombre}</p>
            </>
          ) : esOnline ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-700 text-xs font-semibold truncate">Online</span>
              </div>
              <p className="text-emerald-600 text-[10px] font-medium leading-snug">
                ${Number(reserva.monto).toLocaleString('es-AR')}
              </p>
            </>
          ) : esSolicitudFijo ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-amber-700 text-xs font-semibold truncate">Solicitud fijo</span>
              </div>
              <p className="text-amber-600 text-[10px] leading-snug">Pendiente aprobación</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Lock size={11} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 text-xs font-semibold truncate">Bloqueado</span>
              </div>
              <p className="text-slate-400 text-xs leading-snug line-clamp-2">{reserva.notas}</p>
            </>
          )}
        </div>
      </td>
    )
  }

  const tipoCfg = TIPO_CONFIG[reserva.tipo]
  const pagoCfg = PAGO_CONFIG[reserva.pago]

  return (
    <td
      onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
      className={[
        'border border-slate-100 cursor-pointer transition-all align-top',
        reserva.tipo === 'fijo'
          ? 'bg-violet-50/60 hover:bg-violet-100/60'
          : 'bg-blue-50/40 hover:bg-blue-100/40',
        reserva.estado === 'pendiente' ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="h-14 p-2 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tipoCfg.dot}`} />
          <span className="text-slate-700 text-xs font-semibold truncate leading-tight">
            {reserva.jugadores[0]}
          </span>
          {reserva.tipo === 'fijo' && (
            <Repeat size={10} className="text-violet-400 shrink-0 ml-auto" />
          )}
        </div>
        <div className="flex items-center gap-1 mt-auto">
          {pagoCfg && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${pagoCfg.cls}`}>
              {pagoCfg.label}
            </span>
          )}
          {reserva.estado === 'pendiente' && (
            <AlertCircle size={10} className="text-amber-500 ml-auto shrink-0" />
          )}
        </div>
      </div>
    </td>
  )
}

// ─── Grilla ───────────────────────────────────────────────────────────────────

const Grilla = ({ reservas, clasesDia, fecha, onCeldaClick, canchas = [], franjas = FRANJAS }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-28 shrink-0">Horario</th>
            {canchas.map((c) => (
              <th key={c.id} className="px-3 py-3 text-slate-600 font-semibold text-xs text-center">
                <span>{c.nombre}</span>
                <span className="block text-slate-400 font-normal text-[10px] mt-0.5">
                  {c.tipo} · {c.indoor ? 'Indoor' : 'Outdoor'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {franjas.map((franja) => {
            const pasado = esPasado(fecha, franja.fin)
            return (
              <tr key={franja.inicio} className={pasado ? 'opacity-50' : ''}>
                <td className="px-4 py-0 border border-slate-100 bg-slate-50/50 whitespace-nowrap">
                  <span className="text-slate-500 text-xs font-mono">{franja.inicio}</span>
                  <span className="text-slate-300 text-xs mx-0.5">–</span>
                  <span className="text-slate-400 text-xs font-mono">{franja.fin}</span>
                </td>
                {canchas.map((cancha) => {
                  // Clases del profesor tienen prioridad sobre reservas libres
                  const clase = getReserva(clasesDia, cancha.id, franja)
                  const reserva = clase || getReserva(reservas, cancha.id, franja)
                  // Celdas cubiertas por rowspan de bloqueo o clase
                  if (
                    (reserva?.tipo === 'bloqueado' || reserva?.tipo === 'clase') &&
                    reserva.inicio !== franja.inicio
                  ) {
                    return null
                  }
                  return (
                    <Celda
                      key={cancha.id}
                      reserva={reserva}
                      franja={franja}
                      cancha={cancha}
                      fecha={fecha}
                      onClick={onCeldaClick}
                    />
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

// ─── Grilla mobile (2 canchas por página) ────────────────────────────────────

const CeldaMobile = ({ reserva, franja, cancha, onClick, pasado }) => {
  if (!reserva) {
    return (
      <div
        onClick={() => !pasado && onClick({ tipo: 'libre', franja, cancha })}
        className={[
          'flex-1 border-l border-slate-100 flex items-center justify-center min-h-[44px] transition-colors',
          pasado ? 'bg-slate-50/60 cursor-not-allowed' : 'hover:bg-emerald-50/60 cursor-pointer group',
        ].join(' ')}
      >
        {!pasado && <Plus size={11} className="text-slate-200 group-hover:text-emerald-400 transition-colors" />}
      </div>
    )
  }

  const cfgMap = {
    clase:         { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-400',  label: 'Clase'     },
    bloqueado:     { bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400',   label: 'Bloq.'     },
    online:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Online'    },
    solicitud_fijo:{ bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Solicitud' },
    fijo:          { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Fijo'      },
    eventual:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Eventual'  },
  }
  const cfg = cfgMap[reserva.tipo] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: reserva.tipo }
  const pagoCfg = reserva.pago ? PAGO_CONFIG[reserva.pago] : null

  return (
    <div
      onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
      className={`flex-1 border-l border-slate-100 cursor-pointer min-h-[44px] p-1.5 flex flex-col gap-0.5 ${cfg.bg} hover:brightness-95 transition-all`}
    >
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-[10px] font-semibold truncate ${cfg.text}`}>{cfg.label}</span>
      </div>
      {reserva.jugadores?.[0] && (
        <span className="text-[9px] text-slate-500 truncate leading-none">{reserva.jugadores[0]}</span>
      )}
      {pagoCfg && (
        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full border ${pagoCfg.cls} self-start leading-none mt-auto`}>
          {pagoCfg.label}
        </span>
      )}
    </div>
  )
}

const GrillaMobile = ({ reservas, clasesDia, fecha, onCeldaClick, canchas = [], franjas = FRANJAS }) => {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(canchas.length / 2)
  const canchasVisible = canchas.slice(page * 2, page * 2 + 2)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-all"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-slate-500 font-medium">
            {canchasVisible.map((c) => c.nombre).join(' · ')}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-25 transition-all"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Header canchas */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <div className="w-14 shrink-0 px-2 py-2" />
        {canchasVisible.map((c) => (
          <div key={c.id} className="flex-1 px-1 py-2 text-center border-l border-slate-100">
            <p className="text-slate-700 font-semibold text-xs">{c.nombre}</p>
            <p className="text-slate-400 text-[9px]">{c.tipo} · {c.indoor ? 'In' : 'Out'}</p>
          </div>
        ))}
      </div>

      {/* Filas por franja */}
      {franjas.map((franja) => {
        const pasado = esPasado(fecha, franja.fin)
        return (
          <div key={franja.inicio} className={`flex border-b border-slate-50 last:border-0 ${pasado ? 'opacity-50' : ''}`}>
            <div className="w-14 shrink-0 px-2 py-1.5 bg-slate-50/50 flex flex-col justify-center border-r border-slate-100">
              <span className="text-slate-500 text-[10px] font-mono leading-none">{franja.inicio}</span>
              <span className="text-slate-300 text-[9px] font-mono leading-none mt-0.5">{franja.fin}</span>
            </div>
            {canchasVisible.map((cancha) => {
              const clase = getReserva(clasesDia, cancha.id, franja)
              const reserva = clase || getReserva(reservas, cancha.id, franja)
              return (
                <CeldaMobile
                  key={cancha.id}
                  reserva={reserva}
                  franja={franja}
                  cancha={cancha}
                  fecha={fecha}
                  onClick={onCeldaClick}
                  pasado={pasado}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── Sub-grilla para cancha con horario propio ───────────────────────────────

const GrillaConHorarioPropio = ({ cancha, franjas, reservas, clasesDia, fecha, onCeldaClick }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-slate-700">{cancha.nombre}</span>
      <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Horario propio</span>
      {!cancha.activa && (
        <span className="text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Inactiva</span>
      )}
      {franjas.length > 0 && (
        <span className="text-xs text-slate-400">
          {franjas[0].inicio}–{franjas[franjas.length - 1].fin} · {franjas.length} turno{franjas.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
    {franjas.length === 0 ? (
      <div className="bg-white border border-slate-100 rounded-2xl px-4 py-6 text-center text-sm text-slate-400">
        Día cerrado según el horario propio de esta cancha
      </div>
    ) : (
      <>
        <div className="md:hidden">
          <GrillaMobile reservas={reservas} clasesDia={clasesDia} fecha={fecha} onCeldaClick={onCeldaClick} canchas={[cancha]} franjas={franjas} />
        </div>
        <div className="hidden md:block">
          <Grilla reservas={reservas} clasesDia={clasesDia} fecha={fecha} onCeldaClick={onCeldaClick} canchas={[cancha]} franjas={franjas} />
        </div>
      </>
    )}
  </div>
)

// ─── Panel lateral — Formulario nueva reserva ─────────────────────────────────

const FormNuevaReserva = ({ franja, cancha, onSave, onCancel }) => {
  const todosLosProfesores = useProfesoresStore((s) => s.profesores)
  const profesoresActivos = todosLosProfesores.filter((p) => p.activo)
  const [form, setForm] = useState({
    tipo: 'eventual',
    jugadores: ['', '', '', ''],
    pago: 'pendiente',
    metodoPago: 'Efectivo',
    monto: 12000,
    notas: '',
    recurrenciaHasta: '',
    profesorId: '',
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setJugador = (i, v) => {
    const arr = [...form.jugadores]
    arr[i] = v
    setForm((p) => ({ ...p, jugadores: arr }))
  }

  const handleSave = () => {
    const esClase = form.tipo === 'clase'
    const jugadores = form.jugadores.filter(Boolean)
    if (!esClase && !jugadores.length) return

    const profesor = form.profesorId
      ? profesoresActivos.find((p) => p.id === Number(form.profesorId))
      : null

    onSave({
      canchaId: cancha.id,
      canchaNombre: cancha.nombre,
      inicio: franja.inicio,
      fin: franja.fin,
      tipo: esClase ? 'clase' : form.tipo,
      recurrencia: form.tipo === 'fijo' && form.recurrenciaHasta
        ? { dia: new Date().toLocaleDateString('es-AR', { weekday: 'long' }), hasta: form.recurrenciaHasta }
        : null,
      jugadores: esClase ? [] : jugadores,
      estado: 'confirmada',
      pago: esClase ? null : form.pago,
      monto: esClase ? 0 : Number(form.monto),
      notas: form.notas,
      // Datos de clase
      ...(esClase && {
        creadoPor: 'admin',
        profesorId: profesor?.id ?? null,
        profesorNombre: profesor ? `${profesor.nombre} ${profesor.apellido}` : null,
        nota: form.notas,
      }),
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Nueva reserva</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {cancha.nombre} · {franja.inicio}–{franja.fin}
          </p>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Tipo */}
        <div>
          <FieldLabel>Tipo de reserva</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'eventual',  label: 'Eventual',   icon: CalendarDays  },
              { key: 'fijo',      label: 'Turno fijo', icon: Repeat        },
              { key: 'clase',     label: 'Clase',      icon: GraduationCap },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => set('tipo', key)}
                className={[
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  form.tipo === key
                    ? key === 'clase'
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurrencia hasta (solo si fijo) */}
        {form.tipo === 'fijo' && (
          <Input
            label="Vigente hasta"
            type="date"
            value={form.recurrenciaHasta}
            onChange={(e) => set('recurrenciaHasta', e.target.value)}
          />
        )}

        {/* Selector de profesor (solo si clase) */}
        {form.tipo === 'clase' && (
          <div>
            <FieldLabel>Profesor <span className="text-slate-300">(opcional)</span></FieldLabel>
            <select
              value={form.profesorId}
              onChange={(e) => set('profesorId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 appearance-none bg-white transition-all"
            >
              <option value="">— Sin asignar —</option>
              {profesoresActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}{p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Jugadores (no aplica a clases) */}
        {form.tipo !== 'clase' && (
          <div>
            <FieldLabel>Jugadores <span className="text-slate-300">(hasta 4)</span></FieldLabel>
            <div className="flex flex-col gap-2">
              {form.jugadores.map((j, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Jugador ${i + 1}${i === 0 ? ' *' : ''}`}
                  value={j}
                  onChange={(e) => setJugador(i, e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300"
                />
              ))}
            </div>
          </div>
        )}

        {/* Monto + pago (no aplica a clases) */}
        {form.tipo !== 'clase' && (
          <>
            <Input
              label="Monto (ARS)"
              type="number"
              value={form.monto}
              onChange={(e) => set('monto', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Estado de pago" value={form.pago} onChange={(e) => set('pago', e.target.value)}>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </Select>
              <Select label="Método de pago" value={form.metodoPago} onChange={(e) => set('metodoPago', e.target.value)}>
                {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </div>
          </>
        )}

        {/* Notas / descripción */}
        <div>
          <FieldLabel>{form.tipo === 'clase' ? 'Descripción' : 'Notas'}</FieldLabel>
          <textarea
            rows={2}
            placeholder={form.tipo === 'clase' ? 'Ej: Clase de iniciación...' : 'Observaciones...'}
            value={form.notas}
            onChange={(e) => set('notas', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20"
        >
          <Save size={14} />
          Confirmar
        </button>
      </div>
    </div>
  )
}

// ─── Panel lateral — Formulario bloqueo ──────────────────────────────────────

const FormBloqueo = ({ franja, cancha, onSave, onCancel }) => {
  const [razon, setRazon] = useState(RAZONES_BLOQUEO[0])
  const [notas, setNotas] = useState('')
  const [hasta, setHasta] = useState(franja.fin)

  const handleSave = () => {
    onSave({
      canchaId: cancha.id,
      inicio: franja.inicio,
      fin: hasta || franja.fin,
      tipo: 'bloqueado',
      recurrencia: null,
      jugadores: [],
      estado: 'confirmada',
      pago: null,
      monto: 0,
      notas: `${razon}${notas ? ' — ' + notas : ''}`,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Bloquear franja</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {cancha.nombre} · desde {franja.inicio}
          </p>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-4">
        <Select label="Razón" value={razon} onChange={(e) => setRazon(e.target.value)}>
          {RAZONES_BLOQUEO.map((r) => <option key={r}>{r}</option>)}
        </Select>

        <div>
          <FieldLabel>Bloquear hasta (horario)</FieldLabel>
          <select
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 appearance-none bg-white"
          >
            {FRANJAS.filter((f) => f.inicio >= franja.inicio).map((f) => (
              <option key={f.fin} value={f.fin}>{franja.inicio} – {f.fin}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Detalle <span className="text-slate-300">(opcional)</span></FieldLabel>
          <textarea
            rows={3}
            placeholder="Ej: Rotura de vidrio, requiere reparación..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
        >
          <Lock size={14} />
          Bloquear
        </button>
      </div>
    </div>
  )
}

// ─── Panel lateral — Detalle reserva ─────────────────────────────────────────

const DetalleReserva = ({ reserva, onCancelar, onPago, onClose, onAprobar }) => {
  const tipoCfg = TIPO_CONFIG[reserva.tipo]
  const pagoCfg = reserva.pago ? PAGO_CONFIG[reserva.pago] : null
  const estadoCfg = ESTADO_CONFIG[reserva.estado]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${tipoCfg.dot}`} />
          <h3 className="text-slate-800 font-bold text-base">
            {reserva.tipo === 'bloqueado' ? 'Franja bloqueada' : `Reserva ${tipoCfg.label}`}
          </h3>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Horario + cancha */}
        <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span className="text-slate-600 font-medium">{reserva.inicio} – {reserva.fin}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays size={14} className="text-slate-400 shrink-0" />
            <span className="text-slate-600">{formatFecha(reserva.fecha)}</span>
          </div>
          {reserva.tipo === 'fijo' && reserva.recurrencia && (
            <div className="flex items-center gap-2 text-sm">
              <Repeat size={14} className="text-violet-400 shrink-0" />
              <span className="text-violet-600 font-medium text-xs">
                Turno fijo — vigente hasta {new Date(reserva.recurrencia.hasta + 'T12:00:00').toLocaleDateString('es-AR')}
              </span>
            </div>
          )}
        </div>

        {/* Clase del profesor */}
        {reserva.tipo === 'clase' && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-orange-500 shrink-0" />
              <span className="text-orange-700 font-semibold text-sm">
                {reserva.creadoPor === 'profesor' ? 'Clase del profesor' : 'Clase'}
              </span>
            </div>
            {reserva.profesorNombre && (
              <p className="text-orange-600 text-sm">{reserva.profesorNombre}</p>
            )}
            {(reserva.nota || reserva.notas) && (
              <p className="text-orange-500 text-xs">{reserva.nota || reserva.notas}</p>
            )}
          </div>
        )}

        {/* Bloqueo */}
        {reserva.tipo === 'bloqueado' && (
          <div className={`border rounded-xl p-4 ${reserva.creadoPor === 'profesor' ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {reserva.creadoPor === 'profesor'
                ? <GraduationCap size={14} className="text-red-500" />
                : <Lock size={14} className="text-slate-500" />
              }
              <span className={`font-semibold text-sm ${reserva.creadoPor === 'profesor' ? 'text-red-700' : 'text-slate-600'}`}>
                {reserva.creadoPor === 'profesor' ? 'No disponible — Profesor' : 'Motivo'}
              </span>
            </div>
            {reserva.creadoPor === 'profesor' && reserva.profesorNombre && (
              <p className="text-red-500 text-sm mb-1">{reserva.profesorNombre}</p>
            )}
            <p className={`text-sm ${reserva.creadoPor === 'profesor' ? 'text-red-400' : 'text-slate-500'}`}>
              {reserva.notas || 'Sin especificar'}
            </p>
          </div>
        )}

        {/* Jugadores */}
        {reserva.jugadores.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs font-medium mb-2 flex items-center gap-1.5">
              <Users size={13} /> Jugadores
            </p>
            <div className="flex flex-col gap-1.5">
              {reserva.jugadores.map((j, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                    {j[0]}
                  </div>
                  <span className="text-slate-700 text-sm">{j}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado y pago */}
        {reserva.tipo !== 'bloqueado' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Estado</span>
              <span className={`text-sm font-semibold ${estadoCfg.cls}`}>{estadoCfg.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Pago</span>
              {pagoCfg && <Badge label={pagoCfg.label} cls={pagoCfg.cls} />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-medium">Monto</span>
              <span className="text-slate-800 font-bold">{formatPrice(reserva.monto)}</span>
            </div>
          </div>
        )}

        {/* Notas */}
        {reserva.notas && reserva.tipo !== 'bloqueado' && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <p className="text-amber-700 text-xs">{reserva.notas}</p>
          </div>
        )}
      </div>

      {/* Acciones — reservas normales */}
      {reserva.tipo !== 'bloqueado' && reserva.tipo !== 'clase' && reserva.estado !== 'cancelada' && (
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">
          {/* Botón aprobar: solo para reservas backend pendientes */}
          {reserva._backendId && reserva.estado === 'pendiente' && onAprobar && (
            <button
              onClick={() => onAprobar(reserva.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
            >
              <Check size={14} />
              Aprobar reserva
            </button>
          )}
          {reserva.pago !== 'pagado' && reserva.estado === 'confirmada' && (
            <button
              onClick={() => onPago(reserva.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
            >
              <Check size={14} />
              Marcar como pagado
            </button>
          )}
          <button
            onClick={() => onCancelar(reserva.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Ban size={14} />
            {reserva.tipo === 'fijo' ? 'Liberar este día' : 'Cancelar reserva'}
          </button>
        </div>
      )}

      {/* Acciones — clase */}
      {reserva.tipo === 'clase' && (
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={() => onCancelar(reserva.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Ban size={14} />
            Cancelar clase
          </button>
        </div>
      )}

      {/* Desbloquear franja */}
      {reserva.tipo === 'bloqueado' && (
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={() => onCancelar(reserva.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <X size={14} />
            {reserva.creadoPor === 'profesor' ? 'Eliminar no-disponibilidad' : 'Desbloquear franja'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Panel lateral contenedor ─────────────────────────────────────────────────

const PanelContent = ({ seleccion, fecha, onSave, onBloquear, onCancelar, onPago, onClose }) => {
  const [modo, setModo] = useState('reserva')

  if (!seleccion) return null
  const { tipo, reserva, franja, cancha } = seleccion

  const handleSaveReserva = (data) => { onSave({ id: Date.now(), fecha, ...data }) }
  const handleSaveBloqueo = (data) => { onBloquear({ id: Date.now(), fecha, ...data }) }

  if (tipo === 'detalle') {
    return <DetalleReserva reserva={reserva} onCancelar={onCancelar} onPago={onPago} onClose={onClose} />
  }

  return (
    <>
      <div className="flex border-b border-slate-100">
        {[
          { key: 'reserva', label: 'Reserva',  icon: CalendarDays },
          { key: 'bloqueo', label: 'Bloquear', icon: Lock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setModo(key)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-all',
              modo === key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {modo === 'reserva'
        ? <FormNuevaReserva franja={franja} cancha={cancha} onSave={handleSaveReserva} onCancel={onClose} />
        : <FormBloqueo franja={franja} cancha={cancha} onSave={handleSaveBloqueo} onCancel={onClose} />
      }
    </>
  )
}

const Panel = (props) => (
  <aside className="w-80 shrink-0 bg-white border-l border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
    <PanelContent {...props} />
  </aside>
)

// ─── Leyenda ──────────────────────────────────────────────────────────────────

const Leyenda = () => (
  <div className="flex items-center gap-4 flex-wrap">
    {[
      { dot: 'bg-violet-500',  label: 'Fijo'      },
      { dot: 'bg-blue-500',    label: 'Eventual'  },
      { dot: 'bg-slate-400',   label: 'Bloqueado' },
      { dot: 'bg-orange-400',  label: 'Clase'     },
      { dot: 'bg-slate-200',   label: 'Libre'     },
    ].map(({ dot, label }) => (
      <div key={label} className="flex items-center gap-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="text-slate-400 text-xs">{label}</span>
      </div>
    ))}
    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-100">
      {Object.entries(PAGO_CONFIG).map(([, { label, cls }]) => (
        <Badge key={label} label={label} cls={cls} />
      ))}
    </div>
  </div>
)

// ─── Editar reserva ───────────────────────────────────────────────────────────

const EditarReserva = ({ reserva, onSave, onCancel }) => {
  const [form, setForm] = useState({
    jugadores: [...reserva.jugadores],
    monto: reserva.monto,
    pago: reserva.pago,
    notas: reserva.notas,
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setJugador = (i, v) => {
    const arr = [...form.jugadores]
    arr[i] = v
    setForm((p) => ({ ...p, jugadores: arr }))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Editar reserva</h3>
          <p className="text-slate-400 text-xs mt-0.5">{reserva.inicio}–{reserva.fin}</p>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Jugadores */}
        <div>
          <FieldLabel>Jugadores</FieldLabel>
          <div className="flex flex-col gap-2">
            {[0,1,2,3].map((i) => (
              <input
                key={i}
                type="text"
                placeholder={`Jugador ${i + 1}${i === 0 ? ' *' : ''}`}
                value={form.jugadores[i] || ''}
                onChange={(e) => setJugador(i, e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300"
              />
            ))}
          </div>
        </div>

        <Input label="Monto (ARS)" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} />

        <Select label="Estado de pago" value={form.pago} onChange={(e) => set('pago', e.target.value)}>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
          <option value="debe">Debe</option>
        </Select>

        <div>
          <FieldLabel>Notas</FieldLabel>
          <textarea
            rows={2}
            value={form.notas}
            onChange={(e) => set('notas', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => onSave(reserva.id, { ...form, jugadores: form.jugadores.filter(Boolean), monto: Number(form.monto) })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
        >
          <Save size={14} />
          Guardar
        </button>
      </div>
    </div>
  )
}

// ─── Modal aprobación turno fijo ─────────────────────────────────────────────

const ModalTurnoFijo = ({ notif, onAprobar, onRechazar, onCerrar }) => {
  if (!notif) return null
  const esFijo = notif.tipo === 'solicitud_turno_fijo'
  const esLiberacion = notif.tipo === 'liberacion_turno'
  const fechaReserva = notif.fecha
    ? new Date(notif.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  const headerBg = esLiberacion ? 'bg-red-50 border-red-100' : esFijo ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
  const iconBg = esLiberacion ? 'bg-red-100' : esFijo ? 'bg-amber-100' : 'bg-blue-100'
  const titulo = esLiberacion ? 'Ausencia turno fijo' : esFijo ? 'Solicitud de turno fijo' : 'Nueva reserva eventual'
  const subtitulo = esLiberacion ? 'El jugador no puede asistir' : 'Requiere tu aprobación'
  const tituloColor = esLiberacion ? 'text-red-800' : esFijo ? 'text-amber-800' : 'text-blue-800'
  const subtituloColor = esLiberacion ? 'text-red-600' : esFijo ? 'text-amber-600' : 'text-blue-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              {esLiberacion
                ? <AlertCircle size={16} className="text-red-600" />
                : esFijo
                  ? <Repeat size={16} className="text-amber-600" />
                  : <CalendarDays size={16} className="text-blue-600" />
              }
            </div>
            <div>
              <p className={`font-bold text-base ${tituloColor}`}>{titulo}</p>
              <p className={`text-xs mt-0.5 ${subtituloColor}`}>{subtitulo}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Datos del turno */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={13} />
                <span className="text-xs">Jugador</span>
              </div>
              <span className="text-slate-800 font-semibold text-sm">{notif.jugador || '—'}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin size={13} />
                <span className="text-xs">Cancha</span>
              </div>
              <span className="text-slate-800 font-semibold text-sm">{notif.cancha}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={13} />
                <span className="text-xs">Horario</span>
              </div>
              <span className="text-slate-800 font-semibold text-sm">{notif.inicio} a {notif.fin}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarDays size={13} />
                <span className="text-xs">{esLiberacion ? 'Ausencia para el día' : 'Fecha solicitada'}</span>
              </div>
              <span className="text-slate-800 font-semibold text-sm">{fechaReserva}</span>
            </div>
            {esFijo && (
              <>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Repeat size={13} />
                    <span className="text-xs">Recurrencia</span>
                  </div>
                  <span className="text-amber-600 font-semibold text-sm">Semanal</span>
                </div>
              </>
            )}
            {notif.precio && (
              <>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign size={13} />
                    <span className="text-xs">Precio por turno</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">${Number(notif.precio).toLocaleString('es-AR')}</span>
                </div>
              </>
            )}
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onRechazar(notif.id)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              <XCircle size={15} />
              {esLiberacion ? 'Ignorar' : 'Rechazar'}
            </button>
            <button
              onClick={() => onAprobar(notif.id)}
              className={[
                'flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all shadow-md',
                esLiberacion
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
              ].join(' ')}
            >
              <CheckCircle size={15} />
              {esLiberacion ? 'Liberar turno este día' : 'Aprobar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Panel alertas jugadores ──────────────────────────────────────────────────

// Helper: convierte fecha ISO a nombre de día en español
const diaSemanaDeISO = (fechaISO) => {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[new Date(fechaISO + 'T12:00:00').getDay()]
}

const PanelAlertas = ({
  notificaciones, reservasPendientes = [], adminToken: panelAdminToken,
  onMarcarLeida, onEliminar, onMarcarTodas, onLiberacionAprobada,
  onReservasPendientesChange,
}) => {
  const [modalNotif, setModalNotif] = useState(null)
  const [aprobandoId, setAprobandoId] = useState(null)
  const ausentarDia = useTurnosFijosStore((s) => s.ausentarDia)
  const { addReservaConfirmada, addAusenciaConfirmada } = usePlayerNotificationsStore()

  // Notificaciones que NO son reservas normales (esas las manejamos directo desde backend)
  const notifFiltradas = notificaciones.filter((n) =>
    n.tipo !== 'nueva_reserva' && n.tipo !== 'inscripcion_torneo' && n.tipo !== 'baja_torneo' && n.tipo !== 'actualizacion_torneo'
  )
  const sinLeer = notificaciones.filter((n) => !n.leida && n.tipo !== 'nueva_reserva').length

  const hayContenido = reservasPendientes.length > 0 || notifFiltradas.length > 0
  if (!hayContenido) return null

  // Aprobar reserva del backend
  const handleAprobarReserva = async (reserva) => {
    setAprobandoId(reserva.id)
    try {
      await api.patch(`/reservas/${reserva.id}/estado`, { estado: 'confirmada' }, { Authorization: `Bearer ${panelAdminToken}` })
      addReservaConfirmada({
        canchaNombre: reserva.cancha?.nombre ?? '',
        fecha: reserva.fecha,
        hora: reserva.horaInicio,
        horaFin: reserva.horaFin,
      })
      onReservasPendientesChange?.()
    } catch (err) {
      alert(err.message || 'No se pudo aprobar la reserva')
    }
    setAprobandoId(null)
  }

  // Rechazar reserva del backend
  const handleRechazarReserva = async (reserva) => {
    setAprobandoId(reserva.id)
    try {
      await api.patch(`/reservas/${reserva.id}/estado`, { estado: 'cancelada' }, { Authorization: `Bearer ${panelAdminToken}` })
      onReservasPendientesChange?.()
    } catch (err) {
      alert(err.message || 'No se pudo rechazar la reserva')
    }
    setAprobandoId(null)
  }

  // Aprobar notificación de liberación de turno fijo (sigue en localStorage)
  const handleAprobar = async (notifId) => {
    const notif = modalNotif
    if (notif?.tipo === 'liberacion_turno' && notif.turnoFijoId && notif.fecha) {
      api.patch(`/turnos-fijos/${notif.turnoFijoId}/ausencia/${notif.fecha}`, {}, { Authorization: `Bearer ${panelAdminToken}` })
        .catch(() => {})
      ausentarDia(notif.turnoFijoId, notif.fecha)
      addAusenciaConfirmada?.({ canchaNombre: notif.cancha, fecha: notif.fecha, inicio: notif.inicio, fin: notif.fin })
      onLiberacionAprobada?.(notif.fecha)
    }
    onEliminar(notifId)
    setModalNotif(null)
  }

  const handleRechazar = (id) => {
    onEliminar(id)
    setModalNotif(null)
  }

  return (
    <>
      {modalNotif && (
        <ModalTurnoFijo
          notif={modalNotif}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          onCerrar={() => setModalNotif(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-amber-500" />
            <span className="text-amber-700 font-semibold text-sm">Avisos de jugadores</span>
            {(reservasPendientes.length + sinLeer) > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {reservasPendientes.length + sinLeer} nuevo{(reservasPendientes.length + sinLeer) > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {sinLeer > 0 && (
            <button
              onClick={onMarcarTodas}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition-colors border border-amber-200"
            >
              <CheckCircle size={13} />
              Marcar como vistas
            </button>
          )}
        </div>

        {/* Reservas pendientes desde el backend — fuente de verdad */}
        {reservasPendientes.length > 0 && (
          <div className="divide-y divide-slate-50 border-b border-slate-100">
            {reservasPendientes.map((r) => {
              const jugadorNombre = r.jugador ? `${r.jugador.nombre} ${r.jugador.apellido}` : ''
              const fechaFmt = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
              const cargando = aprobandoId === r.id
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-start gap-3 bg-blue-50/40">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm font-medium">
                      <span className="text-blue-600 font-semibold">Nueva reserva</span>
                      {jugadorNombre && <span className="text-slate-700 font-semibold"> · {jugadorNombre}</span>}
                      {r.precio && <span className="text-slate-400 font-normal"> · ${Number(r.precio).toLocaleString('es-AR')}</span>}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">{r.cancha?.nombre} · {r.horaInicio}–{r.horaFin} · {fechaFmt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        disabled={cargando}
                        onClick={() => handleAprobarReserva(r)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} />
                        {cargando ? 'Aprobando…' : 'Aprobar'}
                      </button>
                      <button
                        disabled={cargando}
                        onClick={() => handleRechazarReserva(r)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors border border-red-200 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {notifFiltradas.map((n) => {
            const esSolicitudFijo = n.tipo === 'solicitud_turno_fijo'
            const esLiberacion = n.tipo === 'liberacion_turno'
            const esCancelacion = n.tipo === 'cancelacion_reserva'
            const esNuevaClaseProf = n.tipo === 'nueva_clase_profesor'
            const esCancelClaseProf = n.tipo === 'cancelacion_clase_profesor'
            const dotColor = n.leida ? 'bg-slate-300'
              : esSolicitudFijo ? 'bg-amber-500'
              : esNuevaClaseProf ? 'bg-orange-400'
              : esCancelClaseProf ? 'bg-orange-600'
              : 'bg-red-500'
            const rowBg = n.leida ? ''
              : esSolicitudFijo ? 'bg-amber-50/40'
              : esNuevaClaseProf || esCancelClaseProf ? 'bg-orange-50/40'
              : 'bg-red-50/30'
            const esClickeable = (esSolicitudFijo || esLiberacion) && !n.leida
            const fechaReserva = n.fecha
              ? new Date(n.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
              : new Date(n.timestamp).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const tsTime = new Date(n.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={n.id}
                onClick={esClickeable ? () => setModalNotif(n) : undefined}
                className={[
                  'px-5 py-3.5 flex items-start gap-3 transition-colors',
                  n.leida ? 'opacity-50' : rowBg,
                  esClickeable ? 'cursor-pointer hover:brightness-95' : '',
                ].join(' ')}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  {esSolicitudFijo && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-amber-600 font-semibold">Solicitud turno fijo</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                        {n.precio && <span className="text-slate-400 font-normal"> · ${Number(n.precio).toLocaleString('es-AR')}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{n.cancha} · {n.inicio}–{n.fin} · semanal · {fechaReserva}</p>
                      {!n.leida && (
                        <p className="text-amber-500 text-[10px] mt-1 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          Clic para aprobar o rechazar
                        </p>
                      )}
                    </>
                  )}
                  {esLiberacion && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-red-600 font-semibold">{n.jugador}</span> no puede asistir a su turno fijo
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}
                      </p>
                      {!n.leida && (
                        <p className="text-red-500 text-[10px] mt-1 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                          Clic para liberar el turno
                        </p>
                      )}
                    </>
                  )}
                  {esCancelacion && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-slate-600 font-semibold">Cancelación</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}
                      </p>
                    </>
                  )}
                  {esNuevaClaseProf && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-orange-600 font-semibold">Nueva clase agendada</span>
                        {n.profesorNombre && <span className="text-slate-700 font-semibold"> · {n.profesorNombre}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}
                      </p>
                    </>
                  )}
                  {esCancelClaseProf && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-orange-700 font-semibold">Clase cancelada por profesor</span>
                        {n.profesorNombre && <span className="text-slate-700 font-semibold"> · {n.profesorNombre}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}
                      </p>
                      <p className="text-orange-500 text-[10px] mt-1 font-medium">El slot quedó libre</p>
                    </>
                  )}
                  {!esSolicitudFijo && !esLiberacion && !esCancelacion && !esNuevaClaseProf && !esCancelClaseProf && (
                    <p className="text-slate-500 text-sm">{n.jugador}</p>
                  )}
                </div>
                {!n.leida && !esClickeable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarcarLeida(n.id) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 text-xs font-semibold transition-colors border border-slate-200 hover:border-emerald-300 shadow-sm shrink-0"
                  >
                    <Check size={12} />
                    Leído
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Tab turnos fijos ─────────────────────────────────────────────────────────

const makeEmptyClase = (canchas) => ({
  profesor: '', canchaId: canchas[0]?.id ?? '', dia: 'lunes',
  inicio: FRANJAS[0].inicio, fin: FRANJAS[1].fin, hasta: '', activa: true,
})

const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const TabTurnosFijos = ({ clases, onAddClase, onDeleteClase, canchas = [] }) => {
  const turnosFijosJugadores = useTurnosFijosStore((s) => s.turnosFijos)
  const liberarTurno = useTurnosFijosStore((s) => s.liberarTurno)
  const updateTurnoFijo = useTurnosFijosStore((s) => s.updateTurnoFijo)
  const adminToken = useAuthStore((s) => s.token)
  const fijos = turnosFijosJugadores.filter((t) => t.activo)
  const pendientes = turnosFijosJugadores.filter((t) => t.estado === 'pendiente')
  const hoy = todayISO()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [formClase, setFormClase] = useState(() => makeEmptyClase(canchas))
  const [errorForm, setErrorForm] = useState('')

  const handleAprobarTurnoFijo = async (id) => {
    try {
      const updated = await api.patch(`/turnos-fijos/${id}/estado`, { estado: 'confirmado' }, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(id, { estado: 'confirmado', activo: true, desde: updated.desde })
    } catch { /* fallback: actualizar local */ updateTurnoFijo(id, { estado: 'confirmado', activo: true }) }
  }

  const handleRechazarTurnoFijo = async (id) => {
    try {
      await api.patch(`/turnos-fijos/${id}/estado`, { estado: 'inactivo' }, { Authorization: `Bearer ${adminToken}` })
    } catch { /* ignore */ }
    updateTurnoFijo(id, { estado: 'inactivo', activo: false })
  }

  const handleLiberarTurnoFijo = async (id) => {
    try {
      await api.patch(`/turnos-fijos/${id}/estado`, { estado: 'inactivo' }, { Authorization: `Bearer ${adminToken}` })
    } catch { /* ignore */ }
    liberarTurno(id)
  }

  const handleConfirmarAusenciaAdmin = async (turnoId, fecha) => {
    try {
      const updated = await api.patch(`/turnos-fijos/${turnoId}/ausencia/${fecha}`, {}, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(turnoId, { diasAusentes: updated.diasAusentes, ausenciasPendientes: updated.ausenciasPendientes })
    } catch { /* fallback */ updateTurnoFijo(turnoId, { diasAusentes: [...(turnosFijosJugadores.find(t=>t.id===turnoId)?.diasAusentes??[]), fecha] }) }
  }

  const handleGuardarClase = () => {
    if (!formClase.profesor.trim()) { setErrorForm('El nombre del profesor es requerido'); return }
    if (!formClase.hasta) { setErrorForm('La fecha de vigencia es requerida'); return }
    if (formClase.fin <= formClase.inicio) { setErrorForm('El horario de fin debe ser posterior al inicio'); return }
    setErrorForm('')
    onAddClase({ ...formClase, id: Date.now() })
    setFormClase(EMPTY_CLASE)
    setMostrarForm(false)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Pendientes de aprobación ── */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              <span className="text-slate-700 font-semibold text-sm">Solicitudes pendientes</span>
            </div>
            <span className="text-amber-500 text-xs font-medium">{pendientes.length} por aprobar</span>
          </div>
          <div className="divide-y divide-slate-50">
            {pendientes.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-700 text-sm font-medium">{t.jugador || '—'}</p>
                  <p className="text-slate-400 text-xs">{t.canchaNombre} · {DIAS_LABEL[t.dia] ?? t.dia} {t.inicio}–{t.fin}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAprobarTurnoFijo(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRechazarTurnoFijo(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Turnos fijos jugadores ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat size={15} className="text-violet-500" />
            <span className="text-slate-700 font-semibold text-sm">Turnos fijos — jugadores</span>
          </div>
          <span className="text-slate-400 text-xs">{fijos.length} registrados</span>
        </div>

        {fijos.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No hay turnos fijos aprobados aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Jugador', 'Cancha', 'Día', 'Horario', 'Precio', 'Fecha de aprobación', 'Ausencias', 'Acción'].map((h) => (
                    <th key={h} className="text-left text-slate-400 font-medium text-xs px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {fijos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-violet-600 text-[10px] font-bold">{(t.jugador || '?')[0].toUpperCase()}</span>
                          </div>
                          <span className="text-slate-700 font-medium text-xs">{t.jugador || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{t.canchaNombre}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{DIAS_LABEL[t.dia] ?? t.dia}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.inicio}–{t.fin}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold text-xs">${Number(t.precio).toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {t.desde
                          ? new Date(t.desde + 'T12:00:00').toLocaleDateString('es-AR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(t.diasAusentes?.length ?? 0) === 0 ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {t.diasAusentes.map((f) => (
                              <span key={f} className="text-amber-500 text-[10px] font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md w-fit">
                                {new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleLiberarTurnoFijo(t.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          title="Liberar turno fijo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Clases del profesor ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={15} className="text-orange-500" />
            <span className="text-slate-700 font-semibold text-sm">Clases del profesor</span>
            <span className="text-slate-400 text-xs">{clases.length} registradas</span>
          </div>
          <button
            onClick={() => { setMostrarForm((v) => !v); setErrorForm('') }}
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg transition-all"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">Agregar clase</span>
          </button>
        </div>

        {/* Formulario inline */}
        {mostrarForm && (
          <div className="px-5 py-4 bg-orange-50/50 border-b border-orange-100">
            <p className="text-orange-700 text-xs font-semibold mb-3">Nueva clase del profesor</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Nombre del profesor</FieldLabel>
                <input
                  type="text"
                  placeholder="Ej: Marcelo Ríos"
                  value={formClase.profesor}
                  onChange={(e) => setFormClase((p) => ({ ...p, profesor: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all"
                />
              </div>
              <div>
                <FieldLabel>Cancha</FieldLabel>
                <select
                  value={formClase.canchaId}
                  onChange={(e) => setFormClase((p) => ({ ...p, canchaId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 appearance-none bg-white"
                >
                  {canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Día</FieldLabel>
                <select
                  value={formClase.dia}
                  onChange={(e) => setFormClase((p) => ({ ...p, dia: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 appearance-none bg-white"
                >
                  {DIAS_SEMANA_OPCIONES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Horario inicio</FieldLabel>
                <select
                  value={formClase.inicio}
                  onChange={(e) => setFormClase((p) => ({ ...p, inicio: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 appearance-none bg-white"
                >
                  {FRANJAS.map((f) => <option key={f.inicio} value={f.inicio}>{f.inicio}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Horario fin</FieldLabel>
                <select
                  value={formClase.fin}
                  onChange={(e) => setFormClase((p) => ({ ...p, fin: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 appearance-none bg-white"
                >
                  {FRANJAS.map((f) => <option key={f.fin} value={f.fin}>{f.fin}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Vigente hasta</FieldLabel>
                <input
                  type="date"
                  value={formClase.hasta}
                  onChange={(e) => setFormClase((p) => ({ ...p, hasta: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-orange-400 transition-all"
                />
              </div>
            </div>
            {errorForm && <p className="text-red-500 text-xs mt-2">{errorForm}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setMostrarForm(false); setErrorForm('') }}
                className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarClase}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all"
              >
                <Save size={13} />
                Guardar clase
              </button>
            </div>
          </div>
        )}

        {/* Tabla de clases */}
        {clases.length === 0 && !mostrarForm ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No hay clases registradas</div>
        ) : clases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Profesor', 'Cancha', 'Día', 'Horario', 'Vigente hasta', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left text-slate-400 font-medium text-xs px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clases.map((c) => {
                  const cancha = canchas.find((ca) => ca.id === c.canchaId)
                  const diaLabel = DIAS_SEMANA_OPCIONES.find((d) => d.value === c.dia)?.label || c.dia
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                            <GraduationCap size={12} className="text-orange-500" />
                          </div>
                          <span className="text-slate-700 font-medium">{c.profesor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{cancha?.nombre}</td>
                      <td className="px-4 py-3 text-slate-500">{diaLabel}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.inicio}–{c.fin}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(c.hasta + 'T12:00:00').toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${c.activa ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {c.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onDeleteClase(c.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          title="Eliminar clase"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ReservasPage = () => {
  const [fecha, setFecha] = useState(todayISO())
  const [clases, setClases] = useState(CLASES_PROFESOR)
  const [seleccion, setSeleccion] = useState(null)
  const [editando, setEditando] = useState(null)
  const [tabActiva, setTabActiva] = useState('grilla') // 'grilla' | 'fijos'

  const { notificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion } = useNotificacionesStore()
  const playerReservas = useReservasStore((s) => s.reservas)
  const cancelarReservaStore = useReservasStore((s) => s.cancelarReserva)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)
  const ausentarDiaStore = useTurnosFijosStore((s) => s.ausentarDia)
  const { addReservaCanceladaAdmin, addTurnoFijoLiberadoAdmin } = usePlayerNotificationsStore()

  // Store compartido con el dashboard del profesor
  const reservas = useReservasAdminStore((s) => s.reservas)
  const addReservaAdmin = useReservasAdminStore((s) => s.addReserva)
  const deleteReservaAdmin = useReservasAdminStore((s) => s.deleteReserva)
  const pagarReservaAdmin = useReservasAdminStore((s) => s.pagarReserva)
  const updateReservaAdmin = useReservasAdminStore((s) => s.updateReserva)

  const adminToken = useAuthStore((s) => s.token)
  const clubId = useAuthStore((s) => s.user?.club?.id) ?? 'cmoryx4a900008t4qmzdzuiee'
  const canchas = useClubStore((s) => s.club.canchas)
  const horarios = useClubStore((s) => s.club.horarios)

  const diaNombre = useMemo(
    () => DIAS_SEMANA_GRILLA[new Date(fecha + 'T12:00:00').getDay()],
    [fecha]
  )

  // Franjas del horario global del club — para canchas sin horario propio
  const franjasDia = useMemo(
    () => generateFranjas(horarios?.[diaNombre]),
    [fecha, horarios, diaNombre]
  )

  const tieneHorarioPropio = (c) =>
    c.horarios && typeof c.horarios === 'object' &&
    Object.values(c.horarios).some((d) => d && 'activo' in d)

  // Canchas sin horario propio → grilla principal (usa horario global)
  const canchasSinCustom = useMemo(() => canchas.filter((c) => !tieneHorarioPropio(c)), [canchas])

  // Canchas con horario propio → sub-grillas independientes
  const canchasConCustom = useMemo(() => canchas.filter((c) => tieneHorarioPropio(c)), [canchas])

  // Franjas por cancha con horario propio
  const franjasCustomPorCancha = useMemo(
    () => canchasConCustom.map((c) => ({ canchaId: c.id, franjas: generateFranjas(c.horarios?.[diaNombre]) })),
    [canchasConCustom, diaNombre]
  )

  // Reservas reales desde el backend (jugadores que reservaron online)
  const [reservasBackend, setReservasBackend] = useState([])

  const fetchReservasBackend = (f = fecha) => {
    if (!adminToken) return
    api.get(`/reservas?clubId=${clubId}&fecha=${f}`, { Authorization: `Bearer ${adminToken}` })
      .then((data) => setReservasBackend(data))
      .catch(() => {})
  }

  useEffect(() => {
    fetchReservasBackend()
    // Refresca la grilla cada 30 segundos para reflejar cancelaciones/confirmaciones en tiempo real
    const interval = setInterval(() => fetchReservasBackend(), 30_000)
    // También refresca cuando el usuario vuelve al tab
    const onFocus = () => fetchReservasBackend()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [fecha, adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reservas pendientes de aprobación (todas las fechas)
  const [reservasPendientes, setReservasPendientes] = useState([])

  const fetchReservasPendientes = () => {
    if (!adminToken) return
    api.get('/reservas/pendientes', { Authorization: `Bearer ${adminToken}` })
      .then((data) => setReservasPendientes(Array.isArray(data) ? data : []))
      .catch(() => setReservasPendientes([]))
  }

  useEffect(() => {
    fetchReservasPendientes()
    const interval = setInterval(fetchReservasPendientes, 30_000)
    window.addEventListener('focus', fetchReservasPendientes)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', fetchReservasPendientes)
    }
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transforma una reserva de la DB al formato de la grilla admin
  const mapBackendReserva = (r) => ({
    id: `backend_${r.id}`,
    _backendId: r.id,
    canchaId: r.canchaId,
    canchaNombre: r.cancha?.nombre || '',
    fecha: r.fecha,
    inicio: r.horaInicio,
    fin: r.horaFin,
    tipo: r.tipo || 'online',
    jugadores: r.jugador ? [`${r.jugador.nombre} ${r.jugador.apellido}`] : [],
    estado: r.estado,
    pago: r.estado === 'confirmada' ? 'pendiente' : null,
    monto: r.precio || 0,
    notas: r.notas || '',
    creadoPor: 'jugador',
  })

  // Mapea la hora del jugador (ej. '10:00') a la franja admin que la contiene
  const franjaParaHora = (hora) =>
    FRANJAS.find((f) => f.inicio <= hora && hora < f.fin) ||
    FRANJAS.find((f) => f.inicio === hora) ||
    FRANJAS[0]


  // Turnos fijos aprobados → tipo 'fijo' (violeta) en grilla, para el día de semana que corresponde
  const diaSemanaFecha = getDiaSemana(fecha)
  const turnosFijosDia = useMemo(() =>
    turnosFijos
      .filter((t) =>
        t.activo &&
        t.dia === diaSemanaFecha &&
        !(t.diasAusentes || []).includes(fecha)
      )
      .map((t) => {
        const f = franjaParaHora(t.inicio)
        return {
          id: `fijo_player_${t.id}`,
          canchaId: t.canchaId,
          fecha,
          inicio: f.inicio,
          fin: f.fin,
          tipo: 'fijo',
          jugadores: [t.jugador || t.canchaNombre],
          pago: 'pendiente',
          monto: t.precio,
          estado: 'confirmada',
          notas: 'Turno fijo jugador',
          recurrencia: { dia: t.dia, hasta: '2099-12-31' },
        }
      })
  , [turnosFijos, diaSemanaFecha, fecha])

  // Reservas del backend transformadas, excluyendo canceladas y las que ya están en el store local
  const reservasBackendDia = useMemo(
    () => reservasBackend
      .filter((r) => r.estado !== 'cancelada')
      .map(mapBackendReserva),
    [reservasBackend] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reservasDia = useMemo(
    () => [...reservas.filter((r) => r.fecha === fecha), ...turnosFijosDia, ...reservasBackendDia],
    [reservas, fecha, turnosFijosDia, reservasBackendDia]
  )

  // Total de turnos fijos activos para el día de semana, sin descontar ausencias puntuales
  const totalTurnosFijos = useMemo(
    () => turnosFijos.filter((t) => t.activo && t.dia === diaSemanaFecha).length,
    [turnosFijos, diaSemanaFecha]
  )

  // Clases activas del profesor para el día actual (convertidas a formato compatible con la grilla)
  const clasesDia = useMemo(() => {
    const diaSemana = getDiaSemana(fecha)
    return clases
      .filter((c) => c.activa && c.dia === diaSemana && c.hasta >= fecha)
      .map((c) => ({
        id: `clase-${c.id}`,
        canchaId: c.canchaId,
        fecha,
        inicio: c.inicio,
        fin: c.fin,
        tipo: 'clase',
        profesor: c.profesor,
        jugadores: [],
        estado: 'confirmada',
        pago: null,
        monto: 0,
        notas: '',
        recurrencia: null,
      }))
  }, [clases, fecha])

  const handleCeldaClick = (sel) => {
    setEditando(null)
    setSeleccion(sel)
  }

  const handleSave = (nueva) => {
    addReservaAdmin(nueva)
    setSeleccion(null)
  }

  const handleAprobarBackend = async (id) => {
    const backendId = String(id).replace('backend_', '')
    try {
      await api.patch(`/reservas/${backendId}/estado`, { estado: 'confirmada' }, { Authorization: `Bearer ${adminToken}` })
      setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, estado: 'confirmada' } : r))
    } catch (err) {
      alert(err.message || 'No se pudo aprobar la reserva')
    }
    setSeleccion(null)
  }

  const handleCancelar = (id) => {
    // Reserva del backend: id = 'backend_<reservaId>'
    if (String(id).startsWith('backend_')) {
      const backendId = String(id).replace('backend_', '')
      api.patch(`/reservas/${backendId}/estado`, { estado: 'cancelada' }, { Authorization: `Bearer ${adminToken}` })
        .then(() => setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, estado: 'cancelada' } : r)))
        .catch((err) => alert(err.message || 'No se pudo cancelar'))
      setSeleccion(null)
      return
    }

    // Reserva eventual del jugador: id = 'player_<reservaId>'
    if (String(id).startsWith('player_')) {
      const reservaId = Number(String(id).replace('player_', ''))
      const reserva = playerReservas.find((r) => r.id === reservaId)
      cancelarReservaStore(reservaId, { notificarAdmin: false })
      if (reserva) {
        addReservaCanceladaAdmin({
          canchaNombre: reserva.canchaNombre,
          fecha: reserva.fecha,
          inicio: reserva.hora,
          fin: reserva.horaFin,
        })
      }
      setSeleccion(null)
      return
    }

    // Turno fijo del jugador: id = 'fijo_player_<turnoFijoId>' → ausencia puntual para ese día
    if (String(id).startsWith('fijo_player_')) {
      const turnoFijoId = Number(String(id).replace('fijo_player_', ''))
      const turno = turnosFijos.find((t) => t.id === turnoFijoId)
      ausentarDiaStore(turnoFijoId, fecha)
      if (turno) {
        addTurnoFijoLiberadoAdmin({
          canchaNombre: turno.canchaNombre,
          fecha,
          inicio: turno.inicio,
          fin: turno.fin,
        })
      }
      setSeleccion(null)
      return
    }

    // Reserva admin (bloqueo, clase, reserva manual) → store compartido
    deleteReservaAdmin(id)
    setSeleccion(null)
    setEditando(null)
  }

  const handlePago = (id) => {
    pagarReservaAdmin(id)
    setSeleccion(null)
  }

  const handleEditar = (reserva) => {
    setEditando(reserva)
    setSeleccion(null)
  }

  const handleGuardarEdicion = (id, data) => {
    updateReservaAdmin(id, data)
    setEditando(null)
  }

  const handleAddClase = (nueva) => setClases((prev) => [...prev, nueva])
  const handleDeleteClase = (id) => setClases((prev) => prev.filter((c) => c.id !== id))

  const sinLeer = notificaciones.filter((n) => !n.leida && n.tipo === 'solicitud_turno_fijo').length

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Header + navegación de fecha */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Reservas</h2>
          <p className="text-slate-400 text-sm mt-0.5 capitalize">{formatFecha(fecha)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setFecha((f) => addDays(f, -1))}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setFecha(todayISO())}
            className={['px-4 h-9 rounded-xl border text-sm font-medium transition-all',
              fecha === todayISO()
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
            ].join(' ')}>
            Hoy
          </button>
          <button onClick={() => setFecha((f) => addDays(f, 1))}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
            <ChevronRight size={18} />
          </button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="hidden sm:block border border-slate-200 rounded-xl px-3 h-9 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-colors bg-white" />
        </div>
      </div>

      {/* Alertas de jugadores — reservas pendientes del backend + otras notificaciones */}
      {(reservasPendientes.length > 0 || notificaciones.some((n) => !n.leida && n.tipo !== 'nueva_reserva')) && (
        <PanelAlertas
          notificaciones={notificaciones}
          reservasPendientes={reservasPendientes}
          adminToken={adminToken}
          onMarcarLeida={marcarLeida}
          onEliminar={eliminarNotificacion}
          onMarcarTodas={marcarTodasLeidas}
          onLiberacionAprobada={setFecha}
          onReservasPendientesChange={() => { fetchReservasPendientes(); fetchReservasBackend() }}
          onFechaChange={setFecha}
        />
      )}

      {/* Stats */}
      <StatsBar reservasDia={reservasDia} clasesDia={clasesDia} totalTurnosFijos={totalTurnosFijos} canchasCount={canchas.filter((c) => c.activa).length} franjasCount={franjasDia.length} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'grilla', label: 'Grilla del día', icon: CalendarDays },
          { key: 'fijos',  label: 'Turnos fijos',   icon: Repeat,
            badge: sinLeer > 0 ? sinLeer : null },
        ].map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTabActiva(key)}
            className={['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tabActiva === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
            {badge && (
              <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tabActiva === 'grilla' && (
        <>
          <Leyenda />

          {/* Overlay mobile cuando hay panel abierto */}
          {(seleccion || editando) && (
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => { setSeleccion(null); setEditando(null) }}
            />
          )}

          {/* Vista mobile: 2 canchas por página */}
          <div className="md:hidden flex flex-col gap-5">
            {canchasSinCustom.length > 0 && (
              <GrillaMobile reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} canchas={canchasSinCustom} franjas={franjasDia} />
            )}
            {canchasConCustom.map((cancha) => {
              const { franjas } = franjasCustomPorCancha.find((f) => f.canchaId === cancha.id) ?? { franjas: [] }
              return (
                <GrillaConHorarioPropio key={cancha.id} cancha={cancha} franjas={franjas} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
              )
            })}
          </div>

          {/* Vista desktop: tabla completa + panel lateral */}
          <div className="hidden md:flex gap-4 flex-1 min-h-0">
            <div className="flex-1 overflow-auto min-w-0 flex flex-col gap-6">
              {canchasSinCustom.length > 0 && (
                <Grilla reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} canchas={canchasSinCustom} franjas={franjasDia} />
              )}
              {canchasConCustom.map((cancha) => {
                const { franjas } = franjasCustomPorCancha.find((f) => f.canchaId === cancha.id) ?? { franjas: [] }
                return (
                  <GrillaConHorarioPropio key={cancha.id} cancha={cancha} franjas={franjas} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
                )
              })}
            </div>
            {seleccion && !editando && (
              <aside className="lg:static lg:w-80 lg:shrink-0 lg:border-l lg:border-slate-100 lg:flex lg:flex-col lg:h-full lg:max-h-full lg:overflow-hidden">
                {seleccion.tipo === 'detalle' ? (
                  <div className="flex flex-col">
                    <DetalleReserva reserva={seleccion.reserva} onCancelar={handleCancelar} onPago={handlePago} onClose={() => setSeleccion(null)} onAprobar={handleAprobarBackend} />
                    {seleccion.reserva.tipo !== 'bloqueado' && seleccion.reserva.tipo !== 'clase' && seleccion.reserva.estado !== 'cancelada' && (
                      <div className="px-5 pb-4">
                        <button onClick={() => handleEditar(seleccion.reserva)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
                          <Pencil size={14} /> Editar reserva
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Panel seleccion={seleccion} fecha={fecha} onSave={handleSave} onBloquear={handleSave} onCancelar={handleCancelar} onPago={handlePago} onClose={() => setSeleccion(null)} />
                )}
              </aside>
            )}
            {editando && (
              <aside className="lg:static lg:w-80 lg:shrink-0 lg:border-l lg:border-slate-100 lg:flex lg:flex-col lg:h-full lg:max-h-full lg:overflow-hidden">
                <EditarReserva reserva={editando} onSave={handleGuardarEdicion} onCancel={() => setEditando(null)} />
              </aside>
            )}
          </div>

          {/* Panels mobile (fixed bottom sheet, fuera del hidden parent) */}
          {seleccion && !editando && (
            <aside className="fixed bottom-0 inset-x-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:hidden">
              <PanelContent
                seleccion={seleccion}
                fecha={fecha}
                onSave={handleSave}
                onBloquear={handleSave}
                onCancelar={handleCancelar}
                onPago={handlePago}
                onClose={() => setSeleccion(null)}
              />
              {seleccion.tipo === 'detalle' && seleccion.reserva.tipo !== 'bloqueado' && seleccion.reserva.tipo !== 'clase' && seleccion.reserva.estado !== 'cancelada' && (
                <div className="px-5 pb-4">
                  <button onClick={() => handleEditar(seleccion.reserva)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
                    <Pencil size={14} /> Editar reserva
                  </button>
                </div>
              )}
            </aside>
          )}
          {editando && (
            <aside className="fixed bottom-0 inset-x-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:hidden">
              <EditarReserva reserva={editando} onSave={handleGuardarEdicion} onCancel={() => setEditando(null)} />
            </aside>
          )}
        </>
      )}

      {tabActiva === 'fijos' && (
        <TabTurnosFijos
          clases={clases}
          onAddClase={handleAddClase}
          onDeleteClase={handleDeleteClase}
          canchas={canchas}
        />
      )}
    </div>
  )
}

export default ReservasPage
