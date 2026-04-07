# Flujo: Administrador — Gestión general

Cubre el acceso del admin y sus acciones principales sobre la grilla y el club.  
Stores: `authStore`, `notificacionesStore`, `reservasStore`, `turnosFijosStore`, `clubStore`  
Reglas aplicadas: RN-32 a RN-34, RN-39 a RN-41.

---

## Login del admin

1. Admin va a `/login`
2. Si ya tiene token válido → redirige a `/dashboardAdmin`
3. Ingresa credenciales
4. `authStore.login(user, token)` → guarda `token` en localStorage (RN-32)
5. Redirige a `/dashboardAdmin`

---

## Dashboard principal (`/dashboardAdmin`)

Muestra resumen del club:
- Canchas disponibles, reservas del día, jugadores activos
- Torneos activos, ingresos del día, ingresos del mes
- Feed de actividad reciente
- (actualmente con datos mock — conectar a API en futuro)

---

## Gestión de la grilla (`/dashboardAdmin/reservas`)

1. Admin navega entre fechas con flechas (día anterior / siguiente)
2. Grilla: filas = franjas horarias (11 franjas de 1.5h), columnas = canchas activas
3. Cada celda puede tener uno de 6 tipos (RN-33):

| Tipo | Color | Origen |
|---|---|---|
| `fijo` | Violeta | Turno fijo aprobado (recurrente) |
| `eventual` | Azul | Reserva eventual confirmada |
| `bloqueado` | Gris | Bloqueado manualmente por admin |
| `clase` | Naranja | Clase del club (profesor) |
| `online` | Verde | Solicitud de reserva del jugador (pendiente) |
| `solicitud_fijo` | Ámbar | Solicitud de turno fijo del jugador (pendiente) |

---

## Aprobación de reserva eventual

1. Admin ve slot tipo `online` (verde)
2. Abre modal de detalle → datos del jugador, horario, precio
3. Admin aprueba → ver [flujo-reservas-eventuales.md](flujo-reservas-eventuales.md) paso 14

---

## Aprobación de turno fijo

1. Admin ve slot tipo `solicitud_fijo` (ámbar)
2. Abre modal de detalle → nombre del jugador, día de recurrencia, horario, precio
3. Admin aprueba → ver [flujo-turnos-fijos.md](flujo-turnos-fijos.md) paso 14

---

## Confirmación de ausencia de turno fijo

1. Admin recibe notificación de ausencia pendiente
2. Ve el slot en la grilla con indicador de ausencia pendiente
3. Admin confirma la ausencia → ver [flujo-ausencias.md](flujo-ausencias.md) paso 14

---

## Cancelación manual de reserva eventual (sin pedido del jugador)

El jugador avisa por WhatsApp u otro canal externo al dashboard — el admin actúa directamente:

1. Admin localiza el slot en la grilla (tipo `online`, color verde)
2. Abre el panel lateral → botón "Cancelar reserva"
3. `reservasStore.cancelarReserva(id, { notificarAdmin: false })` → estado `cancelada`
4. `playerNotificationsStore.addReservaCanceladaAdmin()` → jugador notificado
5. Slot vuelve a aparecer como **libre** en la grilla y en el dashboard del jugador

---

## Liberación puntual de turno fijo (sin pedido del jugador)

El jugador avisa por canal externo — el admin libera ese día directamente:

1. Admin localiza el slot en la grilla (tipo `fijo`, color violeta)
2. Abre el panel lateral → botón "Liberar este día"
3. `turnosFijosStore.ausentarDia(turnoFijoId, fecha)` → fecha entra en `diasAusentes` directamente (sin pasar por `ausenciasPendientes`)
4. `playerNotificationsStore.addTurnoFijoLiberadoAdmin()` → jugador notificado
5. Slot queda **libre** en la grilla y en el dashboard del jugador para esa fecha
6. La semana siguiente el turno sigue activo normalmente

> **Futuro**: este flujo será automatizado vía chatbot de WhatsApp conectado al backend (RN-11b, RN-11c).

---

## Baja permanente de turno fijo (tabla de turnos fijos)

1. Admin va a la pestaña "Turnos fijos" → botón trash (🗑) en la fila del turno
2. `turnosFijosStore.liberarTurno(id)` → `activo: false`
3. Si el turno tenía `reservaId`: `reservasStore.cancelarReserva(reservaId, { notificarAdmin: false })`
4. `playerNotificationsStore.addTurnoFijoBajaPermanente()` → jugador notificado
5. El turno desaparece de la grilla permanentemente para todas las semanas futuras

---

## Bloqueo manual de slot

1. Admin hace click en slot libre
2. Elige "Bloquear slot"
3. Selecciona razón: Mantenimiento / Torneo / Evento privado / Otro (RN-34)
4. Slot aparece como tipo `bloqueado` (gris) para esa fecha y horario

---

## Configuración del club (`/dashboardAdmin/club`)

1. Admin edita nombre, logo, descripción, horarios, datos de contacto
2. Gestiona canchas: agregar, editar precio, activar/desactivar
3. Edita secciones de la landing (servicios, staff, FAQ)
4. Activa o desactiva secciones visibles en la landing pública (RN-40)
5. `clubStore.saveClub()` → persiste en localStorage + aplica colores CSS al DOM (RN-41)

---

## Notificaciones del admin

- Badge rojo en el navbar muestra cantidad de notificaciones no leídas
- Al abrir: lista con notificaciones de reservas, turnos fijos y ausencias pendientes
- `notificacionesStore.marcarLeida(id)` o `marcarTodasLeidas()`
- Las notificaciones no desaparecen, solo cambian estado a leída (RN-25)
