# Hallazgos de investigación — bibliotecario

> Bitácora de investigación de mercado. El agente agrega entradas fechadas al terminar cada exploración. Las más nuevas van arriba.
> Formato: fecha · eje investigado · qué se encontró (con fuentes) · implicancia para PadelwIArk.

<!-- Las entradas nuevas se agregan acá abajo, la más reciente primero. -->

---

## 2026-06-21 · Open matches / matching de jugadores — cómo lo resuelven los referentes (para módulo convocatorias)

**Contexto:** PadelwIArk va a construir convocatorias/matching: Fase A = admin convoca Americano/Super 8 a categorías y los jugadores llenan cupos con "Voy"; Fase B = jugador arma/busca partido y convoca a su categoría. Ya hay `Jugador.categoria`, `Notificacion` (in-app, JSON), módulo Torneos y herramienta `/eventos` (fixture+ranking Americano/Super8 client-side).

### Playtomic — Open Matches / Open Play [Verificado]
- **Quién crea:** lo crea un jugador (hace pública una reserva con cupos libres) O el club (Open Match / "Open Play Programs", esto último en clubes US). Otros jugadores ven nivel, hora, lugar y se unen con un click. Fuente: playtomic.com, helpmanager.playtomic.com (Open Matches y Open Play Programs).
- **Cómo se une el jugador:** se une SOLO (no necesita pareja), lo emparejan con gente de nivel similar. **Para confirmar el cupo hay que pagar online** (tarjeta o Club Wallet). Fuente: playerhelp.playtomic.com (How to sign up for an Open Match).
- **Nivel dinámico:** el rango de nivel del partido se ajusta según el primer jugador que entra (-0.25 / +0.75). Si alguien no encaja, los demás pueden rechazar su solicitud. Sistema 0.0–7.0 estilo ELO que se actualiza tras cada partido competitivo. Fuente: playtomic.com/blog/padel-levels.
- **Si no se llena:** **auto-cancelación 1h antes** del inicio si no se completó el cupo, con **reembolso automático** a todos (2–10 días según banco). Si está lleno, cancelás hasta 24h antes; si no está lleno, cancelás cuando quieras sin restricción. Fuente: playerhelp.playtomic.com (Cancellation Policy for Open Matches).

### MATCHi — Public Matches [Verificado]
- **Quién crea:** un jugador que reservó y le faltan jugadores hace pública la reserva. **Define un rango de nivel.**
- **Cómo se une:** el que quiere entrar **declara su nivel (autoevaluado)** + puede escribir un mensaje al organizador. El booker recibe push, aprueba/rechaza (tiene **control total de quién entra**), y recién ahí el que entra **paga su parte** para confirmar. Notificaciones por **push**.
- **Solo en la app mobile**, no en web. Fuente: matchiplayers.zendesk.com (Public Matches Q&A).

**Patrón común de los dos referentes serios:** (1) creador (jugador o club) abre cupos con rango de nivel, (2) descubrimiento por lista filtrada por nivel/hora/lugar, (3) join con declaración de nivel + aprobación del organizador, (4) **pago = confirmación del cupo**, (5) **deadline con auto-cancelación + reembolso si no se llena**. El pago como mecanismo de compromiso es el corazón anti-no-show.

### Americano / Super 8 dentro de las apps [Verificado / Probable]
- Playtomic SÍ agregó formatos sociales: **King of the Court, Americano y Mexicano** además de ligas/torneos. PERO su módulo de torneos es **básico**: sirve para algo informal entre amigos, NO para evento multi-día con muchas parejas; flojo en round-robin avanzado. Fuente: playtomic.com/playtomic-manager, fenixplay.app, products.playtomic.io. [Verificado el formato; "básico" es valoración recogida de fuentes de terceros]
- El nicho de **organización de Americano serio** lo ocupan apps dedicadas (Americano Padel Manager, PadelMix, Padel AI, bracketmaker) que automatizan fixture + scoring en vivo, gratis/offline. Fuente: americano-padel.app, padelmix.app, padeliq.co. **Hueco:** ninguna de estas está integrada al sistema de canchas + base de jugadores del club. PadelwIArk sí lo estaría.

