import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell, LineChart, Line, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, Flame, Award, Trophy, Calendar,
  Star, Users, Swords, Clock, Minus, Search, ChevronRight, XCircle, HelpCircle,
} from 'lucide-react'
import { usePlayerStats } from '../features/player-stats/usePlayerStats'

// Color primario del club (white-label). Recharts pinta por ATRIBUTO SVG, donde
// var(--club-primary) no resuelve → leemos el valor real en runtime y pasamos hex.
const CLUB = () => {
  if (typeof window === 'undefined') return '#afca0b'
  return getComputedStyle(document.documentElement).getPropertyValue('--club-primary').trim() || '#afca0b'
}

// ── Helpers visuales ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white/50 text-xs font-medium mb-2">{label}</p>
      {payload.map((e) => (
        <p key={e.name} className="text-sm font-semibold" style={{ color: e.color }}>{e.name}: {e.value}</p>
      ))}
    </div>
  )
}

const RadarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{payload[0]?.payload?.subject}</p>
      <p className="text-club mt-0.5">{payload[0]?.value}%</p>
    </div>
  )
}

const EvolucionTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload ?? {}
  return (
    <div className="bg-[#111827] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-white font-semibold text-xs mb-1 max-w-[200px] truncate">{d.torneo}</p>
      <p className="text-white/40 text-[11px] mb-2">{formatFechaMes(d.fecha)}</p>
      <p className="text-sm font-semibold text-club">Acumulado: {d.winRateAcumulado}%</p>
      <p className="text-xs text-white/50 mt-0.5">En este torneo: {d.winRateTorneo}%</p>
    </div>
  )
}

const MiniStat = ({ label, value, sub, icon: Icon, accent = false, gold = false }) => (
  <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-white/40 text-xs font-medium">{label}</p>
      <Icon size={15} className={gold ? 'text-yellow-400' : accent ? 'text-club' : 'text-white/20'} />
    </div>
    <p className={`text-2xl sm:text-3xl font-black break-words ${gold ? 'text-yellow-400' : accent ? 'text-club' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
  </div>
)

const InfoTooltip = ({ text }) => (
  <span className="group relative inline-flex items-center align-middle ml-1.5">
    <HelpCircle size={13} className="text-white/25 hover:text-white/50 transition-colors cursor-help" />
    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-xl border border-white/10 bg-[#111827] px-3.5 py-2.5 text-xs leading-relaxed text-white/70 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
      {text}
    </span>
  </span>
)

const Skeleton = ({ className }) => <div className={`bg-white/5 rounded-xl animate-pulse ${className}`} />

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-7 w-40" />
    <div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-28" /></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
)

const TAG_CONFIG = {
  favorable: { label: 'Favorable', color: 'text-club',  bg: 'bg-club/10 border-club/25', icon: TrendingUp },
  rival:     { label: 'Rival',     color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/25',       icon: TrendingDown },
  parejo:    { label: 'Parejo',    color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/25',   icon: Minus },
}

const RESULTADO_CONFIG = {
  campeon:     { label: 'Campeón',     color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/25' },
  subcampeon:  { label: 'Subcampeón',  color: 'text-slate-300',  bg: 'bg-slate-400/10 border-slate-400/25' },
  participante:{ label: 'Participante',color: 'text-white/40',   bg: 'bg-white/5 border-white/10' },
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatFechaMes = (fechaStr) => {
  if (!fechaStr) return ''
  const [year, month] = String(fechaStr).slice(0, 10).split('-')
  return `${MESES_CORTOS[parseInt(month, 10) - 1]}. ${year}`
}

const formatFechaFull = (fechaStr) => {
  if (!fechaStr) return ''
  const [year, month, day] = String(fechaStr).slice(0, 10).split('-')
  return `${parseInt(day, 10)} ${MESES_CORTOS[parseInt(month, 10) - 1]}. ${year}`
}

const TABS = [
  { id: 'resumen',   label: 'Resumen' },
  { id: 'torneos',   label: 'Torneos' },
  { id: 'reservas',  label: 'Reservas' },
  { id: 'oponentes', label: 'Oponentes' },
]

const LOGRO_ICONS = { trophy: Trophy, award: Award, flame: Flame, swords: Swords, clock: Clock, users: Users, target: Target }

const ComparativaClub = ({ data }) => {
  if (!data) return null
  const { ranked, miWinRate, promedioClub, mejorWinRate } = data
  const maxBar = Math.max(miWinRate, promedioClub, mejorWinRate, 1)
  const diff = miWinRate - promedioClub

  return (
    <div className="bg-gradient-to-br from-[#0d1117] to-[#0d1117] border border-white/8 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold inline-flex items-center">
            Tu lugar en el club
            <InfoTooltip text="Compara tu efectividad con la de todos los jugadores del club que jugaron al menos 5 partidos de torneo. Incluye todas las categorías juntas." />
          </h3>
          <p className="text-white/30 text-xs mt-0.5">Comparado con jugadores activos en torneos</p>
        </div>
        {ranked ? (
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-club leading-none">Top {data.percentil}%</p>
            <p className="text-white/30 text-xs mt-1">#{data.posicion} de {data.totalJugadores}</p>
          </div>
        ) : (
          <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg shrink-0">
            Sin ranking aún
          </span>
        )}
      </div>

      {!ranked && (
        <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl px-4 py-3 mb-5">
          <p className="text-amber-300/80 text-xs">
            Te faltan {Math.max(0, data.minPartidos - data.partidosActuales)} partidos de torneo para entrar al ranking del club (mínimo {data.minPartidos}).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {[
          { label: 'Vos', value: miWinRate, color: 'bg-club', text: 'text-club', strong: true },
          { label: 'Promedio del club', value: promedioClub, color: 'bg-white/25', text: 'text-white/50' },
          { label: 'Mejor del club', value: mejorWinRate, color: 'bg-amber-400/60', text: 'text-amber-400/80' },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs ${row.strong ? 'font-semibold text-white' : 'text-white/50'}`}>{row.label}</span>
              <span className={`text-sm font-bold ${row.text}`}>{row.value}%</span>
            </div>
            <div className="h-2 bg-white/6 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${row.color}`} style={{ width: `${Math.round((row.value / maxBar) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {ranked && (
        <div className="mt-4 pt-4 border-t border-white/6">
          <p className={`text-xs ${diff >= 0 ? 'text-club' : 'text-amber-400'}`}>
            {diff > 0
              ? `Estás ${diff} puntos por encima del promedio del club. ¡Seguí así!`
              : diff === 0
                ? 'Estás justo en el promedio del club.'
                : `Estás ${Math.abs(diff)} puntos por debajo del promedio. Hay margen para escalar.`}
          </p>
        </div>
      )}
    </div>
  )
}

