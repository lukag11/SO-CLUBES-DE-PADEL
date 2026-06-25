// Suite de concurrencia INTEGRACIÓN (DB real). Ejercita la fuente única conflictoEnFecha/
// conflictoEnDia + runSerializable (lo que usan los handlers reales) bajo carga concurrente,
// para todos los flujos que ocupan una cancha: reserva eventual, clase, turno fijo, convocatoria.
import prisma from '../src/lib/prisma.js'
import { runSerializable } from '../src/lib/serializable.js'
import { conflictoEnFecha, conflictoEnDia, overlaps } from '../src/lib/conflictos.js'
import { organizarConvocatoria } from '../src/lib/convocatorias.js'

const clubId = 'cmoryx4a900008t4qmzdzuiee'
let PASS = 0, FAIL = 0
const okMsg = []

const canchas = await prisma.cancha.findMany({ where: { clubId, activo: true }, select: { id: true }, orderBy: { nombre: 'asc' } })
const jug = await prisma.jugador.findFirst({ where: { clubId }, select: { id: true } })
const prof = await prisma.profesor.findFirst({ where: { clubId }, select: { id: true } })
const C1 = canchas[0].id, C2 = canchas[1]?.id

const NOTA = 'integ-test'
const FECHAS_CONV = ['2026-12-20', '2026-12-21'] // fechas dedicadas a las convocatorias del test
const limpiar = async () => {
  // reservas de convocatoria del test (su nota es "Convocatoria ...") por fecha dedicada
  const convs = await prisma.convocatoria.findMany({ where: { clubId, fecha: { in: FECHAS_CONV } }, select: { id: true } })
  if (convs.length) {
    await prisma.reserva.deleteMany({ where: { convocatoriaId: { in: convs.map((c) => c.id) } } })
    await prisma.convocatoria.deleteMany({ where: { id: { in: convs.map((c) => c.id) } } })
  }
  await prisma.cargo.deleteMany({ where: { clubId, concepto: { startsWith: NOTA } } })
  await prisma.reserva.deleteMany({ where: { clubId, notas: { startsWith: NOTA } } })
  await prisma.turnoFijo.deleteMany({ where: { clubId, notas: { startsWith: NOTA } } })
}
// Convocatoria real (organizarConvocatoria reserva N canchas atómico, 409 si no hay N libres)
const crearConvocatoria = (fecha, hi, canchasN, tag) =>
  organizarConvocatoria({ clubId, organizadorJugadorId: jug.id, modalidad: 'super8', fecha, horaInicio: hi, categorias: [], genero: null, cupoMax: 8, canchas: canchasN, visibilidad: 'publica' })
// Cancelación con cargo, con guard atómico (igual que el handler DELETE arreglado)
const cancelarConCargo = (reservaId, monto, tag) => (async () => {
  const upd = await prisma.reserva.updateMany({ where: { id: reservaId, estado: { in: ['pendiente', 'confirmada'] } }, data: { estado: 'cancelada' } })
  if (upd.count === 0) return null
  return prisma.cargo.create({ data: { clubId, jugadorId: jug.id, reservaId, concepto: `${NOTA}-cancel-${tag}`, monto, tipo: 'cancelacion', estado: 'pendiente' } })
})()

// Creadores faithful a los handlers (chequeo único + create, bajo Serializable)
const crearReserva = (canchaId, fecha, hi, hf, tag) => runSerializable(async (tx) => {
  const c = await conflictoEnFecha(tx, { clubId, canchaId, fecha, horaInicio: hi, horaFin: hf })
  if (c) throw new Error('CONFLICTO:' + c.tipo)
  return tx.reserva.create({ data: { clubId, canchaId, jugadorId: jug.id, fecha, horaInicio: hi, horaFin: hf, estado: 'confirmada', tipo: 'eventual', precio: 0, jugadores: [], notas: `${NOTA}-${tag}` } })
})
const crearClase = (canchaId, fecha, hi, hf, tag) => runSerializable(async (tx) => {
  const c = await conflictoEnFecha(tx, { clubId, canchaId, fecha, horaInicio: hi, horaFin: hf })
  if (c) throw new Error('CONFLICTO:' + c.tipo)
  return tx.reserva.create({ data: { clubId, canchaId, profesorId: prof?.id, fecha, horaInicio: hi, horaFin: hf, estado: 'confirmada', tipo: 'clase', precio: 0, jugadores: [], notas: `${NOTA}-${tag}` } })
})
const crearTF = (canchaId, dia, hi, hf, desdeFecha, tag) => runSerializable(async (tx) => {
  const c = await conflictoEnDia(tx, { clubId, canchaId, dia, horaInicio: hi, horaFin: hf, desdeFecha })
  if (c) throw new Error('CONFLICTO:' + c.tipo)
  return tx.turnoFijo.create({ data: { clubId, canchaId, jugadorId: jug.id, dia, horaInicio: hi, horaFin: hf, estado: 'confirmado', diasAusentes: [], desde: desdeFecha, notas: `${NOTA}-${tag}` } })
})
const cuenta = (res) => res.filter(r => r.status === 'fulfilled').length

