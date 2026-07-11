# Hallazgos de investigación — bibliotecario

> Bitácora de investigación de mercado. El agente agrega entradas fechadas al terminar cada exploración. Las más nuevas van arriba.
> Formato: fecha · eje investigado · qué se encontró (con fuentes) · implicancia para PadelwIArk.

<!-- Las entradas nuevas se agregan acá abajo, la más reciente primero. -->

---

## 2026-07-11 · DISEÑO / UX VISUAL de landing pública de club — rediseño (hero, secciones, tipografía, color, motion)

**Contexto:** Luca quiere rediseñar la landing pública del club (hoy "plana/vaga", tema oscuro). Foco DISEÑO, no features. Verifiqué el código real primero: `frontend/src/features/landing/Template1..5.jsx` + `LandingSections.jsx` (135KB). Estado ACTUAL: ya hay tema oscuro (`#0d1117`), split hero, glows radiales con `colorPrimario` configurable, cards glass (`bg-white/5 border-white/8 backdrop-blur`), un SVG de líneas de cancha al 4% de opacidad, badge, dual CTA, "dot" pulsante de canchas activas. O sea: la base es decente pero **100% estática** — no hay motion, la tipografía es `font-bold` genérica (sin display expresiva), las fotos van con un `bg-black/65` plano encima que las apaga, y las cards son todas del mismo tamaño (sin jerarquía bento). Ahí está el "se ve vago". WebSearch OK; varios WebFetch a SPAs (sitios live) rebotan — lo [Verificado] sale de artículos de diseño + docs, no de captura pixel de los sitios.

**Hallazgos clave [Verificado por snippet salvo donde diga]:**

1. **La tipografía es el hero de 2026, no la foto.** Múltiples fuentes coinciden: "large-scale, expressive headlines han REEMPLAZADO al stock hero image" como el elemento que agarra la atención. Typography-as-design-element, custom/oversized/motion. El sector deportivo tiene convención propia y fuerte: **condensadas bold** (Bebas Neue, Oswald, Barlow Condensed, Saira, Trade Gothic/Futura Condensed) porque maximizan el tamaño de letra — vienen de camisetas, scoreboards y posters deportivos. → El hero actual usa Space Grotesk/Inter `font-bold` a `text-6xl`: correcto pero tibio. Fuente: line25, freefontzone, typewolf (Sporting Grotesque), fontalternatives.

2. **Foto full-bleed con TRATAMIENTO, no con cortina negra plana.** Los gyms premium (Equinox "cinematic red hero", JOHN REED video de DJ, Tomo "full-bleed climbing action" + 7 palabras de copy) usan foto/video real de SU espacio a sangre completa. Regla dura citada: "stock fitness photos are an instant credibility killer" — foto propia = señal premium. El overlay tiene que ser un GRADIENTE direccional (oscuro abajo/lado del texto → transparente sobre la acción), no un `bg-black/65` uniforme que apaga todo. Fuente: nanoglobals (12 gym websites), hotmintdigital.

3. **Bento grid = jerarquía visual implícita.** Layout modular estilo Apple: cards de distinto tamaño, la grande agarra el ojo primero, las chicas dan soporte. Ya es EL patrón del mid-2020s para SaaS/marketing. → El hero actual tiene 3 cards del mismo tamaño (sin jerarquía). Un bento le daría "vida" sin agregar contenido. Fuente: figma resource library, midrocket, gezar.

4. **Motion: scroll-driven CSS nativo + micro-hovers, NO autoplay pesado.** Lo que suma: reveals on-scroll (fade+translate-up al entrar en viewport), progress/parallax de capas, hover con scale + shadow + "grosor" 3D en cards. Lo que se logra con CSS scroll-driven animations o IntersectionObserver (sin JS pesado); GSAP ScrollTrigger solo para lo complejo. Lo que se EVITA: autoplay de video (flag explícito de performance/bandwidth), motion decorativo sin narrativa ("animation should reinforce the narrative, not distract"). Fuente: line25 (motion 2026), studiomeyer (reality check).

5. **Aurora UI / glow gradiente + glassmorphism refinado.** Glassmorphism 2026 = capas translúcidas SUTILES (no blur pesado) + noise texture + gradient borders + soft shadows, "especialmente efectivo en dark UI". Aurora = mesh gradients animados suaves de fondo. → El club ya tiene glows radiales; falta refinarlos (gradient border en cards, un toque de grano) y quizás un mesh sutil con el acento. Fuente: midrocket, gezar, inspoai.

6. **Restraint = premium.** "True premium environments are defined less by excess and more by intentional restraint." Copy corto y filoso gana (JOHN REED: "Finally, a gym that doesn't suck"). → No llenar de texto; headline corto, mucho aire, un acento.

**Cruce contra PadelwIArk:** la infra ya soporta lo necesario — `colorPrimario` configurable por club (perfecto para acento + glow), sistema de 5 templates, tema oscuro instalado, fuentes Space Grotesk/Inter/JetBrains ya cargadas (memoria marca). El gap es puramente de EJECUCIÓN visual: (a) meter una display condensada para los H1/números, (b) gradiente direccional sobre las fotos en vez de cortina plana, (c) bento en el hero y en features, (d) scroll-reveals + hover micro-interacciones, (e) refinar glows/glass. Todo hacible en React+Tailwind sin backend nuevo. Riesgo: no cargar la página (autoplay video, blur pesado en mobile). → ver oportunidades OP-LANDING-DISEÑO.

### Fuentes
- https://nanoglobals.com/gym-websites/ · https://www.hotmintdigital.co.uk/post/padel-website-template · https://zynkdesign.com/our-work/the-padel-club/
- https://line25.com/articles/web-design-trends-2026/ · https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check · https://midrocket.com/en/guides/ui-design-trends-2026/ · https://gezar.dk/en/blog/web-design-trends-2026 · https://www.figma.com/resource-library/web-design-trends/ · https://www.inspoai.io/blog/web-design-trends-2026
- https://www.typewolf.com/sporting-grotesque · https://freefontzone.com/guides/best-font-pairings-2026 · https://fontalternatives.com/best-fonts-for/sports/ · https://www.landingpageflow.com/post/google-font-pairings-for-websites
- Inspiración visual: https://www.behance.net/search/projects/padel · https://dribbble.com/search/padel-website · https://webflow.com/made-in-webflow/padel · https://www.gymshark.com/

---

## 2026-07-10 · Entrada por VOZ en WIarky — vara de UX de voz + contexto de uso (dueño en el club) + diferenciación

**Contexto:** Luca quiere una entrada por voz "bien profesional, súper cómoda, que funcione perfecto" en WIarky (asistente owner-facing, usado mucho desde el celular parado en el club). Verifiqué el código real primero: `AsistenteWiark.jsx` hoy tiene un `<input>` de texto plano (placeholder "Preguntale a WIarky…"), SIN voz de ningún tipo. O sea, todo lo de acá es cancha nueva.

**Distinción clave que definí (vale para toda la recomendación):** hay DOS paradigmas de voz y no son lo mismo. (1) **Dictado** = voz→texto que cae en el campo de input, editable antes de mandar. (2) **Voice mode / conversación** = ida y vuelta hablada en tiempo real (habla y escucha). Para WIarky lo que corresponde es **DICTADO**, no voice mode. El dueño está parado en el club con ruido, quiere tirar "cargá un gasto de 30 lucas de pelotas" y ver que quedó bien escrito antes de mandar — no una charla hablada. ChatGPT separa explícitamente estos dos modos por esta misma razón. Fuente: OpenAI Help (ChatGPT Voice), academy.openai.com.

**Vara de UX de voz en los top [Verificado por snippet]:**
- **ChatGPT:** dictado = tap en el micro del campo de texto, hablás, cae como texto editable. Voice mode = tap-and-hold del botón grande, soltás para cortar (push-to-talk). Upgrade 2025: unificaron para NO sacarte a otra pantalla (antes te mandaba a un orbe azul y perdías el historial); ahora ves la respuesta aparecer en la misma pantalla donde escribís. Lección: **no romper el contexto visual del chat**. Fuente: techbuzz.ai, OpenAI Help.
- **Feedback visual mientras grabás (lo que lo hace sentir "vivo"):** waveform pulsante / orbe que reacciona en tiempo real al volumen de tu voz = el "latido" del asistente; indicador de tiempo transcurrido; idealmente **transcripción en vivo** (las palabras aparecen mientras hablás vía streaming). Un cue visual + un sonidito corto + haptic reemplazan la "certeza visual" que perdés al no tipear. Fuente: eleken.co (Voice UI 2026), aufaitux, lollypop.design.
- **WhatsApp (el gesto que el dueño argentino YA conoce):** **hold-to-record** (mantené apretado, soltá para mandar) + **slide-to-cancel** (deslizá para descartar). Transcripción on-device, se activa por long-press → "transcribe". El patrón de WhatsApp es el más familiar para un usuario AR no técnico. Fuente: blog.whatsapp.com, faq.whatsapp.com.
- **Multimodal + control del usuario:** combinar voz + visual + haptic (canales redundantes) = accesible y confirma en ambiente ruidoso. Tiene que ser fácil parar, repetir o corregir en cualquier momento ("borrá eso", "de nuevo"). Fuente: designlab, aguayo.co.
- **Haptics = detalle PRO:** haptic distinto por estado (inicio grabación / lock / cancelado por slide / enviado). OJO técnico real: en iOS el AVAudioSession de grabación puede pisar el motor de haptics y hacer que falle silencioso — hay que probarlo, no darlo por hecho. Fuente: GetStream stream-chat-flutter #2463, Medium (Maksim Po, haptics vs AVAudioSession).

