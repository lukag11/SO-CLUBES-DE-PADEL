import { useState, useEffect, useRef } from 'react'
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Zap, CalendarDays, Clock, LogOut, Menu, X, Bell, Check, CheckCheck } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useClubStore from '../store/clubStore'
import useProfesorNotificationsStore from '../store/profesorNotificationsStore'
import { api } from '../lib/api'

const navItems = [
  { to: '/dashboardProfesor/agenda',          label: 'Mi agenda',          icon: CalendarDays  },
  { to: '/dashboardProfesor/disponibilidad',  label: 'Mi disponibilidad',  icon: Clock         },
]

const ProfesorLayout = () => {
  const { isAuthenticated, profesor, token, logout, setProfesor } = useAuthProfesorStore()
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const clubNombre = useClubStore((s) => s.club?.nombre)
  const clubLogo = useClubStore((s) => s.club?.logo)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const fetchNotif        = useProfesorNotificationsStore((s) => s.fetchNotificaciones)
  const notificaciones    = useProfesorNotificationsStore((s) => s.notificaciones)
  const sinLeer           = useProfesorNotificationsStore((s) => s.sinLeer())
  const marcarLeida       = useProfesorNotificationsStore((s) => s.marcarLeida)
  const marcarTodasLeidas = useProfesorNotificationsStore((s) => s.marcarTodasLeidas)

  useEffect(() => { if (token) fetchNotif(token) }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Refresca datos del profesor al montar; luego carga la config del club
  useEffect(() => {
    if (!token) return
    api.get('/auth/profesor/me', { Authorization: `Bearer ${token}` })
      .then((data) => {
        if (data?.id) {
          setProfesor(data)
          if (data.club?.slug) {
            api.get(`/clubs/${data.club.slug}`, {})
              .then((club) => { if (club?.id) loadFromBackend(club) })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) {
    return <Navigate to="/dashboardProfesor" replace />
  }

  const initials = profesor
    ? `${profesor.nombre?.[0] || ''}${profesor.apellido?.[0] || ''}`.toUpperCase()
    : 'P'

  const handleLogout = () => {
    logout()
    navigate('/dashboardProfesor')
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen w-60 bg-[#0d1117] border-r border-white/5 flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Botón cerrar (solo mobile) */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center shadow-lg shadow-orange-400/25 shrink-0 overflow-hidden">
            {clubLogo
              ? <img src={clubLogo} alt={clubNombre || 'Club'} className="w-full h-full object-cover" />
              : <Zap size={16} className="text-white" />
            }
          </div>
          <div className="min-w-0">
            <span className="text-white font-bold text-sm tracking-tight block truncate">{clubNombre || 'PadelOS'}</span>
            <span className="text-white/30 text-xs">Área Profesores</span>
          </div>
        </div>

        {/* Avatar profesor */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-orange-400">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profesor?.nombre} {profesor?.apellido}
              </p>
              <p className="text-white/30 text-xs truncate">{profesor?.especialidad || 'Profesor'}</p>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-orange-400/12 text-orange-400 border border-orange-400/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-orange-400' : 'text-white/30'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-400/8 transition-all w-full"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0 flex flex-col lg:ml-60">

        {/* Top bar — visible en todos los tamaños */}
        <header className="h-14 bg-[#0d1117] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          {/* Hamburger (solo mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu size={18} />
          </button>
          <span className="lg:hidden text-white font-bold text-sm tracking-tight truncate">{clubNombre || 'PadelOS'}</span>
          <div className="hidden lg:block" />

          {/* Campana */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all"
            >
              <Bell size={17} />
              {sinLeer > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-orange-400 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                  {sinLeer > 9 ? '9+' : sinLeer}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-11 w-80 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    Notificaciones
                    {sinLeer > 0 && (
                      <span className="bg-orange-400/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {sinLeer} sin leer
                      </span>
                    )}
                  </span>
                  {sinLeer > 0 && (
                    <button
                      onClick={() => marcarTodasLeidas(token)}
                      className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck size={12} />
                      Marcar todas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notificaciones.length === 0 ? (
                    <div className="px-4 py-8 text-center text-white/30 text-sm">Sin notificaciones</div>
                  ) : notificaciones.slice(0, 25).map((n) => {
                    const title = n.tipo === 'clase_cancelada_admin'
                      ? 'Clase cancelada por el admin'
                      : n.tipo?.replace(/_/g, ' ') ?? 'Notificación'
                    const body = [n.canchaNombre, n.fecha, n.horaInicio && n.horaFin ? `${n.horaInicio}–${n.horaFin}` : ''].filter(Boolean).join(' · ')
                    return (
                      <div
                        key={n.id}
                        className={['flex items-start gap-3 px-4 py-3 transition-colors', n.leida ? '' : 'bg-orange-400/5'].join(' ')}
                      >
                        <div className={['w-2 h-2 rounded-full mt-1.5 shrink-0', n.leida ? 'bg-white/10' : 'bg-orange-400'].join(' ')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80">{title}</p>
                          {body && <p className="text-xs text-white/40 truncate mt-0.5">{body}</p>}
                        </div>
                        {!n.leida && (
                          <button
                            onClick={() => marcarLeida(n.id, token)}
                            title="Marcar como leída"
                            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-orange-400 hover:bg-orange-400/10 transition-all"
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
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProfesorLayout
