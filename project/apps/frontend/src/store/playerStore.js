import { create } from 'zustand'

const loadPlayer = () => {
  try {
    const saved = localStorage.getItem('player_data')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

const usePlayerStore = create((set) => ({
  player: loadPlayer(),
  token: localStorage.getItem('player_token') || null,
  isAuthenticated: !!localStorage.getItem('player_token'),

  login: (player, token) => {
    localStorage.setItem('player_token', token)
    localStorage.setItem('player_data', JSON.stringify(player))
    set({ player, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('player_token')
    localStorage.removeItem('player_data')
    set({ player: null, token: null, isAuthenticated: false })
  },

  setPlayer: (player) => {
    localStorage.setItem('player_data', JSON.stringify(player))
    set({ player })
  },

  updatePlayer: (data) => set((state) => {
    const updated = { ...state.player, ...data }
    localStorage.setItem('player_data', JSON.stringify(updated))
    return { player: updated }
  }),
}))

export default usePlayerStore
