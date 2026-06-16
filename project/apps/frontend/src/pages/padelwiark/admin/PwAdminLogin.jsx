import { useState } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'
import { PwLogo } from '../components/PwNav'

const PwAdminLogin = () => {
  const login = usePlatformStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const { token, user } = await api.post('/platform/login', { email, password })
      login(user, token)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pw-root pw-grain min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="pw-aurora absolute -top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[60vw] rounded-full blur-[130px] opacity-25" style={{ background: 'radial-gradient(circle,#afca0b 0%,transparent 60%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <PwLogo className="text-2xl text-[#f4f5ef]" />
          <p className="pw-mono text-[11px] uppercase tracking-[0.2em] text-[#9ba89f] mt-2">Panel de plataforma</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/8 bg-[#141c18]/80 backdrop-blur-xl p-7">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#afca0b]/15 border border-[#afca0b]/30 mb-5">
            <Lock size={20} className="text-[#d4ff3f]" />
          </div>
          <h1 className="pw-display text-xl font-semibold text-[#f4f5ef] mb-1">Acceso de dueño</h1>
          <p className="text-sm text-[#9ba89f] mb-6">Gestioná los clubes de PadelwIArk.</p>

          <label className="block text-xs text-[#9ba89f] mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full mb-4 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors"
            placeholder="tu@email.com"
          />

          <label className="block text-xs text-[#9ba89f] mb-1.5">Contraseña</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full mb-5 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors"
            placeholder="••••••••"
          />

          {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="pw-btn-lime w-full flex items-center justify-center gap-2 rounded-full px-5 py-3.5 font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? 'Entrando…' : <>Entrar <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PwAdminLogin
