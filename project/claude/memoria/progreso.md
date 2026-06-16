# Progreso del Proyecto

**Última actualización:** 2026-06-16 — Capa SaaS Fase B COMPLETA: + editor de matriz y regalitos por club

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
