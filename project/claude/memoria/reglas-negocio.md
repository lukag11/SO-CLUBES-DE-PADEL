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
**RN-08** Toda reserva eventual comienza en estado `pendiente` **solo si el club tiene la auto-confirmación apagada** (flujo manual). Con auto-confirmación activa (default), nace `confirmada`. Ver RN-53.  
**RN-09** Solo el admin puede confirmar una reserva (estado `confirmada` + `_aprobadoPorAdmin: true`) **en el flujo manual**. Con auto-confirmación activa, la confirma el sistema al crearla.  
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

## Auto-confirmación de turnos

**RN-53** La confirmación instantánea de reservas y turnos fijos está disponible en TODOS los planes (sin feature-gating). Es opt-out por club vía `club.config.autoConfirmaReservas` (default `true`).  
**RN-54** Con auto-confirmación activa: la reserva nace `confirmada` y el turno fijo nace `confirmado` directamente, sin pasar por aprobación admin. El jugador recibe `reserva_confirmada`/`turno_fijo_confirmado` y el admin recibe una notificación-CONTROL `reserva_autoconfirmada`/`turno_fijo_autoconfirmado`.  
**RN-55** Con auto-confirmación apagada: rige el flujo manual de siempre (reserva/TF `pendiente`, admin recibe `nueva_reserva`/`solicitud_turno_fijo` y aprueba a mano).  
**RN-56** El `POST /admin` bloquea crear reserva o turno fijo sobre un turno fijo confirmado (salvo día liberado por ausencia) y aplica RN-51 sin saltearlo en silencio.  
**RN-57** La baja del turno fijo entero (eliminar) es SIEMPRE manual y se bloquea con 409 si el jugador tiene deuda pendiente. No se automatiza, independientemente del toggle de auto-confirmación.

---

## Ausencias en turnos fijos

**RN-18** El jugador puede avisar ausencia solo para la próxima ocurrencia de su turno fijo.  
**RN-19** Si hoy es el día del turno y la hora de inicio aún no pasó, el jugador puede avisar ausencia para hoy.  
**RN-20** Si el turno ya pasó esta semana, se calcula la próxima ocurrencia (máximo 7 días adelante).  
**RN-21** Con auto-liberación activa (default, junto a RN-53): la ausencia avisada por el jugador libera el slot **al instante** — la fecha pasa a `diasAusentes` + `diasAusentesJugador`, se cancela la reserva puntual asociada, el admin recibe `turno_liberado_auto` (CONTROL) y el jugador `ausencia_confirmada`. No hay paso de aprobación admin.  
**RN-22** En el flujo manual (auto-liberación apagada): la ausencia entra en `ausenciasPendientes`, el slot sigue bloqueado, y solo cuando el admin la confirma la fecha pasa a `diasAusentes` y el slot queda libre.  
**RN-22b** La auto-liberación no altera la política de cancelación: si el jugador avisa fuera de plazo se genera el cargo igual. El aviso de ausencia corre bajo `runSerializable` para no duplicar cargo ante doble-submit.  
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
**RN-58** El **ascenso** de categoría se comunica siempre como **LOGRO** (felicitación 🎾, "le quedó chica la categoría"); el **descenso** se comunica como **acto administrativo neutro** (aviso "el club actualizó tu categoría"), NUNCA como castigo. Regla del dominio, aplica en toda la app (WIarky y admin).  
**RN-59** **TODO** cambio de categoría de un jugador queda auditado en `CambioCategoria` (de/a, tipo ascenso/descenso derivado del par, origen `wiark`/`admin_manual`, motivo, adminId) **y** notifica al jugador con el tono correcto (ascenso → felicitación; descenso → `categoria_actualizada` neutra). Vale para los dos flujos: WIarky (`consultar_ascensos`/`ascender_jugador`) y edición manual del admin. La auditoría es best-effort: nunca rompe el cambio en sí.  
**RN-60** El contador de señales de ascenso se computa **solo desde torneos** (no Americano/Super 8), ventana de **12 meses**, con reglas de **títulos** (no ELO). El sistema es **asistido**: sugiere/avisa, pero el ascenso lo confirma el admin o WIarky — nunca automático. El descenso es siempre manual.

---

