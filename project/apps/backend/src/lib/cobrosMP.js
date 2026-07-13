import prisma from './prisma.js'
import { crearPreferencia } from './mercadopago.js'

const err = (status, error, message) => Object.assign(new Error(message), { status, error })

// Genera un link de pago de Mercado Pago para UNA deuda (cargo o reserva/turno).
// Crea el PagoMP (fuente de verdad) + la preferencia de Checkout Pro. Reusa un link
// vivo si ya existe (RN-77) y lo hace expirar a los 7 días (RN-76). La acreditación
// real ocurre por el webhook. Devuelve { initPoint, pagoMpId, expiraAt, reusado? }.
export async function crearLinkPagoDeuda({ clubId, origen, refId }) {
  let restante, concepto
  if (origen === 'cargo') {
    const c = await prisma.cargo.findFirst({ where: { id: refId, clubId }, select: { concepto: true, monto: true, saldoPagado: true, estado: true } })
    if (!c) throw err(404, 'no_encontrado', 'Deuda no encontrada')
    if (c.estado !== 'pendiente') throw err(409, 'sin_deuda', 'Esa deuda no está pendiente.')
    restante = c.monto - (c.saldoPagado || 0)
    concepto = c.concepto || 'Deuda'
  } else if (origen === 'reserva') {
    const r = await prisma.reserva.findFirst({ where: { id: refId, clubId }, select: { precio: true, saldoPagado: true, pagado: true, fecha: true, horaInicio: true } })
    if (!r) throw err(404, 'no_encontrado', 'Turno no encontrado')
    if (r.pagado) throw err(409, 'sin_deuda', 'Ese turno ya está pagado.')
    restante = (r.precio || 0) - (r.saldoPagado || 0)
    concepto = `Turno ${r.fecha}${r.horaInicio ? ' ' + r.horaInicio : ''}`
  } else {
    throw err(400, 'origen_invalido', 'Tipo de deuda inválido')
  }
  if (restante <= 0) throw err(409, 'sin_deuda', 'Esa deuda ya está saldada.')

  // Reusar un link vivo (no generar duplicados). RN-77.
  const ahora = new Date()
  const vivo = await prisma.pagoMP.findFirst({
    where: { clubId, origen, refId, status: { in: ['iniciado', 'pending'] }, initPoint: { not: null }, OR: [{ expiraAt: null }, { expiraAt: { gt: ahora } }] },
    orderBy: { createdAt: 'desc' },
  })
  if (vivo) return { initPoint: vivo.initPoint, pagoMpId: vivo.id, expiraAt: vivo.expiraAt, reusado: true }

  const expiraAt = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 días (RN-76)
  const pagoMP = await prisma.pagoMP.create({ data: { clubId, origen, refId, montoEsperado: restante, status: 'iniciado', expiraAt } })

  const backendBase = process.env.PUBLIC_BACKEND_URL || 'https://so-clubes-de-padel-production.up.railway.app'
  const frontBase = (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.startsWith('https'))
    ? process.env.APP_PUBLIC_URL : 'https://padelwiarkdemo.vercel.app'
  let pref
  try {
    pref = await crearPreferencia(clubId, {
      titulo: concepto,
      monto: restante,
      externalReference: pagoMP.id,
      notificationUrl: `${backendBase}/api/webhooks/mercadopago`,
      backUrls: { success: `${frontBase}/`, failure: `${frontBase}/`, pending: `${frontBase}/` },
      expiraAt,
    })
  } catch (e) {
    await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { status: 'error', statusDetail: String(e.message).slice(0, 200) } }).catch(() => {})
    throw e
  }
  const upd = await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { preferenceId: pref.id, initPoint: pref.initPoint } })
  return { initPoint: upd.initPoint, pagoMpId: upd.id, expiraAt: upd.expiraAt }
}
