# 🧠 Decisiones del Proyecto

## [2026-04-02] Estructura base

Se define una arquitectura separada:

- frontend (React + Vite)
- backend (Node.js)

### Motivo

Permite escalabilidad y futura migración a SaaS.

---

## [2026-04-03] 🔴 Regla de trabajo — OBLIGATORIA

**Siempre proponer antes de ejecutar. Sin excepción.**

- Trabajamos en bloques
- Antes de escribir o modificar cualquier archivo: explicar qué se va a hacer, qué archivos afecta, y esperar confirmación explícita
- No importa el tamaño del cambio — primero propuesta, luego ejecución
- Nunca escribir páginas o componentes completos sin validación previa

> Motivo: ejecutar sin validar genera retrabajo, pérdida de tokens y tiempo del usuario.
> Incidente: ReservasPage.jsx fue escrita completa sin propuesta ni aprobación.

---

## [2026-04-05] Modelo Reservas vs Turnos Fijos

**Reservas eventuales:** un día específico, store `reservasStore`.
**Turnos fijos:** recurrentes semanales, store SEPARADO `turnosFijosStore`.

Ambos tipos requieren aprobación del admin antes de confirmar.
Al aprobar un turno fijo: se agrega a `turnosFijosStore` + se notifica al jugador.
Al aprobar una reserva eventual: se confirma en `reservasStore` + se notifica al jugador.

**Motivo:** Son entidades distintas con comportamiento diferente. No mezclarlas.

---

## [fecha] Autenticación

Se decide usar JWT

### Motivo

- Stateless
- Escalable
