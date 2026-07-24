import { useState, useEffect } from 'react'
import { Zap, ChevronDown, Check, Loader2 } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

// Red unificada (E2.3c): selector de club DENTRO del área jugador. Si la cuenta está en varios clubes,
// el bloque del club (arriba del sidebar) se vuelve un desplegable para cambiar de club sin desloguear.
// Al elegir otro → POST /auth/jugador/switch-club re-emite el token con ese club → recargamos para
// traer toda la data del club nuevo (reservas, turnos, etc.) limpia. Si tiene 1 club, es solo el logo.
const ClubSwitcher = () => {
  const token = usePlayerStore((s) => s.token)
  const setToken = usePlayerStore((s) => s.setToken)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const clubNombre = useClubStore((s) => s.club?.nombre)
  const clubLogo = useClubStore((s) => s.club?.logo)
  const clubId = useClubStore((s) => s.club?.id)
  const [memberships, setMemberships] = useState([])
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (!token) return
    api.get('/auth/jugador/me', { Authorization: `Bearer ${token}` })
      .then((r) => setMemberships(Array.isArray(r?.memberships) ? r.memberships : []))
      .catch(() => {})
  }, [token])

  const multi = memberships.length > 1

  const cambiar = async (destinoId) => {
    if (switching || destinoId === clubId) { setOpen(false); return }
    setSwitching(true)
    try {
      const data = await api.post('/auth/jugador/switch-club', { clubId: destinoId }, { Authorization: `Bearer ${token}` })
      setToken(data.token)
      setPlayer(data.user)
      // Recarga completa: la forma más segura de refrescar toda la data scopeada por club.
      window.location.href = '/dashboardJugadores/dashboard'
    } catch {
      setSwitching(false)
    }
  }

  return (
    <div className="relative border-b border-white/5">
      <button
        onClick={() => multi && setOpen((v) => !v)}
        disabled={!multi || switching}
        className={`w-full flex items-center gap-3 px-6 py-5 transition-colors ${multi ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default'}`}
      >
        <div className="w-8 h-8 bg-club rounded-lg flex items-center justify-center shadow-lg shadow-club/20 shrink-0 overflow-hidden">
          {clubLogo
            ? <img src={clubLogo} alt={clubNombre || 'Club'} className="w-full h-full object-cover" />
            : <Zap size={16} className="text-[#0d1117]" />}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <span className="text-white font-bold text-sm tracking-tight block truncate">{clubNombre || 'PadelwIArk'}</span>
          <span className="text-white/30 text-xs">{multi ? 'Cambiar de club' : 'Área Jugadores'}</span>
        </div>
        {switching
          ? <Loader2 size={15} className="text-white/40 animate-spin shrink-0" />
          : multi && <ChevronDown size={15} className={`text-white/30 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && multi && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl bg-[#131a24] border border-white/10 shadow-2xl py-1 max-h-64 overflow-y-auto">
            <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-white/30 font-bold">Tus clubes</p>
            {memberships.map((m) => (
              <button key={m.clubId} onClick={() => cambiar(m.clubId)} disabled={switching}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                <span className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center shrink-0 bg-club/15">
                  {m.logo
                    ? <img src={m.logo} alt="" className="w-full h-full object-cover" />
                    : <span className="text-club text-xs font-bold">{(m.clubNombre || '?').charAt(0).toUpperCase()}</span>}
                </span>
                <span className="flex-1 text-left truncate">{m.clubNombre}</span>
                {m.clubId === clubId && <Check size={15} className="text-club shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default ClubSwitcher
