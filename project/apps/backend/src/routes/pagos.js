import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireFeature, requirePermiso } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { revertirPagoTx } from '../lib/pagos.js'
import { runSerializable } from '../lib/serializable.js'
import { mpConfigurado } from '../lib/mercadopago.js'
import { crearLinkPagoDeuda } from '../lib/cobrosMP.js'

const router = Router()

const SEL_JUGADOR = { select: { id: true, nombre: true, apellido: true, dni: true } }

// GET /api/pagos — historial de pagos (libro de plata). ?jugadorId= &incluirAnulados=1
// Por defecto: pagos del mes en curso, no anulados. Cada uno con sus líneas (split).
router.get('/', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { jugadorId, incluirAnulados } = req.query
  try {
    const where = { clubId: req.user.clubId, pagadoAt: { gte: inicioMesArg() } }
    if (jugadorId) where.jugadorId = jugadorId
    if (incluirAnulados !== '1') where.anuladoAt = null
    const pagos = await prisma.pago.findMany({
      where,
      include: { lineas: { select: { metodo: true, monto: true } }, jugador: SEL_JUGADOR },
      orderBy: { pagadoAt: 'desc' },
      take: 200,
    })
    res.json(pagos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los pagos' })
  }
})

// POST /api/pagos/:id/anular — revierte un pago: descuenta el saldo imputado a cada ítem,
// reabre los que queden impagos, y marca el pago anulado (no lo borra: queda auditoría).
router.post('/:id/anular', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { id } = req.params
  try {
    const pago = await prisma.pago.findUnique({ where: { id }, select: { id: true, clubId: true, imputaciones: true, anuladoAt: true } })
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' })
    if (pago.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (pago.anuladoAt) return res.status(409).json({ error: 'ya_anulado', message: 'Este pago ya estaba anulado' })
    // Serializable: re-lee saldoPagado dentro de la TX → dos reversas concurrentes no se pisan.
    await runSerializable(async (tx) => {
      const fresco = await tx.pago.findUnique({ where: { id }, select: { anuladoAt: true } })
      if (fresco?.anuladoAt) return // otra reversa ganó
      await revertirPagoTx(tx, pago)
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al anular el pago' })
  }
})

// POST /api/pagos/link-pago — link de Mercado Pago para UNA deuda (cargo o turno).
// Body: { origen: 'cargo'|'reserva', refId }. La acreditación real ocurre por webhook.
router.post('/link-pago', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { origen, refId } = req.body || {}
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'Mercado Pago no está configurado todavía.' })
  if (!refId || !['cargo', 'reserva'].includes(origen)) return res.status(400).json({ error: 'datos_incompletos', message: 'Falta la deuda a cobrar.' })
  try {
    const out = await crearLinkPagoDeuda({ clubId, origen, refId })
    res.status(out.reusado ? 200 : 201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[link-pago]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el link de pago' })
  }
})

export default router
