import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive, requireFeature, requirePermiso } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'
import { reponerStock } from '../lib/stock.js'

const router = Router()

// Enriquece un cargo con el flag `vencido` (mora calculada en lectura, sin cron).
const conVencido = (c) => ({
  ...c,
  vencido: c.estado === 'pendiente' && c.vencimiento != null && new Date(c.vencimiento) < new Date(),
})

const SEL_JUGADOR = { select: { id: true, nombre: true, apellido: true, dni: true } }

// Normaliza un cargo a "deuda" (shape común con los turnos impagos)
const cargoADeuda = (c) => ({
  id: `cargo_${c.id}`, refId: c.id, origen: 'cargo',
  jugador: c.jugador, concepto: c.concepto, monto: c.monto,
  tipo: c.tipo, estado: c.estado,
  vencimiento: c.vencimiento,
  vencido: c.estado === 'pendiente' && c.vencimiento != null && new Date(c.vencimiento) < new Date(),
  metodoPago: c.metodoPago, pagadoAt: c.pagadoAt, fecha: c.createdAt,
})

// turnosImpagosDeuda ahora vive en ../lib/deudas.js (compartido con jugadores.js)

// GET /api/cargos/me — jugador ve su cuenta: cargos + turnos impagos (deuda unificada)
router.get('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const [cargos, turnos, turnosPagados] = await Promise.all([
      prisma.cargo.findMany({
        where: { jugadorId: req.user.id, clubId: req.user.clubId },
        orderBy: { createdAt: 'desc' },
      }),
      turnosImpagosDeuda(req.user.clubId, { jugadorId: req.user.id }),
      // Turnos ya pagados → historial en "Mis pagos"
      prisma.reserva.findMany({
        where: { clubId: req.user.clubId, jugadorId: req.user.id, pagado: true },
        include: { cancha: { select: { nombre: true } } },
        orderBy: { fecha: 'desc' },
      }),
    ])
    const turnosPagadosDeuda = turnosPagados
      .filter((r) => (r.precio ?? 0) > 0)
      .map((r) => ({
        id: `reserva_${r.id}`, refId: r.id, origen: 'reserva',
        concepto: `Turno ${r.cancha?.nombre ?? ''} · ${r.fecha} ${r.horaInicio}`.trim(),
        monto: r.precio ?? 0, tipo: 'reserva', estado: 'pagado',
        vencimiento: null, vencido: false,
        metodoPago: r.metodoPago, pagadoAt: r.pagadoAt, fecha: r.fecha,
      }))
    res.json([...turnos, ...turnosPagadosDeuda, ...cargos.map(cargoADeuda)])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cargos' })
  }
})

// GET /api/cargos — admin lista cargos del club, con filtros opcionales
// ?estado=pendiente|pagado|condonado|vencido  &jugadorId=
router.get('/', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { estado, jugadorId } = req.query
  try {
    // comandaId: null → excluye ítems de comandas/mesas del bar (no son deudas de jugadores)
    const where = { clubId: req.user.clubId, comandaId: null }
    if (jugadorId) where.jugadorId = jugadorId
    if (estado === 'vencido') {
      where.estado = 'pendiente'
      where.vencimiento = { lt: new Date() }
    } else if (['pendiente', 'pagado', 'condonado'].includes(estado)) {
      where.estado = estado
    }

    const cargos = await prisma.cargo.findMany({
      where,
      include: { jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(cargos.map(conVencido))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cargos' })
  }
})

// GET /api/cargos/resumen — totales para las tarjetas de cobranzas
router.get('/resumen', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const pendientes = await prisma.cargo.findMany({
      where: { clubId, estado: 'pendiente', comandaId: null },
      select: { monto: true, vencimiento: true },
    })
    const ahora = new Date()
    const adeudado = pendientes.reduce((s, c) => s + c.monto, 0)
    const vencido = pendientes
      .filter((c) => c.vencimiento != null && new Date(c.vencimiento) < ahora)
      .reduce((s, c) => s + c.monto, 0)

    const pagadosMes = await prisma.cargo.findMany({
      where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioMesArg() }, comandaId: null },
      select: { monto: true },
    })
    const cobradoMes = pagadosMes.reduce((s, c) => s + c.monto, 0)

    res.json({
      adeudado,
      vencido,
      cobradoMes,
      cantPendientes: pendientes.length,
      cantVencidos: pendientes.filter((c) => c.vencimiento != null && new Date(c.vencimiento) < ahora).length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular resumen' })
  }
})

