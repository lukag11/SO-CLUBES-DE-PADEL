import { useState, useEffect } from 'react'
import {
  Trophy, Calendar, Flag, X, ChevronDown, ChevronUp,
  Zap, Clock, Lock, CheckCircle, Archive, Plus, Infinity as InfinityIcon, Pencil, Info, Users,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import usePlayerStore from '../store/playerStore'
import useTorneosNotif from '../store/playerNotificationsStore'
import useNotificacionesStore from '../store/notificacionesStore'
import { esSlotDeGrupos } from '../services/torneoService'
import { api } from '../lib/api'
import InfoBlock from '../components/InfoBlock'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })


// Label de categoría con sufijo de género (solo cuando torneo es Ambos)
const catLabelPlayer = (torneo, cat) => {
  if (torneo.genero !== 'Ambos') return cat
  const gen = ((torneo.generoPorCategoria ?? {})[cat]) ?? 'M'
  const suffix = gen === 'F' ? 'Fem.' : gen === 'Mixto' ? 'Mixto' : 'Masc.'
  return `${cat} ${suffix}`
}

// Filtra las categorías visibles para un jugador según su género
// Solo aplica cuando torneo.genero === 'Ambos'; si no, devuelve todas
const categoriasParaJugador = (torneo, playerGenero) => {
  if (torneo.genero !== 'Ambos') return torneo.categorias
  if (!playerGenero) return torneo.categorias // sin perfil de género → mostramos todo
  const genMap = torneo.generoPorCategoria ?? {}
  return torneo.categorias.filter((c) => {
    const gen = genMap[c]
    if (!gen) return true // sin mapa de género → visible para todos
    if (gen === 'Mixto') return true
    if (playerGenero === 'Masculino') return gen === 'M'
    if (playerGenero === 'Femenino')  return gen === 'F'
    return true
  })
}

