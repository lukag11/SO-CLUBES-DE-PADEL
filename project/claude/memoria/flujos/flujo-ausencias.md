# Flujo: Ausencias en Turnos Fijos

El jugador avisa que no puede asistir a una ocurrencia de su turno fijo.  
Store: `turnosFijosStore`  
Reglas aplicadas: RN-18 a RN-23.

---

## Estados de una ausencia

```
[Sin ausencia] → Jugador avisa → [ausenciasPendiente] → Admin confirma → [diasAusentes]
                                      ↓                                       ↓
                              Slot: "Baja pendiente"               Slot: "Libre"
                              (bloqueado para otros)             (disponible para todos)
```

---

## Paso 1 — Jugador avisa ausencia

1. Jugador va a `/dashboardJugadores/turnos-fijos`
2. Ve lista de turnos fijos activos
3. Para cada turno, el sistema calcula la próxima fecha disponible (RN-19, RN-20):
   - Si hoy es el día del turno Y la hora de inicio no pasó → fecha = hoy
   - Si no → busca la próxima ocurrencia (máximo 7 días hacia adelante)
4. Botón "No puedo ir" habilitado solo si no hay ausencia ya registrada para esa fecha (RN-23)
5. Jugador presiona "No puedo ir"
6. Modal muestra la fecha calculada con badge "Hoy" si corresponde
7. Jugador confirma
8. `turnosFijosStore.registrarAusenciaPendiente(id, fechaISO)` → fecha entra en `ausenciasPendientes` (RN-21)
9. `notificacionesStore.liberarTurno(...)` → admin recibe notificación (RN-24)
10. Barra lateral del turno cambia a **ámbar**: "Ausencia pendiente de confirmación"
11. En grilla de reservas del jugador: slot muestra "Baja pendiente de admin" en rojo

> El slot sigue bloqueado para otros jugadores mientras la ausencia esté pendiente (RN-21)

---

## Paso 2 — Admin confirma la ausencia

12. Admin ve notificación de ausencia pendiente
13. Admin va a `/dashboardAdmin/reservas` → puede ver el slot con ausencia pendiente
14. Admin aprueba la ausencia
15. `turnosFijosStore.ausentarDia(id, fechaISO)`:
    - Elimina la fecha de `ausenciasPendientes`
    - Agrega la fecha a `diasAusentes` (RN-22)
16. `playerNotificationsStore.addAusenciaConfirmada()` → jugador notificado (RN-27)
17. Barra lateral del turno cambia a **gris**: "Ausencia confirmada por el admin"
18. En grilla de reservas del jugador: slot vuelve a aparecer como **libre** (RN-22)
19. Slot queda disponible para que otro jugador lo reserve

---

## Validación cruzada en la grilla del jugador

El slot se muestra como **libre** después de una ausencia confirmada porque:

- `turnosFijosActivos` = turnos con `activo: true` que NO tienen la fecha en `diasAusentes`
- `miReservaConfirmada` = reserva confirmada que, si es `esTurnoFijo: true`, también debe estar en `turnosFijosActivos`
- Si la fecha está en `diasAusentes`, el turno no aparece en `turnosFijosActivos` → la reserva original en `reservasStore` queda invalidada → slot libre
