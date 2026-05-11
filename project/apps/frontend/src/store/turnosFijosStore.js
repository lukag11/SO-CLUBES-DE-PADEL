import { create } from 'zustand'
import useReservasStore from './reservasStore'
import usePlayerNotificationsStore from './playerNotificationsStore'

const useTurnosFijosStore = create((set, get) => ({
  turnosFijos: [],

  // Carga desde backend
  setTurnosFijos: (turnosFijos) => set({ turnosFijos }),

  // Agrega un turno fijo recibido desde el backend (jugador solicita o admin aprueba)
  addTurnoFijoFromApi: (turno) => {
    set((state) => ({ turnosFijos: [turno, ...state.turnosFijos] }))
  },

  // Actualiza campos de un turno fijo existente (aprobación, ausencias, etc.)
  updateTurnoFijo: (id, data) => {
    set((state) => ({
      turnosFijos: state.turnosFijos.map((t) => t.id === id ? { ...t, ...data } : t),
    }))
  },

  // Admin aprueba una solicitud de turno fijo del jugador (flow local legacy)
  addTurnoFijo: ({ canchaId, canchaNombre, canchaInfo, dia, inicio, fin, precio, jugador, reservaId }) => {
    const nuevo = {
      id: Date.now(),
      canchaId: Number(canchaId),
      canchaNombre,
      canchaInfo,
      dia,
      inicio,
      fin,
      precio,
      jugador: jugador || 'Jugador',
      reservaId: reservaId ?? null,
      activo: true,
      diasAusentes: [],
      ausenciasPendientes: [],
      desde: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    }
    set((state) => ({ turnosFijos: [nuevo, ...state.turnosFijos] }))
  },

  // Baja permanente del turno fijo — también cancela la reserva original en reservasStore
  liberarTurno: (id) => {
    const turno = get().turnosFijos.find((t) => t.id === id)
    set((state) => ({
      turnosFijos: state.turnosFijos.map((t) => t.id === id ? { ...t, activo: false } : t)
    }))
    if (turno?.reservaId) {
      useReservasStore.getState().cancelarReserva(turno.reservaId, { notificarAdmin: false })
    }
    if (turno) {
      usePlayerNotificationsStore.getState().addTurnoFijoBajaPermanente({
        canchaNombre: turno.canchaNombre,
        dia: turno.dia,
        inicio: turno.inicio,
        fin: turno.fin,
      })
    }
  },

  // Jugador avisa ausencia → queda pendiente hasta que admin confirme
  registrarAusenciaPendiente: (id, fecha) => {
    set((state) => ({
      turnosFijos: state.turnosFijos.map((t) =>
        t.id === id
          ? { ...t, ausenciasPendientes: [...(t.ausenciasPendientes || []), fecha] }
          : t
      )
    }))
  },

  // Admin confirma ausencia → pasa de pendiente a confirmada, slot queda libre en grilla
  ausentarDia: (id, fecha) => {
    set((state) => ({
      turnosFijos: state.turnosFijos.map((t) =>
        t.id === id
          ? {
              ...t,
              diasAusentes: [...(t.diasAusentes || []), fecha],
              ausenciasPendientes: (t.ausenciasPendientes || []).filter((f) => f !== fecha),
            }
          : t
      )
    }))
  },
}))

export default useTurnosFijosStore
