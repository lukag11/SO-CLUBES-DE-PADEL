import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Lock, Eye, EyeOff, CreditCard } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import usePlayerStore from '../store/playerStore'

const CourtDecoration = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 500 700" fill="none" preserveAspectRatio="xMidYMid slice">
    <rect x="60" y="80" width="380" height="540" stroke="#afca0b" strokeWidth="2" />
    <line x1="60" y1="350" x2="440" y2="350" stroke="#afca0b" strokeWidth="2" />
    <line x1="250" y1="80" x2="250" y2="620" stroke="#afca0b" strokeWidth="1.5" />
    <rect x="60" y="80" width="380" height="180" stroke="#afca0b" strokeWidth="1" />
    <rect x="60" y="440" width="380" height="180" stroke="#afca0b" strokeWidth="1" />
    <line x1="60" y1="350" x2="440" y2="350" stroke="#afca0b" strokeWidth="4" strokeDasharray="8 4" />
    <circle cx="250" cy="350" r="20" stroke="#afca0b" strokeWidth="1.5" />
  </svg>
)

const PlayerAuthPage = () => {
  const navigate = useNavigate()
  const login = usePlayerStore((s) => s.login)
  const [form, setForm] = useState({ dni: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.dni || !form.password) {
      setError('Completá todos los campos')
      return
    }
    setLoading(true)
    // TODO: reemplazar con llamada real a la API
    setTimeout(() => {
      if (form.dni === '12345678' && form.password === '123456') {
        login({ nombre: 'Lucas', apellido: 'Romero', dni: form.dni, genero: 'Masculino' }, 'player-demo-token')
        navigate('/dashboardJugadores/dashboard')
      } else {
        setError('DNI o contraseña incorrectos')
        setLoading(false)
      }
    }, 900)
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0d1117] flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#111827] to-[#afca0b]/15" />
        <CourtDecoration />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#afca0b]/8 rounded-full blur-3xl" />

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#afca0b] rounded-xl flex items-center justify-center shadow-lg shadow-[#afca0b]/30">
            <Zap size={20} className="text-[#0d1117]" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">PadelOS</span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10">
          <div className="w-10 h-1 bg-[#afca0b] rounded-full mb-6" />
          <h1 className="text-4xl font-bold text-white leading-tight">
            Tu historial,<br />
            <span className="text-[#afca0b]">tu carrera</span>
          </h1>
          <p className="text-white/40 mt-4 text-base leading-relaxed max-w-sm">
            Accedé a tus estadísticas, torneos jugados, resultados y oponentes enfrentados.
          </p>

          <div className="flex gap-3 mt-8">
            {[{ v: '48', l: 'Torneos jugados' }, { v: '3°', l: 'Categoría actual' }, { v: '87%', l: 'Efectividad' }].map(({ v, l }) => (
              <div key={l} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-xl font-bold text-white">{v}</p>
                <p className="text-xs text-white/40 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/20 text-xs">
          ¿No tenés cuenta?{' '}
          <Link to="/dashboardJugadores/registro" className="text-[#afca0b]/60 hover:text-[#afca0b] transition-colors">
            Registrate acá
          </Link>
        </p>
      </div>

      {/* Panel derecho — login */}
      <div className="flex-1 flex items-center justify-center bg-[#0a0e1a] px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[#afca0b] rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-[#0d1117]" />
            </div>
            <span className="text-white font-bold text-lg">PadelOS — Jugadores</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Bienvenido, jugador</h2>
            <p className="text-white/40 text-sm mt-1">Ingresá con tu DNI y contraseña</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="DNI"
              name="dni"
              placeholder="12345678"
              value={form.dni}
              onChange={handleChange}
              icon={CreditCard}
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

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2 !bg-[#afca0b] !text-[#0d1117] hover:!bg-[#c4e20c]">
              Iniciar sesión
            </Button>
          </form>

          {/* Demo */}
          <div className="mt-5 p-3 bg-white/4 rounded-xl border border-white/8">
            <p className="text-xs text-white/30 text-center">
              Demo: <span className="font-mono text-white/60">12345678</span> / <span className="font-mono text-white/60">123456</span>
            </p>
          </div>

          {/* Link registro */}
          <p className="text-center text-sm text-white/30 mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/dashboardJugadores/registro" className="text-[#afca0b] hover:text-[#c4e20c] font-semibold transition-colors">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlayerAuthPage
