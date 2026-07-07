import { useState, useMemo, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown, Info, Repeat, X, Trophy, UserPlus, Users } from 'lucide-react'
import useClubStore from '../store/clubStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import useTorneosStore from '../store/torneosStore'
import usePlayerStore from '../store/playerStore'
import BuscarJugadorModal from '../components/eventos/BuscarJugadorModal'
import InfoBlock from '../components/InfoBlock'
import { useToast } from '../components/ui/ToastProvider'
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

      // Slot cubierto por el propio TurnoFijo activo (fechas futuras sin Reserva específica)
      const miTurnoFijoActivo = !miReservaConfirmada && (turnosFijosAll || []).some(
        (t) =>
          t.activo &&
          t.canchaId === canchaId &&
          t.dia === diaKey &&
          overlaps(t.inicio ?? t.horaInicio, t.fin ?? t.horaFin, f.inicio, f.fin) &&
          !(t.diasAusentes || []).includes(fechaStr) &&
          (!t.desde || t.desde <= fechaStr)
      )

      // Slot cubierto por solicitud de TurnoFijo propia pendiente de aprobación admin
      const miTurnoFijoPendiente = !miReservaConfirmada && !miTurnoFijoActivo && (turnosFijosAll || []).some(
        (t) =>
          t.estado === 'pendiente' &&
          t.canchaId === canchaId &&
          t.dia === diaKey &&
          overlaps(t.inicio ?? t.horaInicio, t.fin ?? t.horaFin, f.inicio, f.fin)
      )

      const miReserva = miReservaConfirmada || miReservaPendiente
      const [hI, mI] = f.inicio.split(':').map(Number)
      const esPasado = esHoy && (hI * 60 + mI) < minutosAhora
      return {
        hora: f.inicio,
        horaFin: f.fin,
        pasado: esPasado && !miReserva && !miTurnoFijoActivo,
        ocupado: ((esOcupadoReal && !eraSlotFijoLiberado) || esOcupadoFijo || esOcupadoAdmin) && !miReserva && !miTurnoFijoActivo && !miTurnoFijoPendiente,
        miReserva: (!!miReservaConfirmada && !miTurnoFijoCancelacionPendiente) || miTurnoFijoActivo,
        miReservaPendiente: !!miReservaPendiente,
        miTurnoFijoPendiente,
        miTurnoFijoCancelacionPendiente,
        miReservaId: miReserva?.id,
      }
    })
}

// ─── Componente principal ────────────────────────────────────────────────────