**Realidad técnica (la trampa que te puede arruinar el "funciona perfecto") [Verificado por snippet]:**
- **La Web Speech API (SpeechRecognition) NO es confiable en iOS.** En iOS Safari/Chrome el `SpeechRecognition` está mayormente no soportado o buguea; en WebView (PWA/app embebida) directamente no anda. Chromium desktop/Android va bien, iOS lento o roto. Fuente: webreflection (Taming the Web Speech API), Apple Dev Forums #694847, xjavascript.com.
- **Alternativa robusta = grabar audio con MediaRecorder → mandar a transcribir (Whisper/Google STT) en backend.** Pero iOS Safari graba en `audio/mp4` (mp4a) y Android Chrome en `audio/webm;opus` → si el backend espera un solo formato, rechaza. Hay que manejar ambos. Latencia: dictado (grabá→soltá→transcribí) tolera 1-2s; conversación en vivo no. Otra razón para ir por DICTADO, no voice mode. Fuente: buildwithmatija.com, xjavascript.com.
- **Recomendación técnica:** para "que funcione perfecto" en el celular del dueño (muchos iPhone), NO depender de Web Speech API. Ir por **MediaRecorder → STT server-side (Whisper API)**, con soporte de mp4/webm, y — si querés transcripción en vivo — streaming. Web Speech API sólo como atajo opcional en Android/desktop. Esto cuesta más que "4 líneas de SpeechRecognition" pero es la diferencia entre pro y berreta.

**Contexto de uso real (dueño en el club, ruido, apurado):**
- Ruido de fondo (pelotazos, gente) = el STT tiene que ser bueno y SIEMPRE mostrar la transcripción para editar antes de mandar (nunca auto-enviar a ciegas: un "cargá 30" mal oído como "cargá 13" en un gasto es plata real). El paso "revisá y mandá" no es fricción, es seguridad — encaja perfecto con la regla de oro de WIarky ("nunca escribe solo, confirmación humana").
- Manos ocupadas / parado = el gesto tiene que ser de una mano y perdonar el error (poder cancelar deslizando, poder editar el texto). Frustra: perder lo que dijiste, que se mande solo algo mal transcripto, que te saque del chat.

**Diferenciación en el vertical [Verificado/Probable]:** Ni Playtomic Manager ni los competidores de gestión documentan entrada por voz en el lado ADMIN (Playtomic Manager vende analítica/ocupación/pagos; su IA conversacional es para el JUGADOR en WhatsApp, ya registrado en hallazgos 2026-07-10). No encontré NINGÚN software de gestión de clubes de pádel con dictado por voz owner-facing. → Si WIarky suma dictado por voz BIEN hecho, es un diferenciador tangible y demostrable en 5 segundos en una demo ("mirá, le hablo y me carga el gasto"), no una feature de checklist. El "bien hecho" es la condición: mal hecho (Web Speech en iOS que no anda) es peor que no tenerlo. Fuente: playtomic.com/playtomic-manager + búsqueda sin resultados de voz admin en el vertical.

**Implicancia → ver oportunidades.md (OP-VOZ-1).**

### Fuentes
- https://help.openai.com/en/articles/20001274-chatgpt-voice · https://academy.openai.com/public/clubs/work-users-ynjqu/resources/using-voice
- https://www.techbuzz.ai/articles/chatgpt-voice-gets-major-ux-upgrade-with-unified-interface
- https://blog.whatsapp.com/introducing-voice-message-transcripts · https://faq.whatsapp.com/241617298315321/
- https://www.eleken.co/blog-posts/voice-ui-design · https://www.aufaitux.com/blog/voice-user-interface-design-best-practices/ · https://lollypop.design/blog/2025/august/voice-user-interface-design-best-practices/ · https://designlab.com/blog/voice-user-interface-design-best-practices · https://aguayo.co/en/blog-aguayo-user-experience/ux-in-voice-interfaces/
- https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1 · https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription · https://www.xjavascript.com/blog/add-ios-speech-recognition-support-for-web-app/ · https://developer.apple.com/forums/thread/694847
- https://github.com/GetStream/stream-chat-flutter/issues/2463
- https://playtomic.com/playtomic-manager

---

## 2026-07-10 · Auditoría de WIarky (asistente IA) — onboarding + vara de mercado de asistentes IA en el vertical

**Contexto:** Luca pidió auditar WIarky (el asistente conversacional del dueño de club, "caballo de batalla" del SaaS) con foco FUERTE en ONBOARDING. Verifiqué el código real primero: `backend/src/lib/insight.js` (motor + 13 herramientas + system prompt) y `frontend/.../AsistenteWiark.jsx` (la cara: bubble, primer mensaje, 3 chips de sugerencia). WebSearch SÍ habilitado; varios WebFetch (Playtomic help, tiendapadelpoint) rebotaron 403 → lo [Verificado] de esas fuentes sale de snippets del buscador, no de captura directa. Lo aclaro.

**Estado interno verificado (leído en código):**
- WIarky HOY ya es notablemente maduro para el vertical: **grounded en datos reales del club sin PII** (ocupación, turnos libres hoy/mañana, reservas 7/14d, horas muertas, deuda, jugadores, torneos activos, caja del día, facturas por vencer), **13 herramientas con tool-use** (consultar disponibilidad/deudores/ingresos/salud financiera/ascensos; armar posteo; crear convocatoria/reserva/jugador; cargar gasto; ascender jugador; abrir caja), **regla de oro "nunca escribe solo"** (toda mutación pasa por botón de confirmación humana) y una **red de seguridad determinística anti "confirmado fantasma"** (si el modelo afirma que algo quedó hecho sin haber usado herramienta, se lo fuerza a corregir). Modelo Haiku 4.5. Semilla de proactividad: al abrir inyecta el "insight del día" + recordatorio de abrir caja.
- **El onboarding, en cambio, es el eslabón débil.** Primer contacto = bubble genérico ("Preguntame algo", se va a los 9s) + primer mensaje que lista solo 3 capacidades de LECTURA + 3 chips de sugerencia TODOS pasivos: "¿Cuántos turnos libres hay hoy?", "¿Cómo viene la semana?", "¿Qué hago con las horas muertas?". **Ninguno muestra que WIarky EJECUTA acciones.** El diferenciador real (hacer tareas por lenguaje natural) es invisible en los primeros 30 segundos.

**Vara de mercado — asistentes IA en el vertical [Verificado por snippet]:**
- **Playtomic tiene un AI assistant conversacional... pero es PARA EL JUGADOR, en WhatsApp:** reservar cancha, unirse/crear open matches, torneos, clases, pagos (Stripe), gestionar cuenta. Aprende preferencias de juego on the fly. NO es un asistente owner-facing dentro del Manager. Fuente: playerhelp.playtomic.com (Meet Your Playtomic AI Assistant on WhatsApp). Internamente Playtomic usa IA para soporte B2C (81 intents, 83% deflection). → El gigante puso la IA del lado del JUGADOR; el lado del DUEÑO está mucho menos atendido.
- **Kananas:** "AI Writing Assistant" (genera emails/newsletters/resúmenes) + automatización de reservas/recordatorios/renovaciones/facturación. Es AUTOMATIZACIÓN + redacción, NO un agente conversacional que ejecuta acciones sobre los datos reales del club. Copy de venta: "¿Necesito conocimientos técnicos? No", trial 30 días, "ahorrá 2h de admin por semana". Fuente: kananas.com.
- **Anolla:** IA de scheduling + dynamic pricing (optimización, no conversación). **SmashClub:** CRM que "automatiza". **Clutch/Spash:** IA de CÁMARA (highlights/análisis de partido), otro eje. Fuente: WebSearch (anolla.com, smashclub.cloud, clutchapp.io, spash.com).
- **Lectura:** NADIE en el vertical tiene un **asistente conversacional OWNER-facing, grounded en los números reales del club, que EJECUTE acciones administrativas** (armar convocatoria, cargar gasto, registrar jugador, ascender, abrir caja) con confirmación humana. La competencia tiene: IA para el jugador (Playtomic), IA de redacción/automatización (Kananas), IA de pricing (Anolla), IA de cámara (Clutch). WIarky ocupa un cuadrante propio. Es diferenciación REAL, no vanidad — pero hoy no se comunica en el onboarding.

