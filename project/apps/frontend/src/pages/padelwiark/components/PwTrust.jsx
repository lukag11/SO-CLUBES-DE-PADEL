import { NotebookPen, MessageCircle, Sheet, Calculator, CalendarDays, ArrowRight } from 'lucide-react'
import { PwLogo } from './PwNav'

const TOOLS = [
  { icon: NotebookPen, label: 'Cuaderno' },
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: Sheet, label: 'Excel' },
  { icon: Calculator, label: 'Calculadora' },
  { icon: CalendarDays, label: 'Agenda' },
]

const PwTrust = () => (
  <section className="relative border-y border-white/5 bg-white/[0.015] py-10 sm:py-12">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <p className="pw-mono text-center text-[11px] uppercase tracking-[0.2em] text-[#9ba89f] mb-7">
        Una plataforma en lugar de seis apps sueltas
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-8">
        {TOOLS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-[#9ba89f]/55">
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-sm line-through decoration-[#9ba89f]/30">{label}</span>
          </div>
        ))}

        <ArrowRight size={18} className="text-[#d4ff3f] shrink-0" />

        <div className="flex items-center gap-2 rounded-full border border-[#afca0b]/30 bg-[#afca0b]/10 px-4 py-1.5">
          <PwLogo className="text-base text-[#f4f5ef]" />
        </div>
      </div>
    </div>
  </section>
)

export default PwTrust
