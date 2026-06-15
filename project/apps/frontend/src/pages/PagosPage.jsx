import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DollarSign, AlertTriangle, TrendingUp, Search, Plus, X,
  CheckCircle, Trash2, Clock, Settings, Check, Package, Pencil, Minus, Printer, Download, FileText, Wallet, RotateCcw, ShoppingCart,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'
import Toast from '../components/ui/Toast'
import { METODOS_CATALOGO, METODO_MAP, metodosDelClub, MetodoBadge } from '../lib/metodosPago'
import GastosTab from '../features/pagos/GastosTab'
import VentasTab from '../features/pagos/VentasTab'
import CajaTab from '../features/pagos/CajaTab'
import { imprimirRecibo, exportarCobranzasCSV, generarReporteCobranzas } from '../features/pagos/comprobantes'
import AyudaPanel, { AyudaSeccion } from '../components/ui/AyudaPanel'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const TIPO_LABEL = {
  cancelacion: 'Cancelación',
  manual: 'Manual',
  reserva: 'Turno',
  torneo: 'Torneo',
  producto: 'Producto',
}

const FILTROS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'vencido', label: 'Vencidos' },
  { id: 'pagado', label: 'Pagados' },
  { id: 'todos', label: 'Todos' },
]

const TIPOS_FILTRO = [
  { id: 'todos', label: 'Todos los tipos' },
  { id: 'reserva', label: 'Turnos' },
  { id: 'cancelacion', label: 'Cancelaciones' },
  { id: 'manual', label: 'Manuales' },
  { id: 'torneo', label: 'Torneos' },
  { id: 'producto', label: 'Productos' },
]

