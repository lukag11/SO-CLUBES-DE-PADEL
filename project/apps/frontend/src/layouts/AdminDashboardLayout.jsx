import { useState, useRef, useEffect } from 'react'
import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Trophy, CreditCard, Info } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useNotificacionesStore from '../store/notificacionesStore'
import useClubStore from '../store/clubStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import Sidebar from '../components/ui/Sidebar'
import Navbar from '../components/ui/Navbar'
import usePageTitle from '../hooks/usePageTitle'
import { api } from '../lib/api'

const BOTTOM_NAV_ITEMS = [
  { to: '/dashboardAdmin',          label: 'Inicio',    icon: LayoutDashboard, exact: true },
  { to: '/dashboardAdmin/reservas', label: 'Reservas',  icon: CalendarDays },
  { to: '/dashboardAdmin/torneos',  label: 'Torneos',   icon: Trophy },
  { to: '/dashboardAdmin/pagos',    label: 'Pagos',     icon: CreditCard },
  { to: '/dashboardAdmin/club',     label: 'Club',      icon: Info },
]

const BottomNav = ({ visible }) => {
  const sinLeer = useNotificacionesStore((s) => s.sinLeer())

  return (
    <nav
      style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-dark-900 border-t border-white/8 transition-transform duration-300"
    >
      <div className="flex items-stretch h-14">
        {BOTTOM_NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const badge = to.includes('reservas') && sinLeer > 0 ? sinLeer : null
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors duration-150',
                isActive ? 'text-brand-400' : 'text-white/35 hover:text-white/60',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-[20%] right-[20%] h-[2px] bg-brand-400 rounded-b-full" />
                  )}
                  <div className="relative">
                    <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                    {badge && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-medium leading-none ${isActive ? 'text-brand-400' : 'text-white/30'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

const DashboardLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const clubId = useAuthStore((s) => s.user?.club?.id)
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const setTurnosFijos = useTurnosFijosStore((s) => s.setTurnosFijos)
  const title = usePageTitle()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const mainRef = useRef(null)

  // Carga datos actualizados del admin desde el backend
  useEffect(() => {
    if (!token) return
    api.get('/auth/admin/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) setUser(data) })
      .catch(() => {})
  }, [token])

  // Carga config del club desde el backend al montar el layout (con canchas reales)
  useEffect(() => {
    if (!token) return
    api.get('/clubs/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) loadFromBackend(data) })
      .catch(() => {})
  }, [token])

  // Carga turnos fijos del club desde el backend al montar
  useEffect(() => {
    if (!token || !clubId) return
    api.get(`/turnos-fijos?clubId=${clubId}`, { Authorization: `Bearer ${token}` })
      .then((data) => { if (Array.isArray(data)) setTurnosFijos(data) })
      .catch(() => {})
  }, [token, clubId])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let lastY = 0
    const onScroll = () => {
      const y = el.scrollTop
      if (y > lastY && y > 40) setNavVisible(false)
      else setNavVisible(true)
      lastY = y
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col h-full lg:ml-16">
        <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main ref={mainRef} className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav visible={navVisible} />
    </div>
  )
}

export default DashboardLayout
