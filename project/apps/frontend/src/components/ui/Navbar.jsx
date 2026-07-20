import { useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, Menu, Check, CheckCheck, LogOut, Repeat, CalendarDays, CalendarCheck, XCircle, GraduationCap, Trophy, Package, Clock, Wallet, Landmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'
import { api } from '../../lib/api'

// Icono + color por tipo de notificación (respeta la convención de la grilla: fijo=violeta, online=verde, etc.)
const NOTIF_META = {
  nueva_reserva:                        { Icon: CalendarDays,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  reserva_autoconfirmada:               { Icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  reserva_confirmada:                   { Icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  turno_fijo_autoconfirmado:            { Icon: Repeat,        color: 'text-violet-600',  bg: 'bg-violet-50'  },
  turno_fijo_pendiente:                 { Icon: Repeat,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
  solicitud_turno_fijo:                 { Icon: Repeat,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
  turno_liberado_auto:                  { Icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50'     },
  cancelacion_reserva:                  { Icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50'     },
  nueva_clase_profesor:                 { Icon: GraduationCap, color: 'text-orange-600',  bg: 'bg-orange-50'  },
  cancelacion_clase_profesor:           { Icon: GraduationCap, color: 'text-orange-600',  bg: 'bg-orange-50'  },
  actualizacion_disponibilidad_profesor:{ Icon: Clock,         color: 'text-slate-500',   bg: 'bg-slate-100'  },
  inscripcion_torneo:                   { Icon: Trophy,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
  stock_bajo:                           { Icon: Package,       color: 'text-red-600',     bg: 'bg-red-50'     },
  pago_mp:                              { Icon: Wallet,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  aviso_transferencia:                  { Icon: Landmark,      color: 'text-sky-600',     bg: 'bg-sky-50'     },
}
const notifMeta = (tipo) => NOTIF_META[tipo] || { Icon: Bell, color: 'text-brand-600', bg: 'bg-brand-50' }

const haceTexto = (fecha) => {
  if (!fecha) return ''
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const formatNotif = (n) => {
  switch (n.tipo) {
    case 'nueva_reserva':
      return { title: 'Nueva reserva', body: [n.jugador, n.cancha, n.fecha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'reserva_autoconfirmada':
      return { title: 'Reserva confirmada automáticamente', body: [n.jugador, n.cancha, n.fecha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'turno_fijo_autoconfirmado':
      return { title: 'Turno fijo confirmado automáticamente', body: [n.jugador, n.cancha, n.dia, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'turno_liberado_auto':
      return { title: 'Turno liberado automáticamente', body: [n.jugador, n.cancha, n.fecha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'turno_fijo_pendiente':
      return { title: 'Turno fijo pendiente', body: [n.jugador, n.cancha, n.dia, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'nueva_clase_profesor':
      return { title: 'Nueva clase', body: [n.profesorNombre, n.cancha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'cancelacion_clase_profesor':
      return { title: 'Clase cancelada', body: [n.profesorNombre, n.cancha, n.inicio && n.fin ? `${n.inicio}–${n.fin}` : ''].filter(Boolean).join(' · ') }
    case 'actualizacion_disponibilidad_profesor':
      return { title: 'Disponibilidad actualizada', body: n.profesorNombre ? `${n.profesorNombre} actualizó su disponibilidad semanal` : '' }
    case 'inscripcion_torneo':
      return { title: 'Inscripción torneo', body: [n.jugador1, n.jugador2, n.torneoNombre].filter(Boolean).join(' · ') }
    case 'stock_bajo':
      return { title: 'Bajo stock', body: [n.nombre, n.stock != null ? `quedan ${n.stock}` : ''].filter(Boolean).join(' · ') }
    case 'pago_mp': {
      const quien = n.jugadorNombre ? `${n.jugadorNombre} pagó` : (n.detalle === 'Mesa' ? 'Mesa pagada' : 'Cobro recibido')
      const extra = n.detalle && n.detalle !== 'Mesa' ? n.detalle : (n.count > 1 ? `${n.count} deudas` : '')
      return { title: `${quien} por Mercado Pago`, body: [n.monto != null ? `$${(n.monto).toLocaleString('es-AR')}` : '', extra].filter(Boolean).join(' · ') }
    }
    case 'aviso_transferencia': {
      const iaTxt = { coincide: '🤖 IA: coincide ✅', no_coincide: '🤖 IA: NO coincide ⚠️', dudoso: '🤖 IA: revisar', sin_comprobante: 'sin comprobante' }[n.iaVeredicto] || ''
      return { title: `${n.jugadorNombre || 'Un jugador'} avisó que transfirió`, body: [n.monto != null ? `$${(n.monto).toLocaleString('es-AR')}` : '', iaTxt].filter(Boolean).join(' · ') }
    }
    default:
      return { title: n.tipo?.replace(/_/g, ' ') ?? 'Notificación', body: '' }
  }
}

const Navbar = ({ title, onMenuClick }) => {
  const user        = useAuthStore((s) => s.user)
  const token       = useAuthStore((s) => s.token)
  const logout      = useAuthStore((s) => s.logout)
  const notificaciones   = useNotificacionesStore((s) => s.notificaciones)
  const sinLeer          = useNotificacionesStore((s) => s.sinLeer())
  const marcarLeida      = useNotificacionesStore((s) => s.marcarLeida)
  const marcarTodasLeidas = useNotificacionesStore((s) => s.marcarTodasLeidas)
  const fetchNotificaciones = useNotificacionesStore((s) => s.fetchNotificaciones)
  const [resolviendo, setResolviendo] = useState(null) // avisoId en curso (anti doble-click)

  // Confirmar / rechazar un aviso de transferencia desde la campana (1 click).
  const resolverAviso = async (n, accion) => {
    if (!n.avisoId || resolviendo) return
    setResolviendo(n.avisoId)
    try {
      await api.post(`/pagos/avisos-transferencia/${n.avisoId}/${accion}`, {}, { Authorization: `Bearer ${token}` })
      marcarLeida(n.id, token)
      fetchNotificaciones?.(token)
    } catch { /* el backend ya loguea; si falla queda el aviso sin resolver */ } finally { setResolviendo(null) }
  }
  const navigate = useNavigate()

  const [bellOpen, setBellOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const bellRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.nombre
    ? user.nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'
  // El admin del club es Dueño (owner) o Empleado (staff)
  const rolLabel = user?.rol === 'staff' ? 'Empleado' : 'Dueño'

  const handleLogout = () => { logout(); navigate('/login') }

  const recientes = [...notificaciones].slice(0, 25)

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 shrink-0">

      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">

        {/* ── Campana ── */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => { setBellOpen((v) => !v); setUserOpen(false) }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <Bell size={18} />
            {sinLeer > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {sinLeer > 9 ? '9+' : sinLeer}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header dropdown */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  Notificaciones
                  {sinLeer > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {sinLeer} sin leer
                    </span>
                  )}
                </span>
                {sinLeer > 0 && (
                  <button
                    onClick={() => marcarTodasLeidas(token)}
                    className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Marcar todas
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {recientes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">Sin notificaciones</div>
                ) : recientes.map((n) => {
                  const { title: tit, body } = formatNotif(n)
                  const meta = notifMeta(n.tipo)
                  return (
                    <div
                      key={n.id}
                      className={['group relative flex items-start gap-3 pl-4 pr-3 py-3 transition-colors', n.leida ? 'bg-white hover:bg-slate-50/60' : 'bg-brand-50/40 hover:bg-brand-50/70'].join(' ')}
                    >
                      {/* Acento de no leída */}
                      {!n.leida && <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full" />}

                      {/* Chip de icono por tipo */}
                      <div className={['w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg].join(' ')}>
                        <meta.Icon size={16} className={meta.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={['text-xs truncate flex-1', n.leida ? 'font-medium text-slate-600' : 'font-semibold text-slate-800'].join(' ')}>{tit}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{haceTexto(n.timestamp)}</span>
                        </div>
                        {body && <p className="text-[11px] text-slate-400 truncate mt-0.5">{body}</p>}
                        {/* Aviso de transferencia → resolver en 1 click (salda o rechaza) */}
                        {n.tipo === 'aviso_transferencia' && n.avisoId && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <button onClick={() => resolverAviso(n, 'confirmar')} disabled={resolviendo === n.avisoId} className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold disabled:opacity-50">
                              {resolviendo === n.avisoId ? '…' : 'Confirmar cobro'}
                            </button>
                            <button onClick={() => resolverAviso(n, 'rechazar')} disabled={resolviendo === n.avisoId} className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold disabled:opacity-50">
                              Rechazar
                            </button>
                            {n.comprobanteUrl && (
                              <a href={n.comprobanteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-2.5 py-1 rounded-lg text-sky-600 hover:bg-sky-50 text-[11px] font-semibold">Ver comprobante</a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Marcar como leída — aparece al hover */}
                      {!n.leida && (
                        <button
                          onClick={() => marcarLeida(n.id, token)}
                          title="Marcar como leída"
                          className="shrink-0 self-center w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-brand-600 hover:bg-brand-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Usuario ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserOpen((v) => !v); setBellOpen(false) }}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <div className="w-8 h-8 bg-brand-500/15 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-600">{initials}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-tight">{user?.nombre || 'Usuario'}</p>
              <p className="text-xs text-slate-400 leading-tight">{rolLabel}</p>
            </div>
            <ChevronDown size={14} className={['text-slate-400 transition-transform duration-150', userOpen ? 'rotate-180' : ''].join(' ')} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || ''}</p>
                <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {rolLabel}
                </span>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all font-medium"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

export default Navbar
