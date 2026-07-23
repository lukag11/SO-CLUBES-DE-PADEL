import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Lock, Eye, EyeOff, CreditCard, CalendarCheck, Trophy, BarChart3, KeyRound, Mail, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import usePlayerStore from '../store/playerStore'
import { useToast } from '../components/ui/ToastProvider'
import { api } from '../lib/api'

// Decoración SVG: cancha de pádel real, vista cenital (proporción 20×10)
const CourtDecoration = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.10]" viewBox="0 0 500 700" fill="none" preserveAspectRatio="xMidYMid slice">
    {/* Paredes de vidrio — doble contorno para dar sensación de grosor */}
    <rect x="125" y="110" width="250" height="480" rx="2" stroke="var(--club-primary)" strokeWidth="2.5" />
    <rect x="134" y="119" width="232" height="462" rx="2" stroke="var(--club-primary)" strokeWidth="1" strokeOpacity="0.5" />

    {/* Líneas de servicio (a 3 m de cada pared de fondo) */}
    <line x1="125" y1="182" x2="375" y2="182" stroke="var(--club-primary)" strokeWidth="1.5" />
    <line x1="125" y1="518" x2="375" y2="518" stroke="var(--club-primary)" strokeWidth="1.5" />

    {/* Línea central de saque — sólo entre las líneas de servicio */}
    <line x1="250" y1="182" x2="250" y2="518" stroke="var(--club-primary)" strokeWidth="1.5" />

    {/* Red al medio — punteada y gruesa, con postes */}
    <line x1="125" y1="350" x2="375" y2="350" stroke="var(--club-primary)" strokeWidth="3.5" strokeDasharray="7 5" />
    <circle cx="125" cy="350" r="3.5" fill="var(--club-primary)" />
    <circle cx="375" cy="350" r="3.5" fill="var(--club-primary)" />
  </svg>
)

