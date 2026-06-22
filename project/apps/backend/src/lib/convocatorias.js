import prisma from './prisma.js'
import { runSerializable } from './serializable.js'

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
export async function organizarConvocatoria({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias = [], cupoMax, canchas = 1, precio = null }) {
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
      data: { clubId, modalidad, categorias, fecha, horaInicio, canchas, cupoMax, estado: 'abierta', createdBy: organizadorJugadorId },
    })
    for (const c of libres) {
      await tx.reserva.create({
        data: { clubId, canchaId: c.id, jugadorId: organizadorJugadorId, fecha, horaInicio, horaFin, estado: 'confirmada', tipo: 'eventual', precio, jugadores: [], notas: `Convocatoria ${modalidad === 'super8' ? 'Super 8' : 'Americano'}`, convocatoriaId: conv.id },
      })
    }
    return { convocatoria: conv, canchasReservadas: libres.map((c) => c.nombre) }
  })
}

// Cancela una convocatoria y LIBERA sus canchas (cancela las reservas linkeadas).
export async function cancelarConvocatoria(clubId, convocatoriaId) {
  return prisma.$transaction(async (tx) => {
    const conv = await tx.convocatoria.findFirst({ where: { id: convocatoriaId, clubId } })
    if (!conv) throw Object.assign(new Error('Convocatoria no encontrada'), { status: 404 })
    await tx.reserva.updateMany({ where: { convocatoriaId, estado: { not: 'cancelada' } }, data: { estado: 'cancelada' } })
    return tx.convocatoria.update({ where: { id: convocatoriaId }, data: { estado: 'cancelada' } })
  })
}
