import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Target, Flame, Award, Trophy, Calendar } from 'lucide-react'
import { usePlayerStats } from '../features/player-stats/usePlayerStats'

// ── Tooltip personalizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white/50 text-xs font-medium mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ── Tarjeta stat pequeña ───────────────────────────────────────────────────────
const MiniStat = ({ label, value, sub, icon: Icon, accent = false }) => (
  <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-white/40 text-xs font-medium">{label}</p>
      <Icon size={15} className={accent ? 'text-[#afca0b]' : 'text-white/20'} />
    </div>
    <p className={`text-3xl font-black ${accent ? 'text-[#afca0b]' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
  </div>
)

// ── Skeleton de carga ──────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-white/5 rounded-xl animate-pulse ${className}`} />
)

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-6">
    <div>
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-64 rounded-2xl" />
    <div className="grid xl:grid-cols-2 gap-4">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  </div>
)

// ── Estado vacío ───────────────────────────────────────────────────────────────
const EmptyState = ({ player }) => (
  <div className="flex flex-col gap-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
      <p className="text-white/30 text-sm mt-1">Temporada 2025 — 2026</p>
    </div>
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#afca0b]/10 flex items-center justify-center">
        <Trophy size={24} className="text-[#afca0b]" />
      </div>
      <div>
        <p className="text-white font-semibold text-lg">Todavía no hay estadísticas</p>
        <p className="text-white/30 text-sm mt-1">
          {player?.nombre ? `Hola ${player.nombre}, tus stats aparecerán` : 'Tus stats aparecerán'} cuando hayas jugado partidos y tengas reservas confirmadas.
        </p>
      </div>
    </div>
  </div>
)

