import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizarCategoria } from './categorias.js'

test('normaliza el formato corto al canónico', () => {
  assert.equal(normalizarCategoria('4ta'), '4ta Categoría')
  assert.equal(normalizarCategoria('1ra'), '1ra Categoría')
  assert.equal(normalizarCategoria('8va'), '8va Categoría')
})

test('normaliza el formato Unicode "4ª" (admin viejo)', () => {
  assert.equal(normalizarCategoria('4ª'), '4ta Categoría')
  assert.equal(normalizarCategoria('7ª'), '7ma Categoría')
})

test('normaliza el formato grados "4°" (torneos viejo)', () => {
  assert.equal(normalizarCategoria('4°'), '4ta Categoría')
  assert.equal(normalizarCategoria('4° Categoría'), '4ta Categoría')
  assert.equal(normalizarCategoria('2° Categoría'), '2da Categoría')
})

test('el canónico queda igual (idempotente)', () => {
  assert.equal(normalizarCategoria('4ta Categoría'), '4ta Categoría')
  assert.equal(normalizarCategoria('1ra Categoría'), '1ra Categoría')
})

test('preserva las variantes de torneo', () => {
  assert.equal(normalizarCategoria('4ta Categoría B'), '4ta Categoría B')
  assert.equal(normalizarCategoria('4° Categoría +35'), '4ta Categoría +35')
  assert.equal(normalizarCategoria('4ta B'), '4ta Categoría B')
})

test('null / vacío → null (no rompe)', () => {
  assert.equal(normalizarCategoria(null), null)
  assert.equal(normalizarCategoria(undefined), null)
  assert.equal(normalizarCategoria('   '), null)
})

test('lo que no entiende lo deja igual (no rompe data rara)', () => {
  assert.equal(normalizarCategoria('Mixto'), 'Mixto')
  assert.equal(normalizarCategoria('9na'), '9na') // fuera de rango 1-8 → sin tocar
})

test('tolera espacios y mayúsculas', () => {
  assert.equal(normalizarCategoria('  4ta categoria  '), '4ta Categoría')
  assert.equal(normalizarCategoria('5TA'), '5ta Categoría')
})
