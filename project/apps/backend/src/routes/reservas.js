import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const overlaps = (aIni, aFin, bIni, bFin) => {
  const aI = toMin(aIni), aF = toMin(aFin) || 1440
  const bI = toMin(bIni), bF = toMin(bFin) || 1440
  const aCross = aF < aI, bCross = bF < bI
  if (!aCross && !bCross) return aI < bF && aF > bI
  if (aCross && !bCross) return bI >= aI || bF > 0
  if (!aCross && bCross) return aI >= bI || aF > 0
  return true
}

// GET /api/reservas/me   — jugador ve sus propias reservas
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      where: {
        jugadorId: req.user.id,
        clubId: req.user.clubId,
        esTurnoFijo: false, // los turnos fijos se gestionan via /turnos-fijos
        estado: { not: 'cancelada' },
      },
      include: { cancha: true },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas' })
  }
})

// GET /api/reservas/pendientes   — admin ve todas las reservas pendientes de aprobación
router.get('/pendientes', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      where: {
        clubId: req.user.clubId,
        estado: 'pendiente',
        esTurnoFijo: false,
      },
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas pendientes' })
  }
})

// GET /api/reservas?fecha=   — admin usa su clubId del JWT; jugador pasa clubId como query
router.get('/', requireAuth, async (req, res) => {
  const { fecha } = req.query
  // Admin: clubId viene del JWT (seguro). Jugador/otro: acepta query param.
  const clubId = req.user.role === 'admin' ? req.user.clubId : req.query.clubId
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

  try {
    const where = { clubId, estado: { not: 'cancelada' } }
    if (fecha) where.fecha = fecha

    const reservas = await prisma.reserva.findMany({
      where,
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas' })
  }
})

// POST /api/reservas   — jugador crea reserva
router.post('/', requireAuth, requireRole('jugador'), async (req, res) => {
  const { clubId, canchaId, fecha, horaInicio, horaFin, precio, esTurnoFijo, notas } = req.body
  const jugadorId = req.user.id

  if (!clubId || !canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    const existentes = await prisma.reserva.findMany({
      where: { canchaId, fecha, estado: { in: ['pendiente', 'confirmada'] } },
    })
    const hayConflicto = existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflicto) return res.status(409).json({ error: 'El horario ya está reservado' })

    const reserva = await prisma.reserva.create({
      data: {
        clubId,
        canchaId,
        jugadorId,
        fecha,
        horaInicio,
        horaFin,
        precio: precio ? parseFloat(precio) : null,
        esTurnoFijo: !!esTurnoFijo,
        tipo: esTurnoFijo ? 'solicitud_fijo' : 'online',
        estado: 'pendiente',
        notas: notas || '',
        jugadores: [],
      },
      include: { cancha: true },
    })

    res.status(201).json(reserva)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear reserva' })
  }
})

// POST /api/reservas/admin   — admin crea reserva manual (bloqueado, clase, etc.)
router.post('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const { canchaId, fecha, horaInicio, horaFin, tipo, jugadores, precio, notas, esTurnoFijo } = req.body
  const clubId = req.user.clubId

  if (!canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    const reserva = await prisma.reserva.create({
      data: {
        clubId,
        canchaId,
        fecha,
        horaInicio,
        horaFin,
        tipo: tipo || 'manual',
        estado: 'confirmada',
        precio: precio ? parseFloat(precio) : null,
        esTurnoFijo: !!esTurnoFijo,
        jugadores: jugadores ?? [],
        notas: notas || '',
      },
      include: { cancha: true },
    })

    res.status(201).json(reserva)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear reserva' })
  }
})

// PATCH /api/reservas/:id/estado   — admin aprueba o cancela
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.reserva.update({
      where: { id },
      data: { estado },
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
    })

    // Notificar al jugador si la reserva tiene jugadorId
    if (updated.jugadorId && (estado === 'confirmada' || estado === 'cancelada')) {
      const tipo = estado === 'confirmada' ? 'reserva_confirmada' : 'reserva_cancelada_admin'
      prisma.notificacion.create({
        data: {
          clubId: updated.clubId,
          jugadorId: updated.jugadorId,
          tipo,
          data: {
            canchaNombre: updated.cancha.nombre,
            fecha: updated.fecha,
            horaInicio: updated.horaInicio,
            horaFin: updated.horaFin,
          },
        },
      }).catch(() => {}) // fire-and-forget, no bloquea la respuesta
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar reserva' })
  }
})

// PATCH /api/reservas/:id   — admin actualiza campos (notas, precio, jugadores)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { notas, precio, jugadores, tipo } = req.body

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.reserva.update({
      where: { id },
      data: {
        ...(notas     !== undefined && { notas }),
        ...(precio    !== undefined && { precio: precio ? parseFloat(precio) : null }),
        ...(jugadores !== undefined && { jugadores }),
        ...(tipo      !== undefined && { tipo }),
      },
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar reserva' })
  }
})

// DELETE /api/reservas/:id   — jugador o admin cancela reserva
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      return res.status(400).json({ error: 'La reserva ya está cancelada' })
    }

    // Jugador solo puede cancelar sus propias reservas
    if (req.user.role === 'jugador') {
      if (reserva.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

      // Política de cancelación: verificar ventana horaria
      const club = await prisma.club.findUnique({ where: { id: reserva.clubId }, select: { config: true } })
      const horasMinimas = club?.config?.horasCancelacion ?? 0

      if (horasMinimas > 0) {
        // Construir datetime del turno en zona local del servidor
        const [y, m, d] = reserva.fecha.split('-').map(Number)
        const [h, min] = reserva.horaInicio.split(':').map(Number)
        const fechaTurno = new Date(y, m - 1, d, h, min)
        const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)

        if (horasRestantes < 0) {
          return res.status(400).json({ error: 'El turno ya pasó' })
        }

        if (horasRestantes < horasMinimas) {
          // Fuera del plazo: cancelar pero registrar cargo
          await prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } })

          const cargo = await prisma.cargo.create({
            data: {
              clubId: reserva.clubId,
              jugadorId: req.user.id,
              reservaId: id,
              concepto: `Cancelación fuera de plazo — ${reserva.fecha} ${reserva.horaInicio}`,
              monto: reserva.precio ?? 0,
              estado: 'pendiente',
            },
          })

          // Notificar al jugador del cargo
          prisma.notificacion.create({
            data: {
              clubId: reserva.clubId,
              jugadorId: req.user.id,
              tipo: 'cargo_cancelacion',
              data: {
                fecha: reserva.fecha,
                horaInicio: reserva.horaInicio,
                horaFin: reserva.horaFin,
                monto: reserva.precio ?? 0,
                horasMinimas,
              },
            },
          }).catch(() => {})

          return res.json({ ok: true, cargoAplicado: true, cargo })
        }
      }
    }

    await prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } })
    res.json({ ok: true, cargoAplicado: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cancelar reserva' })
  }
})

export default router
