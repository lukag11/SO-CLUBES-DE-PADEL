import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'
import { runSerializable } from '../lib/serializable.js'
import { cancelarConvocatoria, crearConvocatoriaCompleta, notificarConvocatoriaCancelada } from '../lib/convocatorias.js'
import { generarFixtureConvocatoria } from '../lib/fixtureConvocatoria.js'
import { gatherDisponibilidad } from '../lib/insight.js'
import { hoyArgStr, ahoraArgHHMM } from '../lib/tiempo.js'

const router = Router()

const resumenCupos = (cupos) => ({
  voy: cupos.filter((c) => c.estado === 'voy').length,
  espera: cupos.filter((c) => c.estado === 'espera').length,
})

// Arma el fixture de una convocatoria con los anotados 'voy' y lo guarda (estado → confirmada).
async function armarFixtureConvocatoria(convocatoriaId) {
  const conv = await prisma.convocatoria.findUnique({
    where: { id: convocatoriaId },
    include: { cupos: { where: { estado: 'voy' }, orderBy: { createdAt: 'asc' }, include: { jugador: { select: { nombre: true, apellido: true, posicion: true } } } } },
  })
  if (!conv) throw Object.assign(new Error('Convocatoria no encontrada'), { status: 404 })
  const jugadores = conv.cupos.map((c) => ({
    nombre: c.jugador ? `${c.jugador.nombre} ${c.jugador.apellido}`.trim() : (c.nombre || 'Jugador'),
    posicion: c.posicion || c.jugador?.posicion || null,
  }))
  if (jugadores.length < 4) throw Object.assign(new Error('Hacen falta al menos 4 anotados para armar el fixture'), { status: 400 })
  const fixture = generarFixtureConvocatoria(conv.modalidad, jugadores, conv.canchas)
  return prisma.convocatoria.update({ where: { id: conv.id }, data: { fixture, estado: 'confirmada' } })
}

// POST /api/convocatorias — el admin abre una convocatoria
router.post('/', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { modalidad, organizadorJugadorId, categorias, genero, fecha, horaInicio, canchas, cupoMax, visibilidad } = req.body || {}
  if (!['americano', 'super8'].includes(modalidad)) return res.status(400).json({ error: 'Modalidad inválida' })
  if (!organizadorJugadorId) return res.status(400).json({ error: 'Elegí el jugador organizador' })
  if (!fecha || !horaInicio || !cupoMax || Number(cupoMax) < 2) return res.status(400).json({ error: 'Faltan campos requeridos (fecha, horario, cupos ≥ 2)' })
  const generoOk = ['masculino', 'femenino', 'mixto'].includes(genero) ? genero : null
  try {
    const r = await crearConvocatoriaCompleta({
      clubId,
      organizadorJugadorId,
      modalidad,
      fecha,
      horaInicio,
      categorias: Array.isArray(categorias) ? categorias.map((c) => `${c}`.trim()).filter(Boolean) : [],
      genero: generoOk,
      cupoMax: parseInt(cupoMax, 10),
      canchas: canchas ? parseInt(canchas, 10) : 1,
      visibilidad,
    })
    res.status(201).json(r)
  } catch (err) {
    console.error('Error crear convocatoria:', err.message)
    res.status(err.status === 409 ? 409 : 500).json({ error: err.message || 'No se pudo crear la convocatoria' })
  }
})

