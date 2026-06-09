import { useState, useEffect, useCallback } from 'react'
import usePlayerStore from '../../store/playerStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const usePlayerStats = (periodo) => {
  const player = usePlayerStore((s) => s.player)
  const token = usePlayerStore((s) => s.token)

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [errorStats, setErrorStats] = useState(null)

  const [oponentes, setOponentes] = useState(null)
  const [loadingOponentes, setLoadingOponentes] = useState(false)
  const [errorOponentes, setErrorOponentes] = useState(null)

  useEffect(() => {
    if (!token) { setLoadingStats(false); return }
    setLoadingStats(true)
    setStats(null)
    const qs = periodo && periodo !== 'todo' ? `?periodo=${periodo}` : ''
    fetch(`${API_URL}/api/jugadores/me/stats${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error('Error al obtener estadísticas'); return r.json() })
      .then((data) => { setStats(data); setLoadingStats(false) })
      .catch((err) => { setErrorStats(err.message); setLoadingStats(false) })
  }, [token, periodo])

  const fetchOponentes = useCallback(() => {
    if (!token || oponentes !== null || loadingOponentes) return
    setLoadingOponentes(true)
    fetch(`${API_URL}/api/jugadores/me/oponentes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error('Error al obtener oponentes'); return r.json() })
      .then((data) => { setOponentes(data); setLoadingOponentes(false) })
      .catch((err) => { setErrorOponentes(err.message); setLoadingOponentes(false) })
  }, [token, oponentes, loadingOponentes])

  return { stats, loadingStats, errorStats, oponentes, loadingOponentes, errorOponentes, fetchOponentes, player }
}
