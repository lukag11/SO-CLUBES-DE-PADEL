import { Trophy, Swords, CheckCircle, XCircle, Flame, Target, TrendingUp, CalendarDays, ArrowRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import usePlayerStore from '../store/playerStore'
import useReservasStore from '../store/reservasStore'

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

const PlayerDashboardPage = () => {
  const player = usePlayerStore((s) => s.player)
  const reservas = useReservasStore((s) => s.reservas)
  const navigate = useNavigate()

  const hoy = fmtDate(new Date())
  const proximasReservas = reservas
    .filter((r) => (r.estado === 'confirmada' || r.estado === 'pendiente') && r.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 3)

  const initials = player
    ? `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()
    : 'J'

  const winRate = Math.round((34 / 48) * 100)

  return (
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
              <p className="text-xl font-bold text-white">{value}</p>
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
          <div className="flex divide-x divide-white/5">
            {proximasReservas.map((r) => {
              const pendiente = r.estado === 'pendiente'
              const esFijo = r.estado === 'confirmada' && r.esTurnoFijo
              return (
                <div key={r.id} className={`flex-1 px-4 py-4 flex flex-col gap-1 min-w-0 ${pendiente ? 'bg-amber-500/3' : esFijo ? 'bg-violet-500/3' : ''}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pendiente ? 'bg-amber-400' : esFijo ? 'bg-violet-400' : 'bg-[#afca0b]'}`} />
                    <p className="text-white font-semibold text-xs truncate">{r.canchaNombre}</p>
                  </div>
                  <p className="text-white/40 text-xs flex items-center gap-1">
                    <CalendarDays size={10} />
                    {r.fecha.slice(8)} {MESES[parseInt(r.fecha.slice(5,7))-1]}
                  </p>
                  <p className="text-white/40 text-xs flex items-center gap-1">
                    <Clock size={10} /> {r.hora}{r.horaFin ? ` a ${r.horaFin}` : ''}
                  </p>
                  {pendiente && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 mt-0.5 w-fit">
                      Pendiente
                    </span>
                  )}
                  {esFijo && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 mt-0.5 w-fit">
                      Turno fijo
                    </span>
                  )}
                </div>
              )
            })}
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
  )
}

export default PlayerDashboardPage
