import { create } from 'zustand'

const useProfesoresStore = create((set, get) => ({
  profesores: [],

  // Carga desde backend
  setProfesores: (profesores) => set({ profesores }),

  // Admin agrega un profesor
  addProfesor: ({ nombre, apellido, email, password, especialidad, canchasIds = [] }) => {
    const nuevo = {
      id: Date.now(),
      nombre,
      apellido,
      email,
      password,
      especialidad: especialidad || '',
      canchasIds,
      activo: true,
      desde: new Date().toISOString().slice(0, 10),
    }
    set((state) => ({ profesores: [nuevo, ...state.profesores] }))
    return nuevo
  },

  // Admin edita un profesor existente
  updateProfesor: (id, data) => {
    set((state) => ({
      profesores: state.profesores.map((p) => p.id === id ? { ...p, ...data } : p)
    }))
  },

  // Admin desactiva/reactiva un profesor (no se elimina)
  toggleProfesor: (id) => {
    set((state) => ({
      profesores: state.profesores.map((p) => p.id === id ? { ...p, activo: !p.activo } : p)
    }))
  },

  // Login: busca por email + password
  findByCredentials: (email, password) => {
    return get().profesores.find(
      (p) => p.email === email && p.password === password && p.activo
    ) || null
  },
}))

export default useProfesoresStore
