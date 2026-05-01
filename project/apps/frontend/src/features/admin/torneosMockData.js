// ── Constantes ────────────────────────────────────────────────────────────────

export const CATEGORIAS = [
  '1° Categoría', '2° Categoría', '3° Categoría', '4° Categoría',
  '5° Categoría', '6° Categoría', '7° Categoría', '8° Categoría',
]
export const GENEROS  = ['Masculino', 'Femenino', 'Mixto']
export const FORMATOS = ['Round Robin', 'Eliminación directa', 'Fase de grupos + Eliminación']

// ── Mock inscriptos (torneos existentes) ──────────────────────────────────────

const inscriptosT2 = [
  { id: 1, jugador1: 'Sofía Martín',   jugador2: 'Laura López',      categoria: '2° Categoría', fecha: '2026-03-10' },
  { id: 2, jugador1: 'Valentina Sosa', jugador2: 'Camila Rodríguez', categoria: '2° Categoría', fecha: '2026-03-12' },
]

const inscriptosT5 = [
  { id: 1, jugador1: 'Rodrigo Vera',   jugador2: 'Facundo Moreno', categoria: '1° Categoría', fecha: '2026-02-15' },
  { id: 2, jugador1: 'Nicolás Ríos',   jugador2: 'Tomás Aguirre',  categoria: '1° Categoría', fecha: '2026-02-16' },
  { id: 3, jugador1: 'Esteban Castro', jugador2: 'Sergio Blanco',  categoria: '1° Categoría', fecha: '2026-02-20' },
  { id: 4, jugador1: 'Julián Ortega',  jugador2: 'Ramón Figueroa', categoria: '1° Categoría', fecha: '2026-02-24' },
]

// ── T99 — Demo 4ta Categoría (24 parejas, Fase de grupos + Eliminación) ───────

const _mk4 = (id, j1, j2, disp, prefMD = false) => ({
  id, jugador1: j1, jugador2: j2,
  categoria: '4° Categoría', fecha: '2026-04-01',
  disponibilidad: disp,
  prefiereMismoDia: prefMD,
})

const LNMN = [{ dia: 'Lunes', horaDesde: '18:00' }, { dia: 'Miércoles', horaDesde: '18:00' }]
const JNVN = [{ dia: 'Jueves', horaDesde: '18:00' }, { dia: 'Viernes', horaDesde: '18:00' }]
const MN   = [{ dia: 'Miércoles', horaDesde: '18:00' }]
const VN   = [{ dia: 'Viernes',   horaDesde: '18:00' }]
const SM   = [{ dia: 'Sábado',    horaDesde: '08:00' }]
const ST   = [{ dia: 'Sábado',    horaDesde: '12:00' }]
const DM   = [{ dia: 'Domingo',   horaDesde: '08:00' }]

// Zona A
const t99p1  = _mk4(1,  'Martín Gómez',        'Diego Torres',        LNMN, true)
const t99p2  = _mk4(2,  'Lucas Pérez',          'Rodrigo Sánchez',     LNMN)
const t99p3  = _mk4(3,  'Facundo García',       'Emanuel López',       MN)
// Zona B
const t99p4  = _mk4(4,  'Carlos Fernández',     'Matías Ruiz',         JNVN, true)
const t99p5  = _mk4(5,  'Sebastián Díaz',       'Nicolás Herrera',     JNVN)
const t99p6  = _mk4(6,  'Alejandro Ramírez',    'Pablo Suárez',        VN)
// Zona C
const t99p7  = _mk4(7,  'Damián Flores',        'Gustavo Medina',      SM)
const t99p8  = _mk4(8,  'Javier Castro',        'Francisco Muñoz',     SM)
const t99p9  = _mk4(9,  'Roberto Sosa',         'Ignacio Ortiz',       ST)
// Zona D
const t99p10 = _mk4(10, 'Andrés Vega',          'Pablo Molina',        DM, true)
const t99p11 = _mk4(11, 'Eduardo Vargas',       'Walter Moreno',       DM)
const t99p12 = _mk4(12, 'Ricardo Romero',       'Hernán Aguirre',      ST)
// Zona E
const t99p13 = _mk4(13, 'Gabriel Silva',        'Cristian Ramos',      LNMN)
const t99p14 = _mk4(14, 'Maximiliano Torres',   'Santiago Reyes',      LNMN, true)
const t99p15 = _mk4(15, 'Tomás Méndez',         'Leandro Blanco',      MN)
// Zona F
const t99p16 = _mk4(16, 'Marcelo Peralta',      'Fernando Ibáñez',     JNVN)
const t99p17 = _mk4(17, 'Guillermo Ríos',       'Ariel Guzmán',        JNVN, true)
const t99p18 = _mk4(18, 'Raúl Castro',          'José Morales',        VN)
// Zona G
const t99p19 = _mk4(19, 'Adrián Benítez',       'Osvaldo Quiroga',     SM)
const t99p20 = _mk4(20, 'Claudio Navarro',      'Sergio Palacios',     SM, true)
const t99p21 = _mk4(21, 'Horacio Funes',        'Ernesto Cabrera',     ST)
// Zona H
const t99p22 = _mk4(22, 'Ezequiel Leguizamón', 'Mateo Domínguez',     DM)
const t99p23 = _mk4(23, 'Bruno Ferreyra',       'Joaquín Salinas',     DM, true)
const t99p24 = _mk4(24, 'Augusto Páez',         'Ignacio Fuentes',     ST)

