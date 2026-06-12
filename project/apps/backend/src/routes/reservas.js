import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive } from '../middleware/auth.js'
import { normalizarMetodo } from '../lib/metodosPago.js'

const router = Router()

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Cross-midnight aware: si fin <= inicio se asume que cruza medianoche (+1440 al fin)
const rangoMin = (inicio, fin) => {
  const i = toMin(inicio)
  let f = toMin(fin)
  if (f <= i) f += 1440
  return { i, f }
}

const overlaps = (aIni, aFin, bIni, bFin) => {
  const a = rangoMin(aIni, aFin)
  const b = rangoMin(bIni, bFin)
  // Chequeo en espacio extendido de 48h para cubrir cruces de medianoche
  if (a.i < b.f && a.f > b.i) return true
  if (a.i < b.f + 1440 && a.f > b.i + 1440) return true
  if (a.i + 1440 < b.f && a.f + 1440 > b.i) return true
  return false
}

// GET /api/reservas/me   — jugador ve sus propias reservas
router.get('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      where: {
        jugadorId: req.user.id,
        clubId: req.user.clubId,
        esTurnoFijo: false, // los turnos fijos se gestionan via /turnos-fijos
        estado: { not: 'cancelada' },
      },
      include: { cancha: true },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas' })
  }
})

// GET /api/reservas/jugador/:id   — admin ve el historial de reservas eventuales de un jugador
router.get('/jugador/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      where: {
        jugadorId: req.params.id,
        clubId: req.user.clubId,
        esTurnoFijo: false,
        estado: { not: 'cancelada' },
      },
      include: { cancha: { select: { nombre: true } } },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reservas del jugador' })
  }
})

// GET /api/reservas/pendientes   — admin ve todas las reservas pendientes de aprobación
router.get('/pendientes', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      where: {
        clubId: req.user.clubId,
        estado: 'pendiente',
        esTurnoFijo: false,
      },
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas pendientes' })
  }
})

