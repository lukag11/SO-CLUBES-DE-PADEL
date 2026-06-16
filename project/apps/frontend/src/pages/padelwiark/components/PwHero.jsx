import { ArrowRight, Play, Sparkles, Star } from 'lucide-react'

// Mockup estilizado del producto (dashboard del club) — CSS puro, sin imagen.
const DashboardMock = () => {
  const slots = [
    { t: '08:00', s: 'libre' }, { t: '09:30', s: 'ocupado' }, { t: '11:00', s: 'ocupado' },
    { t: '12:30', s: 'libre' }, { t: '14:00', s: 'fijo' }, { t: '15:30', s: 'ocupado' },
    { t: '17:00', s: 'libre' }, { t: '18:30', s: 'ocupado' }, { t: '20:00', s: 'ocupado' },
  ]
  const color = {
    libre: 'bg-white/5 text-[#9ba89f] border-white/10',
    ocupado: 'bg-[#afca0b]/15 text-[#d4ff3f] border-[#afca0b]/30',
    fijo: 'bg-[#14b8a6]/15 text-[#5eead4] border-[#14b8a6]/30',
  }
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#141c18]/80 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
      {/* barra superior */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#afca0b]" />
          <span className="pw-mono text-[11px] text-[#9ba89f]">club · hoy</span>
        </div>
        <span className="pw-mono text-[11px] text-[#9ba89f]">6 canchas</span>
      </div>

      {/* tiles de stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          { k: 'Ocupación', v: '87%' },
          { k: 'Reservas', v: '34' },
          { k: 'Ingresos', v: '$420k' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
            <p className="pw-mono text-[10px] text-[#9ba89f] mb-1">{s.k}</p>
            <p className="pw-display text-lg font-bold text-[#f4f5ef] leading-none">{s.v}</p>
          </div>
        ))}
      </div>

      {/* grilla de turnos */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-[#f4f5ef]">Cancha 1 · Central</span>
          <span className="pw-mono text-[10px] text-[#d4ff3f]">● en vivo</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((sl) => (
            <div key={sl.t} className={`rounded-lg border px-2 py-2 text-center ${color[sl.s]}`}>
              <span className="pw-mono text-[11px] font-medium">{sl.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PwHero = () => (
  <section id="top" className="pw-grain relative min-h-screen flex items-center pt-28 pb-16 sm:pt-32">
    {/* Aurora de fondo */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="pw-aurora absolute -top-1/3 -left-1/4 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, #afca0b 0%, transparent 60%)' }}
      />
      <div
        className="pw-aurora absolute top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-25"
        style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 60%)', animationDelay: '-7s' }}
      />
    </div>

    <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
      {/* Columna texto */}
      <div className="text-center lg:text-left">
        <div className="pw-fade-up pw-d1 inline-flex items-center gap-2 rounded-full border border-[#afca0b]/30 bg-[#afca0b]/10 px-3.5 py-1.5 mb-6">
          <Sparkles size={13} className="text-[#d4ff3f]" />
          <span className="pw-mono text-[11px] font-medium tracking-wide text-[#d4ff3f] uppercase">Impulsado por IA</span>
        </div>

        <h1 className="pw-display pw-h1 pw-fade-up pw-d2 text-[#f4f5ef] mb-5">
          El sistema operativo<br className="hidden sm:block" /> de tu{' '}
          <span className="relative whitespace-nowrap">
            club de pádel
            <span className="absolute left-0 -bottom-1 h-[3px] w-full rounded-full" style={{ background: 'linear-gradient(90deg,#afca0b,#14b8a6)' }} />
          </span>
          .
        </h1>

        <p className="pw-fade-up pw-d3 text-base sm:text-lg text-[#9ba89f] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
          Reservas, torneos, finanzas y estadísticas en un solo lugar. Dejá el cuaderno
          y el WhatsApp: gestioná todo tu club desde una plataforma inteligente.
        </p>

        <div className="pw-fade-up pw-d4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-9">
          <a href="/padelwiark/registro" className="pw-btn-lime inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold text-sm">
            Probar gratis <ArrowRight size={17} />
          </a>
          <a
            href="#como"
            className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-medium text-sm text-[#f4f5ef] border border-white/12 hover:border-white/25 hover:bg-white/[0.03] transition-colors"
          >
            <Play size={15} className="text-[#d4ff3f]" /> Ver demo
          </a>
        </div>

        <div className="pw-fade-up pw-d5 flex items-center gap-3 justify-center lg:justify-start">
          <div className="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={15} className="text-[#afca0b] fill-[#afca0b]" />
            ))}
          </div>
          <span className="text-sm text-[#9ba89f]">
            Clubes que ya dejaron el cuaderno atrás
          </span>
        </div>
      </div>

      {/* Columna visual */}
      <div className="pw-fade-up pw-d3 relative">
        {/* glow detrás del mockup */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-40" style={{ background: 'radial-gradient(circle at 50% 40%, #afca0b 0%, transparent 65%)' }} />
        <div className="pw-float max-w-md mx-auto lg:max-w-none">
          <DashboardMock />
        </div>
      </div>
    </div>
  </section>
)

export default PwHero
