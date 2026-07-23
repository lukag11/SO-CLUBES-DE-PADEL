import { create } from 'zustand'
import { getClubSlug } from '../lib/clubContext'

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
  // Métodos de cobro que acepta el club (del catálogo en lib/metodosPago). Cada club tilda los suyos.
  metodosPago: ['efectivo', 'transferencia'],
  // Nota: la modalidad de inscripción ('abierta' | 'guardar_cupo') vive por torneo (Torneo.modoInscripcion), no en el club.
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

// Caché del último club cargado (stale-while-revalidate): al recargar arrancamos con
// estos datos para evitar el flash de defaults + spinner. Solo por slug (público).
const CLUB_CACHE_KEY = `padelos_club_cache_${getClubSlug() || 'default'}`
const readClubCache = () => {
  try {
    if (!getClubSlug()) return null
    const raw = localStorage.getItem(CLUB_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
const _clubCache = readClubCache()
// Aplicamos los colores cacheados YA, para que el primer paint tenga el acento del club.
if (_clubCache) applyColorsToDOM(_clubCache.colorPrimario, _clubCache.colorSecundario, _clubCache.fontFamilia)

const useClubStore = create((set, get) => ({
  club: _clubCache || INITIAL_CLUB,  // hidratamos branding desde caché (navbar/landing sin flash)
  _dirty: false,   // true cuando hay cambios locales sin guardar en el backend
  _loaded: false,  // se mantiene false hasta el fetch real (no cambia la lógica de admin/torneos)
  _canchasReales: null, // conteo REAL de canchas en la DB (el store rellena 4 demo si hay 0; esto
                        // guarda la verdad del backend para detectar un club recién creado → onboarding)

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

  // Aplica en un solo paso lo que junta el asistente de bienvenida: arma N canchas frescas
  // (nombre/tipo/indoor/precio parejos), setea el mismo horario para todos los días, guarda el
  // logo (opcional) y marca el onboarding como completado. Deja _dirty para que saveClub persista.
  aplicarOnboarding: ({ cantidad, tipo, indoor, precio, apertura, cierre, logo }) => {
    set((state) => {
      const n = Math.max(1, Math.min(20, Number(cantidad) || 1))
      const canchas = Array.from({ length: n }, (_, i) => ({
        id: Date.now() + i,
        nombre: `Cancha ${i + 1}`,
        tipo: tipo || 'Cristal',
        indoor: indoor ?? true,
        activa: true,
        precioTurno: Number(precio) || 0,
        recargoPico: 0,
        horarios: null,
      }))
      const horarios = Object.fromEntries(
        DIAS_SEMANA.map((dia) => [dia, { apertura, cierre, activo: true }])
      )
      return {
        club: { ...state.club, canchas, horarios, ...(logo ? { logo } : {}), onboardingCompletado: true },
        _dirty: true,
      }
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
        // El nombre del club puede vivir en config o en la columna Club.nombre → fallback a la columna
        // (así un club sin config.nombre igual muestra su nombre en la landing, banner, etc.).
        nombre: config.nombre || backendClub.nombre || INITIAL_CLUB.nombre,
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
      // Refresca la caché para el próximo reload (stale-while-revalidate).
      try { localStorage.setItem(CLUB_CACHE_KEY, JSON.stringify(merged)) } catch { /* storage lleno/bloqueado: no es crítico */ }
      return { club: merged, _dirty: false, _loaded: true, _canchasReales: canchasDB.length }
    })
  },

  // Guarda SOLO la config en el backend (sin tocar canchas). Para ajustes puntuales
  // como métodos de cobro, donde re-PATCHear canchas sería un efecto acoplado.
  // Devuelve true si persistió OK, false si falló (fetch no rechaza en 4xx/5xx: hay que mirar res.ok).
  saveConfig: async (token) => {
    const { club } = get()
    if (!token) return false
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    try {
      const res = await fetch(`${BASE}/clubs/me`, { method: 'PATCH', headers, body: JSON.stringify({ config: club }) })
      if (!res.ok) return false
      set({ _dirty: false })
      return true
    } catch {
      return false
    }
  },

  // Guarda en el backend y actualiza DOM — sin localStorage.
  // Devuelve true si persistió OK, false si falló (para poder avisar con un toast honesto).
  saveClub: async (token) => {
    const { club } = get()
    applyColorsToDOM(club.colorPrimario, club.colorSecundario, club.fontFamilia)
    if (!token) return false
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    try {
      // Guarda config JSON + sincroniza canchas en paralelo
      const [configRes, canchasRes] = await Promise.all([
        fetch(`${BASE}/clubs/me`, { method: 'PATCH', headers, body: JSON.stringify({ config: club }) }),
        fetch(`${BASE}/clubs/me/canchas`, { method: 'PATCH', headers, body: JSON.stringify({ canchas: club.canchas }) }),
      ])
      if (!configRes.ok || !canchasRes.ok) return false
      // Actualiza solo las canchas con sus IDs reales (evita reload completo que reinicia el formulario)
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
          _canchasReales: canchasDB.length, // verdad del backend actualizada (cierra el onboarding)
        }))
      } else {
        set({ _dirty: false })
      }
      return true
    } catch {
      // fallo silencioso — _dirty sigue true si el save falló
      return false
    }
  },
}))

export default useClubStore
