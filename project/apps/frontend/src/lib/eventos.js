// Motor de eventos sociales (client-side, sin backend, sin login).
// AMERICANO: inscripción individual, las parejas ROTAN cada ronda, ranking individual.
//   Cada partido se juega a N puntos (configurable) y se gana por diferencia de 2.
// SUPER 8: parejas FIJAS, todos contra todos (round-robin), ranking por pareja.
//   Cada partido es UN set de pádel (6-0…6-4, 7-5, 7-6).

// ───────────────────────── AMERICANO ─────────────────────────
// jugadores: array de nombres. canchas: cuántas en simultáneo. puntosLimite: a cuántos puntos juega cada partido.
// Genera rondas donde cada uno juega con/contra la mayor variedad posible (heurística greedy).
export function generarFixtureAmericano(jugadores, canchas, puntosLimite = 21) {
  const N = jugadores.length
  const porRonda = Math.min(canchas * 4, N - (N % 4)) // jugadores que entran por ronda
  const partner = Array.from({ length: N }, () => new Array(N).fill(0))
  const oppo = Array.from({ length: N }, () => new Array(N).fill(0))
  const jugados = new Array(N).fill(0)
  const rondasTotales = N % 4 === 0 ? N - 1 : N
  const rondas = []

  for (let r = 0; r < rondasTotales; r++) {
    const orden = jugadores.map((_, i) => i).sort((a, b) => jugados[a] - jugados[b] || a - b)
    const pool = orden.slice(0, porRonda)
    const descansan = orden.slice(porRonda)
    const partidos = []
    let cancha = 1

    while (pool.length >= 4) {
      const a = pool.shift()
      // compañero: con quien menos jugó de pareja
      pool.sort((x, y) => (partner[a][x] - partner[a][y]) || (jugados[x] - jugados[y]))
      const p = pool.shift()
      // rival 1: el que menos enfrentó a la pareja a-p
      pool.sort((x, y) => ((oppo[a][x] + oppo[p][x]) - (oppo[a][y] + oppo[p][y])) || (jugados[x] - jugados[y]))
      const o1 = pool.shift()
      // rival 2: menos pareja con o1 y menos oposición a a-p
      pool.sort((x, y) =>
        ((partner[o1][x] + oppo[a][x] + oppo[p][x]) - (partner[o1][y] + oppo[a][y] + oppo[p][y])) || (jugados[x] - jugados[y]))
      const o2 = pool.shift()

      partner[a][p]++; partner[p][a]++; partner[o1][o2]++; partner[o2][o1]++
      for (const u of [a, p]) for (const v of [o1, o2]) { oppo[u][v]++; oppo[v][u]++ }
      for (const u of [a, p, o1, o2]) jugados[u]++

      partidos.push({ cancha: cancha++, equipoA: [a, p], equipoB: [o1, o2], resultado: null })
    }
    rondas.push({ numero: r + 1, partidos, descansan })
  }
  return { modalidad: 'americano', jugadores: [...jugadores], canchas, puntosLimite, rondas }
}

// Valida un partido de Americano: se juega a `limite` puntos y se gana por diferencia de 2.
// Devuelve { completo, valido, ganador, motivo }.
//  - completo: ambos lados tienen un número cargado.
//  - valido: el resultado es un final legal (alguien llegó al límite con dif ≥ 2, o se
//    extendió por empate cerca del límite y sacó exactamente 2 de diferencia).
export function validarPartidoAmericano(a, b, limite = 21) {
  if (a == null || b == null) return { completo: false, valido: false, ganador: null, motivo: '' }
  const hi = Math.max(a, b), lo = Math.min(a, b), dif = hi - lo
  let valido = false
  let motivo = ''
  if (hi < limite) motivo = `Tiene que llegar a ${limite}`
  else if (dif < 2) motivo = 'Falta diferencia de 2'
  else if (hi > limite && dif !== 2) motivo = `Pasado ${limite} se gana por 2`
  else valido = true
  return { completo: true, valido, ganador: valido ? (a > b ? 'a' : 'b') : null, motivo }
}

