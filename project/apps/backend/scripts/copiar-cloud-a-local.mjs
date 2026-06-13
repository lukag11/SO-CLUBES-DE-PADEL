// Copia TODA la data del Supabase cloud a la base local (una sola vez).
// La URL del cloud se lee desde la línea COMENTADA del .env (nunca se imprime).
// La base local es la que ya está activa en DATABASE_URL (localhost).
//
// Uso (desde project/apps/backend):  node scripts/copiar-cloud-a-local.mjs
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')

// --- Descubrir la URL del cloud desde el .env (línea comentada con "supabase") ---
function findCloudUrl() {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  const grab = (key) => {
    for (const l of lines) {
      const m = l.match(new RegExp('^\\s*#?\\s*' + key + '\\s*=\\s*"?([^"\\n]+?)"?\\s*$'))
      if (m && /supabase/i.test(m[1])) return m[1]
    }
    return null
  }
  // Preferimos DIRECT_URL (conexión directa 5432); si no, DATABASE_URL (pooler)
  return grab('DIRECT_URL') || grab('DATABASE_URL')
}

const cloudUrl = findCloudUrl()
if (!cloudUrl) {
  console.error('❌ No encontré la URL del cloud (supabase) en el .env. ¿Está la línea comentada?')
  process.exit(1)
}

const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } })
const local = new PrismaClient() // usa DATABASE_URL del .env (localhost)

// Orden que respeta las foreign keys (padres primero)
const TABLAS = [
  'club',
  'admin',
  'profesor',
  'jugador',
  'cancha',
  'torneo',
  'reserva',
  'turnoFijo',
  'pareja',
  'cargo',
  'notificacion',
  'sponsor',
]

async function main() {
  console.log('🔌 Conectando al cloud (solo lectura)...')
  await cloud.$connect()
  console.log('🔌 Conectando a la base local...')
  await local.$connect()
  console.log('')

  for (const tabla of TABLAS) {
    const filas = await cloud[tabla].findMany()
    if (filas.length === 0) {
      console.log(`  ${tabla.padEnd(14)} 0 filas (vacío)`)
      continue
    }
    const res = await local[tabla].createMany({ data: filas, skipDuplicates: true })
    console.log(`  ${tabla.padEnd(14)} ${res.count}/${filas.length} copiadas`)
  }

  console.log('\n✅ Listo. Toda la data del cloud está ahora en tu Postgres local.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await cloud.$disconnect()
    await local.$disconnect()
  })
