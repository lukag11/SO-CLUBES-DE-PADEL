import { create } from 'zustand'
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
    return nueva
  },

  confirmarReserva: (id) => {
    set((state) => ({
      reservas: state.reservas.map((r) =>
        r.id === id ? { ...r, estado: 'confirmada', _aprobadoPorAdmin: true } : r
      )
    }))
  },

  cancelarReserva: (id) => {
    set((state) => ({
      reservas: state.reservas.map((r) => r.id === id ? { ...r, estado: 'cancelada' } : r)
    }))
  },
}))

export default useReservasStore
