import { Bell, ChevronDown, Menu } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const Navbar = ({ title, onMenuClick }) => {
  const user = useAuthStore((state) => state.user)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6">

      <div className="flex items-center gap-3">
        {/* Hamburger (solo mobile) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <Menu size={18} />
        </button>

        {/* Título de la sección actual */}
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      </div>

      {/* Acciones derecha */}
      <div className="flex items-center gap-3">

        {/* Notificaciones */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        {/* Avatar + nombre */}
        <button className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all">
          <div className="w-8 h-8 bg-brand-500/15 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-brand-600">{initials}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-400 leading-tight capitalize">{user?.role || 'admin'}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default Navbar
