import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// Tipos de evento aceptados (telemetría de uso para el agente de onboarding).
const TIPOS = new Set(['pantalla', 'click', 'abandono', 'error', 'ayuda_abierta'])

// POST /api/eventos — registra un evento de uso. Fire-and-forget: NUNCA rompe la UX.
// Si algo falla, responde igual (ok:false) y loguea server-side. Requiere auth (montado
// con requireAuth en app.js) → clubId y adminId salen del token, nunca del body.
router.post('/', async (req, res) => {
  try {
    const clubId = req.user?.clubId
    const { tipo, ref, meta } = req.body || {}
    // Validación mínima: sin club, tipo desconocido o ref vacío → se ignora en silencio.
    if (!clubId || !TIPOS.has(tipo) || !ref || typeof ref !== 'string') {
      return res.json({ ok: false })
    }
    await prisma.eventoUso.create({
      data: {
        clubId,
        adminId: req.user?.role === 'admin' ? (req.user?.id ?? null) : null,
        tipo,
        ref: ref.slice(0, 120),          // acota el largo para no guardar basura
        meta: meta && typeof meta === 'object' ? meta : undefined,
      },
    })
    res.json({ ok: true })
  } catch (err) {
    // La telemetría jamás debe afectar al usuario: logueamos y seguimos.
    console.error('[eventos] no se pudo registrar:', err.message)
    res.json({ ok: false })
  }
})

export default router
