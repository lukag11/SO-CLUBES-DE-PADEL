import prisma from './prisma.js'
import { crearPreferencia } from './mercadopago.js'

const err = (status, error, message) => Object.assign(new Error(message), { status, error })

const backendBase = () => process.env.PUBLIC_BACKEND_URL || 'https://so-clubes-de-padel-production.up.railway.app'
const frontBase = () => (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.startsWith('https'))
  ? process.env.APP_PUBLIC_URL : 'https://padelwiarkdemo.vercel.app'

// Lee UNA deuda (cargo o reserva/turno) y devuelve su restante real, concepto y jugador dueño.
// Fuente única para el link single y el multi. Lanza err(4xx) si no existe / ya está saldada.
export async function _resolverDeuda(clubId, origen, refId) {
  if (origen === 'cargo') {
    const c = await prisma.cargo.findFirst({ where: { id: refId, clubId }, select: { concepto: true, monto: true, saldoPagado: true, estado: true, jugadorId: true } })
    if (!c) throw err(404, 'no_encontrado', 'Deuda no encontrada')
    if (c.estado !== 'pendiente') throw err(409, 'sin_deuda', 'Esa deuda no está pendiente.')
    const restante = c.monto - (c.saldoPagado || 0)
    if (restante <= 0) throw err(409, 'sin_deuda', 'Esa deuda ya está saldada.')
    return { restante, concepto: c.concepto || 'Deuda', jugadorId: c.jugadorId || null }
  }
  if (origen === 'reserva') {
    const r = await prisma.reserva.findFirst({ where: { id: refId, clubId }, select: { precio: true, saldoPagado: true, pagado: true, fecha: true, horaInicio: true, jugadorId: true } })
    if (!r) throw err(404, 'no_encontrado', 'Turno no encontrado')
    if (r.pagado) throw err(409, 'sin_deuda', 'Ese turno ya está pagado.')
    const restante = (r.precio || 0) - (r.saldoPagado || 0)
    if (restante <= 0) throw err(409, 'sin_deuda', 'Ese turno ya está saldado.')
    return { restante, concepto: `Turno ${r.fecha}${r.horaInicio ? ' ' + r.horaInicio : ''}`, jugadorId: r.jugadorId || null }
  }
  throw err(400, 'origen_invalido', 'Tipo de deuda inválido')
}

// Links de MP VIVOS del club (iniciado/pending, no vencidos), con sus deudas normalizadas
// a claves 'origen:refId'. Base para reusar el idéntico y bloquear el que se solapa (RN-77).
async function _linksVivos(clubId) {
  const rows = await prisma.pagoMP.findMany({
    where: { clubId, tipo: 'checkout', status: { in: ['iniciado', 'pending'] }, initPoint: { not: null }, OR: [{ expiraAt: null }, { expiraAt: { gt: new Date() } }] },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    row: r,
    claves: new Set((r.origen === 'multi' ? (Array.isArray(r.items) ? r.items : []) : [{ origen: r.origen, refId: r.refId }]).map((i) => `${i.origen}:${i.refId}`)),
  }))
}
const _mismoSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k))

// Cancela los links de MP VIVOS que cubren alguna de estas deudas. Se usa cuando la deuda se
// cobró por OTRO medio (efectivo/transferencia/etc.): el link quedaría fantasma y con monto
// viejo, y si el jugador igual lo paga entra un sobrepago. Cleanup best-effort (no crítico).
export async function cancelarLinksDeItems(clubId, items, motivo = 'cobrado_por_otro_medio') {
  const claves = new Set((items || []).map((i) => `${i.origen}:${i.refId}`))
  if (claves.size === 0) return 0
  const vivos = await _linksVivos(clubId)
  const aCancelar = vivos.filter((v) => [...v.claves].some((k) => claves.has(k)))
  for (const v of aCancelar) {
    await prisma.pagoMP.update({ where: { id: v.row.id }, data: { status: 'cancelled', statusDetail: motivo } }).catch(() => {})
  }
  return aCancelar.length
}

