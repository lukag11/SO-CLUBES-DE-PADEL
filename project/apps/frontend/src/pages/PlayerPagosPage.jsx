import { useState, useEffect } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, ArrowDownLeft, Building2 } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

const METODO_CFG = {
  efectivo:     { label: 'Efectivo',      icon: Wallet,        cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  transferencia:{ label: 'Transferencia', icon: ArrowDownLeft, cls: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  mercadopago:  { label: 'Mercado Pago',  icon: Building2,     cls: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
}

const MetodoBadge = ({ metodo }) => {
  const cfg = METODO_CFG[metodo]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.cls}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const PlayerPagosPage = () => {
  const token = usePlayerStore((s) => s.token)
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/cargos/me', { Authorization: `Bearer ${token}` })
      .then((d) => setCargos(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const pendientes = cargos.filter((c) => c.estado === 'pendiente')
  const pagados = cargos.filter((c) => c.estado === 'pagado')
  const saldo = pendientes.reduce((s, c) => s + (c.monto ?? 0), 0)
  const hayVencido = pendientes.some((c) => c.vencido)

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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Mis pagos</h2>
        <p className="text-white/40 text-sm mt-1">Tu estado de cuenta con el club</p>
      </div>

      {/* Resumen del saldo */}
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
      </div>

      {/* Pendientes */}
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

      {/* Historial de pagos */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6">
          <h3 className="text-white font-semibold text-sm">Historial de pagos</h3>
        </div>
        {pagados.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle size={20} className="text-white/15" />
            <p className="text-white/30 text-sm">Todavía no tenés pagos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {pagados.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 font-medium text-sm truncate">{c.concepto}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.pagadoAt && <span className="text-white/30 text-xs">{fmtFecha(c.pagadoAt)}</span>}
                    <MetodoBadge metodo={c.metodoPago} />
                  </div>
                </div>
                <span className="text-emerald-400/80 font-semibold text-sm shrink-0">{money(c.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
