import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'
import { runSerializable } from '../lib/serializable.js'
import { hoyArgStr } from '../lib/tiempo.js'
import { normalizarCategoria } from '../lib/categorias.js'
import { notificarPartidoCancelado } from '../lib/solicitudes.js'

// "Busco jugador" (matching de partido, en el bloque Reservas): un jugador con una reserva busca
// los que le faltan para completar el partido. Los que dicen "¡Voy!" quedan PENDIENTES; el titular
// los acepta/rechaza. Al completar los cupos con aceptados → 'completa' + notif "¡Ya estamos todos!".
// - busco 'jugador' → cupos elegibles 1-3.  busco 'pareja' → cupos = 2 fijo (una pareja rival).
const router = Router()

const cuposDe = (busco, raw) => (busco === 'pareja' ? 2 : Math.min(3, Math.max(1, parseInt(raw, 10) || 1)))
const nombreDe = (j) => `${j.nombre} ${j.apellido}`

// POST /api/solicitudes — crear una búsqueda. Público = avisa a la categoría (in-app); el link existe siempre.
router.post('/', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const solicitanteId = req.user.id
  const { categoria, fecha, horaInicio, nota, busco, reservaId, visibilidad } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return res.status(400).json({ error: 'Fecha inválida' })
  if (!/^\d{1,2}:\d{2}$/.test(horaInicio || '')) return res.status(400).json({ error: 'Horario inválido' })
  if (fecha < hoyArgStr()) return res.status(400).json({ error: 'La fecha ya pasó' })
  const buscoOk = busco === 'pareja' ? 'pareja' : 'jugador'
  const cupos = cuposDe(buscoOk, req.body?.cupos)
  const vis = visibilidad === 'publica' ? 'publica' : 'privada'
  try {
    const sol = await prisma.jugador.findUnique({ where: { id: solicitanteId }, select: { nombre: true, apellido: true, categoria: true } })
    const cat = normalizarCategoria(categoria || sol?.categoria)
    const solicitud = await prisma.solicitudJugador.create({
      data: { clubId, solicitanteId, busco: buscoOk, cupos, visibilidad: vis, reservaId: reservaId || null, categoria: cat, fecha, horaInicio: horaInicio.padStart(5, '0'), nota: nota?.toString().trim() || null },
    })
    // Notificar (in-app) a la categoría SOLO si es público. Privado = solo por link.
    let notificados = 0
    if (cat && vis === 'publica') {
      const jugadores = await prisma.jugador.findMany({ where: { clubId, activo: true, categoria: cat, id: { not: solicitanteId } }, select: { id: true } })
      if (jugadores.length) {
        await prisma.notificacion.createMany({
          data: jugadores.map((j) => ({ clubId, jugadorId: j.id, tipo: 'busca_jugador', data: { solicitudId: solicitud.id, busco: buscoOk, cupos, categoria: cat, fecha, horaInicio: solicitud.horaInicio, nota: solicitud.nota, solicitante: nombreDe(sol) } })),
        })
        notificados = jugadores.length
      }
    }
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
    const queFalta = buscoOk === 'pareja'
      ? `*Buscamos una pareja rival${cat ? ` de ${cat}` : ''}*`
      : `*Faltan ${cupos} jugador${cupos > 1 ? 'es' : ''}${cat ? ` de ${cat}` : ''}*`
    const cierre = buscoOk === 'pareja' ? '¿Se prenden con tu compañero? Avisá 👇' : '¿Te sumás? Avisá 👇'
    const base = process.env.APP_PUBLIC_URL || 'http://localhost:5173'
    const link = `${base}/partido/${solicitud.id}`
    const mensajeWhatsapp = `🎾 ${queFalta} en ${club?.nombre || 'el club'}\n📅 ${fecha} · ⏰ ${solicitud.horaInicio}${solicitud.nota ? `\n📝 ${solicitud.nota}` : ''}\n\n${cierre}\n\n👉 Sumate acá: ${link}`
    res.status(201).json({ solicitud, notificados, mensajeWhatsapp, link })
  } catch (err) {
    console.error('Error crear solicitud:', err.message)
    res.status(500).json({ error: 'No se pudo crear la búsqueda' })
  }
})

// GET /api/solicitudes/abiertas — búsquedas abiertas de MI categoría (para pedir sumarme). No las
// mías ni en las que ya pedí/estoy. faltan = cupos - ACEPTADOS.
router.get('/abiertas', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { categoria: true } })
    const sols = await prisma.solicitudJugador.findMany({
      where: {
        clubId, estado: 'abierta', solicitanteId: { not: jugadorId }, fecha: { gte: hoyArgStr() },
        visibilidad: 'publica', // las privadas son solo por link, no se listan en el feed
        participantes: { none: { jugadorId } }, // si ya pedí (pendiente) o estoy (aceptado), no la muestra
        ...(yo?.categoria ? { categoria: yo.categoria } : {}),
      },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'desc' }],
      include: { solicitante: { select: { nombre: true, apellido: true } }, participantes: { select: { estado: true } } },
    })
    res.json(sols.map((s) => {
      const yaVan = s.participantes.filter((p) => p.estado === 'aceptado').length
      return { id: s.id, busco: s.busco, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio, nota: s.nota, solicitante: nombreDe(s.solicitante), cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan) }
    }))
  } catch (err) {
    console.error('Error solicitudes abiertas:', err.message)
    res.status(500).json({ error: 'Error al obtener las búsquedas' })
  }
})