// GET /api/reservas/profesor/mis-clases — profesor ve sus clases (opcionalmente filtradas por fecha)
router.get('/profesor/mis-clases', requireAuth, requireRole('profesor'), async (req, res) => {
  const { fecha } = req.query
  try {
    const where = {
      profesorId: req.user.id,
      clubId: req.user.clubId,
      estado: { not: 'cancelada' },
    }
    if (fecha) where.fecha = fecha
    const reservas = await prisma.reserva.findMany({
      where,
      include: { cancha: true },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener clases del profesor' })
  }
})

// GET /api/reservas/admin/stats?periodo=semana|mes  — estadísticas agregadas para el admin
router.get('/admin/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const { periodo = 'semana' } = req.query
  const clubId = req.user.clubId
  const dias = periodo === 'mes' ? 30 : 7

  const desdeDate = new Date()
  desdeDate.setDate(desdeDate.getDate() - dias)
  const desdeISO = desdeDate.toISOString().split('T')[0]
  const hoyDate = new Date()

  // Día de semana en string → índice JS (getDay): Dom=0, Lun=1 … Sáb=6
  const DIA_IDX = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }

  try {
    const [reservasActivas, canceladas, turnosFijosActivos] = await Promise.all([
      // Reservas eventuales y clases (no turnosFijos) activas en el período
      prisma.reserva.findMany({
        where: {
          clubId,
          fecha: { gte: desdeISO },
          estado: { not: 'cancelada' },
          esTurnoFijo: false,
        },
        select: {
          fecha: true, horaInicio: true, precio: true,
          profesorId: true, jugadorId: true,
          cancha: { select: { nombre: true } },
        },
      }),
      // Reservas canceladas en el período (para el análisis de cancelaciones)
      prisma.reserva.findMany({
        where: { clubId, fecha: { gte: desdeISO }, estado: 'cancelada' },
        select: { horaInicio: true },
      }),
      // TurnosFijos confirmados vigentes (tabla separada — registros recurrentes)
      prisma.turnoFijo.findMany({
        where: { clubId, estado: 'confirmado' },
        select: {
          dia: true, horaInicio: true, diasAusentes: true, desde: true, precio: true,
          cancha: { select: { nombre: true } },
        },
      }),
    ])

    // Separar eventuales y clases
    const eventuales = reservasActivas.filter((r) => !r.profesorId && r.jugadorId)
    const clases     = reservasActivas.filter((r) => !!r.profesorId)

    // Ingresos: reservas eventuales + clases + precio de turnosFijos × ocurrencias en período
    const ingresosReservas = reservasActivas.reduce((acc, r) => acc + (r.precio ?? 0), 0)

    // Heatmap y por-cancha para reservas eventuales y clases
    const heatmapMap = {}
    const canchaMap  = {}

    reservasActivas.forEach((r) => {
      const [y, m, d] = r.fecha.split('-').map(Number)
      const dia  = new Date(y, m - 1, d).getDay()
      const hora = r.horaInicio.substring(0, 5)
      heatmapMap[`${dia}|${hora}`] = (heatmapMap[`${dia}|${hora}`] ?? 0) + 1
      const nombre = r.cancha?.nombre ?? 'Sin cancha'
      canchaMap[nombre] = (canchaMap[nombre] ?? 0) + 1
    })

    // Agregar ocurrencias de TurnosFijos al heatmap, cancha-map e ingresos
    let ingresosTF = 0
    turnosFijosActivos.forEach((tf) => {
      const diaIdx = DIA_IDX[tf.dia]
      if (diaIdx === undefined) return
      const nombre = tf.cancha?.nombre ?? 'Sin cancha'

      // Iterar cada ocurrencia del día dentro del período
      const cursor = new Date(desdeDate)
      while (cursor.getDay() !== diaIdx) cursor.setDate(cursor.getDate() + 1)

      while (cursor <= hoyDate) {
        const fechaISO = cursor.toISOString().split('T')[0]
        const vigente = !tf.desde || fechaISO >= tf.desde
        const ausente = tf.diasAusentes.includes(fechaISO)

        if (vigente && !ausente) {
          const hora = tf.horaInicio.substring(0, 5)
          heatmapMap[`${diaIdx}|${hora}`] = (heatmapMap[`${diaIdx}|${hora}`] ?? 0) + 1
          canchaMap[nombre] = (canchaMap[nombre] ?? 0) + 1
          ingresosTF += tf.precio ?? 0
        }
        cursor.setDate(cursor.getDate() + 7)
      }
    })

    const heatmap = Object.entries(heatmapMap).map(([key, count]) => {
      const [dia, hora] = key.split('|')
      return { dia: Number(dia), hora, count }
    })

    const porCancha = Object.entries(canchaMap)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)

    // Cancelaciones por franja
    const cancelMap = {}
    canceladas.forEach((r) => {
      const hora = r.horaInicio.substring(0, 5)
      cancelMap[hora] = (cancelMap[hora] ?? 0) + 1
    })
    const cancelacionesPorFranja = Object.entries(cancelMap)
      .map(([hora, count]) => ({ hora, count }))
      .sort((a, b) => b.count - a.count)

    res.json({
      periodo,
      desde: desdeISO,
      totales: {
        total: eventuales.length + clases.length + turnosFijosActivos.length,
        eventuales: eventuales.length,
        turnosFijos: turnosFijosActivos.length, // slots fijos activos (no ocurrencias)
        clases: clases.length,
        canceladas: canceladas.length,
        ingresos: ingresosReservas + ingresosTF,
      },
      heatmap,
      porCancha,
      cancelacionesPorFranja,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// GET /api/reservas?fecha=   — clubId siempre del JWT (nunca del query param por seguridad multi-tenant)
router.get('/', requireAuth, async (req, res) => {
  const { fecha } = req.query
  const clubId = req.user.clubId
  if (!clubId) return res.status(400).json({ error: 'clubId no encontrado en token' })

  try {
    const where = { clubId, estado: { not: 'cancelada' } }
    if (fecha) where.fecha = fecha

    const esAdmin = req.user.role === 'admin'
    const reservas = await prisma.reserva.findMany({
      where,
      include: {
        cancha: true,
        // Jugadores solo necesitan saber que el slot está ocupado, sin datos personales de otros
        jugador: esAdmin
          ? { select: { id: true, nombre: true, apellido: true, dni: true } }
          : false,
        profesor: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(reservas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener reservas' })
  }
})

// POST /api/reservas   — jugador crea reserva
router.post('/', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const { canchaId, fecha, horaInicio, horaFin, precio, esTurnoFijo, notas } = req.body
  const clubId = req.user.clubId  // siempre del JWT — nunca del body (aislamiento multi-tenant)
  const jugadorId = req.user.id

  if (!clubId || !canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    // Validar que el turno no haya comenzado ya (Argentina UTC-3, sin DST)
    const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const hoyArg = ahoraArg.toISOString().split('T')[0]
    const horaAhoraArg = ahoraArg.toISOString().substring(11, 16) // 'HH:MM'
    if (fecha === hoyArg && horaInicio <= horaAhoraArg) {
      return res.status(400).json({ error: 'El turno ya comenzó. No podés reservar un turno que ya arrancó.' })
    }

    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS_SEMANA[new Date(fy, fm - 1, fd).getDay()]

    // Check de conflicto + create dentro de $transaction: evita que dos requests simultáneos
    // pasen la validación y creen dos reservas para el mismo slot (TOCTOU race condition).
    const reserva = await prisma.$transaction(async (tx) => {
      const existentes = await tx.reserva.findMany({
        where: { canchaId, fecha, estado: { in: ['pendiente', 'confirmada'] } },
      })
      if (existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))) {
        throw Object.assign(new Error('El horario ya está reservado'), { status: 409 })
      }

      const turnosFijosActivos = await tx.turnoFijo.findMany({
        where: { canchaId, dia, estado: 'confirmado' },
      })
      if (turnosFijosActivos.some(
        (tf) =>
          overlaps(tf.horaInicio, tf.horaFin, horaInicio, horaFin) &&
          !tf.diasAusentes.includes(fecha) &&
          (!tf.desde || tf.desde <= fecha)
      )) {
        throw Object.assign(new Error('Ese horario pertenece a un turno fijo reservado'), { status: 409 })
      }

      return tx.reserva.create({
        data: {
          clubId,
          canchaId,
          jugadorId,
          fecha,
          horaInicio,
          horaFin,
          precio: precio ? parseFloat(precio) : null,
          esTurnoFijo: !!esTurnoFijo,
          tipo: esTurnoFijo ? 'solicitud_fijo' : 'online',
          estado: 'pendiente',
          notas: notas || '',
          jugadores: [],
        },
        include: { cancha: true, jugador: { select: { nombre: true, apellido: true } } },
      })
    })

    // Notificar al admin del club
    const tipo = esTurnoFijo ? 'solicitud_turno_fijo' : 'nueva_reserva'
    prisma.notificacion.create({
      data: {
        clubId,
        jugadorId: null,
        tipo,
        data: {
          jugador: reserva.jugador ? `${reserva.jugador.nombre} ${reserva.jugador.apellido}`.trim() : '',
          canchaNombre: cancha.nombre,
          fecha,
          horaInicio,
          horaFin,
          precio: precio ? parseFloat(precio) : null,
          backendReservaId: reserva.id,
        },
      },
    }).catch(() => {})

    res.status(201).json(reserva)
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Error al crear reserva' })
  }
})

// POST /api/reservas/profesor   — profesor crea una clase en su agenda
router.post('/profesor', requireAuth, requireRole('profesor'), async (req, res) => {
  const { canchaId, fecha, horaInicio, horaFin, precio, notas, jugadores } = req.body
  const { id: profesorId, clubId } = req.user

  if (!canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    // Validar que la clase no haya comenzado ya (Argentina UTC-3, sin DST)
    const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const hoyArg = ahoraArg.toISOString().split('T')[0]
    const horaAhoraArg = ahoraArg.toISOString().substring(11, 16)
    if (fecha === hoyArg && horaInicio <= horaAhoraArg) {
      return res.status(400).json({ error: 'La clase ya comenzó. No podés registrar una clase que ya arrancó.' })
    }

    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    // Verificar que el profesor tenga asignada esa cancha
    const profesor = await prisma.profesor.findUnique({ where: { id: profesorId } })
    if (!profesor || (profesor.canchasIds.length > 0 && !profesor.canchasIds.includes(canchaId))) {
      return res.status(403).json({ error: 'No tenés asignada esa cancha' })
    }

    const existentes = await prisma.reserva.findMany({
      where: { canchaId, fecha, estado: { in: ['pendiente', 'confirmada'] } },
    })
    const hayConflicto = existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflicto) return res.status(409).json({ error: 'El horario ya está reservado' })

    // Verificar solapamiento con TurnosFijos activos
    const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS_SEMANA[new Date(fy, fm - 1, fd).getDay()]
    const turnosFijosActivos = await prisma.turnoFijo.findMany({
      where: { canchaId, dia, estado: 'confirmado' },
    })
    const hayConflictoFijo = turnosFijosActivos.some(
      (tf) =>
        overlaps(tf.horaInicio, tf.horaFin, horaInicio, horaFin) &&
        !tf.diasAusentes.includes(fecha) &&
        (!tf.desde || tf.desde <= fecha)
    )
    if (hayConflictoFijo) return res.status(409).json({ error: 'Ese horario tiene un turno fijo activo de un jugador' })

    // Verificar que el profesor no tenga ya otra clase en ese horario (en cualquier cancha)
    const clasesExistentesProfesor = await prisma.reserva.findMany({
      where: { profesorId, fecha, estado: { not: 'cancelada' } },
    })
    const hayConflictoProfesor = clasesExistentesProfesor.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflictoProfesor) return res.status(409).json({ error: 'Ya tenés una clase en ese horario en otra cancha' })

    const reserva = await prisma.reserva.create({
      data: {
        clubId,
        canchaId,
        profesorId,
        fecha,
        horaInicio,
        horaFin,
        tipo: 'clase',
        estado: 'confirmada',
        precio: precio ? parseFloat(precio) : null,
        jugadores: jugadores ?? [],
        notas: notas || '',
      },
      include: {
        cancha: true,
        profesor: { select: { id: true, nombre: true, apellido: true } },
      },
    })

    // Notificar al admin
    prisma.notificacion.create({
      data: {
        clubId,
        tipo: 'nueva_clase_profesor',
        data: {
          profesorNombre: `${reserva.profesor.nombre} ${reserva.profesor.apellido}`,
          profesorId,
          canchaNombre: reserva.cancha.nombre,
          canchaId,
          fecha,
          horaInicio,
          horaFin,
          reservaId: reserva.id,
        },
      },
    }).catch(() => {})

    res.status(201).json(reserva)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear clase' })
  }
})

// POST /api/reservas/admin/clase-profesor — admin crea una clase en nombre de un profesor
// PATCH /api/reservas/profesor/:id  — profesor edita su propia clase (horario, cancha, notas)
router.patch('/profesor/:id', requireAuth, requireRole('profesor'), async (req, res) => {
  const { id } = req.params
  const { canchaId, horaInicio, horaFin, notas } = req.body
  const { id: profesorId, clubId } = req.user

  if (!canchaId || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== clubId) return res.status(403).json({ error: 'Sin permisos' })
    if (reserva.profesorId !== profesorId) return res.status(403).json({ error: 'Solo podés editar tus propias clases' })
    if (reserva.estado === 'cancelada') return res.status(400).json({ error: 'La clase ya está cancelada' })

    // No permitir editar clases que ya comenzaron
    const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const hoyArg = ahoraArg.toISOString().split('T')[0]
    const horaAhoraArg = ahoraArg.toISOString().substring(11, 16)
    if (reserva.fecha === hoyArg && reserva.horaInicio <= horaAhoraArg) {
      return res.status(400).json({ error: 'La clase ya comenzó y no puede editarse' })
    }

    // Verificar cancha
    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    // Conflictos en la cancha (excluir la propia reserva)
    const existentes = await prisma.reserva.findMany({
      where: { canchaId, fecha: reserva.fecha, estado: { in: ['pendiente', 'confirmada'] }, NOT: { id } },
    })
    if (existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))) {
      return res.status(409).json({ error: 'El horario ya está reservado en esa cancha' })
    }

    // Conflicto con turnos fijos
    const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = reserva.fecha.split('-').map(Number)
    const dia = DIAS_SEMANA[new Date(fy, fm - 1, fd).getDay()]
    const turnosFijosActivos = await prisma.turnoFijo.findMany({ where: { canchaId, dia, estado: 'confirmado' } })
    const hayConflictoFijo = turnosFijosActivos.some(
      (tf) => overlaps(tf.horaInicio, tf.horaFin, horaInicio, horaFin) && !tf.diasAusentes.includes(reserva.fecha) && (!tf.desde || tf.desde <= reserva.fecha)
    )
    if (hayConflictoFijo) return res.status(409).json({ error: 'Ese horario tiene un turno fijo activo de un jugador' })

    // Conflicto con otras clases del mismo profesor (excluir la propia)
    const clasesProfesor = await prisma.reserva.findMany({
      where: { profesorId, fecha: reserva.fecha, estado: { not: 'cancelada' }, NOT: { id } },
    })
    if (clasesProfesor.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))) {
      return res.status(409).json({ error: 'Ya tenés una clase en ese horario en otra cancha' })
    }

    const updated = await prisma.reserva.update({
      where: { id },
      data: { canchaId, horaInicio, horaFin, notas: notas ?? reserva.notas },
      include: { cancha: true, profesor: { select: { id: true, nombre: true, apellido: true } } },
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al editar la clase' })
  }
})

