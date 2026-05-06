import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const ESTADOS_VALIDOS = ['draft', 'open', 'closed', 'in_progress', 'finished']

// GET /api/torneos?clubId=   — público, lista torneos del club
router.get('/', async (req, res) => {
  const { clubId } = req.query
  if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

  try {
    const torneos = await prisma.torneo.findMany({
      where: { clubId },
      include: { parejas: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(torneos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener torneos' })
  }
})

// GET /api/torneos/:id   — público, detalle de un torneo
router.get('/:id', async (req, res) => {
  try {
    const torneo = await prisma.torneo.findUnique({
      where: { id: req.params.id },
      include: { parejas: { orderBy: { createdAt: 'asc' } } },
    })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    res.json(torneo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener torneo' })
  }
})

// POST /api/torneos   — admin crea torneo
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const {
    nombre, categorias, formato, genero, cupoLibre, cuposPorCategoria, cupoEspera,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria, descripcion,
  } = req.body
  const clubId = req.user.clubId

  if (!nombre) return res.status(400).json({ error: 'nombre requerido' })

  try {
    const torneo = await prisma.torneo.create({
      data: {
        clubId,
        nombre,
        categorias: categorias ?? [],
        formato: formato ?? 'Eliminación directa',
        genero: genero ?? 'Masculino',
        estado: 'draft',
        cupoLibre: !!cupoLibre,
        cuposPorCategoria: cuposPorCategoria ?? {},
        cupoEspera: cupoEspera ?? 5,
        canchasAsignadas: canchasAsignadas ?? [],
        fechaInicio: fechaInicio ?? null,
        fechaFin: fechaFin ?? null,
        fechaLimiteInscripcion: fechaLimiteInscripcion ?? null,
        diaInicioEliminatoria: diaInicioEliminatoria ?? null,
        horaInicioEliminatoria: horaInicioEliminatoria ?? null,
        descripcion: descripcion ?? '',
      },
      include: { parejas: true },
    })
    res.status(201).json(torneo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear torneo' })
  }
})

// PATCH /api/torneos/:id   — admin edita campos base del torneo
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const {
    nombre, categorias, formato, genero, cupoLibre, cuposPorCategoria, cupoEspera,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria, descripcion,
  } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: {
        ...(nombre              !== undefined && { nombre }),
        ...(categorias          !== undefined && { categorias }),
        ...(formato             !== undefined && { formato }),
        ...(genero              !== undefined && { genero }),
        ...(cupoLibre           !== undefined && { cupoLibre: !!cupoLibre }),
        ...(cuposPorCategoria   !== undefined && { cuposPorCategoria }),
        ...(cupoEspera          !== undefined && { cupoEspera }),
        ...(canchasAsignadas    !== undefined && { canchasAsignadas }),
        ...(fechaInicio         !== undefined && { fechaInicio }),
        ...(fechaFin            !== undefined && { fechaFin }),
        ...(fechaLimiteInscripcion !== undefined && { fechaLimiteInscripcion }),
        ...(diaInicioEliminatoria  !== undefined && { diaInicioEliminatoria }),
        ...(horaInicioEliminatoria !== undefined && { horaInicioEliminatoria }),
        ...(descripcion         !== undefined && { descripcion }),
      },
      include: { parejas: { orderBy: { createdAt: 'asc' } } },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar torneo' })
  }
})

// PATCH /api/torneos/:id/estado   — admin transiciona estado
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usar: ${ESTADOS_VALIDOS.join(' | ')}` })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { estado },
      include: { parejas: { orderBy: { createdAt: 'asc' } } },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar estado' })
  }
})

// PATCH /api/torneos/:id/brackets   — admin guarda brackets por categoría
router.patch('/:id/brackets', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { brackets } = req.body

  if (!brackets || typeof brackets !== 'object') {
    return res.status(400).json({ error: 'brackets requerido (objeto por categoría)' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { brackets },
    })
    res.json({ id: updated.id, brackets: updated.brackets })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar brackets' })
  }
})

// PATCH /api/torneos/:id/grupos   — admin guarda fase de grupos
router.patch('/:id/grupos', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { grupos } = req.body

  if (!Array.isArray(grupos)) {
    return res.status(400).json({ error: 'grupos requerido (array de zonas)' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { grupos },
    })
    res.json({ id: updated.id, grupos: updated.grupos })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar grupos' })
  }
})

// PATCH /api/torneos/:id/personalizacion   — admin guarda campos visuales
router.patch('/:id/personalizacion', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { personalizacion } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { personalizacion },
    })
    res.json({ id: updated.id, personalizacion: updated.personalizacion })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar personalización' })
  }
})

// PATCH /api/torneos/:id/ganadores   — admin registra campeón y subcampeón
router.patch('/:id/ganadores', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { ganador, subcampeon } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { ganador: ganador ?? null, subcampeon: subcampeon ?? null, estado: 'finished' },
    })
    res.json({ id: updated.id, ganador: updated.ganador, subcampeon: updated.subcampeon, estado: updated.estado })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar ganadores' })
  }
})

// DELETE /api/torneos/:id   — admin elimina torneo (solo draft/open)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (!['draft', 'open'].includes(torneo.estado)) {
      return res.status(400).json({ error: 'Solo se puede eliminar torneos en draft u open' })
    }

    await prisma.torneo.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar torneo' })
  }
})

// POST /api/torneos/:id/parejas   — admin inscribe una pareja
router.post('/:id/parejas', requireAuth, requireRole('admin'), async (req, res) => {
  const { id: torneoId } = req.params
  const { jugador1, jugador2, jugador1Dni, jugador2Dni, categoria, disponibilidad, prefiereMismoDia } = req.body

  if (!jugador1 || !jugador2 || !categoria) {
    return res.status(400).json({ error: 'jugador1, jugador2 y categoria son requeridos' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const pareja = await prisma.pareja.create({
      data: {
        torneoId,
        clubId: torneo.clubId,
        jugador1,
        jugador2,
        jugador1Dni: jugador1Dni ?? null,
        jugador2Dni: jugador2Dni ?? null,
        categoria,
        fecha: new Date().toISOString().slice(0, 10),
        disponibilidad: disponibilidad ?? null,
        prefiereMismoDia: !!prefiereMismoDia,
      },
    })
    res.status(201).json(pareja)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al inscribir pareja' })
  }
})

// PATCH /api/torneos/:id/parejas/:pid   — admin edita una pareja inscripta
router.patch('/:id/parejas/:pid', requireAuth, requireRole('admin'), async (req, res) => {
  const { id: torneoId, pid } = req.params
  const { jugador1, jugador2, jugador1Dni, jugador2Dni, categoria, disponibilidad, prefiereMismoDia } = req.body

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })

    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.pareja.update({
      where: { id: pid },
      data: {
        ...(jugador1         !== undefined && { jugador1 }),
        ...(jugador2         !== undefined && { jugador2 }),
        ...(jugador1Dni      !== undefined && { jugador1Dni }),
        ...(jugador2Dni      !== undefined && { jugador2Dni }),
        ...(categoria        !== undefined && { categoria }),
        ...(disponibilidad   !== undefined && { disponibilidad }),
        ...(prefiereMismoDia !== undefined && { prefiereMismoDia: !!prefiereMismoDia }),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar pareja' })
  }
})

// DELETE /api/torneos/:id/parejas/:pid   — admin da de baja una pareja
router.delete('/:id/parejas/:pid', requireAuth, requireRole('admin'), async (req, res) => {
  const { id: torneoId, pid } = req.params

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })

    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    await prisma.pareja.delete({ where: { id: pid } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al dar de baja pareja' })
  }
})

// POST /api/torneos/:id/inscribir   — jugador se inscribe solo
router.post('/:id/inscribir', requireAuth, requireRole('jugador'), async (req, res) => {
  const { id: torneoId } = req.params
  const { jugador1, jugador2, jugador1Dni, jugador2Dni, categoria, disponibilidad, prefiereMismoDia } = req.body

  if (!jugador1 || !jugador2 || !categoria) {
    return res.status(400).json({ error: 'jugador1, jugador2 y categoria son requeridos' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (!['open'].includes(torneo.estado)) {
      return res.status(400).json({ error: 'El torneo no acepta inscripciones' })
    }

    const pareja = await prisma.pareja.create({
      data: {
        torneoId,
        clubId: torneo.clubId,
        jugador1,
        jugador2,
        jugador1Dni: jugador1Dni ?? null,
        jugador2Dni: jugador2Dni ?? null,
        categoria,
        fecha: new Date().toISOString().slice(0, 10),
        disponibilidad: disponibilidad ?? null,
        prefiereMismoDia: !!prefiereMismoDia,
      },
    })
    res.status(201).json(pareja)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al inscribir' })
  }
})

// PATCH /api/torneos/:id/inscribir/:pid   — jugador edita su inscripción
router.patch('/:id/inscribir/:pid', requireAuth, requireRole('jugador'), async (req, res) => {
  const { id: torneoId, pid } = req.params
  const { jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia } = req.body

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })
    if (pareja.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.pareja.update({
      where: { id: pid },
      data: {
        ...(jugador2         !== undefined && { jugador2 }),
        ...(jugador2Dni      !== undefined && { jugador2Dni }),
        ...(categoria        !== undefined && { categoria }),
        ...(disponibilidad   !== undefined && { disponibilidad }),
        ...(prefiereMismoDia !== undefined && { prefiereMismoDia: !!prefiereMismoDia }),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar inscripción' })
  }
})

// DELETE /api/torneos/:id/inscribir/:pid   — jugador cancela su inscripción
router.delete('/:id/inscribir/:pid', requireAuth, requireRole('jugador'), async (req, res) => {
  const { id: torneoId, pid } = req.params

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })
    if (pareja.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    await prisma.pareja.delete({ where: { id: pid } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cancelar inscripción' })
  }
})

export default router
