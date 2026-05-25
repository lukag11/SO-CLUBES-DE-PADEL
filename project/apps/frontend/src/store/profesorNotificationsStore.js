import { create } from 'zustand'
import { api } from '../lib/api'

const normBackend = (n) => ({
  id: n.id,
  tipo: n.tipo,
  leida: n.leida,
  timestamp: n.createdAt,
  canchaNombre: n.data?.canchaNombre ?? '',
  canchaId: n.data?.canchaId ?? null,
  fecha: n.data?.fecha ?? '',
  horaInicio: n.data?.horaInicio ?? '',
  horaFin: n.data?.horaFin ?? '',
  reservaId: n.data?.reservaId ?? null,
})

const useProfesorNotificationsStore = create((set, get) => ({
  notificaciones: [],
  cargando: false,

  fetchNotificaciones: async (token) => {
    if (!token) return
    try {
      set({ cargando: true })
      const data = await api.get('/notificaciones/profesor/me', { Authorization: `Bearer ${token}` })
      set({ notificaciones: Array.isArray(data) ? data.map(normBackend) : [] })
    } catch { /* ignorar errores de red */ } finally {
      set({ cargando: false })
    }
  },

  marcarLeida: (id, token) => {
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    }))
    if (token) {
      api.patch(`/notificaciones/${id}/leida`, {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  marcarTodasLeidas: (token) => {
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
    }))
    if (token) {
      api.patch('/notificaciones/profesor/leidas', {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  sinLeer: () => get().notificaciones.filter((n) => !n.leida).length,
}))

export default useProfesorNotificationsStore