router.post('/admin/clase-profesor', requireAuth, requireRole('admin'), async (req, res) => {
  const { profesorId, canchaId, fecha, horaInicio, horaFin, notas, precio } = req.body
  const clubId = req.user.clubId

  if (!profesorId || !canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    // Verificar que el profesor pertenece al club
    const profesor = await prisma.profesor.findFirst({ where: { id: profesorId, clubId } })
    if (!profesor) return res.status(404).json({ error: 'Profesor no encontrado' })

    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId, activo: true } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    // Verificar solapamiento con reservas existentes
    const existentes = await prisma.reserva.findMany({
      where: { canchaId, fecha, estado: { in: ['pendiente', 'confirmada'] } },
    })
    const hayConflicto = existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflicto) return res.status(409).json({ error: 'El horario ya está ocupado en esa cancha' })

    // Verificar solapamiento con TurnosFijos activos
    const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS_SEMANA[new Date(fy, fm - 1, fd).getDay()]
    const turnosFijosActivos = await prisma.turnoFijo.findMany({
      where: { canchaId, dia, estado: 'confirmado' },
    })
    const hayConflictoFijo = turnosFijosActivos.some(
      (tf) =>
        overlaps(tf.horaInicio, tf.horaFin, horaInicio, horaFin) &&
        !tf.diasAusentes.includes(fecha) &&
        (!tf.desde || tf.desde <= fecha)
    )
    if (hayConflictoFijo) return res.status(409).json({ error: 'Ese horario tiene un turno fijo activo de un jugador' })

    // Verificar que el profesor no tenga ya otra clase en ese horario (en cualquier cancha)
    const clasesExistentesProfesor = await prisma.reserva.findMany({
      where: { profesorId, fecha, estado: { not: 'cancelada' } },
    })
    const hayConflictoProfesor = clasesExistentesProfesor.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflictoProfesor) return res.status(409).json({ error: 'El profesor ya tiene una clase en ese horario en otra cancha' })

    const reserva = await prisma.reserva.create({
      data: {
        clubId,
        canchaId,
        profesorId,
        fecha,
        horaInicio,
        horaFin,
        tipo: 'clase',
        estado: 'confirmada',
        precio: precio ? parseFloat(precio) : null,
        jugadores: [],
        notas: notas || '',
      },
      include: {
        cancha: true,
        profesor: { select: { id: true, nombre: true, apellido: true } },
      },
    })
    res.status(201).json(reserva)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear clase' })
  }
})

