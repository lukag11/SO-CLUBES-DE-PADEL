// Resuelve QUÉ club está mirando el visitante (red unificada, Etapa 0).
// Prioridad:
//  1. El slug del PATH de la URL (/club/:slug) → una sola app sirve cualquier club. Al verlo, lo
//     RECUERDA en la sesión, así la navegación interna a rutas "planas" (/torneos, /partidos…) no
//     pierde el club (andamio hasta la E2, donde el club activo vivirá en el token del jugador).
//  2. El club recordado en la sesión (sticky).
//  3. La variable del build VITE_CLUB_SLUG → compat con el modelo viejo (un build por club) y dev local.
const CLUB_SLUG_KEY = 'club_slug_activo'

export const getClubSlug = () => {
  // 1. De la URL /club/:slug
  const m = (typeof window !== 'undefined' ? window.location.pathname : '').match(/^\/club\/([^/]+)/)
  if (m) {
    const slug = decodeURIComponent(m[1])
    try { sessionStorage.setItem(CLUB_SLUG_KEY, slug) } catch { /* storage bloqueado: no es crítico */ }
    return slug
  }
  // 2. Sticky: el último club visto en la sesión (mantiene el contexto entre rutas planas)
  try {
    const recordado = sessionStorage.getItem(CLUB_SLUG_KEY)
    if (recordado) return recordado
  } catch { /* noop */ }
  // 3. Fallback: env del build (modelo viejo / dev)
  return import.meta.env.VITE_CLUB_SLUG || null
}
