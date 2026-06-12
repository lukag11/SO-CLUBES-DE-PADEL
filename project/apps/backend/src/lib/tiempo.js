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

// Hora actual en Argentina en formato 'HH:MM' (para saber qué turno está en curso).
export const ahoraArgHHMM = () => {
  const a = ahoraArg()
  return `${String(a.getUTCHours()).padStart(2, '0')}:${String(a.getUTCMinutes()).padStart(2, '0')}`
}
