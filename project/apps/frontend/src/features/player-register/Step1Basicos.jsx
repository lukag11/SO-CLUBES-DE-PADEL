import { useState, useRef, useCallback } from 'react'
import { User, CreditCard, Mail, Phone, MapPin, Calendar, Camera, ChevronDown, Hash, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import Input from '../../components/ui/Input'
import { useProvincias, useMunicipios } from '../../hooks/useGeoref'
import { api } from '../../lib/api'

const useFieldHint = () => {
  const [hint, setHint] = useState('')
  const timer = useRef(null)
  const show = useCallback((msg) => {
    setHint(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHint(''), 2000)
  }, [])
  return [hint, show]
}

const AvatarUpload = ({ onChange }) => {
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    onChange(e)
  }

  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current.click()}>
        <div className="w-20 h-20 rounded-2xl bg-white/8 border-2 border-dashed border-white/20 group-hover:border-club/60 flex flex-col items-center justify-center transition-all duration-200 overflow-hidden">
          {preview
            ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
            : <>
                <Camera size={22} className="text-white/30 group-hover:text-club transition-colors" />
                <span className="text-white/30 group-hover:text-club text-xs mt-1 transition-colors">Foto</span>
              </>
          }
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-club rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-[#0d1117] text-xs font-bold">{preview ? '✓' : '+'}</span>
        </div>
      </div>
      <p className="text-white/30 text-xs text-center">Foto de perfil · Opcional</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

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
          disabled ? 'opacity-40 cursor-not-allowed border-white/5 text-white/30' : 'border-white/10 focus:border-club/50 text-white',
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
  const [nombreHint, showNombreHint] = useFieldHint()
  const [apellidoHint, showApellidoHint] = useFieldHint()
  const [dniHint, showDniHint] = useFieldHint()
  const [telHint, showTelHint] = useFieldHint()
  const [dniLookup, setDniLookup] = useState('idle') // idle | loading | found | not_found
  const [prefilled, setPrefilled] = useState(false)
  const dniDebounceRef = useRef(null)

  const handleDniLookup = useCallback(async (dniValue) => {
    if (!/^\d{7,8}$/.test(dniValue)) { setDniLookup('idle'); return }
    setDniLookup('loading')
    try {
      const clubId = import.meta.env.VITE_CLUB_ID
      const data = await api.get(`/jugadores/buscar-por-dni?dni=${dniValue}&clubId=${clubId}`)
      if (data.found) {
        setValue('nombre', data.nombre)
        setValue('apellido', data.apellido)
        setPrefilled(true)
        setDniLookup('found')
      } else {
        setDniLookup('not_found')
      }
    } catch {
      setDniLookup('idle')
    }
  }, [setValue])

  const { provincias, loading: loadingProvincias } = useProvincias()
  const { municipios, loading: loadingMunicipios } = useMunicipios(form.provincia)

  const handleProvinciaChange = (value) => {
    setValue('provincia', value)
    setValue('ciudad', '')
  }

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
        <div>
          <Input
            label="Nombre"
            name="nombre"
            placeholder="Lucas"
            value={form.nombre}
            onChange={(e) => {
              if (prefilled) setPrefilled(false)
              const raw = e.target.value
              const filtered = raw.replace(/[0-9]/g, '')
              if (raw !== filtered) showNombreHint('El nombre no puede contener números')
              e.target.value = filtered
              handleChange(e)
            }}
            onBlur={() => handleBlur('nombre')}
            icon={User}
            error={errors.nombre}
            required
          />
          {nombreHint && <p className="text-amber-400 text-xs mt-1 animate-pulse">{nombreHint}</p>}
        </div>
        <div>
          <Input
            label="Apellido"
            name="apellido"
            placeholder="Romero"
            value={form.apellido}
            onChange={(e) => {
              if (prefilled) setPrefilled(false)
              const raw = e.target.value
              const filtered = raw.replace(/[0-9]/g, '')
              if (raw !== filtered) showApellidoHint('El apellido no puede contener números')
              e.target.value = filtered
              handleChange(e)
            }}
            onBlur={() => handleBlur('apellido')}
            icon={User}
            error={errors.apellido}
            required
          />
          {apellidoHint && <p className="text-amber-400 text-xs mt-1 animate-pulse">{apellidoHint}</p>}
        </div>
      </div>
      {prefilled && (
        <div className="flex items-center gap-1.5 -mt-3 px-1">
          <Sparkles size={11} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-xs">Datos pre-cargados desde el club · podés editarlos</p>
        </div>
      )}

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
        <div>
          <div className="relative">
            <Input
              label="DNI"
              name="dni"
              placeholder="12345678"
              value={form.dni}
              onChange={(e) => {
                const raw = e.target.value
                const filtered = raw.replace(/[^\d]/g, '')
                if (raw !== filtered) showDniHint('El DNI solo acepta números')
                e.target.value = filtered
                handleChange(e)
                handleBlur('dni')
                setPrefilled(false)
                setDniLookup('idle')
                clearTimeout(dniDebounceRef.current)
                dniDebounceRef.current = setTimeout(() => handleDniLookup(filtered), 450)
              }}
              onBlur={() => handleBlur('dni')}
              icon={CreditCard}
              error={errors.dni}
              required
            />
            {dniLookup === 'loading' && (
              <Loader2 size={14} className="absolute right-3 top-9 text-white/30 animate-spin" />
            )}
            {dniLookup === 'found' && (
              <CheckCircle2 size={14} className="absolute right-3 top-9 text-emerald-400" />
            )}
          </div>
          {dniHint && <p className="text-amber-400 text-xs mt-1 animate-pulse">{dniHint}</p>}
        </div>
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
      <div>
        <label className="block text-white/50 text-xs font-medium mb-1.5">
          Teléfono <span className="text-red-400">*</span>
        </label>
        <div className={`flex items-center gap-0 bg-white/5 border rounded-xl overflow-hidden transition-colors ${
          form.telefono.replace(/\s/g, '').length === 10
            ? 'border-club/60'
            : 'border-white/10 focus-within:border-club/50'
        }`}>
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-r border-white/10 shrink-0">
            <Phone size={14} className="text-white/30" />
            <span className="text-white/50 text-sm font-mono select-none">+54 9</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="11 12345678"
            value={form.telefono}
            maxLength={11}
            onChange={(e) => {
              const raw = e.target.value
              const soloDigitos = raw.replace(/[^\d\s]/g, '')
              const sinEspacios = soloDigitos.replace(/\s/g, '')
              if (raw.replace(/\s/g, '') !== soloDigitos.replace(/\s/g, '')) {
                showTelHint('Solo acepta números')
              } else if (sinEspacios.length > 10) {
                showTelHint('Máximo 10 dígitos (código de área + número)')
                return
              }
              handleChange({ target: { name: 'telefono', value: soloDigitos } })
              handleBlur('telefono')
            }}
            onBlur={() => handleBlur('telefono')}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder-white/20 font-mono"
          />
          {form.telefono.replace(/\s/g, '').length === 10 && (
            <CheckCircle2 size={16} className="text-club mr-3 shrink-0" />
          )}
        </div>
        {telHint && <p className="text-amber-400 text-xs mt-1 animate-pulse">{telHint}</p>}
        {errors.telefono && !telHint && <p className="text-red-400 text-xs mt-1">{errors.telefono}</p>}
        <p className="text-white/20 text-xs mt-1">Ej: 11 12345678 · Se usa para WhatsApp</p>
      </div>

      {/* Provincia */}
      <StyledSelect
        label="Provincia *"
        value={form.provincia}
        onChange={handleProvinciaChange}
        onBlur={() => handleBlur('provincia')}
        options={provincias}
        placeholder={loadingProvincias ? 'Cargando provincias...' : 'Seleccioná una provincia'}
        error={errors.provincia}
        disabled={loadingProvincias}
        loading={loadingProvincias}
      />

      {/* Ciudad */}
      <StyledSelect
        label="Ciudad *"
        value={form.ciudad}
        onChange={(v) => setValue('ciudad', v)}
        onBlur={() => handleBlur('ciudad')}
        options={municipios}
        placeholder={
          !form.provincia ? 'Primero elegí la provincia'
          : loadingMunicipios ? 'Cargando ciudades...'
          : 'Seleccioná una ciudad'
        }
        error={errors.ciudad}
        disabled={!form.provincia || loadingMunicipios}
        loading={loadingMunicipios}
      />
    </div>
  )
}

export default Step1Basicos
