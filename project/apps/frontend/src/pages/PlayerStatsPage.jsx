import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, Flame, Award, Trophy, Calendar,
  Star, Users, Swords, Clock, Minus, Search, ChevronRight,
} from 'lucide-react'
import { usePlayerStats } from '../features/player-stats/usePlayerStats'

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
      <p className="text-[#afca0b] mt-0.5">{payload[0]?.value}%</p>
    </div>
  )
}

const MiniStat = ({ label, value, sub, icon: Icon, accent = false, gold = false }) => (
  <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-white/40 text-xs font-medium">{label}</p>
      <Icon size={15} className={gold ? 'text-yellow-400' : accent ? 'text-[#afca0b]' : 'text-white/20'} />
    </div>
    <p className={`text-3xl font-black ${gold ? 'text-yellow-400' : accent ? 'text-[#afca0b]' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
  </div>
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
  favorable: { label: 'Favorable', color: 'text-[#afca0b]',  bg: 'bg-[#afca0b]/10 border-[#afca0b]/25', icon: TrendingUp },
  rival:     { label: 'Rival',     color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/25',       icon: TrendingDown },
  parejo:    { label: 'Parejo',    color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/25',   icon: Minus },
}

const RESULTADO_CONFIG = {
  campeon:     { label: 'Campeón',     color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/25' },
  subcampeon:  { label: 'Subcampeón',  color: 'text-slate-300',  bg: 'bg-slate-400/10 border-slate-400/25' },
  participante:{ label: 'Participante',color: 'text-white/40',   bg: 'bg-white/5 border-white/10' },
}

const TABS = [
  { id: 'resumen',   label: 'Resumen' },
  { id: 'torneos',   label: 'Torneos' },
  { id: 'reservas',  label: 'Reservas' },
  { id: 'oponentes', label: 'Oponentes' },
]

// ── TAB RESUMEN ───────────────────────────────────────────────────────────────
const TabResumen = ({ stats }) => {
  const p = stats?.torneos?.partidos ?? {}
  const t = stats?.torneos ?? {}
  const r = stats?.reservas ?? {}

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
          <div className="w-10 h-10 rounded-xl bg-[#afca0b]/10 flex items-center justify-center shrink-0">
            <Flame size={18} className="text-[#afca0b]" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Mejor racha histórica</p>
            <p className="text-white font-bold text-2xl">{rachMaxima} <span className="text-[#afca0b] text-base">victorias seguidas</span></p>
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
                <span className="text-[#afca0b]">{ganados}V</span>
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
                    ? 'bg-[#afca0b] text-black'
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
                  ? 'bg-[#afca0b]/10 text-[#afca0b] border-[#afca0b]/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>{rachaLabel}</span>
              <span className="text-white/30 text-xs">racha actual</span>
            </div>
          )}
        </div>
      )}
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
  const companero = t.companeroFrecuente
  const evolucion = t.evolucionCategorias ?? []
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
      {companero && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#afca0b]/10 flex items-center justify-center shrink-0">
            <Users size={18} className="text-[#afca0b]" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Compañero más frecuente</p>
            <p className="text-white font-bold text-lg">{companero.nombre}</p>
            <p className="text-white/30 text-xs mt-0.5">{companero.veces} torneo{companero.veces > 1 ? 's' : ''} juntos</p>
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
                        <span className="text-xs font-bold text-[#afca0b] bg-[#afca0b]/10 border border-[#afca0b]/20 px-2 py-0.5 rounded-lg">{categoria}</span>
                        <span className="text-white/40 text-xs">{total} partidos</span>
                      </div>
                      <span className="text-white font-bold text-sm">{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#afca0b] to-[#c4e20c] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/25 text-xs">{g}V · {pd}D</span>
                      <span className={`text-xs font-medium ${pct >= 60 ? 'text-[#afca0b]' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{pct >= 60 ? 'Bueno' : pct >= 40 ? 'Regular' : 'A mejorar'}</span>
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
                  {fasesData.map((_, i) => <Cell key={i} fill="#afca0b" />)}
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

      {sugerenciaAscenso && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/30 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-amber-300 font-semibold text-sm">Listo para ascender</p>
            <p className="text-amber-400/60 text-xs mt-0.5">Tu rendimiento en <span className="font-bold text-amber-300">{categoriaActual}</span> supera los criterios de ascenso. ¡Hablá con el admin!</p>
          </div>
        </div>
      )}

      {evolucion.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold">Trayectoria de categoría</h3>
            {categoriaActual && (
              <span className="text-xs text-[#afca0b] bg-[#afca0b]/10 border border-[#afca0b]/20 px-2.5 py-1 rounded-lg font-semibold">
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
                <div key={ev.categoria} className={`rounded-xl p-4 border transition-all ${esActual ? 'border-[#afca0b]/40 bg-[#afca0b]/4' : 'border-white/6 bg-white/2'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${esActual ? 'text-[#afca0b] bg-[#afca0b]/12 border-[#afca0b]/30' : 'text-white/60 bg-white/5 border-white/10'}`}>
                        {ev.categoria}
                      </span>
                      {esActual && <span className="text-[10px] text-[#afca0b]/70 font-medium">EN CURSO</span>}
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
                      <p className={`text-lg font-black leading-none ${winPct >= 60 ? 'text-[#afca0b]' : winPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{winPct}%</p>
                      <p className="text-white/25 text-[10px] mt-0.5">{ev.ganados}V · {ev.perdidos}D</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${winPct >= 60 ? 'bg-gradient-to-r from-[#afca0b] to-[#c4e20c]' : winPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${winPct}%` }} />
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
                      <span key={c} className="text-xs text-[#afca0b] bg-[#afca0b]/8 border border-[#afca0b]/20 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                    {item.fechaInicio && <span className="text-white/25 text-xs">{item.fechaInicio}</span>}
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
const TabReservas = ({ stats }) => {
  const r = stats?.reservas ?? {}
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

      {porMes.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Reservas por mes</h3>
              <p className="text-white/30 text-xs mt-0.5">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-2 bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 bg-[#afca0b] rounded-full" />
              <span className="text-[#afca0b] text-xs font-semibold">Confirmadas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={porMes.map((m) => ({ mes: m.mes, reservas: m.confirmadas }))} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#afca0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#afca0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="reservas" name="Reservas" stroke="#afca0b" strokeWidth={2.5} fill="url(#gradRes)" dot={{ fill: '#afca0b', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#afca0b', strokeWidth: 0 }} />
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
                  {dias.map((d) => <Cell key={d.dia} fill={d.dia === r.diaFavorito ? '#afca0b' : 'rgba(175,202,11,0.25)'} />)}
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
                      <span className={`text-sm font-medium ${franja === r.horarioFavorito ? 'text-[#afca0b]' : 'text-white/60'}`}>{franja}</span>
                      <span className="text-white/40 text-xs">{cant} reservas · {pct}%</span>
                    </div>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${franja === r.horarioFavorito ? 'bg-[#afca0b]' : 'bg-white/20'}`} style={{ width: `${pct}%` }} />
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
            { label: 'Oponentes favorables', value: oponentes.favorables, color: 'text-[#afca0b]', bg: 'bg-[#afca0b]/8 border-[#afca0b]/15' },
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
                <Radar name="vs oponente" dataKey="value" stroke="#afca0b" fill="#afca0b" fillOpacity={0.15} strokeWidth={2} />
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
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#afca0b]/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-white/25 text-xs mr-1">Ordenar:</span>
            {[{ key: 'partidos', label: 'Partidos' }, { key: 'ganados', label: 'Victorias' }, { key: 'pct', label: '% Efect.' }].map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === key ? 'bg-[#afca0b]/12 text-[#afca0b] border border-[#afca0b]/25' : 'text-white/30 hover:text-white/60 border border-transparent'}`}>
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
                <div className="text-center hidden sm:block"><p className="text-[#afca0b] font-semibold text-sm">{o.ganados}V</p><p className="text-white/30 text-xs">ganados</p></div>
                <div className="text-center hidden sm:block"><p className="text-red-400 font-semibold text-sm">{o.perdidos}D</p><p className="text-white/30 text-xs">perdidos</p></div>
                <div className="w-24 hidden md:block">
                  <div className="flex justify-between mb-1"><span className="text-white/40 text-xs">{o.pct}%</span></div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${o.pct >= 60 ? 'bg-[#afca0b]' : o.pct >= 40 ? 'bg-amber-400' : 'bg-red-400/60'}`} style={{ width: `${o.pct}%` }} />
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
                  ? 'bg-[#afca0b]/15 text-[#afca0b] border-r border-[#afca0b]/20 last:border-r-0'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/4 border-r border-white/6 last:border-r-0'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/8">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id === 'oponentes') fetchOponentes() }}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-all relative',
              tab === id
                ? 'text-[#afca0b] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#afca0b] after:rounded-t'
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
          <div className="w-14 h-14 rounded-2xl bg-[#afca0b]/10 flex items-center justify-center">
            <Trophy size={24} className="text-[#afca0b]" />
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
          {tab === 'reservas'  && <TabReservas stats={stats} />}
          {tab === 'oponentes' && <TabOponentes fetchOponentes={fetchOponentes} oponentes={oponentes} loadingOponentes={loadingOponentes} errorOponentes={errorOponentes} />}
        </>
      )}
    </div>
  )
}

export default PlayerStatsPage
