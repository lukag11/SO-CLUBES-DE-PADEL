// Auto-confirmación de reservas/turnos — disponible en TODOS los planes.
// Decisión de producto (2026): la confirmación instantánea es higiene de mercado
// (Playtomic, MATCHi, CourtReserve, CanchaYa, etc. la dan de base), así que NO se gatea.
// El club puede volver al flujo manual (admin aprueba) apagando el flag.
// Default: true (si el club no configuró nada, se auto-confirma).
export const clubAutoConfirma = (club) => {
  const v = club?.config?.autoConfirmaReservas
  return v === undefined || v === null ? true : v !== false
}
