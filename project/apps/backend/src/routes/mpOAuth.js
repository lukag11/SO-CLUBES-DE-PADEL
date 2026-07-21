import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireOwner } from '../middleware/auth.js'
import { intercambiarCodeOAuth, mpOAuthConfigurado } from '../lib/mercadopago.js'
import { asegurarCajaQR } from '../lib/cobrosQR.js'
import { encryptToken } from '../lib/cripto.js'

const router = Router()

const REDIRECT_URI = process.env.MP_OAUTH_REDIRECT_URI
  || 'https://so-clubes-de-padel-production.up.railway.app/api/mp/oauth/callback'
const FRONT = (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.startsWith('https'))
  ? process.env.APP_PUBLIC_URL : 'https://padelwiarkdemo.vercel.app'
const RETORNO = `${FRONT}/dashboardAdmin/club` // a dónde vuelve el dueño después de conectar

// GET /api/mp/oauth/start — el DUEÑO conecta la cuenta MP de su club. Genera un `state`
// anti-CSRF (aleatorio, server-side, single-use) y devuelve la URL de autorización de MP.
router.get('/oauth/start', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  if (!mpOAuthConfigurado()) return res.status(503).json({ error: 'mp_oauth_no_configurado', message: 'Falta configurar OAuth de Mercado Pago.' })
  try {
    const state = crypto.randomBytes(32).toString('base64url')
    await prisma.mpOAuthState.create({ data: { state, clubId: req.user.clubId, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } })
    const url = 'https://auth.mercadopago.com/authorization'
      + `?client_id=${encodeURIComponent(process.env.MP_CLIENT_ID)}`
      + '&response_type=code&platform_id=mp'
      + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
      + `&state=${encodeURIComponent(state)}`
    res.json({ url })
  } catch (e) {
    console.error('[mp oauth start]', e.message)
    res.status(500).json({ error: 'error', message: 'No se pudo iniciar la conexión con Mercado Pago' })
  }
})

// GET /api/mp/oauth/callback — MP devuelve al dueño acá. SIN auth (el JWT no viaja en un
// redirect del navegador): el amarre es el `state`. El clubId sale del state guardado,
// NUNCA de un query param (anti confused-deputy). R2 del diseño.
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query
  if (error || !code || !state) return res.redirect(`${RETORNO}?mp=error`)
  try {
    const row = await prisma.mpOAuthState.findUnique({ where: { state: String(state) } })
    if (!row || row.usedAt || row.expiresAt < new Date()) return res.redirect(`${RETORNO}?mp=error`)
    // single-use: marcar usado ANTES de canjear el code (atómico anti-replay).
    await prisma.mpOAuthState.update({ where: { id: row.id }, data: { usedAt: new Date() } })
    const clubId = row.clubId // ← del server, jamás del query

    const tok = await intercambiarCodeOAuth(String(code), REDIRECT_URI)
    const mpUserId = String(tok.user_id)

    // Anti-takeover: una misma cuenta MP no puede quedar vinculada a dos clubes.
    const otra = await prisma.mpConexion.findUnique({ where: { mpUserId } })
    if (otra && otra.clubId !== clubId) return res.redirect(`${RETORNO}?mp=cuenta_en_uso`)

    const expiresAt = new Date(Date.now() + (Number(tok.expires_in) || 15552000) * 1000)
    const enc = { accessTokenEnc: encryptToken(tok.access_token), refreshTokenEnc: encryptToken(tok.refresh_token), scope: tok.scope || null, expiresAt, estado: 'conectado', desconectadoMotivo: null }
    await prisma.mpConexion.upsert({
      where: { clubId },
      create: { clubId, mpUserId, ...enc },
      update: { mpUserId, ...enc },
    })
    res.redirect(`${RETORNO}?mp=ok`)
  } catch (e) {
    console.error('[mp oauth callback]', e.message)
    res.redirect(`${RETORNO}?mp=error`)
  }
})

// GET /api/mp/estado — estado de la conexión (SIN token). Lo lee cualquier admin.
router.get('/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const con = await prisma.mpConexion.findUnique({
    where: { clubId: req.user.clubId },
    select: { mpUserId: true, estado: true, expiresAt: true, desconectadoMotivo: true, conectadoAt: true },
  })
  res.json({
    conectado: !!con && con.estado === 'conectado',
    ...(con ? { mpUserId: con.mpUserId, estado: con.estado, expiraAt: con.expiresAt, desconectadoMotivo: con.desconectadoMotivo, conectadoAt: con.conectadoAt } : {}),
  })
})

// POST /api/mp/qr/asegurar-caja — S1: crea (1 vez, idempotente) o reusa la caja QR de
// billetera del club en su cuenta MP. Devuelve el posId + la imagen del QR. NUNCA el token.
router.post('/qr/asegurar-caja', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  try {
    const caja = await asegurarCajaQR(req.user.clubId)
    res.json({ ok: true, ...caja })
  } catch (e) {
    console.error('[mp qr asegurar-caja]', e.message)
    res.status(e.status || 500).json({ error: e.error || 'error', message: e.message })
  }
})

// POST /api/mp/disconnect — el DUEÑO desconecta la cuenta de MP del club.
router.post('/disconnect', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  await prisma.mpConexion.deleteMany({ where: { clubId: req.user.clubId } }) // scoped al club del token
  res.json({ ok: true })
})

export default router
