// ── torneoService.js ──────────────────────────────────────────────────────────
// Lógica pura de bracket. Sin efectos secundarios ni dependencias de React/Zustand.

const nextPow2 = (n) => {
  let p = 1
  while (p < n) p *= 2
  return p
}

const ROUND_NAMES = {
  1:  'Final',
  2:  'Semifinal',
  4:  'Cuartos de final',
  8:  'Octavos de final',
  16: '16avos de final',
}

// Máximo de parejas por categoría soportado por los draws APA (10 zonas × hasta 4 parejas)
export const MAX_PAREJAS_POR_CATEGORIA = 32

// ── Draws APA por cantidad de zonas ──────────────────────────────────────────
// slots: lista ordenada de códigos para el bracket principal ('1A', '2B', null=BYE, 'pi0'=ganador previa 0)
// previas: partidos previos al bracket principal
const APA_DRAWS = {
  2:  { previas: [],
        slots: ['1A','2B','2A','1B'] },
  3:  { previas: [{ p1:'2B', p2:'2C' }, { p1:'1C', p2:'2A' }],
        slots: ['1A','pi0','pi1','1B'] },
  4:  { previas: [],
        slots: ['1A','2C','2B','1D','1C','2A','2D','1B'] },
  5:  { previas: [{ p1:'2B', p2:'2C' }, { p1:'2A', p2:'2D' }],
        slots: ['1A','pi0','1E','1D','1C','2E','pi1','1B'] },
  6:  { previas: [{ p1:'2F', p2:'2C' }, { p1:'1E', p2:'2B' }, { p1:'2A', p2:'1F' }, { p1:'2E', p2:'2D' }],
        slots: ['1A','pi0','pi1','1D','1C','pi2','pi3','1B'] },
  7:  { previas: [],
        slots: ['1A',null,'2F','2G','1E','2C','2B','1D','1C','2A','2D','1F','1G','2E',null,'1B'] },
  8:  { previas: [],
        slots: ['1A','2H','2F','2G','1E','2C','2B','1D','1C','2A','2D','1F','1G','2E','1H','1B'] },
  9:  { previas: [{ p1:'2B', p2:'2C' }, { p1:'2D', p2:'2A' }],
        slots: ['1A','pi0','1I','1H','1E','2G','2F','1D','1C','2E','2H','1F','1G','2I','pi1','1B'] },
  10: { previas: [{ p1:'2C', p2:'2F' }, { p1:'2G', p2:'2B' }, { p1:'2A', p2:'2H' }, { p1:'2E', p2:'2D' }],
        slots: ['1A','pi0','1I','1H','1E','2J','pi1','1D','1C','pi2','1G','1F','pi3','1B','2I','2J'] },
}

const _resolveZoneCode = (code, grupos) => {
  if (!code || code.startsWith('pi')) return null
  const pos     = parseInt(code[0]) - 1
  const zonaIdx = code.charCodeAt(1) - 65
  return grupos[zonaIdx]?.clasificados?.[pos] ?? null
}

const _nuevoPartido = (id, p1, p2, nextMatchId, nextSlot) => ({
  id, pareja1: p1, pareja2: p2,
  ganador: null, estado: 'pendiente',
  fecha: null, hora: null, cancha: null, resultado: null,
  nextMatchId: nextMatchId ?? null, nextSlot: nextSlot ?? null,
})

export const generateAPAEliminationBracket = (grupos) => {
  const nZonas = grupos.length
  const draw   = APA_DRAWS[nZonas]
  if (!draw) throw new Error(`No existe draw APA para ${nZonas} zonas (máximo: 10).`)

  const { previas, slots } = draw
  const size        = slots.length
  const numMain     = Math.log2(size)
  const rondas      = []
  const rondaOffset = previas.length > 0 ? 1 : 0

  // Ronda previa (play-ins)
  if (previas.length > 0) {
    const partidos = previas.map((pr, idx) =>
      _nuevoPartido(`pi_m${idx}`, _resolveZoneCode(pr.p1, grupos), _resolveZoneCode(pr.p2, grupos), null, null)
    )
    rondas.push({ numero: 1, nombre: 'Ronda Previa', partidos })
  }

  // Rondas principales
  for (let r = 0; r < numMain; r++) {
    const matchCount = size / Math.pow(2, r + 1)
    const nombre     = ROUND_NAMES[matchCount] ?? `Ronda ${r + 1}`
    const rondaNum   = r + 1 + rondaOffset
    const nextRonda  = r < numMain - 1 ? rondaNum + 1 : null

    const partidos = Array.from({ length: matchCount }, (_, i) => {
      let p1 = null, p2 = null
      if (r === 0) {
        const s1 = slots[i * 2], s2 = slots[i * 2 + 1]
        p1 = (s1 && !s1.startsWith('pi')) ? _resolveZoneCode(s1, grupos) : null
        p2 = (s2 && !s2.startsWith('pi')) ? _resolveZoneCode(s2, grupos) : null
      }
      return _nuevoPartido(`r${rondaNum}_m${i}`, p1, p2, nextRonda ? `r${nextRonda}_m${Math.floor(i / 2)}` : null, i % 2)
    })

    rondas.push({ numero: rondaNum, nombre, partidos })
  }

  // Linkear previas → primera ronda principal
  if (previas.length > 0) {
    const firstMain = rondas[1]
    previas.forEach((_, idx) => {
      const piCode  = `pi${idx}`
      const slotIdx = slots.findIndex((s) => s === piCode)
      if (slotIdx === -1) return
      rondas[0].partidos[idx].nextMatchId = firstMain.partidos[Math.floor(slotIdx / 2)].id
      rondas[0].partidos[idx].nextSlot    = slotIdx % 2
    })
  }

  // Auto-resolver BYEs en primera ronda principal
  const firstMain = rondas[rondaOffset]
  for (const partido of firstMain.partidos) {
    if (partido.pareja1 === null && partido.pareja2 !== null) {
      partido.ganador = partido.pareja2; partido.estado = 'finalizado'
      _propagarGanador(rondas, partido)
    } else if (partido.pareja2 === null && partido.pareja1 !== null) {
      partido.ganador = partido.pareja1; partido.estado = 'finalizado'
      _propagarGanador(rondas, partido)
    }
  }

  return { rondas }
}

