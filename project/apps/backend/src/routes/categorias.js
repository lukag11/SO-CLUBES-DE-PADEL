import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { categoriaParecida } from '../lib/categoriaSimilar.js'

const router = Router()
const DEFAULTS = ['Bebidas', 'Comidas', 'Golosinas', 'Insumos', 'Otros']

// GET /api/categorias — lista del club (siembra las defaults la primera vez)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    let cats = await prisma.categoria.findMany({ where: { clubId }, orderBy: { nombre: 'asc' } })
    if (cats.length === 0) {
      await prisma.categoria.createMany({ data: DEFAULTS.map((nombre) => ({ clubId, nombre })) })
      cats = await prisma.categoria.findMany({ where: { clubId }, orderBy: { nombre: 'asc' } })
    }
    res.json(cats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

// POST /api/categorias — crear. Body: { nombre }
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const nombre = String(req.body.nombre ?? '').trim()
  if (!nombre) return res.status(400).json({ error: 'Poné un nombre' })
  try {
    const existentes = await prisma.categoria.findMany({ where: { clubId }, select: { nombre: true } })
    const choca = categoriaParecida(nombre, existentes)
    if (choca) return res.status(409).json({ error: `Ya existe "${choca}" (muy parecida). Usá esa para no duplicar.` })
    const cat = await prisma.categoria.create({ data: { clubId, nombre } })
    res.status(201).json(cat)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear la categoría' })
  }
})

// PATCH /api/categorias/:id — renombrar (propaga a los productos que la usaban)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const nuevo = String(req.body.nombre ?? '').trim()
  if (!nuevo) return res.status(400).json({ error: 'Poné un nombre' })
  try {
    const cat = await prisma.categoria.findUnique({ where: { id: req.params.id } })
    if (!cat || cat.clubId !== clubId) return res.status(404).json({ error: 'Categoría no encontrada' })
    if (cat.nombre === nuevo) return res.json(cat)
    const otras = await prisma.categoria.findMany({ where: { clubId, id: { not: cat.id } }, select: { nombre: true } })
    const choca = categoriaParecida(nuevo, otras)
    if (choca) return res.status(409).json({ error: `Ya existe "${choca}" (muy parecida). Usá esa para no duplicar.` })
    const [updated] = await prisma.$transaction([
      prisma.categoria.update({ where: { id: req.params.id }, data: { nombre: nuevo } }),
      prisma.producto.updateMany({ where: { clubId, categoria: cat.nombre }, data: { categoria: nuevo } }),
    ])
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al renombrar la categoría' })
  }
})

// DELETE /api/categorias/:id — borrar (bloqueado si tiene productos)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const cat = await prisma.categoria.findUnique({ where: { id: req.params.id } })
    if (!cat || cat.clubId !== clubId) return res.status(404).json({ error: 'Categoría no encontrada' })
    const enUso = await prisma.producto.count({ where: { clubId, categoria: cat.nombre } })
    if (enUso > 0) return res.status(409).json({ error: `No se puede borrar: tiene ${enUso} producto${enUso !== 1 ? 's' : ''}. Movélos a otra categoría primero.` })
    await prisma.categoria.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al borrar la categoría' })
  }
})

export default router
