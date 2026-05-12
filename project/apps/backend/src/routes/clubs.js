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

// PATCH /api/clubs/me/canchas  — admin sincroniza canchas (crea, actualiza, desactiva)
router.patch('/me/canchas', requireAuth, requireRole('admin'), async (req, res) => {
  const { canchas } = req.body
  if (!Array.isArray(canchas)) return res.status(400).json({ error: 'canchas debe ser un array' })

  const clubId = req.user.clubId

  try {
    // IDs actuales en la DB
    const dbCanchas = await prisma.cancha.findMany({ where: { clubId }, select: { id: true } })
    const dbIds = new Set(dbCanchas.map((c) => c.id))

    // IDs que llegan con CUID válido (string de 25 chars aprox)
    const isCuid = (id) => typeof id === 'string' && id.length > 10

    const upsertOps = canchas.map((c, i) => {
      if (isCuid(c.id) && dbIds.has(c.id)) {
        // Actualizar existente
        return prisma.cancha.update({
          where: { id: c.id },
          data: {
            nombre: c.nombre,
            tipo: c.tipo ?? 'Cristal',
            indoor: c.indoor ?? true,
            precioTurno: c.precioTurno ?? 0,
            horarios: c.horarios ?? null,
            activo: true,
          },
        })
      }
      // Crear nueva
      return prisma.cancha.create({
        data: {
          clubId,
          nombre: c.nombre || `Cancha ${i + 1}`,
          tipo: c.tipo ?? 'Cristal',
          indoor: c.indoor ?? true,
          precioTurno: c.precioTurno ?? 0,
          horarios: c.horarios ?? null,
          activo: true,
        },
      })
    })

    // Desactivar las que ya no están en la lista
    const incomingCuids = new Set(canchas.filter((c) => isCuid(c.id)).map((c) => c.id))
    const toDeactivate = [...dbIds].filter((id) => !incomingCuids.has(id))
    const deactivateOps = toDeactivate.map((id) =>
      prisma.cancha.update({ where: { id }, data: { activo: false } })
    )

    await prisma.$transaction([...upsertOps, ...deactivateOps])
    // Devolver canchas activas actualizadas para que el frontend actualice IDs
    const canchasActualizadas = await prisma.cancha.findMany({
      where: { clubId, activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ ok: true, canchas: canchasActualizadas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al sincronizar canchas' })
  }
})

// GET /api/clubs/info   — jugador autenticado obtiene config + canchas de su club
router.get('/info', requireAuth, requireRole('jugador'), async (req, res) => {
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
