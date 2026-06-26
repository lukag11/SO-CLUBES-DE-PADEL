import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'
import { runSerializable } from '../lib/serializable.js'
import { hoyArgStr } from '../lib/tiempo.js'
import { normalizarCategoria } from '../lib/categorias.js'

// "Busco jugador" (matching de partido, en el bloque Reservas): un jugador con una reserva busca
// los que le faltan para completar el partido (4 jugadores). Se notifica a su categoría; los que
// dicen "¡Voy!" ocupan un cupo (roster). Al llenarse → estado 'completa' + notif "¡Ya estamos todos!".
// - busco 'jugador' → cupos elegibles 1-3.  busco 'pareja' → cupos = 2 fijo (una pareja rival).
const router = Router()

// Cupos según modalidad: pareja siempre 2; jugador entre 1 y 3 (default 1).
const cuposDe = (busco, raw) => (busco === 'pareja' ? 2 : Math.min(3, Math.max(1, parseInt(raw, 10) || 1)))

// POST /api/solicitudes — crear una búsqueda. Notifica a la categoría + arma mensaje de WhatsApp.
router.post('/', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const solicitanteId = req.user.id
  const { categoria, fecha, horaInicio, nota, busco, reservaId } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return res.status(400).json({ error: 'Fecha inválida' })
  if (!/^\d{1,2}:\d{2}$/.test(horaInicio || '')) return res.status(400).json({ error: 'Horario inválido' })
  if (fecha < hoyArgStr()) return res.status(400).json({ error: 'La fecha ya pasó' })
  const buscoOk = busco === 'pareja' ? 'pareja' : 'jugador'
  const cupos = cuposDe(buscoOk, req.body?.cupos)
  try {
    const sol = await prisma.jugador.findUnique({ where: { id: solicitanteId }, select: { nombre: true, apellido: true, categoria: true } })
    // Red defensiva: llevamos la categoría al formato canónico ("4ta Categoría") por si
    // un cliente viejo manda el formato corto ("4ta"/"4ª") — así el match no falla.
    const cat = normalizarCategoria(categoria || sol?.categoria)
    const solicitud = await prisma.solicitudJugador.create({
      data: { clubId, solicitanteId, busco: buscoOk, cupos, reservaId: reservaId || null, categoria: cat, fecha, horaInicio: horaInicio.padStart(5, '0'), nota: nota?.toString().trim() || null },
    })
    // Notificar a los jugadores de esa categoría (menos al solicitante)
    let notificados = 0
    if (cat) {
      const jugadores = await prisma.jugador.findMany({ where: { clubId, activo: true, categoria: cat, id: { not: solicitanteId } }, select: { id: true } })
      if (jugadores.length) {
        await prisma.notificacion.createMany({
          data: jugadores.map((j) => ({ clubId, jugadorId: j.id, tipo: 'busca_jugador', data: { solicitudId: solicitud.id, busco: buscoOk, cupos, categoria: cat, fecha, horaInicio: solicitud.horaInicio, nota: solicitud.nota, solicitante: `${sol.nombre} ${sol.apellido}` } })),
        })
        notificados = jugadores.length
      }
    }
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
    const queFalta = buscoOk === 'pareja'
      ? `*Buscamos una pareja rival${cat ? ` de ${cat}` : ''}*`
      : `*Faltan ${cupos} jugador${cupos > 1 ? 'es' : ''}${cat ? ` de ${cat}` : ''}*`
    const cierre = buscoOk === 'pareja' ? '¿Se prenden con tu compañero? Avisá 👇' : '¿Te sumás? Avisá 👇'
    const mensajeWhatsapp = `🎾 ${queFalta} en ${club?.nombre || 'el club'}\n📅 ${fecha} · ⏰ ${solicitud.horaInicio}${solicitud.nota ? `\n📝 ${solicitud.nota}` : ''}\n\n${cierre}`
    res.status(201).json({ solicitud, notificados, mensajeWhatsapp })
  } catch (err) {
    console.error('Error crear solicitud:', err.message)
    res.status(500).json({ error: 'No se pudo crear la búsqueda' })
  }
})

// GET /api/solicitudes/abiertas — búsquedas abiertas de MI categoría (para sumarme). No las mías
// ni las que ya me sumé. Devuelve el progreso del roster (cupos / yaVan / faltan).
router.get('/abiertas', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { categoria: true } })
    const sols = await prisma.solicitudJugador.findMany({
      where: {
        clubId, estado: 'abierta', solicitanteId: { not: jugadorId }, fecha: { gte: hoyArgStr() },
        participantes: { none: { jugadorId } }, // si ya me sumé, no me la muestra de nuevo
        ...(yo?.categoria ? { categoria: yo.categoria } : {}),
      },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'desc' }],
      include: { solicitante: { select: { nombre: true, apellido: true } }, participantes: { select: { id: true } } },
    })
    res.json(sols.map((s) => {
      const yaVan = s.participantes.length
      return { id: s.id, busco: s.busco, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio, nota: s.nota, solicitante: `${s.solicitante.nombre} ${s.solicitante.apellido}`, cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan) }
    }))
  } catch (err) {
    console.error('Error solicitudes abiertas:', err.message)
    res.status(500).json({ error: 'Error al obtener las búsquedas' })
  }
})