### Niveles vs categorías AR [Verificado / Probable]
- Dos sistemas conviven: **letras (D→A, iniciación→pro)** y **numérico 1–7** (Playtomic, ELO que sube/baja con resultados; cuestionario inicial). Fuente: guiapadel.com, padelstar.es, playtomic.com/blog/padel-levels.
- En AR domina la **categoría por número (1ra=mejor … 8va=iniciación)**, definida por federación/torneos locales, NO autoevaluada ni ELO. Es una etiqueta administrativa, no un rating fino. [Verificado el sistema AR existe; equivalencia exacta AR↔Playtomic no la publican, es aproximada → cualquier mapeo es Probable].
- **Implicancia clave para PadelwIArk:** nuestra `categoria` (1 por jugador) es una etiqueta gruesa, no un rating. Para matching alcanza para filtrar "convocá a 6ta y 7ma", pero NO da el ajuste fino de Playtomic (-0.25/+0.75). Recomendación: para Fase A la categoría es suficiente (la gracia es juntar gente de nivel parecido, no balancear un ELO). Para Fase B conviene permitir **convocar a categoría propia ± 1** (ej. un 6ta abre a 5ta/6ta/7ma) para no morir por falta de gente exacta.

### Liquidez / cold-start [Verificado / Probable]
- Problema clásico de marketplace de dos lados (chicken-and-egg): sin canchas no vienen jugadores, sin jugadores no vienen clubes. **Playtomic lo resolvió años construyendo el lado oferta (clubes) antes de tener masa de jugadores.** Fuente: medium.com/@oleg2014 (How to Develop a Padel App in 2025).
- **Implicancia directa para PadelwIArk:** NO somos un marketplace nacional, somos software del club → la liquidez es POR CLUB y ya viene resuelta: el club tiene su base de socios cargada. El **empuje del admin** (Fase A) es exactamente la jugada anti-cold-start: no esperás que los jugadores generen actividad orgánica, el club siembra la convocatoria sobre su propia base. Fase B (jugador→jugador) solo prende cuando el club ya tiene densidad. Por eso Fase A primero es correcto.

### Canal de aviso / fill-rate [Verificado / Probable]
- Referentes serios usan **push notification** como canal de join/aprobación (MATCHi, Playtomic). Los clubes de a pie usan **grupos de WhatsApp** para juntar gente rápido. Fuente: matchiplayers.zendesk.com, padelmix.app, padelspeed.com.
- **Implicancia:** PadelwIArk hoy solo tiene notif **in-app**. Sin app mobile instalada ni push, el in-app es un canal pasivo (el jugador tiene que entrar a ver). Para que una convocatoria SE LLENE el aviso tiene que ser **interruptivo** → **WhatsApp es el desbloqueo real** en el contexto AR (todo el mundo lo tiene, lo abre al toque, no requiere instalar app). [Probable, pero muy sólido por contexto AR]. Sin WhatsApp/push, la convocatoria depende de que el jugador "pase por la app", que es justo lo que mata el fill-rate.

---

## 2026-06-21 · Reglas de Super 8 y Americano de pádel — base para feature de software

**Contexto:** Luca quiere construir en PadelwIArk una sección para que los clubes organicen eventos Super 8 y Americano (hoy planeada como sección pública/gratuita de la landing — ver memoria `project_super8_americano`). Necesita las reglas concretas para diseñar el generador de fixture sin adivinar.

