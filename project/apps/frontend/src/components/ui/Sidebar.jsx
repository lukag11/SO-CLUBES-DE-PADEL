import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Zap, Info, CalendarDays, Trophy, CreditCard, LogOut } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'

const navItems = [
  { to: '/dashboardAdmin/club', label: 'Club', icon: Info },
  { to: '/dashboardAdmin/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/dashboardAdmin/torneos', label: 'Torneos', icon: Trophy },
  { to: '/dashboardAdmin/pagos', label: 'Pagos', icon: CreditCard },
]

const Sidebar = () => {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const sinLeer = useNotificacionesStore((state) => state.sinLeer())

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-dark-900 flex flex-col z-20">

      {/* Logo */}
      <Link to="/dashboardAdmin" className="flex items-center gap-3 px-6 py-5 border-b border-white/5 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PadelOS</span>
      </Link>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={isActive ? 'text-brand-400' : 'text-white/40'}
                />
                <span className="flex-1">{label}</span>
                {/* Badge notificaciones en Reservas */}
                {to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {sinLeer > 9 ? '9+' : sinLeer}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 w-full"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
