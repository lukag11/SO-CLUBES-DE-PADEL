# Oportunidades — huecos e ideas accionables

> Lo que Luca no está viendo. El agente prioriza por impacto vs esfuerzo y ata cada ítem a una fuente/razón.
> Formato: idea · por qué (hueco de mercado / necesidad real) · impacto · esfuerzo · fuente · estado (nueva / en evaluación / descartada / en roadmap).

<!-- Oportunidades acá, ordenadas por impacto. -->

---

## 2026-06-27 · Feed público "Partidos" en la landing del club — SÍ, pero con el motor en el LINK, no en el feed

**Impacto:** alto (captación + reúso de infra existente) · **Esfuerzo:** medio (el embudo ya existe; falta feed + sección + navbar) · **Estado:** nueva, recomendada.

**Veredicto:** construir la cara pública de Partidos vale la pena, PERO con una corrección de premisa: el motor de adquisición NO es el feed público (los líderes ni lo exponen a anónimos — está detrás de login). El motor real es el **link compartible 1-a-1 por WhatsApp + push a la categoría**, que ya tenés. El feed público es el complemento de descubrimiento/marca ("algo que venda"), no el que llena los partidos. Fuente: hallazgos 2026-06-27.

### (a) Sección en la landing del club — layout + copy
- Banner gemelo al de Convocatorias (banda con CTA), idealmente UNIFICADO en un solo bloque "Jugá hoy en [Club]" que mezcle partidos abiertos + Americano/Super 8 → **así el feed nunca está vacío** (mitiga cold-start).
- Copy del banner (rioplatense, vendedor): titular **"¿Te falta un cuarto? Sumate a un partido abierto"** · sub **"Jugadores de tu categoría buscan completar partido esta semana. Entrá, decí «¡Voy!» y a la cancha."** · CTA primario **"Ver partidos abiertos"** · CTA secundario **"Armá el tuyo"**.
- Si hay partidos: mostrar 2-3 cards preview (cupos X/4, categoría, día/hora) + "ver todos". Si NO hay: NO mostrar vacío frío → mostrar el CTA "Armá tu partido y que se sumen" como estado primario + dato de demanda latente si existe ("8 de 4ta buscando partido").

### (b) Página pública "Partidos" (navbar `/partidos`) — layout + conversión anónimo→registrado
- Agregar ítem al `PublicNavbar` (hoy falta): "Partidos" junto a "Americano y Super 8". Mismo patrón visual.
- Feed = grid de cards. Cada card (vista ANÓNIMA, privacidad): **categoría + día/hora + cancha/club + cupos "2/4"** + barra de cupos + badge "Abierto". **NO nombres completos** de jugadores a anónimos (privacidad / Habeas Data AR) — sólo "Organiza: Juan P." o avatares.
- Filtros simples: categoría, día. No más (evitar sensación de vacío por sobre-filtrado).
- Conversión: card → lobby público `/partido/:id` (ya existe) → botón "¡Voy!" → si anónimo, login-con-retorno (patrón ya hecho en Convocatorias) → vuelve y queda anotado, pendiente de aprobación del organizador.
- **Botón "Compartir por WhatsApp" prominente en cada partido** (el embudo que realmente convierte según Playtomic/MATCHi): texto pre-armado "Falta uno para el sábado 20hs en [Club], 4ta. Entrá: [link]". Esto trae gente de afuera con intención.

### Qué NOS FALTA (gap concreto)
1. Ítem "Partidos" en `PublicNavbar.jsx`.
2. Página/feed público `/partidos` (componente nuevo, reusa estética de `EventosPage.jsx`).
3. Sección/banner en `LandingSections.jsx` (idealmente fusionar con el de convocatorias en "Jugá hoy").
4. Endpoint público que liste partidos abiertos del club SIN PII (sólo categoría/hora/cupos).
5. Botón "Compartir por WhatsApp" con texto pre-armado en el lobby `/partido/:id`.
6. Empty-state diseñado (NO feed vacío frío).

### Puntos ciegos / advertencias
- **COLD-START es el riesgo #1.** Un club chico arranca con feed vacío. Los líderes lo esquivan con masa multi-club; vos no la tenés. Mitigá: feed unificado partidos+convocatorias, empty-state con CTA "armá el tuyo", y NO prometas en marketing un feed lleno que no vas a tener el día 1.
- **El feed NO es el motor.** Si Luca espera que el feed público por sí solo llene partidos, se va a frustrar. El motor es link+push (ya lo tenés). Vender el feed como "descubrimiento + marca", no como adquisición principal.
- **Privacidad:** auditar que `PartidoPublicoPage` no muestre nombres/teléfonos completos a anónimos.
- Fuente: hallazgos.md 2026-06-27 (Playtomic, MATCHi, PadelBridge, PadelOS).

---

