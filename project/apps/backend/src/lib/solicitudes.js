import prisma from './prisma.js'

// Avisa a TODOS los involucrados en un partido (pendientes + aceptados) que se canceló, para que
// nadie caiga a una cancha que ya no existe. `sol` debe traer `participantes` (al menos jugadorId).
export async function notificarPartidoCancelado(clubId, sol, motivo = null) {
  const destinatarios = (sol.participantes || []).map((p) => p.jugadorId)
  if (!destinatarios.length) return 0
  await prisma.notificacion.createMany({
    data: destinatarios.map((jid) => ({
      clubId,
      jugadorId: jid,
      tipo: 'partido_cancelado',
      data: { solicitudId: sol.id, fecha: sol.fecha, horaInicio: sol.horaInicio, motivo: motivo || null },
    })),
  })
  return destinatarios.length
}

// Cancela TODAS las búsquedas (SolicitudJugador) atadas a una reserva y avisa a sus participantes.
// Se llama cuando se cancela el turno: la búsqueda es un conjunto con la reserva, no puede quedar viva.
export async function cancelarBusquedasDeReserva(clubId, reservaId, motivo = null) {
  if (!reservaId) return 0
  const sols = await prisma.solicitudJugador.findMany({
    where: { clubId, reservaId, estado: { in: ['abierta', 'completa'] } },
    include: { participantes: { select: { jugadorId: true } } },
  })
  for (const s of sols) {
    await prisma.solicitudJugador.update({ where: { id: s.id }, data: { estado: 'cancelada' } })
    await notificarPartidoCancelado(clubId, s, motivo)
  }
  return sols.length
}
