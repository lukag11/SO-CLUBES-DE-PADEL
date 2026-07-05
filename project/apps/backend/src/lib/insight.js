// Insight del día con IA: junta agregados del club (SIN PII) y le pide a Claude
// UNA recomendación accionable. Modelo Haiku 4.5 (barato; sin effort/thinking).
import Anthropic from '@anthropic-ai/sdk'
import prisma from './prisma.js'
import { hoyArgStr, inicioDiaArg, inicioMesArg, ahoraArgHHMM } from './tiempo.js'
import { calcularSaludFinanciera } from './finanzas.js'

// Si la fecha es HOY, deja solo las franjas cuyo horario todavía no pasó (compara con la hora
// actual argentina). Recalcula total. Para fechas futuras devuelve la disponibilidad tal cual.
const soloFuturas = (d, fecha) => {
  if (fecha !== hoyArgStr()) return d
  const ahora = ahoraArgHHMM()
  const libres = []
  let total = 0
  for (const l of d.libres) {
    const horas = l.horas.filter((h) => h > ahora)
    if (horas.length) { libres.push({ ...l, horas }); total += horas.length }
  }
  return { ...d, libres, total }
}
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

// Redacta un mensaje de WhatsApp listo para pegar en el grupo del club, invitando a
// un Americano o Super 8 para llenar una franja. On-demand (no cacheado). Semilla del
// futuro módulo de convocatorias — hoy el admin copia y pega el texto a mano.
export async function generarConvocatoriaWhatsapp({ club, modalidad, dia, horario, categoria, cupos, genero }) {
  const esSuper8 = modalidad === 'super8'
  const nombreMod = esSuper8 ? 'Super 8' : 'Americano'
  const reglas = esSuper8
    ? 'Super 8: venís con tu pareja fija y juegan todos contra todos, ranking por pareja.'
    : 'Americano: te anotás solo, las parejas rotan toda la tarde y hay ranking individual; ideal para jugar con todos y conocer gente.'

  const partes = [`Club: ${club || 'el club'}`, `Modalidad: ${nombreMod}`]
  if (dia) partes.push(`Día: ${dia}`)
  if (horario) partes.push(`Horario: ${horario}`)
  if (categoria) partes.push(`Categorías: ${categoria}`)
  if (genero) partes.push(`Género: ${genero === 'masculino' ? 'Masculino' : genero === 'femenino' ? 'Femenino' : 'Mixto'}`)
  if (cupos) partes.push(`Cupos: ${cupos}`)

  const prompt = `Sos el community manager de un club de pádel en Argentina. Escribí UN mensaje de WhatsApp, listo para pegar en el grupo del club, invitando a sumarse a un ${nombreMod}. Tono cercano y entusiasta en rioplatense, con algunos emojis bien puestos (sin exagerar). Entre 4 y 7 líneas. Incluí: un gancho, en una línea qué es (${reglas}), los datos que te paso (día/horario/categorías/cupos), y un cierre claro pidiendo que confirmen respondiendo este mensaje para reservar el lugar. No inventes datos que no te di: si falta el día o el horario, dejalo abierto o pedí que avisen su disponibilidad. Para resaltar usá el formato de WhatsApp (*texto* para negrita), nunca markdown. No pongas encabezados tipo "Asunto:" ni comillas alrededor del mensaje.

Datos:
${partes.join('\n')}

Mensaje:`

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 320,
    messages: [{ role: 'user', content: prompt }],
  })
  const texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
  return { texto, tokens: { in: resp.usage.input_tokens, out: resp.usage.output_tokens } }
}

// Junta los turnos LIBRES de una fecha: franjas del club por cancha menos lo ocupado
// (reservas pendientes/confirmadas + turnos fijos confirmados, descontando ausencias).
export async function gatherDisponibilidad(clubId, fecha) {
  const [fy, fm, fd] = fecha.split('-').map(Number)
  const wd = new Date(Date.UTC(fy, fm - 1, fd)).getUTCDay()

  const [club, canchas, reservas, turnosFijos] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { config: true, nombre: true } }),
    prisma.cancha.findMany({ where: { clubId, activo: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, horarios: true } }),
    prisma.reserva.findMany({ where: { clubId, fecha, estado: { in: ['pendiente', 'confirmada'] } }, select: { canchaId: true, horaInicio: true } }),
    prisma.turnoFijo.findMany({ where: { clubId, dia: DIAS_TF[wd], estado: 'confirmado' }, select: { canchaId: true, horaInicio: true, diasAusentes: true, desde: true } }),
  ])

  const horarios = club?.config?.horarios || {}
  const ocupadas = {} // canchaId -> Set(horaInicio)
  const add = (cid, h) => { (ocupadas[cid] ||= new Set()).add(h) }
  reservas.forEach((r) => add(r.canchaId, r.horaInicio))
  turnosFijos
    .filter((t) => !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))
    .forEach((t) => add(t.canchaId, t.horaInicio))

  const libres = []
  let total = 0
  for (const c of canchas) {
    const h = (c.horarios && c.horarios[DIAS_CFG[wd]]) || horarios[DIAS_CFG[wd]]
    const ocup = ocupadas[c.id] || new Set()
    const horas = franjaTimes(h).filter((f) => !ocup.has(f))
    if (horas.length) { libres.push({ cancha: c.nombre, horas }); total += horas.length }
  }
  return { club: club?.nombre ?? 'el club', dia: DIAS_NOM[wd], fecha, libres, total }
}

// La IA redacta el posteo de turnos disponibles para difundir (WhatsApp / IG / FB). On-demand.
export async function generarPostDisponibilidad(data) {
  const { club, dia, libres, total } = data
  if (!total) {
    const promptLleno = `Sos el community manager de un club de pádel en Argentina (${club}). Escribí UN posteo corto y simpático para redes/WhatsApp avisando que para ${dia} NO quedan turnos disponibles (está todo reservado), invitando a estar atentos por si se libera alguno. Rioplatense, 2-3 líneas, un par de emojis. Para resaltar usá *texto* (WhatsApp), nunca markdown. Sin comillas alrededor.`
    const r = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 180, messages: [{ role: 'user', content: promptLleno }] })
    return { texto: r.content.find((b) => b.type === 'text')?.text?.trim() ?? '', tokens: { in: r.usage.input_tokens, out: r.usage.output_tokens } }
  }

  const lista = libres.map((l) => `${l.cancha}: ${l.horas.join(', ')}`).join('\n')
  const prompt = `Sos el community manager de un club de pádel en Argentina. Escribí UN posteo para difundir (sirve para WhatsApp, Instagram y Facebook) con los turnos disponibles de ${dia}. Tono cercano y entusiasta en rioplatense, con emojis bien puestos (sin exagerar). Empezá con un saludo/gancho, listá los turnos libres de forma clara y prolija (por cancha y horario, tal cual te los paso), remarcá que los lugares son limitados y cerrá con un llamado claro a reservar (que escriban o respondan). No inventes turnos ni datos que no te di. Para resaltar usá *texto* (formato WhatsApp), nunca markdown. No pongas "Asunto:" ni comillas alrededor del posteo.

Club: ${club}
Día: ${dia}
Turnos libres (${total}):
${lista}

Posteo:`

  const resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
  const texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
  return { texto, tokens: { in: resp.usage.input_tokens, out: resp.usage.output_tokens } }
}

