# Registro de auditorías — qa-flujos

> El agente `qa-flujos` agrega una entrada al terminar cada auditoría. Las más nuevas van arriba.
> Formato: fecha · flujo auditado · veredicto · hallazgos (con severidad) · qué quedó sin verificar.

<!-- Las entradas nuevas se agregan acá abajo, la más reciente primero. -->

## 2026-06-20 · NOTIFICACIONES del bloque automatización (branch automatizacion-turnos) — trazado punta a punta · Veredicto: APTO para cliente

Foco exclusivo: que ninguna notificación llegue rota/en blanco/mal mapeada en ningún rol. Archivos leídos: `backend/src/routes/reservas.js` (completo), `backend/src/routes/turnos-fijos.js` (completo), `frontend/src/store/notificacionesStore.js` (normBackend), `frontend/src/store/playerNotificationsStore.js` (TITULOS+formatCuerpo), `frontend/src/components/ui/Navbar.jsx` (formatNotif), `frontend/src/pages/ReservasPage.jsx` (panel notif :2106-2475), `frontend/src/pages/PlayerNotificacionesPage.jsx` (TIPO_META+render), `frontend/src/pages/PlayerReservasPage.jsx` (qué endpoint dispara cada notif).

Hallazgos:
- 🔵 [Seguro] Branch latente en `reservas.js` POST `/` con `esTurnoFijo:true` arma `dataNotif` SIN `dia` (reservas.js :367-375) y emite `turno_fijo_confirmado`/`turno_fijo_autoconfirmado`. El render jugador (`formatCuerpo` :28) y admin (`esTurnoFijoAuto` ReservasPage :2450, Navbar :14) usan `dia` → si ese camino corriera, el cuerpo saldría con hueco ("todos los  · ..."). NO es bug activo: ningún caller del frontend postea a /reservas con esTurnoFijo:true (grep `esTurnoFijo:true` → 0 matches; PlayerReservasPage solicita TF por POST /turnos-fijos :470-475, que SÍ manda `dia` vía crearNotifTurnoFijo). Riesgo: latente si alguien reactiva ese branch. Sugerencia: agregar `dia` al dataNotif de ese branch o eliminar el branch muerto.

Verificado OK tipo por tipo (data backend → normBackend/store → render):
- `reserva_autoconfirmada` (admin): backend manda jugador/canchaNombre/fecha/horaInicio/horaFin/precio (reservas.js :367). normBackend mapea todos. Render ReservasPage :2433-2441 (jugador+precio+cancha+inicio/fin+fechaReserva) y Navbar :11-12. Excluido del fallback (:2462). Pasa notifFiltradas. OK.
- `turno_fijo_autoconfirmado` (admin): backend manda dia+jugador+cancha+horas+precio (turnos-fijos.js :209-217). Render :2443-2451 usa DIAS_LABEL[n.dia] y precio; Navbar :13-14 usa n.dia. OK.
- `turno_liberado_auto` (admin): backend manda turnoFijoId+fecha+jugador+canchaNombre+dia+horas (turnos-fijos.js :484-492). Render :2453-2460 usa jugador+cancha+inicio/fin+fechaReserva; Navbar :15-16. Excluido del fallback. OK.
- Refactor ausencia (turnos-fijos.js :405-505): la TX devuelve `{turno, updated, cargoAplicado, horasMinimas}` (:467) y se desestructura bien (:470). Las 3 notifs (cargo_cancelacion :474, turno_liberado_auto :494, ausencia_confirmada :497) se arman FUERA de la TX con todos los campos. `dataNotif` toma jugador/cancha de `updated` (incluye INCLUDE_CANCHA) y dia/horas de `turno`. cargo_cancelacion toma monto=turno.precio y horasMinimas de result. Correcto.
- `ausencia_confirmada` (jugador): TITULOS+formatCuerpo :32 (cancha+fecha+horas). TIPO_META :61. OK.
- `reserva_confirmada` / `turno_fijo_confirmado` (jugador): TITULOS+formatCuerpo :25/:28, TIPO_META :13/:37. El `turno_fijo_confirmado` real (POST /turnos-fijos) trae `dia` → cuerpo completo. OK.
- `cargo_cancelacion` (jugador): formatCuerpo :33 usa fecha+horaInicio+monto; backend manda monto+horasMinimas (reservas.js :1305 y turnos-fijos.js :474). OK.
- `nueva_reserva` / `solicitud_turno_fijo` (flag OFF): Navbar :9-10 + :17 y ReservasPage esSolicitudFijo :2302. nueva_reserva se filtra del panel ReservasPage (notifFiltradas :2107) porque las pendientes se listan aparte; solicitud_turno_fijo pasa y se renderiza. OK.
- Fallback admin ReservasPage (:2462): excluye explícitamente esReservaAuto/esTurnoFijoAuto/esTurnoLiberadoAuto → ninguno cae en fila en blanco. notifFiltradas (:2106) es blacklist de nueva_reserva+torneos; los 3 tipos auto pasan. Navbar default (:29-30) muestra el tipo legible (replace _→espacio), nunca blanco.
- Página jugador PlayerNotificacionesPage: TIPO_META tiene fallback genérico (icono Bell, :121) → aunque falte el meta visual, siempre muestra titulo+cuerpo. Sin fallback vacío.
- Fire-and-forget: TODAS las prisma.notificacion.create llevan .catch(()=>{}) o .catch(console.error) y corren fuera de runSerializable → un fallo de notif no aborta ni revierta el flujo principal (reserva/turno/cargo ya commiteados). Verificado en los 6 caminos del bloque.

