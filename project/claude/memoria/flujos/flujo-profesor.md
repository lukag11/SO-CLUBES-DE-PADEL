# Flujo Profesor

El profesor es un rol independiente dentro del SaaS. Tiene su propio portal en `/dashboardProfesor`.
Su función central es gestionar su propia agenda de clases y disponibilidad, sin depender del admin para cada operación.

---

## Actores

- **Profesor** — crea, edita y cancela sus clases; marca no-disponibilidad.
- **Admin** — crea los perfiles de profesores; ve las clases y bloqueos en la grilla global.

---

## Flujo de login del profesor

```
/dashboardProfesor (ProfesorLoginPage)
  → ingresa email + contraseña
  → busca en profesoresStore.findByCredentials(email, password)
  → si existe y activo → login(profesor, token) en authProfesorStore
  → redirige a /dashboardProfesor/agenda
  → si no existe o inactivo → mensaje de error
```

---

## Flujo: Profesor crea una clase

```
ProfesorAgendaPage
  → selecciona fecha
  → clic "Nueva clase"
  → ModalClase:
      - elige cancha (de las habilitadas para él en profesoresStore.canchasIds)
      - elige franja (slots ya ocupados en reservasAdminStore para esa fecha quedan deshabilitados)
      - escribe descripción opcional
  → valida disponibilidad: slotOcupado(reservasDelDia, canchaId, franja, fecha)
  → si libre: reservasAdminStore.addReserva({ tipo: 'clase', profesorId, creadoPor: 'profesor', ... })
  → slot aparece en la grilla del admin de forma inmediata (tipo 'clase', color naranja)
  → NO requiere aprobación del admin (estado: 'confirmada' directo)
```

---

## Flujo: Profesor edita una clase

```
ProfesorAgendaPage
  → clic "Editar" en una clase existente
  → ModalClase pre-relleno con los datos actuales
  → valida que el nuevo slot esté disponible (excluye la propia clase del chequeo)
  → reservasAdminStore.updateReserva(id, { canchaId, inicio, fin, nota })
  → grilla del admin actualizada al instante
```

---

## Flujo: Profesor cancela una clase

```
ProfesorAgendaPage
  → clic ícono de papelera
  → ModalConfirmarEliminar (confirmación explícita)
  → reservasAdminStore.deleteReserva(id)
  → slot queda libre en la grilla del admin
```

---

## Flujo: Profesor marca no-disponibilidad

```
ProfesorDisponibilidadPage
  → selecciona fecha
  → elige modo:
      a) "Franjas específicas" → selecciona horarios individuales
         - Franjas con clase ya existente quedan bloqueadas (conflicto)
         - Franjas ya marcadas como no-disponibles quedan en rojo (ya cargadas)
      b) "Día completo" → solo disponible si no tiene clases ese día
  → clic "Marcar no-disponibilidad"
  → reservasAdminStore.addReserva({ tipo: 'bloqueado', profesorId, razon: 'Indisponibilidad - Profesor', creadoPor: 'profesor', ... })
  → el admin ve este bloqueo en la grilla (identificado visualmente como no-disponibilidad del profesor)
  → el profesor puede eliminar bloqueos desde la misma página (ícono papelera)
```

---

## Integración con la grilla del admin

Los slots del profesor fluyen al admin a través del store compartido `reservasAdminStore`:

| Tipo de slot | Quién lo crea | Qué ve el admin | Puede editarlo |
|---|---|---|---|
| `tipo: 'clase'` + `creadoPor: 'profesor'` | Profesor | Slot naranja en grilla | Sí (puede cancelar) |
| `tipo: 'bloqueado'` + `creadoPor: 'profesor'` | Profesor | Slot gris con indicador de profesor | Sí (puede eliminar) |

---

## Restricciones del profesor (lo que NO puede hacer)

- No puede ver reservas de jugadores (eventuales ni turnos fijos)
- No puede aprobar ni rechazar solicitudes
- No puede crear clases en canchas fuera de su `canchasIds` asignado (si el campo está vacío, puede usar todas). Si `profesorData` es `undefined` en el store → acceso a cero canchas.
- No puede bloquear el día completo si ya tiene clases en ese día
- No puede editar clases pasadas
- No puede crear una clase en un slot donde él mismo marcó no-disponibilidad (el modal muestra el slot como "Ocupado")

---

## Conflictos

Un conflicto ocurre cuando el profesor intenta marcar no-disponibilidad en un horario donde ya tiene una clase agendada:
- En franjas específicas: ese horario aparece en amarillo/inhabilitado en el selector
- En día completo: el botón queda deshabilitado con mensaje explicativo

Un conflicto también ocurre si intenta crear una clase en un slot que él mismo marcó como no-disponible:
- El `ModalClase` recibe `profesorId` y chequea los bloqueos propios del profesor en `estadoFranjas`
- El slot aparece en rojo como "Ocupado" aunque tenga `canchaId: 0`

El admin siempre puede resolver conflictos desde la grilla eliminando slots manualmente.

## Franjas del profesor

Los bloqueos de no-disponibilidad y el selector de franjas usan **`FRANJAS_PROFESOR`** (slots de 1h), NO `FRANJAS` (slots de 1.5h que son para jugadores). El bloqueo de día completo cubre desde `FRANJAS_PROFESOR[0].inicio` hasta `FRANJAS_PROFESOR[last].fin`.

---

## Stores involucrados

| Store | Rol |
|---|---|
| `profesoresStore` | Fuente de verdad del perfil del profesor (canchas habilitadas, etc.) |
| `authProfesorStore` | Sesión activa del profesor |
| `reservasAdminStore` | Slots compartidos: el profesor escribe, el admin lee (y viceversa) |
| `clubStore` | Para leer las canchas activas del club |
