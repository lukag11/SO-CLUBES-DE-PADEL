// Secciones reutilizables para todos los templates de landing
// Galería, Servicios, Staff, FAQ, TurnosDisponibles — cada template las importa y adapta su wrapper visual

import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ShowerHead, Car, GraduationCap, Wifi, Coffee,
  Dumbbell, Shield, Wind, Utensils, Music, Wrench,
  CalendarDays, CheckCircle, Lock, Trophy,
} from 'lucide-react'
import useReservasStore from '../../store/reservasStore'
import useTurnosFijosStore from '../../store/turnosFijosStore'
import useReservasAdminStore from '../../store/reservasAdminStore'
import usePlayerStore from '../../store/playerStore'
import useTorneosStore from '../../store/torneosStore'
import { inRange, overlaps } from '../../utils/timeUtils'

// ─── TorneoBanner ─────────────────────────────────────────────────────────────

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtFechaTorneo = (s) => { const [,m,d] = s.split('-').map(Number); return `${d} ${MESES_CORTOS[m-1]}` }

export const TorneoBanner = ({ colorPrimario = '#afca0b', dark = true }) => {
  const torneos = useTorneosStore((s) => s.torneos)

  const torneo = useMemo(() => {
    const hoy = new Date()
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const lim = new Date(hoy)
    lim.setDate(lim.getDate() + 5)
    const limStr = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, '0')}-${String(lim.getDate()).padStart(2, '0')}`
    return torneos.find((t) => t.estado === 'in_progress' && t.fechaInicio <= limStr && t.fechaFin >= hoyStr) ?? null
  }, [torneos])

  if (!torneo) return null

  return (
    <section className="py-12 px-6 relative overflow-hidden" style={{ background: dark ? 'linear-gradient(135deg,#0a0a12 0%,#0d1117 100%)' : 'linear-gradient(135deg,#f1f5f9 0%,#ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className={`relative rounded-3xl overflow-hidden border p-8 ${dark ? 'border-white/8 bg-white/3' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: colorPrimario, opacity: 0.06 }} />

          <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">

            {/* Trophy + datos del torneo */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${colorPrimario}18`, border: `1px solid ${colorPrimario}30` }}>
                <Trophy size={24} style={{ color: colorPrimario }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: colorPrimario }}>Torneo en curso</span>
                </div>
                <h3 className={`text-xl font-bold leading-snug ${dark ? 'text-white' : 'text-slate-900'}`}>{torneo.nombre}</h3>
                <p className={`text-xs mt-1 ${dark ? 'text-white/35' : 'text-slate-400'}`}>
                  {fmtFechaTorneo(torneo.fechaInicio)} → {fmtFechaTorneo(torneo.fechaFin)}
                  {torneo.categorias?.length > 0 && <> · {torneo.categorias.join(', ')}</>}
                  {torneo.inscriptos?.length > 0 && <> · {torneo.inscriptos.length} {torneo.inscriptos.length === 1 ? 'pareja' : 'parejas'}</>}
                </p>
              </div>
            </div>

            <div className={`hidden md:block w-px self-stretch ${dark ? 'bg-white/6' : 'bg-slate-100'}`} />

            {/* Invitación */}
            <div className="flex-1">
              <p className={`text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-slate-600'}`}>
                Este fin de semana las canchas están reservadas para el torneo.{' '}
                <span className={`font-medium ${dark ? 'text-white/80' : 'text-slate-800'}`}>No hay turnos disponibles esos días</span>,
                {' '}pero el torneo es abierto a todos —{' '}
                <span style={{ color: colorPrimario }} className="font-semibold">
                  vení a alentar, disfrutar del ambiente y ser parte del club.
                </span>
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ─── TorneosSection ──────────────────────────────────────────────────────────

export const TorneosSection = ({ colorPrimario = '#afca0b', dark = true, onCta }) => {
  const navigate = useNavigate()
  const torneos  = useTorneosStore((s) => s.torneos)

  const visibles = useMemo(() => {
    return [...torneos]
      .filter((t) => t.estado === 'open' || t.estado === 'in_progress')
      .sort((a, b) => a.fechaInicio < b.fechaInicio ? -1 : 1)
      .slice(0, 3)
  }, [torneos])

  if (visibles.length === 0) return null

  const totalCupo = (t) =>
    t.cupoLibre ? null : Object.values(t.cuposPorCategoria).reduce((a, b) => a + b, 0)

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Título */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border"
            style={{ borderColor: `${colorPrimario}30`, backgroundColor: `${colorPrimario}10` }}
          >
            <Trophy size={12} style={{ color: colorPrimario }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colorPrimario }}>Torneos</span>
          </div>
          <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Competí con nosotros
          </h2>
          <p className={`mt-3 text-sm ${dark ? 'text-white/40' : 'text-slate-500'}`}>
            Inscribite y seguí el cuadro en tiempo real.
          </p>
        </div>

        {/* Cards */}
        <div className={`grid gap-4 ${
          visibles.length === 1 ? 'max-w-md mx-auto' :
          visibles.length === 2 ? 'md:grid-cols-2' :
          'md:grid-cols-3'
        }`}>
          {visibles.map((t) => {
            const cupo      = totalCupo(t)
            const inscriptos = t.inscriptos.length
            const pct       = cupo ? Math.round((inscriptos / cupo) * 100) : 0
            const lleno     = cupo !== null && inscriptos >= cupo
            const enCurso   = t.estado === 'in_progress'

            return (
              <div
                key={t.id}
                className={`relative rounded-2xl border overflow-hidden flex flex-col transition-all ${
                  dark
                    ? 'bg-white/3 border-white/8 hover:border-white/18'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Badge estado */}
                <div className="absolute top-3 right-3">
                  {enCurso ? (
                    <span
                      className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${colorPrimario}20`, color: colorPrimario }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: colorPrimario }} />
                      En curso
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      dark ? 'text-emerald-400 bg-emerald-400/15' : 'text-emerald-700 bg-emerald-100'
                    }`}>
                      Inscripción abierta
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Ícono + nombre */}
                  <div className="flex items-start gap-3 pr-24">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${colorPrimario}18`, border: `1px solid ${colorPrimario}30` }}
                    >
                      <Trophy size={18} style={{ color: colorPrimario }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-bold text-sm leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {t.nombre}
                      </h3>
                      <p className={`text-xs mt-0.5 ${dark ? 'text-white/35' : 'text-slate-500'}`}>
                        {t.categorias?.join(' · ')}
                        {t.genero && t.genero !== 'Masculino' && ` · ${t.genero}`}
                      </p>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className={`flex items-center gap-1.5 text-xs ${dark ? 'text-white/35' : 'text-slate-500'}`}>
                    <CalendarDays size={11} className="shrink-0" />
                    {fmtFechaTorneo(t.fechaInicio)} → {fmtFechaTorneo(t.fechaFin)}
                  </div>

                  {/* Cupo (solo torneos open) */}
                  {!enCurso && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs ${dark ? 'text-white/30' : 'text-slate-400'}`}>Parejas inscriptas</span>
                        {t.cupoLibre ? (
                          <span className={`text-xs font-semibold ${dark ? 'text-white/40' : 'text-slate-600'}`}>Sin límite</span>
                        ) : (
                          <span className={`text-xs font-semibold ${lleno ? 'text-red-400' : dark ? 'text-white/50' : 'text-slate-600'}`}>
                            {inscriptos} / {cupo}
                          </span>
                        )}
                      </div>
                      {!t.cupoLibre && (
                        <div className={`h-1 rounded-full overflow-hidden ${dark ? 'bg-white/8' : 'bg-slate-100'}`}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: lleno ? '#ef4444' : colorPrimario,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {enCurso && (
                    <p className={`text-xs ${dark ? 'text-white/30' : 'text-slate-500'}`}>
                      {inscriptos} pareja{inscriptos !== 1 ? 's' : ''} compitiendo
                    </p>
                  )}
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  {enCurso ? (
                    <button
                      onClick={() => navigate(`/torneos/${t.id}`)}
                      className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                        dark
                          ? 'border-white/10 text-white/55 hover:border-white/25 hover:text-white hover:bg-white/5'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Seguir el torneo →
                    </button>
                  ) : (
                    <button
                      onClick={onCta}
                      disabled={lleno}
                      className={`w-full py-2.5 text-sm font-bold rounded-xl transition-all ${
                        lleno
                          ? dark
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : ''
                      }`}
                      style={!lleno ? {
                        backgroundColor: colorPrimario,
                        color: '#0d1117',
                        boxShadow: `0 4px 16px ${colorPrimario}30`,
                      } : undefined}
                    >
                      {lleno ? 'Cupo completo' : 'Inscribirme'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}

// ─── Mapa de íconos ──────────────────────────────────────────────────────────

const ICON_MAP = {
  ShowerHead, Car, GraduationCap, Wifi, Coffee,
  Dumbbell, Shield, Wind, Utensils, Music,
}

export const ServicioIcon = ({ icono, size = 20, className }) => {
  const Icon = ICON_MAP[icono] ?? Wrench
  return <Icon size={size} className={className} />
}

// ─── Galería ─────────────────────────────────────────────────────────────────

export const GaleriaGrid = ({ galeria, className = '' }) => {
  if (!galeria?.length) return null
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {galeria.map((foto) => (
        <div key={foto.id} className="relative group rounded-xl overflow-hidden aspect-video">
          <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          {foto.caption && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <p className="text-white text-xs font-medium">{foto.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Servicios ───────────────────────────────────────────────────────────────

export const ServiciosGrid = ({ servicios, colorPrimario, dark = true }) => {
  const activos = servicios?.filter((s) => s.activo) ?? []
  if (!activos.length) return null
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {activos.map((s) => (
        <div
          key={s.id}
          className={`flex items-start gap-4 p-5 rounded-2xl border ${dark ? 'bg-white/5 border-white/8' : 'bg-white border-slate-100 shadow-sm'}`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${colorPrimario}20` }}>
            <ServicioIcon icono={s.icono} size={20} style={{ color: colorPrimario }} />
          </div>
          <div>
            <p className={`font-semibold text-sm mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>{s.titulo}</p>
            <p className={`text-xs leading-relaxed ${dark ? 'text-white/45' : 'text-slate-500'}`}>{s.descripcion}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export const StaffGrid = ({ staff, colorPrimario, dark = true }) => {
  if (!staff?.length) return null
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
      {staff.map((m) => {
        const inicial = m.nombre?.charAt(0)?.toUpperCase() ?? '?'
        return (
          <div key={m.id} className={`flex flex-col items-center text-center p-6 rounded-2xl border ${dark ? 'bg-white/5 border-white/8' : 'bg-white border-slate-100 shadow-sm'}`}>
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 flex items-center justify-center text-lg font-bold" style={{ borderColor: `${colorPrimario}40`, backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
              {m.foto
                ? <img src={m.foto} alt={m.nombre} className="w-full h-full object-cover" />
                : inicial
              }
            </div>
            <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{m.nombre}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: colorPrimario }}>{m.rol}</p>
            {m.descripcion && (
              <p className={`text-xs leading-relaxed mt-3 ${dark ? 'text-white/40' : 'text-slate-400'}`}>{m.descripcion}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FaqItemLanding = ({ item, colorPrimario, dark }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${dark ? 'border-white/8' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${dark ? 'hover:bg-white/4' : 'hover:bg-slate-50'}`}
      >
        <span className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-700'}`}>{item.pregunta}</span>
        {open
          ? <ChevronUp size={16} className={dark ? 'text-white/40 shrink-0' : 'text-slate-400 shrink-0'} />
          : <ChevronDown size={16} className={dark ? 'text-white/40 shrink-0' : 'text-slate-400 shrink-0'} />
        }
      </button>
      {open && (
        <div className={`px-5 pb-4 border-t text-sm leading-relaxed ${dark ? 'border-white/5 text-white/50' : 'border-slate-100 text-slate-500'}`}>
          <p className="pt-3">{item.respuesta}</p>
        </div>
      )}
    </div>
  )
}