// Grupo RR finalizado
const _rrm = (id, pareja1, pareja2, ganador, extra = {}) => ({
  id, tipo: 'rr', pareja1, pareja2,
  ganador, estado: 'finalizado',
  cancha: null, slot: null, sinHorario: false, reservationId: null,
  resultado: null,
  ...extra,
})

const _sl = (dia, hora) => ({ dia, hora })

const grupos99 = [
  {
    nombre: 'Zona A', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p1, t99p2, t99p3],
    partidos: [
      _rrm('c0za_m0', t99p1, t99p2, t99p1, { resultado: [{p1:6,p2:3},{p1:6,p2:4}],          slot: _sl('Lunes','20:00'),      cancha: 1 }),
      _rrm('c0za_m1', t99p1, t99p3, t99p1, { resultado: [{p1:6,p2:2},{p1:6,p2:1}],          slot: _sl('Lunes','21:30'),      cancha: 2 }),
      _rrm('c0za_m2', t99p2, t99p3, t99p2, { resultado: [{p1:6,p2:4},{p1:4,p2:6},{p1:6,p2:3}], slot: _sl('Miércoles','20:00'), cancha: 1 }),
    ],
    clasificados: [t99p1, t99p2], necesitaDesempate: false,
  },
  {
    nombre: 'Zona B', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p4, t99p5, t99p6],
    partidos: [
      _rrm('c0zb_m0', t99p4, t99p5, t99p4, { resultado: [{p1:6,p2:4},{p1:7,p2:5}],          slot: _sl('Jueves','20:00'),     cancha: 1 }),
      _rrm('c0zb_m1', t99p4, t99p6, t99p4, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],          slot: _sl('Jueves','21:30'),     cancha: 2 }),
      _rrm('c0zb_m2', t99p5, t99p6, t99p5, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],          slot: _sl('Viernes','20:00'),    cancha: 1 }),
    ],
    clasificados: [t99p4, t99p5], necesitaDesempate: false,
  },
  {
    nombre: 'Zona C', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p7, t99p8, t99p9],
    partidos: [
      _rrm('c0zc_m0', t99p7, t99p8, t99p7, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],          slot: _sl('Sábado','10:00'),     cancha: 1 }),
      _rrm('c0zc_m1', t99p7, t99p9, t99p7, { resultado: [{p1:6,p2:1},{p1:6,p2:3}],          slot: _sl('Sábado','11:30'),     cancha: 2 }),
      _rrm('c0zc_m2', t99p8, t99p9, t99p8, { resultado: [{p1:6,p2:4},{p1:3,p2:6},{p1:6,p2:3}], slot: _sl('Sábado','13:00'), cancha: 1 }),
    ],
    clasificados: [t99p7, t99p8], necesitaDesempate: false,
  },
  {
    nombre: 'Zona D', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p10, t99p11, t99p12],
    partidos: [
      _rrm('c0zd_m0', t99p10, t99p11, t99p10, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],       slot: _sl('Domingo','10:00'),    cancha: 1 }),
      _rrm('c0zd_m1', t99p10, t99p12, t99p10, { resultado: [{p1:6,p2:3},{p1:6,p2:1}],       slot: _sl('Domingo','11:30'),    cancha: 2 }),
      _rrm('c0zd_m2', t99p11, t99p12, t99p11, { resultado: [{p1:7,p2:5},{p1:6,p2:4}],       slot: _sl('Domingo','13:00'),    cancha: 1 }),
    ],
    clasificados: [t99p10, t99p11], necesitaDesempate: false,
  },
  {
    nombre: 'Zona E', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p13, t99p14, t99p15],
    partidos: [
      _rrm('c0ze_m0', t99p13, t99p14, t99p13, { resultado: [{p1:6,p2:4},{p1:7,p2:5}],       slot: _sl('Lunes','20:00'),      cancha: 2 }),
      _rrm('c0ze_m1', t99p13, t99p15, t99p13, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],       slot: _sl('Lunes','21:30'),      cancha: 1 }),
      _rrm('c0ze_m2', t99p14, t99p15, t99p14, { resultado: [{p1:6,p2:1},{p1:3,p2:6},{p1:6,p2:4}], slot: _sl('Miércoles','20:00'), cancha: 2 }),
    ],
    clasificados: [t99p13, t99p14], necesitaDesempate: false,
  },
  {
    nombre: 'Zona F', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p16, t99p17, t99p18],
    partidos: [
      _rrm('c0zf_m0', t99p16, t99p17, t99p16, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],       slot: _sl('Jueves','20:00'),     cancha: 2 }),
      _rrm('c0zf_m1', t99p16, t99p18, t99p16, { resultado: [{p1:6,p2:3},{p1:6,p2:1}],       slot: _sl('Jueves','21:30'),     cancha: 1 }),
      _rrm('c0zf_m2', t99p17, t99p18, t99p17, { resultado: [{p1:7,p2:5},{p1:6,p2:3}],       slot: _sl('Viernes','20:00'),    cancha: 2 }),
    ],
    clasificados: [t99p16, t99p17], necesitaDesempate: false,
  },
  {
    nombre: 'Zona G', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p19, t99p20, t99p21],
    partidos: [
      _rrm('c0zg_m0', t99p19, t99p20, t99p19, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],       slot: _sl('Sábado','10:00'),     cancha: 2 }),
      _rrm('c0zg_m1', t99p19, t99p21, t99p19, { resultado: [{p1:6,p2:2},{p1:6,p2:1}],       slot: _sl('Sábado','11:30'),     cancha: 1 }),
      _rrm('c0zg_m2', t99p20, t99p21, t99p20, { resultado: [{p1:6,p2:4},{p1:6,p2:3}],       slot: _sl('Sábado','13:00'),     cancha: 2 }),
    ],
    clasificados: [t99p19, t99p20], necesitaDesempate: false,
  },
  {
    nombre: 'Zona H', categoria: '4° Categoría', capacidad: 3,
    parejas: [t99p22, t99p23, t99p24],
    partidos: [
      _rrm('c0zh_m0', t99p22, t99p23, t99p22, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],       slot: _sl('Domingo','10:00'),    cancha: 2 }),
      _rrm('c0zh_m1', t99p22, t99p24, t99p22, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],       slot: _sl('Domingo','11:30'),    cancha: 1 }),
      _rrm('c0zh_m2', t99p23, t99p24, t99p23, { resultado: [{p1:4,p2:6},{p1:6,p2:3},{p1:6,p2:4}], slot: _sl('Domingo','13:00'), cancha: 2 }),
    ],
    clasificados: [t99p22, t99p23], necesitaDesempate: false,
  },
]

