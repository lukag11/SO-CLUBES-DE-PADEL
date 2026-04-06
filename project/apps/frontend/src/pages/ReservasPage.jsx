import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Save, Check,
  CalendarDays, DollarSign, Lock, Repeat, Clock,
  Users, AlertCircle, CheckCircle, Ban, Pencil, Bell, GraduationCap, Trash2, XCircle, MapPin,
} from 'lucide-react'
import {
  FRANJAS, CANCHAS_MOCK, RESERVAS_INICIALES,
  RAZONES_BLOQUEO, METODOS_PAGO, CLASES_PROFESOR, DIAS_SEMANA_OPCIONES,
} from '../features/admin/reservasMockData'
import useNotificacionesStore from '../store/notificacionesStore'
import useReservasStore from '../store/reservasStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import useTurnosFijosStore from '../store/turnosFijosStore'

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

// Busca si hay reserva para cancha+franja. Un bloqueo puede abarcar varias franjas.
const getReserva = (reservas, canchaId, franja) =>
  reservas.find((r) =>
    r.canchaId === canchaId &&
    r.inicio <= franja.inicio &&
    r.fin >= franja.fin
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
  return fin <= horaActual()
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

const StatsBar = ({ reservasDia, clasesDia }) => {
  const total = CANCHAS_MOCK.length * FRANJAS.length

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

  // Turnos fijos: jugadores con turno fijo aprobado + clases del profesor
  const fijos = reservasDia.filter((r) => r.tipo === 'fijo').length + (clasesDia?.length || 0)

  const stats = [
    { label: 'Turnos ocupados', value: `${ocupados} / ${total}`, icon: CalendarDays, color: 'text-blue-500',    bg: 'bg-blue-50'    },
    { label: 'Cobrado',         value: formatPrice(ingresados),   icon: CheckCircle,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Por cobrar',      value: formatPrice(pendientes),   icon: DollarSign,   color: 'text-amber-500',   bg: 'bg-amber-50'   },
    { label: 'Turnos fijos',    value: fijos,                     icon: Repeat,       color: 'text-violet-500',  bg: 'bg-violet-50'  },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
          <div className={`${bg} p-2.5 rounded-xl shrink-0`}>
            <Icon size={18} className={color} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
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
    if (reserva.inicio !== franja.inicio) return null // celda ya cubierta por rowspan
    const franjasCubiertas = FRANJAS.filter(
      (f) => f.inicio >= reserva.inicio && f.fin <= reserva.fin
    ).length

    const esClase = reserva.tipo === 'clase'
    const esOnline = reserva.tipo === 'online'
    const esSolicitudFijo = reserva.tipo === 'solicitud_fijo'

    return (
      <td
        rowSpan={franjasCubiertas}
        onClick={esClase ? undefined : () => onClick({ tipo: 'detalle', reserva, franja, cancha })}
        className={[
          'border border-slate-100 align-top transition-colors',
          esClase ? 'bg-orange-50/70 cursor-default'
          : esOnline ? 'bg-emerald-50/60 cursor-pointer hover:bg-emerald-100/50'
          : esSolicitudFijo ? 'bg-amber-50/60 cursor-pointer hover:bg-amber-100/50'
          : 'bg-slate-100 cursor-pointer hover:bg-slate-200/60',
        ].join(' ')}
      >
        <div className="h-full min-h-14 p-2 flex flex-col gap-1">
          {esClase ? (
            <>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={11} className="text-orange-400 shrink-0" />
                <span className="text-orange-600 text-xs font-semibold truncate">Clase</span>
              </div>
              <p className="text-orange-500 text-xs leading-snug truncate">{reserva.profesor}</p>
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

const Grilla = ({ reservas, clasesDia, fecha, onCeldaClick }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-28 shrink-0">Horario</th>
            {CANCHAS_MOCK.map((c) => (
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
          {FRANJAS.map((franja) => {
            const pasado = esPasado(fecha, franja.fin)
            return (
              <tr key={franja.inicio} className={pasado ? 'opacity-50' : ''}>
                <td className="px-4 py-0 border border-slate-100 bg-slate-50/50 whitespace-nowrap">
                  <span className="text-slate-500 text-xs font-mono">{franja.inicio}</span>
                  <span className="text-slate-300 text-xs mx-0.5">–</span>
                  <span className="text-slate-400 text-xs font-mono">{franja.fin}</span>
                </td>
                {CANCHAS_MOCK.map((cancha) => {
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

// ─── Panel lateral — Formulario nueva reserva ─────────────────────────────────

const FormNuevaReserva = ({ franja, cancha, onSave, onCancel }) => {
  const [form, setForm] = useState({
    tipo: 'eventual',
    jugadores: ['', '', '', ''],
    pago: 'pendiente',
    metodoPago: 'Efectivo',
    monto: 12000,
    notas: '',
    recurrenciaHasta: '',
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setJugador = (i, v) => {
    const arr = [...form.jugadores]
    arr[i] = v
    setForm((p) => ({ ...p, jugadores: arr }))
  }

  const handleSave = () => {
    const jugadores = form.jugadores.filter(Boolean)
    if (!jugadores.length) return
    onSave({
      canchaId: cancha.id,
      inicio: franja.inicio,
      fin: franja.fin,
      tipo: form.tipo,
      recurrencia: form.tipo === 'fijo' && form.recurrenciaHasta
        ? { dia: new Date().toLocaleDateString('es-AR', { weekday: 'long' }), hasta: form.recurrenciaHasta }
        : null,
      jugadores,
      estado: 'confirmada',
      pago: form.pago,
      monto: Number(form.monto),
      notas: form.notas,
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
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'eventual', label: 'Eventual', icon: CalendarDays },
              { key: 'fijo', label: 'Turno fijo', icon: Repeat },
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

        {/* Recurrencia hasta (solo si fijo) */}
        {form.tipo === 'fijo' && (
          <Input
            label="Vigente hasta"
            type="date"
            value={form.recurrenciaHasta}
            onChange={(e) => set('recurrenciaHasta', e.target.value)}
          />
        )}

        {/* Jugadores */}
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

        {/* Monto */}
        <Input
          label="Monto (ARS)"
          type="number"
          value={form.monto}
          onChange={(e) => set('monto', e.target.value)}
        />

        {/* Pago */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Estado de pago" value={form.pago} onChange={(e) => set('pago', e.target.value)}>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
          </Select>
          <Select label="Método de pago" value={form.metodoPago} onChange={(e) => set('metodoPago', e.target.value)}>
            {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>

        {/* Notas */}
        <div>
          <FieldLabel>Notas</FieldLabel>
          <textarea
            rows={2}
            placeholder="Observaciones..."
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

const DetalleReserva = ({ reserva, onCancelar, onPago, onClose }) => {
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

        {/* Bloqueo */}
        {reserva.tipo === 'bloqueado' && (
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-slate-500" />
              <span className="text-slate-600 font-semibold text-sm">Motivo</span>
            </div>
            <p className="text-slate-500 text-sm">{reserva.notas || 'Sin especificar'}</p>
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

      {/* Acciones */}
      {reserva.tipo !== 'bloqueado' && reserva.estado !== 'cancelada' && (
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">
          {reserva.pago !== 'pagado' && (
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
            Cancelar reserva
          </button>
        </div>
      )}

      {/* Desbloquear */}
      {reserva.tipo === 'bloqueado' && (
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={() => onCancelar(reserva.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <X size={14} />
            Desbloquear franja
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Panel lateral contenedor ─────────────────────────────────────────────────

const Panel = ({ seleccion, fecha, onSave, onBloquear, onCancelar, onPago, onClose }) => {
  const [modo, setModo] = useState('reserva') // 'reserva' | 'bloqueo'

  if (!seleccion) return null
  const { tipo, reserva, franja, cancha } = seleccion

  const handleSaveReserva = (data) => { onSave({ id: Date.now(), fecha, ...data }) }
  const handleSaveBloqueo = (data) => { onBloquear({ id: Date.now(), fecha, ...data }) }

  return (
    <aside className="w-80 shrink-0 bg-white border-l border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
      {tipo === 'detalle' ? (
        <DetalleReserva reserva={reserva} onCancelar={onCancelar} onPago={onPago} onClose={onClose} />
      ) : (
        <>
          {/* Tabs reserva / bloqueo */}
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
                  modo === key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600',
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
      )}
    </aside>
  )
}

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

const PanelAlertas = ({ notificaciones, onMarcarLeida, onMarcarTodas, onLiberacionAprobada }) => {
  const [modalNotif, setModalNotif] = useState(null)
  const confirmarReserva = useReservasStore((s) => s.confirmarReserva)
  const playerReservas = useReservasStore((s) => s.reservas)
  const addTurnoFijo = useTurnosFijosStore((s) => s.addTurnoFijo)
  const ausentarDia = useTurnosFijosStore((s) => s.ausentarDia)
  const { addReservaConfirmada, addSolicitudAprobada, addAusenciaConfirmada } = usePlayerNotificationsStore()

  if (!notificaciones.length) return null
  const sinLeer = notificaciones.filter((n) => !n.leida).length

  const handleAprobar = (notifId) => {
    const notif = modalNotif

    if (notif?.tipo === 'liberacion_turno') {
      // Confirmar ausencia puntual: libera el slot solo para esa fecha
      if (notif.turnoFijoId && notif.fecha) {
        ausentarDia(Number(notif.turnoFijoId), notif.fecha)
        // Notificar al jugador que su ausencia fue confirmada
        addAusenciaConfirmada?.({
          canchaNombre: notif.cancha,
          fecha: notif.fecha,
          inicio: notif.inicio,
          fin: notif.fin,
        })
        // Navegar la grilla del admin a la fecha liberada para verla libre
        onLiberacionAprobada?.(notif.fecha)
      }
      onMarcarLeida(notifId)
      setModalNotif(null)
      return
    }

    // Buscar la reserva pendiente que coincida
    const reserva = playerReservas.find(
      (r) => r.estado === 'pendiente' &&
             r.hora === notif?.inicio &&
             r.fecha === notif?.fecha
    )
    if (reserva) {
      if (reserva.esTurnoFijo) {
        confirmarReserva(reserva.id)
        addTurnoFijo({
          canchaId: reserva.canchaId,
          canchaNombre: reserva.canchaNombre,
          canchaInfo: reserva.canchaInfo,
          dia: diaSemanaDeISO(reserva.fecha),
          inicio: reserva.inicio || reserva.hora,
          fin: reserva.horaFin,
          precio: reserva.precio,
          jugador: reserva.jugador,
        })
        addSolicitudAprobada?.({
          canchaNombre: reserva.canchaNombre,
          dia: diaSemanaDeISO(reserva.fecha),
          inicio: reserva.hora,
          fin: reserva.horaFin,
        })
      } else {
        confirmarReserva(reserva.id)
        addReservaConfirmada({
          canchaNombre: reserva.canchaNombre,
          fecha: reserva.fecha,
          hora: reserva.hora,
          horaFin: reserva.horaFin,
        })
      }
    }
    onMarcarLeida(notifId)
    setModalNotif(null)
  }

  const handleRechazar = (id) => {
    onMarcarLeida(id)
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
            {sinLeer > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {sinLeer} nuevo{sinLeer > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={onMarcarTodas} className="text-amber-600 text-xs hover:underline">
            Marcar todas como vistas
          </button>
        </div>

        <div className="divide-y divide-slate-50">
          {notificaciones.map((n) => {
            const esNuevaReserva = n.tipo === 'nueva_reserva'
            const esSolicitudFijo = n.tipo === 'solicitud_turno_fijo'
            const esLiberacion = n.tipo === 'liberacion_turno'
            const dotColor = n.leida ? 'bg-slate-300' : esNuevaReserva ? 'bg-blue-500' : esSolicitudFijo ? 'bg-amber-500' : 'bg-red-500'
            const rowBg = n.leida ? '' : esNuevaReserva ? 'bg-blue-50/40' : esSolicitudFijo ? 'bg-amber-50/40' : 'bg-red-50/30'
            const esClickeable = (esSolicitudFijo || esNuevaReserva || esLiberacion) && !n.leida
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
                  {esNuevaReserva && (
                    <>
                      <p className="text-slate-700 text-sm font-medium">
                        <span className="text-blue-600 font-semibold">Nueva reserva</span>
                        {n.jugador && <span className="text-slate-700 font-semibold"> · {n.jugador}</span>}
                        {n.precio && <span className="text-slate-400 font-normal"> · ${Number(n.precio).toLocaleString('es-AR')}</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{n.cancha} · {n.inicio}–{n.fin} · {fechaReserva}</p>
                      {!n.leida && (
                        <p className="text-blue-500 text-[10px] mt-1 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                          Clic para aprobar o rechazar
                        </p>
                      )}
                    </>
                  )}
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
                  {!esNuevaReserva && !esSolicitudFijo && !esLiberacion && (
                    <p className="text-slate-500 text-sm">{n.jugador}</p>
                  )}
                </div>
                {!n.leida && !esClickeable && (
                  <button onClick={() => onMarcarLeida(n.id)} className="text-xs text-slate-400 hover:text-emerald-600 transition-colors shrink-0 mt-0.5">
                    <Check size={14} />
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

const EMPTY_CLASE = {
  profesor: '', canchaId: CANCHAS_MOCK[0].id, dia: 'lunes',
  inicio: FRANJAS[0].inicio, fin: FRANJAS[1].fin, hasta: '', activa: true,
}

const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const TabTurnosFijos = ({ clases, onAddClase, onDeleteClase }) => {
  const turnosFijosJugadores = useTurnosFijosStore((s) => s.turnosFijos)
  const liberarTurno = useTurnosFijosStore((s) => s.liberarTurno)
  const fijos = turnosFijosJugadores.filter((t) => t.activo)
  const hoy = todayISO()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [formClase, setFormClase] = useState(EMPTY_CLASE)
  const [errorForm, setErrorForm] = useState('')

  const handleGuardarClase = () => {
    if (!formClase.profesor.trim()) { setErrorForm('El nombre del profesor es requerido'); return }
    if (!formClase.hasta) { setErrorForm('La fecha de vigencia es requerida'); return }
    if (formClase.fin <= formClase.inicio) { setErrorForm('El horario de fin debe ser posterior al inicio'); return }
    setErrorForm('')
    onAddClase({ ...formClase, canchaId: Number(formClase.canchaId), id: Date.now() })
    setFormClase(EMPTY_CLASE)
    setMostrarForm(false)
  }

  return (
    <div className="flex flex-col gap-5">

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
                  {['Jugador', 'Cancha', 'Día', 'Horario', 'Precio', 'Desde', 'Ausencias', 'Acción'].map((h) => (
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
                          onClick={() => liberarTurno(t.id)}
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
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} />
            Agregar clase
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
                  {CANCHAS_MOCK.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                  const cancha = CANCHAS_MOCK.find((ca) => ca.id === c.canchaId)
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
  const [reservas, setReservas] = useState(RESERVAS_INICIALES)
  const [clases, setClases] = useState(CLASES_PROFESOR)
  const [seleccion, setSeleccion] = useState(null)
  const [editando, setEditando] = useState(null)
  const [tabActiva, setTabActiva] = useState('grilla') // 'grilla' | 'fijos'

  const { notificaciones, marcarLeida, marcarTodasLeidas } = useNotificacionesStore()
  const playerReservas = useReservasStore((s) => s.reservas)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)

  // Mapea la hora del jugador (ej. '10:00') a la franja admin que la contiene
  const franjaParaHora = (hora) =>
    FRANJAS.find((f) => f.inicio <= hora && hora < f.fin) ||
    FRANJAS.find((f) => f.inicio === hora) ||
    FRANJAS[0]

  // Reservas eventuales confirmadas del jugador → tipo 'online' en grilla
  const playerReservasDia = useMemo(() =>
    playerReservas
      .filter((r) => r.estado === 'confirmada' && !r.esTurnoFijo && r.fecha === fecha)
      .map((r) => {
        const f = franjaParaHora(r.hora)
        return {
          id: `player_${r.id}`,
          canchaId: r.canchaId,
          fecha: r.fecha,
          inicio: f.inicio,
          fin: f.fin,
          tipo: 'online',
          jugadores: [r.jugador || 'Jugador online'],
          pago: 'pendiente',
          monto: r.precio,
          estado: 'confirmada',
          notas: '',
          recurrencia: null,
        }
      })
  , [playerReservas, fecha])

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
          canchaId: Number(t.canchaId),
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

  const reservasDia = useMemo(
    () => [...reservas.filter((r) => r.fecha === fecha), ...playerReservasDia, ...turnosFijosDia],
    [reservas, fecha, playerReservasDia, turnosFijosDia]
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
    setReservas((prev) => [...prev, nueva])
    setSeleccion(null)
  }

  const handleCancelar = (id) => {
    setReservas((prev) => prev.filter((r) => r.id !== id))
    setSeleccion(null)
    setEditando(null)
  }

  const handlePago = (id) => {
    setReservas((prev) => prev.map((r) => r.id === id ? { ...r, pago: 'pagado' } : r))
    setSeleccion(null)
  }

  const handleEditar = (reserva) => {
    setEditando(reserva)
    setSeleccion(null)
  }

  const handleGuardarEdicion = (id, data) => {
    setReservas((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r))
    setEditando(null)
  }

  const handleAddClase = (nueva) => setClases((prev) => [...prev, nueva])
  const handleDeleteClase = (id) => setClases((prev) => prev.filter((c) => c.id !== id))

  const sinLeer = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Header + navegación de fecha */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reservas</h2>
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
            className="border border-slate-200 rounded-xl px-3 h-9 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-colors bg-white" />
        </div>
      </div>

      {/* Alertas de jugadores */}
      {notificaciones.length > 0 && (
        <PanelAlertas
          notificaciones={notificaciones}
          onMarcarLeida={marcarLeida}
          onMarcarTodas={marcarTodasLeidas}
          onLiberacionAprobada={setFecha}
        />
      )}

      {/* Stats */}
      <StatsBar reservasDia={reservasDia} clasesDia={clasesDia} />

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
          <div className="flex gap-4 flex-1 min-h-0">
            <div className="flex-1 overflow-auto">
              <Grilla reservas={reservasDia} clasesDia={clasesDia} fecha={fecha} onCeldaClick={handleCeldaClick} />
            </div>

            {/* Panel detalle / nueva reserva */}
            {seleccion && !editando && (
              <aside className="w-80 shrink-0 bg-white border-l border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                {seleccion.tipo === 'detalle' ? (
                  <div className="flex flex-col h-full">
                    <DetalleReserva
                      reserva={seleccion.reserva}
                      onCancelar={handleCancelar}
                      onPago={handlePago}
                      onClose={() => setSeleccion(null)}
                    />
                    {/* Botón editar en el detalle */}
                    {seleccion.reserva.tipo !== 'bloqueado' && seleccion.reserva.estado !== 'cancelada' && (
                      <div className="px-5 pb-4">
                        <button
                          onClick={() => handleEditar(seleccion.reserva)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          <Pencil size={14} />
                          Editar reserva
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Panel
                    seleccion={seleccion}
                    fecha={fecha}
                    onSave={handleSave}
                    onBloquear={handleSave}
                    onCancelar={handleCancelar}
                    onPago={handlePago}
                    onClose={() => setSeleccion(null)}
                  />
                )}
              </aside>
            )}

            {/* Panel edición */}
            {editando && (
              <aside className="w-80 shrink-0 bg-white border-l border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                <EditarReserva
                  reserva={editando}
                  onSave={handleGuardarEdicion}
                  onCancel={() => setEditando(null)}
                />
              </aside>
            )}
          </div>
        </>
      )}

      {tabActiva === 'fijos' && (
        <TabTurnosFijos
          clases={clases}
          onAddClase={handleAddClase}
          onDeleteClase={handleDeleteClase}
        />
      )}
    </div>
  )
}

export default ReservasPage
