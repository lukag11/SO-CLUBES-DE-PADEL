# Plan de bloque — Convocatorias / Matching (Americano y Super 8)

**Estado:** PLANIFICADO (no construido). Creado 2026-06-21.
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

## FASE B — Matching jugador→jugador (capa viral, necesita densidad)
- En el dash jugador: "Armar / Buscar partido" → abrir Americano/Super 8 de su categoría (**±1**), invitar/alertar a perfiles compatibles, otros se suman.
- Reusa todo lo de Fase A (modelo, RSVP, fixture). Cambia el creador (jugador) y el descubrimiento (lista de partidas abiertas filtrada por categoría/horario).
- **No lanzar con la base vacía** — quema la feature. Activar cuando los clubes tengan densidad demostrada.

---

## Dependencias y riesgos
- **Canal:** WhatsApp real (push/API) es el desbloqueo a futuro; el MVP de "mensaje para pegar" lo evita por ahora. Ver [[project_whatsapp_notif]].
- **Liquidez:** Fase A no la necesita (admin empuja); Fase B sí. No invertir en B antes de tiempo.
- **Scope:** módulo de varias sesiones. Construir Fase A entera antes de tocar B.
- **No duplicar Torneos:** una convocatoria es un "torneo express" lite; compartir el primitivo de notificación por categoría, no re-implementarlo.

## Métrica de éxito
Fase A se mide por **fill-rate de convocatorias** (cuántas se llenan), no por "está construida". Atar al canal.

Relacionado: [[project_super8_americano]] [[project_insight_dia_ia]] [[project_torneos_notif_futuro]] [[project_whatsapp_notif]] [[project_agente_bibliotecario]].
