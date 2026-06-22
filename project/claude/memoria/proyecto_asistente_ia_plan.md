# Plan — Asistente IA de PadelwIArk

**Estado:** EN CONSTRUCCIÓN. Última actualización 2026-06-22.
**Visión:** Un asistente IA que ayuda al dueño a **llenar canchas y reducir tareas tediosas**, pasando de "pantalla con botones" (reactivo/pull) a "te toca el hombro y te dice qué conviene hacer, con la acción lista" (proactivo/push). Diferenciador de marca de PadelwIArk.

Modelo: **Claude Haiku 4.5** (`claude-haiku-4-5`), barato (~$0.001/llamada), grounded en agregados reales del club (sin PII). SDK `@anthropic-ai/sdk`. Key en `.env` (Railway en prod). Para Haiku se usa `messages.create` plano (sin `effort`/`thinking`).

---

## YA CONSTRUIDO (al 2026-06-22)

Todo vive en el backend `lib/insight.js` (motor) + rutas en `routes/clubs.js` (solo dueño, `requireOwner`), y en el frontend en la tarjeta **"Insight del día"** del dashboard admin (`AdminDashboardPage.jsx`, estética Court Noir).

1. **Insight del día** (cacheado 24h en `club.config.insightDelDia`). `GET /me/insight`. Una recomendación de negocio accionable a partir de ocupación, tendencia 7d, deuda y **franjas muertas**. Ver [[project_insight_dia_ia]].
2. **Convocatoria Americano/Super 8 para WhatsApp** (on-demand). `POST /me/insight/convocatoria-mensaje`. Mini-form (modalidad + día + horario + categoría + cupos) → la IA redacta un mensaje para pegar al grupo. Editable + copiar. Semilla del módulo Convocatorias ([[project_convocatorias_matching]]).
3. **Post de turnos disponibles** (on-demand). `POST /me/insight/post-disponibilidad`. Toma los turnos libres REALES del día (`gatherDisponibilidad`: franjas del club menos lo ocupado, descontando TF y ausencias) y la IA arma el posteo (WhatsApp/IG/FB). Selector hoy/mañana. Editable + copiar.
4. **Aviso de turno liberado** (on-demand). `GET /me/insight/liberados` (lista turnos liberados por cancelación/ausencia que SIGUEN libres — cruza contra disponibilidad real para no ofrecer un slot re-tomado) + `POST /me/insight/post-liberado` (la IA arma el aviso de re-publicación). Editable + copiar.

Patrón común: `gather*` junta datos reales (sin PII) → `generar*` llama a Haiku → el front muestra el texto **editable** (la IA da el borrador, el admin es el editor final) + **Copiar**. Nunca se publica nada automático: el admin controla el texto y dónde lo pega. Las 3 acciones (2, 3, 4) son **on-demand** (no cacheadas); solo el insight (1) se cachea 24h.

5. **WIarky — mascota + chat (paso "chat" ARRANCADO, 2026-06-22).** El asistente tiene cara: **WIarky**, pelotita de pádel (`components/asistente/AsistentePelota.jsx` + `AsistenteWiark.jsx`, FAB flotante en el panel admin, NO invasivo). Su panel es un **chat grounded de LECTURA**: `responderChat(clubId, mensajes)` arma un snapshot real del club (ocupación, libres hoy/mañana, tendencia, horas muertas, deuda, jugadores, torneos) como `system` de Haiku con regla de no-inventar; `POST /me/insight/chat` (solo dueño). Multi-turno. Ver [[project_wiarky_mascota]]. **Falta:** que el chat *haga* acciones (tool use) y voz.

---

## ROADMAP — Proactividad (motor de nudges)

Hoy todo es **pull** (el admin abre y clickea). El próximo salto es **push**: el asistente detecta una oportunidad y deja un **aviso accionable**.

### Concepto: el nudge reusa el modelo `Notificacion`
Un nudge NO es infra nueva: es una `Notificacion` con tipos nuevos (`nudge_disponibilidad`, `nudge_liberado`, etc.) cuyo `data` lleva: un **texto de asistente** + una **acción** (`post_disponibilidad` / `post_liberado` / `convocatoria` + parámetros). El botón del front sabe qué generador abrir y lo precarga.

### Disparadores
- **Por tiempo (aviso de la mañana):** un **cron en Railway** (~8am) recorre clubes activos, calcula los libres del día (`gatherDisponibilidad`) y crea el nudge *"☀️ 12 turnos libres hoy. ¿Te armo el posteo?"*. **Pieza nueva: el cron.** El resto ya existe.
- **Por evento (se liberó un turno):** la cancelación/ausencia YA crea una notif al admin (`turno_liberado_auto` / `cancelacion_reserva`). Solo se le agrega la **acción** "¿Publicamos?". **El más barato.**

### UI: el insight pasa a ser el "briefing" del asistente
La tarjeta del insight muestra el saludo + lo accionable del día con botones de 1 clic: "12 libres → armar posteo", "2 se liberaron → republicar", "franja muerta el martes → convocar Americano". También aparece en la campana.

### Regla anti-molesto (clave)
Un solo aviso a la mañana (no 12); cancelaciones **agrupadas** si hay varias; **toggle** para silenciar o elegir horario; nunca manda nada afuera solo.

### Escalera de proactividad
| Paso | Qué hace | Esfuerzo |
|---|---|---|
| Hecho | Acciones pull (3 botones) | ✅ |
| **1 — Nudges in-app** | Campana/insight te avisa con botón. Cancelación = chico (evento ya existe). Mañana = + cron Railway | Chico-medio |
| 2 — Canal externo | Push PWA y/o **WhatsApp al dueño** ("che, se liberó un turno") para que llegue sin abrir la app | WhatsApp = grande (Business API) |
| 3 — Semi-auto | El admin aprueba con un tap y el asistente publica. Auto-post a IG/FB = pesado (Meta API) | Grande |

El **mismo motor de nudges** sirve para Convocatorias ("se llenó el Americano, ¿genero el fixture?", "faltan 2, ¿reenvío?"). Es la **capa proactiva** que después usan todas las features.

---

## Secuencia futura del asistente (visión larga)
insight → **acciones** (hecho) → **proactividad/nudges** (próximo) → **chat** ("preguntale a tu club": el admin pregunta sobre sus números y la IA responde) → **voz**.

## Pendientes / decisiones abiertas
- Gating como feature premium (hoy las acciones son solo-dueño, sin gating de plan). Ver [[project_feature_gating]].
- Canal externo real: WhatsApp Business API al dueño (sirve para nudges Y convocatorias). Ver [[project_whatsapp_notif]].
- Auto-post a redes (IG/FB) con imagen (reusar Satori de flyers) — bloque pesado, futuro.
- Capa de abstracción de proveedor (no casarse con Anthropic) — evaluar a futuro.

Relacionado: [[project_insight_dia_ia]] [[project_convocatorias_matching]] [[project_super8_americano]] [[project_dashboard_resumen_admin]] [[project_whatsapp_notif]].
