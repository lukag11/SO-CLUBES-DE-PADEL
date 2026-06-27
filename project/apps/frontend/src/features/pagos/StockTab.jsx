import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Package, AlertTriangle, Boxes, History, Camera, Loader2, FileText, Truck, Tags } from 'lucide-react'
import { api, uploadImage } from '../../lib/api'
import { METODO_MAP } from '../../lib/metodosPago'
import { useConfirm } from '../../components/ui/ConfirmProvider'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const calcPct = (costo, precio) => (Number(costo) > 0 && precio !== '' && precio != null) ? Math.round((Number(precio) - Number(costo)) / Number(costo) * 100) : ''
const precioDesdePct = (costo, pct) => (Number(costo) > 0 && pct !== '') ? String(Math.round(Number(costo) * (1 + Number(pct) / 100))) : ''
const MOVTIPO = { entrada: { t: 'Entrada', c: 'text-emerald-600' }, salida: { t: 'Salida', c: 'text-rose-600' }, ajuste: { t: 'Ajuste', c: 'text-amber-600' } }
const fmtFecha = (s) => { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

const StockTab = ({ token, metodos = ['efectivo'], showToast }) => {
  const confirmar = useConfirm()
  const auth = { Authorization: `Bearer ${token}` }
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([]) // [{id, nombre}]
  const [compraOpen, setCompraOpen] = useState(false)
  const [catsOpen, setCatsOpen] = useState(false)
  const [prodModal, setProdModal] = useState(null) // null | { producto } (producto null = nuevo)
  const [movsOpen, setMovsOpen] = useState(null) // productoId
  const [movs, setMovs] = useState([])
  const [q, setQ] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.get('/productos', auth), api.get('/categorias', auth)])
      setProductos(Array.isArray(p) ? p : [])
      setCategorias(Array.isArray(c) ? c : [])
    } catch { /* */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [fetchData])
  const catNames = categorias.map((c) => c.nombre)

  const editar = (p) => setProdModal({ producto: p })
  const eliminar = async (p) => {
    if (!(await confirmar({ titulo: 'Eliminar producto', mensaje: `¿Eliminar "${p.nombre}" del catálogo?`, danger: true, confirmText: 'Eliminar' }))) return
    try { await api.delete(`/productos/${p.id}`, auth); fetchData(); showToast?.('exito', 'Producto eliminado') } catch (e) { showToast?.('error', e?.message || 'No se pudo eliminar') }
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
  const grupos = catNames.map((cat) => ({ cat, items: filtrados.filter((p) => (p.categoria || 'Otros') === cat) })).filter((g) => g.items.length > 0)
  const otras = filtrados.filter((p) => !catNames.includes(p.categoria || 'Otros'))
  if (otras.length) grupos.push({ cat: 'Sin categoría', items: otras })

  const estadoBadge = (p) => {
    if (!p.controlaStock) return null
    const cls = p.stock <= 0 ? 'text-rose-600 bg-rose-50' : p.stock <= (p.stockMin || 0) ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
    return <button onClick={() => editar(p)} title="Ver / ajustar stock" className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${cls}`}>{p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}</button>
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
        <button onClick={() => setCatsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><Tags size={16} /> Categorías</button>
        <button onClick={() => setCompraOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><Truck size={16} /> Ingresar compra</button>
        <button onClick={() => setProdModal({ producto: null })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-sm"><Plus size={16} /> Nuevo producto</button>
      </div>

      {/* Lista de inventario */}
      <div className="flex flex-col gap-3">
        {productos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Todavía no cargaste productos.</div>
        ) : grupos.map(({ cat, items }) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{cat} <span className="font-normal">· {items.length}</span></p>
            {items.map((p) => (
              <div key={p.id}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 bg-white">
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

      {prodModal && <ModalProducto producto={prodModal.producto} categorias={catNames} token={token} onClose={() => setProdModal(null)} onDone={(msg) => { setProdModal(null); fetchData(); showToast?.('exito', msg) }} />}
      {catsOpen && <ModalCategorias categorias={categorias} productos={productos} token={token} onClose={() => setCatsOpen(false)} onChange={fetchData} showToast={showToast} />}
      {compraOpen && <ModalCompra productos={productos} metodos={metodos} token={token} onClose={() => setCompraOpen(false)} onDone={() => { setCompraOpen(false); fetchData(); showToast?.('exito', 'Compra registrada · stock actualizado') }} />}
    </div>
  )
}

// ─── Modal Producto: alta/edición de la ficha del producto (no carga stock) ─────
const ModalProducto = ({ producto, categorias = [], token, onClose, onDone }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const editing = !!producto
  const [cats, setCats] = useState(categorias)
  const [nuevaCat, setNuevaCat] = useState('') // input inline de nueva categoría
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '', precio: producto?.precio != null ? String(producto.precio) : '',
    costo: producto?.costo != null ? String(producto.costo) : '', categoria: producto?.categoria ?? categorias[0] ?? 'Bebidas',
    controlaStock: producto ? !!producto.controlaStock : true,
    stock: producto ? String(producto.stock) : '', stockMin: producto?.stockMin ? String(producto.stockMin) : '',
  })
  const crearCategoria = async () => {
    const nombre = nuevaCat.trim(); if (!nombre) return
    try {
      await api.post('/categorias', { nombre }, auth)
      setCats((c) => [...new Set([...c, nombre])]); setForm((f) => ({ ...f, categoria: nombre })); setNuevaCat('')
    } catch (e) { setError(e?.message || 'No se pudo crear la categoría') }
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.nombre.trim()) return setError('Ingresá un nombre')
    if (!(Number(form.precio) > 0)) return setError('El precio de venta debe ser mayor a 0')
    if (form.categoria === '__nueva__') return setError('Creá la categoría nueva o elegí una')
    setError(''); setSaving(true)
    const stockNum = form.stock === '' ? 0 : Math.max(0, Math.round(Number(form.stock)))
    const payload = {
      nombre: form.nombre.trim(), precio: Number(form.precio), costo: form.costo === '' ? null : Number(form.costo),
      categoria: form.categoria || null, controlaStock: form.controlaStock, stockMin: form.stockMin === '' ? 0 : Number(form.stockMin),
      ...(editing ? {} : { stock: stockNum }), // alta: stock inicial
    }
    try {
      if (editing) {
        await api.patch(`/productos/${producto.id}`, payload, auth)
        // Ajuste manual del stock desde la ficha (si cambió y controla stock)
        if (form.controlaStock && stockNum !== producto.stock) {
          await api.post(`/productos/${producto.id}/ajuste`, { stock: stockNum, motivo: 'Ajuste manual' }, auth)
        }
      } else {
        await api.post('/productos', payload, auth)
      }
      onDone(editing ? 'Producto actualizado' : 'Producto agregado')
    } catch (e) { setError(e?.message || 'No se pudo guardar'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">{editing ? 'Editar producto' : 'Nuevo producto'}</p>
            <p className="text-slate-400 text-xs mt-0.5">Ficha del producto · acá cargás/ajustás su stock a mano</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-3">
          <div><label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre</label><input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Coca Cola 1L" className={`w-full ${inputCls}`} /></div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Categoría</label>
            <select value={form.categoria} onChange={(e) => e.target.value === '__nueva__' ? set('categoria', '__nueva__') : set('categoria', e.target.value)} className={`w-full ${inputCls}`}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              {cats.length > 0 && <option disabled>──────────</option>}
              <option value="__nueva__">➕ Nueva categoría…</option>
            </select>
            {form.categoria === '__nueva__' && (
              <div className="flex gap-2 mt-2">
                <input autoFocus value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crearCategoria()} placeholder="Nombre de la categoría" className={`flex-1 ${inputCls}`} />
                <button onClick={crearCategoria} className="px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold"><Plus size={16} /></button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">Costo</label><input type="number" value={form.costo} onChange={(e) => set('costo', e.target.value)} placeholder="opc." className={`w-full ${inputCls}`} /></div>
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">Precio venta</label><input type="number" value={form.precio} onChange={(e) => set('precio', e.target.value)} placeholder="0" className={`w-full ${inputCls}`} /></div>
            <div><label className="block text-slate-500 text-[11px] font-medium mb-1">% ganancia</label><input type="number" value={calcPct(form.costo, form.precio)} onChange={(e) => set('precio', precioDesdePct(form.costo, e.target.value))} disabled={!(Number(form.costo) > 0)} placeholder={Number(form.costo) > 0 ? '%' : '—'} title={Number(form.costo) > 0 ? 'Markup sobre el costo' : 'Cargá el costo primero'} className={`w-full ${inputCls} disabled:opacity-50`} /></div>
          </div>

          <div className="rounded-xl border border-slate-100 p-3">
            <button onClick={() => set('controlaStock', !form.controlaStock)} className="flex items-center gap-2.5 w-full text-left">
              <div className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${form.controlaStock ? 'bg-brand-500' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.controlaStock ? 'left-4' : 'left-0.5'}`} /></div>
              <span className="text-sm text-slate-700 font-medium">Controlar stock</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5">Si está activo, el sistema <b>cuenta unidades</b>, descuenta en cada venta y te avisa cuando queda poco. Desactivalo para servicios o cosas sin inventario.</p>
            {form.controlaStock && (
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium mb-1">{editing ? 'Stock actual' : 'Stock inicial'}</label>
                  <input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="0" className={`w-full ${inputCls}`} />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium mb-1">Avisar cuando queden ≤</label>
                  <input type="number" value={form.stockMin} onChange={(e) => set('stockMin', e.target.value)} placeholder="ej: 5" className={`w-full ${inputCls}`} />
                </div>
                <p className="col-span-2 text-[10px] text-slate-400">{editing ? 'Editá el stock acá para corregirlo a mano. Las compras lo suman solas.' : 'Poné el stock que ya tenés. Las compras posteriores lo van sumando.'}</p>
              </div>
            )}
          </div>

          {error && <p className="text-rose-500 text-xs">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={submit} disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Categorías: alta / renombrar / borrar (con validación de uso) ────────
const ModalCategorias = ({ categorias, productos, token, onClose, onChange, showToast }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [lista, setLista] = useState(categorias)
  const [nueva, setNueva] = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [error, setError] = useState('')
  const cuenta = (nombre) => productos.filter((p) => (p.categoria || 'Otros') === nombre).length

  const refrescar = async () => { try { setLista(await api.get('/categorias', auth)) } catch { /* */ } onChange?.() }
  const agregar = async () => {
    const nombre = nueva.trim(); if (!nombre) return
    setError('')
    try { await api.post('/categorias', { nombre }, auth); setNueva(''); refrescar() } catch (e) { setError(e?.message || 'No se pudo agregar') }
  }
  const guardarNombre = async (c) => {
    const nombre = editVal.trim(); if (!nombre) return
    setError('')
    try { await api.patch(`/categorias/${c.id}`, { nombre }, auth); setEditId(null); refrescar() } catch (e) { setError(e?.message || 'No se pudo renombrar') }
  }
  const borrar = async (c) => {
    setError('')
    try { await api.delete(`/categorias/${c.id}`, auth); refrescar(); showToast?.('exito', 'Categoría eliminada') }
    catch (e) { setError(e?.message || 'No se pudo borrar') }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-slate-800 font-bold">Categorías</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex gap-2">
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nueva categoría (ej: Cafetería)" className={`flex-1 ${inputCls}`} />
          <button onClick={agregar} disabled={!nueva.trim()} className="px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-40"><Plus size={16} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-3 flex flex-col gap-1.5">
          {error && <p className="text-rose-500 text-xs mb-1">{error}</p>}
          {lista.length === 0 ? <p className="text-slate-400 text-sm py-4 text-center">Sin categorías.</p> : lista.map((c) => {
            const n = cuenta(c.nombre)
            return (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100">
                {editId === c.id ? (
                  <>
                    <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarNombre(c)} className={`flex-1 ${inputCls} py-1.5`} />
                    <button onClick={() => guardarNombre(c)} className="text-emerald-600 text-xs font-semibold px-2">✓</button>
                    <button onClick={() => setEditId(null)} className="text-slate-400 text-xs px-1">✕</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700">{c.nombre}</span>
                    <span className="text-[11px] text-slate-400">{n} prod.</span>
                    <button onClick={() => { setEditId(c.id); setEditVal(c.nombre); setError('') }} className="text-slate-300 hover:text-brand-500 p-1"><Pencil size={13} /></button>
                    <button onClick={() => borrar(c)} title={n > 0 ? 'Tiene productos' : 'Borrar'} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            )
          })}
          <p className="text-[10px] text-slate-400 mt-1">No se puede borrar una categoría con productos. Renombrar actualiza todos sus productos.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Compra: factura de proveedor con productos que reponen stock ─────────
const ModalCompra = ({ productos, metodos, token, onClose, onDone }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [proveedor, setProveedor] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [pagado, setPagado] = useState(true)
  const [metodoPago, setMetodoPago] = useState(metodos[0] ?? 'efectivo')
  const [imagenUrl, setImagenUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [lineas, setLineas] = useState([{ id: 1, nombre: '', cantidad: '1', costoUnit: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addLinea = () => setLineas((l) => [...l, { id: Date.now() + Math.random(), nombre: '', cantidad: '1', costoUnit: '' }])
  const setLinea = (id, k, v) => setLineas((l) => l.map((x) => x.id === id ? { ...x, [k]: v } : x))
  const delLinea = (id) => setLineas((l) => l.filter((x) => x.id !== id))
  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costoUnit) || 0), 0)

  const subirFoto = async (file) => {
    if (!file) return
    setUploading(true)
    try { setImagenUrl(await uploadImage(file, { folder: 'facturas', token })) } catch { setError('No se pudo subir la foto') } finally { setUploading(false) }
  }

  const submit = async () => {
    const validas = lineas.filter((l) => l.nombre.trim() && Number(l.cantidad) > 0)
    if (validas.length === 0) return setError('Agregá al menos un producto')
    if (!(total > 0)) return setError('El total debe ser mayor a 0')
    setError(''); setSaving(true)
    const lineasStock = validas.map((l) => {
      const ex = productos.find((p) => p.nombre.trim().toLowerCase() === l.nombre.trim().toLowerCase())
      return { productoId: ex?.id || null, nombre: l.nombre.trim(), cantidad: Number(l.cantidad), costoUnit: l.costoUnit === '' ? null : Number(l.costoUnit) }
    })
    try {
      await api.post('/gastos', {
        concepto: `Compra mercadería${proveedor.trim() ? ` · ${proveedor.trim()}` : ''}`,
        monto: total, categoria: 'Mercadería', proveedor: proveedor.trim() || null, fecha,
        pagado, metodoPago: pagado ? metodoPago : null, numeroFactura: numeroFactura.trim() || null, imagenUrl: imagenUrl || null,
        lineasStock,
      }, auth)
      onDone()
    } catch (e) { setError(e?.message || 'No se pudo registrar la compra'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">Ingresar compra</p>
            <p className="text-slate-400 text-xs mt-0.5">Factura de proveedor · suma stock y queda como egreso</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          {/* Foto / IA */}
          <div className="rounded-xl border border-dashed border-slate-300 p-3 flex flex-col gap-1.5">
            {imagenUrl ? (
              <div className="flex items-center gap-2"><a href={imagenUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-600 hover:underline"><FileText size={15} /> Ver factura</a><button onClick={() => setImagenUrl('')} className="text-slate-300 hover:text-rose-500"><X size={14} /></button></div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700 w-fit">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} {uploading ? 'Subiendo…' : 'Adjuntar foto de la factura'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
              </label>
            )}
            <p className="text-[10px] text-slate-300">Próximamente: leer la foto con IA y autocompletar productos, cantidades y costos (plan premium).</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-slate-500 text-xs font-medium mb-1.5">Proveedor</label><input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Opcional" className={`w-full ${inputCls}`} /></div>
            <div><label className="block text-slate-500 text-xs font-medium mb-1.5">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`w-full ${inputCls}`} /></div>
          </div>
          <div><label className="block text-slate-500 text-xs font-medium mb-1.5">N° de factura (opcional)</label><input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="0001-00012345" className={`w-full ${inputCls}`} /></div>

          {/* Líneas de productos */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Productos comprados</p>
            <datalist id="prods-compra">{productos.map((p) => <option key={p.id} value={p.nombre} />)}</datalist>
            {lineas.map((l) => (
              <div key={l.id} className="flex gap-1.5">
                <input list="prods-compra" value={l.nombre} onChange={(e) => setLinea(l.id, 'nombre', e.target.value)} placeholder="Producto" className={`flex-1 ${inputCls} py-2`} />
                <input type="number" value={l.cantidad} onChange={(e) => setLinea(l.id, 'cantidad', e.target.value)} placeholder="cant." title="Cantidad" className={`w-16 ${inputCls} py-2`} />
                <input type="number" value={l.costoUnit} onChange={(e) => setLinea(l.id, 'costoUnit', e.target.value)} placeholder="$ c/u" title="Costo unitario" className={`w-20 ${inputCls} py-2`} />
                <button onClick={() => delLinea(l.id)} className="text-slate-300 hover:text-rose-500 px-1"><X size={14} /></button>
              </div>
            ))}
            <button onClick={addLinea} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 w-fit"><Plus size={13} /> Agregar producto</button>
            <p className="text-[10px] text-slate-400">Suma stock, crea los que no existan y actualiza el costo. Los existentes se matchean por nombre.</p>
          </div>

          {/* Estado de pago */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setPagado(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${pagado ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Ya pagado</button>
            <button onClick={() => setPagado(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${!pagado ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>A pagar</button>
          </div>
          {pagado && <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={`w-full ${inputCls}`}>{metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}</select>}

          {error && <p className="text-rose-500 text-xs">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center gap-3">
          <div className="flex-1"><p className="text-xs text-slate-400">Total</p><p className="text-lg font-bold text-slate-800">{money(total)}</p></div>
          <button onClick={submit} disabled={saving || uploading || total <= 0} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Guardando…' : 'Registrar compra'}</button>
        </div>
      </div>
    </div>
  )
}

export default StockTab
