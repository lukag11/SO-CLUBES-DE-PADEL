# Progreso del Proyecto

**Última actualización:** 2026-05-07

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
| Módulo torneos jugador | ✅ Frontend completo | Inscripción, historial, sinCompanero, disponibilidad, notificaciones separadas — falta backend (Bloque 4) |
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

## Último bloque completado (2026-05-07) — Flyer torneo: Satori PNG funcional

### Funcionalidades implementadas

**Sistema de flyer descargable (PNG 1080×1080)**
- `generateFlyer.jsx` — Motor Satori que genera SVG → PNG en el browser sin backend
- `FlyerTorneo.jsx` — Preview CSS 540×540 idéntico al flyer final
- `flyerTemplates.js` — 3 templates (navy/fuego/minimal) + color de acento personalizable
- `vite.config.js` — Fix `define: { 'process.env': {} }` para que Satori funcione en browser
- `@fontsource/inter` instalado localmente (400/700/900) — importado con `?url` para evitar CDN

**Correcciones críticas Satori**
- Fuentes cargadas localmente (antes: CDN fetch que fallaba → "Error: u is not iterable")
- Eliminados `lineHeight < 1` (Satori no los soporta)
- `flex: 1` → `flexGrow: 1` (shorthand no válido en Satori)
- `borderWidth: 2.5` → `borderWidth: 3` (decimales no válidos)
- `borderTop: '1px solid ...'` → propiedades separadas `borderTopWidth/Style/Color`
- Colores hex 8 dígitos (`#rrggbbaa`) → `rgba()` con helper `rgba(hex, alpha)`
- `fontStyle: 'italic'` eliminado (no hay fuente italic cargada)
- `overflow: 'hidden'` en sub-elementos → eliminado

**Persistencia de datos del flyer**
- `flyerFields(form)` helper en `TorneosPage.jsx` — extrae campos flyer antes de hacer merge con respuesta del backend
- `mapBackendTorneo` actualizado para incluir todos los campos flyer (premios, whatsapp, servicios, imagenFondo)
- `torneosStore` — `addTorneo` y `updateTorneo` incluyen `imagenFondo`
- Selector de template + color picker en `ModalFlyer`
- Input URL para foto de fondo con preview inline

**Descarga funcional**
- `document.body.appendChild(a); a.click(); document.body.removeChild(a)` — fix para que el `<a>` funcione sin estar en el DOM

---

## Último bloque completado (2026-05-07) — Torneos: flujo sinCompanero + notificaciones

### Funcionalidades implementadas

**sinCompanero en inscripción (jugador)**
- Toggle "Todavía no sé con quién juego" en `ModalInscripcion` (PlayerTournamentsPage)
- Al activarlo: oculta jugador2, DNI y disponibilidad. Guarda `sinCompanero: true`, `jugador2: 'Por definir'`
- Badge "⚠ Sin compañero/a" en `MiTorneoCard`
- Banner de alerta deadline cuando `sinCompanero && fechaLimiteInscripcion <= 4 días`
- Validación: 1 solo slot sin "prefiereMismoDia" → bloqueado con mensaje

**sinCompanero en carga admin (TorneoDetallePage)**
- Toggle en `ModalAgregarParejaAdmin`
- `ParejaCard`: muestra "Horario pendiente" en naranja cuando `sinCompanero`

**Admin puede editar inscripción completa**
- `ModalEditarDisponibilidad` extendido a "Editar inscripción": maneja jugador2, DNI, sinCompanero, disponibilidad y prefiereMismoDia
- Cubre el caso: jugador avisa por WhatsApp → admin completa los datos en su nombre
- Al guardar: notifica al jugador via `addInscripcionActualizadaAdmin` (playerNotificationsStore)

**Notificaciones separadas reservas / torneos**
- `notificacionesStore.sinLeer()`: excluye tipos torneo (inscripcion_torneo, baja_torneo, actualizacion_torneo)
- `notificacionesStore.sinLeerTorneos()`: cuenta solo tipos torneo (incluye completacion_torneo)
- Sidebar: badge rojo en Reservas, badge verde en Torneos
- `TorneosPage`: panel solo muestra notificaciones no leídas de tipo torneo; al marcarlas se ocultan
- `ReservasPage`: no muestra ningún tipo torneo

**Nuevas acciones en notificacionesStore**
- `bajaTorneo` — jugador cancela inscripción
- `actualizacionTorneo` — jugador edita inscripción
- `completacionTorneo` — jugador completa inscripción (sinCompanero → con pareja)

**Nueva acción en playerNotificationsStore**
- `addInscripcionActualizadaAdmin` — admin edita inscripción en nombre del jugador

**Visualización disponibilidad horaria**
- Botón reloj en `MiTorneoCard` → despliega panel inline con los slots del jugador
- Muestra día + horaDesde, nota "mismo día" si aplica, mensaje ámbar si sinCompanero

---

## Próximos pasos en orden

1. **Terminar responsive** — revisar secciones pendientes (ver checklist arriba) — puede hacerse en paralelo
2. ✅ **Backend Bloque 1** — setup base completo (`project/apps/backend/`)
3. ✅ **Backend Bloque 2** — Auth JWT completo. Login admin/jugador/profesor + registro jugador conectados al frontend real
4. ✅ **Backend Bloque 3** — Reservas CRUD completo
5. ✅ **Backend Bloque 4** — Torneos completo. Torneo + Pareja en Prisma. 14 endpoints REST. TorneosPage + TorneoDetallePage + PlayerTournamentsPage conectados al backend. Fix Number(id)→String para cuid routing.
6. **Backend Bloque 5** — Flyer: mover generación a endpoint Railway (hcti.io o screenshot API) cuando haya backend. Por ahora funciona 100% en browser con Satori.
7. **Backend Bloque 5** — Stats jugador, mis-reservas, Google OAuth
7. **Landing SaaS** — cuando haya primer cliente potencial
