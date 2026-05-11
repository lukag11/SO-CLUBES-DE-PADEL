import { useState, useEffect, useMemo } from 'react'
import usePlayerStore from '../../store/playerStore'
import useTorneosStore from '../../store/torneosStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Determina si una pareja del JSON de grupos/brackets pertenece al jugador
const parejaContiene = (pareja, dni, nombre, apellido) => {
  if (!pareja) return false
  if (dni && (pareja.jugador1Dni === dni || pareja.jugador2Dni === dni)) return true
  // fallback por nombre (mock data sin DNI)
  const nombre_l = nombre?.toLowerCase() ?? ''
  const apellido_l = apellido?.toLowerCase() ?? ''
  const en = (str) => str && (str.toLowerCase().includes(nombre_l) || str.toLowerCase().includes(apellido_l))
  return en(pareja.jugador1) || en(pareja.jugador2)
}

export const usePlayerStats = () => {
  const player = usePlayerStore((s) => s.player)
  const token = usePlayerStore((s) => s.token)
  const torneos = useTorneosStore((s) => s.torneos)

  const [apiStats, setApiStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/api/jugadores/me/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Error al obtener estadísticas')
        return r.json()
      })
      .then((data) => { setApiStats(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [token])

  // Estadísticas de partidos calculadas desde el store (grupos + brackets)
  const torneoStats = useMemo(() => {
    const dni = player?.dni
    const nombre = player?.nombre
    const apellido = player?.apellido

    const resultados = [] // { resultado: 'W'|'L', categoria, torneoNombre }

    for (const torneo of torneos) {
      // ── Fase de grupos ────────────────────────────────────────────────────
      if (torneo.grupos) {
        for (const [cat, catData] of Object.entries(torneo.grupos)) {
          for (const zona of (catData?.zonas ?? [])) {
            for (const partido of (zona.partidos ?? [])) {
              if (!partido.ganador) continue
              const esP1 = parejaContiene(partido.pareja1, dni, nombre, apellido)
              const esP2 = parejaContiene(partido.pareja2, dni, nombre, apellido)
              if (!esP1 && !esP2) continue
              const gane = (esP1 && partido.ganador === 'pareja1') || (esP2 && partido.ganador === 'pareja2')
              resultados.push({ resultado: gane ? 'W' : 'L', categoria: cat, torneoNombre: torneo.nombre })
            }
          }
        }
      }
      // ── Fase eliminatoria (brackets) ──────────────────────────────────────
      if (torneo.brackets) {
        for (const [cat, bracket] of Object.entries(torneo.brackets)) {
          for (const ronda of (bracket?.rondas ?? [])) {
            for (const partido of (ronda.partidos ?? [])) {
              if (!partido.ganador) continue
              const esP1 = parejaContiene(partido.pareja1, dni, nombre, apellido)
              const esP2 = parejaContiene(partido.pareja2, dni, nombre, apellido)
              if (!esP1 && !esP2) continue
              const gane = (esP1 && partido.ganador === 'pareja1') || (esP2 && partido.ganador === 'pareja2')
              resultados.push({ resultado: gane ? 'W' : 'L', categoria: cat, torneoNombre: torneo.nombre })
            }
          }
        }
      }
    }

    // Rendimiento por categoría
    const porCategoria = {}
    for (const r of resultados) {
      if (!porCategoria[r.categoria]) porCategoria[r.categoria] = { ganados: 0, perdidos: 0 }
      if (r.resultado === 'W') porCategoria[r.categoria].ganados++
      else porCategoria[r.categoria].perdidos++
    }

    const recentTrend = resultados.slice(-10).map((r) => r.resultado)

    return { resultados, porCategoria, recentTrend }
  }, [torneos, player])

  return { apiStats, torneoStats, loading, error, player }
}
