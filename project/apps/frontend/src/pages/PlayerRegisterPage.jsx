import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import useRegisterForm from '../hooks/useRegisterForm'
import usePlayerStore from '../store/playerStore'
import Step1Basicos from '../features/player-register/Step1Basicos'
import Step2Perfil from '../features/player-register/Step2Perfil'
import Step3Preferencias from '../features/player-register/Step3Preferencias'

const STEPS = [
  { id: 1, label: 'Datos básicos', short: 'Básicos' },
  { id: 2, label: 'Perfil del jugador', short: 'Perfil' },
  { id: 3, label: 'Preferencias', short: 'Preferencias' },
]

// Stepper visual
const Stepper = ({ current }) => (
  <div className="flex items-center gap-0 w-full mb-8">
    {STEPS.map((step, i) => {
      const done = step.id < current
      const active = step.id === current

      return (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1.5 relative">
            <div
              className={[
                'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 border-2',
                done
                  ? 'bg-[#afca0b] border-[#afca0b] text-[#0d1117]'
                  : active
                  ? 'bg-transparent border-[#afca0b] text-[#afca0b]'
                  : 'bg-transparent border-white/15 text-white/25',
              ].join(' ')}
            >
              {done ? <Check size={16} strokeWidth={2.5} /> : step.id}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                active ? 'text-[#afca0b]' : done ? 'text-white/60' : 'text-white/20'
              }`}
            >
              {step.short}
            </span>
          </div>

          {/* Conector */}
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px mx-3 mb-5 transition-all duration-300">
              <div className={`h-full ${done ? 'bg-[#afca0b]/50' : 'bg-white/10'}`} />
            </div>
          )}
        </div>
      )
    })}
  </div>
)

// Panel decorativo izquierdo
const LeftPanel = ({ step }) => {
  const content = {
    1: { title: 'Contanos quién sos', sub: 'Tus datos personales para crear tu perfil de jugador.' },
    2: { title: 'Tu juego, tu estilo', sub: 'Posición, mano y categoría para conectarte con los partidos correctos.' },
    3: { title: 'Cuándo y cómo jugás', sub: 'Configurá tus preferencias para encontrar los mejores torneos para vos.' },
  }
  const { title, sub } = content[step]

  return (
    <div className="hidden lg:flex lg:w-[420px] shrink-0 relative bg-[#0d1117] border-r border-white/5 flex-col justify-between p-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#111827] to-[#afca0b]/10" />
      <div className="absolute top-1/4 right-0 w-64 h-64 bg-[#afca0b]/8 rounded-full blur-3xl" />

      {/* Logo */}
      <Link to="/" className="relative z-10 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#afca0b] rounded-xl flex items-center justify-center shadow-lg shadow-[#afca0b]/25">
          <Zap size={18} className="text-[#0d1117]" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PadelOS</span>
      </Link>

      {/* Contenido dinámico por paso */}
      <div className="relative z-10">
        <div className="w-12 h-1 bg-[#afca0b] rounded-full mb-6" />
        <h2 className="text-3xl font-bold text-white leading-tight transition-all">
          {title}
        </h2>
        <p className="text-white/40 mt-4 text-base leading-relaxed max-w-xs">
          {sub}
        </p>

        {/* Indicadores de paso */}
        <div className="flex gap-2 mt-10">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s.id === step ? 'w-8 bg-[#afca0b]' : s.id < step ? 'w-4 bg-[#afca0b]/40' : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-white/20 text-xs">
          ¿Ya tenés cuenta?{' '}
          <Link to="/dashboardJugadores" className="text-[#afca0b]/60 hover:text-[#afca0b] transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

const PlayerRegisterPage = () => {
  const navigate = useNavigate()
  const login = usePlayerStore((s) => s.login)
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const {
    form, errors, handleChange, handleBlur,
    toggleArrayValue, setValue, validateStep,
  } = useRegisterForm()

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setCurrentStep((s) => s - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(3)) return

    setSubmitting(true)
    // TODO: reemplazar con llamada real a la API
    setTimeout(() => {
      login(
        {
          nombre:              form.nombre,
          apellido:            form.apellido,
          apodo:               form.apodo,
          dni:                 form.dni,
          email:               form.email,
          telefono:            form.telefono,
          provincia:           form.provincia,
          ciudad:              form.ciudad,
          posicion:            form.posicion,
          mano:                form.mano,
          categoria:           form.categoria,
          frecuencia:          form.frecuencia,
          diasDisponibles:     form.diasDisponibles,
          horariosDisponibles: form.horariosDisponibles,
        },
        'player-register-token'
      )
      navigate('/dashboardJugadores/dashboard')
    }, 1200)
  }

  const stepProps = { form, errors, handleChange, handleBlur, toggleArrayValue, setValue }

  return (
    <div className="min-h-screen flex bg-[#0a0e1a]">
      <LeftPanel step={currentStep} />

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 flex items-start justify-center px-6 py-10">
          <div className="w-full max-w-lg">

            {/* Logo mobile */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-8 h-8 bg-[#afca0b] rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-[#0d1117]" />
              </div>
              <span className="text-white font-bold text-lg">PadelOS</span>
            </div>

            {/* Header */}
            <div className="mb-6">
              <p className="text-[#afca0b] text-sm font-semibold mb-1">
                Paso {currentStep} de {STEPS.length}
              </p>
              <h1 className="text-2xl font-bold text-white">
                {STEPS[currentStep - 1].label}
              </h1>
            </div>

            {/* Stepper */}
            <Stepper current={currentStep} />

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
              <div className="min-h-[340px]">
                {currentStep === 1 && <Step1Basicos {...stepProps} />}
                {currentStep === 2 && <Step2Perfil {...stepProps} />}
                {currentStep === 3 && <Step3Preferencias {...stepProps} />}
              </div>

              {/* Navegación */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/8">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors px-4 py-2.5 rounded-xl hover:bg-white/5"
                  >
                    <ArrowLeft size={16} />
                    Atrás
                  </button>
                ) : (
                  <Link
                    to="/dashboardJugadores"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors px-4 py-2.5 rounded-xl hover:bg-white/5"
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </Link>
                )}

                {currentStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-[#afca0b] hover:bg-[#c4e20c] text-[#0d1117] font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-[#afca0b]/20"
                  >
                    Siguiente
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 bg-[#afca0b] hover:bg-[#c4e20c] text-[#0d1117] font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-[#afca0b]/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Crear cuenta
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerRegisterPage
