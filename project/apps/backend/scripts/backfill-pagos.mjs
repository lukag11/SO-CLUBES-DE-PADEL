// Backfill del "libro de plata" (Pago + PagoLinea) a partir de los ítems ya pagados.
// Por cada Reserva pagada / Cargo pagado que todavía no tenga saldoPagado, crea:
//   - Pago (total = monto del ítem, pagadoAt = su pagadoAt, imputaciones = [ese ítem])
//   - PagoLinea (metodo = su metodoPago || 'otro', monto = total)
//   - setea item.saldoPagado = monto  (para que estado derive parcial/pagado)
// Idempotente: sólo toca ítems con saldoPagado = 0. Números idénticos, cero pérdida.
// Uso: node scripts/backfill-pagos.mjs
import prisma from '../src/lib/prisma.js'

const run = async () => {
  let pagosCreados = 0
  let reservasTocadas = 0
  let cargosTocados = 0

  // ── Reservas pagadas (precio > 0) sin saldo imputado ──────────────────────
  const reservas = await prisma.reserva.findMany({
    where: { pagado: true, saldoPagado: 0 },
    select: { id: true, clubId: true, jugadorId: true, precio: true, metodoPago: true, pagadoAt: true },
  })
  for (const r of reservas) {
    const monto = r.precio ?? 0
    if (monto <= 0) continue // turno gratis: nada que cobrar, sólo marco saldo para no re-visitarlo
    const metodo = r.metodoPago || 'otro'
    const pagadoAt = r.pagadoAt || new Date()
    await prisma.$transaction([
      prisma.pago.create({
        data: {
          clubId: r.clubId,
          jugadorId: r.jugadorId ?? null,
          total: monto,
          imputaciones: [{ origen: 'reserva', refId: r.id, monto }],
          pagadoAt,
          lineas: { create: [{ metodo, monto }] },
        },
      }),
      prisma.reserva.update({ where: { id: r.id }, data: { saldoPagado: monto } }),
    ])
    pagosCreados++
    reservasTocadas++
  }
  // Reservas gratis pagadas: sólo marco saldoPagado = precio (0) → ya está; nada.

  // ── Cargos pagados sin saldo imputado ─────────────────────────────────────
  const cargos = await prisma.cargo.findMany({
    where: { estado: 'pagado', saldoPagado: 0 },
    select: { id: true, clubId: true, jugadorId: true, monto: true, metodoPago: true, pagadoAt: true },
  })
  for (const c of cargos) {
    const monto = c.monto ?? 0
    const metodo = c.metodoPago || 'otro'
    const pagadoAt = c.pagadoAt || new Date()
    await prisma.$transaction([
      prisma.pago.create({
        data: {
          clubId: c.clubId,
          jugadorId: c.jugadorId ?? null,
          total: monto,
          imputaciones: [{ origen: 'cargo', refId: c.id, monto }],
          pagadoAt,
          lineas: { create: [{ metodo, monto }] },
        },
      }),
      prisma.cargo.update({ where: { id: c.id }, data: { saldoPagado: monto } }),
    ])
    pagosCreados++
    cargosTocados++
  }

  console.log(`Backfill OK → pagos creados: ${pagosCreados} (reservas: ${reservasTocadas}, cargos: ${cargosTocados})`)
  await prisma.$disconnect()
}

run().catch(async (e) => {
  console.error('Backfill FALLÓ:', e)
  await prisma.$disconnect()
  process.exit(1)
})
