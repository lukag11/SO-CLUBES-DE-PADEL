import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimit.js'
import { featuresEfectivas, accesoBloqueado } from '../lib/planes.js'
import { getMatriz } from '../lib/planesConfig.js'
import { permisosEfectivos } from '../lib/permisos.js'
import { normalizarCategoria } from '../lib/categorias.js'

// Mensaje de bloqueo según el motivo (club suspendido / prueba vencida).
const mensajeBloqueo = (motivo) =>
  motivo === 'prueba_vencida'
    ? 'La prueba gratuita del club venció. Contactá para activar un plan.'
    : motivo === 'licencia_vencida'
      ? 'La suscripción venció. Regularizá el pago para reactivar el club.'
      : 'El club está suspendido. Contactá al soporte.'

const router = Router()

// GET /api/auth/admin/me — datos actualizados del admin autenticado
router.get('/admin/me', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      include: { club: true },
    })
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })
    const features = featuresEfectivas(admin.club, await getMatriz())
    res.json({
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      role: 'admin',
      rol: admin.rol,                       // owner | staff
      permisos: permisosEfectivos(admin),   // módulos del empleado (owner = todos)
      club: { id: admin.club.id, nombre: admin.club.nombre, slug: admin.club.slug, plan: admin.club.plan, estado: admin.club.estado, features },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener admin' })
  }
})

