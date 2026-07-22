import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { loginLimiter, signupLimiter } from '../middleware/rateLimit.js'
import { crearClub, PLANES_VALIDOS } from '../lib/tenants.js'
import { FEATURES, FEATURE_IDS, CORE_FEATURES } from '../lib/planes.js'
import { getMatriz, setMatriz } from '../lib/planesConfig.js'
import { inicioMesArg } from '../lib/tiempo.js'

const router = Router()

// Suma `n` meses a una fecha (para extender la licencia de suscripción).
const addMeses = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d }

const ESTADOS_VALIDOS = ['prueba', 'activo', 'suspendido']

// ---- POST /api/platform/login — login del dueño de plataforma ----
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })

  try {
    const pa = await prisma.platformAdmin.findUnique({ where: { email } })
    if (!pa) return res.status(401).json({ error: 'Email no registrado' })
    if (!(await bcrypt.compare(password, pa.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    const token = signToken({ id: pa.id, role: 'platform' })
    res.json({ token, user: { id: pa.id, nombre: pa.nombre, email: pa.email, role: 'platform' } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ---- GET /api/platform/me ----
router.get('/me', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const pa = await prisma.platformAdmin.findUnique({ where: { id: req.user.id }, select: { id: true, nombre: true, email: true } })
    if (!pa) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ...pa, role: 'platform' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

// ---- GET /api/platform/clubs — listado de tenants con conteos ----
router.get('/clubs', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nombre: true, slug: true, plan: true, estado: true, activo: true,
        trialHasta: true, createdAt: true, featuresExtra: true,
        // Contar solo lo ACTIVO, para que coincida con lo que ve el operador del club
        // (las canchas/jugadores dados de baja quedan en la DB como activo:false).
        _count: { select: { jugadores: { where: { activo: true } }, canchas: { where: { activo: true } }, admins: true } },
      },
    })
    res.json(clubs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al listar clubes' })
  }
})

// ---- POST /api/platform/clubs — alta de club (motor único) ----
router.post('/clubs', requireAuth, requireRole('platform'), async (req, res) => {
  const { clubNombre, slug, plan, adminNombre, adminEmail, adminPassword, trialDias } = req.body
  try {
    const club = await crearClub({ clubNombre, slug, plan, adminNombre, adminEmail, adminPassword, trialDias })
    res.status(201).json(club)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al crear el club' })
  }
})

// ---- PATCH /api/platform/clubs/:id — cambiar plan y/o estado ----
router.patch('/clubs/:id', requireAuth, requireRole('platform'), async (req, res) => {
  const { id } = req.params
  const { plan, estado, featuresExtra } = req.body

  if (plan !== undefined && !PLANES_VALIDOS.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' })
  }
  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }
  if (featuresExtra !== undefined && !Array.isArray(featuresExtra)) {
    return res.status(400).json({ error: 'featuresExtra inválido' })
  }

  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })

    // Regalitos: solo ids de features válidas (las core no hace falta listarlas)
    const extra = featuresExtra !== undefined
      ? [...new Set(featuresExtra.filter((f) => FEATURE_IDS.includes(f)))]
      : undefined

    const updated = await prisma.club.update({
      where: { id },
      data: {
        ...(plan !== undefined && { plan }),
        // 'suspendido' también baja el kill-switch 'activo' (y lo sube al reactivar)
        ...(estado !== undefined && { estado, activo: estado !== 'suspendido' }),
        ...(extra !== undefined && { featuresExtra: extra }),
      },
      select: { id: true, nombre: true, slug: true, plan: true, estado: true, activo: true, trialHasta: true, featuresExtra: true },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el club' })
  }
})

// ---- POST /api/platform/signup — alta self-service PÚBLICA (sin auth) ----
// Usa el MISMO motor crearClub que el alta asistida. El club arranca en 'prueba'.
// PENDIENTE para producción: verificación por email + anti-abuso (captcha / rate-limit).
// Hasta deployar (sin proveedor de mail) queda abierto — aceptable en local.
router.post('/signup', signupLimiter, async (req, res) => {
  const { clubNombre, adminNombre, adminEmail, adminPassword } = req.body
  const email = String(adminEmail || '').trim().toLowerCase()
  if (!clubNombre || !email || !adminPassword) {
    return res.status(400).json({ error: 'Completá el nombre del club, tu email y una contraseña' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El email no parece válido' })
  }
  if (String(adminPassword).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }
  try {
    // plan 'basico' por defecto: igual durante la prueba ve Premium (decisión B)
    const club = await crearClub({ clubNombre, adminNombre, adminEmail: email, adminPassword, plan: 'basico' })
    res.status(201).json({ ok: true, slug: club.slug, adminEmail: email })
  } catch (err) {
    // Mensaje genérico (no confirmar si el email ya existe → anti-enumeración).
    // El rate-limit (signupLimiter) es la defensa real contra el barrido.
    if (err.status === 409) {
      return res.status(409).json({ error: 'No pudimos crear el club con esos datos. Si ya tenés una cuenta, iniciá sesión.' })
    }
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'No se pudo crear tu club. Probá de nuevo.' })
  }
})

// ---- GET /api/platform/planes — catálogo de features + matriz vigente (para el editor) ----
router.get('/planes', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    res.json({
      features: FEATURES,          // [{ id, label, core }]
      planes: PLANES_VALIDOS,      // ['basico','pro','premium']
      matriz: await getMatriz(),   // { basico:[...], pro:[...], premium:[...] }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los planes' })
  }
})

// ---- PATCH /api/platform/planes — guardar la matriz editada ----
router.patch('/planes', requireAuth, requireRole('platform'), async (req, res) => {
  const { matriz } = req.body
  if (!matriz || typeof matriz !== 'object') {
    return res.status(400).json({ error: 'Matriz inválida' })
  }
  try {
    // Sanitizar: cada plan = solo ids válidos + las core siempre incluidas.
    const limpia = {}
    for (const plan of PLANES_VALIDOS) {
      const arr = Array.isArray(matriz[plan]) ? matriz[plan] : []
      const validas = arr.filter((id) => FEATURE_IDS.includes(id))
      limpia[plan] = [...new Set([...CORE_FEATURES, ...validas])]
    }
    const guardada = await setMatriz(limpia)
    res.json({ ok: true, matriz: guardada })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar los planes' })
  }
})

// ---- GET /api/platform/suscripciones — panel de TU cobro (la suscripción de cada club) ----
router.get('/suscripciones', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, nombre: true, slug: true, plan: true, estado: true, trialHasta: true, licenciaHasta: true, precioMensual: true },
    })
    const now = Date.now()
    const en7 = now + 7 * 24 * 60 * 60 * 1000
    const conEstado = clubs.map((c) => {
      let pago = 'sin_dato'
      if (c.estado === 'suspendido') pago = 'suspendido'
      else if (c.estado === 'prueba') pago = 'prueba'
      else if (c.estado === 'activo') {
        const t = c.licenciaHasta ? new Date(c.licenciaHasta).getTime() : null
        pago = t == null ? 'sin_licencia' : t < now ? 'vencido' : t < en7 ? 'por_vencer' : 'al_dia'
      }
      return { ...c, pago }
    })
    // Tu caja del mes: suma de pagos de suscripción registrados en el mes en curso.
    const agg = await prisma.suscripcionPago.aggregate({ where: { createdAt: { gte: inicioMesArg() } }, _sum: { monto: true }, _count: true })
    // MRR aprox = suma de precioMensual de los clubes al día.
    const mrr = conEstado.filter((c) => c.pago === 'al_dia' || c.pago === 'por_vencer').reduce((s, c) => s + (c.precioMensual || 0), 0)
    res.json({ clubs: conEstado, cajaMes: agg._sum.monto || 0, pagosMes: agg._count, mrr })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener las suscripciones' })
  }
})

