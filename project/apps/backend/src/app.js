import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import canchasRouter from './routes/canchas.js'
import reservasRouter from './routes/reservas.js'
import torneosRouter from './routes/torneos.js'
import jugadoresRouter from './routes/jugadores.js'
import clubsRouter from './routes/clubs.js'
import turnosFijosRouter from './routes/turnos-fijos.js'
import notificacionesRouter from './routes/notificaciones.js'
import cargosRouter from './routes/cargos.js'
import productosRouter from './routes/productos.js'
import gastosRouter from './routes/gastos.js'
import comandasRouter from './routes/comandas.js'
import categoriasRouter from './routes/categorias.js'
import cajaRouter from './routes/caja.js'
import profesoresRouter from './routes/profesores.js'
import sponsorsRouter from './routes/sponsors.js'
import uploadsRouter from './routes/uploads.js'
import devResetRouter from './routes/dev-reset.js'
import platformRouter from './routes/platform.js'
import empleadosRouter from './routes/empleados.js'
import convocatoriasRouter from './routes/convocatorias.js'
import convocatoriasPublicasRouter from './routes/convocatorias-publicas.js'
import solicitudesRouter from './routes/solicitudes.js'
import solicitudesPublicasRouter from './routes/solicitudes-publicas.js'
import eventosRouter from './routes/eventos.js'
import costosRouter from './routes/costos.js'
import finanzasRouter from './routes/finanzas.js'
import { requireAuth, requireRole, requireFeature, requireClubActivo, requirePermiso } from './middleware/auth.js'

// Sentry (error tracking en producción). DORMIDO si no hay SENTRY_DSN: ni siquiera se
// importa el paquete, así en local no afecta el arranque. Para activarlo en el deploy:
// setear SENTRY_DSN en las env vars de Railway. No hay nada más que tocar.
let Sentry = null
if (process.env.SENTRY_DSN) {
  Sentry = await import('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  })
}

const app = express()

const corsOrigin = (origin, callback) => {
  const allowed = process.env.FRONTEND_URL || ''
  if (!origin || origin === allowed || /^http:\/\/localhost:\d+$/.test(origin)) {
    callback(null, true)
  } else {
    callback(new Error('CORS no permitido'))
  }
}

app.use(cors({ origin: corsOrigin, credentials: true }))

// /uploads recibe imágenes en base64 (subida puntual) → parser grande, montado
// ANTES del parser global para que el límite chico no rechace el body.
app.use('/api/uploads', express.json({ limit: '15mb' }), uploadsRouter)

// El OCR de gastos recibe la foto de la factura en base64 (puede pesar varios MB) →
// parser grande, montado ANTES del global para que el límite chico no la rechace.
app.use('/api/gastos/extraer', express.json({ limit: '15mb' }))

// Tras migrar las imágenes a Storage los payloads quedan chicos; este límite
// se puede bajar a ~2mb una vez confirmada la migración.
app.use(express.json({ limit: '8mb' }))

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/canchas', canchasRouter)
app.use('/api/reservas', requireAuth, requireClubActivo, reservasRouter)
app.use('/api/torneos', torneosRouter)
app.use('/api/jugadores', jugadoresRouter)
app.use('/api/clubs', clubsRouter)
app.use('/api/turnos-fijos', requireAuth, requireClubActivo, turnosFijosRouter)
app.use('/api/notificaciones', requireAuth, requireClubActivo, notificacionesRouter)
app.use('/api/cargos', cargosRouter)
app.use('/api/productos', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), productosRouter)
app.use('/api/categorias', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), categoriasRouter)
app.use('/api/gastos', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('caja'), gastosRouter)
app.use('/api/costos', requireAuth, requireRole('admin'), requireFeature('direccion'), requirePermiso('caja'), costosRouter)
app.use('/api/finanzas', requireAuth, requireRole('admin'), requireFeature('direccion'), requirePermiso('caja'), finanzasRouter)
app.use('/api/comandas', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('ventas'), comandasRouter)
app.use('/api/caja', requireAuth, requireRole('admin'), requireFeature('finanzas'), requirePermiso('caja'), cajaRouter)
app.use('/api/profesores', requireAuth, requireRole('admin'), requireFeature('profesores'), requirePermiso('clases'), profesoresRouter)
app.use('/api/sponsors', requireAuth, requireRole('admin'), requireFeature('sponsors'), requirePermiso('sponsors'), sponsorsRouter)
app.use('/api/dev', devResetRouter)
app.use('/api/platform', platformRouter)
app.use('/api/empleados', empleadosRouter)
app.use('/api/convocatorias/publica', convocatoriasPublicasRouter) // público (sin auth) — debe ir ANTES del router autenticado
app.use('/api/convocatorias', requireAuth, requireClubActivo, convocatoriasRouter)
app.use('/api/solicitudes/publica', solicitudesPublicasRouter) // público (sin auth) — debe ir ANTES del router autenticado
app.use('/api/solicitudes', requireAuth, requireClubActivo, solicitudesRouter)
app.use('/api/eventos', requireAuth, eventosRouter) // telemetría de uso (fire-and-forget)

// Captura de errores no manejados → Sentry (solo si está activo). Va DESPUÉS de las rutas.
if (Sentry) Sentry.setupExpressErrorHandler(app)

export default app
