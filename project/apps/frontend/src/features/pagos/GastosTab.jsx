import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingDown, AlertTriangle, Plus, X, Trash2, CheckCircle, Check, Pencil, Camera, Loader2, FileText, Download } from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/ToastProvider'
import { METODO_MAP, MetodoBadge } from '../../lib/metodosPago'
import { generarReporteGastos, exportarGastosCSV } from './comprobantes'
import useClubStore from '../../store/clubStore'
import useWiarkyGastoStore from '../../store/wiarkyGastoStore'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
const CATEGORIAS_SUGERIDAS = ['Servicios', 'Alquiler', 'Sueldos', 'Impuestos', 'Bebidas', 'Kiosco', 'Tienda deportiva', 'Insumos', 'Mantenimiento', 'Otros']
// Estado del vencimiento de un gasto IMPAGO: rojo si venció / vence hoy, amarillo si vence pronto.
const infoVenc = (venc, pagado) => {
  if (!venc || pagado) return null
  const hoyStr = new Date().toISOString().slice(0, 10)
  const dias = Math.round((new Date(venc + 'T00:00:00') - new Date(hoyStr + 'T00:00:00')) / 86400000)
  if (dias < 0) return { txt: `Venció ${fmtFecha(venc)}`, cls: 'text-rose-700 bg-rose-100' }
  if (dias === 0) return { txt: 'Vence hoy', cls: 'text-rose-700 bg-rose-100' }
  if (dias <= 5) return { txt: `Vence en ${dias} día${dias > 1 ? 's' : ''}`, cls: 'text-amber-700 bg-amber-100' }
  return { txt: `Vence ${fmtFecha(venc)}`, cls: 'text-slate-500 bg-slate-100' }
}
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const hoy = () => new Date().toISOString().slice(0, 10)

// ── Modal: alta / edición de gasto ───────────────────────────────────────────
// Detecta si un gasto es probablemente la MISMA factura que otro ya cargado.
// Fuerte: mismo proveedor + mismo N° de factura. Débil (si no hay N°): proveedor + monto + fecha.
const norm = (s) => (s || '').trim().toLowerCase()
const esMismaFactura = (a, b) => {
  const provOk = norm(a.proveedor) && norm(a.proveedor) === norm(b.proveedor)
  const nroA = norm(a.numeroFactura), nroB = norm(b.numeroFactura)
  if (nroA && nroB) return provOk && nroA === nroB               // match fuerte
  return provOk && Number(a.monto) === Number(b.monto) && a.fecha === b.fecha // match débil
}

const RUBROS_STOCK = ['bebidas', 'kiosco', 'deportivo']

// Mapea el resultado del OCR (/gastos/extraer) al prefill del ModalGasto. Fuente única:
// lo usan el botón "Subir factura con IA" de acá Y el flujo de foto de WIarky.
const CAT_IA = { servicios: 'Servicios', alquiler: 'Alquiler', sueldos: 'Sueldos', impuestos: 'Impuestos', bebidas: 'Bebidas', kiosco: 'Kiosco', deportivo: 'Tienda deportiva', insumos: 'Insumos', mantenimiento: 'Mantenimiento', otros: 'Otros' }
const datosAPrefill = (datos) => ({
  proveedor: datos.proveedor || '',
  cuitProveedor: datos.cuitProveedor || '',
  tipoComprobante: datos.tipoComprobante || '',
  concepto: datos.concepto || '',
  monto: datos.monto || '',
  categoria: CAT_IA[datos.categoria] || 'Otros',
  fecha: datos.fecha || hoy(),
  vencimiento: datos.vencimiento || '',
  // CONTADO → ya pagada. Si es a crédito con vencimiento futuro → "A pagar".
  pagado: datos.contado ? true : !datos.vencimiento,
  numeroFactura: datos.numeroFactura || '',
  items: Array.isArray(datos.items) ? datos.items : [],
  categoriaKey: datos.categoria, // rubro crudo (bebidas/kiosco/deportivo) para sugerir cargar al stock
})

