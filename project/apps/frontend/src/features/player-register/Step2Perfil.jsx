import { POSICIONES, MANOS, CATEGORIAS } from '../../hooks/useRegisterForm'

const OptionCard = ({ label, selected, onClick, description }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all duration-150 w-full',
      selected
        ? 'bg-[#afca0b]/12 border-[#afca0b]/50 text-[#afca0b]'
        : 'bg-white/4 border-white/10 text-white/60 hover:border-white/25 hover:text-white/80',
    ].join(' ')}
  >
    <span className="text-sm font-semibold">{label}</span>
    {description && <span className="text-xs opacity-60 mt-0.5">{description}</span>}
  </button>
)

const FieldError = ({ error }) =>
  error ? <p className="text-red-400 text-xs mt-1">{error}</p> : null

const SectionLabel = ({ children, required }) => (
  <label className="text-sm font-medium text-white/70 block mb-2">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
)

const Step2Perfil = ({ form, errors, setValue }) => {
  return (
    <div className="flex flex-col gap-6">

      {/* Posición */}
      <div>
        <SectionLabel required>Posición en cancha</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {POSICIONES.map((p) => (
            <OptionCard
              key={p}
              label={p}
              selected={form.posicion === p}
              onClick={() => setValue('posicion', p)}
              description={p === 'Drive' ? 'Lado derecho' : p === 'Revés' ? 'Lado izquierdo' : 'Flexible'}
            />
          ))}
        </div>
        <FieldError error={errors.posicion} />
      </div>

      {/* Mano dominante */}
      <div>
        <SectionLabel required>Mano dominante</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {MANOS.map((m) => (
            <OptionCard
              key={m}
              label={m}
              selected={form.mano === m}
              onClick={() => setValue('mano', m)}
            />
          ))}
        </div>
        <FieldError error={errors.mano} />
      </div>

      {/* Categoría */}
      <div>
        <SectionLabel required>Categoría</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('categoria', c)}
              className={[
                'py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150',
                form.categoria === c
                  ? 'bg-[#afca0b]/12 border-[#afca0b]/50 text-[#afca0b]'
                  : 'bg-white/4 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80',
              ].join(' ')}
            >
              {c.replace(' Categoría', '')}
            </button>
          ))}
        </div>
        <FieldError error={errors.categoria} />
        {form.categoria && (
          <p className="text-white/30 text-xs mt-2">
            Seleccionaste: <span className="text-[#afca0b]">{form.categoria}</span>
          </p>
        )}
      </div>
    </div>
  )
}

export default Step2Perfil
