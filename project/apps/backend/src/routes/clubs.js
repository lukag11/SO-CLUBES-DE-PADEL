import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { inicioDiaArg, inicioMesArg, hoyArgStr, ahoraArgHHMM } from '../lib/tiempo.js'

const router = Router()

// GET /api/clubs/me   — admin obtiene la config de su club
router.get('/me', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.user.clubId },
      include: { canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
    })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

// GET /api/clubs/me/dashboard — métricas reales para el resumen del admin
router.get('/me/dashboard', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    // Límites de fecha/hora en hora local Argentina (el server corre en UTC)
    const inicioDia = inicioDiaArg()
    const inicioMes = inicioMesArg()
    const hoyStr = hoyArgStr()
    const ahoraHHMM = ahoraArgHHMM()

    const [
      reservasPagadasDia, cargosPagadosDia,
      reservasPagadasMes, cargosPagadosMes,
      reservasHoy, jugadoresActivos, canchasActivas,
      torneosActivos, deudaPendiente,
      ultimasReservas, ultimosJugadores, ultimosCargos,
    ] = await Promise.all([
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioDia } }, select: { precio: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioDia } }, select: { monto: true } }),
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioMes } }, select: { precio: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioMes } }, select: { monto: true } }),
      prisma.reserva.findMany({ where: { clubId, fecha: hoyStr, estado: 'confirmada' }, select: { horaInicio: true, horaFin: true } }),
      prisma.jugador.count({ where: { clubId, activo: true } }),
      prisma.cancha.findMany({ where: { clubId, activo: true }, select: { id: true } }),
      prisma.torneo.count({ where: { clubId, estado: { in: ['in_progress', 'open'] } } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pendiente' }, select: { monto: true } }),
      prisma.reserva.findMany({ where: { clubId }, orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, fecha: true, horaInicio: true, cancha: { select: { nombre: true } }, jugador: { select: { nombre: true, apellido: true } } } }),
      prisma.jugador.findMany({ where: { clubId }, orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, nombre: true, apellido: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado' }, orderBy: { pagadoAt: 'desc' }, take: 5, select: { pagadoAt: true, monto: true, concepto: true } }),
    ])

    const sumPrecio = (arr) => arr.reduce((s, r) => s + (r.precio ?? 0), 0)
    const sumMonto = (arr) => arr.reduce((s, r) => s + (r.monto ?? 0), 0)

    const ingresosDia = sumPrecio(reservasPagadasDia) + sumMonto(cargosPagadosDia)
    const ingresosMes = sumPrecio(reservasPagadasMes) + sumMonto(cargosPagadosMes)
    const ocupadasAhora = reservasHoy.filter((r) => r.horaInicio <= ahoraHHMM && ahoraHHMM < r.horaFin).length

    // Feed de actividad reciente (mezcla y ordena por fecha)
    const actividad = [
      ...ultimasReservas.map((r) => ({
        createdAt: r.createdAt,
        text: `Reserva — ${r.cancha?.nombre ?? 'Cancha'} ${r.fecha} ${r.horaInicio}${r.jugador ? ` · ${r.jugador.nombre} ${r.jugador.apellido}` : ''}`,
      })),
      ...ultimosJugadores.map((j) => ({ createdAt: j.createdAt, text: `Nuevo jugador: ${j.nombre} ${j.apellido}` })),
      ...ultimosCargos.filter((c) => c.pagadoAt).map((c) => ({ createdAt: c.pagadoAt, text: `Pago recibido: $${(c.monto ?? 0).toLocaleString('es-AR')} — ${c.concepto}` })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

    res.json({
      ingresosDia,
      ingresosMes,
      reservasHoy: reservasHoy.length,
      jugadoresActivos,
      canchasActivas: canchasActivas.length,
      ocupadasAhora,
      torneosActivos,
      deudaPendiente: sumMonto(deudaPendiente),
      actividad,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular el dashboard' })
  }
})

// PATCH /api/clubs/me   — admin guarda config del club
router.patch('/me', requireAuth, requireRole('admin'), async (req, res) => {
  const { config } = req.body
  if (!config) return res.status(400).json({ error: 'config requerido' })

  try {
    const updated = await prisma.club.update({
      where: { id: req.user.clubId },
      data: { config },
    })
    res.json({ id: updated.id, config: updated.config })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar config' })
  }
})

// PATCH /api/clubs/me/canchas  — admin sincroniza canchas (crea, actualiza, desactiva)
router.patch('/me/canchas', requireAuth, requireRole('admin'), async (req, res) => {
  const { canchas } = req.body
  if (!Array.isArray(canchas)) return res.status(400).json({ error: 'canchas debe ser un array' })

  const clubId = req.user.clubId

  try {
    // IDs actuales en la DB
    const dbCanchas = await prisma.cancha.findMany({ where: { clubId }, select: { id: true } })
    const dbIds = new Set(dbCanchas.map((c) => c.id))

    // IDs que llegan con CUID válido (string de 25 chars aprox)
    const isCuid = (id) => typeof id === 'string' && id.length > 10

    const upsertOps = canchas.map((c, i) => {
      if (isCuid(c.id) && dbIds.has(c.id)) {
        // Actualizar existente
        return prisma.cancha.update({
          where: { id: c.id },
          data: {
            nombre: c.nombre,
            tipo: c.tipo ?? 'Cristal',
            indoor: c.indoor ?? true,
            precioTurno: c.precioTurno ?? 0,
            horarios: c.horarios ?? null,
            activo: true,
          },
        })
      }
      // Crear nueva
      return prisma.cancha.create({
        data: {
          clubId,
          nombre: c.nombre || `Cancha ${i + 1}`,
          tipo: c.tipo ?? 'Cristal',
          indoor: c.indoor ?? true,
          precioTurno: c.precioTurno ?? 0,
          horarios: c.horarios ?? null,
          activo: true,
        },
      })
    })

    // Desactivar las que ya no están en la lista
    const incomingCuids = new Set(canchas.filter((c) => isCuid(c.id)).map((c) => c.id))
    const toDeactivate = [...dbIds].filter((id) => !incomingCuids.has(id))
    const deactivateOps = toDeactivate.map((id) =>
      prisma.cancha.update({ where: { id }, data: { activo: false } })
    )

    await prisma.$transaction([...upsertOps, ...deactivateOps])
    // Devolver canchas activas actualizadas para que el frontend actualice IDs
    const canchasActualizadas = await prisma.cancha.findMany({
      where: { clubId, activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ ok: true, canchas: canchasActualizadas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al sincronizar canchas' })
  }
})

// GET /api/clubs/info   — jugador autenticado obtiene config + canchas de su club
router.get('/info', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.user.clubId },
      include: { canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
    })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

// GET /api/clubs/:slug/disponibilidad?fecha=YYYY-MM-DD  — público, slots ocupados del día para la landing
router.get('/:slug/disponibilidad', async (req, res) => {
  const { fecha } = req.query
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' })

  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, activo: true },
    })
    if (!club || !club.activo) return res.status(404).json({ error: 'Club no encontrado' })

    const reservas = await prisma.reserva.findMany({
      where: {
        clubId: club.id,
        fecha,
        estado: { in: ['pendiente', 'confirmada'] },
      },
      select: { canchaId: true, horaInicio: true, horaFin: true },
    })

    // Incluir TurnoFijos confirmados para ese día de la semana (excluyendo ausencias)
    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS[new Date(fy, fm - 1, fd).getDay()]

    const turnosFijos = await prisma.turnoFijo.findMany({
      where: { clubId: club.id, dia, estado: 'confirmado' },
      select: { canchaId: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
    })

    const slotsTF = turnosFijos
      .filter((t) => !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))
      .map(({ canchaId, horaInicio, horaFin }) => ({ canchaId, horaInicio, horaFin }))

    res.json([...reservas, ...slotsTF])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener disponibilidad' })
  }
})

// GET /api/clubs/:slug   — público, info básica del club + canchas activas para la landing
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, nombre: true, slug: true, logoUrl: true, config: true, activo: true,
        canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } },
      },
    })
    if (!club || !club.activo) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

export default router
