import prisma from './prisma.js'
import { hoyArgStr, ahoraArgHHMM } from './tiempo.js'

const SEL_JUGADOR = { select: { id: true, nombre: true, apellido: true, dni: true } }

// Turnos impagos pasados como "deuda" (deuda calculada, sin tabla ni cron).
// where: filtro extra (ej: { jugadorId }). Un turno es deuda si: confirmado, sin pagar,
// no omitido, con precio > 0, y el turno ya terminó (hora ARG).
export const turnosImpagosDeuda = async (clubId, where = {}) => {
  const hoyStr = hoyArgStr()
  const ahora = ahoraArgHHMM()
  const reservas = await prisma.reserva.findMany({
    where: { clubId, estado: 'confirmada', pagado: false, cobroOmitido: false, jugadorId: { not: null }, ...where },
    include: { jugador: SEL_JUGADOR, cancha: { select: { nombre: true } } },
  })
  return reservas
    .filter((r) => (r.fecha < hoyStr || (r.fecha === hoyStr && r.horaFin <= ahora)) && (r.precio ?? 0) > 0)
    .map((r) => ({
      id: `reserva_${r.id}`, refId: r.id, origen: 'reserva',
      jugador: r.jugador,
      concepto: `Turno ${r.cancha?.nombre ?? ''} · ${r.fecha} ${r.horaInicio}`.trim(),
      monto: r.precio ?? 0,
      tipo: 'reserva', estado: 'pendiente',
      vencimiento: null, vencido: true, // un turno que ya pasó está vencido por naturaleza
      metodoPago: null, fecha: r.fecha,
    }))
}
