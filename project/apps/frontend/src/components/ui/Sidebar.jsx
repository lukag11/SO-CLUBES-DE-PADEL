import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Zap, Info, CalendarDays, Trophy, CreditCard, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'
import useClubStore from '../../store/clubStore'

const navItems = [
  { to: '/dashboardAdmin/club',     label: 'Club',     icon: Info },
  { to: '/dashboardAdmin/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/dashboardAdmin/torneos',  label: 'Torneos',  icon: Trophy },
  { to: '/dashboardAdmin/pagos',    label: 'Pagos',    icon: CreditCard },
]

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const navigate   = useNavigate()
  const logout     = useAuthStore((state) => state.logout)
  const sinLeer    = useNotificacionesStore((state) => state.sinLeer())
  const clubNombre = useClubStore((state) => state.club.nombre)
  const clubLogo   = useClubStore((state) => state.club.logo)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-dark-900 flex flex-col z-40 transition-all duration-300 w-60 ${collapsed ? 'lg:w-16' : 'lg:w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

      {/* Botón cerrar (solo mobile) */}
      <button
        onClick={onMobileClose}
        className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
      >
        <X size={16} />
      </button>

      {/* Logo */}
      <Link
        to="/dashboardAdmin"
        className={`flex items-center gap-3 py-5 border-b border-white/5 hover:opacity-80 transition-opacity shrink-0 ${collapsed ? 'justify-center px-0' : 'px-6'}`}
      >
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0 overflow-hidden">
          {clubLogo
            ? <img src={clubLogo} alt={clubNombre} className="w-full h-full object-cover" />
            : <Zap size={16} className="text-white" />
          }
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight truncate">
            {clubNombre || 'PadelOS'}
          </span>
        )}
      </Link>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              [
                'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-brand-400 shrink-0' : 'text-white/40 shrink-0'} />

                {!collapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {sinLeer > 9 ? '9+' : sinLeer}
                      </span>
                    )}
                  </>
                )}

                {/* Badge en modo colapsado */}
                {collapsed && to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}

                {/* Tooltip en modo colapsado */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-dark-900 border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                    {label}
                    {to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                      <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sinLeer}</span>
                    )}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`group relative flex items-center rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 w-full ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-dark-900 border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>

      {/* Botón toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-dark-900 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all duration-150 shadow-md"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

    </aside>
  )
}

export default Sidebar
