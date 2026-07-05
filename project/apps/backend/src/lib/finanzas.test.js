import { test } from 'node:test'
import assert from 'node:assert/strict'
import { franjasDia, franjaTimes } from './tiempo.js' // fuente única (antes triplicadas)
import { montoMensual, ocurrenciasDia, turnosDisponiblesEnFechas } from './finanzas.js'

// Red de seguridad del MOTOR FINANCIERO. Estas piezas puras alimentan el denominador del
// break-even (turnos disponibles), el RevPACH y el flujo de caja. Si franjasDia se rompe al
// unificarla (está triplicada), el break-even de TODOS los clubes cambia en silencio.

// ── franjasDia: cuántos turnos de 1.5h entran en un día ──────────────────────────────

test('franjasDia: día normal 08:00→23:30 = 10 turnos', () => {
  assert.equal(franjasDia({ activo: true, apertura: '08:00', cierre: '23:30' }), 10)
})

test('franjasDia: un solo turno 10:00→11:30 = 1', () => {
  assert.equal(franjasDia({ activo: true, apertura: '10:00', cierre: '11:30' }), 1)
})

test('franjasDia: cierre 00:00 = medianoche (1440), NO cero', () => {
  // El único caso donde "00:00" vale 1440: es el CIERRE del club (medianoche siguiente).
  assert.equal(franjasDia({ activo: true, apertura: '08:00', cierre: '00:00' }), 10) // (1440-480)/90=10.6→10
})

test('franjasDia: CRUCE DE MEDIANOCHE 00:30 y 01:00 no invierte el rango (bug histórico)', () => {
  // Clubes que cierran tarde. El cierre después de medianoche debe SUMAR un día, no romperse.
  assert.equal(franjasDia({ activo: true, apertura: '08:00', cierre: '00:30' }), 11) // (1470-480)/90=11
  assert.equal(franjasDia({ activo: true, apertura: '08:00', cierre: '01:00' }), 11) // (1500-480)/90=11.3→11
  assert.equal(franjasDia({ activo: true, apertura: '22:00', cierre: '02:00' }), 2)  // turno full nocturno
})

test('franjasDia: día cerrado o sin horario = 0', () => {
  assert.equal(franjasDia({ activo: false, apertura: '08:00', cierre: '23:30' }), 0)
  assert.equal(franjasDia(null), 0)
  assert.equal(franjasDia(undefined), 0)
  assert.equal(franjasDia({}), 0)
})

// ── franjaTimes: las horas de inicio de cada turno ───────────────────────────────────

test('franjaTimes: 08:00→12:30 arranca en 08:00, 09:30, 11:00', () => {
  assert.deepEqual(franjaTimes({ activo: true, apertura: '08:00', cierre: '12:30' }), ['08:00', '09:30', '11:00'])
})

test('franjaTimes: cruce de medianoche envuelve a 00:30 (mm % 1440)', () => {
  // 23:00→02:00: los inicios son 23:00 y 00:30 (el segundo YA pasó la medianoche).
  assert.deepEqual(franjaTimes({ activo: true, apertura: '23:00', cierre: '02:00' }), ['23:00', '00:30'])
})

test('franjaTimes: día cerrado = lista vacía', () => {
  assert.deepEqual(franjaTimes({ activo: false, apertura: '08:00', cierre: '23:30' }), [])
  assert.deepEqual(franjaTimes(null), [])
})

// ── montoMensual: normaliza cualquier costo a su equivalente mensual (la "mochila") ──

test('montoMensual: mensual queda igual', () => {
  assert.equal(montoMensual({ periodicidad: 'mensual', monto: 100000 }), 100000)
})

test('montoMensual: bimestral se divide por 2, anual por 12', () => {
  assert.equal(montoMensual({ periodicidad: 'bimestral', monto: 100000 }), 50000)
  assert.equal(montoMensual({ periodicidad: 'anual', monto: 1200000 }), 100000)
})

test('montoMensual: único NO suma a la mochila mensual (no es recurrente)', () => {
  assert.equal(montoMensual({ periodicidad: 'unico', monto: 500000 }), 0)
})

// ── ocurrenciasDia: cuántas veces cae un día de semana en un mes (flujo de caja de TF) ──

test('ocurrenciasDia: febrero 2026 (28 días = 4 semanas exactas) → cada día 4 veces', () => {
  for (let idx = 0; idx < 7; idx++) assert.equal(ocurrenciasDia(idx, 2026, 2), 4)
})

test('ocurrenciasDia: julio 2026 (31 días, arranca miércoles) → mié/jue/vie 5 veces, resto 4', () => {
  assert.equal(ocurrenciasDia(3, 2026, 7), 5) // miércoles: 1,8,15,22,29
  assert.equal(ocurrenciasDia(4, 2026, 7), 5) // jueves
  assert.equal(ocurrenciasDia(5, 2026, 7), 5) // viernes
  assert.equal(ocurrenciasDia(6, 2026, 7), 4) // sábado
  assert.equal(ocurrenciasDia(0, 2026, 7), 4) // domingo
})

test('ocurrenciasDia: la suma de los 7 días = total de días del mes', () => {
  let suma = 0
  for (let idx = 0; idx < 7; idx++) suma += ocurrenciasDia(idx, 2026, 7)
  assert.equal(suma, 31) // julio
})

test('ocurrenciasDia: desdeDia excluye los días ya pasados del mes en curso (flujo de caja)', () => {
  // Miércoles de julio 2026: 1, 8, 15, 22, 29. Desde el día 8 quedan 4 (se descarta el 1).
  assert.equal(ocurrenciasDia(3, 2026, 7, 8), 4)
  assert.equal(ocurrenciasDia(3, 2026, 7, 1), 5)  // desde el 1 = todos
  assert.equal(ocurrenciasDia(3, 2026, 7, 23), 1) // solo el 29
  assert.equal(ocurrenciasDia(3, 2026, 7, 30), 0) // ningún miércoles después del 29
})

// ── turnosDisponiblesEnFechas: el DENOMINADOR del break-even y del RevPACH ────────────

test('turnosDisponiblesEnFechas: 2 canchas usan el horario del club', () => {
  const club = { Lunes: { activo: true, apertura: '08:00', cierre: '23:30' } } // 10 turnos
  const canchas = [{ horarios: null }, { horarios: null }]
  // 2026-07-06 es lunes → 2 canchas × 10 = 20
  assert.equal(turnosDisponiblesEnFechas(club, canchas, ['2026-07-06']), 20)
})

test('turnosDisponiblesEnFechas: una cancha con horario propio pisa el del club', () => {
  const club = { Lunes: { activo: true, apertura: '08:00', cierre: '23:30' } } // 10
  const canchas = [
    { horarios: { Lunes: { activo: true, apertura: '08:00', cierre: '12:30' } } }, // propio: 3
    { horarios: null }, // club: 10
  ]
  assert.equal(turnosDisponiblesEnFechas(club, canchas, ['2026-07-06']), 13)
})

test('turnosDisponiblesEnFechas: un día cerrado no aporta turnos', () => {
  const club = { Lunes: { activo: false, apertura: '08:00', cierre: '23:30' } }
  const canchas = [{ horarios: null }]
  assert.equal(turnosDisponiblesEnFechas(club, canchas, ['2026-07-06']), 0)
})
