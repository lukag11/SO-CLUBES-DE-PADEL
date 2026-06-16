import { useState, useEffect } from 'react'

// Logo wordmark: Padelw[IA]rk con la "IA" resaltada en neón.
export const PwLogo = ({ className = '' }) => (
  <span className={`pw-display font-bold tracking-tight ${className}`}>
    Padelw<span className="pw-ia">IA</span>rk
  </span>
)

const LINKS = [
  { label: 'Producto', href: '#features' },
  { label: 'Precios', href: '#precios' },
  { label: 'Cómo funciona', href: '#como' },
]

const PwNav = () => {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-18 flex items-center justify-between">
        <a href="#top" className="text-lg sm:text-xl text-[#f4f5ef]">
          <PwLogo />
        </a>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm text-[#9ba89f]">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[#f4f5ef] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-[#f4f5ef]/80 hover:text-[#f4f5ef] transition-colors px-3 py-2">
            Entrar
          </a>
          <a href="#precios" className="pw-btn-lime text-sm font-semibold rounded-full px-5 py-2.5">
            Probar gratis
          </a>
        </div>

        {/* Botón mobile */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg border border-white/10 gap-1.5"
          aria-label="Menú"
        >
          <span className={`block h-0.5 w-5 bg-[#f4f5ef] transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[#f4f5ef] transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[#f4f5ef] transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </nav>

      {/* Menú mobile desplegable */}
      {open && (
        <div className="md:hidden bg-[#0a0f0d]/95 backdrop-blur-xl border-b border-white/5 px-5 py-5 flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[#9ba89f] hover:text-[#f4f5ef] py-2.5 text-base transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 mt-3">
            <a href="/login" className="flex-1 text-center text-[#f4f5ef] border border-white/10 rounded-full px-5 py-3 text-sm">
              Entrar
            </a>
            <a href="#precios" onClick={() => setOpen(false)} className="pw-btn-lime flex-1 text-center font-semibold rounded-full px-5 py-3 text-sm">
              Probar gratis
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

export default PwNav
