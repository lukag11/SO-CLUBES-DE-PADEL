import { Router } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive } from '../middleware/auth.js'

const router = Router()

const ESTADOS_VALIDOS = ['draft', 'open', 'closed', 'in_progress', 'finished']

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extrae los campos del flyer del body y los devuelve como objeto
const flyerFromBody = (body) => ({
  premioPrimero:  body.premioPrimero  ?? null,
  premioSegundo:  body.premioSegundo  ?? null,
  premioSemifinal: body.premioSemifinal ?? null,
  premioExtra:    body.premioExtra    ?? null,
  whatsapp:       body.whatsapp       ?? null,
  servicios:      body.servicios      ?? null,
  imagenFondo:    body.imagenFondo    ?? null,
})

// Hay al menos un campo de flyer en el body?
const hasFlyer = (body) =>
  ['premioPrimero','premioSegundo','premioSemifinal','premioExtra','whatsapp','servicios','imagenFondo']
    .some((k) => body[k] !== undefined)

// Busca un Jugador por clubId + DNI. Devuelve su id o null.
const findJugadorByDni = async (clubId, dni) => {
  if (!dni || !clubId) return null
  const j = await prisma.jugador.findUnique({ where: { clubId_dni: { clubId, dni: String(dni) } } })
  return j?.id ?? null
}

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
    cupoEsperaPorCategoria, generoPorCategoria,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria, descripcion,
  } = req.body
  const clubId = req.user.clubId

  if (!nombre) return res.status(400).json({ error: 'nombre requerido' })

  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' })
  }
  if (fechaInicio && fechaLimiteInscripcion && fechaLimiteInscripcion > fechaInicio) {
    return res.status(400).json({ error: 'La fecha límite de inscripción debe ser anterior o igual a la fecha de inicio' })
  }

  // Campos flyer → van a personalizacion
  const flyer = hasFlyer(req.body) ? flyerFromBody(req.body) : null

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
        cupoEsperaPorCategoria: cupoEsperaPorCategoria ?? {},
        generoPorCategoria: generoPorCategoria ?? {},
        canchasAsignadas: canchasAsignadas ?? [],
        fechaInicio: fechaInicio ?? null,
        fechaFin: fechaFin ?? null,
        fechaLimiteInscripcion: fechaLimiteInscripcion ?? null,
        diaInicioEliminatoria: diaInicioEliminatoria ?? null,
        horaInicioEliminatoria: horaInicioEliminatoria ?? null,
        descripcion: descripcion ?? '',
        ...(flyer && { personalizacion: flyer }),
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
    cupoEsperaPorCategoria, generoPorCategoria,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria, descripcion,
  } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const fi = fechaInicio ?? torneo.fechaInicio
    const ff = fechaFin    ?? torneo.fechaFin
    const fl = fechaLimiteInscripcion ?? torneo.fechaLimiteInscripcion
    if (fi && ff && ff < fi) {
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' })
    }
    if (fi && fl && fl > fi) {
      return res.status(400).json({ error: 'La fecha límite de inscripción debe ser anterior o igual a la fecha de inicio' })
    }

    // Flyer: mergear con personalizacion existente
    let personalizacionUpdate = undefined
    if (hasFlyer(req.body)) {
      const existing = (torneo.personalizacion && typeof torneo.personalizacion === 'object')
        ? torneo.personalizacion
        : {}
      personalizacionUpdate = { ...existing, ...flyerFromBody(req.body) }
    }

    const updated = await prisma.torneo.update({
      where: { id },
      data: {
        ...(nombre                 !== undefined && { nombre }),
        ...(categorias             !== undefined && { categorias }),
        ...(formato                !== undefined && { formato }),
        ...(genero                 !== undefined && { genero }),
        ...(cupoLibre              !== undefined && { cupoLibre: !!cupoLibre }),
        ...(cuposPorCategoria      !== undefined && { cuposPorCategoria }),
        ...(cupoEspera             !== undefined && { cupoEspera }),
        ...(cupoEsperaPorCategoria !== undefined && { cupoEsperaPorCategoria }),
        ...(generoPorCategoria     !== undefined && { generoPorCategoria }),
        ...(canchasAsignadas       !== undefined && { canchasAsignadas }),
        ...(fechaInicio            !== undefined && { fechaInicio }),
        ...(fechaFin               !== undefined && { fechaFin }),
        ...(fechaLimiteInscripcion !== undefined && { fechaLimiteInscripcion }),
        ...(diaInicioEliminatoria  !== undefined && { diaInicioEliminatoria }),
        ...(horaInicioEliminatoria !== undefined && { horaInicioEliminatoria }),
        ...(descripcion            !== undefined && { descripcion }),
        ...(personalizacionUpdate  !== undefined && { personalizacion: personalizacionUpdate }),
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

    // Mergear con personalizacion existente (preserva campos flyer)
    const existing = (torneo.personalizacion && typeof torneo.personalizacion === 'object')
      ? torneo.personalizacion
      : {}
    const updated = await prisma.torneo.update({
      where: { id },
      data: { personalizacion: { ...existing, ...personalizacion } },
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
  const {
    jugador1, jugador2, jugador1Dni, jugador2Dni,
    categoria, disponibilidad, prefiereMismoDia, sinCompanero,
  } = req.body

  if (!jugador1 || !jugador2 || !categoria) {
    return res.status(400).json({ error: 'jugador1, jugador2 y categoria son requeridos' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const cupoMax     = torneo.cuposPorCategoria?.[categoria] ?? null
    const cupoEsperaMax = torneo.cupoEsperaPorCategoria?.[categoria] ?? 0

    // DNI lookup fuera de la transacción (solo lectura, no afecta atomicidad)
    const [j1Id, j2Id] = await Promise.all([
      findJugadorByDni(torneo.clubId, jugador1Dni),
      sinCompanero ? Promise.resolve(null) : findJugadorByDni(torneo.clubId, jugador2Dni),
    ])

    // Check de cupo + create en una sola transacción serializable para evitar race conditions
    const pareja = await prisma.$transaction(async (tx) => {
      let estadoPareja = 'inscripto'

      if (!torneo.cupoLibre && cupoMax !== null) {
        const [inscriptosEnCat, enEsperaEnCat] = await Promise.all([
          tx.pareja.count({ where: { torneoId, categoria, estado: 'inscripto' } }),
          tx.pareja.count({ where: { torneoId, categoria, estado: 'espera' } }),
        ])
        if (inscriptosEnCat >= cupoMax) {
          if (cupoEsperaMax > 0 && enEsperaEnCat < cupoEsperaMax) {
            estadoPareja = 'espera'
          } else {
            const e = new Error(`Cupo completo para ${categoria}`)
            e.httpStatus = 400
            throw e
          }
        }
      }

      return tx.pareja.create({
        data: {
          torneoId, clubId: torneo.clubId,
          jugador1, jugador2,
          jugador1Dni: jugador1Dni ?? null, jugador2Dni: jugador2Dni ?? null,
          jugador1Id: j1Id, jugador2Id: j2Id,
          sinCompanero: !!sinCompanero, estado: estadoPareja,
          categoria, fecha: new Date().toISOString().slice(0, 10),
          disponibilidad: disponibilidad ?? null, prefiereMismoDia: !!prefiereMismoDia,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    res.status(201).json(pareja)
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al inscribir pareja' })
  }
})

// PATCH /api/torneos/:id/parejas/:pid   — admin edita una pareja inscripta
router.patch('/:id/parejas/:pid', requireAuth, requireRole('admin'), async (req, res) => {
  const { id: torneoId, pid } = req.params
  const {
    jugador1, jugador2, jugador1Dni, jugador2Dni,
    categoria, disponibilidad, prefiereMismoDia, sinCompanero, estado,
  } = req.body

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })

    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    // Re-linkear si cambian los DNIs
    const newJ1Id = (jugador1Dni !== undefined && jugador1Dni !== pareja.jugador1Dni)
      ? await findJugadorByDni(torneo.clubId, jugador1Dni)
      : undefined
    const newJ2Id = (jugador2Dni !== undefined && jugador2Dni !== pareja.jugador2Dni && !sinCompanero)
      ? await findJugadorByDni(torneo.clubId, jugador2Dni)
      : undefined

    const updated = await prisma.pareja.update({
      where: { id: pid },
      data: {
        ...(jugador1         !== undefined && { jugador1 }),
        ...(jugador2         !== undefined && { jugador2 }),
        ...(jugador1Dni      !== undefined && { jugador1Dni }),
        ...(jugador2Dni      !== undefined && { jugador2Dni }),
        ...(newJ1Id          !== undefined && { jugador1Id: newJ1Id }),
        ...(newJ2Id          !== undefined && { jugador2Id: newJ2Id }),
        ...(sinCompanero     !== undefined && { sinCompanero: !!sinCompanero }),
        ...(estado           !== undefined && { estado }),
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

    // Promover primer en espera de esa categoría si había cupo
    if (!torneo.cupoLibre && pareja.estado === 'inscripto') {
      const primerEspera = await prisma.pareja.findFirst({
        where: { torneoId, categoria: pareja.categoria, estado: 'espera' },
        orderBy: { createdAt: 'asc' },
      })
      if (primerEspera) {
        await prisma.pareja.update({ where: { id: primerEspera.id }, data: { estado: 'inscripto' } })
        // Notificar al jugador si tiene cuenta
        if (primerEspera.jugador1Id) {
          await prisma.notificacion.create({
            data: {
              clubId: torneo.clubId,
              jugadorId: primerEspera.jugador1Id,
              tipo: 'torneo_promovido_espera',
              data: { torneoNombre: torneo.nombre, categoria: primerEspera.categoria },
            },
          }).catch(() => {})
        }
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al dar de baja pareja' })
  }
})

// POST /api/torneos/:id/inscribir   — jugador se inscribe solo
router.post('/:id/inscribir', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const { id: torneoId } = req.params
  const {
    jugador1, jugador2, jugador1Dni, jugador2Dni,
    categoria, disponibilidad, prefiereMismoDia, sinCompanero,
  } = req.body

  if (!jugador1 || !jugador2 || !categoria) {
    return res.status(400).json({ error: 'jugador1, jugador2 y categoria son requeridos' })
  }

  try {
    const torneo = await prisma.torneo.findUnique({
      where: { id: torneoId },
      include: { parejas: true },
    })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (torneo.estado !== 'open') {
      return res.status(400).json({ error: 'El torneo no acepta inscripciones' })
    }
    if (torneo.fechaLimiteInscripcion) {
      const limite = new Date(torneo.fechaLimiteInscripcion + 'T23:59:59')
      if (new Date() > limite) {
        return res.status(400).json({ error: 'El período de inscripción ya cerró' })
      }
    }

    const cupoMax     = torneo.cuposPorCategoria?.[categoria] ?? null
    const cupoEsperaMax = torneo.cupoEsperaPorCategoria?.[categoria] ?? 0

    // DNI lookup fuera de la transacción (solo lectura)
    const [j1Id, j2Id] = await Promise.all([
      findJugadorByDni(torneo.clubId, jugador1Dni),
      sinCompanero ? Promise.resolve(null) : findJugadorByDni(torneo.clubId, jugador2Dni),
    ])

    // Check de cupo + create en una sola transacción serializable para evitar race conditions
    const pareja = await prisma.$transaction(async (tx) => {
      let estadoPareja = 'inscripto'

      if (!torneo.cupoLibre && cupoMax !== null) {
        const [inscriptosEnCat, enEsperaEnCat] = await Promise.all([
          tx.pareja.count({ where: { torneoId, categoria, estado: 'inscripto' } }),
          tx.pareja.count({ where: { torneoId, categoria, estado: 'espera' } }),
        ])
        if (inscriptosEnCat >= cupoMax) {
          if (cupoEsperaMax > 0 && enEsperaEnCat < cupoEsperaMax) {
            estadoPareja = 'espera'
          } else {
            const e = new Error(`Cupo completo para ${categoria}. No hay lista de espera disponible.`)
            e.httpStatus = 400
            throw e
          }
        }
      }

      return tx.pareja.create({
        data: {
          torneoId, clubId: torneo.clubId,
          jugador1, jugador2,
          jugador1Dni: jugador1Dni ?? null, jugador2Dni: jugador2Dni ?? null,
          jugador1Id: j1Id, jugador2Id: j2Id,
          sinCompanero: !!sinCompanero, estado: estadoPareja,
          categoria, fecha: new Date().toISOString().slice(0, 10),
          disponibilidad: disponibilidad ?? null, prefiereMismoDia: !!prefiereMismoDia,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    // Notificar al admin del club (fuera de la tx — no crítico)
    prisma.notificacion.create({
      data: {
        clubId: torneo.clubId,
        tipo: 'inscripcion_torneo',
        data: {
          torneoId, torneoNombre: torneo.nombre,
          jugador1, jugador2: sinCompanero ? 'Por definir' : jugador2,
          categoria, estado: pareja.estado,
        },
      },
    }).catch(() => {})

    res.status(201).json(pareja)
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al inscribir' })
  }
})

// PATCH /api/torneos/:id/inscribir/:pid   — jugador edita su inscripción
router.patch('/:id/inscribir/:pid', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const { id: torneoId, pid } = req.params
  const { jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia, sinCompanero } = req.body

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })
    if (pareja.jugador1Id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

    // Re-linkear jugador2 si cambia el DNI y deja de ser sinCompanero
    let newJ2Id = undefined
    if (jugador2Dni !== undefined && !sinCompanero) {
      const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
      newJ2Id = await findJugadorByDni(torneo.clubId, jugador2Dni)
    }

    const updated = await prisma.pareja.update({
      where: { id: pid },
      data: {
        ...(jugador2         !== undefined && { jugador2 }),
        ...(jugador2Dni      !== undefined && { jugador2Dni }),
        ...(newJ2Id          !== undefined && { jugador2Id: newJ2Id }),
        ...(sinCompanero     !== undefined && { sinCompanero: !!sinCompanero }),
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
router.delete('/:id/inscribir/:pid', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const { id: torneoId, pid } = req.params

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })
    if (pareja.jugador1Id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

    await prisma.pareja.delete({ where: { id: pid } })

    // Si era inscripto (no espera), promover al primer en espera de esa categoría
    if (pareja.estado === 'inscripto') {
      const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
      if (torneo && !torneo.cupoLibre) {
        const primerEspera = await prisma.pareja.findFirst({
          where: { torneoId, categoria: pareja.categoria, estado: 'espera' },
          orderBy: { createdAt: 'asc' },
        })
        if (primerEspera) {
          await prisma.pareja.update({ where: { id: primerEspera.id }, data: { estado: 'inscripto' } })
          if (primerEspera.jugador1Id) {
            await prisma.notificacion.create({
              data: {
                clubId: torneo.clubId,
                jugadorId: primerEspera.jugador1Id,
                tipo: 'torneo_promovido_espera',
                data: { torneoNombre: torneo.nombre, categoria: primerEspera.categoria },
              },
            }).catch(() => {})
          }
        }
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cancelar inscripción' })
  }
})

export default router
