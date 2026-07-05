// Helpers del módulo financiero / "Dirección del club".
// Incluye: snapshot de tarifa de lista + el MOTOR DE SALUD FINANCIERA (break-even,
// rinde por turno / RevPACH, costo del turno vacío). Todo se mide en TURNOS de 1.5h,
// que es la unidad natural del sistema (el precio se cobra por turno, la ocupación se
// cuenta en slots) → cero conversiones, coherente con el dashboard.
import prisma from './prisma.js'
import { hoyArgStr, franjasDia, franjaTimes } from './tiempo.js'

// Días capitalizados con acento, como los guarda club.config.horarios.
const DIAS_CFG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }

// franjasDia / franjaTimes viven en tiempo.js (fuente única, cross-midnight aware).

// Para ordenar franjas: las de madrugada (antes de las 06:00) son cruce de medianoche →
// van al FINAL del día, no al principio. Les sumamos 1440 al ordenar.
const ordenFranja = (hhmm) => { const m = toMin(hhmm); return m < 360 ? m + 1440 : m }

// Lista de las últimas N fechas YYYY-MM-DD (incluyendo hoy), en hora Argentina.
const ultimasNFechas = (hoyStr, n) => {
  const [y, m, d] = hoyStr.split('-').map(Number)
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i))
    out.push(dt.toISOString().slice(0, 10))
  }
  return out
}

// Turnos-cancha disponibles en un conjunto de fechas = Σ (por cada fecha, por cada cancha
// activa) franjas de 1.5h de ese día. Respeta horario propio de la cancha si lo tiene.
export const turnosDisponiblesEnFechas = (horariosClub, canchas, fechas) => {
  let total = 0
  for (const f of fechas) {
    const [y, m, d] = f.split('-').map(Number)
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    const diaCfg = DIAS_CFG[dow]
    for (const c of canchas) {
      const h = (c.horarios && c.horarios[diaCfg]) || horariosClub[diaCfg]
      total += franjasDia(h)
    }
  }
  return total
}

// Normaliza un costo a su equivalente MENSUAL (la "mochila" es mensual).
// unico no es recurrente → no suma a la mochila mensual.
export const montoMensual = (costo) => {
  switch (costo.periodicidad) {
    case 'mensual': return costo.monto
    case 'bimestral': return Math.round(costo.monto / 2)
    case 'anual': return Math.round(costo.monto / 12)
    default: return 0 // 'unico'
  }
}

/**
 * MOTOR DE SALUD FINANCIERA. Cruza costos + reservas + horarios y devuelve las métricas
 * base del break-even, todo en TURNOS de 1.5h, sobre una ventana móvil de 30 días (para que
 * ingreso y disponibilidad cubran el MISMO período → número estable y comparable).
 *
 * @param {string} clubId
 * @returns {Promise<object>} métricas + flags de "faltan datos" para guiar el onboarding
 */
