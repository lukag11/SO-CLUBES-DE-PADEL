import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Convierte "HH:MM" a minutos desde medianoche (soporta cross-midnight)
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Verifica si dos franjas se solapan (soporta cross-midnight)
const overlaps = (aIni, aFin, bIni, bFin) => {
  const aI = toMin(aIni), aF = toMin(aFin) || 1440
  const bI = toMin(bIni), bF = toMin(bFin) || 1440
  const aCross = aF < aI, bCross = bF < bI
  if (!aCross && !bCross) return aI < bF && aF > bI
  if (aCross && !bCross) return bI >= aI || bF > 0
  if (!aCross && bCross) return aI >= bI || aF > 0
  return true
}

// GET /api/reservas?clubId=&fecha=   — admin o jugador
router.get('/', requireAuth, async (req, res) => {
  const { clubId, fecha } = req.query
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

  try {
    const where = { clubId }
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
    // Verificar que la cancha pertenece al club
    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    // Verificar solapamiento con reservas activas (pendiente o confirmada)
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

// PATCH /api/reservas/:id/estado   — admin aprueba o cancela
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!['confirmada', 'cancelada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usar: confirmada | cancelada' })
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
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar reserva' })
  }
})

export default router
