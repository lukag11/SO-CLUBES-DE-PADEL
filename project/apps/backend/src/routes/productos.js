import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { snapshotProductos } from '../lib/productos.js'
import { descontarStock } from '../lib/stock.js'

const router = Router()

// GET /api/productos — catálogo del club (todos: activos e inactivos, para el ABM)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { clubId: req.user.clubId },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    })
    res.json(productos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// POST /api/productos — alta de producto
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, precio, categoria, costo, controlaStock, stock, stockMin } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })
  const precioNum = Math.round(Number(precio))
  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    return res.status(400).json({ error: 'El precio debe ser mayor a 0' })
  }
  const costoNum = costo != null && costo !== '' ? Math.round(Number(costo)) : null
  try {
    const producto = await prisma.producto.create({
      data: {
        clubId: req.user.clubId,
        nombre: nombre.trim(),
        precio: precioNum,
        costo: Number.isFinite(costoNum) && costoNum >= 0 ? costoNum : null,
        categoria: categoria?.trim() || null,
        controlaStock: !!controlaStock,
        stock: controlaStock && Number(stock) > 0 ? Math.round(Number(stock)) : 0,
        stockMin: Number(stockMin) > 0 ? Math.round(Number(stockMin)) : 0,
      },
    })
    res.status(201).json(producto)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

// PATCH /api/productos/:id — editar producto (nombre, precio, categoría, activo)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, precio, categoria, activo, costo, controlaStock, stockMin } = req.body
  try {
    const producto = await prisma.producto.findUnique({ where: { id: req.params.id } })
    if (!producto || producto.clubId !== req.user.clubId) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    if (precio !== undefined && !(Math.round(Number(precio)) > 0)) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' })
    }
    const updated = await prisma.producto.update({
      where: { id: req.params.id },
      data: {
        ...(nombre !== undefined && { nombre: String(nombre).trim() }),
        ...(precio !== undefined && { precio: Math.round(Number(precio)) }),
        ...(costo !== undefined && { costo: costo === '' || costo == null ? null : Math.round(Number(costo)) }),
        ...(categoria !== undefined && { categoria: categoria?.trim() || null }),
        ...(activo !== undefined && { activo: !!activo }),
        ...(controlaStock !== undefined && { controlaStock: !!controlaStock }),
        ...(stockMin !== undefined && { stockMin: Math.max(0, Math.round(Number(stockMin) || 0)) }),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

// DELETE /api/productos/:id — eliminar producto del catálogo (no afecta ventas ya registradas)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const producto = await prisma.producto.findUnique({ where: { id: req.params.id } })
    if (!producto || producto.clubId !== req.user.clubId) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    await prisma.producto.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

// GET /api/productos/:id/movimientos — historial de stock del producto
router.get('/:id/movimientos', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const p = await prisma.producto.findUnique({ where: { id: req.params.id }, select: { clubId: true } })
    if (!p || p.clubId !== req.user.clubId) return res.status(404).json({ error: 'Producto no encontrado' })
    const movs = await prisma.movimientoStock.findMany({ where: { productoId: req.params.id }, orderBy: { createdAt: 'desc' }, take: 50 })
    res.json(movs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// POST /api/productos/:id/ajuste — ajuste manual de stock. Body: { stock } (valor final) | { delta }
router.post('/:id/ajuste', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  try {
    const p = await prisma.producto.findUnique({ where: { id } })
    if (!p || p.clubId !== clubId) return res.status(404).json({ error: 'Producto no encontrado' })
    const nuevo = req.body.stock != null ? Math.max(0, Math.round(Number(req.body.stock))) : p.stock + Math.round(Number(req.body.delta) || 0)
    const delta = nuevo - p.stock
    await prisma.$transaction(async (tx) => {
      await tx.producto.update({ where: { id }, data: { stock: Math.max(0, nuevo), ...(p.controlaStock ? {} : { controlaStock: true }) } })
      if (delta !== 0) await tx.movimientoStock.create({ data: { clubId, productoId: id, tipo: 'ajuste', cantidad: delta, motivo: req.body.motivo || 'Ajuste manual', refTipo: 'manual' } })
    })
    const actualizado = await prisma.producto.findUnique({ where: { id } })
    res.json(actualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al ajustar el stock' })
  }
})

// POST /api/productos/venta — registra una venta a la cuenta de un jugador, o de mostrador.
// Body: { jugadorId|null, items: [{ nombre, precio, cantidad }], cobrar: bool, metodoPago? }
// jugadorId null = venta de mostrador / casual (debe ser al contado, no puede quedar a cuenta).
// Genera UN cargo 'producto' POR ÍTEM (con categoría/costo snapshot, para reportes/margen).
// cobrar=true → pagado (entra a caja); false → pendiente (deuda).
router.post('/venta', requireAuth, requireRole('admin'), async (req, res) => {
  const { jugadorId = null, items, cobrar, metodoPago } = req.body
  const clubId = req.user.clubId

  if (!jugadorId && !cobrar) {
    return res.status(400).json({ error: 'Una venta de mostrador debe cobrarse al contado (no puede quedar a cuenta)' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agregá al menos un producto' })
  }

  // Normalizar y validar líneas
  const lineas = items.map((it) => ({
    nombre: String(it.nombre ?? '').trim(),
    precio: Math.round(Number(it.precio)),
    cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
    productoId: it.productoId || null,
  }))
  if (lineas.some((l) => !l.nombre || !(l.precio > 0))) {
    return res.status(400).json({ error: 'Hay un producto con datos inválidos' })
  }

  try {
    if (jugadorId) {
      const jugador = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { clubId: true } })
      if (!jugador || jugador.clubId !== clubId) {
        return res.status(404).json({ error: 'Jugador no encontrado en este club' })
      }
    }
    const snap = await snapshotProductos(clubId, lineas.map((l) => l.productoId))
    const now = new Date()
    const estado = cobrar ? 'pagado' : 'pendiente'
    const pagoData = cobrar ? { pagadoAt: now, metodoPago: normalizarMetodo(metodoPago) } : {}
    // Un cargo por línea (para reporting por producto/categoría) + descuento de stock
    await prisma.$transaction(async (tx) => {
      await tx.cargo.createMany({
        data: lineas.map((l) => {
          const costoUnit = snap[l.productoId]?.costo
          return {
            clubId, jugadorId, tipo: 'producto', estado,
            concepto: l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre,
            monto: l.precio * l.cantidad,
            productoId: l.productoId, cantidad: l.cantidad,
            categoria: snap[l.productoId]?.categoria ?? null,
            costo: costoUnit != null ? costoUnit * l.cantidad : null,
            ...pagoData,
          }
        }),
      })
      await descontarStock(tx, clubId, lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })), { tipo: 'cargo', motivo: 'Venta' })
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar la venta' })
  }
})

export default router
