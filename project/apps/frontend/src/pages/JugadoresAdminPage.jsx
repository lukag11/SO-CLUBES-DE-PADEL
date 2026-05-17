import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Users, UserPlus, Search, CheckCircle, Clock, Phone, Mail,
  ChevronRight, ChevronDown, X, AlertCircle, Trophy, CalendarDays, Zap, Shield,
  Pencil, Trash2, UserMinus, HelpCircle, Repeat,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

const CATEGORIAS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª']

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-brand-400 to-emerald-500',
  'from-blue-500 to-cyan-400',
  'from-rose-500 to-pink-400',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
]
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
const initials = (j) => `${j.nombre[0]}${j.apellido[0]}`.toUpperCase()

// ── Hook hint temporal ────────────────────────────────────────────────────────
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

// ── Validadores ───────────────────────────────────────────────────────────────
const validators = {
  nombre: (v) => {
    if (!v.trim()) return 'El nombre es requerido'
    if (v.trim().length < 2) return 'Mínimo 2 caracteres'
    if (/\d/.test(v)) return 'El nombre no puede contener números'
    return ''
  },
  apellido: (v) => {
    if (!v.trim()) return 'El apellido es requerido'
    if (v.trim().length < 2) return 'Mínimo 2 caracteres'
    if (/\d/.test(v)) return 'El apellido no puede contener números'
    return ''
  },
  dni: (v) => {
    if (!v) return 'El DNI es requerido'
    if (!/^\d+$/.test(v)) return 'Solo puede contener números'
    if (v.length < 7 || v.length > 8) return 'Debe tener 7 u 8 dígitos'
    return ''
  },
}

