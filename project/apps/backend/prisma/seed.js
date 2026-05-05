import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10)

  const club = await prisma.club.upsert({
    where: { slug: 'club-demo' },
    update: {},
    create: {
      nombre: 'Club Demo',
      slug: 'club-demo',
    },
  })

  await prisma.admin.upsert({
    where: { email: 'admin@club.com' },
    update: {},
    create: {
      clubId: club.id,
      nombre: 'Admin Demo',
      email: 'admin@club.com',
      password: passwordHash,
    },
  })

  console.log('Seed completo — Club:', club.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
