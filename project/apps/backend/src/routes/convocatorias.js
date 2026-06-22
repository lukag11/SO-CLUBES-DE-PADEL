import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'
import { runSerializable } from '../lib/serializable.js'
import { cancelarConvocatoria } from '../lib/convocatorias.js'

const router = Router()

const resumenCupos = (cupos) => ({
  voy: cupos.filter((c) => c.estado === 'voy').length,
  espera: cupos.filter((c) => c.estado === 'espera').length,
})

// POST /api/convocatorias — el admin abre una convocatoria
router.post('/', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { modalidad, categorias, fecha, horaInicio, canchas, cupoMax, deadline, politicaNoLlena, notas } = req.body || {}
  if (!['americano', 'super8'].includes(modalidad)) return res.status(400).json({ error: 'Modalidad inválida' })
  if (!fecha || !horaInicio || !cupoMax || Number(cupoMax) < 1) return res.status(400).json({ error: 'Faltan campos requeridos (fecha, horaInicio, cupoMax)' })
  try {
    const c = await prisma.convocatoria.create({
      data: {
        clubId,
        modalidad,
        categorias: Array.isArray(categorias) ? categorias : [],
        fecha,
        horaInicio,
        canchas: canchas ? parseInt(canchas, 10) : 1,
        cupoMax: parseInt(cupoMax, 10),
        deadline: deadline ? new Date(deadline) : null,
        politicaNoLlena: politicaNoLlena || 'avisar',
        notas: notas || null,
        createdBy: req.user.id,
      },
    })
    res.status(201).json(c)
  } catch (err) {
    console.error('Error crear convocatoria:', err.message)
    res.status(500).json({ error: 'No se pudo crear la convocatoria' })
  }
})

// GET /api/convocatorias — el admin lista las del club (con conteo de cupos)
router.get('/', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const cs = await prisma.convocatoria.findMany({
      where: { clubId },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      include: { cupos: { select: { estado: true } } },
    })
    res.json(cs.map(({ cupos, ...c }) => ({ ...c, ...resumenCupos(cupos) })))
  } catch (err) {
    console.error('Error listar convocatorias:', err.message)
    res.status(500).json({ error: 'Error al listar convocatorias' })
  }
})

