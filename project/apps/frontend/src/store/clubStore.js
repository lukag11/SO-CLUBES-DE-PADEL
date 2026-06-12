import { create } from 'zustand'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Normaliza horarios de cancha: {} o sin días configurados → null (sin horario propio)
const normalizeHorarios = (h) => {
  if (!h || typeof h !== 'object') return null
  const tieneAlgunDia = Object.values(h).some((d) => d && typeof d === 'object' && 'activo' in d)
  return tieneAlgunDia ? h : null
}

const HORARIOS_DEFAULT = Object.fromEntries(
  DIAS_SEMANA.map((dia, i) => [
    dia,
    {
      apertura: i < 5 ? '08:00' : '09:00',
      cierre: i === 6 ? '21:00' : i === 5 ? '22:00' : '23:00',
      activo: true,
    },
  ])
)

const INITIAL_CLUB = {
  // Identidad y contacto: vacíos por defecto — los completa cada club desde su config.
  // Nunca poner datos demo acá: con el merge `...INITIAL_CLUB, ...config` se filtrarían
  // a la landing de un club que aún no configuró estos campos.
  nombre: '',
  descripcion: '',
  direccion: '',
  telefono: '',
  email: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  logo: null,
  tituloBio: 'Quiénes Somos',
  historia: '',
  anoFundacion: '',
  fotoPrincipal: null,
  // Copy genérico reutilizable (no es identidad de un club puntual) — se conserva como default.
  heroTitulo: 'Tu cancha te espera,',
  heroTituloDestacado: 'reservá ahora',
  heroSubtitulo: 'Reservas online, torneos y estadísticas. Todo desde tu celular, en cualquier momento.',
  heroBadge: '',
  heroCtaPrimarioTexto: 'Reservar cancha',
  heroCtaSecundarioTexto: 'Ver torneos',
  heroImagen: 'https://res.cloudinary.com/djyhwdmek/image/upload/v1775334793/padel/heropadel_ekeoax.jpg',
  // Contenido de secciones: vacío por defecto. Los componentes de landing
  // (GaleriaGrid/ServiciosGrid/StaffGrid/FaqList) hacen `if (!x?.length) return null`.
  galeria: [],
  servicios: [],
  staff: [],
  faq: [],
  politicaReservas: '',
  seccionesVisibles: { reservas: true, historia: true, galeria: true, servicios: true, staff: true, faq: true },
  navbarEstilo: 'fijo-oscuro',
  templateId: 1,
  colorPrimario: '#afca0b',
  colorSecundario: '#10b981',
  fontFamilia: 'Inter',
  modoOscuroJugadores: true,
  horarioPicoActivo: true,
  permitirCruceMedianoche: false, // Si true, habilita reservas/clases que cruzan las 00:00
  // Política de cobro al reservar. Fase 0 solo usa 'libre'; 'sena'/'total' llegan con Mercado Pago.
  modoCobro: 'libre', // 'libre' (paga en mostrador) | 'sena' | 'total'
  canchas: [
    { id: 1, nombre: 'Cancha 1', tipo: 'Cristal', indoor: true,  activa: true, precioTurno: 12000, recargoPico: 20 },
    { id: 2, nombre: 'Cancha 2', tipo: 'Cristal', indoor: true,  activa: true, precioTurno: 12000, recargoPico: 20 },
    { id: 3, nombre: 'Cancha 3', tipo: 'Pared',   indoor: false, activa: true, precioTurno: 9000,  recargoPico: 15 },
    { id: 4, nombre: 'Cancha 4', tipo: 'Pared',   indoor: false, activa: true, precioTurno: 9000,  recargoPico: 15 },
  ],
  horarios: HORARIOS_DEFAULT,
}

const makeCancha = (index) => ({
  id: Date.now() + index,
  nombre: `Cancha ${index + 1}`,
  tipo: 'Cristal',
  indoor: true,
  activa: true,
  precioTurno: 12000,
  recargoPico: 20,
})

// Aplica los colores y fuente del club como CSS custom properties al root
const applyColorsToDOM = (colorPrimario, colorSecundario, fontFamilia = 'Inter') => {
  document.documentElement.style.setProperty('--club-primary', colorPrimario)
  document.documentElement.style.setProperty('--club-secondary', colorSecundario)
  document.documentElement.style.setProperty('--club-font', fontFamilia)
}

