import { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { api } from '../../lib/api'
import { METODO_MAP, metodosDelClub } from '../../lib/metodosPago'
import useClubStore from '../../store/clubStore'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

// Checkout del turno desde la grilla (Fase 1: un pagador para todo el ticket).
// reserva: { _backendId, monto, jugadorId, jugadores[], inicio, fin, canchaNombre, pago }
const CheckoutTurno = ({ reserva, token, onClose, onDone }) => {
  const metodos = metodosDelClub(useClubStore((s) => s.club))
  const auth = { Authorization: `Bearer ${token}` }
  const titularNombre = reserva.jugadores?.[0] || 'Titular'
  const hayTitular = !!reserva.jugadorId

  const [productos, setProductos] = useState([])
  const [cobrarTurno, setCobrarTurno] = useState(reserva.pago !== 'pagado')
  const [lineas, setLineas] = useState([])        // consumos: [{ id, nombre, precio, cantidad }]
  const [sel, setSel] = useState('')
  const [otroNombre, setOtroNombre] = useState('')
  const [otroPrecio, setOtroPrecio] = useState('')
  const [pagador, setPagador] = useState(hayTitular ? 'titular' : 'casual') // 'titular' | 'casual'
  const [cobrar, setCobrar] = useState(true)       // true = cobrar ahora (método); false = a cuenta
  const [metodoPago, setMetodoPago] = useState(metodos[0] ?? 'efectivo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/productos', auth).then((d) => setProductos(Array.isArray(d) ? d : [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activos = productos.filter((p) => p.activo)
  const totalConsumos = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const totalTurno = cobrarTurno ? (reserva.monto || 0) : 0
  const total = totalTurno + totalConsumos
  // Casual no puede quedar a cuenta
  const esACuenta = pagador === 'titular' && !cobrar

  const agregarProducto = () => {
    const p = activos.find((x) => x.id === sel); if (!p) return
    setLineas((prev) => {
      const ex = prev.find((l) => l.id === p.id)
      if (ex) return prev.map((l) => l.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l)
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }]
    })
    setSel('')
  }
  const agregarOtro = () => {
    if (!otroNombre.trim() || !(Number(otroPrecio) > 0)) return setError('Completá concepto y monto')
    setLineas((prev) => [...prev, { id: `o-${Date.now()}`, nombre: otroNombre.trim(), precio: Number(otroPrecio), cantidad: 1 }])
    setOtroNombre(''); setOtroPrecio(''); setSel(''); setError('')
  }
  const cambiarCant = (id, d) => setLineas((p) => p.map((l) => l.id === id ? { ...l, cantidad: Math.max(1, l.cantidad + d) } : l))
  const quitar = (id) => setLineas((p) => p.filter((l) => l.id !== id))

  const submit = async () => {
    if (total <= 0) return setError('No hay nada para cobrar')
    if (pagador === 'casual' && esACuenta) return setError('Un casual no puede quedar a cuenta')
    setError(''); setSaving(true)
    try {
      await api.post(`/reservas/${reserva._backendId}/cobrar`, {
        jugadorId: pagador === 'titular' ? reserva.jugadorId : null,
        metodoPago: esACuenta ? null : metodoPago,
        cobrarTurno,
        consumos: lineas.map((l) => ({
          concepto: l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre,
          monto: l.precio * l.cantidad,
        })),
      }, auth)
      onDone(!esACuenta)
    } catch (e) {
      setError(e?.message || 'No se pudo cobrar el turno')
    } finally { setSaving(false) }
  }

  const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">Cobrar turno</p>
            <p className="text-slate-400 text-xs mt-0.5">{reserva.canchaNombre} · {reserva.inicio}–{reserva.fin}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          {/* Turno */}
          <button onClick={() => setCobrarTurno((v) => !v)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${cobrarTurno ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200'}`}>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${cobrarTurno ? 'bg-brand-500 text-white' : 'border border-slate-300'}`}>{cobrarTurno ? '✓' : ''}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Turno</p>
              {reserva.pago === 'pagado' && <p className="text-[11px] text-emerald-600">Ya estaba pagado</p>}
            </div>
            <p className="text-sm font-semibold text-slate-700">{money(reserva.monto || 0)}</p>
          </button>

          {/* Agregar consumición */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Consumiciones</p>
            <div className="flex gap-2">
              <select value={sel} onChange={(e) => setSel(e.target.value)} className={`flex-1 ${inputCls}`}>
                <option value="">Agregar…</option>
                {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {money(p.precio)}</option>)}
                {activos.length > 0 && <option disabled>──────────</option>}
                <option value="__otro__">✏️ Otro (escribir)</option>
              </select>
              {sel !== '__otro__' && <button onClick={agregarProducto} disabled={!sel} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40"><Plus size={16} /></button>}
            </div>
            {sel === '__otro__' && (
              <div className="flex gap-2 mt-2">
                <input value={otroNombre} onChange={(e) => setOtroNombre(e.target.value)} placeholder="Concepto" className={`flex-1 ${inputCls}`} />
                <input type="number" value={otroPrecio} onChange={(e) => setOtroPrecio(e.target.value)} placeholder="$" className={`w-24 ${inputCls}`} />
                <button onClick={agregarOtro} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={16} /></button>
              </div>
            )}
            {lineas.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {lineas.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100">
                    <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">{l.nombre}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => cambiarCant(l.id, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="text-sm font-medium w-5 text-center">{l.cantidad}</span>
                      <button onClick={() => cambiarCant(l.id, +1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={12} /></button>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 w-20 text-right shrink-0">{money(l.precio * l.cantidad)}</p>
                    <button onClick={() => quitar(l.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagador */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">¿Quién paga?</p>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setPagador('titular')} disabled={!hayTitular} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${pagador === 'titular' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>{titularNombre}</button>
              <button onClick={() => { setPagador('casual'); setCobrar(true) }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${pagador === 'casual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Casual / contado</button>
            </div>
          </div>

          {/* Cómo paga */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setCobrar(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${cobrar ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Cobrar ahora</button>
              <button onClick={() => setCobrar(false)} disabled={pagador === 'casual'} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${!cobrar ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Anotar a cuenta</button>
            </div>
            {cobrar && (
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={`w-full ${inputCls}`}>
                {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
              </select>
            )}
          </div>

          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={submit} disabled={saving || total <= 0} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Procesando…' : esACuenta ? `Anotar ${money(total)} a la cuenta` : `Cobrar ${money(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutTurno
