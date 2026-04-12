import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Zap, CalendarDays, Clock, LayoutDashboard, LogOut, GraduationCap } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'

const navItems = [
  { to: '/dashboardProfesor/agenda',          label: 'Mi agenda',          icon: CalendarDays  },
  { to: '/dashboardProfesor/disponibilidad',  label: 'Mi disponibilidad',  icon: Clock         },
]

const ProfesorLayout = () => {
  const { isAuthenticated, profesor, logout } = useAuthProfesorStore()
  const navigate = useNavigate()

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

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-60 bg-[#0d1117] border-r border-white/5 flex flex-col z-20">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center shadow-lg shadow-orange-400/25 shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight block">PadelOS</span>
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
      <div className="flex-1 flex flex-col ml-60">
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProfesorLayout
