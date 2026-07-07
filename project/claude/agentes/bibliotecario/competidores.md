# Competidores — SaaS de gestión de clubes de pádel

> Ficha por competidor. El agente la completa y actualiza con lo que investiga.
> Formato por competidor: qué hace · a quién apunta · modelo de precios · fortalezas · debilidades · qué copiar / qué evitar · fuente.

<!-- Fichas de competidores acá. -->

> Nota: fichas iniciadas el 2026-06-21 desde el ángulo "dashboard admin". Ampliar con precios/target a futuro.

## Cortclub — https://cortclub.com/
- **Qué hace:** gestión de clubes de pádel/tenis para Europa, mobile-first.
- **Dashboard (lo que más nos sirve):** ocupación cancha por cancha en tiempo real + slots libres, daily revenue, "expected funds", peak-hour analytics, booking pipeline, agenda diaria del coach con estado pagado/impago/confirmado, saldo pendiente por jugador.
- **Qué copiar:** la tesis "el dueño no ve qué cancha rinde, cuándo cae la demanda, qué coach retiene" → traducir a widgets. El dashboard mobile-first es exactamente el norte de Luca.
- **Fuente:** https://cortclub.com/ [Verificado]

## Playtomic Manager — https://playtomic.com/playtomic-manager
- **Qué hace:** el gigante. Manager de clubes + marketplace de jugadores. Single y multi-club.
- **Dashboard:** reportes de Revenues (online+offline), Occupancy, Players, Payment Collection, Payout. Analytics tiempo real para subir ocupación y bajar cancelaciones. Multi-club por ubicación/país.
- **Qué copiar:** la separación ingresos online vs offline; el foco en "reducir cancelaciones" como métrica de primera. **Qué evitar competir de frente:** su escala multi-club y marketplace.
- **Fuente:** [Verificado] links en hallazgos 2026-06-21.

## Doinsport — https://doinsport.com/en/club-padel-management-software
- **Qué hace:** gestión padel/tenis/country clubs, fuerte en autoservicio (clubes sin staff).
- **Dashboard:** occupancy rate en tiempo real, identifica "low-performing time slots", revenue, Ticket Z, stock, comparaciones, exports.
- **Qué copiar:** "identificar franjas de bajo rendimiento" y "actuá sobre data en vivo, no reportes de fin de mes" — buen copy y buena feature.
- **Fuente:** [Verificado].

## CourtReserve — https://courtreserve.com/features/
- **Qué hace:** líder en EEUU (tenis/pickleball/pádel). Orientado a clubes grandes con programas/membresías.
- **Dashboard:** real-time con top-line metrics, peak hours, court utilization, attendance, revenue, members. Embebido a Power BI/Tableau/Notion para multi-sede.
- **Qué evitar:** su complejidad de reporting B2B no aplica a un club chico de LatAm. Tomar solo "top-line metrics + peak hours".
- **Fuente:** [Verificado].

## World Padel Rating (WPR) — https://worldpadelrating.com/ [ficha 2026-07-06]
- **Qué hace:** plataforma GLOBAL de rating/ranking de jugadores + torneos. No es gestión de club: es la capa de "nivel del jugador" (competidor conceptual del sistema de categorías/ascenso, no del SaaS de canchas).
- **Lo relevante para PadelwIArk:** su tesis anti-inflado — un rating alto debe GANARSE por juego validado, revisión de coach o ranking FIP verificado. Es la respuesta del mercado al sandbagging: el nivel no se autodeclara, se valida. Refuerza que el ascenso serio necesita respaldo objetivo (títulos/validación), no auto-reporte.
- **Qué tomar:** el concepto de "cut" (umbral que impide a un jugador pasado entrar a categorías bajas) y "rating ganado, no declarado". **Qué NO copiar:** el rating global fino tipo ELO — inviable/innecesario para un club chico (ver oportunidad 2026-07-06).
- **Fuente:** https://worldpadelrating.com/faq/ [Verificado por snippet WebSearch]

## Playtomic Level (sistema de nivel, no el Manager) — [ficha 2026-07-06]
- **Qué es:** rating dinámico 0.0-7.0 (pasos 0.25) que sube/baja tras cada partido COMPETITIVO ponderando rival y margen; ~15-20 partidos para asentar; "reliability" crece con volumen. Friendly no mueve el nivel.
- **Por qué NO es el modelo para el ascenso de PadelwIArk:** exige volumen de partidos cargados que un club chico no tiene, y la categoría 1ra-8va es etiqueta gruesa, no rating. Referente para ENTENDER ranking dinámico; no para copiar en el ascenso de categoría. Detalle: hallazgos/oportunidades 2026-07-06.
- **Fuente:** playtomic.com/blog/padel-levels, playerhelp.playtomic.com [Verificado].

## ERP/POS argentinos usados por clubes para la CAJA (competencia indirecta) — [ficha 2026-07-06]
- **Por qué figuran acá:** hoy muchos clubes de pádel manejan las canchas con un software y la CAJA del bar/kiosco con un POS aparte. Ese POS es competencia indirecta del módulo Pagos/Caja de PadelwIArk.
- **Dux Software** (ERP PYME AR): Tesorería con apertura/cierre de caja diaria, fondo inicial por forma de pago, cálculo de diferencia declarado vs sistema, usuario que abrió, multi-caja por sucursal. Robusto pero genérico (no entiende de canchas ni turnos). Fuente: ayuda.duxsoftware.com.ar/articles/7866135, 7883706 [Verificado].
- **Fudo / Bistrosoft** (POS gastronómico AR, corren sobre Android): arqueo de caja POR TURNO con monto inicial, efectivo esperado = inicial + ventas efectivo, "Según sistema" lista ventas/propinas/movimientos, opción "Usar en arqueo" para egresos con plata del cajón, terminal que automatiza el conteo. Es el estándar del BAR. Fuente: soporte.fu.do/articles/11730865, 11730868 [Verificado].
- **Qué copiar:** el flujo apertura→fondo→cierre→conteo→diferencia (ver oportunidades OP-CAJA-1..3). **El argumento de venta:** si PadelwIArk suma arqueo físico, reemplaza al POS del bar y el club deja de pagar/operar dos sistemas. Playtomic/Matchpoint NO cubren arqueo físico [Probable] → hueco de vertical.

## Otros a fichar más adelante
- **TPC Matchpoint** (occupancy + income con filtros). **PadelOS** (padelos.co — homónimo del nombre viejo del proyecto, tiene Reports & Analytics). **PlayByPoint / Playbypoint**, **360Player**, **Playpass**, **Padel iQ** (stats). [Verificado existencia, sin ficha].
