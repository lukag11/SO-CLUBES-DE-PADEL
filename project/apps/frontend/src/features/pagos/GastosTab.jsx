import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, AlertTriangle, Plus, X, Trash2, CheckCircle, Pencil, Camera, Loader2, FileText } from 'lucide-react'
import { api, uploadImage } from '../../lib/api'
import Toast from '../../components/ui/Toast'
import { METODO_MAP, MetodoBadge } from '../../lib/metodosPago'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
const CATEGORIAS_SUGERIDAS = ['Insumos', 'Alquiler', 'Sueldos', 'Mantenimiento', 'Servicios', 'Impuestos', 'Otros']
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const hoy = () => new Date().toISOString().slice(0, 10)

// ── Modal: alta / edición de gasto ───────────────────────────────────────────
const ModalGasto = ({ gasto, metodos, token, onSave, onClose, saving }) => {
  const editing = !!gasto
  const [form, setForm] = useState(() => ({
    proveedor: gasto?.proveedor ?? '',
    concepto: gasto?.concepto ?? '',
    monto: gasto?.monto != null ? String(gasto.monto) : '',
    categoria: gasto?.categoria ?? '',
    fecha: gasto?.fecha ?? hoy(),
    pagado: gasto ? gasto.pagado : true,
    metodoPago: gasto?.metodoPago ?? (metodos[0] ?? 'efectivo'),
    numeroFactura: gasto?.numeroFactura ?? '',
    imagenUrl: gasto?.imagenUrl ?? '',
  }))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))


  const subirFoto = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, { folder: 'facturas', token })
      set('imagenUrl', url)
    } catch {
      setError('No se pudo subir la foto')
    } finally { setUploading(false) }
  }

  const submit = () => {
    if (!form.concepto.trim()) return setError('Ingresá un concepto')
    if (!(Number(form.monto) > 0)) return setError('El monto debe ser mayor a 0')
    setError('')
    onSave({
      proveedor: form.proveedor.trim() || null,
      concepto: form.concepto.trim(),
      monto: Number(form.monto),
      categoria: form.categoria.trim() || null,
      fecha: form.fecha,
      pagado: form.pagado,
      metodoPago: form.pagado ? form.metodoPago : null,
      numeroFactura: form.numeroFactura.trim() || null,
      imagenUrl: form.imagenUrl || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-slate-800 font-bold">{editing ? 'Editar gasto' : 'Nuevo gasto'}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Concepto</label>
            <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: Compra de pelotas, factura de luz…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Proveedor</label>
              <input value={form.proveedor} onChange={(e) => set('proveedor', e.target.value)} placeholder="Opcional" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Monto</label>
              <input type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Categoría</label>
              <input list="cat-gasto" value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Opcional" className={inputCls} />
              <datalist id="cat-gasto">{CATEGORIAS_SUGERIDAS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">N° de factura (opcional)</label>
            <input value={form.numeroFactura} onChange={(e) => set('numeroFactura', e.target.value)} placeholder="0001-00012345" className={inputCls} />
          </div>

          {/* Estado de pago */}
          <div className="flex flex-col gap-2">
            <button onClick={() => set('pagado', true)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${form.pagado ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${form.pagado ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
              <span className="text-sm font-medium text-slate-700">Ya pagado</span>
            </button>
            <button onClick={() => set('pagado', false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${!form.pagado ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${!form.pagado ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`} />
              <span className="text-sm font-medium text-slate-700">A pagar (queda pendiente)</span>
            </button>
            {form.pagado && (
              <select value={form.metodoPago} onChange={(e) => set('metodoPago', e.target.value)} className={inputCls}>
                {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
              </select>
            )}
          </div>

          {/* Foto de la factura (OCR-ready) */}
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Foto de la factura (opcional)</label>
            {form.imagenUrl ? (
              <div className="flex items-center gap-2">
                <a href={form.imagenUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-600 hover:underline"><FileText size={15} /> Ver factura</a>
                <button onClick={() => set('imagenUrl', '')} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm cursor-pointer hover:bg-slate-50 w-fit">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                {uploading ? 'Subiendo…' : 'Adjuntar foto'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
              </label>
            )}
          </div>

          {!editing && (
            <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">¿Es una <b>compra de mercadería</b> (productos para el bar)? Cargala desde <b>Stock → Ingresar compra</b>: suma stock y queda como egreso acá.</p>
          )}

          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={submit} disabled={saving || uploading} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: marcar gasto como pagado (elegir método) ──────────────────────────
const ModalPagarGasto = ({ gasto, metodos, onConfirm, onClose, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-slate-800 font-bold">Registrar pago</p>
          <p className="text-slate-400 text-xs mt-0.5">{gasto.concepto} · {money(gasto.monto)}</p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
      </div>
      <div className="p-6 flex flex-col gap-2.5">
        <p className="text-slate-500 text-xs font-medium mb-1">¿Cómo se pagó?</p>
        {metodos.map((id) => {
          const m = METODO_MAP[id]; if (!m) return null
          const Icon = m.icon
          return (
            <button key={id} disabled={saving} onClick={() => onConfirm(id)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left disabled:opacity-50">
              <Icon size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{m.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  </div>
)

// ── Tab de Gastos / Egresos ──────────────────────────────────────────────────
const GastosTab = ({ token, metodos }) => {
  const [gastos, setGastos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos') // todos | pagado | pendiente
  const [modal, setModal] = useState(null)       // { gasto } | { nuevo:true }
  const [pagando, setPagando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (tipo, message) => { setToast({ tipo, message }); setTimeout(() => setToast(null), 3500) }

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [g, r] = await Promise.all([
        api.get('/gastos', { Authorization: `Bearer ${token}` }),
        api.get('/gastos/resumen', { Authorization: `Bearer ${token}` }),
      ])
      setGastos(Array.isArray(g) ? g : [])
      setResumen(r ?? null)
    } catch {
      showToast('error', 'No se pudieron cargar los gastos')
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const visibles = gastos.filter((g) =>
    filtro === 'todos' ? true : filtro === 'pagado' ? g.pagado : !g.pagado)

  const guardar = async (data) => {
    setSaving(true)
    try {
      if (modal?.gasto) await api.patch(`/gastos/${modal.gasto.id}`, data, { Authorization: `Bearer ${token}` })
      else await api.post('/gastos', data, { Authorization: `Bearer ${token}` })
      setModal(null)
      showToast('exito', modal?.gasto ? 'Gasto actualizado' : 'Gasto registrado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo guardar el gasto')
    } finally { setSaving(false) }
  }
  const marcarPagado = async (metodoPago) => {
    setSaving(true)
    try {
      await api.patch(`/gastos/${pagando.id}`, { pagado: true, metodoPago }, { Authorization: `Bearer ${token}` })
      setPagando(null)
      showToast('exito', 'Pago registrado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo registrar el pago')
    } finally { setSaving(false) }
  }
  const eliminar = async () => {
    setSaving(true)
    try {
      await api.delete(`/gastos/${eliminando.id}`, { Authorization: `Bearer ${token}` })
      setEliminando(null)
      showToast('exito', 'Gasto eliminado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo eliminar')
    } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header acción */}
      <div className="flex items-center justify-end">
        <button onClick={() => setModal({ nuevo: true })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm">
          <Plus size={16} /> Nuevo gasto
        </button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-rose-500/10 rounded-xl p-3 shrink-0"><TrendingDown size={20} className="text-rose-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Gastado este mes</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{money(resumen?.gastadoMes)}</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-amber-500/10 rounded-xl p-3 shrink-0"><AlertTriangle size={20} className="text-amber-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">A pagar</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{money(resumen?.aPagar)}</p><p className="text-xs text-slate-400 mt-0.5">{resumen?.cantAPagar ?? 0} factura{resumen?.cantAPagar !== 1 ? 's' : ''}</p></div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[{ id: 'todos', label: 'Todos' }, { id: 'pendiente', label: 'A pagar' }, { id: 'pagado', label: 'Pagados' }].map(({ id, label }) => (
          <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-slate-400"><div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" /><span className="text-sm">Cargando gastos…</span></div>
        ) : visibles.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center"><TrendingDown size={24} className="text-slate-200" /><p className="text-slate-400 text-sm">Sin gastos para este filtro</p></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibles.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-800 font-semibold text-sm truncate">{g.concepto}</p>
                    {g.categoria && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{g.categoria}</span>}
                    {g.imagenUrl && <FileText size={12} className="text-slate-300" />}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    {g.proveedor ? `${g.proveedor} · ` : ''}{fmtFecha(g.fecha)}{g.numeroFactura ? ` · Fac. ${g.numeroFactura}` : ''}
                  </p>
                </div>
                <p className="text-slate-800 font-bold text-sm shrink-0">{money(g.monto)}</p>
                <div className="shrink-0 w-[190px] flex items-center justify-end gap-2">
                  {g.pagado ? (
                    <div className="flex items-center gap-1.5">
                      <MetodoBadge metodo={g.metodoPago} />
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg"><CheckCircle size={12} /> Pagado</span>
                    </div>
                  ) : (
                    <button onClick={() => setPagando(g)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"><CheckCircle size={13} /> Marcar pagado</button>
                  )}
                  <button onClick={() => setModal({ gasto: g })} className="text-slate-300 hover:text-brand-500 p-1"><Pencil size={14} /></button>
                  <button onClick={() => setEliminando(g)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && <ModalGasto gasto={modal.gasto} metodos={metodos} token={token} onSave={guardar} onClose={() => setModal(null)} saving={saving} />}
      {pagando && <ModalPagarGasto gasto={pagando} metodos={metodos} onConfirm={marcarPagado} onClose={() => setPagando(null)} saving={saving} />}
      {eliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEliminando(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-rose-500" /></div>
              <div><p className="text-slate-800 font-bold">Eliminar gasto</p><p className="text-slate-400 text-xs mt-0.5">{eliminando.concepto} · {money(eliminando.monto)}</p></div>
            </div>
            <p className="text-slate-500 text-sm">Se borra este gasto del registro. No se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setEliminando(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={eliminar} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Borrando…' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          icon={toast.tipo === 'exito' ? CheckCircle : AlertTriangle}
          iconBg={toast.tipo === 'exito' ? 'bg-emerald-500/15' : 'bg-rose-500/15'}
          iconColor={toast.tipo === 'exito' ? 'text-emerald-400' : 'text-rose-400'}
          barColor={toast.tipo === 'exito' ? 'bg-emerald-400' : 'bg-rose-400'}
          label={toast.tipo === 'exito' ? 'Gastos' : 'Error'}
          message={toast.message}
          duration={3500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default GastosTab
