import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Trophy, Calendar, ArrowLeft, Users, GitMerge, Clock, CheckCircle,
} from 'lucide-react'
import useTorneosStore from '../store/torneosStore'
import useClubStore from '../store/clubStore'
import { isGroupPhaseFinished } from '../services/torneoService'
import BracketView, { isColorDark } from '../components/BracketView'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const CAT_PALETTE = ['#38bdf8', '#f59e0b', '#f43f5e', '#a78bfa', '#34d399', '#fb923c', '#e879f9']
const buildCatColorMap = (cats) => Object.fromEntries(cats.map((c, i) => [c, CAT_PALETTE[i % CAT_PALETTE.length]]))
const DIAS_ORDEN = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

const fmtFecha = (iso) => {
  const [,m,d] = iso.split('-').map(Number)
  return `${d} ${MESES[m-1]}`
}

// ── Tab Fixture del día ───────────────────────────────────────────────────────

const TabFixture = ({ torneo, canchaName, accentColor, imagenFondo = null, cardStyle = 'oscura', colorCard = null }) => {
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
            {partidosDelDia.map((p) => {
              const finalizado = p.estado === 'finalizado'
              const ganP1 = p.ganador?.id === p.pareja1?.id
              const ganP2 = p.ganador?.id === p.pareja2?.id
              return (
                <div key={p.id} className={cardStyle_(finalizado)} style={cardBg}>
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b ${st.hdrBorder}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        {p._zona}
                      </span>
                      {multiCat && p._cat && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: catColorMap[p._cat] + '22', color: catColorMap[p._cat], border: `1px solid ${catColorMap[p._cat]}40` }}>
                          {p._cat}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.slot.hora && <span className={st.hora}>{p.slot.hora} hs</span>}
                      {p.cancha    && <span className={st.cancha}>{canchaName(p.cancha)}</span>}
                      {finalizado  && <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle size={9} /> Finalizado</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex items-center gap-2 flex-1 min-w-0 ${ganP1 ? st.nameW : ganP2 ? st.nameL : st.nameN}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : finalizado ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n1}</span>
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
                    <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${ganP2 ? st.nameW : ganP1 ? st.nameL : st.nameN}`}>
                      <span className={`text-sm truncate text-right ${ganP1 && finalizado ? 'line-through' : ''}`}>
                        {p.pareja2 ? `${p.pareja2.jugador1.split(' ')[0]} / ${p.pareja2.jugador2.split(' ')[0]}` : '—'}
                      </span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : finalizado ? `${st.seedBg} opacity-50` : st.seedBg}`}>{p._n2}</span>
                    </div>
                  </div>
                </div>
              )
            })}
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

