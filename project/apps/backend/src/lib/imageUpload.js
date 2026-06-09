import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { supabase, MEDIA_BUCKET, storageEnabled } from './supabase.js'

// Perfiles de procesamiento por tipo de imagen.
// maxW/maxH = caja de redimensionado (nunca agranda). format/quality = compresión.
const PROFILES = {
  logo:    { maxW: 400,  maxH: 400,  format: 'webp', quality: 82 },   // logos club/sponsor
  avatar:  { maxW: 400,  maxH: 400,  format: 'webp', quality: 80 },   // foto jugador
  flyer:   { maxW: 1080, maxH: 1080, format: 'webp', quality: 80 },   // flyer torneo
  fondo:   { maxW: 1920, maxH: 1080, format: 'webp', quality: 72 },   // fondos draw/bracket/landing
  galeria: { maxW: 1600, maxH: 1600, format: 'webp', quality: 74 },   // galería, staff
  default: { maxW: 1280, maxH: 1280, format: 'webp', quality: 80 },
}

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s

// Convierte cualquier entrada (Buffer | dataURL | base64 plano) a Buffer.
export const toBuffer = (input) => {
  if (Buffer.isBuffer(input)) return input
  if (typeof input !== 'string') return null
  const m = input.match(DATA_URL_RE)
  if (m) return Buffer.from(m[2], 'base64')
  // base64 plano sin prefijo
  try { return Buffer.from(input, 'base64') } catch { return null }
}

export const isDataUrl = (s) => typeof s === 'string' && DATA_URL_RE.test(s)

/**
 * Procesa (resize + compress) y sube una imagen al bucket de Storage.
 * @param {Buffer|string} input  Buffer, data URL o base64
 * @param {object} opts  { profile, folder }
 * @returns {Promise<{ url: string, path: string, bytes: number }>}
 */
export const uploadImage = async (input, { profile = 'default', folder = 'misc' } = {}) => {
  if (!storageEnabled()) throw new Error('storage_disabled')

  const buf = toBuffer(input)
  if (!buf || buf.length === 0) throw new Error('imagen_invalida')

  const p = PROFILES[profile] ?? PROFILES.default

  let processed
  try {
    processed = await sharp(buf)
      .rotate() // respeta orientación EXIF
      .resize(p.maxW, p.maxH, { fit: 'inside', withoutEnlargement: true })
      .toFormat(p.format, { quality: p.quality })
      .toBuffer()
  } catch {
    throw new Error('imagen_no_procesable')
  }

  const path = `${folder}/${randomUUID()}.${p.format}`

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, processed, {
      contentType: `image/${p.format}`,
      cacheControl: '31536000', // 1 año — el CDN cachea agresivo
      upsert: false,
    })

  if (error) throw new Error(`upload_failed: ${error.message}`)

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path, bytes: processed.length }
}

// Borra un archivo del bucket dado su URL pública (best-effort).
export const deleteByUrl = async (publicUrl) => {
  if (!storageEnabled() || typeof publicUrl !== 'string') return
  const marker = `/${MEDIA_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  try { await supabase.storage.from(MEDIA_BUCKET).remove([path]) } catch { /* noop */ }
}