// Uso interno: propaga el ganador de un partido al slot del siguiente.
const _propagarGanador = (rondas, partido) => {
  if (!partido.nextMatchId || !partido.ganador) return
  for (const ronda of rondas) {
    const siguiente = ronda.partidos.find((p) => p.id === partido.nextMatchId)
    if (siguiente) {
      if (partido.nextSlot === 0) siguiente.pareja1 = partido.ganador
      else siguiente.pareja2 = partido.ganador
      break
    }
  }
}

/**
 * generateEliminationBracket(parejas)
 *
 * Genera un bracket de eliminación directa a partir de un array de parejas.
 * - Rellena con BYEs (null) hasta la próxima potencia de 2.
 * - Resuelve automáticamente los partidos con BYE en ronda 1.
 * - Vincula cada partido via nextMatchId + nextSlot para propagar ganadores.
 *
 * @param {Array} parejas — Array de objetos Pareja { id, jugador1, jugador2, ... }
 * @returns {{ rondas: Array }}
 */
export const generateEliminationBracket = (parejas) => {
  if (!parejas || parejas.length < 2) {
    throw new Error('Se necesitan al menos 2 parejas para generar un bracket')
  }

  const size = nextPow2(parejas.length)
  const numRondas = Math.log2(size)

  // Rellenar con BYEs hasta potencia de 2
  const slots = [...parejas]
  while (slots.length < size) slots.push(null)

  // Construir estructura de rondas con links ya definidos
  const rondas = []
  for (let r = 0; r < numRondas; r++) {
    const matchesEnRonda = size / Math.pow(2, r + 1)
    const nombre = ROUND_NAMES[matchesEnRonda] ?? `Ronda ${r + 1}`
    const partidos = Array.from({ length: matchesEnRonda }, (_, i) => ({
      id: `r${r + 1}_m${i}`,
      pareja1: null,
      pareja2: null,
      ganador: null,
      estado: 'pendiente',
      nextMatchId: r < numRondas - 1 ? `r${r + 2}_m${Math.floor(i / 2)}` : null,
      nextSlot: i % 2,  // 0 → pareja1 del siguiente | 1 → pareja2 del siguiente
      reservationId: null,
    }))
    rondas.push({ numero: r + 1, nombre, partidos })
  }

  // Poblar ronda 1 con los slots
  for (let i = 0; i < size / 2; i++) {
    rondas[0].partidos[i].pareja1 = slots[i * 2]
    rondas[0].partidos[i].pareja2 = slots[i * 2 + 1]
  }

  // Auto-resolver BYEs en ronda 1
  for (const partido of rondas[0].partidos) {
    if (partido.pareja1 === null && partido.pareja2 !== null) {
      partido.ganador = partido.pareja2
      partido.estado = 'finalizado'
      _propagarGanador(rondas, partido)
    } else if (partido.pareja2 === null && partido.pareja1 !== null) {
      partido.ganador = partido.pareja1
      partido.estado = 'finalizado'
      _propagarGanador(rondas, partido)
    }
  }

  return { rondas }
}

/**
 * advanceWinner(bracket, matchId, ganador)
 *
 * Registra el ganador de un partido y lo propaga al siguiente.
 * Inmutable — retorna un nuevo bracket sin modificar el original.
 *
 * @param {Object} bracket — bracket actual { rondas }
 * @param {string} matchId — ID del partido (ej: 'r1_m0')
 * @param {Object} ganador — objeto Pareja ganadora
 * @returns {Object} nuevo bracket
 */
