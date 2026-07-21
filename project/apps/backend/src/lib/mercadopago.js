import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import prisma from './prisma.js'
import { encryptToken, decryptToken } from './cripto.js'

// ── Resolución del access token del club ──────────────────────────────────────
// Usa la cuenta que el club conectó por OAuth (MpConexion, token CIFRADO); refresca si
// está por vencer. Fallback al token de env (transición/demo) si el club no conectó.
// El token NUNCA sale al frontend. Ver project_mp_oauth_diseno.
const REFRESH_ANTES_MS = 15 * 24 * 60 * 60 * 1000 // refrescar si vence en <15 días

// Un error del endpoint OAuth es PERMANENTE (el refresh_token ya no vale: el dueño revocó,
// credenciales mal) cuando MP responde invalid_grant o 400/401. Un 5xx / fallo de red es
// TRANSITORIO: no hay que desconectar al club por eso.
const esErrorPermanenteOAuth = (e) =>
  e?.mpError === 'invalid_grant' || e?.httpStatus === 400 || e?.httpStatus === 401

// Locks en memoria por clubId: si ya hay un refresh en vuelo para ese club, los demás
// callers esperan EL MISMO (coalescing) en vez de disparar otro refresh en paralelo. MP
// rota el refresh_token en cada uso, así que dos refreshes concurrentes se pisarían y el
// 2do fallaría con el token viejo. (Instancia única de Railway → un Map alcanza.)
const refrescosEnVuelo = new Map()

// Renueva el access_token de una conexión (con su refresh_token). Ante fallo PERMANENTE
// marca la conexión 'desconectado'; ante fallo TRANSITORIO cae al access_token vigente
// (sigue válido, faltan <15 días para vencer) para no cortarle el cobro a un club legítimo.
function refrescarConexion(con) {
  const enVuelo = refrescosEnVuelo.get(con.clubId)
  if (enVuelo) return enVuelo
  const p = _refrescarConexion(con).finally(() => refrescosEnVuelo.delete(con.clubId))
  refrescosEnVuelo.set(con.clubId, p)
  return p
}

async function _refrescarConexion(con) {
  try {
    const tok = await refrescarTokenOAuth(decryptToken(con.refreshTokenEnc))
    const expiresAt = new Date(Date.now() + (Number(tok.expires_in) || 15552000) * 1000)
    await prisma.mpConexion.update({
      where: { id: con.id },
      data: { accessTokenEnc: encryptToken(tok.access_token), refreshTokenEnc: encryptToken(tok.refresh_token), scope: tok.scope || con.scope, expiresAt },
    })
    return tok.access_token
  } catch (e) {
    if (esErrorPermanenteOAuth(e)) {
      await prisma.mpConexion.update({ where: { id: con.id }, data: { estado: 'desconectado', desconectadoMotivo: 'refresh_failed' } }).catch(() => {})
      return null
    }
    // Transitorio: seguí con el token actual (todavía válido). Se reintentará en el próximo cobro.
    try { return decryptToken(con.accessTokenEnc) } catch { return null }
  }
}

export async function resolveMpToken(clubId) {
  if (clubId) {
    const con = await prisma.mpConexion.findUnique({ where: { clubId } })
    if (con && con.estado === 'conectado') {
      if (con.expiresAt.getTime() < Date.now() + REFRESH_ANTES_MS) return await refrescarConexion(con)
      return decryptToken(con.accessTokenEnc)
    }
  }
  return process.env.MP_ACCESS_TOKEN || null // fallback transición (demo sin conectar / legacy)
}

export async function mpConfigurado(clubId) {
  return !!(await resolveMpToken(clubId))
}

async function clientFor(clubId) {
  const accessToken = await resolveMpToken(clubId)
  if (!accessToken) {
    throw Object.assign(new Error('Mercado Pago no está configurado en este club'), { status: 503, error: 'mp_no_configurado' })
  }
  return new MercadoPagoConfig({ accessToken })
}

// MP exige la fecha de expiración en ISO 8601 con offset. Usamos -03:00 (Argentina).
const mpFecha = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  const ar = new Date(date.getTime() - 3 * 60 * 60 * 1000) // a hora Argentina
  return `${ar.getUTCFullYear()}-${pad(ar.getUTCMonth() + 1)}-${pad(ar.getUTCDate())}T${pad(ar.getUTCHours())}:${pad(ar.getUTCMinutes())}:${pad(ar.getUTCSeconds())}.000-03:00`
}

// Crea una preferencia de Checkout Pro. Devuelve { id, initPoint }.
// `monto` en pesos (Int). `externalReference` = id del PagoMP (fuente de verdad).
// `binary_mode` = solo approved/rejected (sin 'pending' intermedios raros). RN-70/76.
export async function crearPreferencia(clubId, { titulo, monto, externalReference, notificationUrl, backUrls, expiraAt, payerEmail }) {
  const pref = new Preference(await clientFor(clubId))
  const body = {
    items: [{ id: externalReference, title: titulo, quantity: 1, unit_price: monto, currency_id: 'ARS' }],
    external_reference: externalReference,
    binary_mode: true,
    metadata: { external_reference: externalReference, club_id: clubId },
    ...(notificationUrl && { notification_url: notificationUrl }),
    ...(backUrls && { back_urls: backUrls }),
    ...(payerEmail && { payer: { email: payerEmail } }),
    ...(expiraAt && { expires: true, expiration_date_to: mpFecha(expiraAt) }),
  }
  const res = await pref.create({ body })
  return { id: res.id, initPoint: res.init_point || res.sandbox_init_point }
}

// Consulta un pago por id contra la API de MP (para el webhook — NUNCA confiar en
// el body de la notificación). RN-70.
export async function obtenerPago(clubId, paymentId) {
  const payment = new Payment(await clientFor(clubId))
  return payment.get({ id: paymentId })
}

// Consulta una merchant_order por id (el aviso del QR de billetera llega como topic
// 'merchant_order'; la orden trae adentro external_reference + la lista de payments).
// Re-consulta con el token del club (RN-70). Devuelve el objeto crudo de MP.
export async function obtenerMerchantOrder(clubId, orderId) {
  const token = await resolveMpToken(clubId)
  if (!token) throw Object.assign(new Error('Mercado Pago no está configurado en este club'), { status: 503 })
  const r = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(d?.message || 'Error al consultar la orden'), { httpStatus: r.status })
  return d
}

// ── OAuth (conectar la cuenta MP de cada club) ────────────────────────────────
export const mpOAuthConfigurado = () => !!(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET)

async function oauthToken(body) {
  const r = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: process.env.MP_CLIENT_ID, client_secret: process.env.MP_CLIENT_SECRET, ...body }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(d.message || d.error || 'Error OAuth Mercado Pago'), { status: 502, httpStatus: r.status, mpError: d.error })
  return d // { access_token, refresh_token, user_id, expires_in, scope }
}

// Canjea el `code` del callback por el token del club.
export const intercambiarCodeOAuth = (code, redirectUri) =>
  oauthToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })

// Renueva el access_token con el refresh_token (vence ~180 días).
export const refrescarTokenOAuth = (refreshToken) =>
  oauthToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
