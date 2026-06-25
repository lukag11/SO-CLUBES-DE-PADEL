// Normalización defensiva de categoría de jugador (red de seguridad del matching).
// El formato canónico es "4ta Categoría" (ver frontend src/constants/categorias.js). Pero por
// si llega un formato viejo/corto desde un cliente desactualizado ("4ta", "4ª", "4°",
// "4° Categoría"), lo llevamos al canónico para que el match por igualdad NO falle.
//
// Es cinturón + tiradores: el front ya manda el formato completo; esto cubre data vieja o
// clientes que no se actualizaron. Si no reconoce el ordinal, devuelve el string original
// (trim) — nunca rompe, solo normaliza lo que entiende.

const ORDINALES = {
  '1': '1ra', '2': '2da', '3': '3ra', '4': '4ta',
  '5': '5ta', '6': '6ta', '7': '7ma', '8': '8va',
}

// Mapea el ordinal en palabras ya escrito (por si viene "1ro"/"1°" mal tipeado lo agarra el número)
const PALABRA_OK = new Set(Object.values(ORDINALES))

export const normalizarCategoria = (raw) => {
  if (raw == null) return null
  const s = `${raw}`.trim()
  if (!s) return null

  // ¿Tiene una variante después del ordinal? (ej "4ta Categoría B", "4° Categoría +35")
  // Captura el primer token ordinal (número o palabra) y el resto como sufijo.
  // OJO con el orden del alternation: las palabras ("4ta") van ANTES que "\d", si no "\d"
  // matchearía solo el dígito de "4ta" y dejaría "ta" como sufijo.
  const m = s.match(/^\s*(1ra|2da|3ra|4ta|5ta|6ta|7ma|8va|\d\s*[°ºª]|\d)\s*(?:categor[ií]a)?\s*(.*)$/i)
  if (!m) return s // no entiendo el formato → lo dejo igual (no rompo)

  let token = m[1].trim().toLowerCase()
  const sufijo = (m[2] || '').trim()

  // Token puede ser "4", "4°", "4ª" → me quedo con el dígito; o ya "4ta" → lo valido
  const soloDigito = token.match(/^(\d)/)
  let palabra
  if (PALABRA_OK.has(token)) palabra = token
  else if (soloDigito) palabra = ORDINALES[soloDigito[1]]
  else return s // ordinal fuera de rango → lo dejo igual

  if (!palabra) return s
  return `${palabra} Categoría${sufijo ? ' ' + sufijo : ''}`
}
