// Overlay "Generando QR…" que tapa la pantalla mientras se crea la orden de cobro (hay un
// ida y vuelta al backend + Mercado Pago). Da mejor toque visual y — importante con plata —
// evita que se vean montos cambiando mientras se prepara el cobro. Cuando el QR está listo,
// quien lo usa apaga este overlay y muestra el QR. Compartido por todas las pantallas de cobro.
export default function QRGenerando({ show }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl flex flex-col items-center gap-3 px-10 py-8">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-slate-700 font-semibold text-sm">Generando QR…</p>
        <p className="text-slate-400 text-xs">Un momento, por favor</p>
      </div>
    </div>
  )
}
