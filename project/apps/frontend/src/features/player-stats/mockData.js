// Mock data centralizado — se reemplaza con API calls cuando exista el backend

export const monthlyStats = [
  { mes: 'Sep', jugados: 6, ganados: 3, perdidos: 3 },
  { mes: 'Oct', jugados: 8, ganados: 5, perdidos: 3 },
  { mes: 'Nov', jugados: 5, ganados: 2, perdidos: 3 },
  { mes: 'Dic', jugados: 9, ganados: 7, perdidos: 2 },
  { mes: 'Ene', jugados: 7, ganados: 5, perdidos: 2 },
  { mes: 'Feb', jugados: 6, ganados: 4, perdidos: 2 },
  { mes: 'Mar', jugados: 7, ganados: 8, perdidos: 1 },
]

export const performanceByCategory = [
  { categoria: '4ta', ganados: 8, perdidos: 2 },
  { categoria: '3ra', ganados: 14, perdidos: 8 },
  { categoria: '2da', ganados: 12, perdidos: 6 },
]

export const recentTrend = ['W','W','L','W','W','W','L','W','W','W']

export const tournaments = [
  {
    id: 1,
    nombre: 'Copa Verano 2026',
    club: 'Club Palermo Padel',
    fecha: '15 mar 2026',
    categoria: '3ra Categoría',
    formato: 'Dobles',
    pareja: 'M. García',
    fase: 'Final',
    resultado: 'Finalista',
    partidos: [
      { rival: 'López / Ruiz', score: '6-3 6-2', resultado: 'W' },
      { rival: 'Gómez / Pérez', score: '7-5 6-4', resultado: 'W' },
      { rival: 'Torres / Silva', score: '4-6 6-3 7-5', resultado: 'W' },
      { rival: 'Martín / Díaz', score: '3-6 4-6', resultado: 'L' },
    ],
  },
  {
    id: 2,
    nombre: 'Liga Interna Feb',
    club: 'Club Belgrano',
    fecha: '20 feb 2026',
    categoria: '3ra Categoría',
    formato: 'Dobles',
    pareja: 'M. García',
    fase: 'Semifinal',
    resultado: 'Semifinalista',
    partidos: [
      { rival: 'Vera / Sosa', score: '6-1 6-0', resultado: 'W' },
      { rival: 'Ramos / Cruz', score: '6-4 5-7 6-3', resultado: 'W' },
      { rival: 'Núñez / Ibáñez', score: '3-6 2-6', resultado: 'L' },
    ],
  },
  {
    id: 3,
    nombre: 'Abierto Club Ene',
    club: 'Club Palermo Padel',
    fecha: '10 ene 2026',
    categoria: '3ra Categoría',
    formato: 'Dobles',
    pareja: 'R. Herrera',
    fase: 'Cuartos',
    resultado: 'Cuartos de final',
    partidos: [
      { rival: 'Flores / Ortega', score: '6-2 6-3', resultado: 'W' },
      { rival: 'Vargas / Castro', score: '4-6 3-6', resultado: 'L' },
    ],
  },
  {
    id: 4,
    nombre: 'Copa Otoño 2025',
    club: 'Club Recoleta',
    fecha: '5 nov 2025',
    categoria: '4ta Categoría',
    formato: 'Dobles',
    pareja: 'M. García',
    fase: 'Final',
    resultado: 'Campeón',
    partidos: [
      { rival: 'Medina / Rojas', score: '6-4 6-2', resultado: 'W' },
      { rival: 'Suárez / Molina', score: '7-6 6-3', resultado: 'W' },
      { rival: 'Ríos / Paredes', score: '6-3 6-4', resultado: 'W' },
    ],
  },
]

export const opponents = [
  { id: 1, nombre: 'Torres / Silva',    partidos: 8, ganados: 3, perdidos: 5, ultimo: '15 mar 2026', tag: 'rival' },
  { id: 2, nombre: 'Gómez / Pérez',     partidos: 7, ganados: 5, perdidos: 2, ultimo: '22 mar 2026', tag: 'favorable' },
  { id: 3, nombre: 'Martín / Díaz',     partidos: 5, ganados: 2, perdidos: 3, ultimo: '18 mar 2026', tag: 'parejo' },
  { id: 4, nombre: 'López / Ruiz',      partidos: 6, ganados: 5, perdidos: 1, ultimo: '10 mar 2026', tag: 'favorable' },
  { id: 5, nombre: 'Vera / Sosa',       partidos: 4, ganados: 4, perdidos: 0, ultimo: '20 feb 2026', tag: 'favorable' },
  { id: 6, nombre: 'Núñez / Ibáñez',   partidos: 4, ganados: 1, perdidos: 3, ultimo: '20 feb 2026', tag: 'rival' },
  { id: 7, nombre: 'Ramos / Cruz',      partidos: 3, ganados: 2, perdidos: 1, ultimo: '18 feb 2026', tag: 'parejo' },
  { id: 8, nombre: 'Flores / Ortega',   partidos: 3, ganados: 3, perdidos: 0, ultimo: '10 ene 2026', tag: 'favorable' },
]
