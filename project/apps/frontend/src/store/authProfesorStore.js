import { create } from 'zustand'

// Mismo patrón que authStore (admin) y playerStore (jugador)
// Token: 'profesor_token' | Datos: 'profesor_data'

const loadProfesor = () => {
  try {
    const saved = localStorage.getItem('profesor_data')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

const useAuthProfesorStore = create((set) => ({
  profesor: loadProfesor(),
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
}))

export default useAuthProfesorStore