export const FaqList = ({ faq, colorPrimario, dark = true }) => {
  if (!faq?.length) return null
  return (
    <div className="flex flex-col gap-2">
      {faq.map((f) => (
        <FaqItemLanding key={f.id} item={f} colorPrimario={colorPrimario} dark={dark} />
      ))}
    </div>
  )
}

// ─── Turnos disponibles ───────────────────────────────────────────────────────

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const fmtDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDaysTo = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

const FRANJAS = [
  { inicio: '07:00', fin: '08:30' }, { inicio: '08:30', fin: '10:00' },
  { inicio: '10:00', fin: '11:30' }, { inicio: '11:30', fin: '13:00' },
  { inicio: '13:00', fin: '14:30' }, { inicio: '14:30', fin: '16:00' },
  { inicio: '16:00', fin: '17:30' }, { inicio: '17:30', fin: '19:00' },
  { inicio: '19:00', fin: '20:30' }, { inicio: '20:30', fin: '22:00' },
  { inicio: '22:00', fin: '23:30' },
]

const DIAS_SEMANA_KEY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const getDiaKey = (date) => DIAS_SEMANA_KEY[date.getDay()]

const calcSlotsConFranjas = (canchaId, fechaStr, diaKey, apertura, cierre, reservasConfirmadas, turnosFijos, reservasAdmin) =>
  FRANJAS.filter((f) => inRange(f.inicio, f.fin, apertura, cierre)).map((f) => {
    const tieneReserva = reservasConfirmadas.some(
      (r) => !r.esTurnoFijo && Number(r.canchaId) === Number(canchaId) &&
             r.fecha === fechaStr && overlaps(r.hora, r.horaFin || r.hora, f.inicio, f.fin)
    )
    const tieneTurnoFijo = turnosFijos.some(
      (t) => t.activo && Number(t.canchaId) === Number(canchaId) && t.dia === diaKey &&
             overlaps(t.inicio, t.fin || t.inicio, f.inicio, f.fin) &&
             !(t.diasAusentes || []).includes(fechaStr)
    )
    const tieneReservaAdmin = (reservasAdmin || []).some(
      (r) => Number(r.canchaId) === Number(canchaId) && r.fecha === fechaStr &&
             r.estado !== 'cancelada' && overlaps(r.inicio, r.fin, f.inicio, f.fin)
    )
    return { ...f, libre: !tieneReserva && !tieneTurnoFijo && !tieneReservaAdmin }
  })