// ── Tarjeta de total ──────────────────────────────────────────────────────────
const TotalCard = ({ label, value, sub, icon: Icon, color, bg }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
    <div className={`${bg} rounded-xl p-3 shrink-0`}>
      <Icon size={20} className={color} />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

// ── Modal: registrar cobro (elegir método entre los habilitados) ─────────────
const ModalCobro = ({ cargo, metodos, onConfirm, onClose, saving, titulo = 'Registrar cobro' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-slate-800 font-bold">{titulo}</p>
          <p className="text-slate-400 text-xs mt-0.5">{cargo.concepto} · {money(cargo.monto)}</p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
      </div>
      <div className="p-6 flex flex-col gap-2.5">
        <p className="text-slate-500 text-xs font-medium mb-1">¿Cómo se cobró?</p>
        {metodos.map((id) => {
          const m = METODO_MAP[id]
          if (!m) return null
          const Icon = m.icon
          return (
            <button
              key={id} disabled={saving} onClick={() => onConfirm(id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left disabled:opacity-50"
            >
              <Icon size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{m.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  </div>
)

// ── Modal: configurar métodos de cobro que acepta el club ────────────────────
const ModalMetodos = ({ seleccion, onSave, onClose, saving }) => {
  const [sel, setSel] = useState(seleccion)
  const [error, setError] = useState('')
  const toggle = (id) => {
    setError('')
    setSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const guardar = () => {
    if (sel.length === 0) return setError('Elegí al menos un método')
    onSave(sel)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-800 font-bold">Métodos de cobro</p>
            <p className="text-slate-400 text-xs mt-0.5">Elegí los que acepta tu club</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-2">
          {METODOS_CATALOGO.map(({ id, label, icon: Icon, desc }) => {
            const activo = sel.includes(id)
            return (
              <button
                key={id} onClick={() => toggle(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activo ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <Icon size={18} className={activo ? 'text-brand-600' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${activo ? 'bg-brand-500' : 'border border-slate-300'}`}>
                  {activo && <Check size={13} className="text-white" />}
                </div>
              </button>
            )
          })}
          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={guardar} disabled={saving} className="mt-2 w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: confirmar eliminación ──────────────────────────────────────────────
const ModalEliminar = ({ cargo, onConfirm, onClose, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-rose-500" />
          </div>
          <div>
            <p className="text-slate-800 font-bold">{cargo.origen === 'reserva' ? 'Quitar de cobranzas' : 'Eliminar deuda'}</p>
            <p className="text-slate-400 text-xs mt-0.5">{cargo.concepto} · {money(cargo.monto)}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          {cargo.origen === 'reserva'
            ? <>Este turno de <span className="font-semibold text-slate-700">{cargo.jugador?.nombre} {cargo.jugador?.apellido}</span> deja de figurar como deuda. La reserva queda en el historial pero no se cobra.</>
            : <>Se borra esta deuda de <span className="font-semibold text-slate-700">{cargo.jugador?.nombre} {cargo.jugador?.apellido}</span> como si nunca se hubiera cargado. No se puede deshacer.</>}
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : (cargo.origen === 'reserva' ? 'Sí, quitar' : 'Sí, eliminar')}
          </button>
        </div>
      </div>
    </div>
  </div>
)

// ── Modal: confirmar anulación de un cobro (corrección del momento) ───────────
const ModalAnular = ({ cargo, onConfirm, onClose, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <RotateCcw size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-slate-800 font-bold">Anular cobro</p>
            <p className="text-slate-400 text-xs mt-0.5">{cargo.concepto} · {money(cargo.monto)}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          Este cobro vuelve a <span className="font-semibold text-slate-700">pendiente</span> y <span className="font-semibold text-slate-700">sale de la caja del día</span>. Usalo para corregir un cobro recién hecho por error.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Anulando…' : 'Sí, anular'}
          </button>
        </div>
      </div>
    </div>
  </div>
)

// Categorías sugeridas para el bar/tienda (para reportes por rubro)
const CATEGORIAS_PRODUCTO = ['Bebidas', 'Comidas', 'Golosinas', 'Insumos', 'Otros']

// Pricing: % de ganancia = markup sobre el costo. Bidireccional con el precio de venta.
const calcPct = (costo, precio) => (Number(costo) > 0 && precio !== '' && precio != null) ? Math.round((Number(precio) - Number(costo)) / Number(costo) * 100) : ''
const precioDesdePct = (costo, pct) => (Number(costo) > 0 && pct !== '') ? String(Math.round(Number(costo) * (1 + Number(pct) / 100))) : ''

// ── Modal: catálogo de productos (ABM) ───────────────────────────────────────
const ModalCatalogoProductos = ({ productos, onCreate, onUpdate, onDelete, onAjuste, onClose, saving }) => {
  // Form único: alta (editId null) o edición (editId set). El lápiz carga el producto acá arriba.
  const [form, setForm] = useState({ nombre: '', precio: '', costo: '', categoria: 'Bebidas', controlaStock: false, stock: '', stockMin: '' })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  const resetForm = () => { setForm((f) => ({ nombre: '', precio: '', costo: '', categoria: f.categoria, controlaStock: false, stock: '', stockMin: '' })); setEditId(null); setError('') }
  const guardar = () => {
    if (!form.nombre.trim()) return setError('Ingresá un nombre')
    if (!(Number(form.precio) > 0)) return setError('El precio debe ser mayor a 0')
    setError('')
    const payload = {
      nombre: form.nombre.trim(), precio: Number(form.precio), costo: form.costo === '' ? null : Number(form.costo), categoria: form.categoria || null,
      controlaStock: form.controlaStock, stockMin: form.stockMin === '' ? 0 : Number(form.stockMin),
      ...(editId ? {} : { stock: form.stock === '' ? 0 : Number(form.stock) }), // stock inicial solo en alta
    }
    if (editId) onUpdate(editId, payload); else onCreate(payload)
    resetForm()
  }
  const empezarEdit = (p) => { setEditId(p.id); setError(''); setForm({ nombre: p.nombre, precio: String(p.precio), costo: p.costo != null ? String(p.costo) : '', categoria: p.categoria ?? 'Otros', controlaStock: !!p.controlaStock, stock: '', stockMin: p.stockMin ? String(p.stockMin) : '' }) }
  // Agrupar productos por categoría para la lista
  const grupos = CATEGORIAS_PRODUCTO
    .map((cat) => ({ cat, items: productos.filter((p) => (p.categoria || 'Otros') === cat) }))
    .filter((g) => g.items.length > 0)
  const sinCat = productos.filter((p) => p.categoria && !CATEGORIAS_PRODUCTO.includes(p.categoria))
  if (sinCat.length) grupos.push({ cat: 'Otras', items: sinCat })

  const inputCls = 'bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">Catálogo de productos</p>
            <p className="text-slate-400 text-xs mt-0.5">Tubo de pelotas, grip, bebidas… lo que vende tu club</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        {/* Form alta/edición */}
        <div className={`px-6 py-4 border-b border-slate-100 shrink-0 flex flex-col gap-2.5 ${editId ? 'bg-brand-50/40' : ''}`}>
          {editId && <p className="text-[11px] font-semibold text-brand-600 -mb-0.5">Editando producto</p>}
          <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre (ej: Coca Cola 1L)" className={`w-full ${inputCls}`} />
          <div>
            <label className="block text-slate-500 text-[11px] font-medium mb-1">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className={`w-full ${inputCls}`}>
              {CATEGORIAS_PRODUCTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">Costo</label>
              <input type="number" value={form.costo} onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))} placeholder="opc." className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">Precio venta</label>
              <input type="number" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} placeholder="0" className={`w-full ${inputCls}`} />
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-1">% ganancia</label>
              <input type="number" value={calcPct(form.costo, form.precio)} onChange={(e) => setForm((f) => ({ ...f, precio: precioDesdePct(f.costo, e.target.value) }))} disabled={!(Number(form.costo) > 0)} placeholder={Number(form.costo) > 0 ? '%' : '—'} title={Number(form.costo) > 0 ? 'Markup sobre el costo' : 'Cargá el costo primero'} className={`w-full ${inputCls} disabled:opacity-50`} />
            </div>
          </div>
          {/* Control de stock (opt-in) */}
          <div className="rounded-xl border border-slate-100 p-2.5">
            <button onClick={() => setForm((f) => ({ ...f, controlaStock: !f.controlaStock }))} className="flex items-center gap-2 w-full text-left">
              <div className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${form.controlaStock ? 'bg-brand-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.controlaStock ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-slate-700 font-medium">Controlar stock</span>
            </button>
            {form.controlaStock && (
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                {!editId && (
                  <div>
                    <label className="block text-slate-500 text-[11px] font-medium mb-1">Stock inicial</label>
                    <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" className={`w-full ${inputCls}`} />
                  </div>
                )}
                <div className={editId ? 'col-span-2' : ''}>
                  <label className="block text-slate-500 text-[11px] font-medium mb-1">Avisar cuando queden ≤</label>
                  <input type="number" value={form.stockMin} onChange={(e) => setForm((f) => ({ ...f, stockMin: e.target.value }))} placeholder="ej: 5" className={`w-full ${inputCls}`} />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {editId && <button onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>}
            <button onClick={guardar} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {editId ? 'Guardar cambios' : <><Plus size={16} /> Agregar producto</>}
            </button>
          </div>
          {!editId && <p className="text-[10px] text-slate-400">El <b>costo</b> es opcional; con él se calcula el <b>% de ganancia</b> y el margen en los reportes.</p>}
          {error && <p className="text-rose-500 text-xs">{error}</p>}
        </div>

        {/* Lista agrupada por categoría */}
        <div className="overflow-y-auto px-6 py-3 flex flex-col gap-3">
          {productos.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Todavía no cargaste productos.</p>
          ) : grupos.map(({ cat, items }) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{cat} <span className="font-normal">· {items.length}</span></p>
              {items.map((p) => (
                <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${editId === p.id ? 'border-brand-300 bg-brand-50/40' : p.activo ? 'border-slate-100' : 'border-slate-100 bg-slate-50/60 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.nombre}</p>
                    {p.costo != null && <span className="text-[10px] text-slate-400">costo {money(p.costo)} · margen {money(p.precio - p.costo)}{p.costo > 0 ? ` (${calcPct(p.costo, p.precio)}%)` : ''}</span>}
                  </div>
                  {p.controlaStock && (
                    <button
                      onClick={() => { const v = window.prompt(`Stock de "${p.nombre}" (unidades reales):`, String(p.stock)); if (v !== null && v.trim() !== '' && !isNaN(Number(v))) onAjuste(p.id, Math.max(0, Math.round(Number(v)))) }}
                      title="Ajustar stock"
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 ${p.stock <= 0 ? 'text-rose-600 bg-rose-50' : p.stock <= (p.stockMin || 0) ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'}`}
                    >
                      {p.stock <= 0 ? 'Sin stock' : `Stock ${p.stock}`}
                    </button>
                  )}
                  <p className="text-sm font-semibold text-slate-700 shrink-0">{money(p.precio)}</p>
                  <button onClick={() => onUpdate(p.id, { activo: !p.activo })} title={p.activo ? 'Desactivar' : 'Activar'} className={`text-[10px] font-medium px-2 py-1 rounded-lg shrink-0 ${p.activo ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => empezarEdit(p)} title="Editar" className="text-slate-300 hover:text-brand-500 p-1 shrink-0"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(p.id)} title="Eliminar" className="text-slate-300 hover:text-rose-500 p-1 shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal: CUENTA DE JUGADOR (unificado) — ver lo que debe + cobrar + agregar consumos/cargos ──
// Avatar con iniciales y color derivado del nombre (consistente por jugador)
const AvatarJ = ({ nombre = '', apellido = '' }) => {
  const ini = `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
  const hue = [...`${nombre}${apellido}`].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 55% 35%)` }}>
      {ini || '?'}
    </div>
  )
}

// Buscador de jugador. Modo cobro (deudores != null): muestra de entrada la lista de
// deudores con avatar + total adeudado, buscable. Modo venta: autocompleta sobre todos.
const JugadorPicker = ({ jugadores, deudores = null, value, onChange, placeholder }) => {
  const [q, setQ] = useState('')
  const esCobro = deudores !== null
  const sel = (deudores ?? jugadores).find((j) => j.id === value) || jugadores.find((j) => j.id === value)
  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

  if (sel) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50/50">
        <AvatarJ nombre={sel.nombre} apellido={sel.apellido} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{sel.nombre} {sel.apellido}</p>
          <p className="text-[11px] text-slate-400">DNI {sel.dni}{sel.total ? ` · debe ${money(sel.total)}` : ''}</p>
        </div>
        <button onClick={() => { onChange(''); setQ('') }} className="text-xs text-slate-400 hover:text-rose-500 font-medium shrink-0">Cambiar</button>
      </div>
    )
  }

  const term = q.trim().toLowerCase()
  const matches = (j) => `${j.nombre} ${j.apellido} ${j.dni ?? ''}`.toLowerCase().includes(term)
  // Cobro: mostrar deudores de entrada (sin tipear). Venta: solo al tipear.
  const lista = esCobro
    ? (term ? deudores.filter(matches) : deudores)
    : (term ? jugadores.filter(matches).slice(0, 8) : [])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? (esCobro ? 'Buscar deudor por nombre o DNI…' : 'Buscar jugador por nombre o DNI…')} className={inputCls} autoFocus />
      </div>
      {esCobro && deudores.length === 0 ? (
        <p className="text-sm text-slate-400 bg-emerald-50/50 rounded-xl px-3 py-2.5">Nadie tiene deudas pendientes 🎉</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {lista.length === 0
            ? <p className="px-1 py-2 text-xs text-slate-400">{term ? 'Sin resultados' : 'Escribí para buscar…'}</p>
            : lista.map((j) => (
              <button key={j.id} onClick={() => { onChange(j.id); setQ('') }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors">
                <AvatarJ nombre={j.nombre} apellido={j.apellido} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</p>
                  <p className="text-[11px] text-slate-400">DNI {j.dni}{j.count ? ` · ${j.count} deuda${j.count !== 1 ? 's' : ''}` : ''}</p>
                </div>
                {j.total ? <span className="text-sm font-bold text-amber-600 shrink-0">{money(j.total)}</span> : null}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// modo: 'venta' (vender productos a jugador/mostrador) | 'cobro' (cobrar deudas de un jugador)
const ModalCuentaJugador = ({ jugadores, deudores = [], productos, metodos, token, onClose, onRefresh, showToast, modo = 'cobro', initialMostrador = false }) => {
  const esVenta = modo === 'venta'
  const esCobro = modo === 'cobro'
  const [jugadorId, setJugadorId] = useState('')
  const [mostrador, setMostrador] = useState(esVenta && initialMostrador) // venta a visitante sin ficha (contado)
  const [deudas, setDeudas] = useState([])
  const [selDeuda, setSelDeuda] = useState({})
  const [loadingDeudas, setLoadingDeudas] = useState(false)
  const [lineas, setLineas] = useState([])      // nuevos consumos: [{ id, tipo, nombre, precio, cantidad }]
  const [sel, setSel] = useState('')             // valor del desplegable: productId | '__otro__' | ''
  const [otroConcepto, setOtroConcepto] = useState('')
  const [otroPrecio, setOtroPrecio] = useState('')
  const [metodoPago, setMetodoPago] = useState(metodos[0] ?? 'efectivo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const auth = { Authorization: `Bearer ${token}` }
  const activos = productos.filter((p) => p.activo)

  const fetchDeudas = async (jid) => {
    if (!jid) { setDeudas([]); setSelDeuda({}); return }
    setLoadingDeudas(true)
    try {
      const data = await api.get(`/cargos/cobranzas?jugadorId=${jid}`, auth)
      const pend = (data?.deudas ?? []).filter((d) => d.estado === 'pendiente')
      setDeudas(pend)
      setSelDeuda(Object.fromEntries(pend.map((d) => [d.id, true])))
    } catch { setDeudas([]) } finally { setLoadingDeudas(false) }
  }
  useEffect(() => { if (esCobro) fetchDeudas(jugadorId) }, [jugadorId, esCobro]) // eslint-disable-line react-hooks/exhaustive-deps

  const agregarLinea = () => {
    if (sel === '__otro__') {
      if (!otroConcepto.trim() || !(Number(otroPrecio) > 0)) return setError('Completá concepto y monto')
      setLineas((p) => [...p, { id: `o-${Date.now()}`, tipo: 'otro', nombre: otroConcepto.trim(), precio: Number(otroPrecio), cantidad: 1 }])
      setOtroConcepto(''); setOtroPrecio(''); setSel(''); setError('')
      return
    }
    const prod = activos.find((x) => x.id === sel)
    if (!prod) return
    setLineas((p) => {
      const ex = p.find((l) => l.tipo === 'producto' && l.id === prod.id)
      if (ex) return p.map((l) => l === ex ? { ...l, cantidad: l.cantidad + 1 } : l)
      return [...p, { id: prod.id, tipo: 'producto', nombre: prod.nombre, precio: prod.precio, cantidad: 1 }]
    })
    setSel('')
  }
  const cambiarCant = (id, d) => setLineas((p) => p.map((l) => l.id === id ? { ...l, cantidad: Math.max(1, l.cantidad + d) } : l))
  const quitarLinea = (id) => setLineas((p) => p.filter((l) => l.id !== id))

  const totalNuevo = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const deudaSel = deudas.filter((d) => selDeuda[d.id])
  const totalDeudaSel = deudaSel.reduce((s, d) => s + d.monto, 0)
  const totalCobrar = totalNuevo + totalDeudaSel

  // Crea las líneas nuevas (productos → venta; otros → cargo), pagadas o a cuenta
  const crearNuevas = async (cobrar) => {
    const jid = mostrador ? null : jugadorId   // mostrador = venta sin ficha
    const items = lineas.filter((l) => l.tipo === 'producto').map((l) => ({ nombre: l.nombre, precio: l.precio, cantidad: l.cantidad, productoId: l.id }))
    const otros = lineas.filter((l) => l.tipo === 'otro')
    if (items.length) await api.post('/productos/venta', { jugadorId: jid, items, cobrar, metodoPago }, auth)
    for (const o of otros) {
      await api.post('/cargos', { jugadorId: jid, concepto: o.cantidad > 1 ? `${o.cantidad}× ${o.nombre}` : o.nombre, monto: o.precio * o.cantidad, cobrar, metodoPago }, auth)
    }
  }

  const anotarACuenta = async () => {
    if (lineas.length === 0) return setError('Agregá al menos un consumo')
    setSaving(true); setError('')
    try {
      await crearNuevas(false)
      setLineas([]); showToast('exito', 'Anotado a la cuenta'); await fetchDeudas(jugadorId); onRefresh()
    } catch (e) { showToast('error', e?.message || 'No se pudo anotar') } finally { setSaving(false) }
  }
  const cobrarTodo = async () => {
    if (lineas.length === 0 && deudaSel.length === 0) return setError('Agregá un consumo o seleccioná una deuda')
    setSaving(true); setError('')
    try {
      if (lineas.length) await crearNuevas(true)
      if (deudaSel.length) await api.post('/cargos/cobrar-cuenta', { jugadorId, items: deudaSel.map((d) => ({ origen: d.origen, refId: d.refId })), metodoPago }, auth)
      setLineas([]); showToast('exito', 'Cobro registrado'); await fetchDeudas(jugadorId); onRefresh()
    } catch (e) { showToast('error', e?.message || 'No se pudo cobrar') } finally { setSaving(false) }
  }

  const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-slate-800 font-bold">{esCobro ? 'Cobrar cuenta' : mostrador ? 'Venta de mostrador' : 'Nueva venta'}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6 flex flex-col gap-5">
          {/* ¿A quién? En venta: toggle Jugador/Mostrador. En cobro: siempre un jugador. */}
          <div>
            {esVenta && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-2">
                <button onClick={() => setMostrador(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${!mostrador ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Jugador</button>
                <button onClick={() => { setMostrador(true); setJugadorId('') }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mostrador ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Mostrador / casual</button>
              </div>
            )}
            {mostrador
              ? <p className="text-[11px] text-slate-400">Venta a un visitante sin ficha. Se cobra al contado (no queda a cuenta).</p>
              : <JugadorPicker jugadores={jugadores} deudores={esCobro ? deudores : null} value={jugadorId} onChange={setJugadorId} />}
          </div>

          {(mostrador || jugadorId) && (<>
            {/* ── Lo que debe (solo en modo cobro) ── */}
            {esCobro && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Lo que debe</p>
              {loadingDeudas ? (
                <p className="text-slate-400 text-sm py-2">Cargando…</p>
              ) : deudas.length === 0 ? (
                <p className="text-slate-400 text-sm py-2 bg-emerald-50/50 rounded-xl px-3">Está al día 🎉</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {deudas.map((d) => (
                    <button key={d.id} onClick={() => setSelDeuda((p) => ({ ...p, [d.id]: !p[d.id] }))} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${selDeuda[d.id] ? 'border-brand-300 bg-brand-50/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${selDeuda[d.id] ? 'bg-brand-500' : 'border border-slate-300'}`}>{selDeuda[d.id] && <Check size={13} className="text-white" />}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{TIPO_LABEL[d.tipo] ?? d.tipo}</span>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{d.concepto}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 shrink-0">{money(d.monto)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* ── Productos / consumos (solo en modo venta) ── */}
            {esVenta && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">{mostrador ? 'Productos' : 'Agregar consumo / cargo'}</p>
              <div className="flex gap-2">
                <select value={sel} onChange={(e) => setSel(e.target.value)} className={`flex-1 ${inputCls}`}>
                  <option value="">Elegí…</option>
                  {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {money(p.precio)}</option>)}
                  {activos.length > 0 && <option disabled>──────────</option>}
                  <option value="__otro__">✏️ Otro (escribir monto)</option>
                </select>
                {sel !== '__otro__' && <button onClick={agregarLinea} disabled={!sel} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors disabled:opacity-40"><Plus size={16} /></button>}
              </div>
              {sel === '__otro__' && (
                <div className="flex gap-2 mt-2">
                  <input value={otroConcepto} onChange={(e) => setOtroConcepto(e.target.value)} placeholder="Concepto (ej: multa)" className={`flex-1 ${inputCls}`} />
                  <input type="number" value={otroPrecio} onChange={(e) => setOtroPrecio(e.target.value)} placeholder="$" className={`w-24 ${inputCls}`} />
                  <button onClick={agregarLinea} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"><Plus size={16} /></button>
                </div>
              )}
              {lineas.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {lineas.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100">
                      <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">{l.nombre}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => cambiarCant(l.id, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-sm font-medium text-slate-700 w-5 text-center">{l.cantidad}</span>
                        <button onClick={() => cambiarCant(l.id, +1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 w-20 text-right shrink-0">{money(l.precio * l.cantidad)}</p>
                      <button onClick={() => quitarLinea(l.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Método + acciones */}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500 font-medium">Método (al cobrar)</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-400">
                  {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
                </select>
              </div>
              {error && <p className="text-rose-500 text-xs">{error}</p>}
              <div className="flex gap-2">
                {esVenta && !mostrador && (
                  <button onClick={anotarACuenta} disabled={saving || lineas.length === 0} title="Suma los consumos nuevos como deuda pendiente" className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">
                    Anotar a cuenta{totalNuevo > 0 ? ` ${money(totalNuevo)}` : ''}
                  </button>
                )}
                <button onClick={cobrarTodo} disabled={saving || totalCobrar === 0} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                  {saving ? 'Procesando…' : `Cobrar ${money(totalCobrar)}`}
                </button>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
const PagosPage = () => {
  const token = useAuthStore((s) => s.token)
  const club = useClubStore((s) => s.club)
  const updateClub = useClubStore((s) => s.updateClub)
  const saveConfig = useClubStore((s) => s.saveConfig)
  const metodosHabilitados = metodosDelClub(club)

  const [tab, setTab] = useState('ventas') // ventas | cobranzas | gastos | caja
  const [resumen, setResumen] = useState(null)
  const [deudas, setDeudas] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [metodoFiltro, setMetodoFiltro] = useState('todos')
  const [search, setSearch] = useState('')
  const [cobrando, setCobrando] = useState(null)   // cargo en proceso de cobro
  const [eliminando, setEliminando] = useState(null) // cargo a eliminar
  const [anulando, setAnulando] = useState(null)   // cobro pagado a revertir a pendiente
  const [cambiandoMetodo, setCambiandoMetodo] = useState(null) // cobro pagado al que se le corrige el método
  const [modalModo, setModalModo] = useState(null)   // null | 'venta' | 'cobro'
  const cuentaOpen = modalModo !== null
  const [configMetodos, setConfigMetodos] = useState(false)
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [productos, setProductos] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (tipo, message) => { setToast({ tipo, message }); setTimeout(() => setToast(null), 3500) }

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.get('/cargos/cobranzas', { Authorization: `Bearer ${token}` })
      setDeudas(Array.isArray(data?.deudas) ? data.deudas : [])
      setResumen(data?.resumen ?? null)
    } catch {
      showToast('error', 'No se pudieron cargar las cobranzas')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  // Jugadores para el selector de los modales (lazy, al abrir cargar/cobrar cuenta)
  useEffect(() => {
    if (!cuentaOpen || jugadores.length > 0 || !token) return
    api.get('/jugadores', { Authorization: `Bearer ${token}` })
      .then((data) => setJugadores(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [cuentaOpen, jugadores.length, token])

  // Catálogo de productos (lazy, al abrir el catálogo o el modal de cargar)
  const fetchProductos = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.get('/productos', { Authorization: `Bearer ${token}` })
      setProductos(Array.isArray(data) ? data : [])
    } catch { /* silencioso */ }
  }, [token])

  useEffect(() => {
    if (catalogoOpen || cuentaOpen) fetchProductos()
  }, [catalogoOpen, cuentaOpen, fetchProductos])

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deudas.filter((c) => {
      if (filtro === 'vencido' && !c.vencido) return false
      if (filtro === 'pendiente' && c.estado !== 'pendiente') return false
      if (filtro === 'pagado' && c.estado !== 'pagado') return false
      if (tipoFiltro !== 'todos' && c.tipo !== tipoFiltro) return false
      if (metodoFiltro !== 'todos' && c.metodoPago !== metodoFiltro) return false
      if (q) {
        const nombre = `${c.jugador?.nombre ?? ''} ${c.jugador?.apellido ?? ''} ${c.jugador?.dni ?? ''}`.toLowerCase()
        if (!nombre.includes(q)) return false
      }
      return true
    })
  }, [deudas, filtro, tipoFiltro, metodoFiltro, search])

  // Deudores (jugadores con deuda pendiente) + su total, para el buscador de "Cobrar cuenta"
  const deudores = useMemo(() => {
    const map = {}
    for (const d of deudas) {
      if (d.estado !== 'pendiente' || !d.jugador) continue
      const j = d.jugador
      const e = (map[j.id] ??= { id: j.id, nombre: j.nombre, apellido: j.apellido, dni: j.dni, total: 0, count: 0 })
      e.total += d.monto; e.count += 1
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [deudas])

  const guardarMetodos = async (ids) => {
    setSaving(true)
    try {
      updateClub({ metodosPago: ids })
      await saveConfig(token)
      setConfigMetodos(false)
      showToast('exito', 'Métodos de cobro actualizados')
    } catch {
      showToast('error', 'No se pudieron guardar los métodos')
    } finally { setSaving(false) }
  }

  const cobrar = async (metodoPago) => {
    setSaving(true)
    try {
      if (cobrando.origen === 'reserva') {
        await api.patch(`/reservas/${cobrando.refId}/pago`, { pagado: true, metodoPago }, { Authorization: `Bearer ${token}` })
      } else {
        await api.patch(`/cargos/${cobrando.refId}/estado`, { estado: 'pagado', metodoPago }, { Authorization: `Bearer ${token}` })
      }
      setCobrando(null)
      showToast('exito', 'Cobro registrado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo registrar el cobro')
    } finally { setSaving(false) }
  }

  const eliminar = async () => {
    setSaving(true)
    try {
      if (eliminando.origen === 'reserva') {
        // Un turno no se borra: se marca "sin cobro" (sale de cobranzas, queda en historial)
        await api.patch(`/reservas/${eliminando.refId}/cobro-omitido`, { omitido: true }, { Authorization: `Bearer ${token}` })
      } else {
        await api.delete(`/cargos/${eliminando.refId}`, { Authorization: `Bearer ${token}` })
      }
      setEliminando(null)
      showToast('exito', eliminando.origen === 'reserva' ? 'Turno quitado de cobranzas' : 'Deuda eliminada')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo eliminar')
    } finally { setSaving(false) }
  }

  // Anula un cobro recién hecho por error → vuelve a pendiente (sale de la caja)
  const anular = async () => {
    setSaving(true)
    try {
      if (anulando.origen === 'reserva') {
        await api.patch(`/reservas/${anulando.refId}/pago`, { pagado: false, metodoPago: null }, { Authorization: `Bearer ${token}` })
      } else {
        await api.patch(`/cargos/${anulando.refId}/estado`, { estado: 'pendiente' }, { Authorization: `Bearer ${token}` })
      }
      setAnulando(null)
      showToast('exito', 'Cobro anulado · volvió a pendiente')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo anular el cobro')
    } finally { setSaving(false) }
  }

  // Corrige el método de un cobro ya pagado (ej: cobró efectivo pero era QR)
  const cambiarMetodo = async (metodoPago) => {
    setSaving(true)
    try {
      if (cambiandoMetodo.origen === 'reserva') {
        await api.patch(`/reservas/${cambiandoMetodo.refId}/pago`, { pagado: true, metodoPago }, { Authorization: `Bearer ${token}` })
      } else {
        await api.patch(`/cargos/${cambiandoMetodo.refId}/estado`, { estado: 'pagado', metodoPago }, { Authorization: `Bearer ${token}` })
      }
      setCambiandoMetodo(null)
      showToast('exito', 'Método actualizado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo cambiar el método')
    } finally { setSaving(false) }
  }

  // ── Productos ──
  const crearProducto = async (data) => {
    setSaving(true)
    try {
      await api.post('/productos', data, { Authorization: `Bearer ${token}` })
      await fetchProductos()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo crear el producto')
    } finally { setSaving(false) }
  }
  const actualizarProducto = async (id, data) => {
    setSaving(true)
    try {
      await api.patch(`/productos/${id}`, data, { Authorization: `Bearer ${token}` })
      await fetchProductos()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo actualizar el producto')
    } finally { setSaving(false) }
  }
  const eliminarProducto = async (id) => {
    setSaving(true)
    try {
      await api.delete(`/productos/${id}`, { Authorization: `Bearer ${token}` })
      await fetchProductos()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo eliminar el producto')
    } finally { setSaving(false) }
  }
  const ajustarStock = async (id, stock) => {
    setSaving(true)
    try {
      await api.post(`/productos/${id}/ajuste`, { stock }, { Authorization: `Bearer ${token}` })
      await fetchProductos()
      showToast('exito', 'Stock actualizado')
    } catch (err) {
      showToast('error', err?.message || 'No se pudo ajustar el stock')
    } finally { setSaving(false) }
  }
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Finanzas</h2>
          <p className="text-sm text-slate-400 mt-1">Cobranzas y gastos del club</p>
        </div>
        <div className="flex items-center gap-2">
          <AyudaPanel titulo="Cómo funciona Finanzas">
            <AyudaSeccion titulo="¿Qué es esta sección?">
              <p>Acá manejás toda la plata del club: lo que te deben (<b>Cobranzas</b>), lo que gastás (<b>Gastos</b>) y el resumen diario (<b>Caja del día</b>).</p>
            </AyudaSeccion>
            <AyudaSeccion icon={Wallet} titulo="Cuenta de jugador">
              <p>El botón principal. Elegís un jugador y ahí ves <b>lo que debe</b> (turnos impagos, productos, cargos) y podés <b>agregarle consumos</b> (un tubo, una bebida) o un cargo suelto (una multa).</p>
              <p>Al final elegís: <b>Anotar a la cuenta</b> (queda como deuda) o <b>Cobrar</b> (entra a la caja al instante, con su método).</p>
            </AyudaSeccion>
            <AyudaSeccion icon={ShoppingCart} titulo="Venta de mostrador">
              <p>Dentro de <b>Cobrar / Vender</b>, arriba tenés el toggle <b>Jugador / Mostrador</b>. Elegí <b>Mostrador</b> para venderle a un <b>visitante sin ficha</b> (una bebida, un grip): elegís productos y cobrás <b>al contado</b> — no queda a cuenta porque no hay a quién cobrarle después. Entra directo a la caja del día.</p>
            </AyudaSeccion>
            <AyudaSeccion icon={Package} titulo="Productos (en ⚙️)">
              <p>Cargá tu catálogo (tubo de pelotas, grip, bebida…) para venderlos rápido desde la cuenta del jugador.</p>
            </AyudaSeccion>
            <AyudaSeccion icon={TrendingUp} titulo="Gastos">
              <p>Registrá las facturas de proveedor (compras, alquiler, servicios). Podés adjuntar la foto de la factura.</p>
            </AyudaSeccion>
            <AyudaSeccion icon={DollarSign} titulo="Caja del día">
              <p>El arqueo: cuánta plata entró y salió cada día, separado por método. Solo cuenta lo cobrado/pagado — las deudas pendientes no son caja.</p>
            </AyudaSeccion>
            <AyudaSeccion icon={Printer} titulo="Recibos y reportes">
              <p>En cada cobro podés imprimir un <b>recibo</b>. Con el botón <b>Reporte</b> generás un PDF con la marca del club.</p>
            </AyudaSeccion>
          </AyudaPanel>
          {(tab === 'cobranzas' || tab === 'ventas') && (<>
          {/* Configuración (catálogo + métodos) */}
          <div className="relative">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              title="Configuración"
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Settings size={16} />
            </button>
            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSettingsOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                  <button onClick={() => { setCatalogoOpen(true); setSettingsOpen(false) }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <Package size={15} className="text-slate-400" /> Catálogo de productos
                  </button>
                  <button onClick={() => { setConfigMetodos(true); setSettingsOpen(false) }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <DollarSign size={15} className="text-slate-400" /> Métodos de cobro
                  </button>
                </div>
              </>
            )}
          </div>
          {tab === 'ventas'
            ? <button onClick={() => setModalModo('venta')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm">
                <ShoppingCart size={16} /> Nueva venta
              </button>
            : <button onClick={() => setModalModo('cobro')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm">
                <Wallet size={16} /> Cobrar cuenta
              </button>}
          </>)}
        </div>
      </div>

      {/* Tabs: Ventas (POS) · Cobranzas (deudas) · Gastos · Caja */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[{ id: 'ventas', label: 'Ventas' }, { id: 'cobranzas', label: 'Cobranzas' }, { id: 'gastos', label: 'Gastos' }, { id: 'caja', label: 'Caja / Reportes' }].map(({ id, label }) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ventas' && <VentasTab token={token} metodos={metodosHabilitados} showToast={showToast} />}
      {tab === 'gastos' && <GastosTab token={token} metodos={metodosHabilitados} />}
      {tab === 'caja' && <CajaTab token={token} />}

      {tab === 'cobranzas' && (<>
      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TotalCard
          label="Total adeudado" value={money(resumen?.adeudado)}
          sub={resumen ? `${resumen.cantPendientes} cargo${resumen.cantPendientes !== 1 ? 's' : ''} pendiente${resumen.cantPendientes !== 1 ? 's' : ''}` : ''}
          icon={DollarSign} color="text-amber-500" bg="bg-amber-500/10"
        />
        <TotalCard
          label="Vencido" value={money(resumen?.vencido)}
          sub={resumen ? `${resumen.cantVencidos} en mora` : ''}
          icon={AlertTriangle} color="text-rose-500" bg="bg-rose-500/10"
        />
        <TotalCard
          label="Cobrado este mes" value={money(resumen?.cobradoMes)}
          sub="cargos pagados" icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-500/10"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {FILTROS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:border-brand-400"
        >
          {TIPOS_FILTRO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {(filtro === 'pagado' || filtro === 'todos') && (
          <select
            value={metodoFiltro} onChange={(e) => setMetodoFiltro(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:border-brand-400"
          >
            <option value="todos">Todos los métodos</option>
            {metodosHabilitados.map((id) => (
              <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>
            ))}
          </select>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador o DNI…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400"
          />
        </div>
        <button
          onClick={() => generarReporteCobranzas(visibles, club, `${FILTROS.find((f) => f.id === filtro)?.label ?? ''}${tipoFiltro !== 'todos' ? ' · ' + (TIPOS_FILTRO.find((t) => t.id === tipoFiltro)?.label ?? '') : ''}`)}
          disabled={visibles.length === 0}
          title="Generar reporte PDF"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs transition-colors disabled:opacity-40"
        >
          <FileText size={14} /> Reporte
        </button>
        <button
          onClick={() => exportarCobranzasCSV(visibles)}
          disabled={visibles.length === 0}
          title="Exportar a CSV (para el contador)"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 font-medium text-xs hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-slate-400">
            <div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" />
            <span className="text-sm">Cargando cobranzas…</span>
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-2 text-center max-w-md mx-auto">
            <CheckCircle size={24} className="text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">
              {filtro === 'pendiente' ? 'No hay deudas pendientes 🎉' : 'Sin resultados para este filtro'}
            </p>
            {filtro === 'pendiente' && (
              <p className="text-slate-400 text-xs leading-relaxed">
                Acá aparece lo que te deben los jugadores. Las deudas se generan solas (un turno que quedó impago, una inscripción a torneo) o las cargás vos con <b className="text-slate-500">Cuenta de jugador</b>.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibles.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-800 font-semibold text-sm truncate">
                      {c.jugador ? `${c.jugador.nombre} ${c.jugador.apellido}` : 'Mostrador'}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{TIPO_LABEL[c.tipo] ?? c.tipo}</span>
                    {c.vencido && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock size={9} /> Vencido
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    {c.concepto}
                    {c.vencimiento && ` · vence ${fmtFecha(c.vencimiento)}`}
                  </p>
                </div>

                <p className="text-slate-800 font-bold text-sm shrink-0 w-20 text-right">{money(c.monto)}</p>

                <div className="shrink-0 flex items-center justify-end gap-1.5">
                  {c.estado === 'pendiente' ? (
                    <>
                      <button
                        onClick={() => setCobrando(c)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle size={13} /> Cobrar
                      </button>
                      <button
                        onClick={() => setEliminando(c)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 text-xs font-medium transition-colors"
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCambiandoMetodo(c)} title="Cambiar método" className="hover:opacity-70 transition-opacity">
                        <MetodoBadge metodo={c.metodoPago} />
                      </button>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle size={12} /> Pagado
                      </span>
                      <button onClick={() => imprimirRecibo(c, club)} title="Imprimir recibo" className="text-slate-300 hover:text-brand-500 p-1">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => setAnulando(c)} title="Anular cobro (vuelve a pendiente)" className="text-slate-300 hover:text-amber-500 p-1">
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>)}

      {cobrando && <ModalCobro cargo={cobrando} metodos={metodosHabilitados} onConfirm={cobrar} onClose={() => setCobrando(null)} saving={saving} />}
      {cambiandoMetodo && <ModalCobro cargo={cambiandoMetodo} metodos={metodosHabilitados} onConfirm={cambiarMetodo} onClose={() => setCambiandoMetodo(null)} saving={saving} titulo="Cambiar método" />}
      {anulando && <ModalAnular cargo={anulando} onConfirm={anular} onClose={() => setAnulando(null)} saving={saving} />}
      {eliminando && <ModalEliminar cargo={eliminando} onConfirm={eliminar} onClose={() => setEliminando(null)} saving={saving} />}
      {cuentaOpen && <ModalCuentaJugador modo={modalModo} jugadores={jugadores} deudores={deudores} productos={productos} metodos={metodosHabilitados} token={token} onClose={() => setModalModo(null)} onRefresh={fetchData} showToast={showToast} />}
      {configMetodos && <ModalMetodos seleccion={metodosHabilitados} onSave={guardarMetodos} onClose={() => setConfigMetodos(false)} saving={saving} />}
      {catalogoOpen && <ModalCatalogoProductos productos={productos} onCreate={crearProducto} onUpdate={actualizarProducto} onDelete={eliminarProducto} onAjuste={ajustarStock} onClose={() => setCatalogoOpen(false)} saving={saving} />}

      {toast && (
        <Toast
          icon={toast.tipo === 'exito' ? CheckCircle : AlertTriangle}
          iconBg={toast.tipo === 'exito' ? 'bg-emerald-500/15' : 'bg-rose-500/15'}
          iconColor={toast.tipo === 'exito' ? 'text-emerald-400' : 'text-rose-400'}
          barColor={toast.tipo === 'exito' ? 'bg-emerald-400' : 'bg-rose-400'}
          label={toast.tipo === 'exito' ? 'Cobranzas' : 'Error'}
          message={toast.message}
          duration={3500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default PagosPage