Sin verificar (límites honestos): no corrí backend ni validé dinámicamente con curl (cierre por trazado de código); no revisé el endpoint backend /notificaciones (admin/me) que persiste y devuelve las filas (asumí que devuelve `{id,tipo,data,leida,createdAt}` tal como lo consumen normBackend y el store jugador — [Suposición], no leí ese router); no audité tipos de notif fuera del bloque automatización (torneos, stock, clase profesor) salvo donde comparten render.

Veredicto: APTO. Cada tipo de notif del bloque emite los campos que su render consume, en los tres roles. El único hallazgo es un branch muerto de severidad cosmética y latente. Ninguna notificación llega rota o en blanco en los caminos que el frontend realmente dispara hoy.


## 2026-06-20 · ADVERSARIAL doble-booking / plata — branch automatizacion-turnos (foco solapamiento + cargos ausencia) · Veredicto: APTO (sin grieta)

Pasada adversarial deliberada: intenté colar un doble-booking, un cargo duplicado o un estado inconsistente. No encontré ninguno. Archivos releídos: reservas.js (helpers toMin/rangoMin/overlaps :13-34, POST jugador :327, POST admin :688, PATCH confirmar :833), turnos-fijos.js (POST jugador :171, PATCH confirmar :290, POST /:id/ausencia :413, PATCH admin ausencia :518), deudas.js (turnosImpagosDeuda :14), tiempo.js, serializable.js, schema.prisma (pagado defaults).

ÁREA 1 — solapamiento/doble-booking: BLINDADO.
- Todos los caminos de creación/confirmación corren bajo runSerializable (Serializable + reintento P2034/40001, serializable.js correcto). No hay ningún path que escriba reserva/TF fuera de runSerializable. PATCH estado a no-confirmado (cancelar/rechazar/inactivo) no necesita TX (no crea slot).
- Cross-midnight: reservas.js usa overlaps()/rangoMin() (fin<=inicio → +1440, espacio extendido 48h :29-32) — cross-midnight aware por diseño, cubre el 00:00. turnos-fijos.js usa toMinBE/toMinLocal planos PERO con guard explícito `horaFin === '00:00' ? 1440` en TODOS los puntos de comparación de rango (:154,:174,:180,:274,:297,:312) y en la validación de duración 90 (:154). El guard solo cubre el caso exacto '00:00'; cualquier otro fin post-medianoche (ej. 01:00) sería rechazado antes por duracion!==90, así que no hay slot que escape el guard. Sin grieta.
- RN-51 + admin pisando TF: POST /admin (:739-750) re-valida con overlaps() y aborta 409 si ya hay TF pendiente/confirmado solapado; el bloqueo de reserva eventual sobre TF confirmado respeta diasAusentes + desde (:702-715). Admin NO puede pisar un TF confirmado salvo día liberado por ausencia.
- Doble-aprobación concurrente de TF: PATCH confirmar re-verifica TF solapado + reserva/clase conflictiva DENTRO de la TX (:292-320); la segunda transacción aborta y al reintentar ve la fila commiteada → 409.

