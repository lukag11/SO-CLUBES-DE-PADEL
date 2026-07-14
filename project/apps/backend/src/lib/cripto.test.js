import { test } from 'node:test'
import assert from 'node:assert'
import crypto from 'crypto'

// Clave de prueba autocontenida (no depende del .env).
process.env.MP_TOKEN_ENC_KEY = crypto.randomBytes(32).toString('base64')
const { encryptToken, decryptToken } = await import('./cripto.js')

test('cripto: ida y vuelta (cifra y descifra igual)', () => {
  const t = 'APP_USR-1234567890-secreto-del-club'
  const enc = encryptToken(t)
  assert.notEqual(enc, t)
  assert.equal(decryptToken(enc), t)
})

test('cripto: dos cifrados del mismo texto dan distinto (IV aleatorio)', () => {
  assert.notEqual(encryptToken('mismo'), encryptToken('mismo'))
})

test('cripto: detecta manipulación del ciphertext (GCM auth)', () => {
  const enc = encryptToken('plata')
  const [iv, tag, ct] = enc.split(':')
  const ctBuf = Buffer.from(ct, 'base64')
  ctBuf[0] ^= 0xff // corrompemos un byte
  assert.throws(() => decryptToken(`${iv}:${tag}:${ctBuf.toString('base64')}`))
})
