import { useState, useEffect, useRef, Fragment, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trophy, Medal, Users, Calendar, Zap, Trash2,
  ToggleLeft, ToggleRight, Lock, CheckCircle, Clock, Archive,
  AlertTriangle, Shuffle, CheckCheck, GitMerge, UserPlus, Plus, X, Pencil, Swords,
  Palette, ChevronDown, Maximize2, Minimize2, Share2, Upload, Search, Info, Flag,
} from 'lucide-react'
import Toast from '../components/ui/Toast'
import useTorneosStore from '../store/torneosStore'
import useAuthStore from '../store/authStore'
import { api, uploadImage } from '../lib/api'
import {
  generateEliminationBracket,
  generateAPAEliminationBracket,
  generateAPASkeletonBracket,
  mergeScheduleFromSkeleton,
  advanceWinner,
  isBracketFinished,
  getBracketWinner,
  generateGroupPhase,
  advanceGroupMatch,
  isGroupPhaseFinished,
  getAllClasificados,
  autoScheduleGroups,
  swapParejas,
  esSlotDeGrupos,
  calcularGanadorDesdeResultado,
  MAX_PAREJAS_POR_CATEGORIA,
} from '../services/torneoService'
import useClubStore from '../store/clubStore'
import BracketView, { BracketCard } from '../components/BracketView'
import { BRACKET_TEMPLATE_LIST } from '../components/BracketThemes'

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

