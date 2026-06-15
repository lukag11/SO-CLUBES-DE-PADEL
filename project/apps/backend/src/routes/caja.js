import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rangoDiaArg, hoyArgStr } from '../lib/tiempo.js'

const router = Router()

// GET /api/caja?fecha=YYYY-MM-DD — arqueo del día: ingresos − egresos por método.
// Cuenta SOLO movimientos pagados (plata que entró/salió ese día, por pagadoAt en hora ARG).
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const fecha = req.query.fecha || hoyArgStr()
  const { desde, hasta } = rangoDiaArg(fecha)
  const rango = { gte: desde, lt: hasta }

  try {
    const [reservas, cargos, gastos] = await Promise.all([
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: rango }, select: { precio: true, metodoPago: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: rango }, select: { monto: true, metodoPago: true } }),
      prisma.gasto.findMany({ where: { clubId, pagado: true, pagadoAt: rango }, select: { monto: true, metodoPago: true } }),
    ])

    // Acumular por método: { [metodo]: { ingreso, egreso } }
    const metodos = {}
    const bucket = (m) => (metodos[m || 'otro'] ??= { ingreso: 0, egreso: 0 })
    for (const r of reservas) bucket(r.metodoPago).ingreso += r.precio ?? 0
    for (const c of cargos)   bucket(c.metodoPago).ingreso += c.monto ?? 0
    for (const g of gastos)   bucket(g.metodoPago).egreso  += g.monto ?? 0

    const ingresos = reservas.reduce((s, r) => s + (r.precio ?? 0), 0) + cargos.reduce((s, c) => s + (c.monto ?? 0), 0)
    const egresos = gastos.reduce((s, g) => s + (g.monto ?? 0), 0)

    res.json({
      fecha,
      ingresos,
      egresos,
      neto: ingresos - egresos,
      metodos, // { efectivo: { ingreso, egreso }, ... }
      cantMovimientos: reservas.length + cargos.length + gastos.length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular la caja del día' })
  }
})

// GET /api/caja/reporte?desde=YYYY-MM-DD&hasta=YYYY-MM-DD — reporte financiero del período.
// Ingresos por método / tipo / categoría (bar), top productos, margen y egresos.
router.get('/reporte', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const hoy = hoyArgStr()
  const desdeStr = req.query.desde || hoy
  const hastaStr = req.query.hasta || desdeStr
  const rango = { gte: rangoDiaArg(desdeStr).desde, lt: rangoDiaArg(hastaStr).hasta }

  try {
    const [reservas, cargos, gastos] = await Promise.all([
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: rango }, select: { precio: true, metodoPago: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: rango }, select: { monto: true, metodoPago: true, tipo: true, categoria: true, costo: true, concepto: true } }),
      prisma.gasto.findMany({ where: { clubId, pagado: true, pagadoAt: rango }, select: { monto: true, metodoPago: true, categoria: true } }),
    ])

    const add = (obj, key, campo, val) => { (obj[key] ??= { ingreso: 0, egreso: 0, costo: 0, count: 0 })[campo] += val }

    // Por método (ingresos = reservas + cargos; egresos = gastos)
    const porMetodo = {}
    for (const r of reservas) add(porMetodo, r.metodoPago || 'otro', 'ingreso', r.precio ?? 0)
    for (const c of cargos) add(porMetodo, c.metodoPago || 'otro', 'ingreso', c.monto ?? 0)
    for (const g of gastos) add(porMetodo, g.metodoPago || 'otro', 'egreso', g.monto ?? 0)

    // Ingresos por tipo
    const porTipo = { turnos: 0, bar: 0, torneos: 0, otros: 0 }
    porTipo.turnos += reservas.reduce((s, r) => s + (r.precio ?? 0), 0)
    for (const c of cargos) {
      if (c.tipo === 'reserva') porTipo.turnos += c.monto
      else if (c.tipo === 'producto') porTipo.bar += c.monto
      else if (c.tipo === 'torneo') porTipo.torneos += c.monto
      else porTipo.otros += c.monto
    }

    // Ventas de bar por categoría (+ margen) y top productos
    const limpiarConcepto = (s) => String(s || '').replace(/^\d+×\s*/, '').trim()
    const porCategoria = {}
    const productosMap = {}
    let ventaBar = 0, costoBar = 0, conCosto = 0
    for (const c of cargos.filter((x) => x.tipo === 'producto')) {
      const cat = c.categoria || 'Sin categoría'
      const e = (porCategoria[cat] ??= { monto: 0, costo: 0, count: 0 })
      e.monto += c.monto; e.count += 1
      if (c.costo != null) { e.costo += c.costo; costoBar += c.costo; conCosto += 1 }
      ventaBar += c.monto
      const nombre = limpiarConcepto(c.concepto)
      const p = (productosMap[nombre] ??= { nombre, monto: 0, count: 0 })
      p.monto += c.monto; p.count += 1
    }
    const topProductos = Object.values(productosMap).sort((a, b) => b.monto - a.monto).slice(0, 10)

    const ingresos = reservas.reduce((s, r) => s + (r.precio ?? 0), 0) + cargos.reduce((s, c) => s + (c.monto ?? 0), 0)
    const egresos = gastos.reduce((s, g) => s + (g.monto ?? 0), 0)

    res.json({
      desde: desdeStr, hasta: hastaStr,
      ingresos, egresos, neto: ingresos - egresos,
      porMetodo, porTipo,
      bar: { venta: ventaBar, costo: costoBar, margen: ventaBar - costoBar, conCosto },
      porCategoria, topProductos,
      cantMovimientos: reservas.length + cargos.length + gastos.length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al generar el reporte' })
  }
})

export default router
