import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Zap, Eye, EyeOff } from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import { api } from '../lib/api'

const CLUB_ID = import.meta.env.VITE_CLUB_ID || 'cmoryx4a900008t4qmzdzuiee'

const ProfesorLoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthProfesorStore((s) => s.login)
  const clubId = CLUB_ID

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')

  const validateEmail = (v) => {
    if (!v.trim()) return ''
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Ingresá un email válido'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const data = await api.post('/auth/profesor/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        clubId,
      })
      login(data.user, data.token)
      navigate('/dashboardProfesor/agenda')
    } catch (err) {
      setError(err?.message || 'Email o contraseña incorrectos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-orange-400/30">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight block">PadelOS</span>
            <span className="text-white/30 text-xs">Portal de Profesores</span>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-400/15 border border-orange-400/25 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Iniciar sesión</h1>
              <p className="text-white/30 text-xs">Accedé con tu cuenta de profesor</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-white/50 text-xs font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  const v = e.target.value
                  setForm({ ...form, email: v })
                  setEmailError(validateEmail(v))
                }}
                placeholder="profe@club.com"
                required
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:bg-white/8 transition-all ${emailError ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-orange-400/50'}`}
              />
              {emailError && (
                <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
              )}
            </div>

            <div>
              <label className="text-white/50 text-xs font-medium block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-400 hover:bg-orange-300 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all mt-2"
            >
              {submitting ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          ¿Problemas para ingresar? Contactá al administrador del club.
        </p>
      </div>
    </div>
  )
}

export default ProfesorLoginPage