// POST /api/reservas/admin   — admin crea reserva manual (bloqueado, clase, etc.)
router.post('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const { canchaId, fecha, horaInicio, horaFin, tipo, jugadores, precio, notas, esTurnoFijo, jugadorId } = req.body
  const clubId = req.user.clubId

  if (!canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  try {
    // Misma restricción que jugador: no crear reserva en turno que ya comenzó
    const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const hoyArg = ahoraArg.toISOString().split('T')[0]
    const horaAhoraArg = ahoraArg.toISOString().substring(11, 16)
    if (fecha === hoyArg && horaInicio <= horaAhoraArg) {
      return res.status(400).json({ error: 'El turno ya comenzó. No se puede registrar una reserva en un turno que ya arrancó.' })
    }

    const cancha = await prisma.cancha.findFirst({ where: { id: canchaId, clubId } })
    if (!cancha) return res.status(404).json({ error: 'Cancha no encontrada' })

    // Validar solapamiento con reservas existentes
    const existentes = await prisma.reserva.findMany({
      where: { canchaId, fecha, estado: { in: ['pendiente', 'confirmada'] } },
    })
    const hayConflicto = existentes.some((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
    if (hayConflicto) return res.status(409).json({ error: 'El horario ya está reservado' })

    // Transacción atómica: Reserva + TurnoFijo deben crearse juntos o ninguno
    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const diaKey = DIAS[new Date(fy, fm - 1, fd).getDay()]

    const reserva = await prisma.$transaction(async (tx) => {
      const newReserva = await tx.reserva.create({
        data: {
          clubId,
          canchaId,
          fecha,
          horaInicio,
          horaFin,
          tipo: tipo || 'manual',
          estado: 'confirmada',
          precio: precio ? parseFloat(precio) : null,
          esTurnoFijo: !!esTurnoFijo,
          jugadores: jugadores ?? [],
          notas: notas || '',
          ...(jugadorId && { jugadorId }),
        },
        include: { cancha: true },
      })

      if (esTurnoFijo && jugadorId) {
        // Re-verificar solapamiento TF dentro de la transacción (protección race condition)
        const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
        const nsMin = toMin(horaInicio), nfMin = toMin(horaFin)
        const tfsDia = await tx.turnoFijo.findMany({
          where: { canchaId, dia: diaKey, estado: { in: ['pendiente', 'confirmado'] } },
          select: { horaInicio: true, horaFin: true },
        })
        const existeTF = tfsDia.some((t) => {
          const esMin = toMin(t.horaInicio), efMin = toMin(t.horaFin)
          return esMin < nfMin && nsMin < efMin
        })

        if (!existeTF) {
          await tx.turnoFijo.create({
            data: {
              clubId,
              canchaId,
              jugadorId,
              dia: diaKey,
              horaInicio,
              horaFin,
              precio: precio ? parseFloat(precio) : null,
              estado: 'confirmado',
              diasAusentes: [],
              diasAusentesJugador: [],
              ausenciasPendientes: [],
              desde: fecha,
              notas: notas || null,
            },
          })
        }
      }

      return newReserva
    })

    // Si es turno fijo con jugador: notificación (fuera de transacción — fire-and-forget)
    if (esTurnoFijo && jugadorId) {
      prisma.notificacion.create({
        data: {
          clubId,
          jugadorId,
          tipo: 'turno_fijo_confirmado',
          data: {
            canchaNombre: reserva.cancha.nombre,
            dia: diaKey,
            horaInicio,
            horaFin,
          },
        },
      }).catch((e) => console.error('[Notif] Error al crear notificacion turno fijo:', e.message))

    } else if (jugadorId && tipo !== 'bloqueado') {
      // Reserva eventual asignada por admin
      prisma.notificacion.create({
        data: {
          clubId,
          jugadorId,
          tipo: 'reserva_admin_manual',
          data: {
            canchaNombre: reserva.cancha.nombre,
            fecha,
            horaInicio,
            horaFin,
          },
        },
      }).catch(() => {})
    }

    res.status(201).json(reserva)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear reserva' })
  }
})

// PATCH /api/reservas/:id/estado   — admin aprueba o cancela
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    // Al confirmar: re-verificar colisiones dentro de transacción para evitar que
    // una reserva previamente cancelada se reactive sobre un slot ya ocupado.
    let updated
    if (estado === 'confirmada') {
      updated = await prisma.$transaction(async (tx) => {
        const solapadas = await tx.reserva.findMany({
          where: { canchaId: reserva.canchaId, fecha: reserva.fecha, estado: { in: ['pendiente', 'confirmada'] }, id: { not: id } },
        })
        if (solapadas.some((r) => overlaps(r.horaInicio, r.horaFin, reserva.horaInicio, reserva.horaFin))) {
          throw Object.assign(new Error('El horario ya fue ocupado por otra reserva. No se puede confirmar.'), { status: 409 })
        }
        return tx.reserva.update({
          where: { id },
          data: { estado },
          include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
        })
      })
    } else {
      updated = await prisma.reserva.update({
        where: { id },
        data: { estado },
        include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
      })
    }

    // Notificar al jugador si la reserva tiene jugadorId
    if (updated.jugadorId && (estado === 'confirmada' || estado === 'cancelada')) {
      if (estado === 'cancelada' && updated.esTurnoFijo) {
        // "Liberar este día": agregar fecha a diasAusentes del TurnoFijo correspondiente
        const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
        const [fy, fm, fd] = updated.fecha.split('-').map(Number)
        const dia = DIAS_SEMANA[new Date(fy, fm - 1, fd).getDay()]

        const turnoFijo = await prisma.turnoFijo.findFirst({
          where: {
            canchaId: updated.canchaId,
            dia,
            jugadorId: updated.jugadorId,
            estado: 'confirmado',
          },
        })

        if (turnoFijo && !turnoFijo.diasAusentes.includes(updated.fecha)) {
          await prisma.turnoFijo.update({
            where: { id: turnoFijo.id },
            data: { diasAusentes: { push: updated.fecha } },
          })
        }

        prisma.notificacion.create({
          data: {
            clubId: updated.clubId,
            jugadorId: updated.jugadorId,
            tipo: 'ausencia_admin_directa',
            data: {
              canchaNombre: updated.cancha.nombre,
              dia,
              fecha: updated.fecha,
              horaInicio: updated.horaInicio,
              horaFin: updated.horaFin,
            },
          },
        }).catch(() => {})
      } else {
        const tipo = estado === 'confirmada' ? 'reserva_confirmada' : 'reserva_cancelada_admin'
        prisma.notificacion.create({
          data: {
            clubId: updated.clubId,
            jugadorId: updated.jugadorId,
            tipo,
            data: {
              canchaNombre: updated.cancha.nombre,
              fecha: updated.fecha,
              horaInicio: updated.horaInicio,
              horaFin: updated.horaFin,
            },
          },
        }).catch(() => {})
      }
    }

    // Admin cancela clase de un profesor → notificar al profesor
    if (estado === 'cancelada' && updated.profesorId && updated.tipo === 'clase') {
      prisma.notificacion.create({
        data: {
          clubId: updated.clubId,
          profesorId: updated.profesorId,
          tipo: 'clase_cancelada_admin',
          data: {
            canchaNombre: updated.cancha?.nombre ?? '',
            canchaId: updated.canchaId,
            fecha: updated.fecha,
            horaInicio: updated.horaInicio,
            horaFin: updated.horaFin,
            reservaId: id,
          },
        },
      }).catch(() => {})
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar reserva' })
  }
})

