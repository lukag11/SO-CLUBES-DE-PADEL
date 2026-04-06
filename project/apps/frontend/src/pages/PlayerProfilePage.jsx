import { useState } from 'react'
import { User, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle, ChevronDown, MapPin } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { DIAS, HORARIOS, POSICIONES, MANOS, CATEGORIAS, FRECUENCIAS } from '../hooks/useRegisterForm'
import { PROVINCIAS, getCiudades } from '../data/provinciasArgentina'

// ── Helpers ──────────────────────────────────────────────────────────────────

const passwordChecks = (v) => ({
  length: v.length >= 8,
  upper:  /[A-Z]/.test(v),
  number: /[0-9]/.test(v),
})

const validateProfileForm = (form) => {
  const errs = {}
  if (!form.nombre.trim() || form.nombre.trim().length < 2) errs.nombre = 'Mínimo 2 caracteres'
  if (!form.apellido.trim() || form.apellido.trim().length < 2) errs.apellido = 'Mínimo 2 caracteres'
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido'
  if (form.telefono && !/^[\d\s\+\-\(\)]{6,20}$/.test(form.telefono)) errs.telefono = 'Formato inválido'
  if (!form.provincia) errs.provincia = 'Seleccioná una provincia'
  if (!form.ciudad) errs.ciudad = 'Seleccioná una ciudad'
  if (!form.posicion) errs.posicion = 'Seleccioná una posición'
  if (!form.mano) errs.mano = 'Seleccioná la mano dominante'
  if (!form.categoria) errs.categoria = 'Seleccioná una categoría'
  if (!form.frecuencia) errs.frecuencia = 'Seleccioná la frecuencia'
  if (form.diasDisponibles.length === 0) errs.diasDisponibles = 'Seleccioná al menos un día'
  if (form.horariosDisponibles.length === 0) errs.horariosDisponibles = 'Seleccioná al menos un horario'
  return errs
}

