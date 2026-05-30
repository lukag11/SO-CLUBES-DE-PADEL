import { Trophy, Swords, CheckCircle, XCircle, Flame, Target, TrendingUp, CalendarDays, ArrowRight, Clock, Repeat, X, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import usePlayerStore from '../store/playerStore'
import useReservasStore from '../store/reservasStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Datos mock — se reemplazarán con API
const mockStats = [
  { label: 'Partidos', value: '48', icon: Swords },
  { label: 'Ganados', value: '34', icon: CheckCircle },
  { label: 'Torneos', value: '12', icon: Trophy },
  { label: 'Racha actual', value: '5W', icon: Flame },
]

const mockResults = [
  { torneo: 'Copa Verano', fecha: '22 mar 2026', rival: 'Gómez / Pérez', resultado: 'W', score: '6-3  6-2' },
  { torneo: 'Liga Interna', fecha: '15 mar 2026', rival: 'Torres / Silva', resultado: 'L', score: '4-6  3-6' },
  { torneo: 'Copa Verano', fecha: '10 mar 2026', rival: 'Ruiz / Díaz', resultado: 'W', score: '7-5  6-4' },
  { torneo: 'Abierto Club', fecha: '02 mar 2026', rival: 'Martín / López', resultado: 'W', score: '6-1  6-3' },
  { torneo: 'Liga Interna', fecha: '24 feb 2026', rival: 'Sosa / Vera', resultado: 'L', score: '5-7  4-6' },
]

const mockOpponents = [
  { nombre: 'Gómez / Pérez', partidos: 6, ganados: 4 },
  { nombre: 'Torres / Silva', partidos: 4, ganados: 1 },
  { nombre: 'Ruiz / Díaz', partidos: 3, ganados: 3 },
]

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

  const initials = player
    ? `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()
    : 'J'

  const winRate = Math.round((34 / 48) * 100)

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
              <span className="text-xs font-semibold text-[#1E1F23] bg-[#afca0b] px-2.5 py-1 rounded-lg">
                3° Categoría
              </span>
              <span className="text-xs text-white/40">DNI {player?.dni}</span>
            </div>
          </div>

          {/* Win rate circular */}
          <div className="text-right hidden sm:block">
            <p className="text-5xl font-black text-[#afca0b]">{winRate}%</p>
            <p className="text-white/40 text-xs mt-1">efectividad</p>
          </div>
        </div>

        {/* Mini stats en la hero */}
        <div className="relative z-10 grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/8">
          {mockStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={16} className="text-[#afca0b] mx-auto mb-1.5" />
              <p className="text-xl font-bold text-white">
                {label === 'Torneos' ? (loadingTorneos ? '…' : misInscripciones.length) : value}
              </p>
              <p className="text-white/35 text-xs">{label}</p>
            </div>
          ))}
        </div>
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

      {/* ── Widget torneos ── */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Mis torneos</h3>
            {misInscripciones.filter((i) => i.torneo.estado === 'in_progress').length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {misInscripciones.filter((i) => i.torneo.estado === 'in_progress').length} en juego
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
        ) : misInscripciones.length === 0 ? (
          <div className="px-5 py-5 flex items-center justify-between">
            <p className="text-white/30 text-sm">No estás inscripto en ningún torneo</p>
            <button
              onClick={() => navigate('/dashboardJugadores/torneos')}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              Ver torneos
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {misInscripciones.slice(0, 3).map(({ torneo, pareja }) => {
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
            {misInscripciones.length > 3 && (
              <div className="px-5 py-3 text-center">
                <button
                  onClick={() => navigate('/dashboardJugadores/torneos')}
                  className="text-xs text-white/30 hover:text-amber-400 transition-colors"
                >
                  + {misInscripciones.length - 3} más → Ver todos
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Contenido principal ── */}
      <div className="grid xl:grid-cols-5 gap-4">

        {/* Historial de partidos (3/5) */}
        <div className="xl:col-span-3 bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Swords size={16} className="text-[#afca0b]" />
              Últimos partidos
            </h3>
            <span className="text-xs text-white/30">Mostrando 5 de 48</span>
          </div>

          <div className="divide-y divide-white/5">
            {mockResults.map((r, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors">
                {/* Indicador W/L */}
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${r.resultado === 'W' ? 'bg-[#afca0b]' : 'bg-red-500/60'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">vs {r.rival}</p>
                  <p className="text-white/35 text-xs mt-0.5">{r.torneo} · {r.fecha}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-white/70 text-sm font-mono">{r.score}</p>
                  <p className={`text-xs font-bold mt-0.5 ${r.resultado === 'W' ? 'text-[#afca0b]' : 'text-red-400'}`}>
                    {r.resultado === 'W' ? 'Victoria' : 'Derrota'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho (2/5) */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Mejor resultado */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[#afca0b]" />
              <h3 className="text-white font-semibold text-sm">Mejor resultado</h3>
            </div>
            <div className="bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl p-4 text-center">
              <p className="text-[#afca0b] text-2xl font-black">Finalista</p>
              <p className="text-white/50 text-xs mt-1">Copa Verano 2025</p>
            </div>
          </div>

          {/* Oponentes frecuentes */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-[#afca0b]" />
              <h3 className="text-white font-semibold text-sm">Oponentes frecuentes</h3>
            </div>

            <div className="flex flex-col gap-4">
              {mockOpponents.map((o) => {
                const pct = Math.round((o.ganados / o.partidos) * 100)
                return (
                  <div key={o.nombre}>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-white/80 text-xs font-medium truncate">{o.nombre}</p>
                      <p className="text-white/35 text-xs shrink-0 ml-2">{o.ganados}V/{o.partidos - o.ganados}D</p>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#afca0b] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-white/25 text-xs mt-1">{pct}% victorias</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tendencia */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-[#afca0b]" />
              <h3 className="text-white font-semibold text-sm">Tendencia reciente</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {['W','W','L','W','W','L','W','W','W','W'].map((r, i) => (
                <div
                  key={i}
                  className={`flex-1 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                    r === 'W'
                      ? 'bg-[#afca0b]/20 text-[#afca0b]'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {r}
                </div>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2 text-center">Últimos 10 partidos</p>
          </div>
        </div>
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
