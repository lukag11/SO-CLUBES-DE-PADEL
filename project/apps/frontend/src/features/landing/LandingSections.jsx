// Secciones reutilizables para todos los templates de landing
// Galería, Servicios, Staff, FAQ, TurnosDisponibles — cada template las importa y adapta su wrapper visual

import { useState, useMemo } from 'react'
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ShowerHead, Car, GraduationCap, Wifi, Coffee,
  Dumbbell, Shield, Wind, Utensils, Music, Wrench,
  CalendarDays, CheckCircle, Lock,
} from 'lucide-react'
import useReservasStore from '../../store/reservasStore'
import usePlayerStore from '../../store/playerStore'

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
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const fmtDateStr = (d) => d.toISOString().slice(0, 10)
const addDaysTo = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// Mismo algoritmo determinístico que PlayerReservasPage
const isMockOcupado = (canchaId, fechaStr, hora) => {
  const h = parseInt(hora)
  const d = parseInt(fechaStr.slice(8, 10))
  return (canchaId * 7 + d * 3 + h * 13) % 4 === 0
}

const parseH = (str) => parseInt(str.split(':')[0])
const fmtH = (h) => `${String(h).padStart(2, '0')}:00`

const calcSlots = (canchaId, fechaStr, apertura, cierre, reservasConfirmadas) => {
  const inicio = parseH(apertura)
  const fin = parseH(cierre)
  return Array.from({ length: fin - inicio }, (_, i) => {
    const h = inicio + i
    const hora = fmtH(h)
    const mockOcupado = isMockOcupado(canchaId, fechaStr, hora)
    const reservado = reservasConfirmadas.some(
      (r) => r.canchaId === canchaId && r.fecha === fechaStr && r.hora === hora
    )
    return { hora, libre: !mockOcupado && !reservado }
  })
}

