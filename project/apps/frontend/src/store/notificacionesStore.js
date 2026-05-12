import { create } from 'zustand'

const NOTIF_KEY = 'admin_notificaciones_v2'

// Suma 90 minutos a una hora "HH:MM" → "HH:MM"
const add90min = (hora) => {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + 90
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const loadNotificaciones = () => {
  try {
    const saved = localStorage.getItem(NOTIF_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

const saveNotificaciones = (list) => {
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const TIPOS_TORNEO = ['inscripcion_torneo', 'baja_torneo', 'actualizacion_torneo', 'completacion_torneo']

// Elimina notificaciones previas del mismo jugador en el mismo torneo antes de agregar la nueva
const coalesceNotif = (list, nueva) => {
  if (!TIPOS_TORNEO.includes(nueva.tipo)) return list
  return list.filter((n) =>
    !(TIPOS_TORNEO.includes(n.tipo) &&
      n.torneoId === nueva.torneoId &&
      n.jugador1 === nueva.jugador1)
  )
}

const useNotificacionesStore = create((set, get) => ({
  notificaciones: loadNotificaciones(),

  // Jugador libera su turno fijo → avisa al admin
  liberarTurno: ({ jugador, cancha, fecha, inicio, fin, turnoFijoId }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'liberacion_turno',
      jugador,
      cancha,
      fecha,
      inicio,
      fin,
      turnoFijoId,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador confirma una reserva online → avisa al admin
  nuevaReservaJugador: ({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio, backendReservaId = null }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'nueva_reserva',
      jugador,
      cancha: canchaNombre,
      canchaId: canchaId ?? null,
      fecha,
      inicio: hora,
      fin: horaFin || add90min(hora),
      precio,
      backendReservaId,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador solicita turno fijo recurrente → admin debe aprobar
  solicitudTurnoFijo: ({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'solicitud_turno_fijo',
      jugador,
      cancha: canchaNombre,
      canchaId: canchaId ?? null,
      fecha,
      inicio: hora,
      fin: horaFin || add90min(hora),
      precio,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador cancela una reserva → avisa al admin
  cancelacionReserva: ({ jugador, canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'cancelacion_reserva',
      jugador,
      cancha: canchaNombre,
      fecha,
      inicio,
      fin,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Profesor crea una clase → avisa al admin
  nuevaClaseProfesor: ({ profesorNombre, canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'nueva_clase_profesor',
      profesorNombre,
      cancha: canchaNombre,
      fecha,
      inicio,
      fin,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador completa inscripción (venía sinCompanero, ahora tiene pareja y horario) → avisa al admin
  completacionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'completacion_torneo',
      jugador1, jugador2, categoria, torneoNombre,
      torneoId: torneoId ?? null,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...coalesceNotif(state.notificaciones, nueva)]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador edita su inscripción en un torneo → avisa al admin
  actualizacionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'actualizacion_torneo',
      jugador1, jugador2, categoria, torneoNombre,
      torneoId: torneoId ?? null,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...coalesceNotif(state.notificaciones, nueva)]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador cancela su inscripción en un torneo → avisa al admin
  bajaTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'baja_torneo',
      jugador1, jugador2, categoria, torneoNombre,
      torneoId: torneoId ?? null,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...coalesceNotif(state.notificaciones, nueva)]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Jugador se inscribe en un torneo → avisa al admin
  nuevaInscripcionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId, vaAEspera = false }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'inscripcion_torneo',
      jugador1, jugador2, categoria, torneoNombre,
      torneoId: torneoId ?? null,
      vaAEspera,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...coalesceNotif(state.notificaciones, nueva)]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Profesor cancela una clase → avisa al admin
  cancelacionClaseProfesor: ({ profesorNombre, canchaNombre, fecha, inicio, fin }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'cancelacion_clase_profesor',
      profesorNombre,
      cancha: canchaNombre,
      fecha,
      inicio,
      fin,
      leida: false,
      timestamp: new Date().toISOString(),
    }
    set((state) => {
      const updated = [nueva, ...state.notificaciones]
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  marcarLeida: (id) => {
    set((state) => {
      const updated = state.notificaciones.map((n) =>
        n.id === id ? { ...n, leida: true } : n
      )
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  marcarTodasLeidas: () => {
    set((state) => {
      const updated = state.notificaciones.map((n) => ({ ...n, leida: true }))
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  // Elimina permanentemente una notificación (usada al aprobar/rechazar — ya fue resuelta)
  eliminarNotificacion: (id) => {
    set((state) => {
      const updated = state.notificaciones.filter((n) => n.id !== id)
      saveNotificaciones(updated)
      return { notificaciones: updated }
    })
  },

  sinLeer: () => get().notificaciones.filter((n) => !n.leida && !['inscripcion_torneo', 'baja_torneo', 'actualizacion_torneo', 'completacion_torneo', 'nueva_reserva'].includes(n.tipo)).length,
  sinLeerTorneos: () => get().notificaciones.filter((n) => !n.leida && (n.tipo === 'inscripcion_torneo' || n.tipo === 'baja_torneo' || n.tipo === 'actualizacion_torneo' || n.tipo === 'completacion_torneo')).length,
}))

export default useNotificacionesStore
