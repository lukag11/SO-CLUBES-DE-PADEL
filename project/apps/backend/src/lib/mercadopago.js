import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

// ── Resolución del access token del club ──────────────────────────────────────
// HOY (Fase 2, sandbox, 1 club): un único token por variable de entorno.
// FUTURO (OAuth multi-tenant): token por club, cifrado en DB. El token NUNCA sale
// al frontend. Ver memoria project_mercadopago_fase2.
export function resolveMpToken(_clubId) {
  return process.env.MP_ACCESS_TOKEN || null
}

export const mpConfigurado = (clubId) => !!resolveMpToken(clubId)

const clientFor = (clubId) => {
  const accessToken = resolveMpToken(clubId)
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
  const pref = new Preference(clientFor(clubId))
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
  const payment = new Payment(clientFor(clubId))
  return payment.get({ id: paymentId })
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
  if (!r.ok) throw Object.assign(new Error(d.message || d.error || 'Error OAuth Mercado Pago'), { status: 502 })
  return d // { access_token, refresh_token, user_id, expires_in, scope }
}

// Canjea el `code` del callback por el token del club.
export const intercambiarCodeOAuth = (code, redirectUri) =>
  oauthToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })

// Renueva el access_token con el refresh_token (vence ~180 días).
export const refrescarTokenOAuth = (refreshToken) =>
  oauthToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
