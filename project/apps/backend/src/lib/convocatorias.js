import prisma from './prisma.js'
import { runSerializable } from './serializable.js'
import { generarConvocatoriaWhatsapp } from './insight.js'

// Helpers de horario (cross-midnight aware), autocontenidos para no tocar reservas.js.
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const rangoMin = (inicio, fin) => { const i = toMin(inicio); let f = toMin(fin); if (f <= i) f += 1440; return { i, f } }
const overlaps = (aIni, aFin, bIni, bFin) => {
  const a = rangoMin(aIni, aFin), b = rangoMin(bIni, bFin)
  if (a.i < b.f && a.f > b.i) return true
  if (a.i < b.f + 1440 && a.f > b.i + 1440) return true
  if (a.i + 1440 < b.f && a.f + 1440 > b.i) return true
  return false
}
const sumar90 = (hhmm) => { const t = (toMin(hhmm) + 90) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Organiza una convocatoria: reserva N canchas a nombre del jugador organizador (mismas
// reglas que una reserva normal) + crea la convocatoria, todo ATÓMICO bajo Serializable
// (anti doble-booking). Las reservas quedan linkeadas vía convocatoriaId. Lanza {status:409}
// si no hay N canchas libres a esa hora.
export async function organizarConvocatoria({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias = [], genero = null, cupoMax, canchas = 1, precio = null, visibilidad = 'publica' }) {
  const horaFin = sumar90(horaInicio)
  const [fy, fm, fd] = fecha.split('-').map(Number)
  const diaKey = DIAS[new Date(fy, fm - 1, fd).getDay()]

  return runSerializable(async (tx) => {
    const canchasClub = await tx.cancha.findMany({ where: { clubId, activo: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } })
    const reservas = await tx.reserva.findMany({ where: { clubId, fecha, estado: { in: ['pendiente', 'confirmada'] } }, select: { canchaId: true, horaInicio: true, horaFin: true } })
    const tfs = await tx.turnoFijo.findMany({ where: { clubId, dia: diaKey, estado: 'confirmado' }, select: { canchaId: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true } })

    const ocupada = (canchaId) => {
      if (reservas.some((r) => r.canchaId === canchaId && overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))) return true
      if (tfs.some((t) => t.canchaId === canchaId && overlaps(t.horaInicio, t.horaFin, horaInicio, horaFin) && !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))) return true
      return false
    }
    const libres = canchasClub.filter((c) => !ocupada(c.id)).slice(0, canchas)
    if (libres.length < canchas) {
      throw Object.assign(new Error(`No hay ${canchas} canchas libres el ${fecha} a las ${horaInicio} (hay ${libres.length}).`), { status: 409 })
    }

    const conv = await tx.convocatoria.create({
      data: { clubId, modalidad, categorias, genero: genero || null, fecha, horaInicio, canchas, cupoMax, visibilidad: visibilidad === 'privada' ? 'privada' : 'publica', estado: 'abierta', createdBy: organizadorJugadorId },
    })
    for (const c of libres) {
      await tx.reserva.create({
        data: { clubId, canchaId: c.id, jugadorId: organizadorJugadorId, fecha, horaInicio, horaFin, estado: 'confirmada', tipo: 'eventual', precio, jugadores: [], notas: `Convocatoria ${modalidad === 'super8' ? 'Super 8' : 'Americano'}`, convocatoriaId: conv.id },
      })
    }
    return { convocatoria: conv, canchasReservadas: libres.map((c) => c.nombre) }
  })
}

// Crea una convocatoria COMPLETA: reserva canchas (organizarConvocatoria) + notifica a la
// categoría (si pública) + arma el mensaje de WhatsApp con el link. Lo usan WIarky y el form admin.
export async function crearConvocatoriaCompleta({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias = [], genero = null, cupoMax, canchas = 1, visibilidad = 'publica' }) {
  const vis = visibilidad === 'privada' ? 'privada' : 'publica'
  const { convocatoria, canchasReservadas } = await organizarConvocatoria({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias, genero, cupoMax, canchas, visibilidad: vis })

  // Notif in-app a la categoría — solo si es pública
  if (vis === 'publica' && categorias.length) {
    const jugadores = await prisma.jugador.findMany({ where: { clubId, activo: true, categoria: { in: categorias } }, select: { id: true } })
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
