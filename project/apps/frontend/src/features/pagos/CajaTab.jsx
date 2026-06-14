import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
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
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtLargo = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return `${d} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][m - 1]} de ${y}`
}

const CajaTab = ({ token }) => {
  const [fecha, setFecha] = useState(hoyStr())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const d = await api.get(`/caja?fecha=${fecha}`, { Authorization: `Bearer ${token}` })
      setData(d ?? null)
    } catch {
      setData(null)
    } finally { setLoading(false) }
  }, [token, fecha])

  useEffect(() => { fetchData() }, [fetchData])

  const metodos = data ? Object.entries(data.metodos ?? {}).filter(([, v]) => v.ingreso > 0 || v.egreso > 0) : []
  const esHoy = fecha === hoyStr()

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de día */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setFecha((f) => shift(f, -1))} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronLeft size={16} /></button>
        <div className="flex flex-col items-center min-w-[200px]">
          <input type="date" value={fecha} max={hoyStr()} onChange={(e) => setFecha(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 text-center" />
          <span className="text-[11px] text-slate-400 mt-1">{esHoy ? 'Hoy' : fmtLargo(fecha)}</span>
        </div>
        <button onClick={() => setFecha((f) => shift(f, 1))} disabled={esHoy} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>

      {loading ? (
        <div className="p-10 flex items-center justify-center gap-3 text-slate-400"><div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" /><span className="text-sm">Calculando caja…</span></div>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className="bg-emerald-500/10 rounded-xl p-3 shrink-0"><TrendingUp size={20} className="text-emerald-500" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Ingresos</p><p className="text-2xl font-bold text-emerald-600 mt-0.5">{money(data?.ingresos)}</p></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className="bg-rose-500/10 rounded-xl p-3 shrink-0"><TrendingDown size={20} className="text-rose-500" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Egresos</p><p className="text-2xl font-bold text-rose-600 mt-0.5">{money(data?.egresos)}</p></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className="bg-brand-500/10 rounded-xl p-3 shrink-0"><Wallet size={20} className="text-brand-600" /></div>
              <div><p className="text-sm text-slate-500 font-medium">Neto del día</p><p className={`text-2xl font-bold mt-0.5 ${(data?.neto ?? 0) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{money(data?.neto)}</p></div>
            </div>
          </div>

          {/* Desglose por método */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Por método de pago</p>
            </div>
            {metodos.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">Sin movimientos {esHoy ? 'hoy' : 'ese día'}</div>
            ) : (
              <div className="divide-y divide-slate-50">
                <div className="grid grid-cols-4 px-5 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  <span>Método</span><span className="text-right">Ingresos</span><span className="text-right">Egresos</span><span className="text-right">Neto</span>
                </div>
                {metodos.map(([id, v]) => {
                  const m = METODO_MAP[id]
                  const Icon = m?.icon
                  const neto = v.ingreso - v.egreso
                  return (
                    <div key={id} className="grid grid-cols-4 items-center px-5 py-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-700 font-medium">{Icon && <Icon size={15} className="text-slate-400" />}{m?.label ?? id}</span>
                      <span className="text-right text-emerald-600 font-medium">{v.ingreso > 0 ? money(v.ingreso) : '—'}</span>
                      <span className="text-right text-rose-600 font-medium">{v.egreso > 0 ? money(v.egreso) : '—'}</span>
                      <span className={`text-right font-bold ${neto >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{money(neto)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 text-center">Cuenta solo movimientos cobrados/pagados ese día. Las deudas pendientes no son caja.</p>
        </>
      )}
    </div>
  )
}

export default CajaTab
