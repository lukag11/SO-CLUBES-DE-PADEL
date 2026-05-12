import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, CheckCircle, XCircle, ChevronLeft, ChevronRight, Info, Repeat, X, Trophy } from 'lucide-react'
import useClubStore from '../store/clubStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import useTorneosStore from '../store/torneosStore'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'

import { overlaps, reservaBloquea, offsetFecha, toMin, toTime } from '../utils/timeUtils'

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

// Genera slots de 1.5h dinámicamente desde apertura hasta cierre.
// Los slots empiezan exactamente en la hora de apertura del club.
// reservasReales: reservas del día desde la API (string canchaId)
// reservasAdmin: bloqueos/clases manuales del store local del admin
const snapHalfHour = (t) => {
  const [h, m] = t.split(':').map(Number)
  const r = Math.round((h * 60 + m) / 30) * 30
  return toTime(r >= 1440 ? 1410 : r)
}

const snapCierreToSlots = (apRaw, ciRaw) => {
  const ap = toMin(apRaw)
  let ci = ciRaw === '00:00' ? 1440 : toMin(ciRaw)
  if (ci < ap) ci += 1440  // cruce de medianoche
  const diff = ci - ap
  if (diff < 90) {
    const s = ap + 90
    return toTime(s % 1440)
  }
  const n = Math.max(1, Math.round(diff / 90))
  return toTime((ap + n * 90) % 1440)
}

