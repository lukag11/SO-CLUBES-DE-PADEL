import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useClubStore from '../store/clubStore'
import usePlayerStore from '../store/playerStore'
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
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)

  useEffect(() => {
    const slug = import.meta.env.VITE_CLUB_SLUG
    if (!slug) return
    api.get(`/clubs/${slug}`)
      .then((data) => { if (data?.id) loadFromBackend(data) })
      .catch(() => {})
  }, [])

  const handleCta = () => navigate(isAuthenticated ? '/dashboardJugadores/dashboard' : '/dashboardJugadores')

  const Template = TEMPLATES[club.templateId] ?? Template1

  return <Template club={club} onCta={handleCta} />
}

export default LandingPage
