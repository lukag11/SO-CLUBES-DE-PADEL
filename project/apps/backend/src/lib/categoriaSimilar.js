// Detección de categorías duplicadas por PROXIMIDAD (no solo match exacto).
// Objetivo: si ya existe "Bebidas", que NO deje crear "bebida", "bevida", "bebid",
// "BEBIDAS", "Bebídas", etc. Evita duplicación por typo/acento/mayúscula/plural.

// Normaliza para comparar: minúsculas, sin acentos, sin espacios de sobra.
export function normalizar(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca acentos/diéresis
    .replace(/\s+/g, ' ')
}

// Colapsa singular/plural común en español: saca 's'/'es' final.
// "bebidas" -> "bebida", "comidas" -> "comida", "insumos" -> "insumo".
function raiz(norm) {
  if (norm.length > 4 && norm.endsWith('es')) return norm.slice(0, -2)
  if (norm.length > 3 && norm.endsWith('s')) return norm.slice(0, -1)
  return norm
}

// Distancia de Levenshtein (cantidad mínima de ediciones).
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[b.length]
}

// ¿Los dos nombres son "prácticamente el mismo"?
export function sonParecidas(a, b) {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (!na || !nb) return false
  if (na === nb) return true             // igual salvo mayúsc/acento/espacios
  if (raiz(na) === raiz(nb)) return true  // igual salvo singular/plural
  // Typos: tolerancia según la palabra más corta (evita falsos positivos en palabras chicas).
  const menor = Math.min(na.length, nb.length)
  const tol = menor <= 4 ? 1 : 2
  return levenshtein(na, nb) <= tol
}

// Devuelve el nombre existente que choca con `nombre`, o null si ninguno.
export function categoriaParecida(nombre, existentes = []) {
  for (const cat of existentes) {
    const otro = typeof cat === 'string' ? cat : cat?.nombre
    if (otro && sonParecidas(nombre, otro)) return otro
  }
  return null
}
