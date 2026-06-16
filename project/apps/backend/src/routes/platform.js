import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { crearClub, PLANES_VALIDOS } from '../lib/tenants.js'

const router = Router()

const ESTADOS_VALIDOS = ['prueba', 'activo', 'suspendido']

// ---- POST /api/platform/login — login del dueño de plataforma ----
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })

  try {
    const pa = await prisma.platformAdmin.findUnique({ where: { email } })
    if (!pa) return res.status(401).json({ error: 'Email no registrado' })
    if (!(await bcrypt.compare(password, pa.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    const token = signToken({ id: pa.id, role: 'platform' })
    res.json({ token, user: { id: pa.id, nombre: pa.nombre, email: pa.email, role: 'platform' } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ---- GET /api/platform/me ----
router.get('/me', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const pa = await prisma.platformAdmin.findUnique({ where: { id: req.user.id }, select: { id: true, nombre: true, email: true } })
    if (!pa) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ...pa, role: 'platform' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

// ---- GET /api/platform/clubs — listado de tenants con conteos ----
router.get('/clubs', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nombre: true, slug: true, plan: true, estado: true, activo: true,
        trialHasta: true, createdAt: true,
        _count: { select: { jugadores: true, canchas: true, admins: true } },
      },
    })
    res.json(clubs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar clubes' })
  }
})

// ---- POST /api/platform/clubs — alta de club (motor único) ----
router.post('/clubs', requireAuth, requireRole('platform'), async (req, res) => {
  const { clubNombre, slug, plan, adminNombre, adminEmail, adminPassword, trialDias } = req.body
  try {
    const club = await crearClub({ clubNombre, slug, plan, adminNombre, adminEmail, adminPassword, trialDias })
    res.status(201).json(club)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al crear el club' })
  }
})

// ---- PATCH /api/platform/clubs/:id — cambiar plan y/o estado ----
router.patch('/clubs/:id', requireAuth, requireRole('platform'), async (req, res) => {
  const { id } = req.params
  const { plan, estado } = req.body

  if (plan !== undefined && !PLANES_VALIDOS.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' })
  }
  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })

    const updated = await prisma.club.update({
      where: { id },
      data: {
        ...(plan !== undefined && { plan }),
        // 'suspendido' también baja el kill-switch 'activo' (y lo sube al reactivar)
        ...(estado !== undefined && { estado, activo: estado !== 'suspendido' }),
      },
      select: { id: true, nombre: true, slug: true, plan: true, estado: true, activo: true, trialHasta: true },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el club' })
  }
})

export default router
