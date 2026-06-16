import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { crearClub, PLANES_VALIDOS } from '../lib/tenants.js'
import { FEATURES, FEATURE_IDS, CORE_FEATURES } from '../lib/planes.js'
import { getMatriz, setMatriz } from '../lib/planesConfig.js'

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
        trialHasta: true, createdAt: true, featuresExtra: true,
        // Contar solo lo ACTIVO, para que coincida con lo que ve el operador del club
        // (las canchas/jugadores dados de baja quedan en la DB como activo:false).
        _count: { select: { jugadores: { where: { activo: true } }, canchas: { where: { activo: true } }, admins: true } },
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
  const { plan, estado, featuresExtra } = req.body

  if (plan !== undefined && !PLANES_VALIDOS.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' })
  }
  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }
  if (featuresExtra !== undefined && !Array.isArray(featuresExtra)) {
    return res.status(400).json({ error: 'featuresExtra inválido' })
  }

  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })

    // Regalitos: solo ids de features válidas (las core no hace falta listarlas)
    const extra = featuresExtra !== undefined
      ? [...new Set(featuresExtra.filter((f) => FEATURE_IDS.includes(f)))]
      : undefined

    const updated = await prisma.club.update({
      where: { id },
      data: {
        ...(plan !== undefined && { plan }),
        // 'suspendido' también baja el kill-switch 'activo' (y lo sube al reactivar)
        ...(estado !== undefined && { estado, activo: estado !== 'suspendido' }),
        ...(extra !== undefined && { featuresExtra: extra }),
      },
      select: { id: true, nombre: true, slug: true, plan: true, estado: true, activo: true, trialHasta: true, featuresExtra: true },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el club' })
  }
})

// ---- GET /api/platform/planes — catálogo de features + matriz vigente (para el editor) ----
router.get('/planes', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    res.json({
      features: FEATURES,          // [{ id, label, core }]
      planes: PLANES_VALIDOS,      // ['basico','pro','premium']
      matriz: await getMatriz(),   // { basico:[...], pro:[...], premium:[...] }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los planes' })
  }
})

// ---- PATCH /api/platform/planes — guardar la matriz editada ----
router.patch('/planes', requireAuth, requireRole('platform'), async (req, res) => {
  const { matriz } = req.body
  if (!matriz || typeof matriz !== 'object') {
    return res.status(400).json({ error: 'Matriz inválida' })
  }
  try {
    // Sanitizar: cada plan = solo ids válidos + las core siempre incluidas.
    const limpia = {}
    for (const plan of PLANES_VALIDOS) {
      const arr = Array.isArray(matriz[plan]) ? matriz[plan] : []
      const validas = arr.filter((id) => FEATURE_IDS.includes(id))
      limpia[plan] = [...new Set([...CORE_FEATURES, ...validas])]
    }
    const guardada = await setMatriz(limpia)
    res.json({ ok: true, matriz: guardada })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar los planes' })
  }
})

// ---- POST /api/platform/clubs/:id/reset-admin — resetear la contraseña del admin del club ----
// Tarea de soporte: el dueño de un club olvidó su clave. Resetea al admin más antiguo
// (el creado en el alta) y devuelve su email para pasárselo.
router.post('/clubs/:id/reset-admin', requireAuth, requireRole('platform'), async (req, res) => {
  const { id } = req.params
  const { password } = req.body
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })
  }
  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    const admin = await prisma.admin.findFirst({ where: { clubId: id }, orderBy: { createdAt: 'asc' } })
    if (!admin) return res.status(404).json({ error: 'El club no tiene administrador' })
    const hash = await bcrypt.hash(password, 10)
    await prisma.admin.update({ where: { id: admin.id }, data: { password: hash } })
    res.json({ ok: true, email: admin.email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al resetear la contraseña' })
  }
})

export default router