// Bracket APA — 8 zonas → Octavos de final
// Draw: ['1A','2H','2F','2G','1E','2C','2B','1D','1C','2A','2D','1F','1G','2E','1H','1B']
// Octavos resueltos: r1_m0..r1_m3 (4 de 8 finalizados para demo)
const _bm = (id, p1, p2, nextMatchId, nextSlot, extra = {}) => ({
  id, pareja1: p1, pareja2: p2,
  ganador: null, estado: 'pendiente',
  fecha: null, hora: null, cancha: null, resultado: null,
  nextMatchId: nextMatchId ?? null, nextSlot: nextSlot ?? null,
  ...extra,
})

const bracket99 = {
  rondas: [
    {
      numero: 1, nombre: 'Octavos de final',
      partidos: [
        // 1A vs 2H
        _bm('r1_m0', t99p1, t99p23, 'r2_m0', 0, {
          ganador: t99p1, estado: 'finalizado',
          resultado: [{ p1: 6, p2: 3 }, { p1: 6, p2: 4 }],
          fecha: '2026-04-19', hora: '10:00', cancha: 1,
        }),
        // 2F vs 2G
        _bm('r1_m1', t99p17, t99p20, 'r2_m0', 1, {
          ganador: t99p17, estado: 'finalizado',
          resultado: [{ p1: 7, p2: 5 }, { p1: 3, p2: 6 }, { p1: 6, p2: 2 }],
          fecha: '2026-04-19', hora: '11:30', cancha: 2,
        }),
        // 1E vs 2C
        _bm('r1_m2', t99p13, t99p8, 'r2_m1', 0, {
          ganador: t99p13, estado: 'finalizado',
          resultado: [{ p1: 6, p2: 1 }, { p1: 6, p2: 2 }],
          fecha: '2026-04-19', hora: '13:00', cancha: 1,
        }),
        // 2B vs 1D
        _bm('r1_m3', t99p5, t99p10, 'r2_m1', 1, {
          ganador: t99p10, estado: 'finalizado',
          resultado: [{ p1: 4, p2: 6 }, { p1: 6, p2: 3 }, { p1: 5, p2: 7 }],
          fecha: '2026-04-19', hora: '14:30', cancha: 2,
        }),
        // 1C vs 2A
        _bm('r1_m4', t99p7,  t99p2,  'r2_m2', 0, {
          ganador: t99p7, estado: 'finalizado',
          resultado: [{ p1: 6, p2: 4 }, { p1: 6, p2: 2 }],
          fecha: '2026-04-19', hora: '16:00', cancha: 1,
        }),
        // 2D vs 1F
        _bm('r1_m5', t99p11, t99p16, 'r2_m2', 1, {
          ganador: t99p16, estado: 'finalizado',
          resultado: [{ p1: 4, p2: 6 }, { p1: 6, p2: 3 }, { p1: 5, p2: 7 }],
          fecha: '2026-04-19', hora: '17:30', cancha: 2,
        }),
        // 1G vs 2E
        _bm('r1_m6', t99p19, t99p14, 'r2_m3', 0, {
          ganador: t99p19, estado: 'finalizado',
          resultado: [{ p1: 6, p2: 2 }, { p1: 6, p2: 3 }],
          fecha: '2026-04-19', hora: '19:00', cancha: 1,
        }),
        // 1H vs 1B
        _bm('r1_m7', t99p22, t99p4,  'r2_m3', 1, {
          ganador: t99p4, estado: 'finalizado',
          resultado: [{ p1: 5, p2: 7 }, { p1: 6, p2: 4 }, { p1: 4, p2: 6 }],
          fecha: '2026-04-19', hora: '20:30', cancha: 2,
        }),
      ],
    },
    {
      numero: 2, nombre: 'Cuartos de final',
      partidos: [
        // Ganadores r1_m0 y r1_m1 ya conocidos
        _bm('r2_m0', t99p1,  t99p17, 'r3_m0', 0),
        _bm('r2_m1', t99p13, t99p10, 'r3_m0', 1),
        _bm('r2_m2', t99p7,  t99p16, 'r3_m1', 0),
        _bm('r2_m3', t99p19, t99p4,  'r3_m1', 1),
      ],
    },
    {
      numero: 3, nombre: 'Semifinal',
      partidos: [
        _bm('r3_m0', null, null, 'r4_m0', 0),
        _bm('r3_m1', null, null, 'r4_m0', 1),
      ],
    },
    {
      numero: 4, nombre: 'Final',
      partidos: [
        _bm('r4_m0', null, null, null, null),
      ],
    },
  ],
}