ÁREA 2 — plata: BLINDADO.
- deudas.js turnosImpagosDeuda: un turno es deuda solo si confirmada + pagado:false + cobroOmitido:false + jugadorId + precio>0 + venció gracia (fecha<hoy, o hoy con finMin+60<=ahora). Guard medianoche en horaFin (:25): un turno que termina 00:00 da finMin=1440, nunca <= ahoraMin → no se marca deuda antes de jugarse. Un turno futuro/no jugado NO aparece como deuda. Correcto.
- POST /:id/ausencia (refactor bajo runSerializable :413): el check `ausenciasPendientes/diasAusentes.includes(fecha)` se RE-LEE dentro de la TX (findUnique :414 → check :418) antes de escribir cargo/push. Dos requests concurrentes (doble-submit fuera de plazo): el segundo aborta por serialización, reintenta, ve la fecha ya pusheada → 409. NO se puede duplicar el cargo ni pushear la fecha dos veces. El cargo (tx.cargo.create :436) está dentro de la TX. Status de error propaga bien vía `res.status(e.status || 500)` (:503) — 404/403/400/409 viajan correctos.
- Auto-confirmación NO nace pagada: ninguno de los 3 POST (jugador reservas.js:347, admin :717, TF jugador turnos-fijos.js:189) setea pagado. Reserva.pagado @default(false) (schema :192). El @default(true) de schema :390 es el modelo de inscripción de torneo, no Reserva. Los únicos pagado:true son endpoints de cobro explícito (reservas.js:951/:1005, cargos.js:234). El cobro es aparte de la acción de reservar. Correcto.

Sin verificar (límites honestos): no corrí el backend ni reproduje concurrencia real con curl (cierre por trazado + lógica de isolation); sigue pendiente el índice único parcial en DB (canchaId+dia/fecha+horaInicio para estados activos) como red de seguridad defense-in-depth — deuda conocida de auditorías previas, hoy la única defensa es el Serializable a nivel app, correctamente aplicado en TODOS los caminos. No re-validé dinámicamente la aritmética UTC-3 del cargo fuera de plazo (solo lectura).

Veredicto: no logré colar ninguna grieta. El bloque está apto para merge/demo en lo que respecta a doble-booking y plata.


## 2026-06-20 · BLOQUE "automatización de turnos" (branch automatizacion-turnos) — gate de merge · Veredicto: APTO con observaciones (ningún bloqueante)

Archivos leídos: `backend/src/lib/autoConfirma.js`, `backend/src/lib/serializable.js`, `backend/src/lib/deudas.js`, `backend/src/routes/reservas.js` (completo), `backend/src/routes/turnos-fijos.js` (completo), `backend/src/routes/clubs.js` (ocupadasAhora), `prisma/schema.prisma` (enums estado), `frontend/src/store/notificacionesStore.js`, `frontend/src/components/ui/Navbar.jsx` (formatNotif), `frontend/src/pages/ReservasPage.jsx` (panel notif), `frontend/src/pages/PlayerReservasPage.jsx` (handleConfirmar), `frontend/src/pages/PlayerTurnosFijosPage.jsx` (ausencia/cancelar), `frontend/src/pages/PlayerMisReservasPage.jsx` (cancelar).

Hallazgos (ninguno crítico):
- 🟡 [Probable] Auto-liberación de ausencia sin transacción + sin guard de concurrencia. `turnos-fijos.js` POST /:id/ausencia: el check de duplicado (línea 415) y las escrituras (cargo create :434, push diasAusentes :463, cancelar reserva :473-478) NO están en transacción. Doble-submit concurrente del mismo jugador podría pasar ambos el check antes de escribir → fecha pusheada dos veces + cargo duplicado (si fuera de plazo). Mitigado por UI (setEnviando + disabled={enviando} en ModalAusencia :147), no por backend. No genera doble-booking. Sugerencia: envolver en runSerializable o re-leer diasAusentes dentro de TX.
- 🔵 [Seguro] handleConfirmarAusencia (PlayerTurnosFijosPage :338) traga el error del backend en catch y muestra toast de éxito + registra ausencia local. Si el backend rechaza (ej. 409), el front miente "Ausencia registrada"; se corrige en el próximo fetch. Cosmético.
- 🔵 [Suposición] Fallback de dev: addReserva/addTurnoFijoFromApi se ejecutan aun sin backend (canchaDBId/token falsy). En prod siempre hay token, sin impacto. No verifiqué que canchaDBId siempre exista al confirmar.

