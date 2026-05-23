import { useState, useEffect } from 'react'
import { Outlet, Navigate, NavLink, useNavigate, Link } from 'react-router-dom'
import { Zap, BarChart2, Trophy, Users, LogOut, LayoutDashboard, UserCircle, Repeat, CalendarDays, Bell, Menu, X, ClipboardList } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

const navItems = [
  { to: '/dashboardJugadores/dashboard',    label: 'Mi resumen',       icon: LayoutDashboard },
  { to: '/dashboardJugadores/reservas',     label: 'Reservar cancha',  icon: CalendarDays },
  { to: '/dashboardJugadores/mis-reservas', label: 'Mis reservas',     icon: ClipboardList },
  { to: '/dashboardJugadores/turnos-fijos', label: 'Mis turnos fijos', icon: Repeat },
  { to: '/dashboardJugadores/estadisticas', label: 'Estadísticas',     icon: BarChart2 },
  { to: '/dashboardJugadores/torneos',      label: 'Mis torneos',      icon: Trophy },
  { to: '/dashboardJugadores/oponentes',    label: 'Oponentes',        icon: Users },
  { to: '/dashboardJugadores/perfil',       label: 'Mi perfil',        icon: UserCircle },
]

const PlayerLayout = () => {
  const { isAuthenticated, player, token } = usePlayerStore()
  const logout = usePlayerStore((s) => s.logout)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const { notificaciones, locales, fetchNotificaciones } = usePlayerNotificationsStore()
  const sinLeer = [...notificaciones, ...locales].filter((n) => !n.leida).length
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const setReservas = useReservasStore((s) => s.setReservas)
  const setTurnosFijos = useTurnosFijosStore((s) => s.setTurnosFijos)
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cuentaBajaMsg, setCuentaBajaMsg] = useState(null)

  // Intercepta evento de cuenta dada de baja
  useEffect(() => {
    const handler = (e) => {
      setCuentaBajaMsg(e.detail || 'Tu cuenta fue dada de baja. Contactá al club.')
    }
    window.addEventListener('jugador:cuenta-inactiva', handler)
    return () => window.removeEventListener('jugador:cuenta-inactiva', handler)
  }, [])

  const handleCuentaBajaConfirm = () => {
    logout()
    navigate('/jugadores')
  }

  // Carga datos actualizados del jugador desde el backend
  useEffect(() => {
    if (!token) return
    api.get('/jugadores/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) setPlayer(data) })
      .catch(() => {})
  }, [token])

  // Carga config del club al montar. Si hay cambios locales sin guardar (_dirty=true),
  // no re-fetcheamos para no pisar lo que el admin acaba de configurar.
  useEffect(() => {
    if (!token) return
    if (useClubStore.getState()._dirty) return
    api.get('/clubs/info', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) loadFromBackend(data) })
      .catch(() => {})
  }, [token])

  // Cuando el usuario vuelve a esta pestaña (cambios admin guardados en otra pestaña),
  // re-fetcheamos solo si NO hay cambios locales pendientes.
  useEffect(() => {
    if (!token) return
    const recargar = () => {
      if (document.hidden) return
      if (useClubStore.getState()._dirty) return
      api.get('/clubs/info', { Authorization: `Bearer ${token}` })
        .then((data) => { if (data?.id) loadFromBackend(data) })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', recargar)
    return () => document.removeEventListener('visibilitychange', recargar)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carga las reservas propias del jugador desde el backend al montar el layout
  useEffect(() => {
    if (!token) return
    api.get('/reservas/me', { Authorization: `Bearer ${token}` })
      .then((data) => {
        if (!Array.isArray(data)) return
        setReservas(data.map((r) => ({
          id: r.id,
          canchaId: r.canchaId,
          canchaNombre: r.cancha?.nombre ?? '',
          canchaInfo: r.cancha ? `${r.cancha.tipo ?? 'Padel'} · ${r.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
          fecha: r.fecha,
          hora: r.horaInicio,
          horaFin: r.horaFin,
          precio: r.precio,
          esTurnoFijo: r.esTurnoFijo,
          jugador: player ? `${player.nombre} ${player.apellido ?? ''}`.trim() : '',
          estado: r.estado,
          _aprobadoPorAdmin: r.estado === 'confirmada',
        })))
      })
      .catch(() => { /* mantiene reservas en memoria como fallback */ })
  }, [token])

  // Carga turnos fijos del jugador + polling cada 30s
  useEffect(() => {
    if (!token) return
    const fetch = () =>
      api.get('/turnos-fijos/me', { Authorization: `Bearer ${token}` })
        .then((data) => { if (Array.isArray(data)) setTurnosFijos(data) })
        .catch(() => {})
    fetch()
    const interval = setInterval(fetch, 30_000)
    const onFocus = () => fetch()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [token])

  // Carga notificaciones del backend al montar y refresca cada 30s
  useEffect(() => {
    if (!token) return
    fetchNotificaciones()
    const interval = setInterval(fetchNotificaciones, 30_000)
    return () => clearInterval(interval)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) {
    return <Navigate to="/dashboardJugadores" replace />
  }

  const initials = player
    ? `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()
    : 'J'

  const handleLogout = () => {
    logout()
    navigate('/dashboardJugadores')
  }

  return (
    <div className="public-font min-h-screen bg-[#0a0e1a] flex">

      {/* Modal cuenta dada de baja */}
      {cuentaBajaMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden text-center"
            style={{ background: 'linear-gradient(135deg, #0f1922 0%, #0d1117 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px rgba(0,0,0,0.7), 0 0 40px rgba(239,68,68,0.12)' }}
          >
            <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <LogOut size={28} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Cuenta desactivada</h3>
                <p className="text-sm text-slate-400">{cuentaBajaMsg}</p>
              </div>
              <button
                onClick={handleCuentaBajaConfirm}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
              >
                Entendido, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar jugador */}
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
          <div className="w-8 h-8 bg-[#afca0b] rounded-lg flex items-center justify-center shadow-lg shadow-[#afca0b]/20 shrink-0">
            <Zap size={16} className="text-[#0d1117]" />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight block">PadelOS</span>
            <span className="text-white/30 text-xs">Área Jugadores</span>
          </div>
        </div>

        {/* Avatar jugador */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 bg-[#afca0b]/15 border border-[#afca0b]/25 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#afca0b]">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {player?.nombre} {player?.apellido}
              </p>
              <p className="text-white/30 text-xs">DNI {player?.dni}</p>
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
                    ? 'bg-[#afca0b]/12 text-[#afca0b] border border-[#afca0b]/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-[#afca0b]' : 'text-white/30'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bell + Logout */}
        <div className="px-3 py-4 border-t border-white/5 flex flex-col gap-1">
          <Link
            to="/dashboardJugadores/notificaciones"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="relative">
              <Bell size={17} className="text-white/30" />
              {sinLeer > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {sinLeer > 9 ? '9+' : sinLeer}
                </span>
              )}
            </div>
            Notificaciones
            {sinLeer > 0 && (
              <span className="ml-auto bg-red-500/15 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {sinLeer}
              </span>
            )}
          </Link>
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
        {/* Navbar mobile jugador */}
        <header className="lg:hidden h-14 bg-[#0d1117] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu size={18} />
          </button>
          <span className="text-white font-bold text-sm tracking-tight">PadelOS</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default PlayerLayout
