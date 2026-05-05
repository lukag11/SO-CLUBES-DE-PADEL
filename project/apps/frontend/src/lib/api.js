const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const request = async (path, { headers, ...rest } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error del servidor')
  return data
}

export const api = {
  post: (path, body, headers) => request(path, { method: 'POST', body: JSON.stringify(body), headers }),
  get: (path, headers) => request(path, { method: 'GET', headers }),
}
