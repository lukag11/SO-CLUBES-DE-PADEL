import { create } from 'zustand'

// Store compartido para los slots del admin (reservas manuales, bloqueos, clases del profesor, etc.)
// La grilla del admin y el dashboard del profesor leen/escriben aquí.

const useReservasAdminStore = create((set, get) => ({
  reservas: [],

  // Carga desde backend
  setReservas: (reservas) => set({ reservas }),

  // Agrega un slot a la grilla (reserva manual, bloqueo, clase, etc.)
  addReserva: (nueva) => {
    set((state) => ({ reservas: [...state.reservas, nueva] }))
  },

  // Elimina un slot por id
  deleteReserva: (id) => {
    set((state) => ({ reservas: state.reservas.filter((r) => r.id !== id) }))
  },

  // Marca un slot como pagado
  pagarReserva: (id) => {
    set((state) => ({
      reservas: state.reservas.map((r) => r.id === id ? { ...r, pago: 'pagado' } : r)
    }))
  },

  // Edita campos de un slot existente
  updateReserva: (id, data) => {
    set((state) => ({
      reservas: state.reservas.map((r) => r.id === id ? { ...r, ...data } : r)
    }))
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
