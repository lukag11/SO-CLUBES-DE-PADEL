import { create } from 'zustand'
import useNotificacionesStore from './notificacionesStore'
import usePlayerStore from './playerStore'

const useReservasStore = create((set, get) => ({
  reservas: [],

  // Carga desde backend
  setReservas: (reservas) => set({ reservas }),

  addReserva: ({ canchaId, canchaNombre, canchaInfo, fecha, hora, horaFin = '', precio, esTurnoFijo = false, backendReservaId = null }) => {
    const { player } = usePlayerStore.getState()
    const jugador = player
      ? `${player.nombre}${player.apellido ? ' ' + player.apellido : ''}`
      : 'Jugador'
    // Usar el ID del backend si existe — garantiza que las operaciones posteriores (cancelar, etc.) apunten al CUID correcto
    const id = backendReservaId ?? Date.now()
    const nueva = {
      id,
      canchaId,
      canchaNombre,
      canchaInfo,
      fecha,
      hora,
      horaFin,
      precio,
      esTurnoFijo,
      jugador,
      estado: 'pendiente',
      _aprobadoPorAdmin: false,
    }
    set((state) => ({ reservas: [...state.reservas, nueva] }))
    const notifStore = useNotificacionesStore.getState()
    if (esTurnoFijo) {
      notifStore.solicitudTurnoFijo({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio })
    } else {
      notifStore.nuevaReservaJugador({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio, backendReservaId })
    }
    return nueva
  },

  confirmarReserva: (id) => {
    set((state) => ({
      reservas: state.reservas.map((r) =>
        r.id === id ? { ...r, estado: 'confirmada', _aprobadoPorAdmin: true } : r
      )
    }))
  },

  cancelarReserva: (id, { notificarAdmin = true } = {}) => {
    const reserva = get().reservas.find((r) => r.id === id)
    set((state) => ({
      reservas: state.reservas.map((r) => r.id === id ? { ...r, estado: 'cancelada' } : r)
    }))
    if (reserva && notificarAdmin) {
      useNotificacionesStore.getState().cancelacionReserva({
        jugador: reserva.jugador,
        canchaNombre: reserva.canchaNombre,
        fecha: reserva.fecha,
        inicio: reserva.hora,
        fin: reserva.horaFin,
      })
    }
  },
}))

export default useReservasStore
