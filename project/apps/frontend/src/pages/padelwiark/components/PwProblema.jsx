import { X, Check } from 'lucide-react'

const ANTES = [
  'Turnos que se pisan entre WhatsApp, llamadas y el cuaderno',
  'Deudas y pagos que se pierden en hojas sueltas',
  'Torneos armados a mano, con fixtures en papel',
  'Cero datos: no sabés qué cancha rinde ni quién te debe',
  'La caja del día nunca termina de cerrar',
]

const DESPUES = [
  'Grilla en tiempo real: imposible reservar dos veces el mismo turno',
  'Cobranzas, caja y stock automáticos, con comprobantes',
  'Torneos con fixture, zonas y bracket generados en minutos',
  'Estadísticas de cada jugador, cancha e ingreso del club',
  'Todo desde el celular, para vos, tus profes y tus jugadores',
]

const PwProblema = () => (
  <section className="relative py-20 sm:py-28">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      {/* Encabezado */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">El problema</p>
        <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
          Gestionar un club a mano <span className="text-[#9ba89f]">es un caos.</span>
        </h2>
        <p className="text-[#9ba89f] mt-4 text-base sm:text-lg leading-relaxed">
          Cada herramienta suelta es un agujero por donde se te escapa plata y tiempo.
          PadelwIArk junta todo en un solo lugar, ordenado y en vivo.
        </p>
      </div>

      {/* Comparativa */}
      <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
        {/* Antes */}
        <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="pw-mono text-xs uppercase tracking-wider text-[#9ba89f]">Hoy, sin PadelwIArk</span>
          </div>
          <ul className="flex flex-col gap-4">
            {ANTES.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                  <X size={12} className="text-rose-400" />
                </span>
                <span className="text-sm sm:text-[15px] text-[#9ba89f] leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Después */}
        <div className="relative rounded-3xl border border-[#afca0b]/25 bg-[#afca0b]/[0.04] p-6 sm:p-8 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle,#afca0b 0%,transparent 65%)' }} />
          <div className="relative flex items-center gap-2 mb-6">
            <span className="pw-mono text-xs uppercase tracking-wider text-[#d4ff3f]">Con PadelwIArk</span>
          </div>
          <ul className="relative flex flex-col gap-4">
            {DESPUES.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#afca0b]/20 border border-[#afca0b]/40 flex items-center justify-center">
                  <Check size={12} className="text-[#d4ff3f]" />
                </span>
                <span className="text-sm sm:text-[15px] text-[#f4f5ef] leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
)

export default PwProblema
