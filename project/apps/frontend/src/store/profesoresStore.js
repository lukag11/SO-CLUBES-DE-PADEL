import { create } from 'zustand'

// Cache en memoria de la lista de profesores del club (admin).
// Cargado desde /api/profesores — sin localStorage.
const useProfesoresStore = create((set) => ({
  profesores: [],
  loading: false,
  setProfesores: (profesores) => set({ profesores }),
  setLoading: (loading) => set({ loading }),
  addProfesor: (p) => set((s) => ({ profesores: [p, ...s.profesores] })),
  updateProfesor: (id, data) =>
    set((s) => ({ profesores: s.profesores.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
  removeProfesor: (id) =>
    set((s) => ({ profesores: s.profesores.filter((p) => p.id !== id) })),
}))

export default useProfesoresStore
