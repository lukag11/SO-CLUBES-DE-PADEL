import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase Storage (server-side, service_role para bypassear RLS).
// Solo se usa para subir/borrar archivos del bucket de media.
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.warn('[supabase] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY — uploads deshabilitados')
}

export const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null

export const MEDIA_BUCKET = process.env.SUPABASE_BUCKET || 'media'

export const storageEnabled = () => supabase !== null
