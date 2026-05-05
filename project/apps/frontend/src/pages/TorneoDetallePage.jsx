import { useState, useEffect, useRef, Fragment, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trophy, Medal, Users, Calendar, Zap, Trash2,
  ToggleLeft, ToggleRight, Lock, CheckCircle, Clock, Archive,
  AlertTriangle, Shuffle, CheckCheck, GitMerge, UserPlus, Plus, X, Pencil, Swords,
  Palette, ChevronDown, Maximize2, Minimize2, Share2, Upload,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import {
  generateEliminationBracket,
  generateAPAEliminationBracket,
  advanceWinner,
  isBracketFinished,
  getBracketWinner,
  generateGroupPhase,
  advanceGroupMatch,
  isGroupPhaseFinished,
  getAllClasificados,
  autoScheduleGroups,
  esSlotDeGrupos,
  calcularGanadorDesdeResultado,
} from '../services/torneoService'
import useClubStore from '../store/clubStore'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'
import BracketView, { BracketCard } from '../components/BracketView'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

const ESTADO_CONFIG = {
  draft:       { label: 'Borrador',            color: 'text-slate-500 bg-slate-100 border-slate-200',    icon: Clock },
  open:        { label: 'Inscripción abierta', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  closed:      { label: 'Insc. cerrada',       color: 'text-amber-600 bg-amber-50 border-amber-200',     icon: Lock },
  in_progress: { label: 'En curso',            color: 'text-sky-600 bg-sky-50 border-sky-200',           icon: Zap },
  finished:    { label: 'Finalizado',          color: 'text-slate-400 bg-slate-50 border-slate-100',     icon: Archive },
}

const toggleEstado = (estado) => {
  if (estado === 'draft')  return 'open'
  if (estado === 'open')   return 'closed'
  if (estado === 'closed') return 'open'
  return estado
}

// ── Helpers carga manual admin ────────────────────────────────────────────────

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const HORAS_DISPONIBLES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']

const MAX_SLOTS_ADMIN = 2

const getDiasValidos = (fechaInicio, fechaFin) => {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const seen = new Set()
  const cur  = new Date(fechaInicio + 'T12:00:00')
  const end  = new Date(fechaFin   + 'T12:00:00')
  while (cur <= end && seen.size < 7) {
    seen.add(DIAS[cur.getDay()])
    cur.setDate(cur.getDate() + 1)
  }
  return DIAS_SEMANA.filter((d) => seen.has(d))
}

// ── Helpers grupos ────────────────────────────────────────────────────────────

const tieneOverlap = (p1, p2) => {
  if (!p1?.disponibilidad?.length || !p2?.disponibilidad?.length) return true
  return p1.disponibilidad.some((s1) =>
    p2.disponibilidad.some((s2) => s1.dia === s2.dia)
  )
}

const hayConflictoEnZona = (zona) => {
  const { parejas } = zona
  for (let i = 0; i < parejas.length; i++)
    for (let j = i + 1; j < parejas.length; j++)
      if (!tieneOverlap(parejas[i], parejas[j])) return true
  return false
}

// Scores válidos de padel: 6-0..6-4, 7-5, 7-6 (y espejo)
const isValidSet = (a, b) => {
  const x = Number(a), y = Number(b)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x === y) return false
  const [hi, lo] = x > y ? [x, y] : [y, x]
  return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6))
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ── Ingreso de resultado en sets (inline bajo la fila) ────────────────────────
const SetInputInline = ({ partido, eqNum1, eqNum2, onConfirmar, onCancelar }) => {
  const [sets, setSets] = useState([
    { p1: String(partido.resultado?.[0]?.p1 ?? ''), p2: String(partido.resultado?.[0]?.p2 ?? '') },
    { p1: String(partido.resultado?.[1]?.p1 ?? ''), p2: String(partido.resultado?.[1]?.p2 ?? '') },
    { p1: String(partido.resultado?.[2]?.p1 ?? ''), p2: String(partido.resultado?.[2]?.p2 ?? '') },
  ])

  const upd = (i, side, val) =>
    setSets((prev) => prev.map((s, j) => j === i ? { ...s, [side]: val.replace(/\D/g, '').slice(0, 2) } : s))

  const filled = (s) => s.p1 !== '' && s.p2 !== ''
  const valido = (s) => filled(s) && isValidSet(s.p1, s.p2)
  const ganSet = (s) => !valido(s) ? null : Number(s.p1) > Number(s.p2) ? 1 : 2

  const v0 = valido(sets[0]), v1 = valido(sets[1])
  const g0 = ganSet(sets[0]), g1 = ganSet(sets[1])
  const needsSet3 = v0 && v1 && g0 !== g1
  const completo  = v0 && v1 && (!needsSet3 || valido(sets[2]))

  const handleConfirm = () => {
    if (!completo) return
    onConfirmar([
      { p1: Number(sets[0].p1), p2: Number(sets[0].p2) },
      { p1: Number(sets[1].p1), p2: Number(sets[1].p2) },
      ...(needsSet3 ? [{ p1: Number(sets[2].p1), p2: Number(sets[2].p2) }] : []),
    ])
  }

  return (
    <div className="px-5 py-4 bg-brand-50/50 border-t border-brand-100">
      <p className="text-xs font-semibold text-slate-600 mb-3">
        Resultado —{' '}
        <span className="font-bold text-slate-800">Eq.{eqNum1}</span>
        <span className="text-slate-300 mx-1.5">vs</span>
        <span className="font-bold text-slate-800">Eq.{eqNum2}</span>
      </p>
      <div className="flex flex-col gap-2.5">
        {[0, 1, ...(needsSet3 ? [2] : [])].map((i) => {
          const s = sets[i]
          const g = ganSet(s)
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold w-12 shrink-0">Set {i + 1}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text" inputMode="numeric" maxLength={2} value={s.p1}
                  onChange={(e) => upd(i, 'p1', e.target.value)}
                  placeholder="0"
                  className={`w-11 text-center text-sm font-bold border rounded-lg px-1.5 py-2 outline-none transition-all focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${
                    g === 1 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                    g === 2 ? 'border-slate-200 bg-white text-slate-400' :
                    'border-slate-200 bg-white text-slate-700'
                  }`}
                />
                <span className="text-slate-300 font-bold text-base select-none">—</span>
                <input
                  type="text" inputMode="numeric" maxLength={2} value={s.p2}
                  onChange={(e) => upd(i, 'p2', e.target.value)}
                  placeholder="0"
                  className={`w-11 text-center text-sm font-bold border rounded-lg px-1.5 py-2 outline-none transition-all focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${
                    g === 2 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                    g === 1 ? 'border-slate-200 bg-white text-slate-400' :
                    'border-slate-200 bg-white text-slate-700'
                  }`}
                />
              </div>
              {valido(s) && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                  g === 1
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-blue-600 bg-blue-50 border-blue-200'
                }`}>
                  Eq.{g === 1 ? eqNum1 : eqNum2} ganó
                </span>
              )}
              {filled(s) && !valido(s) && (
                <span className="text-[10px] text-red-500 font-medium">Inválido</span>
              )}
            </div>
          )
        })}
        {needsSet3 && !valido(sets[2]) && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
            <AlertTriangle size={11} /> 1-1 en sets — completá el 3° set
          </p>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancelar}
          className="flex-1 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!completo}
          className="flex-1 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
        >
          Confirmar resultado
        </button>
      </div>
    </div>
  )
}

// ── Resolución de empate (zona de 3 con 3-way tie) ───────────────────────────

const TieResolutionCard = ({ zona, zonaIdx, onResolve }) => {
  const [picks, setPicks] = useState([])

  const handlePick = (pareja) => {
    if (picks.some((p) => p.id === pareja.id)) {
      setPicks(picks.filter((p) => p.id !== pareja.id))
      return
    }
    const newPicks = [...picks, pareja]
    setPicks(newPicks)
    if (newPicks.length === 2) onResolve(zonaIdx, newPicks[0], newPicks[1])
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
      <p className="text-amber-700 text-xs font-semibold mb-1.5">
        Empate — elegí en orden: primero el 1°, luego el 2°
      </p>
      <div className="flex flex-col gap-1.5">
        {zona.parejas.map((pareja) => {
          const pickIdx = picks.findIndex((p) => p.id === pareja.id)
          return (
            <button
              key={pareja.id}
              onClick={() => handlePick(pareja)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                pickIdx === 0 ? 'bg-amber-400 text-white font-bold' :
                pickIdx === 1 ? 'bg-slate-500 text-white font-bold' :
                'bg-white border border-amber-200 text-slate-700 hover:bg-amber-50'
              }`}
            >
              <span className="w-5 shrink-0 font-bold">
                {pickIdx === 0 ? '1°' : pickIdx === 1 ? '2°' : ''}
              </span>
              <span className="truncate">{pareja.jugador1} / {pareja.jugador2}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Zona en modo setup (antes de confirmar — permite intercambiar parejas) ────

const ZonaSetupCard = ({ zona, zonaIdx, swapSource, onSelectPair }) => {
  const conflicto = hayConflictoEnZona(zona)

  const conflictingIds = new Set()
  if (conflicto) {
    for (let i = 0; i < zona.parejas.length; i++)
      for (let j = i + 1; j < zona.parejas.length; j++)
        if (!tieneOverlap(zona.parejas[i], zona.parejas[j])) {
          conflictingIds.add(zona.parejas[i].id)
          conflictingIds.add(zona.parejas[j].id)
        }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-700">{zona.nombre}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{zona.capacidad} parejas</span>
          {conflicto && (
            <span className="flex items-center gap-1 text-amber-500 text-xs" title="Alguna pareja no tiene disponibilidad compatible con otra de la zona">
              <AlertTriangle size={11} /> Sin overlap
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {zona.parejas.map((pareja, parejaIdx) => {
          const isSelected   = swapSource?.zonaIdx === zonaIdx && swapSource?.parejaIdx === parejaIdx
          const isTarget     = swapSource && !isSelected
          const hasConflict  = conflictingIds.has(pareja.id)
          return (
            <button
              key={pareja.id}
              onClick={() => onSelectPair(zonaIdx, parejaIdx)}
              className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all ${
                isSelected
                  ? 'bg-brand-50 border-l-4 border-brand-500'
                  : isTarget
                    ? 'hover:bg-amber-50'
                    : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                isSelected ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {parejaIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm ${hasConflict ? 'text-amber-600' : 'text-slate-700'}`}>
                    {pareja.jugador1} / {pareja.jugador2}
                  </span>
                  {hasConflict && <AlertTriangle size={10} className="text-amber-400 shrink-0" />}
                </div>
                {pareja.disponibilidad?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pareja.disponibilidad.map((s, i) => (
                      <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        hasConflict
                          ? 'text-amber-600 bg-amber-50 border border-amber-100'
                          : 'text-slate-400 bg-slate-100'
                      }`}>
                        {s.dia.slice(0, 3)} · {s.horaDesde}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-300 mt-0.5 block">Sin disponibilidad</span>
                )}
              </div>
              {isSelected && <span className="text-brand-500 text-xs font-semibold shrink-0 mt-0.5">Seleccionada</span>}
              {isTarget && !isSelected && <Shuffle size={12} className="text-amber-400 shrink-0 mt-1" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Tabla de zona — modo juego confirmado ─────────────────────────────────────
const computeWins = (zona) => {
  const w = {}
  zona.parejas.forEach((p) => { w[p.id] = 0 })
  zona.partidos.forEach((p) => { if (p.ganador) w[p.ganador.id] = (w[p.ganador.id] || 0) + 1 })
  return w
}

const ZonaCardCompact = ({ zona, onClick }) => {
  const wins      = computeWins(zona)
  const jugados   = zona.partidos.filter((p) => p.estado === 'finalizado').length
  const total     = zona.partidos.length
  const completada = !!zona.clasificados
  const pct       = total ? Math.round((jugados / total) * 100) : 0

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <span className="text-brand-600 text-xs font-black">{zona.nombre.replace('Zona ', '')}</span>
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-800">{zona.nombre}</span>
            {zona.categoria && (
              <span className="ml-1.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">{zona.categoria}</span>
            )}
          </div>
        </div>
        {completada ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg shrink-0">
            <CheckCheck size={10} /> Completa
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg shrink-0">
            En juego
          </span>
        )}
      </div>

      {/* Equipos */}
      <div className="flex flex-col gap-1">
        {zona.parejas.map((pareja, idx) => {
          const esC1     = zona.clasificados?.[0]?.id === pareja.id
          const esC2     = zona.clasificados?.[1]?.id === pareja.id
          const eliminado = zona.clasificados && !esC1 && !esC2
          const w        = zona.capacidad === 3 ? (wins[pareja.id] ?? 0) : null
          return (
            <div key={pareja.id} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                esC1 ? 'bg-amber-400 text-white' : esC2 ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{idx + 1}</span>
              <span className={`text-sm md:text-xs flex-1 ${eliminado ? 'text-slate-300 line-through' : 'text-slate-600'}`}>
                {pareja.jugador1} / {pareja.jugador2}
              </span>
              {w !== null && <span className="text-[10px] text-slate-400 shrink-0">{w}V</span>}
              {esC1 && <span className="text-[10px] font-black text-amber-500 shrink-0">1°</span>}
              {esC2 && <span className="text-[10px] font-black text-slate-400 shrink-0">2°</span>}
            </div>
          )
        })}
      </div>

      {/* Progreso */}
      <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Partidos</span>
          <span className="text-[10px] font-semibold text-slate-500">{jugados}/{total} jugados</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completada ? 'bg-emerald-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center gap-1 text-xs text-brand-500 group-hover:text-brand-600 font-medium">
        Ver partidos <ChevronDown size={11} />
      </div>
    </div>
  )
}

const ZonaDetailModal = ({ zona, zonaIdx, onClose, onResultado, onResolveTie, canchaName }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2.5 bg-white border-b border-slate-100">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ZonaTable zona={zona} zonaIdx={zonaIdx} onResultado={onResultado} onResolveTie={onResolveTie} canchaName={canchaName} />
      </div>
    </div>
  </div>
)

const ZonaTable = ({ zona, zonaIdx, onResultado, onResolveTie, canchaName }) => {
  const [expandedId, setExpandedId] = useState(null)

  const eqNum = (pareja) => {
    if (!pareja) return null
    const idx = zona.parejas.findIndex((p) => p.id === pareja.id)
    return idx >= 0 ? idx + 1 : null
  }

  const wins = computeWins(zona)

  const jugados = zona.partidos.filter((p) => p.estado === 'finalizado').length

  const renderSets = (resultado, ganadorEsP1) => {
    if (!resultado?.length) return <span className="text-slate-300 text-xs">—</span>
    return (
      <div className="flex items-center gap-1">
        {resultado.map((s, i) => {
          const p1Gano = s.p1 > s.p2
          const esWin  = ganadorEsP1 ? p1Gano : !p1Gano
          return (
            <span key={i} className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border ${
              esWin
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                : 'text-slate-400 bg-slate-50 border-slate-100'
            }`}>
              {s.p1}-{s.p2}
            </span>
          )
        })}
      </div>
    )
  }

  const renderPartidoRow = (partido, tipoLabel = null) => {
    const n1          = eqNum(partido.pareja1)
    const n2          = eqNum(partido.pareja2)
    const finalizado  = partido.estado === 'finalizado'
    const ganadorEsP1 = partido.ganador?.id === partido.pareja1?.id
    const ganadorN    = partido.ganador ? (ganadorEsP1 ? n1 : n2) : null
    const listo       = !finalizado && partido.pareja1 && partido.pareja2
    const isExpanded  = expandedId === partido.id

    return (
      <Fragment key={partido.id}>
        <tr className={`border-b border-slate-50 transition-colors ${
          finalizado ? 'bg-emerald-50/30' : listo ? 'hover:bg-slate-50/60' : ''
        }`}>
          {/* Partido */}
          <td className="px-4 py-3 whitespace-nowrap">
            {tipoLabel && (
              <p className="text-[10px] text-slate-400 font-medium leading-none mb-1">{tipoLabel}</p>
            )}
            {n1 && n2 ? (
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold shrink-0 ${
                  ganadorN === n1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{n1}</span>
                <span className="text-slate-300 text-[10px] font-bold">vs</span>
                <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold shrink-0 ${
                  ganadorN === n2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{n2}</span>
              </div>
            ) : (
              <span className="text-slate-300 text-xs italic">Por definir</span>
            )}
          </td>

          {/* Horario · Cancha */}
          <td className="px-4 py-3 text-xs whitespace-nowrap">
            {partido.slot ? (
              <div>
                <p className="font-semibold text-slate-700">
                  {partido.slot.dia}
                  {partido.slot.hora
                    ? <span className="text-slate-400 font-normal"> · <span className="font-bold text-slate-800">{partido.slot.hora} hs</span></span>
                    : <span className="font-normal text-slate-400"> · sin hora exacta</span>
                  }
                </p>
                {partido.cancha && (
                  <p className="text-brand-600 font-semibold mt-0.5">{canchaName(partido.cancha)}</p>
                )}
              </div>
            ) : (
              <span className="text-slate-300">Sin asignar</span>
            )}
          </td>

          {/* Sets */}
          <td className="px-4 py-3">
            {renderSets(partido.resultado, ganadorEsP1)}
          </td>

          {/* Ganador */}
          <td className="px-4 py-3 whitespace-nowrap">
            {finalizado && ganadorN ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle size={11} />
                Eq.{ganadorN} ganó
              </span>
            ) : (
              <span className="text-slate-300 text-xs">—</span>
            )}
          </td>

          {/* Acción */}
          <td className="px-4 py-3 whitespace-nowrap">
            {listo && (
              <button
                onClick={() => setExpandedId(isExpanded ? null : partido.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  isExpanded
                    ? 'bg-slate-200 text-slate-600 border-slate-300'
                    : 'text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100'
                }`}
              >
                {isExpanded ? 'Cancelar' : 'Cargar resultado'}
              </button>
            )}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={5} className="p-0 border-b border-brand-100">
              <SetInputInline
                partido={partido}
                eqNum1={n1}
                eqNum2={n2}
                onConfirmar={(res) => { setExpandedId(null); onResultado(partido.id, res) }}
                onCancelar={() => setExpandedId(null)}
              />
            </td>
          </tr>
        )}
      </Fragment>
    )
  }

  const renderPartidos = () => {
    if (zona.capacidad === 4) {
      const r1 = zona.partidos.filter((p) => p.tipo === 'r1')
      const wf = zona.partidos.find((p) => p.tipo === 'wf')
      const lf = zona.partidos.find((p) => p.tipo === 'lf')
      return (
        <>
          <tr className="bg-slate-50/70">
            <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Ronda 1
            </td>
          </tr>
          {r1.map((p) => renderPartidoRow(p))}
          <tr className="bg-slate-50/70 border-t border-slate-100">
            <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Finales
            </td>
          </tr>
          {renderPartidoRow(wf, 'Final ganadores → 1°')}
          {renderPartidoRow(lf, 'Final perdedores → 2°')}
        </>
      )
    }
    return zona.partidos.map((p) => renderPartidoRow(p))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <span className="text-brand-600 text-xs font-black">{zona.nombre.replace('Zona ', '')}</span>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-800">{zona.nombre}</span>
            {zona.categoria && (
              <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                {zona.categoria}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">{jugados}/{zona.partidos.length} jugados</span>
          {zona.clasificados && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
              <CheckCheck size={12} /> Completada
            </span>
          )}
        </div>
      </div>

      {/* Equipos */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Equipos</p>
        <div className="flex flex-col gap-1">
          {zona.parejas.map((pareja, idx) => {
            const esC1      = zona.clasificados?.[0]?.id === pareja.id
            const esC2      = zona.clasificados?.[1]?.id === pareja.id
            const eliminado = zona.clasificados && !esC1 && !esC2
            const w         = zona.capacidad === 3 ? (wins[pareja.id] ?? 0) : null
            return (
              <div key={pareja.id} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors ${
                esC1 ? 'bg-amber-50' : esC2 ? 'bg-slate-50' : ''
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  esC1 ? 'bg-amber-400 text-white' : esC2 ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{idx + 1}</span>
                <span className={`text-sm font-medium flex-1 ${eliminado ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {pareja.jugador1} / {pareja.jugador2}
                </span>
                {w !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    esC1 ? 'text-amber-600 bg-amber-100' :
                    esC2 ? 'text-slate-500 bg-slate-100' :
                    'text-slate-400 bg-slate-50'
                  }`}>{w}V</span>
                )}
                {esC1 && <span className="text-[10px] font-black text-amber-500 shrink-0">1°</span>}
                {esC2 && <span className="text-[10px] font-black text-slate-400 shrink-0">2°</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabla de partidos */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partido</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horario · Cancha</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sets</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ganador</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>{renderPartidos()}</tbody>
        </table>
      </div>

      {/* Desempate */}
      {zona.necesitaDesempate && (
        <div className="px-5 pb-5 pt-4 border-t border-amber-100 bg-amber-50/30">
          <TieResolutionCard zona={zona} zonaIdx={zonaIdx} onResolve={onResolveTie} />
        </div>
      )}
    </div>
  )
}

// ── Pareja card compacta ──────────────────────────────────────────────────────

const ParejaCard = ({ ins, idx, estadoTorneo, onEditar, onBaja }) => {
  const [confirmando, setConfirmando] = useState(false)
  const slots = ins.disponibilidad ?? []
  const diaAbrev = (dia) => dia?.slice(0, 2) ?? '?'

  return (
    <div className={`bg-white border rounded-xl transition-all ${confirmando ? 'border-red-200 bg-red-50/40' : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>

      {/* ── Mobile: fila horizontal ── */}
      <div className="flex items-center gap-3 p-3 md:hidden">
        <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {ins.jugador1} / {ins.jugador2}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{ins.categoria}</span>
            {ins.prefiereMismoDia && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                <Swords size={8} /> Mismo día
              </span>
            )}
          </div>
          {slots.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {slots.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">
                  {diaAbrev(s.dia)} {s.horaDesde}
                </span>
              ))}
            </div>
          )}
        </div>
        {!confirmando && (
          <div className="flex items-center gap-0.5 shrink-0">
            {estadoTorneo === 'open' && (
              <button onClick={() => onEditar(ins)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-brand-500 rounded-lg hover:bg-brand-50 transition-colors">
                <Pencil size={15} />
              </button>
            )}
            {estadoTorneo !== 'finished' && (
              <button onClick={() => setConfirmando(true)} className="w-8 h-8 flex items-center justify-center text-red-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop: tarjeta vertical (sin cambios) ── */}
      <div className="hidden md:flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">
            {ins.categoria}
          </span>
          {estadoTorneo === 'open' && !confirmando && (
            <button onClick={() => onEditar(ins)} className="text-slate-300 hover:text-brand-500 p-0.5 rounded transition-colors">
              <Pencil size={11} />
            </button>
          )}
          {estadoTorneo !== 'finished' && !confirmando && (
            <button onClick={() => setConfirmando(true)} className="text-red-300 hover:text-red-500 p-0.5 rounded transition-colors">
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <p className="text-slate-800 text-xs font-semibold leading-snug truncate">
          {ins.jugador1} / {ins.jugador2}
        </p>
        {ins.prefiereMismoDia && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded self-start">
            <Swords size={8} /> Mismo día
          </span>
        )}
        {slots.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {slots.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-[9px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">
                {diaAbrev(s.dia)} {s.horaDesde}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[9px] text-slate-300">Sin horarios</span>
        )}
      </div>

      {/* ── Confirmación de baja (compartida) ── */}
      {confirmando && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-red-100">
          <span className="flex-1 text-xs text-red-500 font-medium">¿Dar de baja?</span>
          <button
            onClick={() => { onBaja(ins.id, ins); setConfirmando(false) }}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors"
          >
            Sí
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg border border-slate-200 transition-colors"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

// ── Pareja en lista de espera ─────────────────────────────────────────────────

const EsperaCard = ({ ins, estadoTorneo, onPromover, onBaja }) => {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className={`bg-amber-50 border rounded-xl transition-all ${confirmando ? 'border-red-200 bg-red-50/40' : 'border-amber-200 hover:border-amber-300'}`}>

      {/* ── Mobile: fila horizontal ── */}
      <div className="flex items-center gap-3 p-3 md:hidden">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <Clock size={15} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {ins.jugador1} / {ins.jugador2}
          </p>
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">{ins.categoria}</span>
        </div>
        {estadoTorneo !== 'finished' && !confirmando && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onPromover}
              className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Promover
            </button>
            <button onClick={() => setConfirmando(true)} className="w-8 h-8 flex items-center justify-center text-red-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop: tarjeta vertical (sin cambios) ── */}
      <div className="hidden md:flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide flex-1 truncate">
            {ins.categoria}
          </span>
          {estadoTorneo !== 'finished' && !confirmando && (
            <button
              onClick={onPromover}
              className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-colors"
            >
              Promover
            </button>
          )}
          {estadoTorneo !== 'finished' && !confirmando && (
            <button onClick={() => setConfirmando(true)} className="text-red-300 hover:text-red-500 p-0.5 rounded transition-colors">
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <p className="text-slate-800 text-xs font-semibold leading-snug truncate">
          {ins.jugador1} / {ins.jugador2}
        </p>
      </div>

      {/* ── Confirmación (compartida) ── */}
      {confirmando && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-red-100">
          <span className="flex-1 text-xs text-red-500 font-medium">¿Eliminar?</span>
          <button
            onClick={() => { onBaja(); setConfirmando(false) }}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors"
          >
            Sí
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg border border-slate-200 transition-colors"
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

// ── Input imagen desde archivo ────────────────────────────────────────────────

const ImagenFileInput = ({ value, onChange, onImageLoad, hint, className = '' }) => {
  const ref = useRef(null)
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      onChange(dataUrl)
      onImageLoad?.(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {value && (
          <img src={value} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => ref.current.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl transition-all"
        >
          <Upload size={12} />
          {value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); onImageLoad?.('') }}
            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {hint && <p className="text-slate-400 text-xs">{hint}</p>}
    </div>
  )
}

// ── Modal publicar bracket en redes ──────────────────────────────────────────

const FORMATOS = [
  { key: '1:1',  label: 'Cuadrado',  w: 1080, h: 1080, desc: 'Instagram feed' },
  { key: '4:5',  label: 'Vertical',  w: 1080, h: 1350, desc: 'Instagram retrato' },
  { key: '16:9', label: 'Apaisado',  w: 1920, h: 1080, desc: 'Twitter / Facebook' },
]

// ── Preview de una ronda para publicar ───────────────────────────────────────

const RondaPreview = ({ torneo, club, ronda, seedingMap, accentColor, colorCard, cardStyle, selectedCat, isLandscape }) => {
  const partidos = ronda?.partidos ?? []
  const cols = partidos.length <= 1
    ? 1
    : partidos.length <= 2
      ? (isLandscape ? 2 : 1)
      : partidos.length <= 4
        ? 2
        : isLandscape ? 4 : 2

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0d1117' }}>

      {/* Branding header */}
      <div
        className="flex items-center gap-5 px-8 py-5 shrink-0"
        style={{ borderBottom: `2px solid ${accentColor}35` }}
      >
        {club?.logoUrl && (
          <img src={club.logoUrl} alt="" className="h-14 w-14 object-contain rounded-xl shrink-0 opacity-90" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-[0.2em] truncate">{selectedCat}</p>
          <p className="text-white font-bold text-xl leading-tight truncate">{torneo.nombre}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: accentColor }}>
            {ronda?.nombre}
          </p>
          {torneo.fechaInicio && (
            <p className="text-white/30 text-xs mt-0.5">{fmtFecha(torneo.fechaInicio)}</p>
          )}
        </div>
      </div>

      {/* Matches grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {partidos.map((partido) => (
            <BracketCard
              key={partido.id}
              partido={partido}
              seedingMap={seedingMap}
              accentColor={accentColor}
              cardStyle={cardStyle}
              colorCard={colorCard}
              isLarge={partidos.length <= 2}
              fontScale={partidos.length <= 2 ? 'grande' : 'normal'}
            />
          ))}
        </div>
      </div>

      {/* Club footer */}
      <div className="flex items-center justify-center gap-2 py-3 shrink-0">
        <span className="inline-block w-1 h-1 rounded-full" style={{ background: accentColor }} />
        <p className="text-white/25 text-[10px] font-medium tracking-[0.18em] uppercase">
          {club?.nombre ?? 'Club'}
        </p>
        <span className="inline-block w-1 h-1 rounded-full" style={{ background: accentColor }} />
      </div>

    </div>
  )
}

// ── Modal publicar en redes (por ronda) ──────────────────────────────────────

const PublicarBracketModal = ({ torneo, club, activeBracket, seedingMap, selectedCat, onClose }) => {
  const rondas                  = activeBracket?.rondas ?? []
  const [formato, setFormato]   = useState('16:9')
  const [rondaIdx, setRondaIdx] = useState(() => Math.max(0, rondas.length - 1))
  const [vista, setVista]       = useState('ronda') // 'ronda' | 'completo'

  const fmt         = FORMATOS.find((f) => f.key === formato) ?? FORMATOS[0]
  const isLandscape = fmt.key === '16:9'
  const rondaActual = rondas[rondaIdx] ?? null

  const accentColor = torneo.bracketColores?.[selectedCat]  || torneo.colorAcento   || '#afca0b'
  const colorCard   = torneo.bracketColorCards?.[selectedCat] || torneo.colorCard   || null
  const cardStyle   = torneo.estiloCardFixture ?? 'oscura'

  const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.65 : 620
  const maxW = 580
  const scale    = Math.min(maxH / fmt.h, maxW / fmt.w, 1)
  const previewW = fmt.w * scale
  const previewH = fmt.h * scale

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-4xl max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
          <Share2 size={15} className="text-brand-500 shrink-0" />
          <span className="text-slate-800 font-semibold text-sm">Publicar en redes</span>

          {/* Toggle vista */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5 ml-2">
            <button
              onClick={() => setVista('ronda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                vista === 'ronda' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Por ronda
            </button>
            <button
              onClick={() => setVista('completo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                vista === 'completo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Cuadro completo
            </button>
          </div>

          <div className="flex-1" />

          {/* Selector de formato — solo en vista ronda */}
          {vista === 'ronda' && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
              {FORMATOS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormato(f.key)}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all leading-tight ${
                    formato === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`font-normal ${formato === f.key ? 'text-slate-400' : 'text-slate-300'}`}>{f.desc}</span>
                </button>
              ))}
            </div>
          )}

          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 p-1.5 rounded-lg transition-colors ml-1">
            <X size={16} />
          </button>
        </div>

        {/* Selector de ronda — solo en vista ronda */}
        {vista === 'ronda' && (
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0 overflow-x-auto">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Ronda:</span>
            {rondas.map((ronda, idx) => (
              <button
                key={idx}
                onClick={() => setRondaIdx(idx)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  rondaIdx === idx
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ronda.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Preview — por ronda */}
        {vista === 'ronda' && (
          <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 p-6">
            <div
              className="relative shrink-0 rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden"
              style={{ width: previewW, height: previewH }}
            >
              <div
                style={{
                  width:           fmt.w,
                  height:          fmt.h,
                  transform:       `scale(${scale})`,
                  transformOrigin: 'top left',
                  position:        'absolute',
                  top:             0,
                  left:            0,
                }}
              >
                <RondaPreview
                  torneo={torneo}
                  club={club}
                  ronda={rondaActual}
                  seedingMap={seedingMap}
                  accentColor={accentColor}
                  colorCard={colorCard}
                  cardStyle={cardStyle}
                  selectedCat={selectedCat}
                  isLandscape={isLandscape}
                />
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white/50 text-[9px] font-mono px-2 py-0.5 rounded-md pointer-events-none">
                {fmt.w} × {fmt.h}
              </div>
            </div>
          </div>
        )}

        {/* Preview — cuadro completo */}
        {vista === 'completo' && (
          <div className="flex-1 overflow-auto bg-[#0d1117] p-4">
            <BracketView
              bracket={activeBracket}
              torneo={torneo}
              club={club}
              seedingMap={seedingMap}
              selectedCat={selectedCat}
              accentColorOverride={accentColor}
              colorCardOverride={colorCard}
              hideHeader={false}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100 shrink-0 bg-white">
          <p className="flex-1 text-xs text-slate-400">
            {vista === 'ronda'
              ? 'Seleccioná la ronda y el formato antes de publicar.'
              : 'Vista completa del cuadro — scroll horizontal para ver todas las rondas.'}
          </p>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled
            title="Disponible cuando se conecte el backend"
            className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-400 px-5 py-2 rounded-xl opacity-50 cursor-not-allowed"
          >
            <Share2 size={14} />
            Publicar
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Modal agregar pareja (admin — carga manual) ───────────────────────────────

const ModalAgregarParejaAdmin = ({ torneo, onClose, onConfirmar }) => {
  const [jugador1, setJugador1]                 = useState('')
  const [jugador1Dni, setJugador1Dni]           = useState('')
  const [jugador2, setJugador2]                 = useState('')
  const [jugador2Dni, setJugador2Dni]           = useState('')
  const [categoria, setCategoria]               = useState(torneo.categorias[0] ?? '')
  const [slots, setSlots]                       = useState([])
  const [prefiereMismoDia, setPrefiereMismoDia] = useState(false)
  const [diaSelec, setDiaSelec]                 = useState('')
  const [horaSelec, setHoraSelec]               = useState('')
  const [slotError, setSlotError]               = useState('')
  const [formError, setFormError]               = useState('')

  const soloUnDia = [...new Set(slots.map((s) => s.dia))].length <= 1
  useEffect(() => { if (!soloUnDia) setPrefiereMismoDia(false) }, [soloUnDia])

  const diaCorte     = torneo.diaInicioEliminatoria  ?? null
  const horaCorte    = torneo.horaInicioEliminatoria ?? null
  const diasValidos  = getDiasValidos(torneo.fechaInicio, torneo.fechaFin)
    .filter((dia) => esSlotDeGrupos(dia, '00:00', diaCorte, horaCorte))
  const horasParaDia = (dia) =>
    HORAS_DISPONIBLES.filter((h) => esSlotDeGrupos(dia, h, diaCorte, horaCorte))

  const diasLibres = diasValidos.filter((d) => !slots.some((s) => s.dia === d))

  // Si el día seleccionado ya fue agregado, mover al primer día libre
  useEffect(() => {
    if (!diasLibres.includes(diaSelec)) {
      const primerLibre = diasLibres[0] ?? ''
      setDiaSelec(primerLibre)
      setHoraSelec(primerLibre ? (horasParaDia(primerLibre)[0] ?? '') : '')
    }
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validación de cupo (no cuenta los que están en lista de espera)
  const cupoCategoria  = torneo.cupoLibre ? null : (torneo.cuposPorCategoria?.[categoria] ?? null)
  const inscriptosEnCat = torneo.inscriptos.filter((i) => i.categoria === categoria && i.estado !== 'espera').length
  const cupoLleno      = cupoCategoria !== null && inscriptosEnCat >= cupoCategoria

  const handleAddSlot = () => {
    if (!diaSelec || !horaSelec) return
    if (slots.length >= MAX_SLOTS_ADMIN) {
      setSlotError(`Máximo ${MAX_SLOTS_ADMIN} horarios por pareja.`)
      return
    }
    setSlots([...slots, { dia: diaSelec, horaDesde: horaSelec }])
    setSlotError('')
  }

  const handleRemoveSlot = (idx) => setSlots(slots.filter((_, i) => i !== idx))

  const handleConfirmar = () => {
    if (cupoLleno) return
    if (!jugador1.trim() || !jugador2.trim()) {
      setFormError('Completá los nombres de ambos jugadores.')
      return
    }
    onConfirmar({
      jugador1: jugador1.trim(),
      jugador1Dni: jugador1Dni.trim(),
      jugador2: jugador2.trim(),
      jugador2Dni: jugador2Dni.trim(),
      categoria,
      disponibilidad: slots,
      prefiereMismoDia,
      fecha: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-sm">Agregar pareja</h2>
            <p className="text-slate-400 text-[11px] mt-0.5 leading-none">Carga manual — admin</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

          {/* Jugadores — grilla 2x2: nombre | DNI para cada uno */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 1</label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={jugador1}
                onChange={(e) => { setJugador1(e.target.value); setFormError('') }}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 2</label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={jugador2}
                onChange={(e) => { setJugador2(e.target.value); setFormError('') }}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">DNI J1</label>
              <input
                type="text"
                placeholder="12345678"
                value={jugador1Dni}
                onChange={(e) => setJugador1Dni(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">DNI J2</label>
              <input
                type="text"
                placeholder="12345678"
                value={jugador2Dni}
                onChange={(e) => setJugador2Dni(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs -mt-1">{formError}</p>}

          {/* Categoría */}
          {torneo.categorias.length > 1 && (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 bg-white"
              >
                {torneo.categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Disponibilidad */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Disponibilidad horaria
              </label>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                slots.length >= MAX_SLOTS_ADMIN
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {slots.length}/{MAX_SLOTS_ADMIN}
              </span>
            </div>

            {/* Día + botón Agregar en fila — oculto si no hay días libres */}
            <div className={diasLibres.length === 0 ? 'hidden' : 'flex flex-col gap-2'}>
              <div className="flex gap-2">
                <select
                  value={diaSelec}
                  onChange={(e) => {
                    const d = e.target.value
                    setDiaSelec(d)
                    setHoraSelec(horasParaDia(d)[0] ?? '')
                  }}
                  className="flex-1 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
                >
                  {diasLibres.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button
                  onClick={handleAddSlot}
                  disabled={!diaSelec || !horaSelec || slots.length >= MAX_SLOTS_ADMIN}
                  className="flex items-center gap-1 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-all text-xs font-medium shrink-0"
                >
                  <Plus size={12} /> Agregar
                </button>
              </div>
              {/* Grid horas */}
              {diaSelec && (
                <div className="grid grid-cols-5 gap-1">
                  {horasParaDia(diaSelec).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHoraSelec(h)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        horaSelec === h
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {slotError && <p className="text-red-500 text-xs">{slotError}</p>}

            {/* Slots agregados */}
            {slots.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {slots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-brand-50 border border-brand-100 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-brand-700 font-medium">{s.dia} · desde las {s.horaDesde}</span>
                    <button onClick={() => handleRemoveSlot(i)} className="text-brand-300 hover:text-red-500 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prefiere mismo día — compacto */}
          <button
            onClick={() => soloUnDia && setPrefiereMismoDia((v) => !v)}
            disabled={!soloUnDia}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
              !soloUnDia
                ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                : prefiereMismoDia
                  ? 'border-[#afca0b]/30 bg-[#afca0b]/8 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
              prefiereMismoDia && soloUnDia ? 'bg-[#afca0b] border-[#afca0b]' : 'border-slate-300'
            }`}>
              {prefiereMismoDia && soloUnDia && <span className="text-white text-[9px] font-bold">✓</span>}
            </div>
            <span className="text-xs">Prefieren jugar los 2 partidos el mismo día</span>
          </button>
        </div>

        {/* Alerta cupo lleno */}
        {cupoLleno && (
          <div className="mx-5 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-xs font-medium">
              Cupo de <strong>{categoria}</strong> completo ({inscriptosEnCat}/{cupoCategoria} parejas).
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cupoLleno}
            className="flex-1 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-brand-500/20"
          >
            Agregar pareja
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar disponibilidad ───────────────────────────────────────────────

const ModalEditarDisponibilidad = ({ torneo, inscripto, onClose, onGuardar }) => {
  const [slots, setSlots]           = useState(inscripto.disponibilidad ? [...inscripto.disponibilidad] : [])
  const [diaSelec, setDiaSelec]   = useState('')
  const [horaSelec, setHoraSelec] = useState('')
  const [slotError, setSlotError] = useState('')

  const diaCorte    = torneo.diaInicioEliminatoria  ?? null
  const horaCorte   = torneo.horaInicioEliminatoria ?? null
  const diasValidos = getDiasValidos(torneo.fechaInicio, torneo.fechaFin)
    .filter((dia) => esSlotDeGrupos(dia, '00:00', diaCorte, horaCorte))
  const horasParaDia = (dia) =>
    HORAS_DISPONIBLES.filter((h) => esSlotDeGrupos(dia, h, diaCorte, horaCorte))

  const handleAddSlot = () => {
    if (!diaSelec || !horaSelec) return
    if (slots.length >= MAX_SLOTS_ADMIN) { setSlotError(`Máximo ${MAX_SLOTS_ADMIN} horarios.`); return }
    if (slots.some((s) => s.dia === diaSelec && s.horaDesde === horaSelec)) { setSlotError('Ese horario ya fue agregado.'); return }
    setSlots([...slots, { dia: diaSelec, horaDesde: horaSelec }])
    setSlotError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">Editar disponibilidad</h2>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{inscripto.jugador1} / {inscripto.jugador2}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidad horaria</label>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${slots.length >= MAX_SLOTS_ADMIN ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              {slots.length}/{MAX_SLOTS_ADMIN}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <select
              value={diaSelec}
              onChange={(e) => {
                const d = e.target.value
                setDiaSelec(d)
                setHoraSelec(horasParaDia(d)[0] ?? '')
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            >
              <option value="">Seleccioná un día</option>
              {diasValidos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {diaSelec && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Desde las</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {horasParaDia(diaSelec).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHoraSelec(h)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        horaSelec === h
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={handleAddSlot}
              disabled={!diaSelec || !horaSelec || slots.length >= MAX_SLOTS_ADMIN}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-all text-sm font-medium"
            >
              <Plus size={14} /> Agregar disponibilidad
            </button>
          </div>

          {slotError && <p className="text-red-500 text-xs">{slotError}</p>}

          {slots.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 text-xs">
                  <span className="text-brand-700 font-medium">{s.dia} · desde las {s.horaDesde}</span>
                  <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="text-brand-300 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs text-center py-4 bg-slate-50 rounded-xl">
              Sin horarios — la pareja puede jugar cualquier horario disponible.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button
            onClick={() => { onGuardar(inscripto.id, { disponibilidad: slots }); onClose() }}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all shadow-sm shadow-brand-500/20"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal para cargar resultado de partido eliminatorio ───────────────────────

const ModalResultado = ({ partido, onClose, onGuardar }) => {
  const { pareja1, pareja2 } = partido
  const [sets, setSets] = useState(
    partido.resultado?.length
      ? partido.resultado.map((s) => ({ p1: String(s.p1), p2: String(s.p2) }))
      : [{ p1: '', p2: '' }]
  )

  const updateSet = (idx, field, val) =>
    setSets((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: val.replace(/\D/g, '').slice(0, 2) } : s))

  const addSet    = () => sets.length < 3 && setSets((p) => [...p, { p1: '', p2: '' }])
  const removeSet = (idx) => setSets((p) => p.filter((_, i) => i !== idx))

  const parsedSets     = sets.filter((s) => s.p1 !== '' && s.p2 !== '' && isValidSet(s.p1, s.p2)).map((s) => ({ p1: parseInt(s.p1), p2: parseInt(s.p2) }))
  const ganadorPreview = calcularGanadorDesdeResultado(parsedSets, pareja1, pareja2)
  const haySetInvalido = sets.some((s) => s.p1 !== '' && s.p2 !== '' && !isValidSet(s.p1, s.p2))

  const handleGuardar = () => {
    if (!ganadorPreview) return
    onGuardar(partido.id, { resultado: parsedSets })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col">

        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 font-bold text-sm">Registrar resultado</h2>
            <p className="text-slate-400 text-[11px] mt-0.5 truncate max-w-[200px]">
              {pareja1?.jugador1?.split(' ').at(-1)} / {pareja1?.jugador2?.split(' ').at(-1)} vs {pareja2?.jugador1?.split(' ').at(-1)} / {pareja2?.jugador2?.split(' ').at(-1)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">

          {/* Header nombres */}
          <div className="grid grid-cols-[1fr_20px_1fr_20px] gap-2 px-1">
            <span className="text-[10px] text-slate-400 font-semibold truncate">{pareja1?.jugador1?.split(' ')[0]}</span>
            <span />
            <span className="text-[10px] text-slate-400 font-semibold truncate">{pareja2?.jugador1?.split(' ')[0]}</span>
            <span />
          </div>

          {sets.map((set, idx) => {
            const completo = set.p1 !== '' && set.p2 !== ''
            const invalido = completo && !isValidSet(set.p1, set.p2)
            const inputBase = `w-full bg-slate-50 border rounded-lg px-2 py-2 text-sm text-slate-800 outline-none focus:ring-2 transition-all text-center font-mono ${
              invalido ? 'border-red-300 focus:ring-red-400/30' : 'border-slate-200 focus:ring-brand-500/30 focus:border-brand-500'
            }`
            return (
              <div key={idx} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1fr_20px_1fr_20px] gap-2 items-center">
                  <input type="text" inputMode="numeric" maxLength={2} value={set.p1} onChange={(e) => updateSet(idx, 'p1', e.target.value)} className={inputBase} placeholder="0" />
                  <span className="text-slate-300 text-xs font-bold text-center">-</span>
                  <input type="text" inputMode="numeric" maxLength={2} value={set.p2} onChange={(e) => updateSet(idx, 'p2', e.target.value)} className={inputBase} placeholder="0" />
                  <button onClick={() => removeSet(idx)} disabled={sets.length === 1} className="text-slate-300 hover:text-red-400 disabled:opacity-0 transition-all flex justify-center">
                    <X size={13} />
                  </button>
                </div>
                {invalido && <p className="text-[10px] text-red-500 pl-1">Resultado inválido</p>}
              </div>
            )
          })}

          {sets.length < 3 && (
            <button onClick={addSet} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600 transition-all">
              <Plus size={11} /> Agregar set
            </button>
          )}

          {ganadorPreview && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <Trophy size={13} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-emerald-600 font-medium">Ganador</p>
                <p className="text-xs font-bold text-emerald-700">{ganadorPreview.jugador1} / {ganadorPreview.jugador2}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
          <button onClick={handleGuardar} disabled={!ganadorPreview || haySetInvalido} className="px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal horario partido del bracket ────────────────────────────────────────

const ModalHorario = ({ partido, canchasActivas, onClose, onGuardar }) => {
  const [fecha,  setFecha]  = useState(partido.fecha  ?? '')
  const [hora,   setHora]   = useState(partido.hora   ?? '')
  const [cancha, setCancha] = useState(partido.cancha ?? '')

  const apellido = (n) => n?.split(' ').at(-1) ?? n
  const p1 = partido.pareja1 ? `${apellido(partido.pareja1.jugador1)} / ${apellido(partido.pareja1.jugador2)}` : '—'
  const p2 = partido.pareja2 ? `${apellido(partido.pareja2.jugador1)} / ${apellido(partido.pareja2.jugador2)}` : '—'

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Horario del partido</h3>
            <p className="text-xs text-slate-400 mt-0.5">{p1} vs {p2}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-all"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Hora</label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Cancha</label>
            <select value={cancha} onChange={(e) => setCancha(e.target.value)} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {canchasActivas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
          <button onClick={() => onGuardar(fecha || null, hora || null, cancha || null)} className="px-5 py-2 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all">Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const TorneoDetallePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { torneos, setEstado, setBracket, updateBracket, bajaInscripto, setGanadores,
          setGrupos, updateGrupos, resolveGroupTie, addPareja, updatePareja,
          updatePersonalizacion } = useTorneosStore()
  const addBajaInscripcionTorneo = usePlayerNotificationsStore((s) => s.addBajaInscripcionTorneo)
  const addPromovido             = usePlayerNotificationsStore((s) => s.addPromovido)
  const club           = useClubStore((s) => s.club)
  const canchas        = club.canchas
  const canchasActivas = canchas.filter((c) => c.activa)
  const canchaName     = (id) => canchas.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`
  const [tab, setTab]                   = useState('inscriptos')
  const [catTab, setCatTab]             = useState(() => torneos.find((x) => x.id === Number(id))?.categorias?.[0] ?? null)
  const [swapSource, setSwapSource]     = useState(null)
  const [modalAgregarAdmin, setModalAgregarAdmin] = useState(false)
  const [zonaDetalleIdx, setZonaDetalleIdx]       = useState(null)
  const [editando, setEditando]         = useState(null)
  const [modalResultado, setModalResultado]       = useState(null)
  const [modalHorario,   setModalHorario]         = useState(null)
  const [bracketFullscreen, setBracketFullscreen] = useState(false)
  const [bracketPublicar,   setBracketPublicar]   = useState(false)
  const [vistaParalela,     setVistaParalela]     = useState(false)
  const [persona, setPersona] = useState(() => {
    const t = torneos.find((x) => x.id === Number(id))
    return {
      colorAcento:          t?.colorAcento          ?? '',
      estiloCardFixture:    t?.estiloCardFixture    ?? 'oscura',
      colorCardFixture:     t?.colorCardFixture     ?? '',
      estiloCardGrupos:     t?.estiloCardGrupos     ?? 'oscura',
      colorCardGrupos:      t?.colorCardGrupos      ?? '',
      colorCard:            t?.colorCard            ?? '',
      imagenFondoDraw:    t?.imagenFondoDraw    ?? '',
      imagenFondoBracket: t?.imagenFondoBracket ?? '',
      imagenFondoFixture: t?.imagenFondoFixture ?? '',
      imagenFondoGrupos:      t?.imagenFondoGrupos      ?? '',
      imagenHeaderGrupos:     t?.imagenHeaderGrupos     ?? '',
      colorTextoCardGrupos:   t?.colorTextoCardGrupos   ?? '',
      estiloCard:         t?.estiloCard         ?? 'oscura',
      fontScale:          t?.fontScale          ?? 'normal',
      sponsors:           t?.sponsors           ?? [],
      sponsorScale:       t?.sponsorScale       ?? 'normal',
      bannerLateral1Fixture: t?.bannerLateral1Fixture ?? '',
      bannerLateral2Fixture: t?.bannerLateral2Fixture ?? '',
      bannerLateral1Grupos:  t?.bannerLateral1Grupos  ?? '',
      bannerLateral2Grupos:  t?.bannerLateral2Grupos  ?? '',
      drawMostrarClub:       t?.drawMostrarClub       ?? true,
      drawTitulo:            t?.drawTitulo            ?? 'Main Draw',
      drawMostrarNombre:     t?.drawMostrarNombre     ?? true,
      drawMostrarFechas:     t?.drawMostrarFechas     ?? true,
      drawMostrarCategorias: t?.drawMostrarCategorias ?? true,
      drawColorTitulo:       t?.drawColorTitulo       ?? '',
      bracketColores:        t?.bracketColores        ?? {},
      bracketColorCards:     t?.bracketColorCards     ?? {},
    }
  })
  const [selectedBracketCat, setSelectedBracketCat] = useState(() => {
    const t = torneos.find((x) => x.id === Number(id))
    if (t?.brackets) {
      const cats = Object.keys(t.brackets)
      if (cats.length > 0) return cats[0]
    }
    return t?.categorias?.[0] ?? null
  })
  const [newSponsor, setNewSponsor] = useState({ nombre: '', logo: '' })
  const [bannerWarnings, setBannerWarnings] = useState({})
  const checkBannerRatio = (key, url) => {
    if (!url) { setBannerWarnings((w) => ({ ...w, [key]: null })); return }
    const img = new Image()
    img.onload  = () => setBannerWarnings((w) => ({ ...w, [key]: img.naturalHeight >= img.naturalWidth ? 'ok' : 'warn' }))
    img.onerror = () => setBannerWarnings((w) => ({ ...w, [key]: null }))
    img.src = url
  }
  const [savedOk, setSavedOk]       = useState(false)
  const setP = (k, v) => setPersona((p) => ({ ...p, [k]: v }))

  const torneo   = torneos.find((t) => t.id === Number(id))
  const multiCat = (torneo?.categorias?.length ?? 0) > 1
  const activeBracket = torneo?.brackets?.[selectedBracketCat] ?? null

  const seedingMap = useMemo(() => {
    const map = {}
    const zonas = (torneo?.grupos ?? []).filter((z) =>
      !selectedBracketCat || z.categoria === selectedBracketCat
    )
    zonas.forEach((zona) => {
      const letra = zona.nombre.replace('Zona ', '')
      ;(zona.clasificados ?? []).forEach((pareja, pos) => {
        if (pareja) map[pareja.id] = `${pos + 1}°${letra}`
      })
    })
    return map
  }, [torneo?.grupos, selectedBracketCat])

  if (!torneo) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Trophy size={48} strokeWidth={1.2} />
        <p className="text-sm">Torneo no encontrado</p>
        <button
          onClick={() => navigate('/dashboardAdmin/torneos')}
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Volver a torneos
        </button>
      </div>
    )
  }

  const esFormatoGrupos   = torneo.formato === 'Fase de grupos + Eliminación'
  const puedeToggle       = ['draft', 'open', 'closed'].includes(torneo.estado)
  const puedeGenerarFixture =
    (!torneo.brackets || Object.keys(torneo.brackets).length === 0) &&
    torneo.inscriptos.length >= 2 &&
    ['closed', 'in_progress'].includes(torneo.estado) &&
    !esFormatoGrupos

  const handleToggleEstado = () => {
    setEstado(torneo.id, toggleEstado(torneo.estado))
  }

  const handleGenerarFixture = () => {
    try {
      const cats = torneo.categorias
      if (cats.length <= 1) {
        const bracket = generateEliminationBracket(torneo.inscriptos)
        const cat = cats[0] ?? 'default'
        setBracket(torneo.id, cat, bracket)
        setSelectedBracketCat(cat)
      } else {
        let firstCat = null
        cats.forEach((cat) => {
          const parejasCat = torneo.inscriptos.filter((p) => p.categoria === cat)
          if (parejasCat.length >= 2) {
            const bracket = generateEliminationBracket(parejasCat)
            setBracket(torneo.id, cat, bracket)
            if (!firstCat) firstCat = cat
          }
        })
        if (firstCat) setSelectedBracketCat(firstCat)
      }
      setTab('fixture')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleRegistrarResultado = (matchId, datos) => {
    if (!activeBracket) return
    const newBracket = advanceWinner(activeBracket, matchId, datos)
    if (isBracketFinished(newBracket)) {
      const ganadorObj    = getBracketWinner(newBracket)
      const final         = newBracket.rondas[newBracket.rondas.length - 1].partidos[0]
      const subcampeonObj = final.pareja1?.id === ganadorObj?.id ? final.pareja2 : final.pareja1
      updateBracket(torneo.id, selectedBracketCat, newBracket)
      setGanadores(torneo.id, {
        ganador:    ganadorObj    ? `${ganadorObj.jugador1} / ${ganadorObj.jugador2}`    : null,
        subcampeon: subcampeonObj ? `${subcampeonObj.jugador1} / ${subcampeonObj.jugador2}` : null,
      })
    } else {
      updateBracket(torneo.id, selectedBracketCat, newBracket)
    }
  }

  const handleGuardarHorario = (fecha, hora, cancha) => {
    if (!modalHorario || !activeBracket) return
    const newBracket = {
      ...activeBracket,
      rondas: activeBracket.rondas.map((r) => ({
        ...r,
        partidos: r.partidos.map((p) =>
          p.id === modalHorario.id ? { ...p, fecha: fecha || null, hora: hora || null, cancha: cancha || null } : p
        ),
      })),
    }
    updateBracket(torneo.id, selectedBracketCat, newBracket)
    setModalHorario(null)
  }

  // ── Bracket fullscreen: Escape para cerrar ───────────────────────────────────
  useEffect(() => {
    if (!bracketFullscreen) return
    const handleKey = (e) => { if (e.key === 'Escape') setBracketFullscreen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [bracketFullscreen])

  const handleBajaInscripto = (inscriptoId, ins) => {
    bajaInscripto(torneo.id, inscriptoId)
    // Si era inscripto confirmado, promover automáticamente el primero en espera (misma categoría)
    if (ins?.estado !== 'espera') {
      const primerEspera = torneo.inscriptos.find(
        (i) => i.id !== inscriptoId && i.estado === 'espera' && i.categoria === ins?.categoria
      )
      if (primerEspera) {
        updatePareja(torneo.id, primerEspera.id, { estado: 'inscripto' })
        addPromovido({ torneoNombre: torneo.nombre, categoria: primerEspera.categoria })
      }
    }
    if (ins) {
      addBajaInscripcionTorneo({
        torneoNombre: torneo.nombre,
        categoria:    ins.categoria,
        jugador1:     ins.jugador1,
        jugador2:     ins.jugador2,
      })
    }
  }

  const handlePromoverEspera = (ins) => {
    updatePareja(torneo.id, ins.id, { estado: 'inscripto' })
    addPromovido({ torneoNombre: torneo.nombre, categoria: ins.categoria })
  }

  const handleAgregarAdmin = (datos) => {
    addPareja(torneo.id, datos)
  }

  // ── Handlers grupos ──────────────────────────────────────────────────────────

  const handleGenerarGrupos = () => {
    try {
      const grupos = generateGroupPhase(torneo.inscriptos)
      setGrupos(torneo.id, grupos)
      setTab('grupos')
    } catch (e) { alert(e.message) }
  }

  const handleSelectPair = (zonaIdx, parejaIdx) => {
    if (!swapSource) {
      setSwapSource({ zonaIdx, parejaIdx })
      return
    }
    if (swapSource.zonaIdx === zonaIdx && swapSource.parejaIdx === parejaIdx) {
      setSwapSource(null)
      return
    }
    // Prevenir swap entre categorías distintas
    const catSrc = torneo.grupos[swapSource.zonaIdx].categoria
    const catTgt = torneo.grupos[zonaIdx].categoria
    if (catSrc !== catTgt) {
      setSwapSource(null)
      return
    }
    // Swap: extraer orden plano, intercambiar, regenerar
    const allParejas = torneo.grupos.flatMap((z) => z.parejas)
    const idA = torneo.grupos[swapSource.zonaIdx].parejas[swapSource.parejaIdx].id
    const idB = torneo.grupos[zonaIdx].parejas[parejaIdx].id
    const iA  = allParejas.findIndex((p) => p.id === idA)
    const iB  = allParejas.findIndex((p) => p.id === idB)
    ;[allParejas[iA], allParejas[iB]] = [allParejas[iB], allParejas[iA]]
    const newGrupos = generateGroupPhase(allParejas)
    updateGrupos(torneo.id, newGrupos)
    setSwapSource(null)
  }

  const handleAutoSchedule = () => {
    const canchasParaTorneo = torneo.canchasAsignadas?.length
      ? canchas.filter((c) => torneo.canchasAsignadas.includes(c.id))
      : canchas.filter((c) => c.activa)
    const newGrupos = autoScheduleGroups(torneo.grupos, canchasParaTorneo)
    updateGrupos(torneo.id, newGrupos)
  }

  const handleConfirmarGrupos = () => {
    setEstado(torneo.id, 'in_progress')
    setSwapSource(null)
  }

  const handleResultadoGrupo = (matchId, resultado) => {
    const partido = torneo.grupos.flatMap((z) => z.partidos).find((p) => p.id === matchId)
    if (!partido) return
    const ganador = calcularGanadorDesdeResultado(resultado, partido.pareja1, partido.pareja2)
    const gruposConResultado = torneo.grupos.map((zona) => ({
      ...zona,
      partidos: zona.partidos.map((p) => p.id === matchId ? { ...p, resultado } : p),
    }))
    const newGrupos = ganador
      ? advanceGroupMatch(gruposConResultado, matchId, ganador)
      : gruposConResultado
    updateGrupos(torneo.id, newGrupos)
  }

  const handleResolveTie = (zonaIdx, primero, segundo) => {
    resolveGroupTie(torneo.id, zonaIdx, primero, segundo)
  }

  const handleGenerarFaseEliminatoria = () => {
    try {
      const cats = [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))]
      if (cats.length <= 1) {
        const bracket = generateAPAEliminationBracket(torneo.grupos)
        const cat = cats[0] ?? torneo.categorias[0] ?? 'default'
        setBracket(torneo.id, cat, bracket)
        setSelectedBracketCat(cat)
      } else {
        let firstCat = null
        cats.forEach((cat) => {
          const zonasCat = torneo.grupos.filter((z) => z.categoria === cat)
          const bracket = generateAPAEliminationBracket(zonasCat)
          setBracket(torneo.id, cat, bracket)
          if (!firstCat) firstCat = cat
        })
        if (firstCat) setSelectedBracketCat(firstCat)
      }
      setTab('fixture')
    } catch (e) { alert(e.message) }
  }

  const gruposConfirmados = torneo.grupos !== null && torneo.estado === 'in_progress'
  const gruposPendientes  = torneo.grupos !== null && torneo.estado !== 'in_progress'
  const puedeGenerarGrupos =
    torneo.grupos === null &&
    torneo.inscriptos.length >= 2 &&
    ['closed', 'in_progress'].includes(torneo.estado)

  const renderCatTabs = () => !multiCat ? null : (
    <div className="flex gap-1.5 flex-wrap mb-4 pb-3 border-b border-slate-100">
      {torneo.categorias.map((c) => (
        <button
          key={c}
          onClick={() => setCatTab(c)}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            catTab === c
              ? 'bg-brand-500 text-white border-brand-500'
              : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/dashboardAdmin/torneos')}
          className="mt-0.5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-slate-800 text-xl md:text-2xl font-bold leading-tight">{torneo.nombre}</h1>
            <Badge estado={torneo.estado} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-slate-400 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}
            </span>
            <span>{torneo.formato}</span>
            <span>{torneo.categorias.join(', ')}</span>
            {torneo.genero && (
              <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] ${
                torneo.genero === 'Femenino'  ? 'text-pink-600 bg-pink-50 border-pink-200' :
                torneo.genero === 'Mixto'     ? 'text-violet-600 bg-violet-50 border-violet-200' :
                                               'text-sky-600 bg-sky-50 border-sky-200'
              }`}>
                {torneo.genero}
              </span>
            )}
          </div>
        </div>

        {/* Toggle estado */}
        {puedeToggle && (
          <button
            onClick={handleToggleEstado}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all shrink-0 ${
              torneo.estado === 'open'
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : torneo.estado === 'closed'
                  ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                  : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {torneo.estado === 'open'
              ? <><ToggleRight size={14} /> Cerrar inscripción</>
              : torneo.estado === 'closed'
                ? <><Lock size={14} /> Reabrir inscripción</>
                : <><ToggleLeft size={14} /> Abrir inscripción</>
            }
          </button>
        )}
      </div>

      {/* Descripción */}
      {torneo.descripcion && (
        <p className="text-slate-500 text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          {torneo.descripcion}
        </p>
      )}

      {/* Podio (si finalizado) */}
      {torneo.estado === 'finished' && (torneo.ganador || torneo.subcampeon) && (
        <div className="flex gap-3 flex-wrap">
          {torneo.ganador && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <Trophy size={16} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-amber-600 font-medium">Campeones</p>
                <p className="text-slate-800 text-sm font-bold">{torneo.ganador}</p>
              </div>
            </div>
          )}
          {torneo.subcampeon && (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <Medal size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Subcampeones</p>
                <p className="text-slate-700 text-sm font-bold">{torneo.subcampeon}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { key: 'inscriptos', label: 'Parejas inscriptas', icon: Users,     count: torneo.inscriptos.length },
            ...(esFormatoGrupos ? [{ key: 'grupos',   label: 'Grupos',          icon: GitMerge, count: torneo.grupos ? torneo.grupos.length : null }] : []),
            ...(esFormatoGrupos && torneo.grupos && torneo.estado === 'in_progress' ? [{ key: 'horarios', label: 'Horarios', icon: Clock, count: null }] : []),
            { key: 'fixture',    label: 'Fixture / Bracket',  icon: Zap,       count: activeBracket ? activeBracket.rondas.length : null },
            { key: 'visual',     label: 'Personalización',     icon: Palette,   count: null },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'border-brand-500 text-brand-600 bg-brand-500/3'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                  tab === key ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Inscriptos ── */}
        {tab === 'inscriptos' && (
          <div className="p-5">
            {/* Botón carga manual — solo cuando inscripción abierta */}
            {torneo.estado === 'open' && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setModalAgregarAdmin(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-all"
                >
                  <UserPlus size={15} />
                  Agregar pareja
                </button>
              </div>
            )}

            {renderCatTabs()}

            {(() => {
              const lista = multiCat
                ? torneo.inscriptos.filter((i) => i.categoria === catTab)
                : torneo.inscriptos
              const confirmados = lista.filter((i) => i.estado !== 'espera')
              const enEspera    = lista.filter((i) => i.estado === 'espera')

              return confirmados.length === 0 && enEspera.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Users size={40} strokeWidth={1.2} />
                  <p className="text-sm">Todavía no hay parejas inscriptas{multiCat ? ` en ${catTab}` : ''}</p>
                </div>
              ) : (
                <>
                  {confirmados.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2">
                      {confirmados.map((ins, idx) => (
                        <ParejaCard
                          key={ins.id}
                          ins={ins}
                          idx={idx}
                          estadoTorneo={torneo.estado}
                          onEditar={setEditando}
                          onBaja={handleBajaInscripto}
                        />
                      ))}
                    </div>
                  )}
                  {enEspera.length > 0 && (
                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-amber-100" />
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Clock size={11} />
                          Lista de espera ({enEspera.length})
                        </span>
                        <div className="flex-1 h-px bg-amber-100" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2">
                        {enEspera.map((ins) => (
                          <EsperaCard
                            key={ins.id}
                            ins={ins}
                            estadoTorneo={torneo.estado}
                            onPromover={() => handlePromoverEspera(ins)}
                            onBaja={() => handleBajaInscripto(ins.id, ins)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* ── Tab Grupos ── */}
        {tab === 'grupos' && esFormatoGrupos && (
          <div className="p-5">

            {/* Sin grupos generados */}
            {!torneo.grupos && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                <GitMerge size={40} strokeWidth={1.2} />
                {puedeGenerarGrupos ? (
                  <>
                    <p className="text-sm text-center">
                      {torneo.inscriptos.length} parejas inscriptas.<br />
                      El sistema calcula las zonas automáticamente.
                    </p>
                    <button
                      onClick={handleGenerarGrupos}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20"
                    >
                      <GitMerge size={15} /> Generar grupos
                    </button>
                  </>
                ) : torneo.inscriptos.length < 2 ? (
                  <p className="text-sm text-center">Necesitás al menos 2 parejas para generar grupos.</p>
                ) : (
                  <p className="text-sm text-center">Cerrá la inscripción para poder generar los grupos.</p>
                )}
              </div>
            )}

            {/* Grupos generados — modo setup (intercambio antes de confirmar) */}
            {gruposPendientes && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-slate-700 text-sm font-semibold">Revisá y ajustá las zonas</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Hacé clic en una pareja para seleccionarla, luego clic en otra para intercambiarlas.
                      {multiCat && ' Solo podés intercambiar dentro de la misma categoría.'}
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmarGrupos}
                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0 shadow-sm shadow-brand-500/20"
                  >
                    <CheckCheck size={15} /> Confirmar grupos
                  </button>
                </div>

                {swapSource && (
                  <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5 text-sm text-brand-700">
                    <Shuffle size={14} />
                    Seleccionaste una pareja — ahora hacé clic en otra de la misma categoría para intercambiarlas.
                    <button onClick={() => setSwapSource(null)} className="ml-auto text-brand-400 hover:text-brand-600 text-xs">Cancelar</button>
                  </div>
                )}

                {renderCatTabs()}

                <div className="grid gap-3">
                  {torneo.grupos
                    .map((z, i) => ({ z, i }))
                    .filter(({ z }) => !multiCat || z.categoria === catTab)
                    .map(({ z, i }) => (
                      <ZonaSetupCard key={z.nombre + (z.categoria ?? '')} zona={z} zonaIdx={i} swapSource={swapSource} onSelectPair={handleSelectPair} />
                    ))}
                </div>
              </div>
            )}

            {/* Grupos confirmados — modo juego */}
            {gruposConfirmados && (
              <div className="flex flex-col gap-4">
                {isGroupPhaseFinished(torneo.grupos) && (!torneo.brackets || Object.keys(torneo.brackets).length === 0) && (
                  <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-emerald-700 text-sm font-semibold">
                      ✓ Fase de grupos completa — {getAllClasificados(torneo.grupos).length} parejas clasificadas
                    </p>
                    <button
                      onClick={handleGenerarFaseEliminatoria}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      <Zap size={13} /> Generar fase eliminatoria
                    </button>
                  </div>
                )}

                {renderCatTabs()}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {torneo.grupos
                    .map((z, i) => ({ z, i }))
                    .filter(({ z }) => !multiCat || z.categoria === catTab)
                    .map(({ z, i }) => (
                      <ZonaCardCompact
                        key={z.nombre + (z.categoria ?? '')}
                        zona={z}
                        onClick={() => setZonaDetalleIdx(i)}
                      />
                    ))}
                </div>

                {zonaDetalleIdx !== null && torneo.grupos?.[zonaDetalleIdx] && (
                  <ZonaDetailModal
                    zona={torneo.grupos[zonaDetalleIdx]}
                    zonaIdx={zonaDetalleIdx}
                    onClose={() => setZonaDetalleIdx(null)}
                    onResultado={handleResultadoGrupo}
                    onResolveTie={handleResolveTie}
                    canchaName={canchaName}
                  />
                )}
              </div>
            )}

          </div>
        )}

        {/* ── Tab Horarios ── */}
        {tab === 'horarios' && esFormatoGrupos && torneo.grupos && (
          <div className="p-5">
            {(() => {
              const activas      = canchas.filter((c) => c.activa)
              const zonasFiltradas = multiCat
                ? torneo.grupos.filter((z) => z.categoria === catTab)
                : torneo.grupos
              const todosPartidos = zonasFiltradas.flatMap((z) =>
                z.partidos.map((p) => ({ ...p, zonaNombre: z.nombre, categoria: z.categoria }))
              )
              const conHorario    = todosPartidos.filter((p) => p.slot)
              const sinHorario    = todosPartidos.filter((p) => p.sinHorario)
              const sinAsignar    = todosPartidos.filter((p) => !p.slot && !p.sinHorario)

              // Agrupar los asignados por hora exacta
              const porSlot = conHorario.reduce((acc, p) => {
                const hora = p.slot.hora ?? null
                const key  = `${p.slot.dia}||${hora ?? 'sin-hora'}`
                if (!acc[key]) acc[key] = { dia: p.slot.dia, hora, partidos: [] }
                acc[key].partidos.push(p)
                return acc
              }, {})

              const canchaName = (id) => activas.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`

              return (
                <div className="flex flex-col gap-5">
                  {renderCatTabs()}

                  {/* Info + botón */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-slate-700 text-sm font-semibold">Asignación de horarios</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {activas.length} cancha{activas.length !== 1 ? 's' : ''} activa{activas.length !== 1 ? 's' : ''} · máximo {activas.length} partido{activas.length !== 1 ? 's' : ''} simultáneo{activas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleAutoSchedule}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shrink-0 shadow-sm shadow-brand-500/20"
                    >
                      <Zap size={14} /> Auto-asignar
                    </button>
                  </div>

                  {/* Sin asignar aún */}
                  {sinAsignar.length > 0 && conHorario.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                      <Clock size={36} strokeWidth={1.2} />
                      <p className="text-sm text-center">
                        {todosPartidos.length} partidos pendientes de horario.<br />
                        Presioná <strong>Auto-asignar</strong> para distribuirlos según disponibilidad.
                      </p>
                    </div>
                  )}

                  {/* Partidos asignados agrupados por slot */}
                  {Object.values(porSlot).map(({ dia, hora, partidos: ps }) => (
                    <div key={`${dia}${hora ?? 'sin-hora'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-700">{dia}</span>
                        <span className="text-xs text-slate-400">·</span>
                        {hora
                          ? <span className="text-xs font-bold text-slate-800">{hora} hs</span>
                          : <span className="text-xs text-slate-500">sin hora exacta</span>
                        }
                        <span className="ml-auto text-xs text-slate-400">{ps.length}/{activas.length} cancha{ps.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {ps.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                            <span className="text-xs font-semibold text-brand-600 w-20 shrink-0">{canchaName(p.cancha)}</span>
                            <span className="text-slate-700 text-xs flex-1 truncate">
                              {p.pareja1?.jugador1} / {p.pareja1?.jugador2}
                              <span className="text-slate-300 mx-1.5">vs</span>
                              {p.pareja2?.jugador1} / {p.pareja2?.jugador2}
                            </span>
                            {p.categoria && (
                              <span className="text-xs text-slate-400 shrink-0">{p.categoria}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Sin horario compatible */}
                  {sinHorario.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={13} className="text-red-500" />
                        <span className="text-xs font-bold text-red-600">Sin horario compatible ({sinHorario.length})</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {sinHorario.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                            <span className="text-red-400 text-xs flex-1 truncate">
                              {p.pareja1?.jugador1} / {p.pareja1?.jugador2}
                              <span className="mx-1.5">vs</span>
                              {p.pareja2?.jugador1} / {p.pareja2?.jugador2}
                            </span>
                            <span className="text-red-400 text-xs shrink-0">Sin disponibilidad en común</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-slate-400 text-xs mt-2">
                        Estas parejas no tienen días en común. Coordiná el horario manualmente y actualizá su disponibilidad.
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Tab Fixture ── */}
        {tab === 'fixture' && (
          <div className="p-5 flex flex-col gap-5">

            {/* ── Colores del bracket por categoría ── */}
            {torneo.categorias?.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Palette size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600 flex-1">Colores del bracket por categoría</span>
                  <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">No afecta la landing</span>
                  {Object.values(persona.bracketColores ?? {}).some(Boolean) && (
                    <button
                      onClick={() => {
                        setPersona(p => ({ ...p, bracketColores: {} }))
                        updatePersonalizacion(torneo.id, { bracketColores: {} })
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {torneo.categorias.map((cat) => {
                    const color = persona.bracketColores?.[cat] || ''
                    return (
                      <div key={cat} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                        <input
                          type="color"
                          value={color || '#afca0b'}
                          onChange={(e) => {
                            const val = e.target.value
                            setPersona(p => ({ ...p, bracketColores: { ...p.bracketColores, [cat]: val } }))
                            updatePersonalizacion(torneo.id, { bracketColores: { ...(torneo.bracketColores ?? {}), [cat]: val } })
                          }}
                          className="w-6 h-6 rounded-md border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{cat}</span>
                        {color && (
                          <button
                            onClick={() => {
                              setPersona(p => { const bc = { ...p.bracketColores }; delete bc[cat]; return { ...p, bracketColores: bc } })
                              const bc = { ...(torneo.bracketColores ?? {}) }; delete bc[cat]
                              updatePersonalizacion(torneo.id, { bracketColores: bc })
                            }}
                            className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
                            title="Quitar color"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Fondo del draw por categoría */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 w-full">Color de card por categoría</span>
                  {torneo.categorias.map((cat) => {
                    const fondo = persona.bracketColorCards?.[cat] || ''
                    return (
                      <div key={cat} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                        <input
                          type="color"
                          value={fondo || '#0d1117'}
                          onChange={(e) => {
                            const val = e.target.value
                            setPersona(p => ({ ...p, bracketColorCards: { ...p.bracketColorCards, [cat]: val } }))
                            updatePersonalizacion(torneo.id, { bracketColorCards: { ...(torneo.bracketColorCards ?? {}), [cat]: val } })
                          }}
                          className="w-6 h-6 rounded-md border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{cat}</span>
                        {fondo && (
                          <button
                            onClick={() => {
                              setPersona(p => { const bf = { ...p.bracketColorCards }; delete bf[cat]; return { ...p, bracketColorCards: bf } })
                              const bf = { ...(torneo.bracketColorCards ?? {}) }; delete bf[cat]
                              updatePersonalizacion(torneo.id, { bracketColorCards: bf })
                            }}
                            className="text-slate-300 hover:text-red-400 transition-colors ml-0.5"
                            title="Quitar color de card"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sin bracket todavía */}
            {!activeBracket && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                <Zap size={40} strokeWidth={1.2} />
                {puedeGenerarFixture ? (
                  <>
                    <p className="text-sm text-center">
                      Hay {torneo.inscriptos.length} pareja{torneo.inscriptos.length !== 1 ? 's' : ''} inscripta{torneo.inscriptos.length !== 1 ? 's' : ''}.
                      <br />Generá el fixture para arrancar el torneo.
                    </p>
                    <button
                      onClick={handleGenerarFixture}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20"
                    >
                      <Zap size={15} />
                      Generar fixture
                    </button>
                  </>
                ) : esFormatoGrupos ? (
                  <p className="text-sm text-center">
                    La fase eliminatoria se genera desde la pestaña <strong>Grupos</strong> una vez que todas las zonas estén completas.
                  </p>
                ) : torneo.inscriptos.length < 2 ? (
                  <p className="text-sm text-center">
                    Necesitás al menos 2 parejas inscriptas para generar el fixture.
                  </p>
                ) : (
                  <p className="text-sm text-center">
                    Cerrá la inscripción primero para poder generar el fixture.
                  </p>
                )}
              </div>
            )}

            {/* Bracket generado */}
            {activeBracket && (
              <>
                {/* Barra de acciones */}
                <div className="flex items-center flex-wrap gap-2 px-1 -mb-2">
                  {/* Vista paralela — solo si hay 2+ categorías con bracket */}
                  {Object.keys(torneo.brackets ?? {}).length >= 2 && (
                    <button
                      onClick={() => setVistaParalela(v => !v)}
                      className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border shadow-sm ${
                        vistaParalela
                          ? 'text-brand-700 bg-brand-100 border-brand-300'
                          : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span className="flex gap-0.5">
                        <span className="w-2.5 h-3.5 rounded-sm bg-current opacity-60" />
                        <span className="w-2.5 h-3.5 rounded-sm bg-current opacity-60" />
                      </span>
                      Vista paralela
                    </button>
                  )}
                  <div className="flex-1" />
                  {/* Publicar en redes */}
                  <button
                    onClick={() => setBracketPublicar(true)}
                    className="group flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-all border border-brand-200 hover:border-brand-300 shadow-sm"
                  >
                    <Share2 size={12} />
                    Publicar en redes
                  </button>
                  {/* Pantalla completa */}
                  <button
                    onClick={() => setBracketFullscreen(true)}
                    className="group flex items-center gap-2 text-xs font-semibold text-white bg-[#0d1117] hover:bg-[#161b27] px-3 py-1.5 rounded-xl transition-all border border-white/10 hover:border-white/20 shadow-sm"
                  >
                    <Maximize2 size={12} className="text-white/50 group-hover:text-white/80 transition-colors" />
                    <span className="text-white/60 group-hover:text-white/90 transition-colors">Pantalla completa</span>
                  </button>
                </div>

                {/* Vista paralela — dos brackets lado a lado */}
                {vistaParalela ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(torneo.brackets).map((cat) => {
                      const bracketCat = torneo.brackets[cat]
                      const color = torneo.bracketColores?.[cat] || torneo.colorAcento || '#afca0b'
                      return (
                        <div key={cat} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 px-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-xs font-semibold text-slate-700">{cat}</span>
                          </div>
                          <BracketView
                            bracket={bracketCat}
                            torneo={torneo}
                            club={club}
                            seedingMap={seedingMap}
                            selectedCat={cat}
                            onCargarResultado={setModalResultado}
                            onEditarHorario={setModalHorario}
                            accentColorOverride={color}
                            colorCardOverride={torneo.bracketColorCards?.[cat] || null}
                            hideHeader
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <BracketView
                    bracket={activeBracket}
                    torneo={torneo}
                    club={club}
                    seedingMap={seedingMap}
                    selectedCat={selectedBracketCat}
                    onSelectCat={(cat) => setSelectedBracketCat(cat)}
                    onCargarResultado={setModalResultado}
                    onEditarHorario={setModalHorario}
                    accentColorOverride={torneo.bracketColores?.[selectedBracketCat] || null}
                    colorCardOverride={torneo.bracketColorCards?.[selectedBracketCat] || null}
                    hideHeader
                  />
                )}
              </>
            )}

            {/* Overlay fullscreen */}
            {bracketFullscreen && activeBracket && (
              <div className="fixed inset-0 z-[60] bg-[#0d1117] flex flex-col overflow-hidden">
                {/* Botón salir flotante */}
                <button
                  onClick={() => setBracketFullscreen(false)}
                  className="absolute top-4 right-4 z-10 flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-xl transition-all backdrop-blur-sm"
                >
                  <Minimize2 size={12} />
                  Salir
                </button>

                {/* Bracket a tamaño natural con header visible — scroll horizontal si hay muchas rondas */}
                <div className="flex-1 overflow-auto">
                  <BracketView
                    bracket={activeBracket}
                    torneo={torneo}
                    club={club}
                    seedingMap={seedingMap}
                    selectedCat={selectedBracketCat}
                    onSelectCat={(cat) => setSelectedBracketCat(cat)}
                    onCargarResultado={setModalResultado}
                    onEditarHorario={setModalHorario}
                    accentColorOverride={torneo.bracketColores?.[selectedBracketCat] || null}
                    colorCardOverride={torneo.bracketColorCards?.[selectedBracketCat] || null}
                  />
                </div>
              </div>
            )}

            {/* Modal publicar en redes */}
            {bracketPublicar && activeBracket && (
              <PublicarBracketModal
                torneo={torneo}
                club={club}
                activeBracket={activeBracket}
                seedingMap={seedingMap}
                selectedCat={selectedBracketCat}
                onClose={() => setBracketPublicar(false)}
              />
            )}

          </div>
        )}

        {/* ── Tab Personalización visual ── */}
        {tab === 'visual' && (
          <div className="p-6 flex flex-col gap-8">

            {/* Color de acento — global */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Color de acento <span className="text-slate-400 font-normal">(global)</span></label>
              <div className="flex items-center gap-2 max-w-xs">
                <input type="color" value={persona.colorAcento || '#afca0b'} onChange={(e) => setP('colorAcento', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                <input type="text"  value={persona.colorAcento}              onChange={(e) => setP('colorAcento', e.target.value)} placeholder="#afca0b (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
              </div>
              <p className="text-slate-400 text-xs mt-1">Se aplica en las tres tabs del torneo público. Vacío = verde por defecto.</p>
            </div>

            {/* ── Fixture del día ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900 tracking-wide whitespace-nowrap">Fixture del día</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Imagen header sección</label>
                <ImagenFileInput
                  value={persona.imagenFondoFixture}
                  onChange={(v) => setP('imagenFondoFixture', v)}
                  hint="Banner único arriba del fixture."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Estilo de cards</label>
                <div className="flex gap-2 max-w-xs">
                  {[{ key: 'oscura', label: 'Oscura' }, { key: 'clara', label: 'Clara' }, { key: 'transparente', label: 'Transparente' }].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setP('estiloCardFixture', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.estiloCardFixture === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Color de fondo de cards</label>
                <div className="flex items-center gap-2 max-w-xs">
                  <input type="color" value={persona.colorCardFixture || '#0d1117'} onChange={(e) => setP('colorCardFixture', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                  <input type="text"  value={persona.colorCardFixture}               onChange={(e) => setP('colorCardFixture', e.target.value)} placeholder="#0d1117 (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                </div>
                <p className="text-slate-400 text-xs mt-1">Vacío = color del estilo seleccionado.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[{ key: 'bannerLateral1Fixture', label: 'Banner lateral 1 (izquierda)' }, { key: 'bannerLateral2Fixture', label: 'Banner lateral 2 (derecha)' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                    <ImagenFileInput
                      value={persona[key]}
                      onChange={(v) => setP(key, v)}
                      onImageLoad={(v) => checkBannerRatio(key, v)}
                    />
                    {bannerWarnings[key] === 'ok'   && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">✓ Imagen vertical correcta</p>}
                    {bannerWarnings[key] === 'warn' && <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">⚠ Imagen horizontal — se recomienda portrait (vertical)</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Grupos ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900 tracking-wide whitespace-nowrap">Grupos</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Imagen header sección</label>
                  <ImagenFileInput
                    value={persona.imagenHeaderGrupos}
                    onChange={(v) => setP('imagenHeaderGrupos', v)}
                    hint="Banner único arriba de todos los grupos."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Imagen de fondo cards</label>
                  <ImagenFileInput
                    value={persona.imagenFondoGrupos}
                    onChange={(v) => setP('imagenFondoGrupos', v)}
                    hint="Aparece en el header de cada card de zona."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Color de texto en header de cards</label>
                <div className="flex items-center gap-2 max-w-xs">
                  <input type="color" value={persona.colorTextoCardGrupos || '#ffffff'} onChange={(e) => setP('colorTextoCardGrupos', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                  <input type="text"  value={persona.colorTextoCardGrupos}               onChange={(e) => setP('colorTextoCardGrupos', e.target.value)} placeholder="#ffffff (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                </div>
                <p className="text-slate-400 text-xs mt-1">Color del nombre de zona cuando hay imagen de fondo. Vacío = blanco.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Estilo de cards</label>
                <div className="flex gap-2 max-w-xs">
                  {[{ key: 'oscura', label: 'Oscura' }, { key: 'clara', label: 'Clara' }, { key: 'transparente', label: 'Transparente' }].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setP('estiloCardGrupos', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.estiloCardGrupos === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Color de fondo de cards</label>
                <div className="flex items-center gap-2 max-w-xs">
                  <input type="color" value={persona.colorCardGrupos || '#0d1117'} onChange={(e) => setP('colorCardGrupos', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                  <input type="text"  value={persona.colorCardGrupos}               onChange={(e) => setP('colorCardGrupos', e.target.value)} placeholder="#0d1117 (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                </div>
                <p className="text-slate-400 text-xs mt-1">Vacío = color del estilo seleccionado.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[{ key: 'bannerLateral1Grupos', label: 'Banner lateral 1 (izquierda)' }, { key: 'bannerLateral2Grupos', label: 'Banner lateral 2 (derecha)' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                    <ImagenFileInput
                      value={persona[key]}
                      onChange={(v) => setP(key, v)}
                      onImageLoad={(v) => checkBannerRatio(key, v)}
                    />
                    {bannerWarnings[key] === 'ok'   && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">✓ Imagen vertical correcta</p>}
                    {bannerWarnings[key] === 'warn' && <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">⚠ Imagen horizontal — se recomienda portrait (vertical)</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Draw ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900 tracking-wide whitespace-nowrap">Draw</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[{ key: 'imagenFondoDraw', label: 'Imagen fondo header' }, { key: 'imagenFondoBracket', label: 'Imagen fondo llaves' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                    <ImagenFileInput
                      value={persona[key]}
                      onChange={(v) => setP(key, v)}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Estilo de cards</label>
                <div className="flex gap-2 max-w-xs">
                  {[{ key: 'oscura', label: 'Oscura' }, { key: 'clara', label: 'Clara' }, { key: 'transparente', label: 'Transparente' }].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setP('estiloCard', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.estiloCard === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Color de fondo de cards</label>
                <div className="flex items-center gap-2 max-w-xs">
                  <input type="color" value={persona.colorCard || '#0d1117'} onChange={(e) => setP('colorCard', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                  <input type="text"  value={persona.colorCard}               onChange={(e) => setP('colorCard', e.target.value)} placeholder="#0d1117 (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                </div>
                <p className="text-slate-400 text-xs mt-1">Vacío = color del estilo seleccionado.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Tamaño de fuentes</label>
                <div className="flex gap-2 max-w-xs">
                  {[{ key: 'normal', label: 'Normal' }, { key: 'grande', label: 'Grande' }, { key: 'muy-grande', label: 'Muy grande' }].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setP('fontScale', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.fontScale === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Sponsors</label>
                {persona.sponsors.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {persona.sponsors.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {s.logo && <img src={s.logo} alt={s.nombre} className="w-8 h-8 rounded object-contain border border-slate-200 shrink-0" />}
                          <p className="text-sm font-medium text-slate-700 truncate">{s.nombre}</p>
                        </div>
                        <button type="button" onClick={() => setP('sponsors', persona.sponsors.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 p-1"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input type="text" value={newSponsor.nombre} onChange={(e) => setNewSponsor((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del sponsor" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-brand-400 transition-all" />
                  <ImagenFileInput
                    value={newSponsor.logo}
                    onChange={(v) => setNewSponsor((p) => ({ ...p, logo: v }))}
                    hint="Logo del sponsor (opcional)"
                  />
                  <button type="button" onClick={() => { if (!newSponsor.nombre.trim()) return; setP('sponsors', [...persona.sponsors, { nombre: newSponsor.nombre.trim(), logo: newSponsor.logo }]); setNewSponsor({ nombre: '', logo: '' }) }} className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-all self-start"><Plus size={13} /> Agregar sponsor</button>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-600 block mb-2">Tamaño de logos</label>
                  <div className="flex gap-2 max-w-xs">
                    {[{ key: 'pequeño', label: 'Pequeño' }, { key: 'normal', label: 'Normal' }, { key: 'grande', label: 'Grande' }].map(({ key, label }) => (
                      <button key={key} type="button" onClick={() => setP('sponsorScale', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.sponsorScale === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-2">Los sponsors se muestran a los costados del draw en la página pública.</p>
              </div>

              {/* Header del draw */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-3">Header del draw</label>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Título principal</label>
                    <input type="text" value={persona.drawTitulo} onChange={(e) => setP('drawTitulo', e.target.value)} placeholder="Main Draw (vacío = oculto)" className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Color del título</label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input type="color" value={persona.drawColorTitulo || '#afca0b'} onChange={(e) => setP('drawColorTitulo', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                      <input type="text"  value={persona.drawColorTitulo}               onChange={(e) => setP('drawColorTitulo', e.target.value)} placeholder="#afca0b (vacío = color acento)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-600 block">Elementos visibles</label>
                    {[
                      { key: 'drawMostrarClub',       label: 'Nombre del club' },
                      { key: 'drawMostrarNombre',     label: 'Nombre del torneo' },
                      { key: 'drawMostrarFechas',     label: 'Fechas' },
                      { key: 'drawMostrarCategorias', label: 'Categorías / género' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={persona[key]} onChange={(e) => setP(key, e.target.checked)} className="rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
                        <span className="text-xs text-slate-600">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Guardar */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              {savedOk && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle size={13} /> Guardado
                </span>
              )}
              <button
                onClick={() => {
                  updatePersonalizacion(torneo.id, {
                    colorAcento:          persona.colorAcento          || null,
                    estiloCardFixture:    persona.estiloCardFixture,
                    colorCardFixture:     persona.colorCardFixture      || null,
                    estiloCardGrupos:     persona.estiloCardGrupos,
                    colorCardGrupos:      persona.colorCardGrupos       || null,
                    imagenFondoFixture:   persona.imagenFondoFixture    || null,
                    imagenFondoGrupos:      persona.imagenFondoGrupos      || null,
                    imagenHeaderGrupos:     persona.imagenHeaderGrupos     || null,
                    colorTextoCardGrupos:   persona.colorTextoCardGrupos   || null,
                    imagenFondoDraw:      persona.imagenFondoDraw       || null,
                    imagenFondoBracket:   persona.imagenFondoBracket    || null,
                    estiloCard:           persona.estiloCard,
                    colorCard:            persona.colorCard             || null,
                    fontScale:            persona.fontScale,
                    sponsors:             persona.sponsors,
                    sponsorScale:         persona.sponsorScale,
                    bannerLateral1Fixture: persona.bannerLateral1Fixture || null,
                    bannerLateral2Fixture: persona.bannerLateral2Fixture || null,
                    bannerLateral1Grupos:  persona.bannerLateral1Grupos  || null,
                    bannerLateral2Grupos:  persona.bannerLateral2Grupos  || null,
                    drawMostrarClub:       persona.drawMostrarClub,
                    drawTitulo:            persona.drawTitulo            || null,
                    drawMostrarNombre:     persona.drawMostrarNombre,
                    drawMostrarFechas:     persona.drawMostrarFechas,
                    drawMostrarCategorias: persona.drawMostrarCategorias,
                    drawColorTitulo:       persona.drawColorTitulo       || null,
                    bracketColores:        persona.bracketColores,
                  })
                  setSavedOk(true)
                  setTimeout(() => setSavedOk(false), 2500)
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all"
              >
                Guardar personalización
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Modal resultado partido eliminatorio */}
      {modalResultado && (
        <ModalResultado
          partido={modalResultado}
          onClose={() => setModalResultado(null)}
          onGuardar={handleRegistrarResultado}
        />
      )}

      {/* Modal horario partido del bracket */}
      {modalHorario && (
        <ModalHorario
          partido={modalHorario}
          canchasActivas={canchasActivas}
          onClose={() => setModalHorario(null)}
          onGuardar={handleGuardarHorario}
        />
      )}

      {/* Modal agregar pareja (admin) */}
      {modalAgregarAdmin && (
        <ModalAgregarParejaAdmin
          torneo={torneo}
          onClose={() => setModalAgregarAdmin(false)}
          onConfirmar={handleAgregarAdmin}
        />
      )}

      {/* Modal editar disponibilidad */}
      {editando && (
        <ModalEditarDisponibilidad
          torneo={torneo}
          inscripto={editando}
          onClose={() => setEditando(null)}
          onGuardar={(id, changes) => updatePareja(torneo.id, id, changes)}
        />
      )}
    </div>
  )
}

export default TorneoDetallePage
