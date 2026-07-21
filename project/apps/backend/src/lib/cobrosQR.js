// ── QR de billetera interoperable (Transferencias 3.0) ────────────────────────
// Caja (POS) en la cuenta MP del club → QR que se paga con CUALQUIER billetera
// (MODO, Ualá, banco, MP…), no solo Mercado Pago. Distinto de Checkout Pro
// (lib/cobrosMP.js), que manda al sitio de MP. Ver project_qr_billetera_interoperable.
//
// S1: asegurar la caja del club (crear 1 vez, idempotente, y persistir el posId).
import prisma from './prisma.js'
import { resolveMpToken } from './mercadopago.js'
import { _resolverDeuda } from './cobrosMP.js'

const MP = 'https://api.mercadopago.com'
const err = (status, error, message) => Object.assign(new Error(message), { status, error })
const backendBase = () => process.env.PUBLIC_BACKEND_URL || 'https://so-clubes-de-padel-production.up.railway.app'

async function mpFetch(token, method, path, body) {
  const r = await fetch(MP + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  let data = null
  try { data = await r.json() } catch { /* sin body */ }
  return { ok: r.ok, status: r.status, data }
}

// external_id determinístico por club → hace la creación idempotente. MP EXIGE alfanumérico
// puro (sin guiones), así que limpiamos el cuid (que ya es alfanumérico, pero por las dudas).
const soloAlnum = (s) => String(s || '').replace(/[^a-zA-Z0-9]/g, '')
const storeExtId = (clubId) => `padelwiarkstore${soloAlnum(clubId)}`
const posExtId = (clubId) => `padelwiarkpos${soloAlnum(clubId)}`

// La ubicación de la sucursal es metadata administrativa (NO se le muestra al que paga el QR).
// MP valida `state_name` contra su lista exacta (con tilde). Default seguro; se puede refinar
// con la provincia real del club a futuro sin romper nada.
const LOCATION_DEFAULT = { city_name: 'Córdoba', state_name: 'Córdoba', latitude: -31.42, longitude: -64.18 }

// OJO: la búsqueda de MP NO filtra siempre server-side por external_id (a veces devuelve
// TODAS las sucursales/cajas). Hay que matchear EXACTO client-side y NUNCA caer a results[0]
// (agarraría otra store/caja y desincronizaría el external_store_id → non_existent_external_store_id).
async function buscarStorePorExtId(token, userId, extId) {
  const r = await mpFetch(token, 'GET', `/users/${userId}/stores/search?external_id=${encodeURIComponent(extId)}`)
  const found = r.data?.results?.find?.((s) => s.external_id === extId)
  return found?.id || null
}

async function buscarPosPorExtId(token, extId) {
  const r = await mpFetch(token, 'GET', `/pos/search?external_id=${encodeURIComponent(extId)}`)
  const found = r.data?.results?.find?.((p) => p.external_id === extId)
  return found || null
}

// Asegura (crea si no existe, reusa si ya existe) la SUCURSAL + CAJA QR del club.
// Idempotente: guarda qrStoreId/qrPosId/qrPosExternalId/qrImage en MpConexion y en llamadas
// siguientes devuelve lo guardado sin pegarle a MP. Devuelve { storeId, posId, posExternalId, qrImage, creada }.
export async function asegurarCajaQR(clubId) {
  const con = await prisma.mpConexion.findUnique({ where: { clubId } })
  if (!con || con.estado !== 'conectado') throw err(503, 'mp_no_conectado', 'El club no tiene Mercado Pago conectado.')

  // Fast path: ya tiene la caja guardada.
  if (con.qrPosId && con.qrPosExternalId) {
    return { storeId: con.qrStoreId, posId: con.qrPosId, posExternalId: con.qrPosExternalId, qrImage: con.qrImage, creada: false }
  }

  const token = await resolveMpToken(clubId)
  if (!token) throw err(503, 'mp_no_configurado', 'No se pudo resolver el token de MP del club.')

  const me = await mpFetch(token, 'GET', '/users/me')
  const userId = me.data?.id
  if (!userId) throw err(502, 'mp_error', 'No se pudo leer la cuenta de MP del club.')

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
  const nombre = club?.nombre || 'Club'
  const extStore = storeExtId(clubId)
  const extPos = posExtId(clubId)

  // 1) SUCURSAL (store) — buscar, si no existe crear.
  let storeId = await buscarStorePorExtId(token, userId, extStore)
  if (!storeId) {
    const body = {
      name: `${nombre} — PadelwIArk`.slice(0, 60),
      external_id: extStore,
      location: { street_number: '0', street_name: nombre.slice(0, 60), reference: 'Cobros QR', ...LOCATION_DEFAULT },
    }
    const r = await mpFetch(token, 'POST', `/users/${userId}/stores`, body)
    if (r.ok) storeId = r.data?.id
    else if (r.status === 400) storeId = await buscarStorePorExtId(token, userId, extStore) // ya existía (carrera)
    if (!storeId) throw err(502, 'mp_store_error', `No se pudo crear la sucursal en MP: ${JSON.stringify(r.data)}`)
  }

  // 2) CAJA (POS) — buscar, si no existe crear. SIN category = rubro genérico (clave del spike).
  let pos = await buscarPosPorExtId(token, extPos)
  if (!pos) {
    const body = { name: `Caja QR ${nombre}`.slice(0, 50), fixed_amount: true, store_id: storeId, external_store_id: extStore, external_id: extPos }
    const r = await mpFetch(token, 'POST', '/pos', body)
    if (r.ok) pos = r.data
    else if (r.status === 400) pos = await buscarPosPorExtId(token, extPos) // ya existía (carrera)
    if (!pos) throw err(502, 'mp_pos_error', `No se pudo crear la caja en MP: ${JSON.stringify(r.data)}`)
  }

  const qrImage = pos?.qr?.image || null
  await prisma.mpConexion.update({
    where: { clubId },
    data: { qrStoreId: String(storeId), qrPosId: String(pos.id), qrPosExternalId: extPos, qrImage },
  })
  return { storeId: String(storeId), posId: String(pos.id), posExternalId: extPos, qrImage, creada: true }
}

// S2 — "ponerle el monto a la caja". Crea una ORDEN dinámica sobre el POS del club con el
// total de la(s) deuda(s). El jugador escanea el QR de la caja (el `qrImage`) con CUALQUIER
// billetera y paga ese importe. Registra un PagoMP tipo='qr' (misma cañería de idempotencia /
// webhook que Checkout Pro). La acreditación real ocurre por el webhook (S4). Devuelve
// { pagoMpId, qrImage, monto, concepto }. Soporta 1 deuda o varias del mismo jugador (multi).
export async function crearOrdenQR({ clubId, jugadorId = null, deudas }) {
  if (!Array.isArray(deudas) || deudas.length === 0) throw err(400, 'datos_incompletos', 'No hay deudas para cobrar.')

  // Asegurar la caja + tener el user_id de MP (para la URL de la orden).
  const caja = await asegurarCajaQR(clubId)
  const con = await prisma.mpConexion.findUnique({ where: { clubId }, select: { mpUserId: true } })
  const userId = con?.mpUserId
  if (!userId || !caja.posExternalId) throw err(502, 'mp_error', 'No se pudo resolver la caja QR del club.')

  // Resolver cada deuda (restante real). Todas deben ser del mismo jugador (o todas mostrador).
  let total = 0
  const items = []
  let conceptoUnico = 'Deuda'
  for (const d of deudas) {
    if (!d || !['cargo', 'reserva'].includes(d.origen) || !d.refId) throw err(400, 'origen_invalido', 'Hay una deuda inválida en la lista.')
    const info = await _resolverDeuda(clubId, d.origen, d.refId)
    if (jugadorId ? (info.jugadorId && info.jugadorId !== jugadorId) : !!info.jugadorId) throw err(409, 'jugador_mixto', 'Todas las deudas del QR deben ser del mismo jugador.')
    total += info.restante
    conceptoUnico = info.concepto
    items.push({ origen: d.origen, refId: d.refId })
  }
  if (total <= 0) throw err(409, 'sin_deuda', 'No hay saldo pendiente para cobrar.')

  const esMulti = items.length > 1
  const concepto = esMulti ? `${items.length} deudas` : conceptoUnico
  const expiraAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // ventana de cobro (tracking interno)

  const pagoMP = await prisma.pagoMP.create({
    data: {
      clubId, tipo: 'qr', origen: esMulti ? 'multi' : items[0].origen,
      refId: esMulti ? (jugadorId || items[0].refId) : items[0].refId,
      jugadorId, items: esMulti ? items : undefined,
      montoEsperado: total, status: 'iniciado', qrPosExtId: caja.posExternalId, expiraAt,
    },
  })

  // Cargar la orden en la caja: el QR de la caja queda armado para cobrar `total`.
  const token = await resolveMpToken(clubId)
  const body = {
    external_reference: pagoMP.id,
    title: concepto,
    description: concepto,
    notification_url: `${backendBase()}/api/webhooks/mercadopago/${clubId}`,
    total_amount: total,
    items: [{ title: concepto, unit_price: total, quantity: 1, unit_measure: 'unit', total_amount: total }],
  }
  const r = await mpFetch(token, 'PUT', `/instore/qr/seller/collectors/${userId}/pos/${caja.posExternalId}/orders`, body)
  if (!r.ok) {
    await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { status: 'error', statusDetail: JSON.stringify(r.data).slice(0, 200) } }).catch(() => {})
    throw err(502, 'mp_orden_error', `No se pudo crear la orden QR en MP: ${JSON.stringify(r.data)}`)
  }

  // La caja tiene UNA sola orden viva a la vez: el PUT recién hecho reemplazó cualquier orden
  // anterior en el POS. Reflejamos eso en la base marcando las órdenes QR vivas previas del club
  // como 'cancelled' (quedaron obsoletas). Así no hay dos "esperando pago" apuntando al mismo QR.
  await prisma.pagoMP.updateMany({
    where: { clubId, tipo: 'qr', status: { in: ['iniciado', 'pending'] }, id: { not: pagoMP.id } },
    data: { status: 'cancelled', statusDetail: 'reemplazada_por_nueva_orden' },
  }).catch(() => {})

  const upd = await prisma.pagoMP.update({ where: { id: pagoMP.id }, data: { initPoint: caja.qrImage } })
  return { pagoMpId: upd.id, qrImage: caja.qrImage, monto: total, concepto, expiraAt: upd.expiraAt }
}

