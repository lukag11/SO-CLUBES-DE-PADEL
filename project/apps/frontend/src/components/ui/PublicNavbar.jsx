import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Menu, X } from 'lucide-react'
import useClubStore from '../../store/clubStore'

const navLinks = [
  { to: '/#quienes-somos', label: 'Quiénes Somos' },
  { to: '/#reservas', label: 'Reservas' },
  { to: '/#torneos', label: 'Torneos' },
  { to: '/#contacto', label: 'Contacto' },
]

const PublicNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { templateId, colorPrimario, navbarEstilo } = useClubStore((s) => s.club)
  const isLight = templateId === 3

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

  const headerStyle = navbarEstilo === 'color-solido' && !isLight
    ? { backgroundColor: colorPrimario }
    : {}

  const linkColor = (navbarEstilo === 'color-solido' && !isLight)
    ? 'text-black/70 hover:text-black hover:bg-black/10'
    : isLight
      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      : 'text-white/70 hover:text-white hover:bg-white/5'

  const logoTextColor = (navbarEstilo === 'color-solido' && !isLight)
    ? 'text-black'
    : isLight ? 'text-slate-900' : 'text-white'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`} style={headerStyle}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: navbarEstilo === 'color-solido' && !isLight ? 'rgba(0,0,0,0.15)' : colorPrimario }}
          >
            <Zap size={16} className={navbarEstilo === 'color-solido' && !isLight ? 'text-black/70' : isLight ? 'text-white' : 'text-[#1E1F23]'} />
          </div>
          <span className={`font-bold text-lg tracking-tight ${logoTextColor}`}>PadelOS</span>
        </Link>

        {/* Links desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <a key={to} href={to} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-lg ${linkColor}`}>
              {label}
            </a>
          ))}
        </nav>

        {/* CTAs derecha */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/dashboardJugadores" className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${linkColor}`}>
            Jugadores
          </Link>
          {navbarEstilo === 'color-solido' && !isLight ? (
            <Link to="/login" className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-black/15 hover:bg-black/25 text-black transition-all duration-150">
              Área Privada
            </Link>
          ) : (
            <Link to="/login" className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-150"
              style={{ color: colorPrimario, border: `1px solid ${colorPrimario}40` }}
            >
              Área Privada
            </Link>
          )}
        </div>

        {/* Hamburguesa mobile */}
        <button
          className={`md:hidden ${isLight || (navbarEstilo === 'color-solido') ? 'text-black/60 hover:text-black' : 'text-white/70 hover:text-white'}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menú mobile */}
      {menuOpen && (
        <div className={`md:hidden border-t px-6 py-4 flex flex-col gap-2`}
          style={navbarEstilo === 'color-solido' && !isLight
            ? { backgroundColor: colorPrimario, borderColor: 'rgba(0,0,0,0.1)' }
            : isLight
              ? { backgroundColor: 'white', borderColor: '#e2e8f0' }
              : { backgroundColor: '#1E1F23', borderColor: 'rgba(255,255,255,0.05)' }
          }
        >
          {navLinks.map(({ to, label }) => (
            <a key={to} href={to} onClick={() => setMenuOpen(false)} className={`py-2.5 text-sm font-medium transition-colors ${linkColor}`}>
              {label}
            </a>
          ))}
          <Link to="/dashboardJugadores" onClick={() => setMenuOpen(false)} className={`py-2.5 text-sm font-medium transition-colors ${linkColor}`}>
            Jugadores
          </Link>
          <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-2 py-2.5 text-xs font-bold uppercase tracking-widest text-center rounded-lg border"
            style={navbarEstilo === 'color-solido' && !isLight
              ? { color: 'black', borderColor: 'rgba(0,0,0,0.2)' }
              : { color: colorPrimario, borderColor: `${colorPrimario}40` }
            }
          >
            Área Privada
          </Link>
        </div>
      )}
    </header>
  )
}

export default PublicNavbar
