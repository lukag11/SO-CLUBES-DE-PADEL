import { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
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
      .then((r) => setMessages((m) => [...m, { from: 'wiark', text: r?.respuesta || 'No te entendí, probá de otra forma.' }]))
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
                <div key={i} className="self-start flex items-end gap-1.5 max-w-[88%]">
                  <span className="shrink-0 mb-0.5"><AsistentePelota size={22} flotar={false} /></span>
                  <div className="bg-white/8 border border-white/10 text-white/90 text-sm rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </div>
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
