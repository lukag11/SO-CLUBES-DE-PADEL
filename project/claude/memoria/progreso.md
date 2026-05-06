# Progreso del Proyecto

**Última actualización:** 2026-05-06

---

## Estado general

| Módulo | Estado | Notas |
|---|---|---|
| Base frontend + design system | ✅ Completo | Tailwind, componentes UI, dark/light themes |
| Login admin | ✅ Completo | Conectado al backend real. admin@club.com / 123456 |
| Landing pública (5 templates) | ✅ Completo | Personalizable desde panel admin |
| Dashboard admin completo | ✅ Completo | Stats, navegación, sidebar colapsable |
| Gestión reservas (admin) | ✅ Frontend completo | Grilla semanal, aprobación, turnos fijos — falta backend (Bloque 3) |
| Gestión pagos (admin) | ✅ Frontend completo | Registro de pagos por turno — falta backend |
| Edición del club / Quiénes Somos | ✅ Completo | Logo, colores, plantillas, horarios, canchas |
| Registro jugador (stepper 3 pasos) | ✅ Completo | Conectado al backend real. Validaciones, georef API, toggle perfil público |
| Login jugador | ✅ Completo | Conectado al backend real (DNI + password + clubId) |
| Perfil jugador | ✅ Completo | Editable, banner "completá tu perfil", georef API, perfilPublico |
| Dashboard jugador completo | ✅ Completo | Resumen, reservas, turnos fijos, stats, torneos |
| Reservas jugador (grilla + modal) | ✅ Frontend completo | Slots 1.5h — falta backend (Bloque 3) |
| Turnos fijos (pendiente → aprobación) | ✅ Frontend completo | Flujo completo — falta backend (Bloque 3) |
| Notificaciones admin + jugador | ✅ Frontend completo | Badge, centro de notificaciones — falta backend |
| Dashboard profesor (agenda + disponibilidad) | ✅ Frontend completo | Portal separado `/dashboardProfesor` — falta backend |
| Módulo torneos admin | ✅ Frontend completo | CRUD, grupos, bracket, horarios — falta backend (Bloque 4) |
| Módulo torneos jugador | ✅ Frontend completo | Inscripción, historial, vista pública — falta backend (Bloque 4) |
| Estadísticas jugador | 🔲 Hardcodeado | Placeholder. Implementar en Bloque 5 con datos reales de reservas + torneos |
| Responsive design mobile | 🔄 En progreso | Admin ~80%, Jugador ~70%, Profesor ~70% |
| Backend real — Bloque 1 setup | ✅ Completo | Express + Prisma + Supabase. Server levanta en puerto 3001 |
| Backend real — Bloque 2 auth | ✅ Completo | JWT + bcrypt. Login admin/jugador + registro jugador conectados al frontend |
| Multi-tenancy (club_id) | ✅ Completo | Schema Club/Admin/Jugador en Supabase. Seed con club-demo, admin y jugador |
| Backend real — Bloque 3 reservas | ✅ Completo | Cancha + Reserva en Supabase. 4 endpoints. Frontend jugador POST + admin GET/PATCH conectados. Fix: botón confirmar con spinner/disabled para evitar peticiones duplicadas |
| Backend real — Bloque 4 torneos | ✅ Completo | Torneo + Pareja en Prisma. 14 endpoints. Admin + jugador conectados. mapBackendTorneo, fix Number(id)→String |
| Backend real — Bloque 5 stats | 🔲 Pendiente | Estadísticas reales calculadas desde reservas + torneos |
| Google OAuth | 🔲 Futuro | Bloque 5. Supabase Auth + paso extra para cargar DNI |
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
3. ✅ **Backend Bloque 2** — Auth JWT completo. Login admin/jugador/profesor + registro jugador conectados al frontend real
4. ✅ **Backend Bloque 3** — Reservas CRUD completo
5. ✅ **Backend Bloque 4** — Torneos completo. Torneo + Pareja en Prisma. 14 endpoints REST. TorneosPage + TorneoDetallePage + PlayerTournamentsPage conectados al backend. Fix Number(id)→String para cuid routing.
6. **Backend Bloque 5** — Stats jugador, mis-reservas, Google OAuth
7. **Landing SaaS** — cuando haya primer cliente potencial