## 2026-06-24 (quad) · Matching need-driven — VEREDICTO: construir CASO 2 ("falta un cuarto YA") YA. Caso 1 reciclado como puerta a convocatorias.

> CORRIGE el veredicto anterior (tablón pasivo). La afinada de Luca = 2 casos de uso need-driven + push, NO un tablón. El caso 2 esquiva la liquidez que hundía al tablón. WebSearch/WebFetch denegados este turno; me apoyo en Open Match Playtomic/MATCHi ya verificado (2026-06-21) + análisis de mecánica de liquidez (marcado inferencia).

**Caso 1** — botón landing "¿no sabés con quién jugar?" → login → armar partido con jugadores de tu categoría. Captación + matching.
**Caso 2** (el fuerte) — se te baja un jugador → necesitás un CUARTO YA → dispara notificación a la categoría → el primero que dice "voy" entra.

### Cómo lo hacen los grandes [Verificado]
"Completar el partido / buscar el que falta" ES la función estrella de Open Match (Playtomic) y Public Match (MATCHi), no un accesorio. MATCHi nace literal del caso 2: "reservaste y te faltan jugadores → hacés pública la reserva". Canal = PUSH a jugadores que encajan por NIVEL/rango. Organizador aprueba. Pago confirma. Fuente: matchiplayers.zendesk.com, playerhelp.playtomic.com. Las plataformas serias eligieron EMPUJE (push), no feed pasivo.

### Need-driven + push vs tablón pasivo — por qué cambia la liquidez
- [Verificado] Los serios usan push, no feed pasivo.
- [Inferencia sólida] Tablón pasivo falla en base chica porque multiplica dos probabilidades bajas: que HAYA publicaciones × que la gente ENTRE a mirarlas. La notif de urgencia elimina el segundo factor (llega sin que entren) y agrega disparador emocional (escasez+urgencia+bajo compromiso).
- **ARGUMENTO CLAVE (la diferencia real de liquidez):** un tablón necesita densidad de gente BUSCANDO al mismo tiempo (necesitás 3 buscadores). El caso 2 necesita densidad de gente DISPONIBLE para responder (necesitás 1 que diga "voy"). Con 15 en una categoría, que UNO esté libre esta noche es muy probable; que TRES busquen partido en el tablón ahora, improbable. Por eso el caso 2 SÍ funciona en base chica y el tablón no. [Inferencia, mecánica sólida — no dato duro de tasa de respuesta]

### Apps específicas del "completar un 4to"
[Verificado] Vive dentro de Open Match, no como app aparte dominante. [Probable] En AR hoy lo resuelve el grupo de WhatsApp ("falta uno para hoy 20, ¿alguien?") = el caso 2 hecho a mano. Que ya exista como comportamiento manual es la mejor prueba de que es real. Ancla anti-no-show: grandes = pago; amateur = compromiso social + registrar no-shows (data de ausencias ya existe).

### Versión mínima del caso 2 con lo que YA hay (casi gratis)
Infra del canal YA existe (notif por categoría tipo convocatoria_abierta, categorías, reservas, mensaje WhatsApp pre-hecho). Caso 2 = reusar convocatoria apuntada a una reserva existente, cupo 1:
1. Botón "Se me bajó un jugador" en tu turno confirmado.
2. Mini-convocatoria cupo 1 atada a esa reserva (día/hora/cancha ya definidos — nada que armar), categoría ± 1.
3. Notif a la categoría (in-app existente + mensaje WhatsApp para pegar al grupo).
4. Primero que dice "voy" entra. Cierra solo. Deadline = hora del turno.
Nuevo mínimo: atar convocatoria a reserva existente + tipo "cupo 1 urgente". Mucho menos que el tablón, aporta más.

### VEREDICTO
- **Caso 2: construir YA.** Construible con valor real en club chico. Es el problema más frecuente/doloroso del amateur (ya se resuelve a mano). Esquiva liquidez (pide 1 disponible, no 3 buscadores). Casi gratis (reusa infra). Need-driven → nunca se ve vacío (no existe hasta que se necesita) → no hay pantalla triste que quemar. MEJOR relación valor/esfuerzo de todo el matching visto.
- **Caso 1: después, RECICLADO.** Más cercano al tablón (sin urgencia, sin turno armado, depende de coincidencia). PERO el gancho de captación vale: el botón landing, en vez de abrir buscador vacío, MUESTRA las convocatorias abiertas de tu categoría (ya existen) o deja CREAR una. Captación que desemboca en contenido existente, sin riesgo de liquidez. No construir buscador nuevo.

Impacto caso 2: alto. Esfuerzo: bajo (reusa convocatoria/notif/WhatsApp). Estado: caso 2 recomendado YA; caso 1 reciclado a futuro. Fuentes: hallazgos 2026-06-21 (Open matches/matching) + matchiplayers.zendesk.com, playerhelp.playtomic.com.

---

