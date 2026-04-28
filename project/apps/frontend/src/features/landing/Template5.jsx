// Template 5 — Elegante
// Near-black, líneas decorativas finas, layout asimétrico, premium.

import { Zap, CalendarDays, Trophy, Users, ArrowRight, ArrowUpRight } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles, TorneosSection } from './LandingSections'

const FEATURES = [
  { icon: CalendarDays, title: 'Reservas online',  desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.' },
  { icon: Trophy,       title: 'Torneos',          desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.' },
  { icon: Users,        title: 'Tu perfil',         desc: 'Historial de partidos, estadísticas y nivel actualizado.' },
]

const Template5 = ({ club, onCta }) => {
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
    <div className="bg-[#0c0c0e] min-h-screen">

      {/* HERO — asimétrico con línea vertical */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Imagen mitad derecha */}
        {heroImagen && (
          <div className="absolute right-0 top-0 w-1/2 h-full hidden md:block">
            <img src={heroImagen} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0c0c0e 0%, transparent 40%)' }} />
            <div className="absolute inset-0 bg-[#0c0c0e]/40" />
          </div>
        )}

        {/* Grid decorativo tenue */}
        {!heroImagen && (
          <div className="absolute right-0 top-0 w-1/2 h-full hidden md:block overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `linear-gradient(${colorPrimario} 1px, transparent 1px), linear-gradient(90deg, ${colorPrimario} 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }} />
          </div>
        )}

        {/* Línea vertical divisoria */}
        <div className="absolute left-[50%] top-16 bottom-16 w-px hidden md:block opacity-20" style={{ backgroundColor: colorPrimario }} />

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-32 grid md:grid-cols-[1fr_auto_1fr] gap-0 items-center">

          {/* Texto izquierda */}
          <div className="flex flex-col gap-7 pr-12">
            {heroBadge && (
              <div className="flex items-center gap-3">
                <div className="w-6 h-px" style={{ backgroundColor: colorPrimario }} />
                <span className="text-xs font-medium tracking-[0.15em] uppercase" style={{ color: colorPrimario }}>{heroBadge}</span>
              </div>
            )}
            <h1 className="text-5xl md:text-[3.75rem] font-black text-white leading-[1.05] tracking-tight">
              {heroTitulo && <span className="block">{heroTitulo}</span>}
              {heroTituloDestacado && (
                <span className="italic" style={{ color: colorPrimario }}>{heroTituloDestacado}</span>
              )}
            </h1>
            {heroSubtitulo && (
              <p className="text-base text-white/40 leading-relaxed">{heroSubtitulo}</p>
            )}
            <div className="flex flex-col gap-3 mt-2">
              <button onClick={onCta} className="group inline-flex items-center gap-3 font-bold text-sm transition-all duration-300 w-fit" style={{ color: colorPrimario }}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 group-hover:w-32" style={{ borderColor: `${colorPrimario}50`, backgroundColor: `${colorPrimario}10` }}>
                  <ArrowRight size={16} style={{ color: colorPrimario }} />
                </span>
                <span>{heroCtaPrimarioTexto || 'Reservar cancha'}</span>
              </button>
              <button onClick={onCta} className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors w-fit">
                <ArrowUpRight size={14} />
                {heroCtaSecundarioTexto || 'Ver torneos'}
              </button>
            </div>
          </div>

          {/* Separador — solo desktop */}
          <div className="hidden md:block w-px" />

          {/* Info derecha */}
          <div className="hidden md:flex flex-col gap-6 pl-16">
            <div className="flex flex-col gap-2">
              <p className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Club</p>
              <p className="text-white font-bold text-xl">{nombre}</p>
            </div>
            <div className="w-full h-px bg-white/5" />
            <div className="flex flex-col gap-2">
              <p className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Canchas disponibles</p>
              <p className="font-black text-4xl" style={{ color: colorPrimario }}>{canchasActivas.length}</p>
            </div>
            {horarioHoy?.activo && (
              <>
                <div className="w-full h-px bg-white/5" />
                <div className="flex flex-col gap-2">
                  <p className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Horario hoy</p>
                  <p className="text-white font-bold text-xl">{horarioHoy.apertura} – {horarioHoy.cierre}</p>
                </div>
              </>
            )}
            <div className="w-full h-px bg-white/5" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorPrimario }} />
              <p className="text-white/40 text-xs">Reservas abiertas</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — grid con hover elegante */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Servicios</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} onClick={onCta} className="group cursor-pointer border-t pt-6 transition-all duration-300 hover:border-opacity-100" style={{ borderColor: `${colorPrimario}30` }}>
                <div className="flex items-start justify-between mb-6">
                  <Icon size={20} className="text-white/20 group-hover:text-white/60 transition-colors" style={{ color: i === 0 ? colorPrimario : undefined }} />
                  <ArrowUpRight size={14} className="text-white/10 group-hover:text-white/40 transition-colors" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/30 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TORNEOS */}
      <TorneosSection colorPrimario={colorPrimario} dark={true} onCta={onCta} />

      {/* TURNOS DISPONIBLES */}
      {(seccionesVisibles?.reservas ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={true} />
          </div>
        </section>
      )}

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-16">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">{tituloBio}</h2>
              {anoFundacion && <span className="text-white/15 text-xs ml-auto">Est. {anoFundacion}</span>}
            </div>
            <div className="grid md:grid-cols-[1fr_320px] gap-16 items-start">
              <div className="flex flex-col gap-6">{parrafos.map((p, i) => <p key={i} className="text-white/45 leading-loose text-lg">{p}</p>)}</div>
              {fotoPrincipal
                ? <div className="rounded-2xl overflow-hidden sticky top-24"><img src={fotoPrincipal} alt={tituloBio} className="w-full h-64 object-cover" /></div>
                : <div className="hidden md:block h-64 rounded-2xl sticky top-24" style={{ background: `linear-gradient(135deg, ${colorPrimario}10, ${colorSecundario}08)`, border: `1px solid ${colorPrimario}15` }} />
              }
            </div>
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Instalaciones</h2>
            </div>
            <GaleriaGrid galeria={galeria} />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Servicios</h2>
            </div>
            <ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Nuestro equipo</h2>
            </div>
            <StaffGrid staff={staff} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Preguntas frecuentes</h2>
            </div>
            <FaqList faq={faq} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-px" style={{ backgroundColor: colorPrimario }} />
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Empezá hoy</h2>
            </div>
            <p className="text-4xl font-black text-white leading-tight">¿Listo para<br /><span className="italic" style={{ color: colorPrimario }}>jugar?</span></p>
          </div>
          <button onClick={onCta} className="group inline-flex items-center gap-4 border-b-2 pb-2 font-bold text-xl transition-all duration-300" style={{ color: colorPrimario, borderColor: `${colorPrimario}40` }}>
            {heroCtaPrimarioTexto || 'Reservar cancha'}
            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
              <Zap size={10} className="text-[#0c0c0e]" />
            </div>
            <span className="text-white font-bold text-sm">{nombre}</span>
          </div>
          <p className="text-white/15 text-xs">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}

export default Template5
