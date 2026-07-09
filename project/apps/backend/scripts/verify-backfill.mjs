// Verifica que el libro de plata (PagoLinea, no anulados) cuadre con los ítems pagados.
import prisma from '../src/lib/prisma.js'

const run = async () => {
  const [reservas, cargos, lineas] = await Promise.all([
    prisma.reserva.findMany({ where: { pagado: true }, select: { precio: true, metodoPago: true } }),
    prisma.cargo.findMany({ where: { estado: 'pagado' }, select: { monto: true, metodoPago: true } }),
    prisma.pagoLinea.findMany({ where: { pago: { anuladoAt: null } }, select: { metodo: true, monto: true } }),
  ])
  const acc = (arr, key, val) => arr.reduce((m, x) => { const k = x[key] || 'otro'; m[k] = (m[k] || 0) + (val(x) || 0); return m }, {})

  const items = {}
  for (const [k, v] of Object.entries(acc(reservas, 'metodoPago', (r) => r.precio))) items[k] = (items[k] || 0) + v
  for (const [k, v] of Object.entries(acc(cargos, 'metodoPago', (c) => c.monto))) items[k] = (items[k] || 0) + v
  const lin = acc(lineas, 'metodo', (l) => l.monto)

  const totalItems = Object.values(items).reduce((s, v) => s + v, 0)
  const totalLin = Object.values(lin).reduce((s, v) => s + v, 0)

  console.log('Ítems pagados por método:', items, '→ total', totalItems)
  console.log('PagoLinea por método:    ', lin, '→ total', totalLin)
  console.log(totalItems === totalLin ? '✅ CUADRA (total idéntico)' : `❌ NO CUADRA (dif ${totalItems - totalLin})`)
  const metodos = new Set([...Object.keys(items), ...Object.keys(lin)])
  for (const m of metodos) {
    if ((items[m] || 0) !== (lin[m] || 0)) console.log(`  ⚠ método ${m}: ítems ${items[m] || 0} vs líneas ${lin[m] || 0}`)
  }
  await prisma.$disconnect()
}
run().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
