import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/auth/admin/me — datos actualizados del admin autenticado
router.get('/admin/me', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      include: { club: { select: { id: true, nombre: true, slug: true } } },
    })
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })
    res.json({
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      role: 'admin',
      club: { id: admin.club.id, nombre: admin.club.nombre, slug: admin.club.slug },
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

    res.json({
      token,
      user: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
        role: 'admin',
        club: { id: admin.club.id, nombre: admin.club.nombre, slug: admin.club.slug },
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

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId })
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
      const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId })
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

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId })
    res.status(201).json({ token, user: jugadorPublico(jugador) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