export const TurnosDisponibles = ({ canchas, horarios, colorPrimario, onCta, dark = true }) => {
  const reservas = useReservasStore((s) => s.reservas)
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const [diaOffset, setDiaOffset] = useState(0)

  const hoy = useMemo(() => new Date(), [])
  const diaActual = addDaysTo(hoy, diaOffset)
  const fechaStr = fmtDateStr(diaActual)
  const diaNombre = DIAS_LARGOS[diaActual.getDay()]
  const horarioDia = horarios?.[diaNombre]
  const canchasActivas = (canchas ?? []).filter((c) => c.activa)

  const reservasConfirmadas = useMemo(
    () => reservas.filter((r) => r.estado === 'confirmada'),
    [reservas]
  )

  const dataPorCancha = useMemo(() => {
    if (!horarioDia?.activo) return []
    return canchasActivas.map((c) => {
      const slots = calcSlots(c.id, fechaStr, horarioDia.apertura, horarioDia.cierre, reservasConfirmadas)
      return { cancha: c, slots, libres: slots.filter((s) => s.libre).length }
    })
  }, [canchasActivas, fechaStr, horarioDia, reservasConfirmadas])

  const totalLibres = dataPorCancha.reduce((sum, d) => sum + d.libres, 0)

  const txt = dark
    ? { bg: 'bg-transparent', border: 'border-white/8', title: 'text-white', sub: 'text-white/40', cardBg: 'bg-white/4', cardBorder: 'border-white/8', label: 'text-white/50', row: 'border-white/5' }
    : { bg: 'bg-transparent', border: 'border-slate-200', title: 'text-slate-800', sub: 'text-slate-500', cardBg: 'bg-white', cardBorder: 'border-slate-100 shadow-sm', label: 'text-slate-400', row: 'border-slate-100' }

  return (
    <div className="flex flex-col gap-6">

      {/* Header + selector de día */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={16} style={{ color: colorPrimario }} />
            <span className={`text-xs font-bold uppercase tracking-[0.15em] ${dark ? 'text-white/40' : 'text-slate-400'}`}>
              Disponibilidad de canchas
            </span>
          </div>
          <p className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
            {totalLibres > 0 ? (
              <>
                <span style={{ color: colorPrimario }}>{totalLibres}</span>
                {' '}turno{totalLibres !== 1 ? 's' : ''} libre{totalLibres !== 1 ? 's' : ''}
              </>
            ) : (
              <span className={dark ? 'text-white/30' : 'text-slate-400'}>Sin disponibilidad</span>
            )}
          </p>
        </div>

        {/* Strip de días */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDiaOffset(Math.max(0, diaOffset - 1))}
            disabled={diaOffset === 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDaysTo(hoy, i)
              const sel = i === diaOffset
              return (
                <button
                  key={i}
                  onClick={() => setDiaOffset(i)}
                  className={[
                    'flex flex-col items-center px-2.5 py-1.5 rounded-xl border transition-all min-w-[40px]',
                    sel
                      ? 'border-opacity-50'
                      : dark
                        ? 'border-white/8 text-white/40 hover:text-white hover:bg-white/4'
                        : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                  style={sel ? { backgroundColor: `${colorPrimario}15`, borderColor: `${colorPrimario}50`, color: colorPrimario } : {}}
                >
                  <span className="text-[9px] font-bold uppercase">{i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}</span>
                  <span className="text-sm font-black leading-none">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setDiaOffset(Math.min(6, diaOffset + 1))}
            disabled={diaOffset === 6}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Grid de canchas */}
      {!horarioDia?.activo ? (
        <div className={`rounded-2xl border p-8 text-center ${txt.cardBg} ${txt.cardBorder}`}>
          <p className={`text-sm ${txt.sub}`}>El club no abre este día</p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${txt.cardBg} ${txt.cardBorder}`}>
          {dataPorCancha.map(({ cancha, slots, libres }, idx) => (
            <div
              key={cancha.id}
              className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${idx > 0 ? `border-t ${txt.row}` : ''}`}
            >
              {/* Info cancha */}
              <div className="sm:w-36 shrink-0">
                <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{cancha.nombre}</p>
                <p className={`text-[10px] mt-0.5 ${txt.label}`}>{cancha.tipo} · {cancha.indoor ? 'Indoor' : 'Outdoor'}</p>
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: colorPrimario }}>
                  {libres} libres
                </p>
              </div>

              {/* Franja de slots */}
              <div className="flex flex-wrap gap-1 flex-1">
                {slots.map((slot) => (
                  <div key={slot.hora} className="relative group">
                    <button
                      onClick={slot.libre ? onCta : undefined}
                      className={[
                        'w-9 h-8 rounded-lg text-[10px] font-bold transition-all duration-150 flex items-center justify-center',
                        slot.libre
                          ? 'cursor-pointer hover:scale-110 hover:shadow-md'
                          : 'cursor-default opacity-20',
                      ].join(' ')}
                      style={slot.libre
                        ? { backgroundColor: `${colorPrimario}22`, color: colorPrimario, border: `1px solid ${colorPrimario}40` }
                        : { backgroundColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)', border: '1px solid transparent' }
                      }
                    >
                      {slot.libre && !isAuthenticated
                        ? <Lock size={9} />
                        : slot.hora.slice(0, 2)
                      }
                    </button>
                    {/* Tooltip */}
                    {slot.libre && (
                      <div className={`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 font-semibold ${dark ? 'bg-white/90 text-slate-800' : 'bg-slate-800 text-white'}`}>
                        {isAuthenticated ? slot.hora : 'Iniciá sesión para reservar'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {totalLibres > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }} />
            <span className={`text-xs ${txt.sub}`}>Actualizado en tiempo real</span>
          </div>
          <button
            onClick={onCta}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: colorPrimario, color: '#0d1117' }}
          >
            {isAuthenticated ? <CheckCircle size={14} /> : <Lock size={14} />}
            {isAuthenticated ? 'Reservar ahora' : 'Iniciar sesión para reservar'}
          </button>
        </div>
      )}
    </div>
  )
}
