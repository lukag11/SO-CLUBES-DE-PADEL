import { useState } from 'react'
import { Trophy, Calendar, MapPin, Users, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import { tournaments } from '../features/player-stats/mockData'

const RESULTADO_CONFIG = {
  'Campeón':         { color: 'text-[#afca0b]', bg: 'bg-[#afca0b]/12 border-[#afca0b]/30', icon: '🏆' },
  'Finalista':       { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/25',   icon: '🥈' },
  'Semifinalista':   { color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/25', icon: '🥉' },
  'Cuartos de final':{ color: 'text-white/50',   bg: 'bg-white/5 border-white/10',           icon: '⚡' },
}

const TournamentCard = ({ tournament }) => {
  const [open, setOpen] = useState(false)
  const config = RESULTADO_CONFIG[tournament.resultado] || RESULTADO_CONFIG['Cuartos de final']
  const ganados = tournament.partidos.filter((p) => p.resultado === 'W').length
  const perdidos = tournament.partidos.filter((p) => p.resultado === 'L').length

  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors duration-200">

      {/* Header card */}
      <div className="p-5 flex items-start gap-4">
        {/* Ícono resultado */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border ${config.bg}`}>
          {config.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold text-base leading-tight">{tournament.nombre}</h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-white/35">
                  <MapPin size={11} /> {tournament.club}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/35">
                  <Calendar size={11} /> {tournament.fecha}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/35">
                  <Users size={11} /> Con {tournament.pareja}
                </span>
              </div>
            </div>

            {/* Badge resultado */}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${config.bg} ${config.color}`}>
              {tournament.resultado}
            </span>
          </div>

          {/* Sub-info */}
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs font-medium text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
              {tournament.categoria}
            </span>
            <span className="text-xs text-white/30">{tournament.formato}</span>
            <span className="text-xs text-white/30">{tournament.partidos.length} partidos</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs font-semibold text-[#afca0b]">{ganados}V</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs font-semibold text-red-400">{perdidos}D</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle partidos */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-white/5 text-xs text-white/30 hover:text-white/60 hover:bg-white/3 transition-all"
      >
        <span>{open ? 'Ocultar partidos' : `Ver ${tournament.partidos.length} partidos`}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Lista de partidos */}
      {open && (
        <div className="border-t border-white/5 divide-y divide-white/4">
          {tournament.partidos.map((p, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              {/* Indicador */}
              <div className={`w-1 h-8 rounded-full shrink-0 ${p.resultado === 'W' ? 'bg-[#afca0b]' : 'bg-red-500/60'}`} />

              {/* Ronda */}
              <span className="text-white/25 text-xs w-6 shrink-0">{i + 1}°</span>

              {/* Rival */}
              <p className="text-white/70 text-sm flex-1 truncate">vs {p.rival}</p>

              {/* Score */}
              <span className="text-white/40 text-sm font-mono shrink-0">{p.score}</span>

              {/* Badge */}
              {p.resultado === 'W'
                ? <span className="flex items-center gap-1 text-xs font-bold text-[#afca0b] shrink-0"><CheckCircle size={12} /> Ganado</span>
                : <span className="flex items-center gap-1 text-xs font-bold text-red-400 shrink-0"><XCircle size={12} /> Perdido</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PlayerTournamentsPage = () => {
  const [filter, setFilter] = useState('Todos')
  const years = ['Todos', '2026', '2025']

  const filtered = filter === 'Todos'
    ? tournaments
    : tournaments.filter((t) => t.fecha.includes(filter))

  const campeon = tournaments.filter((t) => t.resultado === 'Campeón').length
  const finalista = tournaments.filter((t) => t.resultado === 'Finalista').length

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Mis torneos</h2>
          <p className="text-white/30 text-sm mt-1">{tournaments.length} torneos disputados</p>
        </div>

        {/* Logros rápidos */}
        <div className="flex gap-2">
          <div className="bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-black text-[#afca0b]">🏆 {campeon}</p>
            <p className="text-white/30 text-xs mt-0.5">Títulos</p>
          </div>
          <div className="bg-blue-400/8 border border-blue-400/20 rounded-xl px-3 py-2 text-center">
            <p className="text-xl font-black text-blue-400">🥈 {finalista}</p>
            <p className="text-white/30 text-xs mt-0.5">Finales</p>
          </div>
        </div>
      </div>

      {/* Filtro por año */}
      <div className="flex gap-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setFilter(y)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
              filter === y
                ? 'bg-[#afca0b]/12 border-[#afca0b]/40 text-[#afca0b]'
                : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20',
            ].join(' ')}
          >
            {y}
          </button>
        ))}
        <span className="ml-auto text-white/20 text-sm self-center">{filtered.length} torneos</span>
      </div>

      {/* Lista de torneos */}
      <div className="flex flex-col gap-3">
        {filtered.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
      </div>
    </div>
  )
}

export default PlayerTournamentsPage
