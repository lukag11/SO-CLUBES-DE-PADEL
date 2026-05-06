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

  await prisma.jugador.upsert({
    where: { clubId_dni: { clubId: club.id, dni: '12345678' } },
    update: {},
    create: {
      clubId: club.id,
      nombre: 'Lucas',
      apellido: 'Romero',
      dni: '12345678',
      password: passwordHash,
    },
  })

  const canchasData = [
    { nombre: 'Cancha 1', tipo: 'Cristal', indoor: true },
    { nombre: 'Cancha 2', tipo: 'Cristal', indoor: true },
    { nombre: 'Cancha 3', tipo: 'Pared',   indoor: false },
    { nombre: 'Cancha 4', tipo: 'Pared',   indoor: false },
  ]

  for (const c of canchasData) {
    const existing = await prisma.cancha.findFirst({ where: { clubId: club.id, nombre: c.nombre } })
    if (!existing) {
      await prisma.cancha.create({ data: { clubId: club.id, ...c } })
    }
  }

  console.log('Seed completo — Club:', club.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