**Vara de onboarding de asistentes IA (fuera del vertical) [Verificado]:**
- Regla dura repetida en todas las fuentes: **"un input vacío con cursor NO es onboarding"**. Los usuarios que nunca usaron la feature no saben qué pedir y tiran queries vagas. Hay que mostrar **3-5 prompts específicos y realistas que demuestren el RANGO** de lo que hace. Fuente: NN/g (New Users Need Support with Generative-AI Tools), Jotform, designpixil, getstream.
- **Activar en <60 segundos** (ProductLed): el primer contacto tiene que producir una experiencia de valor, no un tutorial. Templates + "suggested first actions" + personalidad (ilustración simpática) bajan la barrera. Fuente: productled.com, mobbin (empty state), logrocket.
- Progressive disclosure: no mostrar las 13 capacidades de golpe; revelar por contexto. Fuente: uxstudioteam, mindtheproduct.

**Implicancia → ver oportunidades.md (OP-WIARKY-1..5).** Resumen: el motor de WIarky ya está por encima del vertical; el hueco es que el **onboarding no muestra el poder de acción** (el diferenciador queda oculto), no hay **memoria por club** (para el "aprende tu club" del roadmap), la **proactividad está encerrada en el chat** (sin push/WhatsApp no llega el briefing) y **no hay métrica de adopción**. Lo más barato y de mayor impacto: rediseñar el primer minuto para que muestre RANGO (incluyendo acciones) y una acción guiada de 1 tap.

### Fuentes
- https://playerhelp.playtomic.com/hc/en-gb/articles/35606814522129--Meet-Your-Playtomic-AI-Assistant-on-WhatsApp
- https://www.kananas.com/en/software/padel-club/
- https://anolla.com/en/best-padel-software · https://smashclub.cloud/ · https://www.clutchapp.io/
- https://www.nngroup.com/articles/new-AI-users-onboarding/
- https://productled.com/blog/ai-onboarding
- https://getstream.io/blog/chat-ux/ · https://www.jotform.com/ai/agents/chatbot-best-practices/
- https://blog.logrocket.com/ux-design/empty-states-ux-examples/

---

## 2026-07-06 · Arqueo de caja / cierre de turno + costos y margen (cómo lo resuelven ERP/POS)

**Contexto y foco:** Luca pidió cruzar dos temas contra el módulo Dirección/Pagos de PadelwIArk. (1) Arqueo de caja físico (apertura con fondo, cobros por método, egresos, cierre con conteo declarado, diferencia faltante/sobrante, atribución a empleado/turno, multi-caja). (2) Costos y margen para negocio de alquiler de canchas + kiosco/bar chico. Verifiqué el código real antes de investigar (ver "Estado interno verificado").

**Estado interno verificado (leído en código, no de memoria):**
- **`backend/src/routes/caja.js`** — `GET /api/caja` y `/caja/reporte`. Es un **REPORTE de movimientos**: suma `Reserva.pagado` + `Cargo estado=pagado` como ingresos y `Gasto.pagado` como egresos, agrupa por método/tipo/categoría, calcula margen del bar (venta − COGS de `Cargo.costo`), top productos. Neto = ingresos − egresos. Comentario propio en el código: *"Cuenta solo lo cobrado/pagado. Las deudas pendientes no son caja."*
- **`frontend/.../CajaTab.jsx`** — UI del reporte + botón "Imprimir cierre" (`imprimirCierreCaja`). Selector de período hoy/semana/mes/custom.
- **NO existe:** apertura de caja, campo fondo inicial, sesión/turno de caja, conteo físico declarado al cierre, cálculo de diferencia (faltante/sobrante), atribución a un empleado, ni entidad `SesionCaja`/`ArqueoCaja` en el schema. El "cierre" actual es un PDF del reporte teórico, no un arqueo conciliado.
- **`backend/src/lib/finanzas.js`** — motor serio. Break-even en turnos de 1.5h (`fijoMensual / contribPorTurno`), costo del turno vacío, `Costo` con `tipo` fijo/variable + `periodicidad` (mensual/bimestral/anual/único) normalizada a mensual, `sector` (canchas/clases/bar/proshop/null). `calcularContribucionSectores`: margen por sector con **prorrateo del fijo general por % de ingreso** ("el margen que no miente"), COGS directo del bar, flags "faltan datos". Esto ya es de nivel ERP y es su diferencial.

**Punto 1 — Arqueo de caja: qué hace el mercado.**
- **Definición estándar [Verificado]:** *arqueo* = conteo físico del efectivo; *cierre* = arqueo + conciliación de TODOS los medios (débito/crédito/MP/transfer) contra el sistema. Fondo de caja/"cambio" = monto fijo al abrir que NO es ganancia (garantiza vuelto). Cierre: (valores contados − fondo inicial) vs reporte del sistema → constancia de exacto/sobrante/faltante + firma del responsable. Con varios turnos, arqueo al final de cada turno para control por empleado. Fuente: Dux Software blog, Prosegur AR, mygestion.
- **Dux Software (ERP PYME argentino) [Verificado]:** Tesorería → Caja diaria → Apertura (saldo inicial por forma de pago) / Cierre (revisar saldos acumulados, ingresar montos físicos, guardar). Fórmula: *Ingresos − Egresos + Fondo apertura = Saldo esperado*; el informe detalla la **diferencia** entre saldo del sistema y lo declarado por el usuario. Registra el usuario que abrió. Multi-caja por sucursal/PDV; cajas cerradas no se modifican; transferencia de saldos a caja receptora. Fuente: ayuda.duxsoftware.com.ar/articles/7866135 y 7883706.
- **Fudo (POS gastronómico argentino, el análogo más cercano al BAR del club) [Verificado]:** "arqueo de caja" por **turno de trabajo** con monto inicial; efectivo esperado = monto inicial + ventas efectivo; sección "Según sistema" lista ventas/propinas/movimientos; los gastos deben marcarse "Usar en arqueo" para descontar del efectivo; un gasto fuera de la franja horaria del arqueo NO impacta el cierre. Terminal Fudo automatiza el conteo. Fuente: soporte.fu.do/articles/11730865 y 11730868, blog.fu.do.
- **Software de pádel (Matchpoint/TPC, Playtomic Manager) [Probable]:** foco declarado en reservas, control de acceso, fichaje de empleados y estadísticas de uso/ventas/ingresos; **no encontré documentación pública que detalle arqueo físico con diferencia declarada** (Matchpoint no lo explicita, Playtomic Manager habla de analítica y pagos centralizados, no de conteo de caja). Es decir: los verticales de pádel tienden a NO tener arqueo físico serio — lo cubre el POS de bar por separado. Fuente: tpcmatchpoint.com, playtomic.com/playtomic-manager. [Suposición razonada] Ahí hay un hueco de mercado: quien tiene canchas + bar hoy usa dos sistemas.

**Punto 2 — Costos y margen: qué hace el mercado.**
- **Estándar mínimo real [Verificado/Probable]:** separar costo FIJO (alquiler, sueldos, seguros — se pagan igual haya o no juego) de VARIABLE (luz por turno, COGS del bar, comisiones MP); margen BRUTO = ingreso − costo directo del servicio; margen NETO = después de prorratear los fijos. El prorrateo de fijos por % de ingreso de cada unidad de negocio es la técnica clásica de contabilidad de costos (Dux/ERP lo hacen vía centros de costo). Fuentes: Dux tesorería, Sage/mygestion arqueo.
- **PadelwIArk ya cubre esto y con criterio** (break-even en turnos, contribución por sector con prorrateo, COGS del bar, costo del turno vacío). Está POR ENCIMA de lo que ofrece un POS de comercio típico y de lo que exponen los verticales de pádel. El hueco no está en el cálculo del margen sino en la **captura del dato** (que el dueño cargue COGS y costos con sector) y en cerrar el loop con un arqueo físico real.

**Implicancia para PadelwIArk → ver `oportunidades.md` (OP-CAJA-1..4).** Resumen: el margen/rentabilidad ya está a la altura o mejor. El hueco duro y accionable es el **arqueo físico** (fondo inicial + conteo declarado + diferencia + atribución a empleado), sobre todo por el BAR y por clubes con varios empleados en recepción. Es lo que separa "reporte de plata" de "control de caja".

---

## 2026-07-06 · Ascenso/descenso de categoría y el concepto de "estar pasado" en pádel amateur (AR + referentes)

