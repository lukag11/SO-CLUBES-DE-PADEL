import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'

const router = Router()

// Valores admitidos (defensa: no guardar basura que después rompa los cálculos).
const CATEGORIAS = new Set(['alquiler', 'sueldos', 'energia', 'amortizacion', 'otros'])
const TIPOS = new Set(['fijo', 'variable'])
const PERIODICIDADES = new Set(['mensual', 'bimestral', 'anual', 'unico'])
const SECTORES = new Set(['bar', 'clases', 'canchas', 'proshop'])
const MONEDAS = new Set(['ARS', 'USD'])

// Normaliza y valida el payload de un costo. Devuelve { data } o { error }.
const parseCosto = (body) => {
  const { concepto, categoria, tipo, monto, periodicidad, diaPago, mesesPago, sector, ajustaPorIPC, moneda, desde, hasta, activo } = body || {}
  if (!concepto?.trim()) return { error: 'El concepto es requerido' }
  const montoNum = Math.round(Number(monto))
  if (!Number.isFinite(montoNum) || montoNum <= 0) return { error: 'El monto debe ser mayor a 0' }

  return {
    data: {
      concepto: concepto.trim(),
      categoria: CATEGORIAS.has(categoria) ? categoria : 'otros',
      tipo: TIPOS.has(tipo) ? tipo : 'fijo',
      monto: montoNum,
      periodicidad: PERIODICIDADES.has(periodicidad) ? periodicidad : 'mensual',
      diaPago: Number.isInteger(diaPago) && diaPago >= 1 && diaPago <= 31 ? diaPago : null,
      mesesPago: Array.isArray(mesesPago) ? mesesPago.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12) : [],
      sector: SECTORES.has(sector) ? sector : null,
      ajustaPorIPC: ajustaPorIPC === true,
      moneda: MONEDAS.has(moneda) ? moneda : 'ARS',
      desde: desde || null,
      hasta: hasta || null,
      ...(activo !== undefined && { activo: activo !== false }),
    },
  }
}

// GET /api/costos — lista de costos del club (?tipo=fijo|variable &sector= &activo=false para incluir inactivos)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { tipo, sector, activo } = req.query
  try {
    const where = { clubId: req.user.clubId }
    if (TIPOS.has(tipo)) where.tipo = tipo
    if (SECTORES.has(sector)) where.sector = sector
    if (activo !== 'false') where.activo = true // por default solo activos
    const costos = await prisma.costo.findMany({ where, orderBy: [{ tipo: 'asc' }, { monto: 'desc' }] })
    // Puente Costo↔Gasto AUTOMÁTICO: un costo se considera "pagado este mes" si hay un gasto
    // pagado este mes que lo cubre — por vínculo explícito (costoId) o por MISMO concepto
    // (ej. gasto "Alquiler" cubre el costo "Alquiler"). Sin botones ni doble carga.
    const norm = (s) => (s || '').trim().toLowerCase()
    const gastosMes = await prisma.gasto.findMany({
      where: { clubId: req.user.clubId, pagado: true, pagadoAt: { gte: inicioMesArg() } },
      select: { concepto: true, costoId: true },
    })
    const conceptosPagados = new Set(gastosMes.map((g) => norm(g.concepto)))
    const costoIdsPagados = new Set(gastosMes.map((g) => g.costoId).filter(Boolean))
    res.json(costos.map((c) => ({
      ...c,
      pagadoEsteMes: costoIdsPagados.has(c.id) || conceptosPagados.has(norm(c.concepto)),
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener costos' })
  }
})

// POST /api/costos — alta de un costo (lo carga el dueño)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = parseCosto(req.body)
  if (error) return res.status(400).json({ error })
  try {
    const costo = await prisma.costo.create({ data: { ...data, clubId: req.user.clubId } })
    res.status(201).json(costo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear el costo' })
  }
})

// PATCH /api/costos/:id — editar un costo (solo del propio club)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { data, error } = parseCosto(req.body)
  if (error) return res.status(400).json({ error })
  try {
    // multi-tenant: updateMany con clubId asegura que no se edite un costo de otro club
    const r = await prisma.costo.updateMany({ where: { id: req.params.id, clubId: req.user.clubId }, data })
    if (r.count === 0) return res.status(404).json({ error: 'Costo no encontrado' })
    const costo = await prisma.costo.findUnique({ where: { id: req.params.id } })
    res.json(costo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al editar el costo' })
  }
})

// DELETE /api/costos/:id — borrar un costo (solo del propio club)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const r = await prisma.costo.deleteMany({ where: { id: req.params.id, clubId: req.user.clubId } })
    if (r.count === 0) return res.status(404).json({ error: 'Costo no encontrado' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al borrar el costo' })
  }
})

export default router
