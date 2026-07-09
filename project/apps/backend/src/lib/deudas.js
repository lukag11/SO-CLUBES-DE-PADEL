import prisma from './prisma.js'
import { hoyArgStr, ahoraArgHHMM, finEnMin } from './tiempo.js'

const SEL_JUGADOR = { select: { id: true, nombre: true, apellido: true, dni: true } }

// Margen de gracia post-turno antes de contarlo como deuda (alineado con la grilla).
// La gente consume y arregla la cuenta un rato después de jugar.
const MIN_GRACIA_COBRO = 60
const aMin = (hhmm) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m }

// Turnos impagos pasados como "deuda" (deuda calculada, sin tabla ni cron).
// where: filtro extra (ej: { jugadorId }). Un turno es deuda si: confirmado, sin pagar,
// no omitido, con precio > 0, y venció la gracia post-turno (hora ARG).
export const turnosImpagosDeuda = async (clubId, where = {}) => {
  const hoyStr = hoyArgStr()
  const ahoraMin = aMin(ahoraArgHHMM())
  const reservas = await prisma.reserva.findMany({
    where: { clubId, estado: 'confirmada', pagado: false, cobroOmitido: false, jugadorId: { not: null }, ...where },
    include: { jugador: SEL_JUGADOR, cancha: { select: { nombre: true } } },
  })
  return reservas
    .filter((r) => {
      // Fin del turno cross-midnight aware (helper único, ver tiempo.js). Sin esto, un turno
      // nocturno de hoy (23:30→01:00) se contaría como deuda desde la madrugada, sin jugarse.
      const finMin = finEnMin(r.horaInicio, r.horaFin)
      return (r.fecha < hoyStr || (r.fecha === hoyStr && finMin + MIN_GRACIA_COBRO <= ahoraMin)) && (r.precio ?? 0) > 0
    })
    .map((r) => {
      // Con pago parcial, `monto` es el RESTANTE (precio − lo ya imputado).
      const saldo = r.saldoPagado || 0
      return {
        id: `reserva_${r.id}`, refId: r.id, origen: 'reserva',
        jugador: r.jugador,
        concepto: `Turno ${r.cancha?.nombre ?? ''} · ${r.fecha} ${r.horaInicio}`.trim(),
        monto: (r.precio ?? 0) - saldo,
        montoOriginal: r.precio ?? 0, saldoPagado: saldo,
        tipo: 'reserva', estado: 'pendiente',
        vencimiento: null, vencido: true, // un turno que ya pasó está vencido por naturaleza
        metodoPago: null, fecha: r.fecha,
      }
    })
}
