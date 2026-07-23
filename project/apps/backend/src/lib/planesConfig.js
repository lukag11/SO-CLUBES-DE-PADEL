import prisma from './prisma.js'
import { DEFAULT_MATRIZ } from './planes.js'

const CLAVE = 'planMatriz'

// Lee la matriz de planes vigente desde la DB. Si no existe todavía, devuelve la
// default (no la escribe hasta que se edite/seede explícitamente).
export const getMatriz = async () => {
  const row = await prisma.platformSetting.findUnique({ where: { clave: CLAVE } })
  return row?.valor || DEFAULT_MATRIZ
}

// Guarda (upsert) la matriz editada desde el panel.
export const setMatriz = async (matriz) => {
  const row = await prisma.platformSetting.upsert({
    where: { clave: CLAVE },
    update: { valor: matriz },
    create: { clave: CLAVE, valor: matriz },
  })
  return row.valor
}

// ── Contacto de ventas de PadelwIArk (para el CTA "Mejorar plan") ──
// Se carga UNA vez desde el panel /plataforma y el modal lo lee. Así, el día que haya un WhatsApp
// real, se propaga solo (nada hardcodeado). Vacío = el modal degrada el botón (no abre link roto).
const CLAVE_CONTACTO = 'contactoVentas'

export const getContactoVentas = async () => {
  const row = await prisma.platformSetting.findUnique({ where: { clave: CLAVE_CONTACTO } })
  return { whatsapp: '', email: '', prefijo: '549', area: '', numero: '', ...(row?.valor || {}) }
}

// Guarda el contacto. Acepta las partes (prefijo/área/número) — así el panel las rearma al recargar —
// y deriva `whatsapp` (lo único que usa el modal) = prefijo + área + número, solo dígitos.
export const setContactoVentas = async ({ prefijo, area, numero, whatsapp, email }) => {
  const soloDig = (s) => String(s || '').replace(/[^\d]/g, '')
  const pfx = soloDig(prefijo) || '549'
  const ar = soloDig(area)
  const num = soloDig(numero)
  // Si vienen las partes, armamos el whatsapp; si viene el whatsapp entero (compat), lo usamos.
  const full = (ar || num) ? `${pfx}${ar}${num}` : soloDig(whatsapp)
  const valor = { whatsapp: full, prefijo: pfx, area: ar, numero: num, email: String(email || '').trim() }
  const row = await prisma.platformSetting.upsert({
    where: { clave: CLAVE_CONTACTO },
    update: { valor },
    create: { clave: CLAVE_CONTACTO, valor },
  })
  return row.valor
}
