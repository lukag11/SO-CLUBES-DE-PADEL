# Decisiones del Proyecto

---

## [2026-04-02] Arquitectura separada frontend / backend

Estructura con `/frontend` y `/backend` independientes.

**Motivo:** Escalabilidad, futura migración SaaS, permite desarrollar el frontend primero sin bloquear al backend.

---

## [2026-04-03] Regla de trabajo — OBLIGATORIA

**Siempre proponer antes de ejecutar. Sin excepción.**

- Trabajamos en bloques
- Antes de escribir o modificar cualquier archivo: explicar qué se va a hacer, qué archivos afecta, y esperar confirmación explícita
- No importa el tamaño del cambio — primero propuesta, luego ejecución

**Motivo:** Ejecutar sin validar genera retrabajo, pérdida de tokens y tiempo.

---

## [2026-04-05] Modelo Reservas vs Turnos Fijos

**Reservas eventuales:** un día específico, store `reservasStore`.
**Turnos fijos:** recurrentes semanales, store SEPARADO `turnosFijosStore`.

Ambos tipos requieren aprobación del admin antes de confirmar.

**Motivo:** Son entidades distintas con comportamiento diferente. No mezclarlas.

---

## [2026-04-xx] Autenticación con JWT

Se decide usar JWT para los tres roles (admin, jugador, profesor).

**Motivo:** Stateless, escalable, compatible con Supabase Auth.

---

## [2026-04-xx] Turnos siempre 1.5h

Los turnos son SIEMPRE de 1.5 horas (ej: 10:00 → 11:30). Nunca calcular fin como +1h.

**Motivo:** Regla de negocio del pádel. Las canchas se reservan en bloques de 1.5h.

---

## [2026-04-xx] Precio fijo por turno

Sin recargo en horario pico. El precio es siempre fijo por cancha.

**Motivo:** Simplifica la lógica y la experiencia del jugador. `recargoPico` en clubStore es dead code.

---

## [2026-04-xx] Frontend primero, backend después

Se construye el frontend completo usando localStorage como persistencia temporal. El backend se conecta una vez que el frontend esté estable.

**Motivo:** Permite validar el producto visualmente antes de invertir en infraestructura. Más ágil para un equipo pequeño.

---

## [2026-05-04] Stack backend decidido

**Express + Prisma + Supabase (DB + Auth) + Railway**

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | Express | Simple, sin overhead, equipo chico |
| ORM | Prisma | Schema declarativo, migraciones automáticas |
| DB + Auth | Supabase | Ya en uso, PostgreSQL real, RLS nativo |
| Deploy backend | Railway | Ya en uso, deploy con push |
| Deploy frontend | Vercel | Ya en uso |

**Alternativas descartadas:**
- NestJS: demasiado ceremonial para MVP
- Auth0: caro en etapa temprana
- Drizzle: menos maduro que Prisma

---

## [2026-05-04] Modelo SaaS — Multi-tenancy con club_id

Todas las tablas de la DB tienen `club_id`. El backend filtra automáticamente por el club del usuario autenticado.

```
Ejemplo:
reservas: id | club_id | jugador_id | cancha_id | fecha | ...
jugadores: id | club_id | nombre | email | ...
```

**Motivo:** Patrón más simple y suficiente para MVP. Un solo backend sirve N clubes sin complejidad de schemas separados.

---

## [2026-05-04] Onboarding de nuevos clientes — Alta manual (MVP)

En lugar de registro self-service, el equipo PadelOS crea manualmente la cuenta de cada nuevo club.

**Motivo:** En etapa MVP se ven pocos clientes, el control manual permite asegurar calidad del onboarding. El self-service se automatiza en etapa de crecimiento.

**Flujo:**
1. Club contacta vía landing / formulario
2. PadelOS crea club + admin en la DB
3. Club recibe credenciales y configura su panel

---

## [2026-05-04] Responsive design — Solo mobile, nunca tocar desktop

Al hacer cambios responsive, solo modificar el comportamiento mobile (clases base sin prefijo). El desktop queda intacto salvo que se pida explícitamente.

**Motivo:** Cambiar desktop al arreglar mobile genera retrabajo y pérdida de tiempo.

**Técnica:** Usar siempre clases base para mobile y prefijos `md:` o `lg:` para restaurar el estilo desktop. Ejemplo: `flex-col md:flex-row`.

---

## [2026-05-04] Navegación mobile admin — Híbrida (bottom nav + hamburger)

Admin mobile usa bottom nav fija (5 ítems) + hamburger que abre el sidebar completo como drawer.

- Bottom nav: navegación rápida entre secciones
- Hamburger: acceso al logout, branding del club, menú completo
- Bottom nav tiene auto-hide on scroll (se oculta al bajar, reaparece al subir)

**Motivo:** Bottom nav sola no da acceso al logout. Hamburger solo es anticuado. El híbrido da lo mejor de ambos.

---

## [2026-05-04] Landing SaaS empresa — Pendiente

La landing de ventas de PadelOS (para vender el SaaS a clubes) se construye cuando haya algo funcional para mostrar.

**Motivo:** No tiene sentido invertir en marketing antes de tener producto. Se construye cuando haya primer cliente potencial real.