const TabGrupos = ({ torneo, accentColor, imagenFondo = null, imagenHeader = null, colorTexto = null, bannerLeft = null, bannerRight = null, cardStyle = 'oscura', colorCard = null }) => {
  const effectiveStyle = colorCard ? (isColorDark(colorCard) ? 'oscura' : 'clara') : cardStyle
  const isClara = effectiveStyle === 'clara'
  const st = {
    zona:       isClara ? 'rounded-2xl border border-gray-200 overflow-hidden bg-white'  : 'rounded-2xl border border-white/8 overflow-hidden',
    zonaHdr:    isClara ? 'flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200' : 'flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/8',
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
  const cardBg = colorCard ? { backgroundColor: colorCard } : undefined

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
                const ganN       = ganP1 ? n1 : ganP2 ? n2 : null

                return (
                  <div key={m.id} className={finalizado ? st.matchCardFin : st.matchCard}>
                    <div className={finalizado ? st.matchBodyFin : st.matchBody}>
                      {/* P1 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP1 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n1 ?? '?'}</span>
                        <span className={`text-xs truncate ${ganP1 ? st.nameW : finalizado ? st.nameL : st.nameN}`}>
                          {m.pareja1 ? `${m.pareja1.jugador1.split(' ')[0]} / ${m.pareja1.jugador2.split(' ')[0]}` : '—'}
                        </span>
                      </div>
                      {/* Sets */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {finalizado && m.resultado?.length > 0 ? (
                          m.resultado.map((s, i) => (
                            <span key={i} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${s.p1 > s.p2 ? st.chipW : st.chipL}`}>{s.p1}-{s.p2}</span>
                          ))
                        ) : (
                          <span className={st.vs}>vs</span>
                        )}
                      </div>
                      {/* P2 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className={`text-xs truncate text-right ${ganP2 ? st.nameW : finalizado ? st.nameL : st.nameN}`}>
                          {m.pareja2 ? `${m.pareja2.jugador1.split(' ')[0]} / ${m.pareja2.jugador2.split(' ')[0]}` : '—'}
                        </span>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${ganP2 ? 'bg-emerald-500 text-white' : `${st.seedBg}${finalizado ? ' opacity-60' : ''}`}`}>{n2 ?? '?'}</span>
                      </div>
                    </div>
                    {/* Footer horario */}
                    <div className={st.ftBorder}>
                      {m.slot
                        ? <span className={st.ftSlot}>{m.slot.dia} · {m.slot.hora ?? m.slot.franja.split('(')[0].trim()}</span>
                        : <span className={st.ftNoSlot}>Sin horario</span>
                      }
                      {finalizado && ganN !== null
                        ? <span className="text-[10px] font-bold text-emerald-400">✓ P{ganN} ganó</span>
                        : <span className={st.ftPendiente}>pendiente</span>
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

const TorneoPublicoPage = () => {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const torneos    = useTorneosStore((s) => s.torneos)
  const club       = useClubStore((s) => s.club)
  const canchas    = club.canchas
  const [tab, setTab] = useState('fixture')

  const torneo      = torneos.find((t) => String(t.id) === String(id))
  const accentColor = torneo?.colorAcento || '#afca0b'

  const canchaName = (canchaId) =>
    canchas.find((c) => c.id === canchaId)?.nombre ?? canchaId

  const bannerLeft  = tab === 'fixture'
    ? (torneo?.bannerLateral1Fixture ?? null)
    : (torneo?.bannerLateral1Grupos  ?? null)
  const bannerRight = tab === 'fixture'
    ? (torneo?.bannerLateral2Fixture ?? null)
    : (torneo?.bannerLateral2Grupos  ?? null)

  const bannerZones = tab === 'fixture' ? 1 : (torneo?.grupos?.length ?? 4)

  if (!torneo || torneo.estado !== 'in_progress') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-6">
        <div className="text-center">
          <Trophy size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-semibold">Torneo no encontrado</p>
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
              <div className="w-1.5 h-1.5 rounded-full bg-[#afca0b] animate-pulse" />
              <span className="text-[10px] font-bold text-[#afca0b] uppercase tracking-widest">En curso</span>
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
                    ? 'border-[#afca0b] text-[#afca0b]'
                    : 'border-transparent text-white/30 hover:text-white/60'
                }`}
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
            {tab === 'fixture' && <TabFixture torneo={torneo} canchaName={canchaName} accentColor={accentColor} imagenFondo={torneo.imagenFondoFixture ?? null} cardStyle={torneo.estiloCardFixture ?? 'oscura'} colorCard={torneo.colorCardFixture ?? null} />}
            {tab === 'grupos'  && <TabGrupos  torneo={torneo} accentColor={accentColor} imagenFondo={torneo.imagenFondoGrupos ?? null} imagenHeader={torneo.imagenHeaderGrupos ?? null} colorTexto={torneo.colorTextoCardGrupos ?? null} bannerLeft={bannerLeft} bannerRight={bannerRight} cardStyle={torneo.estiloCardGrupos ?? 'oscura'} colorCard={torneo.colorCardGrupos ?? null} />}
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
