import bcrypt from 'bcryptjs'
import prisma from './prisma.js'

export const PLANES_VALIDOS = ['basico', 'pro', 'premium']

// Convierte un texto en slug url-safe (sin acentos ni símbolos).
export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// ============================================================
// MOTOR ÚNICO de alta de club (tenant).
// Lo usa hoy el panel de plataforma (alta asistida) y mañana el
// self-service público: mismo núcleo, solo cambia quién lo llama.
// Crea el club + su primer admin de forma atómica.
// ============================================================
export const crearClub = async ({
  clubNombre,
  slug,
  plan = 'basico',
  adminNombre,
  adminEmail,
  adminPassword,
  trialDias = 14,
}) => {
  if (!clubNombre || !adminEmail || !adminPassword) {
    throw Object.assign(new Error('Faltan datos: nombre del club, email y contraseña del administrador'), { status: 400 })
  }

  const planOk = PLANES_VALIDOS.includes(plan) ? plan : 'basico'

  // Slug único (deriva del nombre si no lo pasan; agrega sufijo si colisiona)
  let base = slugify(slug || clubNombre) || 'club'
  let finalSlug = base
  let i = 1
  while (await prisma.club.findUnique({ where: { slug: finalSlug }, select: { id: true } })) {
    finalSlug = `${base}-${i++}`
  }

  // Email de admin único a nivel global (Admin.email es @unique)
  const existeAdmin = await prisma.admin.findUnique({ where: { email: adminEmail }, select: { id: true } })
  if (existeAdmin) {
    throw Object.assign(new Error('Ya existe un administrador con ese email'), { status: 409 })
  }

  const trialHasta = trialDias > 0 ? new Date(Date.now() + trialDias * 24 * 60 * 60 * 1000) : null
  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const club = await prisma.$transaction(async (tx) => {
    const c = await tx.club.create({
      data: { nombre: clubNombre, slug: finalSlug, plan: planOk, estado: 'prueba', trialHasta },
    })
    await tx.admin.create({
      data: { clubId: c.id, nombre: adminNombre || 'Administrador', email: adminEmail, password: passwordHash },
    })
    return c
  })

  return club
}