**Contexto:** PadelwIArk tiene `Jugador.categoria` (1ra=mejor … 8va=iniciación, formato canónico "4ta Categoría"). El módulo de stats ya tiene una "sugerencia de ascenso" que el admin evalúa a mano (memoria project_stats_jugador). Dolor real del dueño: cuando un jugador "está pasado" (gana demasiado fácil su categoría) hay que ascenderlo o impedir que se siga anotando ahí, porque arruina la competencia. Luca menciona reglas caseras de jerga: "ganó el torneo con 5 parejas distintas", "ganó 3 veces con la misma pareja". Objetivo: diseñar un modelo coherente. WebSearch OK; **WebFetch quedó bloqueado casi entero este turno** (ellitoral, tucancha, maximumpadeltour, padelonada, padelmanager, laligapadelargentina, americano-padel.app todos rebotaron por "unable to verify domain"). Lo [Verificado] sale de snippets de WebSearch sobre esas fuentes, no de captura directa del texto completo — lo aclaro para no vender como leído lo que vino resumido por el buscador.

### 1) Sistema de categorías AR (APA) y cómo se asciende — es CRITERIO HUMANO, no puntos [Verificado por snippet]
- AR se organiza en ~7 categorías (algunas fuentes/provincias dicen 8va→1ra), reguladas por APA + federaciones provinciales. 7ma/8va = iniciación, 1ra = casi pro. Fuente: WebSearch APA, tucancha.com.ar, ellitoral.com (fiscal nacional Osvaldo Barbieri).
- **DATO CENTRAL:** en el pádel FEDERADO AR el ascenso NO es automático por puntos ni por ganar un torneo. Lo definen **fiscales categorizadores** que evalúan la "evolución objetiva de habilidades observables": salida de pared, volea, remate, consistencia (repetir golpes sin errores no forzados), posicionamiento antes/después del impacto, velocidad y variación de juego, altura de bola respecto a la red. *"El ascenso no responde a resultados aislados sino a la evolución objetiva de habilidades observables por los fiscales."* Fuente: ellitoral.com / miradorprovincial.com (fiscal Barbieri, feb-2026). → Ganar un torneo NO te sube solo en el sistema federado; es evaluación técnica humana.
- Afiliación a APA obligatoria; desde 2022 no se puede jugar Torneos Argentinos sin fiscalización del colegio de fiscales. Fuente: padel.org.ar (reglamento amateur APA).

### 2) Los CIRCUITOS/CLUBES amateur SÍ usan reglas objetivas duras (acá están los números de Luca) [Verificado por snippet]
Donde aparecen los umbrales concretos es en los reglamentos de circuitos/ligas de club, NO en la federación:
- **Regla más común y clara del rubro: el/los FINALISTAS están OBLIGADOS a subir de categoría en el próximo torneo** que jueguen (excepción: acuerdo con la organización por nivel, cambio de compañero, etc.). Fuente: WebSearch reglamentos (padelonada, sumapadelclub, laligapadelargentina).
- **Ganar 2 torneos en la misma categoría → ascenso automático/obligatorio.** Fuente: Maximum Padel Tour (normativa).
- Variante combinada: **ganar 2 torneos O llegar a 3 finales en la categoría → ascenso obligatorio.** Fuente: Reglamento Ranking Anual (toppadelfitcenter.com PDF).
- Sistema de puntos por resultado (campeón > finalista > semi > …). Al acumular puntos suficientes para la categoría superior, **el ascenso es automático al inicio de la temporada siguiente** (modelo FEP/autonómicos ES). Fuente: padelmanager.com/ranking/criterios, padelfip.
- **Anti-sandbagging incorporado:** si un jugador juega una categoría INFERIOR a la suya, **no suma puntos** en el ranking. Fuente: padelmanager.com/ranking/criterios. → El sistema desincentiva "bajar a ganar fácil" quitándole el premio (puntos).
- Penalización por inactividad: cada mes sin jugar desde el último torneo, resta ranking. Fuente: padelmanager.com.

### 3) Descenso — existe, pero es más blando y variado [Verificado por snippet]
- **Venezuela Padel Tour:** bajás una categoría si perdés dos veces en primera ronda en dos torneos distintos de la misma temporada. Fuente: venezuelapadeltour.com.
- **Ligas por divisiones (Pádel o Nada):** la posición final de la liga define ascenso/descenso/permanencia + playoffs para los casos de borde. Fuente: padelonada.com.
- **Fexpadel (ES):** los últimos del ranking de 1ra y 2da descienden automático a la categoría inferior. Fuente: fexpadel.com PDF.
- Lectura: el descenso casi siempre está atado a un formato de LIGA con temporada cerrada. En un club que corre torneos sueltos, el descenso es mucho menos usado que el ascenso — y menos doloroso de no tener.

### 4) Playtomic Level — el referente de "ranking dinámico por resultado" [Verificado]
- Escala **0.0 a 7.0 en pasos de 0.25**. Tras cada partido COMPETITIVO (los "friendly" NO mueven nada) un algoritmo ajusta el nivel, ponderado por nivel del rival y margen del resultado: **ganarle a mejores sube más; perder ajustado contra fuertes casi no cuesta.**
- **Reliability:** cuán seguro está el sistema de tu nivel; sube jugando más. Hacen falta ~**15-20 partidos** contra rivales variados para que el nivel se asiente. Fuente: playtomic.com/blog/padel-levels, playerhelp.playtomic.com (The Playtomic Levels: ups & downs), padeli.com, playskan.com.
- **Implicancia para PadelwIArk:** el ELO dinámico es preciso pero **CARO en datos**: exige 15-20 partidos competitivos CARGADOS por jugador. Un club chico AR que recién arranca no tiene ese volumen ni carga todos los partidos → un ELO arrancaría "sin asentar" y poco creíble. Además la `categoria` de PadelwIArk es una etiqueta gruesa administrativa, no un rating fino. El ELO es OTRO producto, no una mejora incremental.

### 5) "Estar pasado" / sandbagging — cómo lo previenen los que lo resolvieron [Verificado por snippet]
- Es un problema RECONOCIDO de integridad competitiva a nivel torneo de club: anotarse demasiado abajo = acusaciones de "sandbagging". Fuente: WebSearch (redlinesportsclub, americano-padel.app, worldpadelrating).
- **Mecanismo estándar de defensa = los "CUTS": umbrales de ranking que IMPIDEN a un jugador demasiado bien rankeado inscribirse en categorías inferiores.** *"To prevent top players from dominating lower categories, federations apply cuts (ranking thresholds) — if you are ranked too high, you can no longer enter entry-level tournaments."* → esto es EXACTAMENTE el "no dejarlo anotarse más en esa categoría" que pide el dueño, ya inventado y validado por el rubro. Fuente: americano-padel.app (guía torneos), worldpadelrating.com.
- **World Padel Rating (WPR)** — referente nuevo a fichar: plataforma global de rating donde un rating alto debe GANARSE por juego validado, revisión de coach o ranking FIP verificado (anti-inflado). Fuente: worldpadelrating.com/faq.

### 6) La sutileza de "parejas distintas" (jerga de Luca) — insight de dominio [Probable, análisis]
Las reglas de Luca ("ganó con 5 parejas distintas" vs "ganó 3 veces con la misma pareja") son house-rules de la misma familia que "2 torneos ganados / 3 finales". Pero tienen un matiz REAL de mérito: ganar con **compañeros DISTINTOS** prueba que el mérito es del jugador, no de un compañero fuerte que lo "arrastra". Ganar 3 veces con la MISMA pareja puede ser mérito compartido/del compañero. → "ganó con N parejas distintas" es una señal MÁS confiable de "está pasado individualmente" que "ganó N veces con la misma pareja". Es un buen criterio para diferenciar ascenso individual vs. "esa pareja es fuerte". No lo vi escrito en un reglamento federado (es criterio de club), pero es coherente con por qué los rankings serios ponderan rivales/validación y no solo títulos.

