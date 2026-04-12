import { create } from 'zustand'
import { RESERVAS_INICIALES } from '../features/admin/reservasMockData'

// Store compartido para los slots del admin (reservas manuales, bloqueos, clases del profesor, etc.)
// La grilla del admin y el dashboard del profesor leen/escriben aquí.

const KEY = 'admin_reservas_v1'

const load = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return RESERVAS_INICIALES
}

const save = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const useReservasAdminStore = create((set, get) => ({
  reservas: load(),

  // Agrega un slot a la grilla (reserva manual, bloqueo, clase, etc.)
  addReserva: (nueva) => {
    set((state) => {
      const updated = [...state.reservas, nueva]
      save(updated)
      return { reservas: updated }
    })
  },

  // Elimina un slot por id
  deleteReserva: (id) => {
    set((state) => {
      const updated = state.reservas.filter((r) => r.id !== id)
      save(updated)
      return { reservas: updated }
    })
  },

  // Marca un slot como pagado
  pagarReserva: (id) => {
    set((state) => {
      const updated = state.reservas.map((r) =>
        r.id === id ? { ...r, pago: 'pagado' } : r
      )
      save(updated)
      return { reservas: updated }
    })
  },

  // Edita campos de un slot existente
  updateReserva: (id, data) => {
    set((state) => {
      const updated = state.reservas.map((r) =>
        r.id === id ? { ...r, ...data } : r
      )
      save(updated)
      return { reservas: updated }
    })
  },

  // Retorna todos los slots de una fecha específica
  getReservasDia: (fecha) => {
    return get().reservas.filter((r) => r.fecha === fecha)
  },

  // Retorna todos los slots de tipo 'clase' de un profesor específico
  getClasesProfesor: (profesorId) => {
    return get().reservas.filter((r) => r.tipo === 'clase' && r.profesorId === profesorId)
  },
}))

export default useReservasAdminStore
