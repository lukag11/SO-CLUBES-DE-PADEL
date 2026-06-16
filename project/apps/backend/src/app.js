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
import { requireAuth, requireRole, requireFeature, requireClubActivo } from './middleware/auth.js'

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
app.use('/api/productos', requireAuth, requireRole('admin'), requireFeature('finanzas'), productosRouter)
app.use('/api/categorias', requireAuth, requireRole('admin'), requireFeature('finanzas'), categoriasRouter)
app.use('/api/gastos', requireAuth, requireRole('admin'), requireFeature('finanzas'), gastosRouter)
app.use('/api/comandas', requireAuth, requireRole('admin'), requireFeature('finanzas'), comandasRouter)
app.use('/api/caja', requireAuth, requireRole('admin'), requireFeature('finanzas'), cajaRouter)
app.use('/api/profesores', requireAuth, requireRole('admin'), requireFeature('profesores'), profesoresRouter)
app.use('/api/sponsors', requireAuth, requireRole('admin'), requireFeature('sponsors'), sponsorsRouter)
app.use('/api/dev', devResetRouter)
app.use('/api/platform', platformRouter)

export default app
