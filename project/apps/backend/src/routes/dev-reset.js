import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// POST /api/dev/reset?secret=xxx
// Borra todos los datos de prueba (reservas, turnos fijos, notificaciones, cargos).
// NO borra: clubs, canchas, admins, jugadores.
router.post('/reset', async (req, res) => {
  const secret = req.query.secret || req.headers['x-dev-secret']
  if (!process.env.DEV_RESET_SECRET || secret !== process.env.DEV_RESET_SECRET) {
    return res.status(403).json({ error: 'Acceso denegado' })
  }

  try {
    const [cargos, notificaciones, turnosFijos, reservas] = await Promise.all([
      prisma.cargo.deleteMany({}),
      prisma.notificacion.deleteMany({}),
      prisma.turnoFijo.deleteMany({}),
      prisma.reserva.deleteMany({}),
    ])

    res.json({
      ok: true,
      eliminados: {
        reservas: reservas.count,
        turnosFijos: turnosFijos.count,
        notificaciones: notificaciones.count,
        cargos: cargos.count,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
