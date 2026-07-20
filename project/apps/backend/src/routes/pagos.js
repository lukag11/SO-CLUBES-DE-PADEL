import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireFeature, requirePermiso } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { revertirPagoTx, imputarPagoTx } from '../lib/pagos.js'
import { runSerializable } from '../lib/serializable.js'
import { mpConfigurado } from '../lib/mercadopago.js'
import { crearLinkPagoDeuda, crearLinkPagoMultiple, linksVivosDeDeudas } from '../lib/cobrosMP.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'

// Deudas pendientes de un jugador (cargos + turnos impagos), como [{origen,refId}].
async function deudasDelJugador(clubId, jugadorId) {
  const [cargos, turnos] = await Promise.all([
    prisma.cargo.findMany({ where: { jugadorId, clubId, estado: 'pendiente', comandaId: null }, select: { id: true } }),
    turnosImpagosDeuda(clubId, { jugadorId }),
  ])
  return [
    ...cargos.map((c) => ({ origen: 'cargo', refId: c.id })),
    ...turnos.map((t) => ({ origen: 'reserva', refId: t.refId })),
  ]
}

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

// GET /api/pagos/me/transferencia — datos de transferencia del club (alias + titular) SOLO para
// jugadores logueados. NO están en la respuesta pública de la landing (son privados del club).
router.get('/me/transferencia', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({ where: { id: req.user.clubId }, select: { config: true } })
    const cfg = club?.config || {}
    res.json({ alias: cfg.aliasTransferencia || '', titular: cfg.titularTransferencia || '' })
  } catch (err) {
    console.error('[me transferencia]', err)
    res.status(500).json({ error: 'error', message: 'No se pudieron obtener los datos de transferencia' })
  }
})

// POST /api/pagos/me/aviso-transferencia — el JUGADOR avisa que ya transfirió → crea un
// AvisoTransferencia en estado "en_revision". NO salda nada (lo confirma el club, o el
// auto-saldar con IA). Notifica al dueño. jugadorId del token.
router.post('/me/aviso-transferencia', requireAuth, requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const deudas = await deudasDelJugador(clubId, jugadorId)
    if (deudas.length === 0) return res.status(409).json({ error: 'sin_deuda', message: 'No tenés pagos pendientes.' })
    // No duplicar: un aviso en revisión a la vez por jugador.
    const yaHay = await prisma.avisoTransferencia.findFirst({ where: { clubId, jugadorId, estado: 'en_revision' } })
    if (yaHay) return res.status(409).json({ error: 'ya_en_revision', message: 'Ya tenés un aviso de transferencia en revisión.' })
    const [cargos, turnos, jug] = await Promise.all([
      prisma.cargo.findMany({ where: { jugadorId, clubId, estado: 'pendiente', comandaId: null }, select: { monto: true, saldoPagado: true } }),
      turnosImpagosDeuda(clubId, { jugadorId }),
      prisma.jugador.findUnique({ where: { id: jugadorId }, select: { nombre: true, apellido: true } }),
    ])
    const saldo = cargos.reduce((s, c) => s + (c.monto - (c.saldoPagado || 0)), 0) + turnos.reduce((s, t) => s + (t.monto || 0), 0)
    if (saldo <= 0) return res.status(409).json({ error: 'sin_deuda', message: 'No tenés pagos pendientes.' })
    const aviso = await prisma.avisoTransferencia.create({ data: { clubId, jugadorId, items: deudas, montoDeclarado: saldo } })
    await prisma.notificacion.create({
      data: { clubId, tipo: 'aviso_transferencia', data: { jugadorId, jugadorNombre: jug ? `${jug.nombre} ${jug.apellido}`.trim() : '', monto: saldo, avisoId: aviso.id } },
    })
    res.json({ ok: true, avisoId: aviso.id })
  } catch (err) {
    console.error('[aviso-transferencia]', err)
    res.status(500).json({ error: 'error', message: 'No se pudo enviar el aviso' })
  }
})

// GET /api/pagos/me/avisos-transferencia — avisos EN REVISIÓN del jugador (para mostrar sus
// deudas "en revisión" en Mi consumo). jugadorId del token.
router.get('/me/avisos-transferencia', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const avisos = await prisma.avisoTransferencia.findMany({
      where: { clubId: req.user.clubId, jugadorId: req.user.id, estado: 'en_revision' },
      orderBy: { createdAt: 'desc' },
    })
    res.json(avisos.map((a) => ({ id: a.id, monto: a.montoDeclarado, items: a.items, createdAt: a.createdAt })))
  } catch (err) {
    console.error('[me avisos-transferencia]', err)
    res.status(500).json({ error: 'error' })
  }
})

