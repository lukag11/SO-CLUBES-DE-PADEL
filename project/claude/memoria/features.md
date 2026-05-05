# Features — Estado actual

**Actualizado:** 2026-05-04

---

## Reservas / Turnos ✅ Completo

- Grilla semanal admin por cancha y franja horaria
- Aprobación de reservas eventuales desde admin
- Turnos fijos recurrentes con flujo pendiente → aprobado
- Grilla jugador: selector de fecha, cancha, slot 1.5h
- Modal de confirmación + notificación al jugador
- Ausencias y baja de turnos fijos

## Usuarios ✅ Completo (frontend mock)

- Login admin (mock: admin@club.com / 123456)
- Registro jugador (stepper 3 pasos: datos, DNI, contraseña)
- Login jugador
- Login profesor
- Perfiles de jugador con estadísticas

## Torneos ✅ Completo

- CRUD torneos (admin)
- Formatos: Round Robin, Eliminación directa, Grupos + Eliminación
- Inscripción de parejas con disponibilidad horaria
- Generación automática de grupos (zonas A/B/C)
- Fase de grupos: registro de resultados, clasificados, empates
- Bracket eliminatorio con BYEs automáticos
- Scheduling automático de partidos por disponibilidad
- Personalización visual del torneo (flyer, colores, imágenes)
- Vista pública del torneo
- Inscripción desde dashboard jugador

## Pagos ✅ Completo (frontend mock)

- Registro de pagos por turno
- Panel de cobrado / por cobrar / turnos ocupados
- Exportación (pendiente para backend)

## Configuración del club ✅ Completo

- Edición de nombre, logo, colores, descripción
- 5 templates de landing pública
- Gestión de canchas (nombre, tipo, precio, indoor/outdoor)
- Horarios por día de la semana
- Sección "Quiénes somos" editable

## Notificaciones ✅ Completo

- Badge de notificaciones en sidebar admin y jugador
- Centro de notificaciones del jugador
- Notificación al confirmar/rechazar reserva
- Lista de espera en torneos

## Dashboard Profesor ✅ Completo

- Agenda de clases por día
- Gestión de disponibilidad horaria
- Vista de clases asignadas

## Responsive design 🔄 En progreso

- Admin: ~80% completo
- Jugador: ~70% completo
- Profesor: ~70% completo

## Backend / API 🔄 En progreso

- Stack: Express + Prisma + Supabase + Railway
- **Bloque 1 ✅** — Setup base completo. Server Express en `project/apps/backend/`, levanta en puerto 3001, health check en `GET /api/health`
- Schema Prisma inicial: `Club`, `Admin`, `Jugador` con `club_id` en todas
- Variables necesarias en `.env.example` (DATABASE_URL, SUPABASE_URL, JWT_SECRET)
- **Bloque 2 🔲** — Auth (login admin/jugador/profesor con JWT real) — requiere `.env` con credenciales Supabase
- **Bloque 3 🔲** — Reservas CRUD
- Ver roadmap completo en `context/roadmap.md`

## WhatsApp 🔲 Futuro

- Notificación al jugador cuando se confirma reserva
- Chatbot para reservas vía WhatsApp
