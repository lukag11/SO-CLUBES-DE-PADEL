import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Zap, Eye, EyeOff } from 'lucide-react'
import useProfesoresStore from '../store/profesoresStore'
import useAuthProfesorStore from '../store/authProfesorStore'

const ProfesorLoginPage = () => {
  const navigate = useNavigate()
  const findByCredentials = useProfesoresStore((s) => s.findByCredentials)
  const login = useAuthProfesorStore((s) => s.login)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const profesor = findByCredentials(form.email.trim().toLowerCase(), form.password)
      if (profesor) {
        // Token simulado — en producción viene del backend
        const token = `prof_${profesor.id}_${Date.now()}`
        login(profesor, token)
        navigate('/dashboardProfesor/agenda')
      } else {
        setError('Email o contraseña incorrectos, o tu cuenta está inactiva.')
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-orange-400/30">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight block">PadelOS</span>
            <span className="text-white/30 text-xs">Portal de Profesores</span>
          </div>
        </div>

        {/* Card */}
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
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="profe@test.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs font-medium block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="1234"
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
              disabled={loading}
              className="w-full bg-orange-400 hover:bg-orange-300 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all mt-2"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
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