const PlayerReservasPage = () => {
  const location = useLocation()
  const club = useClubStore((s) => s.club)
  const clubLoaded = useClubStore((s) => s._loaded)
  const { addReserva, cancelarReserva } = useReservasStore()
  const addSolicitudEnviada = usePlayerNotificationsStore((s) => s.addSolicitudEnviada)
  const { turnosFijos, addTurnoFijoFromApi } = useTurnosFijosStore()
  // Bloqueos ya no vienen del store local — todo desde el backend (reservasDBParaCancha)
  const torneos = useTorneosStore((s) => s.torneos)
  const token  = usePlayerStore((s) => s.token)
  const player = usePlayerStore((s) => s.player)
  const toast  = useToast()

  // ── Canchas y reservas desde la API ──────────────────────────────────────
  const [canchasDB, setCanchasDB] = useState([])
  const [reservasDB, setReservasDB] = useState([])
  const [misReservasDB, setMisReservasDB] = useState([])
  const [errorReserva, setErrorReserva] = useState(null)
  // Matching "no tengo con quién jugar": mis búsquedas activas (para saber qué reserva próxima
  // todavía no tiene una búsqueda abierta) + el modal de búsqueda atado a esa reserva.
  const [misSol, setMisSol] = useState([])
  const [buscarPrefill, setBuscarPrefill] = useState(null) // { fecha, horaInicio, nota, reservaId }

  const [slotsOcupadosClub, setSlotsOcupadosClub] = useState([])

  const clubId = club.id || import.meta.env.VITE_CLUB_ID

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

  // Mis búsquedas (para la card need-driven: detectar reservas próximas sin partido completo).
  const fetchMisSol = () => {
    if (!token) return
    api.get('/solicitudes/mias', { Authorization: `Bearer ${token}` })
      .then((d) => setMisSol(Array.isArray(d) ? d : [])).catch(() => setMisSol([]))
  }
  useEffect(() => { fetchMisSol() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recarga reservas del día cada vez que cambia la fecha seleccionada
  const fetchReservasDia = (fecha) => {
    if (!token) return
    api.get(`/reservas?fecha=${fecha}`, { Authorization: `Bearer ${token}` })
      .then((data) => setReservasDB(data))
      .catch(() => setReservasDB([]))
  }

  const hoy = new Date()
  const [fechaOffset, setFechaOffset] = useState(0)
  const [canchaId, setCanchaId] = useState(canchasActivas[0]?.id ?? 1)
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const [confirmaciones, setConfirmaciones] = useState([]) // [{ uid, esFijo, backendId, cancha, hora, horaFin, dia }]
  const [exitoReserva, setExitoReserva] = useState(null) // pantalla de éxito dentro del modal tras confirmar
  const [esTurnoFijo, setEsTurnoFijo] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

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
  const jugadorInscripto = torneoActivo?.inscriptos?.some(
    (i) => i.estado === 'inscripto' && (i.jugador1Id === player?.id || i.jugador2Id === player?.id)
  ) ?? false
  const fmtFechaTorneo = (iso) => { if (!iso) return ''; const [,m,d] = iso.split('-'); return `${d}/${m}` }

  const dayObj = addDays(hoy, fechaOffset)
  const diaNombre = DIAS_LARGOS[dayObj.getDay()]
  const canchaActual = canchasActivas.find((c) => c.id === canchaId)
  // Usa horario propio de la cancha SOLO si está activo para hoy; si no, hereda el del club
  const canchaHorarioDia = canchaActual?.horarios?.[diaNombre]
  const horarioDia = (canchaHorarioDia?.activo ? canchaHorarioDia : null) ?? club.horarios?.[diaNombre]

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
  // Reservas de la fecha seleccionada filtradas por cancha, usadas para disponibilidad real
  const reservasDBParaCancha = useMemo(
    () => (canchaDBId ? reservasDB.filter((r) => r.canchaId === canchaDBId) : []),
    [reservasDB, canchaDBId]
  )

  // Carga mis reservas al montar y cuando cambia el token
  useEffect(() => {
    fetchMisReservas()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga slots ocupados por turnos fijos activos del club + polling cada 30s
  useEffect(() => {
    if (!token) return
    const fetch = () =>
      api.get('/turnos-fijos/slots-ocupados', { Authorization: `Bearer ${token}` })
        .then((data) => { if (Array.isArray(data)) setSlotsOcupadosClub(data) })
        .catch(() => {})
    fetch()
    const interval = setInterval(fetch, 30_000)
    return () => clearInterval(interval)
  }, [token])

  // Recarga reservas cuando cambia la fecha + polling cada 30s para reflejar cambios del admin
  // También refresca misReservasDB en cada tick para que los colores de slot (pendiente/confirmado) estén al día
  useEffect(() => {
    setReservasDB([])
    fetchReservasDia(fechaSeleccionada)
    fetchMisReservas()
    const interval = setInterval(() => {
      fetchReservasDia(fechaSeleccionada)
      fetchMisReservas()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fechaSeleccionada, token]) // eslint-disable-line react-hooks/exhaustive-deps


  // Auto-limpiar toasts cuando el admin aprueba/confirma (el estado ya no es pendiente)
  useEffect(() => {
    if (confirmaciones.length === 0) return
    setConfirmaciones((prev) => prev.filter((c) => {
      if (c.esFijo) {
        const tf = turnosFijos.find((t) => t.id === c.backendId)
        return !tf || tf.estado === 'pendiente'
      } else {
        const r = misReservasDB.find((r) => r.id === c.backendId)
        return !r || r.estado === 'pendiente'
      }
    }))
  }, [misReservasDB, turnosFijos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Turnos fijos activos: los propios + los de otros jugadores del club (para bloquear grilla)
  // Excluye solo diasAusentes confirmados por admin
  const turnosFijosActivos = useMemo(() => {
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    const misTurnos = turnosFijos.filter(
      (t) =>
        (t.activo || t.estado === 'pendiente') &&
        t.dia === diaKey &&
        !(t.diasAusentes || []).includes(fechaSeleccionada)
    )
    const ajenosActivos = slotsOcupadosClub.filter(
      (s) =>
        s.canchaId &&
        s.horaInicio &&
        s.horaFin &&
        s.horaFin !== s.horaInicio &&
        s.dia === diaKey &&
        !(s.diasAusentes || []).includes(fechaSeleccionada) &&
        (!s.desde || s.desde <= fechaSeleccionada)
    )
    return [...misTurnos, ...ajenosActivos]
  }, [turnosFijos, slotsOcupadosClub, fechaSeleccionada])

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
    return generarSlots(horarioDia.apertura, horarioDia.cierre, canchaId, fechaSeleccionada, misReservasMapped, turnosFijosActivos, turnosFijosConPendiente, [], turnosFijos, reservasDBParaCancha)
  }, [horarioDia, canchaId, fechaSeleccionada, misReservasMapped, canchaActual, turnosFijosActivos, turnosFijosConPendiente, turnosFijos, reservasDBParaCancha])

  // horaFin del slot seleccionado (ej: '10:00' → '11:30')
  const slotFin = useMemo(
    () => slots.find((s) => s.hora === slotSeleccionado)?.horaFin ?? '',
    [slots, slotSeleccionado]
  )

  const precio = canchaActual?.precioTurno ?? 0

  // RN-51: un jugador no puede tener más de un turno fijo activo en la misma cancha el mismo día.
  // Se permite tener varios turnos fijos el mismo día siempre que sean en canchas distintas.
  // Solo deshabilitar el toggle de TF cuando el slot seleccionado tiene conflicto de horario con un TF propio
  const yaTimeTurnoFijoEnCancha = useMemo(() => {
    if (!canchaActual || !slotSeleccionado) return false
    const diaKey = getDiaSemanaKey(fechaSeleccionada)
    const slotFinActual = slots.find((s) => s.hora === slotSeleccionado)?.horaFin ?? ''
    if (!slotFinActual) return false
    return turnosFijos.some(
      (t) =>
        t.activo &&
        t.canchaId === canchaActual.id &&
        t.dia === diaKey &&
        overlaps(t.inicio ?? t.horaInicio, t.fin ?? t.horaFin, slotSeleccionado, slotFinActual)
    )
  }, [turnosFijos, canchaActual, fechaSeleccionada, slotSeleccionado, slots])

  const handleSelectSlot = (slot) => {
    if (slot.ocupado || slot.miReserva || slot.pasado) return
    setSlotSeleccionado(slot.hora)
    setEsTurnoFijo(false)
    setErrorReserva(null)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setSlotSeleccionado(null)
    setEsTurnoFijo(false)
    setExitoReserva(null)
  }

  const handleConfirmar = async () => {
    if (!slotSeleccionado || !canchaActual || submitting) return
    if (esTurnoFijo && yaTimeTurnoFijoEnCancha) return

    setSubmitting(true)
    let exito = null // datos para la pantalla de éxito del modal (se setea recién tras confirmar la API)

    if (esTurnoFijo) {
      // ── Solicitud de turno fijo → POST /turnos-fijos ──────────────────────
      let turnoConfirmado = false
      if (canchaDBId && token) {
        try {
          const turno = await api.post(
            '/turnos-fijos',
            { canchaId: canchaDBId, dia: getDiaSemanaKey(fechaSeleccionada), horaInicio: slotSeleccionado, horaFin: slotFin, precio },
            { Authorization: `Bearer ${token}` }
          )
          addTurnoFijoFromApi(turno)
          turnoConfirmado = turno.estado === 'confirmado' // auto-confirmado → al instante
          setConfirmaciones((prev) => [...prev, {
            uid: Date.now(),
            esFijo: true,
            confirmado: turnoConfirmado,
            backendId: turno.id ?? null,
            cancha: canchaActual.nombre,
            hora: slotSeleccionado,
            horaFin: slotFin,
            dia: getDiaSemanaKey(fechaSeleccionada),
          }])
        } catch (err) {
          setErrorReserva(err.message || 'No se pudo enviar la solicitud de turno fijo')
          setSubmitting(false)
          return
        }
      }
      // El notif local "solicitud enviada" solo aplica si NO se confirmó solo (si se confirmó, el jugador recibe la notif de backend).
      if (!turnoConfirmado) {
        addSolicitudEnviada({ canchaNombre: canchaActual.nombre, fecha: fechaSeleccionada, hora: slotSeleccionado, horaFin: slotFin })
      }
      exito = { esFijo: true, confirmado: turnoConfirmado, cancha: canchaActual.nombre, hora: slotSeleccionado, horaFin: slotFin, dia: getDiaSemanaKey(fechaSeleccionada) }
    } else {
      // ── Reserva eventual → POST /reservas ────────────────────────────────
      let backendReservaId = null
      let reservaConfirmada = false
      if (canchaDBId && token) {
        try {
          const reservaBackend = await api.post(
            '/reservas',
            { clubId, canchaId: canchaDBId, fecha: fechaSeleccionada, horaInicio: slotSeleccionado, horaFin: slotFin, precio, esTurnoFijo: false },
            { Authorization: `Bearer ${token}` }
          )
          backendReservaId = reservaBackend?.id ?? null
          reservaConfirmada = reservaBackend?.estado === 'confirmada' // auto-confirmada → al instante
          setConfirmaciones((prev) => [...prev, {
            uid: Date.now(),
            esFijo: false,
            confirmado: reservaConfirmada,
            backendId: backendReservaId,
            cancha: canchaActual.nombre,
            hora: slotSeleccionado,
            horaFin: slotFin,
            fecha: fechaSeleccionada,
          }])
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
      // El notif local "solicitud enviada" solo aplica si NO se confirmó sola (si se confirmó, el jugador recibe la notif de backend).
      if (!reservaConfirmada) {
        addSolicitudEnviada({ canchaNombre: canchaActual.nombre, fecha: fechaSeleccionada, hora: slotSeleccionado, horaFin: slotFin })
      }
      exito = { esFijo: false, confirmado: reservaConfirmada, cancha: canchaActual.nombre, hora: slotSeleccionado, horaFin: slotFin, fecha: fechaSeleccionada }
    }

    // Pantalla de éxito DENTRO del modal (la mutación ya ocurrió). El botón "Listo" cierra.
    if (exito) {
      setExitoReserva(exito)
    } else {
      setModalAbierto(false)
      setSlotSeleccionado(null)
    }
    setErrorReserva(null)
    setSubmitting(false)
  }

  // Esperar a que el club real llegue del backend antes de renderizar
  // Evita el flash de datos viejos del INITIAL_CLUB (4 canchas hardcodeadas)
  if (!clubLoaded) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reservar cancha</h1>
          <p className="text-white/40 text-sm mt-1">Seleccioná el día, la cancha y el horario.</p>
        </div>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-24 rounded-2xl bg-white/5 border border-white/6" />
          <div className="h-20 rounded-2xl bg-white/5 border border-white/6" />
          <div className="h-48 rounded-2xl bg-white/5 border border-white/6" />
        </div>
      </div>
    )
  }

  // ── Card "armá tu partido" (matching need-driven): se apoya en MIS reservas, así nunca se ve
  // vacía (no depende de la actividad de otros). Estado A: tengo un turno futuro sin búsqueda →
  // "buscá el que falta". Estado B: ya estoy buscando. Estado C: no tengo turnos → gancho a reservar.
  const fechaHoraTs = (f, h) => {
    const [y, mo, d] = f.split('-').map(Number)
    const [hh, mm] = (h || '00:00').split(':').map(Number)
    return new Date(y, mo - 1, d, hh, mm).getTime()
  }
  const ahoraTs = Date.now()
  const reservasFuturas = misReservasMapped
    .filter((r) => !r.esTurnoFijo && r.estado !== 'cancelada' && fechaHoraTs(r.fecha, r.hora) > ahoraTs)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const solReservaIds = new Set(misSol.filter((s) => s.reservaId && s.estado === 'abierta').map((s) => s.reservaId))
  const proximaSinBusqueda = reservasFuturas.find((r) => !solReservaIds.has(r.id))
  const tengoBusquedaActiva = misSol.some((s) => s.estado === 'abierta')

  return (
    <div className="flex flex-col gap-6">

      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reservar cancha</h1>
        <p className="text-white/40 text-sm mt-1">Seleccioná el día, la cancha y el horario.</p>
      </div>

      {/* ── Card "armá tu partido" — matching need-driven (no tengo con quién jugar) ── */}
      <div>
      <section className="rounded-2xl border border-club/25 bg-club/5 p-4 flex items-center gap-4">
        <span className="w-11 h-11 rounded-xl bg-club/15 grid place-items-center shrink-0"><Users size={20} className="text-club" /></span>
        <div className="flex-1 min-w-0">
          {proximaSinBusqueda ? (
            <>
              <p className="text-white text-sm font-bold">Te falta gente para tu turno</p>
              <p className="text-white/50 text-xs mt-0.5 capitalize">{proximaSinBusqueda.canchaNombre} · {fmtLegible(proximaSinBusqueda.fecha)} · {proximaSinBusqueda.hora} — todavía no completaste el partido.</p>
            </>
          ) : tengoBusquedaActiva ? (
            <>
              <p className="text-white text-sm font-bold">Estás buscando jugadores</p>
              <p className="text-white/50 text-xs mt-0.5">Avisamos a los de tu categoría. Te avisamos cuando alguien se suma.</p>
            </>
          ) : (
            <>
              <p className="text-white text-sm font-bold">¿No tenés con quién jugar?</p>
              <p className="text-white/50 text-xs mt-0.5">Reservá tu cancha y avisamos a los de tu categoría. El primero que se suma, juega.</p>
            </>
          )}
        </div>
        {proximaSinBusqueda ? (
          <button onClick={() => setBuscarPrefill({ fecha: proximaSinBusqueda.fecha, horaInicio: proximaSinBusqueda.hora, nota: proximaSinBusqueda.canchaNombre, reservaId: proximaSinBusqueda.id })}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all">
            <UserPlus size={15} /> Buscar el que falta
          </button>
        ) : tengoBusquedaActiva ? (
          <Link to="/dashboardJugadores/mis-reservas" className="shrink-0 px-4 py-2.5 rounded-xl border border-club/40 text-club text-sm font-bold hover:bg-club/10 transition-all">
            Ver mis búsquedas
          </Link>
        ) : (
          <span className="shrink-0 text-club/70 text-xs font-semibold flex items-center gap-1">Elegí un horario <ChevronDown size={14} /></span>
        )}
      </section>
      <InfoBlock label="¿Cómo armo mi partido?" variant="dark">
        <p><strong className="text-white/80">1. Reservá tu cancha</strong> y desde la tarjeta de arriba tocá <strong className="text-club">"Buscar el que falta"</strong>.</p>
        <p><strong className="text-white/80">2. Elegí cuántos faltan</strong> (1, 2 o 3 jugadores) o si buscás una <strong>pareja rival</strong> (2).</p>
        <p><strong className="text-white/80">3. ¿Quién lo ve?</strong> <strong>🌐 Público</strong>: se avisa a los de tu categoría por la app · <strong>🔒 Privado</strong>: solo por el link que compartís con tu grupo.</p>
        <p><strong className="text-white/80">4. Los que dicen ¡Voy!</strong> ocupan un lugar. Cuando se completa, les avisamos a todos por la app que <strong className="text-club">ya están todos</strong>. 🎾</p>
        <p className="text-white/40">Todos los avisos llegan dentro de la app (en la 🔔 campana).</p>
      </InfoBlock>
      </div>

      {/* Modal de búsqueda atado a la reserva elegida en la card */}
      {buscarPrefill && (
        <BuscarJugadorModal token={token} prefill={buscarPrefill}
          onClose={() => setBuscarPrefill(null)}
          onCreado={() => { setBuscarPrefill(null); fetchMisSol() }} />
      )}


      {/* ── Helper informativo ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <button
          onClick={() => setHelpOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/2 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-club/10 border border-club/20 flex items-center justify-center shrink-0">
              <Info size={12} className="text-club" />
            </div>
            <span className="text-white/60 text-xs font-medium">¿Cómo funciona esta sección?</span>
          </div>
          <ChevronDown size={14} className={`text-white/30 transition-transform duration-200 ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-white/5 pt-3">
            <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/6">
              <div className="w-7 h-7 rounded-lg bg-club/10 border border-club/20 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarDays size={13} className="text-club" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-semibold">Reserva puntual</p>
                <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                  Reservás la cancha para un día específico. Queda confirmada al instante. La encontrás en <span className="text-white/60 font-medium">"Mis reservas"</span> del menú.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/6">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Repeat size={13} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-semibold">Turno fijo semanal</p>
                <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                  Reservás ese mismo día y horario <span className="text-white/60 font-medium">todas las semanas</span>. Activá el toggle <span className="text-amber-400 font-medium">"Turno fijo semanal"</span> al seleccionar el slot. Queda confirmado al instante. Lo gestionás desde <span className="text-white/60 font-medium">"Mis turnos fijos"</span> del menú.
                </p>
              </div>
            </div>
          </div>
        )}
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

      {/* ── Toasts de confirmación (uno por operación, coexisten) ── */}
      {confirmaciones.map((c) => (
        <div key={c.uid} className={`flex items-start gap-3 border rounded-2xl px-5 py-3.5 ${c.esFijo ? 'bg-amber-500/10 border-amber-500/25' : 'bg-club/8 border-club/20'}`}>
          <div className="shrink-0 mt-0.5">
            {c.esFijo
              ? <Repeat size={16} className="text-amber-400" />
              : <CheckCircle size={16} className="text-club" />}
          </div>
          <div className="flex-1 min-w-0">
            {c.esFijo ? (
              <>
                <p className="text-amber-300 text-sm font-semibold">{c.confirmado ? '¡Turno fijo confirmado!' : 'Turno fijo enviado'}</p>
                <p className="text-amber-300/70 text-xs mt-0.5">
                  {c.cancha} · {c.dia} {c.hora}–{c.horaFin} · Semanal
                </p>
                <p className="text-amber-300/50 text-xs mt-1">
                  {c.confirmado ? 'Confirmado al instante' : 'Pendiente de aprobación'} · Lo gestionás en <span className="text-amber-300/80 font-medium">"Mis turnos fijos"</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-club text-sm font-semibold">{c.confirmado ? '¡Reserva confirmada!' : 'Reserva enviada'}</p>
                <p className="text-club/70 text-xs mt-0.5">
                  {c.cancha} · {c.hora}–{c.horaFin} · {c.fecha}
                </p>
                <p className="text-club/50 text-xs mt-1">
                  {c.confirmado ? 'Confirmada al instante' : 'Pendiente de confirmación admin'} · La ves en <span className="text-club/80 font-medium">"Mis reservas"</span>
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setConfirmaciones((prev) => prev.filter((x) => x.uid !== c.uid))}
            className="shrink-0 text-white/20 hover:text-white/50 transition-colors mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* ── Selector de fecha ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CalendarDays size={15} className="text-club" />
          <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Fecha</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { setFechaOffset(Math.max(0, fechaOffset - 1)); setSlotSeleccionado(null) }}
            disabled={fechaOffset === 0}
            className="w-8 h-8 rounded-lg hidden md:flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-0.5 no-scrollbar snap-x snap-mandatory scroll-smooth">
            {Array.from({ length: 14 }, (_, i) => {
              const d = addDays(hoy, i)
              const isSelected = i === fechaOffset
              return (
                <button
                  key={i}
                  onClick={() => { setFechaOffset(i); setSlotSeleccionado(null) }}
                  className={[
                    'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all shrink-0 min-w-[52px] snap-start',
                    isSelected
                      ? 'bg-club/12 border-club/40 text-club'
                      : 'border-white/6 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/4',
                  ].join(' ')}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}
                  </span>
                  <span className={`text-lg font-bold leading-none ${isSelected ? 'text-club' : ''}`}>
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
            className="w-8 h-8 rounded-lg hidden md:flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
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
              <MapPin size={15} className="text-club" />
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
                          ? 'bg-club/8 border-club/25 text-club/60'
                          : 'border-white/6 text-white/30 opacity-60'
                        : canchaId === c.id
                          ? 'bg-club/10 border-club/35 text-club'
                          : 'border-white/6 text-white/50 hover:text-white hover:border-white/15 hover:bg-white/4',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{c.nombre}</span>
                      {bloqueada && <Trophy size={10} className="text-club/50 shrink-0" />}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${canchaId === c.id ? 'text-club/60' : 'text-white/25'}`}>
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
                <Clock size={15} className="text-club" />
                <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Horarios disponibles</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/12 border border-white/10" /> Libre</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-club/20 border border-club/30" /> Confirmado</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500/20 border border-amber-500/30" /> Pendiente</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/30" /> Baja pendiente</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/4" /> Ocupado</span>
              </div>
            </div>

            {canchasBloquedas.includes(canchaId) ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-club/10 border border-club/20 flex items-center justify-center">
                  <Trophy size={26} className="text-club" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-white font-bold text-base">{torneoActivo.nombre}</p>
                  <p className="text-white/50 text-xs">
                    {fmtFechaTorneo(torneoActivo.fechaInicio)} → {fmtFechaTorneo(torneoActivo.fechaFin)}
                    {torneoActivo.categorias?.length > 0 && <span className="ml-2 text-club/70">{torneoActivo.categorias.join(' · ')}</span>}
                  </p>
                  <p className="text-white/30 text-xs">{torneoActivo.formato}</p>
                </div>
                {jugadorInscripto ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-club bg-club/10 border border-club/20 px-3 py-1 rounded-full">
                      Estás participando en este torneo
                    </span>
                    <Link to="/dashboardJugadores/torneos" className="text-xs text-white/40 hover:text-white/70 underline transition-colors">
                      Ver mi zona y resultados →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-white/40 text-xs">Esta cancha está reservada para el torneo.</p>
                    {torneoActivo.estado === 'open' ? (
                      <Link to="/dashboardJugadores/torneos" className="text-xs text-club hover:text-club/80 underline transition-colors">
                        Inscribite al torneo →
                      </Link>
                    ) : (
                      <p className="text-white/25 text-xs">Las inscripciones están cerradas.</p>
                    )}
                  </div>
                )}
                {!todasBloqueadas && (
                  <p className="text-[10px] text-white/20">Las demás canchas están disponibles normalmente.</p>
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
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-club/8 border-club/25 cursor-default text-center">
                        <CheckCircle size={10} className="text-club shrink-0" />
                        <span className="text-club font-bold text-[10px] leading-none">{slot.hora}</span>
                        <span className="text-club/50 text-[9px] leading-none">{slot.horaFin}</span>
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

                  if (slot.miTurnoFijoPendiente) {
                    return (
                      <div key={slot.hora} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-amber-500/8 border-amber-500/25 cursor-default text-center">
                        <Repeat size={10} className="text-amber-400 animate-pulse shrink-0" />
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
                          ? 'bg-club/15 border-club/50 ring-1 ring-club/30'
                          : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/16',
                      ].join(' ')}
                    >
                      <span className={`font-bold text-[10px] leading-none ${isSelected ? 'text-club' : 'text-white/80'}`}>
                        {slot.hora}
                      </span>
                      <span className={`text-[9px] leading-none ${isSelected ? 'text-club/60' : 'text-white/25'}`}>
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
            {exitoReserva ? (
            /* ── Pantalla de éxito (la mutación ya ocurrió; "Listo" solo cierra) ── */
            <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${exitoReserva.confirmado ? 'bg-club/15 border border-club/30' : 'bg-amber-500/15 border border-amber-500/30'}`}>
                <CheckCircle size={32} className={exitoReserva.confirmado ? 'text-club' : 'text-amber-400'} />
              </div>
              <div>
                <p className="text-white font-bold text-xl">
                  {exitoReserva.confirmado
                    ? (exitoReserva.esFijo ? '¡Turno fijo confirmado!' : '¡Reserva confirmada!')
                    : (exitoReserva.esFijo ? 'Solicitud enviada' : 'Reserva enviada')}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {exitoReserva.cancha} · {exitoReserva.hora}–{exitoReserva.horaFin}
                  {exitoReserva.esFijo ? ` · todos los ${exitoReserva.dia}` : ` · ${exitoReserva.fecha}`}
                </p>
              </div>
              <p className="text-white/35 text-xs max-w-xs">
                {exitoReserva.confirmado
                  ? `Quedó confirmado al instante. Lo ves en ${exitoReserva.esFijo ? '"Mis turnos fijos"' : '"Mis reservas"'}.`
                  : 'El club la revisará y te avisamos cuando la confirme.'}
              </p>
              <button
                onClick={handleCerrarModal}
                className="w-full mt-2 bg-club text-[#0d1117] font-bold text-base py-3.5 rounded-2xl hover:brightness-110 transition-all active:scale-[0.98]"
              >
                Listo
              </button>
            </div>
            ) : (
            <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-club/12 border border-club/20 flex items-center justify-center">
                  <Clock size={16} className="text-club" />
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
                  <span className="text-club font-black text-2xl">${precio.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Toggle turno fijo */}
              <div className={`flex items-center justify-between bg-white/3 border rounded-2xl px-4 py-3.5 ${yaTimeTurnoFijoEnCancha ? 'border-white/4 opacity-60' : 'border-white/6'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${esTurnoFijo ? 'bg-club/15 border border-club/25' : 'bg-white/5 border border-white/8'}`}>
                    <Repeat size={14} className={esTurnoFijo ? 'text-club' : 'text-white/30'} />
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-semibold">Turno fijo semanal</p>
                    <p className="text-white/30 text-[10px] mt-0.5">
                      {yaTimeTurnoFijoEnCancha
                        ? 'Ya tenés un turno fijo en esta cancha este día'
                        : esTurnoFijo
                          ? 'Se repetirá cada semana · Lo gestionás en "Mis turnos fijos"'
                          : 'Solo para este día · Lo verás en "Mis reservas"'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !yaTimeTurnoFijoEnCancha && setEsTurnoFijo((v) => !v)}
                  disabled={yaTimeTurnoFijoEnCancha}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${esTurnoFijo && !yaTimeTurnoFijoEnCancha ? 'bg-club' : 'bg-white/15'} disabled:cursor-not-allowed`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${esTurnoFijo && !yaTimeTurnoFijoEnCancha ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Error de la solicitud (ej: turno fijo ya existente) — visible en el modal */}
              {errorReserva && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
                  <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm font-medium">{errorReserva}</p>
                </div>
              )}

              {/* Botón confirmar */}
              <button
                onClick={handleConfirmar}
                disabled={submitting}
                className={[
                  'w-full flex items-center justify-center gap-3 font-bold text-base py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                  esTurnoFijo
                    ? 'bg-amber-400 text-[#0d1117] hover:bg-amber-300 shadow-lg shadow-amber-400/20'
                    : 'bg-club text-[#0d1117] hover:brightness-110 shadow-lg shadow-club/20',
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
            </>
            )}
          </div>
        </div>
      )}

      {/* ── Acceso rápido a reservas eventuales ── */}
      {misReservasMapped.filter((r) => !r.esTurnoFijo && (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= fmtDate(hoy)).length > 0 && (
        <Link
          to="/dashboardJugadores/mis-reservas"
          className="flex items-center justify-between px-5 py-3.5 bg-[#0d1117] border border-white/8 rounded-2xl hover:border-club/30 hover:bg-club/3 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-club/10 border border-club/20 flex items-center justify-center shrink-0">
              <CalendarDays size={14} className="text-club" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold group-hover:text-white transition-colors">
                {(() => {
                  const proximas = misReservasMapped.filter((r) => !r.esTurnoFijo && (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= fmtDate(hoy))
                  const confirmadas = proximas.filter((r) => r.estado === 'confirmada').length
                  const pendientes = proximas.filter((r) => r.estado === 'pendiente').length
                  return (
                    <>
                      {confirmadas > 0 && <span>{confirmadas} reserva{confirmadas !== 1 ? 's' : ''} confirmada{confirmadas !== 1 ? 's' : ''}</span>}
                      {pendientes > 0 && <span className="ml-2 text-amber-400">· {pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>}
                    </>
                  )
                })()}
              </p>
              <p className="text-white/25 text-[10px] mt-0.5">Ver en Mis reservas</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-white/20 group-hover:text-club -rotate-90 transition-colors" />
        </Link>
      )}

      {/* ── Acceso rápido a turnos fijos ── */}
      {turnosFijos.filter((t) => t.activo || t.estado === 'pendiente').length > 0 && (
        <Link
          to="/dashboardJugadores/turnos-fijos"
          className="flex items-center justify-between px-5 py-3.5 bg-[#0d1117] border border-white/8 rounded-2xl hover:border-violet-500/30 hover:bg-violet-500/3 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Repeat size={14} className="text-violet-400" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold group-hover:text-white transition-colors">
                {turnosFijos.filter((t) => t.activo).length} turno{turnosFijos.filter((t) => t.activo).length !== 1 ? 's' : ''} fijo{turnosFijos.filter((t) => t.activo).length !== 1 ? 's' : ''} activo{turnosFijos.filter((t) => t.activo).length !== 1 ? 's' : ''}
                {turnosFijos.some((t) => t.estado === 'pendiente') && (
                  <span className="ml-2 text-amber-400">
                    · {turnosFijos.filter((t) => t.estado === 'pendiente').length} pendiente{turnosFijos.filter((t) => t.estado === 'pendiente').length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <p className="text-white/25 text-[10px] mt-0.5">Ver en Mis turnos fijos</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-white/20 group-hover:text-violet-400 -rotate-90 transition-colors" />
        </Link>
      )}


    </div>
  )
}

export default PlayerReservasPage
