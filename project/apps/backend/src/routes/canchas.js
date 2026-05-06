import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// GET /api/canchas?clubId=
router.get('/', async (req, res) => {
  const { clubId } = req.query
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

  try {
    const canchas = await prisma.cancha.findMany({
      where: { clubId, activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json(canchas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener canchas' })
  }
})

export default router