const PlayerAuthPage = () => {
  const navigate = useNavigate()
  const login = usePlayerStore((s) => s.login)
  const toast = useToast()
  const [form, setForm] = useState({ dni: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Recuperar contraseña por DNI + email (modal de 2 pasos) ──
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1 = identidad, 2 = nueva clave
  const [fForm, setFForm] = useState({ dni: '', email: '', password: '' })
  const [resetToken, setResetToken] = useState('')
  const [fLoading, setFLoading] = useState(false)
  const [fError, setFError] = useState('')
  const [fShowPass, setFShowPass] = useState(false)

  const openForgot = () => {
    setFForm({ dni: form.dni || '', email: '', password: '' })
    setForgotStep(1)
    setResetToken('')
    setFError('')
    setForgotOpen(true)
  }

  const closeForgot = () => {
    if (fLoading) return
    setForgotOpen(false)
  }

  const handleFChange = (e) => {
    setFForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setFError('')
  }

  // Paso 1: validar DNI + email → obtener token de reseteo
  const handleForgotIdentidad = async (e) => {
    e.preventDefault()
    if (fLoading) return
    if (!fForm.dni || !fForm.email) {
      setFError('Completá DNI y email')
      return
    }
    setFLoading(true)
    setFError('')
    try {
      const clubId = import.meta.env.VITE_CLUB_ID
      const data = await api.post('/auth/jugador/forgot', { dni: fForm.dni, email: fForm.email, clubId })
      setResetToken(data.resetToken)
      setForgotStep(2)
    } catch (err) {
      setFError(err.message || 'No se pudo validar tu identidad')
    } finally {
      setFLoading(false)
    }
  }

  // Paso 2: definir la contraseña nueva con el token
  const handleForgotReset = async (e) => {
    e.preventDefault()
    if (fLoading) return
    if (!fForm.password || fForm.password.length < 6) {
      setFError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setFLoading(true)
    setFError('')
    try {
      await api.post('/auth/jugador/reset', { token: resetToken, password: fForm.password })
      setForgotOpen(false)
      setForm((p) => ({ ...p, dni: fForm.dni, password: '' }))
      toast.success('Contraseña actualizada. Ya podés iniciar sesión.')
    } catch (err) {
      setFError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setFLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.dni || !form.password) {
      setError('Completá todos los campos')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Red unificada E2.3: login GLOBAL, solo DNI + contraseña (el club lo resuelve el backend
      // desde las membresías de la cuenta). Ya no depende de VITE_CLUB_ID.
      const data = await api.post('/auth/jugador/login', { dni: form.dni, password: form.password })
      if (data.needsClubChoice) {
        // El jugador tiene cuenta en varios clubes → hace falta el selector (E2.3b, próximo).
        // Hoy nadie tiene múltiples membresías, así que no se dispara.
        setError('Tenés cuenta en varios clubes. El selector llega en el próximo paso.')
        setLoading(false)
        return
      }
      login(data.user, data.token)
      navigate('/dashboardJugadores/dashboard')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('no registrado') || msg.includes('no encontrado')) {
        setError('Cuenta inexistente. ¿Todavía no te registraste?')
      } else if (msg.includes('incorrecta') || msg.includes('incorrectos')) {
        setError('Contraseña incorrecta')
      } else {
        setError(msg || 'No se pudo iniciar sesión')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0d1117] flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#111827] to-club/15" />
        <CourtDecoration />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-club/8 rounded-full blur-3xl" />

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-club rounded-xl flex items-center justify-center shadow-lg shadow-club/30">
            <Zap size={20} className="text-[#0d1117]" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">PadelwIArk</span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10">
          <div className="w-10 h-1 bg-club rounded-full mb-6" />
          <h1 className="text-4xl font-bold text-white leading-tight">
            Bienvenido<br />
            <span className="text-club">a la cancha</span>
          </h1>
          <p className="text-white/40 mt-4 text-base leading-relaxed max-w-sm">
            Tu cuenta del club: reservas, turnos fijos y estadísticas.
          </p>

          <div className="flex flex-col gap-3 mt-8 max-w-xs">
            {[
              { Icon: CalendarCheck, l: 'Reservá en segundos' },
              { Icon: Trophy, l: 'Seguí tus torneos' },
              { Icon: BarChart3, l: 'Mirá tus stats' },
            ].map(({ Icon, l }) => (
              <div key={l} className="flex items-center gap-3 backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-club/15 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-club" />
                </div>
                <p className="text-sm font-medium text-white/80">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — login */}
      <div className="flex-1 flex items-center justify-center bg-[#0a0e1a] px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-club rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-[#0d1117]" />
            </div>
            <span className="text-white font-bold text-lg">PadelwIArk — Jugadores</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Iniciá sesión</h2>
            <p className="text-white/40 text-sm mt-1">Con tu DNI y contraseña</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="DNI"
              name="dni"
              placeholder="12345678"
              value={form.dni}
              onChange={handleChange}
              icon={CreditCard}
              maxLength={8}
              inputMode="numeric"
              required
            />

            <div className="relative">
              <Input
                label="Contraseña"
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                icon={Lock}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={openForgot}
                className="text-xs text-club hover:brightness-110 font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <span>{error}</span>
                {error.includes('inexistente') && (
                  <Link
                    to="/dashboardJugadores/registro"
                    className="text-club font-semibold text-xs whitespace-nowrap hover:underline shrink-0 mt-0.5"
                  >
                    Registrarme →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2 !bg-club !text-[#0d1117] hover:!brightness-110">
              Iniciar sesión
            </Button>
          </form>

          {/* Link registro */}
          <p className="text-center text-sm text-white/30 mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/dashboardJugadores/registro" className="text-club hover:brightness-110 font-semibold transition-colors">
              Registrate
            </Link>
          </p>
        </div>
      </div>

      {/* ── Modal recuperar contraseña (DNI + email → nueva clave) ── */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={closeForgot}
        >
          <div
            className="w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeForgot}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-11 h-11 bg-club/15 rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} className="text-club" />
            </div>

            {forgotStep === 1 ? (
              <>
                <h3 className="text-lg font-bold text-white">Recuperar contraseña</h3>
                <p className="text-white/40 text-sm mt-1 mb-5">
                  Verificá tu identidad con tu DNI y el email con el que te registraste.
                </p>
                <form onSubmit={handleForgotIdentidad} className="flex flex-col gap-4">
                  <Input
                    label="DNI"
                    name="dni"
                    placeholder="12345678"
                    value={fForm.dni}
                    onChange={handleFChange}
                    icon={CreditCard}
                    maxLength={8}
                    inputMode="numeric"
                    required
                  />
                  <Input
                    label="Email registrado"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={fForm.email}
                    onChange={handleFChange}
                    icon={Mail}
                    required
                  />
                  {fError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                      {fError}
                    </div>
                  )}
                  <Button type="submit" fullWidth loading={fLoading} disabled={fLoading} size="lg" className="!bg-club !text-[#0d1117] hover:!brightness-110">
                    Continuar
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white">Nueva contraseña</h3>
                <p className="text-white/40 text-sm mt-1 mb-5">
                  Identidad verificada. Elegí tu contraseña nueva.
                </p>
                <form onSubmit={handleForgotReset} className="flex flex-col gap-4">
                  <div className="relative">
                    <Input
                      label="Contraseña nueva"
                      name="password"
                      type={fShowPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={fForm.password}
                      onChange={handleFChange}
                      icon={Lock}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFShowPass((v) => !v)}
                      className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {fShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                      {fError}
                    </div>
                  )}
                  <Button type="submit" fullWidth loading={fLoading} disabled={fLoading} size="lg" className="!bg-club !text-[#0d1117] hover:!brightness-110">
                    Cambiar contraseña
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerAuthPage
