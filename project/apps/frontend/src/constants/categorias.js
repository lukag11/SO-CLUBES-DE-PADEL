// Categorías de jugador de pádel — FUENTE ÚNICA DE VERDAD.
// El idioma es "1ra, 2da, 3ra, 4ta Categoría" (ordinal en palabras), NUNCA "4°" (eso es grados).
// El formato COMPLETO ("4ta Categoría") es el que se guarda en DB (Jugador.categoria) y el que
// se compara en el backend (convocatorias + solicitudes). En la UI se muestra el corto ("4ta")
// con catLabel(), pero SIEMPRE se envía/guarda el string completo.
//
// Antes había 4 listas distintas (1ª / 4ta / 4° / 4ta Categoría) → no matcheaban entre sí.
// Si tocás categorías de jugador en cualquier pantalla, importá de acá.

export const CATEGORIAS_JUGADOR = [
  '1ra Categoría',
  '2da Categoría',
  '3ra Categoría',
  '4ta Categoría',
  '5ta Categoría',
  '6ta Categoría',
  '7ma Categoría',
  '8va Categoría',
]

// "4ta Categoría" → "4ta" (para mostrar en chips/selects sin repetir la palabra)
export const catLabel = (c) => (c || '').replace(' Categoría', '').trim()