## 2026-06-24 (tri) · Matching jugador↔jugador — VEREDICTO: (a) tablón con disparo WhatsApp, pero PRIMERO exprimir (d) convocatorias y medir fill-rate

> NOTA: WebSearch/WebFetch denegados este turno. Este eje ya fue investigado a fondo el 2026-06-21 (Open Matches Playtomic, Public Matches MATCHi, niveles, cold-start, diseño Fase B). Esta entrada consolida ese material para la pregunta específica de matching j↔j. Sin refresh 2026-06-24, pero el patrón Open Match no cambió en lo sustancial.

**Opciones evaluadas:** (a) tablón "busco para jugar"; (b) perfiles públicos + buscar jugadores; (c) sugerencias automáticas de compañero; (d) no construir aún, exprimir convocatorias.

**Veredicto: (a) como destino, pero la secuencia correcta es (d) → (a). NO lanzar (b) ni (c) en clubes nuevos.**

### Cómo lo hacen los grandes [Verificado, 2026-06-21]
Playtomic y MATCHi = mismo patrón de 5 pasos: (1) un jugador/club publica partido con RANGO DE NIVEL y cupos, (2) descubrimiento por lista filtrada (nivel/hora/lugar), (3) join con declaración de nivel + APROBACIÓN del organizador (MATCHi: control total; Playtomic: rechazo si no encaja), (4) PAGO = confirmación (corazón anti-no-show), (5) DEADLINE + auto-cancelación 1h antes + reembolso. Fuente: playtomic.com, playerhelp.playtomic.com, matchiplayers.zendesk.com. Es el NÚCLEO de Playtomic como red social — pero funciona por su MASA NACIONAL.

### El nivel [Verificado]
Match por rango. Playtomic: ELO 0–7 fino que sube/baja por resultado, ajuste -0.25/+0.75. Sí muestran "no encajás". Ese ajuste fino NECESITA MASA. La `categoria` de PadelwIArk (1ra–8va) es etiqueta gruesa: suficiente para "juntá 6ta+7ma", mejor para club chico (menos fricción). Matching por categoría ± 1 para no morir por falta de gente exacta.

### Contexto AR / apps chicas [Verificado/Probable]
El matching real en clubes de a pie pasa por GRUPOS DE WHATSAPP (tablón humano: "busco un cuarto mañana 20hs, 6ta"). No hace falta ELO; hace falta DIGITALIZAR ese tablón y empujarlo por el canal que ya usan. Fuente: padelmix.app, contexto AR.

### Liquidez — el problema central, honesto [Verificado]
Huevo y gallina de marketplace 2 lados: matching vacío QUEMA la feature. Playtomic tardó AÑOS construyendo oferta. Fuente: medium.com/@oleg2014. PERO PadelwIArk no es marketplace nacional: liquidez POR CLUB, ya sembrada (base de socios). El problema real: "¿hay suficientes jugadores ACTIVOS buscando en ESE club AHORA?" — en club nuevo chico, suele ser NO.

### Por qué (a) y no (b)/(c)
- (b) perfiles públicos + buscador y (c) sugerencias automáticas son las que MÁS sufren la liquidez: con 8 jugadores se ven vacías → queman la feature en club nuevo. NO ahora.
- (a) tablón = menor masa crítica necesaria: con UN jugador que publica ya hay contenido. Mismo patrón del WhatsApp que ya funciona, digitalizado. Es el camino correcto.
- PERO el tablón TAMBIÉN muere si nadie ve la publicación. El cuello NO es el matching, es el CANAL DE AVISO. Tablón in-app = pasivo. En AR el desbloqueo es WhatsApp: publicar "busco cuarto" debe DISPARAR mensaje al grupo/categoría.

### Por qué (d) PRIMERO
Las convocatorias jugador→jugador que ya existen YA SON matching j↔j (estructurado alrededor de un evento). Antes de construir tablón nuevo: MEDIR EL FILL-RATE de las convocatorias actuales. Si NO llenan → problema es canal/densidad → un tablón nuevo fracasa igual. Si SÍ llenan → liquidez validada en ese club → el tablón suma como formato MÁS LIVIANO (no quiero organizar evento entero, solo busco un cuarto suelto).

### Versión mínima de (a), cuando se construya
1. Publicar "busco para jugar": día/franja + categoría ± 1 + cuántos faltan. Reusar modelo Convocatoria con tipo "partido casual" (sin fixture).
2. El que publica APRUEBA quién entra (control del organizador, MATCHi).
3. Disparo por WhatsApp (mensaje pre-armado copy-paste al inicio). Sin esto, pasivo → no llena.
4. Deadline + se cae solo si no completa.

### Riesgo de liquidez, sin maquillar
En club nuevo (5–15 activos), CUALQUIER matching j↔j puede verse vacío al inicio. Mitigación = SECUENCIA, no técnica: que el club gane densidad con convocatorias empujadas por el admin (anti-cold-start), y prender el tablón cuando ese club ya demuestre actividad. NO lanzarlo como feature destacada del onboarding de un club nuevo — sería prometer algo que se ve vacío.