export async function calcularSaludFinanciera(clubId) {
  const hoy = hoyArgStr()
  const fechas = ultimasNFechas(hoy, 30)
  const desde = fechas[0]

  const [club, canchas, costos, reservas] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { config: true } }),
    prisma.cancha.findMany({ where: { clubId, activo: true }, select: { horarios: true, precioTurno: true } }),
    prisma.costo.findMany({ where: { clubId, activo: true } }),
    // Reservas de los últimos 30 días (por fecha). Para ocupación: no canceladas. Para
    // ingreso/precio realizado: pagadas.
    prisma.reserva.findMany({
      where: { clubId, fecha: { gte: desde, lte: hoy }, estado: { not: 'cancelada' } },
      select: { precio: true, pagado: true, fecha: true, cobroOmitido: true, esTurnoFijo: true },
    }),
  ])

  const horariosClub = club?.config?.horarios || {}
  const turnosDisponibles = turnosDisponiblesEnFechas(horariosClub, canchas, fechas)

  // Costos: mochila fija mensual + costo variable por turno.
  const fijoMensual = costos.filter((c) => c.tipo === 'fijo').reduce((s, c) => s + montoMensual(c), 0)
  // Los costos 'variable' se cargan como "por turno" (ej. luz+limpieza de un turno).
  const variablePorTurno = costos.filter((c) => c.tipo === 'variable').reduce((s, c) => s + c.monto, 0)

  // Reservas: ocupación (no canceladas) e ingreso (pagadas).
  const turnosVendidos = reservas.length
  const pagadas = reservas.filter((r) => r.pagado)
  const ingresoCanchas = pagadas.reduce((s, r) => s + (r.precio ?? 0), 0)
  const turnosPagados = pagadas.length
  const precioRealizado = turnosPagados > 0 ? Math.round(ingresoCanchas / turnosPagados) : 0
  // Precio de lista promedio de las canchas activas (fallback para el break-even cuando el
  // club es nuevo y todavía no cobró ningún turno → así el onboarding muestra algo útil).
  const canchasConPrecio = canchas.filter((c) => c.precioTurno > 0)
  const precioLista = canchasConPrecio.length > 0
    ? Math.round(canchasConPrecio.reduce((s, c) => s + c.precioTurno, 0) / canchasConPrecio.length)
    : 0
  // Precio de referencia para el break-even: lo realizado si hay ventas, si no la lista.
  const precioRef = precioRealizado > 0 ? precioRealizado : precioLista

  // AUSENTISMO (inferido, automático): turnos de días YA pasados que quedaron impagos y que
  // el club no marcó "no cobrar". Proxy honesto de no-shows: el sistema no "ve" si el jugador
  // vino, pero un turno vencido sin cobrar es plata perdida. La seña (a futuro) lo resuelve.
  // Se EXCLUYEN los turnos fijos: muchos clubes los cobran por mes (no por día), así que un TF
  // impago de ayer NO es un no-show — contarlo inflaba el % y acusaba al dueño de algo ya cobrado.
  const vencidas = reservas.filter((r) => r.fecha < hoy && !r.esTurnoFijo)
  const ausentes = vencidas.filter((r) => !r.pagado && !r.cobroOmitido)
  const ausencias = ausentes.length
  const ausenciasMonto = ausentes.reduce((s, r) => s + (r.precio ?? 0), 0)
  const ausenciasPct = vencidas.length > 0 ? Math.round((ausencias / vencidas.length) * 100) : null

  // Métricas derivadas (null cuando faltan datos para calcularlas honestamente).
  const contribPorTurno = precioRef - variablePorTurno
  const breakEvenTurnos = fijoMensual > 0 && contribPorTurno > 0 ? Math.ceil(fijoMensual / contribPorTurno) : null
  const costoTurnoVacio = turnosDisponibles > 0 ? Math.round(fijoMensual / turnosDisponibles) : 0
  const turnosVacios = Math.max(0, turnosDisponibles - turnosVendidos)
  const rindePorTurno = turnosDisponibles > 0 ? Math.round(ingresoCanchas / turnosDisponibles) : 0 // RevPACH
  // Clamp a 100: no se pueden vender más turnos de los que existen. Si sale >100 es un dato
  // anómalo (reservas fuera del horario configurado) → mostrar 130% mina la confianza del tablero.
  const ocupacionPct = turnosDisponibles > 0 ? Math.min(100, Math.round((turnosVendidos / turnosDisponibles) * 100)) : 0
  const breakEvenPct = breakEvenTurnos && turnosDisponibles > 0 ? Math.round((breakEvenTurnos / turnosDisponibles) * 100) : null

  // YIELD (rendimiento de tarifa): del máximo posible (vender TODO a precio de lista),
  // cuánto se hace de verdad. Se descompone en dos fugas que suman con el yield 100%:
  //   yield = ocupación(ingreso) × (precio realizado / precio lista)
  //   fuga por vacío = 1 − ocupación · fuga por descuento = ocupación × (1 − realizado/lista)
  // Solo calculable si hay precio de lista y ya se cobró algún turno.
  let yieldPct = null, fugaVacioPct = null, fugaDescuentoPct = null
  if (precioLista > 0 && turnosDisponibles > 0 && turnosPagados > 0) {
    const ocupIngreso = turnosPagados / turnosDisponibles
    const ratioPrecio = Math.min(1, precioRealizado / precioLista) // clamp: cobrar > lista no es "fuga"
    const y = ocupIngreso * ratioPrecio
    yieldPct = Math.round(y * 100)
    fugaVacioPct = Math.round((1 - ocupIngreso) * 100)
    fugaDescuentoPct = Math.max(0, 100 - yieldPct - fugaVacioPct) // el resto, para que sumen 100
  }

  return {
    periodo: { desde, hasta: hoy, dias: 30 },
    // Insumos (para mostrar y para el simulador del Bloque 4)
    turnosDisponibles,
    turnosVendidos,
    turnosVacios,
    ingresoCanchas,
    precioRealizado,
    precioLista,
    precioRef,      // el que usa el break-even (realizado si hay ventas, si no lista)
    fijoMensual,
    variablePorTurno,
    contribPorTurno,
    // Métricas estrella
    rindePorTurno,                                   // RevPACH ("Rinde por turno")
    ocupacionPct,
    yieldPct,                                        // rendimiento de tarifa (0-100)
    fugaVacioPct,                                    // % que se pierde por turnos vacíos
    fugaDescuentoPct,                                // % que se pierde por descuentos
    ausencias,                                       // turnos vencidos impagos (proxy no-show)
    ausenciasMonto,                                  // plata perdida por ausencias
    ausenciasPct,                                    // % de turnos vencidos que quedaron sin cobrar
    breakEvenTurnos,
    breakEvenPct,
    costoTurnoVacio,
    costoTurnosVacios: costoTurnoVacio * turnosVacios, // la "sangría" de las canchas vacías
    porEncimaDelEquilibrio: breakEvenTurnos != null ? turnosVendidos - breakEvenTurnos : null,
    // Flags para guiar el onboarding (qué falta cargar)
    falta: {
      costosFijos: fijoMensual === 0,
      costoVariable: variablePorTurno === 0,
      horarios: turnosDisponibles === 0,
      reservas: turnosVendidos === 0,
      // Sin precio de referencia (ni cancha con precio ni ningún turno cobrado) el break-even no
      // se puede calcular → el onboarding tiene que pedir el precio como tercera pregunta de rescate.
      precio: precioRef === 0,
    },
  }
}

