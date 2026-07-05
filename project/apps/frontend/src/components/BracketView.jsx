import { useRef, useState, useEffect } from 'react'
import { Trophy, Clock, Pencil, Medal } from 'lucide-react'
import { BRACKET_THEMES } from './BracketThemes'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const fmtFecha = (iso) => {
  if (!iso || typeof iso !== 'string' || !iso.includes('-')) return null
  const [,m,d] = iso.split('-').map(Number)
  if (!m || !d || !MESES[m - 1]) return null
  return `${d} ${MESES[m - 1]}`
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
  cardBorderOverride = null,
  cardGlow = null,
  cardLayout = 'default',
  cardBorderRadius = '12px',
  cardNameTransform = 'none',
  cardNameLetterSpacing = null,
  cardNameFontWeight = 400,
  cardRowPaddingY = '10px',
  cardSeedRadius = '3px',
}) => {
  const { pareja1, pareja2, ganador, estado, resultado, hora, fecha, cancha } = partido
  const fin   = estado === 'finalizado'
  const ganP1 = ganador?.id === pareja1?.id
  const ganP2 = ganador?.id === pareja2?.id
  const apellido = (nombre) => nombre?.split(' ').at(-1) ?? nombre

  const nameCls = fontScale === 'muy-grande' ? 'text-lg'  : fontScale === 'grande' ? 'text-base' : 'text-sm'
  const hrCls   = fontScale === 'muy-grande' ? 'text-sm'  : fontScale === 'grande' ? 'text-[13px]' : 'text-[12px]'

  const effectiveStyle = colorCard
    ? (isColorDark(colorCard) ? 'oscura' : 'clara')
    : cardStyle

  const borderCls =
    effectiveStyle === 'clara'          ? 'border-black/8 shadow-sm'
    : effectiveStyle === 'transparente' ? 'border-white/20 backdrop-blur-sm'
    :                                     'border-white/10'

  const bgCls = colorCard ? '' :
    effectiveStyle === 'clara'          ? 'bg-white'
    : effectiveStyle === 'transparente' ? 'bg-white/[0.05]'
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
  const hdCls  = effectiveStyle === 'clara'          ? 'bg-gray-50 border-gray-100'
    : effectiveStyle === 'transparente' ? 'bg-white/[0.04] border-white/8'
    :                                     'bg-black/25 border-white/5'
  const hrClr  = effectiveStyle === 'clara' ? 'text-sky-600/80'            : 'text-sky-400/80'
  const dtClr  = effectiveStyle === 'clara' ? 'text-gray-400'              : 'text-white/20'
  const emClr  = effectiveStyle === 'clara' ? 'text-gray-300'              : 'text-white/15'

  const seed1 = pareja1 ? seedingMap[pareja1.id] : null
  const seed2 = pareja2 ? seedingMap[pareja2.id] : null

  const isBye          = fin && (!pareja1 || !pareja2) && !pareja1?.tbd && !pareja2?.tbd
  const puedeCargar    = pareja1 && pareja2 && !pareja1.tbd && !pareja2.tbd && !fin && onResult
  const estaFinalizado = fin && pareja1 && pareja2 && !pareja1.tbd && !pareja2.tbd && onResult
  const showHorarioRow = !isBye && (hora || fecha || onHorario)

  const byeSlotCls = effectiveStyle === 'clara' ? 'text-gray-300' : 'text-white/15'

  // ── Shared bottom strips (result / actions) ────────────────────────────────
  // showResult=false → omite los chips de resultado centrados (el layout 'stat'
  // los muestra inline en cada fila como un marcador).
  const BottomStrips = ({ showResult = true } = {}) => <>
    {showResult && fin && resultado?.length > 0 && (
      <div className={`flex items-center justify-center gap-1 px-2 py-1.5 border-t ${
        effectiveStyle === 'clara' ? 'border-gray-100 bg-gray-50' : 'border-white/5 bg-black/15'
      }`}>
        {resultado.map((s, i) => {
          const p1g = s.p1 > s.p2
          return (
            <span key={i} className={`text-[13px] font-mono font-semibold px-2 py-0.5 rounded border ${
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
  </>

  // ── Layout GOLD (placa de honor grabada — Championship Gold) ───────────────
  // Negro carbón + oro nítido. Seed en placa metálica (highlight→acento),
  // nombre Cinzel marfil/oro, sets en casilleros, esquinas grabadas tipo marco.
  if (cardLayout === 'gold') {
    const GOLD     = accentColor
    const cardBg   = colorCard ?? '#0a0802'
    const borderCol = cardBorderOverride ?? `${GOLD}3a`
    // Placa metálica: highlight claro → acento (sirve para cualquier color de acento)
    const plaqueGrad = `linear-gradient(135deg, rgba(255,255,255,0.88) 0%, ${GOLD} 58%)`
    const setsP1 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p1, win: s.p1 > s.p2 })) : null
    const setsP2 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p2, win: s.p2 > s.p1 })) : null

    const GoldRow = ({ pareja, seed, ganó, perdió, isFirst, sets }) => {
      const hasSeed  = seed && !isBye && !pareja?.tbd
      const nameText = pareja?.tbd
        ? null
        : pareja ? `${apellido(pareja.jugador1)} / ${apellido(pareja.jugador2)}` : null
      // Ganador en oro pleno, normal marfil, perdedor tenue
      const textColor = ganó ? GOLD : perdió ? 'rgba(245,239,224,0.20)' : 'rgba(245,239,224,0.62)'

      return (
        <div
          className="flex items-stretch relative"
          style={{
            borderTop: isFirst ? 'none' : `1px solid ${GOLD}1c`,
            background: ganó ? `${GOLD}10` : 'transparent',
          }}
        >
          {/* Seed: placa metálica full-height */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 25,
              borderRight: `1px solid ${GOLD}22`,
              background: hasSeed ? plaqueGrad : 'rgba(255,255,255,0.02)',
            }}
          >
            <span style={{ color: hasSeed ? '#171200' : `${GOLD}3a`, fontWeight: 700, fontSize: 10, letterSpacing: '0.02em' }}>
              {hasSeed ? seed : '·'}
            </span>
          </div>

          {/* Nombre */}
          <div className="flex items-center flex-1 min-w-0 pl-2 pr-1.5" style={{ paddingTop: cardRowPaddingY, paddingBottom: cardRowPaddingY }}>
            {pareja?.tbd
              ? <span className="italic text-[10px]" style={{ color: `${GOLD}80` }}>{pareja.label}</span>
              : nameText
                ? <span
                    className={`${nameCls} truncate ${perdió && fin && !isBye ? 'line-through' : ''}`}
                    style={{
                      color: textColor,
                      fontWeight: ganó ? Math.min(cardNameFontWeight + 200, 700) : cardNameFontWeight,
                      textTransform: cardNameTransform,
                      letterSpacing: cardNameLetterSpacing,
                    }}
                  >{nameText}</span>
                : isBye
                  ? <span className="italic font-mono text-[9px] tracking-widest" style={{ color: `${GOLD}30` }}>BYE</span>
                  : <span className="italic text-[10px]" style={{ color: `${GOLD}25` }}>—</span>}
          </div>

          {/* Marca de ganador (rombo) cuando no hay sets */}
          {ganó && !isBye && !sets && (
            <div className="flex items-center pr-2.5 shrink-0">
              <span style={{ color: GOLD, fontSize: 7 }}>◆</span>
            </div>
          )}

          {/* Sets como casilleros */}
          {sets && (
            <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center justify-center text-[12px] font-semibold tabular-nums"
                  style={{
                    minWidth: 17, height: 20, borderRadius: 2,
                    color: s.win ? '#171200' : `${GOLD}66`,
                    background: s.win ? plaqueGrad : 'transparent',
                    border: `1px solid ${s.win ? GOLD : `${GOLD}2e`}`,
                  }}
                >{s.v}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        className={`relative ${isLarge ? 'w-[270px]' : 'w-[248px]'} ${isBye ? 'opacity-50' : ''}`}
        style={{
          background: cardBg,
          border: `1px solid ${isLarge ? `${GOLD}66` : borderCol}`,
          borderRadius: cardBorderRadius,
          boxShadow: cardGlow ?? undefined,
        }}
      >
        {/* Esquinas grabadas (marco) */}
        {[
          ['top-0 left-0', 'border-t border-l'],
          ['top-0 right-0', 'border-t border-r'],
          ['bottom-0 left-0', 'border-b border-l'],
          ['bottom-0 right-0', 'border-b border-r'],
        ].map(([pos, b], i) => (
          <div key={i} className={`absolute ${pos} w-2 h-2 ${b} pointer-events-none z-10`} style={{ borderColor: `${GOLD}99`, margin: 3 }} />
        ))}

        <div className="overflow-hidden" style={{ borderRadius: cardBorderRadius }}>
          {/* Meta strip: hora · cancha */}
          {showHorarioRow && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: `${GOLD}1f`, background: 'rgba(212,175,55,0.04)' }}>
              <div className="flex items-center gap-2 min-w-0">
                {hora  && <span className="text-[11px] font-semibold tabular-nums" style={{ color: GOLD }}>{hora} hs</span>}
                {fecha && fmtFecha(fecha) && <span className="text-[10px]" style={{ color: `${GOLD}77` }}>{fmtFecha(fecha)}</span>}
                {cancha && <span className="text-[10px]" style={{ color: `${GOLD}66` }}>· {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}</span>}
                {!hora && !fecha && onHorario && <span className="text-[10px]" style={{ color: `${GOLD}44` }}>Sin horario</span>}
              </div>
              {onHorario && (
                <button onClick={() => onHorario(partido)} className="p-0.5 transition-all" style={{ color: `${GOLD}55` }} title="Editar horario">
                  <Clock size={11} />
                </button>
              )}
            </div>
          )}

          <GoldRow pareja={pareja1} seed={seed1} ganó={ganP1} perdió={ganP2 && fin} isFirst sets={setsP1} />
          <GoldRow pareja={pareja2} seed={seed2} ganó={ganP2} perdió={ganP1 && fin} isFirst={false} sets={setsP2} />

          <BottomStrips showResult={false} />
        </div>
      </div>
    )
  }

  // ── Layout ARENA (HUD esports cyberpunk — Neon Arena) ──────────────────────
  // Panel notcheado (clip-path corner cuts), borde neón vía doble capa,
  // scanlines, seed en bloque angular, sets como chips notcheados. Gaming.
  if (cardLayout === 'arena') {
    const NOTCH = 'polygon(0 0, calc(100% - 11px) 0, 100% 11px, 100% 100%, 11px 100%, 0 calc(100% - 11px))'
    const CHIP_NOTCH = 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))'
    const borderCol = cardBorderOverride ?? `${accentColor}55`
    const cardBg    = colorCard ?? '#0a0d0b'
    const setsP1 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p1, win: s.p1 > s.p2 })) : null
    const setsP2 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p2, win: s.p2 > s.p1 })) : null

    const ArenaRow = ({ pareja, seed, ganó, perdió, isFirst, sets }) => {
      const hasSeed  = seed && !isBye && !pareja?.tbd
      const nameText = pareja?.tbd
        ? null
        : pareja ? `${apellido(pareja.jugador1)} / ${apellido(pareja.jugador2)}` : null
      const textColor = ganó ? '#ffffff' : perdió ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.62)'

      return (
        <div
          className="flex items-stretch relative"
          style={{
            borderTop: isFirst ? 'none' : `1px solid ${accentColor}1a`,
            background: ganó ? `${accentColor}14` : 'transparent',
          }}
        >
          {/* Seed: bloque angular full-height */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 26,
              background: hasSeed ? `${accentColor}1f` : 'rgba(255,255,255,0.03)',
              borderRight: `1px solid ${accentColor}22`,
            }}
          >
            <span style={{ color: hasSeed ? accentColor : 'rgba(255,255,255,0.18)', fontWeight: 800, fontSize: 10, textShadow: hasSeed ? `0 0 6px ${accentColor}80` : 'none' }}>
              {hasSeed ? seed : '·'}
            </span>
          </div>

          {/* Nombre */}
          <div className="flex items-center flex-1 min-w-0 pl-2 pr-1.5" style={{ paddingTop: cardRowPaddingY, paddingBottom: cardRowPaddingY }}>
            {pareja?.tbd
              ? <span className="italic text-[10px] text-emerald-300/50">{pareja.label}</span>
              : nameText
                ? <span
                    className={`${nameCls} truncate ${perdió && fin && !isBye ? 'line-through' : ''}`}
                    style={{
                      color: textColor,
                      fontWeight: ganó ? Math.min(cardNameFontWeight + 100, 800) : cardNameFontWeight,
                      textTransform: cardNameTransform,
                      letterSpacing: cardNameLetterSpacing,
                      textShadow: ganó ? `0 0 10px ${accentColor}40` : 'none',
                    }}
                  >{nameText}</span>
                : isBye
                  ? <span className="italic font-mono text-[9px] tracking-widest text-white/15">BYE</span>
                  : <span className="italic text-[10px] text-white/15">—</span>}
          </div>

          {/* Sets como chips notcheados */}
          {sets && (
            <div className="flex items-center gap-1 pr-2.5 shrink-0">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center justify-center text-[11px] font-bold tabular-nums"
                  style={{
                    minWidth: 18, height: 18, clipPath: CHIP_NOTCH,
                    color: s.win ? '#04130d' : 'rgba(255,255,255,0.35)',
                    background: s.win ? accentColor : 'rgba(255,255,255,0.06)',
                  }}
                >{s.v}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        className={`${isLarge ? 'w-[272px]' : 'w-[252px]'} ${isBye ? 'opacity-45' : ''}`}
        style={{ filter: `drop-shadow(0 0 5px ${accentColor}33)` }}
      >
        {/* Capa borde (neón) */}
        <div style={{ clipPath: NOTCH, background: borderCol, padding: '1.5px' }}>
          {/* Capa interior (contenido) */}
          <div className="relative" style={{ clipPath: NOTCH, background: cardBg }}>
            {/* Scanlines overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,180,0.035) 0px, rgba(0,255,180,0.035) 1px, transparent 1px, transparent 3px)',
              zIndex: 1,
            }} />

            <div className="relative" style={{ zIndex: 2 }}>
              {/* Meta strip: hora · cancha */}
              {showHorarioRow && (
                <div className="flex items-center justify-between pl-2.5 pr-2.5 py-1 border-b" style={{ borderColor: `${accentColor}1f`, background: 'rgba(0,255,180,0.04)' }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {hora  && <span className="text-[11px] font-bold tabular-nums" style={{ color: accentColor }}>{hora} hs</span>}
                    {fecha && fmtFecha(fecha) && <span className="text-[10px] text-white/30">{fmtFecha(fecha)}</span>}
                    {cancha && <span className="text-[10px]" style={{ color: `${accentColor}99` }}>· {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}</span>}
                    {!hora && !fecha && onHorario && <span className="text-[10px] text-white/20">Sin horario</span>}
                  </div>
                  {onHorario && (
                    <button onClick={() => onHorario(partido)} className="p-0.5 text-white/25 hover:text-emerald-400 transition-all" title="Editar horario">
                      <Clock size={11} />
                    </button>
                  )}
                </div>
              )}

              <ArenaRow pareja={pareja1} seed={seed1} ganó={ganP1} perdió={ganP2 && fin} isFirst sets={setsP1} />
              <ArenaRow pareja={pareja2} seed={seed2} ganó={ganP2} perdió={ganP1 && fin} isFirst={false} sets={setsP2} />

              <BottomStrips showResult={false} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Layout SHEET (draw sheet de tenis — Minimal Pro) ───────────────────────
  // Inspirado en los cuadros oficiales de Wimbledon/ATP: nombres sobre líneas
  // finas, sin cajas pesadas, sets como números limpios, mucho aire. Editorial.
  if (cardLayout === 'sheet') {
    const setsP1 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p1, win: s.p1 > s.p2 })) : null
    const setsP2 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p2, win: s.p2 > s.p1 })) : null

    const SheetRow = ({ pareja, seed, ganó, perdió, isFirst, sets }) => {
      const hasSeed  = seed && !isBye && !pareja?.tbd
      const nameText = pareja?.tbd
        ? null
        : pareja ? `${apellido(pareja.jugador1)} / ${apellido(pareja.jugador2)}` : null

      // Jerarquía editorial: ganador casi negro, perdedor gris claro, normal gris medio
      const nameColor = ganó ? '#0f172a' : perdió ? '#cbd5e1' : '#475569'

      return (
        <div
          className="flex items-center gap-3 pl-3 pr-3.5 relative"
          style={{
            borderTop: isFirst ? 'none' : '1px solid #f0f0ee',
            paddingTop: cardRowPaddingY, paddingBottom: cardRowPaddingY,
          }}
        >
          {/* Barra de acento del ganador */}
          {ganó && !isBye && (
            <div className="absolute left-0 top-0 bottom-0 w-[2.5px]" style={{ background: accentColor }} />
          )}

          {/* Seed circular sutil */}
          <span
            className="shrink-0 flex items-center justify-center text-[10px] font-semibold tabular-nums"
            style={{
              width: 20, height: 20, borderRadius: cardSeedRadius,
              color: hasSeed ? '#64748b' : '#cbd5e1',
              background: hasSeed ? '#f1f5f9' : 'transparent',
            }}
          >{hasSeed ? seed : ''}</span>

          {/* Nombre */}
          <div className="flex-1 min-w-0">
            {pareja?.tbd
              ? <span className="italic text-[11px] text-amber-600/70">{pareja.label}</span>
              : nameText
                ? <span
                    className={`${nameCls} truncate block`}
                    style={{
                      color: nameColor,
                      fontWeight: ganó ? 700 : cardNameFontWeight,
                      letterSpacing: cardNameLetterSpacing,
                    }}
                  >{nameText}</span>
                : isBye
                  ? <span className="italic font-mono text-[9px] tracking-widest text-gray-300">BYE</span>
                  : <span className="italic text-[10px] text-gray-300">—</span>}
          </div>

          {/* Sets como números limpios (sin caja) */}
          {sets && (
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className="text-[13px] font-semibold text-center"
                  style={{ minWidth: 12, color: s.win ? '#0f172a' : '#cbd5e1' }}
                >{s.v}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        className={`overflow-hidden bg-white ${isLarge ? 'w-[252px]' : 'w-[232px]'} ${isBye ? 'opacity-50' : ''}`}
        style={{
          borderRadius: 8,
          border: '1px solid #ececea',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
          ...(colorCard ? { backgroundColor: colorCard } : {}),
        }}
      >
        {/* Meta strip minimal: hora · cancha */}
        {showHorarioRow && (
          <div className="flex items-center justify-between px-3.5 py-1.5" style={{ borderBottom: '1px solid #f4f4f2', background: '#fcfcfb' }}>
            <div className="flex items-center gap-2 min-w-0">
              {hora  && <span className="text-[11px] font-semibold tabular-nums" style={{ color: '#475569' }}>{hora} hs</span>}
              {fecha && fmtFecha(fecha) && <span className="text-[10px]" style={{ color: '#94a3b8' }}>{fmtFecha(fecha)}</span>}
              {cancha && <span className="text-[10px]" style={{ color: '#94a3b8' }}>· {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}</span>}
              {!hora && !fecha && onHorario && <span className="text-[10px] text-gray-300">Sin horario</span>}
            </div>
            {onHorario && (
              <button
                onClick={() => onHorario(partido)}
                className="p-0.5 rounded transition-all text-slate-300 hover:text-sky-600"
                title="Editar horario"
              >
                <Clock size={11} />
              </button>
            )}
          </div>
        )}

        <SheetRow pareja={pareja1} seed={seed1} ganó={ganP1} perdió={ganP2 && fin} isFirst sets={setsP1} />
        <SheetRow pareja={pareja2} seed={seed2} ganó={ganP2} perdió={ganP1 && fin} isFirst={false} sets={setsP2} />

        <BottomStrips showResult={false} />
      </div>
    )
  }

  // ── Layout STAT (dashboard deportivo — Electric Blue) ──────────────────────
  // Cards anchas con seed inline, nombre uppercase, y los sets integrados a la
  // derecha de cada fila como un marcador real (cada pareja muestra su columna).
  if (cardLayout === 'stat') {
    const isTransp = effectiveStyle === 'transparente'
    const isClara2 = effectiveStyle === 'clara'
    // Nombre un toque más grande que el base en este layout (legibilidad del cuadro).
    const statNameCls = fontScale === 'muy-grande' ? 'text-xl' : fontScale === 'grande' ? 'text-[17px]' : 'text-[15px]'

    // Sets por lado (solo si finalizado). Para pareja1 = s.p1, pareja2 = s.p2.
    const setsP1 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p1, win: s.p1 > s.p2 })) : null
    const setsP2 = fin && resultado?.length > 0 ? resultado.map((s) => ({ v: s.p2, win: s.p2 > s.p1 })) : null

    const StatRow = ({ pareja, seed, ganó, perdió, isFirst, sets }) => {
      const hasSeed  = seed && !isBye && !pareja?.tbd
      const nameText = pareja?.tbd
        ? null
        : pareja ? `${apellido(pareja.jugador1)} / ${apellido(pareja.jugador2)}` : null

      const textColor = isClara2
        ? ganó ? '#0f172a' : perdió ? '#cbd5e1' : '#475569'
        : ganó ? '#ffffff' : perdió ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)'

      const rowBg = ganó
        ? (isClara2 ? `${accentColor}10` : `${accentColor}14`)
        : 'transparent'
      const sepColor = isClara2 ? 'rgba(0,0,0,0.06)' : `${accentColor}1a`

      return (
        <div
          className="flex items-center gap-2.5 px-3.5 relative"
          style={{
            borderTop: isFirst ? 'none' : `1px solid ${sepColor}`,
            paddingTop: cardRowPaddingY, paddingBottom: cardRowPaddingY,
            background: rowBg,
          }}
        >
          {/* Barra de acento del ganador a la izquierda */}
          {ganó && !isBye && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
          )}

          {/* Seed chip circular */}
          <span
            className="shrink-0 flex items-center justify-center text-[12px] font-bold"
            style={{
              width: 26, height: 26, borderRadius: cardSeedRadius,
              color: hasSeed ? accentColor : (isClara2 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.20)'),
              background: hasSeed ? `${accentColor}1a` : (isClara2 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
              border: `1px solid ${hasSeed ? `${accentColor}40` : (isClara2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)')}`,
            }}
          >{hasSeed ? seed : '·'}</span>

          {/* Nombre */}
          <div className="flex-1 min-w-0">
            {pareja?.tbd
              ? <span className={`italic text-[11px] ${isClara2 ? 'text-amber-600/70' : 'text-amber-400/60'}`}>{pareja.label}</span>
              : nameText
                ? <span
                    className={`${statNameCls} block leading-tight ${perdió && fin && !isBye ? 'line-through opacity-60' : ''}`}
                    style={{
                      color: textColor,
                      fontWeight: ganó ? Math.min(cardNameFontWeight + 100, 800) : cardNameFontWeight,
                      textTransform: cardNameTransform,
                      letterSpacing: cardNameLetterSpacing || '0.035em',
                    }}
                  >
                    {/* Un apellido por línea: nunca se corta, aunque sean largos */}
                    <span className="block truncate">{apellido(pareja.jugador1)}</span>
                    <span className="block truncate">{apellido(pareja.jugador2)}</span>
                  </span>
                : isBye
                  ? <span className={`italic font-mono text-[9px] tracking-widest ${byeSlotCls}`}>BYE</span>
                  : <span className={`italic text-[10px] ${emClr}`}>—</span>}
          </div>

          {/* Set cells (marcador) */}
          {sets && (
            <div className="flex items-center gap-1 shrink-0">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center justify-center text-[12px] font-mono font-bold"
                  style={{
                    minWidth: 20, height: 22, borderRadius: 3,
                    color: s.win ? (isClara2 ? '#0f172a' : '#ffffff') : (isClara2 ? '#94a3b8' : 'rgba(255,255,255,0.30)'),
                    background: s.win ? `${accentColor}26` : (isClara2 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
                    border: `1px solid ${s.win ? `${accentColor}55` : (isClara2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)')}`,
                  }}
                >{s.v}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        className={`overflow-hidden border ${borderCls} ${bgCls} ${isLarge ? 'w-[260px]' : 'w-[240px]'} ${isBye ? 'opacity-55' : ''}`}
        style={{
          borderRadius: cardBorderRadius,
          ...(colorCard          ? { backgroundColor: colorCard }      : {}),
          ...(cardBorderOverride ? { borderColor: cardBorderOverride } : {}),
          ...(cardGlow           ? { boxShadow: cardGlow }             : {}),
        }}
      >
        {/* Meta strip: hora · cancha · estado */}
        {showHorarioRow && (
          <div className={`flex items-center justify-between px-3.5 py-1.5 border-b ${hdCls}`}>
            <div className="flex items-center gap-2 min-w-0">
              {hora  && <span className={`text-[13px] font-mono font-bold ${hrClr}`}>{hora} hs</span>}
              {fecha && fmtFecha(fecha) && <span className={`text-[12px] ${dtClr}`}>{fmtFecha(fecha)}</span>}
              {cancha && <span className={`text-[12px] font-medium ${hrClr} opacity-70`}>· {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}</span>}
              {!hora && !fecha && onHorario && <span className={`text-[12px] ${emClr}`}>Sin horario</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {fin && !isBye && <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>Final</span>}
              {onHorario && (
                <button
                  onClick={() => onHorario(partido)}
                  className={`p-0.5 rounded transition-all ${isClara2 ? 'text-slate-400 hover:text-sky-600' : 'text-white/25 hover:text-sky-400'}`}
                  title="Editar horario"
                >
                  <Clock size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        <StatRow pareja={pareja1} seed={seed1} ganó={ganP1} perdió={ganP2 && fin} isFirst sets={setsP1} />
        <StatRow pareja={pareja2} seed={seed2} ganó={ganP2} perdió={ganP1 && fin} isFirst={false} sets={setsP2} />

        <BottomStrips showResult={false} />
      </div>
    )
  }

  // ── Layout FLAT ────────────────────────────────────────────────────────────
  if (cardLayout === 'flat') {
    const seedBadgeBg  = effectiveStyle === 'clara' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
    const seedBadgeBdr = effectiveStyle === 'clara' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'

    const FlatRow = ({ pareja, seed, ganó, perdió, isFirst }) => {
      const hasSeed = seed && !isBye && !pareja?.tbd
      const nameText = pareja?.tbd
        ? null
        : pareja
          ? `${apellido(pareja.jugador1)} / ${apellido(pareja.jugador2)}`
          : null

      const textColor = effectiveStyle === 'clara'
        ? ganó ? '#111827' : perdió ? '#d1d5db' : '#6b7280'
        : effectiveStyle === 'transparente'
          ? ganó ? '#ffffff' : perdió ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.60)'
          : ganó ? '#ffffff' : perdió ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)'

      const rowBg = effectiveStyle === 'clara'
        ? ganó ? 'rgba(0,0,0,0.04)' : 'transparent'
        : effectiveStyle === 'transparente'
          ? ganó ? `${accentColor}12` : 'transparent'
          : ganó ? 'rgba(255,255,255,0.07)' : 'transparent'

      const borderColor = effectiveStyle === 'clara' ? 'rgba(0,0,0,0.07)'
        : effectiveStyle === 'transparente' ? `${accentColor}18`
        : 'rgba(255,255,255,0.06)'

      return (
        <div
          className="flex items-stretch"
          style={{
            borderTop: isFirst ? 'none' : `1px solid ${borderColor}`,
            background: rowBg,
          }}
        >
          {/* Seed badge */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 26,
              borderRight: `1px solid ${seedBadgeBdr}`,
              background: hasSeed ? `${accentColor}18` : seedBadgeBg,
            }}
          >
            {hasSeed
              ? <span
                  className="text-[9px] font-black flex items-center justify-center"
                  style={{
                    color: accentColor,
                    width: 20,
                    height: 20,
                    borderRadius: cardSeedRadius,
                    background: `${accentColor}22`,
                    border: `1px solid ${accentColor}44`,
                  }}
                >{seed}</span>
              : <span className="text-[9px]" style={{ color: effectiveStyle === 'clara' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)' }}>—</span>
            }
          </div>

          {/* Name */}
          <div
            className="flex items-center flex-1 min-w-0 px-2.5"
            style={{ paddingTop: cardRowPaddingY, paddingBottom: cardRowPaddingY }}
          >
            {pareja?.tbd
              ? <span className={`italic text-[10px] ${effectiveStyle === 'clara' ? 'text-amber-600/70' : 'text-amber-400/60'}`}>{pareja.label}</span>
              : nameText
                ? <span
                    className={`${nameCls} truncate ${perdió && fin && !isBye ? 'line-through' : ''}`}
                    style={{
                      color: textColor,
                      fontWeight: ganó ? Math.min(cardNameFontWeight + 200, 800) : cardNameFontWeight,
                      textTransform: cardNameTransform,
                      letterSpacing: cardNameLetterSpacing,
                    }}
                  >{nameText}</span>
                : isBye
                  ? <span className={`italic font-mono text-[9px] tracking-widest ${byeSlotCls}`}>BYE</span>
                  : <span className={`italic text-[10px] ${emClr}`}>—</span>
            }
          </div>

          {/* Winner indicator */}
          {ganó && !isBye && (
            <div className="flex items-center pr-2.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
            </div>
          )}

        </div>
      )
    }

    return (
      <div
        className={`overflow-hidden border ${borderCls} ${bgCls} ${isLarge ? 'w-[220px]' : 'w-[200px]'} ${isBye ? 'opacity-55' : ''}`}
        style={{
          borderRadius: cardBorderRadius,
          ...(colorCard          ? { backgroundColor: colorCard }     : {}),
          ...(cardBorderOverride ? { borderColor: cardBorderOverride } : {}),
          ...(cardGlow           ? { boxShadow: cardGlow }             : {}),
        }}
      >
        {/* Hora/cancha header — admin (con botón editar) o público (siempre visible si hay hora) */}
        {showHorarioRow && (
          <div className={`flex items-center justify-between px-2 py-1 border-b ${hdCls}`}>
            <div className="flex items-center gap-1 min-w-0">
              {hora  && <span className={`text-[11px] font-mono font-semibold ${hrClr}`}>{hora} hs</span>}
              {fecha && fmtFecha(fecha) && <span className={`text-[11px] ${dtClr}`}>{fmtFecha(fecha)}</span>}
              {cancha && <span className={`text-[11px] ${hrClr} opacity-70`}>· {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}</span>}
              {!hora && !fecha && onHorario && <span className={`text-[11px] ${emClr}`}>Sin horario</span>}
            </div>
            {onHorario && (
              <button
                onClick={() => onHorario(partido)}
                className={`p-0.5 rounded transition-all ${effectiveStyle === 'clara' ? 'text-slate-400 hover:text-sky-600' : 'text-white/20 hover:text-sky-400'}`}
                title="Editar horario"
              >
                <Clock size={10} />
              </button>
            )}
          </div>
        )}

        <FlatRow pareja={pareja1} seed={seed1} ganó={ganP1} perdió={ganP2 && fin} isFirst />
        <FlatRow pareja={pareja2} seed={seed2} ganó={ganP2} perdió={ganP1 && fin} isFirst={false} />

        <BottomStrips />
      </div>
    )
  }

  // ── Layout DEFAULT (original) ──────────────────────────────────────────────
  return (
    <div
      className={`overflow-hidden border ${borderCls} ${bgCls} ${isLarge ? 'w-[220px]' : 'w-[192px]'} ${isBye ? 'opacity-60' : ''}`}
      style={{
        minHeight: 96,
        borderRadius: cardBorderRadius,
        ...(colorCard          ? { backgroundColor: colorCard }    : {}),
        ...(cardBorderOverride ? { borderColor: cardBorderOverride } : {}),
        ...(cardGlow           ? { boxShadow: cardGlow }            : {}),
      }}
    >
      {showHorarioRow && (
        <div className={`flex items-center justify-between px-3 py-1.5 border-b ${hdCls}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {hora  && <span className={`${hrCls} font-mono font-semibold ${hrClr} shrink-0`}>{hora} hs</span>}
            {fecha && fmtFecha(fecha) && <span className={`text-[12px] ${dtClr} shrink-0`}>{fmtFecha(fecha)}</span>}
            {cancha && (
              <span className={`text-[12px] font-medium shrink-0 ${hrClr}`}>
                · {canchaName ? (canchaName(cancha) ?? `C.${cancha}`) : `C.${cancha}`}
              </span>
            )}
            {!hora && !fecha && onHorario && <span className={`text-[12px] ${emClr}`}>Sin horario</span>}
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
          {pareja1?.tbd
            ? <span className={`italic text-[11px] ${effectiveStyle === 'clara' ? 'text-amber-600/70' : 'text-amber-400/60'}`}>{pareja1.label}</span>
            : pareja1
              ? `${apellido(pareja1.jugador1)} / ${apellido(pareja1.jugador2)}`
              : isBye
                ? <span className={`italic font-mono text-[10px] tracking-widest ${byeSlotCls}`}>BYE</span>
                : <span className={`italic ${emClr}`}>—</span>}
        </span>
        {seed1 && !isBye && !pareja1?.tbd && <span className="text-[9px] shrink-0 font-mono whitespace-nowrap" style={{ color: accentColor + 'aa' }}>{seed1}</span>}
      </div>

      <div className={`px-3 py-2.5 flex items-center gap-2 ${rowCls(ganP2, ganP1)}`}>
        {ganP2 && !isBye && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />}
        <span className={`${nameCls} truncate flex-1 ${ganP1 && fin && !isBye ? 'line-through' : ''}`}>
          {pareja2?.tbd
            ? <span className={`italic text-[11px] ${effectiveStyle === 'clara' ? 'text-amber-600/70' : 'text-amber-400/60'}`}>{pareja2.label}</span>
            : pareja2
              ? `${apellido(pareja2.jugador1)} / ${apellido(pareja2.jugador2)}`
              : isBye
                ? <span className={`italic font-mono text-[10px] tracking-widest ${byeSlotCls}`}>BYE</span>
                : <span className={`italic ${emClr}`}>—</span>}
        </span>
        {seed2 && !isBye && !pareja2?.tbd && <span className="text-[9px] shrink-0 font-mono whitespace-nowrap" style={{ color: accentColor + 'aa' }}>{seed2}</span>}
      </div>

      <BottomStrips />
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
  bracketTemplate = 'default',
  cardLayoutOverride = null, // fuerza el layout de las cards (ej. 'stat' = sets por lado) sin cambiar el theme
}) => {
  const theme        = BRACKET_THEMES[bracketTemplate] ?? BRACKET_THEMES.default
  const { rondas }   = bracket
  const accentColor  = accentColorOverride || torneo.colorAcento || '#afca0b'
  const cardStyle    = theme.cardStyleOverride ?? (torneo.estiloCard ?? 'oscura')
  const colorCard    = colorCardOverride ?? torneo.colorCard ?? null
  const fontScale    = torneo.fontScale    ?? 'normal'
  const sponsorScale = torneo.sponsorScale ?? 'normal'
  const canchaName   = (canchaId) => club?.canchas?.find((c) => String(c.id) === String(canchaId))?.nombre ?? null
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
  const finalMatch  = rondas[rondas.length - 1]?.partidos[0]
  const champion    = finalMatch?.estado === 'finalizado' ? finalMatch?.ganador : undefined
  const subChampion = champion
    ? (champion.id === finalMatch?.pareja1?.id ? finalMatch?.pareja2 : finalMatch?.pareja1)
    : undefined
  const connStroke  = torneo.bracketConnColor ?? theme.connStroke
  const connGlow    = (torneo.bracketConnGlow ?? true) && (theme.connGlow ?? false)
  const watermarkText   = torneo.bracketWatermarkOculto ? null : (torneo.bracketWatermark ?? theme.watermark)
  const watermarkColor  = theme.watermarkColor ?? 'rgba(255,255,255,0.025)'
  const watermarkTile   = theme.watermarkTile ?? false // true → mosaico de marcas chicas (solo world-tour-dark)
  const wrapperBg       = torneo.bracketFondoColor ?? theme.wrapperBg
  const drawMostrarGenero = torneo.drawMostrarGenero ?? true

  const maxMatches  = rondas[0]?.partidos.length ?? 1
  // En admin (onCargarResultado activo) las cards son más altas porque muestran
  // horario + resultado + strip "Finalizado/Editar". Necesitan más espacio vertical.
  const baseMatchH  = onCargarResultado ? 195 : 160
  const MATCH_H     = maxMatches >= 8 ? baseMatchH : maxMatches >= 4 ? baseMatchH + 25 : baseMatchH + 55
  const LABEL_H     = 48
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: wrapperBg,
        border: hideHeader ? 'none' : `1px solid ${theme.wrapperBorder}`,
        fontFamily: theme.fontFamily ?? undefined,
      }}
    >

      {/* ── Header + campeón (solo vista pública) ── */}
      {!hideHeader && (
        <>
          {theme.headerLayout === 'gold' ? (
            /* ── Gold header — placa de honor grabada (Championship Gold) ── */
            <div className="relative overflow-hidden" style={{ background: theme.headerBg }}>
              {torneo.imagenFondoDraw && (
                <>
                  <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'rgba(8,6,1,0.91)' }} />
                </>
              )}
              {/* Viñeta dorada superior */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accentColor}16, transparent 62%)` }} />
              {/* Ornamentos de esquina (filete doble) */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t border-l pointer-events-none" style={{ borderColor: `${accentColor}70` }} />
              <div className="absolute top-[18px] left-[18px] w-2.5 h-2.5 border-t border-l pointer-events-none" style={{ borderColor: `${accentColor}40` }} />
              <div className="absolute top-3 right-3 w-6 h-6 border-t border-r pointer-events-none" style={{ borderColor: `${accentColor}70` }} />
              <div className="absolute top-[18px] right-[18px] w-2.5 h-2.5 border-t border-r pointer-events-none" style={{ borderColor: `${accentColor}40` }} />

              <div className="relative z-10 px-7 pt-8 pb-7 flex flex-col items-center text-center gap-2.5">
                {/* Medallón del club: doble anillo */}
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `1px solid ${accentColor}55` }}>
                  <div className="absolute inset-[3px] rounded-full" style={{ border: `1px solid ${accentColor}28` }} />
                  {club?.logo
                    ? <img src={club.logo} alt={club.nombre} className="w-9 h-9 object-contain" />
                    : <Trophy size={20} style={{ color: accentColor }} />}
                </div>

                {/* Overline club */}
                {drawMostrarClub && club?.nombre && (
                  <p className="text-[10px] font-semibold uppercase" style={{ color: `${accentColor}9c`, letterSpacing: '0.34em' }}>{club.nombre}</p>
                )}

                {/* Filete con ornamento */}
                <div className="flex items-center gap-3">
                  <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${accentColor}88)` }} />
                  <span style={{ color: accentColor, fontSize: 13, lineHeight: 1 }}>❧</span>
                  <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${accentColor}88)` }} />
                </div>

                {/* Título — Cinzel con brillo metálico */}
                {drawTitulo && (
                  <h2
                    className="font-bold uppercase leading-none"
                    style={{
                      fontSize: 'clamp(24px, 4.2vw, 42px)',
                      letterSpacing: '0.06em',
                      backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.96) 0%, ${accentColor} 55%, ${accentColor} 100%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: `0 1px 12px ${accentColor}33`,
                    }}
                  >
                    {drawTitulo}
                  </h2>
                )}

                {/* Nombre torneo en versalitas */}
                {drawMostrarNombre && torneo.nombre && (
                  <p className="text-[12px] uppercase font-semibold" style={{ color: `${accentColor}cc`, letterSpacing: '0.24em' }}>{torneo.nombre}</p>
                )}

                {/* Categorías · género · fechas */}
                <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap justify-center text-[11px] mt-0.5" style={{ color: `${accentColor}88` }}>
                  {drawMostrarCategorias && torneo.categorias?.map((c, i) => (
                    <span key={c} className="font-medium uppercase tracking-wider">{i > 0 && <span className="mr-2.5" style={{ color: `${accentColor}44` }}>◆</span>}{c}</span>
                  ))}
                  {drawMostrarGenero && torneo.genero && (
                    <span className="font-medium uppercase tracking-wider"><span className="mr-2.5" style={{ color: `${accentColor}44` }}>◆</span>{torneo.genero}</span>
                  )}
                  {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                    <span className="tracking-wider"><span className="mr-2.5" style={{ color: `${accentColor}44` }}>◆</span>{fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}</span>
                  )}
                </div>
              </div>

              {/* Filete inferior doble */}
              <div className="absolute bottom-[3px] left-0 right-0 h-px" style={{ background: `${accentColor}3a` }} />
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }} />
            </div>
          ) : theme.headerLayout === 'arena' ? (
            /* ── Arena header — HUD esports cyberpunk (Neon Arena) ── */
            <div className="relative overflow-hidden" style={{ background: theme.headerBg }}>
              {torneo.imagenFondoDraw && (
                <>
                  <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'rgba(4,5,4,0.90)' }} />
                </>
              )}
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-60" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,180,0.03) 0px, rgba(0,255,180,0.03) 1px, transparent 1px, transparent 3px)',
              }} />
              {/* Diagonal hazard stripes (esquina derecha sutil) */}
              <div className="absolute top-0 right-0 w-40 h-full opacity-[0.05] pointer-events-none" style={{
                backgroundImage: `repeating-linear-gradient(-45deg, ${accentColor} 0px, ${accentColor} 2px, transparent 2px, transparent 10px)`,
              }} />
              {/* Corner brackets */}
              <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: `${accentColor}90` }} />
              <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: `${accentColor}90` }} />
              <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: `${accentColor}90` }} />
              <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: `${accentColor}90` }} />

              <div className="relative z-10 px-7 py-6 flex flex-col items-center text-center gap-2">
                {/* Logo en marco angular */}
                {club?.logo
                  ? <div className="w-12 h-12 flex items-center justify-center" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))', background: `${accentColor}12`, border: `1px solid ${accentColor}40` }}>
                      <img src={club.logo} alt={club.nombre} className="w-9 h-9 object-contain" />
                    </div>
                  : <div className="w-12 h-12 flex items-center justify-center" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))', background: `${accentColor}12`, border: `1px solid ${accentColor}40` }}>
                      <Trophy size={18} style={{ color: accentColor }} />
                    </div>
                }

                {/* Club overline */}
                {drawMostrarClub && club?.nombre && (
                  <p className="text-[9px] font-bold uppercase" style={{ color: `${accentColor}80`, letterSpacing: '0.3em' }}>
                    <span style={{ color: accentColor }}>// </span>{club.nombre}
                  </p>
                )}

                {/* Título flanqueado por brackets */}
                {drawTitulo && (
                  <div className="flex items-center gap-3">
                    <span className="font-bold" style={{ fontSize: 'clamp(20px,3.5vw,34px)', color: `${accentColor}70`, lineHeight: 1 }}>[</span>
                    <h2 className="font-bold uppercase leading-none" style={{ fontSize: 'clamp(22px, 4vw, 38px)', letterSpacing: '0.04em', color: '#ffffff', textShadow: `0 0 20px ${accentColor}60` }}>
                      {drawTitulo}
                    </h2>
                    <span className="font-bold" style={{ fontSize: 'clamp(20px,3.5vw,34px)', color: `${accentColor}70`, lineHeight: 1 }}>]</span>
                  </div>
                )}

                {/* Nombre torneo */}
                {drawMostrarNombre && torneo.nombre && (
                  <p className="text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: accentColor }}>{torneo.nombre}</p>
                )}

                {/* Chips angulares: categorías + género */}
                <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                  {drawMostrarCategorias && torneo.categorias?.map((c) => (
                    <span key={c} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))', color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}40` }}>
                      {c}
                    </span>
                  ))}
                  {drawMostrarGenero && torneo.genero && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {torneo.genero}
                    </span>
                  )}
                </div>

                {/* Fechas */}
                {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                  <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: `${accentColor}66` }}>
                    {fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}
                  </p>
                )}
              </div>
              {/* Neon line inferior */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`, boxShadow: `0 0 10px ${accentColor}` }} />
            </div>
          ) : theme.headerLayout === 'minimal' ? (
            /* ── Minimal header — editorial Grand Slam (Minimal Pro) ── */
            <div className="relative overflow-hidden" style={{ background: '#ffffff' }}>
              {torneo.imagenFondoDraw && (
                <>
                  <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.90)' }} />
                </>
              )}
              {/* Línea de acento superior fina */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />

              <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col items-center text-center gap-2.5">
                {/* Logo */}
                {club?.logo
                  ? <img src={club.logo} alt={club.nombre} className="w-12 h-12 object-contain" />
                  : <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}30` }}>
                      <Trophy size={18} style={{ color: accentColor }} />
                    </div>
                }

                {/* Overline: club */}
                {drawMostrarClub && club?.nombre && (
                  <p className="text-[10px] font-semibold uppercase" style={{ color: '#94a3b8', letterSpacing: '0.32em' }}>{club.nombre}</p>
                )}

                {/* Título grande editorial */}
                {drawTitulo && (
                  <h2 className="font-bold leading-none" style={{ fontSize: 'clamp(26px, 4.5vw, 40px)', letterSpacing: '-0.015em', color: '#0f172a' }}>
                    {drawTitulo}
                  </h2>
                )}

                {/* Nombre del torneo */}
                {drawMostrarNombre && torneo.nombre && (
                  <p className="text-[13px] font-medium" style={{ color: '#64748b' }}>{torneo.nombre}</p>
                )}

                {/* Separador con diamante */}
                <div className="flex items-center gap-2.5 mt-0.5">
                  <div className="h-px w-8" style={{ background: '#e2e8f0' }} />
                  <div className="w-1 h-1 rotate-45" style={{ background: accentColor }} />
                  <div className="h-px w-8" style={{ background: '#e2e8f0' }} />
                </div>

                {/* Categorías · género · fechas en una línea sobria */}
                <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap justify-center text-[11px]" style={{ color: '#94a3b8' }}>
                  {drawMostrarCategorias && torneo.categorias?.map((c, i) => (
                    <span key={c} className="font-medium" style={{ color: '#64748b' }}>{i > 0 && <span className="mr-2.5" style={{ color: '#cbd5e1' }}>·</span>}{c}</span>
                  ))}
                  {drawMostrarGenero && torneo.genero && (
                    <span className="font-medium">· {torneo.genero}</span>
                  )}
                  {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                    <span>· {fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}</span>
                  )}
                </div>
              </div>
              {/* Borde inferior */}
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: '#ececea' }} />
            </div>
          ) : theme.headerLayout === 'electric' ? (
            /* ── Electric header — App bar dashboard (Electric Blue) ── */
            <div className="relative overflow-hidden">
              {/* Base bg */}
              <div className="absolute inset-0" style={{ background: theme.headerBg }} />
              {torneo.imagenFondoDraw && (
                <>
                  <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'rgba(3,11,24,0.90)' }} />
                </>
              )}
              {/* Subtle dot grid */}
              <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: 'radial-gradient(circle, rgba(56,182,255,0.6) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />

              {/* App bar row */}
              <div className="relative z-10 px-5 py-3.5 flex items-center gap-3">
                {/* Logo cuadrado */}
                <div className="shrink-0">
                  {club?.logo
                    ? <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}35` }}>
                        <img src={club.logo} alt={club.nombre} className="w-8 h-8 object-contain" />
                      </div>
                    : <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}35` }}>
                        <Trophy size={16} style={{ color: accentColor }} />
                      </div>
                  }
                </div>

                {/* Título + club */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {drawTitulo && (
                    <h2 className="font-bold uppercase leading-tight truncate"
                      style={{ fontSize: 'clamp(16px, 2.5vw, 24px)', letterSpacing: '0.02em', color: '#ffffff' }}>
                      {drawTitulo}
                    </h2>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {drawMostrarClub && club?.nombre && (
                      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: `${accentColor}99` }}>{club.nombre}</span>
                    )}
                    {drawMostrarNombre && torneo.nombre && drawMostrarClub && club?.nombre && (
                      <span className="text-[10px]" style={{ color: 'rgba(56,182,255,0.30)' }}>·</span>
                    )}
                    {drawMostrarNombre && torneo.nombre && (
                      <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.40)' }}>{torneo.nombre}</span>
                    )}
                  </div>
                </div>

                {/* Chips a la derecha */}
                <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                  {drawMostrarCategorias && torneo.categorias?.map((c) => (
                    <span key={c} className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{ color: accentColor, background: `${accentColor}12`, border: `1px solid ${accentColor}30` }}>{c}</span>
                  ))}
                  {drawMostrarGenero && torneo.genero && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      {torneo.genero}
                    </span>
                  )}
                </div>
              </div>

              {/* Fechas + neon divider */}
              {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                <div className="relative z-10 px-5 pb-2.5 -mt-1">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(56,182,255,0.40)' }}>
                    {fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}
                  </span>
                </div>
              )}
              {/* Bottom neon line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}40, transparent)`, boxShadow: `0 0 10px ${accentColor}60` }} />
            </div>
          ) : theme.headerLayout === 'broadcast' ? (
            /* ── Broadcast header (World Tour Dark style) ── */
            <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
              {/* Background */}
              <div className="absolute inset-0" style={{ background: theme.headerBg }} />
              {torneo.imagenFondoDraw && (
                <>
                  <img src={torneo.imagenFondoDraw} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'rgba(4,8,17,0.88)' }} />
                </>
              )}
              {/* Diagonal stripe texture */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 12px)',
              }} />
              {/* Accent left bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}00)` }} />
              {/* Accent right glow */}
              <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10" style={{ background: `radial-gradient(ellipse at right center, ${accentColor}, transparent)` }} />

              <div className="relative z-10 px-8 pt-6 pb-7 flex flex-col gap-0">
                {/* Top row: logo + club name + gender badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {club?.logo
                      ? <img src={club.logo} alt={club.nombre} className="w-9 h-9 object-contain opacity-90" />
                      : <div className="w-8 h-8 flex items-center justify-center rounded" style={{ background: accentColor + '20', border: `1px solid ${accentColor}40` }}>
                          <Trophy size={14} style={{ color: accentColor }} />
                        </div>
                    }
                    {drawMostrarClub && (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">{club?.nombre}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {drawMostrarGenero && torneo.genero && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1" style={{ color: accentColor, border: `1px solid ${accentColor}40`, borderRadius: 2 }}>
                        {torneo.genero}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main title block — drawTitulo en gigante */}
                {drawTitulo && (
                  <h2 className="font-black uppercase leading-none text-white" style={{ fontSize: 'clamp(28px, 5vw, 52px)', letterSpacing: '-0.01em', lineHeight: 0.92 }}>
                    {drawTitulo}
                  </h2>
                )}

                {/* Tournament name como subtítulo secundario + línea accent */}
                {drawMostrarNombre && torneo.nombre && (
                  <div className="flex items-center gap-3 mt-3">
                    <div className="h-px flex-1 opacity-20" style={{ background: accentColor }} />
                    <p className="font-bold uppercase tracking-[0.3em] text-[13px]" style={{ color: accentColor }}>
                      {torneo.nombre}
                    </p>
                    <div className="h-px w-8 opacity-20" style={{ background: accentColor }} />
                  </div>
                )}

                {/* Bottom row: dates + categories */}
                <div className="flex items-center justify-between mt-3">
                  {drawMostrarFechas && torneo.fechaInicio && torneo.fechaFin && (
                    <span className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {fmtFecha(torneo.fechaInicio)} — {fmtFecha(torneo.fechaFin)}
                    </span>
                  )}
                  {drawMostrarCategorias && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {torneo.categorias?.map((c) => (
                        <span key={c} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5" style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 2 }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Default header ── */
            <div className="relative py-10 px-6 text-center overflow-hidden">
              <div className="absolute inset-0" style={{ background: theme.headerBg }} />
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
          )}

        </>
      )}

      {/* ── Tabs de categoría ── */}
      {multiCatD && onSelectCat && (
        <div
          className="flex gap-2 px-5 py-3 flex-wrap"
          style={{ borderBottom: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb'}` }}
        >
          {catBrackets.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCat(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedCat === cat
                  ? 'border-transparent'
                  : ''
              }`}
              style={
                selectedCat === cat
                  ? { background: accentColor, borderColor: accentColor, color: '#0d1117' }
                  : {
                    color: theme.isDark ? 'rgba(255,255,255,0.40)' : '#6b7280',
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.10)' : '#d1d5db',
                  }
              }
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
        <div className="no-scrollbar flex-1 py-8 px-4" style={{ overflowX: 'auto' }}>
          <div
            ref={bracketRef}
            className="relative min-w-max mx-auto w-fit"
            style={{ display: 'flex', alignItems: 'flex-start', gap: COL_GAP }}
          >
            {/* Watermark — mosaico de marcas chicas (watermarkTile) o una sola grande (default) */}
            {watermarkText && watermarkTile && (
              <div
                className="absolute inset-0 pointer-events-none select-none overflow-hidden"
                style={{ zIndex: 0 }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '-25%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(30px, 4.5vw, 70px)',
                    transform: 'rotate(-12deg)',
                  }}
                >
                  {Array.from({ length: 160 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        color: watermarkColor,
                        fontSize: 'clamp(22px, 3.2vw, 46px)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {watermarkText}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {watermarkText && !watermarkTile && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                style={{ zIndex: 0 }}
              >
                <span
                  style={{
                    color: watermarkColor,
                    fontSize: 'clamp(60px, 12vw, 130px)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                    transform: 'rotate(-12deg)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {watermarkText}
                </span>
              </div>
            )}

            {rondas.map((ronda, ri) => {
              const esFinal   = ri === rondas.length - 1
              const fromCount = ronda.partidos.length
              const labelColor = esFinal ? accentColor : theme.labelColor
              return (
                <div key={`round-${ronda.numero}`} className="flex flex-col" style={{ height: BRACKET_H, position: 'relative', zIndex: 1 }}>
                  {/* Round label */}
                  {theme.roundLabelStyle === 'gold' ? (
                    <div className="flex items-center justify-center gap-2.5 px-2" style={{ height: LABEL_H }}>
                      <div className="h-px flex-1 max-w-[22px]" style={{ background: `linear-gradient(to right, transparent, ${esFinal ? accentColor : `${accentColor}66`})` }} />
                      <span style={{ color: esFinal ? accentColor : `${accentColor}66`, fontSize: 8 }}>◆</span>
                      <span
                        className="text-[13px] font-semibold uppercase whitespace-nowrap"
                        style={{ color: esFinal ? accentColor : labelColor, letterSpacing: theme.labelLetterSpacing ?? '0.22em' }}
                      >
                        {ronda.nombre}
                      </span>
                      <span style={{ color: esFinal ? accentColor : `${accentColor}66`, fontSize: 8 }}>◆</span>
                      <div className="h-px flex-1 max-w-[22px]" style={{ background: `linear-gradient(to left, transparent, ${esFinal ? accentColor : `${accentColor}66`})` }} />
                    </div>
                  ) : theme.roundLabelStyle === 'arena' ? (
                    <div className="flex items-center justify-center px-1" style={{ height: LABEL_H }}>
                      <div
                        className="px-3 flex items-center gap-1.5"
                        style={{
                          height: 24,
                          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                          background: `${labelColor}16`,
                          border: `1px solid ${labelColor}3a`,
                        }}
                      >
                        <span style={{ color: labelColor, fontSize: 10, fontWeight: 800 }}>›</span>
                        <span
                          className="text-[13px] font-bold uppercase whitespace-nowrap"
                          style={{ color: labelColor, letterSpacing: theme.labelLetterSpacing ?? '0.18em', textShadow: `0 0 8px ${labelColor}50` }}
                        >
                          {ronda.nombre}
                        </span>
                      </div>
                    </div>
                  ) : theme.roundLabelStyle === 'minimal' ? (
                    <div className="flex items-center justify-center gap-2.5 px-2" style={{ height: LABEL_H }}>
                      <div className="h-px flex-1 max-w-[28px]" style={{ background: esFinal ? `${accentColor}55` : '#e2e8f0' }} />
                      <span
                        className="text-[11px] font-semibold uppercase whitespace-nowrap"
                        style={{ color: esFinal ? accentColor : labelColor, letterSpacing: theme.labelLetterSpacing ?? '0.28em' }}
                      >
                        {ronda.nombre}
                      </span>
                      <div className="h-px flex-1 max-w-[28px]" style={{ background: esFinal ? `${accentColor}55` : '#e2e8f0' }} />
                    </div>
                  ) : theme.roundLabelStyle === 'boxed' ? (
                    <div
                      className="flex items-center justify-center px-1"
                      style={{ height: LABEL_H }}
                    >
                      <div
                        className="rounded-lg px-3 flex items-center justify-center"
                        style={{
                          height: 24,
                          background: `${labelColor}14`,
                          border: `1px solid ${labelColor}28`,
                        }}
                      >
                        <span
                          className="text-[16px] font-bold uppercase whitespace-nowrap"
                          style={{
                            color: labelColor,
                            letterSpacing: theme.labelLetterSpacing ?? '0.12em',
                          }}
                        >
                          {ronda.nombre}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p
                      style={{
                        height: LABEL_H,
                        color: labelColor,
                        ...(theme.labelLetterSpacing ? { letterSpacing: theme.labelLetterSpacing } : {}),
                      }}
                      className="text-center text-[16px] font-bold uppercase tracking-wide whitespace-nowrap px-2 flex items-center justify-center"
                    >
                      {ronda.nombre}
                    </p>
                  )}

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
                            cardBorderOverride={theme.cardBorderOverride}
                            cardGlow={theme.cardGlow}
                            cardLayout={cardLayoutOverride ?? theme.cardLayout ?? 'default'}
                            cardBorderRadius={theme.cardBorderRadius ?? '12px'}
                            cardNameTransform={theme.cardNameTransform ?? 'none'}
                            cardNameLetterSpacing={theme.cardNameLetterSpacing ?? null}
                            cardNameFontWeight={theme.cardNameFontWeight ?? 400}
                            cardRowPaddingY={theme.cardRowPaddingY ?? '10px'}
                            cardSeedRadius={theme.cardSeedRadius ?? '3px'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* ── Panel CAMPEÓN + SUBCAMPEÓN (a la derecha de la Final) ── */}
            {champion && (
              <div
                className="flex flex-col items-center justify-center shrink-0"
                style={{ height: BRACKET_H, position: 'relative', zIndex: 1, paddingLeft: 8, paddingRight: 8, minWidth: 200 }}
              >
                <style>{`
                  @keyframes champPanelIn { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
                  @keyframes champRingPulse { 0%,100% { box-shadow: 0 0 22px ${accentColor}55, inset 0 0 12px ${accentColor}30; } 50% { box-shadow: 0 0 38px ${accentColor}88, inset 0 0 16px ${accentColor}45; } }
                  @keyframes champTrophyBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
                `}</style>

                {/* ── Campeón ── */}
                <div className="flex flex-col items-center" style={{ animation: 'champPanelIn 0.55s ease-out both' }}>
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 92, height: 92,
                      border: `2px solid ${accentColor}`,
                      background: `radial-gradient(circle at 50% 35%, ${accentColor}26 0%, ${theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'} 75%)`,
                      animation: 'champRingPulse 3s ease-in-out infinite',
                    }}
                  >
                    <Trophy size={42} style={{ color: accentColor, animation: 'champTrophyBob 3.2s ease-in-out infinite' }} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-3.5">
                    <Trophy size={11} style={{ color: accentColor }} />
                    <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: accentColor }}>
                      Campeón
                    </span>
                  </div>
                  <p className="text-center font-black leading-tight mt-1.5 max-w-[180px]"
                    style={{ color: theme.isDark ? '#fff' : '#0d1117', fontSize: 16 }}>
                    {champion.jugador1} {champion.jugador2 ? `– ${champion.jugador2}` : ''}
                  </p>
                </div>

                {/* ── Subcampeón ── */}
                {subChampion && (
                  <div className="flex flex-col items-center mt-7 pt-7 w-full"
                    style={{ borderTop: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`, animation: 'champPanelIn 0.55s ease-out 0.12s both' }}>
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: 58, height: 58,
                        border: '2px solid rgba(190,196,204,0.7)',
                        background: `radial-gradient(circle at 50% 35%, rgba(190,196,204,0.20) 0%, ${theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'} 75%)`,
                      }}
                    >
                      <Medal size={26} style={{ color: '#c4cad1' }} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <Medal size={10} style={{ color: '#c4cad1' }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.isDark ? 'rgba(196,202,209,0.85)' : '#71777f' }}>
                        Subcampeón
                      </span>
                    </div>
                    <p className="text-center font-bold leading-tight mt-1 max-w-[170px]"
                      style={{ color: theme.isDark ? 'rgba(255,255,255,0.72)' : '#475569', fontSize: 13 }}>
                      {subChampion.jugador1} {subChampion.jugador2 ? `– ${subChampion.jugador2}` : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

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
              {connGlow && (
                <defs>
                  <filter id="conn-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              )}
              {lines.map((line, i) => {
                const filterProp = connGlow ? { filter: 'url(#conn-glow)' } : {}
                if (line.type === 'direct') {
                  const { x1, y1, xN, yN } = line
                  const xMid = (x1 + xN) / 2
                  return (
                    <g key={i} stroke={connStroke} strokeWidth="1.5" {...filterProp}>
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
                  <g key={i} stroke={connStroke} strokeWidth="1.5" {...filterProp}>
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

      </div>

      {/* Footer de sponsors — solo página pública */}
      {sponsors.length > 0 && (
        <div
          className="overflow-hidden"
          style={{ borderTop: `3px solid ${theme.sponsorsTopBorder ?? accentColor}` }}
        >
          <div
            className="flex flex-wrap items-center justify-center gap-8 px-8 py-4"
            style={{ background: theme.sponsorsBg }}
          >
            {sponsors.map((s, i) => (
              <div key={i} className="flex items-center justify-center hover:opacity-70 transition-opacity" style={{ minWidth: 60 }}>
                {s.logo
                  ? <img src={s.logo} alt={s.nombre} className="h-12 w-auto max-w-[140px] object-contain" />
                  : <p className={`text-xs font-bold uppercase tracking-wide ${theme.isDark ? 'text-white/40' : 'text-slate-500'}`}>{s.nombre}</p>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BracketView
