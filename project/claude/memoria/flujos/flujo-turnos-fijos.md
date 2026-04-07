# Flujo: Turnos Fijos

Turnos recurrentes semanales (mismo día y horario cada semana).  
Stores: `reservasStore` (solicitud) + `turnosFijosStore` (turno aprobado)  
Reglas aplicadas: RN-13 a RN-17.

---

## Solicitud del jugador

1. Jugador va a `/dashboardJugadores/reservas`
2. Selecciona fecha, cancha y slot libre (igual que reserva eventual)
3. Modal se abre → jugador activa toggle "Turno fijo semanal"
4. Modal cambia a modo turno fijo: fondo ámbar, texto indica recurrencia semanal
5. Jugador confirma
6. `reservasStore.addReserva({ esTurnoFijo: true })` → estado: `pendiente`, `_aprobadoPorAdmin: false` (RN-14)
7. `notificacionesStore.solicitudTurnoFijo()` → admin recibe notificación (RN-24)
8. `playerNotificationsStore.addSolicitudEnviada()` → jugador recibe acuse de recibo (RN-26)
9. Toast: "Solicitud de turno fijo enviada."
10. Slot en grilla: estado **pendiente** con indicador de turno fijo

---

## Aprobación del admin (dos acciones obligatorias)

11. Admin ve notificación de solicitud de turno fijo
12. Admin va a `/dashboardAdmin/reservas` → slot aparece como tipo `solicitud_fijo` (ámbar)
13. Admin abre el detalle
14. Admin aprueba la solicitud — el sistema ejecuta dos acciones (RN-16):
    - `reservasStore.confirmarReserva(id)` → marca la reserva original como confirmada
    - `turnosFijosStore.addTurnoFijo({ dia, inicio, fin, canchaId, ... })` → crea el turno fijo recurrente
15. `playerNotificationsStore.addSolicitudAprobada()` → jugador notificado (RN-27)
16. Slot en grilla admin: cambia a tipo `fijo` (violeta)
17. En `PlayerTurnosFijosPage`: aparece el turno fijo activo en la lista del jugador

---

## Estado del turno fijo aprobado

- El turno fijo existe en `turnosFijosStore` con `activo: true`
- Bloquea el slot correspondiente cada semana en ambas grillas (RN-17)
- El jugador lo ve en `/dashboardJugadores/turnos-fijos` con:
  - Cancha, día de semana, horario, precio
  - Próxima fecha calculada (hoy si corresponde, o siguiente ocurrencia)
  - Barra lateral violeta = activo normal

---

## Baja permanente de turno fijo (por admin)

- Admin puede dar de baja un turno fijo: `turnosFijosStore.liberarTurno(id)` → `activo: false`
- El slot queda libre para siempre desde esa fecha
- La reserva original en `reservasStore` permanece (historial)