/**
 * CONTRIBUCIÓN POR SECTOR: para cada sector (canchas / clases / bar-tienda) calcula
 * ingreso − costos directos − parte prorrateada de los costos generales (por % de ingreso).
 * Es el "margen que no miente": desenmascara al sector que parece rentable y no lo es.
 * Ventana 30 días. Solo cuenta lo cobrado (pagado).
 * @param {string} clubId
 */
export async function calcularContribucionSectores(clubId) {
  const hoy = hoyArgStr()
  const fechas = ultimasNFechas(hoy, 30)
  const desde = fechas[0]

  const [reservas, cargos, costos] = await Promise.all([
    // Reservas cobradas: separamos clases (profesor) de canchas.
    prisma.reserva.findMany({
      where: { clubId, fecha: { gte: desde, lte: hoy }, pagado: true, estado: { not: 'cancelada' } },
      select: { precio: true, profesorId: true, tipo: true },
    }),
    // Ventas de bar/tienda cobradas (Cargo tipo producto), con su COGS (costo).
    prisma.cargo.findMany({
      where: { clubId, tipo: 'producto', estado: 'pagado', pagadoAt: { not: null } },
      select: { monto: true, costo: true, pagadoAt: true },
    }),
    // TODOS los costos activos: los fijos van al sector (o al prorrateo) y los variables
    // se restan por turno a los sectores que usan la cancha (canchas + clases).
    prisma.costo.findMany({ where: { clubId, activo: true } }),
  ])

  // ── Ingresos y turnos por sector ──
  let ingCanchas = 0, ingClases = 0, ingBar = 0, cogsBar = 0
  let turnosCanchas = 0, turnosClases = 0
  for (const r of reservas) {
    const esClase = r.profesorId || r.tipo === 'clase'
    if (esClase) { ingClases += r.precio ?? 0; turnosClases++ }
    else { ingCanchas += r.precio ?? 0; turnosCanchas++ }
  }
  // Cargos de producto en la ventana de 30 días (filtramos por pagadoAt).
  const desdeDate = new Date(`${desde}T00:00:00`)
  for (const c of cargos) {
    if (c.pagadoAt && new Date(c.pagadoAt) >= desdeDate) {
      ingBar += c.monto ?? 0
      cogsBar += c.costo ?? 0
    }
  }

  // ── Costos directos por sector (los que el dueño asignó a un sector) ──
  const directo = { canchas: 0, clases: 0, bar: 0 }
  let fijoGeneral = 0
  let variablePorTurno = 0
  for (const c of costos) {
    // Costo variable = por turno (luz de la cancha, limpieza). No es de un sector: lo consume
    // cada turno jugado, sea reserva o clase → se resta después según cuántos turnos hubo.
    if (c.tipo === 'variable') { variablePorTurno += c.monto; continue }
    const m = montoMensual(c)
    if (c.sector === 'canchas') directo.canchas += m
    else if (c.sector === 'clases') directo.clases += m
    else if (c.sector === 'bar' || c.sector === 'proshop') directo.bar += m
    else fijoGeneral += m // sector null = general → se prorratea
  }
  // Variable directo de cada sector que usa la cancha (canchas y clases consumen un turno).
  const varCanchas = variablePorTurno * turnosCanchas
  const varClases = variablePorTurno * turnosClases

  // ── Armado de sectores ──
  const base = [
    { key: 'canchas', nombre: 'Canchas', ingreso: ingCanchas, directos: directo.canchas + varCanchas },
    { key: 'clases', nombre: 'Clases', ingreso: ingClases, directos: directo.clases + varClases },
    { key: 'bar', nombre: 'Bar / Tienda', ingreso: ingBar, directos: directo.bar + cogsBar }, // COGS es directo del bar
  ].filter((s) => s.ingreso > 0 || s.directos > 0) // no mostrar sectores sin actividad

  const ingresoTotal = base.reduce((s, x) => s + x.ingreso, 0)
  const sectores = base.map((s) => {
    // Prorrateo del fijo general por participación en el ingreso.
    const fijoAsignado = ingresoTotal > 0 ? Math.round(fijoGeneral * (s.ingreso / ingresoTotal)) : 0
    const contribucion = s.ingreso - s.directos - fijoAsignado
    const margenPct = s.ingreso > 0 ? Math.round((contribucion / s.ingreso) * 100) : null
    // El bar vendió pero no tiene COGS cargado → su margen está inflado (parece 100% ganancia).
    // Señal honesta para avisar: "cargá cuánto te cuesta cada producto" (el COGS sale de Cargo.costo).
    const cogsFaltante = s.key === 'bar' && s.ingreso > 0 && cogsBar === 0
    return { ...s, cogs: s.key === 'bar' ? cogsBar : 0, fijoAsignado, contribucion, margenPct, cogsFaltante }
  })

  return {
    periodo: { desde, hasta: hoy, dias: 30 },
    fijoGeneral,
    ingresoTotal,
    sectores,
    sinCostosPorSector: Object.values(directo).every((v) => v === 0), // aviso: todo prorrateado
  }
}

