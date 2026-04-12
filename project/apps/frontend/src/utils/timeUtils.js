/**
 * timeUtils.js — Utilidades de tiempo para el sistema de reservas
 *
 * Todas las comparaciones de tiempo usan MINUTOS desde medianoche (0–1439).
 * Para rangos que cruzan medianoche, fin_min > 1440 (ej: 01:00 = 1500 min si inicio es 23:00).
 * Esto elimina por completo las comparaciones de strings tipo '22:00' > '01:00'.
 */

/**
 * Convierte 'HH:MM' a minutos desde medianoche.
 * Soporta valores > 1440 (cross-midnight representado como horas extendidas).
 * @param {string} time - Formato 'HH:MM' o 'HH:MM' donde HH puede ser > 23
 * @returns {number} minutos
 */
export const toMin = (time) => {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Convierte minutos a string 'HH:MM'.
 * Si min >= 1440, representa hora del día siguiente (ej: 1500 → '01:00').
 * @param {number} min
 * @returns {string}
 */
export const toTime = (min) => {
  const normalized = ((min % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Calcula fin en minutos de forma cross-midnight aware.
 * Si fin <= inicio, asume que el rango cruza medianoche y suma 1440 al fin.
 * @param {string} inicio - 'HH:MM'
 * @param {string} fin - 'HH:MM'
 * @returns {{ inicioMin: number, finMin: number, cruzaMedianoche: boolean }}
 */
export const rangoMin = (inicio, fin) => {
  const inicioMin = toMin(inicio)
  let finMin = toMin(fin)
  const cruzaMedianoche = finMin <= inicioMin
  if (cruzaMedianoche) finMin += 1440
  return { inicioMin, finMin, cruzaMedianoche }
}

/**
 * Verifica si dos rangos de tiempo se superponen (overlap).
 * Cross-midnight aware: si finA <= inicioA o finB <= inicioB, se ajusta automáticamente.
 * @param {string} inicioA
 * @param {string} finA
 * @param {string} inicioB
 * @param {string} finB
 * @returns {boolean}
 */
export const overlaps = (inicioA, finA, inicioB, finB) => {
  const a = rangoMin(inicioA, finA)
  const b = rangoMin(inicioB, finB)

  // Caso normal: ambos en el mismo día
  if (!a.cruzaMedianoche && !b.cruzaMedianoche) {
    return a.inicioMin < b.finMin && a.finMin > b.inicioMin
  }

  // Al menos uno cruza medianoche: chequear ambas "ventanas" del día
  // Ventana A: [inicioA, fin_medianoche) y [0, finA_modulo)
  // Ventana B: idem
  // Simplificado: comparar en espacio extendido de 48h
  const aI = a.inicioMin
  const aF = a.finMin // ya con +1440 si cross
  const bI = b.inicioMin
  const bF = b.finMin // ya con +1440 si cross

  // Chequeo directo en espacio extendido
  if (aI < bF && aF > bI) return true

  // Chequeo con B desplazado un día (para cubrir cuando A está en el día siguiente)
  if (aI < bF + 1440 && aF > bI + 1440) return true
  if (aI + 1440 < bF && aF + 1440 > bI) return true

  return false
}

/**
 * Verifica si un slot está DENTRO del rango horario del club.
 * Usa lógica de minutos para soportar cierre post-medianoche.
 * @param {string} slotInicio - 'HH:MM'
 * @param {string} slotFin - 'HH:MM'
 * @param {string} apertura - 'HH:MM'
 * @param {string} cierre - 'HH:MM'
 * @returns {boolean}
 */
export const inRange = (slotInicio, slotFin, apertura, cierre) => {
  const ap = toMin(apertura)
  const { finMin: ci, cruzaMedianoche: cierreCruza } = rangoMin(apertura, cierre)
  const si = toMin(slotInicio)
  const { finMin: sf } = rangoMin(slotInicio, slotFin)

  if (!cierreCruza) {
    // Rango normal: apertura < cierre dentro del mismo día
    return si >= ap && sf <= ci
  } else {
    // Rango cross-midnight: slot puede estar en la primera o segunda parte
    // Primera parte: slotInicio >= apertura (mismo día)
    if (si >= ap) return sf <= ci
    // Segunda parte: slotFin <= cierre (día siguiente, representado como si+1440)
    return si + 1440 >= ap && sf <= ci
  }
}

/**
 * Verifica si una reserva (por fecha+inicio+fin) bloquea un slot de otro día
 * debido a cross-midnight. Retorna true si la reserva del día anterior
 * (o posterior) se superpone con el slot del día actual.
 *
 * @param {object} reserva - { fecha, inicio, fin }
 * @param {string} fechaSlot - fecha del slot a chequear ('YYYY-MM-DD')
 * @param {string} slotInicio
 * @param {string} slotFin
 * @returns {boolean}
 */
export const reservaBloquea = (reserva, fechaSlot, slotInicio, slotFin) => {
  const { inicioMin: rI, finMin: rF, cruzaMedianoche } = rangoMin(reserva.inicio, reserva.fin)

  if (!cruzaMedianoche) {
    // Reserva normal: solo bloquea su propia fecha
    if (reserva.fecha !== fechaSlot) return false
    return overlaps(reserva.inicio, reserva.fin, slotInicio, slotFin)
  }

  // Reserva cross-midnight: puede bloquear su fecha Y la siguiente
  const fechaReserva = reserva.fecha
  const fechaSiguiente = offsetFecha(fechaReserva, 1)

  if (reserva.fecha === fechaSlot) {
    // Parte del mismo día (inicio hasta medianoche)
    const slotI = toMin(slotInicio)
    const { finMin: slotF } = rangoMin(slotInicio, slotFin)
    return slotI < 1440 && rI < Math.min(slotF, 1440) && Math.min(rF, 1440) > slotI
  }

  if (fechaSiguiente === fechaSlot) {
    // Parte del día siguiente (medianoche hasta fin)
    const rFModulo = rF % 1440 // fin real en el día siguiente
    const slotI = toMin(slotInicio)
    const slotF = toMin(slotFin)
    const finReal = rFModulo === 0 ? 1440 : rFModulo
    return slotI < finReal && slotF > 0
  }

  return false
}

/**
 * Suma N días a una fecha ISO 'YYYY-MM-DD'.
 * @param {string} fechaISO
 * @param {number} n
 * @returns {string}
 */
export const offsetFecha = (fechaISO, n) => {
  const d = new Date(fechaISO + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/**
 * Verifica si un rango de tiempo cruza la medianoche.
 * @param {string} inicio - 'HH:MM'
 * @param {string} fin - 'HH:MM'
 * @returns {boolean}
 */
export const cruzaMedianoche = (inicio, fin) => toMin(fin) <= toMin(inicio)
