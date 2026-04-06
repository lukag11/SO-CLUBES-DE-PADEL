// Franjas horarias estándar de 1.5 hs
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
