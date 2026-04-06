import { useState, useMemo } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { opponents } from '../features/player-stats/mockData'

const TAG_CONFIG = {
  favorable: { label: 'Favorable',  color: 'text-[#afca0b]',  bg: 'bg-[#afca0b]/10 border-[#afca0b]/25' },
  rival:     { label: 'Rival',      color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/25' },
  parejo:    { label: 'Parejo',     color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/25' },
}

const TAG_ICON = {
  favorable: TrendingUp,
  rival: TrendingDown,
  parejo: Minus,
}

// Tooltip del radar
const RadarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0]?.payload?.subject}</p>
      <p className="text-[#afca0b] mt-0.5">{payload[0]?.value}%</p>
    </div>
  )
}

const OpponentRow = ({ opponent, rank }) => {
  const { nombre, partidos, ganados, perdidos, ultimo, tag } = opponent
  const pct = Math.round((ganados / partidos) * 100)
  const config = TAG_CONFIG[tag]
  const Icon = TAG_ICON[tag]

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors border-b border-white/4 last:border-0">

      {/* Rank */}
      <span className="text-white/20 text-sm w-5 shrink-0 text-center font-mono">{rank}</span>

      {/* Nombre + tag */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm">{nombre}</p>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border ${config.bg} ${config.color}`}>
            <Icon size={10} strokeWidth={2.5} />
            {config.label}
          </span>
        </div>
        <p className="text-white/25 text-xs mt-0.5">Último: {ultimo}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center hidden sm:block">
          <p className="text-white font-semibold text-sm">{partidos}</p>
          <p className="text-white/30 text-xs">partidos</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-[#afca0b] font-semibold text-sm">{ganados}V</p>
          <p className="text-white/30 text-xs">ganados</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-red-400 font-semibold text-sm">{perdidos}D</p>
          <p className="text-white/30 text-xs">perdidos</p>
        </div>

        {/* Barra de efectividad */}
        <div className="w-24 hidden md:block">
          <div className="flex justify-between mb-1">
            <span className="text-white/40 text-xs">{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 60 ? 'bg-[#afca0b]' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400/60'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const PlayerOpponentsPage = () => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('partidos')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return opponents
      .filter((o) => o.nombre.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'partidos') return b.partidos - a.partidos
        if (sortBy === 'ganados') return b.ganados - a.ganados
        if (sortBy === 'pct') return (b.ganados / b.partidos) - (a.ganados / a.partidos)
        return 0
      })
  }, [search, sortBy])

  // Datos para el radar del jugador más enfrentado
  const topOpponent = opponents[0]
  const radarData = [
    { subject: 'Volumen', A: Math.round((topOpponent.partidos / 10) * 100) },
    { subject: 'Rivals ganados', A: Math.round((topOpponent.ganados / topOpponent.partidos) * 100) },
    { subject: 'Regularidad', A: 72 },
    { subject: 'Sets ganados', A: 65 },
    { subject: 'Tie-breaks', A: 55 },
  ]

  const favorables = opponents.filter((o) => o.tag === 'favorable').length
  const rivales = opponents.filter((o) => o.tag === 'rival').length

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Oponentes</h2>
        <p className="text-white/30 text-sm mt-1">{opponents.length} duplas enfrentadas</p>
      </div>

      {/* Stats rápidos + Radar */}
      <div className="grid xl:grid-cols-3 gap-4">

        {/* Resumen */}
        <div className="xl:col-span-1 flex flex-col gap-3">
          {[
            { label: 'Oponentes favorables', value: favorables, color: 'text-[#afca0b]', bg: 'bg-[#afca0b]/8 border-[#afca0b]/15' },
            { label: 'Rivales difíciles', value: rivales, color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/15' },
            { label: 'Partidos parejos', value: opponents.filter((o) => o.tag === 'parejo').length, color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/15' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`bg-[#0d1117] border rounded-2xl p-4 flex items-center justify-between ${bg}`}>
              <p className="text-white/50 text-sm">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Radar — análisis vs rival más frecuente */}
        <div className="xl:col-span-2 bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-white font-semibold text-sm">Análisis vs rival frecuente</h3>
              <p className="text-white/30 text-xs mt-0.5">vs {topOpponent.nombre}</p>
            </div>
            <span className="text-xs text-white/25 bg-white/5 px-2.5 py-1 rounded-lg">
              {topOpponent.partidos} partidos
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
              <Radar
                name="vs oponente"
                dataKey="A"
                stroke="#afca0b"
                fill="#afca0b"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip content={<RadarTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de oponentes */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">

        {/* Controles */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Buscar oponente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#afca0b]/40 transition-colors"
            />
          </div>

          {/* Ordenar */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-white/25 text-xs mr-1">Ordenar:</span>
            {[
              { key: 'partidos', label: 'Partidos' },
              { key: 'ganados', label: 'Victorias' },
              { key: 'pct', label: '% Efectividad' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  sortBy === key
                    ? 'bg-[#afca0b]/12 text-[#afca0b] border border-[#afca0b]/25'
                    : 'text-white/30 hover:text-white/60 border border-transparent',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filas */}
        {filtered.length > 0
          ? filtered.map((o, i) => <OpponentRow key={o.id} opponent={o} rank={i + 1} />)
          : (
            <div className="py-12 text-center">
              <p className="text-white/25 text-sm">No se encontraron oponentes</p>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default PlayerOpponentsPage
