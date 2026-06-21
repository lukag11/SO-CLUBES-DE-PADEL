# Features — Estado actual

**Actualizado:** 2026-06-21 (rediseño dashboard admin)

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
- **Alta rápida inline**: al crear reserva/TF, si el jugador no existe → dar de alta rápida (nombre/apellido/DNI) sin salir del formulario
- **Buscador solo acepta jugador seleccionado**: texto libre bloqueado al confirmar (requiere jugadorSel o alta rápida)
- **Botón cancelar bloqueado post-turno**: si el turno ya terminó, cancelar/liberar queda deshabilitado para preservar historial y cargos
- **Historial en drawer jugador**: cards de Turnos fijos y Reservas expandibles con detalle (fecha, cancha, horario, estado)
- **Endpoints nuevos**: `GET /reservas/jugador/:id` y `GET /turnos-fijos/jugador/:id` (admin — historial por jugador)
- **Fix conteo doble**: `_count.reservas` excluye `esTurnoFijo:true` en directorio de jugadores
- **Filtros en tabla TF admin**: buscador por jugador + chips de día + dropdown de cancha (con contador adaptativo)
- **Fix grilla horario propio**: `turnosFijosDia` usa `t.inicio`/`t.fin` directamente en lugar de `franjaParaHora` — elimina posicionamiento incorrecto en canchas con horario personalizado

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
- **Validación form alta rápida**: nombre/apellido bloquea números en tiempo real (hint ámbar), DNI máx 8 dígitos, pre-fill inteligente según tipo de query

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

## Dashboard / Resumen Admin ✅ Completo (backend real)

- Panel "pulso del club en tiempo real" en `/dashboardAdmin` (`AdminDashboardPage.jsx`), backend `GET /clubs/me/dashboard`
- **% ocupación del día** (slots ocupados / disponibles según horario del club) con barra y marca del benchmark 50%
- **Agenda de hoy**: reservas + turnos fijos virtuales ordenados, con tipo real y badges de tiempo (EN JUEGO / PRÓXIMO) y de pago
- **Tendencia 7 días**: ingresos + reservas por día en barras
- **Deltas vs ayer** (reservas e ingresos) + **cobros pendientes** accionables ("Necesita tu atención")
- **Gating financiero por permiso**: `verCaja` (ingresos/totales) y `verCobros` (estado de cobro/deuda) — los datos que el rol no puede ver NO viajan en el payload
- Auto-refresh cada 45s + indicador "● En vivo"; hero adaptativo según permisos
- Ítem "Resumen" en el sidebar admin (antes solo se llegaba tocando el logo)
- **Pendiente**: "Insight del día con IA" (primer feature de IA, premium — no construido)

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
- **Horario propio por cancha**: si la cancha tiene `horarios` personalizados activos para ese día, la landing usa esos slots en lugar del horario general del club
- **"Cancha liberada" real**: solo aparece cuando un slot genuinamente pasa de ocupado → libre entre polls (eliminada la simulación aleatoria al montar)

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
