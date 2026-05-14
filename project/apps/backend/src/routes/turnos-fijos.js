import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const crearNotifTurnoFijo = (turno, tipo) => {
  if (!turno.jugadorId) return
  prisma.notificacion.create({
    data: {
      clubId: turno.clubId,
      jugadorId: turno.jugadorId,
      tipo,
      data: {
        canchaNombre: turno.cancha?.nombre ?? '',
        dia: turno.dia,
        horaInicio: turno.horaInicio,
        horaFin: turno.horaFin,
      },
    },
  }).catch(() => {})
}

const INCLUDE_CANCHA = {
  cancha: { select: { id: true, nombre: true, tipo: true, indoor: true } },
  jugador: { select: { id: true, nombre: true, apellido: true, dni: true } },
}

const mapTurno = (t) => ({
  id: t.id,
  clubId: t.clubId,
  canchaId: t.canchaId,
  canchaNombre: t.cancha?.nombre ?? '',
  canchaInfo: t.cancha ? `${t.cancha.tipo ?? 'Padel'} · ${t.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
  jugadorId: t.jugadorId,
  jugador: t.jugador ? `${t.jugador.nombre} ${t.jugador.apellido ?? ''}`.trim() : '',
  jugadorDni: t.jugador?.dni ?? '',
  dia: t.dia,
  inicio: t.horaInicio,
  fin: t.horaFin,
  precio: t.precio,
  estado: t.estado,
  activo: t.estado === 'confirmado',
  diasAusentes: t.diasAusentes ?? [],
  ausenciasPendientes: t.ausenciasPendientes ?? [],
  desde: t.desde,
  notas: t.notas ?? '',
})

// ── GET /slots-ocupados?clubId= — jugador: slots bloqueados por turnos fijos del club (sin datos personales) ──
router.get('/slots-ocupados', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    // El jugador tiene su clubId embebido en el JWT vía el club al que pertenece
    // Lo obtenemos a través de su perfil
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      select: { clubId: true },
    })
    if (!jugador?.clubId) return res.json([])

    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId: jugador.clubId, estado: 'confirmado' },
      select: { canchaId: true, dia: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
    })
    res.json(turnos)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /me — jugador: sus turnos fijos ──────────────────────────────────────
router.get('/me', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const turnos = await prisma.turnoFijo.findMany({
      where: { jugadorId: req.user.id, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /?clubId= — admin: todos los turnos del club ─────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const clubId = req.user.clubId  // siempre del JWT, ignorar query param
    if (!clubId) return res.status(400).json({ error: 'clubId requerido' })

    const turnos = await prisma.turnoFijo.findMany({
      where: { clubId, estado: { not: 'inactivo' } },
      include: INCLUDE_CANCHA,
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    })
    res.json(turnos.map(mapTurno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST / — jugador: solicitar turno fijo ───────────────────────────────────
router.post('/', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const { canchaId, dia, horaInicio, horaFin, precio, notas } = req.body
    if (!canchaId || !dia || !horaInicio || !horaFin) {
      return res.status(400).json({ error: 'canchaId, dia, horaInicio y horaFin son requeridos' })
    }

    // RN-51: no puede haber un turno fijo con horario solapado en la misma cancha el mismo día
    const existentes = await prisma.turnoFijo.findMany({
      where: { canchaId, dia, estado: { in: ['pendiente', 'confirmado'] } },
      select: { horaInicio: true, horaFin: true },
    })
    const toMinBE = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const nsMin = toMinBE(horaInicio), nfMin = toMinBE(horaFin)
    const hayConflicto = existentes.some((t) => {
      const esMin = toMinBE(t.horaInicio), efMin = toMinBE(t.horaFin)
      return esMin < nfMin && nsMin < efMin
    })
    if (hayConflicto) {
      return res.status(409).json({ error: 'Ya existe un turno fijo activo o pendiente en ese horario para esa cancha' })
    }

    const hoy = new Date()
    const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    const turno = await prisma.turnoFijo.create({
      data: {
        clubId: req.user.clubId,
        canchaId,
        jugadorId: req.user.id,
        dia,
        horaInicio,
        horaFin,
        precio: precio ? Number(precio) : null,
        estado: 'pendiente',
        diasAusentes: [],
        ausenciasPendientes: [],
        desde,
        notas: notas ?? null,
      },
      include: INCLUDE_CANCHA,
    })
    res.status(201).json(mapTurno(turno))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH /:id/estado — admin: confirmar | rechazar | dar de baja ─────────────
router.patch('/:id/estado', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { estado } = req.body
    if (!['confirmado', 'inactivo', 'pendiente'].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' })
    }

    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })

    const updated = await prisma.turnoFijo.update({
      where: { id: req.params.id },
      data: { estado },
      include: INCLUDE_CANCHA,
    })

    if (estado === 'confirmado') crearNotifTurnoFijo(updated, 'turno_fijo_confirmado')
    if (estado === 'inactivo') {
      // Si era confirmado → baja permanente. Si era pendiente → rechazo.
      const tipoNotif = turno.estado === 'confirmado' ? 'turno_fijo_baja' : 'turno_fijo_rechazado'
      crearNotifTurnoFijo(updated, tipoNotif)
    }

    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /:id/ausencia — jugador: solicitar ausencia puntual ─────────────────
router.post('/:id/ausencia', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const { fecha } = req.body
    if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' })

    const turno = await prisma.turnoFijo.findUnique({ where: { id: req.params.id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.jugadorId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' })
    if (turno.estado !== 'confirmado') return res.status(400).json({ error: 'Solo se pueden pedir ausencias en turnos confirmados' })

    if (turno.ausenciasPendientes.includes(fecha) || turno.diasAusentes.includes(fecha)) {
      return res.status(409).json({ error: 'La ausencia para esa fecha ya fue registrada' })
    }

    // Política de cancelación: verificar ventana horaria
    const club = await prisma.club.findUnique({ where: { id: turno.clubId }, select: { config: true } })
    const horasMinimas = club?.config?.horasCancelacion ?? 0
    let cargoAplicado = false
    let cargo = null

    if (horasMinimas > 0) {
      const [y, m, d] = fecha.split('-').map(Number)
      const [h, min] = turno.horaInicio.split(':').map(Number)
      const fechaTurno = new Date(y, m - 1, d, h, min)
      const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)

      if (horasRestantes >= 0 && horasRestantes < horasMinimas) {
        cargoAplicado = true
        cargo = await prisma.cargo.create({
          data: {
            clubId: turno.clubId,
            jugadorId: req.user.id,
            concepto: `Ausencia fuera de plazo — turno fijo ${turno.dia} ${turno.horaInicio} (${fecha})`,
            monto: turno.precio ?? 0,
            estado: 'pendiente',
          },
        })

        prisma.notificacion.create({
          data: {
            clubId: turno.clubId,
            jugadorId: req.user.id,
            tipo: 'cargo_cancelacion',
            data: {
              fecha,
              horaInicio: turno.horaInicio,
              horaFin: turno.horaFin,
              monto: turno.precio ?? 0,
              horasMinimas,
            },
          },
        }).catch(() => {})
      }
    }

    const updated = await prisma.turnoFijo.update({
      where: { id: req.params.id },
      data: { ausenciasPendientes: { push: fecha } },
      include: INCLUDE_CANCHA,
    })
    res.json({ ...mapTurno(updated), cargoAplicado, monto: turno.precio ?? 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PATCH /:id/ausencia/:fecha — admin: confirmar o crear ausencia puntual ────
router.patch('/:id/ausencia/:fecha', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id, fecha } = req.params

    const turno = await prisma.turnoFijo.findUnique({ where: { id } })
    if (!turno) return res.status(404).json({ error: 'Turno fijo no encontrado' })
    if (turno.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })

    const eraAusenciaPendiente = turno.ausenciasPendientes.includes(fecha)

    const updated = await prisma.turnoFijo.update({
      where: { id },
      data: {
        diasAusentes: { push: fecha },
        ausenciasPendientes: turno.ausenciasPendientes.filter((f) => f !== fecha),
      },
      include: INCLUDE_CANCHA,
    })

    // Notificar al jugador solo cuando el admin libera directamente (no es una confirmación de solicitud)
    if (!eraAusenciaPendiente && turno.jugadorId) {
      prisma.notificacion.create({
        data: {
          clubId: turno.clubId,
          jugadorId: turno.jugadorId,
          tipo: 'ausencia_admin_directa',
          data: {
            canchaNombre: updated.cancha?.nombre ?? '',
            dia: turno.dia,
            horaInicio: turno.horaInicio,
            horaFin: turno.horaFin,
            fecha,
          },
        },
      }).catch(() => {})
    }

    res.json(mapTurno(updated))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
