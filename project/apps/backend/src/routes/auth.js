import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { featuresEfectivas } from '../lib/planes.js'
import { getMatriz } from '../lib/planesConfig.js'

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
      club: { id: admin.club.id, nombre: admin.club.nombre, slug: admin.club.slug, plan: admin.club.plan, estado: admin.club.estado, features },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener admin' })
  }
})

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
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

    const token = signToken({ id: admin.id, role: 'admin', clubId: admin.clubId })
    const features = featuresEfectivas(admin.club, await getMatriz())

    res.json({
      token,
      user: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
        role: 'admin',
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

// POST /api/auth/jugador/login
router.post('/jugador/login', async (req, res) => {
  const { dni, password, clubId } = req.body

  if (!dni || !password || !clubId) {
    return res.status(400).json({ error: 'DNI, contraseña y clubId requeridos' })
  }

  try {
    const jugador = await prisma.jugador.findUnique({
      where: { clubId_dni: { clubId, dni } },
      include: { club: true },
    })

    if (!jugador) {
      return res.status(401).json({ error: 'DNI no registrado' })
    }
    if (!jugador.cuentaActiva) {
      return res.status(403).json({ error: 'Esta cuenta aún no fue activada. Completá el registro.' })
    }
    if (!(await bcrypt.compare(password, jugador.password))) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    if (!jugador.activo) {
      return res.status(403).json({ error: 'Tu cuenta fue dada de baja. Contactá al club.' })
    }

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId, tokenVersion: jugador.tokenVersion ?? 0 })
    res.json({ token, user: jugadorPublico(jugador) })
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
          categoria:           categoria           ?? existe.categoria,
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
        categoria:           categoria           ?? null,
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
router.post('/profesor/login', async (req, res) => {
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