// Dado un conjunto de deudas (`[{origen,refId}]`), devuelve los links de MP VIVOS que cubren
// alguna de ellas (para MOSTRÁRSELOS al jugador y que las pague) + el set de claves ya cubiertas
// (para no re-linkearlas y evitar solapes/doble-cobro). Usado por el flujo self-service del jugador.
export async function linksVivosDeDeudas(clubId, deudas) {
  const claves = new Set((deudas || []).map((d) => `${d.origen}:${d.refId}`))
  if (claves.size === 0) return { links: [], cubiertas: new Set() }
  const vivos = await _linksVivos(clubId)
  const relevantes = vivos.filter((v) => [...v.claves].some((k) => claves.has(k)))
  const cubiertas = new Set()
  for (const v of relevantes) for (const k of v.claves) if (claves.has(k)) cubiertas.add(k)
  const links = relevantes.map((v) => ({
    id: v.row.id, initPoint: v.row.initPoint, monto: v.row.montoEsperado,
    expiraAt: v.row.expiraAt, createdAt: v.row.createdAt,
  }))
  return { links, cubiertas }
}

// RN-77 (anti doble-cobro): dado el set de deudas de un link nuevo, si ya hay un link vivo
// que cubre EXACTAMENTE ese set → lo reusa (devuelve). Si hay uno que se SOLAPA (comparte al
// menos una deuda) → bloquea (hay que reenviar ese o cancelarlo). Si no toca ninguno → null.
async function _reusarOChocar(clubId, clavesReq, concepto) {
  const vivos = await _linksVivos(clubId)
  const exacto = vivos.find((v) => _mismoSet(v.claves, clavesReq))
  if (exacto) return { reuse: { initPoint: exacto.row.initPoint, pagoMpId: exacto.row.id, expiraAt: exacto.row.expiraAt, reusado: true, monto: exacto.row.montoEsperado, concepto } }
  const solapa = vivos.find((v) => [...clavesReq].some((k) => v.claves.has(k)))
  if (solapa) throw err(409, 'link_vivo', 'Algunas de estas deudas ya tienen un link de pago activo. Reenviá ese link (Copiar/WhatsApp) o cancelalo antes de generar otro.')
  return { reuse: null }
}

// Genera un link de pago de Mercado Pago para UNA deuda (cargo o reserva/turno).
// Crea el PagoMP (fuente de verdad) + la preferencia de Checkout Pro. Reusa el link idéntico
// vivo y bloquea si la deuda ya está en otro link vivo (RN-77). Expira a 7 días (RN-76). La
// acreditación real ocurre por el webhook. Devuelve { initPoint, pagoMpId, expiraAt, reusado? }.
export async function crearLinkPagoDeuda({ clubId, origen, refId }) {
  const { restante, concepto, jugadorId } = await _resolverDeuda(clubId, origen, refId)

  const clavesReq = new Set([`${origen}:${refId}`])
  const { reuse } = await _reusarOChocar(clubId, clavesReq, concepto)
  if (reuse) return reuse

  const expiraAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días (RN-76)
  const pagoMP = await prisma.pagoMP.create({ data: { clubId, origen, refId, jugadorId, montoEsperado: restante, status: 'iniciado', expiraAt } })

  let pref
  try {
    pref = await crearPreferencia(clubId, {
      titulo: concepto,
      monto: restante,
      externalReference: pagoMP.id,
      notificationUrl: `${backendBase()}/api/webhooks/mercadopago/${clubId}`,
      backUrls: { success: `${frontBase()}/`, failure: `${frontBase()}/`, pending: `${frontBase()}/` },
      expiraAt,
    })
  } catch (e) {
    await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { status: 'error', statusDetail: String(e.message).slice(0, 200) } }).catch(() => {})
    throw e
  }
  const upd = await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { preferenceId: pref.id, initPoint: pref.initPoint } })
  return { initPoint: upd.initPoint, pagoMpId: upd.id, expiraAt: upd.expiraAt, monto: restante, concepto }
}

