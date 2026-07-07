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

// ──────────────────────────────────────────────────────────────────────────────
// ARQUEO DE CAJA — control del efectivo físico (SOLO efectivo). Aditivo: no toca los
// flujos de cobro. El "esperado" se calcula por VENTANA TEMPORAL (cobros en efectivo
// entre apertura y cierre), así no hay que estampar nada en cada cobro.
// ──────────────────────────────────────────────────────────────────────────────

// Suma de cobros en EFECTIVO (reservas + cargos pagados) entre dos instantes.
async function cobrosEfectivoEntre(clubId, desde, hasta) {
  const rango = { gte: desde, lt: hasta }
  const [reservas, cargos] = await Promise.all([
    prisma.reserva.findMany({ where: { clubId, pagado: true, metodoPago: 'efectivo', pagadoAt: rango }, select: { precio: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', metodoPago: 'efectivo', pagadoAt: rango }, select: { monto: true } }),
  ])
  return reservas.reduce((s, r) => s + (r.precio ?? 0), 0) + cargos.reduce((s, c) => s + (c.monto ?? 0), 0)
}

// Neto de movimientos manuales de efectivo: egresos (−) suman al "salió", ingresos (+) restan.
// Devuelve el EGRESO NETO (egreso − ingreso): positivo = salió plata del cajón.
const egresoNetoMovimientos = (movs) =>
  movs.reduce((s, m) => s + (m.tipo === 'egreso' ? (m.monto ?? 0) : -(m.monto ?? 0)), 0)

// GET /api/caja/arqueo/actual — la sesión abierta del club (con esperado calculado EN VIVO).
router.get('/arqueo/actual', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const arqueo = await prisma.arqueoCaja.findFirst({
      where: { clubId: req.user.clubId, estado: 'abierta' },
      include: { movimientos: { orderBy: { createdAt: 'desc' } } },
      orderBy: { abiertoAt: 'desc' },
    })
    if (!arqueo) return res.json({ abierta: null })
    const cobros = await cobrosEfectivoEntre(req.user.clubId, arqueo.abiertoAt, new Date())
    const egresoNeto = egresoNetoMovimientos(arqueo.movimientos)
    const esperado = arqueo.fondoInicial + cobros - egresoNeto
    res.json({ abierta: { ...arqueo, cobrosEfectivo: cobros, egresoNeto, efectivoEsperado: esperado } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la caja actual' })
  }
})

// POST /api/caja/arqueo/abrir — { fondoInicial }. Abre una sesión (rechaza si ya hay una abierta).
router.post('/arqueo/abrir', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const yaAbierta = await prisma.arqueoCaja.findFirst({ where: { clubId: req.user.clubId, estado: 'abierta' }, select: { id: true } })
    if (yaAbierta) return res.status(409).json({ error: 'Ya hay una caja abierta. Cerrá la actual antes de abrir otra.' })
    const fondoInicial = Math.max(0, Math.round(Number(req.body?.fondoInicial) || 0))
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, select: { nombre: true } })
    const arqueo = await prisma.arqueoCaja.create({
      data: { clubId: req.user.clubId, empleadoId: req.user.id, empleadoNombre: admin?.nombre ?? null, fondoInicial },
    })
    res.status(201).json(arqueo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo abrir la caja' })
  }
})

// POST /api/caja/arqueo/:id/movimiento — { tipo: 'egreso'|'ingreso', monto, concepto }.
router.post('/arqueo/:id/movimiento', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const arqueo = await prisma.arqueoCaja.findFirst({ where: { id: req.params.id, clubId: req.user.clubId } })
    if (!arqueo) return res.status(404).json({ error: 'Caja no encontrada' })
    if (arqueo.estado !== 'abierta') return res.status(409).json({ error: 'La caja ya está cerrada' })
    const tipo = req.body?.tipo === 'ingreso' ? 'ingreso' : 'egreso'
    const monto = Math.round(Number(req.body?.monto) || 0)
    const concepto = (req.body?.concepto || '').toString().trim()
    if (monto <= 0) return res.status(400).json({ error: 'El monto tiene que ser mayor a 0' })
    if (!concepto) return res.status(400).json({ error: 'Poné un concepto (ej: retiro dueño, compra hielo)' })
    const mov = await prisma.movimientoCaja.create({ data: { arqueoId: arqueo.id, tipo, monto, concepto } })
    res.status(201).json(mov)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo registrar el movimiento' })
  }
})

// POST /api/caja/arqueo/:id/cerrar — { efectivoDeclarado, notas }. Congela totales y calcula diferencia.
router.post('/arqueo/:id/cerrar', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const arqueo = await prisma.arqueoCaja.findFirst({
      where: { id: req.params.id, clubId: req.user.clubId },
      include: { movimientos: true },
    })
    if (!arqueo) return res.status(404).json({ error: 'Caja no encontrada' })
    if (arqueo.estado !== 'abierta') return res.status(409).json({ error: 'La caja ya está cerrada' })
    const efectivoDeclarado = Math.max(0, Math.round(Number(req.body?.efectivoDeclarado) || 0))
    const notas = (req.body?.notas || '').toString().trim() || null
    const cerradoAt = new Date()
    const cobros = await cobrosEfectivoEntre(req.user.clubId, arqueo.abiertoAt, cerradoAt)
    const egresoNeto = egresoNetoMovimientos(arqueo.movimientos)
    const esperado = arqueo.fondoInicial + cobros - egresoNeto
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, select: { nombre: true } })
    const cerrado = await prisma.arqueoCaja.update({
      where: { id: arqueo.id },
      data: {
        estado: 'cerrada', cerradoAt,
        cobrosEfectivo: cobros, egresosEfectivo: egresoNeto,
        efectivoEsperado: esperado, efectivoDeclarado, diferencia: efectivoDeclarado - esperado,
        notas, cerradoPorNombre: admin?.nombre ?? null,
      },
    })
    res.json(cerrado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cerrar la caja' })
  }
})

// GET /api/caja/arqueo/historial — arqueos cerrados (para el dueño), con su diferencia.
router.get('/arqueo/historial', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const historial = await prisma.arqueoCaja.findMany({
      where: { clubId: req.user.clubId, estado: 'cerrada' },
      orderBy: { cerradoAt: 'desc' },
      take: 60,
      select: {
        id: true, empleadoNombre: true, abiertoAt: true, cerradoAt: true,
        fondoInicial: true, cobrosEfectivo: true, egresosEfectivo: true,
        efectivoEsperado: true, efectivoDeclarado: true, diferencia: true, notas: true,
      },
    })
    res.json(historial)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el historial de arqueos' })
  }
})

export default router
