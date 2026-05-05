import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, GraduationCap,
  CalendarDays, Clock, Trash2, Save, AlertCircle,
} from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import useProfesoresStore from '../store/profesoresStore'
import useClubStore from '../store/clubStore'
import useNotificacionesStore from '../store/notificacionesStore'
import { FRANJAS_PROFESOR } from '../features/admin/reservasMockData'
import { inRange } from '../utils/timeUtils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const fmtDiaCorto = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return dias[d.getDay()]
}

const DIAS_CLUB = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const getDiaNombre = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_CLUB[new Date(y, m - 1, d).getDay()]
}

// Verifica si un slot está ocupado en la grilla (por cualquier tipo de reserva)
const slotOcupado = (reservas, canchaId, franja, fecha) =>
  reservas.some(
    (r) =>
      r.fecha === fecha &&
      r.canchaId === canchaId &&
      r.inicio <= franja.inicio &&
      r.fin >= franja.fin
  )

// ─── Modal para crear/editar una clase ───────────────────────────────────────

const ModalClase = ({ fecha, onClose, onSave, claseEditar, reservasDelDia, canchasDisponibles, profesorId, franjasDelDia }) => {
  const [canchaId, setCanchaId] = useState(String(claseEditar?.canchaId ?? canchasDisponibles[0]?.id ?? ''))
  const [inicio, setInicio] = useState(claseEditar?.inicio ?? '')
  const [fin, setFin] = useState(claseEditar?.fin ?? '')
  const [dividir, setDividir] = useState(false)
  const [nota, setNota] = useState(claseEditar?.nota ?? '')
  const [error, setError] = useState('')

  const reservasOtras = useMemo(
    () => claseEditar ? reservasDelDia.filter((r) => r.id !== claseEditar.id) : reservasDelDia,
    [reservasDelDia, claseEditar]
  )

  // Horas disponibles para "Desde": las del día según horario del club
  const opcionesInicio = franjasDelDia

  // Horas disponibles para "Hasta": fin > inicio seleccionado
  const opcionesFin = useMemo(
    () => inicio ? franjasDelDia.filter((f) => f.fin > inicio) : [],
    [inicio, franjasDelDia]
  )

  // Al cambiar inicio, resetear fin si ya no es válido
  const handleSetInicio = (val) => {
    setInicio(val)
    if (fin && fin <= val) setFin('')
  }

  // Slots de 1h contenidos en el rango seleccionado
  const franjasEnRango = useMemo(
    () => (inicio && fin) ? franjasDelDia.filter((f) => f.inicio >= inicio && f.fin <= fin) : [],
    [inicio, fin, franjasDelDia]
  )

  // Estado de cada slot del rango: libre | ocupado (overlap con cualquier reserva)
  const estadoFranjas = useMemo(
    () => franjasEnRango.map((f) => ({
      ...f,
      ocupado: canchaId
        ? reservasOtras.some(
            (r) => Number(r.canchaId) === Number(canchaId) &&
                   r.inicio < f.fin && r.fin > f.inicio
          ) ||
          // P1: bloqueos de no-disponibilidad del propio profesor (canchaId: 0 = todas las canchas)
          (profesorId != null && reservasOtras.some(
            (r) => r.tipo === 'bloqueado' && r.profesorId === profesorId &&
                   r.inicio < f.fin && r.fin > f.inicio
          ))
        : false,
    })),
    [franjasEnRango, canchaId, reservasOtras, profesorId]
  )

  const hayConflicto = estadoFranjas.some((f) => f.ocupado)

  // Duración total legible (1h por slot)
  const duracionTotal = useMemo(() => {
    const mins = franjasEnRango.length * 60
    if (!mins) return null
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}min` : `${h}h`
  }, [franjasEnRango])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!canchaId) { setError('Seleccioná una cancha.'); return }
    if (!inicio || !fin) { setError('Seleccioná el horario de inicio y fin.'); return }
    if (franjasEnRango.length === 0) { setError('El rango seleccionado no contiene franjas válidas.'); return }
    if (hayConflicto) { setError('El rango tiene franjas ocupadas. Revisá el detalle abajo.'); return }

    const canchaNombre = canchasDisponibles.find((c) => c.id === Number(canchaId))?.nombre || `Cancha ${canchaId}`

    if (claseEditar) {
      // Edición: siempre un único slot
      onSave({ single: true, canchaId: Number(canchaId), canchaNombre, inicio, fin, nota: nota.trim() })
    } else if (dividir) {
      // Crear: un slot por franja
      onSave({
        single: false,
        slots: franjasEnRango.map((f) => ({
          canchaId: Number(canchaId), canchaNombre,
          inicio: f.inicio, fin: f.fin,
          nota: nota.trim(),
        })),
      })
    } else {
      // Crear: un único slot que cubre todo el rango
      onSave({ single: false, slots: [{ canchaId: Number(canchaId), canchaNombre, inicio, fin, nota: nota.trim() }] })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center">
              <GraduationCap size={16} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">
                {claseEditar ? 'Editar clase' : 'Nueva clase'}
              </h3>
              <p className="text-white/30 text-xs capitalize">{fmtFecha(fecha)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Cancha */}
          <div>
            <label className="text-white/50 text-xs font-medium block mb-1.5">Cancha</label>
            <select
              value={canchaId}
              onChange={(e) => setCanchaId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-400/50 transition-all appearance-none"
            >
              <option value="" className="bg-[#0d1117]">— Seleccioná una cancha —</option>
              {canchasDisponibles.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0d1117]">{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Rango horario */}
          <div className="flex flex-col gap-3">
            <label className="text-white/50 text-xs font-medium uppercase tracking-wide">Rango horario</label>

            <div className="grid grid-cols-2 gap-3">
              {/* Desde */}
              <div>
                <label className="text-white/30 text-[10px] block mb-1">Desde</label>
                <select
                  value={inicio}
                  onChange={(e) => handleSetInicio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-400/50 transition-all appearance-none"
                >
                  <option value="" className="bg-[#0d1117]">— Inicio —</option>
                  {opcionesInicio.map((f) => (
                    <option key={f.inicio} value={f.inicio} className="bg-[#0d1117]">{f.inicio}</option>
                  ))}
                </select>
              </div>

              {/* Hasta */}
              <div>
                <label className="text-white/30 text-[10px] block mb-1">Hasta</label>
                <select
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  disabled={!inicio}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-400/50 transition-all appearance-none disabled:opacity-30"
                >
                  <option value="" className="bg-[#0d1117]">— Fin —</option>
                  {opcionesFin.map((f) => (
                    <option key={f.fin} value={f.fin} className="bg-[#0d1117]">{f.fin}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview del rango */}
            {franjasEnRango.length > 0 && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/40 text-[10px] font-medium uppercase tracking-wide">
                    {franjasEnRango.length} franja{franjasEnRango.length > 1 ? 's' : ''} · {duracionTotal}
                  </span>
                  {hayConflicto && (
                    <span className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Conflictos
                    </span>
                  )}
                </div>
                {estadoFranjas.map((f) => (
                  <div key={f.inicio} className={[
                    'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium',
                    f.ocupado
                      ? 'bg-red-500/15 border border-red-500/25 text-red-400'
                      : 'bg-orange-400/10 border border-orange-400/15 text-orange-300',
                  ].join(' ')}>
                    <span>{f.inicio} → {f.fin}</span>
                    <span className="text-[10px]">{f.ocupado ? 'Ocupado' : 'Libre'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dividir en bloques (solo al crear) */}
          {!claseEditar && franjasEnRango.length > 1 && (
            <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => setDividir((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${dividir ? 'bg-orange-400' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dividir ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <div>
                <p className="text-white/70 text-sm font-medium">Crear un slot por franja</p>
                <p className="text-white/30 text-xs mt-0.5">
                  {dividir
                    ? `Se crearán ${franjasEnRango.length} slots de 1h independientes`
                    : 'Se creará un único bloque continuo'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="text-white/50 text-xs font-medium block mb-1.5">
              Descripción <span className="text-white/20">(opcional)</span>
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Clase nivel principiante"
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-400/50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 text-white/50 hover:text-white rounded-xl py-2.5 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 bg-orange-400 hover:bg-orange-300 text-white font-bold rounded-xl py-2.5 text-sm transition-all flex items-center justify-center gap-2">
              <Save size={14} />
              {claseEditar ? 'Guardar cambios' : !dividir && franjasEnRango.length > 1 ? `Crear bloque` : `Crear clase${dividir && franjasEnRango.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal confirmación eliminar ─────────────────────────────────────────────

const ModalConfirmarEliminar = ({ clase, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
      <h3 className="text-white font-bold mb-2">¿Cancelar esta clase?</h3>
      <p className="text-white/40 text-sm mb-1">
        {clase.canchaNombre} · {clase.inicio} a {clase.fin}
      </p>
      {clase.nota && <p className="text-white/30 text-xs mb-5">{clase.nota}</p>}
      <p className="text-white/50 text-sm mb-6">
        El slot quedará libre en la grilla del club. Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 border border-white/10 text-white/50 hover:text-white rounded-xl py-2.5 text-sm font-medium transition-all"
        >
          Volver
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl py-2.5 text-sm transition-all"
        >
          Sí, cancelar clase
        </button>
      </div>
    </div>
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfesorAgendaPage = () => {
  const { profesor } = useAuthProfesorStore()
  const profesores = useProfesoresStore((s) => s.profesores)
  const reservas = useReservasAdminStore((s) => s.reservas)
  const addReservaAdmin = useReservasAdminStore((s) => s.addReserva)
  const deleteReservaAdmin = useReservasAdminStore((s) => s.deleteReserva)
  const updateReservaAdmin = useReservasAdminStore((s) => s.updateReserva)
  const canchas = useClubStore((s) => s.club.canchas ?? [])
  const horarios = useClubStore((s) => s.club.horarios)
  const { nuevaClaseProfesor, cancelacionClaseProfesor } = useNotificacionesStore()

  const [fecha, setFecha] = useState(todayISO())
  const [modalNueva, setModalNueva] = useState(false)
  const [claseEditar, setClaseEditar] = useState(null)
  const [claseEliminar, setClaseEliminar] = useState(null)

  const hoy = todayISO()

  // Canchas habilitadas para este profesor
  const profesorData = profesores.find((p) => p.id === profesor?.id)
  // Franjas del día filtradas por horario del club (mismo patrón que PlayerReservasPage)
  const franjasDelDia = useMemo(() => {
    const diaNombre = getDiaNombre(fecha)
    const horario = horarios[diaNombre]
    if (!horario?.activo) return []
    return FRANJAS_PROFESOR.filter((f) => inRange(f.inicio, f.fin, horario.apertura, horario.cierre))
  }, [fecha, horarios])

  const canchasHabilitadas = useMemo(() => {
    const activas = canchas.filter((c) => c.activa)
    if (!profesorData) return [] // profesor no encontrado en el store → sin acceso a canchas (RN-44)
    if (!profesorData.canchasIds?.length) return activas // sin restricción asignada → todas las activas
    return activas.filter((c) => profesorData.canchasIds.includes(c.id))
  }, [canchas, profesorData])

  // Todas las reservas de este día (para validar disponibilidad)
  const reservasDelDia = useMemo(
    () => reservas.filter((r) => r.fecha === fecha),
    [reservas, fecha]
  )

  // Clases del profesor para este día
  const misClasesDia = useMemo(
    () => reservasDelDia.filter((r) => r.tipo === 'clase' && r.profesorId === profesor?.id),
    [reservasDelDia, profesor]
  )

  // Clases del profesor en la semana visible (7 días desde hoy)
  const diasSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(hoy, i)),
    [hoy]
  )

  const handleCrearClase = ({ single, slots }) => {
    const profesorNombre = `${profesor.nombre} ${profesor.apellido}`
    slots.forEach((slot, i) => {
      addReservaAdmin({
        id: Date.now() + i,
        tipo: 'clase',
        profesorId: profesor.id,
        profesorNombre,
        canchaId: slot.canchaId,
        canchaNombre: slot.canchaNombre,
        fecha,
        inicio: slot.inicio,
        fin: slot.fin,
        nota: slot.nota,
        estado: 'confirmada',
        creadoPor: 'profesor',
        pago: null,
        monto: 0,
        jugadores: [],
        notas: slot.nota,
      })
    })
    // Notificar al admin con el rango completo (primer inicio → último fin)
    nuevaClaseProfesor({
      profesorNombre,
      canchaNombre: slots[0].canchaNombre,
      fecha,
      inicio: slots[0].inicio,
      fin: slots[slots.length - 1].fin,
    })
    setModalNueva(false)
  }

  const handleEditarClase = ({ single, canchaId, canchaNombre, inicio, fin, nota }) => {
    updateReservaAdmin(claseEditar.id, { canchaId, canchaNombre, inicio, fin, notas: nota })
    setClaseEditar(null)
  }

  const handleEliminarClase = () => {
    cancelacionClaseProfesor({
      profesorNombre: `${profesor.nombre} ${profesor.apellido}`,
      canchaNombre: claseEliminar.canchaNombre,
      fecha,
      inicio: claseEliminar.inicio,
      fin: claseEliminar.fin,
    })
    deleteReservaAdmin(claseEliminar.id)
    setClaseEliminar(null)
  }

  const esPasada = (f, fin) => {
    if (f < hoy) return true
    if (f > hoy) return false
    const ahora = new Date()
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
    return fin <= horaActual
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Mi agenda</h1>
          <p className="text-white/40 text-sm mt-1 capitalize">{fmtFecha(fecha)}</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          disabled={fecha < hoy}
          className="flex items-center gap-2 bg-orange-400 hover:bg-orange-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
        >
          <Plus size={16} />
          Nueva clase
        </button>
      </div>

      {/* Selector de día */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setFecha((f) => addDays(f, -1))}
          disabled={fecha <= hoy}
          className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {diasSemana.map((d) => {
            const sel = d === fecha
            const clasesCnt = reservas.filter(
              (r) => r.tipo === 'clase' && r.profesorId === profesor?.id && r.fecha === d
            ).length
            return (
              <button
                key={d}
                onClick={() => setFecha(d)}
                className={[
                  'flex flex-col items-center px-3 py-2 rounded-xl border transition-all min-w-[48px] shrink-0',
                  sel
                    ? 'bg-orange-400/15 border-orange-400/40 text-orange-400'
                    : 'border-white/8 text-white/40 hover:text-white hover:bg-white/4',
                ].join(' ')}
              >
                <span className="text-[9px] font-bold uppercase">{d === hoy ? 'Hoy' : fmtDiaCorto(d)}</span>
                <span className="text-sm font-black leading-none">{new Date(d + 'T12:00:00').getDate()}</span>
                {clasesCnt > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setFecha((f) => addDays(f, 1))}
          className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Clases del día */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <GraduationCap size={15} className="text-orange-400" />
          <span className="text-white font-bold text-sm">
            Clases del día
          </span>
          <span className="ml-auto text-white/30 text-xs">{misClasesDia.length} clase{misClasesDia.length !== 1 ? 's' : ''}</span>
        </div>

        {misClasesDia.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CalendarDays size={28} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No tenés clases para este día</p>
            {fecha >= hoy && (
              <button
                onClick={() => setModalNueva(true)}
                className="mt-3 text-orange-400 text-xs hover:underline"
              >
                Crear una clase
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {misClasesDia
              .sort((a, b) => a.inicio.localeCompare(b.inicio))
              .map((clase) => {
                const pasada = esPasada(fecha, clase.fin)
                return (
                  <div
                    key={clase.id}
                    className={[
                      'px-5 py-4 flex items-center gap-4',
                      pasada ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    {/* Horario */}
                    <div className="shrink-0 w-20 text-center bg-orange-400/10 border border-orange-400/20 rounded-xl py-2">
                      <p className="text-orange-400 font-bold text-sm">{clase.inicio}</p>
                      <p className="text-white/30 text-xs">{clase.fin}</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">
                        {clase.nota || 'Clase'}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">{clase.canchaNombre}</p>
                    </div>

                    {/* Acciones */}
                    {!pasada && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setClaseEditar(clase)}
                          className="text-white/30 hover:text-orange-400 transition-colors text-xs border border-white/10 hover:border-orange-400/30 rounded-lg px-2.5 py-1.5"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setClaseEliminar(clase)}
                          className="text-white/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Vista semanal compacta */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <span className="text-white font-bold text-sm">Resumen semanal</span>
        </div>
        <div className="divide-y divide-white/5">
          {diasSemana.map((d) => {
            const clasesDia = reservas.filter(
              (r) => r.tipo === 'clase' && r.profesorId === profesor?.id && r.fecha === d
            ).sort((a, b) => a.inicio.localeCompare(b.inicio))
            return (
              <button
                key={d}
                onClick={() => setFecha(d)}
                className={[
                  'w-full px-5 py-3 flex items-center gap-4 text-left transition-colors hover:bg-white/4',
                  d === fecha ? 'bg-white/4' : '',
                ].join(' ')}
              >
                <div className="shrink-0 w-24">
                  <p className={`text-xs font-bold capitalize ${d === fecha ? 'text-orange-400' : 'text-white/50'}`}>
                    {d === hoy ? 'Hoy' : fmtDiaCorto(d)} {new Date(d + 'T12:00:00').getDate()}
                  </p>
                </div>
                {clasesDia.length === 0 ? (
                  <p className="text-white/20 text-xs">Sin clases</p>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {clasesDia.map((c) => (
                      <span key={c.id} className="bg-orange-400/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-400/20">
                        {c.inicio}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Modales */}
      {modalNueva && (
        <ModalClase
          fecha={fecha}
          onClose={() => setModalNueva(false)}
          onSave={handleCrearClase}
          claseEditar={null}
          reservasDelDia={reservasDelDia}
          canchasDisponibles={canchasHabilitadas}
          profesorId={profesor?.id}
          franjasDelDia={franjasDelDia}
        />
      )}
      {claseEditar && (
        <ModalClase
          fecha={fecha}
          onClose={() => setClaseEditar(null)}
          onSave={handleEditarClase}
          claseEditar={claseEditar}
          reservasDelDia={reservasDelDia}
          canchasDisponibles={canchasHabilitadas}
          profesorId={profesor?.id}
          franjasDelDia={franjasDelDia}
        />
      )}
      {claseEliminar && (
        <ModalConfirmarEliminar
          clase={claseEliminar}
          onConfirm={handleEliminarClase}
          onClose={() => setClaseEliminar(null)}
        />
      )}
    </div>
  )
}

export default ProfesorAgendaPage
