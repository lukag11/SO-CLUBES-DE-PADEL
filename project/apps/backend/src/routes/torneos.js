import { Router } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive, requireFeature, requirePermiso } from '../middleware/auth.js'

const router = Router()

// Reconcilia las deudas de inscripción de una pareja con su estado actual (idempotente).
// Invariante: una deuda pendiente tipo 'torneo' existe SII su jugador es miembro actual de
// una pareja 'inscripto' de un torneo que cobra (precio>0). Los cargos PAGADOS nunca se tocan
// (son ingreso real). soloJ1=true (solo en la inscripción inicial modo guardar_cupo) cobra
// únicamente al que reserva; en ediciones se llama sin soloJ1 → completa a ambos.
const sincronizarDeudaInscripcion = async (torneo, pareja, { soloJ1 = false } = {}) => {
  const miembros = [pareja.jugador1Id, pareja.jugador2Id].filter(Boolean)
  const precio = torneo.precioInscripcion

  // 1) Limpiar deudas PENDIENTES de ex-miembros (ej: cambio de compañero). Las pagadas quedan.
  await prisma.cargo.deleteMany({
    where: {
      parejaId: pareja.id, tipo: 'torneo', estado: 'pendiente',
      ...(miembros.length > 0 ? { jugadorId: { notIn: miembros } } : {}),
    },
  })

  // 2) Sin cobro o pareja no inscripta (espera/suplente) → no debe haber deudas pendientes.
  if (!precio || precio <= 0 || pareja.estado !== 'inscripto') {
    await prisma.cargo.deleteMany({ where: { parejaId: pareja.id, tipo: 'torneo', estado: 'pendiente' } })
    return
  }

  // 3) Agregar las que falten (upsert idempotente; el índice único evita duplicados y race de doble submit).
  const aCobrar = []
  if (pareja.jugador1Id) aCobrar.push(pareja.jugador1Id)
  if (!soloJ1 && pareja.jugador2Id) aCobrar.push(pareja.jugador2Id)
  for (const jugadorId of aCobrar) {
    await prisma.cargo.upsert({
      where: { parejaId_jugadorId_tipo: { parejaId: pareja.id, jugadorId, tipo: 'torneo' } },
      create: {
        clubId: torneo.clubId, jugadorId, parejaId: pareja.id,
        tipo: 'torneo', estado: 'pendiente', monto: precio,
        concepto: `Inscripción ${torneo.nombre} — ${pareja.categoria}`,
      },
      update: {}, // ya existe (pendiente o pagada) → no tocar (precio no es retroactivo)
    }).catch(() => {})
  }
}

const ESTADOS_VALIDOS = ['draft', 'open', 'closed', 'in_progress', 'finished']

const TRANSICIONES_VALIDAS = {
  draft:       ['open'],
  open:        ['closed', 'draft'],
  closed:      ['in_progress', 'open'],
  in_progress: ['finished'],
  finished:    [],
}

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