// GET /api/solicitudes/mias — mis búsquedas + roster (aceptados) + pendientes (para aprobar/rechazar).
router.get('/mias', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const sols = await prisma.solicitudJugador.findMany({
      // Solo búsquedas vigentes: las de turnos ya pasados desaparecen de "Mis búsquedas".
      where: { clubId, solicitanteId: jugadorId, fecha: { gte: hoyArgStr() } },
      orderBy: { createdAt: 'desc' },
      include: {
        cubiertoPor: { select: { nombre: true, apellido: true } },
        participantes: { orderBy: { createdAt: 'asc' }, include: { jugador: { select: { nombre: true, apellido: true } } } },
      },
    })
    res.json(sols.map((s) => {
      const aceptados = s.participantes.filter((p) => p.estado === 'aceptado')
      const pendientes = s.participantes.filter((p) => p.estado === 'pendiente')
      const roster = aceptados.map((p) => nombreDe(p.jugador))
      const yaVan = aceptados.length
      return {
        id: s.id, busco: s.busco, reservaId: s.reservaId, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio,
        nota: s.nota, estado: s.estado, visibilidad: s.visibilidad, cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan), roster,
        pendientes: pendientes.map((p) => ({ jugadorId: p.jugadorId, nombre: nombreDe(p.jugador) })),
        cubiertoPor: roster.length ? roster.join(', ') : (s.cubiertoPor ? nombreDe(s.cubiertoPor) : null),
      }
    }))
  } catch (err) {
    console.error('Error mis solicitudes:', err.message)
    res.status(500).json({ error: 'Error al obtener tus búsquedas' })
  }
})

// GET /api/solicitudes/sumado — partidos donde el jugador fue ACEPTADO (para ver dónde va a jugar,
// aunque no haya reservado él el turno). Incluye organizador + cancha del turno.
router.get('/sumado', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const sols = await prisma.solicitudJugador.findMany({
      where: {
        clubId, estado: { in: ['abierta', 'completa'] }, fecha: { gte: hoyArgStr() },
        participantes: { some: { jugadorId, estado: 'aceptado' } },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      include: {
        solicitante: { select: { nombre: true, apellido: true } },
        participantes: { where: { estado: 'aceptado' }, include: { jugador: { select: { nombre: true, apellido: true } } } },
      },
    })
    // Nombre de cancha del turno atado (reservaId es string suelto → lookup aparte).
    const reservaIds = [...new Set(sols.map((s) => s.reservaId).filter(Boolean))]
    const reservas = reservaIds.length
      ? await prisma.reserva.findMany({ where: { id: { in: reservaIds } }, include: { cancha: { select: { nombre: true } } } })
      : []
    const canchaPorReserva = Object.fromEntries(reservas.map((r) => [r.id, r.cancha?.nombre ?? '']))
    res.json(sols.map((s) => {
      const yaVan = s.participantes.length
      // Con quiénes jugás: el organizador + el resto de aceptados (sin vos mismo).
      const conQuienes = [nombreDe(s.solicitante), ...s.participantes.filter((p) => p.jugadorId !== jugadorId).map((p) => nombreDe(p.jugador))]
      return {
        id: s.id, organizador: nombreDe(s.solicitante), fecha: s.fecha, horaInicio: s.horaInicio,
        categoria: s.categoria, estado: s.estado, cancha: s.reservaId ? (canchaPorReserva[s.reservaId] || '') : '',
        cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan), conQuienes,
      }
    }))
  } catch (err) {
    console.error('Error solicitudes sumado:', err.message)
    res.status(500).json({ error: 'Error al obtener tus partidos' })
  }
})

// POST /api/solicitudes/:id/voy — PEDIR sumarse (queda pendiente de aprobación del titular).
router.post('/:id/voy', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const sol = await runSerializable(async (tx) => {
      const s = await tx.solicitudJugador.findFirst({
        where: { id: req.params.id, clubId },
        include: { participantes: { select: { jugadorId: true, estado: true } } },
      })
      if (!s) throw Object.assign(new Error('Búsqueda no encontrada'), { status: 404 })
      if (s.solicitanteId === jugadorId) throw Object.assign(new Error('Es tu propia búsqueda'), { status: 400 })
      if (s.estado !== 'abierta') throw Object.assign(new Error('El partido ya está completo o se canceló'), { status: 409 })
      if (s.participantes.some((p) => p.jugadorId === jugadorId)) throw Object.assign(new Error('Ya pediste sumarte a este partido'), { status: 409 })
      const aceptados = s.participantes.filter((p) => p.estado === 'aceptado').length
      if (aceptados >= s.cupos) throw Object.assign(new Error('El partido ya está completo'), { status: 409 })
      await tx.solicitudParticipante.create({ data: { solicitudId: s.id, jugadorId, estado: 'pendiente' } })
      return s
    })
    // Avisar al titular que alguien pidió sumarse (lo aprueba desde "Mis búsquedas").
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { nombre: true, apellido: true } })
    await prisma.notificacion.create({
      data: { clubId, jugadorId: sol.solicitanteId, tipo: 'solicitud_pidio_sumarse', data: { solicitudId: sol.id, fecha: sol.fecha, horaInicio: sol.horaInicio, jugador: nombreDe(yo), jugadorId } },
    })
    res.json({ ok: true, pendiente: true })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo pedir sumarse' })
  }
})

