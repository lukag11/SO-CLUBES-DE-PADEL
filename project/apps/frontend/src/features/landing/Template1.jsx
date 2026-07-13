// Template 1 — Oscuro / Pro
// Split hero, glows, dark cards. Moderno y deportivo.

import { Fragment } from 'react'
import { Zap, CalendarDays, Trophy, Users, ArrowRight, CheckCircle, Star, ChevronDown } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles, TorneosSection, AmericanoSuper8Section, PartidosAbiertosSection, ContactoSection, hayContacto, SectionTitle, FirmaPlataforma } from './LandingSections'
import Reveal from '../../components/ui/Reveal'
import CountUp from '../../components/ui/CountUp'

const CourtLines = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 800 600" fill="none" preserveAspectRatio="xMidYMid slice">
    <rect x="100" y="60" width="600" height="480" stroke="white" strokeWidth="2" />
    <line x1="100" y1="300" x2="700" y2="300" stroke="white" strokeWidth="2" />
    <line x1="400" y1="60" x2="400" y2="540" stroke="white" strokeWidth="1.5" />
    <rect x="100" y="60" width="600" height="150" stroke="white" strokeWidth="1" />
    <rect x="100" y="390" width="600" height="150" stroke="white" strokeWidth="1" />
    <circle cx="400" cy="300" r="28" stroke="white" strokeWidth="1.5" />
  </svg>
)