Impacto: alto si hay densidad / negativo si se lanza vacío. Esfuerzo: medio (reusa modelo Convocatoria). Estado: nueva — recomendada DESPUÉS de medir fill-rate de convocatorias. Fuentes: ver hallazgos 2026-06-21 (Open matches / matching).

---

## 2026-06-24 (bis) · Persistencia/historial de Americano/Super 8 — VEREDICTO: opción (b), historial liviano del evento, SIN tocar stats serias

**Pregunta:** ¿guardar estas estadísticas? (a) no persistir, el evento muere ahí; (b) historial liviano del evento consultable, SIN tocar rating/stats; (c) alimentar el módulo de stats del jugador (winRate, comparativa, ascenso).

**Veredicto: (b), con puente OPCIONAL a una métrica de actividad (no de habilidad) si más adelante se quiere algo de (c).**

**El dato del mercado que decide:** Playtomic —el referente serio que SÍ persiste historial— igual SEPARA lo social de lo competitivo: los partidos "friendly" se guardan pero NO mueven el rating; solo los "competitive" lo hacen. El que más data acumula, igual aísla lo social a propósito. Fuente: helpmanager.playtomic.com (Friendly vs Competitive; Levels & Algorithm). Las apps de Americano dedicadas, en cambio, tienden a NO persistir récord por jugador (evento efímero, muchas sin login). Fuente: americano-padel.app, padel-bracket.com. [Verificado el patrón Playtomic; la no-persistencia de las apps de Americano es Probable, no confirmada fresca]

**Por qué (b) y NO (c) — el riesgo caro = contaminación de stats:**
- El módulo de stats de PadelwIArk es SERIO: winRate, comparativa de club, logros y **sugerencia de ascenso de categoría** (el admin asciende jugadores desde ahí). Tiene CONSECUENCIA. Fuente: memoria project_stats_jugador.
- Un Americano social (parejas rotativas, score a puntos, categorías mezcladas, clima recreativo) metido en ese winRate ENSUCIA la métrica que define ascensos. Un jugador infla o hunde su winRate "serio" en una tarde social. Es exactamente lo que Playtomic evita.
- Además NO encaja técnicamente: el módulo está modelado sobre `Pareja` (jugador1/jugador2 strings, torneos); el Americano es individual con compañero rotativo. Forzarlo es deuda técnica + conceptual.

**Por qué NO (a):** ya se construyó carga + ranking en vivo. No persistir el snapshot final tira ese trabajo apenas termina el evento. Guardar el cierre es casi gratis (el estado ya vive como JSON, mismo patrón que torneos/draws) y le da continuidad al jugador.

**Forma concreta de (b) — bajo esfuerzo:**
1. Persistir el **snapshot final del evento** (JSON, igual que torneos/draws): fecha, club, jugadores, fixture, ranking final.
2. En el perfil del jugador, **sección "Eventos sociales" SEPARADA** de las stats de torneos: "Americanos/Super 8 jugados", posición promedio, último evento. Métricas BLANDAS y propias.
3. **Regla dura:** NUNCA alimenta winRate, comparativa de club ni sugerencia de ascenso. Esos quedan exclusivos de torneos. Separación tipo Playtomic friendly/competitive.

**Puente OPCIONAL a (c), solo a futuro:** un contador de "partidos/eventos sociales jugados" como métrica de ACTIVIDAD/FIDELIDAD (no de habilidad) es legítimo y no contamina nada. Un rating/nivel derivado del social: NO — otro producto, solo con masa de eventos recurrentes.

Impacto: medio (engagement + continuidad del jugador, cierra el loop). Esfuerzo: bajo (snapshot JSON ya disponible + sección de perfil read-only). Riesgo si se hace (c) en su lugar: alto (contamina la métrica de ascensos). Estado: nueva, recomendada (b).

---

## 2026-06-24 · Carga de resultados Americano/Super 8 — VEREDICTO: opción (b), carga mínima orientada a "ranking en vivo", NO a stats

**Pregunta:** ¿construir carga de resultados + ranking final? Opciones: (a) no construir, ranking en vivo se hace en la cancha con `/eventos` y muere ahí; (b) carga mínima opcional; (c) completo atado a stats del jugador.

**Veredicto: (b), con un encuadre que cambia todo — el entregable NO es "resultado final/historial", es "RANKING EN VIVO durante el evento".** El error de framing de Luca es pensar el resultado como archivo ("se carga, se guarda, alguien lo mira después"). El mercado dice lo contrario: **el valor del score es en tiempo real, proyectado en pantalla mientras se juega.** Nadie carga para el historial; cargan para ver la tabla moverse. Fuente: americano-padel.app ("Leaderboard on the big screen, members love it"), padel-americano.app, padelcounter.com. Ver hallazgos 2026-06-24.

