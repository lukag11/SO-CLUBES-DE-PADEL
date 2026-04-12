// Franjas horarias del profesor: 1h cada una (incluye post-medianoche)
export const FRANJAS_PROFESOR = [
  { inicio: '07:00', fin: '08:00' },
  { inicio: '08:00', fin: '09:00' },
  { inicio: '09:00', fin: '10:00' },
  { inicio: '10:00', fin: '11:00' },
  { inicio: '11:00', fin: '12:00' },
  { inicio: '12:00', fin: '13:00' },
  { inicio: '13:00', fin: '14:00' },
  { inicio: '14:00', fin: '15:00' },
  { inicio: '15:00', fin: '16:00' },
  { inicio: '16:00', fin: '17:00' },
  { inicio: '17:00', fin: '18:00' },
  { inicio: '18:00', fin: '19:00' },
  { inicio: '19:00', fin: '20:00' },
  { inicio: '20:00', fin: '21:00' },
  { inicio: '21:00', fin: '22:00' },
  { inicio: '22:00', fin: '23:00' },
  { inicio: '23:00', fin: '00:00' }, // cross-midnight
  { inicio: '00:00', fin: '01:00' },
  { inicio: '01:00', fin: '02:00' },
  { inicio: '02:00', fin: '03:00' },
  { inicio: '03:00', fin: '04:00' },
]

// Franjas horarias estándar de 1.5 hs (incluye post-medianoche)
export const FRANJAS = [
  { inicio: '07:00', fin: '08:30' },
  { inicio: '08:30', fin: '10:00' },
  { inicio: '10:00', fin: '11:30' },
  { inicio: '11:30', fin: '13:00' },
  { inicio: '13:00', fin: '14:30' },
  { inicio: '14:30', fin: '16:00' },
  { inicio: '16:00', fin: '17:30' },
  { inicio: '17:30', fin: '19:00' },
  { inicio: '19:00', fin: '20:30' },
  { inicio: '20:30', fin: '22:00' },
  { inicio: '22:00', fin: '23:30' },
  { inicio: '23:30', fin: '01:00' }, // cross-midnight
  { inicio: '01:00', fin: '02:30' },
  { inicio: '02:30', fin: '04:00' },
]

export const CANCHAS_MOCK = [
  { id: 1, nombre: 'Cancha 1', tipo: 'Cristal', indoor: true  },
  { id: 2, nombre: 'Cancha 2', tipo: 'Cristal', indoor: true  },
  { id: 3, nombre: 'Cancha 3', tipo: 'Pared',   indoor: false },
  { id: 4, nombre: 'Cancha 4', tipo: 'Pared',   indoor: false },
]

// Sin mock — grilla admin arranca vacía para pruebas reales
export const RESERVAS_INICIALES = []

export const RAZONES_BLOQUEO = ['Mantenimiento', 'Torneo', 'Evento privado', 'Otro']

export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Débito', 'Crédito']

// Días de la semana normalizados (sin tilde, minúsculas) para comparación con getDiaSemana
// Valor guardado en 'dia': 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export const DIAS_SEMANA_OPCIONES = [
  { value: 'lunes',     label: 'Lunes'     },
  { value: 'martes',    label: 'Martes'    },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves',    label: 'Jueves'    },
  { value: 'viernes',   label: 'Viernes'   },
  { value: 'sabado',    label: 'Sábado'    },
  { value: 'domingo',   label: 'Domingo'   },
]

// Sin mock — clases del profesor arrancan vacías para pruebas reales
export const CLASES_PROFESOR = []
