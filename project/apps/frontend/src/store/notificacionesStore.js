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
  nuevaReservaJugador: ({ jugador, canchaNombre, fecha, hora, horaFin, precio }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'nueva_reserva',
      jugador,
      cancha: canchaNombre,
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

  // Jugador solicita turno fijo recurrente → admin debe aprobar
  solicitudTurnoFijo: ({ jugador, canchaNombre, fecha, hora, horaFin, precio }) => {
    const nueva = {
      id: Date.now(),
      tipo: 'solicitud_turno_fijo',
      jugador,
      cancha: canchaNombre,
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

  sinLeer: () => get().notificaciones.filter((n) => !n.leida).length,
}))

export default useNotificacionesStore