### Americano — qué es y reglas [Verificado]
- **Inscripción INDIVIDUAL, se juega en parejas que ROTAN cada ronda.** Compites solo (ranking individual) pero cada partido te toca un compañero distinto y rivales distintos. Objetivo: idealmente jugar con y contra todos una vez. Fuentes: padelstar.es, pistas365.com, padel.fyi, americano-padel.app.
- **Nº de jugadores:** mínimo 4, sin máximo, **ideal múltiplo de 4** (4, 8, 12, 16, 20…). Regla base: **1 cancha por cada 4 jugadores.**
- **Rondas = rotación completa (cada uno juega N-1 jornadas):** 4j→3 rondas, 8j→7, 12j→11, 16j→15. Con muchos jugadores se RECORTA el nº de rondas (ej. 16j en una mañana se juega a 7-10 rondas, no 15). Fuente: americano-padel.app (tabla jugadores/pistas/rondas).
- **Puntuación (variante "a puntos", la más usada en social/express):** cada pelota = 1 punto (sin 15/30/40). Partido a **16, 24 o 32 puntos** (múltiplos de 4). Saque rota cada 4 puntos. Al terminar, **los puntos del marcador se asignan a CADA jugador de la pareja**: si quedó 10-14, los dos de un lado suman 10 y los dos del otro 14. Ranking = suma de puntos individuales acumulados en todas las rondas. Gana el que más puntos acumuló. Fuentes: pistas365.com, americano-padel.app, padel.fyi.
- **Variante "a sets/games" (americano de liga, más largo):** se juega a 1 set o mejor de 3; clasificación por sets ganados, luego games ganados, luego games perdidos. Fuente: padelstar.es. → Hay DOS sistemas de score conviviendo; el de puntos es el del evento de una tarde.
- **Impares / no divisibles por 4:** un jugador DESCANSA por ronda (bye rotativo) y **recibe la media de puntos de esa ronda** para no perjudicarlo. El sistema reparte los descansos equitativamente. Fuente: americano-padel.app.
- **Desempates (app):** total de puntos → diferencia de puntos → enfrentamiento directo → punto de oro. Fuente: americano-padel.app.
- **Duración:** partido de 24 pts ≈ 10 min, 32 pts ≈ 12-15 min. Un americano completo: **1h30 a 4h** según jugadores/rondas. Fuentes: pistas365.com, americano-padel.app, padel.fyi.
- **Variantes de club (AR/ES):** mixto (parejas H-M), por categorías, +16 jugadores → 2 grupos con semis y final. Fuentes: padelstar.es.

### Super 8 — qué es [Verificado, con AMBIGÜEDAD de término documentada]
- **El término NO tiene una definición única y universal.** Fuente: woop.com.br lo dice explícito ("no existe una regla única").
- **Uso amateur/social ES-AR (el que aplica a Luca):** Super 8 = **un Americano de 8 jugadores individuales** con rotación de parejas. 8 jugadores, 2 canchas, 7 rondas, cada uno juega con y contra todos, ranking individual por puntos. Ideal "una mañana, 2 pistas, sin descansos". Es básicamente el caso 8-jugadores del Americano con nombre comercial. Fuentes: feppadel.com.ar, padel.fyi, biguapadelclub (FB), elneverazo.com.
- **Uso brasileño/arena (woop.com.br):** Super 8 puede significar 8 DUPLAS (parejas fijas) en round robin (28 juegos) o en 2 grupos de 4 con semis/final (~15 juegos). Acá las parejas NO rotan. → OJO: distinto modelo de datos.
- **Conclusión para el producto:** en el mercado objetivo de Luca, **Super 8 ≈ Americano de 8 individuales**. La diferencia real a modelar no es "Super 8 vs Americano" sino **rotación individual (parejas cambian) vs parejas fijas (round-robin clásico)**. Conviene que el feature exponga el EJE "¿parejas rotan o son fijas?" en vez de dos botones rígidos.

### Diferencia clave Super 8 vs Americano (resumen)
- **Americano** = formato/concepto: individual + rotación de pareja + ranking por puntos, **N variable** (múltiplo de 4).
- **Super 8** = en AR/ES, el Americano **fijado a 8 jugadores** (nombre de marketing); en BR puede ser 8 parejas fijas en RR. No es un formato distinto con reglas propias: es un Americano dimensionado a 8 (o un RR de 8 duplas, según región).

### Datos que pide un generador de fixture (consenso de las apps) [Verificado]
americano-padel.app pide solo 3 inputs: **(1) nº de jugadores, (2) nº de pistas, (3) formato de puntuación (24/32).** Con eso genera el calendario optimizado (maximiza compañeros/rivales distintos), reparte descansos y calcula ranking en tiempo real. Fuente: americano-padel.app. Es el estándar de UX a copiar: setup en 3 campos.

