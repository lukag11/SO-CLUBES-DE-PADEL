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

export default router