const LogrosGrid = ({ logros, desbloqueados }) => {
  if (!logros?.length) return null
  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold inline-flex items-center">
            Logros
            <InfoTooltip text="Insignias que se desbloquean según tu actividad. Algunas exigen un mínimo de partidos para contar: por ejemplo, Francotirador necesita al menos 10 partidos jugados para evaluar tu efectividad." />
          </h3>
          <p className="text-white/30 text-xs mt-0.5">Desbloqueá insignias jugando</p>
        </div>
        <span className="text-xs font-semibold text-club bg-club/10 border border-club/20 px-2.5 py-1 rounded-lg">
          {desbloqueados}/{logros.length}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {logros.map((l) => {
          const Icon = LOGRO_ICONS[l.icon] ?? Award
          const pct = l.objetivo > 0 ? Math.round((l.actual / l.objetivo) * 100) : 0
          return (
            <div
              key={l.id}
              className={`rounded-xl p-4 border flex flex-col items-center text-center gap-2 transition-all ${
                l.desbloqueado
                  ? 'border-club/30 bg-club/5'
                  : 'border-white/6 bg-white/2'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                l.desbloqueado ? 'bg-club/15' : 'bg-white/4'
              }`}>
                <Icon size={20} className={l.desbloqueado ? 'text-club' : 'text-white/20'} strokeWidth={l.desbloqueado ? 2.5 : 2} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${l.desbloqueado ? 'text-white' : 'text-white/45'}`}>{l.nombre}</p>
                <p className="text-white/30 text-[11px] mt-0.5 leading-tight">{l.desc}</p>
              </div>
              {l.desbloqueado ? (
                <span className="text-[10px] font-bold text-club uppercase tracking-wide mt-0.5">Desbloqueado</span>
              ) : (
                <div className="w-full mt-0.5">
                  <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-white/30 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-white/25 text-[10px] mt-1">{l.actual}/{l.objetivo}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TAB RESUMEN ───────────────────────────────────────────────────────────────
const TabResumen = ({ stats }) => {
  const p = stats?.torneos?.partidos ?? {}
  const t = stats?.torneos ?? {}
  const r = stats?.reservas ?? {}
  const logros = stats?.logros ?? []
  const logrosDesbloqueados = stats?.logrosDesbloqueados ?? 0
  const comparativa = stats?.comparativaClub ?? null

  const totalPartidos = p.total ?? 0
  const winRate       = p.winRate ?? 0
  const ganados       = p.ganados ?? 0
  const rachaLabel    = p.rachaLabel ? `${p.rachaLabel} seguidas` : '—'
  const rachaActual   = p.rachaActual ?? 0
  const recentTrend   = p.recentTrend ?? []
  const rachMaxima    = p.rachMaxima ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat label="Efectividad" value={totalPartidos > 0 ? `${winRate}%` : '—'} sub={totalPartidos > 0 ? `${ganados} de ${totalPartidos} partidos` : 'Sin partidos jugados'} icon={Target} accent />
        <MiniStat label="Reservas" value={r.total ?? 0} sub={r.turnosFijos > 0 ? `${r.turnosFijos} turnos fijos` : 'Sin turnos fijos'} icon={Calendar} />
        <MiniStat label="Racha actual" value={rachaLabel} sub={recentTrend.length > 0 ? 'Últimos resultados' : 'Sin partidos'} icon={Flame} />
        <MiniStat label="Torneos jugados" value={t.participados ?? 0} sub={t.titulos > 0 ? `${t.titulos} campeonato${t.titulos > 1 ? 's' : ''}` : 'Sin campeonatos aún'} icon={Award} />
      </div>

      {r.proximaReserva && (
        <div className="bg-[#0d1117] border border-club/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-club/10 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-club" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-xs">Próxima reserva</p>
            <p className="text-white font-bold">
              {formatFechaFull(r.proximaReserva.fecha)}
              {r.proximaReserva.horaInicio && ` · ${r.proximaReserva.horaInicio}`}
            </p>
            {r.proximaReserva.cancha && <p className="text-white/30 text-xs mt-0.5">{r.proximaReserva.cancha}</p>}
          </div>
          <span className="text-xs font-semibold text-club bg-club/10 border border-club/20 px-2.5 py-1 rounded-lg shrink-0">Confirmada</span>
        </div>
      )}

      <ComparativaClub data={comparativa} />

      {t.titulos > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-400/5 border border-yellow-500/20 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 flex items-center justify-center shrink-0">
            <Trophy size={22} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-yellow-300 font-bold text-lg">{t.titulos} campeonato{t.titulos > 1 ? 's' : ''}</p>
            <p className="text-white/40 text-xs mt-0.5">
              {(p.setsGanados ?? 0) + (p.setsPerdidos ?? 0) > 0
                ? `${p.setsGanados} sets ganados · ${p.setsPerdidos} perdidos`
                : 'Resultados cargados en el torneo'}
            </p>
          </div>
          {[...Array(Math.min(t.titulos, 5))].map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-yellow-400 shrink-0" />)}
        </div>
      )}

      {rachMaxima > 1 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-club/10 flex items-center justify-center shrink-0">
            <Flame size={18} className="text-club" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Mejor racha histórica</p>
            <p className="text-white font-bold text-2xl">{rachMaxima} <span className="text-club text-base">victorias seguidas</span></p>
          </div>
        </div>
      )}

      {recentTrend.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-white font-semibold">Últimos partidos</h3>
              <p className="text-white/30 text-xs mt-0.5">Resultados en torneos — del más antiguo al más reciente</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-base">
                <span className="text-club">{ganados}V</span>
                <span className="text-white/20 mx-1">·</span>
                <span className="text-red-400">{p.perdidos ?? 0}D</span>
              </p>
              <p className="text-white/30 text-xs mt-0.5">{winRate}% efectividad</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {recentTrend.map((res, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shadow-lg ${
                  res === 'W'
                    ? 'bg-club text-black'
                    : 'bg-red-500/20 border-2 border-red-500/60 text-red-400'
                }`}>
                  {res === 'W' ? 'V' : 'D'}
                </div>
                <span className="text-white/20 text-[10px]">#{i + 1}</span>
              </div>
            ))}
          </div>
          {rachaActual > 1 && (
            <div className="mt-4 pt-4 border-t border-white/6 flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                recentTrend[recentTrend.length - 1] === 'W'
                  ? 'bg-club/10 text-club border-club/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>{rachaLabel}</span>
              <span className="text-white/30 text-xs">racha actual</span>
            </div>
          )}
        </div>
      )}

      <LogrosGrid logros={logros} desbloqueados={logrosDesbloqueados} />
    </div>
  )
}