// TF guardan el día en minúscula sin acento; mapeo a índice getUTCDay (0=domingo).
const DIA_TF_IDX = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }
// Cuántas veces cae un día de semana (índice 0-6) en un mes (year, month 1-12).
export const ocurrenciasDia = (idx, year, month, desdeDia = 1) => {
  const dias = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let n = 0
  for (let d = Math.max(1, desdeDia); d <= dias; d++) if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() === idx) n++
  return n
}

/**
 * FLUJO DE CAJA a 90 días (3 meses). Proyecta, mes a mes, cobros esperados (turnos fijos
 * recurrentes + reservas ya agendadas) − pagos esperados (costos según su periodicidad y
 * meses de pago). Muestra el neto por mes y el acumulado, para ver los baches por adelantado.
 * Aproximado: sin saldo inicial real (arranca de 0 → importa la FORMA de la curva).
 * @param {string} clubId
 * @param {{year:number, month:number}} desdeMes - mes de arranque (hoy en ARG lo pasa el router)
 */
export async function calcularFlujoCaja(clubId, desdeMes) {
  const hoy = hoyArgStr()
  const [hy, hm, hd] = hoy.split('-').map(Number)
  const y0 = desdeMes?.year ?? hy
  const m0 = desdeMes?.month ?? hm

  const [tfs, reservasFuturas, costos] = await Promise.all([
    prisma.turnoFijo.findMany({ where: { clubId, estado: 'confirmado' }, select: { dia: true, precio: true } }),
    // Reservas ya agendadas a futuro y todavía no cobradas (cobro esperado). Excluye TF materializados
    // para no duplicar con la proyección de turnos fijos.
    prisma.reserva.findMany({
      where: { clubId, fecha: { gt: hoy }, pagado: false, estado: { not: 'cancelada' }, esTurnoFijo: false },
      select: { fecha: true, precio: true },
    }),
    prisma.costo.findMany({ where: { clubId, activo: true } }),
  ])

  const MESES_LBL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const meses = []
  let acumulado = 0

  for (let k = 0; k < 3; k++) {
    const month = ((m0 - 1 + k) % 12) + 1
    const year = y0 + Math.floor((m0 - 1 + k) / 12)

    // Cobros: turnos fijos recurrentes (ocurrencias del día en el mes × precio).
    // En el mes EN CURSO (k=0) contamos solo las caídas de hoy en adelante: las de días ya
    // pasados no son "cobro futuro" (y muchas ya se cobraron) → inflaban la barra del mes actual.
    const desdeDia = k === 0 ? hd : 1
    let cobros = 0
    for (const tf of tfs) {
      const idx = DIA_TF_IDX[tf.dia]
      if (idx == null) continue
      cobros += ocurrenciasDia(idx, year, month, desdeDia) * (tf.precio ?? 0)
    }
    // Cobros: reservas ya agendadas en ese mes (solo aplica al primer mes/próximos, futuras).
    const ym = `${year}-${String(month).padStart(2, '0')}`
    for (const r of reservasFuturas) if (r.fecha.startsWith(ym)) cobros += r.precio ?? 0

    // Pagos: costos FIJOS que caen ese mes según periodicidad. Los variables (por turno) no son
    // un compromiso de calendario — escalan con la actividad, no van en la proyección de caja.
    let pagos = 0
    for (const c of costos) {
      if (c.tipo !== 'fijo') continue
      if (c.periodicidad === 'mensual') pagos += c.monto
      else if (c.periodicidad === 'bimestral') { if (k % 2 === 0) pagos += c.monto } // este mes y cada 2
      else if (c.periodicidad === 'anual') {
        if (c.mesesPago?.length) { if (c.mesesPago.includes(month)) pagos += c.monto }
        else pagos += Math.round(c.monto / 12) // sin mes definido → prorrateo
      }
      // 'unico' no se proyecta como recurrente
    }

    const neto = cobros - pagos
    acumulado += neto
    meses.push({ year, month, label: `${MESES_LBL[month - 1]} ${year}`, cobros, pagos, neto, acumulado })
  }

  return { meses, tfsProyectados: tfs.length }
}

