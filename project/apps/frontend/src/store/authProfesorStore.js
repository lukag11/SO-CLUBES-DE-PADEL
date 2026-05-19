import { create } from 'zustand'

const loadSaved = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

const useAuthProfesorStore = create((set) => ({
  profesor: loadSaved('profesor_data'),
  token: localStorage.getItem('profesor_token') || null,
  isAuthenticated: !!localStorage.getItem('profesor_token'),

  login: (profesor, token) => {
    localStorage.setItem('profesor_token', token)
    localStorage.setItem('profesor_data', JSON.stringify(profesor))
    set({ profesor, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('profesor_token')
    localStorage.removeItem('profesor_data')
    set({ profesor: null, token: null, isAuthenticated: false })
  },

  setProfesor: (profesor) => {
    localStorage.setItem('profesor_data', JSON.stringify(profesor))
    set({ profesor })
  },

  setDisponibilidad: (disponibilidad) => {
    set((s) => {
      const updated = { ...s.profesor, disponibilidad }
      localStorage.setItem('profesor_data', JSON.stringify(updated))
      return { profesor: updated }
    })
  },
}))

export default useAuthProfesorStore
