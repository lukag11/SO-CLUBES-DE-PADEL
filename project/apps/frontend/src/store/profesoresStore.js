import { create } from 'zustand'

const KEY = 'club_profesores'

// Profesor de prueba — siempre disponible aunque el localStorage esté vacío
const PROFESOR_TEST = {
  id: 1,
  nombre: 'Carlos',
  apellido: 'Ramírez',
  email: 'profe@test.com',
  password: '1234',
  especialidad: 'Pádel nivel avanzado',
  canchasIds: [],
  activo: true,
  desde: '2026-01-01',
  _seed: true,
}

const load = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const list = JSON.parse(saved)
      // Asegura que el profesor test siempre esté presente
      if (!list.some((p) => p._seed)) return [PROFESOR_TEST, ...list]
      return list
    }
  } catch { /* ignore */ }
  return [PROFESOR_TEST]
}

const save = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const useProfesoresStore = create((set, get) => ({
  profesores: load(),

  // Admin agrega un profesor
  addProfesor: ({ nombre, apellido, email, password, especialidad, canchasIds = [] }) => {
    const nuevo = {
      id: Date.now(),
      nombre,
      apellido,
      email,
      password, // En producción esto va hasheado en el backend
      especialidad: especialidad || '',
      canchasIds, // IDs de canchas en las que puede crear clases
      activo: true,
      desde: new Date().toISOString().slice(0, 10),
    }
    set((state) => {
      const updated = [nuevo, ...state.profesores]
      save(updated)
      return { profesores: updated }
    })
    return nuevo
  },

  // Admin edita un profesor existente
  updateProfesor: (id, data) => {
    set((state) => {
      const updated = state.profesores.map((p) =>
        p.id === id ? { ...p, ...data } : p
      )
      save(updated)
      return { profesores: updated }
    })
  },

  // Admin desactiva/reactiva un profesor (no se elimina)
  toggleProfesor: (id) => {
    set((state) => {
      const updated = state.profesores.map((p) =>
        p.id === id ? { ...p, activo: !p.activo } : p
      )
      save(updated)
      return { profesores: updated }
    })
  },

  // Login: busca por email + password
  findByCredentials: (email, password) => {
    return get().profesores.find(
      (p) => p.email === email && p.password === password && p.activo
    ) || null
  },
}))

export default useProfesoresStore
