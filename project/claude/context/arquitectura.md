# Arquitectura

## Stack decidido

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Ya implementado |
| Backend | Node.js + Express | Simple, sin overhead, equipo chico |
| ORM | Prisma | Schema declarativo, migraciones automáticas, TypeScript |
| Base de datos | Supabase (PostgreSQL) | Ya en uso, RLS nativo, panel visual |
| Auth | Supabase Auth | Incluida en Supabase, JWT, cero código extra |
| Deploy frontend | Vercel | Ya en uso, CDN global, preview por PR |
| Deploy backend | Railway | Ya en uso, deploy con push, escala solo |

---

## Modelo SaaS — Multi-tenancy

PadelOS es una plataforma SaaS. Un solo backend y una sola DB sirven a múltiples clubes.

### Separación de datos

Todas las tablas tienen `club_id`. El backend filtra siempre por el club del usuario autenticado:

```
reservas:  id | club_id | cancha_id | jugador_id | fecha | ...
jugadores: id | club_id | nombre | email | ...
canchas:   id | club_id | nombre | tipo | precio | ...
torneos:   id | club_id | nombre | estado | ...
pagos:     id | club_id | reserva_id | monto | ...
```

### Jerarquía de tenants

```
PadelOS (empresa)
├── Club A  → admin: juan@cluba.com  (club_id: 1)
│   ├── Jugadores del club A
│   ├── Canchas del club A
│   └── Torneos del club A
├── Club B  → admin: maria@clubb.com (club_id: 2)
│   └── ...
└── Club N  → ...
```

### Onboarding de nuevo cliente (MVP — alta manual)

1. Club contacta vía landing / formulario de demo
2. El equipo PadelOS crea manualmente en la DB:
   - Registro en tabla `clubs`
   - Cuenta admin con email + password
3. Club recibe credenciales y accede al dashboard
4. Configura su club (canchas, horarios, logo, etc.)

> Futuro: registro self-service automatizado con integración de pagos.

---

## Roles del sistema

| Rol | Acceso | Ruta |
|---|---|---|
| Admin del club | Dashboard admin completo | `/dashboardAdmin` |
| Jugador | Dashboard jugador | `/dashboardJugadores` |
| Profesor | Agenda + disponibilidad | `/dashboardProfesor` |
| SuperAdmin (futuro) | Panel PadelOS global | `/superadmin` |

Cada rol tiene su propio JWT. El backend valida rol + `club_id` en cada request.

---

## Estructura de carpetas (proyecto)

```
/project
  /apps
    /frontend   → React + Vite (ya implementado)
    /backend    → Node.js + Express + Prisma (pendiente)
  /claude       → documentación del proyecto
```

---

## Orden de implementación del backend

1. Setup proyecto Express + Prisma + conexión Supabase
2. Schema Prisma (todas las tablas con `club_id`)
3. Auth — login admin / jugador / profesor (JWT)
4. Club config (GET/PUT datos del club)
5. Canchas (CRUD)
6. Jugadores (registro, login, perfil)
7. Reservas + turnos fijos
8. Profesores + clases
9. Torneos (inscriptos, grupos, bracket)
10. Pagos
11. Notificaciones
12. WhatsApp (futuro)

---

## Decisiones pendientes

- Subdominios por club (`lospinos.padelos.com`) vs path (`padelos.com/club/los-pinos`) — decidir antes de DNS
- Planes SaaS (básico / pro / premium) — ver `project/claude/context/governance/` para feature gating
- Landing SaaS empresa — construir cuando haya primer cliente real