// Orden de los días para mostrar (Lunes primero, como una agenda).
const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/**
 * HEATMAP día × franja: para cada (día de semana, franja de 1.5h) calcula el % de ocupación
 * histórico sobre una ventana de semanas. Clasifica en pico (>80%) / medio (40-80%) / frío (<40%).
 * @param {string} clubId
 * @param {number} semanas - ventana de historia (default 8, para tener muestras por celda)
 */
export async function calcularHeatmap(clubId, semanas = 8) {
  const hoy = hoyArgStr()
  const dias = semanas * 7
  const fechas = ultimasNFechas(hoy, dias)
  const desde = fechas[0]

  const [club, canchas, reservas] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { config: true } }),
    prisma.cancha.findMany({ where: { clubId, activo: true }, select: { horarios: true } }),
    prisma.reserva.findMany({
      where: { clubId, fecha: { gte: desde, lte: hoy }, estado: { not: 'cancelada' } },
      select: { fecha: true, horaInicio: true },
    }),
  ])
  const horariosClub = club?.config?.horarios || {}

  // Acumuladores: disponibles[dia][franja] y vendidos[dia][franja].
  const disp = {}, vend = {}
  const franjasSet = new Set()
  const bump = (obj, dia, fr, n = 1) => { (obj[dia] ??= {})[fr] = (obj[dia]?.[fr] ?? 0) + n }

  // Disponibilidad: por cada fecha × cancha activa, cada franja de ese día suma 1.
  for (const f of fechas) {
    const [y, m, d] = f.split('-').map(Number)
    const diaCfg = DIAS_CFG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
    for (const c of canchas) {
      const h = (c.horarios && c.horarios[diaCfg]) || horariosClub[diaCfg]
      for (const fr of franjaTimes(h)) { bump(disp, diaCfg, fr); franjasSet.add(fr) }
    }
  }
  // Vendidos: cada reserva suma 1 a su (día, franja).
  for (const r of reservas) {
    const [y, m, d] = r.fecha.split('-').map(Number)
    const diaCfg = DIAS_CFG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
    bump(vend, diaCfg, r.horaInicio)
    franjasSet.add(r.horaInicio)
  }

  const franjas = [...franjasSet].sort((a, b) => ordenFranja(a) - ordenFranja(b))
  const diasConHorario = DIAS_ORDEN.filter((d) => disp[d] && Object.keys(disp[d]).length)

  // Matriz de celdas con % y zona.
  const zona = (pct) => (pct >= 80 ? 'pico' : pct >= 40 ? 'medio' : 'frio')
  const celdas = {}
  for (const dia of diasConHorario) {
    celdas[dia] = {}
    for (const fr of franjas) {
      const d = disp[dia]?.[fr] ?? 0
      const v = vend[dia]?.[fr] ?? 0
      const pct = d > 0 ? Math.round((v / d) * 100) : null // null = el club no abre ese día/franja
      celdas[dia][fr] = pct == null ? null : { pct: Math.min(100, pct), vendidos: v, disponibles: d, zona: zona(pct) }
    }
  }

  return { periodo: { desde, hasta: hoy, semanas }, dias: diasConHorario, franjas, celdas, umbrales: { pico: 80, medio: 40 } }
}