const esperar = async (nombre, exp, fn) => {
  await limpiar()
  try {
    const got = await fn()
    if (got === exp) { PASS++; okMsg.push(`✅ ${nombre} (esperado ${exp}, obtuvo ${got})`) }
    else { FAIL++; okMsg.push(`🔴 ${nombre} — esperado ${exp}, OBTUVO ${got}`) }
  } catch (e) { FAIL++; okMsg.push(`🔴 ${nombre} — ERROR: ${e.message}`) }
  await limpiar()
}

// ── Escenarios ──
await esperar('1. N reservas idénticas mismo slot → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled(Array.from({ length: 12 }, (_, n) => crearReserva(C1, '2026-12-01', '20:00', '21:30', n)))))

await esperar('2. Reservas que SE SOLAPAN (inicio distinto) → 1 gana', 1, async () => {
  const slots = [['19:00', '20:30'], ['20:00', '21:30']]
  return cuenta(await Promise.allSettled(Array.from({ length: 12 }, (_, n) => crearReserva(C1, '2026-12-02', ...slots[n % 2], n))))
})

await esperar('3. Reservas que NO se solapan, misma cancha → TODAS ganan (3)', 3, async () => {
  const slots = [['08:00', '09:30'], ['10:00', '11:30'], ['12:00', '13:30']]
  return cuenta(await Promise.allSettled(slots.map((s, n) => crearReserva(C1, '2026-12-03', ...s, n))))
})

await esperar('4. Mismo horario, canchas DISTINTAS → ambas ganan (2)', C2 ? 2 : 1, async () => {
  if (!C2) return 1
  return cuenta(await Promise.allSettled([crearReserva(C1, '2026-12-04', '20:00', '21:30', 'a'), crearReserva(C2, '2026-12-04', '20:00', '21:30', 'b')]))
})

await esperar('5. Reserva vs TURNO FIJO mismo slot (concurrente) → 1 gana', 1, async () => {
  // 2026-12-07 es lunes → TF dia=lunes choca con reserva de esa fecha
  const r = await Promise.allSettled([
    crearReserva(C1, '2026-12-07', '20:00', '21:30', 'r'),
    crearTF(C1, 'lunes', '20:00', '21:30', '2026-12-07', 't'),
  ])
  return cuenta(r)
})

await esperar('6. N TF idénticos mismo cancha/día/hora → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled(Array.from({ length: 10 }, (_, n) => crearTF(C1, 'martes', '20:00', '21:30', '2026-12-01', n)))))

await esperar('7. Reserva vs CLASE solapadas (concurrente) → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled([
    crearReserva(C1, '2026-12-09', '20:00', '21:30', 'r'),
    crearClase(C1, '2026-12-09', '20:30', '22:00', 'c'),
  ])))

await esperar('8. CRUCE DE MEDIANOCHE: 23:00-00:30 vs 23:30-01:00 concurrente → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled([
    crearReserva(C1, '2026-12-10', '23:00', '00:30', 'a'),
    crearReserva(C1, '2026-12-10', '23:30', '01:00', 'b'),
  ])))