// Arma el snapshot de datos reales del club (agregados, sin PII) para el contexto del chat.
async function armarContextoClub(clubId) {
  const hoyStr = hoyArgStr()
  const [yy, mm, dd] = hoyStr.split('-').map(Number)
  const mDate = new Date(Date.UTC(yy, mm - 1, dd + 1))
  const mananaStr = `${mDate.getUTCFullYear()}-${String(mDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mDate.getUTCDate()).padStart(2, '0')}`

  const [info, dispHoyRaw, dispManana, jugadores, torneos] = await Promise.all([
    gatherInsightData(clubId),
    gatherDisponibilidad(clubId, hoyStr),
    gatherDisponibilidad(clubId, mananaStr),
    prisma.jugador.count({ where: { clubId } }),
    prisma.torneo.findMany({ where: { clubId, estado: { in: ['open', 'in_progress'] } }, select: { nombre: true, estado: true } }),
  ])
  const dispHoy = soloFuturas(dispHoyRaw, hoyStr) // no contar franjas de hoy que ya pasaron

  const libresTxt = dispHoy.total
    ? dispHoy.libres.map((l) => `${l.cancha}: ${l.horas.join(', ')}`).join(' | ')
    : 'no quedan turnos libres hoy'
  const libresMananaTxt = dispManana.total
    ? `${dispManana.total} (${dispManana.libres.map((l) => `${l.cancha}: ${l.horas.join(', ')}`).join(' | ')})`
    : 'no hay turnos libres'
  const flojasTxt = (info.franjasFlojas || []).map((f) => `${f.hora} (${f.reservas} en 2 sem)`).join(', ') || 'sin datos'
  const torneosTxt = torneos.length
    ? torneos.map((t) => `${t.nombre} (${t.estado === 'open' ? 'inscripción abierta' : 'en curso'})`).join(', ')
    : 'ninguno activo'

  // Lista de los próximos 8 días YA calculada (día de semana → fecha real), para que el modelo
  // no haga matemática de fechas (Haiku se equivoca). Incluye HOY y el de la semana que viene.
  const [hy, hm, hd] = hoyStr.split('-').map(Number)
  const proximosDias = []
  for (let i = 0; i < 8; i++) {
    const dt = new Date(Date.UTC(hy, hm - 1, hd + i))
    const f = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    const etq = i === 0 ? ' (HOY)' : i === 1 ? ' (mañana)' : ''
    proximosDias.push(`  ${DIAS_NOM[dt.getUTCDay()]} ${f}${etq}`)
  }

  const contexto = `Hoy es ${info.dia} ${hoyStr} (mañana: ${mananaStr}). Usá estas fechas reales para interpretar "hoy", "mañana" o cualquier día; nunca inventes ni calcules una fecha vos.
Próximos días (convertí cualquier día de semana que te nombren a la fecha EXACTA de esta lista):
${proximosDias.join('\n')}
Si el dueño nombra un día que es JUSTO hoy (mismo día de semana), no asumas: preguntale si lo quiere para hoy o para el de la semana que viene, ofreciéndole las dos fechas concretas de la lista.
Datos REALES del club "${info.club}":
- Ocupación de hoy: ${info.ocupacionHoyPct}% (${info.slotsOcupados} de ${info.slotsTotales} turnos)
- Turnos libres hoy: ${libresTxt}
- Turnos libres mañana: ${libresMananaTxt}
- Reservas últimos 7 días: ${info.reservasUlt7dias} (semana previa ${info.reservasSemanaPrevia}, tendencia ${info.tendenciaReservasPct >= 0 ? '+' : ''}${info.tendenciaReservasPct}%)
- Horas muertas (franjas flojas): ${flojasTxt}
- Plata por cobrar (deuda pendiente): $${info.deudaPorCobrar.toLocaleString('es-AR')}
- Jugadores registrados en el club: ${jugadores}
- Torneos activos: ${torneosTxt}`

  return contexto
}

// Junta los deudores del club (turnos impagos + cargos pendientes) agrupados por jugador.
// Devuelve nombres para mostrar EN EL FRONT (no se mandan a la IA).
async function gatherDeudores(clubId) {
  const [turnos, cargos] = await Promise.all([
    turnosImpagosDeuda(clubId),
    prisma.cargo.findMany({ where: { clubId, estado: 'pendiente', jugadorId: { not: null } }, include: { jugador: { select: { nombre: true, apellido: true } } } }),
  ])
  const map = new Map() // jugadorId -> { nombre, monto }
  for (const t of turnos) {
    if (!t.jugador) continue
    const cur = map.get(t.jugador.id) || { nombre: `${t.jugador.nombre} ${t.jugador.apellido ?? ''}`.trim(), monto: 0 }
    cur.monto += t.monto || 0
    map.set(t.jugador.id, cur)
  }
  for (const c of cargos) {
    const cur = map.get(c.jugadorId) || { nombre: c.jugador ? `${c.jugador.nombre} ${c.jugador.apellido ?? ''}`.trim() : 'Jugador', monto: 0 }
    cur.monto += c.monto || 0
    map.set(c.jugadorId, cur)
  }
  const lista = [...map.values()].filter((x) => x.monto > 0).sort((a, b) => b.monto - a.monto)
  return { lista, total: lista.reduce((s, x) => s + x.monto, 0), cantidad: lista.length }
}

// Ingresos cobrados (reservas pagadas + cargos pagados) hoy / últimos 7 días / mes.
async function gatherIngresos(clubId) {
  const inicioHoy = inicioDiaArg()
  const inicioMes = inicioMesArg()
  const inicio7 = inicioDiaArg(); inicio7.setDate(inicio7.getDate() - 6)
  const [rHoy, cHoy, r7, c7, rMes, cMes] = await Promise.all([
    prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioHoy } }, select: { precio: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioHoy } }, select: { monto: true } }),
    prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicio7 } }, select: { precio: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicio7 } }, select: { monto: true } }),
    prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioMes } }, select: { precio: true } }),
    prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioMes } }, select: { monto: true } }),
  ])
  const sp = (a) => a.reduce((s, r) => s + (r.precio ?? 0), 0)
  const sm = (a) => a.reduce((s, c) => s + (c.monto ?? 0), 0)
  return { hoy: sp(rHoy) + sm(cHoy), semana: sp(r7) + sm(c7), mes: sp(rMes) + sm(cMes) }
}

