import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { runSerializable } from '../lib/serializable.js'
import { imputarPagoTx, revertirPagoTx } from '../lib/pagos.js'
import { obtenerPago, obtenerMerchantOrder } from '../lib/mercadopago.js'

const router = Router()

// Mapea el status de MP a nuestro estado de PagoMP.
const mapStatus = (s) => {
  switch (s) {
    case 'approved': return 'approved'
    case 'pending':
    case 'in_process':
    case 'authorized': return 'pending'
    case 'refunded': return 'refunded'
    case 'charged_back': return 'charged_back'
    case 'cancelled':
    case 'rejected': return 'rejected'
    default: return 'pending'
  }
}

// Extrae el payment id de la notificación (viene por query o body, en varias formas).
const extractPaymentId = (req) => {
  const q = req.query || {}
  const b = req.body || {}
  return q['data.id'] || q.id || b?.data?.id || (b?.type === 'payment' ? b?.data?.id : null) || null
}

// Extrae el merchant_order id (aviso del QR de billetera). Llega como ?topic=merchant_order&id=…
// (IPN), o {type:'merchant_order',data:{id}} (webhook v2), o con `resource` = URL de la orden.
const extractMerchantOrderId = (req) => {
  const q = req.query || {}, b = req.body || {}
  const desdeResource = (r) => { const m = String(r || '').match(/merchant_orders\/(\d+)/); return m ? m[1] : null }
  return q.id || q['data.id'] || b?.data?.id || desdeResource(b?.resource) || desdeResource(q.resource) || null
}

// Valida la firma x-signature de MP (HMAC). Soft: si falla loguea pero NO bloquea,
// porque el candado real es la re-consulta a la API (RN-70). Solo corre si hay secret.
const firmaValida = (req, paymentId) => {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // no configurado → confiamos en la re-consulta
  try {
    const sig = req.headers['x-signature'] || ''
    const reqId = req.headers['x-request-id'] || ''
    const parts = Object.fromEntries(String(sig).split(',').map((p) => p.split('=').map((x) => x.trim())))
    const ts = parts.ts, v1 = parts.v1
    if (!ts || !v1) return false
    const manifest = `id:${String(paymentId).toLowerCase()};request-id:${reqId};ts:${ts};`
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1))
  } catch { return false }
}

// Avisa al DUEÑO del club (Notificacion con jugadorId/profesorId null = admin) que entró un
// pago por Mercado Pago. Best-effort: si falla, NO rompe el webhook (la plata ya se acreditó).
async function notificarPagoAdmin(clubId, { jugadorId = null, monto, count = 1, detalle = null }) {
  try {
    let jugadorNombre = null
    if (jugadorId) {
      const j = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { nombre: true, apellido: true } })
      if (j) jugadorNombre = `${j.nombre} ${j.apellido}`.trim()
    }
    await prisma.notificacion.create({ data: { clubId, tipo: 'pago_mp', data: { jugadorId, jugadorNombre, monto, count, detalle } } })
  } catch (e) {
    console.error('[webhook mp] no se pudo notificar al dueño:', e.message)
  }
}