export const advanceWinner = (bracket, matchId, { resultado, fecha = undefined, hora = undefined, cancha = undefined }) => {
  const newBracket = JSON.parse(JSON.stringify(bracket))

  let partidoActual = null
  for (const ronda of newBracket.rondas) {
    const p = ronda.partidos.find((p) => p.id === matchId)
    if (p) { partidoActual = p; break }
  }

  if (!partidoActual) return newBracket

  const ganador = calcularGanadorDesdeResultado(resultado, partidoActual.pareja1, partidoActual.pareja2)
  if (!ganador) return newBracket

  partidoActual.ganador   = ganador
  partidoActual.estado    = 'finalizado'
  partidoActual.resultado = resultado ?? null
  if (fecha   !== undefined) partidoActual.fecha   = fecha
  if (hora    !== undefined) partidoActual.hora    = hora
  if (cancha  !== undefined) partidoActual.cancha  = cancha
  _propagarGanador(newBracket.rondas, partidoActual)

  return newBracket
}

/**
 * isBracketFinished(bracket)
 * Retorna true si todos los partidos están finalizados.
 */
export const isBracketFinished = (bracket) => {
  if (!bracket?.rondas) return false
  return bracket.rondas.every((r) => r.partidos.every((p) => p.estado === 'finalizado'))
}

/**
 * getBracketWinner(bracket)
 * Retorna la pareja ganadora de la final, o null si no terminó.
 */
export const getBracketWinner = (bracket) => {
  if (!bracket?.rondas?.length) return null
  const final = bracket.rondas[bracket.rondas.length - 1]
  if (!final?.partidos?.length) return null
  return final.partidos[0].ganador ?? null
}

// ── FASE DE GRUPOS ─────────────────────────────────────────────────────────────

/**
 * calcularDistribucionZonas(totalParejas)
 *
 * Retorna un array con el tamaño de cada zona según el algoritmo de resto:
 *   resto 0 → todas de 3
 *   resto 1 → una zona de 4, el resto de 3
 *   resto 2 → una zona de 2, el resto de 3
 *
 * @param {number} totalParejas
 * @returns {number[]}  ej: 10 → [3, 3, 4] | 8 → [3, 3, 2] | 9 → [3, 3, 3]
 */
export const calcularDistribucionZonas = (totalParejas) => {
  if (totalParejas < 2) throw new Error('Se necesitan al menos 2 parejas para armar grupos')
  const resto = totalParejas % 3
  const zonas = []

  if (resto === 0) {
    for (let i = 0; i < totalParejas / 3; i++) zonas.push(3)
  } else if (resto === 1) {
    const numTres = (totalParejas - 4) / 3
    for (let i = 0; i < numTres; i++) zonas.push(3)
    zonas.push(4)
  } else {
    // resto === 2
    const numTres = (totalParejas - 2) / 3
    if (numTres + 1 > 10) {
      // 32 parejas: 10z×3 + 1z×2 daría 11 zonas (fuera del APA).
      // Se convierte a 8z×3 + 2z×4 = 10 zonas → compatible con APA_DRAWS[10].
      for (let i = 0; i < numTres - 2; i++) zonas.push(3)
      zonas.push(4)
      zonas.push(4)
    } else {
      for (let i = 0; i < numTres; i++) zonas.push(3)
      zonas.push(2)
    }
  }

  return zonas
}

// ── Generadores internos por tamaño de zona ────────────────────────────────────

const _p = (extra = {}) => ({ ganador: null, estado: 'pendiente', cancha: null, slot: null, sinHorario: false, reservationId: null, ...extra })

const _partidosZona2 = (parejas, px) => [
  _p({ id: `${px}_m0`, tipo: 'unico', pareja1: parejas[0], pareja2: parejas[1] }),
]

const _partidosZona3 = (parejas, px) => [
  _p({ id: `${px}_m0`, tipo: 'rr', pareja1: parejas[0], pareja2: parejas[1] }),
  _p({ id: `${px}_m1`, tipo: 'rr', pareja1: parejas[0], pareja2: parejas[2] }),
  _p({ id: `${px}_m2`, tipo: 'rr', pareja1: parejas[1], pareja2: parejas[2] }),
]

// Zona de 4: mini-bracket  P1vsP3, P2vsP4 → final ganadores (1°) + final perdedores (2°)
const _partidosZona4 = (parejas, px) => [
  _p({ id: `${px}_r1_0`, tipo: 'r1', pareja1: parejas[0], pareja2: parejas[2], nextWinMatchId: `${px}_wf`, nextWinSlot: 0, nextLoseMatchId: `${px}_lf`, nextLoseSlot: 0 }),
  _p({ id: `${px}_r1_1`, tipo: 'r1', pareja1: parejas[1], pareja2: parejas[3], nextWinMatchId: `${px}_wf`, nextWinSlot: 1, nextLoseMatchId: `${px}_lf`, nextLoseSlot: 1 }),
  _p({ id: `${px}_wf`,   tipo: 'wf', pareja1: null, pareja2: null }),
  _p({ id: `${px}_lf`,   tipo: 'lf', pareja1: null, pareja2: null }),
]

