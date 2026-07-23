import { useState, useEffect } from 'react'
import { UserPlus, Check, Loader2 } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

// Red unificada (E3, frontend): en la landing de un club (/club/:slug), si hay un JUGADOR LOGUEADO
// que todavía NO es miembro de ESTE club, le ofrece unirse con su misma cuenta (un clic). Resuelve
// el caso "ya tengo cuenta en Tancacha y ahora entro al link de Río Tercero". No aparece para
// visitantes sin login (esos usan el registro normal) ni para quien ya es socio del club.
const UnirmeBanner = () => {
  const token = usePlayerStore((s) => s.token)
  const isAuth = usePlayerStore((s) => s.isAuthenticated)
  const clubId = useClubStore((s) => s.club.id)
  const clubNombre = useClubStore((s) => s.club.nombre)
  const [estado, setEstado] = useState('cargando') // cargando | no_miembro | unido | oculto
  const [uniendo, setUniendo] = useState(false)

  useEffect(() => {
    if (!isAuth || !token || !clubId) { setEstado('oculto'); return }
    let activo = true
    api.get('/auth/jugador/me', { Authorization: `Bearer ${token}` })
      .then((r) => {
        if (!activo) return
        const esMiembro = (r.memberships || []).some((m) => m.clubId === clubId)
        setEstado(esMiembro ? 'oculto' : 'no_miembro')
      })
      .catch(() => { if (activo) setEstado('oculto') })
    return () => { activo = false }
  }, [isAuth, token, clubId])

  const unirme = async () => {
    if (uniendo) return
    setUniendo(true)
    try {
      await api.post('/auth/jugador/unirme', { clubId }, { Authorization: `Bearer ${token}` })
      setEstado('unido')
      setTimeout(() => setEstado('oculto'), 4000)
    } catch {
      setUniendo(false)
    }
  }

  if (estado === 'oculto' || estado === 'cargando') return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,460px)] animate-[fadeInUp_.35s_ease-out]">
      <div className="flex items-center gap-3 rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl px-4 py-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--club-primary) 20%, transparent)' }}>
          {estado === 'unido'
            ? <Check size={18} style={{ color: 'var(--club-primary)' }} />
            : <UserPlus size={18} style={{ color: 'var(--club-primary)' }} />}
        </span>
        {estado === 'unido' ? (
          <p className="flex-1 text-sm text-white/85 leading-tight">
            ¡Te uniste a <b className="text-white">{clubNombre}</b>! Ya podés reservar acá. 🎾
          </p>
        ) : (
          <>
            <p className="flex-1 text-sm text-white/80 leading-tight">
              ¿Jugás en <b className="text-white">{clubNombre}</b>? Sumate con tu cuenta.
            </p>
            <button onClick={unirme} disabled={uniendo}
              className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold text-[#0d1117] disabled:opacity-60 flex items-center gap-1.5"
              style={{ background: 'var(--club-primary)' }}>
              {uniendo ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {uniendo ? 'Uniéndote…' : 'Unirme'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default UnirmeBanner