// ── T99 adicional: 6ta Categoría (18 parejas, 6 zonas) ───────────────────────

const _mk6 = (id, j1, j2, disp) => ({
  id, jugador1: j1, jugador2: j2,
  categoria: '6° Categoría', fecha: '2026-04-01',
  disponibilidad: disp,
  prefiereMismoDia: false,
})

// Zona A
const t99q1  = _mk6(25, 'Nicolás Gómez',    'Luciano Torres',    [{ dia: 'Lunes', horaDesde: '12:00' }, { dia: 'Miércoles', horaDesde: '12:00' }])
const t99q2  = _mk6(26, 'Rodrigo Méndez',   'Diego Ríos',        [{ dia: 'Lunes', horaDesde: '12:00' }, { dia: 'Miércoles', horaDesde: '12:00' }])
const t99q3  = _mk6(27, 'Agustín Pérez',    'Ezequiel López',    [{ dia: 'Miércoles', horaDesde: '12:00' }])
// Zona B
const t99q4  = _mk6(28, 'Iván Fernández',   'Julián Ruiz',       [{ dia: 'Jueves', horaDesde: '12:00' }, { dia: 'Viernes', horaDesde: '12:00' }])
const t99q5  = _mk6(29, 'Cristian Díaz',    'Sebastián Herrera', [{ dia: 'Jueves', horaDesde: '12:00' }, { dia: 'Viernes', horaDesde: '12:00' }])
const t99q6  = _mk6(30, 'Marcelo Suárez',   'Pablo Ramírez',     [{ dia: 'Viernes', horaDesde: '12:00' }])
// Zona C
const t99q7  = _mk6(31, 'Gustavo Flores',   'Hernán Medina',     [{ dia: 'Sábado', horaDesde: '12:00' }])
const t99q8  = _mk6(32, 'Roberto Castro',   'Ignacio Muñoz',     [{ dia: 'Sábado', horaDesde: '12:00' }])
const t99q9  = _mk6(33, 'Andrés Sosa',      'Eduardo Ortiz',     [{ dia: 'Sábado', horaDesde: '12:00' }])
// Zona D
const t99q10 = _mk6(34, 'Walter Vega',      'Ramón Molina',      [{ dia: 'Domingo', horaDesde: '12:00' }])
const t99q11 = _mk6(35, 'Ricardo Vargas',   'Carlos Moreno',     [{ dia: 'Domingo', horaDesde: '12:00' }])
const t99q12 = _mk6(36, 'Alfredo Romero',   'Sergio Aguirre',    [{ dia: 'Sábado',  horaDesde: '12:00' }])
// Zona E
const t99q13 = _mk6(37, 'Fernando Silva',   'Claudio Ramos',     [{ dia: 'Lunes', horaDesde: '12:00' }, { dia: 'Miércoles', horaDesde: '12:00' }])
const t99q14 = _mk6(38, 'Alejandro Torres', 'Osvaldo Reyes',     [{ dia: 'Lunes', horaDesde: '12:00' }, { dia: 'Miércoles', horaDesde: '12:00' }])
const t99q15 = _mk6(39, 'Horacio Méndez',   'Ernesto Blanco',    [{ dia: 'Miércoles', horaDesde: '12:00' }])
// Zona F
const t99q16 = _mk6(40, 'Daniel Peralta',   'Eduardo Ibáñez',    [{ dia: 'Jueves', horaDesde: '12:00' }, { dia: 'Viernes', horaDesde: '12:00' }])
const t99q17 = _mk6(41, 'Jorge Ríos',       'Miguel Guzmán',     [{ dia: 'Jueves', horaDesde: '12:00' }, { dia: 'Viernes', horaDesde: '12:00' }])
const t99q18 = _mk6(42, 'Abel Castro',      'Néstor Morales',    [{ dia: 'Viernes', horaDesde: '12:00' }])

