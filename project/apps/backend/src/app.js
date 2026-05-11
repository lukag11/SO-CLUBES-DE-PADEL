import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import canchasRouter from './routes/canchas.js'
import reservasRouter from './routes/reservas.js'
import torneosRouter from './routes/torneos.js'
import jugadoresRouter from './routes/jugadores.js'
import clubsRouter from './routes/clubs.js'

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

app.use(express.json())

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/canchas', canchasRouter)
app.use('/api/reservas', reservasRouter)
app.use('/api/torneos', torneosRouter)
app.use('/api/jugadores', jugadoresRouter)
app.use('/api/clubs', clubsRouter)

export default app
