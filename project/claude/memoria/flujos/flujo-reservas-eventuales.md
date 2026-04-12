# Flujo: Reservas Eventuales

Reservas para una fecha puntual. No son recurrentes.  
Store: `reservasStore` · Reglas aplicadas: RN-07 a RN-12, RN-52.

---

## Solicitud del jugador

1. Jugador va a `/dashboardJugadores/reservas`
2. Selecciona una fecha dentro del rango de 14 días disponibles (RN-12)
3. Selecciona una cancha activa (RN-03)
4. La grilla genera los slots de 1.5h (RN-04, RN-05) y calcula el estado de cada uno:
   - **Libre**: disponible para reservar
   - **Pasado**: slot cuya hora de inicio ya transcurrió hoy — no reservable (RN-52)
   - **Ocupado**: bloqueado por turno fijo activo o reserva de otro jugador
   - **Mi reserva confirmada**: ya tiene una reserva aprobada en ese slot
   - **Mi reserva pendiente**: tiene una solicitud pendiente de aprobación
   - **Baja pendiente**: turno fijo propio con ausencia avisada pero no confirmada por admin
5. Jugador hace click en un slot libre
6. Modal muestra: cancha, horario (inicio–fin 1.5h), precio (RN-06, RN-38)
7. Toggle "Turno fijo semanal" permanece **desactivado**
8. Jugador confirma la reserva
9. `reservasStore.addReserva({ esTurnoFijo: false })` → estado: `pendiente`, `_aprobadoPorAdmin: false` (RN-08)
10. `notificacionesStore.nuevaReservaJugador()` → admin recibe notificación (RN-24)
11. `playerNotificationsStore.addSolicitudEnviada()` → jugador recibe acuse de recibo (RN-26)
12. Toast: "Solicitud enviada. El admin la revisará."
13. Slot en grilla del jugador cambia a estado **pendiente** (ámbar)

---

## Aprobación del admin

14. Admin ve notificación de nueva reserva en su panel
15. Admin va a `/dashboardAdmin/reservas` → slot aparece como tipo `online` (verde)
16. Admin abre el detalle del slot
17. Admin aprueba la reserva
18. `reservasStore.confirmarReserva(id)` → estado: `confirmada`, `_aprobadoPorAdmin: true` (RN-09)
19. `playerNotificationsStore.addReservaConfirmada()` → jugador notificado (RN-27)
20. Slot en grilla del admin cambia a tipo `eventual` (azul)
21. Slot en grilla del jugador cambia a estado **confirmada**

---

## Cancelación por el jugador

- El jugador puede cancelar desde "Mis próximas reservas" (botón X)
- `reservasStore.cancelarReserva(id)` → estado: `cancelada` (RN-11)
- El slot vuelve a aparecer como libre en la grilla
- No hay notificación automática al admin en este flujo (pendiente implementar)

---

## Estados posibles de una reserva eventual

| Estado | Significado |
|---|---|
| `pendiente` | Enviada por jugador, esperando aprobación admin |
| `confirmada` | Aprobada por admin (`_aprobadoPorAdmin: true`) |
| `cancelada` | Cancelada por el jugador |
