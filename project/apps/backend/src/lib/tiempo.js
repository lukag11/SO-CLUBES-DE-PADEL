// Helpers de fecha para Argentina (UTC-3, sin DST).
// El server corre en UTC (Railway); estos helpers dan los límites de día/mes
// en hora local argentina, expresados como instantes UTC para comparar contra
// timestamps guardados (pagadoAt, createdAt).

const OFFSET_ARG_MS = 3 * 60 * 60 * 1000 // ARG = UTC-3

// "Ahora" con los campos UTC corridos para que representen la hora de pared argentina.
const ahoraArg = () => new Date(Date.now() - OFFSET_ARG_MS)

// Inicio del día de hoy en Argentina (00:00 ART = 03:00 UTC), como Date UTC.
export const inicioDiaArg = () => {
  const a = ahoraArg()
  return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate(), 3, 0, 0))
}

// Inicio del mes actual en Argentina, como Date UTC.
export const inicioMesArg = () => {
  const a = ahoraArg()
  return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1, 3, 0, 0))
}

// Fecha de hoy en Argentina en formato 'YYYY-MM-DD' (para comparar contra reserva.fecha).
export const hoyArgStr = () => {
  const a = ahoraArg()
  return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, '0')}-${String(a.getUTCDate()).padStart(2, '0')}`
}

// Rango UTC [desde, hasta) que cubre un día argentino dado ('YYYY-MM-DD').
// Ej: '2026-06-14' → desde 2026-06-14T03:00Z hasta 2026-06-15T03:00Z.
export const rangoDiaArg = (fechaStr) => {
  const [y, m, d] = String(fechaStr).split('-').map(Number)
  return {
    desde: new Date(Date.UTC(y, m - 1, d, 3, 0, 0)),
    hasta: new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0)),
  }
}

// Hora actual en Argentina en formato 'HH:MM' (para saber qué turno está en curso).
export const ahoraArgHHMM = () => {
  const a = ahoraArg()
  return `${String(a.getUTCHours()).padStart(2, '0')}:${String(a.getUTCMinutes()).padStart(2, '0')}`
}

// ───────────────────────── HORARIOS DE TURNO (cross-midnight) ─────────────────────────
// ⚠️ REGLA: para cualquier cálculo con el FIN de un turno (vencido, en curso, duración,
// solape), usá SIEMPRE estos helpers. NUNCA escribas `horaFin === '00:00' ? 1440 : toMin(fin)`
// a mano — ese patrón se rompe con fines 00:30/01:00 (clubes que cierran después de medianoche).

// Minutos desde 00:00 de un 'HH:MM'.
export const toMinHHMM = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }

// ¿El turno cruza la medianoche? (ej. 23:30→01:00, o 22:30→00:00). Sí cuando fin <= inicio.
export const cruzaMedianoche = (horaInicio, horaFin) => toMinHHMM(horaFin) <= toMinHHMM(horaInicio)

// Fin del turno en minutos, contando el cruce de medianoche (+1440 si termina al día siguiente).
// Ej: finEnMin('23:30','01:00') = 1500. finEnMin('08:00','09:30') = 570.
export const finEnMin = (horaInicio, horaFin) => {
  const f = toMinHHMM(horaFin)
  return cruzaMedianoche(horaInicio, horaFin) ? f + 1440 : f
}

// Duración del turno en minutos (siempre positiva, cross-midnight aware).
export const duracionMin = (horaInicio, horaFin) => finEnMin(horaInicio, horaFin) - toMinHHMM(horaInicio)