Verificado OK (lo que de verdad cubrí):
- Anti doble-booking: TODOS los caminos de creación/confirmación corren bajo runSerializable con catch→409 — reservas POST jugador (:327), POST profesor (:433), PATCH profesor edit (:544), POST admin clase-profesor (:604), POST admin reserva/TF (:688), PATCH reserva confirmar (:833); turnos-fijos POST jugador (:171) y PATCH confirmar (:290). serializable.js correcto (Serializable + reintento P2034/40001).
- Auto-confirmación: clubAutoConfirma default true. Estados correctos por modelo: reserva eventual nace 'confirmada', TF nace 'confirmado' (schema.prisma :190/:220 lo confirma). Si flag OFF → 'pendiente' + notif manual (nueva_reserva/solicitud_turno_fijo). Decisión de producto documentada en autoConfirma.js.
- Fixes medianoche: todos los toMin/aMin(horaFin) que comparan rangos tienen guard `=== '00:00' ? 1440`. Verificado en turnos-fijos (:154,:174,:180,:274,:297,:312), deudas.js (:25), clubs.js ocupadasAhora (:71), duración 90min (:154). Los overlaps()/rangoMin() de reservas.js son cross-midnight aware por diseño. No quedó ningún horaFin crudo en comparación de rangos (los demás son selects/data de notif).
- Multi-tenant: clubId siempre de req.user.clubId en todos los queries de negocio; el body trae clubId pero se ignora (reservas POST :295). Sin fuga de tenant.
- Bloqueo baja TF con deuda: intacto. DELETE jugador (:363→409) y PATCH estado inactivo admin (:252→409) cuentan cargos pendientes. No se automatizó.
- Bloqueo admin sobre TF confirmado salvo día liberado (POST /admin :697-715) + RN-51 con overlaps cross-midnight (:739-750), aborta con 409 sin saltear en silencio.
- Notificaciones: normBackend mapea canchaNombre→cancha, horaInicio→inicio, horaFin→fin, dia, fecha, precio, turnoFijoId — coincide con el data que arma el backend para los 3 tipos nuevos. Render explícito de reserva_autoconfirmada/turno_fijo_autoconfirmado/turno_liberado_auto en ReservasPage (:2433-2461) y Navbar formatNotif (:11-16). El fallback de ReservasPage (:2462) excluye los 3 nuevos → NO caen en fila en blanco. notifFiltradas es blacklist, los deja pasar. Navbar default muestra tipo legible (no blanco).
- Notif fire-and-forget: todas con .catch(() => {}) o .catch(console.error), fuera de la TX. No rompen el flujo.
- Doble-submit + commit-timing: PlayerReservasPage handleConfirmar (:462) guard `|| submitting` + setSubmitting + disabled={submitting} (:1057); pantalla de éxito se setea recién tras la respuesta de la API (:552). PlayerMisReservasPage (cancelando+disabled, toast.error en catch) y PlayerTurnosFijosPage (enviando/cancelando/retirandoId) OK.
- Pantalla de éxito distingue confirmado (auto) vs enviado (pendiente) leyendo turno.estado/reserva.estado del backend (:480,:514). Correcto.

Sin verificar (límites honestos): no corrí el backend ni reproduje concurrencia real con curl (cierre por trazado de código); no validé dinámicamente el cargo por ausencia fuera de plazo (solo leí la aritmética UTC-3); no re-audité el panel admin de aprobación manual con flag OFF end-to-end; sigue pendiente el índice único parcial en DB (canchaId+dia/fecha+horaInicio) como red de seguridad — deuda conocida de auditorías previas, no introducida por este bloque.

Veredicto de merge: APTO. El bloque cumple las reglas de negocio centrales (slots 1.5h, Serializable en todos los caminos, tenant por JWT, estados correctos, medianoche, baja bloqueada por deuda, notif sin filas en blanco). El único hallazgo accionable (🟡 ausencia sin TX) es un caso borde de concurrencia mitigado por UI; recomiendo abrirlo como issue de hardening post-merge, no bloquea.


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
