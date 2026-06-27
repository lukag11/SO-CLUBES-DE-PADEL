import { useState } from 'react'
import { Search, X, Check, Copy, Loader2, UserPlus, Users } from 'lucide-react'
import { api } from '../../lib/api'
import usePlayerStore from '../../store/playerStore'
import { CATEGORIAS_JUGADOR, catLabel } from '../../constants/categorias'

// Modal "Busco jugador/pareja" (caso 2). Se puede abrir suelto o pre-llenado desde una reserva
// (prefill: { fecha, horaInicio, nota, reservaId }). Notifica a las categorías elegidas (rango).
export default function BuscarJugadorModal({ token, prefill = {}, onClose, onCreado }) {
  const miCategoria = usePlayerStore((s) => s.player?.categoria)
  const [form, setForm] = useState({
    busco: 'jugador',
    cupos: 1, // cuántos faltan (solo aplica a 'jugador'; 'pareja' = 2 fijo en el backend)
    visibilidad: 'publica', // 'publica' = avisa a tu categoría (app) | 'privada' = solo por link (tu grupo)
    fecha: prefill.fecha || '',
    horaInicio: prefill.horaInicio || '',
    categorias: miCategoria ? [miCategoria] : [], // tu categoría preseleccionada; podés sumar las cercanas
    nota: prefill.nota || '',
  })
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCat = (c) => setForm((f) => ({ ...f, categorias: f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c] }))
  const bloqueadoFechaHora = !!(prefill.fecha && prefill.horaInicio) // viene de una reserva

  const crear = () => {
    setError('')
    if (!form.fecha) return setError('Elegí la fecha.')
    if (!form.horaInicio) return setError('Elegí el horario.')
    setCreando(true)
    api.post('/solicitudes', {
      busco: form.busco, cupos: form.cupos, visibilidad: form.visibilidad, fecha: form.fecha, horaInicio: form.horaInicio,
      categorias: form.categorias, nota: form.nota || null, reservaId: prefill.reservaId || null,
    }, { Authorization: `Bearer ${token}` })
      .then((r) => setRes(r))
      .catch((e) => setError(e?.message || 'No se pudo crear la búsqueda'))
      .finally(() => setCreando(false))
  }
  const copiar = () => navigator.clipboard?.writeText(res?.mensajeWhatsapp || '').then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }).catch(() => {})

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
          <h3 className="text-white font-bold flex items-center gap-2"><Search size={18} className="text-club" /> Busco para jugar</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {res ? (
          <div className="p-5 flex flex-col gap-3 overflow-y-auto">
            <p className="text-sm font-semibold text-club flex items-center gap-1.5"><Check size={16} /> ¡Búsqueda enviada!{res.notificados ? ` Avisamos a ${res.notificados} jugador${res.notificados !== 1 ? 'es' : ''} de tu categoría.` : ''}</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-club mb-1.5">Mensaje para el grupo</p>
              <p className="text-[13px] text-white/85 whitespace-pre-wrap leading-relaxed">{res.mensajeWhatsapp}</p>
              <button onClick={copiar} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-club hover:opacity-80">
                {copiado ? <><Check size={12} /> ¡Copiado!</> : <><Copy size={12} /> Copiar</>}
              </button>
            </div>
            <button onClick={onCreado} className="py-3 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all">Listo</button>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-3.5 overflow-y-auto">
            {/* Qué busco */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">¿Qué buscás?</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => set('busco', 'jugador')} className={`py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-1.5 ${form.busco === 'jugador' ? 'border-club bg-club/10 text-club' : 'border-white/10 text-white/50'}`}>
                  <UserPlus size={15} /> Un jugador
                </button>
                <button onClick={() => set('busco', 'pareja')} className={`py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-1.5 ${form.busco === 'pareja' ? 'border-club bg-club/10 text-club' : 'border-white/10 text-white/50'}`}>
                  <Users size={15} /> Una pareja
                </button>
              </div>
              <p className="text-[11px] text-white/35 mt-1">{form.busco === 'pareja' ? 'Estás con tu compañero y buscás una pareja para jugar en contra.' : 'Te faltan jugadores para completar el partido.'}</p>
            </div>

            {/* Cuántos faltan — solo para "un jugador" (una pareja = 2 fijo) */}
            {form.busco === 'jugador' && (
              <div>
                <label className="text-xs font-semibold text-white/50 mb-1 block">¿Cuántos te faltan?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => set('cupos', n)} className={`py-2 rounded-xl text-sm font-bold border transition-all ${form.cupos === n ? 'border-club bg-club text-dark-900' : 'border-white/10 text-white/60 hover:border-club/50'}`}>{n}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-white/50 mb-1 block">Fecha</label>
                <input type="date" min={new Date().toLocaleDateString('en-CA')} value={form.fecha} disabled={bloqueadoFechaHora} onChange={(e) => set('fecha', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-club focus:outline-none [color-scheme:dark] disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 mb-1 block">Horario</label>
                <input type="time" value={form.horaInicio} disabled={bloqueadoFechaHora} onChange={(e) => set('horaInicio', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-club focus:outline-none [color-scheme:dark] disabled:opacity-60" />
              </div>
            </div>
            {bloqueadoFechaHora && <p className="text-[11px] text-white/30 -mt-2">Día y horario de tu reserva.</p>}

            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Categorías <span className="font-normal text-white/30">(tu categoría va sola; sumá las cercanas si querés)</span></label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIAS_JUGADOR.map((c) => (
                  <button key={c} onClick={() => toggleCat(c)} className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.categorias.includes(c) ? 'border-club bg-club text-dark-900' : 'border-white/10 text-white/60 hover:border-club/50'}`}>{catLabel(c)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">Nota <span className="font-normal text-white/30">(opcional)</span></label>
              <input value={form.nota} onChange={(e) => set('nota', e.target.value)} maxLength={80} placeholder="Ej: Cancha 2, falta drive"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-club focus:outline-none placeholder:text-white/25" />
            </div>

            {/* ¿Quién lo ve? — mismo criterio que Americano/Super 8. Todo el aviso es por la app. */}
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1 block">¿Quién lo ve?</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => set('visibilidad', 'publica')} className={`py-2 px-2 rounded-lg text-left border transition-all ${form.visibilidad === 'publica' ? 'border-club bg-club/10' : 'border-white/10'}`}>
                  <p className="text-sm font-semibold text-white/90">🌐 Público</p>
                  <p className="text-[10px] text-white/35">Se avisa a tu categoría por la app</p>
                </button>
                <button onClick={() => set('visibilidad', 'privada')} className={`py-2 px-2 rounded-lg text-left border transition-all ${form.visibilidad === 'privada' ? 'border-club bg-club/10' : 'border-white/10'}`}>
                  <p className="text-sm font-semibold text-white/90">🔒 Privado</p>
                  <p className="text-[10px] text-white/35">Solo por link, para tu grupo</p>
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-1">El aviso y las invitaciones se envían dentro de la app.</p>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={crear} disabled={creando} className="py-3 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {creando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {creando ? 'Enviando…' : (form.visibilidad === 'publica' ? 'Avisar a mi categoría' : 'Crear y compartir link')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
