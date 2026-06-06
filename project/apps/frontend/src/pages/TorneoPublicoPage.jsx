import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Trophy, Calendar, ArrowLeft, Users, GitMerge, Clock, CheckCircle,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import useClubStore from '../store/clubStore'
import { isGroupPhaseFinished } from '../services/torneoService'
import BracketView, { isColorDark } from '../components/BracketView'
import { api } from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const CAT_PALETTE = ['#38bdf8', '#f59e0b', '#f43f5e', '#a78bfa', '#34d399', '#fb923c', '#e879f9']
const buildCatColorMap = (cats) => Object.fromEntries(cats.map((c, i) => [c, CAT_PALETTE[i % CAT_PALETTE.length]]))
const DIAS_ORDEN = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

const fmtFecha = (iso) => {
  const [,m,d] = iso.split('-').map(Number)
  return `${d} ${MESES[m-1]}`
}

// ── Partido card renderer — disponible para TabGrupos cuando se integre ──────

const makePartidoCard = (p, {
  templateFixture = 1, accentColor, colorCard = null, cardStyle = 'oscura',
  colorTextoNombres = null, colorTextoZona = null, colorTextoCategoria = null,
  colorTextoScore = null, colorTextoInfo = null, canchaName, catColorMap = {}, torneo,
}) => {
  const effectiveStyle = colorCard ? (isColorDark(colorCard) ? 'oscura' : 'clara') : cardStyle
  const isClara = effectiveStyle === 'clara'
  const st = {
    card:      isClara ? 'border-gray-200 bg-white'        : 'border-white/8 bg-white/3',
    cardFin:   isClara ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/15 bg-emerald-500/3',
    hdrBorder: isClara ? 'border-gray-100'                 : 'border-white/5',
    hora:      isClara ? 'text-xs font-bold text-gray-700' : 'text-xs font-bold text-white/70',
    cancha:    isClara ? 'text-[10px] text-gray-400'       : 'text-[10px] text-white/30',
    nameW:     isClara ? 'text-gray-900 font-semibold'     : 'text-white font-semibold',
    nameL:     isClara ? 'text-gray-300'                   : 'text-white/25',
    nameN:     isClara ? 'text-gray-600'                   : 'text-white/70',
    seedBg:    isClara ? 'bg-gray-100 text-gray-500'       : 'bg-white/8 text-white/40',
    chipW:     isClara ? 'text-emerald-600 bg-emerald-50 border-emerald-200'   : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    chipL:     isClara ? 'text-gray-400 bg-gray-100 border-gray-200'           : 'text-white/25 bg-white/5 border-white/8',
    vs:        isClara ? 'text-gray-300'                   : 'text-white/20',
  }
  const cardBg     = colorCard ? { backgroundColor: colorCard } : undefined
  const cardStyle_ = (fin) => `rounded-2xl border overflow-hidden ${fin ? st.cardFin : st.card}`
  const clrZona    = colorTextoZona  || accentColor
  const clrScoreW  = colorTextoScore || accentColor
  const clrScoreL  = colorTextoScore ? `${colorTextoScore}35` : isClara ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
  const clrInfo    = colorTextoInfo  || (isClara ? '#6b7280' : 'rgba(255,255,255,0.3)')
  const clrHora    = colorTextoInfo  || (isClara ? '#374151' : 'rgba(255,255,255,0.7)')
  const nStyle = (isWinner, isLoser) => {
    if (!colorTextoNombres) return {}
    const base = colorTextoNombres
    if (isWinner) return { color: base }
    if (isLoser)  return { color: `${base}35` }
    return { color: `${base}90` }
  }

  const fin  = p.estado === 'finalizado'
  const ganP1 = p.ganador?.id === p.pareja1?.id
  const ganP2 = p.ganador?.id === p.pareja2?.id

  // ── Template 2: Premier Padel Style ────────────────────────────────────────
  if (templateFixture === 2) {
    const sn = (full) => {
      const parts = (full ?? '').trim().split(' ')
      if (parts.length === 1) return { ap: parts[0].toUpperCase(), nm: '' }
      const nm = parts[0]
      const ap = parts.slice(1).join(' ').toUpperCase()
      return { ap, nm }
    }
    const p1j1 = sn(p.pareja1?.jugador1), p1j2 = sn(p.pareja1?.jugador2)
    const p2j1 = sn(p.pareja2?.jugador1), p2j2 = sn(p.pareja2?.jugador2)
    const sideOp = (ganThis) => fin ? (ganThis ? 'opacity-100' : 'opacity-30') : 'opacity-100'
    const cardBackground = colorCard || '#000'
    const t2IsClara  = colorCard ? !isColorDark(colorCard) : false
    const t2NombreW  = colorTextoNombres   || (t2IsClara ? '#111827' : '#ffffff')
    const t2NombreM  = colorTextoNombres   ? `${colorTextoNombres}70` : (t2IsClara ? '#374151' : 'rgba(255,255,255,0.5)')
    const t2NombreS  = colorTextoNombres   ? `${colorTextoNombres}50` : (t2IsClara ? '#6b7280' : 'rgba(255,255,255,0.3)')
    const t2NombreXS = colorTextoNombres   ? `${colorTextoNombres}40` : (t2IsClara ? '#9ca3af' : 'rgba(255,255,255,0.2)')
    const t2Seed     = t2IsClara ? 'text-gray-500 bg-black/8' : 'text-white/30 bg-white/6'
    const t2Border   = fin ? `1px solid ${accentColor}35` : (t2IsClara ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.08)')
    return (
      <div key={p.id} className="relative rounded-2xl overflow-hidden"
        style={{ background: cardBackground, border: t2Border }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)`,
          backgroundSize: '100% 38px',
        }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: accentColor, opacity: fin ? 1 : 0.4 }} />
        <div className="relative flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: clrZona }}>{p._zona}</span>
            {p._cat && (
              colorTextoCategoria
                ? <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colorTextoCategoria }}>· {p._cat}</span>
                : <span className="text-[9px] text-white/20 uppercase tracking-widest">· {p._cat}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[11px] font-bold font-mono" style={{ color: clrHora }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px]" style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
            {fin && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle size={9}/>FIN</span>}
          </div>
        </div>
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 py-4 gap-3">
          <div className={`flex flex-col gap-1.5 transition-opacity ${sideOp(ganP1)}`}>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${t2Seed}`}>{p._n1 ?? '?'}</span>
              {ganP1 && <span className="text-[9px] font-black text-emerald-500">✓ Ganó</span>}
            </div>
            <div>
              <p className="font-black uppercase leading-none"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                {p1j1.ap || '—'}
              </p>
              {p1j1.nm && <p className="text-[10px] mt-0.5" style={{ color: t2NombreS }}>{p1j1.nm}</p>}
            </div>
            <div>
              <p className="font-bold uppercase leading-none"
                style={{ fontSize: 'clamp(10px,1.8vw,16px)', color: t2NombreM, letterSpacing: '-0.01em' }}>
                {p1j2.ap || '—'}
              </p>
              {p1j2.nm && <p className="text-[9px]" style={{ color: t2NombreXS }}>{p1j2.nm}</p>}
            </div>
          </div>
          <div className="flex flex-col items-center min-w-[68px] md:min-w-[88px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-2 md:gap-3 items-start">
                {p.resultado.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="font-black font-mono tabular-nums leading-none"
                      style={{ fontSize: 'clamp(16px,3vw,26px)', color: s.p1 > s.p2 ? clrScoreW : clrScoreL }}>{s.p1}</span>
                    <span className="font-black font-mono tabular-nums leading-none"
                      style={{ fontSize: 'clamp(16px,3vw,26px)', color: s.p2 > s.p1 ? clrScoreW : clrScoreL }}>{s.p2}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="font-black tracking-widest" style={{ fontSize: 'clamp(14px,2.5vw,22px)', color: clrScoreL }}>VS</span>
            )}
          </div>
          <div className={`flex flex-col gap-1.5 items-end text-right transition-opacity ${sideOp(ganP2)}`}>
            <div className="flex items-center gap-1.5 justify-end">
              {ganP2 && <span className="text-[9px] font-black text-emerald-500">✓ Ganó</span>}
              <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${t2Seed}`}>{p._n2 ?? '?'}</span>
            </div>
            <div>
              <p className="font-black uppercase leading-none"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                {p2j1.ap || '—'}
              </p>
              {p2j1.nm && <p className="text-[10px] mt-0.5 text-right" style={{ color: t2NombreS }}>{p2j1.nm}</p>}
            </div>
            <div>
              <p className="font-bold uppercase leading-none"
                style={{ fontSize: 'clamp(10px,1.8vw,16px)', color: t2NombreM, letterSpacing: '-0.01em' }}>
                {p2j2.ap || '—'}
              </p>
              {p2j2.nm && <p className="text-[9px] text-right" style={{ color: t2NombreXS }}>{p2j2.nm}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Template 3: Pro Tournament ──────────────────────────────────────────────
  if (templateFixture === 3) {
    const navy = '#1A1A2E'
    const nombres = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden bg-white"
        style={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${colorTextoNombres || navy}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: colorCard || navy }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: clrZona === accentColor ? '#fff' : clrZona }}>{p._zona}</span>
            {p._cat && <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{p._cat}</span>}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[11px] font-semibold text-white/70">{p.slot.hora} hs</span>}
            {p.cancha     && <span className="text-[10px] text-white/50">{canchaName(p.cancha)}</span>}
            {fin && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><CheckCircle size={9}/>Fin</span>}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
          <div className={`flex items-center gap-2 min-w-0 ${ganP1 ? 'opacity-100' : ganP2 && fin ? 'opacity-40' : 'opacity-100'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : 'text-gray-500 bg-gray-100'}`}>{ganP1 ? <CheckCircle size={10}/> : p._n1}</span>
            <span className={`text-sm font-semibold truncate ${ganP2 && fin ? 'line-through text-gray-300' : 'text-gray-900'}`} style={colorTextoNombres ? { color: colorTextoNombres } : {}}>{nombres(p.pareja1)}</span>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-1">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: s.p1 > s.p2 ? `${clrScoreW}20` : '#F3F4F6', color: s.p1 > s.p2 ? clrScoreW : '#9CA3AF', border: `1px solid ${s.p1 > s.p2 ? `${clrScoreW}30` : '#E5E7EB'}` }}>
                    {s.p1}-{s.p2}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-black" style={{ color: clrScoreL || '#D1D5DB' }}>vs</span>
            )}
          </div>
          <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP2 ? 'opacity-100' : ganP1 && fin ? 'opacity-40' : 'opacity-100'}`}>
            <span className={`text-sm font-semibold truncate text-right ${ganP1 && fin ? 'line-through text-gray-300' : 'text-gray-900'}`} style={colorTextoNombres ? { color: colorTextoNombres } : {}}>{nombres(p.pareja2)}</span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : 'text-gray-500 bg-gray-100'}`}>{ganP2 ? <CheckCircle size={10}/> : p._n2}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Template 6: High Contrast ───────────────────────────────────────────────
  if (templateFixture === 6) {
    const fmt = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
    const estado = fin ? 'FINALIZADO' : 'PENDIENTE'
    const estadoBg = fin ? '#000000' : '#767676'
    return (
      <div key={p.id} style={{ background: colorCard || '#FFFFFF', border: '2px solid #000000', borderRadius: 8, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#000000' }}>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-white" style={{ fontSize: 11, letterSpacing: '1.5px' }}>{p._zona}</span>
            {p._cat && <span className="font-semibold text-white/70 uppercase" style={{ fontSize: 10 }}>{p._cat}</span>}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="font-bold text-white" style={{ fontSize: 12 }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-white/70" style={{ fontSize: 11 }}>{canchaName(p.cancha)}</span>}
            <span className="font-black text-white uppercase px-2 py-0.5 rounded" style={{ fontSize: 9, letterSpacing: '1px', backgroundColor: estadoBg }}>{estado}</span>
          </div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div className="flex items-center justify-between py-2" style={{ borderBottom: '2px solid #000000' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 flex items-center justify-center font-black rounded shrink-0"
                style={{ fontSize: 11, backgroundColor: ganP1 ? '#000000' : '#EEEEEE', color: ganP1 ? '#FFFFFF' : '#000000', border: '1px solid #000000' }}>
                {ganP1 ? '✓' : p._n1}
              </span>
              <span className="font-bold truncate" style={{ fontSize: 14, color: colorTextoNombres || (ganP2 && fin ? '#AAAAAA' : '#000000'), textDecoration: ganP2 && fin ? 'line-through' : 'none' }}>{fmt(p.pareja1)}</span>
            </div>
            {fin && <span className="font-black ml-3 shrink-0" style={{ fontSize: 14, color: '#000000' }}>
              {p.resultado?.map((s) => s.p1).join(' ')}
            </span>}
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 flex items-center justify-center font-black rounded shrink-0"
                style={{ fontSize: 11, backgroundColor: ganP2 ? '#000000' : '#EEEEEE', color: ganP2 ? '#FFFFFF' : '#000000', border: '1px solid #000000' }}>
                {ganP2 ? '✓' : p._n2}
              </span>
              <span className="font-bold truncate" style={{ fontSize: 14, color: colorTextoNombres || (ganP1 && fin ? '#AAAAAA' : '#000000'), textDecoration: ganP1 && fin ? 'line-through' : 'none' }}>{fmt(p.pareja2)}</span>
            </div>
            {fin && <span className="font-black ml-3 shrink-0" style={{ fontSize: 14, color: '#000000' }}>
              {p.resultado?.map((s) => s.p2).join(' ')}
            </span>}
          </div>
        </div>
      </div>
    )
  }

  // ── Template 7: Dark Premium ────────────────────────────────────────────────
  if (templateFixture === 7) {
    const gold  = '#D4AF37'
    const bg    = colorCard || '#111111'
    const cNom  = colorTextoNombres || '#F5F5F5'
    const cSec  = '#888888'
    const cScore= colorTextoScore || gold
    const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #2A2A2A', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1.5px solid ${gold}` }}>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-[10px] tracking-widest" style={{ color: clrZona === accentColor ? gold : clrZona }}>{p._zona}</span>
            {p._cat && <span className="text-[9px] uppercase tracking-wider" style={{ color: cSec }}>{p._cat}</span>}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[11px]" style={{ color: cSec }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px]" style={{ color: '#555' }}>{canchaName(p.cancha)}</span>}
            {fin && <span className="text-[9px] font-bold" style={{ color: gold }}>✓ FIN</span>}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 gap-3" style={{ background: '#181818' }}>
          <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}
            style={ganP1 ? { borderLeft: `3px solid ${gold}`, paddingLeft: 10, background: `rgba(212,175,55,0.06)`, borderRadius: 4 } : {}}>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
            {ganP1 && <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: gold }}>Ganador</span>}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[72px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-1.5">
                {p.resultado.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: s.p1 > s.p2 ? cScore : '#444' }}>{s.p1}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: s.p2 > s.p1 ? cScore : '#444' }}>{s.p2}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute w-full h-px rotate-45" style={{ backgroundColor: gold, opacity: 0.6 }}/>
                <div className="absolute w-full h-px -rotate-45" style={{ backgroundColor: gold, opacity: 0.6 }}/>
                <span className="text-[9px] font-black z-10 bg-[#181818] px-0.5" style={{ color: gold }}>vs</span>
              </div>
            )}
          </div>
          <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-35' : ''}`}
            style={ganP2 ? { borderRight: `3px solid ${gold}`, paddingRight: 10, background: `rgba(212,175,55,0.06)`, borderRadius: 4 } : {}}>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
            {ganP2 && <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: gold }}>Ganador</span>}
          </div>
        </div>
      </div>
    )
  }

  // ── Template 8: Luxury Gold ─────────────────────────────────────────────────
  if (templateFixture === 8) {
    const gold    = colorTextoScore || '#C9A84C'
    const goldDk  = '#8B6914'
    const bg      = colorCard || '#0D0B08'
    const cCrm    = colorTextoNombres || '#F5ECD7'
    const cSec    = '#A8956A'
    const fmt     = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden relative"
        style={{ background: bg, boxShadow: `0 0 0 1.5px transparent, 0 0 0 1.5px ${goldDk}`, border: `1.5px solid ${goldDk}` }}>
        {[['top-0 left-0','border-t border-l'],['top-0 right-0','border-t border-r'],['bottom-0 left-0','border-b border-l'],['bottom-0 right-0','border-b border-r']].map(([pos, cls], i) => (
          <span key={i} className={`absolute w-3 h-3 ${pos} ${cls}`} style={{ borderColor: gold, opacity: 0.6 }}/>
        ))}
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${goldDk}`, borderTop: `1px solid ${goldDk}`, marginTop: 4 }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-[3px] text-[9px]" style={{ color: gold }}>{p._zona}</span>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px]" style={{ color: cSec }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px]" style={{ color: '#5a4820' }}>{canchaName(p.cancha)}</span>}
            </div>
          </div>
          {p._cat && <div className="text-[11px] italic mt-0.5" style={{ color: cSec, fontFamily: 'Georgia, serif' }}>{p._cat}</div>}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 gap-4">
          <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-30' : ''}`}>
            {ganP1 && <span style={{ color: gold }}>✦</span>}
            <span className="text-sm font-semibold" style={{ color: cCrm, fontFamily: 'Georgia, serif' }}>{fmt(p.pareja1)}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-2">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-sm font-bold tabular-nums"
                    style={{ color: s.p1 > s.p2 ? gold : '#3a2e15', letterSpacing: 2 }}>{s.p1}-{s.p2}</span>
                ))}
              </div>
            ) : (
              <span className="text-xs tracking-[6px] font-light" style={{ color: cSec }}>✦  ✦</span>
            )}
          </div>
          <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-30' : ''}`}>
            {ganP2 && <span className="text-right" style={{ color: gold }}>✦</span>}
            <span className="text-sm font-semibold" style={{ color: cCrm, fontFamily: 'Georgia, serif' }}>{fmt(p.pareja2)}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Template 9: Modern Gradient ─────────────────────────────────────────────
  if (templateFixture === 9) {
    const gradColors = colorCard ? [colorCard, colorCard] : ['#667eea', '#764ba2']
    const grad  = `linear-gradient(135deg, ${gradColors[0]} 0%, ${gradColors[1]} 100%)`
    const cNom  = colorTextoNombres || '#1F2937'
    const cSec  = '#6B7280'
    const cScore= colorTextoScore || gradColors[0]
    const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div className="relative px-4 pt-3 pb-6" style={{ background: grad }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[2px] text-white/75">{p._zona}</span>
              {p._cat && <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>{p._cat}</span>}
            </div>
            <div className="flex items-center gap-2">
              {p.slot?.hora && (
                <span className="text-white font-bold text-[11px] flex items-center justify-center w-12 h-5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }}>{p.slot.hora}</span>
              )}
              {fin && <span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full">FIN</span>}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-5 bg-white" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}/>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3 -mt-1">
          <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
            {ganP1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit text-white" style={{ background: grad }}>✓ Ganó</span>}
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[68px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-1">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: s.p1 > s.p2 ? grad : '#F3F4F6', color: s.p1 > s.p2 ? 'white' : '#D1D5DB' }}>
                    {s.p1}-{s.p2}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-black" style={{ color: '#D1D5DB' }}>vs</span>
            )}
          </div>
          <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-35' : ''}`}>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
            {ganP2 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit text-white" style={{ background: grad }}>✓ Ganó</span>}
          </div>
        </div>
        {p.cancha && (
          <div className="px-4 pb-2 flex justify-center">
            <span className="text-[10px] font-semibold text-white px-3 py-0.5 rounded-full" style={{ background: grad }}>{canchaName(p.cancha)}</span>
          </div>
        )}
      </div>
    )
  }

  // ── Template 10: Mobile First ───────────────────────────────────────────────
  if (templateFixture === 10) {
    const green   = colorTextoScore || '#22C55E'
    const bg      = colorCard || '#18181B'
    const cNom    = colorTextoNombres || '#FAFAFA'
    const cSec    = '#71717A'
    const fmt     = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
    const notchClr = fin ? '#71717A' : '#22C55E'
    return (
      <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: bg, border: '1px solid #3F3F46' }}>
        <div style={{ height: 3, background: notchClr, width: '100%' }}/>
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: cSec }}>{p._zona}{p._cat ? ` · ${p._cat}` : ''}</span>
          <div className="flex items-center gap-2">
            {p.slot?.hora && <span className="text-[10px] font-bold" style={{ color: cSec }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px]" style={{ color: '#52525B' }}>{canchaName(p.cancha)}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #3F3F46' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            {ganP1 && <span className="text-[9px] shrink-0" style={{ color: green }}>●</span>}
            <span className="text-sm font-semibold truncate" style={{ color: ganP2 && fin ? '#52525B' : cNom }}>{fmt(p.pareja1)}</span>
          </div>
          {fin && <span className="text-sm font-bold tabular-nums ml-2 shrink-0 font-mono" style={{ color: ganP1 ? green : cSec }}>
            {p.resultado?.map((s) => s.p1).join('  ')}
          </span>}
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 pb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {ganP2 && <span className="text-[9px] shrink-0" style={{ color: green }}>●</span>}
            <span className="text-sm font-semibold truncate" style={{ color: ganP1 && fin ? '#52525B' : cNom }}>{fmt(p.pareja2)}</span>
          </div>
          {fin && <span className="text-sm font-bold tabular-nums ml-2 shrink-0 font-mono" style={{ color: ganP2 ? green : cSec }}>
            {p.resultado?.map((s) => s.p2).join('  ')}
          </span>}
          {!fin && <span className="text-[10px] ml-2 shrink-0" style={{ color: '#52525B' }}>vs</span>}
        </div>
      </div>
    )
  }

  // ── Template 11: Club Branding ───────────────────────────────────────────────
  if (templateFixture === 11) {
    const clubClr   = accentColor || '#10b981'
    const isClubDark= isColorDark(clubClr)
    const clubContrast = isClubDark ? '#ffffff' : '#111111'
    const bg        = colorCard || (isClubDark ? '#ffffff' : '#0d1117')
    const bgIsLight = !isColorDark(bg)
    const cNom      = colorTextoNombres || (bgIsLight ? '#111111' : '#ffffff')
    const cSec      = bgIsLight ? '#6b7280' : 'rgba(255,255,255,0.5)'
    const cBorder   = bgIsLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)'
    const fmt       = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: `1px solid ${cBorder}` }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: clubClr }}>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-[10px] tracking-[1.5px]" style={{ color: clubContrast }}>{p._zona}</span>
            {p._cat && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `rgba(0,0,0,0.15)`, color: clubContrast }}>{p._cat}</span>}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[11px] font-semibold" style={{ color: `${clubContrast}cc` }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px]" style={{ color: `${clubContrast}88` }}>{canchaName(p.cancha)}</span>}
            {fin && <CheckCircle size={12} style={{ color: clubContrast }}/>}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
          <div className={`flex items-center gap-2 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: ganP1 ? clubClr : cBorder, color: ganP1 ? clubContrast : cSec, border: `1px solid ${ganP1 ? clubClr : cBorder}` }}>
              {ganP1 ? '✓' : p._n1}
            </span>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-1">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-[10px] font-bold px-1 py-0.5 rounded"
                    style={{ background: s.p1 > s.p2 ? clubClr : `${cBorder}`, color: s.p1 > s.p2 ? clubContrast : cSec }}>
                    {s.p1}-{s.p2}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-black" style={{ color: clubClr }}>vs</span>
            )}
          </div>
          <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP1 && fin ? 'opacity-35' : ''}`}>
            <span className="text-sm font-semibold truncate text-right" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: ganP2 ? clubClr : cBorder, color: ganP2 ? clubContrast : cSec, border: `1px solid ${ganP2 ? clubClr : cBorder}` }}>
              {ganP2 ? '✓' : p._n2}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Template 12: Broadcast TV ───────────────────────────────────────────────
  if (templateFixture === 12) {
    const red   = '#E8002D'
    const bg    = colorCard || '#1A1A1A'
    const cNom  = colorTextoNombres || '#FFFFFF'
    const cSec  = '#AAAAAA'
    const fmtBC = (name) => {
      const pts = (name ?? '').trim().split(' ')
      if (pts.length < 2) return name?.toUpperCase() ?? '—'
      return `${pts[0][0].toUpperCase()}. ${pts.slice(1).join(' ').toUpperCase()}`
    }
    return (
      <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: bg }}>
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: colorTextoScore ? `${colorTextoScore}dd` : red }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white uppercase tracking-[2px]">{p._zona}</span>
            {p._cat && <span className="text-[9px] text-white/70 uppercase">{p._cat}</span>}
          </div>
          <div className="flex items-center gap-2">
            {p.slot?.hora && <span className="text-[10px] font-bold text-white">{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[9px] text-white/60">{canchaName(p.cancha)}</span>}
            {!fin && <span className="flex items-center gap-1 text-[9px] font-black text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>EN VIVO</span>}
            {fin  && <span className="text-[9px] font-black text-white">FINAL</span>}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center py-1.5" style={{ borderBottom: `1px solid ${colorTextoScore ? `${colorTextoScore}40` : red}` }}>
            <span className="text-sm font-bold flex-1 truncate" style={{ color: ganP2 && fin ? '#555' : cNom }}>
              {fmtBC(p.pareja1?.jugador1)} / {fmtBC(p.pareja1?.jugador2)}
            </span>
            {fin && (
              <div className="flex gap-1 ml-3 shrink-0">
                {p.resultado?.map((s, i) => (
                  <span key={i} className="text-[12px] font-black w-6 text-center rounded"
                    style={{ color: s.p1 > s.p2 ? '#fff' : '#555', background: s.p1 > s.p2 ? (colorTextoScore || red) : 'transparent' }}>
                    {s.p1}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center py-1.5">
            <span className="text-sm font-bold flex-1 truncate" style={{ color: ganP1 && fin ? '#555' : cNom }}>
              {fmtBC(p.pareja2?.jugador1)} / {fmtBC(p.pareja2?.jugador2)}
            </span>
            {fin && (
              <div className="flex gap-1 ml-3 shrink-0">
                {p.resultado?.map((s, i) => (
                  <span key={i} className="text-[12px] font-black w-6 text-center rounded"
                    style={{ color: s.p2 > s.p1 ? '#fff' : '#555', background: s.p2 > s.p1 ? (colorTextoScore || red) : 'transparent' }}>
                    {s.p2}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 3, background: colorTextoScore || red }}/>
      </div>
    )
  }

  // ── Template 13: Corporate Sponsor ──────────────────────────────────────────
  if (templateFixture === 13) {
    const blue  = colorTextoScore || '#2563EB'
    const bg    = colorCard || '#FFFFFF'
    const cNom  = colorTextoNombres || '#111827'
    const cSec  = '#6B7280'
    const sponsorLogo = torneo?.sponsorLogoFixture ?? null
    const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1F2937', borderBottom: `2px solid ${blue}` }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white uppercase tracking-[1.5px]">{p._zona}</span>
            {p._cat && <span className="text-[9px] font-semibold text-white/60 uppercase">{p._cat}</span>}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[11px] font-semibold text-white/80">{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px] text-white/50">{canchaName(p.cancha)}</span>}
            {fin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: blue }}>✓ FIN</span>}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
          <div className={`flex items-center gap-2 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
            <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: ganP1 ? blue : '#F3F4F6', color: ganP1 ? '#fff' : cSec }}>
              {ganP1 ? '✓' : p._n1}
            </span>
            <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            {fin && p.resultado?.length > 0 ? (
              <div className="flex gap-1">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ background: s.p1 > s.p2 ? blue : '#E5E7EB', color: s.p1 > s.p2 ? '#fff' : '#D1D5DB' }}>
                    {s.p1}-{s.p2}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-black" style={{ color: blue }}>vs</span>
            )}
          </div>
          <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP1 && fin ? 'opacity-35' : ''}`}>
            <span className="text-sm font-semibold truncate text-right" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
            <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: ganP2 ? blue : '#F3F4F6', color: ganP2 ? '#fff' : cSec }}>
              {ganP2 ? '✓' : p._n2}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-2" style={{ borderTop: '1px solid #F3F4F6', background: '#F9FAFB' }}>
          <span className="text-[8px] uppercase tracking-[2px] text-gray-400">Presentado por</span>
          {sponsorLogo
            ? <img src={sponsorLogo} alt="Sponsor" className="h-5 object-contain max-w-[100px]" />
            : <div className="h-4 w-16 rounded" style={{ background: '#E5E7EB' }}/>
          }
        </div>
      </div>
    )
  }

  // ── Template 14: Championship ────────────────────────────────────────────────
  if (templateFixture === 14) {
    const amber = colorTextoScore || '#F59E0B'
    const bg    = colorCard || '#0F172A'
    const cNom  = colorTextoNombres || '#F8FAFC'
    const cSec  = '#94A3B8'
    const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
    const p1clr = '#3B82F6'
    const p2clr = '#EF4444'
    return (
      <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #1E293B', boxShadow: `0 0 40px rgba(245,158,11,0.08)` }}>
        <div className="flex items-center justify-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid #1E293B` }}>
          <span style={{ color: amber, fontSize: 13 }}>★</span>
          <span className="text-[11px] font-black uppercase tracking-[3px]" style={{ color: amber }}>
            {p._zona}{p._cat ? ` · ${p._cat}` : ''}
          </span>
          <span style={{ color: amber, fontSize: 13 }}>★</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 gap-4">
          <div className={`flex flex-col gap-1.5 min-w-0 ${ganP2 && fin ? 'opacity-30' : ''}`}
            style={ganP1 ? { borderLeft: `3px solid ${p1clr}`, paddingLeft: 10 } : {}}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: p1clr }}>Pareja {p._n1}</span>
            <span className="text-base font-bold leading-tight" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
            {ganP1 && <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: amber }}>✓ Campeón</span>}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <Trophy size={18} style={{ color: amber, opacity: fin ? 1 : 0.3 }}/>
            {fin && p.resultado?.length > 0 ? (
              <div className="flex flex-col items-center gap-0.5">
                {p.resultado.map((s, i) => (
                  <span key={i} className="text-[13px] font-black tabular-nums" style={{ color: amber }}>{s.p1}-{s.p2}</span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: '#1E293B' }}>vs</span>
            )}
            <div className="flex gap-1">
              {[p1clr, p2clr].map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }}/>)}
            </div>
          </div>
          <div className={`flex flex-col gap-1.5 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-30' : ''}`}
            style={ganP2 ? { borderRight: `3px solid ${p2clr}`, paddingRight: 10 } : {}}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: p2clr }}>Pareja {p._n2}</span>
            <span className="text-base font-bold leading-tight" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
            {ganP2 && <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: amber }}>✓ Campeón</span>}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-2" style={{ borderTop: '1px solid #1E293B' }}>
          {p.slot?.hora && <span className="text-[10px]" style={{ color: cSec }}>{p.slot.hora}</span>}
          {p.cancha     && <span className="text-[10px]" style={{ color: cSec }}>· {canchaName(p.cancha)}</span>}
        </div>
      </div>
    )
  }

  // ── Template 1: Estándar (diseño original) ──────────────────────────────────
  const catClr = colorTextoCategoria || catColorMap[p._cat]
  return (
    <div key={p.id} className={cardStyle_(fin)} style={cardBg}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${st.hdrBorder}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: clrZona }}>
            {p._zona}
          </span>
          {p._cat && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${catClr}22`, color: catClr, border: `1px solid ${catClr}40` }}>
              {p._cat}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {p.slot?.hora && <span className={st.hora} style={{ color: clrHora }}>{p.slot.hora} hs</span>}
          {p.cancha     && <span className={st.cancha} style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
          {fin          && <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle size={9} /> Finalizado</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${ganP1 ? st.nameW : ganP2 ? st.nameL : st.nameN}`}
          style={nStyle(ganP1, ganP2 && fin)}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : fin ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n1}</span>
          <span className={`text-sm truncate ${ganP2 && fin ? 'line-through' : ''}`}>
            {p.pareja1 ? `${p.pareja1.jugador1.split(' ')[0]} / ${p.pareja1.jugador2.split(' ')[0]}` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {fin && p.resultado?.length > 0 ? (
            p.resultado.map((s, i) => (
              <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${s.p1 > s.p2 ? st.chipW : st.chipL}`}
                style={colorTextoScore ? { color: s.p1 > s.p2 ? clrScoreW : clrScoreL, backgroundColor: s.p1 > s.p2 ? `${clrScoreW}18` : undefined, borderColor: s.p1 > s.p2 ? `${clrScoreW}40` : undefined } : {}}>
                {s.p1}-{s.p2}
              </span>
            ))
          ) : (
            <span className={`text-xs px-2 font-bold ${st.vs}`} style={colorTextoScore ? { color: clrScoreL } : {}}>vs</span>
          )}
        </div>
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${ganP2 ? st.nameW : ganP1 ? st.nameL : st.nameN}`}
          style={nStyle(ganP2, ganP1 && fin)}>
          <span className={`text-sm truncate text-right ${ganP1 && fin ? 'line-through' : ''}`}>
            {p.pareja2 ? `${p.pareja2.jugador1.split(' ')[0]} / ${p.pareja2.jugador2.split(' ')[0]}` : '—'}
          </span>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : fin ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n2}</span>
        </div>
      </div>
    </div>
  )
}

// ── Tab Fixture del día ───────────────────────────────────────────────────────

const TabFixture = ({ torneo, canchaName, accentColor, imagenFondo = null, cardStyle = 'oscura', colorCard = null, templateFixture = 1,
  colorTextoNombres = null, colorTextoZona = null, colorTextoCategoria = null, colorTextoScore = null, colorTextoInfo = null,
}) => {
  const effectiveStyle = colorCard ? (isColorDark(colorCard) ? 'oscura' : 'clara') : cardStyle
  const isClara = effectiveStyle === 'clara'
  const st = {
    card:      isClara ? 'border-gray-200 bg-white'        : 'border-white/8 bg-white/3',
    cardFin:   isClara ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/15 bg-emerald-500/3',
    hdrBorder: isClara ? 'border-gray-100'                 : 'border-white/5',
    hora:      isClara ? 'text-xs font-bold text-gray-700' : 'text-xs font-bold text-white/70',
    cancha:    isClara ? 'text-[10px] text-gray-400'       : 'text-[10px] text-white/30',
    nameW:     isClara ? 'text-gray-900 font-semibold'     : 'text-white font-semibold',
    nameL:     isClara ? 'text-gray-300'                   : 'text-white/25',
    nameN:     isClara ? 'text-gray-600'                   : 'text-white/70',
    seedBg:    isClara ? 'bg-gray-100 text-gray-500'       : 'bg-white/8 text-white/40',
    chipW:     isClara ? 'text-emerald-600 bg-emerald-50 border-emerald-200'   : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    chipL:     isClara ? 'text-gray-400 bg-gray-100 border-gray-200'           : 'text-white/25 bg-white/5 border-white/8',
    vs:        isClara ? 'text-gray-300'                   : 'text-white/20',
  }
  const cardStyle_ = (fin) => `rounded-2xl border overflow-hidden ${fin ? st.cardFin : st.card}`
  const cardBg     = colorCard ? { backgroundColor: colorCard } : undefined

  // Colores resueltos: override manual > contraste automático
  const clrZona    = colorTextoZona     || accentColor
  const clrScoreW  = colorTextoScore    || accentColor
  const clrScoreL  = colorTextoScore
    ? `${colorTextoScore}35`
    : isClara ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
  const clrInfo    = colorTextoInfo     || (isClara ? '#6b7280' : 'rgba(255,255,255,0.3)')
  const clrHora    = colorTextoInfo     || (isClara ? '#374151' : 'rgba(255,255,255,0.7)')
  // Nombres: null = usar clases st para no romper la cadena de ganador/perdedor
  const nStyle = (isWinner, isLoser) => {
    if (!colorTextoNombres) return {}
    const base = colorTextoNombres
    if (isWinner) return { color: base }
    if (isLoser)  return { color: `${base}35` }
    return { color: `${base}90` }
  }

  // ── Render partido card según template ───────────────────────────────────────
  const renderPartidoCard = (p) => {
    const fin  = p.estado === 'finalizado'
    const ganP1 = p.ganador?.id === p.pareja1?.id
    const ganP2 = p.ganador?.id === p.pareja2?.id

    // ── Template 2: Premier Padel Style ──────────────────────────────────────
    if (templateFixture === 2) {
      // nombre = primera palabra, apellido = resto uppercase (convención argentina: Nombre Apellido)
      const sn = (full) => {
        const parts = (full ?? '').trim().split(' ')
        if (parts.length === 1) return { ap: parts[0].toUpperCase(), nm: '' }
        const nm = parts[0]
        const ap = parts.slice(1).join(' ').toUpperCase()
        return { ap, nm }
      }
      const p1j1 = sn(p.pareja1?.jugador1), p1j2 = sn(p.pareja1?.jugador2)
      const p2j1 = sn(p.pareja2?.jugador1), p2j2 = sn(p.pareja2?.jugador2)
      const sideOp = (ganThis) => fin ? (ganThis ? 'opacity-100' : 'opacity-30') : 'opacity-100'

      const cardBackground = colorCard || '#000'
      // Auto-contraste para Template 2
      const t2IsClara  = colorCard ? !isColorDark(colorCard) : false
      const t2NombreW  = colorTextoNombres   || (t2IsClara ? '#111827' : '#ffffff')
      const t2NombreM  = colorTextoNombres   ? `${colorTextoNombres}70` : (t2IsClara ? '#374151' : 'rgba(255,255,255,0.5)')
      const t2NombreS  = colorTextoNombres   ? `${colorTextoNombres}50` : (t2IsClara ? '#6b7280' : 'rgba(255,255,255,0.3)')
      const t2NombreXS = colorTextoNombres   ? `${colorTextoNombres}40` : (t2IsClara ? '#9ca3af' : 'rgba(255,255,255,0.2)')
      const t2Seed     = t2IsClara ? 'text-gray-500 bg-black/8' : 'text-white/30 bg-white/6'
      const t2Border   = fin ? `1px solid ${accentColor}35` : (t2IsClara ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.08)')
      return (
        <div key={p.id} className="relative rounded-2xl overflow-hidden"
          style={{ background: cardBackground, border: t2Border }}>

          {/* Court horizontal lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)`,
            backgroundSize: '100% 38px',
          }} />

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ backgroundColor: accentColor, opacity: fin ? 1 : 0.4 }} />

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: clrZona }}>{p._zona}</span>
              {p._cat && (
                colorTextoCategoria
                  ? <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colorTextoCategoria }}>· {p._cat}</span>
                  : <span className="text-[9px] text-white/20 uppercase tracking-widest">· {p._cat}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px] font-bold font-mono" style={{ color: clrHora }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px]" style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
              {fin && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle size={9}/>FIN</span>}
            </div>
          </div>

          {/* Body — 3 columnas */}
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 py-4 gap-3">

            {/* P1 — izquierda */}
            <div className={`flex flex-col gap-1.5 transition-opacity ${sideOp(ganP1)}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${t2Seed}`}>{p._n1 ?? '?'}</span>
                {ganP1 && <span className="text-[9px] font-black text-emerald-500">✓ Ganó</span>}
              </div>
              <div>
                <p className="font-black uppercase leading-none"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                  {p1j1.ap || '—'}
                </p>
                {p1j1.nm && <p className="text-[10px] mt-0.5" style={{ color: t2NombreS }}>{p1j1.nm}</p>}
              </div>
              <div>
                <p className="font-bold uppercase leading-none"
                  style={{ fontSize: 'clamp(10px,1.8vw,16px)', color: t2NombreM, letterSpacing: '-0.01em' }}>
                  {p1j2.ap || '—'}
                </p>
                {p1j2.nm && <p className="text-[9px]" style={{ color: t2NombreXS }}>{p1j2.nm}</p>}
              </div>
            </div>

            {/* Centro — score */}
            <div className="flex flex-col items-center min-w-[68px] md:min-w-[88px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-2 md:gap-3 items-start">
                  {p.resultado.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span className="font-black font-mono tabular-nums leading-none"
                        style={{ fontSize: 'clamp(16px,3vw,26px)', color: s.p1 > s.p2 ? clrScoreW : clrScoreL }}>{s.p1}</span>
                      <span className="font-black font-mono tabular-nums leading-none"
                        style={{ fontSize: 'clamp(16px,3vw,26px)', color: s.p2 > s.p1 ? clrScoreW : clrScoreL }}>{s.p2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="font-black tracking-widest" style={{ fontSize: 'clamp(14px,2.5vw,22px)', color: clrScoreL }}>VS</span>
              )}
            </div>

            {/* P2 — derecha */}
            <div className={`flex flex-col gap-1.5 items-end text-right transition-opacity ${sideOp(ganP2)}`}>
              <div className="flex items-center gap-1.5 justify-end">
                {ganP2 && <span className="text-[9px] font-black text-emerald-500">✓ Ganó</span>}
                <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${t2Seed}`}>{p._n2 ?? '?'}</span>
              </div>
              <div>
                <p className="font-black uppercase leading-none"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                  {p2j1.ap || '—'}
                </p>
                {p2j1.nm && <p className="text-[10px] mt-0.5 text-right" style={{ color: t2NombreS }}>{p2j1.nm}</p>}
              </div>
              <div>
                <p className="font-bold uppercase leading-none"
                  style={{ fontSize: 'clamp(10px,1.8vw,16px)', color: t2NombreM, letterSpacing: '-0.01em' }}>
                  {p2j2.ap || '—'}
                </p>
                {p2j2.nm && <p className="text-[9px] text-right" style={{ color: t2NombreXS }}>{p2j2.nm}</p>}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── Template 3: Pro Tournament ────────────────────────────────────────────
    if (templateFixture === 3) {
      const navy = '#1A1A2E'
      const nombres = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${colorTextoNombres || navy}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: colorCard || navy }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: clrZona === accentColor ? '#fff' : clrZona }}>{p._zona}</span>
              {p._cat && <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{p._cat}</span>}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px] font-semibold text-white/70">{p.slot.hora} hs</span>}
              {p.cancha     && <span className="text-[10px] text-white/50">{canchaName(p.cancha)}</span>}
              {fin && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><CheckCircle size={9}/>Fin</span>}
            </div>
          </div>
          {/* Body — 3 columnas */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
            {/* P1 */}
            <div className={`flex items-center gap-2 min-w-0 ${ganP1 ? 'opacity-100' : ganP2 && fin ? 'opacity-40' : 'opacity-100'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : 'text-gray-500 bg-gray-100'}`}>{ganP1 ? <CheckCircle size={10}/> : p._n1}</span>
              <span className={`text-sm font-semibold truncate ${ganP2 && fin ? 'line-through text-gray-300' : 'text-gray-900'}`} style={colorTextoNombres ? { color: colorTextoNombres } : {}}>{nombres(p.pareja1)}</span>
            </div>
            {/* Score center */}
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-1">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: s.p1 > s.p2 ? `${clrScoreW}20` : '#F3F4F6', color: s.p1 > s.p2 ? clrScoreW : '#9CA3AF', border: `1px solid ${s.p1 > s.p2 ? `${clrScoreW}30` : '#E5E7EB'}` }}>
                      {s.p1}-{s.p2}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-black" style={{ color: clrScoreL || '#D1D5DB' }}>vs</span>
              )}
            </div>
            {/* P2 */}
            <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP2 ? 'opacity-100' : ganP1 && fin ? 'opacity-40' : 'opacity-100'}`}>
              <span className={`text-sm font-semibold truncate text-right ${ganP1 && fin ? 'line-through text-gray-300' : 'text-gray-900'}`} style={colorTextoNombres ? { color: colorTextoNombres } : {}}>{nombres(p.pareja2)}</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : 'text-gray-500 bg-gray-100'}`}>{ganP2 ? <CheckCircle size={10}/> : p._n2}</span>
            </div>
          </div>
        </div>
      )
    }

    // ── Template 6: High Contrast ─────────────────────────────────────────────
    if (templateFixture === 6) {
      const fmt = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
      const estado = fin ? 'FINALIZADO' : 'PENDIENTE'
      const estadoBg = fin ? '#000000' : '#767676'
      return (
        <div key={p.id} style={{ background: colorCard || '#FFFFFF', border: '2px solid #000000', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#000000' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-white" style={{ fontSize: 11, letterSpacing: '1.5px' }}>{p._zona}</span>
              {p._cat && <span className="font-semibold text-white/70 uppercase" style={{ fontSize: 10 }}>{p._cat}</span>}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="font-bold text-white" style={{ fontSize: 12 }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-white/70" style={{ fontSize: 11 }}>{canchaName(p.cancha)}</span>}
              <span className="font-black text-white uppercase px-2 py-0.5 rounded" style={{ fontSize: 9, letterSpacing: '1px', backgroundColor: estadoBg }}>{estado}</span>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: '12px 16px' }}>
            {/* P1 */}
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '2px solid #000000' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 flex items-center justify-center font-black rounded shrink-0"
                  style={{ fontSize: 11, backgroundColor: ganP1 ? '#000000' : '#EEEEEE', color: ganP1 ? '#FFFFFF' : '#000000', border: '1px solid #000000' }}>
                  {ganP1 ? '✓' : p._n1}
                </span>
                <span className="font-bold truncate" style={{ fontSize: 14, color: colorTextoNombres || (ganP2 && fin ? '#AAAAAA' : '#000000'), textDecoration: ganP2 && fin ? 'line-through' : 'none' }}>{fmt(p.pareja1)}</span>
              </div>
              {fin && <span className="font-black ml-3 shrink-0" style={{ fontSize: 14, color: '#000000' }}>
                {p.resultado?.map((s) => s.p1).join(' ')}
              </span>}
            </div>
            {/* P2 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 flex items-center justify-center font-black rounded shrink-0"
                  style={{ fontSize: 11, backgroundColor: ganP2 ? '#000000' : '#EEEEEE', color: ganP2 ? '#FFFFFF' : '#000000', border: '1px solid #000000' }}>
                  {ganP2 ? '✓' : p._n2}
                </span>
                <span className="font-bold truncate" style={{ fontSize: 14, color: colorTextoNombres || (ganP1 && fin ? '#AAAAAA' : '#000000'), textDecoration: ganP1 && fin ? 'line-through' : 'none' }}>{fmt(p.pareja2)}</span>
              </div>
              {fin && <span className="font-black ml-3 shrink-0" style={{ fontSize: 14, color: '#000000' }}>
                {p.resultado?.map((s) => s.p2).join(' ')}
              </span>}
            </div>
          </div>
        </div>
      )
    }

    // ── Template 7: Dark Premium ──────────────────────────────────────────────
    if (templateFixture === 7) {
      const gold  = '#D4AF37'
      const bg    = colorCard || '#111111'
      const cNom  = colorTextoNombres || '#F5F5F5'
      const cSec  = '#888888'
      const cScore= colorTextoScore || gold
      const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #2A2A2A', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1.5px solid ${gold}` }}>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-[10px] tracking-widest" style={{ color: clrZona === accentColor ? gold : clrZona }}>{p._zona}</span>
              {p._cat && <span className="text-[9px] uppercase tracking-wider" style={{ color: cSec }}>{p._cat}</span>}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px]" style={{ color: cSec }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px]" style={{ color: '#555' }}>{canchaName(p.cancha)}</span>}
              {fin && <span className="text-[9px] font-bold" style={{ color: gold }}>✓ FIN</span>}
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 gap-3" style={{ background: '#181818' }}>
            {/* P1 */}
            <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}
              style={ganP1 ? { borderLeft: `3px solid ${gold}`, paddingLeft: 10, background: `rgba(212,175,55,0.06)`, borderRadius: 4 } : {}}>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
              {ganP1 && <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: gold }}>Ganador</span>}
            </div>
            {/* VS + Score center */}
            <div className="flex flex-col items-center gap-2 min-w-[72px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-1.5">
                  {p.resultado.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: s.p1 > s.p2 ? cScore : '#444' }}>{s.p1}</span>
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: s.p2 > s.p1 ? cScore : '#444' }}>{s.p2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* X diagonal divisor */
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute w-full h-px rotate-45" style={{ backgroundColor: gold, opacity: 0.6 }}/>
                  <div className="absolute w-full h-px -rotate-45" style={{ backgroundColor: gold, opacity: 0.6 }}/>
                  <span className="text-[9px] font-black z-10 bg-[#181818] px-0.5" style={{ color: gold }}>vs</span>
                </div>
              )}
            </div>
            {/* P2 */}
            <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-35' : ''}`}
              style={ganP2 ? { borderRight: `3px solid ${gold}`, paddingRight: 10, background: `rgba(212,175,55,0.06)`, borderRadius: 4 } : {}}>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
              {ganP2 && <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: gold }}>Ganador</span>}
            </div>
          </div>
        </div>
      )
    }

    // ── Template 8: Luxury Gold ───────────────────────────────────────────────
    if (templateFixture === 8) {
      const gold    = colorTextoScore || '#C9A84C'
      const goldDk  = '#8B6914'
      const bg      = colorCard || '#0D0B08'
      const cCrm    = colorTextoNombres || '#F5ECD7'
      const cSec    = '#A8956A'
      const fmt     = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden relative"
          style={{ background: bg, boxShadow: `0 0 0 1.5px transparent, 0 0 0 1.5px ${goldDk}`, border: `1.5px solid ${goldDk}` }}>
          {/* Corner ornaments */}
          {[['top-0 left-0','border-t border-l'],['top-0 right-0','border-t border-r'],['bottom-0 left-0','border-b border-l'],['bottom-0 right-0','border-b border-r']].map(([pos, cls], i) => (
            <span key={i} className={`absolute w-3 h-3 ${pos} ${cls}`} style={{ borderColor: gold, opacity: 0.6 }}/>
          ))}
          {/* Header con doble filete */}
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${goldDk}`, borderTop: `1px solid ${goldDk}`, marginTop: 4 }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-[3px] text-[9px]" style={{ color: gold }}>{p._zona}</span>
              <div className="flex items-center gap-3">
                {p.slot?.hora && <span className="text-[11px]" style={{ color: cSec }}>{p.slot.hora}</span>}
                {p.cancha     && <span className="text-[10px]" style={{ color: '#5a4820' }}>{canchaName(p.cancha)}</span>}
              </div>
            </div>
            {p._cat && <div className="text-[11px] italic mt-0.5" style={{ color: cSec, fontFamily: 'Georgia, serif' }}>{p._cat}</div>}
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 gap-4">
            <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-30' : ''}`}>
              {ganP1 && <span style={{ color: gold }}>✦</span>}
              <span className="text-sm font-semibold" style={{ color: cCrm, fontFamily: 'Georgia, serif' }}>{fmt(p.pareja1)}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-2">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-sm font-bold tabular-nums"
                      style={{ color: s.p1 > s.p2 ? gold : '#3a2e15', letterSpacing: 2 }}>{s.p1}-{s.p2}</span>
                  ))}
                </div>
              ) : (
                <span className="text-xs tracking-[6px] font-light" style={{ color: cSec }}>✦  ✦</span>
              )}
            </div>
            <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-30' : ''}`}>
              {ganP2 && <span className="text-right" style={{ color: gold }}>✦</span>}
              <span className="text-sm font-semibold" style={{ color: cCrm, fontFamily: 'Georgia, serif' }}>{fmt(p.pareja2)}</span>
            </div>
          </div>
        </div>
      )
    }

    // ── Template 9: Modern Gradient ───────────────────────────────────────────
    if (templateFixture === 9) {
      const gradColors = colorCard
        ? [colorCard, colorCard]
        : ['#667eea', '#764ba2']
      const grad  = `linear-gradient(135deg, ${gradColors[0]} 0%, ${gradColors[1]} 100%)`
      const cNom  = colorTextoNombres || '#1F2937'
      const cSec  = '#6B7280'
      const cScore= colorTextoScore || gradColors[0]
      const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {/* Header gradient con wave cut */}
          <div className="relative px-4 pt-3 pb-6" style={{ background: grad }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[2px] text-white/75">{p._zona}</span>
                {p._cat && <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>{p._cat}</span>}
              </div>
              <div className="flex items-center gap-2">
                {p.slot?.hora && (
                  <span className="text-white font-bold text-[11px] flex items-center justify-center w-12 h-5 rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }}>{p.slot.hora}</span>
                )}
                {fin && <span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full">FIN</span>}
              </div>
            </div>
            {/* Wave cut */}
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-white" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}/>
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3 -mt-1">
            <div className={`flex flex-col gap-1 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
              {ganP1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit text-white" style={{ background: grad }}>✓ Ganó</span>}
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[68px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-1">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: s.p1 > s.p2 ? grad : '#F3F4F6', color: s.p1 > s.p2 ? 'white' : '#D1D5DB' }}>
                      {s.p1}-{s.p2}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-black" style={{ color: '#D1D5DB' }}>vs</span>
              )}
            </div>
            <div className={`flex flex-col gap-1 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-35' : ''}`}>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
              {ganP2 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit text-white" style={{ background: grad }}>✓ Ganó</span>}
            </div>
          </div>
          {/* Cancha footer */}
          {p.cancha && (
            <div className="px-4 pb-2 flex justify-center">
              <span className="text-[10px] font-semibold text-white px-3 py-0.5 rounded-full" style={{ background: grad }}>{canchaName(p.cancha)}</span>
            </div>
          )}
        </div>
      )
    }

    // ── Template 10: Mobile First ─────────────────────────────────────────────
    if (templateFixture === 10) {
      const green   = colorTextoScore || '#22C55E'
      const bg      = colorCard || '#18181B'
      const cNom    = colorTextoNombres || '#FAFAFA'
      const cSec    = '#71717A'
      const fmt     = (par) => par ? `${par.jugador1.split(' ')[0].toUpperCase()} / ${par.jugador2.split(' ')[0].toUpperCase()}` : '—'
      const notchClr = fin ? '#71717A' : '#22C55E'
      return (
        <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: bg, border: '1px solid #3F3F46' }}>
          {/* Notch state indicator */}
          <div style={{ height: 3, background: notchClr, width: '100%' }}/>
          {/* Meta */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: cSec }}>{p._zona}{p._cat ? ` · ${p._cat}` : ''}</span>
            <div className="flex items-center gap-2">
              {p.slot?.hora && <span className="text-[10px] font-bold" style={{ color: cSec }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px]" style={{ color: '#52525B' }}>{canchaName(p.cancha)}</span>}
            </div>
          </div>
          {/* P1 */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #3F3F46' }}>
            <div className="flex items-center gap-1.5 min-w-0">
              {ganP1 && <span className="text-[9px] shrink-0" style={{ color: green }}>●</span>}
              <span className="text-sm font-semibold truncate" style={{ color: ganP2 && fin ? '#52525B' : cNom }}>{fmt(p.pareja1)}</span>
            </div>
            {fin && <span className="text-sm font-bold tabular-nums ml-2 shrink-0 font-mono" style={{ color: ganP1 ? green : cSec }}>
              {p.resultado?.map((s) => s.p1).join('  ')}
            </span>}
          </div>
          {/* P2 */}
          <div className="flex items-center justify-between px-3 py-1.5 pb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {ganP2 && <span className="text-[9px] shrink-0" style={{ color: green }}>●</span>}
              <span className="text-sm font-semibold truncate" style={{ color: ganP1 && fin ? '#52525B' : cNom }}>{fmt(p.pareja2)}</span>
            </div>
            {fin && <span className="text-sm font-bold tabular-nums ml-2 shrink-0 font-mono" style={{ color: ganP2 ? green : cSec }}>
              {p.resultado?.map((s) => s.p2).join('  ')}
            </span>}
            {!fin && <span className="text-[10px] ml-2 shrink-0" style={{ color: '#52525B' }}>vs</span>}
          </div>
        </div>
      )
    }

    // ── Template 11: Club Branding ─────────────────────────────────────────────
    if (templateFixture === 11) {
      const clubClr   = accentColor || '#10b981'
      const isClubDark= isColorDark(clubClr)
      const clubContrast = isClubDark ? '#ffffff' : '#111111'
      const bg        = colorCard || (isClubDark ? '#ffffff' : '#0d1117')
      const bgIsLight = !isColorDark(bg)
      const cNom      = colorTextoNombres || (bgIsLight ? '#111111' : '#ffffff')
      const cSec      = bgIsLight ? '#6b7280' : 'rgba(255,255,255,0.5)'
      const cBorder   = bgIsLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)'
      const fmt       = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: `1px solid ${cBorder}` }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: clubClr }}>
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-[10px] tracking-[1.5px]" style={{ color: clubContrast }}>{p._zona}</span>
              {p._cat && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `rgba(0,0,0,0.15)`, color: clubContrast }}>{p._cat}</span>}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px] font-semibold" style={{ color: `${clubContrast}cc` }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px]" style={{ color: `${clubContrast}88` }}>{canchaName(p.cancha)}</span>}
              {fin && <CheckCircle size={12} style={{ color: clubContrast }}/>}
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
            <div className={`flex items-center gap-2 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: ganP1 ? clubClr : cBorder, color: ganP1 ? clubContrast : cSec, border: `1px solid ${ganP1 ? clubClr : cBorder}` }}>
                {ganP1 ? '✓' : p._n1}
              </span>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-1">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-1 py-0.5 rounded"
                      style={{ background: s.p1 > s.p2 ? clubClr : `${cBorder}`, color: s.p1 > s.p2 ? clubContrast : cSec }}>
                      {s.p1}-{s.p2}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-black" style={{ color: clubClr }}>vs</span>
              )}
            </div>
            <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP1 && fin ? 'opacity-35' : ''}`}>
              <span className="text-sm font-semibold truncate text-right" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: ganP2 ? clubClr : cBorder, color: ganP2 ? clubContrast : cSec, border: `1px solid ${ganP2 ? clubClr : cBorder}` }}>
                {ganP2 ? '✓' : p._n2}
              </span>
            </div>
          </div>
        </div>
      )
    }

    // ── Template 12: Broadcast TV ─────────────────────────────────────────────
    if (templateFixture === 12) {
      const red   = '#E8002D'
      const bg    = colorCard || '#1A1A1A'
      const cNom  = colorTextoNombres || '#FFFFFF'
      const cSec  = '#AAAAAA'
      const fmtBC = (name) => {
        const pts = (name ?? '').trim().split(' ')
        if (pts.length < 2) return name?.toUpperCase() ?? '—'
        return `${pts[0][0].toUpperCase()}. ${pts.slice(1).join(' ').toUpperCase()}`
      }
      return (
        <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: bg }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: colorTextoScore ? `${colorTextoScore}dd` : red }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white uppercase tracking-[2px]">{p._zona}</span>
              {p._cat && <span className="text-[9px] text-white/70 uppercase">{p._cat}</span>}
            </div>
            <div className="flex items-center gap-2">
              {p.slot?.hora && <span className="text-[10px] font-bold text-white">{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[9px] text-white/60">{canchaName(p.cancha)}</span>}
              {!fin && <span className="flex items-center gap-1 text-[9px] font-black text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>EN VIVO</span>}
              {fin  && <span className="text-[9px] font-black text-white">FINAL</span>}
            </div>
          </div>
          {/* Tabular body */}
          <div className="px-3 py-2">
            {/* P1 */}
            <div className="flex items-center py-1.5" style={{ borderBottom: `1px solid ${colorTextoScore ? `${colorTextoScore}40` : red}` }}>
              <span className="text-sm font-bold flex-1 truncate" style={{ color: ganP2 && fin ? '#555' : cNom }}>
                {fmtBC(p.pareja1?.jugador1)} / {fmtBC(p.pareja1?.jugador2)}
              </span>
              {fin && (
                <div className="flex gap-1 ml-3 shrink-0">
                  {p.resultado?.map((s, i) => (
                    <span key={i} className="text-[12px] font-black w-6 text-center rounded"
                      style={{ color: s.p1 > s.p2 ? '#fff' : '#555', background: s.p1 > s.p2 ? (colorTextoScore || red) : 'transparent' }}>
                      {s.p1}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* P2 */}
            <div className="flex items-center py-1.5">
              <span className="text-sm font-bold flex-1 truncate" style={{ color: ganP1 && fin ? '#555' : cNom }}>
                {fmtBC(p.pareja2?.jugador1)} / {fmtBC(p.pareja2?.jugador2)}
              </span>
              {fin && (
                <div className="flex gap-1 ml-3 shrink-0">
                  {p.resultado?.map((s, i) => (
                    <span key={i} className="text-[12px] font-black w-6 text-center rounded"
                      style={{ color: s.p2 > s.p1 ? '#fff' : '#555', background: s.p2 > s.p1 ? (colorTextoScore || red) : 'transparent' }}>
                      {s.p2}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Accent base line */}
          <div style={{ height: 3, background: colorTextoScore || red }}/>
        </div>
      )
    }

    // ── Template 13: Corporate Sponsor ────────────────────────────────────────
    if (templateFixture === 13) {
      const blue  = colorTextoScore || '#2563EB'
      const bg    = colorCard || '#FFFFFF'
      const cNom  = colorTextoNombres || '#111827'
      const cSec  = '#6B7280'
      const sponsorLogo = torneo?.sponsorLogoFixture ?? null
      const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1F2937', borderBottom: `2px solid ${blue}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-[1.5px]">{p._zona}</span>
              {p._cat && <span className="text-[9px] font-semibold text-white/60 uppercase">{p._cat}</span>}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[11px] font-semibold text-white/80">{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[10px] text-white/50">{canchaName(p.cancha)}</span>}
              {fin && <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: blue }}>✓ FIN</span>}
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 gap-3">
            <div className={`flex items-center gap-2 min-w-0 ${ganP2 && fin ? 'opacity-35' : ''}`}>
              <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: ganP1 ? blue : '#F3F4F6', color: ganP1 ? '#fff' : cSec }}>
                {ganP1 ? '✓' : p._n1}
              </span>
              <span className="text-sm font-semibold truncate" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              {fin && p.resultado?.length > 0 ? (
                <div className="flex gap-1">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ background: s.p1 > s.p2 ? blue : '#E5E7EB', color: s.p1 > s.p2 ? '#fff' : '#D1D5DB' }}>
                      {s.p1}-{s.p2}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-black" style={{ color: blue }}>vs</span>
              )}
            </div>
            <div className={`flex items-center gap-2 min-w-0 justify-end ${ganP1 && fin ? 'opacity-35' : ''}`}>
              <span className="text-sm font-semibold truncate text-right" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
              <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: ganP2 ? blue : '#F3F4F6', color: ganP2 ? '#fff' : cSec }}>
                {ganP2 ? '✓' : p._n2}
              </span>
            </div>
          </div>
          {/* Sponsor footer */}
          <div className="flex items-center justify-center gap-2 px-4 py-2" style={{ borderTop: '1px solid #F3F4F6', background: '#F9FAFB' }}>
            <span className="text-[8px] uppercase tracking-[2px] text-gray-400">Presentado por</span>
            {sponsorLogo
              ? <img src={sponsorLogo} alt="Sponsor" className="h-5 object-contain max-w-[100px]" />
              : <div className="h-4 w-16 rounded" style={{ background: '#E5E7EB' }}/>
            }
          </div>
        </div>
      )
    }

    // ── Template 14: Championship ─────────────────────────────────────────────
    if (templateFixture === 14) {
      const amber = colorTextoScore || '#F59E0B'
      const bg    = colorCard || '#0F172A'
      const cNom  = colorTextoNombres || '#F8FAFC'
      const cSec  = '#94A3B8'
      const fmt   = (par) => par ? `${par.jugador1.split(' ')[0]} / ${par.jugador2.split(' ')[0]}` : '—'
      const p1clr = '#3B82F6'
      const p2clr = '#EF4444'
      return (
        <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: bg, border: '1px solid #1E293B', boxShadow: `0 0 40px rgba(245,158,11,0.08)` }}>
          {/* Header */}
          <div className="flex items-center justify-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid #1E293B` }}>
            <span style={{ color: amber, fontSize: 13 }}>★</span>
            <span className="text-[11px] font-black uppercase tracking-[3px]" style={{ color: amber }}>
              {p._zona}{p._cat ? ` · ${p._cat}` : ''}
            </span>
            <span style={{ color: amber, fontSize: 13 }}>★</span>
          </div>
          {/* Body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 gap-4">
            {/* P1 — blue */}
            <div className={`flex flex-col gap-1.5 min-w-0 ${ganP2 && fin ? 'opacity-30' : ''}`}
              style={ganP1 ? { borderLeft: `3px solid ${p1clr}`, paddingLeft: 10 } : {}}>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: p1clr }}>Pareja {p._n1}</span>
              <span className="text-base font-bold leading-tight" style={{ color: cNom }}>{fmt(p.pareja1)}</span>
              {ganP1 && <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: amber }}>✓ Campeón</span>}
            </div>
            {/* Center */}
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              <Trophy size={18} style={{ color: amber, opacity: fin ? 1 : 0.3 }}/>
              {fin && p.resultado?.length > 0 ? (
                <div className="flex flex-col items-center gap-0.5">
                  {p.resultado.map((s, i) => (
                    <span key={i} className="text-[13px] font-black tabular-nums" style={{ color: amber }}>{s.p1}-{s.p2}</span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: '#1E293B' }}>vs</span>
              )}
              <div className="flex gap-1">
                {[p1clr, p2clr].map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }}/>)}
              </div>
            </div>
            {/* P2 — red */}
            <div className={`flex flex-col gap-1.5 min-w-0 items-end text-right ${ganP1 && fin ? 'opacity-30' : ''}`}
              style={ganP2 ? { borderRight: `3px solid ${p2clr}`, paddingRight: 10 } : {}}>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: p2clr }}>Pareja {p._n2}</span>
              <span className="text-base font-bold leading-tight" style={{ color: cNom }}>{fmt(p.pareja2)}</span>
              {ganP2 && <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: amber }}>✓ Campeón</span>}
            </div>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-center gap-3 px-4 py-2" style={{ borderTop: '1px solid #1E293B' }}>
            {p.slot?.hora && <span className="text-[10px]" style={{ color: cSec }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[10px]" style={{ color: cSec }}>· {canchaName(p.cancha)}</span>}
          </div>
        </div>
      )
    }

    // ── Template 1: Estándar (diseño original) ───────────────────────────────
    const catClr = colorTextoCategoria || catColorMap[p._cat]
    return (
      <div key={p.id} className={cardStyle_(fin)} style={cardBg}>
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${st.hdrBorder}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: clrZona }}>
              {p._zona}
            </span>
            {p._cat && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${catClr}22`, color: catClr, border: `1px solid ${catClr}40` }}>
                {p._cat}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className={st.hora} style={{ color: clrHora }}>{p.slot.hora} hs</span>}
            {p.cancha     && <span className={st.cancha} style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
            {fin          && <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle size={9} /> Finalizado</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`flex items-center gap-2 flex-1 min-w-0 ${ganP1 ? st.nameW : ganP2 ? st.nameL : st.nameN}`}
            style={nStyle(ganP1, ganP2 && fin)}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : fin ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n1}</span>
            <span className={`text-sm truncate ${ganP2 && fin ? 'line-through' : ''}`}>
              {p.pareja1 ? `${p.pareja1.jugador1.split(' ')[0]} / ${p.pareja1.jugador2.split(' ')[0]}` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {fin && p.resultado?.length > 0 ? (
              p.resultado.map((s, i) => (
                <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${s.p1 > s.p2 ? st.chipW : st.chipL}`}
                  style={colorTextoScore ? { color: s.p1 > s.p2 ? clrScoreW : clrScoreL, backgroundColor: s.p1 > s.p2 ? `${clrScoreW}18` : undefined, borderColor: s.p1 > s.p2 ? `${clrScoreW}40` : undefined } : {}}>
                  {s.p1}-{s.p2}
                </span>
              ))
            ) : (
              <span className={`text-xs px-2 font-bold ${st.vs}`} style={colorTextoScore ? { color: clrScoreL } : {}}>vs</span>
            )}
          </div>
          <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${ganP2 ? st.nameW : ganP1 ? st.nameL : st.nameN}`}
            style={nStyle(ganP2, ganP1 && fin)}>
            <span className={`text-sm truncate text-right ${ganP1 && fin ? 'line-through' : ''}`}>
              {p.pareja2 ? `${p.pareja2.jugador1.split(' ')[0]} / ${p.pareja2.jugador2.split(' ')[0]}` : '—'}
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : fin ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n2}</span>
          </div>
        </div>
      </div>
    )
  }
  const allCats = useMemo(() => [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))], [torneo.grupos])
  const catColorMap = useMemo(() => buildCatColorMap(allCats), [allCats])
  const multiCat = allCats.length > 1

  const todosConSlot = useMemo(() => {
    const lista = []
    ;(torneo.grupos ?? []).forEach((zona) => {
      zona.partidos.forEach((p) => {
        if (!p.slot?.dia) return
        const n1 = zona.parejas.findIndex((x) => x.id === p.pareja1?.id) + 1
        const n2 = zona.parejas.findIndex((x) => x.id === p.pareja2?.id) + 1
        lista.push({ ...p, _zona: zona.nombre, _cat: zona.categoria, _n1: n1, _n2: n2 })
      })
    })
    return lista
  }, [torneo.grupos])

  const dias = useMemo(() => {
    const set = new Set(todosConSlot.map((p) => p.slot.dia))
    return DIAS_ORDEN.filter((d) => set.has(d))
  }, [todosConSlot])

  const [diaActivo, setDiaActivo] = useState(() => dias[0] ?? null)

  const partidosDelDia = useMemo(() =>
    todosConSlot
      .filter((p) => p.slot.dia === diaActivo)
      .sort((a, b) => (a.slot.hora ?? '') < (b.slot.hora ?? '') ? -1 : 1),
    [todosConSlot, diaActivo]
  )

  const bracketRondas = useMemo(() => {
    if (!torneo.bracket?.length) return []
    return torneo.bracket
      .map((ronda) => ({
        nombre: ronda.nombre,
        partidos: ronda.partidos
          .filter((p) => p.fecha)
          .sort((a, b) => {
            const fa = (a.fecha ?? '') + (a.hora ?? '')
            const fb = (b.fecha ?? '') + (b.hora ?? '')
            return fa < fb ? -1 : fa > fb ? 1 : 0
          }),
      }))
      .filter((r) => r.partidos.length > 0)
  }, [torneo.bracket])

  if (dias.length === 0 && bracketRondas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Clock size={32} className="text-white/10" />
        <p className="text-white/30 text-sm">Aún no hay partidos con horario asignado.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {imagenFondo && (
        <div className="relative h-20 rounded-2xl overflow-hidden shrink-0">
          <img src={imagenFondo} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 h-full flex items-center justify-center">
            <p className="text-white font-bold text-sm uppercase tracking-widest opacity-80">Fixture del día</p>
          </div>
        </div>
      )}

      {/* Fase de grupos */}
      {dias.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            {dias.map((dia) => (
              <button
                key={dia}
                onClick={() => setDiaActivo(dia)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                  diaActivo === dia
                    ? 'text-[#0d1117] border-transparent'
                    : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/70'
                }`}
                style={diaActivo === dia ? { background: accentColor, borderColor: accentColor } : {}}
              >
                {dia}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {partidosDelDia.map((p) => renderPartidoCard(p))}
          </div>
        </>
      )}

      {/* Fase eliminatoria */}
      {bracketRondas.length > 0 && (
        <div className="flex flex-col gap-5">
          {dias.length > 0 && (
            <div className={`flex items-center gap-3 ${isClara ? 'text-gray-300' : 'text-white/20'}`}>
              <div className="flex-1 h-px bg-current" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                <GitMerge size={11} />
                Fase Eliminatoria
              </span>
              <div className="flex-1 h-px bg-current" />
            </div>
          )}
          {bracketRondas.map(({ nombre, partidos }) => (
            <div key={nombre} className="flex flex-col gap-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>{nombre}</p>
              {partidos.map((p) => {
                const finalizado = p.estado === 'finalizado'
                const ganP1 = p.ganador?.id === p.pareja1?.id
                const ganP2 = p.ganador?.id === p.pareja2?.id
                return (
                  <div key={p.id} className={cardStyle_(finalizado)} style={cardBg}>
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${st.hdrBorder}`}>
                      <span className={`text-[10px] font-bold ${isClara ? 'text-gray-400' : 'text-white/30'}`}>
                        {fmtFecha(p.fecha)}
                      </span>
                      <div className="flex items-center gap-3">
                        {p.hora   && <span className={st.hora}>{p.hora} hs</span>}
                        {p.cancha && <span className={st.cancha}>{canchaName(p.cancha)}</span>}
                        {finalizado && <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle size={9} /> Finalizado</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex items-center flex-1 min-w-0 ${ganP1 ? st.nameW : ganP2 ? st.nameL : st.nameN}`}>
                        <span className={`text-sm truncate ${ganP2 && finalizado ? 'line-through' : ''}`}>
                          {p.pareja1 ? `${p.pareja1.jugador1.split(' ')[0]} / ${p.pareja1.jugador2.split(' ')[0]}` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {finalizado && p.resultado?.length > 0 ? (
                          p.resultado.map((s, i) => (
                            <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${s.p1 > s.p2 ? st.chipW : st.chipL}`}>{s.p1}-{s.p2}</span>
                          ))
                        ) : (
                          <span className={`text-xs px-2 font-bold ${st.vs}`}>vs</span>
                        )}
                      </div>
                      <div className={`flex items-center flex-1 min-w-0 justify-end ${ganP2 ? st.nameW : ganP1 ? st.nameL : st.nameN}`}>
                        <span className={`text-sm truncate text-right ${ganP1 && finalizado ? 'line-through' : ''}`}>
                          {p.pareja2 ? `${p.pareja2.jugador1.split(' ')[0]} / ${p.pareja2.jugador2.split(' ')[0]}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab Grupos ────────────────────────────────────────────────────────────────

const TabGrupos = ({ torneo, accentColor, imagenFondo = null, imagenHeader = null, colorTexto = null, bannerLeft = null, bannerRight = null, cardStyle = 'oscura', colorCard = null,
  templateFixture = 1, colorTextoNombres = null, colorTextoScore = null, canchaName = () => '',
}) => {
  // El template define el fondo base — colorCard de grupos sobreescribe si está seteado
  const TPL_BG     = { 2:'#0A1628', 3:'#ffffff', 6:'#ffffff', 7:'#111111', 8:'#0D0B08', 9:'#ffffff', 10:'#18181B', 12:'#1A1A1A', 13:'#ffffff', 14:'#0F172A' }
  const TPL_BORDER = { 2:'1px solid #1E3A5F', 3:'1px solid #E5E7EB', 6:'2px solid #000000', 7:'1px solid #2A2A2A', 8:'1px solid #8B6914', 9:'1px solid #E5E7EB', 10:'1px solid #3F3F46', 12:'none', 13:'1px solid #E5E7EB', 14:'1px solid #1E293B' }
  // Color de acento natural de cada template (null = usa accentColor del club)
  const TPL_ACCENT = { 6:'#000000', 7:'#D4AF37', 8:'#C9A84C', 10:'#22C55E', 12:'#E8002D', 13:'#2563EB', 14:'#F59E0B' }
  const tplBg     = colorCard || TPL_BG[templateFixture] || null
  const tplBorder = colorCard ? null : TPL_BORDER[templateFixture] || null

  // isClara deriva del fondo del template → controla TODO el st object
  const effectiveStyle = tplBg ? (isColorDark(tplBg) ? 'oscura' : 'clara') : cardStyle
  const isClara = effectiveStyle === 'clara'

  // Score colors — hereda acento del template si existe, sino color del club
  const tClrScoreW = colorTextoScore || TPL_ACCENT[templateFixture] || accentColor
  const tClrScoreL = colorTextoScore ? `${colorTextoScore}35` : isClara ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
  // Name colors auto-derivadas de isClara
  const tNameW = colorTextoNombres || (isClara ? '#111827' : '#ffffff')
  const tNameL = isClara ? '#D1D5DB' : 'rgba(255,255,255,0.25)'
  const st = {
    // Cuando hay template, eliminamos bg/border Tailwind del contenedor para que el inline style tome control
    zona:       tplBg
      ? 'rounded-2xl overflow-hidden'
      : (isClara ? 'rounded-2xl border border-gray-200 overflow-hidden bg-white' : 'rounded-2xl border border-white/8 overflow-hidden'),
    zonaHdr:    tplBg
      ? `flex items-center justify-between px-5 py-3 border-b ${isClara ? 'border-gray-200' : 'border-white/8'}`
      : (isClara ? 'flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200' : 'flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/8'),
    zonaNombre: isClara ? 'text-gray-800 font-semibold text-sm' : 'text-white font-semibold text-sm',
    catBadge:   isClara ? 'text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md'    : 'text-xs text-white/35 bg-white/5 px-2 py-0.5 rounded-md',
    secBorder:  isClara ? 'border-b border-gray-100'  : 'border-b border-white/5',
    secLabel:   isClara ? 'text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2.5' : 'text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2.5',
    thCls:      isClara ? 'pb-1.5 text-left text-gray-400 font-semibold' : 'pb-1.5 text-left text-white/20 font-semibold',
    trBorder:   isClara ? 'border-b border-gray-100'  : 'border-b border-white/8',
    trRowBorder:isClara ? 'border-b border-gray-50 last:border-0' : 'border-b border-white/5 last:border-0',
    rankNum:    isClara ? 'py-2 font-bold text-gray-300' : 'py-2 font-bold text-white/20',
    nameClasif: isClara ? 'font-medium text-gray-800'   : 'font-medium text-white/80',
    nameOut:    isClara ? 'font-medium text-gray-300 line-through' : 'font-medium text-white/25 line-through',
    nameNeutro: isClara ? 'font-medium text-gray-500'   : 'font-medium text-white/55',
    statCell:   isClara ? 'py-2 text-center text-gray-400' : 'py-2 text-center text-white/25',
    matchCard:  isClara ? 'rounded-xl border overflow-hidden border-gray-200'           : 'rounded-xl border overflow-hidden border-white/6',
    matchCardFin:isClara? 'rounded-xl border overflow-hidden border-emerald-200'        : 'rounded-xl border overflow-hidden border-emerald-500/10',
    matchBody:  isClara ? 'flex items-center gap-2 px-3 py-2.5 bg-white'               : 'flex items-center gap-2 px-3 py-2.5 bg-white/2',
    matchBodyFin:isClara? 'flex items-center gap-2 px-3 py-2.5 bg-emerald-50'          : 'flex items-center gap-2 px-3 py-2.5 bg-emerald-500/3',
    seedBg:     isClara ? 'bg-gray-100 text-gray-500'   : 'bg-white/8 text-white/30',
    nameW:      isClara ? 'text-gray-900 font-semibold' : 'text-white font-semibold',
    nameL:      isClara ? 'text-gray-300 line-through'  : 'text-white/20 line-through',
    nameN:      isClara ? 'text-gray-600'               : 'text-white/50',
    chipW:      isClara ? 'text-emerald-600 bg-emerald-50 border-emerald-200'  : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    chipL:      isClara ? 'text-gray-400 bg-gray-100 border-gray-200'          : 'text-white/25 bg-white/5 border-white/8',
    vs:         isClara ? 'text-[10px] text-gray-300 px-1' : 'text-[10px] text-white/15 px-1',
    ftBorder:   isClara ? 'flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-gray-50' : 'flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-white/[0.01]',
    ftSlot:     isClara ? 'text-[11px] font-medium text-sky-600/80' : 'text-[11px] font-medium text-sky-400/70',
    ftNoSlot:   isClara ? 'text-[10px] text-gray-300'  : 'text-[10px] text-white/15',
    ftPendiente:isClara ? 'text-[10px] text-gray-300'  : 'text-[10px] text-white/15',
  }
  // cardBg aplica el bg del template (o del override manual de grupos)
  const cardBg = tplBg ? { backgroundColor: tplBg, border: tplBorder || undefined } : undefined

  const zonaCats    = useMemo(() => [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))], [torneo.grupos])
  const multiCatG   = zonaCats.length > 1
  const catColorMapG = useMemo(() => buildCatColorMap(zonaCats), [zonaCats])
  const [catTabG, setCatTabG] = useState(() => zonaCats[0] ?? null)
  const zonasFiltradas = multiCatG ? (torneo.grupos ?? []).filter((z) => z.categoria === catTabG) : (torneo.grupos ?? [])

  if (!torneo.grupos?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Users size={32} className="text-white/10" />
        <p className="text-white/30 text-sm">La fase de grupos aún no comenzó.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {imagenHeader && (
        <div className="relative h-20 rounded-2xl overflow-hidden shrink-0">
          <img src={imagenHeader} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 h-full flex items-center justify-center">
            <p className="text-white font-bold text-sm uppercase tracking-widest opacity-80">Grupos</p>
          </div>
        </div>
      )}
      {multiCatG && (
        <div className="flex gap-2 flex-wrap">
          {zonaCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatTabG(cat)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                catTabG === cat
                  ? 'text-[#0d1117] border-transparent'
                  : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/70'
              }`}
              style={catTabG === cat ? { background: catColorMapG[cat], borderColor: catColorMapG[cat] } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {zonasFiltradas.map((zona) => {
        const wins = {}
        const pj   = {}
        zona.parejas.forEach((p) => { wins[p.id] = 0; pj[p.id] = 0 })
        zona.partidos.forEach((m) => {
          if (m.estado === 'finalizado') {
            if (m.pareja1) pj[m.pareja1.id]  = (pj[m.pareja1.id]  || 0) + 1
            if (m.pareja2) pj[m.pareja2.id]  = (pj[m.pareja2.id]  || 0) + 1
            if (m.ganador) wins[m.ganador.id] = (wins[m.ganador.id] || 0) + 1
          }
        })
        const standings = [...zona.parejas]
          .sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0))
          .map((p) => ({ pareja: p, w: wins[p.id] || 0, played: pj[p.id] || 0 }))

        const eqNum = (pareja) => {
          if (!pareja) return null
          const idx = zona.parejas.findIndex((p) => p.id === pareja.id)
          return idx >= 0 ? idx + 1 : null
        }

        return (
          <div key={zona.nombre + (zona.categoria ?? '')} className="relative">
            {bannerLeft  && <img src={bannerLeft}  alt="" className="absolute rounded-2xl shadow-lg hidden xl:block" style={{ width: 120, right: 'calc(100% + 20px)', top: '50%', transform: 'translateY(-50%)' }} />}
          <div className={st.zona} style={cardBg}>
            {/* Header zona */}
            <div className="relative overflow-hidden">
              {imagenFondo && (
                <>
                  <img src={imagenFondo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60" />
                </>
              )}
              <div className={`relative z-10 ${imagenFondo ? 'flex items-center justify-between px-5 py-3 border-b border-white/10' : st.zonaHdr}`}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: imagenFondo ? 'rgba(255,255,255,0.12)' : accentColor + '22' }}>
                    <span className="text-xs font-black" style={{ color: imagenFondo ? (colorTexto ?? '#fff') : accentColor }}>{zona.nombre.replace('Zona ','')}</span>
                  </div>
                  <span className={imagenFondo ? 'font-semibold text-sm' : st.zonaNombre} style={imagenFondo ? { color: colorTexto ?? '#fff' } : {}}>{zona.nombre}</span>
                  {zona.categoria && <span className={imagenFondo ? 'text-xs bg-white/10 px-2 py-0.5 rounded-md' : st.catBadge} style={imagenFondo ? { color: colorTexto ? colorTexto + 'aa' : 'rgba(255,255,255,0.5)' } : {}}>{zona.categoria}</span>}
                </div>
                {zona.clasificados && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle size={10} /> Completada
                  </span>
                )}
              </div>
            </div>

            {/* Posiciones */}
            <div className={`px-5 pt-4 pb-3 ${st.secBorder}`}>
              <p className={st.secLabel}>Posiciones</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className={st.trBorder}>
                    <th className={`${st.thCls} w-6`}>#</th>
                    <th className={st.thCls}>Pareja</th>
                    <th className={`${st.thCls} text-center w-8`}>PJ</th>
                    <th className={`${st.thCls} text-center w-8`}>G</th>
                    <th className={`${st.thCls} text-center w-8`}>P</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(({ pareja, w, played }, i) => {
                    const esClasificado = zona.clasificados?.some((c) => c.id === pareja.id)
                    return (
                      <tr key={pareja.id} className={st.trRowBorder}>
                        <td className={st.rankNum}>{i+1}°</td>
                        <td className="py-2">
                          <span className={esClasificado ? st.nameClasif : zona.clasificados ? st.nameOut : st.nameNeutro}>
                            {pareja.jugador1} / {pareja.jugador2}
                          </span>
                          {esClasificado && zona.clasificados && <span className="ml-1.5 text-[9px] text-emerald-400">✓</span>}
                        </td>
                        <td className={`${st.statCell} text-center`}>{played}</td>
                        <td className="py-2 text-center font-semibold text-emerald-400">{w}</td>
                        <td className={`${st.statCell} text-center`}>{played - w}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Partidos */}
            <div className="px-5 py-4 flex flex-col gap-2">
              <p className={`${st.secLabel} mb-1`}>Partidos</p>
              {zona.partidos.map((m) => {
                const n1         = eqNum(m.pareja1)
                const n2         = eqNum(m.pareja2)
                const finalizado = m.estado === 'finalizado'
                const ganP1      = m.ganador?.id === m.pareja1?.id
                const ganP2      = m.ganador?.id === m.pareja2?.id
                const ganN = ganP1 ? n1 : ganP2 ? n2 : null

                return (
                  <div key={m.id} className={finalizado ? st.matchCardFin : st.matchCard}>
                    <div className={finalizado ? st.matchBodyFin : st.matchBody}>
                      {/* P1 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n1 ?? '?'}</span>
                        <span className={`text-xs truncate font-semibold`}
                          style={{ color: ganP1 ? tNameW : finalizado ? tNameL : tNameW, textDecoration: ganP2 && finalizado ? 'line-through' : 'none', opacity: ganP2 && finalizado ? 0.5 : 1 }}>
                          {m.pareja1 ? `${m.pareja1.jugador1.split(' ')[0]} / ${m.pareja1.jugador2.split(' ')[0]}` : '—'}
                        </span>
                      </div>
                      {/* Sets */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {finalizado && m.resultado?.length > 0 ? (
                          m.resultado.map((s, i) => (
                            <span key={i} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border"
                              style={{ color: s.p1 > s.p2 ? tClrScoreW : tClrScoreL, background: s.p1 > s.p2 ? `${tClrScoreW}18` : 'transparent', borderColor: s.p1 > s.p2 ? `${tClrScoreW}30` : 'transparent' }}>
                              {s.p1}-{s.p2}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] px-1" style={{ color: tClrScoreL }}>vs</span>
                        )}
                      </div>
                      {/* P2 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-xs truncate text-right font-semibold"
                          style={{ color: ganP2 ? tNameW : finalizado ? tNameL : tNameW, textDecoration: ganP1 && finalizado ? 'line-through' : 'none', opacity: ganP1 && finalizado ? 0.5 : 1 }}>
                          {m.pareja2 ? `${m.pareja2.jugador1.split(' ')[0]} / ${m.pareja2.jugador2.split(' ')[0]}` : '—'}
                        </span>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n2 ?? '?'}</span>
                      </div>
                    </div>
                    {/* Footer horario */}
                    <div className={st.ftBorder}>
                      {m.slot
                        ? <span className="text-[11px] font-medium" style={{ color: tClrScoreW }}>{m.slot.dia} · {m.slot.hora ?? m.slot.franja.split('(')[0].trim()}</span>
                        : <span className="text-[10px]" style={{ color: tClrScoreL }}>Sin horario</span>
                      }
                      {finalizado && ganN !== null
                        ? <span className="text-[10px] font-bold text-emerald-400">✓ P{ganN} ganó</span>
                        : <span className="text-[10px]" style={{ color: tClrScoreL }}>pendiente</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
            {bannerRight && <img src={bannerRight} alt="" className="absolute rounded-2xl shadow-lg hidden xl:block" style={{ width: 120, left: 'calc(100% + 20px)', top: '50%', transform: 'translateY(-50%)' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Tab Draw ──────────────────────────────────────────────────────────────────

const BannerLateral = ({ src, zones = 4 }) => (
  <div className="shrink-0 self-stretch px-3 py-5" style={{ width: 186 }}>
    <div className="h-full flex flex-col">
      {Array.from({ length: zones }).map((_, g) => (
        <div key={g} className="flex-1 flex items-center py-2">
          <img src={src} alt="" className="w-full rounded-2xl shadow-lg" style={{ height: 'auto', display: 'block' }} />
        </div>
      ))}
    </div>
  </div>
)

const TabDraw = ({ torneo, club }) => {
  const catBrackets   = Object.keys(torneo.brackets ?? {})
  const multiCatD     = catBrackets.length > 1
  const [catTabD, setCatTabD] = useState(() => catBrackets[0] ?? null)
  const activeBracket = torneo.brackets?.[catTabD] ?? null

  const gruposTerminados = torneo.grupos
    ? isGroupPhaseFinished(
        multiCatD && catTabD
          ? torneo.grupos.filter((z) => z.categoria === catTabD)
          : torneo.grupos
      )
    : true

  const seedingMap = useMemo(() => {
    const map = {}
    const zonas = multiCatD && catTabD
      ? (torneo.grupos ?? []).filter((z) => z.categoria === catTabD)
      : (torneo.grupos ?? [])
    zonas.forEach((zona) => {
      const letra = zona.nombre.replace('Zona ', '')
      ;(zona.clasificados ?? []).forEach((pareja, pos) => {
        if (pareja) map[pareja.id] = `${pos + 1}°${letra}`
      })
    })
    return map
  }, [torneo.grupos, catTabD, multiCatD])

  if (!gruposTerminados || !activeBracket) {
    const zonasFiltradas = multiCatD && catTabD
      ? (torneo.grupos ?? []).filter((z) => z.categoria === catTabD)
      : (torneo.grupos ?? [])
    const completadas = zonasFiltradas.filter((z) => z.clasificados).length
    const total       = zonasFiltradas.length
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <GitMerge size={36} className="text-white/10" />
        <p className="text-white/50 text-sm font-semibold">Draw disponible al finalizar los grupos</p>
        {total > 0 && (
          <p className="text-white/25 text-xs">{completadas}/{total} zonas completadas</p>
        )}
      </div>
    )
  }

  return (
    <BracketView
      bracket={activeBracket}
      torneo={torneo}
      club={club}
      seedingMap={seedingMap}
      selectedCat={catTabD}
      onSelectCat={multiCatD ? setCatTabD : null}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'fixture', label: 'Fixture del día', icon: Calendar },
  { key: 'grupos',  label: 'Grupos',          icon: Users    },
  { key: 'draw',    label: 'Draw',            icon: GitMerge },
]

// Mapea la respuesta del backend al formato del store
const mapBackendTorneoPublico = (data) => {
  const p = data.personalizacion ?? {}
  return {
    ...p,
    id:                   data.id,
    nombre:               data.nombre,
    estado:               data.estado,
    fechaInicio:          data.fechaInicio,
    fechaFin:             data.fechaFin,
    categorias:           data.categorias           ?? [],
    genero:               data.genero               ?? null,
    canchasAsignadas:     data.canchasAsignadas      ?? [],
    grupos:               data.grupos               ?? null,
    brackets:             data.brackets             ?? {},
    puntosPorVictoria:    data.puntosPorVictoria     ?? 2,
    colorAcento:          p.colorAcento             ?? null,
    colorAcentoFixture:   p.colorAcentoFixture      ?? null,
    templateFixture:      p.templateFixture          ?? 1,
    sponsorLogoFixture:   p.sponsorLogoFixture        ?? null,
    colorTextoNombres:    p.colorTextoNombres        ?? null,
    colorTextoZona:       p.colorTextoZona           ?? null,
    colorTextoCategoria:  p.colorTextoCategoria      ?? null,
    colorTextoScore:      p.colorTextoScore          ?? null,
    colorTextoInfo:       p.colorTextoInfo           ?? null,
    estiloCardFixture:    p.estiloCardFixture        ?? 'oscura',
    colorCardFixture:     p.colorCardFixture         ?? null,
    estiloCardGrupos:     p.estiloCardGrupos         ?? 'oscura',
    colorCardGrupos:      p.colorCardGrupos          ?? null,
    imagenFondoFixture:   p.imagenFondoFixture       ?? null,
    imagenFondoGrupos:    p.imagenFondoGrupos        ?? null,
    imagenHeaderGrupos:   p.imagenHeaderGrupos       ?? null,
    colorTextoCardGrupos: p.colorTextoCardGrupos     ?? null,
    imagenFondoDraw:      p.imagenFondoDraw          ?? null,
    imagenFondoBracket:   p.imagenFondoBracket       ?? null,
    bannerLateral1Fixture: p.bannerLateral1Fixture   ?? null,
    bannerLateral2Fixture: p.bannerLateral2Fixture   ?? null,
    bannerLateral1Grupos:  p.bannerLateral1Grupos    ?? null,
    bannerLateral2Grupos:  p.bannerLateral2Grupos    ?? null,
    estiloCard:           p.estiloCard               ?? 'oscura',
    colorCard:            p.colorCard                ?? null,
    fontScale:            p.fontScale                ?? 'normal',
    bracketColores:       p.bracketColores           ?? {},
    drawMostrarClub:      p.drawMostrarClub          ?? true,
    drawTitulo:           p.drawTitulo               ?? null,
    drawMostrarNombre:    p.drawMostrarNombre        ?? true,
    drawMostrarFechas:    p.drawMostrarFechas        ?? true,
    drawMostrarCategorias: p.drawMostrarCategorias   ?? true,
    drawColorTitulo:      p.drawColorTitulo          ?? null,
    sponsors:             p.sponsors                 ?? [],
    inscriptos: (data.parejas ?? []).map((par) => ({
      id: par.id, jugador1: par.jugador1, jugador2: par.jugador2,
      estado: par.estado ?? 'inscripto', categoria: par.categoria ?? null,
    })),
  }
}

const TorneoPublicoPage = () => {
  const { id }             = useParams()
  const navigate           = useNavigate()
  const torneos            = useTorneosStore((s) => s.torneos)
  const addTorneoFromApi   = useTorneosStore((s) => s.addTorneoFromApi)
  const updateTorneoFromApi = useTorneosStore((s) => s.updateTorneoFromApi)
  const club               = useClubStore((s) => s.club)
  const _loaded            = useClubStore((s) => s._loaded)
  const loadFromBackend    = useClubStore((s) => s.loadFromBackend)
  const canchas            = club.canchas
  const [tab, setTab]      = useState('fixture')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const pollRef            = useRef(null)

  const torneo      = torneos.find((t) => String(t.id) === String(id))
  const accentColor = torneo?.colorAcentoFixture || torneo?.colorAcento || '#afca0b'

  // Fetch club si no está cargado (visitante directo sin pasar por la landing)
  useEffect(() => {
    if (_loaded) return
    const slug = import.meta.env.VITE_CLUB_SLUG
    if (!slug) return
    api.get(`/clubs/${slug}`).then((data) => {
      if (data?.id) loadFromBackend(data)
    }).catch(() => {})
  }, [_loaded])

  // Fetch torneo + polling 30s (datos en tiempo real)
  useEffect(() => {
    const fetchTorneo = async (initial = false) => {
      if (initial) setLoading(true)
      try {
        const data = await api.get(`/torneos/${id}`)
        if (!data?.id) { setNotFound(true); return }
        const mapped = mapBackendTorneoPublico(data)
        const existe = torneos.find((t) => String(t.id) === String(id))
        if (existe) updateTorneoFromApi(mapped)
        else        addTorneoFromApi(mapped)
      } catch {
        if (initial) setNotFound(true)
      } finally {
        if (initial) setLoading(false)
      }
    }

    // Siempre fetch al montar para tener datos frescos (template, resultados, horarios)
    fetchTorneo(true)

    // Polling cada 30s para mantener datos en tiempo real
    pollRef.current = setInterval(() => fetchTorneo(false), 30_000)
    return () => clearInterval(pollRef.current)
  }, [id])

  const canchaName = (canchaId) =>
    canchas.find((c) => String(c.id) === String(canchaId))?.nombre ?? `Cancha ${canchaId}`

  const bannerLeft  = tab === 'fixture'
    ? (torneo?.bannerLateral1Fixture ?? null)
    : (torneo?.bannerLateral1Grupos  ?? null)
  const bannerRight = tab === 'fixture'
    ? (torneo?.bannerLateral2Fixture ?? null)
    : (torneo?.bannerLateral2Grupos  ?? null)

  const bannerZones = tab === 'fixture' ? 1 : (torneo?.grupos?.length ?? 4)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#afca0b] rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Cargando torneo…</p>
        </div>
      </div>
    )
  }

  if (notFound || (torneo && torneo.estado !== 'in_progress')) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-6">
        <div className="text-center">
          <Trophy size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-semibold">Torneo no disponible</p>
          <p className="text-white/20 text-sm mt-1">Este torneo no está activo o no existe.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 text-sm text-[#afca0b] hover:text-[#c8e00d] transition-colors"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!torneo) return null

  return (
    <div className="min-h-screen bg-[#0d1117]">

      {/* Header sticky */}
      <div className="border-b border-white/8 bg-[#0d1117]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>En curso</span>
            </div>
            <h1 className="text-white font-bold text-base leading-tight truncate">{torneo.nombre}</h1>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs text-white/40">
              {fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}
            </span>
            <span className="text-xs text-white/25">{torneo.categorias?.join(', ')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  tab === key
                    ? ''
                    : 'border-transparent text-white/30 hover:text-white/60'
                }`}
                style={tab === key ? { borderColor: accentColor, color: accentColor } : {}}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido fixture / grupos — ancho normal */}
      {tab !== 'draw' && (
        <div className="flex">
          {tab === 'fixture' && bannerLeft  && <BannerLateral src={bannerLeft}  zones={bannerZones} />}
          <div className="flex-1 min-w-0 max-w-4xl mx-auto px-4 py-6">
            {tab === 'fixture' && <TabFixture torneo={torneo} canchaName={canchaName} accentColor={accentColor} imagenFondo={torneo.imagenFondoFixture ?? null} cardStyle={torneo.estiloCardFixture ?? 'oscura'} colorCard={torneo.colorCardFixture ?? null} templateFixture={torneo.templateFixture ?? 1} colorTextoNombres={torneo.colorTextoNombres ?? null} colorTextoZona={torneo.colorTextoZona ?? null} colorTextoCategoria={torneo.colorTextoCategoria ?? null} colorTextoScore={torneo.colorTextoScore ?? null} colorTextoInfo={torneo.colorTextoInfo ?? null} />}
            {tab === 'grupos'  && <TabGrupos  torneo={torneo} accentColor={accentColor} imagenFondo={torneo.imagenFondoGrupos ?? null} imagenHeader={torneo.imagenHeaderGrupos ?? null} colorTexto={torneo.colorTextoCardGrupos ?? null} bannerLeft={bannerLeft} bannerRight={bannerRight} cardStyle={torneo.estiloCardGrupos ?? 'oscura'} colorCard={torneo.colorCardGrupos ?? null} templateFixture={torneo.templateFixture ?? 1} colorTextoNombres={torneo.colorTextoNombres ?? null} colorTextoScore={torneo.colorTextoScore ?? null} canchaName={canchaName} />}
          </div>
          {tab === 'fixture' && bannerRight && <BannerLateral src={bannerRight} zones={bannerZones} />}
        </div>
      )}

      {/* Contenido draw — ancho completo */}
      {tab === 'draw' && (
        <div className="px-1 py-4">
          <TabDraw torneo={torneo} club={club} />
        </div>
      )}

    </div>
  )
}

export default TorneoPublicoPage
