import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Package, AlertTriangle, Boxes, History } from 'lucide-react'
import { api } from '../../lib/api'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const CATEGORIAS = ['Bebidas', 'Comidas', 'Golosinas', 'Insumos', 'Otros']
const calcPct = (costo, precio) => (Number(costo) > 0 && precio !== '' && precio != null) ? Math.round((Number(precio) - Number(costo)) / Number(costo) * 100) : ''
const precioDesdePct = (costo, pct) => (Number(costo) > 0 && pct !== '') ? String(Math.round(Number(costo) * (1 + Number(pct) / 100))) : ''
const MOVTIPO = { entrada: { t: 'Entrada', c: 'text-emerald-600' }, salida: { t: 'Salida', c: 'text-rose-600' }, ajuste: { t: 'Ajuste', c: 'text-amber-600' } }
const fmtFecha = (s) => { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

const StockTab = ({ token, showToast, onIngresarCompra }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState({ nombre: '', precio: '', costo: '', categoria: 'Bebidas', controlaStock: true, stock: '', stockMin: '' })
  const [editId, setEditId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [movsOpen, setMovsOpen] = useState(null) // productoId
  const [movs, setMovs] = useState([])
  const [q, setQ] = useState('')

  const fetchData = useCallback(async () => {
    try { setProductos(await api.get('/productos', auth)) } catch { /* */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [fetchData])

  const resetForm = () => { setForm((f) => ({ nombre: '', precio: '', costo: '', categoria: f.categoria, controlaStock: true, stock: '', stockMin: '' })); setEditId(null); setError(''); setFormOpen(false) }
  const guardar = async () => {
    if (!form.nombre.trim()) return setError('Ingresá un nombre')
    if (!(Number(form.precio) > 0)) return setError('El precio debe ser mayor a 0')
    setError(''); setSaving(true)
    const payload = {
      nombre: form.nombre.trim(), precio: Number(form.precio), costo: form.costo === '' ? null : Number(form.costo), categoria: form.categoria || null,
      controlaStock: form.controlaStock, stockMin: form.stockMin === '' ? 0 : Number(form.stockMin),
      ...(editId ? {} : { stock: form.stock === '' ? 0 : Number(form.stock) }),
    }
    try {
      if (editId) await api.patch(`/productos/${editId}`, payload, auth)
      else await api.post('/productos', payload, auth)
      resetForm(); fetchData(); showToast?.('exito', editId ? 'Producto actualizado' : 'Producto agregado')
    } catch (e) { setError(e?.message || 'No se pudo guardar') } finally { setSaving(false) }
  }
  const editar = (p) => { setEditId(p.id); setFormOpen(true); setError(''); setForm({ nombre: p.nombre, precio: String(p.precio), costo: p.costo != null ? String(p.costo) : '', categoria: p.categoria ?? 'Otros', controlaStock: !!p.controlaStock, stock: '', stockMin: p.stockMin ? String(p.stockMin) : '' }) }
  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" del catálogo?`)) return
    try { await api.delete(`/productos/${p.id}`, auth); fetchData(); showToast?.('exito', 'Producto eliminado') } catch (e) { showToast?.('error', e?.message || 'No se pudo eliminar') }
  }
  const ajustar = async (p) => {
    const v = window.prompt(`Stock real de "${p.nombre}":`, String(p.stock))
    if (v === null || v.trim() === '' || isNaN(Number(v))) return
    try { await api.post(`/productos/${p.id}/ajuste`, { stock: Math.max(0, Math.round(Number(v))) }, auth); fetchData(); showToast?.('exito', 'Stock actualizado') } catch (e) { showToast?.('error', e?.message || 'No se pudo ajustar') }
  }
  const verMovs = async (p) => {
    if (movsOpen === p.id) { setMovsOpen(null); return }
    setMovsOpen(p.id); setMovs([])
    try { setMovs(await api.get(`/productos/${p.id}/movimientos`, auth)) } catch { setMovs([]) }
  }

  const conStock = productos.filter((p) => p.controlaStock)
  const valorInventario = conStock.reduce((s, p) => s + (p.costo || 0) * p.stock, 0)
  const bajoStock = conStock.filter((p) => p.stock <= (p.stockMin || 0))

  const term = q.trim().toLowerCase()
  const filtrados = term ? productos.filter((p) => `${p.nombre} ${p.categoria ?? ''}`.toLowerCase().includes(term)) : productos
  const grupos = CATEGORIAS.map((cat) => ({ cat, items: filtrados.filter((p) => (p.categoria || 'Otros') === cat) })).filter((g) => g.items.length > 0)
  const otras = filtrados.filter((p) => p.categoria && !CATEGORIAS.includes(p.categoria))
  if (otras.length) grupos.push({ cat: 'Otras', items: otras })

  const estadoBadge = (p) => {
    if (!p.controlaStock) return null
    const cls = p.stock <= 0 ? 'text-rose-600 bg-rose-50' : p.stock <= (p.stockMin || 0) ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
    return <button onClick={() => ajustar(p)} title="Ajustar stock" className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${cls}`}>{p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}</button>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-brand-500/10 rounded-xl p-3 shrink-0"><Boxes size={20} className="text-brand-600" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Valor de inventario</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{money(valorInventario)}</p><p className="text-xs text-slate-400 mt-0.5">{conStock.length} con control de stock</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-amber-500/10 rounded-xl p-3 shrink-0"><AlertTriangle size={20} className="text-amber-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Bajo stock</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{bajoStock.length}</p><p className="text-xs text-slate-400 mt-0.5">productos a reponer</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-slate-500/10 rounded-xl p-3 shrink-0"><Package size={20} className="text-slate-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Productos</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{productos.length}</p></div>
        </div>
      </div>

      {/* Alerta bajo stock */}
      {bajoStock.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm"><p className="text-amber-800 font-medium">A reponer ({bajoStock.length})</p><p className="text-amber-700 text-xs mt-0.5">{bajoStock.map((p) => `${p.nombre} (${p.stock})`).join(' · ')}</p></div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className={`flex-1 min-w-[180px] ${inputCls}`} />
        {onIngresarCompra && <button onClick={onIngresarCompra} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><Plus size={16} /> Ingresar compra</button>}
        <button onClick={() => { resetForm(); setFormOpen(true) }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-sm"><Plus size={16} /> Nuevo producto</button>
      </div>

      {/* Form alta/edición */}
      {formOpen && (
        <div className={`rounded-2xl border p-4 flex flex-col gap-2.5 ${editId ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{editId ? 'Editar producto' : 'Nuevo producto'}</p>
            <button onClick={resetForm} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Coca Cola 1L)" className={`w-full ${inputCls}`} />
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-slate-500 text-[11px] font-medium mb-1">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className={`w-full ${inputCls}`}>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">Costo</label><input type="number" value={form.costo} onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))} placeholder="opc." className={`w-full ${inputCls}`} /></div>
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">Precio</label><input type="number" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} placeholder="0" className={`w-full ${inputCls}`} /></div>
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">% gan.</label><input type="number" value={calcPct(form.costo, form.precio)} onChange={(e) => setForm((f) => ({ ...f, precio: precioDesdePct(f.costo, e.target.value) }))} disabled={!(Number(form.costo) > 0)} placeholder={Number(form.costo) > 0 ? '%' : '—'} className={`w-full ${inputCls} disabled:opacity-50`} /></div>
          </div>
          <div className="rounded-xl border border-slate-100 p-2.5">
            <button onClick={() => setForm((f) => ({ ...f, controlaStock: !f.controlaStock }))} className="flex items-center gap-2">
              <div className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${form.controlaStock ? 'bg-brand-500' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.controlaStock ? 'left-4' : 'left-0.5'}`} /></div>
              <span className="text-sm text-slate-700 font-medium">Controlar stock</span>
            </button>
            {form.controlaStock && (
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                {!editId && <div><label className="block text-slate-500 text-[11px] font-medium mb-1">Stock inicial</label><input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" className={`w-full ${inputCls}`} /></div>}
                <div className={editId ? 'col-span-2' : ''}><label className="block text-slate-500 text-[11px] font-medium mb-1">Avisar cuando queden ≤</label><input type="number" value={form.stockMin} onChange={(e) => setForm((f) => ({ ...f, stockMin: e.target.value }))} placeholder="ej: 5" className={`w-full ${inputCls}`} /></div>
              </div>
            )}
          </div>
          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={guardar} disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      )}

      {/* Lista de inventario */}
      <div className="flex flex-col gap-3">
        {productos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Todavía no cargaste productos.</div>
        ) : grupos.map(({ cat, items }) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{cat} <span className="font-normal">· {items.length}</span></p>
            {items.map((p) => (
              <div key={p.id}>
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white ${editId === p.id ? 'border-brand-300' : 'border-slate-100'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.nombre}{!p.activo && <span className="text-[10px] text-slate-400 ml-1">(inactivo)</span>}</p>
                    <span className="text-[10px] text-slate-400">{money(p.precio)}{p.costo != null ? ` · costo ${money(p.costo)} · margen ${money(p.precio - p.costo)}${p.costo > 0 ? ` (${calcPct(p.costo, p.precio)}%)` : ''}` : ''}{p.controlaStock ? ` · valor ${money((p.costo || 0) * p.stock)}` : ''}</span>
                  </div>
                  {estadoBadge(p)}
                  {p.controlaStock && <button onClick={() => verMovs(p)} title="Movimientos" className={`p-1 ${movsOpen === p.id ? 'text-brand-500' : 'text-slate-300 hover:text-brand-500'}`}><History size={14} /></button>}
                  <button onClick={() => editar(p)} title="Editar" className="text-slate-300 hover:text-brand-500 p-1"><Pencil size={14} /></button>
                  <button onClick={() => eliminar(p)} title="Eliminar" className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                </div>
                {movsOpen === p.id && (
                  <div className="ml-3 mt-1 mb-1 rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
                    {movs.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400">Sin movimientos.</p> : movs.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className={`font-semibold w-16 ${MOVTIPO[m.tipo]?.c ?? 'text-slate-500'}`}>{MOVTIPO[m.tipo]?.t ?? m.tipo}</span>
                        <span className={`font-medium w-12 ${m.cantidad >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.cantidad >= 0 ? '+' : ''}{m.cantidad}</span>
                        <span className="flex-1 text-slate-500 truncate">{m.motivo || '—'}</span>
                        <span className="text-slate-300">{fmtFecha(m.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StockTab