// POST /api/pagos/avisos-transferencia/:id/confirmar — el ADMIN confirma que la transferencia
// entró → salda las deudas del aviso con método 'transferencia' y avisa al jugador.
router.post('/avisos-transferencia/:id/confirmar', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  try {
    const aviso = await prisma.avisoTransferencia.findUnique({ where: { id } })
    if (!aviso || aviso.clubId !== clubId) return res.status(404).json({ error: 'no_encontrado', message: 'Aviso no encontrado' })
    if (aviso.estado !== 'en_revision') return res.status(409).json({ error: 'ya_resuelto', message: 'Ese aviso ya fue resuelto.' })
    const items = Array.isArray(aviso.items) ? aviso.items : []
    const imp = await runSerializable(async (tx) => {
      const fresco = await tx.avisoTransferencia.findUnique({ where: { id }, select: { estado: true } })
      if (fresco?.estado !== 'en_revision') return null // otra confirmación ganó
      const impu = await imputarPagoTx(tx, { clubId, jugadorId: aviso.jugadorId, items, monto: aviso.montoDeclarado, lineas: [{ metodo: 'transferencia', monto: aviso.montoDeclarado }] })
      await tx.avisoTransferencia.update({ where: { id }, data: { estado: 'aprobado', resueltoAt: new Date(), pagoId: impu.pagoId } })
      return impu
    })
    // Aviso al JUGADOR: pago confirmado.
    await prisma.notificacion.create({ data: { clubId, jugadorId: aviso.jugadorId, tipo: 'transferencia_confirmada', data: { monto: imp?.imputado ?? aviso.montoDeclarado } } }).catch(() => {})
    res.json({ ok: true, imputado: imp?.imputado ?? 0 })
  } catch (err) {
    console.error('[aviso confirmar]', err)
    res.status(500).json({ error: 'error', message: 'No se pudo confirmar' })
  }
})

// POST /api/pagos/avisos-transferencia/:id/rechazar — el ADMIN rechaza el aviso (no entró la
// plata / comprobante inválido). No salda nada. Avisa al jugador.
router.post('/avisos-transferencia/:id/rechazar', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { id } = req.params
  try {
    const aviso = await prisma.avisoTransferencia.findUnique({ where: { id } })
    if (!aviso || aviso.clubId !== clubId) return res.status(404).json({ error: 'no_encontrado', message: 'Aviso no encontrado' })
    if (aviso.estado !== 'en_revision') return res.status(409).json({ error: 'ya_resuelto', message: 'Ese aviso ya fue resuelto.' })
    await prisma.avisoTransferencia.update({ where: { id }, data: { estado: 'rechazado', resueltoAt: new Date() } })
    await prisma.notificacion.create({ data: { clubId, jugadorId: aviso.jugadorId, tipo: 'transferencia_rechazada', data: { monto: aviso.montoDeclarado } } }).catch(() => {})
    res.json({ ok: true })
  } catch (err) {
    console.error('[aviso rechazar]', err)
    res.status(500).json({ error: 'error', message: 'No se pudo rechazar' })
  }
})

// GET /api/pagos/me/links-vivos — links de MP activos que cubren deudas del JUGADOR (para que
// los vea en "Mi consumo" y los pague sin depender del admin). jugadorId del token.
router.get('/me/links-vivos', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const deudas = await deudasDelJugador(req.user.clubId, req.user.id)
    const { links } = await linksVivosDeDeudas(req.user.clubId, deudas)
    res.json(links)
  } catch (err) {
    console.error('[me links-vivos]', err)
    res.status(500).json({ error: 'error', message: 'No se pudieron obtener los pagos en proceso' })
  }
})

// POST /api/pagos/me/link-pago — el JUGADOR genera un link para pagar lo que le falta.
// SEGURIDAD: jugadorId del token (req.user.id), NUNCA del body → solo paga sus deudas.
// EXCLUYE lo que ya está en un link vivo (esos los paga desde el cartel) → nunca solapa/duplica.
router.post('/me/link-pago', requireAuth, requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id // ← del token, jamás del navegador
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'El club no tiene Mercado Pago configurado todavía.' })
  try {
    const deudas = await deudasDelJugador(clubId, jugadorId)
    if (deudas.length === 0) return res.status(409).json({ error: 'sin_deuda', message: 'No tenés pagos pendientes.' })
    // Excluir las deudas que YA tienen un link vivo (se pagan desde el cartel "Pago en proceso").
    const { cubiertas } = await linksVivosDeDeudas(clubId, deudas)
    const pendientes = deudas.filter((d) => !cubiertas.has(`${d.origen}:${d.refId}`))
    if (pendientes.length === 0) return res.status(409).json({ error: 'ya_en_proceso', message: 'Ya tenés un pago en proceso por todo tu saldo. Pagalo desde arriba.' })
    const out = pendientes.length === 1
      ? await crearLinkPagoDeuda({ clubId, origen: pendientes[0].origen, refId: pendientes[0].refId })
      : await crearLinkPagoMultiple({ clubId, jugadorId, deudas: pendientes })
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