const useClubStore = create((set, get) => ({
  club: INITIAL_CLUB,
  _dirty: false,   // true cuando hay cambios locales sin guardar en el backend
  _loaded: false,  // true una vez que llegaron datos reales del backend

  updateClub: (data) => {
    set((state) => ({ club: { ...state.club, ...data }, _dirty: true }))
  },

  updateCancha: (id, dataOrFn) => {
    set((state) => ({
      club: {
        ...state.club,
        canchas: state.club.canchas.map((c) => {
          if (c.id !== id) return c
          const data = typeof dataOrFn === 'function' ? dataOrFn(c) : dataOrFn
          return { ...c, ...data }
        }),
      },
      _dirty: true,
    }))
  },

  updateHorario: (dia, data) => {
    set((state) => ({
      club: {
        ...state.club,
        horarios: {
          ...state.club.horarios,
          [dia]: { ...state.club.horarios[dia], ...data },
        },
      },
      _dirty: true,
    }))
  },

  setCantidadCanchas: (n) => {
    const cantidad = Math.max(1, Math.min(20, n))
    set((state) => {
      const current = state.club.canchas
      if (cantidad === current.length) return state
      if (cantidad > current.length) {
        const extra = Array.from({ length: cantidad - current.length }, (_, i) =>
          makeCancha(current.length + i)
        )
        return { club: { ...state.club, canchas: [...current, ...extra] } }
      }
      return { club: { ...state.club, canchas: current.slice(0, cantidad) } }
    })
  },

  // Carga club completo desde backend (config + canchas reales)
  loadFromBackend: (backendClub) => {
    if (!backendClub) return
    const config = backendClub.config ?? {}
    const canchasDB = backendClub.canchas ?? []
    set(() => {
      const merged = {
        ...INITIAL_CLUB,
        ...config,
        id: backendClub.id ?? null,
        slug: backendClub.slug ?? null,
        horarios: Object.fromEntries(
          DIAS_SEMANA.map((dia) => [
            dia,
            { ...HORARIOS_DEFAULT[dia], ...(config.horarios?.[dia] ?? {}) },
          ])
        ),
        ...(canchasDB.length > 0 && {
          canchas: canchasDB.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            tipo: c.tipo ?? 'Cristal',
            indoor: c.indoor ?? true,
            activa: c.activo,
            precioTurno: c.precioTurno ?? 0,
            horarios: normalizeHorarios(c.horarios),
          })),
        }),
      }
      applyColorsToDOM(merged.colorPrimario, merged.colorSecundario, merged.fontFamilia)
      return { club: merged, _dirty: false, _loaded: true }
    })
  },

  // Guarda en el backend y actualiza DOM — sin localStorage
  saveClub: async (token) => {
    const { club } = get()
    applyColorsToDOM(club.colorPrimario, club.colorSecundario, club.fontFamilia)
    if (!token) return
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    try {
      // Guarda config JSON + sincroniza canchas en paralelo
      const [, canchasRes] = await Promise.all([
        fetch(`${BASE}/clubs/me`, { method: 'PATCH', headers, body: JSON.stringify({ config: club }) }),
        fetch(`${BASE}/clubs/me/canchas`, { method: 'PATCH', headers, body: JSON.stringify({ canchas: club.canchas }) }),
      ])
      // Actualiza solo las canchas con sus IDs reales (evita reload completo que reinicia el formulario)
      if (canchasRes.ok) {
        const { canchas: canchasDB } = await canchasRes.json()
        if (Array.isArray(canchasDB)) {
          set((state) => ({
            club: {
              ...state.club,
              canchas: canchasDB.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                tipo: c.tipo ?? 'Cristal',
                indoor: c.indoor ?? true,
                activa: c.activo,
                precioTurno: c.precioTurno ?? 0,
                horarios: normalizeHorarios(c.horarios),
              })),
            },
            _dirty: false,
          }))
        }
      }
    } catch {
      // fallo silencioso — _dirty sigue true si el save falló
    }
  },
}))

export default useClubStore
