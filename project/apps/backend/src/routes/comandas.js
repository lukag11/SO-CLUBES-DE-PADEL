import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { snapshotProductos } from '../lib/productos.js'
import { descontarStock, reponerStock } from '../lib/stock.js'

const router = Router()

const SEL_CARGO = { select: { id: true, concepto: true, monto: true, estado: true, metodoPago: true, createdAt: true } }
const conTotal = (c) => ({ ...c, total: (c.cargos ?? []).reduce((s, x) => s + x.monto, 0) })

// GET /api/comandas?estado=abierta|cerrada — mesas/comandas del club con sus ítems
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const estado = ['abierta', 'cerrada'].includes(req.query.estado) ? req.query.estado : 'abierta'
  try {
    const comandas = await prisma.comanda.findMany({
      where: { clubId, estado },
      include: { cargos: { ...SEL_CARGO, orderBy: { createdAt: 'asc' } } },
      orderBy: estado === 'abierta' ? { createdAt: 'asc' } : { closedAt: 'desc' },
    })
    res.json(comandas.map(conTotal))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener comandas' })
  }
})

// POST /api/comandas — abrir una mesa/comanda. Body: { etiqueta }
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const etiqueta = String(req.body.etiqueta ?? '').trim()
  if (!etiqueta) return res.status(400).json({ error: 'Poné un nombre para la mesa (ej: Mesa 3)' })
  try {
    const comanda = await prisma.comanda.create({ data: { clubId, etiqueta }, include: { cargos: true } })
    res.status(201).json(conTotal(comanda))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al abrir la comanda' })
  }
})

// POST /api/comandas/:id/items — agregar consumos a la comanda (cargos pendientes)
// Body: { items: [{ concepto, monto }] }
router.post('/:id/items', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  const items = (req.body.items || []).map((it) => ({ concepto: String(it.concepto || '').trim(), monto: Math.round(Number(it.monto)), productoId: it.productoId || null }))
  if (items.length === 0 || items.some((l) => !l.concepto || !(l.monto > 0))) {
    return res.status(400).json({ error: 'Hay un ítem con datos inválidos' })
  }
  try {
    const comanda = await prisma.comanda.findUnique({ where: { id } })
    if (!comanda || comanda.clubId !== clubId) return res.status(404).json({ error: 'Comanda no encontrada' })
    if (comanda.estado !== 'abierta') return res.status(400).json({ error: 'La comanda ya está cerrada' })
    const snap = await snapshotProductos(clubId, items.map((l) => l.productoId))
    await prisma.$transaction(async (tx) => {
      await tx.cargo.createMany({
        data: items.map((l) => ({
          clubId, comandaId: id, concepto: l.concepto, monto: l.monto, tipo: 'producto', estado: 'pendiente', cantidad: 1,
          productoId: l.productoId, categoria: snap[l.productoId]?.categoria ?? null, costo: snap[l.productoId]?.costo ?? null,
        })),
      })
      // Descontar stock de los productos del catálogo (qty 1 por ítem)
      await descontarStock(tx, clubId, items.map((l) => ({ productoId: l.productoId, cantidad: 1 })), { tipo: 'comanda', id, motivo: `Mesa ${comanda.etiqueta}` })
    })
    const actual = await prisma.comanda.findUnique({ where: { id }, include: { cargos: { ...SEL_CARGO, orderBy: { createdAt: 'asc' } } } })
    res.status(201).json(conTotal(actual))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar ítems' })
  }
})

// DELETE /api/comandas/:id/items/:cargoId — quitar un ítem de la comanda (mientras está abierta)
router.delete('/:id/items/:cargoId', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id, cargoId } = req.params
  try {
    const cargo = await prisma.cargo.findUnique({ where: { id: cargoId } })
    if (!cargo || cargo.clubId !== clubId || cargo.comandaId !== id) return res.status(404).json({ error: 'Ítem no encontrado' })
    if (cargo.estado === 'pagado') return res.status(400).json({ error: 'No se puede quitar un ítem ya cobrado' })
    await prisma.$transaction(async (tx) => {
      await tx.cargo.delete({ where: { id: cargoId } })
      await reponerStock(tx, clubId, [{ productoId: cargo.productoId, cantidad: cargo.cantidad ?? 1 }], { tipo: 'comanda', id, motivo: 'Quitado de mesa' })
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al quitar el ítem' })
  }
})

// POST /api/comandas/:id/cerrar — cobrar todo y cerrar la comanda. Body: { metodoPago }
router.post('/:id/cerrar', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  const metodo = normalizarMetodo(req.body.metodoPago)
  try {
    const comanda = await prisma.comanda.findUnique({ where: { id }, include: { cargos: true } })
    if (!comanda || comanda.clubId !== clubId) return res.status(404).json({ error: 'Comanda no encontrada' })
    if (comanda.estado !== 'abierta') return res.status(400).json({ error: 'La comanda ya está cerrada' })
    if (comanda.cargos.length === 0) return res.status(400).json({ error: 'La comanda no tiene consumos' })
    const now = new Date()
    await prisma.$transaction([
      prisma.cargo.updateMany({ where: { comandaId: id, estado: 'pendiente' }, data: { estado: 'pagado', metodoPago: metodo, pagadoAt: now } }),
      prisma.comanda.update({ where: { id }, data: { estado: 'cerrada', closedAt: now } }),
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cerrar la comanda' })
  }
})

// DELETE /api/comandas/:id — descartar una comanda abierta vacía (o sus ítems no cobrados)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  try {
    const comanda = await prisma.comanda.findUnique({ where: { id }, include: { cargos: true } })
    if (!comanda || comanda.clubId !== clubId) return res.status(404).json({ error: 'Comanda no encontrada' })
    if (comanda.cargos.some((c) => c.estado === 'pagado')) return res.status(400).json({ error: 'No se puede eliminar: tiene ítems ya cobrados' })
    await prisma.$transaction(async (tx) => {
      await reponerStock(tx, clubId, comanda.cargos.map((c) => ({ productoId: c.productoId, cantidad: c.cantidad ?? 1 })), { tipo: 'comanda', id, motivo: 'Mesa descartada' })
      await tx.cargo.deleteMany({ where: { comandaId: id } })
      await tx.comanda.delete({ where: { id } })
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la comanda' })
  }
})

export default router