**Por qué NO (a):** dejar que el ranking en vivo se haga "en la cancha y muera ahí" desaprovecha que el motor `/eventos` y el fixture ya están construidos. Si ya armás el fixture en PadelwIArk, no cargar el score corta el loop justo antes de la parte que la gente disfruta. (a) es tirar el 80% del trabajo por miedo al 20%.

**Por qué NO (c) todavía:** atar a stats/rating del jugador es el modelo Playtomic, y eso solo se justifica con partidos "competitivos" recurrentes + masa (Playtomic mismo NO mueve el nivel en friendlies). Un Americano social de una tarde no alimenta un rating creíble; el ascenso de categoría en AR lo define la federación/torneos, no un social. Construir (c) ahora es over-engineering: validación cruzada, anti-fraude, modelo de rating. Guardarlo para cuando haya volumen real de eventos por club. [Probable, sólido]

**La versión mínima de alto valor / bajo esfuerzo (lo que SÍ construir):**
1. **Una pantalla de carga simple operada por UNA persona** (el admin/profe organizador, o quien tenga el link). NO cada jugador. El estándar del rubro es "scoreboard duty": un teléfono carga, no se reparte la fricción. Fuente: simplepadel.com, americano-padel.app.
2. **Carga por ronda, ultrarrápida:** tras cada ronda, tipear el marcador de cada partido (ej. 24-18 / 10-14). Tiles grandes, navegación por ronda. El motor `/eventos` ya calcula el ranking individual acumulado — solo hay que alimentarlo con los marcadores y persistir el estado del evento (mismo patrón JSON que torneos/draws). Esfuerzo: BAJO-MEDIO, el motor de ranking ya existe.
3. **Vista pública de ranking en vivo (link compartible) para proyectar en la TV del club o abrir en el cel.** ESTO es el atractivo, no la carga. Reusa el patrón de página pública que ya tienen los torneos. Es lo que hace que el organizador quiera cargar. Esfuerzo: BAJO (vista read-only del estado del evento).
4. **Que sea OPCIONAL y sin fricción de salida:** si nadie carga, el evento igual sirvió (se armó el fixture, se jugó). No bloquear nada por resultado faltante. El resultado es un "nice to have" del momento, no un requisito del flujo.

**Lo que NO hacer en esta versión:** validación cruzada entre jugadores, anti-fraude, atado a stats del perfil, rating/ELO, historial consultable como sección. Todo eso es (c) y es otro proyecto. [Verificado que Playtomic lo hace solo porque su producto es el rating; no es el caso acá]

**Resumen para decidir:** SÍ construir, pero re-encuadrado: el feature se llama "ranking en vivo del evento", no "carga de resultados". Carga = 1 persona, rápida, por ronda. Premio = tabla en vivo en la TV. Opcional, no rompe nada si no se usa. Atarlo a stats del jugador: NO ahora. Impacto: medio-alto (cierra el loop social + momento "members love it"). Esfuerzo: bajo-medio (motor de ranking ya existe, falta UI de carga + vista pública en vivo). Estado: nueva, recomendada.

---

## 2026-06-21 · Módulo Convocatorias / Matching — diseño Fase A y Fase B (cruce con referentes)

Cruzado contra Playtomic Open Matches, MATCHi Public Matches y el código actual (`Jugador.categoria`, `Notificacion` JSON in-app, módulo Torneos, herramienta `/eventos`).

### Fase A — convocatoria del admin (PRIORIZAR, es el anti-cold-start)
**Por qué primero:** PadelwIArk no es marketplace nacional, es software del club → la liquidez ya está (base de socios cargada). El empuje del admin sobre su propia base es exactamente la jugada que evita el problema de masa crítica que a Playtomic le costó años. Fuente: medium.com/@oleg2014 (cold-start), helpmanager.playtomic.com (Open Play Programs los crea el club).

**Patrón a copiar de los referentes (flujo de 5 pasos):**
1. Creador abre cupos con **filtro de nivel** (acá: categorías destino, ej. 6ta+7ma) → ya tenemos `Jugador.categoria` para segmentar a quién avisar.
2. **Descubrimiento filtrado** (el jugador ve hora, cancha, categoría, cupos restantes).
3. Join con "Voy/OK" → al confirmar, decrementa cupo en vivo.
4. **Confirmación = compromiso.** Playtomic/MATCHi usan pago online como ancla anti-no-show. Sin MP integrado todavía, el ancla mínimo en PadelwIArk = **la deuda/cargo que ya generamos en torneos** (modelo `Cargo`) o al menos un estado "confirmado" visible. Fuente: playerhelp.playtomic.com.
5. **Deadline + auto-resolución si no se llena.** Playtomic auto-cancela 1h antes y reembolsa. Copiar el concepto: la convocatoria necesita **fecha/hora límite** y un comportamiento definido si no llena (auto-cancelar + avisar, o "se juega igual con los que hay"). NO dejarlo abierto sin cierre. Fuente: playerhelp.playtomic.com (Cancellation Policy).

