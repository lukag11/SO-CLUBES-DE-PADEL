import { Trophy, Swords, CheckCircle, XCircle, Flame, Target, TrendingUp, CalendarDays, ArrowRight, Clock, Repeat, X, Info, BarChart3, CalendarPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import usePlayerStore from '../store/playerStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useClubStore from '../store/clubStore'
import { usePlayerStats } from '../features/player-stats/usePlayerStats'
import { api } from '../lib/api'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtFechaCorta = (fechaStr) => {
  if (!fechaStr) return ''
  const [y, m, d] = String(fechaStr).slice(0, 10).split('-')
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`
}

const DIAS_LABEL = {
  domingo: 'Domingo', lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

const TORNEO_ESTADO_CONFIG = {
  open:        { label: 'Inscripciones abiertas', dot: 'bg-amber-400',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'    },
  closed:      { label: 'Por arrancar',           dot: 'bg-blue-400',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20'       },
  in_progress: { label: 'En juego',               dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  finished:    { label: 'Finalizado',             dot: 'bg-white/20',    badge: 'bg-white/8 text-white/30 border-white/10'              },
  draft:       { label: 'Próximamente',           dot: 'bg-white/20',    badge: 'bg-white/8 text-white/30 border-white/10'              },
}

const ESTADO_ORDEN = { in_progress: 0, closed: 1, open: 2, finished: 3, draft: 4 }

const PlayerDashboardPage = () => {
  const player = usePlayerStore((s) => s.player)
  const token = usePlayerStore((s) => s.token)
  const reservas = useReservasStore((s) => s.reservas)
  const setReservas = useReservasStore((s) => s.setReservas)
  const cancelarReserva = useReservasStore((s) => s.cancelarReserva)
  const turnosFijos = useTurnosFijosStore((s) => s.turnosFijos)
  const setTurnosFijos = useTurnosFijosStore((s) => s.setTurnosFijos)
  const horasCancelacion = useClubStore((s) => s.club?.horasCancelacion ?? 0)
  const navigate = useNavigate()
  const [reservaACancelar, setReservaACancelar] = useState(null)
  const [misInscripciones, setMisInscripciones] = useState([])
  const [loadingTorneos, setLoadingTorneos] = useState(false)

  // Estadísticas reales (mismo endpoint que la página de Estadísticas)
  const { stats, loadingStats } = usePlayerStats('todo')
  const partidosStats = stats?.torneos?.partidos ?? {}
  const winRate        = partidosStats.winRate ?? 0
  const totalPartidos  = partidosStats.total ?? 0
  const partidosGanados = partidosStats.ganados ?? 0
  const rachaLabel     = partidosStats.rachaLabel ?? null
  const recentTrend    = partidosStats.recentTrend ?? []
  const ultimosPartidos = partidosStats.ultimosPartidos ?? []
  const categoriaReal  = stats?.torneos?.categoriaActual ?? player?.categoria ?? null

  const cancelacionInfo = useMemo(() => {
    if (!reservaACancelar) return { horasMinimas: 0, horasRestantes: Infinity, fueraDePlazo: false }
    const [y, m, d] = reservaACancelar.fecha.split('-').map(Number)
    const [h, min] = reservaACancelar.hora.split(':').map(Number)
    const fechaTurno = new Date(y, m - 1, d, h, min)
    const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)
    const fueraDePlazo = horasCancelacion > 0 && horasRestantes < horasCancelacion && horasRestantes >= 0
    return { horasMinimas: horasCancelacion, horasRestantes, fueraDePlazo }
  }, [reservaACancelar, horasCancelacion])

  const { horasMinimas, horasRestantes, fueraDePlazo } = cancelacionInfo

  useEffect(() => {
    if (!token) return
    api
      .get('/turnos-fijos/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (Array.isArray(data)) setTurnosFijos(data) })
      .catch(() => {})
  }, [token])

  // Carga mis reservas desde el backend al montar (fuente de verdad para "Próximas reservas")
  useEffect(() => {
    if (!token) return
    api.get('/reservas/me', { Authorization: `Bearer ${token}` })
      .then((data) => {
        if (!Array.isArray(data)) return
        setReservas(data.map((r) => ({
          id: r.id,
          canchaId: r.canchaId,
          canchaNombre: r.cancha?.nombre ?? '',
          canchaInfo: r.cancha ? `${r.cancha.tipo} · ${r.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
          fecha: r.fecha,
          hora: r.horaInicio,
          horaFin: r.horaFin,
          precio: r.precio ?? 0,
          esTurnoFijo: r.esTurnoFijo,
          estado: r.estado,
        })))
      })
      .catch(() => {})
  }, [token])

  const playerClubId = player?.club?.id ?? player?.clubId ?? null

  useEffect(() => {
    if (!token || !player?.id || !playerClubId) return
    setLoadingTorneos(true)
    api.get(`/torneos?clubId=${playerClubId}`, { Authorization: `Bearer ${token}` })
      .then((data) => {
        if (!Array.isArray(data)) return
        const inscs = []
        data.forEach((t) => {
          const miPareja = (t.parejas ?? []).find((p) => p.jugador1Id === player.id)
          if (miPareja) inscs.push({ torneo: t, pareja: miPareja })
        })
        inscs.sort((a, b) => (ESTADO_ORDEN[a.torneo.estado] ?? 5) - (ESTADO_ORDEN[b.torneo.estado] ?? 5))
        setMisInscripciones(inscs)
      })
      .catch(() => {})
      .finally(() => setLoadingTorneos(false))
  }, [token, player?.id, playerClubId])

  const hoy = fmtDate(new Date())
  const proximasReservas = reservas
    .filter((r) => (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 3)

  const turnosFijosActivos = turnosFijos.filter((t) => t.activo).slice(0, 3)
  const turnosFijosPendientes = turnosFijos.filter((t) => t.estado === 'pendiente')

  // Torneos vigentes (excluye finalizados) — el resumen solo muestra lo accionable
  const torneosActivos = misInscripciones.filter((i) => i.torneo.estado !== 'finished')

  const initials = player
    ? `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()
    : 'J'

  const statCards = [
    { label: 'Partidos',     value: totalPartidos,                          icon: Swords },
    { label: 'Ganados',      value: partidosGanados,                        icon: CheckCircle },
    { label: 'Torneos',      value: loadingTorneos ? '…' : misInscripciones.length, icon: Trophy },
    { label: 'Racha actual', value: rachaLabel ?? '—',                      icon: Flame },
  ]

  return (
    <>
    <div className="flex flex-col gap-6">

      {/* ── Hero perfil ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0d1117] via-[#1a1f2e] to-[#0d1117] border border-white/8 p-8">
        {/* Glow decorativo */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#afca0b]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#afca0b]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-[#afca0b]/15 border border-[#afca0b]/30 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-[#afca0b]">{initials}</span>
          </div>

          {/* Info jugador */}
          <div className="flex-1">
            <p className="text-white/40 text-sm font-medium mb-1">Jugador</p>
            <h2 className="text-2xl font-bold text-white">
              {player?.nombre} {player?.apellido}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              {categoriaReal && (
                <span className="text-xs font-semibold text-[#1E1F23] bg-[#afca0b] px-2.5 py-1 rounded-lg">
                  {categoriaReal}
                </span>
              )}
              <span className="text-xs text-white/40">DNI {player?.dni}</span>
            </div>
          </div>

          {/* Win rate circular */}
          <div className="text-right hidden sm:block">
            {loadingStats ? (
              <div className="h-12 w-20 rounded-xl bg-white/5 animate-pulse ml-auto" />
            ) : totalPartidos > 0 ? (
              <>
                <p className="text-5xl font-black text-[#afca0b]">{winRate}%</p>
                <p className="text-white/40 text-xs mt-1">efectividad</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-white/20">—</p>
                <p className="text-white/30 text-xs mt-1">sin partidos</p>
              </>
            )}
          </div>
        </div>

        {/* Mini stats en la hero */}
        <div className="relative z-10 grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/8">
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={16} className="text-[#afca0b] mx-auto mb-1.5" />
              <p className="text-xl font-bold text-white">
                {loadingStats && label !== 'Torneos' ? '…' : value}
              </p>
              <p className="text-white/35 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Reservar cancha', icon: CalendarPlus, color: 'text-[#afca0b]', bg: 'hover:border-[#afca0b]/30 hover:bg-[#afca0b]/5', to: '/dashboardJugadores/reservas' },
          { label: 'Ver torneos',     icon: Trophy,       color: 'text-amber-400', bg: 'hover:border-amber-400/30 hover:bg-amber-400/5', to: '/dashboardJugadores/torneos' },
          { label: 'Mis estadísticas',icon: BarChart3,    color: 'text-violet-400',bg: 'hover:border-violet-400/30 hover:bg-violet-400/5', to: '/dashboardJugadores/estadisticas' },
        ].map(({ label, icon: Icon, color, bg, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`bg-[#0d1117] border border-white/8 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${bg}`}
          >
            <Icon size={20} className={color} />
            <span className="text-white/70 text-xs font-medium text-center">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Widget reservas ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[#afca0b]" />
            <h3 className="text-white font-semibold text-sm">Próximas reservas</h3>
          </div>
          <button
            onClick={() => navigate('/dashboardJugadores/reservas')}
            className="flex items-center gap-1 text-[#afca0b] text-xs font-medium hover:text-[#afca0b]/70 transition-colors"
          >
            Reservar <ArrowRight size={12} />
          </button>
        </div>

        {proximasReservas.length === 0 ? (
          <div className="px-5 py-5 flex items-center justify-between">
            <p className="text-white/30 text-sm">No tenés reservas próximas</p>
            <button
              onClick={() => navigate('/dashboardJugadores/reservas')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#afca0b]/10 text-[#afca0b] hover:bg-[#afca0b]/15 transition-colors"
            >
              Reservar cancha
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {proximasReservas.map((r) => {
              const pendiente = r.estado === 'pendiente'
              const esFijo = r.estado === 'confirmada' && r.esTurnoFijo
              return (
                <div key={r.id} className={`px-4 py-3.5 flex items-center gap-3 ${pendiente ? 'bg-amber-500/3' : esFijo ? 'bg-violet-500/3' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${pendiente ? 'bg-amber-500/10 border border-amber-500/20' : esFijo ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-[#afca0b]/10 border border-[#afca0b]/20'}`}>
                    <span className={`font-black text-sm leading-none ${pendiente ? 'text-amber-400' : esFijo ? 'text-violet-400' : 'text-[#afca0b]'}`}>{r.fecha.slice(8)}</span>
                    <span className={`text-[9px] uppercase opacity-60 ${pendiente ? 'text-amber-400' : esFijo ? 'text-violet-400' : 'text-[#afca0b]'}`}>{MESES[parseInt(r.fecha.slice(5,7))-1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-white font-semibold text-xs truncate">{r.canchaNombre}</p>
                      {pendiente && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">Pendiente</span>
                      )}
                      {esFijo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 shrink-0">Turno fijo</span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {r.hora}{r.horaFin ? ` a ${r.horaFin}` : ''}
                    </p>
                  </div>
                  {(() => {
                    const [y, m, d] = r.fecha.split('-').map(Number)
                    const [h, min] = (r.horaFin || r.hora).split(':').map(Number)
                    const yaJugo = new Date(y, m - 1, d, h, min) < new Date()
                    if (yaJugo) return (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/25 text-xs font-medium shrink-0">
                        <CheckCircle size={11} />
                        Finalizado
                      </span>
                    )
                    if (esFijo) return null
                    return (
                      <button
                        onClick={() => setReservaACancelar(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/8 border border-red-400/0 hover:border-red-400/15 text-xs font-medium transition-all shrink-0"
                      >
                        <XCircle size={12} />
                        Cancelar
                      </button>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Widget turnos fijos ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat size={15} className="text-violet-400" />
            <h3 className="text-white font-semibold text-sm">Mis turnos fijos</h3>
            {turnosFijosPendientes.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {turnosFijosPendientes.length} pendiente{turnosFijosPendientes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboardJugadores/turnos-fijos')}
            className="flex items-center gap-1 text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors"
          >
            Ver todos <ArrowRight size={12} />
          </button>
        </div>

        {turnosFijosActivos.length === 0 && turnosFijosPendientes.length === 0 ? (
          <div className="px-5 py-5 flex items-center justify-between">
            <p className="text-white/30 text-sm">No tenés turnos fijos asignados</p>
            <button
              onClick={() => navigate('/dashboardJugadores/reservas')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/15 transition-colors"
            >
              Solicitar turno fijo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {turnosFijosActivos.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-1.5 h-10 rounded-full bg-violet-500/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{t.canchaNombre}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {DIAS_LABEL[t.dia] ?? t.dia} · {t.inicio} a {t.fin}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-violet-400 font-bold text-sm">${t.precio?.toLocaleString('es-AR')}</p>
                  <p className="text-white/25 text-[10px]">por turno</p>
                </div>
              </div>
            ))}
            {turnosFijosPendientes.length > 0 && turnosFijosActivos.length === 0 && (
              <div className="px-5 py-3.5 flex items-center gap-3">
                <Clock size={14} className="text-amber-400 animate-pulse shrink-0" />
                <p className="text-amber-300 text-sm">
                  {turnosFijosPendientes.length === 1
                    ? '1 turno pendiente de aprobación del admin'
                    : `${turnosFijosPendientes.length} turnos pendientes de aprobación del admin`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Widget torneos (solo si hay torneos vigentes) ── */}
      {(loadingTorneos || torneosActivos.length > 0) && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-amber-400" />
              <h3 className="text-white font-semibold text-sm">Mis torneos</h3>
              {torneosActivos.filter((i) => i.torneo.estado === 'in_progress').length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {torneosActivos.filter((i) => i.torneo.estado === 'in_progress').length} en juego
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/dashboardJugadores/torneos')}
              className="flex items-center gap-1 text-amber-400 text-xs font-medium hover:text-amber-300 transition-colors"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {loadingTorneos ? (
            <div className="px-5 py-5 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin shrink-0" />
              <p className="text-white/25 text-sm">Cargando torneos…</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {torneosActivos.slice(0, 3).map(({ torneo, pareja }) => {
                const cfg = TORNEO_ESTADO_CONFIG[torneo.estado] ?? TORNEO_ESTADO_CONFIG.draft
                const enEspera = pareja.estado === 'espera'
                const companero = pareja.jugador2Nombre
                  ? `${pareja.jugador2Nombre} ${pareja.jugador2Apellido ?? ''}`.trim()
                  : null
                return (
                  <div key={torneo.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{torneo.nombre}</p>
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {pareja.categoria}
                        {companero ? ` · con ${companero}` : ' · Sin compañero/a'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {enEspera && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          En espera
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {torneosActivos.length > 3 && (
                <div className="px-5 py-3 text-center">
                  <button
                    onClick={() => navigate('/dashboardJugadores/torneos')}
                    className="text-xs text-white/30 hover:text-amber-400 transition-colors"
                  >
                    + {torneosActivos.length - 3} más → Ver todos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tu rendimiento (teaser → Estadísticas) ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-[#afca0b]" />
            <h3 className="text-white font-semibold text-sm">Tu rendimiento</h3>
          </div>
          <button
            onClick={() => navigate('/dashboardJugadores/estadisticas')}
            className="flex items-center gap-1 text-[#afca0b] text-xs font-medium hover:text-[#afca0b]/70 transition-colors"
          >
            Ver estadísticas <ArrowRight size={12} />
          </button>
        </div>

        {loadingStats ? (
          <div className="px-5 py-5 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-[#afca0b]/40 border-t-[#afca0b] animate-spin shrink-0" />
            <p className="text-white/25 text-sm">Cargando rendimiento…</p>
          </div>
        ) : totalPartidos === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <Swords size={22} className="text-white/15" />
            <p className="text-white/30 text-sm">Todavía no jugaste partidos de torneo</p>
            <button
              onClick={() => navigate('/dashboardJugadores/torneos')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#afca0b]/10 text-[#afca0b] hover:bg-[#afca0b]/15 transition-colors"
            >
              Ver torneos
            </button>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-5">
            {/* Tendencia W/L */}
            {recentTrend.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/40 text-xs font-medium">Tendencia reciente</p>
                  <p className="text-white/25 text-xs">Últimos {recentTrend.length} partidos</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {recentTrend.map((r, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                        r === 'W' ? 'bg-[#afca0b]/20 text-[#afca0b]' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {r === 'W' ? 'V' : 'D'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimos partidos con detalle */}
            {ultimosPartidos.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-white/40 text-xs font-medium">Últimos resultados</p>
                <div className="flex flex-col divide-y divide-white/5 -mx-1">
                  {ultimosPartidos.slice(0, 3).map((p, i) => (
                    <div key={i} className="px-1 py-2.5 flex items-center gap-3">
                      <div className={`w-1.5 h-9 rounded-full shrink-0 ${p.resultado === 'W' ? 'bg-[#afca0b]' : 'bg-red-500/60'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">vs {p.rival}</p>
                        <p className="text-white/35 text-xs mt-0.5 truncate">{p.torneo} · {fmtFechaCorta(p.fecha)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {p.score && <p className="text-white/70 text-sm font-mono">{p.score}</p>}
                        <p className={`text-xs font-bold mt-0.5 ${p.resultado === 'W' ? 'text-[#afca0b]' : 'text-red-400'}`}>
                          {p.resultado === 'W' ? 'Victoria' : 'Derrota'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>

    {/* ── Modal cancelar reserva ── */}
    {reservaACancelar && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReservaACancelar(null)}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${fueraDePlazo ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <XCircle size={16} className={fueraDePlazo ? 'text-amber-400' : 'text-red-400'} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Cancelar reserva</p>
                <p className="text-white/30 text-xs mt-0.5">{reservaACancelar.canchaNombre} · {reservaACancelar.hora} a {reservaACancelar.horaFin}</p>
              </div>
            </div>
            <button onClick={() => setReservaACancelar(null)} className="text-white/20 hover:text-white/60 transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            {fueraDePlazo ? (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25">
                <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-semibold text-xs">Cancelación fuera de plazo</p>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    El club requiere cancelar con al menos <span className="text-amber-300 font-bold">{horasMinimas}h de anticipación</span>.
                    Se registrará un cargo de <span className="text-amber-300 font-bold">${reservaACancelar.precio?.toLocaleString('es-AR')}</span> en tu cuenta.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/50 text-xs leading-relaxed">
                ¿Estás seguro que deseás cancelar esta reserva? Esta acción no se puede deshacer.
                {horasMinimas > 0 && (
                  <span className="block mt-1 text-[#afca0b]/60">
                    Cancelación gratuita — quedan {Math.floor(horasRestantes)}h de anticipación (mínimo {horasMinimas}h).
                  </span>
                )}
              </p>
            )}

            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/3 border border-white/8">
              <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                <CalendarDays size={18} className="text-white/50" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{reservaACancelar.canchaNombre}</p>
                <p className="text-white/30 text-xs mt-0.5">
                  {MESES[parseInt(reservaACancelar.fecha.slice(5, 7)) - 1]} {reservaACancelar.fecha.slice(8)} · {reservaACancelar.hora} a {reservaACancelar.horaFin}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                const id = reservaACancelar.id
                setReservaACancelar(null)
                try {
                  await api.delete(`/reservas/${id}`, { Authorization: `Bearer ${token}` })
                } catch { /* ignore */ }
                cancelarReserva(id)
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-lg ${
                fueraDePlazo
                  ? 'bg-amber-500 text-[#0d1117] hover:bg-amber-400 shadow-amber-500/20'
                  : 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20'
              }`}
            >
              <XCircle size={15} />
              {fueraDePlazo ? `Cancelar con cargo ($${reservaACancelar.precio?.toLocaleString('es-AR')})` : 'Sí, cancelar reserva'}
            </button>

            <button onClick={() => setReservaACancelar(null)} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
              Volver
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default PlayerDashboardPage