### Cruce contra el módulo de torneos de PadelwIArk
Revisado `project/apps/frontend/src/services/torneoService.js` y `prisma/schema.prisma`:
- **Lo que YA existe y se PODRÍA reusar parcialmente:** motor de fixture en frontend (`generateGroupPhase`, `calcularDistribucionZonas`, `autoScheduleGroups(grupos, canchas, intervaloMin)` que asigna día/hora/cancha respetando intervalos y anti-conflicto, `advanceGroupMatch`, standings/desempates de grupos, brackets APA). Modelos `Torneo` y `Pareja` en DB. El **scheduler de slots (`autoScheduleGroups`) es 100% reusable** para colocar las rondas del americano en canchas/horarios.
- **Lo que NO encaja (hueco real):** el torneo actual es **parejas fijas → grupos → eliminatoria** y persiste por `Pareja`. El Americano es **individual con compañero rotativo**, no hay "Pareja" estable ni bracket. **No existe modelo `Partido` ni `Grupo` en la DB** (el scheduling de grupos/draws vive en el front como JSON, no persistido como entidad). El ranking del americano es **acumulado por jugador-suma-de-puntos**, no por sets de una pareja.
- **Conclusión:** el Americano es un **motor NUEVO** (algoritmo de rotación tipo round-robin social + scoring por puntos + ranking individual), NO una variante del módulo torneos. Se reusa: el scheduler de canchas/horarios y el patrón de "estado del torneo como JSON". Es nuevo: el modelo de inscripción individual, el algoritmo de emparejamiento por ronda (Berger/whist tables), el scoring por puntos con bye+media, y la tabla de ranking individual en vivo.

**Fuentes:**
- https://pistas365.com/padel/information/rules/americano-tournament/
- https://padelstar.es/como-dar-clases-de-padel/que-es-un-torneo-americano-de-padel/
- https://americano-padel.app/es/blog/como-organizar-torneo-americano-padel-guia/
- https://www.padel.fyi/articles/what-is-a-padel-americano/
- https://feppadel.com.ar/america-padel/
- https://woop.com.br/blog/posts/torneio-super-8-como-funciona
- https://www.hablamosdepadel.es/padel-americana/
- https://www.elneverazo.com/tipos-de-torneo-en-el-padel/

---

## 2026-06-21 · Proveedores de LLM para "Insight del día con IA" (feature PREMIUM) + repos open-source de asistentes

**Contexto:** Endpoint en backend Node/Express (Railway) que toma un resumen estructurado del club (ocupación, horas muertas, tendencia 7d de ingresos/reservas, deuda por cobrar) y pide al LLM 1 recomendación accionable en español, 1×día×club, cacheable. Materializa la oportunidad #10 del dashboard (forecast/alerta IA, "IA embebida"). Es data de CLIENTES → privacidad es requisito duro, no preferencia.

### Dimensionamiento del caso de uso
- Volumen ejemplo: 1 insight/día × 50 clubes ≈ **1.500 llamadas/mes**.
- Prompt: ~800 tokens entrada + ~200 salida ⇒ por llamada 1.000 tokens; mensual **~1,2M in + ~0,3M out** (1,5M tokens totales/mes).
- Es un caso de uso CHICO. La conclusión adelantada: a este volumen, el costo del LLM es ruido (centavos a pocos dólares/mes) en CUALQUIER proveedor de los buenos. La decisión NO es por precio, es por **privacidad + español + fiabilidad + abstracción**.

### Tabla comparativa (verificada por proveedor)

**HALLAZGO CRÍTICO — privacidad en free tier (lo que separa a los proveedores):**
- **Gemini free tier: SÍ entrena con tus inputs/outputs** (reviewers humanos pueden anotar). El paid tier NO. [Verificado] https://meetily.ai/llm-privacy/gemini · https://www.nocode.mba/articles/google-ai-studio-pricing — **descarta el free de Gemini para data de clientes.**
- **Mistral free tier: usa tus datos salvo "No Telemetry Mode" (Pro+).** [Verificado] https://mistral.ai/pricing/ — mismo problema que Gemini free.
- **Groq: zero-training por contrato, incluso free.** "Not permitted to use Inputs/Outputs for training". Logs 30d, ZDR opcional. [Verificado] https://console.groq.com/docs/your-data
- **Cloudflare Workers AI: no entrena LLMs con tu contenido, incluso free.** [Verificado] https://developers.cloudflare.com/workers-ai/platform/data-usage/
- **Anthropic API: nunca entrena con data de API (commercial terms), retención 7d, ZDR para enterprise.** [Verificado] https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- **OpenAI API: no entrena con data de API por default, retención 30d, ZDR para enterprise.** [Verificado] https://openai.com/enterprise-privacy/
- **Together.ai: ZDR disponible, no entrena sin opt-in, ISO27001/SOC2/GDPR/HIPAA.** [Verificado] https://docs.together.ai/docs/privacy-and-security
- **OpenRouter: proxy, no loguea prompts por default, no entrena; pero hereda la política del provider final** (rutea solo a los que no loguean salvo que actives el toggle). [Verificado] https://openrouter.ai/docs/faq

