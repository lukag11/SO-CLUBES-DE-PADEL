import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { runSerializable } from '../lib/serializable.js'
import { imputarPagoTx, revertirPagoTx } from '../lib/pagos.js'
import { obtenerPago } from '../lib/mercadopago.js'

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

// Procesa el pago ya verificado contra la API de MP. Idempotente (RN-71). Corre las
// transiciones de plata en Serializable (anti doble-cobro, RN-72/75). Reversión en
// refund/contracargo (RN-74).
async function procesarPago(pagoMP, { paymentId, status, statusDetail, amount }) {
  const nuevo = mapStatus(status)

  if (nuevo === 'approved') {
    await runSerializable(async (tx) => {
      const actual = await tx.pagoMP.findUnique({ where: { id: pagoMP.id } })
      if (actual && actual.status === 'approved' && actual.pagoId) {
        // Ya acreditado → no-op. Si llega OTRO payment (doble pago del mismo link), avisar. RN-75.
        if (actual.mpPaymentId && actual.mpPaymentId !== paymentId) {
          console.warn(`[webhook mp] DOBLE PAGO: PagoMP ${pagoMP.id} ya acreditado con ${actual.mpPaymentId}; llega otro pago ${paymentId} ($${amount}) → revisar devolución. RN-75`)
        }
        return
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
    })
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

// Handler compartido. `clubIdPath` = club dueño del pago (viene en la URL, multi-tenant).
// Respondemos 200 rápido. NUNCA acreditamos por el body: re-consultamos el pago a la API
// CON EL TOKEN DEL CLUB (RN-70). R1: verificamos que el pago sea de ESE club (anti cross-tenant).
async function manejarWebhook(req, res, clubIdPath) {
  try {
    const topic = req.query.type || req.query.topic || req.body?.type || req.body?.topic
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