// DELETE /api/convocatorias/:id — el admin elimina (limpieza). Libera las canchas antes de borrar.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId } })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    // Avisar a los anotados ANTES de borrar (después no quedan los cupos para notificar).
    await notificarConvocatoriaCancelada(clubId, c, req.query.motivo || null)
    await prisma.reserva.updateMany({ where: { convocatoriaId: c.id, estado: { not: 'cancelada' } }, data: { estado: 'cancelada' } })
    await prisma.convocatoria.delete({ where: { id: c.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error('Error eliminar convocatoria:', err.message)
    res.status(500).json({ error: 'No se pudo eliminar' })
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

// GET /api/convocatorias/slots-libres?fecha=YYYY-MM-DD&canchas=2 — franjas donde hay ≥N canchas
// libres ese día (para el form de crear: el admin elige fecha y ve los horarios posibles).
router.get('/slots-libres', requireRole('admin', 'jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const { fecha } = req.query
  const n = Math.max(1, parseInt(req.query.canchas, 10) || 2)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return res.status(400).json({ error: 'Fecha inválida' })
  if (fecha < hoyArgStr()) return res.json({ fecha, canchas: n, slots: [] }) // fecha pasada → sin franjas
  try {
    const disp = await gatherDisponibilidad(clubId, fecha) // { libres: [{ cancha, horas }] }
    const cont = {}
    for (const c of disp.libres) for (const h of c.horas) cont[h] = (cont[h] || 0) + 1
    // Si la fecha es HOY, descartar las franjas cuyo horario ya pasó (igual que un turno normal).
    const minHora = fecha === hoyArgStr() ? ahoraArgHHMM() : null
    const slots = Object.entries(cont)
      .filter(([, k]) => k >= n)
      .map(([h]) => h)
      .filter((h) => !minHora || h > minHora)
      .sort()
    res.json({ fecha, canchas: n, slots })
  } catch (err) {
    console.error('Error slots-libres:', err.message)
    res.status(500).json({ error: 'Error al calcular disponibilidad' })
  }
})

// GET /api/convocatorias/canchas-activas — cuántas canchas activas tiene el club (tope para el form)
router.get('/canchas-activas', requireRole('admin', 'jugador'), async (req, res) => {
  try {
    const total = await prisma.cancha.count({ where: { clubId: req.user.clubId, activo: true } })
    res.json({ total })
  } catch (err) {
    console.error('Error canchas-activas:', err.message)
    res.status(500).json({ error: 'Error al contar canchas' })
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
        return { id: conv.id, modalidad: conv.modalidad, categorias: conv.categorias, fecha: conv.fecha, horaInicio: conv.horaInicio, cupoMax: conv.cupoMax, estado: conv.estado, voy, miEstado: c.estado, soyOrganizador: conv.createdBy === req.user.id }
      })
    res.json(out)
  } catch (err) {
    console.error('Error mis convocatorias:', err.message)
    res.status(500).json({ error: 'Error al obtener tus eventos' })
  }
})

// POST /api/convocatorias/mias — el JUGADOR organiza su propio evento (Fase B).
// Reusa toda la maquinaria de Fase A: reserva las canchas a su nombre AL CREAR (atómico),
// y queda auto-anotado. Anti-abuso: máximo 1 evento activo organizado por él.
router.post('/mias', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  const { modalidad, categorias, genero, fecha, horaInicio, canchas, cupoMax, visibilidad } = req.body || {}
  if (!['americano', 'super8'].includes(modalidad)) return res.status(400).json({ error: 'Modalidad inválida' })
  if (!fecha || !horaInicio) return res.status(400).json({ error: 'Falta la fecha o el horario' })
  const esSuper8 = modalidad === 'super8'
  const nCanchas = esSuper8 ? 2 : Math.max(2, parseInt(canchas, 10) || 2)
  const nCupos = esSuper8 ? 8 : Math.max(2, parseInt(cupoMax, 10) || 0)
  if (!esSuper8 && nCupos < 2) return res.status(400).json({ error: 'Faltan los cupos del Americano' })
  const generoOk = ['masculino', 'femenino', 'mixto'].includes(genero) ? genero : null
  try {
    // Anti-abuso: 1 evento activo (abierta/confirmada) por jugador organizador.
    const activos = await prisma.convocatoria.count({ where: { clubId, createdBy: jugadorId, estado: { in: ['abierta', 'confirmada'] } } })
    if (activos >= 1) return res.status(409).json({ error: 'Ya tenés un evento activo. Cerralo o cancelalo antes de crear otro.' })

    const r = await crearConvocatoriaCompleta({
      clubId,
      organizadorJugadorId: jugadorId,
      modalidad,
      fecha,
      horaInicio,
      categorias: Array.isArray(categorias) ? categorias.map((c) => `${c}`.trim()).filter(Boolean) : [],
      genero: generoOk,
      cupoMax: nCupos,
      canchas: nCanchas,
      visibilidad,
    })
    // El organizador juega: queda auto-anotado (con su lado de juego si lo tiene).
    const jug = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { posicion: true } })
    await prisma.convocatoriaCupo.create({ data: { convocatoriaId: r.convocatoria.id, jugadorId, posicion: jug?.posicion || null, estado: 'voy' } })
    res.status(201).json(r)
  } catch (err) {
    console.error('Error crear convocatoria jugador:', err.message)
    res.status(err.status === 409 ? 409 : 500).json({ error: err.message || 'No se pudo crear el evento (¿hay canchas libres a esa hora?)' })
  }
})

