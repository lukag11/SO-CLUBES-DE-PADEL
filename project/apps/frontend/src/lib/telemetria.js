// Telemetría de uso (para el agente de onboarding / mejora continua).
// Fire-and-forget: registra qué hace el admin/dueño para detectar dónde se traba,
// qué no usa y dónde abandona. NUNCA debe romper ni frenar la UI: cualquier error
// se traga en silencio. clubId/adminId los pone el backend desde el token.
import { api } from './api'

/**
 * Registra un evento de uso. No se espera (no bloquea) y no lanza.
 * @param {'pantalla'|'click'|'abandono'|'error'|'ayuda_abierta'} tipo
 * @param {string} ref  - referencia de pantalla/acción, ej "dashboard", "costos.nuevo"
 * @param {object} [meta] - contexto extra (sin datos sensibles)
 */
export function trackEvento(tipo, ref, meta) {
  // Solo si hay sesión de admin (token). Sin token, no hay a quién atribuirlo.
  // OJO: lib/api.js NO agrega el Authorization solo → hay que pasarlo a mano.
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    api.post('/eventos', { tipo, ref, meta }, { Authorization: `Bearer ${token}` }).catch(() => {})
  } catch {
    /* nunca propagar */
  }
}
