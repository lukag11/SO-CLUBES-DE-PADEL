// Resuelve QUÉ club está mirando el visitante (red unificada, Etapa 0).
// Prioridad: (1) el slug del PATH de la URL (/club/:slug) → una sola app sirve cualquier club;
//            (2) si no hay, la variable del build VITE_CLUB_SLUG → compatibilidad con el modelo
//               viejo (un build por club) y con el dev local (.env).
// Mientras ninguna URL use /club/, esto devuelve exactamente lo mismo que antes (VITE_CLUB_SLUG),
// así que el cambio es un no-op de comportamiento hasta que exista el ruteo /club/:slug (E0.2).
export const getClubSlug = () => {
  const m = (typeof window !== 'undefined' ? window.location.pathname : '').match(/^\/club\/([^/]+)/)
  const fromUrl = m ? decodeURIComponent(m[1]) : null
  return fromUrl || import.meta.env.VITE_CLUB_SLUG || null
}