// Keyframes inyectados una sola vez al DOM
const KEYFRAMES = `
  @keyframes td-ring {
    0%   { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes td-freed-in {
    0%   { transform: translateY(-14px) scaleY(0.92); opacity: 0; }
    60%  { transform: translateY(2px) scaleY(1.01); opacity: 1; }
    100% { transform: translateY(0) scaleY(1); opacity: 1; }
  }
  @keyframes td-scan {
    0%   { left: -40%; }
    100% { left: 110%; }
  }
  @keyframes td-slot-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
    50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
  }
  @keyframes td-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }
  @keyframes td-num-pop {
    0%   { transform: scale(1.25) translateY(-4px); opacity: 0.3; }
    100% { transform: scale(1)    translateY(0);    opacity: 1; }
  }
  @keyframes td-card-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(16,185,129,0.06); }
    50%       { box-shadow: 0 0 24px rgba(16,185,129,0.14); }
  }
`

export const TurnosDisponibles = ({ canchas, horarios, colorPrimario, onCta, dark = true }) => {
  const navigate = useNavigate()
  const reservas = useReservasStore((s) => s.reservas)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)
  const reservasAdmin = useReservasAdminStore((s) => s.reservas)
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const torneos = useTorneosStore((s) => s.torneos)
  const [diaOffset, setDiaOffset] = useState(0)
  const [recentlyFreed, setRecentlyFreed] = useState([]) // [{ canchaId, canchaNombre, slot, freeSince }]
  const prevDataRef = useRef(null)
  const cp = colorPrimario || '#10b981'

  const hoy = useMemo(() => new Date(), [])
  const diaActual = addDaysTo(hoy, diaOffset)
  const fechaStr = fmtDateStr(diaActual)
  const diaNombreLargo = DIAS_LARGOS[diaActual.getDay()]
  const diaKey = getDiaKey(diaActual)
  const horarioDia = horarios?.[diaNombreLargo]
  const canchasActivas = (canchas ?? []).filter((c) => c.activa)

  const reservasConfirmadas = useMemo(() => reservas.filter((r) => r.estado === 'confirmada'), [reservas])

  const dataPorCancha = useMemo(() => {
    if (!horarioDia?.activo) return []
    return canchasActivas.map((c) => {
      const slots = calcSlotsConFranjas(c.id, fechaStr, diaKey, horarioDia.apertura, horarioDia.cierre, reservasConfirmadas, turnosFijos, reservasAdmin)
      return { cancha: c, slots, libres: slots.filter((s) => s.libre).length }
    })
  }, [canchasActivas, fechaStr, diaKey, horarioDia, reservasConfirmadas, turnosFijos, reservasAdmin])

  const totalLibres = dataPorCancha.reduce((sum, d) => sum + d.libres, 0)

  // Detectar transiciones ocupado → libre (y simular una al montar para demo)
  useEffect(() => {
    if (!prevDataRef.current) {
      prevDataRef.current = dataPorCancha
      if (diaOffset === 0 && dataPorCancha.length > 0) {
        const libres = dataPorCancha.flatMap((d) =>
          d.slots.filter((s) => s.libre).map((s) => ({ canchaId: d.cancha.id, canchaNombre: d.cancha.nombre, slot: s }))
        )
        if (libres.length > 0) {
          const pick = libres[Math.floor(Math.random() * libres.length)]
          setRecentlyFreed([{ ...pick, freeSince: Date.now() }])
        }
      }
      return
    }
    const nuevos = []
    dataPorCancha.forEach((d) => {
      const prev = prevDataRef.current.find((p) => p.cancha.id === d.cancha.id)
      if (!prev) return
      d.slots.forEach((slot) => {
        const prevSlot = prev.slots.find((s) => s.inicio === slot.inicio)
        if (prevSlot && !prevSlot.libre && slot.libre)
          nuevos.push({ canchaId: d.cancha.id, canchaNombre: d.cancha.nombre, slot, freeSince: Date.now() })
      })
    })
    if (nuevos.length) setRecentlyFreed((prev) => [...prev, ...nuevos].slice(-3))
    prevDataRef.current = dataPorCancha
  }, [dataPorCancha, diaOffset])

  // Auto-expirar freed slots y refrescar texto "hace instantes"
  useEffect(() => {
    const t = setInterval(() => {
      setRecentlyFreed((prev) => prev.filter((r) => Date.now() - r.freeSince < 28000))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const tiempoDesde = (ts) => {
    const sec = Math.floor((Date.now() - ts) / 1000)
    if (sec < 12) return 'hace instantes'
    if (sec < 60) return `hace ${sec}s`
    return 'hace un momento'
  }

  const isRecienLiberado = (canchaId, inicio) =>
    recentlyFreed.some((r) => r.canchaId === canchaId && r.slot.inicio === inicio)

  const torneoDelDia = useMemo(
    () => torneos.find((t) => t.estado === 'in_progress' && fechaStr >= t.fechaInicio && fechaStr <= t.fechaFin) ?? null,
    [torneos, fechaStr]
  )

  const torneoProximo = useMemo(() => {
    const hoyStr = fmtDateStr(new Date())
    const lim = new Date(); lim.setDate(lim.getDate() + 6)
    const limStr = fmtDateStr(lim)
    return torneos.find((t) => t.estado === 'in_progress' && t.fechaInicio <= limStr && t.fechaFin >= hoyStr) ?? null
  }, [torneos])

  const getTorneoDia = (d) => {
    const s = fmtDateStr(d)
    return torneos.find((t) => t.estado === 'in_progress' && s >= t.fechaInicio && s <= t.fechaFin) ?? null
  }

  // Solo grisea el día si el torneo bloquea TODAS las canchas activas
  const esDiaTorneo = (d) => {
    const t = getTorneoDia(d)
    if (!t) return false
    if (!t.canchasAsignadas?.length) return true
    return t.canchasAsignadas.length >= canchasActivas.length
  }

  const torneoBloqueTodas = torneoDelDia
    ? (!torneoDelDia.canchasAsignadas?.length || torneoDelDia.canchasAsignadas.length >= canchasActivas.length)
    : false

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="flex flex-col gap-5">

        {/* ── BANNER TORNEO ─────────────────────────────────────────────────── */}
        {torneoProximo && (
          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${dark ? 'bg-white/3 border-white/8' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cp}18` }}>
              <Trophy size={15} style={{ color: cp }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: cp }} />
                <span className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{torneoProximo.nombre}</span>
                <span className={`text-[10px] shrink-0 ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                  {fmtFechaTorneo(torneoProximo.fechaInicio)} → {fmtFechaTorneo(torneoProximo.fechaFin)}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/30' : 'text-slate-500'}`}>
                {torneoBloqueTodas
                  ? 'Todas las canchas están reservadas para el torneo — los demás días están disponibles normalmente'
                  : 'Algunas canchas están reservadas para el torneo — el resto están disponibles para reservar'
                }
              </p>
            </div>
          </div>
        )}

        {/* ── HEADER: live badge + counter + selector de días ─────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">

          {/* Counter */}
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              {/* Pulsing ring */}
              <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.2, animation: 'td-ring 1.8s ease-out infinite' }} />
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.12, animation: 'td-ring 1.8s ease-out infinite 0.6s' }} />
                <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: cp }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: cp }}>En vivo</span>
              <span className={`text-[10px] ${dark ? 'text-white/15' : 'text-slate-300'}`}>·</span>
              <span className={`text-[10px] font-medium capitalize ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                {diaOffset === 0 ? 'Hoy · ' : ''}{DIAS_LARGOS[diaActual.getDay()]} {diaActual.getDate()}
              </span>
            </div>

            {torneoDelDia ? (
              <div className="flex items-center gap-3">
                <Trophy size={36} style={{ color: cp, opacity: 0.55 }} />
                <div>
                  <p className={`text-xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-800'}`}>Torneo en curso</p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>Sin turnos disponibles este día</p>
                </div>
              </div>
            ) : horarioDia?.activo ? (
              <div className="flex items-baseline gap-3">
                <span
                  key={`${totalLibres}-${fechaStr}`}
                  className="text-6xl font-black tabular-nums leading-none"
                  style={{ color: cp, animation: 'td-num-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
                >
                  {totalLibres}
                </span>
                <div>
                  <p className={`text-xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                    turno{totalLibres !== 1 ? 's' : ''} libre{totalLibres !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                    {horarioDia.apertura}–{horarioDia.cierre} hs
                  </p>
                </div>
              </div>
            ) : (
              <p className={`text-2xl font-bold ${dark ? 'text-white/25' : 'text-slate-400'}`}>Club cerrado hoy</p>
            )}
          </div>

          {/* Selector de días */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDiaOffset(Math.max(0, diaOffset - 1))}
              disabled={diaOffset === 0}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDaysTo(hoy, i)
                const sel = i === diaOffset
                const esTorneo = esDiaTorneo(d)
                return (
                  <button
                    key={i}
                    onClick={() => setDiaOffset(i)}
                    className={[
                      'flex flex-col items-center w-10 py-1.5 rounded-xl border text-center transition-all duration-200',
                      esTorneo && !sel ? (dark ? 'border-white/4 text-white/15 cursor-pointer' : 'border-slate-100 text-slate-300 cursor-pointer') : '',
                      !esTorneo && !sel && dark  ? 'border-white/6 text-white/30 hover:text-white hover:bg-white/5 hover:border-white/15' : '',
                      !esTorneo && !sel && !dark ? 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50' : '',
                    ].join(' ')}
                    style={sel && esTorneo
                      ? { backgroundColor: `${cp}10`, borderColor: `${cp}30`, color: dark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }
                      : sel
                      ? { backgroundColor: `${cp}18`, borderColor: `${cp}50`, color: cp }
                      : {}}
                  >
                    <span className="text-[8px] font-black uppercase leading-none mb-0.5">{i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}</span>
                    <span className="text-[13px] font-black leading-tight">{d.getDate()}</span>
                    {esTorneo && <span className="text-[7px] leading-none mt-0.5 opacity-60" style={{ color: cp }}>torneo</span>}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setDiaOffset(Math.min(6, diaOffset + 1))}
              disabled={diaOffset === 6}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── NOTIFICACIÓN: Cancha liberada ─────────────────────────────────── */}
        {recentlyFreed.map((freed) => (
          <div
            key={`${freed.canchaId}-${freed.slot.inicio}`}
            className="rounded-2xl overflow-hidden cursor-pointer select-none"
            style={{ animation: 'td-freed-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            onClick={() => {
              if (!isAuthenticated) { onCta(); return }
              navigate('/dashboardJugadores/reservas', { state: { canchaId: freed.canchaId, fechaStr, hora: freed.slot.inicio } })
            }}
          >
            <div className="relative px-5 py-3.5 flex items-center gap-4 overflow-hidden"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
              {/* Scan line animation */}
              <div className="absolute inset-y-0 w-2/5 pointer-events-none"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.12),transparent)', animation: 'td-scan 2.8s ease-in-out infinite' }} />
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{ backgroundColor: 'rgba(16,185,129,0.18)', animation: 'td-slot-glow 2s ease-in-out infinite' }}>
                <CalendarDays size={16} style={{ color: '#10b981' }} />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Cancha liberada</span>
                  <span className="text-[9px] text-emerald-600 font-medium">{tiempoDesde(freed.freeSince)}</span>
                </div>
                <p className={`text-sm font-bold truncate ${dark ? 'text-white/85' : 'text-slate-700'}`}>
                  {freed.canchaNombre} · {freed.slot.inicio} a {freed.slot.fin}
                </p>
              </div>
              {/* CTA badge */}
              <div className="shrink-0 relative z-10"
                style={{ animation: 'td-float 2.2s ease-in-out infinite' }}>
                <div className="px-3 py-1.5 rounded-xl text-[11px] font-black"
                  style={{ backgroundColor: 'rgba(16,185,129,0.22)', color: '#10b981' }}>
                  {isAuthenticated ? 'Reservar →' : 'Ver →'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── GRID DE CANCHAS ───────────────────────────────────────────────── */}
        {torneoDelDia && torneoBloqueTodas ? (
          <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-white/2 border-white/6' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${cp}14` }}>
              <Trophy size={22} style={{ color: cp, opacity: 0.7 }} />
            </div>
            <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white/50' : 'text-slate-600'}`}>{torneoDelDia.nombre}</p>
            <p className={`text-xs ${dark ? 'text-white/20' : 'text-slate-400'}`}>
              Las canchas están reservadas para el torneo este día.{' '}
              <span style={{ color: cp }} className="font-medium">Vení a disfrutar el ambiente.</span>
            </p>
          </div>
        ) : !horarioDia?.activo ? (
          <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-white/2 border-white/6' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${cp}12` }}>
              <CalendarDays size={18} className={dark ? 'text-white/20' : 'text-slate-300'} />
            </div>
            <p className={`text-sm font-medium ${dark ? 'text-white/25' : 'text-slate-400'}`}>El club no abre este día</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {dataPorCancha.map(({ cancha, slots, libres }) => {
              const hayFreed = recentlyFreed.some((r) => r.canchaId === cancha.id)
              const pctOcupado = Math.round(((slots.length - libres) / Math.max(slots.length, 1)) * 100)

              return (
                <div
                  key={cancha.id}
                  className="rounded-2xl overflow-hidden transition-all duration-500"
                  style={{
                    backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'white',
                    border: hayFreed
                      ? '1px solid rgba(16,185,129,0.35)'
                      : dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9',
                    animation: hayFreed ? 'td-card-glow 2.5s ease-in-out infinite' : 'none',
                    boxShadow: !hayFreed && !dark ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                  }}
                >
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-black text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{cancha.nombre}</p>
                        {hayFreed && (
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', animation: 'td-float 1.8s ease-in-out infinite' }}
                          >
                            ¡Libre!
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                        {cancha.tipo} · {cancha.indoor ? 'Indoor' : 'Outdoor'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: cp }}>{libres}</p>
                      <p className={`text-[8px] font-bold uppercase tracking-wide ${dark ? 'text-white/20' : 'text-slate-300'}`}>libres</p>
                    </div>
                  </div>

                  {/* Slot grid — vertical, uno abajo del otro */}
                  <div className="px-4 pb-3 flex flex-col gap-1.5">
                    {slots.map((slot) => {
                      const recienLiberado = isRecienLiberado(cancha.id, slot.inicio)
                      if (!slot.libre) {
                        return (
                          <div key={slot.inicio}
                            className="h-8 px-3 rounded-xl text-[10px] font-medium flex items-center select-none"
                            style={{
                              backgroundColor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)',
                              color: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
                              textDecoration: 'line-through',
                              border: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)',
                            }}
                          >
                            {slot.inicio} — {slot.fin}
                          </div>
                        )
                      }
                      return (
                        <button
                          key={slot.inicio}
                          onClick={() => {
                            if (!isAuthenticated) { onCta(); return }
                            navigate('/dashboardJugadores/reservas', { state: { canchaId: cancha.id, fechaStr, hora: slot.inicio } })
                          }}
                          className="relative h-8 px-3 rounded-xl text-[10px] font-bold flex items-center justify-between gap-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:brightness-110 overflow-hidden group"
                          style={{
                            backgroundColor: recienLiberado ? 'rgba(16,185,129,0.12)' : `${cp}12`,
                            color: recienLiberado ? '#10b981' : cp,
                            border: recienLiberado ? '1px solid rgba(16,185,129,0.35)' : `1px solid ${cp}28`,
                            animation: recienLiberado ? 'td-slot-glow 1.6s ease-in-out infinite' : 'none',
                          }}
                        >
                          {/* Scan shimmer on hover */}
                          <div className="absolute inset-y-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: `linear-gradient(90deg,transparent,${recienLiberado ? 'rgba(16,185,129,0.15)' : `${cp}25`},transparent)`, animation: 'td-scan 1.4s ease-in-out' }} />
                          <span className="relative z-10">{slot.inicio} — {slot.fin}</span>
                          <span className="relative z-10 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {!isAuthenticated && <Lock size={7} />}
                            <span className="text-[8px] font-black uppercase tracking-wider">
                              {isAuthenticated ? 'Reservar →' : 'Ver'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Card footer: ocupación futurista */}
                  <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[8px] font-black uppercase tracking-[0.18em] ${dark ? 'text-white/20' : 'text-slate-300'}`}>Ocupación</span>
                      <span className="text-[10px] font-black tabular-nums" style={{ color: pctOcupado > 70 ? '#f87171' : pctOcupado > 40 ? '#fbbf24' : cp }}>
                        {pctOcupado}<span className="text-[7px] font-bold">%</span>
                      </span>
                    </div>
                    {/* Segmented progress bar */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => {
                        const filled = i < Math.round(pctOcupado / 10)
                        const fillColor = pctOcupado > 70 ? '#f87171' : pctOcupado > 40 ? '#fbbf24' : cp
                        return (
                          <div
                            key={i}
                            className="flex-1 h-1 rounded-full transition-all duration-700"
                            style={{
                              backgroundColor: filled
                                ? fillColor
                                : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                              boxShadow: filled ? `0 0 4px ${fillColor}80` : 'none',
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full"
                style={{ backgroundColor: cp, animation: 'td-ring 2s ease-out infinite' }} />
              <div className="w-1.5 h-1.5 rounded-full relative z-10" style={{ backgroundColor: cp }} />
            </div>
            <span className={`text-[11px] font-medium ${dark ? 'text-white/25' : 'text-slate-400'}`}>
              Actualizado en tiempo real
            </span>
          </div>
          {totalLibres > 0 && (
            <button
              onClick={onCta}
              className="flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 active:scale-95 hover:shadow-lg"
              style={{ backgroundColor: cp, color: '#0d1117' }}
            >
              {isAuthenticated ? <CheckCircle size={14} /> : <Lock size={14} />}
              {isAuthenticated ? 'Reservar ahora' : 'Iniciar sesión'}
            </button>
          )}
        </div>

      </div>
    </>
  )
}
