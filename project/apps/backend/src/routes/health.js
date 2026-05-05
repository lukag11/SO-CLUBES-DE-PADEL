import { Router } from 'express'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'padelos-api',
    timestamp: new Date().toISOString(),
  })
})

export default router
