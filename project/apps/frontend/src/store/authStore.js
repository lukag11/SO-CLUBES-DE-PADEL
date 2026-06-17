import { create } from 'zustand'

// Persistimos también el user (no solo el token) para tener el plan/features del
// club al instante en cada reload → evita el parpadeo del menú según plan.
const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin_user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  setUser: (user) => {
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ user })
  },
}))

export default useAuthStore