// ── Helpers internos de avance ─────────────────────────────────────────────────

const _propagarZona4 = (zona, partido) => {
  const loser = partido.pareja1?.id === partido.ganador?.id ? partido.pareja2 : partido.pareja1
  if (partido.nextWinMatchId) {
    const wm = zona.partidos.find((p) => p.id === partido.nextWinMatchId)
    if (wm) wm[partido.nextWinSlot === 0 ? 'pareja1' : 'pareja2'] = partido.ganador
  }
  if (partido.nextLoseMatchId && loser) {
    const lm = zona.partidos.find((p) => p.id === partido.nextLoseMatchId)
    if (lm) lm[partido.nextLoseSlot === 0 ? 'pareja1' : 'pareja2'] = loser
  }
}

const _recalcularClasificadosRR = (zona) => {
  if (!zona.partidos.every((p) => p.estado === 'finalizado')) return
  const wins = {}
  zona.parejas.forEach((p) => { wins[p.id] = 0 })
  zona.partidos.forEach((p) => { if (p.ganador) wins[p.ganador.id] = (wins[p.ganador.id] || 0) + 1 })
  const sorted = [...zona.parejas].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0))
  const w2 = wins[sorted[1]?.id] || 0
  const w3 = wins[sorted[2]?.id] || 0
  if (w2 > w3) {
    zona.clasificados = [sorted[0], sorted[1]]
  } else {
    // Empate en el 2do puesto — el admin resuelve manualmente
    zona.necesitaDesempate = true
  }
}

// ── Swap de parejas entre zonas (preserva slots de zonas no afectadas) ────────

const _regenerarPartidosZona = (zona, px) => {
  const cap = zona.capacidad
  if (cap === 2) return _partidosZona2(zona.parejas, px)
  if (cap === 3) return _partidosZona3(zona.parejas, px)
  return _partidosZona4(zona.parejas, px)
}

export const swapParejas = (grupos, zonaIdxA, parejaIdxA, zonaIdxB, parejaIdxB) => {
  const newGrupos = JSON.parse(JSON.stringify(grupos))

  // Intercambiar las dos parejas
  const pA = newGrupos[zonaIdxA].parejas[parejaIdxA]
  const pB = newGrupos[zonaIdxB].parejas[parejaIdxB]
  newGrupos[zonaIdxA].parejas[parejaIdxA] = pB
  newGrupos[zonaIdxB].parejas[parejaIdxB] = pA

  // Regenerar partidos SOLO en las dos zonas afectadas — el resto queda intacto
  const pxA = newGrupos[zonaIdxA].partidos[0]?.id?.split('_')[0] ?? `z${zonaIdxA}`
  const pxB = newGrupos[zonaIdxB].partidos[0]?.id?.split('_')[0] ?? `z${zonaIdxB}`
  newGrupos[zonaIdxA].partidos        = _regenerarPartidosZona(newGrupos[zonaIdxA], pxA)
  newGrupos[zonaIdxA].clasificados    = null
  newGrupos[zonaIdxA].necesitaDesempate = false
  newGrupos[zonaIdxB].partidos        = _regenerarPartidosZona(newGrupos[zonaIdxB], pxB)
  newGrupos[zonaIdxB].clasificados    = null
  newGrupos[zonaIdxB].necesitaDesempate = false

  return newGrupos
}

// ── Distribución por afinidad de disponibilidad ───────────────────────────────

// Cuenta días en común entre dos parejas
const _diasEnComun = (p1, p2) => {
  const dias1 = new Set((p1.disponibilidad ?? []).map((s) => s.dia))
  const dias2 = new Set((p2.disponibilidad ?? []).map((s) => s.dia))
  let count = 0
  for (const d of dias1) if (dias2.has(d)) count++
  return count
}

// Cuenta cuántos días distintos existen en los solapamientos de todos los pares de una zona.
const _dayDiversity = (parejas) => {
  const allDays = new Set()
  for (let i = 0; i < parejas.length; i++) {
    const dias1 = new Set((parejas[i].disponibilidad ?? []).map((s) => s.dia))
    for (let j = i + 1; j < parejas.length; j++) {
      const dias2 = new Set((parejas[j].disponibilidad ?? []).map((s) => s.dia))
      for (const d of dias1) if (dias2.has(d)) allDays.add(d)
    }
  }
  return allDays.size
}

