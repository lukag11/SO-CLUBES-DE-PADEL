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
- Área admin: dashboard "pulso en tiempo real" (% ocupación, agenda hoy, tendencia 7d, cobros — con gating financiero por permiso), notificaciones, aprobación turnos fijos
- Área jugador: login, registro stepper, reservas, turnos fijos, estadísticas
- Flujo turno fijo: pendiente → aprobación admin → confirmada

**Próximo en cola:** Torneos jugador (alta prioridad)

## Reglas críticas de negocio

- Turnos SIEMPRE 1.5h (ej: 10:00 → 11:30). Nunca +1h.
- **CRUCE DE MEDIANOCHE (regla dura, bug histórico):** un turno puede terminar después de medianoche (ej. 23:30→01:00, o 22:30→00:00) porque hay clubes que cierran tarde. Para CUALQUIER cálculo con el fin de un turno (vencido/cobro, en curso, duración, esPasada, solape) usá SIEMPRE los helpers `finEnMin(horaInicio, horaFin)` / `cruzaMedianoche` / `duracionMin` (en `backend/src/lib/tiempo.js` y `frontend/src/utils/timeUtils.js`). **NUNCA** escribas a mano `horaFin === '00:00' ? 1440 : toMin(fin)` — ese patrón se rompe con fines 00:30/01:00 e invierte el rango (causó deudas/cobros fantasma y turnos futuros marcados "Finalizado"). Tests en `tiempo.test.js` (`npm test`). Excepción: el patrón `=== '00:00' ? 1440` SÍ es válido para el CIERRE del club (ahí 00:00 = 1440), no para el fin de un turno.
- Antes de tocar el módulo de RESERVAS o mostrarlo a un cliente: correr la auditoría con el agente `qa-flujos` (es la red de seguridad — no hay test harness completo todavía).
- Auto-confirmación ON por default (todos los planes, toggle `club.config.autoConfirmaReservas`): reserva y turno fijo nacen `confirmada`/`confirmado` al instante. Con el toggle apagado vuelve el flujo manual (turno fijo y reserva quedan `pendiente` hasta aprobación admin).
- Ausencia de turno fijo se auto-libera al instante; baja del turno fijo entero sigue manual y bloqueada por deuda.

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
