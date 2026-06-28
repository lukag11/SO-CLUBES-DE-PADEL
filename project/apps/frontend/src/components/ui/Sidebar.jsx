import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Zap, Info, CalendarDays, Trophy, CreditCard, LogOut, X, Users, GraduationCap, Star, Crown, Sparkles, ArrowUpRight, UserCog, LayoutDashboard } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'
import useClubStore from '../../store/clubStore'
import { useFeatures } from '../../hooks/useFeature'

// Estilo del badge de plan (vinculado a club.plan que ya provee el gating)
const PLAN_INFO = {
  basico:  { label: 'Básico',  icon: Zap,      chip: 'text-slate-200 bg-white/10' },
  pro:     { label: 'Pro',     icon: Sparkles, chip: 'text-brand-300 bg-brand-500/20' },
  premium: { label: 'Premium', icon: Crown,    chip: 'text-amber-300 bg-amber-500/20' },
}

// feature: módulo del gating de plan · permiso/permisoAny: permiso del empleado
// (el dueño ve todo) · ownerOnly: solo el dueño (config/diseño/equipo)
const navItems = [
  { to: '/dashboardAdmin',           label: 'Resumen',   icon: LayoutDashboard, end: true },
  { to: '/dashboardAdmin/club',      label: 'Club',      icon: Info,          ownerOnly: true },
  { to: '/dashboardAdmin/reservas',  label: 'Reservas',  icon: CalendarDays,  permiso: 'reservas' },
  { to: '/dashboardAdmin/jugadores', label: 'Jugadores', icon: Users,         permiso: 'jugadores' },
  { to: '/dashboardAdmin/clases',    label: 'Clases',    icon: GraduationCap, feature: 'profesores', permiso: 'clases' },
  { to: '/dashboardAdmin/torneos',   label: 'Torneos',   icon: Trophy,        feature: 'torneos',    permiso: 'torneos' },
  { to: '/dashboardAdmin/sponsors',  label: 'Sponsors',  icon: Star,          feature: 'sponsors',   permiso: 'sponsors' },
  { to: '/dashboardAdmin/pagos',     label: 'Finanzas',  icon: CreditCard,    feature: 'finanzas',   permisoAny: ['ventas', 'caja'] },
  { to: '/dashboardAdmin/equipo',    label: 'Equipo',    icon: UserCog,       ownerOnly: true },
]

// ¿El admin (dueño o empleado) puede ver este ítem según sus permisos?
export const puedeVerItem = (i, esDueno, permisos) => {
  if (esDueno) return true
  if (i.ownerOnly) return false
  if (i.permisoAny) return i.permisoAny.some((p) => permisos?.includes(p))
  if (i.permiso) return !!permisos?.includes(i.permiso)
  return true
}

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const [hovered, setHovered] = useState(false)
  const navigate   = useNavigate()
  const logout     = useAuthStore((state) => state.logout)
  const sinLeer        = useNotificacionesStore((state) => state.sinLeer())
  const sinLeerTorneos = useNotificacionesStore((state) => state.sinLeerTorneos())
  const clubNombre = useClubStore((state) => state.club.nombre)
  const clubLogo   = useClubStore((state) => state.club.logo)
  const features   = useFeatures()
  const plan       = useAuthStore((state) => state.user?.club?.plan)
  const permisos   = useAuthStore((state) => state.user?.permisos)
  const esDueno    = useAuthStore((state) => state.user?.rol) !== 'staff' // owner o sin definir = dueño
  const items = navItems.filter((i) =>
    (!i.feature || (features && features.includes(i.feature))) &&
    puedeVerItem(i, esDueno, permisos)
  )
  const planInfo = PLAN_INFO[plan]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const expanded = hovered

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-0 left-0 h-screen bg-dark-900 flex flex-col z-40 transition-all duration-200
        ${expanded ? 'lg:w-60' : 'lg:w-16'}
        ${mobileOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0'}`}
    >

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
        className={`flex items-center gap-3 py-5 border-b border-white/5 hover:opacity-80 transition-opacity shrink-0 ${expanded ? 'px-6' : 'justify-center px-0'}`}
      >
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0 overflow-hidden">
          {clubLogo
            ? <img src={clubLogo} alt={clubNombre} className="w-full h-full object-cover" />
            : <Zap size={16} className="text-white" />
          }
        </div>
        {expanded && (
          <span className="text-white font-bold text-lg tracking-tight truncate">
            {clubNombre || 'PadelwIArk'}
          </span>
        )}
      </Link>

      {/* Tarjeta de plan (+ upsell) — solo el dueño la ve.
          Fade + colapso de altura con delay y overflow-hidden: al expandir/colapsar el
          sidebar la card no "salta" mientras el ancho del aside transiciona. Ancho fijo
          (w-[216px]) para que su contenido no se reacomode con el ancho del aside. */}
      {planInfo && esDueno && (
        <div className={`px-3 shrink-0 overflow-hidden transition-all duration-200 ${expanded ? 'pt-3 max-h-40 opacity-100 delay-100' : 'max-h-0 pt-0 opacity-0 pointer-events-none'}`}>
          <div className="relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.07] to-transparent p-3 w-[216px] max-w-full">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${planInfo.chip}`}>
                <planInfo.icon size={16} />
              </span>
              <div className="leading-tight min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-white/40">Tu plan</p>
                <p className="text-sm font-bold text-white truncate">{planInfo.label}</p>
              </div>
            </div>
            {plan !== 'premium' ? (
              <a
                href="/padelwiark#precios"
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-dark-900 text-xs font-bold py-2 hover:opacity-90 transition-opacity"
              >
                Mejorar plan <ArrowUpRight size={13} />
              </a>
            ) : (
              <p className="mt-2.5 text-[10px] text-white/40 flex items-center gap-1">
                <Crown size={11} className="text-amber-300" /> Acceso completo
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={!expanded ? label : undefined}
            className={({ isActive }) =>
              [
                'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5',
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-brand-400 shrink-0' : 'text-white/40 shrink-0'} />

                {expanded && (
                  <>
                    <span className="flex-1">{label}</span>
                    {to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {sinLeer > 9 ? '9+' : sinLeer}
                      </span>
                    )}
                    {to === '/dashboardAdmin/torneos' && sinLeerTorneos > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {sinLeerTorneos > 9 ? '9+' : sinLeerTorneos}
                      </span>
                    )}
                  </>
                )}

                {/* Badge en modo colapsado */}
                {!expanded && to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {!expanded && to === '/dashboardAdmin/torneos' && sinLeerTorneos > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}

                {/* Tooltip en modo colapsado */}
                {!expanded && (
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-dark-900 border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                    {label}
                    {to === '/dashboardAdmin/reservas' && sinLeer > 0 && (
                      <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sinLeer}</span>
                    )}
                    {to === '/dashboardAdmin/torneos' && sinLeerTorneos > 0 && (
                      <span className="ml-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sinLeerTorneos}</span>
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
          title={!expanded ? 'Cerrar sesión' : undefined}
          className={`group relative flex items-center rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 w-full ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}`}
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span>Cerrar sesión</span>}
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-dark-900 border border-white/10 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>

    </aside>
  )
}

export default Sidebar