**Free tier (requests/día):**
- Gemini 2.5 Flash: ~250 RPD (Flash-Lite ~1.000 RPD), 250K TPM. [Verificado] https://ai.google.dev/gemini-api/docs/rate-limits — **pero free entrena → no usable.**
- Groq llama-3.1-8b: **14.400 req/día**, 500K tokens/día, sin tarjeta. [Verificado] https://groq.com/pricing · https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb
- OpenRouter free models: 50 RPD (<$10 gastados) o 1.000 RPD ($10+), 20 RPM. [Verificado] https://openrouter.ai/docs/api/reference/limits
- Cloudflare Workers AI: 10.000 Neurons/día gratis. [Verificado] https://developers.cloudflare.com/workers-ai/platform/pricing/
- Mistral: ~1B tokens/mes free (rate-limited) — **pero free entrena.** [Verificado] https://mistral.ai/pricing/
- Together.ai: $1-5 de crédito al signup (no free tier perpetuo). [Verificado] https://www.together.ai/pricing
- Anthropic/OpenAI: sin free tier de API (créditos de prueba puntuales).

**Costo pago (por millón de tokens, in/out) — verificado a jun-2026:**
- Gemini 2.5 Flash-Lite: **$0,10 / $0,40** (el más barato decente). Flash: $0,30/$2,50. https://ai.google.dev/gemini-api/docs/pricing
- Groq Llama 3.1 8B: **$0,05 / $0,08**. Llama 3.3 70B: $0,59/$0,79. https://groq.com/pricing
- Mistral: Small ~$0,20/M; Large $2/$6. https://mistral.ai/pricing/
- Together Llama 3.1 8B: ~$0,18 flat; 3.3 70B: ~$0,88. https://www.together.ai/pricing
- Cloudflare: $0,011 / 1.000 Neurons. https://developers.cloudflare.com/workers-ai/platform/pricing/
- **Anthropic Haiku 4.5: $1 / $5** (OJO: Haiku ya no es $0,25 como el viejo Haiku 3). Sonnet 4.6: $3/$15. https://platform.claude.com/docs/en/about-claude/pricing
- OpenAI: gpt-4o-mini $0,15/M in; o4-mini $0,55/$2,20; GPT-5.4 $2,50/$15. https://openai.com/api/pricing/

### Costo mensual estimado del caso de uso (1,2M in + 0,3M out / mes)
- **Groq 8B:** ~$0,06 in + $0,02 out ≈ **$0,08/mes** (y ENTRA en free tier: 1.500 < 14.400/día).
- **Gemini Flash-Lite (pago):** ~$0,12 + $0,12 ≈ **$0,24/mes**.
- **OpenAI gpt-4o-mini:** ~$0,18 + ~$0,18 ≈ **$0,36/mes**.
- **Anthropic Haiku 4.5:** ~$1,20 + $1,50 ≈ **$2,70/mes**.
- **Anthropic Sonnet 4.6:** ~$3,60 + $4,50 ≈ **$8,10/mes**.
> Conclusión numérica: aun el más "caro" (Sonnet) cuesta **~$8/mes para 50 clubes** = $0,16/club/mes. Si Luca cobra el insight como PREMIUM, el COGS del LLM es despreciable. **El precio NO debe decidir esto.**

### Calidad en español (razonamiento de negocio simple)
- [Verificado por uso/benchmarks generales, no test propio] Gemini Flash, Claude Haiku/Sonnet, GPT-4o-mini y Llama 3.3 70B manejan bien español rioplatense para una recomendación corta. Llama 3.1 **8B** es el más flojo: para "1 frase accionable" alcanza, pero puede sonar genérico o traducido. [Probable] Para una feature que se COBRA y lleva la marca "IA" de PadelwIArk, el escalón 8B es riesgoso en tono; 70B o un modelo frontier chico (Haiku/Flash/4o-mini) dan mejor redacción.

### Integración desde Node
- SDKs oficiales JS: **OpenAI** (`openai`), **Anthropic** (`@anthropic-ai/sdk`), **Google** (`@google/genai`), **Mistral** (`@mistralai/mistralai`), **Groq** (`groq-sdk`, además API OpenAI-compatible). [Verificado existencia].
- **Vercel AI SDK** (`ai` + `@ai-sdk/*`): capa de abstracción JS first-class, cambia de provider con 1 línea, streaming, tool-calling. Ideal para Node/Railway. [Verificado existencia].
- **OpenRouter**: un solo endpoint OpenAI-compatible para ~300 modelos, cambiás de modelo por string. [Verificado] https://openrouter.ai/docs/faq

