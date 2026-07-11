import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Menu, X, GraduationCap, User, Swords } from 'lucide-react'
import useClubStore from '../../store/clubStore'
import { hayContacto } from '../../features/landing/landingUtils'

// CENTRO = navegar el sitio. El último (Americano y Super 8) va destacado con el color del club.
const navLinks = [
  { to: '/#nosotros', label: 'Quiénes Somos' },
  { to: '/#reservas', label: 'Reservas' },
  { to: '/torneos', label: 'Torneos', route: true },
  { to: '/#contacto', label: 'Contacto' },
  { to: '/partidos', label: 'Partidos', route: true, destacado: true, icon: Swords },
  { to: '/eventos', label: 'Americano y Super 8', route: true, destacado: true },
]

const PublicNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const club = useClubStore((s) => s.club)
  const { templateId, colorPrimario, navbarEstilo, nombre, logo } = club
  const isLight = templateId === 3
  const esColorSolido = navbarEstilo === 'color-solido' && !isLight

  // Los links de ancla solo se muestran si su sección existe en la landing (así no llevan a la nada).
  const verNosotros = !!(club.historia && club.historia.trim()) && (club.seccionesVisibles?.historia ?? true)
  const verReservas = club.seccionesVisibles?.reservas ?? true
  const links = navLinks.filter((l) =>
    l.to === '/#nosotros' ? verNosotros
      : l.to === '/#reservas' ? verReservas
        : l.to === '/#contacto' ? hayContacto(club)
          : true)

  useEffect(() => {
    if (navbarEstilo !== 'transparente') return
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [navbarEstilo])

  const headerClass = (() => {
    if (isLight) return 'bg-white border-b border-slate-200'
    if (navbarEstilo === 'transparente') {
      return scrolled
        ? 'bg-[#0d1117]/90 backdrop-blur-md border-b border-white/10'
        : 'bg-transparent border-b border-transparent'
    }
    if (navbarEstilo === 'color-solido') return 'border-b border-black/10'
    return 'bg-[#1E1F23] border-b border-white/5'
  })()

  const headerStyle = esColorSolido ? { backgroundColor: colorPrimario } : {}

  const linkColor = esColorSolido
    ? 'text-black/70 hover:text-black hover:bg-black/10'
    : isLight
      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      : 'text-white/70 hover:text-white hover:bg-white/5'

  const logoTextColor = esColorSolido ? 'text-black' : isLight ? 'text-slate-900' : 'text-white'
  const dividerColor = esColorSolido ? 'bg-black/15' : isLight ? 'bg-slate-200' : 'bg-white/10'

  // Render de un link del centro. `destacado` lo pinta con el acento del club.
  const renderNavLink = (item, onClick) => {
    const { to, label, route, destacado, icon } = item
    const Cmp = route ? Link : 'a'
    const props = route ? { to } : { href: to }
    if (destacado) {
      const Icono = icon || Zap
      const cls = 'flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap'
      const extra = esColorSolido ? 'bg-black/15 hover:bg-black/25 text-black' : 'hover:brightness-110'
      const style = esColorSolido
        ? undefined
        : { color: colorPrimario, backgroundColor: `${colorPrimario}1a`, border: `1px solid ${colorPrimario}40` }
      return (
        <Cmp key={to} {...props} onClick={onClick} className={`${cls} ${extra}`} style={style}>
          <Icono size={14} /> {label}
        </Cmp>
      )
    }
    return (
      <Cmp key={to} {...props} onClick={onClick}
        className={`px-3.5 py-2 text-sm font-medium transition-colors duration-150 rounded-lg whitespace-nowrap ${linkColor}`}>
        {label}
      </Cmp>
    )
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`} style={headerStyle}>
      <div className="max-w-[1600px] mx-auto px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-8">

        {/* IZQUIERDA — identidad del club */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
            style={{ backgroundColor: logo ? 'transparent' : (esColorSolido ? 'rgba(0,0,0,0.15)' : colorPrimario) }}
          >
            {logo
              ? <img src={logo} alt={nombre || 'Club'} className="w-full h-full object-contain" />
              : <Zap size={16} className={esColorSolido ? 'text-black/70' : isLight ? 'text-white' : 'text-[#1E1F23]'} />
            }
          </div>
          <span className={`font-bold text-lg tracking-tight whitespace-nowrap ${logoTextColor}`}>{nombre || 'PadelwIArk'}</span>
        </Link>

        {/* CENTRO — navegar el sitio */}
        <nav className="hidden md:flex items-center justify-center gap-2">
          {links.map((item) => renderNavLink(item))}
        </nav>

        {/* DERECHA — acceder */}
        <div className="flex items-center justify-end gap-1">
          <div className="hidden md:flex items-center gap-2">
            <Link to="/dashboardJugadores" className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${linkColor}`}>
              <User size={15} /> Jugadores
            </Link>
            <Link to="/dashboardProfesor" className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${linkColor}`}>
              <GraduationCap size={15} /> Profesores
            </Link>
          </div>

          {/* Hamburguesa mobile */}
          <button
            className={`md:hidden ${isLight || navbarEstilo === 'color-solido' ? 'text-black/60 hover:text-black' : 'text-white/70 hover:text-white'}`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menú mobile */}
      {menuOpen && (
        <div className="md:hidden border-t px-6 py-4 flex flex-col gap-1"
          style={esColorSolido
            ? { backgroundColor: colorPrimario, borderColor: 'rgba(0,0,0,0.1)' }
            : isLight
              ? { backgroundColor: 'white', borderColor: '#e2e8f0' }
              : { backgroundColor: '#1E1F23', borderColor: 'rgba(255,255,255,0.05)' }
          }
        >
          {links.map((item) => renderNavLink(item, () => setMenuOpen(false)))}

          <span className={`h-px my-2.5 ${dividerColor}`} />
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${esColorSolido ? 'text-black/40' : isLight ? 'text-slate-400' : 'text-white/30'}`}>Acceso</p>

          <Link to="/dashboardJugadores" onClick={() => setMenuOpen(false)} className={`flex items-center gap-2 py-2.5 text-sm font-medium transition-colors ${linkColor}`}>
            <User size={15} /> Jugadores
          </Link>
          <Link to="/dashboardProfesor" onClick={() => setMenuOpen(false)} className={`flex items-center gap-2 py-2.5 text-sm font-medium transition-colors ${linkColor}`}>
            <GraduationCap size={15} /> Profesores
          </Link>
        </div>
      )}
    </header>
  )
}

export default PublicNavbar