// GET /api/solicitudes/mias — mis búsquedas + estado + roster (quiénes se sumaron).
router.get('/mias', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const sols = await prisma.solicitudJugador.findMany({
      where: { clubId, solicitanteId: jugadorId },
      orderBy: { createdAt: 'desc' },
      include: {
        cubiertoPor: { select: { nombre: true, apellido: true } },
        participantes: { orderBy: { createdAt: 'asc' }, include: { jugador: { select: { nombre: true, apellido: true } } } },
      },
    })
    res.json(sols.map((s) => {
      const roster = s.participantes.map((p) => `${p.jugador.nombre} ${p.jugador.apellido}`)
      const yaVan = roster.length
      return {
        id: s.id, busco: s.busco, reservaId: s.reservaId, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio,
        nota: s.nota, estado: s.estado, cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan), roster,
        // legacy (1 cupo viejo): si no hay roster nuevo pero sí cubiertoPor, mostrarlo
        cubiertoPor: roster.length ? roster.join(', ') : (s.cubiertoPor ? `${s.cubiertoPor.nombre} ${s.cubiertoPor.apellido}` : null),
      }
    }))
  } catch (err) {
    console.error('Error mis solicitudes:', err.message)
    res.status(500).json({ error: 'Error al obtener tus búsquedas' })
  }
})

// POST /api/solicitudes/:id/voy — ocupar un cupo. Anti-carrera Serializable: nunca se pasa de
// `cupos` participantes. Al completar → estado 'completa' + notif "¡Ya estamos todos!" a todos.
router.post('/:id/voy', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const result = await runSerializable(async (tx) => {
      const s = await tx.solicitudJugador.findFirst({
        where: { id: req.params.id, clubId },
        include: { participantes: { select: { jugadorId: true } } },
      })
      if (!s) throw Object.assign(new Error('Búsqueda no encontrada'), { status: 404 })
      if (s.solicitanteId === jugadorId) throw Object.assign(new Error('Es tu propia búsqueda'), { status: 400 })
      if (s.estado !== 'abierta') throw Object.assign(new Error('El partido ya está completo o se canceló'), { status: 409 })
      if (s.participantes.some((p) => p.jugadorId === jugadorId)) throw Object.assign(new Error('Ya estás anotado en este partido'), { status: 409 })
      if (s.participantes.length >= s.cupos) throw Object.assign(new Error('El partido ya está completo'), { status: 409 })

      await tx.solicitudParticipante.create({ data: { solicitudId: s.id, jugadorId } })
      const yaVan = s.participantes.length + 1
      const completo = yaVan >= s.cupos
      if (completo) await tx.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'completa', cubiertoPorId: jugadorId } })
      return { sol: s, yaVan, completo, participanteIds: s.participantes.map((p) => p.jugadorId) }
    })

    // Notificaciones (fuera de la TX). Si se completó → "¡Ya estamos todos!" a TODO el roster.
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { nombre: true, apellido: true } })
    const nombreYo = `${yo.nombre} ${yo.apellido}`
    const faltan = Math.max(0, result.sol.cupos - result.yaVan)
    if (result.completo) {
      const destinatarios = [...new Set([result.sol.solicitanteId, ...result.participanteIds, jugadorId])]
      await prisma.notificacion.createMany({
        data: destinatarios.map((jid) => ({ clubId, jugadorId: jid, tipo: 'partido_completo', data: { solicitudId: result.sol.id, fecha: result.sol.fecha, horaInicio: result.sol.horaInicio, reservaId: result.sol.reservaId } })),
      })
    } else {
      // Avisar al titular que se sumó alguien y cuántos faltan todavía.
      await prisma.notificacion.create({
        data: { clubId, jugadorId: result.sol.solicitanteId, tipo: 'solicitud_cubierta', data: { solicitudId: result.sol.id, fecha: result.sol.fecha, horaInicio: result.sol.horaInicio, cubiertoPor: nombreYo, faltan } },
      })
    }
    res.json({ ok: true, completo: result.completo, faltan })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo sumar' })
  }
})

// POST /api/solicitudes/:id/cancelar — el solicitante cancela su búsqueda (aunque tenga roster).
router.post('/:id/cancelar', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const s = await prisma.solicitudJugador.findFirst({ where: { id: req.params.id, clubId }, select: { id: true, solicitanteId: true } })
    if (!s) return res.status(404).json({ error: 'Búsqueda no encontrada' })
    if (s.solicitanteId !== jugadorId) return res.status(403).json({ error: 'No es tu búsqueda' })
    await prisma.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'cancelada' } })
    res.json({ ok: true })
  } catch (err) {
    console.error('Error cancelar solicitud:', err.message)
    res.status(500).json({ error: 'No se pudo cancelar' })
  }
})

export default router