const grupos99_6ta = [
  {
    nombre: 'Zona A', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q1, t99q2, t99q3],
    partidos: [
      _rrm('c1za_m0', t99q1, t99q2, t99q1, { resultado: [{p1:6,p2:3},{p1:6,p2:4}],           slot: _sl('Lunes','14:00'),      cancha: 1 }),
      _rrm('c1za_m1', t99q1, t99q3, t99q1, { resultado: [{p1:6,p2:2},{p1:6,p2:1}],           slot: _sl('Lunes','15:30'),      cancha: 2 }),
      _rrm('c1za_m2', t99q2, t99q3, t99q2, { resultado: [{p1:6,p2:4},{p1:4,p2:6},{p1:6,p2:3}], slot: _sl('Miércoles','14:00'), cancha: 1 }),
    ],
    clasificados: [t99q1, t99q2], necesitaDesempate: false,
  },
  {
    nombre: 'Zona B', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q4, t99q5, t99q6],
    partidos: [
      _rrm('c1zb_m0', t99q4, t99q5, t99q4, { resultado: [{p1:6,p2:4},{p1:7,p2:5}],           slot: _sl('Jueves','14:00'),     cancha: 1 }),
      _rrm('c1zb_m1', t99q4, t99q6, t99q4, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],           slot: _sl('Jueves','15:30'),     cancha: 2 }),
      _rrm('c1zb_m2', t99q5, t99q6, t99q5, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],           slot: _sl('Viernes','14:00'),    cancha: 1 }),
    ],
    clasificados: [t99q4, t99q5], necesitaDesempate: false,
  },
  {
    nombre: 'Zona C', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q7, t99q8, t99q9],
    partidos: [
      _rrm('c1zc_m0', t99q7, t99q8, t99q7, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],           slot: _sl('Sábado','14:00'),     cancha: 1 }),
      _rrm('c1zc_m1', t99q7, t99q9, t99q7, { resultado: [{p1:6,p2:1},{p1:6,p2:3}],           slot: _sl('Sábado','15:30'),     cancha: 2 }),
      _rrm('c1zc_m2', t99q8, t99q9, t99q8, { resultado: [{p1:6,p2:4},{p1:3,p2:6},{p1:6,p2:3}], slot: _sl('Sábado','17:00'), cancha: 1 }),
    ],
    clasificados: [t99q7, t99q8], necesitaDesempate: false,
  },
  {
    nombre: 'Zona D', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q10, t99q11, t99q12],
    partidos: [
      _rrm('c1zd_m0', t99q10, t99q11, t99q10, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],        slot: _sl('Domingo','14:00'),    cancha: 1 }),
      _rrm('c1zd_m1', t99q10, t99q12, t99q10, { resultado: [{p1:6,p2:3},{p1:6,p2:1}],        slot: _sl('Domingo','15:30'),    cancha: 2 }),
      _rrm('c1zd_m2', t99q11, t99q12, t99q11, { resultado: [{p1:7,p2:5},{p1:6,p2:4}],        slot: _sl('Sábado','14:00'),     cancha: 2 }),
    ],
    clasificados: [t99q10, t99q11], necesitaDesempate: false,
  },
  {
    nombre: 'Zona E', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q13, t99q14, t99q15],
    partidos: [
      _rrm('c1ze_m0', t99q13, t99q14, t99q13, { resultado: [{p1:6,p2:4},{p1:7,p2:5}],        slot: _sl('Lunes','14:00'),      cancha: 2 }),
      _rrm('c1ze_m1', t99q13, t99q15, t99q13, { resultado: [{p1:6,p2:3},{p1:6,p2:2}],        slot: _sl('Lunes','15:30'),      cancha: 1 }),
      _rrm('c1ze_m2', t99q14, t99q15, t99q14, { resultado: [{p1:6,p2:1},{p1:3,p2:6},{p1:6,p2:4}], slot: _sl('Miércoles','14:00'), cancha: 2 }),
    ],
    clasificados: [t99q13, t99q14], necesitaDesempate: false,
  },
  {
    nombre: 'Zona F', categoria: '6° Categoría', capacidad: 3,
    parejas: [t99q16, t99q17, t99q18],
    partidos: [
      _rrm('c1zf_m0', t99q16, t99q17, t99q16, { resultado: [{p1:6,p2:2},{p1:6,p2:4}],        slot: _sl('Jueves','14:00'),     cancha: 2 }),
      _rrm('c1zf_m1', t99q16, t99q18, t99q16, { resultado: [{p1:6,p2:3},{p1:6,p2:1}],        slot: _sl('Jueves','15:30'),     cancha: 1 }),
      _rrm('c1zf_m2', t99q17, t99q18, t99q17, { resultado: [{p1:7,p2:5},{p1:6,p2:3}],        slot: _sl('Viernes','14:00'),    cancha: 2 }),
    ],
    clasificados: [t99q16, t99q17], necesitaDesempate: false,
  },
]

