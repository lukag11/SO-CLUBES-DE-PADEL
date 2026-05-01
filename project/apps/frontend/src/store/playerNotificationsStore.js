import { create } from 'zustand'

const KEY = 'player_notificaciones'

const load = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

const save = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const usePlayerNotificationsStore = create((set, get) => ({
  notificaciones: load(),

  // Reserva online confirmada por el sistema
  addReservaConfirmada: ({ canchaNombre, fecha, hora, horaFin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'reserva_confirmada',
      titulo: '¡Reserva confirmada!',
      cuerpo: `${canchaNombre} · ${hora} a ${horaFin}`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Solicitud de turno fijo enviada al admin
  addSolicitudEnviada: ({ canchaNombre, fecha, hora, horaFin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'solicitud_enviada',
      titulo: 'Solicitud de turno fijo enviada',
      cuerpo: `${canchaNombre} · ${hora} a ${horaFin} · El admin la revisará`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Admin confirma ausencia puntual del jugador
  addAusenciaConfirmada: ({ canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'ausencia_confirmada',
      titulo: 'Ausencia confirmada',
      cuerpo: `${canchaNombre} · ${inicio} a ${fin} · el slot quedó libre`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Turno fijo aprobado por el admin
  addSolicitudAprobada: ({ canchaNombre, dia, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'turno_fijo_aprobado',
      titulo: '¡Turno fijo aprobado!',
      cuerpo: `${canchaNombre} · ${dia} · ${inicio} a ${fin} · todos los ${dia}s`,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Admin cancela reserva eventual del jugador manualmente
  addReservaCanceladaAdmin: ({ canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'reserva_cancelada_admin',
      titulo: 'Reserva cancelada por el club',
      cuerpo: `${canchaNombre} · ${inicio} a ${fin} · ${fecha}`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Admin libera un día puntual del turno fijo del jugador (sin que el jugador lo haya pedido)
  addTurnoFijoLiberadoAdmin: ({ canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'turno_fijo_liberado_admin',
      titulo: 'Tu turno fijo fue liberado por el club',
      cuerpo: `${canchaNombre} · ${inicio} a ${fin} · el slot del ${fecha} está libre`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Admin da de baja permanente el turno fijo del jugador
  addTurnoFijoBajaPermanente: ({ canchaNombre, dia, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'turno_fijo_baja_permanente',
      titulo: 'Tu turno fijo fue dado de baja',
      cuerpo: `${canchaNombre} · ${dia} · ${inicio} a ${fin} · El club canceló el turno recurrente`,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Admin da de baja a una pareja inscripta en un torneo
  addBajaInscripcionTorneo: ({ torneoNombre, categoria, jugador1, jugador2 }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'baja_inscripcion_torneo',
      titulo: 'Baja de inscripción al torneo',
      cuerpo: `${torneoNombre} · ${categoria} · ${jugador1} / ${jugador2} · El club dio de baja la inscripción`,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador se inscribió pero quedó en lista de espera
  addInscripcionEnEspera: ({ torneoNombre, categoria }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'inscripcion_en_espera',
      titulo: 'Quedaste en lista de espera',
      cuerpo: `${torneoNombre} · ${categoria} · Te avisaremos si se libera un lugar`,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador fue promovido de lista de espera a inscripto
  addPromovido: ({ torneoNombre, categoria }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'promovido_de_espera',
      titulo: '¡Te inscribiste al torneo!',
      cuerpo: `${torneoNombre} · ${categoria} · Se liberó un lugar y quedaste confirmado/a`,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      save(updated)
      return { notificaciones: updated }
    })
  },

  marcarLeida: (id) => {
    set((state) => {
      const updated = state.notificaciones.map((n) =>
        n.id === id ? { ...n, leida: true } : n
      )
      save(updated)
      return { notificaciones: updated }
    })
  },

  marcarTodasLeidas: () => {
    set((state) => {
      const updated = state.notificaciones.map((n) => ({ ...n, leida: true }))
      save(updated)
      return { notificaciones: updated }
    })
  },

  sinLeer: () => get().notificaciones.filter((n) => !n.leida).length,
}))

export default usePlayerNotificationsStore
