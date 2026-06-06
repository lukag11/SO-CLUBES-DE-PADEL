import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/sponsors — lista sponsors del club
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { clubId: req.user.clubId },
      orderBy: { createdAt: 'asc' },
    })
    res.json(sponsors)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener sponsors' })
  }
})

// POST /api/sponsors — crear sponsor
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, logoUrl } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'nombre requerido' })

  try {
    const sponsor = await prisma.sponsor.create({
      data: { clubId: req.user.clubId, nombre: nombre.trim(), logoUrl: logoUrl?.trim() ?? '' },
    })
    res.status(201).json(sponsor)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear sponsor' })
  }
})

// DELETE /api/sponsors/:id — eliminar sponsor
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  try {
    const sponsor = await prisma.sponsor.findUnique({ where: { id } })
    if (!sponsor) return res.status(404).json({ error: 'Sponsor no encontrado' })
    if (sponsor.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    await prisma.sponsor.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar sponsor' })
  }
})

// PATCH /api/sponsors/:id — renombrar sponsor
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { nombre } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'nombre requerido' })

  try {
    const sponsor = await prisma.sponsor.findUnique({ where: { id } })
    if (!sponsor) return res.status(404).json({ error: 'Sponsor no encontrado' })
    if (sponsor.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.sponsor.update({
      where: { id },
      data: { nombre: nombre.trim() },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar sponsor' })
  }
})

export default router