const FEATURES = [
  { icon: CalendarDays, title: 'Reservas online', desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.', cta: 'Reservar' },
  { icon: Trophy,       title: 'Torneos',         desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.', cta: 'Ver torneos' },
  { icon: Users,        title: 'Tu perfil',        desc: 'Historial de partidos, estadísticas y nivel actualizado.', cta: 'Crear cuenta' },
]

const Template1 = ({ club, onCta, onTorneos }) => {
  const { colorPrimario, nombre, logo, canchas, horarios, heroTitulo, heroTituloDestacado,
    heroSubtitulo, heroBadge, heroCtaPrimarioTexto, heroCtaSecundarioTexto,
    heroImagen, tituloBio, historia, anoFundacion, fotoPrincipal,
    galeria, servicios, staff, faq, seccionesVisibles } = club

  const parrafos = historia ? historia.split('\n\n').filter(Boolean) : []
  const canchasActivas = canchas.filter((c) => c.activa)
  const hoy = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]
  const horarioHoy = horarios?.[hoy]

  const stats = [
    ...(anoFundacion ? [{ n: new Date().getFullYear() - Number(anoFundacion), l: 'Años' }] : []),
    { n: canchasActivas.length, l: 'Canchas' },
  ]

  return (
    <div className="bg-[#0d1117] min-h-screen relative">
      {/* Textura de ruido global (muy sutil, mata el look plano) */}
      <div className="noise-overlay fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden min-h-screen flex items-center px-6">
        {heroImagen ? (
          <>
            <img src={heroImagen} alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105" />
            {/* Gradiente DIRECCIONAL: oscuro del lado del texto, deja ver la energía de la foto */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117] via-[#0d1117]/80 to-[#0d1117]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />
            <div className="aurora animate-[auroraDrift_22s_ease-in-out_infinite] absolute top-[-120px] right-[-60px] w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none opacity-[0.10] mix-blend-screen" style={{ backgroundColor: colorPrimario }} />
          </>
        ) : (
          <>
            <CourtLines />
            <div className="aurora animate-[auroraDrift_22s_ease-in-out_infinite] absolute top-[-120px] right-[-80px] w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none opacity-[0.12]" style={{ backgroundColor: colorPrimario }} />
            <div className="aurora animate-[auroraDrift_28s_ease-in-out_infinite] absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-[0.06]" style={{ backgroundColor: colorPrimario }} />
          </>
        )}

        <div className={`relative z-10 max-w-6xl mx-auto w-full grid gap-12 items-center py-16 md:py-32 ${heroImagen ? '' : 'md:grid-cols-2 md:gap-16'}`}>

          <div className={`flex flex-col gap-6 animate-[fadeInUp_.5s_ease-out] ${heroImagen ? 'max-w-3xl' : ''}`}>
            {heroBadge && (
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-fit backdrop-blur-sm">
                <Zap size={11} style={{ color: colorPrimario }} />
                <span className="text-xs text-white/70 font-medium tracking-wide uppercase">{heroBadge}</span>
              </div>
            )}
            <h1 className="font-display uppercase text-white leading-[1.1] tracking-tight text-5xl sm:text-7xl md:text-8xl">
              {heroTitulo && <span className="block">{heroTitulo}</span>}
              {heroTituloDestacado && <span className="block mt-2 md:mt-3" style={{ color: colorPrimario }}>{heroTituloDestacado}</span>}
            </h1>
            {heroSubtitulo && <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-lg">{heroSubtitulo}</p>}
            <div className="flex flex-wrap items-center gap-5 mt-2">
              <button onClick={onCta} className="group inline-flex items-center gap-2.5 font-bold text-base px-7 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ backgroundColor: colorPrimario, color: '#0d1117', boxShadow: `0 10px 40px ${colorPrimario}45` }}>
                {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={onTorneos} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors">
                {heroCtaSecundarioTexto || 'Ver torneos'} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            {/* Prueba social viva */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 mt-1 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
                <span className="text-white/60 text-sm font-medium">{canchasActivas.length} canchas disponibles</span>
              </div>
              {horarioHoy?.activo && (
                <span className="flex items-center gap-2 text-white/45 text-sm"><span className="text-white/20">·</span>Hoy {horarioHoy.apertura}–{horarioHoy.cierre}</span>
              )}
              <span className="flex items-center gap-1.5 text-white/45 text-sm">
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} fill={colorPrimario} style={{ color: colorPrimario }} />)}</span>
                5.0
              </span>
            </div>
          </div>

          {/* Cards a la derecha SOLO si no hay foto (sobre la foto competirían y ensucian) */}
          {!heroImagen && (
            <div className="hidden md:flex flex-col gap-4 animate-[fadeInUp_.6s_ease-out]">
              <div className="bg-white/5 border border-white/8 rounded-2xl p-5 backdrop-blur-sm hover:border-white/15 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Canchas</p>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${colorPrimario}20`, color: colorPrimario }}>{canchasActivas.length} activas</span>
                </div>
                <div className="flex flex-col gap-2">
                  {canchasActivas.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-white/70 text-sm flex-1">{c.nombre}</span>
                      <span className="text-white/30 text-xs">{c.tipo} · {c.indoor ? 'Indoor' : 'Outdoor'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/8 rounded-2xl p-4"><p className="text-white/30 text-xs mb-1">Club</p><p className="text-white font-bold text-sm leading-snug">{nombre}</p></div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
                  <p className="text-white/30 text-xs">Valoración</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={colorPrimario} style={{ color: colorPrimario }} />)}
                    <span className="text-white/50 text-xs ml-1">5.0</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de scroll — invita a bajar */}
        <a href="#reservas" className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden md:flex text-white/30 hover:text-white/70 transition-colors z-10" aria-label="Bajar para ver más">
          <ChevronDown size={26} className="animate-[nudge_1.8s_ease-in-out_infinite]" />
        </a>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 bg-black/20">
        <div className="max-w-5xl mx-auto">
          <SectionTitle titulo="Todo lo que necesitás" subtitulo="Reservas, torneos y estadísticas en un solo lugar." />
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, cta }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div onClick={() => title === 'Torneos' ? onTorneos() : onCta()} className="group relative h-full overflow-hidden bg-white/[0.04] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                  {/* Índice editorial tenue */}
                  <span className="absolute top-4 right-5 font-display text-5xl leading-none text-white/[0.06] group-hover:text-white/[0.10] transition-colors">0{i + 1}</span>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110" style={{ backgroundColor: `${colorPrimario}22`, color: colorPrimario }}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
                  {/* Micro-link accionable, aparece al hover */}
                  <div className="flex items-center gap-1.5 mt-5 text-sm font-semibold opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" style={{ color: colorPrimario }}>
                    {cta} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TORNEO EN CURSO (hero) */}
      <TorneosSection colorPrimario={colorPrimario} dark={true} onCta={onCta} soloEnCurso />

      {/* TURNOS DISPONIBLES */}
      {(seccionesVisibles?.reservas ?? true) && (
        <section id="reservas" className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={true} variant="matrix" />
          </div>
        </section>
      )}

      {/* AMERICANO Y SUPER 8 */}
      <AmericanoSuper8Section colorPrimario={colorPrimario} dark={true} />
      <PartidosAbiertosSection colorPrimario={colorPrimario} dark={true} />

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section id="nosotros" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-14">
              <h2 className="font-display uppercase text-4xl md:text-5xl text-white tracking-tight">{tituloBio}</h2>
              {anoFundacion && <p className="text-white/40 mt-2 text-sm uppercase tracking-wide">Desde {anoFundacion}</p>}
            </Reveal>
            <Reveal className={fotoPrincipal ? 'grid md:grid-cols-2 gap-12 items-center' : 'max-w-2xl mx-auto'}>
              {fotoPrincipal && (
                <div className="relative">
                  {/* glow suave detrás de la foto */}
                  <div className="absolute -inset-4 rounded-[28px] blur-2xl pointer-events-none" style={{ backgroundColor: colorPrimario, opacity: 0.08 }} />
                  <div className="relative rounded-2xl overflow-hidden border border-white/8 shadow-xl">
                    <img src={fotoPrincipal} alt={tituloBio} className="w-full h-72 object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 md:pl-6 md:border-l-2" style={{ borderColor: `${colorPrimario}33` }}>
                {parrafos.map((p, i) => <p key={i} className="text-white/55 text-base leading-relaxed">{p}</p>)}
                <div className="flex flex-wrap items-center gap-x-7 gap-y-4 mt-4 pt-6 border-t border-white/10">
                  {stats.map((s, i) => (
                    <Fragment key={s.l}>
                      {i > 0 && <span className="hidden sm:block w-px h-10 bg-white/10" />}
                      <div>
                        <p className="font-display text-4xl md:text-5xl leading-none" style={{ color: colorPrimario }}><CountUp to={s.n} /></p>
                        <p className="text-white/40 text-xs uppercase tracking-wide mt-1.5">{s.l}</p>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section id="galeria" className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <SectionTitle titulo="Instalaciones" subtitulo="Conocé nuestras canchas y espacios." />
            <Reveal><GaleriaGrid galeria={galeria} variant="mosaico" /></Reveal>
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section id="servicios" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <SectionTitle titulo="Servicios" subtitulo="Todo lo que encontrás en el club." />
            <Reveal><ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={true} /></Reveal>
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section id="equipo" className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <SectionTitle titulo="Nuestro equipo" subtitulo="Las personas detrás del club." />
            <Reveal><StaffGrid staff={staff} colorPrimario={colorPrimario} dark={true} /></Reveal>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section id="faq" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <SectionTitle titulo="Preguntas frecuentes" subtitulo="Todo lo que necesitás saber antes de reservar." />
            <Reveal><FaqList faq={faq} colorPrimario={colorPrimario} dark={true} /></Reveal>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="relative overflow-hidden py-24 px-6 bg-black/20">
        <div className="aurora animate-[auroraDrift_25s_ease-in-out_infinite] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-3xl pointer-events-none opacity-[0.10]" style={{ backgroundColor: colorPrimario }} />
        <Reveal className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display uppercase text-4xl md:text-6xl text-white tracking-tight leading-[1.05]">¿Listo para jugar?</h2>
          <p className="text-white/45 mt-5">Creá tu cuenta gratis y empezá a reservar canchas hoy mismo.</p>
          <button onClick={onCta} className="group inline-flex items-center gap-2.5 font-bold text-base px-8 py-4 rounded-xl transition-all mt-8 hover:-translate-y-0.5" style={{ backgroundColor: colorPrimario, color: '#0d1117', boxShadow: `0 10px 40px ${colorPrimario}45` }}>
            {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            {['Sin costo de registro','Reserva en 30 segundos','Cancelación gratuita'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-white/35 text-xs"><CheckCircle size={13} style={{ color: colorPrimario }} />{t}</div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CONTACTO */}
      {hayContacto(club) && (
        <section id="contacto" className="py-24 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <SectionTitle titulo="Contacto" subtitulo="Escribinos o pasá a visitarnos." />
            <ContactoSection club={club} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden" style={{ backgroundColor: logo ? 'transparent' : colorPrimario }}>
            {logo ? <img src={logo} alt={nombre || 'Club'} className="w-full h-full object-contain" /> : <Zap size={12} className="text-[#0d1117]" />}
          </div>
          <span className="text-white font-bold text-sm">{nombre}</span>
        </div>
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
        <FirmaPlataforma />
      </footer>
    </div>
  )
}

export default Template1
