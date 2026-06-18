import { verifyToken } from '../lib/jwt.js'
import prisma from '../lib/prisma.js'
import { featuresEfectivas, accesoBloqueado } from '../lib/planes.js'
import { getMatriz } from '../lib/planesConfig.js'
import { tienePermiso } from '../lib/permisos.js'

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  try {
    const token = header.slice(7)
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Sin permisos' })
  }
  next()
}

// Bloquea el acceso si el club está suspendido o se le venció la prueba.
// Aplica a cualquier rol que pertenezca a un club (admin/jugador/profesor).
export const requireClubActivo = async (req, res, next) => {
  try {
    const clubId = req.user?.clubId
    if (!clubId) return next() // platform u otros sin club → no aplica
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { estado: true, trialHasta: true },
    })
    const bloqueo = accesoBloqueado(club)
    if (bloqueo) {
      return res.status(403).json({
        error: 'club_bloqueado',
        motivo: bloqueo, // 'suspendido' | 'prueba_vencida'
        message: bloqueo === 'prueba_vencida'
          ? 'La prueba gratuita venció. Contactá para activar tu plan.'
          : 'El club está suspendido. Contactá al soporte.',
      })
    }
    next()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al verificar el club' })
  }
}

// Exige que el plan del club incluya una feature. Úsalo DESPUÉS de requireAuth.
// Bloquea también si el club está suspendido / prueba vencida.
export const requireFeature = (featureId) => async (req, res, next) => {
  try {
    const clubId = req.user?.clubId
    if (!clubId) return res.status(403).json({ error: 'Sin club asociado' })
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { plan: true, estado: true, trialHasta: true, featuresExtra: true },
    })
    if (accesoBloqueado(club)) {
      return res.status(403).json({ error: 'club_bloqueado', message: 'El acceso del club está bloqueado.' })
    }
    const matriz = await getMatriz()
    if (!featuresEfectivas(club, matriz).includes(featureId)) {
      return res.status(403).json({
        error: 'feature_no_disponible',
        feature: featureId,
        message: 'Tu plan no incluye este módulo. Mejoralo para usarlo.',
      })
    }
    next()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al validar el plan' })
  }
}

// Exige que el ADMIN tenga el permiso del módulo. El dueño (rol 'owner') pasa
// siempre; el empleado (rol 'staff') solo si tiene el permiso. Úsalo DESPUÉS de
// requireRole('admin') — los demás roles ni llegan acá.
export const requirePermiso = (permisoId) => async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { rol: true, permisos: true },
    })
    if (!admin) return res.status(401).json({ error: 'Sesión inválida' })
    if (tienePermiso(admin, permisoId)) return next()
    return res.status(403).json({
      error: 'sin_permiso',
      permiso: permisoId,
      message: 'No tenés permiso para esta sección. Pedíselo al dueño del club.',
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al validar el permiso' })
  }
}

// Verifica que el jugador siga activo en la DB (para detectar bajas post-login)
// y que el token no haya sido invalidado por un cambio de contraseña (tokenVersion).
export const requireActive = async (req, res, next) => {
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      select: { activo: true, tokenVersion: true },
    })
    if (!jugador || !jugador.activo) {
      return res.status(401).json({ error: 'cuenta_inactiva', message: 'Tu cuenta fue dada de baja. Contactá al club.' })
    }
    // Tokens viejos (sin tokenVersion) se tratan como 0; coinciden con el default
    // hasta que un cambio de contraseña incrementa la versión e invalida los anteriores.
    if ((req.user.tokenVersion ?? 0) !== jugador.tokenVersion) {
      return res.status(401).json({ error: 'sesion_expirada', message: 'Tu sesión expiró porque se cambió la contraseña. Iniciá sesión de nuevo.' })
    }
    next()
  } catch {
    res.status(500).json({ error: 'Error al verificar cuenta' })
  }
}
