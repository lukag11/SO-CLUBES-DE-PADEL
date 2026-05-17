import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

// GET /api/notificaciones/admin — admin ve sus notificaciones (jugadorId IS NULL)
router.get('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const notifs = await prisma.notificacion.findMany({
      where: { clubId: req.user.clubId, jugadorId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(notifs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/notificaciones/admin/leidas — marcar todas las del admin como leídas
router.patch('/admin/leidas', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { clubId: req.user.clubId, jugadorId: null, leida: false },
      data: { leida: true },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/notificaciones/me — jugador lee sus notificaciones
router.get('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { jugadorId: req.user.id, clubId: req.user.clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(notificaciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// PATCH /api/notificaciones/leidas — jugador marca todas como leídas
router.patch('/leidas', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { jugadorId: req.user.id, clubId: req.user.clubId, leida: false },
      data: { leida: true },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
})

// PATCH /api/notificaciones/:id/leida — marcar una como leída (admin o jugador)
router.patch('/:id/leida', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notificacion.findUnique({ where: { id: req.params.id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    // jugador solo puede marcar las propias; admin puede marcar las de jugadorId null
    if (req.user.role === 'jugador' && notif.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })
    if (req.user.role === 'admin' && notif.jugadorId !== null) return res.status(403).json({ error: 'Sin permisos' })
    const updated = await prisma.notificacion.update({ where: { id: req.params.id }, data: { leida: true } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/notificaciones/:id — eliminar notificación (admin o jugador)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notificacion.findUnique({ where: { id: req.params.id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (req.user.role === 'jugador' && notif.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })
    if (req.user.role === 'admin' && notif.jugadorId !== null) return res.status(403).json({ error: 'Sin permisos' })
    await prisma.notificacion.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
