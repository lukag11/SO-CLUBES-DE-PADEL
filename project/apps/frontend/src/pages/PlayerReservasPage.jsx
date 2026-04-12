import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, CheckCircle, XCircle, ChevronLeft, ChevronRight, Info, Repeat, X } from 'lucide-react'
import useClubStore from '../store/clubStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'

import { FRANJAS } from '../features/admin/reservasMockData'
import { inRange, overlaps, reservaBloquea, offsetFecha } from '../utils/timeUtils'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const getDiaSemanaKey = (fechaStr) => {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

// ─── Helpers de fecha ───────────────────────────────────────────────────────

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const fmtLegible = (fechaStr) => {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DIAS_CORTOS[date.getDay()]} ${d} ${MESES[m - 1]}`
}

// ─── Lógica de slots ─────────────────────────────────────────────────────────

// Mock ocupado determinístico (≈ 25% de slots) — usa minutos para soportar :30
const isMockOcupado = (canchaId, fechaStr, hora) => {
  const [h, m] = hora.split(':').map(Number)
  const min = h * 60 + m
  const d = parseInt(fechaStr.slice(8, 10))
  return (canchaId * 7 + d * 3 + min * 13) % 4 === 0
}

// Genera slots de 1.5h usando las mismas FRANJAS que el admin.
// Usa timeUtils para comparaciones correctas incluyendo rangos cross-midnight.
const generarSlots = (apertura, cierre, canchaId, fechaStr, misReservas, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijosAll) => {
  const ap = apertura || '07:00'
  const ci = cierre || '23:30'
  const diaKey = getDiaSemanaKey(fechaStr)

  // Reservas del día anterior que podrían cruzar medianoche hacia este día
  const fechaAnterior = offsetFecha(fechaStr, -1)
  const reservasAdminDiaAnterior = reservasAdmin.filter((r) => r.fecha === fechaAnterior && r.estado !== 'cancelada')

  // RN-52: slots cuya hora de inicio ya pasó no son reservables (solo para hoy)
  const ahora = new Date()
  const hoyStr = fmtDate(ahora)
  const esHoy = fechaStr === hoyStr
  const minutosAhora = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : -1

  return FRANJAS
    .filter((f) => {
      // inRange ya filtra correctamente incluyendo rangos cross-midnight.
      // Si el club no permite cruce de medianoche, el cierre del club será < 00:00
      // y inRange excluirá automáticamente las franjas cross-midnight.
      return inRange(f.inicio, f.fin, ap, ci)
    })
    .map((f) => {
      const esOcupadoMock = isMockOcupado(canchaId, fechaStr, f.inicio)

      // Slot bloqueado por turno fijo vigente
      const esOcupadoFijo = turnosFijosActivos.some(
        (t) => Number(t.canchaId) === canchaId && overlaps(t.inicio, t.fin || t.inicio, f.inicio, f.fin)
      )

      // Slot bloqueado por reservas del admin del mismo día (overlap cross-midnight aware)
      const esOcupadoAdminMismoDia = reservasAdmin.some(
        (r) => r.fecha === fechaStr &&
               Number(r.canchaId) === canchaId &&
               r.estado !== 'cancelada' &&
               overlaps(r.inicio, r.fin, f.inicio, f.fin)
      )

      // Slot bloqueado por reserva del día anterior que cruza medianoche
      const esOcupadoAdminDiaAnterior = reservasAdminDiaAnterior.some(
        (r) => Number(r.canchaId) === canchaId &&
               reservaBloquea(r, fechaStr, f.inicio, f.fin)
      )

      const esOcupadoAdmin = esOcupadoAdminMismoDia || esOcupadoAdminDiaAnterior

      // Si el slot tuvo un turno fijo que fue liberado (baja permanente o ausencia confirmada),
      // suprimir el mock para que el slot quede genuinamente disponible para reservar.
      const eraSlotFijoLiberado = (turnosFijosAll || []).some(
        (t) => Number(t.canchaId) === canchaId &&
               t.dia === diaKey &&
               overlaps(t.inicio, t.fin || t.inicio, f.inicio, f.fin) &&
               (!t.activo || (t.diasAusentes || []).includes(fechaStr))
      )

      const miReservaConfirmada = misReservas.find(
        (r) =>
          r.canchaId === canchaId &&
          r.fecha === fechaStr &&
          r.hora === f.inicio &&
          r.estado === 'confirmada' &&
          (!r.esTurnoFijo || turnosFijosActivos.some(
            (t) => Number(t.canchaId) === canchaId && t.inicio === f.inicio
          ))
      )
      const miReservaPendiente = misReservas.find(
        (r) => r.canchaId === canchaId && r.fecha === fechaStr && r.hora === f.inicio && r.estado === 'pendiente'
      )
      const miTurnoFijoCancelacionPendiente = !!miReservaConfirmada?.esTurnoFijo &&
        turnosFijosConPendiente.some(
          (t) => Number(t.canchaId) === canchaId && t.inicio === f.inicio
        )

      const miReserva = miReservaConfirmada || miReservaPendiente
      const [hI, mI] = f.inicio.split(':').map(Number)
      const esPasado = esHoy && (hI * 60 + mI) < minutosAhora
      return {
        hora: f.inicio,
        horaFin: f.fin,
        pasado: esPasado && !miReserva,
        ocupado: ((esOcupadoMock && !eraSlotFijoLiberado) || esOcupadoFijo || esOcupadoAdmin) && !miReserva,
        miReserva: !!miReservaConfirmada && !miTurnoFijoCancelacionPendiente,
        miReservaPendiente: !!miReservaPendiente,
        miTurnoFijoCancelacionPendiente,
        miReservaId: miReserva?.id,
      }
    })
}

// ─── Componente principal ────────────────────────────────────────────────────

const PlayerReservasPage = () => {
  const location = useLocation()
  const club = useClubStore((s) => s.club)
  const { reservas, addReserva, cancelarReserva } = useReservasStore()
  const addSolicitudEnviada = usePlayerNotificationsStore((s) => s.addSolicitudEnviada)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)
  const reservasAdmin = useReservasAdminStore((s) => s.reservas)

  const canchasActivas = useMemo(() => club.canchas.filter((c) => c.activa), [club.canchas])

  const hoy = new Date()
  const [fechaOffset, setFechaOffset] = useState(0)
  const [canchaId, setCanchaId] = useState(canchasActivas[0]?.id ?? 1)
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const [confirmado, setConfirmado] = useState(false)
  const [confirmadoEsFijo, setConfirmadoEsFijo] = useState(false)
  const [esTurnoFijo, setEsTurnoFijo] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [reservaACancelar, setReservaACancelar] = useState(null)

  // Auto-abrir modal si venimos desde la landing con un slot pre-seleccionado
  useEffect(() => {
    const { canchaId: cId, fechaStr, hora } = location.state ?? {}
    if (!cId || !fechaStr || !hora) return
    // Seleccionar cancha
    setCanchaId(Number(cId))
    // Calcular offset desde hoy (local)
    const hoyLocal = new Date()
    hoyLocal.setHours(0, 0, 0, 0)
    const [y, m, d] = fechaStr.split('-').map(Number)
    const target = new Date(y, m - 1, d)
    const offset = Math.round((target - hoyLocal) / 86400000)
    setFechaOffset(Math.max(0, Math.min(13, offset)))
    // Pre-seleccionar slot y abrir modal
    setSlotSeleccionado(hora)
    setEsTurnoFijo(false)
    setModalAbierto(true)
    // Limpiar el state para que un refresh no re-abra el modal
    window.history.replaceState({}, '')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fechaSeleccionada = fmtDate(addDays(hoy, fechaOffset))
  const dayObj = addDays(hoy, fechaOffset)
  const diaNombre = DIAS_LARGOS[dayObj.getDay()]
  const horarioDia = club.horarios?.[diaNombre]
  const canchaActual = canchasActivas.find((c) => c.id === canchaId)

  // Turnos fijos activos: excluye solo diasAusentes (confirmadas por admin)
  // Los que tienen ausenciasPendientes siguen bloqueando el slot para otros jugadores
  const turnosFijosActivos = useMemo(() => {
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    return turnosFijos.filter(
      (t) =>
        t.activo &&
        t.dia === diaKey &&
        !(t.diasAusentes || []).includes(fechaSeleccionada)
    )
  }, [turnosFijos, fechaSeleccionada])

  // Turnos fijos con cancelación pendiente de aprobación del admin
  const turnosFijosConPendiente = useMemo(() => {
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    return turnosFijos.filter(
      (t) =>
        t.activo &&
        t.dia === diaKey &&
        (t.ausenciasPendientes || []).includes(fechaSeleccionada)
    )
  }, [turnosFijos, fechaSeleccionada])

  const slots = useMemo(() => {
    if (!horarioDia?.activo || !canchaActual) return []
    return generarSlots(horarioDia.apertura, horarioDia.cierre, canchaId, fechaSeleccionada, reservas, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijos)
  }, [horarioDia, canchaId, fechaSeleccionada, reservas, canchaActual, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijos])

  // horaFin del slot seleccionado (ej: '10:00' → '11:30')
  const slotFin = useMemo(
    () => slots.find((s) => s.hora === slotSeleccionado)?.horaFin ?? '',
    [slots, slotSeleccionado]
  )

  const precio = canchaActual?.precioTurno ?? 0

  // RN-51: un jugador no puede tener más de un turno fijo activo en la misma cancha el mismo día.
  // Se permite tener varios turnos fijos el mismo día siempre que sean en canchas distintas.
  const yaTimeTurnoFijoEnCancha = useMemo(() => {
    if (!canchaActual) return false
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    return turnosFijos.some(
      (t) => t.activo && Number(t.canchaId) === canchaActual.id && t.dia === diaKey
    )
  }, [turnosFijos, canchaActual, fechaSeleccionada])

  const proximasReservas = useMemo(() => {
    const DIAS_INDEX = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }
    const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    const proximaOcurrencia = (dia, inicio) => {
      const ahora = new Date()
      const target = DIAS_INDEX[dia]
      if (ahora.getDay() === target) {
        const [h, m] = inicio.split(':').map(Number)
        if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) {
          const hoy2 = new Date(ahora); hoy2.setHours(0, 0, 0, 0); return toISO(hoy2)
        }
      }
      const base = new Date(ahora); base.setHours(0, 0, 0, 0)
      const diff = (target - base.getDay() + 7) % 7
      base.setDate(base.getDate() + (diff === 0 ? 7 : diff))
      return toISO(base)
    }

    return reservas
      .filter((r) => (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= fmtDate(hoy))
      .map((r) => {
        if (!r.esTurnoFijo) return { ...r, turnoFijoEstado: null }
        const turno = turnosFijos.find((t) => t.reservaId === r.id)
        if (!turno || !turno.activo) return { ...r, turnoFijoEstado: 'inactivo' }
        const proxISO = proximaOcurrencia(turno.dia, turno.inicio)
        if ((turno.ausenciasPendientes || []).includes(proxISO)) return { ...r, turnoFijoEstado: 'baja_pendiente' }
        if ((turno.diasAusentes || []).includes(proxISO)) return { ...r, turnoFijoEstado: 'ausente' }
        return { ...r, turnoFijoEstado: 'activo' }
      })
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  }, [reservas, turnosFijos])

  const handleSelectSlot = (slot) => {
    if (slot.ocupado || slot.miReserva || slot.pasado) return
    setSlotSeleccionado(slot.hora)
    setEsTurnoFijo(false)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setSlotSeleccionado(null)
    setEsTurnoFijo(false)
  }

  const handleConfirmar = () => {
    if (!slotSeleccionado || !canchaActual) return
    // RN-51: no permitir turno fijo si ya existe uno activo en esta cancha este día
    if (esTurnoFijo && yaTimeTurnoFijoEnCancha) return
    addReserva({
      canchaId: canchaActual.id,
      canchaNombre: canchaActual.nombre,
      canchaInfo: `${canchaActual.tipo} · ${canchaActual.indoor ? 'Indoor' : 'Outdoor'}`,
      fecha: fechaSeleccionada,
      hora: slotSeleccionado,
      horaFin: slotFin,
      precio,
      esTurnoFijo,
    })
    // RN-26: acuse de recibo inmediato al jugador (queda en campana de notificaciones)
    addSolicitudEnviada({
      canchaNombre: canchaActual.nombre,
      fecha: fechaSeleccionada,
      hora: slotSeleccionado,
      horaFin: slotFin,
    })
    setModalAbierto(false)
    setSlotSeleccionado(null)
    setConfirmadoEsFijo(esTurnoFijo)
    setConfirmado(true)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reservar cancha</h1>
        <p className="text-white/40 text-sm mt-1">Seleccioná el día, la cancha y el horario.</p>
      </div>

      {/* ── Toast confirmación ── */}
      {confirmado && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-3.5">
          <Repeat size={18} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            {confirmadoEsFijo
              ? 'Solicitud de turno fijo enviada. El admin la revisará y te notificará cuando esté aprobada.'
              : 'Solicitud enviada. El admin la revisará y te notificará cuando esté aprobada.'}
          </p>
          <button onClick={() => setConfirmado(false)} className="ml-auto text-amber-400/50 hover:text-amber-400 transition-colors">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* ── Selector de fecha ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CalendarDays size={15} className="text-[#afca0b]" />
          <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Fecha</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFechaOffset(Math.max(0, fechaOffset - 1)); setSlotSeleccionado(null) }}
            disabled={fechaOffset === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2 overflow-x-auto flex-1 pb-0.5 scrollbar-hide">
            {Array.from({ length: 14 }, (_, i) => {
              const d = addDays(hoy, i)
              const isSelected = i === fechaOffset
              return (
                <button
                  key={i}
                  onClick={() => { setFechaOffset(i); setSlotSeleccionado(null) }}
                  className={[
                    'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all shrink-0 min-w-[52px]',
                    isSelected
                      ? 'bg-[#afca0b]/12 border-[#afca0b]/40 text-[#afca0b]'
                      : 'border-white/6 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/4',
                  ].join(' ')}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}
                  </span>
                  <span className={`text-lg font-bold leading-none ${isSelected ? 'text-[#afca0b]' : ''}`}>
                    {d.getDate()}
                  </span>
                  <span className="text-[9px] opacity-60">{MESES[d.getMonth()]}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { setFechaOffset(Math.min(13, fechaOffset + 1)); setSlotSeleccionado(null) }}
            disabled={fechaOffset === 13}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Grid principal ── */}
      <div className="flex flex-col gap-4">

          {/* Tabs de canchas */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin size={15} className="text-[#afca0b]" />
              <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Cancha</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canchasActivas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCanchaId(c.id); setSlotSeleccionado(null) }}
                  className={[
                    'flex flex-col items-start px-4 py-2.5 rounded-xl border transition-all text-left',
                    canchaId === c.id
                      ? 'bg-[#afca0b]/10 border-[#afca0b]/35 text-[#afca0b]'
                      : 'border-white/6 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/4',
                  ].join(' ')}
                >
                  <span className="text-sm font-semibold">{c.nombre}</span>
                  <span className={`text-[10px] mt-0.5 ${canchaId === c.id ? 'text-[#afca0b]/60' : 'text-white/25'}`}>
                    {c.tipo} · {c.indoor ? 'Indoor' : 'Outdoor'} · ${c.precioTurno.toLocaleString('es-AR')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de turnos */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[#afca0b]" />
                <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Horarios disponibles</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/12 border border-white/10" /> Libre</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#afca0b]/20 border border-[#afca0b]/30" /> Confirmado</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500/20 border border-amber-500/30" /> Pendiente</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/30" /> Baja pendiente</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/4" /> Ocupado</span>
              </div>
            </div>

            {!horarioDia?.activo ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/25">
                <XCircle size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">El club no abre este día</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/25">
                <Info size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Sin turnos disponibles</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const isSelected = slotSeleccionado === slot.hora

                  if (slot.miReserva) {
                    return (
                      <div key={slot.hora} className="flex flex-col gap-1 p-3 rounded-xl border bg-[#afca0b]/8 border-[#afca0b]/25 cursor-default">
                        <div className="flex items-center justify-between">
                          <span className="text-[#afca0b] font-bold text-xs">{slot.hora} a {slot.horaFin}</span>
                          <CheckCircle size={12} className="text-[#afca0b]" />
                        </div>
                        <span className="text-[#afca0b]/50 text-[10px]">Confirmado</span>
                      </div>
                    )
                  }

                  if (slot.miTurnoFijoCancelacionPendiente) {
                    return (
                      <div key={slot.hora} className="flex flex-col gap-1 p-3 rounded-xl border bg-red-500/8 border-red-500/25 cursor-default">
                        <div className="flex items-center justify-between">
                          <span className="text-red-400 font-bold text-xs">{slot.hora} a {slot.horaFin}</span>
                          <Clock size={12} className="text-red-400 animate-pulse" />
                        </div>
                        <span className="text-red-400/60 text-[10px]">Baja pendiente de admin</span>
                      </div>
                    )
                  }

                  if (slot.miReservaPendiente) {
                    return (
                      <div key={slot.hora} className="flex flex-col gap-1 p-3 rounded-xl border bg-amber-500/8 border-amber-500/25 cursor-default">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 font-bold text-xs">{slot.hora} a {slot.horaFin}</span>
                          <Clock size={12} className="text-amber-400 animate-pulse" />
                        </div>
                        <span className="text-amber-400/60 text-[10px]">Pendiente aprobación</span>
                      </div>
                    )
                  }

                  if (slot.pasado) {
                    return (
                      <div key={slot.hora} className="flex flex-col gap-1 p-3 rounded-xl border border-white/4 bg-white/2 cursor-not-allowed opacity-25">
                        <span className="text-white/20 font-medium text-xs">{slot.hora} a {slot.horaFin}</span>
                        <span className="text-white/15 text-[10px]">Pasado</span>
                      </div>
                    )
                  }

                  if (slot.ocupado) {
                    return (
                      <div key={slot.hora} className="flex flex-col gap-1 p-3 rounded-xl border border-white/4 bg-white/2 cursor-not-allowed opacity-40">
                        <span className="text-white/30 font-medium text-xs">{slot.hora} a {slot.horaFin}</span>
                        <span className="text-white/20 text-[10px]">Ocupado</span>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={slot.hora}
                      onClick={() => handleSelectSlot(slot)}
                      className={[
                        'flex flex-col gap-1 p-3 rounded-xl border transition-all duration-150 text-left',
                        isSelected
                          ? 'bg-[#afca0b]/15 border-[#afca0b]/50 ring-1 ring-[#afca0b]/30'
                          : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/16',
                      ].join(' ')}
                    >
                      <span className={`font-bold text-xs ${isSelected ? 'text-[#afca0b]' : 'text-white/80'}`}>
                        {slot.hora} a {slot.horaFin}
                      </span>
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-[#afca0b]/70' : 'text-white/30'}`}>
                        ${precio.toLocaleString('es-AR')}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      {/* ── Modal de confirmación ── */}
      {modalAbierto && slotSeleccionado && canchaActual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleCerrarModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Tarjeta del modal */}
          <div
            className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#afca0b]/12 border border-[#afca0b]/20 flex items-center justify-center">
                  <Clock size={16} className="text-[#afca0b]" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Confirmá tu turno</p>
                  <p className="text-white/30 text-xs mt-0.5">{canchaActual.nombre} · {fmtLegible(fechaSeleccionada)}</p>
                </div>
              </div>
              <button
                onClick={handleCerrarModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="px-6 py-5 flex flex-col gap-5">

              {/* Resumen visual del turno */}
              <div className="bg-white/3 border border-white/6 rounded-2xl px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-white/30" />
                    <span className="text-white/40 text-xs">Cancha</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold text-sm">{canchaActual.nombre}</span>
                    <span className="text-white/30 text-xs ml-2">{canchaActual.tipo} · {canchaActual.indoor ? 'Indoor' : 'Outdoor'}</span>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-white/30" />
                    <span className="text-white/40 text-xs">Horario</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{slotSeleccionado} a {slotFin}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-xs">Total a pagar</span>
                  <span className="text-[#afca0b] font-black text-2xl">${precio.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Toggle turno fijo */}
              <div className={`flex items-center justify-between bg-white/3 border rounded-2xl px-4 py-3.5 ${yaTimeTurnoFijoEnCancha ? 'border-white/4 opacity-60' : 'border-white/6'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${esTurnoFijo ? 'bg-[#afca0b]/15 border border-[#afca0b]/25' : 'bg-white/5 border border-white/8'}`}>
                    <Repeat size={14} className={esTurnoFijo ? 'text-[#afca0b]' : 'text-white/30'} />
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-semibold">Turno fijo semanal</p>
                    <p className="text-white/30 text-[10px] mt-0.5">
                      {yaTimeTurnoFijoEnCancha
                        ? 'Ya tenés un turno fijo en esta cancha este día'
                        : esTurnoFijo ? 'El admin aprobará la solicitud' : 'Activá para reservar cada semana'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !yaTimeTurnoFijoEnCancha && setEsTurnoFijo((v) => !v)}
                  disabled={yaTimeTurnoFijoEnCancha}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${esTurnoFijo && !yaTimeTurnoFijoEnCancha ? 'bg-[#afca0b]' : 'bg-white/15'} disabled:cursor-not-allowed`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${esTurnoFijo && !yaTimeTurnoFijoEnCancha ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Botón confirmar */}
              <button
                onClick={handleConfirmar}
                className={[
                  'w-full flex items-center justify-center gap-3 font-bold text-base py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]',
                  esTurnoFijo
                    ? 'bg-amber-400 text-[#0d1117] hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                    : 'bg-[#afca0b] text-[#0d1117] hover:brightness-110 shadow-lg shadow-[#afca0b]/20',
                ].join(' ')}
              >
                {esTurnoFijo ? <Repeat size={18} /> : <CheckCircle size={18} />}
                {esTurnoFijo ? 'Enviar solicitud de turno fijo' : 'Confirmar reserva'}
              </button>

              <button
                onClick={handleCerrarModal}
                className="w-full text-white/25 hover:text-white/50 text-sm transition-colors py-1 text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mis próximas reservas ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[#afca0b]" />
            <h3 className="text-white font-semibold text-sm">Mis próximas reservas</h3>
          </div>
          <span className="text-white/30 text-xs">{proximasReservas.length} activa{proximasReservas.length !== 1 ? 's' : ''}</span>
        </div>

        {proximasReservas.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-white/20">
            <CalendarDays size={28} className="opacity-40" />
            <p className="text-sm">No tenés reservas próximas</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {proximasReservas.map((r) => {
              const bajaPendiente = r.turnoFijoEstado === 'baja_pendiente'
              const ausente = r.turnoFijoEstado === 'ausente'
              const bloqueado = bajaPendiente || ausente

              // Colores del bloque de fecha
              const dateBoxCls = r.estado === 'pendiente'
                ? 'bg-amber-500/10 border border-amber-500/20'
                : bajaPendiente ? 'bg-amber-500/10 border border-amber-500/20'
                : ausente ? 'bg-white/5 border border-white/8'
                : 'bg-[#afca0b]/10 border border-[#afca0b]/20'

              const dateTextCls = r.estado === 'pendiente'
                ? 'text-amber-400'
                : bajaPendiente ? 'text-amber-400'
                : ausente ? 'text-white/25'
                : 'text-[#afca0b]'

              return (
                <div key={r.id} className={`px-5 py-4 flex items-center gap-4 transition-colors ${bloqueado ? 'opacity-60' : r.estado === 'pendiente' ? 'bg-amber-500/3 hover:bg-amber-500/6' : 'hover:bg-white/2'}`}>
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${dateBoxCls}`}>
                    <span className={`font-black text-base leading-none ${dateTextCls}`}>{r.fecha.slice(8)}</span>
                    <span className={`text-[9px] uppercase ${dateTextCls} opacity-50`}>{MESES[parseInt(r.fecha.slice(5, 7)) - 1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm truncate ${bloqueado ? 'text-white/40' : 'text-white'}`}>{r.canchaNombre}</p>
                      {r.estado === 'pendiente' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                          Pendiente aprobación
                        </span>
                      )}
                      {r.estado === 'confirmada' && r.esTurnoFijo && !bloqueado && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 shrink-0">
                          Turno fijo
                        </span>
                      )}
                      {bajaPendiente && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                          Baja pendiente
                        </span>
                      )}
                      {ausente && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/30 border border-white/10 shrink-0">
                          Ausencia confirmada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-white/40 text-xs flex items-center gap-1">
                        <Clock size={10} /> {r.hora}{r.horaFin ? ` a ${r.horaFin}` : ''}
                      </span>
                      <span className={`text-xs font-medium ${bloqueado ? 'text-white/20' : r.estado === 'pendiente' ? 'text-amber-400/70' : 'text-[#afca0b]/70'}`}>
                        ${r.precio.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                  {!r.esTurnoFijo && (
                    <button
                      onClick={() => setReservaACancelar(r)}
                      className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/8 shrink-0"
                      title="Cancelar reserva"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal confirmación cancelar reserva eventual ── */}
      {reservaACancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReservaACancelar(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <XCircle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Cancelar reserva</p>
                  <p className="text-white/30 text-xs mt-0.5">{reservaACancelar.canchaNombre} · {reservaACancelar.hora} a {reservaACancelar.horaFin}</p>
                </div>
              </div>
              <button onClick={() => setReservaACancelar(null)} className="text-white/20 hover:text-white/60 transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-5">
              <p className="text-white/50 text-xs leading-relaxed">
                ¿Estás seguro que deseás cancelar esta reserva? Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-red-500/8 border border-red-500/20">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-red-300 font-bold text-sm">{reservaACancelar.canchaNombre}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {MESES[parseInt(reservaACancelar.fecha.slice(5, 7)) - 1]} {reservaACancelar.fecha.slice(8)} · {reservaACancelar.hora} a {reservaACancelar.horaFin}
                  </p>
                </div>
              </div>

              <button
                onClick={() => { cancelarReserva(reservaACancelar.id); setReservaACancelar(null) }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all bg-red-500 text-white hover:bg-red-400 active:scale-[0.98] shadow-lg shadow-red-500/20"
              >
                <XCircle size={15} />
                Sí, cancelar reserva
              </button>

              <button onClick={() => setReservaACancelar(null)} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PlayerReservasPage