// PATCH /api/reservas/:id   — admin actualiza campos (notas, precio, jugadores, jugadorId)
// PATCH /api/reservas/:id/pago — admin marca la reserva como pagada/impaga + método
router.patch('/:id/pago', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { pagado, metodoPago } = req.body

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.reserva.update({
      where: { id },
      data: pagado
        ? { pagado: true, pagadoAt: new Date(), metodoPago: normalizarMetodo(metodoPago) }
        : { pagado: false, pagadoAt: null, metodoPago: null },
      include: { cancha: { select: { nombre: true } }, jugador: { select: { id: true, nombre: true, apellido: true } } },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el pago de la reserva' })
  }
})

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { notas, precio, jugadores, tipo, jugadorId } = req.body

  try {
    const reserva = await prisma.reserva.findUnique({ where: { id } })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const updated = await prisma.reserva.update({
      where: { id },
      data: {
        ...(notas      !== undefined && { notas }),
        ...(precio     !== undefined && { precio: precio ? parseFloat(precio) : null }),
        ...(jugadores  !== undefined && { jugadores }),
        ...(tipo       !== undefined && { tipo }),
        ...(jugadorId  !== undefined && { jugadorId: jugadorId || null }),
      },
      include: { cancha: true, jugador: { select: { id: true, nombre: true, apellido: true } } },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar reserva' })
  }
})