// ── Página principal ───────────────────────────────────────────────────────────
const PlayerStatsPage = () => {
  const { apiStats, torneoStats, loading, error, player } = usePlayerStats()

  if (loading) return <LoadingSkeleton />

  const totalReservas = apiStats?.reservas?.total ?? 0
  const turnosFijos = apiStats?.reservas?.turnosFijos ?? 0
  const canchaFavorita = apiStats?.reservas?.canchaFavorita ?? '—'
  const torneosParticipados = apiStats?.torneos?.participados ?? 0
  const torneosGanados = apiStats?.torneos?.ganados ?? 0

  const { resultados, porCategoria, recentTrend } = torneoStats

  const totalPartidos = resultados.length
  const totalGanados = resultados.filter((r) => r.resultado === 'W').length
  const winRate = totalPartidos > 0 ? Math.round((totalGanados / totalPartidos) * 100) : 0

  // Racha actual
  let racha = 0
  for (let i = recentTrend.length - 1; i >= 0; i--) {
    if (recentTrend[i] === recentTrend[recentTrend.length - 1]) racha++
    else break
  }
  const rachaLabel = recentTrend.length === 0
    ? '—'
    : recentTrend[recentTrend.length - 1] === 'W'
      ? `${racha}V seguidas`
      : `${racha}D seguidas`

  // Mejor mes (de reservas)
  const porMes = apiStats?.reservas?.porMes ?? []
  const mejorMes = [...porMes].sort((a, b) => b.confirmadas - a.confirmadas)[0]

  // Si no hay datos relevantes mostrar empty state
  if (!error && totalReservas === 0 && totalPartidos === 0 && torneosParticipados === 0) {
    return <EmptyState player={player} />
  }

  // Datos para gráfico efectividad mensual (desde reservas + torneos)
  const winRateData = porMes.map((m) => ({
    mes: m.mes,
    reservas: m.confirmadas,
  }))

  // Rendimiento por categoría (desde grupos/brackets)
  const categoriaList = Object.entries(porCategoria).map(([cat, { ganados, perdidos }]) => ({
    categoria: cat,
    ganados,
    perdidos,
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
        <p className="text-white/30 text-sm mt-1">Temporada 2025 — 2026</p>
        {error && (
          <p className="text-amber-400 text-xs mt-1">
            ⚠ Datos del servidor no disponibles — mostrando estadísticas locales
          </p>
        )}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat
          label="Efectividad en partidos"
          value={totalPartidos > 0 ? `${winRate}%` : '—'}
          sub={totalPartidos > 0 ? `${totalGanados} de ${totalPartidos} partidos` : 'Sin partidos jugados'}
          icon={Target}
          accent
        />
        <MiniStat
          label="Reservas confirmadas"
          value={totalReservas}
          sub={turnosFijos > 0 ? `${turnosFijos} turno${turnosFijos > 1 ? 's' : ''} fijo${turnosFijos > 1 ? 's' : ''}` : 'Sin turnos fijos'}
          icon={Calendar}
        />
        <MiniStat
          label="Racha actual"
          value={rachaLabel}
          sub={recentTrend.length > 0 ? 'Últimos resultados' : 'Sin partidos'}
          icon={Flame}
        />
        <MiniStat
          label="Torneos jugados"
          value={torneosParticipados}
          sub={torneosGanados > 0 ? `${torneosGanados} campeón` : 'Sin campeonatos aún'}
          icon={Award}
        />
      </div>

      {/* Gráfico reservas por mes */}
      {porMes.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Reservas por mes</h3>
              <p className="text-white/30 text-xs mt-0.5">
                Últimos 6 meses
                {canchaFavorita !== '—' && ` · Cancha favorita: ${canchaFavorita}`}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 bg-[#afca0b] rounded-full" />
              <span className="text-[#afca0b] text-xs font-semibold">Confirmadas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={winRateData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradReservas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#afca0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#afca0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="reservas"
                name="Reservas"
                stroke="#afca0b"
                strokeWidth={2.5}
                fill="url(#gradReservas)"
                dot={{ fill: '#afca0b', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#afca0b', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Partidos — solo si hay datos de torneos */}
      {totalPartidos > 0 && (
        <div className="grid xl:grid-cols-2 gap-4">

          {/* Rendimiento por categoría */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">Rendimiento por categoría</h3>
            <p className="text-white/30 text-xs mb-6">Partidos de torneos acumulados</p>
            {categoriaList.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">Sin datos por categoría</p>
            ) : (
              <div className="flex flex-col gap-5 mt-2">
                {categoriaList.map(({ categoria, ganados, perdidos }) => {
                  const total = ganados + perdidos
                  const pct = Math.round((ganados / total) * 100)
                  return (
                    <div key={categoria}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#afca0b] bg-[#afca0b]/10 border border-[#afca0b]/20 px-2 py-0.5 rounded-lg">
                            {categoria}
                          </span>
                          <span className="text-white/40 text-xs">{total} partidos</span>
                        </div>
                        <span className="text-white font-bold text-sm">{pct}%</span>
                      </div>
                      <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#afca0b] to-[#c4e20c] rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-white/25 text-xs">{ganados}V · {perdidos}D</span>
                        <span className={`text-xs font-medium ${pct >= 60 ? 'text-[#afca0b]' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {pct >= 60 ? 'Bueno' : pct >= 40 ? 'Regular' : 'A mejorar'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tendencia reciente */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Tendencia reciente</h3>
                <p className="text-white/30 text-xs mt-0.5">
                  Últimos {recentTrend.length} partidos en orden cronológico
                </p>
              </div>
              <span className="text-xs text-white/30">{totalGanados}V en total</span>
            </div>
            <div className="flex items-end gap-2 h-14">
              {recentTrend.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-full rounded-lg transition-all duration-300 ${r === 'W' ? 'bg-[#afca0b]' : 'bg-red-500/50'}`}
                    style={{ height: r === 'W' ? '100%' : '45%' }}
                  />
                  <span className={`text-xs font-bold ${r === 'W' ? 'text-[#afca0b]' : 'text-red-400'}`}>{r}</span>
                </div>
              ))}
            </div>
            {/* Resumen torneos */}
            <div className="mt-6 pt-4 border-t border-white/6 flex gap-6">
              <div>
                <p className="text-white/30 text-xs">Torneos jugados</p>
                <p className="text-white font-bold text-lg">{torneosParticipados}</p>
              </div>
              {torneosGanados > 0 && (
                <div>
                  <p className="text-white/30 text-xs">Campeonatos</p>
                  <p className="text-[#afca0b] font-bold text-lg">{torneosGanados}</p>
                </div>
              )}
              {mejorMes && mejorMes.confirmadas > 0 && (
                <div>
                  <p className="text-white/30 text-xs">Mejor mes (reservas)</p>
                  <p className="text-white font-bold text-lg">{mejorMes.mes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Si no hay partidos pero sí reservas — mini banner informativo */}
      {totalPartidos === 0 && totalReservas > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-white/30" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Estadísticas de torneos</p>
            <p className="text-white/30 text-xs mt-0.5">
              Aparecerán acá cuando participes en un torneo y se registren los resultados.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

export default PlayerStatsPage