// GET /api/cargos/cobranzas — vista unificada: cargos + turnos impagos pasados
// ?jugadorId=  → scopea a un jugador (para la ficha del drawer)
// Devuelve { deudas, resumen }. Cada deuda lleva origen: 'cargo' | 'reserva'.
router.get('/cobranzas', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  const { jugadorId } = req.query
  const filtroJ = jugadorId ? { jugadorId } : {}
  try {
    const [cargos, turnos, reservasPagadasMes, cargosPagadosMes] = await Promise.all([
      prisma.cargo.findMany({ where: { clubId, comandaId: null, ...filtroJ }, include: { jugador: SEL_JUGADOR }, orderBy: { createdAt: 'desc' } }),
      turnosImpagosDeuda(clubId, filtroJ),
      prisma.reserva.findMany({ where: { clubId, ...filtroJ, pagado: true, pagadoAt: { gte: inicioMesArg() } }, select: { precio: true } }),
      prisma.cargo.findMany({ where: { clubId, comandaId: null, ...filtroJ, estado: 'pagado', pagadoAt: { gte: inicioMesArg() } }, select: { monto: true } }),
    ])

    // Turnos primero (más urgentes), después cargos
    const deudas = [...turnos, ...cargos.map(cargoADeuda)]
    const pendientes = deudas.filter((d) => d.estado === 'pendiente')

    res.json({
      deudas,
      resumen: {
        adeudado: pendientes.reduce((s, d) => s + d.monto, 0),
        vencido: pendientes.filter((d) => d.vencido).reduce((s, d) => s + d.monto, 0),
        cobradoMes:
          reservasPagadasMes.reduce((s, r) => s + (r.precio ?? 0), 0) +
          cargosPagadosMes.reduce((s, c) => s + c.monto, 0),
        cantPendientes: pendientes.length,
        cantVencidos: pendientes.filter((d) => d.vencido).length,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener cobranzas' })
  }
})

// POST /api/cargos — admin crea un cargo manual
router.post('/', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { jugadorId = null, concepto, monto, vencimiento, cobrar, metodoPago } = req.body
  const clubId = req.user.clubId

  if (!concepto?.trim() || monto == null) {
    return res.status(400).json({ error: 'datos_incompletos', message: 'Concepto y monto son requeridos' })
  }
  // jugadorId null = venta de mostrador / casual: debe cobrarse al contado (no puede quedar a cuenta)
  if (!jugadorId && !cobrar) {
    return res.status(400).json({ error: 'mostrador_a_cuenta', message: 'Una venta de mostrador debe cobrarse al contado' })
  }
  const montoNum = Math.round(Number(monto))
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto_invalido', message: 'El monto debe ser mayor a cero' })
  }

  try {
    // Si hay jugador, debe pertenecer al club del admin
    if (jugadorId) {
      const jugador = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { clubId: true } })
      if (!jugador || jugador.clubId !== clubId) {
        return res.status(404).json({ error: 'jugador_no_encontrado', message: 'Jugador no encontrado en este club' })
      }
    }

    const cargo = await prisma.cargo.create({
      data: {
        clubId,
        jugadorId,
        concepto: concepto.trim(),
        monto: montoNum,
        tipo: 'manual',
        estado: cobrar ? 'pagado' : 'pendiente',
        // Si se cobra en el acto: pagado + método; el vencimiento solo aplica si queda pendiente
        ...(cobrar
          ? { pagadoAt: new Date(), metodoPago: normalizarMetodo(metodoPago) }
          : { vencimiento: vencimiento ? new Date(vencimiento) : null }),
      },
      include: { jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } },
    })
    res.status(201).json(conVencido(cargo))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear cargo' })
  }
})

// POST /api/cargos/cobrar-cuenta — cobra varias deudas de un jugador de una (checkout).
// Body: { jugadorId, items: [{ origen:'cargo'|'reserva', refId }], metodoPago }
router.post('/cobrar-cuenta', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { jugadorId, items, metodoPago } = req.body
  const clubId = req.user.clubId
  if (!jugadorId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'datos_incompletos', message: 'Elegí un jugador y al menos una deuda' })
  }
  const metodo = normalizarMetodo(metodoPago)
  const cargoIds = items.filter((i) => i.origen === 'cargo').map((i) => i.refId)
  const reservaIds = items.filter((i) => i.origen === 'reserva').map((i) => i.refId)

  try {
    const jugador = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { clubId: true } })
    if (!jugador || jugador.clubId !== clubId) {
      return res.status(404).json({ error: 'Jugador no encontrado en este club' })
    }
    const now = new Date()
    // updateMany scopeado por clubId+jugadorId+pendiente: no cobra nada que no corresponda
    await prisma.$transaction([
      ...(cargoIds.length ? [prisma.cargo.updateMany({
        where: { id: { in: cargoIds }, clubId, jugadorId, estado: 'pendiente' },
        data: { estado: 'pagado', pagadoAt: now, metodoPago: metodo },
      })] : []),
      ...(reservaIds.length ? [prisma.reserva.updateMany({
        where: { id: { in: reservaIds }, clubId, jugadorId, pagado: false },
        data: { pagado: true, pagadoAt: now, metodoPago: metodo },
      })] : []),
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cobrar la cuenta' })
  }
})

// DELETE /api/cargos/:id — admin elimina un cargo (ej: decide no cobrar una multa)
router.delete('/:id', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { id } = req.params
  try {
    const cargo = await prisma.cargo.findUnique({ where: { id } })
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' })
    if (cargo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    await prisma.$transaction(async (tx) => {
      await tx.cargo.delete({ where: { id } })
      // Si era una venta de producto del catálogo, repongo el stock
      if (cargo.tipo === 'producto' && cargo.productoId) {
        await reponerStock(tx, cargo.clubId, [{ productoId: cargo.productoId, cantidad: cargo.cantidad ?? 1 }], { tipo: 'cargo', id, motivo: 'Cargo eliminado' })
      }
    })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar cargo' })
  }
})

// PATCH /api/cargos/:id/estado — admin marca pagado (con método) o condona
router.patch('/:id/estado', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { id } = req.params
  const { estado, metodoPago } = req.body

  if (!['pagado', 'condonado', 'pendiente'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usar: pagado | condonado | pendiente' })
  }

  try {
    const cargo = await prisma.cargo.findUnique({ where: { id } })
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' })
    if (cargo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })

    const data =
      estado === 'pagado'
        ? { estado, pagadoAt: new Date(), metodoPago: normalizarMetodo(metodoPago) }
        : { estado, pagadoAt: null, metodoPago: null } // condonado o reabierto

    const updated = await prisma.cargo.update({
      where: { id },
      data,
      include: { jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } },
    })
    res.json(conVencido(updated))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar cargo' })
  }
})

export default router