const generarSlots = (apertura, cierre, canchaId, fechaStr, misReservas, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijosAll, reservasReales = []) => {
  // Sanea valores legacy con minutos arbitrarios → siempre :00 o :30, cierre múltiplo de 90 desde apertura
  const ap = snapHalfHour(apertura || '08:00')
  const rawCi = cierre || '23:00'
  const ci = snapCierreToSlots(ap, rawCi)
  const diaKey = getDiaSemanaKey(fechaStr)

  const apMin = toMin(ap)
  const ciMinRaw = ci === '00:00' ? 1440 : toMin(ci)
  // Si cierre < apertura en minutos → cruce de medianoche (ej: apertura 22:00, cierre 01:30)
  const ciMin = ciMinRaw < apMin ? ciMinRaw + 1440 : ciMinRaw
  const franjas = []
  let cur = ciMin - 90
  while (cur >= apMin) {
    franjas.unshift({ inicio: toTime(cur % 1440), fin: toTime((cur + 90) % 1440) })
    cur -= 90
  }

  // Reservas del día anterior que podrían cruzar medianoche hacia este día
  const fechaAnterior = offsetFecha(fechaStr, -1)
  const reservasAdminDiaAnterior = reservasAdmin.filter((r) => r.fecha === fechaAnterior && r.estado !== 'cancelada')

  // RN-52: slots cuya hora de inicio ya pasó no son reservables (solo para hoy)
  const ahora = new Date()
  const hoyStr = fmtDate(ahora)
  const esHoy = fechaStr === hoyStr
  const minutosAhora = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : -1

  return franjas
    .map((f) => {
      // Slot bloqueado por reservas reales de la DB (ya filtradas por cancha antes de entrar)
      const esOcupadoReal = reservasReales.some(
        (r) => r.estado !== 'cancelada' && overlaps(r.horaInicio, r.horaFin, f.inicio, f.fin)
      )

      // Slot bloqueado por turno fijo vigente
      const esOcupadoFijo = turnosFijosActivos.some(
        (t) => t.canchaId === canchaId && overlaps(t.horaInicio ?? t.inicio, t.horaFin ?? t.fin ?? t.horaInicio ?? t.inicio, f.inicio, f.fin)
      )

      // Slot bloqueado por bloqueos/clases manuales del admin (store local)
      const esOcupadoAdminMismoDia = reservasAdmin.some(
        (r) => r.fecha === fechaStr &&
               String(r.canchaId) === String(canchaId) &&
               r.estado !== 'cancelada' &&
               (r.tipo === 'bloqueo' || r.tipo === 'clase') &&
               overlaps(r.inicio, r.fin, f.inicio, f.fin)
      )

      // Bloqueos del día anterior que cruzan medianoche
      const esOcupadoAdminDiaAnterior = reservasAdminDiaAnterior.some(
        (r) => String(r.canchaId) === String(canchaId) &&
               (r.tipo === 'bloqueo' || r.tipo === 'clase') &&
               reservaBloquea(r, fechaStr, f.inicio, f.fin)
      )

      const esOcupadoAdmin = esOcupadoAdminMismoDia || esOcupadoAdminDiaAnterior

      // Si el slot tuvo un turno fijo que fue liberado (baja permanente o ausencia confirmada),
      // suprimir el mock para que el slot quede genuinamente disponible para reservar.
      const eraSlotFijoLiberado = (turnosFijosAll || []).some(
        (t) => t.canchaId === canchaId &&
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
            (t) => t.canchaId === canchaId && (t.horaInicio ?? t.inicio) === f.inicio
          ))
      )
      const miReservaPendiente = misReservas.find(
        (r) => r.canchaId === canchaId && r.fecha === fechaStr && r.hora === f.inicio && r.estado === 'pendiente'
      )
      const miTurnoFijoCancelacionPendiente = !!miReservaConfirmada?.esTurnoFijo &&
        turnosFijosConPendiente.some(
          (t) => t.canchaId === canchaId && (t.horaInicio ?? t.inicio) === f.inicio
        )

      const miReserva = miReservaConfirmada || miReservaPendiente
      const [hI, mI] = f.inicio.split(':').map(Number)
      const esPasado = esHoy && (hI * 60 + mI) < minutosAhora
      return {
        hora: f.inicio,
        horaFin: f.fin,
        pasado: esPasado && !miReserva,
        ocupado: ((esOcupadoReal && !eraSlotFijoLiberado) || esOcupadoFijo || esOcupadoAdmin) && !miReserva,
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
  const { addReserva, cancelarReserva } = useReservasStore()
  const addSolicitudEnviada = usePlayerNotificationsStore((s) => s.addSolicitudEnviada)
  const { turnosFijos, addTurnoFijoFromApi } = useTurnosFijosStore()
  const reservasAdmin = useReservasAdminStore((s) => s.reservas)
  const torneos = useTorneosStore((s) => s.torneos)
  const token = usePlayerStore((s) => s.token)

  // ── Canchas y reservas desde la API ──────────────────────────────────────
  const [canchasDB, setCanchasDB] = useState([])
  const [reservasDB, setReservasDB] = useState([])
  const [misReservasDB, setMisReservasDB] = useState([])
  const [errorReserva, setErrorReserva] = useState(null)

  const clubId = club.id || 'cmoryx4a900008t4qmzdzuiee'

  // canchasActivas usa los IDs reales de la DB (CUIDs) una vez que loadFromBackend carga los datos.
  const canchasActivas = useMemo(() => club.canchas.filter((c) => c.activa), [club.canchas])

  // Cuando canchasActivas cambia (loadFromBackend reemplaza IDs numéricos por CUIDs),
  // sincronizar canchaId si el actual ya no es válido.
  useEffect(() => {
    if (canchasActivas.length > 0 && !canchasActivas.find((c) => c.id === canchaId)) {
      setCanchaId(canchasActivas[0].id)
    }
  }, [canchasActivas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga canchas reales al montar
  useEffect(() => {
    api.get(`/canchas?clubId=${clubId}`)
      .then((data) => setCanchasDB(data))
      .catch(() => { /* fallback a clubStore si falla la API */ })
  }, [clubId])

  // Carga mis reservas desde el backend (fuente de verdad para la lista del jugador)
  const fetchMisReservas = () => {
    if (!token) return
    api.get('/reservas/me', { Authorization: `Bearer ${token}` })
      .then((data) => setMisReservasDB(data))
      .catch(() => setMisReservasDB([]))
  }

  // Recarga reservas del día cada vez que cambia la fecha seleccionada
  const fetchReservasDia = (fecha) => {
    if (!token) return
    api.get(`/reservas?clubId=${clubId}&fecha=${fecha}`, { Authorization: `Bearer ${token}` })
      .then((data) => setReservasDB(data))
      .catch(() => setReservasDB([]))
  }

  const hoy = new Date()
  const [fechaOffset, setFechaOffset] = useState(0)
  const [canchaId, setCanchaId] = useState(canchasActivas[0]?.id ?? 1)
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const [confirmado, setConfirmado] = useState(false)
  const [confirmadoEsFijo, setConfirmadoEsFijo] = useState(false)
  const [esTurnoFijo, setEsTurnoFijo] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [reservaACancelar, setReservaACancelar] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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

  const torneoActivo = useMemo(
    () => torneos.find((t) => t.estado === 'in_progress' && fechaSeleccionada >= t.fechaInicio && fechaSeleccionada <= t.fechaFin),
    [torneos, fechaSeleccionada]
  )

  const canchasBloquedas = useMemo(() => {
    if (!torneoActivo) return []
    if (torneoActivo.canchasAsignadas?.length) return torneoActivo.canchasAsignadas
    return canchasActivas.map((c) => c.id)
  }, [torneoActivo, canchasActivas])

  const todasBloqueadas = canchasBloquedas.length === canchasActivas.length

  const dayObj = addDays(hoy, fechaOffset)
  const diaNombre = DIAS_LARGOS[dayObj.getDay()]
  const canchaActual = canchasActivas.find((c) => c.id === canchaId)
  // Usa horario propio de la cancha si tiene personalización; si no, hereda el del club
  const horarioDia = canchaActual?.horarios?.[diaNombre] ?? club.horarios?.[diaNombre]

  // canchaDBId: cuid real de la cancha en la DB (para llamadas a la API)
  const canchaDBId = useMemo(
    () => canchasDB.find((c) => c.nombre === canchaActual?.nombre)?.id ?? null,
    [canchasDB, canchaActual]
  )

  // Mis reservas del backend mapeadas al formato local (canchaId numérico para generarSlots)
  const misReservasMapped = useMemo(() => {
    if (!canchasDB.length || !canchasActivas.length) return []
    return misReservasDB.map((r) => {
      const canchaDB = canchasDB.find((c) => c.id === r.canchaId)
      const canchaLocal = canchasActivas.find((c) => c.nombre === canchaDB?.nombre)
      return {
        id: r.id,
        canchaId: canchaLocal?.id ?? null,
        canchaNombre: r.cancha?.nombre ?? canchaDB?.nombre ?? '',
        canchaInfo: r.cancha ? `${r.cancha.tipo} · ${r.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
        fecha: r.fecha,
        hora: r.horaInicio,
        horaFin: r.horaFin,
        precio: r.precio ?? 0,
        esTurnoFijo: r.esTurnoFijo,
        estado: r.estado,
      }
    })
  }, [misReservasDB, canchasDB, canchasActivas])

  // Cálculo de política de cancelación para el modal
  const cancelacionInfo = useMemo(() => {
    if (!reservaACancelar) return { horasMinimas: 0, horasRestantes: Infinity, fueraDePlazo: false }
    const horasMinimas = club.horasCancelacion ?? 0
    const [y, m, d] = reservaACancelar.fecha.split('-').map(Number)
    const [h, min] = reservaACancelar.hora.split(':').map(Number)
    const fechaTurno = new Date(y, m - 1, d, h, min)
    const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)
    const fueraDePlazo = horasMinimas > 0 && horasRestantes < horasMinimas && horasRestantes >= 0
    return { horasMinimas, horasRestantes, fueraDePlazo }
  }, [reservaACancelar, club.horasCancelacion])

  const { horasMinimas, horasRestantes, fueraDePlazo } = cancelacionInfo

  // Reservas de la fecha seleccionada filtradas por cancha, usadas para disponibilidad real
  const reservasDBParaCancha = useMemo(
    () => (canchaDBId ? reservasDB.filter((r) => r.canchaId === canchaDBId) : []),
    [reservasDB, canchaDBId]
  )

  // Carga mis reservas al montar y cuando cambia el token
  useEffect(() => {
    fetchMisReservas()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recarga reservas cuando cambia la fecha
  useEffect(() => {
    fetchReservasDia(fechaSeleccionada)
  }, [fechaSeleccionada, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Turnos fijos activos: confirmados + pendientes bloquean el slot
  // Excluye solo diasAusentes confirmados por admin
  const turnosFijosActivos = useMemo(() => {
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    return turnosFijos.filter(
      (t) =>
        (t.activo || t.estado === 'pendiente') &&
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
    return generarSlots(horarioDia.apertura, horarioDia.cierre, canchaId, fechaSeleccionada, misReservasMapped, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijos, reservasDBParaCancha)
  }, [horarioDia, canchaId, fechaSeleccionada, misReservasMapped, canchaActual, turnosFijosActivos, turnosFijosConPendiente, reservasAdmin, turnosFijos, reservasDBParaCancha])

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
      (t) => t.activo && t.canchaId === canchaActual.id && t.dia === diaKey
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

    return misReservasMapped
      .filter((r) => (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= fmtDate(hoy) && !r.esTurnoFijo)
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
  }, [misReservasMapped, turnosFijos])

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

  const handleConfirmar = async () => {
    if (!slotSeleccionado || !canchaActual || submitting) return
    if (esTurnoFijo && yaTimeTurnoFijoEnCancha) return

    setSubmitting(true)

    if (esTurnoFijo) {
      // ── Solicitud de turno fijo → POST /turnos-fijos ──────────────────────
      if (canchaDBId && token) {
        try {
          const turno = await api.post(
            '/turnos-fijos',
            { canchaId: canchaDBId, dia: getDiaSemanaKey(fechaSeleccionada), horaInicio: slotSeleccionado, horaFin: slotFin, precio },
            { Authorization: `Bearer ${token}` }
          )
          addTurnoFijoFromApi(turno)
        } catch (err) {
          setErrorReserva(err.message || 'No se pudo enviar la solicitud de turno fijo')
          setSubmitting(false)
          return
        }
      }
      addSolicitudEnviada({ canchaNombre: canchaActual.nombre, fecha: fechaSeleccionada, hora: slotSeleccionado, horaFin: slotFin })
    } else {
      // ── Reserva eventual → POST /reservas ────────────────────────────────
      let backendReservaId = null
      if (canchaDBId && token) {
        try {
          const reservaBackend = await api.post(
            '/reservas',
            { clubId, canchaId: canchaDBId, fecha: fechaSeleccionada, horaInicio: slotSeleccionado, horaFin: slotFin, precio, esTurnoFijo: false },
            { Authorization: `Bearer ${token}` }
          )
          backendReservaId = reservaBackend?.id ?? null
          fetchReservasDia(fechaSeleccionada)
          fetchMisReservas()
        } catch (err) {
          setErrorReserva(err.message || 'No se pudo guardar la reserva')
          setSubmitting(false)
          return
        }
      }
      addReserva({
        canchaId: canchaActual.id,
        canchaNombre: canchaActual.nombre,
        canchaInfo: `${canchaActual.tipo} · ${canchaActual.indoor ? 'Indoor' : 'Outdoor'}`,
        fecha: fechaSeleccionada,
        hora: slotSeleccionado,
        horaFin: slotFin,
        precio,
        esTurnoFijo: false,
        backendReservaId,
      })
      addSolicitudEnviada({ canchaNombre: canchaActual.nombre, fecha: fechaSeleccionada, hora: slotSeleccionado, horaFin: slotFin })
    }
    setModalAbierto(false)
    setSlotSeleccionado(null)
    setConfirmadoEsFijo(esTurnoFijo)
    setConfirmado(true)
    setErrorReserva(null)
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reservar cancha</h1>
        <p className="text-white/40 text-sm mt-1">Seleccioná el día, la cancha y el horario.</p>
      </div>

      {/* ── Error al reservar ── */}
      {errorReserva && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-5 py-3.5">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-medium">{errorReserva}</p>
          <button onClick={() => setErrorReserva(null)} className="ml-auto text-red-400/50 hover:text-red-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

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
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { setFechaOffset(Math.max(0, fechaOffset - 1)); setSlotSeleccionado(null) }}
            disabled={fechaOffset === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-0.5 scrollbar-hide">
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
              {canchasActivas.map((c) => {
                const bloqueada = canchasBloquedas.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCanchaId(c.id); setSlotSeleccionado(null) }}
                    className={[
                      'flex flex-col items-start px-4 py-2.5 rounded-xl border transition-all text-left',
                      bloqueada
                        ? canchaId === c.id
                          ? 'bg-[#afca0b]/8 border-[#afca0b]/25 text-[#afca0b]/60'
                          : 'border-white/6 text-white/30 opacity-60'
                        : canchaId === c.id
                          ? 'bg-[#afca0b]/10 border-[#afca0b]/35 text-[#afca0b]'
                          : 'border-white/6 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/4',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{c.nombre}</span>
                      {bloqueada && <Trophy size={10} className="text-[#afca0b]/50 shrink-0" />}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${canchaId === c.id ? 'text-[#afca0b]/60' : 'text-white/25'}`}>
                      {bloqueada ? 'Reservada · torneo' : `${c.tipo} · ${c.indoor ? 'Indoor' : 'Outdoor'} · $${c.precioTurno.toLocaleString('es-AR')}`}
                    </span>
                  </button>
                )
              })}
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

            {canchasBloquedas.includes(canchaId) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#afca0b]/10 border border-[#afca0b]/20 flex items-center justify-center">
                  <Trophy size={26} className="text-[#afca0b]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{torneoActivo.nombre}</p>
                  <p className="text-white/40 text-xs mt-1">Esta cancha está reservada para el torneo este día.</p>
                </div>
                {!todasBloqueadas && (
                  <p className="text-[10px] text-[#afca0b]/40">Las demás canchas están disponibles normalmente.</p>
                )}
              </div>
            ) : !horarioDia?.activo ? (
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
              <div className="p-2 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1">
                {slots.map((slot) => {
                  const isSelected = slotSeleccionado === slot.hora

                  if (slot.miReserva) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-[#afca0b]/8 border-[#afca0b]/25 cursor-default text-center">
                        <CheckCircle size={10} className="text-[#afca0b] shrink-0" />
                        <span className="text-[#afca0b] font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-[#afca0b]/50 text-[9px] leading-none">{slot.horaFin}</span>
                      </div>
                    )
                  }

                  if (slot.miTurnoFijoCancelacionPendiente) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-red-500/8 border-red-500/25 cursor-default text-center">
                        <Clock size={10} className="text-red-400 animate-pulse shrink-0" />
                        <span className="text-red-400 font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-red-400/50 text-[9px] leading-none">{slot.horaFin}</span>
                      </div>
                    )
                  }

                  if (slot.miReservaPendiente) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-amber-500/8 border-amber-500/25 cursor-default text-center">
                        <Clock size={10} className="text-amber-400 animate-pulse shrink-0" />
                        <span className="text-amber-400 font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-amber-400/50 text-[9px] leading-none">{slot.horaFin}</span>
                      </div>
                    )
                  }

                  if (slot.pasado) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border border-white/4 bg-white/2 cursor-not-allowed opacity-25 text-center">
                        <span className="text-white/20 font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-white/15 text-[9px] leading-none">{slot.horaFin}</span>
                      </div>
                    )
                  }

                  if (slot.ocupado) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border border-white/4 bg-white/2 cursor-not-allowed opacity-40 text-center">
                        <span className="text-white/30 font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-white/20 text-[9px] leading-none">{slot.horaFin}</span>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={slot.hora}
                      onClick={() => handleSelectSlot(slot)}
                      className={[
                        'flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all duration-150 text-center',
                        isSelected
                          ? 'bg-[#afca0b]/15 border-[#afca0b]/50 ring-1 ring-[#afca0b]/30'
                          : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/16',
                      ].join(' ')}
                    >
                      <span className={`font-bold text-[10px] leading-none ${isSelected ? 'text-[#afca0b]' : 'text-white/80'}`}>
                        {slot.hora}
                      </span>
                      <span className={`text-[9px] leading-none ${isSelected ? 'text-[#afca0b]/60' : 'text-white/25'}`}>
                        {slot.horaFin}
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
                disabled={submitting}
                className={[
                  'w-full flex items-center justify-center gap-3 font-bold text-base py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                  esTurnoFijo
                    ? 'bg-amber-400 text-[#0d1117] hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                    : 'bg-[#afca0b] text-[#0d1117] hover:brightness-110 shadow-lg shadow-[#afca0b]/20',
                ].join(' ')}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    {esTurnoFijo ? <Repeat size={18} /> : <CheckCircle size={18} />}
                    {esTurnoFijo ? 'Enviar solicitud de turno fijo' : 'Confirmar reserva'}
                  </>
                )}
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
                <div key={r.id} className={`px-4 py-3.5 flex items-center gap-3 transition-colors ${bloqueado ? 'opacity-60' : r.estado === 'pendiente' ? 'bg-amber-500/3 hover:bg-amber-500/6' : 'hover:bg-white/2'}`}>
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${dateBoxCls}`}>
                    <span className={`font-black text-base leading-none ${dateTextCls}`}>{r.fecha.slice(8)}</span>
                    <span className={`text-[9px] uppercase ${dateTextCls} opacity-50`}>{MESES[parseInt(r.fecha.slice(5, 7)) - 1]}</span>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${fueraDePlazo ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <XCircle size={16} className={fueraDePlazo ? 'text-amber-400' : 'text-red-400'} />
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
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Aviso de cargo si está fuera de plazo */}
              {fueraDePlazo ? (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25">
                  <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-semibold text-xs">Cancelación fuera de plazo</p>
                    <p className="text-white/40 text-xs mt-1 leading-relaxed">
                      El club requiere cancelar con al menos <span className="text-amber-300 font-bold">{horasMinimas}h de anticipación</span>.
                      Podés cancelar igualmente, pero se registrará un cargo de <span className="text-amber-300 font-bold">${reservaACancelar.precio?.toLocaleString('es-AR')}</span> en tu cuenta.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-white/50 text-xs leading-relaxed">
                  ¿Estás seguro que deseás cancelar esta reserva? Esta acción no se puede deshacer.
                  {horasMinimas > 0 && (
                    <span className="block mt-1 text-[#afca0b]/60">
                      Cancelación gratuita — quedan {Math.floor(horasRestantes)}h de anticipación (mínimo {horasMinimas}h).
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/3 border border-white/8">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-white/50" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{reservaACancelar.canchaNombre}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {MESES[parseInt(reservaACancelar.fecha.slice(5, 7)) - 1]} {reservaACancelar.fecha.slice(8)} · {reservaACancelar.hora} a {reservaACancelar.horaFin}
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  const id = reservaACancelar.id
                  setReservaACancelar(null)
                  try {
                    await api.delete(`/reservas/${id}`, { Authorization: `Bearer ${token}` })
                    fetchMisReservas()
                    fetchReservasDia(fechaSeleccionada)
                  } catch (err) {
                    console.error('Error al cancelar reserva:', err)
                  }
                  cancelarReserva(id)
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-lg ${
                  fueraDePlazo
                    ? 'bg-amber-500 text-[#0d1117] hover:bg-amber-400 shadow-amber-500/20'
                    : 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20'
                }`}
              >
                <XCircle size={15} />
                {fueraDePlazo ? `Cancelar con cargo ($${reservaACancelar.precio?.toLocaleString('es-AR')})` : 'Sí, cancelar reserva'}
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
