import { useState } from 'react'
import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: '¿Tengo que instalar algo?',
    a: 'No. PadelwIArk funciona desde el navegador, en la compu y en el celular. Vos y tus jugadores solo entran con un link y su usuario.',
  },
  {
    q: '¿Sirve si ya manejo todo con WhatsApp y Excel?',
    a: 'Justamente para eso es. Reemplaza ese stack improvisado por un solo lugar ordenado. Te ayudamos a cargar tus canchas, precios y jugadores para que arranques rápido.',
  },
  {
    q: '¿Mis jugadores tienen que pagar algo?',
    a: 'No. El plan lo paga el club. Tus jugadores usan la app gratis para reservar, anotarse a torneos y ver sus estadísticas.',
  },
  {
    q: '¿Cómo cobro a mis jugadores?',
    a: 'Registrás los cobros por el método que uses hoy (efectivo, transferencia, tarjeta) y el sistema lleva la caja y las deudas solo. La integración de cobro online con Mercado Pago está en camino.',
  },
  {
    q: '¿Hay permanencia o contrato?',
    a: 'No. Pagás mes a mes y cancelás cuando quieras. Empezás con 14 días gratis, sin tarjeta.',
  },
  {
    q: '¿Y si tengo más de una sede?',
    a: 'El plan Premium está pensado para cadenas: varias sedes y varios administradores bajo la misma cuenta.',
  },
]

const Item = ({ q, a, open, onClick }) => (
  <div className="border-b border-white/8">
    <button onClick={onClick} className="w-full flex items-center justify-between gap-4 py-5 text-left">
      <span className="pw-display text-base sm:text-lg font-medium text-[#f4f5ef]">{q}</span>
      <Plus size={20} className={`shrink-0 text-[#d4ff3f] transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
    </button>
    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="overflow-hidden">
        <p className="text-sm sm:text-[15px] text-[#9ba89f] leading-relaxed pr-8">{a}</p>
      </div>
    </div>
  </div>
)

const PwFAQ = () => {
  const [open, setOpen] = useState(0)
  return (
    <section className="relative py-20 sm:py-28">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12 sm:mb-14">
          <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">Preguntas frecuentes</p>
          <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
            Lo que solés preguntar.
          </h2>
        </div>

        <div>
          {FAQS.map((f, i) => (
            <Item key={f.q} q={f.q} a={f.a} open={open === i} onClick={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default PwFAQ