## Administrador

**RN-32** El admin está autenticado si tiene token válido en `localStorage` (`token`).  
**RN-33** El admin gestiona 6 tipos de slots en la grilla: fijo, eventual, bloqueado, clase, online (pendiente), solicitud_fijo.  
**RN-34** El admin puede bloquear slots por razones: Mantenimiento, Torneo, Evento privado, Otro.

---

## Torneos

**RN-35** Los torneos tienen 8 categorías: 8va, 7ma, 6ta, 5ta, 4ta, 3ra, 2da, 1ra.  
**RN-36** El ranking de jugadores se actualiza automáticamente según los resultados de los torneos.  
**RN-61** El "corte" de categoría en torneos (impedir que un jugador pasado juegue una categoría inferior) tiene DOS vías, ambas en la etapa de **inscripción** (torneo `open` o `closed`, nunca en finalizados): **(1) automática** para jugadores CON historial en el club (motor `lib/ascenso.js` `detectarAlertasInscripcion` → banner ⚠ ámbar; solo AVISA, no bloquea; WIarky puede notificar); **(2) manual** del admin para jugadores DESCONOCIDOS/sin data (de otro club) — botón 🚩 en la tarjeta de pareja con criterio propio: "Solo marcar" (guarda `Pareja.observacionCategoria`, banner que convive con el automático, reversible con "quitar") o "Marcar y no habilitar" (baja de la pareja del torneo, notifica al jugador). Las dos marcas conviven en el mismo lugar.

---

## Vista del jugador (Cobranzas)

**RN-62** El flag `club.config.mostrarConsumoJugador` (default `true`) controla qué ve el jugador en su sección de pagos. **Prendido:** "**Mi consumo**" completo — su gasto del período con desglose por **rubro** (canchas/torneos/kiosco/cancelaciones/otros, derivado del `tipo` del cargo) y por **medio de pago**, más el historial. **Apagado:** "**Mis pagos**" — solo su **deuda** (saldo pendiente + lista de pendientes), sin analítica ni historial de pagos. **La deuda pendiente se muestra SIEMPRE**, en los dos estados (no afecta la cobranza). El nombre de la sección (título de página + ítem del sidebar) es dinámico según el flag. Se configura en Cobranzas → ⚙ Configuración → **Vista del jugador**. Motivo del apagado: hacer visible el gasto acumulado puede enfriar el consumo de jugadores sensibles al precio (economía del comportamiento); default prendido = transparencia. Flag **latente** en `club.config` (frontend puro, sin columna ni backend nuevos).

---

## Pagos

**RN-37** Los métodos de pago disponibles son: Efectivo, Transferencia, Débito, Crédito.  
**RN-38** Los precios se expresan en pesos argentinos (ARS).  
**RN-63** El **arqueo de caja** (modelo `ArqueoCaja` + `MovimientoCaja`) controla el **efectivo FÍSICO del cajón**, no todo el movimiento del club. Reglas: **(1)** solo cuenta el **efectivo** — cobros con `metodoPago:'efectivo'` (reservas + cargos pagados) dentro de la ventana temporal `abiertoAt`→cierre; **transferencias y MP NO van al arqueo** (se concilian aparte). **(2)** El efectivo **esperado** = `fondoInicial` (el "cambio" de arranque) + cobros en efectivo del turno − egresos netos en efectivo (movimientos manuales: retiro del dueño, compra de hielo, vuelto extra; ingresos restan). La **diferencia** = `efectivoDeclarado` (lo que el empleado contó) − `efectivoEsperado`, y se atribuye al empleado (negativo = faltante). **(3)** Al **cerrar**, todos los totales (cobros/egresos/esperado/declarado/diferencia) se **CONGELAN** en el registro: es un documento histórico inmutable (editar un cobro viejo después NO altera el arqueo cerrado). **(4)** Solo puede haber **una caja abierta por club** a la vez (abrir con otra abierta → 409). **(5)** WIarky recuerda **proactivamente** abrir la caja al arrancar el día (tool `abrir_caja`, con botón de confirmación — nunca abre directo) y no insiste si ya está abierta. El "esperado" se calcula por ventana temporal → cero cambios en los flujos de cobro (capa aditiva).

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