// ---- POST /api/platform/clubs/:id/pago — registrar un pago de suscripción + extender licencia ----
// El PlatformAdmin lo carga cuando el club paga (transferencia / MP / efectivo). Activa el club
// y le corre la licencia N meses desde HOY (o desde su vencimiento futuro si ya está al día).
router.post('/clubs/:id/pago', requireAuth, requireRole('platform'), async (req, res) => {
  const { id } = req.params
  const { monto, metodo = 'transferencia', meses = 1, comprobanteUrl, nota } = req.body
  const montoInt = Math.round(Number(monto) || 0)
  const mesesInt = Math.max(1, Math.round(Number(meses) || 1))
  if (montoInt <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' })
  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true, licenciaHasta: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    const now = new Date()
    // Si ya está pago hacia adelante, apilamos los meses; si venció / nunca pagó, corre desde hoy.
    const base = club.licenciaHasta && new Date(club.licenciaHasta) > now ? new Date(club.licenciaHasta) : now
    const cubreHasta = addMeses(base, mesesInt)
    const [pago, updated] = await prisma.$transaction([
      prisma.suscripcionPago.create({
        data: { clubId: id, monto: montoInt, metodo, meses: mesesInt, cubreDesde: base, cubreHasta, comprobanteUrl: comprobanteUrl || null, nota: nota || null, registradoPor: req.user.id },
      }),
      prisma.club.update({
        where: { id },
        data: { estado: 'activo', activo: true, licenciaHasta: cubreHasta, precioMensual: Math.round(montoInt / mesesInt) },
        select: { id: true, nombre: true, estado: true, licenciaHasta: true, precioMensual: true },
      }),
    ])
    res.status(201).json({ ok: true, pago, club: updated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar el pago' })
  }
})

// ---- GET /api/platform/clubs/:id/pagos — historial de pagos de suscripción de un club ----
router.get('/clubs/:id/pagos', requireAuth, requireRole('platform'), async (req, res) => {
  try {
    const pagos = await prisma.suscripcionPago.findMany({ where: { clubId: req.params.id }, orderBy: { createdAt: 'desc' } })
    res.json(pagos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el historial' })
  }
})

// ---- POST /api/platform/clubs/:id/reset-admin — resetear la contraseña del admin del club ----
// Tarea de soporte: el dueño de un club olvidó su clave. Resetea al admin más antiguo
// (el creado en el alta) y devuelve su email para pasárselo.
router.post('/clubs/:id/reset-admin', requireAuth, requireRole('platform'), async (req, res) => {
  const { id } = req.params
  const { password } = req.body
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })
  }
  try {
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    const admin = await prisma.admin.findFirst({ where: { clubId: id }, orderBy: { createdAt: 'asc' } })
    if (!admin) return res.status(404).json({ error: 'El club no tiene administrador' })
    const hash = await bcrypt.hash(password, 10)
    await prisma.admin.update({ where: { id: admin.id }, data: { password: hash } })
    res.json({ ok: true, email: admin.email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al resetear la contraseña' })
  }
})

export default router
