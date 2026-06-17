import rateLimit from 'express-rate-limit'

// Límite para endpoints de autenticación (login de los 4 roles): frena fuerza bruta.
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 10,                    // 10 intentos por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá un minuto e intentá de nuevo.' },
})

// Límite para alta self-service pública: frena creación masiva de clubes truchos.
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hora
  max: 5,                     // 5 altas por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas altas desde esta conexión. Probá más tarde.' },
})

// Límite para lookups públicos (buscar-por-dni): evita barrer DNIs.
export const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas. Esperá un momento.' },
})
