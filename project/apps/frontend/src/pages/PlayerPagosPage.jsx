import { useState, useEffect, useMemo } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useClubStore from '../store/clubStore'
import { api } from '../lib/api'
import { MetodoBadge, METODO_MAP } from '../lib/metodosPago'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// Rubros de consumo (derivados del `tipo` de cada cargo). Los tipos desconocidos caen en "otros".
const RUBROS = {
  reserva:     { label: 'Canchas',       icon: '🎾' },
  torneo:      { label: 'Torneos',       icon: '🏆' },
  venta:       { label: 'Kiosco',        icon: '🥤' },
  cancelacion: { label: 'Cancelaciones', icon: '↩️' },
  otros:       { label: 'Otros',         icon: '📝' },
}
const rubroDe = (tipo) => (RUBROS[tipo] ? tipo : 'otros')

const PERIODOS = [
  { id: 'mes',  label: 'Este mes' },
  { id: '12m',  label: 'Últimos 12M' },
  { id: 'todo', label: 'Todo' },
]

const PlayerPagosPage = () => {
  const token = usePlayerStore((s) => s.token)
  // Flag del club (config): si el dueño apaga el resumen de consumo, el jugador ve solo
  // saldo + pendientes + historial (sin el número grande de "cuánto gastaste"). Default: ON.
  const mostrarConsumo = useClubStore((s) => s.club?.mostrarConsumoJugador) !== false
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('12m')
  const [rubro, setRubro] = useState(null) // null = todos
  const [metodoFiltro, setMetodoFiltro] = useState(null) // null = todos
  const [pagando, setPagando] = useState(false)
  const [pagoError, setPagoError] = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/cargos/me', { Authorization: `Bearer ${token}` })
      .then((d) => setCargos(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const pendientes = cargos.filter((c) => c.estado === 'pendiente')
  const saldo = pendientes.reduce((s, c) => s + (c.monto ?? 0), 0)
  const hayVencido = pendientes.some((c) => c.vencido)

  // El jugador paga TODO su saldo con Mercado Pago. El backend arma el link con SUS deudas
  // (jugadorId del token) y lo mandamos al checkout. La deuda se salda sola por webhook.
  const pagarConMP = async () => {
    setPagando(true); setPagoError('')
    try {
      const r = await api.post('/pagos/me/link-pago', {}, { Authorization: `Bearer ${token}` })
      if (r?.initPoint) { window.location.href = r.initPoint; return }
      throw new Error('No se pudo generar el pago')
    } catch (e) {
      setPagoError(e?.status === 503 ? 'El club todavía no tiene Mercado Pago habilitado.' : (e?.message || 'No se pudo generar el pago'))
      setPagando(false)
    }
  }

  // Consumo = cargos PAGADOS. El período filtra por la fecha de pago (o de creación como fallback).
  const enPeriodo = (item) => {
    if (periodo === 'todo') return true
    const raw = item.pagadoAt || item.fecha
    if (!raw) return false
    const d = new Date(raw)
    const now = new Date()
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    // 12m
    const limite = new Date(); limite.setMonth(limite.getMonth() - 12)
    return d >= limite
  }

  const pagadosPeriodo = useMemo(
    () => cargos.filter((c) => c.estado === 'pagado' && (!mostrarConsumo || enPeriodo(c))),
    [cargos, periodo, mostrarConsumo],
  )

  // Subtotal por rubro (sobre TODO el período, sin el filtro de rubro) + total.
  const { porRubro, totalPeriodo } = useMemo(() => {
    const acc = {}
    let total = 0
    for (const c of pagadosPeriodo) {
      const k = rubroDe(c.tipo)
      acc[k] = (acc[k] || 0) + (c.monto ?? 0)
      total += c.monto ?? 0
    }
    // Orden fijo según RUBROS, solo los que tienen monto.
    const porRubro = Object.keys(RUBROS)
      .filter((k) => acc[k] > 0)
      .map((k) => ({ key: k, ...RUBROS[k], monto: acc[k] }))
    return { porRubro, totalPeriodo: total }
  }, [pagadosPeriodo, rubro])

  // Subtotal por medio de pago (para "che, ¿cómo te pagué?"). Solo métodos con monto.
  const porMetodo = useMemo(() => {
    const acc = {}
    for (const c of pagadosPeriodo) {
      if (!c.metodoPago || !METODO_MAP[c.metodoPago]) continue
      acc[c.metodoPago] = (acc[c.metodoPago] || 0) + (c.monto ?? 0)
    }
    return Object.keys(acc).map((id) => ({ id, label: METODO_MAP[id].label, icon: METODO_MAP[id].icon, monto: acc[id] }))
  }, [pagadosPeriodo])

  // Historial: período + rubro + medio de pago (todos combinables).
  const hayFiltro = !!rubro || !!metodoFiltro
  const historial = pagadosPeriodo.filter(
    (c) => (!rubro || rubroDe(c.tipo) === rubro) && (!metodoFiltro || c.metodoPago === metodoFiltro),
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-7 w-40 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{mostrarConsumo ? 'Mi consumo' : 'Mis pagos'}</h2>
        <p className="text-white/40 text-sm mt-1">
          {mostrarConsumo ? 'Lo que gastás en el club y tu estado de cuenta' : 'Tu estado de cuenta con el club'}
        </p>
      </div>

      {/* Resumen del saldo (deuda visible arriba, sin importar el filtro) */}
      <div className={`rounded-2xl border p-6 ${
        saldo > 0
          ? (hayVencido ? 'border-red-500/25 bg-red-500/5' : 'border-amber-500/25 bg-amber-500/5')
          : 'border-emerald-500/25 bg-emerald-500/5'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            saldo > 0 ? (hayVencido ? 'bg-red-500/15' : 'bg-amber-500/15') : 'bg-emerald-500/15'
          }`}>
            <Wallet size={22} className={saldo > 0 ? (hayVencido ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'} />
          </div>
          <div className="flex-1">
            {saldo > 0 ? (
              <>
                <p className="text-white/40 text-xs">Saldo pendiente</p>
                <p className={`text-3xl font-black ${hayVencido ? 'text-red-400' : 'text-amber-400'}`}>{money(saldo)}</p>
                <p className="text-white/35 text-xs mt-0.5">Acercate al club para regularizar tu cuenta.</p>
              </>
            ) : (
              <>
                <p className="text-emerald-300 text-lg font-bold">Estás al día</p>
                <p className="text-white/35 text-xs mt-0.5">No tenés pagos pendientes con el club.</p>
              </>
            )}
          </div>
        </div>
        {saldo > 0 && (
          <div className="mt-5">
            <button onClick={pagarConMP} disabled={pagando} className="w-full py-3 rounded-xl bg-[#009ee3] hover:brightness-95 text-white font-bold text-sm transition-all disabled:opacity-50">
              {pagando ? 'Generando pago…' : `Pagar con Mercado Pago · ${money(saldo)}`}
            </button>
            {pagoError && <p className="text-red-400 text-xs mt-2 text-center">{pagoError}</p>}
          </div>
        )}
      </div>

      {/* Pendientes (siempre visibles, sin filtrar — es deuda) */}
      {pendientes.length > 0 && (
        <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/6">
            <h3 className="text-white font-semibold text-sm">Pendientes</h3>
          </div>
          <div className="divide-y divide-white/5">
            {pendientes.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{c.concepto}</p>
                  <p className="text-xs mt-0.5">
                    {c.vencido
                      ? <span className="text-red-400 font-medium flex items-center gap-1"><Clock size={11} /> Vencido</span>
                      : <span className="text-white/35">{c.vencimiento ? `Vence ${fmtFecha(c.vencimiento)}` : 'Sin vencimiento'}</span>}
                  </p>
                </div>
                <span className="text-white font-bold text-sm shrink-0">{money(c.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de consumo (analítica) — gateado por el flag del club.
          Apagado: el jugador ve solo saldo + pendientes + historial simple. */}
      {mostrarConsumo && (<>
      {/* Filtros: período + medio de pago, agrupados como una sola unidad */}
      <div className="flex flex-col gap-2.5">
        {/* Período */}
        <div className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-xl p-1 self-start">
          {PERIODOS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPeriodo(id)}
              className={[
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                periodo === id ? 'bg-club/15 text-club' : 'text-white/40 hover:text-white/70',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Medio de pago: subtotal + filtro rápido ("¿cómo te pagué?") */}
        {porMetodo.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-white/30 text-[11px] font-medium uppercase tracking-wide">Medio de pago</span>
            <div className="flex items-center gap-2 flex-wrap">
              {porMetodo.map((m) => {
                const activo = metodoFiltro === m.id
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setMetodoFiltro(activo ? null : m.id)}
                    className={[
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      activo ? 'bg-club/15 text-club border-club/30' : 'text-white/50 border-white/10 hover:text-white/80 hover:border-white/20',
                    ].join(' ')}
                  >
                    <Icon size={12} /> {m.label} <span className="opacity-60">{money(m.monto)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Consumo por rubro (los subtotales son el filtro: click = drill al historial) */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between gap-3">
          <h3 className="text-white font-semibold text-sm">Consumo del período</h3>
          <span className="text-club font-black text-lg">{money(totalPeriodo)}</span>
        </div>
        {porRubro.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle size={20} className="text-white/15" />
            <p className="text-white/30 text-sm">Sin consumo en este período</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {porRubro.map((r) => {
              const activo = rubro === r.key
              return (
                <button
                  key={r.key}
                  onClick={() => setRubro(activo ? null : r.key)}
                  className={`w-full px-5 py-3 flex items-center gap-3 text-left transition-colors ${activo ? 'bg-club/8' : 'hover:bg-white/3'}`}
                >
                  <span className="text-base shrink-0">{r.icon}</span>
                  <span className={`flex-1 text-sm font-medium ${activo ? 'text-club' : 'text-white/70'}`}>{r.label}</span>
                  <span className={`text-sm font-semibold shrink-0 ${activo ? 'text-club' : 'text-white/80'}`}>{money(r.monto)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial (filtrado por período + rubro) */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between gap-3">
          <h3 className="text-white font-semibold text-sm">
            Historial{rubro ? ` · ${RUBROS[rubro].label}` : ''}{metodoFiltro ? ` · ${METODO_MAP[metodoFiltro].label}` : ''}
          </h3>
          {hayFiltro && (
            <button onClick={() => { setRubro(null); setMetodoFiltro(null) }} className="text-club text-xs font-semibold hover:underline">
              Ver todo
            </button>
          )}
        </div>
        {historial.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle size={20} className="text-white/15" />
            <p className="text-white/30 text-sm">
              {hayFiltro ? 'Sin consumo con ese filtro en el período' : 'Todavía no tenés pagos registrados'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {historial.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-sm">
                  {RUBROS[rubroDe(c.tipo)].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 font-medium text-sm truncate">{c.concepto}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(c.pagadoAt || c.fecha) && <span className="text-white/30 text-xs">{fmtFecha(c.pagadoAt || c.fecha)}</span>}
                    <MetodoBadge metodo={c.metodoPago} theme="dark" />
                  </div>
                </div>
                <span className="text-emerald-400/80 font-semibold text-sm shrink-0">{money(c.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>)}

      {/* Nota informativa */}
      <div className="flex items-start gap-2.5 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
        <AlertCircle size={14} className="text-white/30 shrink-0 mt-0.5" />
        <p className="text-white/35 text-xs leading-relaxed">
          Los pagos se gestionan en el club. Cuando abones, el club registra el cobro y se actualiza acá automáticamente.
        </p>
      </div>
    </div>
  )
}

export default PlayerPagosPage
