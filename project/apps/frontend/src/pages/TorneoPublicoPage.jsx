import { useState, useMemo, useEffect, useRef } from 'react'
import { getClubSlug } from '../lib/clubContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Trophy, Calendar, ArrowLeft, Users, GitMerge, Clock, CheckCircle, Flag, Tag,
  LayoutGrid, MapPin, Award, ChevronRight, ChevronDown, Crown, Medal,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import useClubStore from '../store/clubStore'
import { isGroupPhaseFinished } from '../services/torneoService'
import BracketView, { isColorDark } from '../components/BracketView'
import { api } from '../lib/api'

// Color del club (white-label). Como accentColor puede ir a SVG (bracket/fixture)
// donde var() no resuelve, el fallback se resuelve a hex real en runtime.
const CLUB = () => {
  if (typeof window === 'undefined') return '#afca0b'
  return getComputedStyle(document.documentElement).getPropertyValue('--club-primary').trim() || '#afca0b'
}

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
            <span className="text-[13px] font-black uppercase tracking-[0.2em]"
              style={{ color: clrZona }}>{p._zona}</span>
            {p._cat && (
              colorTextoCategoria
                ? <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colorTextoCategoria }}>· {p._cat}</span>
                : <span className="text-[11px] text-white/25 uppercase tracking-widest">· {p._cat}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {p.slot?.hora && <span className="text-[13px] font-bold font-mono" style={{ color: clrHora }}>{p.slot.hora}</span>}
            {p.cancha     && <span className="text-[12px]" style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
            {fin && <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-400"><CheckCircle size={11}/>FIN</span>}
          </div>
        </div>
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 py-4 gap-3">
          <div className={`flex flex-col gap-1.5 transition-opacity ${sideOp(ganP1)}`}>
            <div className="flex items-center gap-1.5 min-h-[18px]">
              {ganP1 && <span className="text-[13px] font-black text-emerald-500">✓ Ganó</span>}
            </div>
            <div>
              <p className="font-black uppercase leading-tight"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                {p1j1.nm ? `${p1j1.nm} ${p1j1.ap}` : (p1j1.ap || '—')}
              </p>
            </div>
            <div>
              <p className="font-black uppercase leading-tight"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', color: t2NombreW, letterSpacing: '-0.01em' }}>
                {p1j2.nm ? `${p1j2.nm} ${p1j2.ap}` : (p1j2.ap || '—')}
              </p>
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
            <div className="flex items-center gap-1.5 justify-end min-h-[18px]">
              {ganP2 && <span className="text-[13px] font-black text-emerald-500">✓ Ganó</span>}
            </div>
            <div>
              <p className="font-black uppercase leading-tight"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                {p2j1.nm ? `${p2j1.nm} ${p2j1.ap}` : (p2j1.ap || '—')}
              </p>
            </div>
            <div>
              <p className="font-black uppercase leading-tight"
                style={{ fontSize: 'clamp(12px,2.2vw,20px)', color: t2NombreW, letterSpacing: '-0.01em' }}>
                {p2j2.nm ? `${p2j2.nm} ${p2j2.ap}` : (p2j2.ap || '—')}
              </p>
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
          <span className={`text-[11px] sm:text-sm leading-tight ${ganP2 && fin ? 'line-through' : ''}`}>
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
          <span className={`text-[11px] sm:text-sm leading-tight text-right ${ganP1 && fin ? 'line-through' : ''}`}>
            {p.pareja2 ? `${p.pareja2.jugador1.split(' ')[0]} / ${p.pareja2.jugador2.split(' ')[0]}` : '—'}
          </span>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : fin ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n2}</span>
        </div>
      </div>
    </div>
  )
}

// ── Sponsor Strip ─────────────────────────────────────────────────────────────

const SponsorStrip = ({ sponsors = [], accentColor = CLUB() }) => (
  <div className="mt-4 overflow-hidden rounded-xl" style={{ borderTop: `3px solid ${accentColor}` }}>
    <div
      className="flex flex-wrap items-center justify-center gap-8 px-8 py-4"
      style={{ backgroundColor: '#f0f0ee' }}
    >
      {sponsors.map((s, i) => (
        <div key={i} className="flex items-center justify-center transition-opacity hover:opacity-70" style={{ minWidth: 60 }}>
          {s.logo ? (
            <img src={s.logo} alt={s.nombre} className="h-12 w-auto max-w-[140px] object-contain" />
          ) : (
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.nombre}</p>
          )}
        </div>
      ))}
    </div>
  </div>
)

// ── Tab Fixture del día ───────────────────────────────────────────────────────

