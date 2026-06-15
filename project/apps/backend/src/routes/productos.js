import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { snapshotProductos } from '../lib/productos.js'

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
  const { nombre, precio, categoria, costo } = req.body
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
  const { nombre, precio, categoria, activo, costo } = req.body
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
    // Un cargo por línea (para reporting por producto/categoría)
    await prisma.cargo.createMany({
      data: lineas.map((l) => {
        const costoUnit = snap[l.productoId]?.costo
        return {
          clubId, jugadorId, tipo: 'producto', estado,
          concepto: l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre,
          monto: l.precio * l.cantidad,
          productoId: l.productoId,
          categoria: snap[l.productoId]?.categoria ?? null,
          costo: costoUnit != null ? costoUnit * l.cantidad : null,
          ...pagoData,
        }
      }),
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar la venta' })
  }
})

export default router
