import { test } from 'node:test'
import assert from 'node:assert/strict'
import { overlaps, fechaADia, proximasFechasDeDia } from './conflictos.js'

test('overlaps: turnos normales que se solapan / no se solapan', () => {
  assert.equal(overlaps('20:00', '21:30', '21:30', '23:00'), false) // contiguos, NO solapan
  assert.equal(overlaps('20:00', '21:30', '20:00', '21:30'), true)  // idénticos
  assert.equal(overlaps('19:00', '20:30', '20:00', '21:30'), true)  // solape parcial
  assert.equal(overlaps('08:00', '09:30', '10:00', '11:30'), false) // separados
})

test('overlaps: CRUCE DE MEDIANOCHE (el bug que rompía todo)', () => {
  assert.equal(overlaps('23:00', '00:30', '23:30', '01:00'), true)  // dos nocturnos se solapan
  assert.equal(overlaps('22:30', '00:00', '23:00', '00:30'), true)  // 00:00 y 00:30 se solapan
  assert.equal(overlaps('23:00', '00:30', '21:00', '22:30'), false) // nocturno vs temprano: NO
  assert.equal(overlaps('23:30', '01:00', '00:30', '02:00'), true)  // ambos pasan medianoche
})

test('fechaADia devuelve el día de semana correcto', () => {
  assert.equal(fechaADia('2026-06-24'), 'miercoles') // 24/06/2026 es miércoles
  assert.equal(fechaADia('2026-06-22'), 'lunes')
})

test('proximasFechasDeDia: próximas N ocurrencias de un día', () => {
  const f = proximasFechasDeDia('lunes', 3, '2026-06-22') // 22/06 es lunes
  assert.deepEqual(f, ['2026-06-22', '2026-06-29', '2026-07-06'])
})

test('proximasFechasDeDia: arranca desde la fecha dada (incluida si coincide)', () => {
  const f = proximasFechasDeDia('miercoles', 2, '2026-06-24') // 24/06 es miércoles
  assert.equal(f.length, 2)
  assert.equal(f[0], '2026-06-24')
  assert.equal(f[1], '2026-07-01')
})
