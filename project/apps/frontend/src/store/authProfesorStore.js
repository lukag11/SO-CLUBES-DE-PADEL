import { create } from 'zustand'

const useAuthProfesorStore = create((set) => ({
  profesor: null,
  token: localStorage.getItem('profesor_token') || null,
  isAuthenticated: !!localStorage.getItem('profesor_token'),

  login: (profesor, token) => {
    localStorage.setItem('profesor_token', token)
    set({ profesor, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('profesor_token')
    set({ profesor: null, token: null, isAuthenticated: false })
  },

  // Solo actualiza el estado en memoria — los datos del profesor siempre vienen del backend
  setProfesor: (profesor) => set({ profesor }),

  setDisponibilidad: (disponibilidad) =>
    set((s) => ({
      profesor: s.profesor ? { ...s.profesor, disponibilidad } : s.profesor,
    })),
}))

export default useAuthProfesorStore
