import { create } from 'zustand'
import { TORNEOS_INICIALES } from '../features/admin/torneosMockData'

const CACHE_KEY      = 'torneos_v1'
const CATS_CACHE_KEY = 'torneos_categorias_v1'

const loadTorneos = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return TORNEOS_INICIALES
}

const loadCategorias = () => {
  try {
    const saved = localStorage.getItem(CATS_CACHE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

const save      = (torneos)    => { try { localStorage.setItem(CACHE_KEY,      JSON.stringify(torneos))    } catch { /* ignore */ } }
const saveCats  = (categorias) => { try { localStorage.setItem(CATS_CACHE_KEY, JSON.stringify(categorias)) } catch { /* ignore */ } }

const useTorneosStore = create((set, get) => ({
  torneos: loadTorneos(),
  categoriasGuardadas: loadCategorias(), // variantes persistidas por el club

  // Guarda una variante de categoría (ej: "4° Categoría B +35")
  saveCategoria: (cat) => {
    set((state) => {
      if (state.categoriasGuardadas.includes(cat)) return state
      const updated = [...state.categoriasGuardadas, cat]
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  // Elimina una variante guardada
  deleteCategoria: (cat) => {
    set((state) => {
      const updated = state.categoriasGuardadas.filter((c) => c !== cat)
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  // Renombra una variante guardada
  renameCategoria: (oldCat, newCat) => {
    set((state) => {
      const updated = state.categoriasGuardadas.map((c) => c === oldCat ? newCat : c)
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  // Agrega un nuevo torneo (siempre arranca en draft)
  addTorneo: (form) => {
    const nuevo = {
      id: Date.now(),
      nombre: form.nombre,
      categorias: form.categorias,
      cupoLibre: form.cupoLibre,
      cuposPorCategoria: form.cupoLibre ? {} : form.cuposPorCategoria,
      formato: form.formato,
      genero: form.genero ?? 'Masculino',
      canchasAsignadas: form.canchasAsignadas ?? [],
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      fechaLimiteInscripcion: form.fechaLimiteInscripcion ?? null,
      diaInicioEliminatoria:  form.diaInicioEliminatoria  ?? null,
      horaInicioEliminatoria: form.horaInicioEliminatoria ?? null,
      descripcion: form.descripcion,
      colorAcento: null,
      estiloCardFixture: 'oscura',
      colorCardFixture: null,
      estiloCardGrupos: 'oscura',
      colorCardGrupos: null,
      colorCard: null,
      estiloCard: 'oscura',
      fontScale: 'normal',
      imagenFondoDraw: null,
      imagenFondoBracket: null,
      imagenFondoFixture: null,
      imagenFondoGrupos: null,
      imagenHeaderGrupos: null,
      colorTextoCardGrupos: null,
      sponsors: [],
      sponsorScale: 'normal',
      bannerLateral1Fixture: null,
      bannerLateral2Fixture: null,
      bannerLateral1Grupos: null,
      bannerLateral2Grupos: null,
      drawMostrarClub: true,
      drawTitulo: 'Main Draw',
      drawMostrarNombre: true,
      drawMostrarFechas: true,
      drawMostrarCategorias: true,
      drawColorTitulo: null,
      bracketColores: {},
      bracketColorCards: {},
      cupoEspera: form.cupoLibre ? 0 : (form.cupoEspera ?? 5),
      estado: 'draft',
      inscriptos: [],
      grupos: null,
      brackets: {},
      ganador: null,
      subcampeon: null,
    }
    set((state) => {
      const updated = [nuevo, ...state.torneos]
      save(updated)
      return { torneos: updated }
    })
    return nuevo
  },

  // Transiciona el estado de un torneo
  setEstado: (id, estado) => {
    set((state) => {
      const updated = state.torneos.map((t) => t.id === id ? { ...t, estado } : t)
      save(updated)
      return { torneos: updated }
    })
  },

  // Asigna el bracket de una categoría y pasa a in_progress
  setBracket: (id, categoria, bracket) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === id
          ? { ...t, brackets: { ...(t.brackets ?? {}), [categoria]: bracket }, estado: 'in_progress' }
          : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Actualiza el bracket de una categoría (para avanzar ganadores)
  updateBracket: (id, categoria, bracket) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === id
          ? { ...t, brackets: { ...(t.brackets ?? {}), [categoria]: bracket } }
          : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Da de baja una pareja inscripta
  bajaInscripto: (torneoId, inscriptoId) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, inscriptos: t.inscriptos.filter((i) => i.id !== inscriptoId) }
          : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Inscribe una pareja en un torneo
  addPareja: (torneoId, pareja) => {
    set((state) => {
      const torneo = state.torneos.find((t) => t.id === torneoId)
      if (!torneo) return state
      const nextId = torneo.inscriptos.length
        ? Math.max(...torneo.inscriptos.map((i) => i.id)) + 1
        : 1
      const nueva = { id: nextId, ...pareja }
      const updated = state.torneos.map((t) =>
        t.id === torneoId ? { ...t, inscriptos: [...t.inscriptos, nueva] } : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Asigna la fase de grupos generada
  setGrupos: (torneoId, grupos) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === torneoId ? { ...t, grupos } : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Actualiza los grupos (para registrar resultados de partidos)
  updateGrupos: (torneoId, grupos) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === torneoId ? { ...t, grupos } : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Resuelve manualmente un empate en zona de 3
  resolveGroupTie: (torneoId, zonaIdx, primero, segundo) => {
    set((state) => {
      const updated = state.torneos.map((t) => {
        if (t.id !== torneoId || !t.grupos) return t
        const newGrupos = JSON.parse(JSON.stringify(t.grupos))
        const zona = newGrupos[zonaIdx]
        if (zona) {
          zona.clasificados      = [primero, segundo]
          zona.necesitaDesempate = false
        }
        return { ...t, grupos: newGrupos }
      })
      save(updated)
      return { torneos: updated }
    })
  },

  // Edita los datos de una pareja inscripta
  updatePareja: (torneoId, parejaId, changes) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, inscriptos: t.inscriptos.map((i) => i.id === parejaId ? { ...i, ...changes } : i) }
          : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Elimina un torneo (solo draft / open)
  deleteTorneo: (id) => {
    set((state) => {
      const updated = state.torneos.filter((t) => t.id !== id)
      save(updated)
      return { torneos: updated }
    })
  },

  // Actualiza datos del formulario de un torneo existente
  updateTorneo: (id, form) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id !== id ? t : {
          ...t,
          nombre: form.nombre,
          categorias: form.categorias,
          genero: form.genero,
          cupoLibre: form.cupoLibre,
          cuposPorCategoria: form.cupoLibre ? {} : form.cuposPorCategoria,
          cupoEspera: form.cupoLibre ? 0 : (form.cupoEspera ?? 5),
          formato: form.formato,
          canchasAsignadas: form.canchasAsignadas ?? [],
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          fechaLimiteInscripcion: form.fechaLimiteInscripcion ?? null,
          diaInicioEliminatoria: form.diaInicioEliminatoria ?? null,
          horaInicioEliminatoria: form.horaInicioEliminatoria ?? null,
          descripcion: form.descripcion,
        }
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Actualiza el color de bracket de una categoría específica
  updateBracketColor: (torneoId, categoria, color) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, bracketColores: { ...(t.bracketColores ?? {}), [categoria]: color } }
          : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Actualiza solo los campos de personalización visual
  updatePersonalizacion: (id, campos) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === id ? { ...t, ...campos } : t
      )
      save(updated)
      return { torneos: updated }
    })
  },

  // Registra campeón y subcampeón al finalizar el bracket
  setGanadores: (id, { ganador, subcampeon }) => {
    set((state) => {
      const updated = state.torneos.map((t) =>
        t.id === id ? { ...t, ganador, subcampeon, estado: 'finished' } : t
      )
      save(updated)
      return { torneos: updated }
    })
  },
}))

export default useTorneosStore
