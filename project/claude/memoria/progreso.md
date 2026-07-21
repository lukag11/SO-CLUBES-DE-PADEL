# Progreso del Proyecto

**Última actualización:** 2026-07-18 — **COMPROBANTE INTELIGENTE con IA (transferencia).** Estado "en revisión" tipo banco + IA lee el comprobante y da veredicto + auto-saldar opcional. Ver bloque abajo. + Pago MP jugador probado en vivo ✅ + anti doble-click.

**TRANSFERENCIA CON IA — "comprobante inteligente" (2026-07-18, 4 slices).** Upgrade del flujo simple. El club elige su nivel: MP (comisión, automático) / transferencia con IA (gratis, la IA verifica) / auto-saldar (gratis + automático, riesgo del comprobante asumido). Ver [[project_transferencia_ia]].
- **Modelo `AvisoTransferencia`** + estado "en revisión" (la deuda NO se salda por la palabra del jugador; pasa por revisión).
- **IA (`lib/ocrComprobante.js`, Claude vision):** lee el comprobante (monto/alias/fecha) → compara con la deuda + alias del club → veredicto coincide|no_coincide|dudoso. Reusa el patrón del OCR de gastos.
- **Jugador:** "Ya transferí" + adjunta comprobante → "🕓 en revisión". **Admin:** notif con veredicto IA + "Ver comprobante" + Confirmar/Rechazar (1 click, salda con método transferencia).
- **Auto-saldar (config del club):** si ON + IA coincide → se salda solo. Toggle con el trade-off explícito ("un comprobante se puede falsificar").
- **Pendiente:** probar el OCR en vivo con un comprobante real.

**TRANSFERENCIA (2026-07-18).** El club carga su **alias + titular** (Config→Club, se guarda en config); el jugador ve "Pagar por transferencia" en Mi consumo (alias+copiar+"Ya transferí"); el aviso llega a la campana del dueño (`aviso_transferencia`), que cobra a mano con método transferencia. **NO se salda sola** (transferencia = sin verificación automática). **Privacidad:** el alias se strip-ea del `GET /:slug` público (landing) y se sirve solo al jugador logueado por `GET /api/pagos/me/transferencia`. Ver [[project_mercadopago_fase2]].

**ANTI DOBLE-CLICK (2026-07-18):** `savingRef` (candado síncrono) en Cobrar cuenta / Anotar / link / QR (ModalCuentaJugador) + Cobrar-y-cerrar / QR mesa (VentasTab). El `if(saving)return` viejo no frenaba el doble-click rápido (setSaving async) → causaba el 500 por contención Serializable.

**MP JUGADOR v2 — "Pago en proceso" + QR (2026-07-15).** Sobre el pago del jugador: el link que genera el admin (o el jugador) ahora **aparece en "Mi consumo"** como tarjeta "Pago en proceso · [Pagar ahora]" (`GET /pagos/me/links-vivos`); el botón "Pagar con MP" **excluye lo ya linkeado** (`linksVivosDeDeudas`) → genera solo por el resto, nunca solapa ni bloquea con mensaje de admin. **QR** en el dash (`qrcode.react`) al pagar (modal). Ver [[project_mercadopago_fase2]].
- **✅ PRUEBA VIVA HECHA (2026-07-18):** el jugador pagó con OTRA cuenta → webhook acreditó → deuda saldada sola (verificado: saldo $0) → notificación al dueño creada ("Luca pagó por MP · $100"). **Circuito end-to-end confirmado con plata real en producción.**
- **QR de billetera (interoperable) — mejora futura:** el QR actual es el init_point del checkout (se escanea con cámara común, abre la URL); NO se puede escanear desde "Pagar con QR" de un banco/billetera (da "QR inválido"). Para eso hace falta el QR de cobro de MP (API Órdenes). Prioridad baja.
- **Bug transitorio (no de código):** "Error al cobrar la cuenta" en prod al cobrar 12 deudas en efectivo — mismo payload OK en localhost. Contención Serializable (6 reintentos). Fix pendiente: anti doble-click en el botón "Cobrar".

**MP PAGO DEL JUGADOR + NOTIF AL DUEÑO (2026-07-15). HECHO, SIN PROBAR EN VIVO.** Cierra el autoservicio de cobro. Ver [[project_mercadopago_fase2]].
- **Backend jugador:** `POST /api/pagos/me/link-pago` (`requireRole('jugador')`). 🔒 `jugadorId=req.user.id` del TOKEN (nunca del body) → solo paga SUS deudas. Junta cargos pendientes + turnos impagos → link.
- **Front jugador (`PlayerPagosPage`):** botón "Pagar con Mercado Pago · $saldo" → checkout → webhook salda solo.
- **Notif al dueño (webhook):** `notificarPagoAdmin` crea `Notificacion` tipo `pago_mp` (admin) al acreditar CUALQUIER pago MP (jugador, Cobranzas, venta, mesa). Campana: `notificacionesStore` + `Navbar` (formatNotif + NOTIF_META Wallet). "Luca pagó por MP · $X · N deudas".
- **Flujo redondo:** jugador paga solo → deudas salen de la cuenta corriente + Pago en caja (ya existía) → dueño recibe aviso (nuevo). **Pendiente: probar en vivo.**

**MP QR PRESENCIAL en punto de venta (S1+S2+S3, 2026-07-14).** "Mercado Pago" en venta/venta-rápida/mesa antes marcaba pagado SIN cobrar (income fantasma); ahora genera un **QR** (checkout renderizado con `qrcode.react`) → cliente escanea → paga → webhook confirma. Reusa preferencia+webhook+PagoMP+anti-duplicado+auto-cancel. Ver [[project_mercadopago_fase2]].
- **S1 venta a jugador** (`PagosPage`): "Generar QR de pago" → crea venta PENDIENTE (`/productos/venta` con `createManyAndReturn` devuelve `cargoIds`) → `/pagos/link-pago` → panel QR. Webhook imputa.
- **S2 mostrador (jugadorId=null):** se relajó el guard "mostrador al contado" en `/productos/venta` y `/cargos` (pendiente solo si método=mercadopago). `crearLinkPagoMultiple` acepta sin jugador.
- **S3 mesa/comanda:** `crearLinkPagoComanda` + `POST /api/comandas/:id/link-pago` (PagoMP `origen='comanda'`). `VentasTab`: botón QR, mesa queda ABIERTA. Webhook `origen==='comanda'`: approved→cierra la mesa (`updateMany` + comanda cerrada, mecanismo legacy); refunded→reabre. Cierre por caja cancela el link vivo.
- **Dep nueva:** `qrcode.react ^4.2.0`.
- **PENDIENTE VISUAL (no bloqueante):** el panel del QR en venta se ve chico y el botón "Listo" se corta abajo (modal `max-w-md`/`max-h-[90vh]`). Luca quiere el modal MÁS GRANDE, sin scroll. Ya tiene X para cerrar. **Corregir después.**

**MP LINK ROBUSTO — bloque Cobranzas (2026-07-14).** El link pasó de "1 deuda, sin visibilidad" a flujo completo. Probado en vivo (link real por 8 deudas $129.146). Ver [[project_mercadopago_fase2]].
- **Modelo:** `PagoMP` sumó `jugadorId String?` + `items Json?` (nullable, `db push` a Supabase remoto, migración no destructiva). `origen` puede ser `'multi'` (refId=jugadorId, deudas en `items`). Cliente Prisma regenerado (bajó/subió backend por EPERM de Windows).
- **Link múltiples deudas (Opción A):** `crearLinkPagoMultiple` en `cobrosMP.js` (suma restantes, exige mismo jugador, 1 preferencia por el total). Webhook imputa FIFO a todas (`imputarPagoTx` ya tomaba `items[]` — 1 línea de cambio). Endpoint `/api/pagos/link-pago` acepta `items[]`. Front: botón con varias ("Link de pago (N)") + panel "N deudas · $total".
- **Anti-generar-duplicado (RN-77):** `_reusarOChocar` — reusa si set idéntico, **bloquea 409 `link_vivo`** si solapa. Front deshabilita el botón ("Link activo ↑") si la selección ya tiene link.
- **Visibilidad + recupero:** `GET /api/pagos/links-vivos?jugadorId=`. Front: cartel "Link activo · $X · N deudas · vence en Y" con Copiar/WhatsApp (reenviar el mismo) / Cancelar + badge "🔗 esperando pago" por deuda.
- **Cancelar + anti-doble-cobro:** `POST /api/pagos/link-pago/:id/cancelar`. Aviso antes de cobrar efectivo una deuda con link vivo. **Auto-cancelación** (`cancelarLinksDeItems`): cobrar por otro medio mata el link vivo — enganchado en `cobrar-cuenta` + `PATCH cargo/:id/estado` pagado. Sin fantasmas. Red de atrás: sobrepago RN-75.
- **PRÓXIMO (mesa limpia):** MP en punto de venta = **QR presencial** (venta/venta rápida/mesa hoy marcan pagado sin cobrar → income fantasma). S1 venta a jugador, S2 mostrador, S3 mesa/comanda. Falta `qrcode.react` + `/productos/venta` con `createManyAndReturn`.

**MP OAuth — S5 QA aislamiento multi-tenant + fix refresh (2026-07-14).** Cierre del bloque OAuth. Ver [[project_mp_oauth_diseno]].
- **S5 — auditoría de aislamiento (qa-flujos): APTO para producción multi-club, 0 fugas entre clubes.** Se trazaron 10 escenarios de ataque contra `mpOAuth.js`, `mercadopago.js`, `cobrosMP.js`, `webhooks.js`, `cripto.js`, `cargos.js`, `pagos.js`, `schema.prisma`, `auth.js`. Todo SEGURO: token isolation (`resolveMpToken` filtra por `clubId`), webhook cross-tenant (re-consulta con token del club + R1 `pagoMP.clubId===clubIdPath`), state single-use server-side, anti-takeover `mpUserId @unique`, disconnect scoped, `/estado` sin tokens, cifrado GCM con tag validado, sin tokens en logs, `external_reference=PagoMP.id` re-resuelto server-side. Informe en `project/claude/agentes/qa/registro-auditorias.md`.
- **🟡 Fix del refresh de token APLICADO (`lib/mercadopago.js`):** (1) **lock en memoria por clubId** (`refrescosEnVuelo` Map, coalescing) → un solo refresh por club a la vez, elimina la race de rotación del `refresh_token`. (2) **No degradar a `desconectado` ante fallo transitorio**: solo se desconecta ante error PERMANENTE (`invalid_grant`/HTTP 400/401, vía `esErrorPermanenteOAuth`); ante red/5xx se cae al `access_token` vigente (válido <15d) y se reintenta después. `oauthToken` propaga `httpStatus`+`mpError`. Sintaxis verificada (`node --check`).
- **🟠 PENDIENTE operativo (config Railway, NO código):** antes del 2º club real, **vaciar `MP_ACCESS_TOKEN` en Railway** (hoy es fallback global del demo single-club; con multi-club un club sin conectar cobraría a esa cuenta por error → con la var vacía da 503 hasta que conecte la suya).
- **Follow-up seguridad (antes de escala real):** firma x-signature del webhook obligatoria en prod (`MP_WEBHOOK_SECRET`, hoy soft; el candado duro sigue siendo la re-consulta).
- **Doc del equipo actualizada:** `Documents/PadelwIArk-Manual-Equipo.html` — Sección 5 (OAuth de "cómo será" → "ya funciona + auditado", con las 4 barreras de aislamiento y el fix), tabla de estado y roadmap.

**MP OAuth multi-tenant — Slice 0: cripto + tablas (2026-07-13).** Diseño validado por security-architect (ver [[project_mp_oauth_diseno]]): cada club conecta SU cuenta de MP (los cobros van a su cuenta). 2 reglas críticas: R1 clubId en la URL del webhook (`/webhooks/mercadopago/:clubId`), R2 el clubId del callback sale del `state` server-side (no de query param).
- **`lib/cripto.js`**: cifrado AES-256-GCM de tokens at-rest (`encryptToken`/`decryptToken`, formato `iv:tag:ct`, clave `MP_TOKEN_ENC_KEY` env 32B base64). Detecta manipulación (GCM auth). 3 tests (`cripto.test.js`, autocontenidos) → 48/48.
- **Modelos** `MpConexion` (1-1 con Club: mpUserId @unique, accessTokenEnc, refreshTokenEnc, expiresAt, keyVersion, estado) + `MpOAuthState` (state @unique, clubId, usedAt, expiresAt). `Club.mpConexion` — NUNCA en `include` de lecturas ni en `config` (que se serializa al front). Tablas creadas (db push).
- **`MP_TOKEN_ENC_KEY`** generada + en `.env`, verificada (cifra tokens reales). NO se pierde/cambia una vez en uso. Pendiente: misma clave en Railway al deployar.
- **Slice 1 HECHO (código):** helpers OAuth (`intercambiarCodeOAuth`/`refrescarTokenOAuth`) en `mercadopago.js`; rutas `routes/mpOAuth.js` (`/start` requireOwner+state single-use; `/callback` público amarrado por state, canje del code, anti-takeover, upsert `MpConexion` cifrado). Montadas. Panel MP: redirect_uri registrada, permisos read+write+offline_access, Client ID `2626354848675072` + Secret en `.env`. 48/48 tests.
- **Slice 1 PROBADO en vivo:** se conectó un vendedor de prueba (cuenta MP 151451037), `MpConexion` guardada CIFRADA, token descifrado y validado contra MP (HTTP 200). Reglas R2 (state) + cifrado confirmados.
- **Slice 2+3 HECHO (acoplados):** `resolveMpToken(clubId)` ahora es **async** → usa la cuenta conectada (MpConexion, descifra + refresh proactivo <15d; si falla → estado 'desconectado'); fallback env para transición. `mpConfigurado`/`clientFor` async (cargos/pagos con `await`). `crearPreferencia`/`obtenerPago` con `await clientFor`. **Verificado:** el link ahora crea la preferencia en la cuenta CONECTADA (pref_id `151451037-…`). Webhook pasa a **`POST /api/webhooks/mercadopago/:clubId`** (clubId en la notification_url) → resuelve token del club + verifica `pagoMP.clubId===clubId` (R1 anti cross-tenant); ruta legacy `/mercadopago` (env) para links viejos. 48/48 tests.
- **Slice 4 (UI) HECHO:** rutas reorganizadas bajo `/api/mp` (`/oauth/start`, `/oauth/callback`, `/estado`, `/disconnect`). `GET /api/mp/estado` (cualquier admin, sin token → `{conectado, mpUserId, expiraAt, estado, desconectadoMotivo}`). `POST /api/mp/disconnect` (requireOwner, borra la MpConexion del club). UI: sección **"Mercado Pago"** en Club→Información (`QuienesSomosPage.jsx`, componente `MercadoPagoConexion`): botón "Conectar Mercado Pago" (→ `/oauth/start` → redirect a MP) / estado "Conectado ✓ · cuenta X" + "Desconectar"; toast al volver (`?mp=ok|error|cuenta_en_uso`) + limpia el query; staff ve estado pero no conecta. Verificado en vivo: conectar/desconectar/reconectar funcionan. Nota: al conectar desde localhost, el retorno va al front de PROD (APP_PUBLIC_URL de Railway) — en prod real es consistente.
- **OAuth S0-S4 COMPLETO.** Falta **S5: QA con 2 clubes** (aislamiento: club A jamás usa/ve token de B; doble-webhook; refund; token vencido; callback error/state reusado). Follow-ups seguridad (antes de producción real con plata): firma webhook obligatoria en prod (`MP_WEBHOOK_SECRET`) + lock en refresh (concurrencia).

**MERCADO PAGO Fase 2 — cobro real de deudas por link (Slices 0-2.5, 2026-07-13).** Plan auditado por asesor-financiero + código auditado por qa-flujos (**APTO**). Ver memoria [[project_mercadopago_fase2]] (RN-70..77).
- **S0:** modelo `PagoMP` (fuente de verdad del intento, `mpPaymentId @unique`) + tabla `pagos_mp` (db push). SDK `mercadopago`. App MP "PadelwIark Cobros" (Checkout Pro, sandbox). Token en `.env` `MP_ACCESS_TOKEN` (validado contra API), NO en `config` (evita leak). `lib/mercadopago.js`.
- **S1:** `POST /api/cargos/:id/link-pago` → crea `PagoMP` + preferencia Checkout Pro → devuelve `init_point` (link WhatsApp). Reusa link vivo, expira 7d. **Probado**: genera link real de sandbox (201).
- **S2.5:** `imputarPagoTx` en `lib/pagos.js` = FIFO+Pago compartido; `cobrar-cuenta` refactorizado para usarlo (idéntico). Capa al restante + devuelve `excedente`.
- **S2:** webhook `POST /api/webhooks/mercadopago` (público): re-consulta a MP (nunca el body), idempotente por `mpPaymentId`, approved→imputa en Serializable + avisa sobrepago (parcial/total) y doble-pago, refunded/charged_back→revierte (reabre deuda). 45/45 tests OK.
- **Deploy + prueba VIVA:** `MP_ACCESS_TOKEN` en Railway, webhook vivo en prod, probado end-to-end con comprador de prueba MP → pagó $5010 → deuda marcada `pagado` sola. ✅
- **S3 (UI):** botón "Link de pago" en Pagos→Cobranzas (aparece con Método=mercadopago + 1 deuda) → panel Copiar/WhatsApp + aviso anti-doble-cobro.
- **Turnos + unificación:** el link sirve para cargo O turno impago. Helper `lib/cobrosMP.js` + endpoint unificado `POST /api/pagos/link-pago`. `/cargos/:id/link-pago` delega. Webhook toma jugadorId de reserva/cargo. Probado 201.
- **Caso A COMPLETO** (auditado asesor+QA, probado en vivo). Próximo: OAuth MP por club (cobrar a cuentas reales), luego QR + transferencia. Doc del equipo: `Documents/PadelwIArk-Manual-Equipo.html`.

**POST-DEPLOY: logo en footer + trust proxy + fix flash de recarga (2026-07-13).** Pulido con el demo ya en producción.
- **Logo del club en el footer** de los **5 templates** de landing: antes mostraban el ícono `Zap` genérico; ahora, mismo patrón que `PublicNavbar` → `logo ? <img> : <Zap>` (fallback), fondo transparente si hay logo. Se agregó `logo` al destructure de club en cada template.
- **Seguridad — `app.set('trust proxy', 1)`** en `app.js`: detrás del proxy de Railway, `express-rate-limit` ahora lee la IP real (X-Forwarded-For) y no la del proxy → el anti-fuerza-bruta cuenta bien. `1` (no `true`) para que no se pueda falsear la IP. Ver [[project_deploy_pendiente]].
- **Fix del "flash" al recargar la landing** (mostraba nombre/ícono por defecto + spinner "Cargando..." hasta que llegaba el fetch del club). Solución **stale-while-revalidate** en `clubStore`: cachea el último club por slug en `localStorage` (`padelos_club_cache_<slug>`), al arrancar **hidrata `club` + aplica colores** desde la caché, y `loadFromBackend` reescribe la caché. `LandingPage` saltea el spinner si ya hay `club.id` cacheado. **Quirúrgico:** `_loaded` sigue en `false` → skeleton del admin y páginas públicas de torneos SIN cambios. Segunda recarga = sin parpadeo.

**🚀 DEPLOY A PRODUCCIÓN (2026-07-13).** Primer deploy real de PadelwIArk. Guiado paso a paso ([[feedback_guiar_paso_a_paso_infra]]). Detalle e infra en memoria [[project_deploy_produccion]] + pendientes post en [[project_deploy_pendiente]].
- **Backend → Railway** (plan Hobby ~$5/mes): servicio desde repo GitHub, Root Directory `project/apps/backend`, auto-deploy on push a `main`. Vars = las del `.env` (SIN `PORT`, Railway lo inyecta) + `FRONTEND_URL`/`APP_PUBLIC_URL` = URL de Vercel (CORS, match exacto sin barra final). URL pública + health `/api/health` → 200.
- **Frontend → Vercel** (Hobby, gratis): proyecto reusado "claude", Root Directory `project/apps/frontend`, dominio **`padelwiarkdemo.vercel.app`** (se dejó `padelwiark.vercel.app` LIBRE para la marca real). Vars: `VITE_API_URL` (=Railway + `/api`), `VITE_CLUB_SLUG`, `VITE_CLUB_ID`.
- **3 fixes de código para que buildeara/arrancara** (commits `7acd0b5`, `a5d631c`, `dad24cb`): (1) `postinstall: prisma generate` (sino crashea `@prisma/client`); (2) `engines.node: "22.x"` (supabase-js crea RealtimeClient que en Node 20 exige WebSocket nativo → crash; Node 22 lo trae); (3) `usePlayerStats.js` alineado a `VITE_API_URL` **con** `/api` (era la única excepción que lo esperaba sin `/api` → hubiera dado `/api/api/...` en prod) + **`vercel.json`** con rewrite SPA a `/index.html` (deep-links/refresh de React Router).
- **Datos:** entra con su MISMO usuario/contraseña (migramos toda la data local al Supabase nuevo; `JWT_SECRET` sin tocar). **Imágenes:** Luca las re-sube (los archivos viejos no se migraron; Storage nuevo probado OK).
- **Pendientes post-deploy (no bloqueantes):** re-subir imágenes, `app.set('trust proxy',1)` (rate-limit tras proxy Railway), egress punto 2 (caché imágenes), guía onboarding de club nuevo (Luca la pidió), Mercado Pago Fase 2 (ahora posible con webhook público), verificación email del signup self-service, bajar body limit a ~2mb, revisar `/api/dev` expuesta.

**MIGRACIÓN A SUPABASE REMOTO DEDICADO + FIX EGRESS (polling) + FIX categorías** — se pasó la app del Postgres local a una cuenta de Supabase NUEVA y exclusiva de PadelwIArk (DB + Storage), con toda la data local migrada "como club real"; y se corrigió la causa real del egress (14 pollings pausados con `document.hidden`). Ver bloque abajo. **Nota: el DEPLOY lo decide Luca, no empujarlo ([[feedback_deploy_luca_decide]]).**

**MIGRACIÓN SUPABASE REMOTO + EGRESS + CATEGORÍAS (2026-07-12).** Preparación de deploy. Ver [[project_deploy_pendiente]], [[project_egress_predeploy]], [[project_dev_local_postgres]], [[feedback_guiar_paso_a_paso_infra]].
- **Supabase remoto dedicado:** se creó una cuenta/proyecto de Supabase NUEVO y separado (solo PadelwIArk, no compartido con los otros proyectos del equipo — evita single-point-of-failure). Región São Paulo (`sa-east-1`). Se migró la **DB** (schema con `migrate deploy` + `db push` para sincronizar el drift, + toda la data local vía `pg_dump --data-only | psql`, excluyendo `_prisma_migrations`) y el **Storage** (bucket `media` público). `.env` limpiado: `DATABASE_URL`/`DIRECT_URL` y `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` apuntando al proyecto nuevo (se usó la **secret key nueva `sb_secret_`**, no la legacy JWT). Subida de imagen probada OK. Nota conceptual aclarada a Luca: DB/Storage remotos ≠ deploy; el código sigue local hasta Railway/Vercel. El `JWT_SECRET` del `.env` es propio del backend (firma los tokens de login de los usuarios), NO tiene que ver con Supabase — no se toca ahora, sí hay que cargarlo en Railway al deployar.
- **Fix egress (polling) — [[project_egress_predeploy]] punto 1 HECHO:** los 14 `setInterval` que pegan al server (15–30s) ahora llevan guarda `if (!document.hidden)` → con la pestaña oculta/minimizada NO consultan (cero egress). Archivos: `AdminDashboardLayout` (×2), `PlayerLayout` (×2), `AdminDashboardPage`, `ConvocatoriaPublicaPage`, `PartidoPublicoPage`, `PartidosPublicosPage`, `PlayerReservasPage` (×2), `PlayerTurnosFijosPage`, `ReservasPage` (×2), `TorneoPublicoPage`. Cambio de 1 línea c/u; con pestaña visible el comportamiento es idéntico + los `onFocus` refrescan al volver. `LandingSections:1717` NO se tocó (timer local, no red). **Pendiente (punto 2):** caché/transform de imágenes de Storage.
- **Fix categorías (matching):** `lib/convocatorias.js` (notif de convocatoria a la categoría) y `routes/solicitudes.js` matcheaban `Jugador.categoria` por `in` exacto → `"4ta"` no matcheaba `"4ta Categoría"` y la notif no salía. Ahora se normalizan ambos lados (`normalizarCategoria`) y se filtra por Set normalizado. Ver [[project_categorias_formato_canonico]].
- **Limpieza:** se borraron 4 archivos basura de 0B (`Consultando`, `FALTA`, `b.prioridad`, `p.jugadorId`) creados por redirecciones `>` sueltas ([[feedback_bash_comillar_codigo_js]]).

**TORNEOS (cards) + FINANZAS mobile + WIarky PROACTIVO (2026-07-12).**
- **Torneos — tabla de zona (`TorneoDetallePage`, `StandingsZonaAdmin` + partidos):** (1) **Posiciones** ahora como el dash jugador: nombres de pila (`jugador1.split(' ')[0]`), celda `max-w-[38vw] lg:max-w-none` + paddings/anchos compactos + `overflow-x-auto` (antes `max-w-0` cortaba a "G..."). (2) **Enfrentamientos (grilla cruzada) ELIMINADA** (+ su `getCell`/`hayResultados`). (3) **Partidos: tabla de 5 columnas → CARDS** estilo jugador (fila pareja1 / pareja2 con nº + nombres + games por set, ganador resaltado; pie con día·hora·cancha + "Eq.N ganó" o botón "Cargar resultado"). **Reusa toda la lógica de carga** (`expandedId` + `SetInputInline` + `onResultado`) dentro de la card — no se perdió la edición. Pedido de Luca (más simple, mobile).
- **Finanzas mobile (`PagosPage` + `GastosTab`):** (1) menú del engranaje (config) se salía por la izquierda → `left-0 sm:left-auto sm:right-0` + `max-w-[calc(100vw-2rem)]`. (2) filas de **Cobranzas** y **Gastos** apiladas en mobile (`flex-col sm:flex-row`): info/nombre a todo el ancho arriba, monto + acciones abajo (`justify-between sm:justify-end`) — antes el nombre cortaba a "J...".
- **WIarky RESPONSIVE + PROACTIVO — [[project_wiarky_proactivo_nudges]]:**
  - **Mobile:** sin drag (ignora la pos guardada de desktop, que lo dejaba off-screen → por eso "no lo veía"), **dock fijo abajo-derecha**; el chat abre **full-screen** (`fixed inset-0 z-[60]`) → la barra de input deja de estar apretada. Desktop sigue arrastrable. Detecta mobile con `matchMedia('(max-width:1023px)')`.
  - **Proactivo (3 slices):** Slice 1 = el globito muestra la sugerencia real en vez del saludo. Slice 2 = **motor de nudges**: nuevo endpoint **`GET /clubs/me/nudges`** (reglas DETERMINISTAS, cero IA → barato, no quema egress; reusa `gatherInsightData` + `sugerenciaDeInsight` + query de `arqueoCaja`): 🔴 caja sin abrir, 🔴/🟠 plata sin cobrar, 🟠 franja fría → Super 8; devuelve lista priorizada con `corto`/`mensaje`/`artefacto` (botón). El front muestra el más urgente en el globito + **puntito con contador** en la pelotita + **throttling** (la X descarta por el día vía localStorage). Slice 3 = el chat al abrir **inyecta los nudges como mensajes con sus botones** (caja/cobranzas/Super 8) y saca la duplicación del viejo chequeo de caja. Una sola fuente. **PENDIENTE (fase 2):** más reglas (stock bajo, TF en riesgo) + refinar. Ver [[project_wiarky_caballo_batalla]], [[project_insight_dia_ia]].

**RESPONSIVE MOBILE — bloque 1 (2026-07-11 tarde 6).** Arranque del responsive con método: guía viva (`project/claude/context/responsive-guia.md`), auditoría read-only por agente superficie por superficie, loop pantalla-por-pantalla, y **regla de oro: solo mobile, `md:`+ intacto** ([[feedback_responsive_solo_mobile]], [[project_retomar_responsive_wiarky]]). Testeo en DevTools device mode (360/390). Luca es analista+fullstack y va mirando el inspector en vivo → se trabaja de par a par (perfil del mentor + [[user_nombre]] actualizados).
- **Landing pública:** 🔴 scroll horizontal de toda la página (selector de 7 días variante `columns`, Templates 2/3/4/5) → en mobile chevrones ocultos + 7 días en `grid grid-cols-7 w-full`, desktop `sm:flex` igual. 🟡 hero Template2 `h-screen`→`min-h-screen`; navbar nombre club `truncate max-w-[55vw]`+`min-w-0`+`px-4 md:px-8`; Template4 sangría `pl-8`→`pl-0 md:pl-8`.
- **Área jugadores:** estaba MUY bien (cero 🔴, `PlayerLayout` con `overflow-x-hidden`). 4 🟡: dashboard hero `p-5 sm:p-8`+`grid-cols-2 sm:grid-cols-4`; fila turnos fijos `px-4 sm:px-6`; MiniStat stats `text-2xl sm:text-3xl break-words`; header mis-reservas `flex-wrap`. Grilla de reservas/login/registro/charts ya OK.
- **Dashboard admin:** shell SÓLIDO (sidebar off-canvas + `main overflow-x-hidden`). **2 🔴 = barras de tabs `w-fit` sin scroll** (Pagos `:958` y Reservas `:3371`) que recortaban pestañas (no llegabas a Gastos/Caja ni a Clases) → `max-w-full overflow-x-auto no-scrollbar`+`shrink-0 whitespace-nowrap`. 🟡: leyenda heatmap Dirección, picker TorneoDetalle `grid-cols-2 sm:grid-cols-4`, fila pagada Pagos `flex-wrap`, modal mapa Club `max-h-[90vh] overflow-y-auto`. 🟡 pendientes menores: filtros Jugadores, alerta Torneos, LogoPicker Sponsors.
- **BottomNav mobile ELIMINADA (`AdminDashboardLayout`):** era redundante con el hamburguesa y comía alto de pantalla. Se sacó el componente + items + auto-hide al scrollear + `ref` + `pb-20` del main + imports huérfanos. En mobile la nav es solo el drawer.
- **Sidebar admin — fix drawer mobile:** abría colapsado (solo íconos) y "saltaba" a completo al hoverear. Causa: `expanded = hovered` (sin contemplar mobile). Fix: `expanded = hovered || mobileOpen` → el drawer mobile abre expandido (labels + card de plan) de una. Desktop (colapso por hover) intacto.
- **GrillaMobile (Reservas) — flex → CSS Grid:** el fondo de color del turno de Cancha 1 "se pasaba" a Cancha 2 porque las celdas `flex-1` con contenido no-shrinkeable no quedaban en mitades iguales. Se pasó la fila a `grid` con `gridTemplateColumns: 4rem repeat(N, minmax(0,1fr))` → columnas idénticas garantizadas + alineación perfecta header/filas. De paso: fonts de horarios agrandadas (10px→`text-sm`), tabs de Reservas igualadas de tamaño, y `Badge` con `whitespace-nowrap`.
- **Drawer detalle jugador (`JugadoresAdminPage`) — 2 fixes:** (1) nombre largo se cortaba/cruzaba → bloque `flex-1 min-w-0` + nombre `break-words`. (2) **header recortado arriba en el bottom-sheet mobile** (avatar/nombre/DNI cortados): el hero con `overflow-hidden` es flex item de un `flex-col` de altura fija → por spec, `overflow≠visible` hace `min-height:auto = 0` → flexbox lo comprimía y recortaba. Fix: `shrink-0` en el hero. (+ más aire hero↔stats, DNI más legible.)
- **Club → Información:** el input Nombre y el textarea Descripción no tomaban el ancho del contenedor en mobile (padre `items-start`, columna `flex-1` sin `w-full`) → `w-full sm:flex-1 min-w-0`. Y se rediseñó el bloque de **cargo por cancelación** en dos campos etiquetados y alineados (`items-end`).
- **Se quitó el toggle "Modo oscuro en área jugadores"** del panel admin (era control muerto — nadie leía `modoOscuroJugadores`). El área jugadores es solo oscuro; el modo claro es feature futura y el control va en el dash del jugador, no en el admin. Ver [[project_tema_jugador_pendiente]].

**TEMPLATE 3 (MINIMALISTA) pulido + FIRMA PADELWIARK EN LOS 5 TEMPLATES** — más aire/ritmo, features encuadradas en cards, reservas con "limpieza minimal" (solo modo claro), fonts de horarios + pasados legibles con tachado; y la firma "Hecho con PadelwIArk" del footer llevada a un componente compartido y aplicada a los 5 templates. Ver bloque abajo. **Próximo: seguir con Templates 2, 4, 5 (identidad propia) + RESPONSIVE.**

**TEMPLATE 3 (MINIMALISTA) + FIRMA GLOBAL (2026-07-11 tarde 5).** Segundo bloque del rediseño de landing. Ver [[project_landing_rediseno_template1]], [[project_landing_saas_empresa]].
- **Firma "Hecho con PadelwIArk" → componente compartido `FirmaPlataforma` (en `LandingSections.jsx`) aplicado a los 5 templates.** Antes estaba inline solo en el Template 1. Ahora es un componente único (iso lima/neón de la marca + "Padelw**IA**rk" con el IA resaltado, link a `/padelwiark`); se toca en un solo lugar. En Template1/2/3 va debajo del copyright (footers centrados); en Template4/5 envuelta en `max-w-5xl` (footers de una fila). Se quitó el import de `Link` que quedaba suelto en Template1.
- **Template 3 (Minimalista) — más aire + ritmo:** padding de secciones `py-24`→`py-32`, hero `py-24`→`py-28`, espaciados de encabezado `mb-10`→`mb-14` y `mb-16`→`mb-20`. El minimalismo vive del espacio.
- **Template 3 — features encuadradas:** las 3 (Reservas/Torneos/Perfil) pasaron de ícono+texto suelto a **cards blancas con borde hairline** (`slate-200`, rounded-2xl, p-7). Hover minimal: se elevan, el borde toma el color del club (CSS var `--clr` + `color-mix`), sombra suave, ícono +scale. Pedido de Luca ("las veo sueltas, darles seriedad").
- **Reservas — "limpieza minimal" (SOLO modo claro / `!dark`, que hoy usa únicamente el Template 3; los oscuros intactos):** turnos libres de relleno verde → **blancos con borde `slate-200`**, color del club solo en el texto y al hover (borde + tinte `color-mix`), sin el shimmer animado; ocupación de barritas segmentadas rojas/verdes → **una sola barra fina** en el color del club (sin colores de alarma). Fonts de horarios agrandadas (`10px`→`13px`, filas `h-8`→`h-10`); **turnos pasados/ocupados legibles** (antes negro al 15% ilegible → texto `slate-400` sobre `slate-50` con borde `slate-200`) y **con el horario tachado** (antes el pasado no se tachaba). Todo gated por `esLight` → cero impacto en Templates 2/4/5.
- **Templates 2, 4, 5:** solo recibieron la firma. **PENDIENTE:** darles identidad visual propia (no copiar el 1 ni el 3).

**REDISEÑO LANDING PÚBLICA — TEMPLATE 1 (2026-07-11 tarde 4).** Overhaul de diseño (NO funcionalidad) del template "Oscuro / Pro deportivo", con el bibliotecario + referencias de páginas de deportes. Regla que guió todo: los 5 templates deben quedar DISTINTOS → los diseños nuevos que viven en componentes compartidos se activan con un prop `variant`, solo el Template 1 lo pasa. Ver [[project_landing_rediseno_template1]], [[project_personalizacion_landing]], [[project_marca_padelwiark]].
- **Primitivas nuevas (reutilizables):** `components/ui/Reveal.jsx` (aparición al scroll, fade+subida, IntersectionObserver, respeta `prefers-reduced-motion`); `components/ui/CountUp.jsx` (números que cuentan 0→valor al entrar en viewport, easeOutCubic); `features/landing/landingUtils.js` (`hayContacto`). En `index.css`: clase `.font-display` (fuente **Anton**, condensada de impacto, cargada en `index.html`), keyframes `auroraDrift` (glows que se mueven lento) y `nudge` (chevron de scroll), utilidad `.noise-overlay` (textura de ruido 3% que mata el look plano). Todo con guard de reduced-motion.
- **Hero (Template1):** gradiente DIRECCIONAL sobre la foto (oscuro del lado del texto, deja ver la energía) en vez de cortina plana; H1 en `font-display` uppercase gigante; glows con `aurora` animada; prueba social viva (canchas disponibles + horario + rating); indicador de scroll (solo el chevron animado, sin texto — Luca sacó "Scrolleá"). FEATURES editoriales: número de índice tenue (01/02/03) + micro-link accionable que aparece al hover. Todas las secciones envueltas en `<Reveal>`, títulos con `SectionTitle` (font-display).
- **Reservas — grilla matriz (`TurnosDisponibles` `variant="matrix"`):** filas = horarios, columnas = canchas; celda libre = chip clickeable (Reservar/Ver + candado), ocupado/pasado tenue, vacío si la cancha no abre; header por cancha + pie de % ocupación por columna; scroll horizontal si hay 3+ canchas. Cabecera **días full-width**: fila compacta (píldora "En vivo" + contador inline con reloj + chip de fecha con calendario) y los 7 días como tabs a todo el ancho. Fonts agrandadas en toda la grilla. **Lógica intacta** (polling, recién-liberado, bloqueo por torneo, selector de días). El resto de templates siguen con el layout de columnas.
- **Americano/Super 8 (`AmericanoSuper8Section`) — "dos formatos enfrentados":** header centrado + dos paneles lado a lado (Americano | Super 8), cada uno con ícono, descripción y su propio botón, con un círculo "o" en el medio. Rompe con el patrón de 3 pasos de Partidos abiertos (ya no se leían como la misma sección). **Fix de copy (confundía):** badge "Gratis · sin registrarte" → **"La herramienta es gratis"**; se sacó "sin cuentas" del texto; bajo el CTA "Gratis · registrate para invitar". Motivo: la herramienta es gratis, pero organizar con amigos/comunidad SÍ requiere registro. Ver [[project_super8_americano]].
- **Fondos de sección unificados:** Torneo en curso, Americano y Partidos abiertos tenían tintes distintos (`#0a0a12` navy, `#0a0f0d` verde) → todos a **`#0d1117`** (el base). Regla: un solo matiz de canvas, la variación es de BRILLO + glows de color, nunca de tono (los saltos navy↔verde se sentían chocantes).
- **Historia / Quiénes somos (Template1):** (1) fix del placeholder vacío (la caja con ícono roto ya no aparece si no hay foto — se centra la historia); (2) stats con separador vertical y sin el "+" (no se inventó un 5.0 falso — números honestos); (3) identidad: barra de acento del color del club a la izquierda de la historia + glow suave detrás de la foto.
- **Galería (`GaleriaGrid` `variant="mosaico"`):** mosaico con foto destacada 2×2 + piezas chicas (cae a grilla si hay <3 fotos); captions con degradé SIEMPRE visibles (antes solo al hover → invisibles en mobile); estilo alineado (rounded-2xl, borde, hover-zoom). **Lightbox** (para las dos variantes, con `createPortal` para no quedar recortado por transforms): click → foto grande, ✕/Esc/click-afuera para cerrar, flechas ‹ › + teclado + contador, bloquea scroll de fondo.
- **Servicios (`ServiciosGrid`):** fonts agrandadas (título `text-lg` bold, desc `text-sm`, ícono más grande) + hover que tiñe la card del color del club (borde + fondo con `color-mix` sobre una CSS var `--clr`, para respetar el primario dinámico) + eleva + agranda el ícono.
- **Footer (Template1) — firma de la plataforma:** dos capas → copyright del CLUB (del dueño) + firma **"Hecho con PadelwIArk"** (iso en lima/neón de la marca, NO el color del club; "IA" resaltado) que linkea a `/padelwiark` (la landing de ventas real). Jugada de distribución SaaS: cada landing de club es un cartel gratis que apunta a ventas (modelo Webflow/Framer). Ver [[project_landing_saas_empresa]].
- **Templates 2-5:** solo tienen el `ContactoSection` de la sesión previa; NO fueron rediseñados. **PENDIENTE explícito:** darle a cada uno su propia personalidad visual (no copiar el 1).

**UBICACIÓN EN MAPA + SECCIÓN CONTACTO (2026-07-11 tarde 3).** Decisión: **Leaflet + OpenStreetMap** (GRATIS, sin API key ni tarjeta — descartado Google Maps por eso). Deps nuevas: `leaflet` + `react-leaflet@5` (compat React 19). Ver [[project_ubicacion_mapa]].
- **Componente `components/ubicacion/MapaUbicacion.jsx`:** mapa reutilizable (admin editable + landing read-only). Editable: caja de texto propia + botón "Buscar" (geocoding gratis con Nominatim/OSM) + pin arrastrable + click para mover. Fix del ícono default de Leaflet (con bundler se rompe → mergeOptions con los PNG importados). Guarda lat/lng.
- **Admin (`QuienesSomosPage` TabInfo):** en Datos de contacto, un botón compacto "Marcar ubicación en el mapa" (o "Ubicación marcada ✓") abre un MODAL con el mapa (no ocupa lugar al pedo). "Guardar ubicación" persiste (lat/lng en la config del club, sin cambio de backend — config es JSON) y cierra.
- **Landing (`ContactoSection` en `LandingSections.jsx`, en los 5 templates):** sección `id="contacto"` (el link del navbar ya existía y ahora funciona). Rediseñada: WhatsApp como CTA protagonista (degradé verde), un SOLO número (WhatsApp > teléfono; sin email — decisión de Luca), redes (Instagram con degradé, Facebook azul) como botones circulares, mapa read-only enmarcado + botón "Cómo llegar" (abre Google/Apple Maps con las coords). Micro-animaciones al hover. `dark` por template (Template3 es light). Iconos de marca (WhatsApp/IG/FB) como SVG locales en LandingSections.

**CARGO DE CANCELACIÓN CONFIGURABLE + UI (2026-07-11 tarde 2).**
- **Cargo por cancelación fuera de plazo — configurable (`reservas.js` + `QuienesSomosPage.jsx` + `PlayerMisReservasPage.jsx`):** antes el cargo era SIEMPRE el turno completo (hardcodeado `reserva.precio`). Ahora el dueño elige en Club → Configuración general: **Turno completo / Mitad del turno / Personalizado (%)**. Config nueva `club.config.cargoCancelacion` ('completo'|'mitad'|'personalizado') + `cargoCancelacionPct` (0–100). El backend (`DELETE /reservas/:id`, path de cancelación del jugador) calcula `precio × factor` (1 / 0.5 / pct÷100, redondeado) y la notificación al jugador muestra el monto real. El PREVIEW del jugador (`PlayerMisReservasPage`, modal "Cancelar reserva") también aplica el factor (antes mostraba el precio completo — bug de display; el cargo real ya estaba bien). Input % es type=text+inputMode numeric que saca ceros a la izquierda (evita "010"). PENDIENTE relacionado: seña para reservar → [[project_sena_reserva_pendiente]] (para el deploy / con MP).
- **Panel "Avisos de jugadores" (`ReservasPage.jsx`):** de `max-h-72` (288px) a `max-h-32` (~2 filas) → ocupa mucho menos, el resto scrollea. Pedido de Luca.
- **Perfil del mentor enriquecido (`agentes/mentor/perfil.md`):** nueva sección "Cómo se comunica / forma de escribir" (rioplatense rápido con typos, pide análisis antes de decidir, quiere la verdad, piensa en grande, itera en bloques, le pesa la confianza, aprende con analogías). Luca pidió que el mentor "aprenda de ella". El mentor la sigue enriqueciendo en cada cierre. Ver [[project_agente_mentor]].

**CORRECCIONES UI + VENTA RÁPIDA (2026-07-11 tarde).** Tanda de correcciones puntuales antes de encarar el responsive.
- **Botón "Por cobrar" (dashboard) → tab correcta:** llevaba a `/dashboardAdmin/pagos` que caía en la tab por defecto (Ventas). Ahora `PagosPage` lee `?tab=` de la URL (`useSearchParams`) y el link va a `?tab=cobranzas`. Mecanismo reutilizable (respeta permisos con el guard existente). `AdminDashboardPage.jsx` + `PagosPage.jsx`.
- **"Venta rápida" desde el Resumen:** botón en el header del dashboard (gateado por `verCobros`) → `/dashboardAdmin/pagos?tab=ventas&nueva=1` → `PagosPage` abre el modal de venta (`ModalCuentaJugador`) al llegar. REUSA el POS que ya existe (cero duplicación). Al cerrar, si vino del Resumen (`vinoDeResumen`), vuelve a `/dashboardAdmin` (no deja al usuario tirado en Finanzas).
- **Fix venta "Anotar a cuenta" (`PagosPage.jsx` `anotarACuenta`):** en modo VENTA, anotar a cuenta ahora CIERRA el modal (operación terminada) en vez de quedar abierto mostrando la deuda total acumulada del jugador. En modo COBRO queda como estaba. Bug del flujo de venta general (no solo la venta rápida).
- **Fade suave al volver al Resumen (`index.css` + `AdminDashboardPage.jsx`):** keyframe `fadeInUp` (respeta `prefers-reduced-motion`) en el contenedor raíz del dashboard → aparece con un fundido en vez de saltar de golpe. Nota: no elimina el pestañeo de re-fetch (Luca lo dio por aceptable); si molesta, el paso 2 era mostrar datos previos mientras refresca.
- **Fix badge de notificaciones Reservas vs stock (`notificacionesStore.js` + `Sidebar.jsx`):** el badge "Reservas" del sidebar usaba `sinLeer()` (todas las no-torneo) → el `stock_bajo` inflaba el contador (mostraba "2" igual que la campana). Nuevo selector `sinLeerReservas()` que cuenta SOLO tipos de agenda (reservas/turnos/clases: `nueva_reserva`, `reserva_autoconfirmada`, `turno_fijo_autoconfirmado`, `turno_liberado_auto`, `turno_fijo_pendiente`, + clases de profesor). El stock y otras generales quedan SOLO en la campana. El badge de Reservas ahora es independiente.

**WIarky — CIERRE DEL ROADMAP DE LA AUDITORÍA (2026-07-11).** Se completaron los pendientes de [[project_wiarky_auditoria_2026_07]] (menos la voz en iPhone, que espera un cliente iPhone). Arrancó la sesión con `git push` de los 4 commits del 2026-07-10 (estaban locales). Todo en `backend/src/lib/insight.js` salvo lo indicado.
- **3 cerebros financieros enchufados** (ya calculados en `finanzas.js`, WIarky no los usaba — mismo patrón que `consultar_resultado_mes`):
  - `consultar_tf_riesgo` → `calcularRetencionTF`: turnos fijos en riesgo de baja (faltaron 3+ veces en 8 sem) + plata anual en juego. Nombres al FRONT vía artefacto `lista` (privacidad, patrón deudores), NO a la IA. Ruteo: "¿quién se puede dar de baja?".
  - `consultar_heatmap` → `calcularHeatmap`: distila en código las 4 franjas más frías (para llenar con Super 8) + el pico; se lo pasa resumido a WIarky (no la matriz cruda). Ruteo: "¿qué horario viene flojo?".
  - `consultar_flujo_caja` → `calcularFlujoCaja`: proyección 3 meses (cobros vs pagos, avisa mes en rojo). Guarda: aclara SIEMPRE que es la forma de lo que entra/sale, NO el saldo del banco (arranca de 0).
- **Fix crear_jugador categoría canónica (`routes/jugadores.js:1003`):** el `POST /jugadores` (alta admin) guardaba `categoria ?? null` sin normalizar (el PATCH sí normalizaba). Ahora usa `normalizarCategoria` → "6ta" se guarda "6ta Categoría" y matchea en convocatorias/filtros. Cubre WIarky y el alta manual.
- **Fix cargar_gasto no siempre pagado (`insight.js` tool + `routes/clubs.js` /insight/accion):** la tool ahora captura `vencimiento` opcional; si viene → gasto IMPAGO con vencimiento; si no → pagado (contado). Antes hardcodeaba `pagado:true` siempre (ensuciaba el módulo de vencimientos que el propio WIarky vigila).
- **Prompt caching (`insight.js` responderChatAgente):** el `system` se partió en bloque ESTÁTICO (instrucciones, con `cache_control: ephemeral`) + bloque de contexto del club (dinámico, sin cachear); las tools se cachean con `cache_control` en la última (`toolsCached`). Baja costo/latencia de la API en las 3 llamadas por turno y entre turnos (misma sesión, TTL 5min). SDK `@anthropic-ai/sdk ^0.105` lo soporta GA.
- **Estado del roadmap WIarky:** HECHO onboarding, insight con botón, resultado del mes, ingresos bruto/neto, voz (Android/desktop), adjuntar factura foto/PDF + fallback Sonnet, TF riesgo, heatmap, flujo de caja, fixes categoría/gasto, prompt caching. **PENDIENTE:** solo voz en iPhone (Whisper server, cuando haya cliente iPhone) — ver [[project_wiarky_voz]]. **Próximo foco general: RESPONSIVE (WIarky no se ve bien en mobile) — ver [[project_retomar_responsive_wiarky]].**

**SESIÓN DE CORRECCIONES + AUDITORÍAS PRE-DEPLOY (2026-07-10 tarde).** Correcciones puntuales pedidas por Luca + dos auditorías multi-agente antes del deploy al primer cliente. Ver [[project_guardado_fantasma_auditoria]], [[project_wiarky_auditoria_2026_07]], [[feedback_pensar_en_grande]].

**SESIÓN DE CORRECCIONES + AUDITORÍAS PRE-DEPLOY (2026-07-10 tarde).** Correcciones puntuales pedidas por Luca + dos auditorías multi-agente antes del deploy al primer cliente. Ver [[project_guardado_fantasma_auditoria]], [[project_wiarky_auditoria_2026_07]], [[feedback_pensar_en_grande]].
- **Categorías (Stock) — anti-duplicado por PROXIMIDAD (`lib/categoriaSimilar.js` nuevo + `routes/categorias.js`):** si ya existe "Bebidas" no deja crear "bebida"/"bevida"/"bebid"/"BEBIDAS"/"Bebídas". Normalización (sin acentos/mayúsc/espacios) + singular/plural + typos (Levenshtein, tolerancia por largo). Sin falsos positivos ("Cafetería", "Oro" vs "Otros" pasan). Blindado en backend (crear + renombrar) → cubre los dos flujos (modal categorías y "+" al crear producto).
- **Stock (`StockTab.jsx`) — categorías colapsables + filtro:** cada encabezado de categoría es un acordeón; **arranca todo plegado** (se corre una vez al cargar). Barra de filtros: dropdown de categoría (escala a muchas) + chips de estado (A reponer / Sin stock / Sobreventa, solo si hay algo) + Limpiar. Tarjeta "Bajo stock" y alerta ámbar clickeables → filtran "A reponer". Con filtro/búsqueda activa se fuerza expandido.
- **WIarky `crear_reserva` (`lib/insight.js`) — no más plata invisible:** (1) si no se dicta precio, toma el **precioTurno de la cancha** (antes nacía null = invisible en deudas/cobros; la tool aclara que NO pregunte el precio). (2) matcheo de jugador **con acentos** (helper único `normNombre`: "Julián"="Julian") + parcial + homónimos. (3) si la cancha no tiene precio, NO crea reserva muda → **nuevo artefacto `navegar`** (botón a Club→Canchas; reutilizable para onboarding). `AsistenteWiark.jsx` + `NavegarArtefacto`.
- **BUG "guardado fantasma" — CANCHAS:** el "Guardar" de cada cancha solo tocaba estado local (`updateCancha`→`_dirty`) y NUNCA persistía → al refrescar se perdía. Fix: `guardarCancha` persiste de una + toast honesto (`saveClub` devuelve bool según `res.ok`). Backend `clubs.js`: **desactivar cancha nunca se guardaba** (front manda `activa`, back leía `c.activo` y hardcodeaba `true`) → `activo: c.activa ?? c.activo ?? true`; y el admin ahora VE las inactivas (GET `/me` + respuesta del PATCH sin filtro `activo:true`) para reactivarlas.
- **BUG "guardado fantasma" — CONFIG DEL CLUB (B2+B3):** los 9 tabs (info, apariencia, hero, historia, galería, servicios, staff, FAQ, canchas/horarios) ponían el ✓ SIEMPRE aunque el backend fallara; `saveConfig` (métodos de cobro + comisiones MP) no chequeaba `res.ok`. Fix: `saveClub`/`saveConfig` devuelven bool; cada `handleSave` es `async` y chequea → ✓ + **toast "Cambios guardados"** si OK (pedido de Luca: toast en TODA la sección Club) / toast rojo si falla. `QuienesSomosPage.jsx` + `clubStore.js` + `PagosPage.jsx`.
- **AUDITORÍA WIarky (4 profesionales, read-only):** ingeniero LLM/prompt + qa-flujos + bibliotecario + asesor-financiero. Hallazgos (detalle en [[project_wiarky_auditoria_2026_07]]): onboarding invisible (los chips son todos de lectura, no muestran que EJECUTA), `crear_reserva` escondía plata (YA corregido), WIarky usa **1 de los 5 cerebros financieros** ya construidos (resultado del mes en $, heatmap, flujo de caja, TF en riesgo — huérfanos en `finanzas.js`) + bug bruto/neto en ingresos, cero prompt caching.
- **AUDITORÍA "guardado fantasma" pre-deploy (3 agentes):** patrón de fondo tranquiliza — todo lo que usa `api.*` (lanza en no-ok) está SANO; los fantasmas viven solo en el `fetch` crudo de `clubStore` + reservas del jugador. Cerrados B2/B3/B4. **PENDIENTE (B1):** limpieza de restos de localStorage en `PlayerReservasPage` (`addReserva` corre aunque el POST se saltee si `/canchas` falla al cargar — solo con backend caído; happy path OK). Ver [[project_guardado_fantasma_auditoria]].
- **WIarky ONBOARDING (paso 1, `AsistenteWiark.jsx`):** el saludo ahora muestra el RANGO ("no solo te cuento cómo va el club: armo convocatorias, cargo gastos, cobro deudas…"). Los 3 chips de lectura se reemplazaron por **chips agrupados por para-qué** que incluyen ACCIÓN (Entendé tu negocio: ¿gané o perdí? / ¿quién me debe? · Llená canchas: armá un Super 8 / publicá turnos libres · Hacé tareas: cargá un gasto / registrá un jugador). Cada chip manda ese texto al chat → dispara las tools que WIarky ya tiene. Objetivo (de la auditoría): que el dueño descubra en 30s que WIarky EJECUTA.
- **WIarky INSIGHT con botón (paso 1.5, `insight.js` + `clubs.js` + `AsistenteWiark.jsx`):** cuando hay una franja floja REAL (`franjasFlojas`, ≤2 reservas/2sem), el insight del día viene con acción sugerida (`sugerenciaDeInsight`): un **botón lima** "Armá un Super 8 a las HH:MM para llenarla" que siembra el flujo de `crear_convocatoria` con esa hora (no ejecuta solo; WIarky pide el resto y confirma). Nuevo tipo de artefacto `sugerencia` (botón que manda un pedido al chat), hermano de `navegar`. Se cachea junto al insight (24h). Grounded: si no hay franja floja, sale sin botón. Ver [[project_wiarky_auditoria_2026_07]].
- **REGRESIÓN de canchas — introducida y REVERTIDA en la misma sesión:** el fix B4 ("desactivar cancha persiste" + admin ve inactivas) rompió el contador de "Cantidad de canchas" (contaba las apagadas → bajabas a 2 y figuraba 4). Se **revirtió** `clubs.js` de canchas a su estado previo (GET `/me` y respuesta del PATCH filtran `activo:true`; upsert con `activo:true`). El guardado por-cancha del PRECIO + toast (frontend `guardarCancha`/`saveClub` bool) SÍ quedó (eso andaba bien). LECCIÓN (Luca, enfática): NO agregar scope que no se pidió aunque una auditoría lo sugiera — el "admin ve inactivas" no se había pedido y causó la regresión. Ver [[feedback_no_scope_extra]].
- **WIarky RESULTADO DEL MES en pesos (paso 2, `insight.js` + `finanzas.js`):** tool nueva `consultar_resultado_mes` que enchufa `calcularContribucionSectores` (estaba huérfano). Responde la pregunta rey "¿gané o perdí este mes?" en PESOS + aporte por sector (canchas/clases/bar). Guarda anti-mentira: sin costos cargados NO da resultado (mandá a Dirección); bar sin COGS avisa margen inflado; sin costos por sector aclara "aproximado". Ruteo en el prompt: "¿gané/perdí/cuánto me dejó el bar?" → esta tool; break-even/ocupación sigue en `consultar_salud_financiera`.
- **WIarky INGRESOS bruto/neto aclarado (paso 3):** `consultar_ingresos` sumaba BRUTO y el motor financiero NETO → dos números distintos para el mismo período. Decisión de Luca: ACLARAR (no cambiar el número), porque la Caja/arqueo ya trabaja en bruto y netear crearía otra inconsistencia. Ahora la tool dice explícito "facturado bruto (= mismo criterio que la Caja)" y manda al RESULTADO neto para "cuánto gané". Solo texto, cero lógica.
- **WIarky VOZ / dictado (paso 4, `hooks/useDictado.js` nuevo + `AsistenteWiark.jsx`):** entrada por voz con la Web Speech API nativa (GRATIS, sin backend). Botón de micrófono a la izquierda del input; transcribe en vivo (es-AR) y **AUTO-ENVÍA al terminar de hablar** (manos libres — seguro porque las acciones van con botón de confirmación igual). Feedback de errores completo (no te escuché / sin internet / permiso denegado). **iPhone: el micrófono NO aparece** (Web Speech es inestable en WebKit, y Chrome-iPhone también es WebKit) — decisión de Luca: arrancar gratis para Android/desktop y sumar Whisper server-side cuando haya cliente iPhone (el hook está aislado para enchufarlo sin rehacer). Investigado con general-purpose (técnico) + bibliotecario (UX/mercado): es diferenciador (nadie tiene dictado owner-facing). Ver [[project_wiarky_voz]].
- **WIarky ADJUNTAR FACTURA (foto o PDF) → carga gasto con IA (paso 5, HECHO):** botón de adjuntar en el chat (`AsistenteWiark.jsx`) → lee la factura con el OCR que ya existía (`/gastos/extraer`) → muestra resumen + botón "Revisar y cargar en Gastos" que **abre el `ModalGasto` prellenado** (proveedor/monto/vencimiento + productos al stock) reusando la pantalla probada. El "cable" WIarky↔Gastos es un store chico `store/wiarkyGastoStore.js` (WIarky deja el OCR; PagosPage salta a la tab Gastos; GastosTab abre el modal y limpia). El mapeo OCR→formulario se unificó en `datosAPrefill` (lo usan el botón de Gastos Y WIarky → no divergen). **Foto**: en celu/tablet abre cámara/galería/archivos (opción A, sin `capture` para poder elegir PDF); en compu, explorador. **PDF**: soportado (facturas por mail). **Robustez OCR (`lib/ocrGasto.js`)**: fallback en cascada **Haiku→Sonnet** (si Haiku no puede con una foto difícil, la rescata Sonnet; Sonnet solo corre al fallar Haiku) + `max_tokens` 400→1500 (facturas con muchos ítems no se cortan) + acepta `application/pdf` (bloque `document`, Claude lo lee nativo). Mejora WIarky Y el botón de Gastos de una. `ModalTipsIA` actualizado ("Foto o PDF"). Aprendizaje: el OCR es probabilístico — una foto borderline (ej. 103KB baja resolución) falla a veces; por eso el fallback a Sonnet + tips de foto. Ver [[project_ocr_gastos_ia]], [[project_wiarky_caballo_batalla]].
- **PENDIENTE WIarky (roadmap):** (1) voz en iPhone vía Whisper server cuando aparezca; (2) insight con botón versión backend más fina; (3) prompt caching; (4) enchufar heatmap / TF en riesgo; (5) cargar productos al stock 100% dentro del chat (hoy la revisión de ítems se hace en la pantalla de Gastos, que es lo correcto/seguro). Ver [[project_wiarky_auditoria_2026_07]].

**Última actualización:** 2026-07-10 — **AJUSTE MASIVO DE PRECIOS por categoría + mejora visual del Stock** — botón que sube/baja un % a todos los productos de una categoría de una (inflación), con preview y redondeo a $10. Además se renombró "valor"→"Invertido" y se rediseñó la lista de productos (encabezado de categoría vistoso + efecto cebra + pares etiquetados). Ver abajo.

**AJUSTE MASIVO DE PRECIOS POR CATEGORÍA + MEJORA VISUAL DEL STOCK (2026-07-10).** Feature muy pedido por la inflación: subir precios de a categorías completas sin editar producto por producto. Ver [[project_ajuste_masivo_precios]], [[project_stock_inventario]], [[project_finanzas_pos_gastos_caja]].
- **Ajuste masivo (`routes/productos.js` `POST /productos/ajuste-masivo`):** body `{ categoria, porcentaje, campo?: 'precio'|'costo'|'ambos' (default precio), redondeo?: paso (default 10) }`. Aplica el % a TODOS los productos ACTIVOS de la categoría, en una `$transaction`, scopeado por club. El precio nunca baja de 1; el costo solo se toca si está cargado. Validaciones: pct ≠ 0 y en rango -95%..1000%; categoría con productos (404 si vacía). Probado e2e (`scripts/test-ajuste-masivo.mjs`, 6 asserts: +10% redondea 1437→1580, 990→1090; no toca costo; 404 categoría vacía).
- **Frontend `StockTab.jsx` — modal Ajuste masivo:** botón "Ajuste masivo" (ícono %) → modal con categoría + selector Precio/Costo/Ambos (default Precio, decisión de Luca) + input % (negativo = baja) + **preview en vivo** ("23 productos · Coca $1.437 → $1.580…", primeros 8) antes de aplicar. Redondeo a $10 (helper `red10`). Decisión: por ahora redondeo fijo a $10 (Luca lo eligió); se puede exponer selector si hace falta.
- **Mejora visual del Stock (mismo archivo):** (1) **"valor" → "Invertido"** en la ficha de cada producto y en la tarjeta resumen ("Invertido en stock — plata en mercadería al costo"); es `costo × unidades`. (2) La línea apelmazada de datos pasó a **pares etiquetados** (componente `Stat`: ETIQUETA chica + valor) — Precio / Costo / Margen (verde si +, rojo si −) / Invertido; envuelve prolijo en mobile. (3) Cada **categoría es una tarjeta** con encabezado vistoso (barra de acento lima + nombre + contador en pastilla + subtotal invertido de la categoría) y **filas con efecto cebra** (blanca / `slate-100`) + hover lima — igual criterio que Cobranzas/Gastos.

**ENTREGA PARCIAL + SPLIT DE MÉTODOS al cobrar** — el jugador puede pagar una parte de su deuda (FIFO, la más vieja primero) y con 2 métodos a la vez (ej. efectivo + transferencia). Se creó un "libro de plata" (Pago + PagoLinea) → la caja lee de ahí y el efectivo queda EXACTO (arregla un bug de caja fantasma). qa-flujos: APTO para cliente. Ver abajo.

**ENTREGA PARCIAL + SPLIT DE MÉTODOS (2026-07-09).** Diseñado por el asesor-financiero (CFO) y construido con QA. Al "Cobrar cuenta" de un jugador ahora se puede: (1) **entrega parcial** (paga menos de lo que debe; se salda FIFO, la deuda más vieja primero) y (2) **split de métodos** (un cobro repartido en 2 métodos). Arregla de paso un **bug real de caja**: antes el split obligaba a elegir 1 método → la caja registraba efectivo que no estaba en el cajón. Ver [[project_pago_parcial_split]], [[project_finanzas_pos_gastos_caja]], [[project_pagos_fase0]]. RN-69.
- **Modelo "libro de plata" (`schema.prisma`, DB local migrada):** modelos nuevos **`Pago`** (clubId, jugadorId?, total, `imputaciones Json` [{origen,refId,monto}] para revertir al anular, anuladoAt?, pagadoAt) + **`PagoLinea`** (una fila por método: metodo, monto). Campo **`saldoPagado Int @default(0)`** en `Reserva` y `Cargo`. La deuda (ítems) queda igual; la plata vive en su propio libro.
- **Backfill corrido (`scripts/backfill-pagos.mjs`):** por cada ítem ya pagado se creó su Pago+PagoLinea equivalente + saldoPagado=monto (69 pagos: 15 reservas, 54 cargos). Verificado que **cuadra centavo por centavo** por método ($877.725 idéntico). Sin esto, la caja histórica perdería los cobros viejos al migrar la lectura.
- **Caja HÍBRIDA sin romper nada (`lib/pagos.js`, `routes/caja.js`):** la caja lee la plata de `PagoLinea` (cobros con split/parcial, ítems con `saldoPagado>0`) **+** ítems pagados legacy (`saldoPagado==0`, de los flujos de cobro viejos: checkout de turno, venta, comanda, torneo — todos intactos). El discriminador `saldoPagado>0` evita doble conteo. `cobrosEfectivoEntre` (arqueo) e `ingresosPorMetodoEntre` (reporte por método) migraron a leer el libro → efectivo exacto con split. `porTipo`/`porCategoría`/margen siguen por ítem (aprox. en parciales hasta completar = Fase 2).
- **Cobro FIFO + split (`routes/cargos.js` `cobrar-cuenta`):** acepta `monto` (parcial, imputa a la deuda más vieja primero) + `lineas` [{metodo,monto}] (split). Crea el Pago, sube `saldoPagado` de cada ítem, marca pagado sólo al completar. Compat: sin `monto`/`lineas` cobra todo con `metodoPago` (comportamiento previo). **TOCTOU-safe: todo dentro de `runSerializable`** re-leyendo saldos adentro (dos cobros concurrentes no duplican).
- **Deudas parciales muestran el RESTANTE (`lib/deudas.js`, `cargoADeuda`):** una deuda a medio pagar figura por lo que falta (total − saldoPagado) + expone `montoOriginal`/`saldoPagado` (chip "parcial · pagó $X" en el modal).
- **Anular (`routes/pagos.js`):** `POST /pagos/:id/anular` revierte (descuenta saldoPagado, reabre ítems, marca anuladoAt — no borra, auditoría). El des-pago por ítem (grilla/historial) revierte el libro si el ítem estaba cobrado; si el cobro fue **combinado** (saldó varias deudas) devuelve 409 con `pagoIds` y el front ofrece anular el pago completo. Todo en `runSerializable`.
- **Frontend (`PagosPage.jsx`, `metodosPago.jsx`, `api.js`):** en "Cobrar cuenta": campo **monto a cobrar** (editable = parcial, avisa cuánto queda) + toggle **"Pagó con 2 métodos"** con el reparto. Badge **"Mixto"** para cobros con split. Guard `if (saving) return` anti doble-submit.
- **QA (qa-flujos, 2 pasadas):** 1ª encontró 2 🟠 de doble-conteo (concurrencia en el cobro; grilla que ignoraba el parcial) + 1 🟡 (reversas concurrentes) + 1 🔵 (doble-submit) — **todos cerrados** (runSerializable en cobro/anular; guard de grilla suma saldoPagado / bloquea con 409). 2ª pasada: **APTO para cliente**, sin agujeros residuales. Registro en `agentes/qa/registro-auditorias.md`. Probado además con `scripts/test-pago-parcial.mjs` (19 asserts e2e incl. concurrencia real) + 45/45 unit.
- **Fase 2 (anotado, NO ahora, huele a ERP):** 3+ métodos, saldo a favor, atribución exacta por sector en parciales, seña por turno puntual.

**GOLAZO: OCR de facturas que carga el stock (Etapa 1) (2026-07-09)** — la IA ahora lee también los ÍTEMS de la factura (renglones de producto) y el dueño los confirma para cargarlos al STOCK con su costo → alimenta el COGS/margen que ya existe. Cierra el círculo OCR → Stock → Margen. Ver abajo. RN-68.

**GOLAZO — OCR DE FACTURAS QUE CARGA EL STOCK (ETAPA 1) (2026-07-09).** Continuación directa del AI-OCR de gastos (bloques de abajo): antes la IA leía los datos de la factura (proveedor/monto/vencimiento); ahora además lee los **ÍTEMS** (renglones de producto) y el dueño los confirma para **cargar al stock con su costo**, lo que alimenta el **COGS/margen** que ya estaba construido. Se cierra el círculo **OCR → Stock → Margen** con el criterio de siempre: la IA propone, el dueño confirma (nadie carga stock a ciegas). 3 archivos de código: `lib/ocrGasto.js`, `features/pagos/GastosTab.jsx`, `index.css`. Ver [[project_ocr_gastos_ia]], [[project_stock_inventario]], [[project_finanzas_pos_gastos_caja]], [[project_wiarky_caballo_batalla]] y RN-68.
- **OCR extrae los ítems (`lib/ocrGasto.js`):** el prompt ahora devuelve `items: [{ descripcion, nombreLimpio, bultos, unidadesPorBulto, importe }]` (con sanitizado en server: bultos/unidades ≥1, importe entero ≥0, filtra renglones sin descripción, tope 50 ítems). Claves aprendidas afinando con facturas reales (VIFOOD/Coca): **(a)** `nombreLimpio` = la IA sugiere un nombre corto/limpio para el catálogo ("Pepsi", "Seven-Up") en vez del código del proveedor ("PEPSI 70KCAL 4X6 354CC"); **(b)** `bultos` vs `unidadesPorBulto` = la cantidad real viene partida (columna BULTOS + el "4X6" de la descripción); la IA lee las **DOS por separado** y el **CÓDIGO multiplica** (`bultos × unidadesPorBulto`), NO la IA (Haiku calcula mal — regla nuestra). Ej: 1 bulto "4X6" = 24 unidades. En servicios/facturas sin detalle → `items: []`.
- **Backend REUSADO (no se tocó):** `POST /api/gastos` ya soportaba `lineasStock` (matchea el producto por nombre o lo crea + `ingresarStock` que suma stock y actualiza el costo). Se reusa tal cual — el nuevo trabajo es del OCR + el frontend de confirmación.
- **Frontend — tabla de confirmación de stock (`GastosTab.jsx`):** cuando la factura trae ítems (rubros `bebidas`/`kiosco`/`deportivo`), aparece "¿Cargar estos productos al stock?" (toggle, **default ON en esos rubros**). Por ítem: producto (input con `datalist` de productos del club + matcheo contra existentes por nombre para no duplicar; muestra el nombre crudo de factura como referencia — "factura: ..."), unidades (default = `bultos×unidadesPorBulto`, con desglose "(1×24)"), costo unit (= `importe/unidades`, se **recalcula al editar las unidades**). Al guardar → `lineasStock` en el POST. `GastosTab` ahora fetchea `/productos` (degrada silencioso si falla por permiso).
- **Modal de tips antes de subir la foto (expectativa vs realidad):** al tocar "Subir factura con IA" aparece primero un cartel educativo (`ModalTipsIA`: header verde con gradiente, 3 fichas visuales ☀️📄🔎, aviso ámbar "revisá antes de guardar — vos confirmás") con "no mostrar más" (localStorage `gastos_ia_tips_ok`). Evita que el usuario suba una foto borrosa y culpe al sistema. Keyframe `popIn` agregado a `index.css`.
- **Regla asentada:** RN-68 — el OCR lee los ítems y el dueño los confirma para cargar stock+costo (alimenta el margen); la unidad real la calcula el CÓDIGO (`bultos × unidadesPorBulto`), nunca la IA; nadie carga stock a ciegas.
- **PENDIENTE (próximo paso, ya decidido con Luca):** **UNIFICAR** el "Ingresar compra" del tab Stock con el flujo de Gastos — hoy están **duplicados** (ambos hacen `POST /gastos` con `lineasStock`), con riesgo de doble carga. Se va por la **opción A**: sacar el form de Stock y que su botón lleve al flujo de Gastos (una sola vía de entrada).
- **Etapa 2 (futura, anotada):** que el sistema **APRENDA el mapeo** (alias "PEPSI 4X6"→Pepsi, factor 24) para hacerlo solo la próxima vez, sin que el dueño reconfirme cada renglón.

**REFINAMIENTO DEL AI-OCR DE GASTOS — AFINADO CON FACTURAS REALES (2026-07-09).** Continuación del AI-OCR (commit `d2a327b`, bloque de abajo). Se probó con facturas reales de un club (Coca / Embotelladora del Atlántico, VIFOOD) y se afinó lo que fallaba en el mundo real. 4 archivos de código: `prisma/schema.prisma`, `lib/ocrGasto.js`, `routes/gastos.js`, `features/pagos/GastosTab.jsx`. Ver [[project_finanzas_pos_gastos_caja]], [[project_wiarky_caballo_batalla]], [[project_ia_setup_anthropic]] y RN-67.
- **Categorías por rubro de club (`ocrGasto.js`):** el set del OCR pasó de solo-servicios (`energia/agua/internet/…`) a rubros reales de club: `servicios / alquiler / sueldos / impuestos / bebidas / kiosco / deportivo (pelotas/grips/paletas) / insumos / mantenimiento / otros`, con **guía por rubro en el prompt** (distribuidor de bebidas → `bebidas`; artículos de pádel → `deportivo`). Probado con facturas reales: bebidas→"Bebidas", pádel→"Tienda deportiva". Se alinearon `CATEGORIAS` (server), `CAT_IA` y `CATEGORIAS_SUGERIDAS` (front).
- **Fix vencimiento / CONTADO (bug real que revelaron las facturas):** la IA confundía el **"Vto CAE"** (dato fiscal de AFIP) con el vencimiento de PAGO. Ahora el prompt lo distingue explícito: `vencimiento` = SOLO fecha de pago (servicios a crédito); "Vto CAE"/"CAE" se **IGNORAN**. Nuevo campo **`contado` (boolean)** en la extracción: si la factura dice CONTADO → `contado:true`, sin vencimiento, y en el front el gasto arranca como **PAGADA** (`pagado: datos.contado ? true : !datos.vencimiento`). El sanitizado del server anula el `vencimiento` si `contado`.
- **Campos nuevos CUIT + tipo de comprobante (opcionales):** `Gasto.cuitProveedor` y `Gasto.tipoComprobante` en el schema (**DB local migrada**); la IA los extrae (CUIT del EMISOR, no del cliente; tipo A/B/C/Ticket/Remito/Recibo) y el modal los muestra auto-llenados (datalist de tipo). Aceptados en `POST` y `PATCH` de gastos. **Decisión de asesor: nada obligatorio nuevo** — la carga sigue rápida (concepto + monto); CUIT/tipo son opcionales.
- **Se SACÓ "Adjuntar foto" (decisión de producto/lean):** el flujo IA ahora lee la factura y **DESCARTA la imagen** (como un scanner) — no se sube a Storage ni se guarda. Motivo: simplicidad + menos costo de storage + menos puntos de falla (el upload a Supabase tiraba "fetch failed" porque el cloud está pausado en dev; en prod andaría, pero se decidió no guardar igual). Se quitó el botón "Adjuntar foto" del modal y el `uploadImage` del flujo IA (ya no se importa). **El campo `Gasto.imagenUrl` queda LATENTE en la DB** (apagado, costo cero) por si un plan premium futuro quiere "archivo de facturas" — se prende en 10 min. Regla asentada: el feature se construye cuando alguien lo pide/paga, no "por si acaso".
- **Filtro por proveedor + total (`GastosTab.jsx`):** dropdown de proveedores (auto-cargados por la IA, `proveedoresGasto`) que combina con los filtros de estado/categoría; al filtrar un proveedor aparece el banner **"Le pagaste a X ($total, N facturas)"** (`totalVisible`). El reporte y el CSV también salen filtrados por proveedor. Gotcha conocida: nombres inconsistentes del mismo proveedor pueden fragmentar el total (se edita a mano).
- **Detector de facturas duplicadas (AVISO, no bloqueo):** al **crear** un gasto (no al editar) se compara contra los ya cargados (`esMismaFactura`): match **FUERTE** = proveedor + N° de factura; match **DÉBIL** (si no hay N°) = proveedor + monto + fecha. Si coincide → banner ámbar **"¿Ya la cargaste?"** no bloqueante (el dueño confirma y decide). Puro frontend (`existentes={gastos}` al modal).
- **Reglas asentadas:** RN-67 (amplía RN-66) — categorías por rubro; el OCR NO guarda la foto (solo lee); CONTADO → pagada y no confundir Vto CAE; duplicados por proveedor+N°factura (o proveedor+monto+fecha) con AVISO no bloqueo; `imagenUrl` = feature latente.

**AI-OCR DE GASTOS CON WIARKY (2026-07-08).** El bloque grande que estaba anotado como "próximo", ahora HECHO. Es la dirección "WIarky caballo de batalla / automatización + simplicidad": el dueño saca una foto de la factura (luz, agua, internet, ticket) y la IA carga el gasto — cero tipeo. Diseño clave: la IA **nunca guarda sola** (la plata se revisa), extrae y el dueño confirma. De paso se agregó el **vencimiento** al Gasto y el sistema **avisa antes de que venza** (colores + WIarky). Ver [[project_wiarky_caballo_batalla]], [[project_finanzas_pos_gastos_caja]], [[project_ia_setup_anthropic]] y RN-66.
- **Lector con IA (`lib/ocrGasto.js`, NUEVO):** `extraerGastoDeImagen(dataUrl)` usa **Claude visión (Haiku 4.5**, reusa el SDK Anthropic ya integrado — arranca barato, se sube a Sonnet si falla en facturas complejas). Lee la foto de una factura/ticket/recibo y extrae JSON: `proveedor / concepto / monto / fecha (emisión) / vencimiento / numeroFactura / categoria`. **Clave del prompt:** le enseñamos el **FORMATO ARGENTINO** de números (punto = miles, coma = centavos) con ejemplos ("$22.560,30" → `22560`) porque sin eso subía mal el monto (leía $2.256.030); y a **distinguir fecha de emisión de VENCIMIENTO**. Sanitiza en el server (monto entero ≥0, fechas validadas por regex, categoría contra un set fijo). **NO guarda nada:** devuelve para confirmar.
- **Endpoint `POST /api/gastos/extraer` (`routes/gastos.js`):** recibe `{ image: dataURL base64 }` → devuelve los datos extraídos. Solo lee (admin). Errores mapeados a mensajes criollos (imagen inválida / no se pudo leer → 422). La **creación sigue por `POST /api/gastos`** como siempre.
- **Límite de body (`app.js`):** parser de **15mb** para `/api/gastos/extraer`, montado ANTES del global — una foto de celu pesa varios MB y con el límite global de 8mb fallaba.
- **Campo `Gasto.vencimiento String?` (`schema.prisma`, DB local migrada):** fecha de vencimiento de la factura (el dato que dice CUÁNDO hay que pagar → evita recargos/cortes). Aceptado en `POST` y `PATCH` de gastos. `fecha` quedó documentada como "fecha de emisión".
- **Frontend `GastosTab.jsx`:** botón **"Subir factura con IA"** (elige foto → llama al lector + sube la imagen a Storage EN PARALELO → abre el modal Nuevo Gasto **PRE-LLENADO** para confirmar). El `ModalGasto` acepta un prop `prefill` (valores de la IA, sin ser edición). Campo **Vencimiento** nuevo en el form. En la lista, **chip de vencimiento** en gastos impagos (helper `infoVenc`): rojo (vencido / vence hoy), amarillo (vence en ≤5 días), gris (más lejos). Si la IA leyó vencimiento futuro, el gasto arranca **"A pagar"** (impago). Mapa `CAT_IA` traduce la categoría de la IA a las etiquetas del form.
- **WIarky avisa vencimientos (`lib/insight.js`):** al contexto del chat se agregó la línea **"Facturas por pagar"** (impagas con vencimiento: VENCIDAS + próximas a vencer en ≤5 días) y un **bullet en el system prompt** para que WIarky avise proactivamente en criollo ("Ojo, la luz vence el 05/08"), priorizando lo ya vencido, sin dramatizar.
- **Regla asentada:** RN-66 — (1) el OCR NUNCA guarda solo (extrae y el dueño confirma); (2) formato argentino de números en la extracción; (3) el Gasto guarda `vencimiento` y el sistema avisa (chip semáforo + WIarky) antes de que venza.
- **Nota técnica (falso bug):** apareció un "token inválido" que resultó ser el **token de admin vencido (7d)**, no un bug — el auth está sano. De paso quedó subido el límite de body del OCR.
- **PENDIENTES (no hechos):** PDF (hoy solo imagen JPG/PNG/webp/gif — el PDF requiere conversión); adjuntar la imagen al gasto ya sube a Storage, pero no hay visor inline en la lista (solo ícono `FileText`); el campo `fuente:'ocr'` del modelo Gasto NO se está seteando desde el flujo IA (se podría marcar para métricas).

**RECONCILIACIÓN Costo↔Gasto POR DETECCIÓN AUTOMÁTICA (2026-07-08).** #4 de la tanda financiera post-análisis del asesor-financiero (tras #1 comisión MP, #2 costo por turno, #3 resultado del mes). Resuelve la **doble contabilidad**: **Costo** = estructura (alimenta break-even/resultado), **Gasto** = factura real pagada (Pagos → Gastos). Antes no se hablaban — el dueño cargaba el alquiler dos veces y Dirección nunca reconciliaba con lo pagado. Decisión con Luca (por simplicidad): el puente es por **DETECCIÓN automática**, sin botón ni doble carga. Ver [[project_finanzas_pos_gastos_caja]] y RN-65.
- **Schema (`prisma/schema.prisma`, `db push` aditivo):** `Gasto.costoId String?` (vínculo opcional gasto→costo) + relación inversa `Costo.gastos Gasto[]` + índice `[clubId, costoId]`. `onDelete: SetNull` (borrar el costo no borra el gasto). DB local migrada.
- **Detección AUTOMÁTICA (la clave, `routes/costos.js` `GET /costos`):** marca `pagadoEsteMes` por costo si hay un gasto **pagado este mes** (`pagado: true`, `pagadoAt >= inicioMesArg()`) que lo cubre — por vínculo `costoId` **O** por **mismo concepto normalizado** (trim+lowercase; ej. gasto "Alquiler" cubre costo "Alquiler"). Sin campo persistido nuevo: se computa en el GET. **NO hay botón "registrar pago" ni doble carga.** Se descartó y removió una primera versión con botón + endpoint `POST /costos/:id/pagar` porque generaba doble vía confusa y duplicados.
- **Frontend `CostosPanel.jsx`:** cada costo `tipo === 'fijo'` con `pagadoEsteMes` muestra "✓ Pagado" (verde, `Check`). Sin botón.
- **Frontend `DireccionPage.jsx`:** tarjeta nueva "Tus costos de este mes" (estructura $X · ya pagaste $Y · falta $Z + barra de progreso), calculada 100% en el front desde la lista de costos con `pagadoEsteMes` (mensualiza bimestral/2, anual/12, único=0). Texto guía: "se detecta solo desde tus gastos" + cómo nombrar el gasto para que matchee.
- **Regla asentada RN-65:** puente por detección (concepto igual o `costoId`), sin doble carga; funciona **mejor con costos itemizados** (Alquiler, Luz, Sueldos por separado) que matcheen el nombre del gasto.
- **AI-OCR de gastos con WIarky:** era el próximo bloque grande anotado acá — **HECHO** (ver el bloque de arriba, 2026-07-08). Se resolvió: entrada por botón "Subir factura con IA" en Gastos, modelo Haiku 4.5, PDF postergado (por ahora solo imagen).
- **#5 (nudge de COGS) PARKEADO a propósito:** el AI-OCR hace secundaria la carga manual → no tiene sentido pulir la carga manual justo antes de automatizarla.

**RESULTADO DEL MES — GANANCIA OPERATIVA (2026-07-08).** #3 de la tanda financiera: el número "gané/perdí $X" que el dueño más pide y no existía. Aditivo, reusa el motor de sectores.
- **Backend (`calcularContribucionSectores`):** agrega al retorno `resultado` (= ingresoTotal neto − costosTotal) y `costosTotal`. Calculado explícito (no como suma de contribuciones) para ser correcto sin ingresos. Verificado: cuadra exacto con Σ contribuciones.
- **Frontend (`DireccionPage`):** tarjeta primer héroe del tablero "Tu resultado · últimos 30 días" → "Ganaste/Perdiste $X" (verde/rojo) + "Ingresos $A − Costos $B". Solo aparece con costos cargados (nunca un número inflado). Usa el neto (comisiones del #1). Es ganancia OPERATIVA, no flujo de caja.
- **Ventana:** últimos 30 días (como todo el tablero). Cero cambios en break-even/comisiones/flujo/caja.

**COSTO VARIABLE "POR TURNO" (2026-07-08).** #2: en pádel la unidad es el turno de 1,5h (igual que el precio), no la hora. Se sacó el ruido de "×1,5 por hora" (metía confusión inexistente); rótulos consistentes "por turno (1,5h)". Solo texto, sin lógica. Commit 8692653.

**COMISIÓN DE MEDIO DE PAGO — NETO REAL (2026-07-08).** Primer arreglo de la tanda financiera post-análisis (asesor-financiero): el motor sumaba el BRUTO y no descontaba la comisión de Mercado Pago (~3,5%) → los números de Dirección mentían ~1,5% si el club cobra por MP. Fix **opt-in, quirúrgico** (no toca deuda ni arqueo ni el reporte de Caja):
- **Config:** `club.config.comisionPorMetodo = { mercadopago: 3.5, ... }` (default vacío = 0% → números idénticos a hoy hasta cargarlo). Helpers `comisionDeMetodo` / `netoRealizado` en `lib/finanzas.js` (+ 4 tests → 45 total).
- **Aplicado en:** `calcularSaludFinanciera` (break-even, precio realizado) y `calcularContribucionSectores` (margen por sector). Se agregó `metodoPago` a los selects y `club.config` a sectores. Nuevo campo `comisionesMes` en el retorno de salud.
- **UI config:** modal "Métodos de cobro" (Cobranzas → ⚙) — campito "% comisión" por método habilitado. Guarda `comisionPorMetodo` junto a `metodosPago` (`guardarMetodos(ids, comisiones)`).
- **UI Dirección:** en "Tus números", línea "Comisiones (30d) −$X" en rojo, SOLO si hay comisión cargada.
- **Regla:** la comisión es la "mordida" que el medio de cobro le hace al CLUB (no un recargo al cliente). Se descuenta solo en el ANÁLISIS de rentabilidad (Dirección); la deuda es el bruto y el arqueo es efectivo físico. RN-64.
- **PENDIENTES de la tanda financiera (próximos):** #2 unidad del costo variable ($/turno 1,5h); #3 resultado del mes real (P&L); #4 reconciliar Costo↔Gasto; #5 nudge de COGS.

**ARQUEO DE CAJA + VINCULACIÓN CON WIARKY (2026-07-06).** Surgió de un análisis con el `asesor-financiero` + el `bibliotecario`: el manejo de costos/margen ya está bien plantado (arriba del mercado), pero la pestaña "Caja" era solo un REPORTE teórico (ingresos−egresos por método, lectura pura) — faltaba el **ARQUEO del efectivo FÍSICO**: abrir la caja con un fondo, contar la plata del cajón al cerrar y ver si cuadra. Se construyó una capa nueva y **100% aditiva** (no toca ningún flujo de cobro). Los informes de la investigación quedaron en la biblioteca del bibliotecario (`agentes/bibliotecario/`). Ver [[project_finanzas_pos_gastos_caja]] y RN-63.

- **Schema (`prisma/schema.prisma`, `db push` aditivo):** 2 modelos nuevos. **`ArqueoCaja`** = una sesión/turno de un empleado (`clubId`, `empleadoId` + `empleadoNombre` snapshot, `estado` abierta|cerrada, `abiertoAt`/`cerradoAt`, `fondoInicial`; al cerrar se CONGELAN `cobrosEfectivo`/`egresosEfectivo`/`efectivoEsperado`/`efectivoDeclarado`/`diferencia` + `notas` + `cerradoPorNombre`). **`MovimientoCaja`** = egresos/ingresos de efectivo del cajón durante la sesión (retiro del dueño, compra de hielo, vuelto extra — NO son cobros de ventas). Relación `arqueosCaja` agregada a `Club`.
- **Backend (`routes/caja.js`, 5 endpoints NUEVOS, aditivos):** `GET /caja/arqueo/actual` (sesión abierta + esperado calculado EN VIVO), `POST /caja/arqueo/abrir` (`{fondoInicial}`, rechaza 409 si ya hay una abierta), `POST /caja/arqueo/:id/movimiento` (`{tipo,monto,concepto}`), `POST /caja/arqueo/:id/cerrar` (`{efectivoDeclarado,notas}` → congela totales + `diferencia = declarado − esperado`), `GET /caja/arqueo/historial` (cerradas, para el dueño). **Clave del diseño:** el "esperado" se calcula por **VENTANA TEMPORAL** — cobros en efectivo (`metodoPago:'efectivo'`, reservas `pagado` + cargos `pagado`) entre `abiertoAt` y el cierre → **cero cambios en los cobros**, no hay que estampar nada en cada venta. **SOLO EFECTIVO:** transferencias y MP no van al arqueo (se concilian aparte). Documento **inmutable** al cerrar.
- **WIarky (`lib/insight.js`):** tool + handler **`abrir_caja`** (genera botón de confirmación, no abre directo; si ya hay una abierta avisa que corresponde cerrarla desde la pestaña Caja). Estado de la caja agregado al **contexto del chat** (`armarContextoClub` → "Caja del día: ABIERTA desde las HH:MM por X / NO abierta todavía"). Bullet nuevo en el system prompt: recordar abrir al arrancar el día, no insistir si está abierta, recordar cerrar si terminó el turno, arqueo = solo efectivo. Dispatcher `routes/clubs.js` `/me/insight/accion`: case `abrir_caja` (crea el `ArqueoCaja` atribuido al empleado logueado).
- **Frontend (`features/pagos/CajaTab.jsx`):** componente nuevo **`ArqueoCaja`** ARRIBA del reporte existente (que quedó **intacto**, ahora bajo "Análisis del período"). Estados: **caja cerrada** (botón Abrir con fondo) / **caja abierta** (fondo / cobros en efectivo / egresos / "debería haber", registrar movimiento, y cerrar contando la plata con semáforo 🟢 cuadra / 🔴 falta / 🟡 sobra + nota). Historial de arqueos colapsable con semáforo de diferencias (para el dueño). `components/asistente/AsistenteWiark.jsx`: aviso **PROACTIVO** al abrir WIarky (si la caja NO está abierta → "Che, arrancá el día abriendo la caja 👇" + botón `abrir_caja`, determinístico vía `GET /caja/arqueo/actual`) + label 'Abrir caja' en el botón de confirmación.
- **Reglas de negocio asentadas:** RN-63 — (1) el arqueo controla SOLO el efectivo físico del cajón (transferencias/MP se concilian aparte); (2) `esperado = fondoInicial + cobros efectivo − egresos efectivo (neto)`, `diferencia = declarado − esperado` se atribuye al empleado; (3) totales congelados al cerrar (inmutable); (4) WIarky recuerda proactivamente abrir la caja al arrancar el día.
- **PENDIENTES (próximos pasos priorizados que dejó el análisis financiero — NO hechos):**
  - **Motor de margen (activar lo dormido):** descontar la **comisión de Mercado Pago** del ingreso realizado (opt-in, default 0); **resultado del mes real** (P&L devengado); **reconciliar Costo vs Gasto** (hoy hay doble contabilidad); **separar clases de canchas** en `calcularSaludFinanciera`; **unidad explícita del costo variable** ($/turno de 1,5h); **nudge de onboarding** para cargar COGS/costos por sector (prender el motor de margen que hoy está dormido).
  - **Fase 2 del arqueo:** FK explícita del cobro a la sesión (multi-caja / varios cajones en simultáneo), conciliación digital (transferencias/MP), alertas al dueño por diferencias, **arqueo ciego** (el empleado cuenta sin ver el esperado).

**MI CONSUMO — SECCIÓN DE PAGOS DEL JUGADOR REDISEÑADA + FLAG DEL CLUB (2026-07-06).** La página "Mis pagos" del jugador pasó a "**Mi consumo**": además de la deuda, ahora organiza el gasto (analítica por rubro + medio de pago). Y como mostrar el gasto acumulado puede enfriar el consumo de jugadores sensibles al precio (economía del comportamiento: hacer visible el gasto lo reduce), el dueño puede APAGAR el resumen con un flag — pero es quirúrgico: la DEUDA siempre se muestra (no afecta la cobranza). **Todo frontend, sin backend ni schema** — el flag es LATENTE en `club.config`. Ver [[project_pagos_fase0]] y RN-62.

- **`PlayerPagosPage.jsx` (rediseño completo):** sobre el saldo pendiente + lista de pendientes (que quedan arriba, siempre visibles, sin filtrar — es deuda), agrega un bloque de ANALÍTICA sobre los cargos PAGADOS: (1) **filtro de período** (Este mes / Últimos 12M / Todo, default 12M — filtra por `pagadoAt` con fallback a `fecha`); (2) **"Consumo del período" por RUBRO** — derivado del `tipo` de cada cargo (`reserva`→Canchas 🎾, `torneo`→Torneos 🏆, `venta`→Kiosco 🥤, `cancelacion`→Cancelaciones ↩️, resto→Otros 📝), con total grande y subtotales CLICKEABLES que hacen drill al historial; (3) **filtro por MEDIO DE PAGO** (chips con subtotal por método usando `METODO_MAP`). Rubro + método se combinan (AND); "Ver todo" limpia ambos. Todo client-side (los datos ya vienen completos de `/cargos/me`). El historial pasó a mostrar el ícono del rubro y el título refleja los filtros activos. Espacios ajustados en mobile (`gap-4 md:gap-6`, filtros período+método como una unidad, etiqueta "Medio de pago" en su renglón).
- **Flag `club.config.mostrarConsumoJugador` (default `true`, gating):** `PlayerPagosPage.jsx` lo lee de `clubStore` (`club?.mostrarConsumoJugador !== false`) y gatea TODO el bloque analítica+historial. Prendido = "Mi consumo" completo; apagado = el jugador ve SOLO la deuda (saldo + pendientes), sin historial ni analítica, y el título + el ítem del sidebar vuelven a llamarse "**Mis pagos**". `PlayerLayout.jsx` renombra el ítem del sidebar según el flag (label dinámico en el render, `nav` intacto).
- **`PagosPage.jsx` (admin, Cobranzas) — el switch:** nuevo ítem **"Vista del jugador"** (ícono `Eye`) en el menú ⚙ Configuración, al lado de "Métodos de cobro". Abre `ModalVistaJugador`: switch "Mostrar resumen de consumo" + recuadro explicativo (qué hace prendido/apagado + aclaración de que la deuda siempre se muestra). Guarda con `updateClub({ mostrarConsumoJugador })` + `saveConfig(token)`.
- **Regla de negocio asentada:** RN-62 — `mostrarConsumoJugador` (default true) controla si el jugador ve la analítica de consumo en "Mi consumo" o solo su deuda ("Mis pagos"); la deuda pendiente se muestra siempre; se configura en Cobranzas → ⚙ → Vista del jugador.
- **PENDIENTE (deploy):** el flag es latente en `club.config` (no hay columna nueva ni backend). Persiste vía el `saveConfig` existente. Sin cambios de schema, nada que migrar.

**RETOQUES UI JUGADOR — MOBILE (2026-07-06).** Tanda de pulido cosmético/responsive (solo mobile, desktop intacto):
- **Sidebar jugador (`PlayerLayout.jsx`):** reordenado en 3 bloques mentales (🎾 mi cancha: Reservar/Mis reservas/Mis turnos fijos · 🏆 competir: Americano y Super 8/Partidos/Mis torneos · 👤 mi cuenta: Mis pagos/Estadísticas/Mi perfil), con separador fino (`border-white/5`) entre bloques vía flag `sepBefore` + `Fragment`. Antes estaba mezclado (turnos fijos y torneos escapados de su grupo). Se probó con leyendas de sección pero Luca las descartó — quedó solo la línea.
- **Selector de fecha en Reservar (`PlayerReservasPage.jsx`):** la tira de 14 días mostraba barra de scroll gris + flechas redundantes en mobile. Bug real: usaba la clase `scrollbar-hide` que **no existe** en el proyecto (la buena es `.no-scrollbar`, index.css). Fix: `scrollbar-hide`→`no-scrollbar`, flechas ‹›`hidden md:flex` (mobile swipea, desktop mantiene flechas) + `snap-x snap-mandatory scroll-smooth` con `snap-start` (imán al soltar).
- **Tabs de Estadísticas (`PlayerStatsPage.jsx`):** "Oponentes" se cortaba en mobile. Fix: `px-3 md:px-4` (menos padding en mobile) + `overflow-x-auto no-scrollbar` con `shrink-0 whitespace-nowrap` como red de seguridad (scrollea sin cortar si no entra).

**CORTE MANUAL DE CATEGORÍA EN TORNEOS (2026-07-06).** Continuación del sistema de ascenso/descenso, la parte "el corte / no habilitar por categoría". La detección AUTOMÁTICA (motor `lib/ascenso.js` → `detectarAlertasInscripcion`, banner ⚠ ámbar en la pareja) solo llega a jugadores CONOCIDOS del club (categoría declarada superior o pasado por resultados). El hueco: el jugador DESCONOCIDO/sin data (viene de otro club, no tenemos historial) — ahí el sistema no puede detectar nada y el admin necesita marcarlo A MANO con su criterio. Este bloque agrega esa vía manual. Ver [[project_ascenso_descenso_categoria]] y RN-61.

- **Schema:** campo nuevo `Pareja.observacionCategoria String?` (motivo por el que el admin la marcó como pasada de categoría). **DB local sincronizada** con `prisma db push` (aditivo, solo agregó la columna).
- **Backend (`routes/torneos.js`):** el PATCH `/torneos/:id/parejas/:pid` (endpoint existente, NO se creó uno nuevo) ahora acepta `observacionCategoria` — string para marcar (se `trim`ea), `null` para quitar la marca.
- **Frontend (`TorneoDetallePage.jsx`, componente `ParejaCard`):** botón bandera 🚩 en cada tarjeta de pareja, **solo visible en torneos `open` o `closed`** (antes de arrancar, que es cuando tiene sentido cortar). Abre un panel inline con campo motivo **opcional** + dos acciones: **"Solo marcar"** (guarda `observacionCategoria`, muestra banner "Marcado por el admin: pasado de categoría — {motivo}" con link "quitar") y **"Marcar y no habilitar"** (da de baja a la pareja reusando el flujo de baja existente `handleBajaInscripto`, que ya notifica al jugador). El banner del corte manual **CONVIVE** con el de la detección automática (mismo lugar, misma franja ámbar). Handler nuevo `handleObservarCategoria` (`api.patch` + `updatePareja` local).
- **Regla de negocio asentada:** RN-61 — el corte de categoría tiene DOS vías: (1) automática para conocidos (motor de señales, solo avisa), (2) manual del admin para desconocidos (🚩, solo marcar / marcar y no habilitar). Vive en la etapa de inscripción (`open`/`closed`), no en finalizados.
- **Nota técnica (hallazgo colateral):** al regenerar el cliente Prisma se destapó un **drift viejo de la DB local** (estaba atrasada respecto al schema; el backend corría con un cliente Prisma viejo que lo tapaba). Se resolvió con `prisma db push` (no destructivo). **Recordatorio para el deploy:** la DB de producción hay que migrarla igual.

**ASCENSO/DESCENSO DE CATEGORÍAS — CIERRE (2026-07-06).** Con el motor + el "cut" + WIarky ya construidos (bloque de abajo), esta tanda cerró los pendientes que quedaban: que el jugador VEA el ascenso, indicador enriquecido en la tabla, historial/auditoría y descenso manual, y notificación pareja para cualquier cambio. Todo asistido por WIarky, respetando las reglas del dominio (ascenso = LOGRO / descenso = acto administrativo neutro). Ver [[project_categorias_formato_canonico]] y reglas RN-58/59/60.

- **Bloque 1 — el jugador VE la felicitación de ascenso** (cerró un pendiente anotado): la notif `ascenso_categoria` que WIarky ya disparaba ahora se renderiza en el panel del jugador. `playerNotificationsStore.js` (título "¡Ascendiste de categoría! 🎾" + cuerpo desde `data.mensaje`) y `PlayerNotificacionesPage.jsx` (ícono `TrendingUp` color del club, borde `border-club/30`).
- **Bloque 3 — indicador en la tabla de jugadores enriquecido:** el chip ámbar "Subir" de `JugadoresAdminPage.jsx` pasó de `Set` a `Map` (guarda toda la sugerencia, no solo el id) → ahora muestra "**Subir → categoría sugerida**" + `title`/tooltip con el **motivo en criollo** y la categoría destino. Sigue leyendo de `/jugadores/ascenso-sugeridos` (motor `lib/ascenso.js`).
- **Historial de cambios + descenso manual (auditoría):**
  - **Schema:** modelo nuevo `CambioCategoria` (`de?`/`a`/`tipo` asc·desc/`origen` wiark·admin_manual/`motivo?`/`adminId?`/`createdAt`, relación a `Jugador`, index `[clubId, jugadorId]`). **DB ya migrada** (`prisma db push` + generate).
  - **`lib/ascenso.js`:** helper nuevo `registrarCambioCategoria({clubId, jugadorId, de, a, origen, motivo, adminId})` — normaliza de/a, **deriva ascenso/descenso** del par de niveles (mejor = nivel menor), no registra si no hay cambio real, y es **best-effort** (try/catch, nunca rompe el cambio en sí).
  - **Se graba en los DOS flujos:** WIarky (`routes/clubs.js`, acción `ascender_jugador`, origen `wiark`) y admin manual (`routes/jugadores.js` PATCH `/:id`, origen `admin_manual` + `adminId`).
  - **Endpoint `GET /jugadores/:id/historial-categoria`** (admin, permiso `jugadores`) + render en el drawer del jugador (`JugadoresAdminPage.jsx`): timeline con flechita verde/club (ascenso) o gris (descenso), de → a, motivo, fecha y origen (WIarky/Admin).
  - **Descenso manual** = el admin baja la categoría editando al jugador; queda auditado con quién lo hizo y notifica al jugador (aviso neutro).
- **Notificación de cambio parejo (todo cambio avisa, con el tono correcto):** en `routes/jugadores.js` PATCH, usando el `tipo` que devuelve `registrarCambioCategoria`: **ascenso → felicitación 🎾** (misma notif `ascenso_categoria` que WIarky — antes el ascenso manual del admin NO notificaba, ahora sí); **descenso → notif neutra nueva `categoria_actualizada`** ("El club actualizó tu categoría · Ahora jugás en Xta", azul/`sky`, acto administrativo, no castigo). Front: `playerNotificationsStore.js` (títulos/cuerpos de ambos tipos) + `PlayerNotificacionesPage.jsx` (`categoria_actualizada` → ícono `UserCheck` sky).
- **Reglas de negocio asentadas:** RN-58 (ascenso = LOGRO / descenso = acto administrativo neutro, nunca castigo), RN-59 (todo cambio auditado en `CambioCategoria` + notifica al jugador), RN-60 (señales solo desde torneos, ventana 12m, títulos no ELO, modelo asistido).

**ASCENSO/DESCENSO DE CATEGORÍAS (2026-07-06).** Feature nueva pedida por Luca: detectar jugadores "pasados" (demasiado buenos para su categoría) y avisar/cortar. Investigación previa: `bibliotecario` (reglas de TÍTULOS, no ELO — un club chico no tiene volumen para ranking dinámico; el "cut" = federaciones impiden inscribirse en categorías inferiores; comunicar como logro no castigo; descenso manual; solo torneos, no Americano/Super8) + `Explore` (ya existía un `sugerenciaAscenso` heurístico + endpoint `/jugadores/ascenso-sugeridos` con regla ≥2 títulos; toda la stats por DNI ya está; resultados de torneo viven en JSON `grupos`/`brackets`, no hay tabla Partido). Decisión: modelo **asistido** (el sistema avisa, el admin confirma — nunca automático) y que el **destino final sea WIarky** (el superhéroe/guía). **BLOQUE 1 — motor `lib/ascenso.js`** (nuevo, reutilizable, con tests `ascenso.test.js`): `calcularSenalesAscenso(clubId, reglas)` computa por jugador×categoría (ventana 12 meses, solo torneos) títulos, finales, **parejas distintas con las que ganó**, **títulos con la misma pareja**, winRate; marca "pasado" con reglas configurables (default: **2 títulos O 3 parejas distintas O 3 títulos con la misma pareja**) y devuelve `categoriaSugerida` + un **`motivo` en criollo** (para WIarky). Helpers puros `nivelDeCategoria`/`categoriaSuperior`/`catCorta` (1ra=mejor…8va=peor). El endpoint `/jugadores/ascenso-sugeridos` se refactorizó para usar el motor. **Bug cazado con data real:** el bracket se indexa por la categoría TAL CUAL se guardó (formato viejo "4° Categoría") — normalizar la del jugador a "4ta Categoría" hacía `brackets["4ta Categoría"]` = undefined → 0 títulos. Fix: buscar la key por forma normalizada. **BLOQUE 2 — el "CUT"** (`detectarAlertasInscripcion` en `lib/ascenso.js` + endpoint `GET /torneos/:id/alertas-categoria` + UI en `TorneoDetallePage.jsx` `ParejaCard`): en las parejas anotadas, banner ⚠ ámbar cuando un jugador está pasado para esa categoría, por 2 señales confiables — (1) su categoría **declarada** es mejor que la de inscripción (ej. es 3ra, anotado en 4ta) o (2) **pasado por resultados** en esa categoría. Es AVISO al admin, NO bloquea (decisión de él). Ojo honesto documentado: "ganó 3ra en OTROS clubes" NO se puede detectar (multi-tenant, cada club ve lo suyo). 41+ tests verde. **BLOQUE 4 — WIarky (el superhéroe/guía)** (`lib/insight.js` + dispatcher `clubs.js` `/me/insight/accion` + `AsistenteWiark.jsx`): la voz la diseñó un agente especialista en diseño conversacional (traído a pedido de Luca). 2 herramientas nuevas: **`consultar_ascensos`** (lectura → WIarky responde "¿quién está pasado?" con la lista + motivo, enmarcado como LOGRO no castigo) y **`ascender_jugador`** (acción con botón de confirmación → al confirmar cambia `Jugador.categoria` + manda **notificación de felicitación al jugador** `tipo:'ascenso_categoria'`, valida dirección del ascenso). System prompt con las líneas del especialista: tono logro-no-castigo, no afirmar la acción antes del botón, y faceta **PROACTIVA** (cuando el dueño pregunta "¿cómo va el club?" WIarky menciona los pasados al pasar como oportunidad, sin ser molesto). **PENDIENTES (chicos):** renderizar la notif `ascenso_categoria` en el panel del jugador (para que VEA la felicitación); historial de cambios de categoría (auditoría); Bloque 3 (indicador/forma en la tabla de jugadores + enriquecer chip "Subir"); descenso manual. Ver biblioteca del bibliotecario (`oportunidades.md`).

**RETOQUE TEMPLATE FIXTURE "PREMIER PADEL" (2026-07-05, noche).** Ajustes tipográficos del `templateFixture === 2` (Premier Padel) en `TorneoPublicoPage.jsx` — está DUPLICADO en `makePartidoCard` (cards en curso/grupos) y en `TabFixture` (tab Fixture), los cambios se hicieron en las DOS copias: (1) **apellido y nombre mismo tamaño** (antes nombre en 9-10px); (2) **apellido + nombre en la misma línea** ("NOMBRE APELLIDO", antes apilados); (3) **jugador 1 y jugador 2 idénticos** (mismo tamaño/color/peso — el resaltado ganador/perdedor lo da la opacidad del lado, así el ganador queda con ambos jugadores del mismo color); (4) **quitado el número de pareja** (chip seed, irrelevante en esta vista); (5) **"✓ Ganó" agrandado** (9→13px); (6) **header agrandado** (ZONA 10→13, categoría 9→11, hora 11→13, cancha 10→12, FIN 10→12). Todo pedido por Luca uno por uno viendo la card en vivo.

**UI TORNEOS — VISTA PÚBLICA DE GRUPOS + AJUSTES DASH JUGADOR (2026-07-05, tarde).** Continuación de la tanda de UI, pedidos uno por uno. **Dash jugador (`PlayerTournamentsPage.jsx`):** (1) `getResultado` ya NO devuelve "Eliminado" cuando el torneo terminó y no ganaste/finalista — con el estado "Finalizado" alcanza (badge se oculta solo, guardado con `resultado &&`); mantiene Campeón/Finalista. (2) El cuadro (tab Cuadros) ahora usa `cardLayoutOverride="stat"` en `<BracketView>` (igual que la pública) → games por pareja por fila en vez de chips combinados. **Vista PÚBLICA de grupos (`TorneoPublicoPage.jsx`, decisión mobile-first: llega por WhatsApp = celular, por eso NO se hizo lado-a-lado sino compresión):** (3) card de partido rediseñada al **formato marcador compacto** (parejas apiladas, games a la derecha, ganador resaltado) respetando los tokens de tema claro/oscuro (`st.*`, `tNameW`, `tClrScoreW`). (4) **Acordeón por zona**: las **posiciones quedan siempre visibles**, y **solo los PARTIDOS colapsan** (arrancan TODOS colapsados) — toggle vistoso tipo pill con el color del club ("Ver partidos / Ocultar" + `ChevronDown` animado + contador). Estado `zonasAbiertas` (Set) + `toggleZona`. (5) **Chip de la letra de zona** rediseñado (idea robada de una imagen de referencia que Luca mostró): gradiente con el color del club + brillo superior + glow + letra en color de contraste automático (`isColorDark`). **PENDIENTE ANOTADO (no hecho, buena idea para después):** color por equipo/pareja consistente (mismo color en posiciones y partidos) para subir el "peso visual"/escaneabilidad — inspirado en la imagen de referencia. Nota de proceso: Luca frenó explícitamente el impulso de sumar features de growth (CTA por estado, share con gancho, perfiles clicables — todo investigado por el bibliotecario y guardado en `oportunidades.md`) porque "está arreglando cosas ya anotadas, no quiere sumar y no terminar más". Buen criterio de foco.

**REDISEÑO UI VISTA DE ZONA + CORRECCIONES PUNTUALES (2026-07-05).** Tanda de ajustes de UI pedidos por Luca uno por uno, con investigación del `bibliotecario` (referentes: Sofascore/ATP/Flashscore; Playtomic NO resuelve grupos in-app → diferenciador). **(1) Bracket `BracketView.jsx`:** marca de agua única grande → **mosaico de marcas chicas repetidas**, data-driven con flag `watermarkTile` en `BracketThemes.js` (solo theme `world-tour-dark`, el resto intacto). **(2) `AdminDashboardPage.jsx` agenda de hoy:** badge nuevo **FINALIZADO** (además de EN JUEGO/PRÓXIMO) cuando el turno ya terminó — usa el `fin` cross-midnight-aware ya calculado (no rompe con 22:30→00:00); badge en columna de ancho fijo (`w-20`) para que "Impago" quede alineado entre filas. **(3) Sets de partidos en VERTICAL** en las 3 vistas: `PlayerTournamentsPage`, `TorneoDetallePage` (helper `renderSets`), `TorneoPublicoPage` (card grupos, render único). **(4) REDISEÑO grande de la vista de zona en el dash jugador (`PlayerTournamentsPage.jsx`, componentes `StandingsZona` / `GrupoReadOnly` / `PartidoZonaReadOnly`):** card de partido pasó de horizontal (P1 | sets | P2, con hueco enorme al medio → "barrer la pantalla") a **formato marcador apilado** (una pareja arriba de la otra, games por set a la derecha, ganador en lima/negrita, perdedor atenuado); **se ELIMINÓ la grilla de enfrentamientos** (matriz cruzada) por redundante (repetía los resultados de los partidos); **partidos en grilla que tesela** (`repeat(auto-fill, minmax(min(100%,320px),1fr))`); **posiciones a la izquierda + partidos llenando la derecha** (flex-row en `lg`, apila en mobile); tabla de posiciones **ajustada a su contenido** (`w-fit`) en desktop. **MOBILE (responsive, desktop intacto):** fuentes/paddings responsive (`lg:`), las 8 columnas de la tabla entran en el celular apretando padding+fuente+truncando nombre (con `overflow-x-auto` de seguridad para no cortar datos nunca), tabs con `whitespace-nowrap` + "Todas las zonas"→"Todas" en mobile para que no se partan. Cambios replicados en las 2 pestañas (Mi zona + Todas las zonas). Biblioteca del bibliotecario actualizada (`hallazgos.md`, `oportunidades.md`). Iteración fuerte de ida y vuelta con Luca sobre el balance ancho/compacidad en pantallas anchas (es cuestión de gusto, no técnica). **PENDIENTE menor sugerido (no hecho):** "Crit." → tooltip/ícono.

**Anterior — MÓDULO FINANCIERO: pulido + auditoría doble + bloque de correcciones honestas** (números que no le mientan al dueño); red de seguridad de tests ampliada; bug de gating de la matriz de planes resuelto; **`franjasDia`/`franjaTimes` unificadas en `tiempo.js`** (fin de la triplicación); **LTV & churn del turno fijo** (valor recurrente anual + TF en riesgo de baja). Ver [[project_modulo_financiero]].

**LTV & CHURN DEL TURNO FIJO (2026-07-05, cierre de sesión).** Métrica nueva del plan que quedaba sin construir y cuyo dato ya existía. El TF es el ingreso más valioso porque se REPITE → perder uno no es perder un turno, es perder su valor anual. Backend `lib/finanzas.js` `calcularRetencionTF(clubId)` + endpoint `GET /finanzas/turnos-fijos`: (1) **valor recurrente anual** = Σ (precio × 52 semanas) de los TF confirmados (+ mensual); (2) **TF en riesgo de baja** = los que faltaron **≥3 veces en las últimas 8 semanas** (`diasAusentes` dentro de la ventana), ordenados por faltas y valor, con nombre del jugador / día / hora (owner-facing, gating `direccion`+`caja`). Frontend `DireccionPage.jsx`: tarjeta "Tus turnos fijos" (valor recurrente grande + lista en riesgo "a quién llamar" o empty state "están firmes 💪"). Verificado con datos reales (club demo: 5 TF = $6.240.000/año, 0 en riesgo). Umbral de riesgo (3/8sem) y las 52 semanas son constantes ajustables en el motor. Cerró el pendiente "construible ya" de mayor valor/esfuerzo que marcó el asesor-financiero.

**PULIDO + AUDITORÍA DEL MÓDULO FINANCIERO (2026-07-05).** Pasada de pulido sobre el módulo "Dirección del club" ya construido: primero red de seguridad de tests, después auditoría doble (`qa-flujos` + `asesor-financiero`) y un **bloque de 7 correcciones honestas** — el eje fue que ninguna métrica se contradiga ni exagere frente al dueño (número que miente = tablero que pierde confianza). Veredicto de la auditoría: **matemática núcleo correcta** (break-even, RevPACH, yield), **multi-tenant blindado** (todos los endpoints con `req.user.clubId` + `requireFeature('direccion')`+`requirePermiso('caja')`), **cross-midnight OK** en `franjasDia`/`franjaTimes`. Sin bloqueantes de plata ni fuga de tenant; los hallazgos fueron de precisión/cosmética y se corrigieron. Archivos tocados hoy (sin commitear): `lib/finanzas.js`, `pages/DireccionPage.jsx`, `lib/insight.js`, `lib/finanzas.test.js`. La auditoría quedó registrada en `agentes/qa/registro-auditorias.md` (entrada 2026-07-05, APTO CON RESERVAS).
- **Red de seguridad (commit bb32d4c, ya en repo):** `lib/finanzas.test.js` con tests de las piezas PURAS del motor (`franjasDia` cross-midnight, `franjaTimes`, `montoMensual`, `ocurrenciasDia`, `turnosDisponiblesEnFechas`) — exportadas las 5 funciones. Blinda el **denominador** del break-even ANTES de tocar `franjasDia`. **UNIFICACIÓN HECHA (cierre de sesión):** `franjasDia` y `franjaTimes` eran 3 copias idénticas (`clubs.js`, `insight.js`, `finanzas.js`) → movidas a **fuente única en `lib/tiempo.js`** (junto a los helpers cross-midnight); los 3 consumidores ahora importan de ahí. Copias idénticas → cero cambio de comportamiento (37/37 tests verde lo confirman). El test importa `franjasDia`/`franjaTimes` desde `tiempo.js`. Mismo commit: flag `cogsFaltante` en `calcularContribucionSectores` — cuando el bar vende sin COGS cargado, el front muestra "margen sin verificar" + franja ámbar en vez del engañoso "100% de margen".
- **Bloque de correcciones honestas (7, sin commitear):**
  - **#1 — Costo del turno vacío sin alarmismo:** se mató el agregado "$X sin recuperar" (contradecía el "vas ganando" del héroe). Ahora se muestra el costo POR TURNO con marco honesto ("lo que cuesta tener la cancha abierta un turno; llenar los horarios flojos es la mayor oportunidad, no todos se llenan") — corregido en `DireccionPage.jsx` (MetricCard) **y** en el chatbot WIarky (`insight.js`, herramienta `consultar_salud_financiera`).
  - **#2 — Contribución por sector resta el variable por turno:** `calcularContribucionSectores` ahora trae TODOS los costos activos (antes solo `tipo:'fijo'`) y **resta el costo variable × turnos** a Canchas y Clases (los sectores que consumen la cancha). Antes lo omitía → inflaba el margen ~65%. El bar no consume turno (solo COGS).
  - **#3 — Ausentismo excluye turnos fijos:** el proxy de no-show filtra `!esTurnoFijo` (muchos clubes cobran el TF por mes, no por día → un TF impago de ayer no es ausencia; contarlo inflaba el % y acusaba de algo ya cobrado).
  - **#4a — Flujo de caja del mes en curso:** `ocurrenciasDia` ganó param `desdeDia`; en `calcularFlujoCaja` el mes actual (k=0) cuenta solo las caídas de TF de hoy en adelante (las de días ya pasados no son "cobro futuro" y muchas ya se cobraron → inflaban la barra del mes 1).
  - **#4b — Aviso en el flujo 90d:** nota al pie: "cuenta lo agendado (TF + reservas cargadas), NO las reservas sueltas que nadie sacó → los meses 2-3 se ven más flojos de lo que van a ser".
  - **#5 — `ocupacionPct` clampeado a ≤100%** (`Math.min(100, ...)`; una reserva fuera del horario configurado daba "130% de ocupación"). **`breakEvenPct` se dejó SIN clamp a propósito:** >100% es un mensaje VERDADERO ("no llegás ni llenando todo").
  - **#6 — Onboarding, pregunta de rescate:** flag `falta.precio` en el motor + 3ª pregunta condicional en `DireccionPage.jsx` ("¿a cuánto cobrás el turno?") que alimenta el preview del break-even EN VIVO cuando el club no tiene ni precio de cancha ni turnos cobrados (sin esto el "ajá" nunca aparecía). **PENDIENTE (follow-up):** hoy solo alimenta el preview, NO persiste el precio como `precioReferencia` en la config del club.
  - **#7 — "Te faltan 0 turnos" corregido:** cuando el break-even no es calculable (`porEncimaDelEquilibrio == null`), `Math.abs(null)=0` mostraba un mensaje contradictorio junto al break-even "—"; ahora muestra "cargá tus costos y el precio para ver cuántos turnos necesitás".
- **Bug de gating (NO era del código):** el ítem "Dirección" del Sidebar desapareció porque la matriz de planes guardada en DB (`platformSetting 'planMatriz'`) no tenía `'direccion'` en ningún plan (se sembró antes de que el feature existiera). Lo resolvió Luca agregando `'direccion'` a premium desde el panel. **Anotado:** la matriz vive en DB y hay que mantenerla sincronizada con `DEFAULT_MATRIZ` del código (relevante en producción). Ver [[project_feature_gating]].
- **PENDIENTES que siguen abiertos:** unificar `franjasDia` (3 copias — pedido viejo de Luca, ahora blindado por tests); persistir `precioReferencia` del rescate (#6); hallazgos 🟡/🔵 no bloqueantes del qa (heatmap cross-midnight desalinea celdas nocturnas; PATCH /costos actúa como PUT; borde TZ de la ventana de 30d). Luego (cuando avise): seed demo + QA final + deploy.

**Anterior (2026-06-30):** **MÓDULO FINANCIERO / "DIRECCIÓN DEL CLUB" — arranque (Bloques 0-1).** Decisión estratégica de Luca: construir el módulo financiero **completo AHORA** (antes del primer cliente real) para entregar un MVP redondo que impacte en la demo; se trabaja por **BLOQUES chicos y pedagógicos** (Luca está aprendiendo el dominio financiero → explicar cada concepto con analogías antes de codear, ver [[feedback_explicar_con_analogias]]). **Bloque 0 (plan):** plan visual navegable `WIARK_Plan_Modulo_Financiero.html` (raíz) con todas las métricas (RevPACH, ocupación/franja, break-even, contribución por sector, yield, hora vacía, flujo 90d, capa Argentina, clima×ocupación, simulador "¿y si?", benchmark cross-tenant, LTV/churn TF) — cada una con qué es en criollo, de qué dato sale, semáforo 🟢🟡🔴 y "cómo se vende". Un subagente CFO hizo stress-test y ajustó el diseño: modelo `Costo` **SIN drivers** (costo directo por sector + prorrateo por ingreso, simple>exacto), **onboarding financiero de 4 preguntas** con break-even en vivo (el mayor riesgo NO es técnico: es que el dueño no cargue los costos), reorden A→B1→B2→B3→C. Nuevo agente permanente **`asesor-financiero`** (`.claude/agents/`). **Bloque 1 (Fase A — captura irreversible, "el caño bajo el piso", HECHO y verificado en vivo):** (1) `Reserva.tarifaLista Int?` = snapshot del precio de lista de la cancha al crear (para yield real; agregado en los 6 `reserva.create` vía helper `lib/finanzas.js` `tarifaListaSnapshot`); (2) modelo `EventoUso` + endpoint `POST /api/eventos` (requireAuth, fire-and-forget) + helper front `lib/telemetria.js` `trackEvento` — instrumentado login admin (`LoginPage`) + navegación del dashboard (`AdminDashboardLayout`). Telemetría probada (6 eventos reales capturados). `db push` **aditivo, 132 reservas intactas**. Bug hallado y corregido: `lib/api.js` NO agrega `Authorization` solo → `trackEvento` debía pasar el token a mano (el 401 silencioso daba 0 eventos). **Bloque 2 (B1 — break-even + onboarding, HECHO y verificado):** modelo `Costo` (sin drivers) + CRUD `/api/costos` + **motor de cálculo** `lib/finanzas.js calcularSaludFinanciera()` → `GET /api/finanzas/salud`: break-even, **rinde por turno** (RevPACH), costo del turno vacío, ocupación — todo en **TURNOS de 1.5h** (unidad natural del sistema, coherente con el dashboard; NO en horas), ventana móvil 30 días. Sección nueva **"Dirección"** en el menú admin (`DireccionPage.jsx`, ruta `/dashboardAdmin/direccion`, gating finanzas+caja): **onboarding de 2 preguntas** con break-even EN VIVO mientras el dueño tipea (el "ajá"), + tablero (break-even como héroe con termómetro visual, tarjetas Rinde por turno / Costo del turno vacío, tooltips pedagógicos ⓘ). Diseño validado por Luca. Decisiones de nombre (criollo): "**Rinde por turno**" (no RevPACH), "**Costos fijos del mes**" (no "mochila"). Break-even usa `precioRef` = precio realizado, o precio de lista si el club aún no cobró nada (para que un cliente nuevo vea algo). Verificado con datos reales del club demo (578 turnos disp., mate correcta: 3M/(24000-2250)=138 turnos). **Bloque 3 (B2 — tablero completo, HECHO y validado por Luca):** todas las métricas nuevas en `lib/finanzas.js` + endpoints en `routes/finanzas.js`, mostradas en `DireccionPage.jsx`. (1) **Heatmap** día×franja (`/finanzas/heatmap`, 8 semanas): zonas **Pico/Medio/Frío** (nombres criollos elegidos por Luca; "frío" en vez de "valle"), grilla con celestes=vacío, "cerrado" con rayado diagonal. (2) **Yield** (rendimiento de tarifa): barra de 3 segmentos (hacés / fuga por vacío / fuga por descuento, suman 100%), con "de cada $100..."; usa el `tarifaLista` del Bloque 1. (3) **Contribución por sector** (`/finanzas/sectores`): Canchas/Clases/Bar-Tienda, ingreso − COGS − fijos prorrateados **por ingreso** (sin drivers); COGS del bar de `Cargo.costo`. (4) **Flujo de caja 90d** (`/finanzas/flujo`): 3 meses, cobros (TF recurrentes + reservas agendadas) vs pagos (solo costos **fijos** — el variable por turno NO es compromiso de calendario, se excluyó). (5) **Ausentismo automático** (en `/salud`): turnos vencidos impagos no marcados "no cobrar" = proxy de no-show, **inferido sin botón ni campo nuevo** (decisión de Luca: todo automático, no marcar a mano). **Real vs nominal (IPC) se movió al Bloque 5** (sin series históricas hoy, sería un toggle vacío — criterio del asesor, aceptado). **Decisión de negocio (seña):** la solución de fondo al no-show es la **seña online (MercadoPago), opcional por club** (toggle como autoConfirma) — es el "siguiente paso natural" que el propio dato del ausentismo justifica; se hace cuando se integre MP. NO se tocó ReservasPage ni flujos de cobro (todo lectura). **Bloque 4 (B3 — simulador "¿y si...?", HECHO y validado por Luca):** componente `Simulador` en `DireccionPage.jsx`, **100% frontend** (usa los insumos de `/finanzas/salud`, no toca datos). Dos sliders (cambio de tarifa −20/+30% y cambio de ocupación) → recalcula el resultado del mes en vivo (con delta ganás/perdés) + mini-herramienta "¿cuántos turnos para pagar un gasto nuevo?" (empleado/inversión). Convierte el tablero de informe en asesor. **Bloque 5 (C — chatbot financiero, HECHO):** se extendió el chat de WIarky (`responderChatAgente` en `insight.js`) con una herramienta nueva **`consultar_salud_financiera`** (llama `calcularSaludFinanciera`) → WIarky responde en criollo "¿cómo va el club?", "¿cuántos turnos para no perder?", "¿cuánto pierdo por ausencias?" con datos reales. Sin pantallas nuevas, reusa el chat existente. El resto de Fase C (benchmark cross-tenant, clima, real/nominal IPC, agente de onboarding) **DIFERIDO** (necesita volumen/tiempo — criterio del asesor: no cajas vacías).

**Pulidos post-construcción:** (1) **ABM de costos completo** (`features/direccion/CostosPanel.jsx`, modal desde "Gestionar costos" en Dirección): lista + form con concepto, monto, fijo/variable, periodicidad (mensual/bimestral/anual/una vez), meses de pago (para aguinaldo → Jun+Dic), y sector (canchas/clases/bar/general) — usa el CRUD `/api/costos` ya existente. Desbloquea el flujo 90d (baches de aguinaldo/bimestral) y la contribución por sector afinada. Decisión: "de qué parte"=sector (acotado, alimenta contribución, necesita ingreso); el **rubro libre de gasto se difirió** (no alimenta métricas hoy; se hará con una vista de desglose de gastos). (2) **Widget "Cómo va el club"** en el Resumen (`AdminDashboardPage.jsx`): tarjeta de la grilla superior (fondo lima, icono en chip, se adapta a 2/3/4 columnas según permisos) que muestra el % de equilibrio + estado y linkea a Dirección. Solo con permiso caja (fetch `/finanzas/salud`; 403 → no aparece). (3) **Gating premium (opción B):** feature nuevo **`direccion`** en `lib/planes.js` (solo en `premium`, NO en pro) — separa *operar la plata* (pro: caja/stock) de *dirigir el negocio* (premium: break-even, rentabilidad, simulador). Guards de `/api/finanzas` y `/api/costos` pasaron a `requireFeature('direccion')`; ítem del Sidebar idem. Decisión de Luca: es el "caballo de batalla" (la mayoría de los clubes no tiene esto) → justifica el premium. En prueba (14 días) se ve igual (prueba = premium completo). **NOTA:** la matriz vive en DB (sembrada con DEFAULT_MATRIZ la 1ª vez) — en producción hay que agregar `direccion` a premium en la matriz vía panel. **Pendiente inmediato: unificar franjasDia (3 copias) — pedido de Luca. Luego (cuando avise): seed demo + QA + deploy.** Ver [[project_modulo_financiero]].

**Anterior (2026-06-29):** **REDISEÑO DEL COBRO DEL TURNO = COMANDA (persistencia instantánea + cobro rápido por jugador). qa-flujos APTO.** `CheckoutTurno` pasó de "acumular local + Confirmar todo" (se perdía al cerrar) a **persistir cada consumo al instante** como la comanda: nuevo `GET /reservas/:id/cuenta` (refresca el modal) + reuso incremental de `POST /:id/cuenta`. Consumos **agrupados por persona** en el split (cada jugador con lo suyo debajo); el **consumo compartido** reparte y muestra la parte de cada uno. **Reapertura** reconstruye las personas desde los cargos (excluyendo los ya resueltos → no reaparecen). **Cobro rápido**: botón "Cobrar $X"/"A cuenta $X" por persona que la registra al instante y la saca del split (jugador puede quedar a cuenta, casual se cobra ya). qa-flujos: **APTO para uso real, sin 🔴** — anti-sobrecobro (guard re-leído en TX Serializable), stock exacto, casual-a-cuenta bloqueado, multi-tenant, cross-midnight OK. Residuo 🟠 no bloqueante: convivencia cobro-por-persona + "Confirmar" global puede dar 400 (backend lo corta, no pierde plata). También: `stock_bajo` se filtró del panel "Avisos de jugadores" (iba a la campana, se veía vacío). Ver [[project_rediseno_cobro_turno_comanda]].

**Anterior (2026-06-28 Turno fijo):** **COBRAR TURNO FIJO desde la grilla (antes no se podía) + ajustes de diseño.** (1) **Cobro de turno fijo (camino de plata, qa-flujos OK):** el turno fijo de la grilla es una proyección VIRTUAL del modelo `TurnoFijo` (sin `Reserva` real para el día) → por eso no tenía botón "Cobrar turno". Nuevo endpoint backend `POST /turnos-fijos/:id/materializar` (`requirePermiso('ventas')`): bajo `runSerializable` crea la `Reserva` real del día (idempotente — si ya existe la devuelve; rechaza días en `diasAusentes`). Front (`ReservasPage.jsx`): el turno fijo finalizado e impago ahora muestra **"Debe"** (mismo `venceCobro` que las online, antes era "Pendiente" fijo); el botón "Cobrar turno" aparece para `tipo==='fijo'`; handler `abrirCheckout` materializa → abre `CheckoutTurno` normal (split/consumos). Guard anti doble-submit (`preparandoCobroRef`). qa-flujos: APTO, sin bloqueantes (idempotente, anti-doble-cobro, cross-midnight 22:30→00:00 OK, grilla sin duplicados). Residuo 🟡 no-bloqueante: `materializar` no re-chequea solape con otra reserva (TOCTOU estrecho; el TF virtual ya se oculta si hay reserva en el slot). (2) **Diseño/UX:** sidebar — fix del "salto" de la card de plan al colapsar (fade + max-h + delay, ancho fijo); **canchas Outdoor** — el form pasó de checkbox "Indoor" a toggle **Indoor/Outdoor** (el modelo `Cancha.indoor` boolean y los 10+ displays ya lo soportaban, solo faltaba ofrecerlo); **WIarky arrastrable** — se mueve con drag y recuerda la posición (localStorage), y el **chat se abre hacia el lado con espacio** (openDir según la posición de la pelotita). Ver [[project_cobro_turno_fijo]] y [[project_wiarky_mascota]].

**Anterior (2026-06-28 UI torneo):** **UX TORNEO PÚBLICO + DRAW CON SETS POR LADO + STOCK NEGATIVO VISIBLE.** (1) **Stock:** el sistema ya permitía sobreventa (stock→negativo) pero la UI lo ocultaba como "Sin stock"; ahora el chip de inventario (`StockTab.jsx`) muestra el número negativo real ("-3 u.") en rojo + tooltip "vendiste sin stock cargado". La venta NO se bloquea (decisión de Luca: puede tener el producto físico aunque no lo cargó); el aviso a la campana (`stock_bajo`) ya disparaba con negativo. (2) **Draw con sets por lado:** el draw del torneo (público + admin) pasó del layout default (chips "6-4" centrados) al layout **'stat'** (cada pareja con sus games por set al lado, ganador resaltado, como cuadro clásico). Se hizo con un prop nuevo `cardLayoutOverride="stat"` en `<BracketView>` (NO se tocó ningún theme ni el selector de templates; el preview de publicación respeta el template elegido). Nombres del draw en **2 líneas** (un apellido por línea → no se cortan los largos). Ajustes de tamaño/spacing del layout 'stat' (nombre 15px + letter-spacing, badge de zona 26px, horario/fecha/cancha más grandes). (3) **TorneoPublicoPage:** fuentes de la tab Grupos +2px parejo; tabs de navegación (Resumen/Fixture/Grupos/Draw) compactos en mobile + scroll interno (ya no desbordan el ancho → adiós franja blanca); spacing del nombre campeón/subcampeón (leading-relaxed + tracking). Todo build verde, probado por Luca en pantalla. Ver [[project_bracketview_templates]] y [[project_stock_inventario]].

**Anterior (2026-06-27 alerts/confirm):** **UX: barrido de `alert()`/`confirm()` nativos del área admin.** (1) **20 `alert()` → toasts** (`useToast`) en ConvocatoriasAdmin, AdminSponsors, ProfesorAgenda, QuienesSomos (5 componentes), TorneoDetalle y ReservasPage (5, con cuidado — `toastUi` para no chocar con un estado `toast` local; solo los `catch`, lógica intacta). Queda 1 `alert` a propósito: `lib/api.js` (interceptor global, no es componente React). (2) **NUEVO `ConfirmProvider` global** (`components/ui/ConfirmProvider.jsx`, montado en App.jsx): hook `useConfirm()` → `await confirmar({ titulo, mensaje, confirmText, danger })` = Promise<boolean>, reemplazo casi 1:1 del `confirm()` nativo. Migrados los 4 `confirm()` reales (StockTab eliminar, ConvocatoriasAdmin fixture, EventosPage reset, TorneoDetalle grupos). **Cero `confirm()` nativos.** Build verde. Deuda menor: 2 modales de confirmación caseros (PlayerEventos + TorneoDetalle) podrían unificarse al ConfirmProvider a futuro. Ver [[project_toast_unificar]].

**Anterior (2026-06-27 Matching→caja):** **ROSTER DEL PARTIDO → COBRO DEL TURNO (matching → caja).** Cierra el círculo: el roster de un partido abierto pre-puebla el split del cobro. (1) **Backend** `GET /solicitudes/por-reserva/:reservaId` (guard admin + permiso `ventas`, igual que el cobro): dado un turno, si tiene un partido `abierta`/`completa` atado (`SolicitudJugador.reservaId`), devuelve `{ partido:true, jugadores:[{jugadorId,nombre,titular}] }` (titular + participantes ACEPTADOS, sin duplicar); si no, `{ partido:false }`. (2) **Frontend `CheckoutTurno.jsx`** (modal de cobro desde la grilla): al abrir consulta ese endpoint; si es partido muestra **aviso verde híbrido** "🎾 Este turno es un partido abierto · N anotados · nombres" + botón **"+ Cargar al split"**. Al apretarlo → modo Dividir + carga los jugadores (**merge por jugadorId**: no duplica al titular ni pisa lo que el admin cargó a mano) + auto-reparto en partes iguales. Si el turno NO es partido, el cobro funciona idéntico a siempre. Decisión UX de Luca: **híbrido (aviso + botón)**, no automático (no sorprende, no pisa) ni botón seco (se perdía). Probado e2e por Luca. NO se tocó `ReservasPage.jsx`. **Pendiente futuro:** el aviso ya trae partidos incompletos también; barrer alerts admin; deadline/auto-cierre. Ver [[project_convocatorias_matching]] y [[project_checkout_grilla_split]].

**Anterior (2026-06-27 Cara pública):** **CARA PÚBLICA DE PARTIDOS ABIERTOS (captación desde la landing).** El partido abierto ahora se vende afuera, igual que Americano/Super 8. (1) **Página pública `/partidos`** (`PartidosPublicosPage`, sin login): lista los partidos abiertos PÚBLICOS del club (`GET /solicitudes/publica/club/:slug`), estilo Court Noir, polling 15s, cada card linkea al lobby `/partido/:id`; **empty state** con CTA "Sumarme al club" → `/jugadores/registro` (cold-start → embudo de socios). (2) **Navbar público:** ítem **"Partidos"** ubicado **después de Contacto** y **destacado** (pintado con el color del club, como Americano y Super 8 — son las secciones "fuertes" de venta de turno para el dueño), icono **Swords** (espadas). (3) **Sección landing `PartidosAbiertosSection` "¿Te falta un cuarto?"** — **rediseñada distinta** a "Armá tu Americano" (Luca: "sino está igual y no me gusta"): layout centrado con glow lateral, badge "Sumate y jugá", **3 step-cards numeradas** (1 Buscás → 2 Decís «¡Voy!» → 3 A la cancha) con número gigante de fondo + icono en gradiente, CTA "Ver partidos abiertos" → `/partidos`. Insertada en los 5 templates después de Americano/Super 8 (`dark` según template). (4) **Privacidad (Habeas Data):** el feed y el lobby PÚBLICOS muestran **solo el primer nombre** (sin apellido) del organizador y del roster. (5) **Botón "Compartir por WhatsApp"** en la página pública del partido (mensaje pre-armado: faltan N + categoría + fecha/hora + link) = **el motor real de captación** (link 1-a-1 con intención). **Bibliotecario:** Playtomic/MATCHi NO muestran feed de partidos a usuarios anónimos; el feed público es descubrimiento+marca, no el match-filler; el llenador real es el link de WhatsApp + push a la categoría (`agentes/bibliotecario/`). Build verde. **Pendiente futuro:** push al celular (PWA+WebPush); deadline/auto-cierre; roster pre-puebla el cobro. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-27 Partidos jugador):** **PÁGINA "PARTIDOS" (feed de descubrimiento) + RANGO DE CATEGORÍAS.** (1) Nuevo ítem de navbar **"Partidos"** (`/dashboardJugadores/partidos`, icono Swords) = el "lobby del lado del jugador": lista los partidos abiertos PÚBLICOS de tu categoría (reusa `GET /solicitudes/abiertas`) → "¡Voy!" (pendiente de aprobación). Empty state educativo (cold-start) con botón "Armá el tuyo". El feed se **movió** desde "Reservar cancha" (queda solo la card need-driven). (2) **Rango de categorías:** `SolicitudJugador.categorias String[]` (migración aditiva; `categoria` queda legacy). El modal "Busco para jugar" ahora es **multi-selección** (tu categoría preseleccionada + sumás cercanas, ej. 3ra·4ta·5ta). Backend notifica a TODAS las categorías (`categoria: { in }`); `/abiertas` filtra `categorias: { has: miCategoria }`; los displays muestran el rango (join). Reusa el patrón de convocatorias. Build verde, probado e2e. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-26):** **PARTIDO ABIERTO: APROBACIÓN DEL ORGANIZADOR + CANCELACIONES COHERENTES + "VAS A JUGAR" + TOASTS.** (1) **Aprobación:** `SolicitudParticipante.estado` (pendiente/aceptado, migración aditiva). `/voy` ahora deja PENDIENTE + notif `solicitud_pidio_sumarse` al titular; nuevos `/:id/aprobar` y `/:id/rechazar` (notifs `solicitud_aceptado`/`solicitud_rechazado`); el partido se completa con los ACEPTADOS (Serializable). UI aprobar/rechazar en "Mis búsquedas". (2) **Cancelaciones (huecos críticos cerrados, helper `lib/solicitudes.js`):** cancelar la BÚSQUEDA avisa a los participantes (`partido_cancelado`); cancelar la RESERVA cancela la búsqueda atada (son un conjunto) + avisa; admin cancela reserva de jugador → ahora le avisa (`reserva_cancelada_admin`). Convocatorias ya avisaban OK. (3) **"Vas a jugar":** sección en Mis reservas con los partidos donde te ACEPTARON (organizador + roster "Jugás con: ..." + cancha del turno; `GET /solicitudes/sumado`). (4) **Fixes:** cancelar turno refetchea búsquedas (desaparecen); `/mias` filtra `fecha>=hoy` (las pasadas se van solas). (5) **Toasts:** reemplazados los `alert()` por `useToast` en TODA el área jugador (PlayerEventosPage, CargarResultados, PlayerRegisterPage, PlayerReservasPage, PlayerLayout). Admin queda con alerts (pendiente, área distinta). Notificaciones HOY = in-app; push = futuro. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-26 Lobby):** **LOBBY PÚBLICO/PRIVADO + LINK COMPARTIBLE + TOOLTIPS.** El partido abierto ahora tiene visibilidad (campo `SolicitudJugador.visibilidad`, migración aditiva): **🌐 Público** = avisa a tu categoría (notif in-app) + link · **🔒 Privado** = solo por link (sin notif), para tu grupo. Mismo criterio que Americano/Super 8 (decisión de Luca: "así debería ser como el Super 8"). El **link existe siempre** (`/partido/:id`). Nuevo router público `solicitudes-publicas.js` (GET `/publica/:id` por link = pública o privada; GET `/publica/club/:slug` solo públicas). Nueva **página pública `PartidoPublicoPage`** (`/partido/:id`): lobby en vivo (faltan N, roster, barra, polling 15s) + "¡Voy!" con login-con-retorno (`pending_partido` en PlayerLayout → auto-sumado). Botón **🔗 Compartir** en "Mis búsquedas" (copia el link) y en "Mis eventos" (convocatorias). **Tooltips `InfoBlock`** "¿Cómo funciona?" en Americano/Super 8 y en Reservas, con la aclaración **"todos los avisos llegan dentro de la app (🔔 campana)"**. `GET /abiertas` ahora filtra `visibilidad:'publica'` (privados no se listan). Build verde, probado e2e. **Notificaciones HOY = in-app**; push al celular = futuro (PWA+WebPush / app nativa+FCM). **Futuro lobby:** feed público en la página del club; roster pre-puebla el cobro. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-26 Fase 2):** **PARTIDO ABIERTO MULTI-CUPO + ROSTER + "¡YA ESTÁN TODOS!".** Sobre la Fase 1, se evolucionó `SolicitudJugador` a partido abierto: campo `cupos` (`busco:'jugador'` → 1-3 elegible; `'pareja'` → 2 fijo) + modelo nuevo **`SolicitudParticipante`** (roster, unique (solicitud,jugador)). Migración `db push` **aditiva, sin perder data**. `POST /:id/voy` ahora **ocupa un cupo** bajo `runSerializable` (anti sobre-llenado: nunca > cupos); al completar → `estado='completa'` + notif **`partido_completo`** "¡Ya están todos! 🎾" a TODO el roster (titular + los que se sumaron); mientras falta gente, al titular le llega "X se suma, faltan N". Front: selector **"¿cuántos te faltan?"** en BuscarJugadorModal (solo "Un jugador"), feed muestra "Faltan N", "Mis búsquedas" muestra roster + "✓ Completo", notif `partido_completo` linkea a Mis reservas. Build verde, probado e2e por Luca. Flujo de prueba Bloque 10 (pasos 10.1-10.4). **Futuro:** lobby público/privado (reusa convocatorias) + roster pre-puebla el cobro del turno. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-26 Fase 1):** **MATCHING "BUSCO JUGADOR" REUBICADO AL BLOQUE RESERVAS.** Decisión de Luca (corrigió el diseño): el matching de jugadores NO va en Americano y Super 8 (eso es otro producto, evento de 8) — va en RESERVAS (partido de 4). Se reorganizó: **Reservar cancha** ahora tiene (1) card dinámica **need-driven "armá tu partido"** (3 estados: tenés turno sin completar → "Buscar el que falta" / ya buscás / no tenés turnos → gancho a reservar; se apoya en TUS reservas → nunca se ve vacía, esquiva el cold-start) + (2) feed **"Buscan jugadores en tu categoría"** con **¡Voy!** (el receptor de la notif). **Mis reservas** suma sección **"Mis búsquedas"**. **Americano y Super 8** quedó solo con eventos (se le quitaron las secciones de solicitudes que estaban mal ubicadas). La notif `busca_jugador` ahora linkea a `/dashboardJugadores/reservas` (antes iba a eventos = callejón sin salida). Backend SIN cambios (reusa `SolicitudJugador` + `/solicitudes/abiertas` + `/voy`). Investigación de mercado del bibliotecario (Playtomic/MATCHi/Padelero) confirmó el modelo. Flujo de prueba Bloque 10. **Fase 2 pendiente (acordada):** cupos configurables "me faltan 2" + roster "X de 4" + notif "¡ya estamos todos!" al completar + lobby público/privado en página pública. **Futuro:** el roster (titular + los que dijeron Voy) pre-puebla los jugadores del turno para el cobro/split. Ver [[project_convocatorias_matching]].

**Anterior (2026-06-25 tarde):** **UNIFICACIÓN DE CATEGORÍAS DE JUGADOR (fuente única).** Había 4 formatos distintos en 4 archivos: `"4ta Categoría"` (registro, canónico), `"4ª"` (admin edita jugador — ¡rompía el match y dejaba al jugador huérfano!), `"4ta"` (convocatoria + busco jugador), `"4° Categoría"` (torneos). Resultado: notificaciones por categoría NO matcheaban (0 notificados). Fijado el idioma pádel: **`"1ra/2da/4ta Categoría"`, NUNCA grados "4°"**. Front: fuente única `src/constants/categorias.js` (CATEGORIAS_JUGADOR + catLabel) → 5 lugares muestran el chip corto pero envían/guardan el completo (incl. torneos, que conserva variantes "4ta Categoría B"). Backend: red defensiva `lib/categorias.js` `normalizarCategoria()` en los 2 puntos de match (solicitudes + convocatorias) + toda escritura de Jugador.categoria (registro + ambos PATCH). **Probado contra DB real: chip "4ta" pasó de 0 → 3 notificados.** Tests: 8 nuevos (19/19 unit verde). Ver [[project_categorias_formato_canonico]].

**Anterior (2026-06-25 mañana):** Red de seguridad pre-deploy: CI GitHub Actions (`npm test` por push) + Sentry dormido (`SENTRY_DSN` en Railway). Y **CIERRE BLOQUE RESERVAS — caminos de plata blindados (pre-entrega).** El agente `qa-flujos` enumeró TODA la matriz de concurrencia y quedaban 2 caminos 🟠 sin transacción: (G1, ya cerrado) doble-cancelación creaba 2 cargos; y los **cobros**. Ahora: **`/reservas/:id/cuenta`** — el guard anti-sobrecobro se leía FUERA de la TX → dos cobros concurrentes superaban el precio del turno; movido **DENTRO de `runSerializable`** (re-lee lo ya cobrado en la TX). **`/reservas/:id/cobrar`** — todas las escrituras envueltas en `runSerializable` (atómico todo-o-nada) + turno **idempotente** (re-lee el cargo pendiente en la TX → doble-submit no marca pagado dos veces ni duplica la deuda). **Suite ampliada a 18 escenarios** (17: 6 cobros del turno completo concurrentes → solo 1 cobra; 18: dos mitades → ambas entran, total = precio exacto, prueba que el guard no es sobre-restrictivo). **18/18 verde x3 determinístico + 11/11 unit.** Residuo conocido (post-entrega): `/cobrar` por dos requests HTTP separados aún puede duplicar consumos — hoy lo frena el botón `disabled` del front; blindaje 100% server-side = token de idempotencia (no se mete a días de la entrega, riesgo>beneficio).

**Anterior (2026-06-24):** **HARDENING RESERVAS + matching "busco un cuarto".** (1) Bug cross-midnight: turnos que terminan 00:30/01:00 rompían deuda/cobro/display (el chequeo `horaFin === '00:00'` invertía el rango) — corregido en deudas/clubs/ReservasPage/AdminDashboard/Clases/PlayerMisReservas/PlayerDashboard + helper único `finEnMin`/`cruzaMedianoche`/`duracionMin` (tiempo.js + timeUtils.js) con tests + regla en CLAUDE.md. (2) Agujero cross-resource: el TF del jugador con auto-confirma ON solo chequeaba otros TF — cerrado con **fuente única `conflictos.js`** (conflictoEnFecha/conflictoEnDia, chequea reservas+clases+TF cross-midnight). (3) `runSerializable` con backoff+jitter (anti-livelock). (4) **Suite de concurrencia** `npm run test:concurrencia` (12 escenarios verde x3). (5) Matching **"Busco un jugador"** (caso 2) validado e2e. Detalle abajo.

**Anterior (2026-06-23 tarde):** Convocatorias: form admin DINÁMICO (picker de horarios con 2+ canchas, filtra hora actual, tope canchas del club, buscador de organizador igual al de turnos, categorías checkbox 1ra-8va, género). Super 8 = solo parejas sugeridas drive/revés. WIarky endurecido por código.

**Anterior (2026-06-23 mañana):** Convocatorias: cierre del bloque. **Visibilidad pública/privada** (pública se lista + notifica; privada solo por link, para el grupo del organizador). **Sección "Americano y Super 8" en el dash jugador** (Abiertos + Mis eventos). **Login con retorno + auto-anotado**: "Voy" sin login → te registrás → volvés anotado solo (embudo de socios). El bloque quedó operable de punta a punta.

---

## Unificación de categorías de jugador — fuente única (2026-06-25)

Deuda histórica: cada pantalla inventó su propio formato de categoría → las notificaciones por categoría (busco jugador + convocatoria) no matcheaban. El admin era el peor: guardaba `"4ª"` y dejaba al jugador sin matchear nada. Ver [[project_categorias_formato_canonico]].

- **Idioma definido por Luca (regla dura):** `"1ra/2da/3ra/4ta/5ta/6ta/7ma/8va Categoría"`. **NUNCA grados `"4°"`** ("es como grados, nada que ver — ESTO ES PADEL"). El formato COMPLETO va a DB (`Jugador.categoria`) y es lo que compara el backend; en la UI se muestra el corto (`"4ta"`) con `catLabel()`.
- **Front — fuente única `src/constants/categorias.js`** (`CATEGORIAS_JUGADOR` + `catLabel`). Apuntados: `useRegisterForm.js` (re-exporta), `JugadoresAdminPage.jsx` (fix `"4ª"`→completo, era el grave), `ConvocatoriasAdminPage.jsx`, `BuscarJugadorModal.jsx`, `TorneosPage.jsx` (`BASES_CATEGORIAS` derivado de la constante; las variantes `"4ta Categoría B"`/`"+35"` siguen via `startsWith(label+' ')`). Borrado el array muerto de `torneosMockData.js`.
- **Backend — red defensiva `lib/categorias.js` `normalizarCategoria()`:** lleva cualquier formato viejo (`"4ta"`, `"4ª"`, `"4°"`, `"4° Categoría +35"`) al canónico; idempotente; lo que no entiende lo deja igual (no rompe). Aplicada en los 2 puntos de match (`solicitudes.js`, `convocatorias.js` + `lib/convocatorias.js` como punto central que cubre REST + WIarky + Fase B) y en toda escritura de `Jugador.categoria` (`auth.js` registro + `jugadores.js` PATCH /me y PATCH /:id admin). Tests: `lib/categorias.test.js` (8 casos).
- **Prueba e2e contra DB real:** los 3 jugadores 4ta (Julian, Luca, Kevin). Chip `"4ta"` → notificados: **ANTES 0 (🔴 bug), DESPUÉS 3 (✅)**. La DB ya estaba canónica → sin migración.

---

## Red de seguridad: CI + monitoreo pre-deploy (2026-06-25)

Idea de Luca de cara a la entrega: "agentes que revisen en tiempo real y corrijan errores". Veredicto asesor: la auto-corrección autónoma en prod es peligrosa para un sistema con plata; lo sano es **detección en tiempo real + propuesta de fix con humano en el loop**. Se dejó armada la red sin tocar la lógica de la app. Ver `flujo_desarrollo.md` §"Red de seguridad".

- **CI (`.github/workflows/ci.yml`, NUEVO):** corre `npm test` del backend en cada push/PR a `main` (Node 22, `npm ci`). Bloquea regresiones en la lógica de tiempo/conflictos antes de mergear. La suite de concurrencia NO va en CI (necesita Postgres sembrado) → se corre a mano antes de cada release.
- **Sentry DORMIDO (`src/app.js` + dep `@sentry/node`):** init condicionado a `SENTRY_DSN` con **dynamic import** → si no hay DSN, ni se importa el paquete (local = cero impacto, probado: arranca igual con y sin DSN). `setupExpressErrorHandler` al final de las rutas. Para activar en deploy: setear `SENTRY_DSN` en Railway, nada más. Captura crashes de proceso (auto) + errores que burbujean de Express.
- **Limitación conocida (post-entrega):** los `try/catch` que responden 500 no se reportan a Sentry todavía (quedan en logs de Railway). Refinamiento: `Sentry.captureException` en los catches o arranque con `--import instrument.mjs`.
- **`qa-flujos` pre-release** quedó escrito como paso obligatorio antes de demo/entrega.

---

## Reservas — cierre del bloque: caminos de plata blindados (2026-06-25)

Última pasada antes de la entrega al primer cliente. El agente `qa-flujos` enumeró la matriz completa de concurrencia de TODOS los flujos que tocan plata; quedaban 2 caminos 🟠 que leían su guard fuera de la transacción.

- **`POST /reservas/:id/cuenta` (cobro con split) — sobrecobro eliminado:** el guard "lo ya cobrado + lo nuevo no supera el precio del turno" se leía con `prisma` ANTES del `$transaction`. Dos `/cuenta` concurrentes leían ambos `yaCubierto=0`, pasaban el guard y creaban cargos → el turno se cobraba de más. Fix: el guard (re-lectura de `reserva.pagado` + `cargos tipo:'reserva'`) ahora corre **DENTRO de `runSerializable`**; el segundo cobro re-lee los cargos ya commiteados y rebota con 400. El `catch` honra `err.status===400`.
- **`POST /reservas/:id/cobrar` (cobro del ticket completo) — atómico + idempotente:** las escrituras (turno + consumos) eran `prisma.*` sueltas. Ahora envueltas en `runSerializable` (todo-o-nada: nunca queda turno pagado con consumos a medias). El turno **re-lee el cargo pendiente dentro de la TX** → un doble-submit no marca `pagado` dos veces ni duplica la deuda del turno.
- **Suite `npm run test:concurrencia` → 18 escenarios (antes 16):**
  - **17.** 6 `/cuenta` concurrentes cobrando el turno COMPLETO → **solo 1 cobra**, la suma nunca supera el precio.
  - **18.** dos `/cuenta` de mitad cada uno → **ambos entran, total = precio exacto** (prueba que el guard no quedó sobre-restrictivo).
  - **18/18 verde x3 determinístico.** Unit: **11/11** verde.
- **Residuo conocido (post-entrega, NO bloqueante):** `/cobrar` disparado por **dos requests HTTP separados** (no doble-click) puede insertar los consumos dos veces — Serializable da atomicidad pero no deduplica inserts nuevos. Hoy lo frena el botón con `disabled={submitting}` del front. Blindaje 100% server-side = **token de idempotencia por ticket** (cambio mayor; se difiere para no arriesgar a días de la entrega). Es admin, un solo operador, con guard de front.
- **Veredicto:** doble-booking (reservas/clases/TF/convocatorias, incl. cruce de medianoche), cancelación con cargo, y sobrecobro de cobros → **blindados y probados bajo concurrencia**. El bloque Reservas queda apto para la entrega.

---

## Convocatorias — cierre: visibilidad pública/privada + sección jugador + auto-anotado (2026-06-23)

Se cerró el bloque con tres piezas que completan el flujo y lo hacen un **motor de captación de socios**. Ver [[proyecto_convocatorias_plan]].

- **Visibilidad pública/privada (`Convocatoria.visibilidad`, additivo, migrado):** idea de Luca. **Pública** = se lista en el hub del club + notifica a la categoría (el dueño llena la cancha con cualquiera). **Privada** = NO se lista ni notifica; solo se llega por el link, que el organizador comparte con su grupo (sin que se anote un random). El hub (`/club/:slug`) filtra `visibilidad:'publica'`; la notif a la categoría solo en públicas. WIarky `crear_convocatoria` gana el param `visibilidad` (default pública; "privado" → privada); chip 🔒 Privada en la UI admin. Probado: pública aparece en hub, privada no (pero sí por id/link).
- **REGLA estratégica (Luca): anotarse REQUIERE login** = cada evento (incluso privado) **convierte jugadores en socios registrados** → la red del club crece sola con cada partido (embudo tipo Playtomic). El admin puede agregar invitados a mano como escape hatch.
- **Sección "Americano y Super 8" en el dash jugador (`PlayerEventosPage.jsx`, `/dashboardJugadores/eventos`, ítem 📣 en el sidebar):** "Mis eventos" (anotado/espera + bajarme) + "Eventos abiertos del club" (públicos → botón "¡Voy!"). Reusa `/convocatorias/mias` + `/convocatorias/publica/club/:slug`.
- **Login con retorno + auto-anotado:** en la página del evento, "Voy" sin login guarda el id en `localStorage.pending_convocatoria` y manda a loguearse/registrarse. `PlayerLayout` detecta el pendiente al haber token → `POST /voy` automático → avisa "¡Quedaste anotado!" → lleva a la sección de eventos. Cierra el embudo sin dejar al jugador colgado.
- **El bloque quedó operable end-to-end:** WIarky convoca (pública/privada) → reserva canchas a nombre del organizador → mensaje + link → jugador entra → "Voy" → se registra → vuelve anotado solo → lo ve en su sección → al llenarse, fixture balanceado.
- **PENDIENTE (corregir sobre la versión completa):** Fase B (botón "Organizar" en la sección del jugador, reusa `organizarConvocatoria`); cargar resultados del fixture + ranking; render lindo de la notif `convocatoria_abierta`; flujo de registro-con-retorno más pulido (hoy usa alert); fixture en la página pública. Pendiente de PRUEBA e2e en el navegador (Luca).

---

## Convocatorias — Bloque 3b: el fixture (cierre del loop) (2026-06-22)

Se cerró el loop: cuando una convocatoria se llena, se **arma el fixture** automáticamente (parejas/partidos), con **emparejado balanceado por posición** (un Drive + un Revés por pareja; los "Ambas" como comodín — usa `Jugador.posicion`, la idea de Luca). Ver [[proyecto_convocatorias_plan]].

- **Motor backend (`lib/fixtureConvocatoria.js`, nuevo):** porteo de los generadores del motor público (`generarFixtureAmericano` rotativo / `generarFixtureSuper8` round-robin de 1 set) + **`armarParejasBalanceadas(jugadores)`** (separa Drive/Revés/Ambas y arma parejas Drive+Revés; sobrantes con comodín). `generarFixtureConvocatoria(modalidad, jugadores, canchas)` orquesta. Es un PORT del frontend `src/lib/eventos.js` (el motor público sigue client-side; éste corre en backend para auto-generar). Probado: 8 jugadores → 4 parejas balanceadas (4/4) + round-robin de 6 partidos; Americano 8 → 7 rondas.
- **Auto-generación al llenarse (`routes/convocatorias.js` `/voy`):** cuando el último anotado completa el cupo, se llama a `armarFixtureConvocatoria` → guarda el fixture en `Convocatoria.fixture` y pasa estado a `confirmada`. No bloquea el voy si falla.
- **Manual (`POST /:id/armar-fixture`, admin):** cierra la convocatoria y arma el fixture con los anotados (≥4) aunque no esté llena — para la política "se juega con los que hay".
- **UI admin (`ConvocatoriasAdminPage.jsx`):** componente `FixtureView` muestra las rondas con los partidos (cancha + parejas/equipos por nombre) cuando hay fixture. Botón "Armar fixture ahora" en convocatorias abiertas.
- **El loop quedó COMPLETO:** WIarky convoca → reserva canchas (a nombre del organizador) → mensaje + link → jugadores se anotan → al llenarse arma el fixture balanceado → el admin lo ve en Reservas → Americano y Super 8.
- **PENDIENTE:** Fase B (botón "Hacer Super 8" en dash jugador, reusa `organizarConvocatoria`); cargar resultados del fixture + ranking; render lindo de la notif `convocatoria_abierta`; mostrar el fixture en la página pública.

---

## Convocatorias — Bloque 4: UI admin de gestión (2026-06-22)

Pantalla para que el admin **vea y gestione** las convocatorias (hasta ahora se creaban por WIarky pero no se veían en ningún lado). Reusa los endpoints del Bloque 1 (listar, detalle, cancelar) — fue casi todo frontend. Decisión de IA (con Luca): **NO es un menú aparte** — los eventos son reservas de canchas, así que va como **pestaña dentro de Reservas**; y se **renombró** de "Convocatorias" (jerga interna) a **"Americano y Super 8"** (coherente con el navbar público). Ver [[proyecto_convocatorias_plan]].

- **`pages/ConvocatoriasAdminPage.jsx`:** lista de convocatorias (modalidad, categoría, fecha/hora, cupos voy/cupoMax + espera, estado). Expandible → anotados (nombre + posición Drive/Revés + chip Anotado/Espera). Botón **Cancelar** (abierta) → libera las canchas (con confirmación). Cartelito que recuerda crearlas con WIarky.
- **Ubicación:** pestaña `americano-super8` en `AdminReservasLayout` (Grilla · Estadísticas · **Americano y Super 8**), ruta `/dashboardAdmin/reservas/americano-super8`. Se quitó el ítem top-level del sidebar.
- **PENDIENTE:** Bloque 3b (fixture al llenarse) + Fase B (botón "Hacer Super 8" en dash jugador) + render de la notif `convocatoria_abierta`.

---

## Convocatorias — Bloque 2 (C+D) + Bloque 3a: la convocatoria reserva las canchas (2026-06-22)

Se cerró el canal (mensaje + notif) y se enganchó el cierre del loop con las canchas. **Decisión de arquitectura clave (Luca):** una convocatoria NO es un "bloqueo" raro fuera del sistema — son **reservas normales a nombre de un jugador registrado**, con TODAS las reglas existentes (anti-doble-booking, dueño = jugador, slot 1.5h). Si se hiciera "libre/anónimo" se romperían las reglas ya construidas. Un Super 8 = el organizador reserva **2 canchas** al mismo horario. Ver [[proyecto_convocatorias_plan]].

- **(C+D) WIarky `crear_convocatoria` (write con confirmación):** reemplazó al viejo `armar_convocatoria` (que solo generaba texto). Pide modalidad + **organizador** (jugador registrado) + fecha + horario + cupos + canchas (+ categorías). Resuelve el organizador por nombre; si no está registrado, avisa que primero hay que registrarlo (crear_jugador). Al confirmar (`POST /me/insight/accion`, acción `crear_convocatoria`): **(3a)** reserva las canchas + crea la convocatoria, **(C)** arma el mensaje de WhatsApp con el **link público** (`APP_PUBLIC_URL` env, default localhost:5173), **(D)** notifica in-app a los jugadores de la categoría (`convocatoria_abierta`). El front (`ConfirmAccion`) muestra el mensaje con botón Copiar.
- **(3a) Motor `lib/convocatorias.js`:** `organizarConvocatoria()` — bajo `runSerializable`, busca N canchas libres a esa fecha+hora (overlap cross-midnight aware, contra reservas + TF activos), y crea atómicamente la Convocatoria + N Reservas (tipo `eventual`, dueño = organizador, `convocatoriaId` linkeado). Si no hay N libres → 409 "no hay N canchas libres". `cancelarConvocatoria()` — cancela la convocatoria y libera (cancela) sus reservas linkeadas. El PATCH `/:id/estado` a `cancelada` lo usa.
- **Schema:** `Reserva.convocatoriaId String?` (additivo, migrado) + relación inversa `Convocatoria.reservas`. Es el hilo evento↔canchas (para cancelar/liberar y no perder el rastro). Sin tipo nuevo en la grilla (decisión de Luca: era "al vicio"; las canchas del evento se ven como reservas normales del organizador).
- **Probado e2e:** WIarky resuelve organizador → reserva 2 canchas (1.5h, dueño organizador, linkeadas) → cancelar libera las 2. Limpieza por id.
- **PENDIENTE Bloque 3b:** generar el **fixture** (`lib/eventos.js`, con balanceo drive/revés = `Jugador.posicion`) cuando se llena. Bloque 4: UI admin (ver/cancelar convocatorias) + botón "Hacer Super 8" en el dash jugador (Fase B, reusa `organizarConvocatoria` con el jugador como organizador). Render lindo de la notif `convocatoria_abierta` en el panel del jugador.

---

## Módulo Convocatorias — Bloque 2: canal + descubrimiento (en curso) (2026-06-22)

Se construyó la cara pública del módulo: el **link que circula por WhatsApp** y el **descubrimiento**. Decisión de producto clave (con Luca): **anotarse REQUIERE login** de jugador registrado — el "Voy" anónimo por nombre libre genera quilombo (sin accountability → no-shows, truchos, jugadores de más en la cancha); con login hay identidad real, se puede trackear no-shows, y **cada convocatoria crece la base de jugadores** (el objetivo del módulo). El link público es solo para **ver/descubrir**. Ver [[proyecto_convocatorias_plan]].

- **Página pública (`pages/ConvocatoriaPublicaPage.jsx`, ruta `/convocatoria/:id`, standalone Court Noir):** ver la convocatoria sin login (modalidad, categoría, fecha, hora, barra de cupos). Logueado como jugador → botón **"¡Voy!"** (cupo o lista de espera) y, si ya está anotado, muestra el estado al entrar + botón **"Ya no voy"** (baja → promueve al primero en espera). Sin login → CTA "Iniciá sesión para anotarte".
- **`/eventos` ahora es un HUB "Americano y Super 8"** (`EventosPage.jsx`) con dos caminos: **"Jugá ahora"** (la herramienta instantánea de fixture/ranking de siempre) y **"Sumate a un evento del club"** (lista de convocatorias abiertas). Unifica organizar ↔ jugar bajo un mismo techo (idea de Luca). El navbar del club ("Americano y Super 8") cae acá.
- **Endpoints públicos (`routes/convocatorias-publicas.js`, montado en `/api/convocatorias/publica` ANTES del router autenticado):** `GET /:id` (detalle público, agregados sin PII) + `GET /club/:slug` (lista de abiertas del club, de hoy en adelante).
- **Endpoints jugador (en `routes/convocatorias.js`):** `GET /:id/mi-estado` (¿estoy anotado?) + `GET /mias` (mis convocatorias voy/espera) — `/mias` definido ANTES de `/:id` para no quedar sombreado.
- **"Mis eventos" en el dash jugador (`PlayerDashboardPage.jsx`):** tarjeta con las convocatorias donde el jugador está anotado (chip Anotado/En espera), link a la página. Solo aparece si tiene al menos uno.
- **DECISIÓN futura anotada (Luca): Fase B = el JUGADOR organiza** su propio Americano/Super 8 sin depender del admin, **con guardrail de disponibilidad real** (ej. 2 canchas a la misma hora, validado con `gatherDisponibilidad`). Sección "Eventos" en el sidebar jugador. Se construye DESPUÉS del Bloque 3 (reusa la reserva-de-canchas-al-confirmar). Detalle en [[proyecto_convocatorias_plan]].
- **PENDIENTE Bloque 2:** (C) mensaje de WhatsApp con el link (motor IA) + (D) notif in-app a jugadores de la categoría. Luego Bloque 3 (cierre del loop: fixture + reserva canchas).

---

## Módulo Convocatorias — Bloque 1: fundación (modelos + endpoints) (2026-06-22)

Arrancó el módulo **Convocatorias** — la capa que convierte a PadelwIArk en la **red de jugadores del club** (el admin convoca un Americano/Super 8, los jugadores se suman con "Voy", y al llenarse se genera el fixture + reserva canchas). Plan por bloques en [[proyecto_convocatorias_plan]]. Este bloque es la **fundación** (data + endpoints core); el canal (WhatsApp/link público) y el cierre del loop vienen después. Ver [[project_convocatorias_matching]] y [[project_super8_americano]].

- **Modelos nuevos (Prisma, additivo, `db push`):** `Convocatoria` (modalidad, categorias[], fecha, horaInicio, canchas, cupoMax, deadline, politicaNoLlena, estado abierta|confirmada|cancelada|jugada, fixture Json) + `ConvocatoriaCupo` (jugadorId? o nombre libre, **posicion?**, estado voy|espera|baja). Relaciones inversas en `Club` y `Jugador`.
- **Lado de juego = `Jugador.posicion`:** se descubrió que el jugador YA tiene `posicion` (Drive/Revés/Ambas) y `mano` (Diestro/Zurdo) desde el registro (Step2Perfil) → **NO se duplicó**. El cupo guarda `posicion` opcional para capturarlo en el evento. El balanceo de parejas por lado va en el Bloque 3 (motor fixture). Regla de Luca: zurdo siempre drive (guía de UI).
- **Endpoints (`routes/convocatorias.js`, `/api/convocatorias`):** `POST /` crear (admin), `GET /` listar con conteo voy/espera (admin), `GET /:id` detalle con anotados, `POST /:id/voy` sumarse (cupo o lista de espera, bajo `runSerializable` anti-race), `POST /:id/baja` bajarse (promueve al primero en espera), `PATCH /:id/estado` (admin cancela/cambia). Probado e2e: cupoMax 2 + 3 anotados → 2 voy + 1 espera; baja de un voy promueve la espera.
- **Limpieza de DB:** de paso se dropeó una columna muerta (`jugadores.requiereAprobManual`, de la feature de auto-aprobación retirada, sin uso en código) — con OK explícito de Luca, vía `db push --accept-data-loss`.
- **PRÓXIMO (Bloque 2):** mensaje de WhatsApp + **link público "Voy"** + notif in-app a jugadores de la categoría + botón "Convocar" desde WIarky.

---

## WIarky — más skills: deudores, ingresos, crear reserva, registrar jugador + fixes (2026-06-22)

WIarky escaló de 6 a 8 skills y se afinó el flujo de creación de reservas. Las acciones de escritura siguen la regla de oro: **el chat nunca escribe; toda mutación pasa por una card de confirmación** y reusa los endpoints ya blindados del sistema (no se reimplementa lógica sensible). Ver [[project_wiarky_mascota]] y [[proyecto_asistente_ia_plan]].

- **`consultar_deudores` (lectura, PII-safe):** lista quién debe (turnos impagos + cargos pendientes) agrupado por jugador. **Privacidad:** la IA solo recibe el agregado ("3 deudores, $X"); los **nombres NO pasan por la IA** — se mandan del backend al front como **artefacto tipo `lista`** y se renderizan ahí (`ListaArtefacto`). Mantiene la regla "sin PII a la IA".
- **`consultar_ingresos` (lectura):** facturado (reservas pagadas + cargos pagados) hoy / 7 días / mes. Agregado, sin PII.
- **`crear_reserva` (escritura + confirmación):** arma la reserva (resuelve cancha por nombre, calcula horaFin a 1.5h, **pre-chequea disponibilidad real**). Al confirmar, el front llama al endpoint EXISTENTE `POST /reservas/admin` (con su `runSerializable` anti-doble-booking) — no se reimplementa la creación. **Mejora 1:** si el nombre coincide con UN jugador registrado, vincula su `jugadorId`; si no, queda nombre suelto y WIarky avisa.
- **`crear_jugador` (escritura + confirmación):** registra un jugador (nombre + apellido + **DNI obligatorio**). Al confirmar, el front llama a `POST /jugadores` (reusa la validación de DNI único). Si el DNI ya existe, error claro.
- **3 fixes del flujo de reserva (descubiertos probando con Luca):**
  1. **Fecha inventada:** el contexto del chat no incluía la fecha real (solo el día de semana) → WIarky alucinaba fechas (creó una reserva en 2024-01-08). Fix: se inyecta `hoy` y `mañana` reales en el contexto + guard anti-fecha-pasada en `crear_reserva`.
  2. **Grilla crasheaba (`Cannot read .dot`):** WIarky mandaba `tipo:'manual'`, que `TIPO_CONFIG` de la grilla no conoce. Fix: usa `tipo:'eventual'` (como el modal admin). (Deuda latente anotada: la grilla no tiene fallback para tipos desconocidos.)
  3. **Nombre libre no se mostraba:** la grilla solo mostraba el nombre del jugador VINCULADO (`jugadorId`), ignorando el array `jugadores` de texto libre. Fix de 1 línea en `ReservasPage.jsx` (mapeo `reservasBackendDia`): fallback a `r.jugadores` cuando no hay jugador vinculado (aditivo, no cambia nada para reservas con jugador).
- **Frontend (`AsistenteWiark.jsx`):** nuevo artefacto `lista` (`ListaArtefacto`) + `ConfirmAccion` enruta por acción: `crear_reserva`→`/reservas/admin`, `crear_jugador`→`/jugadores`, resto→`/me/insight/accion`.
- **PRÓXIMO:** más writes (cobrar deuda, bloquear turno), y la **voz**. WIarky hoy tiene lectura + generación + escritura confirmada sobre 8 skills.

---

## WIarky — tool use: genera posteos/convocatorias + carga gastos con confirmación (2026-06-22)

WIarky dio el salto de **"sabe" a "ejecuta"**: se implementó el **loop de tool use (function calling)** de Claude. Desde el mismo chat, WIarky entiende el pedido en lenguaje natural, **elige la herramienta y extrae los parámetros**, el backend la ejecuta (reusando los generadores ya hechos) y devuelve el resultado. Es la arquitectura extensible del asistente: cada cosa nueva que WIarky haga = una herramienta más. Ver [[project_wiarky_mascota]] y [[proyecto_asistente_ia_plan]].

- **Loop de tool use (`lib/insight.js`, `responderChatAgente`):** arma el contexto real del club (helper `armarContextoClub`) + define `WIARK_TOOLS` + corre el ciclo `messages.create` → si `stop_reason==='tool_use'`, ejecuta cada `tool_use`, devuelve `tool_result` y vuelve a llamar (guard de 4 iteraciones). Modelo Haiku 4.5.
- **Herramientas (4):** `consultar_disponibilidad(fecha)` (lectura de cualquier fecha), `armar_posteo_disponibilidad(fecha)` (genera el posteo de turnos libres), `armar_convocatoria(modalidad, dia, horario, categoria, cupos)` (genera el mensaje de convocatoria), y `cargar_gasto(monto, concepto, categoria)` (**escritura, con confirmación**).
- **Artefactos (clave de UX):** el resultado de una herramienta lo ve la IA, NO el usuario. Por eso los textos generados (posteo/convocatoria) vuelven como **`artefacto`** aparte y el front los muestra en un bloque con botón **Copiar** (`CopyArtefacto`) — no se depende de que la IA los repita. `responderChatAgente` devuelve `{ texto, artefactos }`.
- **Escritura con confirmación (regla de oro):** `cargar_gasto` **NO escribe**: devuelve un artefacto `{ tipo:'confirmacion', accion:'cargar_gasto', datos, resumen }`. El front lo muestra como card con **[Sí, cargar] [Cancelar]** (`ConfirmAccion`). Recién al confirmar, el front llama a `POST /me/insight/accion` (endpoint SEPARADO del chat) que crea el `Gasto` real. Verificado e2e: pedir cargar un gasto por chat NO toca la base (gastos 2→2); el gasto se crea solo al confirmar. Probado creando + borrando por id (sin dejar basura).
- **Endpoints nuevos (`routes/clubs.js`):** `POST /me/insight/chat` ahora usa `responderChatAgente` (devuelve artefactos) + `POST /me/insight/accion` (ejecuta acciones confirmadas, solo dueño).
- **Frontend (`AsistenteWiark.jsx`):** los mensajes de WIarky pueden traer artefactos; se discrimina `artefacto.accion ? ConfirmAccion : CopyArtefacto`. WIarky ahora tiene **lectura + generación + escritura confirmada**.
- **PRÓXIMO:** más acciones de escritura (crear reserva, cobrar) — todas detrás de confirmación; y la **voz** (STT/TTS) como capa encima del cerebro. Detalle en [[proyecto_asistente_ia_plan]].

---

## WIarky — mascota + chat IA del asistente (2026-06-22)

El asistente IA tomó **cara y voz propia**: **WIarky**, una pelotita de pádel con ojitos y boca (idea de Luca, espíritu Clippy de Office pero **nunca invasivo** — flotante, dismissible, el globito se va solo). Pasó de "tarjeta con botones" a un **chat real** donde el dueño pregunta en lenguaje natural y WIarky responde con los **datos reales del club** (grounded, sin PII, sin alucinar). Es el primer pedazo del "cerebro" del asistente (paso "chat" del roadmap). Ver [[project_wiarky_mascota]] y [[proyecto_asistente_ia_plan]].

- **Personaje (`components/asistente/AsistentePelota.jsx`, nuevo):** SVG de la pelotita (verde lima de marca, costuras, cejas, ojos con brillo, cachetes, boca). **Con vida**: parpadea + flota. Reutilizable (`size` + `expresion` idle/feliz/hablando + `flotar`).
- **Launcher + chat (`components/asistente/AsistenteWiark.jsx`, nuevo):** FAB flotante abajo-derecha con la pelotita + glow lima + globito de saludo que se va solo. Al abrir: saluda + dice el **insight del día** + chips de sugerencias. Chat multi-turno con burbujas, avatar mini de WIarky, indicador "pensando" (puntitos), auto-scroll. Montado en `layouts/AdminDashboardLayout.jsx` → presente en todo el panel admin (en mobile se levanta para no chocar con la bottom-nav).
- **Backend del chat (`lib/insight.js` + `routes/clubs.js`):** `responderChat(clubId, mensajes)` junta un **snapshot real del club** (ocupación hoy, turnos libres hoy y mañana, tendencia 7d, horas muertas, deuda, jugadores registrados, torneos activos — agregados, sin PII) y lo pasa a Haiku como `system` con instrucción de **NO inventar** (si falta el dato, lo dice) y texto plano sin markdown. `POST /me/insight/chat` (solo dueño); el backend sanea el historial (arranca en `user`, capa de seguridad). Probado e2e: responde turnos libres, tendencia, jugadores, torneos, y rechaza datos que no tiene (ej. precio de una paleta).
- **No invasivo (regla de Luca):** WIarky nunca interrumpe ni tapa el laburo. Aplicar siempre.
- **Próximo gran paso:** **tool use** — que WIarky no solo responda sino que *haga* (armá el posteo, cargá un gasto) con confirmación, y encima la **voz** (STT/TTS). Detalle en [[proyecto_asistente_ia_plan]].

---

## Asistente IA — 3 acciones de difusión (convocatoria + disponibilidad + liberados) (2026-06-22)

El asistente IA (tarjeta "Insight del día" del dashboard admin) dejó de ser solo una recomendación diaria y pasó a tener **acciones que generan textos listos para difundir**, todas sobre el mismo motor Haiku 4.5 y solo para el dueño (`requireOwner`). Resuelven tareas tediosas reales del dueño: pasar los turnos libres a WhatsApp/redes, convocar partidos sociales y re-publicar lo que se libera. Cada acción muestra el texto **editable** (la IA da el borrador, el admin es el editor final) + **Copiar** — nunca publica nada automático. Probadas e2e con datos reales + IA. Ver [[proyecto_asistente_ia_plan]], [[project_insight_dia_ia]] y [[project_convocatorias_matching]].

- **Backend (`lib/insight.js` + `routes/clubs.js`, additivo):** tres funciones nuevas + endpoints solo-dueño:
  - `generarConvocatoriaWhatsapp()` → `POST /me/insight/convocatoria-mensaje`. Redacta un mensaje para convocar un Americano/Super 8 (modalidad + día + horario + categoría + cupos). Semilla del módulo Convocatorias.
  - `gatherDisponibilidad(clubId, fecha)` + `generarPostDisponibilidad()` → `POST /me/insight/post-disponibilidad`. Junta los turnos LIBRES reales de una fecha (franjas del club por cancha menos reservas + TF confirmados, descontando ausencias) y la IA arma el posteo (WhatsApp/IG/FB). Selector hoy/mañana. **No inventa turnos**, solo redacta lo calculado.
  - `generarPostLiberado()` → `GET /me/insight/liberados` + `POST /me/insight/post-liberado`. El GET lista los turnos liberados (notifs `turno_liberado_auto` / `cancelacion_reserva`) de hoy en adelante y **cruza contra `gatherDisponibilidad` para descartar los que ya se re-tomaron**; el POST arma el aviso de re-publicación.
- **Frontend (`AdminDashboardPage.jsx`):** la tarjeta del insight suma **3 acciones colapsables** (Court Noir): "Armar convocatoria para WhatsApp", "Publicar turnos disponibles" (hoy/mañana) y "Avisar turno liberado" (lista los liberados reales, click → genera el aviso). Cada una: panel con form/lista → genera → **textarea editable** + Copiar + Regenerar. Mensaje del insight también pasó a ser editable.
- **Decisión de canal (verdad de producto):** el cuello no es escribir sino PUBLICAR. WhatsApp se resuelve copiar-y-pegar; auto-postear a IG/FB es Meta API (pesado, futuro). El MVP correcto es "la IA redacta, el dueño pega".
- **Roadmap de proactividad (documentado, NO construido):** pasar de pull (abrir y clickear) a push (motor de **nudges**: la campana/insight avisa "12 libres hoy, ¿publico?" / "se liberó un turno, ¿lo publicamos?"). Disparador mañana = cron Railway; disparador cancelación = evento (ya existe la notif, se le agrega la acción). Canal externo (push/WhatsApp al dueño) = inversión grande posterior. Detalle completo en [[proyecto_asistente_ia_plan]].
- **PENDIENTE:** gating premium de las acciones; nudges in-app (Paso 1); WhatsApp al dueño; auto-post a redes con imagen (Satori).

---

## Rediseño del navbar público del club + separación de capas de acceso (2026-06-21)

Se reordenó el `PublicNavbar.jsx` (landing del club) porque se veía "amontonado": el contenido estaba capado en `max-w-7xl` y centrado, dejando los costados vacíos y apretando todo en el medio. Se pasó a **3 zonas reales en CSS grid `[auto · 1fr · auto]`** (izquierda = identidad, centro = navegar, derecha = acceder), se **amplió el ancho** a 1600px con más padding/gaps, y se tomó una **decisión de arquitectura**: el login de admin ("Área Privada") **NO va en la landing pública del club** (que es marketing para clientes) sino en la **landing de ventas de PadelwIArk** (`/padelwiark`), que ya lo enlaza vía `PwNav`/`PwCTA` ("Entrar" → `/login` → `/dashboardAdmin`). Ver [[project_landing_saas_empresa]].

- **3 zonas (grid):** izquierda logo+nombre (logo a `object-contain`, ya no se recorta); centro los links de navegar (Quiénes Somos · Reservas · Torneos · Contacto · **Americano y Super 8**, este último **destacado** como pill con el `colorPrimario` del club + icono ⚡ para que no se pierda); derecha **Jugadores** (👤) y **Profesores** (🎓), ambos con icono = "portales" de cliente.
- **Se quitó "Área Privada"** del navbar del club (desktop + mobile). El dueño/admin entra por `padelwiark.com` → "Entrar". Beneficio: navbar más limpio, landing 100% enfocada en el cliente, y no se le anuncia a cada visitante que hay un panel de admin.
- **Respeta los temas del club** (claro/oscuro/color-sólido); en color-sólido el destacado usa contraste oscuro para no fundirse.

---

## Herramienta pública "Americano y Super 8" — self-service sin login (2026-06-21)

Se construyó una **herramienta gratuita y pública** (`/eventos`, sin login, client-side) para que los **visitantes del club** armen su propio Americano o Super 8 desde el celular: cargan jugadores/parejas, se genera el fixture y se lleva el **ranking en vivo** mientras cargan resultados. Es un **wedge de marketing** de PadelwIArk (cara pública de la marca, "gratis") que no le roba tiempo al dueño/admin. Decisión de arranque: versión **simple en el celu** (estado en `localStorage`, dato social transitorio — NO data de negocio, excepción consciente a la regla anti-localStorage); el "link compartido multi-dispositivo" queda para el futuro (requiere backend). El diseño lo elevó un agente de diseño frontend senior al sistema **Court Noir** (oscuro premium + neón lima, Space Grotesk, JetBrains Mono en los números). Ver [[project_americano_super8]].

- **Motor (`lib/eventos.js`, nuevo):** `generarFixtureAmericano(jugadores, canchas, puntosLimite=21)` — rotación greedy (cada uno juega con/contra la mayor variedad). `generarFixtureSuper8(parejas, canchas)` — round-robin circle-method (todos contra todos). `rankingAmericano` (suma de puntos individuales) y `rankingSuper8` (PG → dif. de games). **Validadores con reglas reales:** `validarPartidoAmericano(a,b,limite)` — se juega a N puntos y se gana por **diferencia de 2** (llega al límite con dif≥2, o se extiende exacto a +2 si se empata cerca); `validarSetPadel(a,b)` — **un set** de pádel (6-0…6-4, 7-5, 7-6; rechaza 6-5, 8-6). Los rankings **ignoran resultados inválidos** hasta que se corrigen. Probado con suite de casos (regla de 2, sets, ranking salteando inválidos) → todo verde.
- **Modalidades (definición de Luca, no la del bibliotecario):** **Americano** = inscripción individual, parejas rotan, **por puntos** (límite configurable: 16/21/24/32 o el que ponga), ranking individual. **Super 8** = pareja fija, todos contra todos, **un solo set** validado, ranking por pareja. Se usan los **nombres reales** (AMERICANO / SUPER 8) a pedido de Luca para que el jugador lo entienda al toque.
- **Página (`pages/EventosPage.jsx`, nueva):** mobile-first, Court Noir. **Setup** (cards de modalidad, carga dinámica de jugadores/parejas, stepper de canchas, campo "Puntos por partido" solo-Americano con presets) + acordeón **"¿Cómo funciona?"** explicando reglas por modalidad. **Jugar**: ranking en vivo (el #1 premiado con corona + glow), rondas con inputs de marcador tipo scoreboard (JetBrains Mono, 48×48px), hint por partido (`a 21 · gana x2` / `1 set`), **ganador resaltado en lima con corona**, e inválido en **rojo con motivo** (no suma al ranking).
- **Ruta (`router/index.jsx`):** `/eventos` como ruta pública **standalone** (fuera de `PublicLayout` → sin navbar del club, pantalla completa enfocada). Decisión consensuada con Luca.
- **Descubrimiento desde el club:** ítem **"Americano y Super 8"** en el navbar público (`PublicNavbar.jsx`, desktop + mobile) + **banner promocional** en la landing. Banner = componente reutilizable **`AmericanoSuper8Section`** (`features/landing/LandingSections.jsx`) insertado en los **5 templates** después de Reservas; respeta `colorPrimario` + `dark` (claro/oscuro) del club, con CTA "Armá tu evento" → `/eventos`.
- **PENDIENTE (no bloqueante):** link compartido multi-dispositivo con ranking en vivo (requiere backend); Americano con jugadores no-múltiplos de 4 (bye + promedio de puntos). Ambos diferidos por Luca.

---

## "Insight del día con IA" — primer ladrillo de IA de PadelwIArk (2026-06-21)

Se construyó y dejó andando e2e en `main` el **primer feature de IA** del SaaS: una tarjeta "Insight del día" en el dashboard admin que muestra **una recomendación de negocio accionable** en rioplatense, generada por **Claude Haiku 4.5** a partir de agregados reales del club (ocupación de hoy, tendencia de reservas 7d vs semana previa, deuda por cobrar). Es el wedge de IA elegido a propósito: **grounded en data real** (poca alucinación), barato (~$0.0003 por insight) y demostrable. Se montó la infraestructura de IA del backend de cero (cuenta Anthropic, SDK, API key fuera del repo) y se respetó privacidad como argumento de venta: **se mandan solo agregados, nunca PII** (sin nombres de jugadores). Cierra el PENDIENTE que el bloque del dashboard había dejado abierto. Ver [[project_insight_dia_ia]], [[project_dashboard_resumen_admin]] y [[project_padelwiark_marca]].

- **Infraestructura de IA (montada hoy):** cuenta en console.anthropic.com (Individual, $5 de crédito, **auto-recarga OFF** → no puede sobregastar). `ANTHROPIC_API_KEY` en `project/apps/backend/.env` (**NO en el repo**; en prod va a env vars de Railway). SDK oficial `@anthropic-ai/sdk` v0.105 instalado en el backend. Modelo **Claude Haiku 4.5** (`claude-haiku-4-5`, $1/$5 por millón). Nota técnica: para Haiku se usa `messages.create` **plano** — `effort`/`thinking` tiran error en ese modelo.
- **Backend (`lib/insight.js`, nuevo):** `gatherInsightData(clubId)` junta agregados del club (ocupación de hoy, tendencia de reservas 7d vs semana previa, deuda por cobrar) — **solo agregados, sin PII**. `generarInsightIA(data)` arma un prompt de "asesor de negocios de pádel" y llama a Haiku pidiendo **UNA** recomendación accionable en rioplatense (máx 35 palabras).
- **Endpoint (`routes/clubs.js`):** `GET /me/insight`, **solo dueño** (`requireOwner`). **Cachea el insight 24h** en `club.config.insightDelDia` (`{fecha, texto}`) → **1 llamada a la IA por club por día**, no por carga: si ya existe el de hoy, lo devuelve sin pegarle a la IA.
- **Frontend (`AdminDashboardPage.jsx`):** tarjeta "Insight del día" arriba del dashboard, estética **Court Noir** (oscuro + neón lima, marca PadelwIArk, icono `Sparkles` + chip "IA · PadelwIArk"). Carga **async** (no bloquea el dashboard), con shimmer mientras genera. Si el backend devuelve **403** (empleado no dueño) o error, la tarjeta **no se muestra**.
- **PENDIENTE (no bloqueante):** gating como **feature premium** (hoy es solo-dueño, sin gating de plan); **capa de abstracción** (Vercel AI SDK / OpenRouter) para no casarse con un proveedor; **A/B Haiku vs Sonnet** para calibrar tono. Secuencia futura de IA: insight → chat → voz.

---

## Rediseño del dashboard del administrador (2026-06-21)

El dashboard admin (`/dashboardAdmin`, `AdminDashboardPage.jsx`) pasó de **6 tarjetas estáticas** a un panel dinámico **"pulso del club en tiempo real"**. La estructura sale del research del agente `bibliotecario`: el KPI rey del rubro es el **% de ocupación** (benchmark 50% = rentable), más un bloque accionable, agenda forward (qué viene hoy) y una tendencia. Lo más importante del bloque es el **gating de datos sensibles a nivel backend**: los números financieros que el rol no puede ver **no viajan en el payload** (no se ocultan en el front). Probado e2e con los 3 niveles de rol. Ver [[project_dashboard_resumen_admin]], [[project_empleados_permisos]] y [[project_agente_bibliotecario]].

- **Backend (`routes/clubs.js`, `GET /me/dashboard`, additivo):** nuevo cálculo de **% ocupación del día** = slots ocupados / disponibles, donde disponibles = canchas activas × franjas de 1.5h según `config.horarios` del club (fallback por cancha). Dedup de turnos fijos materializados (un TF con su reserva `esTurnoFijo` no se cuenta dos veces) y guard de medianoche en las franjas. **Agenda de hoy**: reservas + TF virtuales del día, ordenada, con tipo real (online/eventual/fijo) y estado de pago (el TF virtual cuenta impago hasta cobrarse). **Tendencia 7 días**: serie de ingresos + reservas por día. **Deltas vs ayer** (reservas e ingresos), **contador de cobros pendientes** (impagos + cargos) y torneos.
- **Gating de datos financieros (lo central):** dos flags — `verCaja` (permiso `caja` → ingresos/totales/serie de ingresos, SENSIBLE) y `verCobros` (`ventas` o `caja` → estado de pago en agenda + "por cobrar"/deuda). El payload **omite** las claves que el rol no puede ver (`...(verCaja ? {...} : {})`), no las manda en `null` para que el front las esconda. Verificado e2e: empleado solo-reservas no ve **nada** financiero; empleado con `ventas` ve cobros pero no ingresos; dueño (`caja`) ve todo. Apila con el RBAC ya existente.
- **Frontend (`AdminDashboardPage.jsx`):** hero con Ocupación (barra + marca del 50%) · Ingresos (▲▼ vs ayer, solo si `verCaja`) · Por cobrar (accionable, solo si `verCobros`); stats secundarias; bloque **"Necesita tu atención"** centrado en cobros pendientes (decisión de Luca); agenda con badges de tiempo (EN JUEGO / PRÓXIMO) y de pago; tendencia 7 días en barras; actividad con iconos. **Auto-refresh cada 45s** + indicador "● En vivo". El hero **adapta su ancho según permisos** (sin tarjetas duplicadas cuando faltan datos).
- **Sidebar (`Sidebar.jsx`):** nuevo ítem **"Resumen"** (icono `LayoutDashboard`) → `/dashboardAdmin`. Antes solo se llegaba tocando el logo. Visible para todos los admins.
- **Notificaciones (`Navbar.jsx` campana + `ReservasPage.jsx` panel de avisos):** rediseño con chips de iconos por tipo + colores de la convención de la grilla (turno fijo = violeta, online = verde, liberado = rojo, solicitud = ámbar, clase = naranja). El **turno fijo confirmado automáticamente** pasó de verde a **violeta** (coherencia con la grilla). La campana ahora tiene acento de no-leída, hora relativa y botón al hover.
- **DECISIÓN (documentada aparte, NO construida):** el **"Insight del día con IA"** será el **primer ladrillo de IA** del SaaS, grounded en la data de este dashboard y ofrecido como **feature premium** — se construye después de este bloque. Ver [[project_dashboard_resumen_admin]].
- **PENDIENTE:** el insight de IA sigue sin construirse (decisión tomada, implementación posterior). El bloque es additivo y no rompe nada del flujo existente.

---

## Automatización de turnos — auto-confirmación + auto-liberación de ausencias (2026-06-20)

El club ya **no necesita aprobar a mano** cada reserva ni cada turno fijo: por default todo se **auto-confirma al instante**, en TODOS los planes (sin gating). Decisión de producto respaldada por investigación de mercado: la confirmación instantánea es **higiene estándar del rubro** (Playtomic, MATCHi, CourtReserve, CanchaYa la dan de base), no un premium — el upsell premium se mueve a MercadoPago / políticas / IA. El dueño que prefiera el flujo manual de siempre lo recupera apagando un toggle. En paralelo se barrió y CERRÓ una familia entera de bugs de medianoche (`00:00`) que eran pre-existentes (no introducidos por este bloque). Auditado por `qa-flujos` en 3 pasadas (general + notificaciones + doble-booking/plata adversarial), veredicto APTO, cero hallazgos críticos/altos, y probado e2e con concurrencia real. Ver [[project_auto_aprobacion_turnos]], [[project_reservas_serializable]] y [[registro-auditorias]].

- **Helper nuevo (`lib/autoConfirma.js`):** `clubAutoConfirma(club)` lee `club.config.autoConfirmaReservas` (default `true` si no está seteado). Única fuente de verdad del comportamiento, opt-out por club.
- **Auto-confirmación (`reservas.js` POST `/` + `turnos-fijos.js` POST `/`):** si auto → reserva/TF nace `confirmada`/`confirmado` + notif al jugador (`reserva_confirmada`/`turno_fijo_confirmado`) y al admin como CONTROL (`reserva_autoconfirmada`/`turno_fijo_autoconfirmado`). Si el dueño apagó el toggle → flujo manual de siempre intacto (`nueva_reserva`/`solicitud_turno_fijo`, queda `pendiente` para aprobación admin).
- **Auto-liberación de ausencia (`turnos-fijos.js` POST `/:id/ausencia`):** cuando el jugador avisa que no asiste un día, el slot se libera **al instante** (push a `diasAusentes` + `diasAusentesJugador`), se cancela la reserva puntual asociada, y se notifica al admin como CONTROL (`turno_liberado_auto`) + al jugador (`ausencia_confirmada`). Ya no hay paso intermedio de aprobación admin de la ausencia. La política de cancelación (cargo si avisa fuera de plazo) sigue **intacta**. El endpoint quedó envuelto en `runSerializable` → anti cargo duplicado por doble-submit, probado con 2 ausencias simultáneas (1 solo cargo).
- **Baja del turno fijo entero (eliminar) sigue MANUAL:** bloqueada por deuda (409 si hay cargos pendientes). Decisión explícita de Luca: *"primero pagá, después se da de baja"*. NO se automatizó.
- **Bloqueo admin (`POST /admin`):** ahora bloquea crear reserva/TF sobre un turno fijo confirmado (salvo día liberado por ausencia) y aplica RN-51 (un solo TF por cancha/día/horario) sin saltear en silencio.
- **Familia de bugs de medianoche (`00:00`) — CERRADA:** `00:00` como hora de FIN se trataba como minuto 0 en vez de 1440 (medianoche siguiente). Afectaba: validación de duración 1.5h del TF, `turnoYaTerminoHoy`, `venceCobro`, corte de cancelación, `deudas.js` (turnos impagos contados como deuda antes de tiempo), `clubs.js` (`ocupadasAhora`) y TODOS los checks de solapamiento de TF (creación jugador, creación admin, aprobación admin, reserva-vs-TF). Todos corregidos con guard `=== '00:00' ? 1440`. Eran bugs PRE-EXISTENTES.
- **Frontend:** los 3 tipos nuevos de notificación renderizan bien en `ReservasPage.jsx` (panel admin) y `Navbar.jsx` (campana) sin fila en blanco; `turno_liberado_auto` en rojo. Pantalla de éxito en el modal del jugador al confirmar (`PlayerReservasPage.jsx`). Toasts al cancelar/liberar (`PlayerMisReservasPage.jsx`, `PlayerTurnosFijosPage.jsx`).
- **Calidad:** e2e con datos descartables (limpieza por id) + concurrencia real → 2 reservas simultáneas mismo slot (gana 1), 2 TF simultáneos (gana 1), 2 ausencias simultáneas (1 solo cargo).
- **PENDIENTE (no bloqueante, deuda vieja):** índice único parcial en DB como defensa extra anti doble-booking — no es de este bloque, postergado al deploy. Ver [[project_deploy_pendiente]].

---

## Hardening anti doble-booking — turnos fijos y clases bajo Serializable (2026-06-20)

Una auditoría del agente `qa-flujos` detectó que **turnos fijos** (solicitud jugador + confirmación admin) y **editar clase de profesor** corrían sus chequeos de conflicto en `prisma.$transaction` **sin** `isolationLevel: Serializable` ni reintento P2034 — a diferencia de `reservas.js`, que ya estaba blindado. Eso dejaba una ventana TOCTOU real: dos solicitudes paralelas al mismo turno fijo recurrente podían pasar ambas la validación y crear/confirmar dos TF sobre el mismo slot. Se cerró el hueco aplicando el mismo patrón Serializable a todos esos caminos y unificando el helper en un lib compartido. Probado e2e. Ver [[project_reservas_serializable]] y [[registro-auditorias]].

- **Lib nuevo (`lib/serializable.js`):** se extrajo `runSerializable(fn, retries=2)` (antes definido inline en `reservas.js`) a su propio módulo (DRY). Corre `$transaction` en nivel Serializable, reintenta hasta 2 veces ante `P2034`/`40001` y re-lanza el resto. `reservas.js` ahora lo importa del lib (se borró la definición local y el `import { Prisma }` que quedó muerto).
- **`turnos-fijos.js`:** `POST /` (solicitar TF) y `PATCH /:id/estado` (confirmar TF) pasaron de `prisma.$transaction` plano a `runSerializable`. Mismo throw `{status:409}` + catch→409 que ya tenían.
- **`reservas.js` `PATCH /profesor/:id`** (editar clase de profe): los 3 chequeos de conflicto (reserva en cancha, turno fijo activo, otra clase del mismo profe) + el `update` se envolvieron en `runSerializable`, cada conflicto con `throw Object.assign(new Error(msg), {status:409})` y catch→409.
- **Comentarios corregidos:** se reemplazaron los comentarios que afirmaban falsamente que un `$transaction` plano prevenía el race por la explicación correcta (READ COMMITTED no impide TOCTOU; Serializable aborta una de las dos y `runSerializable` reintenta).
- **Probado e2e:** 2 solicitudes paralelas al mismo turno fijo → una 201, otra 409, queda 1 solo TF. Backend recargó limpio.
- **PENDIENTE (no bloqueante, defense-in-depth):** índice único parcial en DB sobre Reserva/TurnoFijo como red de seguridad por si algún camino futuro saltea el Serializable. Postergado al deploy (requiere dedup previo). Hoy la única defensa es el isolation a nivel app, correctamente aplicado en todos los caminos. Ver [[project_deploy_pendiente]].

---

## Recuperar contraseña del jugador — DNI + email (2026-06-20)

El jugador que se olvidó la clave la recupera solo, sin pasar por el admin. Verifica identidad con **DNI + email registrado** (el email es el 2º factor) y define una contraseña nueva vía un token de un solo uso. Diseño **deploy-ready**: hoy el token viaja en la respuesta del `forgot` (sin proveedor de mail todavía), al deployar se manda por email **sin tocar el resto del flujo** — el endpoint `reset` no cambia. Probado e2e con curl: forgot ok, email incorrecto rechazado (anti-enumeración), token single-use, login con la clave nueva ok. Ver [[project_cambio_password_tokenversion.md]] y [[project_deploy_pendiente]].

- **Modelo (`schema.prisma`):** nuevo `PasswordResetToken` (id cuid, `jugadorId`, `tokenHash` único = sha256 del token crudo —el crudo nunca se guarda—, `expiresAt`, `usedAt?`, `createdAt`). Relación `Jugador.resetTokens` con `onDelete: Cascade`. db push hecho en local.
- **Backend (`routes/auth.js`):** `POST /auth/jugador/forgot` (rate-limited con `loginLimiter`): valida `dni`+`email`+`clubId`; busca por `clubId_dni` y compara email normalizado (trim+lowercase) + exige `cuentaActiva`. Si algo no coincide → **error único** "DNI y email no coinciden" (no distingue cuál falló → no filtra qué DNIs existen). Borra tokens previos sin usar del jugador, genera `crypto.randomBytes(32)`, guarda su hash con expiración **30 min**, y devuelve el token crudo (TODO: mandarlo por email al deployar).
- **Backend reset:** `POST /auth/jugador/reset` (rate-limited): valida token+password (≥6). Verifica que el token exista, no esté usado y no esté vencido. En una `$transaction`: bcrypt(10) de la clave nueva + `tokenVersion: increment` (invalida sesiones viejas) + marca el token `usedAt`. Este endpoint sirve igual venga el token de la respuesta o del email.
- **Frontend (`PlayerAuthPage.jsx`):** link "¿Olvidaste tu contraseña?" bajo el campo de clave + modal de 2 pasos (identidad DNI+email → contraseña nueva). Pre-rellena el DNI del login, usa `VITE_CLUB_ID`, guard de doble-submit (`fLoading`), errores inline por paso y `toast.success` al terminar (deja el DNI cargado para loguear al toque). Show/hide password en el paso 2.
- **PENDIENTE (deploy):** enchufar el envío del token por email (Resend) en el `forgot` y dejar de devolverlo en la respuesta — único cambio que falta, ya marcado con TODO en el código.

---

## Rediseño visual de los logins admin y jugador (2026-06-20)

Refresco estético de las pantallas de login (admin + jugador), ya commiteado en esta sesión (commit `2805aad`). Cancha SVG realista (vista cenital), titulares sin redundancia e ítems de features con íconos. Solo visual, sin cambios de lógica de auth.

---

## RBAC — Empleados con permisos por módulo (2026-06-19)

El dueño del club puede crear **empleados** con acceso limitado por módulo, para que un empleado (ej: mostrador) **no vea las finanzas ni toque la configuración del club**. Es RBAC *dentro* del tenant, separado del feature-gating por plan (se apilan: acceso efectivo = plan ∩ permisos del empleado). Bloque cerrado y probado e2e. Ver [[project_empleados_permisos]].

- **Modelo:** `Admin.rol` (`owner`|`staff`, default `owner` → admins existentes son dueños) + `Admin.permisos String[]`. `lib/permisos.js`: catálogo de 7 módulos asignables + `tienePermiso(admin,id)` (owner→true) + `permisosEfectivos`. login/`admin/me` devuelven `rol` + `permisos`. db push hecho en local.
- **Permisos asignables:** reservas, jugadores, clases, torneos, sponsors, **ventas** (cobros/ventas/stock — operativo) y **caja** (caja/reportes/gastos — la plata, sensible). Finanzas se PARTE a propósito: el empleado cobra/vende sin ver cuánto factura el club. **Solo dueño (no se delega):** Apariencia/config del club, Equipo, Plan/facturación.
- **Backend Ola 1 (routers admin-only):** `requirePermiso(id)` + `requireOwner`. caja/gastos→caja; productos/categorias/comandas/cargos→ventas; reservas cobro (/:id/cobrar,/cuenta,/pago,/cobro-omitido)→ventas; torneos→torneos; profesores→clases; sponsors→sponsors. `PATCH /clubs/me` y `/me/canchas`→requireOwner. **Dashboard adaptativo:** `/clubs/me/dashboard` solo manda lo financiero (ingresos día/mes/deuda + "Pago recibido") si el admin tiene `caja`.
- **Backend Ola 2 (defense-in-depth, gestión):** jugadores admin→`jugadores`; turnos-fijos admin→`reservas`; reservas per-ruta (/jugador/:id, /pendientes, POST /admin, PATCH /:id/estado, PATCH /:id→`reservas`; POST /admin/clase-profesor→`clases`). `DELETE /reservas/:id` es COMPARTIDA → guard dentro del handler solo para el branch admin (jugador/profesor intactos). Validado e2e: staff sin permiso→403 en todo; con permiso→200/404.
- **Permisos en caliente:** `requirePermiso` lee rol+permisos de la DB en cada request → quitar un permiso (o eliminar al empleado) tiene efecto inmediato, sin esperar a que expire el token.
- **Frontend:** `EquipoAdminPage` (/dashboardAdmin/equipo, solo dueño) — CRUD de empleados con checkboxes de permisos + validación en tiempo real (skill form-validation: bloqueo de números en nombre vía `useFieldHint`, email regex, PasswordStrength). Sidebar/BottomNav filtran ítems por permiso (`puedeVerItem`; Club+Equipo+Plan = ownerOnly). PagosPage filtra pestañas (Ventas/Stock/Cobranzas=ventas; Gastos/Caja=caja) y redirige si cae en una no permitida. Navbar muestra rol "Dueño"/"Empleado". AdminDashboardPage oculta las tarjetas de ingresos si no llegan.

---

## Pulido post-auditoría — Bloques 1-3 (2026-06-17)

Tras auditar los 3 portales (admin/jugador/profesor): el aislamiento multi-tenant/rol está SÓLIDO (todo `findUnique(id)` chequea clubId/pertenencia). Lo que se pulió fueron detalles menores que salieron en la auditoría:

- **Bloque 1 — anti-abuso:** `express-rate-limit` + `middleware/rateLimit.js` (loginLimiter 10/min, signupLimiter 5/h, lookupLimiter 30/min). Aplicado a los 4 logins (admin/jugador/profesor/plataforma), `/platform/signup` y `/jugadores/buscar-por-dni`. `signup` con mensaje genérico ante email existente (anti-enumeración; el rate-limit es la defensa real). Probado: 6º signup → 429. OJO deploy: falta `app.set('trust proxy', 1)` por el proxy de Railway (ver [[project_deploy_pendiente]]).
- **Bloque 2 — UX:** (a) `api.js` ante `club_bloqueado` ahora redirige según el portal (admin→/login, jugador→/dashboardJugadores, profesor→/dashboardProfesor) limpiando el token correcto; (b) `authStore` ahora PERSISTE el user (`admin_user` en localStorage) → las features del plan están al instante en cada reload, sin parpadeo del menú. Sidebar/BottomNav ocultan módulos gateados hasta que cargan las features (aparecen en vez de desaparecer).
- **Bloque 3 — branding:** reemplazado "PadelOS" → "PadelwIArk" en 10 archivos (auth, layouts, navbar, titles). White-label real por club (nombre del club en auth via fetch por slug) sigue pendiente, va con el refactor de theming.
- **Bloque 4-A — Toasts UNIFICADOS (2026-06-17):** `ToastProvider` + `useToast()` (success/error/info, icon/label/duration custom) en `components/ui/ToastProvider.jsx`, montado en App.jsx. Migrados Profesor, Finanzas (PagosPage/Gastos/Ventas/Stock), Torneos (Page+Detalle), JugadoresAdmin, QuienesSomos, PlayerProfile, PlayerTournaments. Borrado el viejo `Toast.jsx`. **A propósito NO migrados:** `PlayerReservasPage.confirmaciones` (rastreador con lifecycle, no es toast) y `ReservasPage` admin (panel toast contextual + error inline, archivo frágil). Ver [[project_toast_unificar]].
- **Bloque 4-B — Theming / white-label COMPLETO (2026-06-18):** el área jugador + página pública siguen el color del club (Opción A: panel admin y PadelwIArk quedan en su marca fija). Token `club` en @theme = `var(--club-primary)` (ya seteada por clubStore). Migrados todos los `#afca0b` del área jugador (Player*, layout, register steps, TorneoPublico). Charts Recharts + acento de fixture usan helper `CLUB()` (hex real en runtime, porque var() no resuelve en atributos SVG). Hovers lima (`#c4e20c`) → `brightness-110`. **Guard de contraste:** el picker de color primario (Apariencia) rechaza colores muy oscuros (luminancia<0.35) → garantiza legibilidad sin tocar los textos-sobre-acento. Ver [[project_theming_colores]].

---

---

## Capa SaaS — suspensión real + self-service (2026-06-16)

Cierre del bloque SaaS (salvo lo que depende del deploy).

- **Suspender corta sesiones ya logueadas:** `requireClubActivo` aplicado a routers core 100% autenticados (reservas, turnos-fijos, notificaciones) en `app.js`. Los gateados (finanzas/torneos/etc.) ya chequeaban vía `requireFeature`. Además, los 3 logins (admin/jugador/profesor) rechazan con `club_bloqueado` si el club está suspendido o con prueba vencida. Frontend: `api.js` ante `club_bloqueado` cierra sesión del club (limpia tokens) + alert + redirige a /login (guard `bloqueoManejado` para no repetir). NO se tocaron `jugadores` (búsqueda pública por DNI) ni `clubs` (landing pública). Probado e2e: suspender corta la sesión activa (403) y bloquea el re-login.
- **Self-service público:** `POST /api/platform/signup` (sin auth) usa el mismo motor `crearClub` → club en 'prueba'. Valida nombre/email/pass (≥6). `PwRegistro.jsx` en `/padelwiark/registro` (Court Noir, con pantalla de éxito → "Entrar a mi club"). Todos los CTAs "Probar gratis" de la landing (nav, hero, precios, cierre) apuntan ahí. Probado: alta + login directo.
- **PENDIENTE (deploy):** verificación por email del signup (hoy entra directo, sin confirmar — requiere proveedor de mail) + anti-abuso + `tokenVersion` en Admin. Anotado en [[project_deploy_pendiente]] junto a Mercado Pago.

---

---

## Capa SaaS — Fase B: feature gating (2026-06-16)

El plan **ya manda de verdad**. Probado de punta a punta por API + en pantalla. Falta solo la parte de gestión (editor de matriz + regalitos).

- **Catálogo en código** (`lib/planes.js`): `FEATURES` (reservas/jugadores/turnos_fijos = core siempre; finanzas/torneos/profesores/estadisticas/sponsors/ia/multisede/branding), `DEFAULT_MATRIZ`, `featuresEfectivas(club, matriz)` y `accesoBloqueado(club)`. **Prueba vigente → Premium completo** (decisión B). Suspendido / prueba vencida → sin acceso.
- **Matriz en DB** (`PlatformSetting` clave `planMatriz`, editable a futuro desde el panel) + `Club.featuresExtra String[]` (regalitos). `lib/planesConfig.js`: getMatriz/setMatriz (semilla = DEFAULT_MATRIZ). **db push hecho en local.**
- **Middleware** (`middleware/auth.js`): `requireFeature(featureId)` + `requireClubActivo`. `login`/`admin/me` ahora devuelven `club.plan`, `club.estado` y `club.features` (efectivas).
- **Enforcement backend (con bisturí, sin romper público/jugador):** `finanzas` → caja, productos, gastos, comandas, categorias (router-level en app.js) + cargos (per-route admin). `profesores`, `sponsors` → router-level. `torneos` → solo las 12 rutas admin (públicas GET y jugador inscribir quedan abiertas). `estadisticas` → `/reservas/admin/stats`.
- **Frontend:** hook `useFeature`/`useFeatures` (lee `authStore.user.club.features`). Sidebar + BottomNav del admin **filtran los ítems** según plan (Clases/Torneos/Sponsors/Finanzas desaparecen en básico). Verificado en pantalla.
- **Paso 4 — Editor de matriz (panel):** `GET/PATCH /platform/planes` (lee catálogo+matriz / guarda sanitizando, core siempre incluido). `PwPlanesEditor.jsx` con grilla módulos×planes (core con 🔒), selector "Clubes | Planes" en el dashboard. Editás básico/pro/premium desde el panel y el gating obedece (probado e2e).
- **Paso 5 — Regalitos por club:** `PATCH /platform/clubs/:id` acepta `featuresExtra` (valida ids). `PwModalRegalitos.jsx` (ícono 🎁 por fila): habilita módulos sueltos fuera del plan; los que ya vienen en el plan salen bloqueados. Probado: club básico + regalo 'torneos' → puede usar torneos sin cambiar de plan.
- **FASE B COMPLETA.** Pendiente (no Fase B): que suspender corte sesiones ya logueadas (`requireClubActivo` existe pero falta aplicarlo a routers core como reservas) + `tokenVersion` en Admin. Luego: self-service público + verificación email + quick-setup wizard.

---

## Capa SaaS — Fase C: panel del super-admin (2026-06-16)

Frontend del 4to rol, en `/plataforma` (standalone, estilo "Court Noir" de la landing). Probado en navegador por el usuario.

- **`store/platformStore.js`:** auth con `platform_token`/`platform_user` en localStorage (separado de los otros roles).
- **`pages/padelwiark/admin/`:** `PlataformaPage` (login si no hay sesión / dashboard si hay), `PwAdminLogin` (Court Noir, lleva `pw-root` para el fondo oscuro), `PwAdminDashboard` (resumen Clubes/Activos/En prueba + lista con badges plan/estado + conteos + selector de plan + suspender/reactivar), `PwModalCrearClub`, `PwConfirm` (confirmación genérica), `PwModalResetAdmin`.
- **Toasts** propios del panel (Court Noir) en crear/plan/suspender/reactivar/reset + errores.
- **Guardrails:** confirmación antes de suspender; **resetear contraseña del admin** del club (`POST /platform/clubs/:id/reset-admin` → resetea el admin más antiguo, devuelve su email). Caso de uso: dueño de club olvidó la clave.
- **Fix conteos:** `_count` de jugadores/canchas filtra `activo: true` (las canchas/jugadores soft-deleted ya no inflan el número; ahora coincide con lo que ve el operador).
- Primer PlatformAdmin real creado: WiarkSolutions / wiarksolutions@gmail.com.

**Pendiente Fase B (enforcement server-side, el salto importante):** hoy `plan` y `estado` son decorativos. Falta: (1) feature gating real (plan limita módulos — middleware `requirePlan` + `useFeature`/`<FeatureGate>`, ver [[project_feature_gating]]); (2) que **suspender** corte el acceso de sesiones ya logueadas (hoy el middleware no chequea `club.estado`); (3) invalidar sesión de admin al resetear contraseña (Admin no tiene `tokenVersion` como Jugador). Las 3 son el mismo trabajo: validar en cada request.

---

## Capa SaaS — Fase A: rol super-admin + tenants (2026-06-16)

Cimientos de la plataforma (ver [[project_saas_plataforma_rol4]]). Backend completo y **probado de punta a punta por API** (login → crear club → listar → suspender → reactivar/plan → guard 401 → cleanup). Solo backend; el panel visual es Fase C.

- **Schema (db push hecho en local):** modelo `PlatformAdmin` (id, nombre, email @unique, password — identidad separada, NO es un Admin de club). En `Club`: `plan` (basico|pro|premium, default basico), `estado` (prueba|activo|suspendido, default prueba), `trialHasta` (DateTime?). El `db push` aplicó defaults al Club Demo existente sin romper nada.
- **`lib/tenants.js` → `crearClub({...})`:** MOTOR ÚNICO de alta (sirve para alta asistida hoy y self-service mañana — mismo núcleo, solo cambia quién lo llama). Slug único auto, valida email admin único, crea club + primer admin atómicamente, trial 14 días, estado 'prueba'. Exporta `PLANES_VALIDOS` y `slugify`.
- **`routes/platform.js`** (montado en `/api/platform`): `POST /login` + `GET /me` (role 'platform' en el JWT), `GET /clubs` (lista con _count jugadores/canchas/admins), `POST /clubs` (usa crearClub), `PATCH /clubs/:id` (cambiar plan y/o estado; suspendido baja también el kill-switch `activo`).
- **`scripts/create-platform-admin.mjs`:** `node scripts/create-platform-admin.mjs "Nombre" email "pass"` — crea/actualiza el dueño de plataforma. El usuario crea el suyo real cuando esté el panel (Fase C).
- **Decisión de onboarding:** arrancar ASISTIDO (alta a mano desde el panel), con self-service como objetivo posterior (mismo motor `crearClub`). El usuario quiere quick-setup wizard + IA quirúrgica más adelante (Fase posterior, va arriba de esto).
- **Pendiente:** Fase B (feature gating: plan → features, middleware `requirePlan` + `useFeature`/`<FeatureGate>`), Fase C (panel visual super-admin + login real), después self-service público + verificación email + wizard.

---

## Landing de ventas PadelwIArk — "Court Noir" (2026-06-15)

Inicio de la **capa de plataforma SaaS** (ver memorias [[project_saas_plataforma_rol4]] y [[project_padelwiark_marca]]). El usuario decidió arrancar por la **landing comercial de la empresa** (web de ventas, ≠ landing de cada club). El producto pasa a llamarse **PadelwIArk** (con "IA" embebido, resaltado en neón en el logo).

- **Ruta:** `/padelwiark` (standalone, sin layout del club), en `src/pages/padelwiark/`. Autocontenida, mobile-first, reusa React+Vite+Tailwind v4. Extraíble a dominio propio después.
- **Sistema de diseño "Court Noir"** en `padelwiark.css` (scopeado bajo `.pw-root`, no toca el resto de la app): oscuro premium `#0a0f0d` + neón lima marca `#afca0b`/`#d4ff3f` + teal `#14b8a6`. Fuentes: Space Grotesk (display) + Inter (body) + JetBrains Mono (labels), cargadas en `index.html`. Aurora animada, grano, glassmorphism, glows, fade-up, reduced-motion.
- **8 bloques** (componentes en `components/`): `PwNav` (glass sticky + logo Padelw[IA]rk + menú mobile), `PwHero` (aurora + titular clamp + mockup dashboard CSS flotando), `PwTrust` (reemplaza cuaderno/WhatsApp/Excel — sin logos falsos), `PwProblema` (before/after), `PwFeatures` (bento grid con mini-visuales: reservas/finanzas/torneos/IA/app), `PwComo` (3 pasos), `PwPrecios` (3 planes ARS placeholder básico/pro/premium + toggle mensual/anual, alineado al feature gating), `PwPorque` (6 diferenciadores), `PwFAQ` (acordeón), `PwCTA` (cierre + footer).
- **Pendiente:** precios y features definitivos (hoy placeholder), conectar CTAs a un flujo real de alta, mover a dominio propio, y construir el resto de la capa SaaS (rol super-admin PlatformAdmin + feature gating — Fases A-C de [[project_saas_plataforma_rol4]]).

---

## Hardening anti doble-booking (2026-06-15)

Auditoría de robustez del core (flujo reserva + aislamiento multi-tenant) de cara a soltarlo a un primer usuario.

- **Aislamiento entre clubes:** auditado, **sólido**. `clubId` siempre del JWT (nunca del body/query), toda mutación verifica `reserva.clubId === req.user.clubId` → 403, referencias a jugador validadas contra el club. Sin cambios.
- **Doble reserva:** había un agujero real de concurrencia. La `$transaction` corría en READ COMMITTED (default Postgres) → dos requests simultáneos podían pasar ambos el chequeo de solapamiento y crear dos reservas para el mismo slot (TOCTOU). No hay constraint a nivel DB que lo ataje.
- **Fix** (`routes/reservas.js`, sin migración): helper `runSerializable(fn, retries=2)` → corre la transacción en **Serializable** con reintento ante fallo de serialización (P2034/40001). Aplicado a los **5 caminos** que crean/confirman reservas: `POST /` (jugador), `POST /admin` (manual, antes chequeaba fuera de la transacción), `POST /profesor` y `POST /admin/clase-profesor` (antes **sin** transacción), y `PATCH /:id/estado` (confirmación). Ahora es Postgres quien garantiza la unicidad del slot.
- **Bonus:** bug preexistente — al confirmar sobre un slot ya ocupado se lanzaba 409 pero el catch lo devolvía 500. Corregido (devuelve 409).
- Pendiente opcional (no urgente): constraint a nivel DB (exclusion GiST + rango) como doble red; con Serializable ya está cubierto el escenario real.

---

## Stock de productos + alertas + OCR-ready (2026-06-15)

- **Schema:** `Producto.controlaStock/stock/stockMin` (opt-in), `Cargo.cantidad`, modelo `MovimientoStock` (entrada/salida/ajuste, cantidad firmada, costoUnit, motivo, ref). `lib/stock.js`: `descontarStock`/`reponerStock`/`ingresarStock` (solo afectan productos con controlaStock).
- **F2 descuento en ventas:** comanda `/items`, `/productos/venta` (des-bundleado, un cargo+cantidad por ítem), consumos de turno `/reservas/:id/cuenta` → descuentan stock. Reponen al **quitar ítem de mesa**, **descartar mesa**, **eliminar cargo** (DELETE /cargos/:id). Anular cobro NO repone (el consumo igual ocurrió).
- **F3 ingreso:** ajuste manual `POST /productos/:id/ajuste` ({stock} final → movimiento ajuste). Compra: `POST /gastos` acepta `lineasStock [{productoId?|nombre?, categoria?, cantidad, costoUnit, precio?}]` → crea/matchea productos, suma stock, actualiza costo (`ingresarStock`). Productos POST/PATCH aceptan controlaStock/stock/stockMin.
- **F4 alertas:** badge en catálogo (rojo sin stock / ámbar ≤ stockMin / gris ok) + ajuste rápido (prompt → /ajuste), **banner de bajo stock** en Ventas, y **notificación al admin** (tipo `stock_bajo`, creada en `descontarStock` al cruzar el umbral, deduplicada por producto sin leer; render en `Navbar.formatNotif` + `normBackend`).
- **F5 OCR (premium):** `POST /gastos` con `lineasStock` es el target estructurado. **UI lista:** en `GastosTab` el alta de gasto tiene sección "Ingresar productos a stock" (líneas nombre+cantidad+costo, matchea por nombre/datalist, "usar total del detalle") + placeholder "Próximamente: cargar de la foto (IA, premium)". El OCR/IA solo pre-llenará esas líneas; lo demás ya funciona manual.

**Módulo Finanzas COMPLETO** (Ventas/POS + comandas + Stock + Cobranzas + Gastos + Caja/Reportes). Pendiente real solo: conectar el modelo OCR/IA (cuando se arme el asistente) + gating de planes.

### Tab Stock dedicada (2026-06-15)
- 5 tabs: **Ventas · Stock · Cobranzas · Gastos · Caja/Reportes**. El ABM de productos salió de ⚙️ (que ahora solo tiene Métodos) y vive en **`features/pagos/StockTab.jsx`**: tarjetas (valor de inventario = Σ stock×costo, # bajo stock, # productos), alerta de reposición, buscador, form alta/edición (pricing costo/precio/% + control de stock), lista por categoría con badge de stock (ajuste por prompt), **ver movimientos** (`GET /productos/:id/movimientos`), y botón "Ingresar compra" → cambia a tab Gastos.
- La **compra/factura** sigue en Gastos (es egreso) con la sección de líneas que repone stock = punto de entrada del OCR/IA. Al guardar, escribe en Gastos + Stock (Producto + MovimientoStock).
### Auditoría + pulido de Finanzas (2026-06-15)
Auditoría de IA/UX del módulo. Cambios:
- **Compra dedicada:** `ModalCompra` en StockTab (botón "Ingresar compra") — proveedor, foto (IA-ready), líneas de productos → suma stock + actualiza costo + crea Gasto (categoría "Mercadería"). Se **sacaron las líneas de stock de "Nuevo gasto"** (Gastos = egreso general; nota que apunta a Stock→Ingresar compra).
- **Sidebar "Pagos" → "Finanzas"**.
- **Ayuda (ⓘ) reescrita** a la estructura real (Ventas/Stock/Cobranzas/Gastos/Caja + Asistente IA próximo).
- **Ajuste de stock con mini-modal** (se sacó el `window.prompt`).
- **Copy en Ventas** aclarando venta rápida (pago al toque) vs mesa (cuenta abierta).
- **Limpieza:** se borró `ModalCatalogoProductos` + handlers + `catalogoOpen` + helpers de pricing de PagosPage (ya viven en StockTab). ⚙️ quedó solo con Métodos.

### Producto como modal + categorías administrables (2026-06-15)
- **Nuevo producto/Editar** es un modal (`ModalProducto`), con el **stock dentro de la ficha** (stock inicial en alta / stock actual editable en edición → `/productos/:id/ajuste`). Se quitó el mini-modal de ajuste suelto; el badge de stock abre el modal.
- **Categorías administrables:** modelo `Categoria` (`@@unique([clubId, nombre])`) + `routes/categorias.js` (GET con seed de 5 defaults, POST, PATCH=renombrar propaga a productos via updateMany, DELETE bloqueado si hay productos → 409 con conteo). StockTab trae `/categorias`, agrupa por ellas, botón **"Categorías"** (`ModalCategorias`: alta/renombrar/borrar con validación + conteo por categoría) y en `ModalProducto` el select tiene **"➕ Nueva categoría"** inline. Se eliminó la constante hardcodeada `CATEGORIAS`.

---

## Comprobantes Finanzas — ticket/WhatsApp/cierre (2026-06-15)
- `comprobantes.js`: `imprimirTicket` + `ticketTexto` + `enviarWhatsApp` (wa.me), `generarReporteGastos`/`exportarGastosCSV`, `imprimirCierreCaja` (arqueo Z del período).
- **Mesa** (VentasTab): al cobrar y cerrar → pantalla Imprimir ticket / WhatsApp / Listo.
- **Venta rápida** (ModalCuentaJugador venta): al cobrar → overlay con ticket / WhatsApp (tel del jugador si tiene).
- **Cobranzas**: botón WhatsApp junto al recibo (Pagados). **Gastos**: Reporte PDF + CSV (alineados a la derecha, igual que Cobranzas).
- **Caja / Reportes**: botón "Imprimir cierre" (PDF branded: ingresos/egresos/neto + por método/tipo/categoría).
- Todos los comprobantes aclaran **"no fiscal"**. Factura AFIP = fuera de scope (integración futura).
- Fix visual: el monto no se corta con los badges (Cobranzas y Gastos: monto `w-24` + acciones auto). Top bar "Pagos"→"Finanzas".

## Finanzas completo — Categorías + Reportes + Margen (A+B+C+D) (2026-06-15)

- **A Categorías:** `Producto.categoria` (Bebidas/Comidas/Golosinas/Insumos/Otros) + `Producto.costo`. Catálogo (⚙️) con form único alta/edición (el lápiz carga arriba), pricing **Costo · Precio venta · % ganancia** bidireccional (markup sobre costo: `calcPct`/`precioDesdePct`). Lista agrupada por categoría.
- **B Detalle por ítem:** cada venta de producto guarda `categoria`/`productoId`/`costo` (snapshot). `lib/productos.js#snapshotProductos`. Un cargo POR ítem (se des-bundleó `/productos/venta`). Aplica a comanda, venta rápida y consumos del turno (`/reservas/:id/cuenta`).
- **C Reportes:** `GET /caja/reporte?desde&hasta` → ingresos/egresos/neto, por método, por tipo (turnos/bar/torneos/otros), por categoría, top productos, margen del bar. `CajaTab` renombrada **"Caja / Reportes"** con período Hoy/Semana/Mes/Personalizado.
- **D Margen:** `Producto.costo` + `Cargo.costo` (costo×cantidad snapshot) → margen por categoría y total en el reporte.

### Próximo bloque: Stock + OCR de facturas (acordado)
- **F1** modelo: `Producto.stock/stockMin/controlaStock` (opt-in) + `MovimientoStock` (entrada/salida/ajuste, cantidad, costoUnit, motivo, ref).
- **F2** descuento auto de stock en ventas (anular/quitar repone) — solo si controlaStock.
- **F3** ingreso de stock: ajuste manual + factura de proveedor con líneas (suma stock + actualiza costo + crea Gasto).
- **F4** alertas bajo stock: badge en catálogo/POS + notificación al admin (reusa `notificaciones`).
- **F5 (premium, estructurada)** OCR/IA: `POST /gastos/factura-ocr` recibe líneas parseadas → aplica F3 auto. Hoy el form manual lo hace; la IA pre-llena. Gate por plan ([[project_feature_gating]]).

---

## Comanda abierta / mesas de bar (Nivel 2) (2026-06-15)

Mesa/tab de visitante que acumula consumos y se paga junta al cerrar, con historial. En la tab **Ventas**.
- **Schema:** modelo `Comanda` (etiqueta libre, estado abierta|cerrada, closedAt) + `Cargo.comandaId` (relación, onDelete SetNull) + `Club.comandas`. `db push` aplicado (local).
- **Backend `routes/comandas.js`:** `GET /comandas?estado=abierta|cerrada`, `POST /` (abrir), `POST /:id/items` (agregar, cargos pendientes), `DELETE /:id/items/:cargoId` (quitar), `POST /:id/cerrar` (cobra todo con método → cargos pagado + comanda cerrada → entra a Caja), `DELETE /:id` (descartar mesa sin cobrar). Registrado en app.js.
- **Aislamiento:** los cargos de comanda (`comandaId != null`) se EXCLUYEN de Cobranzas/resumen (`comandaId: null` en cargos.js GET/resumen/cobranzas) — una mesa abierta no es deuda de nadie. Caja sí cuenta los pagados al cerrar.
- **Frontend `features/pagos/VentasTab.jsx`:** mesas abiertas en tarjetas (etiqueta, total, hace cuánto), Nueva mesa (etiqueta libre), `ModalMesa` (ticket: agregar/quitar ítems, total, **dividir entre N** con stepper sin tope que muestra $/persona redondeado, método, Cobrar y cerrar, descartar). Historial de cerradas colapsable.
- En Ventas conviven: **Nueva venta** (header, un tiro: mostrador/jugador) y **Mesas** (tab abierto).

### Próximo: Reportes de finanzas (A+B+C+D)
- **A** categorías de productos (Bebidas/Comidas/Golosinas/Insumos/Otros) en catálogo + agrupar en POS.
- **B** capturar categoría (snapshot) en cada cargo de producto (un cargo por ítem) → habilita reporting.
- **C** hub de reportes en "Caja / Reportes" (período día/sem/mes): ventas por categoría, top productos, por método, por tipo, egresos, neto.
- **D** margen: `Producto.costo` → ganancia/margen por categoría.

---

## Reorganización IA de Pagos — 4 tabs + buscador (2026-06-15)

Pagos pasó a **4 tabs** para separar actividades (antes era "un bollo"). Criterio: **vender = acción** (Ventas), **deuda = estado** (Cobranzas).
- **Ventas (POS)** [default] — vender productos: a visitante (mostrador, contado) o a jugador (a cuenta/cobrado). Botón "Nueva venta". Acá vivirá la comanda abierta.
- **Cobranzas** — solo deudas: lista + cobrar. Botón "Cobrar cuenta".
- **Gastos** · **Caja del día** — igual.
- `ModalCuentaJugador` ahora tiene prop `modo` ('venta' | 'cobro'): venta muestra toggle Jugador/Mostrador + productos; cobro muestra deudas del jugador. Mismo componente, secciones gateadas. Fix: en venta no se traen/cobran las deudas del jugador (efecto fetchDeudas solo en cobro).
- **`JugadorPicker`** (reemplaza el `<select>` feo): en cobro muestra la **lista de deudores con avatar + total + nº deudas** (de entrada, buscable por nombre/DNI); en venta autocompleta sobre todos los jugadores. `deudores` se computa en PagosPage agrupando `deudas` pendientes por jugador. `AvatarJ` (iniciales + color por hash).

### Próximo: Comanda abierta (Nivel 2)
Mesa/tab de visitante que acumula ítems y se paga junta al cerrar, con historial. Modelo `Comanda` + `Cargo.comandaId`. Vive en la tab **Ventas** ("Mesas abiertas" + "Nueva mesa").

---

## Venta de mostrador / casual (Nivel 1) (2026-06-15)

- Venta a un **visitante sin ficha**, al contado. Backend: `/productos/venta` y `/cargos` aceptan `jugadorId: null` (rechazan "a cuenta" sin jugador → contado obligatorio). En Cobranzas figura como "Mostrador".
- Frontend: en `ModalCuentaJugador` se agregó toggle **Jugador / Mostrador** (prop `initialMostrador`). Botón único del header **"Cobrar / Vender"** (se descartó un 2º botón "Venta rápida" por redundancia — abría el mismo modal). El modo mostrador oculta deudas y "anotar a cuenta" (solo Cobrar).
- **PENDIENTE (próximo bloque):** (1) **Reorganización IA de Pagos** — el usuario siente que está todo junto ("un bollo"); separar POS/ventas de Cobranzas (ver análisis abajo / decisión a tomar). (2) **Comanda abierta Nivel 2** — mesa/tab de visitante que acumula ítems (gaseosa → comida) y se paga junta al cerrar, con historial. Requiere modelo `Comanda` + `Cargo.comandaId`. Vive en la sección de ventas/bar.

---

## Anular/editar cobro + ticket por turno (2026-06-15)

Corrección de cobros y gestión de la cuenta del turno desde un solo lugar (sin sección nueva). Regla acordada: corregir es **solo del momento/hoy** ("no viene un cliente días pasados a decir che me cobraste mal").

### Anular / cambiar método en Cobranzas (PagosPage)
- Pestaña **Pagados**: cada cobro tiene 🔄 **Anular** (`ModalAnular` confirma → vuelve a pendiente, sale de caja; backend `PATCH /cargos/:id/estado {estado:'pendiente'}` o `/reservas/:id/pago {pagado:false}`) + **cambiar método** (clic en el badge → `ModalCobro` con `titulo="Cambiar método"`). Estados `anulando`/`cambiandoMetodo`, funciones `anular()`/`cambiarMetodo()`.
- Cubre todos los cargos (consumos, productos, porciones de split, torneos, manuales). Un turno pagado en **simple** no figura en Cobranzas → se corrige desde la grilla ("Marcar impago").
- **Fix grilla cortada:** la fila pagada tenía ancho fijo `w-[180px]` que con el botón Anular desbordaba y tapaba el monto → monto `w-20 text-right`, acciones de ancho automático.

### Ticket por turno accionable (CheckoutTurno)
- El bloque **"Ya en la cuenta"** dejó de ser read-only: `cuenta` en estado LOCAL (init de `reserva.cargosCuenta`), los totales (pagado/aCuenta/saldo) se derivan de ahí y se recalculan **en vivo**.
- `TicketLinea` por línea: pagada → **Anular** + cambiar método (selector inline); a cuenta → **Cobrar** (selector método inline) + **Quitar** (delete cargo). Handlers `anularLinea`/`cobrarLinea`/`eliminarLineaTicket` (optimistas + `PATCH/DELETE /cargos`).
- **Cerveza olvidada:** "Agregar consumo" funciona aunque el turno esté pagado/cerrado (suma línea nueva sin tocar lo cobrado).
- Scroll propio en "Ya en la cuenta" (`max-h-52 overflow-y-auto`, título sticky) para no romper el layout del modal. Al cerrar el checkout, la grilla refetchea (refleja correcciones).

---

## Checkout en grilla — FASE 2 (split por persona) (2026-06-15)

Cobrar un turno dividido entre varias personas, con métodos mixtos y cobro **diferido** (uno paga y se va, el resto después). Investigado vs Playtomic/MatchPoint/DeporWeb ("cuenta/ticket por turno").

### Margen de gracia para "Debe" (pre-Fase 2)
- Un turno impago no pasa a 🔴 **Debe** apenas termina: hay **60 min de gracia** (la gente consume y arregla después). Constante fija `MIN_GRACIA_COBRO=60` (no configurable; un solo lugar). Frontend `venceCobro(fecha, horaFin)` + backend `lib/deudas.js` (`turnosImpagosDeuda`) **alineados** → el badge rojo y la entrada a Cobranzas ocurren en el mismo momento.

### Modelo "Cuenta del turno"
- El turno se parte en **porciones** = cargos `tipo:'reserva'` (uno por persona, monto = precio÷N, resto al primero). Consumos = cargos `tipo:'producto'`. `reserva.cobroOmitido=true` neutraliza la reserva (no doble conteo con turnos-impagos). **Sin tabla nueva.**
- **Backend `POST /reservas/:id/cuenta`** { pagos: [{ jugadorId|null, metodoPago|null, turnoMonto, consumos[] }] } — idempotente, se llama varias veces (cobro parcial). Guard anti-sobrecobro (cubierto+nuevo ≤ precio). Casual = contado obligatorio. `GET /reservas` (admin) adjunta `cargosCuenta` (porciones+consumos, con nombre del jugador) para derivar el badge y reabrir.

### Estados de pago (fuente única `mapBackendReserva`)
- 🟢 **Pagado** = todo cobrado (entró a caja). 🔵 **En cuenta** = turno **100% repartido** pero parte/todo quedó a deber (cerrado, deuda en Cobranzas). 🟣 **Parcial** = falta registrar gente (turno **abierto**). 🟡 Pendiente / 🔴 Debe = sin tocar.
- **Decisión clave (con el usuario):** "a cuenta" **cierra** el turno (no lo deja Parcial) pero en **azul** (no verde) — el fiado no es plata en caja, la deuda queda visible. Parcial es solo "falta gente por registrar".
- `pagadoTurno` (cobrado), `aCuentaTurno` (a deber), `saldoTurno` (= precio−cobrado, para "Por cobrar"), `restanteTurno` (= precio−cobrado−aCuenta, lo asignable en el checkout).

### Pantalla `features/pagos/CheckoutTurno.jsx` (reescrita)
- Dos modos: **Uno paga todo** (rápido) y **Dividir**.
- **Dividir:** agregás personas (jugador por DNI/nombre vía `GET /jugadores/buscar`, o casual). **Auto-reparto**: al sumar/quitar/togglear jugadores el turno se re-divide solo (efecto sobre `jugadoresKey`); si editás un monto a mano, `autoSplit=false` (respeta tu edición); botón "Dividir en partes iguales" reactiva.
- **Rol Jugó/Acompañante** por persona: el turno se reparte SOLO entre los que jugaron; acompañante = $0 turno, solo consumo. Aviso suave si >4 jugadores.
- **Consumos individuales** (asignados a una persona) vs **compartidos** (`CompartidoForm`: reparte un ítem entre las personas elegidas, suma exacta).
- Cada persona: **Cobrar** (su método) o **A cuenta** (solo registrado). Aviso ámbar en modo simple "Anotar a cuenta" (se carga TODO el saldo al titular → usá Dividir si son varios).
- **Reapertura:** desglose read-only "Ya en la cuenta" (nombres + cobrado/a cuenta), resumen "Cobrado/A cuenta/falta", Personas arranca **vacío** (el titular pudo haberse ido), campo turno oculto si ya no queda por asignar. Botón del detalle: "Cobrar turno" / "Cobrar resto" (parcial) / "Agregar consumo" (pagado/en cuenta).
- Fix consistencia: "Marcar impago" solo en pago simple (`pagadoSimple`); en split-pagado dice "se corrige en Pagos".

### Próximos bloques (acordado con el usuario, por bloques)
1. **Anular/editar cobro** (solo del momento/hoy): exponer en Cobranzas pestaña Pagados un "Anular" (revierte a pendiente, ya soportado en backend `PATCH /cargos/:id/estado`) + cambiar método. **Sin** sección nueva — pulir lo existente.
2. **Ticket por turno enriquecido**: la cuenta del turno (reapertura) como ticket con líneas accionables (anular/cambiar método). No silo aparte.
3. **Comanda de mostrador (Nivel 1)**: venta a visitante sin turno, contado (`jugadorId` null). Nivel 2 (tab abierto persistente para visitante) = modelo `Comanda` nuevo, solo si hace falta.

---

## Cuenta de jugador unificada + Ayuda (2026-06-14)

- **Unificación UX:** se reemplazaron los botones "Vender" + "Cobrar cuenta" + "Nuevo cargo" por **uno solo: "Cuenta de jugador"** (confundían — dos decían "Cobrar"). Productos + Métodos de cobro se movieron a un menú **⚙️**. Header limpio: `[ⓘ] [⚙️] [Cuenta de jugador]`.
- **ModalCuentaJugador** (PagosPage): elegís jugador → ves "Lo que debe" (checks) + "Agregar consumo/cargo" (desplegable productos + opción "✏️ Otro (escribir monto)", sin pestañas) → "Anotar a cuenta" o "Cobrar". `POST /cargos` extendido para aceptar `cobrar`+`metodoPago` (cargo manual cobrable en el acto). Se eliminaron ModalCargar/ModalVenta/ModalNuevoCargo/ModalCobrarCuenta (código muerto).
- **Ayuda reutilizable:** `components/ui/AyudaPanel.jsx` (botón ⓘ → slide-over con guía + `AyudaSeccion`). Es el patrón para replicar en otras secciones y el lugar donde a futuro vive el **asistente IA** (premium, `useFeature`). + empty state de Cobranzas que enseña.

### Checkout de cobro en la grilla — FASE 1 (2026-06-14)
Cobrar el turno **desde la grilla** (no ir a Pagos). Diseño investigado vs Playtomic/MatchPoint/DeporWeb.
- **Backend:** `Cargo.jugadorId` opcional (casual/consumidor final). `POST /reservas/:id/cobrar` { jugadorId|null, metodoPago|null, cobrarTurno, consumos[] }: turno cobrado→`reserva.pagado`; turno a cuenta→**cargo explícito** tipo 'reserva' pendiente + `cobroOmitido=true` (neutraliza, evita doble conteo con turnos-impagos); si ya existía cargo pendiente del turno y se cobra→lo salda (no duplica). Consumos→cargos `tipo:'producto'` atados a `reservaId`+`jugadorId`. `GET /cargos/me` ahora incluye turnos pagados (historial en Mis pagos).
- **Frontend:** `features/pagos/CheckoutTurno.jsx` (modal: turno + consumos + pagador titular/casual + cobrar ahora/a cuenta). Botón "Cobrar turno" en el detalle (DetalleReserva), reemplaza los chips de cobro rápido (una sola vía).
- **Estados de pago auditados (fuente única `mapBackendReserva`):** `pagado` 🟢 | `en_cuenta` 🔵 (cobroOmitido) | `debe` 🔴 (confirmada+impago+vencido por horaFin) | `pendiente` 🟡. Celdas, detalle, leyenda, totales y tooltip leen de ahí. "Por cobrar" = pendiente+en_cuenta+debe. "Debe" dejó de ser estado fantasma. Turno "Debe" entra solo a Cobranzas como Vencido (turnosImpagosDeuda, sin cron).

### Pendiente del checkout
- **Fase 2:** split por persona (ítems compartidos vs individuales, métodos mixtos, varias personas).
- Venta de mostrador / consumidor final (sin turno) en Pagos.

---

---

## Módulo Finanzas — POS + Gastos + Caja (2026-06-14)

PagosPage pasó de "Cobranzas" a un hub financiero con tabs: **Cobranzas | Gastos | Caja del día**. Lente POS/ledger + Payments LATAM.

### Bloque A — POS / Productos (commit 4cdb09e)
- Modelo `Producto` (catálogo: nombre, precio Int, categoria?, activo). **Sin stock** en v1 (lista de precios).
- `/productos` CRUD. `POST /productos/venta` { jugadorId, items[], cobrar, metodoPago } → genera **UN** cargo `tipo:'producto'` (concepto compuesto "Venta: 2× Tubo, 1× Grip"). cobrar=true → pagado (caja); false → pendiente (deuda a cuenta).
- `POST /cargos/cobrar-cuenta` { jugadorId, items[{origen,refId}], metodoPago } → **checkout**: cobra turno+productos+cargos en una transacción (scopeado club+jugador+pendiente). NO reagrupa la lista plana (respeta decisión previa).
- PagosPage: modales Catálogo, Vender, Cobrar cuenta + filtro tipo "Productos". **NOTA: el checkout (Cobrar cuenta) el usuario lo va a revisar — tiene dudas, quedó para el final.**

### Bloque B — Gastos / Egresos (factura de proveedor)
- Modelo `Gasto` **OCR-ready**: `{ proveedor, concepto, monto, categoria?, fecha, metodoPago?, pagado, pagadoAt, numeroFactura?, imagenUrl?, fuente:'manual'|'ocr' }`. Los campos coinciden con lo que extraería un lector de facturas por foto → el futuro asistente IA pre-llena el mismo form (hoy fuente='manual').
- Egresos viven **aparte de los cargos** (no contaminan el libro de deudas de jugadores).
- `/gastos` CRUD + `/gastos/resumen` (gastadoMes, aPagar). Alta con "Ya pagado"(+método) o "A pagar"; foto de factura sube a Storage (uploadImage, folder 'facturas').
- Frontend: `features/pagos/GastosTab.jsx` (autocontenido: lista, alta/edición, marcar pagado, eliminar).

### Bloque C — Caja del día (arqueo)
- `GET /caja?fecha=YYYY-MM-DD` → ingresos (reservas+cargos pagados) − egresos (gastos pagados) **por método**, del día (pagadoAt en hora ARG via nuevo helper `rangoDiaArg`). Solo movimientos pagados (deudas pendientes NO son caja).
- Frontend: `features/pagos/CajaTab.jsx` (selector de día ◄►, 3 tarjetas Ingresos/Egresos/Neto, desglose por método).

### Bloque D — Recibo + Bloque E — Reporte/Export + hint
- `features/pagos/comprobantes.js` (cliente, sin deps): `imprimirRecibo(deuda, club)` (constancia interna de pago, branded), `generarReporteCobranzas(deudas, club, filtroLabel)` (reporte **PDF branded** vía print: logo+color del club, chips resumen, tabla por estado/método — respeta el filtro), `exportarCobranzasCSV` (secundario, para el contador).
- PagosPage: botón impresora 🖨️ en filas pagadas (recibo); toolbar con "Reporte" (PDF, principal) + "CSV" (secundario).
- Hint ámbar en monto de reserva nueva (ReservasPage, FormNuevaReserva): avisa si el monto difiere de `cancha.precioTurno`. Cambio quirúrgico, no se refactorizó el archivo frágil.

### Pendiente del módulo
- Checkout (Cobrar cuenta): el usuario lo va a revisar (tiene dudas).

---

## Integridad deudas de inscripción + fix UX (2026-06-13 · tarde)

Auditoría con lente de integridad de ledger sobre el agregado Pareja+Cargo. **Invariante:** una deuda pendiente `tipo:'torneo'` existe SII su jugador es miembro actual de una pareja `inscripto` de un torneo que cobra; los **pagados** nunca se borran (ingreso real).

### Reconciliador de deudas (`sincronizarDeudaInscripcion` reescrito)
- Antes solo **agregaba**; ahora **reconcilia**: borra pendientes de ex-miembros (cambio de compañero), agrega faltantes, limpia todas si la pareja no está `inscripto`. La remoción se basa en miembros actuales (`jugador1Id/jugador2Id`), nunca en `guardar_cupo` (no borra la deuda legítima del compañero aún no cargado).
- **Índice único** `@@unique([parejaId, jugadorId, tipo])` + `upsert` → mata el doble cobro por doble-submit a nivel DB. (parejaId null en manual/cancelación → NULLs distintos en PG, no chocan).
- Llamado en **todos** los caminos: admin POST/PATCH/DELETE, jugador POST/PATCH/DELETE, y las 3 promociones de espera. Antes faltaba en jugador PATCH (no sincronizaba) y jugador DELETE (no limpiaba ni promovía deuda).
- Fix `sinCompanero=true` → nullea `jugador2Id/jugador2Dni` (admin + jugador).

### Fix UX — commit timing (ModalInscripcion, PlayerTournamentsPage)
- **Bug:** la pantalla "¡Cambios guardados!" se mostraba ANTES de guardar; el guardado real estaba atado al botón "Listo". Cerrar por el fondo/X se saltaba el guardado.
- **Fix (Opción A):** el submit guarda de verdad (await API) y recién después muestra la pantalla de éxito; "Listo"/X/fondo solo cierran. Guard de doble-submit (`submitting`). Los handlers del padre devuelven `{ok, vaAEspera}` y ya no cierran el modal.
- **Auditoría:** el anti-patrón estaba aislado en este modal. El resto (PlayerReservasPage, PlayerProfilePage, ModalCancelar, modales admin de TorneoDetallePage) commitea en la acción correctamente.

### Validado (matriz de prueba)
B1/B2 (cambio compañero), C1 (sin compañero), D1/D2 (bajas), F1 (doble cobro), G1 (inmutabilidad del pagado) — todos OK en admin y jugador.

### Decisiones cerradas
- **I1** — precio del torneo NO retroactivo: ya era el comportamiento (upsert `update:{}` no toca deudas existentes; solo las nuevas usan el precio nuevo). Sin código.
- **I2** — baja/eliminación de jugador bloqueada por deuda: ya estaba para cargos; se **extendió** para incluir turnos impagos. Nuevo `lib/deudas.js` con `turnosImpagosDeuda` (compartido entre `cargos.js` y `jugadores.js`); helper `contarDeudaPendiente` (cargos + turnos). "Deuda" significa lo mismo en Cobranzas y en el bloqueo de baja.

---

## Dev local + Inscripciones a torneo (2026-06-13)

### Infra: testing en Postgres local (Supabase pausado)
- Para ahorrar egress en etapa de testing, el dev corre en **Postgres local** (`localhost:5432`, base `postgres`). El `.env` del backend tiene las líneas del cloud comentadas y las locales activas.
- Proyecto Supabase **PadelOSwlArk pausado** (2026-06-13, reanudable <90d, ~11 sep). Se liberó egress para el otro proyecto (AgrowlAR, con clientes).
- Data del cloud copiada a local con `backend/scripts/copiar-cloud-a-local.mjs` (lee la URL del cloud desde la línea comentada del `.env`, copia todas las tablas con los mismos IDs). Local y cloud son **bases separadas, sin sync**. Deploy = descomentar `.env` + `db push`.

### Inscripciones a torneo → deuda (2 modos, por torneo)
- `Torneo.modoInscripcion` ('abierta' | 'guardar_cupo'), default 'abierta'. **Decisión por torneo** (antes era config del club → se movió; `modoInscripcionTorneo` del clubStore eliminado).
- **Abierta**: al inscribir, deuda a ambos jugadores. **Guardar cupo**: al inscribir, deuda solo al que reserva; la del compañero se genera al cargarlo.
- Hoy (Fase 0, sin MP) los dos modos son casi idénticos: solo cambia *cuándo* se genera la deuda del compañero. El flujo de **pago obligatorio al inscribirse** (dash jugador, "tenés que pagar para reservar el cupo") es **Fase 2 / Mercado Pago** — ahí el modo "Guardar cupo" cobra sentido real.
- `precioInscripcion` ahora **obligatorio (>0)**, validado en front (form + submit) y back (POST y PATCH).
- Helper `sincronizarDeudaInscripcion` (idempotente, no duplica; espera/suplente sin deuda). Cargos `tipo:'torneo'`, caen en Cobranzas con filtro "Torneos".
- **Fix**: borrar un torneo ahora limpia las deudas de inscripción **pendientes** de sus parejas (antes quedaban huérfanas porque `Cargo.parejaId` es String sin FK). Las pagadas quedan como ingreso.
- **Fix latente**: `mapBackendTorneo` no traía `precioInscripcion` → al editar no se pre-cargaba. Ahora trae precio + modo.

### Filtros en Pagos
- PagosPage: filtro por **tipo** (Torneos/Reservas/Manuales/etc.) además de estado y método.

### Archivos
- Schema: `Torneo.modoInscripcion`. Tocados: `backend/src/routes/torneos.js`, `frontend/src/pages/TorneosPage.jsx`, `frontend/src/pages/PagosPage.jsx`, `frontend/src/store/clubStore.js`. Nuevo: `backend/scripts/copiar-cloud-a-local.mjs`.

---

## Gap turnos impagos + Eliminar turno (2026-06-12 · noche)

- **Turnos impagos como deuda** en cobranzas (Approach B: unión calculada, sin tabla/cron). Turno = deuda si confirmado + impago + no omitido + precio>0 + ya terminó (hora ARG).
- Helper `turnosImpagosDeuda` + `cargoADeuda` reutilizables. `GET /cargos/cobranzas?jugadorId?` ({deudas, resumen}) usado por PagosPage + drawer. `GET /cargos/me` unificado (jugador ve turnos).
- Coherente en 3 lugares: Pagos admin, Mis pagos jugador, mini-saldo drawer.
- **Eliminar turno** = campo `Reserva.cobroOmitido` (no borra la reserva). `PATCH /reservas/:id/cobro-omitido`. Sale de cobranzas, no es ingreso, queda en historial.

### Pendiente (propuesto, ver memoria project_pagos_fase0): filtros (método/turnos), insumos/productos vendibles, inscripciones a torneo → cargo.

---

## Auditoría de Pagos + fixes (2026-06-12 · noche)

Auditoría completa de la sección. 4 fixes aplicados:
- **#1** Cargo de cancelación: setea `tipo:'cancelacion'` (antes 'manual') + no crea cargos de $0.
- **#2 Timezone**: `backend/src/lib/tiempo.js` (helpers ARG UTC-3). Dashboard (ingresos día/mes, reservas hoy, ocupación) y `/cargos/resumen` usan hora argentina, no UTC del server (Railway). Antes contaban mal cerca de medianoche.
- **#4 Validación**: `backend/src/lib/metodosPago.js` (normalizarMetodo). cargos + reservas/pago validan método contra catálogo.
- **#5 Desacople**: `clubStore.saveConfig` guarda solo config (sin re-PATCHear canchas). PagosPage lo usa para métodos.

**#3 RESUELTO:** dinero pasó de `Float` a `Int` (pesos enteros) en Reserva.precio, TurnoFijo.precio, Cargo.monto — alineados con Cancha.precioTurno (ya Int). Int PESOS, no centavos (dominio AR usa pesos enteros; $7.500=7500, punto=miles). Migración trivial sin clubes reales. Math.round() en los writes del backend. Frontend sin cambios.

---

## Último ajuste (2026-06-12 · noche) — Métodos de cobro configurables por club

Multi-tenant: cada club define qué métodos acepta. Catálogo del sistema: efectivo, transferencia, mercadopago, débito, crédito, otro (QR NO es método aparte — cae en transferencia o MP según destino).
- `lib/metodosPago.jsx` (nuevo): catálogo compartido + `MetodoBadge` (light/dark) + `metodosDelClub`. Centraliza el badge que estaba duplicado.
- `clubStore`: `metodosPago` default ['efectivo','transferencia'] (JSON config, sin schema).
- `PagosPage`: botón "Métodos de cobro" (ModalMetodos, checkboxes) → guarda en config del club. Modal de cobro muestra solo habilitados. Filtro por método (arqueo) en Pagados/Todos.
- `ReservasPage` (grilla): "Marcar pagado" abre selector de método (no asume efectivo). Si ya está pagado: corregir método o "Marcar impago". mapBackendReserva trae metodoPago. handlePago(id, metodo|null).
- `PlayerPagosPage`: usa MetodoBadge compartido (theme dark).

### Archivos
- Nuevo: `frontend/src/lib/metodosPago.jsx`
- Tocados: `store/clubStore.js`, `pages/PagosPage.jsx`, `pages/ReservasPage.jsx`, `pages/PlayerPagosPage.jsx`

---

## Último ajuste (2026-06-12 · tarde) — Cuenta de pagos por jugador

- **Jugador**: nueva sección "Mis pagos" en el sidebar del dash jugador (`PlayerPagosPage`). Solo lectura: saldo, pendientes (con vencido), historial con badge de método (efectivo/transferencia/MP, ícono+color). Ruta `/dashboardJugadores/mis-pagos`.
- **Admin drawer (Jugadores)**: se probó una sección "Cuenta" completa pero era redundante con Pagos → recortada a **mini-saldo de solo lectura** ("Debe $X" / "Al día"). Da contexto (ej: por qué se bloquea la baja).
- **Pagos (admin)**: se probó agrupar por jugador pero al usuario NO le gustó → **revertido** a la lista plana. Se agregó badge de método al lado de "Pagado".
- Componente `MetodoBadge` (íconos por método) en ambas pantallas. Candidato a compartir.

### Archivos
- Nuevos: `frontend/src/pages/PlayerPagosPage.jsx`
- Tocados: `router/index.jsx`, `layouts/PlayerLayout.jsx`, `pages/JugadoresAdminPage.jsx`, `pages/PagosPage.jsx`

---

## Último bloque completado (2026-06-12) — Módulo Pagos Fase 0+1 (cobranzas + ingresos)

Enfoque Payment PM/LATAM: máximo ROI sin gateway. Mercado Pago a futuro (seña anti-no-show).

### Modelo de datos (Bloque 1)
- `Reserva`: + `pagado`, `metodoPago`, `pagadoAt` (Opción A: pago vive en la reserva)
- `Cargo`: + `tipo`, `vencimiento`, `metodoPago`, `pagadoAt`. Mora calculada en lectura (sin cron)
- Config club: `modoCobro: 'libre'` (default; sena/total a futuro con MP)

### Backend cobranzas (Bloque 2)
- `cargos.js`: GET /me, GET / (filtros), GET /resumen (totales), POST / (cargo manual), PATCH /:id/estado (pagado con método/condonar)
- `reservas.js`: PATCH /:id/pago
- `jugadores.js`: baja/eliminar bloqueada con deuda (409 jugador_con_deuda)

### Frontend cobranzas (Bloque 3)
- `PagosPage` (era stub): vista Cobranzas — totales, filtros, marcar pagado (selector método), condonar, cargo manual

### Marcar turnos + Mis deudas (Bloque 4)
- `ReservasPage` (grilla, 2 ediciones quirúrgicas): el "marcar pagado" estaba roto (local, ignoraba backend). Ahora persiste vía PATCH /reservas/:id/pago. Método efectivo por defecto
- `PlayerDashboardPage`: widget "Tenés pagos pendientes" (solo si hay deuda)

### Dashboard admin real (Bloque 5)
- `clubs.js`: GET /me/dashboard (ingresos día/mes reales, reservas hoy, jugadores activos, canchas en uso, torneos activos, deuda, actividad)
- `AdminDashboardPage`: era 100% mock → datos reales. Cierra el 🔴 de la auditoría

### GAP conocido (a resolver)
- Cobranzas (PagosPage) solo muestra cargos, NO turnos impagos. Un turno reservado y no pagado no figura como deuda. Decisión pendiente: ¿incluir turnos impagos en Cobranzas? ¿tab "Ingresos"?

### Archivos tocados
- `backend/prisma/schema.prisma`, `backend/src/routes/{cargos,reservas,jugadores,clubs}.js`
- `frontend/src/pages/{PagosPage,ReservasPage,PlayerDashboardPage,AdminDashboardPage}.jsx`, `store/clubStore.js`

---

## Último bloque completado (2026-06-11 · tarde) — Resumen jugador + branding + limpieza data demo

### Rediseño "Mi resumen" (PlayerDashboardPage)
- Eliminado todo el mock (mockStats, mockResults, mockOpponents, winRate 34/48, "3° Categoría", tendencia hardcodeada). Violaba la regla de no-hardcoding.
- Ahora consume `usePlayerStats('todo')` (mismo endpoint que Estadísticas). Hero con categoría/winRate/mini-stats reales.
- Nueva fila "Acciones rápidas" (Reservar / Ver torneos / Mis estadísticas).
- Nueva card "Tu rendimiento" (teaser): tendencia V/D real + 3 últimos partidos con detalle + CTA a Estadísticas. Reemplaza el grid que duplicaba Estadísticas (oponentes, mejor resultado, tendencia → eliminados del resumen).
- Widget "Mis torneos": filtra `finished`, se oculta entero si no hay torneos vigentes (el CTA ya está en Acciones rápidas).

### Backend
- `/me/stats` → `partidos.ultimosPartidos[]`: últimos 5 partidos reales (rival, score por sets, torneo, fecha, W/L) desde JSON grupos/brackets.

### Branding del club en PlayerLayout
- Sidebar y header mobile mostraban "PadelOS" + ícono Zap hardcodeado. Ahora `club.logo` (img) / `club.nombre` desde clubStore, fallback "PadelOS". Mismo patrón que Sidebar admin.

### Limpieza de data demo
- `INITIAL_CLUB` (clubStore): vaciado contenido demo (nombre, contacto, staff, FAQ, galería Unsplash, historia, heroBadge, politicaReservas). Se conservaron defaults estructurales (colores, horarios, hero copy genérico, heroImagen, canchas). El merge `...INITIAL_CLUB, ...config` ya no filtra identidad falsa a landings de clubes sin configurar. Componentes de landing son defensivos (`if (!x?.length) return null`).
- Eliminado código muerto: `PlayerOpponentsPage.jsx` + `features/player-stats/mockData.js` (sin ruta, Oponentes vive en Estadísticas).
- Verificado: `reservasMockData`/`torneosMockData` solo exportan config (enums), no se tocan.

### Cambio de contraseña + invalidación de sesiones (tokenVersion) — RESUELTO
- `PATCH /jugadores/me/password` (bcrypt: compare actual, nueva≥8, hash). PasswordTab async real + guard doble-submit + Toast éxito/error. Corregido aviso falso de cierre de sesiones.
- `tokenVersion Int @default(0)` en Jugador. Login + signTokens incluyen tokenVersion. `requireActive` compara y devuelve `sesion_expirada` si no coincide (invalida otras sesiones). El endpoint re-firma token para la sesión actual (no se echa a sí mismo). `playerStore.setToken` + `api.js` maneja sesion_expirada.
- Toast: se reutilizó `components/ui/Toast.jsx` (no inventar otro). Anotada deuda: unificar las 3-4 variantes de toast → `project_toast_unificar`.
- **Drift de DB destapado y corregido:** modelo Torneo tenía 3 columnas (fechaInicioEliminatoria/fechaInicioQF/horaInicioQF) en schema pero no en DB. Causa: conexión zombie idle-in-transaction (~4 días) bloqueaba `torneos` → todo db push fallaba por lock timeout. Terminada con pg_terminate_backend + ALTER directo. DB ahora 100% en sync. Ver `project_cambio_password_tokenversion`.

### Pendientes señalados (en memoria, NO resueltos)
- `canchas` default en INITIAL_CLUB: fuga menor (club sin canchas mostraría 4 demo). No tocado por archivos frágiles. Ver `project_pendientes_resumen_jugador`.
- Club demo seed post-MVP. Ver `project_club_demo_seed`.
- Unificar toasts (ToastProvider + useToast). Ver `project_toast_unificar`.

### Archivos tocados
- `frontend/src/pages/PlayerDashboardPage.jsx`, `frontend/src/layouts/PlayerLayout.jsx`, `frontend/src/store/clubStore.js`
- `backend/src/routes/jugadores.js` (ultimosPartidos)
- Eliminados: `frontend/src/pages/PlayerOpponentsPage.jsx`, `frontend/src/features/player-stats/mockData.js`

---

## Último bloque completado (2026-06-11) — Estadísticas: auditoría + mejoras + features futuras

### Auditoría + 8 mejoras (backend `/me/stats` + PlayerStatsPage)
- Fix `fechaHasta` para filtro de año (`lte`), antes solo `gte`
- `proximaReserva` (findFirst confirmada futura) → card en Tab Resumen
- `canceladas` total + banner de tasa de cancelación en Tab Reservas
- `partidosJugados`+`partidosGanados` por torneo en historial
- `topCompaneros` (top-3, antes solo el primero)
- Sets ganados/perdidos ahora se muestran (ratio con barra) en Tab Torneos
- Área de canceladas en el AreaChart mensual (línea punteada roja)
- Subtítulo dinámico del chart por período; fechas formateadas (formatFechaMes/Full, sin bug timezone)

### Bloque A — Evolución de winRate
- Cada resultado lleva `torneoId/torneoNombre/fecha`. Nueva serie `evolucionWinRate[]` (acumulado + por torneo)
- `LineChart` en Tab Torneos: línea verde acumulada + gris por torneo + ReferenceLine 50% + delta en header

### Bloque B — Logros / badges
- `logros[]` (8 insignias) + `logrosDesbloqueados`, calculado en `/me/stats` sin queries nuevas
- `LogrosGrid` en Tab Resumen: desbloqueados a color, bloqueados con barra de progreso. Respeta filtro de período

### Bloque C — Comparativa con el club
- `comparativaClub`: mapa dni→{g,p} en memoria sobre todos los torneos del club (sin queries extra), mín. 5 partidos para rankear
- Card "Tu lugar en el club" en Tab Resumen: Top X%, posición, 3 barras (vos/promedio/mejor), mensaje contextual. Caso `ranked:false` si no llega al mínimo

### Tooltips selectivos
- Componente `InfoTooltip` (CSS puro, HelpCircle) en 4 secciones con reglas no obvias: Comparativa club, Logros, Evolución winRate, Listo para ascender

### Archivos tocados
- `backend/src/routes/jugadores.js` (`/me/stats` ampliado)
- `frontend/src/pages/PlayerStatsPage.jsx` (todo lo anterior)

### Pendiente / futuro
- Comparativa club por **misma categoría** (hoy es club-wide)
- Cámaras IA / computer vision → ver memoria `project_camaras_ia_vision`
- Responsive mobile de PlayerStatsPage

---

## Último bloque completado (2026-06-09 · sesión 2) — Estadísticas: trayectoria + período + admin drawer

### Qué se hizo

**Tab Torneos — Trayectoria de categoría:**
- Nueva sección con tarjetas por cada categoría jugada: torneos, winRate (barra de color), títulos (íconos Trophy), categoría actual destacada con borde verde
- Banner ámbar "Listo para ascender" si `sugerenciaAscenso === true` (≥2 títulos o winRate≥75% en ≥3 torneos en esa categoría)

**Filtro de período (3 botones en header):**
- Botones `Últimos 12M / 2026 / Todo` — re-fetchea al cambiar
- Backend `/me/stats?periodo=12m|2026|todo` filtra reservas y torneos por fecha. Gráfico porMes adapta los 12 meses según período

**Badge "↑ Subir" en admin JugadoresAdminPage:**
- Llama a `GET /jugadores/ascenso-sugeridos` al montar y muestra badge ámbar en la lista para jugadores que cumplen criterio

**Mini-stats en DrawerJugador (al hacer click en un jugador):**
- Fetch automático a `GET /api/jugadores/:id/stats` al abrir el drawer
- 4 chips: Torneos / Títulos (clickable) / Win % / Horas
- Chip Títulos expande panel con detalle de campeonatos: torneo, categoría, fecha, rival en la final
- Bug corregido: `jugador1`/`jugador2` en Pareja son strings escalares — select con subfields causaba 500 silencioso

**Nuevo endpoint admin `GET /api/jugadores/:id/stats`:**
- Retorna: torneos, titulos, titulosDetalle[], partidos{total/ganados/perdidos/winRate}, reservas{total/horasTotales}, ultimaReserva, categoria

### Archivos tocados
- `backend/src/routes/jugadores.js` (filtro período en `/me/stats` + nuevo `/:id/stats` admin)
- `frontend/src/features/player-stats/usePlayerStats.js` (acepta `periodo` param)
- `frontend/src/pages/PlayerStatsPage.jsx` (selector 3 botones + TabTorneos trayectoria + banner ascenso)
- `frontend/src/pages/JugadoresAdminPage.jsx` (badge ascenso lista + mini-stats drawer con títulos expandibles)
- `flujo-prueba-torneos.html` (5 nuevos checkitems)

---

## Último bloque completado (2026-06-09 · sesión 1) — Estadísticas jugador completas (4 tabs reales)

### Qué se hizo
- **Backend `/me/stats`**: día favorito, distribución días/franja, horas totales, compañero frecuente, racha máxima, grupos vs eliminatoria, historial con resultado. Datos reales desde JSON `grupos`/`brackets`.
- **`GET /me/oponentes`**: rivales reales con W/L/%, tag favorable/rival/parejo, radar top rival
- **`PlayerStatsPage`** 4 tabs: Resumen (mini-cards, círculos V/D) · Torneos (rendimiento por cat, barras fases, historial) · Reservas (AreaChart, distribución días/franja) · Oponentes (lazy, buscador, RadarChart)
- Oponentes eliminado del sidebar y router — vive dentro de Estadísticas

### Archivos tocados
- `backend/src/routes/jugadores.js`, `frontend/src/features/player-stats/usePlayerStats.js`
- `frontend/src/pages/PlayerStatsPage.jsx`, `PlayerLayout.jsx`, `router/index.jsx`

---

## Último bloque completado (2026-06-09 · tarde) — Vista pública de torneos (campeón/subcampeón + listado /torneos)

### 1. Campeón y subcampeón destacados
- **Página pública (Resumen)**: `TorneoPublicoPage` muestra, debajo de la info, sección "TORNEO FINALIZADO" con tarjetas Campeones (oro) + resultado de la final en casilleros + Subcampeones (plata), una fila por categoría. Badge "FINALIZADO" dorado en el header.
- **Draw (`BracketView`)**: panel a la derecha de la Final con copa (campeón, aro con glow pulsante) + medalla (subcampeón). En los 6 templates, con el color de acento de cada uno. Se quitó la franja "Campeones" superior (redundante).

### 2. Listado público de torneos `/torneos` (`TorneosPublicosPage` — NUEVO)
- Página dedicada con header (logo club + volver) y `TorneosSection` con **tabs de filtro**: Todos / Abiertos / En curso / Finalizados (solo las que tienen contenido).
- **Finalizados**: cards permanentes con imagen/flyer, badge "FINALIZADO", fecha, categoría y 🏆 campeón. Card → `/torneos/:id`.
- Navbar público "Torneos" ahora navega a `/torneos` (Link SPA). Ruta `/torneos` registrada antes de `/torneos/:id`.

### 3. Landing principal — hero "en curso" solo durante el torneo
- `TorneosSection` ganó modo `soloEnCurso`: en las 5 templates renderiza SOLO el hero del torneo en curso (sin tabs/abiertos/finalizados). Reusa los `templateEnCurso`.
- Se muestra solo en `in_progress`; al finalizar desaparece de la home. "Seguir el torneo" → `/torneos/:id`.
- Se sacó la `TorneosSection` completa del scroll de la landing (ya no estaba el listado embebido).

### 4. Visibilidad e info post-finalización
- **Sin gate de 3 días**: los torneos `finished` quedan accesibles siempre en `/torneos/:id` (se descubren por la sección Finalizados).
- **Admin**: `gruposConfirmados` ahora incluye `finished` → tabs Grupos y Fixture/Cuadro siguen mostrando zonas/resultados/bracket tras finalizar (base para estadísticas).
- **Lista admin de torneos**: la fila de finalizados es clickeable completa (se quitó el botón "Ver detalle", quedó chevron).

### Archivos tocados
- `TorneoPublicoPage.jsx` (campeón/subcampeón en Resumen, sin gate días), `BracketView.jsx` (panel campeón+medalla, sin franja superior), `LandingSections.jsx` (tabs + finalizados + `soloEnCurso`), `TorneosPublicosPage.jsx` (nuevo), `LandingPage.jsx` (`mapTorneoLanding` exportado + brackets), `router/index.jsx` (ruta `/torneos`), `PublicNavbar.jsx` (Link a `/torneos`), `Template1-5.jsx` (hero soloEnCurso + nav onTorneos), `TorneosPage.jsx` (fila clickeable).

### ⏳ Pendientes (heredados, siguen abiertos)
- Hacer configurable desde admin la visibilidad post-torneo (hoy: siempre visible).
- Railway: env vars Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) + correr migración si prod difiere.
- Rotar la `service_role` key (se compartió en chat).
- Bajar body limit global de 8mb a ~2mb una vez confirmado todo por Storage.

---

## Último bloque completado (2026-06-09) — Imágenes a Storage + Championship Gold + visibilidad torneo finalizado

### 1. Fix de egress: imágenes a Supabase Storage (no más base64 en DB)

**Problema raíz:** todas las imágenes (logos club/sponsor, flyer, fondos draw/bracket, galería, staff) se guardaban como **base64 dentro de la DB** (columnas JSON `config`, `personalizacion`, y `sponsors.logoUrl`). Cada visita a landing/torneos re-descargaba todo → reventó la cuota de egress (5GB) del Free Plan de Supabase.

**Solución (corrección completa):**
- Backend:
  - `src/lib/supabase.js` — cliente Storage (service_role, bucket `media`).
  - `src/lib/imageUpload.js` — `sharp` redimensiona+comprime a **webp** (perfiles: logo/avatar 400px, flyer 1080px, fondo 1920px, galeria 1600px) y sube → devuelve URL pública.
  - `POST /api/uploads` (requireAuth) — recibe data URL, devuelve `{ url }`. Parser propio de 15mb montado antes del global (bajado a 8mb).
  - `scripts/migrate-images-to-storage.js` — migración única del base64 existente (tiene `--dry`).
- Frontend:
  - Helper `uploadImage(file, { profile, folder, token })` + `fileToDataUrl` en `lib/api.js`.
  - Migrados todos los `readAsDataURL` que persistían: `AdminSponsorsPage` (LogoPicker), `TorneoDetallePage` (ImagenFileInput — lee token del store), `QuienesSomosPage` (5 handlers: logo/hero/historia/galería/staff).
  - El avatar de registro (Step1Basicos) es solo preview, NO se persiste → sin cambios.
- **Migración ya corrida**: 9 imágenes, 1.09 MB base64 → 0.13 MB en Storage (−88%). DB sin base64.
- Dep nueva: `sharp` en backend.

**Setup hecho:** bucket `media` (público) creado, env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en `.env` local.

### 2. Template Championship Gold rediseñado ("placa de honor grabada")
- `cardLayout: 'gold'`, `headerLayout: 'gold'`, `roundLabelStyle: 'gold'` en BracketThemes + BracketView.
- Negro carbón + oro nítido. Seed en placa metálica (highlight→acento), nombre Cinzel, sets en casilleros, esquinas grabadas tipo marco, Final con borde más grueso. Header con medallón doble anillo + filete ❧ + título con brillo metálico (background-clip).
- Quitado watermark "ARENA" del Neon Arena.

### 3. Visibilidad de torneo finalizado (público)
- `TorneoPublicoPage.jsx`: el gate ahora muestra torneos `finished` por **3 días** desde `updatedAt` (antes solo `in_progress`). Permite ver campeón + draw final post-torneo. `DIAS_VISIBLE_FINISHED` hardcodeado en el componente.

### ⏳ Pendientes para mañana (pulir)
- Badge "FINALIZADO" + campeón destacado arriba en la página pública (hoy el campeón solo aparece dentro del Draw).
- Hacer los 3 días de visibilidad configurables desde admin.
- Revisar el Championship Gold renderizado real y ajustar (oro, medallón, etc.).
- Agregar las env vars de Supabase en **Railway** (producción) + correr migración si la DB de prod difiere.
- Rotar la `service_role` key (se pegó en el chat).
- Bajar el body limit global de 8mb a ~2mb una vez confirmado que todo va por Storage.

---

## Bloque anterior (2026-06-08) — BracketView: templates visuales avanzados + personalización Draw

### Objetivo
Hacer que los 5 templates del bracket sean visualmente distintos (no solo color): tipografías distintas por template, nuevo layout de card "flat", header estilo broadcast para World Tour Dark, conectores SVG con color neon y glow, watermark configurable, y reorganización del tab Draw en acordeones colapsables.

### Google Fonts por template

| Template | Font | Estilo |
|----------|------|--------|
| Default | Inter | Sans-serif clásico |
| World Tour Dark | Barlow Condensed | TV broadcast, condensado, deportivo |
| Electric Blue | Exo 2 | Tech/futurista |
| Minimal Pro | DM Sans | Clean, geométrico, SaaS premium |
| Neon Arena | Chakra Petch | Cyberpunk, angular |
| Championship Gold | Cinzel | Serif clásico, elegante, élite |

Cargadas en `index.html` via Google Fonts (un solo `<link>`).

### `BracketThemes.js` — tokens nuevos

- `fontFamily` — hereda a todos los elementos via wrapper div
- `cardLayout: 'flat'` — seed badge 20×20px, rows compactos, winner dot a la derecha
- `cardBorderRadius`, `cardNameTransform`, `cardNameLetterSpacing`, `cardNameFontWeight`, `cardRowPaddingY`, `cardSeedRadius`
- `headerLayout: 'broadcast'` — header especial World Tour Dark
- `roundLabelStyle: 'boxed'` — etiquetas de ronda como pill/box
- `connGlow: true` — SVG blur glow sobre conectores
- `watermark` / `watermarkColor` — texto de fondo rotado -12deg
- `cardStyleOverride`, `cardBorderOverride`, `cardGlow`

### `BracketView.jsx` — cambios principales

**Layout `flat` (cardLayout):**
- Seed badge circular configurable (color acento, `cardSeedRadius`)
- Nombre con transform/spacing/weight propio del template
- Winner dot verde a la derecha
- Hora en row dedicado — siempre visible aunque el match esté finalizado (fix: antes se ocultaba si j1 ganó)

**Header `broadcast` (World Tour Dark):**
- Barra vertical acento izquierda + textura diagonal
- `drawTitulo` gigante (Barlow Condensed bold) como título principal
- `torneo.nombre` como subtitle en color acento
- Badge género top-right (toggle `drawMostrarGenero`)
- Pills de categorías + fechas en fila inferior

**Conectores SVG con glow:**
- `<defs><filter id="connGlow">` con `feGaussianBlur stdDeviation="2.5"` + feMerge
- Aplicado a todos los `<line>` cuando `connGlow === true`
- Color: `torneo.bracketConnColor ?? theme.connStroke`

**Watermark:**
- Texto gigante (200px) rotado -12deg, pointer-events-none
- Controlable: `bracketWatermarkOculto` oculta, `bracketWatermark` personaliza texto

### Personalización admin — Draw tab reorganizado con acordeones

**Nuevo orden (macro → micro):**
1. Diseño del bracket — siempre visible
2. **Header del draw** — acordeón (título, color, imagen, checkboxes visibilidad)
3. **Cards** — acordeón (estilo, color fondo, fuentes)
4. **Líneas y fondo** — acordeón (color líneas, glow, fondo cuadro, watermark, imagen bracket)
5. Sponsors

Patrón idéntico a Fixture: `useState(false)`, badge "personalizado" si hay campos activos, `ChevronDown` rotante.

### Campos personalizables del Draw

`bracketTemplate`, `bracketConnColor`, `bracketConnGlow`, `bracketWatermark`, `bracketWatermarkOculto`, `bracketFondoColor`, `drawMostrarGenero` — todos incluidos en `mapBackendTorneoPublico`.

### Archivos modificados
- `project/apps/frontend/index.html` — Google Fonts (6 familias)
- `project/apps/frontend/src/components/BracketThemes.js` — tokens completos
- `project/apps/frontend/src/components/BracketView.jsx` — flat layout, broadcast header, SVG glow, watermark, hora fix
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx` — Draw tab acordeones, reorganización, 3 estados nuevos
- `project/apps/frontend/src/pages/TorneoPublicoPage.jsx` — mapBackendTorneoPublico campos nuevos

### Pendiente
- Iterar template-by-template: Electric Blue, Minimal Pro, Neon Arena, Championship Gold (tokens definidos, diseño por afinar)
- World Tour Dark es el más avanzado y sirve de referencia

---

## Último bloque completado (2026-06-07 sesión 2) — Draw: bracket esqueleto + auto-asignar horarios con split de días

### Objetivo
Implementar el bracket "esqueleto" (TBD) para pre-asignar horarios del draw antes de que terminen los grupos, y reescribir el auto-asignar del draw con soporte multi-categoría, split Día1/Día2 y anti-conflicto entre categorías.

### Bug raíz identificado y corregido

**"undefined undefined" en BracketCard header:**
- Causa: `fmtFecha(fecha)` recibía `"undefined"` (string literal). La función producía `"undefined undefined"` sin validar el input.
- Fix en `BracketView.jsx`: validación de formato antes de parsear. Guards dobles en JSX.
- Causa real del bug original: `diaInicioEliminatoria` es un NOMBRE DE DÍA ("Sábado"), no una fecha ISO. El auto-asignar lo usaba como `partido.fecha`.
- **El auto-asignar del draw NUNCA había funcionado**: la validación `diaInicio.includes('-')` siempre fallaba porque "Sábado" no contiene "-".

**ModalHorario — "undefined undefined" al acceder a `.jugador1` de objetos TBD:**
- Fix: helper `parejaLabel(p)` que devuelve `p.label` si `p.tbd`, apellidos si pareja real, "—" si null.

### Bracket esqueleto (TBD)

**`torneoService.js` — 2 funciones nuevas exportadas:**
- `generateAPASkeletonBracket(grupos)`: mismo bracket APA pero con TBD `{tbd: true, label: '1° Zona A'}`. Sin BYE auto-resuelto. Retorna `{ rondas, isSkeleton: true }`.
- `mergeScheduleFromSkeleton(bracket, skeleton)`: preserva `fecha/hora/cancha` del esqueleto al convertir al bracket final real. Matchea por partido ID.

**Flujo esqueleto en TorneoDetallePage:**
- "Generar bracket preliminar": crea esqueleto + navega a Fixture.
- "Confirmar bracket" (reemplaza al botón normal cuando hay esqueleto + grupos terminados): genera bracket real + merge de horarios.
- Tab Grupos: banner ámbar cuando hay esqueleto activo.
- Tab Fixture: chip pulsante ámbar "Bracket preliminar".

**BracketView.jsx — soporte TBD:**
- `isBye`, `puedeCargar`, `estaFinalizado`: TBD-aware (TBD no activa BYE ni acciones).
- Nombre TBD en cursiva ámbar en la tarjeta. Seeds excluidos para TBD.
- Conflicto en ModalHorario: validación TBD-aware.

### Auto-asignar draw — reescritura completa

**3 campos nuevos en DB:**
| Campo | Tipo | Uso |
|-------|------|-----|
| `fechaInicioEliminatoria` | String? | Fecha real (YYYY-MM-DD) del 1er día del draw |
| `fechaInicioQF` | String? | Fecha real del día de cuartos/domingo (opcional) |
| `horaInicioQF` | String? | Hora de inicio de cuartos |

- `diaInicioEliminatoria` ("Sábado") sigue siendo el corte de disponibilidad de grupos — los nuevos campos son solo para el scheduler.
- Schema aplicado via SQL directo en Supabase SQL Editor (prisma db push se cae por statement timeout del pooler).

**Formulario crear/editar torneo — bloque "Fechas del draw":**
- Date picker "Fecha 1ª ronda (octavos / previas)". Date picker "Fecha de cuartos" (opcional). Select hora cuartos 06:00–22:00.

**`handleAutoScheduleElim` — nueva lógica:**
- Opera sobre TODOS los brackets (todas las categorías).
- Ordena categorías: menor zonas → primero (categoría más baja = slots más temprano).
- Mapa global de canchas para evitar pisadas entre categorías.
- `findSlot(dia, startMin, needed)`: primer slot con N canchas libres.
- Split Day1/Day2: rondas antes de "Cuartos de final" → `fechaInicioEliminatoria`. QF+SF+Final → `fechaInicioQF`. Si no hay QF: todo Day1.

### Cobertura del split por cantidad de zonas
- 2-3 zonas (no hay QF): todo Day1
- 4 zonas (empieza en QF): Day2 si hay `fechaInicioQF`, sino Day1
- 5-10 zonas: previas/16avos/octavos = Day1; QF+SF+Final = Day2

### Archivos modificados
- `project/apps/frontend/src/services/torneoService.js` — `generateAPASkeletonBracket`, `mergeScheduleFromSkeleton`
- `project/apps/frontend/src/components/BracketView.jsx` — fmtFecha defensivo, TBD guards y rendering
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx` — esqueleto, handleAutoScheduleElim reescrito, ModalHorario TBD, mapeo nuevos campos
- `project/apps/frontend/src/pages/TorneosPage.jsx` — form state 3 nuevos campos, UI "Fechas del draw", mapBackendTorneo
- `project/apps/backend/prisma/schema.prisma` — 3 campos nuevos en modelo Torneo
- `project/apps/backend/src/routes/torneos.js` — POST y PATCH con 3 campos nuevos

### Pendiente
- Probar el auto-asignar cuando se cree el próximo torneo (el actual ya está en curso)
- Sección Draw en TorneoPublicoPage (pendiente)

---

## Último bloque completado (2026-06-07) — Página pública torneo: tab Resumen + sistema de reprogramación + fixes

### Objetivo
Agregar tab "Resumen" informativo en la página pública del torneo (estilo 4Set Padel Club), implementar sistema de reprogramación de torneos (DB + backend + admin + público), y corregir bugs de cold-start y mapeo de datos.

### Nuevas funcionalidades

**Tab "Resumen" en TorneoPublicoPage (estilo 4Set Padel Club):**
- Nuevo tab como primero en la barra: `[ Resumen ] [ Fixture ] [ Grupos ] [ Draw ]`
- Default tab cambiado a `'resumen'`
- Layout 2 columnas en desktop (`lg:flex-row`), apilado en mobile
- **Izquierda (hero)**: card con gradiente de `accentColor`. Si hay `imagenFondoFixture` o `imagenFondoGrupos`, muestra la imagen con overlay + nombre del torneo. Sin imagen: logo del club + nombre + badge "En curso" animado + fechas
- **Derecha (sidebar)**: secciones condicionales:
  - Premios (si `premioPrimero || premioSegundo || premioSemifinal || premioExtra`)
  - Descripción (si `torneo.descripcion`)
  - Categorías como pills con `accentColor`
  - Sede: logo + nombre del club + formato/género/parejas inscriptas

**Sistema de reprogramación:**
- Campo `fechaReprogramada String?` agregado al schema Prisma + `npx prisma db push` aplicado
- Backend: `PATCH /torneos/:id/reprogramar` — solo admin, solo si pertenece al club. Acepta `fechaReprogramada: null` para quitar
- Admin — TorneosPage: ícono `Flag` en footer de `TorneoCard` (solo para `in_progress`). Click abre modal con datepicker. Botones: Confirmar / Quitar / Cancelar. Color ámbar cuando hay fecha reprogramada
- Admin — TorneoDetallePage: header muestra fecha tachada + nueva fecha en ámbar cuando hay reprogramación
- Público — TorneoPublicoPage: chip "Fin" en ámbar con nueva fecha + tachado de la original cuando hay `fechaReprogramada`. Chips con etiquetas "Inicio" / "Fin"

**Renombres en pestañas:**
- Admin TorneoDetallePage: "Fixture / Bracket" → "Fixture / Cuadro"
- Público TorneoPublicoPage: "Fixture / Cuadro" → solo "Fixture"

**Color pickers en admin (Fixture):**
- "Color por categoría" y "Fondo de card" reorganizados lado a lado (`flex gap-6 flex-wrap`)

### Bugs corregidos

**Cold-start bracket (TorneoDetallePage):**
- Causa: `useState` lazy initializer corre una vez al mount con el store vacío → `selectedBracketCat` queda en `null` y el bracket aparece vacío tras refresh directo
- Fix: `useEffect` adicional que observa `[torneo?.id, torneo?.brackets]`. Cuando el fetch async trae datos, setea `selectedBracketCat` al primer key del bracket o primera categoría

**mapBackendTorneoPublico — campos faltantes:**
- `descripcion` y `formato` son columnas top-level en Prisma (no en `personalizacion`) — no estaban mapeados
- Fix: `descripcion: data.descripcion ?? null` y `formato: data.formato ?? null` agregados
- Resultado: tab Resumen puede mostrar descripción del torneo y formato en sección Sede

### Arquitectura clarificada

Los campos `premioPrimero`, `premioSegundo`, `premioSemifinal`, `premioExtra` viven en la columna JSON `personalizacion`. `mapBackendTorneoPublico` los obtiene vía `...p` (spread de `personalizacion`). `mapBackendTorneo` en TorneosPage los extrae explícitamente con `t.personalizacion?.premioPrimero`. `updatePersonalizacion` en el store los guarda al top-level via spread. El flujo es correcto: crear torneo con premios → aparecen pre-cargados en tab Personalización del admin.

### Archivos modificados
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx` — cold-start bracket, "Fixture / Cuadro", color pickers, reprogramar header, Flag import, updateTorneoFromApi
- `project/apps/frontend/src/pages/TorneosPage.jsx` — TorneoCard reprogramar modal, Flag icon, handleReprogramar, fechaReprogramada mapping
- `project/apps/frontend/src/pages/TorneoPublicoPage.jsx` — tabs array (Resumen primero), TabResumen 2col hero+sidebar, chips Inicio/Fin, mapBackendTorneoPublico +descripcion +formato
- `project/apps/backend/prisma/schema.prisma` — `fechaReprogramada String?`
- `project/apps/backend/src/routes/torneos.js` — `PATCH /:id/reprogramar`

### Próximo en cola
- Sección Draw en TorneoPublicoPage (pendiente)

---

## Último bloque completado (2026-06-06 sesión 2) — Página pública torneo: UX, sponsors, loading, fixes visuales

### Objetivo
Mejorar la experiencia visual de la página pública de torneo: pantalla de carga profesional, fix de flash de template, sponsors con eliminación de fondo IA, rediseño SponsorStrip, y corrección de z-index del header sticky.

### Fixes y features implementados

**Fix 401 en endpoints de sponsors:**
- `AdminSponsorsPage`: `api.js` no inyecta tokens automáticamente. Fix: leer `useAuthStore` y pasar `Authorization: Bearer` en todas las llamadas (`GET /sponsors`, `POST /sponsors`, `DELETE /sponsors/:id`).
- `TorneoDetallePage`: modal de sponsors también hacía `GET /sponsors` sin token. Fix: mismo patrón.

**Fix cold-start persona (templateFixture se reseteaba a 1):**
- Causa raíz: `useState` inicializa desde el store vacío en navegación directa a la URL → `templateFixture: 1` overrideaba el valor guardado en DB.
- Fix: `_personaSyncedRef = useRef(!!torneos.find(...))` + `useEffect` que sincroniza `persona` desde el torneo cuando aparece en el store por primera vez (una sola vez vía ref).

**LogoPicker — dos modos de carga:**
- Botón "Quitar fondo" (`Sparkles`) → `@imgly/background-removal` WASM, elimina el fondo con IA, convierte a base64.
- Botón "Tal cual" (`Upload`) → FileReader directo, sube sin modificar.
- Dos `<input type="file">` separados con refs (`refBg`, `refRaw`).
- Tooltips con `relative group` + `group-hover:block` sobre cada botón.
- Badge verde "Fondo eliminado automáticamente" cuando IA procesó exitosamente.

**SponsorStrip rediseñado — estilo FIP World Cup:**
- Sin título, sin card oscura. Banda horizontal con `bg: #f0f0ee` (beige claro) y `borderTop: 3px accentColor`.
- Logos `h-12` (más grandes), `max-w-[140px]`, `hover:opacity-70`.
- Visible sobre cualquier fondo oscuro o claro del template.

**Eliminación de watermark de fondo en Fixture:**
- Admin: removido el bloque "Watermark de fondo" de la sección Fixture en `TorneoDetallePage`.
- Público: eliminado el `<img>` de watermark en `TabFixture` (campo `imagenWatermarkFixture` sigue en DB, solo se ocultó de UI).

**Fix z-index sticky header:**
- El header sticky tenía `z-10` que cedía ante cards con `z-10` más abajo en el DOM al hacer scroll.
- Fix: `z-10` → `z-30` en el sticky header de `TorneoPublicoPage`.

**Pantalla de carga profesional (estética broadcast deportivo):**
- Reemplaza el spinner simple. Animaciones CSS inline con `<style>` en el return:
  - `scanLine`: línea de escaneo vertical que recorre la pantalla
  - `cornerPulse`: 4 esquinas con brackets que pulsan
  - `tplGlitch`: texto con efecto glitch intermitente
  - `tplFillBar`: barra de progreso que se llena
  - `tplSlideUp`: nombre del torneo aparece desde abajo
- Fondo `bg-[#0d1117]` con grid de puntos. Muestra el nombre del torneo (desde cache del store si disponible).
- `pageFadeIn` en el contenedor principal (fade-in + slide-up 0.3s al mostrar la página).

**Fix flash de template (primera carga y botón atrás del navegador):**
- Fix 1: `useState(true)` → loading screen desde el primer render (evita render con store vacío).
- Fix 2: doble `requestAnimationFrame` antes de `setLoading(false)` → espera que Zustand propague el store y React pinte un frame con datos correctos ANTES de ocultar el loading. Resuelve el race condition entre Zustand y React useState en contextos async.

### Archivos modificados
- `project/apps/frontend/src/pages/AdminSponsorsPage.jsx` — auth headers, LogoPicker dual upload + tooltips
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx` — auth sponsor modal, cold-start persona sync, sin watermark fixture UI
- `project/apps/frontend/src/pages/TorneoPublicoPage.jsx` — SponsorStrip FIP, sin watermark fixture, z-30 header, loading profesional, pageFadeIn, useState(true), double rAF fix
- `project/apps/backend/src/routes/sponsors.js` — `logoUrl` opcional (sin 400 si no viene)

---

## Último bloque completado (2026-06-06) — TabGrupos: rediseño de tabla + watermark + mejoras visuales

### Objetivo
Mejorar la sección Grupos de la página pública de torneo: tabla informativa completa, watermark configurable por torneo, popover de criterio, header siempre visible.

### Cambios en `TorneoPublicoPage.jsx`

**Tabla de posiciones completa (igual que admin):**
- Columnas: `Pos. | Pareja | Pts | PG | PP | Dif.S | Dif.G | Crit.`
- Cálculo completo: `pts, pj, wins, losses, setsA, setsC, gamesA, gamesC`
- Ordenamiento: pts → dif. sets → dif. games
- Prop `puntosPorVictoria` (default 2) pasada desde el torneo
- Fix alineación: `thCls` sin `text-left`, solo Pos. y Pareja lo tienen explícito

**Popover de criterio al hacer click en badge Crit.:**
- Estado `openCrit = { key, text, rect }` — atomic, evita stale closure
- `getExplicacion(i)` — mismo texto que el admin ("X tiene N pts · esta pareja tiene M pts.")
- Popover adapta colores a modo claro/oscuro del template
- Click fuera cierra el popover

**Header "GRUPOS" siempre visible (con o sin imagen):**
- Con imagen: foto + overlay negro (igual que antes)
- Sin imagen: fondo sutil con color de acento del template + línea vertical decorativa
- Mismo patrón aplicado a "Fixture del día" en TabFixture

**Watermark configurable por torneo:**
- Nuevo campo `imagenWatermarkGrupos` en torneo
- Renderizado como `absolute inset-0 object-cover` dentro de la zona card
- `opacity: 0.08` + `brightness(2)` en modo oscuro para mantener colores
- `pointer-events: none` — no interfiere con clicks
- Zona card ahora tiene `relative` para que el absolute tome el contenedor correcto (fix puntas que salían afuera del border-radius)

**Tamaño scores en partidos:** de `text-[10px]` a `text-[12px]` para mejor legibilidad

**Fix duplicados en landing (sesión anterior):**
- `upsertTorneoFromApi` en torneosStore — atomic add-or-update dentro de `set()` para evitar stale closure
- Reemplazó el check `existe ? updateTorneoFromApi : addTorneoFromApi` que usaba closure stale

### Cambios en `TorneoDetallePage.jsx`

**Admin — campo watermark:**
- `imagenWatermarkGrupos` + `imagenWatermarkFixture` en `persona` inicial y en save `campos`
- UI: input en sección "Imágenes — Grupos" y "Imágenes — Fixture" con `ImageZonePreview` + `ImagenFileInput`
- Hint: "Logo o imagen vectorizada al fondo de las cards de zona. Recomendado: PNG transparente."

### Archivos modificados
- `project/apps/frontend/src/pages/TorneoPublicoPage.jsx`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`
- `project/apps/frontend/src/store/torneosStore.js`

---

## Último bloque completado (2026-06-05) — Grupos: diseño independiente + herencia de colores de fixture

### Objetivo
Separar el diseño visual de la sección Grupos del fixture para poder iterarlo independientemente, manteniendo herencia de colores del template seleccionado.

### Cambios en `TorneoPublicoPage.jsx`

**TabGrupos vuelve a diseño propio:**
- Eliminado el bloque `if (templateFixture > 1)` que delegaba al renderer del fixture (`makePartidoCard`)
- TabGrupos usa siempre su diseño propio: tarjeta compacta con footer mostrando slot/horario + "P{n} ganó"
- `makePartidoCard` (función module-level) queda en el archivo como referencia para futuro rediseño de grupos

**Herencia de colores del template:**
- Ya existía: `TPL_BG[templateFixture]` → fondo oscuro/claro correcto según template
- Nuevo: `TPL_ACCENT` map con el color de acento natural de cada template:
  ```js
  { 6:'#000000', 7:'#D4AF37', 8:'#C9A84C', 10:'#22C55E', 12:'#E8002D', 13:'#2563EB', 14:'#F59E0B' }
  ```
- `tClrScoreW = colorTextoScore || TPL_ACCENT[templateFixture] || accentColor`
- Templates 1, 2, 3, 9, 11: sin acento propio → usan `accentColor` del club (correcto)
- Templates con override manual (`colorTextoScore`) mantienen prioridad

### Cambios en `TorneoDetallePage.jsx`

**Pill "Hereda" en collapsible "Personalizar colores — Grupos":**
- Siempre visible en el header del collapsible (cerrado o abierto)
- Muestra el nombre del template activo: `Hereda: Premier Padel`, `Hereda: Broadcast TV`, etc.
- Mapa `TPL_NAMES` inline en la IIFE del collapsible
- Info box azul dentro del collapsible cuando está abierto: explica qué se hereda y cuándo completar los campos

### Archivos modificados
- `project/apps/frontend/src/pages/TorneoPublicoPage.jsx`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`

---

## Último bloque completado (2026-06-04 sesión 2) — Landing torneos: templates, scroll, personalización

### Nuevas funcionalidades

**20 templates visuales para card "En curso":**
- `renderEnCursoCard(tplId, props)` en `LandingSections.jsx` — función con 20 cases
- Templates: Sport Hero, Neon Grid, Split Panel, Glass, Stadium, Scoreboard, Minimal, Fire, Ocean Night, Gold Luxury, Court Lines, Big Stats, Carbon Strip, Sunset Warm, Ribbon, Retro Stripes, Ticket, Badge, Editorial, Cinematic
- Selector visual grid 4×5 en admin (TorneoDetallePage → Personalización → En curso)
- Campo `templateEnCurso` guardado en `personalizacion` JSON column (sin migración Prisma)
- Si `imagenFondoEnCurso` está cargada → override siempre (muestra imagen propia)

**2 estados visuales en sección Torneos de la landing:**
- "Próximamente" (flyer): torneo `open` + fechaInicio ≤ 14 días — diseño tipo publicidad
- "En curso" (card): torneo `in_progress` — card informativa con template seleccionable
- "Disponible" (list): torneo `open` fuera del rango de 14 días
- Helper `diasHasta(fechaStr)` + `DIAS_FLYER = 14`

**Scroll-to-section en todos los templates (1-5):**
- `scrollToTorneos(fallback)` en cada template — scroll suave a `#torneos`
- Botón "Ver torneos" en hero y feature card de Torneos usan el scroll
- IDs de sección: `torneos`, `reservas`, `nosotros`, `galeria`, `servicios`, `equipo`, `faq`

**Sub-tabs en Personalización del torneo admin:**
- `[ 📢 Flyer ] [ ⚡ En curso ] [ 📋 Fixture ] [ 🎯 Grupos ] [ 🏆 Draw ]`
- Flyer: toggle auto/imagen, premios, imagenFondo
- En curso: templateEnCurso (selector 20 tiles), colorAcento, imagenFondoEnCurso, ctaEnCurso

**Upload de imagen (base64) para Flyer y En curso:**
- Reemplazados inputs `type="url"` por `ImagenFileInput` (ya existente)
- Admin sube archivo → preview inline → guardado como base64 en personalizacion JSON

**Fixes críticos:**
- `LandingPage.jsx`: personalizacion fields leídos de `t.personalizacion.*` (JSON column) — antes se leían del top-level `t.*` y siempre eran undefined
- `TorneoDetallePage.jsx`: botón "Guardar personalización" ahora llama `api.patch('/torneos/:id/personalizacion', { personalizacion: campos })` — antes solo actualizaba el store local sin persistir al backend

### Archivos modificados
- `project/apps/frontend/src/features/landing/LandingSections.jsx` — renderEnCursoCard 20 templates, enCursoList.map refactorizado
- `project/apps/frontend/src/features/landing/Template1.jsx` ... `Template5.jsx` — scrollToTorneos + IDs de sección
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx` — sub-tabs Personalización, selector templates, templateEnCurso, API save, ImagenFileInput
- `project/apps/frontend/src/pages/LandingPage.jsx` — fetch torneos lee de `t.personalizacion`, templateEnCurso incluido

---

## Último bloque completado (2026-06-04) — Torneos jugador: tabla posiciones enriquecida + tabs zonas

### Nuevas funcionalidades

**Tabs "Mi zona" / "Todas las zonas" en `MiTorneoCard`:**
- Tab bar con pills: `Mi zona [Zona B]` | `Todas las zonas [4]`. Toggle: presionar activo colapsa.
- "Todas las zonas" usa `ZonaPanel` (colapsable), orden alfabético, todas cerradas al abrir.
- "Mi zona" muestra `GrupoReadOnly` con tabla enriquecida.

**`StandingsZona` (dark) y `StandingsZonaAdmin` (light):**
- Tabla: `Pos. | Pareja | Pts | PG | PP | Dif.S | Dif.G`
- Sort: Pts → Dif.Sets → Dif.Games. Colores diferenciados por positivo/negativo.
- Grilla cruzada debajo: aparece cuando hay resultados. Filas vs columnas de parejas. Sets en verde/rojo.

**`puntosPorVictoria` — sin hardcoding:**
- Campo `Int @default(2)` en Prisma schema. `db push` aplicado a Supabase.
- Backend POST/PUT persiste el campo. Form admin: selector 2/3 pts solo en formato grupos.
- Prop propagada: `torneo.puntosPorVictoria` → `ZonaDetailModal` → `ZonaTable` → `StandingsZonaAdmin`.

**Re-fetch al montar `PlayerTournamentsPage`:**
- Eliminado guard `if (hayBackend) return` — siempre GET fresco al entrar a "Mis torneos".

**Fixes:**
- Link "Ver mi zona" en bloque torneo activo: ruta `/dashboardJugadores/torneos` (era `/jugadores/torneos`).
- `puntosPorVictoria is not defined` en `ZonaTable`: prop agregada al componente y call site.

### Archivos modificados
- `PlayerTournamentsPage.jsx`, `TorneoDetallePage.jsx`, `TorneosPage.jsx`, `PlayerReservasPage.jsx`
- `backend/routes/torneos.js`, `backend/prisma/schema.prisma`

---

## Estado general

| Módulo | Estado | Notas |
|---|---|---|
| Base frontend + design system | ✅ Completo | Tailwind, componentes UI, dark/light themes |
| Login admin | ✅ Completo | Conectado al backend real. admin@club.com / 123456 |
| Landing pública (5 templates) | ✅ Completo | Personalizable desde panel admin. Datos reales desde Supabase (clubs/:slug). Spinner mientras carga. Slots disponibilidad desde endpoint público. |
| Dashboard admin completo | ✅ Completo | Stats, navegación, sidebar colapsable |
| Jugadores admin (directorio) | ✅ Completo | Alta manual, edición, baja/reactivar, eliminar. Match por DNI al registrarse. requireActive middleware. |
| Gestión reservas (admin) | ✅ Completo | Grilla semanal, aprobación, turnos fijos. Backend conectado. Política de cancelación con cargo automático. Fix: fetch usa JWT clubId (sin fallback hardcodeado). Scroll libre (sin h-full). |
| Gestión pagos (admin) | ✅ Frontend completo | Registro de pagos por turno — falta backend |
| Edición del club / Quiénes Somos | ✅ Completo | Logo, colores, plantillas, horarios, canchas |
| Registro jugador (stepper 3 pasos) | ✅ Completo | Conectado al backend real. Validaciones, georef API, toggle perfil público |
| Login jugador | ✅ Completo | Conectado al backend real (DNI + password + clubId) |
| Perfil jugador | ✅ Completo | Editable, banner "completá tu perfil", georef API, perfilPublico |
| Dashboard jugador completo | ✅ Completo | Resumen, reservas, turnos fijos, stats, torneos |
| Reservas jugador (grilla + modal) | ✅ Completo | Slots 1.5h. GET /reservas/me al montar. Cancelación con política de cargo. Sin localStorage |
| Turnos fijos (pendiente → aprobación) | ✅ Frontend completo | Flujo completo — falta backend (Bloque 3) |
| Notificaciones admin + jugador | ✅ Backend completo | Tabla `notificaciones` en Supabase. Triggers en reservas + turnos fijos. GET/PATCH endpoints. playerNotificationsStore reescrito sin localStorage |
| Dashboard profesor (agenda + disponibilidad) | ✅ Completo | Portal separado `/dashboardProfesor`. Disponibilidad DB-connected. Tab "Clases del profesor" en admin. Endpoints: `POST /reservas/admin/clase-profesor`, `POST /reservas/profesor`, `GET /turnos-fijos/slots-dia`. TurnosFijos bloquean modal agenda. Fix: campana en ProfesorLayout (no duplicada en página). |
| Sección "Clases profesores" (admin) | ✅ Completo | `/dashboardAdmin/clases`. Métricas semanales, tarjetas por profesor con chips de días y horas, grilla combinada días × profesores. Sidebar + bottom nav + usePageTitle actualizados. |
| Módulo torneos admin | ✅ Frontend completo | CRUD, grupos, bracket, horarios — falta backend (Bloque 4) |
| Módulo torneos jugador | ✅ Frontend completo | Inscripción, historial, sinCompanero, disponibilidad, notificaciones separadas — falta backend (Bloque 4) |
| Estadísticas jugador | 🔲 Hardcodeado | Placeholder. Implementar en Bloque 5 con datos reales de reservas + torneos |
| Responsive design mobile | 🔄 En progreso | Admin ~80%, Jugador ~70%, Profesor ~70% |
| Backend real — Bloque 1 setup | ✅ Completo | Express + Prisma + Supabase. Server levanta en puerto 3001 |
| Backend real — Bloque 2 auth | ✅ Completo | JWT + bcrypt. Login admin/jugador + registro jugador conectados al frontend |
| Multi-tenancy (club_id) | ✅ Completo | Schema Club/Admin/Jugador en Supabase. Seed con club-demo, admin y jugador |
| Backend real — Bloque 3 reservas | ✅ Completo | Cancha + Reserva en Supabase. 4 endpoints. Frontend jugador POST + admin GET/PATCH conectados. Fix: botón confirmar con spinner/disabled para evitar peticiones duplicadas |
| Backend real — Bloque 4 torneos | ✅ Completo | Torneo + Pareja en Prisma. 14 endpoints. Admin + jugador conectados. mapBackendTorneo, fix Number(id)→String |
| Backend real — Bloque 5 stats | 🔲 Pendiente | Estadísticas reales calculadas desde reservas + torneos |
| Google OAuth | 🔲 Futuro | Bloque 5. Supabase Auth + paso extra para cargar DNI |
| WhatsApp notificaciones | 🔲 Futuro | Pendiente para fase backend |
| Landing SaaS empresa | 🔲 Futuro | Cuando haya primer cliente real |
| Registro self-service de clubes | 🔲 Futuro | MVP: alta manual por el equipo |

---

## Responsive design — Detalle por área

### Admin (`/dashboardAdmin`)
- [x] Layout base: `h-screen overflow-hidden`, `min-w-0`
- [x] Bottom nav mobile con auto-hide on scroll
- [x] Hamburger + overlay sidebar como drawer
- [x] Sidebar: colapso solo en desktop, oculto en mobile
- [x] Stats cards (ReservasPage): `grid-cols-2` en mobile
- [x] Grilla reservas: GrillaMobile (2 canchas por página)
- [x] Stat cards móvil en ReservasPage
- [x] Torneos — ParejaCard: lista vertical en mobile
- [x] Torneos — ZonaCardCompact: 1 columna en mobile
- [x] Personalización torneo: file inputs (reemplaza URLs https)
- [ ] Revisar PagosPage mobile
- [ ] Revisar AdminDashboardPage (stats principales) mobile

### Jugador (`/dashboardJugadores`)
- [x] Layout base: `min-w-0`, `overflow-x-hidden`
- [x] Selector de fecha en ReservasPage: `min-w-0` fix
- [ ] PlayerDashboardPage mobile
- [ ] PlayerTurnosFijosPage mobile
- [ ] PlayerStatsPage mobile
- [x] PlayerTournamentsPage mobile — layout ya era vertical/responsive; fix toasts (left-4 right-4 en mobile)

### Profesor (`/dashboardProfesor`)
- [x] Layout base: `min-w-0`, `overflow-x-hidden`
- [x] Selector de días en Agenda: `min-w-0` fix
- [x] Selector de días en Disponibilidad: `min-w-0` fix
- [ ] Revisar layout general de agenda en mobile

---

## localStorage activo

| Clave | Store | Contenido |
|---|---|---|
| `admin_notificaciones_v2` | notificacionesStore | Avisos admin (UI efímero) |
| ~~`player_notificaciones`~~ | ~~playerNotificationsStore~~| **Eliminado** — migrado a tabla `notificaciones` en Supabase |
| `player_token` | playerStore | Token de sesión jugador |
| `token` | authStore | Token del admin |
| `admin_sidebar_collapsed` | AdminDashboardLayout | Estado del sidebar desktop |

**Eliminados de localStorage (migrado a backend):** `torneos_v1`, `player_reservas`, `reservas_admin`, `turnos_fijos`, `profesores`, `player_data`, `admin_user`, `club_config`, `player_notificaciones`

> Para limpiar localStorage en pruebas: incrementar `APP_VERSION` en `main.jsx` (versión actual: 84.0).

---

## Reglas de negocio críticas

- Turnos SIEMPRE 1.5h (10:00 → 11:30). Nunca calcular fin como +1h.
- Turno fijo = `pendiente` hasta aprobación del admin.
- Admin es el único que puede registrar ganadores y avanzar el bracket.
- BYEs se auto-resuelven al generar el bracket.
- Solo se puede generar fixture con estado `closed` o `in_progress` y mínimo 2 parejas.
- Máximo un turno fijo activo por cancha por día (RN-51).
- Torneo `in_progress` bloquea todas las canchas en la grilla del jugador.
- Precio siempre fijo por cancha — sin recargo pico.

---

## Rutas completas

### Jugador (`/dashboardJugadores`)
- `/dashboardJugadores` → login/registro
- `/dashboardJugadores/registro` → stepper 3 pasos
- `/dashboardJugadores/dashboard` → resumen
- `/dashboardJugadores/reservas` → reservar cancha
- `/dashboardJugadores/mis-reservas` → mis reservas eventuales (nueva página)
- `/dashboardJugadores/turnos-fijos` → mis turnos fijos
- `/dashboardJugadores/estadisticas` → gráficos
- `/dashboardJugadores/torneos` → torneos (inscripción + historial)
- `/dashboardJugadores/oponentes` → análisis rivales
- `/dashboardJugadores/perfil` → perfil personal
- `/dashboardJugadores/notificaciones` → centro de notificaciones

### Admin (`/dashboardAdmin`)
- `/dashboardAdmin` → dashboard principal
- `/dashboardAdmin/club` → edición del club
- `/dashboardAdmin/reservas` → grilla de reservas
- `/dashboardAdmin/jugadores` → directorio de jugadores
- `/dashboardAdmin/clases` → clases profesores (nueva)
- `/dashboardAdmin/torneos` → lista de torneos
- `/dashboardAdmin/torneos/:id` → detalle del torneo
- `/dashboardAdmin/pagos` → pagos

### Profesor (`/dashboardProfesor`)
- `/dashboardProfesor` → login
- `/dashboardProfesor/agenda` → agenda de clases
- `/dashboardProfesor/disponibilidad` → horarios disponibles

---

## Último bloque completado (2026-06-03) — Testing scheduler grupos + algoritmo de agrupación

### Objetivo
Afinar el motor de scheduling de grupos hasta que sea robusto para un torneo real con disponibilidad heterogénea.

### Algoritmo de agrupación (`_distribuirPorAfinidad`)
- **Constraint-first**: las parejas con menos días disponibles siembran su zona (antes el seed era aleatorio)
- **Score combinado**: `overlap + diversity + onexdia * 2` — maximiza días en común, variedad de días en la zona y distribución 1-partido-por-día
- **Tiebreak aleatorio** dentro del mismo nivel de restricción → variedad entre regeneraciones
- `Regenerar` ahora produce resultados distintos (shuffle antes de `generateGroupPhase`)

### Algoritmo de scheduling (`autoScheduleGroups`)
- **3 niveles de prioridad**: días con overlap confirmado → fallback días ya usados → disponibilidad implícita (días del torneo donde al menos una pareja tiene algo confirmado)
- **Granularidad 15 min**: loop avanza de 15 en 15 (antes era intervaloMin) → no se pierden slots entre intervalos
- **Conflicto de pareja**: `parejaSchedule` map — una pareja no puede jugar en dos canchas a la misma hora
- **Pre-poblar mapas**: al completar parcialmente (después de swap), carga slots ya asignados para no pisar conflictos
- **Corte de eliminatoria**: `esSlotDeGrupos(d, hora, diaInicioElim, horaInicioElim)` aplicado a cada slot candidato
- **Días del torneo válidos**: `getDiasEnRango(fechaInicio, fechaFin)` con parse local (evita bug UTC-3 que devolvía día anterior)

### Multi-iteración en Auto-asignar
- Auto-asignar corre scheduling en grupos actuales primero
- Si hay `sinHorario` → prueba hasta 25 reagrupaciones aleatorias
- Se queda con la combinación que tenga menos conflictos
- Modal de progreso: spinner "Asignando..." → resultado "X asignados · Y sin horario"

### Modal asignación manual (click en "Sin horario")
- Muestra disponibilidad real de ambas parejas (días confirmados)
- **Días válidos**: filtrado por rango del torneo (`fechaInicio`→`fechaFin`) Y por corte de eliminatoria
- **Slots pre-calculados**: para cada día muestra horarios libres en formato chips (no input manual)
- Slots calculados en base a: hora mínima de las parejas + conflictos de cancha + conflictos de pareja ya asignados
- Canchas filtradas por slot: solo muestra las libres para ese horario específico
- Si no hay overlap: avisa "Sin días en común — coordiná con los jugadores"

### Archivos modificados
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`
- `project/apps/frontend/src/services/torneoService.js`

---

## Último bloque completado (2026-06-03) — Testing Bloque 4: cierre inscripciones + fixes grupos

### Objetivo
Completar el testing end-to-end del Bloque 4 torneos (pasos 4.3–4.4) y arrancar Bloque 5 (generación de grupos).

### Funcionalidades implementadas / corregidas

**Cierre de inscripciones — modal de confirmación (`ModalCerrarInscripcion`)**
- Ya estaba implementado. Verificado desde TorneoDetallePage Y TorneosPage (card list).
- Al cerrar: parejas `espera` → `suplente` (atómico en backend + store).
- Al reabrir: parejas `suplente` → `espera`.

**Toast al abrir/cerrar inscripción desde TorneoDetallePage**
- Importado componente `Toast`. Nuevo estado `toastEstado`.
- `ejecutarCambioEstado` dispara `setToastEstado(nuevoEstado)`.
- Tres toasts: `open` (verde), `closed` (ámbar), `draft` (slate) — idénticos a TorneosPage.

**Fix overflow botón lupa en ModalEditarDisponibilidad**
- Causa raíz: contenedores flex sin `min-w-0` → lupa desbordaba sobre columna DNI adyacente.
- Fix aplicado en J1 y J2: `min-w-0` en outer div, flex container e input (`flex-1 min-w-0`).
- Fix adicional: inicializar `lookupJ1`/`lookupJ2` directo en `encontrado` si ya hay DNI + nombre cargado → elimina flash visual al abrir el modal.

**Generación de grupos — excluir suplentes**
- `handleGenerarGrupos`: usa `parejasTitulares = torneo.inscriptos.filter(p.estado === 'inscripto')`.
- `inscriptosActivos` definido cerca de `puedeGenerarGrupos` para reusar en contadores y condiciones.
- El texto "N parejas inscriptas" en tab Grupos ahora cuenta solo titulares.

**Botón "Regenerar" en header de grupos pendientes**
- Nuevo botón junto a "Confirmar grupos" que llama `handleGenerarGrupos`.
- Permite re-sortear en caso de haber generado con datos incorrectos.

**Duración estimada por partido (`intervaloPartidoMin`)**
- `autoScheduleGroups(grupos, canchas, intervaloMin = 75)` — nuevo parámetro.
- Iteración cambiada de hora en hora a `m += intervaloMin` (en minutos). Soporta 60, 75, 90 min.
- Helper `timeToMin` / `minToTime` para precisión en minutos (ej: horario 11:15 en vez de solo 11:00).
- Selector "Duración est." (60/75/90 min) en header de grupos pendientes. Default 75.
- Estado local `intervaloPartidoMin` en TorneoDetallePage. Pasado a `handleAutoSchedule`.

### Archivos modificados
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`
- `project/apps/frontend/src/pages/TorneosPage.jsx`
- `project/apps/frontend/src/services/torneoService.js`

---

## Último bloque completado (2026-05-31) — Testing flujo torneos completo + fixes espera + DNI lookup registro

### Objetivo
Prueba end-to-end del flujo de inscripción jugador (pasos 3.1–3.8) completada al 100%. Corrección de bugs detectados durante el testing, mejoras UX lista de espera, DNI lookup en registro y fixes de notificaciones auto-promoción.

### Bugs corregidos

**notificacionesStore.js — `normBackend` faltaban campos torneo:**
- `normBackend` no mapeaba `jugador1`, `jugador2`, `torneoNombre`, `categoria`, `vaAEspera` desde `n.data`
- Fix: agregados los 5 campos al mapper

**"Marcar todo leído" en panel admin — volvían tras 30s:**
- El botón llamaba `eliminarNotificacion(n.id)` sin token → `DELETE` nunca llegaba al backend
- Fix: cambiado a `marcarTodasLeidas(token)` que hace `PATCH /notificaciones/admin/leidas`

**`esOwner` fallaba para jugadores sinCompañero:**
- Cuando `jugador1Id` era null, la condición `jugador1Id === playerId` siempre era false
- Fix: fallback a comparación por nombre si `jugador1Id` es null

**`diaInicioEliminatoria` no filtraba horarios en disponibilidad:**
- `mapBackendTorneoPlayer` no incluía `diaInicioEliminatoria` / `horaInicioEliminatoria`
- Resultado: `esSlotDeGrupos` siempre devolvía `true` → no se filtraban los horarios del día de eliminatoria
- Fix: campos agregados al mapper en `PlayerTournamentsPage.jsx`

**Estado 'espera' no se mostraba en MiTorneoCard tras inscripción:**
- `addParejaFromApi` no incluía el campo `estado` de la respuesta del backend
- Fix: `estado: p.estado ?? 'inscripto'` agregado al payload de la llamada

**Notificaciones auto-promoción — incompletas en admin DELETE y player DELETE:**
- Ambos routes usaban `prisma.notificacion.create` directo, no notificaban a j2, faltaban nombres en data
- Fix: reemplazados por `notificarJugador` para j1 y j2 con payload completo incluyendo `jugador1`/`jugador2`

### Nuevas funcionalidades

**Badge pulsante "Falta compañero/a" en MiTorneoCard:**
- Reemplazado el badge estático por uno con `animate-ping` (dot ámbar pulsante + texto)

**Chips de categoría con color en panel admin (TorneosPage):**
- Badge coloreado por categoría (8 colores rotativos) + badge "Espera" ámbar cuando `vaAEspera: true`

**ModalCancelar — modal animado para cancelar inscripción:**
- Animación SVG fase 1 (confirmación) + fase 2 (círculo rojo + X trazada con keyframes)

**Notificaciones jugador para eventos torneo:**
- 5 tipos: `torneo_inscripto_compañero`, `torneo_baja_compañero`, `torneo_baja_admin`, `torneo_alta_admin`, `torneo_promovido_espera`
- Helper `notificarJugador` en backend: verifica `cuentaActiva`, fire-and-forget

**DNI lookup en Step1Basicos (registro jugador):**
- Endpoint público `GET /api/jugadores/buscar-por-dni?dni=X&clubId=Y` — solo devuelve nombre/apellido, sin datos sensibles
- Debounce 450ms al tipear DNI → pre-llena nombre/apellido si el admin lo cargó en torneos
- Badge verde + icono `Sparkles` "Datos pre-cargados desde el club · podés editarlos"
- Badge se resetea si el jugador edita manualmente

**Lista de espera — UX mejorada:**
- `MiTorneoCard`: borde ámbar cuando `esEspera`, botón "Editar en espera" en color ámbar
- Tooltip `group-hover` que explica cómo funciona la promoción automática

**Promover desde espera — validación de cupo (backend + frontend):**
- Backend `PATCH /:id/parejas/:pid`: cuenta inscriptos antes de promover, rechaza si cupo lleno con mensaje claro
- Notificación `torneo_promovido_espera` para j1 y j2 al promover manualmente
- Botón "Promover" deshabilitado con tooltip cuando cupo está lleno

### Archivos modificados
- `project/apps/backend/src/routes/torneos.js`
- `project/apps/backend/src/routes/jugadores.js`
- `project/apps/frontend/src/store/notificacionesStore.js`
- `project/apps/frontend/src/store/playerNotificationsStore.js`
- `project/apps/frontend/src/pages/TorneosPage.jsx`
- `project/apps/frontend/src/pages/PlayerTournamentsPage.jsx`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`
- `project/apps/frontend/src/features/player-register/Step1Basicos.jsx`

### Tests del flujo torneo ejecutados — BLOQUE 3 COMPLETO ✅
| Paso | Descripción | Estado |
|------|-------------|--------|
| 3.1 | Inscribirse sin disponibilidad | ✅ |
| 3.2 | Badge "Falta compañero/a" pulsante | ✅ |
| 3.3 | Inscripción fuera del plazo | ✅ |
| 3.4 | Editar inscripción (j1) | ✅ |
| 3.5 | Permisos j1/j2 diferenciados | ✅ |
| 3.6 | Lista de espera (cupo completo) | ✅ |
| 3.7 | Doble inscripción por DNI (409) | ✅ |
| 3.8 | Notificaciones jugador torneo | ✅ |

---

## Último bloque completado (2026-05-30 sesión 2) — Permisos j1/j2, disponibilidad opcional, validación DNI

### Objetivo
Completar el flujo de inscripción de torneos jugador: disponibilidad opcional, separación de permisos entre j1 y j2, y validación de doble inscripción por DNI.

### Backend — `routes/torneos.js`
- **`POST /:id/inscribir`** — validación de DNI duplicado antes de la transacción: si alguno de los DNIs ya aparece en jugador1Dni o jugador2Dni de otra pareja del mismo torneo → 409
- **`PATCH /:id/inscribir/:pid`** — split de permisos j1/j2:
  - Calcula `esJ1` y `esJ2` desde `jugador1Id` / `jugador2Id`
  - Si ni j1 ni j2 → 403
  - Si es j2 e intenta cambiar `jugador2`, `jugador2Dni`, `categoria` o `sinCompanero` → 403 "Solo podés editar tu disponibilidad horaria"

### Frontend — `PlayerTournamentsPage.jsx`

**Disponibilidad opcional:**
- `validate()` ya no exige slots mínimos
- Nota informativa debajo del selector si no se cargó ninguno: "Podés agregar tu disponibilidad ahora o editarla más tarde"
- Pantalla de éxito: aviso ámbar "Recordá agregar tu disponibilidad horaria antes del cierre" si `slots.length === 0`

**Validación doble inscripción por DNI (frontend):**
- j1: si su propio DNI ya aparece en inscriptos → error general bloqueante
- j2: si el DNI del compañero ya está en otra pareja → error en campo jugador2Dni (excluye la pareja propia en edición)
- Backend 409 → toast rojo y cierre del modal (no cae al store local)

**Split de permisos j1/j2 en `MiTorneoCard`:**
- `esOwner = miPareja?.jugador1Id === playerId` (por ID, no por nombre)
- `editable = puedeEditar(torneo) && esOwner` → muestra "Editar inscripción" + "Cancelar"
- `editableDisp = puedeEditar(torneo) && !esOwner` → muestra solo "Mi disponibilidad" (botón azul)
- `MiTorneoCard` recibe prop `playerId={player?.id}`
- `onEditar` acepta tercer argumento `soloDisp` → `setModalEdicion({ torneo, pareja, soloDisponibilidad: soloDisp })`

**Modal `ModalInscripcion` con prop `soloDisponibilidad`:**
- Cuando `true`: oculta toggle sinCompañero, grilla jugadores, mini-form alta, InfoBlock DNI, selector categoría
- Solo muestra el selector de disponibilidad + prefiereMismoDia
- `handleConfirmar`: si `soloDisponibilidad` → salta validate, envía solo `{ disponibilidad, prefiereMismoDia }`
- Título: "Mi disponibilidad" | Botón: "Guardar disponibilidad" | Éxito: "¡Disponibilidad guardada!"
- `handleConfirmarEdicion`: si `soloDisponibilidad` → solo patchea esos 2 campos, no dispara notificaciones de actualización

**Mejora visual fecha en `MiTorneoCard`:**
- Reemplazada la línea de texto plana por dos chips con ícono + día + mes abreviado
- Chip inicio: Calendar icon verde + "04 jun"
- Chip fin: Flag icon rojo + "07 jun"
- Badge ámbar "Cierre + fecha" cuando `fechaLimiteInscripcion` existe y el torneo sigue abierto

**Badge "Sin disponibilidad" en `TorneoDetallePage`:**
- `ParejaCard`: badge ámbar "Sin disponibilidad" cuando `slots.length === 0 && !ins.sinCompanero` (mobile + desktop)

### Archivos modificados
- `project/apps/backend/src/routes/torneos.js`
- `project/apps/frontend/src/pages/PlayerTournamentsPage.jsx`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`

---

## Último bloque completado (2026-05-30) — Torneos: widget dashboard real, lookup DNI compañero, mejoras UX

### Objetivo
Conectar el widget de torneos del dashboard jugador al backend real, implementar lookup automático de compañero por DNI con pre-registro inline, y mejorar la calidad general del módulo torneos (UX, validaciones, colores de club).

### Backend — `routes/jugadores.js`
- **`GET /api/jugadores/por-dni?dni=XXXXXXXX`** — nuevo endpoint para jugadores autenticados
  - Busca por DNI exacto dentro del club del jugador logueado
  - Devuelve `{ found: true, id, nombre, apellido, cuentaActiva }` o `{ found: false }` (siempre HTTP 200)
  - Sin datos sensibles (sin email, teléfono, password)

### Backend — `routes/torneos.js`
- **Máquina de estados** — `TRANSICIONES_VALIDAS` map: el backend valida la transición antes de actualizarla. Transiciones inválidas devuelven 422.
- **`POST /:id/inscribir`** — si el compañero no existe en DB y se envían `jugador2Nombre` + `jugador2Apellido`:
  - Crea automáticamente `Jugador { cuentaActiva: false, activo: true }` con los datos del compañero
  - Setea `jugador2Id` en la Pareja desde el primer momento
  - Race condition cubierta: si P2002 (unique constraint), re-busca el registro ya creado

### Frontend — `PlayerDashboardPage.jsx`
- **Widget "Mis torneos"** conectado al backend real
  - Fetch `GET /api/torneos?clubId=X` al montar, filtra las parejas donde `jugador1Id === player.id`
  - Ordenado por estado: `in_progress > closed > open > finished > draft`
  - Badge "N en juego" cuando hay torneos activos
  - Stat card "Torneos" muestra conteo real (antes hardcodeado)
  - Loading skeleton + estado vacío con CTA a inscribirse

### Frontend — `PlayerTournamentsPage.jsx` — `ModalInscripcion`
- **Lookup automático de compañero** al ingresar 7-8 dígitos en "DNI compañero/a" (debounce 400ms)
  - `found` → nombre se auto-completa, readonly, badge verde "Registrado" / "Pre-registrado"
  - `not_found` → aparece bloque ámbar "Alta rápida — sin cuenta" con campos nombre + apellido
    - El campo "Compañero/a" de arriba se actualiza en tiempo real al escribir
    - Botón **"Dar de alta"** valida y confirma (cambia estado a `confirmed`, cierra el bloque)
    - Botón **"Cancelar"** limpia el DNI y vuelve al estado inicial
    - Icono lápiz en el badge ámbar permite reabrir el mini-form para corregir
  - `loading` → spinner en el campo DNI
- **InfoBlock actualizado** explica los tres estados (Registrado / Pre-registrado / Sin cuenta)
- `mapBackendTorneoPlayer` ahora incluye `jugador1Id`, `estado`, `sinCompanero`
- Fechas de torneo rediseñadas en `TorneoDisponibleCard` (dos pills inicio/fin)

### Frontend — `TorneoDetallePage.jsx`
- `window.confirm()` y `window.alert()` reemplazados por `confirmModal` genérico (componente inline)
- Notificaciones al jugador eliminadas del admin (son responsabilidad del backend)
- `horasDisponibles` calculado desde los horarios reales del club (no hardcodeado)
- Colores default en bracket/fixture usan `club.colorPrimario` en vez de `#afca0b` hardcodeado

### Frontend — `TorneosPage.jsx`
- Validación: `fechaInicio` no puede ser en el pasado al crear (no aplica en edición)
- Validación: `fechaFin` debe ser estrictamente posterior (no mismo día)

### Frontend — `QuienesSomosPage.jsx`
- `HorarioSelect`: `onAperturaChange(newAp, newCierre)` unifica la llamada para evitar dobles re-renders
- `TabCanchas`: recibe `token` y detecta reservas/turnos futuros antes de advertir al admin sobre cambios de horario que pueden generar inconsistencias

### Frontend — `ReservasPage.jsx`
- Tooltip del indicador "fuera de grilla" mejorado: describe la causa probable y los pasos de solución

### Archivos modificados
- `project/apps/backend/src/routes/jugadores.js`
- `project/apps/backend/src/routes/torneos.js`
- `project/apps/frontend/src/pages/PlayerDashboardPage.jsx`
- `project/apps/frontend/src/pages/PlayerTournamentsPage.jsx`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`
- `project/apps/frontend/src/pages/TorneosPage.jsx`
- `project/apps/frontend/src/pages/QuienesSomosPage.jsx`
- `project/apps/frontend/src/pages/ReservasPage.jsx`
- `project/apps/frontend/src/services/torneoService.js`

---

## Último bloque completado (2026-05-26) — Auditoría QA/PM/Tech Lead sección Torneos + correcciones

### Objetivo
Auditoría en tres pasadas (QA senior, Product Manager, Tech Lead) del módulo Torneos. Corrección de los issues encontrados en backend y frontend en una sola sesión.

### Auditoría — issues encontrados y estado

| # | Pasada | Issue | Estado |
|---|--------|-------|--------|
| P0 | QA | Race condition cupo en inscripción (admin y jugador) | ✅ Resuelto |
| P1 | QA | Sin confirmación antes de regenerar grupos con resultados cargados | ✅ Resuelto |
| P1 | QA | Check de propiedad en PATCH/DELETE /inscribir usaba clubId (cualquier jugador podía editar/cancelar) | ✅ Resuelto |
| P1 | QA | fechaLimiteInscripcion no validada en backend al inscribir | ✅ Resuelto |
| P2 | QA | Sin validación de fechas (fin < inicio, límite > inicio) en creación/edición de torneo | ✅ Resuelto |
| P2 | QA | Sin guard para categorías con >32 parejas (APA_DRAWS solo soporta 2-10 zonas → max 32 parejas) | ✅ Resuelto |
| P2 | QA | Categorías con 1 sola pareja se incluyen silenciosamente en fase de grupos (generan zona vacía) | ✅ Resuelto |

### Backend — `routes/torneos.js`

**Importación Prisma.TransactionIsolationLevel:**
- Agregado `import { Prisma } from '@prisma/client'` (por separado del cliente)
- Nota: `../lib/prisma.js` solo exporta la instancia del cliente; `Prisma` viene de `@prisma/client`

**POST /torneos/:id/parejas (admin carga pareja):**
- Race condition: refetch del torneo + verificación de cupo envueltos en `$transaction` con `Serializable` isolation
- Si cupo lleno: `e.httpStatus = 400` para distinguir del error DB en el catch externo

**POST /torneos/:id/inscribir (jugador):**
- Misma solución `$transaction` serializable para race condition
- Agregada validación de `fechaLimiteInscripcion`: si ya pasó → 400 "El plazo de inscripción ya venció"
- Notificación al admin movida fuera de la transacción (no bloquear el commit por fallo de notif)

**PATCH /inscribir/:pid y DELETE /inscribir/:pid:**
- Cambiado `pareja.clubId !== req.user.clubId` → `pareja.jugador1Id !== req.user.id`
- `req.user.clubId` es el mismo para todos los jugadores del club → bug: cualquier jugador podía editar la inscripción de otro
- `req.user.id` es el ID de DB del jugador autenticado (seteado en JWT en login)

**POST /torneos y PATCH /torneos/:id:**
- Validación de fechas: `fechaFin < fechaInicio` → 400
- Validación: `fechaLimiteInscripcion > fechaInicio` → 400
- En PATCH: usa fallback a valores actuales del torneo para cada campo no enviado

### Frontend — `TorneoDetallePage.jsx` — `handleGenerarGrupos`

**Confirmación antes de regenerar con resultados:**
- Detecta si hay resultados cargados en algún partido de la fase actual
- Modal `window.confirm` claro que avisa que se borrarán los resultados

**Validaciones preventivas:**
- Categorías con >32 parejas: bloquea con `alert` explicativo (APA_DRAWS max 10 zonas = 32 parejas)
- Categorías con 1 sola pareja: `window.confirm` pregunta si continuar sin incluirla

### Archivos modificados
- `project/apps/backend/src/routes/torneos.js`
- `project/apps/frontend/src/pages/TorneoDetallePage.jsx`

---

## Último bloque completado (2026-05-25) — Auditoría dash profesor + nueva sección "Clases profesores" admin

### Objetivo
Correcciones de UX y lógica en el portal del profesor y en el tab "Clases del profesor" del admin. Nueva sección `/dashboardAdmin/clases` con visión semanal consolidada.

### Correcciones ProfesorAgendaPage
- **Campana duplicada eliminada**: ProfesorLayout ya tiene la campana global. Se eliminó toda la lógica de bell (imports, state, useEffect, JSX) de ProfesorAgendaPage
- **Ancho completo**: wrapper pasó de `max-w-3xl mx-auto` a `w-full`
- **Selector de días rediseñado**: botones `flex-1` que llenan todo el ancho, con número del día grande y contador de clases (naranja si > 0)

### Correcciones ReservasPage (admin) — fix celdas de continuación
- Clase que inicia en la franja 17:00–18:00 (ej: 17:00→18:00) NO aparecía visualmente en la franja 17:30–19:00 aunque el backend rechazaba reservas por conflicto
- Fix: `clasesContinua` detecta clases que arrancan antes del slot actual pero terminan después. Las renderiza idénticas a las celdas primarias (mismo fondo naranja, mismo handler)

### Correcciones TabClasesProfesor (admin) — auditoría completa
- **SeccionDisponibilidad: lock/unlock toggle**
  - Por defecto en modo lectura (`modoEdicion: false`)
  - Botón Editar/Edición activa (Lock/Unlock) para habilitar la edición
  - Info helper explica que esta sección sobreescribe la configuración del profesor
  - `modoEdicion` se resetea a `false` cuando cambia el profesor seleccionado
  - `setHora` auto-ajusta el cierre si la apertura cambia de mark de minutos
- **Alineación de minutos en cierre (SeccionDisponibilidad)**
  - Apertura :00 → solo opciones de cierre en :00
  - Apertura :30 → solo opciones de cierre en :30
- **SeccionCrearClase: alineación minutos en `opcionesFin`**
  - Mismo criterio: `toMin(f.fin) % 60 === inicioMin % 60`
- **SeccionCrearClase: horario propio por cancha**
  - `franjasDelDia` consulta `cancha.horarios[diaNombre]` antes de usar el horario general del club
- **Reset de inicio/fin al cambiar cancha**
  - `onChange` de cancha ahora también limpia `inicio` y `fin`

### Nueva sección "Clases profesores" — ClasesProfesorAdminPage
- **Ruta**: `/dashboardAdmin/clases`
- **Navegación**: sidebar desktop (entre Jugadores y Torneos), bottom nav mobile, usePageTitle actualizado
- **Contenido**:
  - Navegación semanal con botón "Hoy"
  - 3 métricas: clases esta semana, profesores con clases / total activos, horas totales
  - Tarjetas por profesor: chips de 7 días (naranja si tiene clases, punto si disponible, opaco si no trabaja), contador de horas
  - Grilla combinada: tabla días × profesores, cada celda muestra clases (horario + cancha) o "disponible" si el profesor tiene disponibilidad configurada

### Archivos modificados
- `project/apps/frontend/src/pages/ProfesorAgendaPage.jsx`
- `project/apps/frontend/src/pages/ReservasPage.jsx` — celdas de continuación
- `project/apps/frontend/src/features/admin/TabClasesProfesor.jsx` — auditoría completa
- `project/apps/frontend/src/pages/ClasesProfesorAdminPage.jsx` — nuevo
- `project/apps/frontend/src/router/index.jsx` — ruta /clases
- `project/apps/frontend/src/components/ui/Sidebar.jsx` — ítem GraduationCap
- `project/apps/frontend/src/layouts/AdminDashboardLayout.jsx` — bottom nav
- `project/apps/frontend/src/hooks/usePageTitle.js` — título "Clases profesores"
- `flujo-prueba-reservas-turnos.html` — checklist admin y nuevos ítems

---

## Último bloque completado (2026-05-23) — Mis reservas, toasts persistentes, UX Reservar cancha

### Funcionalidades implementadas

**Nueva página "Mis reservas" (`PlayerMisReservasPage.jsx`)**
- Página dedicada en el sidebar del jugador (ícono `ClipboardList`, entre "Reservar cancha" y "Mis turnos fijos")
- Ruta: `/dashboardJugadores/mis-reservas`
- Tabs: Próximas (filtradas por fecha ≥ hoy) / Todas
- Botón "⊗ Cancelar" por fila (texto + ícono) — abre modal de confirmación con política `horasCancelacion`
- Router actualizado: ruta `mis-reservas` registrada en `router/index.jsx`
- `PlayerLayout.jsx`: nav item agregado con `ClipboardList`

**Sistema de toasts duales persistentes (`PlayerReservasPage.jsx`)**
- Reemplazado estado booleano único (`confirmado/confirmadoEsFijo`) por array `confirmaciones[]`
- Cada ítem tiene: `{ uid, esFijo, backendId, cancha, hora, horaFin, dia/fecha }`
- Toast **verde/lima** para reservas eventuales: "Reserva enviada · [Cancha] — El admin la revisará"
- Toast **ámbar** para turnos fijos: "Turno fijo solicitado · [Cancha] — Pendiente de aprobación"
- Ambos toasts coexisten si se hacen ambas operaciones en la misma sesión
- **Auto-clear via `useEffect`**: desaparece cuando el ítem deja de estar en `pendiente` en el backend (sin timer)
- Cerrar manual (X) individual por toast

**Banner helper colapsable (PlayerReservasPage)**
- Banner "¿Cómo funciona esta sección?" encima de la grilla, cerrado por defecto
- Explica diferencia entre reserva eventual (1 día) y turno fijo (semanal recurrente)
- Toggle subtitle dinámico bajo el switch turno fijo:
  - Desactivado: "Solo para este día · Lo verás en 'Mis reservas'"
  - Activado: "Se repetirá cada semana · Lo gestionás en 'Mis turnos fijos'"

**Banners compactos de acceso rápido al pie de "Reservar cancha"**
- Banner **reservas eventuales**: aparece si hay reservas próximas (`estado=confirmada|pendiente, fecha≥hoy`)  → link a `/dashboardJugadores/mis-reservas`
- Banner **turnos fijos**: aparece si hay TF activos o pendientes → link a `/dashboardJugadores/turnos-fijos`
- Reemplazan la lista completa de "Mis turnos fijos" que ocupaba mucho espacio
- Solo se muestran si hay registros; diseño compacto con ChevronDown como flecha

**Notificaciones admin — click en solicitud de turno fijo (ReservasPage)**
- `esClickeable` ahora incluye `esSolicitudFijo` además de `esLiberacion`
- Click en notificación "Solicitud turno fijo": marca como leída + navega al tab "Turnos fijos" directamente
- Hint visible: "Clic para ir a Turnos fijos y aprobar"
- Tab inicial via `location.state?.tab` (react-router): `navigate('/dashboardAdmin/reservas', { state: { tab: 'fijos' } })`

**Panel "Avisos de jugadores" mejorado (ReservasPage)**
- Scroll interno: `max-h-72 overflow-y-auto` — panel acotado aunque haya muchas notificaciones
- Botón "Aprobar todas (N)" en el header: aparece cuando hay más de una reserva pendiente simultánea
- Filas más compactas (`py-2.5` vs `py-3.5`, texto `text-[11px]`, botones inline)

### Archivos modificados
- `project/apps/frontend/src/pages/PlayerMisReservasPage.jsx` — nueva página
- `project/apps/frontend/src/pages/PlayerReservasPage.jsx` — toasts, helper, banners
- `project/apps/frontend/src/pages/ReservasPage.jsx` — click TF notif, Aprobar todas, scroll
- `project/apps/frontend/src/router/index.jsx` — ruta mis-reservas
- `project/apps/frontend/src/layouts/PlayerLayout.jsx` — nav item Mis reservas
- `flujo-prueba-reservas-turnos.html` — guía de prueba actualizada completa

---

## Último bloque completado (2026-05-20 sesión 2) — Nombre profesor en grilla + limpieza UI clases

### Objetivo
Mostrar el nombre del profesor en la grilla del día (admin) para cada clase. Limpiar sección duplicada de "Clases del profesor" en el tab Turnos fijos.

### Limpieza — Sección "Clases del profesor" en TabTurnosFijos eliminada
- La sección al pie del tab "Turnos fijos" era código legacy con texto libre (sin vínculo a profesores reales)
- El tab dedicado "Clases del profesor" (en la misma barra de tabs) ya cubre toda la funcionalidad con profesores registrados
- Eliminado: `makeEmptyClase`, `handleAddClase`, `handleDeleteClase`, `mostrarForm`, `formClase`, `errorForm`, todo el JSX del bloque
- `TabTurnosFijos` ya no recibe props `clases`, `onAddClase`, `onDeleteClase`

### Fix — Nombre del profesor en grilla (desktop + mobile + modal)
**Backend (`reservas.js`):**
- `POST /reservas/profesor` ahora retorna `include: { cancha, profesor: { id, nombre, apellido } }`
- `POST /reservas/admin/clase-profesor` ídem — antes ambos solo devolvían `cancha: true`

**Frontend (`ReservasPage.jsx`):**
- `mapBackendReserva`: agregado `profesor: r.profesor || null` — antes se descartaba aunque GET /reservas ya lo incluía
- `Celda` (grilla desktop): renderiza `🎓 Clase · Nombre Apellido` en una sola línea con `truncate` en el nombre
- `CeldaMobile` (grilla mobile): mismo patrón `● Clase · Nombre Apellido`
- Modal detalle: `🎓 Clase · Nombre Apellido` como título del bloque naranja

### Archivos modificados
- `project/apps/frontend/src/pages/ReservasPage.jsx`
- `project/apps/backend/src/routes/reservas.js`

---

## Último bloque completado (2026-05-20) — Auditoría QA senior: seguridad + concurrencia

### Objetivo
Auditoría exhaustiva por capas (seguridad, privacidad, timezone, concurrencia) del flujo reservas + turnos fijos. 6 issues encontrados, todos resueltos.

### Objetivo
Auditoría completa del flujo reservas/turnos fijos entre admin, jugador y profesor. Corrección de doble submit, race conditions, flash de datos, polling y notificaciones diferenciadas.

### Bloque 1 — Protección doble submit

**`PlayerReservasPage.jsx`**
- `cancelarReserva(id)` movido dentro del `try` (antes siempre se ejecutaba aunque el DELETE fallara)
- `[cancelando, setCancelando]` state: `disabled={cancelando}` + guard en handler + spinner en botón del modal

**`PlayerTurnosFijosPage.jsx`**
- `ModalAusencia`: prop `enviando` para deshabilitar botón y mostrar spinner
- `handleRetirarSolicitud`: `[retirandoId, setRetirandoId]` — guard + disabled por ID + spinner
- `onCerrar` del modal bloqueado mientras `enviando`

### Bloque 2 — Race conditions backend + flash de datos

**`turnos-fijos.js` — `PATCH /:id/estado`**
- Al confirmar: re-verifica solapamiento TF vs TF (mismo cancha+día en próximas 8 ocurrencias)
- Al confirmar: re-verifica solapamiento TF vs reservas eventuales (60 días hacia adelante)
- Devuelve 409 con mensaje descriptivo en ambos casos

**`ReservasPage.jsx` (admin) — `handleAprobarTurnoFijo`**
- Catch block ya NO actualiza store como confirmado si el backend rechazó (409)
- Error UI: `errorConfirmarTF` state muestra el mensaje de conflicto bajo la fila correspondiente

**Flash de datos — jugador (`PlayerReservasPage.jsx`)**
- `clubLoaded = useClubStore(s => s._loaded)` — skeleton animado hasta que el backend responde
- Previene el flash de INITIAL_CLUB (4 canchas hardcodeadas)

**Flash de datos — grilla admin (`ReservasPage.jsx`)**
- `[loadingGrilla, setLoadingGrilla]` — skeleton de filas grises al cambiar fecha o refrescar
- Polling (30s) NO activa el loading; solo el cambio de fecha activa el skeleton
- Fix JSX: `{!loadingGrilla && (<>...</>)}` con fragment wrapper (sin fragment era JSX inválido)

### Bloque 3 — Mejoras y consistencia

**`reservas.js` — `POST /reservas/profesor`**
- Agrega validación de hora pasada (igual que admin y jugador): rechaza con 400 si la clase ya arrancó

**`PlayerTurnosFijosPage.jsx` — polling**
- `useEffect` ahora crea intervalo de 30s además del fetch inicial
- Jugador ve aprobaciones/rechazos del admin en tiempo real sin recargar

**`turnos-fijos.js` — `DELETE /:id` (jugador)**
- Notificación al admin diferenciada: `turno_fijo_retirado_jugador` si era pendiente, `turno_fijo_cancelado_jugador` si era confirmado

**`ReservasPage.jsx` (admin) — panel notificaciones**
- Nuevo tipo `esRetiroSolicitud` con mensaje: "Solicitud retirada · El jugador retiró su solicitud antes de ser aprobada"

### Extra — Banner auto-clear + slot state real-time

**`PlayerReservasPage.jsx`**
- `fetchMisReservas()` añadido al polling de 30s (antes solo `fetchReservasDia`)
- Slot pendiente → confirmado actualiza color sin necesidad de F5
- `confirmadoId` state: guarda el ID de la reserva/TF recién enviado
- `useEffect` vigila `misReservasDB` y `turnosFijos`: cuando el ítem deja de ser `pendiente`, el banner amber desaparece solo

**`ReservasPage.jsx` (admin) — Aprobar/Rechazar TF**
- `[aprobandoTFId, setAprobandoTFId]` y `[rechazandoTFId, setRechazandoTFId]`
- Botones muestran "Aprobando…" / "Rechazando…", `disabled` mientras procesa
- `finally` garantiza que siempre se libera el estado aunque haya error

### Archivos modificados
- `project/apps/frontend/src/pages/PlayerReservasPage.jsx`
- `project/apps/frontend/src/pages/PlayerTurnosFijosPage.jsx`
- `project/apps/frontend/src/pages/ReservasPage.jsx`
- `project/apps/backend/src/routes/turnos-fijos.js`
- `project/apps/backend/src/routes/reservas.js`

---

## Último bloque completado (2026-05-19 sesión 2) — Grilla admin: display clases profesor + Autocompletar

### Funcionalidades implementadas

**Fix: grilla admin muestra horario completo de clase, no la intersección con el slot**
- `Celda` (`ReservasPage.jsx`): el bloque `tipo === 'clase'` ahora muestra `{reserva.inicio} → {reserva.fin}` (tiempo real de la clase, ej. "09:00 → 14:00") en lugar de la intersección con el slot 1.5h
- Antes: se calculaba `tramoLabel = max(slotInicio, clsInicio) → min(slotFin, clsFin)`, lo que mostraba "09:00 → 09:30" en el primer slot. Corregido completamente
- `'clase'` eliminado del bloque `rowSpan`: ya no intenta mergear celdas (causaba layout roto cuando el horario no coincidía con los límites del slot)

**Fix: múltiples clases superpuestas en un slot se apilan verticalmente**
- `Grilla` (`ReservasPage.jsx`): en lugar de tomar UNA clase con `getReserva(clasesDia, ...)`, ahora filtra TODAS las clases que se solapan con el slot 1.5h:
  ```js
  const clasesSlot = (clasesDia || []).filter(
    (c) => String(c.canchaId) === String(cancha.id) && overlaps(c.inicio, c.fin, franja.inicio, franja.fin)
  )
  ```
- Si hay una o más clases, se renderizan en una columna con `divide-y divide-orange-100/60`

**Fix: Autocompletar (ProfesorAgendaPage) vuelve a bloques grandes**
- `calcularBloquesFaltantes`: revirtió de slices de 1h al approach original — un solo bloque grande por ventana libre
- Elige la cancha con el bloque más largo en cada franja horaria
- `misClasesDia` (filtrado por día) en lugar de `misClases` para el cálculo
- `toMinFill`: maneja correctamente medianoche (`if (h < 6) return mins === 0 ? 1440 : mins + 1440`)

### Archivos modificados
- `project/apps/frontend/src/pages/ReservasPage.jsx` — Celda clase + Grilla multi-clase
- `project/apps/frontend/src/pages/ProfesorAgendaPage.jsx` — calcularBloquesFaltantes + toMinFill

---

## Último bloque completado (2026-05-19) — Auditoría flujo profesor: fixes de solapamiento

### Funcionalidades implementadas

**Fix: TurnosFijos bloquean franjas en modal Nueva clase (ProfesorAgendaPage)**
- Nuevo endpoint `GET /turnos-fijos/slots-dia?fecha=YYYY-MM-DD` (rol: profesor)
- Filtra TurnoFijos `confirmado` del club para el día de la semana, respeta `diasAusentes` y `desde`
- `ProfesorAgendaPage`: agrega `fetchTurnosFijosDia` que llama el endpoint al cambiar fecha
- `ModalClase` recibe `[...todasReservasDia, ...turnosFijosDia]` — los TF aparecen como "Ocupado"

**Fix: solapamiento con TurnosFijos al crear clase**
- `POST /reservas/profesor`: verifica TurnoFijos activos antes de crear clase (igual que `POST /` del jugador)
- `POST /admin/clase-profesor`: ídem — rechaza si el horario tiene un TurnoFijo confirmado activo
- Respuesta 409 con mensaje claro: "Ese horario tiene un turno fijo activo de un jugador"

**Auditoría confirmó:**
- GAP 1 (clases no bloquean grilla jugador): ya estaba resuelto — `reservasDB` incluye clases vía `GET /reservas`
- GAP 3 (landing no muestra clases): ya estaba resuelto — `GET /:slug/disponibilidad` incluye todas las reservas confirmadas

---

## Último bloque completado (2026-05-18) — Módulo profesor: clases admin, disponibilidad simplificada

### Funcionalidades implementadas

**Tab "Clases del profesor" en ReservasPage (admin)**
- Tercer tab junto a "Grilla del día" y "Turnos fijos"
- `TabClasesProfesor.jsx`: selección de profesor, fecha, horario, cancha + notas y precio
- Al crear clase: agrega a `reservasAdminStore` (aparece en grilla del mismo día)
- La grilla muestra "Se gestiona desde la pestaña 'Clases del profesor'" para reservas de tipo clase

**Backend — `POST /api/reservas/admin/clase-profesor`**
- Verifica que el profesor pertenece al club y la cancha está activa
- Detecta conflicto de horario con reservas existentes (pendiente + confirmada)
- Crea reserva con `tipo: 'clase'`, `estado: 'confirmada'`, `profesorId`
- Endpoint protegido con `requireAuth` + `requireRole('admin')`

**ProfesorDisponibilidadPage — selectores simplificados**
- Rango fijo 06:00–24:00 para todos los días (igual para todos, independiente del club)
- La intersección club × profesor solo se aplica en la agenda (ProfesorAgendaPage)
- `clubDiaCerrado(dia, horarios)`: solo deshabilita chips de días que el club tiene cerrados
- `OPTS_APERTURA` y `opcionesCierre(apertura)`: mismas opciones para todos los días
- DB verifica: `disponibilidad` JSON guarda correctamente con dias en español + HH:MM

**ProfesorAgendaPage — lógica de intersección verificada**
- `franjasDelDia`: `ap = max(clubAp, profAp)`, `ci = min(clubCi, profCi)` con `toMin()`
- `toMin('00:00') → 1440` (medianoche) para evitar bug de comparación de strings

**QuienesSomosPage — toggle Activo/Inactivo con descripción**
- Toggle en formulario de edición de profesor con label y subtítulo explicativo
- "Acceso al portal — Activo/Inactivo" + descripción de qué significa cada estado
- Evita confusión sobre qué controla el toggle

---

## Último bloque completado (2026-05-17 sesión 3b) — Reorganización visual CanchaRow

### Funcionalidades implementadas

**Reorganización visual del formulario CanchaRow (QuienesSomosPage)**
- Separación visual en dos secciones con label + divider horizontal:
  - "Datos de la cancha" — Nombre, Tipo, Precio turno, Indoor, Cancha activa
  - "Horario de apertura" — Toggle "Horario propio de esta cancha" + selects por día
- El toggle renombrado: de "Horarios personalizados" a "Horario propio de esta cancha"
- Sin cambios de lógica — solo reorganización estructural

---

## Último bloque completado (2026-05-17 sesión 3) — Fixes grilla, landing y admin TF

### Funcionalidades implementadas

**Filtros en tabla "Turnos fijos — jugadores" (admin)**
- Buscador de texto: filtra por nombre de jugador en tiempo real
- Chips de día: muestra solo los días que tienen TF activos; clic para activar/desactivar
- Dropdown de cancha: visible solo si hay más de una cancha en uso
- Botón "Limpiar": aparece solo cuando hay algún filtro activo
- Contador adaptativo: "3 de 6" con filtros, "6 registrados" sin filtros
- Estado vacío diferenciado: "No hay TF aprobados" vs "Sin resultados para los filtros aplicados"

**Fix: landing — horario propio de cancha**
- `TurnosDisponibles` en `LandingSections.jsx`: `dataPorCancha` ahora usa `c.horarios?.[diaNombreLargo]` para cada cancha si está activo; hereda el horario general del club si no
- Eliminado el early return `if (!horarioDia?.activo) return []` — reemplazado por filter per-cancha con `.filter(Boolean)`
- Cancha 2 con horario propio muestra sus propios slots; Cancha 1 sin personalizar usa el horario general

**Fix: grilla admin — turnosFijosDia en cancha con horario propio**
- Causa raíz: `franjaParaHora(t.inicio)` usaba `franjasMainGrilla` (horario general 07:30 base) para posicionar el TurnoFijo en la grilla. Si el club usaba franjas de 07:30, "15:30" se mapeaba a 15:00-16:30 (general) que solapaba con la franja custom 14:00-15:30, haciendo aparecer el TF una fila arriba
- Fix: `turnosFijosDia` usa `t.inicio` y `t.fin` directamente (los TurnoFijos ya tienen horas exactas en DB). Eliminado `franjasMainGrilla` de las dependencias del memo

**Fix: "CANCHA LIBERADA" — eliminar simulación al montar**
- Antes: al montar el componente, se elegía un slot libre aleatorio y se mostraba como "CANCHA LIBERADA hace instantes" (demo fake)
- Ahora: solo se muestran liberaciones reales (cuando el poll de 30s detecta transición ocupado → libre)
- La detección real de liberaciones (comparación entre polls) se mantiene intacta

---

## Último bloque completado (2026-05-10) — Torneos: categorías con género + filtrado por perfil jugador

### Funcionalidades implementadas

**Etiquetas de género en torneos "Ambos" (admin)**
- Helper `catLabel(torneo, cat, short?)` en `TorneoDetallePage`: devuelve `"4° Categoría · Masc."` cuando `torneo.genero === 'Ambos'`
- Tabs de categorías, select del modal "Agregar pareja" y mensajes vacíos usan `catLabel`

**Fix modal "Agregar pareja" (admin)**
- Botón "Prefieren jugar los 2 partidos el mismo día" ahora se oculta con `{!sinCompanero && (...)}` cuando sinCompañero está tildado
- Antes estaba fuera del `div` con clase `hidden`, por eso seguía visible

**Filtrado de categorías por género del jugador (lado jugador)**
- Helper `catLabelPlayer(torneo, cat)` en `PlayerTournamentsPage`: muestra `"4° Categoría Masc."` en cards y modal (solo informativo)
- Helper `categoriasParaJugador(torneo, playerGenero)`: filtra categorías según `generoPorCategoria` y el perfil del jugador
  - Categoría sin mapa → visible para todos
  - Mixto → visible para todos
  - M → solo Masculino; F → solo Femenino
- `puedeInscribirse()` actualizado: en torneos Ambos, requiere al menos 1 categoría compatible con el género del jugador
- Modal inscripción: si 1 sola categoría disponible → readonly; si varias → select filtrado

**Campo género en perfil del jugador**
- `PlayerProfilePage`: toggle Masculino/Femenino en formulario de edición de perfil (sección "Datos básicos")
- Persiste en localStorage via `updatePlayer(form)`. Para sincronizar a DB: pendiente Bloque 5

**Store y mock data**
- `torneosStore`: `addTorneo` y `updateTorneo` reemplazan `cupoEspera` plano por `cupoEsperaPorCategoria` y agregan `generoPorCategoria`
- `torneosMockData`: agrega `'Ambos'` a la lista `GENEROS` + suplentes de prueba por categoría en torneo mock

**Toast component**
- `Toast.jsx` nuevo componente UI con animaciones CSS en `index.css`

---

## Último bloque completado (2026-05-07) — Flyer torneo: Satori PNG funcional

### Funcionalidades implementadas

**Sistema de flyer descargable (PNG 1080×1080)**
- `generateFlyer.jsx` — Motor Satori que genera SVG → PNG en el browser sin backend
- `FlyerTorneo.jsx` — Preview CSS 540×540 idéntico al flyer final
- `flyerTemplates.js` — 3 templates (navy/fuego/minimal) + color de acento personalizable
- `vite.config.js` — Fix `define: { 'process.env': {} }` para que Satori funcione en browser
- `@fontsource/inter` instalado localmente (400/700/900) — importado con `?url` para evitar CDN

**Correcciones críticas Satori**
- Fuentes cargadas localmente (antes: CDN fetch que fallaba → "Error: u is not iterable")
- Eliminados `lineHeight < 1` (Satori no los soporta)
- `flex: 1` → `flexGrow: 1` (shorthand no válido en Satori)
- `borderWidth: 2.5` → `borderWidth: 3` (decimales no válidos)
- `borderTop: '1px solid ...'` → propiedades separadas `borderTopWidth/Style/Color`
- Colores hex 8 dígitos (`#rrggbbaa`) → `rgba()` con helper `rgba(hex, alpha)`
- `fontStyle: 'italic'` eliminado (no hay fuente italic cargada)
- `overflow: 'hidden'` en sub-elementos → eliminado

**Persistencia de datos del flyer**
- `flyerFields(form)` helper en `TorneosPage.jsx` — extrae campos flyer antes de hacer merge con respuesta del backend
- `mapBackendTorneo` actualizado para incluir todos los campos flyer (premios, whatsapp, servicios, imagenFondo)
- `torneosStore` — `addTorneo` y `updateTorneo` incluyen `imagenFondo`
- Selector de template + color picker en `ModalFlyer`
- Input URL para foto de fondo con preview inline

**Descarga funcional**
- `document.body.appendChild(a); a.click(); document.body.removeChild(a)` — fix para que el `<a>` funcione sin estar en el DOM

---

## Último bloque completado (2026-05-07) — Torneos: flujo sinCompanero + notificaciones

### Funcionalidades implementadas

**sinCompanero en inscripción (jugador)**
- Toggle "Todavía no sé con quién juego" en `ModalInscripcion` (PlayerTournamentsPage)
- Al activarlo: oculta jugador2, DNI y disponibilidad. Guarda `sinCompanero: true`, `jugador2: 'Por definir'`
- Badge "⚠ Sin compañero/a" en `MiTorneoCard`
- Banner de alerta deadline cuando `sinCompanero && fechaLimiteInscripcion <= 4 días`
- Validación: 1 solo slot sin "prefiereMismoDia" → bloqueado con mensaje

**sinCompanero en carga admin (TorneoDetallePage)**
- Toggle en `ModalAgregarParejaAdmin`
- `ParejaCard`: muestra "Horario pendiente" en naranja cuando `sinCompanero`

**Admin puede editar inscripción completa**
- `ModalEditarDisponibilidad` extendido a "Editar inscripción": maneja jugador2, DNI, sinCompanero, disponibilidad y prefiereMismoDia
- Cubre el caso: jugador avisa por WhatsApp → admin completa los datos en su nombre
- Al guardar: notifica al jugador via `addInscripcionActualizadaAdmin` (playerNotificationsStore)

**Notificaciones separadas reservas / torneos**
- `notificacionesStore.sinLeer()`: excluye tipos torneo (inscripcion_torneo, baja_torneo, actualizacion_torneo)
- `notificacionesStore.sinLeerTorneos()`: cuenta solo tipos torneo (incluye completacion_torneo)
- Sidebar: badge rojo en Reservas, badge verde en Torneos
- `TorneosPage`: panel solo muestra notificaciones no leídas de tipo torneo; al marcarlas se ocultan
- `ReservasPage`: no muestra ningún tipo torneo

**Nuevas acciones en notificacionesStore**
- `bajaTorneo` — jugador cancela inscripción
- `actualizacionTorneo` — jugador edita inscripción
- `completacionTorneo` — jugador completa inscripción (sinCompanero → con pareja)

**Nueva acción en playerNotificationsStore**
- `addInscripcionActualizadaAdmin` — admin edita inscripción en nombre del jugador

**Visualización disponibilidad horaria**
- Botón reloj en `MiTorneoCard` → despliega panel inline con los slots del jugador
- Muestra día + horaDesde, nota "mismo día" si aplica, mensaje ámbar si sinCompanero

---

## Último bloque completado (2026-05-12 sesión 2) — Grilla admin: horarios mixtos por cancha

### Objetivo
Cuando una cancha tiene horario propio activo para el día, mostrarla en una sub-grilla independiente manteniendo el orden y visibilidad de todas las canchas.

### Cambios en `ReservasPage.jsx`

**`generateFranjas(horarioDia)`** — genera slots 1.5h dinámicos desde apertura hasta cierre. Cross-midnight aware. Reemplaza FRANJAS_DEFAULT estática para la grilla admin.

**`GrillaConHorarioPropio`** — componente para canchas con horario propio activo hoy:
- Header con nombre, badge azul "Horario propio", rango de horarios y cantidad de turnos
- Si `franjas.length === 0`: mensaje "Día cerrado según horario propio"
- Maneja mobile/desktop internamente (`md:hidden` / `hidden md:block`)

**`GrillaSeccionGeneral`** — componente equivalente para canchas con horario general en modo mixto:
- Header con nombre de cancha (sin badge) y rango de franjas
- Maneja mobile/desktop internamente
- Garantiza visibilidad aunque el día esté cerrado en el horario global

**Computed values en el componente:**
- `diaNombre` — nombre del día en español según la fecha seleccionada
- `franjasDia` — franjas del horario global del club para ese día
- `franjasMainGrilla` — `franjasDia` si tiene slots, sino fallback `08:00-23:00` (admin siempre ve la grilla)
- `diaCerradoGeneral` — `horarios[diaNombre].activo === false`
- `usaHorarioPropioHoy(c)` — `c.horarios?.[diaNombre]?.activo === true` (day-specific)
- `canchasSinCustom` / `canchasConCustom` — split por horario propio activo HOY

**Lógica de render (mobile + desktop idéntica):**
- Si `canchasConCustom.length === 0` → grilla normal multi-columna con TODAS las canchas (comportamiento original sin cambios)
- Si hay canchas con horario propio → itera `canchas` en orden del store:
  - Cancha con horario propio hoy → `GrillaConHorarioPropio`
  - Cancha con horario general → `GrillaSeccionGeneral`
  - Banner informativo si `diaCerradoGeneral && canchasSinCustom.length > 0`

### Cambios en `notificacionesStore.js`

**`sinLeer()`** corregido: excluye `nueva_reserva` y `completacion_torneo` del contador del badge de Reservas.
- `nueva_reserva`: manejada por el panel de reservas pendientes (backend), no por el store local
- `completacion_torneo`: pertenece al badge de Torneos (`sinLeerTorneos`)

### Cambios en `clubStore.js`

**`normalizeHorarios(h)`** — convierte `{}` (objeto vacío que retorna el backend para canchas sin horario propio) a `null`. Aplicado en `loadFromBackend` y `saveClub` al mapear canchas.

**`_dirty` flag** — `true` cuando hay cambios locales sin guardar. Impide que `PlayerLayout` pise cambios admin al re-fetchear.

---

## Último bloque completado (2026-05-12) — Horarios: selector inteligente + horarios por cancha + fix slots

### Objetivo
Eliminar el input libre de tiempo (causaba valores inválidos como 08:59) y reemplazarlo con selectores que solo permitan combinaciones exactas de 1.5h.

### Cambios en QuienesSomosPage (admin)

**Nuevo componente `HorarioSelect`**
- Apertura: selector de hora (00–23) + minuto (00 / 30 únicamente)
- Cierre: select que muestra solo opciones válidas → `apertura + N×90` (ej: 08:00 → 09:30, 11:00, ..., 23:00, 00:00)
- Cada opción de cierre muestra la cantidad de turnos: `"23:00 — 10 turnos"`
- Al cambiar apertura, el cierre se ajusta automáticamente a la opción más cercana válida (`snapCierre`)
- Imposible guardar una combinación que genere slots desalineados

**Horarios personalizados por cancha**
- Toggle en `CanchaRow` para habilitar horario propio (override del horario general del club)
- Cuando está activo: grilla de 7 días con `HorarioSelect` por día
- `null` en `cancha.horarios` = hereda horario del club
- Indicador visual "Horario propio" en la cabecera de la cancha cuando está activo

**Info box simplificado**
- Eliminado el warning ámbar (ya no necesario porque el selector garantiza combinaciones exactas)
- Info box azul explica la regla de 1.5h y el comportamiento del selector

### Cambios en PlayerReservasPage

**`snapHalfHour` + `snapCierreToSlots` en `generarSlots`**
- Sanea valores legacy con minutos arbitrarios (ej: 08:59 → 09:00, cierre 22:29 → 22:30)
- `snapHalfHour`: redondea apertura al :00/:30 más cercano
- `snapCierreToSlots`: ajusta cierre al múltiplo exacto de 90 desde apertura saneada
- `'00:00'` se trata como 1440 (medianoche) en toda la cadena — no se convierte a '23:00' accidentalmente
- Fix: `ciMin = ci === '00:00' ? 1440 : toMin(ci)` garantiza que el while loop procesa medianoche correctamente

### Cambios en backend y store

**Prisma schema**
- `Cancha`: nuevo campo `horarios Json?` — null = hereda club, objeto = horario propio por día

**`/api/clubs/me/canchas` (PATCH)**
- `horarios: c.horarios ?? null` en upsert → persiste horario por cancha en Supabase

**`clubStore`**
- `loadFromBackend` y `saveClub`: mapean `horarios` de cada cancha correctamente

**`PlayerReservasPage` — fallback por cancha**
- `horarioDia = canchaActual?.horarios?.[diaNombre] ?? club.horarios?.[diaNombre]`
- Si la cancha tiene horario propio, lo usa; si no, hereda el del club

---

## Último bloque completado (2026-05-11 sesión 2) — Notificaciones backend + Política de cancelación

### Objetivo
Todo dato de negocio en Supabase. Cero localStorage para datos de negocio.

### Nuevas tablas en Prisma (db push aplicado)
- `Notificacion` — id, clubId, jugadorId, tipo, leida, data (Json), createdAt
- `Cargo` — id, clubId, jugadorId, reservaId, concepto, monto, estado (pendiente/pagado/condonado), createdAt

### Tipos de notificación implementados
- `reserva_confirmada` — admin aprueba reserva del jugador
- `reserva_cancelada_admin` — admin cancela reserva del jugador
- `turno_fijo_confirmado` — admin aprueba turno fijo
- `turno_fijo_rechazado` — admin rechaza turno fijo
- `cargo_cancelacion` — jugador cancela fuera del plazo → cargo registrado

### Nuevos endpoints backend
- `GET /api/notificaciones/me` — jugador lee sus notificaciones (últimas 50)
- `PATCH /api/notificaciones/:id/leida` — marca una como leída
- `PATCH /api/notificaciones/leidas` — marca todas como leídas
- `GET /api/cargos/me` — jugador ve sus cargos pendientes
- `GET /api/cargos` — admin ve todos los cargos del club
- `PATCH /api/cargos/:id/estado` — admin marca cargo como pagado o condonado

### Triggers automáticos en backend
- `PATCH /reservas/:id/estado` → crea Notificacion al jugador (confirmada/cancelada)
- `PATCH /turnos-fijos/:id/estado` → crea Notificacion al jugador (confirmado/inactivo)
- `DELETE /reservas/:id` con cargo → crea Notificacion tipo `cargo_cancelacion`

### playerNotificationsStore — reescrito sin localStorage
- `fetchNotificaciones()` → `GET /api/notificaciones/me`
- `marcarLeida(id)` → optimista UI + `PATCH /api/notificaciones/:id/leida`
- `marcarTodasLeidas()` → optimista UI + `PATCH /api/notificaciones/leidas`
- `notificaciones[]` = backend; `locales[]` = UI efímero (addSolicitudEnviada)
- Métodos legacy (addReservaConfirmada, etc.) convertidos en no-ops para compatibilidad

### PlayerLayout — polling notificaciones
- Fetch al montar + cada 60s (setInterval)
- sinLeer = count de notificaciones + locales no leídas

### PlayerReservasPage — misReservasDB
- Fetch `GET /api/reservas/me` al montar
- Mapeado CUID canchaId → numeric ID via nombre de cancha
- Reemplaza uso de `reservas` del store Zustand para lista y grilla
- Refetch después de crear y cancelar

### Política de cancelación
- Campo `horasCancelacion` en config JSON del Club (admin lo configura en tab Canchas)
- Backend valida: si cancela dentro del plazo → cancela + crea Cargo + Notificacion
- Frontend modal: muestra aviso amarillo + precio del cargo si está fuera de plazo
- Botón cambia a "Cancelar con cargo ($X)" en color ámbar

### IMPORTANTE: regenerar cliente Prisma
- Después de agregar Notificacion y Cargo: `npx prisma generate` con backend detenido
- El backend necesita reiniciarse para que los nuevos modelos estén disponibles

---

## Último bloque completado (2026-05-11) — Migración completa a backend real + Fix landing

### Objetivo
Eliminar todo uso de localStorage para datos de negocio. Todo a Supabase via backend. localStorage solo para tokens, prefs UI y notificaciones efímeras.

### Stores limpiados (eliminado localStorage + seeds mock)
- `reservasAdminStore` — arranca `[]`, método `setReservas()`
- `reservasStore` — arranca `[]`, método `setReservas()`
- `turnosFijosStore` — arranca `[]`, método `setTurnosFijos()`
- `profesoresStore` — arranca `[]`, método `setProfesores()`

### authStore — fix crítico
- Agregado `admin_user` en localStorage para persistir el objeto `user` (incluye `user.club.id`)
- Sin este fix: al refrescar `user = null` → `clubId = undefined` → ningún fetch del admin se ejecutaba
- Funciones actualizadas: `login()`, `logout()`, `setUser()`

### Nuevos endpoints backend
- `GET /api/clubs/me` — retorna config del club (con canchas) para el admin autenticado
- `PATCH /api/clubs/me` — guarda `config Json` en el modelo Club
- `GET /api/reservas/me` — reservas propias del jugador autenticado
- `POST /api/reservas/admin` — creación manual de reserva por admin
- `PATCH /api/reservas/:id` — actualización parcial de reserva
- `DELETE /api/reservas/:id` — cancelación con control de rol

### Prisma schema
- Torneo: `cupoEsperaPorCategoria Json @default("{}")`, `generoPorCategoria Json @default("{}")`
- Club: `config Json?`
- Corrido `prisma db push` para aplicar cambios

### Conexiones frontend → backend
- `AdminDashboardLayout`: carga config del club al montar (`GET /api/clubs/me` → `loadFromBackend()`)
- `PlayerLayout`: carga reservas del jugador al montar (`GET /api/reservas/me` → `setReservas()`)
- `QuienesSomosPage`: `boundSaveClub = () => saveClub(token)` pasa token a todos los sub-componentes → `PATCH /api/clubs/me` al guardar

### Fix selectores clubId
- `TorneosPage`: `useAuthStore((s) => s.user?.club?.id)` (era `s.club?.id`, siempre undefined)
- `PlayerTournamentsPage`: `player?.club?.id ?? player?.clubId ?? null`
- `TorneoDetallePage`: fallback fetch cuando el store está vacío (acceso directo por URL)

### Fix tab torneos admin
- Default `tabActiva` cambiado a `'proximos'` (torneos draft/open/closed)
- Tras el fetch: si hay `in_progress` → salta a `'en_curso'`; si no → queda en `'proximos'`
- Antes: al navegar y volver se reseteaba a `'en_curso'` y los torneos nuevos "desaparecían"

### Nuevos endpoints backend (bloque migración)
- `GET /api/auth/admin/me` — datos actualizados del admin autenticado
- `GET /api/jugadores/me` — datos del jugador autenticado (sin password)
- `PATCH /api/jugadores/me` — actualiza perfil del jugador (todos los campos opcionales)
- `GET /api/reservas/pendientes` — reservas pendientes del club (admin only, excluye turnos fijos)
- `GET /api/jugadores/me/stats` — estadísticas reales del jugador (reservas + torneos)

### Stores migrados (eliminado localStorage)
- `authStore` — `user: null` al iniciar; `AdminDashboardLayout` recarga desde `GET /auth/admin/me`
- `playerStore` — `player: null` al iniciar; `PlayerLayout` recarga desde `GET /jugadores/me`
- `clubStore` — `loadFromBackend()` rediseñado para aceptar objeto club completo; sin escritura a localStorage

### LandingPage — siempre sincronizada con backend
- `LandingPage.jsx` hace `GET /clubs/{VITE_CLUB_SLUG}` al montar
- Llama `loadFromBackend(data)` → aplica colores CSS, templateId y config sin necesitar admin logueado
- `.env` creado con `VITE_CLUB_SLUG=club-demo`

### PanelAlertas — ahora lee del backend
- Reservas pendientes: `GET /api/reservas/pendientes` (admin only)
- Aprobación/rechazo: `PATCH /api/reservas/:id` con `{ estado }`
- Eliminado: lectura de `notificacionesStore` para reservas (era localStorage)

### Perfil jugador conectado al backend
- `DatosTab.handleSave` → `PATCH /jugadores/me` antes de actualizar store
- `PlayerProfilePage` pasa `token` al componente `DatosTab`

### APP_VERSION
- Bumpeado a `84.0` para limpiar localStorage stale en todos los browsers

---

## Último bloque completado (2026-05-13) — Turnos fijos: protección doble + notificaciones + liberar día

### Objetivos
Corregir y completar el flujo de turnos fijos: política de cancelación con cargo, turno manual admin → jugador ve en "Mis turnos fijos", protección doble contra solapamientos, confirmación antes de liberar, y "Liberar este día" desde grilla admin.

### Backend — `routes/turnos-fijos.js`
- **`GET /slots-ocupados`** (jugador): devuelve todos los TurnoFijos `confirmado` del club sin datos personales (`{ canchaId, dia, horaInicio, horaFin, diasAusentes, desde }`). Permite bloqueo visual en grilla del jugador.
- **`POST /:id/ausencia`**: ahora aplica política de cancelación (`horasCancelacion` del club). Si fuera de plazo: crea `Cargo` + notificación `cargo_cancelacion`. Respuesta incluye `{ cargoAplicado, monto }`.
- **`PATCH /:id/ausencia/:fecha`**: detecta si fue acción directa del admin (`!eraAusenciaPendiente`) → envía notificación `ausencia_admin_directa` al jugador.
- **`PATCH /:id/estado`**: diferencia notificaciones: `turno_fijo_baja` (era confirmado) vs `turno_fijo_rechazado` (era pendiente).

### Backend — `routes/reservas.js`
- **`POST /admin`**: cuando `esTurnoFijo: true` + `jugadorId`: crea `TurnoFijo` confirmado (derivando `dia` desde `fecha`) + notificación `turno_fijo_confirmado`. Protección: no duplica si ya existe uno activo para esa cancha+dia.
- **`POST /`** (jugador): antes de crear, verifica TurnoFijos activos. Devuelve 409 si hay conflicto de horario con un turno fijo que no tiene ausencia para esa fecha.
- **`PATCH /:id/estado`** (admin cancela): cuando `estado === 'cancelada'` y `esTurnoFijo === true`:
  1. Busca el TurnoFijo correspondiente (canchaId + dia + jugadorId + confirmado)
  2. Agrega `fecha` a `diasAusentes` del TurnoFijo → slot libre esa semana, turno sigue activo
  3. Envía `ausencia_admin_directa` (no `reserva_cancelada_admin`)

### Frontend — `PlayerTurnosFijosPage.jsx`
- `ModalAusencia` recibe `horasMinimas` desde clubStore y calcula `fueraDePlazo` internamente
- Si fuera de plazo: bloque ámbar de aviso + texto del botón cambia a "Confirmar ausencia (cargo $precio)"

### Frontend — `PlayerReservasPage.jsx`
- `slotsOcupadosClub`: fetch `GET /turnos-fijos/slots-ocupados` al montar + polling 30s
- `turnosFijosActivos`: fusiona propios + ajenos. Filtro defensivo: descarta entradas sin `canchaId`, `horaInicio`, `horaFin` nulo o `horaFin === horaInicio`
- `generarSlots` bloquea visualmente los slots de otros jugadores con turno fijo activo

### Frontend — `ReservasPage.jsx` (admin — TabTurnosFijos)
- Botón papelera ahora abre modal de confirmación antes de liberar (antes ejecutaba directo)
- `handleLiberarTurnoFijo`: calcula próxima ocurrencia y llama `PATCH /turnos-fijos/:id/ausencia/:fecha` (ausencia puntual, no baja permanente)
- Modal confirmación: ámbar, muestra fecha que se libera, aclara que el turno sigue activo para semanas siguientes

### Frontend — `PlayerDashboardPage.jsx`
- Widget "Mis turnos fijos" entre "Próximas reservas" y el grid principal
- Muestra hasta 3 turnos activos (violeta), badge de pendientes, link "Ver todos"

### Frontend — `PlayerNotificacionesPage.jsx` + `playerNotificationsStore.js`
- Nuevos tipos: `turno_fijo_baja` (naranja), `ausencia_admin_directa` (sky), `turno_fijo_rechazado`
- `formatCuerpo` actualizado para estos tipos

### Frontend — `PlayerLayout.jsx`
- Polling notificaciones reducido de 60s a 30s

### Completado en sesión 2026-05-14 — ver bloque debajo.

---

## Último bloque completado (2026-05-14) — Flujo turno fijo manual completo + landing disponibilidad

### Objetivo
Cerrar el flujo de turno fijo manual del admin: creación → notificación → aparece en "Mis turnos fijos" jugador → liberación desde grilla admin funciona correctamente. También: diferenciación de notificaciones por origen de la ausencia, landing muestra turnos fijos del jugador aprobados.

### Backend — `routes/turnos-fijos.js`
- **`mapTurno`**: agregado `diasAusentesJugador: t.diasAusentesJugador ?? []` para exponer el campo al frontend
- **`PATCH /:id/ausencia/:fecha`** (admin confirma ausencia):
  - Agrega `fecha` a `diasAusentesJugador` solo cuando era una ausencia pendiente del jugador (`eraAusenciaPendiente`)
  - Cancela la `Reserva` puntual asociada si existe (`esTurnoFijo: true, jugadorId`)
  - Siempre notifica al jugador con tipo diferenciado: `ausencia_confirmada` (jugador lo pidió) vs `ausencia_admin_directa` (admin lo liberó directo)

### Backend — `routes/reservas.js`
- **`PATCH /:id/estado`** cuando `estado='cancelada'` y `esTurnoFijo=true`:
  - Busca el TurnoFijo por `canchaId + dia + jugadorId + estado=confirmado`
  - Agrega la fecha a `diasAusentes` del TurnoFijo (liberación puntual, turno sigue activo)
  - Envía notificación `ausencia_admin_directa` al jugador

### Backend — `routes/clubs.js`
- **`GET /:slug/disponibilidad`**: ahora incluye TurnoFijos confirmados para el día de la semana (no solo Reservas puntuales)
  - Query: `{ clubId, dia, estado: 'confirmado' }` + filtro `diasAusentes` + filtro `desde`
  - Fix crítico: antes los TurnoFijos del jugador (que no crean Reserva) nunca aparecían en la landing

### Backend — `prisma/schema.prisma`
- **`TurnoFijo`**: nuevo campo `diasAusentesJugador String[]` — fechas solicitadas por el jugador y confirmadas por admin (para diferenciar de ausencias directas del admin)
- Aplicado con `npx prisma db push`

### Frontend — `ReservasPage.jsx` (admin)
- **`reservasDia` orden corregido**: `[...reservas, ...reservasBackendDia, ...turnosFijosDia]` — `reservasBackendDia` antes que `turnosFijosDia` para que `handleCancelar` llegue al branch correcto
- **`handleCancelar` branch `fijo_player_`**: cambiado `Number(id)` → `String(id)` (TF IDs son CUIDs, `Number('clxxx...')` daba NaN → turnosFijos.find nunca encontraba nada)
- **`handleCancelar` branch `fijo_player_`**: agrega llamada al backend `PATCH /turnos-fijos/:id/ausencia/:fecha` + refresca grilla
- **`handleAprobar` en PanelAlertas**: ahora `await` la llamada API antes de llamar `fetchReservasBackend()` (antes fire-and-forget causaba que la Reserva no estuviera cancelada cuando el frontend refrescaba)
- **`handleConfirmarAusenciaAdmin`**: agrega `fetchReservasBackend()` después de confirmar
- **Formulario nueva reserva (tipo fijo)**: eliminado el campo "Vigencia hasta" — el backend gestiona el `desde` automáticamente igual que el flujo del jugador

### Frontend — `PlayerTurnosFijosPage.jsx`
- Cards de turno activo diferencian entre ausencias según `diasAusentesJugador`:
  - `esAusenteJugador = true` → "Tu ausencia fue confirmada"
  - `esAusenteJugador = false` → "El club liberó tu turno este día"
- Fetch de `/turnos-fijos/me` al montar (en `useEffect`) para cargar TurnosFijos actualizados desde backend

### Frontend — `playerNotificationsStore.js`
- Nuevo tipo `ausencia_confirmada`: título "Tu ausencia fue confirmada", ícono CheckCircle, color emerald
- `formatCuerpo` actualizado para construir el cuerpo de `ausencia_confirmada`

### Frontend — `PlayerNotificacionesPage.jsx`
- `ausencia_confirmada`: CheckCircle icon, color emerald
- `ausencia_admin_directa`: CalendarDays icon, color amber (diferente de la confirmación del jugador)

### Causa raíz del bug de landing
El backend corría con código viejo (proceso Node.js iniciado antes de aplicar el fix en `clubs.js`). Solución: usar siempre `npm run dev` (nodemon) en lugar de `node src/index.js` para que los cambios de archivo se recarguen automáticamente.

### Limpieza
- Eliminados archivos basura en raíz creados por hooks de `@claude-flow/cli` (`t.activo`, `f.canchaId`, etc.)
- Agregados `.claude-flow/`, `.swarm/` al `.gitignore`

---

## Último bloque completado (2026-05-17 sesión 2) — Alta rápida, validación form, historial drawer, fixes grilla

### Funcionalidades implementadas

**ReservasPage — Alta rápida de jugador**
- Buscador de jugador en `FormNuevaReserva` y `EditarReserva`: si no se encuentra → botón "+ Dar de alta rápida"
- Mini-form inline: nombre, apellido, DNI. Crea jugador con `cuentaActiva: false` y lo auto-selecciona
- Pre-fill inteligente: si la query es solo dígitos → va al campo DNI; si es texto → al campo nombre
- Validación por campo con patrón `form-validation.md`: hint ámbar (desaparece 2s) + error rojo persistente
  - Nombre/apellido: bloquea dígitos en tiempo real
  - DNI: solo números, máx 8 dígitos (enforced en buscador y en el campo)
- Confirmar reserva/TF requiere `jugadorSel` — texto libre en buscador sin selección bloquea el submit

**ReservasPage — Botón cancelar bloqueado post-turno**
- `yaTermino = esPasado(reserva.fecha, reserva.fin)` — true cuando la hora de fin del turno ya pasó
- Botones "Cancelar reserva", "Liberar este día", "Cancelar clase" → deshabilitados con aviso explicativo
- "Marcar como pagado" sigue activo (se necesita cobrar aunque el turno haya terminado)

**JugadoresAdminPage — Historial expandible en drawer**
- Cards "Turnos fijos" y "Reservas" son ahora botones con ChevronDown toggle
- Al primer click: fetch bajo demanda al backend, datos cacheados en estado local
- Lista con día/fecha, horario, cancha y estado por cada registro

**Backend**
- `GET /api/reservas/jugador/:id` — admin: historial de reservas eventuales de un jugador
- `GET /api/turnos-fijos/jugador/:id` — admin: turnos fijos de un jugador
- `_count.reservas` en `GET /api/jugadores` excluye `esTurnoFijo:true` (fix doble conteo)

**Pendientes guardados en memoria para bloque pagos**
- Cargos/deudas deben filtrarse por `jugadorId` FK (no texto libre)
- Dar de baja / eliminar jugador bloqueado si tiene cargos pendientes

---

## Último bloque completado (2026-05-17) — Jugadores admin: directorio completo + protección cuentas

### Funcionalidades implementadas

**Schema Prisma**
- `Jugador`: `cuentaActiva Boolean @default(true)` y `password String?` (opcional para pre-registro)
- `Jugador`: `activo Boolean @default(true)` para baja lógica (ya existía)

**Backend — `routes/jugadores.js`**
- `GET /` — lista todos los jugadores del club con `_count` de turnosFijos y reservas
- `POST /` — alta manual (cuentaActiva: false, sin password)
- `PATCH /:id` — edición de datos + acepta `activo: true/false`
- `DELETE /:id` — eliminar jugadores sin cuenta (cuentaActiva: false)
- Rutas de jugador añaden `requireActive` middleware

**Backend — `middleware/auth.js`**
- `requireActive` — verifica `activo: true` en DB antes de procesar rutas de jugador. Devuelve `{ error: 'cuenta_inactiva', message: '...' }` si inactivo.

**Backend — `routes/auth.js`**
- Registro: detecta DNI existente con `cuentaActiva: false` → merge (activa + asigna password) en vez de 409
- Login: bloquea con 403 si `activo: false`, mensaje claro "Tu cuenta fue dada de baja. Contactá al club."

**Frontend — `JugadoresAdminPage.jsx`** (nuevo archivo)
- Lista con avatares de colores, estados visuales por bolita (verde/rojo/gradiente verde-amarillo)
- `ModalAlta`: validación real-time (nombre/apellido bloquea números, DNI solo dígitos 7-8)
- `ModalEditar`: misma validación, DNI bloqueado para activos
- `DrawerJugador`: ficha completa con stats, contacto, estado y acciones (editar/dar de baja/reactivar/eliminar)
- `ModalConfirm`: ventana custom para confirmar eliminación y baja (reemplaza `window.confirm`)
- Filtros: todos / activos / sin cuenta / inactivos
- Leyenda de colores + panel de ayuda (HelpCircle) con explicación de estados y match por DNI
- Toast de confirmación en alta/edición/baja/reactivación

**Frontend — `api.js`**
- Detecta `error: 'cuenta_inactiva'` y dispara `CustomEvent('jugador:cuenta-inactiva')`

**Frontend — `PlayerLayout.jsx`**
- Escucha `jugador:cuenta-inactiva` → muestra modal rojo "Cuenta desactivada" → logout + redirect

**Rutas nuevas:**
- `/dashboardAdmin/jugadores` → JugadoresAdminPage

---

## Próximos pasos en orden

1. **Terminar responsive** — revisar secciones pendientes (ver checklist arriba) — puede hacerse en paralelo
2. ✅ **Backend Bloque 1** — setup base completo (`project/apps/backend/`)
3. ✅ **Backend Bloque 2** — Auth JWT completo. Login admin/jugador/profesor + registro jugador conectados al frontend real
4. ✅ **Backend Bloque 3** — Reservas CRUD completo
5. ✅ **Backend Bloque 4** — Torneos completo. Torneo + Pareja en Prisma. 14 endpoints REST. TorneosPage + TorneoDetallePage + PlayerTournamentsPage conectados al backend. Fix Number(id)→String para cuid routing.
6. **Backend Bloque 5** — Flyer: mover generación a endpoint Railway (hcti.io o screenshot API) cuando haya backend. Por ahora funciona 100% en browser con Satori.
7. **Backend Bloque 5** — Stats jugador, mis-reservas, Google OAuth
7. **Landing SaaS** — cuando haya primer cliente potencial

---

## Sesión 2026-06-23 (tarde) — Convocatorias dinámicas + WIarky robusto

### Form admin DINÁMICO (`ConvocatoriasAdminPage.jsx`)
- **Picker de horarios**: elegís fecha → muestra SOLO franjas con ≥N canchas libres (botones), no más `input type=time`. `GET /convocatorias/slots-libres?fecha&canchas`.
- **Filtra hora actual**: si es hoy, descarta franjas pasadas (`ahoraArgHHMM`). Fecha pasada → vacío. `min`=hoy en el date input.
- **Canchas mín. 2** (1 = turno común) y **tope = canchas activas del club** (`GET /convocatorias/canchas-activas`).
- **Buscador de organizador = mismo flujo que crear turno**: componente reusable nuevo `components/jugadores/BuscadorJugador.jsx` (input + lupa + modal Todos/Con/Sin cuenta + alta rápida). NO se tocó ReservasPage.
- **Categorías = checkboxes 1ra–8va** (multi). **Género** masc/fem/mixto (campo nuevo `Convocatoria.genero`, db push aditivo). Va en el mensaje de WhatsApp.

### Super 8 — solo PAREJAS SUGERIDAS, no fixture (decisión Luca)
- Al llenarse: cierra inscripción + genera **parejas drive/revés** (sin rondas). El fixture se arma EN LA CANCHA. Nivel = categoría + autoselección, no algoritmo. `generarFixtureConvocatoria` super8 → `{ sugeridas:true, parejas }`. Americano sigue con fixture rotativo. `FixtureView` renderiza ambos.

### Lado jugador (`PlayerEventosPage.jsx`)
- Evento **expandible** → anotados divididos **Drive / Revés / Sin lado** (`GET /convocatorias/:id`).

### Notif `convocatoria_abierta`
- El backend ya la creaba (por categoría, si pública). Faltaba render: `playerNotificationsStore` + `PlayerNotificacionesPage` (ícono Megáfono, **clickeable → /dashboardJugadores/eventos**).

### WIarky — TODO verificación por código (no prompt)
- **Regla de oro** + **red de seguridad** en el loop: no afirma "creado" sin generar botón; si lo hace, lo fuerza a reintentar.
- **crear_convocatoria reordenado**: verifica disponibilidad PRIMERO (solo modalidad+fecha+hora; sacados de `required`), después organizador → cupos(Americano) → género → categoría → pública/privada. Sin todo, NO hay botón. Hora sin 2+ canchas → devuelve horarios reales.
- **`horarios_para_evento`** (tool): cruza canchas por código (WIarky erraba la intersección mental, ofrecía franjas con 1 cancha).
- **`buscar_jugador`** (tool) + matching **sin acentos** ("julian"→"Julián") + parcial; si hay varios los lista.
- **crear_jugador**: valida nombre/apellido sin números, DNI 7-8 dígitos, no duplica.
- **Fechas**: próximos 8 días (día→fecha) en el contexto (erraba el día de semana).
- **Tras alta de jugador**: el chat sigue solo (mensaje oculto) → tira el botón de convocar.

## Sesión 2026-06-24 — Notif cancelación + Fase B (jugador organiza)

### Notificar al cancelar/eliminar (HECHO)
- Backend `notificarConvocatoriaCancelada` avisa a los anotados (voy+espera) tipo `convocatoria_cancelada` (modalidad, fecha, hora, **motivo**). Lo usan cancelar (PATCH estado) y eliminar (DELETE). Acepta `exceptoJugadorId` (para no avisarle al que cancela).
- Admin: modal de motivo (presets Falta de jugadores/Lluvia/Cambio de horario/Otro + texto libre), muestra a cuántos avisa.
- Jugador: render de la notif (ícono rojo + motivo).

### Fase B — el jugador organiza su propio evento (HECHO, decisiones de Luca)
- **Reserva al crear** (garantiza el evento) + **el jugador queda auto-anotado**. Anti-abuso: **máx. 1 evento activo por jugador**.
- **Visibilidad la elige el jugador**: pública (notifica a la categoría, ej. 4ta) o privada (solo por link, su grupo).
- Backend: `POST /convocatorias/mias` (crear, reusa `crearConvocatoriaCompleta`), `POST /convocatorias/mias/:id/cancelar` (solo el organizador; libera canchas + avisa a los anotados menos a él). `GET /mias` marca `soyOrganizador`. `slots-libres` y `canchas-activas` ahora también para jugador.
- Frontend (`PlayerEventosPage`): botón **Organizar** + `OrganizarModal` (modalidad → fecha → horarios dinámicos 2+ canchas → género → categorías → público/privado → mensaje para compartir). En "Mis eventos", si sos organizador: chip "Organizás" + **Cancelar evento**. **`ConfirmModal` propio** (adiós al `confirm()` nativo).

### Ver anotados en la página pública (HECHO)
- En `ConvocatoriaPublicaPage` (la del link), sección **"Quiénes van"** con la lista de anotados (nombres numerados + lado D/R), para decidir antes de anotarse. **Solo jugadores logueados** la ven (privacidad: el anónimo ve solo el contador 2/8). Reusa el endpoint autenticado `/convocatorias/:id`, sin cambios de backend. Se refresca al anotarse/bajarse.

### Modo en vivo — carga de resultados + ranking en vivo (HECHO)
- Reusa el motor `lib/eventos.js` (fixture + validación de sets/puntos + ranking). El estado se guarda en `Convocatoria.fixture` (Json) vía `PATCH /convocatorias/:id/fixture` (solo organizador `createdBy` o admin; "scoreboard duty").
- **Pantalla de carga** (`components/eventos/CargarResultados.jsx`, overlay oscuro full-screen): Super 8 → armado de **parejas por CLICK** (sin escribir: tocás dos para emparejar, tocás una pareja para deshacer) → round-robin → carga de sets → **ranking por pareja en vivo**. Americano → rondas rotativas → carga → ranking individual. Guarda debounced.
- **Entradas**: organizador desde su dash (`PlayerEventosPage`, en el evento expandido) Y desde el **propio link público** (`ConvocatoriaPublicaPage`, botón solo si `soyOrganizador` — flag nuevo en `GET /:id`). Admin desde `ConvocatoriasAdminPage` (detalle, ≥4 anotados). Los demás NO cargan (read-only + auth en backend).
- **Vista pública en vivo (Bloque 3)**: `ConvocatoriaPublicaPage` muestra sección **"Ranking en vivo"** (puntito latiendo) cuando el fixture tiene resultados, read-only, **auto-refresh 15s**, para proyectar en la TV / compartir link. El endpoint público `/publica/:id` ahora incluye `fixture` (nombres OK, decisión Luca).

### Historial social (HECHO, opción b — separado de stats serias)
- **Finalizar evento**: en el Modo en vivo, botón "Finalizar evento" (confirmación inline, sin `confirm()` nativo) → `PATCH /:id/fixture` con `finalizar:true` setea estado `jugada` y congela el snapshot. Organizador o admin.
- **Endpoint** `GET /convocatorias/mis-jugados` (jugador): eventos `jugada` donde estuvo anotado, con `fixture` + `miNombre` (para calcular su posición en el front).
- **Sección "Jugados"** en `PlayerEventosPage` (abajo de Mis eventos/Abiertos): números blandos (jugados, posición promedio, mejor) + lista con su **posición final** por evento + **expandible a la TABLA final completa** (reusa `rankingAmericano`/`rankingSuper8`, matchea nombres normalizados). Vos resaltado.
- **REGLA DURA respetada**: `/mis-jugados` es totalmente aparte — NO toca winRate / comparativa / ascensos (exclusivo de torneos). Motivo: Playtomic guarda lo "friendly" pero no mueve el rating.

### Pendiente
- Borrar convocatorias de prueba.

---

## Sesión 2026-06-24 (tarde) — Hardening RESERVAS + "Busco un cuarto" (caso 2)

### Bug cross-midnight (turnos que terminan 00:30/01:00) — CORREGIDO + blindado
- Clubes que cierran después de medianoche → reservas/clases que terminan 00:30/01:00. El chequeo angosto `horaFin === '00:00' ? 1440 : toMin(fin)` invertía el rango (finMin < inicio) → deuda/cobro fantasma, "en curso"/%ocupación mal, duración 0, turnos futuros marcados "Finalizado".
- Corregido en: `deudas.js`, `clubs.js` (enCurso), `AdminDashboardPage`, `ReservasPage` (venceCobro + yaTermino), `ClasesProfesorAdminPage`, `PlayerMisReservasPage`, `PlayerDashboardPage`.
- **Prevención**: helper único `finEnMin`/`cruzaMedianoche`/`duracionMin` en `backend/src/lib/tiempo.js` y `frontend/src/utils/timeUtils.js` + tests (`tiempo.test.js`, `npm test`) + regla dura en `CLAUDE.md` (prohibido el patrón viejo).

### Agujero cross-resource en turnos fijos — CERRADO (fuente única)
- El TF que pide el jugador con auto-confirma ON chequeaba SOLO otros TF (no reservas ni clases) → podía pisar una reserva/clase. **Cerrado** con `lib/conflictos.js`: `conflictoEnFecha`/`conflictoEnDia` (chequean reservas+clases+TF, cross-midnight). Lo usa el TF (crear + confirmar). `duracionMin` para validar 90' (un TF 23:00→00:30 ya no se rechaza mal).
- **Pendiente de consolidar** (correcto pero no unificado): reserva eventual / clase / convocatoria todavía usan su `overlaps` local — falta migrarlas a `conflictoEnFecha` para que NO puedan divergir.

### Concurrencia
- `runSerializable`: más reintentos + backoff con jitter (evita livelock bajo ráfaga concurrente). El anti-doble-booking ya era correcto (Serializable); esto lo hace robusto bajo carga.
- **Suite `npm run test:concurrencia`** (`scripts/concurrencia.mjs`): 12 escenarios verde x3 — idénticos/solapados/no-solapados/multi-cancha, reserva↔TF↔clase↔convocatoria, cross-midnight, stress 50, cancelar+rebook, y el fix del agujero TF. **Probado bajo fuego real, no solo auditoría.**
- ⏳ Agente QA enumerando matriz exhaustiva (ausencias, auto-confirma ON/OFF, liberar+reservar) — relanzar la próxima sesión para sumar a la suite los que falten.

### "Busco un jugador" (matching caso 2) — VALIDADO e2e
- Modelo `SolicitudJugador` (busco jugador|pareja, reservaId). `routes/solicitudes.js`. **Crear desde Mis Reservas** (botón por reserva, pre-llenado, estado Buscando/Cubierto). **Responder desde Eventos** (¡Voy!/¡Vamos!). Notifs `busca_jugador`/`solicitud_cubierta`. Probado de punta a punta con 2 jugadores de 4ta.
- **DEUDA #2 (categorías)**: los chips dicen "4ta" pero la base guarda "4ta Categoría" → no matchean. Hoy funciona dejando la categoría vacía. Alinear (afecta busco-jugador Y convocatorias).

### ▶️ ARRANCAR PRÓXIMA SESIÓN POR
1. Relanzar agente QA de concurrencia → sumar escenarios faltantes a la suite + **consolidar reserva/clase/convocatoria a `conflictos.js`** (cierre total del bloque reservas).
2. **Deuda #2**: alinear formato de categorías (chips ↔ base).
3. Matching caso 1 (botón landing "no tengo con quién jugar" → convocatorias abiertas de mi categoría). Borrar data de prueba.

## 2026-07-20 — QR de billetera interoperable: FACTIBILIDAD CONFIRMADA (spike S0)

Cerró un maratón (cobros MP completos: link multi-deuda, QR presencial venta/mesa, pago iniciado por el jugador probado en vivo, anti-doble-click, transferencia con IA/comprobante inteligente + parcial + obligatorio, historial unificado en Cobranzas con filtro por fecha).

**Nuevo hallazgo (spike S0):** el **QR de billetera interoperable** (cualquier billetera, no solo MP — Transferencias 3.0) **ES VIABLE**. El riesgo era el rubro (MCC) al crear la caja/POS → **resuelto: sin `category` = rubro genérico, MP lo acepta**. Store + POS creados OK contra la cuenta real (con `qr.image`). Detalle completo + payloads que funcionan + plan de slices en memoria: `project_qr_billetera_interoperable.md`. Archivo de referencia: `project/apps/backend/spike-qr.mjs` (temp, untracked).

### ▶️ MAÑANA (pedido explícito de Luca): arrancar **QR billetera GUIADO paso a paso**
- **S1** crear/asegurar caja del club idempotente (guardar posId) → **S2** orden con monto (qr_data) → **S3** front (QR al lado del de Checkout Pro) → **S4** webhook topic `order` → **S5** ciclo de vida + prueba en vivo.
- **Después del QR billetera:** la lista de pendientes pre-deploy (config producción, cobros futuros diseño, post-deploy, roadmap, bugs).
- Limpieza: borrar store/POS "Spike" (ids 85025878 / 135593781) de la cuenta MP al armar las definitivas.

## 2026-07-21 — QR de billetera interoperable: IMPLEMENTADO (S1-S5)

Bloque completo, guiado slice por slice con Luca. Cobrar a un jugador mostrándole un QR que paga con **cualquier billetera** (MODO, Ualá, Naranja X, banco, MP) — no solo la app de Mercado Pago. Independiente de Checkout Pro (que sigue igual). Detalle técnico completo (archivos, endpoints, payloads, aprendizajes) en memoria `project_qr_billetera_interoperable.md`.

- **S1** `lib/cobrosQR.js` `asegurarCajaQR` (store+POS idempotente por club, campos en `MpConexion`). Probado vivo.
- **S2** `crearOrdenQR` + `PagoMP.tipo='qr'` + `POST /pagos/qr/cobrar`. Orden dinámica sobre el POS (`PUT /instore/qr/.../orders`). Probado vivo.
- **S3** `PagosPage.jsx`: botón violeta "QR billetera" + modal con el QR (PNG de MP, logo Transferencias 3.0). Visto andando.
- **S4** `webhooks.js`: rama `merchant_order` → reusa `procesarPago` (idempotencia, Serializable, avisa al dueño). `obtenerMerchantOrder` en mercadopago.js.
- **S5** anti-doble-cobro: una orden viva por caja (supersede), `POST /pagos/qr/:id/cancelar`, y `cancelarOrdenesQRDeItems` enganchado en cargos.js (si se cobra en efectivo, el QR se mata). Probado vivo.

**Clave técnica:** POS SIN category = rubro genérico (resolvió `pos_unknown_mcc`); external_id del POS alfanumérico; orden va a `/instore/qr/.../orders`. La caja se crea SOLA (lazy) al primer cobro QR — el dueño solo necesita MP conectado (OAuth). Cero pasos extra en el panel de MP.

### ▶️ FALTA para cerrar el QR billetera: **prueba viva post-deploy**
El webhook `merchant_order` tiene que estar en Railway (MP no alcanza localhost). Deploy → generar QR desde Cobranzas → pagar con otra billetera → ver deuda saldada sola + campanita del dueño + revisar logs Railway.

### ▶️ DESPUÉS: la lista de pendientes pre-deploy
Config producción (vaciar MP_ACCESS_TOKEN Railway, firma webhook obligatoria, verif email signup, bajar body limit, proteger /api/dev), cobros futuros (diseño saldo a favor + limpieza comprobantes), post-deploy (re-subir imágenes, caché Storage, guía onboarding 2º club), roadmap (feature gating, WhatsApp, stats, features.md), bugs (categorías, matching caso 1, consolidar conflictos.js).
