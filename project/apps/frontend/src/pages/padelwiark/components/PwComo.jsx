import { UserPlus, LayoutGrid, Rocket } from 'lucide-react'

const PASOS = [
  {
    n: '01',
    icon: UserPlus,
    title: 'Creá tu club',
    desc: 'Te damos de alta en minutos con el nombre, el logo y los colores de tu club. Sin instalar nada.',
  },
  {
    n: '02',
    icon: LayoutGrid,
    title: 'Cargá canchas y precios',
    desc: 'Definís tus canchas, horarios y tarifas. Sumás a tus profes y abrís el registro de jugadores.',
  },
  {
    n: '03',
    icon: Rocket,
    title: 'Empezá a operar',
    desc: 'Tus jugadores reservan, vos cobrás y armás torneos. Todo queda registrado y medido, solo.',
  },
]

const PwComo = () => (
  <section id="como" className="relative py-20 sm:py-28 border-t border-white/5">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      {/* Encabezado */}
      <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
        <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">Cómo funciona</p>
        <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
          De cero a operando en un día.
        </h2>
        <p className="text-[#9ba89f] mt-4 text-base sm:text-lg leading-relaxed">
          Sin migraciones eternas ni manuales de 200 páginas. Tres pasos y tu club está adentro.
        </p>
      </div>

      {/* Pasos con línea de conexión */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
        {/* Línea horizontal (desktop) */}
        <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[#afca0b]/0 via-[#afca0b]/30 to-[#afca0b]/0" />

        {PASOS.map(({ n, icon: Icon, title, desc }) => (
          <div key={n} className="relative text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
              <div className="relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#141c18] border border-[#afca0b]/30 shadow-lg">
                <Icon size={22} className="text-[#d4ff3f]" />
              </div>
              <span className="pw-display text-4xl font-bold text-white/8 leading-none">{n}</span>
            </div>
            <h3 className="pw-display text-xl font-semibold text-[#f4f5ef] mb-2">{title}</h3>
            <p className="text-sm sm:text-[15px] text-[#9ba89f] leading-relaxed max-w-xs mx-auto md:mx-0">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default PwComo