### Cruce contra PadelwIArk
- YA tiene: `categoria` por jugador (1ra-8va), módulo Torneos que persiste `Pareja` (jugador1/jugador2), campeón/finalista por torneo, y una "sugerencia de ascenso" en stats que el admin evalúa a mano.
- Le FALTA: (1) el CONTADOR objetivo por jugador×categoría (torneos ganados / finales / parejas distintas / ventana temporal) que alimente esa sugerencia con números en vez de intuición; (2) el "CUT" — advertir/bloquear la inscripción de un jugador pasado a su categoría vieja (el dolor #1 del dueño); (3) umbral configurable por el club.

### Fuentes
- https://padel.org.ar/wp-content/uploads/2025/02/REGLAMENTO-DEPORTIVO-AMATEUR-APA.pdf
- https://www.ellitoral.com/deportes/padel-especialista-santafesino-explica-definen-categorias-ascender-fiscal-nacional-osvaldo-barbieri_0_fUddSCPfgH.html
- https://www.miradorprovincial.com/2026/02/25/padel-en-plena-expansion-como-se-definen-las-categorias-y-que-se-evalua-para-ascender/
- https://tucancha.com.ar/blog/guia-de-categorias-de-padel-en-argentina-de-octava-a-primera
- https://padelmanager.com/ranking/criterios
- https://www.maximumpadeltour.com/normativa-maximum
- https://toppadelfitcenter.com/wp-content/uploads/2025/09/Reglamento-Ranking-Anual-corregido.pdf
- https://padelonada.com/reglamento/
- https://www.venezuelapadeltour.com/pages/4471662-reglamentos-y-politicas
- https://fexpadel.com/wp-content/uploads/2024/02/NORMATIVA_TECNICA_COMPETICION_EQUIPOS_2024.pdf
- https://playtomic.com/blog/padel-levels
- https://playerhelp.playtomic.com/hc/en-gb/articles/19831827459345-The-Playtomic-Levels-ups-downs
- https://www.playskan.com/blog/padel-levels-explained-uk
- https://americano-padel.app/en/blog/padel-tournament-ranking-categories-guide/
- https://worldpadelrating.com/faq/

---

## 2026-07-05 (bis) · Convertir al ESPECTADOR ANÓNIMO de la página pública de un torneo — cómo enganchan los referentes

**Contexto:** cada torneo de PadelwIArk tiene página pública sin login (grupos + bracket + campeón + sponsors + branding del club). El visitante típico llega por LINK compartido por WhatsApp ("mirá cómo va el torneo") o buscando resultados = **lead TIBIO** (conoce a alguien jugando o le interesa el club). Hoy la página es INFORMATIVA, sin embudo de conversión. Objetivo: convertirlo en (a) socio/jugador registrado, (b) inscripto al próximo torneo, (c) reserva de cancha, o al menos (d) capturar contacto para remarketing. Y que eso le dé valor de venta al DUEÑO (el SaaS se vende mejor si la página pública trae gente). WebSearch SÍ habilitado.

### Cómo lo resuelven los referentes [Verificado]
- **FenixPlay (apps de torneo de pádel):** su ventaja competitiva declarada es *"Anyone can follow the tournament from the browser, without installing anything or creating an account"* + *"Players and spectators see the scores as they update, no refresh needed"*. **El no-login es el argumento de venta, no un detalle.** Excel+WhatsApp *"leaves spectators in the dark"*. → PadelwIArk ya tiene esto (página pública sin login): es paridad con el líder de nicho, hay que NO romperlo (nunca meter un muro de login para ver resultados). Fuente: fenixplay.app/en/blog/best-padel-tournament-apps.
- **Challonge:** convierte espectadores con dos mecánicas de engagement: **(1) bracket predictions** — *"Have people submit their brackets prior to your tournament starting, and we'll keep track of the leaderboard"* (quiniela con tabla); **(2) voting on open matches** — cualquiera con cuenta vota. Ambas EXIGEN cuenta → convierten espectador→registrado jugando. También separan **spectator tickets vs participant tickets**. Fuente: kb.challonge.com (Registration; Hosting a Sign-Up Page), challonge.com/features.
- **Toornament:** widget que **auto-evoluciona según el estado del torneo**: antes = botón de registro; durante = últimos/próximos partidos; al terminar = ganador. Un solo `<script>` embebido, se actualiza solo, white-label en plan alto. → El CTA que cambia con el estado del torneo es un patrón validado, no un invento. Fuente: help.toornament.com/share/the-widgets, blog.toornament.com (Meet the Widgets).
- **Playtomic:** su torneo es BÁSICO; el share es un botón "Share" arriba del detalle + reparte standings **por el CHAT del torneo** (no hay página pública live pulida). Hueco reconocido por terceros. Fuente: fenixplay.app, playerhelp.playtomic.com (Tournaments).
- **Apps de Americano (live leaderboard):** el patrón viral clave verbatim: *"Sharing the leaderboard by sending final standings to the group chat gives people something to talk about **and a reason to come back next week**"* + link/QR que **transmite en la TV del club** + *"Live leaderboard links make tournaments feel like a pro tour"*. **El compartir el resultado al grupo NO es un extra: es el motor de retorno semanal.** Fuente: americano-padel.app, spark.mwm.ai (Americano Padel Manager), livecup.app.

### Cómo enganchan los sitios de RESULTADOS deportivos al espectador casual [Verificado]
- **Push notifications = +50% engagement**; el gancho central es el botón **"Follow" (ícono campana)** para seguir un equipo/jugador y recibir updates. Contenido personalizado = **+40% de probabilidad de engagement**. Fuente: arena.im (Push Notifications for Sports Coverage), moldstud.com (Top 10 Features Live Score Apps), statsperform.com.
- **Lectura para PadelwIArk:** el equivalente del "Follow" para el espectador tibio es **"Seguí este torneo"** (o "Seguí a [jugador]") — la acción de MENOR fricción y MÁS natural para quien llegó por el link de un conocido. No le pidas "registrate" de una: pedile "seguí" (bajo compromiso) y capturás el contacto ahí.

### Best practices de captura de lead / página de conversión [Verificado]
- **Email/dato único por default: cada campo extra del form corta la conversión 5-15%.** Waitlist promedio convierte ~15%, buenas 20-30%, top 40-85%. Fuente: waitlister.me, unbounce.com.
- **Un solo outcome en el titular** ("nombrá UN resultado"), no un lema genérico. Fuente: flowjam, magicui.
- **UNA sola tarea por página; esconder/quitar el nav sube conversión 10-15%.** Múltiples CTAs compitiendo = paradoja de elección. Fuente: waitlister.me, getlaunchlist.
- **Referral mechanic:** Dropbox creció con referidos (+60% signups permanente). El loop de compartir es parte del embudo, no un adorno. Fuente: viral-loops.com, waitlister.me.
- **Post-signup = secuencia de engagement**: quien "sigue" debe recibir updates (score, próximo torneo) — es el puente al remarketing. Fuente: waitlister.me.

### Cruce contra PadelwIArk — qué YA tiene y qué le falta
- **YA tiene:** página pública sin login (paridad con FenixPlay), branding del club + sponsors, share por WhatsApp, registro de jugador, inscripción a torneos, reservas, notif in-app, **DNI matching retroactivo** (al registrarse, vincula historial de torneos por DNI — memoria project_dni_matching_registro). Esto último es ORO para el gancho "reclamá tu perfil".
- **Le falta (el hueco):** (1) CTA CONTEXTUAL por estado del torneo (hoy la página es informativa, sin llamado a la acción claro); (2) acción de bajo compromiso "Seguí el torneo" que capture contacto; (3) perfiles de jugador clicables como puerta de entrada ("¿sos vos? reclamá tu perfil"); (4) sensación "en vivo" explícita (badge EN VIVO + auto-refresh) cuando el torneo está en curso; (5) texto de WhatsApp pre-armado con GANCHO (hoy comparte link pelado); (6) captura de lead del anónimo (email/WhatsApp) para remarketing del dueño.

### Fuentes
- https://fenixplay.app/en/blog/best-padel-tournament-apps/
- https://kb.challonge.com/en/category/registration-c1s5r6/
- https://challonge.com/features/tournaments
- https://help.toornament.com/share/the-widgets
- https://blog.toornament.com/2017/11/meet-the-widgets/
- https://americano-padel.app/en/
- https://spark.mwm.ai/en/apps/americano-padel-manager/6747935961
- https://livecup.app/padel-tournament
- https://arena.im/customer-experience/push-notifications-for-sports-coverage/
- https://moldstud.com/articles/p-top-10-features-for-live-sports-score-apps
- https://www.statsperform.com/resource/how-the-best-live-score-apps-drive-fan-engagement-revenues-and-49-star-ratings/
- https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide
- https://unbounce.com/landing-pages/how-to-create-the-ultimate-lead-capture-page/
- https://viral-loops.com/blog/how-to-build-a-waitlist/

---

## 2026-07-05 · UX de la vista "fase de grupos / mi zona" en desktop ancho — cómo la muestran los referentes

**Contexto:** vista del jugador "mi zona" (round-robin, zonas de 3-4 parejas). Hoy = 3 bloques apilados a ANCHO COMPLETO: (1) tabla posiciones, (2) grilla cruzada de enfrentamientos (matriz pareja×pareja), (3) lista de partidos (cards). Problema en monitores 1600px+: todo se estira, mucho espacio vacío, y en las cards de partido las dos parejas quedan pegadas a los extremos izq/der con un hueco enorme al medio → hay que "barrer la pantalla" para ver contra quién jugás. Luca ya RECHAZÓ: (a) max-width + centrar la llave (dejó blanco feo); (b) posiciones+matriz en 2 columnas y partidos en grilla de 2.

> NOTA DE MÉTODO: los sitios deportivos live (ATP Tour, sofascore, 365scores, Toornament widgets) son SPAs y devolvieron **403 / HTML vacío** al WebFetch — no pude capturar el pixel-layout exacto. Lo marcado [Verificado] viene de fuentes de diseño de tablas (múltiples) y de docs oficiales (Playtomic help). Los layouts concretos de ATP/sofascore van como [Probable] apoyados en snippets de búsqueda + conocimiento de dominio, NO como captura directa. Lo aclaro para no vender como visto lo que inferí.

### HALLAZGO COMPETITIVO JUGOSO — Playtomic PUNTEA la vista de grupos en la app [Verificado]
- El propio Playtomic **NO muestra bien la fase de grupos/leaderboard dentro de la app**: *"they don't yet see live matchups or leaderboards directly in the Playtomic app — that's coming in a future update"*. Reparten matchups y standings finales **por el chat del torneo** (mensajes). Fuente: helpmanager.playtomic.com (New Tournament Tools: Americano/Mexicano/KotC).
- **Lectura:** el líder tiene un HUECO acá. Una vista de zona pulida, legible y "premium" en PadelwIArk es un diferenciador real, no una paridad. No estás copiando algo mejor hecho: estás cubriendo algo que el grande todavía no resolvió in-app.

### Cómo lo resuelven los sitios que SÍ lo hacen bien [Probable — dominio + snippets]
- **Contenedor ACOTADO, no full-bleed edge-to-edge.** sofascore/flashscore/ESPN/ATP en desktop viven en un contenedor central (~1100-1300px) — NO estiran las tablas de borde a borde de un 1600px+. Pero **NO dejan blanco**: usan el ancho sobrante para poner PANELES EN COLUMNAS (standings + fixtures lado a lado), no para centrar una sola columna angosta con vacío a los lados. Ese es el matiz que Luca no vio: el fix a "se estira feo" no es cap+centrar-una-columna (eso deja el blanco que él rechazó), es **cap + LLENAR el ancho con 2 paneles**. Snippet: *"Sofascore has redesigned its standings to give more context... live scores, group standings and knockout brackets"* (sofascore.com); *"Flashscore layout works well when many events are live at once"* (igamingexpress).
- **La fila de partido es una UNIDAD COMPACTA, nunca justify-between a todo el viewport.** El patrón flashscore/sofascore de fixture: pareja1 arriba / pareja2 abajo (stack vertical) con el score en una banda angosta a la derecha, ganador en negrita, perdedor atenuado. Todo el bloque mide ~360-480px. NO hay "Pareja1 .......... Pareja2" separadas por medio metro de pantalla. **El bug de Luca es exactamente `justify-between` sobre ancho completo** — ningún referente hace eso.
- **ATP Finals (round-robin de 4, el análogo 1:1 del pádel):** standings por partidos ganados (W-L), luego sets, luego games; página de group-standings + página de results separadas. Columnas típicas de round-robin de tenis: Jugador/Pareja, PJ, PG-PP (record), Sets, Games. Es más magra que la nuestra (Pos, Pts, PG, PP, Dif.Sets, Dif.Games, Criterio) → **posible over-columna nuestra** (ver abajo). Fuente: atptour.com/.../group-standings (no fetcheable, 403), nittoatpfinals.com/rules-and-format.

### Principios de tabla en desktop ancho [Verificado — varias fuentes de diseño]
- **Fijar el ancho de columnas predecibles** (status, fechas, números, acciones) para que no "salten", y dejar que floten solo las columnas de texto. *"Fix the width of predictable columns... let text-heavy columns flex."* Fuente: setproduct.com/blog/data-table-ui-design.
- **El whitespace excesivo entre columnas MATA la escaneabilidad** (la fuerza de la tabla es comparar de un vistazo). En pantalla ancha, más espacio ≠ mejor: columnas muy separadas obligan a recorrer con la vista. Fuente: setproduct, pencilandpaper.io.
- **Alineación:** texto a la IZQUIERDA, números a la DERECHA (o centrados si son cortos tipo score). Center-align de texto rompe el escaneo. Fuente: pencilandpaper.io, eleken.co/blog-posts/table-design-ux.
- **Tabla vs cards vs lista:** las TABLAS ganan en densidad y en "comparar registros cruzados" (ideal para posiciones); las CARDS ganan cuando cada ítem es una unidad visual escaneable (ideal para un partido con ganador/score); las LISTAS cuando la estructura es plana de una línea. → posiciones = tabla; partidos = cards compactas o filas tipo fixture. La matriz cruzada es tabla densa: potente para comparar, pero sparse y difícil de escanear en zonas chicas (muchas celdas vacías/diagonal). Fuente: uxpatterns.dev (table-vs-list-vs-cards), pencilandpaper.io.
- **Filas:** condensada 40px / regular 48px / relajada 56px. Regular/relajada leen mejor; condensada mete más data. Fuente: dronahq.com, lollypop.design.

### Redundancia detectada en la vista actual [Probable — análisis]
- La **matriz cruzada (bloque 2)** y la **lista de partidos (bloque 3)** muestran LO MISMO (los resultados pareja×pareja) dos veces, en dos formatos. En una zona de 3-4 parejas la matriz es 3×3/4×4 = mayormente celdas vacías (diagonal) + redundante con la lista. Ocupa un ancho completo para poca info. Candidata #1 a demoter (toggle/secundaria) o a fusionar. Referentes de zona chica (tenis RR) rara vez muestran matriz Y lista full-width apiladas.

### Fuentes
- https://helpmanager.playtomic.com/hc/en-gb/articles/44129657203985-New-Tournament-Tools-King-of-the-Court-Americano-and-Mexicano
- https://www.setproduct.com/blog/data-table-ui-design
- https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards
- https://www.eleken.co/blog-posts/table-design-ux
- https://www.dronahq.com/table-ui-design/
- https://www.nittoatpfinals.com/en/event/rules-and-format
- https://www.sofascore.com/football/tournament/world/world-championship/16
- https://igamingexpress.com/flashscore-vs-sofascore/

---

## 2026-06-27 · Feed PÚBLICO de "partidos abiertos" (pre-login, cara de captación) — cómo lo exponen los referentes

**Contexto:** Luca quiere replicar la cara pública de Convocatorias (sección en landing del club + ítem navbar "Americano y Super 8" → `/eventos` + login-con-retorno) para los PARTIDOS DE 4: navbar público "Partidos" + sección en landing + feed de partidos abiertos donde el visitante anónimo se une registrándose. Quiere "algo que venda". El matching INTERNO ya está (PlayerPartidosPage, PartidoPublicoPage en `/partido/:id`, "¡Voy!" + aprobación del organizador, rango de categorías). WebSearch SÍ habilitado este turno.

### HALLAZGO CENTRAL (cambia la premisa) [Verificado]
**Ni Playtomic ni MATCHi exponen un feed público de partidos a usuarios anónimos. El feed vive DETRÁS del login/app.**
- Playtomic: *"In order to join a public match, you must have a Playtomic account"* / *"any player who wants to sign up for a match must have a Playtomic account"*. No hay vista web pública del feed de open matches. El descubrimiento ("matches near me") es DENTRO de la app logueado. Fuente: playerhelp.playtomic.com (How to sign up for an Open Match).
- MATCHi: Public Matches **solo en la app móvil, no en web** (*"Public matches are only available in the mobile app, not on the web"*). Lo público que ofrecen al sitio del club es el **booking widget** (reservar cancha), no el feed de partidos. Fuente: matchiplayers.zendesk.com (Public Matches Q&A), playmore.matchi.com (booking widget).
- **Lectura:** los líderes NO usan el feed de partidos como anzuelo de adquisición anónima — lo usan como retención DENTRO de una base ya registrada. El gancho de adquisición de ellos es el **marketplace global** (descubrís clubes/partidos en TODA la ciudad una vez dentro de la app). Un club suelto no tiene esa masa. → La idea de Luca (feed público en la landing del UN club) es un movimiento DISTINTO al de los líderes, no una copia. Puede ser diferenciador, pero hereda el problema que los líderes esquivan con masa: **cold-start / liquidez** (ver abajo).

### El puente anónimo→registrado que SÍ usan: el LINK COMPARTIBLE [Verificado]
- El mecanismo real de captación de Playtomic/MATCHi no es un feed público: es **compartir el partido por WhatsApp**. *"You can share a match by clicking the 'Share' icon... choosing WhatsApp"*; quien recibe el link *"can click on it and add themselves to the game by clicking on the remaining free slots"* — **pero igual debe crear cuenta para entrar**. Fuente: playerhelp.playtomic.com (Add my friends; sign up for Open Match), helpmanager (Sharing a Match to increase participants).
- **Implicancia para PadelwIArk:** el embudo que funciona es *organizador comparte link de SU partido → el de afuera entra al lobby público (`/partido/:id`, que ya existe) → "¡Voy!" → registro con retorno → queda anotado*. Es el mismo patrón login-con-retorno que ya hiciste en Convocatorias. El link 1-a-1 por WhatsApp convierte mejor que un feed pasivo, porque llega con intención ("che, falta uno, entrá acá"). El feed público es el complemento de descubrimiento, no el motor.

### Apps que SÍ hacen feed público de descubrimiento (el ángulo de Luca) [Verificado parcial]
- **PadelBridge** (padelbridge.com): se posiciona literal como *"Find & Join Padel Matches In Your City"* — *"discover open games at all local clubs and simplifies finding and joining games"*. Es un agregador multi-club de descubrimiento. (Fetch directo falló por cert; dato del título + snippet de búsqueda.) Fuente: búsqueda padelbridge.com.
- **PadelOS** (padelos.co/features/open-matches): tiene módulo dedicado "Open Match System for Padel Clubs", copy *"Encourage more padel matches with Open Matches, where players can easily create or join games based on skill level and availability"*. La página de feature NO documenta vista pública anónima ni embudo de captación — está orientada a jugadores ya dentro. Fuente: padelos.co.
- **Locales AR ya fichados (turno 06-26):** Padelero (*"Buscá partidos abiertos en tu club o creá uno"* + Match Maker "tipo Tinder"), GetMatch, Playmix/Sportlix (*"unite a partidos abiertos o creá el tuyo"*). Convergen en el copy **"partido abierto"** + **"completar el partido"**. Casi todos detrás de registro/app.

### Cold-start / feed vacío — qué hacen (y qué no dicen) [Verificado el riesgo / Probable la mitigación]
- Ninguna fuente documenta un buen empty-state. Los líderes lo esquivan por diseño: con masa multi-club, el feed nunca está vacío. **Un club chico AR arranca con feed vacío casi seguro** — el riesgo real de la idea de Luca.
- [Probable, sólido] La mitigación estándar en productos con liquidez baja: (1) **no mostrar feed vacío frío**; mostrar siempre un CTA "creá el primero / armá tu partido" como estado primario, con el feed como secundario; (2) **sembrar con lo que ya tenés** — convocatorias (Americano/Super 8) y partidos abiertos en un mismo feed "Jugá hoy" para que nunca esté vacío; (3) **partido fantasma / demanda latente**: "12 jugadores de 4ta buscan partido esta semana" (agrega intención aunque no haya partido armado). El motor de adquisición no puede ser el feed: tiene que ser el **link compartible + push a la categoría** (que ya tenés).

### Privacidad anónimo vs logueado [Verificado el patrón general]
- Patrón de mercado: a un anónimo NO se le muestran nombres completos de jugadores reales. Se muestra el partido (cancha, hora, nivel/categoría, cupos X/4) y, a lo sumo, nombre de pila o iniciales/avatar. Identidad completa = post-login. Aplica a PadelwIArk: tu lobby público `/partido/:id` debería mostrar "Cupos 2/4 · 4ta Categoría · Sáb 20:00" y NO "Juan Pérez, María García" a un desconocido (privacidad + Habeas Data AR). Confirmar contra el render actual de `PartidoPublicoPage`. [Verificado patrón; aplicación a tu código = recomendación, no auditado este turno]

### Estado actual de PadelwIArk [Verificado contra código]
- Navbar público (`PublicNavbar.jsx`) hoy: Quiénes Somos · Reservas · Torneos · Contacto · **Americano y Super 8** (destacado → `/eventos`). **NO hay ítem "Partidos".** ← exactamente el hueco que Luca quiere llenar.
- Ya existen: `PartidoPublicoPage.jsx` (lobby público del partido en `/partido/:id`), `EventosPage.jsx` (feed público de convocatorias), `LandingSections.jsx`, patrón login-con-retorno. **La infra del embudo existe; falta el FEED público de partidos + la sección en landing + el ítem navbar.**

### Fuentes
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832151055121-How-to-sign-up-for-an-Open-Match
- https://matchiplayers.zendesk.com/hc/en-gb/articles/21818109944221-Public-Matches-Q-A
- https://playmore.matchi.com/matchi-booking-widget
- https://helpmanager.playtomic.com/hc/en-gb/articles/20535063385873-Sharing-a-Match-to-increase-participants
- https://www.padelos.co/features/open-matches
- https://www.padelbridge.com/
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832050848017-Add-my-friends-to-a-reservation

---

## 2026-06-26 · UX del "no tengo con quién jugar" / completar el partido — rediseño de la card en Reservar cancha

**Contexto:** ya existe `SolicitudJugador` (busca "jugador" o "pareja" desde Mis Reservas, botón "Buscar jugador" por reserva, notifica a misma categoría, primero que dice "¡Voy!" cubre). Luca quiere llevarlo a la pantalla de RESERVAR CANCHA como CARD dinámica siempre visible ("¿No tenés con quién jugar? Reservá y te ayudamos"). WebSearch/WebFetch SÍ habilitados este turno — material refrescado.

### Flujo Open Match (Playtomic) — refresco 2026 [Verificado]
- **Crear:** el jugador define deporte, lugar, fecha/hora, single o doble, y tipo+nivel (casual/competitivo). Fuente: helpmanager.playtomic.com (configure Open Matches), playerhelp (sign up).
- **DATO NUEVO CLAVE:** la cancha **NO se reserva al crear** el open match. El booking se confirma automáticamente cuando se alcanzan umbrales de jugadores / límites de tiempo, o cuando un admin asigna cancha. → Playtomic separa "abrir partido" de "reservar cancha" (abre primero, reserva después). Fuente: playerhelp.playtomic.com / helpmanager (How to manage Open Matches). **Esto es lo OPUESTO a PadelwIArk y a MATCHi (reservás primero, después abrís).**
- **Nivel dinámico:** el rango se ajusta según el primer que entra (-0.25 / +0.75). Sistema 1–7 (6–7 = elite/pro). Competitivo mueve el rating; friendly no. Fuente: playtomic.com.
- **Join con aprobación:** si no encajás por nivel podés tocar **"Request your place"** → todos los jugadores ya dentro reciben notificación y deben aprobar; basta UN rechazo para que no entres. Confirmado el cupo → **pagás** y queda confirmado. Fuente: playerhelp (Request a spot in a public match).

### MATCHi Public Match — refresco 2026 [Verificado]
- Nace del caso 2 puro: abrís "Upcoming Bookings" → tocás **"Need more players"** → configurás visibilidad + rango de nivel → otros piden unirse y vos (el que reservó) **aprobás/rechazás con control total**. Solo en la app móvil, no web. Fuente: matchiplayers.zendesk.com (Public Matches Q&A), matchi.se.
- Copy textual de MATCHi: **"Need more players"**. Cualquier reserva se puede hacer pública.

### Players locales / LatAm [Verificado el feature; detalle UX parcial]
- **Padelero (AR):** "Buscá partidos abiertos en tu club o creá uno y que se sumen otros jugadores" + **Match Maker "tipo Tinder pero para pádel"** (encontrá rivales/compañeros de tu nivel). El ángulo social/swipe es su gancho de marca. Fuente: padelero.app.
- **GetMatch (Mar del Plata, AR):** "encontrar partidos disponibles, completar encuentros o conocer jugadores de una categoría similar" con **ELO estilo ajedrez**. Resuelve explícito el dolor de "buscar compañero sin depender de tu red de WhatsApp". Fuente: bacap.com.ar (2026-03-27).
- **Playmix / Sportlix (AR):** "elegí cancha y horario, unite a partidos abiertos o creá el tuyo". Fuente: playmix.pro, sportlix.io.
- **Playmatch (AR):** "encontrá partidos y jugadores", comunidad. Fuente: playmatch.app.
- **Lectura:** el copy local converge en dos verbos — **"completar el partido"** y **"partido abierto"**. El sistema de nivel local es ELO (GetMatch) o autoevaluado; la categoría federada 1ra–8va de PadelwIArk es más gruesa pero más natural para el amateur AR.

### Cruce con PadelwIArk [Verificado contra código]
- `SolicitudJugador` ya cubre el 80% del modelo MATCHi: busco jugador/pareja, atado a reserva, notifica por categoría, estados abierta/cubierta/cancelada, cancelable. **Lo tenemos.**
- Lo que NO tenemos vs líderes: (1) **aprobación del organizador** (hoy "el primero que dice Voy cubre" = sin filtro; MATCHi/Playtomic dejan al creador aprobar); (2) **estado visual "X de 4"** (cupos llenándose); (3) **descubrimiento** — nadie ve las solicitudes abiertas salvo por notificación push; no hay un listado/feed de partidos abiertos del club; (4) **ancla anti-no-show** (Playtomic/MATCHi = pago; nosotros = nada todavía); (5) **deadline + auto-cierre**.

### Fuentes
- https://helpmanager.playtomic.com/hc/en-gb/articles/20535035123473-How-to-configure-Open-Matches-at-your-Club
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832151055121-How-to-sign-up-for-an-Open-Match
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832027031569-How-to-request-a-spot-in-a-public-match
- https://helpmanager.playtomic.com/hc/en-gb/articles/20534737902353-How-to-manage-Open-Matches-in-Playtomic-Manager
- https://matchiplayers.zendesk.com/hc/en-gb/articles/21818109944221-Public-Matches-Q-A
- https://www.padelero.app/
- https://bacap.com.ar/2026/03/27/getmatch-la-app-marplatense-que-conecta-jugadores-partidos-y-torneos-de-padel/
- https://playmix.pro/ · https://sportlix.io/ · https://playmatch.app/

---

## 2026-06-24 (bis) · ¿Persistir el historial de Americano/Super 8 y/o alimentar stats del jugador? — cómo lo hacen los demás

**Contexto:** ya está implementada la carga de resultados + ranking EN VIVO. Nueva duda de Luca: "¿estas estadísticas se guardan en algún lado? ¿cómo lo hacen los demás?". Foco de este eje = PERSISTENCIA / HISTORIAL (no el live ranking, ya cubierto).

> NOTA DE MÉTODO: en este turno WebSearch y WebFetch quedaron DENEGADOS por el entorno. No pude correr búsquedas nuevas. Lo que sigue se apoya en fuentes ya verificadas en turnos previos (citadas) + inferencia marcada como tal. Pendiente de confirmar fresco: si las apps de Americano guardan récord por jugador y qué muestra exactamente el perfil Playtomic en historial.

### Apps de Americano — persistencia [Verificado el diseño efímero / Probable la no-persistencia por jugador]
- [Verificado, turno anterior] El modelo es el EVENTO EFÍMERO: cada evento = link compartible que actualiza en vivo, pensado para el momento (TV del club), no para el archivo. Fuente: americano-padel.app, padel-americano.app.
- [Verificado] Varias funcionan SIN login / offline (padel-bracket.com: "no signup, works offline"). Sin cuenta no hay dónde colgar historial por jugador. Fuente: padel-bracket.com.
- [Probable, NO confirmado fresco hoy] De ahí se infiere que la mayoría NO persiste un récord histórico por jugador de eventos sociales: el evento queda como un link que con el tiempo muere. Es inferencia desde el diseño verificado, no dato duro. NO presentarlo como cerrado.

### Playtomic / MATCHi — historial en el perfil [Verificado, turnos previos]
- Playtomic SÍ guarda historial de partidos en el perfil + nivel 0–7 estilo ELO que evoluciona con cada partido COMPETITIVO.
- **DATO CLAVE para la decisión:** solo los partidos "competitive" mueven el nivel; los "friendly" se GUARDAN pero NO afectan el rating. El referente que sí persiste, igual AÍSLA lo social del rating a propósito. Fuente: helpmanager.playtomic.com (Friendly vs Competitive Open Matches; The Playtomic Levels & Algorithm). → Es la respuesta del mercado: separar social de "serio".

### Cruce contra PadelwIArk — módulo de stats existente
Revisada memoria project_stats_jugador (13 días, no re-verificado contra código hoy): el módulo de stats es SERIO/competitivo — winRate, evolución de winRate por torneo, comparativa de club, logros, **sugerencia de ascenso de categoría** (el admin evalúa ascensos desde ahí). Construido sobre TORNEOS y modelo `Pareja` (jugador1/jugador2 strings). El Americano es individual con compañero rotativo y score a puntos → no encaja en ese modelo ni conceptual ni técnicamente.

**Conclusión del eje:** el referente serio (Playtomic) GUARDA historial pero NO deja que lo social contamine el rating. Para PadelwIArk, cuyas stats tienen consecuencia (ascensos), mezclar resultados sociales en winRate/comparativa/ascenso es el riesgo caro. Guardar un historial liviano del evento (snapshot) es bajo esfuerzo y suma engagement sin riesgo. Detalle/veredicto en oportunidades.md.

**Fuentes:**
- https://americano-padel.app/en/
- https://padel-americano.app/
- https://padel-bracket.com/en/
- https://helpmanager.playtomic.com/hc/en-gb/articles/20535188135185-Friendly-vs-Competitive-Open-Matches
- https://helpmanager.playtomic.com/hc/en-gb/articles/20563641264145-The-Playtomic-Levels-Algorithm

---

## 2026-06-24 · ¿Construir carga de resultados + ranking final de Americano/Super 8 sociales? — cómo lo hacen los demás

**Contexto / duda de Luca:** el módulo de convocatorias ya arma fixture + parejas/rondas (motor `/eventos`). Falta decidir si vale la pena construir la CARGA DE RESULTADOS + ranking final. Su miedo: "eso se hace en el momento y muere ahí; alguien tiene que cargar los scores → fricción → nadie lo usa → desarrollo desperdiciado."

### Cómo cargan resultados las apps dedicadas de Americano (el caso 1:1 de Luca) [Verificado]
- **Americano Padel Manager** (americano-padel.app): el flujo es setup (jugadores, canchas, puntos) → jugar → "fill in the results after each round" → corona ganador. **Quién carga:** recomiendan tener a alguien en "scoreboard duty", **idealmente un no-jugador; si todos juegan, se rota la responsabilidad.** O sea: UNA persona (un teléfono), no cada jugador. Fuente: simplepadel.com (How to Play an Americano), americano-padel.app.
- **El leaderboard EN VIVO es el corazón del producto, no el resultado final.** Copy textual: "Real-time scores, automatic rankings, and big screen display. Everything included" + testimonio "Leaderboard on the big screen, members love it. We run 3 tournaments a week". La carga de scores es el medio; **el ranking en vivo proyectado en una TV es el fin.** Fuente: americano-padel.app.
- **Patrón "shareable web link que actualiza en tiempo real":** cada evento tiene un link público que se abre en la TV del club o se comparte a los jugadores para que sigan el standing al instante. Esto es lo que engancha DURANTE el evento. Fuentes: americano-padel.app, padel-americano.app ("keeps scores in one place, lets everyone see who is winning — without the spreadsheet chaos"), padelcounter.com (match key, sin instalar app, spectators miran en vivo).
- **Padelboard (de MATCHi):** dos modos de carga — **cada jugador reporta su propio score O el host reporta todos.** Confirma que el modelo "un organizador carga" es el default y el "cada jugador carga" es opcional. Fuente: padelboard.app (vía búsqueda; fetch directo vino vacío).

### Playtomic / MATCHi — partidos sociales casuales [Verificado]
- En Playtomic el resultado de un open match **se carga manualmente**: "Enter Result / Add Score" → un jugador lo carga → **el rival/compañero lo verifica** (validación cruzada). Se auto-valida a las 24h si nadie lo rechaza; si lo rechazan, queda suspendido. Fuente: playerhelp.playtomic.com (Match Results, How to edit incorrect match results).
- **El resultado alimenta el "nivel Playtomic" (rating 0–7 estilo ELO) — pero SOLO si el partido es "competitivo".** Los "friendly matches" NO mueven el nivel aunque cargues el score. Y la confiabilidad del nivel sube jugando partidos competitivos. Fuente: playerhelp.playtomic.com (Friendly vs Competitive, The Playtomic Levels & Algorithm).
- **Implicancia:** para Playtomic el resultado SÍ es central, porque su producto-estrella es el matchmaking por nivel, y el nivel se nutre del resultado. Es un loop competitivo serio. **Un Americano social de una tarde NO es ese caso de uso:** ahí el resultado vive su valor en el momento (ranking en vivo), no necesita persistir a un rating.

### El patrón de fricción — qué hace que SÍ se carguen [Verificado + Probable]
1. **Una sola persona carga (scoreboard duty), no todos.** Reduce fricción a 1 punto. El ranking en vivo le da sentido a ese rol. [Verificado: americano-padel.app, simplepadel.com]
2. **El atractivo es el ranking en vivo proyectado, NO el archivo histórico.** La gente carga porque quiere ver la tabla moverse AHORA. [Verificado por copy/testimonios de las apps]
3. **Validación cruzada (Playtomic)** solo importa cuando el resultado tiene consecuencia (sube/baja nivel). En social de una tarde es over-engineering. [Probable, muy sólido]
4. **Donde el resultado no tiene consecuencia futura, mucha gente NO lo persiste y está OK** — el valor estuvo en armar el fixture y ver quién ganaba esa tarde. Las apps dedicadas tratan el evento como efímero por diseño (link que se comparte y muere). [Probable]

**Conclusión del eje:** la carga de resultados de un Americano social tiene valor REAL pero **DURANTE el evento (ranking en vivo en pantalla), no como archivo histórico atado a stats.** El que paga la fricción es UN organizador, no cada jugador, y lo paga gustoso porque la tabla en vivo es el show. Atarlo a stats/rating del jugador (modelo Playtomic) es otro producto, mucho más pesado, y solo se justifica con masa y partidos "competitivos" recurrentes — no es el caso de un club chico AR con eventos sociales sueltos.

**Fuentes:**
- https://americano-padel.app/en/
- https://simplepadel.com/how-to-play-an-americano-in-padel/
- https://padel-americano.app/
- https://padelboard.app/
- https://www.padelcounter.com/
- https://playerhelp.playtomic.com/hc/en-gb/categories/19831360488081-Match-Results
- https://playerhelp.playtomic.com/hc/en-gb/articles/19831850222609-How-to-edit-incorrect-match-results
- https://helpmanager.playtomic.com/hc/en-gb/articles/20535188135185-Friendly-vs-Competitive-Open-Matches
- https://helpmanager.playtomic.com/hc/en-gb/articles/20563641264145-The-Playtomic-Levels-Algorithm

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