// Procesa el pago ya verificado contra la API de MP. Idempotente (RN-71). Corre las
// transiciones de plata en Serializable (anti doble-cobro, RN-72/75). Reversión en
// refund/contracargo (RN-74).
async function procesarPago(pagoMP, { paymentId, status, statusDetail, amount }) {
  const nuevo = mapStatus(status)

  // Mesa (comanda): NO pasa por imputarPagoTx. Al acreditar, cierra la mesa (marca cargos
  // pagados + comanda cerrada), igual que el cierre por caja pero disparado por el webhook.
  if (pagoMP.origen === 'comanda') {
    if (nuevo === 'approved') {
      const creada = await runSerializable(async (tx) => {
        const actual = await tx.pagoMP.findUnique({ where: { id: pagoMP.id } })
        if (actual && actual.status === 'approved') return null // idempotente (RN-71)
        const now = new Date()
        await tx.cargo.updateMany({ where: { comandaId: pagoMP.refId, estado: 'pendiente' }, data: { estado: 'pagado', metodoPago: 'mercadopago', pagadoAt: now } })
        await tx.comanda.update({ where: { id: pagoMP.refId }, data: { estado: 'cerrada', closedAt: now } }).catch(() => {})
        await tx.pagoMP.update({ where: { id: pagoMP.id }, data: { mpPaymentId: paymentId, status: 'approved', statusDetail: statusDetail || null } })
        return true
      })
      if (creada) await notificarPagoAdmin(pagoMP.clubId, { monto: pagoMP.montoEsperado, detalle: 'Mesa' })
    } else if (nuevo === 'refunded' || nuevo === 'charged_back') {
      await runSerializable(async (tx) => {
        const now = new Date()
        await tx.cargo.updateMany({ where: { comandaId: pagoMP.refId, estado: 'pagado', metodoPago: 'mercadopago' }, data: { estado: 'pendiente', metodoPago: null, pagadoAt: null } })
        await tx.comanda.update({ where: { id: pagoMP.refId }, data: { estado: 'abierta', closedAt: null } }).catch(() => {})
        await tx.pagoMP.update({ where: { id: pagoMP.id }, data: { mpPaymentId: paymentId, status: nuevo, statusDetail: statusDetail || null } })
      })
      console.warn(`[webhook mp] ${nuevo.toUpperCase()} comanda ${pagoMP.refId} → mesa reabierta. RN-74`)
    } else {
      await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { mpPaymentId: paymentId, status: nuevo, statusDetail: statusDetail || null } })
    }
    return
  }

  if (nuevo === 'approved') {
    const resuImp = await runSerializable(async (tx) => {
      const actual = await tx.pagoMP.findUnique({ where: { id: pagoMP.id } })
      if (actual && actual.status === 'approved' && actual.pagoId) {
        // Ya acreditado → no-op. Si llega OTRO payment (doble pago del mismo link), avisar. RN-75.
        if (actual.mpPaymentId && actual.mpPaymentId !== paymentId) {
          console.warn(`[webhook mp] DOBLE PAGO: PagoMP ${pagoMP.id} ya acreditado con ${actual.mpPaymentId}; llega otro pago ${paymentId} ($${amount}) → revisar devolución. RN-75`)
        }
        return null
      }
      // jugadorId: preferimos el guardado en el PagoMP (links nuevos); si no está (links
      // viejos), lo derivamos del ítem. En 'multi' las deudas van en `items`.
      let jugadorId = pagoMP.jugadorId ?? null
      let items
      if (pagoMP.origen === 'multi') {
        items = Array.isArray(pagoMP.items) ? pagoMP.items : []
      } else {
        items = [{ origen: pagoMP.origen, refId: pagoMP.refId }]
        if (!jugadorId) {
          jugadorId = pagoMP.origen === 'reserva'
            ? (await tx.reserva.findUnique({ where: { id: pagoMP.refId }, select: { jugadorId: true } }))?.jugadorId ?? null
            : (await tx.cargo.findUnique({ where: { id: pagoMP.refId }, select: { jugadorId: true } }))?.jugadorId ?? null
        }
      }
      const impu = await imputarPagoTx(tx, {
        clubId: pagoMP.clubId,
        jugadorId,
        items,
        monto: amount,
        lineas: [{ metodo: 'mercadopago', monto: amount }],
      })
      const sobrepago = impu.excedente > 0 // parcial o total (RN-75)
      await tx.pagoMP.update({
        where: { id: pagoMP.id },
        data: {
          mpPaymentId: paymentId,
          status: 'approved',
          statusDetail: sobrepago ? `sobrepago $${impu.excedente} (deuda saldada): ${statusDetail || ''}`.slice(0, 200) : (statusDetail || null),
          pagoId: impu.pagoId,
        },
      })
      if (sobrepago) console.warn(`[webhook mp] SOBREPAGO $${impu.excedente}: PagoMP ${pagoMP.id} pago ${paymentId} (pagó $${amount}, imputado $${impu.imputado}) → revisar devolución. RN-75`)
      return { jugadorId, imputado: impu.imputado, count: items.length }
    })
    // Aviso al dueño (campanita). Solo si se acreditó recién (resuImp no null → no idempotente).
    if (resuImp) await notificarPagoAdmin(pagoMP.clubId, { jugadorId: resuImp.jugadorId, monto: resuImp.imputado, count: resuImp.count })
    return
  }

  if (nuevo === 'refunded' || nuevo === 'charged_back') {
    await runSerializable(async (tx) => {
      const actual = await tx.pagoMP.findUnique({ where: { id: pagoMP.id } })
      if (!actual) return
      if (actual.pagoId) {
        const pago = await tx.pago.findUnique({ where: { id: actual.pagoId }, select: { id: true, imputaciones: true, anuladoAt: true } })
        if (pago && !pago.anuladoAt) await revertirPagoTx(tx, pago) // reabre la deuda (RN-74)
      }
      await tx.pagoMP.update({ where: { id: pagoMP.id }, data: { mpPaymentId: paymentId, status: nuevo, statusDetail: statusDetail || null } })
    })
    console.warn(`[webhook mp] ${nuevo.toUpperCase()}: PagoMP ${pagoMP.id} pago ${paymentId} → deuda reabierta. RN-74`)
    return
  }

  // pending / rejected: solo actualizamos el estado del intento (sin tocar plata).
  await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { mpPaymentId: paymentId, status: nuevo, statusDetail: statusDetail || null } })
}

