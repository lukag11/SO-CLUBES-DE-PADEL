// Secciones reutilizables para todos los templates de landing
// Galería, Servicios, Staff, FAQ, TurnosDisponibles — cada template las importa y adapta su wrapper visual

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ShowerHead, Car, GraduationCap, Wifi, Coffee,
  Dumbbell, Shield, Wind, Utensils, Music, Wrench,
  CalendarDays, CheckCircle, Lock, Trophy, Zap, Users, Medal, Swords, UserPlus,
  MapPin, Phone, Navigation, ArrowRight, Clock, X,
} from 'lucide-react'
import usePlayerStore from '../../store/playerStore'
import useTorneosStore from '../../store/torneosStore'
import { overlaps, generateFranjas, toMin } from '../../utils/timeUtils'
import MapaUbicacion from '../../components/ubicacion/MapaUbicacion'
import Reveal from '../../components/ui/Reveal'

// Encabezado de sección unificado: display Anton en mayúscula + aparición al scrollear.
export const SectionTitle = ({ titulo, subtitulo, dark = true }) => (
  <Reveal className="text-center mb-12">
    <h2 className={`font-display uppercase text-4xl md:text-5xl tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{titulo}</h2>
    {subtitulo && <p className={`mt-3 ${dark ? 'text-white/40' : 'text-slate-500'}`}>{subtitulo}</p>}
  </Reveal>
)

// Íconos de marca (SVG). Usan currentColor → toman el color del contenedor.
const WhatsAppIcon = ({ size = 17, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
)
const InstagramIcon = ({ size = 17, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
)
const FacebookIcon = ({ size = 17, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
)
const limpiarHandle = (v) => (v || '').trim().replace(/^@/, '')
const urlInsta = (v) => { const h = limpiarHandle(v); return h.startsWith('http') ? h : `https://instagram.com/${h}` }
const urlFace = (v) => { const h = (v || '').trim(); return h.startsWith('http') ? h : `https://facebook.com/${h}` }

// ─── TorneoBanner ─────────────────────────────────────────────────────────────

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtFechaTorneo = (s) => { const [,m,d] = s.split('-').map(Number); return `${d} ${MESES_CORTOS[m-1]}` }

export const TorneoBanner = ({ colorPrimario = '#afca0b', dark = true }) => {
  const torneos = useTorneosStore((s) => s.torneos)

  const torneo = useMemo(() => {
    const hoy = new Date()
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const lim = new Date(hoy)
    lim.setDate(lim.getDate() + 5)
    const limStr = `${lim.getFullYear()}-${String(lim.getMonth() + 1).padStart(2, '0')}-${String(lim.getDate()).padStart(2, '0')}`
    return torneos.find((t) => t.estado === 'in_progress' && t.fechaInicio <= limStr && t.fechaFin >= hoyStr) ?? null
  }, [torneos])

  if (!torneo) return null

  return (
    <section className="py-12 px-6 relative overflow-hidden" style={{ background: dark ? '#0d1117' : 'linear-gradient(135deg,#f1f5f9 0%,#ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className={`relative rounded-3xl overflow-hidden border p-8 ${dark ? 'border-white/8 bg-white/3' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: colorPrimario, opacity: 0.06 }} />

          <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">

            {/* Trophy + datos del torneo */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${colorPrimario}18`, border: `1px solid ${colorPrimario}30` }}>
                <Trophy size={24} style={{ color: colorPrimario }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: colorPrimario }}>Torneo en curso</span>
                </div>
                <h3 className={`text-xl font-bold leading-snug ${dark ? 'text-white' : 'text-slate-900'}`}>{torneo.nombre}</h3>
                <p className={`text-xs mt-1 ${dark ? 'text-white/35' : 'text-slate-400'}`}>
                  {fmtFechaTorneo(torneo.fechaInicio)} → {fmtFechaTorneo(torneo.fechaFin)}
                  {torneo.categorias?.length > 0 && <> · {torneo.categorias.join(', ')}</>}
                  {torneo.inscriptos?.length > 0 && <> · {torneo.inscriptos.length} {torneo.inscriptos.length === 1 ? 'pareja' : 'parejas'}</>}
                </p>
              </div>
            </div>

            <div className={`hidden md:block w-px self-stretch ${dark ? 'bg-white/6' : 'bg-slate-100'}`} />

            {/* Invitación */}
            <div className="flex-1">
              <p className={`text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-slate-600'}`}>
                Este fin de semana las canchas están reservadas para el torneo.{' '}
                <span className={`font-medium ${dark ? 'text-white/80' : 'text-slate-800'}`}>No hay turnos disponibles esos días</span>,
                {' '}pero el torneo es abierto a todos —{' '}
                <span style={{ color: colorPrimario }} className="font-semibold">
                  vení a alentar, disfrutar del ambiente y ser parte del club.
                </span>
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ─── AmericanoSuper8Section ───────────────────────────────────────────────────
// Publicidad de la herramienta gratuita self-service (/eventos). Sin login.
// Respeta colorPrimario + dark para encajar en cualquier template.
export const AmericanoSuper8Section = ({ colorPrimario = '#afca0b', dark = true }) => {
  const navigate = useNavigate()

  const modos = [
    { icon: Zap, titulo: 'Americano', desc: 'Jugás con todos, las parejas rotan. Ranking individual.' },
    { icon: Users, titulo: 'Super 8', desc: 'Parejas fijas, todos contra todos. Ranking por pareja.' },
  ]

  return (
    <section id="americano-super8" className="py-14 px-6 relative overflow-hidden"
      style={{ background: dark ? '#0d1117' : 'linear-gradient(135deg,#f1f5f9 0%,#ffffff 100%)' }}>
      {/* glow ambiental de la sección */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: colorPrimario, opacity: 0.06 }} />

      <div className="relative max-w-5xl mx-auto">
        {/* Header centrado */}
        <div className="text-center max-w-2xl mx-auto mb-9">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full"
            style={{ color: colorPrimario, backgroundColor: `${colorPrimario}18`, border: `1px solid ${colorPrimario}30` }}>
            La herramienta es gratis
          </span>
          <h2 className={`text-2xl md:text-4xl font-bold leading-tight mt-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Armá tu <span style={{ color: colorPrimario }}>Americano</span> o <span style={{ color: colorPrimario }}>Super 8</span>
          </h2>
          <p className={`text-sm md:text-base mt-3 leading-relaxed ${dark ? 'text-white/50' : 'text-slate-600'}`}>
            ¿Se juntan a jugar? Organizá el fixture y llevá el ranking en vivo desde el celu, en segundos. Sin planillas.
          </p>
        </div>

        {/* Dos formatos enfrentados */}
        <div className="relative grid md:grid-cols-2 gap-4 md:gap-5">
          {modos.map(({ icon: Icon, titulo, desc }) => (
            <div
              key={titulo}
              className={`group relative rounded-3xl border p-6 md:p-8 flex flex-col transition-all duration-200 hover:-translate-y-1 ${dark ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/15' : 'border-slate-200 bg-white shadow-sm hover:shadow-md'}`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${colorPrimario}18` }}>
                <Icon size={22} style={{ color: colorPrimario }} />
              </div>
              <h3 className={`text-xl font-bold mt-4 ${dark ? 'text-white' : 'text-slate-900'}`}>{titulo}</h3>
              <p className={`text-sm mt-2 leading-relaxed flex-1 ${dark ? 'text-white/45' : 'text-slate-500'}`}>{desc}</p>
              <button
                onClick={() => navigate('/eventos')}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-2xl text-sm transition-all active:scale-[0.98]"
                style={{ backgroundColor: `${colorPrimario}14`, color: colorPrimario, border: `1px solid ${colorPrimario}30` }}
              >
                Armar {titulo} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}

          {/* Divisor "o" en el centro (desktop) */}
          <div
            className={`hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full items-center justify-center text-sm font-black ${dark ? 'text-white/60' : 'text-slate-500'}`}
            style={{ backgroundColor: dark ? '#0d1117' : '#ffffff', border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}` }}
          >
            o
          </div>
        </div>

        <p className={`text-center text-[11px] mt-5 ${dark ? 'text-white/30' : 'text-slate-400'}`}>
          Gratis · registrate para invitar
        </p>
      </div>
    </section>
  )
}

// ─── PartidosAbiertosSection ─────────────────────────────────────────────────
// Captación: partidos abiertos del club (matching de 4). El motor real es el link por WhatsApp
// + el push a la categoría (ver bibliotecario); este banner es descubrimiento + marca.
export const PartidosAbiertosSection = ({ colorPrimario = '#afca0b', dark = true }) => {
  const navigate = useNavigate()
  const pasos = [
    { icon: Swords, t: 'Buscás', d: 'Partidos abiertos de tu categoría' },
    { icon: Zap, t: 'Decís «¡Voy!»', d: 'El organizador confirma tu lugar' },
    { icon: CheckCircle, t: 'A la cancha', d: 'Te sumás sin armar grupo' },
  ]
  return (
    <section id="partidos-abiertos" className="py-16 px-6 relative overflow-hidden"
      style={{ background: dark ? '#0d1117' : '#f8fafc' }}>
      {/* glow lateral (distinto al banner de Americano, que es un recuadro) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(55% 80% at 90% 40%, ${colorPrimario}14, transparent 60%)` }} />
      <div className="relative max-w-4xl mx-auto text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full mb-4"
          style={{ color: colorPrimario, backgroundColor: `${colorPrimario}18`, border: `1px solid ${colorPrimario}30` }}>
          Sumate y jugá
        </span>
        <h2 className={`text-3xl md:text-4xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
          ¿Te falta un cuarto?
        </h2>
        <p className={`text-sm md:text-base mt-3 max-w-xl mx-auto leading-relaxed ${dark ? 'text-white/50' : 'text-slate-600'}`}>
          No dependas del grupo de WhatsApp. Mirá los partidos abiertos del club, sumate al que va con tu nivel y a jugar.
        </p>

        {/* 3 pasos numerados (layout propio: centrado, en fila) */}
        <div className="grid sm:grid-cols-3 gap-3 mt-9">
          {pasos.map((p, i) => {
            const Icon = p.icon
            return (
              <div key={i} className={`relative rounded-2xl p-6 border text-left ${dark ? 'border-white/8 bg-white/3' : 'border-slate-200 bg-white'}`}>
                <span className="absolute top-3 right-4 text-3xl font-black tabular-nums leading-none" style={{ color: `${colorPrimario}26`, fontFamily: "'Space Grotesk', sans-serif" }}>{i + 1}</span>
                <span className="w-12 h-12 rounded-2xl grid place-items-center mb-3" style={{ background: `linear-gradient(140deg, ${colorPrimario}, ${colorPrimario}cc)`, boxShadow: `0 8px 22px -8px ${colorPrimario}88` }}>
                  <Icon size={22} style={{ color: dark ? '#0a0f0d' : '#0a0f0d' }} strokeWidth={2.4} />
                </span>
                <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{p.t}</p>
                <p className={`text-xs mt-1 leading-snug ${dark ? 'text-white/45' : 'text-slate-500'}`}>{p.d}</p>
              </div>
            )
          })}
        </div>

        <button onClick={() => navigate('/partidos')}
          className="mt-9 font-bold py-4 px-8 rounded-2xl transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 text-sm"
          style={{ backgroundColor: colorPrimario, color: '#080b0f', boxShadow: `0 12px 32px -10px ${colorPrimario}99` }}>
          <Swords size={17} /> Ver partidos abiertos
        </button>
      </div>
    </section>
  )
}

// ─── TorneosSection ──────────────────────────────────────────────────────────

const DIAS_FLYER = 14

const diasHasta = (fechaStr) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(fechaStr + 'T12:00:00') - hoy) / 86400000)
}

const fmtDiaDestacado = (fechaStr) => {
  const d = new Date(fechaStr + 'T12:00:00')
  const dias = diasHasta(fechaStr)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias <= 6)  return `Este ${['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()]}`
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

// ─── En Curso Card — 20 templates ────────────────────────────────────────────

const renderEnCursoCard = (tplId, { t, cp, dark, colorPrimario, inscriptos, zonas, bigLabel, ctaLabel, navigate, clrCardBg = null, clrTitulo = null, clrTextoSec = null, clrBtnText = null }) => {
  // Colores resueltos con fallback automático
  const autoTitulo   = dark ? '#ffffff' : '#0f172a'
  const autoTextoSec = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.35)'
  const autoBtnText  = '#080b0f'
  const cTitulo   = clrTitulo   || autoTitulo
  const cTextoSec = clrTextoSec || autoTextoSec
  const cBtnText  = clrBtnText  || autoBtnText
  const cats   = t.categorias ?? []
  const fmtRng = `${fmtFechaTorneo(t.fechaInicio)} → ${fmtFechaTorneo(t.fechaFin)}`

  const LiveBadge = ({ color = cp }) => (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-black uppercase"
      style={{ backgroundColor:`${color}20`, color, border:`1px solid ${color}35`, fontSize:11, letterSpacing:'0.14em' }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor:color }} />
      En curso
    </div>
  )

  const CatChips = ({ accent = cp }) => cats.length === 0 ? null : (
    <div className="flex flex-wrap gap-1.5">
      {cats.map((c) => (
        <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ backgroundColor:`${accent}15`, color:accent, border:`1px solid ${accent}28` }}>{c}</span>
      ))}
    </div>
  )

  const nav = () => navigate(`/torneos/${t.id}`)

  switch (tplId) {

    // ── 1 · Sport Hero ───────────────────────────────────────────
    case 1: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background: clrCardBg || (dark ? 'linear-gradient(135deg,#080b0f 0%,#0d1117 60%,#0f1a0c 100%)' : 'linear-gradient(135deg,#f0fdf4 0%,#f8fafc 100%)') }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 right-0" style={{ width:'55%', background:`linear-gradient(120deg,transparent 20%,${cp}0a 100%)`, clipPath:'polygon(12% 0%,100% 0%,100% 100%,0% 100%)' }} />
          <div className="absolute top-6 bottom-6 right-[22%] w-px" style={{ backgroundColor:`${cp}18` }} />
          <div className="absolute top-6 bottom-6 right-[38%] w-px" style={{ backgroundColor:`${cp}10` }} />
          <div className="absolute left-[55%] right-0 top-1/2 h-px" style={{ backgroundColor:`${cp}12` }} />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black italic select-none leading-none pointer-events-none" style={{ fontSize:'clamp(80px,14vw,160px)', color:cp, opacity:0.055, letterSpacing:'-0.04em' }}>{bigLabel.replace('° Categoría','°').replace(' Categoría','°')}</div>
          <div className="absolute right-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px]" style={{ backgroundColor:cp, opacity:0.09 }} />
        </div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-10 items-start md:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-5"><LiveBadge /><div className={`h-px flex-1 max-w-[40px] ${dark?'bg-white/8':'bg-slate-200'}`}/><span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: cTextoSec }}>Torneo</span></div>
            <h2 className="font-black italic uppercase leading-[0.9] tracking-tighter mb-4 break-words" style={{ fontSize:'clamp(30px,4.5vw,56px)', color: cTitulo, textShadow: clrTitulo ? 'none' : (dark ? `0 0 60px ${cp}18` : 'none') }}>{t.nombre}</h2>
            <div className="mb-5"><CatChips /></div>
            <div className="flex items-center gap-6 mb-8">
              <div><span className="text-3xl font-black tabular-nums leading-none block" style={{ color:cp }}>{inscriptos}</span><span className="text-[10px] font-black uppercase tracking-[0.15em] block mt-0.5" style={{ color: cTextoSec }}>Parejas</span></div>
              {zonas!==null&&<><div className={`w-px h-10 ${dark?'bg-white/8':'bg-slate-200'}`}/><div><span className="text-3xl font-black tabular-nums leading-none block" style={{ color: cTitulo }}>{zonas}</span><span className="text-[10px] font-black uppercase tracking-[0.15em] block mt-0.5" style={{ color: cTextoSec }}>Zonas</span></div></>}
            </div>
            <button onClick={nav} className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95" style={{ backgroundColor:cp, color: cBtnText, boxShadow:`0 8px 32px ${cp}45` }}><Zap size={15} strokeWidth={2.5}/>{ctaLabel}</button>
          </div>
          <div className="hidden md:flex items-center justify-center w-40 shrink-0">
            <div className="relative w-28 h-40 rounded" style={{ border:`1.5px solid ${cp}30` }}>
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{backgroundColor:`${cp}22`}}/>
              <div className="absolute left-0 right-0 top-[35%] h-px" style={{backgroundColor:`${cp}18`}}/>
              <div className="absolute left-0 right-0 bottom-[35%] h-px" style={{backgroundColor:`${cp}18`}}/>
              <div className="absolute inset-0 flex items-center justify-center"><Trophy size={26} style={{color:cp,opacity:0.45}}/></div>
              {[['-top-1','-left-1'],['-top-1','-right-1'],['-bottom-1','-left-1'],['-bottom-1','-right-1']].map(([tt,ll],i)=>(
                <span key={i} className={`absolute w-2 h-2 rounded-full ${tt} ${ll}`} style={{backgroundColor:cp,opacity:0.5}}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    )

    // ── 2 · Neon Grid ────────────────────────────────────────────
    case 2: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'#050508', border:`1px solid ${cp}50`, boxShadow:`0 0 40px ${cp}15,inset 0 0 40px ${cp}05` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:`linear-gradient(${cp}08 1px,transparent 1px),linear-gradient(90deg,${cp}08 1px,transparent 1px)`, backgroundSize:'44px 44px' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${cp},transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:`linear-gradient(90deg,transparent,${cp}60,transparent)` }} />
        <div className="relative z-10 p-8 md:p-12 flex flex-col gap-5">
          <LiveBadge />
          <h2 style={{ fontSize:'clamp(28px,4vw,54px)', color:'#fff', textShadow:`0 0 40px ${cp},0 0 80px ${cp}60`, fontWeight:900, fontStyle:'italic', letterSpacing:'-0.02em', lineHeight:1 }}>{t.nombre}</h2>
          <div className="flex items-center gap-6 flex-wrap">
            <div><p className="text-4xl font-black tabular-nums" style={{color:cp,textShadow:`0 0 20px ${cp}`}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parejas</p></div>
            {zonas!==null&&<><div className="w-px h-12 bg-white/5"/><div><p className="text-4xl font-black tabular-nums text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Zonas</p></div></>}
            <div className="ml-auto text-right hidden md:block"><span className="text-[10px] text-white/30 block">{fmtRng}</span>{cats[0]&&<span className="text-[11px] font-bold" style={{color:cp}}>{cats[0]}</span>}</div>
          </div>
          <button onClick={nav} className="w-fit inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:`${cp}18`,color:cp,border:`1px solid ${cp}60`,boxShadow:`0 0 20px ${cp}20`}}><Zap size={14}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 3 · Split Panel ──────────────────────────────────────────
    case 3: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer flex min-h-[200px]" onClick={nav}>
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-between" style={{ background:dark?'#0d1117':'#ffffff' }}>
          <div className="flex flex-col gap-3">
            <LiveBadge />
            <h2 className="font-black uppercase leading-tight break-words" style={{ fontSize:'clamp(22px,3.5vw,42px)', color:dark?'#fff':'#0f172a', letterSpacing:'-0.02em' }}>{t.nombre}</h2>
            <span className={`text-xs ${dark?'text-white/30':'text-slate-400'}`}>{fmtRng}</span>
            <CatChips />
          </div>
          <button onClick={nav} className="mt-4 w-fit inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#080b0f'}}><Zap size={13}/>{ctaLabel}</button>
        </div>
        <div className="w-36 md:w-48 flex flex-col items-center justify-center gap-4 p-6 shrink-0" style={{ background:`linear-gradient(135deg,${cp}ee,${cp}bb)` }}>
          <Trophy size={30} color="#080b0f" opacity={0.6}/>
          <div className="text-center"><p className="text-4xl font-black leading-none" style={{color:'#080b0f'}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{color:'rgba(0,0,0,0.5)'}}>Parejas</p></div>
          {zonas!==null&&<div className="text-center"><p className="text-3xl font-black leading-none" style={{color:'rgba(0,0,0,0.7)'}}>{zonas}</p><p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{color:'rgba(0,0,0,0.4)'}}>Zonas</p></div>}
        </div>
      </div>
    )

    // ── 4 · Glassmorphism ────────────────────────────────────────
    case 4: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer p-px" onClick={nav}
        style={{ background:`linear-gradient(135deg,${cp}50,${cp}15,transparent)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse at 70% 30%,${cp}22 0%,transparent 60%)` }} />
        <div className="relative rounded-[22px] p-8 md:p-10" style={{ background:'rgba(12,12,20,0.75)', backdropFilter:'blur(20px)', border:`1px solid ${cp}20` }}>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-1">
              <LiveBadge />
              <h2 className="font-black italic mt-4 mb-4 leading-none" style={{ fontSize:'clamp(26px,4vw,50px)', color:'#fff', letterSpacing:'-0.03em' }}>{t.nombre}</h2>
              <CatChips />
              <div className="flex items-center gap-6 mt-5">
                <div><p className="text-3xl font-black" style={{color:cp}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">Parejas</p></div>
                {zonas!==null&&<><div className="w-px h-10 bg-white/10"/><div><p className="text-3xl font-black text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">Zonas</p></div></>}
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              <span className="text-xs text-white/30">{fmtRng}</span>
              <button onClick={nav} className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{background:`linear-gradient(135deg,${cp},${cp}cc)`,color:'#080b0f',boxShadow:`0 8px 24px ${cp}40`}}><Zap size={14}/>{ctaLabel}</button>
            </div>
          </div>
        </div>
      </div>
    )

    // ── 5 · Stadium Lights ───────────────────────────────────────
    case 5: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'#080810', minHeight:240 }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1 h-full" style={{background:`linear-gradient(180deg,${cp}30,transparent 70%)`,transform:'rotate(-8deg)',transformOrigin:'top center'}}/>
          <div className="absolute top-0 left-1/2 w-2 h-full" style={{background:`linear-gradient(180deg,${cp}45,transparent 65%)`,transform:'rotate(-1deg)',transformOrigin:'top center'}}/>
          <div className="absolute top-0 left-2/3 w-1 h-full" style={{background:`linear-gradient(180deg,${cp}25,transparent 60%)`,transform:'rotate(7deg)',transformOrigin:'top center'}}/>
          <div className="absolute top-0 left-0 right-0 h-px" style={{background:`linear-gradient(90deg,transparent,${cp}80,transparent)`}}/>
        </div>
        <div className="relative z-10 p-8 md:p-12 text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:`radial-gradient(circle,${cp}35,${cp}08)`,border:`1px solid ${cp}55`}}><Trophy size={26} style={{color:cp}}/></div>
          <LiveBadge />
          <h2 className="font-black uppercase text-center leading-tight" style={{fontSize:'clamp(26px,4vw,52px)',color:'#fff',textShadow:`0 2px 40px ${cp}30`,letterSpacing:'-0.02em'}}>{t.nombre}</h2>
          <div className="flex items-center gap-10">
            <div className="text-center"><p className="text-4xl font-black" style={{color:cp}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parejas</p></div>
            {zonas!==null&&<><div className="w-px h-10 bg-white/8"/><div className="text-center"><p className="text-4xl font-black text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Zonas</p></div></>}
          </div>
          <button onClick={nav} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#080810',boxShadow:`0 0 40px ${cp}50`}}><Zap size={14}/>{ctaLabel}</button>
          <p className="text-xs text-white/25">{fmtRng}</p>
        </div>
      </div>
    )

    // ── 6 · Scoreboard ───────────────────────────────────────────
    case 6: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'#0a0a0c', border:`2px solid ${cp}30` }}>
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{borderColor:`${cp}20`,background:`${cp}08`}}>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:cp}}>En curso · Live</span></div>
          <span className="text-[10px] text-white/30 font-mono">{fmtRng}</span>
        </div>
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <h2 className="font-black uppercase mb-3 leading-none" style={{fontSize:'clamp(22px,3.5vw,44px)',color:'#fff',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <CatChips />
          </div>
          <div className="flex items-stretch gap-4 shrink-0">
            <div className="flex flex-col items-center justify-center px-5 py-4 rounded-xl" style={{background:`${cp}12`,border:`1px solid ${cp}30`}}>
              <span className="text-5xl font-black font-mono tabular-nums leading-none" style={{color:cp}}>{String(inscriptos).padStart(2,'0')}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mt-2">Parejas</span>
            </div>
            {zonas!==null&&<div className="flex flex-col items-center justify-center px-5 py-4 rounded-xl bg-white/4 border border-white/8">
              <span className="text-5xl font-black font-mono tabular-nums leading-none text-white">{String(zonas).padStart(2,'0')}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mt-2">Zonas</span>
            </div>}
          </div>
        </div>
        <div className="px-6 pb-5"><button onClick={nav} className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#0a0a0c'}}><Zap size={14}/>{ctaLabel}</button></div>
      </div>
    )

    // ── 7 · Minimal Clean ────────────────────────────────────────
    case 7: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer bg-white" onClick={nav}
        style={{border:`1px solid ${cp}30`,boxShadow:`0 2px 30px ${cp}12`}}>
        <div className="absolute top-0 left-0 right-0 h-1" style={{backgroundColor:cp}}/>
        <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Torneo en curso</span></div>
            <h2 className="font-black mb-3 leading-tight" style={{fontSize:'clamp(22px,3.5vw,42px)',color:'#0f172a',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <CatChips />
            <p className="text-sm text-slate-400 mt-2">{fmtRng}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-5">
            <div className="flex items-center gap-8">
              <div className="text-center"><p className="text-4xl font-black" style={{color:cp}}>{inscriptos}</p><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Parejas</p></div>
              {zonas!==null&&<div className="text-center"><p className="text-4xl font-black text-slate-800">{zonas}</p><p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Zonas</p></div>}
            </div>
            <button onClick={nav} className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105" style={{backgroundColor:cp,color:'white'}}><Zap size={13}/>{ctaLabel}</button>
          </div>
        </div>
      </div>
    )

    // ── 8 · Fire ─────────────────────────────────────────────────
    case 8: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'linear-gradient(135deg,#1a0400 0%,#2d0800 40%,#1a0a00 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 70% 50%,rgba(255,69,0,0.18),transparent 60%)'}}/>
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 30% 80%,rgba(255,140,0,0.12),transparent 50%)'}}/>
        </div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col gap-5">
          <LiveBadge color="#ff6b35" />
          <h2 className="font-black italic uppercase leading-none tracking-tighter" style={{fontSize:'clamp(28px,4.5vw,54px)',color:'#fff',textShadow:'0 0 60px rgba(255,100,0,0.5)',letterSpacing:'-0.03em'}}>{t.nombre}</h2>
          <div className="flex items-center gap-6 flex-wrap">
            <div><p className="text-4xl font-black" style={{color:'#ff6b35'}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parejas</p></div>
            {zonas!==null&&<><div className="w-px h-12" style={{background:'rgba(255,100,50,0.2)'}}/><div><p className="text-4xl font-black text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Zonas</p></div></>}
            <div className="ml-auto"><CatChips accent="#ff6b35" /></div>
          </div>
          <button onClick={nav} className="w-fit inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{background:'linear-gradient(135deg,#ff4500,#ff8c00)',color:'#1a0400',boxShadow:'0 8px 30px rgba(255,80,0,0.45)'}}><Zap size={14}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 9 · Ocean Night ──────────────────────────────────────────
    case 9: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'linear-gradient(135deg,#020b1a 0%,#03122e 50%,#020d20 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 80% 20%,rgba(0,150,255,0.12),transparent 60%)'}}/>
          {[20,40,60,80].map((p,i)=><div key={i} className="absolute left-0 right-0 h-px" style={{top:`${p}%`,background:'rgba(0,100,200,0.06)'}}/>)}
        </div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-10 items-start md:items-center">
          <div className="flex-1">
            <LiveBadge color="#00b4ff" />
            <h2 className="font-black italic mt-4 mb-4 leading-none" style={{fontSize:'clamp(26px,4vw,50px)',color:'#fff',letterSpacing:'-0.03em',textShadow:'0 0 60px rgba(0,180,255,0.25)'}}>{t.nombre}</h2>
            <CatChips accent="#00b4ff" />
            <div className="flex items-center gap-6 mt-5">
              <div><p className="text-3xl font-black" style={{color:'#00b4ff'}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/25 mt-1">Parejas</p></div>
              {zonas!==null&&<><div className="w-px h-10 bg-white/5"/><div><p className="text-3xl font-black text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/25 mt-1">Zonas</p></div></>}
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="text-xs text-white/25">{fmtRng}</p>
            <button onClick={nav} className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{background:'linear-gradient(135deg,#006eff,#00b4ff)',color:'#020b1a',boxShadow:'0 8px 28px rgba(0,120,255,0.4)'}}><Zap size={14}/>{ctaLabel}</button>
          </div>
        </div>
      </div>
    )

    // ── 10 · Gold Luxury ─────────────────────────────────────────
    case 10: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'linear-gradient(135deg,#0a0800,#100e00)' }}>
        <div className="absolute inset-0 pointer-events-none">
          {[0,33,66,100].map((p,i)=><div key={i} className="absolute left-0 right-0 h-px" style={{top:`${p}%`,background:'rgba(212,175,55,0.06)'}}/>)}
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 80% 40%,rgba(212,175,55,0.09),transparent 50%)'}}/>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 px-6 py-3 border-b" style={{borderColor:'rgba(212,175,55,0.15)'}}>
            <Trophy size={13} color="#d4af37" opacity={0.8}/><span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:'#d4af37'}}>Torneo en curso</span><span className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{backgroundColor:'#d4af37'}}/><span className="ml-auto text-[10px]" style={{color:'rgba(212,175,55,0.4)'}}>{fmtRng}</span>
          </div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-1">
              <h2 className="font-black uppercase mb-3 leading-tight" style={{fontSize:'clamp(24px,4vw,48px)',color:'#fff',letterSpacing:'-0.01em'}}>{t.nombre}</h2>
              <div style={{height:1,background:'linear-gradient(90deg,rgba(212,175,55,0.5),transparent)',marginBottom:12}}/>
              <CatChips accent="#d4af37" />
            </div>
            <div className="flex flex-col gap-4 items-start md:items-end">
              <div className="flex gap-6">
                <div className="text-center"><p className="text-4xl font-black" style={{color:'#d4af37'}}>{inscriptos}</p><p className="text-[9px] font-black uppercase tracking-[0.2em] mt-1" style={{color:'rgba(212,175,55,0.4)'}}>Parejas</p></div>
                {zonas!==null&&<div className="text-center"><p className="text-4xl font-black text-white">{zonas}</p><p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">Zonas</p></div>}
              </div>
              <button onClick={nav} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0800',boxShadow:'0 6px 24px rgba(212,175,55,0.35)'}}><Zap size={13}/>{ctaLabel}</button>
            </div>
          </div>
        </div>
      </div>
    )

    // ── 11 · Court Lines ─────────────────────────────────────────
    case 11: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:dark?'#080f0a':'#f0fdf4', minHeight:220 }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-8">
          <div className="relative opacity-[0.11]" style={{width:130,height:190}}>
            <div className="absolute inset-0 border-2 rounded" style={{borderColor:cp}}/>
            <div className="absolute left-0 right-0 top-1/2 border-t-2 -translate-y-1/2" style={{borderColor:cp}}/>
            <div className="absolute left-1/2 top-0 bottom-0 border-l-2 -translate-x-1/2" style={{borderColor:cp}}/>
            <div className="absolute left-0 right-0 top-[28%] border-t" style={{borderColor:cp}}/>
            <div className="absolute left-0 right-0 bottom-[28%] border-t" style={{borderColor:cp}}/>
            <div className="absolute left-[18%] right-[18%] top-0 bottom-0 border-x" style={{borderColor:cp}}/>
          </div>
        </div>
        <div className="relative z-10 p-8 md:p-10 flex flex-col gap-5">
          <LiveBadge />
          <h2 className="font-black uppercase leading-none tracking-tight" style={{fontSize:'clamp(26px,4vw,50px)',color:dark?'#fff':'#0f172a',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
          <CatChips />
          <div className="flex items-center gap-6">
            <div><p className="text-3xl font-black" style={{color:cp}}>{inscriptos}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Parejas</p></div>
            {zonas!==null&&<><div className={`w-px h-10 ${dark?'bg-white/8':'bg-slate-200'}`}/><div><p className={`text-3xl font-black ${dark?'text-white':'text-slate-800'}`}>{zonas}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Zonas</p></div></>}
          </div>
          <button onClick={nav} className="w-fit inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#080f0a',boxShadow:`0 6px 24px ${cp}45`}}><Zap size={14}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 12 · Big Stats ───────────────────────────────────────────
    case 12: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:dark?'#060810':'#fafafa' }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-8 md:pr-16">
          <span className="font-black tabular-nums leading-none select-none" style={{fontSize:'clamp(100px,18vw,220px)',color:cp,opacity:0.04}}>{inscriptos}</span>
        </div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <LiveBadge />
            <h2 className="font-black italic mt-3 mb-2 leading-none" style={{fontSize:'clamp(22px,3.5vw,42px)',color:dark?'#fff':'#0f172a',letterSpacing:'-0.03em'}}>{t.nombre}</h2>
            <p className={`text-xs ${dark?'text-white/30':'text-slate-400'} mb-3`}>{fmtRng}</p>
            <CatChips />
            <button onClick={nav} className="mt-5 inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#060810'}}><Zap size={14}/>{ctaLabel}</button>
          </div>
          <div className="shrink-0 flex flex-row md:flex-col gap-8 md:gap-3">
            <div className="text-center"><p className="font-black tabular-nums leading-none" style={{fontSize:'clamp(52px,8vw,88px)',color:cp}}>{inscriptos}</p><p className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark?'text-white/25':'text-slate-400'} mt-2`}>Parejas</p></div>
            {zonas!==null&&<div className="text-center"><p className={`font-black tabular-nums leading-none ${dark?'text-white':'text-slate-800'}`} style={{fontSize:'clamp(38px,5vw,64px)'}}>{zonas}</p><p className={`text-[10px] font-black uppercase tracking-[0.2em] ${dark?'text-white/25':'text-slate-400'} mt-2`}>Zonas</p></div>}
          </div>
        </div>
      </div>
    )

    // ── 13 · Carbon Strip ────────────────────────────────────────
    case 13: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'#0c0c0e' }}>
        <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'repeating-linear-gradient(90deg,rgba(255,255,255,0.014) 0px,rgba(255,255,255,0.014) 1px,transparent 1px,transparent 30px)'}}/>
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor:cp}}/>
        <div className="p-6 md:p-10 pl-7 md:pl-12 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:cp}}>En curso</span></div>
            <h2 className="font-black uppercase mb-2 leading-tight" style={{fontSize:'clamp(24px,3.8vw,48px)',color:'#fff',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <CatChips />
            <p className="text-xs text-white/25 mt-2">{fmtRng}</p>
          </div>
          <div className="flex flex-col gap-4 items-start md:items-end">
            <div className="flex gap-4">
              <div className="px-5 py-4 rounded-xl border" style={{borderColor:`${cp}25`,background:`${cp}08`}}><p className="text-4xl font-black font-mono leading-none" style={{color:cp}}>{inscriptos}</p><p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-2">Parejas</p></div>
              {zonas!==null&&<div className="px-5 py-4 rounded-xl border border-white/8 bg-white/3"><p className="text-4xl font-black font-mono leading-none text-white">{zonas}</p><p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-2">Zonas</p></div>}
            </div>
            <button onClick={nav} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:brightness-110" style={{backgroundColor:cp,color:'#0c0c0e'}}><Zap size={13}/>{ctaLabel}</button>
          </div>
        </div>
      </div>
    )

    // ── 14 · Sunset Warm ─────────────────────────────────────────
    case 14: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'linear-gradient(135deg,#1a0800 0%,#2d1200 40%,#1a1000 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 65% 20%,rgba(255,140,0,0.16),transparent 55%)'}}/>
          <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 85% 85%,rgba(220,60,20,0.1),transparent 40%)'}}/>
        </div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <LiveBadge color="#ff8c00" />
            <h2 className="font-black italic mt-4 mb-3 leading-none" style={{fontSize:'clamp(26px,4.5vw,52px)',color:'#fff',textShadow:'0 0 40px rgba(255,140,0,0.3)',letterSpacing:'-0.03em'}}>{t.nombre}</h2>
            <CatChips accent="#ff8c00" />
            <div className="flex items-center gap-6 mt-5">
              <div><p className="text-3xl font-black" style={{color:'#ff8c00'}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parejas</p></div>
              {zonas!==null&&<><div className="w-px h-10" style={{background:'rgba(255,140,0,0.2)'}}/><div><p className="text-3xl font-black text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Zonas</p></div></>}
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <p className="text-xs text-white/25">{fmtRng}</p>
            <button onClick={nav} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{background:'linear-gradient(135deg,#ff8c00,#ff4500)',color:'#1a0800',boxShadow:'0 8px 28px rgba(255,120,0,0.4)'}}><Zap size={14}/>{ctaLabel}</button>
          </div>
        </div>
      </div>
    )

    // ── 15 · Ribbon Accent ───────────────────────────────────────
    case 15: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:dark?'#0a0c10':'#f8fafc' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{top:'-10%',right:'-5%',width:'42%',height:'120%',background:`linear-gradient(135deg,${cp}20,${cp}06)`,transform:'skewX(-8deg)'}}/>
          <div className="absolute" style={{top:'-10%',right:'8%',width:'3px',height:'120%',backgroundColor:`${cp}55`,transform:'skewX(-8deg)'}}/>
        </div>
        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <LiveBadge />
            <h2 className="font-black uppercase mt-3 mb-3 leading-tight" style={{fontSize:'clamp(24px,4vw,48px)',color:dark?'#fff':'#0f172a',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <CatChips />
            <p className={`text-xs mt-2 ${dark?'text-white/30':'text-slate-400'}`}>{fmtRng}</p>
            <div className="flex items-center gap-6 mt-4">
              <div><p className="text-3xl font-black" style={{color:cp}}>{inscriptos}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Parejas</p></div>
              {zonas!==null&&<><div className={`w-px h-10 ${dark?'bg-white/8':'bg-slate-200'}`}/><div><p className={`text-3xl font-black ${dark?'text-white':'text-slate-800'}`}>{zonas}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Zonas</p></div></>}
            </div>
          </div>
          <button onClick={nav} className="mt-2 md:mt-0 shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#0a0c10',boxShadow:`0 6px 24px ${cp}40`}}><Zap size={14}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 16 · Retro Stripes ───────────────────────────────────────
    case 16: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}>
        <div className="flex">
          <div className="h-2.5 flex-1" style={{backgroundColor:cp}}/>
          <div className="h-2.5 w-10 bg-black"/>
          <div className="h-2.5 flex-1" style={{backgroundColor:cp,opacity:0.55}}/>
          <div className="h-2.5 w-6 bg-black"/>
          <div className="h-2.5 flex-1" style={{backgroundColor:cp,opacity:0.28}}/>
        </div>
        <div className="bg-[#0a0a0c] p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3"><span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:cp}}>En curso</span></div>
            <h2 className="font-black uppercase leading-none tracking-tighter" style={{fontSize:'clamp(26px,5vw,56px)',color:'#fff',letterSpacing:'-0.04em'}}>{t.nombre}</h2>
            <div className="mt-3"><CatChips /></div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="border-l-4 pl-4" style={{borderColor:cp}}><p className="text-4xl font-black font-mono leading-none" style={{color:cp}}>{inscriptos}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Parejas</p></div>
              {zonas!==null&&<div className="border-l-4 pl-4 border-white/15"><p className="text-4xl font-black font-mono leading-none text-white">{zonas}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Zonas</p></div>}
            </div>
            <button onClick={nav} className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#0a0a0c'}}><Zap size={14}/>{ctaLabel}</button>
          </div>
        </div>
        <div className="flex">
          <div className="h-1.5 flex-1" style={{backgroundColor:cp,opacity:0.28}}/>
          <div className="h-1.5 w-8 bg-black"/>
          <div className="h-1.5 flex-1" style={{backgroundColor:cp,opacity:0.55}}/>
          <div className="h-1.5 w-12 bg-black"/>
          <div className="h-1.5 flex-1" style={{backgroundColor:cp}}/>
        </div>
      </div>
    )

    // ── 17 · Ticket ──────────────────────────────────────────────
    case 17: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer bg-white shadow-lg" onClick={nav}>
        <div className="h-1.5" style={{backgroundColor:cp}}/>
        <div className="flex min-h-[160px]">
          <div className="flex-1 p-5 md:p-7">
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Torneo en curso</span></div>
            <h2 className="font-black mb-1.5 leading-tight" style={{fontSize:'clamp(20px,3.2vw,38px)',color:'#0f172a',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <p className="text-xs text-slate-400 mb-2.5">{fmtRng}</p>
            <CatChips />
          </div>
          <div className="w-px my-4 relative shrink-0" style={{borderRight:'2px dashed #e2e8f0'}}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-100"/>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-100"/>
          </div>
          <div className="w-28 md:w-36 flex flex-col items-center justify-center gap-2.5 p-4" style={{background:`${cp}08`}}>
            <Trophy size={22} style={{color:cp}}/>
            <div className="text-center"><p className="text-3xl font-black leading-none" style={{color:cp}}>{inscriptos}</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Parejas</p></div>
            {zonas!==null&&<div className="text-center"><p className="text-2xl font-black text-slate-700">{zonas}</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Zonas</p></div>}
          </div>
        </div>
        <div className="px-5 pb-4 pt-1 border-t border-slate-100 flex items-center justify-between">
          <button onClick={nav} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'white'}}><Zap size={12}/>{ctaLabel}</button>
          <span className="text-xs text-slate-200 font-mono tracking-wider">#{String(t.id ?? '').slice(-6).padStart(6,'0')}</span>
        </div>
      </div>
    )

    // ── 18 · Badge Emblem ────────────────────────────────────────
    case 18: return (
      <div key={t.id} className="relative rounded-3xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:dark?'linear-gradient(135deg,#060810,#0a0d14)':'#f8fafc', minHeight:240 }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035]">
          <div className="w-64 h-64 rounded-full" style={{border:`24px solid ${cp}`}}/>
        </div>
        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="shrink-0 flex items-center justify-center w-24 h-24 rounded-full" style={{background:`radial-gradient(circle,${cp}22,${cp}06)`,border:`2px solid ${cp}45`,boxShadow:`0 0 40px ${cp}20`}}>
            <Trophy size={26} style={{color:cp}}/>
          </div>
          <div className="flex-1">
            <LiveBadge />
            <h2 className="font-black mt-3 mb-3 leading-tight" style={{fontSize:'clamp(24px,4vw,48px)',color:dark?'#fff':'#0f172a',letterSpacing:'-0.02em'}}>{t.nombre}</h2>
            <CatChips />
            <div className="flex items-center gap-6 mt-4">
              <div><p className="text-3xl font-black" style={{color:cp}}>{inscriptos}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Parejas</p></div>
              {zonas!==null&&<><div className={`w-px h-10 ${dark?'bg-white/8':'bg-slate-200'}`}/><div><p className={`text-3xl font-black ${dark?'text-white':'text-slate-800'}`}>{zonas}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${dark?'text-white/25':'text-slate-400'}`}>Zonas</p></div></>}
            </div>
          </div>
          <button onClick={nav} className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#060810',boxShadow:`0 6px 24px ${cp}40`}}><Zap size={14}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 19 · Editorial ───────────────────────────────────────────
    case 19: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:dark?'#0c0c0e':'#ffffff', border:`1px solid ${dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}` }}>
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{borderColor:dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}}>
          <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{color:cp}}>Torneo en curso</span>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor:cp}}/><span className={`text-[9px] font-bold ${dark?'text-white/30':'text-slate-400'}`}>{fmtRng}</span></div>
        </div>
        <div className="p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <h2 className="font-black leading-none mb-4" style={{fontSize:'clamp(24px,5vw,56px)',color:dark?'#fff':'#0f172a',letterSpacing:'-0.04em'}}>{t.nombre}</h2>
            <div className="flex items-center gap-3 mb-4"><div className="h-px flex-1" style={{backgroundColor:`${cp}40`}}/><span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{color:cp}}>Datos</span><div className="h-px flex-1" style={{backgroundColor:`${cp}40`}}/></div>
            <div className="flex flex-wrap gap-5">
              <div><span className="text-3xl font-black" style={{color:cp}}>{inscriptos}</span><span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${dark?'text-white/25':'text-slate-400'}`}>Parejas</span></div>
              {zonas!==null&&<div><span className={`text-3xl font-black ${dark?'text-white':'text-slate-800'}`}>{zonas}</span><span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${dark?'text-white/25':'text-slate-400'}`}>Zonas</span></div>}
            </div>
            {cats.length>0&&<div className="mt-3"><CatChips /></div>}
          </div>
          <button onClick={nav} className="mt-1 inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#0c0c0e'}}><Zap size={13}/>{ctaLabel}</button>
        </div>
      </div>
    )

    // ── 20 · Cinematic ───────────────────────────────────────────
    case 20: return (
      <div key={t.id} className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={nav}
        style={{ background:'#000', minHeight:190 }}>
        <div className="absolute top-0 left-0 right-0 h-3 bg-black z-20"/>
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-black z-20"/>
        <div className="absolute inset-0" style={{background:`linear-gradient(135deg,#000 0%,rgba(0,0,0,0.55) 50%,${cp}12 100%)`}}/>
        <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at 80% 50%,${cp}14,transparent 55%)`}}/>
        <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-14 py-8">
          <div className="flex items-center gap-4 mb-3">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor:cp}}/>
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">En curso ahora</span>
            <div className="h-px flex-1 max-w-20" style={{backgroundColor:`${cp}30`}}/>
            <span className="text-[9px] text-white/25">{fmtRng}</span>
          </div>
          <h2 className="font-black italic uppercase leading-none mb-4" style={{fontSize:'clamp(22px,4vw,52px)',color:'#fff',letterSpacing:'-0.04em',textShadow:`0 0 80px ${cp}20`}}>{t.nombre}</h2>
          <div className="flex items-center gap-5 flex-wrap">
            {cats.map((c)=><span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{backgroundColor:`${cp}15`,color:cp,border:`1px solid ${cp}25`}}>{c}</span>)}
            <span className="text-xs text-white/30">{inscriptos} parejas{zonas!==null?` · ${zonas} zonas`:''}</span>
            <button onClick={nav} className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105" style={{backgroundColor:cp,color:'#000'}}><Zap size={12}/>{ctaLabel}</button>
          </div>
        </div>
      </div>
    )

    default: return renderEnCursoCard(1, { t, cp, dark, colorPrimario, inscriptos, zonas, bigLabel, ctaLabel, navigate })
  }
}

// soloEnCurso: modo para la home — renderiza SOLO el hero del torneo en curso
// (sin tabs, sin abiertos, sin finalizados). Reutiliza los templates "en curso".
export const TorneosSection = ({ colorPrimario = '#afca0b', dark = true, onCta, soloEnCurso = false }) => {
  const navigate  = useNavigate()
  const torneos   = useTorneosStore((s) => s.torneos)
  const [filtro, setFiltro] = useState('todos')

  const visibles = useMemo(() => {
    return [...torneos]
      .filter((t) => t.estado === 'open' || t.estado === 'in_progress')
      .sort((a, b) => a.fechaInicio < b.fechaInicio ? -1 : 1)
      .slice(0, 4)
  }, [torneos])

  const finishedList = useMemo(() => {
    return [...torneos]
      .filter((t) => t.estado === 'finished')
      .sort((a, b) => (a.fechaFin > b.fechaFin ? -1 : 1))
  }, [torneos])

  const totalCupo = (t) =>
    t.cupoLibre ? null : Object.values(t.cuposPorCategoria).reduce((a, b) => a + b, 0)

  // Campeón de un torneo finalizado (primera categoría con final cargada)
  const getCampeon = (t) => {
    for (const bracketObj of Object.values(t.brackets ?? {})) {
      const rondas = Array.isArray(bracketObj) ? bracketObj : (bracketObj?.rondas ?? [])
      const finalRonda = rondas.find((r) => r.nombre === 'Final') ?? rondas[rondas.length - 1]
      const fm = finalRonda?.partidos?.[0]
      if (fm?.ganador && fm.estado === 'finalizado') {
        const g = fm.ganador
        return `${g.jugador1 ?? ''}${g.jugador2 ? ` / ${g.jugador2}` : ''}`.trim()
      }
    }
    return null
  }

  const enCursoList = visibles.filter((t) => t.estado === 'in_progress')
  const proximoList = visibles.filter((t) => t.estado === 'open' && diasHasta(t.fechaInicio) <= DIAS_FLYER)
  const openList    = visibles.filter((t) => t.estado === 'open' && diasHasta(t.fechaInicio) > DIAS_FLYER)

  // Modo home: solo hero en curso. Si no hay torneo en curso, no renderiza nada.
  if (soloEnCurso) {
    if (enCursoList.length === 0) return null
  } else if (visibles.length === 0 && finishedList.length === 0) {
    return null
  }

  // ── Tabs de filtro ──────────────────────────────────────────────────────
  const TABS_TORNEOS = [
    { key: 'todos',       label: 'Todos',       count: enCursoList.length + proximoList.length + openList.length + finishedList.length },
    { key: 'abiertos',    label: 'Abiertos',    count: proximoList.length + openList.length },
    { key: 'en_curso',    label: 'En curso',    count: enCursoList.length },
    { key: 'finalizados', label: 'Finalizados', count: finishedList.length },
  ].filter((tab) => tab.key === 'todos' || tab.count > 0)

  const showEnCurso     = soloEnCurso || filtro === 'todos' || filtro === 'en_curso'
  const showAbiertos    = !soloEnCurso && (filtro === 'todos' || filtro === 'abiertos')
  const showFinalizados = !soloEnCurso && (filtro === 'todos' || filtro === 'finalizados')

  return (
    <section id="torneos" className="py-20 px-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Tabs de filtro ─────────────────────────────────────────── */}
        {!soloEnCurso && TABS_TORNEOS.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {TABS_TORNEOS.map(({ key, label, count }) => {
              const activo = filtro === key
              return (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    activo ? '' : dark ? 'text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                  style={activo ? { backgroundColor: colorPrimario, color: '#080b0f' } : undefined}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activo ? 'bg-black/15' : dark ? 'bg-white/10' : 'bg-white'
                  }`}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── HERO — torneo en curso ─────────────────────────────────── */}
        {showEnCurso && enCursoList.map((t) => {
          const inscriptos = t.inscriptos.filter((p) => p.estado === 'inscripto').length
          const zonas      = Array.isArray(t.grupos) ? t.grupos.length : null
          const bigLabel   = t.categorias?.[0] ?? ''
          const cp              = t.colorAcento || colorPrimario
          const ctaLabel        = t.ctaEnCurso || 'Seguir el torneo'
          const tplId           = t.templateEnCurso ?? 1
          const imgEnCurso      = t.imagenFondoEnCurso || null
          const clrCardBg       = t.colorCardBgEnCurso   || null
          const clrTitulo       = t.colorTituloEnCurso   || null
          const clrTextoSec     = t.colorTextoSecEnCurso || null
          const clrBtnText      = t.colorBtnTextEnCurso  || null

          // Imagen propia → override de template
          if (imgEnCurso) return (
            <div key={t.id}
              className="relative rounded-3xl overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/torneos/${t.id}`)}>
              <img src={imgEnCurso} alt={t.nombre} className="w-full object-cover max-h-80 transition-transform duration-500 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-end">
                <div className="w-full p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider"
                    style={{ backgroundColor: cp, color: '#080b0f' }}>
                    <Zap size={14} /> {ctaLabel}
                  </button>
                </div>
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ backgroundColor: `${cp}22`, color: cp, border: `1px solid ${cp}35`, backdropFilter: 'blur(8px)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cp }} />
                En curso
              </div>
            </div>
          )

          return renderEnCursoCard(tplId, { t, cp, dark, colorPrimario, inscriptos, zonas, bigLabel, ctaLabel, navigate, clrCardBg, clrTitulo, clrTextoSec, clrBtnText })
        })}

        {/* ── FLYER "Próximamente" ──────────────────────────────────── */}
        {showAbiertos && proximoList.map((t) => {
          const cp        = t.colorAcento || colorPrimario
          const cupo      = totalCupo(t)
          const inscriptos = t.inscriptos.filter((p) => p.estado === 'inscripto').length
          const pct       = cupo ? Math.round((inscriptos / cupo) * 100) : 0
          const restantes = cupo !== null ? Math.max(0, cupo - inscriptos) : null
          const dias      = diasHasta(t.fechaInicio)
          const bigLabel  = t.categorias?.[0]?.replace('° Categoría','°').replace(' Categoría','°') ?? ''
          const tieneImg  = !!t.imagenFondo
          const modoImagen = t.modoLandingFlyer === 'imagen' && tieneImg

          // Modo imagen propia: muestra el flyer directamente
          if (modoImagen) return (
            <div key={t.id}
              className="relative rounded-3xl overflow-hidden cursor-pointer group"
              onClick={onCta}>
              <img src={t.imagenFondo} alt={t.nombre} className="w-full object-cover max-h-80 transition-transform duration-500 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end">
                <div className="w-full p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider"
                    style={{ backgroundColor: cp, color: '#080b0f' }}>
                    <Users size={14} /> Inscribirme
                  </button>
                </div>
              </div>
            </div>
          )

          return (
            <div key={t.id} className="relative rounded-3xl overflow-hidden"
              style={{
                minHeight: 300,
                background: tieneImg
                  ? `url(${t.imagenFondo}) center/cover no-repeat`
                  : `linear-gradient(135deg, #080b0f 0%, #0c160a 100%)`,
              }}>

              {/* Overlay cuando hay imagen */}
              {tieneImg && <div className="absolute inset-0 bg-black/60" />}

              {/* Fondos decorativos (sin imagen) */}
              {!tieneImg && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-y-0 right-0 w-[55%]"
                    style={{ background: `linear-gradient(120deg,transparent 25%,${cp}10 100%)`, clipPath:'polygon(15% 0%,100% 0%,100% 100%,0% 100%)' }} />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 font-black italic select-none leading-none"
                    style={{ fontSize:'clamp(90px,15vw,180px)', color: cp, opacity: 0.05, letterSpacing:'-0.04em' }}>
                    {bigLabel}
                  </div>
                  <div className="absolute right-24 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[90px]"
                    style={{ backgroundColor: cp, opacity: 0.1 }} />
                  {/* Líneas decorativas */}
                  <div className="absolute top-8 bottom-8 right-[20%] w-px" style={{ backgroundColor:`${cp}15` }} />
                  <div className="absolute top-8 bottom-8 right-[36%] w-px" style={{ backgroundColor:`${cp}08` }} />
                </div>
              )}

              {/* Contenido */}
              <div className="relative z-10 p-8 md:p-12">

                {/* Label + countdown */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    Próximo torneo
                  </span>
                  <div className="h-px w-8" style={{ backgroundColor:`${cp}40` }} />
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor:`${cp}22`, color: cp, border:`1px solid ${cp}35` }}>
                    {dias === 0 ? '¡Hoy empieza!' : dias === 1 ? 'Mañana' : `En ${dias} días`}
                  </span>
                </div>

                {/* Nombre billboard */}
                <h2 className="font-black italic uppercase leading-[0.88] tracking-tighter mb-6 text-white"
                  style={{ fontSize:'clamp(28px,4.5vw,58px)', textShadow: tieneImg ? '0 2px 20px rgba(0,0,0,0.6)' : 'none' }}>
                  {t.nombre}
                </h2>

                <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end">
                  <div className="flex-1 flex flex-col gap-4">

                    {/* Fecha + categorías */}
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white/75"
                        style={{ backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                        <CalendarDays size={11} />
                        {fmtDiaDestacado(t.fechaInicio)} · {fmtFechaTorneo(t.fechaInicio)} → {fmtFechaTorneo(t.fechaFin)}
                      </span>
                      {t.categorias?.map((c) => (
                        <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ backgroundColor:`${cp}18`, color: cp, border:`1px solid ${cp}28` }}>
                          {c}
                        </span>
                      ))}
                      {t.genero && t.genero !== 'Masculino' && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white/50"
                          style={{ backgroundColor:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)' }}>
                          {t.genero}
                        </span>
                      )}
                    </div>

                    {/* Premios */}
                    {(t.premioPrimero || t.premioSegundo || t.premioSemifinal) && (
                      <div className="flex flex-wrap gap-2">
                        {t.premioPrimero && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ backgroundColor:'rgba(234,179,8,0.12)', border:'1px solid rgba(234,179,8,0.28)', color:'#eab308' }}>
                            🥇 {t.premioPrimero}
                          </div>
                        )}
                        {t.premioSegundo && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ backgroundColor:'rgba(148,163,184,0.1)', border:'1px solid rgba(148,163,184,0.22)', color:'#94a3b8' }}>
                            🥈 {t.premioSegundo}
                          </div>
                        )}
                        {t.premioSemifinal && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ backgroundColor:'rgba(180,83,9,0.12)', border:'1px solid rgba(180,83,9,0.22)', color:'#fb923c' }}>
                            🥉 {t.premioSemifinal}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cupo restante */}
                    {restantes !== null && (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black tabular-nums leading-none"
                          style={{ color: restantes <= 3 ? '#ef4444' : cp }}>
                          {restantes}
                        </span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                            {restantes === 1 ? 'Lugar disponible' : 'Lugares disponibles'}
                          </p>
                          <div className="h-1 w-24 rounded-full overflow-hidden mt-1" style={{ backgroundColor:'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width:`${Math.min(pct,100)}%`, backgroundColor: pct >= 80 ? '#ef4444' : cp }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Descripción corta */}
                    {t.descripcion && (
                      <p className="text-xs text-white/40 leading-relaxed max-w-sm line-clamp-2">{t.descripcion}</p>
                    )}
                  </div>

                  {/* CTA */}
                  <button onClick={onCta}
                    className="shrink-0 inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: cp, color:'#080b0f', boxShadow:`0 8px 32px ${cp}45` }}>
                    <Users size={15} strokeWidth={2.5} />
                    Inscribirme
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* ── Torneos open ─────────────────────────────────────────── */}
        {showAbiertos && openList.length > 0 && (
          <div className={`grid gap-4 ${
            openList.length === 1 ? 'max-w-sm' :
            openList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          }`}>
            {openList.map((t) => {
              const cupo       = totalCupo(t)
              const inscriptos = t.inscriptos.filter((p) => p.estado === 'inscripto').length
              const pct        = cupo ? Math.round((inscriptos / cupo) * 100) : 0
              const lleno      = cupo !== null && inscriptos >= cupo

              return (
                <div key={t.id} className={`relative rounded-2xl overflow-hidden flex flex-col transition-all group ${
                  dark ? 'bg-white/3 border border-white/8 hover:border-white/18 hover:bg-white/5' : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg'
                }`}>
                  {/* Accent bar top */}
                  <div className="h-[3px] w-full" style={{ backgroundColor: colorPrimario }} />

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                        Inscripción abierta
                      </span>
                      <h3 className={`font-black text-base leading-tight mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {t.nombre}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.categorias?.map((c) => (
                        <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: `${colorPrimario}12`, color: colorPrimario }}>
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                      <CalendarDays size={10} />
                      {fmtFechaTorneo(t.fechaInicio)} → {fmtFechaTorneo(t.fechaFin)}
                    </div>
                    {!t.cupoLibre && cupo && (
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className={`flex items-center gap-1 text-[11px] ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                            <Users size={10} />{inscriptos} inscriptos
                          </span>
                          <span className={`text-[11px] font-bold ${lleno ? 'text-red-400' : dark ? 'text-white/45' : 'text-slate-500'}`}>
                            {inscriptos}/{cupo}
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/6' : 'bg-slate-100'}`}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: lleno ? '#ef4444' : colorPrimario }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-5">
                    <button
                      onClick={onCta}
                      disabled={lleno}
                      className={`w-full py-2.5 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${
                        lleno ? (dark ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed') : 'hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      style={!lleno ? { backgroundColor: colorPrimario, color: '#080b0f', boxShadow: `0 4px 16px ${colorPrimario}30` } : undefined}
                    >
                      {lleno ? 'Cupo completo' : 'Inscribirme →'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Torneos FINALIZADOS ──────────────────────────────────── */}
        {showFinalizados && finishedList.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtro === 'todos' && (
              <span className={`text-[11px] font-black uppercase tracking-[0.18em] mt-2 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                Finalizados
              </span>
            )}
            <div className={`grid gap-4 ${
              finishedList.length === 1 ? 'max-w-sm' :
              finishedList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}>
              {finishedList.map((t) => {
                const cp       = t.colorAcento || colorPrimario
                const campeon  = getCampeon(t)
                const imagen   = t.imagenFondo || t.imagenFondoEnCurso || null

                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/torneos/${t.id}`)}
                    className={`relative rounded-2xl overflow-hidden flex flex-col cursor-pointer group transition-all ${
                      dark ? 'bg-white/3 border border-white/8 hover:border-white/18 hover:bg-white/5' : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg'
                    }`}
                  >
                    {/* Imagen / fondo */}
                    <div className="relative h-36 overflow-hidden" style={!imagen ? { background: `linear-gradient(135deg, ${dark ? '#0d1117' : '#1e293b'} 55%, ${cp}33)` } : undefined}>
                      {imagen ? (
                        <img src={imagen} alt={t.nombre} className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-[1.03] transition-all duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Trophy size={40} style={{ color: `${cp}55` }} />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)' }} />
                      {/* Badge FINALIZADO */}
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{ backgroundColor: 'rgba(212,175,55,0.18)', color: '#e8c860', border: '1px solid rgba(212,175,55,0.4)', backdropFilter: 'blur(6px)' }}>
                        <Trophy size={9} /> Finalizado
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <h3 className={`font-black text-base leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {t.nombre}
                      </h3>
                      <div className={`flex items-center gap-1.5 text-xs ${dark ? 'text-white/35' : 'text-slate-400'}`}>
                        <CalendarDays size={10} />
                        {fmtFechaTorneo(t.fechaInicio)} → {fmtFechaTorneo(t.fechaFin)}
                        {t.categorias?.[0] && <span className="ml-1 opacity-70">· {t.categorias[0]}</span>}
                      </div>

                      {/* Campeón */}
                      {campeon && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Trophy size={12} style={{ color: '#e8c860' }} />
                          <span className="text-xs font-bold truncate" style={{ color: '#e8c860' }}>{campeon}</span>
                        </div>
                      )}

                      <button
                        className={`mt-2 w-full py-2.5 text-sm font-black uppercase tracking-wider rounded-xl transition-all group-hover:scale-[1.02] ${
                          dark ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Ver torneo →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}

// ─── Mapa de íconos ──────────────────────────────────────────────────────────

const ICON_MAP = {
  ShowerHead, Car, GraduationCap, Wifi, Coffee,
  Dumbbell, Shield, Wind, Utensils, Music,
}

export const ServicioIcon = ({ icono, size = 20, className }) => {
  const Icon = ICON_MAP[icono] ?? Wrench
  return <Icon size={size} className={className} />
}

// ─── Galería ─────────────────────────────────────────────────────────────────

// ─── Firma de la plataforma (footer de todos los templates) ───────────────────
// "Hecho con PadelwIArk" → link a la landing de ventas. Marca propia (lima), NO el
// color del club. Distribución SaaS: cada landing de club es un cartel de PadelwIArk.
export const FirmaPlataforma = ({ className = '' }) => (
  <div className={`mt-6 pt-6 border-t border-white/5 flex justify-center ${className}`}>
    <Link to="/padelwiark" className="group inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors">
      <span>Hecho con</span>
      <span className="inline-flex items-center gap-1 font-bold">
        <span className="w-4 h-4 rounded-[5px] flex items-center justify-center" style={{ backgroundColor: '#afca0b' }}>
          <Zap size={10} className="text-[#0d1117]" />
        </span>
        <span className="text-white/55 group-hover:text-white/80 transition-colors">Padelw<span style={{ color: '#afca0b' }}>IA</span>rk</span>
      </span>
    </Link>
  </div>
)

export const GaleriaGrid = ({ galeria, className = '', variant = 'grid' }) => {
  const [lightbox, setLightbox] = useState(null)

  // Teclado + bloqueo de scroll mientras el lightbox está abierto
  useEffect(() => {
    if (lightbox === null || !galeria?.length) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      else if (e.key === 'ArrowLeft') setLightbox((v) => (v === null ? v : (v - 1 + galeria.length) % galeria.length))
      else if (e.key === 'ArrowRight') setLightbox((v) => (v === null ? v : (v + 1) % galeria.length))
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [lightbox, galeria])

  if (!galeria?.length) return null

  const nav = (dir) => setLightbox((v) => (v === null ? v : (v + dir + galeria.length) % galeria.length))

  const grid = variant === 'mosaico' && galeria.length >= 3 ? (
    // Mosaico: primera foto destacada (2x2) + el resto en piezas chicas.
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {galeria.map((foto, i) => (
        <button
          key={foto.id}
          onClick={() => setLightbox(i)}
          className={`relative group block w-full overflow-hidden rounded-2xl border border-white/8 cursor-zoom-in ${i === 0 ? 'col-span-2 aspect-video md:row-span-2 md:aspect-auto' : 'aspect-[4/3]'}`}
        >
          <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {foto.caption && (
            <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent text-left">
              <p className={`text-white font-semibold drop-shadow ${i === 0 ? 'text-sm' : 'text-xs'}`}>{foto.caption}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  ) : (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {galeria.map((foto, i) => (
        <button key={foto.id} onClick={() => setLightbox(i)} className="relative group block w-full rounded-xl overflow-hidden aspect-video cursor-zoom-in">
          <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          {foto.caption && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <p className="text-white text-xs font-medium text-left">{foto.caption}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {grid}
      {lightbox !== null && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-10"
          style={{ animation: 'fadeInUp 0.2s ease-out' }}
          onClick={() => setLightbox(null)}
        >
          {/* Cerrar */}
          <button onClick={() => setLightbox(null)} aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={20} />
          </button>

          {/* Navegación */}
          {galeria.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); nav(-1) }} aria-label="Anterior"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronLeft size={22} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nav(1) }} aria-label="Siguiente"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Imagen */}
          <figure className="max-w-5xl max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={galeria[lightbox].url} alt={galeria[lightbox].caption} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            {galeria[lightbox].caption && <figcaption className="text-white/70 text-sm mt-4 text-center px-4">{galeria[lightbox].caption}</figcaption>}
            {galeria.length > 1 && <p className="text-white/30 text-xs mt-2 tabular-nums">{lightbox + 1} / {galeria.length}</p>}
          </figure>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Servicios ───────────────────────────────────────────────────────────────

export const ServiciosGrid = ({ servicios, colorPrimario, dark = true }) => {
  const activos = servicios?.filter((s) => s.activo) ?? []
  if (!activos.length) return null
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {activos.map((s) => (
        <div
          key={s.id}
          style={{ '--clr': colorPrimario }}
          className={`group flex items-start gap-4 p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--clr)_50%,transparent)] hover:bg-[color-mix(in_srgb,var(--clr)_12%,transparent)] ${dark ? 'bg-white/5 border-white/8' : 'bg-white border-slate-100 shadow-sm'}`}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${colorPrimario}20` }}>
            <ServicioIcon icono={s.icono} size={24} style={{ color: colorPrimario }} />
          </div>
          <div>
            <p className={`font-bold text-lg mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>{s.titulo}</p>
            <p className={`text-sm leading-relaxed ${dark ? 'text-white/50' : 'text-slate-500'}`}>{s.descripcion}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export const StaffGrid = ({ staff, colorPrimario, dark = true }) => {
  if (!staff?.length) return null
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
      {staff.map((m) => {
        const inicial = m.nombre?.charAt(0)?.toUpperCase() ?? '?'
        return (
          <div key={m.id} className={`flex flex-col items-center text-center p-6 rounded-2xl border ${dark ? 'bg-white/5 border-white/8' : 'bg-white border-slate-100 shadow-sm'}`}>
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 flex items-center justify-center text-lg font-bold" style={{ borderColor: `${colorPrimario}40`, backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
              {m.foto
                ? <img src={m.foto} alt={m.nombre} className="w-full h-full object-cover" />
                : inicial
              }
            </div>
            <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{m.nombre}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: colorPrimario }}>{m.rol}</p>
            {m.descripcion && (
              <p className={`text-xs leading-relaxed mt-3 ${dark ? 'text-white/40' : 'text-slate-400'}`}>{m.descripcion}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FaqItemLanding = ({ item, colorPrimario, dark }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${dark ? 'border-white/8' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${dark ? 'hover:bg-white/4' : 'hover:bg-slate-50'}`}
      >
        <span className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-700'}`}>{item.pregunta}</span>
        {open
          ? <ChevronUp size={16} className={dark ? 'text-white/40 shrink-0' : 'text-slate-400 shrink-0'} />
          : <ChevronDown size={16} className={dark ? 'text-white/40 shrink-0' : 'text-slate-400 shrink-0'} />
        }
      </button>
      {open && (
        <div className={`px-5 pb-4 border-t text-sm leading-relaxed ${dark ? 'border-white/5 text-white/50' : 'border-slate-100 text-slate-500'}`}>
          <p className="pt-3">{item.respuesta}</p>
        </div>
      )}
    </div>
  )
}

export { hayContacto } from './landingUtils' // re-export (los templates lo importan de acá)

// Sección de contacto: datos del club + redes + mapa (read-only) + botón "Cómo llegar".
export const ContactoSection = ({ club, colorPrimario = '#afca0b', dark = true }) => {
  const { direccion, telefono, whatsapp, instagram, facebook, lat, lng } = club
  const tieneMapa = lat != null && lng != null
  const waNum = (whatsapp || '').replace(/\D/g, '')
  const mapaUrl = tieneMapa ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null

  // Un solo número: preferimos WhatsApp (con su ícono); si no hay, el teléfono.
  const contacto = whatsapp
    ? { icon: <WhatsAppIcon />, texto: whatsapp, href: waNum ? `https://wa.me/${waNum}` : null }
    : telefono
      ? { icon: <Phone size={17} />, texto: telefono, href: `tel:${(telefono || '').replace(/[^\d+]/g, '')}` }
      : null

  const items = [
    direccion && { icon: <MapPin size={17} />, texto: direccion, href: mapaUrl },
    contacto,
    instagram && { icon: <InstagramIcon />, texto: limpiarHandle(instagram), href: urlInsta(instagram) },
    facebook && { icon: <FacebookIcon />, texto: (facebook || '').replace(/^https?:\/\/(www\.)?facebook\.com\//, ''), href: urlFace(facebook) },
  ].filter(Boolean)
  if (!items.length && !tieneMapa) return null

  const cardCls = dark ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
  const txtCls = dark ? 'text-white' : 'text-slate-800'
  const mutedCls = dark ? 'text-white/45' : 'text-slate-400'

  return (
    <div className={`mx-auto grid gap-5 items-stretch ${tieneMapa ? 'max-w-5xl md:grid-cols-5' : 'max-w-md'}`}>
      {/* Columna de contacto */}
      <div className={`flex flex-col gap-3 ${tieneMapa ? 'md:col-span-2' : ''}`}>

        {/* WhatsApp / teléfono — CTA protagonista */}
        {contacto && (
          <a href={contacto.href} target={contacto.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
            className="group relative overflow-hidden rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
            style={{ background: whatsapp ? 'linear-gradient(135deg,#25D366,#128C7E)' : `linear-gradient(135deg,${colorPrimario},${colorPrimario}cc)` }}>
            <span className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
            <span className="relative w-12 h-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">{contacto.icon}</span>
            <div className="relative min-w-0">
              <p className={`font-bold text-sm leading-tight ${whatsapp ? 'text-white' : 'text-black/80'}`}>{whatsapp ? 'Escribinos por WhatsApp' : 'Llamanos'}</p>
              <p className={`text-xs mt-0.5 truncate ${whatsapp ? 'text-white/80' : 'text-black/60'}`}>{contacto.texto}</p>
            </div>
            <ArrowRight size={18} className={`relative ml-auto shrink-0 group-hover:translate-x-1 transition-transform ${whatsapp ? 'text-white/80' : 'text-black/50'}`} />
          </a>
        )}

        {/* Dirección */}
        {direccion && (
          <a href={mapaUrl || undefined} target={mapaUrl ? '_blank' : undefined} rel="noreferrer"
            className={`group rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 ${cardCls}`}>
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${colorPrimario}22`, color: colorPrimario }}><MapPin size={18} /></span>
            <div className="min-w-0">
              <p className={`text-[11px] uppercase tracking-wide font-semibold ${mutedCls}`}>Dónde estamos</p>
              <p className={`text-sm font-medium break-words ${txtCls}`}>{direccion}</p>
            </div>
            {mapaUrl && <ArrowRight size={15} className={`ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ${mutedCls}`} />}
          </a>
        )}

        {/* Redes */}
        {(instagram || facebook) && (
          <div className="flex items-center gap-2.5 mt-1">
            <span className={`text-xs font-medium ${mutedCls}`}>Seguinos</span>
            {instagram && (
              <a href={urlInsta(instagram)} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="w-10 h-10 rounded-xl grid place-items-center text-white transition-transform hover:scale-110 shadow-md"
                style={{ background: 'linear-gradient(135deg,#833AB4,#E1306C 55%,#F77737)' }}><InstagramIcon size={18} /></a>
            )}
            {facebook && (
              <a href={urlFace(facebook)} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-10 h-10 rounded-xl grid place-items-center text-white bg-[#1877F2] transition-transform hover:scale-110 shadow-md"><FacebookIcon size={18} /></a>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      {tieneMapa && (
        <div className="md:col-span-3 flex flex-col gap-3">
          <div className={`rounded-2xl overflow-hidden shadow-xl ${dark ? 'ring-1 ring-white/10' : 'ring-1 ring-slate-200'}`}>
            <MapaUbicacion lat={lat} lng={lng} editable={false} alto={280} />
          </div>
          <a href={mapaUrl} target="_blank" rel="noreferrer"
            className="group inline-flex items-center justify-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg"
            style={{ backgroundColor: colorPrimario, color: '#0d1117' }}>
            <Navigation size={16} className="group-hover:rotate-12 transition-transform" /> Cómo llegar
          </a>
        </div>
      )}
    </div>
  )
}

export const FaqList = ({ faq, colorPrimario, dark = true }) => {
  if (!faq?.length) return null
  return (
    <div className="flex flex-col gap-2">
      {faq.map((f) => (
        <FaqItemLanding key={f.id} item={f} colorPrimario={colorPrimario} dark={dark} />
      ))}
    </div>
  )
}

// ─── Turnos disponibles ───────────────────────────────────────────────────────

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const fmtDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDaysTo = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

const DIAS_SEMANA_KEY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const getDiaKey = (date) => DIAS_SEMANA_KEY[date.getDay()]

// Calcula slots usando generateFranjas (misma lógica que el admin) + ocupa desde backend
// ocupados: [{ canchaId, horaInicio, horaFin }]
const calcSlots = (horarioDia, canchaId, ocupados) =>
  generateFranjas(horarioDia).map((f) => ({
    ...f,
    libre: !(ocupados || []).some(
      (r) => r.canchaId === canchaId && overlaps(r.horaInicio, r.horaFin, f.inicio, f.fin)
    ),
  }))

// Keyframes inyectados una sola vez al DOM
const KEYFRAMES = `
  @keyframes td-ring {
    0%   { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(3.2); opacity: 0; }
  }
  @keyframes td-freed-in {
    0%   { transform: translateY(-14px) scaleY(0.92); opacity: 0; }
    60%  { transform: translateY(2px) scaleY(1.01); opacity: 1; }
    100% { transform: translateY(0) scaleY(1); opacity: 1; }
  }
  @keyframes td-scan {
    0%   { left: -40%; }
    100% { left: 110%; }
  }
  @keyframes td-slot-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
    50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
  }
  @keyframes td-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }
  @keyframes td-num-pop {
    0%   { transform: scale(1.25) translateY(-4px); opacity: 0.3; }
    100% { transform: scale(1)    translateY(0);    opacity: 1; }
  }
  @keyframes td-card-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(16,185,129,0.06); }
    50%       { box-shadow: 0 0 24px rgba(16,185,129,0.14); }
  }
`

export const TurnosDisponibles = ({ canchas, horarios, colorPrimario, onCta, dark = true, variant = 'columns' }) => {
  const navigate = useNavigate()
  const isAuthenticated = usePlayerStore((s) => s.isAuthenticated)
  const torneos = useTorneosStore((s) => s.torneos)
  const [diaOffset, setDiaOffset] = useState(0)
  const [recentlyFreed, setRecentlyFreed] = useState([])
  const [ocupados, setOcupados] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const prevDataRef = useRef(null)
  const prevDiaOffsetRef = useRef(diaOffset)
  const prevCanchasRef = useRef(canchas)
  const cp = colorPrimario || '#10b981'

  const hoy = useMemo(() => new Date(), [])
  const diaActual = addDaysTo(hoy, diaOffset)
  const fechaStr = fmtDateStr(diaActual)
  const diaNombreLargo = DIAS_LARGOS[diaActual.getDay()]
  const diaKey = getDiaKey(diaActual)
  const horarioDia = horarios?.[diaNombreLargo]
  const canchasActivas = useMemo(() => (canchas ?? []).filter((c) => c.activa), [canchas])

  // Fetcha los slots ocupados desde el endpoint público (sin auth)
  useEffect(() => {
    const slug = import.meta.env.VITE_CLUB_SLUG
    if (!slug || !fechaStr) return
    setOcupados([])
    setLoadingSlots(true)
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    fetch(`${BASE}/clubs/${slug}/disponibilidad?fecha=${fechaStr}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setOcupados(Array.isArray(data) ? data : []))
      .catch(() => setOcupados([]))
      .finally(() => setLoadingSlots(false))
  }, [fechaStr])

  const dataPorCancha = useMemo(() => {
    // Argentina = UTC-3, sin DST
    const ahoraArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const minAhora = ahoraArg.getUTCHours() * 60 + ahoraArg.getUTCMinutes()
    const esHoy = diaOffset === 0
    return canchasActivas
      .map((c) => {
        // Usa el horario propio de la cancha si está activo para este día; si no, hereda el del club
        const canchaHorarioDia = c.horarios?.[diaNombreLargo]
        const horarioEfectivo = (canchaHorarioDia?.activo ? canchaHorarioDia : null) ?? horarioDia
        if (!horarioEfectivo?.activo) return null
        const slots = calcSlots(horarioEfectivo, c.id, ocupados).map((s) => ({
          ...s,
          pasado: esHoy && toMin(s.inicio) <= minAhora,
        }))
        return { cancha: c, slots, libres: slots.filter((s) => s.libre && !s.pasado).length }
      })
      .filter(Boolean)
  }, [canchasActivas, horarioDia, diaNombreLargo, ocupados, diaOffset])

  const totalLibres = dataPorCancha.reduce((sum, d) => sum + d.libres, 0)

  // Resetear comparación cuando llegan datos frescos del club (carga inicial post-localStorage)
  useEffect(() => {
    if (prevCanchasRef.current !== canchas) {
      prevCanchasRef.current = canchas
      prevDataRef.current = null
      setRecentlyFreed([])
    }
  }, [canchas])

  // Detectar transiciones reales ocupado → libre entre polls (cada 30s)
  useEffect(() => {
    // Mientras carga no establecer baseline: prevDataRef se inicializa solo con datos reales
    if (loadingSlots) return
    // Si el día cambió, limpiar — null fuerza solo inicialización en la próxima ejecución
    if (prevDiaOffsetRef.current !== diaOffset) {
      prevDiaOffsetRef.current = diaOffset
      prevDataRef.current = null
      setRecentlyFreed([])
      return
    }
    if (!prevDataRef.current) {
      prevDataRef.current = dataPorCancha
      return
    }
    const nuevos = []
    dataPorCancha.forEach((d) => {
      const prev = prevDataRef.current.find((p) => p.cancha.id === d.cancha.id)
      if (!prev) return
      d.slots.forEach((slot) => {
        const prevSlot = prev.slots.find((s) => s.inicio === slot.inicio)
        if (prevSlot && !prevSlot.libre && slot.libre && !slot.pasado)
          nuevos.push({ canchaId: d.cancha.id, canchaNombre: d.cancha.nombre, slot, freeSince: Date.now() })
      })
    })
    if (nuevos.length) setRecentlyFreed((prev) => [...prev, ...nuevos].slice(-3))
    prevDataRef.current = dataPorCancha
  }, [dataPorCancha, diaOffset, loadingSlots])

  // Auto-expirar freed slots y refrescar texto "hace instantes"
  useEffect(() => {
    const t = setInterval(() => {
      setRecentlyFreed((prev) => prev.filter((r) => Date.now() - r.freeSince < 28000))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const tiempoDesde = (ts) => {
    const sec = Math.floor((Date.now() - ts) / 1000)
    if (sec < 12) return 'hace instantes'
    if (sec < 60) return `hace ${sec}s`
    return 'hace un momento'
  }

  const isRecienLiberado = (canchaId, inicio) =>
    recentlyFreed.some((r) => r.canchaId === canchaId && r.slot.inicio === inicio)

  const torneoDelDia = useMemo(
    () => torneos.find((t) => t.estado === 'in_progress' && fechaStr >= t.fechaInicio && fechaStr <= t.fechaFin) ?? null,
    [torneos, fechaStr]
  )

  const torneoProximo = useMemo(() => {
    const hoyStr = fmtDateStr(new Date())
    const lim = new Date(); lim.setDate(lim.getDate() + 6)
    const limStr = fmtDateStr(lim)
    return torneos.find((t) => t.estado === 'in_progress' && t.fechaInicio <= limStr && t.fechaFin >= hoyStr) ?? null
  }, [torneos])

  const getTorneoDia = (d) => {
    const s = fmtDateStr(d)
    return torneos.find((t) => t.estado === 'in_progress' && s >= t.fechaInicio && s <= t.fechaFin) ?? null
  }

  // Solo grisea el día si el torneo bloquea TODAS las canchas activas
  const esDiaTorneo = (d) => {
    const t = getTorneoDia(d)
    if (!t) return false
    if (!t.canchasAsignadas?.length) return true
    return t.canchasAsignadas.length >= canchasActivas.length
  }

  const torneoBloqueTodas = torneoDelDia
    ? (!torneoDelDia.canchasAsignadas?.length || torneoDelDia.canchasAsignadas.length >= canchasActivas.length)
    : false

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="flex flex-col gap-5">

        {/* ── BANNER TORNEO ─────────────────────────────────────────────────── */}
        {torneoProximo && (
          <div className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${dark ? 'bg-white/3 border-white/8' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cp}18` }}>
              <Trophy size={15} style={{ color: cp }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: cp }} />
                <span className={`text-xs font-bold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{torneoProximo.nombre}</span>
                <span className={`text-[10px] shrink-0 ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                  {fmtFechaTorneo(torneoProximo.fechaInicio)} → {fmtFechaTorneo(torneoProximo.fechaFin)}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/30' : 'text-slate-500'}`}>
                {torneoBloqueTodas
                  ? 'Todas las canchas están reservadas para el torneo — los demás días están disponibles normalmente'
                  : 'Algunas canchas están reservadas para el torneo — el resto están disponibles para reservar'
                }
              </p>
            </div>
          </div>
        )}

        {/* ── HEADER: live badge + counter + selector de días ─────────────────── */}
        {variant === 'matrix' ? (
          <div className="flex flex-col gap-3.5">
            {/* Fila compacta: en vivo + contador inline */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Píldora EN VIVO */}
              <div className={`inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 border ${dark ? 'bg-white/[0.04] border-white/8' : 'bg-slate-50 border-slate-200'}`}>
                <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.2, animation: 'td-ring 1.8s ease-out infinite' }} />
                  <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.12, animation: 'td-ring 1.8s ease-out infinite 0.6s' }} />
                  <div className="w-1.5 h-1.5 rounded-full relative z-10" style={{ backgroundColor: cp }} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: cp }}>En vivo</span>
              </div>

              {/* Contador */}
              {torneoDelDia ? (
                <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>Torneo en curso — sin turnos este día</span>
              ) : horarioDia?.activo ? (
                <div className="flex items-baseline gap-2">
                  <span key={`${totalLibres}-${fechaStr}`} className="text-3xl font-black tabular-nums leading-none" style={{ color: cp, animation: 'td-num-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>{totalLibres}</span>
                  <span className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>turno{totalLibres !== 1 ? 's' : ''} libre{totalLibres !== 1 ? 's' : ''}</span>
                  <span className={`hidden sm:flex items-center gap-1.5 text-[11px] ml-1 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                    <Clock size={11} />{horarioDia.apertura}–{horarioDia.cierre} hs
                  </span>
                </div>
              ) : (
                <span className={`text-sm font-bold ${dark ? 'text-white/25' : 'text-slate-400'}`}>Club cerrado hoy</span>
              )}

              {/* Chip de fecha */}
              <div className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-[11px] font-medium capitalize ${dark ? 'bg-white/[0.04] border-white/8 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <CalendarDays size={12} style={{ color: cp }} />
                {diaOffset === 0 ? 'Hoy · ' : ''}{DIAS_CORTOS[diaActual.getDay()]} {diaActual.getDate()}
              </div>
            </div>
            {/* Tabs de días a todo el ancho */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDaysTo(hoy, i)
                const sel = i === diaOffset
                const esTorneo = esDiaTorneo(d)
                return (
                  <button
                    key={i}
                    onClick={() => setDiaOffset(i)}
                    className={[
                      'flex flex-col items-center w-full py-2 rounded-xl border text-center transition-all duration-200',
                      esTorneo && !sel ? (dark ? 'border-white/4 text-white/15' : 'border-slate-100 text-slate-300') : '',
                      !esTorneo && !sel && dark  ? 'border-white/6 text-white/30 hover:text-white hover:bg-white/5 hover:border-white/15' : '',
                      !esTorneo && !sel && !dark ? 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50' : '',
                    ].join(' ')}
                    style={sel && esTorneo
                      ? { backgroundColor: `${cp}10`, borderColor: `${cp}30`, color: dark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }
                      : sel
                      ? { backgroundColor: `${cp}18`, borderColor: `${cp}50`, color: cp }
                      : {}}
                  >
                    <span className="text-[8px] font-black uppercase leading-none mb-0.5">{i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}</span>
                    <span className="text-[15px] font-black leading-tight">{d.getDate()}</span>
                    {esTorneo && <span className="text-[7px] leading-none mt-0.5 opacity-60" style={{ color: cp }}>torneo</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
        <div className="flex flex-col sm:flex-row sm:items-end gap-5">

          {/* Counter */}
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              {/* Pulsing ring */}
              <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.2, animation: 'td-ring 1.8s ease-out infinite' }} />
                <div className="absolute inset-0 rounded-full" style={{ backgroundColor: cp, opacity: 0.12, animation: 'td-ring 1.8s ease-out infinite 0.6s' }} />
                <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: cp }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: cp }}>En vivo</span>
              <span className={`text-[10px] ${dark ? 'text-white/15' : 'text-slate-300'}`}>·</span>
              <span className={`text-[10px] font-medium capitalize ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                {diaOffset === 0 ? 'Hoy · ' : ''}{DIAS_LARGOS[diaActual.getDay()]} {diaActual.getDate()}
              </span>
            </div>

            {torneoDelDia ? (
              <div className="flex items-center gap-3">
                <Trophy size={36} style={{ color: cp, opacity: 0.55 }} />
                <div>
                  <p className={`text-xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-800'}`}>Torneo en curso</p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>Sin turnos disponibles este día</p>
                </div>
              </div>
            ) : horarioDia?.activo ? (
              <div className="flex items-baseline gap-3">
                <span
                  key={`${totalLibres}-${fechaStr}`}
                  className="text-6xl font-black tabular-nums leading-none"
                  style={{ color: cp, animation: 'td-num-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
                >
                  {totalLibres}
                </span>
                <div>
                  <p className={`text-xl font-bold leading-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                    turno{totalLibres !== 1 ? 's' : ''} libre{totalLibres !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                    {horarioDia.apertura}–{horarioDia.cierre} hs
                  </p>
                </div>
              </div>
            ) : (
              <p className={`text-2xl font-bold ${dark ? 'text-white/25' : 'text-slate-400'}`}>Club cerrado hoy</p>
            )}
          </div>

          {/* Selector de días */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDiaOffset(Math.max(0, diaOffset - 1))}
              disabled={diaOffset === 0}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDaysTo(hoy, i)
                const sel = i === diaOffset
                const esTorneo = esDiaTorneo(d)
                return (
                  <button
                    key={i}
                    onClick={() => setDiaOffset(i)}
                    className={[
                      'flex flex-col items-center w-10 py-1.5 rounded-xl border text-center transition-all duration-200',
                      esTorneo && !sel ? (dark ? 'border-white/4 text-white/15 cursor-pointer' : 'border-slate-100 text-slate-300 cursor-pointer') : '',
                      !esTorneo && !sel && dark  ? 'border-white/6 text-white/30 hover:text-white hover:bg-white/5 hover:border-white/15' : '',
                      !esTorneo && !sel && !dark ? 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50' : '',
                    ].join(' ')}
                    style={sel && esTorneo
                      ? { backgroundColor: `${cp}10`, borderColor: `${cp}30`, color: dark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }
                      : sel
                      ? { backgroundColor: `${cp}18`, borderColor: `${cp}50`, color: cp }
                      : {}}
                  >
                    <span className="text-[8px] font-black uppercase leading-none mb-0.5">{i === 0 ? 'Hoy' : DIAS_CORTOS[d.getDay()]}</span>
                    <span className="text-[13px] font-black leading-tight">{d.getDate()}</span>
                    {esTorneo && <span className="text-[7px] leading-none mt-0.5 opacity-60" style={{ color: cp }}>torneo</span>}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setDiaOffset(Math.min(6, diaOffset + 1))}
              disabled={diaOffset === 6}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 ${dark ? 'text-white/30 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        )}

        {/* ── NOTIFICACIÓN: Cancha liberada ─────────────────────────────────── */}
        {recentlyFreed.map((freed) => (
          <div
            key={`${freed.canchaId}-${freed.slot.inicio}`}
            className="rounded-2xl overflow-hidden cursor-pointer select-none"
            style={{ animation: 'td-freed-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            onClick={() => {
              if (!isAuthenticated) { onCta(); return }
              navigate('/dashboardJugadores/reservas', { state: { canchaId: freed.canchaId, fechaStr, hora: freed.slot.inicio } })
            }}
          >
            <div className="relative px-5 py-3.5 flex items-center gap-4 overflow-hidden"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
              {/* Scan line animation */}
              <div className="absolute inset-y-0 w-2/5 pointer-events-none"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.12),transparent)', animation: 'td-scan 2.8s ease-in-out infinite' }} />
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{ backgroundColor: 'rgba(16,185,129,0.18)', animation: 'td-slot-glow 2s ease-in-out infinite' }}>
                <CalendarDays size={16} style={{ color: '#10b981' }} />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Cancha liberada</span>
                  <span className="text-[9px] text-emerald-600 font-medium">{tiempoDesde(freed.freeSince)}</span>
                </div>
                <p className={`text-sm font-bold truncate ${dark ? 'text-white/85' : 'text-slate-700'}`}>
                  {freed.canchaNombre} · {freed.slot.inicio} a {freed.slot.fin}
                </p>
              </div>
              {/* CTA badge */}
              <div className="shrink-0 relative z-10"
                style={{ animation: 'td-float 2.2s ease-in-out infinite' }}>
                <div className="px-3 py-1.5 rounded-xl text-[11px] font-black"
                  style={{ backgroundColor: 'rgba(16,185,129,0.22)', color: '#10b981' }}>
                  {isAuthenticated ? 'Reservar →' : 'Ver →'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── GRID DE CANCHAS ───────────────────────────────────────────────── */}
        {torneoDelDia && torneoBloqueTodas ? (
          <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-white/2 border-white/6' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${cp}14` }}>
              <Trophy size={22} style={{ color: cp, opacity: 0.7 }} />
            </div>
            <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white/50' : 'text-slate-600'}`}>{torneoDelDia.nombre}</p>
            <p className={`text-xs ${dark ? 'text-white/20' : 'text-slate-400'}`}>
              Las canchas están reservadas para el torneo este día.{' '}
              <span style={{ color: cp }} className="font-medium">Vení a disfrutar el ambiente.</span>
            </p>
          </div>
        ) : !horarioDia?.activo ? (
          <div className={`rounded-2xl border p-10 text-center ${dark ? 'bg-white/2 border-white/6' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${cp}12` }}>
              <CalendarDays size={18} className={dark ? 'text-white/20' : 'text-slate-300'} />
            </div>
            <p className={`text-sm font-medium ${dark ? 'text-white/25' : 'text-slate-400'}`}>El club no abre este día</p>
          </div>
        ) : loadingSlots ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {(canchasActivas.length ? canchasActivas : [1, 2]).map((c) => (
              <div key={c.id ?? c} className="rounded-2xl overflow-hidden animate-pulse"
                style={{ backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'white', border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9' }}>
                <div className="px-4 py-3" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9' }}>
                  <div className={`h-4 w-24 rounded ${dark ? 'bg-white/10' : 'bg-slate-100'}`} />
                </div>
                <div className="px-4 py-3 flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-9 rounded-xl ${dark ? 'bg-white/5' : 'bg-slate-50'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : variant === 'matrix' ? (
          (() => {
            // Unión de todos los horarios (las canchas pueden tener franjas propias)
            const times = [...new Set(dataPorCancha.flatMap((d) => d.slots.map((s) => s.inicio)))]
              .sort((a, b) => toMin(a) - toMin(b))
            const finDe = (t) => {
              for (const d of dataPorCancha) { const s = d.slots.find((x) => x.inicio === t); if (s) return s.fin }
              return ''
            }
            const colBorder = dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
            const gridCols = { gridTemplateColumns: `minmax(58px, 84px) repeat(${dataPorCancha.length}, minmax(0, 1fr))` }
            return (
              <div className="overflow-x-auto -mx-1 px-1">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    minWidth: dataPorCancha.length > 2 ? `${88 + dataPorCancha.length * 120}px` : undefined,
                    backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'white',
                    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9',
                    boxShadow: !dark ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                  }}
                >
                  {/* Cabecera: canchas */}
                  <div className="grid" style={gridCols}>
                    <div className="px-3 py-3" />
                    {dataPorCancha.map(({ cancha, libres }) => {
                      const hayFreed = recentlyFreed.some((r) => r.canchaId === cancha.id)
                      return (
                        <div key={cancha.id} className="px-3 py-3.5 text-center" style={{ borderLeft: `1px solid ${colBorder}` }}>
                          <div className="flex items-center justify-center gap-1.5">
                            <p className={`font-black text-base truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{cancha.nombre}</p>
                            {hayFreed && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#10b981', animation: 'td-float 1.8s ease-in-out infinite' }} />}
                          </div>
                          <p className={`text-[11px] mt-0.5 ${dark ? 'text-white/30' : 'text-slate-400'}`}>{cancha.tipo} · {cancha.indoor ? 'Indoor' : 'Outdoor'}</p>
                          <p className="text-[11px] font-black uppercase tracking-wide mt-1.5" style={{ color: cp }}>{libres} libre{libres !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Filas por horario */}
                  {times.map((t) => (
                    <div key={t} className="grid" style={{ ...gridCols, borderTop: `1px solid ${colBorder}` }}>
                      <div className={`px-3 py-2 flex flex-col justify-center ${dark ? 'text-white/50' : 'text-slate-400'}`}>
                        <span className="text-sm font-bold tabular-nums leading-none">{t}</span>
                        <span className="text-[10px] leading-none mt-1 opacity-60 tabular-nums">{finDe(t)}</span>
                      </div>
                      {dataPorCancha.map((d) => {
                        const slot = d.slots.find((s) => s.inicio === t)
                        if (!slot) return <div key={d.cancha.id} style={{ borderLeft: `1px solid ${colBorder}` }} />
                        if (!slot.libre || slot.pasado) {
                          return (
                            <div key={d.cancha.id} className="flex items-center justify-center py-2 px-2" style={{ borderLeft: `1px solid ${colBorder}` }}>
                              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)' }}>
                                {slot.pasado ? 'Pasado' : 'Ocupado'}
                              </span>
                            </div>
                          )
                        }
                        const recienLiberado = isRecienLiberado(d.cancha.id, slot.inicio)
                        return (
                          <div key={d.cancha.id} className="p-1.5" style={{ borderLeft: `1px solid ${colBorder}` }}>
                            <button
                              onClick={() => {
                                if (!isAuthenticated) { onCta(); return }
                                navigate('/dashboardJugadores/reservas', { state: { canchaId: d.cancha.id, fechaStr, hora: slot.inicio } })
                              }}
                              className="group relative w-full min-h-[40px] rounded-lg text-[13px] font-black flex items-center justify-center gap-1.5 transition-all duration-150 hover:brightness-110 active:scale-[0.97] overflow-hidden"
                              style={{
                                backgroundColor: recienLiberado ? 'rgba(16,185,129,0.14)' : `${cp}12`,
                                color: recienLiberado ? '#10b981' : cp,
                                border: recienLiberado ? '1px solid rgba(16,185,129,0.35)' : `1px solid ${cp}28`,
                                animation: recienLiberado ? 'td-slot-glow 1.6s ease-in-out infinite' : 'none',
                              }}
                            >
                              <div className="absolute inset-y-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: `linear-gradient(90deg,transparent,${recienLiberado ? 'rgba(16,185,129,0.15)' : `${cp}25`},transparent)`, animation: 'td-scan 1.4s ease-in-out' }} />
                              {!isAuthenticated && <Lock size={11} className="relative z-10" />}
                              <span className="relative z-10 uppercase tracking-wider">{isAuthenticated ? 'Reservar' : 'Ver'}</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Pie: ocupación por cancha */}
                  <div className="grid" style={{ ...gridCols, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#eef1f4'}` }}>
                    <div className={`px-3 py-2.5 flex items-center ${dark ? 'text-white/25' : 'text-slate-300'}`}>
                      <span className="text-[10px] font-black uppercase tracking-[0.12em]">Ocup.</span>
                    </div>
                    {dataPorCancha.map((d) => {
                      const pctOcupado = Math.round(((d.slots.length - d.libres) / Math.max(d.slots.length, 1)) * 100)
                      const fillColor = pctOcupado > 70 ? '#f87171' : pctOcupado > 40 ? '#fbbf24' : cp
                      return (
                        <div key={d.cancha.id} className="px-3 py-2.5" style={{ borderLeft: `1px solid ${colBorder}` }}>
                          <div className="flex items-center justify-end mb-1.5">
                            <span className="text-[11px] font-black tabular-nums" style={{ color: fillColor }}>{pctOcupado}%</span>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 8 }, (_, i) => {
                              const filled = i < Math.round(pctOcupado / 12.5)
                              return <div key={i} className="flex-1 h-1 rounded-full transition-all duration-700" style={{ backgroundColor: filled ? fillColor : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', boxShadow: filled ? `0 0 4px ${fillColor}80` : 'none' }} />
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {dataPorCancha.map(({ cancha, slots, libres }) => {
              const hayFreed = recentlyFreed.some((r) => r.canchaId === cancha.id)
              const pctOcupado = Math.round(((slots.length - libres) / Math.max(slots.length, 1)) * 100)

              return (
                <div
                  key={cancha.id}
                  className="rounded-2xl overflow-hidden transition-all duration-500"
                  style={{
                    backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'white',
                    border: hayFreed
                      ? '1px solid rgba(16,185,129,0.35)'
                      : dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9',
                    animation: hayFreed ? 'td-card-glow 2.5s ease-in-out infinite' : 'none',
                    boxShadow: !hayFreed && !dark ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                  }}
                >
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-black text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{cancha.nombre}</p>
                        {hayFreed && (
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', animation: 'td-float 1.8s ease-in-out infinite' }}
                          >
                            ¡Libre!
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/25' : 'text-slate-400'}`}>
                        {cancha.tipo} · {cancha.indoor ? 'Indoor' : 'Outdoor'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black tabular-nums leading-none" style={{ color: cp }}>{libres}</p>
                      <p className={`text-[8px] font-bold uppercase tracking-wide ${dark ? 'text-white/20' : 'text-slate-300'}`}>libres</p>
                    </div>
                  </div>

                  {/* Slot grid — vertical, uno abajo del otro */}
                  <div className="px-4 pb-3 flex flex-col gap-1.5">
                    {slots.map((slot) => {
                      const recienLiberado = isRecienLiberado(cancha.id, slot.inicio)
                      const esLight = !dark
                      if (!slot.libre || slot.pasado) {
                        return (
                          <div key={slot.inicio}
                            className={`px-3 rounded-xl font-medium flex items-center select-none ${esLight ? 'h-10 text-[13px]' : 'h-8 text-[10px]'}`}
                            style={{
                              backgroundColor: dark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                              color: dark ? 'rgba(255,255,255,0.1)' : '#94a3b8',
                              border: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #e2e8f0',
                            }}
                          >
                            <span className="line-through">{slot.inicio} — {slot.fin}</span>
                            {slot.pasado && (
                              <span className="ml-auto text-[9px] uppercase tracking-wider opacity-70">Pasado</span>
                            )}
                          </div>
                        )
                      }
                      return (
                        <button
                          key={slot.inicio}
                          onClick={() => {
                            if (!isAuthenticated) { onCta(); return }
                            navigate('/dashboardJugadores/reservas', { state: { canchaId: cancha.id, fechaStr, hora: slot.inicio } })
                          }}
                          style={{
                            '--clr': cp,
                            color: recienLiberado ? '#10b981' : cp,
                            ...(recienLiberado
                              ? { backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', animation: 'td-slot-glow 1.6s ease-in-out infinite' }
                              : esLight ? {} : { backgroundColor: `${cp}12`, border: `1px solid ${cp}28` }),
                          }}
                          className={`relative px-3 rounded-xl font-bold flex items-center justify-between gap-2 transition-all duration-150 active:scale-[0.98] overflow-hidden group ${esLight ? 'h-10 text-[13px]' : 'h-8 text-[10px]'} ${esLight && !recienLiberado ? 'bg-white border border-slate-200 hover:border-[var(--clr)] hover:bg-[color-mix(in_srgb,var(--clr)_8%,transparent)]' : 'hover:scale-[1.02] hover:brightness-110'}`}
                        >
                          {/* Scan shimmer solo en oscuro/liberado (en minimal molesta) */}
                          {(!esLight || recienLiberado) && (
                            <div className="absolute inset-y-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: `linear-gradient(90deg,transparent,${recienLiberado ? 'rgba(16,185,129,0.15)' : `${cp}25`},transparent)`, animation: 'td-scan 1.4s ease-in-out' }} />
                          )}
                          <span className="relative z-10">{slot.inicio} — {slot.fin}</span>
                          <span className="relative z-10 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {!isAuthenticated && <Lock size={esLight ? 9 : 7} />}
                            <span className={`font-black uppercase tracking-wider ${esLight ? 'text-[10px]' : 'text-[8px]'}`}>
                              {isAuthenticated ? 'Reservar →' : 'Ver'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Card footer: ocupación */}
                  {dark ? (
                    <div className="mx-4 mb-4 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/20">Ocupación</span>
                        <span className="text-[10px] font-black tabular-nums" style={{ color: pctOcupado > 70 ? '#f87171' : pctOcupado > 40 ? '#fbbf24' : cp }}>
                          {pctOcupado}<span className="text-[7px] font-bold">%</span>
                        </span>
                      </div>
                      {/* Segmented progress bar */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => {
                          const filled = i < Math.round(pctOcupado / 10)
                          const fillColor = pctOcupado > 70 ? '#f87171' : pctOcupado > 40 ? '#fbbf24' : cp
                          return (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-700"
                              style={{ backgroundColor: filled ? fillColor : 'rgba(255,255,255,0.06)', boxShadow: filled ? `0 0 4px ${fillColor}80` : 'none' }} />
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Minimal: una sola barra fina, sin colores de alarma */
                    <div className="mx-4 mb-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-300">Ocupación</span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-500">{pctOcupado}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctOcupado}%`, backgroundColor: cp }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full"
                style={{ backgroundColor: cp, animation: 'td-ring 2s ease-out infinite' }} />
              <div className="w-1.5 h-1.5 rounded-full relative z-10" style={{ backgroundColor: cp }} />
            </div>
            <span className={`text-[11px] font-medium ${dark ? 'text-white/25' : 'text-slate-400'}`}>
              Actualizado en tiempo real
            </span>
          </div>
          {totalLibres > 0 && (
            <button
              onClick={onCta}
              className="flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 active:scale-95 hover:shadow-lg"
              style={{ backgroundColor: cp, color: '#0d1117' }}
            >
              {isAuthenticated ? <CheckCircle size={14} /> : <Lock size={14} />}
              {isAuthenticated ? 'Reservar ahora' : 'Iniciar sesión'}
            </button>
          )}
        </div>

      </div>
    </>
  )
}
