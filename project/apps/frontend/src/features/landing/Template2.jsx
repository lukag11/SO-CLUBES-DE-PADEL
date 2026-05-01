// Template 2 — Impacto
// Hero fullscreen con imagen, texto centrado superpuesto, degradado dramático.

import { Zap, CalendarDays, Trophy, Users, ArrowRight, ChevronDown } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles, TorneosSection } from './LandingSections'

const FEATURES = [
  { icon: CalendarDays, title: 'Reservas online',  desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.' },
  { icon: Trophy,       title: 'Torneos',          desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.' },
  { icon: Users,        title: 'Tu perfil',         desc: 'Historial de partidos, estadísticas y nivel actualizado.' },
]

const Template2 = ({ club, onCta }) => {
  const { colorPrimario, colorSecundario, nombre, canchas, horarios,
    heroTitulo, heroTituloDestacado, heroSubtitulo, heroBadge,
    heroCtaPrimarioTexto, heroCtaSecundarioTexto, heroImagen,
    tituloBio, historia, anoFundacion, fotoPrincipal,
    galeria, servicios, staff, faq, seccionesVisibles } = club

  const parrafos = historia ? historia.split('\n\n').filter(Boolean) : []
  const canchasActivas = canchas.filter((c) => c.activa)
  const hoy = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]
  const horarioHoy = horarios?.[hoy]

  return (
    <div className="bg-[#0a0a0a] min-h-screen">

      {/* HERO — fullscreen imagen + overlay degradado */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Fondo */}
        {heroImagen
          ? <img src={heroImagen} alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105" />
          : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0a0a0a 0%, ${colorPrimario}30 100%)` }} />
        }

        {/* Overlay degradado desde abajo */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0a0a0a 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 100%)' }} />

        {/* Contenido centrado */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center gap-6">
          {heroBadge && (
            <span className="text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border" style={{ color: colorPrimario, borderColor: `${colorPrimario}50`, backgroundColor: `${colorPrimario}10` }}>
              {heroBadge}
            </span>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white leading-none tracking-tighter">
            {heroTitulo && <span className="block">{heroTitulo}</span>}
            {heroTituloDestacado && <span style={{ color: colorPrimario }}>{heroTituloDestacado}</span>}
          </h1>
          {heroSubtitulo && (
            <p className="text-lg md:text-xl text-white/60 max-w-xl leading-relaxed">{heroSubtitulo}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <button onClick={onCta} className="inline-flex items-center gap-2 font-black text-base px-8 py-4 rounded-2xl transition-all duration-200" style={{ backgroundColor: colorPrimario, color: '#0a0a0a', boxShadow: `0 12px 40px ${colorPrimario}40` }}>
              {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={18} />
            </button>
            <button onClick={onCta} className="inline-flex items-center gap-2 text-base font-medium text-white/70 hover:text-white transition-colors px-4 py-4">
              {heroCtaSecundarioTexto || 'Ver torneos'}
            </button>
          </div>

          {/* Stats rápidos */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: colorPrimario }}>{canchasActivas.length}</p>
              <p className="text-white/40 text-xs mt-0.5">Canchas</p>
            </div>
            {horarioHoy?.activo && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{horarioHoy.apertura} – {horarioHoy.cierre}</p>
                  <p className="text-white/40 text-xs mt-0.5">Horario hoy</p>
                </div>
              </>
            )}
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm font-bold text-white">Abierto</p>
              </div>
              <p className="text-white/40 text-xs mt-0.5">Ahora</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/30">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-16">
            <h2 className="text-4xl font-black text-white leading-tight">Todo lo que<br /><span style={{ color: colorPrimario }}>necesitás</span></h2>
            <p className="text-white/40 text-sm max-w-xs text-right hidden md:block">Una plataforma, todas las herramientas para disfrutar del pádel.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} onClick={onCta} className="bg-[#0a0a0a] p-8 hover:bg-white/3 transition-colors cursor-pointer group">
                <div className="text-5xl font-black mb-6 opacity-20" style={{ color: colorPrimario }}>0{i+1}</div>
                <Icon size={24} className="mb-4" style={{ color: colorPrimario }} />
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TORNEOS */}
      <TorneosSection colorPrimario={colorPrimario} dark={true} onCta={onCta} />

      {/* TURNOS DISPONIBLES */}
      {(seccionesVisibles?.reservas ?? true) && (
        <section className="py-24 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={true} />
          </div>
        </section>
      )}

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section className="py-24 px-6" style={{ background: `linear-gradient(135deg, #0a0a0a 60%, ${colorPrimario}08 100%)` }}>
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: colorPrimario }}>{anoFundacion ? `Desde ${anoFundacion}` : 'Nuestra historia'}</p>
              <h2 className="text-4xl font-black text-white mb-8">{tituloBio}</h2>
              <div className="flex flex-col gap-4">{parrafos.map((p, i) => <p key={i} className="text-white/55 leading-relaxed">{p}</p>)}</div>
            </div>
            {fotoPrincipal
              ? <div className="rounded-2xl overflow-hidden"><img src={fotoPrincipal} alt={tituloBio} className="w-full h-80 object-cover" /></div>
              : <div className="hidden md:block h-80 rounded-2xl" style={{ background: `linear-gradient(135deg, ${colorPrimario}15, ${colorSecundario}10)`, border: `1px solid ${colorPrimario}20` }} />
            }
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <h2 className="text-4xl font-black text-white">Instalaciones</h2>
            </div>
            <GaleriaGrid galeria={galeria} />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section className="py-24 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <h2 className="text-4xl font-black text-white">Servicios</h2>
            </div>
            <ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <h2 className="text-4xl font-black text-white">Nuestro equipo</h2>
            </div>
            <StaffGrid staff={staff} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section className="py-24 px-6 bg-black/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-black text-white mb-12">Preguntas frecuentes</h2>
            <FaqList faq={faq} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="relative py-16 md:py-32 px-6 overflow-hidden text-center">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle, ${colorPrimario} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">¿Listo para<br /><span style={{ color: colorPrimario }}>jugar?</span></h2>
          <p className="text-white/40 mb-10 text-lg">Creá tu cuenta gratis y empezá a reservar hoy mismo.</p>
          <button onClick={onCta} className="inline-flex items-center gap-3 font-black text-lg px-10 py-5 rounded-2xl transition-all duration-200" style={{ backgroundColor: colorPrimario, color: '#0a0a0a', boxShadow: `0 16px 48px ${colorPrimario}40` }}>
            {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
            <Zap size={12} className="text-[#0a0a0a]" />
          </div>
          <span className="text-white font-bold text-sm">{nombre}</span>
        </div>
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

export default Template2
