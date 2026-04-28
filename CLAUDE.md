# SO-CLUBES-DE-PADEL

Plataforma web SaaS para gestión de clubes de pádel. React + Vite + TailwindCSS (frontend). Backend planeado en Node.js + PostgreSQL.

## Contexto completo del proyecto

Antes de cualquier tarea, leer en orden:

1. `project/claude/context/producto.md` — qué es el producto
2. `project/claude/context/arquitectura.md` — stack técnico
3. `project/claude/context/funcionalidades.md` — funcionalidades definidas
4. `project/claude/memoria/progreso.md` — estado actual y último avance
5. `project/claude/context/governance/protocolo_agente.md` — cómo trabajar
6. `project/claude/context/governance/estandares_codigo.md` — estándares de código
7. `project/claude/context/governance/flujo_desarrollo.md` — flujo de trabajo
8. `project/claude/context/governance/reglas_decision.md` — reglas de decisión

## Estado actual (actualizar en progreso.md al terminar cada sesión)

- Frontend base completo con design system
- Área admin: dashboard, notificaciones, aprobación turnos fijos
- Área jugador: login, registro stepper, reservas, turnos fijos, estadísticas
- Flujo turno fijo: pendiente → aprobación admin → confirmada

**Próximo en cola:** Torneos jugador (alta prioridad)

## Reglas críticas de negocio

- Turnos SIEMPRE 1.5h (ej: 10:00 → 11:30). Nunca +1h.
- Turno fijo = `pendiente` hasta aprobación admin
- Reserva normal = `confirmada` inmediato

## Rutas actuales

| Ruta | Descripción |
|------|-------------|
| `/jugadores` | Login jugador |
| `/jugadores/registro` | Registro stepper 3 pasos |
| `/jugadores/dashboard` | Resumen jugador |
| `/jugadores/reservas` | Reservar cancha |
| `/jugadores/turnos-fijos` | Mis turnos fijos |
| `/jugadores/estadisticas` | Gráficos |
| `/jugadores/torneos` | Historial torneos |

## localStorage activo

| Clave | Store |
|-------|-------|
| `player_reservas` | reservasStore |
| `admin_notificaciones_v2` | notificacionesStore |
| `player_notificaciones` | playerNotificationsStore |
| `player_token` | playerStore |
| `player_data` | playerStore |
| `club_config` | clubStore |
| `token` | authStore |

## Flujo de trabajo entre sesiones

Al **terminar** una sesión: `git add` → `git commit` → `git push` + actualizar `project/claude/memoria/progreso.md`

Al **arrancar** una sesión: Claude avisa automáticamente si el repo está desactualizado respecto al remoto.
