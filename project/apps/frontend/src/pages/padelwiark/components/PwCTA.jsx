import { ArrowRight } from 'lucide-react'
import { PwLogo } from './PwNav'

const PwCTA = () => (
  <>
    {/* CTA final */}
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="pw-aurora absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vw] rounded-full blur-[130px] opacity-25"
          style={{ background: 'radial-gradient(circle, #afca0b 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <h2 className="pw-display text-4xl sm:text-5xl md:text-6xl font-semibold text-[#f4f5ef] tracking-tight leading-[1.05] mb-6">
          Tu club, listo para<br className="hidden sm:block" /> el <span className="pw-ia">próximo nivel</span>.
        </h2>
        <p className="text-[#9ba89f] text-base sm:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
          Empezá gratis hoy. En un día tenés todo tu club adentro, ordenado y midiendo solo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/login" className="pw-btn-lime inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold text-sm">
            Probar gratis 14 días <ArrowRight size={17} />
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-medium text-sm text-[#f4f5ef] border border-white/12 hover:border-white/25 hover:bg-white/[0.03] transition-colors"
          >
            Ver funciones
          </a>
        </div>
        <p className="pw-mono text-[11px] text-[#9ba89f]/70 mt-6">Sin tarjeta · Sin permanencia · Soporte en español</p>
      </div>
    </section>

    {/* Footer */}
    <footer className="relative border-t border-white/8 py-12 sm:py-14">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xs">
            <PwLogo className="text-xl text-[#f4f5ef]" />
            <p className="text-sm text-[#9ba89f] mt-3 leading-relaxed">
              El sistema operativo de tu club de pádel. Hecho en Argentina.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="flex flex-col gap-3">
              <span className="pw-mono text-[11px] uppercase tracking-wider text-[#9ba89f]/60">Producto</span>
              <a href="#features" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Funciones</a>
              <a href="#precios" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Precios</a>
              <a href="#como" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Cómo funciona</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="pw-mono text-[11px] uppercase tracking-wider text-[#9ba89f]/60">Empresa</span>
              <a href="#" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Contacto</a>
              <a href="#" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Soporte</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="pw-mono text-[11px] uppercase tracking-wider text-[#9ba89f]/60">Acceso</span>
              <a href="/login" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Entrar</a>
              <a href="#precios" className="text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">Probar gratis</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 pt-8 border-t border-white/5">
          <p className="text-xs text-[#9ba89f]/60">© {new Date().getFullYear()} PadelwIArk. Todos los derechos reservados.</p>
          <div className="flex gap-5 text-xs text-[#9ba89f]/60">
            <a href="#" className="hover:text-[#9ba89f] transition-colors">Términos</a>
            <a href="#" className="hover:text-[#9ba89f] transition-colors">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  </>
)

export default PwCTA
