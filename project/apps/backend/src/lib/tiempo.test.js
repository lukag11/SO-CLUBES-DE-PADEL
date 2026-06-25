import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMinHHMM, cruzaMedianoche, finEnMin, duracionMin } from './tiempo.js'

// Tests del manejo de FIN DE TURNO cross-midnight. Blindan el bug histórico: un turno que
// termina 00:30/01:00 (clubes que cierran después de medianoche) NO debe invertir el rango.

test('toMinHHMM convierte HH:MM a minutos', () => {
  assert.equal(toMinHHMM('00:00'), 0)
  assert.equal(toMinHHMM('08:00'), 480)
  assert.equal(toMinHHMM('23:30'), 1410)
})

test('cruzaMedianoche detecta turnos que pasan la medianoche', () => {
  assert.equal(cruzaMedianoche('08:00', '09:30'), false) // normal
  assert.equal(cruzaMedianoche('22:30', '00:00'), true)  // termina justo a medianoche
  assert.equal(cruzaMedianoche('23:30', '01:00'), true)  // el bug histórico
  assert.equal(cruzaMedianoche('23:00', '00:30'), true)
})

test('finEnMin: turno normal NO suma día', () => {
  assert.equal(finEnMin('08:00', '09:30'), 570)
  assert.equal(finEnMin('20:00', '21:30'), 1290)
})

test('finEnMin: turno cross-midnight suma 1440 (REGRESIÓN del bug)', () => {
  assert.equal(finEnMin('22:30', '00:00'), 1440) // antes: 0 ❌
  assert.equal(finEnMin('23:30', '01:00'), 1500) // antes: 60 ❌ (el que rompía deuda/display)
  assert.equal(finEnMin('23:00', '00:30'), 1470) // antes: 30 ❌ (el que vio Luca)
})

test('duracionMin siempre es positiva y correcta', () => {
  assert.equal(duracionMin('08:00', '09:30'), 90)
  assert.equal(duracionMin('23:30', '01:00'), 90)  // antes daba 0 ❌
  assert.equal(duracionMin('22:30', '00:00'), 90)
})

test('un turno nocturno no figura terminado durante su propia jornada', () => {
  // Turno 23:30→01:00 (HOY). A las 23:45 (1425) todavía NO terminó; recién a las 01:00 (1500).
  const fin = finEnMin('23:30', '01:00')
  assert.ok(fin > toMinHHMM('23:45'), 'a las 23:45 sigue en curso')
  assert.equal(fin, 1500)
})
