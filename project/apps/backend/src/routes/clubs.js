import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/clubs/me   — admin obtiene la config de su club
router.get('/me', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.user.clubId },
      include: { canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
    })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

// PATCH /api/clubs/me   — admin guarda config del club
router.patch('/me', requireAuth, requireRole('admin'), async (req, res) => {
  const { config } = req.body
  if (!config) return res.status(400).json({ error: 'config requerido' })

  try {
    const updated = await prisma.club.update({
      where: { id: req.user.clubId },
      data: { config },
    })
    res.json({ id: updated.id, config: updated.config })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar config' })
  }
})

// GET /api/clubs/:slug   — público, info básica del club para la landing
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, nombre: true, slug: true, logoUrl: true, config: true, activo: true },
    })
    if (!club || !club.activo) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

export default router
