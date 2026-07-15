import { create } from 'zustand'
import { api } from '../lib/api'

const TIPOS_TORNEO = ['inscripcion_torneo', 'baja_torneo', 'actualizacion_torneo', 'completacion_torneo']
// Notificaciones de la AGENDA (reservas / turnos fijos / clases) — las que corresponden al
// badge del ítem "Reservas" del sidebar. El resto (ej. stock_bajo) va SOLO a la campana.
const TIPOS_RESERVA = [
  'nueva_reserva', 'reserva_autoconfirmada', 'turno_fijo_autoconfirmado',
  'turno_liberado_auto', 'turno_fijo_pendiente',
  'nueva_clase_profesor', 'cancelacion_clase_profesor', 'actualizacion_disponibilidad_profesor',
]

const coalesceNotif = (list, nueva) => {
  if (!TIPOS_TORNEO.includes(nueva.tipo)) return list
  return list.filter(
    (n) =>
      !(TIPOS_TORNEO.includes(n.tipo) && n.torneoId === nueva.torneoId && n.jugador1 === nueva.jugador1)
  )
}

// Normaliza notif del backend al formato uniforme del store
const normBackend = (n) => ({
  id: n.id,
  tipo: n.tipo,
  jugador: n.data?.jugador ?? '',
  cancha: n.data?.canchaNombre ?? '',
  canchaId: n.data?.canchaId ?? null,
  fecha: n.data?.fecha ?? '',
  inicio: n.data?.horaInicio ?? '',
  fin: n.data?.horaFin ?? '',
  precio: n.data?.precio ?? null,
  dia: n.data?.dia ?? '',
  turnoFijoId: n.data?.turnoFijoId ?? null,
  backendReservaId: n.data?.backendReservaId ?? null,
  // Campos de notificaciones de profesor
  profesorNombre: n.data?.profesorNombre ?? '',
  profesorId: n.data?.profesorId ?? null,
  // Campos de notificaciones de torneo
  jugador1: n.data?.jugador1 ?? '',
  jugador2: n.data?.jugador2 ?? '',
  torneoNombre: n.data?.torneoNombre ?? '',
  torneoId: n.data?.torneoId ?? null,
  categoria: n.data?.categoria ?? '',
  vaAEspera: n.data?.estado === 'espera',
  // Campos de notificación de bajo stock
  nombre: n.data?.nombre ?? '',
  stock: n.data?.stock ?? null,
  // Campos de notificación de pago por Mercado Pago
  jugadorNombre: n.data?.jugadorNombre ?? '',
  monto: n.data?.monto ?? null,
  count: n.data?.count ?? 1,
  detalle: n.data?.detalle ?? null,
  leida: n.leida,
  timestamp: n.createdAt,
  _fromBackend: true,
})

const getAdminToken = () => {
  try {
    // Importación diferida para evitar ciclos de dependencia
    return import('../store/authStore').then((m) => m.default.getState().token)
  } catch {
    return Promise.resolve(null)
  }
}

const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],
  cargando: false,

  // Fetch desde backend (admin) — llamar al montar el panel de notificaciones
  fetchNotificaciones: async (token) => {
    if (!token) return
    try {
      set({ cargando: true })
      const data = await api.get('/notificaciones/admin', { Authorization: `Bearer ${token}` })
      const backendNotifs = data.map(normBackend)
      set((state) => {
        const localOnly = state.notificaciones.filter((n) => !n._fromBackend)
        return { notificaciones: [...backendNotifs, ...localOnly] }
      })
    } catch { /* ignorar errores de red */ } finally {
      set({ cargando: false })
    }
  },

  // ── Notificaciones in-memory (torneos — sin endpoint de backend todavía) ──
  // Las notificaciones de clases de profesor vienen del backend vía fetchNotificaciones.

  completacionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(), tipo: 'completacion_torneo',
      jugador1, jugador2, categoria, torneoNombre, torneoId: torneoId ?? null,
      leida: false, timestamp: new Date().toISOString(),
    }
    set((state) => ({ notificaciones: [nueva, ...coalesceNotif(state.notificaciones, nueva)] }))
  },

  actualizacionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(), tipo: 'actualizacion_torneo',
      jugador1, jugador2, categoria, torneoNombre, torneoId: torneoId ?? null,
      leida: false, timestamp: new Date().toISOString(),
    }
    set((state) => ({ notificaciones: [nueva, ...coalesceNotif(state.notificaciones, nueva)] }))
  },

  bajaTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId }) => {
    const nueva = {
      id: Date.now(), tipo: 'baja_torneo',
      jugador1, jugador2, categoria, torneoNombre, torneoId: torneoId ?? null,
      leida: false, timestamp: new Date().toISOString(),
    }
    set((state) => ({ notificaciones: [nueva, ...coalesceNotif(state.notificaciones, nueva)] }))
  },

  nuevaInscripcionTorneo: ({ jugador1, jugador2, categoria, torneoNombre, torneoId, vaAEspera = false }) => {
    const nueva = {
      id: Date.now(), tipo: 'inscripcion_torneo',
      jugador1, jugador2, categoria, torneoNombre, torneoId: torneoId ?? null, vaAEspera,
      leida: false, timestamp: new Date().toISOString(),
    }
    set((state) => ({ notificaciones: [nueva, ...coalesceNotif(state.notificaciones, nueva)] }))
  },

  // ── Acciones de lectura / eliminación ─────────────────────────────────────

  marcarLeida: (id, token) => {
    const notif = get().notificaciones.find((n) => n.id === id)
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    }))
    if (notif?._fromBackend && token) {
      api.patch(`/notificaciones/${id}/leida`, {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  marcarTodasLeidas: (token) => {
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
    }))
    if (token) {
      api.patch('/notificaciones/admin/leidas', {}, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  eliminarNotificacion: (id, token) => {
    const notif = get().notificaciones.find((n) => n.id === id)
    set((state) => ({ notificaciones: state.notificaciones.filter((n) => n.id !== id) }))
    if (notif?._fromBackend && token) {
      api.delete(`/notificaciones/${id}`, { Authorization: `Bearer ${token}` }).catch(() => {})
    }
  },

  // ── Selectores ─────────────────────────────────────────────────────────────

  sinLeer: () =>
    get().notificaciones.filter(
      (n) => !n.leida && !TIPOS_TORNEO.includes(n.tipo)
    ).length,

  sinLeerTorneos: () =>
    get().notificaciones.filter((n) => !n.leida && TIPOS_TORNEO.includes(n.tipo)).length,

  // Solo notificaciones de la agenda (reservas/turnos/clases) → badge del ítem "Reservas".
  // Excluye stock y cualquier otra notificación general (que sí aparece en la campana).
  sinLeerReservas: () =>
    get().notificaciones.filter((n) => !n.leida && TIPOS_RESERVA.includes(n.tipo)).length,
}))

export default useNotificacionesStore
