# Inconsistencias y Puntos Poco Claros

Problemas identificados durante el análisis del código. No son bugs críticos del flujo principal,
pero deben resolverse antes de conectar el backend o escalar el sistema.

---

## Alta prioridad (afectan lógica de negocio)

### ~~INC-00 — handleAprobar confundía reserva eventual con turno fijo~~ ✅ RESUELTO
El `.find()` buscaba solo por `hora + fecha`. Si había dos reservas pendientes en el mismo horario (una eventual, una fijo), podía encontrar la equivocada y llamar `addTurnoFijo()` para una reserva eventual. Fix: se agrega `esTurnoFijo === (notif.tipo === 'solicitud_turno_fijo')` y `canchaId` al criterio de búsqueda. También se agrega `canchaId` a las notificaciones `nueva_reserva` y `solicitud_turno_fijo`.



### ~~INC-01 — canchaId: inconsistencia de tipos~~ ✅ RESUELTO
`turnosFijosStore.addTurnoFijo()` normaliza `canchaId: Number(canchaId)` en origen.

### ~~INC-02 — Cancelación de reserva no notifica al admin~~ ✅ RESUELTO
`notificacionesStore.cancelacionReserva()` agregado. `reservasStore.cancelarReserva()` lo llama con jugador, cancha, fecha y horario. Panel de alertas del admin renderiza el tipo `cancelacion_reserva`.

### ~~INC-03 — Reserva original queda confirmada tras baja de turno fijo~~ ✅ RESUELTO
`addTurnoFijo()` ahora recibe y guarda `reservaId`. `liberarTurno()` llama a `cancelarReserva(reservaId, { notificarAdmin: false })` para sincronizar el historial sin generar notificación al admin.

### ~~INC-04 — Franjas no filtradas por horario del club~~ ✅ YA ESTABA RESUELTO
`PlayerReservasPage` ya filtra correctamente: `generarSlots(horarioDia.apertura, horarioDia.cierre, ...)`. Si el día tiene `activo: false` muestra "El club no abre este día". El admin ve las 11 franjas completas por diseño (puede gestionar eventos fuera del horario habitual).

### ~~INC-05 — Recargo por horario pico~~ DESCARTADO por decisión de negocio
El precio es fijo por turno (RN-02). No existe recargo pico. Los campos `recargoPico` y `horarioPicoActivo` en `clubStore` son dead code y pueden eliminarse en una limpieza futura.

---

## Media prioridad (datos incompletos o mock)

### INC-06 — Categoría del jugador hardcodeada en dashboard
**Dónde**: `PlayerDashboardPage` muestra "3° Categoría" como texto fijo.  
**Síntoma**: No viene del `playerStore` ni del registro.  
**Decisión pendiente**: Definir dónde se guarda la categoría del jugador (playerStore.player.categoria).

### INC-07 — Estadísticas del jugador son mock
**Dónde**: `PlayerDashboardPage` y `PlayerStatsPage` muestran datos hardcodeados.  
**Síntoma**: Partidos jugados, ganados, racha, oponentes → todos ficticios.  
**Decisión pendiente**: Definir el modelo de datos para resultados de partidos.

### INC-08 — Torneos no conectados entre admin y jugador
**Dónde**: `TorneosPage` (admin) y `PlayerTournamentsPage` (jugador) usan datos independientes.  
**Síntoma**: Lo que crea el admin no lo ve el jugador.  
**Decisión pendiente**: Crear `torneosStore` compartido o esperar al backend.

### INC-09 — Cancelación de reserva sin límite de tiempo
**Dónde**: `reglas.md` dice "cancelaciones con límite de tiempo" pero no está implementado.  
**Síntoma**: El jugador puede cancelar un turno segundos antes.  
**Decisión pendiente**: Definir límite (ej: no se puede cancelar con menos de 2 horas de anticipación).

---

## Baja prioridad (cosméticos / futuros)

### INC-10 — Slots "ocupados" por otros jugadores son determinísticos (mock)
**Dónde**: `PlayerReservasPage` usa una fórmula matemática (`canchaId * 3 + franja % 4 === 0`) para simular ocupación.  
**Síntoma**: La ocupación es siempre la misma y no refleja reservas reales de otros jugadores.  
**Decisión pendiente**: Reemplazar con datos reales del backend cuando estén disponibles.

### INC-11 — White-label preparado pero sin UI de configuración
**Dónde**: `clubStore` ya tiene `colorPrimario`, `colorSecundario`, `fontFamilia` y los aplica al DOM.  
**Síntoma**: No hay form en el panel admin para que el club cambie sus colores.  
**Decisión pendiente**: Agregar sección de "Apariencia" en la configuración del club.

### INC-12 — PagosPage sin funcionalidad
**Dónde**: `/dashboardAdmin/pagos` existe en el router y tiene layout pero sin lógica real.  
**Síntoma**: Sección incompleta.  
**Decisión pendiente**: Definir modelo de pagos antes de implementar.

### ~~INC-13 — El admin no recibe notificación cuando el profesor crea/cancela una clase~~ ✅ RESUELTO
`notificacionesStore` tiene `nuevaClaseProfesor()` y `cancelacionClaseProfesor()`. `ProfesorAgendaPage` los llama al crear/cancelar. El panel de alertas del admin renderiza ambos tipos (`nueva_clase_profesor` / `cancelacion_clase_profesor`) en naranja con el nombre del profesor y slot.

### ~~INC-14 — Admin no puede crear profesores desde la UI~~ ✅ RESUELTO
Tab "Profesores" agregada en `QuienesSomosPage`. ABM completo: crear, editar, desactivar. Escribe directamente en `profesoresStore`.

### ~~INC-15 — Grilla del admin no diferencia visualmente clases del profesor vs clases sin profesor~~ ✅ RESUELTO
Slots con `creadoPor === 'profesor'` muestran badge "Prof" + nombre del profesor. Slots de no-disponibilidad del profesor (`tipo: 'bloqueado'` + `creadoPor: 'profesor'`) se renderizan en rojo con ícono de profesor.

### ~~INC-16 — Clases del profesor no bloqueaban slots en el dashboard jugador~~ ✅ RESUELTO
`generarSlots()` en `PlayerReservasPage` no consultaba `reservasAdminStore`. Un jugador podía reservar un slot donde el profesor tenía clase. Fix: se agrega `esOcupadoAdmin` con overlap check (`r.inicio < f.fin && r.fin > f.inicio`) contra `reservasAdminStore`. Cubre clases de 1h del profesor, bloqueos del admin y cualquier otra reserva creada desde el panel admin.
