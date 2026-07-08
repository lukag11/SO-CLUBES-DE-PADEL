import { useState, useEffect, useCallback } from 'react'
import { Compass, TrendingUp, Target, AlertTriangle, Info, Loader2, ArrowRight, Pencil, PartyPopper, Sparkles, UserX, Repeat } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'
import { useToast } from '../components/ui/ToastProvider'
import { trackEvento } from '../lib/telemetria'
import CostosPanel from '../features/direccion/CostosPanel'

const money = (n) => `$${Math.round(n ?? 0).toLocaleString('es-AR')}`

// Conceptos "canónicos" del onboarding simple: 1 costo fijo general + 1 costo variable/turno.
// (El desglose fino por rubro/sector es una mejora futura; el ABM ya existe en /api/costos.)
const CONCEPTO_FIJO = 'Costos fijos del mes'
const CONCEPTO_VAR = 'Costo por turno'

// Tarjeta de métrica: número grande protagonista + explicación didáctica siempre visible + ⓘ ampliada.
const MetricCard = ({ titulo, tecnico, valor, sub, explico, icon: Icon, tono = 'lime', ayuda }) => {
  const [open, setOpen] = useState(false)
  const tonos = {
    lime:  { chip: 'text-lime-700 bg-lime-100', ring: 'border-lime-200', num: 'text-lime-700' },
    red:   { chip: 'text-rose-700 bg-rose-100', ring: 'border-rose-200', num: 'text-rose-600' },
    slate: { chip: 'text-slate-700 bg-slate-200', ring: 'border-slate-200', num: 'text-slate-800' },
  }
  const t = tonos[tono]
  return (
    <div className={`relative bg-white rounded-2xl border ${t.ring} p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.chip}`}>
          <Icon size={24} />
        </div>
        <button onClick={() => setOpen((v) => !v)} className="text-slate-300 hover:text-slate-500 p-1" title="¿Qué es esto?">
          <Info size={18} />
        </button>
      </div>
      <p className="text-base text-slate-500 font-medium flex items-center gap-2 flex-wrap">
        {titulo}
        {tecnico && <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5">{tecnico}</span>}
      </p>
      <p className={`text-4xl font-bold mt-1 ${t.num}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{valor}</p>
      {sub && <p className="text-sm text-slate-500 mt-1.5">{sub}</p>}
      {explico && <p className="text-sm text-slate-400 mt-3 leading-relaxed">{explico}</p>}
      {open && ayuda && (
        <div className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed">{ayuda}</div>
      )}
    </div>
  )
}

// Termómetro: dónde estás (turnos vendidos) respecto al punto de equilibrio y al total disponible.
const Termometro = ({ vendidos, breakEven, disponibles }) => {
  if (!breakEven || !disponibles) return null
  const escala = Math.max(disponibles, breakEven, vendidos, 1)
  const pctVend = Math.min(100, (vendidos / escala) * 100)
  const pctBE = Math.min(100, (breakEven / escala) * 100)
  const llegaste = vendidos >= breakEven
  return (
    <div className="mt-5">
      <div className="relative h-6 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${llegaste ? 'bg-lime-500' : 'bg-amber-400'}`}
          style={{ width: `${pctVend}%` }}
        />
        {/* marca del punto de equilibrio */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-700" style={{ left: `${pctBE}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span><b className="text-slate-800">{vendidos}</b> vendidos</span>
        <span style={{ marginLeft: 'auto' }} className="flex items-center gap-1">
          <span className="inline-block w-0.5 h-3 bg-slate-700 align-middle" /> equilibrio: <b className="text-slate-800">{breakEven}</b>
        </span>
      </div>
    </div>
  )
}

// Mapa de calor día × franja. Cada celda pintada por zona: pico (verde), medio (ámbar),
// frío (celeste), o gris si el club no abre esa franja ese día.
const DIA_CORTO = { Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue', Viernes: 'Vie', Sábado: 'Sáb', Domingo: 'Dom' }
// Rayado diagonal para "cerrado" (no accionable) → se distingue del frío sin robar atención.
const RAYADO_CERRADO = 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 2px, #f8fafc 2px, #f8fafc 5px)'
const estiloZona = (c) => {
  if (!c) return { background: RAYADO_CERRADO }          // no abre
  if (c.zona === 'pico') return { backgroundColor: '#84cc16' }   // lime-500
  if (c.zona === 'medio') return { backgroundColor: '#fbbf24' }  // amber-400
  return { backgroundColor: '#bae6fd' }                   // sky-200 (frío)
}

const Heatmap = ({ data }) => {
  if (!data || !data.dias?.length || !data.franjas?.length) {
    return <p className="text-sm text-slate-400">Todavía no hay suficientes reservas para armar el mapa de calor.</p>
  }
  const { dias, franjas, celdas } = data
  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Header de franjas (etiqueta cada 2 para no saturar) */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {franjas.map((f, i) => (
              <div key={f} className="w-7 shrink-0 text-[9px] text-slate-400 text-center tabular-nums">{i % 2 === 0 ? f.slice(0, 5) : ''}</div>
            ))}
          </div>
          {/* Filas por día */}
          {dias.map((dia) => (
            <div key={dia} className="flex items-center">
              <div className="w-10 shrink-0 text-xs font-semibold text-slate-500 pr-1">{DIA_CORTO[dia]}</div>
              {franjas.map((f) => {
                const c = celdas[dia]?.[f]
                return (
                  <div
                    key={f}
                    className="w-7 h-7 shrink-0 p-[2px]"
                    title={c ? `${dia} ${f} — ${c.pct}% (${c.vendidos}/${c.disponibles})` : `${dia} ${f} — cerrado`}
                  >
                    <div className="w-full h-full rounded" style={estiloZona(c)} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#84cc16' }} /> Pico (&gt;80%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#fbbf24' }} /> Medio (40-80%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#bae6fd' }} /> Frío (&lt;40%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: RAYADO_CERRADO }} /> Cerrado</span>
      </div>
    </div>
  )
}

// Simulador "¿y si...?": sobre el break-even real, deja mover tarifa y ocupación para ver
// el impacto en el resultado mensual, y calcula cuántos turnos hacen falta para pagar un gasto.
// 100% en el cliente, con los insumos que ya vienen de /finanzas/salud.
const Simulador = ({ s }) => {
  const [tarifaPct, setTarifaPct] = useState(0)
  const [ocupPct, setOcupPct] = useState(0)
  const [gasto, setGasto] = useState('')

  const contribTurno = s.contribPorTurno || 0
  const resultadoActual = s.turnosVendidos * contribTurno - s.fijoMensual

  const nuevaTarifa = Math.round((s.precioRef || 0) * (1 + tarifaPct / 100))
  const nuevaContribTurno = nuevaTarifa - (s.variablePorTurno || 0)
  const nuevosTurnos = Math.min(s.turnosDisponibles || 0, Math.round(s.turnosVendidos * (1 + ocupPct / 100)))
  const resultadoSim = nuevosTurnos * nuevaContribTurno - s.fijoMensual
  const delta = resultadoSim - resultadoActual

  const gastoNum = Math.round(Number(gasto) || 0)
  const turnosParaPagar = contribTurno > 0 && gastoNum > 0 ? Math.ceil(gastoNum / contribTurno) : null

  const Slider = ({ label, value, set }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${value > 0 ? 'text-lime-700' : value < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{value > 0 ? '+' : ''}{value}%</span>
      </div>
      <input type="range" min="-20" max="30" value={value} onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-lime-500" />
    </div>
  )

  return (
    <div className="mt-5 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-sm text-white">
      <div className="flex items-center gap-2 text-lime-400 text-sm font-semibold mb-1">
        <Sparkles size={16} /> SIMULADOR
      </div>
      <h3 className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>¿Y si...? Probá antes de decidir</h3>
      <p className="text-sm text-slate-300 mt-0.5 mb-5">Mové las perillas y mirá cómo cambia tu resultado del mes. Nada de esto toca tus datos reales.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Perillas */}
        <div className="space-y-5">
          <Slider label="Cambio de tarifa" value={tarifaPct} set={setTarifaPct} />
          <Slider label="Cambio de ocupación" value={ocupPct} set={setOcupPct} />
          <p className="text-xs text-slate-400">Precio por turno: {money(nuevaTarifa)} · turnos vendidos: {nuevosTurnos} de {s.turnosDisponibles}</p>
        </div>

        {/* Resultado */}
        <div className="bg-white/10 rounded-xl p-5 flex flex-col justify-center">
          <p className="text-sm text-slate-300">Tu resultado del mes pasaría de</p>
          <p className="text-lg text-slate-400 line-through">{money(resultadoActual)}</p>
          <p className={`text-3xl font-bold ${resultadoSim >= 0 ? 'text-lime-400' : 'text-rose-300'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {money(resultadoSim)}
          </p>
          <p className={`text-sm font-semibold mt-1 ${delta >= 0 ? 'text-lime-400' : 'text-rose-300'}`}>
            {delta >= 0 ? '▲ Ganás ' : '▼ Perdés '}{money(Math.abs(delta))} más {delta >= 0 ? '' : 'menos'} por mes
          </p>
        </div>
      </div>

      {/* Mini: cuántos turnos para pagar un gasto */}
      <div className="mt-6 pt-5 border-t border-white/10">
        <p className="text-sm font-medium text-slate-200 mb-2">¿Pensás sumar un gasto? (un empleado, una inversión…)</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input type="number" inputMode="numeric" value={gasto} onChange={(e) => setGasto(e.target.value)}
              placeholder="200.000"
              className="pl-7 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:border-lime-400 outline-none text-white placeholder:text-slate-400 w-40" />
          </div>
          {turnosParaPagar != null
            ? <p className="text-sm text-slate-200">Necesitás llenar <b className="text-lime-400 text-lg">{turnosParaPagar}</b> turnos más al mes para pagarlo.</p>
            : <p className="text-sm text-slate-400">Escribí un monto para ver cuántos turnos lo cubren.</p>}
        </div>
      </div>
    </div>
  )
}

export default function DireccionPage() {
  const token = useAuthStore((s) => s.token)
  const auth = { Authorization: `Bearer ${token}` }
  const toast = useToast()

  const [salud, setSalud] = useState(null)
  const [costos, setCostos] = useState([])
  const [heatmap, setHeatmap] = useState(null)
  const [sectores, setSectores] = useState(null)
  const [flujo, setFlujo] = useState(null)
  const [retencion, setRetencion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [panelCostos, setPanelCostos] = useState(false)

  const [fijoInput, setFijoInput] = useState('')
  const [varInput, setVarInput] = useState('')
  const [precioInput, setPrecioInput] = useState('') // rescate: solo si el club aún no tiene precio de referencia

  const cargar = useCallback(async () => {
    try {
      const [s, cs, hm, sec, fl, rt] = await Promise.all([
        api.get('/finanzas/salud', auth),
        api.get('/costos', auth),
        api.get('/finanzas/heatmap', auth).catch(() => null),
        api.get('/finanzas/sectores', auth).catch(() => null),
        api.get('/finanzas/flujo', auth).catch(() => null),
        api.get('/finanzas/turnos-fijos', auth).catch(() => null),
      ])
      setSalud(s)
      setCostos(Array.isArray(cs) ? cs : [])
      setHeatmap(hm)
      setSectores(sec)
      setFlujo(fl)
      setRetencion(rt)
    } catch {
      toast?.error?.('No se pudo cargar la salud financiera')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { trackEvento('pantalla', '/dashboardAdmin/direccion') }, [])

  const costoFijo = costos.find((c) => c.tipo === 'fijo' && c.concepto === CONCEPTO_FIJO)
  const costoVar = costos.find((c) => c.tipo === 'variable' && c.concepto === CONCEPTO_VAR)
  const tieneCostos = (salud && !salud.falta.costosFijos)

  const abrirEditor = () => {
    setFijoInput(costoFijo ? String(costoFijo.monto) : '')
    const sugerido = costoVar ? costoVar.monto : (salud?.precioRef ? Math.round(salud.precioRef * 0.1) : '')
    setVarInput(sugerido ? String(sugerido) : '')
    setEditando(true)
  }

  // Preview EN VIVO del break-even mientras el dueño tipea (el "ajá" instantáneo).
  const previewBreakEven = () => {
    const fijo = Number(fijoInput)
    const varr = Number(varInput) || 0
    // Precio de referencia: el real del club, o el que el dueño tipea en la pregunta de rescate.
    const precio = salud?.precioRef || Number(precioInput) || 0
    const contrib = precio - varr
    if (!fijo || fijo <= 0 || contrib <= 0 || !salud?.turnosDisponibles) return null
    const beTurnos = Math.ceil(fijo / contrib)
    const bePct = Math.round((beTurnos / salud.turnosDisponibles) * 100)
    const costoVacio = Math.round(fijo / salud.turnosDisponibles)
    return { beTurnos, bePct, costoVacio }
  }

  const guardar = async () => {
    const fijo = Math.round(Number(fijoInput))
    const varr = Math.round(Number(varInput) || 0)
    if (!fijo || fijo <= 0) { toast?.error?.('Ingresá cuánto te sale tener el club abierto por mes'); return }
    setGuardando(true)
    try {
      const bodyFijo = { concepto: CONCEPTO_FIJO, categoria: 'otros', tipo: 'fijo', monto: fijo, periodicidad: 'mensual' }
      if (costoFijo) await api.patch(`/costos/${costoFijo.id}`, bodyFijo, auth)
      else await api.post('/costos', bodyFijo, auth)
      if (varr > 0) {
        const bodyVar = { concepto: CONCEPTO_VAR, categoria: 'energia', tipo: 'variable', monto: varr, periodicidad: 'mensual' }
        if (costoVar) await api.patch(`/costos/${costoVar.id}`, bodyVar, auth)
        else await api.post('/costos', bodyVar, auth)
      }
      trackEvento('click', 'direccion.costos_guardados', { tenia: !!costoFijo })
      toast?.success?.('Listo, tus números ya están cargados')
      setEditando(false)
      setLoading(true)
      await cargar()
    } catch {
      toast?.error?.('No se pudieron guardar los costos')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <Loader2 className="animate-spin" size={22} /> Cargando la salud del club…
      </div>
    )
  }

  const s = salud
  const preview = previewBreakEven()

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 text-lime-400 flex items-center justify-center shadow-sm">
          <Compass size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dirección del club</h1>
          <p className="text-base text-slate-500">Cómo va tu negocio, en los números que deciden · últimos {s?.periodo?.dias ?? 30} días</p>
        </div>
      </div>

      {/* ONBOARDING (sin costos) o EDITOR */}
      {(!tieneCostos || editando) && (
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-8 py-6">
            <div className="flex items-center gap-2 text-lime-400 text-sm font-semibold mb-1">
              <Sparkles size={16} /> {tieneCostos ? 'AJUSTÁ TUS NÚMEROS' : 'ARRANQUEMOS EN 1 MINUTO'}
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {tieneCostos ? 'Cambiá lo que necesites' : 'Con dos datos ya sabés si ganás o perdés'}
            </h2>
            <p className="text-base text-slate-300 mt-1">Te vamos a mostrar tu punto de equilibrio mientras escribís. Sin planillas, sin contadores.</p>
          </div>
          <div className="p-8 space-y-7">
            {/* Pregunta 1 */}
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-1">
                <span className="w-7 h-7 rounded-full bg-lime-100 text-lime-700 text-sm font-bold flex items-center justify-center">1</span>
                ¿Cuánto te sale tener el club abierto por mes?
              </label>
              <p className="text-sm text-slate-500 mb-3 ml-9">Alquiler + sueldos + luz base + todo lo fijo. Sin la mercadería del bar. Un número aproximado está perfecto.</p>
              <div className="relative ml-9">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">$</span>
                <input
                  type="number" inputMode="numeric" value={fijoInput}
                  onChange={(e) => setFijoInput(e.target.value)}
                  placeholder="3.000.000"
                  className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-lime-500 focus:ring-2 focus:ring-lime-200 outline-none text-2xl font-bold text-slate-800 transition-colors"
                />
              </div>
            </div>
            {/* Pregunta 2 */}
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-1">
                <span className="w-7 h-7 rounded-full bg-lime-100 text-lime-700 text-sm font-bold flex items-center justify-center">2</span>
                ¿Cuánto te cuesta cada turno jugado? <span className="font-normal text-slate-400 text-sm">opcional</span>
              </label>
              <p className="text-sm text-slate-500 mb-3 ml-9">Solo lo que gastás cuando alguien juega: luz de la cancha, limpieza del turno. Si no sabés, dejá el sugerido.</p>
              <div className="relative ml-9">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">$</span>
                <input
                  type="number" inputMode="numeric" value={varInput}
                  onChange={(e) => setVarInput(e.target.value)}
                  placeholder={salud?.precioRef ? String(Math.round(salud.precioRef * 0.1)) : '2.250'}
                  className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-lime-500 focus:ring-2 focus:ring-lime-200 outline-none text-2xl font-bold text-slate-800 transition-colors"
                />
              </div>
            </div>

            {/* Pregunta de RESCATE — solo si el club todavía no tiene precio de referencia
                (sin cancha con precio ni turnos cobrados). Sin esto el break-even no se puede
                calcular y el "ajá" nunca aparecería. */}
            {s?.falta?.precio && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 ml-9">
                <label className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-1">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center">3</span>
                  ¿A cuánto cobrás el turno?
                </label>
                <p className="text-sm text-slate-500 mb-3 ml-9">Todavía no tenemos el precio de tus canchas ni turnos cobrados. Decinos el precio del turno para calcular tu equilibrio. (Cuando cargues el precio en tus canchas, se toma solo.)</p>
                <div className="relative ml-9">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">$</span>
                  <input
                    type="number" inputMode="numeric" value={precioInput}
                    onChange={(e) => setPrecioInput(e.target.value)}
                    placeholder="24.000"
                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-2xl font-bold text-slate-800 transition-colors bg-white"
                  />
                </div>
              </div>
            )}

            {/* PREVIEW EN VIVO — el "ajá" */}
            {preview ? (
              <div className="bg-gradient-to-br from-lime-50 to-white border-2 border-lime-200 rounded-2xl p-6 ml-9">
                <div className="flex items-center gap-2 text-lime-700 font-semibold text-sm mb-3">
                  <Target size={18} /> TU PUNTO DE EQUILIBRIO
                </div>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Necesitás llenar{' '}
                  <b className="text-3xl text-lime-700 mx-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{preview.beTurnos}</b>
                  {' '}turnos al mes <span className="text-slate-500">({preview.bePct}% de ocupación)</span> para no perder.
                </p>
                <p className="text-base text-slate-500 mt-2">Cada turno que quede vacío te cuesta <b className="text-rose-600">{money(preview.costoVacio)}</b>.</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 ml-9 text-base text-slate-400 flex items-center gap-2">
                <ArrowRight size={18} /> Escribí el primer número y vas a ver, al instante, tu punto de equilibrio acá.
              </div>
            )}

            <div className="flex items-center gap-4 ml-9">
              <button
                onClick={guardar} disabled={guardando}
                className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-slate-900 font-bold text-lg px-7 py-3.5 rounded-2xl transition-colors shadow-sm"
              >
                {guardando ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                {tieneCostos ? 'Guardar cambios' : 'Ver mi tablero'}
              </button>
              {tieneCostos && (
                <button onClick={() => setEditando(false)} className="text-slate-500 hover:text-slate-700 text-base font-medium">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TABLERO (con costos y no editando) */}
      {tieneCostos && !editando && (
        <>
          {/* HÉROE: break-even + termómetro */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold uppercase tracking-wide">
                  <Target size={16} /> Punto de equilibrio
                </div>
                <p className="mt-1">
                  <span className="text-5xl font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.breakEvenTurnos ?? '—'}
                  </span>
                  <span className="text-xl text-slate-500 ml-2">turnos / mes</span>
                </p>
                <p className="text-base text-slate-500 mt-1">
                  {s.breakEvenPct != null ? `Con ${s.breakEvenPct}% de ocupación cubrís todos tus costos fijos.` : 'Cargá tus costos para verlo.'}
                </p>
              </div>
              {s.porEncimaDelEquilibrio != null && (
                <div className={`rounded-2xl px-5 py-4 text-center ${s.porEncimaDelEquilibrio >= 0 ? 'bg-lime-50 text-lime-700' : 'bg-amber-50 text-amber-700'}`}>
                  <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                    {s.porEncimaDelEquilibrio >= 0 ? <><PartyPopper size={16} /> ¡Vas ganando!</> : <><AlertTriangle size={16} /> Falta un poco</>}
                  </div>
                  <p className="text-2xl font-bold mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.porEncimaDelEquilibrio >= 0 ? '+' : ''}{s.porEncimaDelEquilibrio} turnos
                  </p>
                  <p className="text-xs opacity-80">vs el equilibrio</p>
                </div>
              )}
            </div>
            <Termometro vendidos={s.turnosVendidos} breakEven={s.breakEvenTurnos} disponibles={s.turnosDisponibles} />
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              {s.porEncimaDelEquilibrio == null
                ? <>Cargá tus costos fijos y el precio del turno para ver cuántos turnos necesitás para no perder.</>
                : s.porEncimaDelEquilibrio >= 0
                  ? <>Ya cubriste tus costos: de acá en más, casi cada turno que vendas es <b className="text-lime-700">ganancia</b>. 🎾</>
                  : <>Te faltan <b className="text-amber-700">{Math.abs(s.porEncimaDelEquilibrio)} turnos</b> para dejar de perder. La forma más rápida: llenar los horarios flojos.</>}
            </p>
          </div>

          {/* Tarjetas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <MetricCard
              titulo="Rinde por turno" tecnico="RevPACH" icon={TrendingUp} tono="lime"
              valor={money(s.rindePorTurno)}
              sub={`${s.ocupacionPct}% de ocupación`}
              explico="Cuánta plata te deja, en promedio, cada turno disponible (esté lleno o vacío). Es el número resumen: si sube, todo mejora."
              ayuda="Se calcula: ingreso de las canchas ÷ turnos que tuviste disponibles. Mezcla en un solo número cuánto vendés y a qué precio."
            />
            <MetricCard
              titulo="Costo del turno vacío" icon={AlertTriangle} tono="red"
              valor={money(s.costoTurnoVacio)}
              sub={`tenés ${s.turnosVacios} turnos libres este mes`}
              explico="Cada turno abierto igual paga su parte de los costos fijos, esté lleno o vacío. Llenar los horarios flojos es donde más ganás."
              ayuda="Se calcula: costos fijos del mes ÷ turnos disponibles. Es cuánto te cuesta tener la cancha abierta un turno. No todos los turnos libres se llenan (las 3am no), pero cada uno que llenes en un horario flojo es plata que hoy no hacés."
            />
          </div>

          {/* Simulador ¿y si...? */}
          {s.contribPorTurno > 0 && <Simulador s={s} />}

          {/* Ausentismo (proxy no-show) + gancho de la seña */}
          {s.ausenciasPct != null && s.ausencias > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-rose-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <UserX size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">Turnos sin cobrar <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 align-middle">ausencias</span></h3>
                  <p className="text-sm text-slate-500 mt-0.5">Turnos que se reservaron, ya pasaron y nunca se cobraron. Es una estimación de ausentismo (plata que quedó en la calle).</p>
                  <div className="flex items-baseline gap-3 mt-3">
                    <span className="text-3xl font-bold text-rose-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{money(s.ausenciasMonto)}</span>
                    <span className="text-sm text-slate-500">{s.ausencias} turnos · {s.ausenciasPct}% de los vencidos</span>
                  </div>
                  <div className="mt-4 bg-lime-50 border border-lime-200 rounded-xl p-3.5 text-sm text-slate-700 flex items-start gap-2">
                    <Sparkles size={16} className="text-lime-600 mt-0.5 shrink-0" />
                    <span>Una <b>seña online</b> al reservar recupera casi toda esta plata: el que no viene, ya pagó. <span className="text-slate-400">Próximamente, opcional para tu club.</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contribución por sector */}
          {sectores?.sectores?.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">¿Qué te da y qué te saca? <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 align-middle">por sector</span></h3>
              <p className="text-sm text-slate-500 mb-4">Lo que deja cada parte del club después de restarle sus costos y su parte de los gastos fijos. Es el margen que no miente.</p>
              <div className="space-y-3">
                {sectores.sectores.map((sec) => {
                  const positivo = sec.contribucion >= 0
                  return (
                    <div key={sec.key} className={`rounded-xl border bg-slate-50/50 ${sec.cogsFaltante ? 'border-amber-200' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-4 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{sec.nombre}</p>
                          <p className="text-xs text-slate-400">
                            Facturó {money(sec.ingreso)} · costos {money(sec.directos + sec.fijoAsignado)}
                            {sec.cogs > 0 && ` (mercadería ${money(sec.cogs)})`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${positivo ? 'text-lime-700' : 'text-rose-600'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {positivo ? '+' : ''}{money(sec.contribucion)}
                          </p>
                          {sec.cogsFaltante
                            ? <p className="text-xs text-amber-600 font-medium">margen sin verificar</p>
                            : sec.margenPct != null && <p className={`text-xs ${positivo ? 'text-lime-600' : 'text-rose-500'}`}>{sec.margenPct}% de margen</p>}
                        </div>
                      </div>
                      {sec.cogsFaltante && (
                        <p className="text-xs text-amber-700 bg-amber-50 border-t border-amber-100 px-3 py-2 rounded-b-xl flex items-start gap-1.5">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                          Este margen no es real: no cargaste cuánto te cuesta cada producto. Cargá el costo en los productos del bar para ver lo que de verdad te deja.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {sectores.sinCostosPorSector && (
                <p className="text-xs text-slate-400 mt-4 flex items-start gap-1.5">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  Estás repartiendo los gastos fijos según cuánto factura cada sector. Para saber exacto cuánto te deja el bar o las clases, más adelante vas a poder cargar sus costos propios (sueldo del que atiende, del profe).
                </p>
              )}
            </div>
          )}

          {/* Flujo de caja 90 días */}
          {flujo?.meses?.length > 0 && (() => {
            const maxAbs = Math.max(...flujo.meses.flatMap((m) => [m.cobros, m.pagos]), 1)
            return (
              <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">¿Llegás a fin de mes? <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 align-middle">flujo 90 días</span></h3>
                <p className="text-sm text-slate-500 mb-5">Lo que vas a cobrar (turnos fijos + reservas agendadas) contra lo que vas a pagar, los próximos 3 meses. Sirve para ver los baches antes de chocarlos.</p>
                <div className="grid grid-cols-3 gap-4">
                  {flujo.meses.map((m) => (
                    <div key={m.label} className="text-center">
                      <div className="flex items-end justify-center gap-2 h-32">
                        <div className="w-7 bg-lime-400 rounded-t" style={{ height: `${Math.max(4, (m.cobros / maxAbs) * 100)}%` }} title={`Cobrás ${money(m.cobros)}`} />
                        <div className="w-7 bg-rose-300 rounded-t" style={{ height: `${Math.max(4, (m.pagos / maxAbs) * 100)}%` }} title={`Pagás ${money(m.pagos)}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mt-2 capitalize">{m.label}</p>
                      <p className={`text-sm font-bold ${m.neto >= 0 ? 'text-lime-700' : 'text-rose-600'}`}>{m.neto >= 0 ? '+' : ''}{money(m.neto)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 justify-center">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#a3e635' }} /> Cobrás</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#fda4af' }} /> Pagás (costos fijos)</span>
                </div>
                <p className="text-xs text-slate-400 mt-4 flex items-start gap-1.5">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  Cuenta lo que ya está agendado (turnos fijos + reservas cargadas). <b className="text-slate-500 font-medium">No incluye las reservas sueltas que todavía nadie sacó</b>, así que los meses 2 y 3 se ven más flojos de lo que van a ser: esos turnos se llenan sobre la fecha.
                </p>
              </div>
            )
          })()}

          {/* Retención de turnos fijos (LTV + churn) */}
          {retencion?.totalTF > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Repeat size={18} className="text-lime-600" /> Tus turnos fijos <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 align-middle">retención</span>
              </h3>
              <p className="text-sm text-slate-500 mb-4">Tu ingreso más valioso es el que se repite. Perder un turno fijo no es perder un turno: es perder su valor de todo el año.</p>

              <div className="rounded-2xl bg-gradient-to-br from-lime-50 to-white border border-lime-200 p-5">
                <p className="text-sm text-slate-500">Tus {retencion.totalTF} turnos fijos valen, si se sostienen un año</p>
                <p className="text-4xl font-bold text-lime-700 mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{money(retencion.valorRecurrenteAnual)}<span className="text-xl text-slate-400 font-semibold"> /año</span></p>
                <p className="text-sm text-slate-500 mt-1">≈ {money(retencion.valorRecurrenteMensual)} por mes de ingreso recurrente.</p>
              </div>

              {retencion.enRiesgo.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={15} /> {retencion.enRiesgo.length} en riesgo de baja — faltaron {retencion.umbral}+ veces en las últimas {retencion.periodo.semanas} semanas
                  </p>
                  <div className="space-y-2">
                    {retencion.enRiesgo.map((tf) => (
                      <div key={tf.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                        <UserX size={18} className="text-amber-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{tf.jugador}</p>
                          <p className="text-xs text-slate-500 capitalize">{tf.dia} {tf.horaInicio} · faltó {tf.ausenciasRecientes} veces</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-700">{money(tf.valorAnual)}<span className="text-xs text-slate-400">/año</span></p>
                          <p className="text-[11px] text-amber-600">en juego</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">Un llamado a tiempo retiene lo que ya tenés. Conseguir un fijo nuevo cuesta mucho más que cuidar este.</p>
                </div>
              ) : (
                <p className="text-sm text-lime-700 mt-4 flex items-center gap-1.5">
                  <span className="text-base">💪</span> Ninguno viene faltando seguido: tus turnos fijos están firmes.
                </p>
              )}
            </div>
          )}

          {/* Mapa de calor */}
          <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">Mapa de calor</h3>
            <p className="text-sm text-slate-500 mb-4">¿Cuándo se llena tu cancha? Verde = lleno · celeste = vacío. El celeste es la plata que estás dejando en la mesa.</p>
            <Heatmap data={heatmap} />
          </div>

          {/* Yield — rendimiento de tarifa (las dos fugas) */}
          {s.yieldPct != null && (
            <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Rendimiento de tu tarifa <span className="text-[10px] uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 align-middle">yield</span></h3>
              <p className="text-sm text-slate-500 mb-4">De todo lo que <b>podrías</b> facturar si vendieras cada turno al precio de lista, cuánto hacés de verdad — y por dónde se te escapa el resto.</p>
              {/* Barra de 3 segmentos */}
              <div className="flex h-9 rounded-lg overflow-hidden">
                {s.yieldPct > 0 && <div style={{ width: `${s.yieldPct}%`, backgroundColor: '#84cc16' }} title={`Hacés: ${s.yieldPct}%`} />}
                {s.fugaVacioPct > 0 && <div style={{ width: `${s.fugaVacioPct}%`, backgroundColor: '#7dd3fc' }} title={`Perdés por vacío: ${s.fugaVacioPct}%`} />}
                {s.fugaDescuentoPct > 0 && <div style={{ width: `${s.fugaDescuentoPct}%`, backgroundColor: '#fbbf24' }} title={`Perdés por descuento: ${s.fugaDescuentoPct}%`} />}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#84cc16' }} /> Hacés <b className="text-slate-800">{s.yieldPct}%</b></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#7dd3fc' }} /> Perdés por vacío <b className="text-slate-800">{s.fugaVacioPct}%</b></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: '#fbbf24' }} /> Perdés por descuento <b className="text-slate-800">{s.fugaDescuentoPct}%</b></span>
              </div>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                De cada <b>$100</b> que podrías facturar a precio de lista, hacés <b className="text-lime-700">${s.yieldPct}</b>.
                {' '}{s.fugaVacioPct >= s.fugaDescuentoPct
                  ? <>Tu fuga más grande es <b>las canchas vacías</b> (${s.fugaVacioPct}) → la palanca es llenar el valle, no bajar precios.</>
                  : <>Tu fuga más grande son <b>los descuentos</b> (${s.fugaDescuentoPct}) → conviene revisar la política de precios.</>}
              </p>
            </div>
          )}

          {/* Tus números */}
          <div className="mt-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Tus números</h3>
              <button onClick={() => setPanelCostos(true)} className="inline-flex items-center gap-1.5 text-base text-lime-700 hover:text-lime-800 font-semibold">
                <Pencil size={16} /> Gestionar costos
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                ['Costos fijos del mes', money(s.fijoMensual)],
                ['Costo por turno (1,5h)', money(s.variablePorTurno)],
                [`Precio ${s.precioRealizado > 0 ? 'realizado' : 'de lista'}`, money(s.precioRef)],
                ['Turnos vendidos (30d)', `${s.turnosVendidos} / ${s.turnosDisponibles}`],
                // Solo aparece si el club cargó comisiones (ej. Mercado Pago): la fuga que antes era invisible.
                ...(s.comisionesMes > 0 ? [['Comisiones (30d)', `−${money(s.comisionesMes)}`, 'text-rose-600']] : []),
              ].map(([lbl, val, color]) => (
                <div key={lbl}>
                  <p className="text-sm text-slate-400">{lbl}</p>
                  <p className={`text-xl font-bold mt-0.5 ${color || 'text-slate-800'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {panelCostos && <CostosPanel onClose={() => setPanelCostos(false)} onChange={() => { setLoading(true); cargar() }} />}
    </div>
  )
}
