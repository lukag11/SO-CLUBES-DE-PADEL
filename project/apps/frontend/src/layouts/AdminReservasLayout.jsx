import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, BarChart2, Megaphone } from 'lucide-react'

const tabCls = ({ isActive }) =>
  `flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
    isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
  }`

const AdminReservasLayout = () => (
  <div className="flex flex-col gap-5">
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto no-scrollbar">
      <NavLink end to="/dashboardAdmin/reservas" className={tabCls}>
        <CalendarDays size={14} /> Grilla
      </NavLink>
      <NavLink to="/dashboardAdmin/reservas/estadisticas" className={tabCls}>
        <BarChart2 size={14} /> Estadísticas
      </NavLink>
      <NavLink to="/dashboardAdmin/reservas/americano-super8" className={tabCls}>
        <Megaphone size={14} />
        <span className="sm:hidden">Americ. y Super 8</span>
        <span className="hidden sm:inline">Americano y Super 8</span>
      </NavLink>
    </div>
    <Outlet />
  </div>
)

export default AdminReservasLayout
