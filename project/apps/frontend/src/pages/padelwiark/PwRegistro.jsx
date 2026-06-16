import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import './padelwiark.css'
import { api } from '../../lib/api'
import { PwLogo } from './components/PwNav'

const field = 'w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors'
const labelCls = 'block text-xs text-[#9ba89f] mb-1.5'

const PwRegistro = () => {
  const [form, setForm] = useState({ clubNombre: '', adminNombre: '', adminEmail: '', adminPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ok, setOk] = useState(null) // { adminEmail }

  useEffect(() => {
    const prev = document.title
    document.title = 'PadelwIArk — Probá gratis'
    return () => { document.title = prev }
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError(''); setSubmitting(true)
    try {
      const r = await api.post('/platform/signup', form)
      setOk({ adminEmail: r.adminEmail })
    } catch (err) {
      setError(err.message || 'No se pudo crear el club')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="pw-root pw-grain min-h-screen flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="pw-aurora absolute -top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[60vw] rounded-full blur-[130px] opacity-25" style={{ background: 'radial-gradient(circle,#afca0b 0%,transparent 60%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-7">
          <a href="/padelwiark"><PwLogo className="text-2xl text-[#f4f5ef]" /></a>
        </div>

        {ok ? (
          <div className="rounded-3xl border border-[#afca0b]/30 bg-[#141c18]/80 backdrop-blur-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#afca0b]/15 border border-[#afca0b]/30 mb-5">
              <CheckCircle2 size={26} className="text-[#d4ff3f]" />
            </div>
            <h1 className="pw-display text-2xl font-semibold text-[#f4f5ef] mb-2">¡Tu club está listo! 🎉</h1>
            <p className="text-sm text-[#9ba89f] mb-1">Arrancaste tu prueba gratis de 14 días con acceso completo.</p>
            <p className="text-sm text-[#9ba89f] mb-7">Entrá con <b className="text-[#f4f5ef]">{ok.adminEmail}</b> y la contraseña que elegiste.</p>
            <a href="/login" className="pw-btn-lime inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold text-sm">
              Entrar a mi club <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-3xl border border-white/8 bg-[#141c18]/80 backdrop-blur-xl p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#afca0b]/30 bg-[#afca0b]/10 px-3 py-1 mb-4">
              <Sparkles size={12} className="text-[#d4ff3f]" />
              <span className="pw-mono text-[10px] uppercase tracking-wide text-[#d4ff3f]">14 días gratis · sin tarjeta</span>
            </div>
            <h1 className="pw-display text-xl font-semibold text-[#f4f5ef] mb-1">Creá tu club</h1>
            <p className="text-sm text-[#9ba89f] mb-6">En un minuto tenés tu club andando.</p>

            <div className="mb-4">
              <label className={labelCls}>Nombre del club *</label>
              <input className={field} value={form.clubNombre} onChange={set('clubNombre')} required placeholder="Club Pádel Central" />
            </div>
            <div className="mb-4">
              <label className={labelCls}>Tu nombre</label>
              <input className={field} value={form.adminNombre} onChange={set('adminNombre')} placeholder="Tu nombre" />
            </div>
            <div className="mb-4">
              <label className={labelCls}>Email *</label>
              <input type="email" className={field} value={form.adminEmail} onChange={set('adminEmail')} required placeholder="tu@email.com" />
            </div>
            <div className="mb-5">
              <label className={labelCls}>Contraseña *</label>
              <input type="password" className={field} value={form.adminPassword} onChange={set('adminPassword')} required placeholder="mínimo 6 caracteres" />
            </div>

            {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

            <button type="submit" disabled={submitting} className="pw-btn-lime w-full flex items-center justify-center gap-2 rounded-full px-5 py-3.5 font-semibold text-sm disabled:opacity-50">
              {submitting ? 'Creando tu club…' : <>Empezar gratis <ArrowRight size={16} /></>}
            </button>
            <a href="/padelwiark" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">
              <ArrowLeft size={13} /> Volver
            </a>
          </form>
        )}
      </div>
    </div>
  )
}

export default PwRegistro
