import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireOwner } from '../middleware/auth.js'
import { PERMISOS, PERMISO_IDS } from '../lib/permisos.js'
import { limiteDelPlan } from '../lib/planes.js'

const router = Router()

// Todas las rutas: solo el DUEÑO del club. El empleado (staff) no gestiona equipo.
const guard = [requireAuth, requireRole('admin'), requireOwner]

const SAFE = { id: true, nombre: true, email: true, permisos: true, createdAt: true }

const limpiarPermisos = (arr) => [...new Set((Array.isArray(arr) ? arr : []).filter((p) => PERMISO_IDS.includes(p)))]

// Busca un empleado del club del dueño (staff del mismo clubId). null si no aplica.
const findEmpleado = async (id, clubId) => {
  const emp = await prisma.admin.findUnique({ where: { id } })
  if (!emp || emp.clubId !== clubId || emp.rol !== 'staff') return null
  return emp
}

// GET /api/empleados/permisos — catálogo de módulos asignables (para la UI)
router.get('/permisos', ...guard, (req, res) => res.json(PERMISOS))

// GET /api/empleados — lista de empleados del club
router.get('/', ...guard, async (req, res) => {
  try {
    const empleados = await prisma.admin.findMany({
      where: { clubId: req.user.clubId, rol: 'staff' },
      select: SAFE,
      orderBy: { createdAt: 'asc' },
    })
    res.json(empleados)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar el equipo' })
  }
})

// POST /api/empleados — crear empleado
router.post('/', ...guard, async (req, res) => {
  const { nombre, password, permisos } = req.body
  const email = String(req.body.email || '').trim().toLowerCase()
  if (!nombre?.trim() || !email || !password) {
    return res.status(400).json({ error: 'Completá nombre, email y contraseña' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'El email no parece válido' })
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  try {
    // Límite de usuarios admin por plan (Fase 2): total = dueño + empleados. Trial = premium (sin límite).
    const clubPlan = await prisma.club.findUnique({ where: { id: req.user.clubId }, select: { plan: true, estado: true } })
    const maxAdmins = limiteDelPlan(clubPlan).admins
    const actuales = await prisma.admin.count({ where: { clubId: req.user.clubId } })
    if (actuales >= maxAdmins) {
      return res.status(403).json({
        error: 'limite_plan', recurso: 'admins', limite: maxAdmins,
        message: `Tu plan permite hasta ${maxAdmins} usuario${maxAdmins === 1 ? '' : 's'} administrador${maxAdmins === 1 ? '' : 'es'}. Subí de plan para sumar más.`,
      })
    }
    const existe = await prisma.admin.findUnique({ where: { email }, select: { id: true } })
    if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    const emp = await prisma.admin.create({
      data: {
        clubId: req.user.clubId,
        nombre: nombre.trim(),
        email,
        password: await bcrypt.hash(password, 10),
        rol: 'staff',
        permisos: limpiarPermisos(permisos),
      },
      select: SAFE,
    })
    res.status(201).json(emp)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear el empleado' })
  }
})

// PATCH /api/empleados/:id — editar nombre / permisos
router.patch('/:id', ...guard, async (req, res) => {
  try {
    const emp = await findEmpleado(req.params.id, req.user.clubId)
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' })
    const { nombre, permisos } = req.body
    const updated = await prisma.admin.update({
      where: { id: emp.id },
      data: {
        ...(nombre !== undefined && { nombre: String(nombre).trim() }),
        ...(permisos !== undefined && { permisos: limpiarPermisos(permisos) }),
      },
      select: SAFE,
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el empleado' })
  }
})

// POST /api/empleados/:id/reset-password — resetear la contraseña del empleado
router.post('/:id/reset-password', ...guard, async (req, res) => {
  const { password } = req.body
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  try {
    const emp = await findEmpleado(req.params.id, req.user.clubId)
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' })
    await prisma.admin.update({ where: { id: emp.id }, data: { password: await bcrypt.hash(password, 10) } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al resetear la contraseña' })
  }
})

// DELETE /api/empleados/:id — eliminar empleado
router.delete('/:id', ...guard, async (req, res) => {
  try {
    const emp = await findEmpleado(req.params.id, req.user.clubId)
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' })
    await prisma.admin.delete({ where: { id: emp.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el empleado' })
  }
})

export default router
