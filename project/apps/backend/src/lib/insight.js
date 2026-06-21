// Insight del día con IA: junta agregados del club (SIN PII) y le pide a Claude
// UNA recomendación accionable. Modelo Haiku 4.5 (barato; sin effort/thinking).
import Anthropic from '@anthropic-ai/sdk'
import prisma from './prisma.js'
import { hoyArgStr } from './tiempo.js'
import { turnosImpagosDeuda } from './deudas.js'

const client = new Anthropic() // toma ANTHROPIC_API_KEY del entorno

// config.horarios usa capitalizado con acento; turnoFijo.dia usa minúscula sin acento
const DIAS_CFG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_TF  = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_NOM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }
const franjasDia = (h) => {
  if (!h?.activo) return 0
  const ap = toMin(h.apertura)
  let ci = h.cierre === '00:00' ? 1440 : toMin(h.cierre)
  if (ci <= ap) ci += 1440
  return Math.max(0, Math.floor((ci - ap) / 90))
}
// Lista de horarios de inicio de las franjas de 1.5h de un día {activo, apertura, cierre}
const franjaTimes = (h) => {
  if (!h?.activo) return []
  const ap = toMin(h.apertura)
  let ci = h.cierre === '00:00' ? 1440 : toMin(h.cierre)
  if (ci <= ap) ci += 1440
  const out = []
  for (let t = ap; t + 90 <= ci; t += 90) {
    const m = t % 1440
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}
const fechaMenos = (hoyStr, n) => {
  const [y, m, d] = hoyStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d - n))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

// Junta los números del club. Solo agregados, sin nombres de jugadores ni PII.
export async function gatherInsightData(clubId) {
  const hoyStr = hoyArgStr()
  const [hy, hm, hd] = hoyStr.split('-').map(Number)
  const wd = new Date(Date.UTC(hy, hm - 1, hd)).getUTCDay()
  const dias7 = Array.from({ length: 7 }, (_, i) => fechaMenos(hoyStr, i))       // hoy + 6 atrás
  const dias14 = Array.from({ length: 7 }, (_, i) => fechaMenos(hoyStr, i + 7))  // semana previa

  const [club, canchas, reservas7, reservas14, tfHoy, impagos, cargos, reservasHoy, reservasFranja] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { config: true, nombre: true } }),
    prisma.cancha.findMany({ where: { clubId, activo: true }, select: { horarios: true } }),
    prisma.reserva.count({ where: { clubId, estado: 'confirmada', fecha: { in: dias7 } } }),
    prisma.reserva.count({ where: { clubId, estado: 'confirmada', fecha: { in: dias14 } } }),
    prisma.turnoFijo.findMany({ where: { clubId, dia: DIAS_TF[wd], estado: 'confirmado' }, select: { diasAusentes: true, desde: true } }),
    turnosImpagosDeuda(clubId),
    prisma.cargo.findMany({ where: { clubId, estado: 'pendiente' }, select: { monto: true } }),
    prisma.reserva.count({ where: { clubId, fecha: hoyStr, estado: 'confirmada' } }),
    // Reservas de las últimas 2 semanas (por hora de inicio) para detectar franjas flojas
    prisma.reserva.findMany({ where: { clubId, estado: 'confirmada', fecha: { in: [...dias7, ...dias14] } }, select: { horaInicio: true } }),
  ])

  const horarios = club?.config?.horarios || {}
  let slots = 0
  for (const c of canchas) {
    const h = (c.horarios && c.horarios[DIAS_CFG[wd]]) || horarios[DIAS_CFG[wd]]
    slots += franjasDia(h)
  }

  // ── Horas muertas: franjas de hoy con menos reservas en las últimas 2 semanas ──
  const horarioRep = (canchas[0]?.horarios && canchas[0].horarios[DIAS_CFG[wd]]) || horarios[DIAS_CFG[wd]]
  const franjas = franjaTimes(horarioRep)
  const cuentaFranja = {}
  franjas.forEach((f) => { cuentaFranja[f] = 0 })
  reservasFranja.forEach((r) => { if (r.horaInicio in cuentaFranja) cuentaFranja[r.horaInicio]++ })
  const franjasFlojas = Object.entries(cuentaFranja)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([hora, n]) => ({ hora, reservas: n }))
  const tfHoyAct = tfHoy.filter((t) => !t.diasAusentes.includes(hoyStr) && (!t.desde || t.desde <= hoyStr)).length
  const ocupados = slots > 0 ? Math.min(reservasHoy + tfHoyAct, slots) : reservasHoy + tfHoyAct
  const ocupacionPct = slots > 0 ? Math.round((ocupados / slots) * 100) : 0
  const deuda = impagos.reduce((s, t) => s + (t.monto || 0), 0) + cargos.reduce((s, c) => s + (c.monto || 0), 0)
  const tendenciaPct = reservas14 > 0 ? Math.round(((reservas7 - reservas14) / reservas14) * 100) : (reservas7 > 0 ? 100 : 0)

  return {
    club: club?.nombre ?? 'el club',
    dia: DIAS_NOM[wd],
    ocupacionHoyPct: ocupacionPct,
    slotsTotales: slots,
    slotsOcupados: ocupados,
    reservasUlt7dias: reservas7,
    reservasSemanaPrevia: reservas14,
    tendenciaReservasPct: tendenciaPct,
    deudaPorCobrar: deuda,
    franjasFlojas, // [{hora, reservas}] — franjas con menos reservas en 2 semanas
  }
}

// Le pide a Claude UNA recomendación accionable a partir de los números.
export async function generarInsightIA(data) {
  const flojas = (data.franjasFlojas || []).filter((f) => f.reservas <= 2)
  const flojasTxt = flojas.length
    ? flojas.map((f) => `${f.hora} (${f.reservas} reservas en 2 semanas)`).join(', ')
    : 'ninguna franja claramente floja'

  const prompt = `Sos un asesor de negocios experto en clubes de pádel en Argentina. Te paso los números reales de un club. Devolvé UNA sola recomendación accionable y concreta para el dueño, en español rioplatense, en 1 o 2 frases (máximo 40 palabras). Tono directo y práctico, sin saludos, sin relleno, sin repetir los números crudos.

REGLA CLAVE: si hay franjas/horas muertas (poco reservadas), tu recomendación principal debe ser llenarlas. La mejor forma de llenar horas muertas es organizando un **Super 8** o un **Americano** (modalidades sociales de pádel que juntan 8+ jugadores y llenan canchas en horarios flojos). Mencioná la franja concreta y sugerí armar uno de esos eventos ahí. Si NO hay horas muertas y todo viene bien, felicitá y sugerí cómo sostenerlo.

Datos de hoy y las últimas 2 semanas (no inventes otros):
- Día de hoy: ${data.dia}
- Ocupación de hoy: ${data.ocupacionHoyPct}% (${data.slotsOcupados} de ${data.slotsTotales} turnos del día)
- Reservas en los últimos 7 días: ${data.reservasUlt7dias} (semana previa: ${data.reservasSemanaPrevia}, tendencia ${data.tendenciaReservasPct >= 0 ? '+' : ''}${data.tendenciaReservasPct}%)
- Horas muertas (franjas con menos reservas): ${flojasTxt}
- Plata por cobrar (deuda pendiente): $${data.deudaPorCobrar.toLocaleString('es-AR')}

Recomendación:`

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 120,
    messages: [{ role: 'user', content: prompt }],
  })
  const texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
  return { texto, tokens: { in: resp.usage.input_tokens, out: resp.usage.output_tokens } }
}
