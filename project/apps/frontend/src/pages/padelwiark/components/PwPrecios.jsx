import { useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'

// Precios de REFERENCIA en ARS (placeholder, ajustables). Anual = 2 meses gratis (×10/12).
const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    desc: 'Para arrancar a ordenar las reservas.',
    precio: 29900,
    destacado: false,
    features: [
      'Grilla de reservas en tiempo real',
      'Hasta 3 canchas',
      'Turnos fijos y bloqueos',
      'App para tus jugadores',
      '1 usuario administrador',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    desc: 'El club completo, gestionado de punta a punta.',
    precio: 49900,
    destacado: true,
    features: [
      'Todo lo de Básico, sin límite de canchas',
      'Finanzas: cobranzas, caja y stock',
      'Torneos con fixture y bracket',
      'Portal para profesores y clases',
      'Estadísticas e informes',
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    desc: 'Para cadenas y clubes que quieren todo.',
    precio: 79900,
    destacado: false,
    features: [
      'Todo lo de Pro',
      'Asistente con IA (carga de facturas)',
      'Varias sedes y administradores',
      'Personalización avanzada de marca',
      'Soporte prioritario',
    ],
  },
]

const fmt = (n) => `$${n.toLocaleString('es-AR')}`

const PwPrecios = () => {
  const [anual, setAnual] = useState(false)
  const precioMostrado = (p) => (anual ? Math.round((p * 10 / 12) / 100) * 100 : p)

  return (
    <section id="precios" className="relative py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#d4ff3f] mb-4">Precios</p>
          <h2 className="pw-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#f4f5ef] tracking-tight leading-tight">
            Planes simples, sin sorpresas.
          </h2>
          <p className="text-[#9ba89f] mt-4 text-base sm:text-lg leading-relaxed">
            Sin permanencia. Cancelás cuando quieras. Probá 14 días gratis, sin tarjeta.
          </p>
        </div>

        {/* Toggle mensual / anual */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm transition-colors ${!anual ? 'text-[#f4f5ef]' : 'text-[#9ba89f]'}`}>Mensual</span>
          <button
            onClick={() => setAnual((v) => !v)}
            className="relative w-14 h-7 rounded-full border border-white/10 bg-white/[0.04] transition-colors"
            aria-label="Cambiar facturación"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#afca0b] transition-transform duration-300 ${anual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm transition-colors ${anual ? 'text-[#f4f5ef]' : 'text-[#9ba89f]'}`}>
            Anual <span className="pw-mono text-[11px] text-[#d4ff3f]">· 2 meses gratis</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {PLANES.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-3xl border p-7 sm:p-8 transition-colors ${
                p.destacado
                  ? 'border-[#afca0b]/40 bg-[#afca0b]/[0.05] md:-mt-4 md:mb-4'
                  : 'border-white/8 bg-white/[0.02] hover:border-white/15'
              }`}
            >
              {p.destacado && (
                <>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle,#afca0b 0%,transparent 65%)' }} />
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 pw-mono text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full bg-[#afca0b] text-[#0a0f0d]">
                    Más popular
                  </span>
                </>
              )}

              <div className="relative">
                <h3 className="pw-display text-xl font-semibold text-[#f4f5ef]">{p.nombre}</h3>
                <p className="text-sm text-[#9ba89f] mt-1 mb-6 min-h-[40px]">{p.desc}</p>

                <div className="flex items-end gap-1.5 mb-1">
                  <span className="pw-display text-4xl font-bold text-[#f4f5ef]">{fmt(precioMostrado(p.precio))}</span>
                  <span className="text-[#9ba89f] text-sm mb-1.5">/mes</span>
                </div>
                <p className="pw-mono text-[11px] text-[#9ba89f] mb-7 h-4">
                  {anual ? 'facturado anual' : 'pesos argentinos'}
                </p>

                <a
                  href="/login"
                  className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold mb-7 transition-all ${
                    p.destacado
                      ? 'pw-btn-lime'
                      : 'border border-white/12 text-[#f4f5ef] hover:border-white/25 hover:bg-white/[0.03]'
                  }`}
                >
                  Empezar gratis <ArrowRight size={16} />
                </a>

                <ul className="flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={16} className="text-[#d4ff3f] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#9ba89f] leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[#9ba89f]/60 text-xs mt-10">
          Valores de referencia, sujetos a ajuste. Los precios no incluyen IVA.
        </p>
      </div>
    </section>
  )
}

export default PwPrecios
