import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireActive, requireFeature, requirePermiso } from '../middleware/auth.js'
import { inicioMesArg } from '../lib/tiempo.js'
import { normalizarMetodo } from '../lib/metodosPago.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'
import { pagosQueImputan, revertirPagoTx, imputarPagoTx } from '../lib/pagos.js'
import { runSerializable } from '../lib/serializable.js'
import { reponerStock } from '../lib/stock.js'
import { mpConfigurado } from '../lib/mercadopago.js'
import { crearLinkPagoDeuda, cancelarLinksDeItems } from '../lib/cobrosMP.js'
import { cancelarOrdenesQRDeItems } from '../lib/cobrosQR.js'

const router = Router()

// Enriquece un cargo con el flag `vencido` (mora calculada en lectura, sin cron).
const conVencido = (c) => ({
  ...c,
  vencido: c.estado === 'pendiente' && c.vencimiento != null && new Date(c.vencimiento) < new Date(),
})

const SEL_JUGADOR = { select: { id: true, nombre: true, apellido: true, dni: true } }

// Normaliza un cargo a "deuda" (shape común con los turnos impagos).
// Si está pendiente y tiene saldoPagado (pago parcial), `monto` es el RESTANTE por cobrar.
const cargoADeuda = (c) => {
  const saldo = c.saldoPagado || 0
  const restante = c.estado === 'pendiente' ? c.monto - saldo : c.monto
  return {
    id: `cargo_${c.id}`, refId: c.id, origen: 'cargo',
    jugador: c.jugador, concepto: c.concepto, monto: restante,
    montoOriginal: c.monto, saldoPagado: saldo,
    tipo: c.tipo, estado: c.estado,
    vencimiento: c.vencimiento,
    vencido: c.estado === 'pendiente' && c.vencimiento != null && new Date(c.vencimiento) < new Date(),
    metodoPago: c.metodoPago, pagadoAt: c.pagadoAt, fecha: c.createdAt,
  }
}

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

    // Colgar el comprobante + lo que leyó la IA a las deudas pagadas por transferencia (evidencia
    // en el filtro "Pagados"). Se resuelve por los avisos aprobados que cubrían cada deuda.
    const avisos = await prisma.avisoTransferencia.findMany({
      where: { clubId, estado: 'aprobado', comprobanteUrl: { not: null } },
      select: { items: true, comprobanteUrl: true, iaMonto: true, iaAlias: true, iaFecha: true, iaResumen: true, iaVeredicto: true },
    })
    const compPorRef = {}
    for (const a of avisos) for (const it of (Array.isArray(a.items) ? a.items : [])) {
      compPorRef[`${it.origen}:${it.refId}`] = { comprobanteUrl: a.comprobanteUrl, iaMonto: a.iaMonto, iaAlias: a.iaAlias, iaFecha: a.iaFecha, iaResumen: a.iaResumen, iaVeredicto: a.iaVeredicto }
    }

    // Distinguir, en los pagos de Mercado Pago ya acreditados, si fueron por QR de billetera
    // (presencial) o por link de Checkout Pro. Se resuelve por el PagoMP approved que cubría cada deuda.
    const pagosMp = await prisma.pagoMP.findMany({ where: { clubId, status: 'approved' }, select: { origen: true, refId: true, items: true, tipo: true } })
    const mpTipoPorRef = {}
    for (const p of pagosMp) {
      const its = p.origen === 'multi' ? (Array.isArray(p.items) ? p.items : []) : [{ origen: p.origen, refId: p.refId }]
      for (const it of its) mpTipoPorRef[`${it.origen}:${it.refId}`] = p.tipo || 'checkout'
    }

    const deudasFinal = deudas.map((d) => {
      const k = `${d.origen}:${d.refId}`
      return { ...d, ...(compPorRef[k] ? { transferencia: compPorRef[k] } : {}), ...(mpTipoPorRef[k] ? { mpTipo: mpTipoPorRef[k] } : {}) }
    })

    res.json({
      deudas: deudasFinal,
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
  // jugadorId null = venta de mostrador / casual: al contado. Excepción: Mercado Pago, que
  // queda pendiente hasta que el webhook confirma (el PagoMP la rastrea).
  if (!jugadorId && !cobrar && metodoPago !== 'mercadopago') {
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

// POST /api/cargos/cobrar-cuenta — cobra la cuenta de un jugador (checkout). Soporta:
//   • entrega PARCIAL: `monto` < deuda total → se imputa FIFO (deuda más vieja primero).
//   • SPLIT de métodos: `lineas` = [{ metodo, monto }] (ej. efectivo + transferencia).
// Genera un Pago (libro de plata) con sus PagoLinea; los ítems suben su saldoPagado y
// se marcan pagados sólo cuando saldoPagado alcanza el monto. La caja lee las líneas.
// Body: { jugadorId, items: [{ origen:'cargo'|'reserva', refId }], monto?, lineas?, metodoPago? }
// Compat: sin `monto` ni `lineas` → cobra todo lo seleccionado con `metodoPago` (comportamiento previo).
router.post('/cobrar-cuenta', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const { jugadorId, items, monto, lineas, metodoPago } = req.body
  const clubId = req.user.clubId
  if (!jugadorId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'datos_incompletos', message: 'Elegí un jugador y al menos una deuda' })
  }
  const cargoIds = items.filter((i) => i.origen === 'cargo').map((i) => i.refId)
  const reservaIds = items.filter((i) => i.origen === 'reserva').map((i) => i.refId)

  try {
    const jugador = await prisma.jugador.findUnique({ where: { id: jugadorId }, select: { clubId: true } })
    if (!jugador || jugador.clubId !== clubId) {
      return res.status(404).json({ error: 'Jugador no encontrado en este club' })
    }

    // TOCTOU-safe: lectura de saldos + imputación + escritura del Pago van en una TX
    // Serializable. Dos cobros concurrentes del mismo ítem: Postgres aborta uno (P2034),
    // se reintenta y re-lee el saldoPagado ya actualizado → nunca se duplica el Pago.
    const out = await runSerializable(async (tx) => {
      const [cargos, reservas] = await Promise.all([
        cargoIds.length ? tx.cargo.findMany({ where: { id: { in: cargoIds }, clubId, jugadorId, estado: 'pendiente', comandaId: null }, select: { id: true, monto: true, saldoPagado: true, createdAt: true } }) : [],
        reservaIds.length ? tx.reserva.findMany({ where: { id: { in: reservaIds }, clubId, jugadorId, pagado: false }, select: { id: true, precio: true, saldoPagado: true, fecha: true, horaInicio: true, createdAt: true } }) : [],
      ])

      // Lista unificada de deudas con restante > 0, ordenada FIFO (la más vieja primero).
      const deudas = [
        ...cargos.map((c) => ({ origen: 'cargo', refId: c.id, total: c.monto ?? 0, saldo: c.saldoPagado ?? 0, orden: c.createdAt.getTime() })),
        ...reservas.map((r) => ({ origen: 'reserva', refId: r.id, total: r.precio ?? 0, saldo: r.saldoPagado ?? 0, orden: new Date(`${r.fecha}T${r.horaInicio || '00:00'}`).getTime() || r.createdAt.getTime() })),
      ]
        .map((d) => ({ ...d, restante: d.total - d.saldo }))
        .filter((d) => d.restante > 0)
        .sort((a, b) => a.orden - b.orden)

      if (deudas.length === 0) throw Object.assign(new Error('No hay deuda pendiente en lo seleccionado'), { status: 409, error: 'sin_deuda' })
      const totalRestante = deudas.reduce((s, d) => s + d.restante, 0)

      // Monto a cobrar: por defecto todo lo seleccionado; si viene menor → entrega parcial.
      const montoACobrar = monto != null ? Math.round(Number(monto)) : totalRestante
      if (!Number.isFinite(montoACobrar) || montoACobrar <= 0) throw Object.assign(new Error('El monto debe ser mayor a cero'), { status: 400, error: 'monto_invalido' })
      if (montoACobrar > totalRestante) throw Object.assign(new Error('El monto supera lo que debe. Revisá el importe.'), { status: 400, error: 'monto_excede' })

      // Líneas de método (split). Sin `lineas` → una sola con `metodoPago`.
      const lineasIn = (Array.isArray(lineas) && lineas.length > 0)
        ? lineas.map((l) => ({ metodo: normalizarMetodo(l.metodo), monto: Math.round(Number(l.monto) || 0) })).filter((l) => l.monto > 0)
        : [{ metodo: normalizarMetodo(metodoPago), monto: montoACobrar }]
      if (lineasIn.length === 0) throw Object.assign(new Error('Cargá al menos un método con monto'), { status: 400, error: 'metodos_invalidos' })
      const sumaLineas = lineasIn.reduce((s, l) => s + l.monto, 0)
      if (sumaLineas !== montoACobrar) throw Object.assign(new Error(`Los métodos suman ${sumaLineas} pero el cobro es ${montoACobrar}`), { status: 400, error: 'split_no_cuadra' })

      // Imputación FIFO compartida con el webhook de MP (lib/pagos.js: imputarPagoTx).
      // La MISMA lógica dentro de esta TX Serializable → mostrador y webhook no se pisan.
      const impu = await imputarPagoTx(tx, { clubId, jugadorId, items, monto: montoACobrar, lineas: lineasIn })
      return { pagoId: impu.pagoId, montoACobrar, totalRestante }
    })

    // Se cobró por otro medio → si estas deudas tenían un link de MP o un QR de billetera vivo,
    // cancelarlo (evita fantasma y sobrepago si el jugador igual lo paga). Cleanup, no rompe el cobro.
    await cancelarLinksDeItems(clubId, items).catch(() => {})
    await cancelarOrdenesQRDeItems(clubId, items).catch(() => {})

    res.json({ ok: true, pagoId: out.pagoId, cobrado: out.montoACobrar, parcial: out.montoACobrar < out.totalRestante, restante: out.totalRestante - out.montoACobrar })
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.error || 'error', message: err.message })
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
    if ((cargo.saldoPagado || 0) > 0) return res.status(409).json({ error: 'cobrado', message: 'Este cargo tiene un cobro registrado. Anulá el pago antes de eliminarlo.' })
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

  const incl = { jugador: { select: { id: true, nombre: true, apellido: true, dni: true } } }
  try {
    const cargo = await prisma.cargo.findUnique({ where: { id } })
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' })
    if (cargo.clubId !== req.user.clubId) return res.status(403).json({ error: 'Sin permisos' })
    const saldo = cargo.saldoPagado || 0

    if (estado === 'pagado') {
      // Con cobro en el libro de plata: completar/anular va por "Cobrar cuenta" (caja exacta).
      if (saldo > 0) return res.status(409).json({ error: 'en_libro_plata', message: 'Este cargo ya tiene un cobro registrado. Completá o anulá desde Cobrar cuenta.' })
      const updated = await prisma.cargo.update({ where: { id }, data: { estado, pagadoAt: new Date(), metodoPago: normalizarMetodo(metodoPago) }, include: incl })
      // Se cobró por otro medio → cancelar su link de MP y su QR de billetera vivos (evita fantasma/sobrepago).
      await cancelarLinksDeItems(cargo.clubId, [{ origen: 'cargo', refId: id }]).catch(() => {})
      await cancelarOrdenesQRDeItems(cargo.clubId, [{ origen: 'cargo', refId: id }]).catch(() => {})
      return res.json(conVencido(updated))
    }

    // condonado o reabierto → si había plata en el libro, la revierto.
    if (saldo > 0) {
      const pagos = await pagosQueImputan(cargo.clubId, 'cargo', id)
      const combinados = pagos.filter((p) => (p.imputaciones || []).length > 1)
      if (combinados.length) {
        return res.status(409).json({ error: 'pago_combinado', pagoIds: combinados.map((p) => p.id), message: 'Este cargo se cobró junto con otras deudas.' })
      }
      await runSerializable(async (tx) => {
        for (const p of pagos) await revertirPagoTx(tx, p)
        await tx.cargo.update({ where: { id }, data: { estado, saldoPagado: 0, pagadoAt: null, metodoPago: null } })
      })
      const updated = await prisma.cargo.findUnique({ where: { id }, include: incl })
      return res.json(conVencido(updated))
    }

    const updated = await prisma.cargo.update({ where: { id }, data: { estado, pagadoAt: null, metodoPago: null }, include: incl })
    res.json(conVencido(updated))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar cargo' })
  }
})

// POST /api/cargos/:id/link-pago — link de Mercado Pago para una deuda (cargo).
// Delega en crearLinkPagoDeuda (lib/cobrosMP.js). El unificado (cargo o turno) es
// POST /api/pagos/link-pago. RN-70/76/77.
router.post('/:id/link-pago', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), async (req, res) => {
  const clubId = req.user.clubId
  if (!(await mpConfigurado(clubId))) return res.status(503).json({ error: 'mp_no_configurado', message: 'Mercado Pago no está configurado todavía.' })
  try {
    const out = await crearLinkPagoDeuda({ clubId, origen: 'cargo', refId: req.params.id })
    res.status(out.reusado ? 200 : 201).json(out)
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[link-pago cargo]', err)
    res.status(status).json({ error: err.error || 'error', message: err.message || 'No se pudo generar el link de pago' })
  }
})

export default router
