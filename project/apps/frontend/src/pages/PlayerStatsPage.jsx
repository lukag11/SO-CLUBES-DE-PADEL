import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Target, Flame, Award } from 'lucide-react'
import { monthlyStats, performanceByCategory, recentTrend } from '../features/player-stats/mockData'

// Tooltip personalizado para los gráficos
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

// Winrate calculado por mes
const winRateData = monthlyStats.map((m) => ({
  mes: m.mes,
  efectividad: Math.round((m.ganados / m.jugados) * 100),
  jugados: m.jugados,
}))

// Tarjeta de stat pequeña
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

const PlayerStatsPage = () => {
  const totalJugados = monthlyStats.reduce((a, m) => a + m.jugados, 0)
  const totalGanados = monthlyStats.reduce((a, m) => a + m.ganados, 0)
  const winRate = Math.round((totalGanados / totalJugados) * 100)

  // Racha actual (contar desde el final)
  let racha = 0
  for (let i = recentTrend.length - 1; i >= 0; i--) {
    if (recentTrend[i] === recentTrend[recentTrend.length - 1]) racha++
    else break
  }
  const rachaLabel = recentTrend[recentTrend.length - 1] === 'W' ? `${racha}V seguidas` : `${racha}D seguidas`

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
        <p className="text-white/30 text-sm mt-1">Temporada 2025 — 2026</p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat label="Efectividad global" value={`${winRate}%`} sub="Partidos ganados" icon={Target} accent />
        <MiniStat label="Partidos jugados" value={totalJugados} sub="En los últimos 7 meses" icon={TrendingUp} />
        <MiniStat label="Racha actual" value={rachaLabel} sub="Últimos resultados" icon={Flame} />
        <MiniStat label="Mejor mes" value="Dic" sub="7 victorias de 9" icon={Award} />
      </div>

      {/* Gráfico de efectividad mensual */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold">Efectividad mensual</h3>
            <p className="text-white/30 text-xs mt-0.5">% de partidos ganados por mes</p>
          </div>
          <div className="flex items-center gap-2 bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 bg-[#afca0b] rounded-full" />
            <span className="text-[#afca0b] text-xs font-semibold">Efectividad %</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={winRateData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradEfect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#afca0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#afca0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="efectividad"
              name="Efectividad"
              stroke="#afca0b"
              strokeWidth={2.5}
              fill="url(#gradEfect)"
              dot={{ fill: '#afca0b', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#afca0b', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico ganados/perdidos + rendimiento por categoría */}
      <div className="grid xl:grid-cols-2 gap-4">

        {/* Ganados vs Perdidos por mes */}
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1">Ganados vs Perdidos</h3>
          <p className="text-white/30 text-xs mb-6">Partidos por mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyStats} margin={{ top: 0, right: 5, bottom: 0, left: -20 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ganados" name="Ganados" fill="#afca0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="perdidos" name="Perdidos" fill="rgba(239,68,68,0.5)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-white/40"><span className="w-2.5 h-2.5 rounded-sm bg-[#afca0b] inline-block" /> Ganados</span>
            <span className="flex items-center gap-1.5 text-xs text-white/40"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/50 inline-block" /> Perdidos</span>
          </div>
        </div>

        {/* Rendimiento por categoría */}
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1">Rendimiento por categoría</h3>
          <p className="text-white/30 text-xs mb-6">Historial acumulado</p>
          <div className="flex flex-col gap-5 mt-2">
            {performanceByCategory.map(({ categoria, ganados, perdidos }) => {
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
        </div>
      </div>

      {/* Tendencia de los últimos 10 partidos */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold">Tendencia reciente</h3>
            <p className="text-white/30 text-xs mt-0.5">Últimos 10 partidos en orden cronológico</p>
          </div>
          <span className="text-xs text-white/30">{totalGanados} partidos ganados en total</span>
        </div>
        <div className="flex items-end gap-2 h-14">
          {recentTrend.map((r, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-lg transition-all duration-300 ${
                  r === 'W' ? 'bg-[#afca0b]' : 'bg-red-500/50'
                }`}
                style={{ height: r === 'W' ? '100%' : '45%' }}
              />
              <span className={`text-xs font-bold ${r === 'W' ? 'text-[#afca0b]' : 'text-red-400'}`}>{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlayerStatsPage
