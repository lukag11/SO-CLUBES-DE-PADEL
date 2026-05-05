# Progreso del Proyecto

**Última actualización:** 2026-05-04

---

## Estado general

| Módulo | Estado | Notas |
|---|---|---|
| Base frontend + design system | ✅ Completo | Tailwind, componentes UI, dark/light themes |
| Login admin | ✅ Completo | Mock con admin@club.com / 123456 — conectar a backend |
| Landing pública (5 templates) | ✅ Completo | Personalizable desde panel admin |
| Dashboard admin completo | ✅ Completo | Stats, navegación, sidebar colapsable |
| Gestión reservas (admin) | ✅ Completo | Grilla semanal, aprobación, turnos fijos, profesores |
| Gestión pagos (admin) | ✅ Completo | Registro de pagos por turno |
| Edición del club / Quiénes Somos | ✅ Completo | Logo, colores, plantillas, horarios, canchas |
| Registro jugador (stepper 3 pasos) | ✅ Completo | DNI, nombre, email, contraseña |
| Dashboard jugador completo | ✅ Completo | Resumen, reservas, turnos fijos, stats, torneos, perfil |
| Reservas jugador (grilla + modal) | ✅ Completo | Slots 1.5h, grilla por fecha/cancha, confirmación |
| Turnos fijos (pendiente → aprobación) | ✅ Completo | Flujo completo con notificación |
| Notificaciones admin + jugador | ✅ Completo | Badge, centro de notificaciones |
| Dashboard profesor (agenda + disponibilidad) | ✅ Completo | Portal separado `/dashboardProfesor` |
| Módulo torneos admin | ✅ Completo | CRUD, grupos, bracket, horarios, personalización |
| Módulo torneos jugador | ✅ Completo | Inscripción, historial, vista pública |
| Responsive design mobile | 🔄 En progreso | Admin ~80%, Jugador ~70%, Profesor ~70% |
| Backend real — Bloque 1 setup | ✅ Completo | Express + Prisma + Supabase. Server levanta en puerto 3001 |
| Backend real — Bloque 2 auth | 🔲 Pendiente | Requiere .env con credenciales Supabase reales |
| Multi-tenancy (club_id) | 🔲 Pendiente | Schema base creado (Club, Admin, Jugador) — falta migrar a Supabase |
| WhatsApp notificaciones | 🔲 Futuro | Pendiente para fase backend |
| Landing SaaS empresa | 🔲 Futuro | Cuando haya primer cliente real |
| Registro self-service de clubes | 🔲 Futuro | MVP: alta manual por el equipo |

---

## Responsive design — Detalle por área

### Admin (`/dashboardAdmin`)
- [x] Layout base: `h-screen overflow-hidden`, `min-w-0`
- [x] Bottom nav mobile con auto-hide on scroll
- [x] Hamburger + overlay sidebar como drawer
- [x] Sidebar: colapso solo en desktop, oculto en mobile
- [x] Stats cards (ReservasPage): `grid-cols-2` en mobile
- [x] Grilla reservas: GrillaMobile (2 canchas por página)
- [x] Stat cards móvil en ReservasPage
- [x] Torneos — ParejaCard: lista vertical en mobile
- [x] Torneos — ZonaCardCompact: 1 columna en mobile
- [x] Personalización torneo: file inputs (reemplaza URLs https)
- [ ] Revisar PagosPage mobile
- [ ] Revisar AdminDashboardPage (stats principales) mobile

### Jugador (`/dashboardJugadores`)
- [x] Layout base: `min-w-0`, `overflow-x-hidden`
- [x] Selector de fecha en ReservasPage: `min-w-0` fix
- [ ] PlayerDashboardPage mobile
- [ ] PlayerTurnosFijosPage mobile
- [ ] PlayerStatsPage mobile
- [ ] PlayerTournamentsPage mobile

### Profesor (`/dashboardProfesor`)
- [x] Layout base: `min-w-0`, `overflow-x-hidden`
- [x] Selector de días en Agenda: `min-w-0` fix
- [x] Selector de días en Disponibilidad: `min-w-0` fix
- [ ] Revisar layout general de agenda en mobile

---

## localStorage activo

| Clave | Store | Contenido |
|---|---|---|
| `torneos_v1` | torneosStore | Lista de torneos |
| `player_reservas` | reservasStore | Reservas del jugador |
| `admin_notificaciones_v2` | notificacionesStore | Avisos para el admin |
| `player_notificaciones` | playerNotificationsStore | Notificaciones del jugador |
| `player_token` | playerStore | Token de sesión jugador |
| `player_data` | playerStore | Datos del jugador logueado |
| `club_config` | clubStore | Configuración del club |
| `token` | authStore | Token del admin |
| `admin_sidebar_collapsed` | AdminDashboardLayout | Estado del sidebar desktop |

> Para limpiar localStorage en pruebas: incrementar `APP_VERSION` en `main.jsx` (versión actual: 16.0).

---

## Reglas de negocio críticas

- Turnos SIEMPRE 1.5h (10:00 → 11:30). Nunca calcular fin como +1h.
- Turno fijo = `pendiente` hasta aprobación del admin.
- Admin es el único que puede registrar ganadores y avanzar el bracket.
- BYEs se auto-resuelven al generar el bracket.
- Solo se puede generar fixture con estado `closed` o `in_progress` y mínimo 2 parejas.
- Máximo un turno fijo activo por cancha por día (RN-51).
- Torneo `in_progress` bloquea todas las canchas en la grilla del jugador.
- Precio siempre fijo por cancha — sin recargo pico.

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

## Próximos pasos en orden

1. **Terminar responsive** — revisar secciones pendientes (ver checklist arriba) — puede hacerse en paralelo
2. ✅ **Backend Bloque 1** — setup base completo (`project/apps/backend/`)
3. **Backend Bloque 2** — Auth: login admin/jugador/profesor con JWT real (requiere .env con Supabase)
4. **Backend Bloque 3** — Reservas CRUD con club_id + conectar frontend
5. **Backend Bloque 4** — Torneos
6. **Backend Bloque 5** — Pagos, stats, etc.
7. **Landing SaaS** — cuando haya primer cliente potencial
