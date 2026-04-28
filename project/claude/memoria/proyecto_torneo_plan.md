# Plan de implementación — Módulo Torneos

> Documento de trabajo. Actualizar al completar cada bloque.  
> Complementa `flujos/flujo-torneos.md` (flujo de usuario) con el plan técnico de ejecución.

---

## Decisiones confirmadas

| Decisión | Opción elegida |
|---|---|
| Estados del torneo | Ciclo formal: `draft → open → closed → in_progress → finished` |
| Modelo de inscriptos | Pareja como unidad: `{ id, jugador1, jugador2, categoria, fecha }` |
| Vista de detalle | Por confirmar en Bloque 3 (drawer vs nueva ruta) |
| Bracket UI | Básico — tabla por rondas, sin árbol visual complejo |
| Conexión jugador | Bloque 4 (posterior) |

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
  nextSlot: 0 | 1,            // 0 = pareja1, 1 = pareja2 del próximo partido
  reservationId: null,        // futuro: link a reserva de cancha
}
```

---

## Mapeo de estados (old → new)

| Estado viejo (TorneosPage actual) | Estado nuevo | Criterio |
|---|---|---|
| `proximo` (sin inscripción) | `draft` | `inscripcionAbierta: false` |
| `proximo` (con inscripción) | `open` | `inscripcionAbierta: true` |
| `activo` | `in_progress` | — |
| `finalizado` | `finished` | — |
| *(nuevo)* | `closed` | Inscripciones cerradas, torneo no empezado aún |

---

## Bloques de implementación

### ✅ Bloque 0 — Relevamiento
Completado. Ver este documento.

---

### 🔲 Bloque 1 — Base de datos + Servicio
**Estado: PENDIENTE — plan aprobado por usuario**

**1. CREAR `src/services/torneoService.js`**
- `generateEliminationBracket(parejas)` — BYEs para no-potencia-de-2, `nextMatchId` entre partidos
- `advanceWinner(bracket, matchId, ganador)` — inmutable, retorna bracket actualizado
- `isBracketFinished(bracket)` — boolean
- `getBracketWinner(bracket)` — retorna pareja ganadora del último partido

**2. MODIFICAR `src/features/admin/torneosMockData.js`**
- Inscriptos → formato pareja `{ jugador1, jugador2 }`
- Estados → ciclo formal
- Agregar campo `bracket: null` a cada torneo

**3. MODIFICAR `src/pages/TorneosPage.jsx`** (mínimo)
- `ESTADO_CONFIG` con nuevas claves de estado
- Tabs actualizadas (En curso = `in_progress`, Próximos = `draft|open|closed`, Finalizados = `finished`)
- Nuevo torneo arranca en `draft`
- Toggle inscripción = transición de estado (`draft↔open`, `open↔closed`)

---

### 🔲 Bloque 2 — torneosStore
**Estado: PENDIENTE — por planificar**

- CREAR `src/store/torneosStore.js`
- Migrar `TorneosPage` de `useState` → store Zustand
- Persistir en localStorage (`torneos_v1`)
- Métodos: `addTorneo`, `updateTorneo`, `setEstado`, `setBracket`, `bajaInscripto`, `addPareja`
- Resuelve INC-08 (torneos desconectados)

---

### 🔲 Bloque 3 — Vista de detalle + Fixture
**Estado: PENDIENTE — falta confirmar drawer vs nueva ruta**

- Vista de detalle del torneo
- Lista de parejas inscriptas
- Botón "Generar Fixture" → llama `generateEliminationBracket`
- Visualización del bracket (tabla por rondas)
- Botón "Registrar ganador" por partido → llama `advanceWinner`
- Avance automático al siguiente partido

---

### 🔲 Bloque 4 — Conexión jugador
**Estado: PENDIENTE**

- `PlayerTournamentsPage` lee de `torneosStore`
- Torneos disponibles para inscribirse (filtrados por categoría del jugador)
- Estado del bracket visible para el jugador

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

| Archivo | Rol |
|---|---|
| `pages/TorneosPage.jsx` | UI admin — CRUD torneos (713 líneas) |
| `features/admin/torneosMockData.js` | Mock data — 6 torneos |
| `pages/PlayerTournamentsPage.jsx` | UI jugador — historial (datos hardcodeados) |
| `flujos/flujo-torneos.md` | Flujo de usuario del módulo |
| `services/api.js` | Carpeta de servicios (aquí va `torneoService.js`) |
