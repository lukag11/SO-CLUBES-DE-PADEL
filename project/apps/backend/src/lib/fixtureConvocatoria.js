// Motor de fixture para convocatorias (backend). Porteo de la lógica del motor público
// (frontend src/lib/eventos.js) + emparejado balanceado por posición (Drive/Revés/Ambas).
// AMERICANO: parejas rotan, ranking individual. SUPER 8: parejas fijas, round-robin (1 set).

// jugadores = array de nombres. Genera rondas con la mayor variedad de parejas/rivales (greedy).
function generarFixtureAmericano(jugadores, canchas, puntosLimite = 21) {
  const N = jugadores.length
  const porRonda = Math.min(canchas * 4, N - (N % 4))
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
      pool.sort((x, y) => (partner[a][x] - partner[a][y]) || (jugados[x] - jugados[y]))
      const p = pool.shift()
      pool.sort((x, y) => ((oppo[a][x] + oppo[p][x]) - (oppo[a][y] + oppo[p][y])) || (jugados[x] - jugados[y]))
      const o1 = pool.shift()
      pool.sort((x, y) => ((partner[o1][x] + oppo[a][x] + oppo[p][x]) - (partner[o1][y] + oppo[a][y] + oppo[p][y])) || (jugados[x] - jugados[y]))
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

// parejas = [{ j1, j2 }]. Round-robin: cada pareja juega contra cada otra una vez (1 set).
function generarFixtureSuper8(parejas, canchas) {
  const P = parejas.length
  const arr = parejas.map((_, i) => i)
  if (P % 2 === 1) arr.push(-1)
  const n = arr.length
  const rondas = []
  for (let r = 0; r < n - 1; r++) {
    const partidos = []
    let cancha = 1
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i], y = arr[n - 1 - i]
      if (x !== -1 && y !== -1) { partidos.push({ cancha: ((cancha - 1) % canchas) + 1, parejaA: x, parejaB: y, resultado: null }); cancha++ }
    }
    rondas.push({ numero: r + 1, partidos })
    arr.splice(1, 0, arr.pop())
  }
  return { modalidad: 'super8', parejas: parejas.map((p) => ({ ...p })), canchas, rondas }
}

// Emparejado balanceado por posición: una pareja ideal tiene un Drive + un Revés.
// Los "Ambas" (y sin dato) son comodines que tapan cualquier lado.
// jugadores = [{ nombre, posicion }]. Devuelve [{ j1, j2, p1, p2 }].
export function armarParejasBalanceadas(jugadores) {
  const drives = [], reveses = [], flex = []
  for (const j of jugadores) {
    if (j.posicion === 'Drive') drives.push(j)
    else if (j.posicion === 'Revés' || j.posicion === 'Reves') reveses.push(j)
    else flex.push(j)
  }
  const parejas = []
  while (drives.length && reveses.length) parejas.push([drives.pop(), reveses.pop()])
  const sobran = drives.length ? drives : reveses // solo uno puede tener resto
  while (sobran.length && flex.length) parejas.push([sobran.pop(), flex.pop()])
  const resto = [...drives, ...reveses, ...flex]
  while (resto.length >= 2) parejas.push([resto.pop(), resto.pop()])
  return parejas.map(([a, b]) => ({ j1: a.nombre, j2: b.nombre, p1: a.posicion || null, p2: b.posicion || null }))
}

// Genera el fixture de una convocatoria según su modalidad.
// jugadores = [{ nombre, posicion }] (los anotados 'voy').
export function generarFixtureConvocatoria(modalidad, jugadores, canchas) {
  if (modalidad === 'super8') {
    const parejas = armarParejasBalanceadas(jugadores)
    return generarFixtureSuper8(parejas, Math.max(1, canchas))
  }
  return generarFixtureAmericano(jugadores.map((j) => j.nombre), Math.max(1, canchas))
}
