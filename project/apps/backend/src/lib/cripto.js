import crypto from 'crypto'

// Cifrado de secretos at-rest (tokens de Mercado Pago de cada club). AES-256-GCM
// (autenticado: si alguien toca el ciphertext en la DB, el descifrado falla). La clave
// vive en la env MP_TOKEN_ENC_KEY (32 bytes en base64). Formato guardado: "iv:tag:ct".
// keyVersion (en la tabla) queda para rotación futura sin tocar este helper.
const KEY_ENV = 'MP_TOKEN_ENC_KEY'

function getKey() {
  const b64 = process.env[KEY_ENV]
  if (!b64) throw new Error(`Falta ${KEY_ENV} (clave de cifrado de tokens de Mercado Pago)`)
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error(`${KEY_ENV} debe ser una clave de 32 bytes en base64`)
  return key
}

export function encryptToken(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptToken(payload) {
  const [ivB64, tagB64, ctB64] = String(payload).split(':')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Formato de token cifrado inválido')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8')
}

// ¿Está configurada la clave de cifrado? (para chequeos de arranque)
export const cifradoDisponible = () => !!process.env[KEY_ENV]