const ModalGasto = ({ gasto, prefill, existentes = [], productos = [], metodos, token, onSave, onClose, saving }) => {
  const editing = !!gasto
  const src = gasto ?? prefill ?? {} // prefill = valores de la IA (crear pre-llenado, NO es edición)

  // Ítems de la factura (los lee la IA) para el flujo "cargar al stock". El dueño los confirma/mapea.
  const itemsIA = Array.isArray(prefill?.items) ? prefill.items : []
  const [cargarStock, setCargarStock] = useState(itemsIA.length > 0 && RUBROS_STOCK.includes(prefill?.categoriaKey))
  // Matchea el nombre limpio de la IA contra un producto existente (para mapear, no duplicar).
  const matchProducto = (limpio) => {
    const n = (limpio || '').trim().toLowerCase()
    if (!n) return null
    const ex = productos.find((p) => { const pn = (p.nombre || '').toLowerCase(); return pn === n || n.includes(pn) || pn.includes(n) })
    return ex?.nombre || null
  }
  const [lineas, setLineas] = useState(() => itemsIA.map((it) => {
    const bultos = it.bultos || 1
    const upb = it.unidadesPorBulto || 1
    const unidades = bultos * upb // la multiplicación la hace el CÓDIGO, no la IA
    return {
      producto: matchProducto(it.nombreLimpio) || it.nombreLimpio || it.descripcion || '',
      descripcion: it.descripcion || '', // el nombre crudo de la factura, como referencia
      bultos, upb,
      unidades,
      importe: it.importe || 0,
      costoUnit: unidades > 0 ? Math.round(it.importe / unidades) : it.importe,
    }
  }))
  const setLinea = (i, k, v) => setLineas((ls) => ls.map((l, idx) => {
    if (idx !== i) return l
    const nl = { ...l, [k]: v }
    // Al cambiar las unidades (ej. 1 bulto → 24 latas), recalculo el costo unitario desde el importe.
    if (k === 'unidades') nl.costoUnit = Number(v) > 0 ? Math.round((l.importe || 0) / Number(v)) : (l.importe || 0)
    return nl
  }))
  const quitarLinea = (i) => setLineas((ls) => ls.filter((_, idx) => idx !== i))
  const [form, setForm] = useState(() => ({
    proveedor: src.proveedor ?? '',
    cuitProveedor: src.cuitProveedor ?? '',
    tipoComprobante: src.tipoComprobante ?? '',
    concepto: src.concepto ?? '',
    monto: src.monto != null ? String(src.monto) : '',
    categoria: src.categoria ?? '',
    fecha: src.fecha ?? hoy(),
    vencimiento: src.vencimiento ?? '',
    pagado: src.pagado != null ? src.pagado : true,
    metodoPago: src.metodoPago ?? (metodos[0] ?? 'efectivo'),
    numeroFactura: src.numeroFactura ?? '',
  }))
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Aviso (no bloqueo) de posible factura duplicada — solo al CREAR (no al editar).
  const dup = (!editing && Number(form.monto) > 0)
    ? existentes.find((g) => esMismaFactura({ proveedor: form.proveedor, numeroFactura: form.numeroFactura, monto: Number(form.monto), fecha: form.fecha }, g))
    : null

  // Líneas de stock a enviar (solo las válidas) si el dueño confirmó cargar al stock.
  const lineasStock = lineas
    .filter((l) => l.producto.trim() && Number(l.unidades) > 0)
    .map((l) => ({ nombre: l.producto.trim(), cantidad: Number(l.unidades), costoUnit: Number(l.costoUnit) || null, categoria: form.categoria.trim() || null }))

  const submit = () => {
    if (!form.concepto.trim()) return setError('Ingresá un concepto')
    if (!(Number(form.monto) > 0)) return setError('El monto debe ser mayor a 0')
    setError('')
    onSave({
      proveedor: form.proveedor.trim() || null,
      cuitProveedor: form.cuitProveedor.trim() || null,
      tipoComprobante: form.tipoComprobante.trim() || null,
      concepto: form.concepto.trim(),
      monto: Number(form.monto),
      categoria: form.categoria.trim() || null,
      fecha: form.fecha,
      vencimiento: form.vencimiento || null,
      pagado: form.pagado,
      metodoPago: form.pagado ? form.metodoPago : null,
      numeroFactura: form.numeroFactura.trim() || null,
      // Ítems confirmados → el backend suma stock + costo (matchea el producto por nombre o lo crea).
      ...(cargarStock && lineasStock.length ? { lineasStock } : {}),
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
          {dup && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <b>¿Ya la cargaste?</b> Parece la misma factura: <b>{dup.concepto}</b>{dup.proveedor ? ` · ${dup.proveedor}` : ''} · {money(dup.monto)}{dup.fecha ? ` · ${fmtFecha(dup.fecha)}` : ''}{dup.numeroFactura ? ` · Fac. ${dup.numeroFactura}` : ''}. Revisá antes de guardar para no duplicar el gasto.
              </p>
            </div>
          )}
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Concepto</label>
            <input value={form.concepto} onChange={(e) => set('concepto', e.target.value)} placeholder="Ej: factura de luz, alquiler, sueldo…" className={inputCls} />
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
              <label className="block text-slate-500 text-xs font-medium mb-1.5">CUIT proveedor <span className="text-slate-300 font-normal">(opcional)</span></label>
              <input value={form.cuitProveedor} onChange={(e) => set('cuitProveedor', e.target.value)} placeholder="30-12345678-9" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Comprobante <span className="text-slate-300 font-normal">(opcional)</span></label>
              <input list="tipo-comp" value={form.tipoComprobante} onChange={(e) => set('tipoComprobante', e.target.value)} placeholder="Factura A" className={inputCls} />
              <datalist id="tipo-comp"><option value="Factura A" /><option value="Factura B" /><option value="Factura C" /><option value="Ticket" /><option value="Remito" /><option value="Recibo" /></datalist>
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
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Vencimiento <span className="text-slate-300 font-normal">— cuándo hay que pagarla (opcional)</span></label>
            <input type="date" value={form.vencimiento} onChange={(e) => set('vencimiento', e.target.value)} className={inputCls} />
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

          {/* Ítems de la factura → cargar al stock (la IA los leyó; el dueño confirma/mapea) */}
          {itemsIA.length > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 overflow-hidden">
              <button onClick={() => setCargarStock((v) => !v)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${cargarStock ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>{cargarStock && <Check size={11} className="text-white" />}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">Cargar estos productos al stock</p>
                  <p className="text-[11px] text-slate-400">La IA leyó {itemsIA.length} producto{itemsIA.length !== 1 ? 's' : ''}. Suma stock y su costo (para el margen).</p>
                </div>
              </button>
              {cargarStock && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">Revisá cada producto: elegí tu producto (o dejá el nombre para crearlo), y poné las <b>unidades reales</b> (ej: 1 bulto = 24 latas). El costo por unidad se calcula solo.</p>
                  {lineas.map((l, i) => (
                    <div key={i} className="bg-white rounded-lg border border-slate-200 p-2.5 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <input list="prod-list" value={l.producto} onChange={(e) => setLinea(i, 'producto', e.target.value)} placeholder="Producto" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-400" />
                          {l.descripcion && l.descripcion.toLowerCase() !== l.producto.trim().toLowerCase() && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate pl-1">factura: {l.descripcion}</p>
                          )}
                        </div>
                        <button onClick={() => quitarLinea(i)} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={15} /></button>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <input type="number" value={l.unidades} onChange={(e) => setLinea(i, 'unidades', e.target.value)} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:border-brand-400" />
                          <span className="text-slate-400">unid.</span>
                          {l.upb > 1 && <span className="text-[10px] text-brand-500" title="bultos × unidades por bulto">({l.bultos}×{l.upb})</span>}
                        </div>
                        <span className="text-slate-300">×</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">$</span>
                          <input type="number" value={l.costoUnit} onChange={(e) => setLinea(i, 'costoUnit', Number(e.target.value))} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:border-brand-400" />
                          <span className="text-slate-400">c/u</span>
                        </div>
                        <span className="text-slate-400 ml-auto">= {money((Number(l.unidades) || 0) * (Number(l.costoUnit) || 0))}</span>
                      </div>
                    </div>
                  ))}
                  <datalist id="prod-list">{productos.map((p) => <option key={p.id} value={p.nombre} />)}</datalist>
                  {lineas.length === 0 && <p className="text-[11px] text-slate-400">Sacaste todos los ítems. Se guarda como gasto normal.</p>}
                </div>
              )}
            </div>
          )}
          {!editing && itemsIA.length === 0 && (
            <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">¿Es una <b>compra de mercadería</b> (productos para el bar)? Subila con <b>"Subir factura con IA"</b> y te ofrece cargar los productos al stock.</p>
          )}

          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={submit} disabled={saving} className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
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

// ── Modal: tips antes de subir la factura con IA (expectativa vs realidad) ──
const TIPS_FOTO = [
  { emoji: '☀️', titulo: 'Buena luz', sub: 'Sin sombras' },
  { emoji: '📄', titulo: 'Bien derecha', sub: 'Toda la hoja' },
  { emoji: '🔎', titulo: 'Datos nítidos', sub: 'Sin borrones' },
]
const ModalTipsIA = ({ onCancel, onContinuar }) => {
  const [noMostrar, setNoMostrar] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-[popIn_.22s_ease-out]" onClick={(e) => e.stopPropagation()}>
        {/* Header con color */}
        <div className="relative bg-gradient-to-br from-brand-500 to-brand-600 px-6 pt-7 pb-9 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-3 ring-1 ring-white/20">
            <Camera size={26} className="text-white" />
          </div>
          <p className="text-white font-bold text-lg leading-tight">Foto o PDF de la factura</p>
          <p className="text-white/80 text-xs mt-1">La IA lee lo que ve — ayudala y carga todo sola 🎾</p>
        </div>

        <div className="p-5 -mt-5">
          {/* Fichas visuales de "buena foto" */}
          <div className="grid grid-cols-3 gap-2.5 bg-white rounded-2xl">
            {TIPS_FOTO.map((t) => (
              <div key={t.titulo} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-3.5 flex flex-col items-center text-center gap-1 shadow-sm transition-transform hover:-translate-y-0.5">
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className="text-xs font-semibold text-slate-700 leading-tight">{t.titulo}</span>
                <span className="text-[10px] text-slate-400 leading-tight">{t.sub}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-3">Que se lean el <b className="text-slate-500">total</b>, el <b className="text-slate-500">proveedor</b> y el <b className="text-slate-500">detalle</b>. <span className="text-slate-500">¿Te llegó por mail? Subí el PDF directo</span> 👌</p>

          {/* Aviso honesto */}
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mt-3">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-snug"><b>Revisá los datos antes de guardar.</b> Si la foto sale mal, la IA puede errar — vos confirmás.</p>
          </div>

          <div className="flex items-center justify-between gap-3 mt-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={noMostrar} onChange={(e) => setNoMostrar(e.target.checked)} className="accent-brand-500 w-3.5 h-3.5" />
              No mostrar más
            </label>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-slate-500 font-medium text-sm hover:bg-slate-100 transition-colors">Cancelar</button>
              <button onClick={() => onContinuar(noMostrar)} className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-brand-500/30"><Camera size={15} /> Elegir foto o PDF</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab de Gastos / Egresos ──────────────────────────────────────────────────
const GastosTab = ({ token, metodos }) => {
  const club = useClubStore((s) => s.club)
  const [gastos, setGastos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos') // todos | pagado | pendiente
  const [catFiltro, setCatFiltro] = useState('todas')
  const [provFiltro, setProvFiltro] = useState('todos')
  const [modal, setModal] = useState(null)       // { gasto } | { nuevo:true }
  const [pagando, setPagando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const showToast = (tipo, message) => (tipo === 'exito' ? toast.success(message) : toast.error(message))

  const [productos, setProductos] = useState([])
  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [g, r] = await Promise.all([
        api.get('/gastos', { Authorization: `Bearer ${token}` }),
        api.get('/gastos/resumen', { Authorization: `Bearer ${token}` }),
      ])
      setGastos(Array.isArray(g) ? g : [])
      setResumen(r ?? null)
      // Productos del club (para mapear los ítems de una factura al stock). Puede fallar por permiso → degrada.
      api.get('/productos', { Authorization: `Bearer ${token}` }).then((p) => setProductos(Array.isArray(p) ? p : [])).catch(() => {})
    } catch {
      showToast('error', 'No se pudieron cargar los gastos')
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  // WIarky mandó una factura por el chat → abrimos el ModalGasto prellenado (reusa la revisión).
  const datosOcr = useWiarkyGastoStore((s) => s.datosOcr)
  const limpiarOcr = useWiarkyGastoStore((s) => s.limpiar)
  useEffect(() => {
    if (datosOcr) { setModal({ nuevo: true, prefill: datosAPrefill(datosOcr) }); limpiarOcr() }
  }, [datosOcr, limpiarOcr])

  const categoriasGasto = [...new Set(gastos.map((g) => g.categoria).filter(Boolean))].sort()
  const proveedoresGasto = [...new Set(gastos.map((g) => g.proveedor).filter(Boolean))].sort()
  const visibles = gastos.filter((g) =>
    (filtro === 'todos' ? true : filtro === 'pagado' ? g.pagado : !g.pagado) &&
    (catFiltro === 'todas' || g.categoria === catFiltro) &&
    (provFiltro === 'todos' || g.proveedor === provFiltro))
  // Total de lo filtrado (para responder "¿cuánto le pagué a este proveedor?").
  const totalVisible = visibles.reduce((s, g) => s + (g.monto ?? 0), 0)

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
  // ── IA: leer una factura (foto) y abrir el modal pre-llenado para confirmar ──
  const fileRef = useRef(null)
  const [leyendoIA, setLeyendoIA] = useState(false)
  const [tipsIA, setTipsIA] = useState(false)
  // Antes de elegir la foto, mostramos los tips (una vez; el usuario puede pedir no verlos más).
  const abrirSelectorIA = () => {
    try { if (localStorage.getItem('gastos_ia_tips_ok') === '1') { fileRef.current?.click(); return } } catch { /* */ }
    setTipsIA(true)
  }
  const subirConIA = async (file) => {
    if (!file) return
    setLeyendoIA(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = () => reject(new Error('No se pudo leer el archivo'))
        r.readAsDataURL(file)
      })
      // La IA lee la factura (como un scanner): extrae los datos y descarta la imagen.
      // No se guarda la foto — todo lo que importa queda en los campos estructurados.
      const datos = await api.post('/gastos/extraer', { image: dataUrl }, { Authorization: `Bearer ${token}` })
      setModal({ nuevo: true, prefill: datosAPrefill(datos) })
    } catch (err) {
      showToast('error', err?.message || 'No pude leer la factura. Probá con una foto más nítida.')
    } finally { setLeyendoIA(false) }
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
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; subirConIA(f) }} />
        <button onClick={abrirSelectorIA} disabled={leyendoIA}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold text-sm transition-colors disabled:opacity-60">
          {leyendoIA ? <><Loader2 size={16} className="animate-spin" /> Leyendo factura…</> : <><Camera size={16} /> Subir factura con IA</>}
        </button>
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {[{ id: 'todos', label: 'Todos' }, { id: 'pendiente', label: 'A pagar' }, { id: 'pagado', label: 'Pagados' }].map(({ id, label }) => (
            <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === id ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </div>
        {categoriasGasto.length > 0 && (
          <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:border-brand-400">
            <option value="todas">Todas las categorías</option>
            {categoriasGasto.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {proveedoresGasto.length > 0 && (
          <select value={provFiltro} onChange={(e) => setProvFiltro(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-none focus:border-brand-400 max-w-[180px]">
            <option value="todos">Todos los proveedores</option>
            {proveedoresGasto.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => generarReporteGastos(visibles, club, `${filtro === 'todos' ? 'Todos' : filtro === 'pagado' ? 'Pagados' : 'A pagar'}${catFiltro !== 'todas' ? ` · ${catFiltro}` : ''}${provFiltro !== 'todos' ? ` · ${provFiltro}` : ''}`)} disabled={visibles.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors disabled:opacity-40">
            <FileText size={14} /> Reporte
          </button>
          <button onClick={() => exportarGastosCSV(visibles)} disabled={visibles.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-40">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Total del proveedor filtrado — responde "¿cuánto le pagué a este proveedor?" */}
      {provFiltro !== 'todos' && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">Le pagaste a <b className="text-slate-800">{provFiltro}</b> <span className="text-slate-400">({visibles.length} factura{visibles.length !== 1 ? 's' : ''})</span></span>
          <span className="text-lg font-black text-brand-600">{money(totalVisible)}</span>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-slate-400"><div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" /><span className="text-sm">Cargando gastos…</span></div>
        ) : visibles.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center"><TrendingDown size={24} className="text-slate-200" /><p className="text-slate-400 text-sm">Sin gastos para este filtro</p></div>
        ) : (
          <div>
            {visibles.map((g, idx) => (
              <div key={g.id} className={`flex items-center gap-4 px-5 py-4 border-b border-slate-100 transition-colors ${idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-brand-50/60`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-800 font-semibold text-sm truncate">{g.concepto}</p>
                    {g.categoria && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{g.categoria}</span>}
                    {(() => { const v = infoVenc(g.vencimiento, g.pagado); return v && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${v.cls}`}>{v.txt}</span> })()}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    {g.proveedor ? `${g.proveedor} · ` : ''}{fmtFecha(g.fecha)}{g.numeroFactura ? ` · Fac. ${g.numeroFactura}` : ''}
                  </p>
                </div>
                <p className="text-slate-800 font-bold text-sm shrink-0 w-24 text-right">{money(g.monto)}</p>
                <div className="shrink-0 flex items-center justify-end gap-1.5">
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

      {tipsIA && <ModalTipsIA
        onCancel={() => setTipsIA(false)}
        onContinuar={(noMostrar) => { if (noMostrar) { try { localStorage.setItem('gastos_ia_tips_ok', '1') } catch { /* */ } } setTipsIA(false); setTimeout(() => fileRef.current?.click(), 0) }}
      />}
      {modal && <ModalGasto gasto={modal.gasto} prefill={modal.prefill} existentes={gastos} productos={productos} metodos={metodos} token={token} onSave={guardar} onClose={() => setModal(null)} saving={saving} />}
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

    </div>
  )
}

export default GastosTab