// Devuelve "4° Categoría · Masc." cuando el torneo es Ambos, si no solo el nombre
const catLabel = (torneo, cat, short = false) => {
  if (torneo?.genero !== 'Ambos') return cat
  const gen = ((torneo.generoPorCategoria ?? {})[cat]) ?? 'M'
  const suffix = gen === 'F' ? (short ? 'Fem.' : 'Femenino') : gen === 'Mixto' ? 'Mixto' : (short ? 'Masc.' : 'Masculino')
  return `${cat} · ${suffix}`
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

const ZonaSetupCard = ({ zona, zonaIdx, swapSource, onSelectPair, canchaName, onAsignarManual }) => {
  const conflicto = hayConflictoEnZona(zona)
  const [pendingEditId, setPendingEditId] = useState(null)

  const conflictingIds = new Set()
  if (conflicto) {
    for (let i = 0; i < zona.parejas.length; i++)
      for (let j = i + 1; j < zona.parejas.length; j++)
        if (!tieneOverlap(zona.parejas[i], zona.parejas[j])) {
          conflictingIds.add(zona.parejas[i].id)
          conflictingIds.add(zona.parejas[j].id)
        }
  }

  const numPareja = (id) => zona.parejas.findIndex((p) => p.id === id) + 1

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
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

      {/* Parejas — solo nombres, clicables para swap */}
      <div className="divide-y divide-slate-50">
        {zona.parejas.map((pareja, parejaIdx) => {
          const isSelected  = swapSource?.zonaIdx === zonaIdx && swapSource?.parejaIdx === parejaIdx
          const isTarget    = swapSource && !isSelected
          const hasConflict = conflictingIds.has(pareja.id)
          return (
            <button
              key={pareja.id}
              onClick={() => onSelectPair(zonaIdx, parejaIdx)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-all ${
                isSelected ? 'bg-brand-50 border-l-4 border-brand-500' : isTarget ? 'hover:bg-amber-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                isSelected ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {parejaIdx + 1}
              </div>
              <span className={`text-xs flex-1 ${hasConflict ? 'text-amber-600' : 'text-slate-700'}`}>
                {pareja.jugador1} / {pareja.jugador2}
              </span>
              {hasConflict && <AlertTriangle size={10} className="text-amber-400 shrink-0" />}
              {isSelected && <span className="text-brand-500 text-[10px] font-semibold shrink-0">Seleccionada</span>}
              {isTarget && !isSelected && <Shuffle size={11} className="text-amber-400 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Partidos con horario asignado */}
      {zona.partidos?.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Partidos</p>
          {zona.partidos.map((p) => {
            const n1 = numPareja(p.pareja1?.id)
            const n2 = numPareja(p.pareja2?.id)
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium whitespace-nowrap">{n1} vs {n2}</span>
                {p.slot ? (
                  <button
                    onClick={() => conflicto ? onAsignarManual?.(zonaIdx, p.id) : setPendingEditId(p.id)}
                    className="text-brand-600 font-medium hover:text-brand-700 hover:underline transition-colors text-left">
                    {p.slot.dia} · {p.slot.hora}
                    {p.cancha && canchaName && <span className="text-slate-400 font-normal"> · {canchaName(p.cancha)}</span>}
                  </button>
                ) : p.sinHorario ? (
                  <button onClick={() => onAsignarManual?.(zonaIdx, p.id)}
                    className="text-amber-500 flex items-center gap-1 hover:text-amber-600 hover:underline transition-colors">
                    <AlertTriangle size={10} /> Sin horario
                  </button>
                ) : (
                  <button onClick={() => onAsignarManual?.(zonaIdx, p.id)}
                    className="text-slate-300 italic hover:text-slate-400 hover:underline transition-colors">
                    Sin asignar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmación antes de editar zona sin problemas */}
      {pendingEditId && (
        <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-emerald-700 font-medium">Esta zona está bien asignada. ¿Querés modificar igualmente?</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { onAsignarManual?.(zonaIdx, pendingEditId); setPendingEditId(null) }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors">Sí</button>
            <button onClick={() => setPendingEditId(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">No</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal asignación manual de horario ────────────────────────────────────────

const getDiasEnRango = (fechaInicio, fechaFin) => {
  if (!fechaInicio || !fechaFin) return DIAS_SEMANA
  const DIAS_MAP  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  // Parsear en hora local para evitar el desfase UTC que desplaza un día en Argentina
  const parseLocal = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
  const dias = new Set()
  const end  = parseLocal(fechaFin)
  const cur  = parseLocal(fechaInicio)
  while (cur <= end) { dias.add(DIAS_MAP[cur.getDay()]); cur.setDate(cur.getDate() + 1) }
  return DIAS_SEMANA.filter((d) => dias.has(d))
}

const ModalAsignarManual = ({ partido, grupos, canchas, diaElim, horaElim, fechaInicio, fechaFin, intervaloMin, onConfirm, onClose }) => {
  const p1      = partido.pareja1
  const p2      = partido.pareja2
  const p1Slots = p1?.disponibilidad ?? []
  const p2Slots = p2?.disponibilidad ?? []

  const toM = (t = '08:00') => { const [h, m = 0] = t.split(':').map(Number); return h * 60 + m }
  const toT = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  const diasOverlap = [...new Set(
    p1Slots.filter((s1) => p2Slots.some((s2) => s2.dia === s1.dia)).map((s) => s.dia)
  )].filter((d) => esSlotDeGrupos(d, '00:00', diaElim, horaElim))

  const diasValidos = getDiasEnRango(fechaInicio, fechaFin)
    .filter((d) => esSlotDeGrupos(d, '00:00', diaElim, horaElim))
  const activas = canchas.filter((c) => c.activa)

  // Calcula slots libres para un día: respeta disponibilidad, conflictos de cancha y de pareja
  const getSlotsParaDia = (d) => {
    const m1 = toM(p1Slots.find((s) => s.dia === d)?.horaDesde)
    const m2 = toM(p2Slots.find((s) => s.dia === d)?.horaDesde)
    const inicioMin = Math.max(m1, m2)

    const canchaOcc = new Map()
    const parejaOcc = new Map()
    for (const zona of (grupos ?? [])) {
      for (const p of zona.partidos) {
        if (!p.slot || p.id === partido.id || p.slot.dia !== d) continue
        const sm = toM(p.slot.hora)
        if (p.cancha) {
          if (!canchaOcc.has(p.cancha)) canchaOcc.set(p.cancha, [])
          canchaOcc.get(p.cancha).push(sm)
        }
        for (const par of [p.pareja1, p.pareja2]) {
          if (!par?.id) continue
          if (!parejaOcc.has(par.id)) parejaOcc.set(par.id, [])
          parejaOcc.get(par.id).push(sm)
        }
      }
    }

    const result = []
    for (let m = inicioMin; m <= 22 * 60; m += 15) {
      if (!esSlotDeGrupos(d, toT(m), diaElim, horaElim)) break
      const p1Busy = (parejaOcc.get(p1?.id) ?? []).some((sm) => Math.abs(sm - m) < intervaloMin)
      const p2Busy = (parejaOcc.get(p2?.id) ?? []).some((sm) => Math.abs(sm - m) < intervaloMin)
      if (p1Busy || p2Busy) continue
      const libres = activas.filter((c) => !(canchaOcc.get(c.id) ?? []).some((sm) => Math.abs(sm - m) < intervaloMin))
      if (libres.length > 0) {
        result.push({ hora: toT(m), canchas: libres })
        if (result.length >= 8) break
      }
    }
    return result
  }

  const slotExistente = partido.slot ? partido : null
  const primerDia = diasOverlap[0] ?? diasValidos[0] ?? ''
  const primerSlots = primerDia ? getSlotsParaDia(primerDia) : []
  const sinAlternativas = diasValidos.every((d) => getSlotsParaDia(d).length === 0)

  const [dia,      setDia]      = useState(primerDia)
  const [horaSelec, setHoraSelec] = useState(primerSlots[0]?.hora ?? '')
  const [canchaId,  setCanchaId]  = useState(primerSlots[0]?.canchas[0]?.id ?? '')

  const slotsDelDia  = dia ? getSlotsParaDia(dia) : []
  const slotActual   = slotsDelDia.find((s) => s.hora === horaSelec)
  const canchasSlot  = slotActual?.canchas ?? []

  const handleDia = (d) => {
    const slots = getSlotsParaDia(d)
    setDia(d)
    setHoraSelec(slots[0]?.hora ?? '')
    setCanchaId(slots[0]?.canchas[0]?.id ?? '')
  }

  const handleSlot = (slot) => {
    setHoraSelec(slot.hora)
    setCanchaId(slot.canchas[0]?.id ?? '')
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">Asignar horario</p>
            {[{ pair: p1, slots: p1Slots }, { pair: p2, slots: p2Slots }].map(({ pair, slots }, idx) => (
              <div key={idx} className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-500 shrink-0">{pair?.jugador1} / {pair?.jugador2}:</span>
                <span className="text-xs text-slate-400">
                  {slots.length > 0 ? slots.map((s) => `${s.dia.slice(0,3)} ${s.horaDesde}`).join(' · ') : 'Sin disponibilidad'}
                </span>
              </div>
            ))}
            {diasOverlap.length === 0 && p1Slots.length > 0 && p2Slots.length > 0 && (
              <p className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> Sin días en común — coordiná con los jugadores
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"><X size={16} /></button>
        </div>

        {/* Banner horario actual */}
        {slotExistente && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-[11px] text-brand-600 font-medium">Asignado actualmente:</span>
            <span className="text-[11px] text-brand-700 font-bold">{partido.slot.dia} {partido.slot.hora}</span>
            {partido.cancha && activas.find((c) => c.id === partido.cancha) && (
              <span className="text-[11px] text-slate-400">· {activas.find((c) => c.id === partido.cancha)?.nombre}</span>
            )}
          </div>
        )}

        {/* Sin alternativas */}
        {sinAlternativas && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Todos los horarios disponibles ya están ocupados. Para liberar un slot, revisá las otras zonas.</p>
          </div>
        )}

        {/* Paso 1 — Día */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">1. Elegí el día</p>
          <div className="flex flex-wrap gap-2">
            {diasValidos.map((d) => {
              const hasOverlap = diasOverlap.includes(d)
              const selected   = dia === d
              return (
                <button key={d} onClick={() => handleDia(d)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selected ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : hasOverlap ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {d.slice(0, 3)}{hasOverlap && !selected && <span className="ml-1">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Paso 2 — Horario disponible */}
        {dia && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">2. Horario disponible</p>
            {slotsDelDia.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slotsDelDia.map((slot) => (
                  <button key={slot.hora} onClick={() => handleSlot(slot)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      horaSelec === slot.hora
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}>
                    {slot.hora}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle size={11} /> Sin horarios libres este día — probá otro
              </p>
            )}
          </div>
        )}

        {/* Paso 3 — Cancha */}
        {horaSelec && canchasSlot.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">3. Cancha</p>
            <div className="flex gap-2 flex-wrap">
              {canchasSlot.map((c) => (
                <button key={c.id} onClick={() => setCanchaId(c.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    canchaId === c.id
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => dia && horaSelec && canchaId && onConfirm(dia, horaSelec, canchaId)}
          disabled={!dia || !horaSelec || !canchaId}
          className="w-full py-3 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-brand-500/20">
          Confirmar horario
        </button>
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

// Tabla de posiciones enriquecida (tema claro — admin)
const StandingsZonaAdmin = ({ zona, puntosPorVictoria = 2 }) => {
  const [openCrit, setOpenCrit] = useState(null)
  if (!zona?.parejas?.length || zona.capacidad === 4) return null

  // ── Stats ──────────────────────────────────────────────────────────────────
  const s = {}
  zona.parejas.forEach((p) => {
    s[p.id] = { pts: 0, pj: 0, wins: 0, losses: 0, setsA: 0, setsC: 0, gamesA: 0, gamesC: 0 }
  })
  zona.partidos.forEach((m) => {
    if (m.estado !== 'finalizado' || !m.pareja1 || !m.pareja2) return
    s[m.pareja1.id].pj++
    s[m.pareja2.id].pj++
    if (m.ganador) {
      s[m.ganador.id].wins++
      s[m.ganador.id].pts += puntosPorVictoria
      const loserId = m.ganador.id === m.pareja1.id ? m.pareja2.id : m.pareja1.id
      if (s[loserId]) s[loserId].losses++
    }
    ;(m.resultado ?? []).forEach((set) => {
      s[m.pareja1.id].setsA  += set.p1 > set.p2 ? 1 : 0
      s[m.pareja1.id].setsC  += set.p1 < set.p2 ? 1 : 0
      s[m.pareja2.id].setsA  += set.p2 > set.p1 ? 1 : 0
      s[m.pareja2.id].setsC  += set.p2 < set.p1 ? 1 : 0
      s[m.pareja1.id].gamesA += set.p1
      s[m.pareja1.id].gamesC += set.p2
      s[m.pareja2.id].gamesA += set.p2
      s[m.pareja2.id].gamesC += set.p1
    })
  })

  const sorted = [...zona.parejas].sort((a, b) => {
    const sa = s[a.id], sb = s[b.id]
    if (sb.pts !== sa.pts) return sb.pts - sa.pts
    const dsA = sa.setsA - sa.setsC, dsB = sb.setsA - sb.setsC
    if (dsB !== dsA) return dsB - dsA
    return (sb.gamesA - sb.gamesC) - (sa.gamesA - sa.gamesC)
  })

  // ── Criterio de clasificación (vs pareja directamente arriba) ────────────
  const getCriterio = (i) => {
    if (i === 0 || sorted.length < 2) return null
    const sa = s[sorted[i].id], sb = s[sorted[i - 1].id]
    if (sa.pts !== sb.pts) return 'Pts'
    if ((sa.setsA - sa.setsC) !== (sb.setsA - sb.setsC)) return 'Dif.S'
    if ((sa.gamesA - sa.gamesC) !== (sb.gamesA - sb.gamesC)) return 'Dif.G'
    return '='
  }

  const fmt    = (n) => n > 0 ? `+${n}` : `${n}`
  const nameOf = (p) => `${p.jugador1.split(' ')[0]} / ${p.jugador2.split(' ')[0]}`

  const getExplicacion = (i) => {
    if (i === 0) return 'Primera posición de la zona.'
    const sa = s[sorted[i].id], sb = s[sorted[i - 1].id]
    const criterio = getCriterio(i)
    const arriba = nameOf(sorted[i - 1])
    if (criterio === 'Pts')
      return `${arriba} tiene ${sb.pts} pts · esta pareja tiene ${sa.pts} pts.`
    if (criterio === 'Dif.S') {
      const dsA = sb.setsA - sb.setsC, dsB = sa.setsA - sa.setsC
      return `Mismos puntos (${sa.pts} pts). ${arriba}: ${fmt(dsA)} dif. sets · esta pareja: ${fmt(dsB)}.`
    }
    if (criterio === 'Dif.G') {
      const dgA = sb.gamesA - sb.gamesC, dgB = sa.gamesA - sa.gamesC
      return `Mismos pts y dif. de sets. ${arriba}: ${fmt(dgA)} games · esta pareja: ${fmt(dgB)}.`
    }
    return `Igualados en todos los criterios con ${arriba}. El admin define el orden de desempate.`
  }

  const handleCritClick = (e, i) => {
    if (openCrit?.i === i) { setOpenCrit(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setOpenCrit({ i, rect })
  }

  // ── Grilla cruzada ─────────────────────────────────────────────────────────
  const getCell = (rowId, colId) => {
    if (rowId === colId) return 'self'
    const m = zona.partidos.find((p) =>
      (p.pareja1?.id === rowId && p.pareja2?.id === colId) ||
      (p.pareja1?.id === colId && p.pareja2?.id === rowId)
    )
    if (!m || m.estado !== 'finalizado') return null
    const rowIsP1 = m.pareja1?.id === rowId
    const won     = m.ganador?.id === rowId
    const sets    = (m.resultado ?? []).map((r) => rowIsP1 ? `${r.p1}-${r.p2}` : `${r.p2}-${r.p1}`)
    return { won, sets }
  }

  const hayResultados = zona.partidos.some((m) => m.estado === 'finalizado')

  return (
    <div className="flex flex-col gap-3">

      {/* ── Popover criterio ─────────────────────────────────────────────────── */}
      {openCrit !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenCrit(null)} />
          <div
            className="fixed z-50 w-56 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xl"
            style={{
              top: (openCrit.rect.top ?? 0) - 10,
              transform: 'translateY(-100%)',
              left: Math.max(8, (openCrit.rect.right ?? 0) - 224),
            }}
          >
            <p className="text-[11px] text-slate-600 leading-relaxed">{getExplicacion(openCrit.i)}</p>
            <div className="absolute top-full" style={{ right: Math.min(224 - 16, (window.innerWidth - (openCrit.rect.right ?? 0)) + (openCrit.rect.width ?? 0) / 2 - 4) }}>
              <div className="border-4 border-transparent border-t-slate-200" />
            </div>
          </div>
        </>
      )}

      {/* ── Tabla de posiciones ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2 text-left text-slate-400 font-semibold w-10">Pos.</th>
              <th className="px-3 py-2 text-left text-slate-400 font-semibold">Pareja</th>
              <th className="px-3 py-2 text-center text-brand-500 font-bold w-10" title="Puntos">Pts</th>
              <th className="px-3 py-2 text-center text-slate-400 font-semibold w-10">PG</th>
              <th className="px-3 py-2 text-center text-slate-400 font-semibold w-10">PP</th>
              <th className="px-3 py-2 text-center text-slate-400 font-semibold w-13" title="Diferencia de sets">Dif.S</th>
              <th className="px-3 py-2 text-center text-slate-400 font-semibold w-13" title="Diferencia de games">Dif.G</th>
              <th className="px-3 py-2 text-center text-slate-400 font-semibold w-14" title="Criterio de clasificación">Crit.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pareja, i) => {
              const st        = s[pareja.id]
              const esC1      = zona.clasificados?.[0]?.id === pareja.id
              const esC2      = zona.clasificados?.[1]?.id === pareja.id
              const eliminado = zona.clasificados && !esC1 && !esC2
              const difSets   = st.setsA - st.setsC
              const difGames  = st.gamesA - st.gamesC
              const criterio  = getCriterio(i)
              const critCls   = criterio === 'Pts'   ? 'text-brand-600 bg-brand-50 border-brand-200'
                              : criterio === 'Dif.S' ? 'text-sky-600 bg-sky-50 border-sky-200'
                              : criterio === 'Dif.G' ? 'text-violet-600 bg-violet-50 border-violet-200'
                              : criterio === '='     ? 'text-amber-600 bg-amber-50 border-amber-200'
                              : ''
              return (
                <tr key={pareja.id} className={`border-b border-slate-50 last:border-0 ${esC1 ? 'bg-amber-50/60' : esC2 ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-3 py-2 font-bold text-slate-300">{i + 1}°</td>
                  <td className="px-3 py-2 max-w-0">
                    <div className="flex items-center gap-1.5">
                      {(esC1 || esC2) && zona.clasificados && (
                        <span className={`w-1 h-3.5 rounded-full shrink-0 ${esC1 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                      )}
                      <span className={`font-medium truncate ${eliminado ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                        {pareja.jugador1} / {pareja.jugador2}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-brand-600">{st.pts}</td>
                  <td className="px-3 py-2 text-center font-semibold text-emerald-600">{st.wins}</td>
                  <td className="px-3 py-2 text-center text-slate-400">{st.losses}</td>
                  <td className={`px-3 py-2 text-center font-semibold tabular-nums ${
                    difSets  > 0 ? 'text-emerald-600' : difSets  < 0 ? 'text-red-400' : 'text-slate-300'
                  }`}>{difSets  > 0 ? `+${difSets}`  : difSets}</td>
                  <td className={`px-3 py-2 text-center font-semibold tabular-nums ${
                    difGames > 0 ? 'text-sky-500'    : difGames < 0 ? 'text-red-400' : 'text-slate-300'
                  }`}>{difGames > 0 ? `+${difGames}` : difGames}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={(e) => handleCritClick(e, i)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-opacity hover:opacity-70 ${
                        criterio ? critCls : 'text-slate-200 border-transparent bg-transparent cursor-default'
                      }`}
                    >
                      {criterio ?? '—'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Grilla de enfrentamientos ─────────────────────────────────────────── */}
      {hayResultados && (
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Enfrentamientos</span>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="px-3 py-1.5 text-left text-slate-400 font-semibold" style={{ width: '38%' }}>Pareja</th>
                {sorted.map((p, i) => (
                  <th key={p.id} className="py-1.5 text-center text-slate-400 font-bold">P{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((rowPar, rowIdx) => (
                <tr key={rowPar.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                        {rowIdx + 1}
                      </span>
                      <span className="truncate font-medium text-slate-600">
                        {rowPar.jugador1.split(' ')[0]}
                      </span>
                    </div>
                  </td>
                  {sorted.map((colPar) => {
                    const cell = getCell(rowPar.id, colPar.id)
                    if (cell === 'self') return (
                      <td key={colPar.id} className="py-2 text-center">
                        <span className="text-slate-200 font-bold">×</span>
                      </td>
                    )
                    if (!cell) return (
                      <td key={colPar.id} className="py-2 text-center">
                        <span className="text-slate-300 text-[12px]">·</span>
                      </td>
                    )
                    return (
                      <td key={colPar.id} className="py-1.5 text-center">
                        {cell.sets.length > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {cell.sets.map((set, si) => (
                              <span key={si} className={`font-mono font-semibold leading-none text-[9px] ${
                                cell.won ? 'text-emerald-600' : 'text-red-400'
                              }`}>{set}</span>
                            ))}
                          </div>
                        ) : (
                          <span className={`font-bold text-[11px] ${cell.won ? 'text-emerald-600' : 'text-red-400'}`}>
                            {cell.won ? 'G' : 'P'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
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

const ZonaDetailModal = ({ zona, zonaIdx, onClose, onResultado, onResolveTie, canchaName, puntosPorVictoria = 2 }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2.5 bg-white border-b border-slate-100">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ZonaTable zona={zona} zonaIdx={zonaIdx} onResultado={onResultado} onResolveTie={onResolveTie} canchaName={canchaName} puntosPorVictoria={puntosPorVictoria} />
      </div>
    </div>
  </div>
)

const ZonaTable = ({ zona, zonaIdx, onResultado, onResolveTie, canchaName, puntosPorVictoria = 2 }) => {
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

      {/* Posiciones */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Posiciones</p>
        <StandingsZonaAdmin zona={zona} puntosPorVictoria={puntosPorVictoria} />
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
  const diaAbrev = (dia) => dia ?? '?'

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
            {ins.sinCompanero && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                ⚠ Sin compañero/a
              </span>
            )}
          </div>
          {ins.sinCompanero ? (
            <span className="text-[10px] text-orange-400 italic mt-0.5">Horario pendiente</span>
          ) : slots.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {slots.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">
                  {diaAbrev(s.dia)} {s.horaDesde}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
              Sin disponibilidad
            </span>
          )}
        </div>
        {!confirmando && (
          <div className="flex items-center gap-0.5 shrink-0">
            {estadoTorneo === 'open' && (
              <button onClick={() => onEditar(ins)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-brand-500 rounded-lg hover:bg-brand-50 transition-colors">
                <Pencil size={15} />
              </button>
            )}
            {(estadoTorneo === 'open' || estadoTorneo === 'closed') && (
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
          {(estadoTorneo === 'open' || estadoTorneo === 'closed') && !confirmando && (
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
        {ins.sinCompanero && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded self-start">
            ⚠ Sin compañero/a
          </span>
        )}
        {ins.sinCompanero ? (
          <span className="text-[9px] text-orange-400 italic">Horario pendiente</span>
        ) : slots.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {slots.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-[9px] font-medium text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">
                {diaAbrev(s.dia)} {s.horaDesde}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[9px] font-medium text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded self-start">
            Sin disponibilidad
          </span>
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

const EsperaCard = ({ ins, estadoTorneo, cupoLleno, onPromover, onBaja }) => {
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
            <div className="relative group">
              <button
                onClick={cupoLleno ? undefined : onPromover}
                disabled={cupoLleno}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${cupoLleno ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
              >
                Promover
              </button>
              {cupoLleno && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 leading-snug pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 text-center">
                  Cupo lleno. Ampliá el cupo del torneo antes de promover.
                </div>
              )}
            </div>
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
            <div className="relative group">
              <button
                onClick={cupoLleno ? undefined : onPromover}
                disabled={cupoLleno}
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${cupoLleno ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
              >
                Promover
              </button>
              {cupoLleno && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 leading-snug pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 text-center">
                  Cupo lleno. Ampliá el cupo antes de promover.
                </div>
              )}
            </div>
          )}
          {(estadoTorneo === 'open' || estadoTorneo === 'closed') && !confirmando && (
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

// Mini preview: thumbnail si hay imagen, diagrama si no
const ImageZonePreview = ({ src, children }) =>
  src ? (
    <div className="relative w-full max-w-[160px] h-16 rounded-lg overflow-hidden mb-2 border border-slate-200">
      <img src={src} alt="" className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className="w-full max-w-[160px] h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50 overflow-hidden mb-2">
      {children}
    </div>
  )

const ImagenFileInput = ({ value, onChange, onImageLoad, hint, className = '', profile = 'fondo', folder = 'torneos' }) => {
  const ref = useRef(null)
  const token = useAuthStore((s) => s.token)
  const [uploading, setUploading] = useState(false)
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      // Sube a Storage → guarda la URL pública (no base64 en la DB)
      const url = await uploadImage(file, { profile, folder, token })
      onChange(url)
      onImageLoad?.(url)
    } catch (err) {
      console.error('Error al subir imagen:', err)
      alert('No se pudo subir la imagen. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {value && (
          <img src={value} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
        )}
        <button
          type="button"
          disabled={uploading}
          onClick={() => ref.current.click()}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value && !uploading && (
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

  const accentColor = torneo.bracketColores?.[selectedCat]  || torneo.colorAcento   || club?.colorPrimario || '#10b981'
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
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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

// ── Modal búsqueda avanzada de jugadores ──────────────────────────────────────

const ModalBusquedaJugadores = ({ onSelect, onClose, token }) => {
  const [todos, setTodos]               = useState([])
  const [cargando, setCargando]         = useState(true)
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroApellido, setFiltroApellido] = useState('')
  const [filtroCuenta, setFiltroCuenta] = useState('todos')
  const inputRef = useRef(null)
  const authH = token ? { Authorization: `Bearer ${token}` } : {}

  useEffect(() => {
    api.get('/jugadores', authH)
      .then((res) => setTodos(Array.isArray(res) ? res : []))
      .catch(() => setTodos([]))
      .finally(() => { setCargando(false); setTimeout(() => inputRef.current?.focus(), 50) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const filtrados = todos.filter((j) => {
    const matchNombre   = j.nombre?.toLowerCase().includes(filtroNombre.toLowerCase().trim())
    const matchApellido = j.apellido?.toLowerCase().includes(filtroApellido.toLowerCase().trim())
    const matchCuenta   = filtroCuenta === 'todos' ? true : filtroCuenta === 'con' ? j.cuentaActiva : !j.cuentaActiva
    return matchNombre && matchApellido && matchCuenta
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Buscar jugador</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Nombre..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all placeholder:text-slate-300"
            />
            <input
              type="text"
              placeholder="Apellido..."
              value={filtroApellido}
              onChange={(e) => setFiltroApellido(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            {[['todos','Todos'],['con','Con cuenta'],['sin','Sin cuenta']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setFiltroCuenta(val)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  filtroCuenta === val ? 'bg-brand-500 text-white border-brand-500' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-400">{filtrados.length} jugador{filtrados.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {cargando && (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Cargando jugadores...</span>
            </div>
          )}
          {!cargando && filtrados.length === 0 && (
            <p className="text-center text-slate-400 text-xs py-10">Sin coincidencias</p>
          )}
          {!cargando && filtrados.map((j) => (
            <button key={j.id} type="button"
              onClick={() => { onSelect(j); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors text-left border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</p>
                {j.dni && <p className="text-xs text-slate-400">DNI {j.dni}</p>}
              </div>
              {!j.cuentaActiva && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0 ml-2">Sin cuenta</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal agregar pareja (admin — carga manual) ───────────────────────────────

const ModalAgregarParejaAdmin = ({ torneo, onClose, onConfirmar, token, horasDisponibles: horasProp }) => {
  const clubColor = useClubStore((s) => s.club?.colorPrimario) || 'var(--club-primary)'
  const horasDisponibles = horasProp ?? HORAS_DISPONIBLES
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
  const [dniErrors, setDniErrors]               = useState({ j1: '', j2: '' })
  const [nameErrors, setNameErrors]             = useState({ j1: '', j2: '' })
  const [sinCompanero, setSinCompanero]         = useState(false)
  const [modalBusquedaPara, setModalBusquedaPara] = useState(null) // null | 'j1' | 'j2'
  const [sugerenciasJ1, setSugerenciasJ1] = useState([])
  const [sugerenciasJ2, setSugerenciasJ2] = useState([])
  const [buscandoNombreJ1, setBuscandoNombreJ1] = useState(false)
  const [buscandoNombreJ2, setBuscandoNombreJ2] = useState(false)

  const LOOKUP_INIT = { estado: 'idle', jugador: null }
  const ALTA_INIT   = { activa: false, nombre: '', apellido: '', errores: {}, guardando: false }
  const [lookupJ1, setLookupJ1] = useState(LOOKUP_INIT)
  const [lookupJ2, setLookupJ2] = useState(LOOKUP_INIT)
  const [altaJ1,   setAltaJ1]  = useState(ALTA_INIT)
  const [altaJ2,   setAltaJ2]  = useState(ALTA_INIT)
  const authH = token ? { Authorization: `Bearer ${token}` } : {}

  useEffect(() => {
    if (lookupJ1.estado === 'encontrado') return
    const t = setTimeout(async () => {
      if (!/^\d{7,8}$/.test(jugador1Dni)) { setLookupJ1(LOOKUP_INIT); return }
      setLookupJ1({ estado: 'buscando', jugador: null })
      try {
        const res = await api.get(`/jugadores/buscar?q=${jugador1Dni}`, authH)
        const exacto = Array.isArray(res) ? res.find((j) => j.dni === jugador1Dni) : null
        if (exacto) {
          setLookupJ1({ estado: 'encontrado', jugador: exacto })
          setJugador1(`${exacto.nombre} ${exacto.apellido}`)
          setAltaJ1(ALTA_INIT)
          setNameErrors((p) => ({ ...p, j1: '' }))
        } else {
          setLookupJ1({ estado: 'no_encontrado', jugador: null })
        }
      } catch { setLookupJ1(LOOKUP_INIT) }
    }, 400)
    return () => clearTimeout(t)
  }, [jugador1Dni]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sinCompanero || lookupJ2.estado === 'encontrado') return
    const t = setTimeout(async () => {
      if (!/^\d{7,8}$/.test(jugador2Dni)) { setLookupJ2(LOOKUP_INIT); return }
      setLookupJ2({ estado: 'buscando', jugador: null })
      try {
        const res = await api.get(`/jugadores/buscar?q=${jugador2Dni}`, authH)
        const exacto = Array.isArray(res) ? res.find((j) => j.dni === jugador2Dni) : null
        if (exacto) {
          setLookupJ2({ estado: 'encontrado', jugador: exacto })
          setJugador2(`${exacto.nombre} ${exacto.apellido}`)
          setAltaJ2(ALTA_INIT)
          setNameErrors((p) => ({ ...p, j2: '' }))
        } else {
          setLookupJ2({ estado: 'no_encontrado', jugador: null })
        }
      } catch { setLookupJ2(LOOKUP_INIT) }
    }, 400)
    return () => clearTimeout(t)
  }, [jugador2Dni, sinCompanero]) // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda por nombre J1
  useEffect(() => {
    if (lookupJ1.estado === 'encontrado') { setSugerenciasJ1([]); return }
    if (jugador1.trim().length < 2) { setSugerenciasJ1([]); return }
    const t = setTimeout(async () => {
      setBuscandoNombreJ1(true)
      try {
        const res = await api.get(`/jugadores/buscar?q=${encodeURIComponent(jugador1.trim())}`, authH)
        setSugerenciasJ1(Array.isArray(res) ? res.slice(0, 6) : [])
      } catch { setSugerenciasJ1([]) }
      finally { setBuscandoNombreJ1(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [jugador1]) // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda por nombre J2
  useEffect(() => {
    if (sinCompanero || lookupJ2.estado === 'encontrado') { setSugerenciasJ2([]); return }
    if (jugador2.trim().length < 2) { setSugerenciasJ2([]); return }
    const t = setTimeout(async () => {
      setBuscandoNombreJ2(true)
      try {
        const res = await api.get(`/jugadores/buscar?q=${encodeURIComponent(jugador2.trim())}`, authH)
        setSugerenciasJ2(Array.isArray(res) ? res.slice(0, 6) : [])
      } catch { setSugerenciasJ2([]) }
      finally { setBuscandoNombreJ2(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [jugador2, sinCompanero]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAltaJugador = async (who) => {
    const alta      = who === 1 ? altaJ1    : altaJ2
    const setAlta   = who === 1 ? setAltaJ1  : setAltaJ2
    const setLookup = who === 1 ? setLookupJ1 : setLookupJ2
    const setNombre = who === 1 ? setJugador1 : setJugador2
    const dni       = who === 1 ? jugador1Dni : jugador2Dni
    const errs = {}
    if (!alta.nombre.trim())             errs.nombre   = 'Requerido'
    else if (/\d/.test(alta.nombre))     errs.nombre   = 'Solo letras'
    if (!alta.apellido.trim())           errs.apellido = 'Requerido'
    else if (/\d/.test(alta.apellido))   errs.apellido = 'Solo letras'
    if (Object.keys(errs).length) { setAlta((p) => ({ ...p, errores: errs })); return }
    setAlta((p) => ({ ...p, guardando: true }))
    try {
      const nuevo = await api.post('/jugadores', { nombre: alta.nombre.trim(), apellido: alta.apellido.trim(), dni }, authH)
      setLookup({ estado: 'encontrado', jugador: nuevo })
      setNombre(`${nuevo.nombre} ${nuevo.apellido}`)
      setAlta(ALTA_INIT)
    } catch (err) {
      setAlta((p) => ({ ...p, guardando: false, errores: { general: err.message || 'Error al dar de alta' } }))
    }
  }

  const soloUnDia = [...new Set(slots.map((s) => s.dia))].length <= 1
  useEffect(() => { if (!soloUnDia) setPrefiereMismoDia(false) }, [soloUnDia])

  const diaCorte     = torneo.diaInicioEliminatoria  ?? null
  const horaCorte    = torneo.horaInicioEliminatoria ?? null
  const diasValidos  = getDiasValidos(torneo.fechaInicio, torneo.fechaFin)
    .filter((dia) => esSlotDeGrupos(dia, '00:00', diaCorte, horaCorte))
  const horasParaDia = (dia) =>
    horasDisponibles.filter((h) => esSlotDeGrupos(dia, h, diaCorte, horaCorte))

  const diasLibres = diasValidos.filter((d) => !slots.some((s) => s.dia === d))

  // Si el día seleccionado ya fue agregado, mover al primer día libre
  useEffect(() => {
    if (!diasLibres.includes(diaSelec)) {
      const primerLibre = diasLibres[0] ?? ''
      setDiaSelec(primerLibre)
      setHoraSelec(primerLibre ? (horasParaDia(primerLibre)[0] ?? '') : '')
    }
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validación de cupo
  const cupoCategoria      = torneo.cupoLibre ? null : (torneo.cuposPorCategoria?.[categoria] ?? null)
  const cupoEsperaCategoria = torneo.cupoLibre ? null : (torneo.cupoEsperaPorCategoria?.[categoria] ?? 0)
  const inscriptosEnCat    = torneo.inscriptos.filter((i) => i.categoria === categoria && i.estado !== 'espera').length
  const enEsperaEnCat      = torneo.inscriptos.filter((i) => i.categoria === categoria && i.estado === 'espera').length
  const cupoInscriptosLleno = cupoCategoria !== null && inscriptosEnCat >= cupoCategoria
  const iraAEspera         = cupoInscriptosLleno && cupoEsperaCategoria > 0 && enEsperaEnCat < cupoEsperaCategoria
  const cupoTotalLleno     = cupoInscriptosLleno && (!cupoEsperaCategoria || enEsperaEnCat >= cupoEsperaCategoria)

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
    if (cupoTotalLleno) return
    const newNameErrors = { j1: '', j2: '' }
    if (!jugador1.trim()) newNameErrors.j1 = 'Requerido'
    if (!sinCompanero && !jugador2.trim()) newNameErrors.j2 = 'Requerido'
    if (newNameErrors.j1 || newNameErrors.j2) { setNameErrors(newNameErrors); return }
    setNameErrors({ j1: '', j2: '' })
    const newDniErrors = { j1: '', j2: '' }
    if (!jugador1Dni.trim())                           newDniErrors.j1 = 'Requerido'
    else if (!/^\d{7,8}$/.test(jugador1Dni.trim()))   newDniErrors.j1 = 'Entre 7 y 8 números'
    if (!sinCompanero) {
      if (!jugador2Dni.trim())                           newDniErrors.j2 = 'Requerido'
      else if (!/^\d{7,8}$/.test(jugador2Dni.trim()))   newDniErrors.j2 = 'Entre 7 y 8 números'
    }
    if (newDniErrors.j1 || newDniErrors.j2) { setDniErrors(newDniErrors); return }
    // Validar que ambos jugadores estén registrados en el sistema
    if (lookupJ1.estado === 'no_encontrado') {
      setDniErrors((p) => ({ ...p, j1: 'Debe estar dado de alta antes de continuar' }))
      return
    }
    if (!sinCompanero && lookupJ2.estado === 'no_encontrado') {
      setDniErrors((p) => ({ ...p, j2: 'Debe estar dado de alta antes de continuar' }))
      return
    }
    setDniErrors({ j1: '', j2: '' })
    setSlotError('')
    onConfirmar({
      jugador1: jugador1.trim(),
      jugador1Dni: jugador1Dni.trim(),
      jugador2: sinCompanero ? 'Por definir' : jugador2.trim(),
      jugador2Dni: sinCompanero ? '' : jugador2Dni.trim(),
      categoria,
      disponibilidad: slots,
      prefiereMismoDia,
      sinCompanero,
      fecha: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
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

          {/* Toggle sin compañero */}
          <button
            type="button"
            onClick={() => setSinCompanero((v) => !v)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left w-full ${
              sinCompanero
                ? 'border-amber-300/40 bg-amber-50/60'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
              sinCompanero ? 'bg-amber-400 border-amber-400' : 'border-slate-300 bg-white'
            }`}>
              {sinCompanero && (
                <svg viewBox="0 0 10 8" className="w-2 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
            <span className={`text-[11px] font-medium leading-snug ${sinCompanero ? 'text-amber-700' : 'text-slate-500'}`}>
              Sin compañero/a aún · reservar cupo
            </span>
          </button>

          {/* Jugadores — grilla 2x2: nombre | DNI para cada uno */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            {/* Nombre J1 */}
            <div className="min-w-0">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 1</label>
              {lookupJ1.estado === 'encontrado' ? (
                <div className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 rounded-xl px-2.5 py-2 min-h-[42px]">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-emerald-800 block truncate">{jugador1}</span>
                    {lookupJ1.jugador && !lookupJ1.jugador.cuentaActiva && (
                      <span className="text-[9px] text-amber-600 font-semibold leading-tight">Sin cuenta</span>
                    )}
                  </div>
                  <button type="button" onClick={() => { setLookupJ1(LOOKUP_INIT); setJugador1('') }} className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 relative min-w-0">
                    <input
                      type="text"
                      placeholder="Nombre y apellido"
                      value={jugador1}
                      onChange={(e) => {
                        const raw = e.target.value
                        setJugador1(raw.replace(/[0-9]/g, ''))
                        setNameErrors((p) => ({ ...p, j1: /[0-9]/.test(raw) ? 'Solo letras permitidas' : '' }))
                        setSugerenciasJ1([])
                      }}
                      className={`flex-1 min-w-0 border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${nameErrors.j1 ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    {buscandoNombreJ1 && <div className="absolute right-10 top-2.5 w-3 h-3 border-2 border-slate-200 border-t-brand-400 rounded-full animate-spin" />}
                    <button type="button" onClick={() => setModalBusquedaPara('j1')}
                      className="shrink-0 px-2 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all">
                      <Search size={12} />
                    </button>
                    {sugerenciasJ1.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-8 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {sugerenciasJ1.map((j) => (
                          <button key={j.id} type="button"
                            onClick={() => {
                              setJugador1(`${j.nombre} ${j.apellido}`)
                              setJugador1Dni(j.dni ?? '')
                              setLookupJ1({ estado: 'encontrado', jugador: j })
                              setAltaJ1(ALTA_INIT)
                              setSugerenciasJ1([])
                              setDniErrors((p) => ({ ...p, j1: '' }))
                              setNameErrors((p) => ({ ...p, j1: '' }))
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-brand-50 transition-colors text-left border-b border-slate-50 last:border-0">
                            <span className="text-xs font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</span>
                            {j.dni && <span className="text-[10px] text-slate-400 shrink-0 ml-2">DNI {j.dni}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {nameErrors.j1 && <p className="text-red-500 text-[10px] mt-0.5">{nameErrors.j1}</p>}
                </>
              )}
            </div>

            {/* Nombre J2 */}
            <div className="min-w-0">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 2</label>
              {sinCompanero ? (
                <div className="border border-amber-200 bg-amber-50 rounded-xl px-2.5 py-2 text-xs text-amber-600 italic min-h-[42px] flex items-center">
                  Por definir
                </div>
              ) : lookupJ2.estado === 'encontrado' ? (
                <div className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 rounded-xl px-2.5 py-2 min-h-[42px]">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-emerald-800 block truncate">{jugador2}</span>
                    {lookupJ2.jugador && !lookupJ2.jugador.cuentaActiva && (
                      <span className="text-[9px] text-amber-600 font-semibold leading-tight">Sin cuenta</span>
                    )}
                  </div>
                  <button type="button" onClick={() => { setLookupJ2(LOOKUP_INIT); setJugador2('') }} className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 relative min-w-0">
                    <input
                      type="text"
                      placeholder="Nombre y apellido"
                      value={jugador2}
                      onChange={(e) => {
                        const raw = e.target.value
                        setJugador2(raw.replace(/[0-9]/g, ''))
                        setNameErrors((p) => ({ ...p, j2: /[0-9]/.test(raw) ? 'Solo letras permitidas' : '' }))
                        setSugerenciasJ2([])
                      }}
                      className={`flex-1 min-w-0 border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${nameErrors.j2 ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    {buscandoNombreJ2 && <div className="absolute right-10 top-2.5 w-3 h-3 border-2 border-slate-200 border-t-brand-400 rounded-full animate-spin" />}
                    <button type="button" onClick={() => setModalBusquedaPara('j2')}
                      className="shrink-0 px-2 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all">
                      <Search size={12} />
                    </button>
                    {sugerenciasJ2.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-8 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {sugerenciasJ2.map((j) => (
                          <button key={j.id} type="button"
                            onClick={() => {
                              setJugador2(`${j.nombre} ${j.apellido}`)
                              setJugador2Dni(j.dni ?? '')
                              setLookupJ2({ estado: 'encontrado', jugador: j })
                              setAltaJ2(ALTA_INIT)
                              setSugerenciasJ2([])
                              setDniErrors((p) => ({ ...p, j2: '' }))
                              setNameErrors((p) => ({ ...p, j2: '' }))
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-brand-50 transition-colors text-left border-b border-slate-50 last:border-0">
                            <span className="text-xs font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</span>
                            {j.dni && <span className="text-[10px] text-slate-400 shrink-0 ml-2">DNI {j.dni}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {nameErrors.j2 && <p className="text-red-500 text-[10px] mt-0.5">{nameErrors.j2}</p>}
                </>
              )}
            </div>

            {/* DNI J1 */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                DNI J1 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="12345678"
                value={jugador1Dni}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                  if (lookupJ1.estado === 'encontrado') { setJugador1(''); setAltaJ1(ALTA_INIT) }
                  setLookupJ1(LOOKUP_INIT)
                  setJugador1Dni(val)
                  setDniErrors((p) => ({ ...p, j1: val.length > 0 && val.length < 7 ? 'Mínimo 7 dígitos' : '' }))
                }}
                maxLength={8}
                inputMode="numeric"
                className={`w-full border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${dniErrors.j1 ? 'border-red-400' : 'border-slate-200'}`}
              />
              {dniErrors.j1 && <p className="text-red-500 text-[10px] mt-0.5">{dniErrors.j1}</p>}
              {/* Status lookup J1 */}
              {jugador1Dni.length >= 7 && !dniErrors.j1 && (
                <div className="mt-1">
                  {lookupJ1.estado === 'buscando' && <p className="text-[10px] text-slate-400">Verificando...</p>}
                  {lookupJ1.estado === 'encontrado' && <p className="text-[10px] text-emerald-600 font-medium">✓ Registrado</p>}
                  {lookupJ1.estado === 'no_encontrado' && !altaJ1.activa && (
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] text-amber-600">No registrado</p>
                      <button type="button" onClick={() => setAltaJ1((p) => ({ ...p, activa: true, nombre: jugador1.trim() }))}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors shrink-0">
                        + Dar de alta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DNI J2 */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                DNI J2 {!sinCompanero && <span className="text-red-400">*</span>}
              </label>
              {sinCompanero ? (
                <div className="border border-amber-200 bg-amber-50 rounded-xl px-2.5 py-2 text-xs text-amber-600 italic min-h-[42px] flex items-center">
                  Por definir
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="12345678"
                    value={jugador2Dni}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                      if (lookupJ2.estado === 'encontrado') { setJugador2(''); setAltaJ2(ALTA_INIT) }
                      setLookupJ2(LOOKUP_INIT)
                      setJugador2Dni(val)
                      setDniErrors((p) => ({ ...p, j2: val.length > 0 && val.length < 7 ? 'Mínimo 7 dígitos' : '' }))
                    }}
                    maxLength={8}
                    inputMode="numeric"
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${dniErrors.j2 ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {dniErrors.j2 && <p className="text-red-500 text-[10px] mt-0.5">{dniErrors.j2}</p>}
                  {/* Status lookup J2 */}
                  {jugador2Dni.length >= 7 && !dniErrors.j2 && (
                    <div className="mt-1">
                      {lookupJ2.estado === 'buscando' && <p className="text-[10px] text-slate-400">Verificando...</p>}
                      {lookupJ2.estado === 'encontrado' && <p className="text-[10px] text-emerald-600 font-medium">✓ Registrado</p>}
                      {lookupJ2.estado === 'no_encontrado' && !altaJ2.activa && (
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] text-amber-600">No registrado</p>
                          <button type="button" onClick={() => setAltaJ2((p) => ({ ...p, activa: true, nombre: jugador2.trim() }))}
                            className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors shrink-0">
                            + Dar de alta
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Alta rápida J1 */}
          {altaJ1.activa && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-emerald-700">Alta rápida J1 — sin cuenta</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input type="text" placeholder="Nombre" value={altaJ1.nombre}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, '')
                      setAltaJ1((p) => ({ ...p, nombre: val, errores: { ...p.errores, nombre: '' } }))
                      setJugador1(`${val} ${altaJ1.apellido}`.trim())
                    }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ1.errores.nombre ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ1.errores.nombre && <p className="text-red-500 text-[10px] mt-0.5">{altaJ1.errores.nombre}</p>}
                </div>
                <div>
                  <input type="text" placeholder="Apellido" value={altaJ1.apellido}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, '')
                      setAltaJ1((p) => ({ ...p, apellido: val, errores: { ...p.errores, apellido: '' } }))
                      setJugador1(`${altaJ1.nombre} ${val}`.trim())
                    }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ1.errores.apellido ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ1.errores.apellido && <p className="text-red-500 text-[10px] mt-0.5">{altaJ1.errores.apellido}</p>}
                </div>
              </div>
              {altaJ1.errores.general && <p className="text-red-500 text-[10px]">{altaJ1.errores.general}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAltaJ1(ALTA_INIT)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="button" onClick={() => handleAltaJugador(1)} disabled={altaJ1.guardando}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all">
                  {altaJ1.guardando ? 'Guardando...' : 'Dar de alta'}
                </button>
              </div>
            </div>
          )}

          {/* Alta rápida J2 */}
          {!sinCompanero && altaJ2.activa && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-emerald-700">Alta rápida J2 — sin cuenta</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input type="text" placeholder="Nombre" value={altaJ2.nombre}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, '')
                      setAltaJ2((p) => ({ ...p, nombre: val, errores: { ...p.errores, nombre: '' } }))
                      setJugador2(`${val} ${altaJ2.apellido}`.trim())
                    }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ2.errores.nombre ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ2.errores.nombre && <p className="text-red-500 text-[10px] mt-0.5">{altaJ2.errores.nombre}</p>}
                </div>
                <div>
                  <input type="text" placeholder="Apellido" value={altaJ2.apellido}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, '')
                      setAltaJ2((p) => ({ ...p, apellido: val, errores: { ...p.errores, apellido: '' } }))
                      setJugador2(`${altaJ2.nombre} ${val}`.trim())
                    }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ2.errores.apellido ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ2.errores.apellido && <p className="text-red-500 text-[10px] mt-0.5">{altaJ2.errores.apellido}</p>}
                </div>
              </div>
              {altaJ2.errores.general && <p className="text-red-500 text-[10px]">{altaJ2.errores.general}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAltaJ2(ALTA_INIT)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="button" onClick={() => handleAltaJugador(2)} disabled={altaJ2.guardando}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all">
                  {altaJ2.guardando ? 'Guardando...' : 'Dar de alta'}
                </button>
              </div>
            </div>
          )}

          {/* Categoría */}
          {torneo.categorias.length > 1 && (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 bg-white"
              >
                {torneo.categorias.map((c) => (
                  <option key={c} value={c}>{catLabel(torneo, c)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Disponibilidad — oculta cuando sin compañero/a */}
          {sinCompanero && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50/60">
              <span className="text-amber-500 text-sm shrink-0 mt-0.5">⏳</span>
              <p className="text-amber-700 text-xs leading-relaxed">
                La disponibilidad se cargará cuando se confirme el compañero/a de esta pareja.
              </p>
            </div>
          )}
          <div className={`flex flex-col gap-2 ${sinCompanero ? 'hidden' : ''}`}>
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

            {slotError
              ? <p className="text-red-500 text-xs">{slotError}</p>
              : slots.length === 0 && !sinCompanero && (
                  <p className="text-xs text-slate-400 -mt-1">Opcional · podés completar la disponibilidad más adelante editando la pareja.</p>
                )
            }

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

          {/* Prefiere mismo día — solo cuando hay compañero */}
          {!sinCompanero && (
            <button
              onClick={() => soloUnDia && setPrefiereMismoDia((v) => !v)}
              disabled={!soloUnDia}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                !soloUnDia
                  ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                  : prefiereMismoDia
                    ? 'text-slate-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
              style={
                soloUnDia && prefiereMismoDia
                  ? { borderColor: clubColor, backgroundColor: `color-mix(in srgb, ${clubColor} 8%, white)` }
                  : undefined
              }
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                  prefiereMismoDia && soloUnDia ? '' : 'border-slate-300'
                }`}
                style={prefiereMismoDia && soloUnDia ? { backgroundColor: clubColor, borderColor: clubColor } : undefined}
              >
                {prefiereMismoDia && soloUnDia && <span className="text-white text-[9px] font-bold">✓</span>}
              </div>
              <span className="text-xs">Prefieren jugar los 2 partidos el mismo día</span>
            </button>
          )}
        </div>

        {/* Aviso jugadores sin registrar */}
        {!cupoTotalLleno && (lookupJ1.estado === 'no_encontrado' || (!sinCompanero && lookupJ2.estado === 'no_encontrado')) && (
          <div className="mx-5 mb-1 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-700 text-[11px] leading-snug">
              {lookupJ1.estado === 'no_encontrado' && !sinCompanero && lookupJ2.estado === 'no_encontrado'
                ? 'Ambos jugadores no están en el sistema. Darlos de alta preserva el historial.'
                : lookupJ1.estado === 'no_encontrado'
                  ? 'J1 no está en el sistema. Darlo/a de alta preserva el historial.'
                  : 'J2 no está en el sistema. Darlo/a de alta preserva el historial.'}
            </p>
          </div>
        )}

        {/* Alerta cupo total lleno */}
        {cupoTotalLleno && (
          <div className="mx-5 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-xs font-medium">
              Cupo de <strong>{categoria}</strong> completo ({inscriptosEnCat}/{cupoCategoria} inscriptos · {enEsperaEnCat}/{cupoEsperaCategoria} espera).
            </p>
          </div>
        )}

        {/* Aviso irá a lista de espera */}
        {iraAEspera && (
          <div className="mx-5 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            <p className="text-amber-700 text-xs font-medium">
              Cupo inscriptos lleno — esta pareja quedará en <strong>lista de espera</strong> ({enEsperaEnCat}/{cupoEsperaCategoria}).
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
            disabled={cupoTotalLleno || lookupJ1.estado === 'buscando' || (!sinCompanero && lookupJ2.estado === 'buscando')}
            className="flex-1 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-brand-500/20"
          >
            {(lookupJ1.estado === 'buscando' || (!sinCompanero && lookupJ2.estado === 'buscando')) ? 'Verificando...' : 'Agregar pareja'}
          </button>
        </div>
      </div>

      {modalBusquedaPara && (
        <ModalBusquedaJugadores
          token={token}
          onClose={() => setModalBusquedaPara(null)}
          onSelect={(j) => {
            const setNombre = modalBusquedaPara === 'j1' ? setJugador1 : setJugador2
            const setDni    = modalBusquedaPara === 'j1' ? setJugador1Dni : setJugador2Dni
            const setLookup = modalBusquedaPara === 'j1' ? setLookupJ1 : setLookupJ2
            const setAlta   = modalBusquedaPara === 'j1' ? setAltaJ1 : setAltaJ2
            setNombre(`${j.nombre} ${j.apellido}`)
            setDni(j.dni ?? '')
            setLookup({ estado: 'encontrado', jugador: j })
            setAlta(ALTA_INIT)
            setDniErrors((p) => ({ ...p, [modalBusquedaPara]: '' }))
            setNameErrors((p) => ({ ...p, [modalBusquedaPara]: '' }))
          }}
        />
      )}
    </div>
  )
}

// ── Modal editar disponibilidad ───────────────────────────────────────────────

const ModalEditarDisponibilidad = ({ torneo, inscripto, onClose, onGuardar, token, horasDisponibles: horasProp }) => {
  const horasDisponibles = horasProp ?? HORAS_DISPONIBLES
  const [slots, setSlots]               = useState(inscripto.disponibilidad ? [...inscripto.disponibilidad] : [])
  const [diaSelec, setDiaSelec]         = useState('')
  const [horaSelec, setHoraSelec]       = useState('')
  const [slotError, setSlotError]       = useState('')
  const [prefiereMismoDia, setPrefiereMismoDia] = useState(inscripto.prefiereMismoDia ?? false)
  const [sinCompanero, setSinCompanero] = useState(inscripto.sinCompanero ?? false)
  const [jugador2, setJugador2]         = useState(inscripto.sinCompanero ? '' : (inscripto.jugador2 ?? ''))
  const [jugador2Dni, setJugador2Dni]   = useState(inscripto.sinCompanero ? '' : (inscripto.jugador2Dni ?? ''))
  const [nameError, setNameError]       = useState('')
  const [dniError, setDniError]         = useState('')

  const [jugador1, setJugador1]         = useState(inscripto.jugador1 ?? '')
  const [jugador1Dni, setJugador1Dni]   = useState(inscripto.jugador1Dni ?? '')
  const [nameErrorJ1, setNameErrorJ1]   = useState('')
  const [dniErrorJ1, setDniErrorJ1]     = useState('')

  const LOOKUP_INIT = { estado: 'idle', jugador: null }
  const ALTA_INIT   = { activa: false, nombre: '', apellido: '', errores: {}, guardando: false }
  const [lookupJ1, setLookupJ1] = useState(
    inscripto.jugador1Dni?.length >= 7 && inscripto.jugador1
      ? { estado: 'encontrado', jugador: null }
      : LOOKUP_INIT
  )
  const [altaJ1,   setAltaJ1]  = useState(ALTA_INIT)
  const [lookupJ2, setLookupJ2] = useState(
    !inscripto.sinCompanero && inscripto.jugador2Dni?.length >= 7 && inscripto.jugador2
      ? { estado: 'encontrado', jugador: null }
      : LOOKUP_INIT
  )
  const [altaJ2,   setAltaJ2]  = useState(ALTA_INIT)
  const [modalBusquedaPara, setModalBusquedaPara] = useState(null) // null | 'j1' | 'j2'
  const authH = token ? { Authorization: `Bearer ${token}` } : {}

  const makeLookupEffect = (dni, setLookup, setNombre, setAlta, skip) => {
    if (skip || setLookup === setLookupJ1 ? lookupJ1.estado === 'encontrado' : lookupJ2.estado === 'encontrado') return
    if (!/^\d{7,8}$/.test(dni)) { setLookup(LOOKUP_INIT); return }
    setLookup({ estado: 'buscando', jugador: null })
    api.get(`/jugadores/buscar?q=${dni}`, authH).then((res) => {
      const exacto = Array.isArray(res) ? res.find((j) => j.dni === dni) : null
      if (exacto) { setLookup({ estado: 'encontrado', jugador: exacto }); setNombre(`${exacto.nombre} ${exacto.apellido}`); setAlta(ALTA_INIT) }
      else setLookup({ estado: 'no_encontrado', jugador: null })
    }).catch(() => setLookup(LOOKUP_INIT))
  }

  useEffect(() => {
    if (lookupJ1.estado === 'encontrado') return
    const t = setTimeout(() => makeLookupEffect(jugador1Dni, setLookupJ1, setJugador1, setAltaJ1, false), 400)
    return () => clearTimeout(t)
  }, [jugador1Dni]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sinCompanero || lookupJ2.estado === 'encontrado') return
    const t = setTimeout(() => makeLookupEffect(jugador2Dni, setLookupJ2, setJugador2, setAltaJ2, false), 400)
    return () => clearTimeout(t)
  }, [jugador2Dni, sinCompanero]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAltaJ = async (who) => {
    const alta      = who === 1 ? altaJ1    : altaJ2
    const setAlta   = who === 1 ? setAltaJ1  : setAltaJ2
    const setLookup = who === 1 ? setLookupJ1 : setLookupJ2
    const setNombre = who === 1 ? setJugador1 : setJugador2
    const dni       = who === 1 ? jugador1Dni : jugador2Dni
    const errs = {}
    if (!alta.nombre.trim())           errs.nombre   = 'Requerido'
    else if (/\d/.test(alta.nombre))   errs.nombre   = 'Solo letras'
    if (!alta.apellido.trim())         errs.apellido = 'Requerido'
    else if (/\d/.test(alta.apellido)) errs.apellido = 'Solo letras'
    if (Object.keys(errs).length) { setAlta((p) => ({ ...p, errores: errs })); return }
    setAlta((p) => ({ ...p, guardando: true }))
    try {
      const nuevo = await api.post('/jugadores', { nombre: alta.nombre.trim(), apellido: alta.apellido.trim(), dni }, authH)
      setLookup({ estado: 'encontrado', jugador: nuevo })
      setNombre(`${nuevo.nombre} ${nuevo.apellido}`)
      setAlta(ALTA_INIT)
    } catch (err) {
      setAlta((p) => ({ ...p, guardando: false, errores: { general: err.message || 'Error al dar de alta' } }))
    }
  }

  const diaCorte    = torneo.diaInicioEliminatoria  ?? null
  const horaCorte   = torneo.horaInicioEliminatoria ?? null
  const diasValidos = getDiasValidos(torneo.fechaInicio, torneo.fechaFin)
    .filter((dia) => esSlotDeGrupos(dia, '00:00', diaCorte, horaCorte))
  const horasParaDia = (dia) =>
    horasDisponibles.filter((h) => esSlotDeGrupos(dia, h, diaCorte, horaCorte))

  const soloUnDia = [...new Set(slots.map((s) => s.dia))].length <= 1
  useEffect(() => { if (!soloUnDia) setPrefiereMismoDia(false) }, [soloUnDia])

  const handleAddSlot = () => {
    if (!diaSelec || !horaSelec) return
    if (slots.length >= MAX_SLOTS_ADMIN) { setSlotError(`Máximo ${MAX_SLOTS_ADMIN} horarios.`); return }
    if (slots.some((s) => s.dia === diaSelec && s.horaDesde === horaSelec)) { setSlotError('Ese horario ya fue agregado.'); return }
    setSlots([...slots, { dia: diaSelec, horaDesde: horaSelec }])
    setSlotError('')
  }

  const handleGuardar = () => {
    // Validar J1
    if (!jugador1.trim()) { setNameErrorJ1('Requerido'); return }
    setNameErrorJ1('')
    if (!jugador1Dni.trim()) { setDniErrorJ1('Requerido'); return }
    if (!/^\d{7,8}$/.test(jugador1Dni.trim())) { setDniErrorJ1('Entre 7 y 8 números'); return }
    const j1DniCambiado = jugador1Dni.trim() !== (inscripto.jugador1Dni ?? '')
    const j1NoReg = j1DniCambiado && lookupJ1.estado === 'no_encontrado' && !altaJ1.activa
    if (j1NoReg) { setAltaJ1((p) => ({ ...p, activa: true, nombre: jugador1.trim() })); return }
    if (altaJ1.activa) return
    setDniErrorJ1('')
    if (!sinCompanero) {
      if (!jugador2.trim()) { setNameError('Requerido'); return }
      setNameError('')
      if (!jugador2Dni.trim()) { setDniError('Requerido'); return }
      if (!/^\d{7,8}$/.test(jugador2Dni.trim())) { setDniError('Entre 7 y 8 números'); return }
      const dniCambiado = jugador2Dni.trim() !== (inscripto.jugador2Dni ?? '')
      const j2NoReg = dniCambiado && lookupJ2.estado === 'no_encontrado' && !altaJ2.activa
      if (j2NoReg) { setAltaJ2((p) => ({ ...p, activa: true, nombre: jugador2.trim() })); return }
      if (altaJ2.activa) return
      setDniError('')
      if (slots.length === 0) { setSlotError('Agregá al menos un horario.'); return }
      if (slots.length === 1 && !prefiereMismoDia) { setSlotError('Con un solo horario, marcá "Mismo día" o agregá un segundo día.'); return }
    }
    setSlotError('')
    onGuardar(inscripto.id, {
      jugador1: jugador1.trim(),
      jugador1Dni: jugador1Dni.trim(),
      jugador2: sinCompanero ? 'Por definir' : jugador2.trim(),
      jugador2Dni: sinCompanero ? '' : jugador2Dni.trim(),
      sinCompanero,
      disponibilidad: slots,
      prefiereMismoDia,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-800 font-bold text-base">Editar inscripción</h2>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{inscripto.jugador1} · {inscripto.categoria}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

          {/* Jugador 1 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 1</label>
              {lookupJ1.estado === 'encontrado' ? (
                <div className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 rounded-xl px-2.5 py-2 min-h-[42px]">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-emerald-800 block truncate">{jugador1}</span>
                    {lookupJ1.jugador && !lookupJ1.jugador.cuentaActiva && (
                      <span className="text-[9px] text-amber-600 font-semibold leading-tight">Sin cuenta</span>
                    )}
                  </div>
                  <button type="button" onClick={() => { setLookupJ1(LOOKUP_INIT); setJugador1('') }} className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"><X size={11} /></button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 min-w-0">
                    <input type="text" value={jugador1}
                      onChange={(e) => { setJugador1(e.target.value.replace(/[0-9]/g, '')); setNameErrorJ1('') }}
                      placeholder="Nombre y apellido"
                      className={`flex-1 min-w-0 border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 min-h-[42px] ${nameErrorJ1 ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setModalBusquedaPara('j1')}
                      className="shrink-0 px-2 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all">
                      <Search size={12} />
                    </button>
                  </div>
                  {nameErrorJ1 && <p className="text-red-500 text-[10px] mt-0.5">{nameErrorJ1}</p>}
                </>
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">DNI J1 <span className="text-red-400">*</span></label>
              <input type="text" value={jugador1Dni}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                  if (lookupJ1.estado === 'encontrado') { setJugador1(''); setAltaJ1(ALTA_INIT) }
                  setLookupJ1(LOOKUP_INIT); setJugador1Dni(val)
                  setDniErrorJ1(val.length > 0 && val.length < 7 ? 'Mínimo 7 dígitos' : '')
                }}
                placeholder="12345678" maxLength={8} inputMode="numeric"
                className={`w-full border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${dniErrorJ1 ? 'border-red-400' : 'border-slate-200'}`}
              />
              {dniErrorJ1 && <p className="text-red-500 text-[10px] mt-0.5">{dniErrorJ1}</p>}
              {jugador1Dni.length >= 7 && !dniErrorJ1 && (
                <div className="mt-1">
                  {lookupJ1.estado === 'buscando' && <p className="text-[10px] text-slate-400">Verificando...</p>}
                  {lookupJ1.estado === 'encontrado' && <p className="text-[10px] text-emerald-600 font-medium">✓ Registrado</p>}
                  {lookupJ1.estado === 'no_encontrado' && !altaJ1.activa && (
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] text-amber-600">No registrado</p>
                      <button type="button" onClick={() => setAltaJ1((p) => ({ ...p, activa: true, nombre: jugador1.trim() }))}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors shrink-0">
                        + Dar de alta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Alta rápida J1 */}
          {altaJ1.activa && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-emerald-700">Alta rápida J1 — sin cuenta</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input type="text" placeholder="Nombre" value={altaJ1.nombre}
                    onChange={(e) => { const v = e.target.value.replace(/[0-9]/g, ''); setAltaJ1((p) => ({ ...p, nombre: v, errores: { ...p.errores, nombre: '' } })); setJugador1(`${v} ${altaJ1.apellido}`.trim()) }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ1.errores.nombre ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ1.errores.nombre && <p className="text-red-500 text-[10px] mt-0.5">{altaJ1.errores.nombre}</p>}
                </div>
                <div>
                  <input type="text" placeholder="Apellido" value={altaJ1.apellido}
                    onChange={(e) => { const v = e.target.value.replace(/[0-9]/g, ''); setAltaJ1((p) => ({ ...p, apellido: v, errores: { ...p.errores, apellido: '' } })); setJugador1(`${altaJ1.nombre} ${v}`.trim()) }}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ1.errores.apellido ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {altaJ1.errores.apellido && <p className="text-red-500 text-[10px] mt-0.5">{altaJ1.errores.apellido}</p>}
                </div>
              </div>
              {altaJ1.errores.general && <p className="text-red-500 text-[10px]">{altaJ1.errores.general}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAltaJ1(ALTA_INIT)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                <button type="button" onClick={() => handleAltaJ(1)} disabled={altaJ1.guardando}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all">
                  {altaJ1.guardando ? 'Guardando...' : 'Dar de alta'}
                </button>
              </div>
            </div>
          )}

          {/* Toggle sin compañero */}
          <button
            type="button"
            onClick={() => setSinCompanero((v) => !v)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left w-full ${
              sinCompanero ? 'border-amber-300/50 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
              sinCompanero ? 'bg-amber-400 border-amber-400' : 'border-slate-300 bg-white'
            }`}>
              {sinCompanero && (
                <svg viewBox="0 0 10 8" className="w-2 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
            <span className={`text-xs font-medium ${sinCompanero ? 'text-amber-700' : 'text-slate-500'}`}>
              Sin compañero/a confirmado/a aún
            </span>
          </button>

          {/* Compañero nombre + DNI */}
          {sinCompanero ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50/60">
              <span className="text-amber-500 text-sm shrink-0">⏳</span>
              <p className="text-amber-700 text-xs leading-relaxed">
                La pareja y la disponibilidad se completarán cuando el jugador confirme su compañero/a.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {/* Nombre J2 */}
                <div className="min-w-0">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Jugador 2</label>
                  {lookupJ2.estado === 'encontrado' ? (
                    <div className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 rounded-xl px-2.5 py-2 min-h-[42px]">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-emerald-800 block truncate">{jugador2}</span>
                        {lookupJ2.jugador && !lookupJ2.jugador.cuentaActiva && (
                          <span className="text-[9px] text-amber-600 font-semibold leading-tight">Sin cuenta</span>
                        )}
                      </div>
                      <button type="button" onClick={() => { setLookupJ2(LOOKUP_INIT); setJugador2('') }} className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1 min-w-0">
                        <input type="text" value={jugador2}
                          onChange={(e) => { setJugador2(e.target.value.replace(/[0-9]/g, '')); setNameError('') }}
                          placeholder="Nombre y apellido"
                          className={`flex-1 min-w-0 border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 min-h-[42px] ${nameError ? 'border-red-400' : 'border-slate-200'}`}
                        />
                        <button type="button" onClick={() => setModalBusquedaPara('j2')}
                          className="shrink-0 px-2 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all">
                          <Search size={12} />
                        </button>
                      </div>
                      {nameError && <p className="text-red-500 text-[10px] mt-0.5">{nameError}</p>}
                    </>
                  )}
                </div>
                {/* DNI J2 */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">DNI J2 <span className="text-red-400">*</span></label>
                  <input type="text" value={jugador2Dni}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                      if (lookupJ2.estado === 'encontrado') { setJugador2(''); setAltaJ2(ALTA_INIT) }
                      setLookupJ2(LOOKUP_INIT)
                      setJugador2Dni(val)
                      setDniError(val.length > 0 && val.length < 7 ? 'Mínimo 7 dígitos' : '')
                    }}
                    placeholder="12345678" maxLength={8} inputMode="numeric"
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${dniError ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {dniError && <p className="text-red-500 text-[10px] mt-0.5">{dniError}</p>}
                  {jugador2Dni.length >= 7 && !dniError && (
                    <div className="mt-1">
                      {lookupJ2.estado === 'buscando' && <p className="text-[10px] text-slate-400">Verificando...</p>}
                      {lookupJ2.estado === 'encontrado' && <p className="text-[10px] text-emerald-600 font-medium">✓ Registrado</p>}
                      {lookupJ2.estado === 'no_encontrado' && !altaJ2.activa && (
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] text-amber-600">No registrado</p>
                          <button type="button" onClick={() => setAltaJ2((p) => ({ ...p, activa: true, nombre: jugador2.trim() }))}
                            className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors shrink-0">
                            + Dar de alta
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Alta rápida J2 */}
              {altaJ2.activa && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-emerald-700">Alta rápida J2 — sin cuenta</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input type="text" placeholder="Nombre" value={altaJ2.nombre}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[0-9]/g, '')
                          setAltaJ2((p) => ({ ...p, nombre: val, errores: { ...p.errores, nombre: '' } }))
                          setJugador2(`${val} ${altaJ2.apellido}`.trim())
                        }}
                        className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ2.errores.nombre ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      {altaJ2.errores.nombre && <p className="text-red-500 text-[10px] mt-0.5">{altaJ2.errores.nombre}</p>}
                    </div>
                    <div>
                      <input type="text" placeholder="Apellido" value={altaJ2.apellido}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[0-9]/g, '')
                          setAltaJ2((p) => ({ ...p, apellido: val, errores: { ...p.errores, apellido: '' } }))
                          setJugador2(`${altaJ2.nombre} ${val}`.trim())
                        }}
                        className={`w-full border rounded-xl px-2.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white ${altaJ2.errores.apellido ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      {altaJ2.errores.apellido && <p className="text-red-500 text-[10px] mt-0.5">{altaJ2.errores.apellido}</p>}
                    </div>
                  </div>
                  {altaJ2.errores.general && <p className="text-red-500 text-[10px]">{altaJ2.errores.general}</p>}
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setAltaJ2(ALTA_INIT)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                    <button type="button" onClick={() => handleAltaJ(2)} disabled={altaJ2.guardando}
                      className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all">
                      {altaJ2.guardando ? 'Guardando...' : 'Dar de alta'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Disponibilidad */}
          {!sinCompanero && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidad horaria</label>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${slots.length >= MAX_SLOTS_ADMIN ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {slots.length}/{MAX_SLOTS_ADMIN}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <select
                  value={diaSelec}
                  onChange={(e) => { const d = e.target.value; setDiaSelec(d); setHoraSelec(horasParaDia(d)[0] ?? '') }}
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
                        <button key={h} type="button" onClick={() => setHoraSelec(h)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${horaSelec === h ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600'}`}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={handleAddSlot} disabled={!diaSelec || !horaSelec || slots.length >= MAX_SLOTS_ADMIN}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-all text-sm font-medium">
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
                <p className="text-slate-400 text-xs text-center py-3 bg-slate-50 rounded-xl">Sin horarios cargados</p>
              )}

              {/* Toggle mismo día */}
              <button type="button" onClick={() => soloUnDia && setPrefiereMismoDia((v) => !v)} disabled={!soloUnDia}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left ${
                  !soloUnDia ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                  : prefiereMismoDia ? 'border-amber-300/40 bg-amber-50'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${prefiereMismoDia && soloUnDia ? 'bg-amber-400 border-amber-400' : 'border-slate-300 bg-white'}`}>
                  {prefiereMismoDia && soloUnDia && (
                    <svg viewBox="0 0 10 8" className="w-2 h-2">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-medium ${prefiereMismoDia && soloUnDia ? 'text-amber-700' : 'text-slate-500'}`}>
                  Prefieren jugar los 2 partidos el mismo día
                </span>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button onClick={handleGuardar}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all shadow-sm shadow-brand-500/20">
            Guardar
          </button>
        </div>
      </div>

      {modalBusquedaPara && (
        <ModalBusquedaJugadores
          token={token}
          onClose={() => setModalBusquedaPara(null)}
          onSelect={(j) => {
            if (modalBusquedaPara === 'j1') {
              setJugador1(`${j.nombre} ${j.apellido}`)
              setJugador1Dni(j.dni ?? '')
              setLookupJ1({ estado: 'encontrado', jugador: j })
              setAltaJ1(ALTA_INIT)
              setNameErrorJ1(''); setDniErrorJ1('')
            } else {
              setJugador2(`${j.nombre} ${j.apellido}`)
              setJugador2Dni(j.dni ?? '')
              setLookupJ2({ estado: 'encontrado', jugador: j })
              setAltaJ2(ALTA_INIT)
              setNameError(''); setDniError('')
            }
          }}
        />
      )}
    </div>
  )
}

// ── Modal para cargar resultado de partido eliminatorio ───────────────────────

const ModalResultado = ({ partido, onClose, onGuardar }) => {
  const { pareja1, pareja2 } = partido

  const initSets = (r) => [
    { p1: String(r?.[0]?.p1 ?? ''), p2: String(r?.[0]?.p2 ?? '') },
    { p1: String(r?.[1]?.p1 ?? ''), p2: String(r?.[1]?.p2 ?? '') },
    { p1: String(r?.[2]?.p1 ?? ''), p2: String(r?.[2]?.p2 ?? '') },
  ]
  const [sets, setSets] = useState(() => initSets(partido.resultado))

  const upd = (i, side, val) =>
    setSets((prev) => prev.map((s, j) => j === i ? { ...s, [side]: val.replace(/\D/g, '').slice(0, 2) } : s))

  const filled  = (s) => s.p1 !== '' && s.p2 !== ''
  const valido  = (s) => filled(s) && isValidSet(s.p1, s.p2)
  const ganSet  = (s) => !valido(s) ? null : Number(s.p1) > Number(s.p2) ? 1 : 2

  const v0 = valido(sets[0]), v1 = valido(sets[1])
  const g0 = ganSet(sets[0]), g1 = ganSet(sets[1])
  const needsSet3 = v0 && v1 && g0 !== g1
  const completo  = v0 && v1 && (!needsSet3 || valido(sets[2]))

  const parsedSets = [
    valido(sets[0]) ? { p1: Number(sets[0].p1), p2: Number(sets[0].p2) } : null,
    valido(sets[1]) ? { p1: Number(sets[1].p1), p2: Number(sets[1].p2) } : null,
    needsSet3 && valido(sets[2]) ? { p1: Number(sets[2].p1), p2: Number(sets[2].p2) } : null,
  ].filter(Boolean)

  const ganadorPreview = completo ? calcularGanadorDesdeResultado(parsedSets, pareja1, pareja2) : null

  const apeLabel = (p) => p ? `${p.jugador1?.split(' ').at(-1)} / ${p.jugador2?.split(' ').at(-1)}` : '—'

  const handleGuardar = () => {
    if (!ganadorPreview) return
    onGuardar(partido.id, { resultado: parsedSets })
    onClose()
  }

  const inputCls = (s, lado) => {
    const g = ganSet(s)
    const gana  = g === lado
    const pierde = g !== null && g !== lado
    return `w-12 text-center text-base font-bold border rounded-xl px-1 py-2.5 outline-none transition-all focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 ${
      gana   ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : pierde ? 'border-slate-200 bg-white text-slate-300'
      :          'border-slate-200 bg-white text-slate-700'
    }`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 font-bold text-sm">Registrar resultado</h2>
            <p className="text-slate-400 text-[11px] mt-0.5 truncate max-w-[210px]">
              {apeLabel(pareja1)} vs {apeLabel(pareja2)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Cards de pareja */}
        <div className="px-5 pt-4 flex items-stretch gap-2">
          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pareja 1</p>
            <p className="text-xs font-bold text-slate-700 leading-tight truncate">{pareja1?.jugador1?.split(' ').at(-1)}</p>
            <p className="text-xs text-slate-500 leading-tight truncate">{pareja1?.jugador2?.split(' ').at(-1)}</p>
          </div>
          <div className="flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-slate-300">vs</span>
          </div>
          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pareja 2</p>
            <p className="text-xs font-bold text-slate-700 leading-tight truncate">{pareja2?.jugador1?.split(' ').at(-1)}</p>
            <p className="text-xs text-slate-500 leading-tight truncate">{pareja2?.jugador2?.split(' ').at(-1)}</p>
          </div>
        </div>

        {/* Sets */}
        <div className="px-5 py-4 flex flex-col gap-3">
          {[0, 1, ...(needsSet3 ? [2] : [])].map((i) => {
            const s   = sets[i]
            const g   = ganSet(s)
            const ok  = valido(s)
            const bad = filled(s) && !ok
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-slate-300 w-9 shrink-0 text-right">Set {i + 1}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text" inputMode="numeric" maxLength={2}
                    value={s.p1} onChange={(e) => upd(i, 'p1', e.target.value)}
                    placeholder="0" className={inputCls(s, 1)}
                  />
                  <span className="text-slate-300 font-bold text-base select-none">—</span>
                  <input
                    type="text" inputMode="numeric" maxLength={2}
                    value={s.p2} onChange={(e) => upd(i, 'p2', e.target.value)}
                    placeholder="0" className={inputCls(s, 2)}
                  />
                </div>
                {ok && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border leading-none ${
                    g === 1
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-sky-700 bg-sky-50 border-sky-200'
                  }`}>
                    P{g} ganó
                  </span>
                )}
                {bad && <span className="text-[10px] text-red-400 font-medium">Inválido</span>}
              </div>
            )
          })}
          {needsSet3 && !valido(sets[2]) && (
            <p className="text-[10px] text-amber-500 font-medium pl-12">Empate 1-1 · Cargá el set definitivo</p>
          )}
        </div>

        {/* Ganador */}
        {ganadorPreview ? (
          <div className="mx-5 mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <Trophy size={14} className="text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide leading-none mb-1">Ganador</p>
              <p className="text-sm font-bold text-emerald-800 leading-tight truncate">
                {ganadorPreview.jugador1?.split(' ').at(-1)} / {ganadorPreview.jugador2?.split(' ').at(-1)}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-1" />
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!ganadorPreview}
            className="px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal horario partido del bracket ────────────────────────────────────────

const ModalHorario = ({ partido, canchasActivas, allPartidos = [], onClose, onGuardar }) => {
  const [fecha,  setFecha]  = useState(partido.fecha  ?? '')
  const [hora,   setHora]   = useState(partido.hora   ?? '')
  const [cancha, setCancha] = useState(partido.cancha ?? '')

  const apellido = (n) => n?.split(' ').at(-1) ?? n
  const parejaLabel = (p) => {
    if (!p) return '—'
    if (p.tbd) return p.label
    return `${apellido(p.jugador1)} / ${apellido(p.jugador2)}`
  }
  const p1 = parejaLabel(partido.pareja1)
  const p2 = parejaLabel(partido.pareja2)

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all'

  // Validación inline: misma cancha + mismo horario + misma fecha en otro partido
  const conflicto = useMemo(() => {
    if (!fecha || !hora || !cancha) return null
    const otro = allPartidos.find(
      (p) => p.id !== partido.id && p.fecha === fecha && p.hora === hora && String(p.cancha) === String(cancha)
    )
    if (!otro) return null
    const a1 = otro.pareja1?.tbd ? otro.pareja1.label : otro.pareja1 ? `${apellido(otro.pareja1.jugador1)} / ${apellido(otro.pareja1.jugador2)}` : '—'
    const a2 = otro.pareja2?.tbd ? otro.pareja2.label : otro.pareja2 ? `${apellido(otro.pareja2.jugador1)} / ${apellido(otro.pareja2.jugador2)}` : '—'
    const nombreCancha = canchasActivas.find((c) => String(c.id) === String(cancha))?.nombre ?? `Cancha ${cancha}`
    return `${nombreCancha} ya tiene un partido a las ${hora} hs: ${a1} vs ${a2}`
  }, [fecha, hora, cancha, allPartidos, partido.id, canchasActivas])

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
              <div className="flex items-center gap-1">
                <select
                  value={hora ? hora.split(':')[0] : ''}
                  onChange={(e) => {
                    const m = hora ? hora.split(':')[1] : '00'
                    setHora(e.target.value ? `${e.target.value}:${m}` : '')
                  }}
                  className={inputCls}
                >
                  <option value="">--</option>
                  {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold shrink-0">:</span>
                <select
                  value={hora ? hora.split(':')[1] : ''}
                  onChange={(e) => {
                    const h = hora ? hora.split(':')[0] : '08'
                    setHora(e.target.value ? `${h}:${e.target.value}` : '')
                  }}
                  className={inputCls}
                >
                  <option value="">--</option>
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Cancha</label>
            <select value={cancha} onChange={(e) => setCancha(e.target.value)} className={`${inputCls} ${conflicto ? 'border-red-300 focus:ring-red-400/30 focus:border-red-400' : ''}`}>
              <option value="">— Sin asignar —</option>
              {canchasActivas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {conflicto && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 leading-snug">{conflicto}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
          <button
            onClick={() => !conflicto && onGuardar(fecha || null, hora || null, cancha || null)}
            disabled={!!conflicto}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${conflicto ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmar cierre de inscripciones ───────────────────────────────────

const ModalCerrarInscripcion = ({ torneo, onConfirmar, onCancelar }) => {
  const inscriptos  = torneo.inscriptos.filter((i) => i.estado === 'inscripto')
  const enEspera    = torneo.inscriptos.filter((i) => i.estado === 'espera')
  const sinHorarios = inscriptos.filter((i) => !i.disponibilidad || i.disponibilidad.length === 0)
  const sinCompanero = inscriptos.filter((i) => i.sinCompanero)
  const hayAlertas  = sinHorarios.length > 0 || sinCompanero.length > 0
  const bloqueado   = inscriptos.length < 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancelar}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Lock size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Cerrar inscripciones</h3>
            <p className="text-slate-400 text-xs mt-0.5">{torneo.nombre}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">

          {/* Info neutral */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
              <span><strong>{inscriptos.length}</strong> pareja{inscriptos.length !== 1 ? 's' : ''} titular{inscriptos.length !== 1 ? 'es' : ''} confirmada{inscriptos.length !== 1 ? 's' : ''}</span>
            </div>
            {enEspera.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users size={13} className="text-slate-400 shrink-0" />
                <span><strong>{enEspera.length}</strong> en espera pasará{enEspera.length !== 1 ? 'n' : ''} a suplente</span>
              </div>
            )}
          </div>

          {/* Advertencias */}
          {hayAlertas && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Advertencias
              </p>
              {sinHorarios.length > 0 && (
                <p className="text-xs text-amber-700">
                  · <strong>{sinHorarios.length}</strong> pareja{sinHorarios.length !== 1 ? 's' : ''} sin disponibilidad horaria — no podrán asignarse automáticamente en grupos
                </p>
              )}
              {sinCompanero.length > 0 && (
                <p className="text-xs text-amber-700">
                  · <strong>{sinCompanero.length}</strong> pareja{sinCompanero.length !== 1 ? 's' : ''} sin compañero/a confirmado
                </p>
              )}
            </div>
          )}

          {/* Bloqueo */}
          {bloqueado && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={12} /> No se puede cerrar
              </p>
              <p className="text-xs text-red-600 mt-1">Se necesitan al menos 2 parejas inscriptas para generar grupos.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onCancelar}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={bloqueado ? undefined : onConfirmar}
            disabled={bloqueado}
            className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
              bloqueado
                ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Lock size={12} />
            {bloqueado ? 'Sin parejas suficientes' : hayAlertas ? 'Cerrar de todas formas' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const TorneoDetallePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { torneos, setTorneos, addTorneoFromApi, setEstado, setBracket, updateBracket, bajaInscripto, setGanadores,
          setGrupos, updateGrupos, resolveGroupTie, addPareja, addParejaFromApi, updatePareja,
          updatePersonalizacion, updateTorneoFromApi } = useTorneosStore()
  const token = useAuthStore((s) => s.token)
  const adminClubId = useAuthStore((s) => s.user?.club?.id)
  // Notificaciones al jugador se crean en el backend (tabla notificaciones), no desde el admin
  const club           = useClubStore((s) => s.club)
  const canchas        = club.canchas
  const canchasActivas = canchas.filter((c) => c.activa)
  const canchaName     = (id) => canchas.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`
  const horasDisponibles = useMemo(() => {
    const horarios = club?.horarios ?? {}
    const aperturaMins = Object.values(horarios)
      .filter((h) => h?.activo && h.apertura)
      .map((h) => { const [hh, mm] = h.apertura.split(':').map(Number); return hh * 60 + (mm ?? 0) })
    const cierreMins   = Object.values(horarios)
      .filter((h) => h?.activo && h.cierre)
      .map((h) => { const [hh, mm] = h.cierre.split(':').map(Number); return hh * 60 + (mm ?? 0) })
    const desde = aperturaMins.length ? Math.min(...aperturaMins) : 8 * 60
    const hasta = cierreMins.length   ? Math.max(...cierreMins)   : 23 * 60
    const horas = []
    for (let m = desde; m <= hasta; m += 60) {
      horas.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
    return horas.length ? horas : HORAS_DISPONIBLES
  }, [club?.horarios])
  const [tab, setTab]                   = useState('inscriptos')
  const [catTab, setCatTab]             = useState(() => torneos.find((x) => String(x.id) === id)?.categorias?.[0] ?? null)
  const [swapSource, setSwapSource]     = useState(null)
  const [modalAgregarAdmin, setModalAgregarAdmin] = useState(false)
  const [zonaDetalleIdx, setZonaDetalleIdx]       = useState(null)
  const [editando, setEditando]         = useState(null)
  const [modalResultado, setModalResultado]       = useState(null)
  const [modalHorario,   setModalHorario]         = useState(null)
  const [bracketFullscreen, setBracketFullscreen] = useState(false)
  const [bracketPublicar,   setBracketPublicar]   = useState(false)
  const [visualTab, setVisualTab]                 = useState('flyer')
  const [vistaParalela,     setVistaParalela]     = useState(false)
  const [intervaloPartidoMin, setIntervaloPartidoMin] = useState(75)
  const [autoScheduleState, setAutoScheduleState] = useState(null) // null | {status:'procesando'} | {status:'done',asignados,sinHorario}
  const [elimIntervaloMin, setElimIntervaloMin] = useState(75)
  const [elimAutoState, setElimAutoState] = useState(null) // null | {status:'procesando'} | {status:'done',asignados}
  const [modalAsignarManual, setModalAsignarManual] = useState(null) // null | { matchId, zonaIdx, partido }
  const [toast, setToast] = useState(null)
  const [reprogramarOpen, setReprogramarOpen] = useState(false)
  const [reprogramarFecha, setReprogramarFecha] = useState('')
  const [reprogramarSaving, setReprogramarSaving] = useState(false)
  const [toastEstado, setToastEstado] = useState(null)
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const [confirmModal, setConfirmModal] = useState(null) // { titulo, mensaje, onConfirmar }
  const [modalCerrarInsc, setModalCerrarInsc] = useState(false)
  const [persona, setPersona] = useState(() => {
    const t = torneos.find((x) => String(x.id) === id)
    return {
      modoLandingFlyer:     t?.modoLandingFlyer     ?? 'auto',
      premioPrimero:        t?.premioPrimero        ?? '',
      imagenFondoEnCurso:   t?.imagenFondoEnCurso   ?? '',
      ctaEnCurso:           t?.ctaEnCurso           ?? '',
      templateEnCurso:      t?.templateEnCurso      ?? 1,
      premioSegundo:        t?.premioSegundo        ?? '',
      premioSemifinal:      t?.premioSemifinal      ?? '',
      imagenFondo:          t?.imagenFondo          ?? '',
      colorAcento:          t?.colorAcento          ?? '',
      templateFixture:      t?.templateFixture      ?? 1,
      colorAcentoFixture:   t?.colorAcentoFixture   ?? '',
      estiloCardFixture:    t?.estiloCardFixture    ?? 'oscura',
      colorCardFixture:     t?.colorCardFixture     ?? '',
      estiloCardGrupos:     t?.estiloCardGrupos     ?? 'oscura',
      colorCardGrupos:      t?.colorCardGrupos      ?? '',
      colorCard:            t?.colorCard            ?? '',
      imagenFondoDraw:    t?.imagenFondoDraw    ?? '',
      imagenFondoBracket: t?.imagenFondoBracket ?? '',
      imagenFondoFixture: t?.imagenFondoFixture ?? '',
      imagenFondoGrupos:       t?.imagenFondoGrupos       ?? '',
      imagenHeaderGrupos:      t?.imagenHeaderGrupos      ?? '',
      imagenWatermarkGrupos:   t?.imagenWatermarkGrupos   ?? '',
      imagenWatermarkFixture:  t?.imagenWatermarkFixture  ?? '',
      colorTextoCardGrupos:   t?.colorTextoCardGrupos   ?? '',
      colorCardBgEnCurso:     t?.colorCardBgEnCurso     ?? '',
      colorTituloEnCurso:     t?.colorTituloEnCurso     ?? '',
      colorTextoSecEnCurso:   t?.colorTextoSecEnCurso   ?? '',
      colorBtnTextEnCurso:    t?.colorBtnTextEnCurso    ?? '',
      sponsorLogoFixture:     t?.sponsorLogoFixture     ?? '',
      colorTextoNombres:      t?.colorTextoNombres      ?? '',
      colorTextoZona:         t?.colorTextoZona         ?? '',
      colorTextoCategoria:    t?.colorTextoCategoria    ?? '',
      colorTextoScore:        t?.colorTextoScore        ?? '',
      colorTextoInfo:         t?.colorTextoInfo         ?? '',
      estiloCard:         t?.estiloCard         ?? 'oscura',
      fontScale:          t?.fontScale          ?? 'normal',
      sponsors:           t?.sponsors           ?? [],
      sponsorsFixture:    t?.sponsorsFixture    ?? [],
      sponsorsGrupos:     t?.sponsorsGrupos     ?? [],
      sponsorScale:       t?.sponsorScale       ?? 'normal',
      drawMostrarClub:       t?.drawMostrarClub       ?? true,
      drawTitulo:            t?.drawTitulo            ?? 'Main Draw',
      drawMostrarNombre:     t?.drawMostrarNombre     ?? true,
      drawMostrarFechas:     t?.drawMostrarFechas     ?? true,
      drawMostrarCategorias: t?.drawMostrarCategorias ?? true,
      drawColorTitulo:       t?.drawColorTitulo       ?? '',
      bracketColores:        t?.bracketColores        ?? {},
      bracketColorCards:     t?.bracketColorCards     ?? {},
      bracketTemplate:       t?.bracketTemplate       ?? 'default',
      bracketConnColor:      t?.bracketConnColor      ?? null,
      bracketConnGlow:       t?.bracketConnGlow       ?? true,
      bracketWatermark:      t?.bracketWatermark      ?? null,
      bracketWatermarkOculto: t?.bracketWatermarkOculto ?? false,
      bracketFondoColor:     t?.bracketFondoColor     ?? null,
      drawMostrarGenero:     t?.drawMostrarGenero     ?? true,
    }
  })
  const [selectedBracketCat, setSelectedBracketCat] = useState(() => {
    const t = torneos.find((x) => String(x.id) === id)
    if (t?.brackets) {
      const cats = Object.keys(t.brackets)
      if (cats.length > 0) return cats[0]
    }
    return t?.categorias?.[0] ?? null
  })
  const [sponsorModalTarget, setSponsorModalTarget] = useState(null) // null | 'fixture' | 'grupos' | 'draw'
  const [clubSponsors, setClubSponsors]             = useState(null)
  const sponsorModalOpen = sponsorModalTarget !== null
  const openSponsorModal = async (target) => {
    setSponsorModalTarget(target)
    if (clubSponsors !== null) return
    try {
      const data = await api.get('/sponsors', { Authorization: `Bearer ${token}` })
      setClubSponsors(Array.isArray(data) ? data : [])
    } catch {
      setClubSponsors([])
    }
  }
  const getCurrentSponsorKey = () =>
    sponsorModalTarget === 'fixture' ? 'sponsorsFixture'
    : sponsorModalTarget === 'grupos' ? 'sponsorsGrupos'
    : 'sponsors'
  const toggleSponsor = (s) => {
    const key    = getCurrentSponsorKey()
    const list   = persona[key] ?? []
    const already = list.some((x) => x.nombre === s.nombre)
    setP(key, already ? list.filter((x) => x.nombre !== s.nombre) : [...list, { nombre: s.nombre, logo: s.logoUrl }])
  }
  const [bannerWarnings, setBannerWarnings] = useState({})
  const checkBannerRatio = (key, url) => {
    if (!url) { setBannerWarnings((w) => ({ ...w, [key]: null })); return }
    const img = new Image()
    img.onload  = () => setBannerWarnings((w) => ({ ...w, [key]: img.naturalHeight >= img.naturalWidth ? 'ok' : 'warn' }))
    img.onerror = () => setBannerWarnings((w) => ({ ...w, [key]: null }))
    img.src = url
  }
  const [savedOk, setSavedOk]       = useState(false)
  const COLOR_OVERRIDE_KEYS = ['colorAcentoFixture','colorCardFixture','colorTextoNombres','colorTextoZona','colorTextoCategoria','colorTextoScore','colorTextoInfo']
  const COLOR_OVERRIDE_KEYS_GRUPOS = ['colorCardGrupos','colorTextoCardGrupos']
  const COLOR_OVERRIDE_KEYS_ENCURSO = ['colorAcento','colorCardBgEnCurso','colorTituloEnCurso','colorTextoSecEnCurso','colorBtnTextEnCurso']
  const [showPersonalizar, setShowPersonalizar] = useState(() =>
    COLOR_OVERRIDE_KEYS.some((k) => !!(torneos.find((x) => String(x.id) === id)?.[k]))
  )
  const [showPersonalizarGrupos, setShowPersonalizarGrupos] = useState(() =>
    COLOR_OVERRIDE_KEYS_GRUPOS.some((k) => !!(torneos.find((x) => String(x.id) === id)?.[k]))
  )
  const [showPersonalizarEnCurso, setShowPersonalizarEnCurso] = useState(() =>
    COLOR_OVERRIDE_KEYS_ENCURSO.some((k) => !!(torneos.find((x) => String(x.id) === id)?.[k]))
  )
  const [showDrawHeader, setShowDrawHeader] = useState(false)
  const [showDrawCards, setShowDrawCards] = useState(false)
  const [showDrawFondo, setShowDrawFondo] = useState(false)
  const setP = (k, v) => setPersona((p) => ({ ...p, [k]: v }))

  // Al cambiar de template se limpian los overrides visuales (colores, glow, watermark, fondo)
  // para que cada template arranque con su identidad propia.
  // Se preservan: título, imágenes subidas, visibilidad de secciones, colores por categoría.
  const VISUAL_OVERRIDES_DRAW = [
    'bracketConnColor', 'bracketConnGlow', 'bracketWatermark',
    'bracketWatermarkOculto', 'bracketFondoColor', 'drawColorTitulo',
  ]
  const switchBracketTemplate = (newId) => {
    if (newId === (persona.bracketTemplate ?? 'default')) return
    setPersona((p) => {
      const next = { ...p, bracketTemplate: newId }
      VISUAL_OVERRIDES_DRAW.forEach((k) => { next[k] = null })
      next.bracketConnGlow = null   // null → usa el default del theme (true/false según tema)
      next.bracketWatermarkOculto = false
      return next
    })
  }

  // Si el store estaba vacío al montar (navegación directa / refresh), persona queda con
  // defaults. Cuando el fetch async puebla el store, sincronizamos persona con los valores
  // reales del torneo para no sobreescribir templateFixture y otros campos al guardar.
  const _personaSyncedRef = useRef(!!torneos.find((x) => String(x.id) === id))

  const torneo   = torneos.find((t) => String(t.id) === id)
  const isBackend = torneo ? typeof torneo.id === 'string' : false
  const authH     = token  ? { Authorization: `Bearer ${token}` } : {}
  const syncBrackets = (brackets) => {
    if (!isBackend) return
    api.patch(`/torneos/${torneo.id}/brackets`, { brackets }, authH).catch(() => {})
  }
  const syncGrupos = (grupos) => {
    if (!isBackend) return
    api.patch(`/torneos/${torneo.id}/grupos`, { grupos }, authH).catch(() => {})
  }
  const syncEstado = (estado) => {
    if (!isBackend) return
    api.patch(`/torneos/${torneo.id}/estado`, { estado }, authH).catch(() => {})
  }
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

  // ── Bracket fullscreen: Escape para cerrar ───────────────────────────────────
  useEffect(() => {
    if (!bracketFullscreen) return
    const handleKey = (e) => { if (e.key === 'Escape') setBracketFullscreen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [bracketFullscreen])

  // Si el store está vacío (refresh directo), carga todos los torneos del club desde el backend
  useEffect(() => {
    if (torneos.length > 0) return // ya hay datos en el store
    if (!adminClubId) return
    api.get(`/torneos?clubId=${adminClubId}`)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTorneos(data.map((t) => ({
            ...( t.personalizacion ?? {}),
            id: t.id, nombre: t.nombre, categorias: t.categorias ?? [],
            formato: t.formato, genero: t.genero, estado: t.estado,
            cupoLibre: t.cupoLibre, cuposPorCategoria: t.cuposPorCategoria ?? {},
            cupoEsperaPorCategoria: t.cupoEsperaPorCategoria ?? {},
            generoPorCategoria: t.generoPorCategoria ?? {},
            canchasAsignadas: t.canchasAsignadas ?? [],
            fechaInicio: t.fechaInicio, fechaFin: t.fechaFin,
            fechaReprogramada: t.fechaReprogramada ?? null,
            fechaLimiteInscripcion: t.fechaLimiteInscripcion,
            diaInicioEliminatoria: t.diaInicioEliminatoria ?? null,
            horaInicioEliminatoria: t.horaInicioEliminatoria ?? null,
            fechaInicioEliminatoria: t.fechaInicioEliminatoria ?? null,
            fechaInicioQF: t.fechaInicioQF ?? null,
            horaInicioQF: t.horaInicioQF ?? null,
            descripcion: t.descripcion ?? '',
            inscriptos: (t.parejas ?? []).map((p) => ({
              id: p.id, jugador1: p.jugador1, jugador2: p.jugador2,
              jugador1Dni: p.jugador1Dni, jugador2Dni: p.jugador2Dni,
              jugador1Id: p.jugador1Id ?? null, jugador2Id: p.jugador2Id ?? null,
              sinCompanero: p.sinCompanero ?? false, estado: p.estado ?? 'inscripto',
              categoria: p.categoria, fecha: p.fecha,
              disponibilidad: p.disponibilidad ?? [], prefiereMismoDia: p.prefiereMismoDia ?? false,
            })),
            grupos: t.grupos ?? null, brackets: t.brackets ?? {},
            ganador: t.ganador, subcampeon: t.subcampeon,
            puntosPorVictoria: t.puntosPorVictoria ?? 2,
          })))
        }
      })
      .catch(() => {})
  }, [adminClubId, torneos.length])

  // Sync persona cuando el torneo aparece en el store tras el fetch async (cold start).
  // Itera sobre las claves actuales de persona y reemplaza con valores del torneo si existen.
  useEffect(() => {
    if (_personaSyncedRef.current || !torneo) return
    _personaSyncedRef.current = true
    setPersona((prev) => {
      const synced = { ...prev }
      for (const k of Object.keys(prev)) {
        if (torneo[k] !== undefined && torneo[k] !== null) synced[k] = torneo[k]
      }
      return synced
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneo?.id])

  // Sync selectedBracketCat en cold start: el useState inicializa con store vacío y queda en null.
  // Cuando llega el fetch y torneo aparece, setear la categoría correcta.
  useEffect(() => {
    if (selectedBracketCat !== null) return
    if (!torneo) return
    const brackets = torneo.brackets ?? {}
    const cats = Object.keys(brackets)
    if (cats.length > 0) { setSelectedBracketCat(cats[0]); return }
    if (torneo.categorias?.[0]) setSelectedBracketCat(torneo.categorias[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneo?.id, torneo?.brackets])

  // Navegar de vuelta si el torneo fue eliminado
  useEffect(() => {
    if (torneos.length > 0 && !torneo) navigate('/dashboardAdmin/torneos', { replace: true })
  }, [torneo, torneos.length, navigate])

  if (!torneo) return null

  const esFormatoGrupos   = torneo.formato === 'Fase de grupos + Eliminación'
  const puedeToggle       = ['draft', 'open', 'closed'].includes(torneo.estado)
  const puedeGenerarFixture =
    (!torneo.brackets || Object.keys(torneo.brackets).length === 0) &&
    torneo.inscriptos.length >= 2 &&
    ['closed', 'in_progress'].includes(torneo.estado) &&
    !esFormatoGrupos

  const ejecutarCambioEstado = (nuevoEstado) => {
    setEstado(torneo.id, nuevoEstado)
    if (nuevoEstado === 'closed') {
      torneo.inscriptos
        .filter((i) => i.estado === 'espera')
        .forEach((i) => updatePareja(torneo.id, i.id, { estado: 'suplente' }))
    } else if (nuevoEstado === 'open') {
      torneo.inscriptos
        .filter((i) => i.estado === 'suplente')
        .forEach((i) => updatePareja(torneo.id, i.id, { estado: 'espera' }))
    }
    syncEstado(nuevoEstado)
    setToastEstado(nuevoEstado)
  }

  const handleToggleEstado = () => {
    const nuevoEstado = toggleEstado(torneo.estado)
    if (nuevoEstado === 'closed') {
      setModalCerrarInsc(true)
    } else {
      ejecutarCambioEstado(nuevoEstado)
    }
  }

  const handleGenerarFixture = () => {
    try {
      const cats = torneo.categorias
      const newBrackets = { ...(torneo.brackets ?? {}) }
      if (cats.length <= 1) {
        const bracket = generateEliminationBracket(torneo.inscriptos)
        const cat = cats[0] ?? 'default'
        setBracket(torneo.id, cat, bracket)
        newBrackets[cat] = bracket
        setSelectedBracketCat(cat)
      } else {
        let firstCat = null
        cats.forEach((cat) => {
          const parejasCat = torneo.inscriptos.filter((p) => p.categoria === cat)
          if (parejasCat.length >= 2) {
            const bracket = generateEliminationBracket(parejasCat)
            setBracket(torneo.id, cat, bracket)
            newBrackets[cat] = bracket
            if (!firstCat) firstCat = cat
          }
        })
        if (firstCat) setSelectedBracketCat(firstCat)
      }
      syncBrackets(newBrackets)
      setTab('fixture')
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleReprogramar = async (nueva) => {
    if (reprogramarSaving) return
    setReprogramarSaving(true)
    try {
      await api.patch(`/torneos/${torneo.id}/reprogramar`, { fechaReprogramada: nueva || null }, authH)
      updateTorneoFromApi({ id: torneo.id, fechaReprogramada: nueva || null })
      setReprogramarOpen(false)
      setReprogramarFecha('')
    } catch {
      showToast('Error al reprogramar el torneo')
    } finally {
      setReprogramarSaving(false)
    }
  }

  const handleRegistrarResultado = (matchId, datos) => {
    if (!activeBracket) return
    const newBracket = advanceWinner(activeBracket, matchId, datos)
    const newBrackets = { ...(torneo.brackets ?? {}), [selectedBracketCat]: newBracket }
    if (isBracketFinished(newBracket)) {
      const ganadorObj    = getBracketWinner(newBracket)
      const final         = newBracket.rondas[newBracket.rondas.length - 1].partidos[0]
      const subcampeonObj = final.pareja1?.id === ganadorObj?.id ? final.pareja2 : final.pareja1
      const ganadoresData = {
        ganador:    ganadorObj    ? `${ganadorObj.jugador1} / ${ganadorObj.jugador2}`    : null,
        subcampeon: subcampeonObj ? `${subcampeonObj.jugador1} / ${subcampeonObj.jugador2}` : null,
      }
      updateBracket(torneo.id, selectedBracketCat, newBracket)
      setGanadores(torneo.id, ganadoresData)
      syncBrackets(newBrackets)
      if (isBackend) api.patch(`/torneos/${torneo.id}/ganadores`, ganadoresData, authH).catch(() => {})
    } else {
      updateBracket(torneo.id, selectedBracketCat, newBracket)
      syncBrackets(newBrackets)
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
    syncBrackets({ ...(torneo.brackets ?? {}), [selectedBracketCat]: newBracket })
    setModalHorario(null)
  }

  const handleAutoScheduleElim = () => {
    const allBrackets = torneo.brackets ?? {}
    if (!Object.keys(allBrackets).length) return
    setElimAutoState({ status: 'procesando' })

    setTimeout(() => {
      const canchasParaTorneo = torneo.canchasAsignadas?.length
        ? canchas.filter((c) => torneo.canchasAsignadas.includes(c.id))
        : canchas.filter((c) => c.activa)
      const canchasActivas = canchasParaTorneo

      const fechaDia1 = torneo.fechaInicioEliminatoria ?? null
      const horaElim  = torneo.horaInicioEliminatoria  ?? null
      const fechaQF   = torneo.fechaInicioQF            ?? null
      const horaQF    = torneo.horaInicioQF             ?? null

      const isDate = (d) => d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
      const isTime = (t) => t && typeof t === 'string' && t.includes(':')

      if (!isDate(fechaDia1) || !isTime(horaElim) || !canchasActivas.length) {
        setElimAutoState({ status: 'done', asignados: 0, sinConfig: true })
        setTimeout(() => setElimAutoState(null), 4000)
        return
      }

      const timeToMin = (t) => { const [h, m = 0] = (t ?? '00:00').split(':').map(Number); return h * 60 + m }
      const minToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

      // Mapa global de canchas ocupadas para evitar pisadas entre categorías
      // clave: `${courtId}||${dia}||${min}`
      const ocupados = new Set()
      const cortLibre  = (courtId, dia, min) => !ocupados.has(`${courtId}||${dia}||${min}`)
      const reservar   = (courtId, dia, min) => ocupados.add(`${courtId}||${dia}||${min}`)

      // Encuentra el slot más temprano (>= startMin en `dia`) donde haya `needed` canchas libres
      const findSlot = (dia, startMin, needed) => {
        let m = startMin
        for (let i = 0; i < 48; i++) {
          const libres = canchasActivas.filter((c) => cortLibre(c.id, dia, m))
          if (libres.length >= needed) return { m, libres }
          m += elimIntervaloMin
        }
        return { m: startMin, libres: canchasActivas.slice(0, needed) }
      }

      // Ordena categorías: menor cantidad de zonas primero (categoría más baja = slots más temprano)
      const zonasPorCat = {}
      for (const zona of torneo.grupos ?? []) {
        const c = zona.categoria ?? 'default'
        zonasPorCat[c] = (zonasPorCat[c] ?? 0) + 1
      }
      const cats = Object.keys(allBrackets).sort(
        (a, b) => (zonasPorCat[a] ?? 999) - (zonasPorCat[b] ?? 999)
      )

      const newBrackets = JSON.parse(JSON.stringify(allBrackets))
      let totalAsignados = 0

      for (const cat of cats) {
        const bracket = newBrackets[cat]
        if (!bracket?.rondas?.length) continue

        // Identifica dónde empieza QF (nombre exacto o 4 partidos dentro de un bracket ≥ 8)
        const qfIdx = bracket.rondas.findIndex((r) => r.nombre === 'Cuartos de final')
        const hasSplit = qfIdx !== -1 && isDate(fechaQF) && isTime(horaQF)

        const rondasDia1 = hasSplit ? bracket.rondas.slice(0, qfIdx) : bracket.rondas
        const rondasDia2 = hasSplit ? bracket.rondas.slice(qfIdx)    : []

        // Programa rondas del Día 1
        let curMin1 = timeToMin(horaElim)
        for (const ronda of rondasDia1) {
          const partidos = ronda.partidos ?? []
          if (!partidos.length) continue
          let idx = 0
          while (idx < partidos.length) {
            const oleada = partidos.slice(idx, idx + canchasActivas.length)
            const { m, libres } = findSlot(fechaDia1, curMin1, oleada.length)
            oleada.forEach((partido, i) => {
              partido.fecha  = fechaDia1
              partido.hora   = minToTime(m)
              partido.cancha = libres[i].id
              reservar(libres[i].id, fechaDia1, m)
              totalAsignados++
            })
            curMin1 = m + elimIntervaloMin
            idx += canchasActivas.length
          }
        }

        // Programa rondas del Día 2 (QF, SF, Final)
        if (rondasDia2.length) {
          let curMin2 = timeToMin(horaQF)
          for (const ronda of rondasDia2) {
            const partidos = ronda.partidos ?? []
            if (!partidos.length) continue
            let idx = 0
            while (idx < partidos.length) {
              const oleada = partidos.slice(idx, idx + canchasActivas.length)
              const { m, libres } = findSlot(fechaQF, curMin2, oleada.length)
              oleada.forEach((partido, i) => {
                partido.fecha  = fechaQF
                partido.hora   = minToTime(m)
                partido.cancha = libres[i].id
                reservar(libres[i].id, fechaQF, m)
                totalAsignados++
              })
              curMin2 = m + elimIntervaloMin
              idx += canchasActivas.length
            }
          }
        }
      }

      // Guarda todos los brackets actualizados
      for (const [cat, bracket] of Object.entries(newBrackets)) {
        updateBracket(torneo.id, cat, bracket)
      }
      syncBrackets(newBrackets)
      setElimAutoState({ status: 'done', asignados: totalAsignados })
      setTimeout(() => setElimAutoState(null), 4000)
    }, 500)
  }

  const handleBajaInscripto = async (inscriptoId, ins) => {
    if (isBackend && typeof inscriptoId === 'string') {
      try {
        await api.delete(`/torneos/${torneo.id}/parejas/${inscriptoId}`, authH)
      } catch {
        showToast('Error al dar de baja. Intentá de nuevo.')
        return
      }
    }
    bajaInscripto(torneo.id, inscriptoId)
    if (ins?.estado !== 'espera') {
      const primerEspera = torneo.inscriptos.find(
        (i) => i.id !== inscriptoId && i.estado === 'espera' && i.categoria === ins?.categoria
      )
      if (primerEspera) {
        if (isBackend && typeof primerEspera.id === 'string') {
          api.patch(`/torneos/${torneo.id}/parejas/${primerEspera.id}`, { estado: 'inscripto' }, authH).catch(() => {})
        }
        updatePareja(torneo.id, primerEspera.id, { estado: 'inscripto' })
      }
    }
  }

  const handlePromoverEspera = async (ins) => {
    if (isBackend && typeof ins.id === 'string') {
      try {
        await api.patch(`/torneos/${torneo.id}/parejas/${ins.id}`, { estado: 'inscripto' }, authH)
      } catch (err) {
        setConfirmModal({ titulo: 'No se pudo promover la pareja', mensaje: err.message || 'Error desconocido.', onConfirmar: null })
        return
      }
    }
    updatePareja(torneo.id, ins.id, { estado: 'inscripto' })
  }

  const handleAgregarAdmin = async (datos) => {
    if (isBackend) {
      try {
        const p = await api.post(`/torneos/${torneo.id}/parejas`, datos, authH)
        addParejaFromApi(torneo.id, {
          id: p.id, jugador1: p.jugador1, jugador2: p.jugador2,
          jugador1Dni: p.jugador1Dni, jugador2Dni: p.jugador2Dni,
          jugador1Id: p.jugador1Id ?? null, jugador2Id: p.jugador2Id ?? null,
          sinCompanero: p.sinCompanero ?? false, estado: p.estado ?? 'inscripto',
          categoria: p.categoria, fecha: p.fecha,
          disponibilidad: p.disponibilidad ?? [], prefiereMismoDia: p.prefiereMismoDia ?? false,
        })
        showToast(`Pareja agregada: ${p.jugador1} / ${p.jugador2}`)
      } catch (err) {
        setConfirmModal({ titulo: 'No se pudo agregar la pareja', mensaje: err.message || 'Error desconocido.', onConfirmar: null })
      }
      return
    }
    addPareja(torneo.id, datos)
    showToast(`Pareja agregada: ${datos.jugador1} / ${datos.jugador2}`)
  }

  // ── Handlers grupos ──────────────────────────────────────────────────────────

  const handleGenerarGrupos = () => {
    const parejasTitulares = torneo.inscriptos.filter((p) => p.estado === 'inscripto')
    const categorias = [...new Set(parejasTitulares.map((p) => p.categoria).filter(Boolean))]
    const conUnaSola = categorias.filter((c) => parejasTitulares.filter((p) => p.categoria === c).length === 1)
    const conExceso  = categorias.filter((c) => parejasTitulares.filter((p) => p.categoria === c).length > MAX_PAREJAS_POR_CATEGORIA)

    if (conExceso.length > 0) {
      showToast(`Cupo excedido en: ${conExceso.join(', ')}. Máx. 32 parejas por categoría.`)
      return
    }

    const ejecutar = () => {
      try {
        const shuffled = [...parejasTitulares].sort(() => Math.random() - 0.5)
        const grupos = generateGroupPhase(shuffled)
        setGrupos(torneo.id, grupos)
        syncGrupos(grupos)
        setTab('grupos')
      } catch (e) { showToast(e.message) }
    }

    const pasoConUnaSola = () => {
      if (conUnaSola.length > 0) {
        setConfirmModal({
          titulo: 'Categorías con una sola pareja',
          mensaje: `Las siguientes categorías tienen solo 1 pareja y no van a ser incluidas en los grupos:\n${conUnaSola.join(', ')}\n\n¿Querés continuar igual?`,
          onConfirmar: () => { setConfirmModal(null); ejecutar() },
        })
      } else {
        ejecutar()
      }
    }

    const tieneResultados = (torneo.grupos ?? []).some((z) =>
      (z.partidos ?? []).some((p) => p.resultado !== null && p.resultado !== undefined)
    )
    if (tieneResultados) {
      setConfirmModal({
        titulo: 'Ya hay resultados cargados',
        mensaje: 'Regenerar los grupos va a borrar esos resultados para siempre.\n\n¿Confirmás que querés continuar?',
        onConfirmar: () => { setConfirmModal(null); pasoConUnaSola() },
      })
    } else {
      pasoConUnaSola()
    }
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
    // Swap: intercambiar solo las dos parejas, preservar slots de otras zonas
    const newGrupos = swapParejas(torneo.grupos, swapSource.zonaIdx, swapSource.parejaIdx, zonaIdx, parejaIdx)
    updateGrupos(torneo.id, newGrupos)
    syncGrupos(newGrupos)
    setSwapSource(null)
  }

  const handleAutoSchedule = () => {
    setAutoScheduleState({ status: 'procesando' })
    setTimeout(() => {
      const canchasParaTorneo = torneo.canchasAsignadas?.length
        ? canchas.filter((c) => torneo.canchasAsignadas.includes(c.id))
        : canchas.filter((c) => c.activa)
      const parejasTitulares = torneo.inscriptos.filter((p) => p.estado === 'inscripto')
      const diaElim  = torneo.diaInicioEliminatoria  ?? null
      const horaElim = torneo.horaInicioEliminatoria ?? null
      // Días del torneo válidos para fase de grupos (para disponibilidad implícita)
      const diasTorneo = getDiasEnRango(torneo.fechaInicio, torneo.fechaFin)
        .filter((d) => esSlotDeGrupos(d, '00:00', diaElim, horaElim))

      // Intento 1: respetar los grupos actuales (preserva ajustes manuales)
      let mejorGrupos     = autoScheduleGroups(torneo.grupos, canchasParaTorneo, intervaloPartidoMin, diaElim, horaElim, diasTorneo)
      let mejorSinHorario = mejorGrupos.flatMap((z) => z.partidos).filter((p) => p.sinHorario).length

      // Si quedaron sin horario, buscar mejor combinación probando reagrupaciones aleatorias
      if (mejorSinHorario > 0) {
        const MAX_INTENTOS = 25
        for (let i = 0; i < MAX_INTENTOS && mejorSinHorario > 0; i++) {
          const shuffled   = [...parejasTitulares].sort(() => Math.random() - 0.5)
          const grupos     = generateGroupPhase(shuffled)
          const candidato  = autoScheduleGroups(grupos, canchasParaTorneo, intervaloPartidoMin, diaElim, horaElim, diasTorneo)
          const sinHorario = candidato.flatMap((z) => z.partidos).filter((p) => p.sinHorario).length
          if (sinHorario < mejorSinHorario) {
            mejorGrupos     = candidato
            mejorSinHorario = sinHorario
          }
        }
      }

      const todosPartidos = mejorGrupos.flatMap((z) => z.partidos)
      const asignados     = todosPartidos.filter((p) => p.slot).length
      updateGrupos(torneo.id, mejorGrupos)
      syncGrupos(mejorGrupos)
      setAutoScheduleState({ status: 'done', asignados, sinHorario: mejorSinHorario })
      setTimeout(() => setAutoScheduleState(null), 4000)
    }, 700)
  }

  const handleAbrirAsignarManual = (zonaIdx, matchId) => {
    const partido = torneo.grupos?.[zonaIdx]?.partidos?.find((p) => p.id === matchId)
    if (!partido) return
    setModalAsignarManual({ matchId, zonaIdx, partido })
  }

  const handleConfirmarAsignacionManual = (dia, hora, canchaId) => {
    if (!modalAsignarManual) return
    const newGrupos = JSON.parse(JSON.stringify(torneo.grupos))
    const partido   = newGrupos[modalAsignarManual.zonaIdx]?.partidos?.find((p) => p.id === modalAsignarManual.matchId)
    if (partido) {
      partido.slot       = { dia, hora }
      partido.cancha     = canchaId
      partido.sinHorario = false
    }
    updateGrupos(torneo.id, newGrupos)
    syncGrupos(newGrupos)
    setModalAsignarManual(null)
  }

  const handleConfirmarGrupos = () => {
    const sinHorario = torneo.grupos?.flatMap((z) => z.partidos).filter((p) => p.sinHorario).length ?? 0
    if (sinHorario > 0) {
      if (!window.confirm(`Hay ${sinHorario} partido${sinHorario !== 1 ? 's' : ''} sin horario asignado. ¿Confirmás igual?`)) return
    }
    setEstado(torneo.id, 'in_progress')
    syncEstado('in_progress')
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
    syncGrupos(newGrupos)
  }

  const handleResolveTie = (zonaIdx, primero, segundo) => {
    resolveGroupTie(torneo.id, zonaIdx, primero, segundo)
    const grupos = useTorneosStore.getState().torneos.find((t) => t.id === torneo.id)?.grupos
    if (grupos) syncGrupos(grupos)
  }

  const handleGenerarBracketPreliminar = () => {
    try {
      const cats        = [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))]
      const newBrackets = { ...(torneo.brackets ?? {}) }
      if (cats.length <= 1) {
        const bracket = generateAPASkeletonBracket(torneo.grupos)
        const cat     = cats[0] ?? torneo.categorias[0] ?? 'default'
        setBracket(torneo.id, cat, bracket)
        newBrackets[cat] = bracket
        setSelectedBracketCat(cat)
      } else {
        let firstCat = null
        cats.forEach((cat) => {
          const zonasCat = torneo.grupos.filter((z) => z.categoria === cat)
          const bracket  = generateAPASkeletonBracket(zonasCat)
          setBracket(torneo.id, cat, bracket)
          newBrackets[cat] = bracket
          if (!firstCat) firstCat = cat
        })
        if (firstCat) setSelectedBracketCat(firstCat)
      }
      syncBrackets(newBrackets)
      setTab('fixture')
    } catch (e) { showToast(e.message) }
  }

  const handleGenerarFaseEliminatoria = () => {
    try {
      const cats        = [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))]
      const newBrackets = { ...(torneo.brackets ?? {}) }
      if (cats.length <= 1) {
        let bracket   = generateAPAEliminationBracket(torneo.grupos)
        const skelCat = torneo.brackets?.[cats[0] ?? torneo.categorias[0] ?? 'default']
        if (skelCat?.isSkeleton) bracket = mergeScheduleFromSkeleton(bracket, skelCat)
        const cat = cats[0] ?? torneo.categorias[0] ?? 'default'
        setBracket(torneo.id, cat, bracket)
        newBrackets[cat] = bracket
        setSelectedBracketCat(cat)
      } else {
        let firstCat = null
        cats.forEach((cat) => {
          const zonasCat = torneo.grupos.filter((z) => z.categoria === cat)
          let bracket    = generateAPAEliminationBracket(zonasCat)
          if (torneo.brackets?.[cat]?.isSkeleton)
            bracket = mergeScheduleFromSkeleton(bracket, torneo.brackets[cat])
          setBracket(torneo.id, cat, bracket)
          newBrackets[cat] = bracket
          if (!firstCat) firstCat = cat
        })
        if (firstCat) setSelectedBracketCat(firstCat)
      }
      syncBrackets(newBrackets)
      setTab('fixture')
    } catch (e) { showToast(e.message) }
  }

  const gruposConfirmados = torneo.grupos !== null && ['in_progress', 'finished'].includes(torneo.estado)
  const gruposPendientes  = torneo.grupos !== null && torneo.estado === 'closed'
  const inscriptosActivos = torneo.inscriptos.filter((i) => i.estado === 'inscripto')

  const puedeGenerarGrupos =
    torneo.grupos === null &&
    inscriptosActivos.length >= 2 &&
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
          {catLabel(torneo, c, true)}
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
              <span className="text-slate-500 font-medium">Inicio</span> {fmtFecha(torneo.fechaInicio)}
              <span className="mx-0.5">→</span>
              <span className="text-slate-500 font-medium">Fin</span>
              <span className={torneo.fechaReprogramada ? 'line-through text-slate-300' : ''}>{fmtFecha(torneo.fechaFin)}</span>
              {torneo.fechaReprogramada && (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <Flag size={11} /> Reprogr. {fmtFecha(torneo.fechaReprogramada)}
                </span>
              )}
            </span>
            <span>{torneo.formato}</span>
            <span>{torneo.categorias.join(', ')}</span>
            {torneo.genero && (
              <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] ${
                torneo.genero === 'Femenino'  ? 'text-pink-600 bg-pink-50 border-pink-200' :
                torneo.genero === 'Mixto'     ? 'text-violet-600 bg-violet-50 border-violet-200' :
                torneo.genero === 'Ambos'     ? 'text-teal-600 bg-teal-50 border-teal-200' :
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
        <div className="flex border-b border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {[
            { key: 'inscriptos', label: 'Parejas inscriptas', icon: Users,     count: torneo.inscriptos.filter((i) => i.estado === 'inscripto').length },
            ...(esFormatoGrupos ? [{ key: 'grupos',   label: 'Grupos',          icon: GitMerge, count: torneo.grupos ? torneo.grupos.length : null }] : []),
            { key: 'fixture',    label: 'Fixture / Cuadro',   icon: Zap,       count: activeBracket ? activeBracket.rondas.length : null },
            ...(torneo.estado !== 'finished' ? [{ key: 'visual', label: 'Personalización', icon: Palette, count: null }] : []),
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
              const confirmados = lista.filter((i) => i.estado === 'inscripto')
              const enEspera    = lista.filter((i) => i.estado === 'espera')
              const suplentes   = lista.filter((i) => i.estado === 'suplente')

              return confirmados.length === 0 && enEspera.length === 0 && suplentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Users size={40} strokeWidth={1.2} />
                  <p className="text-sm">Todavía no hay parejas inscriptas{multiCat ? ` en ${catLabel(torneo, catTab)}` : ''}</p>
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
                        {enEspera.map((ins) => {
                          const cupoCat = torneo.cupoLibre ? null : ((torneo.cuposPorCategoria ?? {})[ins.categoria] ?? null)
                          const confirmadosCat = confirmados.filter((c) => c.categoria === ins.categoria).length
                          const cupoLleno = cupoCat !== null && confirmadosCat >= cupoCat
                          return (
                          <EsperaCard
                            key={ins.id}
                            ins={ins}
                            estadoTorneo={torneo.estado}
                            cupoLleno={cupoLleno}
                            onPromover={() => handlePromoverEspera(ins)}
                            onBaja={() => handleBajaInscripto(ins.id, ins)}
                          />
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {suplentes.length > 0 && (
                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Users size={11} />
                          Suplentes ({suplentes.length})
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2">
                        {suplentes.map((ins) => (
                          <EsperaCard
                            key={ins.id}
                            ins={ins}
                            estadoTorneo={torneo.estado}
                            cupoLleno={false}
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
                      {inscriptosActivos.length} parejas inscriptas.<br />
                      El sistema calcula las zonas automáticamente.
                    </p>
                    <button
                      onClick={handleGenerarGrupos}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20"
                    >
                      <GitMerge size={15} /> Generar grupos
                    </button>
                  </>
                ) : inscriptosActivos.length < 2 ? (
                  <p className="text-sm text-center">Necesitás al menos 2 parejas para generar grupos.</p>
                ) : (
                  <p className="text-sm text-center">Cerrá la inscripción para poder generar los grupos.</p>
                )}
              </div>
            )}

            {/* Grupos generados — modo setup (intercambio antes de confirmar) */}
            {gruposPendientes && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-slate-700 text-sm font-semibold">Revisá y ajustá las zonas</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Hacé clic en una pareja para seleccionarla, luego clic en otra para intercambiarlas.
                      {multiCat && ' Solo podés intercambiar dentro de la misma categoría.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 whitespace-nowrap">Duración est.</label>
                      <select
                        value={intervaloPartidoMin}
                        onChange={(e) => setIntervaloPartidoMin(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
                      >
                        <option value={60}>60 min</option>
                        <option value={75}>75 min (1:15)</option>
                        <option value={90}>90 min (1:30)</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAutoSchedule}
                      className="flex items-center gap-2 border border-brand-300 text-brand-600 hover:bg-brand-50 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <Zap size={14} /> Auto-asignar
                    </button>
                    <button
                      onClick={handleGenerarGrupos}
                      className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                      title="Re-sortear grupos si hay incompatibilidades de disponibilidad"
                    >
                      <Shuffle size={14} /> Regenerar
                    </button>
                    <button
                      onClick={handleConfirmarGrupos}
                      className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-brand-500/20"
                    >
                      <CheckCheck size={15} /> Confirmar grupos
                    </button>
                  </div>
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
                      <ZonaSetupCard key={z.nombre + (z.categoria ?? '')} zona={z} zonaIdx={i} swapSource={swapSource} onSelectPair={handleSelectPair} canchaName={canchaName} onAsignarManual={handleAbrirAsignarManual} />
                    ))}
                </div>
              </div>
            )}

            {/* Grupos confirmados — modo juego */}
            {gruposConfirmados && (
              <div className="flex flex-col gap-4">
                {/* Fase de grupos completa → generar bracket final (o confirmar si hay skeleton) */}
                {isGroupPhaseFinished(torneo.grupos) && (!torneo.brackets || Object.keys(torneo.brackets).length === 0 || activeBracket?.isSkeleton) && (
                  <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <p className="text-emerald-700 text-sm font-semibold">
                      ✓ Fase de grupos completa — {getAllClasificados(torneo.grupos).length} parejas clasificadas
                    </p>
                    <button
                      onClick={handleGenerarFaseEliminatoria}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      <Zap size={13} />
                      {activeBracket?.isSkeleton ? 'Confirmar bracket' : 'Generar fase eliminatoria'}
                    </button>
                  </div>
                )}

                {/* Grupos en curso → generar bracket preliminar para pre-asignar horarios */}
                {!isGroupPhaseFinished(torneo.grupos) && (!torneo.brackets || Object.keys(torneo.brackets).length === 0 || activeBracket?.isSkeleton) && (
                  <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-amber-800 text-sm font-semibold">Bracket preliminar disponible</p>
                      <p className="text-amber-700 text-xs mt-0.5">Pre-asigná horarios del Draw aunque los grupos no estén terminados.</p>
                    </div>
                    <button
                      onClick={handleGenerarBracketPreliminar}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      <Zap size={13} /> {activeBracket?.isSkeleton ? 'Regenerar preliminar' : 'Bracket preliminar'}
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
                    puntosPorVictoria={torneo.puntosPorVictoria ?? 2}
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
                  <span className="text-xs font-semibold text-slate-600 flex-1">Colores del cuadro</span>
                  <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">No afecta la landing</span>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {/* Colores del cuadro */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400">Color por categoría</span>
                    <div className="flex flex-wrap gap-2">
                      {torneo.categorias.map((cat) => {
                        const color = persona.bracketColores?.[cat] || ''
                        return (
                          <div key={cat} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                            <input
                              type="color"
                              value={color || club?.colorPrimario || '#10b981'}
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
                  </div>

                  {/* Fondo de card por categoría */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400">Fondo de card</span>
                    <div className="flex flex-wrap gap-2">
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
                  {/* Chip bracket preliminar */}
                  {activeBracket?.isSkeleton && (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      Bracket preliminar — confirmá en Grupos cuando terminen
                    </span>
                  )}
                  {/* ── Auto-asignar horarios Draw ── */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={elimIntervaloMin}
                      onChange={(e) => setElimIntervaloMin(Number(e.target.value))}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
                    >
                      <option value={60}>60 min</option>
                      <option value={75}>75 min</option>
                      <option value={90}>90 min</option>
                    </select>
                    <button
                      onClick={handleAutoScheduleElim}
                      disabled={elimAutoState?.status === 'procesando'}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border shadow-sm disabled:opacity-50 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300"
                    >
                      <Zap size={12} />
                      {elimAutoState?.status === 'procesando' ? 'Asignando…' : 'Auto-asignar'}
                    </button>
                    {elimAutoState?.status === 'done' && (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${elimAutoState.sinConfig ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                        {elimAutoState.sinConfig
                          ? 'Falta la fecha real del 1er día del draw (editá el torneo)'
                          : `${elimAutoState.asignados} partido${elimAutoState.asignados !== 1 ? 's' : ''} asignado${elimAutoState.asignados !== 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>
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
                      const color = torneo.bracketColores?.[cat] || torneo.colorAcento || club?.colorPrimario || '#10b981'
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
                            bracketTemplate="default"
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
                    bracketTemplate="default"
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
                    bracketTemplate="default"
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
          <div className="flex flex-col">

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {[
                { key: 'flyer',    label: '📢 Flyer' },
                { key: 'encurso',  label: '⚡ En curso' },
                { key: 'fixture',  label: '📋 Fixture / Grupos' },
                { key: 'draw',     label: '🏆 Draw' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setVisualTab(key)}
                  className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
                    visualTab === key
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6 flex flex-col gap-6">

              {/* ── SUB-TAB: Flyer (previa al torneo) ── */}
              {visualTab === 'flyer' && (
                <>
                  <p className="text-xs text-slate-400">Se muestra en la landing cuando el torneo tiene inscripción abierta y la fecha de inicio está próxima (≤14 días).</p>

                  {/* Toggle modo */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Tipo de visualización</label>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                      {[
                        { val: 'auto',   label: '✦ Diseño automático' },
                        { val: 'imagen', label: '🖼 Imagen propia' },
                      ].map(({ val, label }) => (
                        <button key={val} type="button" onClick={() => setP('modoLandingFlyer', val)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            (persona.modoLandingFlyer ?? 'auto') === val
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modo automático */}
                  {(persona.modoLandingFlyer ?? 'auto') === 'auto' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'premioPrimero',   label: '🥇 1° Puesto',  placeholder: 'Ej: $50.000' },
                          { key: 'premioSegundo',   label: '🥈 2° Puesto',  placeholder: 'Ej: $30.000' },
                          { key: 'premioSemifinal', label: '🥉 Semifinal',  placeholder: 'Ej: $15.000' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                            <input type="text" value={persona[key]} onChange={(e) => setP(key, e.target.value)} placeholder={placeholder}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Imagen de fondo <span className="font-normal text-slate-400">(opcional — si no se carga usa diseño geométrico)</span></label>
                        <ImageZonePreview src={persona.imagenFondo}>
                          <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                            <div className="flex-1 rounded bg-brand-400/30 flex items-center justify-center">
                              <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest">Flyer</span>
                            </div>
                            <div className="h-2 rounded bg-slate-200" />
                          </div>
                        </ImageZonePreview>
                        <ImagenFileInput value={persona.imagenFondo} onChange={(v) => setP('imagenFondo', v)} hint="Se usa como fondo del flyer en la landing. Recomendado: 1200×400px." />
                      </div>
                    </>
                  )}

                  {/* Modo imagen propia */}
                  {(persona.modoLandingFlyer ?? 'auto') === 'imagen' && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Flyer personalizado</label>
                      <ImageZonePreview src={persona.imagenFondo}>
                        <div className="w-full h-full flex items-center justify-center p-1.5">
                          <div className="w-full h-full rounded bg-brand-400/30 flex items-center justify-center">
                            <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest">Flyer</span>
                          </div>
                        </div>
                      </ImageZonePreview>
                      <ImagenFileInput value={persona.imagenFondo} onChange={(v) => setP('imagenFondo', v)} hint="Se muestra a ancho completo en la landing. Recomendado: 1200×400px (16:5)." />
                    </div>
                  )}
                </>
              )}

              {/* ── SUB-TAB: En curso ── */}
              {visualTab === 'encurso' && (
                <>
                  <p className="text-xs text-slate-400">Card informativa que se muestra en la landing cuando el torneo está activo (en curso).</p>

                  {/* ── Selector de template ── */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Diseño de card</label>
                    <p className="text-xs text-slate-400 mb-3">Elegí el estilo visual. Podés personalizar el color e imagen de fondo independientemente del template elegido.</p>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                      {[
                        { id: 1,  name: 'Sport Hero',    bg: 'linear-gradient(135deg,#080b0f,#0d1117)' },
                        { id: 2,  name: 'Neon Grid',     bg: '#050508',   neon: true },
                        { id: 3,  name: 'Split Panel',   bg: '__split__' },
                        { id: 4,  name: 'Glass',         bg: 'linear-gradient(135deg,#0a0a18,#0d1020)', glass: true },
                        { id: 5,  name: 'Stadium',       bg: '#080810',   rays: true },
                        { id: 6,  name: 'Scoreboard',    bg: '#0a0a0c',   board: true },
                        { id: 7,  name: 'Minimal',       bg: '#f1f5f9',   light: true },
                        { id: 8,  name: 'Fire',          bg: 'linear-gradient(135deg,#1a0400,#2d0800)' },
                        { id: 9,  name: 'Ocean Night',   bg: 'linear-gradient(135deg,#020b1a,#03122e)' },
                        { id: 10, name: 'Gold Luxury',   bg: 'linear-gradient(135deg,#0a0800,#100e00)', gold: true },
                        { id: 11, name: 'Court Lines',   bg: 'linear-gradient(135deg,#080f0a,#0d1810)' },
                        { id: 12, name: 'Big Stats',     bg: '#060810' },
                        { id: 13, name: 'Carbon Strip',  bg: '#0c0c0e',   strip: true },
                        { id: 14, name: 'Sunset Warm',   bg: 'linear-gradient(135deg,#1a0800,#2d1000)' },
                        { id: 15, name: 'Ribbon',        bg: '#0a0c10',   ribbon: true },
                        { id: 16, name: 'Retro Stripes', bg: '#0a0a0c',   stripes: true },
                        { id: 17, name: 'Ticket',        bg: '#f8fafc',   light: true, ticket: true },
                        { id: 18, name: 'Badge',         bg: '#060810',   badge: true },
                        { id: 19, name: 'Editorial',     bg: '#0c0c0e' },
                        { id: 20, name: 'Cinematic',     bg: '#000',      cinema: true },
                      ].map(({ id, name, bg, ...flags }) => {
                        const cp = persona.colorAcento || club?.colorPrimario || '#10b981'
                        const finalBg = bg === '__split__'
                          ? `linear-gradient(90deg,#0d1117 55%,${cp} 55%)`
                          : bg
                        const sel = (persona.templateEnCurso ?? 1) === id
                        return (
                          <button key={id} type="button" onClick={() => setP('templateEnCurso', id)}
                            className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${sel ? 'ring-2 ring-offset-1 ring-brand-500 scale-[1.04]' : 'hover:scale-[1.02] hover:ring-1 hover:ring-slate-300'}`}>
                            <div className="h-12 w-full relative" style={{ background: finalBg }}>
                              {flags.neon    && <div className="absolute inset-0 opacity-80" style={{ backgroundImage:`linear-gradient(${cp}18 1px,transparent 1px),linear-gradient(90deg,${cp}18 1px,transparent 1px)`, backgroundSize:'12px 12px' }}/>}
                              {flags.glass   && <div className="absolute inset-1 rounded-lg" style={{ background:'rgba(255,255,255,0.07)', border:`1px solid ${cp}30` }}/>}
                              {flags.rays    && <><div className="absolute top-0 left-1/3 w-0.5 h-full" style={{background:`linear-gradient(180deg,${cp}60,transparent)`,transform:'rotate(-6deg)',transformOrigin:'top'}}/><div className="absolute top-0 left-1/2 w-1 h-full" style={{background:`linear-gradient(180deg,${cp}50,transparent)`,transformOrigin:'top'}}/></>}
                              {flags.board   && <div className="absolute inset-1.5 rounded flex items-center justify-center" style={{border:`1px solid ${cp}40`}}><span className="font-mono font-black text-[9px]" style={{color:cp,textShadow:`0 0 6px ${cp}`}}>00</span></div>}
                              {flags.light   && <div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-0.5 rounded-full" style={{backgroundColor:cp}}/></div>}
                              {flags.gold    && <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 70% 40%,rgba(212,175,55,0.3),transparent 60%)'}}/>}
                              {flags.strip   && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{backgroundColor:cp}}/>}
                              {flags.ribbon  && <div className="absolute" style={{top:'-10%',right:'12%',width:'38%',height:'120%',backgroundColor:`${cp}55`,transform:'skewX(-8deg)'}}/>}
                              {flags.stripes && <><div className="absolute top-0 left-0 right-0 h-2" style={{backgroundColor:cp}}/><div className="absolute top-3 left-0 right-0 h-1" style={{backgroundColor:`${cp}55`}}/></>}
                              {flags.ticket  && <div className="absolute right-0 top-0 bottom-0 w-7 border-l-2 border-dashed border-slate-300" style={{background:`${cp}10`}}/>}
                              {flags.badge   && <div className="absolute inset-0 flex items-center justify-center"><div className="w-7 h-7 rounded-full" style={{border:`2px solid ${cp}60`}}/></div>}
                              {flags.cinema  && <><div className="absolute top-0 left-0 right-0 h-1.5 bg-black z-10"/><div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black z-10"/></>}
                              <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full opacity-80" style={{backgroundColor:cp}}/>
                              {sel && <div className="absolute inset-0 rounded-xl" style={{border:`2px solid ${cp}`,boxShadow:`inset 0 0 8px ${cp}30`}}/>}
                            </div>
                            <div className={`px-1 py-1 text-center ${sel ? 'bg-brand-50' : 'bg-slate-50'}`}>
                              <p className={`text-[9px] font-semibold leading-tight truncate ${sel ? 'text-brand-600' : 'text-slate-500'}`}>{name}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Texto del botón CTA */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Texto del botón</label>
                    <input type="text" value={persona.ctaEnCurso} onChange={(e) => setP('ctaEnCurso', e.target.value)}
                      placeholder="Seguir el torneo (default)"
                      className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                    <p className="text-slate-400 text-xs mt-1">Ej: "Ver resultados", "Seguir en vivo", "Ver el cuadro".</p>
                  </div>

                  {/* Toggle personalización En curso */}
                  {(() => {
                    const hayOverrides = COLOR_OVERRIDE_KEYS_ENCURSO.some((k) => !!persona[k])
                    return (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <button type="button" onClick={() => setShowPersonalizarEnCurso((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600">Personalizar colores</span>
                            {hayOverrides
                              ? <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">{COLOR_OVERRIDE_KEYS_ENCURSO.filter((k) => !!persona[k]).length} activo{COLOR_OVERRIDE_KEYS_ENCURSO.filter((k) => !!persona[k]).length !== 1 ? 's' : ''}</span>
                              : <span className="text-[10px] text-slate-400">Opcional · el template ya viene diseñado</span>}
                          </div>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showPersonalizarEnCurso ? 'rotate-180' : ''}`} />
                        </button>
                        {showPersonalizarEnCurso && (
                          <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
                            <p className="text-xs text-slate-400">Vacío = contraste automático según el template.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {[
                                { key: 'colorAcento',          label: 'Acento (badge, chips, número, botón)', placeholder: 'color del club' },
                                { key: 'colorCardBgEnCurso',   label: 'Fondo de la card',                    placeholder: 'default del template' },
                                { key: 'colorTituloEnCurso',   label: 'Título del torneo',                   placeholder: 'automático' },
                                { key: 'colorTextoSecEnCurso', label: 'Textos secundarios (TORNEO, PAREJAS)', placeholder: 'automático' },
                                { key: 'colorBtnTextEnCurso',  label: 'Texto del botón CTA',                 placeholder: 'automático' },
                              ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                  <label className="text-[11px] text-slate-500 block mb-1">{label}</label>
                                  <div className="flex items-center gap-2">
                                    <input type="color" value={persona[key] || '#ffffff'} onChange={(e) => setP(key, e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                                    <input type="text" value={persona[key]} onChange={(e) => setP(key, e.target.value)} placeholder={placeholder} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                    {persona[key] && <button type="button" onClick={() => setP(key, '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Imagen de fondo — exclusiva de la card en curso */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Imagen de fondo <span className="font-normal text-slate-400">(opcional)</span></label>
                    <ImageZonePreview src={persona.imagenFondoEnCurso}>
                      <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                        <div className="flex-1 rounded bg-brand-400/40 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-brand-700 uppercase tracking-wider">En curso</span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200" />
                        <div className="h-1.5 w-2/3 rounded bg-slate-200" />
                      </div>
                    </ImageZonePreview>
                    <ImagenFileInput value={persona.imagenFondoEnCurso} onChange={(v) => setP('imagenFondoEnCurso', v)} hint="Imagen de fondo de la card en la landing. Si no se carga usa diseño geométrico." />
                  </div>

                </>
              )}

              {/* ── SUB-TAB: Fixture ── */}
              {visualTab === 'fixture' && (
                <>
                  {/* ── Selector de template ── */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Diseño de cards</label>
                    <p className="text-xs text-slate-400 mb-3">Elegí el estilo visual de los partidos. Más templates próximamente.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        {
                          id: 1, name: 'Estándar',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden bg-[#0d1117] flex flex-col">
                              <div className="h-1.5 w-full" style={{ backgroundColor: cp, opacity: 0.5 }} />
                              <div className="flex-1 flex items-center justify-between px-2.5 gap-1">
                                <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full bg-white/10"/><div className="w-8 h-1.5 rounded bg-white/20"/></div>
                                <div className="flex gap-0.5"><div className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center" style={{ backgroundColor: `${cp}20`, color: cp }}>6</div><div className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center bg-white/5 text-white/20">4</div></div>
                                <div className="flex items-center gap-1 justify-end"><div className="w-8 h-1.5 rounded bg-white/20"/><div className="w-3.5 h-3.5 rounded-full bg-white/10"/></div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 2, name: 'Premier Padel',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden bg-black flex flex-col relative">
                              <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px)`, backgroundSize: '100% 16px' }} />
                              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: cp }} />
                              <div className="relative flex-1 grid grid-cols-3 items-center px-2 gap-1">
                                <div className="flex flex-col gap-0.5"><div className="text-[8px] font-black uppercase text-white tracking-tight leading-none">GARCIA</div><div className="text-[6px] text-white/30">Juan</div><div className="text-[7px] font-bold uppercase text-white/50 leading-none">LOPEZ</div></div>
                                <div className="flex justify-center gap-1">
                                  <div className="flex flex-col items-center gap-0.5"><span className="text-[9px] font-black font-mono leading-none" style={{ color: cp }}>6</span><span className="text-[9px] font-black font-mono leading-none text-white/20">4</span></div>
                                  <div className="flex flex-col items-center gap-0.5"><span className="text-[9px] font-black font-mono leading-none text-white/20">4</span><span className="text-[9px] font-black font-mono leading-none" style={{ color: cp }}>6</span></div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5"><div className="text-[8px] font-black uppercase text-white tracking-tight leading-none text-right">MARTINEZ</div><div className="text-[6px] text-white/30 text-right">Pedro</div><div className="text-[7px] font-bold uppercase text-white/50 leading-none text-right">FERNANDEZ</div></div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 3, name: 'Pro Tournament',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden bg-white flex flex-col">
                              <div className="h-5 w-full flex items-center px-2 gap-1.5" style={{ backgroundColor: '#1A1A2E' }}>
                                <div className="text-[7px] font-bold text-white uppercase tracking-wide">ZONA A</div>
                                <div className="text-[6px] text-white/50">10:30</div>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-2 gap-1" style={{ borderLeft: `3px solid ${cp}` }}>
                                <div className="w-10 h-1.5 rounded bg-slate-200"/>
                                <div className="flex gap-0.5"><div className="text-[8px] font-bold px-1 rounded bg-slate-100" style={{ color: cp }}>6</div><div className="text-[8px] font-bold px-1 rounded bg-slate-100 text-slate-300">3</div></div>
                                <div className="w-10 h-1.5 rounded bg-slate-200"/>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 7, name: 'Dark Premium',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col" style={{ background: '#111111' }}>
                              <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: `1px solid ${cp}` }}>
                                <div className="text-[7px] font-bold uppercase tracking-widest" style={{ color: cp }}>ZONA A</div>
                                <div className="text-[6px]" style={{ color: '#888' }}>10:30</div>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-2 gap-1" style={{ background: '#181818' }}>
                                <div className="w-8 h-1.5 rounded" style={{ background: '#333' }}/>
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="text-[9px] font-black" style={{ color: cp }}>6</div>
                                  <div className="text-[9px] font-black" style={{ color: '#333' }}>3</div>
                                </div>
                                <div className="w-8 h-1.5 rounded" style={{ background: '#333' }}/>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 8, name: 'Luxury Gold',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden relative flex flex-col" style={{ background: '#0D0B08', border: '1px solid #8B6914' }}>
                              <div className="flex items-center justify-between px-2 py-1.5" style={{ borderTop: '1px solid #C9A84C', borderBottom: '1px solid #C9A84C', margin: '3px 0' }}>
                                <div className="text-[7px] font-semibold uppercase tracking-[3px]" style={{ color: '#C9A84C' }}>ZONA A</div>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-3">
                                <div className="text-[8px]" style={{ color: '#F5ECD7', fontFamily: 'Georgia' }}>Garcia/Lopez</div>
                                <div className="text-[8px] tracking-widest" style={{ color: '#C9A84C' }}>6-3</div>
                                <div className="text-[8px]" style={{ color: '#A8956A', fontFamily: 'Georgia' }}>Gomez/Fdez</div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 9, name: 'Modern Gradient',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden bg-white flex flex-col">
                              <div className="h-6 relative flex items-center px-2" style={{ background: `linear-gradient(135deg, #667eea, #764ba2)` }}>
                                <div className="text-[7px] font-semibold text-white/80 uppercase tracking-wide">ZONA A</div>
                                <div className="absolute bottom-0 left-0 right-0 h-2 bg-white" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}/>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-2">
                                <div className="w-8 h-1.5 rounded bg-slate-200"/>
                                <div className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>6-3</div>
                                <div className="w-8 h-1.5 rounded bg-slate-200"/>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 10, name: 'Mobile First',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col" style={{ background: '#18181B', border: '1px solid #3F3F46' }}>
                              <div className="h-0.5 w-full" style={{ background: cp }}/>
                              <div className="flex items-center justify-between px-2 py-0.5">
                                <div className="text-[7px] uppercase tracking-wider" style={{ color: '#71717A' }}>ZONA A · 4TA</div>
                                <div className="text-[7px]" style={{ color: '#71717A' }}>10:30</div>
                              </div>
                              <div className="flex items-center justify-between px-2 py-0.5" style={{ borderBottom: '1px solid #3F3F46' }}>
                                <div className="flex items-center gap-1"><div className="text-[7px]" style={{ color: cp }}>●</div><div className="text-[8px] font-bold text-white">GARCIA/LOPEZ</div></div>
                                <div className="text-[8px] font-bold font-mono" style={{ color: cp }}>6  4</div>
                              </div>
                              <div className="flex items-center justify-between px-2 py-0.5">
                                <div className="text-[8px] font-bold" style={{ color: '#52525B' }}>GOMEZ/FDEZ</div>
                                <div className="text-[8px] font-bold font-mono" style={{ color: '#52525B' }}>3  6</div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 11, name: 'Club Branding',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col bg-white">
                              <div className="h-5 flex items-center px-2 gap-1.5" style={{ backgroundColor: cp }}>
                                <div className="text-[7px] font-bold text-white uppercase tracking-wide">ZONA A</div>
                                <div className="text-[6px] text-white/60 ml-auto">10:30</div>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-2">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: cp }}/><div className="w-8 h-1.5 rounded bg-slate-200"/></div>
                                <div className="text-[8px] font-bold px-1 rounded" style={{ background: `${cp}20`, color: cp }}>6-3</div>
                                <div className="flex items-center gap-1"><div className="w-8 h-1.5 rounded bg-slate-200"/><div className="w-3 h-3 rounded-full bg-slate-200"/></div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 12, name: 'Broadcast TV',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col" style={{ background: '#1A1A1A' }}>
                              <div className="flex items-center justify-between px-2 py-1" style={{ background: '#E8002D' }}>
                                <div className="text-[7px] font-black text-white uppercase tracking-[2px]">ZONA A · 4TA</div>
                                <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-white animate-pulse"/><div className="text-[6px] text-white font-black">EN VIVO</div></div>
                              </div>
                              <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: '1px solid #E8002D' }}>
                                <div className="text-[8px] font-bold text-white">J. GARCIA / M. LOPEZ</div>
                                <div className="flex gap-0.5"><div className="text-[8px] font-black text-white bg-[#E8002D] px-1 rounded">6</div><div className="text-[8px] font-black" style={{ color: '#555' }}>3</div></div>
                              </div>
                              <div className="flex items-center justify-between px-2 py-1">
                                <div className="text-[8px] font-bold" style={{ color: '#555' }}>R. GOMEZ / L. FDEZ</div>
                                <div className="flex gap-0.5"><div className="text-[8px] font-black" style={{ color: '#555' }}>3</div><div className="text-[8px] font-black text-white bg-[#E8002D] px-1 rounded">6</div></div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 13, name: 'Corp. Sponsor',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col bg-white">
                              <div className="flex items-center justify-between px-2 py-1" style={{ background: '#1F2937', borderBottom: '2px solid #2563EB' }}>
                                <div className="text-[7px] font-bold text-white uppercase tracking-[1.5px]">ZONA A</div>
                                <div className="text-[6px] text-white/60">10:30</div>
                              </div>
                              <div className="flex-1 flex items-center justify-between px-2">
                                <div className="w-7 h-1.5 rounded bg-slate-200"/>
                                <div className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#2563EB' }}>6-3</div>
                                <div className="w-7 h-1.5 rounded bg-slate-200"/>
                              </div>
                              <div className="flex items-center justify-center gap-1 py-0.5 border-t border-slate-100 bg-slate-50">
                                <div className="text-[6px] text-slate-400 uppercase tracking-wide">PRESENTADO POR</div>
                                <div className="w-8 h-2 rounded bg-slate-200"/>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 14, name: 'Championship',
                          preview: (cp) => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex flex-col" style={{ background: '#0F172A' }}>
                              <div className="flex items-center justify-center gap-1 px-2 py-1.5" style={{ borderBottom: '1px solid #1E293B' }}>
                                <div className="text-[9px]" style={{ color: '#F59E0B' }}>★</div>
                                <div className="text-[7px] font-black uppercase tracking-[2px]" style={{ color: '#F59E0B' }}>GRAN FINAL</div>
                                <div className="text-[9px]" style={{ color: '#F59E0B' }}>★</div>
                              </div>
                              <div className="flex-1 grid grid-cols-3 items-center px-2">
                                <div className="flex flex-col gap-0.5"><div className="h-1 w-2 rounded-full bg-blue-500"/><div className="text-[7px] font-bold text-white">GARCIA</div></div>
                                <div className="flex flex-col items-center"><div className="text-[9px] font-black" style={{ color: '#F59E0B' }}>6-3</div></div>
                                <div className="flex flex-col items-end gap-0.5"><div className="h-1 w-2 rounded-full bg-red-500 ml-auto"/><div className="text-[7px] font-bold text-white">GOMEZ</div></div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 6, name: 'High Contrast',
                          preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden bg-white flex flex-col" style={{ border: '2px solid #000' }}>
                              <div className="h-4 flex items-center px-2 gap-1" style={{ backgroundColor: '#000' }}>
                                <div className="text-[7px] font-black text-white uppercase">ZONA A</div>
                                <div className="text-[6px] text-white/60 ml-auto">10:30</div>
                              </div>
                              <div className="flex-1 flex flex-col justify-center px-2 gap-0.5">
                                <div className="flex items-center justify-between" style={{ borderBottom: '1.5px solid #000', paddingBottom: 2 }}>
                                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded flex items-center justify-center bg-black text-white text-[7px] font-black">✓</div><div className="text-[7px] font-bold">GARCIA/LOPEZ</div></div>
                                  <div className="text-[8px] font-black">6 3</div>
                                </div>
                                <div className="flex items-center justify-between pt-0.5">
                                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded flex items-center justify-center bg-slate-200 text-[7px] font-black">2</div><div className="text-[7px] font-bold text-slate-400">GOMEZ/FDEZ</div></div>
                                  <div className="text-[8px] font-black text-slate-300">3 6</div>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                      ].map(({ id, name, preview }) => {
                        const cp = persona.colorAcentoFixture || club?.colorPrimario || '#10b981'
                        const sel = (persona.templateFixture ?? 1) === id
                        return (
                          <button key={id} type="button" onClick={() => setP('templateFixture', id)}
                            className={`rounded-xl overflow-hidden border-2 transition-all duration-150 ${sel ? 'border-brand-500 scale-[1.03]' : 'border-slate-200 hover:border-slate-300'}`}>
                            {preview(cp)}
                            <div className={`px-2 py-1.5 text-center ${sel ? 'bg-brand-50' : 'bg-slate-50'}`}>
                              <p className={`text-[10px] font-semibold ${sel ? 'text-brand-600' : 'text-slate-500'}`}>{name}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Toggle personalización ── */}
                  {(() => {
                    const hayOverrides = COLOR_OVERRIDE_KEYS.some((k) => !!persona[k])
                    return (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowPersonalizar((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600">Personalizar colores — Fixture</span>
                            {hayOverrides && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                                {COLOR_OVERRIDE_KEYS.filter((k) => !!persona[k]).length} activo{COLOR_OVERRIDE_KEYS.filter((k) => !!persona[k]).length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!hayOverrides && <span className="text-[10px] text-slate-400">Opcional · el template ya viene diseñado</span>}
                          </div>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showPersonalizar ? 'rotate-180' : ''}`} />
                        </button>

                        {showPersonalizar && (
                          <div className="p-4 flex flex-col gap-4 border-t border-slate-100">
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-2">Color de acento <span className="font-normal text-slate-400">(tabs, score, zona — solo en la página del torneo)</span></label>
                              <div className="flex items-center gap-2 max-w-xs">
                                <input type="color" value={persona.colorAcentoFixture || club?.colorPrimario || '#10b981'} onChange={(e) => setP('colorAcentoFixture', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                                <input type="text" value={persona.colorAcentoFixture} onChange={(e) => setP('colorAcentoFixture', e.target.value)} placeholder="vacío = color del club" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                {persona.colorAcentoFixture && <button type="button" onClick={() => setP('colorAcentoFixture', '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                              </div>
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
                                <input type="text" value={persona.colorCardFixture} onChange={(e) => setP('colorCardFixture', e.target.value)} placeholder="default del template" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                {persona.colorCardFixture && <button type="button" onClick={() => setP('colorCardFixture', '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600 block mb-1">Colores de texto</label>
                              <p className="text-xs text-slate-400 mb-3">Vacío = contraste automático según el fondo.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { key: 'colorTextoNombres',   label: 'Nombres de parejas' },
                                  { key: 'colorTextoZona',      label: 'Zona (A, B, C…)' },
                                  { key: 'colorTextoCategoria', label: 'Categoría' },
                                  { key: 'colorTextoScore',     label: 'Score / VS' },
                                  { key: 'colorTextoInfo',      label: 'Hora · cancha' },
                                ].map(({ key, label }) => (
                                  <div key={key}>
                                    <label className="text-[11px] text-slate-500 block mb-1">{label}</label>
                                    <div className="flex items-center gap-2">
                                      <input type="color" value={persona[key] || '#ffffff'} onChange={(e) => setP(key, e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                                      <input type="text" value={persona[key]} onChange={(e) => setP(key, e.target.value)} placeholder="automático" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                      {persona[key] && <button type="button" onClick={() => setP(key, '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Logo sponsor (solo T13) ── */}
                  {(persona.templateFixture ?? 1) === 13 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <label className="text-xs font-semibold text-blue-700 block mb-1">Logo del sponsor <span className="font-normal text-blue-500">(Corporate Sponsor)</span></label>
                      <p className="text-[11px] text-blue-400 mb-3">Se muestra en el pie de cada card con el texto "PRESENTADO POR".</p>
                      {persona.sponsorLogoFixture ? (
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 px-3 rounded-lg border border-blue-200 bg-white flex items-center">
                            <img src={persona.sponsorLogoFixture} alt="Sponsor" className="h-7 object-contain max-w-[120px]" />
                          </div>
                          <button type="button" onClick={() => setP('sponsorLogoFixture', '')} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
                        </div>
                      ) : null}
                      <ImagenFileInput value={persona.sponsorLogoFixture} onChange={(v) => setP('sponsorLogoFixture', v)} profile="logo" hint="Logo del sponsor. Recomendado: fondo transparente (PNG)." />
                    </div>
                  )}

                  {/* ── Imágenes ── */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-3">Imágenes — Fixture</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Header sección */}
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1.5">Header de sección</label>
                        {persona.imagenFondoFixture ? (
                          <div className="relative w-full max-w-[160px] h-16 rounded-lg overflow-hidden mb-2 border border-slate-200">
                            <img src={persona.imagenFondoFixture} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-white font-semibold bg-black/50 px-2 py-0.5 rounded">Cambiar</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-[160px] h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50 overflow-hidden mb-2 flex flex-col gap-0.5 p-1.5">
                            <div className="h-3.5 rounded bg-brand-400/50 flex items-center justify-center">
                              <div className="w-10 h-0.5 rounded bg-white/60" />
                            </div>
                            <div className="flex-1 grid grid-cols-3 gap-1">
                              {[1,2,3].map((i) => <div key={i} className="rounded bg-slate-200" />)}
                            </div>
                          </div>
                        )}
                        <ImagenFileInput value={persona.imagenFondoFixture} onChange={(v) => setP('imagenFondoFixture', v)} hint="Banner horizontal arriba del fixture." />
                      </div>
                    </div>
                  </div>

                  {/* Sponsors Fixture */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Sponsors — Fixture</label>
                    {persona.sponsorsFixture.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-3">
                        {persona.sponsorsFixture.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {s.logo && <img src={s.logo} alt={s.nombre} className="w-8 h-8 rounded object-contain border border-slate-200 shrink-0" />}
                              <p className="text-sm font-medium text-slate-700 truncate">{s.nombre}</p>
                            </div>
                            <button type="button" onClick={() => setP('sponsorsFixture', persona.sponsorsFixture.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 p-1"><X size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => openSponsorModal('fixture')} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-all self-start">
                      <Plus size={13} /> Seleccionar de biblioteca
                    </button>
                  </div>

                  {/* ── Sección Grupos ── */}
                  <div className="border-t border-slate-100 pt-5 mt-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Imágenes — Grupos</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Header de sección</label>
                        <ImageZonePreview src={persona.imagenHeaderGrupos}>
                          <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                            <div className="h-3.5 rounded bg-brand-400/50 flex items-center justify-center"><div className="w-10 h-0.5 rounded bg-white/60" /></div>
                            <div className="flex-1 grid grid-cols-3 gap-1">{[1,2,3].map((i) => <div key={i} className="rounded bg-slate-200" />)}</div>
                          </div>
                        </ImageZonePreview>
                        <ImagenFileInput value={persona.imagenHeaderGrupos} onChange={(v) => setP('imagenHeaderGrupos', v)} hint="Banner arriba de todos los grupos." />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Fondo de cards de zona</label>
                        <ImageZonePreview src={persona.imagenFondoGrupos}>
                          <div className="w-full h-full grid grid-cols-2 gap-1 p-1.5">
                            {[1,2].map((i) => (<div key={i} className="rounded overflow-hidden flex flex-col"><div className="h-3 bg-brand-400/50" /><div className="flex-1 bg-slate-200/70" /></div>))}
                          </div>
                        </ImageZonePreview>
                        <ImagenFileInput value={persona.imagenFondoGrupos} onChange={(v) => setP('imagenFondoGrupos', v)} hint="Aparece en el header de cada card de zona." />
                      </div>
                      {/* Watermark grupos */}
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Watermark de fondo</label>
                        <ImageZonePreview src={persona.imagenWatermarkGrupos}>
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <div className="w-8 h-8 rounded-full bg-brand-200/50 flex items-center justify-center">
                              <div className="w-4 h-4 rounded bg-brand-300/60" />
                            </div>
                          </div>
                        </ImageZonePreview>
                        <ImagenFileInput value={persona.imagenWatermarkGrupos} onChange={(v) => setP('imagenWatermarkGrupos', v)} profile="logo" hint="Logo o imagen vectorizada al fondo de las cards de zona. Recomendado: PNG transparente." />
                      </div>
                    </div>

                    {/* Sponsors Grupos */}
                    <div className="mb-4">
                      <label className="text-xs font-medium text-slate-600 block mb-2">Sponsors — Grupos</label>
                      {persona.sponsorsGrupos.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-3">
                          {persona.sponsorsGrupos.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {s.logo && <img src={s.logo} alt={s.nombre} className="w-8 h-8 rounded object-contain border border-slate-200 shrink-0" />}
                                <p className="text-sm font-medium text-slate-700 truncate">{s.nombre}</p>
                              </div>
                              <button type="button" onClick={() => setP('sponsorsGrupos', persona.sponsorsGrupos.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 p-1"><X size={13} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => openSponsorModal('grupos')} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-all self-start">
                        <Plus size={13} /> Seleccionar de biblioteca
                      </button>
                    </div>

                    {/* Toggle personalización Grupos */}
                    {(() => {
                      const hayOverrides = COLOR_OVERRIDE_KEYS_GRUPOS.some((k) => !!persona[k])
                      const TPL_NAMES = { 1:'Estándar', 2:'Premier Padel', 3:'Pro Tournament', 6:'High Contrast', 7:'Dark Premium', 8:'Luxury Gold', 9:'Modern Gradient', 10:'Mobile First', 11:'Club Branding', 12:'Broadcast TV', 13:'Corp. Sponsor', 14:'Championship' }
                      const tplName = TPL_NAMES[persona.templateFixture ?? 1] ?? 'Estándar'
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                          <button type="button" onClick={() => setShowPersonalizarGrupos((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-600">Personalizar colores — Grupos</span>
                              {hayOverrides && (
                                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">{COLOR_OVERRIDE_KEYS_GRUPOS.filter((k) => !!persona[k]).length} activo{COLOR_OVERRIDE_KEYS_GRUPOS.filter((k) => !!persona[k]).length !== 1 ? 's' : ''}</span>
                              )}
                              <span className="text-[10px] text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">Hereda: {tplName}</span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showPersonalizarGrupos ? 'rotate-180' : ''}`} />
                          </button>
                          {showPersonalizarGrupos && (
                            <div className="p-4 flex flex-col gap-4 border-t border-slate-100">
                              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-100">
                                <Info size={13} className="text-sky-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-sky-600 leading-relaxed">
                                  Los colores de acento, nombres, score y zona se heredan del template <strong>{tplName}</strong>. Solo completá estos campos si querés diferenciar Grupos del Fixture.
                                </p>
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
                                  <input type="text" value={persona.colorCardGrupos} onChange={(e) => setP('colorCardGrupos', e.target.value)} placeholder="default del template" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                  {persona.colorCardGrupos && <button type="button" onClick={() => setP('colorCardGrupos', '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 block mb-2">Color de texto en header de cards</label>
                                <div className="flex items-center gap-2 max-w-xs">
                                  <input type="color" value={persona.colorTextoCardGrupos || '#ffffff'} onChange={(e) => setP('colorTextoCardGrupos', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                                  <input type="text" value={persona.colorTextoCardGrupos} onChange={(e) => setP('colorTextoCardGrupos', e.target.value)} placeholder="automático" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                                  {persona.colorTextoCardGrupos && <button type="button" onClick={() => setP('colorTextoCardGrupos', '')} className="text-slate-400 hover:text-red-400 text-base leading-none px-1">×</button>}
                                </div>
                                <p className="text-slate-400 text-xs mt-1">Color del nombre de zona cuando hay imagen de fondo.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}

              {/* ── SUB-TAB: Draw ── */}
              {visualTab === 'draw' && (
                <>
                  {/* ── 1. Template ── */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Diseño del bracket</label>
                    <p className="text-xs text-slate-400 mb-3">Elegí el estilo visual de las llaves de eliminación.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'default', name: 'Default', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: '#0d1117' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: '#afca0b' }} /><div className="w-10 h-1.5 rounded bg-white/20" /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/10" /><div className="w-8 h-1.5 rounded bg-white/10" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.22)' }} /></div>
                            </div>) },
                        { id: 'world-tour-dark', name: 'World Tour Dark', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: '#080c14' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/70" /><div className="w-10 h-1.5 rounded bg-white/30" /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/10" /><div className="w-8 h-1.5 rounded bg-white/10" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(0,220,255,0.70)' }} /></div>
                            </div>) },
                        { id: 'electric-blue', name: 'Electric Blue', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: 'radial-gradient(ellipse at 50% 0%, #071a3e 0%, #07182e 100%)' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(56,182,255,0.20)', boxShadow: '0 0 8px rgba(56,182,255,0.10)' }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38b6ff' }} /><div className="w-10 h-1.5 rounded bg-white/25" /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(56,182,255,0.12)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/10" /><div className="w-8 h-1.5 rounded bg-white/10" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(56,182,255,0.55)' }} /></div>
                            </div>) },
                        { id: 'minimal-pro', name: 'Minimal Pro', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: '#f5f5f5' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}><div className="w-1.5 h-1.5 rounded-full bg-slate-700" /><div className="w-10 h-1.5 rounded bg-slate-300" /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white" style={{ border: '1px solid #e5e7eb' }}><div className="w-1.5 h-1.5 rounded-full bg-slate-200" /><div className="w-8 h-1.5 rounded bg-slate-200" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.15)' }} /></div>
                            </div>) },
                        { id: 'neon-arena', name: 'Neon Arena', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: '#050505' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(0,255,180,0.05)', border: '1px solid rgba(0,255,180,0.25)', boxShadow: '0 0 10px rgba(0,255,180,0.08)' }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(0,255,180,0.9)' }} /><div className="w-10 h-1.5 rounded" style={{ background: 'rgba(0,255,180,0.20)' }} /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(0,255,180,0.02)', border: '1px solid rgba(0,255,180,0.12)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/10" /><div className="w-8 h-1.5 rounded bg-white/8" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(0,255,180,0.55)' }} /></div>
                            </div>) },
                        { id: 'championship-gold', name: 'Championship Gold', preview: () => (
                            <div className="h-14 w-full rounded-t-xl overflow-hidden flex" style={{ background: '#080601' }}>
                              <div className="flex-1 flex flex-col justify-center gap-1.5 px-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.35)' }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af37' }} /><div className="w-10 h-1.5 rounded" style={{ background: 'rgba(212,175,55,0.30)' }} /></div>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}><div className="w-1.5 h-1.5 rounded-full bg-white/10" /><div className="w-8 h-1.5 rounded bg-white/10" /></div>
                              </div>
                              <div className="flex items-center px-1"><div className="w-3 border-t" style={{ borderColor: 'rgba(212,175,55,0.50)' }} /></div>
                            </div>) },
                      ].map(({ id, name, preview }) => {
                        const sel = (persona.bracketTemplate ?? 'default') === id
                        return (
                          <button key={id} type="button" onClick={() => switchBracketTemplate(id)}
                            className={`rounded-xl overflow-hidden border-2 transition-all duration-150 ${sel ? 'border-brand-500 scale-[1.03]' : 'border-slate-200 hover:border-slate-300'}`}>
                            {preview()}
                            <div className={`px-2 py-1.5 text-center ${sel ? 'bg-brand-50' : 'bg-slate-50'}`}>
                              <p className={`text-[10px] font-semibold ${sel ? 'text-brand-600' : 'text-slate-500'}`}>{name}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── 2. Header del draw ── */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setShowDrawHeader((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Header del draw</span>
                        {(persona.drawTitulo || persona.drawColorTitulo || persona.imagenFondoDraw)
                          ? <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">personalizado</span>
                          : <span className="text-[10px] text-slate-400">Título, color, imagen, visibilidad</span>}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showDrawHeader ? 'rotate-180' : ''}`} />
                    </button>
                    {showDrawHeader && (
                      <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Título principal</label>
                          <input type="text" value={persona.drawTitulo} onChange={(e) => setP('drawTitulo', e.target.value)} placeholder="MAIN DRAW (vacío = oculto)" className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Color del título</label>
                          <div className="flex items-center gap-2 max-w-xs">
                            <input type="color" value={persona.drawColorTitulo || club?.colorPrimario || '#10b981'} onChange={(e) => setP('drawColorTitulo', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                            <input type="text" value={persona.drawColorTitulo} onChange={(e) => setP('drawColorTitulo', e.target.value)} placeholder="vacío = color acento" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Imagen de fondo del header</label>
                          <ImageZonePreview src={persona.imagenFondoDraw}>
                            <div className="w-full h-full flex flex-col gap-0.5 p-1.5">
                              <div className="h-4 rounded bg-brand-400/50 flex items-center justify-center"><span className="text-[7px] font-black text-brand-700 uppercase tracking-widest">Draw</span></div>
                              <div className="flex-1 grid grid-cols-3 gap-1">{[1,2,3].map((i) => <div key={i} className="rounded bg-slate-200" />)}</div>
                            </div>
                          </ImageZonePreview>
                          <ImagenFileInput value={persona.imagenFondoDraw} onChange={(v) => setP('imagenFondoDraw', v)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-slate-600 block">Elementos visibles</label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {[
                              { key: 'drawMostrarClub',       label: 'Nombre del club' },
                              { key: 'drawMostrarNombre',     label: 'Nombre del torneo' },
                              { key: 'drawMostrarFechas',     label: 'Fechas' },
                              { key: 'drawMostrarCategorias', label: 'Categorías' },
                              { key: 'drawMostrarGenero',     label: 'Badge género' },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={persona[key]} onChange={(e) => setP(key, e.target.checked)} className="rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
                                <span className="text-xs text-slate-600">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 3. Cards ── */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setShowDrawCards((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Cards</span>
                        {(persona.colorCard || persona.fontScale !== 'normal')
                          ? <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">personalizado</span>
                          : <span className="text-[10px] text-slate-400">Estilo, color, fuentes</span>}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showDrawCards ? 'rotate-180' : ''}`} />
                    </button>
                    {showDrawCards && (
                      <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-2">Estilo</label>
                          <div className="flex gap-2 max-w-xs">
                            {[{ key: 'oscura', label: 'Oscura' }, { key: 'clara', label: 'Clara' }, { key: 'transparente', label: 'Transparente' }].map(({ key, label }) => (
                              <button key={key} type="button" onClick={() => setP('estiloCard', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.estiloCard === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-2">Color de fondo</label>
                          <div className="flex items-center gap-2 max-w-xs">
                            <input type="color" value={persona.colorCard || '#0d1117'} onChange={(e) => setP('colorCard', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                            <input type="text" value={persona.colorCard} onChange={(e) => setP('colorCard', e.target.value)} placeholder="#0d1117 (default)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
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
                      </div>
                    )}
                  </div>

                  {/* ── 4. Líneas & Fondo ── */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setShowDrawFondo((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Líneas y fondo</span>
                        {(persona.bracketConnColor || persona.bracketFondoColor || persona.bracketWatermark || persona.imagenFondoBracket)
                          ? <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">personalizado</span>
                          : <span className="text-[10px] text-slate-400">Color líneas, glow, fondo, watermark</span>}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showDrawFondo ? 'rotate-180' : ''}`} />
                    </button>
                    {showDrawFondo && (
                      <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-2">Color de líneas del cuadro</label>
                          <div className="flex items-center gap-2 max-w-xs">
                            <input type="color" value={persona.bracketConnColor || '#00dcff'} onChange={(e) => setP('bracketConnColor', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                            <input type="text" value={persona.bracketConnColor || ''} onChange={(e) => setP('bracketConnColor', e.target.value || null)} placeholder="Vacío = default del template" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                            {persona.bracketConnColor && <button onClick={() => setP('bracketConnColor', null)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><X size={14} /></button>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-0.5">
                          <div>
                            <label className="text-xs font-medium text-slate-600">Efecto glow en líneas</label>
                            <p className="text-[11px] text-slate-400">Resplandor neon sobre los conectores</p>
                          </div>
                          <button type="button" onClick={() => setP('bracketConnGlow', !persona.bracketConnGlow)} className={`relative w-9 h-5 rounded-full transition-colors ${persona.bracketConnGlow ? 'bg-brand-500' : 'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${persona.bracketConnGlow ? 'left-4' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-2">Color de fondo del cuadro</label>
                          <div className="flex items-center gap-2 max-w-xs">
                            <input type="color" value={persona.bracketFondoColor || '#080c14'} onChange={(e) => setP('bracketFondoColor', e.target.value)} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-slate-50 shrink-0" />
                            <input type="text" value={persona.bracketFondoColor || ''} onChange={(e) => setP('bracketFondoColor', e.target.value || null)} placeholder="Vacío = default del template" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono transition-all" />
                            {persona.bracketFondoColor && <button onClick={() => setP('bracketFondoColor', null)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><X size={14} /></button>}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-2">Texto de fondo (watermark)</label>
                          <div className="flex items-center gap-2">
                            <input type="text" value={persona.bracketWatermark ?? ''} onChange={(e) => setP('bracketWatermark', e.target.value || null)} placeholder="Vacío = usa el del template" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                            <button type="button" onClick={() => setP('bracketWatermarkOculto', !persona.bracketWatermarkOculto)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${persona.bracketWatermarkOculto ? 'border-red-200 bg-red-50 text-red-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              {persona.bracketWatermarkOculto ? 'Oculto' : 'Visible'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Imagen de fondo del bracket</label>
                          <ImageZonePreview src={persona.imagenFondoBracket}>
                            <div className="w-full h-full flex items-center gap-1 p-1.5">
                              <div className="flex flex-col gap-1 flex-1">{[1,2,3,4].map((i) => <div key={i} className="h-1.5 rounded bg-brand-400/50" />)}</div>
                              <div className="flex flex-col gap-2 flex-1">{[1,2].map((i) => <div key={i} className="h-1.5 rounded bg-brand-400/65" />)}</div>
                              <div className="flex flex-col justify-center flex-1"><div className="h-1.5 rounded bg-brand-500/80" /></div>
                            </div>
                          </ImageZonePreview>
                          <ImagenFileInput value={persona.imagenFondoBracket} onChange={(v) => setP('imagenFondoBracket', v)} />
                        </div>
                      </div>
                    )}
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
                    <button
                      type="button"
                      onClick={() => openSponsorModal('draw')}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-all self-start"
                    >
                      <Plus size={13} /> Seleccionar de biblioteca
                    </button>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-slate-600 block mb-2">Tamaño de logos</label>
                      <div className="flex gap-2 max-w-xs">
                        {[{ key: 'pequeño', label: 'Pequeño' }, { key: 'normal', label: 'Normal' }, { key: 'grande', label: 'Grande' }].map(({ key, label }) => (
                          <button key={key} type="button" onClick={() => setP('sponsorScale', key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${persona.sponsorScale === key ? 'border-brand-500 bg-brand-500/8 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">Los sponsors se muestran al pie de Fixture y Grupos en la página pública.</p>
                  </div>
                </>
              )}

              {/* Guardar — siempre visible */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {savedOk && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle size={13} /> Guardado
                  </span>
                )}
                <button
                  onClick={() => {
                    const campos = {
                      modoLandingFlyer:     persona.modoLandingFlyer     ?? 'auto',
                      premioPrimero:        persona.premioPrimero        || null,
                      premioSegundo:        persona.premioSegundo        || null,
                      premioSemifinal:      persona.premioSemifinal      || null,
                      imagenFondo:          persona.imagenFondo          || null,
                      imagenFondoEnCurso:   persona.imagenFondoEnCurso   || null,
                      ctaEnCurso:           persona.ctaEnCurso           || null,
                      templateEnCurso:      persona.templateEnCurso      ?? 1,
                      colorAcento:          persona.colorAcento          || null,
                      templateFixture:      persona.templateFixture      ?? 1,
                      colorAcentoFixture:   persona.colorAcentoFixture    || null,
                      estiloCardFixture:    persona.estiloCardFixture,
                      colorCardFixture:     persona.colorCardFixture      || null,
                      estiloCardGrupos:     persona.estiloCardGrupos,
                      colorCardGrupos:      persona.colorCardGrupos       || null,
                      imagenFondoFixture:   persona.imagenFondoFixture    || null,
                      imagenFondoGrupos:       persona.imagenFondoGrupos       || null,
                      imagenHeaderGrupos:      persona.imagenHeaderGrupos      || null,
                      imagenWatermarkGrupos:   persona.imagenWatermarkGrupos   || null,
                      imagenWatermarkFixture:  persona.imagenWatermarkFixture  || null,
                      colorTextoCardGrupos: persona.colorTextoCardGrupos  || null,
                      colorCardBgEnCurso:   persona.colorCardBgEnCurso    || null,
                      colorTituloEnCurso:   persona.colorTituloEnCurso    || null,
                      colorTextoSecEnCurso: persona.colorTextoSecEnCurso  || null,
                      colorBtnTextEnCurso:  persona.colorBtnTextEnCurso   || null,
                      sponsorLogoFixture:   persona.sponsorLogoFixture    || null,
                      colorTextoNombres:    persona.colorTextoNombres     || null,
                      colorTextoZona:       persona.colorTextoZona        || null,
                      colorTextoCategoria:  persona.colorTextoCategoria   || null,
                      colorTextoScore:      persona.colorTextoScore       || null,
                      colorTextoInfo:       persona.colorTextoInfo        || null,
                      imagenFondoDraw:      persona.imagenFondoDraw       || null,
                      imagenFondoBracket:   persona.imagenFondoBracket    || null,
                      estiloCard:           persona.estiloCard,
                      colorCard:            persona.colorCard             || null,
                      fontScale:            persona.fontScale,
                      sponsors:             persona.sponsors,
                      sponsorsFixture:      persona.sponsorsFixture,
                      sponsorsGrupos:       persona.sponsorsGrupos,
                      sponsorScale:         persona.sponsorScale,
                      drawMostrarClub:       persona.drawMostrarClub,
                      drawTitulo:            persona.drawTitulo            || null,
                      drawMostrarNombre:     persona.drawMostrarNombre,
                      drawMostrarFechas:     persona.drawMostrarFechas,
                      drawMostrarCategorias: persona.drawMostrarCategorias,
                      drawMostrarGenero:     persona.drawMostrarGenero,
                      drawColorTitulo:       persona.drawColorTitulo       || null,
                      bracketColores:        persona.bracketColores,
                      bracketTemplate:       persona.bracketTemplate,
                      bracketConnColor:      persona.bracketConnColor      ?? null,
                      bracketConnGlow:       persona.bracketConnGlow       ?? true,
                      bracketWatermark:      persona.bracketWatermark      ?? null,
                      bracketWatermarkOculto: persona.bracketWatermarkOculto ?? false,
                      bracketFondoColor:     persona.bracketFondoColor     ?? null,
                    }
                    updatePersonalizacion(torneo.id, campos)
                    if (isBackend) {
                      api.patch(`/torneos/${torneo.id}/personalizacion`, { personalizacion: campos }, authH).catch(() => {})
                    }
                    setSavedOk(true)
                    setTimeout(() => setSavedOk(false), 2500)
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all"
                >
                  Guardar personalización
                </button>
              </div>

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
          allPartidos={activeBracket ? activeBracket.rondas.flatMap((r) => r.partidos) : []}
          onClose={() => setModalHorario(null)}
          onGuardar={handleGuardarHorario}
        />
      )}

      {/* Modal agregar pareja (admin) */}
      {modalAgregarAdmin && (
        <ModalAgregarParejaAdmin
          torneo={torneo}
          token={token}
          horasDisponibles={horasDisponibles}
          onClose={() => setModalAgregarAdmin(false)}
          onConfirmar={handleAgregarAdmin}
        />
      )}

      {/* Modal editar disponibilidad */}
      {editando && (
        <ModalEditarDisponibilidad
          torneo={torneo}
          inscripto={editando}
          token={token}
          horasDisponibles={horasDisponibles}
          onClose={() => setEditando(null)}
          onGuardar={(pid, changes) => {
            updatePareja(torneo.id, pid, changes)
            if (isBackend && typeof pid === 'string') {
              api.patch(`/torneos/${torneo.id}/parejas/${pid}`, changes, authH).catch(() => {})
            }
            setEditando(null)
            showToast('Pareja actualizada correctamente.')
          }}
        />
      )}

      {/* Modal confirmar cierre de inscripciones */}
      {modalCerrarInsc && (
        <ModalCerrarInscripcion
          torneo={torneo}
          onConfirmar={() => { setModalCerrarInsc(false); ejecutarCambioEstado('closed') }}
          onCancelar={() => setModalCerrarInsc(false)}
        />
      )}

      {/* Modal de confirmación genérico — reemplaza window.confirm() */}
      {confirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={15} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{confirmModal.titulo}</p>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{confirmModal.mensaje}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                {confirmModal.onConfirmar ? 'Cancelar' : 'Cerrar'}
              </button>
              {confirmModal.onConfirmar && (
                <button
                  onClick={confirmModal.onConfirmar}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all"
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal asignación manual de horario */}
      {modalAsignarManual && (
        <ModalAsignarManual
          partido={modalAsignarManual.partido}
          grupos={torneo.grupos}
          canchas={canchas}
          diaElim={torneo.diaInicioEliminatoria ?? null}
          horaElim={torneo.horaInicioEliminatoria ?? null}
          fechaInicio={torneo.fechaInicio}
          fechaFin={torneo.fechaFin}
          intervaloMin={intervaloPartidoMin}
          onConfirm={handleConfirmarAsignacionManual}
          onClose={() => setModalAsignarManual(null)}
        />
      )}

      {/* Modal Auto-asignar — procesando / resultado */}
      {autoScheduleState && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-4 text-center">
            {autoScheduleState.status === 'procesando' ? (
              <>
                <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Asignando horarios...</p>
                  <p className="text-xs text-slate-400 mt-1">El sistema está calculando la mejor distribución de partidos.</p>
                </div>
              </>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${autoScheduleState.sinHorario > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  {autoScheduleState.sinHorario > 0
                    ? <AlertTriangle size={22} className="text-amber-500" />
                    : <CheckCircle size={22} className="text-emerald-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Asignación completada</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="text-emerald-600 font-semibold">{autoScheduleState.asignados} partidos</span> con horario asignado
                    {autoScheduleState.sinHorario > 0 && (
                      <> · <span className="text-amber-500 font-semibold">{autoScheduleState.sinHorario} sin horario</span> por falta de disponibilidad común</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setAutoScheduleState(null)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all"
                >
                  Entendido
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast genérico */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-xl">
          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">{toast}</p>
        </div>
      </div>

      {/* Toasts estado inscripción */}
      {toastEstado === 'open'   && <Toast icon={ToggleRight} iconBg="bg-emerald-500/15 border border-emerald-500/25" iconColor="text-emerald-400" barColor="bg-emerald-400/50" label="Inscripción abierta"  message="Las inscripciones están abiertas"  duration={3500} onClose={() => setToastEstado(null)} />}
      {toastEstado === 'closed' && <Toast icon={Lock}        iconBg="bg-amber-500/15 border border-amber-500/25"     iconColor="text-amber-400"   barColor="bg-amber-400/50"   label="Inscripción cerrada"  message="Las inscripciones están cerradas"  duration={3500} onClose={() => setToastEstado(null)} />}
      {toastEstado === 'draft'  && <Toast icon={ToggleLeft}  iconBg="bg-slate-500/15 border border-slate-500/25"     iconColor="text-slate-400"   barColor="bg-slate-400/50"   label="Volvió a borrador"    message="El torneo volvió a borrador"       duration={3500} onClose={() => setToastEstado(null)} />}

      {/* Modal picker sponsors — nivel raíz para funcionar desde cualquier sección */}
      {sponsorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setSponsorModalTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">Biblioteca de sponsors</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sección: {sponsorModalTarget === 'fixture' ? 'Fixture' : sponsorModalTarget === 'grupos' ? 'Grupos' : 'Draw'}
                </p>
              </div>
              <button type="button" onClick={() => setSponsorModalTarget(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {clubSponsors === null ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
              ) : clubSponsors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
                  <p className="text-slate-400 text-sm">No hay sponsors en la biblioteca.</p>
                  <p className="text-slate-300 text-xs">Agregá sponsors en la sección Sponsors del dashboard.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clubSponsors.map((s) => {
                    const selected = (persona[getCurrentSponsorKey()] ?? []).some((x) => x.nombre === s.nombre)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSponsor(s)}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${selected ? 'bg-brand-500/5' : 'hover:bg-slate-50'}`}
                      >
                        <div className="w-12 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={s.logoUrl} alt={s.nombre} className="max-h-6 max-w-[44px] object-contain" onError={(e) => { e.target.style.display = 'none' }} />
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-700">{s.nombre}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}>
                          {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={() => setSponsorModalTarget(null)} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-all">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TorneoDetallePage
