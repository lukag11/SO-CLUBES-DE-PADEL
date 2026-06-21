import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { runSerializable } from '../lib/serializable.js'
import { clubAutoConfirma } from '../lib/autoConfirma.js'
import { requireAuth, requireRole, requireActive, requirePermiso } from '../middleware/auth.js'

const router = Router()

const crearNotifTurnoFijo = (turno, tipo) => {
  if (!turno.jugadorId) return
  prisma.notificacion.create({
    data: {
      clubId: turno.clubId,
      jugadorId: turno.jugadorId,
      tipo,
      data: {
        canchaNombre: turno.cancha?.nombre ?? '',
        dia: turno.dia,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
      },
    },
  }).catch(() => {})
}

const INCLUDE_CANCHA = {
  cancha: { select: { id: true, nombre: true, tipo: true, indoor: true } },
  jugador: { select: { id: true, nombre: true, apellido: true, dni: true } },
}

const mapTurno = (t) => ({
  id: t.id,
  clubId: t.clubId,
  canchaId: t.canchaId,
  canchaNombre: t.cancha?.nombre ?? '',
  canchaInfo: t.cancha ? `${t.cancha.tipo ?? 'Padel'} · ${t.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
  jugadorId: t.jugadorId,
  jugador: t.jugador ? `${t.jugador.nombre} ${t.jugador.apellido ?? ''}`.trim() : '',
  jugadorDni: t.jugador?.dni ?? '',
  dia: t.dia,
  inicio: t.horaInicio,
  fin: t.horaFin,
  precio: t.precio,
  estado: t.estado,
  activo: t.estado === 'confirmado',
  diasAusentes: t.diasAusentes ?? [],
  diasAusentesJugador: t.diasAusentesJugador ?? [],
  ausenciasPendientes: t.ausenciasPendientes ?? [],
  desde: t.desde,
  notas: t.notas ?? '',
})

// ── GET /slots-dia?fecha=YYYY-MM-DD — profesor: TurnosFijos ocupados del club para una fecha concreta ──
router.get('/slots-dia', requireAuth, requireRole('profesor'), async (req, res) => {
  const { fecha } = req.query
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' })
  const clubId = req.user.clubId
  if (!clubId) return res.json([])
  try {
    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS[new Date(fy, fm - 1, fd).getDay()]
    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId, dia, estado: 'confirmado' },
      select: { canchaId: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
    })
    const slots = turnos
      .filter((t) => !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))
      .map(({ canchaId, horaInicio, horaFin }) => ({ canchaId, inicio: horaInicio, fin: horaFin }))
    res.json(slots)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /slots-ocupados?clubId= — jugador: slots bloqueados por turnos fijos del club (sin datos personales) ──
router.get('/slots-ocupados', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    // El jugador tiene su clubId embebido en el JWT vía el club al que pertenece
    // Lo obtenemos a través de su perfil
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      select: { clubId: true },
    })
    if (!jugador?.clubId) return res.json([])

    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId: jugador.clubId, estado: 'confirmado' },
      select: { canchaId: true, dia: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
    })
    res.json(turnos)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /me — jugador: sus turnos fijos ──────────────────────────────────────
router.get('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const turnos = await prisma.turnoFijo.findMany({
      where: { jugadorId: req.user.id, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /?clubId= — admin: todos los turnos del club ─────────────────────────
// GET /api/turnos-fijos/jugador/:id   — admin ve los turnos fijos de un jugador específico
router.get('/jugador/:id', requireAuth, requireRole('admin'), requirePermiso('reservas'), async (req, res) => {
  try {
    const turnos = await prisma.turnoFijo.findMany({
      where: { jugadorId: req.params.id, clubId: req.user.clubId, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/', requireAuth, requireRole('admin'), requirePermiso('reservas'), async (req, res) => {
  try {
    const clubId = req.user.clubId  // siempre del JWT, ignorar query param
    if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST / — jugador: solicitar turno fijo ───────────────────────────────────
router.post('/', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const { canchaId, dia, horaInicio, horaFin, precio, notas } = req.body
    if (!canchaId || !dia || !horaInicio || !horaFin) {
      return res.status(400).json({ error: 'canchaId, dia, horaInicio y horaFin son requeridos' })
    }

    // Validar duración exacta de 90 minutos (regla de negocio central)
    // "00:00" es medianoche del día siguiente (1440 min), no el minuto 0 → si no, un turno
    // 22:30–00:00 daría duración negativa y rechazaría un turno válido de 1.5h.
    const toMinBE = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const finMin = horaFin === '00:00' ? 1440 : toMinBE(horaFin)
    const duracion = finMin - toMinBE(horaInicio)
    if (duracion !== 90) {
      return res.status(400).json({ error: 'El turno fijo debe durar exactamente 1.5h (90 minutos)' })
    }

    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    // Auto-confirmación (mismo criterio que las reservas, por decisión de producto). Fuera de la TX.
    const club = await prisma.club.findUnique({ where: { id: req.user.clubId } })
    const autoConfirma = clubAutoConfirma(club)
    const estadoInicial = autoConfirma ? 'confirmado' : 'pendiente'

    // RN-51 + create dentro de una transacción Serializable (runSerializable): evita que dos
    // solicitudes simultáneas al mismo slot pasen ambas la validación (TOCTOU) y generen dos TF
    // pendientes para la misma cancha+día+horario. READ COMMITTED no alcanza para esto.
    const turno = await runSerializable(async (tx) => {
      // "00:00" como FIN = medianoche siguiente (1440), no minuto 0. Sin esto, dos turnos
      // 22:30–00:00 no se detectan como solapados (nfMin=0) y se permite el doble booking.
      const nsMin = toMinBE(horaInicio), nfMin = horaFin === '00:00' ? 1440 : toMinBE(horaFin)
      const existentes = await tx.turnoFijo.findMany({
        where: { canchaId, dia, estado: { in: ['pendiente', 'confirmado'] } },
        select: { horaInicio: true, horaFin: true },
      })
      if (existentes.some((t) => {
        const esMin = toMinBE(t.horaInicio), efMin = t.horaFin === '00:00' ? 1440 : toMinBE(t.horaFin)
        return esMin < nfMin && nsMin < efMin
      })) {
        throw Object.assign(
          new Error('Ya existe un turno fijo activo o pendiente en ese horario para esa cancha'),
          { status: 409 }
        )
      }

      return tx.turnoFijo.create({
        data: {
          clubId: req.user.clubId,
          canchaId,
          jugadorId: req.user.id,
          dia,
          horaInicio,
          horaFin,
          precio: precio ? Math.round(Number(precio)) : null,
          estado: estadoInicial,
          diasAusentes: [],
          diasAusentesJugador: [],
          ausenciasPendientes: [],
          desde,
          notas: notas ?? null,
        },
        include: INCLUDE_CANCHA,
      })
    })

    const dataNotif = {
      jugador: turno.jugador ? `${turno.jugador.nombre} ${turno.jugador.apellido ?? ''}`.trim() : '',
      canchaNombre: turno.cancha?.nombre ?? '',
      dia,
      horaInicio,
      horaFin,
      precio: precio ? Math.round(Number(precio)) : null,
      turnoFijoId: turno.id,
    }

    if (autoConfirma) {
      // Confirmado al instante: jugador ("aprobado") + admin como CONTROL (informativo).
      crearNotifTurnoFijo(turno, 'turno_fijo_confirmado')
      prisma.notificacion.create({
        data: { clubId: req.user.clubId, jugadorId: null, tipo: 'turno_fijo_autoconfirmado', data: dataNotif },
      }).catch(() => {})
    } else {
      // Flujo manual (auto-confirmación apagada): el admin debe aprobar, como siempre.
      prisma.notificacion.create({
        data: { clubId: req.user.clubId, jugadorId: null, tipo: 'solicitud_turno_fijo', data: dataNotif },
      }).catch(() => {})
    }

    res.status(201).json(mapTurno(turno))
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH /:id/estado — admin: confirmar | rechazar | dar de baja ─────────────
router.patch('/:id/estado', requireAuth, requireRole('admin'), requirePermiso('reservas'), async (req, res) => {
  try {
    const { estado } = req.body
    if (!['confirmado', 'inactivo', 'pendiente'].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' })
    }

    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })

    // Baja definitiva de turno confirmado: bloquear si el jugador tiene deudas pendientes
    if (estado === 'inactivo' && turno.estado === 'confirmado' && turno.jugadorId) {
      const cargosPendientes = await prisma.cargo.count({
        where: { jugadorId: turno.jugadorId, clubId: req.user.clubId, estado: 'pendiente' },
      })
      if (cargosPendientes > 0) {
        return res.status(409).json({
          error: 'El jugador tiene cargos pendientes. Regularice la deuda antes de dar de baja el turno fijo.',
          cargosPendientes,
        })
      }
    }

    // Al confirmar: re-verificar conflictos + update dentro de una transacción Serializable
    // (runSerializable). Sin Serializable, dos aprobaciones concurrentes podían pasar ambas la
    // re-verificación antes de que cualquiera escribiera, resultando en dos TF confirmados
    // para el mismo slot. Postgres aborta una de las dos y runSerializable reintenta.
    const toMinLocal = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

    let updated
    if (estado === 'confirmado') {
      const nsMin = toMinLocal(turno.horaInicio)
      // "00:00" como FIN = medianoche siguiente (1440), no minuto 0 (evita falsos negativos de solapamiento).
      const nfMin = turno.horaFin === '00:00' ? 1440 : toMinLocal(turno.horaFin)

      // Calcular fechas de próximas ocurrencias (fuera de TX — es solo aritmética de fechas)
      const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
      const targetDow = DIAS.indexOf(turno.dia)
      const fechas = []
      const base = new Date()
      for (let i = 0; i < 60; i++) {
        const d = new Date(base)
        d.setDate(base.getDate() + i)
        if (d.getDay() === targetDow) {
          fechas.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
          if (fechas.length >= 8) break
        }
      }

      updated = await runSerializable(async (tx) => {
        // Otro TF confirmado solapado en la misma cancha+día
        const tfsSolapados = await tx.turnoFijo.findMany({
          where: { canchaId: turno.canchaId, dia: turno.dia, estado: 'confirmado', id: { not: turno.id } },
          select: { horaInicio: true, horaFin: true },
        })
        if (tfsSolapados.some((t) => {
          const esMin = toMinLocal(t.horaInicio), efMin = t.horaFin === '00:00' ? 1440 : toMinLocal(t.horaFin)
          return esMin < nfMin && nsMin < efMin
        })) {
          throw Object.assign(
            new Error('Ya existe otro turno fijo confirmado en ese horario y cancha. El slot fue tomado mientras este turno estaba pendiente.'),
            { status: 409 }
          )
        }

        // Reserva eventual confirmada en las próximas 8 ocurrencias del día
        const reservasConflicto = await tx.reserva.findMany({
          where: { canchaId: turno.canchaId, fecha: { in: fechas }, estado: { in: ['confirmada', 'pendiente'] } },
          select: { horaInicio: true, horaFin: true, fecha: true, tipo: true },
        })
        const conflictoReserva = reservasConflicto.find((r) => {
          const esMin = toMinLocal(r.horaInicio), efMin = r.horaFin === '00:00' ? 1440 : toMinLocal(r.horaFin)
          return esMin < nfMin && nsMin < efMin
        })
        if (conflictoReserva) {
          throw Object.assign(
            new Error(`El horario tiene una reserva ${conflictoReserva.tipo === 'clase' ? 'de clase' : 'eventual'} confirmada el ${conflictoReserva.fecha}. Resolvé ese conflicto antes de confirmar el turno fijo.`),
            { status: 409, conflictoFecha: conflictoReserva.fecha }
          )
        }

        return tx.turnoFijo.update({
          where: { id: req.params.id },
          data: { estado },
          include: INCLUDE_CANCHA,
        })
      })
    } else {
      updated = await prisma.turnoFijo.update({
        where: { id: req.params.id },
        data: { estado },
        include: INCLUDE_CANCHA,
      })
    }

    if (estado === 'confirmado') crearNotifTurnoFijo(updated, 'turno_fijo_confirmado')
    if (estado === 'inactivo') {
      // Si era confirmado → baja permanente. Si era pendiente → rechazo.
      const tipoNotif = turno.estado === 'confirmado' ? 'turno_fijo_baja' : 'turno_fijo_rechazado'
      crearNotifTurnoFijo(updated, tipoNotif)
    }

    res.json(mapTurno(updated))
  } catch (e) {
    if (e.status === 409) {
      const body = { error: e.message }
      if (e.conflictoFecha) body.conflictoFecha = e.conflictoFecha
      return res.status(409).json(body)
    }
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /:id — jugador: cancelar definitivamente su propio turno fijo ──────
router.delete('/:id', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.jugadorId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' })
    if (turno.estado === 'inactivo') return res.status(400).json({ error: 'El turno ya está cancelado' })

    // Si estaba confirmado, verificar que no tenga deudas pendientes
    if (turno.estado === 'confirmado') {
      const cargosPendientes = await prisma.cargo.count({
        where: { jugadorId: req.user.id, clubId: turno.clubId, estado: 'pendiente' },
      })
      if (cargosPendientes > 0) {
        return res.status(409).json({
          error: 'Tenés cargos pendientes. Regularizá tu deuda antes de cancelar el turno fijo.',
          cargosPendientes,
        })
      }
    }

    const updated = await prisma.turnoFijo.update({
      where: { id: req.params.id },
      data: { estado: 'inactivo' },
      include: INCLUDE_CANCHA,
    })

    // Notificar al admin (distinguir retiro de solicitud pendiente vs baja de turno confirmado)
    const tipoNotifAdmin = turno.estado === 'confirmado' ? 'turno_fijo_cancelado_jugador' : 'turno_fijo_retirado_jugador'
    prisma.notificacion.create({
      data: {
        clubId: turno.clubId,
        jugadorId: null,
        tipo: tipoNotifAdmin,
        data: {
          jugador: updated.jugador ? `${updated.jugador.nombre} ${updated.jugador.apellido ?? ''}`.trim() : '',
          canchaNombre: updated.cancha?.nombre ?? '',
          dia: turno.dia,
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
        },
      },
    }).catch(() => {})

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /:id/ausencia — jugador: solicitar ausencia puntual ─────────────────
router.post('/:id/ausencia', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const { fecha } = req.body
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' })

    // Lectura + validación + escrituras atómicas bajo Serializable: evita que dos requests
    // concurrentes (doble-submit fuera de plazo) pasen ambos el check y dupliquen el cargo
    // o pusheen dos veces la fecha a diasAusentes. Mismo patrón que el resto de los caminos.
    const result = await runSerializable(async (tx) => {
      const turno = await tx.turnoFijo.findUnique({ where: { id: req.params.id } })
      if (!turno) throw Object.assign(new Error('Turno fijo no encontrado'), { status: 404 })
      if (turno.jugadorId !== req.user.id) throw Object.assign(new Error('Acceso denegado'), { status: 403 })
      if (turno.estado !== 'confirmado') throw Object.assign(new Error('Solo se pueden pedir ausencias en turnos confirmados'), { status: 400 })
      if (turno.ausenciasPendientes.includes(fecha) || turno.diasAusentes.includes(fecha)) {
        throw Object.assign(new Error('La ausencia para esa fecha ya fue registrada'), { status: 409 })
      }

      // Política de cancelación: verificar ventana horaria
      const club = await tx.club.findUnique({ where: { id: turno.clubId }, select: { config: true } })
      const horasMinimas = club?.config?.horasCancelacion ?? 0
      let cargoAplicado = false

      if (horasMinimas > 0) {
        // Interpretar fecha+horaInicio como Argentina UTC-3 (sin DST) para calcular horas restantes
        const [y, m, d] = fecha.split('-').map(Number)
        const [h, min] = turno.horaInicio.split(':').map(Number)
        const fechaTurnoUtc = Date.UTC(y, m - 1, d, h + 3, min)  // +3h ARG→UTC
        const horasRestantes = (fechaTurnoUtc - Date.now()) / (1000 * 60 * 60)

        if (horasRestantes >= 0 && horasRestantes < horasMinimas) {
          cargoAplicado = true
          await tx.cargo.create({
            data: {
              clubId: turno.clubId,
              jugadorId: req.user.id,
              concepto: `Ausencia fuera de plazo — turno fijo ${turno.dia} ${turno.horaInicio} (${fecha})`,
              monto: turno.precio ?? 0,
              estado: 'pendiente',
            },
          })
        }
      }

      // Auto-liberación: el día queda liberado AL INSTANTE (antes el admin tenía que confirmarlo
      // a mano). Lo marcamos en diasAusentes (+ diasAusentesJugador porque lo inició el jugador).
      const updated = await tx.turnoFijo.update({
        where: { id: req.params.id },
        data: {
          diasAusentes: { push: fecha },
          diasAusentesJugador: { push: fecha },
        },
        include: INCLUDE_CANCHA,
      })

      // Cancelar la Reserva puntual asociada a ese día (si existe), igual que cuando liberaba el admin.
      const reservaAsociada = await tx.reserva.findFirst({
        where: { canchaId: turno.canchaId, fecha, jugadorId: req.user.id, esTurnoFijo: true, estado: { not: 'cancelada' } },
      })
      if (reservaAsociada) {
        await tx.reserva.update({ where: { id: reservaAsociada.id }, data: { estado: 'cancelada' } })
      }

      return { turno, updated, cargoAplicado, horasMinimas }
    })

    const { turno, updated, cargoAplicado, horasMinimas } = result

    // Notificaciones fire-and-forget FUERA de la transacción (no deben abortar/retrasar la TX).
    if (cargoAplicado) {
      prisma.notificacion.create({
        data: {
          clubId: turno.clubId,
          jugadorId: req.user.id,
          tipo: 'cargo_cancelacion',
          data: { fecha, horaInicio: turno.horaInicio, horaFin: turno.horaFin, monto: turno.precio ?? 0, horasMinimas },
        },
      }).catch(() => {})
    }

    const dataNotif = {
      turnoFijoId: turno.id,
      fecha,
      jugador: updated.jugador ? `${updated.jugador.nombre} ${updated.jugador.apellido ?? ''}`.trim() : '',
      canchaNombre: updated.cancha?.nombre ?? '',
      dia: turno.dia,
      horaInicio: turno.horaInicio,
      horaFin: turno.horaFin,
    }
    // Al admin: CONTROL (ya está liberado, no tiene que hacer nada). Al jugador: confirmación.
    prisma.notificacion.create({
      data: { clubId: turno.clubId, jugadorId: null, tipo: 'turno_liberado_auto', data: dataNotif },
    }).catch(() => {})
    prisma.notificacion.create({
      data: { clubId: turno.clubId, jugadorId: req.user.id, tipo: 'ausencia_confirmada', data: dataNotif },
    }).catch(() => {})

    res.json({ ...mapTurno(updated), cargoAplicado, monto: turno.precio ?? 0 })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

// ── PATCH /:id/ausencia/:fecha — admin: confirmar o crear ausencia puntual ────
router.patch('/:id/ausencia/:fecha', requireAuth, requireRole('admin'), requirePermiso('reservas'), async (req, res) => {
  try {
    const { id, fecha } = req.params

    const turno = await prisma.turnoFijo.findUnique({ where: { id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })

    const eraAusenciaPendiente = turno.ausenciasPendientes.includes(fecha)

    const updated = await prisma.turnoFijo.update({
      where: { id },
      data: {
        diasAusentes: { push: fecha },
        ...(eraAusenciaPendiente && { diasAusentesJugador: { push: fecha } }),
        ausenciasPendientes: turno.ausenciasPendientes.filter((f) => f !== fecha),
      },
      include: INCLUDE_CANCHA,
    })

    // Cancelar la Reserva puntual asociada (creada cuando el admin asignó el turno fijo manualmente)
    if (turno.jugadorId) {
      const reservaAsociada = await prisma.reserva.findFirst({
        where: {
          canchaId: turno.canchaId,
          fecha,
          jugadorId: turno.jugadorId,
          esTurnoFijo: true,
          estado: { not: 'cancelada' },
        },
      })
      if (reservaAsociada) {
        await prisma.reserva.update({ where: { id: reservaAsociada.id }, data: { estado: 'cancelada' } })
      }
    }

    // Notificar al jugador según quién inició la liberación
    if (turno.jugadorId) {
      const tipo = eraAusenciaPendiente ? 'ausencia_confirmada' : 'ausencia_admin_directa'
      prisma.notificacion.create({
        data: {
          clubId: turno.clubId,
          jugadorId: turno.jugadorId,
          tipo,
          data: {
            canchaNombre: updated.cancha?.nombre ?? '',
            dia: turno.dia,
            horaInicio: turno.horaInicio,
            horaFin: turno.horaFin,
            fecha,
          },
        },
      }).catch(() => {})
    }

    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
