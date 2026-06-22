# Plan de bloque — Convocatorias / Matching (Americano y Super 8)

**Estado:** EN CONSTRUCCIÓN. Creado 2026-06-21. **Bloque 1 (fundación) HECHO 2026-06-22.**

## Avance por bloques
- **Bloque 1 — Fundación: ✅ HECHO (2026-06-22).** Modelos `Convocatoria` + `ConvocatoriaCupo` migrados (additivo, `db push`). Reutiliza `Jugador.posicion` (Drive/Revés/Ambas) — NO se agregó campo nuevo (ya existía). `ConvocatoriaCupo.posicion` opcional para capturar lado en el evento/no-registrados. Router `routes/convocatorias.js` montado en `/api/convocatorias`: `POST /` (crear, admin), `GET /` (listar con conteo voy/espera, admin), `GET /:id` (detalle con anotados), `POST /:id/voy` (sumarse, cupo o espera, bajo `runSerializable`), `POST /:id/baja` (bajarse + promueve primero en espera), `PATCH /:id/estado` (admin). Cupo/espera/promote probados e2e. De paso se limpió un drift de DB (columna muerta `requiereAprobManual` en jugadores, sin uso → dropeada con OK de Luca).
- **Bloque 2 — Canal + descubrimiento:** EN CURSO. Link público de descubrimiento + mensaje WhatsApp + notif in-app por categoría + botón "Convocar" desde WIarky.
  - **DECISIÓN (Luca, 2026-06-22): anotarse REQUIERE login (jugador registrado).** El link público es para **descubrir/ver** la convocatoria (cualquiera la abre); para anotarse hay que iniciar sesión o registrarse. Motivo: el "Voy" anónimo por nombre libre = sin accountability → truchos, no-shows, quilombo en la cancha. Login da identidad real + permite trackear no-shows, y **cada convocatoria crece la base de jugadores registrados** (el objetivo del módulo). El admin puede agregar invitados a mano (él responde por ellos). El anónimo se descarta. Alinea con Playtomic/MATCHi (unirse con cuenta).
- **Bloque 3 — Cierre del loop:** **3a HECHO (2026-06-22)** — la convocatoria reserva las canchas. DECISIÓN (Luca): son **reservas normales a nombre del organizador (jugador registrado)**, mismas reglas (Serializable, anti-doble-booking), **sin tipo nuevo**; un Super 8 = 2 canchas. `lib/convocatorias.js`: `organizarConvocatoria` (reserva N canchas + crea convocatoria, atómico, 409 si no hay libres) + `cancelarConvocatoria` (libera). `Reserva.convocatoriaId` linkea. WIarky `crear_convocatoria` pide organizador (si no registrado → crear_jugador primero) + reserva + mensaje WhatsApp con link + notif categoría. **3b PENDIENTE:** generar fixture (`lib/eventos.js`, balanceo drive/revés vía `Jugador.posicion`) al llenarse.
- **Bloque 4 — UI admin:** PENDIENTE.
- **Bloque 5 — QA + pulido:** PENDIENTE.

> Decisión de modelo: cupos = jugadores individuales. **`lado` de juego → se reusa `Jugador.posicion`** (valores `Drive`/`Revés`/`Ambas`, ya en registro Step2Perfil). El balanceo de parejas por lado (drive+revés, `Ambas`=comodín) va en el Bloque 3 (motor de fixture). Regla de pádel de Luca: el zurdo siempre juega drive → es guía de UI, no campo aparte (existe `Jugador.mano` Diestro/Zurdo si se quiere inferir a futuro).
**Resumen:** Convertir PadelwIArk de "software de gestión del dueño" en la **red de jugadores del club**. El admin (ayudado por el insight de IA que detecta franjas muertas) **convoca** un Americano/Super 8 para ciertas categorías; los jugadores registrados se suman ("Voy"); al llenarse, se genera el fixture (motor `/eventos` que ya existe) y se reservan las canchas. Después, una capa de **matching jugador→jugador**.

Es el **loop social del pádel** (el moat de Playtomic/MATCHi). Investigación del bibliotecario en `project/claude/agentes/bibliotecario/` (hallazgos.md + oportunidades.md).

---

## Decisiones tomadas (con Luca)

1. **Esto NO es la herramienta `/eventos`.** `/eventos` (pública, sin login, client-side) es el **motor de fixture+ranking**. Este módulo es la capa de **convocatoria + RSVP + matching** (backend, jugadores registrados) que **alimenta** a `/eventos` cuando se llenan los cupos.
2. **Se construye por fases, secuenciadas por liquidez.** Fase A (admin) primero porque funciona sin masa crítica. Fase B (jugador→jugador) después, solo cuando hay densidad de jugadores.
3. **El canal de aviso es el factor de éxito, no el fixture.** Notif in-app sola = fill-rate pobre. El desbloqueo en AR es **WhatsApp**. → MVP sin construir canal: el asistente IA arma un **mensaje pre-hecho que el admin pega al grupo de WhatsApp del club**, con un **link público de "Voy"**. Des-riesga la dependencia de notificaciones.
4. **`Jugador.categoria` alcanza para Fase A** (admin convoca a 6ta/7ma). Para Fase B: convocar a **categoría ±1** para no matar el match por falta de gente.

## Diferenciador
Las apps sueltas (Americano Padel Manager, PadelMix) hacen **fixture suelto**. PadelwIArk cierra el loop completo en un solo sistema:
**IA detecta hora muerta → convocar → llenar cupos → agendar cancha → fixture → resultado → stats del jugador.** Ninguna app suelta lo tiene.

