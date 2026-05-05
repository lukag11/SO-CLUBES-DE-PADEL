# Roadmap PadelOS

**Actualizado:** 2026-05-04

---

## Etapa 1 — Frontend MVP ✅ COMPLETA

**Objetivo:** Tener una demo funcional completa para mostrar a clientes.

- [x] Design system + componentes base (Tailwind, dark theme)
- [x] Landing pública del club (5 templates personalizables)
- [x] Login admin + dashboard
- [x] Gestión de reservas (grilla semanal, aprobación, turnos fijos)
- [x] Gestión de pagos
- [x] Edición del club (logo, canchas, horarios, colores)
- [x] Registro y dashboard del jugador
- [x] Reservas desde el lado jugador (grilla + modal)
- [x] Turnos fijos con flujo de aprobación
- [x] Notificaciones (admin + jugador)
- [x] Dashboard del profesor (agenda + disponibilidad)
- [x] Módulo torneos completo (admin + jugador)
  - CRUD torneos, inscriptos, grupos automáticos, bracket eliminatorio, horarios

---

## Etapa 2 — Responsive design 🔄 EN CURSO

**Objetivo:** El sistema funciona correctamente en móvil para admin, jugador y profesor.

- [x] Layout admin: bottom nav + hamburger + auto-hide scroll
- [x] Fixes horizontal scroll (min-w-0, overflow-x-hidden)
- [x] Cards inscriptos torneos — mobile legible
- [x] Grilla reservas admin — GrillaMobile
- [x] File inputs para imágenes (reemplaza URLs https)
- [ ] Secciones jugador pendientes (dashboard, torneos, stats)
- [ ] Pagos admin mobile
- [ ] Revisar profesor en mobile

---

## Etapa 3 — Backend 🔲 PRÓXIMA

**Objetivo:** Sistema real con base de datos, auth y multi-tenancy.

**Stack:** Express + Prisma + Supabase (DB + Auth) + Railway

### Fases del backend

**3a — Infraestructura base**
- [ ] Setup Express + Prisma + conexión Supabase
- [ ] Schema Prisma con todas las tablas + `club_id`
- [ ] Migraciones iniciales
- [ ] Middleware de autenticación JWT (3 roles: admin / jugador / profesor)
- [ ] Middleware de tenant (inyecta `club_id` en cada request)

**3b — Datos del club**
- [ ] CRUD clubs
- [ ] CRUD canchas
- [ ] Config del club (horarios, logo, plantilla landing)

**3c — Usuarios**
- [ ] Registro + login jugador
- [ ] Alta + login profesor
- [ ] Login admin (credenciales creadas manualmente por PadelOS)

**3d — Reservas**
- [ ] CRUD reservas eventuales
- [ ] CRUD turnos fijos
- [ ] Flujo aprobación admin → notificación jugador

**3e — Torneos**
- [ ] CRUD torneos
- [ ] Inscripción de parejas
- [ ] Generación de grupos + bracket
- [ ] Registro de resultados

**3f — Pagos y notificaciones**
- [ ] Registro de pagos
- [ ] Centro de notificaciones persistente
- [ ] WhatsApp (fase posterior)

---

## Etapa 4 — Conectar frontend al backend 🔲

**Objetivo:** Reemplazar localStorage por llamadas reales a la API.

- [ ] Reemplazar authStore mock con Supabase Auth
- [ ] Reemplazar clubStore con GET /clubs/:id
- [ ] Reemplazar reservasAdminStore con API
- [ ] Reemplazar torneosStore con API
- [ ] Reemplazar pagosStore con API
- [ ] Testing end-to-end

---

## Etapa 5 — Lanzamiento SaaS 🔲

**Objetivo:** Conseguir primeros clientes reales.

- [ ] Deploy backend en Railway
- [ ] Deploy frontend en Vercel (producción)
- [ ] Onboarding manual del primer cliente
- [ ] Landing SaaS empresa (padelos.com o similar)
- [ ] Formulario de demo / contacto
- [ ] Documentación básica para el admin del club

---

## Etapa 6 — Crecimiento 🔲 (futuro)

- [ ] Registro self-service de clubes (con pago online)
- [ ] Planes SaaS: básico / pro / premium (feature gating)
- [ ] App mobile (React Native)
- [ ] WhatsApp chatbot para reservas
- [ ] IA para matchmaking y torneos equilibrados
- [ ] Subdominios por club (lospinos.padelos.com)
- [ ] Panel SuperAdmin (gestión de todos los tenants)
- [ ] Analíticas avanzadas por club
