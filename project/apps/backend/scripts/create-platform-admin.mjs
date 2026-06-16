// Crea (o actualiza la contraseña de) un dueño de plataforma (PlatformAdmin).
// Uso (desde project/apps/backend):
//   node scripts/create-platform-admin.mjs "Nombre" email@dominio.com "contraseña"
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const [, , nombre, email, password] = process.argv

if (!nombre || !email || !password) {
  console.error('\nFaltan datos. Uso:\n  node scripts/create-platform-admin.mjs "Tu Nombre" tu@email.com "tuContraseña"\n')
  process.exit(1)
}

const run = async () => {
  const hash = await bcrypt.hash(password, 10)
  const existente = await prisma.platformAdmin.findUnique({ where: { email } })

  if (existente) {
    await prisma.platformAdmin.update({ where: { email }, data: { nombre, password: hash } })
    console.log(`\n✓ PlatformAdmin actualizado: ${email}\n`)
  } else {
    await prisma.platformAdmin.create({ data: { nombre, email, password: hash } })
    console.log(`\n✓ PlatformAdmin creado: ${email}\n`)
  }
}

run()
  .catch((e) => { console.error('Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
