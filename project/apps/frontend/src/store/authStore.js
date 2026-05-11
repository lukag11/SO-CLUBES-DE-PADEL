import { create } from 'zustand'

const loadUser = () => {
  try {
    const saved = localStorage.getItem('admin_user')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

const useAuthStore = create((set) => ({
  user: loadUser(),
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
