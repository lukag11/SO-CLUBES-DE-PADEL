import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Wallet, Percent, FileText, Lock, Unlock, Check, AlertTriangle, ChevronDown, Plus, X, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { METODO_MAP } from '../../lib/metodosPago'
import { imprimirCierreCaja } from './comprobantes'
import useClubStore from '../../store/clubStore'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const hora = (iso) => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''
const fechaCorta = (iso) => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : ''
const hoyStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shift = (fecha, days) => {
  const [y, m, d] = fecha.split('-').map(Number)
  const nd = new Date(Date.UTC(y, m - 1, d + days))
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}-${String(nd.getUTCDate()).padStart(2, '0')}`
}
const inicioMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }

const TIPO_LABEL = { turnos: 'Turnos', bar: 'Bar / tienda', torneos: 'Torneos', otros: 'Otros' }
const TIPO_COLOR = { turnos: 'bg-brand-500', bar: 'bg-amber-500', torneos: 'bg-violet-500', otros: 'bg-slate-400' }

// ── ARQUEO DE CAJA — control del efectivo físico del turno (solo efectivo) ──────
const ArqueoCaja = ({ token }) => {
  const authH = { Authorization: `Bearer ${token}` }
  const [arqueo, setArqueo] = useState(undefined) // undefined=cargando · null=cerrada · obj=abierta
  const [historial, setHistorial] = useState([])
  const [verHistorial, setVerHistorial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Formularios
  const [abriendo, setAbriendo] = useState(false)
  const [fondo, setFondo] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [declarado, setDeclarado] = useState('')
  const [notas, setNotas] = useState('')
  const [movForm, setMovForm] = useState(false)
  const [mov, setMov] = useState({ tipo: 'egreso', monto: '', concepto: '' })

  const cargar = useCallback(async () => {
    if (!token) return
    try {
      const [a, h] = await Promise.all([
        api.get('/caja/arqueo/actual', authH),
        api.get('/caja/arqueo/historial', authH),
      ])
      setArqueo(a?.abierta ?? null)
      setHistorial(Array.isArray(h) ? h : [])
    } catch { setArqueo(null) }
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  const abrir = async () => {
    setSaving(true); setErr('')
    try {
      await api.post('/caja/arqueo/abrir', { fondoInicial: Number(fondo) || 0 }, authH)
      setAbriendo(false); setFondo(''); await cargar()
    } catch (e) { setErr(e?.message || 'No se pudo abrir la caja') } finally { setSaving(false) }
  }

  const agregarMov = async () => {
    setSaving(true); setErr('')
    try {
      await api.post(`/caja/arqueo/${arqueo.id}/movimiento`, { tipo: mov.tipo, monto: Number(mov.monto) || 0, concepto: mov.concepto }, authH)
      setMovForm(false); setMov({ tipo: 'egreso', monto: '', concepto: '' }); await cargar()
    } catch (e) { setErr(e?.message || 'No se pudo registrar') } finally { setSaving(false) }
  }

  const cerrar = async () => {
    setSaving(true); setErr('')
    try {
      await api.post(`/caja/arqueo/${arqueo.id}/cerrar`, { efectivoDeclarado: Number(declarado) || 0, notas }, authH)
      setCerrando(false); setDeclarado(''); setNotas(''); await cargar()
    } catch (e) { setErr(e?.message || 'No se pudo cerrar la caja') } finally { setSaving(false) }
  }

  const card = 'bg-white rounded-2xl border border-slate-100 shadow-sm'
  if (arqueo === undefined) return <div className={`${card} p-5 h-24 animate-pulse`} />

  const diffPreview = declarado !== '' ? (Number(declarado) || 0) - (arqueo?.efectivoEsperado ?? 0) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Estado de la caja del turno */}
      {arqueo === null ? (
        // ── Caja cerrada: abrir ──
        <div className={`${card} p-5`}>
          {!abriendo ? (
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 rounded-xl p-3 shrink-0"><Lock size={20} className="text-slate-400" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Caja cerrada</p>
                <p className="text-xs text-slate-400 mt-0.5">Abrí la caja al empezar tu turno para controlar el efectivo.</p>
              </div>
              <button onClick={() => { setAbriendo(true); setErr('') }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
                <Unlock size={15} /> Abrir caja
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-700">Abrir caja</p>
              <div>
                <label className="text-xs text-slate-500 font-medium">Fondo inicial (el cambio con el que arrancás)</label>
                <input type="number" inputMode="numeric" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="0" autoFocus
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400" />
                <p className="text-[11px] text-slate-400 mt-1">Es el vuelto de arranque, no es ganancia. Podés poner 0.</p>
              </div>
              {err && <p className="text-rose-500 text-xs">{err}</p>}
              <div className="flex gap-2">
                <button onClick={abrir} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">{saving ? 'Abriendo…' : 'Abrir'}</button>
                <button onClick={() => setAbriendo(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ── Caja abierta ──
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-3.5 bg-emerald-50/50 border-b border-emerald-100 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-semibold text-emerald-700 flex-1">
              Caja abierta{arqueo.empleadoNombre ? ` · ${arqueo.empleadoNombre}` : ''}
            </p>
            <span className="text-xs text-emerald-600/70 flex items-center gap-1"><Clock size={12} /> desde {hora(arqueo.abiertoAt)}</span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Números del turno */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><p className="text-[11px] text-slate-400 font-medium">Fondo inicial</p><p className="text-lg font-bold text-slate-700 mt-0.5">{money(arqueo.fondoInicial)}</p></div>
              <div><p className="text-[11px] text-slate-400 font-medium">Cobros efectivo</p><p className="text-lg font-bold text-emerald-600 mt-0.5">{money(arqueo.cobrosEfectivo)}</p></div>
              <div><p className="text-[11px] text-slate-400 font-medium">Egresos efectivo</p><p className="text-lg font-bold text-rose-600 mt-0.5">{arqueo.egresoNeto > 0 ? `−${money(arqueo.egresoNeto)}` : money(0)}</p></div>
              <div><p className="text-[11px] text-slate-400 font-medium">Debería haber</p><p className="text-lg font-black text-brand-600 mt-0.5">{money(arqueo.efectivoEsperado)}</p></div>
            </div>

            {/* Movimientos manuales */}
            {arqueo.movimientos?.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-slate-50 pt-2">
                {arqueo.movimientos.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${m.tipo === 'egreso' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <span className="text-slate-500 flex-1 truncate">{m.concepto}</span>
                    <span className={m.tipo === 'egreso' ? 'text-rose-500 font-medium' : 'text-emerald-600 font-medium'}>{m.tipo === 'egreso' ? '−' : '+'}{money(m.monto)}</span>
                  </div>
                ))}
              </div>
            )}

            {err && <p className="text-rose-500 text-xs">{err}</p>}

            {/* Form de movimiento */}
            {movForm && (
              <div className="flex flex-col gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex gap-1.5">
                  {['egreso', 'ingreso'].map((t) => (
                    <button key={t} onClick={() => setMov((v) => ({ ...v, tipo: t }))} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mov.tipo === t ? (t === 'egreso' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-white border border-slate-200 text-slate-500'}`}>
                      {t === 'egreso' ? 'Sacar plata' : 'Agregar plata'}
                    </button>
                  ))}
                </div>
                <input type="text" value={mov.concepto} onChange={(e) => setMov((v) => ({ ...v, concepto: e.target.value }))} placeholder="Concepto (ej: retiro dueño, compra hielo)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400" />
                <input type="number" inputMode="numeric" value={mov.monto} onChange={(e) => setMov((v) => ({ ...v, monto: e.target.value }))} placeholder="Monto"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400" />
                <div className="flex gap-2">
                  <button onClick={agregarMov} disabled={saving} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors disabled:opacity-50">Registrar</button>
                  <button onClick={() => setMovForm(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">Cancelar</button>
                </div>
              </div>
            )}

            {/* Form de cierre */}
            {cerrando ? (
              <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Debería haber en el cajón</span>
                  <span className="text-lg font-bold text-slate-700">{money(arqueo.efectivoEsperado)}</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">¿Cuánto contaste?</label>
                  <input type="number" inputMode="numeric" value={declarado} onChange={(e) => setDeclarado(e.target.value)} placeholder="Contá la plata física" autoFocus
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-base font-semibold text-slate-700 outline-none focus:border-brand-400" />
                </div>
                {diffPreview !== null && (
                  <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm font-semibold ${diffPreview === 0 ? 'bg-emerald-50 text-emerald-700' : diffPreview < 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    {diffPreview === 0 ? <><Check size={15} /> Cuadra perfecto</> : diffPreview < 0 ? <><AlertTriangle size={15} /> Falta {money(Math.abs(diffPreview))}</> : <><AlertTriangle size={15} /> Sobra {money(diffPreview)}</>}
                  </div>
                )}
                <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nota (opcional): ej. di mal un vuelto"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400" />
                <div className="flex gap-2">
                  <button onClick={cerrar} disabled={saving || declarado === ''} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">{saving ? 'Cerrando…' : 'Cerrar caja'}</button>
                  <button onClick={() => setCerrando(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-white transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setMovForm((v) => !v); setErr('') }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
                  <Plus size={14} /> Movimiento
                </button>
                <button onClick={() => { setCerrando(true); setErr('') }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors ml-auto">
                  <Lock size={14} /> Cerrar caja
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de arqueos (para el dueño) */}
      {historial.length > 0 && (
        <div className={card}>
          <button onClick={() => setVerHistorial((v) => !v)} className="w-full px-5 py-3 flex items-center gap-2 text-left">
            <span className="text-sm font-semibold text-slate-700 flex-1">Historial de arqueos</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${verHistorial ? 'rotate-180' : ''}`} />
          </button>
          {verHistorial && (
            <div className="border-t border-slate-50 divide-y divide-slate-50">
              {historial.map((h) => {
                const d = h.diferencia ?? 0
                const color = d === 0 ? 'text-emerald-600 bg-emerald-50' : d < 0 ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'
                return (
                  <div key={h.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{h.empleadoNombre || 'Empleado'} · {fechaCorta(h.cerradoAt)}</p>
                      <p className="text-[11px] text-slate-400">{hora(h.abiertoAt)}–{hora(h.cerradoAt)} · esperado {money(h.efectivoEsperado)} · contó {money(h.efectivoDeclarado)}{h.notas ? ` · ${h.notas}` : ''}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${color}`}>
                      {d === 0 ? 'OK' : d < 0 ? `−${money(Math.abs(d))}` : `+${money(d)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CajaTab = ({ token }) => {
  const club = useClubStore((s) => s.club)
  const [periodo, setPeriodo] = useState('hoy') // hoy | semana | mes | custom
  const [desde, setDesde] = useState(hoyStr())
  const [hasta, setHasta] = useState(hoyStr())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Rango efectivo según el período elegido
  const rango = (() => {
    if (periodo === 'hoy') return { desde: hoyStr(), hasta: hoyStr() }
    if (periodo === 'semana') return { desde: shift(hoyStr(), -6), hasta: hoyStr() }
    if (periodo === 'mes') return { desde: inicioMes(), hasta: hoyStr() }
    return { desde, hasta }
  })()

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await api.get(`/caja/reporte?desde=${rango.desde}&hasta=${rango.hasta}`, { Authorization: `Bearer ${token}` })
      setData(d ?? null)
    } catch { setData(null) } finally { setLoading(false) }
  }, [token, rango.desde, rango.hasta])

  useEffect(() => { fetchData() }, [fetchData])

  const metodos = data ? Object.entries(data.porMetodo ?? {}).filter(([, v]) => v.ingreso > 0 || v.egreso > 0) : []
  const tipos = data ? Object.entries(data.porTipo ?? {}).filter(([, v]) => v > 0) : []
  const totalTipos = tipos.reduce((s, [, v]) => s + v, 0)
  const categorias = data ? Object.entries(data.porCategoria ?? {}).sort((a, b) => b[1].monto - a[1].monto) : []

  const PERIODOS = [{ id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }, { id: 'custom', label: 'Personalizado' }]
  const card = 'bg-white rounded-2xl border border-slate-100 shadow-sm'

  return (
    <div className="flex flex-col gap-5">
      {/* Arqueo de caja del turno (control del efectivo físico) */}
      <ArqueoCaja token={token} />

      {/* ── Análisis del período (reporte, teórico) ── */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Análisis del período</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Selector de período */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {PERIODOS.map(({ id, label }) => (
            <button key={id} onClick={() => setPeriodo(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${periodo === id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400" />
            <span className="text-slate-400 text-xs">a</span>
            <input type="date" value={hasta} max={hoyStr()} min={desde} onChange={(e) => setHasta(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-400" />
          </div>
        )}
        <button onClick={() => imprimirCierreCaja(data, club, rango.desde === rango.hasta ? rango.desde : `${rango.desde} a ${rango.hasta}`)} disabled={!data || (data.cantMovimientos ?? 0) === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors disabled:opacity-40 ml-auto">
          <FileText size={14} /> Imprimir cierre
        </button>
      </div>

      {loading ? (
        <div className="p-10 flex items-center justify-center gap-3 text-slate-400"><div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" /><span className="text-sm">Generando reporte…</span></div>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${card} p-5 flex items-start gap-4`}>
              <div className="bg-emerald-500/10 rounded-xl p-3 shrink-0"><TrendingUp size={20} className="text-emerald-500" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Ingresos</p><p className="text-2xl font-bold text-emerald-600 mt-0.5">{money(data?.ingresos)}</p></div>
            </div>
            <div className={`${card} p-5 flex items-start gap-4`}>
              <div className="bg-rose-500/10 rounded-xl p-3 shrink-0"><TrendingDown size={20} className="text-rose-500" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Egresos</p><p className="text-2xl font-bold text-rose-600 mt-0.5">{money(data?.egresos)}</p></div>
            </div>
            <div className={`${card} p-5 flex items-start gap-4`}>
              <div className="bg-brand-500/10 rounded-xl p-3 shrink-0"><Wallet size={20} className="text-brand-600" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Neto</p><p className={`text-2xl font-bold mt-0.5 ${(data?.neto ?? 0) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{money(data?.neto)}</p></div>
            </div>
          </div>

          {(data?.cantMovimientos ?? 0) === 0 ? (
            <div className={`${card} p-10 text-center text-slate-400 text-sm`}>Sin movimientos en el período.</div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ingresos por tipo */}
            <div className={`${card} p-5`}>
              <p className="text-sm font-semibold text-slate-700 mb-3">Ingresos por tipo</p>
              {totalTipos === 0 ? <p className="text-slate-400 text-sm">Sin ingresos.</p> : (
                <div className="flex flex-col gap-2.5">
                  {tipos.map(([id, v]) => (
                    <div key={id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">{TIPO_LABEL[id] ?? id}</span>
                        <span className="font-semibold text-slate-700">{money(v)} <span className="text-slate-400 font-normal text-xs">({Math.round(v / totalTipos * 100)}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${TIPO_COLOR[id] ?? 'bg-slate-400'}`} style={{ width: `${v / totalTipos * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por método */}
            <div className={`${card} p-5`}>
              <p className="text-sm font-semibold text-slate-700 mb-3">Por método de pago</p>
              {metodos.length === 0 ? <p className="text-slate-400 text-sm">Sin movimientos.</p> : (
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-4 text-[11px] font-medium text-slate-400 uppercase tracking-wide pb-1">
                    <span>Método</span><span className="text-right">Ingr.</span><span className="text-right">Egr.</span><span className="text-right">Neto</span>
                  </div>
                  {metodos.map(([id, v]) => {
                    const m = METODO_MAP[id]; const neto = v.ingreso - v.egreso
                    return (
                      <div key={id} className="grid grid-cols-4 items-center py-1.5 text-sm border-t border-slate-50">
                        <span className="text-slate-700 font-medium truncate">{m?.label ?? id}</span>
                        <span className="text-right text-emerald-600">{v.ingreso > 0 ? money(v.ingreso) : '—'}</span>
                        <span className="text-right text-rose-600">{v.egreso > 0 ? money(v.egreso) : '—'}</span>
                        <span className={`text-right font-semibold ${neto >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{money(neto)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bar: ventas por categoría + margen */}
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Bar / tienda por categoría</p>
                {data?.bar?.venta > 0 && (
                  <span className="text-xs flex items-center gap-1 text-emerald-600 font-medium"><Percent size={12} /> margen {money(data.bar.margen)}</span>
                )}
              </div>
              {categorias.length === 0 ? <p className="text-slate-400 text-sm">Sin ventas de bar.</p> : (
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-3 text-[11px] font-medium text-slate-400 uppercase tracking-wide pb-1">
                    <span>Categoría</span><span className="text-right">Venta</span><span className="text-right">Margen</span>
                  </div>
                  {categorias.map(([cat, v]) => (
                    <div key={cat} className="grid grid-cols-3 items-center py-1.5 text-sm border-t border-slate-50">
                      <span className="text-slate-700 font-medium truncate">{cat} <span className="text-slate-400 font-normal text-xs">· {v.count}</span></span>
                      <span className="text-right text-slate-700">{money(v.monto)}</span>
                      <span className="text-right text-emerald-600 font-medium">{v.costo > 0 ? money(v.monto - v.costo) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              {data?.bar?.venta > 0 && data?.bar?.costo === 0 && (
                <p className="text-[11px] text-slate-400 mt-2">Cargá el <b>costo</b> de los productos (catálogo) para ver el margen.</p>
              )}
            </div>

            {/* Top productos */}
            <div className={`${card} p-5`}>
              <p className="text-sm font-semibold text-slate-700 mb-3">Más vendidos</p>
              {(data?.topProductos ?? []).length === 0 ? <p className="text-slate-400 text-sm">Sin ventas de productos.</p> : (
                <div className="flex flex-col gap-1">
                  {data.topProductos.map((p, i) => (
                    <div key={p.nombre} className="flex items-center gap-2 py-1.5 text-sm border-t border-slate-50 first:border-0">
                      <span className="text-slate-300 font-bold w-5 text-center text-xs">{i + 1}</span>
                      <span className="flex-1 text-slate-700 truncate">{p.nombre}</span>
                      <span className="text-slate-400 text-xs">×{p.count}</span>
                      <span className="font-semibold text-slate-700 w-20 text-right">{money(p.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
          <p className="text-[11px] text-slate-400 text-center">Cuenta solo lo cobrado/pagado en el período. Las deudas pendientes no son caja.</p>
        </>
      )}
    </div>
  )
}

export default CajaTab