// POST /api/solicitudes/:id/aprobar — el titular acepta a un jugador pendiente. Body: { jugadorId }.
router.post('/:id/aprobar', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const titularId = req.user.id
  const { jugadorId } = req.body || {}
  try {
    const result = await runSerializable(async (tx) => {
      const s = await tx.solicitudJugador.findFirst({ where: { id: req.params.id, clubId }, include: { participantes: true } })
      if (!s) throw Object.assign(new Error('Búsqueda no encontrada'), { status: 404 })
      if (s.solicitanteId !== titularId) throw Object.assign(new Error('No es tu partido'), { status: 403 })
      const part = s.participantes.find((p) => p.jugadorId === jugadorId && p.estado === 'pendiente')
      if (!part) throw Object.assign(new Error('Ese jugador no está pendiente'), { status: 404 })
      const aceptados = s.participantes.filter((p) => p.estado === 'aceptado').length
      if (aceptados >= s.cupos) throw Object.assign(new Error('El partido ya está completo'), { status: 409 })
      await tx.solicitudParticipante.update({ where: { id: part.id }, data: { estado: 'aceptado' } })
      const completo = aceptados + 1 >= s.cupos
      if (completo) await tx.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'completa', cubiertoPorId: jugadorId } })
      const aceptadoIds = s.participantes.filter((p) => p.estado === 'aceptado').map((p) => p.jugadorId)
      return { sol: s, completo, aceptadoIds }
    })
    // Avisar al aceptado.
    await prisma.notificacion.create({
      data: { clubId, jugadorId, tipo: 'solicitud_aceptado', data: { solicitudId: result.sol.id, fecha: result.sol.fecha, horaInicio: result.sol.horaInicio } },
    })
    // Si quedó completo → "¡Ya están todos!" a todo el roster + titular.
    if (result.completo) {
      const destinatarios = [...new Set([result.sol.solicitanteId, ...result.aceptadoIds, jugadorId])]
      await prisma.notificacion.createMany({
        data: destinatarios.map((jid) => ({ clubId, jugadorId: jid, tipo: 'partido_completo', data: { solicitudId: result.sol.id, fecha: result.sol.fecha, horaInicio: result.sol.horaInicio, reservaId: result.sol.reservaId } })),
      })
    }
    res.json({ ok: true, completo: result.completo })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo aprobar' })
  }
})

// POST /api/solicitudes/:id/rechazar — el titular rechaza a un jugador pendiente. Body: { jugadorId }.
router.post('/:id/rechazar', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const titularId = req.user.id
  const { jugadorId } = req.body || {}
  try {
    const s = await prisma.solicitudJugador.findFirst({ where: { id: req.params.id, clubId }, select: { id: true, solicitanteId: true, fecha: true, horaInicio: true } })
    if (!s) return res.status(404).json({ error: 'Búsqueda no encontrada' })
    if (s.solicitanteId !== titularId) return res.status(403).json({ error: 'No es tu partido' })
    const del = await prisma.solicitudParticipante.deleteMany({ where: { solicitudId: s.id, jugadorId, estado: 'pendiente' } })
    if (del.count) {
      await prisma.notificacion.create({
        data: { clubId, jugadorId, tipo: 'solicitud_rechazado', data: { solicitudId: s.id, fecha: s.fecha, horaInicio: s.horaInicio } },
      })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Error rechazar:', err.message)
    res.status(500).json({ error: 'No se pudo rechazar' })
  }
})

// POST /api/solicitudes/:id/cancelar — el solicitante cancela su búsqueda (aunque tenga roster).
router.post('/:id/cancelar', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const s = await prisma.solicitudJugador.findFirst({ where: { id: req.params.id, clubId }, include: { participantes: { select: { jugadorId: true } } } })
    if (!s) return res.status(404).json({ error: 'Búsqueda no encontrada' })
    if (s.solicitanteId !== jugadorId) return res.status(403).json({ error: 'No es tu búsqueda' })
    await prisma.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'cancelada' } })
    // Avisar a todos los que se habían sumado (pendientes + aceptados) que el partido se canceló.
    await notificarPartidoCancelado(clubId, s, req.body?.motivo || null)
    res.json({ ok: true })
  } catch (err) {
    console.error('Error cancelar solicitud:', err.message)
    res.status(500).json({ error: 'No se pudo cancelar' })
  }
})

export default router
