import { useState, useEffect } from 'react'
import {
  Trophy, Calendar, X, ChevronDown, ChevronUp,
  Zap, Clock, Lock, CheckCircle, Archive, Plus, Infinity as InfinityIcon, Pencil,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import usePlayerStore from '../store/playerStore'
import useTorneosNotif from '../store/playerNotificationsStore'
import { esSlotDeGrupos } from '../services/torneoService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

const totalCupo = (torneo) =>
  torneo.cupoLibre ? null : Object.values(torneo.cuposPorCategoria).reduce((a, b) => a + b, 0)

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

// ── Card torneo inscripto ──────────────────────────────────────────────────────

const MiTorneoCard = ({ torneo, playerName, onEditar, onCancelar }) => {
  const [open, setOpen]                 = useState(false)
  const [openGrupos, setOpenGrupos]     = useState(false)
  const [confirmarBaja, setConfirmarBaja] = useState(false)
  const miPareja = torneo.inscriptos.find(
    (i) => i.jugador1 === playerName || i.jugador2 === playerName
  )
  const resultado    = getResultado(torneo, playerName)
  const editable     = puedeEditar(torneo) && !!miPareja
  const tieneGrupos  = torneo.grupos !== null && torneo.formato === 'Fase de grupos + Eliminación'
  const miBracket    = (() => {
    const cat = miPareja?.categoria
    if (cat && torneo.brackets?.[cat]?.rondas) return torneo.brackets[cat]
    const first = Object.values(torneo.brackets ?? {}).find((b) => b?.rondas)
    return first ?? null
  })()

  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors">
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-white/30 text-xs flex items-center gap-1">
                  <Calendar size={10} /> {fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}
                </span>
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
            <span className="text-xs text-white/30">{torneo.categorias.join(', ')}</span>
            <span className="text-xs text-white/30">{torneo.formato}</span>
            {torneo.genero && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                torneo.genero === 'Femenino' ? 'text-pink-400 bg-pink-400/10 border-pink-400/20' :
                torneo.genero === 'Mixto'    ? 'text-violet-400 bg-violet-400/10 border-violet-400/20' :
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
        </div>
      </div>

      {/* Footer: editar + cancelar + grupos + bracket */}
      {(editable || tieneGrupos || miBracket) && (
        <div className="border-t border-white/5">
          {editable && (
            <>
              {confirmarBaja ? (
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
                  <p className="text-xs text-red-400 flex-1">¿Cancelar inscripción?</p>
                  <button
                    onClick={() => setConfirmarBaja(false)}
                    className="text-xs text-white/30 hover:text-white/60 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all"
                  >
                    No
                  </button>
                  <button
                    onClick={() => onCancelar(torneo.id, miPareja.id)}
                    className="text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 px-3 py-1 rounded-lg transition-all"
                  >
                    Sí, cancelar
                  </button>
                </div>
              ) : (
                <div className="flex border-b border-white/5">
                  <button
                    onClick={() => onEditar(torneo, miPareja)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-[#afca0b]/70 hover:text-[#afca0b] hover:bg-[#afca0b]/5 transition-all"
                  >
                    <Pencil size={12} />
                    Editar inscripción
                  </button>
                  <div className="w-px bg-white/5" />
                  <button
                    onClick={() => setConfirmarBaja(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all"
                  >
                    <X size={12} />
                    Cancelar
                  </button>
                </div>
              )}
            </>
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

// ── Card torneo disponible ────────────────────────────────────────────────────

const TorneoDisponibleCard = ({ torneo, onInscribirse }) => {
  const cupo        = totalCupo(torneo)
  const inscriptos  = torneo.inscriptos.filter((i) => i.estado !== 'espera').length
  const enEspera    = torneo.inscriptos.filter((i) => i.estado === 'espera').length
  const cupoEspera  = torneo.cupoEspera ?? 5
  const lleno       = cupo !== null && inscriptos >= cupo
  const hayEspera   = lleno && enEspera < cupoEspera
  const totalLleno  = lleno && enEspera >= cupoEspera
  const pct         = cupo ? Math.round((inscriptos / cupo) * 100) : 0

  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-base truncate">{torneo.nombre}</h3>
          <p className="text-white/35 text-xs mt-0.5">
        {torneo.categorias.join(', ')} · {torneo.formato}
        {torneo.genero && (
          <span className={`ml-2 font-semibold px-1.5 py-0.5 rounded border text-[10px] ${
            torneo.genero === 'Femenino' ? 'text-pink-400 bg-pink-400/10 border-pink-400/20' :
            torneo.genero === 'Mixto'    ? 'text-violet-400 bg-violet-400/10 border-violet-400/20' :
                                          'text-sky-400 bg-sky-400/10 border-sky-400/20'
          }`}>
            {torneo.genero}
          </span>
        )}
      </p>
        </div>
        <Badge estado={torneo.estado} />
      </div>

      <div className="flex items-center gap-1.5 text-white/35 text-xs">
        <Calendar size={12} className="shrink-0" />
        {fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}
      </div>

      {torneo.descripcion && (
        <p className="text-white/30 text-xs leading-relaxed line-clamp-2">{torneo.descripcion}</p>
      )}

      {/* Cupo */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-white/35 text-xs">Parejas inscriptas</span>
          {torneo.cupoLibre ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-sky-400">
              <InfinityIcon size={11} /> Sin límite
            </span>
          ) : (
            <span className={`text-xs font-semibold ${totalLleno ? 'text-red-400' : lleno ? 'text-amber-400' : 'text-white/60'}`}>
              {inscriptos} / {cupo}
            </span>
          )}
        </div>
        {!torneo.cupoLibre && (
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalLleno ? 'bg-red-500' : lleno ? 'bg-amber-400' : 'bg-[#afca0b]'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        )}
        {hayEspera && (
          <p className="text-[11px] text-amber-400 mt-1.5">
            Cupo completo · quedan {cupoEspera - enEspera} lugar{cupoEspera - enEspera !== 1 ? 'es' : ''} en lista de espera
          </p>
        )}
      </div>

      <button
        onClick={() => onInscribirse(torneo)}
        disabled={totalLleno}
        className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
          totalLleno
            ? 'bg-white/5 text-white/25 cursor-not-allowed'
            : hayEspera
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
              : 'bg-[#afca0b] hover:bg-[#c8e00d] text-[#0d1117]'
        }`}
      >
        <Plus size={15} />
        {totalLleno ? 'Sin lugares' : hayEspera ? 'Anotarme en lista de espera' : 'Inscribirme'}
      </button>
    </div>
  )
}

// ── Modal inscripción ─────────────────────────────────────────────────────────

const ModalInscripcion = ({ torneo, jugador1, jugador1Dni, parejaExistente, onClose, onConfirmar }) => {
  const isEdit = !!parejaExistente
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
  const [categoria, setCategoria]     = useState(parejaExistente?.categoria ?? torneo.categorias[0] ?? '')
  const [slots, setSlots]             = useState(parejaExistente?.disponibilidad ?? [])
  const [prefiereMismoDia, setPrefiereMismoDia] = useState(parejaExistente?.prefiereMismoDia ?? false)
  const [pendingDia, setPendingDia]   = useState(diasValidos[0] ?? DIAS_SEMANA[0])
  const [pendingHora, setPendingHora] = useState(horasParaDia(diasValidos[0] ?? DIAS_SEMANA[0])[0] ?? '18:00')
  const [errors, setErrors]           = useState({})

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
    if (!jugador2.trim())    e.jugador2    = 'Completá el nombre de tu compañero/a'
    if (!jugador2Dni.trim()) e.jugador2Dni = 'Completá el DNI de tu compañero/a'
    if (slots.length === 0)  e.slots       = 'Agregá al menos un horario disponible'
    return e
  }

  const handleConfirmar = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onConfirmar({
      jugador1,
      jugador1Dni: jugador1Dni ?? '',
      jugador2: jugador2.trim(),
      jugador2Dni: jugador2Dni.trim(),
      categoria,
      fecha: new Date().toISOString().split('T')[0],
      disponibilidad: slots,
      prefiereMismoDia,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/12 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-sm">
              {isEdit ? 'Editar inscripción' : 'Inscripción al torneo'}
            </h2>
            <p className="text-white/40 text-[11px] mt-0.5 leading-none">{torneo.nombre}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/8 p-1.5 rounded-lg transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

          {/* Jugadores */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            {/* J1 nombre */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Jugador 1 (vos)</label>
              <div className="bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white/40 truncate">
                {jugador1}
              </div>
            </div>
            {/* J2 nombre */}
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Compañero/a</label>
              <input
                type="text"
                value={jugador2}
                onChange={(e) => setJugador2(e.target.value)}
                placeholder="Nombre y apellido"
                className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all placeholder-white/20 ${
                  errors.jugador2 ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
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
              <label className="text-[10px] font-medium text-white/40 block mb-1">DNI compañero/a</label>
              <input
                type="text"
                value={jugador2Dni}
                onChange={(e) => setJugador2Dni(e.target.value)}
                placeholder="12345678"
                className={`w-full bg-white/5 border rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all placeholder-white/20 ${
                  errors.jugador2Dni ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {errors.jugador2Dni && <p className="text-red-400 text-[10px] mt-0.5">{errors.jugador2Dni}</p>}
            </div>
          </div>

          {/* Categoría */}
          {torneo.categorias.length > 1 && (
            <div>
              <label className="text-[10px] font-medium text-white/40 block mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#afca0b]/30 focus:border-[#afca0b]/50 transition-all"
                style={{ backgroundColor: '#0d1117' }}
              >
                {torneo.categorias.map((c) => <option key={c} value={c} style={{ backgroundColor: '#0d1117' }}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Disponibilidad */}
          <div>
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
          </div>
        </div>

        {/* Footer */}
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
            {isEdit ? 'Guardar cambios' : 'Confirmar inscripción'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const PlayerTournamentsPage = () => {
  const { torneos, addPareja, updatePareja, bajaInscripto } = useTorneosStore()
  const { player } = usePlayerStore()
  const addInscripcionEnEspera = useTorneosNotif((s) => s.addInscripcionEnEspera)
  const [modalTorneo, setModalTorneo]   = useState(null)
  const [modalEdicion, setModalEdicion] = useState(null) // { torneo, pareja }
  const [toastEspera, setToastEspera]   = useState(null) // nombre del torneo

  const playerName = player
    ? `${player.nombre}${player.apellido ? ' ' + player.apellido : ''}`
    : ''
  const playerDni = player?.dni ?? ''

  const puedeInscribirse = (torneo) => {
    if (!player?.genero) return true
    // Torneo femenino: exclusivo para mujeres
    if (torneo.genero === 'Femenino') return player.genero === 'Femenino'
    // Torneo masculino o mixto: cualquier género puede inscribirse
    return true
  }

  const misTorneos  = torneos.filter((t) => estaInscripto(t, playerName))
  const disponibles = torneos.filter((t) =>
    t.estado === 'open' && !estaInscripto(t, playerName) && puedeInscribirse(t)
  )

  const titulos = misTorneos.filter((t) => esDePareja(t.ganador, playerName)).length
  const finales  = misTorneos.filter((t) => esDePareja(t.subcampeon, playerName)).length

  const handleConfirmarInscripcion = (pareja) => {
    if (!modalTorneo) return
    const cat        = pareja.categoria
    const cupoMax    = modalTorneo.cupoLibre ? null : (modalTorneo.cuposPorCategoria?.[cat] ?? null)
    const confirmados = modalTorneo.inscriptos.filter(
      (i) => i.categoria === cat && i.estado !== 'espera'
    ).length
    const enEsperaCat = modalTorneo.inscriptos.filter(
      (i) => i.categoria === cat && i.estado === 'espera'
    ).length
    const cupoEspera  = modalTorneo.cupoEspera ?? 5
    const vaAEspera   = cupoMax !== null && confirmados >= cupoMax && enEsperaCat < cupoEspera
    addPareja(modalTorneo.id, { ...pareja, estado: vaAEspera ? 'espera' : 'inscripto' })
    if (vaAEspera) {
      addInscripcionEnEspera({ torneoNombre: modalTorneo.nombre, categoria: cat })
      setToastEspera(modalTorneo.nombre)
    }
    setModalTorneo(null)
  }

  const handleConfirmarEdicion = ({ jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia }) => {
    if (!modalEdicion) return
    updatePareja(modalEdicion.torneo.id, modalEdicion.pareja.id, { jugador2, jugador2Dni, categoria, disponibilidad, prefiereMismoDia })
    setModalEdicion(null)
  }

  const handleCancelarInscripcion = (torneoId, parejaId) => {
    bajaInscripto(torneoId, parejaId)
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Toast lista de espera */}
      {toastEspera && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl shadow-amber-500/30 animate-fade-in">
          <span>⏳ Quedaste en lista de espera en <em className="not-italic font-bold">{toastEspera}</em>. Te avisamos si se libera un lugar.</span>
          <button onClick={() => setToastEspera(null)} className="ml-2 text-white/70 hover:text-white transition-colors">✕</button>
        </div>
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
                onEditar={(torneo, pareja) => setModalEdicion({ torneo, pareja })}
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
          parejaExistente={modalEdicion.pareja}
          onClose={() => setModalEdicion(null)}
          onConfirmar={handleConfirmarEdicion}
        />
      )}
    </div>
  )
}

export default PlayerTournamentsPage
