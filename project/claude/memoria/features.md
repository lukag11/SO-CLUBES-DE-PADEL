# Features — Estado actual

**Actualizado:** 2026-05-17

---

## Reservas / Turnos ✅ Completo

- Grilla semanal admin por cancha y franja horaria (horarios mixtos por cancha)
- Aprobación de reservas eventuales desde admin
- Turnos fijos recurrentes con flujo pendiente → aprobado
- Grilla jugador: selector de fecha, cancha, slot 1.5h
- Modal de confirmación + notificación al jugador (backend real)
- Ausencias y baja de turnos fijos con política de cancelación y cargo automático
- Liberación puntual de turno fijo desde grilla admin
- Bloqueo de slots por admin (mantenimiento, torneo, etc.)
- Protección doble: no se puede reservar sobre un turno fijo activo
- Turno fijo manual admin → aparece en "Mis turnos fijos" del jugador

## Usuarios / Jugadores ✅ Completo

- Login admin (JWT real) — `admin@club.com / 123456`
- Registro jugador stepper 3 pasos: datos básicos, perfil pádel, contraseña
- Login jugador (JWT real, DNI + password + clubId)
- Login profesor
- Perfiles de jugador editables (georef API para provincias/ciudades)
- **Directorio de jugadores (admin)** — alta manual, edición, baja/reactivar, eliminar
- **Match por DNI**: si admin pre-registró al jugador, el registro activa la cuenta y une el historial
- **requireActive middleware**: rutas del jugador verifican activo=true en cada request
- **Modal de cuenta desactivada**: jugador logueado que fue dado de baja ve modal al primer click

## Torneos ✅ Completo

- CRUD torneos (admin)
- Formatos: Round Robin, Eliminación directa, Grupos + Eliminación
- Inscripción de parejas con disponibilidad horaria + sinCompañero
- Generación automática de grupos (zonas A/B/C, algoritmo APA)
- Fase de grupos: registro de resultados en sets, clasificados, empates
- Bracket eliminatorio con BYEs automáticos (draws APA oficiales)
- Scheduling automático de partidos por disponibilidad
- Personalización visual del torneo (flyer PNG con Satori, colores, imágenes)
- Vista pública del torneo
- Inscripción desde dashboard jugador + filtro por género y categoría
- Admin puede editar inscripción en nombre del jugador (sinCompañero → con pareja)

## Pagos ✅ Frontend completo

- Registro de pagos por turno
- Panel de cobrado / por cobrar / turnos ocupados
- Cargos automáticos por cancelación fuera de plazo (backend)
- Exportación: pendiente para backend

## Configuración del club ✅ Completo

- Edición de nombre, logo, colores, descripción
- 5 templates de landing pública
- Gestión de canchas (nombre, tipo, precio, indoor/outdoor)
- Horarios por día de la semana + horarios personalizados por cancha
- Sección "Quiénes somos" editable
- Selectores inteligentes de horarios (garantizan combinaciones exactas de 1.5h)

## Notificaciones ✅ Completo (backend real)

- Tabla `notificaciones` en Supabase
- Badge de notificaciones en sidebar admin y jugador
- Centro de notificaciones del jugador
- Notificación al confirmar/rechazar reserva, turno fijo, ausencia
- Notificación de cargo por cancelación fuera de plazo
- Notificaciones separadas: reservas vs torneos (badges independientes)
- Polling cada 30s en PlayerLayout + AdminDashboardLayout

## Dashboard Profesor ✅ Frontend completo

- Agenda de clases por día
- Gestión de disponibilidad horaria
- Vista de clases asignadas
- Backend: pendiente

## Landing pública ✅ Completo

- Datos reales desde Supabase (`/clubs/:slug`)
- Disponibilidad de canchas en tiempo real
- Turnos fijos incluidos en disponibilidad
- 5 templates personalizables

## Responsive design 🔄 En progreso

- Admin: ~80% completo
- Jugador: ~70% completo
- Profesor: ~70% completo

## Backend / API — Estado por bloque

| Bloque | Estado | Contenido |
|---|---|---|
| Bloque 1 — Setup | ✅ | Express + Prisma + Supabase. Server en puerto 3001 |
| Bloque 2 — Auth | ✅ | JWT + bcrypt. Login admin/jugador + registro jugador |
| Bloque 3 — Reservas | ✅ | CRUD reservas, turnos fijos, cancelación con cargo |
| Bloque 4 — Torneos | ✅ | 14 endpoints. Torneo + Pareja en Prisma |
| Bloque 4b — Jugadores admin | ✅ | Alta manual, edición, baja, reactivar, eliminar. requireActive middleware |
| Bloque 5 — Stats | 🔲 | Estadísticas reales calculadas desde reservas + torneos |
| Google OAuth | 🔲 | Futuro. Supabase Auth + paso extra para cargar DNI |

## Ideas futuras

- WhatsApp: notificación al confirmar reserva. Chatbot para reservas.
- Perfil federado cross-club (JugadorGlobal por DNI)
- Notificar al jugador cuando admin edita sus datos (categoría o estado)
- Feature gating: planes básico/pro/premium
- Landing SaaS empresa (cuando haya primer cliente real)
- Super 8 y Americano: sección pública gratuita en landing del club
