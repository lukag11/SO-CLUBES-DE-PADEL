# Plan de implementación — Módulo Torneos

> Documento de trabajo. Actualizar al completar cada bloque.  
> Complementa `flujos/flujo-torneos.md` (flujo de usuario) con el plan técnico de ejecución.

---

## Decisiones confirmadas

| Decisión             | Opción elegida                                                     |
| -------------------- | ------------------------------------------------------------------ |
| Estados del torneo   | Ciclo formal: `draft → open → closed → in_progress → finished`     |
| Modelo de inscriptos | Pareja como unidad: `{ id, jugador1, jugador2, categoria, fecha }` |
| Vista de detalle     | Por confirmar en Bloque 3 (drawer vs nueva ruta)                   |
| Bracket UI           | Básico — tabla por rondas, sin árbol visual complejo               |
| Conexión jugador     | Bloque 4 (posterior)                                               |

---

## Modelos de datos

```js
// Pareja (unidad de juego en pádel)
{
  id: number,
  jugador1: 'Nombre Apellido',
  jugador2: 'Nombre Apellido',
  categoria: '1° Categoría' | ... | 'Mixto',
  fecha: 'YYYY-MM-DD',  // fecha de inscripción
}

// Torneo
{
  id: number,
  nombre: string,
  categorias: string[],
  cupoLibre: boolean,
  cuposPorCategoria: { [cat]: number },
  formato: 'Eliminación directa' | 'Round Robin' | 'Fase de grupos + Eliminación',
  estado: 'draft' | 'open' | 'closed' | 'in_progress' | 'finished',
  fechaInicio: 'YYYY-MM-DD',
  fechaFin: 'YYYY-MM-DD',
  descripcion: string,
  inscriptos: Pareja[],
  bracket: Bracket | null,   // null hasta generar fixture
  ganador: string | null,    // 'Jugador1 / Jugador2'
  subcampeon: string | null,
}

// Bracket
{ rondas: Ronda[] }

// Ronda
{
  numero: number,
  nombre: 'Cuartos de final' | 'Semifinal' | 'Final' | 'Octavos de final' | ...,
  partidos: Partido[],
}

// Partido
{
  id: 'r1_m0',            // formato: ronda_match
  pareja1: Pareja | null, // null = BYE
  pareja2: Pareja | null, // null = BYE
  ganador: Pareja | null,
  estado: 'pendiente' | 'en_curso' | 'finalizado',
  nextMatchId: string | null, // ID del partido que recibe al ganador
  nextSlot: 0 | 1,            // 0 = pareja1, 1 = pareja2 del próximo partidod
  reservationId: null,        // futuro: link a reserva de cancha
}
```

---

## Mapeo de estados (old → new)

| Estado viejo (TorneosPage actual) | Estado nuevo  | Criterio                                       |
| --------------------------------- | ------------- | ---------------------------------------------- |
| `proximo` (sin inscripción)       | `draft`       | `inscripcionAbierta: false`                    |
| `proximo` (con inscripción)       | `open`        | `inscripcionAbierta: true`                     |
| `activo`                          | `in_progress` | —                                              |
| `finalizado`                      | `finished`    | —                                              |
| _(nuevo)_                         | `closed`      | Inscripciones cerradas, torneo no empezado aún |

---

## Bloques de implementación

### ✅ Bloque 0 — Relevamiento
Completado.

### ✅ Bloque 1 — Base de datos + Servicio
- `torneoService.js` completo: bracket eliminación, bracket APA, fase de grupos (RR + zona 4), autoScheduleGroups, advanceGroupMatch, resolveGroupTie, swapParejas, calcularGanadorDesdeResultado

### ✅ Bloque 2 — torneosStore
- `torneosStore.js` con Zustand. Métodos: setEstado, setBracket, setGrupos, updateGrupos, addPareja, updatePareja, resolveGroupTie, deleteTorneo, updateTorneo.

### ✅ Bloque 3 — Vista de detalle + Fixture + Grupos
- TorneoDetallePage completo: tabs Parejas inscriptas / Grupos / Fixture / Personalización
- Fase de grupos: generación, confirmación, carga de resultados, desempate, bracket APA eliminación
- Horarios tab (en construcción, integrado en Grupos)

### ✅ Bloque 4 — Backend torneos + Conexión jugador
- Backend: 14 endpoints. Torneo + Pareja en Prisma/Supabase.
- PlayerTournamentsPage conectado al backend.
- Inscripción desde frontend jugador: DNI lookup compañero, disponibilidad, sinCompañero, estados espera/suplente.

### 🔄 Bloque 5 (en progreso) — Testing scheduler + refinamiento grupos

**Estado: EN TESTING**

**Algoritmo de scheduling (`autoScheduleGroups`):**
- Constraint-first grouping: las parejas más restringidas siembran su zona
- Score combinado: overlap + diversity + onexdia×2
- Granularidad 15 min (evita perder slots entre intervalos)
- Conflicto de pareja: parejaSchedule map → no juega 2 partidos mismo horario
- Pre-poblar mapas al completar parcial (post-swap)
- 3 niveles de fallback: overlap confirmado → días usados → disponibilidad implícita
- Multi-iteración: hasta 25 reagrupaciones automáticas si hay sinHorario
- Respeta corte de fase eliminatoria (diaInicioElim / horaInicioElim)
- Días válidos del torneo: getDiasEnRango con parse local (fix UTC-3)

**Modal asignación manual:**
- Chips de horarios pre-calculados (no input manual)
- Validación de conflictos de cancha y pareja incluida
- Filtrado por rango del torneo y corte de eliminatoria

**Pendiente de probar:**
- Confirmar grupos → carga de resultados → clasificados → bracket
- Multi-categoría en scheduling
- Flujo completo hasta `finished`

---

## Reglas de negocio aplicables

- `draft`: no acepta inscripciones
- `open`: acepta inscripciones
- `closed`: no acepta nuevas inscripciones, torneo no empezado
- Solo se puede generar fixture con estado `closed` o `in_progress` y mínimo 2 parejas
- BYEs se auto-resuelven al generar el bracket
- Admin es el único que puede registrar ganadores
- `reservationId` en Partido = campo preparado para futura integración con canchas

---

## Archivos existentes relacionados

| Archivo                             | Rol                                               |
| ----------------------------------- | ------------------------------------------------- |
| `pages/TorneosPage.jsx`             | UI admin — CRUD torneos (713 líneas)              |
| `features/admin/torneosMockData.js` | Mock data — 6 torneos                             |
| `pages/PlayerTournamentsPage.jsx`   | UI jugador — historial (datos hardcodeados)       |
| `flujos/flujo-torneos.md`           | Flujo de usuario del módulo                       |
| `services/api.js`                   | Carpeta de servicios (aquí va `torneoService.js`) |

v
