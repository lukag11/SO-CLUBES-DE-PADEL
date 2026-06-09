import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadImage } from '../lib/imageUpload.js'
import { storageEnabled } from '../lib/supabase.js'

const router = Router()

const PROFILES = new Set(['logo', 'avatar', 'flyer', 'fondo', 'galeria', 'default'])

// POST /api/uploads  — sube una imagen (data URL/base64) al Storage y devuelve la URL pública.
// Body: { image: string(dataURL|base64), profile?: string, folder?: string }
router.post('/', requireAuth, async (req, res) => {
  if (!storageEnabled()) {
    return res.status(503).json({ error: 'storage_disabled', message: 'Storage no configurado en el servidor' })
  }

  const { image, profile = 'default', folder } = req.body ?? {}
  if (!image) return res.status(400).json({ error: 'image requerido' })

  const prof = PROFILES.has(profile) ? profile : 'default'
  // Carpeta segura: solo el club del usuario (evita colisiones entre tenants)
  const safeFolder = (folder && /^[a-z0-9_-]{1,40}$/i.test(folder)) ? folder : prof
  const clubId = req.user?.clubId || 'shared'

  try {
    const { url, bytes } = await uploadImage(image, { profile: prof, folder: `${clubId}/${safeFolder}` })
    res.json({ url, bytes })
  } catch (err) {
    console.error('[uploads]', err.message)
    const code = err.message?.startsWith('imagen') ? 400 : 500
    res.status(code).json({ error: err.message || 'upload_failed' })
  }
})

export default router