### Fiabilidad/uptime
- [Probable] Anthropic/OpenAI/Google: SLAs maduros, los más estables. Groq: muy rápido (LPU) pero más joven y con rate limits agresivos en free; para 1 llamada/día no es problema. OpenRouter agrega un hop (su uptime + el del provider), mitigable con fallbacks automáticos.

### PARTE 2 — Repos open-source de github.com/topics/ai-assistant
Nota: el topic es ruidoso/SEO; lo relevante real es el ecosistema conocido. Clasificación:
- **UIs de chat self-host (chasis para FASE FUTURA chat/voz de PadelwIArk):**
  - **LibreChat** (~30k★, danny-avila, TypeScript, activo) — clon ChatGPT multi-provider, MCP, agentes, code interpreter, multi-user auth, self-host. https://github.com/danny-avila/LibreChat
  - **Lobe Chat / LobeHub** (~65k★, TypeScript) — framework de chat moderno multi-provider, plugins, TTS/visión, deploy 1-click. https://github.com/lobehub/lobehub
  - **Leon** (~17k★) — asistente de voz personal open-source, offline/privacy. Referencia para voz, no para web SaaS.
- **Frameworks de agentes / SDK de UI agéntica (no LLM, son orquestación):**
  - **CopilotKit** (~35k★, TypeScript) — SDK frontend para meter "copilotos" en apps React. Candidato real si Luca quiere un asistente embebido EN PadelwIArk (no chat aparte).
  - LangChain/LlamaIndex (no salieron en este fetch pero son el estándar de orquestación/RAG). 
- **Asistentes "todo en uno" / gateways personales (irrelevantes para SaaS B2B):** OpenClaw/nanoclaw, Everywhere, deepchat, gptme — asistentes personales locales (WhatsApp/Telegram/desktop). No aplican a un insight diario en backend.
- **Conclusión Parte 2:** NINGUNO reemplaza al LLM — son el **chasis** (UI, orquestación), no el **motor** (inferencia). Para el insight diario NO se necesita ninguno: es 1 prompt → 1 respuesta, lo resuelve el SDK del provider directo o el Vercel AI SDK. LibreChat/CopilotKit recién entran en la **fase futura de chat/voz** del producto.

### Recomendación (resumen, detalle en oportunidades.md)
1. **Arrancar MVP con un modelo frontier chico vía Vercel AI SDK**, default **Gemini 2.5 Flash-Lite (PAGO, no free)** o **Claude Haiku 4.5**. Motivo: privacidad limpia + buen español + costo despreciable a este volumen. **Evitar el free tier de Gemini y Mistral** (entrenan con la data del cliente).
2. **Capa de abstracción SÍ:** Vercel AI SDK (preferido, nativo Node) u OpenRouter. No casarse con un provider para una feature que se vende.
3. **Tradeoff gratis-vs-pago:** Groq free es tentador (gratis + no entrena) pero el modelo 8B free es flojo en tono y es feature que se COBRA. Pagar centavos por mejor redacción y SLA serio se justifica solo. El "gratis" acá es un ahorro de centavos a costa de calidad de marca.

---

## 2026-06-21 · Dashboard / panel principal del admin — qué muestran los líderes y qué KPIs valoran los dueños

**Contexto:** Luca quiere rediseñar el dashboard admin de PadelwIArk (hoy: 6 tarjetas estáticas — canchas en uso, reservas hoy, jugadores activos, torneos activos, ingresos día/mes — + feed de actividad). Lo quiere "dinámico, reflejo del club en tiempo real".

### Qué muestran los competidores en su home/dashboard

- **Playtomic Manager** [Verificado]: Single & Multi-Club Dashboards. Reportes de Revenues, Occupancy, Players & Payment Collection, Payout Summary. "Total Revenues" = Online + Offline. Analytics en tiempo real para "increase occupancy, reduce cancellations". Multi-club: análisis por ubicación, de club a país.
  - https://playtomic.com/playtomic-manager
  - https://helpmanager.playtomic.com/hc/en-gb/articles/20535028898449-New-Single-and-Multi-Club-Dashboards
  - https://helpmanager.playtomic.com/hc/en-gb/articles/20534995597841-Revenues-reports

