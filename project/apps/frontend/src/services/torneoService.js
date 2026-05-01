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

// ── API pública ────────────────────────────────────────────────────────────────

// Genera zonas para un grupo de parejas de la misma categoría.
// catIdx se usa para hacer únicos los IDs de partidos entre categorías.
const _generateZonasParaCategoria = (parejas, categoria, catIdx) => {
  const distribucion = calcularDistribucionZonas(parejas.length)
  const zonas = []
  let cursor = 0

  distribucion.forEach((capacidad, idx) => {
    const letra = String.fromCharCode(65 + idx)          // A, B, C…
    const px    = `c${catIdx}z${letra.toLowerCase()}`    // c0zA, c1zA… — evita colisiones entre categorías
    const slice = parejas.slice(cursor, cursor + capacidad)
    cursor += capacidad

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
export const autoScheduleGroups = (grupos, canchas) => {
  const newGrupos = JSON.parse(JSON.stringify(grupos))
  const activas   = canchas.filter((c) => c.activa)

  const slotCanchas = new Map()
  const slotKey     = (dia, hora) => `${dia}||${hora}`

  for (const zona of newGrupos) {
    for (const partido of zona.partidos) {
      if (partido.slot) continue

      const p1Slots = partido.pareja1?.disponibilidad ?? []
      const p2Slots = partido.pareja2?.disponibilidad ?? []

      // Días donde ambas parejas tienen disponibilidad
      const diasEnComun = [...new Set(
        p1Slots
          .filter((s1) => p2Slots.some((s2) => s2.dia === s1.dia))
          .map((s1) => s1.dia)
      )]

      let assigned = false
      for (const dia of diasEnComun) {
        const h1 = parseInt(p1Slots.find((s) => s.dia === dia).horaDesde.split(':')[0])
        const h2 = parseInt(p2Slots.find((s) => s.dia === dia).horaDesde.split(':')[0])
        const horaInicio = Math.max(h1, h2)

        for (let h = horaInicio; h <= 23; h++) {
          const hora = `${String(h).padStart(2, '0')}:00`
          const key  = slotKey(dia, hora)
          if (!slotCanchas.has(key)) slotCanchas.set(key, new Set())
          const ocupadas = slotCanchas.get(key)
          const libre = activas.find((c) => !ocupadas.has(c.id))
          if (libre) {
            partido.slot       = { dia, hora }
            partido.cancha     = libre.id
            partido.sinHorario = false
            ocupadas.add(libre.id)
            assigned = true
            break
          }
        }
        if (assigned) break
      }

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
