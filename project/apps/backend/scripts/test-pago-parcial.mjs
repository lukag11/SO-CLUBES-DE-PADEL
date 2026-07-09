// Test de integración end-to-end del cobro parcial + split + anular, contra el backend vivo.
// Crea deudas de prueba para un jugador real, cobra parcial con split, verifica caja/cobranzas,
// anula y verifica reversión. Limpia sus propias filas al final. NO toca data preexistente.
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
const { signToken } = await import('../src/lib/jwt.js')

const API = 'http://localhost:3001/api'
let fail = 0
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) fail++ }
const money = (n) => `$${n}`

const run = async () => {
  const admin = await prisma.admin.findFirst({ where: { rol: 'owner' }, select: { id: true, clubId: true } })
  if (!admin) throw new Error('No hay admin owner para probar')
  const jugador = await prisma.jugador.findFirst({ where: { clubId: admin.clubId }, select: { id: true, nombre: true } })
  if (!jugador) throw new Error('No hay jugador en el club para probar')
  const token = signToken({ id: admin.id, role: 'admin', clubId: admin.clubId })
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const api = async (m, path, body) => {
    const r = await fetch(`${API}${path}`, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined })
    const data = await r.json().catch(() => ({}))
    return { status: r.status, data }
  }
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const metodoIng = async () => {
    const { data } = await api('GET', `/caja?fecha=${hoy}`)
    return { efectivo: data.metodos?.efectivo?.ingreso ?? 0, transferencia: data.metodos?.transferencia?.ingreso ?? 0 }
  }

  console.log(`\n— Jugador de prueba: ${jugador.nombre} (${jugador.id})\n`)
  const creados = []
  try {
    // 1) Dos cargos a cuenta: $5000 (viejo) y $3000 (nuevo)
    const c1 = await api('POST', '/cargos', { jugadorId: jugador.id, concepto: '[TEST] deuda vieja', monto: 5000 })
    const c2 = await api('POST', '/cargos', { jugadorId: jugador.id, concepto: '[TEST] deuda nueva', monto: 3000 })
    ok(c1.status === 201 && c2.status === 201, 'Creo 2 cargos a cuenta ($5000 + $3000)')
    creados.push(c1.data.id, c2.data.id)

    // 2) Cobranzas: ambos pendientes, total 8000
    const cob0 = await api('GET', `/cargos/cobranzas?jugadorId=${jugador.id}`)
    const pend0 = cob0.data.deudas.filter((d) => d.estado === 'pendiente' && creados.includes(d.refId))
    const tot0 = pend0.reduce((s, d) => s + d.monto, 0)
    ok(tot0 === 8000, `Deuda pendiente = ${money(tot0)} (esperado $8000)`)

    // 3) Cobro PARCIAL $6000 con SPLIT (efectivo $4000 + transferencia $2000), FIFO
    const ing0 = await metodoIng()
    const cobro = await api('POST', '/cargos/cobrar-cuenta', {
      jugadorId: jugador.id,
      items: [{ origen: 'cargo', refId: c1.data.id }, { origen: 'cargo', refId: c2.data.id }],
      monto: 6000,
      lineas: [{ metodo: 'efectivo', monto: 4000 }, { metodo: 'transferencia', monto: 2000 }],
    })
    ok(cobro.status === 200 && cobro.data.pagoId, `Cobro parcial+split OK (pagoId ${cobro.data.pagoId})`)
    ok(cobro.data.parcial === true && cobro.data.restante === 2000, `Marca parcial, restante = ${money(cobro.data.restante)} (esperado $2000)`)
    const pagoId = cobro.data.pagoId

    // 4) Cobranzas: viejo pagado (sale), nuevo con restante $2000
    const cob1 = await api('GET', `/cargos/cobranzas?jugadorId=${jugador.id}`)
    const viejo = cob1.data.deudas.find((d) => d.refId === c1.data.id)
    const nuevo = cob1.data.deudas.find((d) => d.refId === c2.data.id)
    ok(viejo?.estado === 'pagado', 'Deuda vieja ($5000) quedó PAGADA (FIFO al más viejo)')
    ok(nuevo?.estado === 'pendiente' && nuevo?.monto === 2000, `Deuda nueva muestra restante ${money(nuevo?.monto)} (esperado $2000)`)

    // 5) Caja: el split entró EXACTO por método (efectivo +4000, transferencia +2000)
    const ing1 = await metodoIng()
    ok(ing1.efectivo - ing0.efectivo === 4000, `Caja efectivo subió ${money(ing1.efectivo - ing0.efectivo)} (esperado +$4000)`)
    ok(ing1.transferencia - ing0.transferencia === 2000, `Caja transferencia subió ${money(ing1.transferencia - ing0.transferencia)} (esperado +$2000)`)

    // 6) Anular el pago → todo vuelve atrás
    const anul = await api('POST', `/pagos/${pagoId}/anular`)
    ok(anul.status === 200, 'Anulo el pago')
    const cob2 = await api('GET', `/cargos/cobranzas?jugadorId=${jugador.id}`)
    const tot2 = cob2.data.deudas.filter((d) => d.estado === 'pendiente' && creados.includes(d.refId)).reduce((s, d) => s + d.monto, 0)
    ok(tot2 === 8000, `Tras anular, deuda vuelve a ${money(tot2)} (esperado $8000)`)
    const ing2 = await metodoIng()
    ok(ing2.efectivo === ing0.efectivo && ing2.transferencia === ing0.transferencia, 'Tras anular, la caja vuelve al estado inicial')

    // 7) Cobro de UN SOLO ítem (full) → anular por ítem (PATCH estado) revierte el libro
    const cSolo = await api('POST', '/cargos/cobrar-cuenta', { jugadorId: jugador.id, items: [{ origen: 'cargo', refId: c1.data.id }], metodoPago: 'efectivo' })
    ok(cSolo.status === 200, 'Cobro de un solo cargo ($5000 efectivo)')
    const rev = await api('PATCH', `/cargos/${c1.data.id}/estado`, { estado: 'pendiente' })
    ok(rev.status === 200, 'Anular por ítem (cobro simple) OK')
    const cob3 = await api('GET', `/cargos/cobranzas?jugadorId=${jugador.id}`)
    const v3 = cob3.data.deudas.find((d) => d.refId === c1.data.id)
    ok(v3?.estado === 'pendiente' && v3?.monto === 5000, `Cargo reabierto a ${money(v3?.monto)} (esperado $5000)`)

    // 8) Cobro COMBINADO (2 ítems) → anular por ítem debe BLOQUEAR con pagoIds
    const cComb = await api('POST', '/cargos/cobrar-cuenta', { jugadorId: jugador.id, items: [{ origen: 'cargo', refId: c1.data.id }, { origen: 'cargo', refId: c2.data.id }], metodoPago: 'efectivo' })
    ok(cComb.status === 200, 'Cobro combinado ($8000, 2 deudas)')
    const blocked = await api('PATCH', `/cargos/${c1.data.id}/estado`, { estado: 'pendiente' })
    ok(blocked.status === 409 && blocked.data.error === 'pago_combinado' && blocked.data.pagoIds?.includes(cComb.data.pagoId), 'Anular por ítem de un cobro combinado se BLOQUEA con pagoIds')
    const anulComb = await api('POST', `/pagos/${cComb.data.pagoId}/anular`)
    ok(anulComb.status === 200, 'Anular el pago combinado completo OK')

    // 9) CONCURRENCIA: dos cobros idénticos del mismo cargo en paralelo → uno solo debe entrar
    const ingC0 = await metodoIng()
    const body9 = { jugadorId: jugador.id, items: [{ origen: 'cargo', refId: c2.data.id }], metodoPago: 'efectivo' }
    const [r9a, r9b] = await Promise.all([
      api('POST', '/cargos/cobrar-cuenta', body9),
      api('POST', '/cargos/cobrar-cuenta', body9),
    ])
    const exitos = [r9a, r9b].filter((r) => r.status === 200).length
    ok(exitos === 1, `Cobros concurrentes del mismo cargo: entró exactamente 1 (entraron ${exitos})`)
    const ingC1 = await metodoIng()
    ok(ingC1.efectivo - ingC0.efectivo === 3000, `Caja subió ${money(ingC1.efectivo - ingC0.efectivo)} una sola vez (esperado +$3000, NO $6000)`)
    // dejo c2 pago → lo reabro para que la limpieza pueda borrarlo
    await api('PATCH', `/cargos/${c2.data.id}/estado`, { estado: 'pendiente' })
  } finally {
    // Limpieza: borro SOLO los cargos de prueba que creé (por id)
    for (const id of creados) { try { await api('DELETE', `/cargos/${id}`) } catch {} }
    console.log('\n(limpieza: cargos de prueba borrados)')
  }

  console.log(`\n${fail === 0 ? '🎉 TODO OK' : `❌ ${fail} fallo(s)`}\n`)
  await prisma.$disconnect()
  process.exit(fail === 0 ? 0 : 1)
}
run().catch(async (e) => { console.error('TEST ERROR:', e); await prisma.$disconnect(); process.exit(1) })
