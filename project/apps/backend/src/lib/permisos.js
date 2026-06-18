// ============================================================
// Permisos por empleado (RBAC dentro del club).
// El admin 'owner' tiene acceso TOTAL (ignora permisos).
// El admin 'staff' (empleado) solo accede a los módulos en su lista `permisos`.
// Catálogo en código (depende de qué módulos existen), espejado en el front.
// ============================================================

// Módulos asignables a un empleado. Lo que NO está acá es SOLO del dueño
// (Apariencia/config del club, Equipo, Plan) y nunca se delega.
export const PERMISOS = [
  { id: 'reservas',     label: 'Reservas' },
  { id: 'jugadores',    label: 'Jugadores' },
  { id: 'clases',       label: 'Clases / Profes' },
  { id: 'torneos',      label: 'Torneos' },
  { id: 'sponsors',     label: 'Sponsors' },
  { id: 'ventas',       label: 'Cobros y ventas' },   // vender, cobrar turnos/deudas, stock
  { id: 'caja',         label: 'Caja y reportes' },   // caja del día, gastos, márgenes — SENSIBLE
]

export const PERMISO_IDS = PERMISOS.map((p) => p.id)

// ¿Este admin puede usar el módulo? El dueño siempre; el empleado según su lista.
export const tienePermiso = (admin, permisoId) => {
  if (!admin) return false
  if (admin.rol === 'owner') return true
  return Array.isArray(admin.permisos) && admin.permisos.includes(permisoId)
}

// Permisos efectivos para mandar al front (el dueño = todos).
export const permisosEfectivos = (admin) => {
  if (!admin) return []
  if (admin.rol === 'owner') return PERMISO_IDS
  return (admin.permisos || []).filter((p) => PERMISO_IDS.includes(p))
}
