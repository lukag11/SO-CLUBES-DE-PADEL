import { useState } from 'react'

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
export const POSICIONES = ['Drive', 'Revés', 'Ambas']
export const MANOS = ['Diestro', 'Zurdo']
export const CATEGORIAS = ['1ra Categoría', '2da Categoría', '3ra Categoría', '4ta Categoría', '5ta Categoría', '6ta Categoría', '7ma Categoría', '8va Categoría']
export const FRECUENCIAS = ['1 vez por semana', '2-3 veces por semana', '4-5 veces por semana', 'Todos los días']

const INITIAL_STATE = {
  // Paso 1 — Datos básicos
  nombre: '',
  apellido: '',
  genero: '',
  apodo: '',
  dni: '',
  email: '',
  telefono: '',
  provincia: '',
  ciudad: '',
  fechaNacimiento: '',
  avatar: null,

  // Paso 2 — Perfil del jugador
  posicion: '',
  mano: '',
  categoria: '',

  // Paso 3 — Preferencias
  frecuencia: '',
  diasDisponibles: [],
  horariosDisponibles: [],
  perfilPublico: false,
  password: '',
  confirmarPassword: '',
}

// Reglas de validación por campo
const validators = {
  genero: (v) => !v ? 'Seleccioná el género' : '',
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
    if (!/^\d+$/.test(v)) return 'El DNI solo puede contener números'
    if (v.length < 7 || v.length > 8) return 'El DNI debe tener 7 u 8 dígitos'
    return ''
  },
  email: (v) => {
    if (!v) return 'El email es requerido'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Ingresá un email válido'
    return ''
  },
  telefono: (v) => {
    if (!v || v.replace(/\s/g, '').length === 0) return 'El teléfono es requerido'
    const digitos = v.replace(/\s/g, '')
    if (digitos.length !== 10) return 'El número debe tener 10 dígitos (código de área + número)'
    return ''
  },
  provincia: (v) => !v ? 'Seleccioná una provincia' : '',
  ciudad: (v) => !v ? 'Seleccioná una ciudad' : '',
  fechaNacimiento: (v) => {
    if (!v) return 'La fecha de nacimiento es requerida'
    const edad = Math.floor((new Date() - new Date(v)) / (1000 * 60 * 60 * 24 * 365.25))
    if (edad < 5) return 'Fecha de nacimiento inválida'
    if (edad > 100) return 'Fecha de nacimiento inválida'
    return ''
  },
  posicion: (v) => !v ? 'Seleccioná una posición' : '',
  mano: (v) => !v ? 'Seleccioná la mano dominante' : '',
  categoria: (v) => !v ? 'Seleccioná una categoría' : '',
  frecuencia: (v) => !v ? 'Seleccioná la frecuencia de juego' : '',
  diasDisponibles: (v) => v.length === 0 ? 'Seleccioná al menos un día' : '',
  horariosDisponibles: (v) => v.length === 0 ? 'Seleccioná al menos un horario' : '',
  password: (v) => {
    if (!v) return 'La contraseña es requerida'
    if (v.length < 8) return 'Mínimo 8 caracteres'
    return ''
  },
  confirmarPassword: (v, all) => {
    if (!v) return 'Confirmá la contraseña'
    if (v !== all.password) return 'Las contraseñas no coinciden'
    return ''
  },
}

// Campos requeridos por paso
const STEP_FIELDS = {
  1: ['genero', 'nombre', 'apellido', 'dni', 'email', 'provincia', 'ciudad', 'fechaNacimiento'],
  2: ['posicion', 'mano', 'categoria'],
  3: ['frecuencia', 'diasDisponibles', 'horariosDisponibles', 'password', 'confirmarPassword'],
}

const useRegisterForm = () => {
  const [form, setForm] = useState(INITIAL_STATE)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    // Revalidar al cambiar
    if (touched[name]) {
      const validator = validators[name]
      if (validator) {
        const updatedForm = { ...form, [name]: value }
        setErrors((prev) => ({ ...prev, [name]: validator(value, updatedForm) }))
      }
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setValue(name, value)
  }

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const validator = validators[name]
    if (validator) {
      setErrors((prev) => ({ ...prev, [name]: validator(form[name], form) }))
    }
  }

  const toggleArrayValue = (name, value) => {
    const current = form[name]
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setValue(name, next)
  }

  // Valida solo los campos del paso actual
  const validateStep = (step) => {
    const fields = STEP_FIELDS[step]
    const stepErrors = {}
    let isValid = true

    fields.forEach((field) => {
      const validator = validators[field]
      if (validator) {
        const error = validator(form[field], form)
        if (error) {
          stepErrors[field] = error
          isValid = false
        }
      }
    })

    setErrors((prev) => ({ ...prev, ...stepErrors }))
    setTouched((prev) => {
      const next = { ...prev }
      fields.forEach((f) => (next[f] = true))
      return next
    })

    return isValid
  }

  const reset = () => {
    setForm(INITIAL_STATE)
    setErrors({})
    setTouched({})
  }

  return {
    form,
    errors,
    touched,
    handleChange,
    handleBlur,
    toggleArrayValue,
    setValue,
    validateStep,
    reset,
  }
}

export default useRegisterForm