**Punto ciego #1 (el más caro): el canal de aviso.** Hoy notif solo in-app. Una convocatoria que vive solo dentro de la app **NO se llena** — el jugador tiene que entrar a verla. Los referentes usan PUSH; en AR el desbloqueo real es **WhatsApp** (ya está en el roadmap, memoria `project_whatsapp_notif`). RECOMENDACIÓN: la Fase A no se mide por "está construida" sino por **fill-rate**, y el fill-rate depende del canal. Construir el motor de convocatoria es inútil si el aviso es pasivo. Atar Fase A al desbloqueo de WhatsApp (o push) o, como mínimo, generar un **mensaje pre-armado que el admin copia/pega al grupo de WhatsApp del club** (mecánico, cero infra, fill-rate inmediato). Fuente: matchiplayers.zendesk.com, padelmix.app.

**Punto ciego #2: el "Voy" sin compromiso se cae.** Sin ancla (pago/deuda), la gente dice "voy" y no aparece. Mitigar con: deadline visible, lista de espera automática (sobra gente → entra el siguiente), y registrar no-shows del jugador (ya hay auto-liberación de ausencias → hay data). Fuente: playerhelp.playtomic.com (no-show / cancellation).

**Reusar del código:** segmentación por `categoria`; `Notificacion` JSON (tipo `convocatoria`); motor `/eventos` (fixture+ranking) para cuando la convocatoria llena → genera el Americano; `autoScheduleGroups` para canchas/horarios; modelo `Cargo` como ancla de compromiso opcional. **Nuevo:** entidad Convocatoria (categorías destino, cupos, deadline, estado abierta→llena→cancelada→jugada), lista de "voy" individual, lista de espera.

### Fase B — matching jugador→jugador (DESPUÉS, depende de densidad)
- Solo prende cuando el club ya tiene jugadores activos generando partidos. Fuente: cold-start (medium.com/@oleg2014).
- Copiar de MATCHi el control del organizador: el jugador que arma el partido **aprueba/rechaza** quién entra (no entrada automática). Evita que se cuele alguien de nivel/conducta no deseada. Fuente: matchiplayers.zendesk.com.
- **Matching por categoría ± 1**: como nuestra `categoria` es etiqueta gruesa (no ELO fino tipo Playtomic), filtrar exacto mata el match por falta de gente. Permitir convocar a categoría propia y adyacentes. Fuente: comparación niveles (hallazgos 2026-06-21).
- Riesgo: sin masa, Fase B se ve vacía y quema la feature. No lanzarla hasta que un club tipo tenga actividad demostrada en Fase A.

### Diferenciador vs apps de Americano sueltas
Americano Padel Manager / PadelMix / Padel AI hacen fixture+scoring pero **no están integradas a las canchas ni a la base de jugadores del club**. PadelwIArk convoca → llena → agenda cancha → genera fixture → carga resultado → suma a stats del jugador, todo en un sistema. Ese loop cerrado es el diferenciador. Fuente: americano-padel.app, padelmix.app, padeliq.co.

**Recomendación de secuencia:** Fase A atada al canal WhatsApp (aunque sea copy-paste manual al inicio) + deadline + lista de espera. Recién con un club activo, Fase B. El motor `/eventos` ya resuelve el "qué pasa cuando llena". El cuello no es el fixture: es **avisar fuerte y cerrar el compromiso**.

---

## 2026-06-21 · Generador de Americano / Super 8 — diseño del feature (reglas verificadas)

Sección para que el club organice eventos sociales Americano/Super 8. Es un GANCHO de adquisición (social, baja fricción, mucha gente en el club a la vez) y un formato que las apps especializadas (americano-padel.app, americanopadel.app) tratan como producto entero. PadelwIArk lo puede tener integrado a su sistema de canchas/jugadores, que las apps sueltas no tienen.

**Decisión de diseño clave (no obvia):** NO modelar "Super 8" y "Americano" como dos formatos distintos. En AR/ES **Super 8 = Americano de 8 jugadores** (mismo motor, solo cambia el nº). El eje real a exponer es **rotación individual (parejas cambian cada ronda) vs parejas fijas (round-robin)**. "Super 8" puede ser un preset (8 jugadores, 2 canchas, 24 pts) que dispara el mismo motor. Fuente: woop.com.br ("no hay regla única"), feppadel.com.ar, padel.fyi. Impacto: evita duplicar lógica y confundir al usuario. Esfuerzo: cero (es una decisión).

