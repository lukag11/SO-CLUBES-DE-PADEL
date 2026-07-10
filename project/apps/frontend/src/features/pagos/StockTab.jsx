import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Package, AlertTriangle, Boxes, History, Truck, Tags, Percent, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { useConfirm } from '../../components/ui/ConfirmProvider'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const calcPct = (costo, precio) => (Number(costo) > 0 && precio !== '' && precio != null) ? Math.round((Number(precio) - Number(costo)) / Number(costo) * 100) : ''
const precioDesdePct = (costo, pct) => (Number(costo) > 0 && pct !== '') ? String(Math.round(Number(costo) * (1 + Number(pct) / 100))) : ''
const MOVTIPO = { entrada: { t: 'Entrada', c: 'text-emerald-600' }, salida: { t: 'Salida', c: 'text-rose-600' }, ajuste: { t: 'Ajuste', c: 'text-amber-600' } }

// Par etiquetado (ETIQUETA + valor) para la ficha del producto — legible y prolijo.
const Stat = ({ label, value, tone = 'slate' }) => (
  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
    <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">{label}</span>
    <span className={`text-xs font-semibold ${tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-500' : 'text-slate-600'}`}>{value}</span>
  </span>
)
const fmtFecha = (s) => { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

// Chip toggle para filtrar por estado de stock. Activo = relleno; inactivo = contorno.
const ChipEstado = ({ activo, tone, onClick, children }) => {
  const tones = {
    amber: activo ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    rose: activo ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
  }
  return <button onClick={onClick} className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${tones[tone]}`}>{children}</button>
}

const StockTab = ({ token, metodos = ['efectivo'], showToast, onIrAGastos }) => {
  const confirmar = useConfirm()
  const auth = { Authorization: `Bearer ${token}` }
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([]) // [{id, nombre}]
  const [catsOpen, setCatsOpen] = useState(false)
  const [prodModal, setProdModal] = useState(null) // null | { producto } (producto null = nuevo)
  const [ajusteOpen, setAjusteOpen] = useState(false) // ajuste masivo de precios por categoría
  const [movsOpen, setMovsOpen] = useState(null) // productoId
  const [movs, setMovs] = useState([])
  const [q, setQ] = useState('')
  const [filtroCat, setFiltroCat] = useState('')       // '' = todas las categorías
  const [filtroEstado, setFiltroEstado] = useState('') // '' | 'reponer' | 'sin' | 'sobreventa'
  const [colapsadas, setColapsadas] = useState(() => new Set()) // categorías plegadas
  const toggleCat = (cat) => setColapsadas((s) => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n })

  const fetchData = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.get('/productos', auth), api.get('/categorias', auth)])
      setProductos(Array.isArray(p) ? p : [])
      setCategorias(Array.isArray(c) ? c : [])
    } catch { /* */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [fetchData])
  const catNames = categorias.map((c) => c.nombre)

  // Estado inicial: todas las categorías plegadas (ahorra espacio). Se corre una sola vez, cuando llegan.
  const [iniColapsado, setIniColapsado] = useState(false)
  useEffect(() => {
    if (!iniColapsado && categorias.length > 0) { setColapsadas(new Set([...catNames, 'Sin categoría'])); setIniColapsado(true) }
  }, [categorias, iniColapsado]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Predicados de estado de stock (lentes accionables para el dueño).
  const esReponer = (p) => p.controlaStock && p.stock <= (p.stockMin || 0)   // bajo stock (incluye 0 y negativo)
  const esSinStock = (p) => p.controlaStock && p.stock === 0
  const esSobreventa = (p) => p.controlaStock && p.stock < 0                  // vendido sin cargar
  const nReponer = conStock.filter(esReponer).length
  const nSin = conStock.filter(esSinStock).length
  const nSobre = conStock.filter(esSobreventa).length
  const ESTADO_FN = { reponer: esReponer, sin: esSinStock, sobreventa: esSobreventa }

  const term = q.trim().toLowerCase()
  const filtrados = productos.filter((p) => {
    if (term && !`${p.nombre} ${p.categoria ?? ''}`.toLowerCase().includes(term)) return false
    if (filtroCat && (p.categoria || 'Otros') !== filtroCat) return false
    if (filtroEstado && !ESTADO_FN[filtroEstado]?.(p)) return false
    return true
  })
  const grupos = catNames.map((cat) => ({ cat, items: filtrados.filter((p) => (p.categoria || 'Otros') === cat) })).filter((g) => g.items.length > 0)
  const otras = filtrados.filter((p) => !catNames.includes(p.categoria || 'Otros'))
  if (otras.length) grupos.push({ cat: 'Sin categoría', items: otras })
  const hayFiltro = term || filtroCat || filtroEstado

  const estadoBadge = (p) => {
    if (!p.controlaStock) return null
    // stock < 0 = sobreventa (vendiste sin cargar): se muestra el número real, no "Sin stock", para que el dueño sepa cuánto debe reponer.
    const neg = p.stock < 0
    const cls = neg ? 'text-rose-700 bg-rose-100 ring-1 ring-rose-300' : p.stock === 0 ? 'text-rose-600 bg-rose-50' : p.stock <= (p.stockMin || 0) ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
    const titulo = neg ? `Vendiste ${Math.abs(p.stock)} sin stock cargado · ajustá o cargá reposición` : 'Ver / ajustar stock'
    return <button onClick={() => editar(p)} title={titulo} className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${cls}`}>{neg ? `${p.stock} u.` : p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}</button>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-brand-500/10 rounded-xl p-3 shrink-0"><Boxes size={20} className="text-brand-600" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Invertido en stock</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{money(valorInventario)}</p><p className="text-xs text-slate-400 mt-0.5">plata en mercadería (al costo) · {conStock.length} productos</p></div>
        </div>
        <button type="button" onClick={() => bajoStock.length && setFiltroEstado((s) => s === 'reponer' ? '' : 'reponer')} disabled={!bajoStock.length} title={bajoStock.length ? 'Ver solo los productos a reponer' : ''} className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-colors ${bajoStock.length ? 'hover:bg-amber-50 cursor-pointer' : 'cursor-default'} ${filtroEstado === 'reponer' ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-100'}`}>
          <div className="bg-amber-500/10 rounded-xl p-3 shrink-0"><AlertTriangle size={20} className="text-amber-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Bajo stock</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{bajoStock.length}</p><p className="text-xs text-slate-400 mt-0.5">productos a reponer{bajoStock.length ? ' · tocá para filtrar' : ''}</p></div>
        </button>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="bg-slate-500/10 rounded-xl p-3 shrink-0"><Package size={20} className="text-slate-500" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Productos</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{productos.length}</p></div>
        </div>
      </div>

      {/* Alerta bajo stock (clickeable → filtra "A reponer") */}
      {bajoStock.length > 0 && (
        <button type="button" onClick={() => setFiltroEstado((s) => s === 'reponer' ? '' : 'reponer')} className={`w-full text-left flex items-start gap-2.5 rounded-2xl border bg-amber-50 hover:bg-amber-100 transition-colors px-4 py-3 ${filtroEstado === 'reponer' ? 'border-amber-400 ring-1 ring-amber-300' : 'border-amber-200'}`}>
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm"><p className="text-amber-800 font-medium">A reponer ({bajoStock.length})</p><p className="text-amber-700 text-xs mt-0.5">{bajoStock.map((p) => `${p.nombre} (${p.stock})`).join(' · ')}</p></div>
        </button>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className={`flex-1 min-w-[180px] ${inputCls}`} />
        <button onClick={() => setCatsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><Tags size={16} /> Categorías</button>
        <button onClick={() => setAjusteOpen(true)} disabled={productos.length === 0} title="Subir/bajar un % a todos los productos de una categoría (inflación)" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm disabled:opacity-40"><Percent size={16} /> Ajuste masivo</button>
        <button onClick={() => onIrAGastos?.()} title="Las compras se cargan en Gastos (con IA) y suman el stock" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><Truck size={16} /> Ingresar compra</button>
        <button onClick={() => setProdModal({ producto: null })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-sm"><Plus size={16} /> Nuevo producto</button>
      </div>

      {/* Barra de filtros: categoría (escala a muchas) + estado de stock (accionable) */}
      {productos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className={`${inputCls} py-2 text-sm ${filtroCat ? 'border-brand-400 text-brand-700 font-semibold' : ''}`}>
            <option value="">Todas las categorías</option>
            {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {nReponer > 0 && <ChipEstado activo={filtroEstado === 'reponer'} tone="amber" onClick={() => setFiltroEstado((s) => s === 'reponer' ? '' : 'reponer')}>A reponer {nReponer}</ChipEstado>}
          {nSin > 0 && <ChipEstado activo={filtroEstado === 'sin'} tone="rose" onClick={() => setFiltroEstado((s) => s === 'sin' ? '' : 'sin')}>Sin stock {nSin}</ChipEstado>}
          {nSobre > 0 && <ChipEstado activo={filtroEstado === 'sobreventa'} tone="rose" onClick={() => setFiltroEstado((s) => s === 'sobreventa' ? '' : 'sobreventa')}>Sobreventa {nSobre}</ChipEstado>}
          {hayFiltro && <button onClick={() => { setQ(''); setFiltroCat(''); setFiltroEstado('') }} className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 flex items-center gap-1"><X size={13} /> Limpiar</button>}
        </div>
      )}

      {/* Lista de inventario */}
      <div className="flex flex-col gap-3">
        {productos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Todavía no cargaste productos.</div>
        ) : grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">No hay productos con esos filtros.</div>
        ) : grupos.map(({ cat, items }) => {
          const invCat = items.reduce((s, p) => s + (p.controlaStock ? (p.costo || 0) * p.stock : 0), 0)
          const colapsada = colapsadas.has(cat) && !hayFiltro // con búsqueda/filtro activo, forzar expandido
          return (
          <div key={cat} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            {/* Encabezado de categoría (clickeable: colapsa/expande) */}
            <button type="button" onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors text-left">
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${colapsada ? '-rotate-90' : ''}`} />
                <span className="w-1 h-4 rounded-full bg-brand-400 shrink-0" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate">{cat}</p>
                <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">{items.length}</span>
              </div>
              {invCat > 0 && <span className="text-[11px] text-slate-400 shrink-0">invertido <b className="text-slate-600">{money(invCat)}</b></span>}
            </button>
            {/* Filas con efecto cebra */}
            {!colapsada && items.map((p, idx) => (
              <div key={p.id}>
                <div className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-brand-50/50`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.nombre}{!p.activo && <span className="text-[10px] text-slate-400 ml-1">(inactivo)</span>}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <Stat label="Precio" value={money(p.precio)} />
                      {p.costo != null && <Stat label="Costo" value={money(p.costo)} />}
                      {p.costo != null && <Stat label="Margen" value={`${money(p.precio - p.costo)}${p.costo > 0 ? ` · ${calcPct(p.costo, p.precio)}%` : ''}`} tone={p.precio - p.costo > 0 ? 'emerald' : p.precio - p.costo < 0 ? 'rose' : 'slate'} />}
                      {p.controlaStock && <Stat label="Invertido" value={money((p.costo || 0) * p.stock)} />}
                    </div>
                  </div>
                  {estadoBadge(p)}
                  {p.controlaStock && <button onClick={() => verMovs(p)} title="Movimientos" className={`p-1 ${movsOpen === p.id ? 'text-brand-500' : 'text-slate-300 hover:text-brand-500'}`}><History size={14} /></button>}
                  <button onClick={() => editar(p)} title="Editar" className="text-slate-300 hover:text-brand-500 p-1"><Pencil size={14} /></button>
                  <button onClick={() => eliminar(p)} title="Eliminar" className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                </div>
                {movsOpen === p.id && (
                  <div className="mx-3 mb-2 rounded-xl border border-slate-100 bg-slate-50/80 divide-y divide-slate-100">
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
        )})}
      </div>

      {prodModal && <ModalProducto producto={prodModal.producto} categorias={catNames} token={token} onClose={() => setProdModal(null)} onDone={(msg) => { setProdModal(null); fetchData(); showToast?.('exito', msg) }} />}
      {catsOpen && <ModalCategorias categorias={categorias} productos={productos} token={token} onClose={() => setCatsOpen(false)} onChange={fetchData} showToast={showToast} />}
      {ajusteOpen && <ModalAjusteMasivo categorias={catNames} productos={productos} token={token} onClose={() => setAjusteOpen(false)} onDone={(msg) => { setAjusteOpen(false); fetchData(); showToast?.('exito', msg) }} showToast={showToast} />}
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

// ─── Modal Ajuste Masivo: sube/baja un % a todos los productos de una categoría ──
const red10 = (n) => Math.round(n / 10) * 10 // redondeo a $10 (números prolijos de mostrador)
const ModalAjusteMasivo = ({ categorias = [], productos = [], token, onClose, onDone, showToast }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [categoria, setCategoria] = useState(categorias[0] ?? '')
  const [campo, setCampo] = useState('precio') // precio | costo | ambos
  const [pct, setPct] = useState('')
  const [saving, setSaving] = useState(false)

  const pctNum = Number(pct)
  const pctOk = Number.isFinite(pctNum) && pctNum !== 0
  const campoPreview = campo === 'costo' ? 'costo' : 'precio' // qué columna mostramos en el preview
  const items = productos.filter((p) => p.activo && (p.categoria || '') === categoria)
  const nuevoValor = (base, esPrecio) => {
    if (base == null) return null
    const n = red10(base * (1 + pctNum / 100))
    return Math.max(esPrecio ? 1 : 0, n)
  }
  const preview = items.map((p) => {
    const base = campoPreview === 'costo' ? p.costo : p.precio
    return { nombre: p.nombre, base, nuevo: nuevoValor(base, campoPreview === 'precio') }
  }).filter((x) => x.base != null)

  const puede = categoria && pctOk && items.length > 0
  const signo = pctNum > 0 ? '+' : ''

  const aplicar = async () => {
    if (saving || !puede) return
    setSaving(true)
    try {
      const r = await api.post('/productos/ajuste-masivo', { categoria, porcentaje: pctNum, campo, redondeo: 10 }, auth)
      onDone(`${signo}${pctNum}% aplicado a ${r.actualizados} producto${r.actualizados === 1 ? '' : 's'} de ${categoria}`)
    } catch (e) { showToast?.('error', e?.message || 'No se pudo aplicar el ajuste'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">Ajuste masivo de precios</p>
            <p className="text-slate-400 text-xs mt-0.5">Subí o bajá un % a toda una categoría de una vez</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`w-full ${inputCls}`}>
              {categorias.length === 0 && <option value="">Sin categorías</option>}
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">¿Qué ajusto?</label>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {[['precio', 'Precio venta'], ['costo', 'Costo'], ['ambos', 'Ambos']].map(([id, label]) => (
                <button key={id} onClick={() => setCampo(id)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${campo === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Porcentaje (usá negativo para bajar)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="ej: 10" className={`flex-1 ${inputCls}`} />
              <span className="text-slate-400 text-sm font-semibold">%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">El precio nuevo se redondea a $10.</p>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            {!categoria ? (
              <p className="text-slate-400 text-sm">Elegí una categoría.</p>
            ) : items.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay productos activos en {categoria}.</p>
            ) : !pctOk ? (
              <p className="text-slate-400 text-sm">{items.length} producto{items.length === 1 ? '' : 's'} en {categoria}. Poné un % para ver el impacto.</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-600 mb-2">{preview.length} producto{preview.length === 1 ? '' : 's'} · {campoPreview === 'costo' ? 'costo' : 'precio'} {signo}{pctNum}%</p>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                  {preview.slice(0, 8).map((x, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-slate-600 truncate">{x.nombre}</span>
                      <span className="text-slate-400 line-through">{money(x.base)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-semibold text-slate-700">{money(x.nuevo)}</span>
                    </div>
                  ))}
                  {preview.length > 8 && <p className="text-[11px] text-slate-400 mt-0.5">y {preview.length - 8} más…</p>}
                </div>
                {campo === 'costo' && <p className="text-[10px] text-slate-400 mt-2">Solo se tocan productos que tienen costo cargado.</p>}
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={aplicar} disabled={!puede || saving} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-40">
            {saving ? 'Aplicando…' : puede ? `Aplicar ${signo}${pctNum}% a ${categoria}` : 'Aplicar ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StockTab
