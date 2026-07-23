// ============================================================
// Planes y feature gating — fuente de verdad del backend.
// El CATÁLOGO de features vive en código (depende de qué módulos existen).
// La MATRIZ (qué feature va en qué plan) vive en la DB (editable desde el
// panel), sembrada con DEFAULT_MATRIZ la primera vez.
// ============================================================

// Catálogo de módulos "gateables". core:true = siempre habilitado (todos los planes).
// Tiers comerciales: T1 "Básico" (basico) · T2 "Pro" (pro) · T3 "Premium" (premium).
export const FEATURES = [
  { id: 'reservas',     label: 'Reservas / grilla',          core: true },
  { id: 'jugadores',    label: 'Jugadores',                  core: true },
  { id: 'turnos_fijos', label: 'Turnos fijos',               core: true },
  { id: 'cobros',       label: 'Cobros online (MP/QR/transferencia) + deuda', core: false },
  { id: 'caja_light',   label: 'Caja liviana (cierre diario)', core: false },
  { id: 'finanzas',     label: 'Finanzas completas (stock/bar/gastos)', core: false },
  { id: 'direccion',    label: 'Dirección (análisis financiero)', core: false },
  { id: 'torneos',      label: 'Torneos',                    core: false },
  { id: 'profesores',   label: 'Profesores / Clases',        core: false },
  { id: 'estadisticas', label: 'Estadísticas',               core: false },
  { id: 'sponsors',     label: 'Sponsors / personalización', core: false },
  { id: 'ia',           label: 'Asistente IA (WIarky)',      core: false },
  { id: 'multisede',    label: 'Multi-sede / multi-admin',   core: false },
  { id: 'branding',     label: 'Branding avanzado',          core: false },
]

export const FEATURE_IDS = FEATURES.map((f) => f.id)
export const CORE_FEATURES = FEATURES.filter((f) => f.core).map((f) => f.id)
export const PLANES = ['basico', 'pro', 'premium']

// Matriz por defecto (semilla). Cada plan lista TODAS las features que incluye.
// T1 Básico (basico): operativa + COBROS ONLINE + caja liviana → el club chico que cobra.
// T2 Pro (pro): + finanzas completas (bar/stock) + torneos + profes + stats + sponsors.
// T3 Premium (premium): + dirección (BI) + IA (WIarky) + multi-sede + branding.
export const DEFAULT_MATRIZ = {
  basico:  ['reservas', 'jugadores', 'turnos_fijos', 'cobros', 'caja_light'],
  pro:     ['reservas', 'jugadores', 'turnos_fijos', 'cobros', 'caja_light', 'finanzas', 'torneos', 'profesores', 'estadisticas', 'sponsors'],
  premium: ['reservas', 'jugadores', 'turnos_fijos', 'cobros', 'caja_light', 'finanzas', 'torneos', 'profesores', 'estadisticas', 'sponsors', 'ia', 'multisede', 'branding', 'direccion'],
}

// Límites de CANTIDAD por plan (Fase 2). Infinity = sin límite. Los únicos 3 límites numéricos
// (canchas/admins/sedes) — no agregar más (evita ansiedad y tickets). `admins` = total (dueño +
// empleados). El gating de MÓDULOS (arriba) es on/off; esto es cantidad.
export const LIMITES = {
  basico:  { canchas: 4, admins: 2, sedes: 1 },
  pro:     { canchas: Infinity, admins: 5, sedes: 1 },
  premium: { canchas: Infinity, admins: Infinity, sedes: Infinity },
}

// Límite efectivo de un club. En PRUEBA (trial) = premium (sin límites), igual criterio que
// featuresEfectivas (que pruebe todo). Suspendido/vencido ya lo frena requireClubActivo antes.
export const limiteDelPlan = (club) => {
  const plan = club?.estado === 'prueba' ? 'premium' : (club?.plan || 'basico')
  return LIMITES[plan] || LIMITES.basico
}

// ¿El club tiene el acceso cortado por completo? (suspendido, prueba vencida o suscripción vencida)
export const accesoBloqueado = (club) => {
  if (!club) return true
  if (club.estado === 'suspendido') return 'suspendido'
  if (club.estado === 'prueba' && club.trialHasta && new Date(club.trialHasta).getTime() < Date.now()) {
    return 'prueba_vencida'
  }
  // Club pago ('activo') con licencia vencida → cortar hasta que renueve. Sin licenciaHasta (null)
  // = no se controla por fecha (alta manual / grandfathering) → no bloquea.
  if (club.estado === 'activo' && club.licenciaHasta && new Date(club.licenciaHasta).getTime() < Date.now()) {
    return 'licencia_vencida'
  }
  return false
}

// Lista de features EFECTIVAS de un club, dado su plan/estado y la matriz vigente.
// - suspendido / prueba vencida → [] (sin acceso).
// - prueba vigente → Premium completo (decisión B: que pruebe todo 14 días).
// - activo → lo que diga su plan.
// - core siempre incluido + featuresExtra (regalitos por club).
export const featuresEfectivas = (club, matriz = DEFAULT_MATRIZ) => {
  if (!club || accesoBloqueado(club)) return []
  const m = matriz || DEFAULT_MATRIZ
  const base = club.estado === 'prueba' ? (m.premium || []) : (m[club.plan] || m.basico || [])
  const extra = Array.isArray(club.featuresExtra) ? club.featuresExtra : []
  return [...new Set([...CORE_FEATURES, ...base, ...extra])]
}
