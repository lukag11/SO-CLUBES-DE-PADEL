import { create } from 'zustand'
import useReservasStore from './reservasStore'
import usePlayerNotificationsStore from './playerNotificationsStore'

const KEY = 'player_turnos_fijos'

const load = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

const save = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const useTurnosFijosStore = create((set, get) => ({
  turnosFijos: load(),

  // Admin aprueba una solicitud de turno fijo del jugador
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
      reservaId: reservaId ?? null, // id de la reserva original en reservasStore
      activo: true,
      diasAusentes: [],       // fechas ISO confirmadas por el admin (slot libre en grilla)
      ausenciasPendientes: [], // fechas ISO avisadas por jugador, pendientes de confirmación admin
      desde: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    }
    set((state) => {
      const updated = [nuevo, ...state.turnosFijos]
      save(updated)
      return { turnosFijos: updated }
    })
  },

  // Baja permanente del turno fijo — también cancela la reserva original en reservasStore
  liberarTurno: (id) => {
    const turno = get().turnosFijos.find((t) => t.id === id)
    set((state) => {
      const updated = state.turnosFijos.map((t) =>
        t.id === id ? { ...t, activo: false } : t
      )
      save(updated)
      return { turnosFijos: updated }
    })
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
    set((state) => {
      const updated = state.turnosFijos.map((t) =>
        t.id === id
          ? { ...t, ausenciasPendientes: [...(t.ausenciasPendientes || []), fecha] }
          : t
      )
      save(updated)
      return { turnosFijos: updated }
    })
  },

  // Admin confirma ausencia → pasa de pendiente a confirmada, slot queda libre en grilla
  ausentarDia: (id, fecha) => {
    set((state) => {
      const updated = state.turnosFijos.map((t) =>
        t.id === id
          ? {
              ...t,
              diasAusentes: [...(t.diasAusentes || []), fecha],
              ausenciasPendientes: (t.ausenciasPendientes || []).filter((f) => f !== fecha),
            }
          : t
      )
      save(updated)
      return { turnosFijos: updated }
    })
  },
}))

export default useTurnosFijosStore
