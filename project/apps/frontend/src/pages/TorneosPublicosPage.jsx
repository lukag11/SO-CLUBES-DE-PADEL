import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useClubStore from '../store/clubStore'
import usePlayerStore from '../store/playerStore'
import useTorneosStore from '../store/torneosStore'
import { api } from '../lib/api'
import { TorneosSection } from '../features/landing/LandingSections'
import { mapTorneoLanding } from './LandingPage'

const TorneosPublicosPage = () => {
  const navigate = useNavigate()
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const club = useClubStore((s) => s.club)
  const _loaded = useClubStore((s) => s._loaded)
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const setTorneos = useTorneosStore((s) => s.setTorneos)
  const torneos = useTorneosStore((s) => s.torneos)
  const [fetchDone, setFetchDone] = useState(false)

  // Si se entra directo a /torneos (sin pasar por la landing), cargar club + torneos.
  useEffect(() => {
    const slug = import.meta.env.VITE_CLUB_SLUG
    if (!slug || _loaded) { setFetchDone(true); return }
    api.get(`/clubs/${slug}`)
      .then((data) => {
        if (data?.id) {
          loadFromBackend(data)
          return api.get(`/torneos?clubId=${data.id}`).then((ts) => {
            if (Array.isArray(ts)) setTorneos(ts.map(mapTorneoLanding))
          })
        }
      })
      .catch(() => {})
      .finally(() => setFetchDone(true))
  }, [_loaded])

  const colorPrimario = club?.colorPrimario || '#afca0b'
  const handleCta = () => navigate(isAuthenticated ? '/dashboardJugadores/dashboard' : '/dashboardJugadores')

  if (!_loaded && !fetchDone) {
    return (
      <div className="min-h-screen bg-[#080b0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const sinTorneos = torneos.length === 0

  return (
    <div className="min-h-screen bg-[#080b0f]">
      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-[#080b0f]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all shrink-0"
            title="Volver al inicio"
          >
            <ArrowLeft size={16} />
          </button>
          {club?.logo && (
            <img src={club.logo} alt={club.nombre} className="w-9 h-9 rounded-xl object-cover border border-white/10" />
          )}
          <div className="min-w-0">
            <h1 className="text-white font-black text-base leading-tight truncate">Torneos</h1>
            {club?.nombre && <p className="text-white/35 text-xs truncate">{club.nombre}</p>}
          </div>
        </div>
      </div>

      {/* Listado de torneos */}
      {sinTorneos ? (
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <p className="text-white/40 text-lg font-semibold">No hay torneos todavía</p>
          <p className="text-white/20 text-sm mt-1">Cuando el club publique torneos, los vas a ver acá.</p>
        </div>
      ) : (
        <TorneosSection colorPrimario={colorPrimario} dark={true} onCta={handleCta} />
      )}
    </div>
  )
}

export default TorneosPublicosPage
