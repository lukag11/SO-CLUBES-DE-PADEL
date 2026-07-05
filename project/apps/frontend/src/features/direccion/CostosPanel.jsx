import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, Loader2, Check } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/ToastProvider'

const money = (n) => `$${Math.round(n ?? 0).toLocaleString('es-AR')}`
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PERIODO_LBL = { mensual: 'Mensual', bimestral: 'Bimestral', anual: 'Anual', unico: 'Una vez' }
const SECTOR_LBL = { canchas: 'Canchas', clases: 'Clases', bar: 'Bar', proshop: 'Tienda', general: 'General (se reparte)' }

const vacio = { concepto: '', monto: '', tipo: 'fijo', periodicidad: 'mensual', mesesPago: [], sector: 'general' }

export default function CostosPanel({ onClose, onChange }) {
  const token = useAuthStore((s) => s.token)
  const auth = { Authorization: `Bearer ${token}` }
  const toast = useToast()

  const [costos, setCostos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // null = no editando; objeto = form abierto
  const [saving, setSaving] = useState(false)
  const [tocado, setTocado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const cs = await api.get('/costos', auth)
      setCostos(Array.isArray(cs) ? cs : [])
    } catch { toast?.error?.('No se pudieron cargar los costos') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => setForm({ ...vacio })
  const abrirEditar = (c) => setForm({ ...c, monto: String(c.monto), mesesPago: c.mesesPago ?? [] })

  const guardar = async () => {
    const monto = Math.round(Number(form.monto))
    if (!form.concepto?.trim()) { toast?.error?.('Poné un nombre al costo'); return }
    if (!monto || monto <= 0) { toast?.error?.('El monto debe ser mayor a 0'); return }
    setSaving(true)
    const body = {
      concepto: form.concepto.trim(),
      monto,
      tipo: form.tipo,
      periodicidad: form.tipo === 'variable' ? 'mensual' : form.periodicidad,
      mesesPago: form.tipo === 'fijo' && form.periodicidad === 'anual' ? form.mesesPago : [],
      sector: form.sector === 'general' ? null : form.sector,
    }
    try {
      if (form.id) await api.patch(`/costos/${form.id}`, body, auth)
      else await api.post('/costos', body, auth)
      toast?.success?.('Costo guardado')
      setForm(null); setTocado(true)
      setLoading(true); await cargar()
    } catch { toast?.error?.('No se pudo guardar') }
    finally { setSaving(false) }
  }

  const borrar = async (c) => {
    if (!window.confirm(`¿Borrar "${c.concepto}"?`)) return
    try { await api.delete(`/costos/${c.id}`, auth); setTocado(true); await cargar() }
    catch { toast?.error?.('No se pudo borrar') }
  }

  const cerrar = () => { if (tocado) onChange?.(); onClose?.() }

  const toggleMes = (i) => {
    const m = i + 1
    setForm((f) => ({ ...f, mesesPago: f.mesesPago.includes(m) ? f.mesesPago.filter((x) => x !== m) : [...f.mesesPago, m] }))
  }

  const fijos = costos.filter((c) => c.tipo === 'fijo')
  const variables = costos.filter((c) => c.tipo === 'variable')
  const totalFijoMensual = fijos.reduce((s, c) => {
    const m = c.periodicidad === 'bimestral' ? c.monto / 2 : c.periodicidad === 'anual' ? c.monto / 12 : c.periodicidad === 'unico' ? 0 : c.monto
    return s + m
  }, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto" onClick={cerrar}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tus costos</h2>
            <p className="text-sm text-slate-500">Cargá alquiler, sueldos, luz, aguinaldo… así el club calcula bien tu equilibrio y tu flujo.</p>
          </div>
          <button onClick={cerrar} className="text-slate-400 hover:text-slate-600 p-1"><X size={22} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Loader2 className="animate-spin" size={20} /> Cargando…</div>
          ) : form ? (
            /* ── FORMULARIO ── */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">¿Qué es?</label>
                <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej: Alquiler, Sueldo Juan, Luz" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input type="number" inputMode="numeric" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })}
                      placeholder="0" className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 outline-none bg-white">
                    <option value="fijo">Fijo (lo pagás siempre)</option>
                    <option value="variable">Por turno jugado</option>
                  </select>
                </div>
              </div>

              {form.tipo === 'fijo' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">¿Cada cuánto?</label>
                    <select value={form.periodicidad} onChange={(e) => setForm({ ...form, periodicidad: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 outline-none bg-white">
                      {Object.entries(PERIODO_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">¿De qué parte?</label>
                    <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-lime-500 outline-none bg-white">
                      {Object.entries(SECTOR_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.tipo === 'fijo' && form.periodicidad === 'anual' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">¿Qué meses se paga? <span className="font-normal text-slate-400">(ej: aguinaldo → Jun y Dic)</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {MESES.map((m, i) => (
                      <button key={m} onClick={() => toggleMes(i)} type="button"
                        className={`px-2.5 py-1 rounded-lg text-sm border transition-colors ${form.mesesPago.includes(i + 1) ? 'bg-lime-500 text-slate-900 border-lime-500 font-semibold' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.tipo === 'variable' && (
                <p className="text-xs text-slate-400">Un costo "por turno" es lo que gastás cada vez que alguien juega (luz de la cancha, limpieza). Se usa para el punto de equilibrio.</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={guardar} disabled={saving}
                  className="inline-flex items-center gap-2 bg-lime-500 hover:bg-lime-600 disabled:opacity-60 text-slate-900 font-semibold px-5 py-2.5 rounded-xl">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Guardar
                </button>
                <button onClick={() => setForm(null)} className="text-slate-500 hover:text-slate-700 text-sm font-medium">Cancelar</button>
              </div>
            </div>
          ) : (
            /* ── LISTA ── */
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">Costos fijos del mes: <b className="text-slate-800">{money(totalFijoMensual)}</b></p>
                <button onClick={abrirNuevo} className="inline-flex items-center gap-1.5 bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold px-4 py-2 rounded-xl text-sm">
                  <Plus size={16} /> Agregar costo
                </button>
              </div>

              {costos.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p>Todavía no cargaste costos.</p>
                  <p className="text-sm mt-1">Empezá por el alquiler o los sueldos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[['Fijos', fijos], ['Por turno', variables]].map(([titulo, lista]) => lista.length > 0 && (
                    <div key={titulo}>
                      <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">{titulo}</p>
                      <div className="space-y-2">
                        {lista.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{c.concepto}</p>
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {c.tipo === 'fijo' && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{PERIODO_LBL[c.periodicidad]}</span>}
                                {c.tipo === 'fijo' && c.periodicidad === 'anual' && c.mesesPago?.length > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{c.mesesPago.map((m) => MESES[m - 1]).join(', ')}</span>}
                                {c.sector && <span className="text-[11px] px-1.5 py-0.5 rounded bg-lime-100 text-lime-700">{SECTOR_LBL[c.sector] ?? c.sector}</span>}
                              </div>
                            </div>
                            <span className="font-bold text-slate-800">{money(c.monto)}</span>
                            <button onClick={() => abrirEditar(c)} className="text-slate-400 hover:text-slate-700 p-1"><Pencil size={16} /></button>
                            <button onClick={() => borrar(c)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