// Ranking individual: cada jugador suma los puntos que hizo su equipo en cada partido VÁLIDO.
export function rankingAmericano(fixture) {
  const limite = fixture.puntosLimite ?? 21
  const stats = fixture.jugadores.map((nombre) => ({ nombre, puntos: 0, pj: 0 }))
  for (const ronda of fixture.rondas) {
    for (const p of ronda.partidos) {
      if (!p.resultado) continue
      const { a, b } = p.resultado // a = puntos del equipoA, b = del equipoB
      if (!validarPartidoAmericano(a, b, limite).valido) continue
      for (const i of p.equipoA) { stats[i].puntos += a; stats[i].pj += 1 }
      for (const i of p.equipoB) { stats[i].puntos += b; stats[i].pj += 1 }
    }
  }
  return stats
    .map((s, i) => ({ ...s, idx: i }))
    .sort((x, y) => y.puntos - x.puntos || y.pj - x.pj)
}

// ───────────────────────── SUPER 8 ─────────────────────────
// parejas: array de { j1, j2 } (nombres). Round-robin: cada pareja juega contra cada otra una vez.
// Cada partido es UN set de pádel.
export function generarFixtureSuper8(parejas, canchas) {
  const P = parejas.length
  const arr = parejas.map((_, i) => i)
  if (P % 2 === 1) arr.push(-1) // bye si es impar
  const n = arr.length
  const rondas = []

  for (let r = 0; r < n - 1; r++) {
    const partidos = []
    let cancha = 1
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i], y = arr[n - 1 - i]
      if (x !== -1 && y !== -1) {
        partidos.push({ cancha: ((cancha - 1) % canchas) + 1, parejaA: x, parejaB: y, resultado: null })
        cancha++
      }
    }
    rondas.push({ numero: r + 1, partidos })
    // rotar dejando fijo el primero
    arr.splice(1, 0, arr.pop())
  }
  return { modalidad: 'super8', parejas: parejas.map((p) => ({ ...p })), canchas, rondas }
}

// Valida un set de pádel: 6-0…6-4 (gana con 6 y dif ≥ 2), 7-5 o 7-6 (tie-break).
// a, b = games de cada pareja. Devuelve { completo, valido, ganador, motivo }.
export function validarSetPadel(a, b) {
  if (a == null || b == null) return { completo: false, valido: false, ganador: null, motivo: '' }
  const hi = Math.max(a, b), lo = Math.min(a, b)
  const valido = (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6))
  const motivo = valido ? '' : 'Set inválido (6-0 a 6-4, 7-5 o 7-6)'
  return { completo: true, valido, ganador: valido ? (a > b ? 'a' : 'b') : null, motivo }
}

// Ranking por pareja: partidos ganados (PG) y diferencia de games. Solo cuenta sets VÁLIDOS.
export function rankingSuper8(fixture) {
  const stats = fixture.parejas.map((p) => ({
    nombre: `${p.j1} / ${p.j2}`, pg: 0, pp: 0, puntosFavor: 0, puntosContra: 0, pj: 0,
  }))
  for (const ronda of fixture.rondas) {
    for (const m of ronda.partidos) {
      if (!m.resultado) continue
      const { a, b } = m.resultado
      if (!validarSetPadel(a, b).valido) continue
      const A = stats[m.parejaA], B = stats[m.parejaB]
      A.pj++; B.pj++
      A.puntosFavor += a; A.puntosContra += b
      B.puntosFavor += b; B.puntosContra += a
      if (a > b) { A.pg++; B.pp++ } else if (b > a) { B.pg++; A.pp++ }
    }
  }
  return stats
    .map((s, i) => ({ ...s, idx: i, dif: s.puntosFavor - s.puntosContra }))
    .sort((x, y) => y.pg - x.pg || y.dif - x.dif || y.puntosFavor - x.puntosFavor)
}