// Cuántas veces por año se juega un turno fijo semanal. 52 semanas; se usa para el valor anual (LTV).
const SEMANAS_ANIO = 52
// Un turno fijo está "en riesgo de baja" si faltó este umbral de veces en la ventana reciente.
const UMBRAL_RIESGO_AUSENCIAS = 3
const SEMANAS_VENTANA_RIESGO = 8

/**
 * RETENCIÓN DE TURNOS FIJOS (LTV + churn). El turno fijo es el ingreso más valioso porque se
 * REPITE: perder uno no es perder un turno, es perder su valor anual. Devuelve el valor recurrente
 * total (para dimensionar lo que está en juego) y la lista de TF "en riesgo" — los que acumularon
 * varias ausencias recientes (señal temprana de baja) para que el dueño los retenga a tiempo.
 * @param {string} clubId
 */
export async function calcularRetencionTF(clubId) {
  const hoy = hoyArgStr()
  const fechas = ultimasNFechas(hoy, SEMANAS_VENTANA_RIESGO * 7) // ventana de 8 semanas
  const desde = fechas[0]

  const tfs = await prisma.turnoFijo.findMany({
    where: { clubId, estado: 'confirmado' },
    select: {
      id: true, precio: true, dia: true, horaInicio: true, diasAusentes: true,
      jugador: { select: { nombre: true, apellido: true } },
    },
  })

  let valorRecurrenteAnual = 0
  const enRiesgo = []
  for (const tf of tfs) {
    const valorAnual = (tf.precio ?? 0) * SEMANAS_ANIO
    valorRecurrenteAnual += valorAnual
    // Ausencias dentro de la ventana reciente (las fechas viejas no cuentan como señal de baja HOY).
    const ausenciasRecientes = (tf.diasAusentes || []).filter((f) => f >= desde && f <= hoy).length
    if (ausenciasRecientes >= UMBRAL_RIESGO_AUSENCIAS) {
      enRiesgo.push({
        id: tf.id,
        jugador: tf.jugador ? `${tf.jugador.nombre} ${tf.jugador.apellido || ''}`.trim() : 'Sin asignar',
        dia: tf.dia,
        horaInicio: tf.horaInicio,
        ausenciasRecientes,
        valorAnual,
      })
    }
  }
  // Primero los que más faltaron; a igualdad, el de mayor valor anual (más plata en juego).
  enRiesgo.sort((a, b) => b.ausenciasRecientes - a.ausenciasRecientes || b.valorAnual - a.valorAnual)

  return {
    periodo: { desde, hasta: hoy, semanas: SEMANAS_VENTANA_RIESGO },
    totalTF: tfs.length,
    valorRecurrenteAnual,
    valorRecurrenteMensual: Math.round(valorRecurrenteAnual / 12),
    enRiesgo,
    umbral: UMBRAL_RIESGO_AUSENCIAS,
  }
}


/**
 * Devuelve la tarifa de lista vigente de una cancha (su precioTurno) para congelarla
 * como snapshot en la reserva. Se guarda al crear porque el precio de la cancha cambia
 * con la inflación: sin el snapshot, el yield (cuánto se descontó) no se puede reconstruir.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - cliente Prisma (o tx)
 * @param {string} canchaId
 * @returns {Promise<number|null>} precioTurno de la cancha, o null si no tiene/no existe
 */
export async function tarifaListaSnapshot(tx, canchaId) {
  if (!canchaId) return null
  const cancha = await tx.cancha.findUnique({
    where: { id: canchaId },
    select: { precioTurno: true },
  })
  // precioTurno 0 (sin precio configurado) lo tratamos como "sin tarifa de lista" → null
  return cancha?.precioTurno ? cancha.precioTurno : null
}
