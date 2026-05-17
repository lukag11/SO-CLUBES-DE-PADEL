const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const request = async (path, { headers, ...rest } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  })
  const data = await res.json()
  if (!res.ok) {
    if (data.error === 'cuenta_inactiva') {
      window.dispatchEvent(new CustomEvent('jugador:cuenta-inactiva', { detail: data.message }))
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
