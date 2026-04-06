// Template 3 — Minimalista
// Fondo claro, tipografía limpia, mucho espacio. Profesional y sobrio.

import { Zap, CalendarDays, Trophy, Users, ArrowRight, CheckCircle } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles } from './LandingSections'

const FEATURES = [
  { icon: CalendarDays, title: 'Reservas online',  desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.' },
  { icon: Trophy,       title: 'Torneos',          desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.' },
  { icon: Users,        title: 'Tu perfil',         desc: 'Historial de partidos, estadísticas y nivel actualizado.' },
]

const Template3 = ({ club, onCta }) => {
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
    <div className="bg-slate-50 min-h-screen">

      {/* HERO */}
      <section className="min-h-screen flex items-center px-6 pt-16">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-20 items-center py-24">

          {/* Texto */}
          <div className="flex flex-col gap-6">
            {heroBadge && (
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: colorPrimario }}>
                {heroBadge}
              </span>
            )}
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
              {heroTitulo && <span className="block">{heroTitulo}</span>}
              {heroTituloDestacado && <span style={{ color: colorPrimario }}>{heroTituloDestacado}</span>}
            </h1>
            {/* Línea decorativa */}
            <div className="w-16 h-1 rounded-full" style={{ backgroundColor: colorPrimario }} />
            {heroSubtitulo && (
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">{heroSubtitulo}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <button onClick={onCta} className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 text-white" style={{ backgroundColor: colorPrimario }}>
                {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={16} />
              </button>
              <button onClick={onCta} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-2">
                {heroCtaSecundarioTexto || 'Ver torneos'} →
              </button>
            </div>
            <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400 text-xs">{canchasActivas.length} canchas disponibles</span>
              </div>
              {horarioHoy?.activo && (
                <span className="text-slate-400 text-xs">Hoy {horarioHoy.apertura} – {horarioHoy.cierre}</span>
              )}
            </div>
          </div>

          {/* Visual derecha */}
          <div className="hidden md:block">
            {heroImagen ? (
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-200">
                <img src={heroImagen} alt="Hero" className="w-full h-[480px] object-cover" />
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Canchas</p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: colorPrimario }}>{canchasActivas.length} activas</span>
                </div>
                <div className="flex flex-col gap-2">
                  {canchasActivas.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-700 text-sm font-medium flex-1">{c.nombre}</span>
                      <span className="text-slate-400 text-xs">{c.tipo}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-xs">{nombre}</span>
                  {horarioHoy?.activo && <span className="text-slate-400 text-xs">{horarioHoy.apertura} – {horarioHoy.cierre}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900">Todo en un lugar</h2>
            <p className="text-slate-400 mt-3">Reservas, torneos y estadísticas sin complicaciones.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} onClick={onCta} className="group cursor-pointer flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200" style={{ backgroundColor: `${colorPrimario}15` }}>
                  <Icon size={22} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h3 className="text-slate-800 font-bold text-base mb-1 group-hover:underline decoration-2" style={{ textDecorationColor: colorPrimario }}>{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TURNOS DISPONIBLES */}
      {(seccionesVisibles?.reservas ?? true) && (
        <section className="py-24 px-6 bg-white border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={false} />
          </div>
        </section>
      )}

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            {fotoPrincipal
              ? <div className="rounded-3xl overflow-hidden shadow-xl shadow-slate-100 border border-slate-100"><img src={fotoPrincipal} alt={tituloBio} className="w-full h-72 object-cover" /></div>
              : <div className="hidden md:block h-72 rounded-3xl bg-slate-100 border border-slate-200" />
            }
            <div>
              {anoFundacion && <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: colorPrimario }}>Desde {anoFundacion}</p>}
              <h2 className="text-3xl font-black text-slate-900 mb-6">{tituloBio}</h2>
              <div className="flex flex-col gap-4">{parrafos.map((p, i) => <p key={i} className="text-slate-500 leading-relaxed">{p}</p>)}</div>
            </div>
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section className="py-24 px-6 bg-white border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Instalaciones</h2>
            <p className="text-slate-400 mb-10">Conocé nuestras canchas y espacios.</p>
            <GaleriaGrid galeria={galeria} />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Servicios</h2>
            <p className="text-slate-400 mb-10">Todo lo que encontrás en el club.</p>
            <ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={false} />
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section className="py-24 px-6 bg-white border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Nuestro equipo</h2>
            <p className="text-slate-400 mb-10">Las personas detrás del club.</p>
            <StaffGrid staff={staff} colorPrimario={colorPrimario} dark={false} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Preguntas frecuentes</h2>
            <p className="text-slate-400 mb-10">Todo lo que necesitás saber antes de reservar.</p>
            <FaqList faq={faq} colorPrimario={colorPrimario} dark={false} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">¿Listo para jugar?</h2>
          <p className="text-white/50 mb-10">Creá tu cuenta gratis y empezá a reservar canchas hoy mismo.</p>
          <button onClick={onCta} className="inline-flex items-center gap-2 font-bold text-sm px-8 py-4 rounded-xl text-white transition-all" style={{ backgroundColor: colorPrimario }}>
            {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={16} />
          </button>
          <div className="flex items-center justify-center gap-6 mt-8">
            {['Sin costo de registro','Reserva en 30 segundos','Cancelación gratuita'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-white/30 text-xs"><CheckCircle size={13} style={{ color: colorPrimario }} />{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-white/5 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
            <Zap size={12} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">{nombre}</span>
        </div>
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

export default Template3
