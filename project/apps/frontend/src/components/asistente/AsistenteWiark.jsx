import { useState, useEffect, useRef } from 'react'
import { X, Send, Copy, Check } from 'lucide-react'
import AsistentePelota from './AsistentePelota'
import useAuthStore from '../../store/authStore'
import { api } from '../../lib/api'

// Launcher + chat de WIarky, el asistente de PadelwIArk (la pelotita).
// Responde preguntas del dueño sobre su club con datos reales (grounded, sin PII).
// No invasivo: flotante, dismissible, el globito se va solo.
const SUGERENCIAS = ['¿Cuántos turnos libres hay hoy?', '¿Cómo viene la semana?', '¿Qué hago con las horas muertas?']

export default function AsistenteWiark() {
  const [open, setOpen] = useState(false)
  const [bubble, setBubble] = useState(false)
  const token = useAuthStore((s) => s.token)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [started, setStarted] = useState(false)
  const scrollRef = useRef(null)

  // Globito de saludo: aparece a poco de entrar y se va solo (no invasivo).
  useEffect(() => {
    const t1 = setTimeout(() => setBubble(true), 1400)
    const t2 = setTimeout(() => setBubble(false), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Auto-scroll al último mensaje
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const abrir = () => {
    const abriendo = !open
    setOpen(abriendo)
    setBubble(false)
    if (abriendo && !started) {
      setStarted(true)
      setMessages([{ from: 'wiark', text: '¡Hola! Soy WIarky 👋 Preguntame lo que quieras sobre tu club: turnos libres, cómo viene la semana, qué franja está floja…' }])
      if (token) {
        api.get('/clubs/me/insight', { Authorization: `Bearer ${token}` })
          .then((r) => { if (r?.texto) setMessages((m) => [...m, { from: 'wiark', text: `💡 Hoy te recomiendo: ${r.texto}` }]) })
          .catch(() => {})
      }
    }
  }

  const enviar = (texto) => {
    const t = (texto ?? input).trim()
    if (!t || sending) return
    const next = [...messages, { from: 'user', text: t }]
    setMessages(next)
    setInput('')
    setSending(true)
    const historial = next.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))
    api.post('/clubs/me/insight/chat', { mensajes: historial }, { Authorization: `Bearer ${token}` })
      .then((r) => {
        const artefactos = Array.isArray(r?.artefactos) ? r.artefactos : []
        const text = r?.respuesta || (artefactos.length ? 'Te lo dejo acá abajo para copiar 👇' : 'No te entendí, probá de otra forma.')
        setMessages((m) => [...m, { from: 'wiark', text, artefactos }])
      })
      .catch(() => setMessages((m) => [...m, { from: 'wiark', text: 'Uy, no pude responder ahora. Probá de nuevo en un toque 🙈' }]))
      .finally(() => setSending(false))
  }

  return (
    <div className="fixed bottom-20 right-5 lg:bottom-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {/* Panel del chat */}
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-2.5rem)] h-[480px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl shadow-black/30 animate-[wiark-pop_.18s_ease-out]">
          <style>{`@keyframes wiark-pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
            @keyframes wiark-dot{0%,80%,100%{opacity:.25}40%{opacity:1}}`}</style>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 shrink-0">
            <AsistentePelota size={34} expresion="feliz" flotar={false} />
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">WIarky</p>
              <p className="text-[11px] text-brand-300">tu asistente PadelwIArk</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto w-7 h-7 grid place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <X size={15} />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
            {messages.map((m, i) => (
              m.from === 'user' ? (
                <div key={i} className="self-end max-w-[80%] bg-brand-500 text-white text-sm rounded-2xl rounded-br-sm px-3 py-2 leading-relaxed">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="self-start flex flex-col gap-1.5 max-w-[92%]">
                  <div className="flex items-end gap-1.5">
                    <span className="shrink-0 mb-0.5"><AsistentePelota size={22} flotar={false} /></span>
                    <div className="bg-white/8 border border-white/10 text-white/90 text-sm rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                  {m.artefactos?.map((a, j) => a.accion
                    ? <ConfirmAccion key={j} artefacto={a} />
                    : a.tipo === 'lista'
                      ? <ListaArtefacto key={j} titulo={a.titulo} items={a.items} total={a.total} />
                      : <CopyArtefacto key={j} tipo={a.tipo} texto={a.texto} />)}
                </div>
              )
            ))}

            {sending && (
              <div className="self-start flex items-end gap-1.5">
                <span className="shrink-0 mb-0.5"><AsistentePelota size={22} expresion="hablando" flotar={false} /></span>
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" style={{ animation: 'wiark-dot 1.2s infinite' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" style={{ animation: 'wiark-dot 1.2s infinite .2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" style={{ animation: 'wiark-dot 1.2s infinite .4s' }} />
                </div>
              </div>
            )}

            {/* Sugerencias rápidas (solo al inicio) */}
            {messages.length <= 2 && !sending && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SUGERENCIAS.map((s) => (
                  <button key={s} onClick={() => enviar(s)}
                    className="text-[12px] text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-full px-2.5 py-1 hover:bg-brand-500/20 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 p-2.5 border-t border-white/10 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
              placeholder="Preguntale a WIarky…"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-400 focus:outline-none"
            />
            <button onClick={() => enviar()} disabled={!input.trim() || sending}
              className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-400 transition-all disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Globito de saludo */}
      {bubble && !open && (
        <div className="relative mr-1 rounded-2xl rounded-br-md bg-white shadow-lg border border-slate-200 px-3.5 py-2.5 max-w-[210px] animate-[wiark-pop_.2s_ease-out]">
          <style>{`@keyframes wiark-pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}`}</style>
          <button onClick={() => setBubble(false)} className="absolute -top-2 -right-2 w-5 h-5 grid place-items-center rounded-full bg-slate-700 text-white/80 hover:bg-slate-900">
            <X size={11} />
          </button>
          <p className="text-[13px] text-slate-700 font-medium leading-snug">¡Hola! Soy WIarky 🎾 Preguntame algo</p>
        </div>
      )}

      {/* Botón pelotita */}
      <button
        onClick={abrir}
        aria-label="Abrir asistente WIarky"
        className="relative w-16 h-16 rounded-full grid place-items-center transition-transform hover:scale-105 active:scale-95"
        style={{ filter: 'drop-shadow(0 8px 20px rgba(175,202,11,0.45))' }}
      >
        <AsistentePelota size={64} expresion={open ? 'feliz' : 'idle'} />
      </button>
    </div>
  )
}

// Bloque de un artefacto generado por WIarky (posteo / convocatoria) con botón de copiar.
function CopyArtefacto({ tipo, texto }) {
  const [copied, setCopied] = useState(false)
  const copiar = () => {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <div className="ml-7 rounded-xl bg-white/5 border border-brand-500/20 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300 mb-1.5">{tipo}</p>
      <p className="text-[13px] text-white/90 whitespace-pre-wrap leading-relaxed">{texto}</p>
      <button onClick={copiar} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-brand-300 hover:text-brand-200 transition-colors">
        {copied ? <><Check size={12} /> ¡Copiado!</> : <><Copy size={12} /> Copiar</>}
      </button>
    </div>
  )
}

// Lista de items (ej. deudores) — se muestra en el front; los nombres NO pasan por la IA.
function ListaArtefacto({ titulo, items, total }) {
  return (
    <div className="ml-7 rounded-xl bg-white/5 border border-white/10 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-300">{titulo}</p>
        {typeof total === 'number' && <p className="text-[11px] font-bold text-white/80">${total.toLocaleString('es-AR')}</p>}
      </div>
      <div className="flex flex-col divide-y divide-white/5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 gap-2">
            <span className="text-[13px] text-white/85 truncate">{it.nombre}</span>
            <span className="text-[13px] font-semibold text-white/90 shrink-0">{it.detalle}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Card de confirmación de una acción que escribe en la base (ej. cargar gasto).
// WIarky NUNCA escribe solo: el dueño confirma acá.
function ConfirmAccion({ artefacto }) {
  const token = useAuthStore((s) => s.token)
  const [estado, setEstado] = useState('idle') // idle | cargando | hecho | cancelado
  const [mensaje, setMensaje] = useState('')

  const confirmar = () => {
    if (estado !== 'idle') return
    setEstado('cargando')
    setMensaje('')
    // crear_reserva usa el endpoint admin existente (con su anti-doble-booking Serializable);
    // el resto de las acciones van por /me/insight/accion.
    const h = { Authorization: `Bearer ${token}` }
    const req = artefacto.accion === 'crear_reserva'
      ? api.post('/reservas/admin', artefacto.datos, h).then(() => ({ mensaje: 'Reserva creada ✅' }))
      : artefacto.accion === 'crear_jugador'
        ? api.post('/jugadores', artefacto.datos, h).then(() => ({ mensaje: 'Jugador registrado ✅' }))
        : api.post('/clubs/me/insight/accion', { accion: artefacto.accion, datos: artefacto.datos }, h)
    const errMsg = {
      crear_reserva: 'No se pudo (¿el turno ya está ocupado?).',
      crear_jugador: 'No se pudo (¿el DNI ya está registrado?).',
    }[artefacto.accion] || 'No se pudo. Probá de nuevo.'
    req
      .then((r) => { setEstado('hecho'); setMensaje(r?.mensaje || 'Listo ✅') })
      .catch(() => { setEstado('idle'); setMensaje(errMsg) })
  }

  return (
    <div className="ml-7 rounded-xl bg-white/5 border border-amber-400/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">Confirmá la acción</p>
      <p className="text-[13px] text-white/90 mb-2.5">{artefacto.resumen}</p>
      {estado === 'hecho' ? (
        <p className="text-[13px] font-semibold text-brand-300 flex items-center gap-1.5"><Check size={14} /> {mensaje}</p>
      ) : estado === 'cancelado' ? (
        <p className="text-[13px] text-white/40">Cancelado.</p>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={confirmar} disabled={estado === 'cargando'}
            className="flex-1 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-[13px] font-bold transition-all disabled:opacity-50">
            {estado === 'cargando' ? 'Cargando…' : 'Sí, cargar'}
          </button>
          <button onClick={() => setEstado('cancelado')} disabled={estado === 'cargando'}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[13px] hover:text-white/90 transition-all">
            Cancelar
          </button>
        </div>
      )}
      {mensaje && estado !== 'hecho' && <p className="text-[11px] text-red-300 mt-1.5">{mensaje}</p>}
    </div>
  )
}
