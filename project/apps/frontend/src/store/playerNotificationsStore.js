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
