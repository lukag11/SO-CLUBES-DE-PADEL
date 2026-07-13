import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, X, Save, Check,
  CalendarDays, DollarSign, Lock, Repeat, Clock,
  Users, AlertCircle, AlertTriangle, CheckCircle, Ban, Pencil, Bell, GraduationCap, Trash2, XCircle, MapPin, HelpCircle, Search,
} from 'lucide-react'
import {
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
import { METODO_MAP } from '../lib/metodosPago'
import { api } from '../lib/api'
import { useToast } from '../components/ui/ToastProvider'
import { overlaps, toMin, toTime } from '../utils/timeUtils'
import InfoBlock from '../components/InfoBlock'
import ModalBusquedaJugadores from '../components/jugadores/ModalBusquedaJugadores'
import TabClasesProfesor from '../features/admin/TabClasesProfesor'
import CheckoutTurno from '../features/pagos/CheckoutTurno'

// ─── Hook: hint de campo (mensaje amber que desaparece en 2s) ───────────────
const useFieldHint = () => {
  const [hint, setHint] = useState('')
  const timer = useRef(null)
  const show = useCallback((msg) => {
    setHint(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHint(''), 2000)
  }, [])
  return [hint, show]
}

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

const esPasado = (fecha, inicio) => {
  const hoy = todayISO()
  if (fecha < hoy) return true
  if (fecha > hoy) return false
  return toMin(inicio) <= toMin(horaActual())
}

// Margen de gracia para cobrar un turno terminado antes de marcarlo "Debe".
// La gente sigue consumiendo y arregla la cuenta un rato después de jugar.
// Fijo a propósito (no configurable); si hiciera falta, se vuelve campo del club.
const MIN_GRACIA_COBRO = 60

// ¿El turno está vencido para cobro? = terminó hace más de MIN_GRACIA_COBRO minutos.
const venceCobro = (fecha, horaInicio, horaFin) => {
  const hoy = todayISO()
  if (fecha < hoy) return true
  if (fecha > hoy) return false
  // Cruce de medianoche: si horaFin <= horaInicio (ej. 23:30→01:00, o 22:30→00:00), el turno
  // termina al día siguiente (+1440) → no vence para cobro durante su propia jornada.
  let finMin = toMin(horaFin)
  if (finMin <= toMin(horaInicio)) finMin += 1440
  return finMin + MIN_GRACIA_COBRO <= toMin(horaActual())
}

// Devuelve el día de semana de una fecha ISO en formato normalizado ('lunes', 'miercoles', etc.)
const getDiaSemana = (iso) => {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[new Date(iso + 'T12:00:00').getDay()]
}

const TIPO_CONFIG = {
  fijo:          { label: 'Fijo',           dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200'  },
  eventual:      { label: 'Eventual',       dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200'        },
  bloqueado:     { label: 'Bloqueado',      dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600 border-red-100'           },
  clase:         { label: 'Clase',          dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200'  },
  online:        { label: 'Online',         dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  solicitud_fijo:{ label: 'Solicitud fijo', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200'     },
}

const PAGO_CONFIG = {
  pagado:    { label: 'Pagado',    cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  parcial:   { label: 'Parcial',   cls: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
  en_cuenta: { label: 'En cuenta', cls: 'text-blue-600   bg-blue-50   border-blue-200'   },
  pendiente: { label: 'Pendiente', cls: 'text-amber-600  bg-amber-50  border-amber-200'  },
  debe:      { label: 'Debe',      cls: 'text-red-600    bg-red-50    border-red-200'    },
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
  <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
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

const StatsBar = ({ reservasDia, clasesDia, totalTurnosFijos, canchasCount, franjasCount = 0 }) => {
  const total = (canchasCount || 4) * franjasCount

  // Turnos ocupados: slots únicos de reservas + clases (bloqueados también ocupan)
  const ocupadosSet = new Set([
    ...reservasDia.map((r) => `${r.canchaId}-${r.inicio}`),
    ...(clasesDia || []).map((c) => `${c.canchaId}-${c.inicio}`),
  ])
  const ocupados = ocupadosSet.size

  // Solo tipos con valor económico para los cálculos de cobro
  const conPago = reservasDia.filter((r) => r.tipo !== 'bloqueado' && r.tipo !== 'clase')
  // Cobrado = parte efectivamente cobrada de cada turno (incluye porciones de un split)
  const ingresados = conPago.reduce((s, r) => s + (r.pagadoTurno || 0), 0)
  // "Por cobrar" = saldo pendiente de cada turno (pendiente + en cuenta + vencido + resto de parciales)
  const pendientes = conPago.reduce((s, r) => s + (r.saldoTurno ?? r.monto ?? 0), 0)

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

const Celda = ({ reserva, franja, cancha, fecha, onClick, franjas = [] }) => {
  const pasado = esPasado(fecha, franja.inicio)

  if (!reserva) {
    return (
      <td
        onClick={() => !pasado && onClick({ tipo: 'libre', franja, cancha })}
        className={[
          'border border-slate-100 transition-colors',
          pasado
            ? 'bg-slate-50/60 cursor-default'
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

  const pagoCfgEarly = reserva.pago ? PAGO_CONFIG[reserva.pago] : null

  // Clase del profesor — se pinta dentro de cada celda que overlappea (sin rowspan para no romper el layout)
  if (reserva.tipo === 'clase') {
    const nombreCompleto = reserva.profesor
      ? `${reserva.profesor.nombre} ${reserva.profesor.apellido}`
      : (reserva.profesorNombre || reserva.nota || '')
    return (
      <td
        onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
        className="border border-orange-100 align-top transition-colors cursor-pointer bg-orange-50/70 hover:bg-orange-100/60"
      >
        <div className="h-14 p-2 flex flex-col gap-0.5 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <GraduationCap size={11} className="text-orange-400 shrink-0" />
            <span className="text-orange-600 text-xs font-semibold shrink-0">Clase</span>
            {nombreCompleto && (
              <>
                <span className="text-orange-300 text-xs shrink-0">·</span>
                <span className="text-orange-500 text-[10px] font-medium truncate">{nombreCompleto}</span>
              </>
            )}
          </div>
          <p className="text-orange-500 text-[10px] font-mono font-semibold leading-snug">{reserva.inicio} → {reserva.fin}</p>
        </div>
      </td>
    )
  }

  // Bloqueo, Online, Solicitud fijo — rowspan
  if (reserva.tipo === 'bloqueado' || reserva.tipo === 'online' || reserva.tipo === 'solicitud_fijo') {
    // Primera franja que overlappea con esta reserva (donde se renderiza)
    const primeraFranja = franjas.find((f) => overlaps(reserva.inicio, reserva.fin, f.inicio, f.fin))
    if (!primeraFranja || primeraFranja.inicio !== franja.inicio) return null
    const franjasCubiertas = Math.max(1, franjas.filter(
      (f) => overlaps(reserva.inicio, reserva.fin, f.inicio, f.fin)
    ).length)

    const esOnline = reserva.tipo === 'online'
    const esSolicitudFijo = reserva.tipo === 'solicitud_fijo'
    const esNoDisponibilidadProfesor = reserva.tipo === 'bloqueado' && reserva.creadoPor === 'profesor'

    const inconsistenteRowspan = franjas.length > 0 && !franjas.some((f) => f.inicio === reserva.inicio)

    return (
      <td
        rowSpan={franjasCubiertas}
        onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
        className={[
          'border border-slate-100 align-top transition-colors cursor-pointer relative',
          esNoDisponibilidadProfesor ? 'bg-red-50/60 hover:bg-red-100/50'
          : esOnline ? 'bg-emerald-50/60 hover:bg-emerald-100/50'
          : esSolicitudFijo ? 'bg-amber-50/60 hover:bg-amber-100/50'
          : 'bg-red-50/60 hover:bg-red-100/50',
        ].join(' ')}
      >
        <div className="h-full min-h-14 p-2 flex flex-col gap-1">
          {esNoDisponibilidadProfesor ? (
            <>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={11} className="text-red-400 shrink-0" />
                <span className="text-red-600 text-xs font-semibold truncate">No disponible</span>
              </div>
              <p className="text-red-400 text-[10px] leading-snug truncate">{reserva.profesorNombre}</p>
            </>
          ) : esOnline ? (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-700 text-xs font-semibold truncate">Online</span>
                {pagoCfgEarly && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${pagoCfgEarly.cls}`}>{pagoCfgEarly.label}</span>
                )}
              </div>
              {reserva.jugadores?.[0] && (
                <p className="text-slate-600 text-[10px] font-medium leading-snug truncate">{reserva.jugadores[0]}</p>
              )}
            </>
          ) : esSolicitudFijo ? (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-amber-700 text-xs font-semibold truncate">Solicitud fijo</span>
                {pagoCfgEarly && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${pagoCfgEarly.cls}`}>{pagoCfgEarly.label}</span>
                )}
              </div>
              {reserva.jugadores?.[0] && (
                <p className="text-slate-600 text-[10px] font-medium leading-snug truncate">{reserva.jugadores[0]}</p>
              )}
              <p className="text-amber-600 text-[10px] leading-snug">Pendiente aprobación</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Lock size={11} className="text-red-400 shrink-0" />
                <span className="text-red-600 text-xs font-semibold truncate">Bloqueado</span>
              </div>
              {reserva.notas && <p className="text-red-400 text-xs leading-snug line-clamp-2">{reserva.notas}</p>}
            </>
          )}
        </div>
        {inconsistenteRowspan && (
          <div
            title={`⚠ Fuera de grilla: la reserva está a las ${reserva.inicio} pero ese horario ya no existe en la grilla actual. Causa probable: se modificó el horario de apertura o se desactivó el horario propio de esta cancha después de crear la reserva. Solución: reactivá el horario anterior desde Configuración → Canchas y Horarios, o cancelá esta reserva y volvé a crearla en el nuevo horario.`}
            className="absolute top-1 right-1 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none animate-pulse cursor-help shadow-sm shadow-amber-400/50"
          >
            <AlertTriangle size={9} />
            <span>Fuera de grilla</span>
          </div>
        )}
      </td>
    )
  }

  const tipoCfg = TIPO_CONFIG[reserva.tipo]
  const pagoCfg = PAGO_CONFIG[reserva.pago]
  const inconsistente = franjas.length > 0 && !franjas.some((f) => f.inicio === reserva.inicio)

  return (
    <td
      onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
      className={[
        'border border-slate-100 cursor-pointer transition-all align-top relative',
        reserva.tipo === 'fijo'
          ? 'bg-violet-50/60 hover:bg-violet-100/60'
          : 'bg-blue-50/40 hover:bg-blue-100/40',
        reserva.estado === 'pendiente' ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="h-14 p-2 flex flex-col gap-0.5 overflow-hidden">
        <div className="flex items-center gap-1 flex-wrap">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tipoCfg.dot}`} />
          <span className={`text-xs font-semibold truncate leading-tight ${reserva.tipo === 'fijo' ? 'text-violet-700' : 'text-blue-700'}`}>
            {tipoCfg.label}
          </span>
          {pagoCfg && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${pagoCfg.cls}`}>
              {pagoCfg.label}
            </span>
          )}
          {reserva.tipo === 'fijo' && (
            <Repeat size={10} className="text-violet-400 shrink-0 ml-auto" />
          )}
        </div>
        {reserva.jugadores?.[0] && (
          <p className="text-slate-500 text-[10px] leading-snug truncate">{reserva.jugadores[0]}</p>
        )}
        {reserva.estado === 'pendiente' && (
          <AlertCircle size={10} className="text-amber-500 shrink-0" />
        )}
      </div>
      {inconsistente && (
        <div
          title={`⚠ Fuera de grilla: la reserva está a las ${reserva.inicio} pero ese horario ya no existe en la grilla actual. Causa probable: se modificó el horario de apertura o se desactivó el horario propio de esta cancha después de crear la reserva. Solución: reactivá el horario anterior desde Configuración → Canchas y Horarios, o cancelá esta reserva y volvé a crearla en el nuevo horario.`}
          className="absolute top-1 right-1 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none animate-pulse cursor-help shadow-sm shadow-amber-400/50"
        >
          <AlertTriangle size={9} />
          <span>Fuera de grilla</span>
        </div>
      )}
    </td>
  )
}

// ─── Grilla ───────────────────────────────────────────────────────────────────

const Grilla = ({ reservas, clasesDia, fecha, onCeldaClick, canchas = [], franjas = [] }) => (
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
            const pasado = esPasado(fecha, franja.inicio)
            return (
              <tr key={franja.inicio} className={pasado ? 'opacity-65' : ''}>
                <td className="px-4 py-0 border border-slate-100 bg-slate-50/50 whitespace-nowrap">
                  <span className="text-slate-500 text-xs font-mono">{franja.inicio}</span>
                  <span className="text-slate-300 text-xs mx-0.5">–</span>
                  <span className="text-slate-400 text-xs font-mono">{franja.fin}</span>
                </td>
                {canchas.map((cancha) => {
                  // Clases que EMPIEZAN en este slot (evita duplicar en filas adyacentes por overlap parcial)
                  const clasesSlot = (clasesDia || []).filter(
                    (c) => String(c.canchaId) === String(cancha.id) &&
                      c.inicio >= franja.inicio && c.inicio < franja.fin
                  )
                  // Clases que empezaron en una franja anterior pero se extienden hasta aquí
                  const clasesContinua = clasesSlot.length === 0
                    ? (clasesDia || []).filter(
                        (c) => String(c.canchaId) === String(cancha.id) &&
                          c.inicio < franja.inicio && c.fin > franja.inicio
                      )
                    : []
                  // Excluir clases del fallback — ya las maneja clasesSlot exclusivamente
                  const reservasNoClas = reservas.filter((r) => r.tipo !== 'clase')
                  const reserva = (clasesSlot.length === 0 && clasesContinua.length === 0)
                    ? getReserva(reservasNoClas, cancha.id, franja)
                    : null
                  // Celdas cubiertas por rowspan de bloqueo (clases no usan rowspan)
                  if (reserva?.tipo === 'bloqueado' && reserva.inicio !== franja.inicio) {
                    return null
                  }
                  // Franja cubierta por continuación de una clase que empezó antes — mismo estilo que la celda principal
                  if (clasesContinua.length > 0) {
                    return (
                      <td key={cancha.id} className="border border-orange-100 bg-orange-50/60 align-top p-0">
                        <div className="flex flex-row divide-x divide-orange-100/60 h-full">
                          {clasesContinua.map((clase) => {
                            const esProfesor = clase.creadoPor === 'profesor'
                            const prof = clase.profesor
                            const nombre = prof
                              ? (typeof prof === 'string' ? prof : `${prof.nombre} ${prof.apellido}`)
                              : (clase.profesorNombre || clase.nota || '')
                            return (
                              <div
                                key={`${clase.canchaId}-${clase.inicio}-cont`}
                                onClick={() => onCeldaClick({ tipo: 'detalle', reserva: clase, franja, cancha })}
                                className="cursor-pointer hover:bg-orange-100/70 transition-colors px-2 py-1.5 flex flex-col gap-0.5 flex-1 min-w-0"
                              >
                                <div className="flex items-center gap-1">
                                  <GraduationCap size={10} className="text-orange-400 shrink-0" />
                                  <span className="text-orange-600 text-[10px] font-mono font-semibold">
                                    {clase.inicio} → {clase.fin}
                                  </span>
                                  {esProfesor && (
                                    <span className="text-[8px] bg-orange-100 text-orange-500 font-bold px-1 rounded leading-none shrink-0">Prof</span>
                                  )}
                                </div>
                                {nombre && (
                                  <p className="text-orange-400 text-[9px] leading-snug truncate pl-3.5">{nombre}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  }
                  // Celda con una o más clases del profesor — lado a lado si hay varias
                  if (clasesSlot.length > 0) {
                    return (
                      <td key={cancha.id} className="border border-orange-100 bg-orange-50/60 align-top p-0">
                        <div className="flex flex-row divide-x divide-orange-100/60 h-full">
                          {clasesSlot.map((clase) => {
                            const esProfesor = clase.creadoPor === 'profesor'
                            const prof = clase.profesor
                            const nombre = prof
                              ? (typeof prof === 'string' ? prof : `${prof.nombre} ${prof.apellido}`)
                              : (clase.profesorNombre || clase.nota || '')
                            return (
                              <div
                                key={`${clase.canchaId}-${clase.inicio}`}
                                onClick={() => onCeldaClick({ tipo: 'detalle', reserva: clase, franja, cancha })}
                                className="cursor-pointer hover:bg-orange-100/70 transition-colors px-2 py-1.5 flex flex-col gap-0.5 flex-1 min-w-0"
                              >
                                <div className="flex items-center gap-1">
                                  <GraduationCap size={10} className="text-orange-400 shrink-0" />
                                  <span className="text-orange-600 text-[10px] font-mono font-semibold">
                                    {clase.inicio} → {clase.fin}
                                  </span>
                                  {esProfesor && (
                                    <span className="text-[8px] bg-orange-100 text-orange-500 font-bold px-1 rounded leading-none shrink-0">Prof</span>
                                  )}
                                </div>
                                {nombre && (
                                  <p className="text-orange-400 text-[9px] leading-snug truncate pl-3.5">{nombre}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  }
                  return (
                    <Celda
                      key={cancha.id}
                      reserva={reserva}
                      franja={franja}
                      cancha={cancha}
                      fecha={fecha}
                      onClick={onCeldaClick}
                      franjas={franjas}
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
          'flex-1 min-w-0 border-l border-slate-100 flex items-center justify-center min-h-[44px] transition-colors',
          pasado ? 'bg-slate-50/60 cursor-default' : 'hover:bg-emerald-50/60 cursor-pointer group',
        ].join(' ')}
      >
        {!pasado && <Plus size={11} className="text-slate-200 group-hover:text-emerald-400 transition-colors" />}
      </div>
    )
  }

  const cfgMap = {
    clase:         { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-400',  label: 'Clase'     },
    bloqueado:     { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     label: 'Bloq.'     },
    online:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Online'    },
    solicitud_fijo:{ bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Solicitud' },
    fijo:          { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Fijo'      },
    eventual:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Eventual'  },
  }
  const cfg = cfgMap[reserva.tipo] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: reserva.tipo }
  const pagoCfg = reserva.pago ? PAGO_CONFIG[reserva.pago] : null

  const nombreProfesorMobile = reserva.tipo === 'clase' && reserva.profesor
    ? `${reserva.profesor.nombre} ${reserva.profesor.apellido}`
    : null

  return (
    <div
      onClick={() => onClick({ tipo: 'detalle', reserva, franja, cancha })}
      className={`flex-1 min-w-0 overflow-hidden border-l border-slate-100 cursor-pointer min-h-[44px] p-1.5 flex flex-col gap-0.5 ${cfg.bg} hover:brightness-95 transition-all`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-[10px] font-semibold shrink-0 ${cfg.text}`}>{cfg.label}</span>
        {nombreProfesorMobile && (
          <>
            <span className="text-orange-300 text-[10px] shrink-0">·</span>
            <span className="text-orange-500 text-[9px] font-medium truncate">{nombreProfesorMobile}</span>
          </>
        )}
        {pagoCfg && !nombreProfesorMobile && (
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full border shrink-0 ${pagoCfg.cls} leading-none`}>
            {pagoCfg.label}
          </span>
        )}
      </div>
      {reserva.jugadores?.[0] && (
        <span className="text-[9px] text-slate-500 truncate leading-none">{reserva.jugadores[0]}</span>
      )}
    </div>
  )
}

const GrillaMobile = ({ reservas, clasesDia, fecha, onCeldaClick, canchas = [], franjas = [] }) => {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(canchas.length / 2)
  const canchasVisible = canchas.slice(page * 2, page * 2 + 2)
  // Grid con columnas idénticas garantizadas (minmax(0,1fr)) — evita que la celda con
  // contenido "empuje" y se pase a la de al lado, cosa que sí pasaba con flex-1.
  const gridCols = `4rem repeat(${canchasVisible.length}, minmax(0, 1fr))`

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
      <div className="grid border-b border-slate-100 bg-slate-50" style={{ gridTemplateColumns: gridCols }}>
        <div className="px-2 py-2" />
        {canchasVisible.map((c) => (
          <div key={c.id} className="flex-1 min-w-0 px-1 py-2 text-center border-l border-slate-100">
            <p className="text-slate-700 font-semibold text-xs">{c.nombre}</p>
            <p className="text-slate-400 text-[9px]">{c.tipo} · {c.indoor ? 'In' : 'Out'}</p>
          </div>
        ))}
      </div>

      {/* Filas por franja */}
      {franjas.map((franja) => {
        const pasado = esPasado(fecha, franja.inicio)
        return (
          <div key={franja.inicio} className={`grid border-b border-slate-50 last:border-0 ${pasado ? 'opacity-65' : ''}`} style={{ gridTemplateColumns: gridCols }}>
            <div className="px-2 py-1.5 bg-slate-50/50 flex flex-col justify-center border-r border-slate-100">
              <span className="text-slate-600 text-sm font-mono font-medium leading-none">{franja.inicio}</span>
              <span className="text-slate-400 text-[11px] font-mono leading-none mt-1">{franja.fin}</span>
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

// ─── Sección de cancha con horario general (modo personalización activa) ──────

const GrillaSeccionGeneral = ({ cancha, franjas, reservas, clasesDia, fecha, onCeldaClick }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-slate-700">{cancha.nombre}</span>
      {!cancha.activa && (
        <span className="text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Inactiva</span>
      )}
      {franjas.length > 0 && (
        <span className="text-xs text-slate-400">
          {franjas[0].inicio}–{franjas[franjas.length - 1].fin} · {franjas.length} turno{franjas.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
    <div className="md:hidden">
      <GrillaMobile reservas={reservas} clasesDia={clasesDia} fecha={fecha} onCeldaClick={onCeldaClick} canchas={[cancha]} franjas={franjas} />
    </div>
    <div className="hidden md:block">
      <Grilla reservas={reservas} clasesDia={clasesDia} fecha={fecha} onCeldaClick={onCeldaClick} canchas={[cancha]} franjas={franjas} />
    </div>
  </div>
)

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

// ─── Modal búsqueda especializada de jugadores ────────────────────────────────

// ─── Panel lateral — Formulario nueva reserva ─────────────────────────────────

const FormNuevaReserva = ({ franja, cancha, onSave, onCancel }) => {
  const todosLosProfesores = useProfesoresStore((s) => s.profesores)
  const profesoresActivos = todosLosProfesores.filter((p) => p.activo)
  const adminToken = useAuthStore((s) => s.token)

  const [form, setForm] = useState({
    tipo: 'eventual',
    pago: 'pendiente',
    metodoPago: 'Efectivo',
    monto: cancha.precioTurno ?? 0,
    notas: '',
    recurrenciaHasta: '',
    profesorId: '',
  })

  // Búsqueda de jugador registrado
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [jugadorSel, setJugadorSel] = useState(null) // { id, nombre, apellido, dni }
  const [buscando, setBuscando] = useState(false)
  const [errorNombre, setErrorNombre] = useState(false)
  const [modalBusqueda, setModalBusqueda] = useState(false)

  // Alta rápida de jugador
  const [altaRapida, setAltaRapida] = useState(false)
  const [altaForm, setAltaForm] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaErrors, setAltaErrors] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaGuardando, setAltaGuardando] = useState(false)
  const [hintNombre, showHintNombre] = useFieldHint()
  const [hintApellido, showHintApellido] = useFieldHint()
  const [hintDni, showHintDni] = useFieldHint()
  const [hintQuery, showHintQuery] = useFieldHint()

  const setAltaField = (k, v) => {
    setAltaForm((p) => ({ ...p, [k]: v }))
    setAltaErrors((p) => ({ ...p, [k]: '' }))
  }

  const handleAltaRapida = async () => {
    const errs = { nombre: '', apellido: '', dni: '' }
    if (!altaForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    else if (/\d/.test(altaForm.nombre)) errs.nombre = 'El nombre no puede contener números'
    if (!altaForm.apellido.trim()) errs.apellido = 'El apellido es obligatorio'
    else if (/\d/.test(altaForm.apellido)) errs.apellido = 'El apellido no puede contener números'
    if (!altaForm.dni.trim()) errs.dni = 'El DNI es obligatorio'
    else if (!/^\d{7,8}$/.test(altaForm.dni.trim())) errs.dni = 'El DNI debe tener 7 u 8 dígitos'
    if (errs.nombre || errs.apellido || errs.dni) { setAltaErrors(errs); return }
    setAltaGuardando(true)
    try {
      const nuevo = await api.post('/jugadores', altaForm, { Authorization: `Bearer ${adminToken}` })
      setJugadorSel(nuevo)
      setQuery('')
      setResultados([])
      setAltaRapida(false)
      setAltaForm({ nombre: '', apellido: '', dni: '' })
      setAltaErrors({ nombre: '', apellido: '', dni: '' })
    } catch (err) {
      setAltaErrors((p) => ({ ...p, dni: err.message || 'No se pudo dar de alta' }))
    } finally {
      setAltaGuardando(false)
    }
  }

  useEffect(() => {
    if (jugadorSel) return
    if (query.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const data = await api.get(`/jugadores/buscar?q=${encodeURIComponent(query.trim())}`, { Authorization: `Bearer ${adminToken}` })
        setResultados(Array.isArray(data) ? data : [])
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, jugadorSel, adminToken])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    const esClase = form.tipo === 'clase'
    if (!esClase && !jugadorSel) {
      setErrorNombre(true)
      return
    }

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
      jugadorId: jugadorSel?.id ?? null,
      jugadores: esClase ? [] : (jugadorSel ? [`${jugadorSel.nombre} ${jugadorSel.apellido}`] : []),
      estado: 'confirmada',
      pago: esClase ? null : form.pago,
      monto: esClase ? 0 : Number(form.monto),
      notas: form.notas,
      ...(esClase && {
        creadoPor: 'admin',
        profesorId: profesor?.id ?? null,
        profesorNombre: profesor ? `${profesor.nombre} ${profesor.apellido}` : null,
        nota: form.notas,
      }),
    })
  }

  return (
    <div className="flex flex-col">
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

      <div className="px-5 py-4 flex flex-col gap-4">

        {/* Tipo */}
        <div>
          <FieldLabel>Tipo de reserva</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'eventual',  label: 'Eventual',   icon: CalendarDays  },
              { key: 'fijo',      label: 'Turno fijo', icon: Repeat        },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => set('tipo', key)}
                className={[
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  form.tipo === key
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>


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

        {/* Jugador (no aplica a clases) */}
        {form.tipo !== 'clase' && (
          <div>
            <FieldLabel>A nombre de <span className="text-red-400">*</span></FieldLabel>
            {jugadorSel ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border border-emerald-300 bg-emerald-50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 truncate">{jugadorSel.nombre} {jugadorSel.apellido}</p>
                  {jugadorSel.dni && <p className="text-xs text-emerald-600">DNI {jugadorSel.dni}</p>}
                </div>
                <button type="button" onClick={() => { setJugadorSel(null); setQuery(''); setResultados([]) }} className="text-emerald-400 hover:text-emerald-600 shrink-0">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className={`relative ${errorNombre ? 'animate-shake' : ''}`} onAnimationEnd={() => {}}>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={query}
                    onChange={(e) => {
                      const raw = e.target.value
                      const esSoloDni = /^\d+$/.test(raw)
                      if (esSoloDni && raw.length > 8) { showHintQuery('El DNI tiene máximo 8 dígitos'); return }
                      setQuery(raw); setResultados([]); setErrorNombre(false)
                    }}
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:ring-2 ${
                      errorNombre
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                        : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setModalBusqueda(true)}
                    title="Búsqueda avanzada"
                    className="shrink-0 px-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  >
                    <Search size={15} />
                  </button>
                </div>
                {hintQuery && <p className="text-amber-500 text-xs mt-1 animate-pulse">{hintQuery}</p>}
                {buscando && (
                  <div className="absolute right-12 top-3 w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-400 rounded-full animate-spin" />
                )}
                {resultados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {resultados.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => { setJugadorSel(j); setQuery(''); setResultados([]) }}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 transition-colors text-left"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</span>
                          {!j.cuentaActiva && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 shrink-0">Sin cuenta</span>}
                        </div>
                        {j.dni && <span className="text-xs text-slate-400 shrink-0 ml-2">DNI {j.dni}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {query.trim().length >= 2 && !buscando && resultados.length === 0 && !altaRapida && (
                  <div className="mt-1.5 flex items-center justify-between px-1">
                    <p className="text-xs text-slate-400">No encontrado en el sistema</p>
                    <button
                      type="button"
                      onClick={() => {
  const q = query.trim()
  const esDni = /^\d{1,8}$/.test(q)
  setAltaRapida(true)
  setAltaForm({ nombre: esDni ? '' : q, apellido: '', dni: esDni ? q : '' })
  setAltaErrors({ nombre: '', apellido: '', dni: '' })
}}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      + Dar de alta rápida
                    </button>
                  </div>
                )}
                {altaRapida && (
                  <div className="mt-2 p-3 border border-emerald-200 bg-emerald-50 rounded-xl flex flex-col gap-2">
                    <p className="text-xs font-semibold text-emerald-700">Alta rápida de jugador</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          placeholder="Nombre *"
                          value={altaForm.nombre}
                          onChange={(e) => {
                            const raw = e.target.value
                            const filtered = raw.replace(/[0-9]/g, '')
                            if (raw !== filtered) showHintNombre('El nombre no puede contener números')
                            setAltaField('nombre', filtered)
                          }}
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.nombre ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                        />
                        {hintNombre && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintNombre}</p>}
                        {altaErrors.nombre && !hintNombre && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.nombre}</p>}
                      </div>
                      <div>
                        <input
                          placeholder="Apellido *"
                          value={altaForm.apellido}
                          onChange={(e) => {
                            const raw = e.target.value
                            const filtered = raw.replace(/[0-9]/g, '')
                            if (raw !== filtered) showHintApellido('El apellido no puede contener números')
                            setAltaField('apellido', filtered)
                          }}
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.apellido ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                        />
                        {hintApellido && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintApellido}</p>}
                        {altaErrors.apellido && !hintApellido && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.apellido}</p>}
                      </div>
                    </div>
                    <div>
                      <input
                        placeholder="DNI (7 u 8 dígitos) *"
                        value={altaForm.dni}
                        maxLength={8}
                        inputMode="numeric"
                        onChange={(e) => setAltaField('dni', e.target.value.replace(/\D/g, ''))}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.dni ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                      />
                      {altaErrors.dni && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.dni}</p>}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => { setAltaRapida(false); setAltaErrors({ nombre: '', apellido: '', dni: '' }) }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                      <button
                        type="button"
                        onClick={handleAltaRapida}
                        disabled={altaGuardando}
                        className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50"
                      >
                        {altaGuardando ? 'Guardando...' : 'Crear y seleccionar'}
                      </button>
                    </div>
                  </div>
                )}
                {errorNombre && (
                  <p className="mt-1.5 text-xs text-red-500 px-1 font-medium">
                    Seleccioná un jugador del buscador o usá "+ Dar de alta rápida"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Monto + pago (no aplica a clases) */}
        {form.tipo !== 'clase' && (
          <>
            <div>
              <Input
                label="Monto (ARS)"
                type="number"
                value={form.monto}
                onChange={(e) => set('monto', e.target.value)}
              />
              {Number(form.monto) !== (cancha.precioTurno ?? 0) && (
                <p className="mt-1.5 text-xs text-amber-600 px-1 font-medium">
                  ⚠️ Distinto al precio de la cancha (${(cancha.precioTurno ?? 0).toLocaleString('es-AR')})
                </p>
              )}
            </div>
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

        {/* Helper contextual */}
        <InfoBlock label="¿Cómo funciona esta reserva?" variant="light">
          {form.tipo === 'eventual' && <p><span className="font-medium text-slate-700">Eventual</span> — reserva puntual para un solo día. El jugador queda registrado en la grilla y recibe una notificación si tiene cuenta en el sistema.</p>}
          {form.tipo === 'fijo' && <p><span className="font-medium text-slate-700">Turno fijo</span> — se repite cada semana en este horario hasta que el admin lo dé de baja. Aparece en la grilla todos los {new Date().toLocaleDateString('es-AR', { weekday: 'long' })}.</p>}
          {form.tipo === 'clase' && <p><span className="font-medium text-slate-700">Clase</span> — franja reservada para actividad con profesor. No requiere jugador registrado. Aparece en la grilla como referencia.</p>}
          <p>El campo <span className="font-medium text-slate-700">"A nombre de"</span> busca jugadores registrados en el club. Si no está registrado, escribí el nombre libremente.</p>
        </InfoBlock>
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

      {modalBusqueda && (
        <ModalBusquedaJugadores
          adminToken={adminToken}
          onSelect={(j) => { setJugadorSel(j); setQuery(''); setResultados([]) }}
          onClose={() => setModalBusqueda(false)}
        />
      )}
    </div>
  )
}

// ─── Panel lateral — Formulario bloqueo ──────────────────────────────────────

const FormBloqueo = ({ franja, cancha, franjas = [], onSave, onCancel }) => {
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
    <div className="flex flex-col">
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

      <div className="px-5 py-4 flex flex-col gap-4">
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
            {franjas.filter((f) => f.inicio >= franja.inicio).map((f) => (
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

const DetalleReserva = ({ reserva, onCancelar, onPago, onClose, onAprobar, onCheckout }) => {
  const tipoCfg = TIPO_CONFIG[reserva.tipo]
  const pagoCfg = reserva.pago ? PAGO_CONFIG[reserva.pago] : null
  const estadoCfg = ESTADO_CONFIG[reserva.estado]
  // Turno ya terminó: bloquear acciones destructivas para preservar historial y cargos.
  // Cruce de medianoche: si fin <= inicio (ej. 23:30→01:00, o 22:30→00:00) el turno termina al
  // día siguiente (+1440 min) → no se marca terminado durante su propia jornada.
  const yaTermino = (() => {
    if (!reserva.fecha || !reserva.fin) return false
    const hoy = todayISO()
    if (reserva.fecha < hoy) return true
    if (reserva.fecha > hoy) return false
    let finMin = toMin(reserva.fin)
    if (finMin <= toMin(reserva.inicio || '00:00')) finMin += 1440
    return finMin <= toMin(horaActual())
  })()

  return (
    <div className="flex flex-col">
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
          {reserva.tipo === 'fijo' && (
            <div className="flex items-center gap-2 text-sm">
              <Repeat size={14} className="text-violet-400 shrink-0" />
              <span className="text-violet-600 font-medium text-xs">Turno fijo semanal</span>
            </div>
          )}
        </div>

        {/* Clase del profesor */}
        {reserva.tipo === 'clase' && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-orange-500 shrink-0" />
              <span className="text-orange-700 font-semibold text-sm">
                {reserva.profesor
                  ? `Clase · ${reserva.profesor.nombre} ${reserva.profesor.apellido}`
                  : (reserva.profesorNombre ? `Clase · ${reserva.profesorNombre}` : 'Clase')}
              </span>
            </div>
            {(reserva.nota || reserva.notas) && (
              <p className="text-orange-500 text-xs">{reserva.nota || reserva.notas}</p>
            )}
          </div>
        )}

        {/* Bloqueo */}
        {reserva.tipo === 'bloqueado' && (
          <div className="border rounded-xl p-4 bg-red-50 border-red-100">
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
          {yaTermino && (
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-slate-500 text-xs">El turno ya finalizó. No se puede cancelar para preservar el historial y los cargos.</p>
            </div>
          )}
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
          {(reserva._backendId || reserva.tipo === 'fijo') && reserva.estado === 'confirmada' && onCheckout && (
            <button
              onClick={() => onCheckout(reserva)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              <DollarSign size={14} /> {reserva.pago === 'pagado' || reserva.pago === 'en_cuenta' ? 'Agregar consumo' : reserva.pago === 'parcial' ? 'Cobrar resto' : 'Cobrar turno'}
            </button>
          )}
          {/* Turno ya pagado: estado + corrección (marcar impago). El cobro se hace SOLO con el botón de arriba. */}
          {reserva.estado === 'confirmada' && reserva.pago === 'pagado' && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle size={13} /> Turno pagado{reserva.pagadoSimple && reserva.metodoPago ? ` · ${METODO_MAP[reserva.metodoPago]?.label ?? reserva.metodoPago}` : reserva.pagadoSimple ? '' : ' · por cuenta'}
              </span>
              {reserva.pagadoSimple
                ? <button onClick={() => onPago(reserva.id, null)} className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors">Marcar impago</button>
                : <span className="text-[11px] text-slate-300">se corrige en Pagos</span>}
            </div>
          )}
          <button
            onClick={() => !yaTermino && onCancelar(reserva.id)}
            disabled={yaTermino}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              yaTermino
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                : 'border-red-200 text-red-500 hover:bg-red-50'
            }`}
          >
            <Ban size={14} />
            {reserva.tipo === 'fijo' ? 'Liberar este día' : 'Cancelar reserva'}
          </button>
        </div>
      )}

      {/* Acciones — clase */}
      {reserva.tipo === 'clase' && (
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">
          {yaTermino && (
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-slate-500 text-xs">La clase ya finalizó. No se puede cancelar.</p>
            </div>
          )}
          <button
            onClick={() => !yaTermino && onCancelar(reserva.id)}
            disabled={yaTermino}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              yaTermino
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                : 'border-red-200 text-red-500 hover:bg-red-50'
            }`}
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

const PanelContent = ({ seleccion, fecha, franjas = [], onSave, onBloquear, onCancelar, onPago, onClose, onCheckout }) => {
  const [modo, setModo] = useState('reserva')

  if (!seleccion) return null
  const { tipo, reserva, franja, cancha } = seleccion

  const handleSaveReserva = (data) => { onSave({ id: Date.now(), fecha, canchaNombre: cancha.nombre, ...data }) }
  const handleSaveBloqueo = (data) => { onBloquear({ id: Date.now(), fecha, canchaNombre: cancha.nombre, ...data }) }

  if (tipo === 'detalle') {
    return <DetalleReserva reserva={reserva} onCancelar={onCancelar} onPago={onPago} onClose={onClose} onCheckout={onCheckout} />
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
        : <FormBloqueo franja={franja} cancha={cancha} franjas={franjas} onSave={handleSaveBloqueo} onCancel={onClose} />
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
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-slate-500 text-xs font-medium">Tipo de reserva:</span>
      {[
        { dot: 'bg-violet-500',  label: 'Fijo'      },
        { dot: 'bg-blue-500',    label: 'Eventual'  },
        { dot: 'bg-emerald-500', label: 'Online'    },
        { dot: 'bg-red-400',     label: 'Bloqueado' },
        { dot: 'bg-orange-400',  label: 'Clase'     },
        { dot: 'bg-slate-300',   label: 'Libre'     },
      ].map(({ dot, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className="text-slate-400 text-xs">{label}</span>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
      <span className="text-slate-500 text-xs font-medium">Estado de pago:</span>
      {Object.entries(PAGO_CONFIG).map(([, { label, cls }]) => (
        <Badge key={label} label={label} cls={cls} />
      ))}
    </div>
  </div>
)

// ─── Editar reserva ───────────────────────────────────────────────────────────

const EditarReserva = ({ reserva, onSave, onCancel }) => {
  const adminToken = useAuthStore((s) => s.token)
  const [form, setForm] = useState({
    monto: reserva.monto ?? 0,
    // El form solo edita pagado/pendiente; 'en_cuenta'/'debe' son estados derivados → normalizar
    pago: reserva.pago === 'pagado' ? 'pagado' : 'pendiente',
    metodoPago: reserva.metodoPago ?? 'Efectivo',
    notas: reserva.notas ?? '',
  })
  const [query, setQuery] = useState(reserva.jugadores?.[0] ?? '')
  const [jugadorSel, setJugadorSel] = useState(null)
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [errorNombre, setErrorNombre] = useState(false)
  const [modalBusqueda, setModalBusqueda] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [altaForm, setAltaForm] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaErrors, setAltaErrors] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaGuardando, setAltaGuardando] = useState(false)
  const [hintNombre, showHintNombre] = useFieldHint()
  const [hintApellido, showHintApellido] = useFieldHint()
  const [hintQuery, showHintQuery] = useFieldHint()

  const setAltaField = (k, v) => {
    setAltaForm((p) => ({ ...p, [k]: v }))
    setAltaErrors((p) => ({ ...p, [k]: '' }))
  }

  const handleAltaRapida = async () => {
    const errs = { nombre: '', apellido: '', dni: '' }
    if (!altaForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    else if (/\d/.test(altaForm.nombre)) errs.nombre = 'El nombre no puede contener números'
    if (!altaForm.apellido.trim()) errs.apellido = 'El apellido es obligatorio'
    else if (/\d/.test(altaForm.apellido)) errs.apellido = 'El apellido no puede contener números'
    if (!altaForm.dni.trim()) errs.dni = 'El DNI es obligatorio'
    else if (!/^\d{7,8}$/.test(altaForm.dni.trim())) errs.dni = 'El DNI debe tener 7 u 8 dígitos'
    if (errs.nombre || errs.apellido || errs.dni) { setAltaErrors(errs); return }
    setAltaGuardando(true)
    try {
      const nuevo = await api.post('/jugadores', altaForm, { Authorization: `Bearer ${adminToken}` })
      setJugadorSel(nuevo); setQuery(''); setResultados([]); setAltaRapida(false)
      setAltaForm({ nombre: '', apellido: '', dni: '' }); setAltaErrors({ nombre: '', apellido: '', dni: '' })
    } catch (err) { setAltaErrors((p) => ({ ...p, dni: err.message || 'No se pudo dar de alta' })) }
    finally { setAltaGuardando(false) }
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (jugadorSel) { setResultados([]); return }
    if (!query || query.trim().length < 2) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const data = await api.get(`/jugadores/buscar?q=${encodeURIComponent(query.trim())}`, { Authorization: `Bearer ${adminToken}` })
        setResultados(Array.isArray(data) ? data : [])
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, jugadorSel, adminToken])

  const handleSave = () => {
    if (!jugadorSel) {
      setErrorNombre(true)
      return
    }
    onSave(reserva.id, {
      jugadores: [`${jugadorSel.nombre} ${jugadorSel.apellido}`],
      jugadorId: jugadorSel.id,
      monto: Number(form.monto),
      pago: form.pago,
      metodoPago: form.metodoPago,
      notas: form.notas,
    })
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-bold text-base">Editar reserva</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {reserva.canchaNombre} · {reserva.inicio}–{reserva.fin}
          </p>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        {/* A nombre de */}
        <div>
          <FieldLabel>A nombre de <span className="text-red-400">*</span></FieldLabel>
          {jugadorSel ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border border-emerald-300 bg-emerald-50 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800 truncate">{jugadorSel.nombre} {jugadorSel.apellido}</p>
                {jugadorSel.dni && <p className="text-xs text-emerald-600">DNI {jugadorSel.dni}</p>}
              </div>
              <button type="button" onClick={() => { setJugadorSel(null); setQuery('') }} className="text-emerald-400 hover:text-emerald-600 shrink-0">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className={`relative ${errorNombre ? 'animate-shake' : ''}`} onAnimationEnd={() => {}}>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={query}
                  onChange={(e) => {
                    const raw = e.target.value
                    const esSoloDni = /^\d+$/.test(raw)
                    if (esSoloDni && raw.length > 8) { showHintQuery('El DNI tiene máximo 8 dígitos'); return }
                    setQuery(raw); setErrorNombre(false)
                  }}
                  className={`flex-1 border rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:ring-2 ${
                    errorNombre
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setModalBusqueda(true)}
                  title="Búsqueda avanzada"
                  className="shrink-0 px-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                >
                  <Search size={15} />
                </button>
              </div>
              {hintQuery && <p className="text-amber-500 text-xs mt-1 animate-pulse">{hintQuery}</p>}
              {buscando && (
                <div className="absolute right-12 top-3 w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-400 rounded-full animate-spin" />
              )}
              {(resultados.length > 0 || buscando) && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {buscando && <p className="px-3 py-2 text-xs text-slate-400">Buscando...</p>}
                  {resultados.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => { setJugadorSel(j); setQuery(''); setResultados([]) }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 transition-colors text-left border-b border-slate-50 last:border-0"
                    >
                      <span className="text-sm font-medium text-slate-700">{j.nombre} {j.apellido}</span>
                      {j.dni && <span className="text-xs text-slate-400 shrink-0">DNI {j.dni}</span>}
                    </button>
                  ))}
                  {!buscando && resultados.length === 0 && query.trim().length >= 2 && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-slate-400 mb-1">No encontrado en el sistema</p>
                      <button
                        type="button"
                        onClick={() => setAltaRapida((v) => !v)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        <span>+</span> Dar de alta rápida
                      </button>
                    </div>
                  )}
                </div>
              )}
              {errorNombre && (
                <p className="mt-1.5 text-xs text-red-500 px-1 font-medium">Seleccioná un jugador del buscador o usá "+ Dar de alta rápida"</p>
              )}
            </div>
          )}
          {altaRapida && !jugadorSel && (
            <div className="mt-2 p-3 border border-emerald-200 bg-emerald-50 rounded-xl flex flex-col gap-2">
              <p className="text-xs font-semibold text-emerald-800">Alta rápida de jugador</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={altaForm.nombre}
                    onChange={(e) => {
                      const raw = e.target.value
                      const filtered = raw.replace(/[0-9]/g, '')
                      if (raw !== filtered) showHintNombre('El nombre no puede contener números')
                      setAltaField('nombre', filtered)
                    }}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.nombre ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                  />
                  {hintNombre && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintNombre}</p>}
                  {altaErrors.nombre && !hintNombre && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.nombre}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Apellido *"
                    value={altaForm.apellido}
                    onChange={(e) => {
                      const raw = e.target.value
                      const filtered = raw.replace(/[0-9]/g, '')
                      if (raw !== filtered) showHintApellido('El apellido no puede contener números')
                      setAltaField('apellido', filtered)
                    }}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.apellido ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                  />
                  {hintApellido && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintApellido}</p>}
                  {altaErrors.apellido && !hintApellido && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.apellido}</p>}
                </div>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="DNI * (7 u 8 dígitos)"
                  value={altaForm.dni}
                  maxLength={8}
                  inputMode="numeric"
                  onChange={(e) => setAltaField('dni', e.target.value.replace(/\D/g, ''))}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.dni ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`}
                />
                {altaErrors.dni && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.dni}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAltaRapida}
                  disabled={altaGuardando}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  {altaGuardando ? 'Guardando...' : 'Dar de alta y seleccionar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAltaRapida(false); setAltaForm({ nombre: '', apellido: '', dni: '' }); setAltaErrors({ nombre: '', apellido: '', dni: '' }) }}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <Input label="Monto (ARS)" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Estado de pago" value={form.pago} onChange={(e) => set('pago', e.target.value)}>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="debe">Debe</option>
          </Select>
          <Select label="Método de pago" value={form.metodoPago} onChange={(e) => set('metodoPago', e.target.value)}>
            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>

        <div>
          <FieldLabel>Notas</FieldLabel>
          <textarea
            rows={2}
            value={form.notas}
            onChange={(e) => set('notas', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none placeholder:text-slate-300"
          />
        </div>

        <InfoBlock label="¿Qué datos puedo editar?" variant="light">
          <p>Podés cambiar el jugador asignado, el monto, el estado de pago y las notas. El horario y la cancha no se modifican desde aquí.</p>
          <p>Si el jugador está registrado en el sistema, buscalo por nombre o DNI para vincularlo correctamente y que reciba notificaciones.</p>
        </InfoBlock>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
        >
          <Save size={14} />
          Guardar
        </button>
      </div>

      {modalBusqueda && (
        <ModalBusquedaJugadores
          adminToken={adminToken}
          onSelect={(j) => { setJugadorSel(j); setQuery(''); setResultados([]) }}
          onClose={() => setModalBusqueda(false)}
        />
      )}
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
  onReservasPendientesChange, onSolicitudFijoClick,
}) => {
  const toast = useToast()
  const [modalNotif, setModalNotif] = useState(null)
  const [aprobandoId, setAprobandoId] = useState(null)
  const [toastPanel, setToastPanel] = useState(null)
  const updateTurnoFijoPanel = useTurnosFijosStore((s) => s.updateTurnoFijo)
  const { addReservaConfirmada, addAusenciaConfirmada } = usePlayerNotificationsStore()

  const showPanelToast = (msg, tipo = 'ok') => {
    setToastPanel({ msg, tipo })
    setTimeout(() => setToastPanel(null), 3000)
  }

  // Notificaciones que NO son reservas normales (esas las manejamos directo desde backend).
  // `stock_bajo` es un aviso de inventario (no de jugadores): va a la campana del Navbar, no a este panel.
  const notifFiltradas = notificaciones.filter((n) =>
    n.tipo !== 'nueva_reserva' && n.tipo !== 'inscripcion_torneo' && n.tipo !== 'baja_torneo' && n.tipo !== 'actualizacion_torneo' && n.tipo !== 'stock_bajo'
  )
  const sinLeer = notificaciones.filter((n) => !n.leida && n.tipo !== 'nueva_reserva' && n.tipo !== 'stock_bajo').length

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
      toast.error(err.message || 'No se pudo aprobar la reserva')
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
      toast.error(err.message || 'No se pudo rechazar la reserva')
    }
    setAprobandoId(null)
  }

  // Aprobar desde el modal de notificación (turno fijo o liberación)
  const handleAprobar = async (notifId) => {
    const notif = modalNotif

    if (notif?.tipo === 'solicitud_turno_fijo' && notif.turnoFijoId) {
      try {
        const updated = await api.patch(
          `/turnos-fijos/${notif.turnoFijoId}/estado`,
          { estado: 'confirmado' },
          { Authorization: `Bearer ${panelAdminToken}` }
        )
        updateTurnoFijoPanel(notif.turnoFijoId, {
          estado: 'confirmado',
          activo: true,
          desde: updated.desde,
        })
        onReservasPendientesChange?.()
        showPanelToast(`Turno fijo de ${notif.jugador || 'jugador'} confirmado`)
      } catch { updateTurnoFijoPanel(notif.turnoFijoId, { estado: 'confirmado', activo: true }) }
    }

    if (notif?.tipo === 'liberacion_turno' && notif.turnoFijoId && notif.fecha) {
      try {
        const updated = await api.patch(`/turnos-fijos/${notif.turnoFijoId}/ausencia/${notif.fecha}`, {}, { Authorization: `Bearer ${panelAdminToken}` })
        if (updated) updateTurnoFijoPanel(notif.turnoFijoId, {
          diasAusentes: updated.diasAusentes ?? [],
          ausenciasPendientes: updated.ausenciasPendientes ?? [],
          diasAusentesJugador: updated.diasAusentesJugador ?? [],
        })
      } catch { /* ignore */ }
      addAusenciaConfirmada?.({ canchaNombre: notif.cancha, fecha: notif.fecha, inicio: notif.inicio, fin: notif.fin })
      onLiberacionAprobada?.(notif.fecha)
      onReservasPendientesChange?.()
    }

    onEliminar(notifId, panelAdminToken)
    setModalNotif(null)
  }

  const handleRechazar = async (id) => {
    const notif = modalNotif
    if (notif?.tipo === 'solicitud_turno_fijo' && notif.turnoFijoId) {
      try {
        await api.patch(
          `/turnos-fijos/${notif.turnoFijoId}/estado`,
          { estado: 'inactivo' },
          { Authorization: `Bearer ${panelAdminToken}` }
        )
        updateTurnoFijoPanel(notif.turnoFijoId, { estado: 'inactivo', activo: false })
        showPanelToast(`Solicitud de ${notif.jugador || 'jugador'} rechazada`, 'error')
      } catch { /* ignore */ }
    }
    onEliminar(id, panelAdminToken)
    setModalNotif(null)
  }

  return (
    <>
      {/* Toast interno del panel */}
      {toastPanel && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toastPanel.tipo === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}>
          {toastPanel.tipo === 'error' ? <XCircle size={15} /> : <CheckCircle size={15} />}
          {toastPanel.msg}
        </div>
      )}

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
          <div className="flex items-center gap-2">
            {reservasPendientes.length > 1 && (
              <button
                onClick={() => reservasPendientes.forEach((r) => handleAprobarReserva(r))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                <CheckCircle size={13} />
                Aprobar todas ({reservasPendientes.length})
              </button>
            )}
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
        </div>

        {/* Lista con scroll interno — muestra ~2 avisos y el resto scrollea (no ocupa tanto) */}
        <div className="max-h-32 overflow-y-auto">

        {/* Reservas pendientes desde el backend — fuente de verdad */}
        {reservasPendientes.length > 0 && (
          <div className="divide-y divide-slate-50 border-b border-slate-100">
            {reservasPendientes.map((r) => {
              const jugadorNombre = r.jugador ? `${r.jugador.nombre} ${r.jugador.apellido}` : ''
              const fechaFmt = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
              const cargando = aprobandoId === r.id
              return (
                <div key={r.id} className="px-5 py-2.5 flex items-center gap-3 bg-blue-50/40">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-xs font-medium leading-tight">
                      <span className="text-blue-600 font-semibold">Nueva reserva</span>
                      {jugadorNombre && <span className="text-slate-700"> · {jugadorNombre}</span>}
                      {r.precio && <span className="text-slate-400"> · ${Number(r.precio).toLocaleString('es-AR')}</span>}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{r.cancha?.nombre} · {r.horaInicio}–{r.horaFin} · {fechaFmt}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={cargando}
                      onClick={() => handleAprobarReserva(r)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={11} />
                      {cargando ? '…' : 'Aprobar'}
                    </button>
                    <button
                      disabled={cargando}
                      onClick={() => handleRechazarReserva(r)}
                      className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-[11px] font-semibold hover:bg-red-200 transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
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
            const esCancelFijoJugador = n.tipo === 'turno_fijo_cancelado_jugador'
            const esRetiroSolicitud = n.tipo === 'turno_fijo_retirado_jugador'
            const esReservaAuto = n.tipo === 'reserva_autoconfirmada'
            const esTurnoFijoAuto = n.tipo === 'turno_fijo_autoconfirmado'
            const esTurnoLiberadoAuto = n.tipo === 'turno_liberado_auto'
            const dotColor = n.leida ? 'bg-slate-300'
              : esSolicitudFijo ? 'bg-amber-500'
              : esTurnoFijoAuto ? 'bg-violet-500'
              : esReservaAuto ? 'bg-emerald-500'
              : esTurnoLiberadoAuto ? 'bg-red-500'
              : esNuevaClaseProf ? 'bg-orange-400'
              : esCancelClaseProf ? 'bg-orange-600'
              : 'bg-red-500'
            const rowBg = n.leida ? ''
              : esSolicitudFijo ? 'bg-amber-50/40'
              : esTurnoFijoAuto ? 'bg-violet-50/40'
              : esReservaAuto ? 'bg-emerald-50/40'
              : esTurnoLiberadoAuto ? 'bg-red-50/40'
              : esNuevaClaseProf || esCancelClaseProf ? 'bg-orange-50/40'
              : 'bg-red-50/30'
            const esClickeable = (esLiberacion || esSolicitudFijo) && !n.leida
            const fechaReserva = n.fecha
              ? new Date(n.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
              : new Date(n.timestamp).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const tsTime = new Date(n.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={n.id}
                onClick={esClickeable ? () => { esSolicitudFijo ? onSolicitudFijoClick?.(n) : setModalNotif(n) } : undefined}
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
                        <p className="text-amber-400 text-[10px] mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />
                          Clic para ir a Turnos fijos y aprobar
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
                  {esCancelFijoJugador && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-slate-600 font-semibold">Turno fijo cancelado</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {DIAS_LABEL[n.dia] ?? n.dia}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-1">El jugador canceló su turno fijo permanentemente</p>
                    </>
                  )}
                  {esRetiroSolicitud && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-slate-500 font-semibold">Solicitud retirada</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {n.cancha} · {n.inicio}–{n.fin} · {DIAS_LABEL[n.dia] ?? n.dia}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-1">El jugador retiró su solicitud de turno fijo antes de ser aprobada</p>
                    </>
                  )}
                  {esReservaAuto && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-emerald-600 font-semibold">Reserva confirmada automáticamente</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                        {n.precio && <span className="text-slate-400 font-normal"> · ${Number(n.precio).toLocaleString('es-AR')}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}</p>
                    </>
                  )}
                  {esTurnoFijoAuto && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-violet-600 font-semibold">Turno fijo confirmado automáticamente</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                        {n.precio && <span className="text-slate-400 font-normal"> · ${Number(n.precio).toLocaleString('es-AR')}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{n.cancha} · {n.inicio}–{n.fin} · semanal · {DIAS_LABEL[n.dia] ?? n.dia}</p>
                    </>
                  )}
                  {esTurnoLiberadoAuto && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-red-600 font-semibold">Turno liberado automáticamente</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{n.cancha} · {n.inicio}–{n.fin} · {fechaReserva} · el jugador avisó que no asiste</p>
                    </>
                  )}
                  {!esSolicitudFijo && !esLiberacion && !esCancelacion && !esNuevaClaseProf && !esCancelClaseProf && !esCancelFijoJugador && !esRetiroSolicitud && !esReservaAuto && !esTurnoFijoAuto && !esTurnoLiberadoAuto && (
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
        </div>{/* /scroll container */}
      </div>
    </>
  )
}

// ─── Tab turnos fijos ─────────────────────────────────────────────────────────


const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const DIAS_INDEX = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
}

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const getProximaFechaTurno = (diaKey, horaInicio) => {
  const ahora = new Date()
  const target = DIAS_INDEX[diaKey]
  if (ahora.getDay() === target) {
    const [h, m] = horaInicio.split(':').map(Number)
    if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) {
      // Hoy y la hora aún no pasó → es hoy
      return ahora.toISOString().split('T')[0]
    }
  }
  const base = new Date(ahora)
  base.setHours(0, 0, 0, 0)
  const diff = (target - base.getDay() + 7) % 7
  base.setDate(base.getDate() + (diff === 0 ? 7 : diff))
  return base.toISOString().split('T')[0]
}

const fmtFechaCorta = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const diaNombre = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][fecha.getDay()]
  return `${DIAS_LABEL[diaNombre]} ${d} ${MESES_CORTOS[m - 1]}`
}

const TabTurnosFijos = ({ canchas = [], franjas = [] }) => {
  const turnosFijosJugadores = useTurnosFijosStore((s) => s.turnosFijos)
  const liberarTurno = useTurnosFijosStore((s) => s.liberarTurno)
  const updateTurnoFijo = useTurnosFijosStore((s) => s.updateTurnoFijo)
  const adminToken = useAuthStore((s) => s.token)
  const notificaciones = useNotificacionesStore((s) => s.notificaciones)
  const marcarLeida = useNotificacionesStore((s) => s.marcarLeida)
  const fijos = turnosFijosJugadores.filter((t) => t.activo)
  const pendientes = turnosFijosJugadores.filter((t) => t.estado === 'pendiente')
  const hoy = todayISO()

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroDia, setFiltroDia] = useState('')
  const [filtroCancha, setFiltroCancha] = useState('')

  const diasEnUso = useMemo(() => {
    const set = new Set(fijos.map((t) => t.dia))
    return ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].filter((d) => set.has(d))
  }, [fijos])

  const canchasEnUso = useMemo(() => {
    const map = new Map()
    fijos.forEach((t) => { if (t.canchaNombre) map.set(t.canchaNombre, t.canchaNombre) })
    return [...map.keys()].sort()
  }, [fijos])

  const fijosFiltrados = useMemo(() => {
    const q = filtroBusqueda.trim().toLowerCase()
    return fijos.filter((t) => {
      if (q && !(t.jugador || '').toLowerCase().includes(q)) return false
      if (filtroDia && t.dia !== filtroDia) return false
      if (filtroCancha && t.canchaNombre !== filtroCancha) return false
      return true
    })
  }, [fijos, filtroBusqueda, filtroDia, filtroCancha])

  const [confirmarBaja, setConfirmarBaja] = useState(null)
  const [confirmarBajaDefinitiva, setConfirmarBajaDefinitiva] = useState(null) // { turno, errorDeuda }
  const [procesandoBaja, setProcesandoBaja] = useState(false)
  const [errorConfirmarTF, setErrorConfirmarTF] = useState(null) // { turnoId, mensaje }
  const [aprobandoTFId, setAprobandoTFId] = useState(null)
  const [rechazandoTFId, setRechazandoTFId] = useState(null)

  const marcarNotifTurnoFijoLeida = (turnoFijoId) => {
    const notif = notificaciones.find((n) => n.turnoFijoId === turnoFijoId && !n.leida)
    if (notif) marcarLeida(notif.id, adminToken)
  }

  const handleAprobarTurnoFijo = async (id) => {
    if (aprobandoTFId === id) return
    setErrorConfirmarTF(null)
    setAprobandoTFId(id)
    try {
      const updated = await api.patch(`/turnos-fijos/${id}/estado`, { estado: 'confirmado' }, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(id, { estado: 'confirmado', activo: true, desde: updated.desde })
      marcarNotifTurnoFijoLeida(id)
    } catch (err) {
      const msg = err?.error || err?.message || 'No se pudo confirmar el turno fijo'
      setErrorConfirmarTF({ turnoId: id, mensaje: msg })
    } finally {
      setAprobandoTFId(null)
    }
  }

  const handleRechazarTurnoFijo = async (id) => {
    if (rechazandoTFId === id) return
    setRechazandoTFId(id)
    try {
      await api.patch(`/turnos-fijos/${id}/estado`, { estado: 'inactivo' }, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(id, { estado: 'inactivo', activo: false })
      marcarNotifTurnoFijoLeida(id)
    } catch { /* ignore */ }
    finally {
      setRechazandoTFId(null)
    }
  }

  const handleDarDeBajaTurnoFijo = async () => {
    if (!confirmarBajaDefinitiva?.turno) return
    const { turno } = confirmarBajaDefinitiva
    setProcesandoBaja(true)
    try {
      await api.patch(`/turnos-fijos/${turno.id}/estado`, { estado: 'inactivo' }, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(turno.id, { estado: 'inactivo', activo: false })
      marcarNotifTurnoFijoLeida(turno.id)
      setConfirmarBajaDefinitiva(null)
    } catch (err) {
      const msg = err?.error || err?.message || 'Error al dar de baja'
      setConfirmarBajaDefinitiva((prev) => ({ ...prev, errorDeuda: msg }))
    } finally {
      setProcesandoBaja(false)
    }
  }

  const handleLiberarTurnoFijo = async () => {
    if (!confirmarBaja) return
    const fecha = getProximaFechaTurno(confirmarBaja.dia, confirmarBaja.inicio)
    try {
      const updated = await api.patch(
        `/turnos-fijos/${confirmarBaja.id}/ausencia/${fecha}`,
        {},
        { Authorization: `Bearer ${adminToken}` }
      )
      updateTurnoFijo(confirmarBaja.id, {
        diasAusentes: updated.diasAusentes,
        ausenciasPendientes: updated.ausenciasPendientes,
      })
    } catch { /* ignore */ }
    setConfirmarBaja(null)
  }

  const handleConfirmarAusenciaAdmin = async (turnoId, fecha) => {
    try {
      const updated = await api.patch(`/turnos-fijos/${turnoId}/ausencia/${fecha}`, {}, { Authorization: `Bearer ${adminToken}` })
      updateTurnoFijo(turnoId, { diasAusentes: updated.diasAusentes, ausenciasPendientes: updated.ausenciasPendientes })
      fetchReservasBackend()
    } catch { /* fallback */ updateTurnoFijo(turnoId, { diasAusentes: [...(turnosFijosJugadores.find(t=>t.id===turnoId)?.diasAusentes??[]), fecha] }) }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Modal confirmación baja turno fijo ── */}
      {confirmarBaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmarBaja(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Trash2 size={15} className="text-amber-500" />
              </div>
              <div>
                <p className="text-slate-800 font-bold text-sm">¿Liberar el turno de esta semana?</p>
                <p className="text-slate-400 text-xs mt-0.5">El turno fijo seguirá activo para las próximas semanas</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed space-y-1">
                <p><span className="font-semibold text-slate-700">Jugador:</span> {confirmarBaja.jugador}</p>
                <p><span className="font-semibold text-slate-700">Cancha:</span> {confirmarBaja.canchaNombre}</p>
                <p><span className="font-semibold text-slate-700">Horario:</span> {confirmarBaja.inicio} a {confirmarBaja.fin}</p>
                <p><span className="font-semibold text-slate-700">Fecha liberada:</span> {fmtFechaCorta(getProximaFechaTurno(confirmarBaja.dia, confirmarBaja.inicio))}</p>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                El slot quedará disponible para reserva eventual. El jugador recibirá una notificación.
              </p>
              <button
                onClick={handleLiberarTurnoFijo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                <Trash2 size={14} />
                Liberar turno
              </button>
              <button
                onClick={() => setConfirmarBaja(null)}
                className="text-slate-400 hover:text-slate-600 text-xs text-center transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal baja definitiva ── */}
      {confirmarBajaDefinitiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !procesandoBaja && setConfirmarBajaDefinitiva(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50">
              <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                <Ban size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-red-800 font-bold text-sm">Dar de baja el turno fijo</p>
                <p className="text-red-500 text-xs mt-0.5">Se cancela para todas las semanas futuras</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed space-y-1">
                <p><span className="font-semibold text-slate-700">Jugador:</span> {confirmarBajaDefinitiva.turno.jugador}</p>
                <p><span className="font-semibold text-slate-700">Cancha:</span> {confirmarBajaDefinitiva.turno.canchaNombre}</p>
                <p><span className="font-semibold text-slate-700">Horario:</span> {confirmarBajaDefinitiva.turno.inicio} a {confirmarBajaDefinitiva.turno.fin} · {DIAS_LABEL[confirmarBajaDefinitiva.turno.dia] ?? confirmarBajaDefinitiva.turno.dia}</p>
                <p><span className="font-semibold text-slate-700">Deja de cobrarse desde:</span>{' '}
                  <span className="text-red-600 font-semibold">{fmtFechaCorta(getProximaFechaTurno(confirmarBajaDefinitiva.turno.dia, confirmarBajaDefinitiva.turno.inicio))}</span>
                </p>
              </div>

              {confirmarBajaDefinitiva.errorDeuda ? (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-700 text-xs leading-relaxed">{confirmarBajaDefinitiva.errorDeuda}</p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs leading-relaxed">
                  El jugador recibirá una notificación. Las semanas ya cobradas no se modifican.
                </p>
              )}

              {!confirmarBajaDefinitiva.errorDeuda && (
                <button
                  onClick={handleDarDeBajaTurnoFijo}
                  disabled={procesandoBaja}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Ban size={14} />
                  {procesandoBaja ? 'Procesando…' : 'Confirmar baja definitiva'}
                </button>
              )}
              <button
                onClick={() => !procesandoBaja && setConfirmarBajaDefinitiva(null)}
                className="text-slate-400 hover:text-slate-600 text-xs text-center transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div key={t.id} className="flex flex-col">
                <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-slate-700 text-sm font-medium">{t.jugador || '—'}</p>
                    <p className="text-slate-400 text-xs">{t.canchaNombre} · {DIAS_LABEL[t.dia] ?? t.dia} {t.inicio}–{t.fin}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAprobarTurnoFijo(t.id)}
                      disabled={aprobandoTFId === t.id || rechazandoTFId === t.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aprobandoTFId === t.id ? 'Aprobando…' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => handleRechazarTurnoFijo(t.id)}
                      disabled={rechazandoTFId === t.id || aprobandoTFId === t.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rechazandoTFId === t.id ? 'Rechazando…' : 'Rechazar'}
                    </button>
                  </div>
                </div>
                {errorConfirmarTF?.turnoId === t.id && (
                  <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                    <span className="text-red-500 text-xs font-semibold shrink-0 mt-0.5">⚠</span>
                    <p className="text-red-600 text-xs leading-relaxed">{errorConfirmarTF.mensaje}</p>
                    <button onClick={() => setErrorConfirmarTF(null)} className="ml-auto text-red-400 hover:text-red-600 shrink-0 text-xs">✕</button>
                  </div>
                )}
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
          <span className="text-slate-400 text-xs">
            {fijosFiltrados.length !== fijos.length
              ? `${fijosFiltrados.length} de ${fijos.length}`
              : `${fijos.length} registrados`}
          </span>
        </div>

        {/* Barra de filtros */}
        {fijos.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
            {/* Buscador jugador */}
            <input
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Buscar jugador…"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-300 w-44"
            />

            {/* Chips de día */}
            <div className="flex items-center gap-1">
              {diasEnUso.map((dia) => (
                <button
                  key={dia}
                  onClick={() => setFiltroDia((prev) => prev === dia ? '' : dia)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                    filtroDia === dia
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600',
                  ].join(' ')}
                >
                  {DIAS_LABEL[dia].slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Dropdown cancha (solo si hay más de una) */}
            {canchasEnUso.length > 1 && (
              <select
                value={filtroCancha}
                onChange={(e) => setFiltroCancha(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-violet-300 bg-white"
              >
                <option value="">Todas las canchas</option>
                {canchasEnUso.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Limpiar filtros */}
            {(filtroBusqueda || filtroDia || filtroCancha) && (
              <button
                onClick={() => { setFiltroBusqueda(''); setFiltroDia(''); setFiltroCancha('') }}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors ml-1"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {fijos.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No hay turnos fijos aprobados aún</div>
        ) : fijosFiltrados.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">Sin resultados para los filtros aplicados</div>
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
                {fijosFiltrados.map((t) => (
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
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setConfirmarBaja(t)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap"
                            title="Liberar este turno para una semana"
                          >
                            <CalendarDays size={10} />
                            Liberar
                          </button>
                          <button
                            onClick={() => setConfirmarBajaDefinitiva({ turno: t, errorDeuda: null })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors whitespace-nowrap"
                            title="Dar de baja definitiva el turno fijo"
                          >
                            <Ban size={10} />
                            Baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ReservasPage = () => {
  const location = useLocation()
  const toastUi = useToast()
  const [fecha, setFecha] = useState(todayISO())
  const [clases, setClases] = useState(CLASES_PROFESOR)
  const [seleccion, setSeleccion] = useState(null)
  const [checkoutReserva, setCheckoutReserva] = useState(null)
  const preparandoCobroRef = useRef(false) // guard anti doble-submit al materializar un turno fijo para cobrar
  const [editando, setEditando] = useState(null)
  const [tabActiva, setTabActiva] = useState(() => location.state?.tab ?? 'grilla')
  const [toast, setToast] = useState(null) // { tipo: 'reserva'|'bloqueo'|'cancelada', msg: '' }

  const showToast = (tipo, msg) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const { notificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion } = useNotificacionesStore()
  const playerReservas = useReservasStore((s) => s.reservas)
  const cancelarReservaStore = useReservasStore((s) => s.cancelarReserva)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)
  const setTurnosFijosAdmin = useTurnosFijosStore((s) => s.setTurnosFijos)
  const ausentarDiaStore = useTurnosFijosStore((s) => s.ausentarDia)
  const updateTurnoFijoAdmin = useTurnosFijosStore((s) => s.updateTurnoFijo)
  const { addReservaCanceladaAdmin, addTurnoFijoLiberadoAdmin } = usePlayerNotificationsStore()

  // Store compartido con el dashboard del profesor
  const reservas = useReservasAdminStore((s) => s.reservas)
  const addReservaAdmin = useReservasAdminStore((s) => s.addReserva)
  const deleteReservaAdmin = useReservasAdminStore((s) => s.deleteReserva)
  const pagarReservaAdmin = useReservasAdminStore((s) => s.pagarReserva)
  const updateReservaAdmin = useReservasAdminStore((s) => s.updateReserva)

  const adminToken = useAuthStore((s) => s.token)
  const clubId = useAuthStore((s) => s.user?.club?.id)
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

  // En admin, siempre mostrar la grilla aunque el día esté cerrado (fallback 08:00-23:00)
  const diaCerradoGeneral = horarios?.[diaNombre]?.activo === false
  const franjasMainGrilla = useMemo(
    () => franjasDia.length > 0 ? franjasDia : generateFranjas({ apertura: '08:00', cierre: '23:00', activo: true }),
    [franjasDia]
  )

  // Una cancha usa sub-grilla SOLO si tiene horario propio activo para el día actual
  const usaHorarioPropioHoy = (c) => c.horarios?.[diaNombre]?.activo === true

  // Canchas sin horario propio activo HOY → grilla principal (usa horario global)
  const canchasSinCustom = useMemo(
    () => canchas.filter((c) => !usaHorarioPropioHoy(c)),
    [canchas, diaNombre]
  )

  // Canchas con horario propio activo HOY → sub-grillas independientes
  const canchasConCustom = useMemo(
    () => canchas.filter((c) => usaHorarioPropioHoy(c)),
    [canchas, diaNombre]
  )

  // Franjas por cancha con horario propio
  const franjasCustomPorCancha = useMemo(
    () => canchasConCustom.map((c) => ({ canchaId: c.id, franjas: generateFranjas(c.horarios?.[diaNombre]) })),
    [canchasConCustom, diaNombre]
  )

  // Reservas reales desde el backend (jugadores que reservaron online)
  const [reservasBackend, setReservasBackend] = useState([])
  const [loadingGrilla, setLoadingGrilla] = useState(true)

  const fetchReservasBackend = (f = fecha, showLoading = false) => {
    if (!adminToken) return
    if (showLoading) setLoadingGrilla(true)
    api.get(`/reservas?fecha=${f}`, { Authorization: `Bearer ${adminToken}` })
      .then((data) => {
        setReservasBackend(Array.isArray(data) ? data : [])
        setLoadingGrilla(false)
      })
      .catch(() => setLoadingGrilla(false))
  }

  useEffect(() => {
    if (!adminToken) return
    setReservasBackend([])
    fetchReservasBackend(fecha, true)  // showLoading=true solo al cambiar fecha, no en polling
    const interval = setInterval(() => { if (!document.hidden) fetchReservasBackend(fecha) }, 30_000)
    const onFocus = () => fetchReservasBackend(fecha)
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
    const interval = setInterval(() => { if (!document.hidden) fetchReservasPendientes() }, 30_000)
    window.addEventListener('focus', fetchReservasPendientes)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', fetchReservasPendientes)
    }
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial de turnos fijos de jugadores al montar (tab Turnos fijos arranca con datos reales)
  useEffect(() => {
    if (!adminToken) return
    api.get('/turnos-fijos', { Authorization: `Bearer ${adminToken}` })
      .then((data) => { if (Array.isArray(data)) setTurnosFijosAdmin(data) })
      .catch(() => {})
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga profesores del club para el formulario de nueva reserva tipo clase
  const setProfesoresStore = useProfesoresStore((s) => s.setProfesores)
  useEffect(() => {
    if (!adminToken) return
    api.get('/profesores', { Authorization: `Bearer ${adminToken}` })
      .then((data) => { if (Array.isArray(data)) setProfesoresStore(data) })
      .catch(() => {})
  }, [adminToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transforma una reserva de la DB al formato de la grilla admin
  const mapBackendReserva = (r) => {
    const precio = r.precio || 0
    // Porciones del turno cobradas/anotadas (Fase 2 split). Fuente: cargos tipo 'reserva'.
    const cuenta = Array.isArray(r.cargosCuenta) ? r.cargosCuenta : []
    const cargosTurno = cuenta.filter((c) => c.tipo === 'reserva')
    const pagadoTurno = (r.pagado ? precio : 0) +
      cargosTurno.filter((c) => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0)
    const aCuentaTurno = cargosTurno.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + c.monto, 0)
    const saldoTurno = Math.max(0, precio - pagadoTurno)               // falta cobrar (incluye lo que está a cuenta)
    const restanteTurno = Math.max(0, precio - pagadoTurno - aCuentaTurno) // falta asignar/cobrar en el checkout

    // Fuente única del estado de pago (lo leen celdas, detalle, leyenda y totales)
    const atribuido = pagadoTurno + aCuentaTurno   // parte del turno ya resuelta (cobrada o a cuenta)
    let pago
    if (r.estado !== 'confirmada') pago = null
    else if (precio > 0 && pagadoTurno >= precio) pago = 'pagado'        // todo cobrado (entró a caja)
    else if (precio > 0 && atribuido >= precio) pago = 'en_cuenta'       // turno cerrado, parte/todo quedó a deber
    else if (r.cobroOmitido && pagadoTurno === 0 && aCuentaTurno === 0) pago = 'en_cuenta' // omitido sin cargos
    else if (pagadoTurno > 0 || aCuentaTurno > 0) pago = 'parcial'       // falta registrar gente (turno abierto)
    else pago = venceCobro(r.fecha, r.horaInicio, r.horaFin) ? 'debe' : 'pendiente'    // impago: dentro/fuera de gracia

    return {
      id: `backend_${r.id}`,
      _backendId: r.id,
      canchaId: r.canchaId,
      canchaNombre: r.cancha?.nombre || '',
      fecha: r.fecha,
      inicio: r.horaInicio,
      fin: r.horaFin,
      tipo: r.tipo || 'online',
      jugadores: r.jugador ? [`${r.jugador.nombre} ${r.jugador.apellido}`] : (r.jugadores ?? []),
      jugadorId: r.jugador?.id ?? r.jugadorId ?? null,
      profesor: r.profesor || null,
      estado: r.estado,
      pago,
      pagadoSimple: !!r.pagado,     // pago completo en la reserva (no split) → permite "marcar impago"
      cobroOmitido: r.cobroOmitido ?? false,
      metodoPago: r.metodoPago ?? null,
      monto: precio,
      pagadoTurno,
      aCuentaTurno,
      saldoTurno,
      restanteTurno,
      cargosCuenta: cuenta,        // desglose para reabrir la cuenta del turno
      notas: r.notas || '',
      creadoPor: 'jugador',
    }
  }

  // Mapea la hora del TF a la franja real de la grilla del club (no el mock hardcodeado)
  const franjaParaHora = (hora) =>
    franjasMainGrilla.find((f) => f.inicio <= hora && hora < f.fin) ||
    franjasMainGrilla.find((f) => f.inicio === hora) ||
    franjasMainGrilla[0]

  // Turnos fijos aprobados → tipo 'fijo' (violeta) en grilla, para el día de semana que corresponde
  // Se excluyen los que ya tienen una Reserva cubriendo ese slot (evita duplicados)
  const diaSemanaFecha = getDiaSemana(fecha)
  const turnosFijosDia = useMemo(() =>
    turnosFijos
      .filter((t) =>
        t.activo &&
        t.dia === diaSemanaFecha &&
        !(t.diasAusentes || []).includes(fecha) &&
        !reservasBackend.some((r) =>
          r.canchaId === t.canchaId &&
          r.estado !== 'cancelada' &&
          overlaps(r.horaInicio, r.horaFin, t.inicio, t.fin)
        )
      )
      .map((t) => ({
        id: `fijo_player_${t.id}`,
        canchaId: t.canchaId,
        fecha,
        inicio: t.inicio,
        fin: t.fin,
        tipo: 'fijo',
        jugadores: [t.jugador || t.canchaNombre],
        // Mismo criterio que una reserva: si el turno ya venció e impago → 'debe' (rojo), si no 'pendiente'.
        pago: venceCobro(fecha, t.inicio, t.fin) ? 'debe' : 'pendiente',
        monto: t.precio,
        estado: 'confirmada',
        notas: 'Turno fijo jugador',
        recurrencia: { dia: t.dia, hasta: '2099-12-31' },
      }))
  , [turnosFijos, diaSemanaFecha, fecha, reservasBackend])

  // Reservas del backend transformadas, excluyendo canceladas y las que ya están en el store local
  const reservasBackendDia = useMemo(
    () => reservasBackend
      .filter((r) => r.estado !== 'cancelada')
      .map(mapBackendReserva),
    [reservasBackend] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reservasDia = useMemo(
    () => [...reservas.filter((r) => r.fecha === fecha), ...reservasBackendDia, ...turnosFijosDia],
    [reservas, fecha, turnosFijosDia, reservasBackendDia]
  )

  // Total de turnos fijos activos para el día de semana, sin descontar ausencias puntuales
  const totalTurnosFijos = useMemo(
    () => turnosFijos.filter((t) => t.activo && t.dia === diaSemanaFecha).length,
    [turnosFijos, diaSemanaFecha]
  )

  // Clases del profesor para el día: extraídas del backend real (reservasDia) en lugar del mock
  const clasesDia = useMemo(
    () => reservasDia.filter((r) => r.tipo === 'clase'),
    [reservasDia]
  )

  const handleCeldaClick = (sel) => {
    setEditando(null)
    setSeleccion(sel)
  }

  const handleSave = async (nueva) => {
    try {
      await api.post('/reservas/admin', {
        canchaId: nueva.canchaId,
        fecha: nueva.fecha,
        horaInicio: nueva.inicio,
        horaFin: nueva.fin,
        tipo: nueva.tipo,
        jugadores: nueva.jugadores ?? [],
        precio: nueva.monto,
        notas: nueva.notas || '',
        esTurnoFijo: nueva.tipo === 'fijo',
        ...(nueva.jugadorId && { jugadorId: nueva.jugadorId }),
      }, { Authorization: `Bearer ${adminToken}` })
      fetchReservasBackend()
      // Refrescar tab Turnos fijos inmediatamente al crear un turno fijo manual
      if (nueva.tipo === 'fijo') {
        api.get('/turnos-fijos', { Authorization: `Bearer ${adminToken}` })
          .then((data) => { if (Array.isArray(data)) setTurnosFijosAdmin(data) })
          .catch(() => {})
      }
      if (nueva.tipo === 'bloqueado') {
        showToast('bloqueo', `Franja bloqueada · ${nueva.canchaNombre} ${nueva.inicio}–${nueva.fin}`)
      } else {
        const jugador = nueva.jugadorNombre || nueva.jugadores?.[0] || 'Sin jugador'
        showToast('reserva', `Reserva creada · ${nueva.canchaNombre} ${nueva.inicio}–${nueva.fin} · ${jugador}`)
      }
    } catch (err) {
      toastUi.error(err.message || 'No se pudo crear la reserva')
    }
    setSeleccion(null)
  }

  const handleAprobarBackend = async (id) => {
    const backendId = String(id).replace('backend_', '')
    try {
      await api.patch(`/reservas/${backendId}/estado`, { estado: 'confirmada' }, { Authorization: `Bearer ${adminToken}` })
      setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, estado: 'confirmada' } : r))
    } catch (err) {
      toastUi.error(err.message || 'No se pudo aprobar la reserva')
    }
    setSeleccion(null)
  }

  // Abre el cobro del turno. Un turno fijo "virtual" (proyección sin Reserva real) se materializa
  // primero en el backend (idempotente) para tener una reserva cobrable, y se cobra igual que una normal.
  const abrirCheckout = async (r) => {
    setSeleccion(null)
    if (r.tipo === 'fijo' && !r._backendId) {
      if (preparandoCobroRef.current) return // evita doble materialización si se toca dos veces rápido
      preparandoCobroRef.current = true
      const tfId = String(r.id).replace('fijo_player_', '')
      try {
        const m = await api.post(`/turnos-fijos/${tfId}/materializar`, { fecha: r.fecha }, { Authorization: `Bearer ${adminToken}` })
        fetchReservasBackend(fecha)
        setCheckoutReserva({
          _backendId: m.id,
          monto: m.monto,
          jugadorId: m.jugadorId,
          jugadores: (m.jugadores?.length ? m.jugadores : r.jugadores) ?? [],
          canchaNombre: m.canchaNombre || r.canchaNombre || '',
          inicio: m.inicio, fin: m.fin,
          pago: venceCobro(r.fecha, r.inicio, r.fin) ? 'debe' : 'pendiente',
          pagadoTurno: 0, saldoTurno: m.monto, cargosCuenta: [],
        })
      } catch (e) {
        toastUi.error(e?.message || 'No se pudo preparar el cobro del turno fijo')
      } finally {
        preparandoCobroRef.current = false
      }
      return
    }
    setCheckoutReserva(r)
  }

  const handleCancelar = (id) => {
    // Reserva del backend: id = 'backend_<reservaId>'
    if (String(id).startsWith('backend_')) {
      const backendId = String(id).replace('backend_', '')
      const reservaRaw = reservasBackend.find((r) => r.id === backendId)
      api.patch(`/reservas/${backendId}/estado`, { estado: 'cancelada' }, { Authorization: `Bearer ${adminToken}` })
        .then(() => {
          setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, estado: 'cancelada' } : r))
          // Si era turno fijo: refrescar store para que diasAusentes se actualice en la grilla
          if (reservaRaw?.esTurnoFijo) {
            api.get('/turnos-fijos', { Authorization: `Bearer ${adminToken}` })
              .then((data) => { if (Array.isArray(data)) setTurnosFijosAdmin(data) })
              .catch(() => {})
          }
          showToast('cancelada', 'Reserva cancelada correctamente')
        })
        .catch((err) => toastUi.error(err.message || 'No se pudo cancelar'))
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
      showToast('cancelada', 'Reserva cancelada correctamente')
      setSeleccion(null)
      return
    }

    // Turno fijo del jugador: id = 'fijo_player_<turnoFijoId>' → ausencia puntual para ese día
    if (String(id).startsWith('fijo_player_')) {
      const turnoFijoId = String(id).replace('fijo_player_', '')
      const turno = turnosFijos.find((t) => String(t.id) === turnoFijoId)
      api.patch(`/turnos-fijos/${turnoFijoId}/ausencia/${fecha}`, {}, { Authorization: `Bearer ${adminToken}` })
        .then((updated) => {
          if (updated) updateTurnoFijoAdmin(turnoFijoId, {
            diasAusentes: updated.diasAusentes ?? [],
            ausenciasPendientes: updated.ausenciasPendientes ?? [],
            diasAusentesJugador: updated.diasAusentesJugador ?? [],
          })
          fetchReservasBackend()
        })
        .catch(() => {})
      ausentarDiaStore(turnoFijoId, fecha)
      if (turno) {
        addTurnoFijoLiberadoAdmin({
          canchaNombre: turno.canchaNombre,
          fecha,
          inicio: turno.inicio,
          fin: turno.fin,
        })
      }
      showToast('cancelada', 'Turno liberado correctamente')
      setSeleccion(null)
      return
    }

    // Reserva admin (bloqueo, clase, reserva manual) → store compartido
    deleteReservaAdmin(id)
    setSeleccion(null)
    setEditando(null)
  }

  const handlePago = async (id, metodoPago = 'efectivo') => {
    setSeleccion(null)
    const pagado = metodoPago !== null // metodoPago=null → marcar impago
    const metodo = pagado ? metodoPago : null
    if (String(id).startsWith('backend_')) {
      const backendId = String(id).replace('backend_', '')
      const prevState = reservasBackend.find((r) => r.id === backendId)
      // Optimista
      setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, pagado, metodoPago: metodo } : r))
      try {
        await api.patch(`/reservas/${backendId}/pago`, { pagado, metodoPago: metodo }, { Authorization: `Bearer ${adminToken}` })
      } catch {
        // Revertir al estado previo si el backend falla
        setReservasBackend((prev) => prev.map((r) => r.id === backendId ? { ...r, pagado: prevState?.pagado ?? false, metodoPago: prevState?.metodoPago ?? null } : r))
      }
    } else {
      pagarReservaAdmin(id) // reservas locales (no backend) — comportamiento previo
    }
  }

  const handleEditar = (reserva) => {
    setEditando(reserva)
    setSeleccion(null)
  }

  const handleGuardarEdicion = async (id, data) => {
    if (String(id).startsWith('backend_')) {
      const backendId = String(id).replace('backend_', '')
      try {
        await api.patch(`/reservas/${backendId}`, {
          notas: data.notas,
          precio: data.monto,
          jugadores: data.jugadores,
          jugadorId: data.jugadorId ?? null,
          metodoPago: data.metodoPago,
          pago: data.pago,
        }, { Authorization: `Bearer ${adminToken}` })
        fetchReservasBackend()
      } catch { /* fallo silencioso */ }
    }
    setEditando(null)
  }



  const sinLeer = turnosFijos.filter((t) => t.estado === 'pendiente').length
  const [ayudaAbierta, setAyudaAbierta] = useState(false)

  return (
    <div className="flex flex-col gap-5">

      {/* Toast de confirmación */}
      {toast && (
        <div className={[
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium',
          toast.tipo === 'reserva'  && 'bg-emerald-500 text-white',
          toast.tipo === 'bloqueo'  && 'bg-slate-700 text-white',
          toast.tipo === 'cancelada' && 'bg-red-500 text-white',
        ].filter(Boolean).join(' ')}>
          {toast.tipo === 'reserva'   && <CheckCircle size={16} className="shrink-0" />}
          {toast.tipo === 'bloqueo'   && <Lock size={16} className="shrink-0" />}
          {toast.tipo === 'cancelada' && <XCircle size={16} className="shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      )}

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
          onMarcarLeida={(id) => marcarLeida(id, adminToken)}
          onEliminar={(id) => eliminarNotificacion(id, adminToken)}
          onMarcarTodas={() => marcarTodasLeidas(adminToken)}
          onLiberacionAprobada={setFecha}
          onReservasPendientesChange={() => { fetchReservasPendientes(); fetchReservasBackend() }}
          onFechaChange={setFecha}
          onSolicitudFijoClick={(n) => { marcarLeida(n.id, adminToken); setTabActiva('fijos') }}
        />
      )}

      {/* Stats */}
      <StatsBar reservasDia={reservasDia} clasesDia={clasesDia} totalTurnosFijos={totalTurnosFijos} canchasCount={canchas.filter((c) => c.activa).length} franjasCount={franjasDia.length} />

      {/* Tabs + botón ayuda */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit max-w-full min-w-0 overflow-x-auto no-scrollbar">
          {[
            { key: 'grilla',  label: 'Grilla del día',      icon: CalendarDays },
            { key: 'fijos',   label: 'Turnos fijos',         icon: Repeat,        badge: sinLeer > 0 ? sinLeer : null },
            { key: 'clases',  label: 'Clases del profesor',  icon: GraduationCap },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTabActiva(key)}
              className={['flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap',
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

        {/* Botón ayuda — futuro: asistente IA */}
        <button
          onClick={() => setAyudaAbierta((v) => !v)}
          title="Ayuda"
          className={['w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0',
            ayudaAbierta
              ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300',
          ].join(' ')}
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {/* Panel de ayuda */}
      {ayudaAbierta && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <HelpCircle size={14} className="text-emerald-600" />
              </div>
              <h3 className="text-slate-800 font-semibold text-sm">¿Cómo funciona la grilla?</h3>
            </div>
            <button onClick={() => setAyudaAbierta(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Tipos de reserva */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2.5">Tipos de reserva</p>
            <div className="flex flex-col gap-2">
              {[
                { color: 'bg-emerald-500', nombre: 'Online', desc: 'El jugador reservó desde la app. Se confirma al instante.' },
                { color: 'bg-blue-500',    nombre: 'Eventual', desc: 'Reserva manual creada por el admin para un día puntual, sin recurrencia.' },
                { color: 'bg-violet-500',  nombre: 'Fijo', desc: 'Turno semanal recurrente. Se confirma al instante y se repite cada semana en el mismo horario.' },
                { color: 'bg-red-400',     nombre: 'Bloqueado', desc: 'Franja cerrada. Impide reservas en ese horario. Se puede indicar el motivo.' },
                { color: 'bg-orange-400',  nombre: 'Clase', desc: 'Clase con profesor registrada. Se gestiona desde la pestaña "Clases del profesor".' },
              ].map(({ color, nombre, desc }) => (
                <div key={nombre} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${color} mt-1 shrink-0`} />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">{nombre}</span> — {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2.5">Acciones</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-sm bg-slate-200 mt-1 shrink-0" />
                <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Celda vacía</span> — abre el formulario para crear una reserva manual o bloquear la franja.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-sm bg-slate-400 mt-1 shrink-0" />
                <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Reserva existente</span> — muestra el detalle. Desde ahí podés editar datos o cancelar el turno.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-sm bg-amber-400 mt-1 shrink-0" />
                <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Panel de alertas</span> — aparece cuando hay reservas pendientes de jugadores para aprobar o rechazar.</p>
              </div>
            </div>
          </div>

          {/* Estado de pago */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2.5">Estado de pago</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Pagado</span>
                <span className="text-xs text-emerald-500">— ya se cobró (entró a la caja)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span className="text-xs font-medium text-fuchsia-700">Parcial</span>
                <span className="text-xs text-violet-400">— falta registrar a alguien (turno abierto)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-blue-700">En cuenta</span>
                <span className="text-xs text-blue-500">— turno cerrado, quedó saldo a deber (en Cobranzas)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-amber-700">Pendiente</span>
                <span className="text-xs text-amber-500">— por jugarse o recién terminado, aún sin cobrar</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700">Debe</span>
                <span className="text-xs text-red-400">— jugado e impago (1 h después de terminar)</span>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-300 text-center">
            Próximamente: asistente IA para gestión inteligente de canchas
          </p>
        </div>
      )}

      {tabActiva === 'grilla' && (
        <>
          <Leyenda />

          {/* Skeleton mientras cargan las reservas del backend */}
          {loadingGrilla && (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-10 rounded-xl bg-slate-100 border border-slate-200 w-full" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-12 w-20 rounded-lg bg-slate-100 shrink-0" />
                  <div className="h-12 flex-1 rounded-lg bg-slate-50 border border-slate-100" />
                  <div className="h-12 flex-1 rounded-lg bg-slate-50 border border-slate-100" />
                </div>
              ))}
            </div>
          )}

          {!loadingGrilla && (
          <>
          {/* Modal centrado — nueva reserva / detalle / editar */}
          {(seleccion || editando) && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) { setSeleccion(null); setEditando(null) } }}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
                {editando ? (
                  <EditarReserva reserva={editando} onSave={handleGuardarEdicion} onCancel={() => setEditando(null)} />
                ) : seleccion.tipo === 'detalle' ? (
                  <div className="flex flex-col">
                    <DetalleReserva reserva={seleccion.reserva} onCancelar={handleCancelar} onPago={handlePago} onClose={() => setSeleccion(null)} onAprobar={handleAprobarBackend} onCheckout={abrirCheckout} />
                    {seleccion.reserva.tipo !== 'bloqueado' && seleccion.reserva.tipo !== 'clase' && seleccion.reserva.estado !== 'cancelada' && (
                      <div className="px-5 pb-4">
                        <button onClick={() => handleEditar(seleccion.reserva)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
                          <Pencil size={14} /> Editar reserva
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <PanelContent seleccion={seleccion} fecha={fecha} franjas={franjasMainGrilla} onSave={handleSave} onBloquear={handleSave} onCancelar={handleCancelar} onPago={handlePago} onClose={() => setSeleccion(null)} onCheckout={abrirCheckout} />
                )}
              </div>
            </div>
          )}

          {checkoutReserva && (
            <CheckoutTurno
              reserva={checkoutReserva}
              token={adminToken}
              onClose={() => { setCheckoutReserva(null); fetchReservasBackend(fecha) }}
              onDone={(cobrado) => { setCheckoutReserva(null); fetchReservasBackend(fecha); showToast('reserva', cobrado ? 'Cobro registrado' : 'Anotado a la cuenta') }}
            />
          )}

          {/* Vista mobile: todas las canchas en orden */}
          <div className="md:hidden flex flex-col gap-5">
            {canchasConCustom.length === 0 ? (
              <GrillaMobile reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} canchas={canchas} franjas={franjasMainGrilla} />
            ) : (
              <>
                {diaCerradoGeneral && canchasSinCustom.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    <Ban size={13} className="text-slate-400 shrink-0" />
                    <span>Día cerrado (horario general) · Las canchas con horario propio siguen activas</span>
                  </div>
                )}
                {canchas.map((cancha) => {
                  if (usaHorarioPropioHoy(cancha)) {
                    const { franjas } = franjasCustomPorCancha.find((f) => f.canchaId === cancha.id) ?? { franjas: [] }
                    return <GrillaConHorarioPropio key={cancha.id} cancha={cancha} franjas={franjas} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
                  }
                  return <GrillaSeccionGeneral key={cancha.id} cancha={cancha} franjas={franjasMainGrilla} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
                })}
              </>
            )}
          </div>

          {/* Vista desktop: tabla completa */}
          <div className="hidden md:block">
            <div className="flex flex-col gap-6">
              {canchasConCustom.length === 0 ? (
                <Grilla reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} canchas={canchas} franjas={franjasMainGrilla} />
              ) : (
                <>
                  {diaCerradoGeneral && canchasSinCustom.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      <Ban size={13} className="text-slate-400 shrink-0" />
                      <span>Día cerrado (horario general) · Las canchas con horario propio siguen activas</span>
                    </div>
                  )}
                  {canchas.map((cancha) => {
                    if (usaHorarioPropioHoy(cancha)) {
                      const { franjas } = franjasCustomPorCancha.find((f) => f.canchaId === cancha.id) ?? { franjas: [] }
                      return <GrillaConHorarioPropio key={cancha.id} cancha={cancha} franjas={franjas} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
                    }
                    return <GrillaSeccionGeneral key={cancha.id} cancha={cancha} franjas={franjasMainGrilla} reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
                  })}
                </>
              )}
            </div>
          </div>
          </>
          )}
        </>
      )}

      {tabActiva === 'fijos' && (
        <TabTurnosFijos
          canchas={canchas}
          franjas={franjasMainGrilla}
        />
      )}

      {tabActiva === 'clases' && (
        <TabClasesProfesor
          onClaseCreada={(nuevaReserva) => {
            if (nuevaReserva) fetchReservasBackend(nuevaReserva.fecha, false)
          }}
        />
      )}
    </div>
  )
}

export default ReservasPage
