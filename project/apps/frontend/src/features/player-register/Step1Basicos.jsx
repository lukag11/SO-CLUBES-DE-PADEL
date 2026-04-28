import { User, CreditCard, Mail, Phone, MapPin, Calendar, Camera, ChevronDown, Hash } from 'lucide-react'
import Input from '../../components/ui/Input'
import { PROVINCIAS, getCiudades } from '../../data/provinciasArgentina'

const AvatarUpload = ({ onChange }) => (
  <div className="flex flex-col items-center gap-3 mb-2">
    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input').click()}>
      <div className="w-20 h-20 rounded-2xl bg-white/8 border-2 border-dashed border-white/20 group-hover:border-[#afca0b]/60 flex flex-col items-center justify-center transition-all duration-200">
        <Camera size={22} className="text-white/30 group-hover:text-[#afca0b] transition-colors" />
        <span className="text-white/30 group-hover:text-[#afca0b] text-xs mt-1 transition-colors">Foto</span>
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#afca0b] rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-[#0d1117] text-xs font-bold">+</span>
      </div>
    </div>
    <p className="text-white/30 text-xs text-center">Opcional · Se trabajará más adelante</p>
    <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={onChange} />
  </div>
)

// Select estilizado con ícono de flecha
const StyledSelect = ({ label, value, onChange, onBlur, options, placeholder, error, disabled = false }) => (
  <div>
    <label className="block text-white/50 text-xs font-medium mb-1.5">{label}</label>
    <div className="relative">
      <MapPin
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={[
          'w-full bg-white/5 border rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none transition-colors appearance-none cursor-pointer',
          disabled ? 'opacity-40 cursor-not-allowed border-white/5 text-white/30' : 'border-white/10 focus:border-[#afca0b]/50 text-white',
          error ? 'border-red-400/50' : '',
        ].join(' ')}
        style={{ backgroundColor: '#0d1117' }}
      >
        <option value="" disabled style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: '#0d1117' }}>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ backgroundColor: '#0d1117', color: 'white' }}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
      />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

const Step1Basicos = ({ form, errors, handleChange, handleBlur, setValue }) => {

  const handleProvinciaChange = (value) => {
    setValue('provincia', value)
    setValue('ciudad', '') // resetear ciudad al cambiar provincia
  }

  const ciudadesDisponibles = getCiudades(form.provincia)

  return (
    <div className="flex flex-col gap-5">
      <AvatarUpload onChange={(e) => handleChange({ target: { name: 'avatar', value: e.target.files[0] } })} />

      {/* Género */}
      <div>
        <label className="block text-white/50 text-xs font-medium mb-2">Género *</label>
        <div className="grid grid-cols-2 gap-3">
          {['Masculino', 'Femenino'].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setValue('genero', g)}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                form.genero === g
                  ? g === 'Femenino'
                    ? 'bg-pink-500/15 border-pink-400/40 text-pink-400'
                    : 'bg-sky-500/15 border-sky-400/40 text-sky-400'
                  : 'bg-white/4 border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {errors.genero && <p className="text-red-400 text-xs mt-1">{errors.genero}</p>}
      </div>

      {/* Nombre + Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre"
          name="nombre"
          placeholder="Lucas"
          value={form.nombre}
          onChange={handleChange}
          onBlur={() => handleBlur('nombre')}
          icon={User}
          error={errors.nombre}
          required
        />
        <Input
          label="Apellido"
          name="apellido"
          placeholder="Romero"
          value={form.apellido}
          onChange={handleChange}
          onBlur={() => handleBlur('apellido')}
          icon={User}
          error={errors.apellido}
          required
        />
      </div>

      {/* Apodo */}
      <Input
        label="Apodo"
        name="apodo"
        placeholder="El Cañonero (opcional)"
        value={form.apodo}
        onChange={handleChange}
        onBlur={() => handleBlur('apodo')}
        icon={Hash}
        error={errors.apodo}
      />

      {/* DNI + Fecha nacimiento */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="DNI"
          name="dni"
          placeholder="12345678"
          value={form.dni}
          onChange={handleChange}
          onBlur={() => handleBlur('dni')}
          icon={CreditCard}
          error={errors.dni}
          required
        />
        <Input
          label="Fecha de nacimiento"
          name="fechaNacimiento"
          type="date"
          value={form.fechaNacimiento}
          onChange={handleChange}
          onBlur={() => handleBlur('fechaNacimiento')}
          icon={Calendar}
          error={errors.fechaNacimiento}
          required
        />
      </div>

      {/* Email */}
      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="lucas@email.com"
        value={form.email}
        onChange={handleChange}
        onBlur={() => handleBlur('email')}
        icon={Mail}
        error={errors.email}
        required
      />

      {/* Teléfono */}
      <Input
        label="Teléfono"
        name="telefono"
        placeholder="+54 9 11 ..."
        value={form.telefono}
        onChange={handleChange}
        onBlur={() => handleBlur('telefono')}
        icon={Phone}
        error={errors.telefono}
      />

      {/* Provincia */}
      <StyledSelect
        label="Provincia *"
        value={form.provincia}
        onChange={handleProvinciaChange}
        onBlur={() => handleBlur('provincia')}
        options={PROVINCIAS}
        placeholder="Seleccioná una provincia"
        error={errors.provincia}
      />

      {/* Ciudad — solo visible si hay provincia seleccionada */}
      <StyledSelect
        label="Ciudad *"
        value={form.ciudad}
        onChange={(v) => setValue('ciudad', v)}
        onBlur={() => handleBlur('ciudad')}
        options={ciudadesDisponibles}
        placeholder={form.provincia ? 'Seleccioná una ciudad' : 'Primero elegí la provincia'}
        error={errors.ciudad}
        disabled={!form.provincia}
      />
    </div>
  )
}

export default Step1Basicos
