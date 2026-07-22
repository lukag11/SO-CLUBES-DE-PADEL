import prisma from './prisma.js'
import { runSerializable } from './serializable.js'
import { generarConvocatoriaWhatsapp } from './insight.js'
import { hoyArgStr, ahoraArgHHMM } from './tiempo.js'
import { normalizarCategoria } from './categorias.js'
import { tarifaListaSnapshot } from './finanzas.js'
import { conflictoEnFecha } from './conflictos.js'

// Lleva las categorías al formato canónico ("4ta Categoría") sin importar por qué camino
// llegaron (REST, WIarky, Fase B jugador). Punto único: garantiza que lo guardado y lo
// notificado matcheen contra Jugador.categoria.
const normalizarCategorias = (arr) =>
  Array.isArray(arr) ? arr.map((c) => normalizarCategoria(c)).filter(Boolean) : []

// Único helper propio de la convocatoria: la duración fija de +90'. Los solapes/conflictos de
// cancha se delegan a la fuente única lib/conflictos.js (conflictoEnFecha) — no se duplica la lógica.
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const sumar90 = (hhmm) => { const t = (toMin(hhmm) + 90) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }

// Organiza una convocatoria: reserva N canchas a nombre del jugador organizador (mismas
// reglas que una reserva normal) + crea la convocatoria, todo ATÓMICO bajo Serializable
// (anti doble-booking). Las reservas quedan linkeadas vía convocatoriaId. Lanza {status:409}
// si no hay N canchas libres a esa hora.
export async function organizarConvocatoria({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias = [], genero = null, cupoMax, canchas = 1, precio = null, visibilidad = 'publica' }) {
  categorias = normalizarCategorias(categorias)
  // Guard de fecha/hora pasada (defensa en profundidad: el front filtra, pero el backend no confía).
  const hoy = hoyArgStr()
  if (fecha < hoy || (fecha === hoy && horaInicio <= ahoraArgHHMM())) {
    throw Object.assign(new Error(`No se puede organizar en un horario que ya pasó (${fecha} ${horaInicio}).`), { status: 400 })
  }
  const horaFin = sumar90(horaInicio)

  return runSerializable(async (tx) => {
    const canchasClub = await tx.cancha.findMany({ where: { clubId, activo: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } })
    // Fuente única de conflictos: conflictoEnFecha chequea reservas+clases del día y TF activos
    // (ausencias/desde), cross-midnight. Antes había una copia local de la lógica de solape → migrado.
    const libres = []
    for (const c of canchasClub) {
      if (!(await conflictoEnFecha(tx, { clubId, canchaId: c.id, fecha, horaInicio, horaFin }))) libres.push(c)
      if (libres.length >= canchas) break
    }
    if (libres.length < canchas) {
      throw Object.assign(new Error(`No hay ${canchas} canchas libres el ${fecha} a las ${horaInicio} (hay ${libres.length}).`), { status: 409 })
    }

    const conv = await tx.convocatoria.create({
      data: { clubId, modalidad, categorias, genero: genero || null, fecha, horaInicio, canchas, cupoMax, visibilidad: visibilidad === 'privada' ? 'privada' : 'publica', estado: 'abierta', createdBy: organizadorJugadorId },
    })
    for (const c of libres) {
      await tx.reserva.create({
        data: { clubId, canchaId: c.id, jugadorId: organizadorJugadorId, fecha, horaInicio, horaFin, estado: 'confirmada', tipo: 'eventual', precio, tarifaLista: await tarifaListaSnapshot(tx, c.id), jugadores: [], notas: `Convocatoria ${modalidad === 'super8' ? 'Super 8' : 'Americano'}`, convocatoriaId: conv.id },
      })
    }
    return { convocatoria: conv, canchasReservadas: libres.map((c) => c.nombre) }
  })
}