// Genera UN link que cubre VARIAS deudas del MISMO jugador (Opción A). Suma los restantes,
// crea un PagoMP 'multi' (con la lista en `items`) y una sola preferencia por el total. Al
// acreditar, el webhook imputa FIFO a todas (imputarPagoTx). Reusa un link 'multi' vivo solo
// si cubre EXACTAMENTE el mismo set de deudas (RN-77). Devuelve { initPoint, pagoMpId, ... }.
export async function crearLinkPagoMultiple({ clubId, jugadorId = null, deudas }) {
  if (!Array.isArray(deudas) || deudas.length === 0) throw err(400, 'datos_incompletos', 'No hay deudas para cobrar.')

  // Resolver cada deuda (restante real). Con jugador → exigir que TODAS sean de ese jugador.
  // Sin jugador (mostrador) → todas deben ser de mostrador también (sin ficha).
  let total = 0
  const items = []
  for (const d of deudas) {
    if (!d || !['cargo', 'reserva'].includes(d.origen) || !d.refId) throw err(400, 'origen_invalido', 'Hay una deuda inválida en la lista.')
    const info = await _resolverDeuda(clubId, d.origen, d.refId)
    if (jugadorId ? (info.jugadorId && info.jugadorId !== jugadorId) : !!info.jugadorId) throw err(409, 'jugador_mixto', 'Todas las deudas del link deben ser del mismo jugador.')
    total += info.restante
    items.push({ origen: d.origen, refId: d.refId })
  }
  if (total <= 0) throw err(409, 'sin_deuda', 'No hay saldo pendiente para cobrar.')

  const concepto = `${items.length} deudas`

  // Reusar el link idéntico vivo; bloquear si alguna deuda ya está en otro link vivo (RN-77).
  const clavesReq = new Set(items.map((i) => `${i.origen}:${i.refId}`))
  const { reuse } = await _reusarOChocar(clubId, clavesReq, concepto)
  if (reuse) return reuse

  const expiraAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días (RN-76)
  // refId (columna no-null): el jugador si hay, si no un ancla (primer cargo). El reuso/choque
  // se resuelve por `items` (no por refId), así que el ancla no afecta la lógica.
  const pagoMP = await prisma.pagoMP.create({ data: { clubId, origen: 'multi', refId: jugadorId || items[0].refId, jugadorId, items, montoEsperado: total, status: 'iniciado', expiraAt } })

  let pref
  try {
    pref = await crearPreferencia(clubId, {
      titulo: concepto,
      monto: total,
      externalReference: pagoMP.id,
      notificationUrl: `${backendBase()}/api/webhooks/mercadopago/${clubId}`,
      backUrls: { success: `${frontBase()}/`, failure: `${frontBase()}/`, pending: `${frontBase()}/` },
      expiraAt,
    })
  } catch (e) {
    await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { status: 'error', statusDetail: String(e.message).slice(0, 200) } }).catch(() => {})
    throw e
  }
  const upd = await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { preferenceId: pref.id, initPoint: pref.initPoint } })
  return { initPoint: upd.initPoint, pagoMpId: upd.id, expiraAt: upd.expiraAt, monto: total, concepto }
}

// Genera un link/QR de MP para una MESA (comanda) abierta. Suma sus consumos pendientes y crea
// un PagoMP `origen='comanda'` (refId=comandaId). La mesa queda ABIERTA hasta que el webhook
// confirma el pago → ahí se cierra (marca cargos pagados + comanda cerrada). Reusa/bloquea (RN-77).
export async function crearLinkPagoComanda({ clubId, comandaId }) {
  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, clubId },
    select: { id: true, estado: true, cargos: { where: { estado: 'pendiente' }, select: { monto: true } } },
  })
  if (!comanda) throw err(404, 'no_encontrado', 'Mesa no encontrada')
  if (comanda.estado !== 'abierta') throw err(409, 'sin_deuda', 'La mesa ya está cerrada.')
  const total = comanda.cargos.reduce((s, c) => s + (c.monto || 0), 0)
  if (total <= 0) throw err(409, 'sin_deuda', 'La mesa no tiene consumos.')

  const { reuse } = await _reusarOChocar(clubId, new Set([`comanda:${comandaId}`]), 'Mesa')
  if (reuse) return reuse

  const expiraAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días (RN-76)
  const pagoMP = await prisma.pagoMP.create({ data: { clubId, origen: 'comanda', refId: comandaId, montoEsperado: total, status: 'iniciado', expiraAt } })

  let pref
  try {
    pref = await crearPreferencia(clubId, {
      titulo: 'Mesa',
      monto: total,
      externalReference: pagoMP.id,
      notificationUrl: `${backendBase()}/api/webhooks/mercadopago/${clubId}`,
      backUrls: { success: `${frontBase()}/`, failure: `${frontBase()}/`, pending: `${frontBase()}/` },
      expiraAt,
    })
  } catch (e) {
    await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { status: 'error', statusDetail: String(e.message).slice(0, 200) } }).catch(() => {})
    throw e
  }
  const upd = await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { preferenceId: pref.id, initPoint: pref.initPoint } })
  return { initPoint: upd.initPoint, pagoMpId: upd.id, expiraAt: upd.expiraAt, monto: total, concepto: 'Mesa' }
}
