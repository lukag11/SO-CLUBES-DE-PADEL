const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

let bloqueoManejado = false // evita alert/redirect repetidos cuando varias requests fallan juntas

const request = async (path, { headers, ...rest } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  })
  const data = await res.json()
  if (!res.ok) {
    // Sesión cerrada por baja de cuenta o por cambio de contraseña en otro dispositivo.
    if (data.error === 'cuenta_inactiva' || data.error === 'sesion_expirada') {
      window.dispatchEvent(new CustomEvent('jugador:cuenta-inactiva', { detail: data.message }))
    }
    // Club suspendido / prueba vencida → cerrar sesión del club y volver al inicio.
    if (data.error === 'club_bloqueado' && !bloqueoManejado) {
      bloqueoManejado = true
      ;['token', 'player_token', 'player_data'].forEach((k) => localStorage.removeItem(k))
      alert(data.message || 'El acceso del club fue bloqueado.')
      window.location.href = '/login'
    }
    throw new Error(data.message || data.error || 'Error del servidor')
  }
  return data
}

export const api = {
  post:   (path, body, headers)  => request(path, { method: 'POST',   body: JSON.stringify(body), headers }),
  patch:  (path, body, headers)  => request(path, { method: 'PATCH',  body: JSON.stringify(body), headers }),
  put:    (path, body, headers)  => request(path, { method: 'PUT',    body: JSON.stringify(body), headers }),
  delete: (path, headers)        => request(path, { method: 'DELETE', headers }),
  get:    (path, headers)        => request(path, { method: 'GET',    headers }),
}

// Lee un File/Blob como data URL (base64).
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })

/**
 * Sube una imagen al Storage y devuelve la URL pública.
 * @param {File|Blob|string} image  File, Blob o data URL/base64
 * @param {object} opts  { profile: 'logo'|'avatar'|'flyer'|'fondo'|'galeria', folder, token }
 * @returns {Promise<string>} URL pública
 */
export const uploadImage = async (image, { profile = 'default', folder, token } = {}) => {
  const dataUrl = (typeof image === 'string') ? image : await fileToDataUrl(image)
  const { url } = await request('/uploads', {
    method: 'POST',
    body: JSON.stringify({ image: dataUrl, profile, folder }),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return url
}