// Borra la orden pendiente que esté cargada en el POS del club (best-effort). Libera el QR:
// después de esto, escanear la caja no cobra nada hasta que se cargue una orden nueva.
async function _borrarOrdenEnPOS(clubId) {
  const con = await prisma.mpConexion.findUnique({ where: { clubId }, select: { mpUserId: true, qrPosExternalId: true } })
  if (!con?.mpUserId || !con?.qrPosExternalId) return
  const token = await resolveMpToken(clubId)
  if (!token) return
  await mpFetch(token, 'DELETE', `/instore/qr/seller/collectors/${con.mpUserId}/pos/${con.qrPosExternalId}/orders`).catch(() => {})
}

const _clavesDe = (pm) => new Set(
  (pm.origen === 'multi' ? (Array.isArray(pm.items) ? pm.items : []) : [{ origen: pm.origen, refId: pm.refId }])
    .map((i) => `${i.origen}:${i.refId}`)
)

// Cancela UNA orden QR viva por id (el admin abandona el QR o va a cobrar de otra forma).
// Borra la orden del POS + marca el PagoMP 'cancelled'. Idempotente.
export async function cancelarOrdenQR(clubId, pagoMpId) {
  const pm = await prisma.pagoMP.findFirst({ where: { id: pagoMpId, clubId, tipo: 'qr' } })
  if (!pm) throw err(404, 'no_encontrado', 'Orden QR no encontrada.')
  if (['iniciado', 'pending'].includes(pm.status)) {
    await _borrarOrdenEnPOS(clubId)
    await prisma.pagoMP.update({ where: { id: pm.id }, data: { status: 'cancelled', statusDetail: 'cancelada_admin' } })
  }
  return { ok: true }
}

// Cancela las órdenes QR VIVAS que cubren alguna de estas deudas. Se llama cuando la deuda se
// cobró por OTRO medio (efectivo/transferencia): si quedara la orden viva, un escaneo tardío
// cobraría de más. Espejo de `cancelarLinksDeItems` de Checkout Pro. Best-effort.
export async function cancelarOrdenesQRDeItems(clubId, items) {
  const claves = new Set((items || []).map((i) => `${i.origen}:${i.refId}`))
  if (claves.size === 0) return 0
  const vivas = await prisma.pagoMP.findMany({ where: { clubId, tipo: 'qr', status: { in: ['iniciado', 'pending'] } } })
  let n = 0
  for (const pm of vivas) {
    if ([..._clavesDe(pm)].some((k) => claves.has(k))) {
      await _borrarOrdenEnPOS(clubId)
      await prisma.pagoMP.update({ where: { id: pm.id }, data: { status: 'cancelled', statusDetail: 'cobrada_por_otro_medio' } }).catch(() => {})
      n++
    }
  }
  return n
}