// Crea una notificación para un jugador solo si tiene cuentaActiva (no molesta a pre-registros).
const notificarJugador = async (jugadorId, clubId, tipo, data) => {
  if (!jugadorId || !clubId) return
  const j = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { cuentaActiva: true } })
  if (!j?.cuentaActiva) return
  prisma.notificacion.create({ data: { clubId, jugadorId, tipo, data } }).catch(() => {})
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
router.post('/', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const {
    nombre, categorias, formato, genero, cupoLibre, cuposPorCategoria, cupoEspera,
    cupoEsperaPorCategoria, generoPorCategoria,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria,
    fechaInicioEliminatoria, fechaInicioQF, horaInicioQF,
    puntosPorVictoria, descripcion, precioInscripcion, modoInscripcion,
  } = req.body
  const clubId = req.user.clubId

  if (!nombre) return res.status(400).json({ error: 'nombre requerido' })
  if (!(Number(precioInscripcion) > 0)) {
    return res.status(400).json({ error: 'El precio de inscripción es obligatorio y debe ser mayor a 0' })
  }

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
        precioInscripcion: Number(precioInscripcion) > 0 ? Math.round(Number(precioInscripcion)) : null,
        modoInscripcion: modoInscripcion === 'guardar_cupo' ? 'guardar_cupo' : 'abierta',
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
        fechaInicioEliminatoria: fechaInicioEliminatoria ?? null,
        fechaInicioQF: fechaInicioQF ?? null,
        horaInicioQF: horaInicioQF ?? null,
        puntosPorVictoria: puntosPorVictoria ?? 2,
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
router.patch('/:id', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const { id } = req.params
  const {
    nombre, categorias, formato, genero, cupoLibre, cuposPorCategoria, cupoEspera,
    cupoEsperaPorCategoria, generoPorCategoria,
    canchasAsignadas, fechaInicio, fechaFin, fechaLimiteInscripcion,
    diaInicioEliminatoria, horaInicioEliminatoria,
    fechaInicioEliminatoria, fechaInicioQF, horaInicioQF,
    puntosPorVictoria, descripcion, precioInscripcion, modoInscripcion,
  } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    if (precioInscripcion !== undefined && !(Number(precioInscripcion) > 0)) {
      return res.status(400).json({ error: 'El precio de inscripción debe ser mayor a 0' })
    }

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
        ...(precioInscripcion      !== undefined && { precioInscripcion: Number(precioInscripcion) > 0 ? Math.round(Number(precioInscripcion)) : null }),
        ...(modoInscripcion        !== undefined && { modoInscripcion: modoInscripcion === 'guardar_cupo' ? 'guardar_cupo' : 'abierta' }),
        ...(cuposPorCategoria      !== undefined && { cuposPorCategoria }),
        ...(cupoEspera             !== undefined && { cupoEspera }),
        ...(cupoEsperaPorCategoria !== undefined && { cupoEsperaPorCategoria }),
        ...(generoPorCategoria     !== undefined && { generoPorCategoria }),
        ...(canchasAsignadas       !== undefined && { canchasAsignadas }),
        ...(fechaInicio            !== undefined && { fechaInicio }),
        ...(fechaFin               !== undefined && { fechaFin }),
        ...(fechaLimiteInscripcion !== undefined && { fechaLimiteInscripcion }),
        ...(diaInicioEliminatoria   !== undefined && { diaInicioEliminatoria }),
        ...(horaInicioEliminatoria  !== undefined && { horaInicioEliminatoria }),
        ...(fechaInicioEliminatoria !== undefined && { fechaInicioEliminatoria }),
        ...(fechaInicioQF           !== undefined && { fechaInicioQF }),
        ...(horaInicioQF            !== undefined && { horaInicioQF }),
        ...(puntosPorVictoria      !== undefined && { puntosPorVictoria: Number(puntosPorVictoria) }),
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
router.patch('/:id/estado', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usar: ${ESTADOS_VALIDOS.join(' | ')}` })
  }

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const permitidos = TRANSICIONES_VALIDAS[torneo.estado] ?? []
    if (!permitidos.includes(estado)) {
      return res.status(422).json({ error: `Transición inválida: ${torneo.estado} → ${estado}` })
    }

    const bulkParejas =
      estado === 'closed'
        ? prisma.pareja.updateMany({ where: { torneoId: id, estado: 'espera' },    data: { estado: 'suplente' } })
        : estado === 'open'
          ? prisma.pareja.updateMany({ where: { torneoId: id, estado: 'suplente' }, data: { estado: 'espera' } })
          : null

    const ops = [
      prisma.torneo.update({
        where: { id },
        data: { estado },
        include: { parejas: { orderBy: { createdAt: 'asc' } } },
      }),
      ...(bulkParejas ? [bulkParejas] : []),
    ]
    const [updated] = await prisma.$transaction(ops)
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar estado' })
  }
})

// PATCH /api/torneos/:id/brackets   — admin guarda brackets por categoría
router.patch('/:id/brackets', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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
router.patch('/:id/grupos', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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
router.patch('/:id/personalizacion', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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

// PATCH /api/torneos/:id/reprogramar   — admin setea nueva fecha (null para cancelar reprogramación)
router.patch('/:id/reprogramar', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const { id } = req.params
  const { fechaReprogramada } = req.body

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.torneo.update({
      where: { id },
      data: { fechaReprogramada: fechaReprogramada ?? null },
    })
    res.json({ id: updated.id, fechaReprogramada: updated.fechaReprogramada })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al reprogramar torneo' })
  }
})

// PATCH /api/torneos/:id/ganadores   — admin registra campeón y subcampeón
router.patch('/:id/ganadores', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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
router.delete('/:id', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const { id } = req.params

  try {
    const torneo = await prisma.torneo.findUnique({ where: { id } })
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (!['draft', 'open'].includes(torneo.estado)) {
      return res.status(400).json({ error: 'Solo se puede eliminar torneos en draft u open' })
    }

    // Limpiar deudas de inscripción PENDIENTES de las parejas del torneo (las pagadas quedan como ingreso).
    // Cargo.parejaId es un String suelto (sin FK), así que no se borra en cascada: hay que hacerlo a mano.
    const parejas = await prisma.pareja.findMany({ where: { torneoId: id }, select: { id: true } })
    if (parejas.length > 0) {
      await prisma.cargo.deleteMany({
        where: { parejaId: { in: parejas.map((p) => p.id) }, tipo: 'torneo', estado: 'pendiente' },
      })
    }

    await prisma.torneo.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar torneo' })
  }
})

// GET /api/torneos/:id/alertas-categoria — admin: "el cut". Marca las parejas anotadas cuyos
// jugadores están PASADOS para la categoría de inscripción (categoría declarada superior, o
// pasado por resultados). Es aviso al admin — NO bloquea la inscripción (decisión de él).
router.get('/:id/alertas-categoria', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  try {
    const { detectarAlertasInscripcion } = await import('../lib/ascenso.js')
    const parejas = await prisma.pareja.findMany({
      where: { torneoId: req.params.id, clubId: req.user.clubId },
      select: { id: true, jugador1: true, jugador2: true, jugador1Dni: true, jugador2Dni: true, categoria: true },
    })
    const alertas = await detectarAlertasInscripcion(req.user.clubId, parejas)
    res.json(alertas)
  } catch (err) {
    console.error('[torneos/alertas-categoria]', err)
    res.status(500).json({ error: 'Error al calcular alertas de categoría' })
  }
})

// POST /api/torneos/:id/parejas   — admin inscribe una pareja
router.post('/:id/parejas', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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

    // Verificar que ningún DNI ya esté en una pareja activa del torneo
    const dnisAVerificarAdmin = [jugador1Dni, ...(!sinCompanero && jugador2Dni ? [jugador2Dni] : [])].filter(Boolean)
    if (dnisAVerificarAdmin.length > 0) {
      const conflicto = await prisma.pareja.findFirst({
        where: { torneoId, OR: dnisAVerificarAdmin.flatMap((d) => [{ jugador1Dni: d }, { jugador2Dni: d }]) },
      })
      if (conflicto) {
        return res.status(409).json({ error: 'Uno de los jugadores ya está inscripto en este torneo.' })
      }
    }

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

    // Notificar a j1 y j2 si tienen cuenta activa (el admin los inscribió)
    const notifDataAlta = { torneoId, torneoNombre: torneo.nombre, categoria, jugador1, jugador2, estado: pareja.estado }
    if (j1Id) notificarJugador(j1Id, torneo.clubId, 'torneo_alta_admin', notifDataAlta)
    if (j2Id) notificarJugador(j2Id, torneo.clubId, 'torneo_alta_admin', notifDataAlta)

    // Deuda de inscripción según modalidad del torneo
    await sincronizarDeudaInscripcion(torneo, pareja, { soloJ1: torneo.modoInscripcion === 'guardar_cupo' })

    res.status(201).json(pareja)
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al inscribir pareja' })
  }
})

// PATCH /api/torneos/:id/parejas/:pid   — admin edita una pareja inscripta
router.patch('/:id/parejas/:pid', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
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

    // Validar cupo al promover de espera/suplente → inscripto
    if (estado === 'inscripto' && ['espera', 'suplente'].includes(pareja.estado)) {
      if (!torneo.cupoLibre) {
        const cupoCat = (torneo.cuposPorCategoria ?? {})[pareja.categoria] ?? null
        if (cupoCat !== null) {
          const confirmados = await prisma.pareja.count({
            where: { torneoId, categoria: pareja.categoria, estado: 'inscripto' },
          })
          if (confirmados >= cupoCat) {
            return res.status(400).json({
              error: `El cupo de ${pareja.categoria} está completo (${confirmados}/${cupoCat}). Ampliá el cupo antes de promover.`,
            })
          }
        }
      }
    }

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
        // Si pasa a "sin compañero", desvincular al j2 (evita deuda colgada + datos inconsistentes)
        ...(sinCompanero === true && { jugador2Id: null, jugador2Dni: null }),
      },
    })

    // Notificar jugadores al promover de espera/suplente → inscripto
    if (estado === 'inscripto' && ['espera', 'suplente'].includes(pareja.estado)) {
      const notifData = { torneoId, torneoNombre: torneo.nombre, categoria: updated.categoria, jugador1: updated.jugador1, jugador2: updated.jugador2 }
      if (updated.jugador1Id) notificarJugador(updated.jugador1Id, torneo.clubId, 'torneo_promovido_espera', notifData)
      if (updated.jugador2Id) notificarJugador(updated.jugador2Id, torneo.clubId, 'torneo_promovido_espera', notifData)
    }

    // Reconciliar deudas de inscripción con el nuevo estado de la pareja (agrega faltantes,
    // borra las de ex-miembros / espera). El reconciliador es la única fuente de verdad.
    await sincronizarDeudaInscripcion(torneo, updated)

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar pareja' })
  }
})

// DELETE /api/torneos/:id/parejas/:pid   — admin da de baja una pareja
router.delete('/:id/parejas/:pid', requireAuth, requireRole('admin'), requireFeature('torneos'), requirePermiso('torneos'), async (req, res) => {
  const { id: torneoId, pid } = req.params

  try {
    const pareja = await prisma.pareja.findUnique({ where: { id: pid } })
    if (!pareja || pareja.torneoId !== torneoId) return res.status(404).json({ error: 'Pareja no encontrada' })

    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })
    if (torneo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    // Borrar deudas de inscripción PENDIENTES de la pareja (las pagadas quedan como ingreso)
    await prisma.cargo.deleteMany({ where: { parejaId: pid, tipo: 'torneo', estado: 'pendiente' } })

    await prisma.pareja.delete({ where: { id: pid } })

    // Notificar a j1 y j2 si tienen cuenta activa (admin los dio de baja)
    const notifDataBaja = { torneoId, torneoNombre: torneo.nombre, categoria: pareja.categoria, jugador1: pareja.jugador1, jugador2: pareja.jugador2 }
    if (pareja.jugador1Id) notificarJugador(pareja.jugador1Id, torneo.clubId, 'torneo_baja_admin', notifDataBaja)
    if (pareja.jugador2Id) notificarJugador(pareja.jugador2Id, torneo.clubId, 'torneo_baja_admin', notifDataBaja)

    // Promover primer en espera de esa categoría si había cupo
    if (!torneo.cupoLibre && pareja.estado === 'inscripto') {
      const primerEspera = await prisma.pareja.findFirst({
        where: { torneoId, categoria: pareja.categoria, estado: 'espera' },
        orderBy: { createdAt: 'asc' },
      })
      if (primerEspera) {
        await prisma.pareja.update({ where: { id: primerEspera.id }, data: { estado: 'inscripto' } })
        // Al promoverse, genera la deuda de inscripción que corresponda
        await sincronizarDeudaInscripcion(torneo, { ...primerEspera, estado: 'inscripto' })
        const notifPromocion = {
          torneoId, torneoNombre: torneo.nombre,
          categoria: primerEspera.categoria,
          jugador1: primerEspera.jugador1,
          jugador2: primerEspera.jugador2,
        }
        if (primerEspera.jugador1Id) notificarJugador(primerEspera.jugador1Id, torneo.clubId, 'torneo_promovido_espera', notifPromocion)
        if (primerEspera.jugador2Id) notificarJugador(primerEspera.jugador2Id, torneo.clubId, 'torneo_promovido_espera', notifPromocion)
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
    jugador2Nombre, jugador2Apellido,
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

    // Verificar que ningún DNI ya esté en una pareja activa del torneo
    const dnisAVerificar = [jugador1Dni, ...(!sinCompanero && jugador2Dni ? [jugador2Dni] : [])].filter(Boolean)
    if (dnisAVerificar.length > 0) {
      const conflicto = await prisma.pareja.findFirst({
        where: { torneoId, OR: dnisAVerificar.flatMap((d) => [{ jugador1Dni: d }, { jugador2Dni: d }]) },
      })
      if (conflicto) {
        return res.status(409).json({ error: 'Uno de los jugadores ya está inscripto en este torneo.' })
      }
    }

    const cupoMax     = torneo.cuposPorCategoria?.[categoria] ?? null
    const cupoEsperaMax = torneo.cupoEsperaPorCategoria?.[categoria] ?? 0

    // DNI lookup fuera de la transacción (solo lectura)
    const [j1Id, j2IdExistente] = await Promise.all([
      findJugadorByDni(torneo.clubId, jugador1Dni),
      sinCompanero ? Promise.resolve(null) : findJugadorByDni(torneo.clubId, jugador2Dni),
    ])

    // Si el compañero no existe y se mandaron nombre+apellido, lo pre-registramos (cuentaActiva: false)
    let j2Id = j2IdExistente
    if (!sinCompanero && jugador2Dni && !j2IdExistente && jugador2Nombre?.trim() && jugador2Apellido?.trim()) {
      try {
        const nuevoJ2 = await prisma.jugador.create({
          data: {
            clubId:       torneo.clubId,
            nombre:       jugador2Nombre.trim(),
            apellido:     jugador2Apellido.trim(),
            dni:          String(jugador2Dni).trim(),
            cuentaActiva: false,
            activo:       true,
          },
        })
        j2Id = nuevoJ2.id
      } catch (e) {
        // Race condition: otro proceso creó el registro antes — re-buscar
        if (e.code === 'P2002') {
          j2Id = await findJugadorByDni(torneo.clubId, jugador2Dni)
        }
        // Cualquier otro error no bloquea la inscripción, j2Id queda null
      }
    }

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

    // Notificar a j2 si tiene cuenta activa (fue inscripto por su compañero)
    if (!sinCompanero && j2Id) {
      notificarJugador(j2Id, torneo.clubId, 'torneo_inscripto_compañero', {
        torneoId, torneoNombre: torneo.nombre, categoria,
        jugador1, jugador2, estado: pareja.estado,
      })
    }

    // Deuda de inscripción según modalidad del torneo
    await sincronizarDeudaInscripcion(torneo, pareja, { soloJ1: torneo.modoInscripcion === 'guardar_cupo' })

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
    const esJ1 = pareja.jugador1Id === req.user.id
    const esJ2 = pareja.jugador2Id === req.user.id
    if (!esJ1 && !esJ2) return res.status(403).json({ error: 'Sin permisos' })
    // j2 solo puede editar disponibilidad y prefiereMismoDia
    if (!esJ1 && esJ2 && (jugador2 !== undefined || jugador2Dni !== undefined || categoria !== undefined || sinCompanero !== undefined)) {
      return res.status(403).json({ error: 'Solo podés editar tu disponibilidad horaria' })
    }

    // Verificar que el nuevo compañero no esté ya en otra pareja del torneo
    if (jugador2Dni !== undefined && jugador2Dni && !sinCompanero) {
      const conflicto = await prisma.pareja.findFirst({
        where: { torneoId, id: { not: pid }, OR: [{ jugador1Dni: jugador2Dni }, { jugador2Dni: jugador2Dni }] },
      })
      if (conflicto) return res.status(409).json({ error: 'Este jugador ya está inscripto en otra pareja del torneo.' })
    }

    const torneo = await prisma.torneo.findUnique({ where: { id: torneoId } })

    // Re-linkear jugador2 si cambia el DNI y deja de ser sinCompanero
    let newJ2Id = undefined
    if (jugador2Dni !== undefined && !sinCompanero) {
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
        // Si pasa a "sin compañero", desvincular al j2 (evita deuda colgada + datos inconsistentes)
        ...(sinCompanero === true && { jugador2Id: null, jugador2Dni: null }),
      },
    })

    // Reconciliar deudas: si cambió el compañero, borra la del viejo y crea la del nuevo.
    await sincronizarDeudaInscripcion(torneo, updated)

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

    // Borrar deudas de inscripción PENDIENTES de la pareja (las pagadas quedan como ingreso)
    await prisma.cargo.deleteMany({ where: { parejaId: pid, tipo: 'torneo', estado: 'pendiente' } })

    await prisma.pareja.delete({ where: { id: pid } })

    // Notificar al admin del club sobre la baja
    const torneoParaBaja = await prisma.torneo.findUnique({ where: { id: torneoId }, select: { clubId: true, nombre: true } })
    if (torneoParaBaja) {
      prisma.notificacion.create({
        data: {
          clubId: torneoParaBaja.clubId,
          tipo: 'baja_torneo',
          data: {
            torneoId, torneoNombre: torneoParaBaja.nombre,
            jugador1: pareja.jugador1, jugador2: pareja.jugador2,
            categoria: pareja.categoria,
          },
        },
      }).catch(() => {})
    }

    // Notificar a j2 si tiene cuenta activa (su compañero canceló la inscripción)
    if (torneoParaBaja && pareja.jugador2Id) {
      notificarJugador(pareja.jugador2Id, torneoParaBaja.clubId, 'torneo_baja_compañero', {
        torneoId, torneoNombre: torneoParaBaja.nombre,
        categoria: pareja.categoria, jugador1: pareja.jugador1,
      })
    }

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
          // Al promoverse, genera la deuda de inscripción que corresponda
          await sincronizarDeudaInscripcion(torneo, { ...primerEspera, estado: 'inscripto' })
          const notifPromocion = {
            torneoId, torneoNombre: torneo.nombre,
            categoria: primerEspera.categoria,
            jugador1: primerEspera.jugador1,
            jugador2: primerEspera.jugador2,
          }
          if (primerEspera.jugador1Id) notificarJugador(primerEspera.jugador1Id, torneo.clubId, 'torneo_promovido_espera', notifPromocion)
          if (primerEspera.jugador2Id) notificarJugador(primerEspera.jugador2Id, torneo.clubId, 'torneo_promovido_espera', notifPromocion)
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
