import { create } from 'zustand'
import { api } from '../lib/api'
import usePlayerStore from './playerStore'

const TITULOS = {
  reserva_confirmada:           '¡Reserva confirmada!',
  reserva_cancelada_admin:      'Reserva cancelada por el club',
  reserva_admin_manual:         'El club te realizó una reserva',
  turno_fijo_confirmado:        '¡Turno fijo aprobado!',
  turno_fijo_rechazado:         'Solicitud de turno fijo rechazada',
  turno_fijo_baja:              'El club dio de baja tu turno fijo',
  ausencia_admin_directa:       'El club liberó tu turno de esta semana',
  ausencia_confirmada:          'Tu ausencia fue confirmada',
  cargo_cancelacion:            'Cargo por cancelación fuera de plazo',
  torneo_inscripto_compañero:   '¡Estás inscripto en un torneo!',
  torneo_baja_compañero:        'Inscripción cancelada en torneo',
  torneo_baja_admin:            'El club canceló tu inscripción',
  torneo_alta_admin:            'El club te inscribió en un torneo',
  torneo_promovido_espera:      '¡Pasaste a la lista principal!',
}

const formatCuerpo = (tipo, data = {}) => {
  const { canchaNombre = '', fecha = '', horaInicio = '', horaFin = '', dia = '', monto,
          torneoNombre = '', categoria = '', jugador1 = '', jugador2 = '' } = data
  if (tipo === 'reserva_confirmada')      return `${canchaNombre} · ${horaInicio} a ${horaFin} · ${fecha}`
  if (tipo === 'reserva_cancelada_admin') return `${canchaNombre} · ${horaInicio} a ${horaFin} · ${fecha}`
  if (tipo === 'reserva_admin_manual')    return `${canchaNombre} · ${horaInicio} a ${horaFin} · ${fecha}`
  if (tipo === 'turno_fijo_confirmado')   return `${canchaNombre} · todos los ${dia} · ${horaInicio} a ${horaFin}`
  if (tipo === 'turno_fijo_rechazado')    return `${canchaNombre} · ${dia} · ${horaInicio} a ${horaFin}`
  if (tipo === 'turno_fijo_baja')         return `${canchaNombre} · todos los ${dia} · ${horaInicio} a ${horaFin}`
  if (tipo === 'ausencia_admin_directa')  return `${canchaNombre} · ${fecha} · ${horaInicio} a ${horaFin} · el slot quedó libre`
  if (tipo === 'ausencia_confirmada')     return `${canchaNombre} · ${fecha} · ${horaInicio} a ${horaFin} · tu solicitud fue aprobada`
  if (tipo === 'cargo_cancelacion')       return `${fecha} ${horaInicio} · Cargo pendiente: $${monto != null ? Number(monto).toLocaleString('es-AR') : 0}`
  if (tipo === 'torneo_inscripto_compañero') return `${torneoNombre} · ${categoria} · con ${jugador1}`
  if (tipo === 'torneo_baja_compañero')      return `${torneoNombre} · ${categoria} · cancelado por ${jugador1}`
  if (tipo === 'torneo_baja_admin')          return `${torneoNombre} · ${categoria}`
  if (tipo === 'torneo_alta_admin')          return `${torneoNombre} · ${categoria} · ${jugador1} / ${jugador2}`
  if (tipo === 'torneo_promovido_espera')    return `${torneoNombre} · ${categoria} · pasaste de lista de espera a inscripto`
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
