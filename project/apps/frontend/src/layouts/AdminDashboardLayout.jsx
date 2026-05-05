import { useState, useRef, useEffect } from 'react'
import { Outlet, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Trophy, CreditCard, Info } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useNotificacionesStore from '../store/notificacionesStore'
import Sidebar from '../components/ui/Sidebar'
import Navbar from '../components/ui/Navbar'
import usePageTitle from '../hooks/usePageTitle'

const SIDEBAR_KEY = 'admin_sidebar_collapsed'

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
  const title = usePageTitle()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true'
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const mainRef = useRef(null)

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

  const handleToggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_KEY, String(!prev))
      return !prev
    })
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
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className={`flex-1 min-w-0 flex flex-col h-full transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
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
