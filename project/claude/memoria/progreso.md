# Progreso del Proyecto

**Última actualización:** 2026-04-17

---

## Estado general

| Módulo | Estado |
|---|---|
| Base frontend + design system | ✅ |
| Login admin | ✅ |
| Landing pública (5 templates) | ✅ |
| Dashboard admin completo | ✅ |
| Gestión reservas (admin) | ✅ |
| Gestión pagos (admin) | ✅ |
| Edición del club / Quiénes Somos | ✅ |
| Registro jugador (stepper 3 pasos) | ✅ |
| Dashboard jugador completo | ✅ |
| Reservas jugador (grilla + modal) | ✅ |
| Turnos fijos (pendiente → aprobación admin) | ✅ |
| Notificaciones admin + jugador | ✅ |
| Dashboard profesor (agenda + disponibilidad) | ✅ |
| **Módulo torneos admin** | ✅ |
| **Módulo torneos jugador** | ✅ |
| Responsive design | 🔲 pendiente |
| Backend real | 🔲 futuro |
| WhatsApp notificaciones | 🔲 futuro |

---

## Módulo Torneos — Estado detallado

### Completado ✅

**Admin:**
- `TorneosPage` — CRUD de torneos, tabs (En curso / Próximos / Finalizados), toggle inscripción
- `TorneoDetallePage` — vista de detalle con 4 tabs:
  - **Inscriptos**: lista de parejas, alta manual, editar disponibilidad, dar de baja
  - **Grupos**: generación automática de zonas, swap de parejas, confirmación, registro de ganadores por zona, resolución de empates
  - **Horarios**: auto-scheduling por disponibilidad (greedy), vista de partidos por slot/cancha
  - **Fixture/Bracket**: generación de eliminación directa con BYEs, registro de ganadores, propagación automática, campeón + subcampeón
- `torneoService.js` — lógica pura: bracket eliminación, fase de grupos (zonas 2/3/4), advanceWinner, advanceGroupMatch, autoScheduleGroups, esSlotDeGrupos/Eliminatoria
- `torneosStore.js` — Zustand + localStorage (`torneos_v1`), todos los métodos
- `torneosMockData.js` — formato pareja actualizado, estados del ciclo formal

**Jugador:**
- `PlayerTournamentsPage` — conectada a `torneosStore`, muestra torneos disponibles, inscripción desde el dashboard

### Ciclo de estados del torneo
`draft → open → closed → in_progress → finished`

### Formatos soportados
- `Round Robin`
- `Eliminación directa`
- `Fase de grupos + Eliminación`

---

## localStorage activo

| Clave | Store | Contenido |
|---|---|---|
| `torneos_v1` | torneosStore | Lista de torneos |
| `player_reservas` | reservasStore | Reservas del jugador |
| `admin_notificaciones_v2` | notificacionesStore | Avisos para el admin |
| `player_notificaciones` | playerNotificationsStore | Notificaciones del jugador |
| `player_token` | playerStore | Token de sesión |
| `player_data` | playerStore | Datos del jugador logueado |
| `club_config` | clubStore | Configuración del club |
| `token` | authStore | Token del admin |

---

## Reglas de negocio críticas

- Turnos SIEMPRE 1.5h (10:00 a 11:30). Nunca calcular fin como +1h.
- Turno fijo = `pendiente` hasta aprobación admin.
- Admin es el único que puede registrar ganadores y avanzar el bracket.
- BYEs se auto-resuelven al generar el bracket.
- Solo se puede generar fixture con estado `closed` o `in_progress` y mínimo 2 parejas.
- Para limpiar localStorage en pruebas: incrementar `APP_VERSION` en `main.jsx` (versión actual: 16.0).

---

## Rutas completas

### Jugador (`/dashboardJugadores`)
- `/dashboardJugadores` → login/registro
- `/dashboardJugadores/registro` → stepper 3 pasos
- `/dashboardJugadores/dashboard` → resumen
- `/dashboardJugadores/reservas` → reservar cancha
- `/dashboardJugadores/turnos-fijos` → mis turnos fijos
- `/dashboardJugadores/estadisticas` → gráficos
- `/dashboardJugadores/torneos` → torneos (inscripción + historial)
- `/dashboardJugadores/oponentes` → análisis rivales
- `/dashboardJugadores/perfil` → perfil personal
- `/dashboardJugadores/notificaciones` → centro de notificaciones

### Admin (`/dashboardAdmin`)
- `/dashboardAdmin` → dashboard principal
- `/dashboardAdmin/club` → edición del club
- `/dashboardAdmin/reservas` → grilla de reservas
- `/dashboardAdmin/torneos` → lista de torneos
- `/dashboardAdmin/torneos/:id` → detalle del torneo
- `/dashboardAdmin/pagos` → pagos

### Profesor (`/dashboardProfesor`)
- `/dashboardProfesor` → login
- `/dashboardProfesor/agenda` → agenda de clases
- `/dashboardProfesor/disponibilidad` → horarios disponibles

---

## Pendiente próximos pasos

1. Verificar `PlayerTournamentsPage` — funcionalidad de inscripción desde el lado jugador (flujo completo)
2. Responsive design (bloque dedicado)
3. Backend real (futuro)
4. Notificaciones WhatsApp (futuro backend)
