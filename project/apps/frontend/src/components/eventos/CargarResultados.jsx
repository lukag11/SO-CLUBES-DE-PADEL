import { useState, useEffect, useRef } from 'react'
import { X, Trophy, Loader2, Check, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../ui/ToastProvider'
import {
  generarFixtureAmericano, generarFixtureSuper8,
  validarPartidoAmericano, validarSetPadel,
  rankingAmericano, rankingSuper8,
} from '../../lib/eventos'

// Overlay "Modo en vivo": el organizador/admin carga los resultados ronda por ronda y se ve
// el ranking en vivo. Reusa el motor de lib/eventos.js. Guarda el fixture en el backend a
// cada cambio (debounced) para que la vista pública (TV) lo refleje.
export default function CargarResultados({ convId, token, onClose }) {
  const toast = useToast()
  const [conv, setConv] = useState(null)
  const [fixture, setFixture] = useState(null) // fixture de trabajo (con rondas + resultados)
  const [step, setStep] = useState('cargando') // 'cargando' | 'pares' | 'jugar' | 'error'
  const [pool, setPool] = useState([]) // jugadores sin pareja (super8)
  const [pairs, setPairs] = useState([]) // parejas armadas: [[n1,n2], ...]
  const [pick, setPick] = useState(null) // jugador seleccionado esperando compañero
  const [guardando, setGuardando] = useState(false)
  const saveTimer = useRef(null)

  const esSuper8 = conv?.modalidad === 'super8'

  useEffect(() => {
    api.get(`/convocatorias/${convId}`, { Authorization: `Bearer ${token}` })
      .then((c) => {
        setConv(c)
        const f = c.fixture
        if (f?.rondas?.length) { setFixture(f); setStep('jugar'); return }
        const anotados = (c.cupos || []).filter((x) => x.estado === 'voy')
        const nombres = anotados.map((x) => (x.jugador ? `${x.jugador.nombre} ${x.jugador.apellido}` : (x.nombre || 'Jugador')))
        if (c.modalidad === 'super8') {
          // Pre-seed con las parejas sugeridas (drive/revés). Se reacomodan por CLICK.
          if (f?.parejas?.length) { setPairs(f.parejas.map((p) => [p.j1, p.j2])); setPool([]) }
          else { setPairs([]); setPool(nombres) }
          setStep('pares')
        } else {
          if (nombres.length < 4) { setStep('error'); return }
          setFixture(generarFixtureAmericano(nombres, c.canchas || 2))
          setStep('jugar')
        }
      })
      .catch(() => setStep('error'))
  }, [convId, token])

  const guardar = (f) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setGuardando(true)
      api.patch(`/convocatorias/${convId}/fixture`, { fixture: f }, { Authorization: `Bearer ${token}` })
        .catch(() => {})
        .finally(() => setGuardando(false))
    }, 600)
  }

  // Carga un valor de resultado en un partido concreto.
  const setResultado = (ri, pi, lado, valorRaw) => {
    const valor = valorRaw === '' ? null : Math.max(0, parseInt(valorRaw, 10) || 0)
    setFixture((prev) => {
      const f = structuredClone(prev)
      const part = f.rondas[ri].partidos[pi]
      const r = part.resultado || { a: null, b: null }
      r[lado] = valor
      part.resultado = (r.a == null && r.b == null) ? null : r
      guardar(f)
      return f
    })
  }

  // Armado por click: tocás un jugador del pool → queda elegido; tocás otro → forman pareja.
  const tapPool = (nombre) => {
    if (pick === nombre) { setPick(null); return }
    if (!pick) { setPick(nombre); return }
    setPairs((ps) => [...ps, [pick, nombre]])
    setPool((p) => p.filter((x) => x !== nombre && x !== pick))
    setPick(null)
  }
  // Tocás una pareja armada → se rompe (los dos vuelven al pool).
  const romperPareja = (i) => {
    setPairs((ps) => {
      const par = ps[i]
      setPool((p) => [...p, par[0], par[1]])
      return ps.filter((_, j) => j !== i)
    })
    setPick(null)
  }

  const empezarSuper8 = () => {
    if (pool.length > 0 || pairs.length < 2) return
    const f = generarFixtureSuper8(pairs.map(([j1, j2]) => ({ j1, j2 })), conv.canchas || 2)
    setFixture(f); setStep('jugar'); guardar(f)
  }

  // Congela el evento como 'jugada' (queda en el historial social de cada jugador).
  const [finalizando, setFinalizando] = useState(false)
  const [confirmFin, setConfirmFin] = useState(false)
  const finalizar = () => {
    if (finalizando || !fixture) return
    setFinalizando(true)
    clearTimeout(saveTimer.current)
    api.patch(`/convocatorias/${convId}/fixture`, { fixture, finalizar: true }, { Authorization: `Bearer ${token}` })
      .then(() => onClose())
      .catch(() => toast.error('No se pudo finalizar'))
      .finally(() => setFinalizando(false))
  }

  const ranking = !fixture ? [] : (esSuper8 ? rankingSuper8(fixture) : rankingAmericano(fixture))
  const nombreEquipoAme = (idxs) => idxs.map((i) => fixture.jugadores[i]).join(' / ')
  const nombreParejaS8 = (i) => { const p = fixture.parejas[i]; return p ? `${p.j1} / ${p.j2}` : '' }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ backgroundColor: '#0a0f0d', color: '#f4f5ef' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(244,245,239,0.08)' }}>
        <div className="flex items-center gap-2">
          <Trophy size={18} style={{ color: '#afca0b' }} />
          <span className="font-bold text-sm">Modo en vivo {conv ? `· ${esSuper8 ? 'Super 8' : 'Americano'}` : ''}</span>
          {guardando && <span className="text-[11px] text-white/30 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> guardando</span>}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 'cargando' && <Centro><Loader2 className="animate-spin" /></Centro>}
        {step === 'error' && <Centro><p className="text-white/40 text-sm text-center px-6">No se pudo abrir el evento (¿hay al menos 4 anotados?).</p></Centro>}

        {/* Paso parejas (Super 8) — armado 100% por CLICK, sin escribir */}
        {step === 'pares' && (
          <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
            <p className="text-sm text-white/60">Armá las parejas como se juegan en la cancha. Tocá dos jugadores para emparejarlos; tocá una pareja para deshacerla.</p>

            {/* Sin pareja */}
            {pool.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-white/40">Sin pareja {pick ? '· elegí el compañero' : '· tocá uno'}</p>
                <div className="flex flex-wrap gap-2">
                  {pool.map((n) => (
                    <button key={n} onClick={() => tapPool(n)}
                      className="px-3 py-2 rounded-xl text-sm font-semibold border transition-all"
                      style={pick === n
                        ? { background: 'linear-gradient(135deg,#afca0b,#d4ff3f)', color: '#0a0f0d', borderColor: 'transparent' }
                        : { backgroundColor: '#141c18', color: '#f4f5ef', borderColor: 'rgba(244,245,239,0.12)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Parejas armadas */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#afca0b' }}>Parejas · {pairs.length}</p>
              {pairs.length === 0 ? (
                <p className="text-white/30 text-xs">Todavía no armaste ninguna.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pairs.map((par, i) => (
                    <button key={i} onClick={() => romperPareja(i)}
                      className="flex items-center gap-2 rounded-xl p-2.5 text-left transition-all hover:opacity-80"
                      style={{ backgroundColor: '#141c18', border: '1px solid rgba(175,202,11,0.25)' }}>
                      <span className="w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold shrink-0" style={{ backgroundColor: 'rgba(175,202,11,0.15)', color: '#afca0b' }}>{i + 1}</span>
                      <span className="flex-1 text-sm truncate">{par[0]} <span className="text-white/30">/</span> {par[1]}</span>
                      <X size={14} className="text-white/25 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={empezarSuper8} disabled={pool.length > 0 || pairs.length < 2}
              className="mt-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#afca0b,#d4ff3f)', color: '#0a0f0d' }}>
              {pool.length > 0 ? `Faltan emparejar ${pool.length}` : <>Empezar a jugar <ChevronRight size={16} /></>}
            </button>
          </div>
        )}

        {/* Paso jugar (carga + ranking) */}
        {step === 'jugar' && fixture && (
          <div className="max-w-3xl mx-auto px-4 py-5 grid md:grid-cols-[1fr_260px] gap-5">
            {/* Partidos por ronda */}
            <div className="flex flex-col gap-4 order-2 md:order-1">
              {fixture.rondas.map((ronda, ri) => (
                <div key={ri}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#afca0b' }}>
                    Ronda {ronda.numero}
                    {ronda.descansan?.length > 0 && <span className="text-white/30 font-normal normal-case"> · descansa: {ronda.descansan.map((i) => fixture.jugadores[i]).join(', ')}</span>}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {ronda.partidos.map((p, pi) => {
                      const a = p.resultado?.a, b = p.resultado?.b
                      const val = esSuper8 ? validarSetPadel(a ?? null, b ?? null) : validarPartidoAmericano(a ?? null, b ?? null, fixture.puntosLimite)
                      const nA = esSuper8 ? nombreParejaS8(p.parejaA) : nombreEquipoAme(p.equipoA)
                      const nB = esSuper8 ? nombreParejaS8(p.parejaB) : nombreEquipoAme(p.equipoB)
                      return (
                        <div key={pi} className="rounded-xl p-2.5" style={{ backgroundColor: '#141c18', border: `1px solid ${val.completo && !val.valido ? 'rgba(255,180,171,0.4)' : 'rgba(244,245,239,0.08)'}` }}>
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="flex-1 text-right truncate">{nA}</span>
                            <input inputMode="numeric" value={a ?? ''} onChange={(e) => setResultado(ri, pi, 'a', e.target.value)}
                              className="w-10 text-center rounded-lg py-1.5 font-bold tabular-nums outline-none" style={{ backgroundColor: 'rgba(244,245,239,0.06)' }} />
                            <span className="text-white/30 text-xs">-</span>
                            <input inputMode="numeric" value={b ?? ''} onChange={(e) => setResultado(ri, pi, 'b', e.target.value)}
                              className="w-10 text-center rounded-lg py-1.5 font-bold tabular-nums outline-none" style={{ backgroundColor: 'rgba(244,245,239,0.06)' }} />
                            <span className="flex-1 truncate">{nB}</span>
                          </div>
                          {val.completo && !val.valido && <p className="text-[10px] mt-1 text-center" style={{ color: '#ffb4ab' }}>{val.motivo}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Ranking en vivo */}
            <div className="order-1 md:order-2">
              <div className="rounded-2xl p-3.5 md:sticky md:top-4" style={{ backgroundColor: '#141c18', border: '1px solid rgba(244,245,239,0.08)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#afca0b' }}><Trophy size={13} /> Ranking en vivo</p>
                <div className="flex flex-col gap-1">
                  {ranking.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px] py-1">
                      <span className="w-5 text-center font-bold tabular-nums" style={{ color: i === 0 ? '#d4ff3f' : 'rgba(244,245,239,0.5)' }}>{i + 1}</span>
                      <span className="flex-1 truncate" style={{ color: i === 0 ? '#f4f5ef' : 'rgba(244,245,239,0.8)' }}>{r.nombre}</span>
                      <span className="font-bold tabular-nums" style={{ color: '#afca0b' }}>{esSuper8 ? `${r.pg}` : r.puntos}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25 mt-2">{esSuper8 ? 'Orden: partidos ganados, luego dif. de games.' : 'Suma de puntos del jugador.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(244,245,239,0.08)' }}>
        {confirmFin ? (
          <div className="max-w-md mx-auto flex items-center gap-2">
            <span className="flex-1 text-[13px] text-white/60">¿Finalizar? Se guarda el resultado y ya no se edita.</span>
            <button onClick={() => setConfirmFin(false)} className="text-sm text-white/50 hover:text-white px-3 py-1.5">No</button>
            <button onClick={finalizar} disabled={finalizando} className="text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#afca0b,#d4ff3f)', color: '#0a0f0d' }}>
              {finalizando ? 'Finalizando…' : 'Sí, finalizar'}
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button onClick={onClose} className="text-sm font-semibold text-white/60 hover:text-white px-4 py-2 flex items-center gap-1.5"><Check size={15} /> Guardar y salir</button>
            {step === 'jugar' && (
              <button onClick={() => setConfirmFin(true)} className="text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5" style={{ color: '#afca0b' }}>
                <Trophy size={14} /> Finalizar evento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Centro({ children }) {
  return <div className="h-full flex items-center justify-center text-white/40">{children}</div>
}