const TabFixture = ({ torneo, canchaName, accentColor, imagenFondo = null, watermark = null, sponsorLogo = null, sponsors = [], cardStyle = 'oscura', colorCard = null, templateFixture = 1,
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
              <span className="text-[13px] font-black uppercase tracking-[0.2em]"
                style={{ color: clrZona }}>{p._zona}</span>
              {p._cat && (
                colorTextoCategoria
                  ? <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colorTextoCategoria }}>· {p._cat}</span>
                  : <span className="text-[11px] text-white/25 uppercase tracking-widest">· {p._cat}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {p.slot?.hora && <span className="text-[13px] font-bold font-mono" style={{ color: clrHora }}>{p.slot.hora}</span>}
              {p.cancha     && <span className="text-[12px]" style={{ color: clrInfo }}>{canchaName(p.cancha)}</span>}
              {fin && <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-400"><CheckCircle size={11}/>FIN</span>}
            </div>
          </div>

          {/* Body — 3 columnas */}
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 py-4 gap-3">

            {/* P1 — izquierda */}
            <div className={`flex flex-col gap-1.5 transition-opacity ${sideOp(ganP1)}`}>
              <div className="flex items-center gap-1.5">
                {ganP1 && <span className="text-[13px] font-black text-emerald-500">✓ Ganó</span>}
              </div>
              <div>
                <p className="font-black uppercase leading-tight"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                  {p1j1.nm ? `${p1j1.nm} ${p1j1.ap}` : (p1j1.ap || '—')}
                </p>
              </div>
              <div>
                <p className="font-black uppercase leading-tight"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', color: t2NombreW, letterSpacing: '-0.01em' }}>
                  {p1j2.nm ? `${p1j2.nm} ${p1j2.ap}` : (p1j2.ap || '—')}
                </p>
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
                {ganP2 && <span className="text-[13px] font-black text-emerald-500">✓ Ganó</span>}
              </div>
              <div>
                <p className="font-black uppercase leading-tight"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', letterSpacing: '-0.01em', color: t2NombreW }}>
                  {p2j1.nm ? `${p2j1.nm} ${p2j1.ap}` : (p2j1.ap || '—')}
                </p>
              </div>
              <div>
                <p className="font-black uppercase leading-tight"
                  style={{ fontSize: 'clamp(12px,2.2vw,20px)', color: t2NombreW, letterSpacing: '-0.01em' }}>
                  {p2j2.nm ? `${p2j2.nm} ${p2j2.ap}` : (p2j2.ap || '—')}
                </p>
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
              {p.pareja1 ? [(p.pareja1.jugador1 ?? '').split(' ')[0], (p.pareja1.jugador2 ?? '').split(' ')[0]].filter(Boolean).join(' / ') || '—' : '—'}
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
              {p.pareja2 ? [(p.pareja2.jugador1 ?? '').split(' ')[0], (p.pareja2.jugador2 ?? '').split(' ')[0]].filter(Boolean).join(' / ') || '—' : '—'}
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

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

  // Nombres exactos del service (minúscula en "de final")
  const ROUND_ORDER = { 'Ronda Previa': 0, '16avos de final': 1, 'Octavos de final': 2, 'Cuartos de final': 3, 'Semifinal': 4, 'Final': 5 }

  // Todas las rondas del bracket agrupadas por nombre — para mostrar en el día del draw
  // SIN filtro por fecha, así se ven QF+SF+Final aunque SF/Final sean skeleton sin fecha
  const allBracketRounds = useMemo(() => {
    const map = {}
    Object.entries(torneo.brackets ?? {}).forEach(([cat, bracketObj]) => {
      const rondas = Array.isArray(bracketObj) ? bracketObj : (bracketObj?.rondas ?? [])
      rondas.forEach((ronda) => {
        if (!map[ronda.nombre]) map[ronda.nombre] = { nombre: ronda.nombre, partidos: [] }
        ;(ronda.partidos ?? []).forEach((p) => {
          if (!map[ronda.nombre].partidos.find((x) => x.id === p.id)) {
            map[ronda.nombre].partidos.push({ ...p, _cat: cat })
          }
        })
      })
    })
    return map
  }, [torneo.brackets])

  // Fechas ISO con al menos 1 partido asignado — solo para saber cuántos "días draw" mostrar como pill
  const bracketFechasConPartidos = useMemo(() => {
    const set = new Set()
    Object.entries(torneo.brackets ?? {}).forEach(([, bracketObj]) => {
      const rondas = Array.isArray(bracketObj) ? bracketObj : (bracketObj?.rondas ?? [])
      rondas.forEach((ronda) => {
        ;(ronda.partidos ?? []).forEach((p) => {
          if (p.fecha && ISO_DATE_RE.test(p.fecha)) set.add(p.fecha)
        })
      })
    })
    return set
  }, [torneo.brackets])

  // Hay datos de bracket si hay rondas con partidos (con o sin fecha)
  const hasBracketData = Object.keys(allBracketRounds).length > 0

  // Fechas para las pills: las ISO reales + "__draw__" como fallback si el bracket existe pero sin fechas asignadas
  const drawFechas = useMemo(() => {
    const sorted = [...bracketFechasConPartidos].sort()
    return sorted.length > 0 ? sorted : hasBracketData ? ['__draw__'] : []
  }, [bracketFechasConPartidos, hasBracketData])

  const roundsForDrawDay = useMemo(() => {
    if (!hasBracketData) return []
    return Object.values(allBracketRounds)
      .sort((a, b) => (ROUND_ORDER[a.nombre] ?? 99) - (ROUND_ORDER[b.nombre] ?? 99))
      .map((r) => ({ ...r, partidos: r.partidos.slice().sort((a, b) => (a.hora ?? '') < (b.hora ?? '') ? -1 : 1) }))
  }, [allBracketRounds, hasBracketData])

  // Si no hay día activo pero hay días de draw, seleccionar el primero
  useEffect(() => {
    if (!diaActivo && drawFechas.length > 0) setDiaActivo(drawFechas[0])
  }, [drawFechas])

  const isDrawDay = !!(diaActivo && drawFechas.includes(diaActivo))

  // Formatea fecha ISO o marcador "__draw__" → label de pill
  const fmtDrawDayLabel = (isoDate) => {
    if (isoDate === '__draw__') return 'Fase eliminatoria'
    try {
      if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate ?? '?'
      const [, , d] = isoDate.split('-')
      const date = new Date(isoDate + 'T12:00:00')
      if (isNaN(date.getTime())) return isoDate
      const dia = date.toLocaleDateString('es-AR', { weekday: 'long' })
      const mes = date.toLocaleDateString('es-AR', { month: 'short' })
      return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${parseInt(d)} ${mes}`
    } catch { return isoDate }
  }

  if (dias.length === 0 && drawFechas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Clock size={32} className="text-white/10" />
        <p className="text-white/30 text-sm">Aún no hay partidos con horario asignado.</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-5">
      <div className="relative z-10 h-16 rounded-2xl overflow-hidden shrink-0" style={!imagenFondo ? { background: `${clrScoreW}18`, border: isClara ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.06)' } : undefined}>
        {imagenFondo && (
          <>
            <img src={imagenFondo} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55" />
          </>
        )}
        <div className="relative z-10 h-full flex items-center justify-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: imagenFondo ? 'rgba(255,255,255,0.7)' : clrScoreW }} />
          <p className={`font-bold text-xs uppercase tracking-widest ${imagenFondo ? 'text-white opacity-80' : ''}`}
            style={!imagenFondo ? { color: clrScoreW, opacity: 0.8 } : undefined}>
            Fixture del día
          </p>
          {sponsorLogo && (
            <img src={sponsorLogo} alt="Sponsor" className="h-8 w-auto object-contain opacity-80 absolute right-4" />
          )}
        </div>
      </div>

      {/* Barra de días — grupos + días del draw */}
      {(dias.length > 0 || drawFechas.length > 0) && (
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {dias.map((dia) => (
            <button key={dia} onClick={() => setDiaActivo(dia)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                diaActivo === dia
                  ? 'text-[#0d1117] border-transparent'
                  : isClara ? 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600' : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/70'
              }`}
              style={diaActivo === dia ? { background: accentColor, borderColor: accentColor } : {}}
            >{dia}</button>
          ))}

          {/* Separador visual entre grupos y draw */}
          {dias.length > 0 && drawFechas.length > 0 && (
            <div className={`w-px h-5 rounded-full self-center ${isClara ? 'bg-gray-200' : 'bg-white/15'}`} />
          )}

          {drawFechas.map((fecha) => (
            <button key={fecha} onClick={() => setDiaActivo(fecha)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                diaActivo === fecha
                  ? 'text-[#0d1117] border-transparent'
                  : isClara ? 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600' : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/70'
              }`}
              style={diaActivo === fecha ? { background: accentColor, borderColor: accentColor } : {}}
            >
              <GitMerge size={12} style={{ opacity: diaActivo === fecha ? 1 : 0.5 }} />
              {fmtDrawDayLabel(fecha)}
            </button>
          ))}
        </div>
      )}

      {/* Contenido según día activo */}

      {/* Día de grupos */}
      {!isDrawDay && (
        <div className="flex flex-col gap-2.5">
          {partidosDelDia.map((p) => renderPartidoCard(p))}
        </div>
      )}

      {/* Día del draw — rondas agrupadas, usando renderPartidoCard para respetar el template */}
      {isDrawDay && roundsForDrawDay.length > 0 && (
        <div className="flex flex-col gap-6">
          {roundsForDrawDay.map(({ nombre, partidos }) => (
            <div key={nombre} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ background: `${accentColor}30` }} />
                <p className="text-[13px] font-bold uppercase tracking-widest px-2" style={{ color: accentColor }}>{nombre}</p>
                <div className="h-px flex-1" style={{ background: `${accentColor}30` }} />
              </div>
              {partidos.map((p) => {
                // Adaptar el partido del bracket al shape que espera renderPartidoCard:
                // slot.hora en lugar de p.hora directo, _zona vacío, _n1/_n2 desde seed
                const adaptP = (par) => {
                  if (!par || !par.tbd) return par
                  return { ...par, jugador1: par.label ?? 'Por definir', jugador2: '' }
                }
                const adapted = {
                  ...p,
                  slot: { hora: p.hora, dia: null },
                  _zona: '',
                  _n1: p.pareja1?.seed ?? '',
                  _n2: p.pareja2?.seed ?? '',
                  pareja1: adaptP(p.pareja1),
                  pareja2: adaptP(p.pareja2),
                }
                return renderPartidoCard(adapted)
              })}
            </div>
          ))}
        </div>
      )}

      {isDrawDay && roundsForDrawDay.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className={`text-sm ${isClara ? 'text-gray-400' : 'text-white/30'}`}>Sin partidos asignados para este día.</p>
        </div>
      )}

      {sponsors.length > 0 && (
        <SponsorStrip sponsors={sponsors} accentColor={clrScoreW} />
      )}
    </div>
  )
}

// ── Tab Grupos ────────────────────────────────────────────────────────────────

const TabGrupos = ({ torneo, accentColor, imagenFondo = null, imagenHeader = null, watermark = null, colorTexto = null, cardStyle = 'oscura', colorCard = null,
  templateFixture = 1, colorTextoNombres = null, colorTextoScore = null, canchaName = () => '', puntosPorVictoria = 2, sponsors = [],
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
      ? 'relative rounded-2xl overflow-hidden'
      : (isClara ? 'relative rounded-2xl border border-gray-200 overflow-hidden bg-white' : 'relative rounded-2xl border border-white/8 overflow-hidden'),
    zonaHdr:    tplBg
      ? `flex items-center justify-between px-5 py-3 border-b ${isClara ? 'border-gray-200' : 'border-white/8'}`
      : (isClara ? 'flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200' : 'flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/8'),
    zonaNombre: isClara ? 'text-gray-800 font-semibold text-base' : 'text-white font-semibold text-base',
    catBadge:   isClara ? 'text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md'    : 'text-sm text-white/35 bg-white/5 px-2 py-0.5 rounded-md',
    secBorder:  isClara ? 'border-b border-gray-100'  : 'border-b border-white/5',
    secLabel:   isClara ? 'text-[12px] font-bold text-gray-300 uppercase tracking-widest mb-2.5' : 'text-[12px] font-bold text-white/20 uppercase tracking-widest mb-2.5',
    thCls:      isClara ? 'pb-1.5 text-gray-400 font-semibold text-[12px]' : 'pb-1.5 text-white/20 font-semibold text-[12px]',
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

  const [openCrit, setOpenCrit] = useState(null)
  const fmt    = (n) => n > 0 ? `+${n}` : `${n}`
  const nameOf = (p) => `${p.jugador1.split(' ')[0]} / ${p.jugador2.split(' ')[0]}`

  const zonaCats    = useMemo(() => [...new Set((torneo.grupos ?? []).map((z) => z.categoria).filter(Boolean))], [torneo.grupos])
  const multiCatG   = zonaCats.length > 1
  const catColorMapG = useMemo(() => buildCatColorMap(zonaCats), [zonaCats])
  const [catTabG, setCatTabG] = useState(() => zonaCats[0] ?? null)
  const zonasFiltradas = multiCatG ? (torneo.grupos ?? []).filter((z) => z.categoria === catTabG) : (torneo.grupos ?? [])

  // Partidos colapsables por zona: TODAS arrancan colapsadas (posiciones siempre visibles);
  // el visitante toca "Ver partidos" en la zona que le interesa.
  const zonaKey = (z) => z.nombre + (z.categoria ?? '')
  const [zonasAbiertas, setZonasAbiertas] = useState(() => new Set())
  const toggleZona = (key) => setZonasAbiertas((prev) => {
    const n = new Set(prev)
    n.has(key) ? n.delete(key) : n.add(key)
    return n
  })

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
      {/* Popover criterio clasificación */}
      {openCrit && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenCrit(null)} />
          <div
            className={`fixed z-50 w-56 rounded-xl px-3.5 py-2.5 shadow-xl border ${isClara ? 'bg-white border-gray-200' : 'bg-gray-900 border-white/10'}`}
            style={{
              top: (openCrit.rect.top ?? 0) - 10,
              transform: 'translateY(-100%)',
              left: Math.max(8, (openCrit.rect.right ?? 0) - 224),
            }}
          >
            <p className={`text-[11px] leading-relaxed ${isClara ? 'text-gray-600' : 'text-white/70'}`}>{openCrit.text}</p>
            <div className="absolute top-full" style={{ right: Math.min(224 - 16, (window.innerWidth - (openCrit.rect.right ?? 0)) + (openCrit.rect.width ?? 0) / 2 - 4) }}>
              <div className={`border-4 border-transparent ${isClara ? 'border-t-gray-200' : 'border-t-white/10'}`} />
            </div>
          </div>
        </>
      )}
      <div className="relative h-16 rounded-2xl overflow-hidden shrink-0" style={!imagenHeader ? { background: tplBg ? `${tClrScoreW}18` : 'rgba(255,255,255,0.04)', border: tplBorder ?? (isClara ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.06)') } : undefined}>
        {imagenHeader && (
          <>
            <img src={imagenHeader} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55" />
          </>
        )}
        <div className="relative z-10 h-full flex items-center justify-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: tClrScoreW }} />
          <p className={`font-bold text-xs uppercase tracking-widest ${imagenHeader ? 'text-white opacity-80' : ''}`}
            style={!imagenHeader ? { color: tClrScoreW, opacity: 0.8 } : undefined}>
            Grupos
          </p>
        </div>
      </div>
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
        const s = {}
        zona.parejas.forEach((p) => {
          s[p.id] = { pts: 0, pj: 0, wins: 0, losses: 0, setsA: 0, setsC: 0, gamesA: 0, gamesC: 0 }
        })
        zona.partidos.forEach((m) => {
          if (m.estado !== 'finalizado' || !m.pareja1 || !m.pareja2) return
          if (s[m.pareja1.id]) s[m.pareja1.id].pj++
          if (s[m.pareja2.id]) s[m.pareja2.id].pj++
          if (m.ganador) {
            if (s[m.ganador.id]) { s[m.ganador.id].wins++; s[m.ganador.id].pts += puntosPorVictoria }
            const loserId = m.ganador.id === m.pareja1.id ? m.pareja2.id : m.pareja1.id
            if (s[loserId]) s[loserId].losses++
          }
          ;(m.resultado ?? []).forEach((set) => {
            if (s[m.pareja1.id]) {
              s[m.pareja1.id].setsA  += set.p1 > set.p2 ? 1 : 0
              s[m.pareja1.id].setsC  += set.p1 < set.p2 ? 1 : 0
              s[m.pareja1.id].gamesA += set.p1
              s[m.pareja1.id].gamesC += set.p2
            }
            if (s[m.pareja2.id]) {
              s[m.pareja2.id].setsA  += set.p2 > set.p1 ? 1 : 0
              s[m.pareja2.id].setsC  += set.p2 < set.p1 ? 1 : 0
              s[m.pareja2.id].gamesA += set.p2
              s[m.pareja2.id].gamesC += set.p1
            }
          })
        })
        const standings = [...zona.parejas].sort((a, b) => {
          const sa = s[a.id], sb = s[b.id]
          if (sb.pts !== sa.pts) return sb.pts - sa.pts
          const dsA = sa.setsA - sa.setsC, dsB = sb.setsA - sb.setsC
          if (dsB !== dsA) return dsB - dsA
          return (sb.gamesA - sb.gamesC) - (sa.gamesA - sa.gamesC)
        })
        const getCriterio = (i) => {
          if (i === 0 || standings.length < 2) return null
          const sa = s[standings[i].id], sb = s[standings[i - 1].id]
          if (sa.pts !== sb.pts) return 'Pts'
          if ((sa.setsA - sa.setsC) !== (sb.setsA - sb.setsC)) return 'Dif.S'
          if ((sa.gamesA - sa.gamesC) !== (sb.gamesA - sb.gamesC)) return 'Dif.G'
          return '='
        }
        const getExplicacion = (i) => {
          if (i === 0) return 'Primera posición de la zona.'
          const sa = s[standings[i].id], sb = s[standings[i - 1].id]
          const criterio = getCriterio(i)
          const arriba = nameOf(standings[i - 1])
          if (criterio === 'Pts') return `${arriba} tiene ${sb.pts} pts · esta pareja tiene ${sa.pts} pts.`
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
        const handleCritClick = (e, i, key) => {
          if (openCrit?.key === key) { setOpenCrit(null); return }
          const rect = e.currentTarget.getBoundingClientRect()
          setOpenCrit({ key, text: getExplicacion(i), rect })
        }

        const eqNum = (pareja) => {
          if (!pareja) return null
          const idx = zona.parejas.findIndex((p) => p.id === pareja.id)
          return idx >= 0 ? idx + 1 : null
        }

        const zAbierta = zonasAbiertas.has(zonaKey(zona))

        return (
          <div key={zona.nombre + (zona.categoria ?? '')} className="relative">
          <div className={st.zona} style={cardBg}>
            {/* Watermark logo/imagen de fondo */}
            {watermark && (
              <img
                src={watermark} alt="" aria-hidden
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{ opacity: 0.08, filter: isClara ? 'none' : 'brightness(2)' }}
              />
            )}
            {/* Header zona */}
            <div className={`relative overflow-hidden ${imagenFondo ? 'min-h-[72px]' : ''}`}>
              {imagenFondo && (
                <>
                  <img src={imagenFondo} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-black/50" />
                </>
              )}
              <div className={`relative z-10 ${imagenFondo ? 'flex items-center justify-between px-5 py-4 border-b border-white/10' : st.zonaHdr}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={imagenFondo
                      ? { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }
                      : { background: `linear-gradient(145deg, ${accentColor}, ${accentColor}c0)`, boxShadow: `0 6px 18px -6px ${accentColor}99` }}
                  >
                    {/* brillo superior tipo botón */}
                    {!imagenFondo && <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)' }} />}
                    <span className="relative text-[26px] font-black leading-none tracking-tight" style={{ color: imagenFondo ? (colorTexto ?? '#fff') : (isColorDark(accentColor) ? '#fff' : '#0d1117') }}>
                      {zona.nombre.replace('Zona ','')}
                    </span>
                  </div>
                  <span className={imagenFondo ? 'font-semibold text-base' : st.zonaNombre} style={imagenFondo ? { color: colorTexto ?? '#fff' } : {}}>{zona.nombre}</span>
                  {zona.categoria && <span className={imagenFondo ? 'text-sm bg-white/10 px-2 py-0.5 rounded-md' : st.catBadge} style={imagenFondo ? { color: colorTexto ? colorTexto + 'aa' : 'rgba(255,255,255,0.5)' } : {}}>{zona.categoria}</span>}
                </div>
                {zona.clasificados && (
                  <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-400">
                    <CheckCircle size={12} /> Completada
                  </span>
                )}
              </div>
            </div>

            {/* Posiciones (siempre visible) */}
            <div className={`px-5 pt-4 pb-3 ${st.secBorder}`}>
              <p className={st.secLabel}>Posiciones</p>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className={st.trBorder}>
                    <th className={`${st.thCls} text-left w-7`}>Pos.</th>
                    <th className={`${st.thCls} text-left`}>Pareja</th>
                    <th className={`${st.thCls} text-center w-8`} style={{ color: tClrScoreW }}>Pts</th>
                    <th className={`${st.thCls} text-center w-8`}>PG</th>
                    <th className={`${st.thCls} text-center w-8`}>PP</th>
                    <th className={`${st.thCls} text-center w-10`}>Dif.S</th>
                    <th className={`${st.thCls} text-center w-10`}>Dif.G</th>
                    <th className={`${st.thCls} text-center w-12`}>Crit.</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((pareja, i) => {
                    const st2 = s[pareja.id]
                    const esClasificado = zona.clasificados?.some((c) => c.id === pareja.id)
                    const eliminado = zona.clasificados && !esClasificado
                    const difSets  = st2.setsA - st2.setsC
                    const difGames = st2.gamesA - st2.gamesC
                    const criterio = getCriterio(i)
                    const critCls  = criterio === 'Pts'   ? (isClara ? 'text-blue-600 bg-blue-50 border-blue-200'     : 'text-blue-400 bg-blue-400/10 border-blue-400/20')
                                   : criterio === 'Dif.S' ? (isClara ? 'text-sky-600 bg-sky-50 border-sky-200'         : 'text-sky-400 bg-sky-400/10 border-sky-400/20')
                                   : criterio === 'Dif.G' ? (isClara ? 'text-violet-600 bg-violet-50 border-violet-200': 'text-violet-400 bg-violet-400/10 border-violet-400/20')
                                   : criterio === '='     ? (isClara ? 'text-amber-600 bg-amber-50 border-amber-200'   : 'text-amber-400 bg-amber-400/10 border-amber-400/20')
                                   : ''
                    return (
                      <tr key={pareja.id} className={st.trRowBorder}>
                        <td className={st.rankNum}>{i+1}°</td>
                        <td className="py-2">
                          <span className={esClasificado ? st.nameClasif : eliminado ? st.nameOut : st.nameNeutro}>
                            {pareja.jugador1} / {pareja.jugador2}
                          </span>
                          {esClasificado && zona.clasificados && <span className="ml-1.5 text-[11px] text-emerald-400">✓</span>}
                        </td>
                        <td className="py-2 text-center font-bold tabular-nums" style={{ color: tClrScoreW }}>{st2.pts}</td>
                        <td className="py-2 text-center font-semibold text-emerald-400">{st2.wins}</td>
                        <td className={`${st.statCell} text-center`}>{st2.losses}</td>
                        <td className={`py-2 text-center font-semibold tabular-nums ${difSets  > 0 ? 'text-emerald-400' : difSets  < 0 ? 'text-red-400' : st.statCell}`}>{difSets  > 0 ? `+${difSets}`  : difSets}</td>
                        <td className={`py-2 text-center font-semibold tabular-nums ${difGames > 0 ? 'text-sky-400'     : difGames < 0 ? 'text-red-400' : st.statCell}`}>{difGames > 0 ? `+${difGames}` : difGames}</td>
                        <td className="py-2 text-center">
                          <button
                            onClick={(e) => handleCritClick(e, i, `${zona.nombre}-${i}`)}
                            className={`text-[11px] font-bold border rounded px-1.5 py-0.5 transition-opacity hover:opacity-70 ${criterio ? critCls : 'opacity-0 cursor-default'}`}
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

            {/* Partidos (colapsables — Posiciones queda siempre visible) */}
            <div className="px-5 py-4">
              <button
                onClick={() => toggleZona(zonaKey(zona))}
                className="group flex items-center justify-between w-full mb-1"
              >
                <span className={st.secLabel}>
                  Partidos <span style={{ opacity: 0.45 }}>· {zona.partidos.length}</span>
                </span>
                <span
                  className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full transition-all group-hover:brightness-125 group-active:scale-95"
                  style={{ color: accentColor, background: `${accentColor}1f`, border: `1px solid ${accentColor}3d` }}
                >
                  {zAbierta ? 'Ocultar' : 'Ver partidos'}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${zAbierta ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {zAbierta && (
              <div className="flex flex-col gap-2">
              {zona.partidos.map((m) => {
                const n1         = eqNum(m.pareja1)
                const n2         = eqNum(m.pareja2)
                const finalizado = m.estado === 'finalizado'
                const ganP1      = m.ganador?.id === m.pareja1?.id
                const ganP2      = m.ganador?.id === m.pareja2?.id
                const ganN = ganP1 ? n1 : ganP2 ? n2 : null

                return (
                  <div key={m.id} className={finalizado ? st.matchCardFin : st.matchCard}>
                    <div className={`${finalizado ? st.matchBodyFin : st.matchBody} !flex !flex-col !items-stretch gap-1.5`}>
                      {/* Fila P1 — seed + nombre (izq) · games por set (der) */}
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n1 ?? '?'}</span>
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold leading-tight"
                          style={{ color: ganP1 ? tNameW : finalizado ? tNameL : tNameW, opacity: ganP2 && finalizado ? 0.5 : 1 }}>
                          {m.pareja1 ? `${m.pareja1.jugador1.split(' ')[0]} / ${m.pareja1.jugador2.split(' ')[0]}` : '—'}
                        </span>
                        {finalizado && m.resultado?.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            {m.resultado.map((s, i) => (
                              <span key={i} className="w-5 text-center text-[15px] font-mono font-bold tabular-nums"
                                style={{ color: s.p1 > s.p2 ? tClrScoreW : tClrScoreL }}>{s.p1}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Fila P2 */}
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n2 ?? '?'}</span>
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold leading-tight"
                          style={{ color: ganP2 ? tNameW : finalizado ? tNameL : tNameW, opacity: ganP1 && finalizado ? 0.5 : 1 }}>
                          {m.pareja2 ? `${m.pareja2.jugador1.split(' ')[0]} / ${m.pareja2.jugador2.split(' ')[0]}` : '—'}
                        </span>
                        {finalizado && m.resultado?.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            {m.resultado.map((s, i) => (
                              <span key={i} className="w-5 text-center text-[15px] font-mono font-bold tabular-nums"
                                style={{ color: s.p2 > s.p1 ? tClrScoreW : tClrScoreL }}>{s.p2}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Footer horario */}
                    <div className={st.ftBorder}>
                      {m.slot
                        ? <span className="text-[13px] font-medium" style={{ color: tClrScoreW }}>{m.slot.dia} · {m.slot.hora ?? m.slot.franja.split('(')[0].trim()}</span>
                        : <span className="text-[12px]" style={{ color: tClrScoreL }}>Sin horario</span>
                      }
                      {finalizado && ganN !== null
                        ? <span className="text-[12px] font-bold text-emerald-400">✓ P{ganN} ganó</span>
                        : <span className="text-[10px]" style={{ color: tClrScoreL }}>pendiente</span>
                      }
                    </div>
                  </div>
                )
              })}
              </div>
              )}
            </div>
          </div>
          </div>
        )
      })}

      {sponsors.length > 0 && (
        <SponsorStrip sponsors={sponsors} accentColor={accentColor} />
      )}
    </div>
  )
}

// ── Tab Draw ──────────────────────────────────────────────────────────────────


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
      bracketTemplate={torneo.bracketTemplate ?? 'default'}
      cardLayoutOverride="stat"
    />
  )
}

// ── TabResumen ────────────────────────────────────────────────────────────────

const TabResumen = ({ torneo, club, accentColor }) => {
  const fmtF = (s) => {
    if (!s) return '—'
    const [y, m, d] = s.split('-')
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${Number(d)} ${meses[Number(m)-1]} ${y}`
  }
  const inscriptos  = (torneo.inscriptos ?? []).filter((p) => p.estado === 'inscripto')
  const hasPremios  = torneo.premioPrimero || torneo.premioSegundo || torneo.premioSemifinal || torneo.premioExtra
  const categorias  = torneo.categorias ?? []
  const imagenHero  = torneo.imagenFondoFixture || torneo.imagenFondoGrupos || null

  // Campeones + subcampeones por categoría (solo torneo finalizado con final cargada)
  const isFinished = torneo.estado === 'finished'
  const nombrePareja = (p) =>
    p ? `${p.jugador1 ?? ''}${p.jugador2 ? ` / ${p.jugador2}` : ''}`.trim() : '—'
  const campeonesPorCat = (() => {
    const out = []
    Object.entries(torneo.brackets ?? {}).forEach(([cat, bracketObj]) => {
      const rondas = Array.isArray(bracketObj) ? bracketObj : (bracketObj?.rondas ?? [])
      const finalRonda = rondas.find((r) => r.nombre === 'Final') ?? rondas[rondas.length - 1]
      const finalMatch = finalRonda?.partidos?.[0]
      if (!finalMatch?.ganador || finalMatch.estado !== 'finalizado') return
      const { ganador, pareja1, pareja2, resultado } = finalMatch
      const campeonEsP1 = ganador.id === pareja1?.id
      out.push({
        cat,
        campeon: ganador,
        subcampeon: campeonEsP1 ? pareja2 : pareja1,
        campeonEsP1,
        resultado: Array.isArray(resultado) ? resultado : [],
      })
    })
    return out
  })()
  const hayCampeones = isFinished && campeonesPorCat.length > 0

  return (
    <div className="flex flex-col gap-6">
    <div className="flex flex-col lg:flex-row gap-5 items-start">

      {/* ── Hero izquierda ── */}
      <div className="w-full lg:w-[55%] shrink-0">
        <div className="relative rounded-2xl overflow-hidden aspect-square sm:aspect-[4/3] lg:aspect-square"
          style={{ background: imagenHero ? undefined : `linear-gradient(135deg, #0d1117 60%, ${accentColor}22)`, border: `1px solid ${accentColor}25` }}>
          {imagenHero ? (
            <img src={imagenHero} alt={torneo.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              {club.logo ? (
                <img src={club.logo} alt={club.nombre} className="w-24 h-24 rounded-2xl object-cover border border-white/10" />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center border border-white/10"
                  style={{ background: `${accentColor}20` }}>
                  <Trophy size={32} style={{ color: accentColor }} />
                </div>
              )}
              <div className="text-center">
                <p className="text-white font-bold text-2xl leading-tight">{torneo.nombre}</p>
                {club.nombre && <p className="text-white/40 text-sm mt-1">{club.nombre}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {isFinished ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(212,175,55,0.14)', color: '#e8c860', border: '1px solid rgba(212,175,55,0.35)' }}>
                    <Trophy size={11} />
                    Finalizado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                    En curso
                  </span>
                )}
                <span className="text-white/30 text-xs">
                  {fmtF(torneo.fechaInicio)} → {fmtF(torneo.fechaReprogramada || torneo.fechaFin)}
                </span>
              </div>
            </div>
          )}
          {/* overlay gradient bottom */}
          {imagenHero && (
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 gap-1">
              <p className="text-white font-bold text-lg leading-tight">{torneo.nombre}</p>
              {club.nombre && <p className="text-white/50 text-xs">{club.nombre}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar derecha ── */}
      <div className="w-full lg:flex-1 flex flex-col gap-4">

        {/* Premios */}
        {hasPremios && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Trophy size={13} style={{ color: accentColor }} />
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50">Premios</p>
            </div>
            <div className="flex flex-col gap-2">
              {torneo.premioPrimero && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-amber-400 shrink-0 mt-0.5">1er puesto</span>
                  <span className="text-sm text-white/70">{torneo.premioPrimero}</span>
                </div>
              )}
              {torneo.premioSegundo && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mt-0.5">2do puesto</span>
                  <span className="text-sm text-white/70">{torneo.premioSegundo}</span>
                </div>
              )}
              {torneo.premioSemifinal && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-white/30 shrink-0 mt-0.5">Semifinal</span>
                  <span className="text-sm text-white/50">{torneo.premioSemifinal}</span>
                </div>
              )}
              {torneo.premioExtra && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-white/30 shrink-0 mt-0.5">Premio extra</span>
                  <span className="text-sm text-white/50">{torneo.premioExtra}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Descripción */}
        {torneo.descripcion && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={13} style={{ color: accentColor }} />
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50">Descripción</p>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{torneo.descripcion}</p>
          </div>
        )}

        {/* Categorías */}
        {categorias.length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Tag size={13} style={{ color: accentColor }} />
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50">Categorías</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <span key={cat} className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sede */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={13} style={{ color: accentColor }} />
            <p className="text-[11px] uppercase tracking-widest font-bold text-white/50">Sede</p>
          </div>
          <div className="flex items-center gap-3">
            {club.logo && (
              <img src={club.logo} alt={club.nombre} className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold text-white/80">{club.nombre || '—'}</p>
              <div className="flex flex-wrap gap-x-3 mt-1">
                <span className="text-xs text-white/40">{torneo.formato}</span>
                {torneo.genero && <span className="text-xs text-white/40">{torneo.genero}</span>}
                <span className="text-xs text-white/40">{inscriptos.length} parejas</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* ── Sección CAMPEONES (solo torneo finalizado con final cargada) ── */}
    {hayCampeones && (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
        <style>{`
          @keyframes champFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
          @keyframes champShine { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
          @keyframes champGlowPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } }
          @keyframes champTrophyFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        `}</style>

        {/* Glow dorado de fondo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)',
            animation: 'champGlowPulse 4s ease-in-out infinite',
          }}
        />
        {/* Línea de acento dorada superior */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #d4af37 50%, transparent 100%)' }} />

        <div className="relative px-4 py-8 sm:py-10">
          {/* Encabezado */}
          <div className="text-center mb-7" style={{ animation: 'champFadeUp 0.6s ease-out both' }}>
            <div className="inline-flex items-center gap-2.5 mb-1.5">
              <span className="h-px w-8 sm:w-14" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.7))' }} />
              <Trophy size={15} style={{ color: '#e8c860', animation: 'champShine 2.6s ease-in-out infinite' }} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: '#e8c860' }}>
                Torneo Finalizado
              </span>
              <Trophy size={15} style={{ color: '#e8c860', animation: 'champShine 2.6s ease-in-out infinite 0.4s' }} />
              <span className="h-px w-8 sm:w-14" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.7), transparent)' }} />
            </div>
          </div>

          {/* Una fila de campeones por categoría */}
          <div className="space-y-9">
            {campeonesPorCat.map(({ cat, campeon, subcampeon, campeonEsP1, resultado }, idx) => (
              <div key={cat} style={{ animation: `champFadeUp 0.6s ease-out ${0.15 + idx * 0.12}s both` }}>
                {/* Etiqueta de categoría */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="h-px w-6 bg-white/10" />
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                    <Tag size={9} /> {cat}
                  </span>
                  <span className="h-px w-6 bg-white/10" />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  {/* ── Tarjeta CAMPEÓN (oro, destacada) ── */}
                  <div
                    className="relative flex-1 sm:max-w-[340px] rounded-2xl px-5 py-5 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.16) 0%, rgba(20,15,3,0.6) 55%)',
                      border: '1px solid rgba(212,175,55,0.45)',
                      boxShadow: '0 8px 40px rgba(212,175,55,0.14), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Brillo de esquina */}
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)' }} />

                    <div className="relative flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f4e08a 0%, #d4af37 60%, #9c7a1e 100%)', boxShadow: '0 2px 12px rgba(212,175,55,0.5)', animation: 'champTrophyFloat 3.2s ease-in-out infinite' }}>
                        <Crown size={20} style={{ color: '#3a2c05' }} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: '#e8c860' }}>
                        Campeones
                      </span>
                    </div>

                    <p className="relative text-white font-black leading-relaxed tracking-wide text-lg sm:text-xl">
                      {nombrePareja(campeon)}
                    </p>
                  </div>

                  {/* ── Resultado de la final (centro): sets en casilleros ── */}
                  {resultado.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 px-1 shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Final</span>
                      <div className="flex gap-1.5">
                        {resultado.map((s, i) => {
                          const cg = campeonEsP1 ? s.p1 : s.p2
                          const sg = campeonEsP1 ? s.p2 : s.p1
                          return (
                            <div key={i} className="flex flex-col gap-0.5 text-center">
                              <span className="w-7 h-7 flex items-center justify-center rounded text-sm font-black"
                                style={{ background: 'rgba(212,175,55,0.18)', color: '#e8c860', border: '1px solid rgba(212,175,55,0.4)' }}>
                                {cg}
                              </span>
                              <span className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-white/40"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {sg}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Tarjeta SUBCAMPEÓN (plata) ── */}
                  <div
                    className="relative flex-1 sm:max-w-[340px] rounded-2xl px-5 py-5 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(190,196,204,0.10) 0%, rgba(15,18,22,0.55) 55%)',
                      border: '1px solid rgba(190,196,204,0.28)',
                    }}
                  >
                    {/* Brillo de esquina */}
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgba(190,196,204,0.20) 0%, transparent 70%)' }} />

                    <div className="relative flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #e2e6ea 0%, #aab0b8 60%, #71777f 100%)', boxShadow: '0 2px 12px rgba(190,196,204,0.35)' }}>
                        <Medal size={20} style={{ color: '#3a3e44' }} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
                        Subcampeones
                      </span>
                    </div>

                    <p className="relative text-white/85 font-black leading-relaxed tracking-wide text-lg sm:text-xl">
                      {nombrePareja(subcampeon)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'resumen', label: 'Resumen',         icon: LayoutGrid },
  { key: 'fixture', label: 'Fixture', icon: Calendar },
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
    updatedAt:            data.updatedAt ?? null,
    fechaInicio:          data.fechaInicio,
    fechaFin:             data.fechaFin,
    fechaReprogramada:    data.fechaReprogramada ?? null,
    categorias:           data.categorias           ?? [],
    genero:               data.genero               ?? null,
    canchasAsignadas:     data.canchasAsignadas      ?? [],
    grupos:               data.grupos               ?? null,
    brackets:             data.brackets             ?? {},
    puntosPorVictoria:    data.puntosPorVictoria     ?? 2,
    descripcion:          data.descripcion          ?? null,
    formato:              data.formato              ?? null,
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
    bracketTemplate:      p.bracketTemplate          ?? 'default',
    bracketConnColor:     p.bracketConnColor         ?? null,
    bracketConnGlow:      p.bracketConnGlow          ?? true,
    bracketWatermark:     p.bracketWatermark         ?? null,
    bracketWatermarkOculto: p.bracketWatermarkOculto ?? false,
    bracketFondoColor:    p.bracketFondoColor        ?? null,
    drawMostrarGenero:    p.drawMostrarGenero        ?? true,
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

  const torneos             = useTorneosStore((s) => s.torneos)
  const upsertTorneoFromApi = useTorneosStore((s) => s.upsertTorneoFromApi)
  const club               = useClubStore((s) => s.club)
  const _loaded            = useClubStore((s) => s._loaded)
  const loadFromBackend    = useClubStore((s) => s.loadFromBackend)
  const canchas            = club.canchas
  const [tab, setTab]      = useState('resumen')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const pollRef            = useRef(null)

  const torneo      = torneos.find((t) => String(t.id) === String(id))
  const accentColor = torneo?.colorAcentoFixture || torneo?.colorAcento || CLUB()

  // Fetch club si no está cargado (visitante directo sin pasar por la landing)
  useEffect(() => {
    if (_loaded) return
    const slug = getClubSlug()
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
        if (!data?.id) { if (initial) setNotFound(true); return }
        const mapped = mapBackendTorneoPublico(data)
        upsertTorneoFromApi(mapped)
        // Esperar dos frames: uno para que Zustand propague el store,
        // otro para que React renderice con los datos correctos ANTES de ocultar el loading.
        if (initial) requestAnimationFrame(() => requestAnimationFrame(() => setLoading(false)))
      } catch {
        if (initial) { setNotFound(true); setLoading(false) }
      }
    }

    // Siempre fetch al montar para tener datos frescos (template, resultados, horarios)
    fetchTorneo(true)

    // Polling cada 30s para mantener datos en tiempo real
    pollRef.current = setInterval(() => { if (!document.hidden) fetchTorneo(false) }, 30_000)
    return () => clearInterval(pollRef.current)
  }, [id])

  const canchaName = (canchaId) =>
    canchas.find((c) => String(c.id) === String(canchaId))?.nombre ?? `Cancha ${canchaId}`


  if (loading) {
    const cachedName = torneos.find((t) => String(t.id) === id)?.nombre
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center relative overflow-hidden">
        <style>{`
          @keyframes scanLine {
            0%   { top: -4px; opacity: 0; }
            5%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          @keyframes tplSlideUp {
            0%   { transform: translateY(24px); opacity: 0; }
            100% { transform: translateY(0);    opacity: 1; }
          }
          @keyframes tplFillBar {
            0%   { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes tplGlitch {
            0%,88%,100% { transform: translate(0,0); clip-path: none; }
            90% { transform: translate(-3px, 1px); }
            92% { transform: translate(3px,-1px); clip-path: inset(30% 0 40% 0); }
            94% { transform: translate(-2px, 2px); clip-path: none; }
          }
          @keyframes cornerPulse {
            0%,100% { opacity: 0.3; }
            50%      { opacity: 0.8; }
          }
        `}</style>

        {/* Grid de fondo */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(color-mix(in srgb, var(--club-primary) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--club-primary) 4%, transparent) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        {/* Línea de escaneo */}
        <div className="absolute left-0 right-0 h-[2px] pointer-events-none" style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--club-primary) 40%, #ffffff 50%, var(--club-primary) 60%, transparent 100%)',
          animation: 'scanLine 1.8s ease-in-out infinite',
          boxShadow: '0 0 12px 2px color-mix(in srgb, var(--club-primary) 50%, transparent)',
        }} />

        {/* Corner brackets */}
        {[['top-6 left-6','border-t-2 border-l-2'],['top-6 right-6','border-t-2 border-r-2'],['bottom-6 left-6','border-b-2 border-l-2'],['bottom-6 right-6','border-b-2 border-r-2']].map(([pos, cls], i) => (
          <div key={i} className={`absolute w-6 h-6 border-club ${pos} ${cls}`}
            style={{ animation: `cornerPulse 2s ease-in-out ${i * 0.3}s infinite` }} />
        ))}

        {/* Contenido central */}
        <div className="relative flex flex-col items-center gap-5 px-8">
          {/* Badge EN CURSO */}
          <div className="flex items-center gap-2" style={{ animation: 'tplSlideUp 0.5s ease-out 0.1s both' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--club-primary)' }} />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">En curso</span>
            <span className="text-white/15 mx-1">·</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Torneo</span>
          </div>

          {/* Nombre del torneo */}
          <h1
            className="text-4xl sm:text-5xl font-black uppercase text-white text-center leading-none"
            style={{
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              animation: 'tplSlideUp 0.5s ease-out 0.2s both, tplGlitch 3.5s ease-in-out 1s infinite',
              textShadow: '0 0 40px color-mix(in srgb, var(--club-primary) 15%, transparent)',
            }}
          >
            {cachedName ?? 'TORNEO'}
          </h1>

          {/* Barra de progreso */}
          <div style={{ animation: 'tplSlideUp 0.5s ease-out 0.35s both', width: '100%', maxWidth: 280 }}>
            <div className="h-[2px] bg-white/6 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{
                backgroundColor: 'var(--club-primary)',
                animation: 'tplFillBar 2.2s cubic-bezier(0.4,0,0.2,1) 0.4s both',
                boxShadow: '0 0 8px color-mix(in srgb, var(--club-primary) 60%, transparent)',
              }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Visible si está en curso o finalizado (los finalizados quedan accesibles de forma
  // permanente — se listan en la sección "Finalizados" de la landing).
  const torneoVisible = torneo
    ? (torneo.estado === 'in_progress' || torneo.estado === 'finished')
    : false

  if (notFound || (torneo && !torneoVisible)) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-6">
        <div className="text-center">
          <Trophy size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-semibold">Torneo no disponible</p>
          <p className="text-white/20 text-sm mt-1">Este torneo no está activo o no existe.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 text-sm text-club hover:text-[#c8e00d] transition-colors"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!torneo) return null

  const isFinished = torneo.estado === 'finished'

  return (
    <div className="min-h-screen bg-[#0d1117]" style={{ animation: 'pageFadeIn 0.3s ease-out both' }}>
      <style>{`@keyframes pageFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Header sticky */}
      <div className="sticky top-0 z-30">
        {/* Línea de acento superior */}
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${accentColor} 40%, ${accentColor} 60%, transparent 100%)` }} />

        <div className="bg-[#0d1117]/96 backdrop-blur-md border-b border-white/[0.06]">
          {/* Fila título */}
          <div className="relative pt-3 pb-2.5">
            {/* Logo flotante — solo desktop (sm+) */}
            {club?.logo && (
              <button
                onClick={() => navigate('/')}
                className="hidden sm:block absolute left-4 bottom-0 translate-y-1/2 z-10 hover:opacity-80 transition-opacity"
                title="Volver"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/20">
                  <img src={club.logo} alt={club.nombre} className="w-full h-full object-cover" />
                </div>
              </button>
            )}

            {/* Contenido centrado */}
            <div className="max-w-4xl mx-auto px-4 flex items-center gap-3">
              {/* Botón volver: siempre en mobile / oculto en desktop si hay logo */}
              <button
                onClick={() => navigate('/')}
                className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all shrink-0 ${club?.logo ? 'sm:hidden' : ''}`}
              >
                <ArrowLeft size={15} />
              </button>

              {/* Separador vertical — solo desktop si hay logo */}
              <div className={`w-px h-6 bg-white/10 shrink-0 ${club?.logo ? 'hidden sm:block' : ''}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isFinished ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                      style={{ backgroundColor: 'rgba(212,175,55,0.14)', color: '#e8c860', border: '1px solid rgba(212,175,55,0.35)' }}
                    >
                      <Trophy size={9} />
                      Finalizado
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                      style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
                    >
                      <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                      En curso
                    </span>
                  )}
                </div>
                <h1 className="text-white font-bold text-sm leading-tight truncate">{torneo.nombre}</h1>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                    <Calendar size={9} />
                    <span className="opacity-60">Inicio</span>
                    {fmtFecha(torneo.fechaInicio)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${torneo.fechaReprogramada ? 'line-through text-white/25 bg-white/5 border border-white/10' : 'text-red-400 bg-red-400/10 border border-red-400/25'}`}>
                    <Flag size={9} />
                    <span className="opacity-60">Fin</span>
                    {fmtFecha(torneo.fechaFin)}
                  </span>
                  {torneo.fechaReprogramada && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30">
                      <Flag size={9} />
                      <span className="opacity-70">Reprogr.</span>
                      {fmtFecha(torneo.fechaReprogramada)}
                    </span>
                  )}
                </div>
                {torneo.categorias?.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium text-white/35 bg-white/5 border border-white/8">
                    <Tag size={9} />
                    {torneo.categorias.join(' · ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs pill — scrolleable en mobile para no desbordar el ancho de la pantalla */}
          <div className="max-w-4xl mx-auto px-4 pb-2.5">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.05] rounded-2xl p-1 sm:p-1.5 w-fit max-w-full overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-all shrink-0 whitespace-nowrap"
                  style={tab === key
                    ? { backgroundColor: accentColor, color: '#0d1117' }
                    : { color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido fixture / grupos / resumen — ancho normal */}
      {tab !== 'draw' && (
        <div className="max-w-4xl mx-auto w-full px-4 py-6">
          {tab === 'resumen'  && <TabResumen torneo={torneo} club={club} accentColor={accentColor} onGoTab={setTab} />}
          {tab === 'fixture' && <TabFixture torneo={torneo} canchaName={canchaName} accentColor={accentColor} imagenFondo={torneo.imagenFondoFixture ?? null} sponsorLogo={torneo.sponsorLogoFixture ?? null} sponsors={torneo.sponsorsFixture ?? []} cardStyle={torneo.estiloCardFixture ?? 'oscura'} colorCard={torneo.colorCardFixture ?? null} templateFixture={torneo.templateFixture ?? 1} colorTextoNombres={torneo.colorTextoNombres ?? null} colorTextoZona={torneo.colorTextoZona ?? null} colorTextoCategoria={torneo.colorTextoCategoria ?? null} colorTextoScore={torneo.colorTextoScore ?? null} colorTextoInfo={torneo.colorTextoInfo ?? null} />}
          {tab === 'grupos'  && <TabGrupos  torneo={torneo} accentColor={accentColor} imagenFondo={torneo.imagenFondoGrupos ?? null} imagenHeader={torneo.imagenHeaderGrupos ?? null} watermark={torneo.imagenWatermarkGrupos ?? null} colorTexto={torneo.colorTextoCardGrupos ?? null} cardStyle={torneo.estiloCardGrupos ?? 'oscura'} colorCard={torneo.colorCardGrupos ?? null} templateFixture={torneo.templateFixture ?? 1} colorTextoNombres={torneo.colorTextoNombres ?? null} colorTextoScore={torneo.colorTextoScore ?? null} canchaName={canchaName} puntosPorVictoria={torneo.puntosPorVictoria ?? 2} sponsors={torneo.sponsorsGrupos ?? []} />}
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