## Patrón de referencia (Playtomic / MATCHi, verificado)
crear con rango de nivel → descubrir por lista filtrada → unirse → **organizador aprueba** → **pago confirma cupo** → **deadline con auto-cancelación/reembolso** si no llena. El pago es ancla anti-no-show; el deadline evita convocatorias zombi.

---

## Lo que ya tenemos (reutilizable)
- `Jugador.categoria` (String?) — targeting por categoría.
- `Notificacion` (tipo + data JSON + leida, in-app) — la convocatoria es un `tipo` nuevo con `data` (convocatoriaId, categoría, horario, acción "Voy").
- Módulo Torneos: categorías, cupos por categoría, parejas, inscripción, modelo `Cargo` (para ancla de compromiso futura).
- `/eventos`: motor `lib/eventos.js` (fixture Americano/Super 8 + ranking + validadores). La convocatoria llena → genera fixture acá.
- Reservas con Serializable (anti doble-booking) — para agendar las canchas al confirmarse.
- Data de no-shows: auto-liberación de ausencias de turnos fijos (para reputación/compromiso).
- El primitivo "notificar a jugadores de categoría X" ya estaba pedido por Torneos ([[project_torneos_notif_futuro]]) → **construirlo una vez, sirve para torneos Y convocatorias.**

---

## FASE A — Convocatoria del admin (alto valor, funciona día 1, cierra el loop de IA)

**Disparador:** botón en la tarjeta del insight de IA del dashboard admin ("Convocar Americano 6ta/7ma, martes 20:00") + alta manual.

**Flujo:**
1. Admin crea `Convocatoria`: modalidad (americano/super8), categorías objetivo (multi), día/horario (franja de 1.5h), canchas, cupos, **deadline**, y **comportamiento si no llena** (auto-cancelar+avisar / "se juega con los que hay").
2. Sistema:
   - Genera **mensaje de WhatsApp pre-hecho** (texto + **link público de "Voy"**) para que el admin lo pegue al grupo. ← MVP del canal.
   - Crea notif in-app `convocatoria_abierta` a los jugadores registrados de las categorías objetivo.
3. Jugador se suma con **"Voy"** (desde el link público o in-app). Se trackean cupos en vivo + **lista de espera** al superar el cupo.
4. **Deadline:** si llena → estado `confirmada`; si no → según política (cancela+avisa o juega con los anotados).
5. Al confirmarse: **genera el fixture** con `lib/eventos.js` y **reserva las canchas** (Serializable).
6. Post-evento: resultados → stats del jugador (futuro, engancha con el módulo de stats).

**Modelo nuevo (lite):** `Convocatoria { id, clubId, modalidad, categorias[], fecha, horaInicio, canchas, cupoMax, deadline, politicaNoLlena, estado(open|confirmada|cancelada|jugada), fixture Json?, createdBy }` + `ConvocatoriaCupo { id, convocatoriaId, jugadorId, estado(voy|espera|baja), createdAt }` (o equivalente).

**Ancla de compromiso (sin MercadoPago todavía):** estado "confirmado" + registro de no-shows. A futuro, `Cargo` (como torneos) para cobrar seña.

## FASE B — Matching jugador→jugador (capa viral) — idea de Luca 2026-06-22
- **El jugador organiza su propio Americano/Super 8 sin depender del admin.** Sección dedicada **"Eventos" en el sidebar del jugador** (organizar + mis eventos + descubrir abiertos). Hoy "Mis eventos" vive en el resumen del dash; la sección dedicada es el hogar de Fase B.
- **GUARDRAIL CLAVE (Luca): solo se puede organizar si hay disponibilidad real** — ej. un Super 8 necesita dos canchas a la misma hora. Se valida con `gatherDisponibilidad` antes de dejar crear. Ata la creación a la realidad de las canchas.
- **Reusa toda la maquinaria de Fase A** (modelo, RSVP, fixture). Solo cambia el creador (jugador) y el descubrimiento. → **Construir DESPUÉS del Bloque 3** (cierre del loop), porque la reserva-de-canchas-al-confirmar es la misma; hacer Fase B antes duplicaría esa lógica.
- **Responsabilidad / canchas:** las canchas se reservan **recién al llenarse** (no al abrir el evento), y el **organizador queda responsable** (a su nombre, como una reserva). Evita que un jugador bloquee canchas porque sí. Anti-abuso: límite de eventos activos por jugador, etc.
- **Matching por categoría ±1** para no matar el match por falta de gente. **Liquidez:** Fase B normalmente la necesita, pero el caso de Luca la resuelve — el organizador trae su grupo por el link de WhatsApp.
- **No lanzar con la base vacía** como descubrimiento masivo; pero el "organizá con tu grupo" funciona aun con red chica.

---

## Dependencias y riesgos
- **Canal:** WhatsApp real (push/API) es el desbloqueo a futuro; el MVP de "mensaje para pegar" lo evita por ahora. Ver [[project_whatsapp_notif]].
- **Liquidez:** Fase A no la necesita (admin empuja); Fase B sí. No invertir en B antes de tiempo.
- **Scope:** módulo de varias sesiones. Construir Fase A entera antes de tocar B.
- **No duplicar Torneos:** una convocatoria es un "torneo express" lite; compartir el primitivo de notificación por categoría, no re-implementarlo.

## Métrica de éxito
Fase A se mide por **fill-rate de convocatorias** (cuántas se llenan), no por "está construida". Atar al canal.

Relacionado: [[project_super8_americano]] [[project_insight_dia_ia]] [[project_torneos_notif_futuro]] [[project_whatsapp_notif]] [[project_agente_bibliotecario]].
