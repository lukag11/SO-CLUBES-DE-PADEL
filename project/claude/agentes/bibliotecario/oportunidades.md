# Oportunidades — huecos e ideas accionables

> Lo que Luca no está viendo. El agente prioriza por impacto vs esfuerzo y ata cada ítem a una fuente/razón.
> Formato: idea · por qué (hueco de mercado / necesidad real) · impacto · esfuerzo · fuente · estado (nueva / en evaluación / descartada / en roadmap).

<!-- Oportunidades acá, ordenadas por impacto. -->

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