// Rama del QR de billetera: el aviso llega como topic 'merchant_order'. Re-consultamos la
// orden con el token del club (RN-70); trae external_reference (→ nuestro PagoMP) y la lista
// de payments. Elegimos el pago aprobado (si hay) y lo procesamos con el MISMO motor que
// Checkout Pro (procesarPago: idempotente, Serializable, notifica al dueño).
async function manejarMerchantOrder(req, res, clubIdPath) {
  const moId = extractMerchantOrderId(req)
  if (!moId) return res.status(200).json({ ignored: 'sin_merchant_order_id' })

  let mo
  try {
    mo = await obtenerMerchantOrder(clubIdPath || null, moId)
  } catch (e) {
    console.error('[webhook mp] no se pudo consultar merchant_order', moId, e.message)
    return res.status(500).json({ error: 'fetch_failed' }) // MP reintenta
  }

  const extRef = mo?.external_reference
  if (!extRef) return res.status(200).json({ ignored: 'sin_external_reference' })

  const pagoMP = await prisma.pagoMP.findUnique({ where: { id: extRef } })
  if (!pagoMP) return res.status(200).json({ ignored: 'pagomp_no_encontrado' })

  // R1 anti cross-tenant: la orden tiene que ser del club de la URL.
  if (clubIdPath && pagoMP.clubId !== clubIdPath) {
    console.warn(`[webhook mp] cross-tenant (order): pago del club ${pagoMP.clubId} llegó por la URL de ${clubIdPath} → ignorado`)
    return res.status(200).json({ ignored: 'cross_tenant' })
  }

  const pagos = Array.isArray(mo.payments) ? mo.payments : []
  const elegido = pagos.find((p) => p.status === 'approved') || pagos[pagos.length - 1]
  if (!elegido) return res.status(200).json({ ok: true, sin_pagos: true }) // orden creada, nadie pagó todavía

  // Idempotencia (RN-71): mismo pago + mismo estado ya persistido → no-op.
  if (pagoMP.mpPaymentId === String(elegido.id) && pagoMP.status === mapStatus(elegido.status)) {
    return res.status(200).json({ ok: true, idempotente: true })
  }

  await procesarPago(pagoMP, {
    paymentId: String(elegido.id),
    status: elegido.status,
    statusDetail: elegido.status_detail,
    amount: Math.round(elegido.transaction_amount || elegido.total_paid_amount || 0),
  })
  return res.status(200).json({ ok: true })
}

// Handler compartido. `clubIdPath` = club dueño del pago (viene en la URL, multi-tenant).
// Respondemos 200 rápido. NUNCA acreditamos por el body: re-consultamos el pago a la API
// CON EL TOKEN DEL CLUB (RN-70). R1: verificamos que el pago sea de ESE club (anti cross-tenant).
async function manejarWebhook(req, res, clubIdPath) {
  try {
    const topic = req.query.type || req.query.topic || req.body?.type || req.body?.topic

    // QR de billetera → merchant_order (trae los pagos adentro). Rama aparte.
    if (topic === 'merchant_order' || /merchant_orders\//.test(String(req.body?.resource || req.query?.resource || ''))) {
      return await manejarMerchantOrder(req, res, clubIdPath)
    }

    const paymentId = extractPaymentId(req)
    if (!paymentId || (topic && topic !== 'payment')) return res.status(200).json({ ignored: true })

    if (!firmaValida(req, paymentId)) {
      console.warn('[webhook mp] firma inválida para', paymentId, '(igual verificamos por API)')
    }

    // Re-consulta a la API de MP con el token del club de la URL (RN-70).
    let pago
    try {
      pago = await obtenerPago(clubIdPath || null, paymentId)
    } catch (e) {
      console.error('[webhook mp] no se pudo consultar el pago', paymentId, e.message)
      return res.status(500).json({ error: 'fetch_failed' }) // MP reintenta
    }

    const extRef = pago?.external_reference
    if (!extRef) return res.status(200).json({ ignored: 'sin_external_reference' })

    const pagoMP = await prisma.pagoMP.findUnique({ where: { id: extRef } })
    if (!pagoMP) return res.status(200).json({ ignored: 'pagomp_no_encontrado' })

    // R1: el pago tiene que ser del club de la URL. Si no coincide → ignorar (cross-tenant).
    if (clubIdPath && pagoMP.clubId !== clubIdPath) {
      console.warn(`[webhook mp] cross-tenant: pago del club ${pagoMP.clubId} llegó por la URL de ${clubIdPath} → ignorado`)
      return res.status(200).json({ ignored: 'cross_tenant' })
    }

    // Idempotencia (RN-71): mismo pago + mismo estado ya persistido → no-op.
    if (pagoMP.mpPaymentId === String(paymentId) && pagoMP.status === mapStatus(pago.status)) {
      return res.status(200).json({ ok: true, idempotente: true })
    }

    await procesarPago(pagoMP, {
      paymentId: String(paymentId),
      status: pago.status,
      statusDetail: pago.status_detail,
      amount: Math.round(pago.transaction_amount || 0),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook mp] error', err)
    return res.status(200).json({ ok: false }) // 200 para no gatillar retry infinito por bug propio
  }
}

// Ruta multi-tenant: el clubId viene en la URL (lo pone crearPreferencia por preferencia).
router.post('/mercadopago/:clubId', (req, res) => manejarWebhook(req, res, req.params.clubId))
// Ruta legacy (links viejos sin clubId): resuelve con el token de env.
router.post('/mercadopago', (req, res) => manejarWebhook(req, res, null))

export default router