// Simula cuántos partidos de la zona se pueden asignar a días distintos por pareja (constraint 1/día).
// Greedy: cada partido va al primer día libre para ambas parejas.
// Resultado más alto = zona más compatible con jugar 1 partido por día.
const _estimarDistribucion1xDia = (parejas) => {
  const matches = []
  for (let i = 0; i < parejas.length; i++) {
    for (let j = i + 1; j < parejas.length; j++) {
      const dias = (parejas[i].disponibilidad ?? [])
        .filter((s) => (parejas[j].disponibilidad ?? []).some((s2) => s2.dia === s.dia))
        .map((s) => s.dia)
      matches.push({ p1: i, p2: j, dias })
    }
  }
  const usados = parejas.map(() => new Set())
  let ok = 0
  for (const { p1, p2, dias } of matches) {
    const diaLibre = dias.find((d) => !usados[p1].has(d) && !usados[p2].has(d))
    if (diaLibre) {
      usados[p1].add(diaLibre)
      usados[p2].add(diaLibre)
      ok++
    }
  }
  return ok
}

// Constraint-first: las parejas con menos días disponibles siembran su zona.
// Así las más restringidas atraen a quienes comparten esos días,
// maximizando la probabilidad de overlap en cada zona.
// Dentro del mismo nivel de restricción, orden aleatorio para variedad entre Regenerar.
const _distribuirPorAfinidad = (parejas, distribucion) => {
  const numZonas = distribucion.length

  // Ordenar por cantidad de días disponibles ASC; tiebreak aleatorio para variedad
  const sorted = [...parejas].sort((a, b) => {
    const dA = a.disponibilidad?.length ?? 0
    const dB = b.disponibilidad?.length ?? 0
    return dA !== dB ? dA - dB : Math.random() - 0.5
  })

  // Una semilla por zona (las más restringidas primero)
  const seeds     = sorted.slice(0, numZonas)
  const unassigned = sorted.slice(numZonas)

  return distribucion.map((tamano, idx) => {
    if (idx >= seeds.length) return []
    const zona = [seeds[idx]]

    while (zona.length < tamano && unassigned.length > 0) {
      let bestIdx = 0
      let bestScore = -1
      for (let i = 0; i < unassigned.length; i++) {
        const candidate  = [...zona, unassigned[i]]
        const overlap    = zona.reduce((sum, z) => sum + _diasEnComun(unassigned[i], z), 0)
        const diversity  = _dayDiversity(candidate)
        const onexdia    = _estimarDistribucion1xDia(candidate)
        // Score combinado: overlap = base, diversity = variedad, onexdia = 1-partido-por-día
        const score = overlap + diversity + onexdia * 2
        if (score > bestScore) { bestScore = score; bestIdx = i }
      }
      zona.push(unassigned.splice(bestIdx, 1)[0])
    }

    return zona
  })
}

// ── API pública ────────────────────────────────────────────────────────────────

// Genera zonas para un grupo de parejas de la misma categoría.
// catIdx se usa para hacer únicos los IDs de partidos entre categorías.
const _generateZonasParaCategoria = (parejas, categoria, catIdx) => {
  const distribucion = calcularDistribucionZonas(parejas.length)
  const zonasDistribuidas = _distribuirPorAfinidad(parejas, distribucion)
  const zonas = []

  distribucion.forEach((capacidad, idx) => {
    const letra = String.fromCharCode(65 + idx)          // A, B, C…
    const px    = `c${catIdx}z${letra.toLowerCase()}`    // c0zA, c1zA… — evita colisiones entre categorías
    const slice = zonasDistribuidas[idx] ?? []

    const partidos =
      capacidad === 2 ? _partidosZona2(slice, px) :
      capacidad === 3 ? _partidosZona3(slice, px) :
                        _partidosZona4(slice, px)

    zonas.push({
      nombre:          `Zona ${letra}`,
      categoria:       categoria ?? null,
      capacidad,
      parejas:         slice,
      partidos,
      clasificados:    null,
      necesitaDesempate: false,
    })
  })

  return zonas
}

/**
 * generateGroupPhase(parejas)
 *
 * Genera la fase de grupos completa.
 * Si las parejas tienen distintas categorías, genera zonas independientes por categoría
 * (las parejas de 4ta solo juegan entre sí, ídem 6ta, etc.).
 * Los IDs de partidos son únicos globalmente para evitar colisiones.
 *
 * @param {Array} parejas
 * @returns {GrupoZona[]}
 */
export const generateGroupPhase = (parejas) => {
  if (!parejas || parejas.length < 2) throw new Error('Se necesitan al menos 2 parejas')

  const categorias = [...new Set(parejas.map((p) => p.categoria).filter(Boolean))]

  if (categorias.length <= 1) {
    // Una sola categoría (o sin categoría) → comportamiento original
    return _generateZonasParaCategoria(parejas, categorias[0] ?? null, 0)
  }

  // Múltiples categorías → zonas independientes por categoría
  const grupos = []
  categorias.forEach((cat, catIdx) => {
    const parejasCat = parejas.filter((p) => p.categoria === cat)
    if (parejasCat.length < 2) return  // necesita al menos 2 para armar zona
    grupos.push(..._generateZonasParaCategoria(parejasCat, cat, catIdx))
  })

  if (grupos.length === 0) throw new Error('Ninguna categoría tiene suficientes parejas para armar grupos')
  return grupos
}

