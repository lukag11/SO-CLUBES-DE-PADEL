import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// GET /api/jugadores/buscar?q= — admin busca jugadores de su club (por nombre, apellido o DNI)
router.get('/buscar', requireAuth, requireRole('admin'), async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 2) return res.json([])
  try {
    const jugadores = await prisma.jugador.findMany({
      where: {
        clubId: req.user.clubId,
        OR: [
          { nombre:   { contains: q.trim(), mode: 'insensitive' } },
          { apellido: { contains: q.trim(), mode: 'insensitive' } },
          { dni:      { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, nombre: true, apellido: true, dni: true },
      take: 8,
    })
    res.json(jugadores)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al buscar jugadores' })
  }
})

// GET /api/jugadores/me — datos actualizados del jugador autenticado
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      include: { club: { select: { id: true, nombre: true } } },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
    const { password: _, ...rest } = jugador
    res.json({ ...rest, role: 'jugador', club: { id: jugador.club.id, nombre: jugador.club.nombre } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener jugador' })
  }
})

// PATCH /api/jugadores/me — actualiza perfil del jugador autenticado
router.patch('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  const {
    nombre, apellido, email, telefono, apodo, genero, fechaNacimiento,
    provincia, ciudad, posicion, mano, categoria, frecuencia,
    diasDisponibles, horariosDisponibles, perfilPublico,
  } = req.body

  try {
    const updated = await prisma.jugador.update({
      where: { id: req.user.id },
      data: {
        ...(nombre             !== undefined && { nombre }),
        ...(apellido           !== undefined && { apellido }),
        ...(email              !== undefined && { email }),
        ...(telefono           !== undefined && { telefono }),
        ...(apodo              !== undefined && { apodo }),
        ...(genero             !== undefined && { genero }),
        ...(fechaNacimiento    !== undefined && { fechaNacimiento }),
        ...(provincia          !== undefined && { provincia }),
        ...(ciudad             !== undefined && { ciudad }),
        ...(posicion           !== undefined && { posicion }),
        ...(mano               !== undefined && { mano }),
        ...(categoria          !== undefined && { categoria }),
        ...(frecuencia         !== undefined && { frecuencia }),
        ...(diasDisponibles    !== undefined && { diasDisponibles }),
        ...(horariosDisponibles !== undefined && { horariosDisponibles }),
        ...(perfilPublico      !== undefined && { perfilPublico }),
      },
      include: { club: { select: { id: true, nombre: true } } },
    })
    const { password: _, ...rest } = updated
    res.json({ ...rest, role: 'jugador', club: { id: updated.club.id, nombre: updated.club.nombre } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

// GET /api/jugadores/me/stats — estadísticas reales del jugador autenticado
router.get('/me/stats', requireAuth, requireRole('jugador'), async (req, res) => {
  const jugadorId = req.user.id
  const clubId = req.user.clubId

  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: jugadorId },
      select: { dni: true, nombre: true, apellido: true },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })

    // ── Reservas ──────────────────────────────────────────────────────────────
    const reservas = await prisma.reserva.findMany({
      where: { jugadorId, clubId },
      include: { cancha: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    })

    const confirmadas = reservas.filter((r) => r.estado === 'confirmada')
    const turnosFijos = confirmadas.filter((r) => r.esTurnoFijo).length

    // Últimos 6 meses
    const now = new Date()
    const porMes = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const del_mes = reservas.filter((r) => r.fecha.startsWith(prefix))
      porMes.push({
        mes: MESES[d.getMonth()],
        year,
        month,
        confirmadas: del_mes.filter((r) => r.estado === 'confirmada').length,
        canceladas: del_mes.filter((r) => r.estado === 'cancelada').length,
      })
    }

    // Cancha más usada
    const canchaCount = {}
    confirmadas.forEach((r) => {
      const nombre = r.cancha?.nombre ?? 'Sin nombre'
      canchaCount[nombre] = (canchaCount[nombre] ?? 0) + 1
    })
    const canchaFavorita = Object.entries(canchaCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    // ── Torneos ───────────────────────────────────────────────────────────────
    const torneos = await prisma.torneo.findMany({
      where: { clubId },
      select: {
        id: true,
        nombre: true,
        ganador: true,
        parejas: { select: { jugador1Dni: true, jugador2Dni: true, categoria: true } },
      },
    })

    const participados = torneos.filter((t) =>
      t.parejas.some((p) => p.jugador1Dni === jugador.dni || p.jugador2Dni === jugador.dni)
    )

    const ganados = participados.filter((t) => {
      const g = (t.ganador ?? '').toLowerCase()
      return (
        g.includes(jugador.nombre.toLowerCase()) ||
        g.includes(jugador.apellido.toLowerCase())
      )
    }).length

    res.json({
      reservas: {
        total: confirmadas.length,
        turnosFijos,
        porMes,
        canchaFavorita,
      },
      torneos: {
        participados: participados.length,
        ganados,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular estadísticas' })
  }
})

export default router
