# Progreso del Proyecto

## Estado actual

- Contexto definido ✅
- Governance definido ✅
- Frontend base creado ✅
- Design system + Login page ✅
- Dashboard Layout admin ✅
- Landing pública + Navbar estilo PPA ✅
- Área de Jugadores completa ✅
- Registro jugador con stepper 3 pasos ✅
- Páginas internas del jugador ✅
- Reservar canchas (jugador) ✅
- Notificaciones admin ✅
- Flujo turno fijo (pendiente → aprobación admin → confirmada) ✅

---

## Último avance — Flujo reservas y turno fijo

**Fecha:** 2026-04-05

### Completado:
- Slots de 1.5h usando FRANJAS del admin (07:00-08:30, 08:30-10:00, etc.)
- Modal de confirmación al reservar (overlay con backdrop blur)
- Turno fijo: estado `pendiente` hasta que admin aprueba
- Admin ve "Solicitud fijo" en grilla + modal con Aprobar/Rechazar
- Al aprobar: estado → `confirmada` + notificación al jugador
- "Mis próximas reservas" muestra pendientes con badge ámbar
- playerStore persiste `player_data` en localStorage (nombre real en notificaciones)
- localStorage limpio: clave fija `player_reservas` con validación de datos

### localStorage activo (solo estas claves):
| Clave | Store | Contenido |
|---|---|---|
| `player_reservas` | reservasStore | Reservas del jugador |
| `admin_notificaciones_v2` | notificacionesStore | Avisos para el admin |
| `player_notificaciones` | playerNotificationsStore | Notificaciones del jugador |
| `player_token` | playerStore | Token de sesión |
| `player_data` | playerStore | Datos del jugador logueado |
| `club_config` | clubStore | Configuración del club |
| `token` | authStore | Token del admin |

### Regla crítica de negocio:
- Turnos SIEMPRE 1.5h (10:00 a 11:30). Nunca calcular fin como +1h.
- Turno fijo = `pendiente` hasta aprobación admin. Solo reservas normales = `confirmada` inmediato.

---

## Pendiente

- Torneos jugador (alta prioridad)
- Notificación WhatsApp al jugador (futuro backend)
- Responsive design (bloque dedicado)
- Code splitting / optimización de bundle

---

## Rutas jugador completas:
- `/jugadores` → login
- `/jugadores/registro` → registro stepper
- `/jugadores/dashboard` → resumen
- `/jugadores/reservas` → reservar cancha
- `/jugadores/turnos-fijos` → mis turnos fijos
- `/jugadores/estadisticas` → gráficos
- `/jugadores/torneos` → historial torneos
- `/jugadores/oponentes` → análisis rivales
