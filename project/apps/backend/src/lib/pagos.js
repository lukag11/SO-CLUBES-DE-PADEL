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