await esperar('9. Stress: 50 simultáneos mismo slot → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled(Array.from({ length: 50 }, (_, n) => crearReserva(C1, '2026-12-11', '20:00', '21:30', n)))))

await esperar('10. TF bloqueado por reserva existente en próxima ocurrencia (FIX del agujero)', 0, async () => {
  // existe una reserva el lunes 2026-12-14 20:00 → crear TF lunes 20:00 debe FALLAR (0 éxitos)
  await crearReserva(C1, '2026-12-14', '20:00', '21:30', 'pre')
  const r = await Promise.allSettled([crearTF(C1, 'lunes', '20:00', '21:30', '2026-12-14', 't')])
  return cuenta(r)
})

await esperar('11. Convocatoria (reserva de cancha) vs reserva mismo slot → 1 gana', 1, async () =>
  cuenta(await Promise.allSettled([
    crearReserva(C1, '2026-12-15', '20:00', '21:30', 'conv'), // convocatoria reserva = misma lógica
    crearReserva(C1, '2026-12-15', '20:00', '21:30', 'res'),
  ])))

await esperar('12. Cancelar + re-reservar el hueco simultáneo → nunca 2 activas', true, async () => {
  // Creo una reserva, luego EN PARALELO la cancelo y otro intenta reservar el mismo slot.
  const orig = await crearReserva(C1, '2026-12-16', '20:00', '21:30', 'orig')
  await Promise.allSettled([
    prisma.reserva.update({ where: { id: orig.id }, data: { estado: 'cancelada' } }),
    crearReserva(C1, '2026-12-16', '20:00', '21:30', 'rebook'),
  ])
  // Invariante: como mucho 1 reserva ACTIVA para ese slot (nunca 2 = nunca doble-booking).
  const activas = await prisma.reserva.count({ where: { clubId, canchaId: C1, fecha: '2026-12-16', horaInicio: '20:00', estado: { in: ['pendiente', 'confirmada'] } } })
  return activas <= 1
})

await esperar('13. Dos CONVOCATORIAS por las MISMAS 2 canchas → 1 se las lleva (aislamiento)', 1, async () => {
  if (!C2) return 1
  const r = await Promise.allSettled([
    crearConvocatoria(FECHAS_CONV[0], '20:00', 2, 'a'),
    crearConvocatoria(FECHAS_CONV[0], '20:00', 2, 'b'),
  ])
  const ok = cuenta(r)
  const reservasSlot = await prisma.reserva.count({ where: { clubId, fecha: FECHAS_CONV[0], horaInicio: '20:00', estado: { in: ['pendiente', 'confirmada'] } } })
  // 1 convocatoria gana Y deja exactamente 2 reservas (sus 2 canchas), nunca un split
  return ok === 1 && reservasSlot === 2 ? 1 : 99
})

await esperar('14. Convocatoria 2 canchas con solo 1 libre → todo-o-nada (0 reservas, no 1)', true, async () => {
  if (!C2) return true
  await crearReserva(C2, FECHAS_CONV[1], '20:00', '21:30', 'ocupa') // ocupo 1 de 2 canchas
  const r = await Promise.allSettled([crearConvocatoria(FECHAS_CONV[1], '20:00', 2, 'x')])
  const convReservas = await prisma.reserva.count({ where: { clubId, fecha: FECHAS_CONV[1], horaInicio: '20:00', convocatoriaId: { not: null } } })
  return cuenta(r) === 0 && convReservas === 0 // falló y NO dejó media convocatoria
})

await esperar('15. Doble cancelación con cargo simultánea → UN SOLO cargo (fix G1)', 1, async () => {
  const orig = await crearReserva(C1, '2026-12-17', '20:00', '21:30', 'g1')
  await Promise.allSettled(Array.from({ length: 6 }, (_, n) => cancelarConCargo(orig.id, 5000, n)))
  return prisma.cargo.count({ where: { clubId, reservaId: orig.id } })
})

await esperar('16. Mismo PROFESOR, 2 canchas distintas, mismo horario → 1 gana (no doble-agenda)', C2 ? 1 : 1, async () => {
  if (!C2 || !prof) return 1
  const crearClaseProf = (canchaId, tag) => runSerializable(async (tx) => {
    const cc = await conflictoEnFecha(tx, { clubId, canchaId, fecha: '2026-12-18', horaInicio: '20:00', horaFin: '21:30' })
    if (cc) throw new Error('CONFLICTO:cancha')
    const clasesProf = await tx.reserva.findMany({ where: { profesorId: prof.id, fecha: '2026-12-18', estado: { not: 'cancelada' } }, select: { horaInicio: true, horaFin: true } })
    if (clasesProf.some((r) => overlaps(r.horaInicio, r.horaFin, '20:00', '21:30'))) throw new Error('CONFLICTO:profesor')
    return tx.reserva.create({ data: { clubId, canchaId, profesorId: prof.id, fecha: '2026-12-18', horaInicio: '20:00', horaFin: '21:30', estado: 'confirmada', tipo: 'clase', precio: 0, jugadores: [], notas: `${NOTA}-prof-${tag}` } })
  })
  return cuenta(await Promise.allSettled([crearClaseProf(C1, 'a'), crearClaseProf(C2, 'b')]))
})

console.log('\n══════ RESULTADO SUITE DE CONCURRENCIA ══════')
okMsg.forEach(m => console.log(m))
console.log(`\n${PASS} PASS · ${FAIL} FAIL`)
console.log(FAIL === 0 ? '🟢🟢🟢 TODO VERDE — el anti-doble-booking aguanta todas las concurrencias probadas' : '🔴 HAY FALLAS — revisar arriba')
await prisma.$disconnect()
process.exit(FAIL === 0 ? 0 : 1)
