// Template 4 — Bold / Deportivo
// Muy oscuro, bordes en color primario, números de sección grandes, agresivo y dinámico.

import { Zap, CalendarDays, Trophy, Users, ArrowRight } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles, TorneosSection } from './LandingSections'

const FEATURES = [
  { icon: CalendarDays, title: 'Reservas online',  desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.' },
  { icon: Trophy,       title: 'Torneos',          desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.' },
  { icon: Users,        title: 'Tu perfil',         desc: 'Historial de partidos, estadísticas y nivel actualizado.' },
]

const Template4 = ({ club, onCta }) => {
  const { colorPrimario, nombre, canchas, horarios,
    heroTitulo, heroTituloDestacado, heroSubtitulo, heroBadge,
    heroCtaPrimarioTexto, heroCtaSecundarioTexto, heroImagen,
    tituloBio, historia, anoFundacion, fotoPrincipal,
    galeria, servicios, staff, faq, seccionesVisibles } = club

  const parrafos = historia ? historia.split('\n\n').filter(Boolean) : []
  const canchasActivas = canchas.filter((c) => c.activa)
  const hoy = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]
  const horarioHoy = horarios?.[hoy]

  return (
    <div className="bg-[#080808] min-h-screen">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden px-6">

        {/* Imagen con overlay muy oscuro */}
        {heroImagen && (
          <>
            <img src={heroImagen} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-[#080808]/70" />
          </>
        )}

        {/* Línea vertical decorativa izquierda */}
        <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: colorPrimario }} />

        {/* Glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.07]" style={{ backgroundColor: colorPrimario }} />

        <div className="relative z-10 max-w-6xl mx-auto w-full py-32 pl-8">
          {heroBadge && (
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12" style={{ backgroundColor: colorPrimario }} />
              <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: colorPrimario }}>{heroBadge}</span>
            </div>
          )}

          <h1 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter mb-6">
            {heroTitulo && <span className="block">{heroTitulo}</span>}
            {heroTituloDestacado && (
              <span className="block" style={{
                color: 'transparent',
                WebkitTextStroke: `2px ${colorPrimario}`,
              }}>
                {heroTituloDestacado}
              </span>
            )}
          </h1>

          {heroSubtitulo && (
            <p className="text-lg text-white/45 max-w-lg mb-10 leading-relaxed">{heroSubtitulo}</p>
          )}

          <div className="flex items-center gap-6">
            <button onClick={onCta} className="inline-flex items-center gap-3 font-black text-base px-8 py-4 rounded-xl transition-all duration-200 border-2" style={{ backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#080808' }}>
              {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={18} />
            </button>
            <button onClick={onCta} className="font-bold text-sm uppercase tracking-widest border-b-2 pb-0.5 transition-colors" style={{ color: colorPrimario, borderColor: colorPrimario }}>
              {heroCtaSecundarioTexto || 'Ver torneos'}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-10 mt-16 pt-8 border-t border-white/5">
            <div>
              <p className="text-4xl font-black" style={{ color: colorPrimario }}>{canchasActivas.length}</p>
              <p className="text-white/30 text-xs uppercase tracking-widest mt-0.5">Canchas</p>
            </div>
            {horarioHoy?.activo && (
              <>
                <div className="w-px h-10 bg-white/5" />
                <div>
                  <p className="text-xl font-black text-white">{horarioHoy.apertura}–{horarioHoy.cierre}</p>
                  <p className="text-white/30 text-xs uppercase tracking-widest mt-0.5">Horario hoy</p>
                </div>
              </>
            )}
            <div className="w-px h-10 bg-white/5" />
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }} />
                <p className="text-xl font-black text-white">Online</p>
              </div>
              <p className="text-white/30 text-xs uppercase tracking-widest mt-0.5">Estado</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — con números grandes */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto pl-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-16" style={{ color: colorPrimario }}>// Lo que ofrecemos</h2>
          <div className="flex flex-col gap-0 divide-y divide-white/5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} onClick={onCta} className="group flex items-center gap-8 py-8 cursor-pointer hover:pl-4 transition-all duration-200">
                <span className="text-5xl font-black opacity-15 shrink-0 w-16 group-hover:opacity-30 transition-opacity" style={{ color: colorPrimario }}>0{i+1}</span>
                <Icon size={28} className="shrink-0" style={{ color: colorPrimario }} />
                <div className="flex-1">
                  <h3 className="text-white font-black text-xl mb-1">{title}</h3>
                  <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
                </div>
                <ArrowRight size={20} className="text-white/10 group-hover:text-white/40 transition-colors shrink-0" />
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
          <div className="max-w-5xl mx-auto pl-8">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={true} />
          </div>
        </section>
      )}

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto pl-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: colorPrimario }}>// {tituloBio}</h2>
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                {anoFundacion && <p className="text-6xl font-black opacity-10 mb-4" style={{ color: colorPrimario }}>{anoFundacion}</p>}
                <div className="flex flex-col gap-4">{parrafos.map((p, i) => <p key={i} className="text-white/50 leading-relaxed">{p}</p>)}</div>
              </div>
              {fotoPrincipal
                ? <div className="rounded-xl overflow-hidden border-l-4" style={{ borderColor: colorPrimario }}><img src={fotoPrincipal} alt={tituloBio} className="w-full h-72 object-cover" /></div>
                : <div className="hidden md:block h-72 rounded-xl border-l-4" style={{ borderColor: colorPrimario, backgroundColor: `${colorPrimario}08` }} />
              }
            </div>
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto pl-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: colorPrimario }}>// Instalaciones</h2>
            <GaleriaGrid galeria={galeria} />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto pl-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: colorPrimario }}>// Servicios</h2>
            <ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto pl-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: colorPrimario }}>// Nuestro equipo</h2>
            <StaffGrid staff={staff} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section className="py-24 px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto pl-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: colorPrimario }}>// Preguntas frecuentes</h2>
            <FaqList faq={faq} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto pl-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: colorPrimario }}>// Empezá ahora</h2>
              <p className="text-4xl font-black text-white">¿Listo para<br />jugar?</p>
            </div>
            <button onClick={onCta} className="inline-flex items-center gap-3 font-black text-lg px-10 py-5 rounded-xl border-2 transition-all duration-200 shrink-0" style={{ borderColor: colorPrimario, color: colorPrimario }}>
              {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6 pl-14">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
            <Zap size={12} className="text-[#080808]" />
          </div>
          <span className="text-white font-bold text-sm flex-1">{nombre}</span>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} {nombre}</p>
        </div>
      </footer>
    </div>
  )
}

export default Template4
