import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { hoyArgStr } from '../lib/tiempo.js'

// Rutas PÚBLICAS (sin auth) de partidos abiertos: para VER el lobby desde el link de WhatsApp.
// Solo expone las PÚBLICAS (visibilidad='publica'); las privadas no se ven por acá ni adivinando el id.
// Ocupar un cupo ("¡Voy!") va por la ruta autenticada /api/solicitudes/:id/voy.
const router = Router()

// GET /api/solicitudes/publica/club/:slug — partidos abiertos públicos del club (feed de descubrimiento).
router.get('/club/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({ where: { slug: req.params.slug }, select: { id: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    const ss = await prisma.solicitudJugador.findMany({
      where: { clubId: club.id, estado: 'abierta', visibilidad: 'publica', fecha: { gte: hoyArgStr() } },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      include: { solicitante: { select: { nombre: true, apellido: true } }, participantes: { select: { estado: true } } },
    })
    res.json(ss.map((s) => {
      const yaVan = s.participantes.filter((p) => p.estado === 'aceptado').length
      return { id: s.id, busco: s.busco, categoria: s.categorias.length ? s.categorias.join(' · ') : s.categoria, fecha: s.fecha, horaInicio: s.horaInicio, nota: s.nota, cupos: s.cupos, yaVan, faltan: Math.max(0, s.cupos - yaVan), solicitante: `${s.solicitante.nombre} ${s.solicitante.apellido}` }
    }))
  } catch (err) {
    console.error('Error listar partidos públicos:', err.message)
    res.status(500).json({ error: 'Error al listar partidos' })
  }
})

// GET /api/solicitudes/publica/:id — detalle de un partido para la página pública (lobby).
// Nombres del roster OK (es un partido social que el titular compartió por link).
router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.solicitudJugador.findUnique({
      where: { id: req.params.id },
      include: {
        club: { select: { nombre: true, slug: true } },
        solicitante: { select: { nombre: true, apellido: true } },
        participantes: { orderBy: { createdAt: 'asc' }, include: { jugador: { select: { nombre: true, apellido: true } } } },
      },
    })
    // Por id (link directo) se ve cualquiera, pública o privada — el link es el acceso al lobby.
    // El LISTADO (/club/:slug) sí filtra solo públicas.
    if (!s) return res.status(404).json({ error: 'Partido no encontrado' })
    const roster = s.participantes.filter((p) => p.estado === 'aceptado').map((p) => `${p.jugador.nombre} ${p.jugador.apellido}`)
    const yaVan = roster.length
    res.json({
      id: s.id,
      clubId: s.clubId,
      club: s.club?.nombre ?? '',
      clubSlug: s.club?.slug ?? '',
      busco: s.busco,
      categoria: s.categorias.length ? s.categorias.join(' · ') : s.categoria,
      fecha: s.fecha,
      horaInicio: s.horaInicio,
      nota: s.nota,
      estado: s.estado,
      cupos: s.cupos,
      yaVan,
      faltan: Math.max(0, s.cupos - yaVan),
      roster,
      solicitante: `${s.solicitante.nombre} ${s.solicitante.apellido}`,
    })
  } catch (err) {
    console.error('Error partido público:', err.message)
    res.status(500).json({ error: 'Error al obtener el partido' })
  }
})

export default router
