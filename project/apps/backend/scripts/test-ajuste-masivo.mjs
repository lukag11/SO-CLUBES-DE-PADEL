// Test e2e del ajuste masivo de precios por categoría. Crea productos de prueba, aplica
// +10% con redondeo a $10, verifica, y limpia. NO toca productos preexistentes.
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
const { signToken } = await import('../src/lib/jwt.js')

const API = 'http://localhost:3001/api'
let fail = 0
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fail++ }

const run = async () => {
  const admin = await prisma.admin.findFirst({ where: { rol: 'owner' }, select: { id: true, clubId: true } })
  const token = signToken({ id: admin.id, role: 'admin', clubId: admin.clubId })
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const api = async (m, p, b) => { const r = await fetch(`${API}${p}`, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) } }

  const CAT = 'ZZ_TEST_AJUSTE'
  const creados = []
  try {
    const p1 = await api('POST', '/productos', { nombre: '[TEST] bebida A', precio: 1437, costo: 900, categoria: CAT, controlaStock: false })
    const p2 = await api('POST', '/productos', { nombre: '[TEST] bebida B', precio: 990, categoria: CAT, controlaStock: false })
    ok(p1.status === 201 && p2.status === 201, 'Creo 2 productos de prueba en la categoría')
    creados.push(p1.data.id, p2.data.id)

    const aj = await api('POST', '/productos/ajuste-masivo', { categoria: CAT, porcentaje: 10, campo: 'precio', redondeo: 10 })
    ok(aj.status === 200 && aj.data.actualizados === 2, `Ajuste +10% aplicado a ${aj.data.actualizados} productos`)

    const todos = await api('GET', '/productos')
    const a = todos.data.find((x) => x.id === p1.data.id)
    const b = todos.data.find((x) => x.id === p2.data.id)
    ok(a.precio === 1580, `1437 +10% redondeado a $10 = ${a.precio} (esperado 1580)`)
    ok(b.precio === 1090, `990 +10% redondeado a $10 = ${b.precio} (esperado 1090)`)
    ok(a.costo === 900, 'El costo NO se tocó (campo=precio)')

    const otra = await api('POST', '/productos/ajuste-masivo', { categoria: 'CATEGORIA_INEXISTENTE_XYZ', porcentaje: 10 })
    ok(otra.status === 404, 'Categoría sin productos → 404 (no rompe)')
  } finally {
    for (const id of creados) { try { await api('DELETE', `/productos/${id}`) } catch {} }
    console.log('(limpieza: productos de prueba borrados)')
  }
  console.log(`\n${fail === 0 ? '🎉 TODO OK' : `❌ ${fail} fallo(s)`}\n`)
  await prisma.$disconnect(); process.exit(fail === 0 ? 0 : 1)
}
run().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
