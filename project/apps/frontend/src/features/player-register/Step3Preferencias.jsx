import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Input from '../../components/ui/Input'
import { DIAS, HORARIOS, FRECUENCIAS } from '../../hooks/useRegisterForm'

const FieldError = ({ error }) =>
  error ? <p className="text-red-400 text-xs mt-1">{error}</p> : null

const SectionLabel = ({ children, required }) => (
  <label className="text-sm font-medium text-white/70 block mb-2">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
)

const ToggleChip = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
      selected
        ? 'bg-[#afca0b]/15 border-[#afca0b]/50 text-[#afca0b]'
        : 'bg-white/4 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80',
    ].join(' ')}
  >
    {label}
  </button>
)

const PasswordStrength = ({ password }) => {
  if (!password) return null
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Número', ok: /\d/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-red-500', 'bg-amber-400', 'bg-[#afca0b]']

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-white/10'}`}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(({ label, ok }) => (
          <span key={label} className={`text-xs ${ok ? 'text-[#afca0b]' : 'text-white/25'}`}>
            {ok ? '✓' : '·'} {label}
          </span>
        ))}
      </div>
    </div>
  )
}

const Step3Preferencias = ({ form, errors, handleChange, handleBlur, toggleArrayValue, setValue }) => {
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="flex flex-col gap-6">

      {/* Frecuencia */}
      <div>
        <SectionLabel required>Frecuencia de juego</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {FRECUENCIAS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setValue('frecuencia', f)}
              className={[
                'px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150',
                form.frecuencia === f
                  ? 'bg-[#afca0b]/12 border-[#afca0b]/50 text-[#afca0b]'
                  : 'bg-white/4 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
        <FieldError error={errors.frecuencia} />
      </div>

      {/* Días disponibles */}
      <div>
        <SectionLabel required>Días disponibles</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => (
            <ToggleChip
              key={d}
              label={d.slice(0, 3)}
              selected={form.diasDisponibles.includes(d)}
              onClick={() => toggleArrayValue('diasDisponibles', d)}
            />
          ))}
        </div>
        <FieldError error={errors.diasDisponibles} />
      </div>

      {/* Horarios */}
      <div>
        <SectionLabel required>Horarios preferidos</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {HORARIOS.map((h) => (
            <ToggleChip
              key={h}
              label={h}
              selected={form.horariosDisponibles.includes(h)}
              onClick={() => toggleArrayValue('horariosDisponibles', h)}
            />
          ))}
        </div>
        <FieldError error={errors.horariosDisponibles} />
      </div>

      {/* Contraseñas — inputs blancos sobre dark */}
      <div className="flex flex-col gap-3 pt-2 border-t border-white/8">
        <p className="text-white/40 text-xs">Creá tu contraseña de acceso</p>

        <div className="relative">
          <Input
            label="Contraseña"
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            icon={Lock}
            error={errors.password}
            required
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <PasswordStrength password={form.password} />
        </div>

        <div className="relative">
          <Input
            label="Confirmar contraseña"
            name="confirmarPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repetí tu contraseña"
            value={form.confirmarPassword}
            onChange={handleChange}
            onBlur={() => handleBlur('confirmarPassword')}
            icon={Lock}
            error={errors.confirmarPassword}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Step3Preferencias