// POST /api/convocatorias/mias/:id/cancelar — el JUGADOR cancela SU PROPIO evento (organizador).
// Mismo efecto que cancelar un turno, pero masivo: libera las canchas + avisa a los anotados.
router.post('/mias/:id/cancelar', requireRole('jugador'), async (req, res) => {
  const clubId = req.user.clubId
  const jugadorId = req.user.id
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId }, select: { id: true, createdBy: true, estado: true } })
    if (!c) return res.status(404).json({ error: 'Evento no encontrado' })
    if (c.createdBy !== jugadorId) return res.status(403).json({ error: 'Solo el organizador puede cancelar este evento' })
    if (c.estado === 'cancelada') return res.json({ ok: true })
    // Avisa a los anotados menos al propio organizador (que es quien cancela).
    const upd = await cancelarConvocatoria(clubId, c.id, req.body?.motivo || null, jugadorId)
    res.json(upd)
  } catch (err) {
    console.error('Error cancelar evento jugador:', err.message)
    res.status(500).json({ error: 'No se pudo cancelar el evento' })
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
    res.json({ ...c, ...resumenCupos(c.cupos), soyOrganizador: c.createdBy === req.user.id })
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
    // Si el cupo quedó completo, armar el fixture automáticamente (estado → confirmada)
    if (result.estado === 'voy') {
      const c = await prisma.convocatoria.findUnique({ where: { id: req.params.id }, select: { cupoMax: true, estado: true } })
      const voyCount = await prisma.convocatoriaCupo.count({ where: { convocatoriaId: req.params.id, estado: 'voy' } })
      if (c && c.estado === 'abierta' && voyCount >= c.cupoMax) {
        try { await armarFixtureConvocatoria(req.params.id); result.fixtureArmado = true } catch (e) { /* no bloquea el voy */ }
      }
    }
    res.json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo anotar' })
  }
})

// POST /api/convocatorias/:id/armar-fixture — el admin cierra la convocatoria y arma el fixture
// con los anotados (aunque no esté llena; para política "se juega con los que hay").
router.post('/:id/armar-fixture', requireRole('admin'), async (req, res) => {
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId: req.user.clubId } })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    const upd = await armarFixtureConvocatoria(c.id)
    res.json(upd)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo armar el fixture' })
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

// PATCH /api/convocatorias/:id/fixture — guarda el fixture con los resultados cargados.
// Lo puede hacer el ORGANIZADOR (createdBy, rol jugador) o un ADMIN del club. "Scoreboard duty".
router.patch('/:id/fixture', async (req, res) => {
  const clubId = req.user.clubId
  const { fixture } = req.body || {}
  if (!fixture || typeof fixture !== 'object') return res.status(400).json({ error: 'Fixture inválido' })
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId }, select: { id: true, createdBy: true } })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    const esAdmin = req.user.role === 'admin'
    const esOrganizador = req.user.role === 'jugador' && c.createdBy === req.user.id
    if (!esAdmin && !esOrganizador) return res.status(403).json({ error: 'Solo el organizador o el club pueden cargar resultados' })
    const upd = await prisma.convocatoria.update({ where: { id: c.id }, data: { fixture } })
    res.json({ ok: true, fixture: upd.fixture })
  } catch (err) {
    console.error('Error guardar fixture:', err.message)
    res.status(500).json({ error: 'No se pudo guardar el fixture' })
  }
})

// PATCH /api/convocatorias/:id/estado — el admin cambia el estado (ej: cancelar)
router.patch('/:id/estado', requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { estado, motivo } = req.body || {}
  if (!['abierta', 'cancelada', 'confirmada', 'jugada'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
  try {
    const c = await prisma.convocatoria.findFirst({ where: { id: req.params.id, clubId } })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    // Cancelar libera las canchas reservadas del evento (cancela las reservas linkeadas) + avisa.
    if (estado === 'cancelada') {
      const upd = await cancelarConvocatoria(clubId, c.id, motivo || null)
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
