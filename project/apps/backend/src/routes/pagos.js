import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireFeature, requirePermiso } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { revertirPagoTx } from '../lib/pagos.js'
import { runSerializable } from '../lib/serializable.js'
import { mpConfigurado } from '../lib/mercadopago.js'
import { crearLinkPagoDeuda, crearLinkPagoMultiple } from '../lib/cobrosMP.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'

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

// POST /api/pagos/link-pago — link de Mercado Pago para una o varias deudas de un jugador.
// Body: { items: [{origen,refId}], jugadorId } (varias) o { origen, refId } (una, legacy).
// 1 deuda → link single (reusa link vivo); varias → link 'multi' por el total. Acredita el webhook.
router.post('/link-pago', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { items, jugadorId, origen, refId } = req.body || {}
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'Mercado Pago no está configurado todavía.' })
  // Normalizar a lista: acepta items[] (nuevo) o {origen,refId} (compat con el single viejo).
  const lista = Array.isArray(items) && items.length ? items : (refId ? [{ origen, refId }] : [])
  if (lista.length === 0) return res.status(400).json({ error: 'datos_incompletos', message: 'Falta la deuda a cobrar.' })
  try {
    const out = lista.length === 1
      ? await crearLinkPagoDeuda({ clubId, origen: lista[0].origen, refId: lista[0].refId })
      : await crearLinkPagoMultiple({ clubId, jugadorId, deudas: lista })
    res.status(out.reusado ? 200 : 201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[link-pago]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el link de pago' })
  }
})

// POST /api/pagos/me/link-pago — el JUGADOR genera un link/QR para pagar TODO su saldo.
// SEGURIDAD: el jugadorId sale del token (req.user.id), NUNCA del body → solo puede pagar
// sus propias deudas. Junta sus cargos pendientes + turnos impagos y arma un link por el total.
router.post('/me/link-pago', requireAuth, requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id // ← del token, jamás del navegador
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'El club no tiene Mercado Pago configurado todavía.' })
  try {
    const [cargos, turnos] = await Promise.all([
      prisma.cargo.findMany({ where: { jugadorId, clubId, estado: 'pendiente', comandaId: null }, select: { id: true } }),
      turnosImpagosDeuda(clubId, { jugadorId }),
    ])
    const deudas = [
      ...cargos.map((c) => ({ origen: 'cargo', refId: c.id })),
      ...turnos.map((t) => ({ origen: 'reserva', refId: t.refId })),
    ]
    if (deudas.length === 0) return res.status(409).json({ error: 'sin_deuda', message: 'No tenés pagos pendientes.' })
    const out = deudas.length === 1
      ? await crearLinkPagoDeuda({ clubId, origen: deudas[0].origen, refId: deudas[0].refId })
      : await crearLinkPagoMultiple({ clubId, jugadorId, deudas })
    res.status(out.reusado ? 200 : 201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[me link-pago]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el link de pago' })
  }
})

// GET /api/pagos/links-vivos?jugadorId= — links de MP activos (iniciado/pending, no vencidos)
// del club (o de un jugador). Sirve para mostrar "esperando pago" y poder recuperar/reenviar
// el link. Devuelve, por link, las deudas que cubre (normalizado: single o multi → lista).
router.get('/links-vivos', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { jugadorId } = req.query
  try {
    const rows = await prisma.pagoMP.findMany({
      where: {
        clubId,
        jugadorId: jugadorId || undefined,
        status: { in: ['iniciado', 'pending'] },
        initPoint: { not: null },
        OR: [{ expiraAt: null }, { expiraAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(rows.map((r) => ({
      id: r.id,
      initPoint: r.initPoint,
      monto: r.montoEsperado,
      status: r.status,
      createdAt: r.createdAt,
      expiraAt: r.expiraAt,
      deudas: r.origen === 'multi' ? (Array.isArray(r.items) ? r.items : []) : [{ origen: r.origen, refId: r.refId }],
    })))
  } catch (err) {
    console.error('[links-vivos]', err)
    res.status(500).json({ error: 'error', message: 'No se pudieron obtener los links de pago' })
  }
})

// POST /api/pagos/link-pago/:id/cancelar — da de baja un link activo (el admin prefiere
// cobrar de otra forma). NO frena a MP: si el jugador igual paga, el webhook lo acredita
// (y si ya se cobró aparte, queda como sobrepago RN-75). Es una señal de la vista.
router.post('/link-pago/:id/cancelar', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  try {
    const pm = await prisma.pagoMP.findUnique({ where: { id }, select: { clubId: true, status: true } })
    if (!pm || pm.clubId !== clubId) return res.status(404).json({ error: 'no_encontrado', message: 'Link no encontrado' })
    if (!['iniciado', 'pending'].includes(pm.status)) return res.status(409).json({ error: 'no_cancelable', message: 'Ese link ya no está activo.' })
    await prisma.pagoMP.update({ where: { id }, data: { status: 'cancelled' } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[link-pago cancelar]', err)
    res.status(500).json({ error: 'error', message: 'No se pudo cancelar el link' })
  }
})

export default router
