import { create } from 'zustand'
import useNotificacionesStore from './notificacionesStore'
import usePlayerStore from './playerStore'

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Sin mock — el jugador empieza sin reservas
const MOCK_RESERVAS = []

const CACHE_KEY = 'player_reservas_v5'

const isDataValida = (reservas) => {
  if (!Array.isArray(reservas) || reservas.length === 0) return false
  // Descarta si falta horaFin (datos viejos sin 1.5h)
  if (reservas.some((r) => !r.horaFin)) return false
  // Descarta si algún turno (fijo o eventual) tiene 'confirmada' sin haber sido aprobado
  if (reservas.some((r) => r.estado === 'confirmada' && !r._aprobadoPorAdmin)) return false
  return true
}

const loadReservas = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (isDataValida(parsed)) return parsed
      // Datos inválidos → limpiar y usar mock
      localStorage.removeItem(CACHE_KEY)
    }
  } catch { /* ignore */ }
  return MOCK_RESERVAS
}

const save = (reservas) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(reservas)) } catch { /* ignore */ }
}

const useReservasStore = create((set, get) => ({
  reservas: loadReservas(),

  addReserva: ({ canchaId, canchaNombre, canchaInfo, fecha, hora, horaFin = '', precio, esTurnoFijo = false }) => {
    const { player } = usePlayerStore.getState()
    const jugador = player
      ? `${player.nombre}${player.apellido ? ' ' + player.apellido : ''}`
      : 'Jugador'
    const nueva = {
      id: Date.now(),
      canchaId,
      canchaNombre,
      canchaInfo,
      fecha,
      hora,
      horaFin,
      precio,
      esTurnoFijo,
      jugador,
      // todos quedan pendiente hasta que el admin apruebe
      estado: 'pendiente',
      _aprobadoPorAdmin: false,
    }
    set((state) => {
      const updated = [...state.reservas, nueva]
      save(updated)
      return { reservas: updated }
    })
    // Notifica al admin (siempre). El jugador solo se notifica al aprobar (admin).
    const notifStore = useNotificacionesStore.getState()
    if (esTurnoFijo) {
      notifStore.solicitudTurnoFijo({ jugador, canchaNombre, fecha, hora, horaFin, precio })
    } else {
      notifStore.nuevaReservaJugador({ jugador, canchaNombre, fecha, hora, horaFin, precio })
    }
    return nueva
  },

  confirmarReserva: (id) => {
    set((state) => {
      const updated = state.reservas.map((r) =>
        r.id === id ? { ...r, estado: 'confirmada', _aprobadoPorAdmin: true } : r
      )
      save(updated)
      return { reservas: updated }
    })
  },

  cancelarReserva: (id) => {
    set((state) => {
      const updated = state.reservas.map((r) =>
        r.id === id ? { ...r, estado: 'cancelada' } : r
      )
      save(updated)
      return { reservas: updated }
    })
  },
}))

export default useReservasStore
