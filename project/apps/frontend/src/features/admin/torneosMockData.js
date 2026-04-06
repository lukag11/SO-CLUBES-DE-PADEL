// ── Constantes ────────────────────────────────────────────────────────────────

export const CATEGORIAS = ['1° Categoría', '2° Categoría', '3° Categoría', '4° Categoría', '5° Categoría', 'Mixto']
export const FORMATOS   = ['Round Robin', 'Eliminación directa', 'Fase de grupos + Eliminación']

// ── Mock inscritos ─────────────────────────────────────────────────────────────

const inscriptosT1 = [
  { id: 1, nombre: 'Carlos Gómez',   dni: '30.112.455', categoria: '3° Categoría', fecha: '2026-03-01' },
  { id: 2, nombre: 'Martín Pérez',   dni: '28.554.321', categoria: '3° Categoría', fecha: '2026-03-01' },
  { id: 3, nombre: 'Lucas Torres',   dni: '32.001.789', categoria: '3° Categoría', fecha: '2026-03-03' },
  { id: 4, nombre: 'Diego Silva',    dni: '29.874.002', categoria: '3° Categoría', fecha: '2026-03-05' },
  { id: 5, nombre: 'Andrés Ruiz',    dni: '31.220.654', categoria: '3° Categoría', fecha: '2026-03-06' },
  { id: 6, nombre: 'Pablo Díaz',     dni: '27.993.110', categoria: '3° Categoría', fecha: '2026-03-08' },
]

const inscriptosT2 = [
  { id: 1, nombre: 'Sofía Martín',   dni: '33.445.001', categoria: '2° Categoría', fecha: '2026-03-10' },
  { id: 2, nombre: 'Laura López',    dni: '30.887.432', categoria: '2° Categoría', fecha: '2026-03-11' },
  { id: 3, nombre: 'Valentina Sosa', dni: '34.112.908', categoria: '2° Categoría', fecha: '2026-03-12' },
]

const inscriptosT3 = [
  { id: 1, nombre: 'Rodrigo Vera',   dni: '29.001.543', categoria: '1° Categoría', fecha: '2026-02-15' },
  { id: 2, nombre: 'Facundo Moreno', dni: '28.334.219', categoria: '1° Categoría', fecha: '2026-02-15' },
  { id: 3, nombre: 'Nicolás Ríos',   dni: '31.776.882', categoria: '1° Categoría', fecha: '2026-02-16' },
  { id: 4, nombre: 'Tomás Aguirre',  dni: '30.558.741', categoria: '1° Categoría', fecha: '2026-02-18' },
  { id: 5, nombre: 'Esteban Castro', dni: '27.221.337', categoria: '1° Categoría', fecha: '2026-02-20' },
  { id: 6, nombre: 'Sergio Blanco',  dni: '32.990.055', categoria: '1° Categoría', fecha: '2026-02-22' },
  { id: 7, nombre: 'Julián Ortega',  dni: '29.667.134', categoria: '1° Categoría', fecha: '2026-02-24' },
  { id: 8, nombre: 'Ramón Figueroa', dni: '28.112.675', categoria: '1° Categoría', fecha: '2026-02-25' },
]

// ── Torneos ───────────────────────────────────────────────────────────────────
// estado: 'activo' | 'proximo' | 'finalizado'
// categorias: array de categorías habilitadas
// cupoLibre: true = sin límite | false = usa cuposPorCategoria
// cuposPorCategoria: { 'Cat': number } — solo relevante si cupoLibre = false

export const TORNEOS_INICIALES = [
  {
    id: 1,
    nombre: 'Copa Verano 2026',
    categorias: ['3° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '3° Categoría': 8 },
    formato: 'Round Robin',
    estado: 'activo',
    fechaInicio: '2026-03-01',
    fechaFin: '2026-04-30',
    descripcion: 'Torneo de verano para la categoría 3. Partidos los fines de semana.',
    inscripcionAbierta: true,
    inscriptos: inscriptosT1,
    ganador: null,
    subcampeon: null,
  },
  {
    id: 2,
    nombre: 'Torneo Femenino Abril',
    categorias: ['2° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '2° Categoría': 8 },
    formato: 'Eliminación directa',
    estado: 'activo',
    fechaInicio: '2026-04-05',
    fechaFin: '2026-04-27',
    descripcion: 'Torneo exclusivo para jugadoras. Inscripción abierta hasta el 3 de abril.',
    inscripcionAbierta: true,
    inscriptos: inscriptosT2,
    ganador: null,
    subcampeon: null,
  },
  {
    id: 3,
    nombre: 'Liga Interna Mayo',
    categorias: ['4° Categoría', '5° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '4° Categoría': 12, '5° Categoría': 10 },
    formato: 'Fase de grupos + Eliminación',
    estado: 'proximo',
    fechaInicio: '2026-05-03',
    fechaFin: '2026-05-31',
    descripcion: 'Liga mensual interna para principiantes. Ideal para quienes están empezando.',
    inscripcionAbierta: false,
    inscriptos: [],
    ganador: null,
    subcampeon: null,
  },
  {
    id: 4,
    nombre: 'Abierto del Club Junio',
    categorias: ['1° Categoría'],
    cupoLibre: true,
    cuposPorCategoria: {},
    formato: 'Eliminación directa',
    estado: 'proximo',
    fechaInicio: '2026-06-07',
    fechaFin: '2026-06-28',
    descripcion: 'El torneo más importante del semestre. Cupo libre — se anota quien quiera.',
    inscripcionAbierta: false,
    inscriptos: [],
    ganador: null,
    subcampeon: null,
  },
  {
    id: 5,
    nombre: 'Copa Fin de Año 2025',
    categorias: ['1° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '1° Categoría': 8 },
    formato: 'Round Robin',
    estado: 'finalizado',
    fechaInicio: '2025-11-01',
    fechaFin: '2025-12-20',
    descripcion: 'Torneo anual de cierre de temporada.',
    inscripcionAbierta: false,
    inscriptos: inscriptosT3,
    ganador: 'Rodrigo Vera / Facundo Moreno',
    subcampeon: 'Nicolás Ríos / Tomás Aguirre',
  },
  {
    id: 6,
    nombre: 'Liga Interna Verano 2025',
    categorias: ['3° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '3° Categoría': 12 },
    formato: 'Fase de grupos + Eliminación',
    estado: 'finalizado',
    fechaInicio: '2025-01-10',
    fechaFin: '2025-02-28',
    descripcion: '',
    inscripcionAbierta: false,
    inscriptos: [],
    ganador: 'Carlos Gómez / Martín Pérez',
    subcampeon: 'Lucas Torres / Diego Silva',
  },
]