const validatePasswordForm = (form) => {
  const errs = {}
  if (!form.actual) errs.actual = 'Ingresá tu contraseña actual'
  if (!form.nueva || form.nueva.length < 8) errs.nueva = 'Mínimo 8 caracteres'
  if (form.nueva !== form.confirmar) errs.confirmar = 'Las contraseñas no coinciden'
  return errs
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const FieldInput = ({ label, name, type = 'text', value, onChange, onBlur, error, readOnly = false, placeholder }) => (
  <div>
    <label className="block text-white/40 text-xs font-medium mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      placeholder={placeholder}
      className={[
        'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-colors',
        readOnly ? 'opacity-40 cursor-not-allowed border-white/5' : 'border-white/10 focus:border-[#afca0b]/50',
        error ? 'border-red-400/50' : '',
      ].join(' ')}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

const StyledSelect = ({ label, value, onChange, options, placeholder, error, disabled = false }) => (
  <div>
    <label className="block text-white/40 text-xs font-medium mb-1.5">{label}</label>
    <div className="relative">
      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none z-10" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

const SelectChip = ({ options, selected, onToggle, multi = false, error, abbreviate }) => (
  <div>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = multi ? selected.includes(opt) : selected === opt
        const label = abbreviate ? opt.replace(' Categoría', '') : (opt.length > 10 && multi ? opt.split(' ')[0] : opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={[
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150',
              isActive
                ? 'bg-[#afca0b]/15 border-[#afca0b]/40 text-[#afca0b]'
                : 'bg-white/4 border-white/10 text-white/40 hover:text-white/70 hover:border-white/25',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
  </div>
)

const PasswordInput = ({ label, name, value, onChange, error, show, onToggleShow }) => (
  <div>
    <label className="block text-white/40 text-xs font-medium mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        className={[
          'w-full bg-white/5 border rounded-xl px-4 py-2.5 pr-11 text-sm text-white outline-none transition-colors',
          error ? 'border-red-400/50' : 'border-white/10 focus:border-[#afca0b]/50',
        ].join(' ')}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

const SectionCard = ({ title, children }) => (
  <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6">
    <h3 className="text-white font-semibold text-sm mb-5 pb-4 border-b border-white/6">{title}</h3>
    {children}
  </div>
)

// ── Tabs ─────────────────────────────────────────────────────────────────────

const DatosTab = ({ player, updatePlayer }) => {
  const [form, setForm] = useState({
    nombre:              player?.nombre              || '',
    apellido:            player?.apellido            || '',
    apodo:               player?.apodo               || '',
    email:               player?.email               || '',
    telefono:            player?.telefono            || '',
    provincia:           player?.provincia           || '',
    ciudad:              player?.ciudad              || '',
    posicion:            player?.posicion            || '',
    mano:                player?.mano                || '',
    categoria:           player?.categoria           || '',
    frecuencia:          player?.frecuencia          || '',
    diasDisponibles:     player?.diasDisponibles     || [],
    horariosDisponibles: player?.horariosDisponibles || [],
  })
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSelect = (name, value) => {
    const current = form[name]
    let next
    if (Array.isArray(current)) {
      next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    } else {
      next = value
    }
    setForm((prev) => ({ ...prev, [name]: next }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleProvinciaChange = (value) => {
    setForm((prev) => ({ ...prev, provincia: value, ciudad: '' }))
    if (errors.provincia) setErrors((prev) => ({ ...prev, provincia: '' }))
  }

  const ciudadesDisponibles = getCiudades(form.provincia)

  const handleSave = () => {
    const errs = validateProfileForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    updatePlayer(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Datos básicos */}
      <SectionCard title="Datos personales">
        {/* DNI — solo lectura */}
        <div className="mb-5">
          <label className="block text-white/40 text-xs font-medium mb-1.5">DNI <span className="text-white/20">(no editable)</span></label>
          <div className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white/35 font-mono">
            {player?.dni || '—'}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldInput label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} />
          <FieldInput label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} error={errors.apellido} />
          <FieldInput label="Apodo" name="apodo" value={form.apodo} onChange={handleChange} error={errors.apodo} placeholder="Ej: El Cañonero (opcional)" />
          <FieldInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
          <FieldInput label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} error={errors.telefono} placeholder="Ej: +54 11 1234-5678" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <StyledSelect
            label="Provincia *"
            value={form.provincia}
            onChange={handleProvinciaChange}
            options={PROVINCIAS}
            placeholder="Seleccioná una provincia"
            error={errors.provincia}
          />
          <StyledSelect
            label="Ciudad *"
            value={form.ciudad}
            onChange={(v) => {
              setForm((prev) => ({ ...prev, ciudad: v }))
              if (errors.ciudad) setErrors((prev) => ({ ...prev, ciudad: '' }))
            }}
            options={ciudadesDisponibles}
            placeholder={form.provincia ? 'Seleccioná una ciudad' : 'Primero elegí la provincia'}
            error={errors.ciudad}
            disabled={!form.provincia}
          />
        </div>
      </SectionCard>

      {/* Perfil del jugador */}
      <SectionCard title="Perfil del jugador">
        <div className="flex flex-col gap-5">

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Posición</p>
            <SelectChip
              options={POSICIONES}
              selected={form.posicion}
              onToggle={(v) => handleSelect('posicion', v)}
              error={errors.posicion}
            />
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Mano dominante</p>
            <SelectChip
              options={MANOS}
              selected={form.mano}
              onToggle={(v) => handleSelect('mano', v)}
              error={errors.mano}
            />
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Categoría</p>
            <SelectChip
              options={CATEGORIAS}
              selected={form.categoria}
              onToggle={(v) => handleSelect('categoria', v)}
              abbreviate
              error={errors.categoria}
            />
          </div>
        </div>
      </SectionCard>

      {/* Preferencias */}
      <SectionCard title="Preferencias de juego">
        <div className="flex flex-col gap-5">

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Frecuencia</p>
            <SelectChip
              options={FRECUENCIAS}
              selected={form.frecuencia}
              onToggle={(v) => handleSelect('frecuencia', v)}
              error={errors.frecuencia}
            />
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Días disponibles</p>
            <SelectChip
              options={DIAS}
              selected={form.diasDisponibles}
              onToggle={(v) => handleSelect('diasDisponibles', v)}
              multi
              error={errors.diasDisponibles}
            />
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-2">Horarios disponibles</p>
            <SelectChip
              options={HORARIOS}
              selected={form.horariosDisponibles}
              onToggle={(v) => handleSelect('horariosDisponibles', v)}
              multi
              error={errors.horariosDisponibles}
            />
          </div>
        </div>
      </SectionCard>

      {/* Guardar */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <span className="flex items-center gap-1.5 text-[#afca0b] text-sm font-medium">
            <CheckCircle size={15} /> Cambios guardados
          </span>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#afca0b] hover:bg-[#c4e20c] text-[#0d1117] font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-[#afca0b]/20"
        >
          <Save size={15} />
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

const PasswordTab = () => {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState({ actual: false, nueva: false, confirmar: false })
  const [saved, setSaved] = useState(false)

  const checks = passwordChecks(form.nueva)
  const strength = Object.values(checks).filter(Boolean).length

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }))

  const handleSave = () => {
    const errs = validatePasswordForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    // Mock: en producción llamaría a la API
    setSaved(true)
    setForm({ actual: '', nueva: '', confirmar: '' })
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-md flex flex-col gap-4">

      <SectionCard title="Cambiar contraseña">
        <div className="flex flex-col gap-4">

          <PasswordInput
            label="Contraseña actual"
            name="actual"
            value={form.actual}
            onChange={handleChange}
            error={errors.actual}
            show={show.actual}
            onToggleShow={() => toggleShow('actual')}
          />

          <PasswordInput
            label="Nueva contraseña"
            name="nueva"
            value={form.nueva}
            onChange={handleChange}
            error={errors.nueva}
            show={show.nueva}
            onToggleShow={() => toggleShow('nueva')}
          />

          {/* Barra de fortaleza */}
          {form.nueva && (
            <div>
              <div className="flex gap-1.5 mb-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={[
                      'h-1.5 flex-1 rounded-full transition-all duration-300',
                      i < strength
                        ? strength === 1 ? 'bg-red-400' : strength === 2 ? 'bg-amber-400' : 'bg-[#afca0b]'
                        : 'bg-white/8',
                    ].join(' ')}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { ok: checks.length, text: '8 caracteres mínimo' },
                  { ok: checks.upper, text: 'Una mayúscula' },
                  { ok: checks.number, text: 'Un número' },
                ].map(({ ok, text }) => (
                  <span key={text} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-[#afca0b]' : 'text-white/25'}`}>
                    <CheckCircle size={11} />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          )}

          <PasswordInput
            label="Confirmar nueva contraseña"
            name="confirmar"
            value={form.confirmar}
            onChange={handleChange}
            error={errors.confirmar}
            show={show.confirmar}
            onToggleShow={() => toggleShow('confirmar')}
          />

          {/* Aviso */}
          <div className="flex items-start gap-2 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="text-white/30 shrink-0 mt-0.5" />
            <p className="text-white/30 text-xs leading-relaxed">
              Al cambiar la contraseña, todas las sesiones activas serán cerradas automáticamente.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Guardar */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <span className="flex items-center gap-1.5 text-[#afca0b] text-sm font-medium">
            <CheckCircle size={15} /> Contraseña actualizada
          </span>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#afca0b] hover:bg-[#c4e20c] text-[#0d1117] font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-[#afca0b]/20"
        >
          <Lock size={15} />
          Actualizar contraseña
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'datos',     label: 'Mis datos',  icon: User },
  { key: 'password',  label: 'Contraseña', icon: Lock },
]

const PlayerProfilePage = () => {
  const [activeTab, setActiveTab] = useState('datos')
  const { player, updatePlayer } = usePlayerStore()

  const initials = player
    ? `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()
    : 'J'

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#afca0b]/15 border border-[#afca0b]/30 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-[#afca0b]">{initials}</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {player?.nombre} {player?.apellido}
          </h2>
          <p className="text-white/30 text-sm mt-0.5">DNI {player?.dni} · {player?.categoria || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === key
                ? 'bg-[#afca0b] text-[#0d1117] shadow-lg shadow-[#afca0b]/20'
                : 'text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {activeTab === 'datos'
        ? <DatosTab player={player} updatePlayer={updatePlayer} />
        : <PasswordTab />
      }
    </div>
  )
}

export default PlayerProfilePage
