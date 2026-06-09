// Migración única: convierte el base64 (data URLs) guardado en la DB a archivos
// en Supabase Storage, reemplazando cada data URL por su URL pública.
//
// Recorre: sponsors.logoUrl, clubs.config (JSON), torneos.personalizacion (JSON).
//
// Uso:
//   node scripts/migrate-images-to-storage.js          (aplica cambios)
//   node scripts/migrate-images-to-storage.js --dry     (solo reporta, no escribe)
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { uploadImage, isDataUrl } from '../src/lib/imageUpload.js'
import { storageEnabled } from '../src/lib/supabase.js'

const DRY = process.argv.includes('--dry')

let uploaded = 0
let bytesBefore = 0
let bytesAfter = 0

// Elige el perfil de procesamiento según el nombre del campo.
const profileForKey = (key = '') => {
  const k = key.toLowerCase()
  if (k.includes('logo'))   return 'logo'
  if (k.includes('avatar') || k.includes('foto')) return 'avatar'
  if (k.includes('flyer'))  return 'flyer'
  if (k.includes('galeria')) return 'galeria'
  return 'fondo'
}

// Recorre recursivamente un valor JSON; sube cualquier data URL y la reemplaza.
const walk = async (value, key, folder) => {
  if (typeof value === 'string') {
    if (isDataUrl(value)) {
      bytesBefore += value.length
      if (DRY) { uploaded++; return value }
      try {
        const { url, bytes } = await uploadImage(value, { profile: profileForKey(key), folder })
        uploaded++
        bytesAfter += bytes
        return url
      } catch (err) {
        console.warn(`  ⚠ falló ${key}: ${err.message}`)
        return value
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    const out = []
    for (const item of value) out.push(await walk(item, key, folder))
    return out
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = await walk(v, k, folder)
    return out
  }
  return value
}

const run = async () => {
  if (!storageEnabled() && !DRY) {
    console.error('❌ Storage no configurado (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Abortado.')
    process.exit(1)
  }
  console.log(DRY ? '🔍 DRY RUN — no se escribe nada\n' : '🚀 Migrando imágenes a Storage\n')

  // ── Sponsors ──
  const sponsors = await prisma.sponsor.findMany()
  console.log(`Sponsors: ${sponsors.length}`)
  for (const s of sponsors) {
    if (isDataUrl(s.logoUrl)) {
      const newUrl = await walk(s.logoUrl, 'logo', `${s.clubId}/sponsors`)
      if (!DRY && newUrl !== s.logoUrl) {
        await prisma.sponsor.update({ where: { id: s.id }, data: { logoUrl: newUrl } })
      }
    }
  }

  // ── Clubs (config JSON) ──
  const clubs = await prisma.club.findMany()
  console.log(`Clubs: ${clubs.length}`)
  for (const c of clubs) {
    if (c.config && typeof c.config === 'object') {
      const newConfig = await walk(c.config, 'config', `${c.id}/club`)
      if (!DRY) await prisma.club.update({ where: { id: c.id }, data: { config: newConfig } })
    }
  }

  // ── Torneos (personalizacion JSON) ──
  const torneos = await prisma.torneo.findMany()
  console.log(`Torneos: ${torneos.length}`)
  for (const t of torneos) {
    if (t.personalizacion && typeof t.personalizacion === 'object') {
      const newP = await walk(t.personalizacion, 'personalizacion', `${t.clubId}/torneos`)
      if (!DRY) await prisma.torneo.update({ where: { id: t.id }, data: { personalizacion: newP } })
    }
  }

  console.log(`\n✅ Imágenes detectadas/subidas: ${uploaded}`)
  console.log(`   Peso base64 en DB (aprox): ${(bytesBefore / 1024 / 1024).toFixed(2)} MB`)
  if (!DRY) console.log(`   Peso optimizado en Storage: ${(bytesAfter / 1024 / 1024).toFixed(2)} MB`)
  await prisma.$disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
