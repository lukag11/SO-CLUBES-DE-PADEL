import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Minus, X, ShoppingCart, Clock, Trash2, Users, AlertTriangle, FileText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../../lib/api'
import { METODO_MAP } from '../../lib/metodosPago'
import { imprimirTicket, ticketTexto, enviarWhatsApp } from './comprobantes'
import useClubStore from '../../store/clubStore'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'
const nombreBase = (concepto) => String(concepto || '').replace(/^\d+×\s*/, '')

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
  const club = useClubStore((s) => s.club)
  const [items, setItems] = useState(mesa.cargos ?? [])
  const [addOpen, setAddOpen] = useState(false)
  const [cerrada, setCerrada] = useState(null) // ticket tras cobrar (para imprimir / WhatsApp)
  const [metodoPago, setMetodoPago] = useState(metodos[0] ?? 'efectivo')
  const [dividir, setDividir] = useState(1)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false) // candado SÍNCRONO anti doble-submit
  const [error, setError] = useState('')
  const [mpQR, setMpQR] = useState(null) // { initPoint, monto } cuando se generó el QR de MP (link)
  const [walletQR, setWalletQR] = useState(null) // { pagoMpId, qrImage, monto } QR de billetera interoperable
  const total = items.reduce((s, c) => s + c.monto, 0)

  const refetch = async () => {
    try {
      const abiertas = await api.get('/comandas?estado=abierta', auth)
      const m = abiertas.find((x) => x.id === mesa.id)
      setItems(m?.cargos ?? [])
    } catch { /* */ }
    onChange?.()
  }

  const cambiarCant = async (c, nuevaCant) => {
    if (nuevaCant < 1) return quitar(c.id)
    setSaving(true)
    try { await api.patch(`/comandas/${mesa.id}/items/${c.id}`, { cantidad: nuevaCant }, auth); await refetch() }
    catch (e) { setError(e?.message || 'No se pudo cambiar la cantidad') } finally { setSaving(false) }
  }
  const quitar = async (cargoId) => {
    setSaving(true)
    try { await api.delete(`/comandas/${mesa.id}/items/${cargoId}`, auth); await refetch() }
    catch (e) { setError(e?.message || 'No se pudo quitar') } finally { setSaving(false) }
  }
  const cerrar = async () => {
    if (savingRef.current) return
    if (total <= 0) return setError('La mesa no tiene consumos')
    savingRef.current = true
    setSaving(true); setError('')
    try {
      await api.post(`/comandas/${mesa.id}/cerrar`, { metodoPago }, auth)
      const ticket = {
        etiqueta: mesa.etiqueta, total, metodoLabel: METODO_MAP[metodoPago]?.label ?? metodoPago, fecha: new Date(),
        items: items.map((c) => ({ nombre: nombreBase(c.concepto), cantidad: c.cantidad || 1, monto: c.monto })),
      }
      showToast('exito', 'Mesa cobrada y cerrada'); setCerrada(ticket)
    } catch (e) { setError(e?.message || 'No se pudo cerrar') } finally { savingRef.current = false; setSaving(false) }
  }
  const eliminarMesa = async () => {
    setSaving(true)
    try { await api.delete(`/comandas/${mesa.id}`, auth); showToast('exito', 'Mesa descartada'); onCerrada() }
    catch (e) { setError(e?.message || 'No se pudo eliminar'); setSaving(false) }
  }
  // MP: genera un QR por el total de la mesa. La mesa queda ABIERTA hasta que el cliente pague
  // (el webhook la cierra sola). No cobra en el acto (nada de income fantasma).
  const generarQRMesa = async () => {
    if (savingRef.current) return
    if (total <= 0) return setError('La mesa no tiene consumos')
    savingRef.current = true
    setSaving(true); setError('')
    try {
      const r = await api.post(`/comandas/${mesa.id}/link-pago`, {}, auth)
      setMpQR({ initPoint: r.initPoint, monto: r.monto ?? total })
    } catch (e) {
      setError(e?.status === 503 ? 'Mercado Pago no está configurado todavía' : (e?.message || 'No se pudo generar el QR'))
    } finally { savingRef.current = false; setSaving(false) }
  }

  // QR de billetera interoperable por el total de la mesa (cualquier billetera). La mesa se cierra
  // sola cuando el webhook acredita. Distinto del link de Checkout Pro (generarQRMesa).
  const generarQRBilleteraMesa = async () => {
    if (savingRef.current) return
    if (total <= 0) return setError('La mesa no tiene consumos')
    savingRef.current = true
    setSaving(true); setError('')
    try {
      const r = await api.post(`/comandas/${mesa.id}/qr-cobrar`, {}, auth)
      setWalletQR({ pagoMpId: r.pagoMpId, qrImage: r.qrImage, monto: r.monto ?? total })
    } catch (e) {
      setError(e?.status === 503 ? 'Mercado Pago no está configurado todavía' : (e?.message || 'No se pudo generar el QR'))
    } finally { savingRef.current = false; setSaving(false) }
  }

  // Mientras el QR de billetera está en pantalla, preguntamos cada 3s si pagaron. Al acreditar, el
  // webhook ya cerró la mesa → mostramos el ticket de cobrada.
  useEffect(() => {
    const id = walletQR?.pagoMpId
    if (!id) return
    let vivo = true
    const timer = setInterval(async () => {
      try {
        const r = await api.get(`/pagos/qr/${id}/estado`, auth)
        if (!vivo) return
        if (r?.pagado) {
          clearInterval(timer)
          setWalletQR(null)
          const ticket = { etiqueta: mesa.etiqueta, total, metodoLabel: 'QR de billetera', fecha: new Date(), items: items.map((c) => ({ nombre: nombreBase(c.concepto), cantidad: c.cantidad || 1, monto: c.monto })) }
          showToast('exito', 'Mesa cobrada y cerrada'); onChange?.(); setCerrada(ticket)
        }
      } catch { /* reintenta */ }
    }, 3000)
    return () => { vivo = false; clearInterval(timer) }
  }, [walletQR?.pagoMpId]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <button onClick={() => (cerrada ? onCerrada() : onClose())} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        {cerrada ? (
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">✓</div>
            <div>
              <p className="text-slate-800 font-bold">Cobrado {money(cerrada.total)}</p>
              <p className="text-slate-400 text-xs mt-0.5">{cerrada.etiqueta} · {cerrada.metodoLabel}</p>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={() => imprimirTicket(cerrada, club)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"><FileText size={15} /> Imprimir ticket</button>
              <button onClick={() => enviarWhatsApp(ticketTexto(cerrada, club))} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:brightness-95 text-white font-semibold text-sm">WhatsApp</button>
            </div>
            <button onClick={onCerrada} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm">Listo</button>
          </div>
        ) : walletQR ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl">📲</div>
            <div>
              <p className="text-slate-800 font-bold">Escaneá para pagar</p>
              <p className="text-slate-400 text-xs mt-0.5">{mesa.etiqueta} · {money(walletQR.monto)}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200"><img src={walletQR.qrImage} alt="QR de pago" width={188} height={188} className="w-[188px] h-[188px] object-contain" /></div>
            <p className="text-[11px] text-violet-500 font-semibold leading-snug">MODO, Ualá, Naranja X, tu banco o Mercado Pago.</p>
            <p className="text-[11px] text-slate-400 leading-snug">La mesa se cierra <b>sola</b> cuando el cliente pague. Esperando el pago…</p>
            <button onClick={() => setWalletQR(null)} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm">Cerrar</button>
          </div>
        ) : mpQR ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-2xl">📱</div>
            <div>
              <p className="text-slate-800 font-bold">Escaneá para pagar</p>
              <p className="text-slate-400 text-xs mt-0.5">{mesa.etiqueta} · {money(mpQR.monto)}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200"><QRCodeSVG value={mpQR.initPoint} size={188} level="M" /></div>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-500 break-all">{mpQR.initPoint}</div>
            <div className="flex gap-2 w-full">
              <button onClick={() => { navigator.clipboard?.writeText(mpQR.initPoint); showToast('exito', 'Link copiado') }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm">Copiar</button>
              <button onClick={() => enviarWhatsApp(`Podés pagar la mesa (${money(mpQR.monto)}) con este link de Mercado Pago:\n${mpQR.initPoint}`)} className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:brightness-95 text-white font-semibold text-sm">WhatsApp</button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">La mesa se cierra <b>sola</b> cuando el cliente escanee y pague. Queda abierta hasta entonces.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm">Listo</button>
          </div>
        ) : (<>
        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          {/* ── En la mesa (lo cargado) ── */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1.5"><ShoppingCart size={13} className="text-brand-500" /> En la mesa</p>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Todavía sin consumos. Agregá desde el menú de abajo 👇</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-50/60 border border-brand-100">
                    <p className="flex-1 min-w-0 text-sm font-medium text-slate-700 truncate">{nombreBase(c.concepto)}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => cambiarCant(c, (c.cantidad || 1) - 1)} disabled={saving} className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="text-sm font-semibold w-5 text-center">{c.cantidad || 1}</span>
                      <button onClick={() => cambiarCant(c, (c.cantidad || 1) + 1)} disabled={saving} className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Plus size={12} /></button>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 w-20 text-right shrink-0">{money(c.monto)}</p>
                    <button onClick={() => quitar(c.id)} disabled={saving} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Abrir el menú para agregar (pantalla aparte, estilo comanda) */}
          <button onClick={() => setAddOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-brand-300 text-brand-600 hover:bg-brand-50/50 font-semibold text-sm transition-colors">
            <Plus size={16} /> Agregar productos
          </button>

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
            {metodoPago === 'mercadopago' ? (
              <>
                <button onClick={generarQRMesa} disabled={saving || total <= 0} title="Link/QR de Checkout Pro de Mercado Pago; la mesa se cierra sola cuando el cliente paga" className="flex-1 min-w-0 py-2.5 rounded-xl border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold text-sm transition-colors disabled:opacity-40">
                  {saving ? '…' : 'Link de pago'}
                </button>
                <button onClick={generarQRBilleteraMesa} disabled={saving || total <= 0} title="QR que el cliente escanea con CUALQUIER billetera (MODO, Ualá, banco, Mercado Pago…). La mesa se cierra sola al pagar." className="flex-1 min-w-0 py-2.5 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 font-semibold text-sm transition-colors disabled:opacity-40">
                  {saving ? '…' : 'QR billetera'}
                </button>
              </>
            ) : (
              <button onClick={cerrar} disabled={saving || total <= 0} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {saving ? 'Procesando…' : `Cobrar y cerrar ${money(total)}`}
              </button>
            )}
          </div>
        </div>
        </>)}
      </div>

      {addOpen && <ModalAgregarProductos mesa={mesa} productos={productos} token={token}
        onClose={() => setAddOpen(false)} onAgregado={() => { setAddOpen(false); refetch() }} />}
    </div>
  )
}