// APA 6 zonas → Ronda Previa + Cuartos + Semi + Final
// Previas: 2F(q17)vs2C(q8), 1E(q13)vs2B(q5), 2A(q2)vs1F(q16), 2E(q14)vs2D(q11)
// Cuartos: 1A(q1)vspi0 | pi1vs1D(q10) | 1C(q7)vspi2 | pi3vs1B(q4)
const bracket99_6ta = {
  rondas: [
    {
      numero: 1, nombre: 'Ronda Previa',
      partidos: [
        _bm('pi_m0', t99q17, t99q8,  'r2_m0', 1),
        _bm('pi_m1', t99q13, t99q5,  'r2_m1', 0),
        _bm('pi_m2', t99q2,  t99q16, 'r2_m2', 1),
        _bm('pi_m3', t99q14, t99q11, 'r2_m3', 0),
      ],
    },
    {
      numero: 2, nombre: 'Cuartos de final',
      partidos: [
        _bm('r2_m0', t99q1,  null,   'r3_m0', 0),
        _bm('r2_m1', null,   t99q10, 'r3_m0', 1),
        _bm('r2_m2', t99q7,  null,   'r3_m1', 0),
        _bm('r2_m3', null,   t99q4,  'r3_m1', 1),
      ],
    },
    {
      numero: 3, nombre: 'Semifinal',
      partidos: [
        _bm('r3_m0', null, null, 'r4_m0', 0),
        _bm('r3_m1', null, null, 'r4_m0', 1),
      ],
    },
    {
      numero: 4, nombre: 'Final',
      partidos: [
        _bm('r4_m0', null, null, null, null),
      ],
    },
  ],
}

