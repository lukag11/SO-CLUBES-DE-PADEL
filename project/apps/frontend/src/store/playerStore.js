import { create } from 'zustand'

const usePlayerStore = create((set) => ({
  player: null,
  token: localStorage.getItem('player_token') || null,
  isAuthenticated: !!localStorage.getItem('player_token'),

  login: (player, token) => {
    localStorage.setItem('player_token', token)
    set({ player, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('player_token')
    set({ player: null, token: null, isAuthenticated: false })
  },

  setPlayer: (player) => set({ player }),

  // Reemplaza el token de la sesión actual (ej: tras cambiar la contraseña)
  setToken: (token) => {
    localStorage.setItem('player_token', token)
    set({ token })
  },

  updatePlayer: (data) => set((state) => ({
    player: { ...state.player, ...data },
  })),
}))

export default usePlayerStore
