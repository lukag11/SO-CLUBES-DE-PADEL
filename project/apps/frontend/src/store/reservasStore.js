import { create } from 'zustand'
import useNotificacionesStore from './notificacionesStore'
import usePlayerStore from './playerStore'
import useReservasAdminStore from './reservasAdminStore'

const useReservasStore = create((set, get) => ({
  reservas: [],

  // Carga desde backend
  setReservas: (reservas) => set({ reservas }),

  addReserva: ({ canchaId, canchaNombre, canchaInfo, fecha, hora, horaFin = '', precio, esTurnoFijo = false }) => {
    const { player } = usePlayerStore.getState()
    const jugador = player
      ? `${player.nombre}${player.apellido ? ' ' + player.apellido : ''}`
      : 'Jugador'
    const id = Date.now()
    const adminSlotId = id + 1
    const nueva = {
      id,
      adminSlotId,
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
    // Crear slot visible en la grilla del admin
    useReservasAdminStore.getState().addReserva({
      id: adminSlotId,
      tipo: esTurnoFijo ? 'solicitud_fijo' : 'online',
      canchaId,
      canchaNombre,
      fecha,
      inicio: hora,
      fin: horaFin,
      jugadores: [jugador],
      estado: 'pendiente',
      pago: null,
      monto: precio || 0,
      notas: '',
      creadoPor: 'jugador',
      reservaStoreId: id,
    })
    const notifStore = useNotificacionesStore.getState()
    if (esTurnoFijo) {
      notifStore.solicitudTurnoFijo({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio })
    } else {
      notifStore.nuevaReservaJugador({ jugador, canchaNombre, canchaId, fecha, hora, horaFin, precio })
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
    if (reserva?.adminSlotId) {
      useReservasAdminStore.getState().deleteReserva(reserva.adminSlotId)
    }
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
