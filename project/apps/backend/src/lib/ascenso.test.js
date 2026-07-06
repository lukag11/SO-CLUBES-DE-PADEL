import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catCorta, nivelDeCategoria, categoriaSuperior } from './ascenso.js'

// Red de seguridad de las piezas puras del motor de ascenso (dirección de categorías).
// La lógica de conteo (títulos/parejas) es DB-based; acá cubrimos el mapeo de niveles.

test('catCorta extrae el ordinal corto', () => {
  assert.equal(catCorta('5ta Categoría'), '5ta')
  assert.equal(catCorta('1ra Categoría'), '1ra')
  assert.equal(catCorta('4ta Categoría B'), '4ta')
})

test('nivelDeCategoria: 1ra=1 (mejor) … 8va=8 (peor)', () => {
  assert.equal(nivelDeCategoria('1ra Categoría'), 1)
  assert.equal(nivelDeCategoria('4ta Categoría'), 4)
  assert.equal(nivelDeCategoria('8va Categoría'), 8)
  assert.equal(nivelDeCategoria('Cualquier cosa'), null)
})

test('categoriaSuperior: ascender = una categoría mejor (número menor)', () => {
  assert.equal(categoriaSuperior('5ta Categoría'), '4ta Categoría')
  assert.equal(categoriaSuperior('8va Categoría'), '7ma Categoría')
  assert.equal(categoriaSuperior('2da Categoría'), '1ra Categoría')
})

test('categoriaSuperior: 1ra no puede ascender (ya es la mejor) → null', () => {
  assert.equal(categoriaSuperior('1ra Categoría'), null)
  assert.equal(categoriaSuperior('no-reconocida'), null)
})
