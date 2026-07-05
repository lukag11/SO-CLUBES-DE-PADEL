import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { calcularSaludFinanciera, calcularHeatmap, calcularContribucionSectores, calcularFlujoCaja, calcularRetencionTF } from '../lib/finanzas.js'

const router = Router()

// GET /api/finanzas/salud — métricas base de la "Dirección del club": break-even,
// rinde por turno (RevPACH), costo del turno vacío, ocupación. Todo en turnos de 1.5h,
// ventana móvil de 30 días. Incluye flags `falta.*` para guiar el onboarding financiero.
router.get('/salud', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const salud = await calcularSaludFinanciera(req.user.clubId)
    res.json(salud)
  } catch (err) {
    console.error('[finanzas/salud]', err)
    res.status(500).json({ error: 'Error al calcular la salud financiera' })
  }
})

// GET /api/finanzas/heatmap — mapa de calor de ocupación día × franja (pico/medio/frío).
router.get('/heatmap', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const heatmap = await calcularHeatmap(req.user.clubId)
    res.json(heatmap)
  } catch (err) {
    console.error('[finanzas/heatmap]', err)
    res.status(500).json({ error: 'Error al calcular el mapa de calor' })
  }
})

// GET /api/finanzas/sectores — contribución (margen que no miente) por sector.
router.get('/sectores', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const data = await calcularContribucionSectores(req.user.clubId)
    res.json(data)
  } catch (err) {
    console.error('[finanzas/sectores]', err)
    res.status(500).json({ error: 'Error al calcular la contribución por sector' })
  }
})

// GET /api/finanzas/flujo — proyección de caja a 90 días (3 meses): cobros − pagos por mes.
router.get('/flujo', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const data = await calcularFlujoCaja(req.user.clubId)
    res.json(data)
  } catch (err) {
    console.error('[finanzas/flujo]', err)
    res.status(500).json({ error: 'Error al calcular el flujo de caja' })
  }
})

// GET /api/finanzas/turnos-fijos — retención: valor recurrente anual + TF en riesgo de baja.
router.get('/turnos-fijos', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const data = await calcularRetencionTF(req.user.clubId)
    res.json(data)
  } catch (err) {
    console.error('[finanzas/turnos-fijos]', err)
    res.status(500).json({ error: 'Error al calcular la retención de turnos fijos' })
  }
})

export default router
