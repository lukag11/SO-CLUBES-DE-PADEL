import { create } from 'zustand'

// Auth del dueño de plataforma (4to rol). Token separado del resto de roles.
const usePlatformStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('platform_user') || 'null'),
  token: localStorage.getItem('platform_token') || null,
  isAuthenticated: !!localStorage.getItem('platform_token'),

  login: (user, token) => {
    localStorage.setItem('platform_token', token)
    localStorage.setItem('platform_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('platform_token')
    localStorage.removeItem('platform_user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))

export default usePlatformStore
