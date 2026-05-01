import { useRef, useState, useEffect } from 'react'
import { Trophy, Star, Clock, Pencil } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const fmtFecha = (iso) => {
  const [,m,d] = iso.split('-').map(Number)
  return `${d} ${MESES[m-1]}`
}

export const isColorDark = (hex) => {
  if (!hex || hex.length < 7) return true
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.5
  } catch { return true }
}

const SPONSOR_SIZE = {
  pequeño: { slotW: 72,  slotH: 48,  minW: 100 },
  normal:  { slotW: 96,  slotH: 64,  minW: 128 },
  grande:  { slotW: 128, slotH: 84,  minW: 164 },
}

const SponsorCol = ({ list, size = 'normal', height }) => {
  const { slotW, slotH, minW } = SPONSOR_SIZE[size] ?? SPONSOR_SIZE.normal
  return (
    <div
      className="flex flex-col items-center justify-around py-10 px-5 shrink-0"
      style={{ minWidth: minW, height: height ?? 'auto' }}
    >
      {list.map((s, i) => (
        <div key={i} className="flex items-center justify-center shrink-0" style={{ width: slotW, height: slotH }}>
          {s.logo
            ? <img src={s.logo} alt={s.nombre} className="max-w-full max-h-full object-contain opacity-75 hover:opacity-100 transition-opacity rounded-lg border border-white/20" />
            : <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider text-center leading-tight border border-white/15 rounded-lg px-2 py-1">{s.nombre}</span>
          }
        </div>
      ))}
    </div>
  )
}

// ── BracketCard ───────────────────────────────────────────────────────────────

