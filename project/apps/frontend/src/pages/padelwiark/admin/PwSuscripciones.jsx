import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

// Precios de referencia por plan (ARS) — para pre-llenar el monto al registrar un pago.
const PRECIO_REF = { basico: 42900, pro: 74900, premium: 119900 }
const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'

// Estado de pago de cada club → color + texto.
const PAGO = {
  al_dia:       { t: 'Al día',        c: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  por_vencer:   { t: 'Por vencer',    c: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  vencido:      { t: 'Vencido',       c: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  prueba:       { t: 'En prueba',     c: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  sin_licencia: { t: 'Sin licencia',  c: 'text-slate-300 bg-white/5 border-white/10' },
  suspendido:   { t: 'Suspendido',    c: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  sin_dato:     { t: '—',             c: 'text-slate-400 bg-white/5 border-white/10' },
}

const PwSuscripciones = ({ notify }) => {
  const { token } = usePlatformStore()
  const auth = { Authorization: `Bearer ${token}` }
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagoClub, setPagoClub] = useState(null) // club al que se le registra un pago

  const cargar = useCallback(async () => {
    setLoading(true)
    try { setData(await api.get('/platform/suscripciones', auth)) } catch { setData({ clubs: [], cajaMes: 0, mrr: 0 }) } finally { setLoading(false) }
  }, [token]) // eslint-disable-line
  useEffect(() => { cargar() }, [cargar])

  const clubs = data?.clubs || []
  const vencidos = clubs.filter((c) => c.pago === 'vencido' || c.pago === 'por_vencer').length

  return (
    <>
      {/* KPIs: tu caja del mes + MRR + por cobrar */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-7">
        {[
          { k: 'Cobrado este mes', v: money(data?.cajaMes), icon: DollarSign },
          { k: 'Ingreso recurrente (MRR)', v: money(data?.mrr), icon: TrendingUp },
          { k: 'Por cobrar / vencidos', v: vencidos, icon: AlertTriangle },
        ].map(({ k, v, icon: Icon }) => (
          <div key={k} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <Icon size={18} className="text-[#afca0b] mb-2" />
            <p className="pw-display text-2xl font-bold text-[#f4f5ef] leading-none">{v}</p>
            <p className="text-xs text-[#9ba89f] mt-1">{k}</p>
          </div>
        ))}
      </div>

      <h1 className="pw-display text-xl font-semibold text-[#f4f5ef] mb-5">Suscripciones</h1>

      {loading ? (
        <div className="p-10 flex items-center justify-center gap-3 text-[#9ba89f]">
          <div className="w-4 h-4 rounded-full border-2 border-[#afca0b]/40 border-t-[#afca0b] animate-spin" /> Cargando…
        </div>
      ) : clubs.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center text-[#9ba89f] text-sm">Todavía no hay clubes.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {clubs.map((c) => {
            const p = PAGO[c.pago] || PAGO.sin_dato
            return (
              <div key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="pw-display font-semibold text-[#f4f5ef] truncate">{c.nombre}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border text-slate-300 bg-white/5 border-white/10">{c.plan}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${p.c}`}>{p.t}</span>
                  </div>
                  <p className="pw-mono text-[11px] text-[#9ba89f]">
                    {c.precioMensual ? `${money(c.precioMensual)}/mes` : 'precio no fijado'}
                    {c.estado === 'activo' && c.licenciaHasta ? ` · paga hasta ${fmt(c.licenciaHasta)}` : ''}
                    {c.estado === 'prueba' && c.trialHasta ? ` · prueba hasta ${fmt(c.trialHasta)}` : ''}
                  </p>
                </div>
                <button onClick={() => setPagoClub(c)} className="pw-btn-lime flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shrink-0">
                  <DollarSign size={15} /> Registrar pago
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pagoClub && (
        <PwModalPago
          club={pagoClub} auth={auth}
          onClose={() => setPagoClub(null)}
          onDone={(nombre) => { setPagoClub(null); notify(`Pago registrado · ${nombre}`); cargar() }}
        />
      )}
    </>
  )
}

// Modal: registrar un pago de suscripción (transferencia / MP / efectivo) → extiende la licencia.
const PwModalPago = ({ club, auth, onClose, onDone }) => {
  const [monto, setMonto] = useState(String(club.precioMensual || PRECIO_REF[club.plan] || ''))
  const [metodo, setMetodo] = useState('transferencia')
  const [meses, setMeses] = useState(1)
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = (Number(monto) || 0) * meses

  const submit = async () => {
    if (saving) return
    if (!(Number(monto) > 0)) return setError('Poné el monto mensual')
    setSaving(true); setError('')
    try {
      await api.post(`/platform/clubs/${club.id}/pago`, { monto: Number(monto), metodo, meses, nota }, auth)
      onDone(club.nombre)
    } catch (e) { setError(e?.message || 'No se pudo registrar'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#0f1512] border border-white/10 rounded-3xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="pw-display text-lg font-semibold text-[#f4f5ef]">Registrar pago</p>
            <p className="text-xs text-[#9ba89f]">{club.nombre} · plan {club.plan}</p>
          </div>
          <button onClick={onClose} className="text-[#9ba89f] hover:text-[#f4f5ef]"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#9ba89f]">Monto mensual (ARS)</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="42900"
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#9ba89f]">¿Cuántos meses paga?</label>
          <div className="flex gap-1.5">
            {[1, 3, 6, 12].map((n) => (
              <button key={n} onClick={() => setMeses(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${meses === n ? 'bg-[#afca0b] text-[#0a0f0d] border-[#afca0b]' : 'border-white/10 text-[#9ba89f] hover:border-white/25'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#9ba89f]">Cómo pagó</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50">
            <option value="transferencia" className="bg-[#141c18]">Transferencia</option>
            <option value="mp" className="bg-[#141c18]">Mercado Pago</option>
            <option value="efectivo" className="bg-[#141c18]">Efectivo</option>
            <option value="otro" className="bg-[#141c18]">Otro</option>
          </select>
        </div>

        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)"
          className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50" />

        <div className="rounded-xl bg-[#afca0b]/[0.06] border border-[#afca0b]/20 px-3 py-2.5 text-sm text-[#f4f5ef] flex items-center justify-between">
          <span className="text-[#9ba89f]">Total a cobrar</span>
          <b>{money(total)}</b>
        </div>

        {error && <p className="text-rose-400 text-xs">{error}</p>}

        <button onClick={submit} disabled={saving} className="pw-btn-lime flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold disabled:opacity-50">
          {saving ? 'Registrando…' : <><CheckCircle2 size={16} /> Confirmar y extender {meses} mes{meses > 1 ? 'es' : ''}</>}
        </button>
      </div>
    </div>
  )
}

export default PwSuscripciones