// Crea una convocatoria COMPLETA: reserva canchas (organizarConvocatoria) + notifica a la
// categoría (si pública) + arma el mensaje de WhatsApp con el link. Lo usan WIarky y el form admin.
export async function crearConvocatoriaCompleta({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias = [], genero = null, cupoMax, canchas = 1, visibilidad = 'publica' }) {
  categorias = normalizarCategorias(categorias)
  const vis = visibilidad === 'privada' ? 'privada' : 'publica'
  const { convocatoria, canchasReservadas } = await organizarConvocatoria({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias, genero, cupoMax, canchas, visibilidad: vis })

  // Notif in-app a la categoría — solo si es pública
  if (vis === 'publica' && categorias.length) {
    // Match por categoría NORMALIZADA de ambos lados (no `in` exacto): así matchea aunque un
    // jugador tenga guardada una forma vieja/corta ("4ta" vs "4ta Categoría"). Falla-mudo evitado.
    const catSet = new Set(categorias.map(normalizarCategoria).filter(Boolean))
    const jugadores = (await prisma.jugador.findMany({ where: { clubId, activo: true, categoria: { not: null } }, select: { id: true, categoria: true } }))
      .filter((j) => catSet.has(normalizarCategoria(j.categoria)))
    if (jugadores.length) {
      await prisma.notificacion.createMany({
        data: jugadores.map((j) => ({ clubId, jugadorId: j.id, tipo: 'convocatoria_abierta', data: { convocatoriaId: convocatoria.id, modalidad, fecha, horaInicio, categorias } })),
      })
    }
  }

  // Mensaje de WhatsApp con el link público
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
  const { texto } = await generarConvocatoriaWhatsapp({ club: club?.nombre, modalidad, dia: fecha, horario: horaInicio, categoria: categorias.join(', '), genero, cupos: cupoMax })
  const base = process.env.APP_PUBLIC_URL || 'http://localhost:5173'
  const link = `${base}/convocatoria/${convocatoria.id}`
  return { convocatoria, canchasReservadas, link, mensajeWhatsapp: `${texto}\n\n👉 Anotate acá: ${link}` }
}

// Notifica a los anotados (voy/espera con cuenta) que la convocatoria se canceló/eliminó.
// Devuelve a cuántos avisó. La usa tanto cancelar como eliminar (DELETE).
export async function notificarConvocatoriaCancelada(clubId, conv, motivo = null, exceptoJugadorId = null) {
  const cupos = await prisma.convocatoriaCupo.findMany({
    where: {
      convocatoriaId: conv.id,
      jugadorId: exceptoJugadorId ? { not: null, notIn: [exceptoJugadorId] } : { not: null },
      estado: { in: ['voy', 'espera'] },
    },
    select: { jugadorId: true },
  })
  if (!cupos.length) return 0
  await prisma.notificacion.createMany({
    data: cupos.map((c) => ({
      clubId,
      jugadorId: c.jugadorId,
      tipo: 'convocatoria_cancelada',
      data: { convocatoriaId: conv.id, modalidad: conv.modalidad, fecha: conv.fecha, horaInicio: conv.horaInicio, motivo: motivo || null },
    })),
  })
  return cupos.length
}

// Cancela una convocatoria y LIBERA sus canchas (cancela las reservas linkeadas) + avisa a los anotados.
export async function cancelarConvocatoria(clubId, convocatoriaId, motivo = null, exceptoJugadorId = null) {
  const { conv, upd } = await prisma.$transaction(async (tx) => {
    const conv = await tx.convocatoria.findFirst({ where: { id: convocatoriaId, clubId } })
    if (!conv) throw Object.assign(new Error('Convocatoria no encontrada'), { status: 404 })
    await tx.reserva.updateMany({ where: { convocatoriaId, estado: { not: 'cancelada' } }, data: { estado: 'cancelada' } })
    const upd = await tx.convocatoria.update({ where: { id: convocatoriaId }, data: { estado: 'cancelada' } })
    return { conv, upd }
  })
  await notificarConvocatoriaCancelada(clubId, conv, motivo, exceptoJugadorId)
  return upd
}