export const BracketCard = ({
  partido,
  seedingMap,
  isLarge = false,
  accentColor = '#afca0b',
  cardStyle = 'oscura',
  fontScale = 'normal',
  colorCard = null,
  onResult = null,
  onHorario = null,
  canchaName = null,
}) => {
  const { pareja1, pareja2, ganador, estado, resultado, hora, fecha, cancha } = partido
  const fin   = estado === 'finalizado'
  const ganP1 = ganador?.id === pareja1?.id
  const ganP2 = ganador?.id === pareja2?.id
  const apellido = (nombre) => nombre?.split(' ').at(-1) ?? nombre

  const nameCls = fontScale === 'muy-grande' ? 'text-base' : fontScale === 'grande' ? 'text-sm' : 'text-xs'
  const hrCls   = fontScale === 'muy-grande' ? 'text-sm'  : fontScale === 'grande' ? 'text-xs' : 'text-[11px]'

  const effectiveStyle = colorCard
    ? (isColorDark(colorCard) ? 'oscura' : 'clara')
    : cardStyle

  const borderCls =
    effectiveStyle === 'clara'          ? 'border-black/8 shadow-sm'
    : effectiveStyle === 'transparente' ? 'border-white/25 backdrop-blur-md'
    :                                     'border-white/10'

  const bgCls = colorCard ? '' :
    effectiveStyle === 'clara'          ? 'bg-white'
    : effectiveStyle === 'transparente' ? 'bg-white/8'
    :                                     'bg-[#0d1117]/55'

  const rowCls = (ganó, perdió) =>
    effectiveStyle === 'clara'
      ? ganó   ? 'bg-gray-100 text-gray-900 font-semibold'
        : perdió ? 'text-gray-300 bg-transparent'
        : 'text-gray-500 bg-transparent'
      : ganó   ? 'bg-white/10 text-white font-semibold'
        : perdió ? 'text-white/18 bg-transparent'
        : 'text-white/55 bg-white/[0.04]'

  const divCls = effectiveStyle === 'clara' ? 'border-gray-100'            : 'border-white/6'
  const hdCls  = effectiveStyle === 'clara' ? 'bg-gray-50 border-gray-100' : 'bg-black/25 border-white/5'
  const hrClr  = effectiveStyle === 'clara' ? 'text-sky-600/80'            : 'text-sky-400/70'
  const dtClr  = effectiveStyle === 'clara' ? 'text-gray-400'              : 'text-white/20'
  const emClr  = effectiveStyle === 'clara' ? 'text-gray-300'              : 'text-white/15'

  const seed1 = pareja1 ? seedingMap[pareja1.id] : null
  const seed2 = pareja2 ? seedingMap[pareja2.id] : null

  const isBye          = fin && (!pareja1 || !pareja2)
  const puedeCargar    = pareja1 && pareja2 && !fin && onResult
  const estaFinalizado = fin && pareja1 && pareja2 && onResult
  const showHorarioRow = !isBye && (hora || fecha || onHorario)

  const byeSlotCls = effectiveStyle === 'clara' ? 'text-gray-300' : 'text-white/15'

  return (
    <div
      className={`rounded-xl overflow-hidden border ${borderCls} ${bgCls} ${isLarge ? 'w-[220px]' : 'w-[192px]'} ${isBye ? 'opacity-60' : ''}`}
      style={colorCard ? { backgroundColor: colorCard } : undefined}
    >
      {showHorarioRow && (
        <div className={`flex items-center justify-between px-3 py-1.5 border-b ${hdCls}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {hora  && <span className={`${hrCls} font-mono font-semibold ${hrClr} shrink-0`}>{hora} hs</span>}
            {fecha && <span className={`text-[10px] ${dtClr} shrink-0`}>{fmtFecha(fecha)}</span>}
            {cancha && canchaName && <span className={`text-[10px] font-medium truncate ${hrClr}`}>{canchaName(cancha)}</span>}
            {!hora && !fecha && onHorario && <span className={`text-[10px] ${emClr}`}>Sin horario</span>}
          </div>
          {onHorario && (
            <button
              onClick={() => onHorario(partido)}
              className={`p-1 rounded-lg transition-all hover:scale-110 ${
                effectiveStyle === 'clara'
                  ? 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'
                  : 'text-white/20 hover:text-sky-400 hover:bg-sky-400/10'
              }`}
              title="Editar horario"
            >
              <Clock size={11} />
            </button>
          )}
        </div>
      )}

      <div className={`px-3 py-2.5 flex items-center gap-2 border-b ${divCls} ${rowCls(ganP1, ganP2)}`}>
        {ganP1 && !isBye && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />}
        <span className={`${nameCls} truncate flex-1 ${ganP2 && fin && !isBye ? 'line-through' : ''}`}>
          {pareja1
            ? `${apellido(pareja1.jugador1)} / ${apellido(pareja1.jugador2)}`
            : isBye
              ? <span className={`italic font-mono text-[10px] tracking-widest ${byeSlotCls}`}>BYE</span>
              : <span className={`italic ${emClr}`}>—</span>}
        </span>
        {seed1 && !isBye && <span className="text-[9px] shrink-0 font-mono whitespace-nowrap" style={{ color: accentColor + 'aa' }}>{seed1}</span>}
      </div>

      <div className={`px-3 py-2.5 flex items-center gap-2 ${rowCls(ganP2, ganP1)}`}>
        {ganP2 && !isBye && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />}
        <span className={`${nameCls} truncate flex-1 ${ganP1 && fin && !isBye ? 'line-through' : ''}`}>
          {pareja2
            ? `${apellido(pareja2.jugador1)} / ${apellido(pareja2.jugador2)}`
            : isBye
              ? <span className={`italic font-mono text-[10px] tracking-widest ${byeSlotCls}`}>BYE</span>
              : <span className={`italic ${emClr}`}>—</span>}
        </span>
        {seed2 && !isBye && <span className="text-[9px] shrink-0 font-mono whitespace-nowrap" style={{ color: accentColor + 'aa' }}>{seed2}</span>}
      </div>

      {fin && resultado?.length > 0 && (
        <div className={`flex items-center justify-center gap-1 px-2 py-1.5 border-t ${
          effectiveStyle === 'clara' ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-black/15'
        }`}>
          {resultado.map((s, i) => {
            const p1g = s.p1 > s.p2
            return (
              <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                effectiveStyle === 'clara'
                  ? p1g ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-gray-400 bg-gray-50 border-gray-200'
                  : p1g ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-white/25 bg-white/5 border-white/8'
              }`}>{s.p1}-{s.p2}</span>
            )
          })}
        </div>
      )}

      {puedeCargar && (
        <div className={`border-t px-2 py-1.5 ${
          effectiveStyle === 'clara' ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-black/10'
        }`}>
          <button
            onClick={() => onResult(partido)}
            className={`w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-0.5 rounded-lg transition-all ${
              effectiveStyle === 'clara'
                ? 'text-sky-600 hover:text-sky-700 hover:bg-sky-50'
                : 'text-sky-400/80 hover:text-sky-400 hover:bg-sky-400/10'
            }`}
          >
            <Pencil size={10} /> Cargar resultado
          </button>
        </div>
      )}

      {estaFinalizado && (
        <div className={`border-t px-2 py-1.5 flex items-center justify-between ${
          effectiveStyle === 'clara' ? 'border-emerald-100 bg-emerald-50' : 'border-emerald-500/8 bg-emerald-500/3'
        }`}>
          <span className={`text-[10px] font-semibold ${effectiveStyle === 'clara' ? 'text-emerald-600' : 'text-emerald-400'}`}>
            Finalizado
          </span>
          <button
            onClick={() => onResult(partido)}
            className={`text-[10px] transition-all ${
              effectiveStyle === 'clara' ? 'text-slate-400 hover:text-slate-600' : 'text-white/25 hover:text-white/50'
            }`}
          >
            Editar
          </button>
        </div>
      )}
    </div>
  )
}

