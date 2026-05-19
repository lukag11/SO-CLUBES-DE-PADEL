import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/profesores — admin lista sus profesores
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const profesores = await prisma.profesor.findMany({
      where: { clubId: req.user.clubId },
      orderBy: { apellido: 'asc' },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        especialidad: true, canchasIds: true, disponibilidad: true, activo: true, createdAt: true,
      },
    })
    res.json(profesores)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener profesores' })
  }
})

// POST /api/profesores — admin crea un profesor
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, apellido, email, password, especialidad, canchasIds, disponibilidad } = req.body
  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: 'Nombre, apellido, email y contraseña son requeridos' })
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const profesor = await prisma.profesor.create({
      data: {
        clubId: req.user.clubId,
        nombre, apellido, email,
        password: passwordHash,
        especialidad: especialidad ?? null,
        canchasIds: canchasIds ?? [],
        disponibilidad: disponibilidad ?? null,
      },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        especialidad: true, canchasIds: true, disponibilidad: true, activo: true, createdAt: true,
      },
    })
    res.status(201).json(profesor)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un profesor con ese email en este club' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al crear profesor' })
  }
})

// PATCH /api/profesores/:id — admin edita un profesor
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { nombre, apellido, email, password, especialidad, canchasIds, disponibilidad, activo } = req.body
  try {
    const existe = await prisma.profesor.findFirst({ where: { id, clubId: req.user.clubId } })
    if (!existe) return res.status(404).json({ error: 'Profesor no encontrado' })

    const data = {}
    if (nombre      !== undefined) data.nombre      = nombre
    if (apellido    !== undefined) data.apellido    = apellido
    if (email       !== undefined) data.email       = email
    if (especialidad !== undefined) data.especialidad = especialidad
    if (canchasIds     !== undefined) data.canchasIds     = canchasIds
    if (disponibilidad !== undefined) data.disponibilidad = disponibilidad
    if (activo         !== undefined) data.activo         = activo
    if (password) data.password = await bcrypt.hash(password, 10)

    const profesor = await prisma.profesor.update({
      where: { id },
      data,
      select: {
        id: true, nombre: true, apellido: true, email: true,
        especialidad: true, canchasIds: true, disponibilidad: true, activo: true, createdAt: true,
      },
    })
    res.json(profesor)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un profesor con ese email en este club' })
    }
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar profesor' })
  }
})

// DELETE /api/profesores/:id — admin elimina un profesor
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  try {
    const existe = await prisma.profesor.findFirst({ where: { id, clubId: req.user.clubId } })
    if (!existe) return res.status(404).json({ error: 'Profesor no encontrado' })
    await prisma.profesor.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar profesor' })
  }
})

export default router
