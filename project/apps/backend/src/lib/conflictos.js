// ───────────────────────────── CONFLICTOS DE CANCHA ─────────────────────────────
// FUENTE ÚNICA DE VERDAD del anti-doble-booking. Usá estas funciones en TODOS los caminos de
// creación que ocupan un slot (reserva eventual, clase, turno fijo, convocatoria) — así la
// validación es consistente y cross-midnight aware en un solo lugar, no copiada y divergente.
//
// Una cancha tiene tres tipos de ocupación que conviven:
//   - Reserva eventual (fila Reserva, por FECHA puntual)
//   - Clase de profesor (fila Reserva con tipo 'clase' + profesorId, por FECHA)
//   - Turno fijo (fila TurnoFijo, recurrente por DÍA de semana)
// Reserva y clase son la misma tabla (Reserva), así que chequear reservas YA incluye clases.
//
// ⚠️ SIEMPRE pasá un cliente transaccional `tx` (de runSerializable) para que el chequeo y la
// creación sean atómicos (anti TOCTOU).

const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }

// Rango en minutos con cruce de medianoche: si fin <= inicio, el turno termina al día siguiente.
const rangoMin = (inicio, fin) => { const i = toMin(inicio); let f = toMin(fin); if (f <= i) f += 1440; return { i, f } }

// ¿Dos turnos se solapan? Cross-midnight aware (chequeo en espacio extendido de 48h).
export const overlaps = (aIni, aFin, bIni, bFin) => {
  const a = rangoMin(aIni, aFin), b = rangoMin(bIni, bFin)
  if (a.i < b.f && a.f > b.i) return true
  if (a.i < b.f + 1440 && a.f > b.i + 1440) return true
  if (a.i + 1440 < b.f && a.f + 1440 > b.i) return true
  return false
}

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Día de semana ('lunes', ...) de una fecha 'YYYY-MM-DD'.
export const fechaADia = (fecha) => { const [y, m, d] = fecha.split('-').map(Number); return DIAS[new Date(y, m - 1, d).getDay()] }

// Próximas `n` fechas ('YYYY-MM-DD') que caen en el día de semana `dia`, desde `desdeFecha` (incl).
export const proximasFechasDeDia = (dia, n, desdeFecha) => {
  const target = DIAS.indexOf(dia)
  if (target < 0) return []
  const [y, m, d] = desdeFecha.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const fechas = []
  for (let i = 0; i < 7 * n + 7 && fechas.length < n; i++) {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    if (dt.getDay() === target) fechas.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`)
  }
  return fechas
}

const ACTIVOS_RESERVA = ['pendiente', 'confirmada']
const ACTIVOS_TF = ['pendiente', 'confirmado']

// ¿Hay conflicto para ocupar canchaId en una FECHA puntual (reserva eventual / clase / convocatoria)?
// Devuelve { tipo, fecha } del primer conflicto, o null si está libre.
// Chequea: reservas+clases de esa fecha (overlap) y turnos fijos activos del día (no ausentes, desde<=fecha).
export async function conflictoEnFecha(tx, { clubId, canchaId, fecha, horaInicio, horaFin, excluirReservaId = null }) {
  const reservas = await tx.reserva.findMany({
    where: { clubId, canchaId, fecha, estado: { in: ACTIVOS_RESERVA }, ...(excluirReservaId ? { id: { not: excluirReservaId } } : {}) },
    select: { horaInicio: true, horaFin: true, tipo: true },
  })
  const rc = reservas.find((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
  if (rc) return { tipo: rc.tipo === 'clase' ? 'clase' : 'reserva', fecha }

  const dia = fechaADia(fecha)
  const tfs = await tx.turnoFijo.findMany({
    where: { clubId, canchaId, dia, estado: { in: ACTIVOS_TF } },
    select: { horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
  })
  const tc = tfs.find((t) => overlaps(t.horaInicio, t.horaFin, horaInicio, horaFin) && !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))
  if (tc) return { tipo: 'turno_fijo', fecha }
  return null
}

// ¿Hay conflicto para ocupar canchaId en un DÍA recurrente (turno fijo)?
// Chequea: otros TF activos del mismo día (overlap) y reservas/clases en las próximas `ocurrencias`
// fechas de ese día (desde `desdeFecha`). Devuelve { tipo, fecha } o null.
export async function conflictoEnDia(tx, { clubId, canchaId, dia, horaInicio, horaFin, desdeFecha, excluirTfId = null, ocurrencias = 8 }) {
  const tfs = await tx.turnoFijo.findMany({
    where: { clubId, canchaId, dia, estado: { in: ACTIVOS_TF }, ...(excluirTfId ? { id: { not: excluirTfId } } : {}) },
    select: { horaInicio: true, horaFin: true },
  })
  if (tfs.some((t) => overlaps(t.horaInicio, t.horaFin, horaInicio, horaFin))) return { tipo: 'turno_fijo', fecha: null }

  const fechas = proximasFechasDeDia(dia, ocurrencias, desdeFecha)
  const reservas = await tx.reserva.findMany({
    where: { clubId, canchaId, fecha: { in: fechas }, estado: { in: ACTIVOS_RESERVA } },
    select: { horaInicio: true, horaFin: true, fecha: true, tipo: true },
  })
  const rc = reservas.find((r) => overlaps(r.horaInicio, r.horaFin, horaInicio, horaFin))
  if (rc) return { tipo: rc.tipo === 'clase' ? 'clase' : 'reserva', fecha: rc.fecha }
  return null
}
