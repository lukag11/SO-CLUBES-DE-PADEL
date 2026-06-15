import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { ingresarStock } from '../lib/stock.js'

const router = Router()

// GET /api/gastos — lista de gastos del club (?categoria= &pagado=true|false)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { categoria, pagado } = req.query
  try {
    const where = { clubId: req.user.clubId }
    if (categoria) where.categoria = categoria
    if (pagado === 'true') where.pagado = true
    if (pagado === 'false') where.pagado = false
    const gastos = await prisma.gasto.findMany({ where, orderBy: { fecha: 'desc' } })
    res.json(gastos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener gastos' })
  }
})

// GET /api/gastos/resumen — totales para las tarjetas (gastado este mes, a pagar)
router.get('/resumen', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const [pagadosMes, pendientes] = await Promise.all([
      prisma.gasto.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioMesArg() } }, select: { monto: true } }),
      prisma.gasto.findMany({ where: { clubId, pagado: false }, select: { monto: true } }),
    ])
    res.json({
      gastadoMes: pagadosMes.reduce((s, g) => s + g.monto, 0),
      aPagar: pendientes.reduce((s, g) => s + g.monto, 0),
      cantAPagar: pendientes.length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular resumen de gastos' })
  }
})

// POST /api/gastos — alta de gasto/factura (manual hoy; mismo shape que produciría el OCR).
// Opcional: lineasStock [{ productoId?|nombre?, categoria?, cantidad, costoUnit, precio? }] →
// ingresa stock (crea/matchea productos, suma stock, actualiza costo). Esto es el target del OCR (F5).
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { proveedor, concepto, monto, categoria, fecha, metodoPago, pagado, numeroFactura, imagenUrl, fuente, lineasStock } = req.body
  const clubId = req.user.clubId
  if (!concepto?.trim()) return res.status(400).json({ error: 'El concepto es requerido' })
  const montoNum = Math.round(Number(monto))
  if (!Number.isFinite(montoNum) || montoNum <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' })

  const estaPagado = pagado !== false // default true
  try {
    const gasto = await prisma.$transaction(async (tx) => {
      const g = await tx.gasto.create({
        data: {
          clubId,
          proveedor: proveedor?.trim() || null,
          concepto: concepto.trim(),
          monto: montoNum,
          categoria: categoria?.trim() || null,
          fecha: fecha || new Date().toISOString().slice(0, 10),
          pagado: estaPagado,
          ...(estaPagado && { pagadoAt: new Date(), metodoPago: normalizarMetodo(metodoPago) }),
          numeroFactura: numeroFactura?.trim() || null,
          imagenUrl: imagenUrl || null,
          fuente: fuente === 'ocr' ? 'ocr' : 'manual',
        },
      })

      // Ingreso de stock desde las líneas de la factura (si se enviaron)
      if (Array.isArray(lineasStock) && lineasStock.length) {
        const resueltas = []
        for (const l of lineasStock) {
          const cantidad = Math.max(1, Math.round(Number(l.cantidad) || 1))
          const costoUnit = l.costoUnit != null && l.costoUnit !== '' ? Math.round(Number(l.costoUnit)) : null
          let pid = l.productoId || null
          if (!pid && l.nombre?.trim()) {
            const ex = await tx.producto.findFirst({ where: { clubId, nombre: { equals: l.nombre.trim(), mode: 'insensitive' } }, select: { id: true } })
            if (ex) pid = ex.id
            else {
              const np = await tx.producto.create({
                data: {
                  clubId, nombre: l.nombre.trim(), categoria: l.categoria?.trim() || null,
                  precio: Math.round(Number(l.precio) || costoUnit || 1) || 1,
                  costo: costoUnit, controlaStock: true, stock: 0,
                },
              })
              pid = np.id
            }
          }
          if (pid) resueltas.push({ productoId: pid, cantidad, costoUnit })
        }
        await ingresarStock(tx, clubId, resueltas, { tipo: 'gasto', id: g.id, motivo: `Compra${g.numeroFactura ? ` #${g.numeroFactura}` : ''}` })
      }
      return g
    })
    res.status(201).json(gasto)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear gasto' })
  }
})

// PATCH /api/gastos/:id — editar gasto o marcarlo pagado/impago
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { proveedor, concepto, monto, categoria, fecha, metodoPago, pagado, numeroFactura, imagenUrl } = req.body
  try {
    const gasto = await prisma.gasto.findUnique({ where: { id: req.params.id } })
    if (!gasto || gasto.clubId !== req.user.clubId) return res.status(404).json({ error: 'Gasto no encontrado' })
    if (monto !== undefined && !(Math.round(Number(monto)) > 0)) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' })
    }

    const data = {
      ...(proveedor !== undefined && { proveedor: proveedor?.trim() || null }),
      ...(concepto !== undefined && { concepto: String(concepto).trim() }),
      ...(monto !== undefined && { monto: Math.round(Number(monto)) }),
      ...(categoria !== undefined && { categoria: categoria?.trim() || null }),
      ...(fecha !== undefined && { fecha }),
      ...(numeroFactura !== undefined && { numeroFactura: numeroFactura?.trim() || null }),
      ...(imagenUrl !== undefined && { imagenUrl: imagenUrl || null }),
    }
    // Cambio de estado pagado/impago
    if (pagado !== undefined) {
      data.pagado = !!pagado
      data.pagadoAt = pagado ? (gasto.pagadoAt ?? new Date()) : null
      data.metodoPago = pagado ? normalizarMetodo(metodoPago ?? gasto.metodoPago) : null
    } else if (metodoPago !== undefined && gasto.pagado) {
      data.metodoPago = normalizarMetodo(metodoPago)
    }

    const updated = await prisma.gasto.update({ where: { id: req.params.id }, data })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar gasto' })
  }
})

// DELETE /api/gastos/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const gasto = await prisma.gasto.findUnique({ where: { id: req.params.id } })
    if (!gasto || gasto.clubId !== req.user.clubId) return res.status(404).json({ error: 'Gasto no encontrado' })
    await prisma.gasto.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar gasto' })
  }
})

export default router
