# Registro de auditorías — qa-flujos

> El agente `qa-flujos` agrega una entrada al terminar cada auditoría. Las más nuevas van arriba.
> Formato: fecha · flujo auditado · veredicto · hallazgos (con severidad) · qué quedó sin verificar.

<!-- Las entradas nuevas se agregan acá abajo, la más reciente primero. -->

## 2026-06-20 · CIERRE — Reservas + Turnos fijos: verificación de fixes del hallazgo CRÍTICO · Veredicto: APTO para cliente

Re-auditoría de seguimiento. Verifiqué leyendo el código real que los 3 fixes están aplicados:

- 🔴→✅ [Seguro] Turnos fijos sin Serializable — CORREGIDO. `turnos-fijos.js:3` importa `runSerializable` de `../lib/serializable.js`. AMBOS caminos lo usan ahora:
  - POST `/` (solicitud jugador): `turnos-fijos.js:162` envuelve el chequeo de solapamiento RN-51 + `create` en `runSerializable`, con `throw {status:409}` (línea 172) y catch→409 (línea 217).
  - PATCH `/:id/estado` confirmar: `turnos-fijos.js:272` envuelve la re-verificación (TF solapado + reserva eventual/clase conflictiva en las próximas 8 ocurrencias) + `update` en `runSerializable`, throws 409 (líneas 282, 298), catch→409 (línea 327). La aritmética de fechas queda fuera de la TX (correcto, no toca DB).
- 🟡→✅ [Seguro] Editar clase profesor — CORREGIDO. `reservas.js` PATCH `/profesor/:id` (línea 528) envuelve los 3 chequeos de conflicto (reserva en cancha, turno fijo activo, otra clase del mismo profesor) + `update` en `runSerializable`, todos con `throw {status:409}` (líneas 534, 542, 549) y catch→409 (línea 561).
- ✅ [Seguro] DRY — `lib/serializable.js` extraído: `runSerializable(fn, retries=2)` corre `$transaction` con `isolationLevel: Serializable`, reintenta hasta 2 veces ante P2034/40001, re-lanza el resto. Importado por `reservas.js:3` y `turnos-fijos.js:3`. Los comentarios que afirmaban falsamente que `$transaction` plano prevenía el race fueron reemplazados por la explicación correcta (READ COMMITTED no impide TOCTOU; Serializable aborta + reintenta).

Validación e2e reportada por el dev (no la corrí yo en esta pasada): 2 solicitudes paralelas al mismo slot → una 201, otra 409, queda 1 solo TF. Consistente con el trazado de código.

Pendiente (NO bloqueante, mejora defense-in-depth): índice único parcial en DB sobre Reserva/TurnoFijo (canchaId+dia/fecha+horaInicio para estados activos) como red de seguridad ante un eventual bug que saltee el camino Serializable. Postergado al deploy porque requiere índice parcial + dedup previo de filas existentes. Hoy la única defensa es el isolation a nivel app, que está correctamente aplicado en todos los caminos auditados.

Veredicto: el hallazgo CRÍTICO que dejaba NO APTO el flujo está cerrado. APTO para mostrar a un dueño de club.

Sin verificar en esta pasada: no corrí el backend ni reproduje concurrencia real con curl (cierre por trazado de código); no re-audité UI (PlayerTurnosFijosPage / panel admin de aprobación); el índice de DB queda como deuda conocida.

## 2026-06-20 · Reservas eventuales + Turnos fijos (punta a punta) · Veredicto: NO APTO (por 1 hallazgo CRÍTICO acotado)

Archivos leídos: `backend/src/routes/reservas.js`, `backend/src/routes/turnos-fijos.js`, `prisma/schema.prisma` (modelos Reserva/TurnoFijo), `frontend/src/pages/PlayerReservasPage.jsx`, `frontend/src/store/reservasStore.js`, `reglas-negocio.md`.

Hallazgos:
- 🔴 [Seguro] Aprobación de turno fijo y solicitud de TF de jugador usan `prisma.$transaction` SIN `isolationLevel: Serializable` ni reintento P2034. turnos-fijos.js:160 (POST jugador) y turnos-fijos.js:269 (PATCH /:id/estado confirmar). No hay unique constraint en DB (schema.prisma:211-234 sin @@unique sobre canchaId+dia+horaInicio), así que el isolation es la ÚNICA defensa. Ventana TOCTOU real → doble-booking de TF / dos TF confirmados sobre el mismo slot bajo concurrencia. Viola la regla "todo camino que crea/confirma reservas usa runSerializable". reservas.js SÍ lo cumple en todos sus paths.
- 🟡 [Probable] reservas.js POST /admin crea Reserva+TurnoFijo atómico bajo runSerializable, pero el chequeo anti-solapamiento de TF dentro no re-valida RN-51 multi-jugador con la misma robustez; menor.
- 🔵 Nota: clubId viaja en el body de POST /reservas (frontend:499) pero el backend lo ignora y usa req.user.clubId (reservas.js:312). Sin fuga de tenant. OK.

OK verificado: slots 1.5h (frontend genera en pasos de 90', backend valida duracion===90 en TF; reserva eventual confía en horaFin del front); estados correctos (reserva jugador y TF nacen `pendiente`, alineado con RN-08/RN-14 del proyecto — OJO: el prompt del agente decía "reserva normal = confirmada inmediata" pero la fuente de verdad del proyecto es pendiente→aprobación admin); runSerializable correcto en TODOS los paths de reservas.js con catch→409; multi-tenant por req.user.clubId en todos los queries; doble-submit guard OK (submitting + disabled + guard en handler); precio fijo (sin recargoPico); baja TF bloqueada con deuda (turnos-fijos.js:233 y :342 → 409); reservasStore en memoria, sin localStorage de negocio.

Sin verificar (límites): no corrí el backend ni probé concurrencia real con curl (el hallazgo CRÍTICO es por trazado de código + ausencia de constraint, no dinámico); no leí lib/deudas.js en detalle (el bloqueo por deuda en TF usa cargo.count inline, no esa lib); no audité PlayerTurnosFijosPage ni el panel admin de aprobación (UI); no revisé generarSlots contra cruces de medianoche exhaustivamente.