const ESTADO_CONFIG = {
  draft:       { label: 'Borrador',   color: 'text-white/30 bg-white/5 border-white/10',           icon: Clock },
  open:        { label: 'Inscripción abierta', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle },
  closed:      { label: 'Insc. cerrada', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Lock },
  in_progress: { label: 'En curso',   color: 'text-[#afca0b] bg-[#afca0b]/10 border-[#afca0b]/20', icon: Zap },
  finished:    { label: 'Finalizado', color: 'text-white/30 bg-white/5 border-white/10',           icon: Archive },
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HORAS_DISPONIBLES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']

// Retorna solo los nombres de día que existen dentro del rango fechaInicio-fechaFin
const getDiasValidos = (fechaInicio, fechaFin) => {
  const DIAS_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diasSet = new Set()
  const current = new Date(fechaInicio + 'T12:00:00')
  const end     = new Date(fechaFin     + 'T12:00:00')
  while (current <= end) {
    diasSet.add(DIAS_JS[current.getDay()])
    current.setDate(current.getDate() + 1)
    if (diasSet.size === 7) break  // ya están todos
  }
  return DIAS_SEMANA.filter((d) => diasSet.has(d))
}

// Edición habilitada: estado open Y dentro de la fecha límite
const puedeEditar = (torneo) => {
  if (torneo.estado !== 'open') return false
  if (!torneo.fechaLimiteInscripcion) return true
  return new Date() <= new Date(torneo.fechaLimiteInscripcion + 'T23:59:59')
}

// Detecta si el jugador está en un torneo (jugador1 o jugador2 de alguna pareja)
const estaInscripto = (torneo, playerName) =>
  torneo.inscriptos.some(
    (i) => i.jugador1 === playerName || i.jugador2 === playerName
  )

// Resultado del jugador en el torneo (solo si finished y tiene bracket)
const esDePareja = (pareja, playerName) =>
  pareja?.jugador1 === playerName || pareja?.jugador2 === playerName

const getResultado = (torneo, playerName) => {
  if (esDePareja(torneo.ganador, playerName))    return { label: 'Campeón',   icon: '🏆', color: 'text-[#afca0b]' }
  if (esDePareja(torneo.subcampeon, playerName)) return { label: 'Finalista', icon: '🥈', color: 'text-blue-400' }
  if (torneo.estado === 'finished')              return { label: 'Eliminado', icon: '⚡', color: 'text-white/40' }
  return null
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

// ── Bracket read-only ─────────────────────────────────────────────────────────

const BracketReadOnly = ({ bracket, playerName }) => {
  if (!bracket?.rondas) return null
  return (
    <div className="overflow-x-auto pb-2 mt-3">
      <div className="flex gap-3 min-w-max">
        {bracket.rondas.map((ronda) => (
          <div key={ronda.numero} className="flex flex-col gap-2" style={{ width: 190 }}>
            <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {ronda.nombre}
            </p>
            {ronda.partidos.map((partido) => {
              const p1 = partido.pareja1
              const p2 = partido.pareja2
              const isP1 = p1 && (p1.jugador1 === playerName || p1.jugador2 === playerName)
              const isP2 = p2 && (p2.jugador1 === playerName || p2.jugador2 === playerName)
              const esGanadorP1 = partido.ganador?.id === p1?.id
              const esGanadorP2 = partido.ganador?.id === p2?.id

              return (
                <div
                  key={partido.id}
                  className={`rounded-xl border text-[11px] overflow-hidden ${
                    isP1 || isP2 ? 'border-[#afca0b]/30 bg-[#afca0b]/5' : 'border-white/8 bg-white/3'
                  }`}
                >
                  {/* Pareja 1 */}
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 border-b border-white/5 ${
                    esGanadorP1 ? 'text-white font-semibold' : esGanadorP2 ? 'text-white/25 line-through' : 'text-white/60'
                  } ${isP1 ? 'text-[#afca0b] font-bold' : ''}`}>
                    {esGanadorP1 && <Trophy size={9} className="text-[#afca0b] shrink-0" />}
                    <span className="truncate">{p1 ? `${p1.jugador1} / ${p1.jugador2}` : 'BYE'}</span>
                  </div>
                  {/* Pareja 2 */}
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 ${
                    esGanadorP2 ? 'text-white font-semibold' : esGanadorP1 ? 'text-white/25 line-through' : 'text-white/60'
                  } ${isP2 ? 'text-[#afca0b] font-bold' : ''}`}>
                    {esGanadorP2 && <Trophy size={9} className="text-[#afca0b] shrink-0" />}
                    <span className="truncate">{p2 ? `${p2.jugador1} / ${p2.jugador2}` : 'BYE'}</span>
                  </div>
                  {/* Sets */}
                  {partido.resultado?.length > 0 && (
                    <div className="flex items-center gap-0.5 justify-center px-2 py-1 border-t border-white/5 bg-white/[0.02]">
                      {partido.resultado.map((s, i) => {
                        const p1GanoSet = s.p1 > s.p2
                        return (
                          <span key={i} className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                            p1GanoSet
                              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                              : 'text-white/25 bg-white/5 border-white/8'
                          }`}>{s.p1}-{s.p2}</span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Vista de zona del jugador (read-only) ────────────────────────────────────

const PartidoZonaReadOnly = ({ partido, miParejaId, parejas = [] }) => {
  const { pareja1, pareja2, ganador, estado, resultado, slot } = partido
  const finalizado = estado === 'finalizado'
  const esMio  = pareja1?.id === miParejaId || pareja2?.id === miParejaId
  const ganP1  = ganador?.id === pareja1?.id
  const ganP2  = ganador?.id === pareja2?.id

  const pairNum = (pareja) => {
    if (!pareja || !parejas.length) return null
    const idx = parejas.findIndex((p) => p.id === pareja.id)
    return idx >= 0 ? idx + 1 : null
  }
  const n1   = pairNum(pareja1)
  const n2   = pairNum(pareja2)
  const ganN = ganP1 ? n1 : ganP2 ? n2 : null

  const bubbleCls = (esGanador, esMiPar) =>
    `w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
      esGanador ? 'bg-emerald-500 text-white' :
      finalizado ? 'bg-white/5 text-white/20' :
      esMiPar ? 'bg-[#afca0b]/20 text-[#afca0b]' :
      'bg-white/8 text-white/35'
    }`

  const nameCls = (esGanador, esMiPar) =>
    `text-xs truncate ${
      esGanador ? 'text-white font-semibold' :
      finalizado ? 'text-white/20 line-through' :
      esMiPar ? 'text-[#afca0b] font-medium' :
      'text-white/45'
    }`

  return (
    <div className={`rounded-xl border overflow-hidden ${esMio ? 'border-[#afca0b]/20' : 'border-white/8'}`}>
      {/* Fila principal: P1 | sets | P2 */}
      <div className={`flex items-center gap-2 px-3 py-2.5 ${finalizado ? 'bg-emerald-500/4' : 'bg-white/3'}`}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={bubbleCls(ganP1, pareja1?.id === miParejaId)}>{n1 ?? '?'}</span>
          <span className={nameCls(ganP1, pareja1?.id === miParejaId)}>
            {pareja1 ? `${pareja1.jugador1.split(' ')[0]} / ${pareja1.jugador2.split(' ')[0]}` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {finalizado && resultado?.length > 0 ? (
            resultado.map((s, i) => {
              const p1GanoSet = s.p1 > s.p2
              return (
                <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                  p1GanoSet
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-white/25 bg-white/5 border-white/8'
                }`}>{s.p1}-{s.p2}</span>
              )
            })
          ) : (
            <span className="text-[10px] text-white/15 px-1">vs</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className={`${nameCls(ganP2, pareja2?.id === miParejaId)} text-right`}>
            {pareja2 ? `${pareja2.jugador1.split(' ')[0]} / ${pareja2.jugador2.split(' ')[0]}` : '—'}
          </span>
          <span className={bubbleCls(ganP2, pareja2?.id === miParejaId)}>{n2 ?? '?'}</span>
        </div>
      </div>
      {/* Fila secundaria: horario + ganador */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
        {slot ? (
          <span className="text-[11px] font-medium text-sky-400/70">
            {slot.dia} · {slot.hora ?? ''}
          </span>
        ) : (
          <span className="text-[10px] text-white/20">Sin horario</span>
        )}
        {finalizado && ganN !== null ? (
          <span className="text-[10px] font-bold text-emerald-400">✓ P{ganN} ganó</span>
        ) : (
          <span className="text-[10px] text-white/20">pendiente</span>
        )}
      </div>
    </div>
  )
}

const GrupoReadOnly = ({ grupos, playerName }) => {
  const miZona = grupos?.find((z) =>
    z.parejas.some((p) => p.jugador1 === playerName || p.jugador2 === playerName)
  )
  if (!miZona) return null

  const miPareja    = miZona.parejas.find((p) => p.jugador1 === playerName || p.jugador2 === playerName)
  const clasificado  = miZona.clasificados?.some((p) => p.id === miPareja?.id)
  const zonaCompleta = !!miZona.clasificados

  const pairNum = (pareja) => {
    if (!pareja) return null
    const idx = miZona.parejas.findIndex((p) => p.id === pareja.id)
    return idx >= 0 ? idx + 1 : null
  }

  // Standings para zonas round-robin (2 o 3 parejas)
  const standings = (miZona.capacidad <= 3) ? (() => {
    const wins = {}, pj = {}
    miZona.parejas.forEach((p) => { wins[p.id] = 0; pj[p.id] = 0 })
    miZona.partidos.forEach((m) => {
      if (m.estado === 'finalizado') {
        if (m.pareja1) pj[m.pareja1.id] = (pj[m.pareja1.id] || 0) + 1
        if (m.pareja2) pj[m.pareja2.id] = (pj[m.pareja2.id] || 0) + 1
        if (m.ganador) wins[m.ganador.id] = (wins[m.ganador.id] || 0) + 1
      }
    })
    return [...miZona.parejas]
      .sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0))
      .map((p) => ({ pareja: p, wins: wins[p.id] || 0, pj: pj[p.id] || 0, losses: (pj[p.id] || 0) - (wins[p.id] || 0) }))
  })() : null

  const renderPartidos = () => {
    if (miZona.capacidad === 4) {
      const r1 = miZona.partidos.filter((p) => p.tipo === 'r1')
      const wf = miZona.partidos.find((p) => p.tipo === 'wf')
      const lf = miZona.partidos.find((p) => p.tipo === 'lf')
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Ronda 1</p>
          {r1.map((p) => <PartidoZonaReadOnly key={p.id} partido={p} miParejaId={miPareja?.id} parejas={miZona.parejas} />)}
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mt-1">Final → 1°</p>
          <PartidoZonaReadOnly partido={wf} miParejaId={miPareja?.id} parejas={miZona.parejas} />
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mt-1">Final → 2°</p>
          <PartidoZonaReadOnly partido={lf} miParejaId={miPareja?.id} parejas={miZona.parejas} />
        </div>
      )
    }
    // Round-robin — tarjeta estilo tabla admin (dark theme)
    return (
      <div className="flex flex-col gap-2">
        {miZona.partidos.map((m) => {
          const n1         = pairNum(m.pareja1)
          const n2         = pairNum(m.pareja2)
          const esMio      = m.pareja1?.id === miPareja?.id || m.pareja2?.id === miPareja?.id
          const finalizado = m.estado === 'finalizado'
          const ganP1      = m.ganador?.id === m.pareja1?.id
          const ganP2      = m.ganador?.id === m.pareja2?.id
          const ganN       = ganP1 ? n1 : ganP2 ? n2 : null

          const bubbleCls = (esGanador, esMiPar) =>
            `w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              esGanador ? 'bg-emerald-500 text-white' :
              finalizado ? 'bg-white/5 text-white/20' :
              esMiPar ? 'bg-[#afca0b]/20 text-[#afca0b]' :
              'bg-white/8 text-white/35'
            }`

          const nameCls = (esGanador, esMiPar) =>
            `text-xs truncate ${
              esGanador ? 'text-white font-semibold' :
              finalizado ? 'text-white/20 line-through' :
              esMiPar ? 'text-[#afca0b] font-medium' :
              'text-white/45'
            }`

          return (
            <div key={m.id} className={`rounded-xl border overflow-hidden ${
              esMio ? 'border-[#afca0b]/20' : 'border-white/8'
            }`}>

              {/* Fila principal: P1 | sets | P2 */}
              <div className={`flex items-center gap-2 px-3 py-2.5 ${finalizado ? 'bg-emerald-500/4' : 'bg-white/3'}`}>

                {/* Pareja 1 */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className={bubbleCls(ganP1, m.pareja1?.id === miPareja?.id)}>{n1 ?? '?'}</span>
                  <span className={nameCls(ganP1, m.pareja1?.id === miPareja?.id)}>
                    {m.pareja1 ? `${m.pareja1.jugador1.split(' ')[0]} / ${m.pareja1.jugador2.split(' ')[0]}` : '—'}
                  </span>
                </div>

                {/* Sets (centro) */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {finalizado && m.resultado?.length > 0 ? (
                    m.resultado.map((s, i) => {
                      const p1GanoSet = s.p1 > s.p2
                      return (
                        <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          p1GanoSet
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                            : 'text-white/25 bg-white/5 border-white/8'
                        }`}>
                          {s.p1}-{s.p2}
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-[10px] text-white/15 px-1">vs</span>
                  )}
                </div>

                {/* Pareja 2 */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className={`${nameCls(ganP2, m.pareja2?.id === miPareja?.id)} text-right`}>
                    {m.pareja2 ? `${m.pareja2.jugador1.split(' ')[0]} / ${m.pareja2.jugador2.split(' ')[0]}` : '—'}
                  </span>
                  <span className={bubbleCls(ganP2, m.pareja2?.id === miPareja?.id)}>{n2 ?? '?'}</span>
                </div>
              </div>

              {/* Fila secundaria: horario + resultado */}
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
                {m.slot ? (
                  <span className="text-[11px] font-medium text-sky-400/70">
                    {m.slot.dia} · {m.slot.hora ?? m.slot.franja.split('(')[0].trim()}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/20">Sin horario</span>
                )}
                {finalizado && ganN !== null ? (
                  <span className="text-[10px] font-bold text-emerald-400">✓ P{ganN} ganó</span>
                ) : (
                  <span className="text-[10px] text-white/20">pendiente</span>
                )}
              </div>

            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-3">
      {/* Header zona */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#afca0b] text-xs font-bold">{miZona.nombre}</span>
        <span className="text-white/25 text-[10px]">·</span>
        <span className="text-white/30 text-[10px]">{miZona.capacidad} parejas</span>
        {zonaCompleta && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
            clasificado
              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
              : 'text-white/30 bg-white/5 border-white/10'
          }`}>
            {clasificado ? '✓ Clasificado' : 'Eliminado'}
          </span>
        )}
      </div>

      {/* Tabla de posiciones */}
      {standings && (
        <div className="mb-3 rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="px-3 py-2 text-left text-white/25 font-semibold w-6">#</th>
                <th className="px-3 py-2 text-left text-white/25 font-semibold">Pareja</th>
                <th className="px-3 py-2 text-center text-white/25 font-semibold w-8" title="Partidos jugados">PJ</th>
                <th className="px-3 py-2 text-center text-white/25 font-semibold w-8">G</th>
                <th className="px-3 py-2 text-center text-white/25 font-semibold w-8">P</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(({ pareja, wins, pj, losses }, i) => {
                const esMia       = pareja.id === miPareja?.id
                const esClasificada = miZona.clasificados?.some((c) => c.id === pareja.id)
                return (
                  <tr key={pareja.id} className={`border-b border-white/5 last:border-0 ${esMia ? 'bg-[#afca0b]/5' : ''}`}>
                    <td className="px-3 py-2 font-bold text-white/25">{i + 1}°</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${esMia ? 'text-[#afca0b]' : esClasificada ? 'text-white/70' : 'text-white/35'}`}>
                        {pareja.jugador1} / {pareja.jugador2}
                      </span>
                      {esClasificada && zonaCompleta && (
                        <span className="ml-1.5 text-[9px] text-emerald-400">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-white/30">{pj}</td>
                    <td className="px-3 py-2 text-center font-semibold text-emerald-400">{wins}</td>
                    <td className="px-3 py-2 text-center text-white/30">{losses}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Partidos */}
      <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">Partidos</p>
      {renderPartidos()}
    </div>
  )
}

// ── Modal cancelar inscripción ────────────────────────────────────────────────

const ModalCancelar = ({ torneo, pareja, onClose, onConfirmar }) => {
  const [confirmado, setConfirmado] = useState(false)

  const handleCancelar = () => {
    setConfirmado(true)
    onConfirmar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!confirmado ? onClose : undefined} />
      <div className="relative bg-[#0d1117] border border-white/12 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <style>{`
          @keyframes scaleInCancel { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
          @keyframes drawCircRed   { from { stroke-dashoffset: 138 } to { stroke-dashoffset: 0 } }
          @keyframes drawX         { from { stroke-dashoffset: 40  } to { stroke-dashoffset: 0 } }
          @keyframes fadeUpCancel  { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        `}</style>

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-sm">Cancelar inscripción</h2>
            <p className="text-white/40 text-[11px] mt-0.5 leading-none">{torneo.nombre}</p>
          </div>
          {!confirmado && (
            <button onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/8 p-1.5 rounded-lg transition-all shrink-0">
              <X size={16} />
            </button>
          )}
        </div>

        {confirmado ? (
          /* Pantalla de éxito — cancelación confirmada */
          <div className="flex flex-col items-center justify-center px-6 py-10 gap-5">
            <div style={{ animation: 'scaleInCancel 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none"
                  stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                  style={{ strokeDasharray: 276, strokeDashoffset: 276, animation: 'drawCircRed 0.6s ease-out 0.1s forwards' }}
                />
                <line x1="32" y1="32" x2="64" y2="64" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
                  style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: 'drawX 0.3s ease-out 0.6s forwards' }}
                />
                <line x1="64" y1="32" x2="32" y2="64" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
                  style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: 'drawX 0.3s ease-out 0.75s forwards' }}
                />
              </svg>
            </div>
            <div className="text-center" style={{ animation: 'fadeUpCancel 0.4s ease-out 0.85s both' }}>
              <p className="text-white font-bold text-lg">¡Inscripción cancelada!</p>
              <p className="text-white/40 text-sm mt-1">{torneo.nombre}</p>
            </div>
            <div className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-center" style={{ animation: 'fadeUpCancel 0.4s ease-out 0.95s both' }}>
              <p className="text-white/70 text-sm font-medium">{pareja.jugador1} / {pareja.jugador2}</p>
              <p className="text-white/30 text-xs mt-0.5">{pareja.categoria}</p>
            </div>
            <button
              onClick={onClose}
              style={{ animation: 'fadeUpCancel 0.4s ease-out 1.05s both' }}
              className="w-full py-3 rounded-xl text-sm font-bold bg-white/8 hover:bg-white/12 text-white/60 hover:text-white border border-white/10 transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* Pantalla de confirmación */
          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-white/70 text-sm font-medium">{pareja.jugador1} / {pareja.jugador2}</p>
              <p className="text-white/30 text-xs mt-0.5">{pareja.categoria} · {torneo.nombre}</p>
            </div>
            <p className="text-white/50 text-sm text-center leading-relaxed">
              Si cancelás, perdés el cupo. Si el torneo tiene lista de espera, el siguiente en la lista tomará tu lugar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500/80 hover:bg-red-500 transition-all"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card torneo inscripto ──────────────────────────────────────────────────────

const MiTorneoCard = ({ torneo, playerName, playerId, onEditar, onCancelar }) => {
  const [open, setOpen]             = useState(false)
  const [openGrupos, setOpenGrupos] = useState(false)
  const [showDisp, setShowDisp]     = useState(false)
  const [showInscriptos, setShowInscriptos] = useState(false)
  const miPareja = torneo.inscriptos.find(
    (i) => i.jugador1 === playerName || i.jugador2 === playerName
  )
  const resultado     = getResultado(torneo, playerName)
  const esOwner       = (playerId && miPareja?.jugador1Id)
    ? miPareja.jugador1Id === playerId
    : miPareja?.jugador1 === playerName
  const editable      = puedeEditar(torneo) && !!miPareja && esOwner
  const editableDisp  = puedeEditar(torneo) && !!miPareja && !esOwner
  const tieneGrupos  = torneo.grupos !== null && torneo.formato === 'Fase de grupos + Eliminación'
  const miBracket    = (() => {
    const cat = miPareja?.categoria
    if (cat && torneo.brackets?.[cat]?.rondas) return torneo.brackets[cat]
    const first = Object.values(torneo.brackets ?? {}).find((b) => b?.rondas)
    return first ?? null
  })()

  const esEspera = miPareja?.estado === 'espera'

  return (
    <div className={`bg-[#0d1117] border rounded-2xl overflow-hidden transition-colors ${esEspera ? 'border-amber-400/30 hover:border-amber-400/50' : 'border-white/8 hover:border-white/15'}`}>
      <div className="p-5 flex items-start gap-4">
        {/* Icono */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
          resultado
            ? resultado.label === 'Campeón'
              ? 'bg-[#afca0b]/10 border-[#afca0b]/30'
              : resultado.label === 'Finalista'
                ? 'bg-blue-400/10 border-blue-400/25'
                : 'bg-white/4 border-white/10'
            : 'bg-white/4 border-white/10'
        }`}>
          {resultado ? resultado.icon : '🎾'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm leading-tight truncate">{torneo.nombre}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-lg px-2 py-1 leading-none">
                    <Calendar size={9} className="text-[#afca0b]/50 shrink-0" />
                    <span className="text-white/70 text-[11px] font-semibold">
                      {new Date(torneo.fechaInicio + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <span className="text-white/20 text-[10px]">→</span>
                  <div className="flex items-center gap-1.5 bg-white/6 border border-white/10 rounded-lg px-2 py-1 leading-none">
                    <Flag size={9} className="text-red-400/50 shrink-0" />
                    <span className="text-white/50 text-[11px] font-semibold">
                      {new Date(torneo.fechaFin + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
                {torneo.fechaLimiteInscripcion && puedeEditar(torneo) && (
                  <div className="flex items-center gap-1.5 bg-amber-400/8 border border-amber-400/20 rounded-lg px-2 py-1 leading-none">
                    <Lock size={9} className="text-amber-400/60 shrink-0" />
                    <span className="text-amber-400/80 text-[11px] font-semibold">
                      Cierre {new Date(torneo.fechaLimiteInscripcion + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Badge estado={torneo.estado} />
          </div>

          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {miPareja && (
              <span className="text-xs text-white/40 bg-white/5 border border-white/8 px-2 py-0.5 rounded-lg">
                {miPareja.jugador1} / {miPareja.jugador2}
              </span>
            )}
            {miPareja?.estado === 'espera' && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                En lista de espera
              </span>
            )}
            {miPareja?.sinCompanero && (
              <span className="relative text-[10px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                </span>
                Falta compañero/a
              </span>
            )}
            <span className="text-xs text-white/30">{torneo.categorias.map((c) => catLabelPlayer(torneo, c)).join(', ')}</span>
            <span className="text-xs text-white/30">{torneo.formato}</span>
            {torneo.genero && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                torneo.genero === 'Femenino' ? 'text-pink-400 bg-pink-400/10 border-pink-400/20' :
                torneo.genero === 'Mixto'    ? 'text-violet-400 bg-violet-400/10 border-violet-400/20' :
                torneo.genero === 'Ambos'    ? 'text-teal-400 bg-teal-400/10 border-teal-400/20' :
                                              'text-sky-400 bg-sky-400/10 border-sky-400/20'
              }`}>
                {torneo.genero}
              </span>
            )}
            {resultado && (
              <span className={`text-xs font-bold ml-auto ${resultado.color}`}>
                {resultado.label}
              </span>
            )}
          </div>

          {/* Botón reloj — disponibilidad horaria */}
          {miPareja && (
            <button
              onClick={() => setShowDisp((v) => !v)}
              className={`mt-2.5 flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                showDisp ? 'text-[#afca0b]' : 'text-white/25 hover:text-white/50'
              }`}
            >
              <Clock size={12} />
              Mi disponibilidad horaria
              {showDisp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          {/* Panel disponibilidad */}
          {showDisp && miPareja && (
            <div className="mt-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 flex flex-col gap-1.5">
              {miPareja.sinCompanero ? (
                <p className="text-amber-300/70 text-xs italic">
                  Disponibilidad pendiente — se completará al confirmar compañero/a.
                </p>
              ) : miPareja.disponibilidad?.length ? (
                <>
                  {miPareja.disponibilidad.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#afca0b]/60 shrink-0" />
                      <span className="text-white/60 text-xs font-medium">{s.dia}</span>
                      <span className="text-white/30 text-xs">desde las {s.horaDesde}</span>
                    </div>
                  ))}
                  {miPareja.prefiereMismoDia && (
                    <p className="text-white/25 text-[10px] mt-0.5 italic">Prefiero jugar ambos partidos el mismo día</p>
                  )}
                </>
              ) : (
                <p className="text-white/25 text-xs italic">Sin horarios cargados.</p>
              )}
            </div>
          )}

          {/* Ver quiénes están anotados */}
          {['open', 'closed'].includes(torneo.estado) && torneo.inscriptos.filter((i) => i.estado !== 'espera').length > 1 && (
            <button
              onClick={() => setShowInscriptos(true)}
              className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-white/25 hover:text-white/50 transition-colors"
            >
              <Users size={12} />
              Ver quiénes están anotados ({torneo.inscriptos.filter((i) => i.estado !== 'espera').length})
            </button>
          )}
          {showInscriptos && (
            <ModalInscriptos torneo={torneo} playerName={playerName} onClose={() => setShowInscriptos(false)} />
          )}
        </div>
      </div>

      {/* Footer: editar + cancelar + grupos + bracket */}
      {(editable || editableDisp || tieneGrupos || miBracket) && (
        <div className="border-t border-white/5">
          {editableDisp && (
            <button
              onClick={() => onEditar(torneo, miPareja, true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-sky-400/70 hover:text-sky-400 hover:bg-sky-400/5 border-b border-white/5 transition-all"
            >
              <Clock size={12} />
              Mi disponibilidad
            </button>
          )}
          {editable && (
            <div className="flex border-b border-white/5">
              <button
                onClick={() => onEditar(torneo, miPareja)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs transition-all ${esEspera ? 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/5' : 'text-[#afca0b]/70 hover:text-[#afca0b] hover:bg-[#afca0b]/5'}`}
              >
                <Pencil size={12} />
                {esEspera ? 'Editar en espera' : 'Editar inscripción'}
              </button>
              <div className="w-px bg-white/5" />
              <button
                onClick={() => onCancelar(torneo, miPareja)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all"
              >
                <X size={12} />
                Cancelar
              </button>
            </div>
          )}
          {tieneGrupos && (
            <>
              <button
                onClick={() => setOpenGrupos((v) => !v)}
                className={`w-full flex items-center justify-between px-5 py-2.5 text-xs text-white/30 hover:text-white/60 hover:bg-white/3 transition-all ${editable ? 'border-t border-white/5' : ''}`}
              >
                <span>{openGrupos ? 'Ocultar mi zona' : 'Ver mi zona'}</span>
                {openGrupos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {openGrupos && (
                <div className="px-5 pb-4 border-t border-white/5">
                  <GrupoReadOnly grupos={torneo.grupos} playerName={playerName} />
                </div>
              )}
            </>
          )}
          {miBracket && (
            <>
              <button
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-5 py-2.5 text-xs text-white/30 hover:text-white/60 hover:bg-white/3 transition-all ${(editable || tieneGrupos) ? 'border-t border-white/5' : ''}`}
              >
                <span>{open ? 'Ocultar bracket' : 'Ver bracket'}</span>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {open && (
                <div className="px-5 pb-4 border-t border-white/5">
                  <BracketReadOnly bracket={miBracket} playerName={playerName} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal lista de inscriptos ─────────────────────────────────────────────────

const ModalInscriptos = ({ torneo, playerName, onClose }) => {
  const titulares = torneo.inscriptos.filter((i) => i.estado !== 'espera')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d1117] border border-white/12 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <h3 className="text-white font-semibold text-sm">{torneo.nombre}</h3>
            <p className="text-white/35 text-xs mt-0.5">{titulares.length} pareja{titulares.length !== 1 ? 's' : ''} inscripta{titulares.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-white/60 rounded-lg hover:bg-white/8 transition-all">
            <X size={14} />
          </button>
        </div>
        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-1">
          {titulares.map((p, i) => {
            const esPropio = p.jugador1 === playerName || p.jugador2 === playerName
            return (
              <div key={p.id ?? i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${esPropio ? 'bg-[#afca0b]/8 border border-[#afca0b]/15' : 'hover:bg-white/3'}`}>
                <span className="text-white/25 text-[11px] w-5 shrink-0 text-right">{i + 1}.</span>
                <span className={`text-sm truncate flex-1 ${esPropio ? 'text-[#afca0b] font-semibold' : 'text-white/60'}`}>
                  {p.jugador1}{p.jugador2 && p.jugador2 !== 'Por definir' ? ` / ${p.jugador2}` : ''}
                </span>
                {esPropio && <span className="text-[10px] text-[#afca0b]/50 font-medium shrink-0">vos</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Card torneo disponible ────────────────────────────────────────────────────

const TorneoDisponibleCard = ({ torneo, onInscribirse, playerGenero }) => {
  const catsVisibles = categoriasParaJugador(torneo, playerGenero)
  const [showInscriptosModal, setShowInscriptosModal] = useState(false)

  const catStats = catsVisibles.map((cat) => {
    const cupo        = torneo.cupoLibre ? null : (torneo.cuposPorCategoria?.[cat] ?? null)
    const confirmados = torneo.inscriptos.filter((i) => i.categoria === cat && i.estado !== 'espera').length
    const enEspera    = torneo.inscriptos.filter((i) => i.categoria === cat && i.estado === 'espera').length
    const cupoEspera  = (torneo.cupoEsperaPorCategoria ?? {})[cat] ?? 0
    const lleno       = cupo !== null && confirmados >= cupo
    const hayEsperaCat = lleno && enEspera < cupoEspera
    const totalLlenoCat = lleno && enEspera >= cupoEspera
    const pct         = cupo ? Math.round((confirmados / cupo) * 100) : 0
    return { cat, cupo, confirmados, enEspera, cupoEspera, lleno, hayEsperaCat, totalLlenoCat, pct }
  })

  const todasLlenas    = catStats.length > 0 && catStats.every((s) => s.totalLlenoCat)
  const hayEsperaAlguna = catStats.some((s) => s.hayEsperaCat)

  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{torneo.nombre}</h3>
          <p className="text-white/35 text-xs mt-0.5">
        {torneo.categorias.map((c) => catLabelPlayer(torneo, c)).join(', ')} · {torneo.formato}
        {torneo.genero && (
          <span className={`ml-2 font-semibold px-1.5 py-0.5 rounded border text-[10px] ${
            torneo.genero === 'Femenino' ? 'text-pink-400 bg-pink-400/10 border-pink-400/20' :
            torneo.genero === 'Mixto'    ? 'text-violet-400 bg-violet-400/10 border-violet-400/20' :
            torneo.genero === 'Ambos'    ? 'text-teal-400 bg-teal-400/10 border-teal-400/20' :
                                          'text-sky-400 bg-sky-400/10 border-sky-400/20'
          }`}>
            {torneo.genero}
          </span>
        )}
      </p>
        </div>
        <Badge estado={torneo.estado} />
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-1.5">
          <Calendar size={11} className="text-brand-400 shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="text-white/80 font-bold text-sm">{new Date(torneo.fechaInicio + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit' })}</span>
            <span className="text-white/35 text-[10px] uppercase tracking-wide">{new Date(torneo.fechaInicio + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}</span>
          </span>
        </span>
        <span className="text-white/20 text-xs">────</span>
        <span className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-1.5">
          <Flag size={11} className="text-white/30 shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="text-white/80 font-bold text-sm">{new Date(torneo.fechaFin + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit' })}</span>
            <span className="text-white/35 text-[10px] uppercase tracking-wide">{new Date(torneo.fechaFin + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}</span>
          </span>
        </span>
      </div>

      {torneo.descripcion && (
        <p className="text-white/30 text-xs leading-relaxed line-clamp-2">{torneo.descripcion}</p>
      )}

      {/* Cupo por categoría (solo las del jugador) */}
      <div className="flex flex-col gap-2">
        <span className="text-white/35 text-xs">Parejas inscriptas</span>
        {torneo.cupoLibre ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-sky-400">
            <InfinityIcon size={11} /> Sin límite
          </span>
        ) : (
          catStats.map(({ cat, cupo, confirmados, enEspera, cupoEspera, totalLlenoCat, hayEsperaCat, pct }) => {
            const shortCat = cat.match(/^(\d+°)/)?.[1] ?? cat
            return (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/40 text-xs">{shortCat} Cat.</span>
                  <span className={`text-xs font-semibold ${totalLlenoCat ? 'text-red-400' : hayEsperaCat ? 'text-amber-400' : 'text-white/60'}`}>
                    {confirmados} / {cupo}
                  </span>
                </div>
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalLlenoCat ? 'bg-red-500' : hayEsperaCat ? 'bg-amber-400' : 'bg-[#afca0b]'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {hayEsperaCat && (
                  <div className="flex items-center gap-1 mt-1 group relative">
                    <p className="text-[11px] text-amber-400">
                      Cupo completo · quedan {cupoEspera - enEspera} lugar{cupoEspera - enEspera !== 1 ? 'es' : ''} en espera
                    </p>
                    <Info size={11} className="text-amber-400/60 shrink-0 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1f2e] border border-amber-400/20 rounded-xl p-3 text-xs text-white/70 leading-relaxed shadow-xl z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <p className="font-semibold text-amber-300 mb-1">¿Cómo funciona la lista de espera?</p>
                      <p>El cupo principal está completo, pero podés reservar un lugar en la lista de espera.</p>
                      <p className="mt-1.5">Si alguna pareja cancela, pasás automáticamente a la lista principal y te notificamos al instante.</p>
                      <div className="absolute top-full left-4 border-4 border-transparent border-t-amber-400/20" />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Lista de inscriptos — abre modal */}
      {['open', 'closed'].includes(torneo.estado) && torneo.inscriptos.filter((i) => i.estado !== 'espera').length > 0 && (
        <>
          <button
            onClick={() => setShowInscriptosModal(true)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            <Users size={12} />
            Ver quiénes están anotados ({torneo.inscriptos.filter((i) => i.estado !== 'espera').length})
          </button>
          {showInscriptosModal && (
            <ModalInscriptos torneo={torneo} playerName={null} onClose={() => setShowInscriptosModal(false)} />
          )}
        </>
      )}

      <button
        onClick={() => onInscribirse(torneo)}
        disabled={todasLlenas}
        className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
          todasLlenas
            ? 'bg-white/5 text-white/25 cursor-not-allowed'
            : hayEsperaAlguna
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
              : 'bg-[#afca0b] hover:bg-[#c8e00d] text-[#0d1117]'
        }`}
      >
        <Plus size={15} />
        {todasLlenas ? 'Sin lugares' : hayEsperaAlguna ? 'Anotarme en lista de espera' : 'Inscribirme'}
      </button>
    </div>
  )
}

// ── Modal inscripción ─────────────────────────────────────────────────────────

const ModalInscripcion = ({ torneo, jugador1, jugador1Dni, playerGenero, parejaExistente, onClose, onConfirmar, token, soloDisponibilidad = false }) => {
  const isEdit = !!parejaExistente
  const catsDisponibles = categoriasParaJugador(torneo, playerGenero)
  const diaCorte  = torneo.diaInicioEliminatoria  ?? null
  const horaCorte = torneo.horaInicioEliminatoria ?? null

  // Días disponibles para grupos (excluye días de eliminatoria)
  const diasValidos = getDiasValidos(torneo.fechaInicio, torneo.fechaFin)
    .filter((dia) => esSlotDeGrupos(dia, '00:00', diaCorte, horaCorte))

  // Horas disponibles según el día (filtra por corte de eliminatoria)
  const horasParaDia = (dia) =>
    HORAS_DISPONIBLES.filter((h) => esSlotDeGrupos(dia, h, diaCorte, horaCorte))

  const [jugador2, setJugador2]         = useState(parejaExistente?.jugador2 ?? '')
  const [jugador2Dni, setJugador2Dni]   = useState(parejaExistente?.jugador2Dni ?? '')
  // lookup del compañero por DNI
  const [dniLookup, setDniLookup]       = useState({ status: 'idle', data: null })
  // campos del mini-form cuando el compañero no está registrado
  const [jugador2Nombre, setJugador2Nombre]     = useState('')
  const [jugador2Apellido, setJugador2Apellido] = useState('')
  const [categoria, setCategoria]     = useState(parejaExistente?.categoria ?? catsDisponibles[0] ?? '')
  const [slots, setSlots]             = useState(parejaExistente?.disponibilidad ?? [])
  const [prefiereMismoDia, setPrefiereMismoDia] = useState(parejaExistente?.prefiereMismoDia ?? false)
  const [pendingDia, setPendingDia]   = useState(diasValidos[0] ?? DIAS_SEMANA[0])
  const [pendingHora, setPendingHora] = useState(horasParaDia(diasValidos[0] ?? DIAS_SEMANA[0])[0] ?? '18:00')
  const [errors, setErrors]           = useState({})
  const [exito, setExito]             = useState(null) // null | { data, vaAEspera }
  const [sinCompanero, setSinCompanero] = useState(parejaExistente?.sinCompanero ?? false)

  // Días que aún no tienen slot agregado
  const diasLibres = diasValidos.filter((d) => !slots.some((s) => s.dia === d))

  const soloUnDia = [...new Set(slots.map((s) => s.dia))].length <= 1
  useEffect(() => { if (!soloUnDia) setPrefiereMismoDia(false) }, [soloUnDia])

  // Si el día seleccionado ya fue agregado, mover al primer día libre
  useEffect(() => {
    if (!diasLibres.includes(pendingDia)) {
      const primerLibre = diasLibres[0]
      if (primerLibre) {
        setPendingDia(primerLibre)
        setPendingHora(horasParaDia(primerLibre)[0] ?? '18:00')
      }
    }
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lookup del compañero por DNI (debounce 400ms)
  useEffect(() => {
    if (sinCompanero || !token) return
    if (jugador2Dni.length < 7) {
      if (dniLookup.status !== 'idle') {
        setDniLookup({ status: 'idle', data: null })
        setJugador2('')
        setJugador2Nombre('')
        setJugador2Apellido('')
      }
      return
    }
    // No re-disparar si el usuario ya confirmó el alta manual
    if (dniLookup.status === 'confirmed') return
    setDniLookup({ status: 'loading', data: null })
    const timer = setTimeout(() => {
      api.get(`/jugadores/por-dni?dni=${jugador2Dni}`, { Authorization: `Bearer ${token}` })
        .then((res) => {
          if (res.found) {
            setDniLookup({ status: 'found', data: res })
            setJugador2(`${res.nombre} ${res.apellido}`.trim())
            setJugador2Nombre('')
            setJugador2Apellido('')
          } else {
            setDniLookup({ status: 'not_found', data: null })
            setJugador2('')
          }
        })
        .catch(() => {
          setDniLookup({ status: 'error', data: null })
        })
    }, 400)
    return () => clearTimeout(timer)
  }, [jugador2Dni, sinCompanero]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras el usuario escribe en el mini-form, actualizar el campo nombre en tiempo real
  useEffect(() => {
    if (dniLookup.status === 'not_found' || dniLookup.status === 'confirmed') {
      setJugador2(`${jugador2Nombre} ${jugador2Apellido}`.trim())
    }
  }, [jugador2Nombre, jugador2Apellido, dniLookup.status])

  const MAX_SLOTS = 2

  const agregarSlot = () => {
    if (slots.length >= MAX_SLOTS) {
      setErrors((prev) => ({ ...prev, slots: `Máximo ${MAX_SLOTS} horarios por pareja` }))
      return
    }
    setSlots((prev) => [...prev, { dia: pendingDia, horaDesde: pendingHora }])
    setErrors((prev) => ({ ...prev, slots: '' }))
  }

  const quitarSlot = (idx) => setSlots((prev) => prev.filter((_, i) => i !== idx))

  const validate = () => {
    const e = {}

    // Verificar que el jugador actual no esté ya inscripto (por DNI)
    if (!isEdit && jugador1Dni) {
      const j1Conflict = torneo.inscriptos.some(
        (i) => i.jugador1Dni === jugador1Dni || i.jugador2Dni === jugador1Dni
      )
      if (j1Conflict) e.general = 'Ya estás inscripto en este torneo (o fuiste agregado como compañero por otra pareja).'
    }

    if (!sinCompanero) {
      if (!jugador2Dni.trim())                          e.jugador2Dni = 'Completá el DNI de tu compañero/a'
      else if (!/^\d{7,8}$/.test(jugador2Dni.trim()))  e.jugador2Dni = 'El DNI debe tener entre 7 y 8 números'
      else {
        const dniBuscar = jugador2Dni.trim()
        const j2Conflict = torneo.inscriptos.find(
          (i) => (i.jugador1Dni === dniBuscar || i.jugador2Dni === dniBuscar) &&
                 (isEdit ? i.id !== parejaExistente?.id : true)
        )
        if (j2Conflict) e.jugador2Dni = 'Este jugador ya está inscripto en otra pareja del torneo.'
      }

      if (dniLookup.status === 'not_found') {
        e.jugador2 = 'Completá el nombre y apellido y hacé clic en "Dar de alta"'
      } else if (!jugador2.trim()) {
        e.jugador2 = 'Completá el nombre de tu compañero/a'
      }

    }
    return e
  }

  const handleConfirmar = () => {
    if (soloDisponibilidad) {
      setExito({ data: { disponibilidad: slots, prefiereMismoDia }, vaAEspera: false })
      return
    }
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    // Si el compañero no existía, construir nombre completo desde el mini-form
    const j2NombreCompleto = dniLookup.status === 'not_found'
      ? `${jugador2Nombre.trim()} ${jugador2Apellido.trim()}`.trim()
      : jugador2.trim()

    const data = {
      jugador1,
      jugador1Dni: jugador1Dni ?? '',
      jugador2: sinCompanero ? 'Por definir' : j2NombreCompleto,
      jugador2Dni: sinCompanero ? '' : jugador2Dni.trim(),
      // Solo se envían cuando el compañero no está en DB (para crear el pre-registro)
      ...(dniLookup.status === 'not_found' && !sinCompanero && {
        jugador2Nombre: jugador2Nombre.trim(),
        jugador2Apellido: jugador2Apellido.trim(),
      }),
      categoria,
      fecha: new Date().toISOString().split('T')[0],
      disponibilidad: slots,
      prefiereMismoDia,
      sinCompanero,
    }
    // Calcular si va a espera para mostrar el mensaje correcto
    const cupoMax     = torneo.cupoLibre ? null : (torneo.cuposPorCategoria?.[categoria] ?? null)
    const confirmados = torneo.inscriptos.filter((i) => i.categoria === categoria && i.estado !== 'espera').length
    const enEsperaCat = torneo.inscriptos.filter((i) => i.categoria === categoria && i.estado === 'espera').length
    const cupoEsperaCat = (torneo.cupoEsperaPorCategoria ?? {})[categoria] ?? 0
    const vaAEspera   = cupoMax !== null && confirmados >= cupoMax && enEsperaCat < cupoEsperaCat
    setExito({ data, vaAEspera })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/12 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-sm">
              {soloDisponibilidad ? 'Mi disponibilidad' : isEdit ? 'Editar inscripción' : 'Inscripción al torneo'}
            </h2>
            <p className="text-white/40 text-[11px] mt-0.5 leading-none">{torneo.nombre}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/8 p-1.5 rounded-lg transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Pantalla de éxito */}
        {exito && (
          <>
            <style>{`
              @keyframes scaleIn  { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
              @keyframes fadeUp   { from { transform: translateY(14px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
              @keyframes drawCirc { from { stroke-dashoffset: 138 } to { stroke-dashoffset: 0 } }
              @keyframes drawChk  { from { stroke-dashoffset: 32 } to { stroke-dashoffset: 0 } }
            `}</style>
            <div className="flex flex-col items-center justify-center px-6 py-10 gap-5">

              {/* Ícono animado */}
              <div style={{ animation: 'scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                {exito.vaAEspera ? (
                  <div className="w-24 h-24 rounded-full bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center text-5xl">
                    ⏳
                  </div>
                ) : (
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="44" fill="none"
                      stroke="#afca0b" strokeWidth="3" strokeLinecap="round"
                      style={{ strokeDasharray: 276, strokeDashoffset: 276, animation: 'drawCirc 0.6s ease-out 0.1s forwards' }}
                    />
                    <path d="M30 50 L43 63 L67 37" fill="none"
                      stroke="#afca0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                      style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: 'drawChk 0.35s ease-out 0.6s forwards' }}
                    />
                  </svg>
                )}
              </div>

              {/* Título */}
              <div className="text-center" style={{ animation: 'fadeUp 0.4s ease-out 0.5s both' }}>
                <h3 className={`font-bold text-xl ${exito.vaAEspera ? 'text-amber-400' : 'text-white'}`}>
                  {soloDisponibilidad ? '¡Disponibilidad guardada!' : isEdit ? '¡Cambios guardados!' : exito.vaAEspera ? 'En lista de espera' : '¡Inscripción confirmada!'}
                </h3>
                <p className="text-white/35 text-sm mt-1">{torneo.nombre}</p>
              </div>

              {/* Pareja */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center"
                style={{ animation: 'fadeUp 0.4s ease-out 0.65s both' }}>
                <p className="text-white text-sm font-semibold">
                  {jugador1}{' '}
                  <span className="text-white/30 font-normal">/</span>{' '}
                  {sinCompanero
                    ? <span className="text-amber-300 font-normal italic text-xs">Sin compañero/a aún</span>
                    : exito.data.jugador2}
                </p>
                <p className="text-white/35 text-xs mt-0.5">{exito.data.categoria}</p>
              </div>

              {/* Mensaje */}
              <p className="text-center text-xs leading-relaxed"
                style={{ animation: 'fadeUp 0.4s ease-out 0.75s both',
                  color: exito.vaAEspera ? 'rgba(251,191,36,0.6)' : sinCompanero ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.3)' }}>
                {isEdit
                  ? 'Tus datos de inscripción fueron actualizados correctamente.'
                  : exito.vaAEspera
                    ? 'El cupo está completo por ahora. Te avisaremos si se libera un lugar.'
                    : sinCompanero
                      ? 'Tu cupo está reservado. Editá la inscripción cuando sepas con quién jugás.'
                      : 'El admin podrá ver tu inscripción en el panel de torneos.'}
              </p>

              {/* Aviso disponibilidad faltante */}
              {!isEdit && !sinCompanero && !exito.vaAEspera && slots.length === 0 && (
                <div
                  className="w-full flex items-start gap-2 bg-amber-400/8 border border-amber-400/25 rounded-xl px-3 py-2.5"
                  style={{ animation: 'fadeUp 0.4s ease-out 0.8s both' }}
                >
                  <span className="text-amber-400 text-sm shrink-0">⏰</span>
                  <p className="text-amber-300/80 text-[11px] leading-relaxed">
                    Recordá agregar tu disponibilidad horaria antes del cierre de inscripción para que el admin pueda armarte el fixture.
                  </p>
                </div>
              )}

              {/* Botón Listo */}
              <button
                onClick={() => onConfirmar(exito.data)}
                style={{ animation: 'fadeUp 0.4s ease-out 0.85s both' }}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  exito.vaAEspera
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                    : 'bg-[#afca0b] hover:bg-[#c8e00d] text-[#0d1117]'
                }`}
              >
                Listo
              </button>
            </div>
          </>
        )}

        {/* Form */}
        <div className={`flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 ${exito ? 'hidden' : ''}`}>

          {/* Error general (ej: doble inscripción) */}
          {errors.general && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
              <span className="text-red-400 text-sm shrink-0">✕</span>
              <p className="text-red-300/90 text-[11px] leading-relaxed">{errors.general}</p>
            </div>
          )}

          {/* Toggle sin compañero */}
          {!soloDisponibilidad && (
          <button
            type="button"
            onClick={() => setSinCompanero((v) => !v)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left w-full ${
              sinCompanero
                ? 'border-amber-400/30 bg-amber-400/8'
                : 'border-white/8 bg-white/3 hover:bg-white/5'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
              sinCompanero ? 'bg-amber-400 border-amber-400' : 'border-white/20 bg-transparent'
            }`}>
              {sinCompanero && (
                <svg viewBox="0 0 10 8" className="w-2 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="#0d1117" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
            <span className={`text-[11px] font-medium leading-snug ${sinCompanero ? 'text-amber-300' : 'text-white/45'}`}>
              Todavía no sé con quién juego · Reservar cupo igual
            </span>
          </button>
          )}

          {/* Jugadores */}
          {!soloDisponibilidad && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            {/* J1 nombre */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Jugador 1 (vos)</label>
              <div className="bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white/40 truncate">
                {jugador1}
              </div>
            </div>
            {/* J2 nombre — siempre visible, se actualiza en tiempo real */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Compañero/a</label>
              {sinCompanero ? (
                <div className="bg-white/3 border border-white/5 rounded-xl px-2.5 py-2 text-xs text-amber-300/50 italic">
                  Por definir
                </div>
              ) : (dniLookup.status === 'found' || dniLookup.status === 'confirmed') ? (
                <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                  dniLookup.status === 'found'
                    ? 'bg-emerald-500/8 border border-emerald-500/20'
                    : 'bg-amber-500/8 border border-amber-500/20'
                }`}>
                  <span className="text-xs text-white flex-1 truncate">{jugador2 || <span className="text-white/25 italic">Nombre y apellido</span>}</span>
                  <span className={`text-[10px] font-semibold shrink-0 flex items-center gap-1 ${
                    dniLookup.status === 'found' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                      dniLookup.status === 'found' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    {dniLookup.status === 'found'
                      ? (dniLookup.data?.cuentaActiva ? 'Registrado' : 'Pre-registrado')
                      : 'Sin cuenta'}
                  </span>
                  {dniLookup.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => setDniLookup({ status: 'not_found', data: null })}
                      className="text-white/30 hover:text-amber-400 transition-colors ml-1 p-0.5"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              ) : (dniLookup.status === 'not_found') ? (
                // Preview en vivo mientras escribe en el mini-form
                <div className="flex items-center gap-2 bg-white/3 border border-amber-500/20 rounded-xl px-2.5 py-2">
                  <span className={`text-xs flex-1 truncate ${jugador2 ? 'text-white' : 'text-white/20 italic'}`}>
                    {jugador2 || 'Nombre y apellido'}
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={jugador2}
                  onChange={(e) => {
                    const raw = e.target.value
                    setJugador2(raw.replace(/[0-9]/g, ''))
                    if (/[0-9]/.test(raw))
                      setErrors((p) => ({ ...p, jugador2: 'Solo letras permitidas' }))
                    else
                      setErrors((p) => ({ ...p, jugador2: '' }))
                  }}
                  placeholder="Nombre y apellido"
                  disabled={dniLookup.status === 'loading'}
                  className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all placeholder-white/20 disabled:opacity-40 ${
                    errors.jugador2 ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
              )}
              {errors.jugador2 && <p className="text-red-400 text-[10px] mt-0.5">{errors.jugador2}</p>}
            </div>
            {/* J1 DNI */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">DNI</label>
              <div className="bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white/40 truncate">
                {jugador1Dni || <span className="text-white/20 italic">Sin DNI en perfil</span>}
              </div>
            </div>
            {/* J2 DNI */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">
                DNI compañero/a {!sinCompanero && <span className="text-red-400">*</span>}
              </label>
              {sinCompanero ? (
                <div className="bg-white/3 border border-white/5 rounded-xl px-2.5 py-2 text-xs text-amber-300/50 italic">
                  Por definir
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={jugador2Dni}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setJugador2Dni(val)
                      if (val.length > 0 && val.length < 7)
                        setErrors((p) => ({ ...p, jugador2Dni: 'Mínimo 7 dígitos' }))
                      else
                        setErrors((p) => ({ ...p, jugador2Dni: '' }))
                    }}
                    placeholder="12345678"
                    maxLength={8}
                    inputMode="numeric"
                    className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all placeholder-white/20 pr-7 ${
                      errors.jugador2Dni ? 'border-red-500/50' : dniLookup.status === 'found' ? 'border-emerald-500/30' : 'border-white/10'
                    }`}
                  />
                  {/* Indicador de estado del lookup */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {dniLookup.status === 'loading' && (
                      <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                    )}
                    {dniLookup.status === 'found' && (
                      <span className="text-emerald-400 text-[11px] font-bold">✓</span>
                    )}
                    {dniLookup.status === 'not_found' && (
                      <span className="text-amber-400 text-[11px]">?</span>
                    )}
                  </div>
                </div>
              )}
              {errors.jugador2Dni && <p className="text-red-400 text-[10px] mt-0.5">{errors.jugador2Dni}</p>}
            </div>
          </div>
          )}

          {/* Mini-form alta compañero — visible solo cuando el DNI no está registrado */}
          {!soloDisponibilidad && !sinCompanero && dniLookup.status === 'not_found' && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">
                  Alta rápida — sin cuenta · Tu compañero/a podrá registrarse después con este DNI y quedará vinculado automáticamente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-white/40 block mb-1">Nombre <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={jugador2Nombre}
                    onChange={(e) => {
                      setJugador2Nombre(e.target.value.replace(/[0-9]/g, ''))
                      setErrors((p) => ({ ...p, jugador2Nombre: '' }))
                    }}
                    placeholder="Juan"
                    className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/50 transition-all placeholder-white/20 ${
                      errors.jugador2Nombre ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  />
                  {errors.jugador2Nombre && <p className="text-red-400 text-[10px] mt-0.5">{errors.jugador2Nombre}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/40 block mb-1">Apellido <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={jugador2Apellido}
                    onChange={(e) => {
                      setJugador2Apellido(e.target.value.replace(/[0-9]/g, ''))
                      setErrors((p) => ({ ...p, jugador2Apellido: '' }))
                    }}
                    placeholder="Pérez"
                    className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/50 transition-all placeholder-white/20 ${
                      errors.jugador2Apellido ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  />
                  {errors.jugador2Apellido && <p className="text-red-400 text-[10px] mt-0.5">{errors.jugador2Apellido}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setJugador2Dni('')
                    setJugador2('')
                    setJugador2Nombre('')
                    setJugador2Apellido('')
                    setDniLookup({ status: 'idle', data: null })
                  }}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const eNombre   = !jugador2Nombre.trim()   ? 'Nombre requerido'   : ''
                    const eApellido = !jugador2Apellido.trim() ? 'Apellido requerido' : ''
                    if (eNombre || eApellido) {
                      setErrors((p) => ({ ...p, jugador2Nombre: eNombre, jugador2Apellido: eApellido }))
                      return
                    }
                    setDniLookup({ status: 'confirmed', data: null })
                  }}
                  className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-400 rounded-lg px-3 py-1.5 transition-all"
                >
                  Dar de alta
                </button>
              </div>
            </div>
          )}

          {/* Info DNI */}
          {!soloDisponibilidad && (
          <InfoBlock label="¿Por qué pedimos el DNI del compañero/a?" variant="dark">
            <p>Usamos el DNI para buscar si tu compañero/a ya está en el sistema y vincular su historial de partidos y estadísticas correctamente.</p>
            <p>Al ingresar el DNI vas a ver uno de estos estados:</p>
            <ul className="mt-1 flex flex-col gap-1">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /><span><span className="font-semibold text-emerald-400">Registrado</span> — tiene cuenta activa en el club.</span></li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /><span><span className="font-semibold text-emerald-400">Pre-registrado</span> — el admin lo cargó pero aún no activó su cuenta.</span></li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /><span><span className="font-semibold text-amber-400">Sin cuenta</span> — no existe en el sistema. Podés crearlo vos ingresando su nombre y apellido. Cuando se registre quedará vinculado automáticamente.</span></li>
            </ul>
            <p className="mt-1">Si cometiste un error en el DNI podés editarlo antes de que el admin cierre las inscripciones.</p>
          </InfoBlock>
          )}

          {/* Categoría */}
          {!soloDisponibilidad && catsDisponibles.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Categoría</label>
              {catsDisponibles.length === 1 ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white/70">
                  {catLabelPlayer(torneo, catsDisponibles[0])}
                </div>
              ) : (
                <>
                  <InfoBlock label="¿Qué categoría elegir?" variant="dark">
                    <p>Inscribite en la categoría que corresponde a tu nivel de juego. 1° categoría es el nivel más alto, a mayor número menor nivel.</p>
                    <p>Si no sabés cuál te corresponde, consultá con el admin del club antes de inscribirte.</p>
                  </InfoBlock>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all"
                    style={{ backgroundColor: '#0d1117' }}
                  >
                    {catsDisponibles.map((c) => (
                      <option key={c} value={c} style={{ backgroundColor: '#0d1117' }}>{catLabelPlayer(torneo, c)}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Disponibilidad — oculta cuando sin compañero/a */}
          {sinCompanero && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5">
              <span className="text-amber-400 text-sm shrink-0 mt-0.5">⏳</span>
              <p className="text-amber-300/70 text-xs leading-relaxed">
                Cargá la disponibilidad cuando confirmes con tu compañero/a. Podrás editarla desde "Mis torneos".
              </p>
            </div>
          )}
          <div className={sinCompanero ? 'hidden' : ''}>
            <InfoBlock label="¿Cómo funciona la disponibilidad?" variant="dark">
              <p>Indicá los días y horarios en los que podés jugar. El admin usa esa info para armar el fixture y asignarte partidos en momentos que te queden bien.</p>
              <p>Podés agregar hasta <span className="font-semibold text-white/80">{MAX_SLOTS} horarios</span>. Cuantos más pongas, más fácil es que te toquen partidos en días convenientes.</p>
              <p>Si el torneo tiene fase de grupos y fase eliminatoria, los horarios que cargues aplican solo a la fase de grupos.</p>
            </InfoBlock>
            <label className="text-[10px] font-medium text-white/40 flex items-center gap-1.5 mb-2">
              Disponibilidad horaria
              <span className="text-white/25 font-normal">(coordinada con tu pareja)</span>
              <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                slots.length >= MAX_SLOTS ? 'text-amber-400 bg-amber-400/10' : 'text-white/20 bg-white/5'
              }`}>
                {slots.length}/{MAX_SLOTS}
              </span>
            </label>

            {/* Selector de nuevo slot — oculto si ya no hay días disponibles */}
            <div className={`flex flex-col gap-2 ${diasLibres.length === 0 ? 'hidden' : ''}`}>
              {/* Día + Agregar en fila */}
              <div className="flex gap-2">
                <select
                  value={pendingDia}
                  onChange={(e) => {
                    const d = e.target.value
                    setPendingDia(d)
                    setPendingHora(horasParaDia(d)[0] ?? '18:00')
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#afca0b]/50 transition-all"
                  style={{ backgroundColor: '#0d1117' }}
                >
                  {diasLibres.map((d) => (
                    <option key={d} value={d} style={{ backgroundColor: '#0d1117' }}>{d}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={agregarSlot}
                  disabled={slots.length >= MAX_SLOTS}
                  className="flex items-center gap-1 bg-[#afca0b]/15 hover:bg-[#afca0b]/25 border border-[#afca0b]/30 text-[#afca0b] text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <Plus size={12} />
                  Agregar
                </button>
              </div>
              {/* Grid de horas */}
              <div className="grid grid-cols-5 gap-1">
                {horasParaDia(pendingDia).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPendingHora(h)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      pendingHora === h
                        ? 'bg-[#afca0b] border-[#afca0b] text-[#0d1117]'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Slots agregados */}
            {slots.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {slots.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[#afca0b]/8 border border-[#afca0b]/20 rounded-xl px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#afca0b] text-xs font-semibold">{s.dia}</span>
                      <span className="text-white/25 text-xs">·</span>
                      <span className="text-white/60 text-xs">desde las {s.horaDesde}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarSlot(i)}
                      className="text-white/25 hover:text-red-400 transition-colors p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {errors.slots && <p className="text-red-400 text-xs mt-1">{errors.slots}</p>}
            {slots.length === 0 && (
              <p className="text-white/25 text-[11px] mt-1 leading-relaxed">
                Podés agregar tu disponibilidad ahora o editarla más tarde desde la página del torneo.
              </p>
            )}

            {/* Preferencia mismo día — fila compacta */}
            <button
              type="button"
              onClick={() => soloUnDia && setPrefiereMismoDia((v) => !v)}
              disabled={!soloUnDia}
              className={`mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left ${
                !soloUnDia
                  ? 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                  : prefiereMismoDia
                    ? 'border-[#afca0b]/30 bg-[#afca0b]/8'
                    : 'border-white/8 bg-white/3 hover:bg-white/5'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                prefiereMismoDia && soloUnDia ? 'bg-[#afca0b] border-[#afca0b]' : 'border-white/20 bg-transparent'
              }`}>
                {prefiereMismoDia && soloUnDia && (
                  <svg viewBox="0 0 10 8" className="w-2 h-2">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#0d1117" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </div>
              <span className={`text-[11px] font-medium ${prefiereMismoDia && soloUnDia ? 'text-[#afca0b]' : 'text-white/45'}`}>
                Preferimos jugar los 2 partidos el mismo día
              </span>
            </button>
            <InfoBlock label="¿Cómo funciona esta preferencia?" variant="dark">
              <p>Al marcar esta opción, el sistema intentará asignarte los 2 partidos de fase de grupos en el mismo día que hayas indicado.</p>
              <p>Es una preferencia, no una garantía. Si ese día ya no tiene canchas disponibles para tu horario, el segundo partido puede quedar en otro día dentro de tu disponibilidad.</p>
              <p>Solo podés activarla si cargaste un único día disponible. Si agregás más de un día, la opción se desactiva automáticamente.</p>
            </InfoBlock>
          </div>
        </div>

        {/* Footer — oculto cuando se muestra la pantalla de éxito */}
        {!exito && (
          <div className="px-5 py-3 border-t border-white/8 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white/40 hover:text-white hover:bg-white/6 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              className="px-5 py-2 text-xs font-bold bg-[#afca0b] hover:bg-[#c8e00d] text-[#0d1117] rounded-xl transition-all"
            >
              {soloDisponibilidad ? 'Guardar disponibilidad' : isEdit ? 'Guardar cambios' : 'Confirmar inscripción'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mapper backend → store (para jugador) ────────────────────────────────────

const mapBackendTorneoPlayer = (t) => ({
  id: t.id,
  nombre: t.nombre,
  categorias: t.categorias ?? [],
  formato: t.formato,
  genero: t.genero,
  estado: t.estado,
  cupoLibre: t.cupoLibre,
  cuposPorCategoria: t.cuposPorCategoria ?? {},
  cupoEsperaPorCategoria: t.cupoEsperaPorCategoria ?? {},
  generoPorCategoria: t.generoPorCategoria ?? {},
  canchasAsignadas: t.canchasAsignadas ?? [],
  fechaInicio: t.fechaInicio,
  fechaFin: t.fechaFin,
  fechaLimiteInscripcion: t.fechaLimiteInscripcion,
  descripcion: t.descripcion ?? '',
  inscriptos: (t.parejas ?? []).map((p) => ({
    id: p.id, jugador1: p.jugador1, jugador2: p.jugador2,
    jugador1Id: p.jugador1Id ?? null,
    jugador1Dni: p.jugador1Dni, jugador2Dni: p.jugador2Dni,
    categoria: p.categoria, fecha: p.fecha,
    estado: p.estado ?? 'inscripto',
    sinCompanero: p.sinCompanero ?? false,
    disponibilidad: p.disponibilidad ?? [], prefiereMismoDia: p.prefiereMismoDia ?? false,
  })),
  grupos: t.grupos ?? null,
  brackets: t.brackets ?? {},
  ganador: t.ganador,
  subcampeon: t.subcampeon,
  diaInicioEliminatoria:  t.diaInicioEliminatoria  ?? null,
  horaInicioEliminatoria: t.horaInicioEliminatoria ?? null,
  ...(t.personalizacion ?? {}),
})

// ── Página principal ──────────────────────────────────────────────────────────

const PlayerTournamentsPage = () => {
  const { torneos, setTorneos, addParejaFromApi, addPareja, updatePareja, bajaInscripto } = useTorneosStore()
  const { player, token: playerToken } = usePlayerStore()
  const addInscripcionEnEspera     = useTorneosNotif((s) => s.addInscripcionEnEspera)
  const nuevaInscripcionTorneo     = useNotificacionesStore((s) => s.nuevaInscripcionTorneo)
  const bajaTorneo                 = useNotificacionesStore((s) => s.bajaTorneo)
  const actualizacionTorneo        = useNotificacionesStore((s) => s.actualizacionTorneo)
  const completacionTorneo         = useNotificacionesStore((s) => s.completacionTorneo)
  const [modalTorneo, setModalTorneo]   = useState(null)
  const [modalEdicion, setModalEdicion] = useState(null) // { torneo, pareja }
  const [toastEspera, setToastEspera]   = useState(null)
  const [toastError, setToastError]     = useState(null)
  const [modalCancelar, setModalCancelar] = useState(null) // { torneo, pareja }

  const playerName = player
    ? `${player.nombre}${player.apellido ? ' ' + player.apellido : ''}`
    : ''
  const playerDni  = player?.dni    ?? ''
  const playerClubId = player?.club?.id ?? player?.clubId ?? null
  const authH      = playerToken ? { Authorization: `Bearer ${playerToken}` } : {}

  // Cargar torneos desde backend si el store no tiene datos del backend
  useEffect(() => {
    if (!playerClubId) return
    const hayBackend = torneos.some((t) => typeof t.id === 'string')
    if (hayBackend) return // ya cargados por otra página
    api.get(`/torneos?clubId=${playerClubId}`)
      .then((data) => { if (Array.isArray(data) && data.length > 0) setTorneos(data.map(mapBackendTorneoPlayer)) })
      .catch(() => {})
  }, [playerClubId])

  const puedeInscribirse = (torneo) => {
    // Femenino: exclusivo para mujeres
    if (torneo.genero === 'Femenino') return player?.genero === 'Femenino'
    // Ambos: el jugador debe tener al menos una categoría disponible según su género
    if (torneo.genero === 'Ambos') return categoriasParaJugador(torneo, player?.genero).length > 0
    // Masculino y Mixto: todos pueden
    return true
  }

  const misTorneos  = torneos.filter((t) => estaInscripto(t, playerName))
  const disponibles = torneos.filter((t) =>
    t.estado === 'open' && !estaInscripto(t, playerName) && puedeInscribirse(t)
  )

  const alertasDeadline = misTorneos.filter((t) => {
    if (!t.fechaLimiteInscripcion) return false
    const p = t.inscriptos.find((i) => i.jugador1 === playerName || i.jugador2 === playerName)
    if (!p?.sinCompanero) return false
    const dias = Math.ceil((new Date(t.fechaLimiteInscripcion + 'T23:59:59') - new Date()) / 86400000)
    return dias > 0 && dias <= 4
  })

  const titulos = misTorneos.filter((t) => esDePareja(t.ganador, playerName)).length
  const finales  = misTorneos.filter((t) => esDePareja(t.subcampeon, playerName)).length

  const isBackendTorneo = (t) => typeof t?.id === 'string'

  const handleConfirmarInscripcion = async (pareja) => {
    if (!modalTorneo) return
    const cat         = pareja.categoria
    const cupoMax     = modalTorneo.cupoLibre ? null : (modalTorneo.cuposPorCategoria?.[cat] ?? null)
    const confirmados = modalTorneo.inscriptos.filter((i) => i.categoria === cat && i.estado !== 'espera').length
    const enEsperaCat = modalTorneo.inscriptos.filter((i) => i.categoria === cat && i.estado === 'espera').length
    const cupoEsperaCat = (modalTorneo.cupoEsperaPorCategoria ?? {})[cat] ?? 0
    const vaAEspera   = cupoMax !== null && confirmados >= cupoMax && enEsperaCat < cupoEsperaCat

    if (isBackendTorneo(modalTorneo) && playerToken) {
      try {
        const p = await api.post(`/torneos/${modalTorneo.id}/inscribir`, { ...pareja }, authH)
        addParejaFromApi(modalTorneo.id, {
          id: p.id, jugador1: p.jugador1, jugador2: p.jugador2,
          jugador1Id: p.jugador1Id ?? null,
          jugador1Dni: p.jugador1Dni, jugador2Dni: p.jugador2Dni,
          categoria: p.categoria, fecha: p.fecha,
          estado: p.estado ?? 'inscripto',
          sinCompanero: p.sinCompanero ?? false,
          disponibilidad: p.disponibilidad ?? [], prefiereMismoDia: p.prefiereMismoDia ?? false,
        })
        nuevaInscripcionTorneo({
          jugador1: pareja.jugador1, jugador2: pareja.jugador2,
          categoria: cat, torneoNombre: modalTorneo.nombre,
          torneoId: modalTorneo.id, vaAEspera,
        })
        if (vaAEspera) {
          addInscripcionEnEspera({ torneoNombre: modalTorneo.nombre, categoria: cat })
          setToastEspera(modalTorneo.nombre)
        }
        setModalTorneo(null)
        return
      } catch (err) {
        // 409 = conflicto de negocio — NO caer al store local
        if (err?.status === 409 || err?.message?.includes('ya está inscripto')) {
          setModalTorneo(null)
          setToastError(err.message ?? 'Uno de los jugadores ya está inscripto en este torneo.')
          return
        }
        // Red/server error → fallback local (comportamiento offline)
      }
    }
    addPareja(modalTorneo.id, { ...pareja, estado: vaAEspera ? 'espera' : 'inscripto' })
    nuevaInscripcionTorneo({
      jugador1: pareja.jugador1, jugador2: pareja.jugador2,
      categoria: cat, torneoNombre: modalTorneo.nombre,
      torneoId: modalTorneo.id, vaAEspera,
    })
    if (vaAEspera) {
      addInscripcionEnEspera({ torneoNombre: modalTorneo.nombre, categoria: cat })
      setToastEspera(modalTorneo.nombre)
    }
    setModalTorneo(null)
  }

  const handleConfirmarEdicion = async ({ jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia, sinCompanero }) => {
    if (!modalEdicion) return
    const { torneo: t, pareja, soloDisponibilidad } = modalEdicion
    const changes = soloDisponibilidad
      ? { disponibilidad, prefiereMismoDia }
      : { jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia, sinCompanero }
    if (isBackendTorneo(t) && typeof pareja.id === 'string' && playerToken) {
      api.patch(`/torneos/${t.id}/inscribir/${pareja.id}`, changes, authH).catch(() => {})
    }
    updatePareja(t.id, pareja.id, changes)
    if (!soloDisponibilidad) {
      const eraIncompleta = pareja.sinCompanero === true && !sinCompanero
      if (eraIncompleta) {
        completacionTorneo({ jugador1: pareja.jugador1, jugador2, categoria, torneoNombre: t.nombre, torneoId: t.id })
      } else {
        actualizacionTorneo({ jugador1: pareja.jugador1, jugador2, categoria, torneoNombre: t.nombre, torneoId: t.id })
      }
    }
    setModalEdicion(null)
  }

  const handleCancelarInscripcion = (torneo, pareja) => {
    setModalCancelar({ torneo, pareja })
  }

  const handleConfirmarCancelacion = () => {
    if (!modalCancelar) return
    const { torneo: t, pareja } = modalCancelar
    bajaTorneo({
      jugador1: pareja.jugador1, jugador2: pareja.jugador2,
      categoria: pareja.categoria, torneoNombre: t.nombre, torneoId: t.id,
    })
    if (isBackendTorneo(t) && typeof pareja.id === 'string' && playerToken) {
      api.delete(`/torneos/${t.id}/inscribir/${pareja.id}`, authH).catch(() => {})
    }
    bajaInscripto(t.id, pareja.id)
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Alertas deadline sinCompanero */}
      {alertasDeadline.map((t) => {
        const dias = Math.ceil((new Date(t.fechaLimiteInscripcion + 'T23:59:59') - new Date()) / 86400000)
        const miPareja = t.inscriptos.find((i) => i.jugador1 === playerName || i.jugador2 === playerName)
        return (
          <div key={t.id} className="flex items-start gap-3 bg-amber-500/10 border border-amber-400/25 rounded-2xl px-4 py-3">
            <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 text-sm font-semibold leading-snug">
                Falta{dias === 1 ? '' : 'n'} {dias} día{dias !== 1 ? 's' : ''} para el cierre de inscripciones
              </p>
              <p className="text-white/40 text-xs mt-0.5 leading-snug">
                Cupo reservado en <span className="text-white/60 font-medium">{t.nombre}</span> ({miPareja?.categoria}) pero todavía no completaste la pareja.
              </p>
              <button
                onClick={() => setModalEdicion({ torneo: t, pareja: miPareja })}
                className="mt-2 text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
              >
                Completar inscripción →
              </button>
            </div>
          </div>
        )
      })}

      {/* Toast lista de espera */}
      {toastEspera && (
        <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 flex items-start gap-3 bg-amber-500 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl shadow-amber-500/30 animate-fade-in">
          <span className="flex-1 leading-snug">⏳ Quedaste en lista de espera en <em className="not-italic font-bold">{toastEspera}</em>. Te avisamos si se libera un lugar.</span>
          <button onClick={() => setToastEspera(null)} className="text-white/70 hover:text-white transition-colors shrink-0 mt-0.5">✕</button>
        </div>
      )}
      {toastError && (
        <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 flex items-start gap-3 bg-red-500 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl shadow-red-500/30 animate-fade-in">
          <span className="flex-1 leading-snug">✕ {toastError}</span>
          <button onClick={() => setToastError(null)} className="text-white/70 hover:text-white transition-colors shrink-0 mt-0.5">✕</button>
        </div>
      )}
      {modalCancelar && (
        <ModalCancelar
          torneo={modalCancelar.torneo}
          pareja={modalCancelar.pareja}
          onClose={() => setModalCancelar(null)}
          onConfirmar={handleConfirmarCancelacion}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Torneos</h2>
          <p className="text-white/30 text-sm mt-1">
            {misTorneos.length} {misTorneos.length === 1 ? 'torneo' : 'torneos'} registrado{misTorneos.length !== 1 ? 's' : ''}
          </p>
        </div>
        {(titulos > 0 || finales > 0) && (
          <div className="flex gap-2">
            {titulos > 0 && (
              <div className="bg-[#afca0b]/10 border border-[#afca0b]/20 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-black text-[#afca0b]">🏆 {titulos}</p>
                <p className="text-white/30 text-xs mt-0.5">Títulos</p>
              </div>
            )}
            {finales > 0 && (
              <div className="bg-blue-400/8 border border-blue-400/20 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-black text-blue-400">🥈 {finales}</p>
                <p className="text-white/30 text-xs mt-0.5">Finales</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Torneos disponibles */}
      {disponibles.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold text-base">Inscribirse</h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-[#afca0b]/10 text-[#afca0b] font-semibold border border-[#afca0b]/20">
              {disponibles.length} disponible{disponibles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {disponibles.map((t) => (
              <TorneoDisponibleCard
                key={t.id}
                torneo={t}
                onInscribirse={setModalTorneo}
                playerGenero={player?.genero}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mis torneos */}
      <section className="flex flex-col gap-4">
        <h3 className="text-white font-semibold text-base">Mis torneos</h3>
        {misTorneos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/25">
            <Trophy size={40} strokeWidth={1.2} />
            <p className="text-sm">Todavía no estás inscripto en ningún torneo</p>
            {disponibles.length > 0 && (
              <p className="text-xs text-[#afca0b]/60">
                Hay {disponibles.length} torneo{disponibles.length !== 1 ? 's' : ''} con inscripción abierta
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {misTorneos.map((t) => (
              <MiTorneoCard
                key={t.id}
                torneo={t}
                playerName={playerName}
                playerId={player?.id}
                onEditar={(torneo, pareja, soloDisp = false) => setModalEdicion({ torneo, pareja, soloDisponibilidad: soloDisp })}
                onCancelar={handleCancelarInscripcion}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal inscripción */}
      {modalTorneo && (
        <ModalInscripcion
          torneo={modalTorneo}
          jugador1={playerName}
          jugador1Dni={playerDni}
          playerGenero={player?.genero}
          token={playerToken}
          onClose={() => setModalTorneo(null)}
          onConfirmar={handleConfirmarInscripcion}
        />
      )}

      {/* Modal edición */}
      {modalEdicion && (
        <ModalInscripcion
          torneo={modalEdicion.torneo}
          jugador1={playerName}
          jugador1Dni={playerDni}
          playerGenero={player?.genero}
          parejaExistente={modalEdicion.pareja}
          soloDisponibilidad={modalEdicion.soloDisponibilidad ?? false}
          token={playerToken}
          onClose={() => setModalEdicion(null)}
          onConfirmar={handleConfirmarEdicion}
        />
      )}
    </div>
  )
}

export default PlayerTournamentsPage