// ── Torneos ───────────────────────────────────────────────────────────────────

export const TORNEOS_INICIALES = [
  {
    id: 99,
    nombre: 'Torneo 4ta y 6ta Categoría Abril 2026',
    categorias: ['4° Categoría', '6° Categoría'],
    cupoLibre: false,
    cuposPorCategoria: { '4° Categoría': 24, '6° Categoría': 18 },
    formato: 'Fase de grupos + Eliminación',
    genero: 'Masculino',
    estado: 'in_progress',
    fechaInicio: '2026-04-05',
    fechaFin: '2026-04-26',
    fechaLimiteInscripcion: '2026-04-03',
    diaInicioEliminatoria: 'Sábado',
    horaInicioEliminatoria: '17:00',
    descripcion: 'Torneo demo — 24 parejas, 8 zonas, draw APA Octavos de Final.',
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
    inscriptos: [
      t99p1,  t99p2,  t99p3,  t99p4,  t99p5,  t99p6,
      t99p7,  t99p8,  t99p9,  t99p10, t99p11, t99p12,
      t99p13, t99p14, t99p15, t99p16, t99p17, t99p18,
      t99p19, t99p20, t99p21, t99p22, t99p23, t99p24,
      t99q1,  t99q2,  t99q3,  t99q4,  t99q5,  t99q6,
      t99q7,  t99q8,  t99q9,  t99q10, t99q11, t99q12,
      t99q13, t99q14, t99q15, t99q16, t99q17, t99q18,
    ],
    grupos: [...grupos99, ...grupos99_6ta],
    brackets: { '4° Categoría': bracket99, '6° Categoría': bracket99_6ta },
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
    genero: 'Femenino',
    estado: 'open',
    fechaInicio: '2026-04-05',
    fechaFin: '2026-04-27',
    fechaLimiteInscripcion: '2026-04-20',
    descripcion: 'Torneo exclusivo para jugadoras. Inscripción abierta hasta el 3 de abril.',
    inscriptos: inscriptosT2,
    grupos: null,
    brackets: {},
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
    genero: 'Masculino',
    estado: 'draft',
    fechaInicio: '2026-05-03',
    fechaFin: '2026-05-31',
    fechaLimiteInscripcion: '2026-04-28',
    diaInicioEliminatoria: 'Sábado',
    horaInicioEliminatoria: '17:00',
    descripcion: 'Liga mensual interna para principiantes. Ideal para quienes están empezando.',
    inscriptos: [],
    grupos: null,
    brackets: {},
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
    genero: 'Masculino',
    estado: 'draft',
    fechaInicio: '2026-06-07',
    fechaFin: '2026-06-28',
    fechaLimiteInscripcion: '2026-06-01',
    descripcion: 'El torneo más importante del semestre. Cupo libre — se anota quien quiera.',
    inscriptos: [],
    grupos: null,
    brackets: {},
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
    genero: 'Masculino',
    estado: 'finished',
    fechaInicio: '2025-11-01',
    fechaFin: '2025-12-20',
    descripcion: 'Torneo anual de cierre de temporada.',
    inscriptos: inscriptosT5,
    brackets: {},
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
    genero: 'Masculino',
    estado: 'finished',
    diaInicioEliminatoria: 'Sábado',
    horaInicioEliminatoria: '17:00',
    fechaInicio: '2025-01-10',
    fechaFin: '2025-02-28',
    descripcion: '',
    inscriptos: [],
    brackets: {},
    ganador: 'Carlos Gómez / Martín Pérez',
    subcampeon: 'Lucas Torres / Diego Silva',
  },
]
