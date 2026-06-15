import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react'
import { api } from '../../lib/api'
import { METODO_MAP } from '../../lib/metodosPago'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
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

const CajaTab = ({ token }) => {
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
