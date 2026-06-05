# Flujo: Torneos

Gestión de torneos desde el admin y visualización/inscripción del jugador.
Última actualización: 2026-06-03

---

## Admin — Crear torneo (`/dashboardAdmin/torneos`)

1. Admin crea torneo: nombre, categorías, cupo, formato, fechaInicio, fechaFin, diaInicioEliminatoria/horaInicioEliminatoria (opcional), canchas asignadas
2. Estado inicial: `draft`
3. Admin abre inscripción → `open`

---

## Admin — Gestionar inscriptos (`/dashboardAdmin/torneos/:id` → tab Parejas inscriptas)

- **Alta manual**: agregar pareja con DNI lookup, compañero, disponibilidad (días + horaDesde), prefiereMismoDia
- **Estados de inscripto**: `inscripto` | `espera` | `suplente`
- Cupo lleno → nuevas inscripciones van a `espera`
- Al cerrar inscripción: parejas `espera` → `suplente` (no se eliminan)
- Al reabrir: `suplente` → `espera`
- Admin puede promover manualmente espera → inscripto
- Admin puede editar disponibilidad de cada pareja (modal ModalEditarDisponibilidad)

---

## Admin — Fase de grupos (`/dashboardAdmin/torneos/:id` → tab Grupos)

### Estado `closed` — grupos pendientes

1. **Generar grupos**: `generateGroupPhase(parejas titulares)` con shuffle aleatorio
   - Algoritmo constraint-first: parejas con menos días disponibles siembran su zona
   - Score: overlap + diversity + onexdia×2
   - Zonas de 3 (resto 0), de 4 (resto 1) o de 2 (resto 2) según distribución APA
2. **Auto-asignar**: asigna horarios automáticamente
   - Respeta disponibilidad, intervalo entre partidos, corte de eliminatoria
   - 3 fallbacks: overlap confirmado → días ya usados → disponibilidad implícita
   - Multi-iteración: hasta 25 reagrupaciones si quedan sinHorario
   - Modal de progreso con resultado
3. **Regenerar**: re-sortea grupos con nueva semilla aleatoria
4. **Swap manual**: click en pareja → click en otra → intercambia (solo dentro de la misma categoría)
   - Las dos zonas afectadas se resetean; el resto conserva sus horarios
   - Después del swap: Auto-asignar completa solo los sin asignar
5. **Asignar manual** (click en "Sin horario"/"Sin asignar"):
   - Modal con disponibilidad visible de ambas parejas
   - Chips de horarios pre-calculados (libres en cancha Y en ambas parejas)
   - Canchas filtradas por slot
   - Días filtrados por rango del torneo y corte de eliminatoria
6. **Confirmar grupos** → torneo pasa a `in_progress`

### Estado `in_progress` — grupos confirmados

- ZonaCardCompact con resumen de partidos y standings
- Click en zona → ZonaDetailModal para cargar resultados (sets: mejor de 3)
- Al completar todos los partidos de una zona → clasificados auto-calculados
- Si hay empate 2°-3° → admin resuelve manualmente
- Al completar TODAS las zonas → banner "Generar fase eliminatoria"

---

## Admin — Fase eliminatoria (`/dashboardAdmin/torneos/:id` → tab Fixture / Bracket)

1. `generateAPAEliminationBracket(grupos)` → bracket según draws APA (2-10 zonas)
2. Visualización por rondas (Previa → Cuartos → Semifinal → Final)
3. BYEs auto-resueltos en ronda 1
4. Cargar resultado por partido → ganador avanza automáticamente
5. Al terminar la final → banner con ganador + subcampeón
6. Admin puede registrar ganador/subcampeón en el torneo
7. Torneo pasa a `finished`

---

## Jugador — Torneos (`/dashboardJugadores/torneos`)

- Ve torneos disponibles (open) con flyer y datos
- Inscripción: DNI compañero (lookup en backend), disponibilidad por días/franja, sinCompañero toggle
- Pre-relleno si el admin cargó sus datos previamente (matching por DNI)
- Estados visibles: inscripto / en espera / suplente
- Vista del bracket cuando el torneo está in_progress o finished

---

## Reglas de negocio aplicadas

- Solo parejas con estado `inscripto` entran a la fase de grupos (suplentes NO)
- El admin ve suplentes en Parejas inscriptas como referencia
- Scheduler nunca asigna dos partidos al mismo tiempo para la misma pareja
- Scheduler respeta el corte horario de fase eliminatoria
- Días implícitos (fallback): solo para parejas que cargaron al menos 1 día
- Auto-sorteo futuro: al pasar a `closed`, backend corre generateGroupPhase + autoScheduleGroups automáticamente (pendiente Bloque 5 backend)
