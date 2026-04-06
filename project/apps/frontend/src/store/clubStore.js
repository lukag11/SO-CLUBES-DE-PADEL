import { create } from 'zustand'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

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
  nombre: 'Club de Pádel Demo',
  descripcion: 'Club de pádel con instalaciones de primer nivel, canchas de cristal y muro, vestuarios y estacionamiento.',
  direccion: 'Av. Libertador 1234, Buenos Aires',
  telefono: '+54 11 4567-8900',
  email: 'info@clubpadeldemo.com',
  instagram: '@clubpadeldemo',
  facebook: 'clubpadeldemo',
  whatsapp: '+54 9 11 4567-8900',
  logo: null,
  tituloBio: 'Quiénes Somos',
  historia: 'Fundado en 2015, el Club de Pádel Demo nació con la misión de acercar el pádel a toda la comunidad. Comenzamos con una sola cancha y hoy contamos con cuatro canchas de primer nivel: dos de cristal indoor y dos de pared outdoor, con vestuarios modernos y estacionamiento propio.\n\nA lo largo de estos años hemos formado a cientos de jugadores, organizado más de 50 torneos y construido una comunidad apasionada que crece cada temporada. Nuestro compromiso es brindar las mejores instalaciones y la mejor experiencia dentro y fuera de la cancha.',
  anoFundacion: '2015',
  fotoPrincipal: null,
  heroTitulo: 'Tu cancha te espera,',
  heroTituloDestacado: 'reservá ahora',
  heroSubtitulo: 'Reservas online, torneos y estadísticas. Todo desde tu celular, en cualquier momento.',
  heroBadge: 'Club de Pádel Demo · Buenos Aires',
  heroCtaPrimarioTexto: 'Reservar cancha',
  heroCtaSecundarioTexto: 'Ver torneos',
  heroImagen: 'https://res.cloudinary.com/djyhwdmek/image/upload/v1775334793/padel/heropadel_ekeoax.jpg',
  galeria: [
    { id: 1, url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', caption: 'Canchas indoor de cristal' },
    { id: 2, url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80', caption: 'Cancha central' },
    { id: 3, url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80', caption: 'Vestuarios renovados' },
    { id: 4, url: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=800&q=80', caption: 'Zona de descanso' },
  ],
  servicios: [
    { id: 1, icono: 'ShowerHead', titulo: 'Vestuarios',        descripcion: 'Vestuarios completos con duchas y lockers individuales.',                activo: true  },
    { id: 2, icono: 'Car',        titulo: 'Estacionamiento',   descripcion: 'Estacionamiento gratuito con capacidad para 30 vehículos.',              activo: true  },
    { id: 3, icono: 'GraduationCap', titulo: 'Clases',         descripcion: 'Clases para todos los niveles con profesores certificados.',             activo: true  },
    { id: 4, icono: 'Wifi',       titulo: 'WiFi gratuito',     descripcion: 'Conexión WiFi de alta velocidad en todas las instalaciones.',            activo: true  },
    { id: 5, icono: 'Coffee',     titulo: 'Cafetería',         descripcion: 'Cafetería con snacks, bebidas y menú del día.',                          activo: false },
  ],
  staff: [
    { id: 1, nombre: 'Carlos Méndez',  rol: 'Director del Club',      foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80', descripcion: 'Fundador y director del club con más de 20 años en el pádel.' },
    { id: 2, nombre: 'Marcelo Ríos',   rol: 'Profesor Principal',     foto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=80', descripcion: 'Profesor certificado nivel 3, especialista en formación de jugadores.' },
    { id: 3, nombre: 'Laura García',   rol: 'Recepción y Reservas',   foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80', descripcion: 'Responsable de atención al socio y gestión de reservas.' },
  ],
  faq: [
    { id: 1, pregunta: '¿Cómo reservo una cancha?',                    respuesta: 'Podés reservar desde la app ingresando con tu usuario. Seleccioná la cancha, el día y el horario disponible.' },
    { id: 2, pregunta: '¿Puedo cancelar una reserva?',                 respuesta: 'Sí, podés cancelar hasta 2 horas antes sin cargo. Pasado ese tiempo se cobra el 50% del turno.' },
    { id: 3, pregunta: '¿Necesito ser socio para jugar?',              respuesta: 'No es necesario ser socio para reservar canchas. Los socios tienen prioridad y descuentos especiales.' },
    { id: 4, pregunta: '¿Cómo me inscribo a un torneo?',               respuesta: 'Desde la sección Torneos de la app podés ver todos los torneos e inscribirte con tu pareja.' },
    { id: 5, pregunta: '¿El club tiene paletas para alquilar?',        respuesta: 'Sí, tenemos paletas y pelotas disponibles para alquiler en recepción.' },
  ],
  politicaReservas: 'Las reservas se realizan con un mínimo de 1 hora de anticipación. La cancelación gratuita aplica hasta 2 horas antes del turno; pasado ese tiempo se cobra el 50% del valor. El pago puede realizarse en efectivo, tarjeta o transferencia bancaria. En caso de lluvia intensa, se ofrecerá un turno alternativo sin cargo adicional.',
  seccionesVisibles: { reservas: true, historia: true, galeria: true, servicios: true, staff: true, faq: true },
  navbarEstilo: 'fijo-oscuro',
  templateId: 1,
  colorPrimario: '#afca0b',
  colorSecundario: '#10b981',
  fontFamilia: 'Inter',
  modoOscuroJugadores: true,
  horarioPicoActivo: true,
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

// Cargar config guardada en localStorage si existe
const loadPersistedClub = () => {
  try {
    const saved = localStorage.getItem('club_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      const merged = { ...INITIAL_CLUB, ...parsed }
      applyColorsToDOM(merged.colorPrimario, merged.colorSecundario, merged.fontFamilia)
      return merged
    }
  } catch {
    // ignorar error de parseo
  }
  return INITIAL_CLUB
}

const useClubStore = create((set, get) => ({
  club: loadPersistedClub(),

  updateClub: (data) => {
    set((state) => ({ club: { ...state.club, ...data } }))
  },

  updateCancha: (id, data) => {
    set((state) => ({
      club: {
        ...state.club,
        canchas: state.club.canchas.map((c) => (c.id === id ? { ...c, ...data } : c)),
      },
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

  // Guarda en localStorage y aplica colores + fuente al DOM
  saveClub: () => {
    const { club } = get()
    localStorage.setItem('club_config', JSON.stringify(club))
    applyColorsToDOM(club.colorPrimario, club.colorSecundario, club.fontFamilia)
  },
}))

export default useClubStore