// ── Modal alta manual ─────────────────────────────────────────────────────────
const ModalAlta = ({ onClose, onCreado }) => {
  const token = useAuthStore((s) => s.token)
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', email: '', telefono: '', categoria: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [nombreHint, showNombreHint] = useFieldHint()
  const [apellidoHint, showApellidoHint] = useFieldHint()
  const [dniHint, showDniHint] = useFieldHint()

  const handleBlur = (field) => {
    const err = validators[field]?.(form[field]) ?? ''
    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  const handleNombre = (e) => {
    const raw = e.target.value
    const filtered = raw.replace(/[0-9]/g, '')
    if (raw !== filtered) showNombreHint('El nombre no puede contener números')
    setForm((f) => ({ ...f, nombre: filtered }))
    if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: validators.nombre(filtered) }))
  }

  const handleApellido = (e) => {
    const raw = e.target.value
    const filtered = raw.replace(/[0-9]/g, '')
    if (raw !== filtered) showApellidoHint('El apellido no puede contener números')
    setForm((f) => ({ ...f, apellido: filtered }))
    if (errors.apellido) setErrors((prev) => ({ ...prev, apellido: validators.apellido(filtered) }))
  }

  const handleDni = (e) => {
    const raw = e.target.value
    const filtered = raw.replace(/[^\d]/g, '')
    if (raw !== filtered) showDniHint('El DNI solo acepta números')
    const capped = filtered.slice(0, 8)
    setForm((f) => ({ ...f, dni: capped }))
    if (errors.dni) setErrors((prev) => ({ ...prev, dni: validators.dni(capped) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {
      nombre: validators.nombre(form.nombre),
      apellido: validators.apellido(form.apellido),
      dni: validators.dni(form.dni),
    }
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    if (submitting) return
    setSubmitting(true)
    setErrorApi('')
    try {
      const jugador = await api.post('/jugadores', form, { Authorization: `Bearer ${token}` })
      onCreado(jugador)
    } catch (err) {
      setErrorApi(err.message || 'No se pudo crear el jugador')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (field) =>
    `bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/15 outline-none focus:bg-white/8 transition-all ${
      errors[field] ? 'border-red-500/60 focus:border-red-500/60' : 'border-white/8 focus:border-brand-500/60'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-brand-500/30 via-violet-500/20 to-transparent blur-sm" />
        <div className="relative bg-[#0a0f16] border border-white/10 rounded-3xl overflow-hidden">

          <div className="relative px-6 py-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-violet-500/5 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <UserPlus size={18} className="text-[#0d1117]" />
                </div>
                <div>
                  <p className="text-white font-bold text-base">Dar de alta jugador</p>
                  <p className="text-white/40 text-xs mt-0.5">Se activa cuando se registre</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 md:px-6 pb-6 flex flex-col gap-4">

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Nombre <span className="text-brand-400">*</span></label>
                <input name="nombre" value={form.nombre} onChange={handleNombre} onBlur={() => handleBlur('nombre')}
                  placeholder="Juan" className={fieldClass('nombre')} />
                {nombreHint && <p className="text-amber-400 text-xs animate-pulse">{nombreHint}</p>}
                {errors.nombre && <p className="text-red-400 text-xs">{errors.nombre}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Apellido <span className="text-brand-400">*</span></label>
                <input name="apellido" value={form.apellido} onChange={handleApellido} onBlur={() => handleBlur('apellido')}
                  placeholder="García" className={fieldClass('apellido')} />
                {apellidoHint && <p className="text-amber-400 text-xs animate-pulse">{apellidoHint}</p>}
                {errors.apellido && <p className="text-red-400 text-xs">{errors.apellido}</p>}
              </div>
            </div>

            {/* DNI */}
            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">DNI <span className="text-brand-400">*</span></label>
              <div className="relative">
                <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input value={form.dni} onChange={handleDni} onBlur={() => handleBlur('dni')}
                  inputMode="numeric" placeholder="12345678"
                  className={`w-full pl-8 pr-3 ${fieldClass('dni')}`} />
              </div>
              {dniHint && <p className="text-amber-400 text-xs animate-pulse">{dniHint}</p>}
              {errors.dni && <p className="text-red-400 text-xs">{errors.dni}</p>}
            </div>

            {/* Email + Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'email', label: 'Email', placeholder: 'juan@mail.com', type: 'email', icon: Mail },
                { name: 'telefono', label: 'Teléfono', placeholder: '1112345678', icon: Phone },
              ].map(({ name, label, placeholder, type = 'text', icon: Icon }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">{label}</label>
                  <div className="relative">
                    <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input name={name} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                      type={type} placeholder={placeholder}
                      className={`w-full pl-8 pr-3 ${fieldClass('')}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Categoría */}
            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Categoría</label>
              <select name="categoria" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/60 transition-all appearance-none">
                <option value="" className="bg-[#0d1117] text-white/40">Sin categoría</option>
                {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[#0d1117] text-white">{c}</option>)}
              </select>
            </div>

            {errorApi && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{errorApi}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm font-medium hover:bg-white/5 hover:text-white/70 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 text-[#0d1117] text-sm font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20">
                {submitting ? 'Guardando...' : 'Dar de alta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar jugador ──────────────────────────────────────────────────────
const ModalEditar = ({ jugador, onClose, onActualizado }) => {
  const token = useAuthStore((s) => s.token)
  const [form, setForm] = useState({
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    dni: jugador.dni,
    email: jugador.email ?? '',
    telefono: jugador.telefono ?? '',
    categoria: jugador.categoria ?? '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [nombreHint, showNombreHint] = useFieldHint()
  const [apellidoHint, showApellidoHint] = useFieldHint()
  const [dniHint, showDniHint] = useFieldHint()

  const puedeEditarDni = !jugador.cuentaActiva

  const handleBlur = (field) => {
    const err = validators[field]?.(form[field]) ?? ''
    setErrors((prev) => ({ ...prev, [field]: err }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = {
      nombre: validators.nombre(form.nombre),
      apellido: validators.apellido(form.apellido),
      ...(puedeEditarDni && { dni: validators.dni(form.dni) }),
    }
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    if (submitting) return
    setSubmitting(true)
    try {
      const updated = await api.patch(`/jugadores/${jugador.id}`, form, { Authorization: `Bearer ${token}` })
      onActualizado(updated)
    } catch (err) {
      setErrorApi(err.message || 'No se pudo actualizar')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (field) =>
    `bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/15 outline-none focus:bg-white/8 transition-all ${
      errors[field] ? 'border-red-500/60' : 'border-white/8 focus:border-brand-500/60'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-500/30 via-brand-500/20 to-transparent blur-sm" />
        <div className="relative bg-[#0a0f16] border border-white/10 rounded-3xl overflow-hidden">
          <div className="relative px-6 py-5 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <Pencil size={14} className="text-violet-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Editar jugador</p>
                <p className="text-white/30 text-xs">{jugador.nombre} {jugador.apellido}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Nombre <span className="text-brand-400">*</span></label>
                <input value={form.nombre}
                  onChange={(e) => { const f = e.target.value.replace(/[0-9]/g, ''); if (f !== e.target.value) showNombreHint('No puede contener números'); setForm((p) => ({ ...p, nombre: f })); if (errors.nombre) setErrors((p) => ({ ...p, nombre: validators.nombre(f) })) }}
                  onBlur={() => handleBlur('nombre')} placeholder="Juan" className={fieldClass('nombre')} />
                {nombreHint && <p className="text-amber-400 text-xs animate-pulse">{nombreHint}</p>}
                {errors.nombre && <p className="text-red-400 text-xs">{errors.nombre}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Apellido <span className="text-brand-400">*</span></label>
                <input value={form.apellido}
                  onChange={(e) => { const f = e.target.value.replace(/[0-9]/g, ''); if (f !== e.target.value) showApellidoHint('No puede contener números'); setForm((p) => ({ ...p, apellido: f })); if (errors.apellido) setErrors((p) => ({ ...p, apellido: validators.apellido(f) })) }}
                  onBlur={() => handleBlur('apellido')} placeholder="García" className={fieldClass('apellido')} />
                {apellidoHint && <p className="text-amber-400 text-xs animate-pulse">{apellidoHint}</p>}
                {errors.apellido && <p className="text-red-400 text-xs">{errors.apellido}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">
                DNI <span className="text-brand-400">*</span>
                {!puedeEditarDni && <span className="ml-2 text-white/20 normal-case font-normal">(no editable con cuenta activa)</span>}
              </label>
              <div className="relative">
                <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input value={form.dni} disabled={!puedeEditarDni}
                  onChange={(e) => { const f = e.target.value.replace(/[^\d]/g, '').slice(0, 8); if (f !== e.target.value) showDniHint('Solo acepta números'); setForm((p) => ({ ...p, dni: f })); if (errors.dni) setErrors((p) => ({ ...p, dni: validators.dni(f) })) }}
                  onBlur={() => puedeEditarDni && handleBlur('dni')}
                  inputMode="numeric" placeholder="12345678"
                  className={`w-full pl-8 pr-3 ${fieldClass('dni')} ${!puedeEditarDni ? 'opacity-40 cursor-not-allowed' : ''}`} />
              </div>
              {dniHint && <p className="text-amber-400 text-xs animate-pulse">{dniHint}</p>}
              {errors.dni && <p className="text-red-400 text-xs">{errors.dni}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'email', label: 'Email', placeholder: 'juan@mail.com', icon: Mail },
                { name: 'telefono', label: 'Teléfono', placeholder: '1112345678', icon: Phone },
              ].map(({ name, label, placeholder, icon: Icon }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">{label}</label>
                  <div className="relative">
                    <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input value={form[name]} onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                      placeholder={placeholder} className={`w-full pl-8 pr-3 ${fieldClass('')}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-xs font-semibold uppercase tracking-wide">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/60 transition-all appearance-none">
                <option value="" className="bg-[#0d1117] text-white/40">Sin categoría</option>
                {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[#0d1117] text-white">{c}</option>)}
              </select>
            </div>

            {errorApi && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{errorApi}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm font-medium hover:bg-white/5 hover:text-white/70 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-400 text-white text-sm font-bold hover:brightness-110 disabled:opacity-40 transition-all shadow-lg shadow-violet-500/20">
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Drawer detalle jugador ────────────────────────────────────────────────────
const DrawerJugador = ({ jugador, onClose, onEditar, onEliminar, onDarDeBaja, onReactivar }) => {
  if (!jugador) return null
  const adminToken = useAuthStore((s) => s.token)
  const gradient = avatarColor(jugador.id)
  const turnosFijos = jugador._count?.turnosFijos ?? 0
  const reservas = jugador._count?.reservas ?? 0

  const [expandFijos, setExpandFijos] = useState(false)
  const [expandReservas, setExpandReservas] = useState(false)
  const [datosFijos, setDatosFijos] = useState(null)
  const [datosReservas, setDatosReservas] = useState(null)
  const [loadingFijos, setLoadingFijos] = useState(false)
  const [loadingReservas, setLoadingReservas] = useState(false)

  const toggleFijos = async () => {
    const next = !expandFijos
    setExpandFijos(next)
    if (next && datosFijos === null) {
      setLoadingFijos(true)
      try {
        const data = await api.get(`/turnos-fijos/jugador/${jugador.id}`, { Authorization: `Bearer ${adminToken}` })
        setDatosFijos(Array.isArray(data) ? data : [])
      } catch { setDatosFijos([]) }
      finally { setLoadingFijos(false) }
    }
  }

  const toggleReservas = async () => {
    const next = !expandReservas
    setExpandReservas(next)
    if (next && datosReservas === null) {
      setLoadingReservas(true)
      try {
        const data = await api.get(`/reservas/jugador/${jugador.id}`, { Authorization: `Bearer ${adminToken}` })
        setDatosReservas(Array.isArray(data) ? data : [])
      } catch { setDatosReservas([]) }
      finally { setLoadingReservas(false) }
    }
  }

  const DIAS_LABEL = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' }

  const formatFechaCorta = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm bg-[#080d14] sm:border-l border-t sm:border-t-0 border-white/8 h-[85vh] sm:h-full overflow-y-auto flex flex-col rounded-t-3xl sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.5), -20px 0 60px rgba(0,0,0,0.3)' }}
      >
        {/* Hero */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
          <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${gradient} opacity-20 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4`} />
          <div className="relative flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shrink-0`}>
                <span className="text-white font-black text-xl">{initials(jugador)}</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">{jugador.nombre} {jugador.apellido}</p>
                <p className="text-white/40 text-sm">DNI {jugador.dni}</p>
                {jugador.categoria && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">{jugador.categoria}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0">
              <X size={16} />
            </button>
          </div>

          {!jugador.cuentaActiva ? (
            <div className="flex items-center gap-2 bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-amber-400" />
              <span className="text-amber-300 text-sm font-semibold">Sin cuenta</span>
              <span className="text-amber-500/40 text-xs ml-auto">Pendiente de registro</span>
            </div>
          ) : jugador.activo ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-sm font-semibold">Cuenta activa</span>
              <span className="text-emerald-500/50 text-xs ml-auto">Accede al dashboard</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-300 text-sm font-semibold">Dado de baja</span>
              <span className="text-red-500/40 text-xs ml-auto">Sin acceso al sistema</span>
            </div>
          )}
        </div>

        {/* Stats expandibles */}
        <div className="px-6 pb-4 flex flex-col gap-2">
          {/* Card turnos fijos */}
          <button
            type="button"
            onClick={toggleFijos}
            className="relative overflow-hidden p-4 rounded-2xl bg-violet-500/8 border border-violet-500/15 hover:bg-violet-500/12 transition-all text-left w-full"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-violet-400" />
                <span className="text-white/35 text-xs">Turnos fijos</span>
              </div>
              <ChevronDown size={14} className={`text-violet-400/60 transition-transform ${expandFijos ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-white font-black text-3xl mt-1">{turnosFijos}</p>
          </button>
          {expandFijos && (
            <div className="rounded-2xl bg-violet-500/5 border border-violet-500/10 overflow-hidden">
              {loadingFijos ? (
                <p className="text-violet-300/40 text-xs text-center py-4">Cargando...</p>
              ) : datosFijos?.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-4">Sin turnos fijos registrados</p>
              ) : datosFijos?.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-white/4 last:border-0">
                  <div>
                    <p className="text-white/80 text-xs font-semibold">{DIAS_LABEL[t.dia] ?? t.dia} · {t.inicio}–{t.fin}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{t.canchaNombre}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.estado === 'confirmado' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {t.estado === 'confirmado' ? 'Activo' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Card reservas eventuales */}
          <button
            type="button"
            onClick={toggleReservas}
            className="relative overflow-hidden p-4 rounded-2xl bg-brand-500/8 border border-brand-500/15 hover:bg-brand-500/12 transition-all text-left w-full"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-brand-400" />
                <span className="text-white/35 text-xs">Reservas</span>
              </div>
              <ChevronDown size={14} className={`text-brand-400/60 transition-transform ${expandReservas ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-white font-black text-3xl mt-1">{reservas}</p>
          </button>
          {expandReservas && (
            <div className="rounded-2xl bg-brand-500/5 border border-brand-500/10 overflow-hidden">
              {loadingReservas ? (
                <p className="text-brand-300/40 text-xs text-center py-4">Cargando...</p>
              ) : datosReservas?.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-4">Sin reservas registradas</p>
              ) : datosReservas?.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-white/4 last:border-0">
                  <div>
                    <p className="text-white/80 text-xs font-semibold">{formatFechaCorta(r.fecha)} · {r.horaInicio}–{r.horaFin}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{r.cancha?.nombre ?? ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.estado === 'confirmada' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                    {r.estado === 'confirmada' ? 'Confirmada' : r.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contacto */}
        <div className="px-6 pb-4 flex flex-col gap-2">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-1">Contacto</p>
          {jugador.email
            ? <a href={`mailto:${jugador.email}`} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/6 transition-all">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0"><Mail size={13} className="text-blue-400" /></div>
                <span className="text-white/60 text-sm truncate group-hover:text-white/80 transition-colors">{jugador.email}</span>
              </a>
            : <p className="text-white/15 text-xs px-1">Sin email registrado</p>
          }
          {jugador.telefono
            ? <a href={`tel:${jugador.telefono}`} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/6 transition-all">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0"><Phone size={13} className="text-emerald-400" /></div>
                <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">{jugador.telefono}</span>
              </a>
            : <p className="text-white/15 text-xs px-1">Sin teléfono registrado</p>
          }
        </div>

        {/* Fecha alta */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/3 border border-white/6">
            <span className="text-white/30 text-xs">Registrado en el club</span>
            <span className="text-white/50 text-xs font-medium">
              {new Date(jugador.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-8 mt-auto flex flex-col gap-2">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-1">Acciones</p>
          <button onClick={onEditar}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/8 border border-violet-500/15 text-violet-400 text-sm font-medium hover:bg-violet-500/15 transition-all">
            <Pencil size={14} /> Editar datos
          </button>
          {!jugador.cuentaActiva ? (
            <button onClick={() => onEliminar(jugador)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-all">
              <Trash2 size={14} /> Eliminar jugador
            </button>
          ) : jugador.activo ? (
            <button onClick={() => onDarDeBaja(jugador)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-amber-400 text-sm font-medium hover:bg-amber-500/15 transition-all">
              <UserMinus size={14} /> Dar de baja
            </button>
          ) : (
            <button onClick={() => onReactivar(jugador)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/15 transition-all">
              <CheckCircle size={14} /> Reactivar cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmación custom ──────────────────────────────────────────────
const ModalConfirm = ({ config, onConfirm, onCancel }) => {
  if (!config) return null
  const { titulo, mensaje, nombreJugador, variante = 'danger' } = config

  const colores = variante === 'danger'
    ? { icon: 'bg-red-500/15 text-red-400', btn: 'bg-red-600 hover:bg-red-500 text-white', glow: 'rgba(239,68,68,0.15)' }
    : { icon: 'bg-amber-500/15 text-amber-400', btn: 'bg-amber-600 hover:bg-amber-500 text-white', glow: 'rgba(245,158,11,0.15)' }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1922 0%, #0d1117 100%)', boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px rgba(0,0,0,0.6), 0 0 40px ${colores.glow}` }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colores.icon}`}>
            {variante === 'danger' ? <Trash2 size={24} /> : <UserMinus size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{titulo}</h3>
            <p className="text-sm text-slate-400 mt-1">{mensaje}</p>
          </div>
          {nombreJugador && (
            <div className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8">
              <p className="text-sm font-semibold text-white">{nombreJugador}</p>
            </div>
          )}
          {variante === 'danger' && (
            <p className="text-xs text-red-400/80">Esta acción no se puede deshacer.</p>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${colores.btn}`}
          >
            {variante === 'danger' ? 'Eliminar' : 'Dar de baja'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
const JugadoresAdminPage = () => {
  const token = useAuthStore((s) => s.token)
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [modalAlta, setModalAlta] = useState(false)
  const [jugadorDetalle, setJugadorDetalle] = useState(null)
  const [jugadorEditar, setJugadorEditar] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [ayudaAbierta, setAyudaAbierta] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    api.get('/jugadores', { Authorization: `Bearer ${token}` })
      .then(setJugadores).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const jugadoresFiltrados = useMemo(() => {
    let lista = jugadores
    if (filtro === 'activos') lista = lista.filter((j) => j.cuentaActiva && j.activo)
    if (filtro === 'sin_cuenta') lista = lista.filter((j) => !j.cuentaActiva)
    if (filtro === 'inactivos') lista = lista.filter((j) => j.cuentaActiva && !j.activo)
    if (busqueda.trim().length >= 2) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter((j) =>
        j.nombre.toLowerCase().includes(q) ||
        j.apellido.toLowerCase().includes(q) ||
        j.dni.includes(q)
      )
    }
    return lista
  }, [jugadores, filtro, busqueda])

  const totales = useMemo(() => ({
    todos: jugadores.length,
    activos: jugadores.filter((j) => j.cuentaActiva && j.activo).length,
    sin_cuenta: jugadores.filter((j) => !j.cuentaActiva).length,
    inactivos: jugadores.filter((j) => j.cuentaActiva && !j.activo).length,
  }), [jugadores])

  const handleCreado = (jugador) => {
    setJugadores((prev) => [jugador, ...prev])
    setModalAlta(false)
    showToast(`${jugador.nombre} ${jugador.apellido} dado de alta`)
  }

  const handleActualizado = (updated) => {
    setJugadores((prev) => prev.map((j) => j.id === updated.id ? { ...j, ...updated } : j))
    setJugadorEditar(null)
    setJugadorDetalle(null)
    showToast('Datos actualizados correctamente')
  }

  const handleEliminar = (jugador) => {
    setConfirm({
      titulo: 'Eliminar jugador',
      mensaje: '¿Estás seguro que querés eliminar a este jugador?',
      nombreJugador: `${jugador.nombre} ${jugador.apellido}`,
      variante: 'danger',
      onConfirm: async () => {
        setConfirm(null)
        try {
          await api.delete(`/jugadores/${jugador.id}`, { Authorization: `Bearer ${token}` })
          setJugadores((prev) => prev.filter((j) => j.id !== jugador.id))
          setJugadorDetalle(null)
          showToast(`${jugador.nombre} ${jugador.apellido} eliminado`)
        } catch (err) {
          showToast(err.message || 'No se pudo eliminar')
        }
      },
    })
  }

  const handleDarDeBaja = (jugador) => {
    setConfirm({
      titulo: 'Dar de baja',
      mensaje: '¿Estás seguro que querés dar de baja a este jugador? Perderá acceso al sistema.',
      nombreJugador: `${jugador.nombre} ${jugador.apellido}`,
      variante: 'baja',
      onConfirm: async () => {
        setConfirm(null)
        try {
          const updated = await api.patch(`/jugadores/${jugador.id}`, { activo: false }, { Authorization: `Bearer ${token}` })
          setJugadores((prev) => prev.map((j) => j.id === updated.id ? { ...j, ...updated } : j))
          setJugadorDetalle(null)
          showToast(`${jugador.nombre} ${jugador.apellido} dado de baja`)
        } catch (err) {
          showToast(err.message || 'No se pudo dar de baja')
        }
      },
    })
  }

  const handleReactivar = async (jugador) => {
    try {
      const updated = await api.patch(`/jugadores/${jugador.id}`, { activo: true }, { Authorization: `Bearer ${token}` })
      setJugadores((prev) => prev.map((j) => j.id === updated.id ? { ...j, ...updated } : j))
      setJugadorDetalle(null)
      showToast(`${jugador.nombre} ${jugador.apellido} reactivado`)
    } catch (err) {
      showToast(err.message || 'No se pudo reactivar')
    }
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 flex flex-col gap-6 bg-[#060a0f] -m-4 md:-m-6 px-4 md:px-6 py-4 md:py-6">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1922] via-[#0d1117] to-[#0a0f16] p-4 md:p-6 lg:p-8" style={{ border: '1px solid transparent', backgroundClip: 'padding-box', boxShadow: '0 0 0 1px rgba(175,202,11,0.15), 0 0 30px rgba(175,202,11,0.04)' }}>
        <div className="absolute top-0 left-1/4 w-64 h-32 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-24 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl blur-md opacity-40" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/30">
                <Users size={22} className="text-[#0d1117]" />
              </div>
            </div>
            <div>
              <h1 className="text-white font-black text-xl md:text-2xl tracking-tight">Jugadores</h1>
              <p className="text-white/35 text-sm mt-0.5">Directorio completo del club</p>
            </div>
          </div>

          <button onClick={() => setModalAlta(true)}
            className="group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl overflow-hidden font-bold text-sm transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-400 group-hover:brightness-110 transition-all" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-brand-400 to-emerald-400" />
            <UserPlus size={16} className="text-[#0d1117] relative z-10" />
            <span className="text-[#0d1117] relative z-10">Dar de alta</span>
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totales.todos, color: 'text-white', icon: Users, bg: 'bg-white/5 border-white/8' },
            { label: 'Con cuenta', value: totales.activos, color: 'text-emerald-400', icon: CheckCircle, bg: 'bg-emerald-500/8 border-emerald-500/15' },
            { label: 'Sin cuenta', value: totales.sin_cuenta, color: 'text-white/40', icon: Clock, bg: 'bg-white/3 border-white/6' },
            { label: 'Inactivos', value: totales.inactivos, color: 'text-slate-400', icon: UserMinus, bg: 'bg-slate-500/8 border-slate-500/15' },
          ].map(({ label, value, color, icon: Icon, bg }) => (
            <div key={label} className={`rounded-2xl border ${bg} px-4 py-3 flex items-center gap-3`}>
              <Icon size={16} className={`${color} shrink-0`} />
              <div>
                <p className={`font-black text-xl leading-none ${color}`}>{value}</p>
                <p className="text-white/25 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="w-full bg-[#0d1117] border border-violet-500/15 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-violet-500/40 focus:bg-white/3 transition-all" />
        </div>
        <div className="flex bg-[#0d1117] border border-violet-500/15 rounded-2xl overflow-hidden shrink-0">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'activos', label: 'Activos' },
            { key: 'sin_cuenta', label: 'Sin cuenta' },
            { key: 'inactivos', label: 'Inactivos' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-4 py-3 text-xs font-semibold transition-all ${filtro === key ? 'bg-brand-500/15 text-brand-400' : 'text-white/30 hover:text-white/60 hover:bg-white/4'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Botón ayuda + panel */}
      <div className="flex justify-end">
        <button
          onClick={() => setAyudaAbierta((v) => !v)}
          title="Ayuda"
          className={['w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0',
            ayudaAbierta
              ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
              : 'bg-white/4 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20',
          ].join(' ')}
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {ayudaAbierta && (
        <div className="rounded-2xl p-5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 0 1px rgba(175,202,11,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <HelpCircle size={14} className="text-brand-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">¿Cómo funciona el directorio?</h3>
            </div>
            <button onClick={() => setAyudaAbierta(false)} className="text-white/20 hover:text-white/50 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Estados */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Estados del jugador</p>
            <div className="flex flex-col gap-2.5">
              {[
                { color: 'bg-emerald-400', nombre: 'Activo', desc: 'Cuenta registrada con acceso completo al dashboard. Puede reservar canchas, ver turnos y estadísticas.' },
                { color: 'bg-gradient-to-br from-emerald-400 to-amber-400', nombre: 'Sin cuenta', desc: 'Cargado manualmente por el admin. Cuando el jugador se registre con el mismo DNI, el sistema hace el match automáticamente y le asigna todo su historial.' },
                { color: 'bg-red-500', nombre: 'Inactivo', desc: 'Cuenta desactivada. El jugador no puede ingresar al sistema. Podés reactivarla en cualquier momento desde su ficha.' },
              ].map(({ color, nombre, desc }) => (
                <div key={nombre} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${color} mt-1 shrink-0`} />
                  <p className="text-xs text-white/40 leading-relaxed">
                    <span className="font-semibold text-white/70">{nombre}</span> — {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-white/6 mt-4">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">Acciones disponibles</p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Dar de alta', desc: 'Crea un jugador sin cuenta para registrar su historial antes de que se registre.' },
                { label: 'Editar datos', desc: 'Modifica nombre, apellido, contacto y categoría. El DNI solo se puede cambiar si no tiene cuenta activa.' },
                { label: 'Dar de baja / Reactivar', desc: 'Desactiva o vuelve a activar el acceso al sistema sin borrar el historial.' },
                { label: 'Eliminar', desc: 'Solo disponible para jugadores sin cuenta. Borra el registro permanentemente.' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 shrink-0" />
                  <p className="text-xs text-white/40 leading-relaxed">
                    <span className="font-semibold text-white/60">{label}</span> — {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#0d1117] rounded-3xl overflow-hidden flex-1" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.18), 0 0 40px rgba(139,92,246,0.04)' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
              <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-violet-500/10 border-b-violet-500/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-white/20 text-sm">Cargando jugadores...</p>
          </div>
        ) : jugadoresFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/3 border border-white/6 flex items-center justify-center">
              <Users size={28} className="text-white/10" />
            </div>
            <div className="text-center">
              <p className="text-white/30 text-sm font-medium">{busqueda ? 'Sin resultados para esa búsqueda' : 'No hay jugadores aún'}</p>
              {!busqueda && <button onClick={() => setModalAlta(true)} className="mt-2 text-brand-400 text-xs font-semibold hover:text-brand-300 transition-colors">Dar de alta el primero →</button>}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {jugadoresFiltrados.map((j, idx) => {
              const gradient = avatarColor(j.id)
              return (
                <button key={j.id} onClick={() => setJugadorDetalle(j)}
                  className="group w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-all text-left">
                  <span className="text-white/10 text-xs font-mono w-5 text-right shrink-0">{idx + 1}</span>
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="text-white font-black text-sm">{initials(j)}</span>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1117] ${!j.cuentaActiva ? 'bg-gradient-to-br from-emerald-400 to-amber-400' : j.activo ? 'bg-emerald-400' : 'bg-red-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm group-hover:text-brand-300 transition-colors">{j.apellido}, {j.nombre}</span>
                      {j.categoria && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 shrink-0">{j.categoria}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-white/25 text-xs">DNI {j.dni}</span>
                      {j._count?.turnosFijos > 0 && <span className="flex items-center gap-1 text-white/20 text-xs"><Zap size={9} className="text-violet-400/60" />{j._count.turnosFijos} fijo{j._count.turnosFijos !== 1 ? 's' : ''}</span>}
                      {j._count?.reservas > 0 && <span className="flex items-center gap-1 text-white/20 text-xs"><CalendarDays size={9} className="text-brand-400/60" />{j._count.reservas} reserva{j._count.reservas !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    {!j.cuentaActiva
                      ? <span className="text-[10px] font-bold text-amber-400/70">Sin cuenta</span>
                      : j.activo
                        ? <span className="text-[10px] font-bold text-emerald-400/70">Activo</span>
                        : <span className="text-[10px] font-bold text-red-400/70">Inactivo</span>
                    }
                  </div>
                  <ChevronRight size={14} className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {modalAlta && <ModalAlta onClose={() => setModalAlta(false)} onCreado={handleCreado} />}
      {jugadorDetalle && !jugadorEditar && (
        <DrawerJugador
          jugador={jugadorDetalle}
          onClose={() => setJugadorDetalle(null)}
          onEditar={() => setJugadorEditar(jugadorDetalle)}
          onEliminar={handleEliminar}
          onDarDeBaja={handleDarDeBaja}
          onReactivar={handleReactivar}
        />
      )}
      {jugadorEditar && (
        <ModalEditar
          jugador={jugadorEditar}
          onClose={() => setJugadorEditar(null)}
          onActualizado={handleActualizado}
        />
      )}

      {/* Modal confirmar eliminar / dar de baja */}
      <ModalConfirm
        config={confirm}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0d1117] border border-brand-500/30 shadow-2xl" style={{ boxShadow: '0 0 0 1px rgba(175,202,11,0.2), 0 20px 40px rgba(0,0,0,0.6)' }}>
          <div className="w-7 h-7 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
            <CheckCircle size={14} className="text-brand-400" />
          </div>
          <p className="text-white text-sm font-semibold">{toast}</p>
        </div>
      </div>
    </div>
  )
}

export default JugadoresAdminPage