// DELETE /api/reservas/:id   — jugador o admin cancela reserva
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  try {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: { cancha: { select: { nombre: true } } },
    })
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
    if (reserva.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    if (!['pendiente', 'confirmada'].includes(reserva.estado)) {
      return res.status(400).json({ error: 'La reserva ya está cancelada' })
    }

    // Profesor solo puede cancelar sus propias clases
    if (req.user.role === 'profesor') {
      if (reserva.profesorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })
      const profData = await prisma.profesor.findUnique({ where: { id: req.user.id }, select: { nombre: true, apellido: true } })
      await prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } })
      // Notificar al admin
      prisma.notificacion.create({
        data: {
          clubId: reserva.clubId,
          tipo: 'cancelacion_clase_profesor',
          data: {
            profesorNombre: profData ? `${profData.nombre} ${profData.apellido}` : '',
            profesorId: req.user.id,
            canchaNombre: reserva.cancha?.nombre ?? '',
            canchaId: reserva.canchaId,
            fecha: reserva.fecha,
            horaInicio: reserva.horaInicio,
            horaFin: reserva.horaFin,
            reservaId: id,
          },
        },
      }).catch(() => {})
      return res.json({ ok: true, cargoAplicado: false })
    }

    // Jugador solo puede cancelar sus propias reservas
    if (req.user.role === 'jugador') {
      if (reserva.jugadorId !== req.user.id) return res.status(403).json({ error: 'Sin permisos' })

      // Política de cancelación: verificar ventana horaria
      const club = await prisma.club.findUnique({ where: { id: reserva.clubId }, select: { config: true } })
      const horasMinimas = club?.config?.horasCancelacion ?? 0

      if (horasMinimas > 0) {
        // Construir datetime del turno interpretando la fecha como Argentina UTC-3 (sin DST)
        const [y, m, d] = reserva.fecha.split('-').map(Number)
        const [h, min] = reserva.horaInicio.split(':').map(Number)
        const fechaTurnoUtc = Date.UTC(y, m - 1, d, h + 3, min)  // +3h para convertir ARG→UTC
        const horasRestantes = (fechaTurnoUtc - Date.now()) / (1000 * 60 * 60)

        if (horasRestantes < 0) {
          return res.status(400).json({ error: 'El turno ya pasó' })
        }

        if (horasRestantes < horasMinimas) {
          // Fuera del plazo: cancelar la reserva
          await prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } })

          // Solo registrar cargo si hay un monto a cobrar
          const montoCargo = reserva.precio ?? 0
          if (montoCargo <= 0) {
            return res.json({ ok: true, cargoAplicado: false })
          }

          const cargo = await prisma.cargo.create({
            data: {
              clubId: reserva.clubId,
              jugadorId: req.user.id,
              reservaId: id,
              concepto: `Cancelación fuera de plazo — ${reserva.fecha} ${reserva.horaInicio}`,
              monto: montoCargo,
              tipo: 'cancelacion',
              estado: 'pendiente',
            },
          })

          // Notificar al jugador del cargo
          prisma.notificacion.create({
            data: {
              clubId: reserva.clubId,
              jugadorId: req.user.id,
              tipo: 'cargo_cancelacion',
              data: {
                fecha: reserva.fecha,
                horaInicio: reserva.horaInicio,
                horaFin: reserva.horaFin,
                monto: reserva.precio ?? 0,
                horasMinimas,
              },
            },
          }).catch(() => {})

          return res.json({ ok: true, cargoAplicado: true, cargo })
        }
      }
    }

    await prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } })

    // Admin cancela clase de un profesor → notificar al profesor
    if (req.user.role === 'admin' && reserva.profesorId && reserva.tipo === 'clase') {
      prisma.notificacion.create({
        data: {
          clubId: reserva.clubId,
          profesorId: reserva.profesorId,
          tipo: 'clase_cancelada_admin',
          data: {
            canchaNombre: reserva.cancha?.nombre ?? '',
            canchaId: reserva.canchaId,
            fecha: reserva.fecha,
            horaInicio: reserva.horaInicio,
            horaFin: reserva.horaFin,
            reservaId: id,
          },
        },
      }).catch(() => {})
    }

    // Notificar al admin si el jugador cancela
    if (req.user.role === 'jugador') {
      const jugador = await prisma.jugador.findUnique({ where: { id: req.user.id }, select: { nombre: true, apellido: true } })
      prisma.notificacion.create({
        data: {
          clubId: reserva.clubId,
          jugadorId: null,
          tipo: 'cancelacion_reserva',
          data: {
            jugador: jugador ? `${jugador.nombre} ${jugador.apellido}`.trim() : '',
            canchaNombre: reserva.cancha?.nombre ?? '',
            fecha: reserva.fecha,
            horaInicio: reserva.horaInicio,
            horaFin: reserva.horaFin,
            backendReservaId: id,
          },
        },
      }).catch(() => {})
    }

    res.json({ ok: true, cargoAplicado: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cancelar reserva' })
  }
})

export default router
