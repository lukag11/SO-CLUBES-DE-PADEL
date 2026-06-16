import { MapPin, Banknote, MessagesSquare, BrainCircuit, Boxes, ShieldCheck } from 'lucide-react'

const RAZONES = [
  { icon: MapPin, title: 'Hecho en Argentina', desc: 'Pensado para cómo funciona un club acá: turnos de 1.5h, turnos fijos, seña y efectivo.' },
  { icon: Banknote, title: 'Precio en pesos', desc: 'Sin dólares ni sorpresas de tipo de cambio. Pagás en pesos, todos los meses lo mismo.' },
  { icon: MessagesSquare, title: 'Soporte que responde', desc: 'IA para resolver lo urgente al instante y personas reales que entienden de pádel cuando lo necesitás.' },
  { icon: BrainCircuit, title: 'IA de verdad', desc: 'Automatizaciones útiles, como cargar el stock desde la foto de una factura. No humo.' },
  { icon: Boxes, title: 'Todo en uno', desc: 'Reservas, finanzas, torneos y stats conectados. No seis apps que no se hablan entre sí.' },
  { icon: ShieldCheck, title: 'Sin permanencia', desc: 'Te quedás porque te sirve, no porque firmaste un contrato de 12 meses.' },
]

const PwPorque = () => (
  <section className="relative py-20 sm:py-28 border-t border-white/5">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">Por qué PadelwIArk</p>
        <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
          No es otro software más.
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {RAZONES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 hover:border-white/15 transition-colors">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/8 mb-4">
              <Icon size={19} className="text-[#afca0b]" />
            </div>
            <h3 className="pw-display text-base font-semibold text-[#f4f5ef] mb-1.5">{title}</h3>
            <p className="text-sm text-[#9ba89f] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default PwPorque
