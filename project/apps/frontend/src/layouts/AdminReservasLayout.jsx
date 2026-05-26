import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, BarChart2 } from 'lucide-react'

const AdminReservasLayout = () => (
  <div className="flex flex-col gap-5">
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
      <NavLink
        end
        to="/dashboardAdmin/reservas"
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`
        }
      >
        <CalendarDays size={14} />
        Grilla
      </NavLink>
      <NavLink
        to="/dashboardAdmin/reservas/estadisticas"
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`
        }
      >
        <BarChart2 size={14} />
        Estadísticas
      </NavLink>
    </div>
    <Outlet />
  </div>
)

export default AdminReservasLayout