**Setup de 3 campos (estándar del rubro):** el sistema solo necesita **nº de jugadores + nº de canchas + puntos por partido (16/24/32)** para generar todo. Copiar ese onboarding mínimo. Fuente: americano-padel.app. Impacto: alto (UX). Esfuerzo: bajo.

**Qué se automatiza (la propuesta de valor):**
1. **Armado de rondas** con algoritmo de rotación (round-robin social tipo Berger/whist) que maximiza compañeros y rivales distintos. NUEVO (el módulo torneos actual es parejas fijas → grupos, no rota individuos).
2. **Manejo de descansos (bye)** cuando no es múltiplo de 4: rota descansos equitativos y asigna al que descansa la **media de puntos de la ronda**. NUEVO. Fuente: americano-padel.app.
3. **Ranking individual en tiempo real**: al cargar el marcador de cada partido (ej. 10-14), suma puntos a cada jugador; tabla de posiciones se reordena sola. NUEVO (hoy el standing es por pareja/sets). Desempates: total pts → diferencia → directo → punto de oro.
4. **Asignación a canchas/horarios**: **REUSAR `autoScheduleGroups(grupos, canchas, intervaloMin)`** del torneoService — ya coloca partidos en cancha/hora con anti-conflicto e intervalos. Esfuerzo: bajo (adaptar input).

**Qué reusar vs qué es nuevo (cruce con código):**
- REUSAR: scheduler de canchas/horarios (`autoScheduleGroups`), patrón "estado del evento como JSON", modelos `Torneo`/`Pareja` (parcial), lógica de desempates.
- NUEVO: inscripción INDIVIDUAL (no hay jugador-suelto en un evento hoy), algoritmo de emparejamiento por ronda, scoring por puntos con bye+media, tabla de ranking individual. **No hay modelo `Partido` ni `Grupo` en la DB** — definir cómo persistir (JSON del evento, como ya se hace con grupos/draws, es el camino de menor fricción).

**Pendiente de cerrar con Luca antes de construir:**
- ¿Versión pública sin login (gancho de landing, como dice la memoria) o dentro del dashboard admin? La sección social planeada es pública; el ranking en vivo y la carga de resultados piden algún control de quién carga (admin/profe).
- ¿Soportar también el "round-robin de parejas fijas" (8 duplas) desde el día 1, o solo rotación individual? Recomendación: arrancar con **rotación individual** (es el 80% del uso AR/ES y lo que no existe hoy); las parejas fijas se parecen más al módulo torneos ya hecho.
- Variantes a contemplar en el modelo desde el principio: **mixto** (restricción de género en parejas) y **rondas recortadas** (no jugar la rotación completa cuando hay muchos jugadores).

Impacto: alto (diferenciador + gancho social, formato muy pedido en clubes). Esfuerzo: medio (motor nuevo, pero scheduler reusable). Estado: nueva, lista para diseño. Fuentes: ver entrada de hallazgos 2026-06-21 "Reglas de Super 8 y Americano".

---

## 2026-06-21 · "Insight del día con IA" — stack de LLM recomendado (feature PREMIUM)

Materializa la oportunidad #10 del dashboard (forecast/alerta IA). Es la bandera "IA embebida" de la marca PadelwIArk hecha producto vendible.

**Decisión central:** a 50 clubes × 1 insight/día (~1,5M tokens/mes) el costo del LLM va de **$0,08/mes (Groq 8B) a $8/mes (Sonnet 4.6)** = como mucho $0,16/club/mes. **El precio NO decide.** Deciden: privacidad de data de clientes + calidad del español + no casarse con un provider.

1. **Provider para el MVP — modelo frontier CHICO, PAGO:** Gemini 2.5 Flash-Lite ($0,10/$0,40) o Claude Haiku 4.5 ($1/$5). Impacto: alto. Esfuerzo: bajo (1 prompt). Fuente: pricing oficiales + privacidad (ver hallazgos 2026-06-21).
   - **NO usar free tier de Gemini ni de Mistral**: ambos ENTRENAN con los inputs/outputs del free tier. Es data de clubes → inaceptable para algo que se vende. [Verificado] meetily.ai/llm-privacy/gemini, mistral.ai/pricing.
   - Groq free (Llama 8B) es el único free que NO entrena (zero-training por contrato) + 14.400 req/día. Sirve como fallback/ahorro, pero el 8B es flojo en tono → no como default de una feature paga.

2. **Capa de abstracción — SÍ, desde el día 1:** Vercel AI SDK (`ai`, nativo Node, cambia provider en 1 línea) u OpenRouter (1 endpoint, ~300 modelos). Impacto: alto (evita lock-in en feature que se cobra). Esfuerzo: bajo. Permite probar Flash-Lite vs Haiku vs Groq sin reescribir.

3. **Diseño del endpoint:** 1 llamada/día/club, cachear el insight 24h en DB (no re-pegar al LLM en cada carga del dashboard). El backend arma el resumen estructurado (no mandar data cruda ni PII innecesaria: agregados, no nombres de jugadores). Esto baja tokens, costo y exposición de datos. Impacto: medio-alto. Esfuerzo: bajo.