// POST /api/auth/admin/login
router.post('/admin/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email }, include: { club: true } })

    if (!admin) {
      return res.status(401).json({ error: 'Email no registrado' })
    }
    if (!(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    const bloqueoAdmin = accesoBloqueado(admin.club)
    if (bloqueoAdmin) return res.status(403).json({ error: 'club_bloqueado', message: mensajeBloqueo(bloqueoAdmin) })

    const token = signToken({ id: admin.id, role: 'admin', clubId: admin.clubId })
    const features = featuresEfectivas(admin.club, await getMatriz())

    res.json({
      token,
      user: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
        role: 'admin',
        rol: admin.rol,                       // owner | staff
        permisos: permisosEfectivos(admin),   // módulos del empleado (owner = todos)
        club: { id: admin.club.id, nombre: admin.club.nombre, slug: admin.club.slug, plan: admin.club.plan, estado: admin.club.estado, features },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

const jugadorPublico = (j) => ({
  id:                  j.id,
  nombre:              j.nombre,
  apellido:            j.apellido,
  dni:                 j.dni,
  email:               j.email,
  telefono:            j.telefono,
  genero:              j.genero,
  apodo:               j.apodo,
  fechaNacimiento:     j.fechaNacimiento,
  provincia:           j.provincia,
  ciudad:              j.ciudad,
  posicion:            j.posicion,
  mano:                j.mano,
  categoria:           j.categoria,
  frecuencia:          j.frecuencia,
  diasDisponibles:     j.diasDisponibles,
  horariosDisponibles: j.horariosDisponibles,
  perfilPublico:       j.perfilPublico,
  role:                'jugador',
  club:                { id: j.club.id, nombre: j.club.nombre },
})

// POST /api/auth/jugador/login — LOGIN GLOBAL (red unificada E2). Verifica DNI + contraseña contra
// la CUENTA (la persona), y el club sale de sus MEMBRESÍAS (jugador-en-club): si viene clubId usa
// esa; si tiene una sola, esa; si tiene varias sin elegir → devuelve la lista para un selector.
// Backward-compatible: el front viejo manda clubId → funciona igual. El token sigue llevando clubId
// (club activo) → las rutas scopeadas por req.user.clubId no se tocan.
router.post('/jugador/login', loginLimiter, async (req, res) => {
  const { dni, password, clubId } = req.body

  if (!dni || !password) {
    return res.status(400).json({ error: 'DNI y contraseña requeridos' })
  }

  try {
    const cuenta = await prisma.cuenta.findUnique({ where: { dni } })
    if (!cuenta) {
      return res.status(401).json({ error: 'DNI no registrado' })
    }
    if (!cuenta.password) {
      return res.status(403).json({ error: 'Esta cuenta aún no fue activada. Completá el registro.' })
    }
    if (!(await bcrypt.compare(password, cuenta.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    // Membresías (jugador-en-club) de esta persona
    const membresias = await prisma.jugador.findMany({
      where: { cuentaId: cuenta.id },
      include: { club: true },
    })
    if (membresias.length === 0) {
      return res.status(403).json({ error: 'Tu cuenta no está asociada a ningún club.' })
    }

    // Resolver el club activo
    let jugador = null
    if (clubId) jugador = membresias.find((m) => m.clubId === clubId) || null
    if (!jugador && membresias.length === 1) jugador = membresias[0]
    if (!jugador) {
      // Varias membresías y no eligió → el front muestra un selector de club (E2 switcher)
      return res.json({
        needsClubChoice: true,
        memberships: membresias.map((m) => ({ jugadorId: m.id, clubId: m.clubId, clubNombre: m.club.nombre, logo: m.club.config?.logo || m.club.logoUrl || null })),
      })
    }

    // Validaciones de la membresía elegida (mismos mensajes de antes)
    if (!jugador.cuentaActiva) {
      return res.status(403).json({ error: 'Esta cuenta aún no fue activada. Completá el registro.' })
    }
    if (!jugador.activo) {
      return res.status(403).json({ error: 'Tu cuenta fue dada de baja. Contactá al club.' })
    }
    const bloqueoJug = accesoBloqueado(jugador.club)
    if (bloqueoJug) return res.status(403).json({ error: 'club_bloqueado', message: mensajeBloqueo(bloqueoJug) })

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId, tokenVersion: jugador.tokenVersion ?? 0, accountId: cuenta.id })
    res.json({ token, user: jugadorPublico(jugador) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/auth/jugador/me — datos del jugador logueado + sus membresías (para el selector de club).
// Red unificada E2.2: la cuenta sale del token (accountId); si es un token viejo, se deriva del jugador.
router.get('/jugador/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const jugador = await prisma.jugador.findUnique({ where: { id: req.user.id }, include: { club: true } })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
    const cuentaId = req.user.accountId || jugador.cuentaId
    const membresias = cuentaId
      ? await prisma.jugador.findMany({ where: { cuentaId, activo: true }, include: { club: true } })
      : [jugador]
    res.json({
      user: jugadorPublico(jugador),
      clubActivo: jugador.clubId,
      memberships: membresias.map((m) => ({ jugadorId: m.id, clubId: m.clubId, clubNombre: m.club.nombre, categoria: m.categoria, logo: m.club.config?.logo || m.club.logoUrl || null })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/jugador/switch-club — cambia el club activo (red unificada E2.2). Valida que la
// cuenta tenga una membresía activa en el club destino y RE-EMITE el token con ese club → las rutas
// scopeadas por req.user.clubId siguen funcionando sin cambios.
router.post('/jugador/switch-club', requireAuth, requireRole('jugador'), async (req, res) => {
  const { clubId } = req.body
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })
  try {
    let cuentaId = req.user.accountId
    if (!cuentaId) {
      const actual = await prisma.jugador.findUnique({ where: { id: req.user.id }, select: { cuentaId: true } })
      cuentaId = actual?.cuentaId
    }
    if (!cuentaId) return res.status(400).json({ error: 'No se pudo resolver tu cuenta' })

    const jugador = await prisma.jugador.findFirst({ where: { cuentaId, clubId }, include: { club: true } })
    if (!jugador) return res.status(403).json({ error: 'No sos miembro de ese club.' })
    if (!jugador.activo) return res.status(403).json({ error: 'Tu cuenta en ese club fue dada de baja.' })
    const bloqueo = accesoBloqueado(jugador.club)
    if (bloqueo) return res.status(403).json({ error: 'club_bloqueado', message: mensajeBloqueo(bloqueo) })

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId, tokenVersion: jugador.tokenVersion ?? 0, accountId: cuentaId })
    res.json({ token, user: jugadorPublico(jugador) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/jugador/unirme — un jugador logueado se UNE a otro club (red unificada E3): crea
// una membresía (Jugador) para su Cuenta en ese club, copiando sus datos de persona. La categoría
// queda null (la asigna el admin del club). Si ya es miembro, no duplica. Resuelve el caso "el mismo
// jugador juega en Tancacha y Río Tercero" con UNA sola cuenta.
router.post('/jugador/unirme', requireAuth, requireRole('jugador'), async (req, res) => {
  const { clubId } = req.body
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })
  try {
    let cuentaId = req.user.accountId
    if (!cuentaId) {
      const actual = await prisma.jugador.findUnique({ where: { id: req.user.id }, select: { cuentaId: true } })
      cuentaId = actual?.cuentaId
    }
    if (!cuentaId) return res.status(400).json({ error: 'No se pudo resolver tu cuenta' })

    const [cuenta, club] = await Promise.all([
      prisma.cuenta.findUnique({ where: { id: cuentaId } }),
      prisma.club.findUnique({ where: { id: clubId }, select: { id: true, nombre: true } }),
    ])
    if (!club) return res.status(404).json({ error: 'El club no existe' })

    const yaMiembro = await prisma.jugador.findFirst({ where: { cuentaId, clubId } })
    if (yaMiembro) return res.json({ ok: true, ya: true, jugadorId: yaMiembro.id, clubNombre: club.nombre })

    const nuevo = await prisma.jugador.create({
      data: {
        clubId, cuentaId,
        nombre: cuenta.nombre, apellido: cuenta.apellido, dni: cuenta.dni, email: cuenta.email,
        telefono: cuenta.telefono, password: cuenta.password, cuentaActiva: true, activo: true,
        tokenVersion: 0, genero: cuenta.genero, fechaNacimiento: cuenta.fechaNacimiento,
        provincia: cuenta.provincia, ciudad: cuenta.ciudad, posicion: cuenta.posicion, mano: cuenta.mano,
        // categoria: null → el admin del club la asigna
      },
    })
    res.json({ ok: true, jugadorId: nuevo.id, clubNombre: club.nombre })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// Hash del token de reseteo: nunca guardamos el token crudo en la DB.
const hashResetToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

// POST /api/auth/jugador/forgot — paso 1: valida DNI + email y genera un token de un solo uso.
// HOY (sin deploy): devuelve el token en la respuesta para que el jugador defina la clave al toque.
// AL DEPLOYAR: en vez de devolverlo, se manda por email (mismo flujo, mismo token). Ver resetToken abajo.
router.post('/jugador/forgot', loginLimiter, async (req, res) => {
  const { dni, email, clubId } = req.body
  if (!dni || !email || !clubId) {
    return res.status(400).json({ error: 'DNI, email y clubId requeridos' })
  }

  try {
    const jugador = await prisma.jugador.findUnique({ where: { clubId_dni: { clubId, dni } } })

    // El DNI es la llave; el email es el 2º factor de identidad. Si no coinciden, error único
    // (no distinguimos cuál falló, para no filtrar qué DNIs existen).
    const emailOk =
      jugador?.email &&
      jugador.email.trim().toLowerCase() === String(email).trim().toLowerCase()

    if (!jugador || !jugador.cuentaActiva || !emailOk) {
      return res.status(400).json({ error: 'El DNI y el email no coinciden con ninguna cuenta.' })
    }

    // Invalidamos tokens previos sin usar de este jugador (solo el último vale).
    await prisma.passwordResetToken.deleteMany({ where: { jugadorId: jugador.id, usedAt: null } })

    const rawToken = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        jugadorId: jugador.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      },
    })

    // TODO al deployar: mandar el token por email (Resend) y NO devolverlo acá.
    res.json({ ok: true, resetToken: rawToken })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/jugador/reset — paso 2: valida el token y cambia la contraseña.
// Este endpoint NO cambia al deployar: sirve igual venga el token de la respuesta o del email.
router.post('/jugador/reset', loginLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña requeridos' })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const registro = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
    })

    if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o expiró. Pedí uno nuevo.' })
    }

    // Cambiar clave + subir tokenVersion (invalida cualquier sesión vieja) + marcar token usado.
    await prisma.$transaction([
      prisma.jugador.update({
        where: { id: registro.jugadorId },
        data: {
          password: await bcrypt.hash(password, 10),
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { usedAt: new Date() },
      }),
    ])

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/jugador/registro
router.post('/jugador/registro', async (req, res) => {
  const {
    nombre, apellido, dni, password, email, telefono, clubId,
    genero, apodo, fechaNacimiento, provincia, ciudad,
    posicion, mano, categoria, frecuencia,
    diasDisponibles, horariosDisponibles, perfilPublico,
  } = req.body

  if (!nombre || !apellido || !dni || !password || !clubId) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' })
  }

  try {
    const existe = await prisma.jugador.findUnique({
      where: { clubId_dni: { clubId, dni } },
    })

    const passwordHash = await bcrypt.hash(password, 10)

    // Si el admin lo pre-registró (cuentaActiva: false) → merge activando la cuenta
    if (existe && !existe.cuentaActiva) {
      const jugador = await prisma.jugador.update({
        where: { id: existe.id },
        data: {
          password: passwordHash,
          cuentaActiva: true,
          // Solo sobreescribir campos que el jugador completó en el stepper
          nombre, apellido, email: email ?? existe.email, telefono: telefono ?? existe.telefono,
          genero:              genero              ?? existe.genero,
          apodo:               apodo               ?? existe.apodo,
          fechaNacimiento:     fechaNacimiento     ?? existe.fechaNacimiento,
          provincia:           provincia           ?? existe.provincia,
          ciudad:              ciudad              ?? existe.ciudad,
          posicion:            posicion            ?? existe.posicion,
          mano:                mano                ?? existe.mano,
          categoria:           normalizarCategoria(categoria) ?? existe.categoria,
          frecuencia:          frecuencia          ?? existe.frecuencia,
          diasDisponibles:     diasDisponibles     ?? existe.diasDisponibles,
          horariosDisponibles: horariosDisponibles ?? existe.horariosDisponibles,
          perfilPublico:       perfilPublico       ?? existe.perfilPublico,
        },
        include: { club: true },
      })
      const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId, tokenVersion: jugador.tokenVersion ?? 0 })
      return res.status(201).json({ token, user: jugadorPublico(jugador) })
    }

    if (existe) {
      return res.status(409).json({ error: 'Ya existe un jugador con ese DNI en este club' })
    }

    const jugador = await prisma.jugador.create({
      data: {
        clubId, nombre, apellido, dni, password: passwordHash, email, telefono,
        genero:              genero              ?? null,
        apodo:               apodo               ?? null,
        fechaNacimiento:     fechaNacimiento     ?? null,
        provincia:           provincia           ?? null,
        ciudad:              ciudad              ?? null,
        posicion:            posicion            ?? null,
        mano:                mano                ?? null,
        categoria:           normalizarCategoria(categoria),
        frecuencia:          frecuencia          ?? null,
        diasDisponibles:     diasDisponibles     ?? [],
        horariosDisponibles: horariosDisponibles ?? [],
        perfilPublico:       perfilPublico       ?? false,
      },
      include: { club: true },
    })

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId, tokenVersion: jugador.tokenVersion ?? 0 })
    res.status(201).json({ token, user: jugadorPublico(jugador) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /api/auth/profesor/disponibilidad — el propio profesor actualiza su disponibilidad semanal
router.patch('/profesor/disponibilidad', requireAuth, requireRole('profesor'), async (req, res) => {
  const { disponibilidad } = req.body
  if (disponibilidad === undefined) {
    return res.status(400).json({ error: 'Falta el campo disponibilidad' })
  }
  try {
    const profesor = await prisma.profesor.update({
      where: { id: req.user.id },
      data: { disponibilidad },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        especialidad: true, canchasIds: true, disponibilidad: true, activo: true, createdAt: true,
      },
    })

    // Notificar al admin que el profesor actualizó su disponibilidad
    prisma.notificacion.create({
      data: {
        clubId: req.user.clubId,
        tipo: 'actualizacion_disponibilidad_profesor',
        data: {
          profesorNombre: `${profesor.nombre} ${profesor.apellido}`,
          profesorId: req.user.id,
        },
      },
    }).catch(() => {})

    res.json(profesor)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar disponibilidad' })
  }
})

// GET /api/auth/profesor/me
router.get('/profesor/me', requireAuth, requireRole('profesor'), async (req, res) => {
  try {
    const profesor = await prisma.profesor.findUnique({
      where: { id: req.user.id },
      include: { club: { select: { id: true, nombre: true, slug: true } } },
    })
    if (!profesor) return res.status(404).json({ error: 'Profesor no encontrado' })
    const { password: _, ...safe } = profesor
    res.json({ ...safe, role: 'profesor', club: { id: profesor.club.id, nombre: profesor.club.nombre, slug: profesor.club.slug } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener profesor' })
  }
})

// POST /api/auth/profesor/login
router.post('/profesor/login', loginLimiter, async (req, res) => {
  const { email, password, clubId } = req.body
  if (!email || !password || !clubId) {
    return res.status(400).json({ error: 'Email, contraseña y clubId requeridos' })
  }
  try {
    const profesor = await prisma.profesor.findUnique({
      where: { clubId_email: { clubId, email } },
      include: { club: true },
    })
    if (!profesor) return res.status(401).json({ error: 'Email no registrado en este club' })
    if (!profesor.activo) return res.status(403).json({ error: 'Tu cuenta está desactivada. Contactá al club.' })
    if (!(await bcrypt.compare(password, profesor.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    const bloqueoProf = accesoBloqueado(profesor.club)
    if (bloqueoProf) return res.status(403).json({ error: 'club_bloqueado', message: mensajeBloqueo(bloqueoProf) })
    const token = signToken({ id: profesor.id, role: 'profesor', clubId: profesor.clubId })
    const { password: _, ...safe } = profesor
    res.json({
      token,
      user: { ...safe, role: 'profesor', club: { id: profesor.club.id, nombre: profesor.club.nombre, slug: profesor.club.slug } },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
