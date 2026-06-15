import { useState, useEffect, useCallback } from 'react'
import { Plus, Minus, X, ShoppingCart, Clock, Trash2, Users, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { METODO_MAP } from '../../lib/metodosPago'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

// Hace cuánto se abrió (corto)
const desde = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)} h`
}

// ─── Tab Ventas: mesas/comandas abiertas del bar ────────────────────────────────
const VentasTab = ({ token, metodos, showToast }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [mesas, setMesas] = useState([])
  const [productos, setProductos] = useState([])
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [creando, setCreando] = useState(false)
  const [abrirOpen, setAbrirOpen] = useState(false)
  const [mesaSel, setMesaSel] = useState(null) // comanda abierta en el modal de ticket
  const [historial, setHistorial] = useState(null) // null = oculto; [] = cargado

  const fetchMesas = useCallback(async () => {
    try { setMesas(await api.get('/comandas?estado=abierta', auth)) } catch { /* */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMesas()
    api.get('/productos', auth).then((d) => setProductos(Array.isArray(d) ? d : [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const abrirMesa = async () => {
    if (!nuevaEtiqueta.trim()) return
    setCreando(true)
    try {
      const m = await api.post('/comandas', { etiqueta: nuevaEtiqueta.trim() }, auth)
      setNuevaEtiqueta(''); setAbrirOpen(false)
      await fetchMesas()
      setMesaSel(m) // abrir directo el ticket de la mesa nueva
    } catch (e) { showToast('error', e?.message || 'No se pudo abrir la mesa') }
    finally { setCreando(false) }
  }

  const verHistorial = async () => {
    if (historial !== null) { setHistorial(null); return }
    try { setHistorial(await api.get('/comandas?estado=cerrada', auth)) } catch { setHistorial([]) }
  }

  const onCerrada = () => { setMesaSel(null); fetchMesas(); if (historial !== null) verHistorial() }

  const bajoStock = productos.filter((p) => p.controlaStock && p.stock <= (p.stockMin || 0))

  return (
    <div className="flex flex-col gap-5">
      {/* Alerta de bajo stock */}
      {bajoStock.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Bajo stock ({bajoStock.length})</p>
            <p className="text-amber-700 text-xs mt-0.5">{bajoStock.map((p) => `${p.nombre} (${p.stock})`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Encabezado mesas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-700">Mesas abiertas {mesas.length > 0 && <span className="text-slate-400 font-normal">· {mesas.length}</span>}</p>
          <p className="text-[11px] text-slate-400 mt-0.5"><b>Nueva venta</b> (arriba) = pagás al toque · <b>Mesa</b> = cuenta abierta que se cobra al final.</p>
        </div>
        <button onClick={() => setAbrirOpen((o) => !o)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm">
          <Plus size={16} /> Nueva mesa
        </button>
      </div>

      {abrirOpen && (
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <input autoFocus value={nuevaEtiqueta} onChange={(e) => setNuevaEtiqueta(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && abrirMesa()} placeholder="Nombre de la mesa (ej: Mesa 3, Remera roja…)" className={`flex-1 ${inputCls}`} />
          <button onClick={abrirMesa} disabled={creando || !nuevaEtiqueta.trim()} className="px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50">Abrir</button>
        </div>
      )}

      {/* Grid de mesas abiertas */}
      {mesas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center"><ShoppingCart size={22} className="text-brand-500" /></div>
          <p className="text-slate-500 text-sm max-w-md">No hay mesas abiertas. Abrí una para ir cargando lo que consume un visitante y cobrar todo junto al final.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mesas.map((m) => (
            <button key={m.id} onClick={() => setMesaSel(m)} className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-800 truncate">{m.etiqueta}</p>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0"><Clock size={11} /> {desde(m.createdAt)}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">{money(m.total)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.cargos?.length || 0} ítem{(m.cargos?.length || 0) !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      )}

      {/* Historial */}
      <div>
        <button onClick={verHistorial} className="text-xs text-slate-500 hover:text-slate-800 font-medium">{historial !== null ? '▲ Ocultar' : '▼ Ver'} historial de mesas cerradas</button>
        {historial !== null && (
          <div className="mt-2 flex flex-col gap-1.5">
            {historial.length === 0 ? <p className="text-xs text-slate-400">Sin mesas cerradas todavía.</p> : historial.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 text-sm">
                <span className="flex-1 text-slate-600 truncate">{m.etiqueta}</span>
                <span className="text-[11px] text-slate-400">{m.cargos?.length || 0} ítems</span>
                <span className="font-semibold text-slate-700 w-24 text-right">{money(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {mesaSel && (
        <ModalMesa mesa={mesaSel} productos={productos} metodos={metodos} token={token} showToast={showToast}
          onClose={() => { setMesaSel(null); fetchMesas() }} onCerrada={onCerrada} onChange={fetchMesas} />
      )}
    </div>
  )
}

// ─── Modal del ticket de una mesa ───────────────────────────────────────────────
const ModalMesa = ({ mesa, productos, metodos, token, showToast, onClose, onCerrada, onChange }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [items, setItems] = useState(mesa.cargos ?? [])
  const [sel, setSel] = useState('')
  const [otroNombre, setOtroNombre] = useState('')
  const [otroPrecio, setOtroPrecio] = useState('')
  const [metodoPago, setMetodoPago] = useState(metodos[0] ?? 'efectivo')
  const [dividir, setDividir] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activos = productos.filter((p) => p.activo)
  const total = items.reduce((s, c) => s + c.monto, 0)

  const refetch = async () => {
    try {
      const abiertas = await api.get('/comandas?estado=abierta', auth)
      const m = abiertas.find((x) => x.id === mesa.id)
      setItems(m?.cargos ?? [])
    } catch { /* */ }
    onChange?.()
  }

  const agregar = async (concepto, monto, productoId = null) => {
    setError(''); setSaving(true)
    try {
      const m = await api.post(`/comandas/${mesa.id}/items`, { items: [{ concepto, monto, productoId }] }, auth)
      setItems(m.cargos ?? []); onChange?.()
    } catch (e) { setError(e?.message || 'No se pudo agregar') } finally { setSaving(false) }
  }
  const agregarProducto = () => { const p = activos.find((x) => x.id === sel); if (!p) return; agregar(p.nombre, p.precio, p.id); setSel('') }
  const agregarOtro = () => {
    if (!otroNombre.trim() || !(Number(otroPrecio) > 0)) return setError('Completá concepto y monto')
    agregar(otroNombre.trim(), Number(otroPrecio)); setOtroNombre(''); setOtroPrecio(''); setSel('')
  }
  const quitar = async (cargoId) => {
    setSaving(true)
    try { await api.delete(`/comandas/${mesa.id}/items/${cargoId}`, auth); await refetch() }
    catch (e) { setError(e?.message || 'No se pudo quitar') } finally { setSaving(false) }
  }
  const cerrar = async () => {
    if (total <= 0) return setError('La mesa no tiene consumos')
    setSaving(true); setError('')
    try {
      await api.post(`/comandas/${mesa.id}/cerrar`, { metodoPago }, auth)
      showToast('exito', 'Mesa cobrada y cerrada'); onCerrada()
    } catch (e) { setError(e?.message || 'No se pudo cerrar'); setSaving(false) }
  }
  const eliminarMesa = async () => {
    setSaving(true)
    try { await api.delete(`/comandas/${mesa.id}`, auth); showToast('exito', 'Mesa descartada'); onCerrada() }
    catch (e) { setError(e?.message || 'No se pudo eliminar'); setSaving(false) }
  }

  const porPersona = dividir > 1 ? Math.ceil(total / dividir) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">{mesa.etiqueta}</p>
            <p className="text-slate-400 text-xs mt-0.5">Mesa abierta · {items.length} ítem{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          {/* Ítems */}
          {items.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {items.map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100">
                  <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">{c.concepto}</p>
                  <p className="text-sm font-semibold text-slate-700 shrink-0">{money(c.monto)}</p>
                  <button onClick={() => quitar(c.id)} disabled={saving} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar consumición */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Agregar</p>
            <div className="flex gap-2">
              <select value={sel} onChange={(e) => setSel(e.target.value)} className={`flex-1 ${inputCls}`}>
                <option value="">Producto…</option>
                {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {money(p.precio)}</option>)}
                {activos.length > 0 && <option disabled>──────────</option>}
                <option value="__otro__">✏️ Otro (escribir)</option>
              </select>
              {sel !== '__otro__' && <button onClick={agregarProducto} disabled={!sel || saving} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40"><Plus size={16} /></button>}
            </div>
            {sel === '__otro__' && (
              <div className="flex gap-2 mt-2">
                <input value={otroNombre} onChange={(e) => setOtroNombre(e.target.value)} placeholder="Concepto" className={`flex-1 ${inputCls}`} />
                <input type="number" value={otroPrecio} onChange={(e) => setOtroPrecio(e.target.value)} placeholder="$" className={`w-24 ${inputCls}`} />
                <button onClick={agregarOtro} disabled={saving} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={16} /></button>
              </div>
            )}
          </div>

          {error && <p className="text-rose-500 text-xs">{error}</p>}
        </div>

        {/* Footer: total + dividir + cobrar */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-800">{money(total)}</span>
          </div>

          {/* Dividir entre N personas (cualquier cantidad) — solo muestra cuánto es por persona */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={13} /> Dividir entre</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDividir((n) => Math.max(1, n - 1))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"><Minus size={13} /></button>
              <span className="text-sm font-semibold text-slate-800 w-6 text-center">{dividir}</span>
              <button onClick={() => setDividir((n) => n + 1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"><Plus size={13} /></button>
            </div>
            {porPersona > 0 && <span className="text-xs text-violet-600 font-medium ml-auto">{money(porPersona)} c/u</span>}
          </div>

          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={`w-full ${inputCls}`}>
            {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
          </select>

          <div className="flex gap-2">
            <button onClick={eliminarMesa} disabled={saving} title="Descartar la mesa (no cobra nada)" className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 text-sm font-medium transition-colors disabled:opacity-40"><Trash2 size={15} /></button>
            <button onClick={cerrar} disabled={saving || total <= 0} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? 'Procesando…' : `Cobrar y cerrar ${money(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VentasTab
