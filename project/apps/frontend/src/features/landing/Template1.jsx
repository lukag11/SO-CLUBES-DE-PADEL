// Template 1 — Oscuro / Pro
// Split hero, glows, dark cards. Moderno y deportivo.

import { Zap, CalendarDays, Trophy, Users, ArrowRight, CheckCircle, ImageOff, Star } from 'lucide-react'
import { GaleriaGrid, ServiciosGrid, StaffGrid, FaqList, TurnosDisponibles, TorneosSection } from './LandingSections'

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
  { icon: CalendarDays, title: 'Reservas online', desc: 'Reservá tu cancha en segundos, 24/7, desde cualquier dispositivo.' },
  { icon: Trophy,       title: 'Torneos',         desc: 'Inscribite a torneos, seguí el cuadro y conocé a tus rivales.' },
  { icon: Users,        title: 'Tu perfil',        desc: 'Historial de partidos, estadísticas y nivel actualizado.' },
]

const Template1 = ({ club, onCta }) => {
  const { colorPrimario, nombre, canchas, horarios, heroTitulo, heroTituloDestacado,
    heroSubtitulo, heroBadge, heroCtaPrimarioTexto, heroCtaSecundarioTexto,
    heroImagen, tituloBio, historia, anoFundacion, fotoPrincipal,
    galeria, servicios, staff, faq, seccionesVisibles } = club

  const parrafos = historia ? historia.split('\n\n').filter(Boolean) : []
  const canchasActivas = canchas.filter((c) => c.activa)
  const hoy = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]
  const horarioHoy = horarios?.[hoy]

  return (
    <div className="bg-[#0d1117] min-h-screen">

      {/* HERO */}
      <section className="relative overflow-hidden min-h-screen flex items-center px-6">
        {heroImagen ? (
          <>
            <img src={heroImagen} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : (
          <>
            <CourtLines />
            <div className="absolute top-[-120px] right-[-80px] w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none opacity-[0.12]" style={{ backgroundColor: colorPrimario }} />
            <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-[0.06]" style={{ backgroundColor: colorPrimario }} />
          </>
        )}

        <div className="relative z-10 max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 items-center py-32">

          <div className="flex flex-col gap-6">
            {heroBadge && (
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-fit">
                <Zap size={11} style={{ color: colorPrimario }} />
                <span className="text-xs text-white/60 font-medium">{heroBadge}</span>
              </div>
            )}
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              {heroTitulo && <span>{heroTitulo}<br /></span>}
              {heroTituloDestacado && <span style={{ color: colorPrimario }}>{heroTituloDestacado}</span>}
            </h1>
            {heroSubtitulo && <p className="text-lg text-white/50 leading-relaxed max-w-md">{heroSubtitulo}</p>}
            <div className="flex items-center gap-4 mt-2">
              <button onClick={onCta} className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl transition-all duration-200" style={{ backgroundColor: colorPrimario, color: '#0d1117', boxShadow: `0 8px 24px ${colorPrimario}30` }}>
                {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={16} />
              </button>
              <button onClick={onCta} className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 px-5 py-3.5 rounded-xl transition-all duration-200">
                {heroCtaSecundarioTexto || 'Ver torneos'}
              </button>
            </div>
            <div className="flex items-center gap-6 pt-2 border-t border-white/5 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/40 text-xs">{canchasActivas.length} canchas disponibles</span>
              </div>
              {horarioHoy?.activo && (
                <div className="flex items-center gap-2">
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">Hoy {horarioHoy.apertura} – {horarioHoy.cierre}</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-4">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5 backdrop-blur-sm">
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
                  {[1,2,3,4,5].map((i) => <Star key={i} size={13} fill={colorPrimario} style={{ color: colorPrimario }} />)}
                  <span className="text-white/50 text-xs ml-1">5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">Todo lo que necesitás</h2>
            <p className="text-white/40 mt-3">Reservas, torneos y estadísticas en un solo lugar.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} onClick={onCta} className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-white/15 hover:bg-white/8 transition-all duration-200 cursor-pointer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${colorPrimario}20` }}>
                  <Icon size={20} style={{ color: colorPrimario }} />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TORNEOS */}
      <TorneosSection colorPrimario={colorPrimario} dark={true} onCta={onCta} />

      {/* TURNOS DISPONIBLES */}
      {(seccionesVisibles?.reservas ?? true) && (
        <section className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <TurnosDisponibles canchas={canchas} horarios={horarios} colorPrimario={colorPrimario} onCta={onCta} dark={true} />
          </div>
        </section>
      )}

      {/* HISTORIA */}
      {parrafos.length > 0 && (seccionesVisibles?.historia ?? true) && (
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white">{tituloBio}</h2>
              {anoFundacion && <p className="text-white/40 mt-2 text-sm">Desde {anoFundacion}</p>}
            </div>
            <div className={fotoPrincipal ? 'grid md:grid-cols-2 gap-12 items-center' : 'max-w-3xl mx-auto'}>
              {fotoPrincipal
                ? <div className="rounded-2xl overflow-hidden border border-white/8"><img src={fotoPrincipal} alt={tituloBio} className="w-full h-72 object-cover" /></div>
                : <div className="hidden md:flex items-center justify-center w-full h-56 rounded-2xl border border-white/8 bg-white/3"><ImageOff size={32} className="text-white/15" /></div>
              }
              <div className="flex flex-col gap-4">{parrafos.map((p, i) => <p key={i} className="text-white/55 text-base leading-relaxed">{p}</p>)}</div>
            </div>
          </div>
        </section>
      )}

      {/* GALERÍA */}
      {galeria?.length > 0 && (seccionesVisibles?.galeria ?? true) && (
        <section className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Instalaciones</h2>
              <p className="text-white/40 mt-3">Conocé nuestras canchas y espacios.</p>
            </div>
            <GaleriaGrid galeria={galeria} />
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      {servicios?.some((s) => s.activo) && (seccionesVisibles?.servicios ?? true) && (
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Servicios</h2>
              <p className="text-white/40 mt-3">Todo lo que encontrás en el club.</p>
            </div>
            <ServiciosGrid servicios={servicios} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* STAFF */}
      {staff?.length > 0 && (seccionesVisibles?.staff ?? true) && (
        <section className="py-20 px-6 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Nuestro equipo</h2>
              <p className="text-white/40 mt-3">Las personas detrás del club.</p>
            </div>
            <StaffGrid staff={staff} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq?.length > 0 && (seccionesVisibles?.faq ?? true) && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Preguntas frecuentes</h2>
              <p className="text-white/40 mt-3">Todo lo que necesitás saber antes de reservar.</p>
            </div>
            <FaqList faq={faq} colorPrimario={colorPrimario} dark={true} />
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">¿Listo para jugar?</h2>
          <p className="text-white/40 mt-4">Creá tu cuenta gratis y empezá a reservar canchas hoy mismo.</p>
          <button onClick={onCta} className="inline-flex items-center gap-2 font-bold text-sm px-8 py-4 rounded-xl transition-all mt-8" style={{ backgroundColor: colorPrimario, color: '#0d1117', boxShadow: `0 8px 32px ${colorPrimario}30` }}>
            {heroCtaPrimarioTexto || 'Reservar cancha'} <ArrowRight size={16} />
          </button>
          <div className="flex items-center justify-center gap-6 mt-8">
            {['Sin costo de registro','Reserva en 30 segundos','Cancelación gratuita'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-white/35 text-xs"><CheckCircle size={13} style={{ color: colorPrimario }} />{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
            <Zap size={12} className="text-[#0d1117]" />
          </div>
          <span className="text-white font-bold text-sm">{nombre}</span>
        </div>
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

export default Template1