/**
 * advanceGroupMatch(grupos, matchId, ganador)
 *
 * Registra el ganador de un partido de grupo y actualiza la zona según su tipo:
 *   'unico' (zona 2) → clasifica ambas parejas directamente
 *   'rr'    (zona 3) → recalcula standings; clasifica si hay top-2 claro
 *   'r1'    (zona 4) → propaga al wf y lf
 *   'wf'    (zona 4) → ganador = 1° de la zona
 *   'lf'    (zona 4) → ganador = 2° de la zona
 *
 * Inmutable — retorna nuevos grupos sin modificar el original.
 *
 * @param {GrupoZona[]} grupos
 * @param {string}      matchId
 * @param {Object}      ganador — objeto Pareja ganadora
 * @returns {GrupoZona[]}
 */
export const advanceGroupMatch = (grupos, matchId, ganador) => {
  const newGrupos = JSON.parse(JSON.stringify(grupos))

  for (const zona of newGrupos) {
    const partido = zona.partidos.find((p) => p.id === matchId)
    if (!partido) continue

    partido.ganador = ganador
    partido.estado  = 'finalizado'

    if (zona.capacidad === 2) {
      const loser = partido.pareja1.id === ganador.id ? partido.pareja2 : partido.pareja1
      zona.clasificados = [ganador, loser]

    } else if (zona.capacidad === 3) {
      _recalcularClasificadosRR(zona)

    } else {
      // zona de 4
      if (partido.tipo === 'r1') {
        _propagarZona4(zona, partido)
      } else if (partido.tipo === 'wf') {
        // winner final: ganador es 1°, pero esperamos lf para cerrar la zona
        const lf = zona.partidos.find((p) => p.tipo === 'lf')
        if (lf?.ganador) zona.clasificados = [ganador, lf.ganador]
      } else if (partido.tipo === 'lf') {
        // loser final: ganador es 2°
        const wf = zona.partidos.find((p) => p.tipo === 'wf')
        if (wf?.ganador) zona.clasificados = [wf.ganador, ganador]
      }
    }

    break
  }

  return newGrupos
}

/**
 * resolveGroupTie(grupos, zonaIdx, primero, segundo)
 *
 * Resuelve manualmente un empate en zona de 3.
 * El admin elige cuál pareja es 1° y cuál 2°.
 *
 * @param {GrupoZona[]} grupos
 * @param {number}      zonaIdx — índice de la zona con empate
 * @param {Object}      primero — pareja que clasifica en 1°
 * @param {Object}      segundo — pareja que clasifica en 2°
 * @returns {GrupoZona[]}
 */
export const resolveGroupTie = (grupos, zonaIdx, primero, segundo) => {
  const newGrupos = JSON.parse(JSON.stringify(grupos))
  const zona = newGrupos[zonaIdx]
  if (!zona) return newGrupos
  zona.clasificados      = [primero, segundo]
  zona.necesitaDesempate = false
  return newGrupos
}

/**
 * isGroupPhaseFinished(grupos)
 * Retorna true si todas las zonas tienen clasificados y ninguna espera desempate.
 */
export const isGroupPhaseFinished = (grupos) => {
  if (!grupos?.length) return false
  return grupos.every((z) => z.clasificados !== null && !z.necesitaDesempate)
}

/**
 * getAllClasificados(grupos)
 * Retorna el array plano de parejas clasificadas (1° y 2° de cada zona, en orden).
 * Retorna null si la fase de grupos no está terminada.
 */
export const getAllClasificados = (grupos) => {
  if (!isGroupPhaseFinished(grupos)) return null
  return grupos.flatMap((z) => z.clasificados)
}

// ── Auto-scheduling fase de grupos ────────────────────────────────────────────

/**
 * autoScheduleGroups(grupos, canchas)
 *
 * Asigna automáticamente cancha y hora exacta a cada partido.
 * Para cada día donde ambas parejas tienen disponibilidad, la hora mínima
 * es max(p1.horaDesde, p2.horaDesde). Prueba hora a hora hasta las 23:00.
 *
 * slot resultado: { dia, hora }  (hora = 'HH:MM')
 *
 * Inmutable — retorna nuevos grupos sin modificar el original.
 */
