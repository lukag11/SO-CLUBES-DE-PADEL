import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/notificaciones/me — jugador lee sus notificaciones
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { jugadorId: req.user.id, clubId: req.user.clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(notificaciones)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// PATCH /api/notificaciones/:id/leida — marca una como leída
router.patch('/:id/leida', requireAuth, requireRole('jugador'), async (req, res) => {
  const { id } = req.params
  try {
    const notif = await prisma.notificacion.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.notificacion.update({ where: { id }, data: { leida: true } })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar notificación' })
  }
})

// PATCH /api/notificaciones/leidas — marca todas como leídas
router.patch('/leidas', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { jugadorId: req.user.id, clubId: req.user.clubId, leida: false },
      data: { leida: true },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
})

export default router
