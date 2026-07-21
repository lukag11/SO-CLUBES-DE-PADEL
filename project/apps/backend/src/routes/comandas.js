import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { snapshotProductos } from '../lib/productos.js'
import { descontarStock, reponerStock } from '../lib/stock.js'
import { mpConfigurado } from '../lib/mercadopago.js'
import { crearLinkPagoComanda, cancelarLinksDeItems } from '../lib/cobrosMP.js'
import { crearOrdenQRComanda } from '../lib/cobrosQR.js'

const router = Router()

const SEL_CARGO = { select: { id: true, concepto: true, monto: true, cantidad: true, productoId: true, estado: true, metodoPago: true, createdAt: true } }
const nombreBase = (concepto) => String(concepto || '').replace(/^\d+×\s*/, '')
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
  // items: { nombre, precioUnit, cantidad, productoId? }
  const items = (req.body.items || []).map((it) => ({
    nombre: String(it.nombre || '').trim(),
    precioUnit: Math.round(Number(it.precioUnit)),
    cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
    productoId: it.productoId || null,
  }))
  if (items.length === 0 || items.some((l) => !l.nombre || !(l.precioUnit > 0))) {
    return res.status(400).json({ error: 'Hay un ítem con datos inválidos' })
  }
  try {
    const comanda = await prisma.comanda.findUnique({ where: { id } })
    if (!comanda || comanda.clubId !== clubId) return res.status(404).json({ error: 'Comanda no encontrada' })
    if (comanda.estado !== 'abierta') return res.status(400).json({ error: 'La comanda ya está cerrada' })
    const snap = await snapshotProductos(clubId, items.map((l) => l.productoId))
    await prisma.$transaction(async (tx) => {
      for (const l of items) {
        const costoUnit = snap[l.productoId]?.costo ?? null
        // Merge: si el producto ya está en la mesa (pendiente), sumo a esa línea
        const existente = l.productoId
          ? await tx.cargo.findFirst({ where: { comandaId: id, productoId: l.productoId, estado: 'pendiente' } })
          : null
        if (existente) {
          const cant = existente.cantidad + l.cantidad
          const unit = Math.round(existente.monto / existente.cantidad)
          await tx.cargo.update({ where: { id: existente.id }, data: {
            cantidad: cant, monto: unit * cant, concepto: `${cant}× ${nombreBase(existente.concepto)}`,
            ...(costoUnit != null ? { costo: costoUnit * cant } : {}),
          } })
        } else {
          await tx.cargo.create({ data: {
            clubId, comandaId: id, tipo: 'producto', estado: 'pendiente',
            concepto: l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre,
            monto: l.precioUnit * l.cantidad, cantidad: l.cantidad,
            productoId: l.productoId, categoria: snap[l.productoId]?.categoria ?? null, costo: costoUnit != null ? costoUnit * l.cantidad : null,
          } })
        }
      }
      await descontarStock(tx, clubId, items.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })), { tipo: 'comanda', id, motivo: `Mesa ${comanda.etiqueta}` })
    })
    const actual = await prisma.comanda.findUnique({ where: { id }, include: { cargos: { ...SEL_CARGO, orderBy: { createdAt: 'asc' } } } })
    res.status(201).json(conTotal(actual))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar ítems' })
  }
})

// PATCH /api/comandas/:id/items/:cargoId — cambiar la cantidad de una línea (ajusta stock por la diferencia)
router.patch('/:id/items/:cargoId', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id, cargoId } = req.params
  const nuevaCant = Math.max(1, Math.round(Number(req.body.cantidad) || 1))
  try {
    const cargo = await prisma.cargo.findUnique({ where: { id: cargoId } })
    if (!cargo || cargo.clubId !== clubId || cargo.comandaId !== id) return res.status(404).json({ error: 'Ítem no encontrado' })
    if (cargo.estado === 'pagado') return res.status(400).json({ error: 'No se puede modificar un ítem ya cobrado' })
    const cantVieja = cargo.cantidad || 1
    if (nuevaCant === cantVieja) return res.json({ ok: true })
    const unit = Math.round(cargo.monto / cantVieja)
    const unitCosto = cargo.costo != null ? Math.round(cargo.costo / cantVieja) : null
    const delta = nuevaCant - cantVieja
    await prisma.$transaction(async (tx) => {
      await tx.cargo.update({ where: { id: cargoId }, data: {
        cantidad: nuevaCant, monto: unit * nuevaCant, concepto: `${nuevaCant > 1 ? `${nuevaCant}× ` : ''}${nombreBase(cargo.concepto)}`,
        ...(unitCosto != null ? { costo: unitCosto * nuevaCant } : {}),
      } })
      if (delta > 0) await descontarStock(tx, clubId, [{ productoId: cargo.productoId, cantidad: delta }], { tipo: 'comanda', id, motivo: 'Ajuste de cantidad en mesa' })
      else await reponerStock(tx, clubId, [{ productoId: cargo.productoId, cantidad: -delta }], { tipo: 'comanda', id, motivo: 'Ajuste de cantidad en mesa' })
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar la cantidad' })
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
    // Se cerró por caja → si había un link/QR de MP vivo para esta mesa, cancelarlo (anti fantasma).
    await cancelarLinksDeItems(clubId, [{ origen: 'comanda', refId: id }]).catch(() => {})
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

// POST /api/comandas/:id/link-pago — genera un link/QR de Mercado Pago por el total de la mesa.
// La mesa queda ABIERTA hasta que el webhook confirma el pago → ahí se cierra sola. RN-70/76/77.
router.post('/:id/link-pago', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'Mercado Pago no está configurado todavía.' })
  try {
    const out = await crearLinkPagoComanda({ clubId, comandaId: req.params.id })
    res.status(out.reusado ? 200 : 201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[comanda link-pago]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el link de pago' })
  }
})

// POST /api/comandas/:id/qr-cobrar — QR de billetera interoperable por el total de la mesa. La
// mesa queda ABIERTA hasta que el webhook (rama origen 'comanda') confirma el pago → se cierra sola.
router.post('/:id/qr-cobrar', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'Mercado Pago no está configurado todavía.' })
  try {
    const out = await crearOrdenQRComanda({ clubId, comandaId: req.params.id })
    res.status(201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[comanda qr-cobrar]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el QR' })
  }
})

export default router