export const autoScheduleGroups = (grupos, canchas, intervaloMin = 75, diaInicioElim = null, horaInicioElim = null, diasTorneo = []) => {
  const newGrupos = JSON.parse(JSON.stringify(grupos))
  const activas   = canchas.filter((c) => c.activa)

  // canchaSchedule: canchaId → [{dia, startMin}] — rastrea rangos ocupados por cancha
  // parejaSchedule: parejaId → [{dia, startMin}] — rastrea cuándo está jugando cada pareja
  const canchaSchedule  = new Map()
  const parejaSchedule  = new Map()
  const parejaFirstDay  = new Map()
  const parejaDias      = new Map()
  const timeToMin       = (t) => { const [h, m = 0] = (t ?? '08:00').split(':').map(Number); return h * 60 + m }
  const minToTime       = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  // Pre-poblar con partidos que ya tienen slot asignado — evita colisiones al completar parcialmente
  for (const zona of newGrupos) {
    for (const p of zona.partidos) {
      if (!p.slot || !p.cancha) continue
      const startMin = timeToMin(p.slot.hora)
      const { dia }  = p.slot
      if (!canchaSchedule.has(p.cancha)) canchaSchedule.set(p.cancha, [])
      canchaSchedule.get(p.cancha).push({ dia, startMin })
      for (const pareja of [p.pareja1, p.pareja2]) {
        if (!pareja?.id) continue
        if (!parejaSchedule.has(pareja.id)) parejaSchedule.set(pareja.id, [])
        parejaSchedule.get(pareja.id).push({ dia, startMin })
        if (!parejaDias.has(pareja.id)) parejaDias.set(pareja.id, new Set())
        parejaDias.get(pareja.id).add(dia)
      }
    }
  }

  const canchaLibre = (canchaId, dia, startMin) => {
    const ocupaciones = canchaSchedule.get(canchaId) ?? []
    return !ocupaciones.some((o) => o.dia === dia && Math.abs(o.startMin - startMin) < intervaloMin)
  }

  // Una pareja está ocupada si ya tiene partido en ese día dentro del intervalo
  const parejaLibre = (parejaId, dia, startMin) => {
    const ocupaciones = parejaSchedule.get(parejaId) ?? []
    return !ocupaciones.some((o) => o.dia === dia && Math.abs(o.startMin - startMin) < intervaloMin)
  }

  const reservarCancha = (canchaId, dia, startMin) => {
    if (!canchaSchedule.has(canchaId)) canchaSchedule.set(canchaId, [])
    canchaSchedule.get(canchaId).push({ dia, startMin })
  }

  const reservarPareja = (parejaId, dia, startMin) => {
    if (!parejaSchedule.has(parejaId)) parejaSchedule.set(parejaId, [])
    parejaSchedule.get(parejaId).push({ dia, startMin })
  }

  const SLOT_STEP = 15  // granularidad de búsqueda en minutos

  const tryAssign = (partido, diasCandidatos, p1, p2, p1Slots, p2Slots) => {
    for (const dia of diasCandidatos) {
      const m1 = timeToMin(p1Slots.find((s) => s.dia === dia)?.horaDesde)
      const m2 = timeToMin(p2Slots.find((s) => s.dia === dia)?.horaDesde)
      const inicioMin = Math.max(m1, m2)
      for (let m = inicioMin; m <= 23 * 60 - intervaloMin; m += SLOT_STEP) {
        // Respetar corte de fase eliminatoria: no asignar slots reservados para eliminatoria
        if (!esSlotDeGrupos(dia, minToTime(m), diaInicioElim, horaInicioElim)) continue
        // Cancha libre Y ambas parejas libres a esa hora — evita que una pareja juegue dos partidos al mismo tiempo
        const libre = activas.find((c) =>
          canchaLibre(c.id, dia, m) && parejaLibre(p1.id, dia, m) && parejaLibre(p2.id, dia, m)
        )
        if (libre) {
          partido.slot       = { dia, hora: minToTime(m) }
          partido.cancha     = libre.id
          partido.sinHorario = false
          reservarCancha(libre.id, dia, m)
          reservarPareja(p1.id, dia, m)
          reservarPareja(p2.id, dia, m)
          if (!parejaDias.has(p1.id)) parejaDias.set(p1.id, new Set())
          if (!parejaDias.has(p2.id)) parejaDias.set(p2.id, new Set())
          parejaDias.get(p1.id).add(dia)
          parejaDias.get(p2.id).add(dia)
          if (p1?.prefiereMismoDia && !parejaFirstDay.has(p1.id)) parejaFirstDay.set(p1.id, dia)
          if (p2?.prefiereMismoDia && !parejaFirstDay.has(p2.id)) parejaFirstDay.set(p2.id, dia)
          return true
        }
      }
    }
    return false
  }

  for (const zona of newGrupos) {
    for (const partido of zona.partidos) {
      if (partido.slot) continue

      const p1      = partido.pareja1
      const p2      = partido.pareja2
      const p1Slots = p1?.disponibilidad ?? []
      const p2Slots = p2?.disponibilidad ?? []

      const diasEnComun = [...new Set(
        p1Slots.filter((s1) => p2Slots.some((s2) => s2.dia === s1.dia)).map((s1) => s1.dia)
      )]

      // prefiereMismoDia: ese día va primero
      const prefDias = new Set(
        [p1, p2]
          .filter((p) => p?.prefiereMismoDia && parejaFirstDay.has(p.id))
          .map((p) => parejaFirstDay.get(p.id))
          .filter((d) => diasEnComun.includes(d))
      )

      // Días donde ninguna pareja ya tiene partido (constraint 1-por-día)
      const diasLibres = diasEnComun.filter((d) => {
        const p1YaJuega = !p1?.prefiereMismoDia && parejaDias.get(p1?.id)?.has(d)
        const p2YaJuega = !p2?.prefiereMismoDia && parejaDias.get(p2?.id)?.has(d)
        return !p1YaJuega && !p2YaJuega
      })

      // Orden: prefDias primero, luego días libres, fallback al resto si no hay opción
      const diasOrdenados = [
        ...diasEnComun.filter((d) => prefDias.has(d)),
        ...diasLibres.filter((d) => !prefDias.has(d)),
      ]
      const diasFallback = diasEnComun.filter((d) => !diasOrdenados.includes(d))

      // Disponibilidad implícita: días del torneo donde al menos una pareja tiene confirmado
      // pero la otra no — se usa solo si ambas parejas cargaron al menos 1 día (no son "sin datos")
      // La pareja sin slot ese día recibe horaDesde='08:00' por defecto
      const diasImplicitos = diasTorneo.length > 0 && p1Slots.length > 0 && p2Slots.length > 0
        ? diasTorneo
            .filter((d) =>
              !diasEnComun.includes(d) &&
              esSlotDeGrupos(d, '00:00', diaInicioElim, horaInicioElim) &&
              (p1Slots.some((s) => s.dia === d) || p2Slots.some((s) => s.dia === d))
            )
            .sort((a, b) => {
              const aYaViene = parejaDias.get(p1?.id)?.has(a) || parejaDias.get(p2?.id)?.has(a) ? 0 : 1
              const bYaViene = parejaDias.get(p1?.id)?.has(b) || parejaDias.get(p2?.id)?.has(b) ? 0 : 1
              return aYaViene - bYaViene
            })
        : []

      const assigned = tryAssign(partido, diasOrdenados,  p1, p2, p1Slots, p2Slots)
                    || tryAssign(partido, diasFallback,   p1, p2, p1Slots, p2Slots)
                    || tryAssign(partido, diasImplicitos, p1, p2, p1Slots, p2Slots)

      if (!assigned) partido.sinHorario = true
    }
  }

  return newGrupos
}

