import { Wallet, ArrowDownLeft, Building2, CreditCard, MoreHorizontal } from 'lucide-react'

// Catálogo de métodos de cobro que soporta el sistema.
// Cada club habilita los que usa (club.metodosPago). El default son efectivo + transferencia.
export const METODOS_CATALOGO = [
  { id: 'efectivo',      label: 'Efectivo',           icon: Wallet,          desc: 'Pago en mano / caja' },
  { id: 'transferencia', label: 'Transferencia',      icon: ArrowDownLeft,   desc: 'CBU/CVU o QR de transferencia — cae a tu banco' },
  { id: 'mercadopago',   label: 'Mercado Pago',       icon: Building2,       desc: 'QR, link o Point de MP — cae a tu cuenta MP (con comisión)' },
  { id: 'debito',        label: 'Tarjeta de débito',  icon: CreditCard,      desc: 'Pago con débito' },
  { id: 'credito',       label: 'Tarjeta de crédito', icon: CreditCard,      desc: 'Pago con crédito' },
  { id: 'otro',          label: 'Otro',               icon: MoreHorizontal,  desc: 'Cualquier otro medio' },
]

export const METODO_MAP = Object.fromEntries(METODOS_CATALOGO.map((m) => [m.id, m]))

export const DEFAULT_METODOS = ['efectivo', 'transferencia']

// Devuelve la config de métodos habilitados de un club, con fallback al default.
export const metodosDelClub = (club) => {
  const ids = club?.metodosPago
  if (Array.isArray(ids) && ids.length > 0) return ids
  return DEFAULT_METODOS
}

const BADGE_CLS = {
  efectivo:      { light: 'text-emerald-700 bg-emerald-50 border-emerald-200',  dark: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  transferencia: { light: 'text-sky-700 bg-sky-50 border-sky-200',              dark: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  mercadopago:   { light: 'text-blue-700 bg-blue-50 border-blue-200',           dark: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
  debito:        { light: 'text-violet-700 bg-violet-50 border-violet-200',     dark: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  credito:       { light: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200',  dark: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/20' },
  otro:          { light: 'text-slate-600 bg-slate-100 border-slate-200',       dark: 'text-white/50 bg-white/5 border-white/10' },
}

// Badge visual de un método. theme: 'light' (admin) | 'dark' (jugador).
export const MetodoBadge = ({ metodo, theme = 'light' }) => {
  const m = METODO_MAP[metodo]
  if (!m) return null
  const Icon = m.icon
  const cls = BADGE_CLS[metodo]?.[theme] ?? BADGE_CLS.otro[theme]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cls}`}>
      <Icon size={10} /> {m.label}
    </span>
  )
}