// ── Herramientas de WIarky: acciones que GENERAN texto (no escriben en la base) ──
const WIARK_TOOLS = [
  {
    name: 'consultar_disponibilidad',
    description: 'Devuelve los turnos LIBRES de una fecha puntual (canchas y horarios). Usala cuando el dueño pregunta por la disponibilidad de un día distinto a hoy o mañana.',
    input_schema: { type: 'object', properties: { fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' } }, required: ['fecha'] },
  },
  {
    name: 'buscar_jugador',
    description: 'Verifica en la base si un jugador YA está registrado en el club, buscándolo por nombre. Usala SIEMPRE para chequear vos mismo si alguien está registrado (ej. el organizador de una convocatoria) en vez de preguntarle al dueño. Devuelve si existe, si hay varios, o si no está.',
    input_schema: { type: 'object', properties: { nombre: { type: 'string', description: 'Nombre y/o apellido del jugador a buscar' } }, required: ['nombre'] },
  },
  {
    name: 'horarios_para_evento',
    description: 'Devuelve los horarios de una fecha donde hay AL MENOS N canchas libres a la MISMA hora (un Super 8/Americano necesita 2+). Usala para ofrecer horarios cuando el dueño quiere organizar pero todavía no te dio la hora. NUNCA calcules vos la intersección de canchas: usá SIEMPRE esta herramienta, devuelve los horarios reales ya cruzados.',
    input_schema: { type: 'object', properties: { fecha: { type: 'string', description: 'YYYY-MM-DD (si no se aclara, es hoy)' }, canchas: { type: 'number', description: 'Mínimo de canchas a la vez (default 2)' } }, required: [] },
  },
  {
    name: 'armar_posteo_disponibilidad',
    description: 'Genera un posteo listo para difundir (WhatsApp/Instagram/Facebook) con los turnos libres de una fecha. Usala cuando el dueño pide "armá/pasá/publicá los turnos libres" o "publicá la disponibilidad".',
    input_schema: { type: 'object', properties: { fecha: { type: 'string', description: 'Fecha YYYY-MM-DD (si no se aclara, es hoy)' } }, required: [] },
  },
  {
    name: 'crear_convocatoria',
    description: 'Organiza un Americano o Super 8. LLAMALA APENAS tengas modalidad + fecha + horario, AUNQUE TODAVÍA NO TENGAS el organizador ni el resto: el sistema verifica PRIMERO la disponibilidad real (necesita 2+ canchas libres a esa hora) y, si el horario sirve, te pide el organizador; si no sirve, te devuelve los horarios reales que sí tienen canchas libres para que se los ofrezcas al dueño. NO crea nada sola: al final el dueño confirma con un botón. Usala cuando el dueño pide convocar/organizar/armar un Americano o Super 8.',
    input_schema: {
      type: 'object',
      properties: {
        modalidad: { type: 'string', enum: ['americano', 'super8'] },
        organizador: { type: 'string', description: 'Nombre del jugador organizador (las canchas quedan reservadas a su nombre; debe estar registrado)' },
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        horario: { type: 'string', description: 'Hora de inicio HH:MM' },
        categorias: { type: 'string', description: 'Categorías objetivo separadas por coma (ej: "6ta, 7ma")' },
        genero: { type: 'string', enum: ['masculino', 'femenino', 'mixto'], description: 'Género del evento: masculino, femenino o mixto. Si el dueño dice "para varones/hombres/caballeros" → masculino; "para mujeres/damas" → femenino; "mixto" → mixto. Si no lo aclara, omitilo.' },
        cupos: { type: 'number', description: 'Cantidad de jugadores que entran' },
        canchas: { type: 'number', description: 'Canchas a reservar (ej: 2 para un Super 8)' },
        visibilidad: { type: 'string', enum: ['publica', 'privada'], description: 'publica (se lista en el club + notifica a la categoría) o privada (solo por link, para el grupo del organizador). Default publica.' },
      },
      required: ['modalidad', 'fecha', 'horario'],
    },
  },
  {
    name: 'consultar_deudores',
    description: 'Lista los jugadores que deben plata (turnos impagos + cargos pendientes) y el total adeudado. Usala cuando el dueño pregunta quién le debe, por las deudas o las cuentas pendientes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_ingresos',
    description: 'Devuelve cuánto se facturó (ingresos efectivamente cobrados) hoy, en los últimos 7 días y en el mes. Usala cuando el dueño pregunta cuánto facturó, recaudó o cobró.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_salud_financiera',
    description: 'Devuelve la salud financiera del club (últimos 30 días): punto de equilibrio (break-even) en turnos y en %, rinde por turno (RevPACH), ocupación, costo del turno vacío y plata que se pierde por canchas vacías, rendimiento de tarifa (yield) con sus fugas, y turnos vencidos sin cobrar (ausencias). Usala cuando el dueño pregunta cómo va el club, si gana o pierde, cuántos turnos necesita para no perder, por qué pierde plata, cuál es su rinde/ocupación, o cuánto pierde por canchas vacías o ausencias.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cargar_gasto',
    description: 'Prepara la carga de un gasto/factura del club. NO lo guarda: el dueño lo confirma después con un botón. Usala cuando el dueño pide cargar, anotar o registrar un gasto o una factura.',
    input_schema: {
      type: 'object',
      properties: {
        monto: { type: 'number', description: 'Monto en pesos, solo el número (sin $ ni puntos)' },
        concepto: { type: 'string', description: 'Qué se gastó (ej: pelotas, luz, sueldos)' },
        categoria: { type: 'string', description: 'Opcional: categoría del gasto' },
      },
      required: ['monto', 'concepto'],
    },
  },
  {
    name: 'crear_jugador',
    description: 'Registra un nuevo jugador en el club. NO lo crea: el dueño lo confirma con un botón. Necesita nombre, apellido y DNI (los tres obligatorios). Usala cuando el dueño pide registrar o dar de alta a un jugador.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        dni: { type: 'string', description: 'DNI, solo números' },
        categoria: { type: 'string', description: 'Opcional: categoría (ej: 6ta)' },
        telefono: { type: 'string', description: 'Opcional' },
      },
      required: ['nombre', 'apellido', 'dni'],
    },
  },
  {
    name: 'crear_reserva',
    description: 'Prepara una reserva de cancha (el turno dura 1.5h). NO la crea: el dueño la confirma con un botón. Usala cuando el dueño pide reservar o anotar un turno en una cancha. Necesitás la cancha, la fecha y la hora de inicio.',
    input_schema: {
      type: 'object',
      properties: {
        canchaNombre: { type: 'string', description: 'Nombre de la cancha (ej: Cancha 1)' },
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        horaInicio: { type: 'string', description: 'Hora de inicio HH:MM (debe ser un horario de turno válido)' },
        jugador: { type: 'string', description: 'Opcional: nombre de quien reserva' },
        precio: { type: 'number', description: 'Opcional: precio del turno' },
      },
      required: ['canchaNombre', 'fecha', 'horaInicio'],
    },
  },
]