// ── TAB TORNEOS ───────────────────────────────────────────────────────────────
const TabTorneos = ({ stats }) => {
  const t = stats?.torneos ?? {}
  const p = t.partidos ?? {}
  const historial = t.historial ?? []
  const porCategoria = p.porCategoria ?? {}
  const fases = p.fases ?? {}
  const topCompaneros = t.topCompaneros ?? (t.companeroFrecuente ? [t.companeroFrecuente] : [])
  const evolucion = t.evolucionCategorias ?? []
  const evolucionWinRate = t.evolucionWinRate ?? []
  const sugerenciaAscenso = t.sugerenciaAscenso ?? false
  const categoriaActual = t.categoriaActual

  const categoriaList = Object.entries(porCategoria).map(([cat, { ganados: g, perdidos: pd }]) => ({ categoria: cat, ganados: g, perdidos: pd }))

  const fasesData = [
    { fase: 'Grupos',       ganados: fases.grupos?.ganados ?? 0,       total: fases.grupos?.total ?? 0 },
    { fase: 'Eliminatoria', ganados: fases.eliminatoria?.ganados ?? 0, total: fases.eliminatoria?.total ?? 0 },
  ].filter((f) => f.total > 0)

  if (!historial.length && !categoriaList.length) {
    return (
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
        <Trophy size={24} className="text-white/15" />
        <p className="text-white/30 text-sm">Sin torneos registrados aún</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {topCompaneros.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-club/10 flex items-center justify-center shrink-0">
              <Users size={15} className="text-club" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Compañeros frecuentes</p>
              <p className="text-white/30 text-xs">Parejas más repetidas en torneos</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {topCompaneros.map((c, i) => (
              <div key={c.nombre} className="flex items-center gap-3">
                <span className="text-white/20 text-sm w-4 shrink-0 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{c.nombre}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${i === 0 ? 'text-club bg-club/10 border-club/20' : 'text-white/40 bg-white/4 border-white/8'}`}>
                  {c.veces} torneo{c.veces > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-4">
        {categoriaList.length > 0 && (
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">Rendimiento por categoría</h3>
            <p className="text-white/30 text-xs mb-6">Partidos de torneos acumulados</p>
            <div className="flex flex-col gap-5">
              {categoriaList.map(({ categoria, ganados: g, perdidos: pd }) => {
                const total = g + pd
                const pct = Math.round((g / total) * 100)
                return (
                  <div key={categoria}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-club bg-club/10 border border-club/20 px-2 py-0.5 rounded-lg">{categoria}</span>
                        <span className="text-white/40 text-xs">{total} partidos</span>
                      </div>
                      <span className="text-white font-bold text-sm">{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <div className="h-full bg-club rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/25 text-xs">{g}V · {pd}D</span>
                      <span className={`text-xs font-medium ${pct >= 60 ? 'text-club' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{pct >= 60 ? 'Bueno' : pct >= 40 ? 'Regular' : 'A mejorar'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {fasesData.length > 0 && (
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">Grupos vs Eliminatoria</h3>
            <p className="text-white/30 text-xs mb-6">Rendimiento según la fase del torneo</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={fasesData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="fase" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ganados" name="Victorias" radius={[6, 6, 0, 0]}>
                  {fasesData.map((_, i) => <Cell key={i} fill={CLUB()} />)}
                </Bar>
                <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]}>
                  {fasesData.map((_, i) => <Cell key={i} fill="rgba(255,255,255,0.1)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex gap-6">
              {fasesData.map((f) => {
                const pct = f.total > 0 ? Math.round((f.ganados / f.total) * 100) : 0
                return (
                  <div key={f.fase}>
                    <p className="text-white/30 text-xs">{f.fase}</p>
                    <p className="text-white font-bold">{pct}% <span className="text-white/30 text-xs font-normal">{f.ganados}/{f.total}</span></p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {evolucionWinRate.length >= 2 && (() => {
        const primero = evolucionWinRate[0].winRateAcumulado
        const ultimo = evolucionWinRate[evolucionWinRate.length - 1].winRateAcumulado
        const delta = ultimo - primero
        return (
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold inline-flex items-center">
                  Evolución de tu efectividad
                  <InfoTooltip text="La línea verde (acumulado) es tu efectividad total hasta cada torneo: muestra tu tendencia general. La línea gris (por torneo) es cuánto ganaste en ese torneo puntual: muestra los altibajos." />
                </h3>
                <p className="text-white/30 text-xs mt-0.5">Win rate acumulado torneo a torneo</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 justify-end font-bold ${delta > 0 ? 'text-club' : delta < 0 ? 'text-red-400' : 'text-white/40'}`}>
                  {delta > 0 ? <TrendingUp size={16} /> : delta < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                  <span>{delta > 0 ? '+' : ''}{delta} pts</span>
                </div>
                <p className="text-white/30 text-xs mt-0.5">{ultimo}% actual</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucionWinRate} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradEvo" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CLUB()} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CLUB()} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="fecha" tickFormatter={formatFechaMes} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<EvolucionTooltip />} />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="winRateTorneo" name="Por torneo" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="winRateAcumulado" name="Acumulado" stroke="url(#gradEvo)" strokeWidth={3} dot={{ fill: CLUB(), r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: CLUB(), strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-end">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-club rounded-full" /><span className="text-white/40 text-xs">Acumulado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-white/25 rounded-full" /><span className="text-white/40 text-xs">Por torneo</span></div>
            </div>
          </div>
        )
      })()}

      {((p.setsGanados ?? 0) + (p.setsPerdidos ?? 0)) > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center shrink-0">
            <Target size={18} className="text-white/30" />
          </div>
          <div className="flex-1">
            <p className="text-white/40 text-xs mb-2">Sets ganados / perdidos</p>
            <div className="flex items-center gap-2">
              <span className="text-club font-black text-2xl leading-none">{p.setsGanados}</span>
              <span className="text-white/20 text-lg">·</span>
              <span className="text-red-400 font-black text-2xl leading-none">{p.setsPerdidos}</span>
            </div>
            <div className="mt-2 h-1.5 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-club rounded-full transition-all duration-700"
                style={{ width: `${Math.round((p.setsGanados / (p.setsGanados + p.setsPerdidos)) * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-black leading-none ${Math.round((p.setsGanados / (p.setsGanados + p.setsPerdidos)) * 100) >= 50 ? 'text-club' : 'text-red-400'}`}>
              {Math.round((p.setsGanados / (p.setsGanados + p.setsPerdidos)) * 100)}%
            </p>
            <p className="text-white/30 text-xs mt-0.5">en sets</p>
          </div>
        </div>
      )}

      {sugerenciaAscenso && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/30 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-amber-300 font-semibold text-sm inline-flex items-center">
              Listo para ascender
              <InfoTooltip text="Aparece cuando en tu categoría actual lográs 2 o más títulos, o un 75% de efectividad en al menos 3 torneos. Es una sugerencia: la decisión final de ascenso la toma el admin." />
            </p>
            <p className="text-amber-400/60 text-xs mt-0.5">Tu rendimiento en <span className="font-bold text-amber-300">{categoriaActual}</span> supera los criterios de ascenso. ¡Hablá con el admin!</p>
          </div>
        </div>
      )}

      {evolucion.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold">Trayectoria de categoría</h3>
            {categoriaActual && (
              <span className="text-xs text-club bg-club/10 border border-club/20 px-2.5 py-1 rounded-lg font-semibold">
                Actual: {categoriaActual}
              </span>
            )}
          </div>
          <p className="text-white/30 text-xs mb-6">Rendimiento acumulado por cada categoría jugada</p>
          <div className="flex flex-col gap-4">
            {evolucion.map((ev) => {
              const esActual = ev.categoria === categoriaActual
              const winPct = Math.round(ev.winRate ?? 0)
              return (
                <div key={ev.categoria} className={`rounded-xl p-4 border transition-all ${esActual ? 'border-club/40 bg-club/4' : 'border-white/6 bg-white/2'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${esActual ? 'text-club bg-club/12 border-club/30' : 'text-white/60 bg-white/5 border-white/10'}`}>
                        {ev.categoria}
                      </span>
                      {esActual && <span className="text-[10px] text-club/70 font-medium">EN CURSO</span>}
                      {ev.titulos > 0 && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(ev.titulos, 3) }).map((_, i) => (
                            <Trophy key={i} size={13} className="text-amber-400" />
                          ))}
                          {ev.titulos > 3 && <span className="text-amber-400 text-xs font-bold">+{ev.titulos - 3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black leading-none ${winPct >= 60 ? 'text-club' : winPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{winPct}%</p>
                      <p className="text-white/25 text-[10px] mt-0.5">{ev.ganados}V · {ev.perdidos}D</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${winPct >= 60 ? 'bg-club' : winPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${winPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/25 text-xs">{ev.torneos} torneo{ev.torneos !== 1 ? 's' : ''}</span>
                    {ev.titulos > 0 && <span className="text-amber-400/70 text-xs">{ev.titulos} campeonato{ev.titulos !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {historial.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">Historial de torneos</h3>
            <p className="text-white/30 text-xs mt-0.5">{historial.length} torneo{historial.length > 1 ? 's' : ''} jugado{historial.length > 1 ? 's' : ''}</p>
          </div>
          {historial.map((item) => {
            const cfg = RESULTADO_CONFIG[item.resultado]
            return (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{item.nombre}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.categorias.map((c) => (
                      <span key={c} className="text-xs text-club bg-club/8 border border-club/20 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                    {item.fechaInicio && <span className="text-white/25 text-xs">{formatFechaMes(item.fechaInicio)}</span>}
                    {item.partidosJugados > 0 && (
                      <span className="text-white/20 text-xs">{item.partidosJugados}P · {item.partidosGanados}V</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.color} shrink-0`}>
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TAB RESERVAS ──────────────────────────────────────────────────────────────
const TabReservas = ({ stats, periodo }) => {
  const r = stats?.reservas ?? {}

  const subtituloChart = periodo === '12m'
    ? 'Últimos 12 meses'
    : /^\d{4}$/.test(periodo ?? '')
      ? `Todo el año ${periodo}`
      : 'Historial completo'
  const porMes = r.porMes ?? []
  const dias = r.diasDistribucion ?? []
  const franjas = r.franjaDistribucion ?? []

  if (!r.total) {
    return (
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
        <Calendar size={24} className="text-white/15" />
        <p className="text-white/30 text-sm">Sin reservas registradas aún</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat label="Reservas totales" value={r.total} sub={r.turnosFijos > 0 ? `${r.turnosFijos} turnos fijos` : 'Sin turnos fijos'} icon={Calendar} accent />
        <MiniStat label="Horas jugadas" value={r.horasTotales ?? 0} sub="a razón de 1.5h/turno" icon={Clock} />
        <MiniStat label="Cancha favorita" value={r.canchaFavorita ?? '—'} sub="la más reservada" icon={Target} />
        <MiniStat label="Día favorito" value={r.diaFavorito ?? '—'} sub={r.horarioFavorito ? `Franja ${r.horarioFavorito}` : 'Sin datos'} icon={Calendar} />
      </div>

      {(r.canceladas ?? 0) > 0 && (() => {
        const pct = Math.round((r.canceladas / (r.total + r.canceladas)) * 100)
        return (
          <div className="bg-red-500/5 border border-red-500/15 rounded-2xl px-5 py-3.5 flex items-center gap-3">
            <XCircle size={15} className="text-red-400/60 shrink-0" />
            <span className="text-white/40 text-sm flex-1">
              {r.canceladas} reserva{r.canceladas > 1 ? 's' : ''} cancelada{r.canceladas > 1 ? 's' : ''} en el período
            </span>
            <span className="text-red-400/70 text-sm font-semibold shrink-0">{pct}% tasa</span>
          </div>
        )
      })()}

      {porMes.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Reservas por mes</h3>
              <p className="text-white/30 text-xs mt-0.5">{subtituloChart}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-club rounded-full" />
                <span className="text-club text-xs">Confirmadas</span>
              </div>
              {porMes.some((m) => (m.canceladas ?? 0) > 0) && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-red-400/70 text-xs">Canceladas</span>
                </div>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={porMes.map((m) => ({ mes: m.mes, confirmadas: m.confirmadas, canceladas: m.canceladas ?? 0 }))} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CLUB()} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CLUB()} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCanc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="confirmadas" name="Confirmadas" stroke={CLUB()} strokeWidth={2.5} fill="url(#gradRes)" dot={{ fill: CLUB(), r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: CLUB(), strokeWidth: 0 }} />
              <Area type="monotone" dataKey="canceladas" name="Canceladas" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#gradCanc)" dot={false} activeDot={{ r: 4, fill: '#f87171', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-4">
        {dias.some((d) => d.cantidad > 0) && (
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">Días de la semana</h3>
            <p className="text-white/30 text-xs mb-5">Distribución de reservas</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dias} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dia" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Reservas" radius={[4, 4, 0, 0]}>
                  {dias.map((d) => <Cell key={d.dia} fill={CLUB()} fillOpacity={d.dia === r.diaFavorito ? 1 : 0.25} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {franjas.length > 0 && (
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">Horario favorito</h3>
            <p className="text-white/30 text-xs mb-5">Franja horaria más elegida</p>
            <div className="flex flex-col gap-4 mt-2">
              {['Mañana', 'Tarde', 'Noche'].map((franja) => {
                const f = franjas.find((x) => x.franja === franja)
                const cant = f?.cantidad ?? 0
                const total = r.total ?? 1
                const pct = Math.round((cant / total) * 100)
                return (
                  <div key={franja}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-medium ${franja === r.horarioFavorito ? 'text-club' : 'text-white/60'}`}>{franja}</span>
                      <span className="text-white/40 text-xs">{cant} reservas · {pct}%</span>
                    </div>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${franja === r.horarioFavorito ? 'bg-club' : 'bg-white/20'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB OPONENTES ─────────────────────────────────────────────────────────────
const TabOponentes = ({ fetchOponentes, oponentes, loadingOponentes, errorOponentes }) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('partidos')

  // Carga lazy al montar el tab
  useState(() => { fetchOponentes() })

  const filtered = useMemo(() => {
    if (!oponentes?.lista) return []
    const q = search.toLowerCase()
    return oponentes.lista
      .filter((o) => o.nombre.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'partidos') return b.partidos - a.partidos
        if (sortBy === 'ganados') return b.ganados - a.ganados
        if (sortBy === 'pct') return b.pct - a.pct
        return 0
      })
  }, [oponentes, search, sortBy])

  if (loadingOponentes) return <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
  if (errorOponentes) return <div className="bg-red-400/10 border border-red-400/20 rounded-2xl p-6 text-red-400 text-sm">{errorOponentes}</div>
  if (!oponentes?.lista?.length) {
    return (
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
        <Swords size={24} className="text-white/15" />
        <p className="text-white/30 text-sm">Sin enfrentamientos registrados aún</p>
      </div>
    )
  }

  const top = oponentes.lista[0]
  const radarData = oponentes.radarTop ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 flex flex-col gap-3">
          {[
            { label: 'Oponentes favorables', value: oponentes.favorables, color: 'text-club', bg: 'bg-club/8 border-club/15' },
            { label: 'Rivales difíciles',    value: oponentes.rivales,    color: 'text-red-400',   bg: 'bg-red-400/8 border-red-400/15' },
            { label: 'Partidos parejos',     value: oponentes.parejos,    color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/15' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`bg-[#0d1117] border rounded-2xl p-4 flex items-center justify-between ${bg}`}>
              <p className="text-white/50 text-sm">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {radarData.length > 0 && (
          <div className="xl:col-span-2 bg-[#0d1117] border border-white/8 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold text-sm">Análisis vs rival frecuente</h3>
                <p className="text-white/30 text-xs mt-0.5">vs {oponentes.topNombre}</p>
              </div>
              <span className="text-xs text-white/25 bg-white/5 px-2.5 py-1 rounded-lg">{top.partidos} partidos</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                <Radar name="vs oponente" dataKey="value" stroke={CLUB()} fill={CLUB()} fillOpacity={0.15} strokeWidth={2} />
                <Tooltip content={<RadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              placeholder="Buscar oponente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-club/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-white/25 text-xs mr-1">Ordenar:</span>
            {[{ key: 'partidos', label: 'Partidos' }, { key: 'ganados', label: 'Victorias' }, { key: 'pct', label: '% Efect.' }].map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === key ? 'bg-club/12 text-club border border-club/25' : 'text-white/30 hover:text-white/60 border border-transparent'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.map((o, i) => {
          const cfg = TAG_CONFIG[o.tag]
          const Icon = cfg.icon
          return (
            <div key={o.nombre} className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors border-b border-white/4 last:border-0">
              <span className="text-white/20 text-sm w-5 shrink-0 text-center font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium text-sm">{o.nombre}</p>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.color}`}>
                    <Icon size={10} strokeWidth={2.5} />
                    {cfg.label}
                  </span>
                </div>
                {o.ultimaFecha && <p className="text-white/25 text-xs mt-0.5">Último: {o.ultimaFecha}</p>}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center hidden sm:block"><p className="text-white font-semibold text-sm">{o.partidos}</p><p className="text-white/30 text-xs">partidos</p></div>
                <div className="text-center hidden sm:block"><p className="text-club font-semibold text-sm">{o.ganados}V</p><p className="text-white/30 text-xs">ganados</p></div>
                <div className="text-center hidden sm:block"><p className="text-red-400 font-semibold text-sm">{o.perdidos}D</p><p className="text-white/30 text-xs">perdidos</p></div>
                <div className="w-24 hidden md:block">
                  <div className="flex justify-between mb-1"><span className="text-white/40 text-xs">{o.pct}%</span></div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${o.pct >= 60 ? 'bg-club' : o.pct >= 40 ? 'bg-amber-400' : 'bg-red-400/60'}`} style={{ width: `${o.pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CURRENT_YEAR = new Date().getFullYear()
const PERIODOS = [
  { id: '12m',              label: 'Últimos 12M' },
  { id: String(CURRENT_YEAR), label: String(CURRENT_YEAR) },
  { id: 'todo',             label: 'Todo' },
]

// ── Página principal ──────────────────────────────────────────────────────────
const PlayerStatsPage = () => {
  const [periodo, setPeriodo] = useState('todo')
  const { stats, loadingStats, errorStats, oponentes, loadingOponentes, errorOponentes, fetchOponentes, player } = usePlayerStats(periodo)
  const [tab, setTab] = useState('resumen')

  if (loadingStats) return <LoadingSkeleton />

  const tieneAlgo = (stats?.reservas?.total ?? 0) > 0 || (stats?.torneos?.partidos?.total ?? 0) > 0 || (stats?.torneos?.participados ?? 0) > 0

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Estadísticas</h2>
          {errorStats && <p className="text-amber-400 text-xs mt-1">⚠ No se pudieron cargar las estadísticas</p>}
        </div>
        <div className="flex bg-[#0d1117] border border-white/8 rounded-xl overflow-hidden shrink-0">
          {PERIODOS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPeriodo(id)}
              className={`px-4 py-2 text-xs font-semibold transition-all ${
                periodo === id
                  ? 'bg-club/15 text-club border-r border-club/20 last:border-r-0'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/4 border-r border-white/6 last:border-r-0'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/8 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id === 'oponentes') fetchOponentes() }}
            className={[
              'shrink-0 whitespace-nowrap px-3 md:px-4 py-2.5 text-sm font-medium transition-all relative',
              tab === id
                ? 'text-club after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-club after:rounded-t'
                : 'text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {!tieneAlgo && tab === 'resumen' ? (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-club/10 flex items-center justify-center">
            <Trophy size={24} className="text-club" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              {periodo === 'todo' ? 'Todavía no hay estadísticas' : `Sin actividad en ${periodo === '12m' ? 'los últimos 12 meses' : periodo}`}
            </p>
            <p className="text-white/30 text-sm mt-1">
              {player?.nombre ? `Hola ${player.nombre}, tus stats aparecerán` : 'Tus stats aparecerán'} cuando hayas jugado partidos y tengas reservas confirmadas.
            </p>
          </div>
        </div>
      ) : (
        <>
          {tab === 'resumen'   && <TabResumen stats={stats} />}
          {tab === 'torneos'   && <TabTorneos stats={stats} />}
          {tab === 'reservas'  && <TabReservas stats={stats} periodo={periodo} />}
          {tab === 'oponentes' && <TabOponentes fetchOponentes={fetchOponentes} oponentes={oponentes} loadingOponentes={loadingOponentes} errorOponentes={errorOponentes} />}
        </>
      )}
    </div>
  )
}

export default PlayerStatsPage
