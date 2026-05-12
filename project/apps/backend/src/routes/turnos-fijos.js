import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const crearNotifTurnoFijo = (turno, tipo) => {
  if (!turno.jugadorId) return
  prisma.notificacion.create({
    data: {
      clubId: turno.clubId,
      jugadorId: turno.jugadorId,
      tipo,
      data: {
        canchaNombre: turno.cancha?.nombre ?? '',
        dia: turno.dia,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
      },
    },
  }).catch(() => {})
}

const INCLUDE_CANCHA = {
  cancha: { select: { id: true, nombre: true, tipo: true, indoor: true } },
  jugador: { select: { id: true, nombre: true, apellido: true, dni: true } },
}

const mapTurno = (t) => ({
  id: t.id,
  clubId: t.clubId,
  canchaId: t.canchaId,
  canchaNombre: t.cancha?.nombre ?? '',
  canchaInfo: t.cancha ? `${t.cancha.tipo ?? 'Padel'} · ${t.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
  jugadorId: t.jugadorId,
  jugador: t.jugador ? `${t.jugador.nombre} ${t.jugador.apellido ?? ''}`.trim() : '',
  jugadorDni: t.jugador?.dni ?? '',
  dia: t.dia,
  inicio: t.horaInicio,
  fin: t.horaFin,
  precio: t.precio,
  estado: t.estado,
  activo: t.estado === 'confirmado',
  diasAusentes: t.diasAusentes ?? [],
  ausenciasPendientes: t.ausenciasPendientes ?? [],
  desde: t.desde,
  notas: t.notas ?? '',
})

// ── GET /me — jugador: sus turnos fijos ──────────────────────────────────────
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const turnos = await prisma.turnoFijo.findMany({
      where: { jugadorId: req.user.id, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /?clubId= — admin: todos los turnos del club ─────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { clubId } = req.query
    if (!clubId) return res.status(400).json({ error: 'clubId requerido' })
    if (req.user.club?.id !== clubId) return res.status(403).json({ error: 'Acceso denegado' })

    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST / — jugador: solicitar turno fijo ───────────────────────────────────
router.post('/', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const { canchaId, dia, horaInicio, horaFin, precio, notas } = req.body
    if (!canchaId || !dia || !horaInicio || !horaFin) {
      return res.status(400).json({ error: 'canchaId, dia, horaInicio y horaFin son requeridos' })
    }

    // RN-51: máximo 1 turno fijo activo/pendiente por cancha por día
    const existente = await prisma.turnoFijo.findFirst({
      where: {
        canchaId,
        dia,
        estado: { in: ['pendiente', 'confirmado'] },
      },
    })
    if (existente) {
      return res.status(409).json({ error: `Ya existe un turno fijo ${existente.estado} para esa cancha ese día` })
    }

    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    const turno = await prisma.turnoFijo.create({
      data: {
        clubId: req.user.clubId,
        canchaId,
        jugadorId: req.user.id,
        dia,
        horaInicio,
        horaFin,
        precio: precio ? Number(precio) : null,
        estado: 'pendiente',
        diasAusentes: [],
        ausenciasPendientes: [],
        desde,
        notas: notas ?? null,
      },
      include: INCLUDE_CANCHA,
    })
    res.status(201).json(mapTurno(turno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH /:id/estado — admin: confirmar | rechazar | dar de baja ─────────────
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { estado } = req.body
    if (!['confirmado', 'inactivo', 'pendiente'].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' })
    }

    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.club?.id) return res.status(403).json({ error: 'Acceso denegado' })

    const updated = await prisma.turnoFijo.update({
      where: { id: req.params.id },
      data: { estado },
      include: INCLUDE_CANCHA,
    })

    if (estado === 'confirmado') crearNotifTurnoFijo(updated, 'turno_fijo_confirmado')
    if (estado === 'inactivo')   crearNotifTurnoFijo(updated, 'turno_fijo_rechazado')

    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /:id/ausencia — jugador: solicitar ausencia puntual ─────────────────
router.post('/:id/ausencia', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const { fecha } = req.body
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' })

    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.jugadorId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' })
    if (turno.estado !== 'confirmado') return res.status(400).json({ error: 'Solo se pueden pedir ausencias en turnos confirmados' })

    if (turno.ausenciasPendientes.includes(fecha) || turno.diasAusentes.includes(fecha)) {
      return res.status(409).json({ error: 'La ausencia para esa fecha ya fue registrada' })
    }

    const updated = await prisma.turnoFijo.update({
      where: { id: req.params.id },
      data: { ausenciasPendientes: { push: fecha } },
      include: INCLUDE_CANCHA,
    })
    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH /:id/ausencia/:fecha — admin: confirmar ausencia puntual ────────────
router.patch('/:id/ausencia/:fecha', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id, fecha } = req.params

    const turno = await prisma.turnoFijo.findUnique({ where: { id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.club?.id) return res.status(403).json({ error: 'Acceso denegado' })

    const updated = await prisma.turnoFijo.update({
      where: { id },
      data: {
        diasAusentes: { push: fecha },
        ausenciasPendientes: turno.ausenciasPendientes.filter((f) => f !== fecha),
      },
      include: INCLUDE_CANCHA,
    })
    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
