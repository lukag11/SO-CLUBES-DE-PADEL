import prisma from './prisma.js'

// ──────────────────────────────────────────────────────────────────────────────
// LIBRO DE PLATA — lecturas de dinero para la caja. HÍBRIDO por compatibilidad:
//   • Cobros con SPLIT/PARCIAL (los nuevos) crean un Pago con PagoLinea (una línea por
//     método). Esos ítems quedan con saldoPagado > 0 → la plata se lee de PagoLinea
//     (efectivo exacto aunque el cobro haya sido mixto: fix del bug de caja fantasma).
//   • Cobros SIMPLES por los flujos históricos (marcar pagado, venta, comanda, torneo…)
//     no crean Pago y dejan saldoPagado = 0 → la plata se lee del propio ítem (legacy).
// El discriminador saldoPagado>0 evita el doble conteo (un ítem está en UN solo libro).
// Sólo cuentan pagos NO anulados. La fecha del dinero es Pago.pagadoAt / item.pagadoAt.
// ──────────────────────────────────────────────────────────────────────────────

// Suma de cobros en EFECTIVO entre dos instantes (para el arqueo).
export async function cobrosEfectivoEntre(clubId, desde, hasta) {
  const rango = { gte: desde, lt: hasta }
  const [lineas, reservas, cargos] = await Promise.all([
    prisma.pagoLinea.findMany({ where: { metodo: 'efectivo', pago: { clubId, anuladoAt: null, pagadoAt: rango } }, select: { monto: true } }),
    prisma.reserva.findMany({ where: { clubId, pagado: true, saldoPagado: 0, metodoPago: 'efectivo', pagadoAt: rango }, select: { precio: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', saldoPagado: 0, metodoPago: 'efectivo', pagadoAt: rango }, select: { monto: true } }),
  ])
  return lineas.reduce((s, l) => s + (l.monto ?? 0), 0)
    + reservas.reduce((s, r) => s + (r.precio ?? 0), 0)
    + cargos.reduce((s, c) => s + (c.monto ?? 0), 0)
}

// Ingresos por método entre dos instantes → { efectivo: n, transferencia: n, ... }.
export async function ingresosPorMetodoEntre(clubId, desde, hasta) {
  const rango = { gte: desde, lt: hasta }
  const [lineas, reservas, cargos] = await Promise.all([
    prisma.pagoLinea.findMany({ where: { pago: { clubId, anuladoAt: null, pagadoAt: rango } }, select: { metodo: true, monto: true } }),
    prisma.reserva.findMany({ where: { clubId, pagado: true, saldoPagado: 0, pagadoAt: rango }, select: { precio: true, metodoPago: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', saldoPagado: 0, pagadoAt: rango }, select: { monto: true, metodoPago: true } }),
  ])
  const acc = {}
  const add = (m, v) => { acc[m || 'otro'] = (acc[m || 'otro'] || 0) + (v ?? 0) }
  for (const l of lineas) add(l.metodo, l.monto)
  for (const r of reservas) add(r.metodoPago, r.precio)
  for (const c of cargos) add(c.metodoPago, c.monto)
  return acc
}

// Total de ingresos (plata real que entró) entre dos instantes.
export async function ingresosTotalEntre(clubId, desde, hasta) {
  const porMetodo = await ingresosPorMetodoEntre(clubId, desde, hasta)
  return Object.values(porMetodo).reduce((s, v) => s + v, 0)
}

// ── Imputación de un cobro (FIFO) — COMPARTIDO por mostrador y webhook MP ─────────
// Reparte `monto` a las deudas de `items` (la más vieja primero), crea un Pago con sus
// PagoLinea y sube el saldoPagado de cada ítem (marcándolo pagado al completarse).
// DEBE correr dentro de runSerializable (re-lee saldos → anti doble-cobro). Capa el monto
// al restante real (RN-75: nunca imputa de más). Devuelve { pagoId, imputado, totalRestante }.
// Si no queda restante → { pagoId: null, imputado: 0, totalRestante } (el caller decide qué
// hacer con el sobrante, ej. avisar saldo a favor).
export async function imputarPagoTx(tx, { clubId, jugadorId = null, items, monto, lineas }) {
  const cargoIds = items.filter((i) => i.origen === 'cargo').map((i) => i.refId)
  const reservaIds = items.filter((i) => i.origen === 'reserva').map((i) => i.refId)
  const [cargos, reservas] = await Promise.all([
    cargoIds.length ? tx.cargo.findMany({ where: { id: { in: cargoIds }, clubId, ...(jugadorId ? { jugadorId } : {}), estado: 'pendiente', comandaId: null }, select: { id: true, monto: true, saldoPagado: true, createdAt: true } }) : [],
    reservaIds.length ? tx.reserva.findMany({ where: { id: { in: reservaIds }, clubId, ...(jugadorId ? { jugadorId } : {}), pagado: false }, select: { id: true, precio: true, saldoPagado: true, fecha: true, horaInicio: true, createdAt: true } }) : [],
  ])

  const deudas = [
    ...cargos.map((c) => ({ origen: 'cargo', refId: c.id, total: c.monto ?? 0, saldo: c.saldoPagado ?? 0, orden: c.createdAt.getTime() })),
    ...reservas.map((r) => ({ origen: 'reserva', refId: r.id, total: r.precio ?? 0, saldo: r.saldoPagado ?? 0, orden: new Date(`${r.fecha}T${r.horaInicio || '00:00'}`).getTime() || r.createdAt.getTime() })),
  ]
    .map((d) => ({ ...d, restante: d.total - d.saldo }))
    .filter((d) => d.restante > 0)
    .sort((a, b) => a.orden - b.orden)

  const totalRestante = deudas.reduce((s, d) => s + d.restante, 0)
  const montoR = Math.round(monto)
  const aImputar = Math.min(montoR, totalRestante)
  // excedente = plata que se quiso imputar pero no entra en la deuda (sobrepago). RN-75.
  if (aImputar <= 0) return { pagoId: null, imputado: 0, totalRestante, excedente: montoR }

  // Líneas efectivas: si el monto se capó (sobrepago) y hay una sola línea, la ajustamos.
  // El split (varias líneas) sólo llega del mostrador, donde monto ya está validado ≤ restante.
  let lineasEf = lineas
  if (aImputar !== montoR) {
    if (lineas.length === 1) lineasEf = [{ metodo: lineas[0].metodo, monto: aImputar }]
    else throw Object.assign(new Error('El split supera lo adeudado'), { status: 400, error: 'split_excede' })
  }
  const metodoStamp = lineasEf.length === 1 ? lineasEf[0].metodo : 'mixto'

  let resto = aImputar
  const imputaciones = []
  const applyUpdates = []
  const now = new Date()
  for (const d of deudas) {
    if (resto <= 0) break
    const aplicar = Math.min(d.restante, resto)
    resto -= aplicar
    const nuevoSaldo = d.saldo + aplicar
    const completo = nuevoSaldo >= d.total
    imputaciones.push({ origen: d.origen, refId: d.refId, monto: aplicar })
    if (d.origen === 'cargo') {
      applyUpdates.push(() => tx.cargo.update({ where: { id: d.refId }, data: { saldoPagado: nuevoSaldo, ...(completo ? { estado: 'pagado', pagadoAt: now, metodoPago: metodoStamp } : {}) } }))
    } else {
      applyUpdates.push(() => tx.reserva.update({ where: { id: d.refId }, data: { saldoPagado: nuevoSaldo, ...(completo ? { pagado: true, pagadoAt: now, metodoPago: metodoStamp } : {}) } }))
    }
  }
  const pago = await tx.pago.create({
    data: { clubId, jugadorId, total: aImputar, imputaciones, pagadoAt: now, lineas: { create: lineasEf.map((l) => ({ metodo: l.metodo, monto: l.monto })) } },
  })
  for (const u of applyUpdates) await u()
  return { pagoId: pago.id, imputado: aImputar, totalRestante, excedente: montoR - aImputar }
}

// ── Anular un Pago del libro de plata (revierte saldoPagado y reabre ítems) ──────
// Pagos que imputaron plata a un ítem (para reconciliar al des-pagarlo por vías legacy).
// Escanea los pagos no anulados del club y filtra por la imputación (JSON) al ítem.
export async function pagosQueImputan(clubId, origen, refId) {
  const pagos = await prisma.pago.findMany({
    where: { clubId, anuladoAt: null },
    select: { id: true, total: true, imputaciones: true, lineas: { select: { metodo: true, monto: true } } },
    orderBy: { pagadoAt: 'desc' },
  })
  return pagos.filter((p) => Array.isArray(p.imputaciones) && p.imputaciones.some((i) => i.origen === origen && i.refId === refId))
}

// Revierte un Pago dentro de una transacción: descuenta saldoPagado de cada ítem imputado,
// reabre los que queden por debajo de su total, y marca el Pago anulado (no lo borra).
export async function revertirPagoTx(tx, pago, now = new Date()) {
  for (const imp of (pago.imputaciones || [])) {
    if (imp.origen === 'cargo') {
      const c = await tx.cargo.findUnique({ where: { id: imp.refId }, select: { monto: true, saldoPagado: true } })
      if (!c) continue
      const nuevoSaldo = Math.max(0, (c.saldoPagado ?? 0) - imp.monto)
      const completo = nuevoSaldo >= c.monto
      await tx.cargo.update({
        where: { id: imp.refId },
        data: { saldoPagado: nuevoSaldo, ...(completo ? {} : { estado: 'pendiente', pagadoAt: null, metodoPago: null }) },
      })
    } else {
      const r = await tx.reserva.findUnique({ where: { id: imp.refId }, select: { precio: true, saldoPagado: true } })
      if (!r) continue
      const nuevoSaldo = Math.max(0, (r.saldoPagado ?? 0) - imp.monto)
      const completo = nuevoSaldo >= (r.precio ?? 0)
      await tx.reserva.update({
        where: { id: imp.refId },
        data: { saldoPagado: nuevoSaldo, ...(completo ? {} : { pagado: false, pagadoAt: null, metodoPago: null }) },
      })
    }
  }
  await tx.pago.update({ where: { id: pago.id }, data: { anuladoAt: now } })
}