- **Cortclub** [Verificado] — el más alineado a lo que quiere Luca. Dashboard mobile-first que muestra: "expected funds, court-by-court occupancy and free slots in real time", daily revenue at a glance, peak-hour analytics, booking pipeline, **agenda diaria del coach con estado pagado/impago/confirmado**, historial de pago por jugador y **saldo pendiente para seguimiento**. Tesis de venta: "most club owners can't see which courts underperform, when demand drops or which coaches drive retention".
  - https://cortclub.com/

- **Doinsport** [Verificado]: "track your real-time occupancy rate, identify low-performing time slots and act on live data — not end-of-month reports". KPIs: Revenue, Occupancy rate, Ticket Z, Stock levels, Comparisons, Custom exports. KPIs consolidados + performance por sede + base de socios en un dashboard.
  - https://doinsport.com/en/club-padel-management-software
  - https://doinsport.com/en/blog/how-to-choose-a-reservation-app-for-padel-club-in-2026

- **CourtReserve** [Verificado]: "real-time dashboards con top-line metrics", identifica peak hours, popularidad de programas, uso de espacio. Reportes: court utilization, revenue, attendance, members, online payments. Para clubes grandes: dashboards multi-sede en Power BI/Tableau y live KPIs (member count, booking volume, revenue) embebidos en Notion/Coda.
  - https://courtreserve.com/features/

- **TPC Matchpoint** [Verificado]: seguimiento de occupancy rates e income streams con filtros para precisar data points.
  - https://tpcmatchpoint.com/en/padel-club-management-software.html

- **PadelOS** (competidor real, ojo con el nombre — homónimo del nombre viejo del proyecto) [Verificado]: tiene una sección dedicada "Reports & Analytics".
  - https://www.padelos.co/features/reports

### KPIs que de verdad importan al dueño (con benchmarks)
Fuente principal: financialmodelslab.com — "7 Padel Center KPIs" [Verificado]
https://financialmodelslab.com/blogs/kpi-metrics/padel-center

- **Court Utilization Rate (ocupación)**: horas reservadas / horas disponibles × 100. Target **50%+**. Revisión diaria/semanal. → EL KPI rey del rubro.
- **Average Revenue Per Booking (ARPB)**: revenue / nº de reservas. Semanal/mensual.
- **Ancillary Revenue %** (bar, pro-shop, alquileres): 10–15% del total. → cruza con módulo Finanzas/POS que ya tiene PadelwIArk.
- **Gross Margin %**: target 85%+.
- **Staff Cost / Revenue**: < 40%.
- **Membership Retention Rate**: 80%+ mensual.
- **Breakeven Occupancy**: ocupación mínima para cubrir costos fijos, < 40%.
- Cortclub agrega de facto: **no-shows/demand drop**, **saldo pendiente por cobrar**, **coach retention**.

### Patrones de UX de dashboard moderno "tiempo real" [Verificado]
- "Show what matters now", no "show everything". https://f1studioz.com/blog/smart-saas-dashboard-design/
- **Sparklines** al lado de cada KPI (tendencia up/down sin ejes ni leyendas). https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns
- **Alertas/condicional formatting** → bloque "necesita tu atención" (pasa de reporte pasivo a monitoreo activo).
- **Heatmap** para patrones (ocupación por día×hora).
- **Forecast/seasonality overlays**: si la ocupación sube pero por debajo del forecast, lo marca y sugiere acción (promo).
- **Agenda del día** conectada a la data, "para arrancar bien el día". https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/

### Cruce contra PadelwIArk (huecos)
PadelwIArk HOY tiene: canchas en uso, reservas hoy, jugadores activos, torneos activos, ingresos día/mes, feed actividad, badge "deuda por cobrar". Le **falta** (todos son higiene del rubro, no diferenciadores): **occupancy rate %** (no solo "3/6 ahora"), **agenda/timeline del día**, **bloque "necesita atención"** (impagos, ausencias, turnos por aprobar), **horas pico/heatmap**, **tendencias/sparklines** (todo hoy es número estático sin comparación vs ayer/semana pasada), **utilización por cancha** (qué cancha rinde). El feed de actividad es mirar al pasado; falta mirar el AHORA y el HOY-que-viene.