// GET /api/convocatorias/mias — convocatorias en las que está anotado el jugador (voy/espera)
router.get('/mias', requireRole('jugador'), async (req, res) => {
  try {
    const cupos = await prisma.convocatoriaCupo.findMany({
      where: { jugadorId: req.user.id, estado: { in: ['voy', 'espera'] } },
      include: { convocatoria: { include: { cupos: { select: { estado: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    const out = cupos
      .filter((c) => c.convocatoria && ['abierta', 'confirmada'].includes(c.convocatoria.estado))
      .map((c) => {
        const conv = c.convocatoria
        const voy = conv.cupos.filter((x) => x.estado === 'voy').length
        return { id: conv.id, modalidad: conv.modalidad, categorias: conv.categorias, fecha: conv.fecha, horaInicio: conv.horaInicio, cupoMax: conv.cupoMax, estado: conv.estado, voy, miEstado: c.estado }
      })
    res.json(out)
  } catch (err) {
    console.error('Error mis convocatorias:', err.message)
    res.status(500).json({ error: 'Error al obtener tus eventos' })
  }
})

// GET /api/convocatorias/:id — detalle con anotados (admin o jugador del club)
router.get('/:id', async (req, res) => {
  const clubId = req.user.clubId
  try {
    const c = await prisma.convocatoria.findFirst({
      where: { id: req.params.id, clubId },
      include: {
        cupos: {
          orderBy: { createdAt: 'asc' },
          include: { jugador: { select: { nombre: true, apellido: true, posicion: true } } },
        },
      },
    })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    res.json({ ...c, ...resumenCupos(c.cupos) })
  } catch (err) {
    console.error('Error detalle convocatoria:', err.message)
    res.status(500).json({ error: 'Error al obtener la convocatoria' })
  }
})

// GET /api/convocatorias/:id/mi-estado — el jugador consulta si ya está anotado
router.get('/:id/mi-estado', requireRole('jugador'), async (req, res) => {
  try {
    const cupo = await prisma.convocatoriaCupo.findFirst({
      where: { convocatoriaId: req.params.id, jugadorId: req.user.id, estado: { not: 'baja' } },
      select: { estado: true },
    })
    res.json({ estado: cupo?.estado ?? null })
  } catch (err) {
    console.error('Error mi-estado convocatoria:', err.message)
    res.status(500).json({ error: 'Error' })
  }
})

// POST /api/convocatorias/:id/voy — el jugador se suma (cupo o lista de espera)
router.post('/:id/voy', requireRole('jugador'), async (req, res) => {
  const jugadorId = req.user.id
  const { posicion } = req.body || {}
  try {
    const result = await runSerializable(async (tx) => {
      const c = await tx.convocatoria.findUnique({ where: { id: req.params.id } })
      if (!c || c.clubId !== req.user.clubId) throw Object.assign(new Error('Convocatoria no encontrada'), { status: 404 })
      if (c.estado !== 'abierta') throw Object.assign(new Error('La convocatoria no está abierta'), { status: 409 })

      const cupos = await tx.convocatoriaCupo.findMany({ where: { convocatoriaId: c.id } })
      const yo = cupos.find((x) => x.jugadorId === jugadorId)
      if (yo && yo.estado !== 'baja') throw Object.assign(new Error('Ya estás anotado'), { status: 409 })

      const voyCount = cupos.filter((x) => x.estado === 'voy').length
      const estado = voyCount < c.cupoMax ? 'voy' : 'espera'
      let pos = posicion
      if (!pos) {
        const j = await tx.jugador.findUnique({ where: { id: jugadorId }, select: { posicion: true } })
        pos = j?.posicion ?? null
      }
      if (yo) await tx.convocatoriaCupo.update({ where: { id: yo.id }, data: { estado, posicion: pos } })
      else await tx.convocatoriaCupo.create({ data: { convocatoriaId: c.id, jugadorId, posicion: pos, estado } })
      return { estado }
    })
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo anotar' })
  }
})

// POST /api/convocatorias/:id/baja — el jugador se baja (promueve al primero en espera)
router.post('/:id/baja', requireRole('jugador'), async (req, res) => {
  const jugadorId = req.user.id
  try {
    await runSerializable(async (tx) => {
      const cupos = await tx.convocatoriaCupo.findMany({ where: { convocatoriaId: req.params.id }, orderBy: { createdAt: 'asc' } })
      const yo = cupos.find((x) => x.jugadorId === jugadorId && x.estado !== 'baja')
      if (!yo) throw Object.assign(new Error('No estás anotado'), { status: 404 })
      const eraVoy = yo.estado === 'voy'
      await tx.convocatoriaCupo.update({ where: { id: yo.id }, data: { estado: 'baja' } })
      if (eraVoy) {
        const primeroEspera = cupos.find((x) => x.estado === 'espera')
        if (primeroEspera) await tx.convocatoriaCupo.update({ where: { id: primeroEspera.id }, data: { estado: 'voy' } })
      }
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo dar de baja' })
  }
})

// PATCH /api/convocatorias/:id/estado — el admin cambia el estado (ej: cancelar)
router.patch('/:id/estado', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { estado } = req.body || {}
  if (!['abierta', 'cancelada', 'confirmada', 'jugada'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId } })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    // Cancelar libera las canchas reservadas del evento (cancela las reservas linkeadas).
    if (estado === 'cancelada') {
      const upd = await cancelarConvocatoria(clubId, c.id)
      return res.json(upd)
    }
    const upd = await prisma.convocatoria.update({ where: { id: c.id }, data: { estado } })
    res.json(upd)
  } catch (err) {
    console.error('Error cambiar estado convocatoria:', err.message)
    res.status(500).json({ error: 'No se pudo cambiar el estado' })
  }
})

export default router
