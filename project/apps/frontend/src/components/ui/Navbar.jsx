import { useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, Menu, Check, CheckCheck, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'

const formatNotif = (n) => {
  switch (n.tipo) {
    case 'nueva_reserva':
      return { title: 'Nueva reserva', body: [n.jugador, n.cancha, n.fecha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'turno_fijo_pendiente':
      return { title: 'Turno fijo pendiente', body: [n.jugador, n.cancha, n.dia, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'nueva_clase_profesor':
      return { title: 'Nueva clase', body: [n.profesorNombre, n.cancha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'cancelacion_clase_profesor':
      return { title: 'Clase cancelada', body: [n.profesorNombre, n.cancha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'actualizacion_disponibilidad_profesor':
      return { title: 'Disponibilidad actualizada', body: n.profesorNombre ? `${n.profesorNombre} actualizó su disponibilidad semanal` : '' }
    case 'inscripcion_torneo':
      return { title: 'Inscripción torneo', body: [n.jugador1, n.jugador2, n.torneoNombre].filter(Boolean).join(' · ') }
    case 'stock_bajo':
      return { title: 'Bajo stock', body: [n.nombre, n.stock != null ? `quedan ${n.stock}` : ''].filter(Boolean).join(' · ') }
    default:
      return { title: n.tipo?.replace(/_/g, ' ') ?? 'Notificación', body: '' }
  }
}

const Navbar = ({ title, onMenuClick }) => {
  const user        = useAuthStore((s) => s.user)
  const token       = useAuthStore((s) => s.token)
  const logout      = useAuthStore((s) => s.logout)
  const notificaciones   = useNotificacionesStore((s) => s.notificaciones)
  const sinLeer          = useNotificacionesStore((s) => s.sinLeer())
  const marcarLeida      = useNotificacionesStore((s) => s.marcarLeida)
  const marcarTodasLeidas = useNotificacionesStore((s) => s.marcarTodasLeidas)
  const navigate = useNavigate()

  const [bellOpen, setBellOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const bellRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => { logout(); navigate('/login') }

  const recientes = [...notificaciones].slice(0, 25)

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 shrink-0">

      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">

        {/* ── Campana ── */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => { setBellOpen((v) => !v); setUserOpen(false) }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <Bell size={18} />
            {sinLeer > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {sinLeer > 9 ? '9+' : sinLeer}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header dropdown */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  Notificaciones
                  {sinLeer > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {sinLeer} sin leer
                    </span>
                  )}
                </span>
                {sinLeer > 0 && (
                  <button
                    onClick={() => marcarTodasLeidas(token)}
                    className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Marcar todas
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {recientes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">Sin notificaciones</div>
                ) : recientes.map((n) => {
                  const { title: tit, body } = formatNotif(n)
                  return (
                    <div
                      key={n.id}
                      className={['flex items-start gap-3 px-4 py-3 transition-colors', n.leida ? 'bg-white' : 'bg-brand-50/60'].join(' ')}
                    >
                      <div className={['w-2 h-2 rounded-full mt-1.5 shrink-0', n.leida ? 'bg-slate-200' : 'bg-brand-500'].join(' ')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{tit}</p>
                        {body && <p className="text-xs text-slate-500 truncate mt-0.5">{body}</p>}
                      </div>
                      {!n.leida && (
                        <button
                          onClick={() => marcarLeida(n.id, token)}
                          title="Marcar como leída"
                          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-brand-500 hover:bg-brand-100 transition-all"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Usuario ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen((v) => !v); setBellOpen(false) }}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <div className="w-8 h-8 bg-brand-500/15 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-600">{initials}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-slate-400 leading-tight capitalize">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown size={14} className={['text-slate-400 transition-transform duration-150', userOpen ? 'rotate-180' : ''].join(' ')} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || ''}</p>
                <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all font-medium"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

export default Navbar
