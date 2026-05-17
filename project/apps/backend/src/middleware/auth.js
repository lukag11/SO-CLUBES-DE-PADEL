import { verifyToken } from '../lib/jwt.js'
import prisma from '../lib/prisma.js'

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

// Verifica que el jugador siga activo en la DB (para detectar bajas post-login)
export const requireActive = async (req, res, next) => {
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      select: { activo: true },
    })
    if (!jugador || !jugador.activo) {
      return res.status(401).json({ error: 'cuenta_inactiva', message: 'Tu cuenta fue dada de baja. Contactá al club.' })
    }
    next()
  } catch {
    res.status(500).json({ error: 'Error al verificar cuenta' })
  }
}
