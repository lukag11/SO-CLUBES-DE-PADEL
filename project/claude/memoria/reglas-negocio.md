# Reglas de Negocio

Reglas atómicas del sistema. No contienen pasos de flujo.
Los flujos que las aplican están en `/memoria/flujos/`.

---

## Canchas

**RN-01** Cada cancha tiene tipo (Cristal / Pared) y modalidad (indoor / outdoor).  
**RN-02** Cada cancha tiene un precio fijo por turno. No existe recargo por horario pico.  
**RN-03** Solo las canchas con `activa: true` aparecen disponibles para reservar.

---

## Franjas horarias

**RN-04** Todos los turnos duran exactamente 1.5 horas (90 minutos). Sin excepciones.  
**RN-05** Las franjas son fijas y predefinidas por el admin:  
`07:00–08:30 / 08:30–10:00 / 10:00–11:30 / 11:30–13:00 / 13:00–14:30 / 14:30–16:00 / 16:00–17:30 / 17:30–19:00 / 19:00–20:30 / 20:30–22:00 / 22:00–23:30`  
**RN-06** La `horaFin` de un turno SIEMPRE se calcula como `horaInicio + 90 minutos`. Nunca como `+1 hora`.

---

## Reservas eventuales

**RN-07** Una reserva eventual corresponde a una fecha específica (un solo día).  
**RN-08** Toda reserva eventual comienza en estado `pendiente`.  
**RN-09** Solo el admin puede confirmar una reserva (estado `confirmada` + `_aprobadoPorAdmin: true`).  
**RN-10** Un jugador no puede tener dos reservas activas en el mismo día y horario,
**RN-11** Cancelar una reserva la pasa a estado `cancelada`. No se elimina.  
**RN-11d** El botón de cancelación en "Mis próximas reservas" solo aparece en reservas eventuales. Los turnos fijos no muestran ese botón en esa sección — su gestión se hace exclusivamente desde "Mis turnos fijos".  
**RN-11e** Toda acción destructiva del jugador (cancelar reserva, confirmar ausencia) requiere confirmación explícita mediante modal antes de ejecutarse.  
**RN-11b** El admin puede cancelar cualquier reserva o liberar un turno fijo desde el panel, independientemente de si el jugador lo pidió o no. Esta acción es equivalente al flujo del jugador pero iniciada desde el admin.  
**RN-11c** Cuando el admin libera un turno fijo puntualmente desde la grilla, equivale a aprobar una ausencia directamente (sin que el jugador haya avisado). El resultado es el mismo: fecha en `diasAusentes`, slot libre.  
**RN-12** El jugador puede reservar con hasta 14 días de anticipación.

---

## Turnos fijos

**RN-13** Un turno fijo es recurrente: se repite cada semana en el mismo día y horario.
**RN-51** Un jugador puede tener múltiples turnos fijos el mismo día de la semana, siempre que sean en canchas distintas. No puede tener más de un turno fijo activo en la misma cancha para el mismo día.  
**RN-14** La solicitud de turno fijo se almacena en `reservasStore` con `esTurnoFijo: true` + estado `pendiente` hasta que el admin la apruebe.  
**RN-15** Un turno fijo solo existe en `turnosFijosStore` cuando el admin lo aprueba explícitamente.  
**RN-16** Al aprobar un turno fijo el admin debe ejecutar dos acciones: confirmar la reserva en `reservasStore` Y crear el turno en `turnosFijosStore`.  
**RN-16b** La búsqueda de la reserva pendiente al aprobar usa tres criterios: `hora + fecha + tipo (esTurnoFijo)`. Una notificación de tipo `nueva_reserva` NUNCA puede aprobar una reserva con `esTurnoFijo: true`, y viceversa.  
**RN-17** Un turno fijo activo bloquea ese slot en el calendario para todos los jugadores.  
**RN-18b** El contador de turnos fijos en el panel admin muestra el total de turnos fijos activos para el día de semana, independientemente de si alguno tiene ausencia ese día específico.

---

## Ausencias en turnos fijos

**RN-18** El jugador puede avisar ausencia solo para la próxima ocurrencia de su turno fijo.  
**RN-19** Si hoy es el día del turno y la hora de inicio aún no pasó, el jugador puede avisar ausencia para hoy.  
**RN-20** Si el turno ya pasó esta semana, se calcula la próxima ocurrencia (máximo 7 días adelante).  
**RN-21** Una ausencia avisada por el jugador entra en `ausenciasPendientes`. El slot sigue bloqueado para otros jugadores.  
**RN-22** Solo cuando el admin confirma la ausencia, la fecha pasa a `diasAusentes` y el slot queda libre.  
**RN-23** Un turno con ausencia pendiente o ya confirmada desactiva el botón "No puedo ir".

