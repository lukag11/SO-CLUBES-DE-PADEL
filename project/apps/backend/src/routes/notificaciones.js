import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

// ─── Admin ────────────────────────────────────────────────────────────────────

router.get('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const notifs = await prisma.notificacion.findMany({
      where: { clubId: req.user.clubId, jugadorId: null, profesorId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(notifs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/admin/leidas', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { clubId: req.user.clubId, jugadorId: null, profesorId: null, leida: false },
      data: { leida: true },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Jugador ──────────────────────────────────────────────────────────────────

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

// ─── Profesor ─────────────────────────────────────────────────────────────────

router.get('/profesor/me', requireAuth, requireRole('profesor'), async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { profesorId: req.user.id, clubId: req.user.clubId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(notificaciones)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones del profesor' })
  }
})

router.patch('/profesor/leidas', requireAuth, requireRole('profesor'), async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { profesorId: req.user.id, clubId: req.user.clubId, leida: false },
      data: { leida: true },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones del profesor' })
  }
})

// ─── Compartidos ──────────────────────────────────────────────────────────────

// PATCH /:id/leida — admin, jugador o profesor marcan la suya como leída
router.patch('/:id/leida', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notificacion.findUnique({ where: { id: req.params.id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const role = req.user.role
    if (role === 'jugador' && notif.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })
    if (role === 'admin' && (notif.jugadorId !== null || notif.profesorId !== null)) return res.status(403).json({ error: 'Sin permisos' })
    if (role === 'profesor' && notif.profesorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.notificacion.update({ where: { id: req.params.id }, data: { leida: true } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /:id — cualquier rol elimina la suya
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const notif = await prisma.notificacion.findUnique({ where: { id: req.params.id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const role = req.user.role
    if (role === 'jugador' && notif.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })
    if (role === 'admin' && (notif.jugadorId !== null || notif.profesorId !== null)) return res.status(403).json({ error: 'Sin permisos' })
    if (role === 'profesor' && notif.profesorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

    await prisma.notificacion.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