// ─── Pantalla de pedido (estilo comanda): armás varios ítems y entran juntos ────
const ModalAgregarProductos = ({ mesa, productos, token, onClose, onAgregado }) => {
  const auth = { Authorization: `Bearer ${token}` }
  const [q, setQ] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todos')
  const [cart, setCart] = useState([]) // [{ key, nombre, precio, productoId, cantidad }]
  const [otroOpen, setOtroOpen] = useState(false)
  const [otroNombre, setOtroNombre] = useState('')
  const [otroPrecio, setOtroPrecio] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activos = productos.filter((p) => p.activo)
  const cats = ['Todos', ...new Set(activos.map((p) => p.categoria || 'Otros'))]
  const term = q.trim().toLowerCase()
  const visibles = activos.filter((p) => (catFiltro === 'Todos' || (p.categoria || 'Otros') === catFiltro) && (!term || p.nombre.toLowerCase().includes(term)))
  const cantDe = (productoId) => cart.find((c) => c.productoId === productoId)?.cantidad || 0
  const totalCart = cart.reduce((s, c) => s + c.precio * c.cantidad, 0)
  const totalItems = cart.reduce((s, c) => s + c.cantidad, 0)

  const addProd = (p) => setCart((c) => {
    const ex = c.find((x) => x.productoId === p.id)
    if (ex) return c.map((x) => x.productoId === p.id ? { ...x, cantidad: x.cantidad + 1 } : x)
    return [...c, { key: p.id, nombre: p.nombre, precio: p.precio, productoId: p.id, cantidad: 1 }]
  })
  const cambiar = (key, d) => setCart((c) => c.flatMap((x) => x.key === key ? (x.cantidad + d <= 0 ? [] : [{ ...x, cantidad: x.cantidad + d }]) : [x]))
  const addOtro = () => {
    if (!otroNombre.trim() || !(Number(otroPrecio) > 0)) return setError('Completá concepto y monto')
    setCart((c) => [...c, { key: `o-${Date.now()}`, nombre: otroNombre.trim(), precio: Number(otroPrecio), productoId: null, cantidad: 1 }])
    setOtroNombre(''); setOtroPrecio(''); setOtroOpen(false); setError('')
  }
  const confirmar = async () => {
    if (cart.length === 0) return onClose()
    setSaving(true); setError('')
    try {
      await api.post(`/comandas/${mesa.id}/items`, { items: cart.map((c) => ({ nombre: c.nombre, precioUnit: c.precio, cantidad: c.cantidad, productoId: c.productoId })) }, auth)
      onAgregado()
    } catch (e) { setError(e?.message || 'No se pudo agregar el pedido'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div><p className="text-slate-800 font-bold">Agregar al pedido</p><p className="text-slate-400 text-xs mt-0.5">{mesa.etiqueta}</p></div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4 shrink-0 flex flex-col gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className={`w-full ${inputCls}`} />
          <div className="flex gap-1.5 flex-wrap">
            {cats.map((cat) => (
              <button key={cat} onClick={() => setCatFiltro(cat)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${catFiltro === cat ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-3 grid grid-cols-2 gap-2">
          {visibles.length === 0 ? <p className="col-span-2 text-xs text-slate-400 py-2 text-center">Sin productos.</p> : visibles.map((p) => {
            const n = cantDe(p.id)
            return (
              <button key={p.id} onClick={() => addProd(p)} className={`relative flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${n > 0 ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300'}`}>
                <span className="text-sm font-medium text-slate-700 truncate w-full">{p.nombre}</span>
                <span className="text-xs text-slate-400">{money(p.precio)}{p.controlaStock ? ` · ${p.stock} u.` : ''}</span>
                {n > 0 && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">{n}</span>}
              </button>
            )
          })}
          {otroOpen ? (
            <div className="col-span-2 flex gap-2">
              <input autoFocus value={otroNombre} onChange={(e) => setOtroNombre(e.target.value)} placeholder="Concepto" className={`flex-1 ${inputCls}`} />
              <input type="number" value={otroPrecio} onChange={(e) => setOtroPrecio(e.target.value)} placeholder="$" className={`w-24 ${inputCls}`} />
              <button onClick={addOtro} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setOtroOpen(true)} className="col-span-2 text-xs text-brand-600 hover:text-brand-700 font-medium w-fit">✏️ Otro (ítem manual)</button>
          )}
        </div>

        {/* Seleccionados */}
        {cart.length > 0 && (
          <div className="px-6 py-2 border-t border-slate-100 shrink-0 max-h-36 overflow-y-auto flex flex-col gap-1">
            {cart.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-slate-600">{c.nombre}</span>
                <button onClick={() => cambiar(c.key, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={12} /></button>
                <span className="w-5 text-center font-medium">{c.cantidad}</span>
                <button onClick={() => cambiar(c.key, +1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={12} /></button>
                <span className="w-16 text-right font-semibold text-slate-700">{money(c.precio * c.cantidad)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-col gap-2">
          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button onClick={confirmar} disabled={saving || cart.length === 0} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Agregando…' : cart.length === 0 ? 'Elegí productos' : `Agregar ${totalItems} ítem${totalItems !== 1 ? 's' : ''} · ${money(totalCart)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VentasTab