---

## Notificaciones — Admin

**RN-24** El admin recibe notificación automática ante: nueva reserva eventual, nueva solicitud de turno fijo, aviso de ausencia de un turno fijo.  
**RN-25** Las notificaciones del admin no desaparecen al ser leídas; se marcan como leídas.

---

## Notificaciones — Jugador

**RN-26** El jugador recibe acuse de recibo inmediato al enviar cualquier solicitud.  
**RN-27** El jugador recibe notificación cuando el admin aprueba una reserva, un turno fijo, o confirma una ausencia.  
**RN-28** El jugador NO recibe notificación de acciones que el propio admin inicia (bloqueos, clases, etc.).

---

## Jugadores

**RN-29** Un jugador se registra en 3 pasos: datos básicos, perfil, preferencias.  
**RN-30** Un jugador tiene una categoría entre 8va y 1ra.  
**RN-31** Un jugador está autenticado si tiene token válido en `localStorage` (`player_token`).

---

## Administrador

**RN-32** El admin está autenticado si tiene token válido en `localStorage` (`token`).  
**RN-33** El admin gestiona 6 tipos de slots en la grilla: fijo, eventual, bloqueado, clase, online (pendiente), solicitud_fijo.  
**RN-34** El admin puede bloquear slots por razones: Mantenimiento, Torneo, Evento privado, Otro.

---

## Torneos

**RN-35** Los torneos tienen 8 categorías: 8va, 7ma, 6ta, 5ta, 4ta, 3ra, 2da, 1ra.  
**RN-36** El ranking de jugadores se actualiza automáticamente según los resultados de los torneos.

---

## Pagos

**RN-37** Los métodos de pago disponibles son: Efectivo, Transferencia, Débito, Crédito.  
**RN-38** Los precios se expresan en pesos argentinos (ARS).

---

## Club / Configuración

**RN-39** Cada club tiene configuración editable: nombre, logo, horarios, canchas, servicios, staff, FAQ, colores de marca.  
**RN-40** El club puede activar o desactivar secciones de la landing individualmente (galería, servicios, staff, FAQ, etc.).  
**RN-41** Los colores de marca del club se aplican como variables CSS dinámicas (`--club-primary`, `--club-secondary`, `--club-font`) al DOM en tiempo de carga.

---

## Profesores

**RN-42** El profesor puede crear, editar y cancelar sus propias clases directamente en la grilla global. No requiere aprobación del admin.  
**RN-43** Una clase creada por el profesor entra con estado `confirmada` y campo `creadoPor: 'profesor'` para trazabilidad.  
**RN-44** El profesor solo puede crear clases en las canchas asignadas en su perfil (`canchasIds`). Si el campo está vacío, puede usar todas las canchas activas. Si `profesorData` no se encuentra en `profesoresStore`, el acceso a canchas es cero (sin acceso).  
**RN-45** El profesor puede marcar no-disponibilidad por franjas específicas o día completo. Esto crea slots `bloqueado` con `razon: 'Indisponibilidad - Profesor'` en la grilla global.  
**RN-46** El profesor no puede marcar el día completo como no disponible si ya tiene clases agendadas en ese día. Debe gestionar el conflicto franja por franja.  
**RN-47** El profesor no puede aprobar reservas de jugadores ni acceder a datos de jugadores.  
**RN-48** El profesor está autenticado con `profesor_token` y `profesor_data` en localStorage. Mismo patrón que jugador y admin.  
**RN-49** Un slot tipo `'clase'` tiene `profesorId` opcional. Sin `profesorId`, es una clase sin profesor asignado (gestión 100% admin).  
**RN-50** Los slots de clase y no-disponibilidad del profesor se almacenan en `reservasAdminStore` — el mismo store compartido que usa la grilla del admin. No existe un store paralelo de clases.
**RN-52** Un slot cuya hora de inicio es anterior a la hora actual del día no puede ser reservado. Se muestra en la grilla como bloqueado con etiqueta "Pasado" (distinto visualmente de "Ocupado"). Aplica solo a la fecha de hoy — en fechas futuras todos los slots del horario del club son visibles y reservables. El backend deberá validar esto también al recibir la solicitud.
