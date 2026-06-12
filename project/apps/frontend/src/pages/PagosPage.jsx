import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DollarSign, AlertTriangle, TrendingUp, Search, Plus, X,
  CheckCircle, Trash2, Clock, Wallet, ArrowDownLeft, Building2,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'
import Toast from '../components/ui/Toast'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const METODOS = [
  { id: 'efectivo', label: 'Efectivo', icon: Wallet },
  { id: 'transferencia', label: 'Transferencia', icon: ArrowDownLeft },
  { id: 'mercadopago', label: 'Mercado Pago', icon: Building2 },
]

const TIPO_LABEL = {
  cancelacion: 'Cancelación',
  manual: 'Manual',
  reserva: 'Reserva',
  torneo: 'Torneo',
}

const FILTROS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'vencido', label: 'Vencidos' },
  { id: 'pagado', label: 'Pagados' },
  { id: 'todos', label: 'Todos' },
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

// ── Modal: registrar cobro (elegir método) ───────────────────────────────────
const ModalCobro = ({ cargo, onConfirm, onClose, saving }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-slate-800 font-bold">Registrar cobro</p>
          <p className="text-slate-400 text-xs mt-0.5">{cargo.concepto} · {money(cargo.monto)}</p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
      </div>
      <div className="p-6 flex flex-col gap-2.5">
        <p className="text-slate-500 text-xs font-medium mb-1">¿Cómo se cobró?</p>
        {METODOS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            disabled={saving}
            onClick={() => onConfirm(id)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left disabled:opacity-50"
          >
            <Icon size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
)

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
            <p className="text-slate-800 font-bold">Eliminar deuda</p>
            <p className="text-slate-400 text-xs mt-0.5">{cargo.concepto} · {money(cargo.monto)}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          Se borra esta deuda de <span className="font-semibold text-slate-700">{cargo.jugador?.nombre} {cargo.jugador?.apellido}</span> como si nunca se hubiera cargado. No se puede deshacer.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  </div>
)

// ── Modal: nuevo cargo manual ─────────────────────────────────────────────────
const ModalNuevoCargo = ({ jugadores, onCreate, onClose, saving }) => {
  const [form, setForm] = useState({ jugadorId: '', concepto: '', monto: '', vencimiento: '' })
  const [error, setError] = useState('')

  const submit = () => {
    if (!form.jugadorId) return setError('Elegí un jugador')
    if (!form.concepto.trim()) return setError('Ingresá un concepto')
    const monto = Number(form.monto)
    if (!Number.isFinite(monto) || monto <= 0) return setError('El monto debe ser mayor a cero')
    setError('')
    onCreate({ ...form, monto })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-slate-800 font-bold">Nuevo cargo manual</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Jugador</label>
            <select
              value={form.jugadorId}
              onChange={(e) => setForm((f) => ({ ...f, jugadorId: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400"
            >
              <option value="">Seleccioná un jugador…</option>
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>{j.nombre} {j.apellido} — DNI {j.dni}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Concepto</label>
            <input
              type="text" value={form.concepto}
              onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
              placeholder="Ej: Alquiler de paletas, multa, etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Monto</label>
              <input
                type="number" value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Vence (opcional)</label>
              <input
                type="date" value={form.vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, vencimiento: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400"
              />
            </div>
          </div>
          {error && <p className="text-rose-500 text-xs">{error}</p>}
          <button
            onClick={submit} disabled={saving}
            className="mt-1 w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Creando…' : 'Crear cargo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
const PagosPage = () => {
  const token = useAuthStore((s) => s.token)
  const [resumen, setResumen] = useState(null)
  const [cargos, setCargos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [search, setSearch] = useState('')
  const [cobrando, setCobrando] = useState(null)   // cargo en proceso de cobro
  const [eliminando, setEliminando] = useState(null) // cargo a eliminar
  const [nuevoCargo, setNuevoCargo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (tipo, message) => { setToast({ tipo, message }); setTimeout(() => setToast(null), 3500) }

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [c, r] = await Promise.all([
        api.get('/cargos', { Authorization: `Bearer ${token}` }),
        api.get('/cargos/resumen', { Authorization: `Bearer ${token}` }),
      ])
      setCargos(Array.isArray(c) ? c : [])
      setResumen(r)
    } catch {
      showToast('error', 'No se pudieron cargar las cobranzas')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  // Jugadores para el selector del modal (lazy, al abrir)
  useEffect(() => {
    if (!nuevoCargo || jugadores.length > 0 || !token) return
    api.get('/jugadores', { Authorization: `Bearer ${token}` })
      .then((data) => setJugadores(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [nuevoCargo, jugadores.length, token])

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cargos.filter((c) => {
      if (filtro === 'vencido' && !c.vencido) return false
      if (filtro === 'pendiente' && c.estado !== 'pendiente') return false
      if (filtro === 'pagado' && c.estado !== 'pagado') return false
      if (filtro === 'condonado' && c.estado !== 'condonado') return false
      if (q) {
        const nombre = `${c.jugador?.nombre ?? ''} ${c.jugador?.apellido ?? ''} ${c.jugador?.dni ?? ''}`.toLowerCase()
        if (!nombre.includes(q)) return false
      }
      return true
    })
  }, [cargos, filtro, search])

  const cobrar = async (metodoPago) => {
    setSaving(true)
    try {
      await api.patch(`/cargos/${cobrando.id}/estado`, { estado: 'pagado', metodoPago }, { Authorization: `Bearer ${token}` })
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
      await api.delete(`/cargos/${eliminando.id}`, { Authorization: `Bearer ${token}` })
      setEliminando(null)
      showToast('exito', 'Deuda eliminada')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo eliminar')
    } finally { setSaving(false) }
  }

  const crearCargo = async (data) => {
    setSaving(true)
    try {
      await api.post('/cargos', data, { Authorization: `Bearer ${token}` })
      setNuevoCargo(false)
      showToast('exito', 'Cargo creado')
      fetchData()
    } catch (err) {
      showToast('error', err?.message || 'No se pudo crear el cargo')
    } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Cobranzas</h2>
          <p className="text-sm text-slate-400 mt-1">Deudas, cobros y estado de cuenta de tus jugadores</p>
        </div>
        <button
          onClick={() => setNuevoCargo(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Nuevo cargo
        </button>
      </div>

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
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador o DNI…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-slate-400">
            <div className="w-4 h-4 rounded-full border-2 border-brand-400/40 border-t-brand-500 animate-spin" />
            <span className="text-sm">Cargando cobranzas…</span>
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={24} className="text-slate-200" />
            <p className="text-slate-400 text-sm">
              {filtro === 'pendiente' ? 'No hay deudas pendientes 🎉' : 'Sin resultados para este filtro'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibles.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-800 font-semibold text-sm truncate">
                      {c.jugador?.nombre} {c.jugador?.apellido}
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
                    {c.estado === 'pagado' && c.metodoPago && ` · ${c.metodoPago}`}
                  </p>
                </div>

                <p className="text-slate-800 font-bold text-sm shrink-0">{money(c.monto)}</p>

                <div className="shrink-0 w-[180px] flex items-center justify-end gap-2">
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
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle size={12} /> Pagado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cobrando && <ModalCobro cargo={cobrando} onConfirm={cobrar} onClose={() => setCobrando(null)} saving={saving} />}
      {eliminando && <ModalEliminar cargo={eliminando} onConfirm={eliminar} onClose={() => setEliminando(null)} saving={saving} />}
      {nuevoCargo && <ModalNuevoCargo jugadores={jugadores} onCreate={crearCargo} onClose={() => setNuevoCargo(false)} saving={saving} />}

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
