import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'
import { runSerializable } from '../lib/serializable.js'
import { hoyArgStr } from '../lib/tiempo.js'
import { normalizarCategoria } from '../lib/categorias.js'

// "Busco un jugador" (caso 2 del matching social): un jugador necesita un cuarto YA para un
// turno suyo. Se notifica a los de su categoría; el primero que dice "voy" la cubre.
const router = Router()

// POST /api/solicitudes — crear una búsqueda. Notifica a la categoría + arma mensaje de WhatsApp.
router.post('/', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const solicitanteId = req.user.id
  const { categoria, fecha, horaInicio, nota, busco, reservaId } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return res.status(400).json({ error: 'Fecha inválida' })
  if (!/^\d{1,2}:\d{2}$/.test(horaInicio || '')) return res.status(400).json({ error: 'Horario inválido' })
  if (fecha < hoyArgStr()) return res.status(400).json({ error: 'La fecha ya pasó' })
  const buscoOk = busco === 'pareja' ? 'pareja' : 'jugador'
  try {
    const sol = await prisma.jugador.findUnique({ where: { id: solicitanteId }, select: { nombre: true, apellido: true, categoria: true } })
    // Red defensiva: llevamos la categoría al formato canónico ("4ta Categoría") por si
    // un cliente viejo manda el formato corto ("4ta"/"4ª") — así el match no falla.
    const cat = normalizarCategoria(categoria || sol?.categoria)
    const solicitud = await prisma.solicitudJugador.create({
      data: { clubId, solicitanteId, busco: buscoOk, reservaId: reservaId || null, categoria: cat, fecha, horaInicio: horaInicio.padStart(5, '0'), nota: nota?.toString().trim() || null },
    })
    // Notificar a los jugadores de esa categoría (menos al solicitante)
    let notificados = 0
    if (cat) {
      const jugadores = await prisma.jugador.findMany({ where: { clubId, activo: true, categoria: cat, id: { not: solicitanteId } }, select: { id: true } })
      if (jugadores.length) {
        await prisma.notificacion.createMany({
          data: jugadores.map((j) => ({ clubId, jugadorId: j.id, tipo: 'busca_jugador', data: { solicitudId: solicitud.id, busco: buscoOk, categoria: cat, fecha, horaInicio: solicitud.horaInicio, nota: solicitud.nota, solicitante: `${sol.nombre} ${sol.apellido}` } })),
        })
        notificados = jugadores.length
      }
    }
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
    const queFalta = buscoOk === 'pareja' ? `*Buscamos una pareja rival${cat ? ` de ${cat}` : ''}*` : `*Falta un jugador${cat ? ` de ${cat}` : ''}*`
    const cierre = buscoOk === 'pareja' ? '¿Se prenden con tu compañero? Avisá 👇' : '¿Te sumás? Avisá 👇'
    const mensajeWhatsapp = `🎾 ${queFalta} en ${club?.nombre || 'el club'}\n📅 ${fecha} · ⏰ ${solicitud.horaInicio}${solicitud.nota ? `\n📝 ${solicitud.nota}` : ''}\n\n${cierre}`
    res.status(201).json({ solicitud, notificados, mensajeWhatsapp })
  } catch (err) {
    console.error('Error crear solicitud:', err.message)
    res.status(500).json({ error: 'No se pudo crear la búsqueda' })
  }
})

// GET /api/solicitudes/abiertas — búsquedas abiertas de MI categoría (para sumarme). No las mías.
router.get('/abiertas', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { categoria: true } })
    const sols = await prisma.solicitudJugador.findMany({
      where: { clubId, estado: 'abierta', solicitanteId: { not: jugadorId }, fecha: { gte: hoyArgStr() }, ...(yo?.categoria ? { categoria: yo.categoria } : {}) },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'desc' }],
      include: { solicitante: { select: { nombre: true, apellido: true } } },
    })
    res.json(sols.map((s) => ({ id: s.id, busco: s.busco, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio, nota: s.nota, solicitante: `${s.solicitante.nombre} ${s.solicitante.apellido}` })))
  } catch (err) {
    console.error('Error solicitudes abiertas:', err.message)
    res.status(500).json({ error: 'Error al obtener las búsquedas' })
  }
})

// GET /api/solicitudes/mias — mis búsquedas + estado (quién la cubrió).
router.get('/mias', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const sols = await prisma.solicitudJugador.findMany({
      where: { clubId, solicitanteId: jugadorId },
      orderBy: { createdAt: 'desc' },
      include: { cubiertoPor: { select: { nombre: true, apellido: true } } },
    })
    res.json(sols.map((s) => ({ id: s.id, busco: s.busco, reservaId: s.reservaId, categoria: s.categoria, fecha: s.fecha, horaInicio: s.horaInicio, nota: s.nota, estado: s.estado, cubiertoPor: s.cubiertoPor ? `${s.cubiertoPor.nombre} ${s.cubiertoPor.apellido}` : null })))
  } catch (err) {
    console.error('Error mis solicitudes:', err.message)
    res.status(500).json({ error: 'Error al obtener tus búsquedas' })
  }
})

// POST /api/solicitudes/:id/voy — cubrir la búsqueda (gana el PRIMERO, anti-carrera Serializable).
router.post('/:id/voy', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const upd = await runSerializable(async (tx) => {
      const s = await tx.solicitudJugador.findFirst({ where: { id: req.params.id, clubId } })
      if (!s) throw Object.assign(new Error('Búsqueda no encontrada'), { status: 404 })
      if (s.solicitanteId === jugadorId) throw Object.assign(new Error('Es tu propia búsqueda'), { status: 400 })
      if (s.estado !== 'abierta') throw Object.assign(new Error('Ya la cubrió otro o se canceló'), { status: 409 })
      return tx.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'cubierta', cubiertoPorId: jugadorId } })
    })
    // Avisar al solicitante que ya tiene su cuarto
    const yo = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { nombre: true, apellido: true } })
    await prisma.notificacion.create({
      data: { clubId, jugadorId: upd.solicitanteId, tipo: 'solicitud_cubierta', data: { solicitudId: upd.id, fecha: upd.fecha, horaInicio: upd.horaInicio, cubiertoPor: `${yo.nombre} ${yo.apellido}` } },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo sumar' })
  }
})

// POST /api/solicitudes/:id/cancelar — el solicitante cancela su búsqueda.
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