4. **Privacidad como argumento de venta:** todos los providers serios (Anthropic, OpenAI, Groq, Cloudflare, Together) NO entrenan con data de API. Luca puede poner en la landing premium "tu data no entrena modelos de terceros" — diferenciador real frente a quien use el free tier de Gemini sin saberlo.

**Parte futura (no ahora):** chat/voz embebido en PadelwIArk → chasis candidato = CopilotKit (copiloto dentro de la app React) o LibreChat (chat self-host multi-provider). Ninguno reemplaza al LLM, son la UI/orquestación. Irrelevantes para el insight diario.

---

## 2026-06-21 · Rediseño dashboard admin — widgets recomendados (priorizado)

Cruzado contra lo que PadelwIArk ya tiene (6 tarjetas estáticas + feed). Marcado [HIGIENE] = lo tiene todo el rubro, hay que tenerlo; [DIFERENCIADOR] = nos despega.

### Imprescindibles (alto impacto, esfuerzo bajo-medio) — datos que YA están en la DB

1. **Occupancy rate del día (%) con gauge/sparkline** [HIGIENE]. Hoy mostramos "3/6 ahora" (snapshot). Falta el % de ocupación del día = slots reservados / slots disponibles. Es EL KPI rey del rubro (target 50%+). Esfuerzo: bajo (la data de reservas+franjas ya está). Fuente: financialmodelslab.com, Doinsport, Cortclub.

2. **Bloque "Necesita tu atención"** [DIFERENCIADOR de UX]. Lista accionable: turnos fijos por aprobar, ausencias a liberar, impagos del día, deudas vencidas, torneos con cupo+deadline. Convierte el dashboard de reporte pasivo a centro de acción. Esfuerzo: bajo-medio (la data existe: cargos pendientes, turnos, deuda). Fuente: patrones UX SaaS (alertas/condicional formatting).

3. **Agenda/timeline del día (próximos turnos)** [HIGIENE]. Hoy el feed mira al pasado. Falta una línea de tiempo de los turnos que vienen HOY (hora, cancha, jugador, pagado/impago). Es lo primero que mira un dueño al abrir. Esfuerzo: bajo (reservas de hoy ya se consultan). Fuente: Cortclub "coach daily agenda", patrón "today's agenda".

4. **Tendencia/comparación vs período anterior en cada KPI** [HIGIENE]. Hoy los números son estáticos sin contexto ("$X" sin saber si subió). Agregar "+12% vs ayer/semana pasada" + sparkline. Esfuerzo: medio (requiere query del período previo). Fuente: sparklines/UX SaaS.

### Diferenciadores (impacto alto, esfuerzo medio)

5. **Heatmap de ocupación día × franja horaria** [DIFERENCIADOR]. Visualiza horas pico/valle. Permite ver "los martes 15-17 están muertos" → base para promos/dynamic pricing futuro. Esfuerzo: medio. Fuente: CourtReserve peak hours, Doinsport low-performing slots, heatmaps UX.

6. **Utilización por cancha** [HIGIENE-fino]. Qué cancha rinde y cuál no. Cortclub lo vende como dolor central ("can't see which courts underperform"). Esfuerzo: medio. Fuente: Cortclub, CourtReserve.

7. **Saldo por cobrar / cobranzas del día destacado** [HIGIENE]. Ya hay un badge de "deuda por cobrar"; subirlo a widget con acción directa (ir a cobrar). Cortclub lo pone central. Esfuerzo: bajo. Fuente: Cortclub.

### Para más adelante (dependen de más data/uso)

8. **No-show / cancelaciones del día** [DIFERENCIADOR]. Métrica que Playtomic pone de primera ("reduce cancellations"). PadelwIArk ya tiene auto-liberación de ausencias → tiene la data para contarlas. Esfuerzo: medio.

9. **Retención de jugadores / jugadores nuevos vs recurrentes** [DIFERENCIADOR]. Membership retention 80%+ es KPI clave. Requiere más historia de uso. Esfuerzo: alto.

10. **Forecast/alerta "ocupación por debajo de lo normal"** [DIFERENCIADOR fuerte, atado a la marca IA]. "Hoy vas 30% abajo del promedio de martes → ¿lanzás promo?". Encaja perfecto con el posicionamiento PadelwIArk (IA embebida). Esfuerzo: alto. Fuente: forecast/seasonality overlays UX.

**Recomendación de secuencia para Luca:** 1+2+3 primero (mismo esfuerzo que tiene hoy, transforman el dashboard de pasado→presente y de números→acción). Luego 4 y 7. El heatmap (5) y utilización por cancha (6) como segunda ola visual. El #10 es la bandera "IA" cuando haya data.
