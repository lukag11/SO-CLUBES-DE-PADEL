import { CalendarRange, Wallet, Trophy, BarChart3, Sparkles, Smartphone } from 'lucide-react'

/* ---------- Mini-visuales por feature (CSS puro) ---------- */

const ReservasVisual = () => {
  const cells = ['o', 'x', 'x', 'f', 'o', 'x', 'o', 'x', 'x', 'o', 'f', 'x']
  const cls = {
    o: 'bg-white/5 border-white/10',
    x: 'bg-[#afca0b]/15 border-[#afca0b]/30',
    f: 'bg-[#14b8a6]/15 border-[#14b8a6]/30',
  }
  return (
    <div className="grid grid-cols-6 gap-1.5 mt-5">
      {cells.map((c, i) => (
        <div key={i} className={`h-7 rounded-md border ${cls[c]}`} />
      ))}
    </div>
  )
}

const FinanzasVisual = () => (
  <div className="mt-5 flex items-end gap-2 h-20">
    {[40, 65, 50, 80, 95, 72].map((h, i) => (
      <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === 4 ? '#d4ff3f' : 'rgba(175,202,11,0.25)' }} />
    ))}
  </div>
)

const TorneosVisual = () => (
  <div className="mt-5 flex items-center gap-2 text-[#9ba89f]">
    <div className="flex flex-col gap-2 flex-1">
      {['A', 'B', 'C', 'D'].map((t) => (
        <div key={t} className="h-5 rounded bg-white/[0.04] border border-white/8 flex items-center px-2">
          <span className="pw-mono text-[9px]">{t}</span>
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-5 flex-1">
      <div className="h-5 rounded bg-[#afca0b]/15 border border-[#afca0b]/30" />
      <div className="h-5 rounded bg-[#afca0b]/15 border border-[#afca0b]/30" />
    </div>
    <div className="flex-1">
      <div className="h-5 rounded bg-[#d4ff3f]/20 border border-[#d4ff3f]/40" />
    </div>
  </div>
)

/* ---------- Card base ---------- */

const Card = ({ icon: Icon, title, desc, children, className = '', highlight = false }) => (
  <div
    className={`group relative rounded-3xl border p-6 sm:p-7 overflow-hidden transition-colors duration-300 ${
      highlight
        ? 'border-[#afca0b]/30 bg-[#afca0b]/[0.05]'
        : 'border-white/8 bg-white/[0.02] hover:border-white/15'
    } ${className}`}
  >
    {highlight && (
      <div className="absolute -top-16 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle,#afca0b 0%,transparent 65%)' }} />
    )}
    <div className="relative">
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${highlight ? 'bg-[#afca0b]/15 border border-[#afca0b]/30' : 'bg-white/[0.04] border border-white/8'}`}>
        <Icon size={20} className={highlight ? 'text-[#d4ff3f]' : 'text-[#afca0b]'} />
      </div>
      <h3 className="pw-display text-lg sm:text-xl font-semibold text-[#f4f5ef] mb-2">{title}</h3>
      <p className="text-sm text-[#9ba89f] leading-relaxed">{desc}</p>
      {children}
    </div>
  </div>
)

const PwFeatures = () => (
  <section id="features" className="relative py-20 sm:py-28">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      {/* Encabezado */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">Todo en uno</p>
        <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
          Un módulo para cada parte de tu club.
        </h2>
        <p className="text-[#9ba89f] mt-4 text-base sm:text-lg leading-relaxed">
          Conectados entre sí: una reserva alimenta la caja, un torneo genera deudas,
          cada partido suma a las estadísticas. Sin cargar nada dos veces.
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Reservas — ancho */}
        <Card
          className="md:col-span-2"
          icon={CalendarRange}
          title="Reservas en tiempo real"
          desc="Grilla en vivo de todas tus canchas. Imposible pisar un turno: la base de datos garantiza que no haya doble reserva. Turnos fijos, clases y bloqueos, todo junto."
        >
          <ReservasVisual />
        </Card>

        {/* Finanzas */}
        <Card
          icon={Wallet}
          title="Finanzas y caja"
          desc="Cobranzas, ventas de bar, stock y caja del día. Con comprobantes para imprimir o mandar por WhatsApp."
        >
          <FinanzasVisual />
        </Card>

        {/* Torneos */}
        <Card
          icon={Trophy}
          title="Torneos"
          desc="Inscripciones, zonas, fixture y bracket generados solos. Con flyer y página pública del torneo."
        >
          <TorneosVisual />
        </Card>

        {/* Estadísticas */}
        <Card
          icon={BarChart3}
          title="Estadísticas"
          desc="Ocupación por cancha y franja, ranking de jugadores, ingresos y rendimiento. Datos para decidir, no para adivinar."
        />

        {/* IA — destacado */}
        <Card
          highlight
          icon={Sparkles}
          title="Asistente con IA"
          desc="Cargá la factura del proveedor y la IA suma el stock y los costos sola. Más automatizaciones en camino."
        />

        {/* App jugadores/profes — full width */}
        <Card
          className="md:col-span-3"
          icon={Smartphone}
          title="Una app para todos: vos, tus profes y tus jugadores"
          desc="Tres portales en uno. El admin gestiona todo; el profesor maneja su agenda y clases; el jugador reserva, se anota a torneos y ve sus estadísticas. Cada uno ve solo lo suyo, desde el celular."
        />
      </div>
    </div>
  </section>
)

export default PwFeatures