// ── Scheduling: regla día/hora de inicio eliminatoria ─────────────────────────
//
// diaInicioEliminatoria:  nombre del día (ej. 'Sábado') — primer día de eliminatoria.
// horaInicioEliminatoria: 'HH:MM' (ej. '17:00') — hora de corte dentro de ese día.
//   - Días anteriores al día de corte → grupos completos (todas las franjas).
//   - El día de corte → grupos solo antes de horaInicioEliminatoria.
//   - Días posteriores al día de corte → eliminatoria (sin grupos).
//   - null en ambos → sin restricción.

const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/**
 * esSlotDeGrupos(dia, hora, diaInicioEliminatoria, horaInicioEliminatoria)
 * Retorna true si el slot {dia, hora} pertenece al bloque de fase de grupos.
 * hora = 'HH:MM' (horaDesde del jugador)
 */
export const esSlotDeGrupos = (dia, hora, diaInicioEliminatoria, horaInicioEliminatoria) => {
  if (!diaInicioEliminatoria) return true

  const idxDia  = DIAS_ORDEN.indexOf(dia)
  const idxElim = DIAS_ORDEN.indexOf(diaInicioEliminatoria)

  if (idxDia < idxElim) return true
  if (idxDia > idxElim) return false

  if (!horaInicioEliminatoria) return false
  const corte = parseInt(horaInicioEliminatoria.split(':')[0])
  return parseInt(hora.split(':')[0]) < corte
}

/**
 * esSlotDeEliminatoria(dia, hora, diaInicioEliminatoria, horaInicioEliminatoria)
 * Retorna true si el slot {dia, hora} pertenece al bloque de eliminatoria.
 */
export const esSlotDeEliminatoria = (dia, hora, diaInicioEliminatoria, horaInicioEliminatoria) => {
  if (!diaInicioEliminatoria) return true

  const idxDia  = DIAS_ORDEN.indexOf(dia)
  const idxElim = DIAS_ORDEN.indexOf(diaInicioEliminatoria)

  if (idxDia > idxElim) return true
  if (idxDia < idxElim) return false

  if (!horaInicioEliminatoria) return true
  const corte = parseInt(horaInicioEliminatoria.split(':')[0])
  return parseInt(hora.split(':')[0]) >= corte
}

/**
 * calcularGanadorDesdeResultado(resultado, pareja1, pareja2)
 *
 * Determina el ganador del partido según los sets jugados (mejor de 3).
 * Retorna la pareja ganadora o null si el resultado está incompleto.
 */
export const calcularGanadorDesdeResultado = (resultado, pareja1, pareja2) => {
  if (!resultado?.length || !pareja1 || !pareja2) return null
  let w1 = 0, w2 = 0
  for (const s of resultado) {
    if (s.p1 > s.p2) w1++
    else if (s.p2 > s.p1) w2++
  }
  if (w1 >= 2) return pareja1
  if (w2 >= 2) return pareja2
  return null
}
