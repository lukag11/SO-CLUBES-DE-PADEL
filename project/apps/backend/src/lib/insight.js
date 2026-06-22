// Insight del día con IA: junta agregados del club (SIN PII) y le pide a Claude
// UNA recomendación accionable. Modelo Haiku 4.5 (barato; sin effort/thinking).
import Anthropic from '@anthropic-ai/sdk'
import prisma from './prisma.js'
import { hoyArgStr, inicioDiaArg, inicioMesArg } from './tiempo.js'
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
export async function generarConvocatoriaWhatsapp({ club, modalidad, dia, horario, categoria, cupos }) {
  const esSuper8 = modalidad === 'super8'
  const nombreMod = esSuper8 ? 'Super 8' : 'Americano'
  const reglas = esSuper8
    ? 'Super 8: venís con tu pareja fija y juegan todos contra todos, ranking por pareja.'
    : 'Americano: te anotás solo, las parejas rotan toda la tarde y hay ranking individual; ideal para jugar con todos y conocer gente.'

  const partes = [`Club: ${club || 'el club'}`, `Modalidad: ${nombreMod}`]
  if (dia) partes.push(`Día: ${dia}`)
  if (horario) partes.push(`Horario: ${horario}`)
  if (categoria) partes.push(`Categorías: ${categoria}`)
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

  const [info, dispHoy, dispManana, jugadores, torneos] = await Promise.all([
    gatherInsightData(clubId),
    gatherDisponibilidad(clubId, hoyStr),
    gatherDisponibilidad(clubId, mananaStr),
    prisma.jugador.count({ where: { clubId } }),
    prisma.torneo.findMany({ where: { clubId, estado: { in: ['open', 'in_progress'] } }, select: { nombre: true, estado: true } }),
  ])

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

  const contexto = `Hoy es ${info.dia} ${hoyStr} (mañana: ${mananaStr}). Usá estas fechas reales para interpretar "hoy", "mañana" o cualquier día; nunca inventes una fecha.
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
    name: 'armar_posteo_disponibilidad',
    description: 'Genera un posteo listo para difundir (WhatsApp/Instagram/Facebook) con los turnos libres de una fecha. Usala cuando el dueño pide "armá/pasá/publicá los turnos libres" o "publicá la disponibilidad".',
    input_schema: { type: 'object', properties: { fecha: { type: 'string', description: 'Fecha YYYY-MM-DD (si no se aclara, es hoy)' } }, required: [] },
  },
  {
    name: 'crear_convocatoria',
    description: 'Crea una convocatoria a un Americano o Super 8: reserva las canchas a nombre del jugador organizador y abre cupos para que se anoten. Genera el mensaje de WhatsApp con el link. NO la crea sola: el dueño confirma con un botón. Usala cuando el dueño pide convocar, organizar o armar un Americano/Super 8.',
    input_schema: {
      type: 'object',
      properties: {
        modalidad: { type: 'string', enum: ['americano', 'super8'] },
        organizador: { type: 'string', description: 'Nombre del jugador organizador (las canchas quedan reservadas a su nombre; debe estar registrado)' },
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        horario: { type: 'string', description: 'Hora de inicio HH:MM' },
        categorias: { type: 'string', description: 'Categorías objetivo separadas por coma (ej: "6ta, 7ma")' },
        cupos: { type: 'number', description: 'Cantidad de jugadores que entran' },
        canchas: { type: 'number', description: 'Canchas a reservar (ej: 2 para un Super 8)' },
      },
      required: ['modalidad', 'organizador', 'fecha', 'horario', 'cupos', 'canchas'],
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
    const d = await gatherDisponibilidad(clubId, fechaOk(input.fecha))
    return { paraModelo: d.total ? `${d.total} libres — ${d.libres.map((l) => `${l.cancha}: ${l.horas.join(', ')}`).join(' | ')}` : 'No hay turnos libres esa fecha.' }
  }
  if (name === 'armar_posteo_disponibilidad') {
    const d = await gatherDisponibilidad(clubId, fechaOk(input.fecha))
    const texto = (await generarPostDisponibilidad(d)).texto
    return { paraModelo: 'Posteo generado OK. Se le muestra al usuario abajo para copiar; no lo repitas.', artefacto: { tipo: 'Posteo de turnos libres', texto } }
  }
  if (name === 'crear_convocatoria') {
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(input.fecha) ? input.fecha : null
    const horaInicio = /^\d{1,2}:\d{2}$/.test(input.horario || '') ? input.horario.padStart(5, '0') : null
    const cupoMax = Math.round(Number(input.cupos) || 0)
    if (!fecha || !horaInicio || cupoMax < 2) return { paraModelo: 'Para convocar necesito modalidad, fecha (YYYY-MM-DD), horario (HH:MM) y cupos (mínimo 2). Pedí lo que falte.' }
    if (fecha < hoyArgStr()) return { paraModelo: `Esa fecha (${fecha}) ya pasó. Confirmá el día con el dueño.` }
    // Organizador: las canchas se reservan a su nombre. Debe ser un jugador registrado.
    const nombreOrg = (input.organizador || '').toString().trim()
    if (!nombreOrg) return { paraModelo: '¿A nombre de qué jugador organizamos? Las canchas se reservan a su nombre (tiene que estar registrado).' }
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
    const js = await prisma.jugador.findMany({ where: { clubId }, select: { id: true, nombre: true, apellido: true } })
    const matches = js.filter((j) => norm(`${j.nombre} ${j.apellido}`) === norm(nombreOrg))
    if (matches.length === 0) return { paraModelo: `"${nombreOrg}" no figura como jugador registrado. Para organizar, primero registralo (herramienta crear_jugador, necesitás el DNI) y después convocá. Avisale esto al usuario.` }
    if (matches.length > 1) return { paraModelo: `Hay más de un jugador llamado "${nombreOrg}". Pedile al usuario que aclare cuál (o el apellido completo).` }
    const organizadorJugadorId = matches[0].id
    const categorias = (input.categorias || '').toString().split(',').map((c) => c.trim()).filter(Boolean)
    const canchas = Math.max(1, Math.round(Number(input.canchas) || 1))
    const nombreMod = input.modalidad === 'super8' ? 'Super 8' : 'Americano'
    const resumen = `Convocar ${nombreMod}${categorias.length ? ` ${categorias.join('/')}` : ''} · ${fecha} ${horaInicio} · ${cupoMax} cupos · ${canchas} ${canchas === 1 ? 'cancha' : 'canchas'} · a nombre de ${nombreOrg}`
    return {
      paraModelo: 'Le muestro al usuario un botón para confirmar; todavía NO está creada. Al confirmar: se reservan las canchas a nombre del organizador, se abre la convocatoria, se arma el mensaje de WhatsApp con el link y se avisa a los jugadores de la categoría. Si no hay canchas libres a esa hora, no se crea.',
      artefacto: { tipo: 'confirmacion', accion: 'crear_convocatoria', resumen, datos: { modalidad: input.modalidad === 'super8' ? 'super8' : 'americano', fecha, horaInicio, categorias, cupoMax, canchas, organizadorJugadorId } },
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
    const disp = await gatherDisponibilidad(clubId, fecha)
    const cDisp = disp.libres.find((x) => x.cancha === cancha.nombre)
    if (!cDisp || !cDisp.horas.includes(horaInicio)) {
      return { paraModelo: `El turno ${cancha.nombre} ${fecha} ${horaInicio} no está disponible (ya reservado o no es un horario de turno válido del club). Avisale al usuario; podés ofrecer consultar la disponibilidad.` }
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
    const dni = (input.dni || '').toString().replace(/\D/g, '')
    if (!nombre || !apellido || !dni) return { paraModelo: 'Para registrar un jugador necesito nombre, apellido y DNI (obligatorio). Pedí lo que falte.' }
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
- Para responder preguntas usá SOLO los datos reales de abajo; si falta un dato, decílo con honestidad (no inventes números).
- Tenés HERRAMIENTAS para consultar disponibilidad de una fecha, GENERAR un posteo de turnos libres, y GENERAR un mensaje de convocatoria de Americano/Super 8. Cuando el dueño te pida "armá/pasá/publicá los turnos libres" o "convocá/armá un Americano o Super 8", USÁ la herramienta correspondiente (no lo redactes vos a mano).
- Cuando usás una herramienta que GENERA un posteo (turnos libres o aviso de liberado), ese texto se le muestra al usuario automáticamente ABAJO de tu mensaje, con un botón para copiar. Por eso NO repitas ese texto en tu respuesta: escribí solo una línea corta presentándolo (ej. "Te armé el posteo, lo tenés acá abajo para copiar 👇").
- Para convocar/organizar un Americano o Super 8 usá crear_convocatoria. Necesitás: modalidad, **organizador** (jugador registrado a cuyo nombre quedan las canchas; un Super 8 son 2 canchas), fecha, horario, cupos y canchas. NO se crea hasta que el dueño confirme. Al confirmar: se reservan las canchas a nombre del organizador, se abre la convocatoria, se arma el mensaje de WhatsApp con el link y se avisa a los jugadores de la categoría. Si el organizador no está registrado, avisá que primero hay que registrarlo (crear_jugador). Si falta algún dato, pedíselo.
- Para cargar un gasto usá la herramienta cargar_gasto con el monto y el concepto. El gasto NO se guarda hasta que el dueño confirme con un botón que aparece abajo de tu mensaje; vos solo decí una línea corta (ej. "Te dejo el gasto para confirmar 👇"). Si falta el monto o el concepto, pediselo.
- Para "quién me debe" usá consultar_deudores y para "cuánto facturé" usá consultar_ingresos. La lista de deudores (con nombres) se le muestra al usuario abajo: NUNCA repitas nombres de jugadores en tu texto (privacidad); referite al total y la cantidad.
- Para reservar un turno usá crear_reserva (cancha + fecha + hora de inicio; el turno dura 1.5h, la hora de fin se calcula sola). NO se crea hasta que el dueño confirme con el botón. Si falta la cancha, la fecha o la hora, pediselas.
- Para registrar/dar de alta un jugador usá crear_jugador (nombre + apellido + DNI; el DNI es OBLIGATORIO). NO se crea hasta que el dueño confirme. Si falta el DNI, pediselo. El nombre completo separalo en nombre y apellido.
- En tus propios mensajes del chat escribí en texto plano, sin markdown.

${contexto}`

  let msgs = mensajes.map((m) => ({ role: m.role, content: m.content }))
  let resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 700, system, tools: WIARK_TOOLS, messages: msgs })

  const artefactos = []
  let guard = 0
  while (resp.stop_reason === 'tool_use' && guard++ < 4) {
    msgs.push({ role: 'assistant', content: resp.content })
    const results = []
    for (const b of resp.content) {
      if (b.type !== 'tool_use') continue
      let r
      try { r = await ejecutarHerramientaWiark(b.name, b.input || {}, clubId) }
      catch (e) { r = { paraModelo: 'No se pudo ejecutar la herramienta.' } }
      if (r.artefacto) artefactos.push(r.artefacto)
      results.push({ type: 'tool_result', tool_use_id: b.id, content: r.paraModelo })
    }
    msgs.push({ role: 'user', content: results })
    resp = await client.messages.create({ model: 'claude-haiku-4-5', max_tokens: 700, system, tools: WIARK_TOOLS, messages: msgs })
  }

  const texto = resp.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
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