// ── BracketView ───────────────────────────────────────────────────────────────
// Layout de dos fases:
//   Fase 1 — Ronda 1 se renderiza con stacking natural (flex + gap).
//            Tras el mount se miden los centros Y reales de cada card y se
//            calculan los centros de las rondas siguientes como punto medio.
//   Fase 2 — Rondas 2+ se posicionan absolutamente en el Y calculado.
//            Se miden las posiciones finales del DOM para trazar las líneas SVG.
// Resultado: bracket siempre compacto y alineado, sin importar la cantidad de parejas.

const COL_GAP = 52  // gap horizontal entre columnas

const BracketView = ({
  bracket,
  torneo,
  club,
  seedingMap = {},
  selectedCat = null,
  onSelectCat = null,
  onCargarResultado = null,
  onEditarHorario = null,
  hideHeader = false,
  accentColorOverride = null,
  colorCardOverride = null,
}) => {
  const { rondas }   = bracket
  const accentColor  = accentColorOverride || torneo.colorAcento || '#afca0b'
  const cardStyle    = torneo.estiloCard   ?? 'oscura'
  const colorCard    = colorCardOverride ?? torneo.colorCard ?? null
  const fontScale    = torneo.fontScale    ?? 'normal'
  const sponsorScale = torneo.sponsorScale ?? 'normal'
  const canchaName   = (canchaId) => club?.canchas?.find((c) => c.id === Number(canchaId))?.nombre ?? null
  const sponsors     = hideHeader ? [] : (torneo.sponsors ?? [])
  const leftSponsors  = sponsors.slice(0, 5)
  const rightSponsors = sponsors.slice(5, 10)

  const drawMostrarClub       = torneo.drawMostrarClub       ?? true
  const drawTitulo            = torneo.drawTitulo            ?? 'Main Draw'
  const drawMostrarNombre     = torneo.drawMostrarNombre     ?? true
  const drawMostrarFechas     = torneo.drawMostrarFechas     ?? true
  const drawMostrarCategorias = torneo.drawMostrarCategorias ?? true
  const titleColor            = torneo.drawColorTitulo       || accentColor

  const catBrackets = Object.keys(torneo.brackets ?? {})
  const multiCatD   = catBrackets.length > 1
  const champion    = rondas[rondas.length - 1]?.partidos[0]?.ganador
  const connStroke  = 'rgba(255,255,255,0.22)'

  const maxMatches  = rondas[0]?.partidos.length ?? 1
  // En admin (onCargarResultado activo) las cards son más altas porque muestran
  // horario + resultado + strip "Finalizado/Editar". Necesitan más espacio vertical.
  const baseMatchH  = onCargarResultado ? 195 : 160
  const MATCH_H     = maxMatches >= 8 ? baseMatchH : maxMatches >= 4 ? baseMatchH + 25 : baseMatchH + 55
  const LABEL_H     = 32
  const BRACKET_H   = Math.max(380, maxMatches * MATCH_H)
  const INNER_H     = BRACKET_H - LABEL_H

  // ── Refs para líneas SVG ──────────────────────────────────────────────────
  const bracketRef = useRef(null)
  const cardRefs   = useRef({})
  const [lines, setLines] = useState([])

  useEffect(() => {
    const container = bracketRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()

    // Map matchId → position in the rondas grid
    const posMap = {}
    rondas.forEach((r, ri) => {
      r.partidos.forEach((p, pi) => { posMap[p.id] = { ri, pi } })
    })

    const result = []

    rondas.forEach((ronda, ri) => {
      if (!rondas[ri + 1]) return

      // Group sources by their target in the next round
      const byTarget = {}
      ronda.partidos.forEach((p) => {
        if (!p.nextMatchId) return
        const tgt = posMap[p.nextMatchId]
        if (!tgt || tgt.ri !== ri + 1) return
        if (!byTarget[p.nextMatchId]) byTarget[p.nextMatchId] = []
        byTarget[p.nextMatchId].push(p)
      })

      Object.entries(byTarget).forEach(([targetId, sources]) => {
        const tgtPos = posMap[targetId]
        const elN = cardRefs.current[`${tgtPos.ri}-${tgtPos.pi}`]
        if (!elN) return
        const rN = elN.getBoundingClientRect()
        const xN = rN.left - cRect.left
        const yN = rN.top + rN.height / 2 - cRect.top

        if (sources.length === 2) {
          // Standard 2:1 bracket connector
          const p1Pos = posMap[sources[0].id]
          const p2Pos = posMap[sources[1].id]
          const el1 = cardRefs.current[`${p1Pos.ri}-${p1Pos.pi}`]
          const el2 = cardRefs.current[`${p2Pos.ri}-${p2Pos.pi}`]
          if (!el1 || !el2) return
          const r1 = el1.getBoundingClientRect()
          const r2 = el2.getBoundingClientRect()
          result.push({
            type: 'bracket',
            x1: r1.right - cRect.left, y1: r1.top + r1.height / 2 - cRect.top,
            x2: r2.right - cRect.left, y2: r2.top + r2.height / 2 - cRect.top,
            xN, yN,
          })
        } else if (sources.length === 1) {
          // Direct 1:1 connector (e.g. previa → cuartos)
          const srcPos = posMap[sources[0].id]
          const el1 = cardRefs.current[`${srcPos.ri}-${srcPos.pi}`]
          if (!el1) return
          const r1 = el1.getBoundingClientRect()
          result.push({
            type: 'direct',
            x1: r1.right - cRect.left, y1: r1.top + r1.height / 2 - cRect.top,
            xN, yN,
          })
        }
      })
    })

    setLines(result)
  }, [rondas])

  return (
    <div className={hideHeader ? 'rounded-2xl overflow-hidden bg-[#0d1117]' : 'rounded-2xl overflow-hidden border border-white/8'}>

      {/* ── Header + campeón (solo vista pública) ── */}
      {!hideHeader && (
        <>
          <div className="relative py-10 px-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] to-[#0d1117]" />
            {torneo.imagenFondoDraw && (
              <>
                <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#0d1117]/82" />
              </>
            )}
            <div className="absolute inset-0 opacity-[0.025]" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }} />
            <div className="relative z-10 flex flex-col items-center gap-3">
              {club?.logo ? (
                <img src={club.logo} alt={club.nombre} className="w-14 h-14 object-contain drop-shadow-xl mb-1" />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: accentColor + '18', border: `1px solid ${accentColor}28` }}>
                  <Trophy size={20} style={{ color: accentColor }} />
                </div>
              )}
              {drawMostrarClub && (
                <p className="text-white/25 text-[9px] uppercase tracking-[0.3em]">{club?.nombre}</p>
              )}
              {drawTitulo && (
                <div className="rounded-xl px-8 py-2 mt-1" style={{ border: `1px solid ${titleColor}50` }}>
                  <p className="font-black text-xl uppercase tracking-[0.18em]" style={{ color: titleColor }}>{drawTitulo}</p>
                </div>
              )}
              {drawMostrarNombre && (
                <h3 className="text-white font-bold text-base mt-1">{torneo.nombre}</h3>
              )}
              {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                <p className="text-white/30 text-xs">{fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}</p>
              )}
              {drawMostrarCategorias && (
                <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                  {torneo.categorias?.map((c) => (
                    <span key={c} className="text-[10px] font-semibold px-3 py-0.5 rounded-full text-white/35" style={{ border: `1px solid ${accentColor}28` }}>{c}</span>
                  ))}
                  {torneo.genero && (
                    <span className="text-[10px] font-semibold px-3 py-0.5 rounded-full border border-white/10 text-white/35">{torneo.genero}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {champion && (
            <div className="flex items-center justify-center gap-3 py-3.5 border-b border-white/5" style={{ background: accentColor + '0d' }}>
              <Star size={13} style={{ color: accentColor }} />
              <p className="font-bold text-sm" style={{ color: accentColor }}>
                {champion.jugador1} / {champion.jugador2}
              </p>
              <span className="text-[9px] text-white/20 uppercase tracking-widest">Campeones</span>
            </div>
          )}
        </>
      )}

      {/* ── Tabs de categoría ── */}
      {multiCatD && onSelectCat && (
        <div className="flex gap-2 px-5 py-3 border-b border-white/5 flex-wrap">
          {catBrackets.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCat(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedCat === cat
                  ? 'text-[#0d1117] border-transparent'
                  : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/70'
              }`}
              style={selectedCat === cat ? { background: accentColor, borderColor: accentColor } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Bracket ── */}
      <div
        className="flex items-start"
        style={torneo.imagenFondoBracket ? {
          backgroundImage: `linear-gradient(rgba(13,17,23,0.80), rgba(13,17,23,0.80)), url(${torneo.imagenFondoBracket})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        {leftSponsors.length > 0 && <SponsorCol list={leftSponsors} size={sponsorScale} height={BRACKET_H + 64} />}

        <div className="no-scrollbar flex-1 py-8 px-4" style={{ overflowX: 'auto' }}>
          <div
            ref={bracketRef}
            className="relative min-w-max mx-auto w-fit"
            style={{ display: 'flex', alignItems: 'flex-start', gap: COL_GAP }}
          >
            {rondas.map((ronda, ri) => {
              const esFinal   = ri === rondas.length - 1
              const fromCount = ronda.partidos.length
              return (
                <div key={`round-${ronda.numero}`} className="flex flex-col" style={{ height: BRACKET_H }}>
                  <p
                    style={{ height: LABEL_H, color: esFinal ? accentColor : 'rgba(255,255,255,0.45)' }}
                    className="text-center text-[11px] font-bold uppercase tracking-wide whitespace-nowrap px-2 flex items-center justify-center"
                  >
                    {ronda.nombre}
                  </p>
                  <div className="flex flex-col" style={{ height: INNER_H }}>
                    {ronda.partidos.map((p, pi) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-start"
                        style={{ height: INNER_H / fromCount }}
                      >
                        <div ref={(el) => { cardRefs.current[`${ri}-${pi}`] = el }}>
                          <BracketCard
                            partido={p} seedingMap={seedingMap}
                            isLarge={esFinal} accentColor={accentColor}
                            cardStyle={cardStyle} fontScale={fontScale} colorCard={colorCard}
                            onResult={onCargarResultado} onHorario={onEditarHorario}
                            canchaName={canchaName}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* SVG overlay con líneas desde posiciones reales del DOM */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
              fill="none"
            >
              {lines.map((line, i) => {
                if (line.type === 'direct') {
                  const { x1, y1, xN, yN } = line
                  const xMid = (x1 + xN) / 2
                  return (
                    <g key={i} stroke={connStroke} strokeWidth="1">
                      <line x1={x1}   y1={y1}  x2={xMid} y2={y1}  />
                      <line x1={xMid} y1={y1}  x2={xMid} y2={yN}  />
                      <line x1={xMid} y1={yN}  x2={xN}   y2={yN}  />
                    </g>
                  )
                }
                const { x1, y1, x2, y2, xN, yN } = line
                const xMid = (x1 + xN) / 2
                const yMid = (y1 + y2) / 2
                return (
                  <g key={i} stroke={connStroke} strokeWidth="1">
                    <line x1={x1}   y1={y1}   x2={xMid} y2={y1}   />
                    <line x1={xMid} y1={y1}   x2={xMid} y2={y2}   />
                    <line x1={x2}   y1={y2}   x2={xMid} y2={y2}   />
                    <line x1={xMid} y1={yMid} x2={xN}   y2={yN}   />
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {rightSponsors.length > 0 && <SponsorCol list={rightSponsors} size={sponsorScale} height={BRACKET_H + 64} />}
      </div>
    </div>
  )
}

export default BracketView
