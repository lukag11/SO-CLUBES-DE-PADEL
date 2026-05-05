import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'

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

export default app
