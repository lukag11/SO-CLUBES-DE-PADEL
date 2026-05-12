import { create } from 'zustand'
import { api } from '../lib/api'
import usePlayerStore from './playerStore'

const TITULOS = {
  reserva_confirmada:      '¡Reserva confirmada!',
  reserva_cancelada_admin: 'Reserva cancelada por el club',
  turno_fijo_confirmado:   '¡Turno fijo aprobado!',
  turno_fijo_rechazado:    'Turno fijo rechazado',
  cargo_cancelacion:       'Cargo por cancelación fuera de plazo',
}

const formatCuerpo = (tipo, data = {}) => {
  const { canchaNombre = '', fecha = '', horaInicio = '', horaFin = '', dia = '', monto } = data
  if (tipo === 'reserva_confirmada')      return `${canchaNombre} · ${horaInicio} a ${horaFin} · ${fecha}`
  if (tipo === 'reserva_cancelada_admin') return `${canchaNombre} · ${horaInicio} a ${horaFin} · ${fecha}`
  if (tipo === 'turno_fijo_confirmado')   return `${canchaNombre} · todos los ${dia} · ${horaInicio} a ${horaFin}`
  if (tipo === 'turno_fijo_rechazado')    return `${canchaNombre} · ${dia} · ${horaInicio} a ${horaFin}`
  if (tipo === 'cargo_cancelacion')       return `${fecha} ${horaInicio} · Cargo pendiente: $${monto != null ? Number(monto).toLocaleString('es-AR') : 0}`
  return ''
}

const usePlayerNotificationsStore = create((set, get) => ({
  notificaciones: [],
  // Notificaciones locales de UI (feedback inmediato, no persisten en DB)
  locales: [],

  fetchNotificaciones: async () => {
    const token = usePlayerStore.getState().token
    if (!token) return
    try {
      const data = await api.get('/notificaciones/me', { Authorization: `Bearer ${token}` })
      const mapped = data.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: TITULOS[n.tipo] ?? n.tipo,
        cuerpo: formatCuerpo(n.tipo, n.data),
        leida: n.leida,
        timestamp: n.createdAt,
        _backend: true,
      }))
      set({ notificaciones: mapped })
    } catch {
      // fallo silencioso
    }
  },

  marcarLeida: async (id) => {
    const token = usePlayerStore.getState().token
    // Optimista: marcar en UI inmediatamente
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => n.id === id ? { ...n, leida: true } : n),
      locales: state.locales.map((n) => n.id === id ? { ...n, leida: true } : n),
    }))
    if (token) {
      api.patch(`/notificaciones/${id}/leida`, {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  marcarTodasLeidas: async () => {
    const token = usePlayerStore.getState().token
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
      locales: state.locales.map((n) => ({ ...n, leida: true })),
    }))
    if (token) {
      api.patch('/notificaciones/leidas', {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  sinLeer: () => {
    const { notificaciones, locales } = get()
    return [...notificaciones, ...locales].filter((n) => !n.leida).length
  },

  // ── Notificaciones locales de UI (feedback inmediato) ──────────────────────

  addSolicitudEnviada: ({ canchaNombre, fecha, hora, horaFin }) => {
    const nueva = {
      id: `local_${Date.now()}`,
      tipo: 'solicitud_enviada',
      titulo: 'Solicitud enviada',
      cuerpo: `${canchaNombre} · ${hora} a ${horaFin} · El admin la revisará`,
      fecha,
      leida: false,
      timestamp: new Date().toISOString(),
      _backend: false,
    }
    set((state) => ({ locales: [nueva, ...state.locales] }))
  },

  // Compatibilidad con código existente que llama estos métodos
  // Ahora son no-ops porque las notificaciones llegan desde el backend
  addReservaConfirmada: () => {},
  addAusenciaConfirmada: () => {},
  addSolicitudAprobada: () => {},
  addReservaCanceladaAdmin: () => {},
  addTurnoFijoLiberadoAdmin: () => {},
  addTurnoFijoBajaPermanente: () => {},
  addBajaInscripcionTorneo: () => {},
  addInscripcionEnEspera: () => {},
  addInscripcionActualizadaAdmin: () => {},
  addPromovido: () => {},
}))

export default usePlayerNotificationsStore
