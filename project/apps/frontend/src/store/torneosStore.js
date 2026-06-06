import { create } from 'zustand'

const CATS_CACHE_KEY = 'torneos_categorias_v1'

const loadCategorias = () => {
  try {
    const saved = localStorage.getItem(CATS_CACHE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return []
}

const saveCats = (categorias) => {
  try { localStorage.setItem(CATS_CACHE_KEY, JSON.stringify(categorias)) } catch { /* ignore */ }
}

const useTorneosStore = create((set, get) => ({
  torneos: [],                              // siempre vacío al inicio — se carga desde el backend
  categoriasGuardadas: loadCategorias(),    // preferencia UI del club — localStorage OK

  saveCategoria: (cat) => {
    set((state) => {
      if (state.categoriasGuardadas.includes(cat)) return state
      const updated = [...state.categoriasGuardadas, cat]
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  deleteCategoria: (cat) => {
    set((state) => {
      const updated = state.categoriasGuardadas.filter((c) => c !== cat)
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  renameCategoria: (oldCat, newCat) => {
    set((state) => {
      const updated = state.categoriasGuardadas.map((c) => c === oldCat ? newCat : c)
      saveCats(updated)
      return { categoriasGuardadas: updated }
    })
  },

  // Fallback local cuando el backend no está disponible
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
      premioPrimero: form.premioPrimero ?? '',
      premioSegundo: form.premioSegundo ?? '',
      premioSemifinal: form.premioSemifinal ?? '',
      premioExtra: form.premioExtra ?? '',
      whatsapp: form.whatsapp ?? '',
      servicios: form.servicios ?? [],
      imagenFondo: form.imagenFondo ?? '',
      colorAcento: null,
      estiloCardFixture: 'oscura', colorCardFixture: null,
      estiloCardGrupos: 'oscura',  colorCardGrupos: null,
      colorCard: null, estiloCard: 'oscura', fontScale: 'normal',
      imagenFondoDraw: null, imagenFondoBracket: null,
      imagenFondoFixture: null, imagenFondoGrupos: null,
      imagenHeaderGrupos: null, colorTextoCardGrupos: null,
      sponsors: [], sponsorScale: 'normal',
      bannerLateral1Fixture: null, bannerLateral2Fixture: null,
      bannerLateral1Grupos: null,  bannerLateral2Grupos: null,
      drawMostrarClub: true, drawTitulo: 'Main Draw',
      drawMostrarNombre: true, drawMostrarFechas: true,
      drawMostrarCategorias: true, drawColorTitulo: null,
      bracketColores: {}, bracketColorCards: {},
      cupoEsperaPorCategoria: form.cupoLibre ? {} : Object.fromEntries(
        Object.entries(form.cupoEsperaPorCategoria ?? {}).map(([k, v]) => [k, v === '' ? 0 : v])
      ),
      generoPorCategoria: form.generoPorCategoria ?? {},
      estado: 'draft',
      inscriptos: [], grupos: null, brackets: {},
      ganador: null, subcampeon: null,
    }
    set((state) => ({ torneos: [nuevo, ...state.torneos] }))
    return nuevo
  },

  setEstado: (id, estado) => {
    set((state) => ({
      torneos: state.torneos.map((t) => t.id === id ? { ...t, estado } : t)
    }))
  },

  setBracket: (id, categoria, bracket) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === id
          ? { ...t, brackets: { ...(t.brackets ?? {}), [categoria]: bracket }, estado: 'in_progress' }
          : t
      )
    }))
  },

  updateBracket: (id, categoria, bracket) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === id
          ? { ...t, brackets: { ...(t.brackets ?? {}), [categoria]: bracket } }
          : t
      )
    }))
  },

  bajaInscripto: (torneoId, inscriptoId) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, inscriptos: t.inscriptos.filter((i) => i.id !== inscriptoId) }
          : t
      )
    }))
  },

  addParejaFromApi: (torneoId, pareja) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === torneoId ? { ...t, inscriptos: [...t.inscriptos, pareja] } : t
      )
    }))
  },

  addPareja: (torneoId, pareja) => {
    set((state) => {
      const torneo = state.torneos.find((t) => t.id === torneoId)
      if (!torneo) return state
      const nextId = torneo.inscriptos.length
        ? Math.max(...torneo.inscriptos.map((i) => i.id)) + 1
        : 1
      return {
        torneos: state.torneos.map((t) =>
          t.id === torneoId
            ? { ...t, inscriptos: [...t.inscriptos, { id: nextId, ...pareja }] }
            : t
        )
      }
    })
  },

  setGrupos: (torneoId, grupos) => {
    set((state) => ({
      torneos: state.torneos.map((t) => t.id === torneoId ? { ...t, grupos } : t)
    }))
  },

  updateGrupos: (torneoId, grupos) => {
    set((state) => ({
      torneos: state.torneos.map((t) => t.id === torneoId ? { ...t, grupos } : t)
    }))
  },

  resolveGroupTie: (torneoId, zonaIdx, primero, segundo) => {
    set((state) => ({
      torneos: state.torneos.map((t) => {
        if (t.id !== torneoId || !t.grupos) return t
        const newGrupos = JSON.parse(JSON.stringify(t.grupos))
        const zona = newGrupos[zonaIdx]
        if (zona) { zona.clasificados = [primero, segundo]; zona.necesitaDesempate = false }
        return { ...t, grupos: newGrupos }
      })
    }))
  },

  updatePareja: (torneoId, parejaId, changes) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, inscriptos: t.inscriptos.map((i) => i.id === parejaId ? { ...i, ...changes } : i) }
          : t
      )
    }))
  },

  deleteTorneo: (id) => {
    set((state) => ({ torneos: state.torneos.filter((t) => t.id !== id) }))
  },

  updateTorneo: (id, form) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id !== id ? t : {
          ...t,
          nombre: form.nombre, categorias: form.categorias, genero: form.genero,
          cupoLibre: form.cupoLibre,
          cuposPorCategoria: form.cupoLibre ? {} : form.cuposPorCategoria,
          cupoEsperaPorCategoria: form.cupoLibre ? {} : Object.fromEntries(
            Object.entries(form.cupoEsperaPorCategoria ?? {}).map(([k, v]) => [k, v === '' ? 0 : v])
          ),
          generoPorCategoria: form.generoPorCategoria ?? {},
          formato: form.formato,
          canchasAsignadas: form.canchasAsignadas ?? [],
          fechaInicio: form.fechaInicio, fechaFin: form.fechaFin,
          fechaLimiteInscripcion: form.fechaLimiteInscripcion ?? null,
          diaInicioEliminatoria: form.diaInicioEliminatoria ?? null,
          horaInicioEliminatoria: form.horaInicioEliminatoria ?? null,
          descripcion: form.descripcion,
          premioPrimero: form.premioPrimero ?? '',
          premioSegundo: form.premioSegundo ?? '',
          premioSemifinal: form.premioSemifinal ?? '',
          premioExtra: form.premioExtra ?? '',
          whatsapp: form.whatsapp ?? '',
          servicios: form.servicios ?? [],
          imagenFondo: form.imagenFondo ?? '',
        }
      )
    }))
  },

  updateBracketColor: (torneoId, categoria, color) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === torneoId
          ? { ...t, bracketColores: { ...(t.bracketColores ?? {}), [categoria]: color } }
          : t
      )
    }))
  },

  updatePersonalizacion: (id, campos) => {
    set((state) => ({
      torneos: state.torneos.map((t) => t.id === id ? { ...t, ...campos } : t)
    }))
  },

  // Reemplaza todos los torneos (carga desde backend)
  setTorneos: (torneos) => set({ torneos }),

  addTorneoFromApi: (torneo) => {
    set((state) => ({ torneos: [torneo, ...state.torneos] }))
  },

  updateTorneoFromApi: (torneo) => {
    set((state) => ({
      torneos: state.torneos.map((t) => t.id === torneo.id ? { ...t, ...torneo } : t)
    }))
  },

  // Upsert atómico: evita duplicados cuando el closure del componente tiene estado stale
  upsertTorneoFromApi: (torneo) => {
    set((state) => {
      const exists = state.torneos.some((t) => String(t.id) === String(torneo.id))
      if (exists) {
        return { torneos: state.torneos.map((t) => String(t.id) === String(torneo.id) ? { ...t, ...torneo } : t) }
      }
      return { torneos: [torneo, ...state.torneos] }
    })
  },

  setGanadores: (id, { ganador, subcampeon }) => {
    set((state) => ({
      torneos: state.torneos.map((t) =>
        t.id === id ? { ...t, ganador, subcampeon, estado: 'finished' } : t
      )
    }))
  },
}))

export default useTorneosStore
