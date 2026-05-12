import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/cargos/me — jugador ve sus cargos pendientes
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const cargos = await prisma.cargo.findMany({
      where: { jugadorId: req.user.id, clubId: req.user.clubId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(cargos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cargos' })
  }
})

// GET /api/cargos — admin ve todos los cargos del club
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const cargos = await prisma.cargo.findMany({
      where: { clubId: req.user.clubId },
      include: { jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(cargos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cargos' })
  }
})

// PATCH /api/cargos/:id/estado — admin marca cargo como pagado o lo condona
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!['pagado', 'condonado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usar: pagado | condonado' })
  }

  try {
    const cargo = await prisma.cargo.findUnique({ where: { id } })
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' })
    if (cargo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.cargo.update({ where: { id }, data: { estado } })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar cargo' })
  }
})

export default router