// Devuelve { paraModelo } (lo que ve la IA) y opcionalmente { artefacto } (texto que se
// le muestra al usuario abajo, con botón de copiar — NO lo repite la IA).
async function ejecutarHerramientaWiark(name, input, clubId) {
  const fechaOk = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f) ? f : hoyArgStr())
  if (name === 'consultar_disponibilidad') {
    const f = fechaOk(input.fecha)
    const d = soloFuturas(await gatherDisponibilidad(clubId, f), f)
    return { paraModelo: d.total ? `${d.total} libres — ${d.libres.map((l) => `${l.cancha}: ${l.horas.join(', ')}`).join(' | ')}` : 'No hay turnos libres esa fecha (o ya pasaron todos los horarios de hoy).' }
  }
  if (name === 'horarios_para_evento') {
    const f = fechaOk(input.fecha)
    const n = Math.max(2, Math.round(Number(input.canchas) || 2))
    const d = soloFuturas(await gatherDisponibilidad(clubId, f), f)
    const cont = {}
    for (const c of d.libres) for (const h of c.horas) cont[h] = (cont[h] || 0) + 1
    const slots = Object.entries(cont).filter(([, k]) => k >= n).map(([h]) => h).sort()
    return { paraModelo: slots.length ? `Horarios del ${f} con ${n}+ canchas libres a la misma hora (los únicos donde se puede organizar): ${slots.join(', ')}. Ofrecé SOLO estos, ninguno más.` : `El ${f} NO hay ningún horario con ${n} canchas libres a la vez. Avisale al dueño que no se puede organizar ese día (o que pruebe otro día).` }
  }
  if (name === 'buscar_jugador') {
    const q = (input.nombre || '').toString().trim()
    if (!q) return { paraModelo: 'Decime el nombre del jugador a buscar.' }
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
    const js = await prisma.jugador.findMany({ where: { clubId }, select: { nombre: true, apellido: true } })
    const exact = js.filter((j) => norm(`${j.nombre} ${j.apellido}`) === norm(q))
    const parcial = js.filter((j) => norm(`${j.nombre} ${j.apellido}`).includes(norm(q)))
    if (exact.length === 1) return { paraModelo: `SÍ, "${q}" ya está registrado. Usalo como organizador, no le preguntes al dueño si está registrado.` }
    if (exact.length > 1) return { paraModelo: `Hay ${exact.length} jugadores llamados "${q}". Pedile al dueño que aclare cuál (apellido completo).` }
    if (parcial.length === 1) return { paraModelo: `Hay uno parecido: "${parcial[0].nombre} ${parcial[0].apellido}". Confirmá con el dueño si es ese.` }
    if (parcial.length > 1) return { paraModelo: `No hay coincidencia exacta de "${q}", pero hay ${parcial.length} parecidos. Pedí apellido completo.` }
    return { paraModelo: `NO está registrado "${q}". Ofrecele al dueño darlo de alta con crear_jugador (necesitás el DNI).` }
  }
  if (name === 'armar_posteo_disponibilidad') {
    const f = fechaOk(input.fecha)
    const d = soloFuturas(await gatherDisponibilidad(clubId, f), f)
    const texto = (await generarPostDisponibilidad(d)).texto
    return { paraModelo: 'Posteo generado OK. Se le muestra al usuario abajo para copiar; no lo repitas.', artefacto: { tipo: 'Posteo de turnos libres', texto } }
  }
  if (name === 'crear_convocatoria') {
    const modalidad = input.modalidad === 'super8' ? 'super8' : 'americano'
    const esSuper8 = modalidad === 'super8'
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fecha) ? input.fecha : null
    const horaInicio = /^\d{1,2}:\d{2}$/.test(input.horario || '') ? input.horario.padStart(5, '0') : null
    // PASO 1: con fecha + hora ya verificamos disponibilidad (antes de pedir nada más).
    if (!fecha || !horaInicio) return { paraModelo: 'Para empezar a organizar necesito el día (YYYY-MM-DD) y el horario (HH:MM). Pedíselos al dueño.' }
    if (fecha < hoyArgStr()) return { paraModelo: `Esa fecha (${fecha}) ya pasó. Confirmá el día con el dueño.` }
    // Canchas según modalidad: Super 8 = 2 fijo; Americano = lo pedido (mínimo 2).
    const canchas = esSuper8 ? 2 : Math.max(2, Math.round(Number(input.canchas) || 2))

    // VERIFICACIÓN DURA de disponibilidad (lo PRIMERO, sin importar si falta el organizador):
    // tiene que haber `canchas` libres a esa hora. Si no, NO hay botón: se devuelven los horarios reales.
    const dispEvento = soloFuturas(await gatherDisponibilidad(clubId, fecha), fecha)
    const contH = {}
    for (const c of dispEvento.libres) for (const h of c.horas) contH[h] = (contH[h] || 0) + 1
    const slotsOk = Object.entries(contH).filter(([, k]) => k >= canchas).map(([h]) => h).sort()
    if (!slotsOk.includes(horaInicio)) {
      const hayAhi = contH[horaInicio] || 0
      const ops = slotsOk.length ? `Horarios de ese día con ${canchas}+ canchas libres: ${slotsOk.join(', ')}.` : `Ese día NO hay ningún horario con ${canchas} canchas libres.`
      return { paraModelo: `Verifiqué la grilla real: a las ${horaInicio} NO hay ${canchas} canchas libres (hay ${hayAhi}). NO ofrezcas el botón ni inventes. Decile la verdad al dueño y ofrecele estos horarios reales para elegir: ${ops}` }
    }

    // PASO 2: ya sabemos que el horario sirve. Ahora sí, el organizador (jugador registrado).
    const nombreOrg = (input.organizador || '').toString().trim()
    if (!nombreOrg) return { paraModelo: `El horario ${horaInicio} del ${fecha} tiene ${canchas} canchas libres, sirve. Ahora pedile al dueño a nombre de qué jugador (registrado) se organiza: las canchas quedan reservadas a su nombre.` }
    // norm ignora mayúsculas Y acentos (así "julian" matchea "Julián").
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
    const js = await prisma.jugador.findMany({ where: { clubId }, select: { id: true, nombre: true, apellido: true } })
    const q = norm(nombreOrg)
    // Match exacto por nombre+apellido; si no, parcial (nombre, apellido o substring).
    let cand = js.filter((j) => norm(`${j.nombre} ${j.apellido}`) === q)
    if (cand.length === 0) cand = js.filter((j) => norm(`${j.nombre} ${j.apellido}`).includes(q) || norm(j.nombre) === q || norm(j.apellido) === q)
    if (cand.length === 0) return { paraModelo: `El horario sirve, pero "${nombreOrg}" no figura como jugador registrado. Ofrecé darlo de alta (crear_jugador, necesitás el DNI) y después convocá.` }
    if (cand.length > 1) return { paraModelo: `Hay ${cand.length} jugadores que coinciden con "${nombreOrg}" (${cand.map((j) => `${j.nombre} ${j.apellido}`).join(', ')}). Pedile al dueño que aclare cuál (apellido completo).` }
    const organizadorJugadorId = cand[0].id
    const nombreOrgFull = `${cand[0].nombre} ${cand[0].apellido}`

    // PASO 3: cupos. Super 8 = 8 fijo (no se pregunta). Americano = hay que preguntarlo.
    const cupoMax = esSuper8 ? 8 : Math.round(Number(input.cupos) || 0)
    if (!esSuper8 && cupoMax < 2) return { paraModelo: `El horario y el organizador están OK. Para el Americano falta cuántos cupos (jugadores). Preguntáselo al dueño.` }

    // PASO 4: GÉNERO — hay que preguntarlo siempre (aunque la respuesta sea "mixto"). No lo asumas.
    const genero = ['masculino', 'femenino', 'mixto'].includes(input.genero) ? input.genero : null
    if (!genero) return { paraModelo: `El horario y el organizador están OK. Ahora preguntale al dueño el GÉNERO del evento: masculino, femenino o mixto. No lo asumas.` }
    const generoTxt = genero === 'masculino' ? 'Masculino' : genero === 'femenino' ? 'Femenino' : 'Mixto'

    // PASO 5: CATEGORÍA — preguntarla. Acepta "abierto/libre/todas" como sin filtro de categoría.
    const catRaw = (input.categorias || '').toString().trim()
    const abierto = /^(abiert[oa]|libre|todas?|todos|cualquiera|sin categor)/i.test(catRaw)
    const categorias = abierto ? [] : catRaw.split(',').map((c) => c.trim()).filter(Boolean)
    if (!abierto && categorias.length === 0) return { paraModelo: `Falta la CATEGORÍA. Preguntale al dueño para qué categoría(s) es (ej. 6ta, 7ma) o si es abierto a todas.` }

    // PASO 6: VISIBILIDAD — preguntarla explícitamente, no asumir pública.
    const visibilidad = input.visibilidad === 'privada' ? 'privada' : input.visibilidad === 'publica' ? 'publica' : null
    if (!visibilidad) return { paraModelo: `Última cosa: preguntale al dueño si la convocatoria es PÚBLICA (se lista en el club y se avisa a los jugadores de la categoría) o PRIVADA (solo por link, para su grupo).` }

    const nombreMod = esSuper8 ? 'Super 8' : 'Americano'
    const resumen = `Convocar ${nombreMod}${generoTxt ? ` ${generoTxt}` : ''}${categorias.length ? ` ${categorias.join('/')}` : ''} · ${fecha} ${horaInicio} · ${cupoMax} cupos · ${canchas} canchas · a nombre de ${nombreOrgFull} · ${visibilidad === 'privada' ? '🔒 privada (solo por link)' : '🌐 pública'}`
    return {
      paraModelo: `Horario verificado (hay ${canchas} canchas libres). Le muestro al dueño el botón para confirmar; todavía NO está creada.${visibilidad === 'privada' ? ' Es PRIVADA: no se lista ni se notifica.' : ' Es pública: se lista y se avisa a la categoría.'} Decí una línea corta tipo "Te dejo el botón para confirmar 👇" sin afirmar que está hecho.`,
      artefacto: { tipo: 'confirmacion', accion: 'crear_convocatoria', resumen, datos: { modalidad, fecha, horaInicio, categorias, genero, cupoMax, canchas, organizadorJugadorId, visibilidad } },
    }
  }
  if (name === 'consultar_deudores') {
    const { lista, total, cantidad } = await gatherDeudores(clubId)
    if (!cantidad) return { paraModelo: 'No hay deudores: nadie debe plata en este momento.' }
    return {
      paraModelo: `Hay ${cantidad} deudor(es), total $${total.toLocaleString('es-AR')}. La lista con los nombres se le muestra al usuario abajo; NO repitas los nombres vos.`,
      artefacto: { tipo: 'lista', titulo: 'Quién te debe', total, items: lista.map((x) => ({ nombre: x.nombre, detalle: `$${x.monto.toLocaleString('es-AR')}` })) },
    }
  }
  if (name === 'consultar_ingresos') {
    const ing = await gatherIngresos(clubId)
    return { paraModelo: `Ingresos cobrados — hoy: $${ing.hoy.toLocaleString('es-AR')}; últimos 7 días: $${ing.semana.toLocaleString('es-AR')}; este mes: $${ing.mes.toLocaleString('es-AR')}.` }
  }
  if (name === 'consultar_salud_financiera') {
    const s = await calcularSaludFinanciera(clubId)
    const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
    if (s.falta.costosFijos) {
      return { paraModelo: `El dueño TODAVÍA no cargó sus costos fijos, así que no se puede calcular el punto de equilibrio ni si gana o pierde. Decile que entre a la sección "Dirección" y cargue cuánto le sale tener el club abierto por mes (son 2 preguntas). Lo que sí sé: rinde por turno ${money(s.rindePorTurno)}, ocupación ${s.ocupacionPct}%, ${s.turnosVendidos} de ${s.turnosDisponibles} turnos vendidos (30 días).` }
    }
    const partes = [
      `Salud financiera (últimos 30 días, todo en turnos de 1.5h):`,
      s.breakEvenTurnos != null ? `- Punto de equilibrio: ${s.breakEvenTurnos} turnos/mes (${s.breakEvenPct}% de ocupación). Vendió ${s.turnosVendidos} → está ${s.porEncimaDelEquilibrio >= 0 ? s.porEncimaDelEquilibrio + ' turnos POR ENCIMA (ganando)' : Math.abs(s.porEncimaDelEquilibrio) + ' turnos POR DEBAJO (perdiendo)'}.` : '- Punto de equilibrio: no calculable (falta precio o costo variable).',
      `- Rinde por turno (RevPACH): ${money(s.rindePorTurno)}. Ocupación: ${s.ocupacionPct}%.`,
      `- Costo del turno vacío: ${money(s.costoTurnoVacio)} (lo que cuesta tener la cancha abierta un turno). Hay ${s.turnosVacios} turnos libres este mes; llenar los de horarios flojos es la mayor oportunidad (no todos se llenan, ej. la madrugada).`,
      s.yieldPct != null ? `- Rendimiento de tarifa (yield): ${s.yieldPct}%. Se fuga ${s.fugaVacioPct}% por canchas vacías y ${s.fugaDescuentoPct}% por descuentos.` : '',
      s.ausenciasPct != null ? `- Ausencias: ${s.ausencias} turnos vencidos sin cobrar = ${money(s.ausenciasMonto)} (${s.ausenciasPct}% de los vencidos).` : '',
      `- Costos fijos del mes: ${money(s.fijoMensual)}. Precio ${s.precioRealizado > 0 ? 'realizado' : 'de lista'}: ${money(s.precioRef)}.`,
      `Respondé la pregunta del dueño con estos números reales, en criollo y breve. No inventes datos que no estén acá.`,
    ]
    return { paraModelo: partes.filter(Boolean).join('\n') }
  }
  if (name === 'cargar_gasto') {
    const monto = Math.round(Number(input.monto) || 0)
    const concepto = (input.concepto || '').toString().trim()
    if (monto <= 0 || !concepto) return { paraModelo: 'Faltan datos: necesito el monto (mayor a 0) y el concepto. Pedíselos al usuario.' }
    const categoria = input.categoria ? input.categoria.toString().trim() : null
    const resumen = `Cargar gasto de $${monto.toLocaleString('es-AR')} — ${concepto}${categoria ? ` (${categoria})` : ''}`
    return { paraModelo: 'Le muestro al usuario un botón para confirmar; el gasto NO está cargado todavía.', artefacto: { tipo: 'confirmacion', accion: 'cargar_gasto', datos: { monto, concepto, categoria }, resumen } }
  }
  if (name === 'crear_reserva') {
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fecha) ? input.fecha : null
    const horaInicio = /^\d{1,2}:\d{2}$/.test(input.horaInicio || '') ? input.horaInicio.padStart(5, '0') : null
    if (!fecha || !horaInicio) return { paraModelo: 'Necesito la fecha (YYYY-MM-DD) y la hora de inicio (HH:MM). Pediselas al usuario.' }
    if (fecha < hoyArgStr()) return { paraModelo: `Esa fecha (${fecha}) ya pasó. Confirmá con el usuario para qué día es la reserva (hoy es ${hoyArgStr()}).` }
    const canchas = await prisma.cancha.findMany({ where: { clubId, activo: true }, select: { id: true, nombre: true } })
    const q = (input.canchaNombre || '').toLowerCase().trim()
    const cancha = canchas.find((c) => c.nombre.toLowerCase() === q) || (q && canchas.find((c) => c.nombre.toLowerCase().includes(q)))
    if (!cancha) return { paraModelo: `No encontré esa cancha. Las canchas del club son: ${canchas.map((c) => c.nombre).join(', ')}. Preguntale al usuario en cuál.` }
    const finTotal = toMin(horaInicio) + 90
    const fm = finTotal % 1440
    const horaFin = `${String(Math.floor(fm / 60)).padStart(2, '0')}:${String(fm % 60).padStart(2, '0')}`
    const disp = soloFuturas(await gatherDisponibilidad(clubId, fecha), fecha)
    const cDisp = disp.libres.find((x) => x.cancha === cancha.nombre)
    if (!cDisp || !cDisp.horas.includes(horaInicio)) {
      return { paraModelo: `El turno ${cancha.nombre} ${fecha} ${horaInicio} no está disponible (ya reservado, ya pasó la hora, o no es un horario de turno válido del club). Avisale al usuario; podés ofrecer consultar la disponibilidad real.` }
    }
    const precio = input.precio ? Math.round(Number(input.precio)) : null
    const jugador = (input.jugador || '').toString().trim()
    // Mejora 1: si el nombre coincide con UN jugador registrado, vinculamos su jugadorId.
    let jugadorId = null
    let nota = ''
    if (jugador) {
      const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const js = await prisma.jugador.findMany({ where: { clubId }, select: { id: true, nombre: true, apellido: true } })
      const matches = js.filter((j) => norm(`${j.nombre} ${j.apellido}`) === norm(jugador))
      if (matches.length === 1) jugadorId = matches[0].id
      else if (matches.length === 0) nota = ` Avisale al usuario que "${jugador}" no figura como jugador registrado: la reserva queda con el nombre suelto. Si quiere registrarlo, ofrecé hacerlo (necesitás el DNI).`
    }
    const resumen = `Reservar ${cancha.nombre} — ${fecha} ${horaInicio} a ${horaFin}${jugador ? ` · ${jugador}${jugadorId ? ' (registrado)' : ''}` : ''}${precio ? ` · $${precio.toLocaleString('es-AR')}` : ''}`
    return {
      paraModelo: 'Le muestro al usuario un botón para confirmar la reserva; todavía NO está creada.' + nota,
      artefacto: { tipo: 'confirmacion', accion: 'crear_reserva', resumen, datos: { canchaId: cancha.id, fecha, horaInicio, horaFin, tipo: 'eventual', precio, jugadores: jugador ? [jugador] : [], ...(jugadorId && { jugadorId }), notas: 'Reserva via WIarky' } },
    }
  }
  if (name === 'crear_jugador') {
    const nombre = (input.nombre || '').toString().trim()
    const apellido = (input.apellido || '').toString().trim()
    const dniRaw = (input.dni || '').toString().trim()
    const dni = dniRaw.replace(/\D/g, '')
    if (!nombre || !apellido || !dni) return { paraModelo: 'Para registrar un jugador necesito nombre, apellido y DNI (obligatorio). Pedí lo que falte.' }
    // VALIDACIONES (igual que el form): nombre/apellido sin números, DNI 7 u 8 dígitos.
    if (/\d/.test(nombre)) return { paraModelo: `El nombre no puede contener números ("${nombre}"). Pedile al usuario el nombre correcto.` }
    if (/\d/.test(apellido)) return { paraModelo: `El apellido no puede contener números ("${apellido}"). Pedile al usuario el apellido correcto.` }
    if (!/^\d{7,8}$/.test(dni)) return { paraModelo: `El DNI tiene que ser de 7 u 8 dígitos (te pasaron "${dniRaw}"). Pedile el DNI correcto, sin puntos.` }
    const yaExiste = await prisma.jugador.findFirst({ where: { clubId, dni }, select: { nombre: true, apellido: true } })
    if (yaExiste) return { paraModelo: `Ya hay un jugador con DNI ${dni} (${yaExiste.nombre} ${yaExiste.apellido}). No lo registres de nuevo; usalo si es el que buscás.` }
    const categoria = input.categoria ? input.categoria.toString().trim() : undefined
    const telefono = input.telefono ? input.telefono.toString().trim() : undefined
    const resumen = `Registrar jugador: ${nombre} ${apellido} · DNI ${dni}${categoria ? ` · ${categoria}` : ''}`
    return { paraModelo: 'Le muestro al usuario un botón para confirmar el alta; el jugador NO está registrado todavía.', artefacto: { tipo: 'confirmacion', accion: 'crear_jugador', resumen, datos: { nombre, apellido, dni, categoria, telefono } } }
  }
  return { paraModelo: 'Herramienta desconocida.' }
}

