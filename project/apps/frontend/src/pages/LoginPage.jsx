import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

// Decoración SVG: líneas de cancha de pádel
const CourtDecoration = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-10"
    viewBox="0 0 500 700"
    fill="none"
    preserveAspectRatio="xMidYMid slice"
  >
    {/* Cancha exterior */}
    <rect x="60" y="80" width="380" height="540" stroke="#10b981" strokeWidth="2" />
    {/* Línea central horizontal */}
    <line x1="60" y1="350" x2="440" y2="350" stroke="#10b981" strokeWidth="2" />
    {/* Línea central vertical */}
    <line x1="250" y1="80" x2="250" y2="620" stroke="#10b981" strokeWidth="1.5" />
    {/* Zona de saque superior */}
    <rect x="60" y="80" width="380" height="180" stroke="#10b981" strokeWidth="1" />
    {/* Zona de daque inferior */}
    <rect x="60" y="440" width="380" height="180" stroke="#10b981" strokeWidth="1" />
    {/* Red */}
    <line x1="60" y1="350" x2="440" y2="350" stroke="#10b981" strokeWidth="4" strokeDasharray="8 4" />
    {/* Círculo central */}
    <circle cx="250" cy="350" r="20" stroke="#10b981" strokeWidth="1.5" />
  </svg>
)

// Card flotante con estadística
const StatCard = ({ value, label, className = '' }) => (
  <div className={`backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl px-4 py-3 ${className}`}>
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-xs text-white/60 mt-0.5">{label}</p>
  </div>
)

const LoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await api.post('/auth/admin/login', { email: form.email, password: form.password })
      login(data.user, data.token)
      navigate('/dashboardAdmin')
    } catch (err) {
      setError(err.message || 'Email o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-dark-900 flex-col justify-between p-12 overflow-hidden">

        {/* Gradiente de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-brand-900/40" />

        {/* Decoración de cancha */}
        <CourtDecoration />

        {/* Glow verde */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">PadelOS</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight">
            El sistema operativo<br />
            <span className="text-brand-400">de tu club</span>
          </h1>
          <p className="text-white/50 mt-4 text-base leading-relaxed max-w-sm">
            Gestioná reservas, torneos, jugadores y pagos desde un solo lugar.
          </p>

          {/* Stats flotantes */}
          <div className="flex gap-3 mt-8">
            <StatCard value="2.400+" label="Reservas/mes" />
            <StatCard value="180+" label="Jugadores activos" />
            <StatCard value="12" label="Canchas" />
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-slate-800 font-bold text-lg">PadelOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Ingresá a tu panel de gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="admin@miclub.com"
              value={form.email}
              onChange={handleChange}
              icon={Mail}
              required
            />

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Input
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  icon={Lock}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
              Iniciar sesión
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              Demo: <span className="font-mono text-slate-700">admin@club.com</span> / <span className="font-mono text-slate-700">123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
