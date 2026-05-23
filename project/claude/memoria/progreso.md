# Progreso del Proyecto

**Última actualización:** 2026-05-23 (sesión — Página "Mis reservas" jugador, toasts duales persistentes, banners compactos de acceso rápido, mejoras panel admin Avisos + click notificación TF.)

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
| Dashboard profesor (agenda + disponibilidad) | ✅ Completo | Portal separado `/dashboardProfesor`. Disponibilidad DB-connected. Tab "Clases del profesor" en admin. Endpoints: `POST /reservas/admin/clase-profesor`, `POST /reservas/profesor`, `GET /turnos-fijos/slots-dia`. TurnosFijos bloquean modal agenda. |
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
- [ ] PlayerTournamentsPage mobile

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
- `/dashboardAdmin/torneos` → lista de torneos
- `/dashboardAdmin/torneos/:id` → detalle del torneo
- `/dashboardAdmin/pagos` → pagos

### Profesor (`/dashboardProfesor`)
- `/dashboardProfesor` → login
- `/dashboardProfesor/agenda` → agenda de clases
- `/dashboardProfesor/disponibilidad` → horarios disponibles

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