// Chat de WIarky con TOOL USE: responde preguntas Y puede generar posteos/convocatorias.
// `mensajes` = historial [{role:'user'|'assistant', content}]. Grounded, sin PII.
export async function responderChatAgente(clubId, mensajes) {
  const contexto = await armarContextoClub(clubId)
  const system = `Sos WIarky, el asistente IA de un club de pádel (marca PadelwIArk). Hablás en español rioplatense, cercano y breve, con alguna emoji con moderación. Ayudás al dueño a entender sus números y a llenar canchas.

Reglas:
- REGLA DE ORO (no la rompas nunca): vos NO creás nada por tu cuenta. Para registrar un jugador, reservar un turno, crear una convocatoria o cargar un gasto SIEMPRE tenés que USAR la herramienta correspondiente, que hace aparecer un BOTÓN de confirmar abajo de tu mensaje. El dato se crea SOLO cuando el dueño toca ese botón. Por lo tanto: NUNCA digas que algo "ya quedó", "está confirmado", "lo reservé", "listo, creado" si no usaste la herramienta. Cuando tengas todos los datos, llamá a la herramienta y decí una línea corta tipo "Te dejo el botón para confirmar 👇" — y NADA de afirmar que está hecho.
- MANTENÉ EL FOCO: si estás en medio de organizar un Americano o Super 8, NO te desvíes a otros temas ni preguntes cosas que no correspondan al flujo. Seguí EXACTAMENTE los pasos que te va pidiendo el sistema (disponibilidad → organizador → cupos si es Americano → género → categoría → pública/privada) hasta que aparezca el botón, sin meter preguntas de más ni cambiar de tema. Si el organizador coincide con varios jugadores, decíle al dueño cuántos hay y nombralos para que elija (ej. "tengo 3 Julian: Julian Reyneri, Julian Gómez, Julian Pérez — ¿cuál?").
- TRABAJÁ SIEMPRE CON LA REALIDAD DEL CLUB, nunca al voleo: aunque el dueño te diga "reservá tal hora" o "armá el evento a las 20", NO des por hecho que ese horario está libre. Las herramientas verifican la disponibilidad real: si el horario no sirve (ocupado, ya pasó, o no hay suficientes canchas), te van a devolver los horarios que SÍ están libres → pasáselos al dueño y ofrecele esos, sin inventar. Mejor todavía: ante un pedido de organizar, chequeá disponibilidad ANTES de pedir el resto de los datos.
- Para responder preguntas usá SOLO los datos reales de abajo; si falta un dato, decílo con honestidad (no inventes números).
- Tenés HERRAMIENTAS para consultar disponibilidad de una fecha, GENERAR un posteo de turnos libres, y GENERAR un mensaje de convocatoria de Americano/Super 8. Cuando el dueño te pida "armá/pasá/publicá los turnos libres" o "convocá/armá un Americano o Super 8", USÁ la herramienta correspondiente (no lo redactes vos a mano).
- Cuando usás una herramienta que GENERA un posteo (turnos libres o aviso de liberado), ese texto se le muestra al usuario automáticamente ABAJO de tu mensaje, con un botón para copiar. Por eso NO repitas ese texto en tu respuesta: escribí solo una línea corta presentándolo (ej. "Te armé el posteo, lo tenés acá abajo para copiar 👇").
- Para convocar/organizar un Americano o Super 8 usá crear_convocatoria, y llamala APENAS tengas modalidad + fecha + horario, ANTES de pedir el resto. El sistema te va guiando paso por paso: te va a ir pidiendo lo que falte, EN ORDEN, y vos le trasladás cada pregunta al dueño y volvés a llamar a la herramienta con la respuesta. El orden es: 1) verifica disponibilidad (si no hay 2+ canchas a esa hora, te da los horarios reales para ofrecer); 2) organizador (jugador registrado); 3) cupos (solo Americano; el Super 8 es 8 fijo); 4) género (masculino/femenino/mixto); 5) categoría (ej. 6ta/7ma, o "abierto"); 6) pública o privada. NO asumas género, categoría ni visibilidad: preguntáselos al dueño cuando el sistema te los pida. Recién con TODO eso aparece el botón de confirmar. Para el organizador NO uses buscar_jugador por separado: pasale el nombre (aunque sea solo el nombre de pila) directo a crear_convocatoria y el sistema lo resuelve solo (te avisa si está, si hay varios o si no está). No le pidas el DNI salvo que el sistema te diga que el jugador no existe.
- CUPOS Y CANCHAS según modalidad: un **Super 8** son SIEMPRE 8 jugadores en 2 canchas (está en el nombre) → NO preguntes cupos ni canchas, completalos vos (cupos 8, canchas 2). Para un **Americano** sí preguntá cuántos cupos (suele ser 8, 12 o 16; canchas = cupos ÷ 4). Así para un Super 8 los únicos datos que tenés que pedir son fecha/horario, organizador y, opcional, categoría/género.
- VERIFICÁ VOS, no preguntes: NUNCA le preguntes al dueño "¿está registrado tal jugador?". Usá la herramienta buscar_jugador para chequearlo en la base vos mismo. Si está → seguí. Si no está → ofrecé darlo de alta con crear_jugador. Preguntarle al dueño algo que podés verificar solo es perderle el tiempo.
- NO seas redundante: si en un mismo mensaje listás los datos que faltan, no vuelvas a preguntarlos de nuevo abajo. Pedí lo que falta UNA sola vez, en una frase corta.
- FLUJO PASO POR PASO (clave): si el dueño te da TODO junto (modalidad, día, horario, categoría, organizador), avanzá derecho al botón de confirmar. Pero si te da datos sueltos (ej. "quiero organizar un Super 8 el martes, ¿qué horarios tenés?"), NO dispares la creación ni le tires toda la disponibilidad cruda cancha por cancha. Andá de a UN paso: preguntá/resolvé una cosa por vez (primero el horario, después el organizador, etc.) para no marear al dueño.
- Disponibilidad para un evento: un Super 8/Americano necesita 2+ canchas a la MISMA hora. Cuando el dueño quiera organizar y no te dio la hora, usá SIEMPRE la herramienta horarios_para_evento para obtener los horarios reales con 2+ canchas libres — NUNCA los calcules vos cruzando las canchas en tu cabeza (te equivocás). Ofrecé SOLO los horarios que devuelve esa herramienta, ninguno más. Ya vienen sin los que pasaron.
- Recién con día + horario (de 2+ canchas) + organizador armado, ofrecé el botón de confirmar. NO se crea hasta que el dueño confirme. Si el organizador no está registrado, avisá que primero hay que registrarlo (crear_jugador).
- Para cargar un gasto usá la herramienta cargar_gasto con el monto y el concepto. El gasto NO se guarda hasta que el dueño confirme con un botón que aparece abajo de tu mensaje; vos solo decí una línea corta (ej. "Te dejo el gasto para confirmar 👇"). Si falta el monto o el concepto, pediselo.
- Para "quién me debe" usá consultar_deudores y para "cuánto facturé" usá consultar_ingresos. La lista de deudores (con nombres) se le muestra al usuario abajo: NUNCA repitas nombres de jugadores en tu texto (privacidad); referite al total y la cantidad.
- Para preguntas sobre CÓMO VA EL NEGOCIO (¿gano o pierdo?, ¿cuántos turnos necesito para no perder?, mi punto de equilibrio, mi rinde/ocupación, por qué pierdo plata, cuánto pierdo por canchas vacías o por ausencias, mi yield) usá consultar_salud_financiera. Explicá el número en criollo, sin tecnicismos, y si sirve sugerí la palanca (ej: "llená los horarios fríos"). Si el dueño no cargó los costos, invitalo a hacerlo en la sección Dirección (son 2 preguntas).
- Para reservar un turno usá crear_reserva (cancha + fecha + hora de inicio; el turno dura 1.5h, la hora de fin se calcula sola). NO se crea hasta que el dueño confirme con el botón. Si falta la cancha, la fecha o la hora, pediselas.
- Para registrar/dar de alta un jugador usá crear_jugador (nombre + apellido + DNI; el DNI es OBLIGATORIO). NO se crea hasta que el dueño confirme. Si falta el DNI, pediselo. El nombre completo separalo en nombre y apellido.
- En tus propios mensajes del chat escribí en texto plano, sin markdown.

${contexto}`

  let msgs = mensajes.map((m) => ({ role: m.role, content: m.content }))
  let resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 700, system, tools: WIARK_TOOLS, messages: msgs })

  const artefactos = []

  // Corre el loop de tool_use sobre una respuesta y junta los artefactos. Devuelve la última respuesta.
  const procesarTools = async (respuesta) => {
    let r = respuesta, guard = 0
    while (r.stop_reason === 'tool_use' && guard++ < 4) {
      msgs.push({ role: 'assistant', content: r.content })
      const results = []
      for (const b of r.content) {
        if (b.type !== 'tool_use') continue
        let out
        try { out = await ejecutarHerramientaWiark(b.name, b.input || {}, clubId) }
        catch (e) { out = { paraModelo: 'No se pudo ejecutar la herramienta.' } }
        if (out.artefacto) artefactos.push(out.artefacto)
        results.push({ type: 'tool_result', tool_use_id: b.id, content: out.paraModelo })
      }
      msgs.push({ role: 'user', content: results })
      r = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 700, system, tools: WIARK_TOOLS, messages: msgs })
    }
    return r
  }

  resp = await procesarTools(resp)
  let texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''

  // RED DE SEGURIDAD anti "confirmado fantasma": si WIarky afirma que algo quedó creado/confirmado
  // pero NO generó ningún botón de confirmación en este turno, lo forzamos a usar la herramienta
  // (o a no mentir). Esto es determinístico: no depende de que el modelo "se acuerde".
  const afirmaAccion = /confirmad|cread[oa]|reserv[éeó]|registrad|ya qued[óo]|qued[óo] (hecho|creado|listo|reservad)/i
  if (!artefactos.some((a) => a.accion) && afirmaAccion.test(texto)) {
    msgs.push({ role: 'assistant', content: resp.content })
    msgs.push({ role: 'user', content: [{ type: 'text', text: '[Sistema interno: en este turno NO usaste ninguna herramienta, así que NO se creó ni confirmó NADA y el dueño NO tiene ningún botón para tocar. Si ya tenés todos los datos para crear lo que el dueño pidió, llamá AHORA a la herramienta correspondiente (crear_convocatoria / crear_reserva / crear_jugador / cargar_gasto) para generar el botón de confirmar. Si en realidad no estabas creando nada, reformulá tu respuesta SIN afirmar que algo quedó hecho.]' }] })
    resp = await procesarTools(await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 700, system, tools: WIARK_TOOLS, messages: msgs }))
    texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? texto
  }

  return { texto, artefactos }
}

// La IA arma un aviso corto para re-publicar un turno que se acaba de liberar (cancelación). On-demand.
export async function generarPostLiberado({ club, canchaNombre, dia, horario }) {
  const detalle = [
    canchaNombre && `Cancha: ${canchaNombre}`,
    dia && `Día: ${dia}`,
    horario && `Horario: ${horario}`,
  ].filter(Boolean).join('\n')

  const prompt = `Sos el community manager de un club de pádel en Argentina (${club}). Se acaba de LIBERAR un turno (alguien lo canceló) y querés volver a ofrecerlo rápido para que no quede vacío. Escribí UN aviso corto con urgencia simpática para WhatsApp/redes, anunciando que se liberó ese turno y está disponible ahora. Rioplatense, 2 a 4 líneas, un par de emojis, con un llamado claro a quien lo quiera (que escriba o responda rápido). No inventes datos que no te di. Para resaltar usá *texto* (formato WhatsApp), nunca markdown. Sin comillas alrededor del aviso.

${detalle}

Aviso:`

  const resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
  const texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
  return { texto, tokens: { in: resp.usage.input_tokens, out: resp.usage.output_tokens } }
}
