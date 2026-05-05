import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'

const router = Router()

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

    if (!jugador || !(await bcrypt.compare(password, jugador.password))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    if (!jugador.activo) {
      return res.status(403).json({ error: 'Cuenta inactiva' })
    }

    const token = signToken({ id: jugador.id, role: 'jugador', clubId: jugador.clubId })

    res.json({
      token,
      user: {
        id: jugador.id,
        nombre: jugador.nombre,
        apellido: jugador.apellido,
        dni: jugador.dni,
        role: 'jugador',
        club: { id: jugador.club.id, nombre: jugador.club.nombre },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
