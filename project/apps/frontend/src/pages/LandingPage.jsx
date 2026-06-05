import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useClubStore from '../store/clubStore'
import usePlayerStore from '../store/playerStore'
import useTorneosStore from '../store/torneosStore'
import { api } from '../lib/api'
import Template1 from '../features/landing/Template1'
import Template2 from '../features/landing/Template2'
import Template3 from '../features/landing/Template3'
import Template4 from '../features/landing/Template4'
import Template5 from '../features/landing/Template5'

const TEMPLATES = { 1: Template1, 2: Template2, 3: Template3, 4: Template4, 5: Template5 }

const LandingPage = () => {
  const navigate = useNavigate()
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const club = useClubStore((s) => s.club)
  const _loaded = useClubStore((s) => s._loaded)
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const setTorneos = useTorneosStore((s) => s.setTorneos)

  // fetchDone cubre dos casos donde _loaded nunca se activa:
  // 1. Sin VITE_CLUB_SLUG (dev sin .env) → no hay fetch, mostramos defaults
  // 2. Fetch falla (network error, club no existe) → mostramos defaults igual
  const [fetchDone, setFetchDone] = useState(false)

  useEffect(() => {
    const slug = import.meta.env.VITE_CLUB_SLUG
    if (!slug) {
      setFetchDone(true)
      return
    }
    api.get(`/clubs/${slug}`)
      .then((data) => {
        if (data?.id) {
          loadFromBackend(data)
          // Fetchear torneos para que TurnosDisponibles pueda bloquear días de torneo
          api.get(`/torneos?clubId=${data.id}`)
            .then((ts) => {
              if (!Array.isArray(ts)) return
              setTorneos(ts.map((t) => {
                const p = t.personalizacion ?? {}
                return {
                  id: t.id,
                  nombre: t.nombre,
                  estado: t.estado,
                  fechaInicio: t.fechaInicio,
                  fechaFin: t.fechaFin,
                  categorias: t.categorias ?? [],
                  genero: t.genero ?? null,
                  canchasAsignadas: t.canchasAsignadas ?? [],
                  cupoLibre: t.cupoLibre ?? false,
                  cuposPorCategoria: t.cuposPorCategoria ?? {},
                  // Campos de personalización — vienen en t.personalizacion (JSON column)
                  modoLandingFlyer:   p.modoLandingFlyer   ?? 'auto',
                  premioPrimero:      p.premioPrimero      ?? null,
                  premioSegundo:      p.premioSegundo      ?? null,
                  premioSemifinal:    p.premioSemifinal    ?? null,
                  whatsapp:           p.whatsapp           ?? null,
                  imagenFondo:        p.imagenFondo        ?? null,
                  imagenFondoEnCurso: p.imagenFondoEnCurso ?? null,
                  ctaEnCurso:         p.ctaEnCurso         ?? null,
                  templateEnCurso:    p.templateEnCurso    ?? 1,
                  colorAcento:        p.colorAcento        ?? null,
                  descripcion:        t.descripcion        ?? '',
                  inscriptos: (t.parejas ?? []).map((par) => ({ id: par.id, jugador1: par.jugador1, jugador2: par.jugador2, estado: par.estado ?? 'inscripto' })),
                }
              }))
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setFetchDone(true))
  }, [])

  const handleCta = () => navigate(isAuthenticated ? '/dashboardJugadores/dashboard' : '/dashboardJugadores')

  // Esperamos hasta que el fetch terminó (_loaded: datos reales) o hasta que
  // se confirmó que no hay datos disponibles (fetchDone: defaults o error)
  if (!_loaded && !fetchDone) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  const Template = TEMPLATES[club.templateId] ?? Template1

  return <Template club={club} onCta={handleCta} />
}

export default LandingPage
