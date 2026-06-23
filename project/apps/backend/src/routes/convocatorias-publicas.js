import { Router } from 'express'
import prisma from '../lib/prisma.js'

// Rutas PÚBLICAS (sin auth) de convocatorias: solo para DESCUBRIR/ver una convocatoria
// (lo que se abre desde el link de WhatsApp). Anotarse ("Voy") va por la ruta autenticada.
const router = Router()

// GET /api/convocatorias/publica/club/:slug — convocatorias ABIERTAS de un club (de hoy en
// adelante) para el hub de descubrimiento. Agregados, sin PII.
router.get('/club/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({ where: { slug: req.params.slug }, select: { id: true, nombre: true } })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    const hoy = new Date()
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const cs = await prisma.convocatoria.findMany({
      where: { clubId: club.id, estado: 'abierta', visibilidad: 'publica', fecha: { gte: hoyStr } },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      include: { cupos: { select: { estado: true } } },
    })
    res.json(cs.map((c) => {
      const voy = c.cupos.filter((x) => x.estado === 'voy').length
      return { id: c.id, modalidad: c.modalidad, categorias: c.categorias, fecha: c.fecha, horaInicio: c.horaInicio, cupoMax: c.cupoMax, voy, lugares: Math.max(0, c.cupoMax - voy) }
    }))
  } catch (err) {
    console.error('Error listar convocatorias públicas:', err.message)
    res.status(500).json({ error: 'Error al listar convocatorias' })
  }
})

// GET /api/convocatorias/publica/:id — datos de una convocatoria para la página pública.
// Devuelve agregados (cupos voy/espera) SIN nombres de los anotados (sin PII).
router.get('/:id', async (req, res) => {
  try {
    const c = await prisma.convocatoria.findUnique({
      where: { id: req.params.id },
      include: {
        club: { select: { nombre: true, slug: true } },
        cupos: { select: { estado: true } },
      },
    })
    if (!c) return res.status(404).json({ error: 'Convocatoria no encontrada' })
    const voy = c.cupos.filter((x) => x.estado === 'voy').length
    const espera = c.cupos.filter((x) => x.estado === 'espera').length
    res.json({
      id: c.id,
      clubId: c.clubId,
      club: c.club?.nombre ?? '',
      clubSlug: c.club?.slug ?? '',
      modalidad: c.modalidad,
      categorias: c.categorias,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      canchas: c.canchas,
      cupoMax: c.cupoMax,
      estado: c.estado,
      deadline: c.deadline,
      notas: c.notas,
      voy,
      espera,
      lugares: Math.max(0, c.cupoMax - voy),
    })
  } catch (err) {
    console.error('Error convocatoria pública:', err.message)
    res.status(500).json({ error: 'Error al obtener la convocatoria' })
  }
})

export default router
